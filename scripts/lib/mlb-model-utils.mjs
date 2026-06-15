import { execFileSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

export const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
export const mlbDbPath = path.join(rootDir, 'data-private/warehouse/sports/mlb/sql-mlb.db')

export const getArg = (name, fallback = null) => {
  const args = process.argv.slice(2)
  const index = args.indexOf(name)
  return index >= 0 ? args[index + 1] : fallback
}

export const hasArg = (name) => process.argv.slice(2).includes(name)

export const sqlQuote = (value) => {
  if (value === null || value === undefined) return 'NULL'
  return `'${String(value).replace(/'/g, "''")}'`
}

export const sqliteJson = (sql, dbPath = mlbDbPath) => {
  const raw = execFileSync('sqlite3', ['-json', '-cmd', '.timeout 30000', dbPath, sql], {
    encoding: 'utf8',
    maxBuffer: 1024 * 1024 * 120
  })
  return raw.trim() ? JSON.parse(raw) : []
}

export const sqliteExec = (sql, dbPath = mlbDbPath) =>
  execFileSync('sqlite3', ['-cmd', '.timeout 30000', dbPath, sql], {
    encoding: 'utf8',
    maxBuffer: 1024 * 1024 * 120
  })

export const round = (value, digits = 2) => {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return null
  const factor = 10 ** digits
  return Math.round(numeric * factor) / factor
}

export const clamp = (value, min, max) => Math.max(min, Math.min(max, value))

export const avg = (values) => {
  const numeric = values.map(Number).filter(Number.isFinite)
  return numeric.length ? numeric.reduce((sum, value) => sum + value, 0) / numeric.length : null
}

export const normalizeTeam = (value = '') =>
  String(value)
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\bst\b/g, 'saint')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\bthe\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

export const normalizePerson = (value = '') =>
  String(value)
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

export const slugify = (value = '') =>
  normalizeTeam(value)
    .replace(/\s+/g, '-')
    .replace(/^-+|-+$/g, '')

export const officialToShortTeam = {
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

export const shortToOfficialTeam = Object.fromEntries(
  Object.entries(officialToShortTeam).map(([official, short]) => [short, official])
)

export const shortTeamName = (name = '') => officialToShortTeam[name] || name

export const canonicalTeamName = (value = '') => {
  const normalized = normalizeTeam(value)
  const directOfficial = Object.keys(officialToShortTeam).find((team) => normalizeTeam(team) === normalized)
  if (directOfficial) return directOfficial
  const short = Object.entries(officialToShortTeam).find(([, shortName]) => normalizeTeam(shortName) === normalized)
  return short?.[0] || value
}

export const matchupKey = (awayTeam = '', homeTeam = '') =>
  `${normalizeTeam(canonicalTeamName(awayTeam))}|${normalizeTeam(canonicalTeamName(homeTeam))}`

export const collectGamesForDate = (date, dbPath = mlbDbPath, options = {}) => {
  const { includeSourceOnlyGames = false } = options
  const scheduledGames = sqliteJson(`
select
  cast(game_pk as integer) as game_pk,
  game_date,
  away_team,
  home_team,
  status,
  start_time_utc
from mlb_games
where game_date = ${sqlQuote(date)}
order by start_time_utc, game_pk;
`, dbPath)

  const gamesByKey = new Map()
  scheduledGames.forEach((game) => {
    const awayTeam = canonicalTeamName(game.away_team)
    const homeTeam = canonicalTeamName(game.home_team)
    gamesByKey.set(matchupKey(awayTeam, homeTeam), {
      gamePk: game.game_pk === null || game.game_pk === undefined ? null : Number(game.game_pk),
      gameDate: game.game_date,
      awayTeam,
      homeTeam,
      status: game.status || null,
      startTimeUtc: game.start_time_utc || null,
      source: 'mlb_games'
    })
  })
  const allowSourceOnlyGames = includeSourceOnlyGames || scheduledGames.length === 0

  const weatherRows = sqliteJson(`
select distinct
  game_pk,
  matchup_key,
  away_team,
  home_team,
  matchup,
  game_time_et
from mlb_fic_weather_daily
where source_date = ${sqlQuote(date)}
order by game_time_et, matchup;
`, dbPath)
  weatherRows.forEach((row) => {
    const awayTeam = canonicalTeamName(row.away_team)
    const homeTeam = canonicalTeamName(row.home_team)
    const key = matchupKey(awayTeam, homeTeam)
    if (!gamesByKey.has(key) && allowSourceOnlyGames) {
      gamesByKey.set(key, {
        gamePk: row.game_pk === null || row.game_pk === undefined ? null : Number(row.game_pk),
        gameDate: date,
        awayTeam,
        homeTeam,
        status: null,
        startTimeUtc: null,
        gameTimeEt: row.game_time_et || null,
        source: 'mlb_fic_weather_daily'
      })
    }
  })

  const umpireRows = sqliteJson(`
select distinct
  game_pk,
  matchup_key,
  away_team,
  home_team,
  matchup,
  game_time_et
from mlb_umpire_assignments_daily
where source_date = ${sqlQuote(date)}
  and date_match_status = 'exact'
order by game_time_et, matchup;
`, dbPath)
  umpireRows.forEach((row) => {
    const awayTeam = canonicalTeamName(row.away_team)
    const homeTeam = canonicalTeamName(row.home_team)
    const key = matchupKey(awayTeam, homeTeam)
    if (!gamesByKey.has(key) && allowSourceOnlyGames) {
      gamesByKey.set(key, {
        gamePk: row.game_pk === null || row.game_pk === undefined ? null : Number(row.game_pk),
        gameDate: date,
        awayTeam,
        homeTeam,
        status: null,
        startTimeUtc: null,
        gameTimeEt: row.game_time_et || null,
        source: 'mlb_umpire_assignments_daily'
      })
    }
  })

  return [...gamesByKey.values()].sort((left, right) =>
    (left.startTimeUtc || left.gameTimeEt || left.awayTeam).localeCompare(right.startTimeUtc || right.gameTimeEt || right.awayTeam)
  )
}
