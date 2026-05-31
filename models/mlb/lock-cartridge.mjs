import { parseModelArg, resolveCartridge, spawnScript } from './lib/registry-utils.mjs'

const main = async () => {
  const { model, passthrough } = parseModelArg(process.argv.slice(2))
  const resolved = await resolveCartridge({ model })
  const runLock = resolved.manifest.runLock
  if (!runLock) throw new Error(`${resolved.modelId} manifest is missing runLock.`)
  const result = await spawnScript({
    scriptPath: runLock,
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
