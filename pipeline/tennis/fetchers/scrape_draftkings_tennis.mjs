import fs from 'node:fs/promises'
import path from 'node:path'

const ROOT = path.resolve(import.meta.dirname, '..', '..', '..')
const SOURCE = 'DraftKings Sportsbook BFF'
const BASE_URL = 'https://sportsbook-nash.draftkings.com/sites/US-SB/api/sportscontent/dkusnj'
const USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125 Safari/537.36'
const CATEGORY_PROBES = ['match lines', 'sets', 'first game props', 'first x games props', 'player props', 'match props']

const parseArgs = () => {
  const args = process.argv.slice(2)
  const options = { date: '' }
  for (let index = 0; index < args.length; index += 1) {
    if (args[index] === '--date') {
      options.date = args[index + 1]
      index += 1
    }
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(options.date)) {
    throw new Error('Usage: node pipeline/tennis/fetchers/scrape_draftkings_tennis.mjs --date YYYY-MM-DD')
  }
  return options
}

const readJson = async (relativePath, fallback = null) => {
  try {
    return JSON.parse(await fs.readFile(path.join(ROOT, relativePath), 'utf8'))
  } catch (error) {
    if (fallback !== null) return fallback
    throw error
  }
}

const fetchJson = async (url) => {
  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
      'User-Agent': USER_AGENT
    }
  })
  const text = await response.text()
  if (!response.ok && response.status !== 302) {
    throw new Error(`DraftKings ${response.status} for ${url}: ${text.slice(0, 200)}`)
  }
  try {
    return JSON.parse(text)
  } catch {
    return { errorStatus: { code: `http-${response.status}`, raw: text.slice(0, 400) } }
  }
}

const normalizeName = (value) =>
  String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/gi, ' ')
    .trim()
    .toLowerCase()

const tokenKey = (value) => normalizeName(value).split(' ').filter(Boolean).sort().join(' ')

const loadSlateMatches = async (date) => {
  const modulePath = path.join(ROOT, 'web', 'src', 'lib', `day-${date}.js`)
  try {
    const day = await import(`${modulePath}?cacheBust=${Date.now()}`)
    return (Array.isArray(day.games) ? day.games : [])
      .filter((game) => game?.league === 'Tennis' && Array.isArray(game.matchup) && game.matchup.length === 2)
      .map((game) => ({
        id: game.id,
        title: game.title,
        stage: game.stage,
        players: game.matchup.map((entry) => ({ name: entry.name || entry.displayName })).filter((entry) => entry.name)
      }))
      .filter((match) => match.players.length === 2)
  } catch {
    return []
  }
}

const loadDraftKingsLeagues = async () => {
  const html = await fetch('https://sportsbook.draftkings.com/sports/tennis', {
    headers: { 'User-Agent': USER_AGENT }
  }).then((response) => response.text())
  const match = html.match(/window\.__INITIAL_STATE__ = (.*?);\n\s*<\/script>/s)
  if (!match) throw new Error('DraftKings initial state was not found.')
  const state = JSON.parse(match[1])
  const tennis = (state.sports?.data || []).find((sport) => sport.nameIdentifier === 'tennis' || sport.displayName === 'Tennis')
  return (tennis?.eventGroupInfos || []).filter((league) => {
    const text = `${league.eventGroupName || ''} ${league.nameIdentifier || ''}`.toLowerCase()
    return !text.includes('doubles') && !text.includes('itf')
  })
}

const splitEventName = (name) => String(name || '').split(/\s+vs\s+/i).map((part) => part.trim()).filter(Boolean)

const americanOdds = (selection) => {
  const value = selection?.displayOdds?.american
  if (value === null || value === undefined) return null
  const normalized = String(value).replace(/[−–—]/g, '-').replace(/[^+\-\d]/g, '')
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : null
}

const lineValue = (selection) => {
  const points = Number(selection?.points)
  return Number.isFinite(points) ? points : null
}

const selectionsFor = (payload, market) => (payload.selections || []).filter((selection) => String(selection.marketId) === String(market?.id))

const marketsNamed = (payload, pattern) => (payload.markets || []).filter((market) => pattern.test(String(market.name || '')))

const mainPointSelections = (payload, market) => {
  const rows = selectionsFor(payload, market)
  const tagged = rows.filter((selection) => (selection.tags || []).includes('MainPointLine'))
  return tagged.length ? tagged : rows
}

const dedupeByKey = (rows, keyFn) => {
  const seen = new Set()
  return rows.filter((row) => {
    const key = keyFn(row)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

const mergePayloads = (...payloads) => {
  const merged = { markets: [], selections: [] }
  for (const payload of payloads) {
    merged.markets.push(...(payload?.markets || []))
    merged.selections.push(...(payload?.selections || []))
  }
  merged.markets = dedupeByKey(merged.markets, (market) => String(market.id))
  merged.selections = dedupeByKey(merged.selections, (selection) => String(selection.id))
  return merged
}

const playerFromServiceMarket = (marketName) =>
  String(marketName || '')
    .replace(/[’']/g, "'")
    .replace(/\s*'s\s+1st Service Game.*$/i, '')
    .trim()

const parseMarkets = (eventPayload, categoryPayloads) => {
  const byCategory = Object.fromEntries(categoryPayloads.map((entry) => [entry.category, entry.payload]))
  const all = mergePayloads(eventPayload, ...categoryPayloads.map((entry) => entry.payload))
  const matchLines = byCategory['match lines'] || all
  const sets = byCategory.sets || all
  const firstGame = byCategory['first game props'] || all

  const moneyline = marketsNamed(all, /^Moneyline$/i)[0]
  const gameSpread = marketsNamed(matchLines, /^Games Spread$/i)[0]
  const totalGames = marketsNamed(matchLines, /^Total Games$/i)[0]
  const firstSetTotal = marketsNamed(sets, /^Total Games - 1st Set$/i)[0]
  const setWinMarkets = marketsNamed(sets, /^Player to Win at Least One Set$/i)
  const firstServiceGameMarkets = marketsNamed(firstGame, /1st Service Game/i)
  const firstGamePropMarkets = marketsNamed(all, /^First \d+ Game Props$/i)

  return {
    moneyline: moneyline
      ? selectionsFor(all, moneyline).map((selection) => ({ player: selection.label, odds: americanOdds(selection) }))
      : [],
    gameHandicap: gameSpread
      ? mainPointSelections(matchLines, gameSpread).map((selection) => ({
          player: selection.label,
          spread: lineValue(selection),
          odds: americanOdds(selection)
        }))
      : [],
    totalGames: totalGames
      ? mainPointSelections(matchLines, totalGames).map((selection) => ({
          side: selection.outcomeType || selection.label,
          line: lineValue(selection),
          odds: americanOdds(selection)
        }))
      : [],
    firstSetTotalGames: firstSetTotal
      ? mainPointSelections(sets, firstSetTotal).map((selection) => ({
          side: selection.outcomeType || selection.label,
          line: lineValue(selection),
          odds: americanOdds(selection)
        }))
      : [],
    firstGameTotalPoints: [],
    firstServiceGameTotalPoints: firstServiceGameMarkets.flatMap((market) => {
      const player = playerFromServiceMarket(market.name)
      return selectionsFor(firstGame, market).map((selection) => ({
        player,
        market: market.name,
        side: selection.label,
        line: lineValue(selection),
        odds: americanOdds(selection)
      }))
    }),
    firstGameProps: firstGamePropMarkets.flatMap((market) =>
      selectionsFor(all, market).map((selection) => ({
        market: market.name,
        selection: selection.label,
        odds: americanOdds(selection)
      }))
    ),
    winAtLeastOneSet: setWinMarkets.flatMap((market) =>
      selectionsFor(sets, market).map((selection) => ({
        market: market.name,
        player: (selection.participants || [])[0]?.name || String(selection.label || '').replace(/\s+(Yes|No)$/i, ''),
        selection: selection.label,
        odds: americanOdds(selection)
      }))
    ),
    marketNames: [...new Set((all.markets || []).map((market) => market.name).filter(Boolean))].sort(),
    rawMarkets: all.markets,
    rawSelections: all.selections
  }
}

const eventUrl = (eventId) => `${BASE_URL}/v1/events/${eventId}/categories/`
const categoryUrl = (eventId, category) => `${BASE_URL}/v1/events/${eventId}/categories?categoryName=${encodeURIComponent(category)}`

const fetchEventDetail = async (eventId) => {
  const eventPayload = await fetchJson(eventUrl(eventId))
  const categoryPayloads = []
  for (const category of CATEGORY_PROBES) {
    const payload = await fetchJson(categoryUrl(eventId, category))
    if (!payload.errorStatus) categoryPayloads.push({ category, payload })
  }
  return {
    eventPayload,
    categoryPayloads,
    markets: parseMarkets(eventPayload, categoryPayloads)
  }
}

const main = async () => {
  const options = parseArgs()
  const [slateMatches, leagues] = await Promise.all([loadSlateMatches(options.date), loadDraftKingsLeagues()])
  const slateKeys = new Map(
    slateMatches.map((match) => [
      match.players.map((player) => tokenKey(player.name)).sort().join(' | '),
      match
    ])
  )
  const matches = []
  const unmatched = new Set([...slateKeys.values()].map((match) => match.players.map((player) => player.name).join(' vs ')))
  const leagueReceipts = []

  for (const league of leagues) {
    const leaguePayload = await fetchJson(`${BASE_URL}/v1/leagues/${league.eventGroupId}`)
    leagueReceipts.push({
      eventGroupId: league.eventGroupId,
      eventGroupName: league.eventGroupName,
      events: (leaguePayload.events || []).length,
      markets: (leaguePayload.markets || []).length
    })
    for (const event of leaguePayload.events || []) {
      if (String(event.status || '').toUpperCase() !== 'NOT_STARTED') continue
      const eventDate = String(event.startEventDate || '').slice(0, 10)
      if (eventDate !== options.date) continue
      const names = splitEventName(event.name)
      if (names.length !== 2) continue
      const key = names.map(tokenKey).sort().join(' | ')
      const slateMatch = slateKeys.get(key)
      if (!slateMatch) continue
      const detail = await fetchEventDetail(event.id)
      matches.push({
        match: slateMatch.players.map((player) => player.name).join(' vs '),
        draftKingsMatch: event.name,
        href: `https://sportsbook.draftkings.com/leagues/tennis/${league.urlName}?event=${event.id}`,
        eventId: event.id,
        leagueId: league.eventGroupId,
        leagueName: league.eventGroupName,
        startEventDate: event.startEventDate,
        markets: detail.markets,
        capturedAt: new Date().toISOString(),
        source: SOURCE
      })
      unmatched.delete(slateMatch.players.map((player) => player.name).join(' vs '))
      console.log(`Captured DK ${event.name} (${league.eventGroupName})`)
    }
  }

  const payload = {
    date: options.date,
    source: SOURCE,
    sourceUrl: 'https://sportsbook.draftkings.com/sports/tennis',
    capturedAt: new Date().toISOString(),
    matches,
    unmatched: [...unmatched],
    leagues: leagueReceipts
  }
  const output = path.join(ROOT, 'data-private', 'reference', 'tennis', `draftkings-lines-${options.date}.json`)
  await fs.mkdir(path.dirname(output), { recursive: true })
  await fs.writeFile(output, `${JSON.stringify(payload, null, 2)}\n`)
  console.log(`Wrote ${matches.length} DraftKings tennis events to ${output}`)
  if (payload.unmatched.length) console.log(`Unmatched: ${payload.unmatched.join(' | ')}`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
