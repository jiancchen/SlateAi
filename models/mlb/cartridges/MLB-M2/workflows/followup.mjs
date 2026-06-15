import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { runLegacyM2Warehouse } from './archive-m2/legacy-warehouse.mjs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..', '..', '..', '..', '..')
const currentModelId = process.env.MLB_MODEL_ID || path.basename(path.resolve(__dirname, '..')).toUpperCase()
const typedWarehouseCliPath = path.join(rootDir, 'pipeline', 'mlb', 'warehouse', 'mlb_typed_warehouse.py')
const typedWarehouseCommands = new Set(['ingest-mlb-day'])

const DEFAULT_PROP_MODEL_NAME = 'mlb-player-props-v2'
const DEFAULT_HR_MODEL_NAME = 'statcast-hr-prototype-v3'
const DEFAULT_SIDE_MODEL_NAME = 'board-moneyline-v1.1-sanity'

const parseArgs = () => {
  const args = process.argv.slice(2)
  const options = {
    date: null,
    propModelName: DEFAULT_PROP_MODEL_NAME,
    hrModelName: DEFAULT_HR_MODEL_NAME,
    sideModelName: DEFAULT_SIDE_MODEL_NAME
  }

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index]
    if (arg === '--date') options.date = args[++index]
    else if (arg === '--prop-model-name') options.propModelName = args[++index]
    else if (arg === '--hr-model-name') options.hrModelName = args[++index]
    else if (arg === '--side-model-name') options.sideModelName = args[++index]
  }

  if (!options.date) {
    throw new Error('Missing required --date argument, expected YYYY-MM-DD.')
  }

  return options
}

const runPythonWarehouse = (command, extraArgs = []) => {
  if (!typedWarehouseCommands.has(command)) {
    runLegacyM2Warehouse(rootDir, command, extraArgs)
    return
  }
  execFileSync('python3', [typedWarehouseCliPath, command, ...extraArgs], {
    cwd: rootDir,
    stdio: 'inherit'
  })
}

const runPythonSideBacktest = (command, extraArgs = []) => {
  execFileSync('python3', [path.join(rootDir, 'pipeline', 'mlb', 'warehouse', 'mlb_side_backtest.py'), command, ...extraArgs], {
    cwd: rootDir,
    stdio: 'inherit'
  })
}

const runMlbCartridge = (entry, extraArgs = [], modelId = currentModelId) => {
  execFileSync('node', [
    path.join(rootDir, 'models', 'mlb', 'run-cartridge.mjs'),
    '--model',
    modelId,
    '--entry',
    entry,
    ...extraArgs
  ], {
    cwd: rootDir,
    stdio: 'inherit'
  })
}

const buildPostmortemPaths = (date) => {
  const [, month, day] = date.split('-')
  const stamp = `${month}${day}${date.slice(2, 4)}`
  const monthLabel = new Date(`${date}T00:00:00Z`)
    .toLocaleString('en-US', { month: 'short', timeZone: 'UTC' })
    .toLowerCase()
  return {
    postmortem: path.join(rootDir, 'development-docs', 'mlb', 'postmortems', `${monthLabel}${Number(day)}-slate-postmortem-${stamp}.md`),
    followup: path.join(rootDir, 'development-docs', 'mlb', 'postmortems', `${monthLabel}${Number(day)}-chaos-followups-${stamp}.md`)
  }
}

const main = () => {
  const options = parseArgs()
  const hrPredictionPath = path.join(
    rootDir,
    'data-private',
    'predictions',
    'mlb-home-runs',
    `${options.date}-statcast-prototype.json`
  )
  const sidePredictionPath = path.join(
    rootDir,
    'data-private',
    'predictions',
    'mlb-sides',
    `${options.date}-board-live.json`
  )

  runPythonWarehouse('ingest-mlb-day', ['--date', options.date])
  runPythonWarehouse('derive-story-signals', ['--through-date', options.date])
  runPythonWarehouse('derive-hidden-edge-features', ['--through-date', options.date])
  runPythonWarehouse('derive-mistake-shapes', ['--through-date', options.date])
  runPythonWarehouse('derive-first-inning-profiles', ['--through-date', options.date])
  runPythonWarehouse('derive-state-snapshots', ['--through-date', options.date])

  if (fs.existsSync(hrPredictionPath)) {
    runPythonWarehouse('import-predictions', ['--file', hrPredictionPath])
    runPythonWarehouse('grade-home-run-picks', ['--date', options.date, '--model-name', options.hrModelName])
  } else {
    console.warn(`Skipping HR import/grading for ${options.date}; missing file: ${hrPredictionPath}`)
  }

  runPythonWarehouse('grade-prop-picks', ['--date', options.date, '--model-name', options.propModelName])
  if (fs.existsSync(sidePredictionPath)) {
    runPythonSideBacktest('import', ['--file', sidePredictionPath])
    runPythonSideBacktest('grade', ['--model-name', options.sideModelName])
  } else {
    console.warn(`Skipping side import/grading for ${options.date}; missing file: ${sidePredictionPath}`)
  }
  runMlbCartridge('lane:history-journal', ['--skip-preflight'])
  runPythonWarehouse('derive-story-labels', ['--through-date', options.date])
  const postmortemPaths = buildPostmortemPaths(options.date)
  execFileSync(
    'npm',
    [
      'run',
      'data:research:mlb-slate-postmortem',
      '--',
      '--date',
      options.date,
      '--postmortem-out',
      postmortemPaths.postmortem,
      '--followup-out',
      postmortemPaths.followup
    ],
    { cwd: rootDir, stdio: 'inherit' }
  )
  execFileSync('npm', ['run', 'data:export:published'], { cwd: rootDir, stdio: 'inherit' })
  execFileSync('npm', ['run', 'data:research:mlb-hidden-edges'], { cwd: rootDir, stdio: 'inherit' })
  execFileSync('npm', ['run', 'data:research:mlb-stateful-edges'], { cwd: rootDir, stdio: 'inherit' })
  execFileSync('npm', ['run', 'data:research:mlb-first5-state-model'], { cwd: rootDir, stdio: 'inherit' })
  execFileSync('npm', ['run', 'data:research:mlb-market-divergence'], { cwd: rootDir, stdio: 'inherit' })
  execFileSync('npm', ['run', 'data:research:mlb-story-phase-labels'], { cwd: rootDir, stdio: 'inherit' })
  execFileSync('npm', ['run', 'data:research:mlb-veto-engine', '--', '--end-date', options.date], {
    cwd: rootDir,
    stdio: 'inherit'
  })
}

main()
