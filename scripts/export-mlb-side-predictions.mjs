import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { games as may10 } from '../src/lib/day-2026-05-10.js'
import { games as may11 } from '../src/lib/day-2026-05-11.js'
import { games as may12 } from '../src/lib/day-2026-05-12.js'
import { games as may13 } from '../src/lib/day-2026-05-13.js'
import { games as may14 } from '../src/lib/day-2026-05-14.js'
import { games as may15 } from '../src/lib/day-2026-05-15.js'
import { games as may16 } from '../src/lib/day-2026-05-16.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')

const slates = {
  '2026-05-10': may10,
  '2026-05-11': may11,
  '2026-05-12': may12,
  '2026-05-13': may13,
  '2026-05-14': may14,
  '2026-05-15': may15,
  '2026-05-16': may16
}

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

const clamp = (value, min, max) => Math.min(max, Math.max(min, value))

const parseBaseballInnings = (value = 0) => {
  const stringValue = `${value}`.trim()
  const match = stringValue.match(/^(\d+)(?:\.(\d))?$/)

  if (!match) return Number(stringValue) || 0

  const wholeInnings = Number(match[1])
  const partialOuts = Number(match[2] || 0)

  return wholeInnings + (partialOuts === 1 ? 1 / 3 : partialOuts === 2 ? 2 / 3 : 0)
}

const normalizePitchHand = (value = '') => {
  const normalized = `${value}`.trim().toUpperCase()

  if (normalized.startsWith('L')) return 'L'
  if (normalized.startsWith('R')) return 'R'

  return ''
}

const classifyPitcherType = (starter = {}) => {
  const innings = Number(starter.inningsFloat)
  const kPerNine = Number(starter.kPerNine)
  const bbPerNine = Number(starter.bbPerNine)
  const hitsPerNine = Number(starter.hitsPerNine)
  const era = Number(starter.era)
  const whip = Number(starter.whip)

  if (!Number.isFinite(innings) || innings < 18 || !Number.isFinite(era)) return 'Unknown sample'
  if (Number.isFinite(kPerNine) && kPerNine >= 10.2 && Number.isFinite(whip) && whip <= 1.18 && era <= 3.8) return 'Power'
  if (Number.isFinite(kPerNine) && kPerNine >= 9.6 && ((Number.isFinite(bbPerNine) && bbPerNine >= 3.4) || (Number.isFinite(whip) && whip >= 1.28))) return 'Volatile bat-misser'
  if (Number.isFinite(hitsPerNine) && hitsPerNine <= 7.3 && Number.isFinite(whip) && whip <= 1.18) return 'Contact suppressor'
  if (Number.isFinite(kPerNine) && kPerNine <= 7.1 && Number.isFinite(whip) && whip <= 1.22 && era <= 4.1) return 'Craft'
  if ((Number.isFinite(hitsPerNine) && hitsPerNine >= 9.3) || (Number.isFinite(whip) && whip >= 1.4)) return 'Traffic-risk'
  if (Number.isFinite(bbPerNine) && bbPerNine <= 2.2 && Number.isFinite(kPerNine) && kPerNine >= 7.1) return 'Strike-throwing'
  return 'Balanced'
}

const buildStarterProfile = (starterContext = null) => {
  if (!starterContext) return null

  const handedness = normalizePitchHand(starterContext?.pitchHand)
  const strikeouts = Number(starterContext?.strikeOuts ?? starterContext?.strikeouts ?? 0)
  const wins = Number(starterContext?.wins ?? 0)
  const losses = Number(starterContext?.losses ?? 0)
  const decisions = wins + losses
  const eraValue = Number(starterContext?.era)
  const era = Number.isFinite(eraValue) ? eraValue : null
  const inningsFloat = parseBaseballInnings(starterContext?.inningsPitched ?? 0)
  const whipValue = Number(starterContext?.whip)
  const whip = Number.isFinite(whipValue) && whipValue > 0 ? whipValue : null
  const walks = Number(starterContext?.walks)
  const hitsAllowed = Number(starterContext?.hitsAllowed)
  const homeRunsAllowed = Number(starterContext?.homeRunsAllowed)
  const gamesStarted = Number(starterContext?.gamesStarted)
  const kPerNine = inningsFloat > 0 ? (strikeouts / inningsFloat) * 9 : null
  const bbPerNine = inningsFloat > 0 && Number.isFinite(walks) ? (walks / inningsFloat) * 9 : null
  const hitsPerNine = inningsFloat > 0 && Number.isFinite(hitsAllowed) ? (hitsAllowed / inningsFloat) * 9 : null
  const starter = {
    name: starterContext?.fullName || '',
    handedness,
    wins,
    losses,
    decisions,
    winPct: decisions > 0 ? wins / decisions : 0.5,
    era,
    strikeouts,
    inningsFloat,
    walks: Number.isFinite(walks) ? walks : null,
    hitsAllowed: Number.isFinite(hitsAllowed) ? hitsAllowed : null,
    homeRunsAllowed: Number.isFinite(homeRunsAllowed) ? homeRunsAllowed : null,
    whip,
    gamesStarted: Number.isFinite(gamesStarted) ? gamesStarted : null,
    kPerNine,
    bbPerNine,
    hitsPerNine
  }

  return {
    ...starter,
    profileType: classifyPitcherType(starter)
  }
}

const pitcherRecordScore = (pitcher) =>
  clamp(28 + pitcher.winPct * 46 + Math.min(pitcher.decisions, 6) * 2, 24, 86)
const pitcherEraScore = (pitcher) =>
  Number.isFinite(pitcher.era) ? clamp(92 - pitcher.era * 9, 18, 90) : 50
const pitcherStrikeoutScore = (pitcher) => clamp(34 + pitcher.strikeouts * 1.08, 24, 88)
const starterScore = (pitcher) =>
  pitcherRecordScore(pitcher) * 0.28 +
  pitcherEraScore(pitcher) * 0.44 +
  pitcherStrikeoutScore(pitcher) * 0.28

const buildBullpenScore = (profile = {}) => {
  const era = Number(profile.era)
  const whip = Number(profile.whip)
  const strikeouts = Number(profile.strikeouts)
  const walks = Number(profile.walks)

  if (![era, whip, strikeouts, walks].every(Number.isFinite)) return null

  const eraScore = clamp(96 - era * 11, 18, 92)
  const whipScore = clamp(114 - whip * 35, 20, 92)
  const ratioScore = clamp(28 + (strikeouts / Math.max(walks, 1)) * 18, 22, 88)

  return eraScore * 0.46 + whipScore * 0.34 + ratioScore * 0.2
}

const parseArgs = () => {
  const args = process.argv.slice(2)
  const options = {
    startDate: '2026-05-10',
    endDate: '2026-05-15',
    out: path.join(rootDir, 'data', 'predictions', 'mlb-sides', '2026-05-10-to-2026-05-15-board-v2.json'),
    modelName: 'board-moneyline-v2'
  }

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index]
    if (arg === '--start-date') options.startDate = args[++index]
    else if (arg === '--end-date') options.endDate = args[++index]
    else if (arg === '--out') options.out = args[++index]
    else if (arg === '--model-name') options.modelName = args[++index]
  }

  return options
}

const datesInRange = (startDate, endDate) =>
  Object.keys(slates).filter((date) => date >= startDate && date <= endDate).sort()

const toOfficialTeam = (name) => teamAliasToOfficial[name] || name

const buildIndicators = (game, predictedSide) => {
  const analysisIndicators = game.analysis?.indicators || {}
  const awayStarter = buildStarterProfile(game.starterContext?.away)
  const homeStarter = buildStarterProfile(game.starterContext?.home)
  const awayBullpenScore = buildBullpenScore(game.bullpenContext?.away)
  const homeBullpenScore = buildBullpenScore(game.bullpenContext?.home)
  const predictedIsAway = predictedSide === 'away'
  const pickStarterScore = predictedIsAway ? (awayStarter ? starterScore(awayStarter) : null) : (homeStarter ? starterScore(homeStarter) : null)
  const oppStarterScore = predictedIsAway ? (homeStarter ? starterScore(homeStarter) : null) : (awayStarter ? starterScore(awayStarter) : null)
  const pickBullpenScore = predictedIsAway ? awayBullpenScore : homeBullpenScore
  const oppBullpenScore = predictedIsAway ? homeBullpenScore : awayBullpenScore
  const pickProjectedHitEdge =
    game.analysis?.mlbProjection?.edgeTeam === game.analysis?.participant?.name
      ? Number(game.analysis?.mlbProjection?.edgeHits || 0)
      : game.analysis?.mlbProjection?.edgeTeam
        ? -Number(game.analysis?.mlbProjection?.edgeHits || 0)
        : null

  const computedStarterLeverageIndex = clamp(
    50 +
      (Number.isFinite(pickStarterScore) && Number.isFinite(oppStarterScore)
        ? (pickStarterScore - oppStarterScore) * 1.1
        : 0) +
      (Number.isFinite(pickProjectedHitEdge) ? pickProjectedHitEdge * 6 : 0),
    0,
    100
  )

  const computedLateInningStabilityIndex = clamp(
    50 +
      (Number.isFinite(pickBullpenScore) && Number.isFinite(oppBullpenScore)
        ? (pickBullpenScore - oppBullpenScore) * 1.25
        : 0) -
      Math.max(Number(game.analysis?.volatility || 0) - 70, 0) * 0.6,
    0,
    100
  )

  const computedReliefPitchingRisk = clamp(
    35 +
      Math.max(
        Number.isFinite(oppBullpenScore) && Number.isFinite(pickBullpenScore)
          ? oppBullpenScore - pickBullpenScore
          : 0,
        0
      ) *
        1.8 +
      (Number.isFinite(pickProjectedHitEdge) && pickProjectedHitEdge < 0 ? Math.abs(pickProjectedHitEdge) * 9 : 0) +
      Math.max(5 - Number(game.analysis?.modelEdge || 0), 0) * 4 +
      Math.max(Number(game.analysis?.volatility || 0) - 78, 0) * 0.7,
    0,
    100
  )

  const computedCoinflipPressure = clamp(
    Math.max(5 - Number(game.analysis?.modelEdge || 0), 0) * 10 +
      Math.max(Number(game.analysis?.volatility || 0) - 70, 0) * 1.25 +
      (Number.isFinite(pickProjectedHitEdge) && pickProjectedHitEdge < 0 ? 10 : 0),
    0,
    100
  )

  const starterLeverageIndex = Number.isFinite(analysisIndicators.starterLeverageIndex)
    ? analysisIndicators.starterLeverageIndex
    : computedStarterLeverageIndex
  const lateInningStabilityIndex = Number.isFinite(analysisIndicators.lateInningStabilityIndex)
    ? analysisIndicators.lateInningStabilityIndex
    : computedLateInningStabilityIndex
  const reliefPitchingRisk = Number.isFinite(analysisIndicators.reliefPitchingRisk)
    ? analysisIndicators.reliefPitchingRisk
    : computedReliefPitchingRisk
  const coinflipPressure = Number.isFinite(analysisIndicators.coinflipPressure)
    ? analysisIndicators.coinflipPressure
    : computedCoinflipPressure

  return {
    starterLeverageIndex: Number(starterLeverageIndex.toFixed(1)),
    lateInningStabilityIndex: Number(lateInningStabilityIndex.toFixed(1)),
    reliefPitchingRisk: Number(reliefPitchingRisk.toFixed(1)),
    coinflipPressure: Number(coinflipPressure.toFixed(1)),
    pickBullpenScore: Number.isFinite(pickBullpenScore) ? Number(pickBullpenScore.toFixed(1)) : null,
    oppBullpenScore: Number.isFinite(oppBullpenScore) ? Number(oppBullpenScore.toFixed(1)) : null,
    pickStarterScore: Number.isFinite(pickStarterScore) ? Number(pickStarterScore.toFixed(1)) : null,
    oppStarterScore: Number.isFinite(oppStarterScore) ? Number(oppStarterScore.toFixed(1)) : null,
    projectedHitEdgeForPick: Number.isFinite(pickProjectedHitEdge) ? Number(pickProjectedHitEdge.toFixed(1)) : null,
    hitEdgeAgainstPick: Number.isFinite(pickProjectedHitEdge) ? pickProjectedHitEdge < -0.2 : false
  }
}

const exportPredictions = ({ startDate, endDate, out, modelName }) => {
  const picks = []

  for (const date of datesInRange(startDate, endDate)) {
    for (const game of slates[date].filter((entry) => entry.league === 'MLB' && entry.analysis?.participant?.name)) {
      const predictedTeam = game.analysis.participant.name
      const predictedSide = predictedTeam === game.participants[0].name ? 'away' : 'home'
      const indicators = buildIndicators(game, predictedSide)

      picks.push({
        predictionDate: date,
        modelName,
        gameId: game.id,
        gameTitle: game.title,
        awayTeam: toOfficialTeam(game.participants[0].name),
        homeTeam: toOfficialTeam(game.participants[1].name),
        predictedTeam: toOfficialTeam(predictedTeam),
        predictedSide,
        confidence: game.analysis.confidence,
        volatility: game.analysis.volatility,
        modelEdge: game.analysis.modelEdge,
        sourceLabel: game.analysis.sourceLabel,
        inputLabels: (game.analysis.inputs || []).map((input) => input.label),
        projection: game.analysis.mlbProjection || null,
        indicators
      })
    }
  }

  return {
    modelName,
    generatedAt: new Date().toISOString(),
    startDate,
    endDate,
    picks
  }
}

const main = async () => {
  const options = parseArgs()
  const payload = exportPredictions(options)
  await mkdir(path.dirname(options.out), { recursive: true })
  await writeFile(options.out, JSON.stringify(payload, null, 2))
  console.log(`Saved ${payload.picks.length} MLB side predictions to ${options.out}`)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
