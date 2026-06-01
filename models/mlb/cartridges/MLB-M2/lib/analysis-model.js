import {
  clamp,
  formatProbability,
  getAnalysisTier,
  roundToTenths
} from '../../../../shared/sports-core/core-utils.js'
import { computeNoVigProbabilities } from '../../../../shared/sports-core/market-utils.js'
import { buildMlbDecisionIndicators } from './mlb-decision-indicators.js'
import {
  applyMlbTierOneControls,
  buildMlbEfficientFavoriteLane,
  buildMlbResearchVetoFlags,
  buildMlbVetoLayer
} from './mlb-side-controls.js'
import { findAnalysisParticipant } from '../../../../shared/sports-core/participant-model.js'
import { normalizeSignal } from '../../../../shared/sports-core/signal-utils.js'
import { buildStructuredAnalysisContext, sportVolatilityBase } from './structured-analysis-context.js'
import { buildMlbGameShapeRead } from './mlb-game-shape.js'
import { teamNamesMatch } from './team-utils.js'

const fallbackRecommendationWeight = {
  confidence: 0.72,
  stability: 0.28
}

const structuredRecommendationWeight = {
  confidence: 0.6,
  stability: 0.22,
  edge: 0.18
}

const MLB_SIDE_MODEL_DESIGNATION = 'MLB-M2-game-shape-v0.1'

const buildFallbackAnalysisModel = (game, participants, hasFullMoneyline) => {
  const providedAnalysis = game.analysis ?? {}
  const participant = findAnalysisParticipant(game.lean, participants)
  const opponent = participant ? participants.find((entry) => entry.id !== participant.id) : null
  const confidence = Number(game.confidence) || 0
  const volatility = Number(game.volatility) || 0
  const allowModelOnlyAnalysis = game.league === 'Tennis'
  const isTennisMarketPrice = allowModelOnlyAnalysis && Boolean(game.tennisContext?.predictionMarket)
  const tennisMarketPlayer = game.tennisContext?.players?.find((entry) =>
    participant ? teamNamesMatch(entry.name, participant.name) : false
  )
  const tennisMarketProbability =
    allowModelOnlyAnalysis && Number.isFinite(tennisMarketPlayer?.boardPct)
      ? tennisMarketPlayer.boardPct / 100
      : null
  const tennisMarketEconomicsPlayer = game.tennisContext?.marketEconomics?.players?.find((entry) =>
    participant ? teamNamesMatch(entry.name, participant.name) : false
  )
  const tennisModelEdge = Number(tennisMarketEconomicsPlayer?.edgePct)
  const tennisInputsUsed = [
    game.tennisContext?.predictionMarket,
    game.tennisContext?.marketEconomics,
    game.tennisContext?.opponentQualityData,
    game.tennisContext?.weaknessEdge,
    game.tennisContext?.clayMatchupData
  ].filter(Boolean).length
  const marketProbability = participant?.impliedProbability ?? tennisMarketProbability
  const recommendationScore = Math.round(
    confidence * fallbackRecommendationWeight.confidence +
      (100 - volatility) * fallbackRecommendationWeight.stability
  )

  return {
    available: Boolean(
      participant &&
        (allowModelOnlyAnalysis || (hasFullMoneyline && Number.isFinite(participant.americanOdds)))
    ),
    participantId: participant?.id ?? null,
    participant,
    opponent,
    lean: game.lean,
    rationale: game.factors?.[0] || game.summary,
    confidence,
    volatility,
    recommendationScore,
    tier: providedAnalysis.tier || getAnalysisTier(confidence, volatility),
    sourceLabel: providedAnalysis.sourceLabel || 'Editorial slate read',
    modelEdge: Number.isFinite(tennisModelEdge) ? tennisModelEdge : 0,
    modelEdgeLabel: Number.isFinite(tennisModelEdge)
      ? `${tennisModelEdge >= 0 ? '+' : ''}${tennisModelEdge.toFixed(1)} pts vs market`
      : allowModelOnlyAnalysis && !hasFullMoneyline ? 'Model-only read' : 'Editorial read',
    marketProbability,
    marketProbabilityLabel:
      (Number.isFinite(participant?.impliedProbability) ? participant.impliedProbabilityLabel : null) ??
      (Number.isFinite(tennisMarketProbability)
        ? `${isTennisMarketPrice ? 'Market price ' : ''}${formatProbability(tennisMarketProbability)}`
        : allowModelOnlyAnalysis && !hasFullMoneyline
          ? 'Model only'
          : 'N/A'),
    inputs: [],
    inputsUsed: allowModelOnlyAnalysis ? tennisInputsUsed : 0,
    volatilityNotes: []
  }
}

const buildStructuredAnalysisModel = (game, participants, hasFullMoneyline) => {
  const context = buildStructuredAnalysisContext(game, participants)

  if (!context?.signals?.length) return null

  const normalizedSignals = context.signals.map((signal) => normalizeSignal(signal, participants))
  const totalWeight = normalizedSignals.reduce((sum, signal) => sum + signal.weight, 0)

  if (!totalWeight) return null

  const sideScores = participants.map((_, index) =>
    normalizedSignals.reduce((sum, signal) => sum + signal.values[index].score * signal.weight, 0) /
    totalWeight
  )

  const marketSignal = normalizedSignals.find((signal) => signal.label === 'Market price')
  const marketProbabilities = marketSignal
    ? marketSignal.values.map((entry) => entry.score / 100)
    : computeNoVigProbabilities(participants.map((entry) => entry.americanOdds))
  const marketWinnerIndex =
    marketProbabilities.length === participants.length
      ? marketProbabilities[0] >= marketProbabilities[1]
        ? 0
        : 1
      : null
  const adjustedSideScores = [...sideScores]

  if (
    game.league === 'MLB' &&
    marketWinnerIndex !== null &&
    context.mlbRiskContext?.projectedHitProfiles?.length === participants.length
  ) {
    const underdogIndex = marketWinnerIndex === 0 ? 1 : 0
    const favoriteHitProfile = context.mlbRiskContext.projectedHitProfiles[marketWinnerIndex]
    const underdogHitProfile = context.mlbRiskContext.projectedHitProfiles[underdogIndex]
    const favoriteBullpenChain = context.mlbRiskContext.bullpenChainScores?.[marketWinnerIndex]
    const underdogBullpenChain = context.mlbRiskContext.bullpenChainScores?.[underdogIndex]

    if (favoriteHitProfile && underdogHitProfile) {
      const favoriteHitGap = favoriteHitProfile.projectedHits - underdogHitProfile.projectedHits
      const favoriteFirst5Gap =
        favoriteHitProfile.first5ProjectedHits - underdogHitProfile.first5ProjectedHits
      const favoriteLateGap =
        favoriteHitProfile.lateProjectedHits - underdogHitProfile.lateProjectedHits
      const favoriteBullpenGap =
        Number.isFinite(favoriteBullpenChain) && Number.isFinite(underdogBullpenChain)
          ? favoriteBullpenChain - underdogBullpenChain
          : 0

      if (favoriteHitGap <= -1) {
        adjustedSideScores[underdogIndex] += Math.min(4.6, Math.abs(favoriteHitGap) * 1.7)
      }

      if (favoriteFirst5Gap <= -0.8) {
        adjustedSideScores[underdogIndex] += Math.min(2.1, Math.abs(favoriteFirst5Gap) * 1.3)
      }

      if (favoriteLateGap <= -0.8 && favoriteBullpenGap < 0) {
        adjustedSideScores[underdogIndex] += Math.min(
          2.4,
          Math.abs(favoriteLateGap) * 1.15 + Math.abs(favoriteBullpenGap) * 0.1
        )
      }
    }
  }

  const initialModelEdge = Math.abs(adjustedSideScores[0] - adjustedSideScores[1])
  let consensusOverrideNote = null

  if (game.league === 'MLB' && context.mlbProjection && participants.length === 2) {
    const phaseTeamNames = [
      context.mlbProjection.edgeTeam,
      context.mlbProjection.first5EdgeTeam,
      context.mlbProjection.lateEdgeTeam,
      context.mlbProjection.bridgeEdgeTeam
    ].filter(Boolean)

    const normalizedPhaseIndices = phaseTeamNames
      .map((teamName) => participants.findIndex((participant) => teamNamesMatch(participant.name, teamName)))
      .filter((index) => index >= 0)

    const unanimousPhaseIndex =
      normalizedPhaseIndices.length === 4 && normalizedPhaseIndices.every((index) => index === normalizedPhaseIndices[0])
        ? normalizedPhaseIndices[0]
        : null

    if (unanimousPhaseIndex !== null) {
      const oppositeIndex = unanimousPhaseIndex === 0 ? 1 : 0
      const phaseConsensusStrength =
        (Number(context.mlbProjection.edgeHits) || 0) +
        (Number(context.mlbProjection.first5EdgeHits) || 0) +
        (Number(context.mlbProjection.lateEdgeHits) || 0) +
        (Number(context.mlbProjection.bridgeEdgeScore) || 0) * 0.2

      if (
        adjustedSideScores[unanimousPhaseIndex] < adjustedSideScores[oppositeIndex] &&
        initialModelEdge <= 6 &&
        phaseConsensusStrength >= 1
      ) {
        const overrideBump = Math.max(0.8, Math.min(3.6, phaseConsensusStrength * 0.9))
        adjustedSideScores[unanimousPhaseIndex] = Math.max(
          adjustedSideScores[unanimousPhaseIndex],
          adjustedSideScores[oppositeIndex] + overrideBump
        )
        consensusOverrideNote = `${participants[unanimousPhaseIndex].name} owned every phase edge, so the side pick was pulled back toward the full-game script.`
      }
    }
  }

  const winnerIndex = adjustedSideScores[0] >= adjustedSideScores[1] ? 0 : 1
  const loserIndex = winnerIndex === 0 ? 1 : 0
  const participant = participants[winnerIndex]
  const opponent = participants[loserIndex]
  const modelEdge = adjustedSideScores[winnerIndex] - adjustedSideScores[loserIndex]
  const coverageBonus = Math.min(6, normalizedSignals.length)
  const agreementBonus =
    marketWinnerIndex === null ? 0 : marketWinnerIndex === winnerIndex ? 5 : -3
  const marketSupport = marketProbabilities[winnerIndex] ?? participant.impliedProbability ?? 0.5
  const pickIsMarketFavorite =
    marketProbabilities.length === participants.length
      ? winnerIndex === marketWinnerIndex
      : participant.impliedProbability >= (opponent?.impliedProbability ?? 0)
  const pickIsMarketUnderdog =
    marketProbabilities.length === participants.length
      ? winnerIndex !== marketWinnerIndex
      : participant.impliedProbability < (opponent?.impliedProbability ?? 0)
  const modelSlateDate =
    typeof game.slateDate === 'string'
      ? game.slateDate
      : typeof game.metadata?.slateDate === 'string'
        ? game.metadata.slateDate
        : ''
  const enableMay30QuietStartGate =
    game.league === 'MLB' &&
    (game.metadata?.quietStartFullGameGate === true ||
      (/^\d{4}-\d{2}-\d{2}$/.test(modelSlateDate) && modelSlateDate >= '2026-05-31'))
  const baseConfidence = Math.round(
    clamp(
      50 +
        modelEdge * 0.95 +
        coverageBonus +
        agreementBonus +
        Math.abs(marketSupport - 0.5) * 12 +
        (context.confidenceModifier ?? 0),
      52,
      89
    )
  )
  const marketTightness =
    marketProbabilities.length === participants.length
      ? (1 - Math.abs(marketProbabilities[0] - 0.5) * 2) * 12
      : 4
  const modifierDelta = (context.volatilityModifiers || []).reduce(
    (sum, modifier) => sum + modifier.delta,
    0
  )
  const baseVolatility = Math.round(
    clamp(
      (context.volatilityBase ?? sportVolatilityBase[game.league] ?? 55) +
        marketTightness +
        modifierDelta -
        modelEdge * 0.5 +
        (normalizedSignals.length < 3 ? 6 : 0),
      30,
      92
    )
  )
  const mlbIndicators =
    game.league === 'MLB'
      ? buildMlbDecisionIndicators({
          riskContext: context.mlbRiskContext,
          participants,
          winnerIndex,
          loserIndex,
          modelEdge,
          baseVolatility,
          enableMay30QuietStartGate
        })
      : null
  const confidence = Math.round(
    clamp(baseConfidence + (mlbIndicators?.confidenceDelta ?? 0), 52, 89)
  )
  const volatility = Math.round(
    clamp(baseVolatility + (mlbIndicators?.volatilityDelta ?? 0), 30, 92)
  )
  const inputCandidates = normalizedSignals
    .filter((signal) => signal.favoredParticipantId === participant.id && signal.margin > 0)
    .sort((left, right) => right.margin * right.weight - left.margin * left.weight)
  const favoredSignalCount = inputCandidates.length

  const inputs = inputCandidates.slice(0, 3).map((signal) => ({
    label: signal.label,
    summary: signal.summary,
    source: signal.source,
    margin: roundToTenths(signal.margin),
    weight: signal.weight
  }))

  const leanDrivers = inputs.slice(0, 2).map((input) => input.label.toLowerCase())
  const lean =
    leanDrivers.length > 0
      ? `Model pick: ${participant.name} on ${leanDrivers.join(' and ')}.`
      : `Model pick: ${participant.name}.`
  const pickScript = context.mlbProjection?.teamScripts?.find((script) =>
    teamNamesMatch(script.teamName, participant.name)
  )
  const tierOneControls =
    game.league === 'MLB' && mlbIndicators
        ? applyMlbTierOneControls({
          confidence,
          volatility,
          modelEdge,
          starterLeverageIndex: mlbIndicators.starterLeverageIndex,
          lateInningStabilityIndex: mlbIndicators.lateInningStabilityIndex,
          reliefPitchingRisk: mlbIndicators.reliefPitchingRisk,
          coinflipPressure: mlbIndicators.coinflipPressure,
          favoredSignalCount,
          pickStarterLeashScore: mlbIndicators.pickStarterLeashScore,
          oppStarterLeashScore: mlbIndicators.oppStarterLeashScore,
          marketProbability: marketSupport,
          pickIsMarketFavorite,
          statefulSuggestedEdgeHaircut: mlbIndicators.statefulSuggestedEdgeHaircut ?? 0,
          statefulSuggestedConfidenceHaircut: mlbIndicators.statefulSuggestedConfidenceHaircut ?? 0,
          statefulOpponentSnapbackTrapFlag: Boolean(mlbIndicators.statefulOpponentSnapbackTrapFlag),
          tierThreeSuggestedEdgeHaircut: mlbIndicators.tierThreeSuggestedEdgeHaircut ?? 0,
          tierThreeSuggestedConfidenceHaircut: mlbIndicators.tierThreeSuggestedConfidenceHaircut ?? 0,
          tierThreeBullpenCommandMismatchFlag: Boolean(mlbIndicators.tierThreeBullpenCommandMismatchFlag)
        })
      : null
  const researchVetoFlags =
    game.league === 'MLB' && mlbIndicators
      ? buildMlbResearchVetoFlags({
          enableQuietStartFullGameGate: enableMay30QuietStartGate,
          marketProbability: marketSupport,
          pickIsMarketFavorite,
          pickIsMarketUnderdog,
          pickLineupConversionIndex: mlbIndicators.pickLineupConversionIndex,
          pickDeadBatTrafficRate: mlbIndicators.pickDeadBatTrafficRate,
          pickTeamScorelessFirst3Rate: mlbIndicators.pickTeamScorelessFirst3Rate,
          pickTrafficNoConversionRate: mlbIndicators.pickTrafficNoConversionRate,
          pickQuietFirst5Rate: mlbIndicators.pickQuietFirst5Rate,
          pickBullpenMistakeChaos: mlbIndicators.pickBullpenMistakeChaos,
          oppBullpenMistakeChaos: mlbIndicators.oppBullpenMistakeChaos,
          pickTeamRunClustering: mlbIndicators.pickTeamRunClustering,
          pickTeamMistakeChaos: mlbIndicators.pickTeamMistakeChaos,
          oppTeamMistakeChaos: mlbIndicators.oppTeamMistakeChaos
        })
      : null
  const efficientFavoriteLane =
    game.league === 'MLB' && mlbIndicators
      ? buildMlbEfficientFavoriteLane({
          enableQuietStartFullGameGate: enableMay30QuietStartGate,
          marketProbability: marketSupport,
          pickIsMarketFavorite,
          confidence: tierOneControls?.adjustedConfidence ?? confidence,
          volatility: tierOneControls?.adjustedVolatility ?? volatility,
          modelEdge: tierOneControls?.adjustedModelEdge ?? modelEdge,
          starterLeverageIndex: mlbIndicators.starterLeverageIndex,
          lateInningStabilityIndex: mlbIndicators.lateInningStabilityIndex,
          reliefPitchingRisk: mlbIndicators.reliefPitchingRisk,
          favoredSignalCount,
          tierOneRiskPoints: tierOneControls?.riskPoints ?? 0,
          tierOnePassFlag: Boolean(tierOneControls?.passFlag),
          riskFlags: tierOneControls?.riskFlags ?? [],
          researchOnlyVetoFlagCount: researchVetoFlags?.researchOnlyVetoFlagCount ?? 0,
          pickLineupConversionIndex: mlbIndicators.pickLineupConversionIndex,
          pickDeadBatTrafficRate: mlbIndicators.pickDeadBatTrafficRate,
          pickTeamScorelessFirst3Rate: mlbIndicators.pickTeamScorelessFirst3Rate,
          pickTrafficNoConversionRate: mlbIndicators.pickTrafficNoConversionRate,
          pickQuietFirst5Rate: mlbIndicators.pickQuietFirst5Rate,
          pickBullpenMistakeChaos: mlbIndicators.pickBullpenMistakeChaos
        })
      : null
  const vetoLayer =
    game.league === 'MLB'
      ? buildMlbVetoLayer({
          researchOnlyVetoFlagCount: researchVetoFlags?.researchOnlyVetoFlagCount ?? 0,
          researchOnlyVetoFlags: researchVetoFlags?.researchOnlyVetoFlags ?? [],
          protectedMarketDogFlag: Boolean(researchVetoFlags?.protectedMarketDogFlag)
        })
      : null
  const vetoPassFlag = Number(researchVetoFlags?.researchOnlyVetoFlagCount || 0) > 0
  const finalConfidence = tierOneControls?.adjustedConfidence ?? confidence
  const finalVolatility = tierOneControls?.adjustedVolatility ?? volatility
  const finalModelEdge = tierOneControls?.adjustedModelEdge ?? modelEdge
  const computedTier = tierOneControls?.selectionTier ?? getAnalysisTier(finalConfidence, finalVolatility)
  const finalTier = vetoPassFlag ? 'Pass' : computedTier
  const finalRecommendationScore = Math.round(
    finalConfidence * structuredRecommendationWeight.confidence +
      (100 - finalVolatility) * structuredRecommendationWeight.stability +
      finalModelEdge * structuredRecommendationWeight.edge
  )
  const gameShape =
    game.league === 'MLB'
      ? buildMlbGameShapeRead({
          participants,
          context,
          mlbIndicators,
          winnerIndex,
          modelEdge: finalModelEdge,
          confidence: finalConfidence,
          volatility: finalVolatility,
          marketProbabilities,
          pickIsMarketFavorite,
          pickIsMarketUnderdog
        })
      : null

  return {
    available: Boolean(hasFullMoneyline && participant && Number.isFinite(participant.americanOdds)),
    participantId: participant.id,
    participant,
    opponent,
    lean,
    rationale: inputs[0]?.summary || game.factors?.[0] || game.summary,
    confidence: finalConfidence,
    volatility: finalVolatility,
    recommendationScore: finalRecommendationScore,
    tier: finalTier,
    sourceLabel: context.sourceLabel,
    modelDesignation: game.league === 'MLB' ? MLB_SIDE_MODEL_DESIGNATION : null,
    modelEdge: roundToTenths(finalModelEdge),
    modelEdgeLabel: `${roundToTenths(finalModelEdge)}-point model edge`,
    marketProbability: marketSupport,
    marketProbabilityLabel: formatProbability(marketSupport),
    inputs,
    inputsUsed: normalizedSignals.length,
    volatilityNotes: [
      ...(context.volatilityModifiers || []),
      ...(mlbIndicators?.notes || []),
      ...(tierOneControls?.notes || []),
      ...(consensusOverrideNote ? [{ label: consensusOverrideNote, delta: 0 }] : [])
    ],
    pickReasons: pickScript?.winPath?.slice(0, 4) ?? [],
    indicators: mlbIndicators
      ? {
          reliefPitchingRisk: mlbIndicators.reliefPitchingRisk,
          coinflipPressure: mlbIndicators.coinflipPressure,
          starterLeverageIndex: mlbIndicators.starterLeverageIndex,
          lateInningStabilityIndex: mlbIndicators.lateInningStabilityIndex,
          pickBullpenScore: mlbIndicators.pickBullpenScore,
          oppBullpenScore: mlbIndicators.oppBullpenScore,
          pickBullpenChainScore: mlbIndicators.pickBullpenChainScore,
          oppBullpenChainScore: mlbIndicators.oppBullpenChainScore,
          pickStarterScore: mlbIndicators.pickStarterScore,
          oppStarterScore: mlbIndicators.oppStarterScore,
          pickStarterLeashScore: mlbIndicators.pickStarterLeashScore,
          oppStarterLeashScore: mlbIndicators.oppStarterLeashScore,
          pickStoryInstability: mlbIndicators.pickStoryInstability,
          oppStoryInstability: mlbIndicators.oppStoryInstability,
          pickSnapbackPressure: mlbIndicators.pickSnapbackPressure,
          oppSnapbackPressure: mlbIndicators.oppSnapbackPressure,
          pickHeatRegression: mlbIndicators.pickHeatRegression,
          oppHeatRegression: mlbIndicators.oppHeatRegression,
          pickFormPressure: mlbIndicators.pickFormPressure,
          oppFormPressure: mlbIndicators.oppFormPressure,
          pickTop6Pressure: mlbIndicators.pickTop6Pressure,
          oppTop6Pressure: mlbIndicators.oppTop6Pressure,
          pickTop6Cold: mlbIndicators.pickTop6Cold,
          oppTop6Cold: mlbIndicators.oppTop6Cold,
          pickTop6Heat: mlbIndicators.pickTop6Heat,
          oppTop6Heat: mlbIndicators.oppTop6Heat,
          pickTeamMistakeChaos: mlbIndicators.pickTeamMistakeChaos,
          oppTeamMistakeChaos: mlbIndicators.oppTeamMistakeChaos,
          pickTeamRunClustering: mlbIndicators.pickTeamRunClustering,
          oppTeamRunClustering: mlbIndicators.oppTeamRunClustering,
          pickTeamScorelessFirst3Rate: mlbIndicators.pickTeamScorelessFirst3Rate,
          oppTeamScorelessFirst3Rate: mlbIndicators.oppTeamScorelessFirst3Rate,
          pickLineupConversionIndex: mlbIndicators.pickLineupConversionIndex,
          oppLineupConversionIndex: mlbIndicators.oppLineupConversionIndex,
          pickDeadBatTrafficRate: mlbIndicators.pickDeadBatTrafficRate,
          oppDeadBatTrafficRate: mlbIndicators.oppDeadBatTrafficRate,
          pickTrafficNoConversionRate: mlbIndicators.pickTrafficNoConversionRate,
          oppTrafficNoConversionRate: mlbIndicators.oppTrafficNoConversionRate,
          pickQuietFirst5Rate: mlbIndicators.pickQuietFirst5Rate,
          oppQuietFirst5Rate: mlbIndicators.oppQuietFirst5Rate,
          pickBullpenMistakeChaos: mlbIndicators.pickBullpenMistakeChaos,
          oppBullpenMistakeChaos: mlbIndicators.oppBullpenMistakeChaos,
          pickStateSeriesGameNumber: mlbIndicators.pickStateSeriesGameNumber,
          oppStateSeriesGameNumber: mlbIndicators.oppStateSeriesGameNumber,
          pickStreakDirection: mlbIndicators.pickStreakDirection,
          oppStreakDirection: mlbIndicators.oppStreakDirection,
          pickStreakLength: mlbIndicators.pickStreakLength,
          oppStreakLength: mlbIndicators.oppStreakLength,
          pickRelieverCommandRisk: mlbIndicators.pickRelieverCommandRisk,
          oppRelieverCommandRisk: mlbIndicators.oppRelieverCommandRisk,
          relieverCommandGap: mlbIndicators.relieverCommandGap,
          pickThirdTimePenalty: mlbIndicators.pickThirdTimePenalty,
          oppThirdTimePenalty: mlbIndicators.oppThirdTimePenalty,
          statefulOpponentSnapbackTrapFlag: Boolean(mlbIndicators.statefulOpponentSnapbackTrapFlag),
          statefulHeatRegressionTrapFlag: Boolean(mlbIndicators.statefulHeatRegressionTrapFlag),
          statefulTopOrderPressureTrapFlag: Boolean(mlbIndicators.statefulTopOrderPressureTrapFlag),
          statefulSeriesCarryoverTrapFlag: Boolean(mlbIndicators.statefulSeriesCarryoverTrapFlag),
          statefulSuggestedEdgeHaircut: mlbIndicators.statefulSuggestedEdgeHaircut ?? 0,
          statefulSuggestedConfidenceHaircut: mlbIndicators.statefulSuggestedConfidenceHaircut ?? 0,
          may30QuietStartRiskFlag: Boolean(mlbIndicators.may30QuietStartRiskFlag),
          may30TrafficNoConversionRiskFlag: Boolean(mlbIndicators.may30TrafficNoConversionRiskFlag),
          may30QuietFirst5RiskFlag: Boolean(mlbIndicators.may30QuietFirst5RiskFlag),
          tierThreeBullpenCommandMismatchFlag: Boolean(mlbIndicators.tierThreeBullpenCommandMismatchFlag),
          tierThreeSuggestedEdgeHaircut: mlbIndicators.tierThreeSuggestedEdgeHaircut ?? 0,
          tierThreeSuggestedConfidenceHaircut: mlbIndicators.tierThreeSuggestedConfidenceHaircut ?? 0,
          projectedHitEdgeForPick: mlbIndicators.projectedHitEdgeForPick,
          hitEdgeAgainstPick: mlbIndicators.hitEdgeAgainstPick,
          pickIsMarketFavorite,
          pickIsMarketUnderdog,
          heavyFavoriteWeakLineupFlag: Boolean(researchVetoFlags?.heavyFavoriteWeakLineupFlag),
          heavyFavoriteNoisyBullpenFlag: Boolean(researchVetoFlags?.heavyFavoriteNoisyBullpenFlag),
          deadEarlyRiskFlag: Boolean(researchVetoFlags?.deadEarlyRiskFlag),
          quietStartRiskFlag: Boolean(researchVetoFlags?.quietStartRiskFlag),
          trafficNoConversionRiskFlag: Boolean(researchVetoFlags?.trafficNoConversionRiskFlag),
          quietFirst5RiskFlag: Boolean(researchVetoFlags?.quietFirst5RiskFlag),
          quietFirst3FullGameRiskFlag: Boolean(researchVetoFlags?.quietFirst3FullGameRiskFlag),
          clusterBullpenTrapFlag: Boolean(researchVetoFlags?.clusterBullpenTrapFlag),
          protectedMarketDogFlag: Boolean(researchVetoFlags?.protectedMarketDogFlag),
          marketDogOpponentChaosGapFlag: Boolean(researchVetoFlags?.marketDogOpponentChaosGapFlag),
          researchOnlyVetoFlags: researchVetoFlags?.researchOnlyVetoFlags ?? [],
          researchOnlyVetoFlagCount: researchVetoFlags?.researchOnlyVetoFlagCount ?? 0,
          vetoLayer,
          efficientFavoriteCandidateFlag: Boolean(efficientFavoriteLane?.candidateFlag),
          efficientFavoriteScore: efficientFavoriteLane?.score ?? null,
          efficientFavoriteTier: efficientFavoriteLane?.laneTier ?? null,
          efficientFavoriteReasons: efficientFavoriteLane?.positiveReasons ?? [],
          efficientFavoritePenaltyFlags: efficientFavoriteLane?.penaltyFlags ?? [],
          efficientFavoriteBlockers: efficientFavoriteLane?.blockers ?? [],
          tierOneRiskPoints: tierOneControls?.riskPoints ?? 0,
          tierOnePassFlag: Boolean(tierOneControls?.passFlag),
          tierOneRiskFlags: tierOneControls?.riskFlags ?? [],
          favoredSignalCount,
          starterLateGap: tierOneControls?.starterLateGap ?? null,
          starterLeashGap: tierOneControls?.starterLeashGap ?? null,
          edgeHaircutApplied: tierOneControls?.edgeHaircut ?? 0,
          gameShape: gameShape
            ? {
                label: gameShape.label,
                shapeLabel: gameShape.shapeLabel,
                category: gameShape.category?.slug ?? null,
                bestExpression: gameShape.category?.bestExpression ?? null,
                categoryConfidence: gameShape.category?.confidence ?? null,
                realityGapScore: gameShape.scores.realityGapScore,
                chaosScore: gameShape.scores.chaosScore,
                deadEarlyScore: gameShape.scores.deadEarlyScore,
                rfImpactScore: gameShape.rfLens.impactScore
              }
            : null
        }
      : null,
    gameShape,
    mlbProjection: context.mlbProjection
      ? {
          ...context.mlbProjection,
          gameShape
        }
      : null
  }
}

const buildAnalysisModel = (game, participants, hasFullMoneyline) =>
  buildStructuredAnalysisModel(game, participants, hasFullMoneyline) ??
  buildFallbackAnalysisModel(game, participants, hasFullMoneyline)


export { buildAnalysisModel }
