import fs from 'node:fs/promises'
import path from 'node:path'

const DEFAULT_INPUT = 'web/src/lib/day-2026-05-25-tennis-clay-context.generated.json'
const DEFAULT_OUTPUT = 'web/src/lib/day-2026-05-25-tennis-opponent-quality.generated.json'
const DEFAULT_RANKINGS = 'data-private/reference/tennis/player-rankings.json'
const DEFAULT_FLASHSCORE_RECENT_MAP = ''

const parseArgs = () => {
  const args = process.argv.slice(2)
  const options = {
    input: DEFAULT_INPUT,
    output: DEFAULT_OUTPUT,
    rankings: DEFAULT_RANKINGS,
    flashscoreRecentMap: DEFAULT_FLASHSCORE_RECENT_MAP
  }

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index]
    if (arg === '--input') {
      options.input = args[index + 1]
      index += 1
    } else if (arg === '--output') {
      options.output = args[index + 1]
      index += 1
    } else if (arg === '--rankings') {
      options.rankings = args[index + 1]
      index += 1
    } else if (arg === '--flashscore-recent-map') {
      options.flashscoreRecentMap = args[index + 1]
      index += 1
    }
  }

  return options
}

const normalizeName = (value) =>
  String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/gi, ' ')
    .trim()
    .toLowerCase()

const recentMapKey = (matchId, playerName, recentIndex) => `${matchId}::${normalizeName(playerName)}::${recentIndex}`

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
    winPct: total ? Number((wins / total).toFixed(3)) : null
  }
}

const scoreTokenPattern = /([0-7])-([0-7])(?:\d+)?/g

const parseScoreTokens = (result) => {
  const text = String(result || '')
  const tokens = []
  let match = scoreTokenPattern.exec(text)
  while (match) {
    tokens.push({
      leftGames: Number.parseInt(match[1], 10),
      rightGames: Number.parseInt(match[2], 10),
      raw: match[0]
    })
    match = scoreTokenPattern.exec(text)
  }
  return tokens
}

const parseMatchResult = (recentMatch) => {
  const result = String(recentMatch?.result || '')
  const tokens = parseScoreTokens(result)
  const playerLost = /\bLoss\b/i.test(result)
  const retirement = /\bret\.?\b/i.test(result)
  const walkover = /\bw\/o\b/i.test(result)
  const completed = tokens.length > 0 && !walkover

  let setsWon = 0
  let setsLost = 0
  let gamesWon = 0
  let gamesLost = 0
  let tiebreakSets = 0

  for (const token of tokens) {
    const playerGames = playerLost ? token.rightGames : token.leftGames
    const opponentGames = playerLost ? token.leftGames : token.rightGames
    gamesWon += playerGames
    gamesLost += opponentGames
    if (playerGames > opponentGames) setsWon += 1
    if (playerGames < opponentGames) setsLost += 1
    if ((playerGames === 7 && opponentGames === 6) || (playerGames === 6 && opponentGames === 7)) {
      tiebreakSets += 1
    }
  }

  return {
    completed,
    playerWon: completed ? !playerLost : null,
    retirement,
    walkover,
    setsPlayed: tokens.length,
    setsWon,
    setsLost,
    gamesWon,
    gamesLost,
    tiebreakSets,
    decidingSet: tokens.length >= 3,
    straightSetWin: completed && !playerLost && setsLost === 0 && tokens.length >= 2,
    straightSetLoss: completed && playerLost && setsWon === 0 && tokens.length >= 2,
    resistance: tokens.length >= 3 || tiebreakSets > 0,
    scoreTokens: tokens
  }
}

const eventTier = (event = '') => {
  const text = String(event)
  if (/grand slam|roland garros|australian open|wimbledon|us open/i.test(text)) return 'major'
  if (/rome|madrid|monte carlo|indian wells|miami|cincinnati|shanghai|paris/i.test(text)) return 'tour-1000'
  if (/challenger/i.test(text)) return 'challenger'
  if (/\bW\d+\b/i.test(text)) return 'itf'
  if (/billie jean king cup|davis cup/i.test(text)) return 'team'
  return text ? 'tour/other' : 'same-event-run'
}

const tierWeight = (tier) => {
  if (tier === 'major') return 1.2
  if (tier === 'tour-1000') return 1.1
  if (tier === 'tour/other') return 1
  if (tier === 'team') return 0.9
  if (tier === 'challenger') return 0.72
  if (tier === 'itf') return 0.55
  return 0.85
}

const rankStrength = (rank) => {
  if (!Number.isFinite(rank)) return 0.6
  if (rank <= 10) return 1.35
  if (rank <= 25) return 1.2
  if (rank <= 50) return 1.05
  if (rank <= 100) return 0.9
  if (rank <= 150) return 0.75
  if (rank <= 250) return 0.6
  return 0.45
}

const loadJsonIfExists = async (filePath, fallback) => {
  try {
    return JSON.parse(await fs.readFile(filePath, 'utf8'))
  } catch (error) {
    if (error?.code === 'ENOENT') return fallback
    throw error
  }
}

const RANKING_NAME_ALIASES = {
  'alexander shevchenko': 'aleksandr shevchenko',
  'caijsa wilda hennemann': 'caijsa hennemann',
  'catherine mcnally': 'caty mcnally',
  'bianca vanessa andreescu': 'bianca andreescu',
  'cori gauff': 'coco gauff',
  'daniel merida aguilar': 'daniel merida',
  'guiomar zuleta de reales': 'guiomar maristany',
  'jaume antoni munar clar': 'jaume munar',
  'joel schwaerzler': 'joel schwarzler',
  'leylah annie fernandez': 'leylah fernandez',
  'pablo carreno busta': 'pablo carreno-busta',
  'pedro martinez portero': 'pedro martinez',
  'tyra caterina grant': 'tyra grant',
  'xiyu wang': 'wang xiyu',
  'xinyu wang': 'wang xinyu'
}

const getRanking = (rankings, name) => {
  const key = normalizeName(name)
  const aliasKey = RANKING_NAME_ALIASES[key]
  const entry = rankings.players?.[key] || rankings.players?.[aliasKey] || rankings.players?.[name] || null
  if (!entry) return null
  const rank = Number(entry.rank)
  return {
    rank: Number.isFinite(rank) ? rank : null,
    points: Number.isFinite(Number(entry.points)) ? Number(entry.points) : null,
    age: Number.isFinite(Number(entry.age)) ? Number(entry.age) : null,
    country: entry.country || null,
    tour: entry.tour || null,
    source: entry.source || rankings.source || null,
    profileUrl: entry.profileUrl || null,
    liveRankSource: entry.liveRankSource || null,
    asOf: entry.asOf || rankings.asOf || null
  }
}

const summarizePlayer = (player, rankings, flashscoreRecentByKey = {}, matchId = '') => {
  const ranking = getRanking(rankings, player.name)
  const clayRecord = parseRecord(player.record2026?.clay)
  const overallRecord = parseRecord(player.record2026?.overall)
  const recentMatches = (player.recentMatches || []).map((match, recentIndex) => {
    const parsed = parseMatchResult(match)
    const opponentRanking = getRanking(rankings, match.opponent)
    const tier = eventTier(match.event)
    const opponentWeight = rankStrength(opponentRanking?.rank) * tierWeight(tier)
    const resultPoints =
      parsed.playerWon === true
        ? 1
        : parsed.playerWon === false
          ? parsed.resistance
            ? 0.36
            : 0.12
          : 0.2
    const gameDiff = parsed.gamesWon - parsed.gamesLost
    const pressureBonus = parsed.resistance ? 0.08 : 0

    const flashscoreRecent = flashscoreRecentByKey[recentMapKey(matchId, player.name, recentIndex)]
    const serviceStats = flashscoreRecent?.serviceStats

    return {
      event: match.event || '',
      eventTier: tier,
      opponent: match.opponent || '',
      opponentRanking,
      result: match.result || '',
      date: match.date || '',
      parsed,
      opponentWeight: Number(opponentWeight.toFixed(3)),
      qualityPoints: Number((resultPoints * opponentWeight + pressureBonus + gameDiff * 0.01).toFixed(3)),
      flashscore: flashscoreRecent
        ? {
            flashscoreId: flashscoreRecent.flashscoreId,
            label: flashscoreRecent.flashscoreLabel,
            tournamentUrl: flashscoreRecent.flashscoreTournamentUrl
          }
        : null,
      serviceStats: serviceStats || null
    }
  })

  const completedMatches = recentMatches.filter((match) => match.parsed.completed)
  const knownRankMatches = recentMatches.filter((match) => Number.isFinite(match.opponentRanking?.rank))
  const wins = completedMatches.filter((match) => match.parsed.playerWon).length
  const losses = completedMatches.filter((match) => match.parsed.playerWon === false).length
  const setsWon = completedMatches.reduce((sum, match) => sum + match.parsed.setsWon, 0)
  const setsLost = completedMatches.reduce((sum, match) => sum + match.parsed.setsLost, 0)
  const gamesWon = completedMatches.reduce((sum, match) => sum + match.parsed.gamesWon, 0)
  const gamesLost = completedMatches.reduce((sum, match) => sum + match.parsed.gamesLost, 0)
  const resistanceMatches = completedMatches.filter((match) => match.parsed.resistance).length
  const straightSetWins = completedMatches.filter((match) => match.parsed.straightSetWin).length
  const straightSetLosses = completedMatches.filter((match) => match.parsed.straightSetLoss).length
  const totalQualityPoints = recentMatches.reduce((sum, match) => sum + match.qualityPoints, 0)
  const possibleQualityBaseline = recentMatches.reduce((sum, match) => sum + match.opponentWeight, 0)
  const scorelineFormScore = possibleQualityBaseline
    ? Number((100 * totalQualityPoints / possibleQualityBaseline).toFixed(1))
    : null
  const rankingCoveragePct = recentMatches.length
    ? Number((knownRankMatches.length / recentMatches.length).toFixed(3))
    : null
  const opponentAdjustedFormScore = rankingCoveragePct >= 0.5
    ? scorelineFormScore
    : null
  const avgKnownOpponentRank = knownRankMatches.length
    ? Number((knownRankMatches.reduce((sum, match) => sum + match.opponentRanking.rank, 0) / knownRankMatches.length).toFixed(1))
    : null
  const serviceMatches = recentMatches.filter((match) => match.serviceStats)
  const serviceHoldValues = serviceMatches
    .map((match) => Number(match.serviceStats?.serviceHoldPct))
    .filter((value) => Number.isFinite(value))
  const aceValues = serviceMatches.map((match) => Number(match.serviceStats?.aces)).filter((value) => Number.isFinite(value))
  const firstServeWonValues = serviceMatches
    .map((match) => Number(match.serviceStats?.firstServeWonPct))
    .filter((value) => Number.isFinite(value))

  return {
    name: player.name,
    ranking,
    records: {
      overall2026: overallRecord,
      clay2026: clayRecord,
      raw: player.record2026 || {}
    },
    recentWindow: {
      matches: recentMatches.length,
      completed: completedMatches.length,
      wins,
      losses,
      winPct: completedMatches.length ? Number((wins / completedMatches.length).toFixed(3)) : null,
      setsWon,
      setsLost,
      setPct: setsWon + setsLost ? Number((setsWon / (setsWon + setsLost)).toFixed(3)) : null,
      gamesWon,
      gamesLost,
      gamePct: gamesWon + gamesLost ? Number((gamesWon / (gamesWon + gamesLost)).toFixed(3)) : null,
      resistanceMatches,
      straightSetWins,
      straightSetLosses,
      avgKnownOpponentRank,
      knownOpponentRanks: knownRankMatches.length,
      missingOpponentRanks: recentMatches.length - knownRankMatches.length,
      top10Opponents: knownRankMatches.filter((match) => match.opponentRanking.rank <= 10).length,
      top25Opponents: knownRankMatches.filter((match) => match.opponentRanking.rank <= 25).length,
      top50Opponents: knownRankMatches.filter((match) => match.opponentRanking.rank <= 50).length,
      challengerOrItfMatches: recentMatches.filter((match) => match.eventTier === 'challenger' || match.eventTier === 'itf').length,
      rankingCoveragePct,
      scorelineFormScore,
      opponentAdjustedFormScore
    },
    serviceData: {
      source: serviceMatches.length ? 'Flashscore recent-match stats' : 'not available in Tennistonic scrape',
      matchesWithStats: serviceMatches.length,
      avgServiceHoldPct: serviceHoldValues.length
        ? Number((serviceHoldValues.reduce((sum, value) => sum + value, 0) / serviceHoldValues.length).toFixed(1))
        : null,
      avgAces: aceValues.length ? Number((aceValues.reduce((sum, value) => sum + value, 0) / aceValues.length).toFixed(1)) : null,
      avgFirstServeWonPct: firstServeWonValues.length
        ? Number((firstServeWonValues.reduce((sum, value) => sum + value, 0) / firstServeWonValues.length).toFixed(1))
        : null,
      note: serviceMatches.length
        ? 'Service hold, aces, and serve/return stat rows are joined from Flashscore where a recent match could be resolved.'
        : 'Recent scores support set/game resistance only until a Flashscore recent-match stat row is resolved.'
    },
    recentMatches
  }
}

const matchupRead = (players) => {
  const [left, right] = players
  if (!left || !right) return ''
  const deltas = []
  const leftClay = left.records.clay2026?.winPct
  const rightClay = right.records.clay2026?.winPct
  if (Number.isFinite(leftClay) && Number.isFinite(rightClay)) {
    const leader = leftClay >= rightClay ? left : right
    const gap = Math.abs(leftClay - rightClay)
    deltas.push(`${leader.name} owns the stronger 2026 clay record by ${(gap * 100).toFixed(1)} percentage points.`)
  }

  const leftForm = left.recentWindow.opponentAdjustedFormScore
  const rightForm = right.recentWindow.opponentAdjustedFormScore
  if (Number.isFinite(leftForm) && Number.isFinite(rightForm)) {
    const leader = leftForm >= rightForm ? left : right
    const gap = Math.abs(leftForm - rightForm)
    deltas.push(`${leader.name} leads the current opponent-adjusted form score by ${gap.toFixed(1)} points.`)
  } else {
    const leftScoreline = left.recentWindow.scorelineFormScore
    const rightScoreline = right.recentWindow.scorelineFormScore
    if (Number.isFinite(leftScoreline) && Number.isFinite(rightScoreline)) {
      const leader = leftScoreline >= rightScoreline ? left : right
      const gap = Math.abs(leftScoreline - rightScoreline)
      deltas.push(`${leader.name} leads the current scoreline-form score by ${gap.toFixed(1)} points before opponent rankings are applied.`)
    }
  }

  const missingRanks = left.recentWindow.missingOpponentRanks + right.recentWindow.missingOpponentRanks
  if (missingRanks > 0) {
    deltas.push(`${missingRanks} recent-opponent rankings are still missing, so this read should be treated as partially ranked until the ranking warehouse is filled.`)
  }

  return deltas.join(' ')
}

const main = async () => {
  const options = parseArgs()
  const inputPath = path.resolve(options.input)
  const outputPath = path.resolve(options.output)
  const rankingsPath = path.resolve(options.rankings)
  const rawContext = await loadJsonIfExists(inputPath, null)
  if (!rawContext?.matches) {
    throw new Error(`No Tennistonic matches found in ${inputPath}`)
  }

  const rankings = await loadJsonIfExists(rankingsPath, {
    source: 'empty local rankings warehouse',
    asOf: null,
    players: {}
  })
  const flashscoreRecent = options.flashscoreRecentMap
    ? await loadJsonIfExists(path.resolve(options.flashscoreRecentMap), { map: {} })
    : { map: {} }
  const flashscoreRecentByKey = flashscoreRecent.map || {}

  const matches = {}
  const missingRankingNames = new Set()
  let recentServiceRows = 0

  for (const [matchId, match] of Object.entries(rawContext.matches)) {
    const players = (match.players || []).map((player) => summarizePlayer(player, rankings, flashscoreRecentByKey, matchId))
    for (const player of players) {
      if (!player.ranking?.rank) missingRankingNames.add(player.name)
      for (const recentMatch of player.recentMatches) {
        if (!recentMatch.opponentRanking?.rank) missingRankingNames.add(recentMatch.opponent)
        if (recentMatch.serviceStats) recentServiceRows += 1
      }
    }

    matches[matchId] = {
      title: match.title,
      sourceUrl: match.sourceUrl,
      h2hRecord: match.h2hRecord,
      tennistonicPrediction: match.prediction,
      players,
      matchupRead: matchupRead(players)
    }
  }

  const output = {
    generatedAt: new Date().toISOString(),
    source: {
      clayContext: inputPath,
      rankings: rankingsPath,
      rankingSource: rankings.source || null,
      rankingAsOf: rankings.asOf || null
    },
    coverage: {
      matches: Object.keys(matches).length,
      missingRankingNames: [...missingRankingNames].filter(Boolean).sort(),
      recentServiceRows,
      flashscoreRecentRows: Object.keys(flashscoreRecentByKey).length
    },
    notes: [
      'Opponent-adjusted form is derived from Tennistonic recent-match scores plus optional local rankings.',
      'Recent-match service stats are joined from Flashscore when the match can be resolved from tournament results pages.'
    ],
    matches
  }

  await fs.mkdir(path.dirname(outputPath), { recursive: true })
  await fs.writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`)
  console.log(`Wrote opponent-adjusted tennis context for ${Object.keys(matches).length} matches to ${outputPath}`)
  console.log(`Missing ranking names: ${output.coverage.missingRankingNames.length}`)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
