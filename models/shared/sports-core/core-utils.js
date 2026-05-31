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

export const clamp = (value, min, max) => Math.min(max, Math.max(min, value))

export const average = (values) =>
  values.length > 0 ? values.reduce((total, value) => total + value, 0) / values.length : 0

export const roundToTenths = (value) => Math.round(value * 10) / 10

export const normalizeText = (value = '') =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

export const getAnalysisTier = (confidence, volatility) => {
  if (confidence >= 76 && volatility <= 46) return 'Core'
  if (confidence >= 70) return 'Strong'
  if (confidence >= 64 && volatility <= 58) return 'Lean'

  return 'Swingy'
}

export const formatAmericanOdds = (americanOdds) => {
  if (!Number.isFinite(americanOdds)) return 'N/A'

  const rounded = Math.round(americanOdds)

  return rounded > 0 ? `+${rounded}` : `${rounded}`
}

export const formatCurrency = (value) =>
  currencyFormatter.format(Number.isFinite(value) ? value : 0)

export const formatProbability = (value) =>
  Number.isFinite(value) ? percentFormatter.format(value) : 'N/A'

export const americanToDecimal = (americanOdds) => {
  if (!Number.isFinite(americanOdds)) return null

  return americanOdds > 0 ? 1 + americanOdds / 100 : 1 + 100 / Math.abs(americanOdds)
}

export const decimalToAmerican = (decimalOdds) => {
  if (!Number.isFinite(decimalOdds) || decimalOdds <= 1) return null

  if (decimalOdds >= 2) return Math.round((decimalOdds - 1) * 100)

  return Math.round(-100 / (decimalOdds - 1))
}

export const impliedProbabilityFromAmerican = (americanOdds) => {
  if (!Number.isFinite(americanOdds)) return null

  return americanOdds > 0
    ? 100 / (americanOdds + 100)
    : Math.abs(americanOdds) / (Math.abs(americanOdds) + 100)
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

export const parseRecord = (value = '') => {
  const match = value.match(/(\d+)-(\d+)(?:-(\d+))?/)

  if (!match) return null

  const wins = Number(match[1])
  const losses = Number(match[2])
  const draws = Number(match[3] || 0)
  const totalBouts = wins + losses + draws

  return {
    wins,
    losses,
    draws,
    totalBouts,
    winPct: totalBouts > 0 ? wins / totalBouts : 0.5
  }
}
