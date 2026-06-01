import { average, clamp, roundToTenths } from '../../../../shared/sports-core/core-utils.js'

const buildMlbDecisionIndicators = ({
  riskContext,
  participants,
  winnerIndex,
  loserIndex,
  modelEdge,
  baseVolatility,
  enableMay30QuietStartGate = false
}) => {
  if (!riskContext) return null

  const pickBullpenScore = riskContext.bullpenScores?.[winnerIndex]
  const opponentBullpenScore = riskContext.bullpenScores?.[loserIndex]
  const pickBullpenChainScore = riskContext.bullpenChainScores?.[winnerIndex]
  const opponentBullpenChainScore = riskContext.bullpenChainScores?.[loserIndex]
  const pickStarterScore = riskContext.starterScores?.[winnerIndex]
  const opponentStarterScore = riskContext.starterScores?.[loserIndex]
  const pickStarterHoldConfidence = riskContext.starterHoldConfidence?.[winnerIndex]
  const opponentStarterHoldConfidence = riskContext.starterHoldConfidence?.[loserIndex]
  const pickStarterLeashScore = riskContext.starterLeashScores?.[winnerIndex]
  const opponentStarterLeashScore = riskContext.starterLeashScores?.[loserIndex]
  const pickStoryInstability = Number(riskContext.storyPriors?.[winnerIndex]?.storyInstabilityIndex)
  const opponentStoryInstability = Number(riskContext.storyPriors?.[loserIndex]?.storyInstabilityIndex)
  const pickTeamState = riskContext.teamStateSnapshots?.[winnerIndex] ?? null
  const opponentTeamState = riskContext.teamStateSnapshots?.[loserIndex] ?? null
  const pickHitterState = riskContext.hitterStateSnapshots?.[winnerIndex] ?? null
  const opponentHitterState = riskContext.hitterStateSnapshots?.[loserIndex] ?? null
  const pickTeamMistakeShape = riskContext.teamMistakeShapes?.[winnerIndex] ?? null
  const opponentTeamMistakeShape = riskContext.teamMistakeShapes?.[loserIndex] ?? null
  const pickLineupConversionShape = riskContext.lineupConversionShapes?.[winnerIndex] ?? null
  const opponentLineupConversionShape = riskContext.lineupConversionShapes?.[loserIndex] ?? null
  const pickBullpenMistakeShape = riskContext.bullpenMistakeShapes?.[winnerIndex] ?? null
  const opponentBullpenMistakeShape = riskContext.bullpenMistakeShapes?.[loserIndex] ?? null
  const pickSnapbackPressure = Number(pickTeamState?.snapbackPressureIndex)
  const opponentSnapbackPressure = Number(opponentTeamState?.snapbackPressureIndex)
  const pickHeatRegression = Number(pickTeamState?.heatRegressionIndex)
  const opponentHeatRegression = Number(opponentTeamState?.heatRegressionIndex)
  const pickFormPressure = Number(pickTeamState?.formPressureIndex)
  const opponentFormPressure = Number(opponentTeamState?.formPressureIndex)
  const pickTop6Pressure = Number(pickHitterState?.top6PressureIndex)
  const opponentTop6Pressure = Number(opponentHitterState?.top6PressureIndex)
  const pickTop6Cold = Number(pickHitterState?.top6ColdIndex)
  const opponentTop6Cold = Number(opponentHitterState?.top6ColdIndex)
  const pickTop6Heat = Number(pickHitterState?.top6HeatIndex)
  const opponentTop6Heat = Number(opponentHitterState?.top6HeatIndex)
  const pickTop6XwobaTrend = Number(pickHitterState?.top6XwobaTrend)
  const opponentTop6XwobaTrend = Number(opponentHitterState?.top6XwobaTrend)
  const pickTop6HardHitTrend = Number(pickHitterState?.top6HardHitTrend)
  const opponentTop6HardHitTrend = Number(opponentHitterState?.top6HardHitTrend)
  const pickTop6SweetSpotTrend = Number(pickHitterState?.top6SweetSpotTrend)
  const opponentTop6SweetSpotTrend = Number(opponentHitterState?.top6SweetSpotTrend)
  const pickContactTrendSignal = pickHitterState?.contactTrendSignal || null
  const opponentContactTrendSignal = opponentHitterState?.contactTrendSignal || null
  const pickTeamMistakeChaos = Number(pickTeamMistakeShape?.mistakeChaosIndex)
  const opponentTeamMistakeChaos = Number(opponentTeamMistakeShape?.mistakeChaosIndex)
  const pickTeamRunClustering = Number(pickTeamMistakeShape?.runClusteringIndex)
  const opponentTeamRunClustering = Number(opponentTeamMistakeShape?.runClusteringIndex)
  const pickTeamScorelessFirst3Rate = Number(pickTeamMistakeShape?.scorelessFirst3Rate)
  const opponentTeamScorelessFirst3Rate = Number(opponentTeamMistakeShape?.scorelessFirst3Rate)
  const pickLineupConversionIndex = Number(pickLineupConversionShape?.lineupConversionIndex)
  const opponentLineupConversionIndex = Number(opponentLineupConversionShape?.lineupConversionIndex)
  const pickDeadBatTrafficRate = Number(pickLineupConversionShape?.deadBatTrafficRate)
  const opponentDeadBatTrafficRate = Number(opponentLineupConversionShape?.deadBatTrafficRate)
  const pickTrafficNoConversionRate = Number(pickLineupConversionShape?.trafficNoConversionRate)
  const opponentTrafficNoConversionRate = Number(opponentLineupConversionShape?.trafficNoConversionRate)
  const pickQuietFirst5Rate = Number(pickLineupConversionShape?.quietFirst5Rate)
  const opponentQuietFirst5Rate = Number(opponentLineupConversionShape?.quietFirst5Rate)
  const pickBullpenMistakeChaos = Number(pickBullpenMistakeShape?.bullpenChaosIndex)
  const opponentBullpenMistakeChaos = Number(opponentBullpenMistakeShape?.bullpenChaosIndex)
  const pickRelieverCommandRisk = Number(riskContext.tierThreeBullpenProfiles?.[winnerIndex]?.commandRiskIndex)
  const opponentRelieverCommandRisk = Number(riskContext.tierThreeBullpenProfiles?.[loserIndex]?.commandRiskIndex)
  const pickThirdTimePenalty = Number(riskContext.starterThirdTimeProfiles?.[winnerIndex]?.thirdTimePenaltyIndex)
  const opponentThirdTimePenalty = Number(riskContext.starterThirdTimeProfiles?.[loserIndex]?.thirdTimePenaltyIndex)
  const pickLineupPressure = riskContext.lineupProfiles?.[winnerIndex]?.starterPressureIndex
  const opponentLineupPressure = riskContext.lineupProfiles?.[loserIndex]?.starterPressureIndex
  const pickBullpenPitchPressure = riskContext.lineupProfiles?.[winnerIndex]?.bullpenPitchTypePressureIndex
  const opponentBullpenPitchPressure = riskContext.lineupProfiles?.[loserIndex]?.bullpenPitchTypePressureIndex
  const pickProjectedHits = riskContext.projectedHitProfiles?.[winnerIndex]?.projectedHits
  const opponentProjectedHits = riskContext.projectedHitProfiles?.[loserIndex]?.projectedHits
  const projectedHitConfidence = average(
    [riskContext.projectedHitProfiles?.[winnerIndex]?.lineupConfidence, riskContext.projectedHitProfiles?.[loserIndex]?.lineupConfidence].filter(
      Number.isFinite
    )
  )
  const rawProjectedHitEdgeForPick =
    Number.isFinite(pickProjectedHits) && Number.isFinite(opponentProjectedHits)
      ? pickProjectedHits - opponentProjectedHits
      : null
  const projectedHitEdgeForPick =
    Number.isFinite(rawProjectedHitEdgeForPick)
      ? roundToTenths(rawProjectedHitEdgeForPick * (Number.isFinite(projectedHitConfidence) ? projectedHitConfidence : 1))
      : null
  const hitEdgeAgainstPick =
    Number.isFinite(projectedHitEdgeForPick) && projectedHitEdgeForPick < -0.2
  const starterGap =
    Number.isFinite(pickStarterScore) && Number.isFinite(opponentStarterScore)
      ? pickStarterScore - opponentStarterScore
      : null
  const bullpenGap =
    Number.isFinite(pickBullpenScore) && Number.isFinite(opponentBullpenScore)
      ? pickBullpenScore - opponentBullpenScore
      : null
  const bullpenChainGap =
    Number.isFinite(pickBullpenChainScore) && Number.isFinite(opponentBullpenChainScore)
      ? pickBullpenChainScore - opponentBullpenChainScore
      : null
  const relieverCommandGap =
    Number.isFinite(pickRelieverCommandRisk) && Number.isFinite(opponentRelieverCommandRisk)
      ? pickRelieverCommandRisk - opponentRelieverCommandRisk
      : null
  const starterLeverageIndex = clamp(
    50 +
      (Number.isFinite(starterGap) ? starterGap * 1.15 : 0) +
      (Number.isFinite(projectedHitEdgeForPick) ? projectedHitEdgeForPick * 6 : 0) +
      (Number.isFinite(pickStarterHoldConfidence) && Number.isFinite(opponentStarterHoldConfidence)
        ? (pickStarterHoldConfidence - opponentStarterHoldConfidence) * 0.35
        : 0) -
      (Number.isFinite(opponentLineupPressure) ? Math.max(opponentLineupPressure - 58, 0) * 0.28 : 0),
    0,
    100
  )
  const lateInningStabilityIndex = clamp(
    50 +
      (Number.isFinite(bullpenGap) ? bullpenGap * 1.3 : 0) -
      (Number.isFinite(bullpenChainGap) ? bullpenChainGap * 0.95 : 0) -
      (Number.isFinite(opponentBullpenPitchPressure) ? Math.max(opponentBullpenPitchPressure - 56, 0) * 0.22 : 0) +
      (Number.isFinite(pickBullpenPitchPressure) ? Math.max(56 - pickBullpenPitchPressure, 0) * 0.08 : 0) -
      Math.max(baseVolatility - 70, 0) * 0.65 -
      (hitEdgeAgainstPick ? 6 : 0),
    0,
    100
  )
  const bullpenCommandMismatchFlag =
    Number.isFinite(relieverCommandGap) &&
    relieverCommandGap >= 6 &&
    modelEdge >= 8 &&
    lateInningStabilityIndex <= 55
  const opponentSnapbackTrapFlag =
    modelEdge >= 8 &&
    Number.isFinite(opponentSnapbackPressure) &&
    opponentSnapbackPressure >= 50 &&
    opponentTeamState?.streakDirection === 'L' &&
    Number(opponentTeamState?.streakLength || 0) >= 2
  const opponentImprovingContactBouncebackFlag =
    modelEdge >= 6 &&
    opponentTeamState?.streakDirection === 'L' &&
    Number(opponentTeamState?.streakLength || 0) >= 2 &&
    Number(opponentTeamState?.closeLossCountLast5 || 0) >= 2 &&
    (
      opponentContactTrendSignal === 'improving' ||
      opponentTop6XwobaTrend >= 0.012 ||
      opponentTop6HardHitTrend >= 2.5 ||
      opponentTop6SweetSpotTrend >= 2
    )
  const pickLossButNotDeadFlag =
    pickTeamState?.previousResult === 'loss' &&
    Number(pickTeamState?.closeLossCountLast5 || 0) >= 1 &&
    Number(pickTeamState?.blowoutLossCountLast5 || 0) === 0
  const opponentLossButNotDeadFlag =
    opponentTeamState?.previousResult === 'loss' &&
    Number(opponentTeamState?.closeLossCountLast5 || 0) >= 1 &&
    Number(opponentTeamState?.blowoutLossCountLast5 || 0) === 0
  const pickSlumpingLoserFlag =
    pickTeamState?.previousResult === 'loss' &&
    Number(pickTeamState?.runDiffLast5 ?? 0) <= -2 &&
    Number(pickTeamState?.blowoutLossCountLast5 || 0) >= 1
  const opponentSlumpingLoserFlag =
    opponentTeamState?.previousResult === 'loss' &&
    Number(opponentTeamState?.runDiffLast5 ?? 0) <= -2 &&
    Number(opponentTeamState?.blowoutLossCountLast5 || 0) >= 1
  const pickHighSnapbackLowFormFlag =
    pickTeamState?.previousResult === 'loss' &&
    Number.isFinite(pickSnapbackPressure) &&
    Number.isFinite(pickFormPressure) &&
    pickSnapbackPressure >= 55 &&
    pickFormPressure <= 45
  const opponentHighSnapbackLowFormFlag =
    opponentTeamState?.previousResult === 'loss' &&
    Number.isFinite(opponentSnapbackPressure) &&
    Number.isFinite(opponentFormPressure) &&
    opponentSnapbackPressure >= 55 &&
    opponentFormPressure <= 45
  const pickHeatRegressionTrapFlag =
    modelEdge >= 8 &&
    Number.isFinite(pickHeatRegression) &&
    pickHeatRegression >= 45 &&
    pickTeamState?.streakDirection === 'W' &&
    Number(pickTeamState?.streakLength || 0) >= 2
  const pickTopOrderPressureTrapFlag =
    modelEdge >= 8 &&
    Number.isFinite(pickTop6Pressure) &&
    Number.isFinite(pickTop6Cold) &&
    pickTop6Pressure >= 40 &&
    pickTop6Cold >= 45
  const seriesCarryoverTrapFlag =
    modelEdge >= 10 &&
    Number(pickTeamState?.scheduledSeriesGameNumber || 0) === 2 &&
    Number.isFinite(pickFormPressure) &&
    pickFormPressure >= 55
  const stateSuggestedEdgeHaircut = opponentSnapbackTrapFlag ? 4 : opponentImprovingContactBouncebackFlag ? 3 : 0
  const stateSuggestedConfidenceHaircut = opponentSnapbackTrapFlag ? 8 : opponentImprovingContactBouncebackFlag ? 6 : 0
  const may30QuietStartRiskFlag =
    enableMay30QuietStartGate &&
    Number.isFinite(pickTeamScorelessFirst3Rate) && pickTeamScorelessFirst3Rate >= 0.34
  const may30TrafficNoConversionRiskFlag =
    enableMay30QuietStartGate &&
    Number.isFinite(pickLineupConversionIndex) &&
    pickLineupConversionIndex <= 45 &&
    Number.isFinite(pickTrafficNoConversionRate) &&
    pickTrafficNoConversionRate >= 0.24
  const may30QuietFirst5RiskFlag =
    enableMay30QuietStartGate &&
    Number.isFinite(pickQuietFirst5Rate) && pickQuietFirst5Rate >= 0.34

  let reliefPitchingRisk = 36
  let coinflipPressure = 18
  const notes = []
  let confidenceDelta = 0
  let volatilityDelta = 0

  if (Number.isFinite(opponentBullpenScore) && Number.isFinite(pickBullpenScore)) {
    reliefPitchingRisk += Math.max(opponentBullpenScore - pickBullpenScore, 0) * 1.7
  }

  if (Number.isFinite(opponentBullpenChainScore) && Number.isFinite(pickBullpenChainScore)) {
    reliefPitchingRisk += Math.max(opponentBullpenChainScore - pickBullpenChainScore, 0) * 1.15
  }

  if (Number.isFinite(starterGap)) {
    if (starterGap >= 8) reliefPitchingRisk += 5
    if (starterGap >= 14) reliefPitchingRisk += 4
  }

  if (
    Number.isFinite(pickStarterLeashScore) &&
    Number.isFinite(opponentStarterLeashScore) &&
    opponentStarterLeashScore - pickStarterLeashScore >= 8
  ) {
    reliefPitchingRisk += 4
    coinflipPressure += 6
  }

  if (Number.isFinite(opponentStarterHoldConfidence) && opponentStarterHoldConfidence <= 46) {
    notes.push({
      label: 'Opposing starter hold is shakier than the season line alone suggests',
      delta: -2
    })
    confidenceDelta += 1
  }

  if (Number.isFinite(pickStarterHoldConfidence) && pickStarterHoldConfidence <= 44) {
    notes.push({
      label: 'Pick still leans on a starter with shaky innings hold confidence',
      delta: 4
    })
    volatilityDelta += 3
    coinflipPressure += 6
  }

  if (Number.isFinite(opponentLineupPressure) && opponentLineupPressure >= 64) {
    notes.push({
      label: 'Opponent lineup has real split and top-order pressure against this starter',
      delta: 4
    })
    volatilityDelta += 3
    coinflipPressure += 7
  }

  if (Number.isFinite(opponentBullpenPitchPressure) && opponentBullpenPitchPressure >= 62) {
    notes.push({
      label: 'Opponent lineup also fits the likely bridge-reliever arsenal',
      delta: 4
    })
    volatilityDelta += 2
    coinflipPressure += 5
  }

  if (opponentImprovingContactBouncebackFlag) {
    notes.push({
      label: `${participants[loserIndex].name} are on a loss streak, but the recent contact-quality trend is improving and the losses have been close`,
      delta: 4
    })
    confidenceDelta -= 3
    volatilityDelta += 4
    coinflipPressure += 8
  }

  if (opponentSlumpingLoserFlag) {
    notes.push({
      label: `${participants[loserIndex].name} are carrying a real slumping-loser profile, which supports attacking them only if the rest of the script agrees`,
      delta: -2
    })
    confidenceDelta += 1
  }

  if (pickLossButNotDeadFlag) {
    notes.push({
      label: `${participants[winnerIndex].name} are coming off a competitive loss rather than a dead-bat stretch, so this side deserves more leash than a generic fade`,
      delta: -1
    })
  }

  if (opponentLossButNotDeadFlag) {
    notes.push({
      label: `${participants[loserIndex].name} are coming off a competitive loss, which makes the fade less clean than the paper edge suggests`,
      delta: 3
    })
    confidenceDelta -= 2
    volatilityDelta += 2
  }

  if (pickHighSnapbackLowFormFlag) {
    notes.push({
      label: `${participants[winnerIndex].name} have high snapback pressure but weak recent form under it, which is a real side-risk bucket`,
      delta: 6
    })
    confidenceDelta -= 5
    volatilityDelta += 5
    coinflipPressure += 9
  }

  if (opponentHighSnapbackLowFormFlag) {
    notes.push({
      label: `${participants[loserIndex].name} have the classic high-snapback / low-form resistance shape, so this still carries chaos even if the full-game pick is right`,
      delta: 3
    })
    volatilityDelta += 2
  }

  if (hitEdgeAgainstPick) {
    reliefPitchingRisk += 12
    coinflipPressure += 12
  }

  if (Number.isFinite(projectedHitEdgeForPick) && projectedHitEdgeForPick <= -1.2) {
    reliefPitchingRisk += 7
    coinflipPressure += 9
  }

  if (may30QuietStartRiskFlag || may30TrafficNoConversionRiskFlag || may30QuietFirst5RiskFlag) {
    notes.push({
      label:
        'May 30 closeout gate: pick has quiet-start or traffic-without-conversion risk, so the full-game side needs a cleaner market expression',
      delta: 5
    })
    confidenceDelta -= 3
    volatilityDelta += 3
    coinflipPressure += 7
  }

  if (modelEdge <= 2) {
    reliefPitchingRisk += 8
    coinflipPressure += 18
  } else if (modelEdge <= 5) {
    reliefPitchingRisk += 6
    coinflipPressure += 14
  } else if (modelEdge <= 8) {
    coinflipPressure += 8
  }

  if (baseVolatility >= 85) {
    reliefPitchingRisk += 7
    coinflipPressure += 16
  } else if (baseVolatility >= 75) {
    reliefPitchingRisk += 4
    coinflipPressure += 9
  }

  if (baseVolatility >= 84) {
    notes.push({
      label: 'Overall baseball variance is still high enough that the side reads better as a watchlist edge than a clean conviction tag',
      delta: 3
    })
    confidenceDelta -= 3
    volatilityDelta += 3
  }

  if (Number.isFinite(pickStoryInstability) && pickStoryInstability >= 68) {
    notes.push({
      label: `${participants[winnerIndex].name} have been living in a noisier recent team-story lane than the market line alone shows`,
      delta: 3
    })
    confidenceDelta -= 2
    volatilityDelta += 3
  }

  if (
    Number.isFinite(pickStoryInstability) &&
    Number.isFinite(opponentStoryInstability) &&
    pickStoryInstability - opponentStoryInstability >= 10
  ) {
    notes.push({
      label: `${participants[winnerIndex].name} carry the less stable recent game-story profile in this matchup`,
      delta: 3
    })
    confidenceDelta -= 1
    volatilityDelta += 2
  }

  if (baseVolatility >= 88 && modelEdge >= 8) {
    notes.push({
      label: 'A big paper edge is still sitting inside a noisy baseball script, so conviction should stay capped',
      delta: 3
    })
    confidenceDelta -= 3
    volatilityDelta += 2
  }

  if (starterLeverageIndex >= 60 && lateInningStabilityIndex <= 52) {
    reliefPitchingRisk += 8
    coinflipPressure += 10
  }

  if (starterLeverageIndex >= 72 && lateInningStabilityIndex <= 46) {
    reliefPitchingRisk += 5
    coinflipPressure += 7
  }

  if (
    Number.isFinite(opponentBullpenChainScore) &&
    Number.isFinite(pickBullpenChainScore) &&
    opponentBullpenChainScore - pickBullpenChainScore >= 7
  ) {
    reliefPitchingRisk += 7
    coinflipPressure += 8
  }

  reliefPitchingRisk = clamp(reliefPitchingRisk, 22, 95)
  coinflipPressure = clamp(coinflipPressure, 8, 95)

  if (coinflipPressure >= 60) {
    notes.push({ label: 'Coin-flip pressure is elevated for this full-game side', delta: 4 })
    confidenceDelta -= 5
    volatilityDelta += 5
  }

  if (reliefPitchingRisk >= 72) {
    notes.push({
      label: 'Relief-pitching risk is elevated if the game flips after the starter phase',
      delta: 6
    })
    confidenceDelta -= 5
    volatilityDelta += 6
  } else if (reliefPitchingRisk >= 62) {
    notes.push({ label: 'Late-inning hold risk is above average for this side', delta: 4 })
    confidenceDelta -= 3
    volatilityDelta += 4
  }

  if (starterLeverageIndex >= 60 && lateInningStabilityIndex <= 52) {
    notes.push({
      label: 'Starter edge looks better than the late-inning hold profile; this reads cleaner for first five',
      delta: 5
    })
    confidenceDelta -= 3
    volatilityDelta += 5
  }

  if (
    Number.isFinite(opponentBullpenScore) &&
    Number.isFinite(pickBullpenScore) &&
    opponentBullpenScore - pickBullpenScore >= 6
  ) {
    notes.push({ label: `${participants[loserIndex].name} carry the cleaner bullpen profile`, delta: 3 })
  }

  if (
    Number.isFinite(opponentBullpenChainScore) &&
    Number.isFinite(pickBullpenChainScore) &&
    opponentBullpenChainScore - pickBullpenChainScore >= 6
  ) {
    notes.push({ label: `${participants[loserIndex].name} are likelier to hand the middle innings to a fresher bridge chain`, delta: 3 })
  }

  if (hitEdgeAgainstPick) {
    notes.push({ label: `${participants[loserIndex].name} also own the projected hit edge`, delta: 3 })
  }

  if (Number.isFinite(projectedHitEdgeForPick) && projectedHitEdgeForPick <= -1.2) {
    notes.push({
      label: `${participants[loserIndex].name} own the cleaner projected traffic profile by more than a full hit`,
      delta: 4
    })
    confidenceDelta -= 3
    volatilityDelta += 4
  }

  if (Number.isFinite(projectedHitConfidence) && projectedHitConfidence < 0.75) {
    notes.push({
      label:
        projectedHitConfidence < 0.4
          ? 'Projected hit edge is being heavily compressed because both lineups were still unresolved'
          : 'Projected hit edge is partially compressed because lineup certainty was still incomplete',
      delta: 2
    })
    confidenceDelta -= projectedHitConfidence < 0.4 ? 4 : 2
    volatilityDelta += projectedHitConfidence < 0.4 ? 5 : 3
  }

  return {
    reliefPitchingRisk: roundToTenths(reliefPitchingRisk),
    coinflipPressure: roundToTenths(coinflipPressure),
    starterLeverageIndex: roundToTenths(starterLeverageIndex),
    lateInningStabilityIndex: roundToTenths(lateInningStabilityIndex),
    pickBullpenScore: Number.isFinite(pickBullpenScore) ? roundToTenths(pickBullpenScore) : null,
    oppBullpenScore: Number.isFinite(opponentBullpenScore) ? roundToTenths(opponentBullpenScore) : null,
    pickBullpenChainScore: Number.isFinite(pickBullpenChainScore)
      ? roundToTenths(pickBullpenChainScore)
      : null,
    oppBullpenChainScore: Number.isFinite(opponentBullpenChainScore)
      ? roundToTenths(opponentBullpenChainScore)
      : null,
    pickStarterScore: Number.isFinite(pickStarterScore) ? roundToTenths(pickStarterScore) : null,
    oppStarterScore: Number.isFinite(opponentStarterScore) ? roundToTenths(opponentStarterScore) : null,
    pickStarterLeashScore: Number.isFinite(pickStarterLeashScore)
      ? roundToTenths(pickStarterLeashScore)
      : null,
    oppStarterLeashScore: Number.isFinite(opponentStarterLeashScore)
      ? roundToTenths(opponentStarterLeashScore)
      : null,
    pickStoryInstability: Number.isFinite(pickStoryInstability)
      ? roundToTenths(pickStoryInstability)
      : null,
    oppStoryInstability: Number.isFinite(opponentStoryInstability)
      ? roundToTenths(opponentStoryInstability)
      : null,
    pickSnapbackPressure: Number.isFinite(pickSnapbackPressure)
      ? roundToTenths(pickSnapbackPressure)
      : null,
    oppSnapbackPressure: Number.isFinite(opponentSnapbackPressure)
      ? roundToTenths(opponentSnapbackPressure)
      : null,
    pickHeatRegression: Number.isFinite(pickHeatRegression)
      ? roundToTenths(pickHeatRegression)
      : null,
    oppHeatRegression: Number.isFinite(opponentHeatRegression)
      ? roundToTenths(opponentHeatRegression)
      : null,
    pickFormPressure: Number.isFinite(pickFormPressure)
      ? roundToTenths(pickFormPressure)
      : null,
    oppFormPressure: Number.isFinite(opponentFormPressure)
      ? roundToTenths(opponentFormPressure)
      : null,
    pickTop6Pressure: Number.isFinite(pickTop6Pressure)
      ? roundToTenths(pickTop6Pressure)
      : null,
    oppTop6Pressure: Number.isFinite(opponentTop6Pressure)
      ? roundToTenths(opponentTop6Pressure)
      : null,
    pickTop6Cold: Number.isFinite(pickTop6Cold)
      ? roundToTenths(pickTop6Cold)
      : null,
    oppTop6Cold: Number.isFinite(opponentTop6Cold)
      ? roundToTenths(opponentTop6Cold)
      : null,
    pickTop6Heat: Number.isFinite(pickTop6Heat)
      ? roundToTenths(pickTop6Heat)
      : null,
    oppTop6Heat: Number.isFinite(opponentTop6Heat)
      ? roundToTenths(opponentTop6Heat)
      : null,
    pickTop6XwobaTrend: Number.isFinite(pickTop6XwobaTrend)
      ? roundToTenths(pickTop6XwobaTrend)
      : null,
    oppTop6XwobaTrend: Number.isFinite(opponentTop6XwobaTrend)
      ? roundToTenths(opponentTop6XwobaTrend)
      : null,
    pickTop6HardHitTrend: Number.isFinite(pickTop6HardHitTrend)
      ? roundToTenths(pickTop6HardHitTrend)
      : null,
    oppTop6HardHitTrend: Number.isFinite(opponentTop6HardHitTrend)
      ? roundToTenths(opponentTop6HardHitTrend)
      : null,
    pickTop6SweetSpotTrend: Number.isFinite(pickTop6SweetSpotTrend)
      ? roundToTenths(pickTop6SweetSpotTrend)
      : null,
    oppTop6SweetSpotTrend: Number.isFinite(opponentTop6SweetSpotTrend)
      ? roundToTenths(opponentTop6SweetSpotTrend)
      : null,
    pickContactTrendSignal,
    oppContactTrendSignal: opponentContactTrendSignal,
    pickTeamMistakeChaos: Number.isFinite(pickTeamMistakeChaos)
      ? roundToTenths(pickTeamMistakeChaos)
      : null,
    oppTeamMistakeChaos: Number.isFinite(opponentTeamMistakeChaos)
      ? roundToTenths(opponentTeamMistakeChaos)
      : null,
    pickTeamRunClustering: Number.isFinite(pickTeamRunClustering)
      ? roundToTenths(pickTeamRunClustering)
      : null,
    oppTeamRunClustering: Number.isFinite(opponentTeamRunClustering)
      ? roundToTenths(opponentTeamRunClustering)
      : null,
    pickTeamScorelessFirst3Rate: Number.isFinite(pickTeamScorelessFirst3Rate)
      ? roundToTenths(pickTeamScorelessFirst3Rate)
      : null,
    oppTeamScorelessFirst3Rate: Number.isFinite(opponentTeamScorelessFirst3Rate)
      ? roundToTenths(opponentTeamScorelessFirst3Rate)
      : null,
    pickLineupConversionIndex: Number.isFinite(pickLineupConversionIndex)
      ? roundToTenths(pickLineupConversionIndex)
      : null,
    oppLineupConversionIndex: Number.isFinite(opponentLineupConversionIndex)
      ? roundToTenths(opponentLineupConversionIndex)
      : null,
    pickDeadBatTrafficRate: Number.isFinite(pickDeadBatTrafficRate)
      ? roundToTenths(pickDeadBatTrafficRate)
      : null,
    oppDeadBatTrafficRate: Number.isFinite(opponentDeadBatTrafficRate)
      ? roundToTenths(opponentDeadBatTrafficRate)
      : null,
    pickTrafficNoConversionRate: Number.isFinite(pickTrafficNoConversionRate)
      ? roundToTenths(pickTrafficNoConversionRate)
      : null,
    oppTrafficNoConversionRate: Number.isFinite(opponentTrafficNoConversionRate)
      ? roundToTenths(opponentTrafficNoConversionRate)
      : null,
    pickQuietFirst5Rate: Number.isFinite(pickQuietFirst5Rate)
      ? roundToTenths(pickQuietFirst5Rate)
      : null,
    oppQuietFirst5Rate: Number.isFinite(opponentQuietFirst5Rate)
      ? roundToTenths(opponentQuietFirst5Rate)
      : null,
    pickBullpenMistakeChaos: Number.isFinite(pickBullpenMistakeChaos)
      ? roundToTenths(pickBullpenMistakeChaos)
      : null,
    oppBullpenMistakeChaos: Number.isFinite(opponentBullpenMistakeChaos)
      ? roundToTenths(opponentBullpenMistakeChaos)
      : null,
    pickStateSeriesGameNumber: Number(pickTeamState?.scheduledSeriesGameNumber || 0) || null,
    oppStateSeriesGameNumber: Number(opponentTeamState?.scheduledSeriesGameNumber || 0) || null,
    pickStreakDirection: pickTeamState?.streakDirection || null,
    oppStreakDirection: opponentTeamState?.streakDirection || null,
    pickStreakLength: Number(pickTeamState?.streakLength || 0) || 0,
    oppStreakLength: Number(opponentTeamState?.streakLength || 0) || 0,
    pickLossButNotDeadFlag,
    oppLossButNotDeadFlag: opponentLossButNotDeadFlag,
    pickSlumpingLoserFlag,
    oppSlumpingLoserFlag: opponentSlumpingLoserFlag,
    pickHighSnapbackLowFormFlag,
    oppHighSnapbackLowFormFlag: opponentHighSnapbackLowFormFlag,
    pickRelieverCommandRisk: Number.isFinite(pickRelieverCommandRisk)
      ? roundToTenths(pickRelieverCommandRisk)
      : null,
    oppRelieverCommandRisk: Number.isFinite(opponentRelieverCommandRisk)
      ? roundToTenths(opponentRelieverCommandRisk)
      : null,
    relieverCommandGap: Number.isFinite(relieverCommandGap)
      ? roundToTenths(relieverCommandGap)
      : null,
    pickThirdTimePenalty: Number.isFinite(pickThirdTimePenalty)
      ? roundToTenths(pickThirdTimePenalty)
      : null,
    oppThirdTimePenalty: Number.isFinite(opponentThirdTimePenalty)
      ? roundToTenths(opponentThirdTimePenalty)
      : null,
    statefulOpponentSnapbackTrapFlag: opponentSnapbackTrapFlag,
    statefulOpponentImprovingContactBouncebackFlag: opponentImprovingContactBouncebackFlag,
    statefulHeatRegressionTrapFlag: pickHeatRegressionTrapFlag,
    statefulTopOrderPressureTrapFlag: pickTopOrderPressureTrapFlag,
    statefulSeriesCarryoverTrapFlag: seriesCarryoverTrapFlag,
    statefulSuggestedEdgeHaircut: stateSuggestedEdgeHaircut,
    statefulSuggestedConfidenceHaircut: stateSuggestedConfidenceHaircut,
    may30QuietStartRiskFlag,
    may30TrafficNoConversionRiskFlag,
    may30QuietFirst5RiskFlag,
    tierThreeBullpenCommandMismatchFlag: bullpenCommandMismatchFlag,
    tierThreeSuggestedEdgeHaircut: bullpenCommandMismatchFlag ? 3 : 0,
    tierThreeSuggestedConfidenceHaircut: bullpenCommandMismatchFlag ? 6 : 0,
    projectedHitConfidence: Number.isFinite(projectedHitConfidence)
      ? roundToTenths(projectedHitConfidence)
      : null,
    projectedHitEdgeForPick,
    hitEdgeAgainstPick,
    confidenceDelta,
    volatilityDelta,
    notes
  }
}


export { buildMlbDecisionIndicators }
