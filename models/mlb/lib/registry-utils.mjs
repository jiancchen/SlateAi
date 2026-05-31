import fs from 'node:fs/promises'
import path from 'node:path'
import { spawn } from 'node:child_process'

export const rootDir = path.resolve(import.meta.dirname, '..', '..', '..')
export const mlbDir = path.resolve(rootDir, 'models', 'mlb')
export const registryPath = path.join(mlbDir, 'registry.json')

export const readJson = async (absolutePath, fallback = null) => {
  try {
    return JSON.parse(await fs.readFile(absolutePath, 'utf8'))
  } catch (error) {
    if (error.code === 'ENOENT') return fallback
    throw error
  }
}

export const writeJson = async (absolutePath, payload) => {
  await fs.mkdir(path.dirname(absolutePath), { recursive: true })
  await fs.writeFile(absolutePath, `${JSON.stringify(payload, null, 2)}\n`)
}

export const readRegistry = async () => {
  const registry = await readJson(registryPath)
  if (!registry) throw new Error(`Missing MLB registry: ${path.relative(rootDir, registryPath)}`)
  return registry
}

export const resolveModelId = (registry, requestedModel = '') => {
  const modelId = String(requestedModel || registry.active?.model || registry.activeModelId || '').trim()
  if (!modelId) throw new Error('No MLB model requested and registry has no active model.')
  return modelId.toUpperCase()
}

export const findCartridgeEntry = (registry, modelId) => {
  const entry = (registry.cartridges || []).find((cartridge) => String(cartridge.modelId || '').toUpperCase() === modelId)
  if (!entry) throw new Error(`MLB cartridge is not registered: ${modelId}`)
  return entry
}

export const resolveCartridge = async ({ model = '' } = {}) => {
  const registry = await readRegistry()
  const modelId = resolveModelId(registry, model)
  const entry = findCartridgeEntry(registry, modelId)
  const cartridgeDir = path.resolve(mlbDir, entry.targetPath || `./cartridges/${modelId}`)
  const manifestPath = path.join(cartridgeDir, 'manifest.json')
  const manifest = await readJson(manifestPath)
  if (!manifest) throw new Error(`Missing MLB cartridge manifest: ${path.relative(rootDir, manifestPath)}`)
  return { registry, modelId, entry, cartridgeDir, manifestPath, manifest }
}

export const relativeToRoot = (absolutePath) => path.relative(rootDir, absolutePath).replaceAll(path.sep, '/')

export const scriptCommand = (scriptPath) => {
  if (scriptPath.endsWith('.py')) return ['python3', [scriptPath]]
  return [process.execPath, [scriptPath]]
}

export const spawnScript = async ({ scriptPath, args = [], env = {} }) => {
  const absoluteScript = path.resolve(rootDir, scriptPath)
  const [command, baseArgs] = scriptCommand(absoluteScript)
  return await new Promise((resolve) => {
    const child = spawn(command, [...baseArgs, ...args], {
      cwd: rootDir,
      stdio: 'inherit',
      env: { ...process.env, ...env }
    })
    child.on('exit', (code, signal) => {
      if (signal) {
        resolve({ code: 1, signal })
        return
      }
      resolve({ code: code ?? 1, signal: null })
    })
  })
}

export const parseModelArg = (argv) => {
  const passthrough = []
  let model = ''
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === '--model') {
      model = argv[index + 1] || ''
      index += 1
    } else {
      passthrough.push(arg)
    }
  }
  return { model, passthrough }
}
