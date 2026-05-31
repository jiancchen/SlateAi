import { buildAnalysisModel } from './analysis-model.js'
import { parseAmericanOddsPair } from './core-utils.js'
import { getMoneylineMarket } from './market-utils.js'
import { buildMlbPlayerProps } from './mlb-props.js'
import { buildParticipantModel } from './participant-model.js'

export {
  americanToDecimal,
  decimalToAmerican,
  formatAmericanOdds,
  formatCurrency,
  formatProbability,
  impliedProbabilityFromAmerican,
  parseAmericanOddsPair
} from './core-utils.js'
export { simulateMlbGame } from './mlb-simulation.js'
export {
  rankAnalysisPicks,
  rankEfficientFavoritePicks,
  rankFlipRiskPicks
} from './pick-rankings.js'
export { buildParlayModel, createParlayLeg } from './parlay.js'
export {
  rankMlbPlayerPropCandidatesLegacy,
  rankMlbPlayerProps
} from './mlb-props.js'

export const createSportsMatchModel = (game, fallbackOddsProvider = '') => {
  const oddsProvider = game.odds?.provider || fallbackOddsProvider
  const moneylineMarket = getMoneylineMarket(game.odds)
  const parsedMoneylineOdds = parseAmericanOddsPair(moneylineMarket?.value)
  const participantOrder = game.odds?.participantOrder || game.matchup.map((_, index) => index)
  const oddsByParticipantIndex = new Map(
    participantOrder.map((participantIndex, oddsIndex) => [
      participantIndex,
      parsedMoneylineOdds[oddsIndex] ?? null
    ])
  )

  const participants = game.matchup.map((side, index) =>
    buildParticipantModel(game, side, index, oddsByParticipantIndex.get(index) ?? null)
  )

  const moneylineParticipants = participants.filter((participant) =>
    Number.isFinite(participant.americanOdds)
  )
  const analysis = buildAnalysisModel(
    game,
    participants,
    moneylineParticipants.length === game.matchup.length
  )
  const playerProps = buildMlbPlayerProps(game, analysis)

  return {
    ...game,
    odds: {
      ...game.odds,
      provider: oddsProvider
    },
    participants,
    moneyline: {
      available: moneylineParticipants.length === game.matchup.length,
      label: moneylineMarket?.label || 'Moneyline',
      provider: oddsProvider,
      participants: moneylineParticipants
    },
    analysis,
    playerProps,
    metadata: {
      participantCount: participants.length,
      participantNames: participants.map((participant) => participant.name),
      tagCount: game.tags.length,
      hasSeriesBreakdown: Boolean(game.seriesBreakdown),
      hasMoneyline: Boolean(moneylineMarket),
      hasAnalysisPick: Boolean(analysis.participantId),
      hasStructuredInputs: analysis.inputsUsed > 0,
      hasPlayerProps: playerProps.available,
      startMinutes: game.startMinutes,
      spotlight: game.spotlight,
      league: game.league,
      oddsProvider
    }
  }
}
