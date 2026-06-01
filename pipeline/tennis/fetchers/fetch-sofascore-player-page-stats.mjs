import fs from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const ROOT = path.resolve(import.meta.dirname, '..', '..', '..')
const DEFAULT_OUTPUT_DIR = 'data-private/reference/tennis/sofascore-player-stats'
const SOFASCORE_MATCH_DIR = 'data-private/reference/tennis/sofascore-match-data'
const BUNDLED_NODE_MODULES =
  '/Users/jcchen/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules'

const parseArgs = () => {
  const args = process.argv.slice(2)
  const options = {
    date: '',
    outputDir: DEFAULT_OUTPUT_DIR,
    timeoutMs: 30000,
    headful: false
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
    } else if (arg === '--headful') {
      options.headful = true
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

const slugify = (value) =>
  normalizeName(value)
    .replace(/\s+/g, '-')
    .replace(/^-+|-+$/g, '')

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

const slatePlayers = async (date) => {
  const gamesDir = path.resolve(ROOT, 'published-data/slates', date, 'games')
  const files = await fs.readdir(gamesDir).catch(() => [])
  const players = new Map()
  for (const fileName of files.filter((name) => name.endsWith('.json'))) {
    const game = await readJsonIfExists(path.join(gamesDir, fileName), null)
    if (game?.league !== 'Tennis') continue
    for (const player of game.tennisContext?.players || game.matchup || []) {
      const name = player.name || player.displayName
      const normalized = normalizeName(name)
      if (!normalized) continue
      players.set(normalized, { name, normalized, matchIds: new Set([game.id]) })
    }
  }
  return players
}

const discoverSofascoreIds = async (players) => {
  const matchDir = path.resolve(ROOT, SOFASCORE_MATCH_DIR)
  const files = await fs.readdir(matchDir).catch(() => [])
  const targets = new Set(players.keys())
  for (const fileName of files.filter((name) => name.endsWith('.json'))) {
    const payload = await readJsonIfExists(path.join(matchDir, fileName), null)
    if (!payload) continue
    const event = payload.compactEvent || payload.payloads?.event?.body?.event || {}
    for (const side of ['homeTeam', 'awayTeam']) {
      const team = event[side] || {}
      const normalized = normalizeName(team.name)
      if (!targets.has(normalized)) continue
      const bucket = players.get(normalized)
      if (!bucket.sofascorePlayerId && team.id) bucket.sofascorePlayerId = Number(team.id)
      if (!bucket.shortName && team.shortName) bucket.shortName = team.shortName
      if (!bucket.country && team.country) bucket.country = team.country
      if (!bucket.exampleSourceFile) bucket.exampleSourceFile = path.join(SOFASCORE_MATCH_DIR, fileName)
    }
  }
  return players
}

const pctValue = (raw) => {
  const match = String(raw || '').match(/(-?\d+(?:\.\d+)?)\s*%/)
  return match ? Number(match[1]) : null
}

const numberValue = (raw) => {
  const match = String(raw || '').match(/-?\d+(?:\.\d+)?/)
  return match ? Number(match[0]) : null
}

const fractionValue = (raw) => {
  const match = String(raw || '').match(/(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)/)
  if (!match) return null
  const made = Number(match[1])
  const attempts = Number(match[2])
  return {
    made,
    attempts,
    pct: attempts ? Number(((made / attempts) * 100).toFixed(1)) : null
  }
}

const extractAfterLabel = (section, label) => {
  const lines = section.split(/\n+/).map((line) => line.trim()).filter(Boolean)
  const index = lines.findIndex((line) => line.toLowerCase() === label.toLowerCase())
  return index >= 0 ? lines[index + 1] || null : null
}

const parseStatsSection = (bodyText, surface) => {
  const start = bodyText.indexOf('Performance')
  if (start < 0) return null
  const after = bodyText.indexOf('Stats based on available data', start)
  const section = bodyText.slice(start, after > start ? after : undefined)
  const matchesWon = extractAfterLabel(section, 'Matches won')
  const tournamentsWon = extractAfterLabel(section, 'Tournaments won')
  const breakPointsSaved = extractAfterLabel(section, 'Break points saved')
  const breakPointsConverted = extractAfterLabel(section, 'Break points converted')
  const tiebreaksWon = extractAfterLabel(section, 'Tiebreaks won')
  const matchesFraction = fractionValue(matchesWon)
  const tournamentFraction = fractionValue(tournamentsWon)
  const savedFraction = fractionValue(breakPointsSaved)
  const convertedFraction = fractionValue(breakPointsConverted)
  const tiebreakFraction = fractionValue(tiebreaksWon)
  const stats = {
    surface,
    matchesWonRaw: matchesWon,
    matchesWon: matchesFraction?.made ?? null,
    matchesTotal: matchesFraction?.attempts ?? null,
    matchesWonPct: pctValue(matchesWon) ?? matchesFraction?.pct ?? null,
    tournamentsWonRaw: tournamentsWon,
    tournamentsWon: tournamentFraction?.made ?? null,
    tournamentsTotal: tournamentFraction?.attempts ?? null,
    tournamentsWonPct: pctValue(tournamentsWon) ?? tournamentFraction?.pct ?? null,
    firstServePct: pctValue(extractAfterLabel(section, '1st serve')),
    firstServeWonPct: pctValue(extractAfterLabel(section, '1st serve points won')),
    secondServePct: pctValue(extractAfterLabel(section, '2nd serve')),
    secondServeWonPct: pctValue(extractAfterLabel(section, '2nd serve points won')),
    acesPerMatch: numberValue(extractAfterLabel(section, 'Aces per match')),
    doubleFaultsPerMatch: numberValue(extractAfterLabel(section, 'Double faults per match')),
    breakPointsSavedRaw: breakPointsSaved,
    breakPointsSaved: savedFraction?.made ?? null,
    breakPointsFaced: savedFraction?.attempts ?? null,
    breakPointsSavedPct: pctValue(breakPointsSaved) ?? savedFraction?.pct ?? null,
    breakPointsConvertedRaw: breakPointsConverted,
    breakPointsConverted: convertedFraction?.made ?? null,
    breakPointsToConvert: convertedFraction?.attempts ?? null,
    breakPointsConvertedPct: pctValue(breakPointsConverted) ?? convertedFraction?.pct ?? null,
    tiebreaksWonRaw: tiebreaksWon,
    tiebreaksWon: tiebreakFraction?.made ?? null,
    tiebreaksTotal: tiebreakFraction?.attempts ?? null,
    tiebreaksWonPct: pctValue(tiebreaksWon) ?? tiebreakFraction?.pct ?? null
  }
  const useful = Object.entries(stats).some(([key, value]) => key !== 'surface' && value !== null && value !== undefined)
  return useful ? stats : null
}

const clickSurface = async (page, label) => {
  const chip = page.locator('div').filter({ hasText: new RegExp(`^${label}$`, 'i') }).first()
  await chip.click({ timeout: 10000 })
  await page.waitForTimeout(1200)
}

const fetchPlayer = async (page, player, options) => {
  const sourceUrl = `https://www.sofascore.com/tennis/player/${slugify(player.name)}/${player.sofascorePlayerId}#tab:statistics`
  await page.goto(sourceUrl, { waitUntil: 'domcontentloaded', timeout: options.timeoutMs })
  await page.waitForTimeout(2500)
  const allText = await page.locator('body').innerText({ timeout: 10000 })
  const allSurfaces = parseStatsSection(allText, 'All surfaces')
  let clay = null
  try {
    await clickSurface(page, 'Clay')
    const clayText = await page.locator('body').innerText({ timeout: 10000 })
    clay = parseStatsSection(clayText, 'Clay')
  } catch (error) {
    clay = { surface: 'Clay', error: error.message }
  }
  return {
    name: player.name,
    normalizedName: player.normalized,
    shortName: player.shortName || null,
    sofascorePlayerId: player.sofascorePlayerId,
    sourceUrl: page.url(),
    requestedUrl: sourceUrl,
    matchIds: [...player.matchIds],
    exampleSourceFile: player.exampleSourceFile || null,
    capturedAt: new Date().toISOString(),
    season: 2026,
    stats: {
      allSurfaces,
      clay
    }
  }
}

const main = async () => {
  const options = parseArgs()
  const players = await discoverSofascoreIds(await slatePlayers(options.date))
  const missing = [...players.values()].filter((player) => !player.sofascorePlayerId)
  const targets = [...players.values()].filter((player) => player.sofascorePlayerId)
  const { chromium } = await loadPlaywright()
  const browser = await chromium.launch({ headless: !options.headful })
  const page = await browser.newPage({
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36'
  })
  const rows = []
  for (const player of targets) {
    try {
      rows.push(await fetchPlayer(page, player, options))
      console.log(`Fetched SofaScore player stats: ${player.name}`)
    } catch (error) {
      rows.push({
        name: player.name,
        normalizedName: player.normalized,
        sofascorePlayerId: player.sofascorePlayerId,
        error: error.message,
        capturedAt: new Date().toISOString(),
        stats: {}
      })
      console.warn(`Failed SofaScore player stats: ${player.name}: ${error.message}`)
    }
  }
  await browser.close()

  const output = {
    source: 'SofaScore player pages',
    slateDate: options.date,
    capturedAt: new Date().toISOString(),
    season: 2026,
    filters: ['All surfaces', 'Clay'],
    players: rows,
    missingPlayerIds: missing.map((player) => ({ name: player.name, normalizedName: player.normalized }))
  }
  const outputDir = path.resolve(ROOT, options.outputDir)
  await fs.mkdir(outputDir, { recursive: true })
  const outputPath = path.join(outputDir, `${options.date}.json`)
  await fs.writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`)
  console.log(`Wrote SofaScore player-page stats to ${path.relative(ROOT, outputPath)}`)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
