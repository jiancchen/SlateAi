import { parseAmericanOddsPair } from './core-utils.js'
import { getMoneylineMarket } from './market-utils.js'
import { buildParticipantModel } from './participant-model.js'

const unavailablePlayerProps = {
  available: false,
  picks: [],
  candidates: [],
  summary: 'No player-prop model adapter supplied'
}

export const createSportsMatchModelFactory = ({
  buildAnalysisModel,
  buildPlayerProps = () => unavailablePlayerProps
} = {}) => {
  if (typeof buildAnalysisModel !== 'function') {
    throw new Error('createSportsMatchModelFactory requires a buildAnalysisModel adapter')
  }

  return (game, fallbackOddsProvider = '') => {
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
    const playerProps = buildPlayerProps(game, analysis) || unavailablePlayerProps

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
        tagCount: game.tags?.length ?? 0,
        hasSeriesBreakdown: Boolean(game.seriesBreakdown),
        hasMoneyline: Boolean(moneylineMarket),
        hasAnalysisPick: Boolean(analysis.participantId),
        hasStructuredInputs: analysis.inputsUsed > 0,
        hasPlayerProps: Boolean(playerProps.available),
        startMinutes: game.startMinutes,
        spotlight: game.spotlight,
        league: game.league,
        oddsProvider
      }
    }
  }
}
