import { clamp, roundToTenths } from './core-utils.js'
import { teamNamesMatch } from './team-utils.js'

const hashSeedString = (value = '') => {
  let hash = 2166136261

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }

  return hash >>> 0
}

const createSeededRandom = (seed = 1) => {
  let state = seed >>> 0 || 1

  return () => {
    state += 0x6d2b79f5
    let value = state
    value = Math.imul(value ^ (value >>> 15), value | 1)
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61)

    return ((value ^ (value >>> 14)) >>> 0) / 4294967296
  }
}

const randomCentered = (rng, samples = 4) => {
  let total = 0

  for (let index = 0; index < samples; index += 1) {
    total += rng()
  }

  return total / samples - 0.5
}

const samplePoisson = (lambda, rng) => {
  if (!Number.isFinite(lambda) || lambda <= 0) return 0
  if (lambda < 0.18) return rng() < lambda ? 1 : 0

  const threshold = Math.exp(-Math.min(lambda, 8))
  let product = 1
  let count = 0

  do {
    count += 1
    product *= rng()
  } while (product > threshold && count < 24)

  return Math.max(0, count - 1)
}

const normalizeWeightArray = (weights = []) => {
  const sanitized = weights.map((weight) => Math.max(Number(weight) || 0, 0.01))
  const total = sanitized.reduce((sum, weight) => sum + weight, 0) || 1

  return sanitized.map((weight) => weight / total)
}

const buildFirstFiveWeights = (teamScript = {}) => {
  const weights = [0.23, 0.18, 0.21, 0.19, 0.19]
  const topThirdBias = clamp(((Number(teamScript?.topThirdScore) || 50) - 50) / 240, -0.08, 0.08)

  weights[0] += topThirdBias * 0.7
  weights[1] += topThirdBias * 0.45
  weights[2] += topThirdBias * 0.2
  weights[3] -= topThirdBias * 0.35
  weights[4] -= topThirdBias * 1

  return normalizeWeightArray(weights)
}

const buildLateWeights = (teamScript = {}) => {
  const weights = [0.29, 0.25, 0.24, 0.22]
  const depthBias = clamp(((Number(teamScript?.depthScore) || 50) - 50) / 220, -0.08, 0.08)

  weights[0] += depthBias * 0.12
  weights[1] += depthBias * 0.08
  weights[2] += depthBias * 0.04
  weights[3] -= depthBias * 0.24

  return normalizeWeightArray(weights)
}

const buildSimulationDriverList = (game, teamName, teamScript = {}) => {
  const scriptedDrivers = (teamScript?.overperformHitters || []).slice(0, 3).map((hitter) => hitter.name)
  const homeRunDrivers = [...(game.homeRunTargets?.likely || []), ...(game.homeRunTargets?.possible || [])]
    .filter((target) => teamNamesMatch(target.teamName, teamName))
    .map((target) => target.playerName)

  return [...new Set([...scriptedDrivers, ...homeRunDrivers])].slice(0, 3)
}

const buildSimulationTemperatureLabel = (temperature = 0.5) => {
  if (temperature <= 0.18) return 'Cold'
  if (temperature <= 0.42) return 'Stable'
  if (temperature <= 0.68) return 'Balanced'
  if (temperature <= 0.86) return 'Volatile'

  return 'Chaos'
}

const buildMlbSimulationTeamResult = ({
  game,
  teamName,
  teamScript,
  projectedRuns,
  projectedHits,
  first5ProjectedRuns,
  lateProjectedRuns,
  first5ProjectedHits,
  lateProjectedHits,
  hitEfficiencyPct,
  opposingBullpenExhaustion,
  isFirst5EdgeTeam,
  isLateEdgeTeam,
  temperature,
  rng
}) => {
  const inningRuns = []
  const firstFiveWeights = buildFirstFiveWeights(teamScript)
  const lateWeights = buildLateWeights(teamScript)
  const earlyShockChance =
    0.06 + temperature * 0.08 + Math.max((Number(teamScript?.topThirdScore) || 50) - 54, 0) * 0.002
  const lateShockChance =
    0.08 +
    temperature * 0.14 +
    (Number.isFinite(opposingBullpenExhaustion) ? opposingBullpenExhaustion * 0.003 : 0)
  const earlyShockInning = rng() < earlyShockChance ? 1 + Math.floor(rng() * 5) : null
  const lateShockInning = rng() < lateShockChance ? 6 + Math.floor(rng() * 4) : null

  firstFiveWeights.forEach((weight, index) => {
    const inningNumber = index + 1
    let lambda = first5ProjectedRuns * weight
    let multiplier = clamp(1 + randomCentered(rng, 4) * (0.42 + temperature * 0.48), 0.4, 1.95)

    if (isFirst5EdgeTeam) multiplier += 0.04
    if (inningNumber === earlyShockInning) multiplier += 0.38 + temperature * 0.26
    if (rng() < 0.14 - temperature * 0.04) multiplier *= 0.78

    inningRuns.push(samplePoisson(Math.max(lambda * multiplier, 0.02), rng))
  })

  lateWeights.forEach((weight, index) => {
    const inningNumber = index + 6
    let lambda = lateProjectedRuns * weight
    let multiplier = clamp(
      1 + randomCentered(rng, 4) * (0.48 + temperature * 0.62),
      0.34,
      2.35
    )

    if (isLateEdgeTeam) multiplier += 0.06
    if (inningNumber === lateShockInning) {
      multiplier += 0.42 + temperature * 0.4 + (Number(opposingBullpenExhaustion) || 0) * 0.0035
    }
    if (rng() < 0.12 - temperature * 0.03) multiplier *= 0.82

    inningRuns.push(samplePoisson(Math.max(lambda * multiplier, 0.02), rng))
  })

  let runs = inningRuns.reduce((sum, value) => sum + value, 0)

  while (runs > 14) {
    const biggestInningIndex = inningRuns.findIndex((value) => value === Math.max(...inningRuns))

    if (biggestInningIndex === -1 || inningRuns[biggestInningIndex] <= 0) break

    inningRuns[biggestInningIndex] -= 1
    runs -= 1
  }

  const projectedTotalRuns = first5ProjectedRuns + lateProjectedRuns
  const runDrift = runs - projectedTotalRuns
  const hitVariance = 1.15 + temperature * 1.35 + (buildSimulationDriverList(game, teamName, teamScript).length - 1) * 0.12
  const hitMean =
    projectedHits +
    runDrift * 0.78 +
    ((Number(hitEfficiencyPct) || 24) - 24) * 0.05
  const minimumHits = Math.max(2, runs - 1)
  const hits = Math.round(clamp(hitMean + randomCentered(rng, 5) * hitVariance * 2.1, minimumHits, 18))
  const first5Share = projectedHits > 0 ? first5ProjectedHits / projectedHits : 0.54
  const first5Hits = Math.round(
    clamp(hits * first5Share + randomCentered(rng, 3) * 1.1, Math.max(1, inningRuns.slice(0, 5).reduce((sum, value) => sum + value, 0) - 1), hits)
  )
  const lateHits = Math.max(0, hits - first5Hits)
  const baseErrorChance = 0.11 + temperature * 0.04
  const errors = rng() < baseErrorChance ? (rng() < 0.18 ? 2 : 1) : 0

  return {
    teamName,
    inningRuns,
    runs,
    hits,
    errors,
    first5Runs: inningRuns.slice(0, 5).reduce((sum, value) => sum + value, 0),
    lateRuns: inningRuns.slice(5).reduce((sum, value) => sum + value, 0),
    first5Hits,
    lateHits,
    projectedRuns: roundToTenths(projectedTotalRuns),
    projectedHits,
    drivers: buildSimulationDriverList(game, teamName, teamScript)
  }
}

export const simulateMlbGame = (game, rawTemperature = 0.5, runIndex = 1) => {
  if (game?.league !== 'MLB' || !game?.analysis?.mlbProjection || !Array.isArray(game?.matchup)) return null

  const projection = game.analysis.mlbProjection
  const awayTeamName = game.matchup[0]?.name
  const homeTeamName = game.matchup[1]?.name

  if (!awayTeamName || !homeTeamName) return null

  const temperature = clamp(Number(rawTemperature) || 0.5, 0, 1)
  const rng = createSeededRandom(hashSeedString(`${game.id}:${temperature.toFixed(2)}:${runIndex}`))
  const awayScript =
    projection.teamScripts?.find((script) => teamNamesMatch(script.teamName, awayTeamName)) ??
    projection.teamScripts?.[0] ??
    {}
  const homeScript =
    projection.teamScripts?.find((script) => teamNamesMatch(script.teamName, homeTeamName)) ??
    projection.teamScripts?.[1] ??
    {}
  const awayResult = buildMlbSimulationTeamResult({
    game,
    teamName: awayTeamName,
    teamScript: awayScript,
    projectedRuns: projection.awayProjectedRuns,
    projectedHits: projection.awayProjectedHits,
    first5ProjectedRuns: projection.awayFirst5ProjectedRuns,
    lateProjectedRuns: projection.awayLateProjectedRuns,
    first5ProjectedHits: projection.awayFirst5ProjectedHits,
    lateProjectedHits: projection.awayLateProjectedHits,
    hitEfficiencyPct: projection.awayHitEfficiencyPct,
    opposingBullpenExhaustion: projection.homeBullpenExhaustion,
    isFirst5EdgeTeam: projection.first5EdgeTeam === awayTeamName,
    isLateEdgeTeam: projection.lateEdgeTeam === awayTeamName,
    temperature,
    rng
  })
  const homeResult = buildMlbSimulationTeamResult({
    game,
    teamName: homeTeamName,
    teamScript: homeScript,
    projectedRuns: projection.homeProjectedRuns,
    projectedHits: projection.homeProjectedHits,
    first5ProjectedRuns: projection.homeFirst5ProjectedRuns,
    lateProjectedRuns: projection.homeLateProjectedRuns,
    first5ProjectedHits: projection.homeFirst5ProjectedHits,
    lateProjectedHits: projection.homeLateProjectedHits,
    hitEfficiencyPct: projection.homeHitEfficiencyPct,
    opposingBullpenExhaustion: projection.awayBullpenExhaustion,
    isFirst5EdgeTeam: projection.first5EdgeTeam === homeTeamName,
    isLateEdgeTeam: projection.lateEdgeTeam === homeTeamName,
    temperature,
    rng
  })

  let inningNumber = 10

  while (awayResult.runs === homeResult.runs && inningNumber <= 11) {
    const awayExtra = samplePoisson(
      Math.max(
        projection.awayLateProjectedRuns * 0.18 * (0.76 + temperature * 0.34) +
          (projection.homeBullpenExhaustion || 0) * 0.0022,
        0.08
      ),
      rng
    )
    const homeExtra = samplePoisson(
      Math.max(
        projection.homeLateProjectedRuns * 0.19 * (0.78 + temperature * 0.34) +
          (projection.awayBullpenExhaustion || 0) * 0.0022,
        0.08
      ),
      rng
    )

    awayResult.inningRuns.push(awayExtra)
    homeResult.inningRuns.push(homeExtra)
    awayResult.runs += awayExtra
    homeResult.runs += homeExtra
    awayResult.lateRuns += awayExtra
    homeResult.lateRuns += homeExtra
    inningNumber += 1
  }

  if (awayResult.runs === homeResult.runs) {
    const modelWinnerIndex = projection.edgeTeam === awayTeamName ? 0 : 1
    const target = modelWinnerIndex === 0 ? awayResult : homeResult
    target.inningRuns[target.inningRuns.length - 1] += 1
    target.runs += 1
    target.lateRuns += 1
  }

  const innings = Array.from({ length: awayResult.inningRuns.length }, (_, index) => index + 1)
  const winner = awayResult.runs > homeResult.runs ? awayResult : homeResult
  const loser = winner === awayResult ? homeResult : awayResult
  const first5Leader =
    awayResult.first5Runs === homeResult.first5Runs
      ? 'First five finish level'
      : `${awayResult.first5Runs > homeResult.first5Runs ? awayTeamName : homeTeamName} edge the first five ${awayResult.first5Runs}-${homeResult.first5Runs}`
  const lateLeader =
    awayResult.lateRuns === homeResult.lateRuns
      ? 'Late innings stay level'
      : `${awayResult.lateRuns > homeResult.lateRuns ? awayTeamName : homeTeamName} own the bridge-and-finish lanes ${awayResult.lateRuns}-${homeResult.lateRuns}`
  const upset =
    projection.edgeTeam && !teamNamesMatch(winner.teamName, projection.edgeTeam)
  const lineupsPosted =
    game.lineupBoard?.status?.away === 'posted' && game.lineupBoard?.status?.home === 'posted'
  const temperatureLabel = buildSimulationTemperatureLabel(temperature)

  return {
    temperature,
    temperatureLabel,
    runIndex,
    innings,
    away: awayResult,
    home: homeResult,
    winner: winner.teamName,
    loser: loser.teamName,
    wentExtras: innings.length > 9,
    upset,
    summary: `${winner.teamName} ${winner.runs}, ${loser.teamName} ${loser.runs}${innings.length > 9 ? ` in ${innings.length}` : ''}.`,
    overview: upset
      ? `${winner.teamName} flip the script in a ${temperatureLabel.toLowerCase()} sim, even though ${projection.edgeTeam} held the cleaner base read.`
      : `${winner.teamName} hold the stronger model lane in a ${temperatureLabel.toLowerCase()} sim.`,
    phaseSummary: `${first5Leader}. ${lateLeader}.`,
    lineupNote: lineupsPosted
      ? 'Both official batting orders were posted when this sim was built.'
      : 'At least one batting order is still incomplete, so this sim is looser than the full posted-lineup version.',
    favoredTeam: projection.edgeTeam || ''
  }
}
