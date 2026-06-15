import fs from 'node:fs/promises'
import fsSync from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const date = process.argv.includes('--date') ? process.argv[process.argv.indexOf('--date') + 1] : new Date().toISOString().slice(0, 10)
const sourceName = 'fantasyinfocentral_daily_matchups'
const sourceBaseUrl = 'https://www.fantasyinfocentral.com/mlb/daily-matchups'
const sourceUrl = `${sourceBaseUrl}?date=${encodeURIComponent(date)}`
const dbPath = path.join(rootDir, 'data-private/warehouse/sports/mlb/sql-mlb.db')
const rawPath = path.join(rootDir, 'data-private/raw/fantasyinfocentral/mlb/daily-matchups', `${date}.html`)
const artifactPath = path.join(rootDir, 'data-private/warehouse/mlb/fantasyinfocentral-daily-matchups', `${date}.json`)
const webModulePath = path.join(rootDir, 'web/src/lib/mlb-fic-daily-matchups.generated.js')

const mkdirp = async (dir) => fs.mkdir(dir, { recursive: true })

const sqlQuote = (value) => {
  if (value === null || value === undefined) return 'NULL'
  return `'${String(value).replace(/'/g, "''")}'`
}

const sqliteExec = (sql) => execFileSync('sqlite3', ['-cmd', '.timeout 30000', dbPath, sql], { encoding: 'utf8', maxBuffer: 1024 * 1024 * 80 })

const stripTags = (value = '') =>
  String(value)
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#039;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim()

const normalizeNameToken = (value = '') =>
  String(value)
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()

const numberOrNull = (value) => {
  const text = String(value ?? '').replace(/[^0-9.-]/g, '')
  if (!text) return null
  const numeric = Number(text)
  return Number.isFinite(numeric) ? numeric : null
}

const nameParts = (abbreviatedName = '') => {
  const normalized = normalizeNameToken(abbreviatedName)
  const parts = normalized.split(/\s+/).filter(Boolean)
  const first = parts[0] || ''
  const last = parts.at(-1) || ''
  return {
    initial: first ? first[0] : '',
    lastName: last,
    key: [first, last].filter(Boolean).join(' ')
  }
}

const parseRow = (row, capturedAt, sourceSnapshotId) => {
  const cells = [...row.matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)].map((match) => match[1])
  if (cells.length < 15) return null

  const firstCell = cells[0] || ''
  const playerName =
    firstCell.match(/^\s*([^<]+?)\s*<small/i)?.[1]?.trim() ||
    stripTags(firstCell).split(/\s+(?:C|1B|2B|3B|SS|OF|DH|LF|CF|RF)\s/)[0]?.trim() ||
    ''
  if (!playerName || /^-+\s*-+$/.test(playerName)) return null

  const position = firstCell.match(/<span[^>]*class="pos"[^>]*>([^<]+)/i)?.[1]?.trim() || ''
  const batterHand = firstCell.match(/<small>[^<]*\(([LRSB])\)/i)?.[1]?.trim() || ''
  const recentOps = numberOrNull(row.match(/<span[^>]*class="tr_lbl"[^>]*>\s*OPS\s*<br\s*\/?>\s*([^<]+)/i)?.[1])
  const pitcherMatch = row.match(/<td[^>]*class="oppitcher"[^>]*>[\s\S]*?<a[^>]*>([^<]+)\s*<small>\(([LR])\)<\/small>/i)
  const pitcherName = pitcherMatch?.[1]?.trim() || ''
  const pitcherHand = pitcherMatch?.[2]?.trim() || ''
  if (!pitcherName) return null
  const textCells = cells.map(stripTags)
  const gameContext = textCells[3] || null
  const hrForce = numberOrNull(textCells[4])
  const qualityAbPct = numberOrNull(textCells[5])
  const hardHitPct = numberOrNull(textCells[6])
  const bvpAtBats = numberOrNull(textCells[7])
  const bvpHits = numberOrNull(textCells[8])
  const bvpXbhNonHr = numberOrNull(textCells[9])
  const bvpHr = numberOrNull(textCells[10])
  const bvpRbi = null
  const bvpBb = numberOrNull(textCells[11])
  const bvpAvg = numberOrNull(textCells[12])
  const bvpObp = numberOrNull(textCells[13])
  const bvpOps = numberOrNull(textCells[14])
  const matchupPass =
    Number(bvpAtBats) >= 5 &&
    Number(bvpAvg) > 0.3 &&
    Number(bvpOps) > 0.8

  const playerParts = nameParts(playerName)
  const pitcherParts = nameParts(pitcherName)

  return {
    sourceDate: date,
    playerName,
    playerKey: normalizeNameToken(playerName),
    playerInitial: playerParts.initial,
    playerLastName: playerParts.lastName,
    position,
    batterHand,
    pitcherName,
    pitcherKey: normalizeNameToken(pitcherName),
    pitcherLastName: pitcherParts.lastName,
    pitcherHand,
    recentOps,
    gameContext,
    hrForce,
    qualityAbPct,
    hardHitPct,
    bvpAtBats,
    bvpHits,
    bvpXbhNonHr,
    bvpHr,
    bvpRbi,
    bvpBb,
    bvpAvg,
    bvpObp,
    bvpOps,
    matchupPass,
    sourceSnapshotId,
    capturedAt
  }
}

const parseRows = (html, capturedAt, sourceSnapshotId) =>
  [...html.matchAll(/<tr[^>]*class="[^"]*\bdb\b[^"]*\bdmre\b[^"]*"[^>]*>[\s\S]*?<\/tr>/gi)]
    .map((match) => parseRow(match[0], capturedAt, sourceSnapshotId))
    .filter(Boolean)

const writeWebModule = async (dateKey, payload) => {
  let existing = {}
  if (fsSync.existsSync(webModulePath)) {
    const current = await fs.readFile(webModulePath, 'utf8')
    const jsonMatch = current.match(/export const mlbFicDailyMatchupsByDate = ([\s\S]*?)\n\nexport default/)
    if (jsonMatch) existing = JSON.parse(jsonMatch[1])
  }
  existing[dateKey] = payload.rows.map((row) => ({
    playerName: row.playerName,
    playerKey: row.playerKey,
    playerInitial: row.playerInitial,
    playerLastName: row.playerLastName,
    position: row.position,
    batterHand: row.batterHand,
    pitcherName: row.pitcherName,
    pitcherKey: row.pitcherKey,
    pitcherLastName: row.pitcherLastName,
    pitcherHand: row.pitcherHand,
    recentOps: row.recentOps,
    gameContext: row.gameContext,
    hrForce: row.hrForce,
    qualityAbPct: row.qualityAbPct,
    hardHitPct: row.hardHitPct,
    bvpAtBats: row.bvpAtBats,
    bvpHits: row.bvpHits,
    bvpXbhNonHr: row.bvpXbhNonHr,
    bvpHr: row.bvpHr,
    bvpRbi: row.bvpRbi,
    bvpBb: row.bvpBb,
    bvpAvg: row.bvpAvg,
    bvpObp: row.bvpObp,
    bvpOps: row.bvpOps,
    matchupPass: row.matchupPass
  }))
  const text = `// Generated by scripts/warehouse-mlb-fic-daily-matchups.mjs. Do not edit by hand.\nexport const mlbFicDailyMatchupsByDate = ${JSON.stringify(existing, null, 2)}\n\nexport default mlbFicDailyMatchupsByDate\n`
  await fs.writeFile(webModulePath, text)
}

const warehouseRows = ({ rows, capturedAt, contentHash, sourceSnapshotId }) => {
  sqliteExec(`
create table if not exists mlb_fic_daily_matchups (
  source_date text not null,
  player_name text not null,
  player_key text not null,
  player_initial text,
  player_last_name text,
  position text,
  batter_hand text,
  pitcher_name text,
  pitcher_key text,
  pitcher_last_name text,
  pitcher_hand text,
  recent_ops real,
  game_context text,
  hr_force real,
  quality_ab_pct real,
  hard_hit_pct real,
  bvp_ab integer,
  bvp_hits integer,
  bvp_xbh_non_hr integer,
  bvp_hr integer,
  bvp_rbi integer,
  bvp_bb integer,
  bvp_avg real,
  bvp_obp real,
  bvp_ops real,
  matchup_pass integer not null default 0,
  source_snapshot_id text,
  captured_at text,
  primary key (source_date, player_key, pitcher_key)
);
`)

  const existingColumns = sqliteExec(`pragma table_info(mlb_fic_daily_matchups);`)
    .trim()
    .split('\n')
    .filter(Boolean)
    .map((line) => line.split('|')[1])
  const addColumn = (name, type) => {
    if (!existingColumns.includes(name)) sqliteExec(`alter table mlb_fic_daily_matchups add column ${name} ${type};`)
  }
  addColumn('game_context', 'text')
  addColumn('hr_force', 'real')
  addColumn('quality_ab_pct', 'real')
  addColumn('hard_hit_pct', 'real')
  addColumn('bvp_xbh_non_hr', 'integer')

  sqliteExec(`delete from mlb_fic_daily_matchups where source_date = ${sqlQuote(date)};`)

  const values = rows.map((row) => `(
    ${sqlQuote(row.sourceDate)},
    ${sqlQuote(row.playerName)},
    ${sqlQuote(row.playerKey)},
    ${sqlQuote(row.playerInitial)},
    ${sqlQuote(row.playerLastName)},
    ${sqlQuote(row.position)},
    ${sqlQuote(row.batterHand)},
    ${sqlQuote(row.pitcherName)},
    ${sqlQuote(row.pitcherKey)},
    ${sqlQuote(row.pitcherLastName)},
    ${sqlQuote(row.pitcherHand)},
    ${sqlQuote(row.recentOps)},
    ${sqlQuote(row.gameContext)},
    ${sqlQuote(row.hrForce)},
    ${sqlQuote(row.qualityAbPct)},
    ${sqlQuote(row.hardHitPct)},
    ${sqlQuote(row.bvpAtBats)},
    ${sqlQuote(row.bvpHits)},
    ${sqlQuote(row.bvpXbhNonHr)},
    ${sqlQuote(row.bvpHr)},
    ${sqlQuote(row.bvpRbi)},
    ${sqlQuote(row.bvpBb)},
    ${sqlQuote(row.bvpAvg)},
    ${sqlQuote(row.bvpObp)},
    ${sqlQuote(row.bvpOps)},
    ${row.matchupPass ? 1 : 0},
    ${sqlQuote(row.sourceSnapshotId)},
    ${sqlQuote(row.capturedAt)}
  )`).join(',\n')

  if (values) {
    sqliteExec(`insert or replace into mlb_fic_daily_matchups (
      source_date, player_name, player_key, player_initial, player_last_name, position, batter_hand,
      pitcher_name, pitcher_key, pitcher_last_name, pitcher_hand, recent_ops,
      game_context, hr_force, quality_ab_pct, hard_hit_pct,
      bvp_ab, bvp_hits, bvp_xbh_non_hr, bvp_hr, bvp_rbi, bvp_bb, bvp_avg, bvp_obp, bvp_ops,
      matchup_pass, source_snapshot_id, captured_at
    ) values ${values};`)
  }

  const notes = JSON.stringify({
    artifactPath: path.relative(rootDir, artifactPath),
    rawPath: path.relative(rootDir, rawPath),
    rowCount: rows.length,
    passCount: rows.filter((row) => row.matchupPass).length
  })

  sqliteExec(`
insert or replace into source_snapshots (
  source_snapshot_id, source_name, sport, source_url, local_path, captured_at, source_date, content_hash, content_type, status, notes
) values (
  ${sqlQuote(sourceSnapshotId)},
  ${sqlQuote(sourceName)},
  'mlb',
  ${sqlQuote(sourceUrl)},
  ${sqlQuote(path.relative(rootDir, rawPath))},
  ${sqlQuote(capturedAt)},
  ${sqlQuote(date)},
  ${sqlQuote(contentHash)},
  'text/html',
  'captured',
  ${sqlQuote(notes)}
);
insert or replace into source_fetch_status (
  source_fetch_status_id, sport, source_name, source_family, source_date, last_fetch_run_id,
  last_attempt_at, last_success_at, last_status, last_completeness_status, cache_valid_until,
  expected_item_count, actual_item_count, missing_item_count, unresolved_count, updated_at, notes
) values (
  ${sqlQuote(`mlb-${sourceName}-${date}`)},
  'mlb',
  ${sqlQuote(sourceName)},
  'batter-vs-pitcher',
  ${sqlQuote(date)},
  ${sqlQuote(sourceSnapshotId)},
  ${sqlQuote(capturedAt)},
  ${sqlQuote(capturedAt)},
  'success',
  'complete',
  null,
  ${rows.length},
  ${rows.length},
  0,
  0,
  ${sqlQuote(capturedAt)},
  ${sqlQuote(notes)}
);
`)
}

const main = async () => {
  const response = await fetch(sourceUrl, {
    headers: {
      'user-agent': 'Mozilla/5.0 Codex MLB slate research',
      accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
    }
  })
  if (!response.ok) throw new Error(`FantasyInfoCentral fetch failed: ${response.status} ${response.statusText}`)
  const html = await response.text()
  const capturedAt = new Date().toISOString()
  const contentHash = crypto.createHash('sha256').update(html).digest('hex')
  const sourceSnapshotId = `mlb-fic-daily-matchups-${date}-${contentHash.slice(0, 16)}`
  const rows = parseRows(html, capturedAt, sourceSnapshotId)
  if (rows.length < 20) throw new Error(`FantasyInfoCentral parse produced only ${rows.length} rows`)

  await mkdirp(path.dirname(rawPath))
  await mkdirp(path.dirname(artifactPath))
  await fs.writeFile(rawPath, html)
  const payload = {
    schemaVersion: 1,
    source: sourceName,
    sourceUrl,
    sourceDate: date,
    capturedAt,
    contentHash,
    sourceSnapshotId,
    rule: {
      cleanHrrGate: 'BvP AB >= 5, BvP AVG > .300, BvP OPS > .800. Recent OPS, HRForce, qAB%, HH%, 2B/3B, HR, and BB are stored as context.'
    },
    rows
  }
  await fs.writeFile(artifactPath, JSON.stringify(payload, null, 2))
  warehouseRows({ rows, capturedAt, contentHash, sourceSnapshotId })
  await writeWebModule(date, payload)

  const passRows = rows.filter((row) => row.matchupPass)
  console.log(JSON.stringify({
    status: 'ok',
    date,
    rows: rows.length,
    matchupPassRows: passRows.length,
    artifactPath: path.relative(rootDir, artifactPath),
    rawPath: path.relative(rootDir, rawPath),
    webModulePath: path.relative(rootDir, webModulePath),
    examples: passRows.slice(0, 10).map((row) => ({
      player: row.playerName,
      pitcher: row.pitcherName,
      ab: row.bvpAtBats,
      hits: row.bvpHits,
      xbhNonHr: row.bvpXbhNonHr,
      hr: row.bvpHr,
      avg: row.bvpAvg,
      ops: row.bvpOps,
      recentOps: row.recentOps,
      hrForce: row.hrForce,
      qualityAbPct: row.qualityAbPct,
      hardHitPct: row.hardHitPct
    }))
  }, null, 2))
}

main().catch((error) => {
  console.error(error.stack || error.message)
  process.exit(1)
})
