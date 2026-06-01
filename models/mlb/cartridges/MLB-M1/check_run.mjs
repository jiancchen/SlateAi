import fs from 'node:fs/promises'
import path from 'node:path'
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
  console.log(JSON.stringify({
    runId: run.runId,
    status: 'checked',
    sourceFiles: run.sourceFiles,
    inputs: run.inputs,
    outputs: run.outputs,
    snapshotHash: run.snapshotHash,
    artifactSummary: run.artifactSummary
  }, null, 2))
}

main().catch((error) => {
  console.error(error.message || error)
  process.exitCode = 1
})
