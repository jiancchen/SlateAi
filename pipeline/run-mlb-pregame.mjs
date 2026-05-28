import { execFileSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')

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

const runNpm = (args) => {
  execFileSync('npm', args, {
    cwd: rootDir,
    stdio: 'inherit'
  })
}

const main = () => {
  const options = parseArgs()
  const refreshArgs = ['run', 'data:refresh:mlb-live', '--', '--date', options.date]

  if (options.baselineContextDate) {
    refreshArgs.push('--baseline-context-date', options.baselineContextDate)
  }

  runNpm(refreshArgs)
  runNpm(['run', 'data:verify:mlb-refresh', '--', '--date', options.date])
  runNpm(['run', 'data:export:published'])
  runNpm(['run', 'build'])
  runNpm(['run', 'build:api'])
}

main()
