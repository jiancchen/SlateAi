import {
  clamp,
  impliedProbabilityFromAmerican,
  roundToTenths
} from '../../../../shared/sports-core/core-utils.js'

const predictionEligible = (game) => game.predictionEligibility?.eligible !== false

export const rankAnalysisPicks = (games) =>
  games
    .filter((game) => predictionEligible(game) && game.analysis?.available)
    .map((game) => {
      const analysis = game.analysis ?? {}
      const indicatorSet = analysis.indicators ?? {}
      const confidence = analysis.confidence ?? 50
      const volatility = analysis.volatility ?? 50
      const recommendationScore = analysis.recommendationScore ?? 0
      const modelEdge = Math.abs(analysis.modelEdge ?? 0)
      const reliefPitchingRisk = indicatorSet.reliefPitchingRisk ?? 42
      const coinflipPressure = indicatorSet.coinflipPressure ?? 28
      const starterLeverageIndex = indicatorSet.starterLeverageIndex ?? 50
      const lateInningStabilityIndex = indicatorSet.lateInningStabilityIndex ?? 50
      const tierOneRiskPoints = indicatorSet.tierOneRiskPoints ?? 0
      const tierOnePassFlag = Boolean(indicatorSet.tierOnePassFlag)
      const offenseFeedStale = Boolean(
        game.offenseContext?.away?.staleFeed || game.offenseContext?.home?.staleFeed
      )
      const bullpenFeedStale = Boolean(
        game.bullpenContext?.away?.staleFeed || game.bullpenContext?.home?.staleFeed
      )
      const lineupStatuses = [game.lineupBoard?.status?.away, game.lineupBoard?.status?.home].filter(
        Boolean
      )
      const postedLineupCount = lineupStatuses.filter((status) => status === 'posted').length
      const partialLineupCount = lineupStatuses.filter((status) => status === 'partial').length
      const impliedProbability =
        analysis.participant?.impliedProbability ?? analysis.marketProbability ?? null
      const americanOdds = analysis.participant?.americanOdds ?? null
      const pickIsFavorite = Number.isFinite(americanOdds)
        ? americanOdds < 0
        : Number.isFinite(impliedProbability)
          ? impliedProbability >= 0.5
          : false

      let safetyPenalty = 0

      if (game.league === 'MLB') {
        safetyPenalty += Math.max(volatility - 60, 0) * 1.7
        safetyPenalty += Math.max(coinflipPressure - 34, 0) * 1.35
        safetyPenalty += Math.max(56 - lateInningStabilityIndex, 0) * 1.15
        safetyPenalty += Math.max(reliefPitchingRisk - 48, 0) * 0.55
        safetyPenalty += Math.max(6 - modelEdge, 0) * 2.6

        if (analysis.tier === 'Swingy') safetyPenalty += 18
        if (tierOnePassFlag || analysis.tier === 'Pass') safetyPenalty += 26
        if (tierOneRiskPoints >= 3) safetyPenalty += 8
        if (starterLeverageIndex >= 60 && lateInningStabilityIndex <= 50) safetyPenalty += 10
        if (offenseFeedStale) safetyPenalty += 16
        if (bullpenFeedStale) safetyPenalty += 12

        if (lineupStatuses.length && postedLineupCount < 2) {
          safetyPenalty += partialLineupCount > 0 ? 4 : 8
        }

        if (
          pickIsFavorite &&
          Number.isFinite(impliedProbability) &&
          impliedProbability >= 0.54 &&
          impliedProbability <= 0.65 &&
          volatility >= 70
        ) {
          safetyPenalty += 14
        }

        if (pickIsFavorite && confidence < 70 && volatility >= 74) {
          safetyPenalty += 10
        }
      } else {
        safetyPenalty += Math.max(volatility - 68, 0) * 0.8
      }

      const safetyScore = Math.round(recommendationScore - safetyPenalty)
      const coreEligible =
        game.league === 'MLB'
          ? !offenseFeedStale &&
            !bullpenFeedStale &&
            !tierOnePassFlag &&
            volatility <= 72 &&
            coinflipPressure <= 58 &&
            lateInningStabilityIndex >= 46 &&
            confidence >= 64 &&
            modelEdge >= 3.5 &&
            analysis.tier !== 'Swingy' &&
            analysis.tier !== 'Pass' &&
            tierOneRiskPoints <= 2
          : volatility <= 74 && confidence >= 64

      return {
        game,
        safetyScore,
        coreEligible,
        safetyPenalty: Math.round(safetyPenalty),
        pickIsFavorite,
        offenseFeedStale,
        bullpenFeedStale
      }
    })
    .sort((left, right) => {
      if (left.coreEligible !== right.coreEligible) {
        return Number(right.coreEligible) - Number(left.coreEligible)
      }

      if (right.safetyScore !== left.safetyScore) {
        return right.safetyScore - left.safetyScore
      }

      if (right.game.analysis.confidence !== left.game.analysis.confidence) {
        return right.game.analysis.confidence - left.game.analysis.confidence
      }

      if (left.game.analysis.volatility !== right.game.analysis.volatility) {
        return left.game.analysis.volatility - right.game.analysis.volatility
      }

      return right.game.analysis.recommendationScore - left.game.analysis.recommendationScore
    })
    .map((entry, index) => {
      const game = entry.game

      return {
        rank: index + 1,
        gameId: game.id,
        league: game.league,
        gameTitle: game.title,
        start: game.start,
        stage: game.stage,
        confidence: game.analysis.confidence,
        volatility: game.analysis.volatility,
        recommendationScore: game.analysis.recommendationScore,
        tier: game.analysis.tier,
        participantId: game.analysis.participantId,
        participant: game.analysis.participant,
        opponent: game.analysis.opponent,
        lean: game.analysis.lean,
        rationale: game.analysis.rationale,
        modelEdge: game.analysis.modelEdge,
        modelEdgeLabel: game.analysis.modelEdgeLabel,
        marketProbabilityLabel: game.analysis.marketProbabilityLabel,
        inputSummaries: game.analysis.inputs,
        safetyScore: entry.safetyScore,
        safetyPenalty: entry.safetyPenalty,
        coreEligible: entry.coreEligible,
        game
      }
    })

const efficientFavoriteReasonText = {
  moderateFavoritePrice: 'moderate favorite price',
  favoritePriceStillPlayable: 'still-playable favorite price',
  starterControl: 'clean starter control',
  lateHoldSupport: 'stable late hold',
  lineupConversionSupport: 'lineup conversion support',
  broadSupport: 'broad signal support',
  modelAgreement: 'model agreement'
}

export const rankEfficientFavoritePicks = (games) =>
  games
    .filter((game) => predictionEligible(game) && game.analysis?.available && game.moneyline?.available)
    .map((game) => {
      const analysis = game.analysis ?? {}
      const indicatorSet = analysis.indicators ?? {}

      if (!indicatorSet.efficientFavoriteCandidateFlag) return null

      const favoriteAndDog = getFavoriteAndUnderdog(game)

      if (!favoriteAndDog) return null

      const { favorite, underdog } = favoriteAndDog

      if (analysis.participantId !== favorite.id) return null

      const reasonLabels = (indicatorSet.efficientFavoriteReasons ?? [])
        .map((code) => efficientFavoriteReasonText[code] ?? code)
      const rationale =
        reasonLabels.length > 0
          ? `${favorite.name} qualify as an efficient favorite because the lane is supported by ${reasonLabels.join(', ')}.`
          : `${favorite.name} qualify as an efficient favorite on the current board.`

      return {
        gameId: game.id,
        league: game.league,
        gameTitle: game.title,
        start: game.start,
        stage: game.stage,
        confidence: analysis.confidence,
        volatility: analysis.volatility,
        recommendationScore: indicatorSet.efficientFavoriteScore ?? analysis.recommendationScore ?? 0,
        tier: indicatorSet.efficientFavoriteTier ?? 'Efficient favorite',
        participantId: favorite.id,
        participant: favorite,
        opponent: underdog,
        lean: `Efficient favorite: ${favorite.name} have enough clean support to justify a favorite ticket here.`,
        rationale,
        modelEdge: analysis.modelEdge,
        modelEdgeLabel: analysis.modelEdgeLabel,
        marketProbabilityLabel: favorite.impliedProbabilityLabel,
        inputSummaries: analysis.inputs,
        efficientFavoriteScore: indicatorSet.efficientFavoriteScore ?? 0,
        efficientFavoriteReasons: indicatorSet.efficientFavoriteReasons ?? [],
        efficientFavoritePenaltyFlags: indicatorSet.efficientFavoritePenaltyFlags ?? [],
        efficientFavoriteBlockers: indicatorSet.efficientFavoriteBlockers ?? [],
        game
      }
    })
    .filter(Boolean)
    .sort((left, right) => {
      if (right.efficientFavoriteScore !== left.efficientFavoriteScore) {
        return right.efficientFavoriteScore - left.efficientFavoriteScore
      }

      if (right.confidence !== left.confidence) {
        return right.confidence - left.confidence
      }

      if (left.volatility !== right.volatility) {
        return left.volatility - right.volatility
      }

      return right.recommendationScore - left.recommendationScore
    })
    .map((pick, index) => ({
      ...pick,
      rank: index + 1
    }))

const getFavoriteAndUnderdog = (game) => {
  const participants = game.moneyline?.participants?.filter((participant) =>
    Number.isFinite(participant.americanOdds)
  )

  if (!participants || participants.length < 2) return null

  const sorted = [...participants].sort((left, right) => {
    const leftProbability = left.impliedProbability ?? impliedProbabilityFromAmerican(left.americanOdds) ?? 0
    const rightProbability =
      right.impliedProbability ?? impliedProbabilityFromAmerican(right.americanOdds) ?? 0

    return rightProbability - leftProbability
  })

  return {
    favorite: sorted[0],
    underdog: sorted.at(-1)
  }
}

const getUnderdogRangeBonus = (americanOdds) => {
  if (!Number.isFinite(americanOdds)) return 0
  if (americanOdds <= 110) return 6
  if (americanOdds <= 145) return 12
  if (americanOdds <= 190) return 9
  if (americanOdds <= 240) return 5
  if (americanOdds <= 290) return 1

  return -10
}

export const rankFlipRiskPicks = (games) =>
  games
    .filter((game) => predictionEligible(game) && game.analysis?.available && game.moneyline?.available)
    .map((game) => {
      const favoriteAndDog = getFavoriteAndUnderdog(game)

      if (!favoriteAndDog) return null

      const { favorite, underdog } = favoriteAndDog
      const marketGap = Math.abs(
        (favorite.impliedProbability ?? 0) - (underdog.impliedProbability ?? 0)
      )
      const indicatorSet = game.analysis.indicators ?? {}
      const volatility = game.analysis.volatility ?? 50
      const confidence = game.analysis.confidence ?? 50
      const modelEdge = Math.abs(game.analysis.modelEdge ?? 0)
      const reliefPitchingRisk = indicatorSet.reliefPitchingRisk ?? 42
      const coinflipPressure = indicatorSet.coinflipPressure ?? 28
      const starterLeverageIndex = indicatorSet.starterLeverageIndex ?? 50
      const lateInningStabilityIndex = indicatorSet.lateInningStabilityIndex ?? 50
      const modelAlreadyLikesDog = game.analysis.participantId === underdog.id
      const underdogRangeBonus = getUnderdogRangeBonus(Math.abs(underdog.americanOdds))
      const heavyFavoritePenalty =
        game.analysis.participantId === favorite.id && confidence >= 76 && volatility <= 48 ? 18 : 0
      const splitScriptBonus =
        starterLeverageIndex >= 60 && lateInningStabilityIndex <= 48 ? 8 : 0
      const marketTightnessBonus = clamp(30 - marketGap * 100, 0, 24) * 0.45
      const flipBlendSignals = [
        clamp((volatility - 52) / 32, 0, 1) * 0.2,
        clamp((72 - confidence) / 24, 0, 1) * 0.16,
        clamp((10 - modelEdge) / 10, 0, 1) * 0.13,
        clamp((reliefPitchingRisk - 38) / 42, 0, 1) * 0.14,
        clamp((coinflipPressure - 18) / 42, 0, 1) * 0.14,
        clamp((starterLeverageIndex - lateInningStabilityIndex + 8) / 34, 0, 1) * 0.1,
        clamp(marketTightnessBonus / 18, 0, 1) * 0.05,
        clamp((underdogRangeBonus + 10) / 22, 0, 1) * 0.04,
        (modelAlreadyLikesDog ? 1 : 0) * 0.03,
        (splitScriptBonus ? 1 : 0) * 0.01
      ]
      const flipProbability = clamp(
        0.18 + flipBlendSignals.reduce((sum, value) => sum + value, 0) * 0.56 - heavyFavoritePenalty / 140,
        0.18,
        0.74
      )
      const flipScore = roundToTenths(flipProbability * 100)
      const flipTier =
        flipScore >= 76 ? 'High-volatility core' : flipScore >= 66 ? 'Live dog' : 'Fragile-favorite fade'
      const flipReason = modelAlreadyLikesDog
        ? `${underdog.name} is already the model dog and the game profile is volatile enough to keep the upset live.`
        : `${favorite.name} is carrying a more fragile favorite script, so ${underdog.name} becomes the flip side.`

      return {
        gameId: game.id,
        league: game.league,
        gameTitle: game.title,
        start: game.start,
        stage: game.stage,
        confidence,
        volatility,
        recommendationScore: flipScore,
        tier: flipTier,
        participantId: underdog.id,
        participant: underdog,
        opponent: favorite,
        lean: `Flip-risk look: ${underdog.name} can punish a fragile ${favorite.name} favorite script.`,
        rationale: flipReason,
        modelEdge: game.analysis.modelEdge,
        modelEdgeLabel: game.analysis.modelEdgeLabel,
        marketProbabilityLabel: underdog.impliedProbabilityLabel,
        inputSummaries: game.analysis.inputs,
        flipProbability,
        flipScore,
        flipReason,
        isModelUnderdog: modelAlreadyLikesDog,
        game
      }
    })
    .filter(Boolean)
    .sort((left, right) => {
      if (right.flipScore !== left.flipScore) {
        return right.flipScore - left.flipScore
      }

      if (right.volatility !== left.volatility) {
        return right.volatility - left.volatility
      }

      return left.confidence - right.confidence
    })
    .map((pick, index) => ({
      ...pick,
      rank: index + 1
    }))
