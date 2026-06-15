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

const writeText = async (filePath, text) => {
  await fs.mkdir(path.dirname(filePath), { recursive: true })
  await fs.writeFile(filePath, text, 'utf8')
}

const run = (label, command, args = [], options = {}) => {
  const startedMs = Date.now()
  const startedAt = new Date(startedMs).toISOString()
  const rendered = [command, ...args].join(' ')
  console.log(`\n[mlb-morning] ${label}`)
  console.log(`[mlb-morning] $ ${rendered}`)
  if (options.dryRun) {
    const finishedMs = Date.now()
    return { label, command: rendered, status: 'dry_run', startedAt, finishedAt: new Date(finishedMs).toISOString(), durationMs: finishedMs - startedMs }
  }
  try {
    execFileSync(command, args, {
      cwd: options.cwd || root,
      stdio: 'inherit',
      env: { ...process.env, ...(options.env || {}) }
    })
    const finishedMs = Date.now()
    return { label, command: rendered, status: 'passed', startedAt, finishedAt: new Date(finishedMs).toISOString(), durationMs: finishedMs - startedMs }
  } catch (error) {
    const finishedMs = Date.now()
    if (options.allowFailure) {
      return {
        label,
        command: rendered,
        status: 'allowed_failure',
        startedAt,
        finishedAt: new Date(finishedMs).toISOString(),
        durationMs: finishedMs - startedMs,
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

const statusCounts = (steps = []) =>
  steps.reduce((acc, step) => {
    acc[step.status] = (acc[step.status] || 0) + 1
    return acc
  }, {})

const seconds = (ms = 0) => `${(Number(ms || 0) / 1000).toFixed(1)}s`

const maybeReport = async (relativePath, fallback = null) => readJson(path.join(root, relativePath), fallback)

const changelogLine = (label, value) => `- ${label}: ${value}`

const buildChangelog = async (report) => {
  const splitAudit = await maybeReport(`data-migration/reports/audit_mlb_player_split_families_${report.date}.json`)
  const sp1Build = await maybeReport(`data-migration/reports/build_mlb_sp1_${report.date}.json`)
  const sp1Audit = await maybeReport(`data-migration/reports/audit_mlb_sp1_${report.date}.json`)
  const contractAudit = await maybeReport(`data-migration/reports/audit_mlb_morning_contracts_${report.date}.json`)
  const causalAudit = await maybeReport(`data-migration/reports/audit_mlb_causal_ledger_${report.date}.json`)
  const publicAudit = await maybeReport(`data-migration/reports/audit_public_mlb_slate_${report.date}_local.json`)
  const counts = statusCounts(report.steps)
  const failedSteps = report.steps.filter((step) => step.status !== 'passed' && step.status !== 'dry_run')
  const lines = [
    `# MLB Morning Changelog ${report.date}`,
    '',
    changelogLine('Run ID', report.runId),
    changelogLine('Generated', report.generatedAt),
    changelogLine('Deploy requested', report.deploy ? 'yes' : 'no'),
    changelogLine('Source gaps allowed', report.allowSourceGaps ? 'yes' : 'no'),
    changelogLine('Prior closeout date', report.priorDate),
    changelogLine('Step status counts', Object.entries(counts).map(([key, value]) => `${key}=${value}`).join(', ') || 'none'),
    changelogLine('Non-MLB preservation', `${report.nonMlbPreservation.before} before / ${report.nonMlbPreservation.after} after / ${report.nonMlbPreservation.missing.length} missing`),
    '',
    '## Source Gates',
    '',
    changelogLine(
      'Split families',
      splitAudit
        ? `${splitAudit.status}; hitter L/R ${splitAudit.counts?.hitterHandednessRows ?? 'n/a'}, pitcher L/R ${splitAudit.counts?.pitcherHandednessRows ?? 'n/a'}, day/night ${splitAudit.counts?.pitcherDayNightRows ?? 'n/a'}, home/away ${splitAudit.counts?.pitcherHomeAwayRows ?? 'n/a'}`
        : 'report missing'
    ),
    changelogLine(
      'SP1 build',
      sp1Build
        ? `${sp1Build.insertedProfiles}/${sp1Build.expectedProfiles} profiles; status ${sp1Build.sourceStatus}`
        : 'report missing'
    ),
    changelogLine(
      'SP1 audit',
      sp1Audit
        ? `${sp1Audit.status}; hard failures ${(sp1Audit.hardFailures || []).length}`
        : 'report missing'
    ),
    changelogLine(
      'Morning contracts',
      contractAudit
        ? `${contractAudit.failures?.length ? 'failed' : 'passed'}; failures ${(contractAudit.failures || []).length}`
        : 'report missing'
    ),
    changelogLine(
      'Causal ledger',
      causalAudit
        ? `${causalAudit.status}; hard failures ${(causalAudit.hardFailures || causalAudit.failures || []).length}`
        : 'report missing'
    ),
    changelogLine(
      'Public audit',
      publicAudit
        ? `${publicAudit.status || (publicAudit.failures?.length ? 'failed' : 'passed')}; failures ${(publicAudit.failures || publicAudit.hardFailures || []).length}`
        : 'report missing'
    ),
    '',
    '## Step Timings',
    '',
    '| Step | Status | Duration |',
    '| --- | --- | --- |',
    ...report.steps.map((step) => `| ${step.label.replaceAll('|', '/')} | ${step.status} | ${seconds(step.durationMs)} |`)
  ]
  if (failedSteps.length) {
    lines.push('', '## Non-Passing Steps', '')
    for (const step of failedSteps) {
      lines.push(`- ${step.label}: ${step.status}${step.error ? ` (${step.error})` : ''}`)
    }
  }
  lines.push('')
  return `${lines.join('\n')}\n`
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
  const runId = `mlb-morning-${date}-${new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14)}`
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

  steps.push(run('Fetch StatMuse starter-vs-team history after lineup pitcher sync', 'node', [
    'data-migration/scripts/fetch-mlb-starter-vs-team-statmuse.mjs', '--date', date
  ], { dryRun, allowFailure: allowSourceGaps }))

  steps.push(run('Warehouse ESPN pitcher splits after lineup pitcher sync', 'node', [
    'scripts/warehouse-mlb-espn-pitcher-splits.mjs', '--date', date
  ], { dryRun }))

  steps.push(run('Warehouse canonical hitter/pitcher split families', 'npm', [
    'run', 'data:warehouse:mlb-player-split-families', '--', '--date', date
  ], { dryRun }))

  steps.push(run('Audit canonical hitter/pitcher split family coverage', 'npm', [
    'run', 'data:audit:mlb-player-split-families', '--', '--date', date
  ], { dryRun }))

  steps.push(run('Build MLB-SP1 starter-collapse profiles from canonical splits', 'npm', [
    'run', 'data:build:mlb-sp1', '--', '--date', date
  ], { dryRun }))

  steps.push(run('Audit MLB-SP1 starter-collapse profile coverage', 'npm', [
    'run', 'data:audit:mlb-sp1', '--', '--date', date
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
    'run', 'data:generate:mlb-day', '--', '--date', date, '--skip-preflight'
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
    runId,
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
  const changelogPath = path.join(reportsRoot, `mlb_morning_changelog_${date}.md`)
  if (!dryRun) await writeJson(reportPath, report)
  if (!dryRun) await writeText(changelogPath, await buildChangelog(report))
  console.log(`\n[mlb-morning] complete ${date}`)
  console.log(`[mlb-morning] report=${dryRun ? 'dry-run-not-written' : path.relative(root, reportPath)}`)
  console.log(`[mlb-morning] changelog=${dryRun ? 'dry-run-not-written' : path.relative(root, changelogPath)}`)
  if (allowSourceGaps) {
    console.log('[mlb-morning] source gaps were allowed; do not treat this as production-green.')
  }
}

main().catch(async (error) => {
  console.error(`[mlb-morning] ${error.stack || error.message}`)
  process.exit(1)
})
