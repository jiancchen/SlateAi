import { buildAnalysisModel } from './analysis-model.js'
import { buildMlbPlayerProps } from './mlb-props.js'
import { createSportsMatchModelFactory } from '../../../../shared/sports-core/match-model.js'

export {
  americanToDecimal,
  decimalToAmerican,
  formatAmericanOdds,
  formatCurrency,
  formatProbability,
  impliedProbabilityFromAmerican,
  parseAmericanOddsPair
} from '../../../../shared/sports-core/core-utils.js'
export { createSportsMatchModelFactory } from '../../../../shared/sports-core/match-model.js'
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

export const createSportsMatchModel = createSportsMatchModelFactory({
  buildAnalysisModel,
  buildPlayerProps: buildMlbPlayerProps
})
