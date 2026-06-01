import { spawnSync } from 'node:child_process'

const parseArgs = () => {
  const args = process.argv.slice(2)
  const options = {
    start: '2026-05-23',
    end: '2026-05-31',
    holdout: '2026-05-31',
    today: '2026-06-01'
  }
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index]
    if (arg === '--start') {
      options.start = args[index + 1]
      index += 1
    } else if (arg === '--end') {
      options.end = args[index + 1]
      index += 1
    } else if (arg === '--holdout') {
      options.holdout = args[index + 1]
      index += 1
    } else if (arg === '--today') {
      options.today = args[index + 1]
      index += 1
    }
  }
  return options
}

const run = (label, command, args) => {
  console.log(`\n[M2 suite] ${label}`)
  const result = spawnSync(command, args, { stdio: 'inherit' })
  if (result.error) throw result.error
  if (result.status !== 0) {
    throw new Error(`${label} failed with exit code ${result.status}`)
  }
}

const main = () => {
  const options = parseArgs()
  run('derive player identity rows', 'npm', ['run', 'data:derive:mlb-player-identity', '--', '--through-date', options.end])
  run('derive pitcher-batter kernel rows', 'npm', ['run', 'data:derive:mlb-pitcher-batter-kernel', '--', '--through-date', options.end])
  run('derive state formula rows', 'npm', ['run', 'data:derive:mlb-state-formulas', '--', '--through-date', options.end])
  run('state formula row report', 'npm', ['run', 'data:research:mlb-m2-state-formula-rows', '--', '--start', options.start, '--end', options.end])
  run('player identity report', 'npm', ['run', 'data:research:mlb-m2-player-identity', '--', '--start', options.start, '--end', options.end])
  run('pitcher-batter kernel report', 'npm', ['run', 'data:research:mlb-m2-pitcher-batter-kernel', '--', '--start', options.start, '--end', options.end])
  run('stored research backtests', 'npm', ['run', 'data:backtest:mlb-m2-research', '--', '--start-date', options.start, '--end-date', options.end])
  run('research backtest report', 'npm', ['run', 'data:research:mlb-m2-backtests', '--', '--start', options.start, '--end', options.end, '--holdout', options.holdout])
  run('model comparison report', 'npm', ['run', 'data:research:mlb-m2-model-comparison', '--', '--start', options.start, '--end', options.end, '--holdout', options.holdout])
  run('value gate check', 'npm', ['run', 'data:check:mlb-m2-value-gates'])
}

main()
