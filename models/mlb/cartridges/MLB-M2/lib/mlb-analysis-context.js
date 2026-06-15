import { average, clamp, roundToTenths } from '../../../../shared/sports-core/core-utils.js'
import { computeNoVigProbabilities, getTotalMarketValue, parseFirstTotalNumber } from '../../../../shared/sports-core/market-utils.js'
import { buildMarketSignal, createSignal } from '../../../../shared/sports-core/signal-utils.js'
import {
  buildStarterProfile,
  deriveStarterLeashScore,
  pitcherEraScore,
  pitcherRecordScore,
  pitcherStrikeoutScore,
  starterScore
} from './mlb-starter-utils.js'
import {
  findLineupBoardForTeam,
  formatLineupStatusLabel,
  teamNamesMatch
} from './team-utils.js'

const MLB_VOLATILITY_BASE = 52

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
  if (profile?.staleFeed) return null
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
  if (awayContext.staleFeed || homeContext.staleFeed) return null

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
  if (profile?.staleFeed) return null
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
  if (awayContext.staleFeed || homeContext.staleFeed) return null

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
  const recentBullpenSummary = profile?.recentBullpenSummary ?? null

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
  let score = primary * 0.62 + secondary * 0.38

  if (Number(recentBullpenSummary?.gamesSample || 0) >= 3) {
    const recentEra = Number(recentBullpenSummary?.era)
    const recentWhip = Number(recentBullpenSummary?.whip)
    const recentRunsAllowedPerGame = Number(recentBullpenSummary?.runsAllowedPerGame)
    if (Number.isFinite(recentEra)) score += clamp((4.1 - recentEra) * 1.7, -6, 6)
    if (Number.isFinite(recentWhip)) score += clamp((1.31 - recentWhip) * 10, -4, 4)
    if (Number.isFinite(recentRunsAllowedPerGame)) {
      score += clamp((3.9 - recentRunsAllowedPerGame) * 1.2, -4, 4)
    }
  }

  return clamp(score, 18, 96)
}

const numberOrNull = (value) => {
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

const formatSignedTenths = (value) => {
  const number = Number(value)
  if (!Number.isFinite(number)) return '0.0'
  const rounded = roundToTenths(number)
  return `${rounded >= 0 ? '+' : ''}${rounded.toFixed(1)}`
}

const rateFrom = (value, { allowOpsScale = false } = {}) => {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed <= 0) return null
  if (parsed > 5) return parsed / 1000
  if (parsed > 1 && !allowOpsScale) return parsed / 1000
  return parsed
}

const weightedAverageBy = (items = [], valueKey = 'value', weightKey = 'weight') => {
  const valid = items
    .map((item) => ({
      value: Number(item?.[valueKey]),
      weight: Number(item?.[weightKey])
    }))
    .filter((item) => Number.isFinite(item.value) && Number.isFinite(item.weight) && item.weight > 0)

  if (!valid.length) return null

  return valid.reduce((sum, item) => sum + item.value * item.weight, 0) /
    valid.reduce((sum, item) => sum + item.weight, 0)
}

const formatSplitRate = (value, digits = 3) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed.toFixed(digits) : 'n/a'
}

const buildLineupHandednessSplitProfile = ({
  lineup = [],
  teamName = '',
  opposingStarterHand = ''
} = {}) => {
  const entries = lineup
    .map((entry) => {
      const splitAvg = rateFrom(entry?.split?.avg)
      const splitOps = rateFrom(entry?.split?.ops, { allowOpsScale: true })
      const splitPa = numberOrNull(entry?.split?.plateAppearances) ?? 0
      const seasonAvg = rateFrom(entry?.season?.avg)
      const seasonOps = rateFrom(entry?.season?.ops, { allowOpsScale: true })
      const recentAvg = rateFrom(entry?.recent?.avg)
      const recentOps = rateFrom(entry?.recent?.ops, { allowOpsScale: true })
      const slot = numberOrNull(entry?.slot) ?? numberOrNull(entry?.battingOrder) ?? 99

      return {
        slot,
        name: entry?.name || entry?.playerName || '',
        bats: entry?.bats || '',
        splitAvg,
        splitOps,
        splitPa,
        seasonAvg,
        seasonOps,
        recentAvg,
        recentOps
      }
    })
    .filter((entry) => Number(entry.splitPa || 0) >= 10 && (Number.isFinite(entry.splitAvg) || Number.isFinite(entry.splitOps)))
    .sort((left, right) => left.slot - right.slot)

  if (!entries.length) return null

  const weightedEntries = entries.map((entry) => ({
    ...entry,
    splitWeight: clamp(Number(entry.splitPa || 0), 10, 140),
    splitReliability: clamp((Number(entry.splitPa || 0) - 8) / 42, 0.25, 1)
  }))
  const topSix = weightedEntries.filter((entry) => Number(entry.slot) <= 6)
  const splitAvgAverage = weightedAverageBy(weightedEntries, 'splitAvg', 'splitWeight')
  const splitOpsAverage = weightedAverageBy(weightedEntries, 'splitOps', 'splitWeight')
  const topSixSplitAvgAverage = weightedAverageBy(topSix, 'splitAvg', 'splitWeight')
  const topSixSplitOpsAverage = weightedAverageBy(topSix, 'splitOps', 'splitWeight')
  const strongSplitBats = weightedEntries.filter(
    (entry) =>
      Number(entry.splitPa || 0) >= 20 &&
      (Number(entry.splitOps) >= 0.8 || Number(entry.splitAvg) >= 0.285)
  )
  const weakSplitBats = weightedEntries.filter(
    (entry) =>
      Number(entry.splitPa || 0) >= 20 &&
      (Number(entry.splitOps) <= 0.65 || Number(entry.splitAvg) <= 0.22)
  )
  const severeWeakSplitBats = weightedEntries.filter(
    (entry) =>
      Number(entry.splitPa || 0) >= 25 &&
      (Number(entry.splitOps) <= 0.58 || Number(entry.splitAvg) <= 0.195)
  )
  const topSixStrongSplitCount = strongSplitBats.filter((entry) => Number(entry.slot) <= 6).length
  const topSixWeakSplitCount = weakSplitBats.filter((entry) => Number(entry.slot) <= 6).length
  const topThirdStrongSplitCount = strongSplitBats.filter((entry) => Number(entry.slot) <= 3).length
  const topThirdWeakSplitCount = weakSplitBats.filter((entry) => Number(entry.slot) <= 3).length
  const index = clamp(
    50 +
      (Number(splitAvgAverage || 0.245) - 0.245) * 135 +
      (Number(splitOpsAverage || 0.72) - 0.72) * 42 +
      (strongSplitBats.length - 3) * 3.1 +
      (topSixStrongSplitCount - 2) * 2 +
      topThirdStrongSplitCount * 1.4 -
      Math.max(weakSplitBats.length - 2, 0) * 2.8 -
      topSixWeakSplitCount * 1.5 -
      topThirdWeakSplitCount * 1.2 -
      severeWeakSplitBats.length * 2.5,
    18,
    96
  )
  const label =
    index >= 62
      ? 'strong handedness split lane'
      : index <= 42
        ? 'weak handedness split lane'
        : 'mixed handedness split lane'
  const mapBatter = (entry) => ({
    name: entry.name,
    slot: entry.slot,
    bats: entry.bats,
    plateAppearances: entry.splitPa,
    avg: Number.isFinite(entry.splitAvg) ? Number(entry.splitAvg.toFixed(3)) : null,
    ops: Number.isFinite(entry.splitOps) ? Number(entry.splitOps.toFixed(3)) : null,
    seasonAvg: Number.isFinite(entry.seasonAvg) ? Number(entry.seasonAvg.toFixed(3)) : null,
    seasonOps: Number.isFinite(entry.seasonOps) ? Number(entry.seasonOps.toFixed(3)) : null,
    recentAvg: Number.isFinite(entry.recentAvg) ? Number(entry.recentAvg.toFixed(3)) : null,
    recentOps: Number.isFinite(entry.recentOps) ? Number(entry.recentOps.toFixed(3)) : null
  })
  const strongRows = strongSplitBats
    .slice()
    .sort((left, right) => Number(right.splitOps || 0) - Number(left.splitOps || 0))
  const weakRows = weakSplitBats
    .slice()
    .sort((left, right) => Number(left.splitOps || 0) - Number(right.splitOps || 0))
  const reasons = [
    strongRows[0]
      ? `${strongRows[0].name} ${formatSplitRate(strongRows[0].ops ?? strongRows[0].splitOps)} OPS vs ${opposingStarterHand || 'starter hand'}`
      : null,
    strongRows[1]
      ? `${strongRows[1].name} ${formatSplitRate(strongRows[1].ops ?? strongRows[1].splitOps)} OPS vs ${opposingStarterHand || 'starter hand'}`
      : null,
    weakRows[0]
      ? `${weakRows[0].name} ${formatSplitRate(weakRows[0].ops ?? weakRows[0].splitOps)} OPS vs ${opposingStarterHand || 'starter hand'}`
      : null,
    weakRows.length >= 3 ? `${weakRows.length} lineup bats carry weak split rows` : null
  ].filter(Boolean)

  return {
    source: 'lineup split rows',
    teamName,
    opposingStarterHand,
    index: roundToTenths(index),
    label,
    splitCount: weightedEntries.length,
    strongSplitCount: strongSplitBats.length,
    weakSplitCount: weakSplitBats.length,
    severeWeakSplitCount: severeWeakSplitBats.length,
    topSixStrongSplitCount,
    topSixWeakSplitCount,
    topThirdStrongSplitCount,
    topThirdWeakSplitCount,
    splitAvgAverage: Number.isFinite(splitAvgAverage) ? Number(splitAvgAverage.toFixed(3)) : null,
    splitOpsAverage: Number.isFinite(splitOpsAverage) ? Number(splitOpsAverage.toFixed(3)) : null,
    topSixSplitAvgAverage: Number.isFinite(topSixSplitAvgAverage) ? Number(topSixSplitAvgAverage.toFixed(3)) : null,
    topSixSplitOpsAverage: Number.isFinite(topSixSplitOpsAverage) ? Number(topSixSplitOpsAverage.toFixed(3)) : null,
    strongSplitBats: strongRows.slice(0, 5).map(mapBatter),
    weakSplitBats: weakRows.slice(0, 5).map(mapBatter),
    reasons
  }
}

const normalizeExistingHandednessSplitProfile = (lineupProfile = null) => {
  const source = lineupProfile?.handednessSplitProfile ?? null
  const index = numberOrNull(source?.index ?? lineupProfile?.handednessSplitIndex)
  if (!Number.isFinite(index)) return null

  return {
    source: source?.source || 'lineup context',
    teamName: source?.teamName || lineupProfile?.teamName || '',
    opposingStarterHand: source?.opposingStarterHand || lineupProfile?.opposingStarterHand || '',
    index,
    label: source?.label || lineupProfile?.handednessSplitLabel || 'handedness split lane',
    splitCount: numberOrNull(source?.splitCount ?? lineupProfile?.handednessSplitCount) ?? null,
    strongSplitCount: numberOrNull(source?.strongSplitCount ?? lineupProfile?.strongSplitCount) ?? 0,
    weakSplitCount: numberOrNull(source?.weakSplitCount ?? lineupProfile?.weakSplitCount) ?? 0,
    severeWeakSplitCount: numberOrNull(source?.severeWeakSplitCount ?? lineupProfile?.severeWeakSplitCount) ?? 0,
    topSixStrongSplitCount: numberOrNull(source?.topSixStrongSplitCount ?? lineupProfile?.topSixStrongSplitCount) ?? 0,
    topSixWeakSplitCount: numberOrNull(source?.topSixWeakSplitCount ?? lineupProfile?.topSixWeakSplitCount) ?? 0,
    topThirdStrongSplitCount: numberOrNull(source?.topThirdStrongSplitCount ?? lineupProfile?.topThirdStrongSplitCount) ?? 0,
    topThirdWeakSplitCount: numberOrNull(source?.topThirdWeakSplitCount ?? lineupProfile?.topThirdWeakSplitCount) ?? 0,
    splitAvgAverage: numberOrNull(source?.splitAvgAverage ?? lineupProfile?.splitAvgAverage),
    splitOpsAverage: numberOrNull(source?.splitOpsAverage ?? lineupProfile?.splitOpsAverage),
    topSixSplitAvgAverage: numberOrNull(source?.topSixSplitAvgAverage ?? lineupProfile?.topSixSplitAvgAverage),
    topSixSplitOpsAverage: numberOrNull(source?.topSixSplitOpsAverage ?? lineupProfile?.topSixSplitOpsAverage),
    strongSplitBats: Array.isArray(source?.strongSplitBats) ? source.strongSplitBats : [],
    weakSplitBats: Array.isArray(source?.weakSplitBats) ? source.weakSplitBats : [],
    reasons: Array.isArray(source?.reasons)
      ? source.reasons
      : Array.isArray(lineupProfile?.handednessSplitReasons)
        ? lineupProfile.handednessSplitReasons
        : []
  }
}

const enrichLineupProfileWithHandednessSplits = ({
  lineupProfile = null,
  lineupBoardSide = null,
  opposingStarter = null
} = {}) => {
  const boardProfile = buildLineupHandednessSplitProfile({
    lineup: Array.isArray(lineupBoardSide?.lineup) ? lineupBoardSide.lineup : [],
    teamName: lineupBoardSide?.teamName || lineupProfile?.teamName || '',
    opposingStarterHand:
      lineupBoardSide?.opposingStarter?.hand ||
      lineupBoardSide?.opposingStarter?.handedness ||
      opposingStarter?.handedness ||
      ''
  })
  const existingProfile = normalizeExistingHandednessSplitProfile(lineupProfile)
  const handednessSplitProfile = boardProfile || existingProfile

  if (!lineupProfile && !handednessSplitProfile) return null
  if (!handednessSplitProfile) return lineupProfile

  return {
    ...(lineupProfile || {}),
    handednessSplitProfile,
    handednessSplitIndex: handednessSplitProfile.index,
    handednessSplitLabel: handednessSplitProfile.label,
    handednessSplitCount: handednessSplitProfile.splitCount,
    strongSplitCount: handednessSplitProfile.strongSplitCount,
    weakSplitCount: handednessSplitProfile.weakSplitCount,
    severeWeakSplitCount: handednessSplitProfile.severeWeakSplitCount,
    topSixStrongSplitCount: handednessSplitProfile.topSixStrongSplitCount,
    topSixWeakSplitCount: handednessSplitProfile.topSixWeakSplitCount,
    topThirdStrongSplitCount: handednessSplitProfile.topThirdStrongSplitCount,
    topThirdWeakSplitCount: handednessSplitProfile.topThirdWeakSplitCount,
    splitAvgAverage: handednessSplitProfile.splitAvgAverage,
    splitOpsAverage: handednessSplitProfile.splitOpsAverage,
    topSixSplitAvgAverage: handednessSplitProfile.topSixSplitAvgAverage,
    topSixSplitOpsAverage: handednessSplitProfile.topSixSplitOpsAverage,
    handednessSplitReasons: handednessSplitProfile.reasons
  }
}

const buildFicDailyMatchupTotalContext = (ficDailyMatchupContext = null) => {
  if (!ficDailyMatchupContext) return null

  const rowCount = numberOrNull(ficDailyMatchupContext.rowCount) ?? 0
  if (!rowCount) return null

  const maxHrForce = numberOrNull(ficDailyMatchupContext.maxHrForce)
  const averageHrForce = numberOrNull(ficDailyMatchupContext.averageHrForce)
  const hrForce = maxHrForce ?? averageHrForce
  const highHrForceRows = numberOrNull(ficDailyMatchupContext.highHrForceRows) ?? 0
  const extremeHrForceRows = numberOrNull(ficDailyMatchupContext.extremeHrForceRows) ?? 0
  const highHrForceSharePct = numberOrNull(ficDailyMatchupContext.highHrForceSharePct)
  const qualityAbPct = numberOrNull(ficDailyMatchupContext.qualityAbPct)
  const hardHitPct = numberOrNull(ficDailyMatchupContext.hardHitPct)
  const highHrForce =
    Number.isFinite(hrForce) &&
    hrForce >= 1.4 &&
    (highHrForceRows >= 2 || Number(highHrForceSharePct || 0) >= 20 || rowCount <= 3)
  const extremeHrForce = Number.isFinite(hrForce) && hrForce >= 1.7 && extremeHrForceRows >= 1
  const runLift =
    highHrForce ||
    Number(qualityAbPct || 0) >= 44 ||
    Number(hardHitPct || 0) >= 42
  const matchupRunDelta = highHrForce
    ? clamp(
        (Number(hrForce || 1.4) - 1.35) * 0.62 +
          Math.max(Number(highHrForceSharePct || 0) - 25, 0) * 0.004,
        0.12,
        extremeHrForce ? 0.55 : 0.42
      )
    : 0
  const hitDelta = clamp(
    (highHrForce ? 0.08 : 0) +
      Math.max(Number(qualityAbPct || 0) - 40, 0) * 0.006 +
      Math.max(Number(hardHitPct || 0) - 36, 0) * 0.004,
    0,
    0.26
  )

  return {
    source: ficDailyMatchupContext.source || 'FantasyInfoCentral Daily Matchups',
    sourceStatus: ficDailyMatchupContext.sourceStatus || 'warehouse',
    rowCount,
    hrForce,
    maxHrForce,
    averageHrForce,
    highHrForce,
    extremeHrForce,
    highHrForceRows,
    extremeHrForceRows,
    highHrForceSharePct,
    qualityAbPct,
    hardHitPct,
    runLift,
    matchupRunDelta,
    hitDelta,
    reason: highHrForce && Number.isFinite(hrForce)
      ? `FIC Daily Matchups HRForce ${roundToTenths(hrForce)} raises run carry`
      : runLift
        ? 'FIC Daily Matchups contact quality adds run carry'
        : null
  }
}

const buildEnvironmentTotalContext = (environmentAdjustmentContext = null, weatherProfile = null) => {
  if (!environmentAdjustmentContext) return null

  const rawHrForce = numberOrNull(environmentAdjustmentContext.weather?.hrForce)
  const effectiveHrForce = numberOrNull(environmentAdjustmentContext.weather?.effectiveHrForce)
  const gameTimeHrForce = numberOrNull(environmentAdjustmentContext.weather?.gameTimeHrForce)
  const earlyGameMaxHrForce = numberOrNull(environmentAdjustmentContext.weather?.earlyGameMaxHrForce)
  const lateGameMaxHrForce = numberOrNull(environmentAdjustmentContext.weather?.lateGameMaxHrForce)
  const hrForcePersistenceSignal = environmentAdjustmentContext.weather?.hrForcePersistenceSignal || null
  const startsEveningOrNight = Boolean(
    environmentAdjustmentContext.visibility?.eveningLocalStart ||
      environmentAdjustmentContext.visibility?.nightLocalStart ||
      Number(environmentAdjustmentContext.visibility?.localStartHour) >= 18
  )
  const gameWindowHrForce = earlyGameMaxHrForce ?? gameTimeHrForce
  const hrForce = startsEveningOrNight && Number.isFinite(gameWindowHrForce)
    ? gameWindowHrForce
    : effectiveHrForce ?? rawHrForce
  const signal = `${environmentAdjustmentContext.weather?.signal || environmentAdjustmentContext.signal || ''}`.toLowerCase()
  const isDome =
    Boolean(weatherProfile?.isDome) ||
    /dome|closed|n\/a|not.?applicable/.test(signal)
  const expectedTotalRunsDelta = numberOrNull(environmentAdjustmentContext.expected?.totalRunsDelta) ?? 0
  const expectedHitsDelta = numberOrNull(environmentAdjustmentContext.expected?.hitsDelta) ?? 0
  const expectedHrDelta = numberOrNull(environmentAdjustmentContext.expected?.hrDelta) ?? 0
  const weatherRunDelta = numberOrNull(environmentAdjustmentContext.weather?.runDelta) ?? 0
  const weatherHrDelta = numberOrNull(environmentAdjustmentContext.weather?.hrDelta) ?? 0
  const runsMultiplier = numberOrNull(environmentAdjustmentContext.visibility?.runsMultiplier) ?? 1
  const hitsMultiplier = numberOrNull(environmentAdjustmentContext.visibility?.hitsMultiplier) ?? 1
  const hrMultiplier = numberOrNull(environmentAdjustmentContext.visibility?.hrMultiplier) ?? 1
  const weakGameTimeCarry =
    startsEveningOrNight &&
    Number.isFinite(effectiveHrForce) &&
    effectiveHrForce >= 1.4 &&
    Number.isFinite(gameWindowHrForce) &&
    gameWindowHrForce < 1.4
  const carryFades = /early_carry_fades|early_only_carry/.test(String(hrForcePersistenceSignal))
  const weakOrFadingGameTimeCarry = weakGameTimeCarry || carryFades
  const highHrForce = Number.isFinite(hrForce) && hrForce >= 1.4 && !isDome && !weakGameTimeCarry
  const lowerWeatherCarry =
    isDome ||
    !Number.isFinite(hrForce) ||
    hrForce < 1.4
  const runLift =
    expectedTotalRunsDelta >= 0.35 ||
    weatherRunDelta >= 0.25 ||
    runsMultiplier >= 1.04
  const runDrag =
    expectedTotalRunsDelta <= -0.35 ||
    weatherRunDelta <= -0.25 ||
    runsMultiplier <= 0.96
  const hrLift =
    highHrForce ||
    expectedHrDelta >= 0.18 ||
    weatherHrDelta >= 0.12 ||
    hrMultiplier >= 1.08

  return {
    modelVersion: environmentAdjustmentContext.modelVersion || null,
    signal: environmentAdjustmentContext.signal || null,
    isDome,
    hrForce,
    rawHrForce,
    effectiveHrForce,
    gameTimeHrForce,
    earlyGameMaxHrForce,
    lateGameMaxHrForce,
    hrForcePersistenceSignal,
    startsEveningOrNight,
    weakGameTimeCarry,
    carryFades,
    weakOrFadingGameTimeCarry,
    highHrForce,
    lowerWeatherCarry,
    runLift,
    runDrag,
    hrLift,
    expectedTotalRunsDelta,
    expectedHitsDelta,
    expectedHrDelta,
    weatherRunDelta,
    weatherHrDelta,
    runsMultiplier,
    hitsMultiplier,
    hrMultiplier
  }
}

const buildEnvironmentFirstInningContext = (
  environmentAdjustmentContext = null,
  weatherProfile = null,
  ficDailyMatchupContext = null
) => {
  const envTotalContext = buildEnvironmentTotalContext(environmentAdjustmentContext, weatherProfile)
  const ficTotalContext = buildFicDailyMatchupTotalContext(ficDailyMatchupContext)
  if (!envTotalContext && !ficTotalContext) return null

  const hrForce = Math.max(
    numberOrNull(envTotalContext?.hrForce) ?? -Infinity,
    numberOrNull(ficTotalContext?.hrForce) ?? -Infinity
  )
  const effectiveHrForce = Number.isFinite(hrForce) ? hrForce : null
  const highHrForce = Boolean(envTotalContext?.highHrForce || (ficTotalContext?.highHrForce && !envTotalContext?.weakGameTimeCarry))
  const materialHrForce = highHrForce && Number(effectiveHrForce || 0) >= 1.5
  const extremeHrForce = highHrForce && Number(effectiveHrForce || 0) >= 1.7
  const carryLift =
    highHrForce && Number.isFinite(effectiveHrForce)
      ? clamp(
          (effectiveHrForce - 1.35) * 0.16 + (materialHrForce ? 0.014 : 0),
          0.018,
          extremeHrForce ? 0.115 : materialHrForce ? 0.085 : 0.06
        )
      : envTotalContext?.runLift || envTotalContext?.hrLift || ficTotalContext?.runLift
        ? 0.014
        : 0
  const runDeltaLift = clamp(Number(envTotalContext?.expectedTotalRunsDelta || 0) * 0.018, -0.012, 0.018)
  const visibilityLift = clamp((Number(envTotalContext?.runsMultiplier || 1) - 1) * 0.12, -0.018, 0.018)
  const ficLift = clamp(Number(ficTotalContext?.matchupRunDelta || 0) * 0.035, 0, 0.02)
  const weakGameTimeCarryDrag = envTotalContext?.weakGameTimeCarry ? -0.018 : 0
  const probabilityLift = clamp(
    carryLift + runDeltaLift + visibilityLift + ficLift + weakGameTimeCarryDrag,
    -0.02,
    extremeHrForce ? 0.13 : materialHrForce ? 0.105 : 0.09
  )
  const projectedRunsLift = clamp(
    probabilityLift * 0.9 +
      Number(envTotalContext?.expectedTotalRunsDelta || 0) * 0.012 +
      Number(ficTotalContext?.matchupRunDelta || 0) * 0.018 +
      (envTotalContext?.weakGameTimeCarry ? -0.02 : 0),
    -0.025,
    extremeHrForce ? 0.18 : materialHrForce ? 0.14 : 0.105
  )
  const reasons = [
    envTotalContext?.weakGameTimeCarry && Number.isFinite(envTotalContext.gameTimeHrForce ?? envTotalContext.earlyGameMaxHrForce)
      ? `ENV1 game-time HRForce ${roundToTenths(envTotalContext.earlyGameMaxHrForce ?? envTotalContext.gameTimeHrForce)} weakens the daily carry signal for this evening start`
      : null,
    envTotalContext?.carryFades && Number.isFinite(envTotalContext.hrForce)
      ? `ENV1 first-pitch HRForce ${roundToTenths(envTotalContext.hrForce)} is early carry only, so do not stretch it into a full-game signal`
      : null,
    envTotalContext?.highHrForce && Number.isFinite(envTotalContext.hrForce)
      ? `ENV1 HRForce ${roundToTenths(envTotalContext.hrForce)} raises YRFI carry`
      : envTotalContext?.runLift
        ? `ENV1 run environment adds first-inning carry`
        : envTotalContext?.runDrag
          ? `ENV1 run environment suppresses first-inning carry`
          : null,
    ficTotalContext?.reason
  ].filter(Boolean)

  return {
    ...(envTotalContext || {}),
    ficDailyMatchup: ficTotalContext,
    hrForce: effectiveHrForce,
    highHrForce,
    materialHrForce,
    extremeHrForce,
    probabilityLift,
    projectedRunsLift,
    reason: reasons[0] || null,
    reasons
  }
}

const buildCarryAdjustmentContext = ({
  environmentAdjustmentContext = null,
  weatherProfile = null,
  ficDailyMatchupContext = null
} = {}) => {
  const envTotalContext = buildEnvironmentTotalContext(environmentAdjustmentContext, weatherProfile)
  const ficTotalContext = buildFicDailyMatchupTotalContext(ficDailyMatchupContext)
  if (!envTotalContext && !ficTotalContext) return null

  const envHrForce = numberOrNull(envTotalContext?.hrForce)
  const ficHrForce = numberOrNull(ficTotalContext?.hrForce)
  const hrForce = Math.max(envHrForce ?? -Infinity, ficHrForce ?? -Infinity)
  const effectiveHrForce = Number.isFinite(hrForce) ? hrForce : null
  const isDome = Boolean(envTotalContext?.isDome || weatherProfile?.isDome)
  const carryFades = Boolean(envTotalContext?.carryFades)
  const environmentCarry = Boolean(envTotalContext?.highHrForce && !isDome && !carryFades)
  const transientEnvironmentCarry = Boolean(envTotalContext?.highHrForce && !isDome && carryFades)
  const matchupCarry = Boolean(ficTotalContext?.highHrForce && !envTotalContext?.weakOrFadingGameTimeCarry)
  const highHrForce = environmentCarry || transientEnvironmentCarry || matchupCarry
  const materialHrForce = highHrForce && Number(effectiveHrForce || 0) >= 1.5 && !carryFades
  const extremeHrForce = highHrForce && Number(effectiveHrForce || 0) >= 1.7 && !carryFades
  const weatherCarry =
    !isDome &&
    (
      environmentCarry ||
      Boolean(envTotalContext?.runLift || envTotalContext?.hrLift)
    )
  const lowerWeatherCarry = Boolean(envTotalContext?.lowerWeatherCarry && !matchupCarry)
  const rawMultiplier =
      extremeHrForce
        ? 1.25
        : materialHrForce
          ? 1.18
          : highHrForce
          ? carryFades
            ? 1.04
            : 1.08
          : envTotalContext?.runLift
            ? 1.04
            : 1
  const carryMultiplier = clamp(rawMultiplier, 1, 1.25)
  const envHitsDelta = Number(envTotalContext?.expectedHitsDelta || 0)
  const envRunsDelta = Number(envTotalContext?.expectedTotalRunsDelta || 0)
  const envHrDelta = Number(envTotalContext?.expectedHrDelta || 0)
  const ficHitDelta = Number(ficTotalContext?.hitDelta || 0)
  const ficRunDelta = Number(ficTotalContext?.matchupRunDelta || 0)
  const ficCarryHitDelta = matchupCarry ? ficHitDelta : 0
  const ficCarryRunDelta = matchupCarry ? ficRunDelta : 0
  const multiplierLift = carryMultiplier - 1
  const hitDelta = clamp(
    multiplierLift * 3.2 +
      Math.max(envHitsDelta, 0) * 0.22 +
      Math.max(envHrDelta, 0) * 0.28 +
      ficCarryHitDelta * 1.45,
    envTotalContext?.runDrag && !highHrForce ? -0.22 : 0,
    extremeHrForce ? 0.95 : materialHrForce ? 0.76 : 0.48
  )
  const runDelta = clamp(
    multiplierLift * 2.15 +
      Math.max(envRunsDelta, 0) * 0.26 +
      Math.max(envHrDelta, 0) * 0.2 +
      ficCarryRunDelta * 0.72,
    envTotalContext?.runDrag && !highHrForce ? -0.18 : 0,
    extremeHrForce ? 0.95 : materialHrForce ? 0.72 : 0.46
  )
  const conversionDelta = clamp(
    multiplierLift * 0.11 +
      Math.max(envRunsDelta, 0) * 0.0035 +
      ficCarryRunDelta * 0.006,
    envTotalContext?.runDrag && !highHrForce ? -0.006 : 0,
    extremeHrForce ? 0.036 : materialHrForce ? 0.028 : 0.016
  )
  const firstInningProbabilityLift = clamp(
    multiplierLift * 0.26 +
      Math.max(envRunsDelta, 0) * 0.012 +
      ficCarryRunDelta * 0.02,
    envTotalContext?.runDrag && !highHrForce ? -0.012 : 0,
    extremeHrForce ? 0.105 : materialHrForce ? 0.078 : 0.045
  )
  const underFragilityRuns = extremeHrForce ? 3 : materialHrForce ? 2.2 : highHrForce ? 1.35 : 0
  const reasons = [
    materialHrForce && effectiveHrForce
      ? `HRForce ${roundToTenths(effectiveHrForce)} applies material carry to pitcher damage and batter production`
      : highHrForce && effectiveHrForce
        ? carryFades
          ? `HRForce ${roundToTenths(effectiveHrForce)} is early carry only, so full-game damage is clipped`
          : `HRForce ${roundToTenths(effectiveHrForce)} adds carry risk`
        : null,
    weatherCarry ? 'weather/park carry is favorable for flight' : null,
    matchupCarry ? 'FIC batter-vs-pitcher pockets show HRForce carry' : null,
    isDome && !matchupCarry ? 'dome/weather N/A keeps weather carry neutral' : null,
    lowerWeatherCarry ? 'weather carry is low or unavailable, so it cannot support an under by itself' : null
  ].filter(Boolean)

  return {
    envTotalContext,
    ficTotalContext,
    hrForce: effectiveHrForce,
    envHrForce,
    ficHrForce,
    isDome,
    carryFades,
    highHrForce,
    materialHrForce,
    extremeHrForce,
    weatherCarry,
    matchupCarry,
    lowerWeatherCarry,
    carryMultiplier: Number(carryMultiplier.toFixed(2)),
    pitcherDamageMultiplier: Number(carryMultiplier.toFixed(2)),
    batterProductionMultiplier: Number(carryMultiplier.toFixed(2)),
    hitDelta,
    runDelta,
    conversionDelta,
    firstInningProbabilityLift,
    underFragilityRuns,
    reasons
  }
}

const buildStarterWeatherAdjustment = ({
  starter = null,
  weatherProfile = null,
  environmentAdjustmentContext = null,
  ficDailyMatchupContext = null
} = {}) => {
  if (!starter) return null

  const pitchMix = starter.pitchMixProfile || null
  const envTotalContext = buildEnvironmentTotalContext(environmentAdjustmentContext, weatherProfile)
  const ficTotalContext = buildFicDailyMatchupTotalContext(ficDailyMatchupContext)
  const envHrForce = numberOrNull(envTotalContext?.hrForce)
  const ficHrForce = numberOrNull(ficTotalContext?.hrForce)
  const hrForce = Math.max(envHrForce ?? -Infinity, ficHrForce ?? -Infinity)
  const effectiveHrForce = Number.isFinite(hrForce) ? hrForce : null
  const temperatureF = numberOrNull(weatherProfile?.temperatureF)
  const isDome = Boolean(envTotalContext?.isDome || weatherProfile?.isDome)
  const carryFades = Boolean(envTotalContext?.carryFades)
  const highHrForce = Boolean(envTotalContext?.highHrForce || (ficTotalContext?.highHrForce && !envTotalContext?.weakOrFadingGameTimeCarry))
  const materialHrForce = highHrForce && Number(effectiveHrForce || 0) >= 1.5 && !carryFades
  const extremeHrForce = highHrForce && Number(effectiveHrForce || 0) >= 1.7 && !carryFades
  const weatherCarry = Boolean(!isDome && (envTotalContext?.runLift || envTotalContext?.hrLift || envTotalContext?.highHrForce))
  const hotWeather = Number.isFinite(temperatureF)
    ? temperatureF >= 84
    : Boolean(weatherCarry && highHrForce)
  const extremeHeat = Number.isFinite(temperatureF) && temperatureF >= 94
  const coldWeather = Number.isFinite(temperatureF) && temperatureF <= 50 && !isDome
  const archetype = pitchMix?.archetype || 'unknown'
  const fastballShare = Number(pitchMix?.fastballShare)
  const spinShare = Number(pitchMix?.spinDependencyShare)
  const offspeedShare = Number(pitchMix?.offspeedShare)
  const hrPerNine = Number(starter?.hrPerNine)
  let hitDelta = 0
  let runDelta = 0
  let conversionDelta = 0
  let firstInningProbabilityDelta = 0
  let firstInningProjectedRunsDelta = 0
  let holdDelta = 0
  const reasons = []

  if (!weatherProfile && !envTotalContext && !ficTotalContext) {
    return {
      active: false,
      pitcherName: starter?.name || '',
      archetype,
      label: pitchMix?.label || 'Pitch mix unknown',
      pitchMix,
      temperatureF: null,
      hrForce: effectiveHrForce,
      isDome,
      hitDelta: 0,
      runDelta: 0,
      conversionDelta: 0,
      firstInningProbabilityDelta: 0,
      firstInningProjectedRunsDelta: 0,
      holdDelta: 0,
      reasons: []
    }
  }

  if (!isDome && (hotWeather || highHrForce)) {
    let carrySeverity =
      (hotWeather ? 1 : 0) +
      (extremeHeat ? 0.35 : 0) +
      (highHrForce ? 0.35 : 0) +
      (materialHrForce ? 0.25 : 0) +
      (extremeHrForce ? 0.25 : 0)
    if (carryFades) {
      carrySeverity *= 0.62
      reasons.push('night-game carry fades after the early window')
    }
    if (archetype === 'spin-heavy') {
      const spinLoad = Number.isFinite(spinShare) ? clamp((spinShare - 38) / 24, 0, 1) : 0.4
      hitDelta += 0.16 * carrySeverity + spinLoad * 0.12
      runDelta += 0.09 * carrySeverity + spinLoad * 0.08
      conversionDelta += 0.0028 * carrySeverity + spinLoad * 0.0035
      firstInningProbabilityDelta += 0.008 * carrySeverity + spinLoad * 0.009
      firstInningProjectedRunsDelta += 0.025 * carrySeverity + spinLoad * 0.025
      holdDelta -= 2.2 * carrySeverity + spinLoad * 2.4
      reasons.push('spin-heavy arsenal gets a hot/carry grip-and-shape tax')
    } else if (archetype === 'fastball-heavy' || archetype === 'fastball-leaning') {
      const fastballLoad = Number.isFinite(fastballShare) ? clamp((fastballShare - 46) / 26, 0, 1) : 0.45
      const recentHrLeak = Number.isFinite(hrPerNine) && hrPerNine >= 1.15
      const benefit = recentHrLeak && extremeHrForce ? 0.25 : 1
      hitDelta -= (0.07 * carrySeverity + fastballLoad * 0.06) * benefit
      runDelta -= (0.035 * carrySeverity + fastballLoad * 0.035) * benefit
      conversionDelta -= (0.0014 * carrySeverity + fastballLoad * 0.0015) * benefit
      firstInningProbabilityDelta -= (0.004 * carrySeverity + fastballLoad * 0.004) * benefit
      firstInningProjectedRunsDelta -= (0.012 * carrySeverity + fastballLoad * 0.012) * benefit
      holdDelta += (1.2 * carrySeverity + fastballLoad * 1.4) * benefit
      if (recentHrLeak && extremeHrForce) {
        hitDelta += 0.06
        runDelta += 0.04
        conversionDelta += 0.001
        firstInningProbabilityDelta += 0.003
        holdDelta -= 0.8
        reasons.push('fastball warm-weather benefit is capped by recent HR leakage in extreme carry')
      } else {
        reasons.push('fastball-heavy/leaning arsenal gets a warm-up/velocity weather credit')
      }
    } else if (archetype === 'offspeed-heavy') {
      const offspeedLoad = Number.isFinite(offspeedShare) ? clamp((offspeedShare - 30) / 24, 0, 1) : 0.3
      hitDelta += 0.035 * carrySeverity + offspeedLoad * 0.035
      runDelta += 0.025 * carrySeverity + offspeedLoad * 0.025
      conversionDelta += 0.001 * carrySeverity
      firstInningProbabilityDelta += 0.003 * carrySeverity
      holdDelta -= 0.8 * carrySeverity
      reasons.push('offspeed-heavy arsenal gets a small carry-weather tax')
    }
  } else if (coldWeather) {
    if (archetype === 'fastball-heavy' || archetype === 'fastball-leaning') {
      hitDelta += 0.08
      runDelta += 0.045
      conversionDelta += 0.0015
      firstInningProbabilityDelta += 0.005
      firstInningProjectedRunsDelta += 0.015
      holdDelta -= 1.5
      reasons.push('cold weather trims the fastball warm-up edge')
    } else if (archetype === 'spin-heavy') {
      hitDelta -= 0.06
      runDelta -= 0.035
      conversionDelta -= 0.0012
      firstInningProbabilityDelta -= 0.004
      firstInningProjectedRunsDelta -= 0.012
      holdDelta += 1.2
      reasons.push('cold weather supports spin-heavy pitch shape')
    }
  } else if (isDome) {
    reasons.push('dome/stable environment keeps pitcher-weather archetype neutral')
  }

  hitDelta = clamp(hitDelta, -0.34, 0.48)
  runDelta = clamp(runDelta, -0.2, 0.34)
  conversionDelta = clamp(conversionDelta, -0.006, 0.012)
  firstInningProbabilityDelta = clamp(firstInningProbabilityDelta, -0.018, 0.04)
  firstInningProjectedRunsDelta = clamp(firstInningProjectedRunsDelta, -0.045, 0.11)
  holdDelta = clamp(holdDelta, -7, 5)
  const active =
    Math.abs(hitDelta) >= 0.035 ||
    Math.abs(runDelta) >= 0.025 ||
    Math.abs(conversionDelta) >= 0.001 ||
    Math.abs(firstInningProbabilityDelta) >= 0.003 ||
    Math.abs(holdDelta) >= 0.7

  return {
    active,
    pitcherName: starter?.name || '',
    archetype,
    label: pitchMix?.label || 'Pitch mix unknown',
    pitchMix,
    temperatureF,
    hrForce: effectiveHrForce,
    highHrForce,
    materialHrForce,
    extremeHrForce,
    isDome,
    carryFades,
    hotWeather,
    coldWeather,
    weatherCarry,
    hitDelta,
    runDelta,
    conversionDelta,
    firstInningProbabilityDelta,
    firstInningProjectedRunsDelta,
    holdDelta,
    reasons
  }
}

const buildAvailableReliefAdjustmentContext = (context = null) => {
  if (!context) return null

  const projectedReliefRunsAllowed = numberOrNull(context.projectedReliefRunsAllowed)
  const projectedReliefOuts = numberOrNull(context.projectedReliefOuts)
  const projectedRelieversUsed = numberOrNull(context.projectedRelieversUsed)
  const bridgeStressScore = numberOrNull(context.bridgeStressScore)
  const fatigueScore = numberOrNull(context.fatigueScore)
  const leverageAvailabilityScore = numberOrNull(context.leverageAvailabilityScore)
  const qualityScore = numberOrNull(context.qualityScore)
  const topTwoSharePct = numberOrNull(context.topTwoSharePct)
  const leadAvailabilityScore = numberOrNull(context.lead?.availabilityScore)
  const leadExpectedOuts = numberOrNull(context.lead?.expectedOuts)
  const runRiskTier = `${context.runRiskTier || ''}`.toLowerCase()
  const expectedEarlyBridge = Number(projectedReliefOuts || 0) >= 11 || Number(leadExpectedOuts || 0) >= 4
  const leverageAvailabilityPenalty = Number.isFinite(leverageAvailabilityScore)
    ? clamp((58 - leverageAvailabilityScore) * 0.010, -0.16, 0.34)
    : 0
  const leadAvailabilityPenalty = Number.isFinite(leadAvailabilityScore)
    ? clamp((58 - leadAvailabilityScore) * 0.006, -0.08, 0.24)
    : 0
  const fatiguePenalty = Number.isFinite(fatigueScore)
    ? clamp((fatigueScore - 50) * 0.006, -0.1, 0.28)
    : 0
  const stressPenalty = Number.isFinite(bridgeStressScore)
    ? clamp((bridgeStressScore - 52) * 0.009, -0.12, 0.32)
    : 0
  const qualityPenalty = Number.isFinite(qualityScore)
    ? clamp((55 - qualityScore) * 0.008, -0.16, 0.28)
    : 0
  const topHeavyPenalty =
    Number.isFinite(topTwoSharePct) && topTwoSharePct >= 62 && Number(leverageAvailabilityScore || 100) < 58
      ? clamp((topTwoSharePct - 60) * 0.006, 0.02, 0.16)
      : 0
  const relieverCountPenalty = Number.isFinite(projectedRelieversUsed)
    ? clamp((projectedRelieversUsed - 3) * 0.045, -0.08, 0.18)
    : 0
  const tierPenalty =
    /taxed/.test(runRiskTier)
      ? 0.22
      : /watch/.test(runRiskTier)
        ? 0.12
        : /fresh/.test(runRiskTier)
          ? -0.1
          : 0
  const availabilityRunDelta = clamp(
    leverageAvailabilityPenalty +
      leadAvailabilityPenalty +
      fatiguePenalty +
      stressPenalty +
      qualityPenalty +
      topHeavyPenalty +
      relieverCountPenalty +
      tierPenalty,
    -0.28,
    0.78
  )
  const adjustedProjectedReliefRunsAllowed = Number.isFinite(projectedReliefRunsAllowed)
    ? clamp(projectedReliefRunsAllowed + availabilityRunDelta, 0.65, 3.65)
    : null
  const baseRunEdge = Number.isFinite(adjustedProjectedReliefRunsAllowed)
    ? adjustedProjectedReliefRunsAllowed - 1.75
    : availabilityRunDelta
  const hitDelta = clamp(
    baseRunEdge * 0.28 +
      Math.max(bridgeStressScore ?? 52, 52) * 0.002 +
      Math.max(58 - Number(leverageAvailabilityScore ?? 58), 0) * 0.006,
    -0.28,
    0.72
  )
  const runDelta = clamp(baseRunEdge * 0.36 + availabilityRunDelta * 0.45, -0.32, 0.9)
  const conversionDelta = clamp(baseRunEdge * 0.012 + availabilityRunDelta * 0.01, -0.012, 0.04)
  const highAvailableBullpenRisk =
    Number(runDelta) >= 0.28 ||
    Number(bridgeStressScore || 0) >= 64 ||
    Number(leverageAvailabilityScore || 100) <= 42 ||
    /taxed/.test(runRiskTier)
  const reasons = [
    Number.isFinite(projectedReliefRunsAllowed)
      ? `RP2 available-pen runs ${roundToTenths(projectedReliefRunsAllowed)} -> ${adjustedProjectedReliefRunsAllowed != null ? roundToTenths(adjustedProjectedReliefRunsAllowed) : 'n/a'}`
      : null,
    Number.isFinite(leverageAvailabilityScore) && leverageAvailabilityScore <= 50
      ? `leverage availability ${roundToTenths(leverageAvailabilityScore)}/100`
      : null,
    Number.isFinite(leadAvailabilityScore) && leadAvailabilityScore <= 50
      ? `lead reliever availability ${roundToTenths(leadAvailabilityScore)}/100`
      : null,
    Number.isFinite(bridgeStressScore) && bridgeStressScore >= 60
      ? `bridge stress ${roundToTenths(bridgeStressScore)}`
      : null,
    /taxed|watch/.test(runRiskTier) ? `run-risk tier ${context.runRiskTier}` : null
  ].filter(Boolean)

  return {
    projectedReliefRunsAllowed,
    adjustedProjectedReliefRunsAllowed,
    projectedReliefOuts,
    projectedRelieversUsed,
    bridgeStressScore,
    fatigueScore,
    leverageAvailabilityScore,
    qualityScore,
    topTwoSharePct,
    leadAvailabilityScore,
    leadExpectedOuts,
    runRiskTier: context.runRiskTier || null,
    expectedEarlyBridge,
    availabilityRunDelta,
    hitDelta,
    runDelta,
    conversionDelta,
    highAvailableBullpenRisk,
    reasons
  }
}

const buildReliefProjectionTotalContext = (reliefProjectionContexts = []) => {
  const sides = reliefProjectionContexts
    .filter(Boolean)
    .map((context) => {
      const availableRelief = buildAvailableReliefAdjustmentContext(context)
      const projectedReliefRunsAllowed = numberOrNull(context.projectedReliefRunsAllowed)
      const projectedReliefOuts = numberOrNull(context.projectedReliefOuts)
      const bridgeStressScore = numberOrNull(context.bridgeStressScore)
      const fatigueScore = numberOrNull(context.fatigueScore)
      const leverageAvailabilityScore = numberOrNull(context.leverageAvailabilityScore)
      const qualityScore = numberOrNull(context.qualityScore)

      return {
        teamName: context.teamName || null,
        projectedReliefRunsAllowed,
        adjustedProjectedReliefRunsAllowed: availableRelief?.adjustedProjectedReliefRunsAllowed ?? projectedReliefRunsAllowed,
        projectedReliefOuts,
        bridgeStressScore,
        fatigueScore,
        leverageAvailabilityScore,
        qualityScore,
        runRiskTier: context.runRiskTier || null,
        availabilityRunDelta: availableRelief?.availabilityRunDelta ?? 0,
        availableRelief
      }
    })

  if (!sides.length) return null

  const projectedRuns = sides
    .map((side) => side.adjustedProjectedReliefRunsAllowed ?? side.projectedReliefRunsAllowed)
    .filter(Number.isFinite)
  const projectedOuts = sides
    .map((side) => side.projectedReliefOuts)
    .filter(Number.isFinite)
  const bridgeStress = sides
    .map((side) => side.bridgeStressScore)
    .filter(Number.isFinite)
  const fatigueScores = sides
    .map((side) => side.fatigueScore)
    .filter(Number.isFinite)
  const qualityScores = sides
    .map((side) => side.qualityScore)
    .filter(Number.isFinite)
  const availabilityScores = sides
    .map((side) => side.leverageAvailabilityScore)
    .filter(Number.isFinite)
  const taxedBridgeCount = sides.filter((side) => /taxed|watch/i.test(side.runRiskTier || '')).length
  const highAvailableBullpenRiskCount = sides.filter((side) => side.availableRelief?.highAvailableBullpenRisk).length
  const maxProjectedReliefRunsAllowed = projectedRuns.length ? Math.max(...projectedRuns) : null
  const combinedProjectedReliefRunsAllowed = projectedRuns.length ? projectedRuns.reduce((sum, value) => sum + value, 0) : null
  const maxProjectedReliefOuts = projectedOuts.length ? Math.max(...projectedOuts) : null
  const maxBridgeStressScore = bridgeStress.length ? Math.max(...bridgeStress) : null
  const maxFatigueScore = fatigueScores.length ? Math.max(...fatigueScores) : null
  const minQualityScore = qualityScores.length ? Math.min(...qualityScores) : null
  const minLeverageAvailabilityScore = availabilityScores.length ? Math.min(...availabilityScores) : null
  const highLateRunRisk =
    (Number.isFinite(maxBridgeStressScore) && maxBridgeStressScore >= 64) ||
    (Number.isFinite(maxProjectedReliefRunsAllowed) && maxProjectedReliefRunsAllowed >= 2.25) ||
    (Number.isFinite(combinedProjectedReliefRunsAllowed) && combinedProjectedReliefRunsAllowed >= 4.25) ||
    taxedBridgeCount > 0 ||
    highAvailableBullpenRiskCount > 0
  const watchLateRunRisk =
    highLateRunRisk ||
    (Number.isFinite(maxBridgeStressScore) && maxBridgeStressScore >= 56) ||
    (Number.isFinite(maxProjectedReliefRunsAllowed) && maxProjectedReliefRunsAllowed >= 2.0) ||
    (Number.isFinite(maxFatigueScore) && maxFatigueScore >= 62) ||
    (Number.isFinite(minQualityScore) && minQualityScore <= 42) ||
    (Number.isFinite(minLeverageAvailabilityScore) && minLeverageAvailabilityScore <= 48)

  return {
    sides,
    maxProjectedReliefRunsAllowed,
    combinedProjectedReliefRunsAllowed,
    maxProjectedReliefOuts,
    maxBridgeStressScore,
    maxFatigueScore,
    minQualityScore,
    minLeverageAvailabilityScore,
    taxedBridgeCount,
    highAvailableBullpenRiskCount,
    highLateRunRisk,
    watchLateRunRisk
  }
}

const buildRp2LateRunConversionDelta = (context = null) => {
  if (!context) return 0
  const availableRelief = buildAvailableReliefAdjustmentContext(context)

  const projectedReliefRunsAllowed = numberOrNull(context.projectedReliefRunsAllowed)
  const bridgeStressScore = numberOrNull(context.bridgeStressScore)
  const fatigueScore = numberOrNull(context.fatigueScore)
  const qualityScore = numberOrNull(context.qualityScore)
  const runRiskTier = `${context.runRiskTier || ''}`.toLowerCase()
  let delta = 0

  if (Number.isFinite(projectedReliefRunsAllowed)) {
    delta += (projectedReliefRunsAllowed - 1.75) * 0.009
  }
  if (Number.isFinite(bridgeStressScore)) {
    delta += (bridgeStressScore - 52) * 0.00045
  }
  if (Number.isFinite(fatigueScore)) {
    delta += (fatigueScore - 50) * 0.00028
  }
  if (Number.isFinite(qualityScore)) {
    delta -= (qualityScore - 55) * 0.00024
  }
  if (/taxed/.test(runRiskTier)) delta += 0.006
  else if (/fresh/.test(runRiskTier)) delta -= 0.004
  if (availableRelief) {
    delta += Number(availableRelief.conversionDelta || 0)
  }

  return clamp(delta, -0.024, 0.046)
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

const buildMlbStoryScore = (profile = {}) => {
  const offenseSustainability = Number(profile.offenseSustainability)
  const lineupMomentum = Number(profile.lineupMomentum)
  const starterTrajectory = Number(profile.starterTrajectory)
  const bullpenTrust = Number(profile.bullpenTrust)
  const callupEnergy = Number(profile.callupEnergy)
  const variance = Number(profile.variance)

  if (
    ![
      offenseSustainability,
      lineupMomentum,
      starterTrajectory,
      bullpenTrust,
      callupEnergy,
      variance
    ].every(Number.isFinite)
  ) {
    return null
  }

  return clamp(
    offenseSustainability * 0.34 +
      lineupMomentum * 0.24 +
      starterTrajectory * 0.16 +
      bullpenTrust * 0.14 +
      callupEnergy * 0.12 -
      Math.max(variance - 58, 0) * 0.28,
    18,
    92
  )
}

const buildMlbStorySignal = (game, participants) => {
  const awayContext = game.storyContext?.away
  const homeContext = game.storyContext?.home

  if (!awayContext || !homeContext || participants.length < 2) return null

  const scores = [buildMlbStoryScore(awayContext), buildMlbStoryScore(homeContext)]
  if (scores.some((score) => !Number.isFinite(score))) return null

  const buildLabel = (context) => {
    const tags = Array.isArray(context.tags) ? context.tags.slice(0, 2).join(' | ') : ''
    return `${context.summary}${tags ? ` (${tags})` : ''}`
  }

  return createSignal(
    'Team story context',
    0.1,
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
    'Daily team-story layer'
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

const buildMlbWeatherProfile = (lineupBoard = null) => {
  const weather = lineupBoard?.weather
  if (!weather) return null

  const parseWeatherNumber = (value) =>
    value === null || value === undefined || value === '' ? Number.NaN : Number(value)
  const summary = `${weather.summary || weather.label || ''}`.toLowerCase()
  const temperatureF = parseWeatherNumber(weather.temperatureF)
  const windMph = parseWeatherNumber(weather.windMph)
  const windDirection = `${weather.windDirection || ''}`.toLowerCase()
  const precipitationPct = parseWeatherNumber(weather.precipitationPct)
  const isDome = /dome/i.test(summary)

  let hitBoostFirst5 = 0
  let hitBoostLate = 0
  let runBoostFirst5 = 0
  let runBoostLate = 0
  let volatilityDelta = 0

  if (Number.isFinite(temperatureF)) {
    if (temperatureF >= 88) {
      hitBoostFirst5 += 0.18
      hitBoostLate += 0.16
      runBoostFirst5 += 0.01
      runBoostLate += 0.012
    } else if (temperatureF >= 80) {
      hitBoostFirst5 += 0.08
      hitBoostLate += 0.07
      runBoostFirst5 += 0.004
      runBoostLate += 0.005
    } else if (temperatureF <= 55) {
      hitBoostFirst5 -= 0.12
      hitBoostLate -= 0.1
      runBoostFirst5 -= 0.006
      runBoostLate -= 0.007
    }
  }

  if (Number.isFinite(windMph)) {
    if (/out/.test(windDirection)) {
      hitBoostFirst5 += Math.min(0.18, windMph * 0.012)
      hitBoostLate += Math.min(0.22, windMph * 0.015)
      runBoostFirst5 += Math.min(0.014, windMph * 0.0009)
      runBoostLate += Math.min(0.018, windMph * 0.0011)
    } else if (/in/.test(windDirection)) {
      hitBoostFirst5 -= Math.min(0.16, windMph * 0.011)
      hitBoostLate -= Math.min(0.18, windMph * 0.013)
      runBoostFirst5 -= Math.min(0.012, windMph * 0.0008)
      runBoostLate -= Math.min(0.014, windMph * 0.001)
    } else if (/[lr]-[lr]/.test(windDirection) || windDirection === 'r-l' || windDirection === 'l-r') {
      volatilityDelta += Math.min(4, windMph * 0.18)
    }
  }

  if (Number.isFinite(precipitationPct) && precipitationPct >= 35) {
    hitBoostFirst5 -= 0.05
    hitBoostLate -= 0.04
    runBoostFirst5 -= 0.003
    runBoostLate -= 0.003
    volatilityDelta += 2
  }

  if (isDome) {
    volatilityDelta -= 1
  }

  const totalRunBoost = roundToTenths((runBoostFirst5 + runBoostLate) * 100)
  const label =
    Number.isFinite(totalRunBoost) && Math.abs(totalRunBoost) >= 0.4
      ? totalRunBoost > 0
        ? `${weather.label || weather.summary} | weather helps carry`
        : `${weather.label || weather.summary} | weather suppresses carry`
      : weather.label || weather.summary || ''

  return {
    label,
    temperatureF: Number.isFinite(temperatureF) ? temperatureF : null,
    windMph: Number.isFinite(windMph) ? windMph : null,
    windDirection: weather.windDirection || '',
    precipitationPct: Number.isFinite(precipitationPct) ? precipitationPct : null,
    isDome,
    hitBoostFirst5,
    hitBoostLate,
    runBoostFirst5,
    runBoostLate,
    volatilityDelta: roundToTenths(volatilityDelta)
  }
}

const lineupStatusConfidence = (status = '') => {
  if (status === 'posted') return 1
  if (status === 'partial') return 0.55
  return 0.2
}

const buildLineupBattingPressureAdjustment = (lineupProfile = null, lineupConfidence = 1) => {
  if (!lineupProfile) {
    return {
      hitDelta: 0,
      coverageDelta: 0,
      runConversionDelta: 0,
      holdDelta: 0,
      scoreDelta: 0,
      note: null
    }
  }

  const battingPressureIndex = Number(lineupProfile.battingPressureIndex)
  if (!Number.isFinite(battingPressureIndex)) {
    return {
      hitDelta: 0,
      coverageDelta: 0,
      runConversionDelta: 0,
      holdDelta: 0,
      scoreDelta: 0,
      note: null
    }
  }

  const highAverageCount = Number(lineupProfile.highAverageCount || 0)
  const topSixHighAverageCount = Number(lineupProfile.topSixHighAverageCount || 0)
  const highOpsCount = Number(lineupProfile.highOpsCount || 0)
  const pressureGap = battingPressureIndex - 50
  const stackBonus =
    highAverageCount >= 7
      ? 0.12
      : highAverageCount >= 5
        ? 0.07
        : topSixHighAverageCount >= 4
          ? 0.05
          : 0
  const opsBonus = highOpsCount >= 4 ? 0.05 : highOpsCount >= 3 ? 0.03 : 0
  const hitDelta = clamp((pressureGap * 0.011 + stackBonus + opsBonus) * lineupConfidence, -0.22, 0.48)
  const coverageDelta = clamp(
    (-Math.max(battingPressureIndex - 58, 0) * 0.0019 - stackBonus * 0.08) * lineupConfidence,
    -0.09,
    0.03
  )
  const runConversionDelta = clamp((Math.max(battingPressureIndex - 55, 0) * 0.00032 + stackBonus * 0.004) * lineupConfidence, 0, 0.016)
  const holdDelta = clamp((-Math.max(battingPressureIndex - 52, 0) * 0.2 - stackBonus * 11) * lineupConfidence, -10, 2)
  const scoreDelta = clamp((pressureGap * 0.1 + highAverageCount * 0.45 + highOpsCount * 0.35) * lineupConfidence, -3.5, 8)

  return {
    hitDelta,
    coverageDelta,
    runConversionDelta,
    holdDelta,
    scoreDelta,
    note:
      highAverageCount >= 7
        ? `${highAverageCount} .300-profile bats stress the starter`
        : battingPressureIndex >= 62
          ? lineupProfile.battingPressureLabel || 'lineup batting pressure'
          : null
  }
}

const buildHandednessSplitAdjustment = (lineupProfile = null, lineupConfidence = 1) => {
  const splitProfile = lineupProfile?.handednessSplitProfile ?? lineupProfile
  const splitIndex = Number(splitProfile?.index ?? lineupProfile?.handednessSplitIndex)
  if (!Number.isFinite(splitIndex)) {
    return {
      hitDelta: 0,
      coverageDelta: 0,
      runConversionDelta: 0,
      holdDelta: 0,
      scoreDelta: 0,
      note: null,
      profile: null
    }
  }

  const splitCount = Number(splitProfile?.splitCount ?? lineupProfile?.handednessSplitCount ?? 0)
  const strongSplitCount = Number(splitProfile?.strongSplitCount ?? lineupProfile?.strongSplitCount ?? 0)
  const weakSplitCount = Number(splitProfile?.weakSplitCount ?? lineupProfile?.weakSplitCount ?? 0)
  const severeWeakSplitCount = Number(splitProfile?.severeWeakSplitCount ?? lineupProfile?.severeWeakSplitCount ?? 0)
  const topSixStrongSplitCount = Number(splitProfile?.topSixStrongSplitCount ?? lineupProfile?.topSixStrongSplitCount ?? 0)
  const topSixWeakSplitCount = Number(splitProfile?.topSixWeakSplitCount ?? lineupProfile?.topSixWeakSplitCount ?? 0)
  const topThirdStrongSplitCount = Number(splitProfile?.topThirdStrongSplitCount ?? lineupProfile?.topThirdStrongSplitCount ?? 0)
  const topThirdWeakSplitCount = Number(splitProfile?.topThirdWeakSplitCount ?? lineupProfile?.topThirdWeakSplitCount ?? 0)
  const pressureGap = splitIndex - 50
  const sampleConfidence = Number.isFinite(splitCount) && splitCount > 0 ? clamp(splitCount / 7, 0.5, 1) : 0.65
  const confidence = lineupConfidence * sampleConfidence
  const strongBonus =
    Math.max(strongSplitCount - 3, 0) * 0.05 +
    Math.max(topSixStrongSplitCount - 2, 0) * 0.04 +
    topThirdStrongSplitCount * 0.025
  const weakPenalty =
    Math.max(weakSplitCount - 2, 0) * 0.055 +
    Math.max(topSixWeakSplitCount - 1, 0) * 0.045 +
    topThirdWeakSplitCount * 0.025 +
    severeWeakSplitCount * 0.045
  const hitDelta = clamp((pressureGap * 0.013 + strongBonus - weakPenalty) * confidence, -0.58, 0.7)
  const coverageDelta = clamp(
    (
      -Math.max(pressureGap, 0) * 0.0021 -
      strongBonus * 0.11 +
      Math.max(-pressureGap, 0) * 0.0015 +
      weakPenalty * 0.06
    ) * confidence,
    -0.11,
    0.07
  )
  const runConversionDelta = clamp(
    (pressureGap * 0.00045 + strongBonus * 0.006 - weakPenalty * 0.0035) * confidence,
    -0.014,
    0.022
  )
  const holdDelta = clamp(
    (
      -Math.max(pressureGap, 0) * 0.22 -
      strongBonus * 15 +
      Math.max(-pressureGap, 0) * 0.15 +
      weakPenalty * 8
    ) * confidence,
    -11,
    8
  )
  const scoreDelta = clamp(
    (pressureGap * 0.08 + strongSplitCount * 0.45 - weakSplitCount * 0.35 - severeWeakSplitCount * 0.45) * confidence,
    -5.5,
    7.5
  )
  const note =
    splitIndex >= 62
      ? `${strongSplitCount} strong handedness split bats versus starter hand`
      : splitIndex <= 42
        ? `${weakSplitCount} weak handedness split bats versus starter hand`
        : Math.abs(hitDelta) >= 0.08
          ? splitProfile?.label || 'handedness split adjustment'
          : null

  return {
    hitDelta,
    coverageDelta,
    runConversionDelta,
    holdDelta,
    scoreDelta,
    note,
    profile: splitProfile
  }
}

const buildProjectedHitProfile = ({
  role = '',
  offenseProfile = {},
  savantProfile = {},
  lineupProfile = null,
  lineupStatus = 'pending',
  opposingStarter = null,
  opposingBullpen = {},
  opposingBullpenChain = null,
  parkContext = null,
  weatherProfile = null,
  sunVisibilityProfile = null,
  environmentAdjustmentContext = null,
  ficDailyMatchupTeamContext = null,
  opposingReliefProjectionContext = null
}) => {
  const offenseFeedStale = Boolean(offenseProfile?.staleFeed)
  const splitHits = /home/i.test(role)
    ? Number(offenseProfile.homeHitsPerGame)
    : Number(offenseProfile.awayHitsPerGame)
  const baselineHits = Number(offenseProfile.hitsPerGame)
  const recentHits = Number(offenseProfile.last3HitsPerGame)

  if (![splitHits, baselineHits, recentHits].every(Number.isFinite)) return null

  let starterPhaseProjection = offenseFeedStale
    ? 7.9 + (/home/i.test(role) ? 0.05 : 0.15)
    : baselineHits * 0.4 + splitHits * 0.35 + recentHits * 0.25
  const qualityNotes = []
  const lineupConfidence = lineupStatusConfidence(lineupStatus)
  const runIndex = Number(parkContext?.indexRuns)
  const wobaIndex = Number(parkContext?.indexWoba)
  let bullpenAdjustment = 0
  const availableReliefContext = buildAvailableReliefAdjustmentContext(opposingReliefProjectionContext)
  const carryContext = buildCarryAdjustmentContext({
    environmentAdjustmentContext,
    weatherProfile,
    ficDailyMatchupContext: ficDailyMatchupTeamContext
  })
  const starterWeatherAdjustment = buildStarterWeatherAdjustment({
    starter: opposingStarter,
    weatherProfile,
    environmentAdjustmentContext,
    ficDailyMatchupContext: ficDailyMatchupTeamContext
  })
  const handednessSplitAdjustment = buildHandednessSplitAdjustment(lineupProfile, lineupConfidence)

  if (offenseFeedStale) {
    qualityNotes.push('team offense feed stale')
  }

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

  if (lineupProfile) {
    if (Number.isFinite(lineupProfile.averageMatchupGrade)) {
      starterPhaseProjection += lineupProfile.averageMatchupGrade * 0.14 * lineupConfidence
    }

    if (Number.isFinite(lineupProfile.starterThreatCount)) {
      starterPhaseProjection += (lineupProfile.starterThreatCount - 3) * 0.08 * lineupConfidence
    }

    if (Number.isFinite(lineupProfile.topThirdScore)) {
      starterPhaseProjection += (lineupProfile.topThirdScore - 50) * 0.018 * lineupConfidence
    }

    if (Number.isFinite(lineupProfile.platoonPressureIndex)) {
      starterPhaseProjection += (lineupProfile.platoonPressureIndex - 50) * 0.012 * lineupConfidence
    }

    if (Number.isFinite(lineupProfile.pitchTypePressureIndex)) {
      starterPhaseProjection += (lineupProfile.pitchTypePressureIndex - 50) * 0.013 * lineupConfidence
    }

    if (Number.isFinite(lineupProfile.starterMatchupKernelIndex)) {
      starterPhaseProjection += (lineupProfile.starterMatchupKernelIndex - 50) * 0.012 * lineupConfidence
    }

    if (Number.isFinite(lineupProfile.starterPressureIndex)) {
      starterPhaseProjection += (lineupProfile.starterPressureIndex - 50) * 0.014 * lineupConfidence
    }

    qualityNotes.push(
      lineupConfidence >= 1
        ? 'lineup split pressure'
        : lineupConfidence >= 0.5
          ? 'partial lineup split pressure'
          : 'projected lineup split pressure'
    )

    const battingPressureAdjustment = buildLineupBattingPressureAdjustment(lineupProfile, lineupConfidence)
    if (Math.abs(battingPressureAdjustment.hitDelta) >= 0.04) {
      starterPhaseProjection += battingPressureAdjustment.hitDelta
      qualityNotes.push(battingPressureAdjustment.note || 'lineup batting pressure')
    }

    if (Math.abs(handednessSplitAdjustment.hitDelta) >= 0.04) {
      starterPhaseProjection += handednessSplitAdjustment.hitDelta
      qualityNotes.push(handednessSplitAdjustment.note || 'handedness split adjustment')
    }
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

    if (starterWeatherAdjustment?.active) {
      starterPhaseProjection += Number(starterWeatherAdjustment.hitDelta || 0)
      qualityNotes.push(
        starterWeatherAdjustment.hitDelta >= 0
          ? 'pitcher weather-archetype damage'
          : 'pitcher weather-archetype protection'
      )
    }

    if (!opposingStarter.sampleEstablished) {
      starterPhaseProjection += 0.2
      qualityNotes.push('starter uncertainty')
    }

    if (
      Number.isFinite(opposingStarter.currentSeasonWar) &&
      Number(opposingStarter.currentSeasonWarGamesStarted || 0) >= 4
    ) {
      starterPhaseProjection -= Math.min(0.55, Math.max(opposingStarter.currentSeasonWar, 0) * 0.18)
      starterPhaseProjection += Math.min(0.65, Math.max(-opposingStarter.currentSeasonWar, 0) * 0.22)
      qualityNotes.push('starter WAR baseline')
    }

    if (
      Number.isFinite(opposingStarter.previousSeasonWar) &&
      Number(opposingStarter.previousSeasonWarGamesStarted || 0) >= 10
    ) {
      starterPhaseProjection -= Math.min(
        0.28,
        Math.max(opposingStarter.previousSeasonWar - 1.5, 0) * 0.08
      )
      starterPhaseProjection += Math.min(
        0.22,
        Math.max(0.5 - opposingStarter.previousSeasonWar, 0) * 0.08
      )
    }

    if (
      Number.isFinite(opposingStarter.warDelta) &&
      Number(opposingStarter.currentSeasonWarGamesStarted || 0) >= 4
    ) {
      starterPhaseProjection += Math.min(0.3, Math.max(-opposingStarter.warDelta - 1, 0) * 0.08)
      starterPhaseProjection -= Math.min(0.2, Math.max(opposingStarter.warDelta - 0.8, 0) * 0.06)
    }

    if (opposingStarter.recentForm && Number.isFinite(opposingStarter.recentFormWeight) && opposingStarter.recentFormWeight > 0) {
      const weight = opposingStarter.recentFormWeight
      const recent = opposingStarter.recentForm

      if (Number.isFinite(recent.hitsAllowedPerStart)) {
        starterPhaseProjection += (recent.hitsAllowedPerStart - 5.5) * 0.11 * (0.65 + weight)
      }

      if (Number.isFinite(recent.earnedRunsPerStart)) {
        starterPhaseProjection += (recent.earnedRunsPerStart - 2.6) * 0.16 * (0.55 + weight)
      }

      if (Number.isFinite(recent.homeRunsAllowedPerStart)) {
        starterPhaseProjection += (recent.homeRunsAllowedPerStart - 0.65) * 0.34 * (0.45 + weight)
      }

      if (Number.isFinite(recent.whipLike)) {
        starterPhaseProjection += (recent.whipLike - 1.28) * 0.7 * (0.45 + weight)
      }

      if (Number.isFinite(recent.shortStartRate)) {
        starterPhaseProjection += recent.shortStartRate * 0.42 * (0.45 + weight)
      }

      if (Number.isFinite(recent.qualityStartRate)) {
        starterPhaseProjection -= recent.qualityStartRate * 0.24 * (0.45 + weight)
      }

      if (Number.isFinite(recent.recent3EarnedRunsDelta)) {
        starterPhaseProjection += recent.recent3EarnedRunsDelta * 0.1 * (0.45 + weight)
      }

      qualityNotes.push('starter recent form')
    }

    const vsTeamContext = opposingStarter.starterVsTeamContext
    if (vsTeamContext && Number(vsTeamContext.sampleWeight || 0) >= 0.18) {
      const vsTeamHitsDelta = Number(vsTeamContext.projectedHitsDelta || 0)
      if (Math.abs(vsTeamHitsDelta) >= 0.04) {
        starterPhaseProjection += vsTeamHitsDelta
        qualityNotes.push(vsTeamContext.label || 'starter-vs-opponent history')
      }
    }
  }

  if (!opposingBullpen?.staleFeed && [Number(opposingBullpen.era), Number(opposingBullpen.whip)].every(Number.isFinite)) {
    const seasonBullpenAdjustment =
      (Number(opposingBullpen.era) - 4.1) * 0.14 +
      (Number(opposingBullpen.whip) - 1.31) * 0.9
    bullpenAdjustment += availableReliefContext ? seasonBullpenAdjustment * 0.55 : seasonBullpenAdjustment
    qualityNotes.push(availableReliefContext ? 'season bullpen baseline adjusted by RP2 availability' : 'bullpen shape')
  } else if (opposingBullpen?.staleFeed) {
    qualityNotes.push('bullpen stat feed stale')
  }

  const opposingBullpenChainScore = buildMlbBullpenChainScore(opposingBullpenChain)

  if (Number.isFinite(opposingBullpenChainScore)) {
    bullpenAdjustment += (56 - opposingBullpenChainScore) * 0.032
    qualityNotes.push('likely bridge chain')
  }

  if (lineupProfile && Number.isFinite(lineupProfile.bullpenPitchTypePressureIndex)) {
    bullpenAdjustment +=
      (lineupProfile.bullpenPitchTypePressureIndex - 50) * 0.014 * lineupConfidence
    qualityNotes.push(
      lineupConfidence >= 1 ? 'reliever arsenal fit' : 'projected reliever arsenal fit'
    )
  }

  if (Number.isFinite(runIndex)) {
    starterPhaseProjection += (runIndex - 100) * 0.028
  }

  if (Number.isFinite(wobaIndex)) {
    starterPhaseProjection += (wobaIndex - 100) * 0.018
  }

  if (weatherProfile) {
    starterPhaseProjection += Number(weatherProfile.hitBoostFirst5 || 0)
    bullpenAdjustment += Number(weatherProfile.hitBoostLate || 0)
    if (
      Math.abs(Number(weatherProfile.hitBoostFirst5 || 0)) >= 0.04 ||
      Math.abs(Number(weatherProfile.hitBoostLate || 0)) >= 0.04
    ) {
      qualityNotes.push('weather lane')
    }
  }

  const envTotalContext = buildEnvironmentTotalContext(environmentAdjustmentContext, weatherProfile)
  if (envTotalContext) {
    const envHitLift = clamp(
      Number(envTotalContext.expectedHitsDelta || 0) * 0.42 +
        (Number(envTotalContext.hitsMultiplier || 1) - 1) * 7.2 +
        (envTotalContext.hrLift ? 0.08 : 0) -
        (envTotalContext.runDrag ? 0.07 : 0),
      -0.32,
      0.42
    )

    if (Math.abs(envHitLift) >= 0.04) {
      starterPhaseProjection += envHitLift * 0.56
      bullpenAdjustment += envHitLift * 0.44
      qualityNotes.push('ENV1 hit environment')
    }
  }

  const ficTotalContext = buildFicDailyMatchupTotalContext(ficDailyMatchupTeamContext)
  if (ficTotalContext && Number(ficTotalContext.hitDelta || 0) >= 0.04) {
    starterPhaseProjection += Number(ficTotalContext.hitDelta || 0) * 0.62
    bullpenAdjustment += Number(ficTotalContext.hitDelta || 0) * 0.38
    qualityNotes.push(
      ficTotalContext.highHrForce
        ? `FIC matchup HRForce ${roundToTenths(ficTotalContext.hrForce)}`
        : 'FIC matchup contact quality'
    )
  }

  if (carryContext && Number(carryContext.hitDelta || 0) >= 0.04) {
    const amplification = Number(carryContext.hitDelta || 0) * (carryContext.materialHrForce ? 0.74 : 0.42)
    starterPhaseProjection += amplification * 0.58
    bullpenAdjustment += amplification * 0.42
    qualityNotes.push(
      carryContext.materialHrForce
        ? `material HRForce ${roundToTenths(carryContext.hrForce)} carry`
        : 'weather/FIC carry adjustment'
    )
  }

  if (opposingReliefProjectionContext) {
    const projectedReliefRunsAllowed = numberOrNull(opposingReliefProjectionContext.projectedReliefRunsAllowed)
    const bridgeStressScore = numberOrNull(opposingReliefProjectionContext.bridgeStressScore)
    const qualityScore = numberOrNull(opposingReliefProjectionContext.qualityScore)
    const baseRp2HitAdjustment = clamp(
      (Number.isFinite(projectedReliefRunsAllowed) ? (projectedReliefRunsAllowed - 1.75) * 0.14 : 0) +
        (Number.isFinite(bridgeStressScore) ? (bridgeStressScore - 52) * 0.006 : 0) -
        (Number.isFinite(qualityScore) ? (qualityScore - 55) * 0.004 : 0),
      -0.26,
      0.36
    )
    const availableReliefHitAdjustment = Number(availableReliefContext?.hitDelta || 0)
    const rawRp2HitAdjustment = baseRp2HitAdjustment + availableReliefHitAdjustment
    const carryAmplifier = rawRp2HitAdjustment > 0 && carryContext?.highHrForce
      ? carryContext.materialHrForce
        ? 1.22
        : 1.1
      : 1
    const rp2HitAdjustment = clamp(rawRp2HitAdjustment * carryAmplifier, -0.34, 0.86)

    if (Math.abs(rp2HitAdjustment) >= 0.04) {
      bullpenAdjustment += rp2HitAdjustment
      qualityNotes.push(availableReliefContext ? 'RP2 available-bullpen projection' : 'RP2 relief run projection')
    }
  }

  const sunVisibilityRisk = Number(sunVisibilityProfile?.visibilityRiskScore)
  const sunFirst5HitLift = Number.isFinite(sunVisibilityRisk)
    ? clamp((sunVisibilityRisk - 30) * 0.0035, 0, 0.24)
    : 0
  const sunLateHitLift = Number.isFinite(sunVisibilityRisk)
    ? clamp((sunVisibilityRisk - 45) * 0.0018, 0, 0.1)
    : 0
  if (sunFirst5HitLift || sunLateHitLift) {
    starterPhaseProjection += sunFirst5HitLift
    bullpenAdjustment += sunLateHitLift
    qualityNotes.push('sun visibility lane')
  }

  const estimatedAtBats = clamp(
    34.4 +
      (Number.isFinite(runIndex) ? (runIndex - 100) * 0.025 : 0) +
      (weatherProfile ? Number(weatherProfile.hitBoostFirst5 || 0) * 0.12 + Number(weatherProfile.hitBoostLate || 0) * 0.09 : 0) +
      (/away/i.test(role) ? 0.2 : -0.1),
    33.6,
    35.8
  )
  const estimatedFirst5AtBats = clamp(
    19.0 +
      (Number.isFinite(runIndex) ? (runIndex - 100) * 0.013 : 0) +
      (weatherProfile ? Number(weatherProfile.hitBoostFirst5 || 0) * 0.08 : 0) +
      (/away/i.test(role) ? 0.1 : -0.05),
    18.3,
    19.8
  )
  let starterCoverageFirst5 = clamp(
    Number.isFinite(opposingStarter?.avgInningsPerStart)
      ? opposingStarter.avgInningsPerStart / 5
      : 0.9,
    0.72,
    1
  )

  if (opposingStarter?.recentForm && Number.isFinite(opposingStarter.recentFormWeight)) {
    const recent = opposingStarter.recentForm
    const weight = opposingStarter.recentFormWeight

    if (Number.isFinite(recent.inningsPerStart)) {
      starterCoverageFirst5 += (recent.inningsPerStart - 5) * 0.024 * (0.45 + weight)
    }

    if (Number.isFinite(recent.shortStartRate)) {
      starterCoverageFirst5 -= recent.shortStartRate * 0.11 * (0.45 + weight)
    }

    if (Number.isFinite(recent.qualityStartRate)) {
      starterCoverageFirst5 += recent.qualityStartRate * 0.05 * (0.45 + weight)
    }

    if (Number.isFinite(recent.runVolatility)) {
      starterCoverageFirst5 -= clamp(recent.runVolatility - 1.1, 0, 2.6) * 0.018 * (0.45 + weight)
    }
  }

  if (
    Number.isFinite(opposingStarter?.currentSeasonWar) &&
    Number(opposingStarter?.currentSeasonWarGamesStarted || 0) >= 4
  ) {
    starterCoverageFirst5 += Math.min(0.035, Math.max(opposingStarter.currentSeasonWar, 0) * 0.012)
    starterCoverageFirst5 -= Math.min(0.045, Math.max(-opposingStarter.currentSeasonWar, 0) * 0.016)
  }

  if (
    Number.isFinite(opposingStarter?.warDelta) &&
    Number(opposingStarter?.currentSeasonWarGamesStarted || 0) >= 4
  ) {
    starterCoverageFirst5 += Math.min(0.02, Math.max(opposingStarter.warDelta - 0.5, 0) * 0.01)
    starterCoverageFirst5 -= Math.min(0.03, Math.max(-opposingStarter.warDelta - 1, 0) * 0.012)
  }

  if (lineupProfile) {
    if (Number.isFinite(lineupProfile.starterPressureIndex)) {
      starterCoverageFirst5 -= (lineupProfile.starterPressureIndex - 50) * 0.0025 * lineupConfidence
    }

    if (Number.isFinite(lineupProfile.topThirdScore)) {
      starterCoverageFirst5 -=
        Math.max(lineupProfile.topThirdScore - 58, 0) * 0.0016 * lineupConfidence
    }

    if (Number.isFinite(lineupProfile.oppositeHandCount)) {
      starterCoverageFirst5 -=
        Math.max(lineupProfile.oppositeHandCount - 5, 0) * 0.008 * lineupConfidence
    }

    if (Number.isFinite(lineupProfile.pitchTypePressureIndex)) {
      starterCoverageFirst5 -=
        Math.max(lineupProfile.pitchTypePressureIndex - 56, 0) * 0.0016 * lineupConfidence
    }

    const battingPressureAdjustment = buildLineupBattingPressureAdjustment(lineupProfile, lineupConfidence)
    starterCoverageFirst5 += battingPressureAdjustment.coverageDelta
    starterCoverageFirst5 += handednessSplitAdjustment.coverageDelta
  }

  starterCoverageFirst5 = clamp(starterCoverageFirst5, 0.58, 1)
  const rawFirst5ProjectionFullScale =
    starterPhaseProjection + bullpenAdjustment * (1 - starterCoverageFirst5) * 0.45
  const rawStarterPhaseHits = clamp(
    rawFirst5ProjectionFullScale * (estimatedFirst5AtBats / estimatedAtBats),
    3.0,
    7.1
  )
  const rawFullGameProjection = clamp(starterPhaseProjection + bullpenAdjustment, 5.6, 11.6)
  const estimatedLateAtBats = clamp(estimatedAtBats - estimatedFirst5AtBats, 14.4, 17.1)
  const neutralProjection = clamp(
    offenseFeedStale
      ? 7.4 + (/home/i.test(role) ? 0.05 : 0.1)
      : baselineHits * 0.52 + splitHits * 0.28 + recentHits * 0.2,
    6.2,
    9.2
  )
  const neutralFirst5Hits = clamp(
    neutralProjection * (estimatedFirst5AtBats / estimatedAtBats),
    3.3,
    5.8
  )
  const confidenceBlend = lineupProfile ? lineupConfidence : 0.75
  const fullGameProjection = clamp(
    neutralProjection + (rawFullGameProjection - neutralProjection) * confidenceBlend,
    5.6,
    11.6
  )
  const starterPhaseHits = clamp(
    neutralFirst5Hits + (rawStarterPhaseHits - neutralFirst5Hits) * confidenceBlend,
    3.0,
    7.1
  )
  const lateGameProjection = clamp(fullGameProjection - starterPhaseHits, 2.0, 6.2)

  if (lineupConfidence < 1) {
    qualityNotes.push(
      lineupConfidence >= 0.5
        ? 'partial lineup confidence compresses the hit edge'
        : 'pending lineup confidence compresses the hit edge'
    )
  }

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
    lineupConfidence: roundToTenths(confidenceBlend),
    bullpenChainScore: Number.isFinite(opposingBullpenChainScore)
      ? roundToTenths(opposingBullpenChainScore)
      : null,
    sunVisibilityHitLift: roundToTenths(sunFirst5HitLift + sunLateHitLift),
    carryAdjustment: carryContext
      ? {
          hrForce: carryContext.hrForce != null ? roundToTenths(carryContext.hrForce) : null,
          materialHrForce: Boolean(carryContext.materialHrForce),
          extremeHrForce: Boolean(carryContext.extremeHrForce),
          carryMultiplier: carryContext.carryMultiplier,
          hitDelta: roundToTenths(Number(carryContext.hitDelta || 0)),
          runDelta: roundToTenths(Number(carryContext.runDelta || 0)),
          reasons: carryContext.reasons
      }
      : null,
    starterWeatherAdjustment: starterWeatherAdjustment
      ? {
          pitcherName: starterWeatherAdjustment.pitcherName,
          archetype: starterWeatherAdjustment.archetype,
          label: starterWeatherAdjustment.label,
          active: Boolean(starterWeatherAdjustment.active),
          temperatureF: starterWeatherAdjustment.temperatureF,
          hrForce: starterWeatherAdjustment.hrForce != null ? roundToTenths(starterWeatherAdjustment.hrForce) : null,
          hotWeather: Boolean(starterWeatherAdjustment.hotWeather),
          coldWeather: Boolean(starterWeatherAdjustment.coldWeather),
          hitDelta: roundToTenths(Number(starterWeatherAdjustment.hitDelta || 0)),
          runDelta: roundToTenths(Number(starterWeatherAdjustment.runDelta || 0)),
          conversionDelta: Number(starterWeatherAdjustment.conversionDelta || 0),
          firstInningProbabilityLiftPct: roundToTenths(Number(starterWeatherAdjustment.firstInningProbabilityDelta || 0) * 100),
          holdDelta: roundToTenths(Number(starterWeatherAdjustment.holdDelta || 0)),
          reasons: starterWeatherAdjustment.reasons ?? []
        }
      : null,
    handednessSplitAdjustment: handednessSplitAdjustment.profile
      ? {
          index: handednessSplitAdjustment.profile.index,
          label: handednessSplitAdjustment.profile.label,
          splitAvgAverage: handednessSplitAdjustment.profile.splitAvgAverage,
          splitOpsAverage: handednessSplitAdjustment.profile.splitOpsAverage,
          strongSplitCount: handednessSplitAdjustment.profile.strongSplitCount,
          weakSplitCount: handednessSplitAdjustment.profile.weakSplitCount,
          hitDelta: roundToTenths(Number(handednessSplitAdjustment.hitDelta || 0)),
          runConversionDelta: handednessSplitAdjustment.runConversionDelta,
          reasons: handednessSplitAdjustment.profile.reasons
        }
      : null,
    availableReliefAdjustment: availableReliefContext
      ? {
          adjustedProjectedReliefRunsAllowed: availableReliefContext.adjustedProjectedReliefRunsAllowed != null
            ? roundToTenths(availableReliefContext.adjustedProjectedReliefRunsAllowed)
            : null,
          leverageAvailabilityScore: availableReliefContext.leverageAvailabilityScore,
          leadAvailabilityScore: availableReliefContext.leadAvailabilityScore,
          runDelta: roundToTenths(Number(availableReliefContext.runDelta || 0)),
          hitDelta: roundToTenths(Number(availableReliefContext.hitDelta || 0)),
          expectedEarlyBridge: Boolean(availableReliefContext.expectedEarlyBridge),
          highAvailableBullpenRisk: Boolean(availableReliefContext.highAvailableBullpenRisk),
          reasons: availableReliefContext.reasons
        }
      : null,
    notes: qualityNotes
  }
}

const buildStarterHoldConfidence = ({
  starter = null,
  lineupProfile = null,
  weatherProfile = null,
  environmentAdjustmentContext = null,
  ficDailyMatchupTeamContext = null
}) => {
  if (!starter) return null

  let score = 56
  const starterWeatherAdjustment = buildStarterWeatherAdjustment({
    starter,
    weatherProfile,
    environmentAdjustmentContext,
    ficDailyMatchupContext: ficDailyMatchupTeamContext
  })

  const inningsAnchor = Number.isFinite(starter.expectedInnings)
    ? starter.expectedInnings
    : starter.avgInningsPerStart

  if (Number.isFinite(inningsAnchor)) {
    score += (inningsAnchor - 5.2) * 7
  }

  if (starter.profileType === 'Power' || starter.profileType === 'Contact suppressor') score += 4
  if (starter.profileType === 'Traffic-risk') score -= 6
  if (starter.profileType === 'Volatile bat-misser') score -= 3

  if (starter.recentForm && Number.isFinite(starter.recentFormWeight)) {
    const recent = starter.recentForm
    const weight = starter.recentFormWeight

    if (Number.isFinite(recent.inningsPerStart)) {
      score += (recent.inningsPerStart - 5.1) * 9 * (0.45 + weight)
    }

    if (Number.isFinite(recent.shortStartRate)) {
      score -= recent.shortStartRate * 20 * (0.45 + weight)
    }

    if (Number.isFinite(recent.qualityStartRate)) {
      score += recent.qualityStartRate * 14 * (0.45 + weight)
    }

    if (Number.isFinite(recent.runVolatility)) {
      score -= clamp(recent.runVolatility - 0.9, 0, 3) * 5.5 * (0.45 + weight)
    }

    if (Number.isFinite(recent.homeRunsAllowedPerStart)) {
      score -= Math.max(recent.homeRunsAllowedPerStart - 0.7, 0) * 7 * (0.45 + weight)
    }
  }

  if (
    Number.isFinite(starter.currentSeasonWar) &&
    Number(starter.currentSeasonWarGamesStarted || 0) >= 4
  ) {
    score += clamp(starter.currentSeasonWar, -2.5, 3.5) * 3.6
  }

  if (
    Number.isFinite(starter.previousSeasonWar) &&
    Number(starter.previousSeasonWarGamesStarted || 0) >= 10
  ) {
    score += clamp(starter.previousSeasonWar, -1, 4) * 1.4
  }

  if (
    Number.isFinite(starter.warDelta) &&
    Number(starter.currentSeasonWarGamesStarted || 0) >= 4
  ) {
    score += clamp(starter.warDelta, -3, 3) * 1.8
  }

  if (
    starter.starterVsTeamContext &&
    Number(starter.starterVsTeamContext.sampleWeight || 0) >= 0.18
  ) {
    score += Number(starter.starterVsTeamContext.starterHoldAdjustment || 0)
  }

  if (starterWeatherAdjustment?.active) {
    score += Number(starterWeatherAdjustment.holdDelta || 0)
  }

  if (lineupProfile) {
    if (Number.isFinite(lineupProfile.starterPressureIndex)) {
      score -= (lineupProfile.starterPressureIndex - 50) * 0.42
    }

    if (Number.isFinite(lineupProfile.platoonPressureIndex)) {
      score -= (lineupProfile.platoonPressureIndex - 50) * 0.24
    }

    const battingPressureAdjustment = buildLineupBattingPressureAdjustment(lineupProfile, 1)
    score += battingPressureAdjustment.holdDelta

    const handednessSplitAdjustment = buildHandednessSplitAdjustment(lineupProfile, 1)
    score += handednessSplitAdjustment.holdDelta
  }

  return roundToTenths(clamp(score, 18, 92))
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
  opposingReliefProjectionContext = null,
  environmentAdjustmentContext = null,
  ficDailyMatchupTeamContext = null,
  lineupProfile = null,
  weatherProfile = null,
  phase = 'full'
}) => {
  const runIndex = Number(parkContext?.indexRuns)
  let rate = 0.47
  const carryContext = buildCarryAdjustmentContext({
    environmentAdjustmentContext,
    weatherProfile,
    ficDailyMatchupContext: ficDailyMatchupTeamContext
  })
  const starterWeatherAdjustment = buildStarterWeatherAdjustment({
    starter: opposingStarter,
    weatherProfile,
    environmentAdjustmentContext,
    ficDailyMatchupContext: ficDailyMatchupTeamContext
  })
  const handednessSplitAdjustment = buildHandednessSplitAdjustment(lineupProfile, 1)

  if (Number.isFinite(offenseScore)) rate += (offenseScore - 56) * 0.0015
  if (Number.isFinite(savantScore)) rate += (savantScore - 56) * 0.0018
  if (Number.isFinite(runIndex)) rate += (runIndex - 100) * 0.0008

  if (phase === 'first5') {
    const battingPressureAdjustment = buildLineupBattingPressureAdjustment(lineupProfile, 1)

    rate -= 0.008

    if (opposingStarter?.profileType === 'Traffic-risk') rate += 0.024
    if (opposingStarter?.profileType === 'Volatile bat-misser') rate += 0.01
    if (opposingStarter?.profileType === 'Power') rate -= 0.012
    if (opposingStarter?.profileType === 'Contact suppressor') rate -= 0.02

    if (opposingStarter?.recentForm && Number.isFinite(opposingStarter.recentFormWeight)) {
      const recent = opposingStarter.recentForm
      const weight = opposingStarter.recentFormWeight

      if (Number.isFinite(recent.earnedRunsPerStart)) {
        rate += (recent.earnedRunsPerStart - 2.6) * 0.0035 * (0.55 + weight)
      }

      if (Number.isFinite(recent.homeRunsAllowedPerStart)) {
        rate += (recent.homeRunsAllowedPerStart - 0.65) * 0.006 * (0.45 + weight)
      }

      if (Number.isFinite(recent.shortStartRate)) {
        rate += recent.shortStartRate * 0.012 * (0.45 + weight)
      }

      if (Number.isFinite(recent.qualityStartRate)) {
        rate -= recent.qualityStartRate * 0.008 * (0.45 + weight)
      }
    }

    if (battingPressureAdjustment.runConversionDelta > 0) {
      rate += battingPressureAdjustment.runConversionDelta
    }

    if (Math.abs(handednessSplitAdjustment.runConversionDelta) >= 0.001) {
      rate += handednessSplitAdjustment.runConversionDelta
    }

    const vsTeamContext = opposingStarter?.starterVsTeamContext
    if (vsTeamContext && Number(vsTeamContext.sampleWeight || 0) >= 0.18) {
      rate += Number(vsTeamContext.runConversionDelta || 0)
    }

    if (weatherProfile) {
      rate += Number(weatherProfile.runBoostFirst5 || 0)
    }

	    const envTotalContext = buildEnvironmentTotalContext(environmentAdjustmentContext, weatherProfile)
	    if (envTotalContext?.highHrForce) rate += envTotalContext?.carryFades ? 0.0017 : 0.0035
	    if (envTotalContext?.runLift) rate += 0.0025
	    if (envTotalContext?.runDrag) rate -= 0.0025

	    const ficTotalContext = buildFicDailyMatchupTotalContext(ficDailyMatchupTeamContext)
	    const ficCarryAllowed = !envTotalContext?.weakOrFadingGameTimeCarry
	    if (ficCarryAllowed && ficTotalContext?.highHrForce) rate += ficTotalContext.extremeHrForce ? 0.005 : 0.0035
	    else if (ficTotalContext?.runLift) rate += 0.0018

    if (carryContext?.highHrForce) {
      rate += Number(carryContext.conversionDelta || 0) * (carryContext.carryFades ? 0.42 : carryContext.materialHrForce ? 0.8 : 0.55)
    }

    if (starterWeatherAdjustment?.active) {
      rate += Number(starterWeatherAdjustment.conversionDelta || 0)
    }
  }

  if (phase === 'late') {
    rate += 0.012

    if (Number.isFinite(opposingBullpenExhaustion)) {
      rate += opposingBullpenExhaustion * 0.0012
    }

    if (lineupProfile && Number.isFinite(lineupProfile.bullpenPitchTypePressureIndex)) {
      rate += Math.max(lineupProfile.bullpenPitchTypePressureIndex - 50, 0) * 0.00065
    }

    rate += buildRp2LateRunConversionDelta(opposingReliefProjectionContext)

    if (weatherProfile) {
      rate += Number(weatherProfile.runBoostLate || 0)
    }

	    const envTotalContext = buildEnvironmentTotalContext(environmentAdjustmentContext, weatherProfile)
	    if (envTotalContext?.highHrForce) rate += envTotalContext?.carryFades ? 0.001 : 0.004
	    if (envTotalContext?.runLift) rate += 0.003
	    if (envTotalContext?.runDrag) rate -= 0.003

	    const ficTotalContext = buildFicDailyMatchupTotalContext(ficDailyMatchupTeamContext)
	    const ficCarryAllowed = !envTotalContext?.weakOrFadingGameTimeCarry
	    if (ficCarryAllowed && ficTotalContext?.highHrForce) rate += ficTotalContext.extremeHrForce ? 0.0045 : 0.003
    else if (ficTotalContext?.runLift) rate += 0.0015

    if (carryContext?.highHrForce) {
      rate += Number(carryContext.conversionDelta || 0) * (carryContext.carryFades ? 0.25 : carryContext.materialHrForce ? 1 : 0.65)
    }

    if (Math.abs(handednessSplitAdjustment.runConversionDelta) >= 0.001) {
      rate += handednessSplitAdjustment.runConversionDelta * 0.35
    }
  }

  if (phase === 'full' && weatherProfile) {
    rate += (Number(weatherProfile.runBoostFirst5 || 0) + Number(weatherProfile.runBoostLate || 0)) * 0.5
  }

  if (phase === 'full' && carryContext?.highHrForce) {
    rate += Number(carryContext.conversionDelta || 0) * (carryContext.carryFades ? 0.3 : carryContext.materialHrForce ? 0.9 : 0.5)
  }

  if (phase === 'full' && starterWeatherAdjustment?.active) {
    rate += Number(starterWeatherAdjustment.conversionDelta || 0) * 0.72
  }

  if (phase === 'full' && Math.abs(handednessSplitAdjustment.runConversionDelta) >= 0.001) {
    rate += handednessSplitAdjustment.runConversionDelta * 0.55
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

const buildFirst5TailOverlay = ({
  baseProjectedRuns,
  line = null,
  projectedHitProfiles = [],
  teamMistakeShapes = [],
  lineupConversionShapes = [],
  bullpenMistakeShapes = [],
  weatherProfile = null,
  sunVisibilityProfile = null,
  environmentAdjustmentContext = null,
  ficDailyMatchupContext = null,
  reliefProjectionContexts = [],
  starterVsTeamContexts = []
}) => {
  const envTotalContext = buildEnvironmentTotalContext(environmentAdjustmentContext, weatherProfile)
  const ficTotalContext = buildFicDailyMatchupTotalContext(ficDailyMatchupContext)
  const reliefTotalContext = buildReliefProjectionTotalContext(reliefProjectionContexts)
  const repeatDamageContexts = starterVsTeamContexts.filter((context) => context?.repeatOpponentUnderWarning)
  const maxRepeatOpponentFirst5Tax = maxMetric(repeatDamageContexts, 'repeatOpponentFirst5Tax')
  const carryContext = buildCarryAdjustmentContext({
    environmentAdjustmentContext,
    weatherProfile,
    ficDailyMatchupContext
  })
	  const weatherLabel = `${weatherProfile?.label || ''}`.toLowerCase()
	  const temperatureF = Number(weatherProfile?.temperatureF)
	  const windDirection = `${weatherProfile?.windDirection || ''}`.toLowerCase()
	  const ficCarryAllowed = !envTotalContext?.weakOrFadingGameTimeCarry
	  const weatherCarry =
	    !weatherProfile?.isDome &&
	    (
      /helps carry|wind .*out/.test(weatherLabel) ||
      /out/.test(windDirection) ||
      Number(weatherProfile?.runBoostFirst5 || 0) >= 0.008 ||
	      (Number.isFinite(temperatureF) && temperatureF >= 80) ||
	      envTotalContext?.highHrForce ||
	      envTotalContext?.runLift ||
	      (ficCarryAllowed && ficTotalContext?.highHrForce) ||
	      carryContext?.materialHrForce
	    )
  const weatherSuppress =
    /suppresses carry|wind .*in/.test(weatherLabel) ||
    /in/.test(windDirection) ||
    Number(weatherProfile?.runBoostFirst5 || 0) <= -0.008 ||
    envTotalContext?.runDrag
  const maxMistakeChaos = maxMetric(teamMistakeShapes, 'mistakeChaosIndex')
  const maxRunClustering = maxMetric(teamMistakeShapes, 'runClusteringIndex')
  const maxEarlyMultiRunAllowed = maxMetric(teamMistakeShapes, 'earlyMultiRunAllowedRate')
  const maxOneBadInningAllowed = maxMetric(teamMistakeShapes, 'oneBadInningAllowedRate')
  const maxQuietFirst5 = maxMetric(lineupConversionShapes, 'quietFirst5Rate')
  const maxLineupDeadBatTraffic = maxMetric(lineupConversionShapes, 'deadBatTrafficRate')
  const maxTeamDeadBatTraffic = maxMetric(teamMistakeShapes, 'deadBatTrafficRate')
  const maxLineupTrafficNoConversion = maxMetric(lineupConversionShapes, 'trafficNoConversionRate')
  const maxTeamTrafficNoConversion = maxMetric(teamMistakeShapes, 'trafficNoConversionRate')
  const minLineupConversion = minMetric(lineupConversionShapes, 'lineupConversionIndex')
  const maxBullpenMeltdown = maxMetric(teamMistakeShapes, 'bullpenMeltdownRate')
  const maxBullpenChaos = maxMetric(bullpenMistakeShapes, 'bullpenChaosIndex')
  const visibilityRisk = Number(sunVisibilityProfile?.visibilityRiskScore)
  const minLineupConversionValue = Number.isFinite(minLineupConversion) ? minLineupConversion : 35
  const first5Hits = projectedHitProfiles
    .map((profile) => Number(profile?.first5ProjectedHits))
    .filter(Number.isFinite)
  const totalFirst5Hits = first5Hits.reduce((sum, value) => sum + value, 0)
  const maxDeadBatTraffic = Math.max(maxLineupDeadBatTraffic || 0, maxTeamDeadBatTraffic || 0)
  const maxTrafficNoConversion = Math.max(maxLineupTrafficNoConversion || 0, maxTeamTrafficNoConversion || 0)
  const maxBigInningRate = Math.max(maxEarlyMultiRunAllowed || 0, maxOneBadInningAllowed || 0)

  let tailScore =
    clamp((Number(maxMistakeChaos || 0) - 54) * 1.45, 0, 24) +
    clamp((Number(maxRunClustering || 0) - 62) * 1.25, 0, 24) +
    clamp((maxBigInningRate - 0.28) * 54, 0, 22) +
    clamp((totalFirst5Hits - 8.2) * 5.4, 0, 18) +
    clamp((Number(maxBullpenChaos || 0) - 48) * 0.42, 0, 8) +
    clamp((Number(maxBullpenMeltdown || 0) - 0.18) * 32, 0, 7)

  if (weatherCarry) tailScore += 14
  if (envTotalContext?.highHrForce) tailScore += envTotalContext?.carryFades ? 5 : 12
  else if (envTotalContext?.runLift || envTotalContext?.hrLift) tailScore += 6
	  if (ficCarryAllowed && ficTotalContext?.highHrForce) tailScore += ficTotalContext.extremeHrForce ? 12 : 8
	  else if (ficTotalContext?.runLift) tailScore += 4
  if (carryContext?.materialHrForce) tailScore += carryContext.extremeHrForce ? 16 : 11
  else if (carryContext?.carryFades && carryContext?.highHrForce) tailScore += 4
  if (reliefTotalContext?.watchLateRunRisk && Number(reliefTotalContext.maxProjectedReliefOuts || 0) >= 11) {
    tailScore += reliefTotalContext.highLateRunRisk ? 7 : 4
  }
  if (Number.isFinite(visibilityRisk)) tailScore += clamp((visibilityRisk - 24) * 0.55, 0, 12)
  if (Number.isFinite(maxRepeatOpponentFirst5Tax) && maxRepeatOpponentFirst5Tax >= 0.25) {
    tailScore += clamp(maxRepeatOpponentFirst5Tax * 16, 4, 10)
  }

  let strandScore =
    clamp((Number(maxQuietFirst5 || 0) - 0.34) * 58, 0, 24) +
    clamp((maxDeadBatTraffic - 0.24) * 44, 0, 18) +
    clamp((maxTrafficNoConversion - 0.2) * 48, 0, 18) +
    clamp((35 - minLineupConversionValue) * 0.65, 0, 18)

  if (weatherSuppress) strandScore += 10
  if (totalFirst5Hits <= 8.5) strandScore += clamp((8.5 - totalFirst5Hits) * 3.5, 0, 8)

  tailScore = clamp(tailScore, 0, 100)
  strandScore = clamp(strandScore, 0, 100)
  const forkScore = Math.min(tailScore, strandScore)
  const lowLine = Number.isFinite(line) && line <= 4.6
  const highLine = Number.isFinite(line) && line >= 5.4
  const catastropheCandidate =
    tailScore >= 66 &&
    (
      weatherCarry ||
      carryContext?.materialHrForce ||
      maxBigInningRate >= 0.58 ||
      Number(maxRunClustering || 0) >= 76 ||
      Number(maxRepeatOpponentFirst5Tax || 0) >= 0.35 ||
      Number(maxMistakeChaos || 0) >= 68
    )
  const weatherFalseUnderCandidate =
    weatherCarry &&
    tailScore >= (carryContext?.materialHrForce ? 48 : 54) &&
    (
      carryContext?.materialHrForce ||
      (
        Number(maxMistakeChaos || 0) >= 60 &&
        Number(maxRunClustering || 0) >= 70
      )
    )
  const noWeatherTailNeedsMistake =
    !weatherCarry &&
    Number(maxMistakeChaos || 0) < 62 &&
    Number(maxRunClustering || 0) < 78
  const noWeatherExtremeFork =
    !weatherCarry &&
    minLineupConversionValue <= 10 &&
    (
      Number(maxQuietFirst5 || 0) >= 0.5 ||
      maxDeadBatTraffic >= 0.38 ||
      maxTrafficNoConversion >= 0.25
    )
  const deadUnderForkCandidate =
    !weatherCarry &&
    Number(maxRunClustering || 0) >= 76 &&
    minLineupConversionValue <= 10 &&
    Number(maxQuietFirst5 || 0) >= 0.5
  const unsupportedOver =
    Number.isFinite(baseProjectedRuns) &&
    Number.isFinite(line) &&
    baseProjectedRuns > line &&
    tailScore < 52 &&
    !weatherCarry

  let tailLift = 0
  let strandDrag = 0
  let shape = 'balanced'
  let marketExpression = 'Pass'
  const notes = []

  if (catastropheCandidate || weatherFalseUnderCandidate) {
    shape =
      (forkScore >= 58 && !weatherCarry) || noWeatherTailNeedsMistake || noWeatherExtremeFork
        ? 'live-only fork'
        : 'over-tail'
    tailLift = clamp(
      (tailScore - 55) * 0.043 +
        (weatherCarry ? 0.42 : 0) +
        (weatherFalseUnderCandidate ? 1.1 : 0) +
        (carryContext?.materialHrForce ? (carryContext.extremeHrForce ? 0.9 : 0.55) : 0) +
        (weatherCarry && minLineupConversionValue <= 25 ? 0.35 : 0) +
        (lowLine ? 0.2 : 0),
      0.45,
      2.9
    )
    notes.push('fat-tail run environment')
	    if (weatherCarry) notes.push('carry/weather turns ordinary contact into extra-base risk')
	    if (envTotalContext?.weakGameTimeCarry) notes.push('game-time HRForce weakens daily carry')
	    if (envTotalContext?.carryFades) notes.push('HRForce carry fades after the early window')
	    if (envTotalContext?.highHrForce) notes.push(`ENV1 HRForce ${roundToTenths(envTotalContext.hrForce)}`)
	    if (ficCarryAllowed && ficTotalContext?.highHrForce) notes.push(`FIC HRForce ${roundToTenths(ficTotalContext.hrForce)}`)
    if (carryContext?.materialHrForce) notes.push('material HRForce blocks casual under')
    if (Number(maxRepeatOpponentFirst5Tax || 0) >= 0.25) notes.push('repeat-opponent starter damage tax')
    if (reliefTotalContext?.watchLateRunRisk && Number(reliefTotalContext.maxProjectedReliefOuts || 0) >= 11) {
      notes.push('RP2 bridge can enter the first-five window')
    }
    if (maxBigInningRate >= 0.58) notes.push('one-inning damage risk')
  }

  if (strandScore >= 58 && strandScore > tailScore + 8) {
    shape = 'strand-tail'
    strandDrag = clamp((strandScore - tailScore) * 0.04 + (weatherSuppress ? 0.28 : 0), 0.35, 2.15)
    notes.push('traffic can strand instead of score')
  } else if (unsupportedOver) {
    shape = 'unsupported-over'
    strandDrag = clamp(
      (52 - tailScore) * 0.04 +
        (lowLine ? 0.75 : 0.35) +
        clamp((30 - minLineupConversionValue) * 0.025, 0, 0.45),
      0.45,
      2.4
    )
    notes.push('projected over lacks catastrophe support')
  } else if (forkScore >= 58 && !weatherCarry) {
    shape = 'live-only fork'
    tailLift *= 0.55
    notes.push('both explosion and strand paths are live')
  }

  if (deadUnderForkCandidate && shape === 'balanced') {
    shape = 'live-only fork'
    notes.push('dead-start profile with run-cluster tail')
  }

  const adjustedProjectedRuns = roundToTenths(
    clamp(Number(baseProjectedRuns || 0) + tailLift - strandDrag, 1.4, 9.8)
  )
  const adjustedEdge = Number.isFinite(line) ? roundToTenths(adjustedProjectedRuns - line) : null

  if (Number.isFinite(adjustedEdge)) {
    if (shape === 'live-only fork') {
      marketExpression = 'Live-only'
    } else if (adjustedEdge >= (highLine ? 0.35 : 0.45)) {
      marketExpression = 'Over'
    } else if (adjustedEdge <= -0.45) {
      marketExpression = 'Under'
    }
  }

  return {
    baseProjectedRuns: roundToTenths(Number(baseProjectedRuns || 0)),
    adjustedProjectedRuns,
    adjustedEdge,
    marketExpression,
    shape,
    tailScore: roundToTenths(tailScore),
    strandScore: roundToTenths(strandScore),
    forkScore: roundToTenths(forkScore),
    tailLift: roundToTenths(tailLift),
    strandDrag: roundToTenths(strandDrag),
    notes: [...new Set(notes)].slice(0, 4),
    metrics: {
      maxMistakeChaos: Number.isFinite(maxMistakeChaos) ? roundToTenths(maxMistakeChaos) : null,
      maxRunClustering: Number.isFinite(maxRunClustering) ? roundToTenths(maxRunClustering) : null,
      maxBigInningRate: Number.isFinite(maxBigInningRate) ? roundToTenths(maxBigInningRate) : null,
      maxQuietFirst5: Number.isFinite(maxQuietFirst5) ? roundToTenths(maxQuietFirst5) : null,
      maxDeadBatTraffic: Number.isFinite(maxDeadBatTraffic) ? roundToTenths(maxDeadBatTraffic) : null,
      maxTrafficNoConversion: Number.isFinite(maxTrafficNoConversion) ? roundToTenths(maxTrafficNoConversion) : null,
      minLineupConversion: Number.isFinite(minLineupConversion) ? roundToTenths(minLineupConversion) : null,
      totalFirst5ProjectedHits: roundToTenths(totalFirst5Hits),
      weatherCarry,
      weatherSuppress,
      envRunDelta: envTotalContext ? roundToTenths(envTotalContext.expectedTotalRunsDelta) : null,
      envHitsDelta: envTotalContext ? roundToTenths(envTotalContext.expectedHitsDelta) : null,
      envHrDelta: envTotalContext ? roundToTenths(envTotalContext.expectedHrDelta) : null,
	      hrForce: envTotalContext?.hrForce != null ? roundToTenths(envTotalContext.hrForce) : null,
	      gameTimeHrForce: envTotalContext?.gameTimeHrForce != null ? roundToTenths(envTotalContext.gameTimeHrForce) : null,
	      earlyGameMaxHrForce: envTotalContext?.earlyGameMaxHrForce != null ? roundToTenths(envTotalContext.earlyGameMaxHrForce) : null,
	      hrForcePersistenceSignal: envTotalContext?.hrForcePersistenceSignal || null,
	      weakGameTimeCarry: Boolean(envTotalContext?.weakGameTimeCarry),
	      carryFades: Boolean(envTotalContext?.carryFades),
	      highHrForce: Boolean(envTotalContext?.highHrForce),
	      lowerWeatherCarry: Boolean(envTotalContext?.lowerWeatherCarry),
	      ficHrForce: ficTotalContext?.hrForce != null ? roundToTenths(ficTotalContext.hrForce) : null,
	      ficHighHrForce: Boolean(ficCarryAllowed && ficTotalContext?.highHrForce),
      materialHrForce: Boolean(carryContext?.materialHrForce),
      extremeHrForce: Boolean(carryContext?.extremeHrForce),
      carryMultiplier: carryContext?.carryMultiplier ?? null,
      ficHighHrForceSharePct: ficTotalContext?.highHrForceSharePct != null
        ? roundToTenths(ficTotalContext.highHrForceSharePct)
        : null,
      maxRp2BridgeStress: reliefTotalContext?.maxBridgeStressScore != null
        ? roundToTenths(reliefTotalContext.maxBridgeStressScore)
        : null,
      maxRp2ReliefRuns: reliefTotalContext?.maxProjectedReliefRunsAllowed != null
        ? roundToTenths(reliefTotalContext.maxProjectedReliefRunsAllowed)
        : null,
      rp2LateRunRisk: Boolean(reliefTotalContext?.watchLateRunRisk),
      maxRepeatOpponentFirst5Tax: Number.isFinite(maxRepeatOpponentFirst5Tax)
        ? roundToTenths(maxRepeatOpponentFirst5Tax)
        : null,
      visibilityRisk: Number.isFinite(visibilityRisk) ? roundToTenths(visibilityRisk) : null
    }
  }
}

const getPostedTotalLine = (game = {}) => {
  const sportsbookTotal = parseFirstTotalNumber(getTotalMarketValue(game.odds))
  if (Number.isFinite(sportsbookTotal)) return sportsbookTotal

  return parseFirstTotalNumber(game.lineupBoard?.marketWeatherContext?.total || '')
}

const getPostedFirst5TotalLine = (game = {}) => {
  const oddsMarket = game.odds?.markets?.find((market) => /(?:1st|first)\s*5.*total/i.test(String(market?.label || '')))
  const sportsbookFirst5Total = parseFirstTotalNumber(oddsMarket?.value || '')
  if (Number.isFinite(sportsbookFirst5Total)) return sportsbookFirst5Total

  return parseFirstTotalNumber(game.lineupBoard?.marketWeatherContext?.first5Total || '')
}

const finiteMetricValues = (items = [], key = '') =>
  items
    .map((item) => Number(item?.[key]))
    .filter(Number.isFinite)

const maxMetric = (items = [], key = '') => {
  const values = finiteMetricValues(items, key)
  return values.length ? Math.max(...values) : null
}

const minMetric = (items = [], key = '') => {
  const values = finiteMetricValues(items, key)
  return values.length ? Math.min(...values) : null
}

const avgMetric = (items = [], key = '') => {
  const values = finiteMetricValues(items, key)
  return values.length ? average(values) : null
}

const formatGatePct = (value) =>
  Number.isFinite(value) ? `${Math.round(value * 100)}%` : null

const buildTotalChaosGate = ({
  phase = 'full',
  totalLean = null,
  line = null,
  projectedHitProfiles = [],
  teamMistakeShapes = [],
  lineupConversionShapes = [],
  bullpenMistakeShapes = [],
  weatherProfile = null,
  environmentAdjustmentContext = null,
  ficDailyMatchupContext = null,
  reliefProjectionContexts = [],
  starterVsTeamContexts = []
}) => {
  const envTotalContext = buildEnvironmentTotalContext(environmentAdjustmentContext, weatherProfile)
  const ficTotalContext = buildFicDailyMatchupTotalContext(ficDailyMatchupContext)
  const reliefTotalContext = buildReliefProjectionTotalContext(reliefProjectionContexts)
  const repeatDamageContexts = starterVsTeamContexts.filter((context) => context?.repeatOpponentUnderWarning)
  const maxRepeatOpponentFirst5Tax = maxMetric(repeatDamageContexts, 'repeatOpponentFirst5Tax')
  const maxRepeatOpponentHitTax = maxMetric(repeatDamageContexts, 'repeatOpponentHitTax')
  const repeatOpponentDamage = Math.max(Number(maxRepeatOpponentFirst5Tax || 0), Number(maxRepeatOpponentHitTax || 0))
  const carryContext = buildCarryAdjustmentContext({
    environmentAdjustmentContext,
    weatherProfile,
    ficDailyMatchupContext
  })
  const lean = totalLean?.lean
  const edge = Number(totalLean?.edge)
  const absEdge = Math.abs(edge)
	  const weatherLabel = `${weatherProfile?.label || ''}`.toLowerCase()
	  const temperatureF = Number(weatherProfile?.temperatureF)
	  const windMph = Number(weatherProfile?.windMph)
	  const windDirection = `${weatherProfile?.windDirection || ''}`.toLowerCase()
	  const fullGameCarryAllowed = !envTotalContext?.weakOrFadingGameTimeCarry
	  const ficCarryAllowed = fullGameCarryAllowed
	  const weatherCarry =
	    !weatherProfile?.isDome &&
	    (
	      fullGameCarryAllowed &&
	      (
      /helps carry|wind .*out/.test(weatherLabel) ||
      /out/.test(windDirection) ||
      Number(weatherProfile?.runBoostFirst5 || 0) + Number(weatherProfile?.runBoostLate || 0) >= 0.008 ||
	        (Number.isFinite(temperatureF) && temperatureF >= 80) ||
	        envTotalContext?.highHrForce
	      ) ||
	      envTotalContext?.runLift ||
	      (ficCarryAllowed && ficTotalContext?.highHrForce) ||
	      carryContext?.materialHrForce
	    )
  const weatherSuppress =
    /suppresses carry|wind .*in/.test(weatherLabel) ||
    /in/.test(windDirection) ||
    Number(weatherProfile?.runBoostFirst5 || 0) + Number(weatherProfile?.runBoostLate || 0) <= -0.008 ||
    envTotalContext?.runDrag
  const crosswindVolatility =
    Number.isFinite(windMph) &&
    windMph >= 6 &&
    !/in|out/.test(windDirection) &&
    /[lr]/.test(windDirection)
  const maxMistakeChaos = maxMetric(teamMistakeShapes, 'mistakeChaosIndex')
  const maxRunClustering = maxMetric(teamMistakeShapes, 'runClusteringIndex')
  const maxEarlyMultiRunAllowed = maxMetric(teamMistakeShapes, 'earlyMultiRunAllowedRate')
  const maxOneBadInningAllowed = maxMetric(teamMistakeShapes, 'oneBadInningAllowedRate')
  const maxScorelessFirst3 = maxMetric(teamMistakeShapes, 'scorelessFirst3Rate')
  const maxTeamDeadBatTraffic = maxMetric(teamMistakeShapes, 'deadBatTrafficRate')
  const maxTeamTrafficNoConversion = maxMetric(teamMistakeShapes, 'trafficNoConversionRate')
  const maxBullpenMeltdown = maxMetric(teamMistakeShapes, 'bullpenMeltdownRate')
  const maxLineupDeadBatTraffic = maxMetric(lineupConversionShapes, 'deadBatTrafficRate')
  const maxLineupTrafficNoConversion = maxMetric(lineupConversionShapes, 'trafficNoConversionRate')
  const maxQuietFirst5 = maxMetric(lineupConversionShapes, 'quietFirst5Rate')
  const minLineupConversion = minMetric(lineupConversionShapes, 'lineupConversionIndex')
  const avgLineupConversion = avgMetric(lineupConversionShapes, 'lineupConversionIndex')
  const maxBullpenChaos = maxMetric(bullpenMistakeShapes, 'bullpenChaosIndex')
  const projectedHits = projectedHitProfiles
    .map((profile) => Number(profile?.projectedHits))
    .filter(Number.isFinite)
  const bothCreateTraffic = projectedHits.length >= 2 && projectedHits.every((hits) => hits >= 8.6)
  const oneTeamCreatesTraffic = projectedHits.some((hits) => hits >= 9.2)
  const lowLine = Number.isFinite(line) && line <= 7.5
  const highLine = Number.isFinite(line) && line >= 9
  const notes = []
  let overChaosScore = 0
  let underDragScore = 0

  if (Number.isFinite(maxMistakeChaos) && maxMistakeChaos >= 68) {
    overChaosScore += 2
    notes.push(`mistake-chaos ${Math.round(maxMistakeChaos)}`)
  } else if (Number.isFinite(maxMistakeChaos) && maxMistakeChaos >= 62) {
    overChaosScore += 1
  }

  if (
    (Number.isFinite(maxEarlyMultiRunAllowed) && maxEarlyMultiRunAllowed >= 0.55) ||
    (Number.isFinite(maxOneBadInningAllowed) && maxOneBadInningAllowed >= 0.55)
  ) {
    overChaosScore += 2
    notes.push(`one-bad-inning risk ${formatGatePct(Math.max(maxEarlyMultiRunAllowed || 0, maxOneBadInningAllowed || 0))}`)
  } else if (
    (Number.isFinite(maxEarlyMultiRunAllowed) && maxEarlyMultiRunAllowed >= 0.35) ||
    (Number.isFinite(maxOneBadInningAllowed) && maxOneBadInningAllowed >= 0.45)
  ) {
    overChaosScore += 1
  }

  if (Number.isFinite(maxRunClustering) && maxRunClustering >= 76) {
    overChaosScore += 1
    notes.push(`run-cluster index ${Math.round(maxRunClustering)}`)
  }

  if (Number.isFinite(maxBullpenMeltdown) && maxBullpenMeltdown >= 0.3) {
    overChaosScore += 1
  }

  if (Number.isFinite(maxBullpenChaos) && maxBullpenChaos >= 58) {
    overChaosScore += 1
  }

  if (weatherCarry) {
    overChaosScore += /out/.test(windDirection) || /wind .*out/.test(weatherLabel) ? 2 : 1
    notes.push(weatherProfile?.label || 'weather carry')
  }

	  if (envTotalContext?.highHrForce && !envTotalContext?.carryFades) {
	    overChaosScore += 2
	    notes.push(`ENV1 HRForce ${roundToTenths(envTotalContext.hrForce)}`)
	  } else if (envTotalContext?.weakGameTimeCarry) {
	    notes.push('game-time HRForce weakens daily carry')
	  } else if (envTotalContext?.carryFades) {
	    notes.push('HRForce carry fades after the early window')
	  } else if (envTotalContext?.runLift || envTotalContext?.hrLift) {
    overChaosScore += 1
    notes.push(`ENV1 run env ${formatSignedTenths(envTotalContext.expectedTotalRunsDelta)} R`)
  }

	  if (ficCarryAllowed && ficTotalContext?.highHrForce) {
	    overChaosScore += ficTotalContext.extremeHrForce ? 2 : 1
	    notes.push(`FIC HRForce ${roundToTenths(ficTotalContext.hrForce)}`)
  } else if (ficTotalContext?.runLift) {
    overChaosScore += 1
    notes.push('FIC matchup contact carry')
  }

  if (carryContext?.materialHrForce) {
    overChaosScore += carryContext.extremeHrForce ? 3 : 2
    notes.push(`material HRForce ${roundToTenths(carryContext.hrForce)}`)
  }

  if (repeatOpponentDamage >= 0.35) {
    overChaosScore += 2
    notes.push('repeat-opponent starter damage')
  } else if (repeatOpponentDamage >= 0.22) {
    overChaosScore += 1
    notes.push('repeat-opponent starter tax')
  }

  if (envTotalContext?.runDrag) {
    underDragScore += 1
    notes.push(`ENV1 run env ${formatSignedTenths(envTotalContext.expectedTotalRunsDelta)} R`)
  }

  if (reliefTotalContext?.highLateRunRisk && phase !== 'first5') {
    overChaosScore += 2
    notes.push(`RP2 bridge stress ${roundToTenths(reliefTotalContext.maxBridgeStressScore || 0)}`)
  } else if (reliefTotalContext?.watchLateRunRisk && phase !== 'first5') {
    overChaosScore += 1
    notes.push(`RP2 relief runs ${roundToTenths(reliefTotalContext.maxProjectedReliefRunsAllowed || 0)}`)
  } else if (
    reliefTotalContext?.watchLateRunRisk &&
    phase === 'first5' &&
    Number(reliefTotalContext.maxProjectedReliefOuts || 0) >= 11
  ) {
    overChaosScore += 1
    notes.push('RP2 bridge can enter early')
  }

  if (crosswindVolatility) {
    overChaosScore += 1
    notes.push(weatherProfile?.label || 'crosswind volatility')
  }

  if (bothCreateTraffic) {
    overChaosScore += 1
    notes.push('both offenses project traffic')
  } else if (oneTeamCreatesTraffic) {
    overChaosScore += 1
  }

  if (highLine && weatherCarry) overChaosScore += 1
  if (lowLine && Number.isFinite(maxMistakeChaos) && maxMistakeChaos >= 66) overChaosScore += 1

  if (Number.isFinite(maxQuietFirst5) && maxQuietFirst5 >= 0.5) {
    underDragScore += 2
    notes.push(`quiet-first-five ${formatGatePct(maxQuietFirst5)}`)
  } else if (Number.isFinite(maxQuietFirst5) && maxQuietFirst5 >= 0.38) {
    underDragScore += 1
  }

  if (Number.isFinite(maxScorelessFirst3) && maxScorelessFirst3 >= 0.55) {
    underDragScore += 1
    notes.push(`scoreless-first-three ${formatGatePct(maxScorelessFirst3)}`)
  }

  if (
    (Number.isFinite(maxLineupDeadBatTraffic) && maxLineupDeadBatTraffic >= 0.55) ||
    (Number.isFinite(maxTeamDeadBatTraffic) && maxTeamDeadBatTraffic >= 0.55)
  ) {
    underDragScore += 2
    notes.push(`dead-bat traffic ${formatGatePct(Math.max(maxLineupDeadBatTraffic || 0, maxTeamDeadBatTraffic || 0))}`)
  } else if (
    (Number.isFinite(maxLineupDeadBatTraffic) && maxLineupDeadBatTraffic >= 0.35) ||
    (Number.isFinite(maxTeamDeadBatTraffic) && maxTeamDeadBatTraffic >= 0.35)
  ) {
    underDragScore += 1
  }

  if (
    (Number.isFinite(maxLineupTrafficNoConversion) && maxLineupTrafficNoConversion >= 0.25) ||
    (Number.isFinite(maxTeamTrafficNoConversion) && maxTeamTrafficNoConversion >= 0.25)
  ) {
    underDragScore += 1
  }

  if (Number.isFinite(minLineupConversion) && minLineupConversion <= 22) {
    underDragScore += 1
    notes.push(`low conversion floor ${Math.round(minLineupConversion)}`)
  }

  if (Number.isFinite(avgLineupConversion) && avgLineupConversion <= 36) {
    underDragScore += 1
  }

  if (weatherSuppress) {
    underDragScore += /in/.test(windDirection) || /wind .*in/.test(weatherLabel) ? 2 : 1
    notes.push(weatherProfile?.label || 'weather suppresses carry')
  }

  const fullGameUnderLimit = overChaosScore >= 6 ? 1.8 : overChaosScore >= 4 ? 1.45 : 1.05
  const fullGameOverLimit = underDragScore >= 6 ? 1.6 : underDragScore >= 4 ? 1.25 : 0.9
  const first5Limit = phase === 'first5' ? 0.85 : 0.75
  const carryUnderLimit =
    carryContext?.extremeHrForce
      ? phase === 'full'
        ? 3
        : 1.55
      : carryContext?.materialHrForce
        ? phase === 'full'
          ? 2.2
          : 1.25
        : 0
  const repeatUnderLimit =
    repeatOpponentDamage >= 0.35
      ? phase === 'full'
        ? 1.45
        : 0.95
      : repeatOpponentDamage >= 0.22
        ? phase === 'full'
          ? 1.2
          : 0.85
        : 0
  const underVetoLimit = phase === 'full'
    ? Math.max(fullGameUnderLimit, carryUnderLimit, repeatUnderLimit)
    : Math.max(first5Limit, carryUnderLimit, repeatUnderLimit)
  const envUnderConflict =
    lean === 'Under' &&
    Number.isFinite(absEdge) &&
    (
	      envTotalContext?.highHrForce ||
	      envTotalContext?.runLift ||
	      envTotalContext?.hrLift ||
	      (ficCarryAllowed && ficTotalContext?.highHrForce)
    ) &&
    absEdge <= (
      carryContext?.extremeHrForce
        ? phase === 'full'
          ? 3
          : 1.55
        : carryContext?.materialHrForce
          ? phase === 'full'
            ? 2.2
            : 1.25
          : phase === 'full'
            ? 1.35
            : phase === 'first5'
              ? 0.9
              : 0.8
    )
  const rp2UnderConflict =
    lean === 'Under' &&
    Number.isFinite(absEdge) &&
    reliefTotalContext?.watchLateRunRisk &&
    absEdge <= (phase === 'full' ? 1.25 : phase === 'late' ? 0.9 : 0.7) &&
    (phase !== 'first5' || Number(reliefTotalContext.maxProjectedReliefOuts || 0) >= 11)
  const repeatOpponentUnderConflict =
    lean === 'Under' &&
    Number.isFinite(absEdge) &&
    repeatOpponentDamage >= 0.22 &&
    absEdge <= (phase === 'full' ? 1.35 : phase === 'first5' ? 0.85 : 0.75)
  const underVeto =
    lean === 'Under' &&
    Number.isFinite(absEdge) &&
    (overChaosScore >= 4 || envUnderConflict || rp2UnderConflict || repeatOpponentUnderConflict) &&
    absEdge <= underVetoLimit
  const overVeto =
    lean === 'Over' &&
    Number.isFinite(absEdge) &&
    underDragScore >= 4 &&
    absEdge <= (phase === 'full' ? fullGameOverLimit : first5Limit)
  const warning =
    lean === 'Under'
      ? overChaosScore >= 3 || envUnderConflict || rp2UnderConflict || repeatOpponentUnderConflict
      : lean === 'Over'
        ? underDragScore >= 3
        : overChaosScore >= 3 || underDragScore >= 3
  const vetoKind =
    underVeto && (envUnderConflict || rp2UnderConflict || repeatOpponentUnderConflict)
      ? 'addendum'
      : underVeto || overVeto
        ? 'chaos'
        : null

  return {
    phase,
    overChaosScore,
    underDragScore,
    warning,
    vetoed: underVeto || overVeto,
    vetoKind,
    vetoReason:
      underVeto && envUnderConflict
	        ? ficCarryAllowed && ficTotalContext?.highHrForce && !(envTotalContext?.highHrForce || envTotalContext?.runLift || envTotalContext?.hrLift)
          ? 'FIC matchup HR/run carry conflicts with a fragile under'
          : 'ENV1/FIC HR-run carry conflicts with a fragile under'
        : underVeto && rp2UnderConflict
          ? 'RP2 bridge stress leaves late-scoring risk against a fragile under'
        : underVeto && repeatOpponentUnderConflict
          ? 'repeat-opponent starter damage conflicts with a fragile under'
        : underVeto
        ? 'under exposed to mistake-chaos and one-big-inning risk'
        : overVeto
          ? 'over exposed to quiet-start and traffic-without-conversion risk'
          : '',
    notes: [...new Set(notes.filter(Boolean))].slice(0, 5),
    metrics: {
      maxMistakeChaos: Number.isFinite(maxMistakeChaos) ? roundToTenths(maxMistakeChaos) : null,
      maxRunClustering: Number.isFinite(maxRunClustering) ? roundToTenths(maxRunClustering) : null,
      maxEarlyMultiRunAllowed: Number.isFinite(maxEarlyMultiRunAllowed) ? maxEarlyMultiRunAllowed : null,
      maxOneBadInningAllowed: Number.isFinite(maxOneBadInningAllowed) ? maxOneBadInningAllowed : null,
      maxQuietFirst5: Number.isFinite(maxQuietFirst5) ? maxQuietFirst5 : null,
      maxDeadBatTraffic: Number.isFinite(Math.max(maxLineupDeadBatTraffic || 0, maxTeamDeadBatTraffic || 0))
        ? Math.max(maxLineupDeadBatTraffic || 0, maxTeamDeadBatTraffic || 0)
        : null,
      minLineupConversion: Number.isFinite(minLineupConversion) ? roundToTenths(minLineupConversion) : null,
      weatherCarry,
      weatherSuppress,
      envRunDelta: envTotalContext ? roundToTenths(envTotalContext.expectedTotalRunsDelta) : null,
	      envHitsDelta: envTotalContext ? roundToTenths(envTotalContext.expectedHitsDelta) : null,
	      envHrDelta: envTotalContext ? roundToTenths(envTotalContext.expectedHrDelta) : null,
	      hrForce: envTotalContext?.hrForce != null ? roundToTenths(envTotalContext.hrForce) : null,
	      gameTimeHrForce: envTotalContext?.gameTimeHrForce != null ? roundToTenths(envTotalContext.gameTimeHrForce) : null,
	      earlyGameMaxHrForce: envTotalContext?.earlyGameMaxHrForce != null ? roundToTenths(envTotalContext.earlyGameMaxHrForce) : null,
	      hrForcePersistenceSignal: envTotalContext?.hrForcePersistenceSignal || null,
	      weakGameTimeCarry: Boolean(envTotalContext?.weakGameTimeCarry),
	      carryFades: Boolean(envTotalContext?.carryFades),
	      highHrForce: Boolean(envTotalContext?.highHrForce),
	      lowerWeatherCarry: Boolean(envTotalContext?.lowerWeatherCarry),
	      ficHrForce: ficTotalContext?.hrForce != null ? roundToTenths(ficTotalContext.hrForce) : null,
	      ficHighHrForce: Boolean(ficCarryAllowed && ficTotalContext?.highHrForce),
      materialHrForce: Boolean(carryContext?.materialHrForce),
      extremeHrForce: Boolean(carryContext?.extremeHrForce),
      carryMultiplier: carryContext?.carryMultiplier ?? null,
      ficHighHrForceSharePct: ficTotalContext?.highHrForceSharePct != null
        ? roundToTenths(ficTotalContext.highHrForceSharePct)
        : null,
      maxRp2BridgeStress: reliefTotalContext?.maxBridgeStressScore != null
        ? roundToTenths(reliefTotalContext.maxBridgeStressScore)
        : null,
      maxRp2ReliefRuns: reliefTotalContext?.maxProjectedReliefRunsAllowed != null
        ? roundToTenths(reliefTotalContext.maxProjectedReliefRunsAllowed)
        : null,
      rp2LateRunRisk: Boolean(reliefTotalContext?.watchLateRunRisk),
      maxRepeatOpponentFirst5Tax: Number.isFinite(maxRepeatOpponentFirst5Tax)
        ? roundToTenths(maxRepeatOpponentFirst5Tax)
        : null,
      maxRepeatOpponentHitTax: Number.isFinite(maxRepeatOpponentHitTax)
        ? roundToTenths(maxRepeatOpponentHitTax)
        : null
    }
  }
}

const applyTotalChaosGate = (totalLean, inputs = {}) => {
  const gate = buildTotalChaosGate({ totalLean, ...inputs })

  if (!gate.vetoed || totalLean?.lean === 'Pass') {
    return {
      ...totalLean,
      chaosGate: gate
    }
  }

  const line = inputs.line
  const noteText = gate.notes.length ? ` (${gate.notes.join('; ')})` : ''

  return {
    ...totalLean,
    lean: 'Pass',
    strength: gate.vetoKind === 'addendum' ? 'ENV/RP2 veto' : 'Chaos veto',
    label: Number.isFinite(line) ? `Hold ${line}` : 'Hold total',
    summary: `${totalLean.summary} ${gate.vetoKind === 'addendum' ? 'ENV/RP2 addendum' : 'Chaos gate'} veto: ${gate.vetoReason}${noteText}.`,
    originalLean: totalLean.lean,
    originalStrength: totalLean.strength,
    originalLabel: totalLean.label,
    chaosGate: gate
  }
}

const buildFirstInningRunProfile = ({
  projectedRunProfile = null,
  teamName = '',
  opposingTeamName = '',
  teamScript = null,
  lineupProfile = null,
  hitterState = null,
  teamState = null,
  teamFirstInningProfile = null,
  teamSeriesEarlyProfile = null,
  opposingSeriesEarlyProfile = null,
  opposingTeamFirstInningProfile = null,
  opposingPitcherFirstInningProfile = null,
  opposingPitcherFirstInningSeasonProfile = null,
  opposingPitcherWarProfile = null,
  opposingStarter = null,
  weatherProfile = null,
  environmentAdjustmentContext = null,
  ficDailyMatchupTeamContext = null
}) => {
  if (!projectedRunProfile && !teamFirstInningProfile && !opposingPitcherFirstInningProfile) {
    return {
      projectedRuns: null,
      runProbability: null,
      firstInningShare: null
    }
  }

  const topThirdScore = Number(lineupProfile?.topThirdScore ?? teamScript?.topThirdScore ?? 50)
  const starterPressureIndex = Number(lineupProfile?.starterPressureIndex ?? 50)
  const overallPressureIndex = Number(lineupProfile?.overallPressureIndex ?? 50)
  const pitchTypePressureIndex = Number(lineupProfile?.pitchTypePressureIndex ?? 50)
  const starterMatchupKernelIndex = Number(lineupProfile?.starterMatchupKernelIndex ?? 50)
  const platoonPressureIndex = Number(lineupProfile?.platoonPressureIndex ?? 50)
  const handednessSplitIndex = Number(lineupProfile?.handednessSplitIndex ?? lineupProfile?.handednessSplitProfile?.index ?? 50)
  const topThirdStrongSplitCount = Number(
    lineupProfile?.topThirdStrongSplitCount ?? lineupProfile?.handednessSplitProfile?.topThirdStrongSplitCount ?? 0
  )
  const topThirdWeakSplitCount = Number(
    lineupProfile?.topThirdWeakSplitCount ?? lineupProfile?.handednessSplitProfile?.topThirdWeakSplitCount ?? 0
  )
  const top6HeatIndex = Number(hitterState?.top6HeatIndex ?? 50)
  const top6PressureIndex = Number(hitterState?.top6PressureIndex ?? 50)
  const top6ColdIndex = Number(hitterState?.top6ColdIndex ?? 50)
  const firstInningJoltCountLast5 = Number(teamState?.firstInningJoltCountLast5 ?? 0)
  const quietFirst5CountLast5 = Number(teamState?.quietFirst5CountLast5 ?? 0)
  const snapbackPressureIndex = Number(teamState?.snapbackPressureIndex ?? 50)
  const teamScoredRate = Number(teamFirstInningProfile?.scoredFirstInningRate)
  const teamScorelessRate = Number(teamFirstInningProfile?.scorelessFirstInningRate)
  const teamRunsPerGame = Number(teamFirstInningProfile?.firstInningRunsPerGame)
  const teamMultiRunRate = Number(teamFirstInningProfile?.firstInningMultiRunRate)
  const teamScoringIndex = Number(teamFirstInningProfile?.firstInningScoringIndex)
  const opposingTeamAllowedRate = Number(opposingTeamFirstInningProfile?.allowedFirstInningRate)
  const opposingTeamRunsAllowedPerGame = Number(opposingTeamFirstInningProfile?.firstInningRunsAllowedPerGame)
  const opposingTeamNrfiRate = Number(opposingTeamFirstInningProfile?.nrfiGameRate)
  const seriesGamesSample = Number(teamSeriesEarlyProfile?.gamesSample || 0) || 0
  const seriesScoredRate = Number(teamSeriesEarlyProfile?.scoredFirstInningRate)
  const seriesAllowedRate = Number(opposingSeriesEarlyProfile?.allowedFirstInningRate)
  const seriesRunsFirst1PerGame = Number(teamSeriesEarlyProfile?.runsFirst1PerGame)
  const seriesRunsFirst3PerGame = Number(teamSeriesEarlyProfile?.runsFirst3PerGame)
  const seriesScorelessFirst3Rate = Number(teamSeriesEarlyProfile?.scorelessFirst3Rate)
  const seriesTrafficNoConversionRate = Number(teamSeriesEarlyProfile?.trafficNoConversionRate)
  const opposingPitcherAllowedRate = Number(opposingPitcherFirstInningProfile?.firstInningRunAllowedRate)
  const opposingPitcherRunsAllowedPerStart = Number(
    opposingPitcherFirstInningProfile?.firstInningRunsAllowedPerStart
  )
  const opposingPitcherStartsSample = Number(opposingPitcherFirstInningProfile?.startsSample || 0) || 0
  const opposingPitcherFirstBatterReachRate = Number(
    opposingPitcherFirstInningProfile?.firstBatterReachRate
  )
  const opposingPitcherWalkRate = Number(opposingPitcherFirstInningProfile?.firstInningWalkRate)
  const opposingPitcherHomeRunRate = Number(opposingPitcherFirstInningProfile?.firstInningHomeRunRate)
  const opposingPitcherCleanRate = Number(opposingPitcherFirstInningProfile?.firstInningCleanRate)
  const opposingPitcherPressureIndex = Number(
    opposingPitcherFirstInningProfile?.firstInningPressureIndex
  )
  const opposingPitcherSeasonStartsSample = Number(
    opposingPitcherFirstInningSeasonProfile?.startsSample || 0
  ) || 0
  const opposingPitcherSeasonRunGameRate = Number(
    opposingPitcherFirstInningSeasonProfile?.firstInningRunGameRate
  )
  const opposingPitcherSeasonRunsAllowedPerStart = Number(
    opposingPitcherFirstInningSeasonProfile?.firstInningRunsAllowedPerStart
  )
  const opposingPitcherSeasonWalkGameRate = Number(
    opposingPitcherFirstInningSeasonProfile?.firstInningWalkGames
  )
  const opposingPitcherSeasonHomeRunGameRate = Number(
    opposingPitcherFirstInningSeasonProfile?.firstInningHomeRunGames
  )
  const opposingPitcherCurrentWar = Number(opposingPitcherWarProfile?.currentSeasonWar)
  const opposingPitcherCurrentWarGamesStarted = Number(
    opposingPitcherWarProfile?.currentSeasonGamesStarted || 0
  ) || 0
  const opposingPitcherPreviousWar = Number(opposingPitcherWarProfile?.previousSeasonWar)
  const opposingPitcherPreviousWarGamesStarted = Number(
    opposingPitcherWarProfile?.previousSeasonGamesStarted || 0
  ) || 0
  const opposingPitcherWarDelta = Number(opposingPitcherWarProfile?.warDelta)
  const projectedBaselineRuns = Number.isFinite(projectedRunProfile?.first5Runs)
    ? projectedRunProfile.first5Runs * 0.19
    : null
  const projectedBaselineProbability = Number.isFinite(projectedBaselineRuns)
    ? 1 - Math.exp(-projectedBaselineRuns)
    : null
  const envFirstInningContext = buildEnvironmentFirstInningContext(
    environmentAdjustmentContext,
    weatherProfile,
    ficDailyMatchupTeamContext
  )
  const starterWeatherAdjustment = buildStarterWeatherAdjustment({
    starter: opposingStarter,
    weatherProfile,
    environmentAdjustmentContext,
    ficDailyMatchupContext: ficDailyMatchupTeamContext
  })

  let projectedRunsNumerator = 0
  let projectedRunsWeight = 0

  if (Number.isFinite(teamRunsPerGame)) {
    projectedRunsNumerator += teamRunsPerGame * 0.46
    projectedRunsWeight += 0.46
  }
  if (Number.isFinite(opposingPitcherRunsAllowedPerStart)) {
    projectedRunsNumerator += opposingPitcherRunsAllowedPerStart * 0.28
    projectedRunsWeight += 0.28
  }
  const opposingPitcherSeasonReliability = clamp(opposingPitcherSeasonStartsSample / 8, 0.25, 1)
  if (Number.isFinite(opposingPitcherSeasonRunsAllowedPerStart)) {
    projectedRunsNumerator +=
      opposingPitcherSeasonRunsAllowedPerStart * (0.18 * opposingPitcherSeasonReliability)
    projectedRunsWeight += 0.18 * opposingPitcherSeasonReliability
  }
  if (Number.isFinite(opposingTeamRunsAllowedPerGame)) {
    projectedRunsNumerator += opposingTeamRunsAllowedPerGame * 0.18
    projectedRunsWeight += 0.18
  }
  if (Number.isFinite(projectedBaselineRuns)) {
    projectedRunsNumerator += projectedBaselineRuns * 0.08
    projectedRunsWeight += 0.08
  }

  let runProbabilityNumerator = 0
  let runProbabilityWeight = 0
  const opposingPitcherReliability = clamp(opposingPitcherStartsSample / 5, 0.2, 1)

  if (Number.isFinite(teamScoredRate)) {
    runProbabilityNumerator += teamScoredRate * 0.5
    runProbabilityWeight += 0.5
  }
  if (Number.isFinite(opposingPitcherAllowedRate)) {
    runProbabilityNumerator += opposingPitcherAllowedRate * (0.26 * opposingPitcherReliability)
    runProbabilityWeight += 0.26 * opposingPitcherReliability
  }
  if (Number.isFinite(opposingPitcherSeasonRunGameRate)) {
    runProbabilityNumerator +=
      opposingPitcherSeasonRunGameRate * (0.22 * opposingPitcherSeasonReliability)
    runProbabilityWeight += 0.22 * opposingPitcherSeasonReliability
  }
  if (Number.isFinite(opposingTeamAllowedRate)) {
    runProbabilityNumerator += opposingTeamAllowedRate * 0.16
    runProbabilityWeight += 0.16
  }
  if (Number.isFinite(projectedBaselineProbability)) {
    runProbabilityNumerator += projectedBaselineProbability * 0.08
    runProbabilityWeight += 0.08
  }
  if (seriesGamesSample >= 2 && Number.isFinite(seriesScoredRate)) {
    runProbabilityNumerator += seriesScoredRate * 0.34
    runProbabilityWeight += 0.34
  }
  if (seriesGamesSample >= 2 && Number.isFinite(seriesAllowedRate)) {
    runProbabilityNumerator += seriesAllowedRate * 0.18
    runProbabilityWeight += 0.18
  }

  if (!projectedRunsWeight && !runProbabilityWeight) {
    return {
      projectedRuns: null,
      runProbability: null,
      firstInningShare: null
    }
  }

  let projectedRuns =
    projectedRunsWeight > 0 ? projectedRunsNumerator / projectedRunsWeight : projectedBaselineRuns ?? 0.2
  let runProbability =
    runProbabilityWeight > 0 ? runProbabilityNumerator / runProbabilityWeight : projectedBaselineProbability ?? 0.2

  const supportingReasons = []
  const suppressingReasons = []

  if (Number.isFinite(teamScoredRate)) {
    if (teamScoredRate >= 0.35) {
      supportingReasons.push(`${teamName} are scoring in the 1st ${roundToTenths(teamScoredRate * 100)}% lately`)
    } else if (teamScoredRate <= 0.15) {
      suppressingReasons.push(`${teamName} are only scoring in the 1st ${roundToTenths(teamScoredRate * 100)}% lately`)
    }
  }
  if (Number.isFinite(teamScorelessRate) && teamScorelessRate >= 0.75) {
    suppressingReasons.push(`${teamName} stay scoreless in the 1st ${roundToTenths(teamScorelessRate * 100)}% of recent games`)
  }
  if (Number.isFinite(teamScoringIndex) && teamScoringIndex >= 62) {
    supportingReasons.push(`${teamName} carry a live early scoring index (${roundToTenths(teamScoringIndex)})`)
  }
  if (Number.isFinite(topThirdScore) && topThirdScore >= 62) {
    supportingReasons.push(`${teamName} top order is driving early pressure (${roundToTenths(topThirdScore)})`)
  }
  if (Number.isFinite(handednessSplitIndex) && handednessSplitIndex >= 62) {
    supportingReasons.push(`${teamName} handedness splits fit the starter (${roundToTenths(handednessSplitIndex)})`)
  } else if (Number.isFinite(handednessSplitIndex) && handednessSplitIndex <= 40) {
    suppressingReasons.push(`${teamName} handedness splits are weak against the starter (${roundToTenths(handednessSplitIndex)})`)
  }
  if (Number.isFinite(starterMatchupKernelIndex) && starterMatchupKernelIndex >= 62) {
    supportingReasons.push(`${teamName} batter-vs-starter kernel fits (${roundToTenths(starterMatchupKernelIndex)})`)
  } else if (Number.isFinite(starterMatchupKernelIndex) && starterMatchupKernelIndex <= 40) {
    suppressingReasons.push(`${teamName} batter-vs-starter kernel is suppressive (${roundToTenths(starterMatchupKernelIndex)})`)
  }
  if (topThirdStrongSplitCount >= 2) {
    supportingReasons.push(`${teamName} top third has multiple strong split bats`)
  } else if (topThirdWeakSplitCount >= 2) {
    suppressingReasons.push(`${teamName} top third carries weak split rows`)
  }
  if (Number.isFinite(top6HeatIndex) && top6HeatIndex >= 58) {
    supportingReasons.push(`${teamName} top six bats are running hot (${roundToTenths(top6HeatIndex)})`)
  }
  if (Number.isFinite(top6ColdIndex) && top6ColdIndex >= 58) {
    suppressingReasons.push(`${teamName} top six bats are cold (${roundToTenths(top6ColdIndex)})`)
  }
  if (Number.isFinite(opposingPitcherAllowedRate) && opposingPitcherStartsSample >= 2) {
    if (opposingPitcherAllowedRate >= 0.4) {
      supportingReasons.push(
        `${opposingTeamName} starter has leaked 1st-inning runs in ${roundToTenths(opposingPitcherAllowedRate * 100)}% of recent starts`
      )
    } else if (opposingPitcherAllowedRate <= 0.1) {
      suppressingReasons.push(
        `${opposingTeamName} starter has stayed clean in the 1st across recent starts`
      )
    }
  }
  if (Number.isFinite(opposingPitcherSeasonRunGameRate) && opposingPitcherSeasonStartsSample >= 3) {
    if (
      opposingPitcherSeasonRunGameRate >= 0.25 ||
      (Number.isFinite(opposingPitcherSeasonRunsAllowedPerStart) && opposingPitcherSeasonRunsAllowedPerStart >= 0.5)
    ) {
      supportingReasons.push(
        `${opposingTeamName} starter has real season 1st-inning damage (${roundToTenths(opposingPitcherSeasonRunGameRate * 100)}% run games, ${roundToTenths(opposingPitcherSeasonRunsAllowedPerStart)}/start)`
      )
    } else if (
      opposingPitcherSeasonRunGameRate <= 0.12 &&
      Number.isFinite(opposingPitcherSeasonRunsAllowedPerStart) &&
      opposingPitcherSeasonRunsAllowedPerStart <= 0.35
    ) {
      suppressingReasons.push(
        `${opposingTeamName} starter season line is clean early (${roundToTenths(opposingPitcherSeasonRunGameRate * 100)}% run games, ${roundToTenths(opposingPitcherSeasonRunsAllowedPerStart)}/start)`
      )
    }
  }
  if (Number.isFinite(opposingPitcherCurrentWar) && opposingPitcherCurrentWarGamesStarted >= 4) {
    if (opposingPitcherCurrentWar >= 1) {
      suppressingReasons.push(
        `${opposingTeamName} starter is in the green this year (${roundToTenths(opposingPitcherCurrentWar)} WAR)`
      )
    } else if (opposingPitcherCurrentWar <= -0.4) {
      supportingReasons.push(
        `${opposingTeamName} starter is underwater this year (${roundToTenths(opposingPitcherCurrentWar)} WAR)`
      )
    }
  }
  if (Number.isFinite(opposingPitcherPreviousWar) && opposingPitcherPreviousWarGamesStarted >= 8) {
    if (opposingPitcherPreviousWar >= 2) {
      suppressingReasons.push(
        `${opposingTeamName} starter carried a real green season last year (${roundToTenths(opposingPitcherPreviousWar)} WAR)`
      )
    } else if (opposingPitcherPreviousWar <= 0) {
      supportingReasons.push(
        `${opposingTeamName} starter did not carry positive WAR last year`
      )
    }
  }
  if (Number.isFinite(opposingPitcherWarDelta) && opposingPitcherCurrentWarGamesStarted >= 4) {
    if (opposingPitcherWarDelta <= -1.5) {
      supportingReasons.push(
        `${opposingTeamName} starter has slipped hard from last year (${roundToTenths(opposingPitcherWarDelta)} WAR delta)`
      )
    } else if (opposingPitcherWarDelta >= 0.8 && Number.isFinite(opposingPitcherCurrentWar) && opposingPitcherCurrentWar > 0) {
      suppressingReasons.push(
        `${opposingTeamName} starter has improved sharply from last year (${roundToTenths(opposingPitcherWarDelta)} WAR delta)`
      )
    }
  }
  if (Number.isFinite(opposingTeamAllowedRate) && opposingTeamAllowedRate >= 0.35) {
    supportingReasons.push(`${opposingTeamName} are allowing a 1st-inning run ${roundToTenths(opposingTeamAllowedRate * 100)}% lately`)
  }
  if (Number.isFinite(opposingTeamNrfiRate) && opposingTeamNrfiRate >= 0.65) {
    suppressingReasons.push(`${opposingTeamName} games have stayed NRFI ${roundToTenths(opposingTeamNrfiRate * 100)}% lately`)
  }
  if (seriesGamesSample >= 2 && Number.isFinite(seriesScoredRate) && Number.isFinite(seriesRunsFirst3PerGame)) {
    if (seriesScoredRate === 0 && seriesRunsFirst3PerGame <= 0.5) {
      suppressingReasons.push(`${teamName} have been dead early in this series`)
    } else if (seriesScoredRate >= 0.5 || seriesRunsFirst3PerGame >= 1) {
      supportingReasons.push(`${teamName} have already shown early scoring life in this series`)
    }
  }
  if (seriesGamesSample >= 2 && Number.isFinite(seriesTrafficNoConversionRate) && seriesTrafficNoConversionRate >= 0.3) {
    suppressingReasons.push(`${teamName} have been stranding early traffic in this series`)
  }
  if (Number.isFinite(weatherProfile?.runBoostFirst5) && Number(weatherProfile.runBoostFirst5) >= 0.05) {
    supportingReasons.push(`weather is adding early run carry`)
  }
  if (envFirstInningContext?.reason || Array.isArray(envFirstInningContext?.reasons)) {
    const envReasons = Array.isArray(envFirstInningContext?.reasons)
      ? envFirstInningContext.reasons
      : [envFirstInningContext.reason]
    if (Number(envFirstInningContext.probabilityLift || 0) >= 0) {
      supportingReasons.push(...envReasons.filter(Boolean))
    } else {
      suppressingReasons.push(...envReasons.filter(Boolean))
    }
  }
  if (starterWeatherAdjustment?.active && starterWeatherAdjustment.reasons?.length) {
    const reason = `${opposingTeamName} starter weather fit: ${starterWeatherAdjustment.reasons[0]}`
    if (Number(starterWeatherAdjustment.firstInningProbabilityDelta || 0) >= 0) {
      supportingReasons.push(reason)
    } else {
      suppressingReasons.push(reason)
    }
  }

  runProbability += Math.max(topThirdScore - 50, 0) * 0.0015
  runProbability += Math.max(starterPressureIndex - 50, 0) * 0.001
  runProbability += Math.max(overallPressureIndex - 50, 0) * 0.00045
  runProbability += Math.max(pitchTypePressureIndex - 50, 0) * 0.00035
  runProbability += Math.max(starterMatchupKernelIndex - 50, 0) * 0.0004
  runProbability -= Math.max(50 - starterMatchupKernelIndex, 0) * 0.00025
  runProbability += Math.max(platoonPressureIndex - 50, 0) * 0.00035
  runProbability += Math.max(handednessSplitIndex - 50, 0) * 0.00055
  runProbability -= Math.max(50 - handednessSplitIndex, 0) * 0.00035
  runProbability += topThirdStrongSplitCount * 0.006
  runProbability -= topThirdWeakSplitCount * 0.004
  runProbability += Math.max(top6HeatIndex - 50, 0) * 0.0004
  runProbability += Math.max(top6PressureIndex - 50, 0) * 0.00045
  runProbability -= Math.max(top6ColdIndex - 50, 0) * 0.00075
  runProbability += firstInningJoltCountLast5 * 0.005
  runProbability -= quietFirst5CountLast5 * 0.008
  runProbability += Math.max(snapbackPressureIndex - 55, 0) * 0.00025
  runProbability += Number.isFinite(teamMultiRunRate) ? teamMultiRunRate * 0.04 : 0
  runProbability += Number.isFinite(teamScoringIndex)
    ? Math.max(teamScoringIndex - 50, 0) * 0.0012
    : 0
  runProbability += Number.isFinite(opposingPitcherPressureIndex)
    ? Math.max(opposingPitcherPressureIndex - 50, 0) * 0.0022 * opposingPitcherReliability
    : 0
  runProbability += Number.isFinite(opposingPitcherFirstBatterReachRate)
    ? Math.max(opposingPitcherFirstBatterReachRate - 0.33, 0) * 0.16 * opposingPitcherReliability
    : 0
  runProbability += Number.isFinite(opposingPitcherWalkRate)
    ? Math.max(opposingPitcherWalkRate - 0.18, 0) * 0.08 * opposingPitcherReliability
    : 0
  runProbability += Number.isFinite(opposingPitcherHomeRunRate)
    ? Math.max(opposingPitcherHomeRunRate - 0.08, 0) * 0.08 * opposingPitcherReliability
    : 0
  runProbability += Number.isFinite(opposingPitcherSeasonRunGameRate)
    ? Math.max(opposingPitcherSeasonRunGameRate - 0.18, 0) *
      0.12 *
      opposingPitcherSeasonReliability
    : 0
  runProbability += Number.isFinite(opposingPitcherSeasonWalkGameRate) &&
    opposingPitcherSeasonStartsSample > 0
    ? Math.max(
        opposingPitcherSeasonWalkGameRate / opposingPitcherSeasonStartsSample - 0.1,
        0
      ) *
      0.05 *
      opposingPitcherSeasonReliability
    : 0
  runProbability += Number.isFinite(opposingPitcherSeasonHomeRunGameRate) &&
    opposingPitcherSeasonStartsSample > 0
    ? Math.max(
        opposingPitcherSeasonHomeRunGameRate / opposingPitcherSeasonStartsSample - 0.05,
        0
      ) *
      0.08 *
      opposingPitcherSeasonReliability
    : 0
  runProbability -= Number.isFinite(opposingPitcherCurrentWar) && opposingPitcherCurrentWarGamesStarted >= 4
    ? Math.min(0.05, Math.max(opposingPitcherCurrentWar, 0) * 0.018)
    : 0
  runProbability += Number.isFinite(opposingPitcherCurrentWar) && opposingPitcherCurrentWarGamesStarted >= 4
    ? Math.min(0.05, Math.max(-opposingPitcherCurrentWar, 0) * 0.02)
    : 0
  runProbability -= Number.isFinite(opposingPitcherPreviousWar) && opposingPitcherPreviousWarGamesStarted >= 10
    ? Math.min(0.025, Math.max(opposingPitcherPreviousWar - 1.5, 0) * 0.006)
    : 0
  runProbability += Number.isFinite(opposingPitcherPreviousWar) && opposingPitcherPreviousWarGamesStarted >= 10
    ? Math.min(0.02, Math.max(0.5 - opposingPitcherPreviousWar, 0) * 0.01)
    : 0
  runProbability += Number.isFinite(opposingPitcherWarDelta) && opposingPitcherCurrentWarGamesStarted >= 4
    ? Math.min(0.03, Math.max(-opposingPitcherWarDelta - 0.8, 0) * 0.01)
    : 0
  runProbability -= Number.isFinite(opposingPitcherWarDelta) && opposingPitcherCurrentWarGamesStarted >= 4
    ? Math.min(0.02, Math.max(opposingPitcherWarDelta - 0.8, 0) * 0.008)
    : 0
  runProbability -= Number.isFinite(teamScoredRate)
    ? Math.max(0.25 - teamScoredRate, 0) * 0.55
    : 0
  runProbability -= Number.isFinite(teamScorelessRate)
    ? Math.max(teamScorelessRate - 0.7, 0) * 0.12
    : 0
  runProbability -= Number.isFinite(opposingTeamNrfiRate)
    ? Math.max(opposingTeamNrfiRate - 0.5, 0) * 0.08
    : 0
  runProbability -= Number.isFinite(opposingPitcherCleanRate)
    ? Math.max(opposingPitcherCleanRate - 0.55, 0) * 0.1 * opposingPitcherReliability
    : 0

  if (seriesGamesSample >= 2 && Number.isFinite(seriesScoredRate)) {
    runProbability -= Math.max(0.2 - seriesScoredRate, 0) * 0.7
    if (seriesScoredRate === 0) runProbability -= 0.12
  }
  if (seriesGamesSample >= 2 && Number.isFinite(seriesRunsFirst1PerGame)) {
    runProbability -= Math.max(0.35 - seriesRunsFirst1PerGame, 0) * 0.12
  }
  if (seriesGamesSample >= 2 && Number.isFinite(seriesRunsFirst3PerGame)) {
    runProbability -= Math.max(0.8 - seriesRunsFirst3PerGame, 0) * 0.07
  }
  if (seriesGamesSample >= 2 && Number.isFinite(seriesScorelessFirst3Rate)) {
    runProbability -= Math.max(seriesScorelessFirst3Rate - 0.5, 0) * 0.12
  }
  if (seriesGamesSample >= 2 && Number.isFinite(seriesTrafficNoConversionRate)) {
    runProbability -= Math.max(seriesTrafficNoConversionRate - 0.2, 0) * 0.08
  }

  if (weatherProfile) {
    projectedRuns *= 1 + (Number(weatherProfile.runBoostFirst5 || 0) * 1.4)
  }
  if (envFirstInningContext) {
    runProbability += Number(envFirstInningContext.probabilityLift || 0)
    projectedRuns += Number(envFirstInningContext.projectedRunsLift || 0)
  }
  if (starterWeatherAdjustment?.active) {
    runProbability += Number(starterWeatherAdjustment.firstInningProbabilityDelta || 0)
    projectedRuns += Number(starterWeatherAdjustment.firstInningProjectedRunsDelta || 0)
  }

  runProbability = clamp(runProbability, 0.04, 0.72)
  const impliedRunsFromProbability = -Math.log(1 - clamp(runProbability, 0.01, 0.92))
  projectedRuns = clamp(projectedRuns * 0.55 + impliedRunsFromProbability * 0.45, 0.03, 1.35)
  const firstInningShare =
    Number.isFinite(projectedRunProfile?.first5Runs) && projectedRunProfile.first5Runs > 0
      ? (projectedRuns / projectedRunProfile.first5Runs) * 100
      : null

  return {
    projectedRuns: roundToTenths(projectedRuns),
    runProbability: roundToTenths(runProbability * 100),
    firstInningShare: Number.isFinite(firstInningShare) ? roundToTenths(firstInningShare) : null,
    seriesGamesSample: seriesGamesSample || null,
    seriesScoredRatePct: Number.isFinite(seriesScoredRate) ? roundToTenths(seriesScoredRate * 100) : null,
    seriesRunsFirst3PerGame: Number.isFinite(seriesRunsFirst3PerGame)
      ? roundToTenths(seriesRunsFirst3PerGame)
      : null,
    teamScoredRatePct: Number.isFinite(teamScoredRate) ? roundToTenths(teamScoredRate * 100) : null,
    oppTeamAllowedRatePct: Number.isFinite(opposingTeamAllowedRate)
      ? roundToTenths(opposingTeamAllowedRate * 100)
      : null,
    oppPitcherAllowedRatePct: Number.isFinite(opposingPitcherAllowedRate)
      ? roundToTenths(opposingPitcherAllowedRate * 100)
      : null,
    oppPitcherSeasonRunGameRatePct: Number.isFinite(opposingPitcherSeasonRunGameRate)
      ? roundToTenths(opposingPitcherSeasonRunGameRate * 100)
      : null,
    supportReasons: supportingReasons,
    suppressReasons: suppressingReasons,
    environmentAddendum: envFirstInningContext
      ? {
          hrForce: envFirstInningContext.hrForce != null ? roundToTenths(envFirstInningContext.hrForce) : null,
          highHrForce: Boolean(envFirstInningContext.highHrForce),
          expectedTotalRunsDelta: roundToTenths(Number(envFirstInningContext.expectedTotalRunsDelta || 0)),
          probabilityLiftPct: roundToTenths(Number(envFirstInningContext.probabilityLift || 0) * 100),
          projectedRunsLift: roundToTenths(Number(envFirstInningContext.projectedRunsLift || 0)),
          reason: envFirstInningContext.reason,
	          ficHrForce: envFirstInningContext.ficDailyMatchup?.hrForce != null
	            ? roundToTenths(envFirstInningContext.ficDailyMatchup.hrForce)
	            : null,
	          ficHighHrForce: Boolean(envFirstInningContext.ficDailyMatchup?.highHrForce && !envFirstInningContext.weakGameTimeCarry),
	          gameTimeHrForce: envFirstInningContext.gameTimeHrForce != null
	            ? roundToTenths(envFirstInningContext.gameTimeHrForce)
	            : null,
	          earlyGameMaxHrForce: envFirstInningContext.earlyGameMaxHrForce != null
	            ? roundToTenths(envFirstInningContext.earlyGameMaxHrForce)
	            : null,
	          hrForcePersistenceSignal: envFirstInningContext.hrForcePersistenceSignal || null,
	          weakGameTimeCarry: Boolean(envFirstInningContext.weakGameTimeCarry),
	          carryFades: Boolean(envFirstInningContext.carryFades),
	          reasons: Array.isArray(envFirstInningContext.reasons) ? envFirstInningContext.reasons : []
	        }
      : null,
    starterWeatherAddendum: starterWeatherAdjustment
      ? {
          pitcherName: starterWeatherAdjustment.pitcherName,
          archetype: starterWeatherAdjustment.archetype,
          label: starterWeatherAdjustment.label,
          active: Boolean(starterWeatherAdjustment.active),
          probabilityLiftPct: roundToTenths(Number(starterWeatherAdjustment.firstInningProbabilityDelta || 0) * 100),
          projectedRunsLift: roundToTenths(Number(starterWeatherAdjustment.firstInningProjectedRunsDelta || 0)),
          holdDelta: roundToTenths(Number(starterWeatherAdjustment.holdDelta || 0)),
          reasons: starterWeatherAdjustment.reasons ?? []
        }
      : null
  }
}

const buildFirstInningLean = ({ awayTeam, homeTeam, awayProfile, homeProfile }) => {
  const awayProbability = Number.isFinite(awayProfile?.runProbability)
    ? awayProfile.runProbability / 100
    : null
  const homeProbability = Number.isFinite(homeProfile?.runProbability)
    ? homeProfile.runProbability / 100
    : null

  if (!Number.isFinite(awayProbability) || !Number.isFinite(homeProbability)) {
    return {
      pick: 'Pass',
      strength: 'No model',
      label: 'No model',
      edge: null,
      yesProbabilityPct: null,
      noProbabilityPct: null,
      summary: 'No first-inning run model is available yet for this game.'
    }
  }

  let yrfiProbability = clamp(1 - (1 - awayProbability) * (1 - homeProbability), 0.08, 0.92)

  const awaySeriesDeadEarly =
    Number(awayProfile?.seriesGamesSample || 0) >= 2 &&
    Number(awayProfile?.seriesScoredRatePct || 0) === 0 &&
    Number(awayProfile?.seriesRunsFirst3PerGame || 0) <= 0.5
  const homeSeriesDeadEarly =
    Number(homeProfile?.seriesGamesSample || 0) >= 2 &&
    Number(homeProfile?.seriesScoredRatePct || 0) === 0 &&
    Number(homeProfile?.seriesRunsFirst3PerGame || 0) <= 0.5

  if (awaySeriesDeadEarly && homeSeriesDeadEarly) {
    yrfiProbability = Math.min(yrfiProbability, 0.42)
  }

  const nrfiProbability = 1 - yrfiProbability
  const pick = yrfiProbability >= 0.5 ? 'YRFI' : 'NRFI'
  const pickedProbability = pick === 'YRFI' ? yrfiProbability : nrfiProbability
  const edge = roundToTenths(Math.abs(yrfiProbability - 0.5) * 100)
  const strength =
    edge >= 12 ? 'Strong' : edge >= 8 ? 'Clear' : edge >= 4 ? 'Lean' : 'Thin'

  const buildReasonStack = (profiles, key) => {
    const seen = new Set()
    const output = []
    for (const profile of profiles) {
      for (const reason of profile?.[key] || []) {
        if (!reason || seen.has(reason)) continue
        seen.add(reason)
        output.push(reason)
        if (output.length >= 5) return output
      }
    }
    return output
  }

  const supportProfiles = [awayProfile, homeProfile].sort(
    (a, b) => (Number(b?.runProbability) || 0) - (Number(a?.runProbability) || 0)
  )
  const suppressProfiles = [awayProfile, homeProfile].sort(
    (a, b) =>
      ((Number(b?.teamScoredRatePct) || 0) < (Number(a?.teamScoredRatePct) || 0) ? 1 : -1)
  )
  const reasonStack =
    pick === 'YRFI'
      ? buildReasonStack(supportProfiles, 'supportReasons')
      : buildReasonStack(suppressProfiles, 'suppressReasons')
  const cautionStack =
    pick === 'YRFI'
      ? buildReasonStack(suppressProfiles, 'suppressReasons').slice(0, 3)
      : buildReasonStack(supportProfiles, 'supportReasons').slice(0, 3)
  const environmentAddendums = [awayProfile.environmentAddendum, homeProfile.environmentAddendum].filter(Boolean)
  const highHrForceAddendum = environmentAddendums.find((entry) => entry.highHrForce && Number.isFinite(Number(entry.hrForce)))
  const firstInningAddendumNote = highHrForceAddendum
    ? ` ENV1 HRForce ${roundToTenths(Number(highHrForceAddendum.hrForce))} is embedded in the first-inning run probability.`
    : ''

  return {
    pick,
    strength,
    label: pick,
    edge,
    yesProbabilityPct: roundToTenths(yrfiProbability * 100),
    noProbabilityPct: roundToTenths(nrfiProbability * 100),
    awayRunProbabilityPct: awayProfile.runProbability,
    homeRunProbabilityPct: homeProfile.runProbability,
    awayTeamScoredRatePct: awayProfile.teamScoredRatePct ?? null,
    homeTeamScoredRatePct: homeProfile.teamScoredRatePct ?? null,
    awayOppPitcherAllowedRatePct: awayProfile.oppPitcherAllowedRatePct ?? null,
    homeOppPitcherAllowedRatePct: homeProfile.oppPitcherAllowedRatePct ?? null,
    awayProjectedRuns: awayProfile.projectedRuns,
    homeProjectedRuns: homeProfile.projectedRuns,
    reasonStack,
    cautionStack,
    environmentAddendum: environmentAddendums.length
      ? {
          hrForce: highHrForceAddendum?.hrForce ?? environmentAddendums[0]?.hrForce ?? null,
          highHrForce: Boolean(highHrForceAddendum),
          maxProbabilityLiftPct: roundToTenths(
            Math.max(...environmentAddendums.map((entry) => Number(entry.probabilityLiftPct || 0)))
          ),
          maxProjectedRunsLift: roundToTenths(
            Math.max(...environmentAddendums.map((entry) => Number(entry.projectedRunsLift || 0)))
          ),
          reasons: [...new Set(environmentAddendums.map((entry) => entry.reason).filter(Boolean))]
        }
      : null,
    projectedRuns: roundToTenths(
      (Number(awayProfile.projectedRuns) || 0) + (Number(homeProfile.projectedRuns) || 0)
    ),
    line: 0.5,
    summary:
      pick === 'YRFI'
        ? `${pick} with a ${Math.round(pickedProbability * 100)}% modeled chance of at least one first-inning run. ${awayTeam} score ${awayProfile.runProbability}% of the time and ${homeTeam} ${homeProfile.runProbability}% of the time in this matchup blend of lineup pressure, recent early scoring shape, opposing starter leakage, series carryover, and weather.${firstInningAddendumNote}`
        : `${pick} with a ${Math.round(pickedProbability * 100)}% modeled chance that the first inning stays scoreless. ${awayTeam} score ${awayProfile.runProbability}% of the time and ${homeTeam} ${homeProfile.runProbability}% of the time in this matchup blend of lineup pressure, recent early scoring shape, opposing starter leakage, series carryover, and weather.${firstInningAddendumNote}`
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

  if (lineupSummary?.bullpenOverview) {
    winPath.push(lineupSummary.bullpenOverview)
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
    bullpenOverperformHitters: lineupSummary?.bullpenOverperformHitters || [],
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
  const averageLineupConfidence = average(
    projectedHitProfiles.map((profile) => profile?.lineupConfidence).filter(Number.isFinite)
  )
  const confidenceScale = Number.isFinite(averageLineupConfidence)
    ? clamp(0.25 + averageLineupConfidence * 0.75, 0.35, 1)
    : 1
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
    multiplierBase: 1.08 * confidenceScale,
    multiplierRange: 0.22 * confidenceScale,
    intercept: 0.18 * confidenceScale,
    cap: 2.2 + confidenceScale * 2
  })
  const calibratedFirst5Gap = amplifyGap(rawFirst5Gap, {
    supportIndex: first5SupportIndex,
    multiplierBase: 1 * confidenceScale,
    multiplierRange: 0.18 * confidenceScale,
    intercept: 0.12 * confidenceScale,
    cap: 1.5 + confidenceScale * 1.4
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
  const pitchTypePressureIndex = Number(profile.pitchTypePressureIndex)
  const bullpenPitchTypePressureIndex = Number(profile.bullpenPitchTypePressureIndex)
  const starterMatchupKernelIndex = Number(profile.starterMatchupKernelIndex)
  const battingPressureIndex = Number(profile.battingPressureIndex)

  if (![grade, platoonCount, powerCount, contactCount].every(Number.isFinite)) return null

  let score =
    50 +
      grade * 2.8 +
      (platoonCount - 6) * 1.7 +
      (powerCount - 2) * 1.2 +
      (contactCount - 1) * 1.1

  if (Number.isFinite(pitchTypePressureIndex)) {
    score += (pitchTypePressureIndex - 50) * 0.24
  }

  if (Number.isFinite(starterMatchupKernelIndex)) {
    score += (starterMatchupKernelIndex - 50) * 0.18
  }

  if (Number.isFinite(bullpenPitchTypePressureIndex)) {
    score += (bullpenPitchTypePressureIndex - 50) * 0.12
  }

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

  if (Number.isFinite(battingPressureIndex)) {
    score += (battingPressureIndex - 50) * 0.1
  }

  if (Number.isFinite(Number(profile.handednessSplitIndex))) {
    score += (Number(profile.handednessSplitIndex) - 50) * 0.13
  }

  if (Number.isFinite(Number(profile.strongSplitCount))) {
    score += Math.max(Number(profile.strongSplitCount) - 3, 0) * 0.85
  }

  if (Number.isFinite(Number(profile.weakSplitCount))) {
    score -= Math.max(Number(profile.weakSplitCount) - 2, 0) * 0.65
  }

  if (Number.isFinite(Number(profile.highAverageCount))) {
    score += Math.max(Number(profile.highAverageCount) - 4, 0) * 0.9
  }

  if (Number.isFinite(Number(profile.topSixHighAverageCount))) {
    score += Math.max(Number(profile.topSixHighAverageCount) - 3, 0) * 0.75
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
    'Lineup-vs-pitching fit',
    0.14,
    [
      {
        label: `Grade ${awayContext.averageMatchupGrade >= 0 ? '+' : ''}${awayContext.averageMatchupGrade.toFixed(2)} | platoon ${awayContext.platoonCount} | .300 bats ${Number(awayContext.highAverageCount || 0).toFixed(0)} | bat pressure ${Number(awayContext.battingPressureIndex || 50).toFixed(0)} | starter kernel ${Number(awayContext.starterMatchupKernelIndex || 50).toFixed(0)} | starter arsenal ${Number(awayContext.pitchTypePressureIndex || 50).toFixed(0)} | bridge arsenal ${Number(awayContext.bullpenPitchTypePressureIndex || 50).toFixed(0)} | pressure ${Number(awayContext.starterPressureIndex || 50).toFixed(0)}`,
        score: scores[0]
      },
      {
        label: `Grade ${homeContext.averageMatchupGrade >= 0 ? '+' : ''}${homeContext.averageMatchupGrade.toFixed(2)} | platoon ${homeContext.platoonCount} | .300 bats ${Number(homeContext.highAverageCount || 0).toFixed(0)} | bat pressure ${Number(homeContext.battingPressureIndex || 50).toFixed(0)} | starter kernel ${Number(homeContext.starterMatchupKernelIndex || 50).toFixed(0)} | starter arsenal ${Number(homeContext.pitchTypePressureIndex || 50).toFixed(0)} | bridge arsenal ${Number(homeContext.bullpenPitchTypePressureIndex || 50).toFixed(0)} | pressure ${Number(homeContext.starterPressureIndex || 50).toFixed(0)}`,
        score: scores[1]
      }
    ],
    'Official lineup + handedness + starter arsenal + likely reliever arsenal fit'
  )
}

const summarizeEnvironmentAdjustmentContext = (context = null) => {
  if (!context) return null
  const exactUmpire = `${context.umpire?.assignmentStatus || ''}`.toLowerCase() === 'exact'

  return {
    modelVersion: context.modelVersion || null,
    venueName: context.venueName || '',
    signal: context.signal || null,
    confidenceScore: Number.isFinite(Number(context.confidenceScore)) ? Number(context.confidenceScore) : null,
    expected: {
      totalRunsDelta: Number(context.expected?.totalRunsDelta || 0),
      hitsDelta: Number(context.expected?.hitsDelta || 0),
      hrDelta: Number(context.expected?.hrDelta || 0),
      strikeoutsDelta: Number(context.expected?.strikeoutsDelta || 0),
      walksDelta: Number(context.expected?.walksDelta || 0)
    },
    park: {
      indexRuns: Number.isFinite(Number(context.park?.indexRuns)) ? Number(context.park.indexRuns) : null,
      indexHr: Number.isFinite(Number(context.park?.indexHr)) ? Number(context.park.indexHr) : null,
      runDelta: Number(context.park?.runDelta || 0),
      hrDelta: Number(context.park?.hrDelta || 0)
    },
    weather: {
      hrForce: Number.isFinite(Number(context.weather?.hrForce)) ? Number(context.weather.hrForce) : null,
      effectiveHrForce: Number.isFinite(Number(context.weather?.effectiveHrForce)) ? Number(context.weather.effectiveHrForce) : null,
      signal: context.weather?.signal || null,
      runDelta: Number(context.weather?.runDelta || 0),
      hrDelta: Number(context.weather?.hrDelta || 0)
    },
    umpire: {
      name: context.umpire?.name || null,
      assignmentStatus: context.umpire?.assignmentStatus || null,
      exactAssignment: exactUmpire,
      favorsCode: context.umpire?.favorsCode || null,
      zoneFactor: Number.isFinite(Number(context.umpire?.zoneFactor)) ? Number(context.umpire.zoneFactor) : null,
      runsDelta: Number(context.umpire?.runsDelta || 0),
      strikeoutsDelta: Number(context.umpire?.strikeoutsDelta || 0),
      walksDelta: Number(context.umpire?.walksDelta || 0)
    },
    visibility: {
      lateLocalStart: Boolean(context.visibility?.lateLocalStart),
      signal: context.visibility?.signal || null,
      hitsMultiplier: Number(context.visibility?.hitsMultiplier || 1),
      hrMultiplier: Number(context.visibility?.hrMultiplier || 1),
      runsMultiplier: Number(context.visibility?.runsMultiplier || 1)
    }
  }
}

const summarizeFicDailyMatchupContext = (context = null) => {
  if (!context) return null
  const summarizeSide = (side = null) => side
    ? {
        label: side.label || null,
        rowCount: Number(side.rowCount || 0),
        pitcherName: side.pitcherName || null,
        averageHrForce: Number.isFinite(Number(side.averageHrForce)) ? Number(side.averageHrForce) : null,
        maxHrForce: Number.isFinite(Number(side.maxHrForce)) ? Number(side.maxHrForce) : null,
        highHrForceRows: Number(side.highHrForceRows || 0),
        extremeHrForceRows: Number(side.extremeHrForceRows || 0),
        highHrForceSharePct: Number.isFinite(Number(side.highHrForceSharePct)) ? Number(side.highHrForceSharePct) : null,
        qualityAbPct: Number.isFinite(Number(side.qualityAbPct)) ? Number(side.qualityAbPct) : null,
        hardHitPct: Number.isFinite(Number(side.hardHitPct)) ? Number(side.hardHitPct) : null,
        matchupPassRows: Number(side.matchupPassRows || 0),
        topRows: Array.isArray(side.topRows) ? side.topRows.slice(0, 4) : []
      }
    : null

  return {
    source: context.source || 'FantasyInfoCentral Daily Matchups',
    sourceDate: context.sourceDate || null,
    sourceUrl: context.sourceUrl || null,
    matchup: context.matchup || null,
    gameContextMatch: context.gameContextMatch || null,
    rowCount: Number(context.rowCount || 0),
    averageHrForce: Number.isFinite(Number(context.averageHrForce)) ? Number(context.averageHrForce) : null,
    maxHrForce: Number.isFinite(Number(context.maxHrForce)) ? Number(context.maxHrForce) : null,
    highHrForceRows: Number(context.highHrForceRows || 0),
    extremeHrForceRows: Number(context.extremeHrForceRows || 0),
    highHrForceSharePct: Number.isFinite(Number(context.highHrForceSharePct)) ? Number(context.highHrForceSharePct) : null,
    qualityAbPct: Number.isFinite(Number(context.qualityAbPct)) ? Number(context.qualityAbPct) : null,
    hardHitPct: Number.isFinite(Number(context.hardHitPct)) ? Number(context.hardHitPct) : null,
    matchupPassRows: Number(context.matchupPassRows || 0),
    awayOffense: summarizeSide(context.awayOffense),
    homeOffense: summarizeSide(context.homeOffense)
  }
}

const summarizeTeamReliefProjectionContext = (teamName = '', context = null) => {
  if (!context) return null

  return {
    teamName,
    modelVersion: context.modelVersion || null,
    projectedReliefRunsAllowed: Number.isFinite(Number(context.projectedReliefRunsAllowed))
      ? Number(context.projectedReliefRunsAllowed)
      : null,
    projectedReliefOuts: Number.isFinite(Number(context.projectedReliefOuts))
      ? Number(context.projectedReliefOuts)
      : null,
    projectedRelieversUsed: Number.isFinite(Number(context.projectedRelieversUsed))
      ? Number(context.projectedRelieversUsed)
      : null,
    bridgeStressScore: Number.isFinite(Number(context.bridgeStressScore))
      ? Number(context.bridgeStressScore)
      : null,
    leverageAvailabilityScore: Number.isFinite(Number(context.leverageAvailabilityScore))
      ? Number(context.leverageAvailabilityScore)
      : null,
    fatigueScore: Number.isFinite(Number(context.fatigueScore)) ? Number(context.fatigueScore) : null,
    qualityScore: Number.isFinite(Number(context.qualityScore)) ? Number(context.qualityScore) : null,
    runRiskTier: context.runRiskTier || null,
    topTwoSharePct: Number.isFinite(Number(context.topTwoSharePct)) ? Number(context.topTwoSharePct) : null,
    lead: {
      pitcherName: context.lead?.pitcherName || null,
      expectedOuts: Number.isFinite(Number(context.lead?.expectedOuts)) ? Number(context.lead.expectedOuts) : null,
      availabilityScore: Number.isFinite(Number(context.lead?.availabilityScore))
        ? Number(context.lead.availabilityScore)
        : null
    }
  }
}

const summarizeReliefProjectionContexts = (participants = [], reliefProjectionContexts = []) => ({
  away: summarizeTeamReliefProjectionContext(participants[0]?.name || 'Away', reliefProjectionContexts[0]),
  home: summarizeTeamReliefProjectionContext(participants[1]?.name || 'Home', reliefProjectionContexts[1])
})

const buildProjectionAdjustmentChecklist = ({
  participants = [],
  starters = [],
  lineupProfiles = [],
  projectedHitProfiles = [],
  projectedRunProfiles = [],
  environmentAdjustmentContext = null,
  weatherProfile = null,
  ficDailyMatchupContext = null,
  reliefProjectionContexts = []
} = {}) => {
  const carryContext = buildCarryAdjustmentContext({
    environmentAdjustmentContext,
    weatherProfile,
    ficDailyMatchupContext
  })
  const ficSides = [ficDailyMatchupContext?.awayOffense ?? null, ficDailyMatchupContext?.homeOffense ?? null]
  const starterChecks = starters.map((starter, index) => {
    const opponent = participants[index === 0 ? 1 : 0]?.name || 'opponent'
    const weatherAdjustment = buildStarterWeatherAdjustment({
      starter,
      weatherProfile,
      environmentAdjustmentContext,
      ficDailyMatchupContext: ficSides[index === 0 ? 1 : 0]
    })
    const flags = []
    const gamesStarted = Number(starter?.gamesStarted)
    const recentStarts = Number(starter?.recentForm?.startsSample)
    if (!starter?.sampleEstablished || (Number.isFinite(gamesStarted) && gamesStarted < 4)) {
      flags.push('shallow starter sample')
    }
    if (/unknown sample/i.test(starter?.profileType || '')) {
      flags.push('starter role/sample uncertainty')
    }
    if (starter?.starterVsTeamContext && Number(starter.starterVsTeamContext.sampleWeight || 0) >= 0.18) {
      flags.push(`${starter.starterVsTeamContext.label} vs ${opponent}`)
    }
    if (starter?.starterVsTeamContext?.repeatOpponentUnderWarning) {
      flags.push(
        starter.starterVsTeamContext.lastOpponentStartSummary
          ? `repeat-opponent tax: ${starter.starterVsTeamContext.lastOpponentStartSummary}`
          : 'repeat-opponent damage tax'
      )
    }
    if (Number.isFinite(recentStarts) && recentStarts < 4) {
      flags.push('recent form below 4-start checklist')
    }
    if (starter?.profileType === 'Traffic-risk') flags.push('traffic-risk starter type')
    if (starter?.recentForm && Number(starter.recentForm.homeRunsAllowedPerStart || 0) >= 1) {
      flags.push('recent HR damage allowed')
    }
    if (weatherAdjustment?.active) {
      flags.push(
        weatherAdjustment.hitDelta >= 0
          ? 'pitcher-weather archetype damage tax'
          : 'pitcher-weather archetype protection credit'
      )
    }

    return {
      teamName: participants[index]?.name || (index === 0 ? 'Away' : 'Home'),
      pitcherName: starter?.name || '',
      gamesStarted: Number.isFinite(gamesStarted) ? gamesStarted : null,
      recentStartsSample: Number.isFinite(recentStarts) ? recentStarts : null,
      sampleEstablished: Boolean(starter?.sampleEstablished),
      profileType: starter?.profileLabel || starter?.profileType || null,
      expectedInnings: Number.isFinite(Number(starter?.expectedInnings))
        ? Number(starter.expectedInnings)
        : Number.isFinite(Number(starter?.avgInningsPerStart))
          ? roundToTenths(Number(starter.avgInningsPerStart))
          : null,
      opponentHistory: starter?.starterVsTeamContext
        ? {
            label: starter.starterVsTeamContext.label,
            source: starter.starterVsTeamContext.source,
            starts: starter.starterVsTeamContext.starts,
            innings: starter.starterVsTeamContext.innings,
            projectedHitsDelta: starter.starterVsTeamContext.projectedHitsDelta,
            first5RunsDelta: starter.starterVsTeamContext.first5RunsDelta,
            runConversionDelta: starter.starterVsTeamContext.runConversionDelta,
            repeatOpponentUnderWarning: Boolean(starter.starterVsTeamContext.repeatOpponentUnderWarning),
            repeatOpponentHitTax: starter.starterVsTeamContext.repeatOpponentHitTax,
            repeatOpponentFirst5Tax: starter.starterVsTeamContext.repeatOpponentFirst5Tax,
            lastOpponentStartSummary: starter.starterVsTeamContext.lastOpponentStartSummary,
            repeatOpponentFlags: starter.starterVsTeamContext.repeatOpponentFlags ?? []
          }
        : null,
      pitchMix: starter?.pitchMixProfile
        ? {
            archetype: starter.pitchMixProfile.archetype,
            label: starter.pitchMixProfile.label,
            fastballShare: starter.pitchMixProfile.fastballShare,
            breakingShare: starter.pitchMixProfile.breakingShare,
            offspeedShare: starter.pitchMixProfile.offspeedShare,
            spinDependencyShare: starter.pitchMixProfile.spinDependencyShare,
            topPitchType: starter.pitchMixProfile.topPitchType,
            topPitchShare: starter.pitchMixProfile.topPitchShare
          }
        : null,
      weatherAdjustment: weatherAdjustment
        ? {
            active: Boolean(weatherAdjustment.active),
            archetype: weatherAdjustment.archetype,
            temperatureF: weatherAdjustment.temperatureF,
            hrForce: weatherAdjustment.hrForce != null ? roundToTenths(weatherAdjustment.hrForce) : null,
            hotWeather: Boolean(weatherAdjustment.hotWeather),
            coldWeather: Boolean(weatherAdjustment.coldWeather),
            hitDelta: roundToTenths(Number(weatherAdjustment.hitDelta || 0)),
            runDelta: roundToTenths(Number(weatherAdjustment.runDelta || 0)),
            conversionDelta: Number(weatherAdjustment.conversionDelta || 0),
            firstInningProbabilityLiftPct: roundToTenths(Number(weatherAdjustment.firstInningProbabilityDelta || 0) * 100),
            holdDelta: roundToTenths(Number(weatherAdjustment.holdDelta || 0)),
            reasons: weatherAdjustment.reasons ?? []
          }
        : null,
      flags
    }
  })
  const handednessSplitChecks = lineupProfiles.map((profile, index) => {
    const adjustment = buildHandednessSplitAdjustment(profile, 1)
    const splitProfile = adjustment.profile
    const flags = [
      Number(splitProfile?.strongSplitCount || 0) >= 4
        ? `${splitProfile.strongSplitCount} strong split bats vs ${splitProfile.opposingStarterHand || 'starter hand'}`
        : null,
      Number(splitProfile?.weakSplitCount || 0) >= 4
        ? `${splitProfile.weakSplitCount} weak split bats vs ${splitProfile.opposingStarterHand || 'starter hand'}`
        : null,
      Number(splitProfile?.topThirdStrongSplitCount || 0) >= 2 ? 'top-third split pressure' : null,
      Number(splitProfile?.topSixWeakSplitCount || 0) >= 3 ? 'top-six split drag' : null,
      ...(Array.isArray(splitProfile?.reasons) ? splitProfile.reasons : [])
    ].filter(Boolean)

    return {
      teamName: participants[index]?.name || (index === 0 ? 'Away' : 'Home'),
      opposingStarterHand: splitProfile?.opposingStarterHand || starters[index === 0 ? 1 : 0]?.handedness || null,
      handednessSplitIndex: splitProfile?.index ?? null,
      label: splitProfile?.label || null,
      splitAvgAverage: splitProfile?.splitAvgAverage ?? null,
      splitOpsAverage: splitProfile?.splitOpsAverage ?? null,
      topSixSplitAvgAverage: splitProfile?.topSixSplitAvgAverage ?? null,
      topSixSplitOpsAverage: splitProfile?.topSixSplitOpsAverage ?? null,
      strongSplitCount: splitProfile?.strongSplitCount ?? 0,
      weakSplitCount: splitProfile?.weakSplitCount ?? 0,
      severeWeakSplitCount: splitProfile?.severeWeakSplitCount ?? 0,
      topSixStrongSplitCount: splitProfile?.topSixStrongSplitCount ?? 0,
      topSixWeakSplitCount: splitProfile?.topSixWeakSplitCount ?? 0,
      topThirdStrongSplitCount: splitProfile?.topThirdStrongSplitCount ?? 0,
      topThirdWeakSplitCount: splitProfile?.topThirdWeakSplitCount ?? 0,
      hitDelta: roundToTenths(Number(adjustment.hitDelta || 0)),
      runConversionDelta: adjustment.runConversionDelta,
      strongSplitBats: Array.isArray(splitProfile?.strongSplitBats) ? splitProfile.strongSplitBats.slice(0, 4) : [],
      weakSplitBats: Array.isArray(splitProfile?.weakSplitBats) ? splitProfile.weakSplitBats.slice(0, 4) : [],
      flags: flags.slice(0, 6)
    }
  })
  const starterMatchupKernelChecks = lineupProfiles.map((profile, index) => {
    const kernelIndex = numberOrNull(profile?.starterMatchupKernelIndex)
    const favorableCount = numberOrNull(profile?.kernelFavorableCount) ?? 0
    const suppressedCount = numberOrNull(profile?.kernelSuppressedCount) ?? 0
    const espnSplitEdgeCount = numberOrNull(profile?.espnSplitEdgeCount) ?? 0
    const espnSplitRiskCount = numberOrNull(profile?.espnSplitRiskCount) ?? 0
    const topHitters = Array.isArray(profile?.starterMatchupKernelHitters)
      ? profile.starterMatchupKernelHitters.slice(0, 3)
      : []
    const riskHitters = Array.isArray(profile?.starterMatchupKernelRisks)
      ? profile.starterMatchupKernelRisks.slice(0, 2)
      : []

    return {
      teamName: participants[index]?.name || (index === 0 ? 'Away' : 'Home'),
      opposingStarter: starters[index === 0 ? 1 : 0]?.name || null,
      starterMatchupKernelIndex: kernelIndex,
      starterMatchupKernelScore: numberOrNull(profile?.starterMatchupKernelScore),
      starterMatchupKernelConfidence: numberOrNull(profile?.starterMatchupKernelConfidence),
      topThirdKernelScore: numberOrNull(profile?.topThirdKernelScore),
      pitchTypeLeagueGrade: numberOrNull(profile?.pitchTypeLeagueGrade),
      favorableCount,
      suppressedCount,
      espnSplitEdgeCount,
      espnSplitRiskCount,
      topHitters,
      riskHitters,
      flags: [
        Number.isFinite(kernelIndex) && kernelIndex >= 62 ? 'batter-vs-starter kernel promotes offense' : null,
        Number.isFinite(kernelIndex) && kernelIndex <= 40 ? 'batter-vs-starter kernel suppresses offense' : null,
        favorableCount >= 3 ? `${favorableCount} favorable batter kernels` : null,
        suppressedCount >= 3 ? `${suppressedCount} suppressed batter kernels` : null,
        espnSplitEdgeCount >= 2 ? `${espnSplitEdgeCount} ESPN hitter split edges` : null,
        espnSplitRiskCount >= 2 ? `${espnSplitRiskCount} ESPN hitter split risks` : null,
        topHitters[0]?.name ? `${topHitters[0].name} top kernel bat` : null,
        riskHitters[0]?.name ? `${riskHitters[0].name} top kernel risk` : null
      ].filter(Boolean)
    }
  })
  const batterChecks = ficSides.map((side, index) => {
    const context = buildFicDailyMatchupTotalContext(side)
    const topRows = Array.isArray(side?.topRows) ? side.topRows.slice(0, 4) : []
    const bvpRows = topRows
      .map((row) => ({
        playerName: row.playerName || row.player || row.name || '',
        pitcherName: row.pitcherName || row.pitcher || side?.pitcherName || '',
        atBats: numberOrNull(row.atBats ?? row.ab ?? row.bvpAtBats),
        avg: numberOrNull(row.avg ?? row.bvpAvg),
        ops: numberOrNull(row.ops ?? row.bvpOps),
        hrForce: numberOrNull(row.hrForce)
      }))
      .filter((row) => Number(row.atBats || 0) >= 5 || Number(row.hrForce || 0) >= 1.4)

    return {
      teamName: participants[index]?.name || (index === 0 ? 'Away' : 'Home'),
      rowCount: Number(side?.rowCount || 0),
      maxHrForce: context?.hrForce != null ? roundToTenths(context.hrForce) : null,
      highHrForceRows: Number(side?.highHrForceRows || 0),
      materialHrForce: Boolean(context?.hrForce != null && Number(context.hrForce) >= 1.5 && context.highHrForce),
      hitDelta: context ? roundToTenths(Number(context.hitDelta || 0)) : 0,
      runDelta: context ? roundToTenths(Number(context.matchupRunDelta || 0)) : 0,
      bvpRows,
      flags: [
        context?.highHrForce ? `FIC HRForce ${roundToTenths(context.hrForce)} vs listed pitcher` : null,
        bvpRows.some((row) => Number(row.atBats || 0) >= 5) ? 'BvP sample >= 5 AB present' : null
      ].filter(Boolean)
    }
  })
  const reliefChecks = reliefProjectionContexts.map((context, index) => {
    const availableRelief = buildAvailableReliefAdjustmentContext(context)
    return {
      teamName: participants[index]?.name || (index === 0 ? 'Away' : 'Home'),
      projectedReliefRunsAllowed: availableRelief?.projectedReliefRunsAllowed != null
        ? roundToTenths(availableRelief.projectedReliefRunsAllowed)
        : null,
      adjustedProjectedReliefRunsAllowed: availableRelief?.adjustedProjectedReliefRunsAllowed != null
        ? roundToTenths(availableRelief.adjustedProjectedReliefRunsAllowed)
        : null,
      projectedReliefOuts: availableRelief?.projectedReliefOuts != null
        ? roundToTenths(availableRelief.projectedReliefOuts)
        : null,
      leverageAvailabilityScore: availableRelief?.leverageAvailabilityScore ?? null,
      leadAvailabilityScore: availableRelief?.leadAvailabilityScore ?? null,
      bridgeStressScore: availableRelief?.bridgeStressScore ?? null,
      runDelta: availableRelief ? roundToTenths(Number(availableRelief.runDelta || 0)) : 0,
      hitDelta: availableRelief ? roundToTenths(Number(availableRelief.hitDelta || 0)) : 0,
      expectedEarlyBridge: Boolean(availableRelief?.expectedEarlyBridge),
      flags: availableRelief?.reasons ?? []
    }
  })
  const environmentFlags = carryContext
    ? [
        carryContext.materialHrForce
          ? `Material HRForce ${roundToTenths(carryContext.hrForce)}: pitcher damage and batter production lifted`
          : carryContext.highHrForce
            ? `HRForce ${roundToTenths(carryContext.hrForce)} adds carry risk`
            : null,
        carryContext.isDome ? 'Dome/weather N/A: weather carry not treated as wind/heat lift' : null,
        carryContext.lowerWeatherCarry ? 'Low/N/A HRForce cannot be used as a strong under signal' : null
      ].filter(Boolean)
    : []

  return {
    summary: [
      carryContext?.materialHrForce ? 'high-HRForce carry is active' : null,
      reliefChecks.some((check) => Number(check.runDelta || 0) >= 0.25) ? 'available-bullpen damage adjustment is active' : null,
      handednessSplitChecks.some((check) => Math.abs(Number(check.hitDelta || 0)) >= 0.08) ? 'handedness split adjustment is active' : null,
      starterMatchupKernelChecks.some((check) => Number(check.starterMatchupKernelIndex || 50) >= 62 || Number(check.starterMatchupKernelIndex || 50) <= 40)
        ? 'batter-vs-starter kernel adjustment is active'
        : null,
      starterChecks.some((check) => check.opponentHistory?.repeatOpponentUnderWarning) ? 'repeat-opponent starter tax is active' : null,
      starterChecks.some((check) => check.weatherAdjustment?.active) ? 'pitcher-weather archetype adjustment is active' : null,
      starterChecks.some((check) => check.flags.includes('shallow starter sample')) ? 'shallow starter sample flag is active' : null,
      batterChecks.some((check) => check.materialHrForce) ? 'BvP/FIC batter carry flag is active' : null
    ].filter(Boolean),
    environment: carryContext
      ? {
          hrForce: carryContext.hrForce != null ? roundToTenths(carryContext.hrForce) : null,
          envHrForce: carryContext.envHrForce != null ? roundToTenths(carryContext.envHrForce) : null,
          ficHrForce: carryContext.ficHrForce != null ? roundToTenths(carryContext.ficHrForce) : null,
          materialHrForce: Boolean(carryContext.materialHrForce),
          extremeHrForce: Boolean(carryContext.extremeHrForce),
          carryMultiplier: carryContext.carryMultiplier,
          hitDelta: roundToTenths(Number(carryContext.hitDelta || 0)),
          runDelta: roundToTenths(Number(carryContext.runDelta || 0)),
          conversionDelta: Number(carryContext.conversionDelta || 0),
          firstInningProbabilityLiftPct: roundToTenths(Number(carryContext.firstInningProbabilityLift || 0) * 100),
          underFragilityRuns: carryContext.underFragilityRuns,
          flags: environmentFlags,
          reasons: carryContext.reasons
        }
      : null,
    starters: starterChecks,
    handednessSplits: handednessSplitChecks,
    starterMatchupKernels: starterMatchupKernelChecks,
    batters: batterChecks,
    relief: reliefChecks,
    projectedRunTotals: {
      away: projectedRunProfiles[0]?.fullRuns ?? null,
      home: projectedRunProfiles[1]?.fullRuns ?? null
    },
    projectedHitTotals: {
      away: projectedHitProfiles[0]?.projectedHits ?? null,
      home: projectedHitProfiles[1]?.projectedHits ?? null
    }
  }
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

const buildMlbAnalysisContext = (game, participants) => {
  const starterContexts = [
    game.starterContext?.away ?? game.startingPitcherContext?.away ?? null,
    game.starterContext?.home ?? game.startingPitcherContext?.home ?? null
  ]
  const starterWarProfiles = [game.stateContext?.pitcherWar?.away ?? null, game.stateContext?.pitcherWar?.home ?? null]
  const starters = participants.map((participant, index) =>
    buildStarterProfile(starterContexts[index], participant.detail, starterWarProfiles[index])
  )
  const offenseProfiles = [game.offenseContext?.away, game.offenseContext?.home]
  const bullpenProfiles = [game.bullpenContext?.away, game.bullpenContext?.home]
  const bullpenChainProfiles = [game.bullpenChainContext?.away, game.bullpenChainContext?.home]
  const savantProfiles = [game.savantContext?.away, game.savantContext?.home]
  const lineupBoards = [
    findLineupBoardForTeam(game.lineupBoard, participants[0]?.name),
    findLineupBoardForTeam(game.lineupBoard, participants[1]?.name)
  ]
  const rawLineupProfiles = [
    game.lineupContext?.[participants[0]?.name],
    game.lineupContext?.[participants[1]?.name]
  ]
  const lineupProfiles = rawLineupProfiles.map((lineupProfile, index) =>
    enrichLineupProfileWithHandednessSplits({
      lineupProfile,
      lineupBoardSide: lineupBoards[index],
      opposingStarter: starters[index === 0 ? 1 : 0]
    })
  )
  const weatherProfile = buildMlbWeatherProfile(game.lineupBoard)
  const sunVisibilityProfile = game.stateContext?.sunVisibility ?? null
  const environmentAdjustmentContext = game.environmentAdjustmentContext ?? null
  const ficDailyMatchupContext = game.ficDailyMatchupContext ?? null
  const ficDailyMatchupTeamContexts = [
    ficDailyMatchupContext?.awayOffense ?? null,
    ficDailyMatchupContext?.homeOffense ?? null
  ]
  const reliefProjectionContexts = [
    game.reliefProjectionContext?.away ?? null,
    game.reliefProjectionContext?.home ?? null
  ]
  const starterWeatherAdjustments = starters.map((starter, index) =>
    buildStarterWeatherAdjustment({
      starter,
      weatherProfile,
      environmentAdjustmentContext,
      ficDailyMatchupContext: ficDailyMatchupTeamContexts[index === 0 ? 1 : 0]
    })
  )
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
  const storyProfiles = [game.storyContext?.away, game.storyContext?.home]
  const storyScores = storyProfiles.map((profile) => (profile ? buildMlbStoryScore(profile) : null))
  const lineupScores = lineupProfiles.map((profile) =>
    profile ? buildMlbLineupMatchupScore(profile) : null
  )
  const baseProjectedHitProfiles = [
    buildProjectedHitProfile({
      role: participants[0]?.role,
      offenseProfile: offenseProfiles[0],
      savantProfile: savantProfiles[0],
      lineupProfile: lineupProfiles[0],
      lineupStatus: game.lineupBoard?.status?.away || 'pending',
      opposingStarter: starters[1],
      opposingBullpen: bullpenProfiles[1],
      opposingBullpenChain: bullpenChainProfiles[1],
      parkContext: game.parkContext,
      weatherProfile,
      sunVisibilityProfile,
      environmentAdjustmentContext,
      ficDailyMatchupTeamContext: ficDailyMatchupTeamContexts[0],
      opposingReliefProjectionContext: reliefProjectionContexts[1]
    }),
    buildProjectedHitProfile({
      role: participants[1]?.role,
      offenseProfile: offenseProfiles[1],
      savantProfile: savantProfiles[1],
      lineupProfile: lineupProfiles[1],
      lineupStatus: game.lineupBoard?.status?.home || 'pending',
      opposingStarter: starters[0],
      opposingBullpen: bullpenProfiles[0],
      opposingBullpenChain: bullpenChainProfiles[0],
      parkContext: game.parkContext,
      weatherProfile,
      sunVisibilityProfile,
      environmentAdjustmentContext,
      ficDailyMatchupTeamContext: ficDailyMatchupTeamContexts[1],
      opposingReliefProjectionContext: reliefProjectionContexts[0]
    })
  ]
  const starterHoldConfidence = [
    buildStarterHoldConfidence({
      starter: starters[0],
      lineupProfile: lineupProfiles[1],
      weatherProfile,
      environmentAdjustmentContext,
      ficDailyMatchupTeamContext: ficDailyMatchupTeamContexts[1]
    }),
    buildStarterHoldConfidence({
      starter: starters[1],
      lineupProfile: lineupProfiles[0],
      weatherProfile,
      environmentAdjustmentContext,
      ficDailyMatchupTeamContext: ficDailyMatchupTeamContexts[0]
    })
  ]
  const starterLeashScores = starters.map((starter) => deriveStarterLeashScore(starter))
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
    buildMlbStorySignal(game, participants),
    buildMlbLineupMatchupSignal(game, participants)
  ].filter(Boolean)
  const volatilityModifiers = []
  const sourceParts = ['Moneyline', 'listed starter data']
  let confidenceModifier = 0
  let mlbProjection = null
  const postedTotal = getPostedTotalLine(game)

  if (game.teamContext?.away && game.teamContext?.home) sourceParts.push('standings context')
  if (game.parkContext?.venueName) sourceParts.push('park factors')
  if (
    game.offenseContext?.away &&
    game.offenseContext?.home &&
    !game.offenseContext.away.staleFeed &&
    !game.offenseContext.home.staleFeed
  ) {
    sourceParts.push('team hit production')
  }
  if (
    game.bullpenContext?.away &&
    game.bullpenContext?.home &&
    !game.bullpenContext.away.staleFeed &&
    !game.bullpenContext.home.staleFeed
  ) {
    sourceParts.push('bullpen quality')
  }
  if (game.bullpenChainContext?.away && game.bullpenChainContext?.home) {
    const chainSources = [
      game.bullpenChainContext.away.chainSource || game.bullpenChainContext.away.source,
      game.bullpenChainContext.home.chainSource || game.bullpenChainContext.home.source
    ]
    sourceParts.push(chainSources.some((source) => /RP2/i.test(String(source || '')))
      ? 'RP2 bullpen bridge chain'
      : 'bullpen workload + likely reliever chain')
  }
  if (game.savantContext?.away && game.savantContext?.home) sourceParts.push('Statcast contact quality')
  if (game.storyContext?.away && game.storyContext?.home) sourceParts.push('daily team story context')
  if (game.lineupContext?.[participants[0]?.name] && game.lineupContext?.[participants[1]?.name]) {
    sourceParts.push('daily lineup matchup context')
  }
  if (starters.some((starter) => starter?.recentForm)) sourceParts.push('recent starter form')
  if (starters.some((starter) => starter?.pitchMixProfile?.pitchCount > 0)) sourceParts.push('pitcher weather archetype')
  if (weatherProfile?.label) sourceParts.push('weather context')
  if (Number(sunVisibilityProfile?.visibilityRiskScore) >= 18) sourceParts.push('sun-position visibility')
  if (environmentAdjustmentContext) sourceParts.push('ENV1 run environment')
  if (ficDailyMatchupContext) sourceParts.push('FIC Daily Matchups HRForce')
  if (reliefProjectionContexts.some(Boolean)) sourceParts.push('RP2 relief projection')

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

    if (starters.some((starter) => Number.isFinite(starter?.recentFormScore))) {
      signals.push(
        createSignal(
          'Recent starter form',
          0.11,
          starters.map((starter) => ({
            label: starter?.recentFormLabel || 'No recent form yet',
            score: Number.isFinite(starter?.recentFormScore) ? starter.recentFormScore : 50
          })),
          'Warehouse rolling pitcher form'
        )
      )
    }

    if (starterWeatherAdjustments.some((adjustment) => adjustment?.active)) {
      const weatherFitScores = participants.map((participant, index) => {
        const own = starterWeatherAdjustments[index]
        const opposing = starterWeatherAdjustments[index === 0 ? 1 : 0]
        const ownDamage =
          Number(own?.hitDelta || 0) * 18 +
          Number(own?.runDelta || 0) * 22 -
          Number(own?.holdDelta || 0) * 0.65
        const opposingDamage =
          Number(opposing?.hitDelta || 0) * 18 +
          Number(opposing?.runDelta || 0) * 22 -
          Number(opposing?.holdDelta || 0) * 0.65
        const weatherEdge = opposingDamage - ownDamage
        const active = own?.active || opposing?.active
        const ownLabel = own?.label || 'own starter unknown'
        const opposingLabel = opposing?.label || 'opposing starter unknown'

        return {
          label: active
            ? `${participant.name}: ${ownLabel} vs ${opposingLabel}`
            : `${participant.name}: pitcher-weather neutral`,
          score: clamp(50 + weatherEdge, 34, 68)
        }
      })

      signals.push(
        createSignal(
          'Pitcher weather fit',
          0.08,
          weatherFitScores,
          'Starter pitch mix + temperature/HRForce'
        )
      )
    }

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
        const opposingStarter = starters[index === 0 ? 1 : 0]
        const opposingStarterVsTeamContext = opposingStarter?.starterVsTeamContext
        const starterVsTeamFirst5RunDelta =
          opposingStarterVsTeamContext &&
          Number(opposingStarterVsTeamContext.sampleWeight || 0) >= 0.18
            ? Number(opposingStarterVsTeamContext.first5RunsDelta || 0)
            : 0
        const sunVisibilityRisk = Number(sunVisibilityProfile?.visibilityRiskScore)
        const sunFirst5RunLift = Number.isFinite(sunVisibilityRisk)
          ? clamp((sunVisibilityRisk - 38) * 0.0018, 0, 0.08)
          : 0
        const sunLateRunLift = Number.isFinite(sunVisibilityRisk)
          ? clamp((sunVisibilityRisk - 50) * 0.0012, 0, 0.04)
          : 0
        const first5ConversionRate = buildRunConversionRate({
          offenseScore: offenseScores[index],
          savantScore: savantScores[index],
          parkContext: game.parkContext,
          opposingStarter,
          opposingBullpenExhaustion: bullpenExhaustionScores[index === 0 ? 1 : 0],
          opposingReliefProjectionContext: reliefProjectionContexts[index === 0 ? 1 : 0],
          environmentAdjustmentContext,
          ficDailyMatchupTeamContext: ficDailyMatchupTeamContexts[index],
          lineupProfile: lineupProfiles[index],
          weatherProfile,
          phase: 'first5'
        })
        const lateConversionRate = buildRunConversionRate({
          offenseScore: offenseScores[index],
          savantScore: savantScores[index],
          parkContext: game.parkContext,
          opposingStarter,
          opposingBullpenExhaustion: bullpenExhaustionScores[index === 0 ? 1 : 0],
          opposingReliefProjectionContext: reliefProjectionContexts[index === 0 ? 1 : 0],
          environmentAdjustmentContext,
          ficDailyMatchupTeamContext: ficDailyMatchupTeamContexts[index],
          lineupProfile: lineupProfiles[index],
          weatherProfile,
          phase: 'late'
        })
        const first5Runs = roundToTenths(
          profile.first5ProjectedHits * first5ConversionRate +
            sunFirst5RunLift +
            starterVsTeamFirst5RunDelta +
            Number(profile.starterWeatherAdjustment?.runDelta || 0)
        )
        const lateRuns = roundToTenths(profile.lateProjectedHits * lateConversionRate + sunLateRunLift)

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
      const postedFirst5Total = getPostedFirst5TotalLine(game)
      const runShareFirst5TotalLine =
        Number.isFinite(postedTotal) && Number.isFinite(first5Share)
          ? roundToTenths(postedTotal * first5Share)
          : null
      const derivedFirst5TotalLine = Number.isFinite(postedFirst5Total)
        ? postedFirst5Total
        : runShareFirst5TotalLine
      const derivedLateTotalLine =
        Number.isFinite(postedTotal) && Number.isFinite(derivedFirst5TotalLine)
          ? roundToTenths(postedTotal - derivedFirst5TotalLine)
          : null
      const totalGateInputs = {
        projectedHitProfiles,
        teamMistakeShapes: [
          game.stateContext?.teamMistakeShape?.away ?? null,
          game.stateContext?.teamMistakeShape?.home ?? null
        ],
        lineupConversionShapes: [
          game.stateContext?.lineupConversion?.away ?? null,
          game.stateContext?.lineupConversion?.home ?? null
        ],
        bullpenMistakeShapes: [
          game.stateContext?.bullpenMistake?.away ?? null,
          game.stateContext?.bullpenMistake?.home ?? null
        ],
        weatherProfile,
        sunVisibilityProfile,
        environmentAdjustmentContext,
        ficDailyMatchupContext,
        reliefProjectionContexts,
        starterVsTeamContexts: starters.map((starter) => starter?.starterVsTeamContext).filter(Boolean)
      }
      const first5TailOverlay = buildFirst5TailOverlay({
        baseProjectedRuns: projectedFirst5TotalRuns,
        line: derivedFirst5TotalLine,
        ...totalGateInputs
      })
      const tailAdjustedProjectedFirst5TotalRuns = first5TailOverlay.adjustedProjectedRuns
      const fullGameTotalLean = applyTotalChaosGate(
        buildTotalLean(projectedFullTotalRuns, postedTotal),
        {
          ...totalGateInputs,
          phase: 'full',
          line: postedTotal
        }
      )
      let first5TotalLean = applyTotalChaosGate(
        buildTotalLean(projectedFirst5TotalRuns, derivedFirst5TotalLine),
        {
          ...totalGateInputs,
          phase: 'first5',
          line: derivedFirst5TotalLine
        }
      )
      if (first5TailOverlay.shape === 'unsupported-over' && first5TotalLean?.lean === 'Over') {
        first5TotalLean = {
          ...first5TotalLean,
          lean: 'Pass',
          strength: 'Unsupported over',
          label: Number.isFinite(derivedFirst5TotalLine) ? `Hold ${derivedFirst5TotalLine}` : 'Hold total',
          summary:
            `${first5TotalLean.summary} Tail overlay removed the over because the point edge lacks run-explosion support.`,
          originalLean: first5TotalLean.originalLean || first5TotalLean.lean,
          originalStrength: first5TotalLean.originalStrength || first5TotalLean.strength,
          originalLabel: first5TotalLean.originalLabel || first5TotalLean.label
        }
      }
      if (
        first5TotalLean?.lean === 'Under' &&
        first5TailOverlay.shape === 'over-tail' &&
        (
          first5TailOverlay.metrics?.weatherCarry ||
          Number(first5TailOverlay.tailScore) >= 65
        )
      ) {
        first5TotalLean = {
          ...first5TotalLean,
          lean: 'Pass',
          strength: 'Tail conflict',
          label: Number.isFinite(derivedFirst5TotalLine) ? `Hold ${derivedFirst5TotalLine}` : 'Hold total',
          summary:
            `${first5TotalLean.summary} Tail overlay blocks the under because the game has a credible run-explosion branch.`,
          originalLean: first5TotalLean.originalLean || first5TotalLean.lean,
          originalStrength: first5TotalLean.originalStrength || first5TotalLean.strength,
          originalLabel: first5TotalLean.originalLabel || first5TotalLean.label
        }
      }
      if (
        first5TailOverlay.marketExpression === 'Over' &&
        (first5TotalLean?.chaosGate?.vetoed || first5TotalLean?.lean !== 'Over') &&
        first5TailOverlay.shape === 'over-tail' &&
        Number(first5TailOverlay.adjustedEdge) >= 0.65 &&
        (
          first5TailOverlay.metrics?.weatherCarry ||
          Number(first5TailOverlay.tailScore) >= 88 ||
          Number(derivedFirst5TotalLine) <= 4.1
        )
      ) {
        first5TotalLean = {
          ...first5TotalLean,
          lean: 'Over',
          strength: 'Tail validated',
          label: Number.isFinite(derivedFirst5TotalLine) ? `Over ${derivedFirst5TotalLine}` : 'Over',
          summary:
            `${first5TotalLean.summary} Tail overlay keeps the over alive because the failure mode is an actual run-explosion path, not a clean under.`,
          originalLean: first5TotalLean.originalLean || first5TotalLean.lean,
          originalStrength: first5TotalLean.originalStrength || first5TotalLean.strength,
          originalLabel: first5TotalLean.originalLabel || first5TotalLean.label
        }
      }
      if (first5TailOverlay.marketExpression === 'Live-only') {
        first5TotalLean = {
          ...first5TotalLean,
          lean: 'Pass',
          strength: 'Live-only fork',
          label: Number.isFinite(derivedFirst5TotalLine) ? `Live only ${derivedFirst5TotalLine}` : 'Live only',
          summary:
            `${first5TotalLean.summary} Tail overlay says both run explosion and strand paths are live; wait for first-cycle traffic/contact before betting.`,
          originalLean: first5TotalLean.originalLean || first5TotalLean.lean,
          originalStrength: first5TotalLean.originalStrength || first5TotalLean.strength,
          originalLabel: first5TotalLean.originalLabel || first5TotalLean.label
        }
      }
      first5TotalLean = {
        ...first5TotalLean,
        tailOverlay: first5TailOverlay
      }
      const lateTotalLean = applyTotalChaosGate(
        buildTotalLean(projectedLateTotalRuns, derivedLateTotalLine),
        {
          ...totalGateInputs,
          phase: 'late',
          line: derivedLateTotalLine
        }
      )
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
      const weatherNote = weatherProfile?.label
        ? `${weatherProfile.label}.`
        : ''
      const sunVisibilityNote =
        Number(sunVisibilityProfile?.visibilityRiskScore) >= 18
          ? `Sun visibility ${sunVisibilityProfile.riskLabel || 'risk'}: ${sunVisibilityProfile.visibilityRiskScore}/100.`
          : ''
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
      const firstInningProfiles = participants.map((participant, index) =>
        buildFirstInningRunProfile({
          projectedRunProfile: projectedRunProfiles[index],
          teamName: participants[index]?.name || (index === 0 ? 'Away team' : 'Home team'),
          opposingTeamName: participants[index === 0 ? 1 : 0]?.name || (index === 0 ? 'Home team' : 'Away team'),
          teamScript: teamScripts[index],
          lineupProfile: lineupProfiles[index],
          hitterState:
            index === 0 ? game.stateContext?.hitterState?.away : game.stateContext?.hitterState?.home,
          teamState:
            index === 0 ? game.stateContext?.teamState?.away : game.stateContext?.teamState?.home,
          teamFirstInningProfile:
            index === 0 ? game.stateContext?.firstInningTeam?.away : game.stateContext?.firstInningTeam?.home,
          teamSeriesEarlyProfile:
            index === 0 ? game.stateContext?.seriesEarlyPhase?.away : game.stateContext?.seriesEarlyPhase?.home,
          opposingSeriesEarlyProfile:
            index === 0 ? game.stateContext?.seriesEarlyPhase?.home : game.stateContext?.seriesEarlyPhase?.away,
          opposingTeamFirstInningProfile:
            index === 0 ? game.stateContext?.firstInningTeam?.home : game.stateContext?.firstInningTeam?.away,
          opposingPitcherFirstInningProfile:
            index === 0 ? game.stateContext?.firstInningPitcher?.home : game.stateContext?.firstInningPitcher?.away,
          opposingPitcherFirstInningSeasonProfile:
            index === 0
              ? game.stateContext?.firstInningPitcherSeason?.home
              : game.stateContext?.firstInningPitcherSeason?.away,
          opposingPitcherWarProfile:
            index === 0 ? game.stateContext?.pitcherWar?.home : game.stateContext?.pitcherWar?.away,
          opposingStarter: starters[index === 0 ? 1 : 0],
          weatherProfile,
          environmentAdjustmentContext,
          ficDailyMatchupTeamContext: ficDailyMatchupTeamContexts[index]
        })
      )
      const firstInningLean = buildFirstInningLean({
        awayTeam: participants[0]?.name || 'Away team',
        homeTeam: participants[1]?.name || 'Home team',
        awayProfile: firstInningProfiles[0],
        homeProfile: firstInningProfiles[1]
      })
      const adjustmentChecklist = buildProjectionAdjustmentChecklist({
        participants,
        starters,
        lineupProfiles,
        projectedHitProfiles,
        projectedRunProfiles,
        environmentAdjustmentContext,
        weatherProfile,
        ficDailyMatchupContext,
        reliefProjectionContexts
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
        awayStarterHoldConfidence: starterHoldConfidence[0],
        homeStarterHoldConfidence: starterHoldConfidence[1],
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
          tailAdjustedProjectedFirst5TotalRuns,
          first5TailOverlay,
          projectedLateTotalRuns,
          derivedFirst5TotalLine,
          postedFirst5TotalLine: Number.isFinite(postedFirst5Total) ? postedFirst5Total : null,
          runShareFirst5TotalLine,
          first5TotalLineSource: Number.isFinite(postedFirst5Total) ? 'posted' : 'full-game-derived',
          derivedLateTotalLine,
          bullpenExhaustionNote: [weatherNote, sunVisibilityNote, bullpenExhaustionNote].filter(Boolean).join(' '),
          weatherNote,
          sunVisibilityNote
        },
        firstInning: firstInningLean,
        teamScripts,
        lineupSimulation,
        weather: weatherProfile,
        sunVisibility: sunVisibilityProfile,
        environmentAdjustment: summarizeEnvironmentAdjustmentContext(environmentAdjustmentContext),
        ficDailyMatchup: summarizeFicDailyMatchupContext(ficDailyMatchupContext),
        reliefProjection: summarizeReliefProjectionContexts(participants, reliefProjectionContexts),
        adjustmentChecklist,
        visibilityNote: sunVisibilityNote
      }

      if (hitEdge <= 0.4) {
        volatilityModifiers.push({ label: 'Projected hit volume is nearly even', delta: 3 })
      }

      const awayStoryVariance = Number(storyProfiles[0]?.variance)
      const homeStoryVariance = Number(storyProfiles[1]?.variance)
      const awayOffenseSustainability = Number(storyProfiles[0]?.offenseSustainability)
      const homeOffenseSustainability = Number(storyProfiles[1]?.offenseSustainability)
      const awayBullpenTrust = Number(storyProfiles[0]?.bullpenTrust)
      const homeBullpenTrust = Number(storyProfiles[1]?.bullpenTrust)
      const awayStarterTrajectory = Number(storyProfiles[0]?.starterTrajectory)
      const homeStarterTrajectory = Number(storyProfiles[1]?.starterTrajectory)
      const awayLineupMomentum = Number(storyProfiles[0]?.lineupMomentum)
      const homeLineupMomentum = Number(storyProfiles[1]?.lineupMomentum)

      if ([awayStoryVariance, homeStoryVariance].some((value) => Number.isFinite(value) && value >= 68)) {
        volatilityModifiers.push({
          label: 'At least one club still carries a shaky day-to-day team-story profile',
          delta: 4
        })
      }

      if (
        Number.isFinite(awayOffenseSustainability) &&
        Number.isFinite(homeOffenseSustainability) &&
        Math.abs(awayOffenseSustainability - homeOffenseSustainability) >= 18
      ) {
        volatilityModifiers.push({
          label: 'Recent offense sustain differs sharply between the two club stories',
          delta: 3
        })
      }

      if (
        favoriteIndex !== null &&
        Number.isFinite([awayOffenseSustainability, homeOffenseSustainability][favoriteIndex]) &&
        [awayOffenseSustainability, homeOffenseSustainability][favoriteIndex] <= 44
      ) {
        volatilityModifiers.push({
          label: 'Favorite still has a weak recent offense-sustain story',
          delta: 5
        })
        confidenceModifier -= 4
      }

      if (
        favoriteIndex !== null &&
        Number.isFinite([awayStarterTrajectory, homeStarterTrajectory][favoriteIndex]) &&
        [awayStarterTrajectory, homeStarterTrajectory][favoriteIndex] <= 48
      ) {
        volatilityModifiers.push({
          label: 'Favorite starter story is flatter than the reputation/price implies',
          delta: 3
        })
        confidenceModifier -= 2
      }

      const underdogIndex = favoriteIndex === 0 ? 1 : favoriteIndex === 1 ? 0 : null

      if (
        underdogIndex !== null &&
        Number.isFinite([awayLineupMomentum, homeLineupMomentum][underdogIndex]) &&
        [awayLineupMomentum, homeLineupMomentum][underdogIndex] >= 64
      ) {
        volatilityModifiers.push({
          label: 'Underdog carries a live recent lineup-momentum story',
          delta: 4
        })
      }

      if (
        underdogIndex !== null &&
        Number.isFinite([awayBullpenTrust, homeBullpenTrust][underdogIndex]) &&
        Number.isFinite([awayBullpenTrust, homeBullpenTrust][favoriteIndex]) &&
        [awayBullpenTrust, homeBullpenTrust][underdogIndex] -
          [awayBullpenTrust, homeBullpenTrust][favoriteIndex] >= 10
      ) {
        volatilityModifiers.push({
          label: 'Underdog team story trusts the late innings more than the favorite does',
          delta: 4
        })
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

    if (
      starters.some(
        (starter) =>
          starter?.recentForm &&
          Number.isFinite(starter.recentForm.shortStartRate) &&
          starter.recentForm.shortStartRate >= 0.45 &&
          Number.isFinite(starter.recentFormWeight) &&
          starter.recentFormWeight >= 0.45
      )
    ) {
      volatilityModifiers.push({ label: 'A recent short-start pattern is live in this matchup', delta: 4 })
    }

    if (
      starters.some(
        (starter) =>
          starter?.recentForm &&
          Number.isFinite(starter.recentForm.homeRunsAllowedPerStart) &&
          starter.recentForm.homeRunsAllowedPerStart >= 1.1 &&
          Number.isFinite(starter.recentFormWeight) &&
          starter.recentFormWeight >= 0.45
      )
    ) {
      volatilityModifiers.push({ label: 'One listed starter has been leaking recent home-run damage', delta: 4 })
    }

    if (
      starters.some(
        (starter) =>
          starter?.recentForm &&
          Number.isFinite(starter.recentForm.runVolatility) &&
          starter.recentForm.runVolatility >= 1.9 &&
          Number.isFinite(starter.recentFormWeight) &&
          starter.recentFormWeight >= 0.45
      )
    ) {
      volatilityModifiers.push({ label: 'Recent starter form is carrying higher run volatility', delta: 3 })
    }

    if (starters[0].handedness && starters[1].handedness && starters[0].handedness !== starters[1].handedness) {
      volatilityModifiers.push({ label: 'Handedness contrast can change game shape quickly', delta: 2 })
    }

    if (
      lineupProfiles.some(
        (profile) =>
          profile &&
          Number.isFinite(profile.platoonPressureIndex) &&
          profile.platoonPressureIndex >= 62
      )
    ) {
      volatilityModifiers.push({ label: 'One lineup carries real platoon pressure versus the listed starter hand', delta: 3 })
    }

    if (
      lineupProfiles.some(
        (profile) =>
          profile &&
          Number.isFinite(profile.handednessSplitIndex) &&
          (
            profile.handednessSplitIndex >= 62 ||
            profile.handednessSplitIndex <= 40
          )
      )
    ) {
      volatilityModifiers.push({ label: 'Handedness split rows are moving the offensive shape', delta: 3 })
    }

    if (starters.some((starter) => starter?.starterVsTeamContext?.repeatOpponentUnderWarning)) {
      volatilityModifiers.push({ label: 'Repeat-opponent starter damage tax is live', delta: 4 })
    }

    if (
      lineupProfiles.some(
        (profile) =>
          profile &&
          Number.isFinite(profile.starterMatchupKernelIndex) &&
          (
            profile.starterMatchupKernelIndex >= 62 ||
            profile.starterMatchupKernelIndex <= 40
          )
      )
    ) {
      volatilityModifiers.push({ label: 'Batter-vs-starter kernel is moving the offensive shape', delta: 3 })
    }

    if (
      lineupProfiles.some(
        (profile) =>
          profile &&
          Number.isFinite(profile.pitchTypePressureIndex) &&
          profile.pitchTypePressureIndex >= 62
      )
    ) {
      volatilityModifiers.push({ label: 'One lineup specifically fits the listed starter arsenal', delta: 3 })
    }

    if (
      lineupProfiles.some(
        (profile) =>
          profile &&
          Number.isFinite(profile.bullpenPitchTypePressureIndex) &&
          profile.bullpenPitchTypePressureIndex >= 62
      )
    ) {
      volatilityModifiers.push({ label: 'One lineup also fits the likely bridge-reliever arsenal', delta: 3 })
    }

    if (weatherProfile?.label && Number.isFinite(weatherProfile.volatilityDelta) && weatherProfile.volatilityDelta !== 0) {
      volatilityModifiers.push({
        label: weatherProfile.label,
        delta: Math.round(weatherProfile.volatilityDelta)
      })
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

      if (
        starters[favoriteIndex]?.recentForm &&
        Number.isFinite(starters[favoriteIndex].recentForm.shortStartRate) &&
        starters[favoriteIndex].recentForm.shortStartRate >= 0.45 &&
        Number.isFinite(starters[favoriteIndex].recentFormWeight) &&
        starters[favoriteIndex].recentFormWeight >= 0.45
      ) {
        volatilityModifiers.push({
          label: 'Favorite starter has a live short-start pattern in recent form',
          delta: 4
        })
      }

      if (
        starters[favoriteIndex]?.recentForm &&
        Number.isFinite(starters[favoriteIndex].recentForm.recent3EarnedRunsDelta) &&
        starters[favoriteIndex].recentForm.recent3EarnedRunsDelta >= 0.9 &&
        Number.isFinite(starters[favoriteIndex].recentFormWeight) &&
        starters[favoriteIndex].recentFormWeight >= 0.45
      ) {
        volatilityModifiers.push({
          label: 'Favorite starter has been trending worse across the most recent turns',
          delta: 3
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
    volatilityBase: MLB_VOLATILITY_BASE,
    volatilityModifiers,
    confidenceModifier,
    mlbProjection,
    mlbRiskContext: {
      starters,
      starterScores,
      starterHoldConfidence,
      offenseScores,
      bullpenScores,
      bullpenChainScores,
      reliefProjectionContexts,
      savantScores,
      environmentAdjustmentContext,
      ficDailyMatchupContext,
      weatherProfile,
      lineupProfiles,
      lineupScores,
      projectedHitProfiles,
      starterLeashScores,
      storyPriors: [game.tierTwoContext?.storyPriors?.away ?? null, game.tierTwoContext?.storyPriors?.home ?? null],
      teamStateSnapshots: [game.stateContext?.teamState?.away ?? null, game.stateContext?.teamState?.home ?? null],
      hitterStateSnapshots: [game.stateContext?.hitterState?.away ?? null, game.stateContext?.hitterState?.home ?? null],
      teamMistakeShapes: [game.stateContext?.teamMistakeShape?.away ?? null, game.stateContext?.teamMistakeShape?.home ?? null],
      lineupConversionShapes: [game.stateContext?.lineupConversion?.away ?? null, game.stateContext?.lineupConversion?.home ?? null],
      bullpenMistakeShapes: [game.stateContext?.bullpenMistake?.away ?? null, game.stateContext?.bullpenMistake?.home ?? null],
      tierThreeBullpenProfiles: [game.tierThreeContext?.bullpenCommand?.away ?? null, game.tierThreeContext?.bullpenCommand?.home ?? null],
      starterThirdTimeProfiles: [game.tierThreeContext?.starterThirdTime?.away ?? null, game.tierThreeContext?.starterThirdTime?.home ?? null]
    }
  }
}


export {
  buildMlbAnalysisContext,
  parseStreakCode
}
