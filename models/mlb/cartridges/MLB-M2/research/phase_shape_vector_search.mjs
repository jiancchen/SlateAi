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

const teamPhaseDimensions = [
  'firstCyclePressure',
  'starterWindowTraffic',
  'starterWindowConversion',
  'starterCollapseAttack',
  'bridgeAttack',
  'lateAttack',
  'outfieldChaosPressure',
  'strandFork',
  'powerFork',
  'stateShock'
]

const gamePhaseDimensions = [
  'firstInningRunState',
  'f5RunState',
  'bridgeRunState',
  'lateRunState',
  'outfieldErrorTail',
  'compressedFork',
  'phaseWhiplash'
]

const dimensionDefinitions = {
  firstCyclePressure: 'Team first-inning/top-order pressure versus opposing starter early-crack profile.',
  starterWindowTraffic: 'Team early baserunner pressure versus opposing starter command/collapse leak.',
  starterWindowConversion: 'Whether F5 traffic can become runs, using conversion shape plus starter command leak.',
  starterCollapseAttack: 'Offense pressure specifically against a starter-collapse profile.',
  bridgeAttack: 'Offense against the first bullpen/bridge phase, using opponent bullpen leak and reliever command.',
  lateAttack: 'Offense against late innings, including bullpen leak, team state, and late explosion pressure.',
  outfieldChaosPressure: 'Offense hard-contact/carry/sun/park pressure against opponent mistake/outfield leak.',
  strandFork: 'Traffic plus dead-bat/no-conversion tension. High means the game can look alive and still strand.',
  powerFork: 'Batter fire plus carry plus pitcher HR/collapse leak. High means scoring can come suddenly.',
  stateShock: 'Recent-state and mentality pressure that can bend a normal projection.',
  firstInningRunState: 'Game-level first-inning scoring pressure from both team first-cycle vectors.',
  f5RunState: 'Game-level starter-window scoring pressure from both teams.',
  bridgeRunState: 'Game-level innings 6-7 pressure from both team bridge vectors.',
  lateRunState: 'Game-level innings 8-9 pressure from both team late vectors.',
  outfieldErrorTail: 'Game-level contact/carry/visibility/defensive-leak tail.',
  compressedFork: 'Game-level traffic/dead-zone fork where averages lie.',
  phaseWhiplash: 'Game-level difference between early pressure and late/bridge pressure.'
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

const median = (values) => {
  const clean = values.map(Number).filter(Number.isFinite).sort((a, b) => a - b)
  if (!clean.length) return null
  const mid = Math.floor(clean.length / 2)
  return clean.length % 2 ? clean[mid] : (clean[mid - 1] + clean[mid]) / 2
}

const trimmedMean = (values) => {
  const clean = values.map(Number).filter(Number.isFinite).sort((a, b) => a - b)
  if (clean.length <= 2) return avg(clean)
  return avg(clean.slice(1, -1))
}

const quantile = (values, q) => {
  const clean = values.map(Number).filter(Number.isFinite).sort((a, b) => a - b)
  if (!clean.length) return null
  const index = Math.min(clean.length - 1, Math.max(0, Math.floor((clean.length - 1) * q)))
  return clean[index]
}

const rate = (hits, rows) => (rows ? hits / rows : null)
const pct = (value) => (Number.isFinite(value) ? `${(value * 100).toFixed(1)}%` : 'N/A')

const weighted = (parts) => {
  const clean = parts.filter((part) => Number.isFinite(part.value) && Number.isFinite(part.weight) && part.weight > 0)
  const totalWeight = clean.reduce((sum, part) => sum + part.weight, 0)
  if (!totalWeight) return 50
  return clamp(clean.reduce((sum, part) => sum + part.value * part.weight, 0) / totalWeight)
}

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

const robustRecentGames = (games = []) => ({
  games: games.length,
  medianRunsFor: median(games.map((game) => game.runsFor)),
  trimmedRunsFor: trimmedMean(games.map((game) => game.runsFor)),
  highRunRate: rate(games.filter((game) => Number(game.runsFor) >= 7).length, games.length),
  deadRunRate: rate(games.filter((game) => Number(game.runsFor) <= 2).length, games.length),
  medianRunsAgainst: median(games.map((game) => game.runsAgainst)),
  highAllowedRate: rate(games.filter((game) => Number(game.runsAgainst) >= 7).length, games.length)
})

const robustStarterHistory = (starts = []) => ({
  starts: starts.length,
  medianRunsAllowed: median(starts.map((start) => start.runsAllowed)),
  trimmedRunsAllowed: trimmedMean(starts.map((start) => start.runsAllowed)),
  collapseRate: rate(
    starts.filter(
      (start) =>
        Number(start.runsAllowed) >= 5 ||
        Number(start.walksAllowed) >= 4 ||
        Number(start.homeRunsAllowed) >= 2 ||
        Number(start.inningsPitched) < 4
    ).length,
    starts.length
  ),
  earlyLeakRate: rate(starts.filter((start) => Number(start.firstInningRunsAllowed) > 0).length, starts.length),
  medianWalks: median(starts.map((start) => start.walksAllowed)),
  medianHits: median(starts.map((start) => start.hitsAllowed)),
  medianIp: median(starts.map((start) => start.inningsPitched)),
  shortRate: rate(starts.filter((start) => Number(start.inningsPitched) < 5).length, starts.length)
})

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

const loadInningRuns = ({ start, end }) => {
  const rows = sqliteJson(`
    SELECT game_pk AS gamePk, game_date AS gameDate, inning, batting_team AS battingTeam, SUM(run_delta) AS runs
    FROM mlb_plate_appearances
    WHERE game_date BETWEEN '${start}' AND '${end}'
    GROUP BY game_pk, game_date, inning, batting_team
  `)
  const map = new Map()
  for (const row of rows) {
    const gameMap = map.get(String(row.gamePk)) || {}
    const team = normalizeName(toShortName(row.battingTeam))
    gameMap[team] = gameMap[team] || {}
    gameMap[team][Number(row.inning)] = Number(row.runs || 0)
    map.set(String(row.gamePk), gameMap)
  }
  return map
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

const inningSum = (inningMap = {}, from, to) => {
  let total = 0
  for (let inning = from; inning <= to; inning += 1) {
    total += Number(inningMap[inning] || 0)
  }
  return total
}

const sideOutcome = ({ profileTeam, outcome, inningRuns }) => {
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
  const team = isAway ? awayShort : homeShort
  const opponent = isAway ? homeShort : awayShort
  const teamInnings = inningRuns?.[normalizeName(team)] || {}
  const oppInnings = inningRuns?.[normalizeName(opponent)] || {}
  const runsFirst5 = Number(isAway ? outcome.awayRunsFirst5 : outcome.homeRunsFirst5)
  const runsFinal = Number(isAway ? outcome.awayRunsFinal : outcome.homeRunsFinal)
  const oppRunsFirst5 = Number(isAway ? outcome.homeRunsFirst5 : outcome.awayRunsFirst5)
  const oppRunsFinal = Number(isAway ? outcome.homeRunsFinal : outcome.awayRunsFinal)
  const firstInningRuns = inningSum(teamInnings, 1, 1)
  const bridgeRuns = inningSum(teamInnings, 6, 7)
  const lateRuns8_9 = inningSum(teamInnings, 8, 9)
  const opponentBridgeRuns = inningSum(oppInnings, 6, 7)
  const opponentLateRuns8_9 = inningSum(oppInnings, 8, 9)
  return {
    side,
    opponentSide,
    team,
    opponent,
    runsFirst5,
    runsFinal,
    oppRunsFirst5,
    oppRunsFinal,
    firstInningRuns,
    bridgeRuns,
    lateRuns8_9,
    opponentBridgeRuns,
    opponentLateRuns8_9,
    firstInningScored: firstInningRuns > 0,
    first5Scored: runsFirst5 >= 3,
    first5Explosion: runsFirst5 >= 5,
    first5Dead: runsFirst5 <= 1,
    bridgeScored: bridgeRuns >= 1,
    bridgeBurst: bridgeRuns >= 2,
    lateScored: lateRuns8_9 >= 1,
    lateBurst: lateRuns8_9 >= 2,
    finalWin: runsFinal > oppRunsFinal
  }
}

const phaseVector = ({ game, model, side, opponentSide }) => {
  const teamState = game.stateContext?.teamState?.[side] || {}
  const recent = robustRecentGames(game.stateContext?.recentGames?.[side] || [])
  const hitter = game.stateContext?.hitterState?.[side] || {}
  const mistake = game.stateContext?.teamMistakeShape?.[side] || {}
  const oppMistake = game.stateContext?.teamMistakeShape?.[opponentSide] || {}
  const lineup = game.stateContext?.lineupConversion?.[side] || {}
  const firstInningTeam = game.stateContext?.firstInningTeam?.[side] || {}
  const firstInningPitcherAgainst = game.stateContext?.firstInningPitcher?.[opponentSide] || {}
  const starterAgainst = game.starterContext?.[opponentSide] || {}
  const starterRecent = robustStarterHistory(starterAgainst.startHistoryLast5 || [])
  const opponentBullpen = game.stateContext?.bullpenMistake?.[opponentSide] || {}
  const opponentBullpenContext = game.bullpenContext?.[opponentSide] || {}
  const opponentRelieverCommand = game.tierThreeContext?.bullpenCommand?.[opponentSide] || {}
  const savant = game.savantContext?.[side] || {}
  const projection = model.analysis?.mlbProjection || {}
  const totals = projection.totals || {}
  const weather = projection.weather || {}
  const sunVisibility = projection.sunVisibility || game.stateContext?.sunVisibility || {}

  const starterCollapse = weighted([
    { value: scale(starterAgainst.era, 2.6, 7.2), weight: 0.12 },
    { value: scale(starterAgainst.whip, 1.02, 1.78), weight: 0.12 },
    { value: scale(per9(starterAgainst.walks, starterAgainst.inningsPitched), 2.0, 5.0), weight: 0.09 },
    { value: scale(per9(starterAgainst.homeRunsAllowed, starterAgainst.inningsPitched), 0.6, 2.1), weight: 0.08 },
    { value: scale(starterRecent.trimmedRunsAllowed, 1.2, 5.2), weight: 0.14 },
    { value: pctScore(starterRecent.collapseRate, 20), weight: 0.16 },
    { value: pctScore(starterRecent.shortRate, 20), weight: 0.09 },
    { value: pctScore(starterAgainst.usageContext?.shortLeashRisk, 25), weight: 0.08 },
    { value: inverseScale(starterAgainst.usageContext?.expectedInnings, 4.2, 6.3), weight: 0.12 }
  ])
  const starterEarlyCrack = weighted([
    { value: pctScore(firstInningPitcherAgainst.firstBatterReachRate, 30), weight: 0.17 },
    { value: pctScore(firstInningPitcherAgainst.firstInningRunAllowedRate, 24), weight: 0.18 },
    { value: pctScore(firstInningPitcherAgainst.firstInningWalkRate, 12), weight: 0.1 },
    { value: scale(firstInningPitcherAgainst.firstInningBaserunnersPerStart, 0.4, 1.8), weight: 0.12 },
    { value: scale(firstInningPitcherAgainst.firstInningPressureIndex, 20, 88), weight: 0.18 },
    { value: pctScore(starterRecent.earlyLeakRate, 20), weight: 0.15 },
    { value: scale(starterRecent.medianWalks, 0.6, 3.2), weight: 0.1 }
  ])
  const starterCommandLeak = weighted([
    { value: scale(starterAgainst.whip, 1.0, 1.8), weight: 0.18 },
    { value: scale(per9(starterAgainst.walks, starterAgainst.inningsPitched), 1.8, 5.1), weight: 0.18 },
    { value: scale(starterRecent.medianWalks, 0.8, 3.5), weight: 0.14 },
    { value: scale(starterRecent.medianHits, 3.5, 7.5), weight: 0.11 },
    { value: pctScore(firstInningPitcherAgainst.firstBatterReachRate, 25), weight: 0.12 },
    { value: pctScore(firstInningPitcherAgainst.firstInningWalkRate, 10), weight: 0.09 },
    { value: inverseScale(starterRecent.medianIp, 4.2, 6.5), weight: 0.1 },
    { value: pctScore(starterAgainst.usageContext?.shortLeashRisk, 20), weight: 0.08 }
  ])
  const batterFire = weighted([
    { value: scale(hitter.top6HeatIndex, 24, 72), weight: 0.14 },
    { value: scale(hitter.hottestHitter?.heatRegressionIndex, 35, 88), weight: 0.11 },
    { value: scale(hitter.top6Rolling7Xwoba, 0.285, 0.43), weight: 0.12 },
    { value: scale(Number(hitter.top6Rolling7Xwoba) - Number(hitter.top6Rolling30Xwoba), -0.04, 0.08), weight: 0.1 },
    { value: scale(hitter.top6XwobaTrend, -0.04, 0.08), weight: 0.08 },
    { value: scale(hitter.top6HardHitTrend, -6, 8), weight: 0.09 },
    { value: scale(hitter.top6SweetSpotTrend, -6, 12), weight: 0.08 },
    { value: scale(savant.barrelPct, 4, 10), weight: 0.09 },
    { value: scale(savant.xwoba, 0.285, 0.36), weight: 0.09 },
    { value: scale(recent.highRunRate, 0.05, 0.42), weight: 0.1 }
  ])
  const traffic = weighted([
    { value: scale(lineup.baserunnersPerGame, 9, 16), weight: 0.16 },
    { value: scale(lineup.earlyBaserunnersPerGame, 2.4, 5.6), weight: 0.16 },
    { value: scale(lineup.topOrderBaserunnersFirst3PerGame, 1.2, 3.2), weight: 0.14 },
    { value: scale(lineup.lineupConversionIndex, 12, 68), weight: 0.12 },
    { value: scale(hitter.top6WalkRate, 0.05, 0.17), weight: 0.1 },
    { value: scale(firstInningTeam.firstInningScoringIndex, 25, 100), weight: 0.12 },
    { value: scale(recent.trimmedRunsFor, 2.2, 6.4), weight: 0.1 },
    { value: scale(recent.medianRunsFor, 2, 6), weight: 0.1 }
  ])
  const conversion = weighted([
    { value: scale(lineup.lineupConversionIndex, 12, 68), weight: 0.18 },
    { value: scale(lineup.runsPerBaserunner, 0.18, 0.45), weight: 0.15 },
    { value: scale(lineup.earlyConversionRate, 0.18, 0.5), weight: 0.13 },
    { value: scale(lineup.topOrderConversionShare, 0.38, 0.88), weight: 0.12 },
    { value: scale(batterFire, 35, 72), weight: 0.12 },
    { value: inverseScale(lineup.strandedTrafficRate, 0.75, 1.45), weight: 0.1 },
    { value: inverseScale(lineup.trafficNoConversionRate, 0.02, 0.28), weight: 0.1 },
    { value: scale(starterCommandLeak, 25, 62), weight: 0.1 }
  ])
  const dead = weighted([
    { value: pctScore(lineup.quietFirst5Rate, 35), weight: 0.18 },
    { value: pctScore(mistake.scorelessFirst3Rate, 35), weight: 0.15 },
    { value: pctScore(lineup.deadBatTrafficRate, 26), weight: 0.14 },
    { value: pctScore(lineup.trafficNoConversionRate, 12), weight: 0.11 },
    { value: scale(hitter.top6ColdIndex, 30, 75), weight: 0.11 },
    { value: scale(hitter.top6StrikeoutRate, 0.12, 0.3), weight: 0.08 },
    { value: scale(hitter.top6WhiffRate, 0.06, 0.18), weight: 0.08 },
    { value: scale(recent.deadRunRate, 0.08, 0.5), weight: 0.15 }
  ])
  const defensiveLeak = weighted([
    { value: pctScore(oppMistake.oneBadInningAllowedRate, 25), weight: 0.18 },
    { value: pctScore(oppMistake.earlyMultiRunAllowedRate, 24), weight: 0.14 },
    { value: pctScore(oppMistake.firstInningRunAllowedRate, 25), weight: 0.1 },
    { value: scale(oppMistake.mistakeChaosIndex, 35, 76), weight: 0.16 },
    { value: scale(oppMistake.runClusteringIndex, 35, 82), weight: 0.13 },
    { value: pctScore(oppMistake.bullpenMeltdownRate, 14), weight: 0.11 },
    { value: scale(recent.highAllowedRate, 0.05, 0.42), weight: 0.08 },
    { value: scale(oppMistake.strandedTrafficRate, 0.8, 1.45), weight: 0.1 }
  ])
  const bridgeLeak = weighted([
    { value: scale(opponentBullpen.bullpenChaosIndex, 30, 70), weight: 0.17 },
    { value: pctScore(opponentBullpen.bullpenMeltdownGameRate, 16), weight: 0.15 },
    { value: pctScore(opponentBullpen.firstBatterReachRate, 23), weight: 0.12 },
    { value: pctScore(opponentBullpen.inheritedTrafficScoreRate, 42), weight: 0.12 },
    { value: pctScore(opponentBullpen.homeRunAppearanceRate, 8), weight: 0.1 },
    { value: scale(opponentBullpenContext.era, 3.0, 5.4), weight: 0.12 },
    { value: scale(opponentBullpenContext.whip, 1.1, 1.55), weight: 0.11 },
    { value: scale(opponentRelieverCommand.commandRiskIndex, 20, 58), weight: 0.11 }
  ])
  const carry = weighted([
    { value: weather.hitBoostFirst5 ? clamp(Number(weather.hitBoostFirst5) * 520) : 45, weight: 0.11 },
    { value: weather.runBoostFirst5 ? clamp(Number(weather.runBoostFirst5) * 6500) : 45, weight: 0.09 },
    { value: /carry|wind out/i.test(weather.label || '') ? 76 : 42, weight: 0.14 },
    { value: scale(sunVisibility.visibilityRiskScore, 20, 58), weight: 0.1 },
    { value: scale(game.parkContext?.indexHr, 90, 115), weight: 0.1 },
    { value: scale(game.parkContext?.indexRuns, 92, 112), weight: 0.08 },
    { value: scale(savant.barrelPct, 4, 10), weight: 0.12 },
    { value: scale(savant.hardHitPct, 34, 45), weight: 0.12 },
    { value: scale(hitter.top6HardHitTrend, -6, 8), weight: 0.14 }
  ])
  const state = weighted([
    { value: scale(teamState.snapbackPressureIndex, 18, 64), weight: 0.13 },
    { value: scale(teamState.formPressureIndex, 22, 70), weight: 0.13 },
    { value: scale(teamState.heatRegressionIndex, 18, 74), weight: 0.11 },
    { value: teamState.previousResult === 'loss' ? 60 : 42, weight: 0.09 },
    { value: scale(teamState.closeLossCountLast5, 0, 3), weight: 0.09 },
    { value: scale(teamState.blowoutLossCountLast5, 0, 3), weight: 0.09 },
    { value: scale(teamState.runDiffLast5, -5, 5), weight: 0.09 },
    { value: scale(teamState.firstInningJoltCountLast5, 0, 3), weight: 0.08 },
    { value: scale(hitter.pressureHitter?.pressurePlateIndex, 20, 75), weight: 0.09 },
    { value: scale(recent.trimmedRunsFor - recent.medianRunsFor, -1.5, 1.5), weight: 0.1 }
  ])

  const firstCyclePressure = weighted([
    { value: traffic, weight: 0.2 },
    { value: starterEarlyCrack, weight: 0.22 },
    { value: batterFire, weight: 0.13 },
    { value: carry, weight: 0.1 },
    { value: scale(firstInningTeam.firstInningScoringIndex, 25, 100), weight: 0.17 },
    { value: defensiveLeak, weight: 0.1 },
    { value: state, weight: 0.08 }
  ])
  const starterWindowTraffic = weighted([
    { value: traffic, weight: 0.22 },
    { value: starterCommandLeak, weight: 0.18 },
    { value: starterCollapse, weight: 0.14 },
    { value: defensiveLeak, weight: 0.12 },
    { value: batterFire, weight: 0.12 },
    { value: carry, weight: 0.08 },
    { value: inverseScale(dead, 25, 65), weight: 0.08 },
    { value: conversion, weight: 0.06 }
  ])
  const starterWindowConversion = weighted([
    { value: conversion, weight: 0.24 },
    { value: traffic, weight: 0.16 },
    { value: starterCommandLeak, weight: 0.15 },
    { value: defensiveLeak, weight: 0.12 },
    { value: batterFire, weight: 0.11 },
    { value: carry, weight: 0.08 },
    { value: inverseScale(dead, 25, 65), weight: 0.08 },
    { value: state, weight: 0.06 }
  ])
  const starterCollapseAttack = weighted([
    { value: starterCollapse, weight: 0.22 },
    { value: starterCommandLeak, weight: 0.15 },
    { value: batterFire, weight: 0.15 },
    { value: traffic, weight: 0.14 },
    { value: defensiveLeak, weight: 0.12 },
    { value: carry, weight: 0.1 },
    { value: conversion, weight: 0.08 },
    { value: state, weight: 0.04 }
  ])
  const bridgeAttack = weighted([
    { value: bridgeLeak, weight: 0.28 },
    { value: batterFire, weight: 0.15 },
    { value: traffic, weight: 0.13 },
    { value: conversion, weight: 0.12 },
    { value: carry, weight: 0.1 },
    { value: state, weight: 0.1 },
    { value: defensiveLeak, weight: 0.07 },
    { value: inverseScale(dead, 25, 65), weight: 0.05 }
  ])
  const lateAttack = weighted([
    { value: bridgeLeak, weight: 0.22 },
    { value: state, weight: 0.18 },
    { value: batterFire, weight: 0.14 },
    { value: traffic, weight: 0.12 },
    { value: conversion, weight: 0.1 },
    { value: carry, weight: 0.1 },
    { value: defensiveLeak, weight: 0.08 },
    { value: scale(teamState.comebackWinCountLast5, 0, 2), weight: 0.06 }
  ])
  const outfieldChaosPressure = weighted([
    { value: carry, weight: 0.24 },
    { value: batterFire, weight: 0.16 },
    { value: defensiveLeak, weight: 0.16 },
    { value: scale(savant.barrelPct, 4, 10), weight: 0.11 },
    { value: scale(savant.hardHitPct, 34, 45), weight: 0.1 },
    { value: scale(oppMistake.mistakeChaosIndex, 35, 76), weight: 0.11 },
    { value: scale(sunVisibility.visibilityRiskScore, 20, 58), weight: 0.07 },
    { value: starterCollapse, weight: 0.05 }
  ])
  const strandFork = weighted([
    { value: traffic, weight: 0.2 },
    { value: dead, weight: 0.22 },
    { value: scale(lineup.strandedTrafficRate, 0.75, 1.45), weight: 0.14 },
    { value: pctScore(lineup.trafficNoConversionRate, 12), weight: 0.12 },
    { value: scale(Math.abs(conversion - 50), 0, 35), weight: 0.1 },
    { value: starterCommandLeak, weight: 0.08 },
    { value: state, weight: 0.07 },
    { value: carry, weight: 0.07 }
  ])
  const powerFork = weighted([
    { value: batterFire, weight: 0.2 },
    { value: carry, weight: 0.18 },
    { value: starterCollapse, weight: 0.12 },
    { value: scale(per9(starterAgainst.homeRunsAllowed, starterAgainst.inningsPitched), 0.6, 2.1), weight: 0.13 },
    { value: scale(savant.barrelPct, 4, 10), weight: 0.13 },
    { value: scale(savant.hardHitPct, 34, 45), weight: 0.09 },
    { value: bridgeLeak, weight: 0.08 },
    { value: defensiveLeak, weight: 0.07 }
  ])
  const stateShock = weighted([
    { value: state, weight: 0.26 },
    { value: scale(teamState.snapbackPressureIndex, 18, 64), weight: 0.12 },
    { value: scale(teamState.heatRegressionIndex, 18, 74), weight: 0.1 },
    { value: scale(teamState.blowoutLossCountLast5, 0, 3), weight: 0.09 },
    { value: scale(teamState.firstInningJoltCountLast5, 0, 3), weight: 0.09 },
    { value: scale(Math.abs(Number(teamState.runDiffLast5 || 0)), 0, 6), weight: 0.1 },
    { value: pctScore(recent.highRunRate, 18), weight: 0.12 },
    { value: pctScore(recent.deadRunRate, 18), weight: 0.12 }
  ])

  return {
    firstCyclePressure: round(firstCyclePressure),
    starterWindowTraffic: round(starterWindowTraffic),
    starterWindowConversion: round(starterWindowConversion),
    starterCollapseAttack: round(starterCollapseAttack),
    bridgeAttack: round(bridgeAttack),
    lateAttack: round(lateAttack),
    outfieldChaosPressure: round(outfieldChaosPressure),
    strandFork: round(strandFork),
    powerFork: round(powerFork),
    stateShock: round(stateShock),
    raw: {
      starterCollapse: round(starterCollapse),
      starterEarlyCrack: round(starterEarlyCrack),
      starterCommandLeak: round(starterCommandLeak),
      batterFire: round(batterFire),
      traffic: round(traffic),
      conversion: round(conversion),
      dead: round(dead),
      defensiveLeak: round(defensiveLeak),
      bridgeLeak: round(bridgeLeak),
      carry: round(carry),
      state: round(state),
      robustRecent: recent,
      robustStarterAgainst: starterRecent
    }
  }
}

const gameVector = ({ awayVector, homeVector }) => {
  const av = awayVector
  const hv = homeVector
  return {
    firstInningRunState: round(Math.max(av.firstCyclePressure, hv.firstCyclePressure)),
    f5RunState: round(Math.max(av.starterWindowTraffic + av.starterWindowConversion * 0.4, hv.starterWindowTraffic + hv.starterWindowConversion * 0.4) / 1.4),
    bridgeRunState: round(Math.max(av.bridgeAttack, hv.bridgeAttack)),
    lateRunState: round(Math.max(av.lateAttack, hv.lateAttack)),
    outfieldErrorTail: round(Math.max(av.outfieldChaosPressure, hv.outfieldChaosPressure)),
    compressedFork: round(Math.max(av.strandFork, hv.strandFork)),
    phaseWhiplash: round(
      Math.max(
        Math.abs(av.firstCyclePressure - av.bridgeAttack),
        Math.abs(hv.firstCyclePressure - hv.bridgeAttack),
        Math.abs(av.starterWindowTraffic - av.lateAttack),
        Math.abs(hv.starterWindowTraffic - hv.lateAttack)
      )
    )
  }
}

const summarizeTeamRows = (rows) => {
  const count = rows.length
  return {
    rows: count,
    avgF5Runs: round(avg(rows.map((row) => row.runsFirst5))),
    avgBridgeRuns: round(avg(rows.map((row) => row.bridgeRuns))),
    avgLateRuns: round(avg(rows.map((row) => row.lateRuns8_9))),
    firstInningRate: rate(rows.filter((row) => row.firstInningScored).length, count),
    f5ScoredRate: rate(rows.filter((row) => row.first5Scored).length, count),
    f5ExplosionRate: rate(rows.filter((row) => row.first5Explosion).length, count),
    f5DeadRate: rate(rows.filter((row) => row.first5Dead).length, count),
    bridgeBurstRate: rate(rows.filter((row) => row.bridgeBurst).length, count),
    lateBurstRate: rate(rows.filter((row) => row.lateBurst).length, count),
    finalWinRate: rate(rows.filter((row) => row.finalWin).length, count)
  }
}

const summarizeGameRows = (rows) => {
  const count = rows.length
  return {
    rows: count,
    avgFirstInningTotal: round(avg(rows.map((row) => row.firstInningTotal))),
    avgF5Total: round(avg(rows.map((row) => row.totalRunsFirst5))),
    avgBridgeTotal: round(avg(rows.map((row) => row.bridgeTotal))),
    avgLateTotal: round(avg(rows.map((row) => row.lateTotal))),
    firstInningRunRate: rate(rows.filter((row) => row.firstInningTotal > 0).length, count),
    highF5TotalRate: rate(rows.filter((row) => row.totalRunsFirst5 >= 5).length, count),
    lowF5TotalRate: rate(rows.filter((row) => row.totalRunsFirst5 <= 3).length, count),
    bridgeBurstRate: rate(rows.filter((row) => row.bridgeTotal >= 3).length, count),
    lateBurstRate: rate(rows.filter((row) => row.lateTotal >= 3).length, count),
    highFullTotalRate: rate(rows.filter((row) => row.totalRunsFinal >= 9).length, count)
  }
}

const bucketDimensions = ({ rows, dimensions, summarize, targetKeys }) => {
  const baseline = summarize(rows)
  return dimensions
    .map((dimension) => {
      const q75 = quantile(rows.map((row) => row.vector[dimension]), 0.75)
      const q90 = quantile(rows.map((row) => row.vector[dimension]), 0.9)
      const highRows = rows.filter((row) => Number(row.vector[dimension]) >= q75)
      const loudRows = rows.filter((row) => Number(row.vector[dimension]) >= q90)
      const high = summarize(highRows)
      const loud = summarize(loudRows)
      const lift = Object.fromEntries(
        targetKeys.map((key) => [key, round((high[key] ?? 0) - (baseline[key] ?? 0), 3)])
      )
      return { dimension, q75: round(q75), q90: round(q90), high, loud, lift }
    })
}

const pairBuckets = ({ rows, dimensions, summarize, targetKey, minRows = 8 }) => {
  const baseline = summarize(rows)
  const thresholds = new Map(dimensions.map((dimension) => [dimension, quantile(rows.map((row) => row.vector[dimension]), 0.75)]))
  const pairs = []
  for (let i = 0; i < dimensions.length; i += 1) {
    for (let j = i + 1; j < dimensions.length; j += 1) {
      const left = dimensions[i]
      const right = dimensions[j]
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

const pickBucketByLift = (rows, key, direction = 'positive') => {
  const filtered = rows.filter((row) => Number.isFinite(row.lift?.[key]))
  if (!filtered.length) return null
  return filtered.sort((left, right) =>
    direction === 'negative' ? left.lift[key] - right.lift[key] : right.lift[key] - left.lift[key]
  )[0]
}

const pickPairByLift = (rows, direction = 'positive') => {
  const filtered = rows.filter((row) => Number.isFinite(row.lift))
  if (!filtered.length) return null
  return filtered.sort((left, right) =>
    direction === 'negative' ? left.lift - right.lift : right.lift - left.lift
  )[0]
}

const signedPct = (value) => {
  if (!Number.isFinite(value)) return 'N/A'
  const sign = value >= 0 ? '+' : ''
  return `${sign}${(value * 100).toFixed(1)} pts`
}

const buildMarkdown = ({ options, report }) => {
  const lines = []
  lines.push('# MLB-M2 Phase Shape Vector Search')
  lines.push('')
  lines.push(`Range: ${options.start} to ${options.end}`)
  lines.push('')
  lines.push('This pass treats one game as multiple phase radars: first cycle, starter window/F5, bridge, late, and outfield/error tail. It also uses robust recent summaries instead of raw trailing averages so one 15-run game becomes a tail event, not the new baseline.')
  lines.push('')
  lines.push('## Coverage')
  lines.push('')
  lines.push(`- Games: ${report.coverage.games}`)
  lines.push(`- Team phase vectors: ${report.coverage.teamVectors}`)
  lines.push(`- Dates: ${report.coverage.dates.join(', ')}`)
  lines.push('')
  lines.push('## Team Phase Dimensions')
  lines.push('')
  lines.push(`Baseline: 1st inning scored ${pct(report.teamBaseline.firstInningRate)}, 3+ F5 ${pct(report.teamBaseline.f5ScoredRate)}, 5+ F5 ${pct(report.teamBaseline.f5ExplosionRate)}, bridge burst ${pct(report.teamBaseline.bridgeBurstRate)}, late burst ${pct(report.teamBaseline.lateBurstRate)}.`)
  lines.push('')
  lines.push('| Dimension top quartile | Q75 | Rows | 1st scored | 3+ F5 | 5+ F5 | Dead F5 | Bridge burst | Late burst | Best lift |')
  lines.push('| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |')
  for (const row of report.teamBuckets) {
    const bestLift = Math.max(
      Math.abs(row.lift.firstInningRate || 0),
      Math.abs(row.lift.f5ExplosionRate || 0),
      Math.abs(row.lift.bridgeBurstRate || 0),
      Math.abs(row.lift.lateBurstRate || 0)
    )
    lines.push(`| ${row.dimension} | ${row.q75 ?? 'N/A'} | ${row.high.rows} | ${pct(row.high.firstInningRate)} | ${pct(row.high.f5ScoredRate)} | ${pct(row.high.f5ExplosionRate)} | ${pct(row.high.f5DeadRate)} | ${pct(row.high.bridgeBurstRate)} | ${pct(row.high.lateBurstRate)} | ${pct(bestLift)} |`)
  }
  lines.push('')
  lines.push('## Game Phase Dimensions')
  lines.push('')
  lines.push(`Baseline: first-inning run ${pct(report.gameBaseline.firstInningRunRate)}, F5 total 5+ ${pct(report.gameBaseline.highF5TotalRate)}, bridge total 3+ ${pct(report.gameBaseline.bridgeBurstRate)}, late total 3+ ${pct(report.gameBaseline.lateBurstRate)}, full 9+ ${pct(report.gameBaseline.highFullTotalRate)}.`)
  lines.push('')
  lines.push('| Dimension top quartile | Q75 | Rows | 1st run | F5 5+ | F5 <=3 | Bridge 3+ | Late 3+ | Full 9+ |')
  lines.push('| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |')
  for (const row of report.gameBuckets) {
    lines.push(`| ${row.dimension} | ${row.q75 ?? 'N/A'} | ${row.high.rows} | ${pct(row.high.firstInningRunRate)} | ${pct(row.high.highF5TotalRate)} | ${pct(row.high.lowF5TotalRate)} | ${pct(row.high.bridgeBurstRate)} | ${pct(row.high.lateBurstRate)} | ${pct(row.high.highFullTotalRate)} |`)
  }
  lines.push('')
  lines.push('## Team Phase Pairs')
  lines.push('')
  lines.push('| Pair top quartile overlap | Rows | 1st scored | 3+ F5 | 5+ F5 | Bridge burst | Late burst | Lift |')
  lines.push('| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |')
  for (const row of report.teamPairs) {
    lines.push(`| ${row.pair} | ${row.rows} | ${pct(row.firstInningRate)} | ${pct(row.f5ScoredRate)} | ${pct(row.f5ExplosionRate)} | ${pct(row.bridgeBurstRate)} | ${pct(row.lateBurstRate)} | ${pct(row.lift)} |`)
  }
  lines.push('')
  lines.push('## Game Phase Pairs')
  lines.push('')
  lines.push('| Pair top quartile overlap | Rows | 1st run | F5 5+ | Bridge 3+ | Late 3+ | Full 9+ | Lift |')
  lines.push('| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |')
  for (const row of report.gamePairs) {
    lines.push(`| ${row.pair} | ${row.rows} | ${pct(row.firstInningRunRate)} | ${pct(row.highF5TotalRate)} | ${pct(row.bridgeBurstRate)} | ${pct(row.lateBurstRate)} | ${pct(row.highFullTotalRate)} | ${pct(row.lift)} |`)
  }
  lines.push('')
  lines.push('## Dimension Meanings')
  lines.push('')
  for (const dimension of [...teamPhaseDimensions, ...gamePhaseDimensions]) {
    lines.push(`- \`${dimension}\`: ${dimensionDefinitions[dimension]}`)
  }
  lines.push('')
  lines.push('## Reads')
  lines.push('')
  for (const read of report.reads) lines.push(`- ${read}`)
  lines.push('')
  lines.push('## Calculation Rule')
  lines.push('')
  lines.push('- Do not use raw trailing averages as the state. Use medians, trimmed means, tail-event rates, capped scales, and interactions.')
  lines.push('- A 15-run game should mostly update `highRunRate`, `stateShock`, and tail vectors. It should not turn the next game projection into a naive 9-run baseline.')
  lines.push('- Every phase vector is head-to-head: offense state x opposing starter/bullpen/defense/environment state.')
  lines.push('')
  return lines.join('\n')
}

const main = () => {
  const options = parseArgs()
  const outcomes = loadOutcomes(options)
  const inningRunMap = loadInningRuns(options)
  const files = listSlateFiles(options)
  const teamRows = []
  const gameRows = []
  const dateSet = new Set()

  for (const file of files) {
    const game = JSON.parse(fs.readFileSync(file, 'utf8'))
    if (game.league !== 'MLB' || !game.gamePk || !game.stateContext) continue
    const outcome = outcomes.get(String(game.gamePk))
    if (!outcome) continue
    const inningRuns = inningRunMap.get(String(game.gamePk)) || {}
    const model = createSportsMatchModel(game)
    dateSet.add(outcome.gameDate)
    const sides = [
      { side: 'away', opponentSide: 'home', team: toShortName(outcome.awayTeam) },
      { side: 'home', opponentSide: 'away', team: toShortName(outcome.homeTeam) }
    ]
    const sideRows = []
    for (const sideContext of sides) {
      const actual = sideOutcome({ profileTeam: sideContext.team, outcome, inningRuns })
      if (!actual) continue
      const vector = phaseVector({
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
      const away = sideRows.find((row) => row.side === 'away')
      const home = sideRows.find((row) => row.side === 'home')
      const vector = gameVector({ awayVector: away.vector, homeVector: home.vector })
      gameRows.push({
        date: outcome.gameDate,
        gamePk: game.gamePk,
        title: game.title,
        vector,
        firstInningTotal: away.firstInningRuns + home.firstInningRuns,
        totalRunsFirst5: Number(outcome.totalRunsFirst5),
        bridgeTotal: away.bridgeRuns + home.bridgeRuns,
        lateTotal: away.lateRuns8_9 + home.lateRuns8_9,
        totalRunsFinal: Number(outcome.totalRunsFinal)
      })
    }
  }

  const teamBaseline = summarizeTeamRows(teamRows)
  const gameBaseline = summarizeGameRows(gameRows)
  const teamBuckets = bucketDimensions({
    rows: teamRows,
    dimensions: teamPhaseDimensions,
    summarize: summarizeTeamRows,
    targetKeys: ['firstInningRate', 'f5ExplosionRate', 'bridgeBurstRate', 'lateBurstRate', 'f5DeadRate']
  }).sort((left, right) => Math.abs((right.lift.f5ExplosionRate || 0) + (right.lift.bridgeBurstRate || 0)) - Math.abs((left.lift.f5ExplosionRate || 0) + (left.lift.bridgeBurstRate || 0)))
  const gameBuckets = bucketDimensions({
    rows: gameRows,
    dimensions: gamePhaseDimensions,
    summarize: summarizeGameRows,
    targetKeys: ['firstInningRunRate', 'highF5TotalRate', 'bridgeBurstRate', 'lateBurstRate', 'highFullTotalRate']
  }).sort((left, right) => Math.abs(right.lift.highF5TotalRate || 0) - Math.abs(left.lift.highF5TotalRate || 0))
  const teamPairs = pairBuckets({
    rows: teamRows,
    dimensions: teamPhaseDimensions,
    summarize: summarizeTeamRows,
    targetKey: 'f5ExplosionRate',
    minRows: 8
  })
  const gamePairs = pairBuckets({
    rows: gameRows,
    dimensions: gamePhaseDimensions,
    summarize: summarizeGameRows,
    targetKey: 'highF5TotalRate',
    minRows: 6
  })
  const teamF5Boost = pickBucketByLift(teamBuckets, 'f5ExplosionRate', 'positive')
  const teamF5Suppressor = pickBucketByLift(teamBuckets, 'f5ExplosionRate', 'negative')
  const bridgeBoost = pickBucketByLift(teamBuckets, 'bridgeBurstRate', 'positive')
  const firstInningBoost = pickBucketByLift(teamBuckets, 'firstInningRate', 'positive')
  const gameF5Boost = pickBucketByLift(gameBuckets, 'highF5TotalRate', 'positive')
  const gameF5Suppressor = pickBucketByLift(gameBuckets, 'highF5TotalRate', 'negative')
  const teamPairBoost = pickPairByLift(teamPairs, 'positive')
  const gamePairBoost = pickPairByLift(gamePairs, 'positive')
  const gamePairSuppressor = pickPairByLift(gamePairs, 'negative')
  const compressedShiftPair =
    gamePairs
      .filter((row) => row.pair.includes('compressedFork') && Number(row.lift) < 0)
      .sort((left, right) => left.lift - right.lift)[0] || null
  const reads = []
  if (teamF5Boost) {
    reads.push(`${teamF5Boost.dimension} is the current team F5 explosion boost: top quartile ${pct(teamF5Boost.high.f5ExplosionRate)} vs baseline ${pct(teamBaseline.f5ExplosionRate)} (${signedPct(teamF5Boost.lift.f5ExplosionRate)}).`)
  }
  if (teamF5Suppressor) {
    reads.push(`${teamF5Suppressor.dimension} is a suppressor/fork, not an over signal: 5+ F5 ${pct(teamF5Suppressor.high.f5ExplosionRate)} vs baseline ${pct(teamBaseline.f5ExplosionRate)}, dead F5 ${pct(teamF5Suppressor.high.f5DeadRate)}, bridge burst ${pct(teamF5Suppressor.high.bridgeBurstRate)}.`)
  }
  if (bridgeBoost) {
    reads.push(`${bridgeBoost.dimension} is the bridge-burst boost: top quartile ${pct(bridgeBoost.high.bridgeBurstRate)} vs baseline ${pct(teamBaseline.bridgeBurstRate)} (${signedPct(bridgeBoost.lift.bridgeBurstRate)}).`)
  }
  if (firstInningBoost) {
    reads.push(`${firstInningBoost.dimension} is the first-cycle boost: top quartile scored in the first ${pct(firstInningBoost.high.firstInningRate)} vs baseline ${pct(teamBaseline.firstInningRate)} (${signedPct(firstInningBoost.lift.firstInningRate)}).`)
  }
  if (gameF5Boost) {
    reads.push(`${gameF5Boost.dimension} is the game-level F5 total boost: top quartile F5 5+ ${pct(gameF5Boost.high.highF5TotalRate)} vs baseline ${pct(gameBaseline.highF5TotalRate)} (${signedPct(gameF5Boost.lift.highF5TotalRate)}).`)
  }
  if (gameF5Suppressor) {
    reads.push(`${gameF5Suppressor.dimension} suppresses early total shape: F5 5+ ${pct(gameF5Suppressor.high.highF5TotalRate)} vs baseline ${pct(gameBaseline.highF5TotalRate)}, with bridge 3+ ${pct(gameF5Suppressor.high.bridgeBurstRate)} and full 9+ ${pct(gameF5Suppressor.high.highFullTotalRate)}.`)
  }
  if (teamPairBoost && teamPairBoost.lift > 0) {
    reads.push(`Best positive team interaction: ${teamPairBoost.pair}, ${teamPairBoost.rows} rows, ${pct(teamPairBoost.f5ExplosionRate)} 5+ F5 explosion rate (${signedPct(teamPairBoost.lift)}).`)
  }
  if (gamePairBoost && gamePairBoost.lift > 0) {
    reads.push(`Best positive game interaction: ${gamePairBoost.pair}, ${gamePairBoost.rows} games, ${pct(gamePairBoost.highF5TotalRate)} F5 total 5+ rate (${signedPct(gamePairBoost.lift)}).`)
  }
  if (compressedShiftPair) {
    reads.push(`Compressed-fork phase shift: ${compressedShiftPair.pair} is not an F5 over signal (${pct(compressedShiftPair.highF5TotalRate)} F5 5+), but it moved pressure into the bridge (${pct(compressedShiftPair.bridgeBurstRate)} bridge 3+).`)
  } else if (gamePairSuppressor && gamePairSuppressor.lift < 0) {
    reads.push(`Strongest game suppressor: ${gamePairSuppressor.pair}, ${gamePairSuppressor.rows} games, ${pct(gamePairSuppressor.highF5TotalRate)} F5 total 5+ (${signedPct(gamePairSuppressor.lift)}).`)
  }

  const report = {
    schemaVersion: 1,
    modelId: 'MLB-M2',
    experiment: 'phase_shape_vector_search',
    options,
    coverage: {
      games: gameRows.length,
      teamVectors: teamRows.length,
      dates: [...dateSet].sort()
    },
    dimensionDefinitions,
    teamPhaseDimensions,
    gamePhaseDimensions,
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
  const markdownOut = path.join(reportDir, `phase-shape-vector-search-${safeRange}.md`)
  const jsonOut = path.join(privateDir, `mlb-m2-phase-shape-vector-search-${safeRange}.json`)
  fs.writeFileSync(markdownOut, buildMarkdown({ options, report }))
  fs.writeFileSync(jsonOut, JSON.stringify(report, null, 2))
  console.log(`Wrote ${markdownOut}`)
  console.log(`Wrote ${jsonOut}`)
  console.log(JSON.stringify({
    coverage: report.coverage,
    reads
  }, null, 2))
}

main()
