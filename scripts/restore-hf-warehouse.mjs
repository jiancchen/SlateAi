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

const run = (label, command, args, options = {}) =>
  new Promise((resolve, reject) => {
    console.log(`\n==> ${label}`)
    const child = spawn(command, args, {
      cwd: options.cwd ?? root,
      stdio: 'inherit',
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

const main = async () => {
  const repo = argValue('--repo') || process.env.HF_WAREHOUSE_REPO || 'javvyai/slate-sports-warehouse'
  const date = argValue('--date') || process.env.HF_WAREHOUSE_DATE || 'latest'
  const force = hasArg('--force')
  const skipDb = hasArg('--skip-db')
  const skipRaw = hasArg('--skip-raw')
  const remotePrefix = date === 'latest' ? 'latest' : `snapshots/${date}`
  const downloadDir = path.join(root, 'data-private', 'warehouse', 'hf-restore', date)
  const dbTarget = path.join(root, 'data-private', 'warehouse', 'sports.db')
  const rawTarget = path.join(root, 'data-private', 'raw')
  const dbRemote = date === 'latest' ? 'latest/sports-latest.db.zst' : `${remotePrefix}/sports-${date}.db.zst`
  const rawRemote = date === 'latest' ? 'latest/raw-latest.tar.zst' : `${remotePrefix}/raw-${date}.tar.zst`
  const manifestRemote = `${remotePrefix}/manifest.json`

  if (!force) {
    const existingDb = await statIfExists(dbTarget)
    const existingRaw = await statIfExists(rawTarget)
    if (!skipDb && existingDb?.size) {
      throw new Error(`Refusing to overwrite ${path.relative(root, dbTarget)}. Re-run with --force.`)
    }
    if (!skipRaw && existingRaw?.isDirectory()) {
      const entries = await fs.readdir(rawTarget)
      if (entries.length) {
        throw new Error(`Refusing to overwrite non-empty ${path.relative(root, rawTarget)}. Re-run with --force.`)
      }
    }
  }

  await fs.mkdir(downloadDir, { recursive: true })
  await fs.mkdir(path.dirname(dbTarget), { recursive: true })

  const files = [manifestRemote]
  if (!skipDb) files.push(dbRemote)
  if (!skipRaw) files.push(rawRemote)

  await run('download Hugging Face warehouse artifacts', 'hf', [
    'download',
    repo,
    ...files,
    '--repo-type',
    'dataset',
    '--local-dir',
    downloadDir
  ])

  if (!skipDb) {
    const downloadedDb = path.join(downloadDir, dbRemote)
    await fs.rm(dbTarget, { force: true })
    await run('restore SQLite warehouse', 'zstd', ['-d', '-f', downloadedDb, '-o', dbTarget])
    await run('verify restored SQLite warehouse', 'sqlite3', [dbTarget, 'PRAGMA quick_check;'])
  }

  if (!skipRaw) {
    const downloadedRaw = path.join(downloadDir, rawRemote)
    if (force) {
      await fs.rm(rawTarget, { recursive: true, force: true })
    }
    await fs.mkdir(path.join(root, 'data-private'), { recursive: true })
    await run('restore raw private data', 'sh', [
      '-c',
      `zstd -dc "${downloadedRaw}" | tar -xf - -C "${path.join(root, 'data-private')}"`
    ])
  }

  console.log(`\nWarehouse restore complete from ${repo}:${remotePrefix}`)
}

main().catch((error) => {
  console.error(error.message)
  process.exit(1)
})
