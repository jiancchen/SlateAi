import { execFileSync } from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'

const root = path.resolve(import.meta.dirname, '..')
const reportsRoot = path.join(root, 'data-migration', 'reports')

const argValue = (name, fallback = '') => {
  const prefix = `${name}=`
  const inline = process.argv.find((arg) => arg.startsWith(prefix))
  if (inline) return inline.slice(prefix.length)
  const index = process.argv.indexOf(name)
  return index >= 0 ? process.argv[index + 1] || fallback : fallback
}

const hasFlag = (name) => process.argv.includes(name)

const pacificToday = () => {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Los_Angeles',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).formatToParts(new Date()).map((part) => [part.type, part.value])
  )
  return `${parts.year}-${parts.month}-${parts.day}`
}

const addDays = (isoDate, days) => {
  const [year, month, day] = isoDate.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day + days))
  return [
    date.getUTCFullYear(),
    `${date.getUTCMonth() + 1}`.padStart(2, '0'),
    `${date.getUTCDate()}`.padStart(2, '0')
  ].join('-')
}

const readJson = async (filePath, fallback = null) => {
  try {
    return JSON.parse(await fs.readFile(filePath, 'utf8'))
  } catch (error) {
    if (error.code === 'ENOENT') return fallback
    throw error
  }
}

const writeJson = async (filePath, payload) => {
  await fs.mkdir(path.dirname(filePath), { recursive: true })
  await fs.writeFile(filePath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8')
}

const run = (label, command, args = [], options = {}) => {
  const startedAt = new Date().toISOString()
  const rendered = [command, ...args].join(' ')
  console.log(`\n[mlb-morning] ${label}`)
  console.log(`[mlb-morning] $ ${rendered}`)
  if (options.dryRun) {
    return { label, command: rendered, status: 'dry_run', startedAt, finishedAt: new Date().toISOString() }
  }
  try {
    execFileSync(command, args, {
      cwd: options.cwd || root,
      stdio: 'inherit',
      env: { ...process.env, ...(options.env || {}) }
    })
    return { label, command: rendered, status: 'passed', startedAt, finishedAt: new Date().toISOString() }
  } catch (error) {
    if (options.allowFailure) {
      return {
        label,
        command: rendered,
        status: 'allowed_failure',
        startedAt,
        finishedAt: new Date().toISOString(),
        error: error.message
      }
    }
    throw error
  }
}

const currentSummaryPath = () => path.join(root, 'web', 'public', 'data', 'current', 'summary.json')

const nonMlbIdsForCurrent = async () => {
  const summary = await readJson(currentSummaryPath(), { games: [] })
  return (summary.games || []).filter((game) => game.league !== 'MLB').map((game) => game.id).sort()
}

const assertNonMlbPreserved = (before = [], after = []) => {
  const afterSet = new Set(after)
  const missing = before.filter((id) => !afterSet.has(id))
  if (missing.length) {
    throw new Error(`Non-MLB slate IDs were not preserved: ${missing.slice(0, 12).join(', ')}`)
  }
  return { before: before.length, after: after.length, missing }
}

const runPublicMlbAudit = async (date, dryRun) => {
  return run('Public data audit', 'npm', [
    'run', 'data:audit:mlb-public', '--', '--date', date
  ], { dryRun })
}

const main = async () => {
  const date = argValue('--date', pacificToday())
  const deploy = hasFlag('--deploy')
  const dryRun = hasFlag('--dry-run')
  const allowSourceGaps = hasFlag('--allow-source-gaps')
  const skipPriorClose = hasFlag('--skip-prior-close')
  const liveBase = argValue('--live-base', 'https://slate-web-static-1.vercel.app')
  const priorDate = argValue('--prior-date', addDays(date, -1))
  const statcastStartDate = argValue('--statcast-start-date', addDays(date, -7))
  const steps = []
  const beforeNonMlbIds = await nonMlbIdsForCurrent()

  console.log(`[mlb-morning] date=${date}`)
  console.log(`[mlb-morning] prior=${priorDate}`)
  console.log(`[mlb-morning] deploy=${deploy}`)
  console.log(`[mlb-morning] allowSourceGaps=${allowSourceGaps}`)

  if (!skipPriorClose) {
    steps.push(run('Close and grade prior MLB day', 'npm', ['run', 'data:close:mlb-day', '--', '--date', priorDate], {
      dryRun,
      allowFailure: true
    }))
  }

  steps.push(run('Fetch MLB schedule and game feeds for prediction day', 'npm', [
    'run', 'data:fetch:mlb-schedule-feed', '--', '--start-date', date, '--end-date', date
  ], { dryRun, allowFailure: allowSourceGaps }))

  steps.push(run('Fetch DraftKings MLB full-game and first-five lines for refresh seed', 'npm', [
    'run', 'data:fetch:draftkings-mlb', '--', '--date', date
  ], { dryRun, allowFailure: allowSourceGaps }))

  steps.push(run('Refresh M2 source/feature prep without generating board artifacts', 'npm', [
    'run', 'data:refresh:mlb-live', '--', '--date', date, '--skip-preflight', '--prep-only'
  ], { dryRun }))

  steps.push(run('Fetch DraftKings MLB full-game and first-five lines', 'npm', [
    'run', 'data:fetch:draftkings-mlb', '--', '--date', date
  ], { dryRun }))

  steps.push(run('Warehouse DraftKings MLB game lines into typed market tables', 'python3', [
    'data-migration/scripts/ingest_mlb_markets_props_raw_to_typed.py',
    '--date', date,
    '--report', `data-migration/reports/ingest_mlb_markets_props_raw_to_typed_${date}_draftkings.json`
  ], { dryRun, allowFailure: allowSourceGaps }))

  steps.push(run('Validate DraftKings MLB full-game and first-five market coverage', 'python3', [
    'data-migration/scripts/validate_mlb_markets_props_raw_to_typed.py',
    '--date', date,
    '--report', `data-migration/reports/validate_mlb_markets_props_raw_to_typed_${date}_draftkings.json`
  ], { dryRun, allowFailure: allowSourceGaps }))

  steps.push(run('Refresh Baseball Savant hitter xwOBA game logs', 'node', [
    'models/mlb/cartridges/MLB-M2/workflows/archive-m2/legacy-warehouse.mjs',
    'ingest-hitter-statcast-range',
    '--start-date', statcastStartDate,
    '--end-date', date
  ], { dryRun, allowFailure: allowSourceGaps }))

  steps.push(run('Rebuild hitter xwOBA 7-game and 30-day trend snapshots', 'node', [
    'models/mlb/cartridges/MLB-M2/workflows/archive-m2/legacy-warehouse.mjs',
    'derive-hitter-statcast-trends',
    '--as-of-date', date
  ], { dryRun, allowFailure: allowSourceGaps }))

  steps.push(run('Fetch StatMuse starter-vs-team history', 'node', [
    'data-migration/scripts/fetch-mlb-starter-vs-team-statmuse.mjs', '--date', date
  ], { dryRun, allowFailure: allowSourceGaps }))

  steps.push(run('Warehouse ESPN pitcher splits', 'node', [
    'scripts/warehouse-mlb-espn-pitcher-splits.mjs', '--date', date
  ], { dryRun }))

  steps.push(run('Warehouse FantasyInfoCentral Weather/HRForce', 'npm', [
    'run', 'data:warehouse:mlb-fic-weather', '--', '--date', date
  ], { dryRun, allowFailure: allowSourceGaps }))

  steps.push(run('Warehouse FantasyInfoCentral daily BvP matchups', 'npm', [
    'run', 'data:warehouse:mlb-fic-daily-matchups', '--', '--date', date
  ], { dryRun, allowFailure: allowSourceGaps }))

  steps.push(run('Warehouse FantasyInfoCentral umpire factors', 'npm', [
    'run', 'data:warehouse:mlb-fic-umpire-factors', '--', '--date', date
  ], { dryRun, allowFailure: allowSourceGaps }))

  steps.push(run('Warehouse TheCapper MLB umpire context', 'npm', [
    'run', 'data:warehouse:mlb-umpires', '--', '--date', date
  ], { dryRun, allowFailure: allowSourceGaps }))

  steps.push(run('Audit TheCapper MLB umpire warehouse', 'npm', [
    'run', 'data:audit:mlb-umpires', '--', '--date', date
  ], { dryRun, allowFailure: allowSourceGaps }))

  steps.push(run('Build MLB-ENV1 environment adjustments', 'npm', [
    'run', 'data:build:mlb-env1', '--', '--date', date
  ], { dryRun, allowFailure: allowSourceGaps }))

  steps.push(run('Warehouse FanGraphs/RosterResource bullpen context', 'npm', [
    'run', 'data:warehouse:mlb-fangraphs-bullpen-depth', '--', '--date', date, '--team', 'all'
  ], { dryRun, allowFailure: allowSourceGaps }))

  steps.push(run('Build MLB-RP2 relief pitcher projections', 'npm', [
    'run', 'data:build:mlb-rp2', '--', '--date', date
  ], { dryRun, allowFailure: allowSourceGaps }))

  steps.push(run('Generate relief/K shadow addendums', 'npm', [
    'run', 'data:generate:mlb-shadow-addendums', '--', '--dates', date
  ], { dryRun, allowFailure: allowSourceGaps }))

  steps.push(run('Regenerate lineup board after supplemental sources', 'npm', [
    'run', 'data:export:mlb-lineups', '--', '--date', date, '--skip-preflight'
  ], { dryRun }))

  steps.push(run('Repair known supplemental lineup slots', 'node', [
    'scripts/repair-mlb-lineup-supplements.mjs', '--date', date
  ], { dryRun }))

  steps.push(run('Ingest generated hitter lineup splits', 'npm', [
    'run', 'data:ingest:hitter-lineup-splits', '--', '--date', date
  ], { dryRun }))

  steps.push(run('Refresh DraftKings MLB lines before final preflight', 'npm', [
    'run', 'data:fetch:draftkings-mlb', '--', '--date', date
  ], { dryRun }))

  steps.push(run('Warehouse final DraftKings MLB lines before final preflight', 'python3', [
    'data-migration/scripts/ingest_mlb_markets_props_raw_to_typed.py',
    '--date', date,
    '--report', `data-migration/reports/ingest_mlb_markets_props_raw_to_typed_${date}_draftkings_final.json`
  ], { dryRun, allowFailure: allowSourceGaps }))

  steps.push(run('Validate final DraftKings MLB market coverage before final preflight', 'python3', [
    'data-migration/scripts/validate_mlb_markets_props_raw_to_typed.py',
    '--date', date,
    '--report', `data-migration/reports/validate_mlb_markets_props_raw_to_typed_${date}_draftkings_final.json`
  ], { dryRun, allowFailure: allowSourceGaps }))

  steps.push(run('Regenerate M2 day files after final lineups and addendums', 'npm', [
    'run', 'data:generate:mlb-day', '--', '--date', date
  ], { dryRun }))

  steps.push(run('Regenerate RP36 reliever shadow after final day files', 'npm', [
    'run', 'data:export:mlb-reliever-shadow', '--', '--date', date, '--skip-preflight'
  ], { dryRun }))

  steps.push(run('Regenerate veto artifact after final day files', 'npm', [
    'run', 'data:export:mlb-veto-artifact', '--', '--date', date, '--skip-preflight'
  ], { dryRun }))

  steps.push(run('Regenerate home-run board after final day files', 'npm', [
    'run', 'data:export:hr', '--', '--date', date, '--skip-preflight'
  ], { dryRun }))

  steps.push(run('Regenerate player props with market lineage', 'npm', [
    'run', 'data:export:mlb-props', '--', '--date', date, '--skip-preflight'
  ], { dryRun, env: { MLB_DAY_GAMES_DISABLE_DB: '1' } }))

  steps.push(run('Import regenerated MLB player props into prediction warehouse', 'node', [
    'models/mlb/cartridges/MLB-M2/workflows/archive-m2/legacy-warehouse.mjs',
    'import-prop-predictions',
    '--file',
    `data-private/predictions/mlb-player-props/${date}-player-props.json`
  ], { dryRun }))

  steps.push(run('Grade MLB player props when boxscores are available', 'node', [
    'models/mlb/cartridges/MLB-M2/workflows/archive-m2/legacy-warehouse.mjs',
    'grade-prop-picks',
    '--date',
    date,
    '--model-name',
    'mlb-player-props-v2'
  ], { dryRun, allowFailure: true }))

  steps.push(run('Prediction eligibility and addendum contract audit', 'npm', [
    'run', 'data:audit:mlb-prediction-contract', '--', '--date', date
  ], { dryRun, allowFailure: allowSourceGaps }))

  steps.push(run('Generated-vs-DB parity blocking audit', 'npm', [
    'run', 'data:audit:mlb-generated-db-parity', '--', '--date', date
  ], { dryRun, allowFailure: allowSourceGaps }))

  steps.push(run('Hard source-contract audit', 'npm', [
    'run', 'data:audit:mlb-morning-contracts', '--', '--date', date
  ], { dryRun, allowFailure: allowSourceGaps }))

  steps.push(run('Causal ledger usage audit', 'npm', [
    'run', 'data:audit:mlb-causal-ledger', '--', '--date', date
  ], { dryRun }))

  steps.push(run('Not-started side/F5/late coherence audit', 'npm', [
    'run', 'data:audit:mlb-not-started-side-coherence', '--', '--date', date
  ], { dryRun }))

  steps.push(run('Capture started-game locks before public publish', 'npm', [
    'run', 'data:audit:mlb-started-game-locks', '--', '--date', date, '--mode', 'capture', '--source', 'slate'
  ], { dryRun }))

  steps.push(run('Publish rich MLB slate and preserve non-MLB games', 'npm', [
    'run', 'data:publish:mlb-clean:vercel-safe', '--', '--date', date
  ], { dryRun }))

  const afterNonMlbIds = dryRun ? beforeNonMlbIds : await nonMlbIdsForCurrent()
  const preservation = assertNonMlbPreserved(beforeNonMlbIds, afterNonMlbIds)

  steps.push(run('Audit started-game locks after public publish', 'npm', [
    'run', 'data:audit:mlb-started-game-locks', '--', '--date', date, '--mode', 'audit', '--source', 'slate'
  ], { dryRun }))

  steps.push(await runPublicMlbAudit(date, dryRun))

  if (deploy) {
    steps.push(run('Build and deploy public site with hash/private-reference checks', 'npm', [
      'run', 'publish:site', '--', '--date', date
    ], { dryRun }))
    steps.push(run('Live public data audit', 'npm', [
      'run', 'data:audit:mlb-public', '--', '--date', date, '--base', liveBase
    ], { dryRun }))
  }

  const report = {
    run: 'mlb-morning-predictions',
    date,
    priorDate,
    statcastStartDate,
    generatedAt: new Date().toISOString(),
    deploy,
    allowSourceGaps,
    nonMlbPreservation: preservation,
    steps
  }
  const reportPath = path.join(reportsRoot, `mlb_morning_predictions_${date}.json`)
  if (!dryRun) await writeJson(reportPath, report)
  console.log(`\n[mlb-morning] complete ${date}`)
  console.log(`[mlb-morning] report=${dryRun ? 'dry-run-not-written' : path.relative(root, reportPath)}`)
  if (allowSourceGaps) {
    console.log('[mlb-morning] source gaps were allowed; do not treat this as production-green.')
  }
}

main().catch(async (error) => {
  console.error(`[mlb-morning] ${error.stack || error.message}`)
  process.exit(1)
})
