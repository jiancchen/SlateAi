import { structuredInputOverrides } from './structured-inputs.js'

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

const fallbackRecommendationWeight = {
  confidence: 0.72,
  stability: 0.28
}

const structuredRecommendationWeight = {
  confidence: 0.6,
  stability: 0.22,
  edge: 0.18
}

const sportMarketWeights = {
  MLB: 0.26,
  UFC: 0.32,
  NBA: 0.28,
  WNBA: 0.28
}

const sportVolatilityBase = {
  MLB: 52,
  UFC: 60,
  NBA: 54,
  WNBA: 60
}

const clamp = (value, min, max) => Math.min(max, Math.max(min, value))

const average = (values) =>
  values.length > 0 ? values.reduce((total, value) => total + value, 0) / values.length : 0

const roundToTenths = (value) => Math.round(value * 10) / 10

const normalizeText = (value = '') =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

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

const buildParticipantAliases = (name) => {
  const normalized = normalizeText(name)

  if (!normalized) return []

  const tokens = normalized.split(' ')
  const aliases = new Set([normalized, tokens.at(-1), tokens[0]])

  return [...aliases].filter((alias) => alias && alias.length >= 3)
}

const getAnalysisTier = (confidence, volatility) => {
  if (confidence >= 76 && volatility <= 46) return 'Core'
  if (confidence >= 70) return 'Strong'
  if (confidence >= 64 && volatility <= 58) return 'Lean'

  return 'Swingy'
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

const parseRecord = (value = '') => {
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

const parsePitcherDetail = (detail = '') => {
  const segments = detail.split('|').map((segment) => segment.trim())

  if (segments.length < 4) return null

  const headerMatch = segments[0].match(/^(.*?)\s+\(([^)]+)\)$/)
  const record = parseRecord(segments[1])
  const eraMatch = segments[2].match(/([\d.-]+)\s*ERA/i)
  const strikeoutMatch = segments[3].match(/(\d+)\s*SO/i)

  if (!record || !strikeoutMatch) return null

  const eraValue = eraMatch?.[1] === '-.--' ? null : Number(eraMatch?.[1])

  return {
    name: headerMatch?.[1] ?? segments[0],
    handedness: headerMatch?.[2] ?? '',
    wins: record.wins,
    losses: record.losses,
    decisions: record.wins + record.losses,
    winPct: record.winPct,
    era: Number.isFinite(eraValue) ? eraValue : null,
    strikeouts: Number(strikeoutMatch[1])
  }
}

const parseBaseballInnings = (value = 0) => {
  const stringValue = `${value}`.trim()
  const match = stringValue.match(/^(\d+)(?:\.(\d))?$/)

  if (!match) return Number(stringValue) || 0

  const wholeInnings = Number(match[1])
  const partialOuts = Number(match[2] || 0)

  return wholeInnings + (partialOuts === 1 ? 1 / 3 : partialOuts === 2 ? 2 / 3 : 0)
}

const normalizePitchHand = (value = '') => {
  const normalized = `${value}`.trim().toUpperCase()

  if (normalized.startsWith('L')) return 'L'
  if (normalized.startsWith('R')) return 'R'

  return ''
}

const formatPitcherType = (type = '', handedness = '') => {
  const handLabel = handedness === 'L' ? 'lefty' : handedness === 'R' ? 'righty' : 'starter'

  if (!type) return `Balanced ${handLabel}`.trim()
  if (type === 'Unknown sample') return `${type} ${handLabel}`.trim()
  if (type === 'Volatile bat-misser') return type
  if (type === 'Contact suppressor') return type

  return `${type} ${handLabel}`.trim()
}

const classifyPitcherType = (starter = {}) => {
  const innings = Number(starter.inningsFloat)
  const kPerNine = Number(starter.kPerNine)
  const bbPerNine = Number(starter.bbPerNine)
  const hitsPerNine = Number(starter.hitsPerNine)
  const era = Number(starter.era)
  const whip = Number(starter.whip)

  if (!Number.isFinite(innings) || innings < 18 || !Number.isFinite(era)) return 'Unknown sample'

  if (Number.isFinite(kPerNine) && kPerNine >= 10.2 && Number.isFinite(whip) && whip <= 1.18 && era <= 3.8) {
    return 'Power'
  }

  if (Number.isFinite(kPerNine) && kPerNine >= 9.6 && ((Number.isFinite(bbPerNine) && bbPerNine >= 3.4) || (Number.isFinite(whip) && whip >= 1.28))) {
    return 'Volatile bat-misser'
  }

  if (Number.isFinite(hitsPerNine) && hitsPerNine <= 7.3 && Number.isFinite(whip) && whip <= 1.18) {
    return 'Contact suppressor'
  }

  if (Number.isFinite(kPerNine) && kPerNine <= 7.1 && Number.isFinite(whip) && whip <= 1.22 && era <= 4.1) {
    return 'Craft'
  }

  if ((Number.isFinite(hitsPerNine) && hitsPerNine >= 9.3) || (Number.isFinite(whip) && whip >= 1.4)) {
    return 'Traffic-risk'
  }

  if (Number.isFinite(bbPerNine) && bbPerNine <= 2.2 && Number.isFinite(kPerNine) && kPerNine >= 7.1) {
    return 'Strike-throwing'
  }

  return 'Balanced'
}

const buildStarterProfile = (starterContext = null, detail = '') => {
  const parsed = parsePitcherDetail(detail)

  if (!starterContext && !parsed) return null

  const handedness = normalizePitchHand(starterContext?.pitchHand || parsed?.handedness)
  const strikeouts = Number(starterContext?.strikeOuts ?? starterContext?.strikeouts ?? parsed?.strikeouts ?? 0)
  const wins = Number(starterContext?.wins ?? parsed?.wins ?? 0)
  const losses = Number(starterContext?.losses ?? parsed?.losses ?? 0)
  const decisions = wins + losses
  const eraValue = Number(starterContext?.era ?? parsed?.era)
  const era = Number.isFinite(eraValue) ? eraValue : null
  const inningsFloat = parseBaseballInnings(starterContext?.inningsPitched ?? 0)
  const whipValue = Number(starterContext?.whip)
  const whip = Number.isFinite(whipValue) && whipValue > 0 ? whipValue : null
  const walks = Number(starterContext?.walks)
  const hitsAllowed = Number(starterContext?.hitsAllowed)
  const homeRunsAllowed = Number(starterContext?.homeRunsAllowed)
  const gamesStarted = Number(starterContext?.gamesStarted)
  const kPerNine = inningsFloat > 0 ? (strikeouts / inningsFloat) * 9 : null
  const bbPerNine = inningsFloat > 0 && Number.isFinite(walks) ? (walks / inningsFloat) * 9 : null
  const hitsPerNine = inningsFloat > 0 && Number.isFinite(hitsAllowed) ? (hitsAllowed / inningsFloat) * 9 : null
  const hrPerNine = inningsFloat > 0 && Number.isFinite(homeRunsAllowed) ? (homeRunsAllowed / inningsFloat) * 9 : null
  const starter = {
    name: starterContext?.fullName || parsed?.name || '',
    handedness,
    wins,
    losses,
    decisions,
    winPct: decisions > 0 ? wins / decisions : parsed?.winPct ?? 0.5,
    era,
    strikeouts,
    inningsFloat,
    walks: Number.isFinite(walks) ? walks : null,
    hitsAllowed: Number.isFinite(hitsAllowed) ? hitsAllowed : null,
    homeRunsAllowed: Number.isFinite(homeRunsAllowed) ? homeRunsAllowed : null,
    whip,
    gamesStarted: Number.isFinite(gamesStarted) ? gamesStarted : null,
    kPerNine,
    bbPerNine,
    hitsPerNine,
    hrPerNine
  }

  const profileType = classifyPitcherType(starter)
  const avgInningsPerStart =
    Number.isFinite(inningsFloat) && Number.isFinite(gamesStarted) && gamesStarted > 0
      ? inningsFloat / gamesStarted
      : null

  return {
    ...starter,
    avgInningsPerStart,
    profileType,
    profileLabel: formatPitcherType(profileType, handedness),
    sampleEstablished: Number.isFinite(inningsFloat) && inningsFloat >= 18 && Number.isFinite(era)
  }
}

const buildHomeFieldSignal = (participants, weight = 0.08) => {
  const homeIndex = participants.findIndex((participant) => /home/i.test(participant.role))
  const awayIndex = participants.findIndex((participant) => /away/i.test(participant.role))

  if (homeIndex === -1 || awayIndex === -1) return null

  const values = participants.map(() => ({
    label: 'Neutral seat',
    score: 50
  }))

  values[awayIndex] = { label: 'Road spot', score: 47 }
  values[homeIndex] = { label: 'Home environment', score: 53 }

  return createSignal('Venue edge', weight, values, 'Location context')
}

const parseWinningPercentage = (value = '') => {
  const parsed = Number(value)

  return Number.isFinite(parsed) ? parsed : 0.5
}

const parseGamesBack = (value = '') => {
  if (!value || value === '-' || value === 'E') return 0

  const parsed = Number(value)

  return Number.isFinite(parsed) ? parsed : 0
}

const parseStreakCode = (value = '') => {
  const match = value.match(/^([WL])(\d+)$/i)

  if (!match) return 0

  return match[1].toUpperCase() === 'W' ? Number(match[2]) : -Number(match[2])
}

const formatOrdinal = (value) => {
  const numericValue = Number(value)

  if (!Number.isFinite(numericValue)) return `${value}`
  if (numericValue % 100 >= 11 && numericValue % 100 <= 13) return `${numericValue}th`
  if (numericValue % 10 === 1) return `${numericValue}st`
  if (numericValue % 10 === 2) return `${numericValue}nd`
  if (numericValue % 10 === 3) return `${numericValue}rd`

  return `${numericValue}th`
}

const buildStandingsScore = (team = {}) =>
  clamp(
    26 +
      parseWinningPercentage(team.winningPercentage) * 56 +
      (6 - (Number(team.divisionRank) || 5)) * 3 +
      clamp(Number(team.runDifferential) || 0, -80, 80) / 5 +
      (team.divisionLeader ? 6 : 0) +
      parseStreakCode(team.streakCode) * 1.2 -
      parseGamesBack(team.gamesBack) * 0.8,
    18,
    94
  )

const buildStandingsLabel = (team = {}) => {
  const runDiff = Number(team.runDifferential) || 0
  const runDiffLabel = `${runDiff >= 0 ? '+' : ''}${runDiff} RD`
  const leaderLabel = team.divisionLeader ? 'division leader' : `${formatOrdinal(team.divisionRank)} in division`

  return `${team.wins}-${team.losses}, ${leaderLabel}, ${runDiffLabel}`
}

const buildMlbStandingsSignal = (game, participants) => {
  const awayContext = game.teamContext?.away
  const homeContext = game.teamContext?.home

  if (!awayContext || !homeContext || participants.length < 2) return null

  return createSignal(
    'Standings profile',
    0.14,
    [
      {
        label: buildStandingsLabel(awayContext),
        score: buildStandingsScore(awayContext)
      },
      {
        label: buildStandingsLabel(homeContext),
        score: buildStandingsScore(homeContext)
      }
    ],
    'Standings context'
  )
}

const buildMlbOffenseScore = (profile = {}, role = '') => {
  const splitHits = /home/i.test(role) ? Number(profile.homeHitsPerGame) : Number(profile.awayHitsPerGame)
  const baselineHits = Number(profile.hitsPerGame)
  const recentHits = Number(profile.last3HitsPerGame)

  if (![splitHits, baselineHits, recentHits].every(Number.isFinite)) return null

  return clamp(
    48 +
      (baselineHits - 7.8) * 10 +
      (splitHits - 7.8) * 7 +
      (recentHits - baselineHits) * 8,
    24,
    92
  )
}

const buildMlbOffenseSignal = (game, participants) => {
  const awayContext = game.offenseContext?.away
  const homeContext = game.offenseContext?.home

  if (!awayContext || !homeContext || participants.length < 2) return null

  const scores = [
    buildMlbOffenseScore(awayContext, participants[0].role),
    buildMlbOffenseScore(homeContext, participants[1].role)
  ]

  if (scores.some((score) => !Number.isFinite(score))) return null

  return createSignal(
    'Hit-production baseline',
    0.14,
    [
      {
        label: `${awayContext.hitsPerGame.toFixed(2)} H/G | last 3 ${awayContext.last3HitsPerGame.toFixed(2)} | away ${awayContext.awayHitsPerGame.toFixed(2)}`,
        score: scores[0]
      },
      {
        label: `${homeContext.hitsPerGame.toFixed(2)} H/G | last 3 ${homeContext.last3HitsPerGame.toFixed(2)} | home ${homeContext.homeHitsPerGame.toFixed(2)}`,
        score: scores[1]
      }
    ],
    'TeamRankings team offense'
  )
}

const buildMlbBullpenScore = (profile = {}) => {
  const era = Number(profile.era)
  const whip = Number(profile.whip)
  const strikeouts = Number(profile.strikeouts)
  const walks = Number(profile.walks)

  if (![era, whip, strikeouts, walks].every(Number.isFinite)) return null

  const eraScore = clamp(96 - era * 11, 18, 92)
  const whipScore = clamp(114 - whip * 35, 20, 92)
  const ratioScore = clamp(28 + (strikeouts / Math.max(walks, 1)) * 18, 22, 88)

  return eraScore * 0.46 + whipScore * 0.34 + ratioScore * 0.2
}

const buildMlbBullpenSignal = (game, participants) => {
  const awayContext = game.bullpenContext?.away
  const homeContext = game.bullpenContext?.home

  if (!awayContext || !homeContext || participants.length < 2) return null

  const scores = [buildMlbBullpenScore(awayContext), buildMlbBullpenScore(homeContext)]

  if (scores.some((score) => !Number.isFinite(score))) return null

  return createSignal(
    'Bullpen follow-through',
    0.13,
    [
      {
        label: `${awayContext.era.toFixed(2)} ERA | ${awayContext.whip.toFixed(2)} WHIP | ${awayContext.strikeouts} SO / ${awayContext.walks} BB`,
        score: scores[0]
      },
      {
        label: `${homeContext.era.toFixed(2)} ERA | ${homeContext.whip.toFixed(2)} WHIP | ${homeContext.strikeouts} SO / ${homeContext.walks} BB`,
        score: scores[1]
      }
    ],
    'Covers bullpen stats'
  )
}

const buildMlbBullpenChainScore = (profile = {}) => {
  const relievers = Array.isArray(profile?.topRelievers) ? profile.topRelievers.slice(0, 2) : []

  if (!relievers.length) return null

  const relieverScores = relievers.map((reliever, index) => {
    const likelihood = Number(reliever.firstRelieverLikelihood)
    const availability = Number(reliever.availabilityScore)
    const bridgeScore = Number(reliever.bridgeScore)
    const expectedOuts = Number(reliever.expectedOuts)
    const roleBonus = /bridge/i.test(reliever.role || '')
      ? 4
      : /closer|setup/i.test(reliever.role || '')
        ? 2
        : 0
    const fatiguePenalty = (reliever.workedYesterday ? 6 : 0) + (reliever.backToBack ? 10 : 0) + index * 2

    return clamp(
      (Number.isFinite(likelihood) ? likelihood * 0.24 : 13) +
        (Number.isFinite(availability) ? availability * 0.31 : 17) +
        (Number.isFinite(bridgeScore) ? bridgeScore * 0.31 : 18) +
        (Number.isFinite(expectedOuts) ? expectedOuts * 4.2 : 10) +
        roleBonus -
        fatiguePenalty,
      18,
      96
    )
  })

  const primary = relieverScores[0]
  const secondary = relieverScores[1] ?? clamp(primary - 6, 18, 96)

  return clamp(primary * 0.62 + secondary * 0.38, 18, 96)
}

const buildMlbBullpenChainSignal = (game, participants) => {
  const awayContext = game.bullpenChainContext?.away
  const homeContext = game.bullpenChainContext?.home

  if (!awayContext || !homeContext || participants.length < 2) return null

  const scores = [buildMlbBullpenChainScore(awayContext), buildMlbBullpenChainScore(homeContext)]

  if (scores.some((score) => !Number.isFinite(score))) return null

  const buildLabel = (context) =>
    (context.topRelievers || [])
      .slice(0, 2)
      .map((reliever) => {
        const fatigueTag = reliever.backToBack ? ' B2B' : reliever.workedYesterday ? ' worked yesterday' : ''
        return `${reliever.name} first up ${Number(reliever.firstRelieverLikelihood).toFixed(0)}% | availability ${Number(reliever.availabilityScore).toFixed(0)}/100${fatigueTag}`
      })
      .join(' | ')

  return createSignal(
    'Likely bridge chain',
    0.11,
    [
      {
        label: buildLabel(awayContext),
        score: scores[0]
      },
      {
        label: buildLabel(homeContext),
        score: scores[1]
      }
    ],
    'Warehouse bullpen workload + likely first two relievers'
  )
}

const buildMlbSavantScore = (profile = {}) => {
  const ba = Number(profile.ba)
  const xba = Number(profile.xba)
  const hardHitPct = Number(profile.hardHitPct)
  const barrelPct = Number(profile.barrelPct)
  const xwoba = Number(profile.xwoba)

  if (![ba, xba, hardHitPct, barrelPct, xwoba].every(Number.isFinite)) return null

  const blendedHitRate = average([ba, xba])

  return clamp(
    50 +
      (blendedHitRate - 0.245) * 520 +
      (hardHitPct - 39) * 1 +
      (barrelPct - 7.5) * 1.5 +
      (xwoba - 0.315) * 160,
    18,
    94
  )
}

const buildMlbSavantSignal = (game, participants) => {
  const awayContext = game.savantContext?.away
  const homeContext = game.savantContext?.home

  if (!awayContext || !homeContext || participants.length < 2) return null

  const scores = [buildMlbSavantScore(awayContext), buildMlbSavantScore(homeContext)]

  if (scores.some((score) => !Number.isFinite(score))) return null

  return createSignal(
    'Statcast contact quality',
    0.1,
    [
      {
        label: `BA ${awayContext.ba.toFixed(3)} | xBA ${awayContext.xba.toFixed(3)} | hard-hit ${awayContext.hardHitPct.toFixed(1)}%`,
        score: scores[0]
      },
      {
        label: `BA ${homeContext.ba.toFixed(3)} | xBA ${homeContext.xba.toFixed(3)} | hard-hit ${homeContext.hardHitPct.toFixed(1)}%`,
        score: scores[1]
      }
    ],
    'Baseball Savant team hitting'
  )
}

const buildProjectedHitProfile = ({
  role = '',
  offenseProfile = {},
  savantProfile = {},
  opposingStarter = null,
  opposingBullpen = {},
  opposingBullpenChain = null,
  parkContext = null
}) => {
  const splitHits = /home/i.test(role)
    ? Number(offenseProfile.homeHitsPerGame)
    : Number(offenseProfile.awayHitsPerGame)
  const baselineHits = Number(offenseProfile.hitsPerGame)
  const recentHits = Number(offenseProfile.last3HitsPerGame)

  if (![splitHits, baselineHits, recentHits].every(Number.isFinite)) return null

  let starterPhaseProjection = baselineHits * 0.4 + splitHits * 0.35 + recentHits * 0.25
  const qualityNotes = []
  const runIndex = Number(parkContext?.indexRuns)
  const wobaIndex = Number(parkContext?.indexWoba)
  let bullpenAdjustment = 0

  if (
    [Number(savantProfile.ba), Number(savantProfile.xba), Number(savantProfile.hardHitPct), Number(savantProfile.barrelPct), Number(savantProfile.xwoba)].every(
      Number.isFinite
    )
  ) {
    const blendedHitRate = average([Number(savantProfile.ba), Number(savantProfile.xba)])
    starterPhaseProjection += (blendedHitRate - 0.245) * 18
    starterPhaseProjection += (Number(savantProfile.hardHitPct) - 39) * 0.035
    starterPhaseProjection += (Number(savantProfile.barrelPct) - 7.5) * 0.06
    starterPhaseProjection += (Number(savantProfile.xwoba) - 0.315) * 2.8
    qualityNotes.push('team contact quality')
  }

  if (opposingStarter) {
    if (Number.isFinite(opposingStarter.hitsPerNine)) {
      starterPhaseProjection += (opposingStarter.hitsPerNine - 8.6) * 0.25
    }

    if (Number.isFinite(opposingStarter.whip)) {
      starterPhaseProjection += (opposingStarter.whip - 1.28) * 1.1
    }

    if (Number.isFinite(opposingStarter.bbPerNine)) {
      starterPhaseProjection += (opposingStarter.bbPerNine - 3.1) * 0.08
    }

    if (Number.isFinite(opposingStarter.kPerNine)) {
      starterPhaseProjection -= (opposingStarter.kPerNine - 8.6) * 0.07
    }

    if (!opposingStarter.sampleEstablished) {
      starterPhaseProjection += 0.2
      qualityNotes.push('starter uncertainty')
    }
  }

  if ([Number(opposingBullpen.era), Number(opposingBullpen.whip)].every(Number.isFinite)) {
    bullpenAdjustment += (Number(opposingBullpen.era) - 4.1) * 0.14
    bullpenAdjustment += (Number(opposingBullpen.whip) - 1.31) * 0.9
    qualityNotes.push('bullpen shape')
  }

  const opposingBullpenChainScore = buildMlbBullpenChainScore(opposingBullpenChain)

  if (Number.isFinite(opposingBullpenChainScore)) {
    bullpenAdjustment += (56 - opposingBullpenChainScore) * 0.032
    qualityNotes.push('likely bridge chain')
  }

  if (Number.isFinite(runIndex)) {
    starterPhaseProjection += (runIndex - 100) * 0.028
  }

  if (Number.isFinite(wobaIndex)) {
    starterPhaseProjection += (wobaIndex - 100) * 0.018
  }

  const estimatedAtBats = clamp(
    34.4 + (Number.isFinite(runIndex) ? (runIndex - 100) * 0.025 : 0) + (/away/i.test(role) ? 0.2 : -0.1),
    33.6,
    35.8
  )
  const estimatedFirst5AtBats = clamp(
    19.0 + (Number.isFinite(runIndex) ? (runIndex - 100) * 0.013 : 0) + (/away/i.test(role) ? 0.1 : -0.05),
    18.3,
    19.8
  )
  const starterCoverageFirst5 = clamp(
    Number.isFinite(opposingStarter?.avgInningsPerStart)
      ? opposingStarter.avgInningsPerStart / 5
      : 0.9,
    0.72,
    1
  )
  const first5ProjectionFullScale =
    starterPhaseProjection + bullpenAdjustment * (1 - starterCoverageFirst5) * 0.45
  const starterPhaseHits = clamp(
    first5ProjectionFullScale * (estimatedFirst5AtBats / estimatedAtBats),
    3.0,
    7.1
  )
  const fullGameProjection = clamp(starterPhaseProjection + bullpenAdjustment, 5.6, 11.6)
  const estimatedLateAtBats = clamp(estimatedAtBats - estimatedFirst5AtBats, 14.4, 17.1)
  const lateGameProjection = clamp(fullGameProjection - starterPhaseHits, 2.0, 6.2)

  return {
    projectedHits: roundToTenths(fullGameProjection),
    hitEfficiencyPct: roundToTenths((fullGameProjection / estimatedAtBats) * 100),
    first5ProjectedHits: roundToTenths(starterPhaseHits),
    first5HitEfficiencyPct: roundToTenths((starterPhaseHits / estimatedFirst5AtBats) * 100),
    lateProjectedHits: roundToTenths(lateGameProjection),
    lateHitEfficiencyPct: roundToTenths((lateGameProjection / estimatedLateAtBats) * 100),
    estimatedAtBats: roundToTenths(estimatedAtBats),
    estimatedFirst5AtBats: roundToTenths(estimatedFirst5AtBats),
    estimatedLateAtBats: roundToTenths(estimatedLateAtBats),
    bullpenChainScore: Number.isFinite(opposingBullpenChainScore)
      ? roundToTenths(opposingBullpenChainScore)
      : null,
    notes: qualityNotes
  }
}

const normalizeTeamAlias = (value = '') => {
  const normalized = normalizeText(value)

  if (normalized === 'd backs' || normalized === 'dbacks') return 'diamondbacks'
  if (normalized === 'a s' || normalized === 'as') return 'athletics'

  return normalized
}

const teamNamesMatch = (left = '', right = '') => normalizeTeamAlias(left) === normalizeTeamAlias(right)

const findLineupBoardForTeam = (lineupBoard = null, teamName = '') => {
  if (!lineupBoard || !teamName) return null
  if (teamNamesMatch(lineupBoard.away?.teamName, teamName)) return lineupBoard.away
  if (teamNamesMatch(lineupBoard.home?.teamName, teamName)) return lineupBoard.home
  return null
}

const formatLineupStatusLabel = (status = '') => {
  if (status === 'posted') return 'confirmed lineup'
  if (status === 'partial') return 'partial lineup'
  return 'lineup pending'
}

const buildBullpenExhaustionScore = (profile = {}) => {
  const relievers = Array.isArray(profile?.topRelievers) ? profile.topRelievers.slice(0, 2) : []

  if (!relievers.length) return null

  return roundToTenths(
    average(
      relievers.map((reliever, index) =>
        clamp(
          (100 - Number(reliever.availabilityScore || 55)) * 0.62 +
            (reliever.workedYesterday ? 16 : 0) +
            (reliever.backToBack ? 30 : 0) +
            Math.max(Number(reliever.expectedOuts || 3) - 3, 0) * 4 +
            index * 3,
          0,
          100
        )
      )
    )
  )
}

const getBullpenExhaustionLabel = (score) => {
  if (!Number.isFinite(score)) return 'unknown'
  if (score >= 58) return 'heavy'
  if (score >= 42) return 'elevated'

  return 'fresh'
}

const buildRunConversionRate = ({
  offenseScore,
  savantScore,
  parkContext,
  opposingStarter,
  opposingBullpenExhaustion,
  phase = 'full'
}) => {
  const runIndex = Number(parkContext?.indexRuns)
  let rate = 0.47

  if (Number.isFinite(offenseScore)) rate += (offenseScore - 56) * 0.0015
  if (Number.isFinite(savantScore)) rate += (savantScore - 56) * 0.0018
  if (Number.isFinite(runIndex)) rate += (runIndex - 100) * 0.0008

  if (phase === 'first5') {
    rate -= 0.008

    if (opposingStarter?.profileType === 'Traffic-risk') rate += 0.024
    if (opposingStarter?.profileType === 'Volatile bat-misser') rate += 0.01
    if (opposingStarter?.profileType === 'Power') rate -= 0.012
    if (opposingStarter?.profileType === 'Contact suppressor') rate -= 0.02
  }

  if (phase === 'late') {
    rate += 0.012

    if (Number.isFinite(opposingBullpenExhaustion)) {
      rate += opposingBullpenExhaustion * 0.0012
    }
  }

  return clamp(rate, 0.39, 0.72)
}

const buildTotalLean = (projectedRuns, line) => {
  if (!Number.isFinite(projectedRuns) || !Number.isFinite(line)) {
    return {
      lean: 'Pass',
      edge: null,
      strength: 'No market',
      label: 'No market',
      summary: 'No posted total is available yet for this phase.'
    }
  }

  const edge = roundToTenths(projectedRuns - line)
  const lean = edge >= 0.45 ? 'Over' : edge <= -0.45 ? 'Under' : 'Pass'
  const strength =
    Math.abs(edge) >= 1.2 ? 'Strong' : Math.abs(edge) >= 0.7 ? 'Clear' : Math.abs(edge) >= 0.45 ? 'Lean' : 'Thin'

  return {
    lean,
    edge,
    strength,
    label: lean === 'Pass' ? `Hold ${line}` : `${lean} ${line}`,
    summary:
      lean === 'Pass'
        ? `Model projection ${projectedRuns} is essentially on the posted ${line}.`
        : `${lean} lean with a ${Math.abs(edge).toFixed(1)}-run edge against ${line}.`
  }
}

const buildTeamHitterScript = ({
  teamName,
  projectedHitProfile,
  opposingStarter,
  homeRunTargets,
  lineupTeamBoard,
  isEdgeTeam,
  isFirst5EdgeTeam,
  isLateEdgeTeam,
  hasBullpenBridgeEdge
}) => {
  const lineupSummary = lineupTeamBoard?.summary || null
  const lineupStatus = formatLineupStatusLabel(lineupTeamBoard?.status)
  const lineupTopTargets = (lineupSummary?.overperformHitters || []).slice(0, 3)
  const homeRunTopTargets = [...(homeRunTargets?.likely || []), ...(homeRunTargets?.possible || [])]
    .filter((target) => teamNamesMatch(target.teamName, teamName))
    .slice(0, 2)
  const overperformHitters = lineupTopTargets.length
    ? lineupTopTargets
    : homeRunTopTargets.map((target) => ({
        name: target.playerName,
        tag: `${target.scoreBand} | ${target.burstTag}`
      }))
  const underperformHitters = (lineupSummary?.underperformHitters || []).slice(0, 2)

  const underperformNote =
    lineupSummary?.underperformNote ||
    (projectedHitProfile.hitEfficiencyPct <= 23.4
      ? `${teamName} project for only ${projectedHitProfile.projectedHits} hits on ${projectedHitProfile.hitEfficiencyPct}% efficiency against a ${opposingStarter?.profileLabel || 'tougher starter'} lane.`
      : projectedHitProfile.first5HitEfficiencyPct <= 23.1
        ? `${teamName} may be quieter early if the ${opposingStarter?.profileLabel || 'starter lane'} holds through five.`
        : `No obvious suppressor lane has surfaced yet, but this side still needs better sequencing than the raw hit count alone.`)

  const winPath = []

  if (isEdgeTeam) {
    winPath.push(`${teamName} own the cleaner full-game traffic script at ${projectedHitProfile.projectedHits} projected hits.`)
  }

  if (isFirst5EdgeTeam) {
    winPath.push(`${teamName} have the better starter-window lane with ${projectedHitProfile.first5ProjectedHits} projected first-five hits.`)
  }

  if (isLateEdgeTeam) {
    winPath.push(`${teamName} still hold the better bridge-and-finish script once the bullpens take over.`)
  }

  if (hasBullpenBridgeEdge) {
    winPath.push(`${teamName} also profile for the cleaner likely first-two reliever chain, which matters if the game stays tight late.`)
  }

  if (lineupSummary?.overview) {
    winPath.push(lineupSummary.overview)
  }

  if (lineupSummary?.topThirdScore >= 58) {
    winPath.push(`${teamName} top third are live enough to pressure the starter before the bridge innings.`)
  }

  if (overperformHitters.length) {
    const hitterList = overperformHitters.map((hitter) => hitter.name).join(' and ')
    winPath.push(
      `${hitterList} ${overperformHitters.length === 1 ? 'is' : 'are'} the best current carry ${
        overperformHitters.length === 1 ? 'bat' : 'bats'
      } in this lineup.`
    )
  } else {
    winPath.push(`${teamName} look more like a broad traffic lineup than a single-bat carry script right now.`)
  }

  return {
    teamName,
    lineupStatus,
    overperformHitters,
    underperformHitters,
    underperformNote,
    overview:
      lineupSummary?.overview ||
      `${teamName} still look more like a broad traffic lineup than a single-carry script until more lineup context lands.`,
    topThirdScore: lineupSummary?.topThirdScore ?? null,
    middleScore: lineupSummary?.middleScore ?? null,
    depthScore: lineupSummary?.depthScore ?? null,
    winPath
  }
}

const buildMlbLineupSimulation = ({
  participants,
  teamScripts,
  projectedHitProfiles,
  projectedRunProfiles,
  first5EdgeIndex,
  lateEdgeIndex,
  hitEdgeIndex,
  bridgeEdgeIndex
}) => {
  const hitterNames = (script) => (script?.overperformHitters || []).slice(0, 2).map((hitter) => hitter.name).join(', ')
  const earlyNames = hitterNames(teamScripts[first5EdgeIndex])
  const lateNames = hitterNames(teamScripts[lateEdgeIndex])
  const fullNames = hitterNames(teamScripts[hitEdgeIndex])
  const bridgeTeamName = bridgeEdgeIndex !== null ? participants[bridgeEdgeIndex]?.name : ''

  return {
    overview:
      first5EdgeIndex === lateEdgeIndex && lateEdgeIndex === hitEdgeIndex
        ? `${participants[hitEdgeIndex]?.name || 'One side'} carry the cleaner starter, bridge, and full-game script once the posted batting orders are folded in.`
        : `${participants[first5EdgeIndex]?.name || 'One side'} rate cleaner through the starter window, but the bridge and finish script still move later in the game.`,
    phases: [
      {
        label: 'First 5',
        edgeTeam: participants[first5EdgeIndex]?.name || '',
        projection: projectedRunProfiles[first5EdgeIndex]
          ? `${projectedRunProfiles[first5EdgeIndex].first5Runs} R`
          : '',
        note: earlyNames
          ? `${participants[first5EdgeIndex]?.name || 'This side'} lean on ${earlyNames} to drive the early traffic lane against the listed starter.`
          : `${participants[first5EdgeIndex]?.name || 'This side'} still own the cleaner starter-phase traffic lane.`
      },
      {
        label: 'Bridge',
        edgeTeam: participants[lateEdgeIndex]?.name || '',
        projection: projectedRunProfiles[lateEdgeIndex]
          ? `${projectedRunProfiles[lateEdgeIndex].lateRuns} R`
          : '',
        note: lateNames
          ? `${participants[lateEdgeIndex]?.name || 'This side'} keep more late scoring paths alive, with ${lateNames} plus the ${bridgeTeamName || 'stronger'} bridge chain shaping the middle innings.`
          : `${participants[lateEdgeIndex]?.name || 'This side'} look cleaner once the game turns over to the bridge relievers.`
      },
      {
        label: 'Full game',
        edgeTeam: participants[hitEdgeIndex]?.name || '',
        projection: projectedHitProfiles[hitEdgeIndex]
          ? `${projectedHitProfiles[hitEdgeIndex].projectedHits} H`
          : '',
        note: fullNames
          ? `${participants[hitEdgeIndex]?.name || 'This side'} finish with the stronger aggregate traffic path, anchored by ${fullNames}.`
          : `${participants[hitEdgeIndex]?.name || 'This side'} finish with the stronger full-game hit and conversion path.`
      }
    ]
  }
}

const calibrateProjectedHitProfiles = ({
  projectedHitProfiles = [],
  offenseScores = [],
  savantScores = [],
  lineupScores = [],
  starterScores = [],
  bullpenScores = []
}) => {
  if (projectedHitProfiles.length < 2 || projectedHitProfiles.some((profile) => !profile)) {
    return projectedHitProfiles
  }

  const safeDiff = (left, right) =>
    Number.isFinite(left) && Number.isFinite(right) ? left - right : null
  const buildSupportIndex = (gaps = [], divisors = []) => {
    const normalized = gaps
      .map((gap, index) =>
        Number.isFinite(gap) && Number.isFinite(divisors[index]) && divisors[index] > 0
          ? Math.min(Math.abs(gap) / divisors[index], 1.35)
          : null
      )
      .filter((value) => Number.isFinite(value))

    return normalized.length ? average(normalized) : 0
  }
  const amplifyGap = (rawGap, { supportIndex, multiplierBase, multiplierRange, intercept, cap }) => {
    if (!Number.isFinite(rawGap) || rawGap === 0) return 0

    const absoluteGap = Math.abs(rawGap)
    let amplifiedGap = absoluteGap * (multiplierBase + supportIndex * multiplierRange)

    if (absoluteGap >= 0.35) {
      amplifiedGap += intercept * (0.75 + supportIndex * 0.5)
    }

    if (absoluteGap >= 0.8) {
      amplifiedGap += intercept * 0.45
    }

    return Math.sign(rawGap) * clamp(amplifiedGap, 0, cap)
  }

  const offenseGap = safeDiff(offenseScores[0], offenseScores[1])
  const savantGap = safeDiff(savantScores[0], savantScores[1])
  const lineupGap = safeDiff(lineupScores[0], lineupScores[1])
  const starterGap = safeDiff(starterScores[0], starterScores[1])
  const bullpenGap = safeDiff(bullpenScores[0], bullpenScores[1])
  const fullSupportIndex = buildSupportIndex(
    [offenseGap, savantGap, lineupGap, starterGap, bullpenGap],
    [18, 18, 16, 20, 16]
  )
  const first5SupportIndex = buildSupportIndex(
    [offenseGap, savantGap, lineupGap, starterGap],
    [18, 18, 16, 20]
  )
  const rawFullGap = projectedHitProfiles[0].projectedHits - projectedHitProfiles[1].projectedHits
  const rawFirst5Gap =
    projectedHitProfiles[0].first5ProjectedHits - projectedHitProfiles[1].first5ProjectedHits
  const calibratedFullGap = amplifyGap(rawFullGap, {
    supportIndex: fullSupportIndex,
    multiplierBase: 1.75,
    multiplierRange: 0.4,
    intercept: 0.4,
    cap: 4.8
  })
  const calibratedFirst5Gap = amplifyGap(rawFirst5Gap, {
    supportIndex: first5SupportIndex,
    multiplierBase: 1.55,
    multiplierRange: 0.4,
    intercept: 0.25,
    cap: 3.4
  })
  const fullMidpoint =
    (projectedHitProfiles[0].projectedHits + projectedHitProfiles[1].projectedHits) / 2
  const first5Midpoint =
    (projectedHitProfiles[0].first5ProjectedHits + projectedHitProfiles[1].first5ProjectedHits) / 2

  return projectedHitProfiles.map((profile, index) => {
    const projectedHits = clamp(
      fullMidpoint + (index === 0 ? 1 : -1) * calibratedFullGap * 0.5,
      5.2,
      12.6
    )
    const first5ProjectedHits = clamp(
      first5Midpoint + (index === 0 ? 1 : -1) * calibratedFirst5Gap * 0.5,
      2.6,
      7.5
    )

    return {
      ...profile,
      rawProjectedHits: profile.projectedHits,
      rawFirst5ProjectedHits: profile.first5ProjectedHits,
      projectedHits: roundToTenths(projectedHits),
      hitEfficiencyPct: roundToTenths((projectedHits / profile.estimatedAtBats) * 100),
      first5ProjectedHits: roundToTenths(first5ProjectedHits),
      first5HitEfficiencyPct: roundToTenths((first5ProjectedHits / profile.estimatedFirst5AtBats) * 100)
    }
  })
}

const buildMlbLineupMatchupScore = (profile = {}) => {
  const grade = Number(profile.averageMatchupGrade)
  const platoonCount = Number(profile.platoonCount)
  const powerCount = Number(profile.powerCount)
  const contactCount = Number(profile.contactCount)

  if (![grade, platoonCount, powerCount, contactCount].every(Number.isFinite)) return null

  let score =
    50 +
      grade * 2.8 +
      (platoonCount - 6) * 1.7 +
      (powerCount - 2) * 1.2 +
      (contactCount - 1) * 1.1

  if (Number.isFinite(Number(profile.heaterCount))) {
    score += (Number(profile.heaterCount) - 2) * 1
  }

  if (Number.isFinite(Number(profile.suppressorCount))) {
    score -= Number(profile.suppressorCount) * 0.8
  }

  if (Number.isFinite(Number(profile.topThirdScore))) {
    score += (Number(profile.topThirdScore) - 50) * 0.12
  }

  if (Number.isFinite(Number(profile.depthScore))) {
    score += (Number(profile.depthScore) - 50) * 0.08
  }

  return clamp(score, 18, 92)
}

const buildMlbLineupMatchupSignal = (game, participants) => {
  const awayContext = game.lineupContext?.[participants[0].name]
  const homeContext = game.lineupContext?.[participants[1].name]

  if (!awayContext || !homeContext || participants.length < 2) return null

  const scores = [buildMlbLineupMatchupScore(awayContext), buildMlbLineupMatchupScore(homeContext)]

  if (scores.some((score) => !Number.isFinite(score))) return null

  return createSignal(
    'Lineup-vs-starter fit',
    0.14,
    [
      {
        label: `Grade ${awayContext.averageMatchupGrade >= 0 ? '+' : ''}${awayContext.averageMatchupGrade.toFixed(2)} | platoon ${awayContext.platoonCount} | power ${awayContext.powerCount}`,
        score: scores[0]
      },
      {
        label: `Grade ${homeContext.averageMatchupGrade >= 0 ? '+' : ''}${homeContext.averageMatchupGrade.toFixed(2)} | platoon ${homeContext.platoonCount} | power ${homeContext.powerCount}`,
        score: scores[1]
      }
    ],
    'BallparkPal matchup board'
  )
}

const buildMlbParkModifiers = (game, starters = []) => {
  const park = game.parkContext

  if (!park) return []

  const modifiers = []
  const runIndex = Number(park.indexRuns)
  const hrIndex = Number(park.indexHr)
  const wobaIndex = Number(park.indexWoba)
  const starterEras = starters
    .map((starter) => starter?.era)
    .filter((value) => Number.isFinite(value))
  const hasSoftEra = starterEras.some((era) => era >= 4.5)

  if (runIndex >= 106) {
    modifiers.push({
      label: `${park.venueName} boosts run scoring (${runIndex} runs factor)`,
      delta: 5
    })
  } else if (runIndex <= 94) {
    modifiers.push({
      label: `${park.venueName} suppresses run scoring (${runIndex} runs factor)`,
      delta: -4
    })
  }

  if (hrIndex >= 114) {
    modifiers.push({
      label: `${park.venueName} lifts home-run damage (${hrIndex} HR factor)`,
      delta: 4
    })
  } else if (hrIndex <= 86) {
    modifiers.push({
      label: `${park.venueName} suppresses home-run carry (${hrIndex} HR factor)`,
      delta: -3
    })
  }

  if (wobaIndex >= 104 && hasSoftEra) {
    modifiers.push({
      label: 'A hitter-friendlier park meets at least one shakier listed ERA',
      delta: 4
    })
  }

  return modifiers
}

const pitcherRecordScore = (pitcher) =>
  clamp(28 + pitcher.winPct * 46 + Math.min(pitcher.decisions, 6) * 2, 24, 86)

const pitcherEraScore = (pitcher) =>
  Number.isFinite(pitcher.era) ? clamp(92 - pitcher.era * 9, 18, 90) : 50

const pitcherStrikeoutScore = (pitcher) => clamp(34 + pitcher.strikeouts * 1.08, 24, 88)

const starterScore = (pitcher) =>
  pitcherRecordScore(pitcher) * 0.28 +
  pitcherEraScore(pitcher) * 0.44 +
  pitcherStrikeoutScore(pitcher) * 0.28

const buildMlbAnalysisContext = (game, participants) => {
  const starterContexts = [
    game.starterContext?.away ?? game.startingPitcherContext?.away ?? null,
    game.starterContext?.home ?? game.startingPitcherContext?.home ?? null
  ]
  const starters = participants.map((participant, index) =>
    buildStarterProfile(starterContexts[index], participant.detail)
  )
  const offenseProfiles = [game.offenseContext?.away, game.offenseContext?.home]
  const bullpenProfiles = [game.bullpenContext?.away, game.bullpenContext?.home]
  const bullpenChainProfiles = [game.bullpenChainContext?.away, game.bullpenChainContext?.home]
  const savantProfiles = [game.savantContext?.away, game.savantContext?.home]
  const lineupProfiles = [
    game.lineupContext?.[participants[0]?.name],
    game.lineupContext?.[participants[1]?.name]
  ]
  const lineupBoards = [
    findLineupBoardForTeam(game.lineupBoard, participants[0]?.name),
    findLineupBoardForTeam(game.lineupBoard, participants[1]?.name)
  ]
  const offenseScores = offenseProfiles.map((profile, index) =>
    profile ? buildMlbOffenseScore(profile, participants[index]?.role) : null
  )
  const bullpenScores = bullpenProfiles.map((profile) =>
    profile ? buildMlbBullpenScore(profile) : null
  )
  const bullpenChainScores = bullpenChainProfiles.map((profile) =>
    profile ? buildMlbBullpenChainScore(profile) : null
  )
  const savantScores = savantProfiles.map((profile) =>
    profile ? buildMlbSavantScore(profile) : null
  )
  const lineupScores = lineupProfiles.map((profile) =>
    profile ? buildMlbLineupMatchupScore(profile) : null
  )
  const baseProjectedHitProfiles = [
    buildProjectedHitProfile({
      role: participants[0]?.role,
      offenseProfile: offenseProfiles[0],
      savantProfile: savantProfiles[0],
      opposingStarter: starters[1],
      opposingBullpen: bullpenProfiles[1],
      opposingBullpenChain: bullpenChainProfiles[1],
      parkContext: game.parkContext
    }),
    buildProjectedHitProfile({
      role: participants[1]?.role,
      offenseProfile: offenseProfiles[1],
      savantProfile: savantProfiles[1],
      opposingStarter: starters[0],
      opposingBullpen: bullpenProfiles[0],
      opposingBullpenChain: bullpenChainProfiles[0],
      parkContext: game.parkContext
    })
  ]
  const starterScores = starters.every(Boolean) ? starters.map((starter) => starterScore(starter)) : []
  const projectedHitProfiles = calibrateProjectedHitProfiles({
    projectedHitProfiles: baseProjectedHitProfiles,
    offenseScores,
    savantScores,
    lineupScores,
    starterScores,
    bullpenScores
  })
  const marketProbabilities = computeNoVigProbabilities(
    participants.map((participant) => participant.americanOdds)
  )
  const favoriteIndex =
    marketProbabilities.length === participants.length
      ? marketProbabilities[0] >= marketProbabilities[1]
        ? 0
        : 1
      : null
  const signals = [
    buildMarketSignal(game.league, participants),
    buildMlbStandingsSignal(game, participants),
    buildMlbOffenseSignal(game, participants),
    buildMlbBullpenSignal(game, participants),
    buildMlbBullpenChainSignal(game, participants),
    buildMlbSavantSignal(game, participants),
    buildMlbLineupMatchupSignal(game, participants)
  ].filter(Boolean)
  const volatilityModifiers = []
  const sourceParts = ['Moneyline', 'listed starter data']
  let confidenceModifier = 0
  let mlbProjection = null
  const postedTotal = parseFirstTotalNumber(getTotalMarketValue(game.odds))

  if (game.teamContext?.away && game.teamContext?.home) sourceParts.push('standings context')
  if (game.parkContext?.venueName) sourceParts.push('park factors')
  if (game.offenseContext?.away && game.offenseContext?.home) sourceParts.push('team hit production')
  if (game.bullpenContext?.away && game.bullpenContext?.home) sourceParts.push('bullpen quality')
  if (game.bullpenChainContext?.away && game.bullpenChainContext?.home) {
    sourceParts.push('bullpen workload + likely reliever chain')
  }
  if (game.savantContext?.away && game.savantContext?.home) sourceParts.push('Statcast contact quality')
  if (game.lineupContext?.[participants[0]?.name] && game.lineupContext?.[participants[1]?.name]) {
    sourceParts.push('daily lineup matchup context')
  }

  if (starters.every(Boolean)) {
    const starterScores = starters.map((starter) => starterScore(starter))

    signals.push(
      createSignal(
        'Starter record',
        0.16,
        starters.map((starter) => ({
          label: `${starter.wins}-${starter.losses}`,
          score: pitcherRecordScore(starter)
        })),
        'Listed probable starters'
      )
    )

    signals.push(
      createSignal(
        'Starter ERA',
        0.23,
        starters.map((starter) => ({
          label: Number.isFinite(starter.era) ? `${starter.era.toFixed(2)} ERA` : 'ERA unavailable',
          score: pitcherEraScore(starter)
        })),
        'Listed probable starters'
      )
    )

    signals.push(
      createSignal(
        'Strikeout ceiling',
        0.09,
        starters.map((starter) => ({
          label: `${starter.strikeouts} SO`,
          score: pitcherStrikeoutScore(starter)
        })),
        'Listed probable starters'
      )
    )

    if (projectedHitProfiles.every(Boolean)) {
      const projectedHitScores = projectedHitProfiles.map((profile) =>
        clamp(24 + profile.projectedHits * 5 + profile.hitEfficiencyPct * 1.2, 18, 96)
      )

      signals.push(
        createSignal(
          'Projected hit volume',
          0.19,
          [
            {
              label: `${projectedHitProfiles[0].projectedHits} hits | ${projectedHitProfiles[0].hitEfficiencyPct}% efficiency`,
              score: projectedHitScores[0]
            },
            {
              label: `${projectedHitProfiles[1].projectedHits} hits | ${projectedHitProfiles[1].hitEfficiencyPct}% efficiency`,
              score: projectedHitScores[1]
            }
          ],
          'Composite offense vs starter and bullpen projection'
        )
      )

      const hitEdgeIndex =
        projectedHitProfiles[0].projectedHits >= projectedHitProfiles[1].projectedHits ? 0 : 1
      const hitEdge = roundToTenths(
        Math.abs(projectedHitProfiles[0].projectedHits - projectedHitProfiles[1].projectedHits)
      )
      const first5EdgeIndex =
        projectedHitProfiles[0].first5ProjectedHits >= projectedHitProfiles[1].first5ProjectedHits ? 0 : 1
      const first5EdgeHits = roundToTenths(
        Math.abs(projectedHitProfiles[0].first5ProjectedHits - projectedHitProfiles[1].first5ProjectedHits)
      )
      const lateEdgeIndex =
        projectedHitProfiles[0].lateProjectedHits >= projectedHitProfiles[1].lateProjectedHits ? 0 : 1
      const lateEdgeHits = roundToTenths(
        Math.abs(projectedHitProfiles[0].lateProjectedHits - projectedHitProfiles[1].lateProjectedHits)
      )
      const bullpenChainEdgeIndex =
        Number.isFinite(bullpenChainScores[0]) && Number.isFinite(bullpenChainScores[1])
          ? bullpenChainScores[0] >= bullpenChainScores[1]
            ? 0
            : 1
          : null
      const bullpenChainEdge = roundToTenths(
        Number.isFinite(bullpenChainScores[0]) && Number.isFinite(bullpenChainScores[1])
          ? Math.abs(bullpenChainScores[0] - bullpenChainScores[1])
          : 0
      )
      const bullpenExhaustionScores = bullpenChainProfiles.map((profile) =>
        buildBullpenExhaustionScore(profile)
      )
      const projectedRunProfiles = projectedHitProfiles.map((profile, index) => {
        const first5ConversionRate = buildRunConversionRate({
          offenseScore: offenseScores[index],
          savantScore: savantScores[index],
          parkContext: game.parkContext,
          opposingStarter: starters[index === 0 ? 1 : 0],
          opposingBullpenExhaustion: bullpenExhaustionScores[index === 0 ? 1 : 0],
          phase: 'first5'
        })
        const lateConversionRate = buildRunConversionRate({
          offenseScore: offenseScores[index],
          savantScore: savantScores[index],
          parkContext: game.parkContext,
          opposingStarter: starters[index === 0 ? 1 : 0],
          opposingBullpenExhaustion: bullpenExhaustionScores[index === 0 ? 1 : 0],
          phase: 'late'
        })
        const first5Runs = roundToTenths(profile.first5ProjectedHits * first5ConversionRate)
        const lateRuns = roundToTenths(profile.lateProjectedHits * lateConversionRate)

        return {
          first5Runs,
          lateRuns,
          fullRuns: roundToTenths(first5Runs + lateRuns),
          first5ConversionPct: roundToTenths(first5ConversionRate * 100),
          lateConversionPct: roundToTenths(lateConversionRate * 100)
        }
      })
      const projectedFirst5TotalRuns = roundToTenths(
        projectedRunProfiles[0].first5Runs + projectedRunProfiles[1].first5Runs
      )
      const projectedLateTotalRuns = roundToTenths(
        projectedRunProfiles[0].lateRuns + projectedRunProfiles[1].lateRuns
      )
      const projectedFullTotalRuns = roundToTenths(
        projectedRunProfiles[0].fullRuns + projectedRunProfiles[1].fullRuns
      )
      const first5Share =
        projectedFullTotalRuns > 0 ? projectedFirst5TotalRuns / projectedFullTotalRuns : null
      const derivedFirst5TotalLine =
        Number.isFinite(postedTotal) && Number.isFinite(first5Share)
          ? roundToTenths(postedTotal * first5Share)
          : null
      const derivedLateTotalLine =
        Number.isFinite(postedTotal) && Number.isFinite(derivedFirst5TotalLine)
          ? roundToTenths(postedTotal - derivedFirst5TotalLine)
          : null
      const fullGameTotalLean = buildTotalLean(projectedFullTotalRuns, postedTotal)
      const first5TotalLean = buildTotalLean(projectedFirst5TotalRuns, derivedFirst5TotalLine)
      const lateTotalLean = buildTotalLean(projectedLateTotalRuns, derivedLateTotalLine)
      const exhaustedTeams = participants
        .map((participant, index) => ({
          teamName: participant.name,
          score: bullpenExhaustionScores[index],
          label: getBullpenExhaustionLabel(bullpenExhaustionScores[index])
        }))
        .filter((team) => Number.isFinite(team.score) && team.score >= 42)
      const bullpenExhaustionNote = exhaustedTeams.length
        ? `${exhaustedTeams.map((team) => `${team.teamName} ${team.label}`).join(' and ')} bridge arms are carrying heavier recent workload stress, which matters more once the game gets past the starter window.`
        : 'No major bridge-chain exhaustion flag has surfaced yet.'
      const teamScripts = participants.map((participant, index) =>
        buildTeamHitterScript({
          teamName: participant.name,
          projectedHitProfile: projectedHitProfiles[index],
          opposingStarter: starters[index === 0 ? 1 : 0],
          homeRunTargets: game.homeRunTargets,
          lineupTeamBoard: lineupBoards[index]
            ? {
                ...lineupBoards[index],
                status:
                  index === 0
                    ? game.lineupBoard?.status?.away
                    : game.lineupBoard?.status?.home
              }
            : null,
          isEdgeTeam: hitEdgeIndex === index,
          isFirst5EdgeTeam: first5EdgeIndex === index,
          isLateEdgeTeam: lateEdgeIndex === index,
          hasBullpenBridgeEdge: bullpenChainEdgeIndex === index
        })
      )
      const lineupSimulation = buildMlbLineupSimulation({
        participants,
        teamScripts,
        projectedHitProfiles,
        projectedRunProfiles,
        first5EdgeIndex,
        lateEdgeIndex,
        hitEdgeIndex,
        bridgeEdgeIndex: bullpenChainEdgeIndex
      })

      mlbProjection = {
        awayProjectedHits: projectedHitProfiles[0].projectedHits,
        homeProjectedHits: projectedHitProfiles[1].projectedHits,
        awayHitEfficiencyPct: projectedHitProfiles[0].hitEfficiencyPct,
        homeHitEfficiencyPct: projectedHitProfiles[1].hitEfficiencyPct,
        awayFirst5ProjectedHits: projectedHitProfiles[0].first5ProjectedHits,
        homeFirst5ProjectedHits: projectedHitProfiles[1].first5ProjectedHits,
        awayFirst5HitEfficiencyPct: projectedHitProfiles[0].first5HitEfficiencyPct,
        homeFirst5HitEfficiencyPct: projectedHitProfiles[1].first5HitEfficiencyPct,
        awayLateProjectedHits: projectedHitProfiles[0].lateProjectedHits,
        homeLateProjectedHits: projectedHitProfiles[1].lateProjectedHits,
        awayLateHitEfficiencyPct: projectedHitProfiles[0].lateHitEfficiencyPct,
        homeLateHitEfficiencyPct: projectedHitProfiles[1].lateHitEfficiencyPct,
        awayBullpenChainScore: Number.isFinite(bullpenChainScores[0])
          ? roundToTenths(bullpenChainScores[0])
          : null,
        homeBullpenChainScore: Number.isFinite(bullpenChainScores[1])
          ? roundToTenths(bullpenChainScores[1])
          : null,
        edgeTeam: participants[hitEdgeIndex]?.name ?? '',
        edgeHits: hitEdge,
        first5EdgeTeam: participants[first5EdgeIndex]?.name ?? '',
        first5EdgeHits,
        lateEdgeTeam: participants[lateEdgeIndex]?.name ?? '',
        lateEdgeHits,
        bridgeEdgeTeam:
          bullpenChainEdgeIndex !== null ? participants[bullpenChainEdgeIndex]?.name ?? '' : '',
        bridgeEdgeScore: bullpenChainEdgeIndex !== null ? bullpenChainEdge : null,
        awayLikelyRelievers: (bullpenChainProfiles[0]?.topRelievers || []).slice(0, 2),
        homeLikelyRelievers: (bullpenChainProfiles[1]?.topRelievers || []).slice(0, 2),
        awayBullpenExhaustion: bullpenExhaustionScores[0],
        homeBullpenExhaustion: bullpenExhaustionScores[1],
        awayBullpenExhaustionLabel: getBullpenExhaustionLabel(bullpenExhaustionScores[0]),
        homeBullpenExhaustionLabel: getBullpenExhaustionLabel(bullpenExhaustionScores[1]),
        awayPitcherType: starters[0]?.profileLabel ?? 'Unknown sample starter',
        homePitcherType: starters[1]?.profileLabel ?? 'Unknown sample starter',
        awayProjectedRuns: projectedRunProfiles[0].fullRuns,
        homeProjectedRuns: projectedRunProfiles[1].fullRuns,
        awayFirst5ProjectedRuns: projectedRunProfiles[0].first5Runs,
        homeFirst5ProjectedRuns: projectedRunProfiles[1].first5Runs,
        awayLateProjectedRuns: projectedRunProfiles[0].lateRuns,
        homeLateProjectedRuns: projectedRunProfiles[1].lateRuns,
        postedTotal,
        totals: {
          fullGame: fullGameTotalLean,
          first5: first5TotalLean,
          late: lateTotalLean,
          projectedFullTotalRuns,
          projectedFirst5TotalRuns,
          projectedLateTotalRuns,
          derivedFirst5TotalLine,
          derivedLateTotalLine,
          bullpenExhaustionNote
        },
        teamScripts,
        lineupSimulation
      }

      if (hitEdge <= 0.4) {
        volatilityModifiers.push({ label: 'Projected hit volume is nearly even', delta: 3 })
      }

      if (
        favoriteIndex !== null &&
        hitEdgeIndex !== favoriteIndex &&
        hitEdge >= 0.6
      ) {
        volatilityModifiers.push({ label: 'The underdog owns the projected hit edge', delta: 6 })
        confidenceModifier -= 4
      }

      if (
        favoriteIndex !== null &&
        hitEdgeIndex !== favoriteIndex &&
        hitEdge >= 1.3
      ) {
        volatilityModifiers.push({
          label: 'The favorite is carrying a real traffic deficit despite the price',
          delta: 5
        })
        confidenceModifier -= 3
      }

      if (projectedHitProfiles[0].projectedHits >= 9 && projectedHitProfiles[1].projectedHits >= 9) {
        volatilityModifiers.push({ label: 'Both offenses project to create real traffic', delta: 5 })
      }

      if (first5EdgeHits <= 0.3) {
        volatilityModifiers.push({ label: 'Starter-phase hit projection is nearly even through five', delta: 3 })
      }

      if (lateEdgeHits <= 0.3) {
        volatilityModifiers.push({ label: 'Late-game traffic projection is nearly even once the bridge begins', delta: 3 })
      }

      if (favoriteIndex !== null && hitEdgeIndex !== favoriteIndex && hitEdge >= 1) {
        confidenceModifier -= 3
      }

      if (
        favoriteIndex !== null &&
        first5EdgeIndex !== favoriteIndex &&
        first5EdgeHits >= 0.8
      ) {
        volatilityModifiers.push({
          label: 'The underdog projects cleaner through the starter window',
          delta: 4
        })
        confidenceModifier -= 2
      }
    }

    const homeFieldSignal = buildHomeFieldSignal(participants, 0.07)

    if (homeFieldSignal) signals.push(homeFieldSignal)

    if (Number.isFinite(postedTotal)) {
      if (postedTotal >= 9) volatilityModifiers.push({ label: 'Higher posted total', delta: 5 })
      if (postedTotal <= 7.5) volatilityModifiers.push({ label: 'Lower posted total', delta: -4 })
    }

    if (starters.some((starter) => !Number.isFinite(starter.era))) {
      volatilityModifiers.push({ label: 'Starter sample is incomplete', delta: 10 })
      confidenceModifier -= 4
    }

    if (starters.every((starter) => Number.isFinite(starter.era) && starter.era >= 4.75)) {
      volatilityModifiers.push({ label: 'Both listed ERAs carry damage risk', delta: 5 })
    }

    if (starters.some((starter) => starter && !starter.sampleEstablished)) {
      volatilityModifiers.push({ label: 'At least one listed starter is still a shallow sample', delta: 7 })
      confidenceModifier -= 3
    }

    if (starters.some((starter) => starter && starter.profileType === 'Traffic-risk')) {
      volatilityModifiers.push({ label: 'At least one listed starter profiles as traffic-risk', delta: 4 })
    }

    if (starters[0].handedness && starters[1].handedness && starters[0].handedness !== starters[1].handedness) {
      volatilityModifiers.push({ label: 'Handedness contrast can change game shape quickly', delta: 2 })
    }

    if (Math.abs(starters[0].strikeouts - starters[1].strikeouts) >= 14) {
      volatilityModifiers.push({ label: 'One starter owns a larger swing-and-miss edge', delta: 3 })
    }

    if (
      offenseProfiles.every(Boolean) &&
      (Number(offenseProfiles[0].last3HitsPerGame) >= 9 || Number(offenseProfiles[1].last3HitsPerGame) >= 9)
    ) {
      volatilityModifiers.push({ label: 'At least one lineup is entering with a hotter recent hit profile', delta: 3 })
    }

    if (
      bullpenProfiles.every(Boolean) &&
      (Number(bullpenProfiles[0].era) >= 4.5 || Number(bullpenProfiles[1].era) >= 4.5) &&
      (Number(bullpenProfiles[0].whip) >= 1.4 || Number(bullpenProfiles[1].whip) >= 1.4)
    ) {
      volatilityModifiers.push({ label: 'At least one bullpen can leak traffic late', delta: 4 })
    }

    if (
      bullpenProfiles.every(Boolean) &&
      Number(bullpenProfiles[0].era) >= 4.5 &&
      Number(bullpenProfiles[1].era) >= 4.5
    ) {
      volatilityModifiers.push({ label: 'Both bullpens bring genuine late-inning damage risk', delta: 5 })
    }

    if (
      bullpenChainProfiles.some((profile) =>
        (profile?.topRelievers || []).some((reliever) => reliever.workedYesterday || reliever.backToBack)
      )
    ) {
      volatilityModifiers.push({ label: 'At least one likely bridge reliever enters with recent workload stress', delta: 4 })
    }

    if (favoriteIndex !== null) {
      const underdogIndex = favoriteIndex === 0 ? 1 : 0
      const favoriteTeamContext =
        favoriteIndex === 0 ? game.teamContext?.away : game.teamContext?.home
      const underdogTeamContext =
        underdogIndex === 0 ? game.teamContext?.away : game.teamContext?.home

      if (
        Number.isFinite(bullpenScores[underdogIndex]) &&
        Number.isFinite(bullpenScores[favoriteIndex]) &&
        bullpenScores[underdogIndex] - bullpenScores[favoriteIndex] >= 8
      ) {
        volatilityModifiers.push({ label: 'The underdog owns the stronger bullpen escape hatch', delta: 5 })
      }

      if (
        Number.isFinite(bullpenChainScores[underdogIndex]) &&
        Number.isFinite(bullpenChainScores[favoriteIndex]) &&
        bullpenChainScores[underdogIndex] - bullpenChainScores[favoriteIndex] >= 6
      ) {
        volatilityModifiers.push({ label: 'The underdog owns the fresher likely bridge chain', delta: 5 })
      }

      if (
        Number.isFinite(lineupScores[underdogIndex]) &&
        Number.isFinite(lineupScores[favoriteIndex]) &&
        lineupScores[underdogIndex] - lineupScores[favoriteIndex] >= 8
      ) {
        volatilityModifiers.push({ label: 'The underdog lineup fits today’s starter better', delta: 5 })
      }

      if (
        Number.isFinite(offenseScores[underdogIndex]) &&
        Number.isFinite(offenseScores[favoriteIndex]) &&
        offenseScores[underdogIndex] - offenseScores[favoriteIndex] >= 6
      ) {
        volatilityModifiers.push({ label: 'The underdog hit-production trend is still live', delta: 3 })
      }

      if (
        Number.isFinite(savantScores[underdogIndex]) &&
        Number.isFinite(savantScores[favoriteIndex]) &&
        savantScores[underdogIndex] - savantScores[favoriteIndex] >= 6
      ) {
        volatilityModifiers.push({ label: 'The underdog owns the cleaner Statcast contact profile', delta: 4 })
      }

      if (
        Number.isFinite(starterScores[favoriteIndex]) &&
        Number.isFinite(starterScores[underdogIndex]) &&
        Number.isFinite(bullpenScores[favoriteIndex]) &&
        Number.isFinite(bullpenScores[underdogIndex]) &&
        starterScores[favoriteIndex] - starterScores[underdogIndex] >= 12 &&
        bullpenScores[favoriteIndex] - bullpenScores[underdogIndex] >= 8
      ) {
        volatilityModifiers.push({ label: 'Favorite also owns the cleaner starter-to-bullpen chain', delta: -4 })
      }

      if (
        Number.isFinite(starterScores[favoriteIndex]) &&
        Number.isFinite(starterScores[underdogIndex]) &&
        Number.isFinite(bullpenChainScores[favoriteIndex]) &&
        Number.isFinite(bullpenChainScores[underdogIndex]) &&
        starterScores[favoriteIndex] - starterScores[underdogIndex] >= 10 &&
        bullpenChainScores[favoriteIndex] - bullpenChainScores[underdogIndex] >= 8
      ) {
        volatilityModifiers.push({ label: 'Favorite also projects to hand the game to the cleaner first-two reliever chain', delta: -3 })
      }

      if (favoriteTeamContext && parseStreakCode(favoriteTeamContext.streakCode) <= -2) {
        volatilityModifiers.push({ label: 'Favorite enters on a live losing streak', delta: 4 })
      }

      if (favoriteTeamContext && parseStreakCode(favoriteTeamContext.streakCode) <= -4) {
        volatilityModifiers.push({
          label: 'Favorite skid is now long enough to question market trust',
          delta: 3
        })
      }

      if (underdogTeamContext && parseStreakCode(underdogTeamContext.streakCode) >= 2) {
        volatilityModifiers.push({ label: 'Underdog enters with positive recent form', delta: 3 })
      }

      if (
        Number.isFinite(offenseScores[favoriteIndex]) &&
        Number.isFinite(offenseScores[underdogIndex]) &&
        Number.isFinite(bullpenScores[favoriteIndex]) &&
        bullpenScores[favoriteIndex] < 58 &&
        offenseScores[favoriteIndex] - offenseScores[underdogIndex] <= 4
      ) {
        volatilityModifiers.push({
          label: 'Favorite still needs a shakier late bullpen to protect only a thin offense edge',
          delta: 3
        })
      }

      if (
        favoriteTeamContext &&
        (Number(favoriteTeamContext.runDifferential) || 0) <= 0 &&
        Number.isFinite(starters[favoriteIndex]?.era) &&
        starters[favoriteIndex].era >= 4.5
      ) {
        volatilityModifiers.push({
          label: 'Favorite profile is carrying a shakier starter despite the price',
          delta: 4
        })
      }

      if (starters[favoriteIndex]?.profileType === 'Traffic-risk') {
        volatilityModifiers.push({
          label: 'Favorite still leans on a traffic-risk starter type',
          delta: 4
        })
      }
    }
  }

  volatilityModifiers.push(...buildMlbParkModifiers(game, starters))

  if (game.pitcherSourceNote) {
    volatilityModifiers.push({
      label: 'Official probable-starter listing and market board are not perfectly aligned',
      delta: 6
    })
  }

  return {
    sourceLabel: sourceParts.join(' + '),
    signals,
    volatilityBase: sportVolatilityBase.MLB,
    volatilityModifiers,
    confidenceModifier,
    mlbProjection,
    mlbRiskContext: {
      starters,
      starterScores,
      offenseScores,
      bullpenScores,
      bullpenChainScores,
      savantScores,
      lineupScores,
      projectedHitProfiles
    }
  }
}

const detectWeightClass = (text = '') => {
  const normalized = normalizeText(text)

  for (const weightClass of ['flyweight', 'bantamweight', 'featherweight', 'lightweight', 'welterweight', 'middleweight', 'light heavyweight', 'heavyweight']) {
    if (normalized.includes(weightClass)) return weightClass
  }

  return ''
}

const applyProfileDelta = (profile, delta) => {
  Object.entries(delta).forEach(([key, value]) => {
    profile[key] += value
  })
}

const buildFighterProfile = (detail = '', stage = '') => {
  const parts = detail.split('|').map((part) => part.trim()).filter(Boolean)
  const record = parseRecord(parts[0] || '')
  const descriptors = parts.slice(1)
  const descriptorText = normalizeText([stage, ...descriptors].join(' | '))
  const weightClass = detectWeightClass([stage, ...descriptors].join(' | '))
  const totalBouts = record?.totalBouts ?? 0
  const winPct = record?.winPct ?? 0.5

  const profile = {
    striking: 50,
    grappling: 50,
    pace: 50,
    durability: clamp(46 + winPct * 12 + Math.log(totalBouts + 1) * 4, 38, 86),
    finishing: 50,
    experience: clamp(40 + Math.log(totalBouts + 1) * 14, 36, 90),
    championship: 50
  }

  const descriptorRules = [
    [/former champion/, { experience: 14, durability: 6, pace: 4, championship: 12 }],
    [/champion/, { experience: 10, durability: 4, pace: 4, championship: 10 }],
    [/prospect/, { experience: -8, pace: 4, finishing: 3, championship: -6 }],
    [/elite/, { striking: 5, grappling: 5, pace: 4, durability: 4, finishing: 4, championship: 4 }],
    [/grappling|grappler|jiu jitsu|submission/, { grappling: 18, striking: -4, pace: 3, finishing: 4 }],
    [/control/, { grappling: 12, pace: 5, durability: 3 }],
    [/striker|striking|boxer|jab/, { striking: 16, grappling: -6 }],
    [/pressure/, { striking: 5, pace: 9, durability: 4 }],
    [/explosive|power/, { striking: 6, finishing: 16, pace: -3 }],
    [/range|rangy|tall/, { striking: 9, durability: 3 }],
    [/southpaw/, { striking: 4 }],
    [/volume|pace/, { pace: 12, durability: 4, championship: 3 }],
    [/dynamic|freestyle/, { striking: 4, grappling: 6, finishing: 4 }],
    [/winning profile/, { experience: 8, durability: 5, championship: 4 }],
    [/fight week spotlight/, { pace: 2, finishing: 2 }]
  ]

  descriptorRules.forEach(([pattern, delta]) => {
    if (pattern.test(descriptorText)) applyProfileDelta(profile, delta)
  })

  if (record?.losses === 0) {
    applyProfileDelta(profile, { durability: 4, championship: 4 })
  }

  if (winPct >= 0.82) {
    applyProfileDelta(profile, { durability: 3, championship: 4 })
  }

  if (totalBouts >= 25) {
    applyProfileDelta(profile, { experience: 6, durability: 4 })
  }

  if (weightClass === 'heavyweight') {
    applyProfileDelta(profile, { finishing: 8, pace: -2 })
  }

  Object.keys(profile).forEach((key) => {
    profile[key] = clamp(profile[key], 24, 94)
  })

  return {
    ...record,
    weightClass,
    descriptors,
    profile
  }
}

const buildUfcAnalysisContext = (game, participants) => {
  const fighters = participants.map((participant) => buildFighterProfile(participant.detail, game.stage))
  const signals = [buildMarketSignal(game.league, participants)].filter(Boolean)
  const volatilityModifiers = []
  const isTitleFight = /title fight|main event/i.test(game.stage)
  const marketProbabilities = computeNoVigProbabilities(
    participants.map((participant) => participant.americanOdds)
  )

  if (fighters.every(Boolean)) {
    signals.push(
      createSignal(
        'Win profile',
        0.12,
        fighters.map((fighter) => ({
          label: fighter ? `${fighter.wins}-${fighter.losses}${fighter.draws ? `-${fighter.draws}` : ''}` : 'Record unavailable',
          score: fighter
            ? clamp(34 + fighter.winPct * 46 + Math.log(fighter.totalBouts + 1) * 6, 24, 90)
            : 50
        })),
        'Listed fight records'
      )
    )

    signals.push(
      createSignal(
        'Striking profile',
        0.12,
        fighters.map((fighter) => ({
          label: fighter.descriptors[0] || 'Style note unavailable',
          score: fighter.profile.striking
        })),
        'Structured fighter profile'
      )
    )

    signals.push(
      createSignal(
        'Control and grappling',
        0.18,
        fighters.map((fighter) => ({
          label: fighter.descriptors.at(-1) || 'Style note unavailable',
          score: fighter.profile.grappling
        })),
        'Structured fighter profile'
      )
    )

    signals.push(
      createSignal(
        'Pace and cardio',
        0.11,
        fighters.map((fighter) => ({
          label: fighter.weightClass || 'Open-weight pace note',
          score: fighter.profile.pace
        })),
        'Structured fighter profile'
      )
    )

    signals.push(
      createSignal(
        'Durability and experience',
        0.14,
        fighters.map((fighter) => ({
          label: `${fighter.totalBouts} pro bouts`,
          score: average([fighter.profile.durability, fighter.profile.experience])
        })),
        'Structured fighter profile'
      )
    )

    signals.push(
      createSignal(
        'Finishing danger',
        0.11,
        fighters.map((fighter) => ({
          label: fighter.descriptors.join(' | ') || 'Finish profile unavailable',
          score: fighter.profile.finishing
        })),
        'Structured fighter profile'
      )
    )

    if (isTitleFight) {
      signals.push(
        createSignal(
          'Championship composure',
          0.1,
          fighters.map((fighter) => ({
            label: fighter.descriptors.join(' | ') || 'Five-round read',
            score: fighter.profile.championship
          })),
          'Structured fighter profile'
        )
      )
    }

    if (fighters.some((fighter) => fighter.weightClass === 'heavyweight')) {
      volatilityModifiers.push({ label: 'Heavyweight finishing volatility', delta: 8 })
    }

    if (average(fighters.map((fighter) => fighter.profile.finishing)) >= 76) {
      volatilityModifiers.push({ label: 'Both sides bring real finish equity', delta: 6 })
    }

    if (isTitleFight) {
      volatilityModifiers.push({ label: 'Championship rounds add adaptation variance', delta: 4 })
    }

    if (Math.abs(fighters[0].profile.grappling - fighters[1].profile.grappling) >= 20) {
      volatilityModifiers.push({ label: 'Major control split can swing rounds fast', delta: 4 })
    }

    if (fighters.every((fighter) => fighter.totalBouts <= 20)) {
      volatilityModifiers.push({ label: 'Younger career samples leave more unknowns', delta: 4 })
    }

    if (marketProbabilities.length === participants.length && Math.max(...marketProbabilities) >= 0.68) {
      volatilityModifiers.push({ label: 'Market favorite is clearly established', delta: -6 })
    }
  }

  return {
    sourceLabel: 'Moneyline + structured fighter profiles',
    signals,
    volatilityBase: sportVolatilityBase.UFC,
    volatilityModifiers
  }
}

const buildOverrideAnalysisContext = (game, participants) => {
  const override = structuredInputOverrides[game.id]

  if (!override) return null

  return {
    sourceLabel: override.sourceLabel || 'Moneyline + local structured inputs',
    signals: [buildMarketSignal(game.league, participants), ...(override.signals || [])].filter(Boolean),
    volatilityBase: override.volatility?.base ?? sportVolatilityBase[game.league] ?? 55,
    volatilityModifiers: override.volatility?.modifiers ?? []
  }
}

const buildStructuredAnalysisContext = (game, participants) => {
  if (game.league === 'MLB') return buildMlbAnalysisContext(game, participants)
  if (game.league === 'UFC') return buildUfcAnalysisContext(game, participants)
  if (game.league === 'NBA' || game.league === 'WNBA') {
    return buildOverrideAnalysisContext(game, participants)
  }

  return null
}

const buildMlbDecisionIndicators = ({
  riskContext,
  participants,
  winnerIndex,
  loserIndex,
  modelEdge,
  baseVolatility
}) => {
  if (!riskContext) return null

  const pickBullpenScore = riskContext.bullpenScores?.[winnerIndex]
  const opponentBullpenScore = riskContext.bullpenScores?.[loserIndex]
  const pickBullpenChainScore = riskContext.bullpenChainScores?.[winnerIndex]
  const opponentBullpenChainScore = riskContext.bullpenChainScores?.[loserIndex]
  const pickStarterScore = riskContext.starterScores?.[winnerIndex]
  const opponentStarterScore = riskContext.starterScores?.[loserIndex]
  const pickProjectedHits = riskContext.projectedHitProfiles?.[winnerIndex]?.projectedHits
  const opponentProjectedHits = riskContext.projectedHitProfiles?.[loserIndex]?.projectedHits
  const projectedHitEdgeForPick =
    Number.isFinite(pickProjectedHits) && Number.isFinite(opponentProjectedHits)
      ? roundToTenths(pickProjectedHits - opponentProjectedHits)
      : null
  const hitEdgeAgainstPick =
    Number.isFinite(projectedHitEdgeForPick) && projectedHitEdgeForPick < -0.2
  const starterGap =
    Number.isFinite(pickStarterScore) && Number.isFinite(opponentStarterScore)
      ? pickStarterScore - opponentStarterScore
      : null
  const bullpenGap =
    Number.isFinite(pickBullpenScore) && Number.isFinite(opponentBullpenScore)
      ? pickBullpenScore - opponentBullpenScore
      : null
  const bullpenChainGap =
    Number.isFinite(pickBullpenChainScore) && Number.isFinite(opponentBullpenChainScore)
      ? pickBullpenChainScore - opponentBullpenChainScore
      : null
  const starterLeverageIndex = clamp(
    50 +
      (Number.isFinite(starterGap) ? starterGap * 1.15 : 0) +
      (Number.isFinite(projectedHitEdgeForPick) ? projectedHitEdgeForPick * 6 : 0),
    0,
    100
  )
  const lateInningStabilityIndex = clamp(
    50 +
      (Number.isFinite(bullpenGap) ? bullpenGap * 1.3 : 0) -
      (Number.isFinite(bullpenChainGap) ? bullpenChainGap * 0.95 : 0) -
      Math.max(baseVolatility - 70, 0) * 0.65 -
      (hitEdgeAgainstPick ? 6 : 0),
    0,
    100
  )

  let reliefPitchingRisk = 36
  let coinflipPressure = 18
  const notes = []
  let confidenceDelta = 0
  let volatilityDelta = 0

  if (Number.isFinite(opponentBullpenScore) && Number.isFinite(pickBullpenScore)) {
    reliefPitchingRisk += Math.max(opponentBullpenScore - pickBullpenScore, 0) * 1.7
  }

  if (Number.isFinite(opponentBullpenChainScore) && Number.isFinite(pickBullpenChainScore)) {
    reliefPitchingRisk += Math.max(opponentBullpenChainScore - pickBullpenChainScore, 0) * 1.15
  }

  if (Number.isFinite(starterGap)) {
    if (starterGap >= 8) reliefPitchingRisk += 5
    if (starterGap >= 14) reliefPitchingRisk += 4
  }

  if (hitEdgeAgainstPick) {
    reliefPitchingRisk += 12
    coinflipPressure += 12
  }

  if (Number.isFinite(projectedHitEdgeForPick) && projectedHitEdgeForPick <= -1.2) {
    reliefPitchingRisk += 7
    coinflipPressure += 9
  }

  if (modelEdge <= 2) {
    reliefPitchingRisk += 8
    coinflipPressure += 18
  } else if (modelEdge <= 5) {
    reliefPitchingRisk += 6
    coinflipPressure += 14
  } else if (modelEdge <= 8) {
    coinflipPressure += 8
  }

  if (baseVolatility >= 85) {
    reliefPitchingRisk += 7
    coinflipPressure += 16
  } else if (baseVolatility >= 75) {
    reliefPitchingRisk += 4
    coinflipPressure += 9
  }

  if (starterLeverageIndex >= 60 && lateInningStabilityIndex <= 52) {
    reliefPitchingRisk += 8
    coinflipPressure += 10
  }

  if (starterLeverageIndex >= 72 && lateInningStabilityIndex <= 46) {
    reliefPitchingRisk += 5
    coinflipPressure += 7
  }

  if (
    Number.isFinite(opponentBullpenChainScore) &&
    Number.isFinite(pickBullpenChainScore) &&
    opponentBullpenChainScore - pickBullpenChainScore >= 7
  ) {
    reliefPitchingRisk += 7
    coinflipPressure += 8
  }

  reliefPitchingRisk = clamp(reliefPitchingRisk, 22, 95)
  coinflipPressure = clamp(coinflipPressure, 8, 95)

  if (coinflipPressure >= 60) {
    notes.push({ label: 'Coin-flip pressure is elevated for this full-game side', delta: 4 })
    confidenceDelta -= 5
    volatilityDelta += 5
  }

  if (reliefPitchingRisk >= 72) {
    notes.push({
      label: 'Relief-pitching risk is elevated if the game flips after the starter phase',
      delta: 6
    })
    confidenceDelta -= 5
    volatilityDelta += 6
  } else if (reliefPitchingRisk >= 62) {
    notes.push({ label: 'Late-inning hold risk is above average for this side', delta: 4 })
    confidenceDelta -= 3
    volatilityDelta += 4
  }

  if (starterLeverageIndex >= 60 && lateInningStabilityIndex <= 52) {
    notes.push({
      label: 'Starter edge looks better than the late-inning hold profile; this reads cleaner for first five',
      delta: 5
    })
    confidenceDelta -= 3
    volatilityDelta += 5
  }

  if (
    Number.isFinite(opponentBullpenScore) &&
    Number.isFinite(pickBullpenScore) &&
    opponentBullpenScore - pickBullpenScore >= 6
  ) {
    notes.push({ label: `${participants[loserIndex].name} carry the cleaner bullpen profile`, delta: 3 })
  }

  if (
    Number.isFinite(opponentBullpenChainScore) &&
    Number.isFinite(pickBullpenChainScore) &&
    opponentBullpenChainScore - pickBullpenChainScore >= 6
  ) {
    notes.push({ label: `${participants[loserIndex].name} are likelier to hand the middle innings to a fresher bridge chain`, delta: 3 })
  }

  if (hitEdgeAgainstPick) {
    notes.push({ label: `${participants[loserIndex].name} also own the projected hit edge`, delta: 3 })
  }

  if (Number.isFinite(projectedHitEdgeForPick) && projectedHitEdgeForPick <= -1.2) {
    notes.push({
      label: `${participants[loserIndex].name} own the cleaner projected traffic profile by more than a full hit`,
      delta: 4
    })
    confidenceDelta -= 3
    volatilityDelta += 4
  }

  return {
    reliefPitchingRisk: roundToTenths(reliefPitchingRisk),
    coinflipPressure: roundToTenths(coinflipPressure),
    starterLeverageIndex: roundToTenths(starterLeverageIndex),
    lateInningStabilityIndex: roundToTenths(lateInningStabilityIndex),
    pickBullpenScore: Number.isFinite(pickBullpenScore) ? roundToTenths(pickBullpenScore) : null,
    oppBullpenScore: Number.isFinite(opponentBullpenScore) ? roundToTenths(opponentBullpenScore) : null,
    pickBullpenChainScore: Number.isFinite(pickBullpenChainScore)
      ? roundToTenths(pickBullpenChainScore)
      : null,
    oppBullpenChainScore: Number.isFinite(opponentBullpenChainScore)
      ? roundToTenths(opponentBullpenChainScore)
      : null,
    pickStarterScore: Number.isFinite(pickStarterScore) ? roundToTenths(pickStarterScore) : null,
    oppStarterScore: Number.isFinite(opponentStarterScore) ? roundToTenths(opponentStarterScore) : null,
    projectedHitEdgeForPick,
    hitEdgeAgainstPick,
    confidenceDelta,
    volatilityDelta,
    notes
  }
}

const buildFallbackAnalysisModel = (game, participants, hasFullMoneyline) => {
  const participant = findAnalysisParticipant(game.lean, participants)
  const opponent = participant ? participants.find((entry) => entry.id !== participant.id) : null
  const confidence = Number(game.confidence) || 0
  const volatility = Number(game.volatility) || 0
  const recommendationScore = Math.round(
    confidence * fallbackRecommendationWeight.confidence +
      (100 - volatility) * fallbackRecommendationWeight.stability
  )

  return {
    available: Boolean(hasFullMoneyline && participant && Number.isFinite(participant.americanOdds)),
    participantId: participant?.id ?? null,
    participant,
    opponent,
    lean: game.lean,
    rationale: game.factors?.[0] || game.summary,
    confidence,
    volatility,
    recommendationScore,
    tier: getAnalysisTier(confidence, volatility),
    sourceLabel: 'Editorial slate read',
    modelEdge: 0,
    modelEdgeLabel: 'Editorial read',
    marketProbability: participant?.impliedProbability ?? null,
    marketProbabilityLabel: participant?.impliedProbabilityLabel ?? 'N/A',
    inputs: [],
    inputsUsed: 0,
    volatilityNotes: []
  }
}

const buildStructuredAnalysisModel = (game, participants, hasFullMoneyline) => {
  const context = buildStructuredAnalysisContext(game, participants)

  if (!context?.signals?.length) return null

  const normalizedSignals = context.signals.map((signal) => normalizeSignal(signal, participants))
  const totalWeight = normalizedSignals.reduce((sum, signal) => sum + signal.weight, 0)

  if (!totalWeight) return null

  const sideScores = participants.map((_, index) =>
    normalizedSignals.reduce((sum, signal) => sum + signal.values[index].score * signal.weight, 0) /
    totalWeight
  )

  const marketSignal = normalizedSignals.find((signal) => signal.label === 'Market price')
  const marketProbabilities = marketSignal
    ? marketSignal.values.map((entry) => entry.score / 100)
    : computeNoVigProbabilities(participants.map((entry) => entry.americanOdds))
  const marketWinnerIndex =
    marketProbabilities.length === participants.length
      ? marketProbabilities[0] >= marketProbabilities[1]
        ? 0
        : 1
      : null
  const adjustedSideScores = [...sideScores]

  if (
    game.league === 'MLB' &&
    marketWinnerIndex !== null &&
    context.mlbRiskContext?.projectedHitProfiles?.length === participants.length
  ) {
    const underdogIndex = marketWinnerIndex === 0 ? 1 : 0
    const favoriteHitProfile = context.mlbRiskContext.projectedHitProfiles[marketWinnerIndex]
    const underdogHitProfile = context.mlbRiskContext.projectedHitProfiles[underdogIndex]
    const favoriteBullpenChain = context.mlbRiskContext.bullpenChainScores?.[marketWinnerIndex]
    const underdogBullpenChain = context.mlbRiskContext.bullpenChainScores?.[underdogIndex]

    if (favoriteHitProfile && underdogHitProfile) {
      const favoriteHitGap = favoriteHitProfile.projectedHits - underdogHitProfile.projectedHits
      const favoriteFirst5Gap =
        favoriteHitProfile.first5ProjectedHits - underdogHitProfile.first5ProjectedHits
      const favoriteLateGap =
        favoriteHitProfile.lateProjectedHits - underdogHitProfile.lateProjectedHits
      const favoriteBullpenGap =
        Number.isFinite(favoriteBullpenChain) && Number.isFinite(underdogBullpenChain)
          ? favoriteBullpenChain - underdogBullpenChain
          : 0

      if (favoriteHitGap <= -1) {
        adjustedSideScores[underdogIndex] += Math.min(4.6, Math.abs(favoriteHitGap) * 1.7)
      }

      if (favoriteFirst5Gap <= -0.8) {
        adjustedSideScores[underdogIndex] += Math.min(2.1, Math.abs(favoriteFirst5Gap) * 1.3)
      }

      if (favoriteLateGap <= -0.8 && favoriteBullpenGap < 0) {
        adjustedSideScores[underdogIndex] += Math.min(
          2.4,
          Math.abs(favoriteLateGap) * 1.15 + Math.abs(favoriteBullpenGap) * 0.1
        )
      }
    }
  }

  const winnerIndex = adjustedSideScores[0] >= adjustedSideScores[1] ? 0 : 1
  const loserIndex = winnerIndex === 0 ? 1 : 0
  const participant = participants[winnerIndex]
  const opponent = participants[loserIndex]
  const modelEdge = adjustedSideScores[winnerIndex] - adjustedSideScores[loserIndex]
  const coverageBonus = Math.min(6, normalizedSignals.length)
  const agreementBonus =
    marketWinnerIndex === null ? 0 : marketWinnerIndex === winnerIndex ? 5 : -3
  const marketSupport = marketProbabilities[winnerIndex] ?? participant.impliedProbability ?? 0.5
  const baseConfidence = Math.round(
    clamp(
      50 +
        modelEdge * 0.95 +
        coverageBonus +
        agreementBonus +
        Math.abs(marketSupport - 0.5) * 12 +
        (context.confidenceModifier ?? 0),
      52,
      89
    )
  )
  const marketTightness =
    marketProbabilities.length === participants.length
      ? (1 - Math.abs(marketProbabilities[0] - 0.5) * 2) * 12
      : 4
  const modifierDelta = (context.volatilityModifiers || []).reduce(
    (sum, modifier) => sum + modifier.delta,
    0
  )
  const baseVolatility = Math.round(
    clamp(
      (context.volatilityBase ?? sportVolatilityBase[game.league] ?? 55) +
        marketTightness +
        modifierDelta -
        modelEdge * 0.5 +
        (normalizedSignals.length < 3 ? 6 : 0),
      30,
      92
    )
  )
  const mlbIndicators =
    game.league === 'MLB'
      ? buildMlbDecisionIndicators({
          riskContext: context.mlbRiskContext,
          participants,
          winnerIndex,
          loserIndex,
          modelEdge,
          baseVolatility
        })
      : null
  const confidence = Math.round(
    clamp(baseConfidence + (mlbIndicators?.confidenceDelta ?? 0), 52, 89)
  )
  const volatility = Math.round(
    clamp(baseVolatility + (mlbIndicators?.volatilityDelta ?? 0), 30, 92)
  )
  const recommendationScore = Math.round(
    confidence * structuredRecommendationWeight.confidence +
      (100 - volatility) * structuredRecommendationWeight.stability +
      modelEdge * structuredRecommendationWeight.edge
  )

  const inputCandidates = normalizedSignals
    .filter((signal) => signal.favoredParticipantId === participant.id && signal.margin > 0)
    .sort((left, right) => right.margin * right.weight - left.margin * left.weight)

  const inputs = inputCandidates.slice(0, 3).map((signal) => ({
    label: signal.label,
    summary: signal.summary,
    source: signal.source,
    margin: roundToTenths(signal.margin),
    weight: signal.weight
  }))

  const leanDrivers = inputs.slice(0, 2).map((input) => input.label.toLowerCase())
  const lean =
    leanDrivers.length > 0
      ? `Model pick: ${participant.name} on ${leanDrivers.join(' and ')}.`
      : `Model pick: ${participant.name}.`
  const pickScript = context.mlbProjection?.teamScripts?.find((script) =>
    teamNamesMatch(script.teamName, participant.name)
  )

  return {
    available: Boolean(hasFullMoneyline && participant && Number.isFinite(participant.americanOdds)),
    participantId: participant.id,
    participant,
    opponent,
    lean,
    rationale: inputs[0]?.summary || game.factors?.[0] || game.summary,
    confidence,
    volatility,
    recommendationScore,
    tier: getAnalysisTier(confidence, volatility),
    sourceLabel: context.sourceLabel,
    modelEdge: roundToTenths(modelEdge),
    modelEdgeLabel: `${roundToTenths(modelEdge)}-point model edge`,
    marketProbability: marketSupport,
    marketProbabilityLabel: formatProbability(marketSupport),
    inputs,
    inputsUsed: normalizedSignals.length,
    volatilityNotes: [...(context.volatilityModifiers || []), ...(mlbIndicators?.notes || [])],
    pickReasons: pickScript?.winPath?.slice(0, 4) ?? [],
    indicators: mlbIndicators
      ? {
          reliefPitchingRisk: mlbIndicators.reliefPitchingRisk,
          coinflipPressure: mlbIndicators.coinflipPressure,
          starterLeverageIndex: mlbIndicators.starterLeverageIndex,
          lateInningStabilityIndex: mlbIndicators.lateInningStabilityIndex,
          pickBullpenScore: mlbIndicators.pickBullpenScore,
          oppBullpenScore: mlbIndicators.oppBullpenScore,
          pickBullpenChainScore: mlbIndicators.pickBullpenChainScore,
          oppBullpenChainScore: mlbIndicators.oppBullpenChainScore,
          pickStarterScore: mlbIndicators.pickStarterScore,
          oppStarterScore: mlbIndicators.oppStarterScore,
          projectedHitEdgeForPick: mlbIndicators.projectedHitEdgeForPick,
          hitEdgeAgainstPick: mlbIndicators.hitEdgeAgainstPick
        }
      : null,
    mlbProjection: context.mlbProjection ?? null
  }
}

const buildAnalysisModel = (game, participants, hasFullMoneyline) =>
  buildStructuredAnalysisModel(game, participants, hasFullMoneyline) ??
  buildFallbackAnalysisModel(game, participants, hasFullMoneyline)

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
    metadata: {
      participantCount: participants.length,
      participantNames: participants.map((participant) => participant.name),
      tagCount: game.tags.length,
      hasSeriesBreakdown: Boolean(game.seriesBreakdown),
      hasMoneyline: Boolean(moneylineMarket),
      hasAnalysisPick: Boolean(analysis.participantId),
      hasStructuredInputs: analysis.inputsUsed > 0,
      startMinutes: game.startMinutes,
      spotlight: game.spotlight,
      league: game.league,
      oddsProvider
    }
  }
}

export const rankAnalysisPicks = (games) =>
  games
    .filter((game) => game.analysis?.available)
    .sort((left, right) => {
      if (right.analysis.confidence !== left.analysis.confidence) {
        return right.analysis.confidence - left.analysis.confidence
      }

      if (left.analysis.volatility !== right.analysis.volatility) {
        return left.analysis.volatility - right.analysis.volatility
      }

      return right.analysis.recommendationScore - left.analysis.recommendationScore
    })
    .map((game, index) => ({
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
      game
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
    .filter((game) => game.analysis?.available && game.moneyline?.available)
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

const hashSeedString = (value = '') => {
  let hash = 2166136261

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }

  return hash >>> 0
}

const createSeededRandom = (seed = 1) => {
  let state = seed >>> 0 || 1

  return () => {
    state += 0x6d2b79f5
    let value = state
    value = Math.imul(value ^ (value >>> 15), value | 1)
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61)

    return ((value ^ (value >>> 14)) >>> 0) / 4294967296
  }
}

const randomCentered = (rng, samples = 4) => {
  let total = 0

  for (let index = 0; index < samples; index += 1) {
    total += rng()
  }

  return total / samples - 0.5
}

const samplePoisson = (lambda, rng) => {
  if (!Number.isFinite(lambda) || lambda <= 0) return 0
  if (lambda < 0.18) return rng() < lambda ? 1 : 0

  const threshold = Math.exp(-Math.min(lambda, 8))
  let product = 1
  let count = 0

  do {
    count += 1
    product *= rng()
  } while (product > threshold && count < 24)

  return Math.max(0, count - 1)
}

const normalizeWeightArray = (weights = []) => {
  const sanitized = weights.map((weight) => Math.max(Number(weight) || 0, 0.01))
  const total = sanitized.reduce((sum, weight) => sum + weight, 0) || 1

  return sanitized.map((weight) => weight / total)
}

const buildFirstFiveWeights = (teamScript = {}) => {
  const weights = [0.23, 0.18, 0.21, 0.19, 0.19]
  const topThirdBias = clamp(((Number(teamScript?.topThirdScore) || 50) - 50) / 240, -0.08, 0.08)

  weights[0] += topThirdBias * 0.7
  weights[1] += topThirdBias * 0.45
  weights[2] += topThirdBias * 0.2
  weights[3] -= topThirdBias * 0.35
  weights[4] -= topThirdBias * 1

  return normalizeWeightArray(weights)
}

const buildLateWeights = (teamScript = {}) => {
  const weights = [0.29, 0.25, 0.24, 0.22]
  const depthBias = clamp(((Number(teamScript?.depthScore) || 50) - 50) / 220, -0.08, 0.08)

  weights[0] += depthBias * 0.12
  weights[1] += depthBias * 0.08
  weights[2] += depthBias * 0.04
  weights[3] -= depthBias * 0.24

  return normalizeWeightArray(weights)
}

const buildSimulationDriverList = (game, teamName, teamScript = {}) => {
  const scriptedDrivers = (teamScript?.overperformHitters || []).slice(0, 3).map((hitter) => hitter.name)
  const homeRunDrivers = [...(game.homeRunTargets?.likely || []), ...(game.homeRunTargets?.possible || [])]
    .filter((target) => teamNamesMatch(target.teamName, teamName))
    .map((target) => target.playerName)

  return [...new Set([...scriptedDrivers, ...homeRunDrivers])].slice(0, 3)
}

const buildSimulationTemperatureLabel = (temperature = 0.5) => {
  if (temperature <= 0.18) return 'Cold'
  if (temperature <= 0.42) return 'Stable'
  if (temperature <= 0.68) return 'Balanced'
  if (temperature <= 0.86) return 'Volatile'

  return 'Chaos'
}

const buildMlbSimulationTeamResult = ({
  game,
  teamName,
  teamScript,
  projectedRuns,
  projectedHits,
  first5ProjectedRuns,
  lateProjectedRuns,
  first5ProjectedHits,
  lateProjectedHits,
  hitEfficiencyPct,
  opposingBullpenExhaustion,
  isFirst5EdgeTeam,
  isLateEdgeTeam,
  temperature,
  rng
}) => {
  const inningRuns = []
  const firstFiveWeights = buildFirstFiveWeights(teamScript)
  const lateWeights = buildLateWeights(teamScript)
  const earlyShockChance =
    0.06 + temperature * 0.08 + Math.max((Number(teamScript?.topThirdScore) || 50) - 54, 0) * 0.002
  const lateShockChance =
    0.08 +
    temperature * 0.14 +
    (Number.isFinite(opposingBullpenExhaustion) ? opposingBullpenExhaustion * 0.003 : 0)
  const earlyShockInning = rng() < earlyShockChance ? 1 + Math.floor(rng() * 5) : null
  const lateShockInning = rng() < lateShockChance ? 6 + Math.floor(rng() * 4) : null

  firstFiveWeights.forEach((weight, index) => {
    const inningNumber = index + 1
    let lambda = first5ProjectedRuns * weight
    let multiplier = clamp(1 + randomCentered(rng, 4) * (0.42 + temperature * 0.48), 0.4, 1.95)

    if (isFirst5EdgeTeam) multiplier += 0.04
    if (inningNumber === earlyShockInning) multiplier += 0.38 + temperature * 0.26
    if (rng() < 0.14 - temperature * 0.04) multiplier *= 0.78

    inningRuns.push(samplePoisson(Math.max(lambda * multiplier, 0.02), rng))
  })

  lateWeights.forEach((weight, index) => {
    const inningNumber = index + 6
    let lambda = lateProjectedRuns * weight
    let multiplier = clamp(
      1 + randomCentered(rng, 4) * (0.48 + temperature * 0.62),
      0.34,
      2.35
    )

    if (isLateEdgeTeam) multiplier += 0.06
    if (inningNumber === lateShockInning) {
      multiplier += 0.42 + temperature * 0.4 + (Number(opposingBullpenExhaustion) || 0) * 0.0035
    }
    if (rng() < 0.12 - temperature * 0.03) multiplier *= 0.82

    inningRuns.push(samplePoisson(Math.max(lambda * multiplier, 0.02), rng))
  })

  let runs = inningRuns.reduce((sum, value) => sum + value, 0)

  while (runs > 14) {
    const biggestInningIndex = inningRuns.findIndex((value) => value === Math.max(...inningRuns))

    if (biggestInningIndex === -1 || inningRuns[biggestInningIndex] <= 0) break

    inningRuns[biggestInningIndex] -= 1
    runs -= 1
  }

  const projectedTotalRuns = first5ProjectedRuns + lateProjectedRuns
  const runDrift = runs - projectedTotalRuns
  const hitVariance = 1.15 + temperature * 1.35 + (buildSimulationDriverList(game, teamName, teamScript).length - 1) * 0.12
  const hitMean =
    projectedHits +
    runDrift * 0.78 +
    ((Number(hitEfficiencyPct) || 24) - 24) * 0.05
  const minimumHits = Math.max(2, runs - 1)
  const hits = Math.round(clamp(hitMean + randomCentered(rng, 5) * hitVariance * 2.1, minimumHits, 18))
  const first5Share = projectedHits > 0 ? first5ProjectedHits / projectedHits : 0.54
  const first5Hits = Math.round(
    clamp(hits * first5Share + randomCentered(rng, 3) * 1.1, Math.max(1, inningRuns.slice(0, 5).reduce((sum, value) => sum + value, 0) - 1), hits)
  )
  const lateHits = Math.max(0, hits - first5Hits)
  const baseErrorChance = 0.11 + temperature * 0.04
  const errors = rng() < baseErrorChance ? (rng() < 0.18 ? 2 : 1) : 0

  return {
    teamName,
    inningRuns,
    runs,
    hits,
    errors,
    first5Runs: inningRuns.slice(0, 5).reduce((sum, value) => sum + value, 0),
    lateRuns: inningRuns.slice(5).reduce((sum, value) => sum + value, 0),
    first5Hits,
    lateHits,
    projectedRuns: roundToTenths(projectedTotalRuns),
    projectedHits,
    drivers: buildSimulationDriverList(game, teamName, teamScript)
  }
}

export const simulateMlbGame = (game, rawTemperature = 0.5, runIndex = 1) => {
  if (game?.league !== 'MLB' || !game?.analysis?.mlbProjection || !Array.isArray(game?.matchup)) return null

  const projection = game.analysis.mlbProjection
  const awayTeamName = game.matchup[0]?.name
  const homeTeamName = game.matchup[1]?.name

  if (!awayTeamName || !homeTeamName) return null

  const temperature = clamp(Number(rawTemperature) || 0.5, 0, 1)
  const rng = createSeededRandom(hashSeedString(`${game.id}:${temperature.toFixed(2)}:${runIndex}`))
  const awayScript =
    projection.teamScripts?.find((script) => teamNamesMatch(script.teamName, awayTeamName)) ??
    projection.teamScripts?.[0] ??
    {}
  const homeScript =
    projection.teamScripts?.find((script) => teamNamesMatch(script.teamName, homeTeamName)) ??
    projection.teamScripts?.[1] ??
    {}
  const awayResult = buildMlbSimulationTeamResult({
    game,
    teamName: awayTeamName,
    teamScript: awayScript,
    projectedRuns: projection.awayProjectedRuns,
    projectedHits: projection.awayProjectedHits,
    first5ProjectedRuns: projection.awayFirst5ProjectedRuns,
    lateProjectedRuns: projection.awayLateProjectedRuns,
    first5ProjectedHits: projection.awayFirst5ProjectedHits,
    lateProjectedHits: projection.awayLateProjectedHits,
    hitEfficiencyPct: projection.awayHitEfficiencyPct,
    opposingBullpenExhaustion: projection.homeBullpenExhaustion,
    isFirst5EdgeTeam: projection.first5EdgeTeam === awayTeamName,
    isLateEdgeTeam: projection.lateEdgeTeam === awayTeamName,
    temperature,
    rng
  })
  const homeResult = buildMlbSimulationTeamResult({
    game,
    teamName: homeTeamName,
    teamScript: homeScript,
    projectedRuns: projection.homeProjectedRuns,
    projectedHits: projection.homeProjectedHits,
    first5ProjectedRuns: projection.homeFirst5ProjectedRuns,
    lateProjectedRuns: projection.homeLateProjectedRuns,
    first5ProjectedHits: projection.homeFirst5ProjectedHits,
    lateProjectedHits: projection.homeLateProjectedHits,
    hitEfficiencyPct: projection.homeHitEfficiencyPct,
    opposingBullpenExhaustion: projection.awayBullpenExhaustion,
    isFirst5EdgeTeam: projection.first5EdgeTeam === homeTeamName,
    isLateEdgeTeam: projection.lateEdgeTeam === homeTeamName,
    temperature,
    rng
  })

  let inningNumber = 10

  while (awayResult.runs === homeResult.runs && inningNumber <= 11) {
    const awayExtra = samplePoisson(
      Math.max(
        projection.awayLateProjectedRuns * 0.18 * (0.76 + temperature * 0.34) +
          (projection.homeBullpenExhaustion || 0) * 0.0022,
        0.08
      ),
      rng
    )
    const homeExtra = samplePoisson(
      Math.max(
        projection.homeLateProjectedRuns * 0.19 * (0.78 + temperature * 0.34) +
          (projection.awayBullpenExhaustion || 0) * 0.0022,
        0.08
      ),
      rng
    )

    awayResult.inningRuns.push(awayExtra)
    homeResult.inningRuns.push(homeExtra)
    awayResult.runs += awayExtra
    homeResult.runs += homeExtra
    awayResult.lateRuns += awayExtra
    homeResult.lateRuns += homeExtra
    inningNumber += 1
  }

  if (awayResult.runs === homeResult.runs) {
    const modelWinnerIndex = projection.edgeTeam === awayTeamName ? 0 : 1
    const target = modelWinnerIndex === 0 ? awayResult : homeResult
    target.inningRuns[target.inningRuns.length - 1] += 1
    target.runs += 1
    target.lateRuns += 1
  }

  const innings = Array.from({ length: awayResult.inningRuns.length }, (_, index) => index + 1)
  const winner = awayResult.runs > homeResult.runs ? awayResult : homeResult
  const loser = winner === awayResult ? homeResult : awayResult
  const first5Leader =
    awayResult.first5Runs === homeResult.first5Runs
      ? 'First five finish level'
      : `${awayResult.first5Runs > homeResult.first5Runs ? awayTeamName : homeTeamName} edge the first five ${awayResult.first5Runs}-${homeResult.first5Runs}`
  const lateLeader =
    awayResult.lateRuns === homeResult.lateRuns
      ? 'Late innings stay level'
      : `${awayResult.lateRuns > homeResult.lateRuns ? awayTeamName : homeTeamName} own the bridge-and-finish lanes ${awayResult.lateRuns}-${homeResult.lateRuns}`
  const upset =
    projection.edgeTeam && !teamNamesMatch(winner.teamName, projection.edgeTeam)
  const lineupsPosted =
    game.lineupBoard?.status?.away === 'posted' && game.lineupBoard?.status?.home === 'posted'
  const temperatureLabel = buildSimulationTemperatureLabel(temperature)

  return {
    temperature,
    temperatureLabel,
    runIndex,
    innings,
    away: awayResult,
    home: homeResult,
    winner: winner.teamName,
    loser: loser.teamName,
    wentExtras: innings.length > 9,
    upset,
    summary: `${winner.teamName} ${winner.runs}, ${loser.teamName} ${loser.runs}${innings.length > 9 ? ` in ${innings.length}` : ''}.`,
    overview: upset
      ? `${winner.teamName} flip the script in a ${temperatureLabel.toLowerCase()} sim, even though ${projection.edgeTeam} held the cleaner base read.`
      : `${winner.teamName} hold the stronger model lane in a ${temperatureLabel.toLowerCase()} sim.`,
    phaseSummary: `${first5Leader}. ${lateLeader}.`,
    lineupNote: lineupsPosted
      ? 'Both official batting orders were posted when this sim was built.'
      : 'At least one batting order is still incomplete, so this sim is looser than the full posted-lineup version.',
    favoredTeam: projection.edgeTeam || ''
  }
}

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
