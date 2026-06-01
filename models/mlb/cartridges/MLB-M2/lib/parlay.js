import {
  decimalToAmerican,
  formatAmericanOdds,
  formatCurrency,
  formatProbability
} from '../../../../shared/sports-core/core-utils.js'

export const createParlayLeg = (game, participantId, selectionSource = 'manual') => {
  const pick = game.moneyline.participants.find((participant) => participant.id === participantId)

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
      ? activeLegs.reduce((total, leg) => total * leg.decimalOdds, 1)
      : null
  const combinedAmericanOdds = decimalToAmerican(combinedDecimalOdds)
  const impliedProbability =
    activeLegs.length > 0
      ? activeLegs.reduce((total, leg) => total * leg.impliedProbability, 1)
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
