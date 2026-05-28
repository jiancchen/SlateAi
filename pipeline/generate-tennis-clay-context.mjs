import fs from 'node:fs/promises'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { buildTennistonicH2HUrl } from '../web/src/lib/tennis-source-mapping.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const DEFAULT_DAY_MODULE = path.resolve(__dirname, '../web/src/lib/day-2026-05-25.js')
const DEFAULT_OUTPUT = path.resolve(
  __dirname,
  '../web/src/lib/day-2026-05-25-tennis-clay-context.generated.json'
)
const DEBUG_PORT = 9222
const DEBUG_ENDPOINT = `http://127.0.0.1:${DEBUG_PORT}`
const DEBUG_ORIGIN = DEBUG_ENDPOINT
const CHROME_PROFILE_DIR = '/tmp/chrome-tennis-profile'

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const parseArgs = () => {
  const args = process.argv.slice(2)
  const options = {
    dayModule: DEFAULT_DAY_MODULE,
    output: DEFAULT_OUTPUT,
    limit: null,
    ids: null,
    timeoutMs: 18000
  }

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index]
    if (arg === '--module') {
      options.dayModule = path.resolve(process.cwd(), args[index + 1])
      index += 1
    } else if (arg === '--output') {
      options.output = path.resolve(process.cwd(), args[index + 1])
      index += 1
    } else if (arg === '--limit') {
      options.limit = Number.parseInt(args[index + 1], 10)
      index += 1
    } else if (arg === '--ids') {
      options.ids = String(args[index + 1] || '')
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean)
      index += 1
    } else if (arg === '--timeout-ms') {
      options.timeoutMs = Number.parseInt(args[index + 1], 10)
      index += 1
    }
  }

  return options
}

const fetchJson = async (url, init) => {
  const response = await fetch(url, init)
  if (!response.ok) {
    throw new Error(`Request failed ${response.status} for ${url}`)
  }
  return response.json()
}

const fetchText = async (url, init) => {
  const response = await fetch(url, init)
  if (!response.ok) {
    throw new Error(`Request failed ${response.status} for ${url}`)
  }
  return response.text()
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
      {
        detached: true,
        stdio: 'ignore'
      }
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
      if (payload.error) {
        pending.reject(new Error(payload.error.message || 'CDP command failed'))
      } else {
        pending.resolve(payload.result ?? {})
      }
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

const parseBoardPct = (label) => {
  const match = String(label || '').match(/(\d+(?:\.\d+)?)%/)
  return match ? Number.parseFloat(match[1]) : null
}

const parseRecord = (value) => {
  const match = String(value || '').match(/(\d+)-(\d+)/)
  if (!match) return null
  const wins = Number.parseInt(match[1], 10)
  const losses = Number.parseInt(match[2], 10)
  const total = wins + losses
  return {
    wins,
    losses,
    total,
    pct: total ? wins / total : null
  }
}

const scorePattern = /\d-\d/g

const isResistanceMatch = (result) => {
  const scoreTokens = String(result || '').match(scorePattern) || []
  return /7-6|6-7/.test(String(result || '')) || scoreTokens.length >= 3
}

const buildTradeRead = (game, clayData) => {
  const [playerA, playerB] = game.tennisContext?.players || []
  const boardA = parseBoardPct(playerA?.marketLabel)
  const boardB = parseBoardPct(playerB?.marketLabel)

  if (!Number.isFinite(boardA) || !Number.isFinite(boardB) || !clayData?.players?.length) {
    return null
  }

  const favoriteIndex = boardA >= boardB ? 0 : 1
  const dogIndex = favoriteIndex === 0 ? 1 : 0
  const favoriteBoard = favoriteIndex === 0 ? boardA : boardB
  const dogBoard = dogIndex === 0 ? boardA : boardB
  const favorite = clayData.players[favoriteIndex]
  const dog = clayData.players[dogIndex]
  const favoriteClay = parseRecord(favorite?.record2026?.clay)
  const dogClay = parseRecord(dog?.record2026?.clay)
  const dogResistanceCount = (dog?.recentMatches || []).filter((match) => isResistanceMatch(match.result)).length
  const favoriteLeakCount = (favorite?.recentMatches || []).filter(
    (match) => /loss/i.test(match.result) || isResistanceMatch(match.result)
  ).length

  const notes = []

  if (dogClay?.pct !== null && dogClay?.pct >= 0.5) {
    notes.push(`${dog.name} has a credible clay record at ${dog.record2026.clay} in 2026, so the favorite still has to prove the service gap.`)
  } else if (dogClay?.pct !== null && dogClay?.pct >= 0.4) {
    notes.push(`${dog.name} is at least live enough on clay (${dog.record2026.clay}) to make the favorite work for holds.`)
  }

  if (favoriteClay?.pct !== null && favoriteClay?.pct < 0.82) {
    notes.push(`${favorite.name} is good, but not spotless on clay at ${favorite.record2026.clay}.`)
  }

  if (dogResistanceCount >= 2) {
    notes.push(`${dog.name} has multiple recent clay matches with a tiebreak or three-set shape, which points toward set-extension or game-spread value if the number is generous.`)
  } else if (dogResistanceCount === 1) {
    notes.push(`${dog.name} has at least one recent clay-style match that dragged into real pressure points instead of a clean collapse.`)
  }

  if (favoriteLeakCount >= 2) {
    notes.push(`${favorite.name}'s recent clay record has enough pressure games that the lower-priced side can re-rate quickly if the first set stays on serve.`)
  }

  if (!notes.length) {
    notes.push(
      `${dog.name} does not need the upset for this to matter. At ${dogBoard}% against a ${favoriteBoard}% favorite, an on-serve first set can be enough for the contract to re-rate.`
    )
  }

  return notes.join(' ')
}

const EXTRACTION_EXPRESSION = `(() => {
  const normalize = (value) =>
    String(value || '')
      .replace(/\\u00a0/g, ' ')
      .replace(/\\t+/g, ' ')
      .replace(/ +\\n/g, '\\n')
      .replace(/\\n +/g, '\\n')
      .replace(/\\n{2,}/g, '\\n')
      .trim()

  const splitLines = (value) =>
    normalize(value)
      .split('\\n')
      .map((line) => normalize(line))
      .filter(Boolean)

  const parseRecentMatch = (element) => {
    const lines = splitLines(element?.innerText)
    const date = lines.length ? lines[lines.length - 1] : ''
    const detailLines = date ? lines.slice(0, -1) : lines.slice()
    let event = ''
    let opponent = ''
    let result = ''

    if (detailLines.length >= 3) {
      result = detailLines[detailLines.length - 1]
      opponent = detailLines[detailLines.length - 2]
      event = detailLines.slice(0, -2).join(' | ')
    } else if (detailLines.length === 2) {
      opponent = detailLines[0]
      result = detailLines[1]
    } else if (detailLines.length === 1) {
      opponent = detailLines[0]
    }

    return {
      raw: normalize(element?.innerText),
      event,
      opponent,
      result,
      date
    }
  }

  const parsePlayerSection = (selector) => {
    const root = document.querySelector(selector)
    if (!root) return null

    const row2026 = Array.from(root.querySelectorAll('table.ply_info_table tr')).find((row) =>
      normalize(row.innerText).startsWith('2026')
    )
    const cells = row2026 ? Array.from(row2026.querySelectorAll('td')).map((cell) => normalize(cell.innerText)) : []

    return {
      name: normalize(root.querySelector('.player_name_div')?.innerText),
      record2026: {
        overall: cells[1] || '',
        hard: cells[2] || '',
        clay: cells[3] || '',
        indoorHard: cells[4] || '',
        grass: cells[5] || '',
        carpet: cells[6] || ''
      },
      recentMatches: Array.from(root.querySelectorAll('.country_1')).slice(0, 8).map(parseRecentMatch)
    }
  }

  const h2hText = normalize(document.querySelector('.PlayerScoreDetails_1st .score')?.innerText || '')
  const h2hRecord = (h2hText.match(/\\d+:\\d+/) || [])[0] || ''
  const predictionMatch = document.body.innerText.match(/Prediction\\s+([^\\n€]+)/)

  return {
    title: normalize(document.title),
    h2hText,
    h2hRecord,
    prediction: predictionMatch ? normalize(predictionMatch[1]) : '',
    players: [parsePlayerSection('.play_prev_tour_inner_left'), parsePlayerSection('.play_prev_tour_inner_right')].filter(Boolean)
  }
})()`

const waitForClaySelectors = async (client, timeoutMs = 18000) => {
  const startedAt = Date.now()
  while (Date.now() - startedAt < timeoutMs) {
    const status = await client.evaluate(`(() => ({
      readyState: document.readyState,
      title: document.title,
      hasPlayers: !!document.querySelector('.play_prev_tour_inner_left .player_name_div')
    }))()`)

    if (status?.hasPlayers) return true
    await sleep(750)
  }
  return false
}

const createTarget = async () => {
  const payload = await fetchJson(`${DEBUG_ENDPOINT}/json/new?about:blank`, { method: 'PUT' })
  return payload
}

const closeTarget = async (targetId) => {
  try {
    await fetchText(`${DEBUG_ENDPOINT}/json/close/${targetId}`)
  } catch {
    // best effort
  }
}

const loadMatches = async (dayModulePath) => {
  const moduleUrl = pathToFileURL(dayModulePath).href
  const dayModule = await import(moduleUrl)
  return (dayModule.games || []).filter((game) => game.league === 'Tennis')
}

const sortMatches = (games) => {
  const score = (game) => {
    const [left, right] = game.tennisContext?.players || []
    const leftPct = parseBoardPct(left?.marketLabel)
    const rightPct = parseBoardPct(right?.marketLabel)
    if (!Number.isFinite(leftPct) || !Number.isFinite(rightPct)) return -1
    return Math.abs(leftPct - rightPct)
  }

  return [...games].sort((left, right) => {
    const gapDelta = score(right) - score(left)
    if (gapDelta) return gapDelta
    return (left.startMinutes || 0) - (right.startMinutes || 0) || String(left.title).localeCompare(String(right.title))
  })
}

const main = async () => {
  const options = parseArgs()
  const games = sortMatches(await loadMatches(options.dayModule))
  const filteredGames = Array.isArray(options.ids) && options.ids.length
    ? games.filter((game) => options.ids.includes(game.id))
    : games
  const selectedGames = Number.isFinite(options.limit) ? filteredGames.slice(0, options.limit) : filteredGames

  let existingOutput = { generatedAt: '', source: 'Tennistonic H2H via Chrome DOM', matches: {} }
  try {
    existingOutput = JSON.parse(await fs.readFile(options.output, 'utf8'))
  } catch {
    // no existing file yet
  }

  await ensureDebugChrome()
  const target = await createTarget()
  const client = new CdpClient(target.webSocketDebuggerUrl)
  await client.connect()
  await client.send('Page.enable')

  const output = {
    generatedAt: new Date().toISOString(),
    source: 'Tennistonic H2H via Chrome DOM',
    matches: { ...(existingOutput.matches || {}) }
  }

  try {
    for (const game of selectedGames) {
      const players = game.tennisContext?.players || []
      const h2hLink = game.tennisContext?.researchLinks?.find((link) => /Tennistonic/i.test(link.label || ''))?.url
      const alternateLink =
        players.length >= 2 ? buildTennistonicH2HUrl(players[1].name, players[0].name) : null
      const candidateUrls = [...new Set([h2hLink, alternateLink].filter(Boolean))]
      if (!candidateUrls.length) continue

      process.stdout.write(`Scanning ${game.title} ... `)

      let clayData = null
      let loadedUrl = candidateUrls[0]
      let lastError = 'Page did not expose clay matchup selectors before timeout'

      for (const candidateUrl of candidateUrls) {
        await client.send('Page.navigate', { url: candidateUrl })
        const ready = await waitForClaySelectors(client, options.timeoutMs)
        if (!ready) {
          lastError = 'Page did not expose clay matchup selectors before timeout'
          continue
        }

        const candidateData = await client.evaluate(EXTRACTION_EXPRESSION)
        if (candidateData?.players?.length) {
          clayData = candidateData
          loadedUrl = candidateUrl
          break
        }

        lastError = 'No player sections found in Tennistonic page'
      }

      if (!clayData?.players?.length) {
        process.stdout.write(`${lastError === 'No player sections found in Tennistonic page' ? 'empty' : 'timed out'}\\n`)
        output.matches[game.id] = {
          title: game.title,
          sourceUrl: loadedUrl,
          error: lastError
        }
        continue
      }

      output.matches[game.id] = {
        title: game.title,
        sourceUrl: loadedUrl,
        h2hText: clayData.h2hText,
        h2hRecord: clayData.h2hRecord,
        prediction: clayData.prediction,
        players: clayData.players,
        tradeRead: buildTradeRead(game, clayData)
      }
      process.stdout.write('ok\\n')
      await sleep(300)
    }
  } finally {
    await client.close()
    await closeTarget(target.id)
  }

  await fs.writeFile(options.output, `${JSON.stringify(output, null, 2)}\n`)
  console.log(`Wrote ${Object.keys(output.matches).length} tennis clay matchup rows to ${options.output}`)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
