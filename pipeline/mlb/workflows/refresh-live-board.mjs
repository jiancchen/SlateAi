import { execFileSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..', '..', '..')
const playerPropModelName = 'mlb-player-props-v2'

const shiftIsoDate = (dateText, days) => {
  const base = new Date(`${dateText}T00:00:00Z`)
  base.setUTCDate(base.getUTCDate() + days)
  return base.toISOString().slice(0, 10)
}

const parseArgs = () => {
  const args = process.argv.slice(2)
  const options = {
    date: null,
    baselineContextDate: null
  }

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index]
    if (arg === '--date') options.date = args[++index]
    else if (arg === '--baseline-context-date') options.baselineContextDate = args[++index]
  }

  if (!options.date) {
    throw new Error('Missing required --date argument, expected YYYY-MM-DD.')
  }

  return options
}

const runNodeScript = (scriptName, extraArgs = []) => {
  execFileSync('node', [path.join(rootDir, 'pipeline', scriptName), ...extraArgs], {
    cwd: rootDir,
    stdio: 'inherit'
  })
}

const runPythonWarehouse = (command, extraArgs = []) => {
  execFileSync('python3', [path.join(rootDir, 'pipeline', 'mlb_warehouse.py'), command, ...extraArgs], {
    cwd: rootDir,
    stdio: 'inherit'
  })
}

const runPythonScript = (scriptName, extraArgs = []) => {
  execFileSync('python3', [path.join(rootDir, 'pipeline', scriptName), ...extraArgs], {
    cwd: rootDir,
    stdio: 'inherit'
  })
}

const runPythonFile = (relativePath, extraArgs = []) => {
  execFileSync('python3', [path.join(rootDir, relativePath), ...extraArgs], {
    cwd: rootDir,
    stdio: 'inherit'
  })
}

const main = () => {
  const options = parseArgs()
  const seasonYear = Number(options.date.slice(0, 4))
  const statcastLookbackStart = shiftIsoDate(options.date, -3)
  const generateArgs = ['--date', options.date]

  if (options.baselineContextDate) {
    generateArgs.push('--baseline-context-date', options.baselineContextDate)
  }

  // Refresh rolling bullpen and starter-form context before rebuilding the board.
  runPythonWarehouse('prepare-mlb-day', ['--date', options.date, '--lookback-days', '3'])
  // Keep current and previous season starter WAR context available for the NRFI lane and pitcher cards.
  runPythonWarehouse('ingest-pitcher-war', ['--season', String(seasonYear), '--season', String(seasonYear - 1)])
  // Keep hidden behavioral profiles collecting automatically for offline research.
  runPythonWarehouse('derive-hidden-edge-features', ['--as-of-date', options.date])
  // Track mistake-shape vectors so the model stops flattening chaos into averages.
  runPythonWarehouse('derive-mistake-shapes', ['--as-of-date', options.date])
  // First-inning betting needs its own lane: who scores early, who allows early, and which starter leaks immediately.
  runPythonWarehouse('derive-first-inning-profiles', ['--as-of-date', options.date])
  // Keep rolling team and hitter pressure/state snapshots collecting automatically for regime research.
  runPythonWarehouse('derive-state-snapshots', ['--as-of-date', options.date])
  // Keep classic last-10 hitter context collecting so we can test longer windows without changing live props yet.
  runPythonWarehouse('derive-hitter-classic-trends', ['--as-of-date', options.date])
  // Keep opponent-strength context for each hitter's recent games collecting for isolated research before deployment.
  runPythonWarehouse('derive-hitter-opponent-context', ['--as-of-date', options.date])
  // Warehouse rolling market memory and opponent-strength context without changing live picks until backtests clear it.
  runPythonWarehouse('derive-market-context', ['--as-of-date', options.date])
  // Track rolling hitter contact-quality windows so batter props can separate hot contact from lucky box scores.
  runPythonWarehouse('ingest-hitter-statcast-range', ['--start-date', statcastLookbackStart, '--end-date', options.date])
  runPythonWarehouse('derive-hitter-statcast-trends', ['--as-of-date', options.date])
  // Keep Tier 3 research tables collecting automatically even while the live model ignores them.
  runPythonWarehouse('derive-tier3-features', ['--as-of-date', options.date])
  // Capture today's FanDuel pitcher strikeout lines before we build the slate and prop board.
  runPythonScript('fetch_fanduel_research_mlb.py', ['--start-date', options.date, '--end-date', options.date, '--markets', 'strikeouts'])
  runNodeScript('generate-mlb-day-files.mjs', generateArgs)
  runNodeScript('export-mlb-lineup-model.mjs', ['--date', options.date])
  // Keep the bullpen upgrade path in shadow mode on real game cards before promoting it into live picks.
  runPythonFile('models/mlb/cartridges/RP36/runner.py', ['--date', options.date])
  runNodeScript('export-mlb-veto-artifact.mjs', ['--date', options.date])
  runNodeScript('export-home-run-predictions.mjs', ['--date', options.date])
  runNodeScript('export-mlb-prop-predictions.mjs', ['--date', options.date])
  runPythonWarehouse('import-prop-predictions', [
    '--file',
    path.join(rootDir, 'data-private', 'predictions', 'mlb-player-props', `${options.date}-player-props.json`)
  ])
  // Prop grading only makes sense once the day has actual batting boxscores stored.
  try {
    runPythonWarehouse('grade-prop-picks', ['--date', options.date, '--model-name', playerPropModelName])
  } catch (error) {
    console.warn(`Prop grading skipped for ${options.date}:`, error instanceof Error ? error.message : error)
  }
}

main()
