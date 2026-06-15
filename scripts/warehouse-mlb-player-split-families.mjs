import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

import { writeMlbSourceStatus } from './lib/mlb-source-status.mjs'

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const dbPath = path.join(rootDir, 'data-private/warehouse/sports/mlb/sql-mlb.db')
const reportsRoot = path.join(rootDir, 'data-migration/reports')

const argValue = (name, fallback = '') => {
  const prefix = `${name}=`
  const inline = process.argv.find((arg) => arg.startsWith(prefix))
  if (inline) return inline.slice(prefix.length)
  const index = process.argv.indexOf(name)
  return index >= 0 ? process.argv[index + 1] || fallback : fallback
}

const date = argValue('--date')
const lineupPath = argValue('--lineup-file', date ? path.join(rootDir, 'data-private/lineups/mlb', `${date}-lineup-board.json`) : '')

if (!date) {
  throw new Error('Usage: node scripts/warehouse-mlb-player-split-families.mjs --date YYYY-MM-DD [--lineup-file path]')
}

const mkdirp = (dir) => fs.mkdirSync(dir, { recursive: true })
const sqlQuote = (value) => {
  if (value === null || value === undefined) return 'NULL'
  return `'${String(value).replace(/'/g, "''")}'`
}
const sqlite = (sql) =>
  execFileSync('sqlite3', ['-json', dbPath, sql], {
    encoding: 'utf8',
    maxBuffer: 1024 * 1024 * 80
  })
const sqliteExec = (sql) =>
  execFileSync('sqlite3', [dbPath, sql], {
    encoding: 'utf8',
    maxBuffer: 1024 * 1024 * 80
  })

const num = (value, fallback = null) => {
  if (value === null || value === undefined || value === '') return fallback
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}
const intOrNull = (value) => {
  const parsed = num(value, null)
  return Number.isFinite(parsed) ? Math.trunc(parsed) : null
}
const sqlNum = (value) => (Number.isFinite(Number(value)) ? String(Number(value)) : 'NULL')
const cleanKey = (value = '') =>
  String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')

const readJson = (filePath) => JSON.parse(fs.readFileSync(filePath, 'utf8'))

const statValue = (row = {}, labels = []) => {
  const wanted = Array.isArray(labels) ? labels : [labels]
  const stats = Array.isArray(row.stats) ? row.stats : []
  const found = stats.find((stat) => wanted.includes(stat.label) || wanted.includes(stat.name))
  return found?.value ?? null
}

const sourcePayload = (payload = {}) => sqlQuote(JSON.stringify(payload))

const createTable = () => {
  sqliteExec(`
    create table if not exists mlb_player_split_family_snapshots (
      snapshot_date text not null,
      season integer,
      game_id text not null,
      game_title text,
      team_role text,
      team_name text,
      opponent_team text,
      player_role text not null,
      player_id text not null,
      mlb_player_id integer,
      espn_athlete_id text,
      player_name text not null,
      handedness text,
      batting_order integer,
      split_family text not null,
      split_key text not null,
      split_label text,
      source_name text not null,
      source_status text not null,
      plate_appearances integer,
      at_bats integer,
      innings_pitched real,
      games integer,
      games_started integer,
      runs integer,
      hits integer,
      doubles integer,
      triples integer,
      home_runs integer,
      rbi integer,
      walks integer,
      strikeouts integer,
      earned_runs integer,
      batting_average real,
      on_base_percentage real,
      slugging_percentage real,
      ops real,
      opponent_batting_average real,
      era real,
      whip real,
      home_run_rate real,
      walk_rate real,
      strikeout_rate real,
      source_url text,
      fetched_at text not null,
      raw_json text,
      primary key (
        snapshot_date,
        game_id,
        player_role,
        player_id,
        split_family,
        split_key,
        source_name
      )
    )
  `)
  sqliteExec(`
    create index if not exists idx_mlb_player_split_family_date_role
      on mlb_player_split_family_snapshots(snapshot_date, player_role, split_family, split_key)
  `)
  sqliteExec(`
    create index if not exists idx_mlb_player_split_family_player
      on mlb_player_split_family_snapshots(player_role, player_id, split_family, split_key)
  `)
}

const insertRow = (row) => {
  sqliteExec(`
    insert into mlb_player_split_family_snapshots (
      snapshot_date, season, game_id, game_title, team_role, team_name, opponent_team,
      player_role, player_id, mlb_player_id, espn_athlete_id, player_name, handedness,
      batting_order, split_family, split_key, split_label, source_name, source_status,
      plate_appearances, at_bats, innings_pitched, games, games_started, runs, hits,
      doubles, triples, home_runs, rbi, walks, strikeouts, earned_runs, batting_average,
      on_base_percentage, slugging_percentage, ops, opponent_batting_average, era, whip,
      home_run_rate, walk_rate, strikeout_rate, source_url, fetched_at, raw_json
    ) values (
      ${sqlQuote(row.snapshotDate)}, ${sqlNum(row.season)}, ${sqlQuote(row.gameId)}, ${sqlQuote(row.gameTitle)},
      ${sqlQuote(row.teamRole)}, ${sqlQuote(row.teamName)}, ${sqlQuote(row.opponentTeam)},
      ${sqlQuote(row.playerRole)}, ${sqlQuote(row.playerId)}, ${sqlNum(row.mlbPlayerId)}, ${sqlQuote(row.espnAthleteId)},
      ${sqlQuote(row.playerName)}, ${sqlQuote(row.handedness)}, ${sqlNum(row.battingOrder)},
      ${sqlQuote(row.splitFamily)}, ${sqlQuote(row.splitKey)}, ${sqlQuote(row.splitLabel)},
      ${sqlQuote(row.sourceName)}, ${sqlQuote(row.sourceStatus)}, ${sqlNum(row.plateAppearances)},
      ${sqlNum(row.atBats)}, ${sqlNum(row.inningsPitched)}, ${sqlNum(row.games)}, ${sqlNum(row.gamesStarted)},
      ${sqlNum(row.runs)}, ${sqlNum(row.hits)}, ${sqlNum(row.doubles)}, ${sqlNum(row.triples)},
      ${sqlNum(row.homeRuns)}, ${sqlNum(row.rbi)}, ${sqlNum(row.walks)}, ${sqlNum(row.strikeouts)},
      ${sqlNum(row.earnedRuns)}, ${sqlNum(row.battingAverage)}, ${sqlNum(row.onBasePercentage)},
      ${sqlNum(row.sluggingPercentage)}, ${sqlNum(row.ops)}, ${sqlNum(row.opponentBattingAverage)},
      ${sqlNum(row.era)}, ${sqlNum(row.whip)}, ${sqlNum(row.homeRunRate)}, ${sqlNum(row.walkRate)},
      ${sqlNum(row.strikeoutRate)}, ${sqlQuote(row.sourceUrl)}, ${sqlQuote(row.fetchedAt)}, ${sourcePayload(row.raw)}
    )
    on conflict(snapshot_date, game_id, player_role, player_id, split_family, split_key, source_name) do update set
      game_title=excluded.game_title,
      team_role=excluded.team_role,
      team_name=excluded.team_name,
      opponent_team=excluded.opponent_team,
      mlb_player_id=excluded.mlb_player_id,
      espn_athlete_id=excluded.espn_athlete_id,
      player_name=excluded.player_name,
      handedness=excluded.handedness,
      batting_order=excluded.batting_order,
      split_label=excluded.split_label,
      source_status=excluded.source_status,
      plate_appearances=excluded.plate_appearances,
      at_bats=excluded.at_bats,
      innings_pitched=excluded.innings_pitched,
      games=excluded.games,
      games_started=excluded.games_started,
      runs=excluded.runs,
      hits=excluded.hits,
      doubles=excluded.doubles,
      triples=excluded.triples,
      home_runs=excluded.home_runs,
      rbi=excluded.rbi,
      walks=excluded.walks,
      strikeouts=excluded.strikeouts,
      earned_runs=excluded.earned_runs,
      batting_average=excluded.batting_average,
      on_base_percentage=excluded.on_base_percentage,
      slugging_percentage=excluded.slugging_percentage,
      ops=excluded.ops,
      opponent_batting_average=excluded.opponent_batting_average,
      era=excluded.era,
      whip=excluded.whip,
      home_run_rate=excluded.home_run_rate,
      walk_rate=excluded.walk_rate,
      strikeout_rate=excluded.strikeout_rate,
      source_url=excluded.source_url,
      fetched_at=excluded.fetched_at,
      raw_json=excluded.raw_json
  `)
}

const hitterSplitRow = ({ board, teamRole, opponentTeam, player, split, splitKey, splitLabel, fetchedAt }) => ({
  snapshotDate: date,
  season: Number(date.slice(0, 4)),
  gameId: board.gameId,
  gameTitle: board.title || '',
  teamRole,
  teamName: board[teamRole]?.teamName || '',
  opponentTeam,
  playerRole: 'hitter',
  playerId: String(player.playerId || ''),
  mlbPlayerId: intOrNull(player.playerId),
  espnAthleteId: split.espnAthleteId || player.espnHitterSplits?.espnAthleteId || '',
  playerName: player.name || '',
  handedness: player.bats || '',
  battingOrder: intOrNull(player.slot),
  splitFamily: 'handedness',
  splitKey,
  splitLabel,
  sourceName: split.source || 'ESPN player splits',
  sourceStatus: split.sourceStatus || player.espnHitterSplits?.sourceStatus || 'stored',
  plateAppearances: intOrNull(split.plateAppearances),
  atBats: intOrNull(split.atBats),
  runs: intOrNull(split.runs),
  hits: intOrNull(split.hits),
  doubles: intOrNull(split.doubles),
  triples: intOrNull(split.triples),
  homeRuns: intOrNull(split.homeRuns),
  rbi: intOrNull(split.rbi),
  walks: intOrNull(split.walks),
  strikeouts: intOrNull(split.strikeouts),
  battingAverage: num(split.avg),
  onBasePercentage: num(split.obp),
  sluggingPercentage: num(split.slg),
  ops: num(split.ops),
  homeRunRate: num(split.homeRunRate),
  walkRate: num(split.walkRate),
  strikeoutRate: num(split.kRate),
  sourceUrl: split.sourceUrl || player.espnHitterSplits?.sourceUrl || '',
  fetchedAt,
  raw: { player, split, splitKey, splitLabel, source: 'lineup-board espnHitterSplits' }
})

const ingestHitterSplits = ({ fetchedAt }) => {
  if (!fs.existsSync(lineupPath)) throw new Error(`Lineup board not found: ${lineupPath}`)
  const payload = readJson(lineupPath)
  let players = 0
  let rows = 0
  for (const board of Object.values(payload.lineupBoardsByGameId || {})) {
    for (const teamRole of ['away', 'home']) {
      const teamBoard = board[teamRole] || {}
      const opponentTeam = board[teamRole === 'away' ? 'home' : 'away']?.teamName || ''
      for (const player of teamBoard.lineup || []) {
        players += 1
        const splits = player.espnHitterSplits || {}
        const pairs = [
          ['vs_lhp', 'vs LHP', splits.vsLeft],
          ['vs_rhp', 'vs RHP', splits.vsRight]
        ]
        for (const [splitKey, splitLabel, split] of pairs) {
          if (!split) continue
          insertRow(hitterSplitRow({ board, teamRole, opponentTeam, player, split, splitKey, splitLabel, fetchedAt }))
          rows += 1
        }
      }
    }
  }
  return { players, rows }
}

const pitcherFamilyKey = (categoryKey, rowLabel = '') => {
  const normalized = cleanKey(rowLabel)
  if (categoryKey === 'byRightLeft') {
    if (/right/i.test(rowLabel)) return { family: 'handedness', key: 'vs_rhb' }
    if (/left/i.test(rowLabel)) return { family: 'handedness', key: 'vs_lhb' }
  }
  if (categoryKey === 'byBreakdown') {
    if (/^day$/i.test(rowLabel)) return { family: 'day_night', key: 'day' }
    if (/^night$/i.test(rowLabel)) return { family: 'day_night', key: 'night' }
    if (/^home$/i.test(rowLabel)) return { family: 'home_away', key: 'home' }
    if (/^away$/i.test(rowLabel)) return { family: 'home_away', key: 'away' }
  }
  return { family: '', key: normalized }
}

const pitcherSplitRow = ({ pitcher, category, splitRow, family, splitKey, fetchedAt }) => {
  const statType = category.statType || ''
  const battingAllowed = statType === 'battingAllowed'
  const strikeouts = statValue(splitRow, ['SO', 'K'])
  const avg = statValue(splitRow, ['AVG'])
  const oba = statValue(splitRow, ['OBA', 'opponentAvg'])
  return {
    snapshotDate: date,
    season: Number(date.slice(0, 4)),
    gameId: pitcher.game_id,
    gameTitle: '',
    teamRole: '',
    teamName: pitcher.pitcher_team || '',
    opponentTeam: pitcher.opponent_team || '',
    playerRole: 'pitcher',
    playerId: String(pitcher.pitcher_id || ''),
    mlbPlayerId: intOrNull(pitcher.mlb_player_id),
    espnAthleteId: pitcher.espn_athlete_id || '',
    playerName: pitcher.pitcher_name || '',
    handedness: '',
    splitFamily: family,
    splitKey,
    splitLabel: splitRow.label || '',
    sourceName: 'ESPN pitcher splits',
    sourceStatus: pitcher.source_status || 'stored',
    plateAppearances: null,
    atBats: intOrNull(statValue(splitRow, ['AB'])),
    inningsPitched: num(statValue(splitRow, ['IP', 'innings'])),
    games: intOrNull(statValue(splitRow, ['GP', 'gamesPlayed'])),
    gamesStarted: intOrNull(statValue(splitRow, ['GS', 'gamesStarted'])),
    runs: intOrNull(statValue(splitRow, ['R', 'runs'])),
    hits: intOrNull(statValue(splitRow, ['H', 'hits'])),
    doubles: intOrNull(statValue(splitRow, ['2B', 'doubles'])),
    triples: intOrNull(statValue(splitRow, ['3B', 'triples'])),
    homeRuns: intOrNull(statValue(splitRow, ['HR', 'homeRuns'])),
    walks: intOrNull(statValue(splitRow, ['BB', 'walks'])),
    strikeouts: intOrNull(strikeouts),
    earnedRuns: intOrNull(statValue(splitRow, ['ER', 'earnedRuns'])),
    battingAverage: battingAllowed ? num(avg) : null,
    onBasePercentage: num(statValue(splitRow, ['OBP'])),
    sluggingPercentage: num(statValue(splitRow, ['SLG'])),
    ops: num(statValue(splitRow, ['OPS'])),
    opponentBattingAverage: num(oba ?? avg),
    era: num(statValue(splitRow, ['ERA'])),
    whip: num(statValue(splitRow, ['WHIP'])),
    sourceUrl: pitcher.source_url || '',
    fetchedAt,
    raw: { pitcher, category: { key: category.key, label: category.label, statType: category.statType }, splitRow }
  }
}

const ingestPitcherSplits = ({ fetchedAt }) => {
  const pitchers = JSON.parse(
    sqlite(`
      select *
      from mlb_pitcher_espn_splits
      where snapshot_date = ${sqlQuote(date)}
        and source_status = 'fetched'
    `)
  )
  let rows = 0
  const familyCounts = {}
  for (const pitcher of pitchers) {
    const categories = JSON.parse(pitcher.categories_json || '[]')
    for (const category of categories) {
      if (!['byRightLeft', 'byBreakdown'].includes(category.key)) continue
      for (const splitRow of category.rows || []) {
        const { family, key } = pitcherFamilyKey(category.key, splitRow.label || '')
        if (!family || !key) continue
        insertRow(pitcherSplitRow({ pitcher, category, splitRow, family, splitKey: key, fetchedAt }))
        rows += 1
        familyCounts[family] = (familyCounts[family] || 0) + 1
      }
    }
  }
  return { pitchers: pitchers.length, rows, familyCounts }
}

const main = () => {
  const fetchedAt = new Date().toISOString()
  mkdirp(reportsRoot)
  createTable()
  sqliteExec(`delete from mlb_player_split_family_snapshots where snapshot_date = ${sqlQuote(date)}`)
  const hitter = ingestHitterSplits({ fetchedAt })
  const pitcher = ingestPitcherSplits({ fetchedAt })
  const inserted = hitter.rows + pitcher.rows
  const report = {
    warehouse: 'mlb-player-split-families',
    date,
    generatedAt: new Date().toISOString(),
    table: 'mlb_player_split_family_snapshots',
    lineupPath: path.relative(rootDir, lineupPath),
    hitter,
    pitcher,
    inserted
  }
  const reportPath = path.join(reportsRoot, `warehouse_mlb_player_split_families_${date}.json`)
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`)
  writeMlbSourceStatus({
    dbPath,
    sourceName: 'mlb_player_split_families',
    sourceFamily: 'player-splits',
    sourceDate: date,
    runReason: 'daily-player-split-family-warehouse',
    requestedUrl: 'local:lineup-board+mlb_pitcher_espn_splits',
    cacheStatus: 'local',
    cacheTtlHours: 12,
    status: inserted > 0 ? 'success' : 'missing',
    completenessStatus: inserted > 0 ? 'complete' : 'missing',
    expectedItemCount: hitter.players * 2 + pitcher.pitchers * 6,
    actualItemCount: inserted,
    missingItemCount: Math.max(hitter.players * 2 + pitcher.pitchers * 6 - inserted, 0),
    unresolvedCount: Math.max(hitter.players * 2 + pitcher.pitchers * 6 - inserted, 0),
    startedAt: fetchedAt,
    finishedAt: new Date().toISOString(),
    notes: report
  })
  console.log(`[warehouse-mlb-player-split-families] inserted ${inserted} rows`)
  console.log(`[warehouse-mlb-player-split-families] report=${path.relative(rootDir, reportPath)}`)
}

main()
