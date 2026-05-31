import { clamp, formatProbability } from './core-utils.js'
import { computeNoVigProbabilities } from './market-utils.js'

const sportMarketWeights = {
  MLB: 0.26,
  UFC: 0.32,
  NBA: 0.28,
  WNBA: 0.28
}

const createSignal = (label, weight, values, source = '') => ({
  label,
  weight,
  values,
  source
})

const normalizeSignal = (signal, participants) => {
  const values = participants.map((participant, index) => {
    const rawValue = signal.values?.[index] ?? {}

    return {
      index,
      participantId: participant.id,
      score: clamp(Number(rawValue.score) || 50, 0, 100),
      label: rawValue.label || 'No structured input'
    }
  })

  const sortedValues = [...values].sort((left, right) => right.score - left.score)
  const leader = sortedValues[0]
  const runnerUp = sortedValues[1] ?? sortedValues[0]

  return {
    ...signal,
    values,
    margin: leader.score - runnerUp.score,
    favoredParticipantId: participants[leader.index].id,
    favoredParticipant: participants[leader.index],
    summary: `${signal.label}: ${participants[leader.index].name} (${leader.label}) vs ${
      participants[runnerUp.index].name
    } (${runnerUp.label})`
  }
}

const buildMarketSignal = (league, participants) => {
  const noVigProbabilities = computeNoVigProbabilities(
    participants.map((participant) => participant.americanOdds)
  )

  if (noVigProbabilities.length !== participants.length) return null

  return createSignal(
    'Market price',
    sportMarketWeights[league] ?? 0.28,
    noVigProbabilities.map((probability) => ({
      label: `${formatProbability(probability)} no-vig`,
      score: probability * 100
    })),
    'Moneyline board'
  )
}


export {
  createSignal,
  normalizeSignal,
  buildMarketSignal
}
