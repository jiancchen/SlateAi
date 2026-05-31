import {
  americanToDecimal,
  formatAmericanOdds,
  formatProbability,
  impliedProbabilityFromAmerican,
  normalizeText
} from './core-utils.js'

const buildParticipantAliases = (name) => {
  const normalized = normalizeText(name)

  if (!normalized) return []

  const tokens = normalized.split(' ')
  const aliases = new Set([normalized, tokens.at(-1), tokens[0]])

  return [...aliases].filter((alias) => alias && alias.length >= 3)
}

const findAnalysisParticipant = (leanText, participants) => {
  const normalizedLean = normalizeText(leanText).replace(/^lean\s+/, '')
  let bestMatch = null

  participants.forEach((participant) => {
    buildParticipantAliases(participant.name).forEach((alias) => {
      const index = normalizedLean.indexOf(alias)

      if (index === -1) return

      if (
        !bestMatch ||
        index < bestMatch.index ||
        (index === bestMatch.index && alias.length > bestMatch.aliasLength)
      ) {
        bestMatch = {
          participant,
          index,
          aliasLength: alias.length
        }
      }
    })
  })

  return bestMatch?.participant ?? null
}

const buildParticipantModel = (game, side, index, americanOdds = null) => {
  const decimalOdds = americanToDecimal(americanOdds)
  const impliedProbability = impliedProbabilityFromAmerican(americanOdds)

  return {
    id: `${game.id}:${index}`,
    index,
    role: side.side,
    name: side.name,
    detail: side.detail,
    americanOdds,
    americanLabel: formatAmericanOdds(americanOdds),
    decimalOdds,
    impliedProbability,
    impliedProbabilityLabel: formatProbability(impliedProbability)
  }
}


export {
  buildParticipantModel,
  findAnalysisParticipant
}
