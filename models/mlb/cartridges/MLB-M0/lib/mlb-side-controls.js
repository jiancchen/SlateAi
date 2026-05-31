import { clamp, getAnalysisTier, roundToTenths } from './core-utils.js'

const getMlbTierOneRiskPoints = ({
  volatility,
  modelEdge,
  lateInningStabilityIndex,
  starterLeverageIndex,
  coinflipPressure,
  reliefPitchingRisk,
  favoredSignalCount
}) =>
  [
    volatility >= 88,
    modelEdge >= 12,
    lateInningStabilityIndex <= 45,
    starterLeverageIndex >= 85,
    coinflipPressure >= 50,
    reliefPitchingRisk >= 65,
    favoredSignalCount <= 3
  ].filter(Boolean).length

export const applyMlbTierOneControls = ({
  confidence,
  volatility,
  modelEdge,
  starterLeverageIndex,
  lateInningStabilityIndex,
  reliefPitchingRisk,
  coinflipPressure,
  favoredSignalCount,
  pickStarterLeashScore,
  oppStarterLeashScore,
  marketProbability,
  pickIsMarketFavorite,
  statefulSuggestedEdgeHaircut,
  statefulSuggestedConfidenceHaircut,
  statefulOpponentSnapbackTrapFlag,
  tierThreeSuggestedEdgeHaircut,
  tierThreeSuggestedConfidenceHaircut,
  tierThreeBullpenCommandMismatchFlag
}) => {
  const starterLateGap = roundToTenths(starterLeverageIndex - lateInningStabilityIndex)
  const starterLeashGap =
    Number.isFinite(pickStarterLeashScore) && Number.isFinite(oppStarterLeashScore)
      ? roundToTenths(pickStarterLeashScore - oppStarterLeashScore)
      : null
  const marketFavoriteProbability = Number.isFinite(marketProbability) ? marketProbability : null
  const highVolatilityEdgePass =
    volatility >= 86 &&
    modelEdge >= 10 &&
    (lateInningStabilityIndex <= 48 || starterLeverageIndex >= 75)
  const thinSupportHighEdge = modelEdge >= 12 && favoredSignalCount <= 3
  const starterLateFragility =
    starterLeverageIndex >= 75 && lateInningStabilityIndex <= 48
  const negativeLeashGapBigEdge =
    Number.isFinite(starterLeashGap) && starterLeashGap <= -8 && modelEdge >= 10
  const severeNegativeLeashGap =
    Number.isFinite(starterLeashGap) && starterLeashGap <= -16 && modelEdge >= 12
  const expensiveFavoriteDanger =
    pickIsMarketFavorite === true &&
    Number.isFinite(marketFavoriteProbability) &&
    marketFavoriteProbability >= 0.6 &&
    (volatility >= 84 ||
      lateInningStabilityIndex <= 50 ||
      statefulOpponentSnapbackTrapFlag ||
      tierThreeBullpenCommandMismatchFlag)
  const heavyFavoriteDanger =
    expensiveFavoriteDanger &&
    Number.isFinite(marketFavoriteProbability) &&
    marketFavoriteProbability >= 0.65
  const underdogNeedsProof =
    pickIsMarketFavorite === false &&
    (starterLeverageIndex < 82 ||
      lateInningStabilityIndex < 52 ||
      favoredSignalCount < 5 ||
      volatility >= 82 ||
      statefulOpponentSnapbackTrapFlag)
  const moderateFavoriteClean =
    pickIsMarketFavorite === true &&
    Number.isFinite(marketFavoriteProbability) &&
    marketFavoriteProbability >= 0.54 &&
    marketFavoriteProbability < 0.63 &&
    !highVolatilityEdgePass &&
    !statefulOpponentSnapbackTrapFlag &&
    !tierThreeBullpenCommandMismatchFlag &&
    lateInningStabilityIndex >= 45 &&
    favoredSignalCount >= 4
  const riskPoints = getMlbTierOneRiskPoints({
    volatility,
    modelEdge,
    lateInningStabilityIndex,
    starterLeverageIndex,
    coinflipPressure,
    reliefPitchingRisk,
    favoredSignalCount
  })

  const tierOneNotes = []
  const riskFlags = []
  let edgeHaircut = 0
  let confidencePenalty = 0
  let volatilityBump = 0
  let confidenceBonus = 0
  let volatilityRelief = 0

  if (highVolatilityEdgePass) {
    riskFlags.push('highVolatilityEdgePass')
    edgeHaircut += 3
    confidencePenalty += 5
    volatilityBump += 2
    tierOneNotes.push({
      label:
        'Tier 1 edge control: a double-digit edge is still sitting in a high-volatility baseball script, so this should grade as a pass until the game proves cleaner.',
      delta: 6
    })
  }

  if (starterLateFragility) {
    riskFlags.push('starterLateFragility')
    edgeHaircut += 1.2
    confidencePenalty += 2
    volatilityBump += 2
    tierOneNotes.push({
      label:
        'Tier 1 starter-vs-late split: the starter edge is outrunning the late-inning hold profile, which makes the full-game side less trustworthy than the first-five read.',
      delta: 4
    })
  }

  if (thinSupportHighEdge) {
    riskFlags.push('thinSupportHighEdge')
    edgeHaircut += 1.8
    confidencePenalty += 3
    volatilityBump += 1
    tierOneNotes.push({
      label:
        'Tier 1 support check: the large edge is still being built from a thin evidence stack, so the side should be capped until more signals agree.',
      delta: 4
    })
  }

  if (negativeLeashGapBigEdge) {
    riskFlags.push('negativeLeashGapBigEdge')
    edgeHaircut += severeNegativeLeashGap ? 1.8 : 1.1
    confidencePenalty += severeNegativeLeashGap ? 3 : 2
    volatilityBump += severeNegativeLeashGap ? 2 : 1
    tierOneNotes.push({
      label:
        'Tier 1 leash gap: the pick still carries the shorter expected starter runway, so the paper edge needs more bullpen support before it can grade as clean.',
      delta: severeNegativeLeashGap ? 5 : 3
    })
  }

  if (riskPoints >= 3) {
    riskFlags.push('highRiskPoints')
    edgeHaircut += 0.8
    confidencePenalty += 2
    volatilityBump += 1
    tierOneNotes.push({
      label:
        'Tier 1 pass classifier: multiple risk buckets are stacked in the same game, so this read belongs closer to lean/watchlist territory than a clean conviction tier.',
      delta: 3
    })
  }

  if (statefulOpponentSnapbackTrapFlag) {
    riskFlags.push('statefulOpponentSnapback')
    edgeHaircut += statefulSuggestedEdgeHaircut || 4
    confidencePenalty += statefulSuggestedConfidenceHaircut || 8
    volatilityBump += 2
    tierOneNotes.push({
      label:
        'v1.1 state check: the opponent is carrying real snapback pressure, so the edge should be treated as much thinner than the broad baseline numbers suggest.',
      delta: 8
    })
  }

  if (tierThreeBullpenCommandMismatchFlag) {
    riskFlags.push('tierThreeBullpenMismatch')
    edgeHaircut += Math.min(tierThreeSuggestedEdgeHaircut || 2, 2)
    confidencePenalty += Math.min(tierThreeSuggestedConfidenceHaircut || 4, 4)
    volatilityBump += 2
    tierOneNotes.push({
      label:
        'v1.1 bullpen command check: the likely relief handoff still carries first-entry command risk against this side, so the full-game edge needs to be capped.',
      delta: 4
    })
  }

  if (expensiveFavoriteDanger) {
    riskFlags.push('expensiveFavoriteDanger')
    edgeHaircut += heavyFavoriteDanger ? 2.2 : 1.6
    confidencePenalty += heavyFavoriteDanger ? 4 : 3
    volatilityBump += heavyFavoriteDanger ? 2 : 1
    tierOneNotes.push({
      label:
        'v1.1 market budget: this favorite is already expensive on the board, so the model only gets a small disagreement budget unless the state and late-game profile stay clean.',
      delta: heavyFavoriteDanger ? 6 : 4
    })
  }

  if (underdogNeedsProof) {
    riskFlags.push('underdogNeedsProof')
    edgeHaircut += 2.1
    confidencePenalty += 4
    volatilityBump += 1
    tierOneNotes.push({
      label:
        'v1.1 market budget: this underdog call still needs cleaner starter, stability, and state support before it can be treated like a real market disagreement edge.',
      delta: 5
    })
  }

  if (moderateFavoriteClean) {
    riskFlags.push('moderateFavoriteClean')
    confidenceBonus += 1
    volatilityRelief += 1
    tierOneNotes.push({
      label:
        'v1.1 market lane: this sits in the healthier moderate-favorite range with a cleaner state/risk profile than the average board favorite.',
      delta: -2
    })
  }

  edgeHaircut = clamp(roundToTenths(edgeHaircut), 0, 5.5)
  const adjustedModelEdge = roundToTenths(clamp(modelEdge - edgeHaircut, 0, 100))
  const adjustedConfidence = Math.round(
    clamp(confidence - confidencePenalty + confidenceBonus, 52, 89)
  )
  const adjustedVolatility = Math.round(
    clamp(volatility + volatilityBump - volatilityRelief, 30, 92)
  )

  let selectionTier = getAnalysisTier(adjustedConfidence, adjustedVolatility)

  if (highVolatilityEdgePass) {
    selectionTier = 'Pass'
  } else if (riskPoints >= 4) {
    selectionTier = 'Pass'
  } else if (expensiveFavoriteDanger && heavyFavoriteDanger && selectionTier === 'Core') {
    selectionTier = 'Strong'
  } else if (underdogNeedsProof && (selectionTier === 'Core' || selectionTier === 'Strong')) {
    selectionTier = 'Lean'
  } else if (riskPoints >= 3) {
    if (selectionTier === 'Core' || selectionTier === 'Strong') {
      selectionTier = 'Lean'
    }
  } else if (riskPoints >= 2 && selectionTier === 'Core') {
    selectionTier = 'Strong'
  }

  return {
    adjustedConfidence,
    adjustedVolatility,
    adjustedModelEdge,
    selectionTier,
    riskPoints,
    riskFlags,
    favoredSignalCount,
    starterLateGap,
    starterLeashGap,
    edgeHaircut,
    passFlag: selectionTier === 'Pass',
    notes: tierOneNotes
  }
}

export const buildMlbResearchVetoFlags = ({
  enableQuietStartFullGameGate = false,
  marketProbability,
  pickIsMarketFavorite,
  pickIsMarketUnderdog,
  pickLineupConversionIndex,
  pickDeadBatTrafficRate,
  pickTeamScorelessFirst3Rate,
  pickTrafficNoConversionRate,
  pickQuietFirst5Rate,
  pickBullpenMistakeChaos,
  oppBullpenMistakeChaos,
  pickTeamRunClustering,
  pickTeamMistakeChaos,
  oppTeamMistakeChaos
}) => {
  const heavyFavoriteWeakLineupFlag =
    pickIsMarketFavorite === true &&
    Number.isFinite(marketProbability) &&
    marketProbability >= 0.6 &&
    Number.isFinite(pickLineupConversionIndex) &&
    pickLineupConversionIndex <= 25

  const heavyFavoriteNoisyBullpenFlag =
    pickIsMarketFavorite === true &&
    Number.isFinite(marketProbability) &&
    marketProbability >= 0.6 &&
    Number.isFinite(pickBullpenMistakeChaos) &&
    pickBullpenMistakeChaos >= 50

  const deadEarlyRiskFlag =
    Number.isFinite(pickLineupConversionIndex) &&
    pickLineupConversionIndex <= 35 &&
    Number.isFinite(pickDeadBatTrafficRate) &&
    pickDeadBatTrafficRate >= 0.3

  const quietStartRiskFlag =
    enableQuietStartFullGameGate &&
    Number.isFinite(pickTeamScorelessFirst3Rate) &&
    pickTeamScorelessFirst3Rate >= 0.3
  const trafficNoConversionRiskFlag =
    enableQuietStartFullGameGate &&
    Number.isFinite(pickTrafficNoConversionRate) &&
    pickTrafficNoConversionRate >= 0.2
  const quietFirst5RiskFlag =
    enableQuietStartFullGameGate &&
    Number.isFinite(pickQuietFirst5Rate) &&
    pickQuietFirst5Rate >= 0.3
  const quietFirst3FullGameRiskFlag =
    enableQuietStartFullGameGate &&
    Number.isFinite(pickLineupConversionIndex) &&
    pickLineupConversionIndex <= 45 &&
    (quietStartRiskFlag || trafficNoConversionRiskFlag || quietFirst5RiskFlag)

  const clusterBullpenTrapFlag =
    Number.isFinite(pickTeamRunClustering) &&
    pickTeamRunClustering >= 70 &&
    Number.isFinite(oppBullpenMistakeChaos) &&
    Number.isFinite(pickBullpenMistakeChaos) &&
    oppBullpenMistakeChaos - pickBullpenMistakeChaos >= 8

  const protectedMarketDogFlag =
    pickIsMarketUnderdog === true &&
    Number.isFinite(pickTeamMistakeChaos) &&
    Number.isFinite(oppTeamMistakeChaos) &&
    oppTeamMistakeChaos - pickTeamMistakeChaos >= 8

  const researchOnlyVetoFlags = []

  if (heavyFavoriteWeakLineupFlag) researchOnlyVetoFlags.push('heavyFavoriteWeakLineup')
  if (heavyFavoriteNoisyBullpenFlag) researchOnlyVetoFlags.push('heavyFavoriteNoisyBullpen')
  if (deadEarlyRiskFlag) researchOnlyVetoFlags.push('deadEarlyRisk')
  if (quietFirst3FullGameRiskFlag) researchOnlyVetoFlags.push('quietFirst3FullGameRisk')
  if (clusterBullpenTrapFlag) researchOnlyVetoFlags.push('clusterBullpenTrap')

  return {
    heavyFavoriteWeakLineupFlag,
    heavyFavoriteNoisyBullpenFlag,
    deadEarlyRiskFlag,
    quietStartRiskFlag,
    trafficNoConversionRiskFlag,
    quietFirst5RiskFlag,
    quietFirst3FullGameRiskFlag,
    clusterBullpenTrapFlag,
    protectedMarketDogFlag,
    marketDogOpponentChaosGapFlag: protectedMarketDogFlag,
    researchOnlyVetoFlags,
    researchOnlyVetoFlagCount: researchOnlyVetoFlags.length
  }
}

export const buildMlbVetoLayer = ({
  researchOnlyVetoFlagCount = 0,
  researchOnlyVetoFlags = [],
  protectedMarketDogFlag = false
}) => {
  let recommendedAction = 'Eligible'
  if (protectedMarketDogFlag && researchOnlyVetoFlagCount === 0) recommendedAction = 'Protected dog'
  else if (researchOnlyVetoFlagCount >= 2) recommendedAction = 'Hard pass'
  else if (researchOnlyVetoFlagCount === 1) recommendedAction = 'Pass'

  return {
    recommendedAction,
    vetoCount: researchOnlyVetoFlagCount,
    vetoReasons: Array.isArray(researchOnlyVetoFlags) ? researchOnlyVetoFlags : [],
    protectedMarketDogFlag: Boolean(protectedMarketDogFlag)
  }
}

export const buildMlbEfficientFavoriteLane = ({
  enableQuietStartFullGameGate = false,
  marketProbability,
  pickIsMarketFavorite,
  confidence,
  volatility,
  modelEdge,
  starterLeverageIndex,
  lateInningStabilityIndex,
  reliefPitchingRisk,
  favoredSignalCount,
  tierOneRiskPoints,
  tierOnePassFlag,
  riskFlags,
  researchOnlyVetoFlagCount,
  pickLineupConversionIndex,
  pickDeadBatTrafficRate,
  pickTeamScorelessFirst3Rate,
  pickTrafficNoConversionRate,
  pickQuietFirst5Rate,
  pickBullpenMistakeChaos
}) => {
  const positiveReasons = []
  const penaltyFlags = []
  const blockers = []
  let score = 0

  if (pickIsMarketFavorite !== true) blockers.push('notMarketFavorite')
  if (researchOnlyVetoFlagCount > 0) blockers.push('vetoActive')
  if (tierOnePassFlag) blockers.push('tierOnePass')
  if (!Number.isFinite(marketProbability) || marketProbability < 0.54) blockers.push('notPricedFavorite')
  if (Number.isFinite(marketProbability) && marketProbability > 0.66) blockers.push('tooExpensive')

  if (Number.isFinite(marketProbability) && marketProbability >= 0.54 && marketProbability <= 0.63) {
    positiveReasons.push('moderateFavoritePrice')
    score += 18
  } else if (
    Number.isFinite(marketProbability) &&
    marketProbability > 0.63 &&
    marketProbability <= 0.66
  ) {
    positiveReasons.push('favoritePriceStillPlayable')
    score += 8
  }

  if (starterLeverageIndex >= 78) {
    positiveReasons.push('starterControl')
    score += 16
  }

  if (lateInningStabilityIndex >= 54 && reliefPitchingRisk <= 48) {
    positiveReasons.push('lateHoldSupport')
    score += 14
  }

  if (
    Number.isFinite(pickLineupConversionIndex) &&
    pickLineupConversionIndex >= 46 &&
    Number.isFinite(pickDeadBatTrafficRate) &&
    pickDeadBatTrafficRate <= 0.18
  ) {
    positiveReasons.push('lineupConversionSupport')
    score += 14
  }

  if (favoredSignalCount >= 7) {
    positiveReasons.push('broadSupport')
    score += 10
  }

  if (confidence >= 64 && modelEdge >= 6) {
    positiveReasons.push('modelAgreement')
    score += 12
  }

  if (volatility > 70) {
    penaltyFlags.push('highVolatility')
    score -= 8
  }

  if (tierOneRiskPoints >= 3) {
    penaltyFlags.push('stackedRisk')
    score -= 12
  }

  if (riskFlags.includes('statefulOpponentSnapback')) {
    penaltyFlags.push('opponentSnapback')
    score -= 12
  }

  if (riskFlags.includes('starterLateFragility')) {
    penaltyFlags.push('lateFragility')
    score -= 8
  }

  if (riskFlags.includes('expensiveFavoriteDanger')) {
    penaltyFlags.push('expensiveFavorite')
    score -= 10
  }

  if (Number.isFinite(pickBullpenMistakeChaos) && pickBullpenMistakeChaos >= 48) {
    penaltyFlags.push('noisyBullpen')
    score -= 8
  }

  if (Number.isFinite(pickLineupConversionIndex) && pickLineupConversionIndex < 40) {
    penaltyFlags.push('weakConversion')
    score -= 10
  }

  if (Number.isFinite(pickDeadBatTrafficRate) && pickDeadBatTrafficRate >= 0.26) {
    penaltyFlags.push('deadEarlyShape')
    score -= 8
  }

  if (
    enableQuietStartFullGameGate &&
    Number.isFinite(pickTeamScorelessFirst3Rate) &&
    pickTeamScorelessFirst3Rate >= 0.3
  ) {
    penaltyFlags.push('quietFirst3')
    score -= 8
  }

  if (
    enableQuietStartFullGameGate &&
    Number.isFinite(pickTrafficNoConversionRate) &&
    pickTrafficNoConversionRate >= 0.2
  ) {
    penaltyFlags.push('trafficNoConversion')
    score -= 8
  }

  if (
    enableQuietStartFullGameGate &&
    Number.isFinite(pickQuietFirst5Rate) &&
    pickQuietFirst5Rate >= 0.3
  ) {
    penaltyFlags.push('quietFirst5')
    score -= 8
  }

  if (confidence < 60) {
    penaltyFlags.push('thinModelAgreement')
    score -= 6
  }

  if (starterLeverageIndex < 70) {
    penaltyFlags.push('starterNotClean')
    score -= 8
  }

  if (lateInningStabilityIndex < 48) {
    penaltyFlags.push('lateNotClean')
    score -= 8
  }

  const roundedScore = Math.round(score)
  const candidateFlag =
    blockers.length === 0 && positiveReasons.length >= 3 && roundedScore >= 40
  const laneTier =
    roundedScore >= 58 ? 'Efficient core' : roundedScore >= 46 ? 'Efficient favorite' : 'Watch favorite'

  return {
    candidateFlag,
    score: roundedScore,
    laneTier,
    positiveReasons,
    penaltyFlags,
    blockers
  }
}

