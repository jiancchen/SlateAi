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
  weather,
  sunVisibility
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
  if (Number(sunVisibility?.visibilityRiskScore) >= 42) {
    notes.push(`sun visibility ${roundToTenths(Number(sunVisibility.visibilityRiskScore))}/100`)
  }

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

const phaseMatchesPick = (teamName, pickName) => Boolean(teamName && pickName && teamNameMatches(teamName, pickName))

const pctScore = (value, fallback = 50) => {
  const numeric = safeNumber(value)
  return Number.isFinite(numeric) ? clamp(numeric * 100, 0, 100) : fallback
}

const rawScore = (value, fallback = 50) => {
  const numeric = safeNumber(value)
  return Number.isFinite(numeric) ? clamp(numeric, 0, 100) : fallback
}

const getPrefixedIndicator = (mlbIndicators = {}, prefix, key) =>
  safeNumber(mlbIndicators?.[`${prefix}${key}`])

const buildParticipantRadarProfile = ({
  role,
  team,
  prefix,
  mlbIndicators = {},
  projection = {},
  weatherCarry = false,
  sunVisibilityRisk = null
}) => {
  const name = team?.name ?? ''
  const lineupConversion = getPrefixedIndicator(mlbIndicators, prefix, 'LineupConversionIndex')
  const topOrderPressure = getPrefixedIndicator(mlbIndicators, prefix, 'Top6Pressure')
  const starterScore = getPrefixedIndicator(mlbIndicators, prefix, 'StarterScore')
  const bullpenScore = getPrefixedIndicator(mlbIndicators, prefix, 'BullpenScore')
  const teamMistakeChaos = getPrefixedIndicator(mlbIndicators, prefix, 'TeamMistakeChaos')
  const runClustering = getPrefixedIndicator(mlbIndicators, prefix, 'TeamRunClustering')
  const bullpenChaos = getPrefixedIndicator(mlbIndicators, prefix, 'BullpenMistakeChaos')
  const relieverCommandRisk = getPrefixedIndicator(mlbIndicators, prefix, 'RelieverCommandRisk')
  const quietFirst5 = getPrefixedIndicator(mlbIndicators, prefix, 'QuietFirst5Rate')
  const scorelessFirst3 = getPrefixedIndicator(mlbIndicators, prefix, 'TeamScorelessFirst3Rate')
  const deadBatTraffic = getPrefixedIndicator(mlbIndicators, prefix, 'DeadBatTrafficRate')
  const trafficNoConversion = getPrefixedIndicator(mlbIndicators, prefix, 'TrafficNoConversionRate')
  const projectedHitEdge = safeNumber(mlbIndicators.projectedHitEdgeForPick)
  const hitEdgeBoost =
    role === 'pick' && Number.isFinite(projectedHitEdge)
      ? clamp(projectedHitEdge * 8, -14, 24)
      : role === 'opponent' && mlbIndicators.hitEdgeAgainstPick
        ? 12
        : 0
  const phaseTeams = [
    projection.edgeTeam,
    projection.first5EdgeTeam,
    projection.lateEdgeTeam,
    projection.bridgeEdgeTeam
  ].filter(Boolean)
  const ownedPhases = phaseTeams.filter((phaseTeam) => teamNameMatches(phaseTeam, name)).length
  const phaseOwnership = phaseTeams.length ? clamp((ownedPhases / phaseTeams.length) * 100, 0, 100) : 50
  const sunLift = Number.isFinite(sunVisibilityRisk) ? clamp((sunVisibilityRisk - 25) * 0.32, 0, 18) : 0

  const scores = {
    pressure: clamp(
      rawScore(lineupConversion, 44) * 0.44 +
        rawScore(topOrderPressure, 42) * 0.22 +
        rawScore(starterScore, 48) * 0.18 +
        hitEdgeBoost,
      0,
      100
    ),
    chaos: clamp(
      rawScore(teamMistakeChaos, 45) * 0.45 +
        rawScore(runClustering, 45) * 0.34 +
        rawScore(bullpenChaos, 35) * 0.21 +
        (weatherCarry ? 5 : 0) +
        sunLift,
      0,
      100
    ),
    freeze: clamp(
      pctScore(quietFirst5, 28) * 0.34 +
        pctScore(scorelessFirst3, 28) * 0.23 +
        pctScore(deadBatTraffic, 22) * 0.26 +
        pctScore(trafficNoConversion, 12) * 0.17,
      0,
      100
    ),
    air: clamp(
      rawScore(runClustering, 45) * 0.34 +
        rawScore(teamMistakeChaos, 45) * 0.24 +
        rawScore(topOrderPressure, 42) * 0.16 +
        (weatherCarry ? 16 : 0) +
        sunLift,
      0,
      100
    ),
    bridge: clamp(
      rawScore(bullpenChaos, 36) * 0.34 +
        rawScore(relieverCommandRisk, 34) * 0.28 +
        clamp(70 - rawScore(bullpenScore, 50), 0, 70) * 0.38,
      0,
      100
    ),
    flow: phaseOwnership
  }

  const roundedScores = Object.fromEntries(
    Object.entries(scores).map(([key, value]) => [key, roundToTenths(value)])
  )

  return {
    role,
    team: name,
    scores: roundedScores,
    polygon: ['pressure', 'chaos', 'freeze', 'air', 'bridge', 'flow'].map((axis) => roundedScores[axis]),
    phaseOwnershipPct: roundToTenths(phaseOwnership),
    inputs: {
      lineupConversion: Number.isFinite(lineupConversion) ? roundToTenths(lineupConversion) : null,
      topOrderPressure: Number.isFinite(topOrderPressure) ? roundToTenths(topOrderPressure) : null,
      starterScore: Number.isFinite(starterScore) ? roundToTenths(starterScore) : null,
      bullpenScore: Number.isFinite(bullpenScore) ? roundToTenths(bullpenScore) : null,
      mistakeChaos: Number.isFinite(teamMistakeChaos) ? roundToTenths(teamMistakeChaos) : null,
      runClustering: Number.isFinite(runClustering) ? roundToTenths(runClustering) : null,
      bullpenChaos: Number.isFinite(bullpenChaos) ? roundToTenths(bullpenChaos) : null,
      quietFirst5Pct: Number.isFinite(quietFirst5) ? roundToTenths(quietFirst5 * 100) : null,
      deadBatTrafficPct: Number.isFinite(deadBatTraffic) ? roundToTenths(deadBatTraffic * 100) : null,
      trafficNoConversionPct: Number.isFinite(trafficNoConversion)
        ? roundToTenths(trafficNoConversion * 100)
        : null
    }
  }
}

const buildShapeRadar = ({
  pick,
  opponent,
  projection = {},
  mlbIndicators = {},
  shapeScores = {},
  category = {},
  weatherCarry = false,
  sunVisibilityRisk = null
}) => {
  const pickProfile = buildParticipantRadarProfile({
    role: 'pick',
    team: pick,
    prefix: 'pick',
    mlbIndicators,
    projection,
    weatherCarry,
    sunVisibilityRisk
  })
  const opponentProfile = buildParticipantRadarProfile({
    role: 'opponent',
    team: opponent,
    prefix: 'opp',
    mlbIndicators,
    projection,
    weatherCarry,
    sunVisibilityRisk
  })
  const gameScores = {
    pressure: Math.max(pickProfile.scores.pressure, opponentProfile.scores.pressure),
    chaos: rawScore(shapeScores.chaosScore, 45),
    freeze: rawScore(shapeScores.deadEarlyScore, 35),
    air: clamp(
      Math.max(pickProfile.scores.air, opponentProfile.scores.air) * 0.65 +
        (weatherCarry ? 14 : 0) +
        (Number.isFinite(sunVisibilityRisk) ? clamp((sunVisibilityRisk - 25) * 0.28, 0, 14) : 0),
      0,
      100
    ),
    bridge: rawScore(shapeScores.bullpenFlipScore, 35),
    flow: clamp(100 - rawScore(shapeScores.phaseSplitScore, 45), 0, 100)
  }
  const roundedGameScores = Object.fromEntries(
    Object.entries(gameScores).map(([key, value]) => [key, roundToTenths(value)])
  )
  const axisDefinitions = [
    {
      id: 'pressure',
      label: 'Pressure',
      read: 'Run creation pressure: lineup conversion, top-order pressure, starter-window support, and hit-edge pressure.'
    },
    {
      id: 'chaos',
      label: 'Chaos',
      read: 'Crooked-inning volatility: mistake chaos, run clustering, one-bad-inning, bullpen mistakes, carry, and visibility.'
    },
    {
      id: 'freeze',
      label: 'Freeze',
      read: 'Dead-offense risk: quiet first five, scoreless first three, dead traffic, and traffic without conversion.'
    },
    {
      id: 'air',
      label: 'Air',
      read: 'Contact carry and outfield-event risk: weather carry, sun visibility, hard air contact, and extra-base tail.'
    },
    {
      id: 'bridge',
      label: 'Bridge',
      read: 'Late-inning volatility: bullpen flip, reliever command risk, and middle-relief mistake exposure.'
    },
    {
      id: 'flow',
      label: 'Flow',
      read: 'Phase agreement: whether full game, first five, late, and bridge point in the same direction.'
    }
  ]
  const axes = axisDefinitions.map((axis) => ({
    ...axis,
    gameScore: roundedGameScores[axis.id],
    pickScore: pickProfile.scores[axis.id],
    opponentScore: opponentProfile.scores[axis.id]
  }))
  const dominantAxes = axes
    .filter((axis) => Number.isFinite(axis.gameScore))
    .sort((left, right) => right.gameScore - left.gameScore)
    .slice(0, 3)
    .map((axis) => ({ id: axis.id, label: axis.label, score: axis.gameScore }))

  return {
    version: 'MLB-M2-game-shape-radar-v1',
    scale: {
      min: 0,
      max: 100,
      highMeans: 'More of the named shape, not automatically better.'
    },
    axes,
    profiles: [pickProfile, opponentProfile],
    gameProfile: {
      label: category.label ?? 'Game shape',
      bestExpression: category.bestExpression ?? null,
      scores: roundedGameScores,
      polygon: axisDefinitions.map((axis) => roundedGameScores[axis.id]),
      dominantAxes
    }
  }
}

const buildInningMap = ({ slug, pickName = 'Pick', opponentName = 'Opponent' }) => {
  const maps = {
    clean_phase_stack: [
      ['1-2', `${pickName} should create traffic without needing immediate chaos.`, 'If the first six outs are empty, reduce side exposure.'],
      ['3-5', 'Starter and lineup edges should still point the same way.', 'Any early starter command loss breaks the stack.'],
      ['6-7', 'Bridge should protect the original side.', 'Watch inherited traffic, not just runs.'],
      ['8-9', 'Late bullpen should close without needing a comeback.', 'If the game is tied, price beats confidence.']
    ],
    early_pressure_side: [
      ['1-2', `${pickName} needs the first traffic pocket.`, 'No early baserunners means the edge decays quickly.'],
      ['3-5', 'First-five side is the cleanest expression.', 'Do not wait for late rescue if the starter edge is gone.'],
      ['6-7', 'Only keep full-game exposure if the bridge is not leaking.', 'A bullpen mismatch turns this into a hedge spot.'],
      ['8-9', 'Closeout depends on lead size more than raw team rating.', 'One-run late leads are not a free pass.']
    ],
    starter_to_bullpen_flip: [
      ['1-2', `${pickName} can look right early even if full-game ML is fragile.`, 'Entry belongs to F5 or live lead, not blind FG.'],
      ['3-5', 'This is the main scoring window for the pick.', 'If the pick trails after five, the original read is mostly gone.'],
      ['6-7', `${opponentName} can re-enter through the bridge.`, 'Expect hedge or live reversal pressure here.'],
      ['8-9', 'Late innings are not aligned with the pregame side.', 'Do not confuse early control with full-game safety.']
    ],
    late_rescue_side: [
      ['1-2', `${pickName} does not need to win the first inning.`, 'Avoid panic if early contact is decent.'],
      ['3-5', 'Starter window may be neutral or ugly.', 'F5 side is weaker than full-game/live.'],
      ['6-7', 'Bridge/late edge is the planned entry point.', 'Look for opponent starter exit or first reliever traffic.'],
      ['8-9', `${pickName} needs pressure after the starter turns over.`, 'This is a live-side shape, not a pregame comfort shape.']
    ],
    dead_zone_side: [
      ['1-2', 'The paper side can sit dead with traffic that does not score.', 'Only enter after visible conversion, not just baserunners.'],
      ['3-5', 'Quiet first-five shape can still be the cleanest timing window if starter edge agrees.', 'Separate F5 side, F5 under, and full-game ML.'],
      ['6-7', 'A single mistake can decide the game.', 'Do not add side exposure into a low-conversion tie.'],
      ['8-9', 'Late variance dominates if nobody converted early.', 'Treat price as the only reason to play.']
    ],
    false_favorite_conversion_trap: [
      ['1-2', 'Favorite price is asking to be paid before the lineup converts.', 'No first-cycle damage means the price is too expensive.'],
      ['3-5', 'The favorite must turn traffic into runs before the underdog gets a cheap inning.', 'Avoid laying tax into dead contact.'],
      ['6-7', 'If still close, the favorite edge is mostly market inertia.', 'Look for hedge/live underdog price instead.'],
      ['8-9', 'Late favorite bailout is not the base case.', 'Do not compound if the bridge is stressed.']
    ],
    crooked_inning_over: [
      ['1-2', 'Early quiet does not kill the over; one inning can do the work.', 'Look for walks, errors, and command misses.'],
      ['3-5', 'Starter crack is the main damage window.', 'If both starters are clean through five, reduce over chase.'],
      ['6-7', 'Bridge traffic can create the crooked inning.', 'Inherited runners matter more than ERA.'],
      ['8-9', 'Late add-on runs are live if bullpen command is thin.', 'Side read is secondary to run-shape.']
    ],
    starter_duel_under: [
      ['1-2', 'Clean first innings are part of the script.', 'One early run is survivable; multiple free passes are not.'],
      ['3-5', 'Starter command should keep the game compressed.', 'If either starter loses zone, under edge collapses.'],
      ['6-7', 'Bridge quality decides whether the under survives.', 'Avoid weak middle relief exposure.'],
      ['8-9', 'Late leverage can still leak one run.', 'Do not overfit to a shutout pace.']
    ],
    market_dog_pressure: [
      ['1-2', `${pickName} needs to make the favorite uncomfortable early.`, 'The edge is price plus pressure, not dominance.'],
      ['3-5', 'The underdog must keep starter-window contact alive.', 'If the favorite gets clean shutdown innings, exit discipline matters.'],
      ['6-7', 'The bridge is where the price can re-rate.', 'This is a live/plus-price lane before it is a safe winner.'],
      ['8-9', 'Keep only paid-for exposure late.', 'Free-roll logic beats hero-holding.']
    ],
    weather_chaos_carry: [
      ['1-2', 'Carry conditions can turn ordinary contact into early damage.', 'Outfield/defensive mistakes deserve extra weight.'],
      ['3-5', 'Starter command plus weather decides whether this becomes a track meet.', 'Side is weaker than total/HR shape.'],
      ['6-7', 'Bullpen contact in carry weather is dangerous.', 'Middle relief mistakes can flip the whole board.'],
      ['8-9', 'Late insurance runs stay live.', 'Do not treat a lead as fully stable.']
    ],
    balanced_traffic: [
      ['1-2', 'No single phase dominates yet.', 'Wait for which team creates the first real scoring pocket.'],
      ['3-5', 'Starter window should tell us whether side or total is cleaner.', 'Avoid forcing pregame certainty.'],
      ['6-7', 'Bridge shape can decide the final lane.', 'Check first reliever command.'],
      ['8-9', 'Late price should drive action.', 'Model confidence alone is not enough.']
    ]
  }

  return (maps[slug] || maps.balanced_traffic).map(([innings, expectation, watch]) => ({
    innings,
    expectation,
    watch
  }))
}

const buildCategory = ({
  shapeScores,
  projection = {},
  mlbIndicators = {},
  pick,
  opponent,
  pickIsMarketFavorite,
  pickIsMarketUnderdog,
  marketProbabilities = [],
  weatherCarry = false
}) => {
  const pickName = pick?.name || 'Pick'
  const opponentName = opponent?.name || 'Opponent'
  const pickOwnsFull = phaseMatchesPick(projection.edgeTeam, pickName)
  const pickOwnsFirst5 = phaseMatchesPick(projection.first5EdgeTeam, pickName)
  const pickOwnsLate = phaseMatchesPick(projection.lateEdgeTeam, pickName)
  const pickOwnsBridge = phaseMatchesPick(projection.bridgeEdgeTeam, pickName)
  const pickPhaseCount = [pickOwnsFull, pickOwnsFirst5, pickOwnsLate, pickOwnsBridge].filter(Boolean).length
  const favoriteProbability =
    marketProbabilities.length
      ? Math.max(...marketProbabilities.filter((value) => Number.isFinite(value)))
      : null

  const pickLineup = safeNumber(mlbIndicators.pickLineupConversionIndex)
  const opponentLineup = safeNumber(mlbIndicators.oppLineupConversionIndex)
  const pickQuietFirst5 = safeNumber(mlbIndicators.pickQuietFirst5Rate)
  const pickScorelessFirst3 = safeNumber(mlbIndicators.pickTeamScorelessFirst3Rate)
  const pickNoConversion = safeNumber(mlbIndicators.pickTrafficNoConversionRate)
  const pickDeadTraffic = safeNumber(mlbIndicators.pickDeadBatTrafficRate)
  const pickChaos = safeNumber(mlbIndicators.pickTeamMistakeChaos)
  const opponentChaos = safeNumber(mlbIndicators.oppTeamMistakeChaos)
  const pickBullpenChaos = safeNumber(mlbIndicators.pickBullpenMistakeChaos)
  const opponentBullpenChaos = safeNumber(mlbIndicators.oppBullpenMistakeChaos)
  const projectedHitEdge = safeNumber(mlbIndicators.projectedHitEdgeForPick)
  const starterGap =
    safeNumber(mlbIndicators.pickStarterScore) !== null && safeNumber(mlbIndicators.oppStarterScore) !== null
      ? safeNumber(mlbIndicators.pickStarterScore) - safeNumber(mlbIndicators.oppStarterScore)
      : null
  const bullpenGap =
    safeNumber(mlbIndicators.pickBullpenScore) !== null && safeNumber(mlbIndicators.oppBullpenScore) !== null
      ? safeNumber(mlbIndicators.pickBullpenScore) - safeNumber(mlbIndicators.oppBullpenScore)
      : null
  const opponentChaosGap =
    Number.isFinite(opponentChaos) && Number.isFinite(pickChaos) ? opponentChaos - pickChaos : 0
  const lineupGap =
    Number.isFinite(pickLineup) && Number.isFinite(opponentLineup) ? pickLineup - opponentLineup : 0
  const lowPickConversion =
    (Number.isFinite(pickLineup) && pickLineup <= 32) ||
    (Number.isFinite(pickNoConversion) && pickNoConversion >= 0.24) ||
    (Number.isFinite(pickDeadTraffic) && pickDeadTraffic >= 0.44)
  const quietPick =
    (Number.isFinite(pickQuietFirst5) && pickQuietFirst5 >= 0.5) ||
    (Number.isFinite(pickScorelessFirst3) && pickScorelessFirst3 >= 0.5)
  const bridgeAgainstPick = pickOwnsFirst5 && (!pickOwnsLate || !pickOwnsBridge)
  const lateOnly = !pickOwnsFirst5 && (pickOwnsLate || pickOwnsBridge)
  const phaseAligned = pickPhaseCount >= 3 && pickOwnsFull && pickOwnsFirst5
  const firstFiveExpression =
    pickOwnsFirst5 || (Number.isFinite(starterGap) && starterGap >= 7)
      ? `${pickName} first-five side`
      : 'No forced first-five side'

  const candidates = [
    {
      slug: 'weather_chaos_carry',
      when: weatherCarry && shapeScores.chaosScore >= 62,
      label: 'Weather-carry chaos',
      bestExpression: 'Totals / HR cluster before side',
      confidence: shapeScores.chaosScore,
      reasons: ['Carry/wind conditions amplify contact mistakes.', 'Side edge is secondary when ordinary contact can become damage.']
    },
    {
      slug: 'crooked_inning_over',
      when:
        shapeScores.chaosScore >= 68 ||
        (Number.isFinite(pickBullpenChaos) && pickBullpenChaos >= 56) ||
        (Number.isFinite(opponentBullpenChaos) && opponentBullpenChaos >= 56),
      label: 'Crooked-inning game',
      bestExpression: 'Full-game total / team total / HR cluster',
      confidence: shapeScores.chaosScore,
      reasons: ['Mistake and run-cluster shape can decide the board in one inning.', 'Moneyline is not the cleanest expression.']
    },
    {
      slug: 'false_favorite_conversion_trap',
      when:
        pickIsMarketFavorite &&
        Number.isFinite(favoriteProbability) &&
        favoriteProbability >= 0.62 &&
        (lowPickConversion || quietPick || Boolean(mlbIndicators.hitEdgeAgainstPick)),
      label: 'Favorite conversion trap',
      bestExpression: 'No taxed ML; require early conversion or better live price',
      confidence: clamp(shapeScores.deadEarlyScore + (favoriteProbability - 0.62) * 100, 0, 100),
      reasons: ['The favorite price is ahead of the lineup conversion profile.', 'Do not pay for runs the first cycle has not shown yet.']
    },
    {
      slug: 'dead_zone_side',
      when: shapeScores.deadEarlyScore >= 60 && (lowPickConversion || quietPick),
      label: 'Dead-zone side',
      bestExpression: 'First-five timing or live after conversion; no blind full-game ML',
      confidence: shapeScores.deadEarlyScore,
      reasons: ['Quiet-first-five and traffic-without-conversion are live.', 'Side entry needs proof of scoring, not just baserunners.']
    },
    {
      slug: 'starter_to_bullpen_flip',
      when: bridgeAgainstPick && (shapeScores.phaseSplitScore >= 48 || shapeScores.bullpenFlipScore >= 48 || (Number.isFinite(bullpenGap) && bullpenGap <= -5)),
      label: 'Starter-to-bullpen flip',
      bestExpression: firstFiveExpression,
      confidence: Math.max(shapeScores.phaseSplitScore, shapeScores.bullpenFlipScore),
      reasons: ['The pick can own the starter window without owning the late game.', 'Use the timing edge before bridge innings can flip it.']
    },
    {
      slug: 'late_rescue_side',
      when: lateOnly,
      label: 'Late-rescue side',
      bestExpression: 'Live side after starter exit',
      confidence: shapeScores.phaseSplitScore,
      reasons: ['The edge is late/bridge, not early comfort.', 'F5 side is weaker than a live entry after the starter turns over.']
    },
    {
      slug: 'early_pressure_side',
      when:
        pickOwnsFirst5 &&
        shapeScores.deadEarlyScore < 58 &&
        (lineupGap >= 8 || (Number.isFinite(projectedHitEdge) && projectedHitEdge >= 0.8)),
      label: 'Early-pressure side',
      bestExpression: 'Full-game side only if early traffic appears; live entry preferred',
      confidence: clamp(58 + Math.max(lineupGap, projectedHitEdge || 0) * 1.6, 0, 100),
      reasons: ['The pick needs to cash the first traffic pocket.', 'The best edge is timing, not late-game patience.']
    },
    {
      slug: 'starter_duel_under',
      when: shapeScores.starterControlScore >= 66 && shapeScores.chaosScore < 56 && shapeScores.deadEarlyScore >= 42,
      label: 'Starter-duel under',
      bestExpression: 'NRFI / first-five under',
      confidence: clamp(shapeScores.starterControlScore - shapeScores.chaosScore * 0.2 + shapeScores.deadEarlyScore * 0.25, 0, 100),
      reasons: ['Starter control and quiet early shape point to compression.', 'The side may be right but the cleaner bet is run suppression.']
    },
    {
      slug: 'market_dog_pressure',
      when:
        pickIsMarketUnderdog &&
        ((Number.isFinite(projectedHitEdge) && projectedHitEdge >= 0.6) || lineupGap >= 8 || opponentChaosGap >= 6),
      label: 'Underdog pressure lane',
      bestExpression: 'Plus-price ML / prediction-market spike',
      confidence: clamp(54 + Math.max(projectedHitEdge || 0, lineupGap * 0.35, opponentChaosGap * 0.45), 0, 100),
      reasons: ['The underdog has enough pressure to reprice the favorite.', 'This is a price-and-flow setup, not a safe-winner setup.']
    },
    {
      slug: 'clean_phase_stack',
      when: phaseAligned && shapeScores.realityGapScore < 58 && shapeScores.deadEarlyScore < 56,
      label: 'Clean phase stack',
      bestExpression: 'Full-game side if price is fair',
      confidence: clamp(62 + pickPhaseCount * 5 - shapeScores.realityGapScore * 0.25, 0, 100),
      reasons: ['Full-game, first-five, and late phases mostly agree.', 'Moneyline can be considered if the price is not taxed.']
    }
  ]

  const selected = candidates.find((candidate) => candidate.when) || {
    slug: 'balanced_traffic',
    label: 'Balanced traffic game',
    bestExpression: 'Wait for first real scoring pocket',
    confidence: clamp(50 + Math.max(shapeScores.realityGapScore - 50, 0) * 0.25, 0, 100),
    reasons: ['No single phase is dominant enough to force a lane.', 'Let the first scoring pocket choose side, total, or live entry.']
  }

  const laneMap = {
    side:
      selected.slug === 'clean_phase_stack'
        ? 'Allowed if price is fair and lineup card is intact.'
        : selected.slug === 'market_dog_pressure'
          ? 'Only plus-price or contract-spike exposure; do not treat it as a safe winner.'
          : selected.slug === 'early_pressure_side'
            ? 'Allowed after early traffic confirms the pressure read.'
          : selected.slug === 'late_rescue_side'
            ? 'Prefer live entry after starter exit.'
            : selected.slug.includes('trap') || selected.slug === 'dead_zone_side'
              ? 'No blind pregame ML; require visible conversion.'
              : 'Secondary to the named lane.',
    first5:
      selected.slug === 'starter_to_bullpen_flip' || selected.slug === 'early_pressure_side'
        ? selected.slug === 'starter_to_bullpen_flip'
          ? 'Primary lane.'
          : 'Only primary if the line is cheaper than full-game ML.'
        : selected.slug === 'starter_duel_under' || selected.slug === 'dead_zone_side'
          ? 'Compare F5 side and F5 under before full-game ML.'
          : 'Use only if starter and top-order pressure agree.',
    total:
      selected.slug === 'crooked_inning_over' || selected.slug === 'weather_chaos_carry'
        ? 'Primary lane; one crooked inning can beat a side read.'
        : selected.slug === 'starter_duel_under' || selected.slug === 'dead_zone_side'
          ? 'Under lanes are cleaner if the posted number is not already taxed.'
          : 'Needs line-specific EV.',
    firstInning:
      selected.slug === 'starter_duel_under' || selected.slug === 'dead_zone_side'
        ? 'NRFI is live if both teams lack first-cycle conversion.'
        : selected.slug === 'early_pressure_side'
          ? 'YRFI only if both top orders and starter leakage agree.'
          : 'Advisory only.',
    live:
      selected.slug === 'dead_zone_side' || selected.slug === 'false_favorite_conversion_trap'
        ? 'Enter only after a converted traffic pocket or a much better price.'
        : selected.slug === 'late_rescue_side'
          ? 'Best entry is after the opponent starter leaves.'
          : selected.slug === 'market_dog_pressure'
            ? 'Scale out if the favorite gets stressed early.'
            : 'Use price discipline.'
  }

  return {
    slug: selected.slug,
    label: selected.label,
    bestExpression: selected.bestExpression,
    confidence: roundToTenths(selected.confidence),
    reasons: selected.reasons,
    laneMap,
    inningMap: buildInningMap({ slug: selected.slug, pickName, opponentName }),
    diagnostics: {
      pickOwnsFull,
      pickOwnsFirst5,
      pickOwnsLate,
      pickOwnsBridge,
      pickPhaseCount,
      lowPickConversion,
      quietPick,
      lineupGap: roundToTenths(lineupGap),
      opponentChaosGap: roundToTenths(opponentChaosGap),
      projectedHitEdge: Number.isFinite(projectedHitEdge) ? roundToTenths(projectedHitEdge) : null
    }
  }
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
  const sunVisibility = projection.sunVisibility ?? riskContext.sunVisibility ?? null
  const sunVisibilityRisk = Number(sunVisibility?.visibilityRiskScore)
  const sunVisibilityChaosBoost = Number.isFinite(sunVisibilityRisk)
    ? clamp((sunVisibilityRisk - 35) * 0.08, 0, 5)
    : 0
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
      (weatherCarry ? 6 : 0) +
      sunVisibilityChaosBoost,
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
  const shapeLabel = pickShapeLabel(shapeScores)
  const metricNotes = buildMetricNotes({
    maxMistakeChaos,
    maxRunClustering,
    maxOneBadInningAllowed,
    maxQuietFirst5,
    maxDeadBatTraffic,
    maxTrafficNoConversion,
    minLineupConversion,
    maxBullpenChaos,
    weather,
    sunVisibility
  })
  const category = buildCategory({
    shapeScores,
    projection,
    mlbIndicators,
    pick,
    opponent,
    pickIsMarketFavorite,
    pickIsMarketUnderdog,
    marketProbabilities,
    weatherCarry
  })
  const radar = buildShapeRadar({
    pick,
    opponent,
    projection,
    mlbIndicators,
    shapeScores,
    category,
    weatherCarry,
    sunVisibilityRisk
  })
  const marketImplications = buildMarketImplications({
    shapeLabel,
    shapeScores,
    projection,
    pickName: pick?.name,
    opponentName: opponent?.name
  })
  const rfLens = buildRfLens({ projection, shapeScores, realityGapScore: shapeScores.realityGapScore })

  return {
    modelId: 'MLB-M2',
    label: category.label,
    shapeLabel,
    category,
    summary:
      `${category.label}: ${category.bestExpression}. Reality-gap ${shapeScores.realityGapScore}/100. ` +
      (metricNotes.length
        ? `Main checks: ${metricNotes.slice(0, 4).join('; ')}.`
        : 'No single chaos metric dominates this game.'),
    pickTeam: pick?.name ?? '',
    opponentTeam: opponent?.name ?? '',
    scores: shapeScores,
    radar,
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
      maxBullpenChaos: Number.isFinite(maxBullpenChaos) ? roundToTenths(maxBullpenChaos) : null,
      sunVisibilityRiskScore: Number.isFinite(sunVisibilityRisk) ? roundToTenths(sunVisibilityRisk) : null,
      sunVisibilityChaosBoost: Number.isFinite(sunVisibilityChaosBoost) ? roundToTenths(sunVisibilityChaosBoost) : null
    },
    metricNotes,
    laneMap: category.laneMap,
    inningMap: category.inningMap,
    marketImplications,
    rfLens
  }
}

export {
  buildMlbGameShapeRead,
  RF_RESEARCH_BASELINE
}
