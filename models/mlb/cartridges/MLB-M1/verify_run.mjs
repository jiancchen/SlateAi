import fs from 'node:fs/promises'
import path from 'node:path'
import crypto from 'node:crypto'
import { buildM1Snapshot } from './snapshot.mjs'

const rootDir = path.resolve(import.meta.dirname, '..', '..', '..', '..')

const parseArgs = () => {
  const args = process.argv.slice(2)
  const options = { date: '' }
  for (let index = 0; index < args.length; index += 1) {
    if (args[index] === '--date') {
      options.date = args[index + 1]
      index += 1
    }
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(options.date)) throw new Error('Pass --date YYYY-MM-DD')
  return options
}

const readJson = async (relativePath) => JSON.parse(await fs.readFile(path.resolve(rootDir, relativePath), 'utf8'))

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

const firstDiff = (left, right, prefix = '$') => {
  if (Object.is(left, right)) return null
  if (typeof left !== typeof right) return `${prefix}: type ${typeof left} !== ${typeof right}`
  if (left === null || right === null || typeof left !== 'object') return `${prefix}: ${JSON.stringify(left)} !== ${JSON.stringify(right)}`
  if (Array.isArray(left) !== Array.isArray(right)) return `${prefix}: array mismatch`
  if (Array.isArray(left)) {
    if (left.length !== right.length) return `${prefix}: length ${left.length} !== ${right.length}`
    for (let index = 0; index < left.length; index += 1) {
      const nested = firstDiff(left[index], right[index], `${prefix}[${index}]`)
      if (nested) return nested
    }
    return null
  }
  const keys = Array.from(new Set([...Object.keys(left), ...Object.keys(right)])).sort()
  for (const key of keys) {
    if (!(key in left)) return `${prefix}.${key}: missing on actual`
    if (!(key in right)) return `${prefix}.${key}: missing on expected`
    const nested = firstDiff(left[key], right[key], `${prefix}.${key}`)
    if (nested) return nested
  }
  return null
}

const assertLock = async ({ lockPath, rowsKey, expectedHash, label, excludeRolesFromHash = new Set() }) => {
  const lock = await readJson(lockPath)
  const rows = await Promise.all((lock[rowsKey] || []).map(async (entry) => ({
    ...entry,
    ...(await fileHash(entry.path))
  })))
  const mismatches = rows.filter((row, index) => {
    const expected = lock[rowsKey][index]
    return Boolean(expected.exists) !== row.exists || (expected.sha256 || null) !== (row.sha256 || null)
  })
  if (mismatches.length) {
    const first = mismatches[0]
    throw new Error(`${label} drift: ${first.path}`)
  }
  const hashRows = rows.filter((row) => !excludeRolesFromHash.has(row.role))
  const hash = aggregateHash(hashRows)
  if (hash !== expectedHash) throw new Error(`${label} hash mismatch: expected ${expectedHash}, got ${hash}`)
  return rows.length
}

const main = async () => {
  const { date } = parseArgs()
  const runDir = `data-private/model-runs/mlb/MLB-M1/${date}`
  const run = await readJson(`${runDir}/run.json`)
  const snapshot = await readJson(`${runDir}/snapshot.json`)
  const actualSnapshot = await buildM1Snapshot({ date })
  const diff = firstDiff(actualSnapshot, snapshot)
  if (diff) {
    const actualPath = `${runDir}/snapshot.actual.json`
    await writeJson(actualPath, actualSnapshot)
    throw new Error(`MLB-M1 run snapshot mismatch: ${diff}. Actual written to ${actualPath}`)
  }
  const sourceFiles = await assertLock({
    lockPath: `${runDir}/files.lock.json`,
    rowsKey: 'files',
    expectedHash: run.sourceHash,
    label: 'Source lock'
  })
  const inputs = await assertLock({
    lockPath: `${runDir}/inputs.lock.json`,
    rowsKey: 'inputs',
    expectedHash: run.inputHash,
    label: 'Input lock'
  })
  const outputs = await assertLock({
    lockPath: `${runDir}/outputs.lock.json`,
    rowsKey: 'outputs',
    expectedHash: run.outputHash,
    label: 'Output lock',
    excludeRolesFromHash: new Set(['run-manifest'])
  })
  console.log(JSON.stringify({
    runId: run.runId,
    status: 'verified',
    sourceFiles,
    inputs,
    outputs,
    snapshotHash: run.snapshotHash,
    artifactSummary: run.artifactSummary
  }, null, 2))
}

main().catch((error) => {
  console.error(error.message || error)
  process.exitCode = 1
})
