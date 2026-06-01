import fs from 'node:fs/promises'
import path from 'node:path'
import { readRegistry, registryPath, resolveCartridge, rootDir, writeJson } from './lib/registry-utils.mjs'

const textExtensions = new Set([
  '.js', '.mjs', '.json', '.md', '.py', '.txt', '.ts', '.tsx', '.css', '.sql'
])

const parseArgs = () => {
  const args = process.argv.slice(2)
  const options = {
    from: 'MLB-M0',
    to: '',
    write: false,
    updateRegistry: false,
    activate: false
  }
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index]
    if (arg === '--from') {
      options.from = String(args[index + 1] || '').toUpperCase()
      index += 1
    } else if (arg === '--to') {
      options.to = String(args[index + 1] || '').toUpperCase()
      index += 1
    } else if (arg === '--write') {
      options.write = true
    } else if (arg === '--update-registry') {
      options.updateRegistry = true
    } else if (arg === '--activate') {
      options.activate = true
      options.updateRegistry = true
    }
  }
  if (!/^MLB-[A-Z0-9]+$/.test(options.from)) throw new Error('Pass --from MLB-...')
  if (!/^MLB-[A-Z0-9]+$/.test(options.to)) throw new Error('Pass --to MLB-...')
  if (options.from === options.to) throw new Error('--from and --to must be different.')
  return options
}

const walk = async (dir) => {
  const entries = await fs.readdir(dir, { withFileTypes: true })
  const files = []
  for (const entry of entries) {
    const absolute = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      files.push(...await walk(absolute))
    } else if (entry.isFile()) {
      files.push(absolute)
    }
  }
  return files
}

const replaceAll = (text, replacements) => {
  let next = text
  for (const [from, to] of replacements) {
    next = next.split(from).join(to)
  }
  return next
}

const replacementPairs = ({ from, to }) => {
  const fromSuffix = from.replace(/^MLB-/, '')
  const toSuffix = to.replace(/^MLB-/, '')
  return [
    [from, to],
    [fromSuffix, toSuffix],
    [from.toLowerCase(), to.toLowerCase()],
    [fromSuffix.toLowerCase(), toSuffix.toLowerCase()]
  ]
}

const rewriteCopiedFiles = async ({ targetDir, from, to }) => {
  const replacements = replacementPairs({ from, to })
  const files = await walk(targetDir)
  for (const file of files) {
    const ext = path.extname(file)
    if (!textExtensions.has(ext)) continue
    const original = await fs.readFile(file, 'utf8')
    const updated = replaceAll(original, replacements)
    if (updated !== original) await fs.writeFile(file, updated)
  }

  const renamed = []
  for (const file of (await walk(targetDir)).sort((left, right) => right.length - left.length)) {
    const nextPath = replaceAll(file, replacements)
    if (nextPath !== file) {
      await fs.rename(file, nextPath)
      renamed.push([file, nextPath])
    }
  }
  return renamed
}

const updateRegistry = async ({ from, to, activate }) => {
  const registry = await readRegistry()
  const fromEntry = (registry.cartridges || []).find((entry) => String(entry.modelId || '').toUpperCase() === from)
  if (!fromEntry) throw new Error(`Cannot update registry; source model not registered: ${from}`)
  if ((registry.cartridges || []).some((entry) => String(entry.modelId || '').toUpperCase() === to)) {
    throw new Error(`Cannot update registry; target model already registered: ${to}`)
  }
  const nextEntry = {
    ...fromEntry,
    modelId: to,
    targetPath: `./cartridges/${to}`,
    status: 'draft',
    basedOn: from,
    notes: `Draft cartridge scaffolded from ${from}. It must pass benchmark snapshots and lane comparisons before activation.`
  }
  registry.cartridges = [...(registry.cartridges || []), nextEntry]
  if (activate) {
    registry.activeModelId = to
    registry.active = { ...(registry.active || {}), model: to }
  }
  await writeJson(registryPath, registry)
}

const main = async () => {
  const options = parseArgs()
  const source = await resolveCartridge({ model: options.from })
  const targetDir = path.resolve(rootDir, 'models', 'mlb', 'cartridges', options.to)
  const targetExists = await fs.stat(targetDir).then(() => true, (error) => {
    if (error.code === 'ENOENT') return false
    throw error
  })
  const plan = {
    from: options.from,
    to: options.to,
    sourceDir: path.relative(rootDir, source.cartridgeDir),
    targetDir: path.relative(rootDir, targetDir),
    write: options.write,
    updateRegistry: options.updateRegistry,
    activate: options.activate,
    safety: 'Dry run by default. Pass --write to create files.'
  }
  if (!options.write) {
    console.log(JSON.stringify({ ...plan, status: 'dry-run' }, null, 2))
    return
  }
  if (targetExists) throw new Error(`Target cartridge already exists: ${path.relative(rootDir, targetDir)}`)
  await fs.cp(source.cartridgeDir, targetDir, { recursive: true })
  const renamed = await rewriteCopiedFiles({ targetDir, from: options.from, to: options.to })
  if (options.updateRegistry) await updateRegistry(options)
  console.log(JSON.stringify({ ...plan, status: 'created', renamed: renamed.length }, null, 2))
}

main().catch((error) => {
  console.error(error.message || error)
  process.exitCode = 1
})
