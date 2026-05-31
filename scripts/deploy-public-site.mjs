import { spawn } from 'node:child_process'
import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import fsSync from 'node:fs'
import path from 'node:path'

const root = path.resolve(import.meta.dirname, '..')
const webRoot = path.join(root, 'web')
const dataPrivateRoot = path.join(root, 'data-private')
const publishedRoot = path.join(root, 'published-data')

const argValue = (name) => {
  const prefix = `${name}=`
  const inline = process.argv.find((arg) => arg.startsWith(prefix))
  if (inline) return inline.slice(prefix.length)
  const index = process.argv.indexOf(name)
  return index >= 0 ? process.argv[index + 1] : ''
}

const hasArg = (name) => process.argv.includes(name)

const run = (label, command, args, options = {}) =>
  new Promise((resolve, reject) => {
    const output = []
    const child = spawn(command, args, {
      cwd: options.cwd ?? root,
      stdio: options.capture ? ['ignore', 'pipe', 'pipe'] : 'inherit',
      env: {
        ...process.env,
        ...(options.env ?? {})
      }
    })

    if (options.capture) {
      child.stdout.on('data', (chunk) => {
        const text = chunk.toString()
        output.push(text)
        process.stdout.write(text)
      })
      child.stderr.on('data', (chunk) => {
        const text = chunk.toString()
        output.push(text)
        process.stderr.write(text)
      })
    }

    child.on('exit', (code, signal) => {
      if (signal) {
        reject(new Error(`${label} stopped by ${signal}`))
        return
      }
      if (code) {
        reject(new Error(`${label} failed with exit code ${code}`))
        return
      }
      resolve(output.join(''))
    })
  })

const readJson = async (filePath, fallback = null) => {
  try {
    return JSON.parse(await fs.readFile(filePath, 'utf8'))
  } catch (error) {
    if (error.code === 'ENOENT') return fallback
    throw error
  }
}

const writeJson = async (filePath, payload) => {
  await fs.mkdir(path.dirname(filePath), { recursive: true })
  await fs.writeFile(filePath, `${JSON.stringify(payload, null, 2)}\n`)
}

const addDays = (isoDate, days) => {
  const [year, month, day] = isoDate.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day + days))
  return [
    date.getUTCFullYear(),
    `${date.getUTCMonth() + 1}`.padStart(2, '0'),
    `${date.getUTCDate()}`.padStart(2, '0')
  ].join('-')
}

const walkFiles = async (dir) => {
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true })
    const files = []
    for (const entry of entries) {
      if (entry.name === '.DS_Store') continue
      const child = path.join(dir, entry.name)
      if (entry.isDirectory()) files.push(...await walkFiles(child))
      else if (entry.isFile()) files.push(child)
    }
    return files
  } catch (error) {
    if (error.code === 'ENOENT') return []
    throw error
  }
}

const hashDir = async (dir) => {
  const files = (await walkFiles(dir)).sort()
  const hash = crypto.createHash('sha256')
  for (const file of files) {
    const relative = path.relative(dir, file)
    hash.update(relative)
    hash.update('\0')
    hash.update(await fs.readFile(file))
    hash.update('\0')
  }
  return {
    root: path.relative(root, dir),
    files: files.length,
    sha256: hash.digest('hex')
  }
}

const assertNoPrivateReferences = async (dirs) => {
  const leaks = []
  for (const dir of dirs) {
    const files = (await walkFiles(dir)).filter((file) => /\.(json|js|css|html|txt|svg)$/i.test(file))
    for (const file of files) {
      const text = await fs.readFile(file, 'utf8')
      if (text.includes('data-private') || text.includes('/Users/') || text.includes('TemporaryItems')) {
        leaks.push(path.relative(root, file))
      }
    }
  }
  if (leaks.length) throw new Error(`Public deploy payload contains private references: ${leaks.slice(0, 8).join(', ')}`)
}

const assertDeployShape = async ({ requestedDate }) => {
  const meta = await readJson(path.join(webRoot, 'public', 'data', 'meta.json'))
  if (!meta?.currentSlate?.id) throw new Error('web/public/data/meta.json is missing currentSlate.id')
  if (requestedDate && meta.currentSlate.id !== requestedDate) {
    throw new Error(`Current slate mismatch: expected ${requestedDate}, got ${meta.currentSlate.id}`)
  }
  if (!fsSync.existsSync(path.join(webRoot, 'vercel.json'))) throw new Error('Missing web/vercel.json')
  if (!fsSync.existsSync(path.join(webRoot, 'package.json'))) throw new Error('Missing web/package.json')
  const currentSummary = path.join(webRoot, 'public', 'data', 'current', 'summary.json')
  if (!fsSync.existsSync(currentSummary)) throw new Error('Missing web/public/data/current/summary.json')
  const currentId = meta.currentSlate.id
  const publicSlateIds = new Set((meta.slates || []).map((slate) => slate.id))
  if (!publicSlateIds.has(currentId)) throw new Error(`Public slates are missing current slate ${currentId}`)
  const nextId = addDays(currentId, 1)
  const nextPublished = fsSync.existsSync(path.join(publishedRoot, 'slates', nextId, 'summary.json'))
  if (nextPublished && !publicSlateIds.has(nextId)) {
    throw new Error(`Next generated slate ${nextId} exists but was not exported to public slates`)
  }
  const modelHistoryPath = path.join(webRoot, 'public', 'data', 'model-history', 'index.json')
  if (!fsSync.existsSync(modelHistoryPath)) throw new Error('Missing public model-history index')
  await assertNoPrivateReferences([
    path.join(webRoot, 'public', 'data'),
    path.join(webRoot, 'dist', 'data')
  ])
  return {
    meta,
    currentId,
    nextId,
    nextPublished,
    publicSlateIds: Array.from(publicSlateIds).sort()
  }
}

const parseVercelUrl = (output) => {
  const urls = String(output || '').match(/https:\/\/[^\s]+/g) || []
  return urls.find((url) => url.includes('.vercel.app')) || urls.at(-1) || null
}

const writePublishArtifacts = async ({ deployUrl, staticArtifact, preflight, dryRun }) => {
  const modelHistory = await readJson(path.join(webRoot, 'public', 'data', 'model-history', 'index.json'), [])
  const includedDates = new Set(preflight.publicSlateIds)
  const written = []
  for (const day of Array.isArray(modelHistory) ? modelHistory : []) {
    if (!includedDates.has(day.id)) continue
    for (const model of day.models || []) {
      const runId = model?.run?.runId
      if (model.sport !== 'Tennis' || !runId || !model.modelName) continue
      const publishPath = path.join(dataPrivateRoot, 'model-runs', 'tennis', model.modelName, day.id, 'publish.json')
      const payload = {
        schemaVersion: 1,
        runId,
        sport: 'tennis',
        modelId: model.modelName,
        slateDate: day.id,
        status: dryRun ? 'dry_run' : 'deployed',
        deployedAt: new Date().toISOString(),
        deploymentUrl: deployUrl,
        webRoot: 'web',
        vercelProject: await readJson(path.join(webRoot, '.vercel', 'project.json'), null),
        staticArtifact,
        publicData: {
          currentSlate: preflight.meta.currentSlate,
          slates: preflight.meta.slates,
          modelHistory: Boolean(preflight.meta.files?.modelHistory),
          nextSlateExpected: preflight.nextPublished ? preflight.nextId : null
        },
        checks: {
          rootIsWeb: true,
          currentSummaryPresent: true,
          publicModelHistoryPresent: true,
          privateReferenceScan: 'passed'
        }
      }
      if (!dryRun) await writeJson(publishPath, payload)
      written.push(path.relative(root, publishPath))
    }
  }
  return written
}

const main = async () => {
  const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm'
  const vercelCommand = process.platform === 'win32' ? 'vercel.cmd' : 'vercel'
  const requestedDate = argValue('--date')
  const extraDates = argValue('--include-dates')
  const dryRun = hasArg('--dry-run')
  const env = {
    ...(requestedDate ? { PUBLIC_SLATE_DATE: requestedDate } : {}),
    ...(extraDates ? { PUBLIC_EXTRA_SLATE_DATES: extraDates } : {})
  }

  await run('public build', npmCommand, ['run', 'build'], { env })
  const preflight = await assertDeployShape({ requestedDate })
  const staticArtifact = await hashDir(path.join(webRoot, 'dist'))
  const deployOutput = dryRun
    ? ''
    : await run('vercel production deploy', vercelCommand, ['--prod', '--force', '--yes'], { cwd: webRoot, capture: true })
  const deployUrl = dryRun ? null : parseVercelUrl(deployOutput)
  if (!dryRun && !deployUrl) throw new Error('Vercel deploy completed but no deployment URL was detected')
  const publishArtifacts = await writePublishArtifacts({ deployUrl, staticArtifact, preflight, dryRun })

  console.log(JSON.stringify({
    status: dryRun ? 'dry_run' : 'deployed',
    currentSlate: preflight.currentId,
    publicSlates: preflight.publicSlateIds,
    nextGeneratedSlate: preflight.nextPublished ? preflight.nextId : null,
    webRoot: path.relative(root, webRoot),
    deploymentUrl: deployUrl,
    staticArtifact,
    publishArtifacts
  }, null, 2))
}

main().catch((error) => {
  console.error(error.message)
  process.exit(1)
})
