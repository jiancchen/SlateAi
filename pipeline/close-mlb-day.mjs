import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')

const DEFAULT_PROP_MODEL_NAME = 'mlb-player-props-v2'
const DEFAULT_HR_MODEL_NAME = 'statcast-hr-prototype-v3'

const parseArgs = () => {
  const args = process.argv.slice(2)
  const options = {
    date: null,
    propModelName: DEFAULT_PROP_MODEL_NAME,
    hrModelName: DEFAULT_HR_MODEL_NAME
  }

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index]
    if (arg === '--date') options.date = args[++index]
    else if (arg === '--prop-model-name') options.propModelName = args[++index]
    else if (arg === '--hr-model-name') options.hrModelName = args[++index]
  }

  if (!options.date) {
    throw new Error('Missing required --date argument, expected YYYY-MM-DD.')
  }

  return options
}

const runPythonWarehouse = (command, extraArgs = []) => {
  execFileSync('python3', [path.join(rootDir, 'pipeline', 'mlb_warehouse.py'), command, ...extraArgs], {
    cwd: rootDir,
    stdio: 'inherit'
  })
}

const runNodeScript = (scriptName, extraArgs = []) => {
  execFileSync('node', [path.join(rootDir, 'pipeline', scriptName), ...extraArgs], {
    cwd: rootDir,
    stdio: 'inherit'
  })
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

  runPythonWarehouse('ingest-mlb-day', ['--date', options.date])
  runPythonWarehouse('derive-story-signals', ['--through-date', options.date])
  runPythonWarehouse('derive-hidden-edge-features', ['--through-date', options.date])
  runPythonWarehouse('derive-mistake-shapes', ['--through-date', options.date])
  runPythonWarehouse('derive-state-snapshots', ['--through-date', options.date])

  if (fs.existsSync(hrPredictionPath)) {
    runPythonWarehouse('import-predictions', ['--file', hrPredictionPath])
    runPythonWarehouse('grade-home-run-picks', ['--date', options.date, '--model-name', options.hrModelName])
  } else {
    console.warn(`Skipping HR import/grading for ${options.date}; missing file: ${hrPredictionPath}`)
  }

  runPythonWarehouse('grade-prop-picks', ['--date', options.date, '--model-name', options.propModelName])
  runNodeScript('export-history-journal.mjs')
  runPythonWarehouse('derive-story-labels', ['--through-date', options.date])
  execFileSync('npm', ['run', 'data:export:published'], { cwd: rootDir, stdio: 'inherit' })
  execFileSync('npm', ['run', 'data:research:mlb-hidden-edges'], { cwd: rootDir, stdio: 'inherit' })
  execFileSync('npm', ['run', 'data:research:mlb-stateful-edges'], { cwd: rootDir, stdio: 'inherit' })
  execFileSync('npm', ['run', 'data:research:mlb-first5-state-model'], { cwd: rootDir, stdio: 'inherit' })
  execFileSync('npm', ['run', 'data:research:mlb-market-divergence'], { cwd: rootDir, stdio: 'inherit' })
  execFileSync('npm', ['run', 'data:research:mlb-story-phase-labels'], { cwd: rootDir, stdio: 'inherit' })
}

main()
