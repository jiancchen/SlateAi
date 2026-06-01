import { clamp, roundToTenths } from '../../../../shared/sports-core/core-utils.js'

const RF_RESEARCH_BASELINE = Object.freeze({
  source: 'development-docs/mlb/research/mlb-ml-tech-stack-052526.md',
  lanes: {
    moneyline: {
      model: 'RandomForestClassifier',
      accuracyPct: 51.63,
      playHitRatePct: 53.5,
      deployable: false
    },
    first5: {
      model: 'RandomForestClassifier',
      accuracyPct: 52.58,
      playHitRatePct: 55.4,
      deployable: false
    },
    totals: {
      model: 'RandomForestClassifier',
      accuracyPct: 55.66,
      playHitRatePct: 68.9,
      deployable: true
    },
    firstInning: {
      model: 'RandomForestClassifier',
      accuracyPct: 54.17,
      playHitRatePct: 59.4,
      deployable: false
    }
  }
})

const safeNumber = (value) => {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : null
}

const metricValues = (profiles = [], key) =>
  profiles
    .map((profile) => safeNumber(profile?.[key]))
    .filter((value) => Number.isFinite(value))

const maxMetric = (profiles = [], key) => {
  const values = metricValues(profiles, key)
  return values.length ? Math.max(...values) : null
}

const minMetric = (profiles = [], key) => {
  const values = metricValues(profiles, key)
  return values.length ? Math.min(...values) : null
}

const pct = (value) => (Number.isFinite(value) ? value * 100 : null)

const teamNameMatches = (left = '', right = '') =>
  String(left || '').trim().toLowerCase() === String(right || '').trim().toLowerCase()

const countDistinctTeams = (names = []) => {
  const normalized = names
    .map((name) => String(name || '').trim().toLowerCase())
    .filter(Boolean)
  return new Set(normalized).size
}

const buildMetricNotes = ({
  maxMistakeChaos,
  maxRunClustering,
  maxOneBadInningAllowed,
  maxQuietFirst5,
  maxDeadBatTraffic,
  maxTrafficNoConversion,
  minLineupConversion,
  maxBullpenChaos,
  weather
}) => {
  const notes = []
  if (Number.isFinite(maxMistakeChaos) && maxMistakeChaos >= 62) {
    notes.push(`mistake-chaos ${roundToTenths(maxMistakeChaos)}`)
  }
  if (Number.isFinite(maxRunClustering) && maxRunClustering >= 64) {
    notes.push(`run-cluster ${roundToTenths(maxRunClustering)}`)
  }
  if (Number.isFinite(maxOneBadInningAllowed) && maxOneBadInningAllowed >= 0.5) {
    notes.push(`one-bad-inning risk ${roundToTenths(maxOneBadInningAllowed * 100)}%`)
  }
  if (Number.isFinite(maxQuietFirst5) && maxQuietFirst5 >= 0.52) {
    notes.push(`quiet-first-five ${roundToTenths(maxQuietFirst5 * 100)}%`)
  }
  if (Number.isFinite(maxDeadBatTraffic) && maxDeadBatTraffic >= 0.45) {
    notes.push(`dead traffic ${roundToTenths(maxDeadBatTraffic * 100)}%`)
  }
  if (Number.isFinite(maxTrafficNoConversion) && maxTrafficNoConversion >= 0.28) {
    notes.push(`traffic-no-conversion ${roundToTenths(maxTrafficNoConversion * 100)}%`)
  }
  if (Number.isFinite(minLineupConversion) && minLineupConversion <= 28) {
    notes.push(`low conversion floor ${roundToTenths(minLineupConversion)}`)
  }
  if (Number.isFinite(maxBullpenChaos) && maxBullpenChaos >= 52) {
    notes.push(`bullpen chaos ${roundToTenths(maxBullpenChaos)}`)
  }
  if (weather?.label) notes.push(weather.label)

  return notes
}

const pickShapeLabel = ({ chaosScore, deadEarlyScore, phaseSplitScore, bullpenFlipScore, starterControlScore }) => {
  if (chaosScore >= 70) return 'crooked-inning chaos'
  if (deadEarlyScore >= 66 && chaosScore < 58) return 'dead-early grind'
  if (phaseSplitScore >= 54) return 'starter/late split'
  if (bullpenFlipScore >= 62) return 'bullpen-flip game'
  if (starterControlScore >= 68 && chaosScore < 52) return 'starter-control lane'
  return 'balanced traffic game'
}

const buildRfLens = ({ projection = {}, shapeScores = {}, realityGapScore }) => {
  const fullTotal = projection?.totals?.fullGame
  const first5Total = projection?.totals?.first5
  const totalVetoCount = [fullTotal, first5Total].filter((lean) => lean?.chaosGate?.vetoed).length
  const chaosGateScore = Math.max(
    Number(fullTotal?.chaosGate?.overChaosScore || 0),
    Number(fullTotal?.chaosGate?.underDragScore || 0),
    Number(first5Total?.chaosGate?.overChaosScore || 0),
    Number(first5Total?.chaosGate?.underDragScore || 0)
  )
  const impactScore = clamp(
    (shapeScores.chaosScore || 0) * 0.32 +
      (shapeScores.deadEarlyScore || 0) * 0.22 +
      realityGapScore * 0.24 +
      chaosGateScore * 2.2 +
      totalVetoCount * 8,
    0,
    100
  )
  const totalStatus =
    totalVetoCount > 0
      ? 'RF totals baseline supports treating the raw total as shape-sensitive, not automatic.'
      : Math.abs(Number(fullTotal?.edge || 0)) >= 0.8
        ? 'RF totals baseline can be used as a second check on the posted total.'
        : 'RF totals baseline has little to add when the line and projection are nearly equal.'

  return {
    source: RF_RESEARCH_BASELINE.source,
    mode: 'research baseline lens',
    impactScore: roundToTenths(impactScore),
    laneBaselines: RF_RESEARCH_BASELINE.lanes,
    trustedUse: 'Use RF as a nonlinear totals/game-shape check first. Do not let it pick ML/F5 by itself yet.',
    totalsRead: totalStatus,
    moneylineRead: 'RF moneyline history is not deployable; it can only flag disagreement for review.',
    first5Read: 'RF first-five history is not deployable; use it as a timing warning, not a pick.',
    firstInningRead: 'RF first-inning history is not deployable; keep it behind explicit early-run features.'
  }
}

const buildMarketImplications = ({ shapeLabel, shapeScores, projection = {}, pickName = '', opponentName = '' }) => {
  const fullTotal = projection?.totals?.fullGame
  const first5Total = projection?.totals?.first5
  const firstInning = projection?.firstInning
  const highRealityGap = (shapeScores.realityGapScore || 0) >= 64
  const highChaos = (shapeScores.chaosScore || 0) >= 66
  const deadEarly = (shapeScores.deadEarlyScore || 0) >= 64
  const phaseSplit = (shapeScores.phaseSplitScore || 0) >= 54

  return {
    side:
      highRealityGap || phaseSplit
        ? `Do not treat ${pickName || 'the lean'} as a plain full-game ML. Price the starter window, bridge, and conversion risk separately.`
        : `${pickName || 'The lean'} is more coherent as a side because the game shape mostly agrees with the projection.`,
    first5:
      phaseSplit
        ? 'First-five may be cleaner than full game if the starter-window edge is on the pick and the late edge flips.'
        : deadEarly
          ? 'First-five side needs proof of early traffic converting; dead-early shape can bury a good paper edge.'
          : 'First-five can stay live if starter hold and top-order pressure both agree.',
    total:
      fullTotal?.chaosGate?.vetoed || first5Total?.chaosGate?.vetoed || highChaos
        ? 'Totals need chaos-gate respect; raw run projection is not enough when one-bad-inning or warm-carry risk is live.'
        : fullTotal?.lean && fullTotal.lean !== 'Pass'
          ? `${fullTotal.lean} is allowed only if RF/totals backtest agrees with the line bucket.`
          : 'No forced total edge. Wait for a line move or a clearer first-five total.',
    firstInning:
      firstInning?.pick && firstInning.pick !== 'Pass'
        ? `${firstInning.pick} is the timing lane to compare against the side; modeled chance ${firstInning.yesProbabilityPct ?? 'N/A'}% YRFI.`
        : `No first-inning force; ${opponentName || 'the opponent'} still matters through early conversion shape.`
  }
}

const buildMlbGameShapeRead = ({
  participants = [],
  context = {},
  mlbIndicators = {},
  winnerIndex = 0,
  modelEdge = 0,
  confidence = 0,
  volatility = 0,
  marketProbabilities = [],
  pickIsMarketFavorite = false,
  pickIsMarketUnderdog = false
} = {}) => {
  const projection = context.mlbProjection ?? {}
  const riskContext = context.mlbRiskContext ?? {}
  const teamMistakeShapes = riskContext.teamMistakeShapes ?? []
  const lineupConversionShapes = riskContext.lineupConversionShapes ?? []
  const bullpenMistakeShapes = riskContext.bullpenMistakeShapes ?? []
  const weather = projection.weather ?? riskContext.weatherProfile ?? null
  const pick = participants[winnerIndex] ?? null
  const opponent = participants[winnerIndex === 0 ? 1 : 0] ?? null
  const phaseTeams = [
    projection.edgeTeam,
    projection.first5EdgeTeam,
    projection.lateEdgeTeam,
    projection.bridgeEdgeTeam
  ].filter(Boolean)
  const distinctPhaseTeams = countDistinctTeams(phaseTeams)
  const pickPhaseMisses = phaseTeams.filter((teamName) => pick && !teamNameMatches(teamName, pick.name)).length
  const favoriteProbability =
    marketProbabilities.length === participants.length
      ? Math.max(...marketProbabilities.filter((value) => Number.isFinite(value)))
      : null
  const favoritePressure =
    pickIsMarketFavorite && Number.isFinite(favoriteProbability)
      ? clamp((favoriteProbability - 0.58) * 120, 0, 28)
      : 0

  const maxMistakeChaos = maxMetric(teamMistakeShapes, 'mistakeChaosIndex')
  const maxRunClustering = maxMetric(teamMistakeShapes, 'runClusteringIndex')
  const maxOneBadInningAllowed = maxMetric(teamMistakeShapes, 'oneBadInningAllowedRate')
  const maxQuietFirst5 = maxMetric(lineupConversionShapes, 'quietFirst5Rate')
  const maxDeadBatTraffic = Math.max(
    maxMetric(teamMistakeShapes, 'deadBatTrafficRate') ?? 0,
    maxMetric(lineupConversionShapes, 'deadBatTrafficRate') ?? 0
  )
  const maxTrafficNoConversion = Math.max(
    maxMetric(teamMistakeShapes, 'trafficNoConversionRate') ?? 0,
    maxMetric(lineupConversionShapes, 'trafficNoConversionRate') ?? 0
  )
  const minLineupConversion = minMetric(lineupConversionShapes, 'lineupConversionIndex')
  const maxBullpenChaos = maxMetric(bullpenMistakeShapes, 'bullpenChaosIndex')
  const maxBullpenMeltdown = maxMetric(bullpenMistakeShapes, 'bullpenMeltdownGameRate')
  const weatherCarry = weather?.label && /carry|wind out/i.test(weather.label)

  const chaosScore = clamp(
    (maxMistakeChaos ?? 45) * 0.42 +
      (maxRunClustering ?? 45) * 0.22 +
      pct(maxOneBadInningAllowed ?? 0.24) * 0.2 +
      (maxBullpenChaos ?? 35) * 0.12 +
      pct(maxBullpenMeltdown ?? 0.1) * 0.1 +
      (weatherCarry ? 6 : 0),
    0,
    100
  )
  const deadEarlyScore = clamp(
    pct(maxQuietFirst5 ?? 0.25) * 0.34 +
      pct(maxDeadBatTraffic ?? 0.2) * 0.27 +
      pct(maxTrafficNoConversion ?? 0.12) * 0.22 +
      (Number.isFinite(minLineupConversion) ? clamp(45 - minLineupConversion, 0, 45) * 0.7 : 0),
    0,
    100
  )
  const phaseSplitScore = clamp(
    (distinctPhaseTeams > 1 ? 28 : 0) +
      pickPhaseMisses * 12 +
      (Number(projection.edgeHits || 0) <= 0.5 ? 8 : 0) +
      (Number(projection.first5EdgeHits || 0) <= 0.3 ? 8 : 0) +
      (Number(projection.lateEdgeHits || 0) <= 0.3 ? 8 : 0),
    0,
    100
  )
  const bullpenFlipScore = clamp(
    (Number(mlbIndicators?.reliefPitchingRisk || 0) - 38) * 1.2 +
      (Number(mlbIndicators?.lateInningStabilityIndex || 50) < 48 ? 16 : 0) +
      Math.abs(Number(projection.bridgeEdgeScore || 0)) * 1.1 +
      (maxBullpenChaos ?? 35) * 0.18,
    0,
    100
  )
  const starterControlScore = clamp(
    Number(mlbIndicators?.starterLeverageIndex || 0) * 0.45 +
      Math.max(Number(mlbIndicators?.pickStarterScore || 0) - Number(mlbIndicators?.oppStarterScore || 0), 0) * 0.55 +
      Math.max(Number(projection.first5EdgeHits || 0), 0) * 7 -
      deadEarlyScore * 0.18,
    0,
    100
  )
  const marketContradictionScore = clamp(
    (pickIsMarketUnderdog ? 12 : 0) +
      favoritePressure +
      Math.max(0, Number(volatility || 0) - Number(confidence || 0)) * 0.45 +
      Math.max(0, Number(modelEdge || 0) - 8) * 0.35,
    0,
    100
  )
  const blendedRealityGap = clamp(
    chaosScore * 0.3 +
      deadEarlyScore * 0.22 +
      phaseSplitScore * 0.22 +
      bullpenFlipScore * 0.14 +
      marketContradictionScore * 0.12,
    0,
    100
  )
  const highShapeCount = [
    chaosScore,
    deadEarlyScore,
    phaseSplitScore,
    bullpenFlipScore
  ].filter((score) => score >= 65).length
  const realityGapScore = clamp(
    Math.max(
      blendedRealityGap,
      chaosScore * 0.82,
      deadEarlyScore * 0.78,
      phaseSplitScore * 0.8,
      bullpenFlipScore * 0.72
    ) +
      highShapeCount * 4 +
      marketContradictionScore * 0.08,
    0,
    100
  )
  const shapeScores = {
    chaosScore: roundToTenths(chaosScore),
    deadEarlyScore: roundToTenths(deadEarlyScore),
    phaseSplitScore: roundToTenths(phaseSplitScore),
    bullpenFlipScore: roundToTenths(bullpenFlipScore),
    starterControlScore: roundToTenths(starterControlScore),
    marketContradictionScore: roundToTenths(marketContradictionScore),
    realityGapScore: roundToTenths(realityGapScore)
  }
  const label = pickShapeLabel(shapeScores)
  const metricNotes = buildMetricNotes({
    maxMistakeChaos,
    maxRunClustering,
    maxOneBadInningAllowed,
    maxQuietFirst5,
    maxDeadBatTraffic,
    maxTrafficNoConversion,
    minLineupConversion,
    maxBullpenChaos,
    weather
  })
  const marketImplications = buildMarketImplications({
    shapeLabel: label,
    shapeScores,
    projection,
    pickName: pick?.name,
    opponentName: opponent?.name
  })
  const rfLens = buildRfLens({ projection, shapeScores, realityGapScore: shapeScores.realityGapScore })

  return {
    modelId: 'MLB-M2',
    label,
    summary:
      `${label}: reality-gap ${shapeScores.realityGapScore}/100. ` +
      (metricNotes.length
        ? `Main checks: ${metricNotes.slice(0, 4).join('; ')}.`
        : 'No single chaos metric dominates this game.'),
    pickTeam: pick?.name ?? '',
    opponentTeam: opponent?.name ?? '',
    scores: shapeScores,
    phaseMap: {
      fullGameTraffic: projection.edgeTeam || '',
      first5: projection.first5EdgeTeam || '',
      late: projection.lateEdgeTeam || '',
      bridge: projection.bridgeEdgeTeam || '',
      distinctPhaseTeams,
      pickPhaseMisses
    },
    metrics: {
      maxMistakeChaos: Number.isFinite(maxMistakeChaos) ? roundToTenths(maxMistakeChaos) : null,
      maxRunClustering: Number.isFinite(maxRunClustering) ? roundToTenths(maxRunClustering) : null,
      maxOneBadInningAllowedPct: Number.isFinite(maxOneBadInningAllowed)
        ? roundToTenths(maxOneBadInningAllowed * 100)
        : null,
      maxQuietFirst5Pct: Number.isFinite(maxQuietFirst5) ? roundToTenths(maxQuietFirst5 * 100) : null,
      maxDeadBatTrafficPct: Number.isFinite(maxDeadBatTraffic) ? roundToTenths(maxDeadBatTraffic * 100) : null,
      maxTrafficNoConversionPct: Number.isFinite(maxTrafficNoConversion)
        ? roundToTenths(maxTrafficNoConversion * 100)
        : null,
      minLineupConversion: Number.isFinite(minLineupConversion) ? roundToTenths(minLineupConversion) : null,
      maxBullpenChaos: Number.isFinite(maxBullpenChaos) ? roundToTenths(maxBullpenChaos) : null
    },
    metricNotes,
    marketImplications,
    rfLens
  }
}

export {
  buildMlbGameShapeRead,
  RF_RESEARCH_BASELINE
}
