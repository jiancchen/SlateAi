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

    matchupByAbbr[awayAbbr] = {
      teamName: awayTeam,
      gameTitle: game.title,
      opposingPitcher: homePitcher.fullName,
      opposingPitcherHand: homePitcher.pitchHand,
      opposingPitcherHr9: awayOpponentHr9,
      parkHrIndex: homeParkHrIndex
    }

    matchupByAbbr[homeAbbr] = {
      teamName: homeTeam,
      gameTitle: game.title,
      opposingPitcher: awayPitcher.fullName,
      opposingPitcherHand: awayPitcher.pitchHand,
      opposingPitcherHr9: homeOpponentHr9,
      parkHrIndex: homeParkHrIndex
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
          recentHomeRuns: Number(hitter.recent?.homeRuns ?? 0),
          seasonHomeRuns: Number(hitter.season?.homeRuns ?? 0),
          splitHomeRuns: Number(hitter.split?.homeRuns ?? 0)
        })
      }
    }
  }

  return lookup
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

const scoreCandidateDetails = (candidate, detailRows, season) => {
  const recentRows = detailRows.filter((row) => row.result === 'home_run' && row.game_date >= `${season}-05-01`)
  const last7Rows = detailRows.filter((row) => row.result === 'home_run' && row.game_date >= `${season}-05-08`)
  const noDoubterRate = recentRows.length
    ? recentRows.filter((row) => row.hr_cat === 'No Doubter').length / recentRows.length
    : 0
  const avgEv = recentRows.length
    ? recentRows.reduce((sum, row) => sum + Number(row.exit_velocity || 0), 0) / recentRows.length
    : 0

  candidate.recentHrSinceMay1 = recentRows.length
  candidate.homeRunsLast7Days = last7Rows.length
  candidate.noDoubterRate = Number(noDoubterRate.toFixed(2))
  candidate.avgExitVelocityOnHomers = Number(avgEv.toFixed(1))
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

  candidate.score = Number(
    (
      candidate.baseScore +
      candidate.recentHrSinceMay1 * 2.8 +
      candidate.homeRunsLast7Days * 1.6 +
      candidate.noDoubterRate * 6 +
      Math.max(0, (avgEv - 104) * 0.5) +
      pitcherHrBoost +
      recentBurstBoost +
      carryQualityBoost +
      battingImpactBoost
    ).toFixed(1)
  )
  candidate.scoreBand =
    candidate.score >= 100 ? 'premium' : candidate.score >= 82 ? 'strong' : candidate.score >= 70 ? 'live' : 'thin'
  candidate.burstTag =
    candidate.homeRunsLast7Days >= 4
      ? 'heater'
      : candidate.recentHrSinceMay1 >= 5
        ? 'active'
        : candidate.noDoubterRate >= 0.55
          ? 'carry'
          : 'watch'
  candidate.rationale = [
    `${candidate.seasonHr} HR and ${candidate.seasonXHR} xHR on the season`,
    `${candidate.recentHrSinceMay1} HR since May 1 with ${candidate.homeRunsLast7Days} in the last week`,
    `${candidate.opposingPitcher} is allowing roughly ${candidate.opposingPitcherHr9} HR/9`,
    `Park HR index ${candidate.parkHrIndex}`,
    candidate.battingImpactContext
      ? `${candidate.battingImpactContext.recentAppearances} recent batting-leader appearances | ${candidate.battingImpactContext.averageImpactScore.toFixed(1)} avg impact`
      : 'No recent batting-leader signal stored yet',
    candidate.lineupContext
      ? `Slot ${candidate.lineupContext.slot} | ${candidate.lineupContext.primaryTag || 'posted lineup'} | lineup priority ${candidate.lineupPriority}`
      : 'Lineup slot not posted yet'
  ]

  return candidate
}

const scoreCandidates = async ({ date, season, top, scanLimit, teamLimit }) => {
  const games = await loadDayGames(date)
  const matchupByAbbr = buildMatchupMap(games)
  const lineupBoardsByGameId = await loadLineupBoards(date)
  const lineupLookup = buildLineupLookup(lineupBoardsByGameId)
  const battingImpactByPlayerName = await loadBattingImpactHistory()
  const leaderboard = await fetchStatcastLeaderboard(season)
  const leaderboardByPlayerId = new Map(leaderboard.map((row) => [Number(row.player_id), row]))

  const createCandidate = (row) => {
    const matchup = matchupByAbbr[row.team_abbrev]
    const lineupContext = lineupLookup.get(Number(row.player_id)) || null
    const battingImpactContext = buildBattingImpactContext(formatPlayerName(row.player), battingImpactByPlayerName, date)
    const hr = Number(row.hr_total)
    const xhr = Number(row.xhr)
    const xhrDiff = Number(row.xhr_diff)
    const lineupPriority = buildLineupPriority(lineupContext)
    const slotPenalty = lineupContext ? Math.max(0, Number(lineupContext.slot || 9) - 6) * 1.3 : 0
    const battingImpactPriority = battingImpactContext ? battingImpactContext.impactWindowScore * 0.45 : 0
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
      seasonHr: hr,
      seasonXHR: xhr,
      xhrDiff,
      baseScore,
      lineupContext,
      lineupPriority: Number(lineupPriority.toFixed(1)),
      battingImpactContext
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
        return scoreCandidateDetails(candidate, detailRows, season)
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
      .filter((candidate) => candidate.gameTitle === game.title)
      .sort((left, right) => right.score - left.score)

    const likely = candidates.slice(0, 1)
    if (candidates[1] && candidates[1].score >= Math.max(68, candidates[0].score - 7)) {
      likely.push(candidates[1])
    }
    const possible = candidates
      .filter((candidate) => !likely.some((likelyCandidate) => likelyCandidate.playerId === candidate.playerId))
      .slice(0, 3)
      .filter((candidate) => candidate.score >= 53)

    const leadCandidate = likely[0] ?? possible[0] ?? null
    let gameSummary = 'No usable home-run lane has surfaced yet on the pre-lineup board.'
    if (leadCandidate) {
      gameSummary =
        leadCandidate.scoreBand === 'premium'
          ? `${leadCandidate.playerName} is the premium carry bat here, driven by ${leadCandidate.recentHrSinceMay1} recent homers, a ${leadCandidate.opposingPitcherHr9} HR/9 starter matchup, and elite carry quality.`
          : leadCandidate.scoreBand === 'strong' || leadCandidate.scoreBand === 'live'
            ? `${leadCandidate.playerName} is the cleanest likely bat here, driven by ${leadCandidate.recentHrSinceMay1} recent homers, a ${leadCandidate.opposingPitcherHr9} HR/9 starter matchup, and a ${leadCandidate.scoreBand} contact-quality signal.`
            : `${leadCandidate.playerName} is the best available lane here, but this game still grades as a thinner HR script before confirmed lineups arrive.`
    }

    return {
      gameTitle: game.title,
      likely,
      possible,
      summary: gameSummary
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
    modelName: 'statcast-hr-prototype-v2',
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
