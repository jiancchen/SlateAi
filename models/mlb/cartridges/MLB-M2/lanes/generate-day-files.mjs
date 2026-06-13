import { execFileSync, execSync } from 'node:child_process'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { loadMlbAddendumContextsFromDb } from '../../../db/day-games.mjs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..', '..', '..', '..', '..')
const mlbWarehouseDbPath = path.join(rootDir, 'data-private', 'warehouse', 'sports', 'mlb', 'sql-mlb.db')

const season = 2026

const officialToDeskTeam = {
  'Washington Nationals': 'Nationals',
  'Miami Marlins': 'Marlins',
  Athletics: 'Athletics',
  'Baltimore Orioles': 'Orioles',
  'Tampa Bay Rays': 'Rays',
  'Boston Red Sox': 'Red Sox',
  'Colorado Rockies': 'Rockies',
  'Philadelphia Phillies': 'Phillies',
  'Los Angeles Angels': 'Angels',
  'Toronto Blue Jays': 'Blue Jays',
  'Houston Astros': 'Astros',
  'Cincinnati Reds': 'Reds',
  'Minnesota Twins': 'Twins',
  'Cleveland Guardians': 'Guardians',
  'Seattle Mariners': 'Mariners',
  'Chicago White Sox': 'White Sox',
  'New York Yankees': 'Yankees',
  'Milwaukee Brewers': 'Brewers',
  'Chicago Cubs': 'Cubs',
  'Texas Rangers': 'Rangers',
  'Pittsburgh Pirates': 'Pirates',
  'San Francisco Giants': 'Giants',
  'Atlanta Braves': 'Braves',
  'Los Angeles Dodgers': 'Dodgers',
  'St. Louis Cardinals': 'Cardinals',
  'San Diego Padres': 'Padres',
  'New York Mets': 'Mets',
  'Arizona Diamondbacks': 'Diamondbacks',
  'Kansas City Royals': 'Royals',
  'Detroit Tigers': 'Tigers'
}

const deskToOfficialTeam = Object.fromEntries(
  Object.entries(officialToDeskTeam).map(([official, desk]) => [desk, official])
)

const deskTeamToRtAbbreviation = {
  Astros: 'HOU',
  Cubs: 'CHC',
  Cardinals: 'STL',
  Reds: 'CIN',
  Guardians: 'CLE',
  Phillies: 'PHI',
  Rays: 'TB',
  Yankees: 'NYY',
  Pirates: 'PIT',
  'Blue Jays': 'TOR',
  Twins: 'MIN',
  'Red Sox': 'BOS',
  Mets: 'NYM',
  Marlins: 'MIA',
  Tigers: 'DET',
  Orioles: 'BAL',
  Nationals: 'WSH',
  Braves: 'ATL',
  Dodgers: 'LAD',
  Brewers: 'MIL',
  Rockies: 'COL',
  Diamondbacks: 'ARI',
  Royals: 'KC',
  Mariners: 'SEA',
  'White Sox': 'CWS',
  Rangers: 'TEX',
  Angels: 'LAA',
  Athletics: 'ATH',
  Padres: 'SD',
  Giants: 'SF'
}

const customSlugsByDeskTeam = {
  'Blue Jays': 'blue-jays',
  'Red Sox': 'red-sox',
  'White Sox': 'white-sox',
  Diamondbacks: 'diamondbacks'
}

const parseArgs = () => {
  const args = process.argv.slice(2)
  const options = {
    date: null,
    baselineContextDate: '2026-05-15'
  }

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index]
    if (arg === '--date') options.date = args[++index]
    else if (arg === '--baseline-context-date') options.baselineContextDate = args[++index]
  }

  if (!options.date) {
    throw new Error('Missing required --date argument, expected YYYY-MM-DD.')
  }

  return options
}

const fetchJson = async (url) => {
  const response = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0' }
  })

  if (!response.ok) {
    throw new Error(`Failed request ${response.status} for ${url}`)
  }

  return response.json()
}

const fetchText = async (url) => {
  const response = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0' }
  })

  if (!response.ok) {
    throw new Error(`Failed request ${response.status} for ${url}`)
  }

  return response.text()
}

const parseBaseballInnings = (value = 0) => {
  const stringValue = `${value}`.trim()
  const match = stringValue.match(/^(\d+)(?:\.(\d))?$/)

  if (!match) return Number(stringValue) || 0

  const wholeInnings = Number(match[1])
  const partialOuts = Number(match[2] || 0)
  return wholeInnings + (partialOuts === 1 ? 1 / 3 : partialOuts === 2 ? 2 / 3 : 0)
}

const slugifyDeskTeam = (teamName = '') =>
  customSlugsByDeskTeam[teamName] ||
  teamName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

const toMatchupSlug = (awayDeskTeam, homeDeskTeam) =>
  `${slugifyDeskTeam(awayDeskTeam)}-vs-${slugifyDeskTeam(homeDeskTeam)}`

const buildDeskGameId = ({ awayDesk, homeDesk, gamePk = null, forceUnique = false, gameNumber = null } = {}) => {
  const baseId = `${slugifyDeskTeam(awayDesk)}-${slugifyDeskTeam(homeDesk)}`
  if (!forceUnique) return baseId
  if (Number.isFinite(Number(gameNumber)) && Number(gameNumber) > 0) {
    return `${baseId}-g${Number(gameNumber)}`
  }
  if (Number.isFinite(Number(gamePk)) && Number(gamePk) > 0) {
    return `${baseId}-${Number(gamePk)}`
  }
  return `${baseId}-2`
}

const emptyAddendumContexts = () => ({ byGamePk: {}, byGameId: {} })

const loadAddendumContextsForDate = async (date) => {
  try {
    return await loadMlbAddendumContextsFromDb(date)
  } catch (error) {
    console.warn(`[generate-day-files] MLB addendum context unavailable for ${date}: ${error.message}`)
    return emptyAddendumContexts()
  }
}

const findAddendumContextForGame = (game, addendumContexts = emptyAddendumContexts()) => {
  const gamePk = Number(game?.gamePk)
  if (Number.isFinite(gamePk)) {
    const byGamePk = addendumContexts.byGamePk?.[String(gamePk)]
    if (byGamePk) return byGamePk
  }

  return addendumContexts.byGameId?.[game?.id] ?? null
}

const formatPtStart = (isoString) => {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Los_Angeles',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  })

  return `${formatter.format(new Date(isoString)).replace(/\s/g, ' ')} PT`
}

const getPtStartMinutes = (isoString) => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Los_Angeles',
    hour: 'numeric',
    minute: '2-digit',
    hour12: false
  }).formatToParts(new Date(isoString))

  const hour = Number(parts.find((part) => part.type === 'hour')?.value ?? 0)
  const minute = Number(parts.find((part) => part.type === 'minute')?.value ?? 0)
  return hour * 60 + minute
}

const normalizePitchHand = (value = '') => {
  const normalized = `${value}`.trim().toUpperCase()
  if (normalized.startsWith('L')) return 'L'
  if (normalized.startsWith('R')) return 'R'
  return ''
}

const formatDecimalString = (value, digits = 2) =>
  Number.isFinite(value) ? Number(value).toFixed(digits) : '-'

const formatInningsString = (value) => {
  if (!Number.isFinite(value)) return '-'
  const whole = Math.trunc(value)
  const remainder = value - whole
  if (Math.abs(remainder - 1 / 3) < 0.05) return `${whole}.1`
  if (Math.abs(remainder - 2 / 3) < 0.05) return `${whole}.2`
  return `${whole}.0`
}

const parseXmlAttributes = (text = '') =>
  Object.fromEntries(
    [...text.matchAll(/([a-z0-9-]+)="([^"]*)"/gi)].map((match) => [match[1], match[2]])
  )

const parseStarterRecord = (value = '') => {
  const match = `${value}`.match(/\((\d+)-(\d+)\)/)
  if (!match) return null
  return { wins: Number(match[1]), losses: Number(match[2]) }
}

const isPostponedScheduleGame = (game = {}) =>
  `${game?.status?.detailedState || ''}`.toLowerCase() === 'postponed' ||
  `${game?.status?.statusCode || ''}`.toUpperCase() === 'DR'

const normalizeNameToken = (value = '') =>
  `${value}`
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()

const slugifyPlayerName = (value = '') =>
  `${value}`
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

const buildBaseballSavantLinks = ({ playerId, fullName, seasonYear = season, type = 'pitching' } = {}) => {
  if (!Number.isFinite(Number(playerId))) return null

  const normalizedType = type === 'hitting' ? 'hitting' : 'pitching'
  const statsSuffix = normalizedType === 'hitting' ? 'r-hitting-mlb' : 'r-pitching-mlb'
  const playerSlug = slugifyPlayerName(fullName || `player-${playerId}`) || `player-${playerId}`
  const playerUrl = `https://baseballsavant.mlb.com/savant-player/${playerSlug}-${Number(playerId)}`
  const buildStatsUrl = (statsKey) => `${playerUrl}?stats=${statsKey}-${statsSuffix}&season=${seasonYear}`

  return {
    playerId: Number(playerId),
    playerUrl,
    statsSuffix,
    season: seasonYear,
    statsUrls: {
      statcast: buildStatsUrl('statcast'),
      splits: buildStatsUrl('splits'),
      gamelogs: buildStatsUrl('gamelogs')
    }
  }
}

const buildPitcherFallbackSummary = ({ fullName = '', record = '' } = {}) => {
  const parsedRecord = parseStarterRecord(record)
  return {
    id: null,
    fullName,
    pitchHand: '',
    wins: parsedRecord?.wins ?? 0,
    losses: parsedRecord?.losses ?? 0,
    era: '-',
    strikeOuts: 0,
    inningsPitched: '-',
    hitsAllowed: 0,
    walks: 0,
    homeRunsAllowed: 0,
    whip: null,
    gamesStarted: 0,
    probableSource: 'rtsports-fallback',
    savant: null
  }
}

const buildPitcherSummary = (person = null) => {
  const stat = person?.stats?.[0]?.splits?.[0]?.stat ?? {}
  const inningsFloat = parseBaseballInnings(stat.inningsPitched ?? 0)
  const hitsAllowed = Number(stat.hits ?? 0)
  const walks = Number(stat.baseOnBalls ?? 0)
  const homeRunsAllowed = Number(stat.homeRuns ?? 0)

  return {
    id: Number(person?.id ?? 0) || null,
    fullName: person?.fullName || '',
    pitchHand: normalizePitchHand(person?.pitchHand?.code || person?.pitchHand?.description || ''),
    wins: Number(stat.wins ?? 0),
    losses: Number(stat.losses ?? 0),
    era: Number.isFinite(Number(stat.era)) ? formatDecimalString(Number(stat.era), 2) : '-',
    strikeOuts: Number(stat.strikeOuts ?? 0),
    inningsPitched: inningsFloat > 0 ? formatInningsString(inningsFloat) : '-',
    hitsAllowed: Number.isFinite(hitsAllowed) ? hitsAllowed : null,
    walks: Number.isFinite(walks) ? walks : null,
    homeRunsAllowed: Number.isFinite(homeRunsAllowed) ? homeRunsAllowed : null,
    whip: Number.isFinite(Number(stat.whip)) ? formatDecimalString(Number(stat.whip), 2) : null,
    gamesStarted: Number(stat.gamesStarted ?? 0) || 0,
    probableSource: 'mlb-api',
    savant: buildBaseballSavantLinks({
      playerId: Number(person?.id ?? 0) || null,
      fullName: person?.fullName || '',
      seasonYear: season,
      type: 'pitching'
    })
  }
}

const fetchRtSportsProbables = async (date) => {
  const xml = await fetchText(`https://rtsports.com/baseball/mlb-schedule-provider.php?START=${date}&DAYS=1`)
  const dateBlock = xml.match(new RegExp(`<mlb-schedule[^>]*date="${date}"[^>]*>([\\s\\S]*?)</mlb-schedule>`, 'i'))
  if (!dateBlock) return {}

  const byMatchupKey = {}
  for (const match of dateBlock[1].matchAll(/<game\s+([^>]+?)\/>/gi)) {
    const attrs = parseXmlAttributes(match[1])
    const key = `${attrs['away-abbreviation'] || ''}-${attrs['home-abbreviation'] || ''}`
    if (!byMatchupKey[key]) byMatchupKey[key] = []
    byMatchupKey[key].push({
      awayStarter: attrs['away-starter'] || '',
      awayStarterRecord: attrs['away-starter-record'] || '',
      homeStarter: attrs['home-starter'] || '',
      homeStarterRecord: attrs['home-starter-record'] || '',
      gameTime: attrs['game-time'] || ''
    })
  }

  return byMatchupKey
}

const starterUsageOverridesByPitcherId = {
  543037: {
    when: ({ seasonStarts }) => seasonStarts === 0,
    status: 'return-from-surgery',
    label: 'Season debut after rehab',
    note: 'Making his 2026 MLB debut after completing rehab from March 2025 Tommy John surgery, so command, feel, and length should still be treated as comeback-volatile on day one.',
    expectedInnings: 4.8,
    workloadLabel: '4-5 inning lane'
  },
  680570: {
    when: ({ seasonStarts, startsLoaded }) => seasonStarts <= 1 || startsLoaded <= 1,
    status: 'fresh-off-il',
    label: 'Fresh off IL',
    note: 'Opened 2026 on the injured list with right shoulder inflammation and only recently returned, so the first few outings should still be treated as short-leash and high-variance.',
    expectedInnings: 4.2,
    workloadLabel: 'Short leash'
  },
  689818: {
    when: ({ seasonStarts, startsLoaded }) => seasonStarts === 0 && startsLoaded === 0,
    status: 'milb-callup',
    label: 'MiLB call-up prior',
    note: 'Freshly recalled from Charlotte on May 26. 2026 MiLB line before the call-up: 6 GS, 16.1 IP, 0.55 ERA, 26 SO, 1.41 WHIP, so this is a live-arm promotion with real strikeout shape but still a short-leash MLB debut lane.',
    expectedInnings: 3.8,
    workloadLabel: 'Short leash'
  }
}

const tableRowCells = (rowHtml = '') =>
  [...rowHtml.matchAll(/<td[^>]*>(.*?)<\/td>/gs)].map((match) =>
    match[1]
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  )

const parseOddsText = (value = '') => value.replace(/\s*\+\s*$/, '').trim()

const normalizeMarketTeam = (value = '') =>
  String(value || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()

const formatAmerican = (value) => {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return ''
  if (parsed === 100) return '+100'
  return parsed > 0 ? `+${Math.round(parsed)}` : `${Math.round(parsed)}`
}

const formatLine = (value) => {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return ''
  return parsed > 0 ? `+${parsed}` : `${parsed}`
}

const formatDkTotal = (rows = []) => {
  const over = rows.find((row) => /^over$/i.test(String(row.side || '')))
  const under = rows.find((row) => /^under$/i.test(String(row.side || '')))
  if (!over || !under) return ''
  const line = Number.isFinite(Number(over.line)) ? Number(over.line) : Number(under.line)
  if (!Number.isFinite(line)) return ''
  return `o${line} ${formatAmerican(over.odds)} / u${line} ${formatAmerican(under.odds)}`
}

const formatDkTeamMarket = (rows = [], awayDeskTeam, homeDeskTeam, { includeLine = false } = {}) => {
  const away = rows.find((row) => /^away$/i.test(String(row.side || '')))
  const home = rows.find((row) => /^home$/i.test(String(row.side || '')))
  if (!away || !home) return ''
  const awayLine = includeLine ? `${formatLine(away.line)} ` : ''
  const homeLine = includeLine ? `${formatLine(home.line)} ` : ''
  return `${awayDeskTeam} ${awayLine}${formatAmerican(away.odds)} / ${homeDeskTeam} ${homeLine}${formatAmerican(home.odds)}`
}

const dkFullGameLooksLiveOrIncomplete = (event = {}) => {
  const moneylineRows = event?.markets?.moneyline || []
  const runLineRows = event?.markets?.runLine || []
  const totalRows = event?.markets?.total || []
  const hasTwoSidedMoneyline =
    moneylineRows.some((row) => /^away$/i.test(String(row.side || ''))) &&
    moneylineRows.some((row) => /^home$/i.test(String(row.side || '')))
  const hasTwoSidedTotal =
    totalRows.some((row) => /^over$/i.test(String(row.side || row.label || ''))) &&
    totalRows.some((row) => /^under$/i.test(String(row.side || row.label || '')))
  const extremeRunLine = runLineRows.some((row) => Math.abs(Number(row.line)) > 3)
  const extremeTotal = totalRows.some((row) => Number(row.line) > 15)
  const extremeMoneyline = moneylineRows.some((row) => Math.abs(Number(row.odds)) > 5000)
  return !hasTwoSidedMoneyline || !hasTwoSidedTotal || extremeRunLine || extremeTotal || extremeMoneyline
}

const loadDraftKingsMlbLines = async (date) => {
  const filePath = path.join(rootDir, 'data-private', 'odds', 'draftkings', 'mlb', `${date}-draftkings-mlb-lines.json`)
  try {
    const payload = JSON.parse(await readFile(filePath, 'utf8'))
    return Array.isArray(payload.events) ? payload.events : []
  } catch {
    return []
  }
}

const findDraftKingsEvent = (events = [], awayDeskTeam, homeDeskTeam) => {
  const awayKey = normalizeMarketTeam(awayDeskTeam)
  const homeKey = normalizeMarketTeam(homeDeskTeam)
  return events.find((event) => {
    const parts = String(event.name || '').split('@').map(normalizeMarketTeam)
    return parts.length === 2 && parts[0].endsWith(awayKey) && parts[1].endsWith(homeKey)
  })
}

const draftKingsOddsForMatchup = (event, awayDeskTeam, homeDeskTeam, typedFallback = null) => {
  if (!event?.markets) return null
  const moneyline = formatDkTeamMarket(event.markets.moneyline, awayDeskTeam, homeDeskTeam)
  const spread = formatDkTeamMarket(event.markets.runLine, awayDeskTeam, homeDeskTeam, { includeLine: true })
  const total = formatDkTotal(event.markets.total)
  const useTypedFullGame = typedFallback && dkFullGameLooksLiveOrIncomplete(event)
  const first5Moneyline = formatDkTeamMarket(event.markets.first5Moneyline, awayDeskTeam, homeDeskTeam)
  const first5Total = formatDkTotal(event.markets.first5Total)
  const finalMoneyline = useTypedFullGame ? typedFallback.moneyline || moneyline : moneyline
  const finalSpread = useTypedFullGame ? typedFallback.spread || spread : spread
  const finalTotal = useTypedFullGame ? typedFallback.total || total : total
  if (!finalMoneyline && !finalTotal && !first5Moneyline && !first5Total) return null
  return {
    spread: finalSpread,
    total: finalTotal,
    moneyline: finalMoneyline,
    first5Moneyline,
    first5Total,
    oddsPage: event.href || 'https://sportsbook.draftkings.com/leagues/baseball/mlb',
    oddsProvider: 'DraftKings typed MLB board'
  }
}

const parseHighlightedOrFirstOdds = (rowHtml = '') => {
  const anchors = [...rowHtml.matchAll(/<a [^>]*class="([^"]*)"[^>]*>(.*?)<\/a>/gs)].map((match) => ({
    className: match[1] || '',
    body: match[2]
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  }))

  const best = anchors.find((anchor) => /highlight/.test(anchor.className))
  return parseOddsText(best?.body || anchors[0]?.body || '')
}

const extractOddsRows = (html, table) => {
  const tableMatch = html.match(new RegExp(`<tbody id="odds-table-${table}--\\d+".*?<\\/tbody>`, 's'))
  if (!tableMatch) return []
  return [...tableMatch[0].matchAll(/<tr>(.*?)<\/tr>/gs)].map((match) => match[1])
}

const parseMatchupOdds = async (awayDeskTeam, homeDeskTeam, { draftKingsEvents = [], date = '' } = {}) => {
  const draftKingsEvent = findDraftKingsEvent(draftKingsEvents, awayDeskTeam, homeDeskTeam)
  const typedDraftKingsFallback = date
    ? latestCompleteTypedDraftKingsFullGame(date, awayDeskTeam, homeDeskTeam)
    : null
  const draftKingsOdds = draftKingsOddsForMatchup(draftKingsEvent, awayDeskTeam, homeDeskTeam, typedDraftKingsFallback)
  if (draftKingsOdds) return draftKingsOdds
  if (typedDraftKingsFallback) return {
    ...typedDraftKingsFallback,
    first5Moneyline: '',
    first5Total: '',
    oddsProvider: 'DraftKings typed MLB board',
    oddsPage: 'https://sportsbook.draftkings.com/leagues/baseball/mlb'
  }

  const slug = toMatchupSlug(awayDeskTeam, homeDeskTeam)
  const url = `https://www.scoresandodds.com/mlb/${slug}`
  const html = await fetchText(url)
  const moneylineRows = extractOddsRows(html, 'moneyline')
  const spreadRows = extractOddsRows(html, 'spread')
  const totalRows = extractOddsRows(html, 'total')

  const moneylineAway = parseHighlightedOrFirstOdds(moneylineRows[0])
  const moneylineHome = parseHighlightedOrFirstOdds(moneylineRows[1])
  const spreadAway = parseHighlightedOrFirstOdds(spreadRows[0])
  const spreadHome = parseHighlightedOrFirstOdds(spreadRows[1])
  const totalOver = parseHighlightedOrFirstOdds(totalRows[0])
  const totalUnder = parseHighlightedOrFirstOdds(totalRows[1])

  return {
    spread: spreadAway && spreadHome ? `${spreadAway} / ${spreadHome}` : '',
    total: totalOver && totalUnder ? `${totalOver} / ${totalUnder}` : '',
    moneyline: moneylineAway && moneylineHome ? `${awayDeskTeam} ${moneylineAway} / ${homeDeskTeam} ${moneylineHome}` : '',
    first5Moneyline: '',
    first5Total: '',
    oddsProvider: 'Official MLB data + ScoresAndOdds live board',
    oddsPage: url
  }
}

const runSqliteJson = (sql) => {
  const output = execFileSync(
    'sqlite3',
    ['-json', mlbWarehouseDbPath, sql],
    { encoding: 'utf8', cwd: rootDir, maxBuffer: 64 * 1024 * 1024 }
  )
  return JSON.parse(output || '[]')
}

const sqliteText = (value = '') => `'${String(value).replaceAll("'", "''")}'`

const typedGameRowsByDate = new Map()

const typedGamesForDate = (date) => {
  if (!typedGameRowsByDate.has(date)) {
    const rows = runSqliteJson(`
      SELECT
        g.game_id,
        away.name AS away_name,
        home.name AS home_name
      FROM games g
      JOIN teams away ON away.team_id = g.away_team_id
      JOIN teams home ON home.team_id = g.home_team_id
      WHERE g.game_date = ${sqliteText(date)}
    `)
    typedGameRowsByDate.set(date, rows)
  }
  return typedGameRowsByDate.get(date) || []
}

const typedGameIdForMatchup = (date, awayDeskTeam, homeDeskTeam) => {
  const awayKey = normalizeMarketTeam(awayDeskTeam)
  const homeKey = normalizeMarketTeam(homeDeskTeam)
  const row = typedGamesForDate(date).find((entry) => {
    const awayName = officialToDeskTeam[entry.away_name] || entry.away_name
    const homeName = officialToDeskTeam[entry.home_name] || entry.home_name
    return normalizeMarketTeam(awayName) === awayKey && normalizeMarketTeam(homeName) === homeKey
  })
  return row?.game_id || ''
}

const teamSelectionMatches = (selection = '', deskTeam = '') => {
  const selectionKey = normalizeMarketTeam(selection)
  const teamKey = normalizeMarketTeam(deskTeam)
  return selectionKey === teamKey || selectionKey.endsWith(` ${teamKey}`)
}

const typedMarketRowForTeam = (rows = [], deskTeam = '') =>
  rows.find((row) => teamSelectionMatches(row.selection, deskTeam) && Number.isFinite(Number(row.odds_american)))

const typedTotalRow = (rows = [], side = '') =>
  rows.find((row) => String(row.selection || '').toLowerCase() === side && Number.isFinite(Number(row.odds_american)))

const latestCompleteTypedDraftKingsFullGame = (date, awayDeskTeam, homeDeskTeam) => {
  const gameId = typedGameIdForMatchup(date, awayDeskTeam, homeDeskTeam)
  if (!gameId) return null
  const rows = runSqliteJson(`
    SELECT market_type, selection, line_value, odds_american, captured_at
    FROM market_snapshots
    WHERE lower(source_name) = 'draftkings'
      AND game_id = ${sqliteText(gameId)}
      AND substr(captured_at, 1, 10) = ${sqliteText(date)}
      AND market_type IN ('winner', 'spread', 'total')
    ORDER BY captured_at DESC
  `)
  const rowsByCapturedAt = new Map()
  for (const row of rows) {
    const capturedAt = row.captured_at || ''
    if (!rowsByCapturedAt.has(capturedAt)) rowsByCapturedAt.set(capturedAt, [])
    rowsByCapturedAt.get(capturedAt).push(row)
  }

  for (const [capturedAt, capturedRows] of rowsByCapturedAt) {
    const byType = (marketType) => capturedRows.filter((row) => row.market_type === marketType)
    const winnerAway = typedMarketRowForTeam(byType('winner'), awayDeskTeam)
    const winnerHome = typedMarketRowForTeam(byType('winner'), homeDeskTeam)
    const spreadAway = typedMarketRowForTeam(byType('spread'), awayDeskTeam)
    const spreadHome = typedMarketRowForTeam(byType('spread'), homeDeskTeam)
    const totalOver = typedTotalRow(byType('total'), 'over')
    const totalUnder = typedTotalRow(byType('total'), 'under')
    const totalLine = Number.isFinite(Number(totalOver?.line_value))
      ? Number(totalOver.line_value)
      : Number(totalUnder?.line_value)
    if (!winnerAway || !winnerHome || !spreadAway || !spreadHome || !totalOver || !totalUnder || !Number.isFinite(totalLine)) {
      continue
    }
    if (Math.abs(Number(spreadAway.line_value)) > 3 || Math.abs(Number(spreadHome.line_value)) > 3 || totalLine > 15) {
      continue
    }
    return {
      moneyline: `${awayDeskTeam} ${formatAmerican(winnerAway.odds_american)} / ${homeDeskTeam} ${formatAmerican(winnerHome.odds_american)}`,
      spread:
        `${awayDeskTeam} ${formatLine(spreadAway.line_value)} ${formatAmerican(spreadAway.odds_american)} / ` +
        `${homeDeskTeam} ${formatLine(spreadHome.line_value)} ${formatAmerican(spreadHome.odds_american)}`,
      total: `o${totalLine} ${formatAmerican(totalOver.odds_american)} / u${totalLine} ${formatAmerican(totalUnder.odds_american)}`,
      sourceCapturedAt: capturedAt
    }
  }
  return null
}

const publicPropSourcePath = (sourceName = '', sourcePath = '') => {
  const sourceText = `${sourceName} ${sourcePath}`.toLowerCase()
  if (sourceText.includes('draftkings')) return 'https://sportsbook.draftkings.com/leagues/baseball/mlb'
  if (sourceText.includes('fanduel')) return 'https://sportsbook.fanduel.com/baseball/mlb'
  if (/data-private|\/users\//i.test(String(sourcePath || ''))) return ''
  return sourcePath || ''
}

const safeJsonParse = (value, fallback = null) => {
  if (typeof value !== 'string' || !value.trim()) return fallback
  try {
    return JSON.parse(value)
  } catch {
    return fallback
  }
}

const quoteSqlText = (value = '') => `'${String(value).replace(/'/g, "''")}'`

const impliedProbabilityFromAmerican = (price) => {
  const numeric = Number(price)
  if (!Number.isFinite(numeric) || numeric === 0) return null
  return numeric < 0 ? Math.abs(numeric) / (Math.abs(numeric) + 100) : 100 / (numeric + 100)
}

const typedHistoricalMarketCacheByDate = new Map()

const loadTypedHistoricalMarketContextByDate = (date) => {
  if (typedHistoricalMarketCacheByDate.has(date)) {
    return typedHistoricalMarketCacheByDate.get(date)
  }

  const marketByGamePk = new Map()
  const rows = runSqliteJson(
    `select
      market_date,
      game_pk,
      home_team,
      away_team,
      outcome_name,
      price,
      snapshot_time
    from mlb_featured_market_odds_snapshots
    where market_date = ${quoteSqlText(date)}
      and game_pk is not null
      and market_key in ('h2h', 'moneyline')
    order by game_pk, snapshot_time desc;`
  )

  const grouped = new Map()
  rows.forEach((row) => {
    const gamePk = Number(row.game_pk || 0) || 0
    if (!gamePk) return
    if (!grouped.has(gamePk)) {
      grouped.set(gamePk, {
        awayTeam: row.away_team || '',
        homeTeam: row.home_team || '',
        outcomes: new Map()
      })
    }
    const group = grouped.get(gamePk)
    const outcomeTeam = deskToOfficialTeam[row.outcome_name] || row.outcome_name || ''
    if (!outcomeTeam || group.outcomes.has(outcomeTeam)) return
    const probability = impliedProbabilityFromAmerican(row.price)
    if (!Number.isFinite(probability)) return
    group.outcomes.set(outcomeTeam, {
      team: outcomeTeam,
      probability,
      price: Number(row.price)
    })
  })

  for (const [gamePk, group] of grouped.entries()) {
    const outcomes = [...group.outcomes.values()].sort((left, right) => right.probability - left.probability)
    const favorite = outcomes[0]
    if (!favorite) continue
    marketByGamePk.set(gamePk, {
      marketFavoriteTeam: favorite.team,
      marketFavoriteProbability: favorite.probability,
      favoriteProbabilityGap: outcomes.length >= 2 ? Math.abs(outcomes[0].probability - outcomes[1].probability) : null,
      awayTeam: group.awayTeam,
      homeTeam: group.homeTeam
    })
  }

  typedHistoricalMarketCacheByDate.set(date, marketByGamePk)
  return marketByGamePk
}

const buildHistoricalExpectationContext = ({ records = [] }) => {
  const uniqueRecords = [
    ...new Map(
      records
        .filter((record) => Number.isFinite(Number(record.gamePk)) && record.date)
        .map((record) => [`${record.date}::${Number(record.gamePk)}`, record])
    ).values()
  ]

  if (!uniqueRecords.length) {
    return {
      phaseByGameTeam: new Map(),
      marketByDateGamePk: new Map()
    }
  }

  const gamePks = [...new Set(uniqueRecords.map((record) => Number(record.gamePk)).filter(Boolean))]
  const phaseRows = runSqliteJson(
    `select
      game_pk,
      game_date,
      team_name,
      result,
      runs_first5,
      runs_late,
      hits_first5,
      hits_late,
      scoreless_first3_flag,
      traffic_no_conversion_flag,
      led_after5_flag,
      trailed_after5_flag,
      tied_after5_flag,
      won_full_game_flag,
      won_first5_flag,
      first5_push_flag,
      starter_survived5_flag,
      starter_cracked_flag,
      blew_lead_after5_flag,
      bullpen_flip_game_flag,
      phase_path_label
    from mlb_phase_outcomes_daily
    where game_pk in (${gamePks.join(',')})
    order by game_pk, team_name;`
  )

  const phaseByGameTeam = new Map()
  phaseRows.forEach((row) => {
    const gamePk = Number(row.game_pk || 0) || 0
    const teamName = row.team_name || ''
    if (!gamePk || !teamName) return
    phaseByGameTeam.set(`${gamePk}::${teamName}`, {
      result: row.result || '',
      runsFirst5: Number(row.runs_first5 || 0) || 0,
      runsLate: Number(row.runs_late || 0) || 0,
      hitsFirst5: Number(row.hits_first5 || 0) || 0,
      hitsLate: Number(row.hits_late || 0) || 0,
      scorelessFirst3Flag: Boolean(Number(row.scoreless_first3_flag || 0)),
      trafficNoConversionFlag: Boolean(Number(row.traffic_no_conversion_flag || 0)),
      ledAfter5Flag: Boolean(Number(row.led_after5_flag || 0)),
      trailedAfter5Flag: Boolean(Number(row.trailed_after5_flag || 0)),
      tiedAfter5Flag: Boolean(Number(row.tied_after5_flag || 0)),
      wonFullGameFlag: Boolean(Number(row.won_full_game_flag || 0)),
      wonFirst5Flag: Boolean(Number(row.won_first5_flag || 0)),
      first5PushFlag: Boolean(Number(row.first5_push_flag || 0)),
      starterSurvived5Flag: Boolean(Number(row.starter_survived5_flag || 0)),
      starterCrackedFlag: Boolean(Number(row.starter_cracked_flag || 0)),
      blewLeadAfter5Flag: Boolean(Number(row.blew_lead_after5_flag || 0)),
      bullpenFlipGameFlag: Boolean(Number(row.bullpen_flip_game_flag || 0)),
      phasePathLabel: row.phase_path_label || ''
    })
  })

  const marketByDateGamePk = new Map()
  const predictionRows = runSqliteJson(
    `select prediction_date, game_pk, away_team, home_team, metadata_json
     from mlb_side_predictions
     where game_pk in (${gamePks.join(',')})
     order by prediction_date desc, game_pk desc;`
  )

  predictionRows.forEach((row) => {
    const gamePk = Number(row.game_pk || 0) || 0
    const predictionDate = row.prediction_date || ''
    if (!gamePk || !predictionDate) return
    const key = `${predictionDate}::${gamePk}`
    if (marketByDateGamePk.has(key)) return
    const metadata = safeJsonParse(row.metadata_json, {}) || {}
    const marketProbability = Number(metadata.marketProbability)
    const opponentMarketProbability = Number(metadata.opponentMarketProbability)
    const marketFavoriteProbability = Number(metadata.marketFavoriteProbability)
    marketByDateGamePk.set(key, {
      marketFavoriteTeam: metadata.marketFavoriteTeam || '',
      marketFavoriteProbability: Number.isFinite(marketFavoriteProbability) ? marketFavoriteProbability : null,
      favoriteProbabilityGap:
        Number.isFinite(marketProbability) && Number.isFinite(opponentMarketProbability)
          ? Math.abs(marketProbability - opponentMarketProbability)
          : null,
      awayTeam: row.away_team || '',
      homeTeam: row.home_team || ''
    })
  })

  uniqueRecords.forEach((record) => {
    const key = `${record.date}::${Number(record.gamePk)}`
    if (marketByDateGamePk.has(key)) return
    const typedMarketMap = loadTypedHistoricalMarketContextByDate(record.date)
    const typedMarketContext = typedMarketMap.get(Number(record.gamePk))
    if (typedMarketContext) {
      marketByDateGamePk.set(key, typedMarketContext)
    }
  })

  return { phaseByGameTeam, marketByDateGamePk }
}

const buildHistoricalMarketStory = ({ teamName, gameResult, marketContext = null }) => {
  if (!teamName) return { label: 'Unknown', tone: 'info' }
  if (!marketContext?.marketFavoriteTeam) return { label: gameResult === 'W' ? 'Won' : gameResult === 'L' ? 'Lost' : 'Push', tone: 'info' }

  const favoriteGap = Number(marketContext.favoriteProbabilityGap)
  const coinflip = Number.isFinite(favoriteGap) && favoriteGap < 0.04
  const teamIsFavorite = marketContext.marketFavoriteTeam === teamName

  if (coinflip) {
    return {
      label: gameResult === 'W' ? 'Coin W' : gameResult === 'L' ? 'Coin L' : 'Coin',
      tone: gameResult === 'W' ? 'positive' : gameResult === 'L' ? 'warning' : 'info'
    }
  }

  if (teamIsFavorite) {
    return gameResult === 'W'
      ? { label: 'Fav held', tone: 'positive' }
      : { label: 'Fav failed', tone: 'negative' }
  }

  return gameResult === 'W'
    ? { label: 'Dog upset', tone: 'positive' }
    : { label: 'Exp L', tone: 'warning' }
}

const buildHistoricalStarterStory = (phase = null) => {
  if (!phase) return { label: 'Unknown', tone: 'info' }
  if (phase.starterCrackedFlag) return { label: 'Cracked', tone: 'negative' }
  if (phase.starterSurvived5Flag && !phase.trailedAfter5Flag) return { label: 'Met', tone: 'positive' }
  if (phase.starterSurvived5Flag && phase.trailedAfter5Flag) return { label: 'Mixed', tone: 'warning' }
  if (!phase.starterSurvived5Flag && phase.wonFullGameFlag) return { label: 'Short', tone: 'warning' }
  if (!phase.starterSurvived5Flag) return { label: 'Short', tone: 'negative' }
  return { label: 'Mixed', tone: 'info' }
}

const buildHistoricalReliefStory = (phase = null) => {
  if (!phase) return { label: 'Unknown', tone: 'info' }
  if (phase.blewLeadAfter5Flag) return { label: 'Blew', tone: 'negative' }
  if (phase.trailedAfter5Flag && phase.wonFullGameFlag) return { label: 'Rescued', tone: 'positive' }
  if (phase.ledAfter5Flag && phase.wonFullGameFlag) return { label: 'Held', tone: 'positive' }
  if (phase.tiedAfter5Flag && phase.wonFullGameFlag) return { label: 'Won late', tone: 'positive' }
  if (phase.tiedAfter5Flag && !phase.wonFullGameFlag) return { label: 'Lost late', tone: 'warning' }
  if (phase.trailedAfter5Flag && !phase.wonFullGameFlag) return { label: 'No rescue', tone: 'warning' }
  return { label: 'Mixed', tone: 'info' }
}

const sumRunsThroughInning = (inningsByNumber = new Map(), lastInning = 5) =>
  Array.from({ length: Math.max(0, lastInning) }, (_, index) => Number(inningsByNumber.get(index + 1) || 0) || 0)
    .reduce((sum, runs) => sum + runs, 0)

const sumRunsAfterInning = (inningsByNumber = new Map(), firstLateInning = 6) =>
  [...inningsByNumber.entries()]
    .filter(([inning]) => Number(inning) >= firstLateInning)
    .reduce((sum, [, runs]) => sum + (Number(runs || 0) || 0), 0)

const buildHistoricalHitterStoryFallback = (record = null) => {
  if (!record) return { label: 'Unknown', tone: 'info' }
  const totalRuns = Number(record.runsFor || 0) || 0
  const earlyRuns = sumRunsThroughInning(record.inningsByNumber, 5)
  const lateRuns = sumRunsAfterInning(record.inningsByNumber, 6)

  if (totalRuns >= 6) return { label: 'Cashed', tone: 'positive' }
  if (lateRuns >= 3 && lateRuns > earlyRuns) return { label: 'Late cash', tone: 'positive' }
  if (totalRuns >= 4) return { label: 'Met', tone: 'positive' }
  if (earlyRuns >= 3 && totalRuns <= 4) return { label: 'Stranded', tone: 'warning' }
  if (totalRuns <= 1) return { label: 'Quiet', tone: 'negative' }
  return { label: 'Mixed', tone: 'info' }
}

const buildHistoricalStarterStoryFallback = (record = null) => {
  if (!record) return { label: 'Unknown', tone: 'info' }
  const runsAgainst = Number(record.runsAgainst || 0) || 0
  const result = record.result || 'T'

  if (runsAgainst <= 2) return { label: 'Met', tone: 'positive' }
  if (runsAgainst <= 4 && result !== 'L') return { label: 'Mixed', tone: 'warning' }
  if (runsAgainst <= 4) return { label: 'Short', tone: 'warning' }
  if (runsAgainst >= 6) return { label: 'Cracked', tone: 'negative' }
  return { label: 'Mixed', tone: 'info' }
}

const buildHistoricalReliefStoryFallback = (record = null) => {
  if (!record) return { label: 'Unknown', tone: 'info' }
  const result = record.result || 'T'
  const runsFor = Number(record.runsFor || 0) || 0
  const runsAgainst = Number(record.runsAgainst || 0) || 0
  const lateRuns = sumRunsAfterInning(record.inningsByNumber, 6)

  if (result === 'W' && lateRuns >= 2) return { label: 'Won late', tone: 'positive' }
  if (result === 'W') return { label: 'Held', tone: 'positive' }
  if (result === 'L' && runsAgainst - runsFor <= 2) return { label: 'Lost late', tone: 'warning' }
  if (result === 'L') return { label: 'No rescue', tone: 'warning' }
  return { label: 'Mixed', tone: 'info' }
}

const buildHistoricalHitterStory = (phase = null) => {
  if (!phase) return { label: 'Unknown', tone: 'info' }

  const totalRuns = (Number(phase.runsFirst5 || 0) || 0) + (Number(phase.runsLate || 0) || 0)
  const totalHits = (Number(phase.hitsFirst5 || 0) || 0) + (Number(phase.hitsLate || 0) || 0)
  const lateRuns = Number(phase.runsLate || 0) || 0
  const earlyRuns = Number(phase.runsFirst5 || 0) || 0

  if (phase.trafficNoConversionFlag) return { label: 'Stranded', tone: 'negative' }
  if (phase.scorelessFirst3Flag && totalRuns <= 2) return { label: 'Flat', tone: 'warning' }
  if (totalRuns >= 6 || (totalRuns >= 5 && totalHits >= 8)) return { label: 'Cashed', tone: 'positive' }
  if (lateRuns >= 3 && lateRuns > earlyRuns) return { label: 'Late cash', tone: 'positive' }
  if (totalRuns >= 4 || totalHits >= 8) return { label: 'Met', tone: 'positive' }
  if (totalRuns <= 1 && totalHits <= 5) return { label: 'Quiet', tone: 'negative' }
  return { label: 'Mixed', tone: 'info' }
}

const buildStartingPitcherFirstInningByGamePk = ({ gamePks = [] }) => {
  const uniqueGamePks = [...new Set(gamePks.map((value) => Number(value || 0)).filter(Boolean))]
  if (!uniqueGamePks.length) return {}

  const rows = runSqliteJson(
    `with first_inning_runs as (
      select
        game_pk,
        pitcher_id,
        sum(coalesce(run_delta, 0)) as first_inning_runs_allowed
      from mlb_plate_appearances
      where game_pk in (${uniqueGamePks.join(',')})
        and inning = 1
      group by game_pk, pitcher_id
    )
    select
      gl.game_pk,
      gl.team_role,
      gl.team_name,
      gl.opponent_name,
      gl.pitcher_id,
      gl.pitcher_name,
      coalesce(fi.first_inning_runs_allowed, 0) as first_inning_runs_allowed
    from mlb_starting_pitcher_game_logs gl
    left join first_inning_runs fi
      on fi.game_pk = gl.game_pk
     and fi.pitcher_id = gl.pitcher_id
    where gl.game_pk in (${uniqueGamePks.join(',')})
    order by gl.game_pk, gl.team_role;`
  )

  return rows.reduce((map, row) => {
    const gamePk = Number(row.game_pk || 0) || 0
    if (!gamePk) return map
    if (!map[gamePk]) map[gamePk] = {}
    const role = row.team_role || 'away'
    const firstInningRunsAllowed = Number(row.first_inning_runs_allowed || 0) || 0
    map[gamePk][role] = {
      pitcherId: Number(row.pitcher_id || 0) || null,
      pitcherName: row.pitcher_name || '',
      teamName: row.team_name || '',
      opponentName: row.opponent_name || '',
      firstInningRunsAllowed,
      firstInningOutcome: firstInningRunsAllowed > 0 ? 'RFI' : 'NRFI'
    }
    return map
  }, {})
}

const clampNumber = (value, min, max) => Math.max(min, Math.min(max, value))

const percentile = (values, q) => {
  const sorted = values.map(Number).filter(Number.isFinite).sort((a, b) => a - b)
  if (!sorted.length) return null
  const index = Math.min(sorted.length - 1, Math.max(0, Math.floor((sorted.length - 1) * q)))
  return sorted[index]
}

const buildRelieverReuseProfiles = ({ date }) => {
  const rows = runSqliteJson(
    `select pitcher_id, pitcher_name, team_name, game_date, game_pk, pitches_thrown, outs_recorded
     from mlb_pitcher_appearances
     where pitcher_role='reliever'
       and game_date < '${date}'
     order by pitcher_id, game_date, game_pk;`
  )

  const byPitcher = new Map()
  const byTeam = new Map()
  for (const row of rows) {
    const pitcherId = Number(row.pitcher_id || 0) || 0
    if (!pitcherId) continue
    if (!byPitcher.has(pitcherId)) byPitcher.set(pitcherId, [])
    byPitcher.get(pitcherId).push(row)
  }

  const pitcherProfiles = new Map()
  for (const [pitcherId, appearances] of byPitcher.entries()) {
    const quickReusePitches = []
    for (let index = 0; index < appearances.length - 1; index += 1) {
      const current = appearances[index]
      const next = appearances[index + 1]
      const restDays = Math.round((new Date(next.game_date) - new Date(current.game_date)) / 86400000)
      if (restDays <= 1) {
        const pitches = Number(current.pitches_thrown || 0) || 0
        quickReusePitches.push(pitches)
        const teamName = current.team_name || ''
        if (teamName) {
          if (!byTeam.has(teamName)) byTeam.set(teamName, [])
          byTeam.get(teamName).push(pitches)
        }
      }
    }
    pitcherProfiles.set(pitcherId, {
      quickReuseSample: quickReusePitches.length,
      quickReuseP90: percentile(quickReusePitches, 0.9),
      quickReuseMax: quickReusePitches.length ? Math.max(...quickReusePitches) : null
    })
  }

  const teamProfiles = new Map()
  for (const [teamName, quickReusePitches] of byTeam.entries()) {
    teamProfiles.set(teamName, {
      quickReuseSample: quickReusePitches.length,
      quickReuseP90: percentile(quickReusePitches, 0.9),
      quickReuseMax: quickReusePitches.length ? Math.max(...quickReusePitches) : null
    })
  }

  return { pitcherProfiles, teamProfiles }
}

const buildRelieverResetProfile = (reliever, reuseProfiles = {}) => {
  const daysSinceLastAppearance = Number(reliever.days_since_last_appearance ?? 99)
  const lastAppearancePitches = Number(reliever.last_appearance_pitches ?? 0)
  const pitcherId = Number(reliever.pitcher_id || 0) || 0
  const pitcherProfile = reuseProfiles.pitcherProfiles?.get(pitcherId) || {}
  const teamProfile = reuseProfiles.teamProfiles?.get(reliever.team_name || '') || {}
  const reuseCeiling =
    Number(pitcherProfile.quickReuseSample || 0) >= 3
      ? Number(pitcherProfile.quickReuseP90)
      : Number(teamProfile.quickReuseP90)
  const adaptiveThreshold = clampNumber(Number.isFinite(reuseCeiling) ? reuseCeiling + 5 : 35, 30, 42)
  const pitchPressure = daysSinceLastAppearance <= 1
    ? clampNumber((lastAppearancePitches - (adaptiveThreshold - 8)) / 16, 0, 1)
    : daysSinceLastAppearance === 2 && lastAppearancePitches >= adaptiveThreshold + 4
      ? 0.35
      : 0
  const appearancePressure = Number(reliever.back_to_back_flag || 0)
    ? 0.35
    : Number(reliever.worked_yesterday_flag || 0)
      ? 0.2
      : 0
  const recentLoadPressure =
    Number(reliever.appearances_last3 || 0) >= 2 && Number(reliever.pitches_last3 || 0) >= 45
      ? 0.25
      : 0
  const resetScore = clampNumber((pitchPressure + appearancePressure + recentLoadPressure) * 100, 0, 100)
  return {
    adaptivePitchResetThreshold: roundMaybe(adaptiveThreshold),
    quickReuseSample: Number(pitcherProfile.quickReuseSample || teamProfile.quickReuseSample || 0) || 0,
    quickReusePitchCeiling: roundMaybe(reuseCeiling),
    heavyUseResetScore: roundMaybe(resetScore),
    heavyUseResetFlag: resetScore >= 70
  }
}

const summarizeBullpenDepth = (relievers) => {
  const sample = relievers.slice(0, 3)
  if (!sample.length) {
    return {
      removedHeavyUseCount: 0,
      remainingTop3AvailabilityAvg: null,
      remainingTop3BridgeScoreAvg: null,
      remainingTop3ExpectedOutsAvg: null
    }
  }
  return {
    removedHeavyUseCount: 0,
    remainingTop3AvailabilityAvg: roundMaybe(
      sample.reduce((sum, reliever) => sum + (Number(reliever.availability_score || 0) || 0), 0) / sample.length
    ),
    remainingTop3BridgeScoreAvg: roundMaybe(
      sample.reduce((sum, reliever) => sum + (Number(reliever.bridge_score || 0) || 0), 0) / sample.length
    ),
    remainingTop3ExpectedOutsAvg: roundMaybe(
      sample.reduce((sum, reliever) => sum + (Number(reliever.avg_outs_per_appearance || 0) || 0), 0) / sample.length
    )
  }
}

const buildBullpenChainByTeam = ({ date, games }) => {
  const reuseProfiles = buildRelieverReuseProfiles({ date })
  const rows = runSqliteJson(
    `select
      usage.team_name,
      usage.pitcher_id,
      usage.pitcher_name,
      usage.likely_role,
      usage.appearances_last3,
      usage.pitches_last3,
      usage.first_reliever_likelihood,
      usage.availability_score,
      usage.bridge_score,
      usage.worked_yesterday_flag,
      usage.back_to_back_flag,
      usage.last_appearance_date,
      usage.days_since_last_appearance,
      usage.avg_outs_per_appearance,
      usage.raw_json,
      (
        select max(pa.pitches_thrown)
        from mlb_pitcher_appearances pa
        where pa.pitcher_role='reliever'
          and pa.pitcher_id = usage.pitcher_id
          and pa.team_name = usage.team_name
          and pa.game_date < '${date}'
          and pa.game_date = usage.last_appearance_date
      ) as last_appearance_pitches,
      (
        select max(pa.outs_recorded)
        from mlb_pitcher_appearances pa
        where pa.pitcher_role='reliever'
          and pa.pitcher_id = usage.pitcher_id
          and pa.team_name = usage.team_name
          and pa.game_date < '${date}'
          and pa.game_date = usage.last_appearance_date
      ) as last_appearance_outs
    from mlb_bullpen_usage usage
    where usage.as_of_date='${date}'
    order by usage.team_name, usage.first_reliever_likelihood desc;`
  )

  const starterNames = new Set(
    games.flatMap((game) => [game.awayPitcher.fullName, game.homePitcher.fullName]).filter(Boolean)
  )
  const opponentByTeam = Object.fromEntries(
    games.flatMap((game) => [
      [game.away, game.home],
      [game.home, game.away]
    ])
  )

  const grouped = rows.reduce((map, row) => {
    const deskTeam = officialToDeskTeam[row.team_name] || row.team_name
    if (!map.has(deskTeam)) map.set(deskTeam, [])
    map.get(deskTeam).push(row)
    return map
  }, new Map())

  return Object.fromEntries(
    [...grouped.entries()].map(([teamName, relievers]) => {
      const filtered = relievers.filter((reliever) => {
        if (starterNames.has(reliever.pitcher_name)) return false
        return Number(reliever.avg_outs_per_appearance ?? 0) <= 8.5
      })
      const activePool = filtered.length ? filtered : relievers
      const relieversWithReset = activePool.map((reliever) => ({
        ...reliever,
        ...buildRelieverResetProfile(reliever, reuseProfiles)
      }))
      const heavyUseRemoved = relieversWithReset.filter((reliever) => reliever.heavyUseResetFlag)
      const resetFiltered = relieversWithReset.filter((reliever) => !reliever.heavyUseResetFlag)
      const rankingPool = resetFiltered.length ? resetFiltered : relieversWithReset
      const chosen = rankingPool.slice(0, 2)
      const remainingDepth = summarizeBullpenDepth(rankingPool)
      remainingDepth.removedHeavyUseCount = heavyUseRemoved.length

      return [
        teamName,
        {
          opponent: opponentByTeam[teamName] || '',
          remainingDepth,
          topRelievers: chosen.map((reliever) => ({
            ...(safeJsonParse(reliever.raw_json) || {}),
            pitcherId: Number(reliever.pitcher_id || 0) || null,
            name: reliever.pitcher_name,
            role: reliever.likely_role || 'middle',
            firstRelieverLikelihood: Number(Number(reliever.first_reliever_likelihood || 0).toFixed(2)),
            availabilityScore: Number(Number(reliever.availability_score || 0).toFixed(2)),
            bridgeScore: Number(Number(reliever.bridge_score || 0).toFixed(1)),
            expectedOuts: Number(Number(reliever.avg_outs_per_appearance || 0).toFixed(2)),
            workedYesterday: Boolean(reliever.worked_yesterday_flag),
            backToBack: Boolean(reliever.back_to_back_flag),
            lastAppearanceDate: reliever.last_appearance_date || '',
            daysSinceLastAppearance: Number(reliever.days_since_last_appearance || 0) || 0,
            lastAppearancePitches: Number(reliever.last_appearance_pitches || 0) || 0,
            lastAppearanceOuts: Number(reliever.last_appearance_outs || 0) || 0,
            adaptivePitchResetThreshold: reliever.adaptivePitchResetThreshold ?? null,
            quickReuseSample: reliever.quickReuseSample ?? 0,
            quickReusePitchCeiling: reliever.quickReusePitchCeiling ?? null,
            heavyUseResetScore: reliever.heavyUseResetScore ?? 0,
            heavyUseResetFlag: Boolean(reliever.heavyUseResetFlag)
          }))
        }
      ]
    })
  )
}

const buildRecentBullpenTrendByTeam = ({ date, games }) => {
  const teams = [...new Set(games.flatMap((game) => [game.away, game.home]).filter(Boolean))]
  if (!teams.length) return {}

  const quotedTeams = teams
    .map((team) => deskToOfficialTeam[team] || team)
    .map((team) => `'${team.replace(/'/g, "''")}'`)
    .join(',')

  const rows = runSqliteJson(
    `select team_name, game_pk, game_date, outs_recorded, runs_allowed, earned_runs, hits_allowed, walks_allowed, strikeouts
     from mlb_pitcher_appearances
     where pitcher_role='reliever'
       and game_date < '${date}'
       and team_name in (${quotedTeams})
     order by team_name, game_date desc, game_pk desc, entry_order asc;`
  )

  const grouped = rows.reduce((map, row) => {
    const deskTeam = officialToDeskTeam[row.team_name] || row.team_name
    if (!map.has(deskTeam)) map.set(deskTeam, [])
    map.get(deskTeam).push(row)
    return map
  }, new Map())

  return Object.fromEntries(
    [...grouped.entries()].map(([teamName, appearances]) => {
      const recentGameIds = []
      const seen = new Set()
      for (const row of appearances) {
        const gamePk = Number(row.game_pk || 0) || 0
        if (!gamePk || seen.has(gamePk)) continue
        seen.add(gamePk)
        recentGameIds.push(gamePk)
        if (recentGameIds.length >= 5) break
      }
      const recentGameIdSet = new Set(recentGameIds)
      const recentRows = appearances.filter((row) => recentGameIdSet.has(Number(row.game_pk || 0) || 0))
      const outsRecorded = recentRows.reduce((sum, row) => sum + (Number(row.outs_recorded || 0) || 0), 0)
      const inningsPitched = outsRecorded / 3
      const earnedRuns = recentRows.reduce((sum, row) => sum + (Number(row.earned_runs || 0) || 0), 0)
      const runsAllowed = recentRows.reduce((sum, row) => sum + (Number(row.runs_allowed || 0) || 0), 0)
      const hitsAllowed = recentRows.reduce((sum, row) => sum + (Number(row.hits_allowed || 0) || 0), 0)
      const walksAllowed = recentRows.reduce((sum, row) => sum + (Number(row.walks_allowed || 0) || 0), 0)
      const strikeouts = recentRows.reduce((sum, row) => sum + (Number(row.strikeouts || 0) || 0), 0)
      const gamesSample = recentGameIds.length
      const era = inningsPitched > 0 ? (earnedRuns * 9) / inningsPitched : null
      const whip = inningsPitched > 0 ? (hitsAllowed + walksAllowed) / inningsPitched : null
      return [
        teamName,
        {
          gamesSample,
          inningsPitched: roundMaybe(inningsPitched),
          era: roundMaybe(era),
          whip: roundMaybe(whip),
          runsAllowedPerGame: gamesSample > 0 ? roundMaybe(runsAllowed / gamesSample) : null,
          strikeoutsPerGame: gamesSample > 0 ? roundMaybe(strikeouts / gamesSample) : null
        }
      ]
    })
  )
}

const roundMaybe = (value, digits = 2) => {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? Number(numeric.toFixed(digits)) : null
}

const isOnBaseEventType = (eventType = '') => {
  const normalized = String(eventType || '').toLowerCase()
  if (!normalized) return false
  if (['single', 'double', 'triple', 'home_run', 'walk', 'intent_walk', 'hit_by_pitch', 'catcher_interference'].includes(normalized)) {
    return true
  }
  return normalized.includes('error')
}

const daysBetweenIso = (earlierIsoDate = '', laterIsoDate = '') => {
  if (!earlierIsoDate || !laterIsoDate) return null
  const earlier = new Date(`${earlierIsoDate}T12:00:00Z`)
  const later = new Date(`${laterIsoDate}T12:00:00Z`)
  const diff = later.getTime() - earlier.getTime()
  return Number.isFinite(diff) ? Math.round(diff / 86400000) : null
}

const choosePreferredPitcherForm = (rows = []) => {
  if (!rows.length) return null

  return [...rows].sort((left, right) => {
    const sampleGap = Number(right.starts_sample || 0) - Number(left.starts_sample || 0)
    if (sampleGap !== 0) return sampleGap

    const windowGap = Math.abs(Number(left.window_starts || 99) - 3) - Math.abs(Number(right.window_starts || 99) - 3)
    if (windowGap !== 0) return windowGap

    return Number(left.window_starts || 99) - Number(right.window_starts || 99)
  })[0]
}

const buildRecentStarterFormByPitcherId = ({ date, games }) => {
  const pitcherIds = [
    ...new Set(
      games.flatMap((game) => [game.awayPitcher?.id, game.homePitcher?.id]).filter((value) => Number.isFinite(value))
    )
  ]

  if (!pitcherIds.length) return {}

  const rows = runSqliteJson(
    `select pitcher_id, pitcher_name, window_starts, starts_sample, innings_per_start, earned_runs_per_start, hits_allowed_per_start, home_runs_allowed_per_start, walks_allowed_per_start, strikeouts_per_start, whip_like, short_start_rate, quality_start_rate, run_volatility, home_run_burstiness, recent_3_earned_runs_delta from mlb_starting_pitcher_rolling_form where as_of_date='${date}' and pitcher_id in (${pitcherIds.join(',')}) order by pitcher_id, window_starts;`
  )

  const grouped = rows.reduce((map, row) => {
    const key = Number(row.pitcher_id)
    if (!map.has(key)) map.set(key, [])
    map.get(key).push(row)
    return map
  }, new Map())

  return Object.fromEntries(
    [...grouped.entries()].map(([pitcherId, pitcherRows]) => {
      const chosen = choosePreferredPitcherForm(pitcherRows)
      if (!chosen) return [pitcherId, null]

      return [
        pitcherId,
        {
          pitcherName: chosen.pitcher_name || '',
          windowStarts: Number(chosen.window_starts || 0) || null,
          startsSample: Number(chosen.starts_sample || 0) || 0,
          inningsPerStart: roundMaybe(chosen.innings_per_start),
          earnedRunsPerStart: roundMaybe(chosen.earned_runs_per_start),
          hitsAllowedPerStart: roundMaybe(chosen.hits_allowed_per_start),
          homeRunsAllowedPerStart: roundMaybe(chosen.home_runs_allowed_per_start),
          walksAllowedPerStart: roundMaybe(chosen.walks_allowed_per_start),
          strikeoutsPerStart: roundMaybe(chosen.strikeouts_per_start),
          whipLike: roundMaybe(chosen.whip_like),
          shortStartRate: roundMaybe(chosen.short_start_rate),
          qualityStartRate: roundMaybe(chosen.quality_start_rate),
          runVolatility: roundMaybe(chosen.run_volatility),
          homeRunBurstiness: roundMaybe(chosen.home_run_burstiness),
          recent3EarnedRunsDelta: roundMaybe(chosen.recent_3_earned_runs_delta)
        }
      ]
    })
  )
}

const buildStarterUsageContextByPitcherId = ({ date, games }) => {
  const pitcherIds = [
    ...new Set(
      games.flatMap((game) => [game.awayPitcher?.id, game.homePitcher?.id]).filter((value) => Number.isFinite(value))
    )
  ]

  if (!pitcherIds.length) return {}

  const rows = runSqliteJson(
    `select pitcher_id, pitcher_name, count(*) as starts_loaded, min(game_date) as first_start_date, max(game_date) as last_start_date, avg(innings_pitched) as avg_innings_per_start, avg(pitches_thrown) as avg_pitches, sum(case when innings_pitched < 4 then 1 else 0 end) as short_starts, sum(case when innings_pitched >= 6 then 1 else 0 end) as durable_starts from mlb_starting_pitcher_game_logs where game_date < '${date}' and pitcher_id in (${pitcherIds.join(',')}) and innings_pitched is not null and outs_recorded is not null group by pitcher_id, pitcher_name;`
  )

  return Object.fromEntries(
    rows.map((row) => [
      Number(row.pitcher_id),
      {
        startsLoaded: Number(row.starts_loaded || 0) || 0,
        firstStartDate: row.first_start_date || '',
        lastStartDate: row.last_start_date || '',
        avgInningsPerStart: roundMaybe(row.avg_innings_per_start),
        avgPitches: roundMaybe(row.avg_pitches, 0),
        shortStartRate:
          Number(row.starts_loaded || 0) > 0 ? roundMaybe(Number(row.short_starts || 0) / Number(row.starts_loaded || 1)) : null,
        durableStartRate:
          Number(row.starts_loaded || 0) > 0 ? roundMaybe(Number(row.durable_starts || 0) / Number(row.starts_loaded || 1)) : null
      }
    ])
  )
}

const buildStarterLeashByPitcherId = ({ date, games, windowStarts = 5 }) => {
  const pitcherIds = [
    ...new Set(
      games.flatMap((game) => [game.awayPitcher?.id, game.homePitcher?.id]).filter((value) => Number.isFinite(value))
    )
  ]

  if (!pitcherIds.length) return {}

  const rows = runSqliteJson(
    `select pitcher_id, pitcher_name, window_starts, starts_sample, outs_per_start, innings_per_start, pitches_per_start, short_start_rate, five_plus_inning_rate, six_plus_inning_rate, ninety_pitch_rate, leash_volatility, recent_3_outs_delta, leash_score from mlb_starter_leash_profiles where as_of_date='${date}' and window_starts=${windowStarts} and pitcher_id in (${pitcherIds.join(',')}) order by pitcher_id;`
  )

  return Object.fromEntries(
    rows.map((row) => [
      Number(row.pitcher_id),
      {
        pitcherName: row.pitcher_name || '',
        windowStarts: Number(row.window_starts || 0) || null,
        startsSample: Number(row.starts_sample || 0) || 0,
        outsPerStart: roundMaybe(row.outs_per_start),
        inningsPerStart: roundMaybe(row.innings_per_start),
        pitchesPerStart: roundMaybe(row.pitches_per_start, 0),
        shortStartRate: roundMaybe(row.short_start_rate),
        fivePlusInningRate: roundMaybe(row.five_plus_inning_rate),
        sixPlusInningRate: roundMaybe(row.six_plus_inning_rate),
        ninetyPitchRate: roundMaybe(row.ninety_pitch_rate),
        leashVolatility: roundMaybe(row.leash_volatility),
        recent3OutsDelta: roundMaybe(row.recent_3_outs_delta),
        leashScore: roundMaybe(row.leash_score)
      }
    ])
  )
}

const buildPitcherStartHistoryByPitcherId = ({ date, games, seasonYear = season }) => {
  const pitcherIds = [
    ...new Set(
      games.flatMap((game) => [game.awayPitcher?.id, game.homePitcher?.id]).filter((value) => Number.isFinite(value))
    )
  ]

  if (!pitcherIds.length) return {}

  const seasonStart = `${seasonYear}-01-01`
  const rows = runSqliteJson(
    `with first_inning as (
      select
        game_pk,
        pitcher_id,
        sum(coalesce(run_delta, 0)) as first_inning_runs_allowed
      from mlb_plate_appearances
      where inning = 1
        and pitcher_id in (${pitcherIds.join(',')})
      group by game_pk, pitcher_id
    )
    select
      gl.game_pk,
      gl.game_date,
      gl.team_role,
      gl.team_name,
      gl.opponent_name,
      gl.pitcher_id,
      gl.pitcher_name,
      gl.pitch_hand,
      gl.innings_pitched,
      gl.outs_recorded,
      gl.runs_allowed,
      gl.earned_runs,
      gl.hits_allowed,
      gl.home_runs_allowed,
      gl.walks_allowed,
      gl.strikeouts,
      gl.pitches_thrown,
      v.name as venue_name,
      case when gl.team_role = 'away' then go.away_runs else go.home_runs end as team_runs,
      case when gl.team_role = 'away' then go.home_runs else go.away_runs end as opponent_runs,
      coalesce(fi.first_inning_runs_allowed, 0) as first_inning_runs_allowed
    from mlb_starting_pitcher_game_logs gl
    join mlb_games g
      on g.game_pk = gl.game_pk
    left join games typed_game
      on typed_game.mlb_game_pk = g.game_pk
    left join venues v
      on v.venue_id = typed_game.venue_id
    left join game_outcomes go
      on go.game_id = typed_game.game_id
    left join first_inning fi
      on fi.game_pk = gl.game_pk
     and fi.pitcher_id = gl.pitcher_id
    where gl.pitcher_id in (${pitcherIds.join(',')})
      and gl.game_date < '${date}'
      and gl.game_date >= '${seasonStart}'
    order by gl.pitcher_id, gl.game_date desc, gl.game_pk desc;`
  )

  const grouped = rows.reduce((map, row) => {
    const pitcherId = Number(row.pitcher_id || 0)
    if (!pitcherId) return map
    if (!map.has(pitcherId)) map.set(pitcherId, [])
    map.get(pitcherId).push(row)
    return map
  }, new Map())

  return Object.fromEntries(
    [...grouped.entries()].map(([pitcherId, pitcherRows]) => [
      pitcherId,
      pitcherRows.map((row) => {
        const inningsFloat = Number(row.innings_pitched || 0) || 0
        const teamRuns = Number(row.team_runs)
        const opponentRuns = Number(row.opponent_runs)
        const teamResult =
          Number.isFinite(teamRuns) && Number.isFinite(opponentRuns)
            ? teamRuns > opponentRuns
              ? 'W'
              : teamRuns < opponentRuns
                ? 'L'
                : 'T'
            : ''
        const earnedRuns = Number(row.earned_runs || 0) || 0
        const firstInningRunsAllowed = Number(row.first_inning_runs_allowed || 0) || 0
        return {
          gamePk: Number(row.game_pk || 0) || null,
          date: row.game_date || '',
          venueRole: row.team_role === 'home' ? 'home' : 'road',
          venueName: row.venue_name || '',
          teamName: officialToDeskTeam[row.team_name] || row.team_name || '',
          opponentName: officialToDeskTeam[row.opponent_name] || row.opponent_name || '',
          pitcherName: row.pitcher_name || '',
          pitchHand: row.pitch_hand || '',
          inningsPitched: roundMaybe(inningsFloat, 1),
          inningsPitchedLabel: inningsFloat > 0 ? formatInningsString(inningsFloat) : '-',
          outsRecorded: Number(row.outs_recorded || 0) || 0,
          runsAllowed: Number(row.runs_allowed || 0) || 0,
          earnedRuns,
          hitsAllowed: Number(row.hits_allowed || 0) || 0,
          walksAllowed: Number(row.walks_allowed || 0) || 0,
          strikeouts: Number(row.strikeouts || 0) || 0,
          homeRunsAllowed: Number(row.home_runs_allowed || 0) || 0,
          pitchesThrown: Number(row.pitches_thrown || 0) || 0,
          teamRuns: Number.isFinite(teamRuns) ? teamRuns : null,
          opponentRuns: Number.isFinite(opponentRuns) ? opponentRuns : null,
          teamResult,
          qualityStart: inningsFloat >= 6 && earnedRuns <= 3,
          firstInningRunsAllowed,
          firstInningOutcome: firstInningRunsAllowed > 0 ? (firstInningRunsAllowed === 1 ? 'RFI' : `${firstInningRunsAllowed}RFI`) : 'NRFI'
        }
      })
    ])
  )
}

const buildTeamStoryPriorsByTeam = ({ date, games, windowGames = 10 }) => {
  const teams = [...new Set(games.flatMap((game) => [game.away, game.home]).filter(Boolean))]

  if (!teams.length) return {}

  const officialTeams = teams.map((team) => deskToOfficialTeam[team] || team).filter(Boolean)
  const quotedTeams = officialTeams.map((team) => `'${team.replace(/'/g, "''")}'`).join(',')
  const rows = runSqliteJson(
    `select team_name, window_games, games_sample, win_rate, quiet_first5_rate, first_inning_jolt_rate, comeback_win_rate, blew_lead_loss_rate, bullpen_flip_win_rate, bullpen_flip_loss_rate, late_break_rate, starter_cracked_rate, traffic_no_conversion_rate, low_total_game_rate, high_total_game_rate, avg_first_scoring_inning, avg_total_runs_first5, avg_total_runs_final, story_instability_index from mlb_team_story_priors where as_of_date='${date}' and window_games=${windowGames} and team_name in (${quotedTeams}) order by team_name;`
  )

  return Object.fromEntries(
    rows.map((row) => {
      const deskTeam = officialToDeskTeam[row.team_name] || row.team_name
      return [
        deskTeam,
        {
          windowGames: Number(row.window_games || 0) || null,
          gamesSample: Number(row.games_sample || 0) || 0,
          winRate: roundMaybe(row.win_rate),
          quietFirst5Rate: roundMaybe(row.quiet_first5_rate),
          firstInningJoltRate: roundMaybe(row.first_inning_jolt_rate),
          comebackWinRate: roundMaybe(row.comeback_win_rate),
          blewLeadLossRate: roundMaybe(row.blew_lead_loss_rate),
          bullpenFlipWinRate: roundMaybe(row.bullpen_flip_win_rate),
          bullpenFlipLossRate: roundMaybe(row.bullpen_flip_loss_rate),
          lateBreakRate: roundMaybe(row.late_break_rate),
          starterCrackedRate: roundMaybe(row.starter_cracked_rate),
          trafficNoConversionRate: roundMaybe(row.traffic_no_conversion_rate),
          lowTotalGameRate: roundMaybe(row.low_total_game_rate),
          highTotalGameRate: roundMaybe(row.high_total_game_rate),
          avgFirstScoringInning: roundMaybe(row.avg_first_scoring_inning),
          avgTotalRunsFirst5: roundMaybe(row.avg_total_runs_first5),
          avgTotalRunsFinal: roundMaybe(row.avg_total_runs_final),
          storyInstabilityIndex: roundMaybe(row.story_instability_index)
        }
      ]
    })
  )
}

const buildTeamStateByTeam = ({ date, games }) => {
  const teams = [...new Set(games.flatMap((game) => [game.away, game.home]).filter(Boolean))]

  if (!teams.length) return {}

  const officialTeams = teams.map((team) => deskToOfficialTeam[team] || team).filter(Boolean)
  const quotedTeams = officialTeams.map((team) => `'${team.replace(/'/g, "''")}'`).join(',')
  const rows = runSqliteJson(
    `select team_name, scheduled_opponent, scheduled_series_game_number, division_matchup_flag, games_sample, previous_result, streak_direction, streak_length, win_pct_last3, win_pct_last5, run_diff_last3, run_diff_last5, close_loss_count_last5, blowout_win_count_last5, blowout_loss_count_last5, comeback_win_count_last5, bullpen_flip_loss_count_last5, quiet_first5_count_last5, first_inning_jolt_count_last5, opponent_win_pct_last5, snapback_pressure_index, heat_regression_index, form_pressure_index from mlb_team_state_snapshots where as_of_date='${date}' and team_name in (${quotedTeams}) order by team_name;`
  )

  return Object.fromEntries(
    rows.map((row) => {
      const deskTeam = officialToDeskTeam[row.team_name] || row.team_name
      return [
        deskTeam,
        {
          scheduledOpponent: officialToDeskTeam[row.scheduled_opponent] || row.scheduled_opponent || '',
          scheduledSeriesGameNumber: Number(row.scheduled_series_game_number || 0) || null,
          divisionMatchupFlag: Boolean(row.division_matchup_flag),
          gamesSample: Number(row.games_sample || 0) || 0,
          previousResult: row.previous_result || null,
          streakDirection: row.streak_direction || null,
          streakLength: Number(row.streak_length || 0) || 0,
          winPctLast3: roundMaybe(row.win_pct_last3),
          winPctLast5: roundMaybe(row.win_pct_last5),
          runDiffLast3: roundMaybe(row.run_diff_last3),
          runDiffLast5: roundMaybe(row.run_diff_last5),
          closeLossCountLast5: Number(row.close_loss_count_last5 || 0) || 0,
          blowoutWinCountLast5: Number(row.blowout_win_count_last5 || 0) || 0,
          blowoutLossCountLast5: Number(row.blowout_loss_count_last5 || 0) || 0,
          comebackWinCountLast5: Number(row.comeback_win_count_last5 || 0) || 0,
          bullpenFlipLossCountLast5: Number(row.bullpen_flip_loss_count_last5 || 0) || 0,
          quietFirst5CountLast5: Number(row.quiet_first5_count_last5 || 0) || 0,
          firstInningJoltCountLast5: Number(row.first_inning_jolt_count_last5 || 0) || 0,
          opponentWinPctLast5: roundMaybe(row.opponent_win_pct_last5),
          snapbackPressureIndex: roundMaybe(row.snapback_pressure_index),
          heatRegressionIndex: roundMaybe(row.heat_regression_index),
          formPressureIndex: roundMaybe(row.form_pressure_index)
        }
      ]
    })
  )
}

const buildTeamMistakeShapeByTeam = ({ date, games, windowGames = 8 }) => {
  const teams = [...new Set(games.flatMap((game) => [game.away, game.home]).filter(Boolean))]

  if (!teams.length) return {}

  const officialTeams = teams.map((team) => deskToOfficialTeam[team] || team).filter(Boolean)
  const quotedTeams = officialTeams.map((team) => `'${team.replace(/'/g, "''")}'`).join(',')
  const rows = runSqliteJson(
    `select team_name, window_games, games_sample, low_scoring_game_rate, high_scoring_game_rate, scoreless_first3_rate, first_inning_run_allowed_rate, early_multi_run_allowed_rate, one_big_inning_rate, one_bad_inning_allowed_rate, traffic_game_rate, dead_bat_traffic_rate, traffic_no_conversion_rate, base_runner_conversion_rate, stranded_traffic_rate, top_order_pressure_no_conversion_rate, bullpen_meltdown_rate, run_clustering_index, mistake_chaos_index from mlb_team_mistake_shape_daily where as_of_date='${date}' and window_games=${windowGames} and team_name in (${quotedTeams}) order by team_name;`
  )

  return Object.fromEntries(
    rows.map((row) => {
      const deskTeam = officialToDeskTeam[row.team_name] || row.team_name
      return [
        deskTeam,
        {
          windowGames: Number(row.window_games || 0) || null,
          gamesSample: Number(row.games_sample || 0) || 0,
          lowScoringGameRate: roundMaybe(row.low_scoring_game_rate),
          highScoringGameRate: roundMaybe(row.high_scoring_game_rate),
          scorelessFirst3Rate: roundMaybe(row.scoreless_first3_rate),
          firstInningRunAllowedRate: roundMaybe(row.first_inning_run_allowed_rate),
          earlyMultiRunAllowedRate: roundMaybe(row.early_multi_run_allowed_rate),
          oneBigInningRate: roundMaybe(row.one_big_inning_rate),
          oneBadInningAllowedRate: roundMaybe(row.one_bad_inning_allowed_rate),
          trafficGameRate: roundMaybe(row.traffic_game_rate),
          deadBatTrafficRate: roundMaybe(row.dead_bat_traffic_rate),
          trafficNoConversionRate: roundMaybe(row.traffic_no_conversion_rate),
          baseRunnerConversionRate: roundMaybe(row.base_runner_conversion_rate),
          strandedTrafficRate: roundMaybe(row.stranded_traffic_rate),
          topOrderPressureNoConversionRate: roundMaybe(row.top_order_pressure_no_conversion_rate),
          bullpenMeltdownRate: roundMaybe(row.bullpen_meltdown_rate),
          runClusteringIndex: roundMaybe(row.run_clustering_index),
          mistakeChaosIndex: roundMaybe(row.mistake_chaos_index)
        }
      ]
    })
  )
}

const buildLineupConversionShapeByTeam = ({ date, games, windowGames = 8 }) => {
  const teams = [...new Set(games.flatMap((game) => [game.away, game.home]).filter(Boolean))]

  if (!teams.length) return {}

  const officialTeams = teams.map((team) => deskToOfficialTeam[team] || team).filter(Boolean)
  const quotedTeams = officialTeams.map((team) => `'${team.replace(/'/g, "''")}'`).join(',')
  const rows = runSqliteJson(
    `select team_name, window_games, games_sample, baserunners_per_game, runs_per_baserunner, stranded_traffic_rate, early_baserunners_per_game, early_conversion_rate, top_order_baserunners_first3_per_game, top_order_conversion_share, traffic_no_conversion_rate, dead_bat_traffic_rate, quiet_first5_rate, conversion_volatility, lineup_conversion_index from mlb_lineup_conversion_shape_daily where as_of_date='${date}' and window_games=${windowGames} and team_name in (${quotedTeams}) order by team_name;`
  )

  return Object.fromEntries(
    rows.map((row) => {
      const deskTeam = officialToDeskTeam[row.team_name] || row.team_name
      return [
        deskTeam,
        {
          windowGames: Number(row.window_games || 0) || null,
          gamesSample: Number(row.games_sample || 0) || 0,
          baserunnersPerGame: roundMaybe(row.baserunners_per_game),
          runsPerBaserunner: roundMaybe(row.runs_per_baserunner),
          strandedTrafficRate: roundMaybe(row.stranded_traffic_rate),
          earlyBaserunnersPerGame: roundMaybe(row.early_baserunners_per_game),
          earlyConversionRate: roundMaybe(row.early_conversion_rate),
          topOrderBaserunnersFirst3PerGame: roundMaybe(row.top_order_baserunners_first3_per_game),
          topOrderConversionShare: roundMaybe(row.top_order_conversion_share),
          trafficNoConversionRate: roundMaybe(row.traffic_no_conversion_rate),
          deadBatTrafficRate: roundMaybe(row.dead_bat_traffic_rate),
          quietFirst5Rate: roundMaybe(row.quiet_first5_rate),
          conversionVolatility: roundMaybe(row.conversion_volatility),
          lineupConversionIndex: roundMaybe(row.lineup_conversion_index)
        }
      ]
    })
  )
}

const buildBullpenMistakeShapeByTeam = ({ date, games, windowDays = 14 }) => {
  const teams = [...new Set(games.flatMap((game) => [game.away, game.home]).filter(Boolean))]

  if (!teams.length) return {}

  const officialTeams = teams.map((team) => deskToOfficialTeam[team] || team).filter(Boolean)
  const quotedTeams = officialTeams.map((team) => `'${team.replace(/'/g, "''")}'`).join(',')
  const rows = runSqliteJson(
    `select team_name, window_days, appearances_sample, games_sample, first_batter_reach_rate, first_batter_walk_rate, meltdown_appearance_rate, home_run_appearance_rate, inherited_traffic_entry_rate, inherited_traffic_score_rate, bullpen_meltdown_game_rate, lead_loss_after_entry_rate, bridge_clean_game_rate, bullpen_chaos_index from mlb_bullpen_mistake_shape_daily where as_of_date='${date}' and window_days=${windowDays} and team_name in (${quotedTeams}) order by team_name;`
  )

  return Object.fromEntries(
    rows.map((row) => {
      const deskTeam = officialToDeskTeam[row.team_name] || row.team_name
      return [
        deskTeam,
        {
          windowDays: Number(row.window_days || 0) || null,
          appearancesSample: Number(row.appearances_sample || 0) || 0,
          gamesSample: Number(row.games_sample || 0) || 0,
          firstBatterReachRate: roundMaybe(row.first_batter_reach_rate),
          firstBatterWalkRate: roundMaybe(row.first_batter_walk_rate),
          meltdownAppearanceRate: roundMaybe(row.meltdown_appearance_rate),
          homeRunAppearanceRate: roundMaybe(row.home_run_appearance_rate),
          inheritedTrafficEntryRate: roundMaybe(row.inherited_traffic_entry_rate),
          inheritedTrafficScoreRate: roundMaybe(row.inherited_traffic_score_rate),
          bullpenMeltdownGameRate: roundMaybe(row.bullpen_meltdown_game_rate),
          leadLossAfterEntryRate: roundMaybe(row.lead_loss_after_entry_rate),
          bridgeCleanGameRate: roundMaybe(row.bridge_clean_game_rate),
          bullpenChaosIndex: roundMaybe(row.bullpen_chaos_index)
        }
      ]
    })
  )
}

const buildFirstInningTeamProfilesByTeam = ({ date, games, windowGames = 8 }) => {
  const teams = [...new Set(games.flatMap((game) => [game.away, game.home]).filter(Boolean))]

  if (!teams.length) return {}

  const officialTeams = teams.map((team) => deskToOfficialTeam[team] || team).filter(Boolean)
  const quotedTeams = officialTeams.map((team) => `'${team.replace(/'/g, "''")}'`).join(',')
  const rows = runSqliteJson(
    `select team_name, window_games, games_sample, first_inning_runs_per_game, first_inning_runs_allowed_per_game, scored_first_inning_rate, scoreless_first_inning_rate, allowed_first_inning_rate, first_inning_multi_run_rate, first_inning_multi_run_allowed_rate, nrfi_game_rate, yrfi_game_rate, first_inning_net_edge, first_inning_scoring_index, first_inning_allow_risk_index from mlb_team_first_inning_profiles_daily where as_of_date='${date}' and window_games=${windowGames} and team_name in (${quotedTeams}) order by team_name;`
  )

  return Object.fromEntries(
    rows.map((row) => {
      const deskTeam = officialToDeskTeam[row.team_name] || row.team_name
      return [
        deskTeam,
        {
          windowGames: Number(row.window_games || 0) || null,
          gamesSample: Number(row.games_sample || 0) || 0,
          firstInningRunsPerGame: roundMaybe(row.first_inning_runs_per_game),
          firstInningRunsAllowedPerGame: roundMaybe(row.first_inning_runs_allowed_per_game),
          scoredFirstInningRate: roundMaybe(row.scored_first_inning_rate),
          scorelessFirstInningRate: roundMaybe(row.scoreless_first_inning_rate),
          allowedFirstInningRate: roundMaybe(row.allowed_first_inning_rate),
          firstInningMultiRunRate: roundMaybe(row.first_inning_multi_run_rate),
          firstInningMultiRunAllowedRate: roundMaybe(row.first_inning_multi_run_allowed_rate),
          nrfiGameRate: roundMaybe(row.nrfi_game_rate),
          yrfiGameRate: roundMaybe(row.yrfi_game_rate),
          firstInningNetEdge: roundMaybe(row.first_inning_net_edge),
          firstInningScoringIndex: roundMaybe(row.first_inning_scoring_index),
          firstInningAllowRiskIndex: roundMaybe(row.first_inning_allow_risk_index)
        }
      ]
    })
  )
}

const buildFirstInningPitcherProfilesByPitcherId = ({ date, games, windowStarts = 5 }) => {
  const pitcherIds = [
    ...new Set(
      games
        .flatMap((game) => [Number(game.awayPitcher?.id), Number(game.homePitcher?.id)])
        .filter(Number.isFinite)
    )
  ]

  if (!pitcherIds.length) return {}

  const rows = runSqliteJson(
    `select pitcher_id, pitcher_name, window_starts, starts_sample, first_batter_reach_rate, first_inning_run_allowed_rate, first_inning_runs_allowed_per_start, first_inning_multi_run_allowed_rate, first_inning_baserunners_per_start, first_inning_walk_rate, first_inning_home_run_rate, first_inning_clean_rate, first_inning_pressure_index from mlb_pitcher_first_inning_profiles_daily where as_of_date='${date}' and window_starts=${windowStarts} and pitcher_id in (${pitcherIds.join(',')}) order by pitcher_id;`
  )

  const profileByPitcherId = Object.fromEntries(
    rows.map((row) => [
      Number(row.pitcher_id),
      {
        pitcherName: row.pitcher_name || null,
        windowStarts: Number(row.window_starts || 0) || null,
        startsSample: Number(row.starts_sample || 0) || 0,
        firstBatterReachRate: roundMaybe(row.first_batter_reach_rate),
        firstInningRunAllowedRate: roundMaybe(row.first_inning_run_allowed_rate),
        firstInningRunsAllowedPerStart: roundMaybe(row.first_inning_runs_allowed_per_start),
        firstInningMultiRunAllowedRate: roundMaybe(row.first_inning_multi_run_allowed_rate),
        firstInningBaserunnersPerStart: roundMaybe(row.first_inning_baserunners_per_start),
        firstInningWalkRate: roundMaybe(row.first_inning_walk_rate),
        firstInningHomeRunRate: roundMaybe(row.first_inning_home_run_rate),
        firstInningCleanRate: roundMaybe(row.first_inning_clean_rate),
        firstInningPressureIndex: roundMaybe(row.first_inning_pressure_index)
      }
    ])
  )

  pitcherIds.forEach((pitcherId) => {
    if (profileByPitcherId[pitcherId]) return

    const startRows = runSqliteJson(
      `select pitcher_name, game_pk, game_date from mlb_starting_pitcher_game_logs where pitcher_id=${pitcherId} and game_date<'${date}' order by game_date desc, game_pk desc limit ${windowStarts};`
    )

    if (!startRows.length) return

    const packets = startRows
      .map((startRow) => {
        const paRows = runSqliteJson(
          `select at_bat_index, lower(coalesce(event_type, '')) as event_type, run_delta from mlb_plate_appearances where game_pk=${Number(startRow.game_pk)} and pitcher_id=${pitcherId} and inning=1 order by at_bat_index;`
        )

        if (!paRows.length) return null

        const firstPa = paRows[0]
        let baserunners = 0
        let runsAllowed = 0
        let walkFlag = 0
        let homeRunFlag = 0

        paRows.forEach((row) => {
          const eventType = row.event_type || ''
          const runDelta = Number(row.run_delta || 0) || 0
          runsAllowed += runDelta
          if (isOnBaseEventType(eventType)) baserunners += 1
          if (['walk', 'intent_walk', 'hit_by_pitch'].includes(eventType)) walkFlag = 1
          if (eventType === 'home_run') homeRunFlag = 1
        })

        return {
          firstBatterReachFlag: isOnBaseEventType(firstPa.event_type || '') ? 1 : 0,
          firstInningRunAllowedFlag: runsAllowed > 0 ? 1 : 0,
          firstInningMultiRunAllowedFlag: runsAllowed >= 2 ? 1 : 0,
          firstInningRunsAllowed: runsAllowed,
          firstInningBaserunners: baserunners,
          firstInningWalkFlag: walkFlag,
          firstInningHomeRunFlag: homeRunFlag,
          firstInningCleanFlag: runsAllowed === 0 ? 1 : 0
        }
      })
      .filter(Boolean)

    if (!packets.length) return

    const average = (values = []) => {
      if (!values.length) return null
      return values.reduce((sum, value) => sum + value, 0) / values.length
    }

    const firstBatterReachRate = average(packets.map((packet) => packet.firstBatterReachFlag))
    const firstInningRunAllowedRate = average(packets.map((packet) => packet.firstInningRunAllowedFlag))
    const firstInningRunsAllowedPerStart = average(packets.map((packet) => packet.firstInningRunsAllowed))
    const firstInningMultiRunAllowedRate = average(
      packets.map((packet) => packet.firstInningMultiRunAllowedFlag)
    )
    const firstInningBaserunnersPerStart = average(
      packets.map((packet) => packet.firstInningBaserunners)
    )
    const firstInningWalkRate = average(packets.map((packet) => packet.firstInningWalkFlag))
    const firstInningHomeRunRate = average(packets.map((packet) => packet.firstInningHomeRunFlag))
    const firstInningCleanRate = average(packets.map((packet) => packet.firstInningCleanFlag))
    const firstInningPressureIndex = roundMaybe(
      Math.max(
        0,
        Math.min(
          100,
          12 +
            (firstBatterReachRate || 0) * 18 +
            (firstInningRunAllowedRate || 0) * 28 +
            (firstInningRunsAllowedPerStart || 0) * 16 +
            (firstInningMultiRunAllowedRate || 0) * 18 +
            (firstInningBaserunnersPerStart || 0) * 8 +
            (firstInningWalkRate || 0) * 12 +
            (firstInningHomeRunRate || 0) * 14 -
            (firstInningCleanRate || 0) * 8
        )
      )
    )

    profileByPitcherId[pitcherId] = {
      pitcherName: startRows[0]?.pitcher_name || null,
      windowStarts,
      startsSample: packets.length,
      firstBatterReachRate: roundMaybe(firstBatterReachRate),
      firstInningRunAllowedRate: roundMaybe(firstInningRunAllowedRate),
      firstInningRunsAllowedPerStart: roundMaybe(firstInningRunsAllowedPerStart),
      firstInningMultiRunAllowedRate: roundMaybe(firstInningMultiRunAllowedRate),
      firstInningBaserunnersPerStart: roundMaybe(firstInningBaserunnersPerStart),
      firstInningWalkRate: roundMaybe(firstInningWalkRate),
      firstInningHomeRunRate: roundMaybe(firstInningHomeRunRate),
      firstInningCleanRate: roundMaybe(firstInningCleanRate),
      firstInningPressureIndex
    }
  })

  return profileByPitcherId
}

const buildSeasonFirstInningByPitcherId = ({ date, games }) => {
  const pitcherIds = [
    ...new Set(
      games
        .flatMap((game) => [Number(game.awayPitcher?.id), Number(game.homePitcher?.id)])
        .filter(Number.isFinite)
    )
  ]

  if (!pitcherIds.length) return {}

  const rows = runSqliteJson(
    `with starts as (
      select
        pitcher_id,
        max(pitcher_name) as pitcher_name,
        count(*) as starts_sample
      from mlb_starting_pitcher_game_logs
      where pitcher_id in (${pitcherIds.join(',')})
        and game_date < '${date}'
      group by pitcher_id
    ),
    first_inning as (
      select
        pa.pitcher_id,
        sum(coalesce(pa.run_delta, 0)) as first_inning_runs_allowed_total,
        count(distinct case when coalesce(pa.run_delta, 0) > 0 then pa.game_pk end) as first_inning_run_games,
        count(distinct case when lower(coalesce(pa.event_type, '')) in ('walk', 'intent_walk', 'hit_by_pitch') then pa.game_pk end) as first_inning_walk_games,
        count(distinct case when lower(coalesce(pa.event_type, '')) = 'home_run' then pa.game_pk end) as first_inning_home_run_games
      from mlb_plate_appearances pa
      join mlb_starting_pitcher_game_logs gl
        on gl.game_pk = pa.game_pk
       and gl.pitcher_id = pa.pitcher_id
      where pa.pitcher_id in (${pitcherIds.join(',')})
        and gl.game_date < '${date}'
        and pa.inning = 1
      group by pa.pitcher_id
    )
    select
      s.pitcher_id,
      s.pitcher_name,
      s.starts_sample,
      coalesce(fi.first_inning_runs_allowed_total, 0) as first_inning_runs_allowed_total,
      coalesce(fi.first_inning_run_games, 0) as first_inning_run_games,
      coalesce(fi.first_inning_walk_games, 0) as first_inning_walk_games,
      coalesce(fi.first_inning_home_run_games, 0) as first_inning_home_run_games
    from starts s
    left join first_inning fi on fi.pitcher_id = s.pitcher_id
    order by s.pitcher_id;`
  )

  return Object.fromEntries(
    rows.map((row) => {
      const startsSample = Number(row.starts_sample || 0) || 0
      const firstInningRunsAllowedTotal = Number(row.first_inning_runs_allowed_total || 0) || 0
      const firstInningRunGames = Number(row.first_inning_run_games || 0) || 0
      const firstInningWalkGames = Number(row.first_inning_walk_games || 0) || 0
      const firstInningHomeRunGames = Number(row.first_inning_home_run_games || 0) || 0
      return [
        Number(row.pitcher_id),
        {
          pitcherName: row.pitcher_name || null,
          startsSample,
          firstInningRunsAllowedTotal,
          firstInningRunGames,
          firstInningWalkGames,
          firstInningHomeRunGames,
          firstInningRunsAllowedPerStart: startsSample > 0 ? roundMaybe(firstInningRunsAllowedTotal / startsSample) : null,
          firstInningRunGameRate: startsSample > 0 ? roundMaybe(firstInningRunGames / startsSample) : null
        }
      ]
    })
  )
}

const buildPitcherWarByPitcherId = ({ date, games }) => {
  const pitcherIds = [
    ...new Set(
      games
        .flatMap((game) => [Number(game.awayPitcher?.id), Number(game.homePitcher?.id)])
        .filter((value) => Number.isFinite(value) && value > 0)
    )
  ]

  if (!pitcherIds.length) return {}

  const season = Number(date.slice(0, 4))
  const previousSeason = season - 1
  const rows = runSqliteJson(
    `select season, pitcher_id, pitcher_name, bref_player_id, team_ids, games, games_started, war
     from mlb_pitcher_war_by_season
     where pitcher_id in (${pitcherIds.join(',')})
       and season in (${previousSeason}, ${season})
     order by pitcher_id, season;`
  )

  return rows.reduce((map, row) => {
    const pitcherId = Number(row.pitcher_id || 0) || 0
    const rowSeason = Number(row.season || 0) || 0
    if (!pitcherId || !rowSeason) return map
    if (!map[pitcherId]) {
      map[pitcherId] = {
        pitcherName: row.pitcher_name || null,
        currentSeason: season,
        previousSeason,
        currentSeasonWar: null,
        previousSeasonWar: null,
        currentSeasonGames: null,
        previousSeasonGames: null,
        currentSeasonGamesStarted: null,
        previousSeasonGamesStarted: null,
        warDelta: null
      }
    }
    const entry = map[pitcherId]
    if (rowSeason === season) {
      entry.currentSeasonWar = roundMaybe(row.war)
      entry.currentSeasonGames = Number(row.games || 0) || 0
      entry.currentSeasonGamesStarted = Number(row.games_started || 0) || 0
    } else if (rowSeason === previousSeason) {
      entry.previousSeasonWar = roundMaybe(row.war)
      entry.previousSeasonGames = Number(row.games || 0) || 0
      entry.previousSeasonGamesStarted = Number(row.games_started || 0) || 0
    }
    if (Number.isFinite(Number(entry.currentSeasonWar)) && Number.isFinite(Number(entry.previousSeasonWar))) {
      entry.warDelta = roundMaybe(Number(entry.currentSeasonWar) - Number(entry.previousSeasonWar))
    }
    return map
  }, {})
}

const buildPitcherStrikeoutMarketsByGamePk = ({ date, games }) => {
  const gamePks = [...new Set(games.map((game) => Number(game.gamePk)).filter(Number.isFinite))]
  if (!gamePks.length) return {}

  const rows = runSqliteJson(`
    SELECT
      g.mlb_game_pk AS game_pk,
      p.player_name,
      p.line_value AS point,
      p.source_name,
      p.sportsbook,
      p.source_path,
      MAX(p.captured_at) AS captured_at,
      MAX(CASE WHEN p.selection='Over' THEN p.american_odds END) AS over_price,
      MAX(CASE WHEN p.selection='Under' THEN p.american_odds END) AS under_price
    FROM prop_market_snapshots p
    JOIN games g ON g.game_id=p.game_id
    WHERE p.market_date='${date}'
      AND p.market_key='pitcher_strikeouts'
      AND g.mlb_game_pk IN (${gamePks.join(',')})
    GROUP BY g.mlb_game_pk, p.player_name, p.line_value, p.source_name, p.sportsbook, p.source_path
    ORDER BY
      g.mlb_game_pk,
      p.player_name,
      CASE WHEN lower(p.source_name)='draftkings' THEN 1 ELSE 0 END,
      captured_at
  `)

  const byGamePk = {}
  rows.forEach((row) => {
    const gamePk = Number(row.game_pk)
    if (!Number.isFinite(gamePk)) return
    if (!byGamePk[gamePk]) byGamePk[gamePk] = {}
    byGamePk[gamePk][normalizeNameToken(row.player_name)] = {
      playerName: row.player_name,
      line: Number.isFinite(Number(row.point)) ? Number(row.point) : null,
      overPrice: Number.isFinite(Number(row.over_price)) ? Number(row.over_price) : null,
      underPrice: Number.isFinite(Number(row.under_price)) ? Number(row.under_price) : null,
      sportsbook: row.sportsbook || row.source_name || 'Prop market',
      sourceName: row.source_name || '',
      sourcePath: publicPropSourcePath(row.source_name, row.source_path),
      capturedAt: row.captured_at || ''
    }
  })

  const resolved = {}
  games.forEach((game) => {
    const gamePk = Number(game.gamePk)
    if (!Number.isFinite(gamePk)) return
    const marketRows = byGamePk[gamePk] ?? {}
    const awayKey = normalizeNameToken(game.awayPitcher?.fullName)
    const homeKey = normalizeNameToken(game.homePitcher?.fullName)
    resolved[gamePk] = {
      away: awayKey ? marketRows[awayKey] ?? null : null,
      home: homeKey ? marketRows[homeKey] ?? null : null
    }
  })

  return resolved
}

const buildStarterVsTeamStatmuseByGameSide = ({ date, games }) => {
  const gameIds = [...new Set(games.map((game) => game.id).filter(Boolean))]
  if (!gameIds.length) return {}

  const quotedGameIds = gameIds.map((gameId) => quoteSqlText(gameId)).join(',')
  const rows = runSqliteJson(
    `select
      game_id,
      pitcher_name,
      pitcher_team,
      opponent_team,
      statmuse_url,
      answer_text,
      appearances,
      games_started,
      wins,
      losses,
      era,
      strikeouts,
      innings_pitched,
      hits_allowed,
      earned_runs,
      runs_allowed,
      home_runs_allowed,
      walks,
      batters_faced,
      total_row_json,
      game_rows_json,
      fetched_at
    from mlb_starter_vs_team_statmuse
    where snapshot_date='${date}'
      and game_id in (${quotedGameIds})
    order by game_id, pitcher_team;`
  )

  const byGameId = Object.fromEntries(games.map((game) => [game.id, game]))
  const byGameSide = {}
  rows.forEach((row) => {
    const game = byGameId[row.game_id]
    if (!game) return
    const pitcherName = String(row.pitcher_name || '')
    const side =
      pitcherName && pitcherName === game.awayPitcher?.fullName
        ? 'away'
        : pitcherName && pitcherName === game.homePitcher?.fullName
          ? 'home'
          : row.pitcher_team === game.away
            ? 'away'
            : row.pitcher_team === game.home
              ? 'home'
              : ''
    if (!side) return

    byGameSide[`${row.game_id}:${side}`] = {
      source: 'StatMuse',
      sourceUrl: row.statmuse_url || '',
      answerText: row.answer_text || '',
      pitcherName: row.pitcher_name || '',
      pitcherTeam: row.pitcher_team || '',
      opponentTeam: row.opponent_team || '',
      appearances: Number(row.appearances || 0) || 0,
      gamesStarted: Number(row.games_started || 0) || 0,
      wins: row.wins !== null && row.wins !== undefined && Number.isFinite(Number(row.wins)) ? Number(row.wins) : null,
      losses: row.losses !== null && row.losses !== undefined && Number.isFinite(Number(row.losses)) ? Number(row.losses) : null,
      era: row.era !== null && row.era !== undefined && Number.isFinite(Number(row.era)) ? roundMaybe(row.era) : null,
      strikeouts: row.strikeouts !== null && row.strikeouts !== undefined && Number.isFinite(Number(row.strikeouts)) ? Number(row.strikeouts) : null,
      inningsPitched: row.innings_pitched || null,
      hitsAllowed: row.hits_allowed !== null && row.hits_allowed !== undefined && Number.isFinite(Number(row.hits_allowed)) ? Number(row.hits_allowed) : null,
      earnedRuns: row.earned_runs !== null && row.earned_runs !== undefined && Number.isFinite(Number(row.earned_runs)) ? Number(row.earned_runs) : null,
      runsAllowed: row.runs_allowed !== null && row.runs_allowed !== undefined && Number.isFinite(Number(row.runs_allowed)) ? Number(row.runs_allowed) : null,
      homeRunsAllowed: row.home_runs_allowed !== null && row.home_runs_allowed !== undefined && Number.isFinite(Number(row.home_runs_allowed)) ? Number(row.home_runs_allowed) : null,
      walks: row.walks !== null && row.walks !== undefined && Number.isFinite(Number(row.walks)) ? Number(row.walks) : null,
      battersFaced: row.batters_faced !== null && row.batters_faced !== undefined && Number.isFinite(Number(row.batters_faced)) ? Number(row.batters_faced) : null,
      totalRow: safeJsonParse(row.total_row_json, null),
      gameRows: safeJsonParse(row.game_rows_json, []),
      fetchedAt: row.fetched_at || ''
    }
  })

  return byGameSide
}

const buildEspnPitcherSplitsByGameSide = ({ date, games }) => {
  const gamePks = [...new Set(games.map((game) => Number(game.gamePk)).filter((gamePk) => Number.isFinite(gamePk) && gamePk > 0))]
  if (!gamePks.length) return {}

  const rows = runSqliteJson(
    `select
      g.mlb_game_pk as game_pk,
      splits.mlb_player_id,
      splits.espn_athlete_id,
      splits.pitcher_name,
      splits.pitcher_team,
      splits.opponent_team,
      splits.venue_name,
      splits.source_url,
      splits.source_status,
      splits.categories_json,
      splits.insights_json,
      splits.fetched_at
    from mlb_pitcher_espn_splits splits
    join games g on g.game_id = splits.game_id
    where splits.snapshot_date = '${date}'
      and g.mlb_game_pk in (${gamePks.join(',')})
    order by g.mlb_game_pk, splits.pitcher_name;`
  )

  const byGamePk = Object.fromEntries(games.map((game) => [Number(game.gamePk), game]))
  const byGameSide = {}
  rows.forEach((row) => {
    const game = byGamePk[Number(row.game_pk)]
    if (!game) return
    const mlbPlayerId = Number(row.mlb_player_id)
    const pitcherName = String(row.pitcher_name || '')
    const side =
      Number.isFinite(mlbPlayerId) && mlbPlayerId === Number(game.awayPitcher?.id)
        ? 'away'
        : Number.isFinite(mlbPlayerId) && mlbPlayerId === Number(game.homePitcher?.id)
          ? 'home'
          : pitcherName && pitcherName === game.awayPitcher?.fullName
            ? 'away'
            : pitcherName && pitcherName === game.homePitcher?.fullName
              ? 'home'
              : ''
    if (!side) return

    byGameSide[`${game.id}:${side}`] = {
      source: 'ESPN player splits',
      sourceUrl: row.source_url || '',
      sourceStatus: row.source_status || '',
      espnAthleteId: row.espn_athlete_id || '',
      pitcherName: row.pitcher_name || '',
      pitcherTeam: row.pitcher_team || '',
      opponentTeam: row.opponent_team || '',
      venueName: row.venue_name || '',
      categories: safeJsonParse(row.categories_json, []),
      insights: safeJsonParse(row.insights_json, []),
      fetchedAt: row.fetched_at || ''
    }
  })

  return byGameSide
}

const buildRecentGamesByTeam = ({ date, games, limit = 8 }) => {
  const teams = [...new Set(games.flatMap((game) => [game.away, game.home]).filter(Boolean))]

  if (!teams.length) return {}

  const officialTeams = teams.map((team) => deskToOfficialTeam[team] || team).filter(Boolean)
  const quotedTeams = officialTeams.map((team) => `'${team.replace(/'/g, "''")}'`).join(',')
  const rows = runSqliteJson(
    `with recent_team_games as (
      select
        g.mlb_game_pk as game_pk,
        tgs.game_date,
        g.start_time_utc as game_datetime,
        team.name as team_name,
        opponent.name as opponent_name,
        case when tgs.team_role = 'away' then 'road' else 'home' end as venue_role,
        tgs.runs_scored as runs_for,
        tgs.runs_allowed as runs_against,
        case
          when tgs.runs_scored > tgs.runs_allowed then 'W'
          when tgs.runs_scored < tgs.runs_allowed then 'L'
          else 'T'
        end as result
      from team_game_stats tgs
      join games g on g.game_id = tgs.game_id
      join teams team on team.team_id = tgs.team_id
      left join teams opponent on opponent.team_id = tgs.opponent_team_id
      where team.name in (${quotedTeams})
        and tgs.game_date < '${date}'
    ),
    ranked as (
      select
        *,
        row_number() over (
          partition by team_name
          order by coalesce(game_datetime, game_date) desc, game_pk desc
        ) as rn
      from recent_team_games
    )
    select *
    from ranked
    where rn <= ${Math.max(1, limit)}
    order by team_name, coalesce(game_datetime, game_date) asc, game_pk asc;`
  )

  const grouped = rows.reduce((map, row) => {
    const deskTeam = officialToDeskTeam[row.team_name] || row.team_name
    if (!map.has(deskTeam)) map.set(deskTeam, [])
    map.get(deskTeam).push({
      gamePk: Number(row.game_pk || 0) || null,
      date: row.game_date || '',
      opponent: officialToDeskTeam[row.opponent_name] || row.opponent_name || '',
      venueRole: row.venue_role || '',
      result: row.result || 'T',
      runsFor: Number(row.runs_for || 0) || 0,
      runsAgainst: Number(row.runs_against || 0) || 0
    })
    return map
  }, new Map())

  return Object.fromEntries(
    [...grouped.entries()].map(([deskTeam, gameRows]) => {
      let lastOpponent = null
      let seriesSlot = -1
      const recentGames = gameRows.map((row) => {
        if (row.opponent !== lastOpponent) {
          seriesSlot += 1
          lastOpponent = row.opponent
        }

        return {
          ...row,
          seriesSlot
        }
      })

      return [deskTeam, recentGames]
    })
  )
}

const buildSeriesEarlyPhaseByTeam = ({ date, games, lookbackDays = 5, limit = 3 }) => {
  const matchupPairs = games.flatMap((game) => [
    { team: game.away, opponent: game.home },
    { team: game.home, opponent: game.away }
  ])

  if (!matchupPairs.length) return {}

  const whereClauses = matchupPairs
    .map(({ team, opponent }) => {
      const officialTeam = (deskToOfficialTeam[team] || team).replace(/'/g, "''")
      const officialOpponent = (deskToOfficialTeam[opponent] || opponent).replace(/'/g, "''")
      return `(team_name='${officialTeam}' and opponent_team='${officialOpponent}')`
    })
    .join(' or ')

  const rows = runSqliteJson(
    `with recent_series_phase as (
      select
        *,
        row_number() over (
          partition by team_name, opponent_team
          order by game_date desc, game_pk desc
        ) as rn
      from mlb_phase_outcomes_daily
      where game_date < '${date}'
        and game_date >= date('${date}', '-${Math.max(1, lookbackDays)} days')
        and (${whereClauses})
    )
    select
      team_name,
      opponent_team,
      count(*) as games_sample,
      avg(runs_first1) as runs_first1_per_game,
      avg(runs_first3) as runs_first3_per_game,
      avg(scored_first_inning_flag) as scored_first_inning_rate,
      avg(allowed_first_inning_flag) as allowed_first_inning_rate,
      avg(scoreless_first3_flag) as scoreless_first3_rate,
      avg(tied_after3_flag) as tied_after3_rate,
      avg(traffic_no_conversion_flag) as traffic_no_conversion_rate
    from recent_series_phase
    where rn <= ${Math.max(1, limit)}
    group by team_name, opponent_team
    order by team_name, opponent_team;`
  )

  return Object.fromEntries(
    rows.map((row) => {
      const deskTeam = officialToDeskTeam[row.team_name] || row.team_name
      return [
        deskTeam,
        {
          opponentTeam: officialToDeskTeam[row.opponent_team] || row.opponent_team || '',
          gamesSample: Number(row.games_sample || 0) || 0,
          runsFirst1PerGame: roundMaybe(row.runs_first1_per_game),
          runsFirst3PerGame: roundMaybe(row.runs_first3_per_game),
          scoredFirstInningRate: roundMaybe(row.scored_first_inning_rate),
          allowedFirstInningRate: roundMaybe(row.allowed_first_inning_rate),
          scorelessFirst3Rate: roundMaybe(row.scoreless_first3_rate),
          tiedAfter3Rate: roundMaybe(row.tied_after3_rate),
          trafficNoConversionRate: roundMaybe(row.traffic_no_conversion_rate)
        }
      ]
    })
  )
}

const buildMatchupInningHistoryByTeam = ({ date, games, limit = 10, maxInnings = 15 }) => {
  const matchupPairs = [
    ...new Map(
      games
        .map((game) => {
          const awayOfficial = deskToOfficialTeam[game.away] || game.away
          const homeOfficial = deskToOfficialTeam[game.home] || game.home
          if (!awayOfficial || !homeOfficial) return null
          const [teamA, teamB] = [awayOfficial, homeOfficial].sort((left, right) => left.localeCompare(right))
          return [`${teamA}__${teamB}`, { teamA, teamB }]
        })
        .filter(Boolean)
    ).values()
  ]

  if (!matchupPairs.length) return {}

  const matchupPairRows = matchupPairs
    .map(
      ({ teamA, teamB }) =>
        `select '${teamA.replace(/'/g, "''")}__${teamB.replace(/'/g, "''")}' as pair_key, '${teamA.replace(/'/g, "''")}' as team_a, '${teamB.replace(/'/g, "''")}' as team_b`
    )
    .join(' union all ')

  const rows = runSqliteJson(
    `with matchup_pairs as (
      ${matchupPairRows}
    ),
    base_games as (
      select
        mp.pair_key,
        g.mlb_game_pk as game_pk,
        g.game_date,
        g.start_time_utc as game_datetime,
        away.name as away_team,
        home.name as home_team,
        go.away_runs as away_runs_final,
        go.home_runs as home_runs_final
      from matchup_pairs mp
      join games g on 1 = 1
      join teams away on away.team_id = g.away_team_id
      join teams home on home.team_id = g.home_team_id
      join game_outcomes go on go.game_id = g.game_id
      where
        g.game_date < '${date}'
        and
        (
          (away.name = mp.team_a and home.name = mp.team_b)
          or
          (away.name = mp.team_b and home.name = mp.team_a)
        )
      group by
        mp.pair_key,
        g.mlb_game_pk,
        g.game_date,
        g.start_time_utc,
        away.name,
        home.name,
        go.away_runs,
        go.home_runs
    ),
    ranked_games as (
      select
        *,
        row_number() over (
          partition by pair_key
          order by coalesce(game_datetime, game_date) desc, game_pk desc
        ) as rn
      from base_games
    ),
    selected_games as (
      select *
      from ranked_games
      where rn <= ${Math.max(1, limit)}
    ),
    inning_totals as (
      select
        sg.pair_key,
        sg.game_pk,
        sg.game_date,
        sg.game_datetime,
        sg.away_team,
        sg.home_team,
        sg.away_runs_final,
        sg.home_runs_final,
        pa.batting_team,
        pa.inning,
        sum(coalesce(pa.run_delta, 0)) as runs_inning
      from selected_games sg
      join mlb_plate_appearances pa on pa.game_pk = sg.game_pk
      where pa.inning between 1 and ${Math.max(9, maxInnings)}
      group by
        sg.pair_key,
        sg.game_pk,
        sg.game_date,
        sg.game_datetime,
        sg.away_team,
        sg.home_team,
        sg.away_runs_final,
        sg.home_runs_final,
        pa.batting_team,
        pa.inning
    )
    select *
    from inning_totals
    order by pair_key, coalesce(game_datetime, game_date) asc, game_pk asc, inning asc;`
  )

  const gameMap = new Map()

  rows.forEach((row) => {
    const pairKey = row.pair_key || ''
    const gamePk = Number(row.game_pk || 0) || 0
    if (!pairKey || !gamePk) return
    const recordKey = `${pairKey}::${gamePk}`

    if (!gameMap.has(recordKey)) {
      gameMap.set(recordKey, {
        pairKey,
        gamePk,
        date: row.game_date || '',
        gameDatetime: row.game_datetime || '',
        awayTeam: row.away_team || '',
        homeTeam: row.home_team || '',
        awayRunsFinal: Number(row.away_runs_final || 0) || 0,
        homeRunsFinal: Number(row.home_runs_final || 0) || 0,
        inningsByTeam: new Map()
      })
    }

    const gameRecord = gameMap.get(recordKey)
    const battingTeam = row.batting_team || ''
    const inning = Number(row.inning || 0) || 0
    if (!battingTeam || !inning) return

    if (!gameRecord.inningsByTeam.has(battingTeam)) {
      gameRecord.inningsByTeam.set(battingTeam, new Map())
    }

    gameRecord.inningsByTeam.get(battingTeam).set(inning, Number(row.runs_inning || 0) || 0)
  })

  const recordsByPair = [...gameMap.values()].reduce((map, record) => {
    if (!map.has(record.pairKey)) map.set(record.pairKey, [])
    map.get(record.pairKey).push(record)
    return map
  }, new Map())
  const starterOutcomeByGamePk = buildStartingPitcherFirstInningByGamePk({
    gamePks: [...gameMap.values()].map((record) => record.gamePk)
  })
  const expectationContext = buildHistoricalExpectationContext({
    records: [...gameMap.values()].map((record) => ({
      gamePk: record.gamePk,
      date: record.date,
      awayTeam: record.awayTeam,
      homeTeam: record.homeTeam
    }))
  })

  return Object.fromEntries(
    matchupPairs.flatMap(({ teamA, teamB }) => {
      const pairKey = `${teamA}__${teamB}`
      const pairRecords = recordsByPair.get(pairKey) ?? []

      const buildPerspectiveHistory = (officialTeam, officialOpponent) =>
        pairRecords.map((record) => {
          const teamIsAway = record.awayTeam === officialTeam
          const runsFor = teamIsAway ? record.awayRunsFinal : record.homeRunsFinal
          const runsAgainst = teamIsAway ? record.homeRunsFinal : record.awayRunsFinal
          const venueRole = teamIsAway ? 'road' : 'home'
          const teamInnings = record.inningsByTeam.get(officialTeam) ?? new Map()
          const starterPacket = starterOutcomeByGamePk[record.gamePk] ?? {}
          const teamStarter = teamIsAway ? starterPacket.away ?? null : starterPacket.home ?? null
          const opponentStarter = teamIsAway ? starterPacket.home ?? null : starterPacket.away ?? null
          const maxInning = Math.max(9, ...[...teamInnings.keys()].map((inning) => Number(inning) || 0))
          const marketContext = expectationContext.marketByDateGamePk.get(`${record.date}::${record.gamePk}`) ?? null
          const phaseContext = expectationContext.phaseByGameTeam.get(`${record.gamePk}::${officialTeam}`) ?? null

          return {
            gamePk: record.gamePk,
            date: record.date,
            opponent: officialToDeskTeam[officialOpponent] || officialOpponent,
            venueRole,
            result: runsFor > runsAgainst ? 'W' : runsFor < runsAgainst ? 'L' : 'T',
            runsFor,
            runsAgainst,
            starters: {
              team: teamStarter,
              opponent: opponentStarter
            },
            storyAxes: {
              market: buildHistoricalMarketStory({
                teamName: officialTeam,
                gameResult: runsFor > runsAgainst ? 'W' : runsFor < runsAgainst ? 'L' : 'T',
                marketContext
              }),
              hitters: phaseContext ? buildHistoricalHitterStory(phaseContext) : buildHistoricalHitterStoryFallback({
                runsFor,
                runsAgainst,
                result: runsFor > runsAgainst ? 'W' : runsFor < runsAgainst ? 'L' : 'T',
                inningsByNumber: teamInnings
              }),
              starter: phaseContext ? buildHistoricalStarterStory(phaseContext) : buildHistoricalStarterStoryFallback({
                runsFor,
                runsAgainst,
                result: runsFor > runsAgainst ? 'W' : runsFor < runsAgainst ? 'L' : 'T',
                inningsByNumber: teamInnings
              }),
              relief: phaseContext ? buildHistoricalReliefStory(phaseContext) : buildHistoricalReliefStoryFallback({
                runsFor,
                runsAgainst,
                result: runsFor > runsAgainst ? 'W' : runsFor < runsAgainst ? 'L' : 'T',
                inningsByNumber: teamInnings
              })
            },
            innings: Array.from({ length: maxInning }, (_, index) => ({
              inning: index + 1,
              runs: Number(teamInnings.get(index + 1) || 0) || 0
            }))
          }
        })

      const deskTeamA = officialToDeskTeam[teamA] || teamA
      const deskTeamB = officialToDeskTeam[teamB] || teamB

      return [
        [`${deskTeamA}__${deskTeamB}`, buildPerspectiveHistory(teamA, teamB)],
        [`${deskTeamB}__${deskTeamA}`, buildPerspectiveHistory(teamB, teamA)]
      ]
    })
  )
}

const buildRecentInningHistoryByTeam = ({ date, games, limit = 10, maxInnings = 15 }) => {
  const teams = [...new Set(games.flatMap((game) => [game.away, game.home]).filter(Boolean))]

  if (!teams.length) return {}

  const officialTeams = teams.map((team) => deskToOfficialTeam[team] || team).filter(Boolean)
  const quotedTeams = officialTeams.map((team) => `'${team.replace(/'/g, "''")}'`).join(',')
  const rows = runSqliteJson(
    `with recent_team_games as (
      select
        g.mlb_game_pk as game_pk,
        tgs.game_date,
        g.start_time_utc as game_datetime,
        team.name as team_name,
        opponent.name as opponent_name,
        case when tgs.team_role = 'away' then 'road' else 'home' end as venue_role,
        tgs.runs_scored as runs_for,
        tgs.runs_allowed as runs_against,
        case
          when tgs.runs_scored > tgs.runs_allowed then 'W'
          when tgs.runs_scored < tgs.runs_allowed then 'L'
          else 'T'
        end as result
      from team_game_stats tgs
      join games g on g.game_id = tgs.game_id
      join teams team on team.team_id = tgs.team_id
      left join teams opponent on opponent.team_id = tgs.opponent_team_id
      where team.name in (${quotedTeams})
        and tgs.game_date < '${date}'
    ),
    base_team_games as (
      select
        game_pk,
        game_date,
        game_datetime,
        team_name,
        opponent_name,
        venue_role,
        runs_for,
        runs_against,
        result
      from recent_team_games
      group by
        game_pk,
        game_date,
        game_datetime,
        team_name,
        opponent_name,
        venue_role,
        runs_for,
        runs_against,
        result
    ),
    ranked_games as (
      select
        *,
        row_number() over (
          partition by team_name
          order by coalesce(game_datetime, game_date) desc, game_pk desc
        ) as rn
      from base_team_games
    ),
    selected_games as (
      select *
      from ranked_games
      where rn <= ${Math.max(1, limit)}
    ),
    inning_totals as (
      select
        sg.team_name,
        sg.opponent_name,
        sg.venue_role,
        sg.result,
        sg.runs_for,
        sg.runs_against,
        sg.game_pk,
        sg.game_date,
        sg.game_datetime,
        pa.inning,
        sum(coalesce(pa.run_delta, 0)) as runs_inning
      from selected_games sg
      join mlb_plate_appearances pa
        on pa.game_pk = sg.game_pk
       and pa.batting_team = sg.team_name
      where pa.inning between 1 and ${Math.max(9, maxInnings)}
      group by
        sg.team_name,
        sg.opponent_name,
        sg.venue_role,
        sg.result,
        sg.runs_for,
        sg.runs_against,
        sg.game_pk,
        sg.game_date,
        sg.game_datetime,
        pa.inning
    )
    select *
    from inning_totals
    order by team_name, coalesce(game_datetime, game_date) asc, game_pk asc, inning asc;`
  )

  const gameMap = new Map()

  rows.forEach((row) => {
    const officialTeam = row.team_name || ''
    const gamePk = Number(row.game_pk || 0) || 0
    if (!officialTeam || !gamePk) return
    const recordKey = `${officialTeam}::${gamePk}`

    if (!gameMap.has(recordKey)) {
      const venueRole = row.venue_role || ''
      const opponentName = row.opponent_name || ''
      gameMap.set(recordKey, {
        teamName: officialTeam,
        opponentName,
        venueRole,
        result: row.result || 'T',
        runsFor: Number(row.runs_for || 0) || 0,
        runsAgainst: Number(row.runs_against || 0) || 0,
        gamePk,
        date: row.game_date || '',
        gameDatetime: row.game_datetime || '',
        awayTeam: venueRole === 'road' ? officialTeam : opponentName,
        homeTeam: venueRole === 'home' ? officialTeam : opponentName,
        inningsByNumber: new Map()
      })
    }

    const record = gameMap.get(recordKey)
    const inning = Number(row.inning || 0) || 0
    if (!inning) return
    record.inningsByNumber.set(inning, Number(row.runs_inning || 0) || 0)
  })

  const grouped = [...gameMap.values()].reduce((map, record) => {
    const deskTeam = officialToDeskTeam[record.teamName] || record.teamName
    if (!map.has(deskTeam)) map.set(deskTeam, [])
    map.get(deskTeam).push(record)
    return map
  }, new Map())
  const starterOutcomeByGamePk = buildStartingPitcherFirstInningByGamePk({
    gamePks: [...gameMap.values()].map((record) => record.gamePk)
  })
  const expectationContext = buildHistoricalExpectationContext({
    records: [...gameMap.values()].map((record) => ({
      gamePk: record.gamePk,
      date: record.date,
      awayTeam: record.awayTeam,
      homeTeam: record.homeTeam
    }))
  })

  return Object.fromEntries(
    [...grouped.entries()].map(([deskTeam, records]) => [
      deskTeam,
      records.map((record) => {
        const teamIsAway = record.venueRole === 'road'
        const starterPacket = starterOutcomeByGamePk[record.gamePk] ?? {}
        const teamStarter = teamIsAway ? starterPacket.away ?? null : starterPacket.home ?? null
        const opponentStarter = teamIsAway ? starterPacket.home ?? null : starterPacket.away ?? null
        const maxInning = Math.max(9, ...[...record.inningsByNumber.keys()].map((inning) => Number(inning) || 0))
        const marketContext = expectationContext.marketByDateGamePk.get(`${record.date}::${record.gamePk}`) ?? null
        const phaseContext = expectationContext.phaseByGameTeam.get(`${record.gamePk}::${record.teamName}`) ?? null
        return {
          gamePk: record.gamePk,
          date: record.date,
          opponent: officialToDeskTeam[record.opponentName] || record.opponentName,
          venueRole: record.venueRole,
          result: record.result,
          runsFor: record.runsFor,
          runsAgainst: record.runsAgainst,
          starters: {
            team: teamStarter,
            opponent: opponentStarter
          },
          storyAxes: {
            market: buildHistoricalMarketStory({
              teamName: record.teamName,
              gameResult: record.result,
              marketContext
            }),
            hitters: phaseContext ? buildHistoricalHitterStory(phaseContext) : buildHistoricalHitterStoryFallback(record),
            starter: phaseContext ? buildHistoricalStarterStory(phaseContext) : buildHistoricalStarterStoryFallback(record),
            relief: phaseContext ? buildHistoricalReliefStory(phaseContext) : buildHistoricalReliefStoryFallback(record)
          },
          innings: Array.from({ length: maxInning }, (_, index) => ({
            inning: index + 1,
            runs: Number(record.inningsByNumber.get(index + 1) || 0) || 0
          }))
        }
      })
    ])
  )
}

const buildHitterStateByTeam = ({ date, games, topSlots = 6 }) => {
  const teams = [...new Set(games.flatMap((game) => [game.away, game.home]).filter(Boolean))]

  if (!teams.length) return {}

  const officialTeams = teams.map((team) => deskToOfficialTeam[team] || team).filter(Boolean)
  const quotedTeams = officialTeams.map((team) => `'${team.replace(/'/g, "''")}'`).join(',')
  const rows = runSqliteJson(
    `with ranked as (
      select
        hs.team_name,
        hs.player_id,
        hs.player_name,
        hs.batting_order_avg_last5,
        hs.hit_streak_games,
        hs.hitless_streak_games,
        hs.home_run_streak_games,
        hs.hits_per_pa_last5,
        hs.total_bases_per_pa_last5,
        hs.strikeout_rate_last5,
        hs.walk_rate_last5,
        hs.whiff_rate_last5,
        hs.pressure_plate_index,
        hs.cold_streak_index,
        hs.heat_regression_index,
        trends.rolling_7_xwoba,
        trends.rolling_30_xwoba,
        trends.rolling_7_hard_hit_pct,
        trends.rolling_30_hard_hit_pct,
        trends.rolling_7_sweet_spot_pct,
        trends.rolling_30_sweet_spot_pct,
        trends.xwoba_trend_7_minus_30,
        trends.hard_hit_trend_7_minus_30,
        trends.sweet_spot_trend_7_minus_30,
        row_number() over (
          partition by hs.team_name
          order by coalesce(hs.batting_order_avg_last5, 99), hs.player_name asc
        ) as rn
      from mlb_hitter_state_snapshots hs
      left join mlb_hitter_statcast_trend_snapshots trends
        on trends.as_of_date = hs.as_of_date
       and trends.player_id = hs.player_id
      where hs.as_of_date='${date}'
        and hs.team_name in (${quotedTeams})
    )
    select *
    from ranked
    where rn <= ${Math.max(1, topSlots)}
    order by team_name, rn;`
  )

  const grouped = rows.reduce((map, row) => {
    const deskTeam = officialToDeskTeam[row.team_name] || row.team_name
    if (!map.has(deskTeam)) map.set(deskTeam, [])
    map.get(deskTeam).push(row)
    return map
  }, new Map())

  return Object.fromEntries(
    [...grouped.entries()].map(([deskTeam, playerRows]) => {
      const topRows = playerRows.slice(0, topSlots)
      const hottest = [...topRows].sort((left, right) => Number(right.heat_regression_index || 0) - Number(left.heat_regression_index || 0))[0]
      const coldest = [...topRows].sort((left, right) => Number(right.cold_streak_index || 0) - Number(left.cold_streak_index || 0))[0]
      const mostPressured = [...topRows].sort((left, right) => Number(right.pressure_plate_index || 0) - Number(left.pressure_plate_index || 0))[0]
      const trendLeader = [...topRows]
        .filter((row) => Number.isFinite(Number(row.xwoba_trend_7_minus_30)))
        .sort((left, right) => Number(right.xwoba_trend_7_minus_30 || 0) - Number(left.xwoba_trend_7_minus_30 || 0))[0]
      const averageFinite = (key) => {
        const values = topRows.map((row) => Number(row[key])).filter(Number.isFinite)
        if (!values.length) return null
        return values.reduce((sum, value) => sum + value, 0) / values.length
      }
      const top6Rolling7Xwoba = averageFinite('rolling_7_xwoba')
      const top6Rolling30Xwoba = averageFinite('rolling_30_xwoba')
      const top6Rolling7HardHitPct = averageFinite('rolling_7_hard_hit_pct')
      const top6Rolling30HardHitPct = averageFinite('rolling_30_hard_hit_pct')
      const top6Rolling7SweetSpotPct = averageFinite('rolling_7_sweet_spot_pct')
      const top6Rolling30SweetSpotPct = averageFinite('rolling_30_sweet_spot_pct')
      const top6XwobaTrend = averageFinite('xwoba_trend_7_minus_30')
      const top6HardHitTrend = averageFinite('hard_hit_trend_7_minus_30')
      const top6SweetSpotTrend = averageFinite('sweet_spot_trend_7_minus_30')
      const contactTrendSignal =
        Number.isFinite(top6XwobaTrend) || Number.isFinite(top6HardHitTrend) || Number.isFinite(top6SweetSpotTrend)
          ? top6XwobaTrend >= 0.012 || top6HardHitTrend >= 2.5 || top6SweetSpotTrend >= 2
            ? 'improving'
            : top6XwobaTrend <= -0.012 || top6HardHitTrend <= -2.5 || top6SweetSpotTrend <= -2
              ? 'fading'
              : 'flat'
          : null

      return [
        deskTeam,
        {
          topSlots,
          hittersTracked: topRows.length,
          top6PressureIndex: roundMaybe(topRows.reduce((sum, row) => sum + Number(row.pressure_plate_index || 0), 0) / Math.max(topRows.length, 1)),
          top6ColdIndex: roundMaybe(topRows.reduce((sum, row) => sum + Number(row.cold_streak_index || 0), 0) / Math.max(topRows.length, 1)),
          top6HeatIndex: roundMaybe(topRows.reduce((sum, row) => sum + Number(row.heat_regression_index || 0), 0) / Math.max(topRows.length, 1)),
          top6WhiffRate: roundMaybe(topRows.reduce((sum, row) => sum + Number(row.whiff_rate_last5 || 0), 0) / Math.max(topRows.length, 1)),
          top6StrikeoutRate: roundMaybe(topRows.reduce((sum, row) => sum + Number(row.strikeout_rate_last5 || 0), 0) / Math.max(topRows.length, 1)),
          top6WalkRate: roundMaybe(topRows.reduce((sum, row) => sum + Number(row.walk_rate_last5 || 0), 0) / Math.max(topRows.length, 1)),
          top6Rolling7Xwoba: roundMaybe(top6Rolling7Xwoba, 3),
          top6Rolling30Xwoba: roundMaybe(top6Rolling30Xwoba, 3),
          top6Rolling7HardHitPct: roundMaybe(top6Rolling7HardHitPct, 1),
          top6Rolling30HardHitPct: roundMaybe(top6Rolling30HardHitPct, 1),
          top6Rolling7SweetSpotPct: roundMaybe(top6Rolling7SweetSpotPct, 1),
          top6Rolling30SweetSpotPct: roundMaybe(top6Rolling30SweetSpotPct, 1),
          top6XwobaTrend: roundMaybe(top6XwobaTrend, 3),
          top6HardHitTrend: roundMaybe(top6HardHitTrend, 1),
          top6SweetSpotTrend: roundMaybe(top6SweetSpotTrend, 1),
          contactTrendSignal,
          hottestHitter:
            hottest
              ? {
                  playerId: Number(hottest.player_id || 0) || null,
                  playerName: hottest.player_name || '',
                  heatRegressionIndex: roundMaybe(hottest.heat_regression_index),
                  hitStreakGames: Number(hottest.hit_streak_games || 0) || 0,
                  homeRunStreakGames: Number(hottest.home_run_streak_games || 0) || 0,
                  hitsPerPaLast5: roundMaybe(hottest.hits_per_pa_last5),
                  totalBasesPerPaLast5: roundMaybe(hottest.total_bases_per_pa_last5)
                }
              : null,
          coldestHitter:
            coldest
              ? {
                  playerId: Number(coldest.player_id || 0) || null,
                  playerName: coldest.player_name || '',
                  coldStreakIndex: roundMaybe(coldest.cold_streak_index),
                  hitlessStreakGames: Number(coldest.hitless_streak_games || 0) || 0,
                  whiffRateLast5: roundMaybe(coldest.whiff_rate_last5),
                  strikeoutRateLast5: roundMaybe(coldest.strikeout_rate_last5)
                }
              : null,
          trendLeader:
            trendLeader
              ? {
                  playerId: Number(trendLeader.player_id || 0) || null,
                  playerName: trendLeader.player_name || '',
                  rolling7Xwoba: roundMaybe(trendLeader.rolling_7_xwoba, 3),
                  rolling30Xwoba: roundMaybe(trendLeader.rolling_30_xwoba, 3),
                  xwobaTrend: roundMaybe(trendLeader.xwoba_trend_7_minus_30, 3),
                  hardHitTrend: roundMaybe(trendLeader.hard_hit_trend_7_minus_30, 1),
                  sweetSpotTrend: roundMaybe(trendLeader.sweet_spot_trend_7_minus_30, 1)
                }
              : null,
          pressureHitter:
            mostPressured
              ? {
                  playerId: Number(mostPressured.player_id || 0) || null,
                  playerName: mostPressured.player_name || '',
                  pressurePlateIndex: roundMaybe(mostPressured.pressure_plate_index),
                  hitlessStreakGames: Number(mostPressured.hitless_streak_games || 0) || 0,
                  whiffRateLast5: roundMaybe(mostPressured.whiff_rate_last5),
                  walkRateLast5: roundMaybe(mostPressured.walk_rate_last5)
                }
              : null
        }
      ]
    })
  )
}

const buildSeriesContextByGamePk = ({ date, games }) => {
  const gamePks = [...new Set(games.map((game) => game.gamePk).filter((value) => Number.isFinite(value)))]

  if (!gamePks.length) return {}

  const rows = runSqliteJson(
    `select game_pk, same_division_flag, previous_matchups_14d, previous_matchups_30d, series_game_number, played_yesterday_flag from mlb_series_context_snapshots where as_of_date='${date}' and game_pk in (${gamePks.join(',')}) order by game_pk;`
  )

  return Object.fromEntries(
    rows.map((row) => [
      Number(row.game_pk),
      {
        sameDivisionFlag: Boolean(row.same_division_flag),
        previousMatchups14d: Number(row.previous_matchups_14d || 0) || 0,
        previousMatchups30d: Number(row.previous_matchups_30d || 0) || 0,
        seriesGameNumber: Number(row.series_game_number || 0) || null,
        playedYesterdayFlag: Boolean(row.played_yesterday_flag)
      }
    ])
  )
}

const buildSunVisibilityByGamePk = ({ date, games }) => {
  const gamePks = [...new Set(games.map((game) => game.gamePk).filter((value) => Number.isFinite(value)))]
  if (!gamePks.length) return {}

  let rows = []
  try {
    rows = runSqliteJson(
      `select
         game_pk, venue_name, roof_type, field_azimuth_deg,
         sun_azimuth_first_pitch, sun_elevation_first_pitch,
         sun_azimuth_midgame, sun_elevation_midgame, outfield_sun_angle_deg,
         outfield_glare_risk, shadow_transition_risk, visibility_risk_score,
         risk_label, visibility_notes_json
       from mlb_game_sun_visibility_snapshots
       where game_date='${date}'
         and game_pk in (${gamePks.join(',')})
       order by game_pk;`
    )
  } catch (error) {
    return {}
  }

  return Object.fromEntries(
    rows.map((row) => [
      Number(row.game_pk),
      {
        venueName: row.venue_name || '',
        roofType: row.roof_type || '',
        fieldAzimuthDeg: roundMaybe(row.field_azimuth_deg),
        sunAzimuthFirstPitch: roundMaybe(row.sun_azimuth_first_pitch),
        sunElevationFirstPitch: roundMaybe(row.sun_elevation_first_pitch),
        sunAzimuthMidgame: roundMaybe(row.sun_azimuth_midgame),
        sunElevationMidgame: roundMaybe(row.sun_elevation_midgame),
        outfieldSunAngleDeg: roundMaybe(row.outfield_sun_angle_deg),
        outfieldGlareRisk: roundMaybe(row.outfield_glare_risk),
        shadowTransitionRisk: roundMaybe(row.shadow_transition_risk),
        visibilityRiskScore: roundMaybe(row.visibility_risk_score),
        riskLabel: row.risk_label || '',
        notes: safeJsonParse(row.visibility_notes_json, [])
      }
    ])
  )
}

const buildTierThreeBullpenProfilesByTeam = ({ date, games, appearanceWindow = 8 }) => {
  const teams = [...new Set(games.flatMap((game) => [game.away, game.home]).filter(Boolean))]
  if (!teams.length) return {}

  const officialTeams = teams.map((team) => deskToOfficialTeam[team] || team).filter(Boolean)
  const quotedTeams = officialTeams.map((team) => `'${team.replace(/'/g, "''")}'`).join(',')
  const rows = runSqliteJson(
    `with ranked as (
      select
        usage.team_name,
        usage.pitcher_id,
        usage.pitcher_name,
        usage.first_reliever_likelihood,
        usage.availability_score,
        usage.bridge_score,
        row_number() over (
          partition by usage.team_name
          order by usage.first_reliever_likelihood desc, usage.availability_score desc, usage.bridge_score desc, usage.pitcher_name asc
        ) as rn
      from mlb_bullpen_usage usage
      where usage.as_of_date='${date}'
        and usage.team_name in (${quotedTeams})
    )
    select
      ranked.team_name,
      ranked.pitcher_id,
      ranked.pitcher_name,
      ranked.first_reliever_likelihood,
      profile.entries_sample,
      profile.first_pitch_ball_rate,
      profile.first_pitch_strike_rate,
      profile.ball_rate,
      profile.reached_rate,
      profile.free_pass_rate,
      profile.scoring_play_rate,
      profile.command_risk_index
    from ranked
    left join mlb_reliever_first_batter_command_profiles profile
      on profile.as_of_date='${date}'
     and profile.team_name=ranked.team_name
     and profile.pitcher_id=ranked.pitcher_id
     and profile.appearance_window=${appearanceWindow}
    where ranked.rn = 1
    order by ranked.team_name;`
  )

  return Object.fromEntries(
    rows.map((row) => {
      const deskTeam = officialToDeskTeam[row.team_name] || row.team_name
      return [
        deskTeam,
        {
          pitcherId: Number(row.pitcher_id || 0) || null,
          pitcherName: row.pitcher_name || '',
          firstRelieverLikelihood: roundMaybe(row.first_reliever_likelihood),
          entriesSample: Number(row.entries_sample || 0) || 0,
          firstPitchBallRate: roundMaybe(row.first_pitch_ball_rate),
          firstPitchStrikeRate: roundMaybe(row.first_pitch_strike_rate),
          ballRate: roundMaybe(row.ball_rate),
          reachedRate: roundMaybe(row.reached_rate),
          freePassRate: roundMaybe(row.free_pass_rate),
          scoringPlayRate: roundMaybe(row.scoring_play_rate),
          commandRiskIndex: roundMaybe(row.command_risk_index)
        }
      ]
    })
  )
}

const buildStarterThirdTimePenaltyByPitcherId = ({ date, games, windowStarts = 5 }) => {
  const pitcherIds = [
    ...new Set(
      games.flatMap((game) => [game.awayPitcher?.id, game.homePitcher?.id]).filter((value) => Number.isFinite(value))
    )
  ]

  if (!pitcherIds.length) return {}

  const rows = runSqliteJson(
    `select pitcher_id, pitcher_name, window_starts, starts_sample, starts_with_third_trip, third_trip_exposure_rate, third_trip_reached_delta, third_trip_scoring_delta, third_trip_run_delta_delta, third_trip_hr_delta, third_time_penalty_index
     from mlb_starter_third_time_penalty_profiles
     where as_of_date='${date}'
       and window_starts=${windowStarts}
       and pitcher_id in (${pitcherIds.join(',')})
     order by pitcher_id;`
  )

  return Object.fromEntries(
    rows.map((row) => [
      Number(row.pitcher_id),
      {
        pitcherName: row.pitcher_name || '',
        windowStarts: Number(row.window_starts || 0) || null,
        startsSample: Number(row.starts_sample || 0) || 0,
        startsWithThirdTrip: Number(row.starts_with_third_trip || 0) || 0,
        thirdTripExposureRate: roundMaybe(row.third_trip_exposure_rate),
        thirdTripReachedDelta: roundMaybe(row.third_trip_reached_delta),
        thirdTripScoringDelta: roundMaybe(row.third_trip_scoring_delta),
        thirdTripRunDeltaDelta: roundMaybe(row.third_trip_run_delta_delta),
        thirdTripHrDelta: roundMaybe(row.third_trip_hr_delta),
        thirdTimePenaltyIndex: roundMaybe(row.third_time_penalty_index)
      }
    ])
  )
}

const buildStarterUsageNote = ({ pitcher = {}, recentForm = null, usage = null, date }) => {
  const seasonStarts = Number(pitcher.gamesStarted || 0)
  const startsLoaded = Number(usage?.startsLoaded || 0)
  const seasonInnings = parseBaseballInnings(pitcher.inningsPitched)
  const starterOverride = Number.isFinite(Number(pitcher.id)) ? starterUsageOverridesByPitcherId[Number(pitcher.id)] ?? null : null
  const warehouseSampleConflict = seasonInnings >= 18 && seasonStarts <= 1 && startsLoaded <= 1
  const seasonDerivedExpectedInnings =
    seasonStarts > 1 && seasonInnings > 0 ? roundMaybe(seasonInnings / Math.max(seasonStarts, 1)) : null
  const fallbackExpectedInnings = warehouseSampleConflict ? (seasonInnings >= 24 ? 5.2 : 4.6) : null
  const expectedInnings =
    starterOverride?.expectedInnings ??
    (warehouseSampleConflict
      ? fallbackExpectedInnings ?? recentForm?.inningsPerStart ?? usage?.avgInningsPerStart ?? seasonDerivedExpectedInnings
      : recentForm?.inningsPerStart ?? usage?.avgInningsPerStart ?? seasonDerivedExpectedInnings ?? fallbackExpectedInnings)
  const daysSinceLastStart = usage?.lastStartDate ? daysBetweenIso(usage.lastStartDate, date) : null
  const shortLeashRisk = recentForm?.shortStartRate ?? usage?.shortStartRate ?? null
  const durableRate = recentForm?.qualityStartRate ?? usage?.durableStartRate ?? null

  let status = 'loaded'
  let label = 'Established starter'
  let note = ''

  if (!pitcher.fullName && !pitcher.id) {
    status = 'starter-tbd'
    label = 'Starter TBD'
    note = 'Official probable pitcher is still unconfirmed on this pass, so innings expectation and matchup shape should stay flexible.'
  } else if (starterOverride?.when?.({ seasonStarts, startsLoaded, recentForm, pitcher, usage, date }) ?? false) {
    status = starterOverride.status || 'override'
    label = starterOverride.label || 'Special starter context'
    note = starterOverride.note || ''
  } else if (recentForm?.startsSample > 0 && !warehouseSampleConflict) {
    status = recentForm.startsSample <= 2 ? 'tiny-sample' : 'loaded'
    label = recentForm.startsSample <= 2 ? 'Tiny recent sample' : 'Established starter'
    note =
      recentForm.startsSample <= 2
        ? `Only ${recentForm.startsSample} recent MLB start${recentForm.startsSample === 1 ? '' : 's'} are in the rolling sample, so the form read is still fragile.`
        : `Recent MLB form is loaded across ${recentForm.startsSample} starts.`
  } else if (warehouseSampleConflict) {
    status = 'warehouse-gap'
    label = 'Warehouse sample incomplete'
    note = `The season line shows ${pitcher.inningsPitched} MLB innings, but only ${Math.max(startsLoaded, seasonStarts)} logged start${Math.max(startsLoaded, seasonStarts) === 1 ? '' : 's'} cleared the warehouse on this pass, so trust the starter lane more than the thin rolling sample.`
  } else if (startsLoaded === 0 && seasonStarts === 0) {
    status = 'debut-window'
    label = 'Debut / opener watch'
    note = 'No MLB starts are loaded yet, so this looks like a debut, opener, or fresh call-up lane with very little reliable innings history.'
  } else if (startsLoaded <= 1 || seasonStarts <= 1) {
    status = 'tiny-sample'
    label = 'Tiny MLB sample'
    note = `Only ${Math.max(startsLoaded, seasonStarts)} MLB start${Math.max(startsLoaded, seasonStarts) === 1 ? '' : 's'} are loaded, so the board should assume a shorter leash and higher variance.`
  } else if (Number.isFinite(daysSinceLastStart) && daysSinceLastStart >= 20) {
    status = 'long-layoff'
    label = 'Long layoff'
    note = `Last MLB start on file was ${daysSinceLastStart} days ago, so this probable comes in without a trustworthy current rhythm read.`
  } else if (seasonStarts <= 3 || startsLoaded <= 3) {
    status = 'new-look'
    label = 'New-look starter'
    note = `This is still a low-sample MLB starter look with only ${Math.max(startsLoaded, seasonStarts)} starts on file, so innings expectation matters more than the raw ERA line.`
  } else {
    status = 'season-only'
    label = 'Season-only form'
    note = 'Season line is loaded, but the current rolling recent-start sample did not clear the filter on this pass.'
  }

  const workloadLabel =
    starterOverride?.workloadLabel ||
    (Number.isFinite(expectedInnings)
      ? expectedInnings >= 5.8
        ? 'Workhorse lane'
        : expectedInnings >= 4.8
          ? '5-inning lane'
          : 'Short leash'
      : 'Unknown leash')

  return {
    status,
    label,
    note,
    expectedInnings: roundMaybe(expectedInnings),
    daysSinceLastStart,
    startsLoaded,
    shortLeashRisk: roundMaybe(shortLeashRisk),
    durableRate: roundMaybe(durableRate),
    leashScore: roundMaybe(usage?.leashScore),
    leashVolatility: roundMaybe(usage?.leashVolatility),
    recent3OutsDelta: roundMaybe(usage?.recent3OutsDelta),
    fivePlusInningRate: roundMaybe(usage?.fivePlusInningRate),
    sixPlusInningRate: roundMaybe(usage?.sixPlusInningRate),
    ninetyPitchRate: roundMaybe(usage?.ninetyPitchRate),
    workloadLabel
  }
}

const buildStandingsContext = (records = []) => {
  const context = {}

  for (const record of records) {
    for (const teamRecord of record.teamRecords || []) {
      const officialName = teamRecord.team?.name
      const deskName = officialToDeskTeam[officialName] || officialName
      if (!deskName) continue

      context[deskName] = {
        divisionLeader: Boolean(teamRecord.divisionLeader),
        divisionRank: `${teamRecord.divisionRank ?? ''}`,
        gamesBack: `${teamRecord.gamesBack ?? '-'}`,
        losses: Number(teamRecord.losses ?? 0),
        runDifferential: Number(teamRecord.runDifferential ?? 0),
        streakCode: teamRecord.streak?.streakCode || '',
        winningPercentage: teamRecord.winningPercentage || '.500',
        wins: Number(teamRecord.wins ?? 0)
      }
    }
  }

  return context
}

const writeModuleFile = async (targetPath, contents) => {
  await mkdir(path.dirname(targetPath), { recursive: true })
  await writeFile(targetPath, contents, 'utf8')
}

const fetchTeamRoster = async (teamId, rosterCache) => {
  if (!Number.isFinite(Number(teamId))) return []
  if (rosterCache.has(teamId)) return rosterCache.get(teamId)

  const response = await fetchJson(`https://statsapi.mlb.com/api/v1/teams/${teamId}/roster?rosterType=40Man`)
  const roster = response.roster || []
  rosterCache.set(teamId, roster)
  return roster
}

const fetchPitcherPerson = async (pitcherId, pitcherCache) => {
  if (!Number.isFinite(Number(pitcherId))) return null
  if (pitcherCache.has(pitcherId)) return pitcherCache.get(pitcherId)

  const personUrl =
    `https://statsapi.mlb.com/api/v1/people/${pitcherId}` +
    `?hydrate=stats(group=[pitching],type=[season],season=${season},sportId=1)`
  const personResponse = await fetchJson(personUrl)
  const person = personResponse.people?.[0] || null
  pitcherCache.set(pitcherId, person)
  return person
}

const resolveFallbackPitcherPerson = async ({ teamId, starterName, rosterCache, pitcherCache }) => {
  const normalizedStarter = normalizeNameToken(starterName)
  if (!normalizedStarter) return null

  const roster = await fetchTeamRoster(teamId, rosterCache)
  const pitcherRoster = roster.filter((entry) => `${entry.position?.abbreviation || ''}`.toUpperCase() === 'P')
  const starterTokens = normalizedStarter.split(' ')

  const rosterMatch =
    pitcherRoster.find((entry) => normalizeNameToken(entry.person?.fullName || '') === normalizedStarter) ||
    pitcherRoster.find((entry) => starterTokens.every((token) => normalizeNameToken(entry.person?.fullName || '').includes(token))) ||
    pitcherRoster.find((entry) => {
      const fullName = normalizeNameToken(entry.person?.fullName || '')
      const lastName = fullName.split(' ').filter(Boolean).at(-1) || ''
      return lastName === normalizedStarter
    })

  if (rosterMatch?.person?.id) {
    return fetchPitcherPerson(Number(rosterMatch.person.id), pitcherCache)
  }

  const searchResponse = await fetchJson(
    `https://statsapi.mlb.com/api/v1/people/search?names=${encodeURIComponent(starterName)}`
  )

  const rosterIds = new Set(pitcherRoster.map((entry) => Number(entry.person?.id || 0)).filter(Boolean))
  const candidates = (searchResponse.people || []).filter((person) => `${person.primaryPosition?.abbreviation || ''}`.toUpperCase() === 'P')
  const chosen =
    candidates.find((person) => rosterIds.has(Number(person.id))) ||
    candidates.find((person) => Number(person.currentTeam?.id || 0) === Number(teamId)) ||
    candidates[0]

  if (!chosen?.id) return null
  return fetchPitcherPerson(Number(chosen.id), pitcherCache)
}

const main = async () => {
  const options = parseArgs()
  const scheduleUrl =
    `https://statsapi.mlb.com/api/v1/schedule?sportId=1&date=${options.date}` +
    '&hydrate=probablePitcher,team'
  const standingsUrl =
    `https://statsapi.mlb.com/api/v1/standings?leagueId=103,104&season=${season}` +
    '&standingsTypes=regularSeason'

  const schedule = await fetchJson(scheduleUrl)
  const standings = await fetchJson(standingsUrl)
  const rtSportsProbablesByMatchup = await fetchRtSportsProbables(options.date)
  const draftKingsEvents = await loadDraftKingsMlbLines(options.date)
  const pitcherIds = new Set()

  for (const dateEntry of schedule.dates || []) {
    for (const game of dateEntry.games || []) {
      if (isPostponedScheduleGame(game)) continue
      const awayPitcherId = game.teams?.away?.probablePitcher?.id
      const homePitcherId = game.teams?.home?.probablePitcher?.id
      if (awayPitcherId) pitcherIds.add(awayPitcherId)
      if (homePitcherId) pitcherIds.add(homePitcherId)
    }
  }

  const pitcherCache = new Map()
  const rosterCache = new Map()
  await Promise.all(
    [...pitcherIds].map(async (pitcherId) => {
      const personUrl =
        `https://statsapi.mlb.com/api/v1/people/${pitcherId}` +
        `?hydrate=stats(group=[pitching],type=[season],season=${season},sportId=1)`
      const personResponse = await fetchJson(personUrl)
      pitcherCache.set(pitcherId, personResponse.people?.[0] || null)
    })
  )

  const rawGames = []
  const seenMatchupCounts = new Map()
  for (const dateEntry of schedule.dates || []) {
    for (const game of dateEntry.games || []) {
      if (isPostponedScheduleGame(game)) continue
      const awayOfficial = game.teams?.away?.team?.name
      const homeOfficial = game.teams?.home?.team?.name
      const awayDesk = officialToDeskTeam[awayOfficial]
      const homeDesk = officialToDeskTeam[homeOfficial]

      if (!awayDesk || !homeDesk) continue

      const rtMatchupKey = `${deskTeamToRtAbbreviation[awayDesk] || ''}-${deskTeamToRtAbbreviation[homeDesk] || ''}`
      const rtFallback = rtSportsProbablesByMatchup[rtMatchupKey]?.[0] || null

      const awayProbable = game.teams?.away?.probablePitcher || {}
      const homeProbable = game.teams?.home?.probablePitcher || {}

      const awayFallbackPerson =
        !awayProbable?.id && rtFallback?.awayStarter
          ? await resolveFallbackPitcherPerson({
              teamId: Number(game.teams?.away?.team?.id || 0),
              starterName: rtFallback.awayStarter,
              rosterCache,
              pitcherCache
            })
          : null
      const homeFallbackPerson =
        !homeProbable?.id && rtFallback?.homeStarter
          ? await resolveFallbackPitcherPerson({
              teamId: Number(game.teams?.home?.team?.id || 0),
              starterName: rtFallback.homeStarter,
              rosterCache,
              pitcherCache
            })
          : null

      const awayPitcher = awayProbable?.id
        ? buildPitcherSummary(pitcherCache.get(awayProbable.id) || { fullName: awayProbable.fullName || '' })
        : awayFallbackPerson
          ? { ...buildPitcherSummary(awayFallbackPerson), probableSource: 'rtsports-fallback' }
          : buildPitcherFallbackSummary({
              fullName: rtFallback?.awayStarter || awayProbable?.fullName || '',
              record: rtFallback?.awayStarterRecord || ''
            })
      const homePitcher = homeProbable?.id
        ? buildPitcherSummary(pitcherCache.get(homeProbable.id) || { fullName: homeProbable.fullName || '' })
        : homeFallbackPerson
          ? { ...buildPitcherSummary(homeFallbackPerson), probableSource: 'rtsports-fallback' }
          : buildPitcherFallbackSummary({
              fullName: rtFallback?.homeStarter || homeProbable?.fullName || '',
              record: rtFallback?.homeStarterRecord || ''
            })
      const boardOdds = await parseMatchupOdds(awayDesk, homeDesk, { draftKingsEvents, date: options.date })

      const matchupKey = `${slugifyDeskTeam(awayDesk)}-${slugifyDeskTeam(homeDesk)}`
      const seenCount = seenMatchupCounts.get(matchupKey) ?? 0
      seenMatchupCounts.set(matchupKey, seenCount + 1)

      rawGames.push({
        gamePk: Number(game.gamePk || 0) || null,
        slateDate: options.date,
        id: buildDeskGameId({
          awayDesk,
          homeDesk,
          gamePk: Number(game.gamePk || 0) || null,
          gameNumber: Number(game.gameNumber || 0) || null,
          forceUnique: seenCount > 0
        }),
        away: awayDesk,
        home: homeDesk,
        start: formatPtStart(game.gameDate),
        startMinutes: getPtStartMinutes(game.gameDate),
        awayPitcher,
        homePitcher,
        spread: boardOdds.spread,
        total: boardOdds.total,
        moneyline: boardOdds.moneyline,
        first5Moneyline: boardOdds.first5Moneyline,
        first5Total: boardOdds.first5Total,
        oddsProvider: boardOdds.oddsProvider,
        pitcherSourceNote: '',
        oddsPage: boardOdds.oddsPage,
        metadata: {
          modelCartridge: 'MLB-M2',
          reliefAddendum: 'MLB-RP36',
          slateDate: options.date,
          quietStartFullGameGate: options.date >= '2026-05-31'
        }
      })
    }
  }

  rawGames.sort((left, right) => left.startMinutes - right.startMinutes || left.id.localeCompare(right.id))
  const addendumContexts = await loadAddendumContextsForDate(options.date)

  const bullpenChainByTeam = buildBullpenChainByTeam({ date: options.date, games: rawGames })
  const recentBullpenTrendByTeam = buildRecentBullpenTrendByTeam({ date: options.date, games: rawGames })
  Object.entries(bullpenChainByTeam).forEach(([teamName, profile]) => {
    if (recentBullpenTrendByTeam[teamName]) {
      profile.recentBullpenSummary = recentBullpenTrendByTeam[teamName]
    }
  })
  const recentStarterFormByPitcherId = buildRecentStarterFormByPitcherId({ date: options.date, games: rawGames })
  const starterUsageContextByPitcherId = buildStarterUsageContextByPitcherId({ date: options.date, games: rawGames })
  const starterLeashByPitcherId = buildStarterLeashByPitcherId({ date: options.date, games: rawGames })
  const pitcherStartHistoryByPitcherId = buildPitcherStartHistoryByPitcherId({ date: options.date, games: rawGames })
  const teamStoryPriorsByTeam = buildTeamStoryPriorsByTeam({ date: options.date, games: rawGames })
  const teamStateByTeam = buildTeamStateByTeam({ date: options.date, games: rawGames })
  const hitterStateByTeam = buildHitterStateByTeam({ date: options.date, games: rawGames })
  const teamMistakeShapeByTeam = buildTeamMistakeShapeByTeam({ date: options.date, games: rawGames })
  const lineupConversionShapeByTeam = buildLineupConversionShapeByTeam({ date: options.date, games: rawGames })
  const bullpenMistakeShapeByTeam = buildBullpenMistakeShapeByTeam({ date: options.date, games: rawGames })
  const firstInningTeamProfilesByTeam = buildFirstInningTeamProfilesByTeam({ date: options.date, games: rawGames })
  const firstInningPitcherProfilesByPitcherId = buildFirstInningPitcherProfilesByPitcherId({ date: options.date, games: rawGames })
  const seasonFirstInningByPitcherId = buildSeasonFirstInningByPitcherId({ date: options.date, games: rawGames })
  const pitcherWarByPitcherId = buildPitcherWarByPitcherId({ date: options.date, games: rawGames })
  const pitcherStrikeoutMarketsByGamePk = buildPitcherStrikeoutMarketsByGamePk({ date: options.date, games: rawGames })
  const starterVsTeamStatmuseByGameSide = buildStarterVsTeamStatmuseByGameSide({ date: options.date, games: rawGames })
  const espnPitcherSplitsByGameSide = buildEspnPitcherSplitsByGameSide({ date: options.date, games: rawGames })
  const seriesEarlyPhaseByTeam = buildSeriesEarlyPhaseByTeam({ date: options.date, games: rawGames })
  const recentGamesByTeam = buildRecentGamesByTeam({ date: options.date, games: rawGames })
  const recentInningHistoryByTeam = buildRecentInningHistoryByTeam({ date: options.date, games: rawGames })
  const matchupInningHistoryByTeam = buildMatchupInningHistoryByTeam({ date: options.date, games: rawGames })
  const seriesContextByGamePk = buildSeriesContextByGamePk({ date: options.date, games: rawGames })
  const sunVisibilityByGamePk = buildSunVisibilityByGamePk({ date: options.date, games: rawGames })
  const tierThreeBullpenProfilesByTeam = buildTierThreeBullpenProfilesByTeam({ date: options.date, games: rawGames })
  const starterThirdTimePenaltyByPitcherId = buildStarterThirdTimePenaltyByPitcherId({ date: options.date, games: rawGames })
  const standingsContextByTeam = buildStandingsContext(standings.records || [])
  const enrichedRawGames = rawGames.map((game) => {
    const addendumContext = findAddendumContextForGame(game, addendumContexts)
    const hasReliefProjection =
      Boolean(addendumContext?.reliefProjectionContext?.away) ||
      Boolean(addendumContext?.reliefProjectionContext?.home)

    return {
      ...game,
      parkContext: addendumContext?.parkContext ?? game.parkContext ?? null,
      environmentAdjustmentContext: addendumContext?.environmentAdjustmentContext ?? game.environmentAdjustmentContext ?? null,
      reliefProjectionContext: addendumContext?.reliefProjectionContext ?? game.reliefProjectionContext ?? null,
      metadata: {
        ...(game.metadata || {}),
        ...(addendumContext?.environmentAdjustmentContext ? { environmentAddendum: 'MLB-ENV1' } : {}),
        ...(hasReliefProjection ? { reliefProjectionAddendum: 'MLB-RP2' } : {})
      },
      awayPitcher: {
      ...game.awayPitcher,
      startHistoryLast5: Number.isFinite(game.awayPitcher?.id)
        ? (pitcherStartHistoryByPitcherId[game.awayPitcher.id] ?? []).slice(0, 5)
        : [],
      opponentHistoryThisSeason: Number.isFinite(game.awayPitcher?.id)
        ? (pitcherStartHistoryByPitcherId[game.awayPitcher.id] ?? []).filter(
            (start) => start.opponentName === game.home
          )
        : [],
      strikeoutMarket: Number.isFinite(game.gamePk) ? pitcherStrikeoutMarketsByGamePk[game.gamePk]?.away ?? null : null,
      statmuseVsOpponent: starterVsTeamStatmuseByGameSide[`${game.id}:away`] ?? null,
      espnSplits: espnPitcherSplitsByGameSide[`${game.id}:away`] ?? null,
      recentForm: Number.isFinite(game.awayPitcher?.id)
        ? recentStarterFormByPitcherId[game.awayPitcher.id] ?? null
        : null,
      usageContext: buildStarterUsageNote({
        pitcher: game.awayPitcher,
        recentForm: Number.isFinite(game.awayPitcher?.id) ? recentStarterFormByPitcherId[game.awayPitcher.id] ?? null : null,
        usage:
          Number.isFinite(game.awayPitcher?.id)
            ? {
                ...(starterUsageContextByPitcherId[game.awayPitcher.id] ?? {}),
                ...(starterLeashByPitcherId[game.awayPitcher.id] ?? {})
              }
            : null,
        date: options.date
      })
    },
    homePitcher: {
      ...game.homePitcher,
      startHistoryLast5: Number.isFinite(game.homePitcher?.id)
        ? (pitcherStartHistoryByPitcherId[game.homePitcher.id] ?? []).slice(0, 5)
        : [],
      opponentHistoryThisSeason: Number.isFinite(game.homePitcher?.id)
        ? (pitcherStartHistoryByPitcherId[game.homePitcher.id] ?? []).filter(
            (start) => start.opponentName === game.away
          )
        : [],
      strikeoutMarket: Number.isFinite(game.gamePk) ? pitcherStrikeoutMarketsByGamePk[game.gamePk]?.home ?? null : null,
      statmuseVsOpponent: starterVsTeamStatmuseByGameSide[`${game.id}:home`] ?? null,
      espnSplits: espnPitcherSplitsByGameSide[`${game.id}:home`] ?? null,
      recentForm: Number.isFinite(game.homePitcher?.id)
        ? recentStarterFormByPitcherId[game.homePitcher.id] ?? null
        : null,
      usageContext: buildStarterUsageNote({
        pitcher: game.homePitcher,
        recentForm: Number.isFinite(game.homePitcher?.id) ? recentStarterFormByPitcherId[game.homePitcher.id] ?? null : null,
        usage:
          Number.isFinite(game.homePitcher?.id)
            ? {
                ...(starterUsageContextByPitcherId[game.homePitcher.id] ?? {}),
                ...(starterLeashByPitcherId[game.homePitcher.id] ?? {})
              }
            : null,
        date: options.date
      })
    },
    tierTwoContext: {
      storyPriors: {
        away: teamStoryPriorsByTeam[game.away] ?? null,
        home: teamStoryPriorsByTeam[game.home] ?? null
      },
      series: Number.isFinite(game.gamePk) ? seriesContextByGamePk[game.gamePk] ?? null : null
    },
    stateContext: {
      teamState: {
        away: teamStateByTeam[game.away] ?? null,
        home: teamStateByTeam[game.home] ?? null
      },
      hitterState: {
        away: hitterStateByTeam[game.away] ?? null,
        home: hitterStateByTeam[game.home] ?? null
      },
      teamMistakeShape: {
        away: teamMistakeShapeByTeam[game.away] ?? null,
        home: teamMistakeShapeByTeam[game.home] ?? null
      },
      lineupConversion: {
        away: lineupConversionShapeByTeam[game.away] ?? null,
        home: lineupConversionShapeByTeam[game.home] ?? null
      },
      bullpenMistake: {
        away: bullpenMistakeShapeByTeam[game.away] ?? null,
        home: bullpenMistakeShapeByTeam[game.home] ?? null
      },
      firstInningTeam: {
        away: firstInningTeamProfilesByTeam[game.away] ?? null,
        home: firstInningTeamProfilesByTeam[game.home] ?? null
      },
      firstInningPitcher: {
        away: Number.isFinite(game.awayPitcher?.id) ? firstInningPitcherProfilesByPitcherId[game.awayPitcher.id] ?? null : null,
        home: Number.isFinite(game.homePitcher?.id) ? firstInningPitcherProfilesByPitcherId[game.homePitcher.id] ?? null : null
      },
      firstInningPitcherSeason: {
        away: Number.isFinite(game.awayPitcher?.id) ? seasonFirstInningByPitcherId[game.awayPitcher.id] ?? null : null,
        home: Number.isFinite(game.homePitcher?.id) ? seasonFirstInningByPitcherId[game.homePitcher.id] ?? null : null
      },
      pitcherWar: {
        away: Number.isFinite(game.awayPitcher?.id) ? pitcherWarByPitcherId[game.awayPitcher.id] ?? null : null,
        home: Number.isFinite(game.homePitcher?.id) ? pitcherWarByPitcherId[game.homePitcher.id] ?? null : null
      },
      pitcherStrikeoutMarket: {
        away: Number.isFinite(game.gamePk) ? pitcherStrikeoutMarketsByGamePk[game.gamePk]?.away ?? null : null,
        home: Number.isFinite(game.gamePk) ? pitcherStrikeoutMarketsByGamePk[game.gamePk]?.home ?? null : null
      },
      seriesEarlyPhase: {
        away: seriesEarlyPhaseByTeam[game.away] ?? null,
        home: seriesEarlyPhaseByTeam[game.home] ?? null
      },
      recentGames: {
        away: recentGamesByTeam[game.away] ?? [],
        home: recentGamesByTeam[game.home] ?? []
      },
      recentInningHistory: {
        away: recentInningHistoryByTeam[game.away] ?? [],
        home: recentInningHistoryByTeam[game.home] ?? []
      },
      matchupInningHistory: {
        away: matchupInningHistoryByTeam[`${game.away}__${game.home}`] ?? [],
        home: matchupInningHistoryByTeam[`${game.home}__${game.away}`] ?? []
      },
      sunVisibility: Number.isFinite(game.gamePk) ? sunVisibilityByGamePk[game.gamePk] ?? null : null
    },
    tierThreeContext: {
      bullpenCommand: {
        away: tierThreeBullpenProfilesByTeam[game.away] ?? null,
        home: tierThreeBullpenProfilesByTeam[game.home] ?? null
      },
      starterThirdTime: {
        away: Number.isFinite(game.awayPitcher?.id) ? starterThirdTimePenaltyByPitcherId[game.awayPitcher.id] ?? null : null,
        home: Number.isFinite(game.homePitcher?.id) ? starterThirdTimePenaltyByPitcherId[game.homePitcher.id] ?? null : null
      }
    }
    }
  })

  const dayDataModule = `export const rawGames = ${JSON.stringify(enrichedRawGames, null, 2)}\n\nexport const bullpenChainByTeam = ${JSON.stringify(bullpenChainByTeam, null, 2)}\n`
  const dayContextModule = `import {\n  teamOffenseContextByTeam,\n  teamBullpenContextByTeam,\n  teamSavantContextByTeam\n} from './mlb-context-${options.baselineContextDate}.js'\n\nexport const standingsContextByTeam = ${JSON.stringify(standingsContextByTeam, null, 2)}\n\nexport { teamOffenseContextByTeam, teamBullpenContextByTeam, teamSavantContextByTeam }\n`

  await writeModuleFile(
    path.join(rootDir, 'web', 'src', 'lib', `day-${options.date}-data.js`),
    dayDataModule
  )
  await writeModuleFile(
    path.join(rootDir, 'web', 'src', 'lib', `mlb-context-${options.date}.js`),
    dayContextModule
  )

  console.log(`Generated MLB day data for ${options.date} with ${rawGames.length} games.`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
