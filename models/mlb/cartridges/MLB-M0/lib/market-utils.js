import { impliedProbabilityFromAmerican } from './core-utils.js'

const getMoneylineMarket = (odds = {}) =>
  odds.markets?.find((market) => /moneyline|winner/i.test(market.label))

const getTotalMarketValue = (odds = {}) =>
  odds.markets?.find((market) => /total/i.test(market.label))?.value ?? ''

const parseFirstTotalNumber = (value = '') => {
  const match = value.match(/(\d+(?:\.\d+)?)/)

  return match ? Number(match[1]) : null
}

const computeNoVigProbabilities = (americanOdds = []) => {
  const implied = americanOdds.map(impliedProbabilityFromAmerican)

  if (implied.some((value) => !Number.isFinite(value))) return []

  const total = implied.reduce((sum, value) => sum + value, 0)

  if (!total) return []

  return implied.map((value) => value / total)
}


export {
  getMoneylineMarket,
  getTotalMarketValue,
  parseFirstTotalNumber,
  computeNoVigProbabilities
}
