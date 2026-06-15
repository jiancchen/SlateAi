import { execFileSync } from 'node:child_process'
import path from 'node:path'

import {
  getArg,
  hasArg,
  mlbDbPath,
  rootDir,
  sqlQuote,
  sqliteJson
} from './lib/mlb-model-utils.mjs'

const dbPath = getArg('--db', mlbDbPath)
const dryRun = hasArg('--dry-run')
const force = hasArg('--force')
const fetchRaw = hasArg('--fetch-raw')
const skipDerived = hasArg('--skip-derived')
const includeColdStart = hasArg('--include-cold-start')
const maxDates = Math.max(Number(getArg('--max-dates', 6)) || 6, 1)
const sleepMs = Math.max(Number(getArg('--sleep-ms', 1200)) || 0, 0)
const rawFetchDelayMs = Math.max(Number(getArg('--raw-fetch-delay-ms', 650)) || 0, 0)

const dateSql = (date) => sqlQuote(date)

const shiftDate = (date, days) => {
  const parsed = Date.parse(`${date}T12:00:00Z`)
  if (!Number.isFinite(parsed)) throw new Error(`Invalid date: ${date}`)
  const next = new Date(parsed)
  next.setUTCDate(next.getUTCDate() + days)
  return next.toISOString().slice(0, 10)
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const defaultWindow = () => {
  const row = sqliteJson(`
select
  coalesce((select max(as_of_date) from mlb_bullpen_usage), '2026-03-26') as last_derived_date,
  coalesce((select max(game_date) from mlb_pitcher_appearances), (select max(game_date) from mlb_games)) as last_label_date;
`, dbPath)[0] || {}

  const startDate = shiftDate(row.last_derived_date || '2026-03-26', 1)
  const endDate = row.last_label_date || startDate
  return { startDate, endDate }
}

const requestedWindow = defaultWindow()
const startDate = getArg('--start-date', requestedWindow.startDate)
const endDate = getArg('--end-date', requestedWindow.endDate)

const plannedDates = sqliteJson(`
with first_reliever_date as (
  select min(game_date) as game_date
  from mlb_pitcher_appearances
  where pitcher_role = 'reliever'
),
game_rows as (
  select
    g.game_date,
    count(distinct g.game_pk) as games,
    count(distinct case when pa.pitcher_role = 'reliever' then pa.game_pk || ':' || pa.team_name || ':' || pa.pitcher_id || ':' || pa.entry_order end) as reliever_appearance_rows,
    case
      when (select game_date from first_reliever_date) is not null
       and g.game_date > (select game_date from first_reliever_date)
      then 1
      else 0
    end as has_prior_reliever_appearances
  from mlb_games g
  left join mlb_pitcher_appearances pa
    on pa.game_date = g.game_date
   and cast(pa.game_pk as integer) = cast(g.game_pk as integer)
  where g.game_date between ${dateSql(startDate)} and ${dateSql(endDate)}
  group by g.game_date
),
usage_counts as (
  select as_of_date as game_date, count(*) as rows
  from mlb_bullpen_usage
  where as_of_date between ${dateSql(startDate)} and ${dateSql(endDate)}
  group by as_of_date
),
chain_counts as (
  select as_of_date as game_date, count(*) as rows
  from mlb_likely_relief_chains
  where as_of_date between ${dateSql(startDate)} and ${dateSql(endDate)}
  group by as_of_date
),
shape_counts as (
  select as_of_date as game_date, count(*) as rows
  from mlb_team_bullpen_shape_daily
  where as_of_date between ${dateSql(startDate)} and ${dateSql(endDate)}
  group by as_of_date
),
date_rows as (
  select
    game_rows.game_date,
    game_rows.games,
    game_rows.reliever_appearance_rows,
    game_rows.has_prior_reliever_appearances,
    coalesce(usage_counts.rows, 0) as bullpen_usage_rows,
    coalesce(chain_counts.rows, 0) as likely_relief_chain_rows,
    coalesce(shape_counts.rows, 0) as bullpen_shape_rows
  from game_rows
  left join usage_counts on usage_counts.game_date = game_rows.game_date
  left join chain_counts on chain_counts.game_date = game_rows.game_date
  left join shape_counts on shape_counts.game_date = game_rows.game_date
)
select *
from date_rows
where games > 0
  and reliever_appearance_rows > 0
  and (${includeColdStart ? '1 = 1' : 'has_prior_reliever_appearances = 1'})
  and (
    ${force ? '1 = 1' : 'bullpen_usage_rows = 0 or likely_relief_chain_rows = 0 or bullpen_shape_rows = 0'}
  )
order by game_date
limit ${maxDates};
`, dbPath)

const runCommand = (command, args) => {
  if (dryRun) {
    return { status: 'planned', command: [command, ...args].join(' ') }
  }

  const stdout = execFileSync(command, args, {
    cwd: rootDir,
    encoding: 'utf8',
    maxBuffer: 1024 * 1024 * 80
  })
  return { status: 'ok', stdout }
}

const rowCountsForDate = (date) => sqliteJson(`
select 'mlb_bullpen_usage' as table_name, count(*) as rows from mlb_bullpen_usage where as_of_date = ${dateSql(date)}
union all
select 'mlb_likely_relief_chains', count(*) from mlb_likely_relief_chains where as_of_date = ${dateSql(date)}
union all
select 'mlb_team_bullpen_shape_daily', count(*) from mlb_team_bullpen_shape_daily where as_of_date = ${dateSql(date)};
`, dbPath)

const main = async () => {
  const results = []

  for (let index = 0; index < plannedDates.length; index += 1) {
    const date = plannedDates[index].game_date
    const result = {
      date,
      before: plannedDates[index],
      rawFetch: null,
      derived: null,
      after: null
    }

    if (fetchRaw) {
      result.rawFetch = runCommand('python3', [
        'pipeline/mlb/fetchers/fetch_mlb_schedule_game_feed.py',
        '--start-date',
        date,
        '--end-date',
        date,
        '--skip-existing',
        '--delay-ms',
        String(rawFetchDelayMs)
      ])
    }

    if (!skipDerived) {
      result.derived = runCommand('python3', [
        'data-migration/scripts/derive_mlb_bullpen_features_from_typed.py',
        '--date',
        date,
        '--source-db',
        path.relative(rootDir, dbPath),
        '--report',
        `data-migration/reports/derive_mlb_bullpen_features_from_typed_${date}.json`
      ])
      result.after = dryRun ? null : rowCountsForDate(date)
    }

    results.push(result)

    if (index < plannedDates.length - 1 && sleepMs > 0 && !dryRun) {
      await sleep(sleepMs)
    }
  }

  console.log(JSON.stringify({
    ok: true,
    mode: dryRun ? 'dry-run' : 'write',
    startDate,
    endDate,
    maxDates,
    sleepMs,
    fetchRaw,
    rawFetchDelayMs: fetchRaw ? rawFetchDelayMs : null,
    force,
    includeColdStart,
    plannedDateCount: plannedDates.length,
    results: results.map((result) => ({
      date: result.date,
      before: result.before,
      rawFetchStatus: result.rawFetch?.status || null,
      derivedStatus: result.derived?.status || null,
      after: result.after
    }))
  }, null, 2))
}

main().catch((error) => {
  console.error(error.stack || error.message)
  process.exit(1)
})
