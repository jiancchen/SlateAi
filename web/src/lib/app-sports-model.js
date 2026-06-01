const americanPattern = /[+-]\d+(?:\.\d+)?/g

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 2
})

const percentFormatter = new Intl.NumberFormat('en-US', {
  style: 'percent',
  minimumFractionDigits: 1,
  maximumFractionDigits: 1
})

const clamp = (value, min, max) => Math.min(max, Math.max(min, value))
const roundToTenths = (value) => Math.round(value * 10) / 10

export const formatAmericanOdds = (americanOdds) => {
  if (!Number.isFinite(Number(americanOdds))) return 'N/A'
  const rounded = Math.round(Number(americanOdds))
  return rounded > 0 ? `+${rounded}` : `${rounded}`
}

export const formatCurrency = (value) =>
  currencyFormatter.format(Number.isFinite(Number(value)) ? Number(value) : 0)

export const formatProbability = (value) =>
  Number.isFinite(Number(value)) ? percentFormatter.format(Number(value)) : 'N/A'

export const americanToDecimal = (americanOdds) => {
  const odds = Number(americanOdds)
  if (!Number.isFinite(odds)) return null
  return odds > 0 ? 1 + odds / 100 : 1 + 100 / Math.abs(odds)
}

export const decimalToAmerican = (decimalOdds) => {
  const decimal = Number(decimalOdds)
  if (!Number.isFinite(decimal) || decimal <= 1) return null
  if (decimal >= 2) return Math.round((decimal - 1) * 100)
  return Math.round(-100 / (decimal - 1))
}

export const impliedProbabilityFromAmerican = (americanOdds) => {
  const odds = Number(americanOdds)
  if (!Number.isFinite(odds)) return null
  return odds > 0 ? 100 / (odds + 100) : Math.abs(odds) / (Math.abs(odds) + 100)
}

export const parseAmericanOddsPair = (value) => {
  if (!value) return []
  const normalized = `${value}`
    .replace(/\beven\b/gi, '+100')
    .replace(/\bev\b/gi, '+100')
    .replace(/\bpk\b/gi, '+100')
    .replace(/\bpick(?:'em|em)?\b/gi, '+100')
  return [...normalized.matchAll(americanPattern)].map((match) => Number(match[0]))
}

const getMoneylineMarket = (odds) =>
  odds?.markets?.find((market) => /moneyline|winner|matchup|approx winner/i.test(market.label || '')) ??
  odds?.markets?.[0] ??
  null

const buildParticipantModel = (game, side, index, americanOdds) => {
  const decimalOdds = americanToDecimal(americanOdds)
  const impliedProbability = impliedProbabilityFromAmerican(americanOdds)
  return {
    id: `${game.id}:${index}`,
    index,
    role: side.side || side.role || `Side ${index + 1}`,
    name: side.name,
    detail: side.detail,
    americanOdds,
    americanLabel: Number.isFinite(Number(americanOdds)) ? formatAmericanOdds(Number(americanOdds)) : 'N/A',
    decimalOdds,
    impliedProbability,
    impliedProbabilityLabel: formatProbability(impliedProbability)
  }
}

export const createSportsMatchModel = (game, fallbackOddsProvider = '') => {
  const matchup = Array.isArray(game.matchup) ? game.matchup : []
  const oddsProvider = game.odds?.provider || fallbackOddsProvider
  const moneylineMarket = getMoneylineMarket(game.odds)
  const parsedMoneylineOdds = parseAmericanOddsPair(moneylineMarket?.value)
  const participantOrder = game.odds?.participantOrder || matchup.map((_, index) => index)
  const oddsByParticipantIndex = new Map(
    participantOrder.map((participantIndex, oddsIndex) => [
      participantIndex,
      parsedMoneylineOdds[oddsIndex] ?? null
    ])
  )
  const participants = matchup.map((side, index) =>
    buildParticipantModel(game, side, index, oddsByParticipantIndex.get(index) ?? null)
  )
  const moneylineParticipants = participants.filter((participant) =>
    Number.isFinite(Number(participant.americanOdds))
  )
  const participant =
    moneylineParticipants.find((entry) => entry.name && game.lean?.includes(entry.name)) ??
    moneylineParticipants[0] ??
    participants[0] ??
    null

  return {
    ...game,
    odds: { ...game.odds, provider: oddsProvider },
    participants,
    moneyline: {
      available: moneylineParticipants.length === matchup.length && matchup.length > 0,
      label: moneylineMarket?.label || 'Moneyline',
      provider: oddsProvider,
      participants: moneylineParticipants
    },
    analysis: {
      available: Boolean(participant),
      participantId: participant?.id ?? null,
      participant,
      opponent: moneylineParticipants.find((entry) => entry.id !== participant?.id) ?? null,
      lean: game.lean || '',
      rationale: game.summary || '',
      confidence: game.confidence ?? 50,
      volatility: game.volatility ?? 50,
      recommendationScore: Math.max(0, Math.round((game.confidence ?? 50) - (game.volatility ?? 50) * 0.25)),
      tier: game.confidence >= 70 ? 'Lean' : 'Watch',
      sourceLabel: game.odds?.provider || oddsProvider || 'Published slate',
      modelEdge: null,
      modelEdgeLabel: '',
      marketProbability: participant?.impliedProbability ?? null,
      marketProbabilityLabel: participant?.impliedProbabilityLabel ?? 'N/A',
      inputs: [],
      inputsUsed: 0,
      volatilityNotes: [],
      indicators: {}
    },
    metadata: {
      participantCount: participants.length,
      participantNames: participants.map((entry) => entry.name),
      tagCount: game.tags?.length ?? 0,
      hasSeriesBreakdown: Boolean(game.seriesBreakdown),
      hasMoneyline: Boolean(moneylineMarket),
      hasAnalysisPick: Boolean(participant),
      hasStructuredInputs: false,
      hasPlayerProps: false,
      startMinutes: game.startMinutes,
      spotlight: game.spotlight,
      league: game.league,
      oddsProvider
    }
  }
}

export const createParlayLeg = (game, participantId, selectionSource = 'manual') => {
  const pick = game.moneyline?.participants?.find((participant) => participant.id === participantId)
  if (!pick) return null
  const opponent = game.moneyline.participants.find((participant) => participant.id !== participantId)
  const isAnalystPick = game.analysis?.participantId === pick.id
  return {
    id: pick.id,
    gameId: game.id,
    gameTitle: game.title,
    league: game.league,
    start: game.start,
    stage: game.stage,
    pickName: pick.name,
    opponentName: opponent?.name || 'the other side',
    americanOdds: pick.americanOdds,
    americanLabel: pick.americanLabel,
    decimalOdds: pick.decimalOdds,
    impliedProbability: pick.impliedProbability,
    impliedProbabilityLabel: pick.impliedProbabilityLabel,
    selectionSource,
    isAnalystPick,
    analysisConfidence: game.analysis?.confidence ?? null,
    analysisTier: game.analysis?.tier ?? null
  }
}

export const buildParlayModel = (legs, rawStake = 25) => {
  const activeLegs = legs.filter(Boolean)
  const stake = Number(rawStake)
  const sanitizedStake = Number.isFinite(stake) && stake > 0 ? stake : 0
  const combinedDecimalOdds =
    activeLegs.length > 0
      ? activeLegs.reduce((total, leg) => total * Number(leg.decimalOdds || 1), 1)
      : null
  const combinedAmericanOdds = decimalToAmerican(combinedDecimalOdds)
  const impliedProbability =
    activeLegs.length > 0
      ? activeLegs.reduce((total, leg) => total * Number(leg.impliedProbability || 0), 1)
      : null
  const grossReturn = combinedDecimalOdds ? sanitizedStake * combinedDecimalOdds : 0
  const profit = Math.max(grossReturn - sanitizedStake, 0)
  return {
    legs: activeLegs,
    legCount: activeLegs.length,
    stake: sanitizedStake,
    combinedDecimalOdds,
    combinedDecimalLabel: combinedDecimalOdds ? combinedDecimalOdds.toFixed(2) : 'N/A',
    combinedAmericanOdds,
    combinedAmericanLabel: formatAmericanOdds(combinedAmericanOdds),
    impliedProbability,
    impliedProbabilityLabel: formatProbability(impliedProbability),
    grossReturn,
    grossReturnLabel: formatCurrency(grossReturn),
    profit,
    profitLabel: formatCurrency(profit),
    metadata: {
      leagues: [...new Set(activeLegs.map((leg) => leg.league))],
      gameTitles: activeLegs.map((leg) => leg.gameTitle),
      analystPickCount: activeLegs.filter((leg) => leg.isAnalystPick).length
    }
  }
}

const getFavoriteAndUnderdog = (game) => {
  const participants = game.moneyline?.participants?.filter((participant) =>
    Number.isFinite(Number(participant.americanOdds))
  )
  if (!participants || participants.length < 2) return null
  const sorted = [...participants].sort((left, right) => {
    const leftProbability = left.impliedProbability ?? impliedProbabilityFromAmerican(left.americanOdds) ?? 0
    const rightProbability =
      right.impliedProbability ?? impliedProbabilityFromAmerican(right.americanOdds) ?? 0
    return rightProbability - leftProbability
  })
  return { favorite: sorted[0], underdog: sorted.at(-1) }
}

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
    .filter((game) => game.analysis?.available && game.moneyline?.available)
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
      if (right.efficientFavoriteScore !== left.efficientFavoriteScore) return right.efficientFavoriteScore - left.efficientFavoriteScore
      if (right.confidence !== left.confidence) return right.confidence - left.confidence
      if (left.volatility !== right.volatility) return left.volatility - right.volatility
      return right.recommendationScore - left.recommendationScore
    })
    .map((pick, index) => ({ ...pick, rank: index + 1 }))

const getUnderdogRangeBonus = (americanOdds) => {
  if (!Number.isFinite(Number(americanOdds))) return 0
  const odds = Number(americanOdds)
  if (odds <= 110) return 6
  if (odds <= 145) return 12
  if (odds <= 190) return 9
  if (odds <= 240) return 5
  if (odds <= 290) return 1
  return -10
}

export const rankFlipRiskPicks = (games) =>
  games
    .filter((game) => game.analysis?.available && game.moneyline?.available)
    .map((game) => {
      const favoriteAndDog = getFavoriteAndUnderdog(game)
      if (!favoriteAndDog) return null
      const { favorite, underdog } = favoriteAndDog
      const marketGap = Math.abs((favorite.impliedProbability ?? 0) - (underdog.impliedProbability ?? 0))
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
        flipScore >= 76 ? 'High-volatility core' : flipScore >= 66 ? 'Live underdog' : 'Fragile-favorite fade'
      const flipReason = modelAlreadyLikesDog
        ? `${underdog.name} is already the model underdog and the game profile is volatile enough to keep the upset live.`
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
      if (right.flipScore !== left.flipScore) return right.flipScore - left.flipScore
      if (right.volatility !== left.volatility) return right.volatility - left.volatility
      return left.confidence - right.confidence
    })
    .map((pick, index) => ({ ...pick, rank: index + 1 }))

export const rankMlbPlayerProps = (games) =>
  games
    .filter((game) => game.playerProps?.available)
    .flatMap((game) => game.playerProps.targets.map((target) => ({ ...target, game })))
    .sort((left, right) => {
      const rightScore = Number.isFinite(right.trackingScore) ? right.trackingScore : right.confidence
      const leftScore = Number.isFinite(left.trackingScore) ? left.trackingScore : left.confidence
      if (rightScore !== leftScore) return rightScore - leftScore
      if (right.confidence !== left.confidence) return right.confidence - left.confidence
      return right.expectedValue - left.expectedValue
    })
    .map((target, index) => ({ ...target, rank: index + 1 }))

