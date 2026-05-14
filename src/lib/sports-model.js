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

  return [...value.matchAll(americanPattern)].map((match) => Number(match[0]))
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

const buildMlbLineupMatchupScore = (profile = {}) => {
  const grade = Number(profile.averageMatchupGrade)
  const platoonCount = Number(profile.platoonCount)
  const powerCount = Number(profile.powerCount)
  const contactCount = Number(profile.contactCount)

  if (![grade, platoonCount, powerCount, contactCount].every(Number.isFinite)) return null

  return clamp(
    50 +
      grade * 2.8 +
      (platoonCount - 6) * 1.7 +
      (powerCount - 2) * 1.2 +
      (contactCount - 1) * 1.1,
    18,
    92
  )
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
  const starters = participants.map((participant) => parsePitcherDetail(participant.detail))
  const offenseProfiles = [game.offenseContext?.away, game.offenseContext?.home]
  const bullpenProfiles = [game.bullpenContext?.away, game.bullpenContext?.home]
  const lineupProfiles = [
    game.lineupContext?.[participants[0]?.name],
    game.lineupContext?.[participants[1]?.name]
  ]
  const offenseScores = offenseProfiles.map((profile, index) =>
    profile ? buildMlbOffenseScore(profile, participants[index]?.role) : null
  )
  const bullpenScores = bullpenProfiles.map((profile) =>
    profile ? buildMlbBullpenScore(profile) : null
  )
  const lineupScores = lineupProfiles.map((profile) =>
    profile ? buildMlbLineupMatchupScore(profile) : null
  )
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
    buildMlbLineupMatchupSignal(game, participants)
  ].filter(Boolean)
  const volatilityModifiers = []
  const sourceParts = ['Moneyline', 'listed starter data']

  if (game.teamContext?.away && game.teamContext?.home) sourceParts.push('standings context')
  if (game.parkContext?.venueName) sourceParts.push('park factors')
  if (game.offenseContext?.away && game.offenseContext?.home) sourceParts.push('team hit production')
  if (game.bullpenContext?.away && game.bullpenContext?.home) sourceParts.push('bullpen quality')
  if (game.lineupContext?.[participants[0]?.name] && game.lineupContext?.[participants[1]?.name]) {
    sourceParts.push('daily lineup matchup context')
  }

  if (starters.every(Boolean)) {
    const starterScores = starters.map((starter) => starterScore(starter))

    signals.push(
      createSignal(
        'Starter record',
        0.18,
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
        0.24,
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
        0.17,
        starters.map((starter) => ({
          label: `${starter.strikeouts} SO`,
          score: pitcherStrikeoutScore(starter)
        })),
        'Listed probable starters'
      )
    )

    const homeFieldSignal = buildHomeFieldSignal(participants, 0.07)

    if (homeFieldSignal) signals.push(homeFieldSignal)

    const total = parseFirstTotalNumber(getTotalMarketValue(game.odds))

    if (Number.isFinite(total)) {
      if (total >= 9) volatilityModifiers.push({ label: 'Higher posted total', delta: 5 })
      if (total <= 7.5) volatilityModifiers.push({ label: 'Lower posted total', delta: -4 })
    }

    if (starters.some((starter) => !Number.isFinite(starter.era))) {
      volatilityModifiers.push({ label: 'Starter sample is incomplete', delta: 10 })
    }

    if (starters.every((starter) => Number.isFinite(starter.era) && starter.era >= 4.75)) {
      volatilityModifiers.push({ label: 'Both listed ERAs carry damage risk', delta: 5 })
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
        Number.isFinite(starterScores[favoriteIndex]) &&
        Number.isFinite(starterScores[underdogIndex]) &&
        Number.isFinite(bullpenScores[favoriteIndex]) &&
        Number.isFinite(bullpenScores[underdogIndex]) &&
        starterScores[favoriteIndex] - starterScores[underdogIndex] >= 12 &&
        bullpenScores[favoriteIndex] - bullpenScores[underdogIndex] >= 8
      ) {
        volatilityModifiers.push({ label: 'Favorite also owns the cleaner starter-to-bullpen chain', delta: -4 })
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
    volatilityModifiers
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

  const winnerIndex = sideScores[0] >= sideScores[1] ? 0 : 1
  const loserIndex = winnerIndex === 0 ? 1 : 0
  const participant = participants[winnerIndex]
  const opponent = participants[loserIndex]
  const modelEdge = sideScores[winnerIndex] - sideScores[loserIndex]
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
  const coverageBonus = Math.min(6, normalizedSignals.length)
  const agreementBonus =
    marketWinnerIndex === null ? 0 : marketWinnerIndex === winnerIndex ? 5 : -3
  const marketSupport = marketProbabilities[winnerIndex] ?? participant.impliedProbability ?? 0.5
  const confidence = Math.round(
    clamp(
      50 +
        modelEdge * 0.95 +
        coverageBonus +
        agreementBonus +
        Math.abs(marketSupport - 0.5) * 12,
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
  const volatility = Math.round(
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
    volatilityNotes: context.volatilityModifiers || []
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
