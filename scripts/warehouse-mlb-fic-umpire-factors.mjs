import fs from 'node:fs/promises'
import path from 'node:path'
import crypto from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const args = process.argv.slice(2)
const getArg = (name, fallback = null) => {
  const index = args.indexOf(name)
  return index >= 0 ? args[index + 1] : fallback
}

const date = getArg('--date', new Date().toISOString().slice(0, 10))
const sourceName = 'fantasyinfocentral_umpire_factors'
const sourceUrl = getArg('--url', 'https://www.fantasyinfocentral.com/mlb/umpires')
const dbPath = path.join(rootDir, 'data-private/warehouse/sports/mlb/sql-mlb.db')
const rawPath = path.join(rootDir, 'data-private/raw/fantasyinfocentral/mlb/umpires', `${date}.html`)
const artifactPath = path.join(rootDir, 'data-private/warehouse/mlb/fantasyinfocentral-umpire-factors', `${date}.json`)

const mkdirp = async (dir) => fs.mkdir(dir, { recursive: true })

const sqlQuote = (value) => {
  if (value === null || value === undefined) return 'NULL'
  return `'${String(value).replace(/'/g, "''")}'`
}

const sqliteExec = (sql) => execFileSync('sqlite3', [dbPath, sql], { encoding: 'utf8', maxBuffer: 1024 * 1024 * 80 })

const stripTags = (value = '') =>
  String(value)
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#39;|&#039;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim()

const normalizePerson = (value = '') =>
  String(value)
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

const numberOrNull = (value) => {
  const text = String(value ?? '').replace(/[^0-9.-]/g, '')
  if (!text) return null
  const parsed = Number(text)
  return Number.isFinite(parsed) ? parsed : null
}

const round = (value, digits = 1) => {
  if (!Number.isFinite(Number(value))) return null
  const power = 10 ** digits
  return Math.round(Number(value) * power) / power
}

const normalizeFavors = (value = '') => {
  const text = String(value || '').toLowerCase()
  if (text.includes('hitter')) return 'hitters'
  if (text.includes('pitcher')) return 'pitchers'
  return 'neutral'
}

const parseRows = (html, capturedAt, sourceSnapshotId) => {
  const table = html.match(/<table\b[^>]*id="searchable"[\s\S]*?<\/table>/i)?.[0] || ''
  const body = table.match(/<tbody>([\s\S]*?)<\/tbody>/i)?.[1] || table
  return [...body.matchAll(/<tr\b[\s\S]*?<\/tr>/gi)].map((match) => {
    const rowHtml = match[0]
    const cells = [...rowHtml.matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)].map((cell) => cell[1])
    if (cells.length < 12) return null
    const [
      umpireCell,
      favorsCell,
      gamesCell,
      hitsCell,
      walksCell,
      strikeoutsCell,
      visitorScoreCell,
      homeScoreCell,
      homeAdvantageCell,
      battingAvgCell,
      obpCell,
      opsCell
    ] = cells
    const umpireName = stripTags(umpireCell)
    if (!umpireName) return null
    const favors = stripTags(favorsCell)
    const visitorScorePerGame = numberOrNull(visitorScoreCell)
    const homeScorePerGame = numberOrNull(homeScoreCell)
    const totalScorePerGame =
      Number.isFinite(Number(visitorScorePerGame)) && Number.isFinite(Number(homeScorePerGame))
        ? round(Number(visitorScorePerGame) + Number(homeScorePerGame), 1)
        : null
    const row = {
      sourceDate: date,
      umpireName,
      umpireKey: normalizePerson(umpireName),
      favors,
      favorsCode: normalizeFavors(favors),
      games: numberOrNull(gamesCell),
      hitsPerGame: numberOrNull(hitsCell),
      walksPerGame: numberOrNull(walksCell),
      strikeoutsPerGame: numberOrNull(strikeoutsCell),
      visitorScorePerGame,
      homeScorePerGame,
      totalScorePerGame,
      homeAdvantageRuns: numberOrNull(homeAdvantageCell),
      battingAvg: numberOrNull(battingAvgCell),
      obp: numberOrNull(obpCell),
      ops: numberOrNull(opsCell),
      sourceSnapshotId,
      capturedAt
    }
    return {
      ...row,
      rawJson: JSON.stringify(row)
    }
  }).filter(Boolean)
}

const createTables = () => {
  sqliteExec(`
create table if not exists mlb_fic_umpire_factors_daily (
  source_date text not null,
  umpire_key text not null,
  umpire_name text not null,
  favors text,
  favors_code text,
  games integer,
  hits_per_game real,
  walks_per_game real,
  strikeouts_per_game real,
  visitor_score_per_game real,
  home_score_per_game real,
  total_score_per_game real,
  home_advantage_runs real,
  batting_avg real,
  obp real,
  ops real,
  source_snapshot_id text,
  captured_at text,
  raw_json text,
  primary key (source_date, umpire_key)
);
create index if not exists idx_mlb_fic_umpire_factors_date on mlb_fic_umpire_factors_daily(source_date, favors_code);
delete from mlb_fic_umpire_factors_daily where source_date = ${sqlQuote(date)};
`)
}

const insertRows = (rows) => {
  if (!rows.length) return
  const values = rows.map((row) => `(
    ${sqlQuote(row.sourceDate)}, ${sqlQuote(row.umpireKey)}, ${sqlQuote(row.umpireName)}, ${sqlQuote(row.favors)},
    ${sqlQuote(row.favorsCode)}, ${sqlQuote(row.games)}, ${sqlQuote(row.hitsPerGame)}, ${sqlQuote(row.walksPerGame)},
    ${sqlQuote(row.strikeoutsPerGame)}, ${sqlQuote(row.visitorScorePerGame)}, ${sqlQuote(row.homeScorePerGame)},
    ${sqlQuote(row.totalScorePerGame)}, ${sqlQuote(row.homeAdvantageRuns)}, ${sqlQuote(row.battingAvg)},
    ${sqlQuote(row.obp)}, ${sqlQuote(row.ops)}, ${sqlQuote(row.sourceSnapshotId)}, ${sqlQuote(row.capturedAt)},
    ${sqlQuote(row.rawJson)}
  )`).join(',\n')
  sqliteExec(`insert or replace into mlb_fic_umpire_factors_daily (
    source_date, umpire_key, umpire_name, favors, favors_code, games, hits_per_game, walks_per_game,
    strikeouts_per_game, visitor_score_per_game, home_score_per_game, total_score_per_game,
    home_advantage_runs, batting_avg, obp, ops, source_snapshot_id, captured_at, raw_json
  ) values ${values};`)
}

const writeSourceStatus = ({ startedAt, finishedAt, contentHash, sourceSnapshotId, rows }) => {
  const notes = JSON.stringify({
    artifactPath: path.relative(rootDir, artifactPath),
    rawPath: path.relative(rootDir, rawPath),
    rowCount: rows.length,
    favorites: {
      hitters: rows.filter((row) => row.favorsCode === 'hitters').length,
      pitchers: rows.filter((row) => row.favorsCode === 'pitchers').length,
      neutral: rows.filter((row) => row.favorsCode === 'neutral').length
    }
  })
  sqliteExec(`
insert or replace into source_snapshots (
  source_snapshot_id, source_name, sport, source_url, local_path, captured_at, source_date, content_hash, content_type, status, notes
) values (
  ${sqlQuote(sourceSnapshotId)}, ${sqlQuote(sourceName)}, 'mlb', ${sqlQuote(sourceUrl)}, ${sqlQuote(path.relative(rootDir, rawPath))},
  ${sqlQuote(finishedAt)}, ${sqlQuote(date)}, ${sqlQuote(contentHash)}, 'text/html', 'captured', ${sqlQuote(notes)}
);
insert or replace into source_fetch_runs (
  source_fetch_run_id, sport, source_name, source_family, source_date, run_reason, requested_url,
  cache_status, cache_ttl_hours, previous_success_at, status, completeness_status, expected_item_count,
  actual_item_count, missing_item_count, source_snapshot_id, started_at, finished_at, error_code, error_message, details_json
) values (
  ${sqlQuote(sourceSnapshotId)}, 'mlb', ${sqlQuote(sourceName)}, 'umpire-factor-profile', ${sqlQuote(date)},
  'daily-umpire-factor-profile-warehouse', ${sqlQuote(sourceUrl)}, 'network', null, null, 'success', 'complete',
  ${rows.length}, ${rows.length}, 0, ${sqlQuote(sourceSnapshotId)}, ${sqlQuote(startedAt)}, ${sqlQuote(finishedAt)},
  null, null, ${sqlQuote(notes)}
);
insert or replace into source_fetch_status (
  source_fetch_status_id, sport, source_name, source_family, source_date, last_fetch_run_id,
  last_attempt_at, last_success_at, last_status, last_completeness_status, cache_valid_until,
  expected_item_count, actual_item_count, missing_item_count, unresolved_count, updated_at, notes
) values (
  ${sqlQuote(`mlb-${sourceName}-${date}`)}, 'mlb', ${sqlQuote(sourceName)}, 'umpire-factor-profile', ${sqlQuote(date)},
  ${sqlQuote(sourceSnapshotId)}, ${sqlQuote(startedAt)}, ${sqlQuote(finishedAt)}, 'success', 'complete',
  null, ${rows.length}, ${rows.length}, 0, 0, ${sqlQuote(finishedAt)}, ${sqlQuote(notes)}
);
`)
}

const main = async () => {
  const startedAt = new Date().toISOString()
  const response = await fetch(sourceUrl, {
    headers: {
      'user-agent': 'Mozilla/5.0 Codex MLB FIC umpire factors warehouse',
      accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
    }
  })
  if (!response.ok) throw new Error(`FantasyInfoCentral umpire factors fetch failed: ${response.status} ${response.statusText}`)
  const html = await response.text()
  const finishedAt = new Date().toISOString()
  const contentHash = crypto.createHash('sha256').update(html).digest('hex')
  const sourceSnapshotId = `mlb-fic-umpire-factors-${date}-${contentHash.slice(0, 16)}`
  const rows = parseRows(html, finishedAt, sourceSnapshotId)
  if (rows.length < 50) throw new Error(`FantasyInfoCentral umpire factor parser found only ${rows.length} rows`)

  await mkdirp(path.dirname(rawPath))
  await mkdirp(path.dirname(artifactPath))
  await fs.writeFile(rawPath, html)
  const payload = {
    schemaVersion: 1,
    source: sourceName,
    sourceUrl,
    sourceDate: date,
    capturedAt: finishedAt,
    contentHash,
    sourceSnapshotId,
    modelUse: {
      assignmentBoundary: 'This source is umpire profile/factor context, not a game assignment source. Join to game context only through an exact home-plate assignment source such as TheCapper.',
      featureBoundary: 'Use as additive scout context for run environment, walks, strikeouts, and NRFI/YRFI review after calibration; do not use it as a standalone pick promotion rule.'
    },
    rows
  }
  await fs.writeFile(artifactPath, JSON.stringify(payload, null, 2))

  createTables()
  insertRows(rows)
  writeSourceStatus({ startedAt, finishedAt, contentHash, sourceSnapshotId, rows })

  console.log(JSON.stringify({
    status: 'ok',
    date,
    rows: rows.length,
    favorites: {
      hitters: rows.filter((row) => row.favorsCode === 'hitters').length,
      pitchers: rows.filter((row) => row.favorsCode === 'pitchers').length,
      neutral: rows.filter((row) => row.favorsCode === 'neutral').length
    },
    artifactPath: path.relative(rootDir, artifactPath),
    rawPath: path.relative(rootDir, rawPath),
    examples: rows.slice(0, 8).map((row) => ({
      umpire: row.umpireName,
      favors: row.favors,
      games: row.games,
      hitsPerGame: row.hitsPerGame,
      walksPerGame: row.walksPerGame,
      strikeoutsPerGame: row.strikeoutsPerGame,
      totalScorePerGame: row.totalScorePerGame,
      ops: row.ops
    }))
  }, null, 2))
}

main().catch((error) => {
  console.error(error.stack || error.message)
  process.exit(1)
})
