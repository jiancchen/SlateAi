import { writeFile, mkdir } from 'node:fs/promises'
import path from 'node:path'
import { buildM0Snapshot, snapshotPath } from './snapshot.mjs'

const rootDir = path.resolve(import.meta.dirname, '..', '..', '..', '..')

const parseArgs = () => {
  const args = process.argv.slice(2)
  const options = { date: '' }
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index]
    if (arg === '--date') {
      options.date = args[index + 1]
      index += 1
    }
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(options.date)) throw new Error('Pass --date YYYY-MM-DD')
  return options
}

const readJson = async (relativePath) => {
  const fs = await import('node:fs/promises')
  return JSON.parse(await fs.readFile(path.resolve(rootDir, relativePath), 'utf8'))
}

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

const options = parseArgs()
const actual = await buildM0Snapshot(options)
const expectedPath = snapshotPath(options)
const expected = await readJson(expectedPath)
const diff = firstDiff(actual, expected)

if (diff) {
  const actualPath = `data-private/model-cartridges/mlb/MLB-M0/golden/${options.date}.actual.json`
  await mkdir(path.dirname(path.resolve(rootDir, actualPath)), { recursive: true })
  await writeFile(path.resolve(rootDir, actualPath), `${JSON.stringify(actual, null, 2)}\n`)
  throw new Error(`MLB-M0 snapshot mismatch for ${options.date}: ${diff}. Actual written to ${actualPath}`)
}

console.log(JSON.stringify({
  date: options.date,
  status: 'verified',
  snapshotHash: actual.snapshotHash,
  artifactSummary: actual.artifactSummary
}, null, 2))
