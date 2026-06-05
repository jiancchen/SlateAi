import { execFile } from 'node:child_process'
import path from 'node:path'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)
const rootDir = path.resolve(import.meta.dirname, '..')
const dbPath = path.join(rootDir, 'data-private', 'warehouse', 'sports', 'tennis', 'sql-tennis.db')

const SURFACE_ENUM = new Set(['Clay', 'Grass', 'Hard', 'Indoor Hard', 'Carpet', 'Acrylic', 'Unknown'])

const parseArgs = () => {
  const options = { date: '', fix: false }
  const args = process.argv.slice(2)
  for (let index = 0; index < args.length; index += 1) {
    if (args[index] === '--date') {
      options.date = args[index + 1] || ''
      index += 1
    } else if (args[index] === '--fix') {
      options.fix = true
    }
  }
  if (options.date && !/^\d{4}-\d{2}-\d{2}$/.test(options.date)) throw new Error('Pass --date YYYY-MM-DD')
  return options
}

const sqlString = (value) => `'${String(value ?? '').replace(/'/g, "''")}'`

const sqliteJson = async (sql) => {
  const { stdout } = await execFileAsync('sqlite3', ['-json', dbPath, sql], {
    cwd: rootDir,
    maxBuffer: 1024 * 1024 * 20
  })
  const trimmed = stdout.trim()
  return trimmed ? JSON.parse(trimmed) : []
}

const sqliteExec = async (sql) => {
  await execFileAsync('sqlite3', [dbPath, sql], {
    cwd: rootDir,
    maxBuffer: 1024 * 1024 * 20
  })
}

const scopeWhere = (date) => date ? `where m.match_date = ${sqlString(date)}` : ''

const fixSurfaceGaps = async (date) => {
  const where = date ? `and match_date = ${sqlString(date)}` : ''
  await sqliteExec(`
    update matches
    set surface = case
      when lower(coalesce(surface, '')) in ('i. hard', 'indoor hard', 'indoor-hard') then 'Indoor Hard'
      when lower(coalesce(surface, '')) = 'clay' then 'Clay'
      when lower(coalesce(surface, '')) = 'grass' then 'Grass'
      when lower(coalesce(surface, '')) = 'hard' then 'Hard'
      when lower(coalesce(surface, '')) = 'carpet' then 'Carpet'
      when lower(coalesce(surface, '')) = 'acrylic' then 'Acrylic'
      when lower(coalesce(surface, '')) = 'unknown' then 'Unknown'
      when (
        lower(coalesce(tournament_id, '') || ' ' || coalesce(round, '') || ' ' || coalesce(source_event_id, '')) like '%roland%'
        or lower(coalesce(tournament_id, '') || ' ' || coalesce(round, '') || ' ' || coalesce(source_event_id, '')) like '%garros%'
        or lower(coalesce(tournament_id, '') || ' ' || coalesce(round, '') || ' ' || coalesce(source_event_id, '')) like '%french-open%'
        or lower(coalesce(tournament_id, '') || ' ' || coalesce(round, '') || ' ' || coalesce(source_event_id, '')) like '%paris%'
        or lower(coalesce(tournament_id, '') || ' ' || coalesce(round, '') || ' ' || coalesce(source_event_id, '')) like '%perugia%'
        or lower(coalesce(tournament_id, '') || ' ' || coalesce(round, '') || ' ' || coalesce(source_event_id, '')) like '%prostejov%'
        or lower(coalesce(tournament_id, '') || ' ' || coalesce(round, '') || ' ' || coalesce(source_event_id, '')) like '%bad-rappenau%'
        or lower(coalesce(tournament_id, '') || ' ' || coalesce(round, '') || ' ' || coalesce(source_event_id, '')) like '%heilbronn%'
        or lower(coalesce(tournament_id, '') || ' ' || coalesce(round, '') || ' ' || coalesce(source_event_id, '')) like '%neckarcup%'
        or lower(coalesce(tournament_id, '') || ' ' || coalesce(round, '') || ' ' || coalesce(source_event_id, '')) like '%foggia%'
        or lower(coalesce(tournament_id, '') || ' ' || coalesce(round, '') || ' ' || coalesce(source_event_id, '')) like '%makarska%'
        or lower(coalesce(tournament_id, '') || ' ' || coalesce(round, '') || ' ' || coalesce(source_event_id, '')) like '%geneva%'
        or lower(coalesce(tournament_id, '') || ' ' || coalesce(round, '') || ' ' || coalesce(source_event_id, '')) like '%hamburg%'
        or lower(coalesce(tournament_id, '') || ' ' || coalesce(round, '') || ' ' || coalesce(source_event_id, '')) like '%strasbourg%'
        or lower(coalesce(tournament_id, '') || ' ' || coalesce(round, '') || ' ' || coalesce(source_event_id, '')) like '%rabat%'
        or lower(coalesce(tournament_id, '') || ' ' || coalesce(round, '') || ' ' || coalesce(source_event_id, '')) like '%vicenza%'
      ) then 'Clay'
      when (
        lower(coalesce(tournament_id, '') || ' ' || coalesce(round, '') || ' ' || coalesce(source_event_id, '')) like '%birmingham%'
        or lower(coalesce(tournament_id, '') || ' ' || coalesce(round, '') || ' ' || coalesce(source_event_id, '')) like '%wimbledon%'
        or lower(coalesce(tournament_id, '') || ' ' || coalesce(round, '') || ' ' || coalesce(source_event_id, '')) like '%halle%'
        or lower(coalesce(tournament_id, '') || ' ' || coalesce(round, '') || ' ' || coalesce(source_event_id, '')) like '%queen%'
        or lower(coalesce(tournament_id, '') || ' ' || coalesce(round, '') || ' ' || coalesce(source_event_id, '')) like '%gifu%'
        or lower(coalesce(tournament_id, '') || ' ' || coalesce(round, '') || ' ' || coalesce(source_event_id, '')) like '%nottingham%'
        or lower(coalesce(tournament_id, '') || ' ' || coalesce(round, '') || ' ' || coalesce(source_event_id, '')) like '%s-hertogenbosch%'
        or lower(coalesce(tournament_id, '') || ' ' || coalesce(round, '') || ' ' || coalesce(source_event_id, '')) like '%den-bosch%'
      ) then 'Grass'
      when (
        lower(coalesce(tournament_id, '') || ' ' || coalesce(round, '') || ' ' || coalesce(source_event_id, '')) like '%centurion%'
        or lower(coalesce(tournament_id, '') || ' ' || coalesce(round, '') || ' ' || coalesce(source_event_id, '')) like '%tyler%'
        or lower(coalesce(tournament_id, '') || ' ' || coalesce(round, '') || ' ' || coalesce(source_event_id, '')) like '%little-rock%'
        or lower(coalesce(tournament_id, '') || ' ' || coalesce(round, '') || ' ' || coalesce(source_event_id, '')) like '%wuxi%'
        or lower(coalesce(tournament_id, '') || ' ' || coalesce(round, '') || ' ' || coalesce(source_event_id, '')) like '%indian-harbour%'
        or lower(coalesce(tournament_id, '') || ' ' || coalesce(round, '') || ' ' || coalesce(source_event_id, '')) like '%tokyo%'
      ) then 'Hard'
      else 'Unknown'
    end
    where (
      surface is null
      or trim(surface) = ''
      or surface not in ('Clay', 'Grass', 'Hard', 'Indoor Hard', 'Carpet', 'Acrylic', 'Unknown')
    )
    ${where}
  `)
}

const audit = async ({ date, fix }) => {
  if (fix) await fixSurfaceGaps(date)
  const where = scopeWhere(date)
  const rows = await sqliteJson(`
    select
      m.match_id,
      m.match_date,
      m.tournament_id,
      coalesce(t.name, m.tournament_id) as event_name,
      m.round,
      m.surface
    from matches m
    left join tournaments t on t.tournament_id = m.tournament_id
    ${where}
    order by m.match_date, m.match_id
  `)
  const missing = []
  const badSurface = []
  for (const row of rows) {
    const rowMissing = []
    if (!row.match_date) rowMissing.push('date')
    if (!row.tournament_id && !row.event_name) rowMissing.push('event')
    if (!row.round) rowMissing.push('event-round')
    if (!row.surface) rowMissing.push('surface')
    if (rowMissing.length) missing.push({ ...row, missing: rowMissing })
    if (row.surface && !SURFACE_ENUM.has(row.surface)) badSurface.push(row)
  }
  const surfaces = rows.reduce((acc, row) => {
    const key = row.surface || '(blank)'
    acc[key] = (acc[key] || 0) + 1
    return acc
  }, {})
  const report = {
    ok: rows.length > 0 && missing.length === 0 && badSurface.length === 0,
    date: date || 'all',
    fixed: fix,
    matchCount: rows.length,
    surfaceEnum: Array.from(SURFACE_ENUM),
    surfaces,
    missingCount: missing.length,
    badSurfaceCount: badSurface.length,
    missing: missing.slice(0, 50),
    badSurface: badSurface.slice(0, 50)
  }
  console.log(JSON.stringify(report, null, 2))
  if (!report.ok) process.exitCode = 1
}

audit(parseArgs()).catch((error) => {
  console.error(error.stack || error.message)
  process.exit(1)
})
