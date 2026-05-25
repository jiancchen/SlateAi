import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { loadMlbDayGames } from './lib/load-mlb-day-games.mjs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')

const teamAliasToOfficial = {
  Nationals: 'Washington Nationals',
  Marlins: 'Miami Marlins',
  Athletics: 'Athletics',
  Orioles: 'Baltimore Orioles',
  Rays: 'Tampa Bay Rays',
  'Red Sox': 'Boston Red Sox',
  Rockies: 'Colorado Rockies',
  Phillies: 'Philadelphia Phillies',
  Angels: 'Los Angeles Angels',
  'Blue Jays': 'Toronto Blue Jays',
  Astros: 'Houston Astros',
  Reds: 'Cincinnati Reds',
  Twins: 'Minnesota Twins',
  Guardians: 'Cleveland Guardians',
  Mariners: 'Seattle Mariners',
  'White Sox': 'Chicago White Sox',
  Yankees: 'New York Yankees',
  Brewers: 'Milwaukee Brewers',
  Cubs: 'Chicago Cubs',
  Rangers: 'Texas Rangers',
  Pirates: 'Pittsburgh Pirates',
  Giants: 'San Francisco Giants',
  Braves: 'Atlanta Braves',
  Dodgers: 'Los Angeles Dodgers',
  Cardinals: 'St. Louis Cardinals',
  Padres: 'San Diego Padres',
  Mets: 'New York Mets',
  'D-backs': 'Arizona Diamondbacks',
  Diamondbacks: 'Arizona Diamondbacks',
  Royals: 'Kansas City Royals',
  Tigers: 'Detroit Tigers'
}

const parseArgs = () => {
  const args = process.argv.slice(2)
  const options = {
    startDate: '2026-05-10',
    endDate: '2026-05-25',
    out: path.join(rootDir, 'data-private', 'models', 'mlb-training-corpus-2026-05-10-to-2026-05-25.json')
  }

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index]
    if (arg === '--start-date') options.startDate = args[++index]
    else if (arg === '--end-date') options.endDate = args[++index]
    else if (arg === '--out') options.out = args[++index]
  }

  return options
}

const buildDateSequence = (startDate, endDate) => {
  const dates = []
  const cursor = new Date(`${startDate}T12:00:00Z`)
  const end = new Date(`${endDate}T12:00:00Z`)
  while (cursor <= end) {
    dates.push(cursor.toISOString().slice(0, 10))
    cursor.setUTCDate(cursor.getUTCDate() + 1)
  }
  return dates
}

const extractOddsMarket = (game, label) => {
  const markets = game?.odds?.markets ?? []
  return markets.find((market) => market?.label === label)?.value ?? ''
}

const toOfficialTeam = (value) => teamAliasToOfficial[value] || value || null

const trimStateContext = (stateContext = null) => {
  if (!stateContext) return null
  return {
    teamState: stateContext.teamState ?? null,
    teamMistakeShape: stateContext.teamMistakeShape ?? null,
    lineupConversion: stateContext.lineupConversion ?? null,
    bullpenMistake: stateContext.bullpenMistake ?? null,
    firstInningTeam: stateContext.firstInningTeam ?? null,
    firstInningPitcher: stateContext.firstInningPitcher ?? null,
    firstInningPitcherSeason: stateContext.firstInningPitcherSeason ?? null,
    seriesEarlyPhase: stateContext.seriesEarlyPhase ?? null
  }
}

const trimLineupContext = (lineupContext = null) => {
  if (!lineupContext) return null
  const trimmed = {}
  for (const [team, entry] of Object.entries(lineupContext)) {
    trimmed[team] = entry
      ? {
          averageMatchupGrade: entry.averageMatchupGrade ?? null,
          starterThreatCount: entry.starterThreatCount ?? null,
          contactCount: entry.contactCount ?? null,
          powerCount: entry.powerCount ?? null,
          platoonCount: entry.platoonCount ?? null,
          pitchTypeEdgeCount: entry.pitchTypeEdgeCount ?? null,
          platoonPressureIndex: entry.platoonPressureIndex ?? null,
          pitchTypePressureIndex: entry.pitchTypePressureIndex ?? null,
          bullpenPitchTypePressureIndex: entry.bullpenPitchTypePressureIndex ?? null,
          starterPressureIndex: entry.starterPressureIndex ?? null,
          overallPressureIndex: entry.overallPressureIndex ?? null,
          topThirdScore: entry.topThirdScore ?? null,
          depthScore: entry.depthScore ?? null
        }
      : null
  }
  return trimmed
}

const trimStarterContext = (starterContext = null) => {
  if (!starterContext) return null
  const trimmed = {}
  for (const [role, starter] of Object.entries(starterContext)) {
    trimmed[role] = starter
      ? {
          fullName: starter.fullName ?? null,
          pitchHand: starter.pitchHand ?? null,
          wins: starter.wins ?? null,
          losses: starter.losses ?? null,
          era: starter.era ?? null,
          strikeOuts: starter.strikeOuts ?? null,
          inningsPitched: starter.inningsPitched ?? null,
          whip: starter.whip ?? null,
          walks: starter.walks ?? null,
          hitsAllowed: starter.hitsAllowed ?? null,
          homeRunsAllowed: starter.homeRunsAllowed ?? null
        }
      : null
  }
  return trimmed
}

const trimParticipant = (participant = null) =>
  participant
    ? {
        role: participant.role ?? null,
        name: participant.name ?? null,
        americanOdds: participant.americanOdds ?? null,
        impliedProbability: participant.impliedProbability ?? null
      }
    : null

const buildGameRecord = (date, game) => ({
  date,
  id: game.id,
  gamePk: Number.isFinite(Number(game.gamePk)) ? Number(game.gamePk) : null,
  title: game.title,
  start: game.start,
  startMinutes: game.startMinutes,
  homeTeam: toOfficialTeam(game.teamContext?.home?.team ?? game.matchup?.[1]?.name ?? null),
  awayTeam: toOfficialTeam(game.teamContext?.away?.team ?? game.matchup?.[0]?.name ?? null),
  moneylineMarket: game.moneyline ?? null,
  spreadMarket: extractOddsMarket(game, 'Spread'),
  totalMarket: extractOddsMarket(game, 'Total'),
  analysis: game.analysis
    ? {
        lean: game.analysis.lean ?? null,
        participantName: game.analysis.participant?.name ?? null,
        participantRole: game.analysis.participant?.role ?? null,
        opponentName: game.analysis.opponent?.name ?? null,
        opponentRole: game.analysis.opponent?.role ?? null,
        confidence: game.analysis.confidence ?? null,
        volatility: game.analysis.volatility ?? null,
        recommendationScore: game.analysis.recommendationScore ?? null,
        tier: game.analysis.tier ?? null,
        modelEdge: game.analysis.modelEdge ?? null,
        marketProbability: game.analysis.marketProbability ?? null,
        pickReasons: game.analysis.pickReasons ?? [],
        indicators: game.analysis.indicators ?? {},
        mlbProjection: game.analysis.mlbProjection ?? null
      }
    : null,
  participants: Array.isArray(game.participants) ? game.participants.map(trimParticipant) : [],
  teamContext: game.teamContext ?? null,
  offenseContext: game.offenseContext ?? null,
  bullpenContext: game.bullpenContext ?? null,
  bullpenChainContext: game.bullpenChainContext ?? null,
  savantContext: game.savantContext ?? null,
  storyContext: game.storyContext ?? null,
  parkContext: game.parkContext ?? null,
  stateContext: trimStateContext(game.stateContext),
  lineupContext: trimLineupContext(game.lineupContext),
  starterContext: trimStarterContext(game.starterContext)
})

const main = async () => {
  const options = parseArgs()
  const dates = buildDateSequence(options.startDate, options.endDate)
  const rows = []

  for (const date of dates) {
    let games
    try {
      games = await loadMlbDayGames(date)
    } catch (error) {
      console.warn(`Skipping ${date}: ${error.message}`)
      continue
    }

    for (const game of games) {
      if (game?.league !== 'MLB') continue
      rows.push(buildGameRecord(date, game))
    }
  }

  await mkdir(path.dirname(options.out), { recursive: true })
  await writeFile(
    options.out,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        startDate: options.startDate,
        endDate: options.endDate,
        games: rows
      },
      null,
      2
    ),
    'utf8'
  )

  console.log(`Saved ${rows.length} MLB training rows to ${options.out}`)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
