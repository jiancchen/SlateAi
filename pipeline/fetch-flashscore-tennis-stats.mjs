import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const DEFAULT_OUTPUT_DIR = 'data-private/reference/tennis/flashscore-match-stats'
const FSIGN = 'SW9D1eZo'

const normalizeNameFromSlug = (slug) => {
  const parts = String(slug || '')
    .split('-')
    .filter(Boolean)
  if (parts.length < 2) return slug || ''
  const first = parts[parts.length - 1]
  const last = parts.slice(0, -1).join(' ')
  return `${first} ${last}`.replace(/\b\w/g, (char) => char.toUpperCase())
}

const parseArgs = () => {
  const args = process.argv.slice(2)
  const options = {
    url: '',
    matchId: '',
    outputDir: DEFAULT_OUTPUT_DIR,
    output: ''
  }

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index]
    if (arg === '--url') {
      options.url = args[index + 1]
      index += 1
    } else if (arg === '--match-id') {
      options.matchId = args[index + 1]
      index += 1
    } else if (arg === '--output-dir') {
      options.outputDir = args[index + 1]
      index += 1
    } else if (arg === '--output') {
      options.output = args[index + 1]
      index += 1
    }
  }

  if (!options.url && !options.matchId) {
    throw new Error('Pass --url or --match-id')
  }

  return options
}

const parseMatchId = (urlOrId) => {
  const value = String(urlOrId || '')
  const mid = value.match(/[?&]mid=([A-Za-z0-9]+)/)
  if (mid) return mid[1]
  const hashLike = value.match(/\b([A-Za-z0-9]{8})\b/)
  if (hashLike) return hashLike[1]
  return value
}

const parseEventIdFromMatchPage = (text) => {
  const eventId = String(text || '').match(/"event_id_c":"([A-Za-z0-9]+)"/)
  return eventId?.[1] || ''
}

const parsePlayersFromUrl = (url) => {
  try {
    const parsed = new URL(url)
    const parts = parsed.pathname.split('/').filter(Boolean)
    const tennisIndex = parts.findIndex((part) => part === 'tennis')
    const playerSlugs = tennisIndex >= 0 ? parts.slice(tennisIndex + 1, tennisIndex + 3) : []
    return playerSlugs.map((slug) => normalizeNameFromSlug(slug.replace(/-[A-Za-z0-9]{8}$/, '')))
  } catch {
    return []
  }
}

const parsePlayersFromMatchPage = (text) => {
  const title = String(text || '').match(/<meta property="og:title" content="([^"]+)"/)?.[1]
  if (!title) return []
  return title
    .replace(/\s+\d+\s*:\s*\d+.*$/, '')
    .split(/\s+-\s+/)
    .map((name) => name.trim())
    .filter(Boolean)
}

const parseFeedRecords = (text) =>
  String(text || '')
    .split('~')
    .map((record) => Object.fromEntries([...record.matchAll(/([A-Z0-9]{2,4})÷([^¬]*)/g)].map((match) => [match[1], match[2]])))
    .filter((record) => Object.keys(record).length)

const parseScoreSummary = (text) => {
  const records = parseFeedRecords(text)
  const sets = []
  let totalDuration = ''
  for (const record of records) {
    if (record.AC) {
      sets.push({
        label: record.AC,
        leftGames: Number.isFinite(Number(record.IG)) ? Number(record.IG) : null,
        rightGames: Number.isFinite(Number(record.IH)) ? Number(record.IH) : null,
        duration: record.RC || record.RD || ''
      })
    }
    if (record.RB) totalDuration = record.RB
  }
  return { sets, totalDuration }
}

const parseStats = (text, players) => {
  const records = parseFeedRecords(text)
  const scopes = []
  let currentScope = null
  let currentSection = null

  for (const record of records) {
    if (record.SE) {
      currentScope = {
        label: record.SE === 'Game' ? 'Match' : record.SE,
        sections: []
      }
      scopes.push(currentScope)
      currentSection = null
    }

    if (record.SF) {
      if (!currentScope) {
        currentScope = { label: 'Match', sections: [] }
        scopes.push(currentScope)
      }
      currentSection = {
        label: record.SF,
        stats: []
      }
      currentScope.sections.push(currentSection)
    }

    if (record.SG) {
      if (!currentScope) {
        currentScope = { label: 'Match', sections: [] }
        scopes.push(currentScope)
      }
      if (!currentSection) {
        currentSection = { label: 'Stats', stats: [] }
        currentScope.sections.push(currentSection)
      }
      currentSection.stats.push({
        label: record.SG,
        left: record.SH || '',
        right: record.SI || '',
        leftPlayer: players[0] || 'Player 1',
        rightPlayer: players[1] || 'Player 2'
      })
    }
  }

  return scopes
}

const fetchText = async (url) => {
  const response = await fetch(url, {
    headers: {
      'user-agent': 'Mozilla/5.0',
      'x-fsign': FSIGN,
      accept: '*/*'
    }
  })
  if (!response.ok) {
    throw new Error(`Flashscore request failed ${response.status}: ${url}`)
  }
  return response.text()
}

export const fetchFlashscoreTennisStats = async ({ url = '', matchId = '', extra = {} } = {}) => {
  let resolvedMatchId = matchId || parseMatchId(url)
  let players = parsePlayersFromUrl(url)
  let matchPageText = ''

  if (url && !matchId) {
    matchPageText = await fetchText(url)
    const pageEventId = parseEventIdFromMatchPage(matchPageText)
    if (pageEventId) resolvedMatchId = pageEventId
    const pagePlayers = parsePlayersFromMatchPage(matchPageText)
    if (players.length !== 2 && pagePlayers.length === 2) players = pagePlayers
  }

  if (!resolvedMatchId) {
    throw new Error(`Could not resolve Flashscore match id for ${url || matchId}`)
  }

  const statsUrl = `https://www.flashscoreusa.com/x/feed/df_st_1_${resolvedMatchId}`
  const scoreUrl = `https://www.flashscoreusa.com/x/feed/df_sui_1_${resolvedMatchId}`
  const [statsText, scoreText] = await Promise.all([fetchText(statsUrl), fetchText(scoreUrl)])

  return {
    ...extra,
    generatedAt: new Date().toISOString(),
    sourceUrl: url || `https://www.flashscoreusa.com/match/${resolvedMatchId}/`,
    matchId: resolvedMatchId,
    players,
    feedUrls: {
      stats: statsUrl,
      scoreSummary: scoreUrl
    },
    scoreSummary: parseScoreSummary(scoreText),
    scopes: parseStats(statsText, players),
    notes: [
      'Flashscore SH/SI stat columns map to the left/right player order from the match URL when a URL is supplied.',
      'Service games won and return games won are sourced directly from Flashscore match statistics.'
    ]
  }
}

const main = async () => {
  const options = parseArgs()
  const output = await fetchFlashscoreTennisStats({ url: options.url, matchId: options.matchId })

  const outputPath = path.resolve(options.output || path.join(options.outputDir, `${output.matchId}.json`))
  await fs.mkdir(path.dirname(outputPath), { recursive: true })
  await fs.writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`)
  console.log(`Wrote Flashscore tennis stats to ${outputPath}`)
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  main().catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
}
