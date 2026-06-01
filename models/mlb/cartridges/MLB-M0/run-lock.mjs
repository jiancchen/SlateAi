import fs from 'node:fs/promises'
import path from 'node:path'
import crypto from 'node:crypto'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { pathToFileURL } from 'node:url'
import { buildM0Snapshot } from './snapshot.mjs'

const execFileAsync = promisify(execFile)
const rootDir = path.resolve(import.meta.dirname, '..', '..', '..', '..')
const localModelId = path.basename(import.meta.dirname).toUpperCase()
const localCartridgeDir = path.relative(rootDir, import.meta.dirname).replaceAll(path.sep, '/')

const readJson = async (relativePath, fallback = null) => {
  try {
    return JSON.parse(await fs.readFile(path.resolve(rootDir, relativePath), 'utf8'))
  } catch (error) {
    if (error.code === 'ENOENT') return fallback
    throw error
  }
}

const writeJson = async (relativePath, payload) => {
  const absolute = path.resolve(rootDir, relativePath)
  await fs.mkdir(path.dirname(absolute), { recursive: true })
  await fs.writeFile(absolute, `${JSON.stringify(payload, null, 2)}\n`)
}

const stableJson = (value) => {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(',')}}`
  }
  return JSON.stringify(value)
}

const sha256Text = (text) => crypto.createHash('sha256').update(text).digest('hex')

const fileHash = async (filePath) => {
  const absolute = path.resolve(rootDir, filePath)
  try {
    const bytes = await fs.readFile(absolute)
    return {
      path: filePath,
      exists: true,
      sha256: crypto.createHash('sha256').update(bytes).digest('hex')
    }
  } catch (error) {
    if (error.code !== 'ENOENT') throw error
    return {
      path: filePath,
      exists: false,
      sha256: null
    }
  }
}

const aggregateHash = (entries) => sha256Text(stableJson(
  (entries || []).map((entry) => ({
    path: entry.path,
    role: entry.role || null,
    exists: Boolean(entry.exists),
    sha256: entry.sha256 || null
  })).sort((left, right) => String(left.path).localeCompare(String(right.path)))
))

const parseArgs = () => {
  const args = process.argv.slice(2)
  const options = { date: '', model: process.env.MLB_MODEL_ID || localModelId }
  for (let index = 0; index < args.length; index += 1) {
    if (args[index] === '--date') {
      options.date = args[index + 1]
      index += 1
    } else if (args[index] === '--model') {
      options.model = String(args[index + 1] || '').toUpperCase()
      index += 1
    }
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(options.date)) throw new Error('Pass --date YYYY-MM-DD')
  return options
}

const runCommand = async (command, args) => {
  try {
    const result = await execFileAsync(command, args, { cwd: rootDir, maxBuffer: 1024 * 1024 * 20 })
    return { ok: true, stdout: result.stdout.trim(), stderr: result.stderr.trim() }
  } catch (error) {
    return {
      ok: false,
      stdout: String(error.stdout || '').trim(),
      stderr: String(error.stderr || error.message || error).trim()
    }
  }
}

const gitInfo = async () => {
  const commit = await runCommand('git', ['rev-parse', 'HEAD'])
  const dirty = await runCommand('git', ['status', '--short'])
  return {
    commit: commit.ok ? commit.stdout : null,
    dirty: dirty.ok ? dirty.stdout.length > 0 : true
  }
}

const listGameFiles = async (date) => {
  const relativeDir = `published-data/slates/${date}/games`
  const absoluteDir = path.resolve(rootDir, relativeDir)
  try {
    return (await fs.readdir(absoluteDir))
      .filter((fileName) => fileName.endsWith('.json') && !fileName.startsWith('rg-'))
      .sort()
      .map((fileName) => `${relativeDir}/${fileName}`)
  } catch (error) {
    if (error.code === 'ENOENT') return []
    throw error
  }
}

const uniqueEntries = (entries) => {
  const byPath = new Map()
  for (const entry of entries) {
    if (entry?.path) byPath.set(entry.path, entry)
  }
  return Array.from(byPath.values()).sort((left, right) => left.path.localeCompare(right.path))
}

const sourceInventory = async () => {
  const registry = await readJson('models/mlb/registry.json', {})
  const manifest = await readJson(`${localCartridgeDir}/manifest.json`, {})
  const rp36 = await readJson('models/mlb/cartridges/MLB-RP36/manifest.json', {})
  const e0 = await readJson('models/mlb/cartridges/MLB-E0/manifest.json', {})
  return uniqueEntries([
    { path: 'models/mlb/registry.json', role: 'model-registry' },
    { path: 'models/registry.json', role: 'top-level-model-registry' },
    { path: `${localCartridgeDir}/manifest.json`, role: 'model-manifest' },
    { path: manifest.entrypoint, role: 'model-runner-wrapper' },
    { path: manifest.outputContract, role: 'output-contract' },
    { path: manifest.modelDescription, role: 'model-description' },
    { path: manifest.modelNotes, role: 'model-notes' },
    { path: manifest.modelLog, role: 'model-log' },
    { path: `${localCartridgeDir}/snapshot.mjs`, role: 'snapshot-builder' },
    { path: `${localCartridgeDir}/verify_snapshot.mjs`, role: 'snapshot-verifier' },
    { path: `${localCartridgeDir}/run-lock.mjs`, role: 'run-locker' },
    { path: `${localCartridgeDir}/verify_run.mjs`, role: 'run-verifier' },
    { path: 'models/mlb/cartridges/MLB-RP36/manifest.json', role: 'relief-addendum-manifest' },
    { path: rp36.entrypoint, role: 'relief-addendum-runner' },
    { path: rp36.outputContract, role: 'relief-addendum-output-contract' },
    { path: rp36.modelDescription, role: 'relief-addendum-description' },
    { path: rp36.modelNotes, role: 'relief-addendum-notes' },
    { path: 'models/mlb/cartridges/MLB-E0/manifest.json', role: 'evaluator-manifest' },
    { path: e0.metricsContract, role: 'metrics-contract' },
    ...(manifest.sourceFiles || []),
    ...(rp36.sourceFiles || []),
    ...((registry.cartridges || []).map((cartridge) => ({
      path: path.posix.join('models/mlb', cartridge.targetPath.replace(/^\.\//, ''), 'manifest.json'),
      role: `${cartridge.role || cartridge.modelId}-manifest`
    })))
  ])
}

const inputInventory = async (date) => uniqueEntries([
  { path: `published-data/slates/${date}/summary.json`, role: 'published-summary' },
  ...(await listGameFiles(date)).map((filePath) => ({ path: filePath, role: 'published-game' })),
  { path: `data-private/predictions/mlb-sides/${date}-veto-artifact.json`, role: 'side-veto-artifact' },
  { path: `data-private/predictions/mlb-player-props/${date}-player-props.json`, role: 'player-props' },
  { path: `data-private/predictions/mlb-home-runs/${date}-statcast-prototype.json`, role: 'home-run-board' },
  { path: `data-private/predictions/mlb-reliever-shadow/${date}-reliever-shadow.json`, role: 'rp36-reliever-shadow' },
  { path: `data-private/lineups/mlb/${date}-lineup-board.json`, role: 'lineup-board' }
])

export const lockM0Run = async ({ date, model = process.env.MLB_MODEL_ID || localModelId }) => {
  const registry = await readJson('models/mlb/registry.json', {})
  const active = registry.active || {}
  const modelId = String(model || localModelId).toUpperCase()
  const runId = `mlb-${date}-${active.warehouse || 'MLB-W1'}-${active.features || 'MLB-F0'}-${modelId}-${active.reliefAddendum || 'MLB-RP36'}-${active.evaluator || 'MLB-E0'}`
  const runDir = `data-private/model-runs/mlb/${modelId}/${date}`
  const snapshot = await buildM0Snapshot({ date })
  const sourceFiles = await Promise.all((await sourceInventory()).map(async (entry) => ({ ...entry, ...(await fileHash(entry.path)) })))
  const inputFiles = await Promise.all((await inputInventory(date)).map(async (entry) => ({ ...entry, ...(await fileHash(entry.path)) })))
  const sourceHash = aggregateHash(sourceFiles)
  const inputHash = aggregateHash(inputFiles)

  await writeJson(`${runDir}/snapshot.json`, snapshot)
  await writeJson(`${runDir}/files.lock.json`, { schemaVersion: 1, runId, sourceHash, files: sourceFiles })
  await writeJson(`${runDir}/inputs.lock.json`, { schemaVersion: 1, runId, inputHash, inputs: inputFiles })

  const outputTargets = [
    { path: `${runDir}/snapshot.json`, role: 'prediction-snapshot' },
    { path: `${runDir}/files.lock.json`, role: 'source-lock' },
    { path: `${runDir}/inputs.lock.json`, role: 'input-lock' }
  ]
  const outputFiles = await Promise.all(outputTargets.map(async (entry) => ({ ...entry, ...(await fileHash(entry.path)) })))
  const outputHash = aggregateHash(outputFiles)
  const run = {
    schemaVersion: 1,
    runId,
    sport: 'mlb',
    slateDate: date,
    modelId,
    reliefAddendum: active.reliefAddendum || 'MLB-RP36',
    evaluatorVersion: active.evaluator || 'MLB-E0',
    warehouseVersion: active.warehouse || 'MLB-W1',
    featureVersion: active.features || 'MLB-F0',
    mode: 'pregame',
    status: 'locked',
    lockedAt: new Date().toISOString(),
    git: await gitInfo(),
    sourceHash,
    inputHash,
    outputHash,
    snapshotHash: snapshot.snapshotHash,
    artifactSummary: snapshot.artifactSummary,
    sourceFiles: sourceFiles.length,
    inputs: inputFiles.length,
    outputs: outputFiles.length + 1
  }
  await writeJson(`${runDir}/run.json`, run)

  const finalOutputFiles = await Promise.all([
    ...outputTargets,
    { path: `${runDir}/run.json`, role: 'run-manifest' }
  ].map(async (entry) => ({ ...entry, ...(await fileHash(entry.path)) })))
  await writeJson(`${runDir}/outputs.lock.json`, {
    schemaVersion: 1,
    runId,
    outputHash,
    outputs: finalOutputFiles
  })

  const indexResult = await runCommand('python3', [
    'models/shared/model-runs/index_runs.py',
    'index',
    '--sport',
    'mlb',
    '--model-id',
    modelId,
    '--date',
    date
  ])
  if (!indexResult.ok) {
    throw new Error(`Failed to index MLB-M0 run in warehouse: ${indexResult.stderr || indexResult.stdout}`)
  }

  return { run, runDir: path.resolve(rootDir, runDir) }
}

const executedUrl = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : null

if (import.meta.url === executedUrl) {
  const { date, model } = parseArgs()
  const { run, runDir } = await lockM0Run({ date, model })
  console.log(JSON.stringify({
    runId: run.runId,
    runDir,
    status: run.status,
    sourceHash: run.sourceHash,
    inputHash: run.inputHash,
    outputHash: run.outputHash,
    snapshotHash: run.snapshotHash,
    artifactSummary: run.artifactSummary
  }, null, 2))
}
