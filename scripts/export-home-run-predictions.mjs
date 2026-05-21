import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

import { parkContextByHomeTeam } from '../src/lib/day-2026-05-13-mlb-data.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')

const abbrToTeam = {
  PHI: 'Phillies',
  PIT: 'Pirates',
  TOR: 'Blue Jays',
  DET: 'Tigers',
  BAL: 'Orioles',
  WSH: 'Nationals',
  MIL: 'Brewers',
  MIN: 'Twins',
  MIA: 'Marlins',
  TB: 'Rays',
  CIN: 'Reds',
  CLE: 'Guardians',
  BOS: 'Red Sox',
  ATL: 'Braves',
  NYY: 'Yankees',
  NYM: 'Mets',
  CHC: 'Cubs',
  CWS: 'White Sox',
  TEX: 'Rangers',
  HOU: 'Astros',
  KC: 'Royals',
  STL: 'Cardinals',
  ARI: 'Diamondbacks',
  COL: 'Rockies',
  LAD: 'Dodgers',
  LAA: 'Angels',
  SF: 'Giants',
  ATH: 'Athletics',
  SD: 'Padres',
  SEA: 'Mariners'
}

const teamToAbbr = Object.fromEntries(Object.entries(abbrToTeam).map(([abbr, team]) => [team, abbr]))
const average = (values = []) => {
  const numeric = values.filter((value) => Number.isFinite(value))
  return numeric.length ? numeric.reduce((sum, value) => sum + value, 0) / numeric.length : null
}
const clamp = (value, min, max) => Math.min(max, Math.max(min, value))

const parseArgs = () => {
  const args = process.argv.slice(2)
  const options = {
    date: null,
    top: 12,
    scanLimit: 24,
    teamLimit: 4,
    out: null,
    moduleOut: null
  }

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index]
    if (arg === '--date') options.date = args[++index]
    else if (arg === '--top') options.top = Number(args[++index])
    else if (arg === '--scan-limit') options.scanLimit = Number(args[++index])
    else if (arg === '--team-limit') options.teamLimit = Number(args[++index])
    else if (arg === '--out') options.out = args[++index]
    else if (arg === '--module-out') options.moduleOut = args[++index]
  }

  if (!options.date) {
    throw new Error('Missing required --date argument, expected YYYY-MM-DD.')
  }

  options.out ||= path.join(rootDir, 'data', 'predictions', 'mlb-home-runs', `${options.date}-statcast-prototype.json`)
  options.moduleOut ||= path.join(rootDir, 'src', 'lib', `day-${options.date}-home-run-data.js`)
  return options
}

const formatPlayerName = (value = '') => {
  const [lastName = '', firstName = ''] = value.split(',').map((part) => part.trim())
  return firstName ? `${firstName} ${lastName}` : value
}

const parseCsv = (text) => {
  const rows = []
  let row = []
  let field = ''
  let inQuotes = false

  const pushField = () => {
    row.push(field)
    field = ''
  }

  const pushRow = () => {
    rows.push(row)
    row = []
  }

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index]

    if (inQuotes) {
      if (char === '"' && text[index + 1] === '"') {
        field += '"'
        index += 1
      } else if (char === '"') {
        inQuotes = false
      } else {
        field += char
      }
      continue
    }

    if (char === '"') {
      inQuotes = true
      continue
    }

    if (char === ',') {
      pushField()
      continue
    }

    if (char === '\n') {
      pushField()
      pushRow()
      continue
    }

    if (char === '\r') {
      continue
    }

    field += char
  }

  if (field.length || row.length) {
    pushField()
    pushRow()
  }

  const header = rows[0][0]?.charCodeAt(0) === 0xfeff ? [rows[0][0].slice(1), ...rows[0].slice(1)] : rows[0]
  return rows
    .slice(1)
    .filter((entry) => entry.length === header.length)
    .map((entry) => Object.fromEntries(header.map((column, index) => [column, entry[index]])))
}

const loadDayGames = async (date) => {
  const dayModulePath = path.join(rootDir, 'src', 'lib', `day-${date}.js`)
  const dayModule = await import(pathToFileURL(dayModulePath).href)
  return dayModule.games.filter((game) => game.league === 'MLB')
}

const loadLineupBoards = async (date) => {
  try {
    const lineupModulePath = path.join(rootDir, 'src', 'lib', `day-${date}-lineups.js`)
    const lineupModule = await import(pathToFileURL(lineupModulePath).href)
    return lineupModule.lineupBoardsByGameId || {}
  } catch {
    return {}
  }
}

const loadBattingImpactHistory = async () => {
  try {
    const modulePath = path.join(rootDir, 'src', 'lib', 'mlb-batting-impact-history.js')
    const impactModule = await import(pathToFileURL(modulePath).href)
    return impactModule.battingImpactByPlayerName || {}
  } catch {
    return {}
  }
}

const daysBetween = (earlierIsoDate = '', laterIsoDate = '') => {
  const earlier = new Date(`${earlierIsoDate}T12:00:00Z`)
  const later = new Date(`${laterIsoDate}T12:00:00Z`)
  const diff = later.getTime() - earlier.getTime()
  return Math.round(diff / 86400000)
}

const buildBattingImpactContext = (playerName, battingImpactByPlayerName, targetDate) => {
  const entry = battingImpactByPlayerName[playerName]
  if (!entry) return null

  const datedEntries = (entry.dates || [])
    .map((date) => ({ date, age: daysBetween(date, targetDate) }))
    .filter((item) => item.age >= 1 && item.age <= 5)
    .sort((left, right) => left.age - right.age)

  const recentAppearances = datedEntries.length
  if (!recentAppearances) return null

  const lastSeenAge = datedEntries[0].age
  const recencyBoost = lastSeenAge === 1 ? 1 : lastSeenAge === 2 ? 0.75 : lastSeenAge === 3 ? 0.5 : 0.25
  const repeatBoost = recentAppearances >= 3 ? 1.15 : recentAppearances >= 2 ? 1 : 0.82
  const impactWindowScore =
    Number(entry.averageImpactScore || 0) * repeatBoost +
    Number(entry.hrGames || 0) * 1.8 +
    Number(entry.totalBases || 0) / Math.max(Number(entry.appearances || 1), 1) * 0.35 +
    recencyBoost * 4.5

  return {
    recentAppearances,
    hrGames: Number(entry.hrGames || 0),
    averageImpactScore: Number(entry.averageImpactScore || 0),
    totalBases: Number(entry.totalBases || 0),
    dates: datedEntries.map((item) => item.date),
    lastSeenAge,
    impactWindowScore: Number(impactWindowScore.toFixed(1))
  }
}

const buildMatchupMap = (games) => {
  const matchupByAbbr = {}

  const buildBullpenVulnerability = (bullpenContext = null, chainContext = null) => {
    if (!bullpenContext) return 0

    const era = Number(bullpenContext.era)
    const whip = Number(bullpenContext.whip)
    const homeRuns = Number(bullpenContext.homeRuns)
    const topRelievers = chainContext?.topRelievers || []
    const averageAvailability = average(topRelievers.map((reliever) => Number(reliever.availabilityScore)))
    const fatigueFlags = topRelievers.filter((reliever) => reliever.backToBack || reliever.workedYesterday).length
    const bridgeLeak = average(topRelievers.map((reliever) => Number(reliever.bridgeScore)))

    const score =
      (Number.isFinite(era) ? (era - 4.1) * 1.4 : 0) +
      (Number.isFinite(whip) ? (whip - 1.3) * 7 : 0) +
      (Number.isFinite(homeRuns) ? (homeRuns - 22) * 0.08 : 0) +
      (Number.isFinite(averageAvailability) ? (70 - averageAvailability) * 0.08 : 0) +
      fatigueFlags * 0.9 +
      (Number.isFinite(bridgeLeak) ? (78 - bridgeLeak) * 0.05 : 0)

    return Number(clamp(score, -5, 8).toFixed(1))
  }

  for (const game of games) {
    const awayTeam = game.participants[0].name
    const homeTeam = game.participants[1].name
    const awayAbbr = teamToAbbr[awayTeam]
    const homeAbbr = teamToAbbr[homeTeam]
    const parkContext = parkContextByHomeTeam[homeTeam] || {}
    const awayPitcher = game.starterContext?.away || {}
    const homePitcher = game.starterContext?.home || {}

    const homeParkHrIndex = Number(parkContext.indexHr || 100)
    const awayOpponentHr9 =
      Number(homePitcher.homeRunsAllowed || 0) * 9 / Math.max(Number(homePitcher.inningsPitched || 1), 1)
    const homeOpponentHr9 =
      Number(awayPitcher.homeRunsAllowed || 0) * 9 / Math.max(Number(awayPitcher.inningsPitched || 1), 1)
    const awayOpposingBullpenVulnerability = buildBullpenVulnerability(
      game.bullpenContext?.home,
      game.bullpenChainContext?.home
    )
    const homeOpposingBullpenVulnerability = buildBullpenVulnerability(
      game.bullpenContext?.away,
      game.bullpenChainContext?.away
    )

    matchupByAbbr[awayAbbr] = {
      teamName: awayTeam,
      gameTitle: game.title,
      opposingPitcher: homePitcher.fullName,
      opposingPitcherHand: homePitcher.pitchHand,
      opposingPitcherHr9: awayOpponentHr9,
      parkHrIndex: homeParkHrIndex,
      isHomeToday: false,
      opposingBullpenVulnerability: awayOpposingBullpenVulnerability
    }

    matchupByAbbr[homeAbbr] = {
      teamName: homeTeam,
      gameTitle: game.title,
      opposingPitcher: awayPitcher.fullName,
      opposingPitcherHand: awayPitcher.pitchHand,
      opposingPitcherHr9: homeOpponentHr9,
      parkHrIndex: homeParkHrIndex,
      isHomeToday: true,
      opposingBullpenVulnerability: homeOpposingBullpenVulnerability
    }
  }

  return matchupByAbbr
}

const buildLineupLookup = (lineupBoardsByGameId = {}) => {
  const lookup = new Map()

  for (const board of Object.values(lineupBoardsByGameId)) {
    for (const sideKey of ['away', 'home']) {
      const side = board?.[sideKey]
      if (!side?.lineup?.length) continue
      if (side.lineupSource !== 'official-feed' && board?.status?.[sideKey] !== 'posted') continue

      for (const hitter of side.lineup) {
        if (!hitter?.playerId) continue
        lookup.set(Number(hitter.playerId), {
          gameTitle: board.title,
          teamName: side.teamName,
          slot: hitter.slot,
          primaryTag: hitter.primaryTag || '',
          tags: hitter.tags || [],
          powerScore: Number(hitter.metrics?.powerScore ?? 50),
          contactScore: Number(hitter.metrics?.contactScore ?? 50),
          formScore: Number(hitter.metrics?.formScore ?? 50),
          splitScore: Number(hitter.metrics?.splitScore ?? 50),
          matchupScore: Number(hitter.metrics?.matchupScore ?? 50),
          varianceScore: Number(hitter.metrics?.varianceScore ?? 50),
          pitchType: hitter.pitchType || null,
          recentHomeRuns: Number(hitter.recent?.homeRuns ?? 0),
          seasonHomeRuns: Number(hitter.season?.homeRuns ?? 0),
          splitHomeRuns: Number(hitter.split?.homeRuns ?? 0)
        })
      }
    }
  }

  return lookup
}

const buildWeatherLookup = (lineupBoardsByGameId = {}) => {
  const lookup = new Map()

  for (const board of Object.values(lineupBoardsByGameId)) {
    lookup.set(board.title, {
      weather: board.weather || null,
      total: Number(`${board.marketWeatherContext?.total || ''}`.match(/(\d+(\.\d+)?)/)?.[1] || '')
    })
  }

  return lookup
}

const buildWeatherBoost = (weatherContext = null) => {
  if (!weatherContext?.weather) return 0

  const { weather, total } = weatherContext
  const windDirection = `${weather.windDirection || ''}`.toLowerCase()
  const windMph = Number(weather.windMph)
  const temperatureF = Number(weather.temperatureF)
  let boost = 0

  if (Number.isFinite(windMph)) {
    if (/out/.test(windDirection)) boost += windMph >= 10 ? 4 : windMph >= 7 ? 2 : 0.8
    else if (/\bin\b/.test(windDirection)) boost -= windMph >= 10 ? 4 : windMph >= 7 ? 2 : 0.8
  }

  if (Number.isFinite(temperatureF)) {
    if (temperatureF >= 90) boost += 2.4
    else if (temperatureF >= 82) boost += 1.3
    else if (temperatureF <= 60) boost -= 0.8
  }

  if (Number.isFinite(total)) {
    if (total >= 9.5) boost += 1
    else if (total <= 7.5) boost -= 0.8
  }

  return Math.max(-6, Math.min(6, boost))
}

const buildLineupPriority = (context = null) => {
  if (!context) return 0

  const slotBonus = Math.max(0, 6 - Number(context.slot || 9)) * 2.2
  const powerBoost = Math.max(0, (context.powerScore || 50) - 52) * 0.45
  const matchupBoost = ((context.matchupScore || 50) - 48) * 0.18
  const splitBoost = ((context.splitScore || 50) - 48) * 0.12
  const formBoost = ((context.formScore || 50) - 45) * 0.14
  const recentHrBoost = (context.recentHomeRuns || 0) * 1.6
  const splitHrBoost = (context.splitHomeRuns || 0) * 0.45
  const tagBoost =
    /carry|heater|split edge/i.test(context.primaryTag || '') ||
    (context.tags || []).some((tag) => /carry|heater|split edge/i.test(tag))
      ? 3.2
      : 0

  return slotBonus + powerBoost + matchupBoost + splitBoost + formBoost + recentHrBoost + splitHrBoost + tagBoost
}

const buildGameFeedContextFetcher = () => {
  const cache = new Map()

  return async (gamePk) => {
    const key = String(gamePk)
    if (cache.has(key)) return cache.get(key)

    const response = await fetch(`https://statsapi.mlb.com/api/v1.1/game/${key}/feed/live`, {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    })
    if (!response.ok) {
      throw new Error(`Failed to fetch feed/live for HR context ${response.status} ${key}`)
    }

    const feed = await response.json()
    const playLookup = new Map()
    for (const play of feed.liveData?.plays?.allPlays || []) {
      for (const playEvent of play.playEvents || []) {
        if (playEvent.playId) playLookup.set(playEvent.playId, play)
      }
    }

    const context = {
      homeTeam: feed.gameData?.teams?.home?.name || '',
      awayTeam: feed.gameData?.teams?.away?.name || '',
      homeStarterId: Number(feed.gameData?.probablePitchers?.home?.id || 0),
      awayStarterId: Number(feed.gameData?.probablePitchers?.away?.id || 0),
      playLookup
    }

    cache.set(key, context)
    return context
  }
}

const describeHomeAwayBias = (candidate) => {
  const share = candidate.isHomeToday ? candidate.homeRunContext?.homeShare : candidate.homeRunContext?.awayShare
  const oppositeShare = candidate.isHomeToday ? candidate.homeRunContext?.awayShare : candidate.homeRunContext?.homeShare
  if (!Number.isFinite(share) || !Number.isFinite(oppositeShare)) return 'neutral venue split'
  if (share >= 0.68 && share - oppositeShare >= 0.18) return candidate.isHomeToday ? 'home-heavy carry' : 'road-heavy carry'
  if (oppositeShare >= 0.68 && oppositeShare - share >= 0.18) return candidate.isHomeToday ? 'better on the road' : 'better at home'
  return 'neutral venue split'
}

const describeTimingBias = (candidate) => {
  const context = candidate.homeRunContext
  if (!context) return 'mixed timing'
  if (context.starterShare >= 0.62 && context.earlyShare >= 0.45) return 'starter ambush'
  if (context.reliefShare >= 0.58 && context.lateShare >= 0.38) return 'late bridge damage'
  if (context.highPressureShare >= 0.3) return 'close-game pop'
  return 'mixed timing'
}

const describeBullpenLane = (candidate) => {
  if (!Number.isFinite(candidate.opposingBullpenVulnerability)) return 'neutral bullpen'
  if (candidate.opposingBullpenVulnerability >= 3) return 'bullpen leak live'
  if (candidate.opposingBullpenVulnerability <= -2) return 'late lane tighter'
  return 'neutral bullpen'
}

const hasTopPitchTrap = (candidate = {}) =>
  (candidate.lineupContext?.pitchType?.topPitches || []).some(
    (pitch) =>
      Number(pitch.pitchUsage || 0) >= 28 &&
      Number(pitch.fitGrade || 0) <= -6 &&
      Number(pitch.qualityScore || 0) >= 80
  )

const buildWeightedPool = (candidates = []) => {
  const scoped = candidates
    .filter((candidate) => candidate.score >= 40)
    .slice(0, 7)

  if (!scoped.length) return []

  const weighted = scoped.map((candidate) => ({
    ...candidate,
    rawWeight: Math.pow(Math.max(8, candidate.score - 42), 0.92)
  }))
  const totalWeight = weighted.reduce((sum, candidate) => sum + candidate.rawWeight, 0) || 1

  return weighted.map((candidate) => {
    const modelShare = candidate.rawWeight / totalWeight
    const modelSharePct = Number((modelShare * 100).toFixed(1))
    const lane =
      modelSharePct >= 24
        ? 'anchor'
        : modelSharePct >= 16
          ? 'secondary'
          : modelSharePct >= 10
            ? 'live'
            : 'thin'

    return {
      ...candidate,
      modelShare: Number(modelShare.toFixed(3)),
      modelSharePct,
      lane
    }
  })
}

const buildSummaryFromLeadCandidate = (leadCandidate, weightedPool = []) => {
  if (!leadCandidate) {
    return 'No usable home-run lane has surfaced yet on the pre-lineup board.'
  }

  const homeAwayLine = describeHomeAwayBias(leadCandidate)
  const timingLine = describeTimingBias(leadCandidate)
  const supportNames = weightedPool
    .slice(1, 4)
    .filter((candidate) => candidate.modelSharePct >= 10)
    .map((candidate) => candidate.playerName)
  const matchupLine =
    leadCandidate.lineupContext?.primaryTag === 'carry'
      ? 'posted order still grades like a carry lane'
      : `the posted order still grades ${leadCandidate.lineupContext?.primaryTag || 'live'}`
  const distributionLine = supportNames.length
    ? `The better way to read this game is as a weighted cluster through ${leadCandidate.playerName}, ${supportNames.join(', ')} rather than a solo-bat script.`
    : `This still looks concentrated around ${leadCandidate.playerName} more than the rest of the current board.`

  if (leadCandidate.homeRunsLast7Days === 0 && leadCandidate.daysSinceLastHr >= 7) {
    return `${leadCandidate.playerName} is more matchup-driven than form-driven here: ${matchupLine}, ${homeAwayLine}, ${timingLine}, and ${leadCandidate.opposingPitcherHr9} HR/9 across from him despite the recent cooldown. ${distributionLine}`
  }

  if (leadCandidate.scoreBand === 'premium') {
    return `${leadCandidate.playerName} is the premium lane here because the posted order still grades like a carry bat, his recent HR sample leans ${timingLine}, and today lines up as a ${homeAwayLine} matchup into a ${leadCandidate.opposingPitcherHr9} HR/9 starter lane. ${distributionLine}`
  }

  if (leadCandidate.scoreBand === 'strong' || leadCandidate.scoreBand === 'live') {
    return `${leadCandidate.playerName} is the cleanest likely bat here because the posted order still grades ${leadCandidate.lineupContext?.primaryTag || 'live'}, the recent HR sample leans ${timingLine}, and today still profiles as a ${homeAwayLine} look. ${distributionLine}`
  }

  return `${leadCandidate.playerName} is the best available lane here, but this still looks thinner and more variance-driven than a true carry-bat HR script. ${distributionLine}`
}

const fetchStatcastLeaderboard = async (season) => {
  const url = `https://baseballsavant.mlb.com/leaderboard/home-runs?year=${season}&player_type=Batter&cat=xhr&team=&min=0&csv=true`
  const response = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0' }
  })
  if (!response.ok) {
    throw new Error(`Failed to fetch Statcast leaderboard: ${response.status}`)
  }
  return parseCsv(await response.text())
}

const fetchPlayerDetails = async (playerId, season) => {
  const url =
    `https://baseballsavant.mlb.com/leaderboard/home-runs?type=details&player_id=${playerId}` +
    `&year=${season}&player_type=Batter&cat=xhr`
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0',
      'X-Requested-With': 'XMLHttpRequest'
    }
  })
  if (!response.ok) {
    throw new Error(`Failed to fetch Statcast detail for player ${playerId}: ${response.status}`)
  }
  return response.json()
}

const buildHomeRunEventContext = async (candidate, homeRunRows, fetchGameFeedContext) => {
  const scopedRows = homeRunRows.slice(0, 12)
  const eventContexts = (
    await Promise.all(
      scopedRows.map(async (row) => {
        try {
          const gameContext = await fetchGameFeedContext(row.game_pk)
          const play = gameContext.playLookup.get(row.play_id)
          if (!play) return null

          const batterSide = play.about?.isTopInning ? 'away' : 'home'
          const pitcherSide = batterSide === 'away' ? 'home' : 'away'
          const battingTeam = batterSide === 'away' ? gameContext.awayTeam : gameContext.homeTeam
          const isHome = batterSide === 'home'
          const rbi = Number(play.result?.rbi || 0)
          const awayScoreBefore = Number(play.result?.awayScore || 0) - (batterSide === 'away' ? rbi : 0)
          const homeScoreBefore = Number(play.result?.homeScore || 0) - (batterSide === 'home' ? rbi : 0)
          const battingScoreBefore = batterSide === 'away' ? awayScoreBefore : homeScoreBefore
          const opponentScoreBefore = batterSide === 'away' ? homeScoreBefore : awayScoreBefore
          const playEvent =
            (play.playEvents || []).find((entry) => entry.playId === row.play_id) ||
            [...(play.playEvents || [])].reverse().find((entry) => entry.isPitch)
          const pitchType = playEvent?.details?.type?.description || ''
          const inning = Number(play.about?.inning || 0)
          const opponentStarterId = pitcherSide === 'home' ? gameContext.homeStarterId : gameContext.awayStarterId

          return {
            gameDate: row.game_date,
            batterTeam: battingTeam,
            isHome,
            inning,
            pitchType,
            pitcherHand: play.matchup?.pitchHand?.code || '',
            isStarter: Number(row.pitcher_id) === Number(opponentStarterId),
            isLate: inning >= 7,
            isEarly: inning > 0 && inning <= 3,
            isHighPressure: inning >= 6 && Math.abs(battingScoreBefore - opponentScoreBefore) <= 2,
            wasTrailing: battingScoreBefore < opponentScoreBefore
          }
        } catch {
          return null
        }
      })
    )
  ).filter(Boolean)

  if (!eventContexts.length) return null

  const homeShare = eventContexts.filter((entry) => entry.isHome).length / eventContexts.length
  const starterShare = eventContexts.filter((entry) => entry.isStarter).length / eventContexts.length
  const earlyShare = eventContexts.filter((entry) => entry.isEarly).length / eventContexts.length
  const lateShare = eventContexts.filter((entry) => entry.isLate).length / eventContexts.length
  const highPressureShare = eventContexts.filter((entry) => entry.isHighPressure).length / eventContexts.length
  const trailingShare = eventContexts.filter((entry) => entry.wasTrailing).length / eventContexts.length
  const pitchTypeCounts = eventContexts.reduce((accumulator, entry) => {
    if (!entry.pitchType) return accumulator
    accumulator[entry.pitchType] = (accumulator[entry.pitchType] || 0) + 1
    return accumulator
  }, {})
  const topPitchTypes = Object.entries(pitchTypeCounts)
    .sort((left, right) => right[1] - left[1])
    .slice(0, 2)
    .map(([pitchType]) => pitchType)
  const sortedDates = [...new Set(eventContexts.map((entry) => entry.gameDate))].sort()
  const averageGap =
    sortedDates.length >= 2
      ? average(sortedDates.slice(1).map((date, index) => daysBetween(sortedDates[index], date)))
      : null

  return {
    sampleSize: eventContexts.length,
    homeShare: Number(homeShare.toFixed(2)),
    awayShare: Number((1 - homeShare).toFixed(2)),
    starterShare: Number(starterShare.toFixed(2)),
    reliefShare: Number((1 - starterShare).toFixed(2)),
    earlyShare: Number(earlyShare.toFixed(2)),
    lateShare: Number(lateShare.toFixed(2)),
    highPressureShare: Number(highPressureShare.toFixed(2)),
    trailingShare: Number(trailingShare.toFixed(2)),
    averageInning: Number((average(eventContexts.map((entry) => entry.inning)) || 0).toFixed(1)),
    averageGapDays: Number.isFinite(averageGap) ? Number(averageGap.toFixed(1)) : null,
    topPitchTypes
  }
}

const scoreCandidateDetails = async (candidate, detailRows, season, targetDate, fetchGameFeedContext) => {
  const homeRunRows = detailRows
    .filter((row) => row.result === 'home_run')
    .sort((left, right) => right.game_date.localeCompare(left.game_date))
  const recentRows = homeRunRows.filter((row) => row.game_date >= `${season}-05-01`)
  const last7Rows = homeRunRows.filter((row) => {
    const age = daysBetween(row.game_date, targetDate)
    return age >= 1 && age <= 7
  })
  const last10Rows = homeRunRows.filter((row) => {
    const age = daysBetween(row.game_date, targetDate)
    return age >= 1 && age <= 10
  })
  const noDoubterRate = recentRows.length
    ? recentRows.filter((row) => row.hr_cat === 'No Doubter').length / recentRows.length
    : 0
  const avgEv = recentRows.length
    ? recentRows.reduce((sum, row) => sum + Number(row.exit_velocity || 0), 0) / recentRows.length
    : 0
  const daysSinceLastHr = homeRunRows[0] ? Math.max(daysBetween(homeRunRows[0].game_date, targetDate), 0) : 999
  const homeRunContext = await buildHomeRunEventContext(candidate, homeRunRows, fetchGameFeedContext)

  candidate.recentHrSinceMay1 = recentRows.length
  candidate.homeRunsLast7Days = last7Rows.length
  candidate.homeRunsLast10Days = last10Rows.length
  candidate.daysSinceLastHr = daysSinceLastHr
  candidate.noDoubterRate = Number(noDoubterRate.toFixed(2))
  candidate.avgExitVelocityOnHomers = Number(avgEv.toFixed(1))
  candidate.homeRunContext = homeRunContext
  const pitcherHrBoost =
    candidate.opposingPitcherHr9 >= 1.7
      ? 7
      : candidate.opposingPitcherHr9 >= 1.35
        ? 4
        : candidate.opposingPitcherHr9 <= 0.85
          ? -5
          : candidate.opposingPitcherHr9 <= 1
            ? -2
            : 0
  const recentBurstBoost =
    candidate.homeRunsLast7Days >= 5
      ? 6
      : candidate.homeRunsLast7Days >= 3
        ? 3
        : candidate.homeRunsLast7Days === 0 && candidate.recentHrSinceMay1 <= 2
          ? -3
          : 0
  const cooldownPenalty =
    candidate.homeRunsLast7Days === 0
      ? candidate.daysSinceLastHr >= 10
        ? -8
        : candidate.daysSinceLastHr >= 7
          ? -5
          : -3
      : candidate.homeRunsLast10Days <= 1 && candidate.recentHrSinceMay1 >= 4
        ? -3
        : 0
  const carryQualityBoost =
    candidate.noDoubterRate >= 0.6
      ? 3
      : candidate.noDoubterRate <= 0.15 && candidate.avgExitVelocityOnHomers <= 103
        ? -2
        : 0
  const battingImpactBoost = candidate.battingImpactContext
    ? Math.min(
        10,
        candidate.battingImpactContext.impactWindowScore * 0.28 +
          Math.max(candidate.battingImpactContext.recentAppearances - 1, 0) * 1.4
      )
    : 0
  const homeAwayFitBoost = homeRunContext
    ? candidate.isHomeToday
      ? homeRunContext.homeShare >= 0.68 && homeRunContext.homeShare - homeRunContext.awayShare >= 0.18
        ? 1.8
        : homeRunContext.awayShare >= 0.7
          ? -1.4
          : 0
      : homeRunContext.awayShare >= 0.68 && homeRunContext.awayShare - homeRunContext.homeShare >= 0.18
        ? 1.8
        : homeRunContext.homeShare >= 0.7
          ? -1.4
          : 0
    : 0
  const starterHunterBoost = homeRunContext
    ? homeRunContext.starterShare >= 0.62
      ? candidate.opposingPitcherHr9 >= 1.18
        ? 2.8
        : candidate.opposingPitcherHr9 <= 0.92
          ? -2.2
          : 0.8
      : 0
    : 0
  const reliefHunterBoost = homeRunContext
    ? homeRunContext.reliefShare >= 0.58
      ? candidate.opposingBullpenVulnerability >= 2.2
        ? 2.6
        : candidate.opposingBullpenVulnerability <= -1.5
          ? -1.5
          : 0.8
      : 0
    : 0
  const timingBoost = homeRunContext
    ? homeRunContext.earlyShare >= 0.45 && candidate.opposingPitcherHr9 >= 1.2
      ? 1.4
      : homeRunContext.highPressureShare >= 0.35 && candidate.opposingBullpenVulnerability >= 1.6
        ? 1.1
        : 0
    : 0
  const streakShapeBoost = homeRunContext
    ? Number.isFinite(homeRunContext.averageGapDays)
      ? homeRunContext.averageGapDays <= 3.2 && candidate.homeRunsLast10Days >= 2
        ? 1.4
        : homeRunContext.averageGapDays >= 8 && candidate.homeRunsLast10Days <= 1
          ? -1.2
          : 0
      : 0
    : 0
  const falseCarryoverPenalty =
    candidate.battingImpactContext?.recentAppearances === 1 &&
    Number(candidate.battingImpactContext?.hrGames || 0) >= 1 &&
    candidate.homeRunsLast10Days <= 1
      ? -8
      : 0
  const volatileStarPenalty =
    Number(candidate.lineupContext?.varianceScore || 0) >= 82 &&
    Number(candidate.lineupContext?.formScore || 50) < 55
      ? -6
      : 0
  const pitchTrapPenalty = hasTopPitchTrap(candidate) ? -12 : 0
  const reliefMismatchPenalty =
    homeRunContext?.reliefShare >= 0.55 && candidate.opposingBullpenVulnerability <= 0 ? -3 : 0

  candidate.score = Number(
    (
      candidate.baseScore +
      candidate.recentHrSinceMay1 * 2.8 +
      candidate.homeRunsLast7Days * 1.6 +
      candidate.noDoubterRate * 6 +
      Math.max(0, (avgEv - 104) * 0.5) +
      pitcherHrBoost +
      recentBurstBoost +
      cooldownPenalty +
      carryQualityBoost +
      battingImpactBoost +
      homeAwayFitBoost +
      starterHunterBoost +
      reliefHunterBoost +
      timingBoost +
      streakShapeBoost +
      falseCarryoverPenalty +
      volatileStarPenalty +
      pitchTrapPenalty +
      reliefMismatchPenalty
    ).toFixed(1)
  )
  candidate.scoreBand =
    candidate.score >= 100 ? 'premium' : candidate.score >= 82 ? 'strong' : candidate.score >= 70 ? 'live' : 'thin'
  candidate.burstTag =
    candidate.homeRunsLast7Days >= 4
      ? 'heater'
      : candidate.homeRunsLast7Days === 0 && candidate.daysSinceLastHr >= 7
        ? 'cooling'
      : candidate.recentHrSinceMay1 >= 5
        ? 'active'
        : candidate.noDoubterRate >= 0.55
          ? 'carry'
          : 'watch'
  const venueLabel = describeHomeAwayBias(candidate)
  const timingLabel = describeTimingBias(candidate)
  const bullpenLabel = describeBullpenLane(candidate)
  candidate.contextLabels = [
    candidate.lineupContext
      ? `Slot ${candidate.lineupContext.slot} | ${candidate.lineupContext.primaryTag}`
      : 'Lineup pending',
    venueLabel,
    timingLabel,
    bullpenLabel
  ]
  candidate.signalSummary = [
    candidate.contextLabels[0],
    timingLabel !== 'mixed timing' ? timingLabel : venueLabel !== 'neutral venue split' ? venueLabel : bullpenLabel,
    timingLabel !== 'mixed timing' && venueLabel !== 'neutral venue split' ? venueLabel : null,
    Number.isFinite(candidate.opposingPitcherHr9) ? `${candidate.opposingPitcherHr9} HR/9 starter` : null
  ]
    .filter(Boolean)
    .join(' | ')
  candidate.rationale = [
    `${candidate.seasonHr} HR and ${candidate.seasonXHR} xHR on the season`,
    `${candidate.recentHrSinceMay1} HR since May 1 with ${candidate.homeRunsLast7Days} in the last 7 days and ${candidate.homeRunsLast10Days} in the last 10`,
    `${candidate.opposingPitcher} is allowing roughly ${candidate.opposingPitcherHr9} HR/9`,
    `Park HR index ${candidate.parkHrIndex}`,
    candidate.daysSinceLastHr < 999
      ? `Last HR came ${candidate.daysSinceLastHr} day${candidate.daysSinceLastHr === 1 ? '' : 's'} ago`
      : 'No tracked home run date available',
    homeRunContext
      ? `${candidate.isHomeToday ? 'Home' : 'Road'} today | historical split ${Math.round(
          (candidate.isHomeToday ? homeRunContext.homeShare : homeRunContext.awayShare) * 100
        )}% on this side`
      : 'Venue split still unknown from tracked HR events',
    homeRunContext
      ? `${Math.round(homeRunContext.starterShare * 100)}% off starters | ${Math.round(homeRunContext.reliefShare * 100)}% off relievers | avg inning ${homeRunContext.averageInning}`
      : 'Starter vs relief split not stored yet',
    homeRunContext?.topPitchTypes?.length
      ? `Most recent damage has skewed toward ${homeRunContext.topPitchTypes.join(' / ')}`
      : 'Pitch-type tendency not stored yet',
    candidate.battingImpactContext
      ? `${candidate.battingImpactContext.recentAppearances} recent batting-leader appearances | ${candidate.battingImpactContext.averageImpactScore.toFixed(1)} avg impact`
      : 'No recent batting-leader signal stored yet',
    candidate.weatherContext?.weather?.label
      ? `Weather lane: ${candidate.weatherContext.weather.label}`
      : 'Weather lane not stored yet',
    candidate.lineupContext
      ? `Slot ${candidate.lineupContext.slot} | ${candidate.lineupContext.primaryTag || 'posted lineup'} | lineup priority ${candidate.lineupPriority} | bullpen vulnerability ${candidate.opposingBullpenVulnerability}`
      : 'Lineup slot not posted yet'
  ]

  candidate.avoidHrChase =
    falseCarryoverPenalty <= -8 &&
    volatileStarPenalty <= -6 &&
    pitchTrapPenalty <= -12 &&
    candidate.score < 95

  return candidate
}

const scoreCandidates = async ({ date, season, top, scanLimit, teamLimit }) => {
  const games = await loadDayGames(date)
  const matchupByAbbr = buildMatchupMap(games)
  const lineupBoardsByGameId = await loadLineupBoards(date)
  const lineupLookup = buildLineupLookup(lineupBoardsByGameId)
  const weatherLookup = buildWeatherLookup(lineupBoardsByGameId)
  const battingImpactByPlayerName = await loadBattingImpactHistory()
  const fetchGameFeedContext = buildGameFeedContextFetcher()
  const leaderboard = await fetchStatcastLeaderboard(season)
  const leaderboardByPlayerId = new Map(leaderboard.map((row) => [Number(row.player_id), row]))

  const createCandidate = (row) => {
    const matchup = matchupByAbbr[row.team_abbrev]
    const lineupContext = lineupLookup.get(Number(row.player_id)) || null
    const weatherContext = weatherLookup.get(matchup.gameTitle) || null
    const battingImpactContext = buildBattingImpactContext(formatPlayerName(row.player), battingImpactByPlayerName, date)
    const hr = Number(row.hr_total)
    const xhr = Number(row.xhr)
    const xhrDiff = Number(row.xhr_diff)
    const lineupPriority = buildLineupPriority(lineupContext)
    const slotPenalty = lineupContext ? Math.max(0, Number(lineupContext.slot || 9) - 6) * 1.3 : 0
    const battingImpactPriority = battingImpactContext ? battingImpactContext.impactWindowScore * 0.45 : 0
    const weatherBoost = buildWeatherBoost(weatherContext)
    const baseScore =
      xhr * 2.15 +
      hr * 1.05 +
      matchup.opposingPitcherHr9 * 6.8 +
      (matchup.parkHrIndex - 100) * 0.11 +
      Math.max(0, -xhrDiff) * 2 +
      Math.max(0, (lineupContext?.powerScore || 50) - 55) * 0.2 +
      Math.max(0, (lineupContext?.matchupScore || 50) - 50) * 0.14 +
      Math.max(0, (lineupContext?.formScore || 50) - 48) * 0.1 +
      battingImpactPriority +
      weatherBoost +
      lineupPriority * 0.55 -
      Math.max(0, xhrDiff) * 0.7 -
      slotPenalty

    return {
      playerId: Number(row.player_id),
      playerName: formatPlayerName(row.player),
      teamAbbrev: row.team_abbrev,
      teamName: matchup.teamName,
      gameTitle: matchup.gameTitle,
      opposingPitcher: matchup.opposingPitcher,
      opposingPitcherHand: matchup.opposingPitcherHand,
      opposingPitcherHr9: Number(matchup.opposingPitcherHr9.toFixed(2)),
      parkHrIndex: matchup.parkHrIndex,
      isHomeToday: matchup.isHomeToday,
      opposingBullpenVulnerability: matchup.opposingBullpenVulnerability,
      seasonHr: hr,
      seasonXHR: xhr,
      xhrDiff,
      baseScore,
      lineupContext,
      lineupPriority: Number(lineupPriority.toFixed(1)),
      battingImpactContext,
      weatherContext,
      weatherBoost: Number(weatherBoost.toFixed(1))
    }
  }

  const preScoredCandidates = leaderboard
    .filter((row) => matchupByAbbr[row.team_abbrev])
    .map(createCandidate)
    .filter(
      (candidate) =>
        candidate.seasonHr >= 5 ||
        candidate.seasonXHR >= 5 ||
        Number(candidate.battingImpactContext?.impactWindowScore || 0) >= 16
    )
    .sort((left, right) => right.baseScore - left.baseScore)

  const supplementalCandidates = [...lineupLookup.entries()]
    .map(([playerId, context]) => {
      const row = leaderboardByPlayerId.get(Number(playerId))
      if (!row) return null
      if (!matchupByAbbr[row.team_abbrev]) return null
      return createCandidate(row)
    })
    .filter(Boolean)
    .filter((candidate) => candidate.lineupPriority >= 13 || candidate.lineupContext?.recentHomeRuns >= 2)
    .sort((left, right) => right.lineupPriority - left.lineupPriority)

  const battingImpactCandidates = Object.entries(battingImpactByPlayerName)
    .map(([playerName, context]) => {
      const row = leaderboard.find((entry) => formatPlayerName(entry.player) === playerName)
      if (!row) return null
      if (!matchupByAbbr[row.team_abbrev]) return null
      const candidate = createCandidate(row)
      if (!candidate.battingImpactContext) return null
      return candidate
    })
    .filter(Boolean)
    .filter(
      (candidate) =>
        candidate.battingImpactContext.recentAppearances >= 1 &&
        candidate.battingImpactContext.impactWindowScore >= 18
    )
    .sort(
      (left, right) =>
        right.battingImpactContext.impactWindowScore - left.battingImpactContext.impactWindowScore
    )

  const mergedCandidates = [...preScoredCandidates]
  for (const candidate of supplementalCandidates) {
    if (!mergedCandidates.some((existing) => existing.playerId === candidate.playerId)) {
      mergedCandidates.push(candidate)
    }
  }
  for (const candidate of battingImpactCandidates) {
    if (!mergedCandidates.some((existing) => existing.playerId === candidate.playerId)) {
      mergedCandidates.push(candidate)
    }
  }

  const shortlistedCandidates = Object.values(
    mergedCandidates.reduce((accumulator, candidate) => {
      accumulator[candidate.teamAbbrev] ||= []
      accumulator[candidate.teamAbbrev].push(candidate)
      return accumulator
    }, {})
  )
    .flatMap((teamCandidates) => teamCandidates.slice(0, teamLimit))
    .slice(0, Math.max(scanLimit, games.length * 6))

  const scoredCandidates = []
  const chunkSize = 8
  for (let start = 0; start < shortlistedCandidates.length; start += chunkSize) {
    const batch = shortlistedCandidates.slice(start, start + chunkSize)
    const batchScores = await Promise.all(
      batch.map(async (candidate) => {
        const detailRows = await fetchPlayerDetails(candidate.playerId, season)
        return scoreCandidateDetails(candidate, detailRows, season, date, fetchGameFeedContext)
      })
    )
    scoredCandidates.push(...batchScores)
  }

  const rankedPicks = scoredCandidates
    .sort((left, right) => right.score - left.score)
    .slice(0, top)
    .map((candidate, index) => ({
      rank: index + 1,
      ...candidate
    }))

  const gameBoards = games.map((game) => {
    const candidates = scoredCandidates
      .filter((candidate) => candidate.gameTitle === game.title && !candidate.avoidHrChase)
      .sort((left, right) => right.score - left.score)

    const weightedPool = buildWeightedPool(candidates)
    const likely = weightedPool.filter((candidate, index) => index === 0 || candidate.modelSharePct >= 18).slice(0, 2)
    const possible = weightedPool
      .filter((candidate) => !likely.some((likelyCandidate) => likelyCandidate.playerId === candidate.playerId))
      .filter((candidate) => candidate.modelSharePct >= 10)
      .slice(0, 3)
    const alternates = weightedPool
      .filter(
        (candidate) =>
          !likely.some((likelyCandidate) => likelyCandidate.playerId === candidate.playerId) &&
          !possible.some((possibleCandidate) => possibleCandidate.playerId === candidate.playerId)
      )
      .slice(0, 3)

    const leadCandidate = likely[0] ?? possible[0] ?? alternates[0] ?? null
    return {
      gameTitle: game.title,
      likely,
      possible,
      alternates,
      weightedPool,
      summary: buildSummaryFromLeadCandidate(leadCandidate, weightedPool)
    }
  })

  return {
    picks: rankedPicks,
    games: gameBoards
  }
}

const main = async () => {
  const { date, top, scanLimit, teamLimit, out, moduleOut } = parseArgs()
  const season = Number(date.slice(0, 4))
  const { picks, games } = await scoreCandidates({ date, season, top, scanLimit, teamLimit })

  const payload = {
    modelName: 'statcast-hr-prototype-v3',
    date,
    generatedAt: new Date().toISOString(),
    sources: [
      'https://baseballsavant.mlb.com/leaderboard/home-runs',
      `https://baseballsavant.mlb.com/leaderboard/home-runs?year=${season}&player_type=Batter&cat=xhr&team=&min=0&csv=true`,
      'https://baseballsavant.mlb.com/leaderboard/home-runs?type=details'
    ],
    picks,
    games
  }

  await mkdir(path.dirname(out), { recursive: true })
  await writeFile(out, JSON.stringify(payload, null, 2))
  if (moduleOut) {
    const moduleSource = `export const homeRunBoardMeta = ${JSON.stringify(
      {
        modelName: payload.modelName,
        date: payload.date,
        generatedAt: payload.generatedAt,
        sources: payload.sources
      },
      null,
      2
    )}\n\nexport const homeRunTargetsByGame = ${JSON.stringify(
      Object.fromEntries(payload.games.map((entry) => [entry.gameTitle, entry])),
      null,
      2
    )}\n`
    await mkdir(path.dirname(moduleOut), { recursive: true })
    await writeFile(moduleOut, moduleSource)
  }
  console.log(`Saved ${picks.length} home-run picks to ${out}`)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
