import { clamp, roundToTenths } from './core-utils.js'

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

const getRecentStarterFormReliability = (startsSample = 0) => {
  if (startsSample >= 5) return 1
  if (startsSample === 4) return 0.88
  if (startsSample === 3) return 0.74
  if (startsSample === 2) return 0.5
  if (startsSample === 1) return 0.26
  return 0
}

const buildStarterRecentFormLabel = (starter = {}) => {
  const recent = starter?.recentForm
  if (!recent || !Number.isFinite(recent.startsSample) || recent.startsSample <= 0) return 'No recent form yet'

  return `Last ${recent.startsSample}: ${recent.inningsPerStart?.toFixed?.(1) ?? recent.inningsPerStart} IP/start | ${recent.earnedRunsPerStart?.toFixed?.(1) ?? recent.earnedRunsPerStart} ER/start`
}

const buildStarterRecentFormScore = (starter = {}) => {
  const recent = starter?.recentForm
  const reliability = Number(starter?.recentFormWeight)

  if (!recent || !Number.isFinite(reliability) || reliability <= 0) return null

  const inningsScore = Number.isFinite(recent.inningsPerStart)
    ? clamp(45 + (recent.inningsPerStart - 5.1) * 9, 18, 92)
    : 50
  const erScore = Number.isFinite(recent.earnedRunsPerStart)
    ? clamp(90 - recent.earnedRunsPerStart * 13, 18, 92)
    : 50
  const hrScore = Number.isFinite(recent.homeRunsAllowedPerStart)
    ? clamp(86 - recent.homeRunsAllowedPerStart * 24, 18, 92)
    : 50
  const shortStartPenalty = Number.isFinite(recent.shortStartRate) ? recent.shortStartRate * 26 : 0
  const volatilityPenalty = Number.isFinite(recent.runVolatility) ? recent.runVolatility * 6 : 0
  const trendAdjustment = Number.isFinite(recent.recent3EarnedRunsDelta)
    ? clamp(-recent.recent3EarnedRunsDelta * 5, -12, 12)
    : 0

  return clamp(
    (inningsScore * 0.28 + erScore * 0.38 + hrScore * 0.2 + (Number.isFinite(recent.qualityStartRate) ? 42 + recent.qualityStartRate * 38 : 50) * 0.14) *
      (0.78 + reliability * 0.22) -
      shortStartPenalty -
      volatilityPenalty +
      trendAdjustment,
    18,
    94
  )
}

const buildStarterProfile = (starterContext = null, detail = '', warProfile = null) => {
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
  const usageContext = starterContext?.usageContext ?? null
  const recentFormRaw = starterContext?.recentForm ?? null
  const kPerNine = inningsFloat > 0 ? (strikeouts / inningsFloat) * 9 : null
  const bbPerNine = inningsFloat > 0 && Number.isFinite(walks) ? (walks / inningsFloat) * 9 : null
  const hitsPerNine = inningsFloat > 0 && Number.isFinite(hitsAllowed) ? (hitsAllowed / inningsFloat) * 9 : null
  const hrPerNine = inningsFloat > 0 && Number.isFinite(homeRunsAllowed) ? (homeRunsAllowed / inningsFloat) * 9 : null
  const recentForm = recentFormRaw
    ? {
        pitcherName: recentFormRaw.pitcherName || starterContext?.fullName || parsed?.name || '',
        windowStarts: Number(recentFormRaw.windowStarts ?? 0) || 0,
        startsSample: Number(recentFormRaw.startsSample ?? 0) || 0,
        inningsPerStart: Number.isFinite(Number(recentFormRaw.inningsPerStart))
          ? Number(recentFormRaw.inningsPerStart)
          : null,
        earnedRunsPerStart: Number.isFinite(Number(recentFormRaw.earnedRunsPerStart))
          ? Number(recentFormRaw.earnedRunsPerStart)
          : null,
        hitsAllowedPerStart: Number.isFinite(Number(recentFormRaw.hitsAllowedPerStart))
          ? Number(recentFormRaw.hitsAllowedPerStart)
          : null,
        homeRunsAllowedPerStart: Number.isFinite(Number(recentFormRaw.homeRunsAllowedPerStart))
          ? Number(recentFormRaw.homeRunsAllowedPerStart)
          : null,
        walksAllowedPerStart: Number.isFinite(Number(recentFormRaw.walksAllowedPerStart))
          ? Number(recentFormRaw.walksAllowedPerStart)
          : null,
        strikeoutsPerStart: Number.isFinite(Number(recentFormRaw.strikeoutsPerStart))
          ? Number(recentFormRaw.strikeoutsPerStart)
          : null,
        whipLike: Number.isFinite(Number(recentFormRaw.whipLike))
          ? Number(recentFormRaw.whipLike)
          : null,
        shortStartRate: Number.isFinite(Number(recentFormRaw.shortStartRate))
          ? Number(recentFormRaw.shortStartRate)
          : null,
        qualityStartRate: Number.isFinite(Number(recentFormRaw.qualityStartRate))
          ? Number(recentFormRaw.qualityStartRate)
          : null,
        runVolatility: Number.isFinite(Number(recentFormRaw.runVolatility))
          ? Number(recentFormRaw.runVolatility)
          : null,
        homeRunBurstiness: Number.isFinite(Number(recentFormRaw.homeRunBurstiness))
          ? Number(recentFormRaw.homeRunBurstiness)
          : null,
        recent3EarnedRunsDelta: Number.isFinite(Number(recentFormRaw.recent3EarnedRunsDelta))
          ? Number(recentFormRaw.recent3EarnedRunsDelta)
          : null
      }
    : null
  const recentFormWeight = getRecentStarterFormReliability(recentForm?.startsSample || 0)
  const expectedInningsValue = Number(usageContext?.expectedInnings)
  const expectedInnings = Number.isFinite(expectedInningsValue) ? expectedInningsValue : null
  const leashScoreValue = Number(usageContext?.leashScore)
  const leashScore = Number.isFinite(leashScoreValue) ? leashScoreValue : null
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
    expectedInnings,
    leashScore,
    usageShortLeashRisk: Number.isFinite(Number(usageContext?.shortLeashRisk))
      ? Number(usageContext.shortLeashRisk)
      : null,
    usageDurableRate: Number.isFinite(Number(usageContext?.durableRate))
      ? Number(usageContext.durableRate)
      : null,
    leashVolatility: Number.isFinite(Number(usageContext?.leashVolatility))
      ? Number(usageContext.leashVolatility)
      : null,
    fivePlusInningRate: Number.isFinite(Number(usageContext?.fivePlusInningRate))
      ? Number(usageContext.fivePlusInningRate)
      : null,
    sixPlusInningRate: Number.isFinite(Number(usageContext?.sixPlusInningRate))
      ? Number(usageContext.sixPlusInningRate)
      : null,
    kPerNine,
    bbPerNine,
    hitsPerNine,
    hrPerNine,
    recentForm,
    recentFormWeight,
    currentSeasonWar: Number.isFinite(Number(warProfile?.currentSeasonWar))
      ? Number(warProfile.currentSeasonWar)
      : null,
    previousSeasonWar: Number.isFinite(Number(warProfile?.previousSeasonWar))
      ? Number(warProfile.previousSeasonWar)
      : null,
    warDelta: Number.isFinite(Number(warProfile?.warDelta)) ? Number(warProfile.warDelta) : null,
    currentSeasonWarGamesStarted: Number.isFinite(Number(warProfile?.currentSeasonGamesStarted))
      ? Number(warProfile.currentSeasonGamesStarted)
      : null,
    previousSeasonWarGamesStarted: Number.isFinite(Number(warProfile?.previousSeasonGamesStarted))
      ? Number(warProfile.previousSeasonGamesStarted)
      : null
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
    sampleEstablished: Number.isFinite(inningsFloat) && inningsFloat >= 18 && Number.isFinite(era),
    recentFormLabel: buildStarterRecentFormLabel(starter),
    recentFormScore: buildStarterRecentFormScore(starter)
  }
}

const deriveStarterLeashScore = (starter = null) => {
  if (!starter) return null
  if (Number.isFinite(starter.leashScore)) return roundToTenths(starter.leashScore)

  let score = 48
  const inningsAnchor = Number.isFinite(starter.expectedInnings)
    ? starter.expectedInnings
    : starter.avgInningsPerStart

  if (Number.isFinite(inningsAnchor)) {
    score += (inningsAnchor - 5) * 11
  }

  if (Number.isFinite(starter.usageShortLeashRisk)) {
    score -= starter.usageShortLeashRisk * 18
  }

  if (Number.isFinite(starter.usageDurableRate)) {
    score += starter.usageDurableRate * 12
  }

  if (Number.isFinite(starter.recentForm?.shortStartRate)) {
    score -= starter.recentForm.shortStartRate * 11
  }

  if (Number.isFinite(starter.recentForm?.qualityStartRate)) {
    score += starter.recentForm.qualityStartRate * 9
  }

  if (Number.isFinite(starter.leashVolatility)) {
    score -= clamp(starter.leashVolatility - 1.6, 0, 8) * 1.2
  }

  return roundToTenths(clamp(score, 0, 100))
}

const pitcherRecordScore = (pitcher) =>
  clamp(28 + pitcher.winPct * 46 + Math.min(pitcher.decisions, 6) * 2, 24, 86)

const pitcherEraScore = (pitcher) =>
  Number.isFinite(pitcher.era) ? clamp(92 - pitcher.era * 9, 18, 90) : 50

const pitcherStrikeoutScore = (pitcher) => clamp(34 + pitcher.strikeouts * 1.08, 24, 88)

const starterScore = (pitcher) =>
  pitcherRecordScore(pitcher) * 0.24 +
  pitcherEraScore(pitcher) * 0.36 +
  pitcherStrikeoutScore(pitcher) * 0.22 +
  pitcherWarScore(pitcher) * 0.18


export {
  parseRecord,
  parsePitcherDetail,
  parseBaseballInnings,
  buildStarterProfile,
  deriveStarterLeashScore,
  pitcherRecordScore,
  pitcherEraScore,
  pitcherStrikeoutScore,
  starterScore
}
