import path from 'node:path'
import { parseModelArg, relativeToRoot, resolveCartridge, rootDir, spawnScript } from './lib/registry-utils.mjs'

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
  let model = ''
  let entry = 'runner'
  for (let index = 0; index < raw.length; index += 1) {
    const arg = raw[index]
    if (arg === '--model') {
      model = raw[index + 1] || ''
      index += 1
    } else if (arg === '--entry') {
      entry = raw[index + 1] || ''
      index += 1
    } else {
      passthrough.push(arg)
    }
  }
  if (!entry) throw new Error('Pass --entry runner|pregame|refresh-live-board|followup|verify-refresh|lane:<name>')
  return { model, entry, passthrough }
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

const main = async () => {
  const { model, entry, passthrough } = parseArgs()
  const resolved = await resolveCartridge({ model })
  const scriptPath = resolveEntryPath({ ...resolved, entry })
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
