import { parseModelArg, resolveCartridge, spawnScript } from './lib/registry-utils.mjs'

const main = async () => {
  const { model, passthrough } = parseModelArg(process.argv.slice(2))
  const resolved = await resolveCartridge({ model })
  const runCheck = resolved.manifest.runCheck
  if (!runCheck) throw new Error(`${resolved.modelId} manifest is missing runCheck.`)
  const result = await spawnScript({
    scriptPath: runCheck,
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
