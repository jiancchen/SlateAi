import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

import { writeMlbSourceStatus } from './lib/mlb-source-status.mjs'

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const dbPath = path.join(rootDir, 'data-private/warehouse/sports/mlb/sql-mlb.db')
const date = process.argv.includes('--date') ? process.argv[process.argv.indexOf('--date') + 1] : '2026-06-04'
const rawDir = path.join(rootDir, 'data-private/raw/espn/mlb/player-splits', date)
const artifactPath = path.join(rootDir, 'data-private/predictions/mlb-espn-pitcher-splits', `${date}-pitcher-splits.json`)

const manualEspnIds = new Map([
  ['mlb-player-677944', '41462']
])

const battingCategoryNames = new Set([
  'byOpponentBatting',
  'byRightLeft',
  'byPosition',
  'byCount',
  'byBattingOrder',
  'bySituation',
  'byInningPitches',
  'byRestAsReliever'
])

const selectedCategories = new Set([
  'split',
  'byOpponentBatting',
  'byBreakdown',
  'byRightLeft',
  'byDayMonth',
  'byOpponent',
  'byArena',
  'byBattingOrder',
  'bySituation',
  'byInningPitches',
  'byRestAsReliever'
])

const mkdirp = (dir) => fs.mkdirSync(dir, { recursive: true })
const slugify = (value = '') =>
  String(value)
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

const sqlQuote = (value) => {
  if (value === null || value === undefined) return 'NULL'
  return `'${String(value).replace(/'/g, "''")}'`
}

const sqlite = (sql) =>
  execFileSync('sqlite3', ['-json', dbPath, sql], {
    encoding: 'utf8',
    maxBuffer: 1024 * 1024 * 60
  })

const sqliteExec = (sql) => execFileSync('sqlite3', [dbPath, sql], { encoding: 'utf8', maxBuffer: 1024 * 1024 * 60 })

const parseJsonArray = (text) => {
  const trimmed = String(text || '').trim()
  if (!trimmed) return []
  return JSON.parse(trimmed)
}

const sqliteJson = (sql) => parseJsonArray(sqlite(sql))

const readJsonIfExists = (filePath) => {
  if (!filePath || !fs.existsSync(filePath)) return null
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'))
  } catch {
    return null
  }
}

const fetchJson = async (url) => {
  const res = await fetch(url, {
    headers: {
      'user-agent': 'Mozilla/5.0 Codex MLB slate research',
      accept: 'application/json,text/plain,*/*'
    }
  })
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
  return res.json()
}

const resolveEspnId = async (pitcherName, teamName, playerId) => {
  if (manualEspnIds.has(playerId)) return { espnId: manualEspnIds.get(playerId), status: 'manual' }
  const searches = [
    await fetchJson(`https://site.api.espn.com/apis/search/v2?query=${encodeURIComponent(`${pitcherName} ${teamName} MLB`)}&limit=10`).catch(() => null),
    await fetchJson(`https://site.api.espn.com/apis/search/v2?query=${encodeURIComponent(pitcherName)}&limit=10`).catch(() => null)
  ].filter(Boolean)
  const players = searches.flatMap((search) => (search.results || []).find((entry) => entry.type === 'player')?.contents || [])
  const mlbPlayers = players.filter((player) => player.defaultLeagueSlug === 'mlb' || player.description === 'MLB')
  const normalizedName = slugify(pitcherName)
  const normalizedTeam = slugify(teamName)
  const exact =
    mlbPlayers.find((player) => slugify(player.displayName) === normalizedName && slugify(player.subtitle).includes(normalizedTeam.split('-').at(-1))) ||
    mlbPlayers.find((player) => slugify(player.displayName) === normalizedName) ||
    mlbPlayers[0]
  const espnId = String(exact?.uid || '').match(/a:(\d+)/)?.[1] || String(exact?.link?.web || '').match(/id\/(\d+)/)?.[1] || ''
  return {
    espnId,
    status: espnId ? 'search' : 'missing-espn-athlete',
    searchName: exact?.displayName || '',
    searchTeam: exact?.subtitle || '',
    searchUrl: exact?.link?.web || ''
  }
}

const objectFromStats = (labels = [], names = [], stats = []) =>
  labels.map((label, index) => ({
    label,
    name: names[index] || label,
    value: stats[index] ?? ''
  }))

const normalizeCategory = (category, rootPayload) => {
  const batting = battingCategoryNames.has(category.name) || category.extraAthleteSplitsType === 'batting'
  const labels = batting ? rootPayload.extraPlayerPageAthleteSplits?.batting?.labels || [] : rootPayload.labels || []
  const names = batting ? rootPayload.extraPlayerPageAthleteSplits?.batting?.names || [] : rootPayload.names || []
  return {
    key: category.name,
    label: category.displayName || category.name,
    statType: batting ? 'battingAllowed' : 'pitching',
    labels,
    names,
    rows: (category.splits || []).map((split) => ({
      label: split.displayName || split.name || 'Split',
      stats: objectFromStats(labels, names, split.stats || [])
    }))
  }
}

const normalizePayloadCategories = (payload = null) =>
  payload
    ? (payload.splitCategories || [])
        .filter((category) => selectedCategories.has(category.name))
        .map((category) => normalizeCategory(category, payload))
        .filter((category) => category.rows.length)
    : []

const metricValue = (row, metric) => row?.stats?.find((stat) => stat.label === metric || stat.name === metric)?.value ?? ''
const numericMetric = (row, metric) => {
  const parsed = Number(metricValue(row, metric))
  return Number.isFinite(parsed) ? parsed : null
}

const buildInsights = (categories, parkName, gameStart) => {
  const byKey = new Map(categories.map((category) => [category.key, category]))
  const breakdown = byKey.get('byBreakdown')?.rows || []
  const handed = byKey.get('byRightLeft')?.rows || []
  const inningPitches = byKey.get('byInningPitches')?.rows || []
  const stadiumRows = byKey.get('byArena')?.rows || []
  const insights = []
  const away = breakdown.find((row) => row.label === 'Away')
  const home = breakdown.find((row) => row.label === 'Home')
  const night = breakdown.find((row) => row.label === 'Night')
  const day = breakdown.find((row) => row.label === 'Day')
  const third = inningPitches.find((row) => /^3rd/.test(row.label))
  const first = inningPitches.find((row) => /^1st/.test(row.label))
  const right = handed.find((row) => /Right/.test(row.label))
  const left = handed.find((row) => /Left/.test(row.label))
  const park = stadiumRows.find((row) => slugify(row.label) === slugify(parkName))
  const isNight = /PM PT$/.test(gameStart || '') && Number(String(gameStart).split(':')[0]) >= 4

  if (third) {
    const ops = metricValue(third, 'OPS')
    const hr = metricValue(third, 'HR')
    const avg = metricValue(third, 'AVG')
    if (ops) insights.push(`Third time through: ${avg || 'n/a'} AVG / ${ops} OPS allowed${hr ? ` with ${hr} HR` : ''}.`)
  }
  if (first) {
    const ops = metricValue(first, 'OPS')
    const obp = metricValue(first, 'OBP')
    if (ops) insights.push(`First look baseline: ${obp || 'n/a'} OBP / ${ops} OPS allowed.`)
  }
  const venueRow = isNight ? night : day
  if (venueRow) insights.push(`${isNight ? 'Night' : 'Day'} split: ${metricValue(venueRow, 'ERA') || 'n/a'} ERA / ${metricValue(venueRow, 'OBA') || 'n/a'} OBA.`)
  const roadHomeRow = away || home
  if (roadHomeRow) insights.push(`${roadHomeRow.label} split: ${metricValue(roadHomeRow, 'ERA') || 'n/a'} ERA / ${metricValue(roadHomeRow, 'HR') || '0'} HR allowed.`)
  if (right || left) {
    const target = [right, left]
      .filter(Boolean)
      .sort((a, b) => (numericMetric(b, 'OPS') || 0) - (numericMetric(a, 'OPS') || 0))[0]
    if (target) insights.push(`${target.label}: ${metricValue(target, 'AVG') || 'n/a'} AVG / ${metricValue(target, 'OPS') || 'n/a'} OPS allowed.`)
  }
  if (park && park.label !== 'All Splits') {
    insights.push(`${park.label}: ${metricValue(park, 'ERA') || 'n/a'} ERA / ${metricValue(park, 'OBA') || 'n/a'} OBA in stored ESPN split.`)
  }
  return insights
}

const priorArtifact = readJsonIfExists(artifactPath)
const priorArtifactRows = new Map(
  (priorArtifact?.rows || [])
    .filter((row) => row?.sourceStatus === 'fetched' && Array.isArray(row.categories) && row.categories.length)
    .map((row) => [`${row.gameId}:${row.pitcherId}`, row])
)

let priorDbRows = new Map()

const starterPrioritySql = `
  case
    when sp.source_name = 'rotowire_primary' then 0
    when sp.source_name = 'rotowire' and lower(coalesce(sp.confirmation_status, '')) like '%primary%' then 0
    when sp.source_name = 'mlb_probables' and sp.confirmation_status = 'lineup_board_opposing_starter' then 1
    when sp.source_name = 'mlb_game_feed' and sp.confirmation_status = 'probable' then 2
    when sp.source_name = 'mlb_probables' then 3
    when sp.source_name = 'sports.db:mlb_starting_pitchers' then 4
    else 9
  end
`

const starters = sqliteJson(`
    with ranked_starters as (
      select
        sp.*,
        row_number() over (
          partition by sp.game_id, sp.team_id
          order by
            ${starterPrioritySql},
            coalesce(sp.updated_at, '') desc,
            sp.pitcher_id
        ) as starter_rank
      from starting_pitchers sp
    )
    select
      g.game_id,
      g.game_date,
      g.start_time_utc,
      g.venue_id,
      v.name as venue_name,
      away.name as away_team,
      home.name as home_team,
      t.name as pitcher_team,
      opp.name as opponent_team,
      p.name as pitcher_name,
      p.mlb_player_id,
      p.player_id,
      sp.team_id
    from ranked_starters sp
    join games g on g.game_id = sp.game_id
    join teams away on away.team_id = g.away_team_id
    join teams home on home.team_id = g.home_team_id
    join teams t on t.team_id = sp.team_id
    join teams opp on opp.team_id = case when sp.team_id = g.away_team_id then g.home_team_id else g.away_team_id end
    left join venues v on v.venue_id = g.venue_id
    join players p on p.player_id = sp.pitcher_id
    where g.game_date = ${sqlQuote(date)}
      and sp.starter_rank = 1
    order by g.start_time_utc, p.name
  `)

sqliteExec(`
  create table if not exists mlb_pitcher_espn_splits (
    snapshot_date text not null,
    game_id text not null,
    pitcher_id text not null,
    mlb_player_id integer,
    espn_athlete_id text,
    pitcher_name text not null,
    pitcher_team text,
    opponent_team text,
    venue_name text,
    source_url text,
    source_status text not null,
    categories_json text,
    insights_json text,
    fetched_at text not null,
    primary key (snapshot_date, game_id, pitcher_id)
  )
`)
priorDbRows = new Map(
  sqliteJson(`
      select *
      from mlb_pitcher_espn_splits
      where snapshot_date = ${sqlQuote(date)}
        and source_status = 'fetched'
    `).map((row) => [
    `${row.game_id}:${row.pitcher_id}`,
    {
      gameId: row.game_id,
      pitcherId: row.pitcher_id,
      espnAthleteId: row.espn_athlete_id,
      sourceUrl: row.source_url,
      categories: JSON.parse(row.categories_json || '[]'),
      insights: JSON.parse(row.insights_json || '[]'),
      fetchedAt: row.fetched_at
    }
  ])
)
sqliteExec(`delete from mlb_pitcher_espn_splits where snapshot_date = ${sqlQuote(date)}`)

mkdirp(rawDir)
mkdirp(path.dirname(artifactPath))

const fetchedAt = new Date().toISOString()
const rows = []

for (const starter of starters) {
  const resolved = await resolveEspnId(starter.pitcher_name, starter.pitcher_team, starter.player_id)
  const sourceUrl = resolved.espnId ? `https://www.espn.com/mlb/player/splits/_/id/${resolved.espnId}/${slugify(starter.pitcher_name)}` : ''
  let sourceStatus = resolved.status
  let categories = []
  let rawPath = ''
  let cacheFallback = ''
  let error = ''
  if (resolved.espnId) {
    const apiUrl = `https://site.web.api.espn.com/apis/common/v3/sports/baseball/mlb/athletes/${resolved.espnId}/splits`
    rawPath = path.join(rawDir, `${slugify(starter.pitcher_name)}-${resolved.espnId}.json`)
    try {
      const payload = await fetchJson(apiUrl)
      categories = normalizePayloadCategories(payload)
      if (categories.length) fs.writeFileSync(rawPath, `${JSON.stringify(payload, null, 2)}\n`)
      sourceStatus = categories.length ? 'fetched' : 'empty-splits'
      if (!categories.length) error = 'empty ESPN splits payload'
    } catch (err) {
      sourceStatus = 'fetch-error'
      error = err.message
    }
    if (!categories.length) {
      const cachedPayload = readJsonIfExists(rawPath)
      const cachedCategories = normalizePayloadCategories(cachedPayload)
      if (cachedCategories.length) {
        categories = cachedCategories
        sourceStatus = 'fetched'
        cacheFallback = error ? 'raw-cache-after-fetch-error' : 'raw-cache-after-empty-splits'
      }
    }
    if (!categories.length) {
      const priorKey = `${starter.game_id}:${starter.player_id}`
      const priorRow = priorArtifactRows.get(priorKey) || priorDbRows.get(priorKey)
      if (Array.isArray(priorRow?.categories) && priorRow.categories.length) {
        categories = priorRow.categories
        sourceStatus = 'fetched'
        cacheFallback = priorArtifactRows.has(priorKey) ? 'artifact-cache-after-fetch-error' : 'db-cache-after-fetch-error'
      }
    }
  }
  const insights = buildInsights(categories, starter.venue_name, '')
  const row = {
    snapshotDate: date,
    gameId: starter.game_id,
    pitcherId: starter.player_id,
    mlbPlayerId: starter.mlb_player_id,
    espnAthleteId: resolved.espnId || '',
    pitcherName: starter.pitcher_name,
    pitcherTeam: starter.pitcher_team,
    opponentTeam: starter.opponent_team,
    venueName: starter.venue_name || '',
    sourceUrl,
    sourceStatus,
    categories,
    insights,
    rawPath: rawPath ? path.relative(rootDir, rawPath) : '',
    cacheFallback,
    resolved,
    error,
    fetchedAt
  }
  rows.push(row)
  sqliteExec(`
    insert into mlb_pitcher_espn_splits (
      snapshot_date, game_id, pitcher_id, mlb_player_id, espn_athlete_id, pitcher_name, pitcher_team,
      opponent_team, venue_name, source_url, source_status, categories_json, insights_json, fetched_at
    ) values (
      ${sqlQuote(row.snapshotDate)}, ${sqlQuote(row.gameId)}, ${sqlQuote(row.pitcherId)}, ${Number(row.mlbPlayerId) || 'NULL'},
      ${sqlQuote(row.espnAthleteId)}, ${sqlQuote(row.pitcherName)}, ${sqlQuote(row.pitcherTeam)}, ${sqlQuote(row.opponentTeam)},
      ${sqlQuote(row.venueName)}, ${sqlQuote(row.sourceUrl)}, ${sqlQuote(row.sourceStatus)},
      ${sqlQuote(JSON.stringify(row.categories))}, ${sqlQuote(JSON.stringify(row.insights))}, ${sqlQuote(row.fetchedAt)}
    )
    on conflict(snapshot_date, game_id, pitcher_id) do update set
      mlb_player_id = excluded.mlb_player_id,
      espn_athlete_id = excluded.espn_athlete_id,
      pitcher_name = excluded.pitcher_name,
      pitcher_team = excluded.pitcher_team,
      opponent_team = excluded.opponent_team,
      venue_name = excluded.venue_name,
      source_url = excluded.source_url,
      source_status = excluded.source_status,
      categories_json = excluded.categories_json,
      insights_json = excluded.insights_json,
      fetched_at = excluded.fetched_at
  `)
  console.log(`${starter.pitcher_name}: ${sourceStatus}${resolved.espnId ? ` (${resolved.espnId})` : ''}`)
}

fs.writeFileSync(
  artifactPath,
  `${JSON.stringify(
    {
      date,
      source: 'ESPN player splits API',
      fetchedAt,
      totalStarters: rows.length,
      fetchedStarters: rows.filter((row) => row.sourceStatus === 'fetched').length,
      rows
    },
    null,
    2
  )}\n`
)

const statusCounts = rows.reduce((acc, row) => {
  const key = row.sourceStatus || 'unknown'
  acc[key] = (acc[key] || 0) + 1
  return acc
}, {})
const fetchedStarters = rows.filter((row) => row.sourceStatus === 'fetched').length
const missingStarters = Math.max(rows.length - fetchedStarters, 0)
writeMlbSourceStatus({
  dbPath,
  sourceName: 'espn_pitcher_splits',
  sourceFamily: 'pitcher-splits',
  sourceDate: date,
  runReason: 'daily-espn-pitcher-splits-warehouse',
  requestedUrl: 'https://site.web.api.espn.com/apis/common/v3/sports/baseball/mlb/athletes/{espnId}/splits',
  cacheStatus: 'network',
  cacheTtlHours: 12,
  status: fetchedStarters > 0 ? 'success' : 'missing',
  completenessStatus: missingStarters > 0 ? (fetchedStarters > 0 ? 'partial' : 'missing') : 'complete',
  expectedItemCount: rows.length,
  actualItemCount: fetchedStarters,
  missingItemCount: missingStarters,
  unresolvedCount: missingStarters,
  startedAt: fetchedAt,
  finishedAt: new Date().toISOString(),
  notes: {
    artifactPath: path.relative(rootDir, artifactPath),
    totalStarters: rows.length,
    fetchedStarters,
    statusCounts
  }
})

console.log(`wrote ${path.relative(rootDir, artifactPath)}`)
