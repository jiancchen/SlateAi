import fs from 'node:fs/promises'
import fsSync from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { execFileSync } from 'node:child_process'

const root = path.resolve(import.meta.dirname, '..')
const publishedSlatesRoot = path.join(root, 'published-data', 'slates')

const argValue = (name) => {
  const inlinePrefix = `${name}=`
  const inline = process.argv.find((arg) => arg.startsWith(inlinePrefix))
  if (inline) return inline.slice(inlinePrefix.length)
  const index = process.argv.indexOf(name)
  return index >= 0 ? process.argv[index + 1] : ''
}

const readJson = async (filePath, fallback) => {
  try {
    return JSON.parse(await fs.readFile(filePath, 'utf8'))
  } catch (error) {
    if (fallback !== undefined && error?.code === 'ENOENT') return fallback
    throw error
  }
}

const writeJson = async (filePath, payload) => {
  await fs.mkdir(path.dirname(filePath), { recursive: true })
  await fs.writeFile(filePath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8')
}

const stableGameFileName = (game) => `${String(game.id || game.title).replace(/[^a-z0-9_-]+/gi, '-').toLowerCase()}.json`

const labelFromDate = (isoDate) => {
  const [year, month, day] = isoDate.split('-').map(Number)
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'UTC',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  }).format(new Date(Date.UTC(year, month - 1, day)))
}

const updateSlateIndex = async ({ date, label, slateMeta, totalGames }) => {
  const indexPath = path.join(publishedSlatesRoot, 'index.json')
  const index = await readJson(indexPath, [])
  const nextEntry = {
    id: date,
    label,
    status: 'ready',
    slateMeta: {
      date: slateMeta?.date || label,
      isoDate: date
    },
    summary: {
      totalGames
    }
  }
  const nextIndex = [
    ...index.filter((entry) => entry.id !== date),
    nextEntry
  ].sort((left, right) => String(left.id).localeCompare(String(right.id)))
  await writeJson(indexPath, nextIndex)
}

const main = async () => {
  const date = argValue('--date')
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error('Pass --date YYYY-MM-DD')

  const modulePath = path.join(root, 'web', 'src', 'lib', `day-${date}.js`)
  if (!fsSync.existsSync(modulePath)) throw new Error(`Missing generated day module: ${modulePath}`)

  const dayModule = await import(`${pathToFileURL(modulePath).href}?exported=${Date.now()}`)
  const games = Array.isArray(dayModule.games) ? dayModule.games : []
  if (!games.length) throw new Error(`No games exported by ${modulePath}`)

  const slateMeta = dayModule.slateMeta || { date: labelFromDate(date), isoDate: date }
  const label = slateMeta.date || labelFromDate(date)
  const slateRoot = path.join(publishedSlatesRoot, date)
  const gamesRoot = path.join(slateRoot, 'games')

  await fs.rm(gamesRoot, { recursive: true, force: true })
  await fs.mkdir(gamesRoot, { recursive: true })
  for (const game of games) {
    await writeJson(path.join(gamesRoot, stableGameFileName(game)), game)
  }

  await writeJson(path.join(slateRoot, 'summary.json'), {
    id: date,
    label,
    status: 'ready',
    slateMeta,
    summary: {
      totalGames: games.length
    },
    filters: dayModule.filters || ['All', 'Tennis'],
    oddsMeta: dayModule.oddsMeta || null,
    sources: dayModule.sources || [],
    modelCartridge: dayModule.tennisModelCartridge || slateMeta.modelCartridge || null,
    games
  })
  await updateSlateIndex({ date, label, slateMeta, totalGames: games.length })
  execFileSync('node', ['scripts/audit-tennis-active-sources.mjs', '--date', date], {
    cwd: root,
    stdio: 'inherit'
  })
  execFileSync('node', ['scripts/audit-tennis-match-contract.mjs', '--date', date], {
    cwd: root,
    stdio: 'inherit'
  })
  execFileSync('node', ['scripts/audit-tennis-warehouse-identity.mjs', '--date', date, '--allow-partial-market-context'], {
    cwd: root,
    stdio: 'inherit'
  })
  console.log(`Exported ${games.length} tennis games to published-data/slates/${date}`)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
