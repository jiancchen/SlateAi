import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import fsSync from 'node:fs'
import path from 'node:path'

const root = path.resolve(import.meta.dirname, '..')
const reportsRoot = path.join(root, 'data-migration', 'reports')
const locksRoot = path.join(root, 'data-private', 'locks', 'mlb', 'started-games')

const argValue = (name, fallback = '') => {
  const prefix = `${name}=`
  const inline = process.argv.find((arg) => arg.startsWith(prefix))
  if (inline) return inline.slice(prefix.length)
  const index = process.argv.indexOf(name)
  return index >= 0 ? process.argv[index + 1] || fallback : fallback
}

const hasFlag = (name) => process.argv.includes(name)

const pacificDateKey = () => {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Los_Angeles',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    })
      .formatToParts(new Date())
      .map((part) => [part.type, part.value])
  )
  return `${parts.year}-${parts.month}-${parts.day}`
}

const pacificNowMinutes = () => {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Los_Angeles',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    })
      .formatToParts(new Date())
      .map((part) => [part.type, part.value])
  )
  return Number(parts.hour) * 60 + Number(parts.minute)
}

const cutoffForDate = (date) => {
  const explicit = argValue('--cutoff-minutes') || argValue('--started-cutoff-minutes')
  if (explicit !== '') return Number(explicit)
  const today = pacificDateKey()
  if (date < today) return 24 * 60
  if (date > today) return -1
  return pacificNowMinutes()
}

const readJson = async (filePath, fallback = null) => {
  try {
    return JSON.parse(await fs.readFile(filePath, 'utf8'))
  } catch (error) {
    if (error.code === 'ENOENT') return fallback
    throw error
  }
}

const canonicalize = (value) => {
  if (Array.isArray(value)) return value.map(canonicalize)
  if (!value || typeof value !== 'object') return value
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalize(value[key])]))
}

const hashJson = (value) =>
  crypto.createHash('sha256').update(JSON.stringify(canonicalize(value))).digest('hex')

const slateRootFor = (date, source = 'slate') => {
  const slateRoot = path.join(root, 'web', 'public', 'data', 'slates', date)
  if (source === 'current') return path.join(root, 'web', 'public', 'data', 'current')
  if (fsSync.existsSync(path.join(slateRoot, 'summary.json'))) return slateRoot
  return path.join(root, 'web', 'public', 'data', 'current')
}

const loadSlate = async ({ date, source }) => {
  const slateRoot = slateRootFor(date, source)
  const summary = await readJson(path.join(slateRoot, 'summary.json'), { games: [] })
  const games = []
  for (const summaryGame of summary.games || []) {
    if (summaryGame?.league !== 'MLB') continue
    const detail = await readJson(path.join(slateRoot, 'games', `${summaryGame.id}.json`), summaryGame)
    const slateDates = [summaryGame.slateDate, detail?.slateDate].filter(Boolean)
    if (slateDates.length && !slateDates.includes(date)) continue
    games.push({ summaryGame, detail })
  }
  return { slateRoot, summary, games }
}

const lockPathFor = (date) => path.join(locksRoot, `${date}.json`)

const startedGameRows = ({ games, cutoffMinutes }) =>
  games
    .filter(({ summaryGame }) => {
      const start = Number(summaryGame.startMinutes)
      return Number.isFinite(start) && start <= cutoffMinutes
    })
    .map(({ summaryGame, detail }) => ({
      gameId: summaryGame.id,
      gamePk: Number.isFinite(Number(summaryGame.gamePk)) ? Number(summaryGame.gamePk) : null,
      title: summaryGame.title || detail?.title || '',
      start: summaryGame.start || detail?.start || '',
      startMinutes: Number(summaryGame.startMinutes),
      summaryHash: hashJson(summaryGame),
      detailHash: hashJson(detail)
    }))

const writeReport = async (date, report) => {
  await fs.mkdir(reportsRoot, { recursive: true })
  const filePath = path.join(reportsRoot, `audit_mlb_started_game_locks_${date}.json`)
  await fs.writeFile(filePath, `${JSON.stringify(report, null, 2)}\n`, 'utf8')
  return filePath
}

const captureLocks = async ({ date, source, cutoffMinutes }) => {
  const slate = await loadSlate({ date, source })
  const existing = await readJson(lockPathFor(date), {
    audit: 'mlb-started-game-locks',
    date,
    locks: []
  })
  const existingById = new Map((existing.locks || []).map((row) => [row.gameId, row]))
  const capturedRows = startedGameRows({ games: slate.games, cutoffMinutes }).map((row) => ({
    ...row,
    lockedAt: new Date().toISOString(),
    source: path.relative(root, slate.slateRoot)
  }))
  for (const row of capturedRows) {
    if (!existingById.has(row.gameId)) existingById.set(row.gameId, row)
  }
  const locks = [...existingById.values()].sort((a, b) => a.startMinutes - b.startMinutes || a.gameId.localeCompare(b.gameId))
  const payload = {
    audit: 'mlb-started-game-locks',
    date,
    updatedAt: new Date().toISOString(),
    lockCount: locks.length,
    locks
  }
  await fs.mkdir(path.dirname(lockPathFor(date)), { recursive: true })
  await fs.writeFile(lockPathFor(date), `${JSON.stringify(payload, null, 2)}\n`, 'utf8')
  return { slate, payload, capturedRows }
}

const auditLocks = async ({ date, source, cutoffMinutes }) => {
  const slate = await loadSlate({ date, source })
  const lockSnapshot = await readJson(lockPathFor(date), null)
  if (!lockSnapshot) {
    return {
      slate,
      lockSnapshot: null,
      hardFailures: [{ failure: 'started-game-lock-snapshot-missing', date }],
      warnings: []
    }
  }
  const currentRows = new Map(startedGameRows({ games: slate.games, cutoffMinutes }).map((row) => [row.gameId, row]))
  const hardFailures = []
  const warnings = []
  for (const lock of lockSnapshot.locks || []) {
    const current = currentRows.get(lock.gameId)
    if (!current) {
      hardFailures.push({ failure: 'locked-started-game-missing', gameId: lock.gameId, title: lock.title })
      continue
    }
    if (current.summaryHash !== lock.summaryHash) {
      hardFailures.push({ failure: 'locked-started-game-summary-mutated', gameId: lock.gameId, title: lock.title })
    }
    if (current.detailHash !== lock.detailHash) {
      hardFailures.push({ failure: 'locked-started-game-detail-mutated', gameId: lock.gameId, title: lock.title })
    }
  }
  for (const current of currentRows.values()) {
    if (!(lockSnapshot.locks || []).some((lock) => lock.gameId === current.gameId)) {
      warnings.push({ warning: 'started-game-not-yet-locked', gameId: current.gameId, title: current.title })
    }
  }
  return { slate, lockSnapshot, hardFailures, warnings }
}

const main = async () => {
  const date = argValue('--date', pacificDateKey())
  const mode = argValue('--mode', hasFlag('--capture') ? 'capture' : hasFlag('--audit') ? 'audit' : 'audit')
  const source = argValue('--source', 'slate')
  const cutoffMinutes = cutoffForDate(date)
  if (!Number.isFinite(cutoffMinutes)) throw new Error(`Invalid cutoff minutes for ${date}`)

  let result
  if (mode === 'capture') {
    const capture = await captureLocks({ date, source, cutoffMinutes })
    result = {
      audit: 'mlb-started-game-locks',
      mode,
      date,
      source,
      generatedAt: new Date().toISOString(),
      cutoffMinutes,
      status: 'pass',
      slateSource: path.relative(root, capture.slate.slateRoot),
      capturedCount: capture.capturedRows.length,
      lockCount: capture.payload.lockCount,
      hardFailures: [],
      warnings: []
    }
  } else if (mode === 'audit') {
    const audit = await auditLocks({ date, source, cutoffMinutes })
    result = {
      audit: 'mlb-started-game-locks',
      mode,
      date,
      source,
      generatedAt: new Date().toISOString(),
      cutoffMinutes,
      status: audit.hardFailures.length ? 'fail' : 'pass',
      slateSource: path.relative(root, audit.slate.slateRoot),
      lockCount: audit.lockSnapshot?.lockCount || 0,
      hardFailures: audit.hardFailures,
      warnings: audit.warnings
    }
  } else {
    throw new Error(`Unknown --mode ${mode}; expected capture or audit`)
  }

  const reportPath = await writeReport(date, result)
  console.log(`[audit-mlb-started-game-locks] ${result.status.toUpperCase()} ${date}`)
  console.log(`[audit-mlb-started-game-locks] mode=${mode} locks=${result.lockCount} hardFailures=${result.hardFailures.length} warnings=${result.warnings.length}`)
  console.log(`[audit-mlb-started-game-locks] report=${path.relative(root, reportPath)}`)
  if (result.hardFailures.length) {
    console.error(JSON.stringify(result.hardFailures.slice(0, 40), null, 2))
    process.exitCode = 1
  }
}

main().catch((error) => {
  console.error(`[audit-mlb-started-game-locks] ${error.stack || error.message}`)
  process.exit(1)
})
