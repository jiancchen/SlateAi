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
const hasFlag = (name) => args.includes(name)

const today = new Date().toISOString().slice(0, 10)
const startDate = getArg('--start-date', getArg('--date', today))
const endDate = getArg('--end-date', startDate)
const allowMissingSource = hasFlag('--allow-missing-source')
const outPath = getArg(
  '--out',
  path.join(rootDir, 'data-migration/reports', `audit_mlb_umpire_warehouse_${startDate}${endDate !== startDate ? `_to_${endDate}` : ''}.json`)
)
const dbPath = path.join(rootDir, 'data-private/warehouse/sports/mlb/sql-mlb.db')

const sqlQuote = (value) => `'${String(value).replace(/'/g, "''")}'`

const sqliteJson = (sql) => {
  const raw = execFileSync('sqlite3', ['-json', dbPath, sql], { encoding: 'utf8', maxBuffer: 1024 * 1024 * 80 })
  return raw.trim() ? JSON.parse(raw) : []
}

const tableExists = (name) =>
  sqliteJson(`select name from sqlite_master where type='table' and name=${sqlQuote(name)};`).length > 0

const addDays = (isoDate, days) => {
  const [year, month, day] = isoDate.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day + days))
  return [
    date.getUTCFullYear(),
    `${date.getUTCMonth() + 1}`.padStart(2, '0'),
    `${date.getUTCDate()}`.padStart(2, '0')
  ].join('-')
}

const dateRange = (start, end) => {
  const dates = []
  for (let date = start; date <= end; date = addDays(date, 1)) dates.push(date)
  return dates
}

const compactCount = (rows, predicate) => rows.filter(predicate).length

const dates = dateRange(startDate, endDate)
const requiredTables = ['mlb_umpire_assignments_daily', 'mlb_umpire_profiles_daily', 'source_fetch_status']
const missingTables = requiredTables.filter((name) => !tableExists(name))
const hasFicFactorsTable = tableExists('mlb_fic_umpire_factors_daily')
const report = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  window: { startDate, endDate },
  sources: {
    assignments: {
      sourceName: 'thecapper_mlb_umpires',
      sourceUrl: 'https://thecapper.io/mlb/umpires/'
    },
    factors: {
      sourceName: 'fantasyinfocentral_umpire_factors',
      sourceUrl: 'https://www.fantasyinfocentral.com/mlb/umpires'
    }
  },
  allowMissingSource,
  modelUsePolicy: {
    assignmentRule: "Only mlb_umpire_assignments_daily rows with date_match_status='exact' may attach to game/model features.",
    factorRule: 'FIC umpire factors are historical profile context only. They become game context only after joining to an exact home-plate assignment by normalized umpire name.',
    stalePageRule: 'TheCapper umpire page is a current-slate page. Historical backfills are source gaps unless the raw capture was actually made on that slate day.',
    featureBoundary: 'Umpire context is additive scout context for pitcher K, walk/run environment, and NRFI/YRFI review; it must not delete or override base M2 rows.'
  },
  hardFailures: missingTables.map((tableName) => `missing-table:${tableName}`),
  warnings: [],
  dates: []
}

if (!missingTables.length) {
  for (const sourceDate of dates) {
    const assignments = sqliteJson(`
select *
from mlb_umpire_assignments_daily
where source_date = ${sqlQuote(sourceDate)}
order by game_time_et, matchup, umpire_name;
`)
    const profiles = sqliteJson(`
select *
from mlb_umpire_profiles_daily
where source_date = ${sqlQuote(sourceDate)}
order by umpire_name;
`)
    const sourceStatus = sqliteJson(`
select *
from source_fetch_status
where source_name = 'thecapper_mlb_umpires'
  and source_date = ${sqlQuote(sourceDate)}
order by updated_at desc
limit 1;
`)[0] || null
    const ficFactors = hasFicFactorsTable
      ? sqliteJson(`
select *
from mlb_fic_umpire_factors_daily
where source_date = ${sqlQuote(sourceDate)}
order by umpire_name;
`)
      : []
    const ficStatus = sqliteJson(`
select *
from source_fetch_status
where source_name = 'fantasyinfocentral_umpire_factors'
  and source_date = ${sqlQuote(sourceDate)}
order by updated_at desc
limit 1;
`)[0] || null
    const gameRows = sqliteJson(`
select game_pk, game_date, away_team, home_team, status
from mlb_games
where game_date = ${sqlQuote(sourceDate)};
`)
    const exact = assignments.filter((row) => row.date_match_status === 'exact')
    const unresolved = assignments.filter((row) => row.date_match_status !== 'exact')
    const duplicateExactGamePks = Object.entries(exact.reduce((acc, row) => {
      const key = String(row.game_pk || '')
      if (key) acc[key] = (acc[key] || 0) + 1
      return acc
    }, {})).filter(([, count]) => count > 1).map(([gamePk]) => gamePk)
    const exactWithoutGamePk = exact.filter((row) => row.game_pk === null || row.game_pk === undefined)
    const exactWrongDate = exact.filter((row) => row.matched_game_date && row.matched_game_date !== sourceDate)
    const capturedDates = [...new Set(assignments.map((row) => String(row.captured_at || '').slice(0, 10)).filter(Boolean))]
    const capturedOutsideSourceDate = capturedDates.filter((capturedDate) => capturedDate !== sourceDate)
    const missingAssignmentMetrics = {
      zoneFactor: compactCount(assignments, (row) => row.zone_factor === null || row.zone_factor === undefined),
      kPerGame: compactCount(assignments, (row) => row.k_per_game === null || row.k_per_game === undefined),
      bbPerGame: compactCount(assignments, (row) => row.bb_per_game === null || row.bb_per_game === undefined),
      nrfiPct: compactCount(assignments, (row) => row.nrfi_pct === null || row.nrfi_pct === undefined),
      sampleGames: compactCount(assignments, (row) => row.sample_games === null || row.sample_games === undefined)
    }
    const missingProfileMetrics = {
      zoneFactor: compactCount(profiles, (row) => row.zone_factor === null || row.zone_factor === undefined),
      kPerGame: compactCount(profiles, (row) => row.k_per_game === null || row.k_per_game === undefined),
      bbPerGame: compactCount(profiles, (row) => row.bb_per_game === null || row.bb_per_game === undefined),
      nrfiPct: compactCount(profiles, (row) => row.nrfi_pct === null || row.nrfi_pct === undefined),
      kFactor: compactCount(profiles, (row) => row.k_factor === null || row.k_factor === undefined)
    }
    const missingFicFactorMetrics = {
      games: compactCount(ficFactors, (row) => row.games === null || row.games === undefined),
      hitsPerGame: compactCount(ficFactors, (row) => row.hits_per_game === null || row.hits_per_game === undefined),
      walksPerGame: compactCount(ficFactors, (row) => row.walks_per_game === null || row.walks_per_game === undefined),
      strikeoutsPerGame: compactCount(ficFactors, (row) => row.strikeouts_per_game === null || row.strikeouts_per_game === undefined),
      totalScorePerGame: compactCount(ficFactors, (row) => row.total_score_per_game === null || row.total_score_per_game === undefined),
      ops: compactCount(ficFactors, (row) => row.ops === null || row.ops === undefined)
    }

    const dateWarnings = []
    const dateFailures = []
    if (!sourceStatus && allowMissingSource) dateWarnings.push('missing-source-fetch-status')
    else if (!sourceStatus) dateFailures.push('missing-source-fetch-status')
    if (sourceStatus && sourceStatus.last_status !== 'success') dateFailures.push(`source-status:${sourceStatus.last_status}`)
    if (!assignments.length && allowMissingSource) dateWarnings.push('no-umpire-assignment-rows')
    else if (!assignments.length) dateFailures.push('no-umpire-assignment-rows')
    if (!hasFicFactorsTable && allowMissingSource) dateWarnings.push('missing-fic-umpire-factors-table')
    else if (!hasFicFactorsTable) dateFailures.push('missing-fic-umpire-factors-table')
    if (!ficStatus && allowMissingSource) dateWarnings.push('missing-fic-umpire-factor-source-status')
    else if (!ficStatus) dateFailures.push('missing-fic-umpire-factor-source-status')
    if (ficStatus && ficStatus.last_status !== 'success') dateFailures.push(`fic-factor-source-status:${ficStatus.last_status}`)
    if (!ficFactors.length && allowMissingSource) dateWarnings.push('no-fic-umpire-factor-rows')
    else if (!ficFactors.length) dateFailures.push('no-fic-umpire-factor-rows')
    if (duplicateExactGamePks.length) dateFailures.push('duplicate-exact-game-assignments')
    if (exactWithoutGamePk.length) dateFailures.push('exact-rows-without-game-pk')
    if (exactWrongDate.length) dateFailures.push('exact-rows-with-wrong-matched-date')
    if (!gameRows.length) dateWarnings.push('no-mlb-games-for-date-to-verify-exact-matches')
    if (gameRows.length && !exact.length) dateWarnings.push('no-exact-umpire-game-matches')
    if (unresolved.length) dateWarnings.push('unresolved-or-stale-assignment-rows')
    if (capturedOutsideSourceDate.length) dateWarnings.push('capture-date-differs-from-source-date')
    if (profiles.length && profiles.length < 60) dateWarnings.push('low-umpire-profile-count')
    if (missingAssignmentMetrics.zoneFactor || missingAssignmentMetrics.kPerGame || missingAssignmentMetrics.nrfiPct) {
      dateWarnings.push('assignment-metrics-missing-for-some-rows')
    }
    if (missingProfileMetrics.zoneFactor || missingProfileMetrics.kFactor) {
      dateWarnings.push('profile-metrics-missing-for-some-rows')
    }
    if (missingFicFactorMetrics.games || missingFicFactorMetrics.strikeoutsPerGame || missingFicFactorMetrics.ops) {
      dateWarnings.push('fic-factor-metrics-missing-for-some-rows')
    }
    if (ficFactors.length && ficFactors.length < 100) dateWarnings.push('low-fic-umpire-factor-row-count')
    if (gameRows.length && exact.length && exact.length < Math.min(gameRows.length, assignments.length)) {
      dateWarnings.push('partial-exact-coverage')
    }

    report.hardFailures.push(...dateFailures.map((failure) => `${sourceDate}:${failure}`))
    report.warnings.push(...dateWarnings.map((warning) => `${sourceDate}:${warning}`))
    report.dates.push({
      sourceDate,
      sourceStatus: sourceStatus ? {
        lastStatus: sourceStatus.last_status,
        completenessStatus: sourceStatus.last_completeness_status,
        expectedItemCount: sourceStatus.expected_item_count,
        actualItemCount: sourceStatus.actual_item_count,
        missingItemCount: sourceStatus.missing_item_count,
        unresolvedCount: sourceStatus.unresolved_count,
        updatedAt: sourceStatus.updated_at
      } : null,
      ficFactorStatus: ficStatus ? {
        lastStatus: ficStatus.last_status,
        completenessStatus: ficStatus.last_completeness_status,
        expectedItemCount: ficStatus.expected_item_count,
        actualItemCount: ficStatus.actual_item_count,
        missingItemCount: ficStatus.missing_item_count,
        unresolvedCount: ficStatus.unresolved_count,
        updatedAt: ficStatus.updated_at
      } : null,
      mlbGames: gameRows.length,
      assignments: assignments.length,
      exactMatches: exact.length,
      unresolvedRows: unresolved.length,
      profiles: profiles.length,
      ficFactors: ficFactors.length,
      ficFactorFavors: {
        hitters: compactCount(ficFactors, (row) => row.favors_code === 'hitters'),
        pitchers: compactCount(ficFactors, (row) => row.favors_code === 'pitchers'),
        neutral: compactCount(ficFactors, (row) => row.favors_code === 'neutral')
      },
      todayFlagProfiles: compactCount(profiles, (row) => Number(row.today_flag) === 1),
      capturedDates,
      capturedOutsideSourceDate,
      missingAssignmentMetrics,
      missingProfileMetrics,
      missingFicFactorMetrics,
      duplicateExactGamePks,
      exactWrongDate: exactWrongDate.map((row) => ({
        matchup: row.matchup,
        umpireName: row.umpire_name,
        gamePk: row.game_pk,
        matchedGameDate: row.matched_game_date
      })),
      unresolvedExamples: unresolved.slice(0, 8).map((row) => ({
        matchup: row.matchup,
        umpireName: row.umpire_name,
        dateMatchStatus: row.date_match_status,
        bestAvailableGameDate: row.best_available_game_date
      })),
      warnings: dateWarnings,
      hardFailures: dateFailures
    })
  }
}

await fs.mkdir(path.dirname(outPath), { recursive: true })
await fs.writeFile(outPath, `${JSON.stringify(report, null, 2)}\n`)

console.log(JSON.stringify({
  status: report.hardFailures.length ? 'failed' : 'ok',
  outPath: path.relative(rootDir, outPath),
  dates: report.dates.map((dateReport) => ({
    sourceDate: dateReport.sourceDate,
    mlbGames: dateReport.mlbGames,
    assignments: dateReport.assignments,
    exactMatches: dateReport.exactMatches,
    unresolvedRows: dateReport.unresolvedRows,
    ficFactors: dateReport.ficFactors,
    warnings: dateReport.warnings,
    hardFailures: dateReport.hardFailures
  })),
  hardFailures: report.hardFailures,
  warnings: report.warnings
}, null, 2))

if (report.hardFailures.length) process.exit(1)
