import fs from 'node:fs/promises'
import path from 'node:path'
import crypto from 'node:crypto'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { tennisWarehousePath } from './warehouse-paths.mjs'

export const execFileAsync = promisify(execFile)
export const rootDir = path.resolve(import.meta.dirname, '..', '..')

export const readJson = async (filePath, fallback = null) => {
  try {
    return JSON.parse(await fs.readFile(path.resolve(rootDir, filePath), 'utf8'))
  } catch (error) {
    if (error.code === 'ENOENT') return fallback
    throw error
  }
}

export const writeJson = async (filePath, payload) => {
  const absolute = path.resolve(rootDir, filePath)
  await fs.mkdir(path.dirname(absolute), { recursive: true })
  await fs.writeFile(absolute, `${JSON.stringify(payload, null, 2)}\n`)
}

export const stableJson = (value) => {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(',')}}`
  }
  return JSON.stringify(value)
}

export const sha256Text = (text) => crypto.createHash('sha256').update(text).digest('hex')

export const fileHash = async (filePath) => {
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

export const aggregateHash = (entries) => sha256Text(stableJson(
  (entries || []).map((entry) => ({
    path: entry.path ?? entry.file_path ?? entry.input_path ?? entry.output_path,
    role: entry.role ?? entry.fileRole ?? entry.inputRole ?? entry.outputRole ?? null,
    exists: Boolean(entry.exists),
    sha256: entry.sha256 ?? null
  })).sort((left, right) => String(left.path).localeCompare(String(right.path)))
))

export const shellQuote = (value) => `'${String(value ?? '').replace(/'/g, "''")}'`

export const sqliteExec = async (sql) => {
  const dbPath = tennisWarehousePath()
  await execFileAsync('sqlite3', [dbPath, sql], { cwd: rootDir, maxBuffer: 1024 * 1024 * 20 })
}

export const sqliteJson = async (sql) => {
  const dbPath = tennisWarehousePath()
  const { stdout } = await execFileAsync('sqlite3', ['-json', dbPath, sql], {
    cwd: rootDir,
    maxBuffer: 1024 * 1024 * 50
  })
  const trimmed = stdout.trim()
  return trimmed ? JSON.parse(trimmed) : []
}

export const runCommand = async (command, args) => {
  try {
    const result = await execFileAsync(command, args, {
      cwd: rootDir,
      maxBuffer: 1024 * 1024 * 50
    })
    return {
      command: [command, ...args].join(' '),
      exitCode: 0,
      ok: true,
      stdout: result.stdout,
      stderr: result.stderr
    }
  } catch (error) {
    return {
      command: [command, ...args].join(' '),
      exitCode: error.code ?? 1,
      ok: false,
      stdout: error.stdout ?? '',
      stderr: error.stderr ?? String(error.message || error)
    }
  }
}

export const gitInfo = async () => {
  const commit = await runCommand('git', ['rev-parse', 'HEAD'])
  const dirty = await runCommand('git', ['status', '--short'])
  return {
    commit: commit.ok ? commit.stdout.trim() : null,
    dirty: dirty.ok ? dirty.stdout.trim().length > 0 : true
  }
}

export const loadRegistry = async () => {
  const modernPath = 'models/tennis/registry.json'
  return {
    ...(await readJson(modernPath)),
    registryPath: modernPath
  }
}

export const activeStack = async ({ model = null } = {}) => {
  const registry = await loadRegistry()
  const active = registry.active || {}
  return {
    warehouseVersion: active.warehouse || 'TEN-W1',
    featureVersion: active.features || 'TEN-F0',
    modelId: model || active.model || 'TEN-T0',
    evaluatorVersion: active.evaluator || 'TEN-E0'
  }
}

export const runIdFor = ({ date, stack }) =>
  `tennis-${date}-${stack.warehouseVersion}-${stack.featureVersion}-${stack.modelId}-${stack.evaluatorVersion}`

export const inputPathsForDate = (date) => [
  { path: `data-private/reference/tennis/espn-scoreboard-${date}.json`, role: 'espn-scoreboard' },
  { path: `web/src/lib/day-${date}-tennis-warehouse-context.generated.json`, role: 'warehouse-context' },
  { path: `data-private/reference/tennis/draftkings-lines-${date}.json`, role: 'draftkings-lines' },
  { path: `data-private/reference/tennis/fanduel-lines-${date}.json`, role: 'fanduel-lines' },
  { path: `data-private/predictions/tennis/${date}-multimodel-ensemble.json`, role: 'multimodel-ensemble' },
  { path: `data-private/predictions/tennis/${date}-derivative-markets.json`, role: 'derivative-markets' },
  { path: `data-private/reports/kalshi-tennis-spike-model-${date}.json`, role: 'kalshi-spike-model' }
]

export const runDirFor = ({ model, date }) => `data-private/model-runs/tennis/${model}/${date}`

export const copyJsonArtifact = async ({ from, to, fallback }) => {
  const payload = await readJson(from, fallback)
  await writeJson(to, payload)
  return payload
}
