import fs from 'node:fs/promises'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(import.meta.dirname, '..', '..', '..')
const DEFAULT_OUTPUT_DIR = 'data-private/reference/tennis/livesport-point-by-point'
const DEBUG_PORT = 9222
const DEBUG_ENDPOINT = `http://127.0.0.1:${DEBUG_PORT}`
const DEBUG_ORIGIN = DEBUG_ENDPOINT
const CHROME_PROFILE_DIR = '/tmp/chrome-tennis-profile'
const FSIGN = 'SW9D1eZo'

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const parseArgs = () => {
  const args = process.argv.slice(2)
  const options = {
    url: '',
    matchId: '',
    slateDate: '',
    boardMatchId: '',
    boardTitle: '',
    players: '',
    outputDir: DEFAULT_OUTPUT_DIR,
    output: '',
    browser: true
  }

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index]
    if (arg === '--url') {
      options.url = args[index + 1]
      index += 1
    } else if (arg === '--match-id') {
      options.matchId = args[index + 1]
      index += 1
    } else if (arg === '--slate-date') {
      options.slateDate = args[index + 1]
      index += 1
    } else if (arg === '--board-match-id') {
      options.boardMatchId = args[index + 1]
      index += 1
    } else if (arg === '--board-title') {
      options.boardTitle = args[index + 1]
      index += 1
    } else if (arg === '--players') {
      options.players = args[index + 1]
      index += 1
    } else if (arg === '--output-dir') {
      options.outputDir = args[index + 1]
      index += 1
    } else if (arg === '--output') {
      options.output = args[index + 1]
      index += 1
    } else if (arg === '--no-browser') {
      options.browser = false
    }
  }

  if (!options.url && !options.matchId) {
    throw new Error('Pass --url or --match-id')
  }
  return options
}

const fetchJson = async (url, init) => {
  const response = await fetch(url, init)
  if (!response.ok) throw new Error(`Request failed ${response.status} for ${url}`)
  return response.json()
}

const ensureDebugChrome = async () => {
  try {
    await fetchJson(`${DEBUG_ENDPOINT}/json/version`)
    return
  } catch {
    await fs.mkdir(CHROME_PROFILE_DIR, { recursive: true })
    spawn(
      'open',
      [
        '-na',
        'Google Chrome',
        '--args',
        `--user-data-dir=${CHROME_PROFILE_DIR}`,
        `--remote-debugging-port=${DEBUG_PORT}`,
        '--remote-allow-origins=*',
        '--new-window',
        'about:blank'
      ],
      { detached: true, stdio: 'ignore' }
    ).unref()
    for (let attempt = 0; attempt < 20; attempt += 1) {
      await sleep(1000)
      try {
        await fetchJson(`${DEBUG_ENDPOINT}/json/version`)
        return
      } catch {
        // keep polling
      }
    }
  }
  throw new Error('Unable to start Chrome debug endpoint')
}

class CdpClient {
  constructor(webSocketUrl) {
    this.webSocketUrl = webSocketUrl
    this.socket = null
    this.nextId = 1
    this.pending = new Map()
  }

  async connect() {
    this.socket = new WebSocket(this.webSocketUrl, { origin: DEBUG_ORIGIN })
    await new Promise((resolve, reject) => {
      this.socket.addEventListener('open', resolve, { once: true })
      this.socket.addEventListener('error', reject, { once: true })
    })
    this.socket.addEventListener('message', (event) => {
      const payload = JSON.parse(String(event.data))
      if (!payload.id) return
      const pending = this.pending.get(payload.id)
      if (!pending) return
      this.pending.delete(payload.id)
      if (payload.error) pending.reject(new Error(payload.error.message || 'CDP command failed'))
      else pending.resolve(payload.result ?? {})
    })
  }

  async send(method, params = {}) {
    const id = this.nextId
    this.nextId += 1
    const responsePromise = new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject })
    })
    this.socket.send(JSON.stringify({ id, method, params }))
    return responsePromise
  }

  async evaluate(expression) {
    const result = await this.send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true
    })
    return result?.result?.value
  }

  async close() {
    if (!this.socket) return
    this.socket.close()
    this.socket = null
  }
}

const parseMatchId = (urlOrId) => {
  const value = String(urlOrId || '')
  const mid = value.match(/[?&]mid=([A-Za-z0-9]+)/)
  if (mid) return mid[1]
  const pbpPath = value.match(/\/game\/tennis\/[^/]+\/[^/]+\/.*?\b([A-Za-z0-9]{8})\b/)
  if (pbpPath) return pbpPath[1]
  const hashLike = value.match(/\b([A-Za-z0-9]{8})\b/)
  if (hashLike) return hashLike[1]
  return value
}

const titleCase = (value) =>
  String(value || '')
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')

const normalizeNameFromSlug = (slug) => {
  const clean = String(slug || '').replace(/-[A-Za-z0-9]{8}$/, '')
  const parts = clean.split('-').filter(Boolean)
  if (parts.length < 2) return titleCase(clean.replace(/-/g, ' '))
  const first = parts[parts.length - 1]
  const last = parts.slice(0, -1).join(' ')
  return titleCase(`${first} ${last}`)
}

const parsePlayersFromUrl = (url) => {
  try {
    const parsed = new URL(url)
    const parts = parsed.pathname.split('/').filter(Boolean)
    const tennisIndex = parts.findIndex((part) => part === 'tennis')
    const slugs = tennisIndex >= 0 ? parts.slice(tennisIndex + 1, tennisIndex + 3) : []
    return slugs.map((slug, index) => ({
      side: index === 0 ? 'home' : 'away',
      name: normalizeNameFromSlug(slug),
      slug,
      playerSlugId: slug.match(/-([A-Za-z0-9]{8})$/)?.[1] || ''
    }))
  } catch {
    return []
  }
}

const parseFeedRecords = (text) =>
  String(text || '')
    .split('~')
    .map((record) => Object.fromEntries([...record.matchAll(/([A-Z0-9]{2,4})÷([^¬]*)/g)].map((match) => [match[1], match[2]])))
    .filter((record) => Object.keys(record).length)

const sideFromCode = (value) => {
  if (String(value) === '1') return 'home'
  if (String(value) === '2') return 'away'
  return null
}

const playerForSide = (players, side) => players.find((player) => player.side === side)?.name || null

const splitPointToken = (token) => {
  const raw = String(token || '').trim()
  const flags = [...raw.matchAll(/\|([^|]+)\|/g)].map((match) => match[1])
  const clean = raw.replace(/\s*\|[^|]+\|/g, '').trim()
  const [homePoint = '', awayPoint = ''] = clean.split(':').map((part) => part.trim())
  return {
    raw,
    clean,
    homePoint,
    awayPoint,
    flags,
    breakPoint: flags.includes('B1'),
    setPoint: flags.includes('B2'),
    matchPoint: flags.includes('B3')
  }
}

const pointRank = (value) => {
  if (String(value).toUpperCase() === 'A') return 4
  if (String(value) === '40') return 3
  if (String(value) === '30') return 2
  if (String(value) === '15') return 1
  return 0
}

const inferPointWinner = (previous, current) => {
  if (!previous) return null
  const prevHome = pointRank(previous.homePoint)
  const prevAway = pointRank(previous.awayPoint)
  const home = pointRank(current.homePoint)
  const away = pointRank(current.awayPoint)
  if (home > prevHome && away === prevAway) return 'home'
  if (away > prevAway && home === prevHome) return 'away'
  if (home < prevHome && away === prevAway) return 'away'
  if (away < prevAway && home === prevHome) return 'home'
  return null
}

const parsePointByPoint = (text, players) => {
  const sets = []
  const flatPoints = []
  let currentSet = null
  let setNumber = 0

  for (const record of parseFeedRecords(text)) {
    if (record.HA) {
      const parsedSet = Number(String(record.HA).match(/\d+/)?.[0])
      setNumber = Number.isFinite(parsedSet) && parsedSet > 0 ? parsedSet : setNumber + 1
      currentSet = {
        setNumber,
        label: record.HA,
        description: record.HB || '',
        games: []
      }
      sets.push(currentSet)
      continue
    }
    if (!currentSet || !record.HL) continue
    const gameNumber = currentSet.games.length + 1
    const servingSide = sideFromCode(record.HG)
    const scoringSide = sideFromCode(record.HK)
    const tokens = String(record.HL)
      .split(',')
      .map((token) => token.trim())
      .filter(Boolean)
    let previousPoint = { homePoint: '0', awayPoint: '0' }
    const points = tokens.map((token, index) => {
      const parsed = splitPointToken(token)
      const pointWinnerSide = inferPointWinner(previousPoint, parsed)
      const row = {
        setNumber: currentSet.setNumber,
        gameNumber,
        pointIndex: index,
        servingSide,
        servingPlayer: playerForSide(players, servingSide),
        gameWinnerSide: scoringSide,
        gameWinnerPlayer: playerForSide(players, scoringSide),
        pointWinnerSide,
        pointWinnerPlayer: playerForSide(players, pointWinnerSide),
        homePoint: parsed.homePoint,
        awayPoint: parsed.awayPoint,
        breakPoint: parsed.breakPoint,
        setPoint: parsed.setPoint,
        matchPoint: parsed.matchPoint,
        flags: parsed.flags,
        raw: parsed.raw
      }
      previousPoint = parsed
      flatPoints.push(row)
      return row
    })
    currentSet.games.push({
      setNumber: currentSet.setNumber,
      gameNumber,
      responseGameIndex: Number.isFinite(Number(record.HC)) ? Number(record.HC) : null,
      homeGamesAfter: Number.isFinite(Number(record.HC)) ? Number(record.HC) : null,
      awayGamesAfter: Number.isFinite(Number(record.HE)) ? Number(record.HE) : null,
      servingSide,
      servingPlayer: playerForSide(players, servingSide),
      scoringSide,
      scoringPlayer: playerForSide(players, scoringSide),
      breakGame: Boolean(record.HH) || (servingSide && scoringSide && servingSide !== scoringSide),
      lostServeMarker: record.HH || '',
      pointCount: points.length,
      breakPointCount: points.filter((point) => point.breakPoint).length,
      setPointCount: points.filter((point) => point.setPoint).length,
      deuceCount: points.filter((point) => point.homePoint === '40' && point.awayPoint === '40').length,
      points,
      raw: record
    })
  }
  return { sets, points: flatPoints }
}

const fetchDirect = async (url) => {
  const response = await fetch(url, {
    headers: {
      'user-agent': 'Mozilla/5.0',
      'x-fsign': FSIGN,
      accept: '*/*'
    }
  })
  if (!response.ok) throw new Error(`Livesport feed failed ${response.status}: ${url}`)
  return response.text()
}

const fetchViaBrowser = async ({ pageUrl, matchId }) => {
  await ensureDebugChrome()
  const targetUrl = pageUrl || 'https://www.livesport.com/'
  const target = await fetchJson(`${DEBUG_ENDPOINT}/json/new?${encodeURIComponent(targetUrl)}`, { method: 'PUT' }).catch(async () => {
    const response = await fetch(`${DEBUG_ENDPOINT}/json/new?${encodeURIComponent(targetUrl)}`)
    if (!response.ok) throw new Error(`Unable to open Chrome target: ${response.status}`)
    return response.json()
  })
  const client = new CdpClient(target.webSocketDebuggerUrl)
  await client.connect()
  await client.send('Page.enable')
  await client.send('Runtime.enable')
  await client.send('Page.navigate', { url: targetUrl })
  await sleep(pageUrl ? 7000 : 1500)
  const feedUrls = {
    core: `https://www.livesport.com/x/feed/dc_1_${matchId}`,
    pointByPoint: `https://www.livesport.com/x/feed/df_mh_1_${matchId}`
  }
  const result = await client.evaluate(`(async () => {
    const feedUrls = ${JSON.stringify(feedUrls)};
    const fetchFeed = async (url) => {
      const response = await fetch(url, { headers: { 'x-fsign': '${FSIGN}', accept: '*/*' } });
      return { status: response.status, text: await response.text() };
    };
    const [core, pointByPoint] = await Promise.all([fetchFeed(feedUrls.core), fetchFeed(feedUrls.pointByPoint)]);
    return {
      href: location.href,
      title: document.title,
      bodyText: document.body?.innerText?.slice(0, 5000) || '',
      core,
      pointByPoint
    };
  })()`)
  await client.close()
  if (result?.pointByPoint?.status !== 200) {
    throw new Error(`Livesport browser feed failed ${result?.pointByPoint?.status || 'unknown'}`)
  }
  return {
    pageInfo: {
      href: result.href,
      title: result.title,
      bodyTextSample: result.bodyText
    },
    coreText: result.core?.text || '',
    pointByPointText: result.pointByPoint.text,
    feedUrls
  }
}

const main = async () => {
  const options = parseArgs()
  const matchId = parseMatchId(options.matchId || options.url)
  const urlPlayers = parsePlayersFromUrl(options.url)
  const overridePlayers = options.players
    ? options.players.split('|').map((name, index) => ({
        side: index === 0 ? 'home' : 'away',
        name: name.trim(),
        slug: '',
        playerSlugId: ''
      }))
    : []
  const players = overridePlayers.length === 2 ? overridePlayers : urlPlayers
  if (players.length !== 2) {
    throw new Error('Could not resolve two players. Pass --players "Player A|Player B".')
  }

  let fetched
  if (options.browser) {
    fetched = await fetchViaBrowser({ pageUrl: options.url, matchId })
  } else {
    const feedUrls = {
      core: `https://www.livesport.com/x/feed/dc_1_${matchId}`,
      pointByPoint: `https://www.livesport.com/x/feed/df_mh_1_${matchId}`
    }
    const [coreText, pointByPointText] = await Promise.all([fetchDirect(feedUrls.core), fetchDirect(feedUrls.pointByPoint)])
    fetched = { pageInfo: {}, coreText, pointByPointText, feedUrls }
  }

  const replay = parsePointByPoint(fetched.pointByPointText, players)
  const output = {
    provider: 'Livesport / Flashscore feed',
    capturedAt: new Date().toISOString(),
    sourceUrl: options.url || `https://www.livesport.com/game/tennis/?mid=${matchId}`,
    slateDate: options.slateDate || null,
    boardMatchId: options.boardMatchId || null,
    boardTitle: options.boardTitle || null,
    matchId,
    urlPlayerMap: players,
    feedUrls: fetched.feedUrls,
    pageInfo: fetched.pageInfo,
    coreRecords: parseFeedRecords(fetched.coreText),
    sets: replay.sets,
    points: replay.points,
    summary: {
      setCount: replay.sets.length,
      gameCount: replay.sets.reduce((sum, set) => sum + set.games.length, 0),
      pointCount: replay.points.length,
      breakGameCount: replay.sets.flatMap((set) => set.games).filter((game) => game.breakGame).length,
      breakPointCount: replay.points.filter((point) => point.breakPoint).length,
      setPointCount: replay.points.filter((point) => point.setPoint).length
    },
    notes: [
      'Livesport/Flashscore df_mh records are parsed as point-by-point replay rows.',
      'HG maps to serving side, HK maps to game-winning side, HH marks lost serve, and HL contains home:away point scores with B1/B2 flags.',
      'B1 is stored as break-point context and B2 as set-point context.'
    ]
  }

  const outputPath = path.resolve(options.output || path.join(options.outputDir, `${matchId}.json`))
  await fs.mkdir(path.dirname(outputPath), { recursive: true })
  await fs.writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`)
  console.log(JSON.stringify({ outputPath, matchId, ...output.summary }, null, 2))
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  main().catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
}
