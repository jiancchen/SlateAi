import fs from 'node:fs/promises'
import path from 'node:path'

const ROOT = path.resolve(import.meta.dirname, '..', '..', '..')
const SOURCE = 'DraftKings Sportsbook BFF'
const BASE_URL = 'https://sportsbook-nash.draftkings.com/sites/US-SB/api/sportscontent/dkusnj'
const LEAGUE_ID = '84240'
const SOURCE_URL = 'https://sportsbook.draftkings.com/leagues/baseball/mlb'
const USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125 Safari/537.36'
const CATEGORY_PROBES = ['Game Lines', '1st X Innings', 'Pitcher Props']

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
    throw new Error('Usage: node pipeline/mlb/fetchers/scrape_draftkings_mlb.mjs --date YYYY-MM-DD')
  }
  return options
}

const fetchJson = async (url) => {
  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
      'User-Agent': USER_AGENT
    }
  })
  const text = await response.text()
  if (!response.ok) {
    const error = new Error(`DraftKings ${response.status} for ${url}: ${text.slice(0, 200)}`)
    error.status = response.status
    error.body = text
    error.url = url
    throw error
  }
  try {
    return JSON.parse(text)
  } catch {
    return { errorStatus: { code: `http-${response.status}`, raw: text.slice(0, 400) } }
  }
}

const readJson = async (filePath, fallback = null) => {
  try {
    return JSON.parse(await fs.readFile(filePath, 'utf8'))
  } catch (error) {
    if (error.code === 'ENOENT') return fallback
    throw error
  }
}

const isMissingCategoryError = (error) => {
  if (error?.status !== 302) return false
  try {
    const payload = JSON.parse(error.body || '{}')
    return payload?.errorStatus?.code === 'STDM-302-000' &&
      /Category name .* was not found/i.test(String(payload?.errorStatus?.developerMessage || ''))
  } catch {
    return /Category name .* was not found/i.test(String(error?.body || error?.message || ''))
  }
}

const previousCategoryPayload = (previousEvent, category) => {
  const previousCategory = (previousEvent?.categories || []).find((entry) => entry.category === category)
  if (!previousCategory) return null
  return {
    markets: previousCategory.markets || [],
    selections: previousCategory.selections || []
  }
}

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

const parseMarkets = (categoryPayloads) => {
  const byCategory = Object.fromEntries(categoryPayloads.map((entry) => [entry.category, entry.payload]))
  const all = mergePayloads(...categoryPayloads.map((entry) => entry.payload))
  const gameLines = byCategory['Game Lines'] || all
  const firstX = byCategory['1st X Innings'] || all
  const moneyline = marketsNamed(gameLines, /^Moneyline$/i)[0]
  const runLine = marketsNamed(gameLines, /^Run Line$/i)[0]
  const total = marketsNamed(gameLines, /^Total$/i)[0]
  const first5Winner = marketsNamed(firstX, /^1st 5 Innings$/i)[0]
  const first5RunLine = marketsNamed(firstX, /^Run Line - 1st 5 Innings$/i)[0]
  const first5Total = marketsNamed(firstX, /^Total Runs - 1st 5 Innings$/i)[0]

  return {
    moneyline: moneyline
      ? selectionsFor(gameLines, moneyline).map((selection) => ({
          team: selection.label,
          side: selection.outcomeType,
          odds: americanOdds(selection)
        }))
      : [],
    runLine: runLine
      ? mainPointSelections(gameLines, runLine).map((selection) => ({
          team: selection.label,
          side: selection.outcomeType,
          line: lineValue(selection),
          odds: americanOdds(selection)
        }))
      : [],
    total: total
      ? mainPointSelections(gameLines, total).map((selection) => ({
          side: selection.outcomeType || selection.label,
          line: lineValue(selection),
          odds: americanOdds(selection)
        }))
      : [],
    first5Moneyline: first5Winner
      ? selectionsFor(firstX, first5Winner).map((selection) => ({
          team: selection.label,
          side: selection.outcomeType,
          odds: americanOdds(selection)
        }))
      : [],
    first5RunLine: first5RunLine
      ? mainPointSelections(firstX, first5RunLine).map((selection) => ({
          team: selection.label,
          side: selection.outcomeType,
          line: lineValue(selection),
          odds: americanOdds(selection)
        }))
      : [],
    first5Total: first5Total
      ? mainPointSelections(firstX, first5Total).map((selection) => ({
          side: selection.outcomeType || selection.label,
          line: lineValue(selection),
          odds: americanOdds(selection)
        }))
      : [],
    marketNames: [...new Set((all.markets || []).map((market) => market.name).filter(Boolean))].sort(),
    rawMarkets: all.markets,
    rawSelections: all.selections
  }
}

const eventCategoryUrl = (eventId, category) =>
  `${BASE_URL}/v1/events/${eventId}/categories?categoryName=${encodeURIComponent(category)}`

const fetchEventDetail = async (eventId, previousEvent = null) => {
  const categoryPayloads = []
  for (const category of CATEGORY_PROBES) {
    try {
      const payload = await fetchJson(eventCategoryUrl(eventId, category))
      if (!payload.errorStatus) categoryPayloads.push({ category, payload })
    } catch (error) {
      if (!isMissingCategoryError(error)) throw error
      const previousPayload = previousCategoryPayload(previousEvent, category)
      if (previousPayload) {
        console.warn(`DraftKings missing ${category} for event ${eventId}; reusing previous same-event category snapshot.`)
        categoryPayloads.push({
          category,
          payload: previousPayload,
          reusedFromPreviousSnapshot: true,
          previousCapturedAt: previousEvent?.capturedAt || null
        })
      } else {
        console.warn(`DraftKings missing ${category} for event ${eventId}; no previous same-event category snapshot available.`)
      }
    }
  }
  return {
    categoryPayloads: categoryPayloads.map((entry) => ({
      category: entry.category,
      markets: entry.payload.markets || [],
      selections: entry.payload.selections || [],
      reusedFromPreviousSnapshot: Boolean(entry.reusedFromPreviousSnapshot),
      previousCapturedAt: entry.previousCapturedAt || null
    })),
    markets: parseMarkets(categoryPayloads)
  }
}

const main = async () => {
  const options = parseArgs()
  const output = path.join(ROOT, 'data-private', 'odds', 'draftkings', 'mlb', `${options.date}-draftkings-mlb-lines.json`)
  const previousPayload = await readJson(output, { events: [] })
  const previousEventsById = new Map((previousPayload.events || []).map((event) => [String(event.eventId), event]))
  const leaguePayload = await fetchJson(`${BASE_URL}/v1/leagues/${LEAGUE_ID}`)
  const events = []
  const leagueEvents = (leaguePayload.events || []).filter((event) => String(event.startEventDate || '').slice(0, 10) === options.date)

  for (const event of leagueEvents) {
    const detail = await fetchEventDetail(event.id, previousEventsById.get(String(event.id)))
    events.push({
      eventId: event.id,
      name: event.name,
      status: event.status,
      startEventDate: event.startEventDate,
      href: `${SOURCE_URL}?event=${event.id}`,
      leagueId: LEAGUE_ID,
      markets: detail.markets,
      categories: detail.categoryPayloads,
      capturedAt: new Date().toISOString(),
      source: SOURCE
    })
    console.log(`Captured DK MLB ${event.name}`)
  }

  const payload = {
    date: options.date,
    source: SOURCE,
    sourceUrl: SOURCE_URL,
    capturedAt: new Date().toISOString(),
    leagueId: LEAGUE_ID,
    events,
    leagueReceipt: {
      leagueId: LEAGUE_ID,
      events: leagueEvents.length,
      sourceEvents: (leaguePayload.events || []).length,
      sourceMarkets: (leaguePayload.markets || []).length,
      sourceSelections: (leaguePayload.selections || []).length
    }
  }
  await fs.mkdir(path.dirname(output), { recursive: true })
  await fs.writeFile(output, `${JSON.stringify(payload, null, 2)}\n`, 'utf8')
  console.log(`Wrote ${events.length} DraftKings MLB events to ${output}`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
