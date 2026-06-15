import { execFileSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

import { writeMlbSourceStatus } from '../../scripts/lib/mlb-source-status.mjs'

const __filename = fileURLToPath(import.meta.url)
const rootDir = path.resolve(path.dirname(__filename), '..', '..')
const defaultDbPath = path.join(rootDir, 'data-private', 'warehouse', 'sports', 'mlb', 'sql-mlb.db')

const argValue = (name, fallback = '') => {
  const index = process.argv.indexOf(name)
  return index >= 0 ? process.argv[index + 1] || fallback : fallback
}

const date = argValue('--date') || new Date().toISOString().slice(0, 10)
const dbPath = path.resolve(argValue('--db', defaultDbPath))
const dryRun = process.argv.includes('--dry-run')

const shortTeamNameByOfficial = {
  'Arizona Diamondbacks': 'Diamondbacks',
  Athletics: 'Athletics',
  'Atlanta Braves': 'Braves',
  'Baltimore Orioles': 'Orioles',
  'Boston Red Sox': 'Red Sox',
  'Chicago Cubs': 'Cubs',
  'Chicago White Sox': 'White Sox',
  'Cincinnati Reds': 'Reds',
  'Cleveland Guardians': 'Guardians',
  'Colorado Rockies': 'Rockies',
  'Detroit Tigers': 'Tigers',
  'Houston Astros': 'Astros',
  'Kansas City Royals': 'Royals',
  'Los Angeles Angels': 'Angels',
  'Los Angeles Dodgers': 'Dodgers',
  'Miami Marlins': 'Marlins',
  'Milwaukee Brewers': 'Brewers',
  'Minnesota Twins': 'Twins',
  'New York Mets': 'Mets',
  'New York Yankees': 'Yankees',
  'Philadelphia Phillies': 'Phillies',
  'Pittsburgh Pirates': 'Pirates',
  'San Diego Padres': 'Padres',
  'San Francisco Giants': 'Giants',
  'Seattle Mariners': 'Mariners',
  'St. Louis Cardinals': 'Cardinals',
  'Tampa Bay Rays': 'Rays',
  'Texas Rangers': 'Rangers',
  'Toronto Blue Jays': 'Blue Jays',
  'Washington Nationals': 'Nationals'
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const slugify = (value = '') =>
  String(value)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

const sqlText = (value) => {
  if (value === null || value === undefined) return 'null'
  if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  return `'${String(value).replaceAll("'", "''")}'`
}

const runSql = (sql) =>
  execFileSync('sqlite3', [dbPath, sql], {
    cwd: rootDir,
    encoding: 'utf8',
    maxBuffer: 1024 * 1024 * 20
  })

const queryJson = (sql) => {
  const raw = execFileSync('sqlite3', ['-json', '-cmd', '.timeout 30000', dbPath, sql], {
    cwd: rootDir,
    encoding: 'utf8',
    maxBuffer: 1024 * 1024 * 20
  }).trim()
  return raw ? JSON.parse(raw) : []
}

const ensureTable = () => {
  runSql(`
    create table if not exists mlb_starter_vs_team_statmuse (
      snapshot_date text not null,
      game_id text not null,
      pitcher_name text not null,
      pitcher_team text,
      opponent_team text not null,
      statmuse_url text not null,
      answer_text text,
      appearances integer,
      games_started integer,
      wins integer,
      losses integer,
      era real,
      strikeouts integer,
      innings_pitched text,
      hits_allowed integer,
      earned_runs integer,
      runs_allowed integer,
      home_runs_allowed integer,
      walks integer,
      batters_faced integer,
      total_row_json text,
      game_rows_json text,
      fetched_at text not null,
      primary key (snapshot_date, game_id, pitcher_name, opponent_team)
    );
    create index if not exists idx_mlb_starter_vs_team_statmuse_date
      on mlb_starter_vs_team_statmuse(snapshot_date, game_id);
  `)
}

const decodeHtml = (value = '') =>
  String(value)
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')

const stripTags = (value = '') =>
  decodeHtml(String(value).replace(/<[^>]*>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim()

const extractCells = (rowHtml = '') => {
  const cells = []
  const cellPattern = /<(?:td|th)\b[^>]*>([\s\S]*?)<\/(?:td|th)>/gi
  let match
  while ((match = cellPattern.exec(rowHtml))) {
    cells.push(stripTags(match[1]))
  }
  return cells
}

const parseNumber = (value) => {
  const normalized = String(value ?? '').replace(/,/g, '').trim()
  if (!normalized) return null
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : null
}

const parseMetaAnswer = (html = '') => {
  const match = html.match(/<meta name="description" content="([^"]+)"/i)
  return match ? decodeHtml(match[1]).trim() : ''
}

const parseStatmuseTable = (html = '') => {
  const rows = []
  const tableMatch = html.match(/<table\b[\s\S]*?<\/table>/i)
  if (!tableMatch) return { rows, total: null }

  const trPattern = /<tr\b[^>]*>([\s\S]*?)<\/tr>/gi
  let header = []
  let match
  while ((match = trPattern.exec(tableMatch[0]))) {
    const cells = extractCells(match[1])
    if (!cells.some(Boolean)) continue
    if (!header.length && cells.includes('NAME') && cells.includes('IP')) {
      header = cells
      continue
    }
    if (!header.length || cells.length < header.length) continue
    const offset = cells.length - header.length
    const row = {}
    header.forEach((key, index) => {
      if (key) row[key] = cells[index + offset] || ''
    })
    if (row.NAME === 'Total') rows.push({ ...row, _isTotal: true })
    else if (row.NAME) rows.push(row)
  }

  const totalIndex = rows.findIndex((row) => row._isTotal)
  const total = totalIndex >= 0 ? rows[totalIndex] : null
  const gameRows = rows.filter((row) => !row._isTotal)
  return { rows: gameRows, total }
}

const statFromTotal = (total, key) => parseNumber(total?.[key])

const recordFromAnswer = (answer = '') => {
  const match = answer.match(/\b(?:is|has(?:\s+a)?)\s+(\d+)-(\d+)\b/i)
  return match ? { wins: Number(match[1]), losses: Number(match[2]) } : { wins: null, losses: null }
}

const fetchStatmuse = async ({ pitcherName, opponentTeam }) => {
  const opponentSlug = slugify(shortTeamNameByOfficial[opponentTeam] || opponentTeam)
  const url = `https://www.statmuse.com/mlb/ask/${slugify(pitcherName)}-vs-${opponentSlug}`
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120 Safari/537.36'
    }
  })
  if (!response.ok) {
    const error = new Error(`StatMuse ${response.status} for ${url}`)
    error.status = response.status
    error.url = url
    throw error
  }
  const html = await response.text()
  const answerText = parseMetaAnswer(html)
  const { rows, total } = parseStatmuseTable(html)
  const answerRecord = recordFromAnswer(answerText)
  return {
    url,
    answerText,
    rows,
    total,
    appearances: statFromTotal(total, 'GS') || rows.length || null,
    gamesStarted: statFromTotal(total, 'GS'),
    wins: answerRecord.wins,
    losses: answerRecord.losses,
    era: statFromTotal(total, 'ERA'),
    strikeouts: statFromTotal(total, 'SO'),
    inningsPitched: total?.IP || null,
    hitsAllowed: statFromTotal(total, 'H'),
    earnedRuns: statFromTotal(total, 'ER'),
    runsAllowed: statFromTotal(total, 'R'),
    homeRunsAllowed: statFromTotal(total, 'HR'),
    walks: statFromTotal(total, 'BB'),
    battersFaced: statFromTotal(total, 'TBF')
  }
}

const loadGeneratedGames = async () => {
  const dataPath = path.join(rootDir, 'web', 'src', 'lib', `day-${date}-data.js`)
  if (!existsSync(dataPath)) return []
  const module = await import(`${pathToFileURL(dataPath).href}?t=${Date.now()}`)
  return module.rawGames || []
}

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

const loadTypedWarehouseGames = () => {
  const rows = queryJson(`
    with ranked_starters as (
      select
        sp.*,
        ${starterPrioritySql} as source_priority,
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
      g.mlb_game_pk,
      g.game_date,
      g.start_time_utc,
      g.away_team_id,
      away.name as away_team,
      g.home_team_id,
      home.name as home_team,
      sp.team_id as pitcher_team_id,
      teams.name as pitcher_team,
      players.player_id as pitcher_id,
      players.mlb_player_id,
      players.name as pitcher_name,
      players.throws,
      sp.confirmation_status,
      sp.source_name,
      sp.source_priority,
      case
        when sp.source_priority <= 1 then 'primary-bulk'
        when sp.source_name = 'mlb_game_feed' then 'mlb-listed-starter'
        else coalesce(sp.confirmation_status, 'probable')
      end as starter_role
    from games g
    join teams away on away.team_id = g.away_team_id
    join teams home on home.team_id = g.home_team_id
    left join ranked_starters sp on sp.game_id = g.game_id and sp.starter_rank = 1
    left join teams on teams.team_id = sp.team_id
    left join players on players.player_id = sp.pitcher_id
    where g.game_date = ${sqlText(date)}
    order by coalesce(g.start_time_utc, g.game_date), g.game_id, sp.team_id;
  `)
  const gamesById = new Map()
  for (const row of rows) {
    const gameId = row.game_id || (row.mlb_game_pk ? `mlb-${row.mlb_game_pk}` : '')
    if (!gameId) continue
    if (!gamesById.has(gameId)) {
      gamesById.set(gameId, {
        id: gameId,
        gamePk: row.mlb_game_pk || null,
        away: row.away_team || '',
        home: row.home_team || '',
        awayPitcher: null,
        homePitcher: null,
        source: 'typed-warehouse'
      })
    }
    if (!row.pitcher_name || !row.pitcher_team_id) continue
    const game = gamesById.get(gameId)
    const side = row.pitcher_team_id === row.away_team_id ? 'away' : row.pitcher_team_id === row.home_team_id ? 'home' : ''
    if (!side) continue
    game[`${side}Pitcher`] = {
      id: row.pitcher_id || row.mlb_player_id || null,
      mlbPlayerId: row.mlb_player_id || null,
      name: row.pitcher_name,
      fullName: row.pitcher_name,
      throws: row.throws || '',
      confirmationStatus: row.confirmation_status || '',
      probableSource: row.source_name || 'typed-db',
      starterRole: row.starter_role || ''
    }
  }
  return Array.from(gamesById.values())
}

const loadGames = async () => {
  const generatedGames = await loadGeneratedGames()
  if (generatedGames.length) return generatedGames
  return loadTypedWarehouseGames()
}

const starterRowsForGames = (games) => {
  const rows = []
  for (const game of games) {
    for (const side of ['away', 'home']) {
      const starter = game[`${side}Pitcher`] || {}
      const opponentSide = side === 'away' ? 'home' : 'away'
      const pitcherName = starter.fullName || starter.name
      const opponentTeam = game[opponentSide]
      if (!pitcherName || !opponentTeam || /^unknown$/i.test(pitcherName)) continue
      rows.push({
        gameId: game.id,
        side,
        pitcherName,
        pitcherTeam: game[side],
        opponentTeam
      })
    }
  }
  return rows
}

const insertRows = (rows) => {
  if (dryRun || !rows.length) return
  const statements = rows.map((row) => `
    insert or replace into mlb_starter_vs_team_statmuse (
      snapshot_date, game_id, pitcher_name, pitcher_team, opponent_team, statmuse_url,
      answer_text, appearances, games_started, wins, losses, era, strikeouts,
      innings_pitched, hits_allowed, earned_runs, runs_allowed, home_runs_allowed,
      walks, batters_faced, total_row_json, game_rows_json, fetched_at
    ) values (
      ${sqlText(date)}, ${sqlText(row.gameId)}, ${sqlText(row.pitcherName)}, ${sqlText(row.pitcherTeam)},
      ${sqlText(row.opponentTeam)}, ${sqlText(row.url)}, ${sqlText(row.answerText)},
      ${sqlText(row.appearances)}, ${sqlText(row.gamesStarted)}, ${sqlText(row.wins)}, ${sqlText(row.losses)},
      ${sqlText(row.era)}, ${sqlText(row.strikeouts)}, ${sqlText(row.inningsPitched)},
      ${sqlText(row.hitsAllowed)}, ${sqlText(row.earnedRuns)}, ${sqlText(row.runsAllowed)},
      ${sqlText(row.homeRunsAllowed)}, ${sqlText(row.walks)}, ${sqlText(row.battersFaced)},
      ${sqlText(JSON.stringify(row.total || null))}, ${sqlText(JSON.stringify(row.rows || []))},
      ${sqlText(row.fetchedAt)}
    );
  `)
  runSql(`begin;\n${statements.join('\n')}\ncommit;`)
}

const main = async () => {
  ensureTable()
  const starters = starterRowsForGames(await loadGames())
  const startedAt = new Date().toISOString()
  const fetched = []
  const errors = []
  const noHistory = []

  for (const [index, starter] of starters.entries()) {
    try {
      const payload = await fetchStatmuse(starter)
      fetched.push({ ...starter, ...payload, fetchedAt: new Date().toISOString() })
    } catch (error) {
      const opponentSlug = slugify(shortTeamNameByOfficial[starter.opponentTeam] || starter.opponentTeam)
      const noHistoryUrl = `https://www.statmuse.com/mlb/ask/${slugify(starter.pitcherName)}-vs-${opponentSlug}`
      const noHistoryPayload = {
        ...starter,
        status: error.status || null,
        url: error.url || noHistoryUrl,
        error: error.message
      }
      if ([404, 422].includes(Number(error.status))) {
        noHistory.push(noHistoryPayload)
      } else {
        errors.push(noHistoryPayload)
      }
      fetched.push({
        ...starter,
        url: noHistoryUrl,
        answerText: `${starter.pitcherName}: no StatMuse matchup history found vs ${starter.opponentTeam}.`,
        rows: [],
        total: null,
        appearances: 0,
        gamesStarted: 0,
        wins: null,
        losses: null,
        era: null,
        strikeouts: null,
        inningsPitched: null,
        hitsAllowed: null,
        earnedRuns: null,
        runsAllowed: null,
        homeRunsAllowed: null,
        walks: null,
        battersFaced: null,
        fetchedAt: new Date().toISOString()
      })
    }
    if (index < starters.length - 1) await sleep(350)
  }

  insertRows(fetched)
  if (!dryRun) {
    writeMlbSourceStatus({
      dbPath,
      sourceName: 'statmuse_starter_vs_team',
      sourceFamily: 'starter-history',
      sourceDate: date,
      runReason: 'daily-starter-vs-team-statmuse',
      requestedUrl: 'https://www.statmuse.com/mlb/ask/{pitcher}-vs-{opponent}',
      cacheStatus: 'network',
      cacheTtlHours: 12,
      status: errors.length ? (fetched.length ? 'partial' : 'missing') : 'success',
      completenessStatus: errors.length ? (fetched.length ? 'partial' : 'missing') : 'complete',
      expectedItemCount: starters.length,
      actualItemCount: fetched.length,
      missingItemCount: errors.length,
      unresolvedCount: errors.length,
      startedAt,
      finishedAt: new Date().toISOString(),
      notes: {
        starterCount: starters.length,
        inserted: fetched.length,
        noHistoryCount: noHistory.length,
        errorCount: errors.length
      }
    })
  }
  console.log(JSON.stringify({
    ok: errors.length === 0,
    date,
    dryRun,
    starterCount: starters.length,
    inserted: dryRun ? 0 : fetched.length,
    noHistory,
    errors
  }, null, 2))
  process.exit(errors.length ? 2 : 0)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
