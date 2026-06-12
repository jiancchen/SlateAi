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
const sourceName = 'thecapper_mlb_umpires'
const sourceUrl = getArg('--url', 'https://thecapper.io/mlb/umpires/')
const dbPath = path.join(rootDir, 'data-private/warehouse/sports/mlb/sql-mlb.db')
const rawPath = path.join(rootDir, 'data-private/raw/thecapper/mlb/umpires', `${date}.html`)
const artifactPath = path.join(rootDir, 'data-private/warehouse/mlb/thecapper-umpires', `${date}.json`)

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

const numberOrNull = (value) => {
  const text = String(value ?? '').replace(/[^0-9.-]/g, '')
  if (!text) return null
  const parsed = Number(text)
  return Number.isFinite(parsed) ? parsed : null
}

const normalizeTeam = (value = '') =>
  String(value)
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\bst\b/g, 'saint')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\bthe\b/g, ' ')
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

const splitMatchup = (matchup) => {
  const parts = String(matchup || '').split(/\s+@\s+/)
  if (parts.length !== 2) return { awayTeam: null, homeTeam: null }
  return { awayTeam: parts[0].trim(), homeTeam: parts[1].trim() }
}

const parseMetric = (cardHtml, label) => {
  const pattern = new RegExp(`${label}:<\\/span>\\s*<span[^>]*>([\\s\\S]*?)<\\/span>`, 'i')
  return stripTags(cardHtml.match(pattern)?.[1] || '')
}

const parseTodayAssignments = (html, capturedAt, sourceSnapshotId) => {
  const section = html.match(/Today's Home Plate Umpires[\s\S]*?<\/section>\s*<section[\s\S]*?Umpire Directory/i)?.[0] || ''
  const cards = [...section.matchAll(/<a\b[\s\S]*?<\/a>/gi)].map((match) => match[0])
  return cards.map((cardHtml) => {
    const matchup = stripTags(cardHtml.match(/<span class="text-xs font-medium"[^>]*>([\s\S]*?)<\/span>/i)?.[1] || '')
    if (!matchup.includes('@')) return null
    const gameTimeEt = stripTags(cardHtml.match(/<span class="text-xs"[^>]*>([\s\S]*?)<\/span>/i)?.[1] || '')
    const umpireName = stripTags(cardHtml.match(/<div class="font-heading text-base font-semibold mb-1"[^>]*>([\s\S]*?)<\/div>/i)?.[1] || '').replace(/\s*Profile\s*→\s*$/i, '').trim()
    if (!umpireName) return null
    const umpireSlug = cardHtml.match(/href="\/mlb\/umpires\/([^/]+)\//i)?.[1] || null
    const zoneText = parseMetric(cardHtml, 'Zone')
    const zoneMatch = zoneText.match(/^(.+?)\s*\(([\d.]+)x\)$/)
    const kPerGame = numberOrNull(parseMetric(cardHtml, 'K\\/game'))
    const bbPerGame = numberOrNull(parseMetric(cardHtml, 'BB\\/game'))
    const nrfiPct = numberOrNull(parseMetric(cardHtml, 'NRFI rate'))
    const sampleGames = numberOrNull(parseMetric(cardHtml, 'Sample'))
    const { awayTeam, homeTeam } = splitMatchup(matchup)
    return {
      sourceDate: date,
      matchup,
      matchupKey: `${normalizeTeam(awayTeam)}|${normalizeTeam(homeTeam)}`,
      awayTeam,
      homeTeam,
      gameTimeEt,
      umpireName,
      umpireKey: normalizePerson(umpireName),
      umpireSlug,
      hasHistoricalProfile: Boolean(umpireSlug),
      zoneLabel: zoneMatch?.[1]?.trim() || null,
      zoneFactor: numberOrNull(zoneMatch?.[2]),
      kPerGame,
      bbPerGame,
      nrfiPct,
      kFactor: null,
      sampleGames,
      season: 2026,
      sourceSnapshotId,
      capturedAt
    }
  }).filter(Boolean)
}

const parseDirectoryProfiles = (html, capturedAt, sourceSnapshotId) => {
  const table = html.match(/Umpire Directory[\s\S]*?<tbody>([\s\S]*?)<\/tbody>/i)?.[1] || ''
  return [...table.matchAll(/<tr[\s\S]*?<\/tr>/gi)].map((match) => {
    const row = match[0]
    const cells = [...row.matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)].map((cell) => cell[1])
    if (cells.length < 8) return null
    const name = stripTags(cells[0]).replace(/\bToday\b/i, '').trim()
    if (!name) return null
    const zoneCell = stripTags(cells[1])
    const zoneFactor = numberOrNull(zoneCell.match(/^[\d.]+/)?.[0])
    const zoneLabel = zoneCell.replace(/^[\d.]+\s*/, '').trim() || null
    return {
      sourceDate: date,
      umpireName: name,
      umpireKey: normalizePerson(name),
      umpireSlug: row.match(/href="\/mlb\/umpires\/([^/]+)\//i)?.[1] || null,
      todayFlag: /\bToday\b/i.test(stripTags(cells[0])),
      zoneLabel,
      zoneFactor,
      kPerGame: numberOrNull(cells[2]),
      bbPerGame: numberOrNull(cells[3]),
      nrfiPct: numberOrNull(cells[4]),
      kFactor: numberOrNull(cells[5]),
      sampleGames: numberOrNull(cells[6]),
      season: numberOrNull(cells[7]),
      sourceSnapshotId,
      capturedAt
    }
  }).filter(Boolean)
}

const readGames = () => {
  const raw = sqliteExec(`
select game_pk, game_date, away_team, home_team, status, start_time_utc
from mlb_games
where game_date between date(${sqlQuote(date)}, '-7 day') and date(${sqlQuote(date)}, '+7 day')
order by game_date, start_time_utc;
`)
  return raw.trim().split('\n').filter(Boolean).map((line) => {
    const [gamePk, gameDate, awayTeam, homeTeam, status, startTimeUtc] = line.split('|')
    return {
      gamePk: Number(gamePk),
      gameDate,
      awayTeam,
      homeTeam,
      status,
      startTimeUtc,
      matchupKey: `${normalizeTeam(awayTeam)}|${normalizeTeam(homeTeam)}`
    }
  })
}

const attachGames = (assignments, games) => assignments.map((assignment) => {
  const candidates = games.filter((game) => game.matchupKey === assignment.matchupKey)
  const exact = candidates.find((game) => game.gameDate === date)
  const fallback = exact || candidates[0] || null
  return {
    ...assignment,
    gamePk: exact?.gamePk || null,
    matchedGameDate: exact?.gameDate || null,
    matchedAwayTeam: exact?.awayTeam || null,
    matchedHomeTeam: exact?.homeTeam || null,
    matchedStatus: exact?.status || null,
    matchedStartTimeUtc: exact?.startTimeUtc || null,
    bestAvailableGamePk: fallback?.gamePk || null,
    bestAvailableGameDate: fallback?.gameDate || null,
    dateMatchStatus: exact ? 'exact' : (fallback ? 'matchup_other_date' : 'unmatched')
  }
})

const createTables = () => {
  sqliteExec(`
create table if not exists mlb_umpire_profiles_daily (
  source_date text not null,
  umpire_key text not null,
  umpire_name text not null,
  umpire_slug text,
  today_flag integer not null default 0,
  zone_label text,
  zone_factor real,
  k_per_game real,
  bb_per_game real,
  nrfi_pct real,
  k_factor real,
  sample_games integer,
  season integer,
  source_snapshot_id text,
  captured_at text,
  primary key (source_date, umpire_key)
);
create table if not exists mlb_umpire_assignments_daily (
  source_date text not null,
  matchup_key text not null,
  game_pk integer,
  matched_game_date text,
  best_available_game_pk integer,
  best_available_game_date text,
  date_match_status text not null,
  away_team text,
  home_team text,
  matchup text,
  game_time_et text,
  matched_status text,
  matched_start_time_utc text,
  umpire_key text not null,
  umpire_name text not null,
  umpire_slug text,
  has_historical_profile integer not null default 0,
  zone_label text,
  zone_factor real,
  k_per_game real,
  bb_per_game real,
  nrfi_pct real,
  k_factor real,
  sample_games integer,
  season integer,
  source_snapshot_id text,
  captured_at text,
  raw_json text,
  primary key (source_date, matchup_key, umpire_key)
);
create index if not exists idx_mlb_umpires_assignments_game on mlb_umpire_assignments_daily(game_pk);
create index if not exists idx_mlb_umpires_assignments_date on mlb_umpire_assignments_daily(source_date, date_match_status);
delete from mlb_umpire_assignments_daily where source_date = ${sqlQuote(date)};
delete from mlb_umpire_profiles_daily where source_date = ${sqlQuote(date)};
`)
}

const insertRows = (assignments, profiles) => {
  if (profiles.length) {
    const values = profiles.map((row) => `(
      ${sqlQuote(row.sourceDate)}, ${sqlQuote(row.umpireKey)}, ${sqlQuote(row.umpireName)}, ${sqlQuote(row.umpireSlug)},
      ${row.todayFlag ? 1 : 0}, ${sqlQuote(row.zoneLabel)}, ${sqlQuote(row.zoneFactor)}, ${sqlQuote(row.kPerGame)},
      ${sqlQuote(row.bbPerGame)}, ${sqlQuote(row.nrfiPct)}, ${sqlQuote(row.kFactor)}, ${sqlQuote(row.sampleGames)},
      ${sqlQuote(row.season)}, ${sqlQuote(row.sourceSnapshotId)}, ${sqlQuote(row.capturedAt)}
    )`).join(',\n')
    sqliteExec(`insert or replace into mlb_umpire_profiles_daily (
      source_date, umpire_key, umpire_name, umpire_slug, today_flag, zone_label, zone_factor,
      k_per_game, bb_per_game, nrfi_pct, k_factor, sample_games, season, source_snapshot_id, captured_at
    ) values ${values};`)
  }

  if (assignments.length) {
    const values = assignments.map((row) => `(
      ${sqlQuote(row.sourceDate)}, ${sqlQuote(row.matchupKey)}, ${sqlQuote(row.gamePk)}, ${sqlQuote(row.matchedGameDate)},
      ${sqlQuote(row.bestAvailableGamePk)}, ${sqlQuote(row.bestAvailableGameDate)}, ${sqlQuote(row.dateMatchStatus)},
      ${sqlQuote(row.awayTeam)}, ${sqlQuote(row.homeTeam)}, ${sqlQuote(row.matchup)}, ${sqlQuote(row.gameTimeEt)},
      ${sqlQuote(row.matchedStatus)}, ${sqlQuote(row.matchedStartTimeUtc)}, ${sqlQuote(row.umpireKey)}, ${sqlQuote(row.umpireName)},
      ${sqlQuote(row.umpireSlug)}, ${row.hasHistoricalProfile ? 1 : 0}, ${sqlQuote(row.zoneLabel)}, ${sqlQuote(row.zoneFactor)},
      ${sqlQuote(row.kPerGame)}, ${sqlQuote(row.bbPerGame)}, ${sqlQuote(row.nrfiPct)}, ${sqlQuote(row.kFactor)},
      ${sqlQuote(row.sampleGames)}, ${sqlQuote(row.season)}, ${sqlQuote(row.sourceSnapshotId)}, ${sqlQuote(row.capturedAt)},
      ${sqlQuote(JSON.stringify(row))}
    )`).join(',\n')
    sqliteExec(`insert or replace into mlb_umpire_assignments_daily (
      source_date, matchup_key, game_pk, matched_game_date, best_available_game_pk, best_available_game_date,
      date_match_status, away_team, home_team, matchup, game_time_et, matched_status, matched_start_time_utc,
      umpire_key, umpire_name, umpire_slug, has_historical_profile, zone_label, zone_factor, k_per_game,
      bb_per_game, nrfi_pct, k_factor, sample_games, season, source_snapshot_id, captured_at, raw_json
    ) values ${values};`)
  }
}

const writeSourceStatus = ({ capturedAt, contentHash, sourceSnapshotId, assignments, profiles }) => {
  const exactCount = assignments.filter((row) => row.dateMatchStatus === 'exact').length
  const unresolvedCount = assignments.length - exactCount
  const completeness = unresolvedCount === 0 && assignments.length > 0 ? 'complete' : 'partial'
  const notes = JSON.stringify({
    artifactPath: path.relative(rootDir, artifactPath),
    rawPath: path.relative(rootDir, rawPath),
    assignmentCount: assignments.length,
    exactGameMatches: exactCount,
    unresolvedCount,
    profileCount: profiles.length,
    warning: unresolvedCount ? 'Some TheCapper assignments did not match the requested MLB date/game exactly.' : null
  })
  sqliteExec(`
insert or replace into source_snapshots (
  source_snapshot_id, source_name, sport, source_url, local_path, captured_at, source_date, content_hash, content_type, status, notes
) values (
  ${sqlQuote(sourceSnapshotId)}, ${sqlQuote(sourceName)}, 'mlb', ${sqlQuote(sourceUrl)}, ${sqlQuote(path.relative(rootDir, rawPath))},
  ${sqlQuote(capturedAt)}, ${sqlQuote(date)}, ${sqlQuote(contentHash)}, 'text/html', 'captured', ${sqlQuote(notes)}
);
insert or replace into source_fetch_runs (
  source_fetch_run_id, sport, source_name, source_family, source_date, run_reason, requested_url,
  cache_status, cache_ttl_hours, previous_success_at, status, completeness_status, expected_item_count,
  actual_item_count, missing_item_count, source_snapshot_id, started_at, finished_at, error_code, error_message, details_json
) values (
  ${sqlQuote(sourceSnapshotId)}, 'mlb', ${sqlQuote(sourceName)}, 'umpire-context', ${sqlQuote(date)}, 'daily-umpire-warehouse',
  ${sqlQuote(sourceUrl)}, 'network', null, null, 'success', ${sqlQuote(completeness)}, ${assignments.length},
  ${exactCount}, ${unresolvedCount}, ${sqlQuote(sourceSnapshotId)}, ${sqlQuote(capturedAt)}, ${sqlQuote(capturedAt)},
  null, null, ${sqlQuote(notes)}
);
insert or replace into source_fetch_status (
  source_fetch_status_id, sport, source_name, source_family, source_date, last_fetch_run_id,
  last_attempt_at, last_success_at, last_status, last_completeness_status, cache_valid_until,
  expected_item_count, actual_item_count, missing_item_count, unresolved_count, updated_at, notes
) values (
  ${sqlQuote(`mlb-${sourceName}-${date}`)}, 'mlb', ${sqlQuote(sourceName)}, 'umpire-context', ${sqlQuote(date)},
  ${sqlQuote(sourceSnapshotId)}, ${sqlQuote(capturedAt)}, ${sqlQuote(capturedAt)}, 'success', ${sqlQuote(completeness)},
  null, ${assignments.length}, ${exactCount}, ${unresolvedCount}, ${unresolvedCount}, ${sqlQuote(capturedAt)}, ${sqlQuote(notes)}
);
`)
}

const main = async () => {
  const response = await fetch(sourceUrl, {
    headers: {
      'user-agent': 'Mozilla/5.0 Codex MLB umpire warehouse',
      accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
    }
  })
  if (!response.ok) throw new Error(`TheCapper umpire fetch failed: ${response.status} ${response.statusText}`)
  const html = await response.text()
  const capturedAt = new Date().toISOString()
  const contentHash = crypto.createHash('sha256').update(html).digest('hex')
  const sourceSnapshotId = `mlb-thecapper-umpires-${date}-${contentHash.slice(0, 16)}`
  const profiles = parseDirectoryProfiles(html, capturedAt, sourceSnapshotId)
  const assignments = attachGames(parseTodayAssignments(html, capturedAt, sourceSnapshotId), readGames())

  if (assignments.length === 0) throw new Error('TheCapper umpire parser found no assignment rows')
  if (profiles.length < assignments.filter((row) => row.hasHistoricalProfile).length) {
    throw new Error(`TheCapper profile parser found only ${profiles.length} profile rows`)
  }

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
    assignments,
    profiles
  }
  await fs.writeFile(artifactPath, JSON.stringify(payload, null, 2))

  createTables()
  insertRows(assignments, profiles)
  writeSourceStatus({ capturedAt, contentHash, sourceSnapshotId, assignments, profiles })

  const exact = assignments.filter((row) => row.dateMatchStatus === 'exact')
  const unresolved = assignments.filter((row) => row.dateMatchStatus !== 'exact')
  console.log(JSON.stringify({
    status: 'ok',
    date,
    assignments: assignments.length,
    exactGameMatches: exact.length,
    unresolved: unresolved.length,
    profiles: profiles.length,
    artifactPath: path.relative(rootDir, artifactPath),
    rawPath: path.relative(rootDir, rawPath),
    unresolvedExamples: unresolved.slice(0, 6).map((row) => ({
      matchup: row.matchup,
      umpire: row.umpireName,
      dateMatchStatus: row.dateMatchStatus,
      bestAvailableGameDate: row.bestAvailableGameDate
    })),
    exactExamples: exact.slice(0, 6).map((row) => ({
      matchup: row.matchup,
      umpire: row.umpireName,
      zone: row.zoneFactor,
      kPerGame: row.kPerGame,
      nrfiPct: row.nrfiPct
    }))
  }, null, 2))
}

main().catch((error) => {
  console.error(error.stack || error.message)
  process.exit(1)
})
