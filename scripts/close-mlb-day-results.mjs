import { execFileSync } from 'node:child_process'
import fs from 'node:fs/promises'
import fsSync from 'node:fs'
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

const run = (label, command, args = [], options = {}) => {
  const startedMs = Date.now()
  const startedAt = new Date(startedMs).toISOString()
  const rendered = [command, ...args].join(' ')
  console.log(`\n[mlb-close-results] ${label}`)
  console.log(`[mlb-close-results] $ ${rendered}`)
  if (options.dryRun) {
    const finishedMs = Date.now()
    return { label, command: rendered, status: 'dry_run', startedAt, finishedAt: new Date(finishedMs).toISOString(), durationMs: finishedMs - startedMs }
  }
  try {
    execFileSync(command, args, { cwd: root, stdio: 'inherit', env: { ...process.env, ...(options.env || {}) } })
    const finishedMs = Date.now()
    return { label, command: rendered, status: 'passed', startedAt, finishedAt: new Date(finishedMs).toISOString(), durationMs: finishedMs - startedMs }
  } catch (error) {
    const finishedMs = Date.now()
    if (options.allowFailure) {
      return { label, command: rendered, status: 'allowed_failure', startedAt, finishedAt: new Date(finishedMs).toISOString(), durationMs: finishedMs - startedMs, error: error.message }
    }
    throw error
  }
}

const writeJson = async (filePath, payload) => {
  await fs.mkdir(path.dirname(filePath), { recursive: true })
  await fs.writeFile(filePath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8')
}

const statusCounts = (steps = []) =>
  steps.reduce((acc, step) => {
    acc[step.status] = (acc[step.status] || 0) + 1
    return acc
  }, {})

const maybeFile = (relativePath) => fsSync.existsSync(path.join(root, relativePath))

const main = async () => {
  const date = argValue('--date')
  if (!date) throw new Error('Usage: node scripts/close-mlb-day-results.mjs --date YYYY-MM-DD [--dry-run] [--skip-fetch] [--skip-grading]')
  const dryRun = hasFlag('--dry-run')
  const skipFetch = hasFlag('--skip-fetch')
  const skipGrading = hasFlag('--skip-grading')
  const steps = []
  const runId = `mlb-close-results-${date}-${new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14)}`

  if (!skipFetch) {
    steps.push(run('Fetch MLB final schedule/feed snapshots', 'npm', [
      'run', 'data:fetch:mlb-schedule-feed', '--', '--start-date', date, '--end-date', date
    ], { dryRun }))
  }

  steps.push(run('Ingest MLB game feeds into typed warehouse', 'npm', [
    'run', 'data:typed:ingest:mlb-day', '--', '--date', date
  ], { dryRun }))

  steps.push(run('Normalize result/outcome tables', 'npm', [
    'run', 'data:derive:batter-outcomes', '--', '--as-of-date', date
  ], { dryRun }))

  if (!skipGrading) {
    if (maybeFile(`data-private/predictions/mlb-home-runs/${date}-statcast-prototype.json`)) {
      steps.push(run('Import HR predictions', 'node', [
        'models/mlb/cartridges/MLB-M2/workflows/archive-m2/legacy-warehouse.mjs',
        'import-predictions',
        '--file',
        `data-private/predictions/mlb-home-runs/${date}-statcast-prototype.json`
      ], { dryRun, allowFailure: true }))
      steps.push(run('Grade HR predictions', 'node', [
        'models/mlb/cartridges/MLB-M2/workflows/archive-m2/legacy-warehouse.mjs',
        'grade-home-run-picks',
        '--date',
        date,
        '--model-name',
        'statcast-hr-prototype-v3'
      ], { dryRun, allowFailure: true }))
    }

    steps.push(run('Grade MLB player props', 'node', [
      'models/mlb/cartridges/MLB-M2/workflows/archive-m2/legacy-warehouse.mjs',
      'grade-prop-picks',
      '--date',
      date,
      '--model-name',
      'mlb-player-props-v2'
    ], { dryRun, allowFailure: true }))

    if (maybeFile(`data-private/predictions/mlb-sides/${date}-board-live.json`)) {
      steps.push(run('Import side predictions', 'python3', [
        'pipeline/mlb/warehouse/mlb_side_backtest.py',
        'import',
        '--file',
        `data-private/predictions/mlb-sides/${date}-board-live.json`
      ], { dryRun, allowFailure: true }))
      steps.push(run('Grade side predictions', 'python3', [
        'pipeline/mlb/warehouse/mlb_side_backtest.py',
        'grade',
        '--model-name',
        'board-moneyline-v1.1-sanity'
      ], { dryRun, allowFailure: true }))
    }
  }

  const report = {
    run: 'mlb-close-day-results',
    runId,
    date,
    generatedAt: new Date().toISOString(),
    dryRun,
    skipFetch,
    skipGrading,
    stepStatusCounts: statusCounts(steps),
    steps
  }
  const reportPath = path.join(reportsRoot, `mlb_close_day_results_${date}.json`)
  if (!dryRun) await writeJson(reportPath, report)
  console.log(`\n[mlb-close-results] complete ${date}`)
  console.log(`[mlb-close-results] report=${dryRun ? 'dry-run-not-written' : path.relative(root, reportPath)}`)
}

main().catch((error) => {
  console.error(`[mlb-close-results] ${error.stack || error.message}`)
  process.exit(1)
})
