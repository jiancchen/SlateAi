import { createHash } from 'node:crypto'
import { createReadStream } from 'node:fs'
import fs from 'node:fs/promises'
import path from 'node:path'
import { spawn } from 'node:child_process'

const root = path.resolve(import.meta.dirname, '..')

const argValue = (name) => {
  const prefix = `${name}=`
  const inline = process.argv.find((arg) => arg.startsWith(prefix))
  if (inline) return inline.slice(prefix.length)
  const index = process.argv.indexOf(name)
  return index >= 0 ? process.argv[index + 1] : ''
}

const hasArg = (name) => process.argv.includes(name)

const pacificDate = () => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Los_Angeles',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(new Date())
  const byType = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return `${byType.year}-${byType.month}-${byType.day}`
}

const run = (label, command, args, options = {}) =>
  new Promise((resolve, reject) => {
    console.log(`\n==> ${label}`)
    const child = spawn(command, args, {
      cwd: options.cwd ?? root,
      stdio: 'inherit',
      shell: options.shell ?? false,
      env: {
        ...process.env,
        ...(options.env ?? {})
      }
    })

    child.on('exit', (code, signal) => {
      if (signal) {
        reject(new Error(`${label} stopped by ${signal}`))
        return
      }
      if (code) {
        reject(new Error(`${label} failed with exit code ${code}`))
        return
      }
      resolve()
    })
  })

const statIfExists = async (filePath) => {
  try {
    return await fs.stat(filePath)
  } catch (error) {
    if (error.code === 'ENOENT') return null
    throw error
  }
}

const sha256File = (filePath) =>
  new Promise((resolve, reject) => {
    const hash = createHash('sha256')
    const stream = createReadStream(filePath)
    stream.on('data', (chunk) => hash.update(chunk))
    stream.on('error', reject)
    stream.on('end', () => resolve(hash.digest('hex')))
  })

const fileInfo = async (filePath) => {
  const stat = await fs.stat(filePath)
  return {
    path: path.relative(root, filePath),
    bytes: stat.size,
    sha256: await sha256File(filePath)
  }
}

const uploadArtifact = async ({ repo, localPath, remotePath, commitMessage }) => {
  await run(`upload ${remotePath}`, 'hf', [
    'upload',
    repo,
    localPath,
    remotePath,
    '--repo-type',
    'dataset',
    '--commit-message',
    commitMessage
  ])
}

const main = async () => {
  const date = argValue('--date') || process.env.HF_WAREHOUSE_DATE || pacificDate()
  const repo = argValue('--repo') || process.env.HF_WAREHOUSE_REPO || 'javvyai/slate-sports-warehouse'
  const zstdLevel = argValue('--zstd-level') || process.env.HF_WAREHOUSE_ZSTD_LEVEL || '10'
  const skipDb = hasArg('--skip-db')
  const skipRaw = hasArg('--skip-raw')
  const dbPath = path.join(root, 'data-private', 'warehouse', 'sports.db')
  const rawDir = path.join(root, 'data-private', 'raw')
  const syncDir = path.join(root, 'data-private', 'warehouse', 'hf-sync', date)
  const artifacts = []

  await fs.mkdir(syncDir, { recursive: true })

  await run('ensure private Hugging Face dataset repo', 'hf', [
    'repos',
    'create',
    repo,
    '--repo-type',
    'dataset',
    '--private',
    '--exist-ok'
  ])

  if (!skipDb) {
    const dbStat = await statIfExists(dbPath)
    if (!dbStat || dbStat.size === 0) {
      throw new Error(`Missing or empty SQLite warehouse at ${path.relative(root, dbPath)}`)
    }

    const snapshotDb = path.join(syncDir, `sports-${date}.db`)
    const compressedDb = `${snapshotDb}.zst`
    await fs.rm(snapshotDb, { force: true })
    await fs.rm(compressedDb, { force: true })

    await run('SQLite quick_check', 'sqlite3', [dbPath, 'PRAGMA quick_check;'])
    await run('SQLite backup snapshot', 'sqlite3', [dbPath, `.backup '${snapshotDb}'`])
    await run('compress SQLite snapshot', 'zstd', [
      `-${zstdLevel}`,
      '-T0',
      '-f',
      snapshotDb,
      '-o',
      compressedDb
    ])
    await fs.rm(snapshotDb, { force: true })
    artifacts.push({ localPath: compressedDb, name: path.basename(compressedDb), kind: 'sqlite' })
  }

  if (!skipRaw) {
    const rawStat = await statIfExists(rawDir)
    if (rawStat?.isDirectory()) {
      const rawArchive = path.join(syncDir, `raw-${date}.tar.zst`)
      await fs.rm(rawArchive, { force: true })
      await run(
        'archive raw private data',
        'sh',
        [
          '-c',
          `tar --exclude='.DS_Store' -cf - -C "${path.join(root, 'data-private')}" raw | zstd -${zstdLevel} -T0 -f -o "${rawArchive}"`
        ],
        { shell: false }
      )
      artifacts.push({ localPath: rawArchive, name: path.basename(rawArchive), kind: 'raw' })
    }
  }

  if (!artifacts.length) {
    throw new Error('Nothing to upload; both --skip-db and --skip-raw were used or inputs are missing.')
  }

  const manifest = {
    repo,
    date,
    createdAt: new Date().toISOString(),
    sourceHost: process.env.HOSTNAME || '',
    artifacts: await Promise.all(
      artifacts.map(async (artifact) => ({
        kind: artifact.kind,
        name: artifact.name,
        snapshotsPath: `snapshots/${date}/${artifact.name}`,
        latestPath: `latest/${artifact.name.replace(date, 'latest')}`,
        ...(await fileInfo(artifact.localPath))
      }))
    )
  }

  const manifestPath = path.join(syncDir, 'manifest.json')
  await fs.writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`)
  artifacts.push({ localPath: manifestPath, name: 'manifest.json', kind: 'manifest' })

  for (const artifact of artifacts) {
    const datedRemote = `snapshots/${date}/${artifact.name}`
    const latestName = artifact.name.replace(date, 'latest')
    const latestRemote = `latest/${latestName}`
    await uploadArtifact({
      repo,
      localPath: artifact.localPath,
      remotePath: datedRemote,
      commitMessage: `Add warehouse ${date} ${artifact.kind} artifact`
    })
    await uploadArtifact({
      repo,
      localPath: artifact.localPath,
      remotePath: latestRemote,
      commitMessage: `Update latest warehouse ${artifact.kind} artifact`
    })
  }

  console.log(`\nWarehouse sync complete: https://huggingface.co/datasets/${repo}`)
}

main().catch((error) => {
  console.error(error.message)
  process.exit(1)
})
