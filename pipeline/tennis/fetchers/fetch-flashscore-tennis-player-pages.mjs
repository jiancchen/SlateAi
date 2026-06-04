import fs from 'node:fs/promises'
import path from 'node:path'
import { fetchFlashscoreTennisStats } from './fetch-flashscore-tennis-stats.mjs'

const ROOT = path.resolve(import.meta.dirname, '..', '..', '..')
const DEFAULT_OUTPUT = (date) => `data-private/reference/tennis/flashscore-player-pages-${date}.json`
const DEFAULT_RECENT_MAP_OUTPUT = (date) => `data-private/reference/tennis/flashscore-recent-match-map-${date}.json`
const DEFAULT_STATS_DIR = 'data-private/reference/tennis/flashscore-match-stats'

const TOURNAMENT_SOURCES = [
  {
    key: 'rg-men',
    label: 'ATP French Open',
    aliases: ['ATP French Open', 'French Open', 'Roland Garros Men'],
    surface: 'Clay',
    url: 'https://www.flashscoreusa.com/tennis/atp-singles/french-open/'
  },
  {
    key: 'rg-women',
    label: 'WTA French Open',
    aliases: ['WTA French Open', 'French Open', 'Roland Garros Women'],
    surface: 'Clay',
    url: 'https://www.flashscoreusa.com/tennis/wta-singles/french-open/'
  },
  {
    key: 'birmingham',
    label: 'ATP Challenger Birmingham',
    aliases: ['ATP Challenger Birmingham', 'Birmingham Challenger Men'],
    surface: 'Grass',
    url: 'https://www.flashscoreusa.com/tennis/challenger-men-singles/birmingham/'
  },
  {
    key: 'wta-125k-birmingham',
    label: 'WTA 125K Birmingham',
    aliases: ['WTA 125K Birmingham', 'Birmingham 125K Women'],
    surface: 'Grass',
    url: 'https://www.flashscoreusa.com/tennis/wta-125k-singles/birmingham/'
  },
  {
    key: 'centurion-2',
    label: 'ATP Challenger Centurion 2',
    aliases: ['ATP Challenger Centurion 2', 'Centurion 2 Challenger Men'],
    surface: 'Hard',
    url: 'https://www.flashscoreusa.com/tennis/challenger-men-singles/centurion-2/'
  },
  {
    key: 'perugia',
    label: 'ATP Challenger Perugia',
    aliases: ['ATP Challenger Perugia', 'Perugia Challenger Men'],
    surface: 'Clay',
    url: 'https://www.flashscoreusa.com/tennis/challenger-men-singles/perugia/'
  },
  {
    key: 'prostejov',
    label: 'ATP Challenger Prostejov',
    aliases: ['ATP Challenger Prostejov', 'Prostejov Challenger Men'],
    surface: 'Clay',
    url: 'https://www.flashscoreusa.com/tennis/challenger-men-singles/prostejov/'
  },
  {
    key: 'tyler',
    label: 'ATP Challenger Tyler',
    aliases: ['ATP Challenger Tyler', 'ATP Challenger Tyler Qualification', 'Tyler Challenger Men'],
    surface: 'Hard',
    url: 'https://www.flashscoreusa.com/tennis/challenger-men-singles/tyler/'
  },
  {
    key: 'heilbronn-bad-rappenau',
    label: 'ATP Challenger Heilbronn / Bad Rappenau',
    aliases: ['ATP Challenger Bad Rappenau', 'Bad Rappenau Challenger Men', 'Heilbronn Challenger Men'],
    surface: 'Clay',
    url: 'https://www.flashscoreusa.com/tennis/challenger-men-singles/heilbronn/'
  }
]

const parseArgs = () => {
  const args = process.argv.slice(2)
  const options = {
    date: '',
    output: '',
    recentMapOutput: '',
    statsDir: DEFAULT_STATS_DIR,
    recentLimit: 5,
    matchStatsLimit: 0,
    concurrency: 5,
    tournaments: ''
  }

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index]
    if (arg === '--date') {
      options.date = args[index + 1]
      index += 1
    } else if (arg === '--output') {
      options.output = args[index + 1]
      index += 1
    } else if (arg === '--recent-map-output') {
      options.recentMapOutput = args[index + 1]
      index += 1
    } else if (arg === '--stats-dir') {
      options.statsDir = args[index + 1]
      index += 1
    } else if (arg === '--recent-limit') {
      options.recentLimit = Number(args[index + 1]) || 5
      index += 1
    } else if (arg === '--match-stats-limit') {
      options.matchStatsLimit = Number(args[index + 1]) || 0
      index += 1
    } else if (arg === '--concurrency') {
      options.concurrency = Math.max(1, Number(args[index + 1]) || 5)
      index += 1
    } else if (arg === '--tournaments') {
      options.tournaments = args[index + 1]
      index += 1
    }
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(options.date)) throw new Error('Pass --date YYYY-MM-DD')
  if (!options.output) options.output = DEFAULT_OUTPUT(options.date)
  if (!options.recentMapOutput) options.recentMapOutput = DEFAULT_RECENT_MAP_OUTPUT(options.date)
  return options
}

const normalize = (value) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\([^)]*\)/g, ' ')
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')

const tokenSet = (value) => new Set(normalize(value).split(' ').filter(Boolean))

const lastToken = (value) => {
  const tokens = normalize(value).split(' ').filter(Boolean)
  return tokens[tokens.length - 1] || ''
}

const tokenOverlap = (left, right) => {
  const leftTokens = tokenSet(left)
  const rightTokens = tokenSet(right)
  let count = 0
  for (const token of leftTokens) {
    if (rightTokens.has(token)) count += 1
  }
  return count
}

const firstInitial = (value) => normalize(value).split(' ').filter(Boolean)[0]?.[0] || ''

const samePlayer = (left, right) => {
  if (!left || !right) return false
  const leftNorm = normalize(left)
  const rightNorm = normalize(right)
  if (leftNorm === rightNorm) return true
  const overlap = tokenOverlap(left, right)
  if (overlap >= Math.min(tokenSet(left).size, tokenSet(right).size, 2)) return true
  const leftLast = lastToken(left)
  const rightLast = lastToken(right)
  const leftTokens = tokenSet(left)
  const rightTokens = tokenSet(right)
  const sharedLongToken = [...leftTokens].find((token) => token.length >= 5 && rightTokens.has(token))
  if (sharedLongToken) {
    const leftInitial = firstInitial(left)
    const rightInitial = firstInitial(right)
    const leftSingleInitial = [...leftTokens].find((token) => token.length === 1)
    const rightSingleInitial = [...rightTokens].find((token) => token.length === 1)
    if (leftInitial && rightInitial && leftInitial === rightInitial) return true
    if (leftSingleInitial && rightInitial && leftSingleInitial === rightInitial) return true
    if (rightSingleInitial && leftInitial && rightSingleInitial === leftInitial) return true
  }
  return Boolean(
    (leftLast && leftLast.length >= 3 && rightTokens.has(leftLast)) ||
      (rightLast && rightLast.length >= 3 && leftTokens.has(rightLast))
  )
}

const samePair = (leftPair, rightPair) =>
  leftPair.length === 2 &&
  rightPair.length === 2 &&
  ((samePlayer(leftPair[0], rightPair[0]) && samePlayer(leftPair[1], rightPair[1])) ||
    (samePlayer(leftPair[0], rightPair[1]) && samePlayer(leftPair[1], rightPair[0])))

const parseFeedRecords = (text) =>
  String(text || '')
    .split('~')
    .map((record) => Object.fromEntries([...record.matchAll(/([A-Z0-9]{2,4})÷([^¬]*)/g)].map((match) => [match[1], match[2]])))
    .filter((record) => Object.keys(record).length)

const extractInitialFeeds = (html) =>
  [...String(html || '').matchAll(/cjs\.initialFeeds\["([^"]+)"\]\s*=\s*\{\s*data:\s*`([\s\S]*?)`/g)].map((match) => ({
    key: match[1],
    data: match[2]
  }))

const compactDate = (date) => date.replaceAll('-', '')

const playerPageUrl = (slug, id) =>
  slug && id ? `https://www.flashscoreusa.com/player/${slug}/${id}/` : null

const matchPageUrl = (matchId) => `https://www.flashscoreusa.com/match/tennis/${matchId}/`

const feedPlayer = (record, side) => {
  const left = side === 'left'
  return {
    name: left ? record.AE || record.CX || '' : record.AF || '',
    flashscoreId: left ? record.PX || '' : record.PY || '',
    slug: left ? record.WU || '' : record.WV || '',
    country: left ? record.FU || record.CC || '' : record.FV || '',
    profileUrl: playerPageUrl(left ? record.WU : record.WV, left ? record.PX : record.PY)
  }
}

const parseSetScores = (record, selfSide) => {
  const pairs = [
    ['BA', 'BB'],
    ['BC', 'BD'],
    ['BE', 'BF'],
    ['BG', 'BH'],
    ['BI', 'BJ']
  ]
  const scores = []
  for (const [leftKey, rightKey] of pairs) {
    const left = Number(record[leftKey])
    const right = Number(record[rightKey])
    if (!Number.isFinite(left) || !Number.isFinite(right)) continue
    scores.push(selfSide === 'left' ? `${left}-${right}` : `${right}-${left}`)
  }
  return scores.join(' ')
}

const parseSurface = (text, fallback = '') => {
  const value = String(text || fallback || '')
  if (/grass/i.test(value)) return 'Grass'
  if (/hard/i.test(value)) return 'Hard'
  if (/clay/i.test(value)) return 'Clay'
  if (/indoor/i.test(value)) return 'Indoor'
  return fallback || 'Unknown'
}

const parseRank = (html) => {
  const rankText = String(html || '').match(/participant-detail-rank[^>]*>[\s\S]*?:\s*([0-9]+)/i)?.[1]
  const rank = Number(rankText)
  return Number.isFinite(rank) ? rank : null
}

const parseBirthTimestamp = (html) => {
  const stamp = String(html || '').match(/getAge\((\d+)\)/)?.[1]
  return stamp ? Number(stamp) : null
}

const ageFromBirth = (birthTimestamp) => {
  if (!Number.isFinite(birthTimestamp)) return null
  const birth = new Date(birthTimestamp * 1000)
  const now = new Date()
  let age = now.getUTCFullYear() - birth.getUTCFullYear()
  const beforeBirthday =
    now.getUTCMonth() < birth.getUTCMonth() ||
    (now.getUTCMonth() === birth.getUTCMonth() && now.getUTCDate() < birth.getUTCDate())
  if (beforeBirthday) age -= 1
  return age
}

const parseStatValue = (value) => {
  const text = String(value || '')
  const percent = text.match(/(-?\d+(?:\.\d+)?)%/)
  const fraction = text.match(/(\d+)\s*\/\s*(\d+)/)
  const number = text.match(/^-?\d+(?:\.\d+)?$/)
  return {
    raw: text,
    number: number ? Number(number[0]) : null,
    percent: percent ? Number(percent[1]) : null,
    made: fraction ? Number(fraction[1]) : null,
    total: fraction ? Number(fraction[2]) : null
  }
}

const parseSideStats = (payload, playerName) => {
  const matchScope = (payload.scopes || []).find((scope) => scope.label === 'Match') || payload.scopes?.[0]
  const stats = {}
  const sourceRows = []
  for (const section of matchScope?.sections || []) {
    for (const stat of section.stats || []) {
      const side = samePlayer(playerName, stat.leftPlayer) ? 'left' : samePlayer(playerName, stat.rightPlayer) ? 'right' : ''
      if (!side) continue
      const rawValue = stat[side]
      const label = normalize(stat.label)
      const parsed = parseStatValue(rawValue)
      sourceRows.push({ section: section.label, label: stat.label, value: rawValue })
      if (label === 'aces') stats.aces = parsed.number ?? rawValue
      if (label === 'double faults') stats.doubleFaults = parsed.number ?? rawValue
      if (label === '1st serve percentage') stats.firstServePct = parsed.percent ?? rawValue
      if (label === '1st serve points won') stats.firstServeWonPct = parsed.percent ?? rawValue
      if (label === '2nd serve points won') stats.secondServeWonPct = parsed.percent ?? rawValue
      if (label === 'break points saved') {
        stats.breakPointsSaved = rawValue
        stats.breakPointsSavedPct = parsed.percent ?? null
      }
      if (label === 'break points converted') stats.breakPointsConverted = rawValue
      if (label === 'service points won') stats.servicePointsWonPct = parsed.percent ?? rawValue
      if (label === 'return points won') stats.returnPointsWonPct = parsed.percent ?? rawValue
      if (label === 'winners') stats.winners = parsed.number ?? rawValue
      if (label === 'unforced errors') stats.unforcedErrors = parsed.number ?? rawValue
      if (label === 'service games won') {
        stats.serviceGamesWon = rawValue
        stats.serviceHoldPct = parsed.percent ?? rawValue
        stats.holdPct = parsed.percent ?? rawValue
      }
      if (label === 'return games won') {
        stats.returnGamesWon = rawValue
        stats.returnGamesWonPct = parsed.percent ?? rawValue
      }
    }
  }
  return {
    source: 'Flashscore',
    flashscoreId: payload.matchId,
    sourceUrl: payload.sourceUrl,
    ...stats,
    rows: sourceRows
  }
}

const readJson = async (filePath, fallback) => {
  try {
    return JSON.parse(await fs.readFile(filePath, 'utf8'))
  } catch (error) {
    if (error?.code === 'ENOENT') return fallback
    throw error
  }
}

const writeJson = async (filePath, payload) => {
  await fs.mkdir(path.dirname(filePath), { recursive: true })
  await fs.writeFile(filePath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8')
}

const readSlateGames = async (date) => {
  const gamesDir = path.join(ROOT, 'published-data/slates', date, 'games')
  const games = []
  try {
    const files = await fs.readdir(gamesDir)
    for (const file of files) {
      if (!file.endsWith('.json')) continue
      const payload = JSON.parse(await fs.readFile(path.join(gamesDir, file), 'utf8'))
      if (payload.league !== 'Tennis') continue
      const players = (payload.tennisContext?.players || payload.matchup || []).map((player) => player.name || player.displayName).filter(Boolean)
      if (players.length !== 2) continue
      games.push({
        id: payload.id,
        title: payload.title,
        stage: payload.stage,
        tournament: payload.tennisContext?.warehouseContext?.tournament || payload.tennisContext?.court || payload.stage || '',
        surface: payload.tennisContext?.surface || payload.surface || '',
        players,
        file
      })
    }
  } catch (error) {
    if (error.code !== 'ENOENT') throw error
  }
  const supplement = await readJson(`data-private/reference/tennis/robinhood-tennis-supplement-${date}.json`, { matches: [] })
  for (const match of supplement.matches || []) {
    if (games.some((game) => game.id === match.id)) continue
    const players = (match.players || []).map((player) => player.name).filter(Boolean)
    if (players.length !== 2) continue
    games.push({
      id: match.id,
      title: match.title,
      stage: match.tournament,
      tournament: match.tournament,
      surface: match.surface,
      players,
      file: `robinhood-tennis-supplement-${date}.json`
    })
  }
  return games
}

const tournamentAllowed = (source, allowed) => {
  if (!allowed.size) return true
  const names = [source.key, source.label, ...(source.aliases || [])].map(normalize)
  return names.some((name) => allowed.has(name))
}

const fetchTournamentRecords = async (date, allowed) => {
  const records = []
  for (const source of TOURNAMENT_SOURCES.filter((item) => tournamentAllowed(item, allowed))) {
    try {
      const response = await fetch(source.url, { headers: { 'user-agent': 'Mozilla/5.0' } })
      if (!response.ok) throw new Error(`${response.status}`)
      const html = await response.text()
      for (const feed of extractInitialFeeds(html)) {
        const feedRecords = parseFeedRecords(feed.data)
        let eventContext = {
          tournament: source.label,
          tournamentUrl: source.url,
          surface: source.surface,
          category: '',
          sourceKey: source.key
        }
        for (const record of feedRecords) {
          if (record.ZA || record.ZK || record.ZL || record.ZX) {
            eventContext = {
              tournament: record.ZK || source.label,
              tournamentFull: record.ZA || source.label,
              tournamentUrl: record.ZL ? new URL(record.ZL, 'https://www.flashscoreusa.com').href : source.url,
              surface: parseSurface(record.ZA || record.ZX, source.surface),
              category: record.ZAF || '',
              sourceKey: source.key,
              feed: feed.key
            }
          }
          if (!record.AA || !record.AD || !record.AE || !record.AF) continue
          const isoDate = new Date(Number(record.AD) * 1000).toISOString().slice(0, 10)
          if (isoDate !== date) continue
          records.push({
            ...eventContext,
            feed: feed.key,
            flashscoreId: record.AA,
            sourceUrl: matchPageUrl(record.AA),
            timestamp: Number(record.AD),
            isoDate,
            startIso: new Date(Number(record.AD) * 1000).toISOString(),
            players: [record.AE, record.AF],
            flashscoreLabel: `${record.AE} - ${record.AF}`,
            left: feedPlayer(record, 'left'),
            right: feedPlayer(record, 'right'),
            raw: record
          })
        }
      }
      console.log(`Loaded Flashscore ${source.label}: ${records.filter((record) => record.sourceKey === source.key).length} slate records`)
    } catch (error) {
      console.warn(`Skipping Flashscore ${source.label} (${source.url}): ${error.message}`)
    }
  }
  return records
}

const sideForBoardPlayer = (record, boardName) => {
  if (samePlayer(record.left.name, boardName)) return 'left'
  if (samePlayer(record.right.name, boardName)) return 'right'
  return ''
}

const playerForBoardName = (record, boardName) => {
  const side = sideForBoardPlayer(record, boardName)
  return side === 'left' ? record.left : side === 'right' ? record.right : null
}

const matchSlateToFlashscore = (games, records) => {
  const matched = []
  const unmatched = []
  const used = new Set()
  for (const game of games) {
    const recordIndex = records.findIndex((record, index) => !used.has(index) && samePair(game.players, record.players))
    if (recordIndex < 0) {
      unmatched.push(game)
      continue
    }
    used.add(recordIndex)
    const record = records[recordIndex]
    matched.push({
      game,
      flashscore: {
        ...record,
        boardPlayers: game.players.map((name) => ({ name, flashscore: playerForBoardName(record, name) }))
      }
    })
  }
  return {
    matched,
    unmatched,
    unused: records.filter((_, index) => !used.has(index))
  }
}

const parsePlayerResults = (html, profile) => {
  const feed = extractInitialFeeds(html).find((item) => item.key === 'results_s') || extractInitialFeeds(html).find((item) => item.key === 'summary-results_s')
  const rows = []
  let event = {
    event: '',
    eventUrl: '',
    eventTier: '',
    surface: 'Unknown'
  }
  for (const record of parseFeedRecords(feed?.data || '')) {
    if (record.ZA || record.ZK || record.ZL || record.ZX) {
      event = {
        event: record.ZK || record.ZA || '',
        eventFull: record.ZA || '',
        eventUrl: record.ZL ? new URL(record.ZL, 'https://www.flashscoreusa.com').href : '',
        eventTier: record.ZAF || '',
        surface: parseSurface(record.ZA || record.ZX, '')
      }
    }
    if (!record.AA || !record.AE || !record.AF) continue
    const left = feedPlayer(record, 'left')
    const right = feedPlayer(record, 'right')
    const selfSide =
      (profile.flashscoreId && profile.flashscoreId === left.flashscoreId) || samePlayer(profile.name, left.name)
        ? 'left'
        : (profile.flashscoreId && profile.flashscoreId === right.flashscoreId) || samePlayer(profile.name, right.name)
          ? 'right'
          : ''
    if (!selfSide) continue
    const opponent = selfSide === 'left' ? right : left
    const leftSets = Number(record.AG)
    const rightSets = Number(record.AH)
    const selfSets = selfSide === 'left' ? leftSets : rightSets
    const oppSets = selfSide === 'left' ? rightSets : leftSets
    const won = Number.isFinite(selfSets) && Number.isFinite(oppSets) ? selfSets > oppSets : null
    rows.push({
      flashscoreId: record.AA,
      sourceUrl: matchPageUrl(record.AA),
      dateIso: record.AD ? new Date(Number(record.AD) * 1000).toISOString().slice(0, 10) : '',
      dateLabel: record.AD ? new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', month: 'short', day: '2-digit', year: '2-digit' }).format(new Date(Number(record.AD) * 1000)) : '',
      event: event.event,
      eventFull: event.eventFull,
      eventUrl: event.eventUrl,
      eventTier: event.eventTier,
      surface: event.surface,
      opponentName: opponent.name,
      opponentProfileUrl: opponent.profileUrl,
      result: `${won === null ? 'Result' : won ? 'Win' : 'Loss'} ${parseSetScores(record, selfSide)}`.trim(),
      won,
      players: [left.name, right.name],
      raw: record
    })
  }
  return rows
}

const fetchPlayerProfile = async (boardName, playerRecord) => {
  if (!playerRecord?.profileUrl) {
    return {
      name: boardName,
      status: 'missing-player-url',
      recentMatches: []
    }
  }
  const response = await fetch(`${playerRecord.profileUrl}results/`, { headers: { 'user-agent': 'Mozilla/5.0' } })
  if (!response.ok) throw new Error(`Flashscore player page failed ${response.status}: ${playerRecord.profileUrl}`)
  const html = await response.text()
  const birthTimestamp = parseBirthTimestamp(html)
  const rank = parseRank(html)
  const profile = {
    name: boardName,
    flashscoreName: playerRecord.name,
    flashscoreId: playerRecord.flashscoreId,
    slug: playerRecord.slug,
    country: playerRecord.country || '',
    rank,
    birthTimestamp,
    birthDate: Number.isFinite(birthTimestamp) ? new Date(birthTimestamp * 1000).toISOString().slice(0, 10) : null,
    age: ageFromBirth(birthTimestamp),
    profileUrl: playerRecord.profileUrl,
    capturedAt: new Date().toISOString()
  }
  return {
    ...profile,
    recentMatches: parsePlayerResults(html, profile)
  }
}

const recentMapKey = (matchId, playerName, recentIndex) => `${matchId}::${normalize(playerName)}::${recentIndex}`

const collectPlayerInputs = (matched) => {
  const playerInputs = []
  const seen = new Set()
  for (const item of matched) {
    for (const boardPlayer of item.flashscore.boardPlayers) {
      const player = boardPlayer.flashscore
      const key = `${normalize(boardPlayer.name)}::${player?.flashscoreId || ''}::${item.game.id}`
      if (!player || seen.has(key)) continue
      seen.add(key)
      playerInputs.push({
        boardMatchId: item.game.id,
        boardTitle: item.game.title,
        boardPlayerName: boardPlayer.name,
        slateSurface: item.game.surface || item.flashscore.surface,
        flashscoreMatchId: item.flashscore.flashscoreId,
        flashscoreTournament: item.flashscore.tournament,
        flashscoreTournamentUrl: item.flashscore.tournamentUrl,
        player
      })
    }
  }
  return playerInputs
}

const runPool = async (items, concurrency, worker) => {
  const results = []
  let next = 0
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (next < items.length) {
      const index = next
      next += 1
      results[index] = await worker(items[index], index)
    }
  })
  await Promise.all(workers)
  return results
}

const main = async () => {
  const options = parseArgs()
  const allowed = new Set((options.tournaments ? options.tournaments.split(',') : []).map(normalize).filter(Boolean))
  const games = await readSlateGames(options.date)
  const records = await fetchTournamentRecords(options.date, allowed)
  const matched = matchSlateToFlashscore(games, records)
  const playerInputs = collectPlayerInputs(matched.matched)
  const profiles = {}
  const profileErrors = []

  await runPool(playerInputs, options.concurrency, async (input) => {
    try {
      const profile = await fetchPlayerProfile(input.boardPlayerName, input.player)
      const key = `${input.boardMatchId}::${normalize(input.boardPlayerName)}`
      profiles[key] = { ...input, profile }
    } catch (error) {
      profileErrors.push({ ...input, error: error.message })
    }
  })

  const recentMapPath = path.resolve(options.recentMapOutput)
  const existingRecentMap = await readJson(recentMapPath, { map: {}, failed: [], coverage: {} })
  const map = { ...(existingRecentMap.map || {}) }
  const failed = [...(existingRecentMap.failed || [])]
  const statsDir = path.resolve(options.statsDir)
  await fs.mkdir(statsDir, { recursive: true })

  const recentJobs = []
  for (const item of Object.values(profiles)) {
    const recentMatches = (item.profile?.recentMatches || [])
      .filter((match) => !/\//.test(match.opponentName || ''))
      .slice(0, options.recentLimit)
    for (const [recentIndex, recent] of recentMatches.entries()) {
      recentJobs.push({ item, recent, recentIndex })
    }
  }

  const cappedRecentJobs = options.matchStatsLimit > 0 ? recentJobs.slice(0, options.matchStatsLimit) : recentJobs
  const statsCapReached = cappedRecentJobs.length < recentJobs.length
  const skippedStats = recentJobs.length - cappedRecentJobs.length
  let fetchedStats = 0
  await runPool(cappedRecentJobs, options.concurrency, async (job) => {
    const { item, recent, recentIndex } = job
    const mapKey = recentMapKey(item.boardMatchId, item.boardPlayerName, recentIndex)
    try {
      const payload = await fetchFlashscoreTennisStats({
        matchId: recent.flashscoreId,
        extra: {
          sourceKind: 'recent-match',
          sourceSubkind: 'flashscore-player-page',
          slateDate: options.date,
          boardMatchId: item.boardMatchId,
          boardTitle: item.boardTitle,
          boardPlayerName: item.boardPlayerName,
          recentOpponentName: recent.opponentName,
          recentIndex,
          recentEvent: recent.event,
          recentDate: recent.dateLabel,
          recentIsoDate: recent.dateIso,
          recentResult: recent.result,
          recentSurface: recent.surface,
          flashscoreLabel: recent.players.join(' - '),
          flashscoreTournamentUrl: recent.eventUrl,
          players: recent.players
        }
      })
      const outputPath = path.join(statsDir, `${payload.matchId}.json`)
      await fs.writeFile(outputPath, `${JSON.stringify(payload, null, 2)}\n`)
      map[mapKey] = {
        key: mapKey,
        boardMatchId: item.boardMatchId,
        boardTitle: item.boardTitle,
        playerName: item.boardPlayerName,
        boardPlayerName: item.boardPlayerName,
        opponentName: recent.opponentName,
        recentIndex,
        recentEvent: recent.event,
        recentDate: recent.dateLabel,
        recentIsoDate: recent.dateIso,
        recentResult: recent.result,
        recentSurface: recent.surface,
        flashscoreId: payload.matchId,
        flashscoreLabel: recent.players.join(' - '),
        flashscoreTournamentUrl: recent.eventUrl,
        playerProfileUrl: item.player.profileUrl,
        currentMatchFlashscoreId: item.flashscoreMatchId,
        currentMatchTournament: item.flashscoreTournament,
        currentMatchTournamentUrl: item.flashscoreTournamentUrl,
        serviceStats: parseSideStats(payload, item.boardPlayerName)
      }
      fetchedStats += 1
    } catch (error) {
      failed.push({
        boardMatchId: item.boardMatchId,
        boardTitle: item.boardTitle,
        playerName: item.boardPlayerName,
        opponentName: recent.opponentName,
        recentIndex,
        recentEvent: recent.event,
        recentDate: recent.dateLabel,
        recentIsoDate: recent.dateIso,
        recentResult: recent.result,
        flashscoreId: recent.flashscoreId,
        error: error.message
      })
    }
  })

  const playerPageOutput = {
    generatedAt: new Date().toISOString(),
    slateDate: options.date,
    sources: TOURNAMENT_SOURCES.filter((item) => tournamentAllowed(item, allowed)).map(({ key, label, aliases, surface, url }) => ({ key, label, aliases, surface, url })),
    coverage: {
      slateMatches: games.length,
      flashscoreSlateRecords: records.length,
      matchedSlateMatches: matched.matched.length,
      unmatchedSlateMatches: matched.unmatched.length,
      playerInputs: playerInputs.length,
      profiles: Object.keys(profiles).length,
      profileErrors: profileErrors.length,
      recentRows: recentJobs.length,
      recentStatsFetched: fetchedStats,
      recentStatsFailed: failed.length,
      statsCapReached,
      skippedStats
    },
    currentMatches: matched.matched.map((item) => ({
      boardMatchId: item.game.id,
      boardTitle: item.game.title,
      flashscoreId: item.flashscore.flashscoreId,
      flashscoreLabel: item.flashscore.flashscoreLabel,
      startIso: item.flashscore.startIso,
      surface: item.flashscore.surface,
      tournament: item.flashscore.tournament,
      tournamentUrl: item.flashscore.tournamentUrl,
      sourceUrl: item.flashscore.sourceUrl,
      players: item.flashscore.boardPlayers
    })),
    unmatchedSlate: matched.unmatched.map((game) => ({ id: game.id, title: game.title, tournament: game.tournament, surface: game.surface })),
    unusedFlashscore: matched.unused.map((record) => ({ flashscoreId: record.flashscoreId, label: record.flashscoreLabel, tournament: record.tournament, sourceUrl: record.sourceUrl })),
    profiles,
    profileErrors
  }

  await writeJson(path.resolve(options.output), playerPageOutput)
  await writeJson(recentMapPath, {
    generatedAt: new Date().toISOString(),
    source: path.resolve(options.output),
    outputDir: statsDir,
    coverage: {
      ...(existingRecentMap.coverage || {}),
      playerPageSlateMatches: games.length,
      playerPageMatchedSlateMatches: matched.matched.length,
      playerPageProfiles: Object.keys(profiles).length,
      playerPageRecentRows: recentJobs.length,
      playerPageRecentStatsFetched: fetchedStats,
      fetchedRows: Object.keys(map).length,
      matchedRows: Object.keys(map).length,
      recentRows: Math.max(Number(existingRecentMap.coverage?.recentRows) || 0, recentJobs.length)
    },
    map,
    failed
  })
  console.log(JSON.stringify(playerPageOutput.coverage, null, 2))
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
