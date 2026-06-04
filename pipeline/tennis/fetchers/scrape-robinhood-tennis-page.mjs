import fs from 'node:fs/promises'
import path from 'node:path'

const ROOT = path.resolve(import.meta.dirname, '..', '..', '..')
const SOURCE_URL = 'https://robinhood.com/us/en/prediction-markets/tennis/'
const SOURCE = 'Robinhood public prediction-markets tennis page'

const parseArgs = () => {
  const args = process.argv.slice(2)
  const options = {
    date: '',
    outputDir: 'data-private/odds/robinhood/tennis',
    referenceDir: 'data-private/reference/tennis'
  }
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index]
    if (arg === '--date') {
      options.date = String(args[index + 1] || '').trim()
      index += 1
    } else if (arg === '--output-dir') {
      options.outputDir = String(args[index + 1] || '').trim()
      index += 1
    } else if (arg === '--reference-dir') {
      options.referenceDir = String(args[index + 1] || '').trim()
      index += 1
    }
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(options.date)) throw new Error('Pass --date YYYY-MM-DD')
  return options
}

const values = (value) => (Array.isArray(value) ? value : Object.values(value || {}))

const extractNextData = (html) => {
  const match = String(html).match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/)
  if (!match) throw new Error('Robinhood __NEXT_DATA__ payload was not found')
  return JSON.parse(match[1])
}

const eventDayTimestamp = (event) =>
  (event.timeline?.entries || []).find((entry) => entry.title === 'Event day')?.timestamp || ''

const eventDayDate = (event) => eventDayTimestamp(event).slice(0, 10)

const eventDayLabel = (event) =>
  (event.timeline?.entries || []).find((entry) => entry.title === 'Event day')?.description || ''

const tournamentFromDescription = (event) => {
  const text = String(event.longDescription || '')
  return (
    text.match(/in the 2026 (.*?) Round Of/i)?.[1] ||
    text.match(/in the 2026 (.*?) (Round of \d+|Round Of \d+|Quarterfinal|Semifinal|Final)/i)?.[1] ||
    ''
  )
}

const roundFromDescription = (event) => {
  const text = String(event.longDescription || '')
  return (
    text.match(/2026 .*? (Round of \d+|Round Of \d+|Quarterfinal|Semifinal|Final)/i)?.[1] ||
    ''
  )
}

const compactPrice = (value) => {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? Number(numeric.toFixed(2)) : null
}

const cents = (value) => {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? Math.round(numeric * 100) : null
}

const normalizeName = (value) =>
  String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/gi, ' ')
    .trim()
    .toLowerCase()

const slug = (value) =>
  normalizeName(value)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

const isDoublesName = (value) => /[/&]/.test(String(value || ''))

const SURFACE_BY_TOURNAMENT_TOKEN = [
  [/french open|roland garros/i, 'Clay', 'Grand Slam tournament surface'],
  [/perugia/i, 'Clay', 'ATP Challenger Perugia surface'],
  [/prostejov/i, 'Clay', 'ATP Challenger Prostejov surface'],
  [/bad rappenau|heilbronn|neckarcup/i, 'Clay', 'ATP Challenger Bad Rappenau surface'],
  [/\b(birmingham|wimbledon|halle|queen)\b/i, 'Grass', 'Grass tournament surface'],
  [/tyler/i, 'Hard', 'ATP Challenger Tyler surface'],
  [/centurion/i, 'Hard', 'ATP Challenger Centurion surface']
]

export const inferSurface = (tournament, eventName = '') => {
  const text = `${tournament || ''} ${eventName || ''}`
  for (const [pattern, surface, source] of SURFACE_BY_TOURNAMENT_TOKEN) {
    if (pattern.test(text)) return { surface, surfaceSource: source }
  }
  return { surface: 'Unknown', surfaceSource: 'surface not mapped from Robinhood tournament text' }
}

const eventContracts = (event, quotesById, fundamentalsById) =>
  values(event.eventContracts).map((contract) => {
    const quote = quotesById.get(contract.id) || {}
    const fundamentals = fundamentalsById.get(contract.id) || {}
    const yesBid = compactPrice(quote.yes_bid_price ?? quote.bid_price)
    const yesAsk = compactPrice(quote.yes_ask_price ?? quote.ask_price)
    const last = compactPrice(quote.last_trade_price)
    return {
      id: contract.id,
      eventId: contract.eventId,
      symbol: contract.symbol,
      name: contract.displayLongName || contract.name || contract.displayShortName || '',
      shortName: contract.displayShortName || contract.name || '',
      countryFlagUrl: contract.imageUrl || '',
      tradability: contract.tradability || '',
      yesBid,
      yesAsk,
      lastTradePrice: last,
      yesBidCents: cents(yesBid),
      yesAskCents: cents(yesAsk),
      lastTradeCents: cents(last),
      openInterest: Number(fundamentals.open_interest ?? fundamentals.open_interest_fractional ?? 0) || 0,
      volume: Number(fundamentals.volume ?? 0) || 0,
      quoteUpdatedAt: quote.updated_at || quote.ask_venue_timestamp || quote.bid_venue_timestamp || null
    }
  })

const classify = (tournament, event) => {
  if (/French Open.*Women Singles/i.test(tournament)) return 'french_open_women_singles'
  if (/French Open.*Men Singles/i.test(tournament)) return 'french_open_men_singles'
  if (/ATP Challenger/i.test(tournament)) return 'atp_challenger_singles'
  if (/WTA 125K/i.test(tournament)) return 'wta_125k_singles'
  if (/ITF|^M\d+|^W\d+/i.test(tournament)) return 'itf'
  return event.isSports ? 'tennis_other' : 'other'
}

const buildMarketRows = (pageProps, date) => {
  const quotesById = new Map(values(pageProps.quotes).map((quote) => [quote.instrument_id, quote]))
  const fundamentalsById = new Map(values(pageProps.fundamentals).map((row) => [row.instrument_id, row]))
  const rows = []
  for (const event of values(pageProps.events)) {
    if (eventDayDate(event) !== date) continue
    const contracts = eventContracts(event, quotesById, fundamentalsById)
    const tournament = tournamentFromDescription(event)
    const round = roundFromDescription(event)
    const singles = contracts.length === 2 && contracts.every((contract) => !isDoublesName(contract.name))
    rows.push({
      id: event.id,
      name: event.name,
      eventDay: eventDayLabel(event),
      eventDayTimestamp: eventDayTimestamp(event),
      tournament,
      category: classify(tournament, event),
      round,
      state: event.state || '',
      isLive: Boolean(event.isLive),
      isSports: Boolean(event.isSports),
      singles,
      mutuallyExclusive: Boolean(event.mutuallyExclusive),
      seriesId: event.seriesId || '',
      urlSlugs: event.urlSlugs || [],
      contracts,
      sourceUrl: SOURCE_URL
    })
  }
  return rows.sort((left, right) => left.eventDayTimestamp.localeCompare(right.eventDayTimestamp) || left.name.localeCompare(right.name))
}

const toSupplementMatch = (row, date) => {
  const surfaceInfo = inferSurface(row.tournament, row.name)
  const players = row.contracts.map((contract) => ({
    name: contract.name,
    shortName: contract.shortName,
    symbol: contract.symbol,
    yesBid: contract.yesBid,
    yesAsk: contract.yesAsk,
    lastTradePrice: contract.lastTradePrice,
    yesBidCents: contract.yesBidCents,
    yesAskCents: contract.yesAskCents,
    lastTradeCents: contract.lastTradeCents,
    openInterest: contract.openInterest,
    volume: contract.volume
  }))
  const id = `rh-${slug(row.tournament)}-${slug(row.name)}-${date}`
  return {
    id,
    eventId: row.id,
    source: SOURCE,
    sourceUrl: row.sourceUrl,
    title: players.map((player) => player.name).join(' vs '),
    tournament: row.tournament,
    category: row.category,
    round: row.round,
    surface: surfaceInfo.surface,
    surfaceSource: surfaceInfo.surfaceSource,
    startIso: row.eventDayTimestamp,
    eventDay: row.eventDay,
    singles: row.singles,
    players,
    predictionMarket: {
      source: SOURCE,
      eventId: row.id,
      totalOpenInterest: players.reduce((sum, player) => sum + Number(player.openInterest || 0), 0),
      totalVolume: players.reduce((sum, player) => sum + Number(player.volume || 0), 0),
      players: players.map((player) => ({
        name: player.name,
        probabilityPct: player.yesAskCents,
        bidPct: player.yesBidCents,
        lastTradePct: player.lastTradeCents,
        amount: player.openInterest,
        symbol: player.symbol
      }))
    }
  }
}

const writeJson = async (filePath, payload) => {
  await fs.mkdir(path.dirname(filePath), { recursive: true })
  await fs.writeFile(filePath, `${JSON.stringify(payload, null, 2)}\n`)
}

const main = async () => {
  const options = parseArgs()
  const response = await fetch(SOURCE_URL, {
    headers: { 'user-agent': 'Mozilla/5.0' }
  })
  if (!response.ok) throw new Error(`Robinhood tennis request failed ${response.status}`)
  const html = await response.text()
  const data = extractNextData(html)
  const rows = buildMarketRows(data.props?.pageProps || {}, options.date)
  const atpChallenger = rows
    .filter((row) => row.singles && row.category === 'atp_challenger_singles')
    .map((row) => toSupplementMatch(row, options.date))
  const frenchOpenSingles = rows
    .filter((row) => row.singles && /^french_open_/.test(row.category))
    .map((row) => toSupplementMatch(row, options.date))
  const nonItfSingles = rows
    .filter((row) => row.singles && row.category !== 'itf')
    .map((row) => toSupplementMatch(row, options.date))

  const payload = {
    date: options.date,
    source: SOURCE,
    sourceUrl: SOURCE_URL,
    capturedAt: new Date().toISOString(),
    totalEvents: rows.length,
    categoryCounts: rows.reduce((counts, row) => {
      counts[row.category] = (counts[row.category] || 0) + 1
      return counts
    }, {}),
    events: rows
  }
  const supplementMatches = nonItfSingles.sort(
    (left, right) => left.startIso.localeCompare(right.startIso) || left.title.localeCompare(right.title)
  )
  const supplement = {
    date: options.date,
    source: SOURCE,
    sourceUrl: SOURCE_URL,
    capturedAt: payload.capturedAt,
    totalEvents: rows.length,
    atpChallengerSingles: atpChallenger.length,
    frenchOpenSingles: frenchOpenSingles.length,
    nonItfSingles: nonItfSingles.length,
    surfaceCounts: supplementMatches.reduce((counts, row) => {
      counts[row.surface || 'Unknown'] = (counts[row.surface || 'Unknown'] || 0) + 1
      return counts
    }, {}),
    matches: supplementMatches
  }

  const outputRoot = path.resolve(ROOT, options.outputDir)
  const referenceRoot = path.resolve(ROOT, options.referenceDir)
  await writeJson(path.join(outputRoot, `${options.date}-robinhood-tennis-markets.json`), payload)
  await writeJson(path.join(referenceRoot, `robinhood-tennis-markets-${options.date}.json`), payload)
  await writeJson(path.join(referenceRoot, `robinhood-tennis-supplement-${options.date}.json`), supplement)

  console.log(
    JSON.stringify(
      {
        date: options.date,
        totalEvents: rows.length,
        categoryCounts: payload.categoryCounts,
        supplementMatches: supplement.matches.length,
        atpChallengerSingles: supplement.atpChallengerSingles,
        frenchOpenSingles: supplement.frenchOpenSingles,
        nonItfSingles: supplement.nonItfSingles
      },
      null,
      2
    )
  )
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
