import fs from 'node:fs/promises'
import path from 'node:path'

import { buildReliefRows, modelId, modelVersion } from './build-mlb-relief-projections-v1.mjs'
import {
  avg,
  canonicalTeamName,
  clamp,
  getArg,
  mlbDbPath,
  normalizeTeam,
  rootDir,
  round,
  sqlQuote,
  sqliteJson
} from './lib/mlb-model-utils.mjs'

const dbPath = getArg('--db', mlbDbPath)

const availableWindow = sqliteJson(`
select
  min(as_of_date) as start_date,
  max(as_of_date) as end_date
from mlb_bullpen_usage;
`, dbPath)[0] || {}

const startDate = getArg('--start-date', availableWindow.start_date || '2026-03-27')
const endDate = getArg('--end-date', availableWindow.end_date || startDate)
const outPath = getArg(
  '--out',
  path.join(rootDir, 'models/mlb/cartridges/MLB-RP2/reports', `rp2-backtest-${startDate}-to-${endDate}.json`)
)
const mdOutPath = getArg(
  '--md-out',
  path.join(rootDir, 'models/mlb/cartridges/MLB-RP2/reports', `rp2-backtest-${startDate}-to-${endDate}.md`)
)

const dateRange = (start, end) => {
  const dates = []
  let cursor = Date.parse(`${start}T12:00:00Z`)
  const stop = Date.parse(`${end}T12:00:00Z`)
  while (Number.isFinite(cursor) && cursor <= stop) {
    dates.push(new Date(cursor).toISOString().slice(0, 10))
    cursor += 86400000
  }
  return dates
}

const pct = (numerator, denominator) => denominator > 0 ? numerator / denominator * 100 : 0

const loadActualRows = () => sqliteJson(`
with ordered as (
  select
    game_date,
    cast(game_pk as integer) as game_pk,
    team_name,
    opponent_name,
    cast(pitcher_id as integer) as pitcher_id,
    pitcher_name,
    cast(entry_order as integer) as entry_order,
    cast(outs_recorded as real) as outs_recorded,
    cast(runs_allowed as real) as runs_allowed,
    cast(pitches_thrown as real) as pitches_thrown,
    row_number() over (
      partition by game_date, cast(game_pk as integer), team_name
      order by cast(entry_order as integer), cast(pitcher_id as integer)
    ) as relief_order
  from mlb_pitcher_appearances
  where pitcher_role = 'reliever'
    and game_date between ${sqlQuote(startDate)} and ${sqlQuote(endDate)}
),
agg as (
  select
    game_date,
    game_pk,
    team_name,
    opponent_name,
    sum(outs_recorded) as actual_relief_outs,
    sum(runs_allowed) as actual_relief_runs,
    count(*) as actual_relievers_used,
    sum(pitches_thrown) as actual_relief_pitches
  from ordered
  group by game_date, game_pk, team_name
),
firsts as (
  select *
  from ordered
  where relief_order = 1
)
select
  agg.*,
  firsts.pitcher_id as actual_first_pitcher_id,
  firsts.pitcher_name as actual_first_pitcher_name,
  firsts.outs_recorded as actual_first_reliever_outs,
  firsts.runs_allowed as actual_first_reliever_runs
from agg
left join firsts
  on firsts.game_date = agg.game_date
 and firsts.game_pk = agg.game_pk
 and firsts.team_name = agg.team_name
order by agg.game_date, agg.game_pk, agg.team_name;
`, dbPath)

const keyFor = (date, gamePk, teamName) => `${date}|${gamePk}|${normalizeTeam(teamName)}`

const actualRows = loadActualRows()
const actualByKey = new Map(actualRows.map((row) => [keyFor(row.game_date, row.game_pk, row.team_name), row]))

const rowsByDate = (rows, dateField) => {
  const map = new Map()
  rows.forEach((row) => {
    const date = row[dateField]
    if (!map.has(date)) map.set(date, [])
    map.get(date).push(row)
  })
  return map
}

const scheduleRows = sqliteJson(`
select
  cast(game_pk as integer) as game_pk,
  game_date,
  away_team,
  home_team,
  status,
  start_time_utc
from mlb_games
where game_date between ${sqlQuote(startDate)} and ${sqlQuote(endDate)}
order by game_date, start_time_utc, game_pk;
`, dbPath)

const teamSidesByDate = new Map()
scheduleRows.forEach((game) => {
  const awayTeam = canonicalTeamName(game.away_team)
  const homeTeam = canonicalTeamName(game.home_team)
  const sides = [
    {
      sourceDate: game.game_date,
      gamePk: Number(game.game_pk),
      gameDate: game.game_date,
      teamName: awayTeam,
      opponentName: homeTeam,
      teamSide: 'away',
      gameSource: 'mlb_games'
    },
    {
      sourceDate: game.game_date,
      gamePk: Number(game.game_pk),
      gameDate: game.game_date,
      teamName: homeTeam,
      opponentName: awayTeam,
      teamSide: 'home',
      gameSource: 'mlb_games'
    }
  ]
  if (!teamSidesByDate.has(game.game_date)) teamSidesByDate.set(game.game_date, [])
  teamSidesByDate.get(game.game_date).push(...sides)
})

const legacyUsageRowsByDate = rowsByDate(sqliteJson(`
select *
from mlb_bullpen_usage
where as_of_date between ${sqlQuote(startDate)} and ${sqlQuote(endDate)}
order by as_of_date, team_name, cast(first_reliever_likelihood as real) desc, cast(availability_score as real) desc;
`, dbPath), 'as_of_date')

const legacyShapeRowsByDate = rowsByDate(sqliteJson(`
select *
from mlb_team_bullpen_shape_daily
where as_of_date between ${sqlQuote(startDate)} and ${sqlQuote(endDate)}
order by as_of_date, team_name;
`, dbPath), 'as_of_date')

const fgRankingRowsByDate = rowsByDate(sqliteJson(`
select *
from mlb_fangraphs_team_rp_rankings_daily
where source_date between ${sqlQuote(startDate)} and ${sqlQuote(endDate)}
order by source_date, team_name;
`, dbPath), 'source_date')

const fgDepthRowsByDate = rowsByDate(sqliteJson(`
select *
from mlb_fangraphs_bullpen_depth_daily
where source_date between ${sqlQuote(startDate)} and ${sqlQuote(endDate)}
order by source_date, team_name, role, player_name;
`, dbPath), 'source_date')

const fgUsageRowsByDate = rowsByDate(sqliteJson(`
select *
from mlb_fangraphs_bullpen_usage_daily
where source_date between ${sqlQuote(startDate)} and ${sqlQuote(endDate)}
order by source_date, team_name, player_key, usage_date;
`, dbPath), 'source_date')

const currentStarterRowsByDate = rowsByDate(sqliteJson(`
select
  g.game_date,
  cast(g.mlb_game_pk as integer) as game_pk,
  teams.name as team_name,
  cast(players.mlb_player_id as integer) as pitcher_id,
  players.name as pitcher_name,
  players.throws,
  sp.confirmation_status,
  sp.source_name
from starting_pitchers sp
join games g on g.game_id = sp.game_id
join teams on teams.team_id = sp.team_id
join players on players.player_id = sp.pitcher_id
where g.game_date between ${sqlQuote(startDate)} and ${sqlQuote(endDate)}
order by g.game_date, g.start_time_utc, teams.name;
`, dbPath), 'game_date')

const pitcherAppearanceRows = sqliteJson(`
select
  game_date,
  cast(game_pk as integer) as game_pk,
  team_name,
  cast(pitcher_id as integer) as pitcher_id,
  pitcher_name,
  pitcher_role,
  cast(entry_order as integer) as entry_order,
  cast(outs_recorded as real) as outs_recorded,
  cast(pitches_thrown as real) as pitches_thrown
from mlb_pitcher_appearances
where game_date < ${sqlQuote(endDate)}
  and game_date >= date(${sqlQuote(startDate)}, '-60 day')
  and pitcher_role in ('starter', 'reliever')
order by game_date, game_pk, team_name, cast(entry_order as integer), cast(pitcher_id as integer);
`, dbPath)

const starterLeashRows = sqliteJson(`
select *
from mlb_starter_leash_profiles
where as_of_date < ${sqlQuote(endDate)}
  and as_of_date >= date(${sqlQuote(startDate)}, '-45 day')
order by as_of_date desc, cast(window_starts as integer) desc;
`, dbPath)

const starterRollingFormRows = sqliteJson(`
select *
from mlb_starting_pitcher_rolling_form
where as_of_date < ${sqlQuote(endDate)}
  and as_of_date >= date(${sqlQuote(startDate)}, '-45 day')
order by as_of_date desc, cast(window_starts as integer) desc;
`, dbPath)

const preloaded = {
  teamSidesByDate,
  legacyUsageRowsByDate,
  legacyShapeRowsByDate,
  fgRankingRowsByDate,
  fgDepthRowsByDate,
  fgUsageRowsByDate,
  currentStarterRowsByDate,
  pitcherAppearanceRows,
  starterLeashRows,
  starterRollingFormRows
}

const allRecentTeamGames = sqliteJson(`
select
  game_date,
  cast(game_pk as integer) as game_pk,
  team_name,
  opponent_name,
  sum(cast(outs_recorded as real)) as actual_relief_outs,
  sum(cast(runs_allowed as real)) as actual_relief_runs,
  count(*) as actual_relievers_used,
  sum(cast(pitches_thrown as real)) as actual_relief_pitches
from mlb_pitcher_appearances
where pitcher_role = 'reliever'
  and game_date < ${sqlQuote(endDate)}
group by game_date, game_pk, team_name
order by game_date, game_pk, team_name;
`, dbPath)

const actualByTeam = new Map()
allRecentTeamGames.forEach((row) => {
  const key = normalizeTeam(row.team_name)
  if (!actualByTeam.has(key)) actualByTeam.set(key, [])
  actualByTeam.get(key).push(row)
})

const teamRollingBaseline = (teamName, date) => {
  const teamRows = (actualByTeam.get(normalizeTeam(teamName)) || [])
    .filter((row) => row.game_date < date)
    .sort((left, right) => right.game_date.localeCompare(left.game_date) || Number(right.game_pk) - Number(left.game_pk))
    .slice(0, 10)
  const teamAvg = avg(teamRows.map((row) => row.actual_relief_runs))
  if (Number.isFinite(teamAvg)) return teamAvg
  const leagueRows = allRecentTeamGames.filter((row) => row.game_date < date)
  return avg(leagueRows.map((row) => row.actual_relief_runs)) ?? 1.45
}

const recentByTeamForDate = (date) => {
  const recentMap = new Map()
  actualByTeam.forEach((rows, teamKey) => {
    const prior = rows
      .filter((row) => row.game_date < date)
      .sort((left, right) => right.game_date.localeCompare(left.game_date) || Number(right.game_pk) - Number(left.game_pk))
      .slice(0, 10)
    if (!prior.length) return
    const last5 = prior.slice(0, 5)
    recentMap.set(teamKey, {
      team_name: prior[0].team_name,
      relief_runs_avg_last5: avg(last5.map((row) => row.actual_relief_runs)),
      relief_runs_avg_last10: avg(prior.map((row) => row.actual_relief_runs)),
      relief_outs_avg_last5: avg(last5.map((row) => row.actual_relief_outs)),
      relief_outs_avg_last10: avg(prior.map((row) => row.actual_relief_outs)),
      relievers_used_avg_last5: avg(last5.map((row) => row.actual_relievers_used)),
      relievers_used_avg_last10: avg(prior.map((row) => row.actual_relievers_used)),
      historical_team_games: prior.length
    })
  })
  return recentMap
}

const allProjectionRows = dateRange(startDate, endDate).flatMap((date) =>
  buildReliefRows({ date, dbPath, recentByTeamOverride: recentByTeamForDate(date), preloaded })
)
const matched = allProjectionRows.map((projection) => {
  const actual = actualByKey.get(keyFor(projection.sourceDate, projection.gamePk, projection.teamName))
  if (!actual) return null
  const candidates = projection.candidates || []
  const candidateIds = candidates.map((candidate) => Number(candidate.pitcherId)).filter(Number.isFinite)
  const actualFirstId = Number(actual.actual_first_pitcher_id)
  return {
    ...projection,
    actual,
    baselineProjectedReliefRuns: teamRollingBaseline(projection.teamName, projection.sourceDate),
    firstUpExact: Number.isFinite(actualFirstId) && candidateIds[0] === actualFirstId,
    firstUpTop2: Number.isFinite(actualFirstId) && candidateIds.slice(0, 2).includes(actualFirstId),
    firstUpTop3: Number.isFinite(actualFirstId) && candidateIds.slice(0, 3).includes(actualFirstId)
  }
}).filter(Boolean)

const usable = matched.filter((row) => row.sourceMode !== 'missing')
const identityUsable = usable.filter((row) => row.candidates.some((candidate) => candidate.pitcherId))

const mae = (rows, predFn, actualFn) => {
  const values = rows.map((row) => Math.abs(Number(predFn(row)) - Number(actualFn(row)))).filter(Number.isFinite)
  return avg(values)
}

const rmse = (rows, predFn, actualFn) => {
  const values = rows.map((row) => {
    const error = Number(predFn(row)) - Number(actualFn(row))
    return Number.isFinite(error) ? error * error : null
  }).filter(Number.isFinite)
  const mean = avg(values)
  return Number.isFinite(mean) ? Math.sqrt(mean) : null
}

const bucketRows = (rows, bucketFn) => {
  const buckets = new Map()
  rows.forEach((row) => {
    const bucket = bucketFn(row)
    if (!buckets.has(bucket)) buckets.set(bucket, [])
    buckets.get(bucket).push(row)
  })
  return [...buckets.entries()].map(([bucket, bucketItems]) => ({
    bucket,
    samples: bucketItems.length,
    avgPredictedRuns: round(avg(bucketItems.map((row) => row.projectedReliefRunsAllowed)), 3),
    avgActualRuns: round(avg(bucketItems.map((row) => row.actual.actual_relief_runs)), 3),
    reliefRunsMae: round(mae(bucketItems, (row) => row.projectedReliefRunsAllowed, (row) => row.actual.actual_relief_runs), 3),
    firstUpExactPct: round(pct(bucketItems.filter((row) => row.firstUpExact).length, bucketItems.length), 1),
    firstUpTop3Pct: round(pct(bucketItems.filter((row) => row.firstUpTop3).length, bucketItems.length), 1)
  }))
}

const exactCount = identityUsable.filter((row) => row.firstUpExact).length
const top2Count = identityUsable.filter((row) => row.firstUpTop2).length
const top3Count = identityUsable.filter((row) => row.firstUpTop3).length

const reliefRunsMae = mae(usable, (row) => row.projectedReliefRunsAllowed, (row) => row.actual.actual_relief_runs)
const baselineMae = mae(usable, (row) => row.baselineProjectedReliefRuns, (row) => row.actual.actual_relief_runs)
const reliefRunsRmse = rmse(usable, (row) => row.projectedReliefRunsAllowed, (row) => row.actual.actual_relief_runs)
const baselineRmse = rmse(usable, (row) => row.baselineProjectedReliefRuns, (row) => row.actual.actual_relief_runs)

const report = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  modelId,
  modelVersion,
  window: { startDate, endDate },
  coverage: {
    dates: dateRange(startDate, endDate).length,
    projectionRows: allProjectionRows.length,
    matchedTeamSides: matched.length,
    usableTeamSides: usable.length,
    identityUsableTeamSides: identityUsable.length,
    sourceModes: Object.fromEntries(
      [...groupByToEntries(usable, (row) => row.sourceMode)].map(([key, rows]) => [key, rows.length])
    )
  },
  headline: {
    reliefRunsMae: round(reliefRunsMae, 3),
    baselineReliefRunsMae: round(baselineMae, 3),
    reliefRunsMaeLiftPct: Number.isFinite(reliefRunsMae) && Number.isFinite(baselineMae)
      ? round((baselineMae - reliefRunsMae) / Math.max(baselineMae, 0.001) * 100, 1)
      : null,
    reliefRunsRmse: round(reliefRunsRmse, 3),
    baselineReliefRunsRmse: round(baselineRmse, 3),
    reliefOutsMae: round(mae(usable, (row) => row.projectedReliefOuts, (row) => row.actual.actual_relief_outs), 3),
    relieversUsedMae: round(mae(usable, (row) => row.projectedRelieversUsed, (row) => row.actual.actual_relievers_used), 3),
    firstUpExactPct: round(pct(exactCount, identityUsable.length), 1),
    firstUpTop2Pct: round(pct(top2Count, identityUsable.length), 1),
    firstUpTop3Pct: round(pct(top3Count, identityUsable.length), 1)
  },
  buckets: {
    runRiskTier: bucketRows(usable, (row) => row.runRiskTier),
    sourceMode: bucketRows(usable, (row) => row.sourceMode),
    bridgeStress: bucketRows(usable, (row) => {
      const score = Number(row.bridgeStressScore)
      if (score >= 70) return '70+ taxed'
      if (score >= 54) return '54-69 watch'
      if (score <= 34) return '0-34 fresh'
      return '35-53 stable'
    })
  },
  promotionGate: {
    status: usable.length >= 300 && reliefRunsMae < baselineMae && top3Count / Math.max(identityUsable.length, 1) >= 0.5
      ? 'candidate'
      : 'shadow_only',
    reasons: [
      usable.length < 300 ? `Needs at least 300 usable team-side samples; has ${usable.length}.` : null,
      !(reliefRunsMae < baselineMae) ? 'Relief-runs MAE must beat team rolling baseline before promotion.' : null,
      top3Count / Math.max(identityUsable.length, 1) < 0.5 ? 'First-up top-3 coverage must be at least 50% before replacing RP36 identity use.' : null
    ].filter(Boolean)
  }
}

function groupByToEntries(rows, keyFn) {
  const buckets = new Map()
  rows.forEach((row) => {
    const key = keyFn(row)
    if (!buckets.has(key)) buckets.set(key, [])
    buckets.get(key).push(row)
  })
  return buckets.entries()
}

const markdownTable = (headers, rows) => {
  const safeRows = rows.length ? rows : [['-'.repeat(1)]]
  return [
    `| ${headers.join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    ...safeRows.map((row) => `| ${row.join(' | ')} |`)
  ].join('\n')
}

const md = `# MLB-RP2 Relief Projection Backtest

Window: \`${startDate}\` to \`${endDate}\`

## Coverage

- projection rows: \`${report.coverage.projectionRows}\`
- matched team-sides: \`${report.coverage.matchedTeamSides}\`
- usable team-sides: \`${report.coverage.usableTeamSides}\`
- identity-usable team-sides: \`${report.coverage.identityUsableTeamSides}\`
- promotion status: \`${report.promotionGate.status}\`

## Headline

${markdownTable(
  ['Metric', 'RP2', 'Baseline'],
  [
    ['Relief runs MAE', `${report.headline.reliefRunsMae}`, `${report.headline.baselineReliefRunsMae}`],
    ['Relief runs RMSE', `${report.headline.reliefRunsRmse}`, `${report.headline.baselineReliefRunsRmse}`],
    ['Relief outs MAE', `${report.headline.reliefOutsMae}`, '-'],
    ['Relievers used MAE', `${report.headline.relieversUsedMae}`, '-'],
    ['First-up exact', `${report.headline.firstUpExactPct}%`, '-'],
    ['First-up top 2', `${report.headline.firstUpTop2Pct}%`, '-'],
    ['First-up top 3', `${report.headline.firstUpTop3Pct}%`, '-']
  ]
)}

## Bridge Stress Buckets

${markdownTable(
  ['Bucket', 'Samples', 'Pred R', 'Actual R', 'MAE', 'Exact', 'Top 3'],
  report.buckets.bridgeStress.map((row) => [
    row.bucket,
    `${row.samples}`,
    `${row.avgPredictedRuns}`,
    `${row.avgActualRuns}`,
    `${row.reliefRunsMae}`,
    `${row.firstUpExactPct}%`,
    `${row.firstUpTop3Pct}%`
  ])
)}

## Promotion Gate

${report.promotionGate.reasons.length ? report.promotionGate.reasons.map((reason) => `- ${reason}`).join('\n') : '- Gate passed for shadow candidate review.'}
`

await fs.mkdir(path.dirname(outPath), { recursive: true })
await fs.writeFile(outPath, `${JSON.stringify(report, null, 2)}\n`)
await fs.mkdir(path.dirname(mdOutPath), { recursive: true })
await fs.writeFile(mdOutPath, md)

console.log(JSON.stringify({
  status: 'ok',
  modelId,
  modelVersion,
  window: report.window,
  outPath: path.relative(rootDir, outPath),
  mdOutPath: path.relative(rootDir, mdOutPath),
  coverage: report.coverage,
  headline: report.headline,
  promotionGate: report.promotionGate
}, null, 2))
