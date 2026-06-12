import fs from 'node:fs/promises'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const args = process.argv.slice(2)
const getArg = (name, fallback = null) => {
  const index = args.indexOf(name)
  return index >= 0 ? args[index + 1] : fallback
}

const startDate = getArg('--start-date', getArg('--date', new Date().toISOString().slice(0, 10)))
const endDate = getArg('--end-date', startDate)
const dbPath = path.join(rootDir, 'data-private/warehouse/sports/mlb/sql-mlb.db')
const outPath = getArg(
  '--out',
  path.join(rootDir, 'data-private/warehouse/mlb/thecapper-umpires/reports', `${startDate}-to-${endDate}-impact.json`)
)

const sqlQuote = (value) => `'${String(value).replace(/'/g, "''")}'`
const sqliteJson = (sql) => {
  const raw = execFileSync('sqlite3', ['-json', dbPath, sql], { encoding: 'utf8', maxBuffer: 1024 * 1024 * 80 })
  return raw.trim() ? JSON.parse(raw) : []
}

const avg = (values) => {
  const nums = values.map(Number).filter(Number.isFinite)
  if (!nums.length) return null
  return nums.reduce((sum, value) => sum + value, 0) / nums.length
}

const round = (value, digits = 2) => {
  if (!Number.isFinite(Number(value))) return null
  const power = 10 ** digits
  return Math.round(Number(value) * power) / power
}

const zoneBucket = (zoneFactor) => {
  const value = Number(zoneFactor)
  if (!Number.isFinite(value)) return 'no_profile'
  if (value >= 1.05) return 'wide'
  if (value <= 0.95) return 'tight'
  return 'neutral'
}

const directionalFlags = (row) => {
  const flags = []
  if (Number(row.zone_factor) >= 1.05) flags.push('wide-zone-k-context')
  if (Number(row.zone_factor) <= 0.95) flags.push('tight-zone-walk/run-context')
  if (Number(row.k_per_game) >= 18.5) flags.push('high-umpire-k-per-game')
  if (Number(row.k_per_game) <= 15.5) flags.push('low-umpire-k-per-game')
  if (Number(row.bb_per_game) >= 8.5) flags.push('high-walk-environment')
  if (Number(row.nrfi_pct) >= 65) flags.push('high-nrfi-history')
  if (Number(row.nrfi_pct) <= 35) flags.push('low-nrfi-history')
  return flags
}

const rows = sqliteJson(`
with pitcher_k as (
  select
    cast(game_pk as integer) as game_pk,
    sum(case when lower(coalesce(pitcher_role, '')) = 'starter' then cast(strikeouts as real) else 0 end) as starter_strikeouts,
    sum(cast(strikeouts as real)) as total_pitcher_strikeouts,
    sum(case when lower(coalesce(pitcher_role, '')) = 'starter' then 1 else 0 end) as starter_rows
  from mlb_pitcher_appearances
  group by cast(game_pk as integer)
)
select
  u.source_date,
  u.game_pk,
  u.matchup,
  u.away_team,
  u.home_team,
  u.game_time_et,
  u.umpire_name,
  u.zone_label,
  u.zone_factor,
  u.k_per_game,
  u.bb_per_game,
  u.nrfi_pct,
  u.k_factor,
  u.sample_games,
  u.date_match_status,
  o.total_runs_final,
  o.total_runs_first5,
  o.away_runs_final,
  o.home_runs_final,
  o.away_runs_first5,
  o.home_runs_first5,
  pk.starter_strikeouts,
  pk.total_pitcher_strikeouts,
  pk.starter_rows
from mlb_umpire_assignments_daily u
left join mlb_game_outcomes o on o.game_pk = u.game_pk
left join pitcher_k pk on pk.game_pk = u.game_pk
where u.source_date between ${sqlQuote(startDate)} and ${sqlQuote(endDate)}
order by u.source_date, u.game_time_et, u.matchup;
`)

const exactRows = rows.filter((row) => row.date_match_status === 'exact')
const settledRows = exactRows.filter((row) => row.total_runs_final !== null && row.total_runs_final !== undefined)
const byZone = ['wide', 'neutral', 'tight', 'no_profile'].map((bucket) => {
  const bucketRows = settledRows.filter((row) => zoneBucket(row.zone_factor) === bucket)
  return {
    bucket,
    games: bucketRows.length,
    avgTotalRuns: round(avg(bucketRows.map((row) => row.total_runs_final))),
    avgF5Runs: round(avg(bucketRows.map((row) => row.total_runs_first5))),
    avgStarterStrikeouts: round(avg(bucketRows.map((row) => row.starter_strikeouts))),
    avgTotalPitcherStrikeouts: round(avg(bucketRows.map((row) => row.total_pitcher_strikeouts))),
    avgUmpireKPerGame: round(avg(bucketRows.map((row) => row.k_per_game))),
    avgUmpireBbPerGame: round(avg(bucketRows.map((row) => row.bb_per_game))),
    avgNrfiPct: round(avg(bucketRows.map((row) => row.nrfi_pct)))
  }
}).filter((row) => row.games > 0)

const currentRows = rows.map((row) => ({
  sourceDate: row.source_date,
  gamePk: row.game_pk,
  matchup: row.matchup,
  umpireName: row.umpire_name,
  dateMatchStatus: row.date_match_status,
  zoneLabel: row.zone_label,
  zoneFactor: row.zone_factor,
  kPerGame: row.k_per_game,
  bbPerGame: row.bb_per_game,
  nrfiPct: row.nrfi_pct,
  sampleGames: row.sample_games,
  totalRunsFinal: row.total_runs_final,
  starterStrikeouts: row.starter_strikeouts,
  directionalFlags: directionalFlags(row)
}))

const report = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  window: { startDate, endDate },
  sourceTable: 'mlb_umpire_assignments_daily',
  rowCount: rows.length,
  exactGameMatches: exactRows.length,
  unresolvedRows: rows.length - exactRows.length,
  settledExactGames: settledRows.length,
  caution: settledRows.length < 30
    ? 'Small sample. Treat this as a directional scout report until daily umpire assignments accumulate.'
    : null,
  bucketSummary: byZone,
  currentRows
}

await fs.mkdir(path.dirname(outPath), { recursive: true })
await fs.writeFile(outPath, JSON.stringify(report, null, 2))
console.log(JSON.stringify({
  status: 'ok',
  outPath: path.relative(rootDir, outPath),
  rowCount: report.rowCount,
  exactGameMatches: report.exactGameMatches,
  unresolvedRows: report.unresolvedRows,
  settledExactGames: report.settledExactGames,
  bucketSummary: report.bucketSummary
}, null, 2))
