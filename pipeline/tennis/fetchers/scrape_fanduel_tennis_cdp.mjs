import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..')
const CDP = process.env.CHROME_CDP_URL || 'http://127.0.0.1:9222'
const APP_KEY = 'FhMFpcPWXMeyZxOx'
const SOURCE = 'FanDuel Sportsbook event-page Chrome scrape'

const parseArgs = () => {
  const args = process.argv.slice(2)
  const options = { date: '' }
  for (let index = 0; index < args.length; index += 1) {
    if (args[index] === '--date') options.date = args[index + 1]
  }
  if (!options.date) throw new Error('Usage: node pipeline/tennis/fetchers/scrape_fanduel_tennis_cdp.mjs --date YYYY-MM-DD')
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

const loadSlateMatches = async (date) => {
  const modulePath = path.join(ROOT, 'web', 'src', 'lib', `day-${date}.js`)
  try {
    const day = await import(`${modulePath}?cacheBust=${Date.now()}`)
    const games = Array.isArray(day.games) ? day.games : []
    return games
      .filter((game) => game?.league === 'Tennis' && Array.isArray(game.matchup) && game.matchup.length === 2)
      .map((game) => ({
        id: game.id,
        round: game.stage,
        players: game.matchup.map((entry) => ({ name: entry.name || entry.displayName })).filter((entry) => entry.name)
      }))
      .filter((match) => match.players.length === 2)
  } catch {
    return []
  }
}

const normalizeName = (value) =>
  String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/gi, ' ')
    .trim()
    .toLowerCase()
    .replace(/\bxiyu wang\b/g, 'wang xiyu')
    .replace(/\byibing wu\b/g, 'wu yibing')

const tokenKey = (value) => normalizeName(value).split(' ').filter(Boolean).sort().join(' ')

const newTarget = async (url = 'about:blank') =>
  fetch(`${CDP}/json/new?${encodeURIComponent(url)}`, { method: 'PUT' }).then((response) => response.json())

const closeTarget = async (id) => {
  if (!id) return
  await fetch(`${CDP}/json/close/${id}`).catch(() => {})
}

class CdpPage {
  constructor(target) {
    this.target = target
    this.nextId = 1
    this.pending = new Map()
    this.messages = []
    this.ws = new WebSocket(target.webSocketDebuggerUrl)
    this.ws.onmessage = (event) => {
      const message = JSON.parse(event.data)
      this.messages.push(message)
      if (message.id && this.pending.has(message.id)) {
        this.pending.get(message.id)(message)
        this.pending.delete(message.id)
      }
    }
  }

  async open() {
    await new Promise((resolve) => {
      this.ws.onopen = resolve
    })
    await this.send('Runtime.enable')
    await this.send('Network.enable')
    await this.send('Page.enable')
  }

  send(method, params = {}) {
    const id = this.nextId++
    return new Promise((resolve) => {
      this.pending.set(id, resolve)
      this.ws.send(JSON.stringify({ id, method, params }))
    })
  }

  async navigate(url, waitMs = 7000) {
    this.messages = []
    await this.send('Page.navigate', { url })
    await new Promise((resolve) => setTimeout(resolve, waitMs))
  }

  async evaluate(expression) {
    const result = await this.send('Runtime.evaluate', {
      expression,
      awaitPromise: true,
      returnByValue: true
    })
    return result.result?.result?.value
  }

  async jsonResponses(predicate) {
    const responses = this.messages
      .filter((message) => message.method === 'Network.responseReceived')
      .map((message) => ({ requestId: message.params.requestId, response: message.params.response }))
      .filter(({ response }) => predicate(response))
    const bodies = []
    for (const entry of responses) {
      const body = await this.send('Network.getResponseBody', { requestId: entry.requestId }).catch(() => null)
      if (!body?.result?.body) continue
      try {
        bodies.push({ url: entry.response.url, json: JSON.parse(body.result.body), length: body.result.body.length })
      } catch {
        // ignore analytics and non-JSON bodies
      }
    }
    return bodies
  }

  async close() {
    this.ws.close()
    await closeTarget(this.target.id)
  }
}

const withPage = async (url, callback, waitMs = 7000) => {
  const target = await newTarget('about:blank')
  const page = new CdpPage(target)
  await page.open()
  try {
    await page.navigate(url, waitMs)
    return await callback(page)
  } finally {
    await page.close()
  }
}

const listUrls = [
  'https://sportsbook.fanduel.com/tennis',
  'https://sportsbook.fanduel.com/tennis?tab=women%27s-french-open'
]

const extractBoardLinks = async () => {
  const links = []
  for (const url of listUrls) {
    const pageLinks = await withPage(
      url,
      (page) =>
        page.evaluate(`Array.from(document.querySelectorAll('a')).map((anchor) => ({
          text: anchor.innerText,
          href: anchor.href
        })).filter((anchor) => anchor.href.includes('/tennis/') && !anchor.href.includes('/navigation'))`),
      8000
    )
    links.push(...(pageLinks || []))
  }
  const seen = new Set()
  return links.filter((link) => {
    if (!link.href || seen.has(link.href)) return false
    seen.add(link.href)
    return true
  })
}

const findHref = (links, playerA, playerB) => {
  const target = [tokenKey(playerA), tokenKey(playerB)].sort().join(' | ')
  return links.find((link) => {
    const hrefParts = String(link.href || '').split('/').pop()?.replace(/-\d+$/, '').split('-v-') || []
    const textParts = String(link.text || '').split('\n').filter(Boolean)
    const candidates = hrefParts.length === 2 ? hrefParts : textParts.length >= 2 ? textParts.slice(0, 2) : []
    if (candidates.length !== 2) return false
    return candidates.map(tokenKey).sort().join(' | ') === target
  })?.href
}

const americanOdds = (runnerDetail) =>
  runnerDetail?.winRunnerOdds?.americanDisplayOdds?.americanOddsInt ??
  runnerDetail?.americanDisplayOdds?.americanOddsInt ??
  runnerDetail?.winRunnerOdds?.trueOdds?.americanOdds?.americanOdds ??
  null

const lineFromMarketName = (value) => {
  const match = String(value || '').match(/(-?\d+(?:\.\d+)?)$/)
  return match ? Number(match[1]) : null
}

const pricedRunners = (market, priceMap) => {
  const price = priceMap.get(market.marketId)
  const details = new Map((price?.runnerDetails || []).map((runner) => [Number(runner.selectionId), runner]))
  return (market.runners || []).map((runner) => ({
    selectionId: runner.selectionId,
    name: runner.runnerName,
    odds: americanOdds(details.get(Number(runner.selectionId)))
  }))
}

const parsePlayerSpread = (runnerName) => {
  const match = String(runnerName || '').match(/^(.*?)\s+\(([+-]?\d+(?:\.\d+)?)\)$/)
  if (!match) return { player: runnerName, spread: null }
  return { player: match[1], spread: Number(match[2]) }
}

const totalSide = (runnerName) => {
  const match = String(runnerName || '').match(/^(Over|Under)\s+(-?\d+(?:\.\d+)?)$/i)
  return match ? { side: match[1][0].toUpperCase() + match[1].slice(1).toLowerCase(), line: Number(match[2]) } : null
}

const chooseFirstSetMarket = (markets, priceMap) => {
  const candidates = markets
    .filter((market) => /^Set 1 Total Games Over\/Under /i.test(market.marketName || ''))
    .map((market) => ({
      market,
      line: lineFromMarketName(market.marketName),
      hasPrice: (priceMap.get(market.marketId)?.runnerDetails || []).length > 0
    }))
    .filter((entry) => entry.hasPrice && Number.isFinite(entry.line))
  return candidates.sort((left, right) => Math.abs(left.line - 9.5) - Math.abs(right.line - 9.5))[0]?.market ?? null
}

const chooseFirstGameTotalMarket = (markets, priceMap) => {
  const candidates = markets
    .filter((market) => /^(?:Game 1|1st Game|First Game)\s+Total/i.test(market.marketName || '') || /Total Points.*(?:Game 1|1st Game|First Game)/i.test(market.marketName || ''))
    .map((market) => ({
      market,
      line: lineFromMarketName(market.marketName),
      hasPrice: (priceMap.get(market.marketId)?.runnerDetails || []).length > 0
    }))
    .filter((entry) => entry.hasPrice)
  return candidates.sort((left, right) => Math.abs((left.line ?? 3.5) - 3.5) - Math.abs((right.line ?? 3.5) - 3.5))[0]?.market ?? null
}

const isToStealMarket = (marketName) =>
  /(?:to win at least one set|to steal (?:a )?set|to take (?:a )?set|to win a set)/i.test(String(marketName || ''))

const firstServiceGamePlayer = (marketName) =>
  String(marketName || '').replace(/\s+Score of First Service Game.*$/i, '').trim()

const parseEvent = async (href) =>
  withPage(
    href,
    async (page) => {
      const eventResponses = await page.jsonResponses((response) => response.url.includes('/sbapi/event-page'))
      const eventPage = eventResponses
        .map((entry) => entry.json)
        .sort((left, right) => Object.keys(right.attachments?.markets || {}).length - Object.keys(left.attachments?.markets || {}).length)[0]
      const markets = Object.values(eventPage?.attachments?.markets || {})
      const marketIds = markets.map((market) => market.marketId).filter(Boolean)
      const prices = await page.evaluate(`(async () => {
        const response = await fetch('https://smp.nj.sportsbook.fanduel.com/api/sports/fixedodds/readonly/v1/getMarketPrices?priceHistory=0', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', 'X-Application': '${APP_KEY}' },
          body: JSON.stringify({ marketIds: ${JSON.stringify(marketIds)} })
        })
        return response.json()
      })()`)
      const priceMap = new Map((prices || []).map((price) => [price.marketId, price]))
      const moneyline = markets.find((market) => market.marketName === 'Moneyline')
      const handicap = markets.find((market) => /^Game Handicap /i.test(market.marketName || ''))
      const total = markets.find((market) => /^Total Match Games /i.test(market.marketName || ''))
      const firstSetTotal = chooseFirstSetMarket(markets, priceMap)
      const firstGameTotal = chooseFirstGameTotalMarket(markets, priceMap)
      const firstServiceGameTotals = markets.filter((market) => /Score of First Service Game/i.test(market.marketName || ''))
      const setWinMarkets = markets.filter((market) => isToStealMarket(market.marketName))

      return {
        href,
        eventId: href.match(/-(\d+)$/)?.[1] ?? null,
        markets: {
          moneyline: moneyline
            ? pricedRunners(moneyline, priceMap).map((runner) => ({ player: runner.name, odds: runner.odds }))
            : [],
          gameHandicap: handicap
            ? pricedRunners(handicap, priceMap).map((runner) => {
                const parsed = parsePlayerSpread(runner.name)
                return { player: parsed.player, spread: parsed.spread, odds: runner.odds }
              })
            : [],
          totalGames: total
            ? pricedRunners(total, priceMap).map((runner) => {
                const parsed = totalSide(runner.name)
                return { side: parsed?.side ?? runner.name, line: parsed?.line ?? lineFromMarketName(total.marketName), odds: runner.odds }
              })
            : [],
          firstSetTotalGames: firstSetTotal
            ? pricedRunners(firstSetTotal, priceMap).map((runner) => {
                const parsed = totalSide(runner.name)
                return { side: parsed?.side ?? runner.name, line: parsed?.line ?? lineFromMarketName(firstSetTotal.marketName), odds: runner.odds }
              })
            : [],
          firstGameTotalPoints: firstGameTotal
            ? pricedRunners(firstGameTotal, priceMap).map((runner) => {
                const parsed = totalSide(runner.name)
                return { side: parsed?.side ?? runner.name, line: parsed?.line ?? lineFromMarketName(firstGameTotal.marketName), odds: runner.odds }
              })
            : [],
          firstServiceGameTotalPoints: firstServiceGameTotals.flatMap((market) => {
            const player = firstServiceGamePlayer(market.marketName)
            return pricedRunners(market, priceMap).map((runner) => {
              const parsed = totalSide(runner.name)
              return {
                player,
                market: market.marketName,
                side: parsed?.side ?? runner.name,
                line: parsed?.line ?? lineFromMarketName(market.marketName),
                odds: runner.odds
              }
            })
          }),
          winAtLeastOneSet: setWinMarkets.flatMap((market) =>
            pricedRunners(market, priceMap).map((runner) => ({
              market: market.marketName,
              player: String(market.marketName).replace(/\s+(?:to win at least one set|to steal (?:a )?set|to take (?:a )?set|to win a set).*/i, ''),
              selection: runner.name,
              odds: runner.odds
            }))
          ),
          marketNames: markets.map((market) => market.marketName).filter(Boolean).sort()
        },
        capturedAt: new Date().toISOString(),
        source: SOURCE
      }
    },
    9000
  )

const main = async () => {
  const options = parseArgs()
  const scoreboard = await readJson(`data-private/reference/tennis/espn-scoreboard-${options.date}.json`, { singles: [] })
  const slateMatches = await loadSlateMatches(options.date)
  const singles = slateMatches.length
    ? slateMatches
    : (scoreboard.singles || [])
        .filter((match) => !match.doubles && match.players?.length === 2)
        .filter((match) => !/qualifying/i.test(String(match.round || '')))
  const links = await extractBoardLinks()
  const matches = []
  const unmatched = []

  for (const match of singles) {
    const [playerA, playerB] = match.players
    const href = findHref(links, playerA.name, playerB.name)
    if (!href) {
      unmatched.push(`${playerA.name} vs ${playerB.name}`)
      continue
    }
    const row = await parseEvent(href)
    matches.push({
      match: `${playerA.name} vs ${playerB.name}`,
      href,
      ...row
    })
    console.log(`Captured ${playerA.name} vs ${playerB.name}`)
  }

  const payload = {
    date: options.date,
    source: SOURCE,
    capturedAt: new Date().toISOString(),
    matches,
    unmatched
  }
  const output = path.join(ROOT, 'data-private', 'reference', 'tennis', `fanduel-lines-${options.date}.json`)
  await fs.mkdir(path.dirname(output), { recursive: true })
  await fs.writeFile(output, `${JSON.stringify(payload, null, 2)}\n`)
  console.log(`Wrote ${matches.length} FanDuel tennis events to ${output}`)
  if (unmatched.length) console.log(`Unmatched: ${unmatched.join(' | ')}`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
