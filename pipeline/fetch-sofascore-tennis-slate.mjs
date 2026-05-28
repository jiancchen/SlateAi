import fs from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const ROOT = path.resolve(import.meta.dirname, '..')
const DEFAULT_OUTPUT_DIR = 'data-private/reference/tennis/sofascore-match-data'
const BUNDLED_NODE_MODULES =
  '/Users/jcchen/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules'

const parseArgs = () => {
  const args = process.argv.slice(2)
  const options = {
    date: '',
    outputDir: DEFAULT_OUTPUT_DIR,
    timeoutMs: 30000,
    limit: null
  }
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index]
    if (arg === '--date') {
      options.date = args[index + 1]
      index += 1
    } else if (arg === '--output-dir') {
      options.outputDir = args[index + 1]
      index += 1
    } else if (arg === '--timeout-ms') {
      options.timeoutMs = Number(args[index + 1])
      index += 1
    } else if (arg === '--limit') {
      options.limit = Number(args[index + 1])
      index += 1
    }
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(options.date)) throw new Error('Pass --date YYYY-MM-DD')
  return options
}

const normalizeName = (value) =>
  String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/gi, ' ')
    .trim()
    .toLowerCase()

const NAME_ALIASES = {
  'xinyu wang': 'wang xinyu',
  'xiyu wang': 'wang xiyu',
  'yibing wu': 'wu yibing'
}

const canonicalName = (value) => {
  const normalized = normalizeName(value)
  return NAME_ALIASES[normalized] || normalized
}

const loadPlaywright = async () => {
  try {
    return await import('playwright')
  } catch {
    return import(pathToFileURL(path.join(BUNDLED_NODE_MODULES, 'playwright/index.mjs')).href)
  }
}

const readJsonIfExists = async (filePath, fallback) => {
  try {
    return JSON.parse(await fs.readFile(filePath, 'utf8'))
  } catch (error) {
    if (error.code === 'ENOENT') return fallback
    throw error
  }
}

const fetchJson = async (page, apiPath, sourceUrl) => {
  const response = await page.request.get(`https://www.sofascore.com/api/v1/${apiPath}`, {
    headers: {
      accept: 'application/json, text/plain, */*',
      referer: sourceUrl || 'https://www.sofascore.com/tennis'
    },
    timeout: 20000
  })
  const text = await response.text()
  let body = text
  try {
    body = JSON.parse(text)
  } catch {
    // keep text body for blocked/malformed responses
  }
  return { status: response.status(), ok: response.ok(), body }
}

const compactEvent = (event) => ({
  id: event?.id ?? null,
  slug: event?.slug ?? null,
  status: event?.status ?? null,
  startTimestamp: event?.startTimestamp ?? null,
  tournament: event?.tournament
    ? {
        name: event.tournament.name,
        slug: event.tournament.slug,
        category: event.tournament.category?.name,
        uniqueTournament: event.tournament.uniqueTournament?.name
      }
    : null,
  roundInfo: event?.roundInfo ?? null,
  groundType: event?.groundType ?? null,
  homeTeam: event?.homeTeam
    ? {
        id: event.homeTeam.id,
        name: event.homeTeam.name,
        shortName: event.homeTeam.shortName,
        ranking: event.homeTeam.ranking,
        currentRanking: event.homeTeam.playerTeamInfo?.currentRanking,
        country: event.homeTeam.country,
        playerTeamInfo: event.homeTeam.playerTeamInfo
      }
    : null,
  awayTeam: event?.awayTeam
    ? {
        id: event.awayTeam.id,
        name: event.awayTeam.name,
        shortName: event.awayTeam.shortName,
        ranking: event.awayTeam.ranking,
        currentRanking: event.awayTeam.playerTeamInfo?.currentRanking,
        country: event.awayTeam.country,
        playerTeamInfo: event.awayTeam.playerTeamInfo
      }
    : null,
  homeScore: event?.homeScore ?? null,
  awayScore: event?.awayScore ?? null,
  winnerCode: event?.winnerCode ?? null,
  firstToServe: event?.firstToServe ?? null
})

const slateGames = async (date) => {
  const gamesDir = path.resolve(ROOT, 'published-data/slates', date, 'games')
  let fileNames = []
  try {
    fileNames = await fs.readdir(gamesDir)
  } catch {
    return []
  }
  const games = []
  for (const fileName of fileNames.filter((name) => name.endsWith('.json'))) {
    const filePath = path.join(gamesDir, fileName)
    const game = await readJsonIfExists(filePath, null)
    if (game?.league !== 'Tennis') continue
    const names = (game.tennisContext?.players || game.matchup || [])
      .map((player) => player.name || player.displayName)
      .filter(Boolean)
    if (names.length !== 2) continue
    games.push({
      id: game.id,
      title: game.title,
      names,
      normalizedSet: new Set(names.map(canonicalName))
    })
  }
  return games
}

const matchBoardGame = (event, games) => {
  const names = [event?.homeTeam?.name, event?.awayTeam?.name].map(canonicalName).filter(Boolean)
  if (names.length !== 2) return null
  return games.find((game) => names.every((name) => game.normalizedSet.has(name))) || null
}

const isRolandGarrosSingles = (event) => {
  const tournamentName = `${event?.tournament?.name || ''} ${event?.tournament?.uniqueTournament?.name || ''}`
  const homeName = event?.homeTeam?.name || ''
  const awayName = event?.awayTeam?.name || ''
  return /roland garros|french open/i.test(tournamentName) && !/[\\/&]/.test(homeName) && !/[\\/&]/.test(awayName)
}

const main = async () => {
  const options = parseArgs()
  const { chromium } = await loadPlaywright()
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36'
  })
  await page.goto('https://www.sofascore.com/tennis', { waitUntil: 'domcontentloaded', timeout: options.timeoutMs })
  const schedule = await fetchJson(page, `sport/tennis/scheduled-events/${options.date}`, page.url())
  const games = await slateGames(options.date)
  const events = ((schedule.body?.events || [])).filter(isRolandGarrosSingles)
  const matched = []
  const unmatched = []
  const outputDir = path.resolve(ROOT, options.outputDir)
  await fs.mkdir(outputDir, { recursive: true })

  for (const event of events) {
    const boardGame = matchBoardGame(event, games)
    if (!boardGame) {
      unmatched.push({
        eventId: event.id,
        title: `${event.homeTeam?.name || '?'} vs ${event.awayTeam?.name || '?'}`,
        tournament: event.tournament?.name
      })
      continue
    }
    if (options.limit !== null && matched.length >= options.limit) continue
    const eventId = String(event.id)
    const sourceUrl = `https://www.sofascore.com/tennis/match/${event.slug || eventId}#id:${eventId}`
    const eventPayload = await fetchJson(page, `event/${eventId}`, sourceUrl)
    const fullEvent = eventPayload?.body?.event || event
    const uniqueTournamentId = fullEvent?.tournament?.uniqueTournament?.id
    const seasonId = fullEvent?.season?.id
    const payloads = {
      event: eventPayload,
      statistics: await fetchJson(page, `event/${eventId}/statistics`, sourceUrl),
      h2h: await fetchJson(page, `event/${eventId}/h2h`, sourceUrl),
      votes: await fetchJson(page, `event/${eventId}/votes`, sourceUrl),
      tennisPower: await fetchJson(page, `event/${eventId}/tennis-power`, sourceUrl),
      winningOdds: await fetchJson(page, `event/${eventId}/provider/1/winning-odds`, sourceUrl),
      odds: await fetchJson(page, `event/${eventId}/odds/1/featured`, sourceUrl)
    }
    if (uniqueTournamentId && seasonId && fullEvent?.homeTeam?.id) {
      payloads.homeSeasonStats = await fetchJson(
        page,
        `team/${fullEvent.homeTeam.id}/unique-tournament/${uniqueTournamentId}/season/${seasonId}/statistics/overall`,
        sourceUrl
      )
    }
    if (uniqueTournamentId && seasonId && fullEvent?.awayTeam?.id) {
      payloads.awaySeasonStats = await fetchJson(
        page,
        `team/${fullEvent.awayTeam.id}/unique-tournament/${uniqueTournamentId}/season/${seasonId}/statistics/overall`,
        sourceUrl
      )
    }
    const output = {
      source: 'SofaScore',
      sourceUrl,
      eventId,
      slateDate: options.date,
      boardMatchId: boardGame.id,
      boardTitle: boardGame.title,
      capturedAt: new Date().toISOString(),
      compactEvent: compactEvent(fullEvent),
      payloads
    }
    await fs.writeFile(path.join(outputDir, `${eventId}.json`), `${JSON.stringify(output, null, 2)}\n`)
    matched.push({ eventId, boardMatchId: boardGame.id, title: boardGame.title })
  }

  await fs.writeFile(
    path.join(outputDir, `slate-map-${options.date}.json`),
    `${JSON.stringify({ date: options.date, matched, unmatched, scheduleStatus: schedule.status }, null, 2)}\n`
  )
  await browser.close()
  console.log(`Matched ${matched.length}/${games.length} published tennis matches for ${options.date}`)
  if (unmatched.length) console.log(`Unmatched SofaScore Roland Garros singles events: ${unmatched.length}`)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
