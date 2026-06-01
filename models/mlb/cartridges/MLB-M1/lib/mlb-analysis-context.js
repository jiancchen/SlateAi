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
  weatherProfile = null
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
  }

  if (!opposingBullpen?.staleFeed && [Number(opposingBullpen.era), Number(opposingBullpen.whip)].every(Number.isFinite)) {
    bullpenAdjustment += (Number(opposingBullpen.era) - 4.1) * 0.14
    bullpenAdjustment += (Number(opposingBullpen.whip) - 1.31) * 0.9
    qualityNotes.push('bullpen shape')
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
    notes: qualityNotes
  }
}

const buildStarterHoldConfidence = ({ starter = null, lineupProfile = null }) => {
  if (!starter) return null

  let score = 56

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

  if (lineupProfile) {
    if (Number.isFinite(lineupProfile.starterPressureIndex)) {
      score -= (lineupProfile.starterPressureIndex - 50) * 0.42
    }

    if (Number.isFinite(lineupProfile.platoonPressureIndex)) {
      score -= (lineupProfile.platoonPressureIndex - 50) * 0.24
    }
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
  lineupProfile = null,
  weatherProfile = null,
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

    if (weatherProfile) {
      rate += Number(weatherProfile.runBoostFirst5 || 0)
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

    if (weatherProfile) {
      rate += Number(weatherProfile.runBoostLate || 0)
    }
  }

  if (phase === 'full' && weatherProfile) {
    rate += (Number(weatherProfile.runBoostFirst5 || 0) + Number(weatherProfile.runBoostLate || 0)) * 0.5
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
  weatherProfile = null
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
  const platoonPressureIndex = Number(lineupProfile?.platoonPressureIndex ?? 50)
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

  runProbability += Math.max(topThirdScore - 50, 0) * 0.0015
  runProbability += Math.max(starterPressureIndex - 50, 0) * 0.001
  runProbability += Math.max(overallPressureIndex - 50, 0) * 0.00045
  runProbability += Math.max(pitchTypePressureIndex - 50, 0) * 0.00035
  runProbability += Math.max(platoonPressureIndex - 50, 0) * 0.00035
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
    suppressReasons: suppressingReasons
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
    projectedRuns: roundToTenths(
      (Number(awayProfile.projectedRuns) || 0) + (Number(homeProfile.projectedRuns) || 0)
    ),
    line: 0.5,
    summary:
      pick === 'YRFI'
        ? `${pick} with a ${Math.round(pickedProbability * 100)}% modeled chance of at least one first-inning run. ${awayTeam} score ${awayProfile.runProbability}% of the time and ${homeTeam} ${homeProfile.runProbability}% of the time in this matchup blend of lineup pressure, recent early scoring shape, opposing starter leakage, series carryover, and weather.`
        : `${pick} with a ${Math.round(pickedProbability * 100)}% modeled chance that the first inning stays scoreless. ${awayTeam} score ${awayProfile.runProbability}% of the time and ${homeTeam} ${homeProfile.runProbability}% of the time in this matchup blend of lineup pressure, recent early scoring shape, opposing starter leakage, series carryover, and weather.`
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
        label: `Grade ${awayContext.averageMatchupGrade >= 0 ? '+' : ''}${awayContext.averageMatchupGrade.toFixed(2)} | platoon ${awayContext.platoonCount} | starter arsenal ${Number(awayContext.pitchTypePressureIndex || 50).toFixed(0)} | bridge arsenal ${Number(awayContext.bullpenPitchTypePressureIndex || 50).toFixed(0)} | pressure ${Number(awayContext.starterPressureIndex || 50).toFixed(0)}`,
        score: scores[0]
      },
      {
        label: `Grade ${homeContext.averageMatchupGrade >= 0 ? '+' : ''}${homeContext.averageMatchupGrade.toFixed(2)} | platoon ${homeContext.platoonCount} | starter arsenal ${Number(homeContext.pitchTypePressureIndex || 50).toFixed(0)} | bridge arsenal ${Number(homeContext.bullpenPitchTypePressureIndex || 50).toFixed(0)} | pressure ${Number(homeContext.starterPressureIndex || 50).toFixed(0)}`,
        score: scores[1]
      }
    ],
    'Official lineup + handedness + starter arsenal + likely reliever arsenal fit'
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
  const lineupProfiles = [
    game.lineupContext?.[participants[0]?.name],
    game.lineupContext?.[participants[1]?.name]
  ]
  const lineupBoards = [
    findLineupBoardForTeam(game.lineupBoard, participants[0]?.name),
    findLineupBoardForTeam(game.lineupBoard, participants[1]?.name)
  ]
  const weatherProfile = buildMlbWeatherProfile(game.lineupBoard)
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
      weatherProfile
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
      weatherProfile
    })
  ]
  const starterHoldConfidence = [
    buildStarterHoldConfidence({
      starter: starters[0],
      lineupProfile: lineupProfiles[1]
    }),
    buildStarterHoldConfidence({
      starter: starters[1],
      lineupProfile: lineupProfiles[0]
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
  const postedTotal = parseFirstTotalNumber(getTotalMarketValue(game.odds))

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
    sourceParts.push('bullpen workload + likely reliever chain')
  }
  if (game.savantContext?.away && game.savantContext?.home) sourceParts.push('Statcast contact quality')
  if (game.storyContext?.away && game.storyContext?.home) sourceParts.push('daily team story context')
  if (game.lineupContext?.[participants[0]?.name] && game.lineupContext?.[participants[1]?.name]) {
    sourceParts.push('daily lineup matchup context')
  }
  if (starters.some((starter) => starter?.recentForm)) sourceParts.push('recent starter form')
  if (weatherProfile?.label) sourceParts.push('weather context')

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
          lineupProfile: lineupProfiles[index],
          weatherProfile,
          phase: 'first5'
        })
        const lateConversionRate = buildRunConversionRate({
          offenseScore: offenseScores[index],
          savantScore: savantScores[index],
          parkContext: game.parkContext,
          opposingStarter: starters[index === 0 ? 1 : 0],
          opposingBullpenExhaustion: bullpenExhaustionScores[index === 0 ? 1 : 0],
          lineupProfile: lineupProfiles[index],
          weatherProfile,
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
      const weatherNote = weatherProfile?.label
        ? `${weatherProfile.label}.`
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
          weatherProfile
        })
      )
      const firstInningLean = buildFirstInningLean({
        awayTeam: participants[0]?.name || 'Away team',
        homeTeam: participants[1]?.name || 'Home team',
        awayProfile: firstInningProfiles[0],
        homeProfile: firstInningProfiles[1]
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
          projectedLateTotalRuns,
          derivedFirst5TotalLine,
          derivedLateTotalLine,
          bullpenExhaustionNote: [weatherNote, bullpenExhaustionNote].filter(Boolean).join(' '),
          weatherNote
        },
        firstInning: firstInningLean,
        teamScripts,
        lineupSimulation,
        weather: weatherProfile
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
      savantScores,
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
