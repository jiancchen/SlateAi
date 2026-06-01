import fs from 'node:fs/promises'
import path from 'node:path'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { pathToFileURL } from 'node:url'
import { buildM2Snapshot } from './snapshot.mjs'

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
    { path: `${localCartridgeDir}/snapshot-run.mjs`, role: 'run-snapshotter' },
    { path: `${localCartridgeDir}/check_run.mjs`, role: 'run-checker' },
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

export const snapshotM2Run = async ({ date, model = process.env.MLB_MODEL_ID || localModelId }) => {
  const registry = await readJson('models/mlb/registry.json', {})
  const active = registry.active || {}
  const modelId = String(model || localModelId).toUpperCase()
  const runId = `mlb-${date}-${active.warehouse || 'MLB-W1'}-${active.features || 'MLB-F0'}-${modelId}-${active.reliefAddendum || 'MLB-RP36'}-${active.evaluator || 'MLB-E0'}`
  const runDir = `data-private/model-runs/mlb/${modelId}/${date}`
  const snapshot = await buildM2Snapshot({ date })
  const sourceFiles = await sourceInventory()
  const inputFiles = await inputInventory(date)

  await writeJson(`${runDir}/snapshot.json`, snapshot)
  const outputTargets = [
    { path: `${runDir}/snapshot.json`, role: 'prediction-snapshot' },
    { path: `${runDir}/run.json`, role: 'run-manifest' }
  ]
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
    status: 'snapshotted',
    snapshottedAt: new Date().toISOString(),
    git: await gitInfo(),
    sourceHash: null,
    inputHash: null,
    outputHash: null,
    snapshotHash: snapshot.snapshotHash,
    artifactSummary: snapshot.artifactSummary,
    sourceFiles: sourceFiles.length,
    inputs: inputFiles.length,
    outputs: outputTargets.length,
    artifacts: outputTargets
  }
  await writeJson(`${runDir}/run.json`, run)

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
    throw new Error(`Failed to index MLB run snapshot in warehouse: ${indexResult.stderr || indexResult.stdout}`)
  }

  return { run, runDir: path.resolve(rootDir, runDir) }
}

const executedUrl = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : null

if (import.meta.url === executedUrl) {
  const { date, model } = parseArgs()
  const { run, runDir } = await snapshotM2Run({ date, model })
  console.log(JSON.stringify({
    runId: run.runId,
    runDir,
    status: run.status,
    snapshotHash: run.snapshotHash,
    artifactSummary: run.artifactSummary
  }, null, 2))
}
