import path from 'node:path'
import { relativeToRoot, resolveCartridge, rootDir, spawnScript } from './lib/registry-utils.mjs'

const preflightScript = 'data-migration/scripts/prediction_preflight.mjs'

const laneMap = {
  'generate-day-files': 'generate-day-files.mjs',
  'batting-impact': 'batting-impact.mjs',
  lineups: 'lineups.mjs',
  'home-runs': 'home-runs.mjs',
  props: 'props.mjs',
  sides: 'sides.mjs',
  veto: 'veto.mjs',
  'training-corpus': 'training-corpus.mjs',
  'history-journal': 'history-journal.mjs'
}

const workflowMap = {
  pregame: 'pregame.mjs',
  'refresh-live-board': 'refresh-live-board.mjs',
  followup: 'followup.mjs',
  'verify-refresh': 'verify-refresh.mjs'
}

const parseArgs = () => {
  const raw = process.argv.slice(2)
  const passthrough = []
  const options = {
    model: '',
    entry: 'runner',
    date: '',
    preflightLane: '',
    skipPreflight: false,
    allowPartial: false,
    preflightOnly: false
  }
  for (let index = 0; index < raw.length; index += 1) {
    const arg = raw[index]
    if (arg === '--model') {
      options.model = raw[index + 1] || ''
      index += 1
    } else if (arg === '--entry') {
      options.entry = raw[index + 1] || ''
      index += 1
    } else if (arg === '--date') {
      options.date = raw[index + 1] || ''
      passthrough.push(arg, raw[index + 1])
      index += 1
    } else if (arg === '--preflight-lane') {
      options.preflightLane = raw[index + 1] || ''
      index += 1
    } else if (arg === '--skip-preflight') {
      options.skipPreflight = true
    } else if (arg === '--allow-partial') {
      options.allowPartial = true
    } else if (arg === '--preflight-only') {
      options.preflightOnly = true
    } else {
      passthrough.push(arg)
    }
  }
  if (!options.entry) throw new Error('Pass --entry runner|pregame|refresh-live-board|followup|verify-refresh|lane:<name>')
  return { options, passthrough }
}

const resolveEntryPath = ({ manifest, cartridgeDir, entry }) => {
  if (entry === 'runner') return manifest.entrypoint
  if (entry === 'pregame') return manifest.workflowEntrypoint || relativeToRoot(path.join(cartridgeDir, 'workflows', 'pregame.mjs'))
  if (entry.startsWith('lane:')) {
    const laneName = entry.slice('lane:'.length)
    const fileName = laneMap[laneName]
    if (!fileName) throw new Error(`Unknown MLB lane entry: ${laneName}`)
    return relativeToRoot(path.join(cartridgeDir, 'lanes', fileName))
  }
  const workflowFile = workflowMap[entry]
  if (workflowFile) return relativeToRoot(path.join(cartridgeDir, 'workflows', workflowFile))
  throw new Error(`Unknown MLB cartridge entry: ${entry}`)
}

const inferPreflightLane = (entry) => {
  if (entry === 'followup') return 'postgame'
  if (entry === 'verify-refresh') return 'all'
  if (entry.startsWith('lane:')) {
    const laneName = entry.slice('lane:'.length)
    if (['props', 'home-runs', 'batting-impact'].includes(laneName)) return 'props'
    if (laneName === 'training-corpus') return 'm2_training'
    if (['sides', 'veto', 'lineups', 'generate-day-files'].includes(laneName)) return 'prediction'
  }
  return 'value'
}

const runPreflight = async ({ date, entry, preflightLane, allowPartial }) => {
  if (!date) return { code: 0, signal: null }
  const lane = preflightLane || inferPreflightLane(entry)
  const partialMode = allowPartial ? 'allow_partial' : 'strict'
  const report = `data-migration/reports/prediction_preflight_mlb_${date}_${lane}_runner_${partialMode}.json`
  const args = ['--sport', 'mlb', '--date', date, '--lane', lane, '--report', report]
  if (!allowPartial) args.push('--no-partial')
  return await spawnScript({
    scriptPath: preflightScript,
    args
  })
}

const main = async () => {
  const { options, passthrough } = parseArgs()
  const resolved = await resolveCartridge({ model: options.model })
  const scriptPath = resolveEntryPath({ ...resolved, entry: options.entry })
  if (!options.skipPreflight) {
    const preflight = await runPreflight(options)
    if (preflight.signal) process.kill(process.pid, preflight.signal)
    if (preflight.code) {
      process.exitCode = preflight.code
      return
    }
  }
  if (options.preflightOnly) {
    process.exitCode = 0
    return
  }
  const result = await spawnScript({
    scriptPath,
    args: passthrough,
    env: { MLB_MODEL_ID: resolved.modelId }
  })
  if (result.signal) process.kill(process.pid, result.signal)
  process.exitCode = result.code
}

main().catch((error) => {
  console.error(error.message || error)
  process.exitCode = 1
})
