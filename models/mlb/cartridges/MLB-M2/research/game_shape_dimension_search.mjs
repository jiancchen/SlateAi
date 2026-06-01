import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

import { createSportsMatchModel } from '../lib/sports-model.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..', '..', '..', '..', '..')

const shortNames = {
  'Arizona Diamondbacks': 'Diamondbacks',
  Athletics: 'Athletics',
  'Atlanta Braves': 'Braves',
  'Baltimore Orioles': 'Orioles',
  'Boston Red Sox': 'Red Sox',
  'Chicago Cubs': 'Cubs',
  'Chicago White Sox': 'White Sox',
  'Cincinnati Reds': 'Reds',
  'Cleveland Guardians': 'Guardians',
  'Colorado Rockies': 'Rockies',
  'Detroit Tigers': 'Tigers',
  'Houston Astros': 'Astros',
  'Kansas City Royals': 'Royals',
  'Los Angeles Angels': 'Angels',
  'Los Angeles Dodgers': 'Dodgers',
  'Miami Marlins': 'Marlins',
  'Milwaukee Brewers': 'Brewers',
  'Minnesota Twins': 'Twins',
  'New York Mets': 'Mets',
  'New York Yankees': 'Yankees',
  'Philadelphia Phillies': 'Phillies',
  'Pittsburgh Pirates': 'Pirates',
  'San Diego Padres': 'Padres',
  'San Francisco Giants': 'Giants',
  'Seattle Mariners': 'Mariners',
  'St. Louis Cardinals': 'Cardinals',
  'Tampa Bay Rays': 'Rays',
  'Texas Rangers': 'Rangers',
  'Toronto Blue Jays': 'Blue Jays',
  'Washington Nationals': 'Nationals'
}

const teamDimensions = [
  'pitcherCollapseRisk',
  'starterEarlyCrack',
  'pitcherCommandLeak',
  'batterFireRate',
  'trafficPressure',
  'conversionVolatility',
  'deadBatRisk',
  'defensiveRunLeak',
  'bridgeLeak',
  'carryBoost',
  'mentalityPressure',
  'marketTension'
]

const gameDimensions = [
  'starterPairCollapse',
  'earlyJolt',
  'trafficFork',
  'powerWeatherTail',
  'bridgeChaos',
  'deadZone',
  'asymmetry',
  'marketRealityGap'
]

const dimensionDefinitions = {
  pitcherCollapseRisk: 'Opponent starter season/recent collapse risk: ERA, WHIP, walks, HRs, recent runs, short starts, leash.',
  starterEarlyCrack: 'Opponent starter first-cycle crack risk: first-batter reach, first-inning runs/walks, early baserunners.',
  pitcherCommandLeak: 'Opponent starter traffic leak: WHIP, walks, recent walks/hits, first-batter reach, leash.',
  batterFireRate: 'Team top-order heat and contact fire: top-six heat, xwOBA trend, hard-hit/sweet-spot trend, barrel/xwOBA context.',
  trafficPressure: 'Team baserunner pressure: total/early baserunners, top-order baserunners, walks, conversion, first-inning scoring.',
  conversionVolatility: 'Whether traffic can swing wildly: conversion volatility, runs per baserunner, stranded traffic, no-conversion pockets.',
  deadBatRisk: 'Dead-offense shape: quiet F5, scoreless first three, dead traffic, no-conversion, cold/whiff/strikeout profile.',
  defensiveRunLeak: 'Opponent run-prevention leak: one-bad-inning, early multi-run allowed, mistake chaos, run clustering, stranded traffic.',
  bridgeLeak: 'Opponent bullpen/bridge leak: bullpen chaos, meltdowns, first-batter reach, inherited scoring, HR appearances, command risk.',
  carryBoost: 'Contact carry help: weather/run boost, park, sun visibility, barrel/hard-hit context.',
  mentalityPressure: 'State pressure: snapback, form pressure, heat regression, recent losses, streak context, pressure hitter.',
  marketTension: 'Model/market stress: volatility, reality gap, market contradiction, edge/confidence tension, totals vetoes.',
  starterPairCollapse: 'Game-level max of either offense seeing a collapse-prone starter.',
  earlyJolt: 'Game-level first-cycle jolt risk from starter early crack plus traffic pressure.',
  trafficFork: 'Game-level fork where traffic pressure and dead-bat risk coexist.',
  powerWeatherTail: 'Game-level power/contact/carry tail from batter fire and carry boost.',
  bridgeChaos: 'Game-level bridge and bullpen volatility.',
  deadZone: 'Game-level dead-zone risk from the higher team dead-bat vector.',
  asymmetry: 'Largest team-vector gap between the two sides.',
  marketRealityGap: 'Game-level model-reality tension from market tension and M2 reality gap.'
}

const toShortName = (name) => shortNames[name] || name
const normalizeName = (value = '') =>
  String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')

const round = (value, places = 1) => {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return null
  const factor = 10 ** places
  return Math.round(numeric * factor) / factor
}

const numberOrNull = (value) => {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : null
}

const clamp = (value, min = 0, max = 100) => Math.max(min, Math.min(max, value))

const scale = (value, low, high, fallback = 50) => {
  const numeric = numberOrNull(value)
  if (!Number.isFinite(numeric)) return fallback
  if (high === low) return fallback
  return clamp(((numeric - low) / (high - low)) * 100)
}

const inverseScale = (value, low, high, fallback = 50) => clamp(100 - scale(value, low, high, fallback))

const pctScore = (value, fallback = 50) => {
  const numeric = numberOrNull(value)
  return Number.isFinite(numeric) ? clamp(numeric * 100) : fallback
}

const avg = (values) => {
  const clean = values.map(Number).filter(Number.isFinite)
  return clean.length ? clean.reduce((sum, value) => sum + value, 0) / clean.length : null
}

const rate = (hits, rows) => (rows ? hits / rows : null)
const pct = (value) => (Number.isFinite(value) ? `${(value * 100).toFixed(1)}%` : 'N/A')

const baseballIp = (value) => {
  if (value == null) return null
  const text = String(value)
  if (!text.includes('.')) {
    const numeric = Number(text)
    return Number.isFinite(numeric) ? numeric : null
  }
  const [inningsText, outsText] = text.split('.')
  const innings = Number(inningsText)
  const outs = Number(outsText)
  if (!Number.isFinite(innings) || !Number.isFinite(outs)) return null
  return innings + Math.min(outs, 2) / 3
}

const per9 = (count, innings, fallback = null) => {
  const numeric = Number(count)
  const ip = baseballIp(innings)
  if (!Number.isFinite(numeric) || !Number.isFinite(ip) || ip <= 0) return fallback
  return (numeric / ip) * 9
}

const weighted = (parts) => {
  const clean = parts.filter((part) => Number.isFinite(part.value) && Number.isFinite(part.weight) && part.weight > 0)
  const totalWeight = clean.reduce((sum, part) => sum + part.weight, 0)
  if (!totalWeight) return 50
  return clamp(clean.reduce((sum, part) => sum + part.value * part.weight, 0) / totalWeight)
}

const parseArgs = () => {
  const options = {
    start: '2026-05-10',
    end: '2026-05-31'
  }
  const args = process.argv.slice(2)
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index]
    if (arg === '--start') options.start = args[++index]
    else if (arg === '--end') options.end = args[++index]
  }
  return options
}

const sqliteJson = (sql) => {
  const dbPath = path.join(rootDir, 'data-private', 'warehouse', 'sports.db')
  const text = execFileSync('sqlite3', ['-json', dbPath, sql], {
    cwd: rootDir,
    encoding: 'utf8',
    maxBuffer: 1024 * 1024 * 50
  })
  return JSON.parse(text || '[]')
}

const loadOutcomes = ({ start, end }) => {
  const rows = sqliteJson(`
    SELECT
      game_pk AS gamePk,
      game_date AS gameDate,
      away_team AS awayTeam,
      home_team AS homeTeam,
      away_runs_final AS awayRunsFinal,
      home_runs_final AS homeRunsFinal,
      away_runs_first5 AS awayRunsFirst5,
      home_runs_first5 AS homeRunsFirst5,
      total_runs_first5 AS totalRunsFirst5,
      total_runs_final AS totalRunsFinal
    FROM mlb_game_outcomes
    WHERE game_date BETWEEN '${start}' AND '${end}'
  `)
  return new Map(rows.map((row) => [String(row.gamePk), row]))
}

const listSlateFiles = ({ start, end }) => {
  const slateRoot = path.join(rootDir, 'published-data', 'slates')
  return fs
    .readdirSync(slateRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name >= start && entry.name <= end)
    .flatMap((entry) => {
      const gamesDir = path.join(slateRoot, entry.name, 'games')
      if (!fs.existsSync(gamesDir)) return []
      return fs
        .readdirSync(gamesDir)
        .filter((file) => file.endsWith('.json') && !file.startsWith('rg-'))
        .map((file) => path.join(gamesDir, file))
    })
    .sort()
}

const sideOutcome = ({ profileTeam, outcome }) => {
  const awayShort = toShortName(outcome.awayTeam)
  const homeShort = toShortName(outcome.homeTeam)
  const profile = normalizeName(profileTeam)
  const away = normalizeName(awayShort)
  const home = normalizeName(homeShort)
  const isAway = profile === away || away.includes(profile) || profile.includes(away)
  const isHome = profile === home || home.includes(profile) || profile.includes(home)
  if (!isAway && !isHome) return null
  const side = isAway ? 'away' : 'home'
  const opponentSide = isAway ? 'home' : 'away'
  const opponent = isAway ? homeShort : awayShort
  const runsFirst5 = Number(isAway ? outcome.awayRunsFirst5 : outcome.homeRunsFirst5)
  const runsFinal = Number(isAway ? outcome.awayRunsFinal : outcome.homeRunsFinal)
  const oppRunsFirst5 = Number(isAway ? outcome.homeRunsFirst5 : outcome.awayRunsFirst5)
  const oppRunsFinal = Number(isAway ? outcome.homeRunsFinal : outcome.awayRunsFinal)
  return {
    side,
    opponentSide,
    opponent,
    runsFirst5,
    runsFinal,
    oppRunsFirst5,
    oppRunsFinal,
    first5Win: runsFirst5 > oppRunsFirst5,
    finalWin: runsFinal > oppRunsFinal,
    lateRuns: runsFinal - runsFirst5,
    first5Explosion: runsFirst5 >= 5,
    first5Scored: runsFirst5 >= 3,
    first5Dead: runsFirst5 <= 1,
    lateExplosion: runsFinal - runsFirst5 >= 3
  }
}

const recentStarterStats = (starter = {}) => {
  const starts = Array.isArray(starter.startHistoryLast5) ? starter.startHistoryLast5 : []
  return {
    starts: starts.length,
    avgRunsAllowed: avg(starts.map((start) => start.runsAllowed)),
    avgWalks: avg(starts.map((start) => start.walksAllowed)),
    avgHits: avg(starts.map((start) => start.hitsAllowed)),
    avgHomeRuns: avg(starts.map((start) => start.homeRunsAllowed)),
    avgIp: avg(starts.map((start) => start.inningsPitched)),
    shortStartRate: rate(starts.filter((start) => Number(start.inningsPitched) < 5).length, starts.length),
    firstInningRunAllowedRate: rate(starts.filter((start) => Number(start.firstInningRunsAllowed) > 0).length, starts.length),
    qualityStartRate: rate(starts.filter((start) => Boolean(start.qualityStart)).length, starts.length)
  }
}

const pitcherCollapseRisk = (starter = {}) => {
  const recent = recentStarterStats(starter)
  const usage = starter.usageContext || {}
  return weighted([
    { value: scale(starter.era, 2.6, 7.2), weight: 0.16 },
    { value: scale(starter.whip, 1.02, 1.78), weight: 0.15 },
    { value: scale(per9(starter.walks, starter.inningsPitched), 2.0, 5.0), weight: 0.11 },
    { value: scale(per9(starter.homeRunsAllowed, starter.inningsPitched), 0.6, 2.1), weight: 0.1 },
    { value: scale(recent.avgRunsAllowed, 1.2, 5.2), weight: 0.16 },
    { value: scale(recent.shortStartRate, 0.05, 0.55), weight: 0.1 },
    { value: scale(recent.qualityStartRate, 0.15, 0.7, 45), weight: -0.08 },
    { value: pctScore(usage.shortLeashRisk, 25), weight: 0.08 },
    { value: inverseScale(usage.expectedInnings, 4.2, 6.3), weight: 0.1 }
  ])
}

const starterEarlyCrack = (starter = {}, firstInningPitcher = {}) => {
  const recent = recentStarterStats(starter)
  return weighted([
    { value: pctScore(firstInningPitcher.firstBatterReachRate, 30), weight: 0.17 },
    { value: pctScore(firstInningPitcher.firstInningRunAllowedRate, 24), weight: 0.18 },
    { value: pctScore(firstInningPitcher.firstInningWalkRate, 12), weight: 0.11 },
    { value: pctScore(firstInningPitcher.firstInningMultiRunAllowedRate, 10), weight: 0.1 },
    { value: scale(firstInningPitcher.firstInningBaserunnersPerStart, 0.4, 1.8), weight: 0.11 },
    { value: scale(firstInningPitcher.firstInningPressureIndex, 20, 88), weight: 0.18 },
    { value: pctScore(recent.firstInningRunAllowedRate, 20), weight: 0.15 }
  ])
}

const pitcherCommandLeak = (starter = {}, firstInningPitcher = {}) => {
  const recent = recentStarterStats(starter)
  return weighted([
    { value: scale(starter.whip, 1.0, 1.8), weight: 0.2 },
    { value: scale(per9(starter.walks, starter.inningsPitched), 1.8, 5.1), weight: 0.2 },
    { value: scale(recent.avgWalks, 0.8, 3.5), weight: 0.14 },
    { value: scale(recent.avgHits, 3.5, 7.5), weight: 0.13 },
    { value: pctScore(firstInningPitcher.firstBatterReachRate, 25), weight: 0.13 },
    { value: pctScore(firstInningPitcher.firstInningWalkRate, 10), weight: 0.1 },
    { value: pctScore(starter.usageContext?.shortLeashRisk, 20), weight: 0.1 }
  ])
}

const teamVector = ({ game, model, side, opponentSide }) => {
  const teamState = game.stateContext?.teamState?.[side] || {}
  const hitter = game.stateContext?.hitterState?.[side] || {}
  const mistake = game.stateContext?.teamMistakeShape?.[side] || {}
  const oppMistake = game.stateContext?.teamMistakeShape?.[opponentSide] || {}
  const lineup = game.stateContext?.lineupConversion?.[side] || {}
  const firstInningTeam = game.stateContext?.firstInningTeam?.[side] || {}
  const firstInningPitcherAgainst = game.stateContext?.firstInningPitcher?.[opponentSide] || {}
  const starterAgainst = game.starterContext?.[opponentSide] || {}
  const opponentBullpen = game.stateContext?.bullpenMistake?.[opponentSide] || {}
  const opponentBullpenContext = game.bullpenContext?.[opponentSide] || {}
  const opponentRelieverCommand = game.tierThreeContext?.bullpenCommand?.[opponentSide] || {}
  const savant = game.savantContext?.[side] || {}
  const projection = model.analysis?.mlbProjection || {}
  const totals = projection.totals || {}
  const weather = projection.weather || {}
  const sunVisibility = projection.sunVisibility || game.stateContext?.sunVisibility || {}
  const radarProfile = model.analysis?.gameShape?.radar?.profiles?.find((profile) => profile.role === (side === (model.analysis?.participant?.role || '').toLowerCase() ? 'pick' : 'opponent'))
  const radarScores = radarProfile?.scores || {}
  const collapse = pitcherCollapseRisk(starterAgainst)
  const earlyCrack = starterEarlyCrack(starterAgainst, firstInningPitcherAgainst)
  const commandLeak = pitcherCommandLeak(starterAgainst, firstInningPitcherAgainst)

  const batterFireRate = weighted([
    { value: scale(hitter.top6HeatIndex, 24, 72), weight: 0.16 },
    { value: scale(hitter.hottestHitter?.heatRegressionIndex, 35, 88), weight: 0.13 },
    { value: scale(hitter.top6Rolling7Xwoba, 0.285, 0.43), weight: 0.12 },
    { value: scale(Number(hitter.top6Rolling7Xwoba) - Number(hitter.top6Rolling30Xwoba), -0.04, 0.08), weight: 0.13 },
    { value: scale(hitter.top6XwobaTrend, -0.04, 0.08), weight: 0.1 },
    { value: scale(hitter.top6HardHitTrend, -6, 8), weight: 0.09 },
    { value: scale(hitter.top6SweetSpotTrend, -6, 12), weight: 0.08 },
    { value: scale(savant.barrelPct, 4, 10), weight: 0.09 },
    { value: scale(savant.xwoba, 0.285, 0.36), weight: 0.1 }
  ])

  const trafficPressure = weighted([
    { value: scale(lineup.baserunnersPerGame, 9, 16), weight: 0.17 },
    { value: scale(lineup.earlyBaserunnersPerGame, 2.4, 5.6), weight: 0.16 },
    { value: scale(lineup.topOrderBaserunnersFirst3PerGame, 1.2, 3.2), weight: 0.14 },
    { value: scale(lineup.lineupConversionIndex, 12, 68), weight: 0.14 },
    { value: scale(hitter.top6WalkRate, 0.05, 0.17), weight: 0.11 },
    { value: scale(firstInningTeam.firstInningScoringIndex, 25, 100), weight: 0.14 },
    { value: scale(radarScores.pressure, 25, 75), weight: 0.14 }
  ])

  const conversionVolatility = weighted([
    { value: scale(lineup.conversionVolatility, 0.06, 0.22), weight: 0.18 },
    { value: scale(lineup.runsPerBaserunner, 0.18, 0.45), weight: 0.16 },
    { value: scale(lineup.topOrderConversionShare, 0.38, 0.88), weight: 0.13 },
    { value: pctScore(lineup.trafficNoConversionRate, 12), weight: 0.12 },
    { value: scale(lineup.strandedTrafficRate, 0.75, 1.45), weight: 0.14 },
    { value: pctScore(mistake.trafficGameRate, 50), weight: 0.12 },
    { value: scale(Math.abs(Number(lineup.lineupConversionIndex || 35) - 38), 0, 30), weight: 0.15 }
  ])

  const deadBatRisk = weighted([
    { value: pctScore(lineup.quietFirst5Rate, 35), weight: 0.18 },
    { value: pctScore(mistake.scorelessFirst3Rate, 35), weight: 0.15 },
    { value: pctScore(lineup.deadBatTrafficRate, 26), weight: 0.16 },
    { value: pctScore(lineup.trafficNoConversionRate, 12), weight: 0.12 },
    { value: scale(hitter.top6ColdIndex, 30, 75), weight: 0.11 },
    { value: scale(hitter.top6StrikeoutRate, 0.12, 0.3), weight: 0.09 },
    { value: scale(hitter.top6WhiffRate, 0.06, 0.18), weight: 0.08 },
    { value: inverseScale(hitter.top6XwobaTrend, -0.04, 0.08), weight: 0.11 }
  ])

  const defensiveRunLeak = weighted([
    { value: pctScore(oppMistake.oneBadInningAllowedRate, 25), weight: 0.2 },
    { value: pctScore(oppMistake.earlyMultiRunAllowedRate, 24), weight: 0.16 },
    { value: pctScore(oppMistake.firstInningRunAllowedRate, 25), weight: 0.12 },
    { value: scale(oppMistake.mistakeChaosIndex, 35, 76), weight: 0.16 },
    { value: scale(oppMistake.runClusteringIndex, 35, 82), weight: 0.13 },
    { value: pctScore(oppMistake.bullpenMeltdownRate, 14), weight: 0.12 },
    { value: scale(oppMistake.strandedTrafficRate, 0.8, 1.45), weight: 0.11 }
  ])

  const bridgeLeak = weighted([
    { value: scale(opponentBullpen.bullpenChaosIndex, 30, 70), weight: 0.18 },
    { value: pctScore(opponentBullpen.bullpenMeltdownGameRate, 16), weight: 0.15 },
    { value: pctScore(opponentBullpen.firstBatterReachRate, 23), weight: 0.12 },
    { value: pctScore(opponentBullpen.inheritedTrafficScoreRate, 42), weight: 0.12 },
    { value: pctScore(opponentBullpen.homeRunAppearanceRate, 8), weight: 0.1 },
    { value: scale(opponentBullpenContext.era, 3.0, 5.4), weight: 0.12 },
    { value: scale(opponentBullpenContext.whip, 1.1, 1.55), weight: 0.11 },
    { value: scale(opponentRelieverCommand.commandRiskIndex, 20, 58), weight: 0.1 }
  ])

  const carryBoost = weighted([
    { value: weather.hitBoostFirst5 ? clamp(Number(weather.hitBoostFirst5) * 520) : 45, weight: 0.12 },
    { value: weather.runBoostFirst5 ? clamp(Number(weather.runBoostFirst5) * 6500) : 45, weight: 0.1 },
    { value: /carry|wind out/i.test(weather.label || '') ? 76 : 42, weight: 0.14 },
    { value: scale(sunVisibility.visibilityRiskScore, 20, 58), weight: 0.1 },
    { value: scale(game.parkContext?.indexHr, 90, 115), weight: 0.1 },
    { value: scale(game.parkContext?.indexRuns, 92, 112), weight: 0.08 },
    { value: scale(savant.barrelPct, 4, 10), weight: 0.12 },
    { value: scale(savant.hardHitPct, 34, 45), weight: 0.12 },
    { value: scale(hitter.top6HardHitTrend, -6, 8), weight: 0.12 }
  ])

  const mentalityPressure = weighted([
    { value: scale(teamState.snapbackPressureIndex, 18, 64), weight: 0.16 },
    { value: scale(teamState.formPressureIndex, 22, 70), weight: 0.14 },
    { value: scale(teamState.heatRegressionIndex, 18, 74), weight: 0.12 },
    { value: teamState.previousResult === 'loss' ? 60 : 42, weight: 0.1 },
    { value: scale(teamState.closeLossCountLast5, 0, 3), weight: 0.1 },
    { value: scale(teamState.blowoutLossCountLast5, 0, 3), weight: 0.1 },
    { value: scale(teamState.runDiffLast5, -5, 5), weight: 0.1 },
    { value: scale(teamState.firstInningJoltCountLast5, 0, 3), weight: 0.08 },
    { value: scale(hitter.pressureHitter?.pressurePlateIndex, 20, 75), weight: 0.1 }
  ])

  const marketTension = weighted([
    { value: scale(model.analysis?.volatility, 35, 88), weight: 0.22 },
    { value: scale(model.analysis?.gameShape?.scores?.realityGapScore, 30, 78), weight: 0.2 },
    { value: scale(model.analysis?.gameShape?.scores?.marketContradictionScore, 0, 40), weight: 0.16 },
    { value: scale(Math.abs(Number(model.analysis?.modelEdge || 0)), 2, 18), weight: 0.14 },
    { value: inverseScale(model.analysis?.confidence, 48, 72), weight: 0.12 },
    { value: totals.fullGame?.chaosGate?.vetoed || totals.first5?.chaosGate?.vetoed ? 76 : 38, weight: 0.16 }
  ])

  return {
    pitcherCollapseRisk: round(collapse),
    starterEarlyCrack: round(earlyCrack),
    pitcherCommandLeak: round(commandLeak),
    batterFireRate: round(batterFireRate),
    trafficPressure: round(trafficPressure),
    conversionVolatility: round(conversionVolatility),
    deadBatRisk: round(deadBatRisk),
    defensiveRunLeak: round(defensiveRunLeak),
    bridgeLeak: round(bridgeLeak),
    carryBoost: round(carryBoost),
    mentalityPressure: round(mentalityPressure),
    marketTension: round(marketTension)
  }
}

const gameVector = ({ awayVector, homeVector, model }) => {
  const scores = model.analysis?.gameShape?.scores || {}
  return {
    starterPairCollapse: round(Math.max(awayVector.pitcherCollapseRisk, homeVector.pitcherCollapseRisk)),
    earlyJolt: round(Math.max(awayVector.starterEarlyCrack + awayVector.trafficPressure * 0.25, homeVector.starterEarlyCrack + homeVector.trafficPressure * 0.25)),
    trafficFork: round(Math.max(awayVector.trafficPressure + awayVector.deadBatRisk * 0.45, homeVector.trafficPressure + homeVector.deadBatRisk * 0.45) / 1.35),
    powerWeatherTail: round(Math.max(awayVector.batterFireRate + awayVector.carryBoost * 0.55, homeVector.batterFireRate + homeVector.carryBoost * 0.55) / 1.35),
    bridgeChaos: round(Math.max(awayVector.bridgeLeak, homeVector.bridgeLeak, Number(scores.bullpenFlipScore || 0))),
    deadZone: round(Math.max(awayVector.deadBatRisk, homeVector.deadBatRisk)),
    asymmetry: round(
      Math.max(
        ...teamDimensions.map((dimension) => Math.abs(Number(awayVector[dimension] || 0) - Number(homeVector[dimension] || 0)))
      )
    ),
    marketRealityGap: round(Math.max(awayVector.marketTension, homeVector.marketTension, Number(scores.realityGapScore || 0)))
  }
}

const summarizeTeamRows = (rows) => {
  const count = rows.length
  return {
    rows: count,
    avgF5Runs: round(avg(rows.map((row) => row.runsFirst5))),
    avgFinalRuns: round(avg(rows.map((row) => row.runsFinal))),
    f5ScoredRate: rate(rows.filter((row) => row.first5Scored).length, count),
    f5ExplosionRate: rate(rows.filter((row) => row.first5Explosion).length, count),
    f5DeadRate: rate(rows.filter((row) => row.first5Dead).length, count),
    lateExplosionRate: rate(rows.filter((row) => row.lateExplosion).length, count),
    f5WinRate: rate(rows.filter((row) => row.first5Win).length, count),
    finalWinRate: rate(rows.filter((row) => row.finalWin).length, count)
  }
}

const summarizeGameRows = (rows) => {
  const count = rows.length
  return {
    rows: count,
    avgF5Total: round(avg(rows.map((row) => row.totalRunsFirst5))),
    avgFinalTotal: round(avg(rows.map((row) => row.totalRunsFinal))),
    highF5TotalRate: rate(rows.filter((row) => row.totalRunsFirst5 >= 5).length, count),
    lowF5TotalRate: rate(rows.filter((row) => row.totalRunsFirst5 <= 3).length, count),
    highFullTotalRate: rate(rows.filter((row) => row.totalRunsFinal >= 9).length, count),
    veryHighFullTotalRate: rate(rows.filter((row) => row.totalRunsFinal >= 12).length, count)
  }
}

const quantile = (values, q) => {
  const clean = values.map(Number).filter(Number.isFinite).sort((a, b) => a - b)
  if (!clean.length) return null
  const index = Math.min(clean.length - 1, Math.max(0, Math.floor((clean.length - 1) * q)))
  return clean[index]
}

const dimensionBuckets = ({ rows, dimensions, summarize, outcomeKeys }) => {
  const baseline = summarize(rows)
  return dimensions.map((dimension) => {
    const values = rows.map((row) => row.vector[dimension]).filter(Number.isFinite)
    const q75 = quantile(values, 0.75)
    const q90 = quantile(values, 0.9)
    const q25 = quantile(values, 0.25)
    const highRows = rows.filter((row) => Number(row.vector[dimension]) >= q75)
    const loudRows = rows.filter((row) => Number(row.vector[dimension]) >= q90)
    const lowRows = rows.filter((row) => Number(row.vector[dimension]) <= q25)
    const high = summarize(highRows)
    const loud = summarize(loudRows)
    const low = summarize(lowRows)
    const lift = Object.fromEntries(
      outcomeKeys.map((key) => [key, round((high[key] ?? 0) - (baseline[key] ?? 0), 3)])
    )
    return {
      dimension,
      q25: round(q25),
      q75: round(q75),
      q90: round(q90),
      high,
      loud,
      low,
      lift
    }
  })
}

const pairBuckets = ({ rows, dimensions, summarize, targetKey, minRows }) => {
  const baseline = summarize(rows)
  const thresholds = new Map(
    dimensions.map((dimension) => [
      dimension,
      quantile(rows.map((row) => row.vector[dimension]), 0.75)
    ])
  )
  const pairs = []
  for (let leftIndex = 0; leftIndex < dimensions.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < dimensions.length; rightIndex += 1) {
      const left = dimensions[leftIndex]
      const right = dimensions[rightIndex]
      const filtered = rows.filter(
        (row) => Number(row.vector[left]) >= thresholds.get(left) && Number(row.vector[right]) >= thresholds.get(right)
      )
      if (filtered.length < minRows) continue
      const summary = summarize(filtered)
      pairs.push({
        pair: `${left} + ${right}`,
        ...summary,
        lift: round((summary[targetKey] ?? 0) - (baseline[targetKey] ?? 0), 3)
      })
    }
  }
  return pairs.sort((left, right) => Math.abs(right.lift) - Math.abs(left.lift)).slice(0, 20)
}

const buildMarkdown = ({ options, report }) => {
  const lines = []
  lines.push(`# MLB-M2 Invented Vector Search`)
  lines.push('')
  lines.push(`Range: ${options.start} to ${options.end}`)
  lines.push('')
  lines.push(`This pass breaks the compressed radar axes into invented sub-vectors. The names are provisional; the test is whether they separate outcomes.`)
  lines.push('')
  lines.push(`## Coverage`)
  lines.push('')
  lines.push(`- Games: ${report.coverage.games}`)
  lines.push(`- Team vectors: ${report.coverage.teamVectors}`)
  lines.push(`- Dates: ${report.coverage.dates.join(', ')}`)
  lines.push('')
  lines.push(`## Team Dimension Search`)
  lines.push('')
  lines.push(`Baseline: 3+ F5 ${pct(report.teamBaseline.f5ScoredRate)}, 5+ F5 ${pct(report.teamBaseline.f5ExplosionRate)}, dead F5 ${pct(report.teamBaseline.f5DeadRate)}, final win ${pct(report.teamBaseline.finalWinRate)}.`)
  lines.push('')
  lines.push(`High score means more of the condition, not automatically better. These are invention candidates, not promoted model features yet.`)
  lines.push('')
  lines.push(`| Dimension top quartile | Q75 | Rows | Avg F5 R | 3+ F5 | 5+ F5 | Dead F5 | Final win | 5+ lift | Dead lift |`)
  lines.push(`| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |`)
  for (const row of report.teamBuckets) {
    lines.push(`| ${row.dimension} | ${row.q75 ?? 'N/A'} | ${row.high.rows} | ${row.high.avgF5Runs ?? 'N/A'} | ${pct(row.high.f5ScoredRate)} | ${pct(row.high.f5ExplosionRate)} | ${pct(row.high.f5DeadRate)} | ${pct(row.high.finalWinRate)} | ${pct(row.lift.f5ExplosionRate)} | ${pct(row.lift.f5DeadRate)} |`)
  }
  lines.push('')
  lines.push(`## Game Dimension Search`)
  lines.push('')
  lines.push(`Baseline: F5 total 5+ ${pct(report.gameBaseline.highF5TotalRate)}, full 9+ ${pct(report.gameBaseline.highFullTotalRate)}, full 12+ ${pct(report.gameBaseline.veryHighFullTotalRate)}.`)
  lines.push('')
  lines.push(`| Dimension top quartile | Q75 | Rows | Avg F5 total | Avg final | F5 5+ | F5 <=3 | Full 9+ | Full 12+ | F5 5+ lift |`)
  lines.push(`| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |`)
  for (const row of report.gameBuckets) {
    lines.push(`| ${row.dimension} | ${row.q75 ?? 'N/A'} | ${row.high.rows} | ${row.high.avgF5Total ?? 'N/A'} | ${row.high.avgFinalTotal ?? 'N/A'} | ${pct(row.high.highF5TotalRate)} | ${pct(row.high.lowF5TotalRate)} | ${pct(row.high.highFullTotalRate)} | ${pct(row.high.veryHighFullTotalRate)} | ${pct(row.lift.highF5TotalRate)} |`)
  }
  lines.push('')
  lines.push(`## Best Team Dimension Pairs`)
  lines.push('')
  lines.push(`| Pair top quartile overlap | Rows | Avg F5 R | 3+ F5 | 5+ F5 | Dead F5 | Lift: 5+ F5 |`)
  lines.push(`| --- | ---: | ---: | ---: | ---: | ---: | ---: |`)
  for (const row of report.teamPairs) {
    lines.push(`| ${row.pair} | ${row.rows} | ${row.avgF5Runs ?? 'N/A'} | ${pct(row.f5ScoredRate)} | ${pct(row.f5ExplosionRate)} | ${pct(row.f5DeadRate)} | ${pct(row.lift)} |`)
  }
  lines.push('')
  lines.push(`## Best Game Dimension Pairs`)
  lines.push('')
  lines.push(`| Pair top quartile overlap | Rows | Avg F5 total | Avg final | F5 5+ | Full 9+ | Lift: F5 5+ |`)
  lines.push(`| --- | ---: | ---: | ---: | ---: | ---: | ---: |`)
  for (const row of report.gamePairs) {
    lines.push(`| ${row.pair} | ${row.rows} | ${row.avgF5Total ?? 'N/A'} | ${row.avgFinalTotal ?? 'N/A'} | ${pct(row.highF5TotalRate)} | ${pct(row.highFullTotalRate)} | ${pct(row.lift)} |`)
  }
  lines.push('')
  lines.push(`## Invented Dimension Meanings`)
  lines.push('')
  for (const dimension of [...teamDimensions, ...gameDimensions]) {
    lines.push(`- \`${dimension}\`: ${report.dimensionDefinitions[dimension]}`)
  }
  lines.push('')
  lines.push(`## Reads`)
  lines.push('')
  for (const read of report.reads) lines.push(`- ${read}`)
  lines.push('')
  lines.push(`## Next`)
  lines.push('')
  lines.push(`- Promote only dimensions that survive walk-forward checks, not just this pooled bucket report.`)
  lines.push(`- Store these invented dimensions as raw team-game/game-state vector rows so M2 can learn transitions.`)
  lines.push(`- Keep the six-axis radar as display compression; it should be generated from this larger vector set.`)
  lines.push('')
  return lines.join('\n')
}

const main = () => {
  const options = parseArgs()
  const outcomes = loadOutcomes(options)
  const files = listSlateFiles(options)
  const teamRows = []
  const gameRows = []
  const dateSet = new Set()

  for (const file of files) {
    const game = JSON.parse(fs.readFileSync(file, 'utf8'))
    if (game.league !== 'MLB' || !game.gamePk || !game.stateContext) continue
    const outcome = outcomes.get(String(game.gamePk))
    if (!outcome) continue
    const awayTeam = toShortName(outcome.awayTeam)
    const homeTeam = toShortName(outcome.homeTeam)
    const model = createSportsMatchModel(game)
    dateSet.add(outcome.gameDate)

    const sides = [
      { side: 'away', opponentSide: 'home', team: awayTeam },
      { side: 'home', opponentSide: 'away', team: homeTeam }
    ]
    const sideRows = []
    for (const sideContext of sides) {
      const actual = sideOutcome({ profileTeam: sideContext.team, outcome })
      if (!actual) continue
      const vector = teamVector({
        game,
        model,
        side: sideContext.side,
        opponentSide: sideContext.opponentSide
      })
      const row = {
        date: outcome.gameDate,
        gamePk: game.gamePk,
        title: game.title,
        team: sideContext.team,
        side: sideContext.side,
        opponent: actual.opponent,
        vector,
        ...actual
      }
      sideRows.push(row)
      teamRows.push(row)
    }
    if (sideRows.length === 2) {
      const vector = gameVector({
        awayVector: sideRows.find((row) => row.side === 'away').vector,
        homeVector: sideRows.find((row) => row.side === 'home').vector,
        model
      })
      gameRows.push({
        date: outcome.gameDate,
        gamePk: game.gamePk,
        title: game.title,
        vector,
        totalRunsFirst5: Number(outcome.totalRunsFirst5),
        totalRunsFinal: Number(outcome.totalRunsFinal)
      })
    }
  }

  const teamBaseline = summarizeTeamRows(teamRows)
  const gameBaseline = summarizeGameRows(gameRows)
  const teamBuckets = dimensionBuckets({
    rows: teamRows,
    dimensions: teamDimensions,
    summarize: summarizeTeamRows,
    outcomeKeys: ['f5ScoredRate', 'f5ExplosionRate', 'f5DeadRate', 'lateExplosionRate', 'finalWinRate']
  }).sort((left, right) => Math.abs(right.lift.f5ExplosionRate) - Math.abs(left.lift.f5ExplosionRate))
  const gameBuckets = dimensionBuckets({
    rows: gameRows,
    dimensions: gameDimensions,
    summarize: summarizeGameRows,
    outcomeKeys: ['highF5TotalRate', 'lowF5TotalRate', 'highFullTotalRate', 'veryHighFullTotalRate']
  }).sort((left, right) => Math.abs(right.lift.highF5TotalRate) - Math.abs(left.lift.highF5TotalRate))
  const teamPairs = pairBuckets({
    rows: teamRows,
    dimensions: teamDimensions,
    summarize: summarizeTeamRows,
    targetKey: 'f5ExplosionRate',
    minRows: 8
  })
  const gamePairs = pairBuckets({
    rows: gameRows,
    dimensions: gameDimensions,
    summarize: summarizeGameRows,
    targetKey: 'highF5TotalRate',
    minRows: 6
  })
  const reads = []
  const bestTeam = teamBuckets[0]
  const bestGame = gameBuckets[0]
  const bestPair = teamPairs[0]
  const bestGamePair = gamePairs[0]
  if (bestTeam) {
    reads.push(`${bestTeam.dimension} had the strongest single-dimension team F5 explosion separation: top quartile hit ${pct(bestTeam.high.f5ExplosionRate)} vs baseline ${pct(teamBaseline.f5ExplosionRate)}.`)
  }
  if (bestGame) {
    reads.push(`${bestGame.dimension} had the strongest single-dimension game F5-total separation: top quartile hit ${pct(bestGame.high.highF5TotalRate)} vs baseline ${pct(gameBaseline.highF5TotalRate)}.`)
  }
  if (bestPair) {
    reads.push(`Best team pair so far: ${bestPair.pair}, ${bestPair.rows} rows, ${pct(bestPair.f5ExplosionRate)} 5+ F5 explosion rate.`)
  }
  if (bestGamePair) {
    reads.push(`Best game pair so far: ${bestGamePair.pair}, ${bestGamePair.rows} games, ${pct(bestGamePair.highF5TotalRate)} F5 total 5+ rate.`)
  }
  const deadRisk = teamBuckets.find((row) => row.dimension === 'deadBatRisk')
  if (deadRisk) {
    const deadLift = Number(deadRisk.lift.f5DeadRate)
    if (deadLift >= 0.03) {
      reads.push(`deadBatRisk separated true dead offenses: top quartile dead F5 rate ${pct(deadRisk.high.f5DeadRate)} vs baseline ${pct(teamBaseline.f5DeadRate)}.`)
    } else {
      reads.push(`deadBatRisk did not isolate true dead offenses in this pooled sample: top quartile dead F5 rate ${pct(deadRisk.high.f5DeadRate)} vs baseline ${pct(teamBaseline.f5DeadRate)}. It may need to be paired with low traffic or low fire instead of used alone.`)
    }
  }
  const fire = teamBuckets.find((row) => row.dimension === 'batterFireRate')
  if (fire) {
    reads.push(`batterFireRate alone is not enough unless paired with pitcher/defense leak; top quartile 5+ F5 rate was ${pct(fire.high.f5ExplosionRate)}.`)
  }

  const report = {
    schemaVersion: 1,
    modelId: 'MLB-M2',
    experiment: 'game_shape_dimension_search',
    options,
    coverage: {
      games: gameRows.length,
      teamVectors: teamRows.length,
      dates: [...dateSet].sort()
    },
    teamDimensions,
    gameDimensions,
    dimensionDefinitions,
    teamBaseline,
    gameBaseline,
    teamBuckets,
    gameBuckets,
    teamPairs,
    gamePairs,
    reads,
    teamRows,
    gameRows
  }

  const reportDir = path.join(rootDir, 'models', 'mlb', 'cartridges', 'MLB-M2', 'reports')
  const privateDir = path.join(rootDir, 'data-private', 'reports')
  fs.mkdirSync(reportDir, { recursive: true })
  fs.mkdirSync(privateDir, { recursive: true })
  const safeRange = `${options.start}-to-${options.end}`
  const markdownOut = path.join(reportDir, `game-shape-dimension-search-${safeRange}.md`)
  const jsonOut = path.join(privateDir, `mlb-m2-game-shape-dimension-search-${safeRange}.json`)
  fs.writeFileSync(markdownOut, buildMarkdown({ options, report }))
  fs.writeFileSync(jsonOut, JSON.stringify(report, null, 2))
  console.log(`Wrote ${markdownOut}`)
  console.log(`Wrote ${jsonOut}`)
  console.log(JSON.stringify({
    coverage: report.coverage,
    reads: report.reads
  }, null, 2))
}

main()
