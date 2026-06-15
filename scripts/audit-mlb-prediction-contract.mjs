import { execFileSync } from 'node:child_process'
import fs from 'node:fs/promises'
import fsSync from 'node:fs'
import path from 'node:path'

import { loadMlbDayGames } from '../pipeline/lib/load-mlb-day-games.mjs'
import { buildMlbPredictionEligibility } from '../models/mlb/lib/prediction-eligibility.mjs'
import { modelVersion as env1ModelVersion } from './build-mlb-environment-adjustments.mjs'
import { modelVersion as rp2ModelVersion } from './build-mlb-relief-projections-v1.mjs'

const root = path.resolve(import.meta.dirname, '..')
const dbPath = path.join(root, 'data-private', 'warehouse', 'sports', 'mlb', 'sql-mlb.db')
const reportsRoot = path.join(root, 'data-migration', 'reports')

const argValue = (name, fallback = '') => {
  const prefix = `${name}=`
  const inline = process.argv.find((arg) => arg.startsWith(prefix))
  if (inline) return inline.slice(prefix.length)
  const index = process.argv.indexOf(name)
  return index >= 0 ? process.argv[index + 1] || fallback : fallback
}

const sqlText = (value = '') => `'${String(value).replaceAll("'", "''")}'`
const array = (value) => (Array.isArray(value) ? value : [])
const fileExists = (relativePath) => fsSync.existsSync(path.join(root, relativePath))

const sqliteJson = (sql) => {
  if (!fsSync.existsSync(dbPath)) return []
  const raw = execFileSync('sqlite3', ['-json', dbPath, sql], {
    cwd: root,
    encoding: 'utf8',
    maxBuffer: 1024 * 1024 * 80
  }).trim()
  return raw ? JSON.parse(raw) : []
}

const requiredArtifacts = (date) => [
  `web/src/lib/day-${date}-data.js`,
  `web/src/lib/mlb-context-${date}.js`,
  `web/src/lib/day-${date}-lineups.js`,
  `data-private/lineups/mlb/${date}-lineup-board.json`,
  `data-private/predictions/mlb-player-props/${date}-player-props.json`,
  `data-private/predictions/mlb-home-runs/${date}-statcast-prototype.json`
]

const optionalArtifacts = (date) => [
  `web/src/lib/day-${date}-reliever-shadow.js`,
  `data-private/predictions/mlb-reliever-shadow/${date}-reliever-shadow.json`,
  `data-private/predictions/mlb-sides/${date}-board-live.json`,
  `data-private/predictions/mlb-sides/${date}-veto-artifact.json`,
  `data-private/predictions/mlb-espn-pitcher-splits/${date}-pitcher-splits.json`,
  `data-private/predictions/mlb-statmuse/${date}-pitcher-history.json`
]

const auditArtifacts = (date) => {
  const required = requiredArtifacts(date).map((relativePath) => ({
    path: relativePath,
    exists: fileExists(relativePath)
  }))
  const optional = optionalArtifacts(date).map((relativePath) => ({
    path: relativePath,
    exists: fileExists(relativePath)
  }))
  return {
    required,
    optional,
    hardFailures: required.filter((artifact) => !artifact.exists).map((artifact) => ({
      failure: 'generated-artifact-missing',
      path: artifact.path
    })),
    warnings: optional.filter((artifact) => !artifact.exists).map((artifact) => ({
      warning: 'optional-generated-artifact-missing',
      path: artifact.path
    }))
  }
}

const auditSourceStatus = (date) => {
  const rows = sqliteJson(`
    select source_name, last_status, last_completeness_status, actual_item_count, expected_item_count, missing_item_count, cache_valid_until
    from source_fetch_status
    where sport='mlb'
      and source_date=${sqlText(date)}
  `)
  const byName = Object.fromEntries(rows.map((row) => [row.source_name, row]))
  const requiredSources = [
    'mlb_schedule',
    'mlb_game_feed',
    'mlb_lineups',
    'mlb_probables',
    'mlb_odds',
    'mlb_props',
    'fantasyinfocentral_weather',
    'fantasyinfocentral_daily_matchups',
    'fantasyinfocentral_umpire_factors',
    'fangraphs_roster_resource_bullpen_depth',
    'mlb_env1',
    'mlb_rp2'
  ]
  const legacyFeatureSources = [
    'mlb_pitcher_features',
    'mlb_bullpen_features',
    'mlb_team_features',
    'mlb_environment',
    'baseballsavant_hitter_statcast',
    'mlb_player_context'
  ]
  const hardFailures = []
  const warnings = []

  for (const sourceName of requiredSources) {
    const row = byName[sourceName]
    if (!row) {
      hardFailures.push({ failure: 'source-status-missing', sourceName })
      continue
    }
    if (!['success', 'partial'].includes(row.last_status)) {
      hardFailures.push({ failure: 'source-status-not-success', sourceName, status: row.last_status })
    }
    if (Number(row.actual_item_count || 0) <= 0) {
      hardFailures.push({ failure: 'source-status-zero-rows', sourceName, status: row.last_status })
    }
    if (row.last_status === 'partial' || Number(row.missing_item_count || 0) > 0) {
      warnings.push({
        warning: 'source-status-partial',
        sourceName,
        actual: Number(row.actual_item_count || 0),
        expected: Number(row.expected_item_count || 0),
        missing: Number(row.missing_item_count || 0)
      })
    }
    if (row.last_completeness_status && row.last_completeness_status !== 'complete') {
      warnings.push({
        warning: 'source-completeness-partial',
        sourceName,
        completenessStatus: row.last_completeness_status,
        actual: Number(row.actual_item_count || 0),
        expected: Number(row.expected_item_count || 0),
        missing: Number(row.missing_item_count || 0)
      })
    }
  }

  for (const sourceName of legacyFeatureSources) {
    const row = byName[sourceName]
    if (!row || row.last_status !== 'success' || Number(row.actual_item_count || 0) <= 0) {
      warnings.push({
        warning: 'legacy-feature-source-not-green',
        sourceName,
        status: row?.last_status || 'missing',
        actual: Number(row?.actual_item_count || 0)
      })
    }
  }

  return {
    rows,
    hardFailures,
    warnings
  }
}

const auditAddendumCoverage = (date, gameCount) => {
  const teamSideCount = gameCount * 2
  const rows = sqliteJson(`
    select 'env1' as source, count(distinct coalesce(cast(game_pk as text), matchup_key)) as rows
    from mlb_game_environment_adjustments_daily
    where source_date=${sqlText(date)}
      and model_version=${sqlText(env1ModelVersion)}
    union all
    select 'rp2' as source, count(distinct team_name || ':' || coalesce(team_side, '')) as rows
    from mlb_relief_pitcher_projection_v1_daily
    where source_date=${sqlText(date)}
      and model_version=${sqlText(rp2ModelVersion)}
    union all
    select 'fic_weather' as source, count(distinct coalesce(cast(game_pk as text), matchup_key)) as rows
    from mlb_fic_weather_daily
    where source_date=${sqlText(date)}
    union all
    select 'fic_daily_matchups' as source, count(*) as rows
    from mlb_fic_daily_matchups
    where source_date=${sqlText(date)}
    union all
    select 'espn_pitcher_splits' as source, count(*) as rows
    from mlb_pitcher_espn_splits
    where snapshot_date=${sqlText(date)}
  `)
  const bySource = Object.fromEntries(rows.map((row) => [row.source, Number(row.rows || 0)]))
  const expected = {
    env1: gameCount,
    rp2: teamSideCount,
    fic_weather: gameCount,
    fic_daily_matchups: gameCount,
    espn_pitcher_splits: teamSideCount
  }
  const hardFailures = []
  const warnings = []
  const exactCoverageSources = new Set(['env1', 'rp2', 'fic_weather', 'espn_pitcher_splits'])
  for (const [source, expectedAtLeast] of Object.entries(expected)) {
    const actualRows = bySource[source] || 0
    if (actualRows < expectedAtLeast) {
      hardFailures.push({
        failure: 'addendum-coverage-low',
        source,
        expectedAtLeast,
        actualRows
      })
    }
    if (exactCoverageSources.has(source) && actualRows > expectedAtLeast) {
      warnings.push({
        warning: 'addendum-coverage-extra',
        source,
        expected: expectedAtLeast,
        actualRows
      })
    }
  }
  return { rows: bySource, expected, hardFailures, warnings }
}

const auditGames = (games) => {
  const gameReports = games.map((game) => {
    const eligibility = buildMlbPredictionEligibility(game, { requireAddendums: true })
    return {
      id: game.id,
      title: game.title,
      start: game.start,
      eligible: Boolean(eligibility.eligible),
      status: eligibility.status,
      hardFailures: eligibility.hardFailures,
      warnings: eligibility.warnings,
      lineup: {
        away: eligibility.lineup.away,
        home: eligibility.lineup.home
      },
      pitchers: {
        away: eligibility.pitchers.away,
        home: eligibility.pitchers.home
      },
      addendums: eligibility.addendums
    }
  })
  return {
    games: gameReports,
    hardFailures: gameReports.flatMap((game) =>
      array(game.hardFailures).map((failure) => ({
        gameId: game.id,
        title: game.title,
        failure: `prediction-eligibility:${failure}`
      }))
    ),
    warnings: gameReports.flatMap((game) =>
      array(game.warnings).map((warning) => ({
        gameId: game.id,
        title: game.title,
        warning
      }))
    )
  }
}

const writeReport = async (date, report) => {
  await fs.mkdir(reportsRoot, { recursive: true })
  const filePath = path.join(reportsRoot, `audit_mlb_prediction_contract_${date}.json`)
  await fs.writeFile(filePath, `${JSON.stringify(report, null, 2)}\n`, 'utf8')
  return filePath
}

const main = async () => {
  const date = argValue('--date')
  if (!date) throw new Error('Usage: node scripts/audit-mlb-prediction-contract.mjs --date YYYY-MM-DD')
  process.env.MLB_DAY_GAMES_DISABLE_DB = '1'
  const games = await loadMlbDayGames(date)
  const artifacts = auditArtifacts(date)
  const sourceStatus = auditSourceStatus(date)
  const addendums = auditAddendumCoverage(date, games.length)
  const gameAudit = auditGames(games)
  const hardFailures = [
    ...artifacts.hardFailures,
    ...sourceStatus.hardFailures,
    ...addendums.hardFailures,
    ...gameAudit.hardFailures
  ]
  const warnings = [
    ...artifacts.warnings,
    ...sourceStatus.warnings,
    ...addendums.warnings,
    ...gameAudit.warnings
  ]
  const report = {
    audit: 'mlb-prediction-contract',
    date,
    generatedAt: new Date().toISOString(),
    status: hardFailures.length ? 'fail' : 'pass',
    gameCount: games.length,
    eligibleGames: gameAudit.games.filter((game) => game.eligible).length,
    hardFailures,
    warnings,
    artifacts,
    sourceStatus,
    addendums,
    games: gameAudit.games
  }
  const reportPath = await writeReport(date, report)
  console.log(`[audit-mlb-prediction-contract] ${report.status.toUpperCase()} ${date}`)
  console.log(`[audit-mlb-prediction-contract] games=${games.length} eligible=${report.eligibleGames} hardFailures=${hardFailures.length} warnings=${warnings.length}`)
  console.log(`[audit-mlb-prediction-contract] report=${path.relative(root, reportPath)}`)
  if (hardFailures.length) {
    console.error(JSON.stringify(hardFailures.slice(0, 40), null, 2))
    process.exitCode = 1
  }
}

main().catch((error) => {
  console.error(`[audit-mlb-prediction-contract] ${error.stack || error.message}`)
  process.exit(1)
})
