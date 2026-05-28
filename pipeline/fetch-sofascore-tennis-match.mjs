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
    url: '',
    eventId: '',
    date: '',
    outputDir: DEFAULT_OUTPUT_DIR,
    matchId: '',
    timeoutMs: 30000
  }
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index]
    if (arg === '--url') {
      options.url = args[index + 1]
      index += 1
    } else if (arg === '--event-id') {
      options.eventId = args[index + 1]
      index += 1
    } else if (arg === '--date') {
      options.date = args[index + 1]
      index += 1
    } else if (arg === '--output-dir') {
      options.outputDir = args[index + 1]
      index += 1
    } else if (arg === '--match-id') {
      options.matchId = args[index + 1]
      index += 1
    } else if (arg === '--timeout-ms') {
      options.timeoutMs = Number(args[index + 1])
      index += 1
    }
  }
  if (!options.url && !options.eventId) throw new Error('Pass --url SOFASCORE_URL or --event-id ID')
  return options
}

const normalizeName = (value) =>
  String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/gi, ' ')
    .trim()
    .toLowerCase()

const extractEventId = (url, explicitId = '') => {
  if (explicitId) return explicitId
  const hashMatch = String(url).match(/[#?&]id:(\d+)/)
  if (hashMatch) return hashMatch[1]
  const idMatch = String(url).match(/(?:event\/|id[:=/])(\d+)/)
  if (idMatch) return idMatch[1]
  throw new Error(`Unable to extract SofaScore event id from ${url}`)
}

const loadPlaywright = async () => {
  try {
    return await import('playwright')
  } catch {
    return import(pathToFileURL(path.join(BUNDLED_NODE_MODULES, 'playwright/index.mjs')).href)
  }
}

const fetchJson = async (page, apiPath, sourceUrl) => {
  const response = await page.request.get(`https://www.sofascore.com/api/v1/${apiPath}`, {
    headers: {
      accept: 'application/json, text/plain, */*',
      referer: sourceUrl || 'https://www.sofascore.com/'
    },
    timeout: 20000
  })
  const text = await response.text()
  let body = text
  try {
    body = JSON.parse(text)
  } catch {
    // keep text payload for error inspection
  }
  return { status: response.status(), ok: response.ok(), body }
}

const loadPublishedMatchId = async ({ slateDate, explicitMatchId, event }) => {
  if (explicitMatchId) return explicitMatchId
  if (!slateDate || !event?.homeTeam?.name || !event?.awayTeam?.name) return null
  const gamesDir = path.resolve(ROOT, 'published-data/slates', slateDate, 'games')
  let files = []
  try {
    files = await fs.readdir(gamesDir)
  } catch {
    return null
  }
  const targetNames = new Set([normalizeName(event.homeTeam.name), normalizeName(event.awayTeam.name)])
  for (const fileName of files.filter((name) => name.endsWith('.json'))) {
    const filePath = path.join(gamesDir, fileName)
    const game = JSON.parse(await fs.readFile(filePath, 'utf8'))
    if (game.league !== 'Tennis') continue
    const names = (game.tennisContext?.players || game.matchup || [])
      .map((player) => normalizeName(player.name || player.displayName))
      .filter(Boolean)
    if (names.length === 2 && names.every((name) => targetNames.has(name))) {
      return game.id
    }
  }
  return null
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

const main = async () => {
  const options = parseArgs()
  const eventId = extractEventId(options.url, options.eventId)
  const sourceUrl = options.url || `https://www.sofascore.com/event/${eventId}`
  const { chromium } = await loadPlaywright()
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36'
  })
  await page.goto(sourceUrl, { waitUntil: 'domcontentloaded', timeout: options.timeoutMs })

  const payloads = {
    event: await fetchJson(page, `event/${eventId}`, sourceUrl)
  }
  const event = payloads.event?.body?.event ?? null
  const uniqueTournamentId = event?.tournament?.uniqueTournament?.id
  const seasonId = event?.season?.id
  const endpoints = {
    statistics: `event/${eventId}/statistics`,
    h2h: `event/${eventId}/h2h`,
    votes: `event/${eventId}/votes`,
    tennisPower: `event/${eventId}/tennis-power`,
    winningOdds: `event/${eventId}/provider/1/winning-odds`,
    odds: `event/${eventId}/odds/1/featured`
  }
  for (const [key, apiPath] of Object.entries(endpoints)) {
    payloads[key] = await fetchJson(page, apiPath, sourceUrl)
  }
  if (uniqueTournamentId && seasonId && event?.homeTeam?.id) {
    payloads.homeSeasonStats = await fetchJson(
      page,
      `team/${event.homeTeam.id}/unique-tournament/${uniqueTournamentId}/season/${seasonId}/statistics/overall`,
      sourceUrl
    )
  }
  if (uniqueTournamentId && seasonId && event?.awayTeam?.id) {
    payloads.awaySeasonStats = await fetchJson(
      page,
      `team/${event.awayTeam.id}/unique-tournament/${uniqueTournamentId}/season/${seasonId}/statistics/overall`,
      sourceUrl
    )
  }
  await browser.close()
  const boardMatchId = await loadPublishedMatchId({
    slateDate: options.date,
    explicitMatchId: options.matchId,
    event
  })
  const output = {
    source: 'SofaScore',
    sourceUrl,
    eventId,
    slateDate: options.date || null,
    boardMatchId,
    capturedAt: new Date().toISOString(),
    compactEvent: compactEvent(event),
    payloads
  }
  const outputDir = path.resolve(ROOT, options.outputDir)
  await fs.mkdir(outputDir, { recursive: true })
  const outputPath = path.join(outputDir, `${eventId}.json`)
  await fs.writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`)
  console.log(`Wrote SofaScore tennis match ${eventId} to ${path.relative(ROOT, outputPath)}`)
  if (boardMatchId) console.log(`Mapped SofaScore event ${eventId} to board match ${boardMatchId}`)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
