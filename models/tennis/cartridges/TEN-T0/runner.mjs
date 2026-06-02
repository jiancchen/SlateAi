import { spawn, spawnSync } from 'node:child_process'
import path from 'node:path'

const rootDir = path.resolve(import.meta.dirname, '..', '..', '..', '..')
const generator = path.join(rootDir, 'pipeline', 'tennis', 'publish', 'generate-day-module.mjs')
const preflightScript = path.join(rootDir, 'data-migration', 'scripts', 'prediction_preflight.mjs')

const parseRunnerArgs = (argv) => {
  const generatorArgs = []
  const options = {
    date: '',
    preflightLane: 'value',
    skipPreflight: false
  }

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === '--date') {
      options.date = argv[index + 1] || ''
      generatorArgs.push(arg, argv[index + 1])
      index += 1
    } else if (arg === '--preflight-lane') {
      options.preflightLane = argv[index + 1] || options.preflightLane
      index += 1
    } else if (arg === '--skip-preflight') {
      options.skipPreflight = true
    } else {
      generatorArgs.push(arg)
    }
  }

  return { generatorArgs, options }
}

const runPreflight = ({ date, preflightLane }) => {
  if (!date) return
  const report = path.join(rootDir, 'data-migration', 'reports', `prediction_preflight_tennis_${date}_${preflightLane}_runner.json`)
  const result = spawnSync(process.execPath, [
    preflightScript,
    '--sport',
    'tennis',
    '--date',
    date,
    '--lane',
    preflightLane,
    '--report',
    report
  ], {
    cwd: rootDir,
    stdio: 'inherit'
  })
  if (result.signal) process.kill(process.pid, result.signal)
  if (result.status) process.exit(result.status)
}

const { generatorArgs: args, options } = parseRunnerArgs(process.argv.slice(2))

if (!options.skipPreflight) {
  runPreflight(options)
}

if (!args.includes('--model')) {
  args.unshift('TEN-T0')
  args.unshift('--model')
}

const child = spawn(process.execPath, [generator, ...args], {
  cwd: rootDir,
  stdio: 'inherit'
})

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal)
    return
  }
  process.exitCode = code ?? 1
})
