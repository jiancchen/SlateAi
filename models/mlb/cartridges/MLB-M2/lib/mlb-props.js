import { mlbPropCalibration } from '../generated/mlb-prop-calibration.generated.js'
import { clamp, normalizeText, roundToTenths } from '../../../../shared/sports-core/core-utils.js'
import { parseBaseballInnings } from './mlb-starter-utils.js'
import { teamNamesMatch } from './team-utils.js'

const mlbPropTypeConfig = {
  homeRun: {
    label: 'HR',
    marketLabel: 'Over 0.5 HR',
    bucket: 'power',
    probabilityWeight: 0.72,
    baseOffset: 11
  },
  rbi: {
    label: 'RBI',
    marketLabel: 'Over 0.5 RBI',
    bucket: 'production',
    probabilityWeight: 0.66,
    baseOffset: 8
  },
  runs: {
    label: 'Runs',
    marketLabel: 'Over 0.5 runs',
    bucket: 'production',
    probabilityWeight: 0.72,
    baseOffset: 10
  },
  hitRunRbi: {
    label: 'H+R+RBI',
    marketLabel: 'Over 1.5 H+R+RBI',
    bucket: 'production',
    probabilityWeight: 0.86,
    baseOffset: 13
  },
  totalBases: {
    label: 'TB',
    marketLabel: 'Over 1.5 total bases',
    bucket: 'power',
    probabilityWeight: 0.84,
    baseOffset: 13
  },
  hits: {
    label: 'Hits',
    marketLabel: 'Over 1.5 hits',
    bucket: 'contact',
    probabilityWeight: 0.88,
    baseOffset: 14
  },
  walks: {
    label: 'Walks',
    marketLabel: 'Over 0.5 walks',
    bucket: 'patience',
    probabilityWeight: 0.8,
    baseOffset: 11
  },
  singles: {
    label: 'Singles',
    marketLabel: 'Over 0.5 singles',
    bucket: 'contact',
    probabilityWeight: 0.85,
    baseOffset: 12
  }
}

const trackedMlbPropTypeConfig = {
  totalBases: { minConfidence: 68, minSupport: 3, maxPerTeam: 2, maxPerGame: 4, priority: 6, minTrackingScore: 74 },
  singles: { minConfidence: 66, minSupport: 3, maxPerTeam: 1, maxPerGame: 3, priority: 5, minTrackingScore: 72 },
  walks: { minConfidence: 66, minSupport: 3, maxPerTeam: 1, maxPerGame: 2, priority: 4, minTrackingScore: 71 },
  rbi: { minConfidence: 71, minSupport: 4, maxPerTeam: 1, maxPerGame: 2, priority: 3, minTrackingScore: 76 },
  runs: { minConfidence: 68, minSupport: 3, maxPerTeam: 1, maxPerGame: 2, priority: 4, minTrackingScore: 73 },
  hitRunRbi: { minConfidence: 70, minSupport: 4, maxPerTeam: 2, maxPerGame: 4, priority: 7, minTrackingScore: 76 },
  hits: { disabled: true },
  homeRun: { disabled: true }
}

const lookupPropCalibration = (target) => {
  const propType = target?.propType || ''
  const teamName = target?.teamName || ''
  const teamKey = `${propType}::${teamName}`
  const reasonTags = String(target?.reason || '')
    .split('|')
    .map((part) => part.trim().toLowerCase())
    .filter(Boolean)
  const scriptTags = Array.isArray(target?.scriptTags)
    ? target.scriptTags.map((tag) => String(tag).trim().toLowerCase()).filter(Boolean)
    : []
  const storyTags = Array.isArray(target?.storyTags)
    ? target.storyTags.map((tag) => String(tag).trim().toLowerCase()).filter(Boolean)
    : []

  return {
    overall: mlbPropCalibration?.overallByType?.[propType] || null,
    team: mlbPropCalibration?.byTeamAndType?.[teamKey] || null,
    reasonTags: reasonTags
      .map((tag) => ({
        tag,
        summary: mlbPropCalibration?.byReasonTagAndType?.[`${propType}::${tag}`] || null
      }))
      .filter((entry) => entry.summary),
    scriptTags: scriptTags
      .map((tag) => ({
        tag,
        summary: mlbPropCalibration?.byScriptTagAndType?.[`${propType}::${tag}`] || null
      }))
      .filter((entry) => entry.summary),
    storyTags: storyTags
      .map((tag) => ({
        tag,
        summary: mlbPropCalibration?.byStoryTagAndType?.[`${propType}::${tag}`] || null
      }))
      .filter((entry) => entry.summary)
  }
}

const poissonProbabilityAtLeast = (lambda, threshold) => {
  if (!Number.isFinite(lambda) || lambda <= 0) return 0

  let cumulative = 0
  const floorThreshold = Math.floor(threshold)

  for (let count = 0; count <= floorThreshold; count += 1) {
    cumulative += Math.exp(-lambda) * Math.pow(lambda, count) / factorial(count)
  }

  return clamp(1 - cumulative, 0, 1)
}

const factorialMemo = [1]
const factorial = (value) => {
  const target = Math.max(0, Math.floor(value))
  if (factorialMemo[target] !== undefined) return factorialMemo[target]
  let result = factorialMemo[factorialMemo.length - 1]
  for (let index = factorialMemo.length; index <= target; index += 1) {
    result *= index
    factorialMemo[index] = result
  }
  return factorialMemo[target]
}

const weightedRate = (hitter, key, fallback = 0) => {
  const season = Number(hitter?.season?.[key])
  const recent = Number(hitter?.recent?.[key])
  const split = Number(hitter?.split?.[key])
  const careerKeyByRate = {
    hitRate: 'careerHitRate',
    singlesRate: null,
    totalBasesRate: 'careerTbPerPa',
    walkRate: 'careerBbRate',
    hrRate: 'careerHrPerPa'
  }
  const careerKey = careerKeyByRate[key]
  const career = careerKey ? Number(hitter?.careerProfile?.[careerKey]) : NaN
  const seasonPa = Number(hitter?.season?.plateAppearances || 0) || 0
  const careerPa = Number(hitter?.careerProfile?.careerPlateAppearances || 0) || 0
  const careerUsable = Number.isFinite(career) && career > 0 && careerPa >= 80
  const seasonWeight = Number.isFinite(season) ? season * 0.46 : 0
  const recentWeight = Number.isFinite(recent) ? recent * 0.32 : 0
  const splitWeight = Number.isFinite(split) ? split * 0.22 : 0
  const totalWeight =
    (Number.isFinite(season) ? 0.46 : 0) +
    (Number.isFinite(recent) ? 0.32 : 0) +
    (Number.isFinite(split) ? 0.22 : 0)

  const currentRate = totalWeight > 0 ? (seasonWeight + recentWeight + splitWeight) / totalWeight : fallback

  if (!careerUsable) return currentRate

  if (seasonPa < 16) {
    return currentRate * 0.6 + career * 0.4
  }

  if (seasonPa < 60) {
    return currentRate * 0.72 + career * 0.28
  }

  return currentRate * 0.9 + career * 0.1
}

const buildBatterApproachState = (hitter = null) => {
  const profile = hitter?.careerProfile || null
  const trend = hitter?.statcastTrend || {}
  const seasonPa = Number(hitter?.season?.plateAppearances || 0) || 0
  const careerPa = Number(profile?.careerPlateAppearances || 0) || 0
  const roleStability = Number(profile?.roleStabilityIndex)
  const contactRisk = Number(profile?.contactRiskIndex)
  const seasonTbRate = Number(hitter?.season?.totalBasesRate)
  const careerTbPerPa = Number(profile?.careerTbPerPa)
  const seasonHrRate = Number(hitter?.season?.hrRate)
  const careerHrPerPa = Number(profile?.careerHrPerPa)
  const rolling7Xwoba = Number(trend?.rolling7Xwoba)
  const rolling7Xslg = Number(trend?.rolling7Xslg)
  const rolling7HardHitPct = Number(trend?.rolling7HardHitPct)
  const rolling7BarrelPct = Number(trend?.rolling7BarrelPct)
  const trendSignal = trend?.trendSignal || null
  const careerWeight = seasonPa < 16 ? 0.4 : seasonPa < 60 ? 0.28 : 0.1
  const tbDelta =
    Number.isFinite(seasonTbRate) && Number.isFinite(careerTbPerPa) ? seasonTbRate - careerTbPerPa : 0
  const hrDelta =
    Number.isFinite(seasonHrRate) && Number.isFinite(careerHrPerPa) ? seasonHrRate - careerHrPerPa : 0
  let processScore = 0

  if (trendSignal === 'improving') processScore += 7
  if (trendSignal === 'fading') processScore -= 8
  if (Number.isFinite(rolling7Xwoba) && rolling7Xwoba >= 0.37) processScore += 4
  if (Number.isFinite(rolling7Xslg) && rolling7Xslg >= 0.52) processScore += 4
  if (Number.isFinite(rolling7HardHitPct) && rolling7HardHitPct >= 42) processScore += 3
  if (Number.isFinite(rolling7BarrelPct) && rolling7BarrelPct >= 9) processScore += 3

  const identityDelta = clamp(tbDelta * 70 + hrDelta * 180, -12, 12)
  const stabilityLift = Number.isFinite(roleStability) ? clamp((roleStability - 58) * 0.08, -3, 4) : 0
  const strikeoutTax = Number.isFinite(contactRisk) ? clamp((contactRisk - 52) * 0.08, 0, 5) : 0
  const tinySampleTax = seasonPa < 16 ? 5 : seasonPa < 60 ? 2 : 0
  const confidenceScore = clamp(
    50 + processScore + identityDelta + stabilityLift - strikeoutTax - tinySampleTax,
    18,
    84
  )
  const rolePressure =
    seasonPa < 24 && (!Number.isFinite(roleStability) || roleStability < 66)
      ? 'audition pressure'
      : seasonPa < 60
        ? 'role still forming'
        : 'role established'
  const approachLabel =
    trendSignal === 'fading'
      ? 'process fading'
      : confidenceScore >= 62 && seasonPa < 24
        ? 'career-story confidence spike'
        : confidenceScore >= 60
          ? 'process improving'
          : confidenceScore <= 42
            ? 'pressing / thin process'
            : 'baseline approach'

  return {
    confidenceScore: roundToTenths(confidenceScore),
    processScore: roundToTenths(processScore),
    careerWeight,
    identityDelta: roundToTenths(identityDelta),
    tbDelta: roundToTenths(tbDelta),
    hrDelta: roundToTenths(hrDelta),
    rolePressure,
    approachLabel,
    seasonPa,
    careerPa
  }
}

const buildHitterRepeatabilitySignal = (hitter = null) => {
  const profile = hitter?.careerProfile || null
  const seasonPa = Number(hitter?.season?.plateAppearances || 0) || 0
  const careerPa = Number(profile?.careerPlateAppearances || 0) || 0
  const powerIndex = Number(profile?.careerPowerIndex)
  const contactRisk = Number(profile?.contactRiskIndex)
  const roleStability = Number(profile?.roleStabilityIndex)
  const careerHrPerPa = Number(profile?.careerHrPerPa)
  const careerTbPerPa = Number(profile?.careerTbPerPa)
  const pitchTypeGrade = Number(hitter?.metrics?.pitchTypeGrade || 0)
  const matchupGrade = Number(hitter?.metrics?.matchupGrade || 0)
  const approachState = buildBatterApproachState(hitter)
  const careerPowerBacked =
    careerPa >= 180 &&
    (
      (Number.isFinite(powerIndex) && powerIndex >= 66) ||
      (Number.isFinite(careerHrPerPa) && careerHrPerPa >= 0.042) ||
      (Number.isFinite(careerTbPerPa) && careerTbPerPa >= 0.42)
    )
  const careerVolatile =
    (Number.isFinite(contactRisk) && contactRisk >= 54) ||
    `${profile?.volatilityLabel || ''}`.toLowerCase().includes('volatility')
  const roleStable = Number.isFinite(roleStability) && roleStability >= 54
  const canCarryTinySample =
    seasonPa < 24 &&
    careerPowerBacked &&
    (pitchTypeGrade >= 1.5 || matchupGrade >= 2.5 || roleStable)

  return {
    careerPa,
    seasonPa,
    powerIndex: Number.isFinite(powerIndex) ? powerIndex : null,
    contactRisk: Number.isFinite(contactRisk) ? contactRisk : null,
    roleStability: Number.isFinite(roleStability) ? roleStability : null,
    label: profile?.repeatabilityLabel || 'career profile pending',
    volatilityLabel: profile?.volatilityLabel || '',
    careerPowerBacked,
    careerVolatile,
    roleStable,
    approachState,
    canCarryTinySample,
    trackingPenalty: canCarryTinySample ? (careerVolatile ? 9 : 6) : 18,
    reason:
      seasonPa < 24 && careerPowerBacked
        ? `tiny 2026 sample, but career power profile is real (${profile?.careerHomeRuns || 0} HR / ${careerPa} PA)`
        : seasonPa < 24
          ? 'tiny 2026 sample without enough career support'
          : profile?.repeatabilityLabel || null
  }
}

const buildExpectedPlateAppearances = (slot = 9, projectedRuns = 4.2, topThirdScore = 50) => {
  const baseBySlot = {
    1: 4.75,
    2: 4.63,
    3: 4.55,
    4: 4.44,
    5: 4.29,
    6: 4.12,
    7: 3.98,
    8: 3.88,
    9: 3.8
  }

  return clamp(
    (baseBySlot[slot] || 3.8) +
      (Number(projectedRuns) - 4.3) * 0.11 +
      (Number(topThirdScore || 50) - 50) * 0.004,
    3.2,
    5.4
  )
}

const buildStarterWalkPressure = (starter = {}) => {
  const innings = parseBaseballInnings(starter?.inningsPitched ?? 0)
  const walks = Number(starter?.walks)
  const bbPerNine = innings > 0 && Number.isFinite(walks) ? (walks / innings) * 9 : null
  const whip = Number(starter?.whip)

  return clamp(
    (Number.isFinite(bbPerNine) ? (bbPerNine - 3) * 0.09 : 0) +
      (Number.isFinite(whip) ? (whip - 1.28) * 0.22 : 0),
    -0.12,
    0.22
  )
}

const getHomeRunTargetBoost = (game, teamName, playerName) => {
  const candidates = [...(game.homeRunTargets?.likely || []), ...(game.homeRunTargets?.possible || [])]
  const target = candidates.find(
    (entry) => teamNamesMatch(entry.teamName, teamName) && normalizeText(entry.playerName) === normalizeText(playerName)
  )

  if (!target) return { scoreBoost: 0, confidenceBoost: 0, target: null }

  const scoreBoost =
    target.scoreBand === 'premium'
      ? 0.11
      : target.scoreBand === 'strong'
        ? 0.075
        : target.scoreBand === 'live'
          ? 0.05
          : 0.02
  const confidenceBoost = target.scoreBand === 'premium' ? 8 : target.scoreBand === 'strong' ? 6 : 4

  return { scoreBoost, confidenceBoost, target }
}

const describeHomeRunPropLane = (target = null) =>
  target?.contextLabels?.[2] ||
  target?.contextLabels?.[1] ||
  (target?.burstTag ? `${target.burstTag} HR lane` : 'HR lane')

const buildHitterStatcastPropSignal = (trend = null) => {
  if (!trend) {
    return {
      tbMultiplier: 1,
      singlesMultiplier: 1,
      hrMultiplier: 1,
      tbConfidenceDelta: 0,
      singlesConfidenceDelta: 0,
      hrConfidenceDelta: 0,
      tags: [],
      tbReason: null,
      singlesReason: null,
      hrReason: null
    }
  }

  const rolling7Xwoba = Number(trend.rolling7Xwoba)
  const rolling7Xba = Number(trend.rolling7Xba)
  const rolling7Xslg = Number(trend.rolling7Xslg)
  const rolling7BarrelPct = Number(trend.rolling7BarrelPct)
  const rolling7HardHitPct = Number(trend.rolling7HardHitPct)
  const rolling7SweetSpotPct = Number(trend.rolling7SweetSpotPct)
  const xwobaTrend = Number(trend.xwobaTrend)
  const barrelTrend = Number(trend.barrelTrend)
  const hardHitTrend = Number(trend.hardHitTrend)
  const sweetSpotTrend = Number(trend.sweetSpotTrend)
  const trendSignal = trend.trendSignal || null

  let tbDelta = 0
  let singlesDelta = 0
  let hrDelta = 0
  const tags = []

  if (Number.isFinite(rolling7Xwoba) && rolling7Xwoba >= 0.365) tbDelta += 0.06
  if (Number.isFinite(rolling7Xslg) && rolling7Xslg >= 0.52) tbDelta += 0.05
  if (Number.isFinite(rolling7HardHitPct) && rolling7HardHitPct >= 42) tbDelta += 0.05
  if (Number.isFinite(rolling7BarrelPct) && rolling7BarrelPct >= 9) tbDelta += 0.04
  if (Number.isFinite(xwobaTrend) && xwobaTrend >= 0.012) tbDelta += 0.05
  if (trendSignal === 'improving') tbDelta += 0.04
  if (trendSignal === 'fading') tbDelta -= 0.08
  else if (Number.isFinite(xwobaTrend) && xwobaTrend <= -0.012) tbDelta -= 0.06

  if (Number.isFinite(rolling7SweetSpotPct) && rolling7SweetSpotPct >= 34) singlesDelta += 0.06
  if (Number.isFinite(sweetSpotTrend) && sweetSpotTrend >= 2) singlesDelta += 0.05
  if (Number.isFinite(rolling7Xba) && rolling7Xba >= 0.275) singlesDelta += 0.03
  if (trendSignal === 'fading') singlesDelta -= 0.05
  else if (Number.isFinite(sweetSpotTrend) && sweetSpotTrend <= -2) singlesDelta -= 0.04

  if (Number.isFinite(rolling7HardHitPct) && rolling7HardHitPct >= 44) hrDelta += 0.03
  if (Number.isFinite(rolling7BarrelPct) && rolling7BarrelPct >= 10) hrDelta += 0.03
  if (Number.isFinite(barrelTrend) && barrelTrend >= 1.5) hrDelta += 0.02
  if (Number.isFinite(hardHitTrend) && hardHitTrend >= 2.5) hrDelta += 0.02
  if (trendSignal === 'fading') hrDelta -= 0.03

  if (tbDelta >= 0.08) tags.push('statcast-power-up')
  if (singlesDelta >= 0.06) tags.push('statcast-contact-up')
  if (hrDelta >= 0.04) tags.push('statcast-hr-carry')
  if (tbDelta < 0 || singlesDelta < 0 || hrDelta < 0) tags.push('statcast-fade')

  return {
    tbMultiplier: clamp(1 + tbDelta, 0.82, 1.28),
    singlesMultiplier: clamp(1 + singlesDelta, 0.86, 1.18),
    hrMultiplier: clamp(1 + hrDelta, 0.92, 1.12),
    tbConfidenceDelta: tbDelta >= 0.08 ? 3 : tbDelta > 0.02 ? 1 : tbDelta < 0 ? -4 : 0,
    singlesConfidenceDelta: singlesDelta >= 0.06 ? 2 : singlesDelta > 0.02 ? 1 : singlesDelta < 0 ? -3 : 0,
    hrConfidenceDelta: hrDelta >= 0.04 ? 1 : hrDelta < 0 ? -2 : 0,
    tags,
    tbReason:
      tbDelta >= 0.08
        ? 'rolling Statcast power is live'
        : tbDelta < 0
          ? 'Statcast contact is fading'
          : null,
    singlesReason:
      singlesDelta >= 0.06
        ? 'sweet-spot contact is live'
        : singlesDelta < 0
          ? 'contact quality has cooled'
          : null,
    hrReason:
      hrDelta >= 0.04
        ? 'hard-hit / barrel trend is live'
        : hrDelta < 0
          ? 'HR contact trend is cooling'
          : null
  }
}

const buildTotalBasesShadowSignal = ({ hitter = null, weatherProfile = null, sunVisibilityProfile = null } = {}) => {
  if (!hitter) {
    return {
      supportTag: null,
      reason: null,
      scriptTag: null,
      supportLevel: 'none'
    }
  }

  const trend = hitter.statcastTrend || {}
  const opponentContext = hitter.opponentContext || {}
  const repeatability = buildHitterRepeatabilitySignal(hitter)
  const rolling7Xslg = Number(trend.rolling7Xslg)
  const rolling7HardHitPct = Number(trend.rolling7HardHitPct)
  const weightedTbDelta = Number(opponentContext.totalBasesPerPaWeightDeltaLast10)
  const pitchTypeGrade = Number(hitter?.metrics?.pitchTypeGrade || 0)
  const matchupGrade = Number(hitter?.metrics?.matchupGrade || 0)
  const weatherLift = Number(weatherProfile?.runBoostFirst5 || 0) + Number(weatherProfile?.runBoostLate || 0)
  const sunVisibilityRisk = Number(sunVisibilityProfile?.visibilityRiskScore)

  const xslgReady = Number.isFinite(rolling7Xslg) && rolling7Xslg >= 0.61
  const hardHitReady = Number.isFinite(rolling7HardHitPct) && rolling7HardHitPct >= 38.3
  const oppReady = Number.isFinite(weightedTbDelta) && weightedTbDelta > 0
  const careerReady = repeatability.careerPowerBacked
  const backed = xslgReady && hardHitReady && oppReady

  const extraSupports = []
  if (pitchTypeGrade >= 1.5) extraSupports.push('arsenal fit')
  if (matchupGrade >= 2.5) extraSupports.push('starter fit')
  if (weatherLift >= 0.08) extraSupports.push('weather lift')
  if (Number.isFinite(sunVisibilityRisk) && sunVisibilityRisk >= 42) extraSupports.push('sun visibility')
  if (careerReady) extraSupports.push('career power')

  if (backed) {
    const supportTail = extraSupports.length ? `; ${extraSupports.join(' + ')} supports it too` : ''
    return {
      supportTag: 'TB backed',
      scriptTag: 'tb-backed',
      supportLevel: 'backed',
      reason: `TB backed by real damage contact and tougher-opponent hold${supportTail}`
    }
  }

  if (xslgReady && hardHitReady && careerReady) {
    const supportTail = extraSupports.length ? `; ${extraSupports.join(' + ')} supports it` : ''
    return {
      supportTag: 'Career-backed heat',
      scriptTag: 'career-backed-heat',
      supportLevel: 'career-backed',
      reason: `single-slate heat fits the career power story, but opponent-strength repeatability is not fully proven${supportTail}`
    }
  }

  const missing = []
  if (!xslgReady) missing.push('xSLG')
  if (!hardHitReady) missing.push('hard-hit')
  if (!oppReady) missing.push('opponent-strength')
  if (!careerReady) missing.push('career-power')

  return {
    supportTag: 'Soft heat',
    scriptTag: 'soft-heat',
    supportLevel: 'soft',
    reason: `soft heat only: ${missing.slice(0, 2).join(' + ')} support is still thin`
  }
}

const calibrateMlbPropConfidence = ({
  config,
  propType,
  probability = 0,
  hitter,
  teamScript,
  lineupStatus = 'pending',
  weatherProfile = null,
  sunVisibilityProfile = null,
  homeRunBoost = null
}) => {
  const probabilityWeight = Number(config?.probabilityWeight || 0.8)
  const probabilityLift = Math.max(probability - 0.46, 0) * 72 * probabilityWeight
  let confidence = 34 + probabilityLift + Number(config?.baseOffset || 12) * 0.45
  const statcastSignal = buildHitterStatcastPropSignal(hitter?.statcastTrend)
  const repeatability = buildHitterRepeatabilitySignal(hitter)
  const approachState = repeatability.approachState || {}

  confidence += Math.max(0, Number(hitter?.metrics?.matchupGrade || 0)) * 1.05
  confidence += Math.max(0, (Number(hitter?.metrics?.formScore || 50) - 50) * 0.08)
  confidence += Math.max(0, (Number(hitter?.metrics?.pitchTypeGrade || 0)) * 1.15)

  if (Number.isFinite(teamScript?.topThirdScore)) {
    confidence += Math.max(Number(teamScript.topThirdScore) - 52, 0) * 0.05
  }

  if (lineupStatus === 'partial') confidence -= 4
  if (lineupStatus === 'pending') confidence -= 8

  if (propType === 'homeRun' || propType === 'totalBases' || propType === 'rbi') {
    if (Number(hitter?.metrics?.pitchTypeCoveragePct || 0) < 45) confidence -= 3
    if ((teamScript?.bullpenOverperformHitters || []).some((entry) => normalizeText(entry.name) === normalizeText(hitter?.name))) {
      confidence += 2
    }
  }

  if (propType === 'totalBases') confidence += statcastSignal.tbConfidenceDelta
  if (propType === 'singles') confidence += statcastSignal.singlesConfidenceDelta
  if (propType === 'homeRun') confidence += statcastSignal.hrConfidenceDelta
  if (propType === 'totalBases' || propType === 'homeRun' || propType === 'rbi') {
    if (repeatability.careerPowerBacked) confidence += repeatability.seasonPa < 24 ? 2 : 1
    if (repeatability.careerVolatile) confidence -= repeatability.seasonPa < 24 ? 5 : 2
    if (repeatability.seasonPa < 24 && !repeatability.careerPowerBacked) confidence -= 8
    confidence += clamp((Number(approachState.confidenceScore || 50) - 50) / 8, -4, 4)
  }

  if (weatherProfile?.label) {
    const weatherRunLift = Number(weatherProfile.runBoostFirst5 || 0) + Number(weatherProfile.runBoostLate || 0)
    if (propType === 'homeRun' || propType === 'totalBases' || propType === 'rbi') {
      confidence += weatherRunLift * 120
    } else if (propType === 'hits' || propType === 'singles') {
      confidence += weatherRunLift * 84
    } else if (propType === 'walks') {
      confidence -= weatherRunLift * 22
    }
  }

  const sunVisibilityRisk = Number(sunVisibilityProfile?.visibilityRiskScore)
  if (Number.isFinite(sunVisibilityRisk) && sunVisibilityRisk >= 42) {
    if (propType === 'totalBases') confidence += clamp((sunVisibilityRisk - 42) * 0.07, 0, 3)
    if (propType === 'hits' || propType === 'singles') confidence += clamp((sunVisibilityRisk - 42) * 0.04, 0, 2)
  }

  if (propType === 'homeRun' && homeRunBoost?.target?.lastHomeRunGapDays >= 7) confidence -= 4
  if (propType === 'homeRun' && Number(homeRunBoost?.target?.homeRunsLast7Days || 0) === 0) confidence -= 3
  if (propType === 'walks' && Number(hitter?.metrics?.patienceScore || 50) >= 66) confidence += 2
  if (propType === 'hits' && Number(hitter?.metrics?.contactScore || 50) >= 68) confidence += 2
  if (propType === 'rbi') confidence = Math.min(confidence - 6, 68)
  if (propType === 'runs') confidence = Math.min(confidence, 72)
  if (propType === 'hitRunRbi') confidence += 3

  return Math.round(clamp(confidence, 18, 82))
}

const buildPropScriptTags = ({
  propType,
  hitter,
  teamScript,
  projectedRuns,
  projectedHits,
  projectedProfile,
  lineupStatus,
  weatherProfile,
  sunVisibilityProfile,
  homeRunBoost,
  starterWalkPressure
}) => {
  const tags = []
  const statcastSignal = buildHitterStatcastPropSignal(hitter?.statcastTrend)
  const repeatability = buildHitterRepeatabilitySignal(hitter)
  const tbShadowSignal = propType === 'totalBases' ? buildTotalBasesShadowSignal({ hitter, weatherProfile, sunVisibilityProfile }) : null
  const topThirdScore = Number(teamScript?.topThirdScore || 50)
  const middleScore = Number(teamScript?.middleScore || 50)
  const depthScore = Number(teamScript?.depthScore || 50)
  const hitEfficiencyPct = Number(projectedProfile?.hitEfficiencyPct || 0)
  const first5HitEfficiencyPct = Number(projectedProfile?.first5HitEfficiencyPct || 0)
  const projectedLateHits = Number(projectedProfile?.lateProjectedHits || 0)

  if (lineupStatus === 'posted') tags.push('posted-lineup')
  if (topThirdScore >= 58) tags.push('top-third-pressure')
  if (middleScore >= 56) tags.push('middle-order-traffic')
  if (depthScore >= 56) tags.push('deep-lineup')
  if (Number(projectedRuns || 0) >= 4.8) tags.push('run-ceiling-live')
  if (Number(projectedHits || 0) >= 8.8) tags.push('traffic-lane-live')
  if (projectedLateHits >= 3.2) tags.push('late-bullpen-lane')
  if (hitEfficiencyPct >= 25.4) tags.push('clean-conversion-lane')
  if (hitEfficiencyPct <= 23.2 && Number(projectedHits || 0) >= 8.2) tags.push('traffic-no-conversion-risk')
  if (first5HitEfficiencyPct >= 25.1) tags.push('first-five-jolt-live')
  if ((teamScript?.bullpenOverperformHitters || []).some((entry) => normalizeText(entry.name) === normalizeText(hitter?.name))) {
    tags.push('bullpen-carry-bat')
  }
  if ((teamScript?.overperformHitters || []).some((entry) => normalizeText(entry.name) === normalizeText(hitter?.name))) {
    tags.push('carry-bat-live')
  }
  if (propType === 'walks' && starterWalkPressure > 0.05) tags.push('starter-wildness-lane')
  if (propType === 'totalBases' && Number(hitter?.metrics?.powerScore || 50) >= 68) tags.push('power-lane')
  if ((propType === 'totalBases' || propType === 'homeRun') && repeatability.careerPowerBacked) tags.push('career-power-backed')
  if (repeatability.seasonPa < 24) tags.push('tiny-current-sample')
  if (repeatability.approachState?.approachLabel) tags.push(repeatability.approachState.approachLabel.replace(/[^a-z0-9]+/gi, '-').toLowerCase())
  if (propType === 'singles' && Number(hitter?.metrics?.contactScore || 50) >= 66) tags.push('contact-lane')
  if (propType === 'rbi' && Number(hitter?.slot || 9) <= 5) tags.push('run-production-slot')
  if (propType === 'runs' && Number(hitter?.slot || 9) <= 3) tags.push('run-scoring-slot')
  if (propType === 'hitRunRbi') tags.push('combined-production-lane')
  if (weatherProfile?.label && Number(weatherProfile.runBoostLate || 0) + Number(weatherProfile.runBoostFirst5 || 0) >= 0.08) {
    tags.push('weather-run-lift')
  }
  if (Number(sunVisibilityProfile?.visibilityRiskScore) >= 42) tags.push('sun-visibility-lane')
  if (propType === 'homeRun' && homeRunBoost?.target?.scoreBand) tags.push(`hr-${homeRunBoost.target.scoreBand}-lane`)
  if (propType === 'totalBases' && tbShadowSignal?.scriptTag) tags.push(tbShadowSignal.scriptTag)
  tags.push(...statcastSignal.tags)

  return [...new Set(tags)]
}

const buildMlbPropCandidate = ({
  game,
  teamName,
  hitter,
  teamScript,
  projectedProfile,
  projectedRuns,
  projectedHits,
  opposingStarter,
  lineupStatus = 'pending',
  weatherProfile = null,
  sunVisibilityProfile = null,
  propType
}) => {
  if (!hitter?.name || !hitter?.metrics) return null

  const config = mlbPropTypeConfig[propType]
  if (!config) return null

  const expectedPA = buildExpectedPlateAppearances(hitter.slot, projectedRuns, teamScript?.topThirdScore)
  const matchupFactor = clamp(0.72 + (Number(hitter.metrics.matchupScore || 50) - 50) / 110, 0.58, 1.38)
  const contactFactor = clamp(0.78 + (Number(hitter.metrics.contactScore || 50) - 50) / 120, 0.58, 1.34)
  const powerFactor = clamp(0.76 + (Number(hitter.metrics.powerScore || 50) - 50) / 112, 0.54, 1.4)
  const patienceFactor = clamp(0.82 + (Number(hitter.metrics.patienceScore || 50) - 50) / 118, 0.6, 1.32)
  const formFactor = clamp(0.82 + (Number(hitter.metrics.formScore || 50) - 50) / 115, 0.58, 1.35)
  const teamTrafficFactor = clamp((Number(projectedHits || 8.3) / 8.3) * 0.72 + (Number(projectedRuns || 4.3) / 4.3) * 0.28, 0.68, 1.38)
  const homeRunBoost = getHomeRunTargetBoost(game, teamName, hitter.name)
  const statcastSignal = buildHitterStatcastPropSignal(hitter.statcastTrend)
  const repeatability = buildHitterRepeatabilitySignal(hitter)
  const approachState = repeatability.approachState || {}
  const tbShadowSignal = propType === 'totalBases' ? buildTotalBasesShadowSignal({ hitter, weatherProfile, sunVisibilityProfile }) : null
  const approachMultiplier = clamp(1 + (Number(approachState.confidenceScore || 50) - 50) * 0.003, 0.94, 1.08)
  const slotPressure =
    hitter.slot <= 2 ? 1.08 : hitter.slot <= 4 ? 1.12 : hitter.slot <= 6 ? 1.02 : 0.91
  const overperformBoost = (teamScript?.overperformHitters || []).some(
    (entry) => normalizeText(entry.name) === normalizeText(hitter.name)
  )
    ? 1.08
    : 1
  const seasonHitRate = weightedRate(hitter, 'hitRate', 0.23)
  const seasonSinglesRate = weightedRate(hitter, 'singlesRate', 0.15)
  const seasonTbRate = weightedRate(hitter, 'totalBasesRate', 0.34)
  const seasonWalkRate = weightedRate(hitter, 'walkRate', 0.085)
  const seasonHrRate = weightedRate(hitter, 'hrRate', 0.03)
  const starterWalkPressure = buildStarterWalkPressure(opposingStarter)
  const scriptTags = buildPropScriptTags({
    propType,
    hitter,
    teamScript,
    projectedRuns,
    projectedHits,
    projectedProfile,
    lineupStatus,
    weatherProfile,
    sunVisibilityProfile,
    homeRunBoost,
    starterWalkPressure
  })

  let expectedValue = 0
  let probability = 0
  let line = ''
  let statValueLabel = ''
  const sample = {
    seasonGames: Number(hitter.season?.gamesPlayed || 0),
    seasonPlateAppearances: Number(hitter.season?.plateAppearances || 0),
    recentGames: Number(hitter.recent?.gamesPlayed || 0),
    recentPlateAppearances: Number(hitter.recent?.plateAppearances || 0),
    statcastGames: Number(hitter.statcastTrend?.gamesSample7 || 0),
    statcastPlateAppearances: Number(hitter.statcastTrend?.paSample7 || 0),
    opponentContextGames: Number(hitter.opponentContext?.gamesSampleLast10 || 0)
  }
  const tinyTbSample =
    sample.seasonGames < 5 ||
    sample.seasonPlateAppearances < 16 ||
    sample.statcastGames < 3 ||
    sample.opponentContextGames < 4
  const sunVisibilityRisk = Number(sunVisibilityProfile?.visibilityRiskScore)
  const sunExtraBaseMultiplier = Number.isFinite(sunVisibilityRisk)
    ? 1 + clamp((sunVisibilityRisk - 42) * 0.0018, 0, 0.07)
    : 1

  if (propType === 'hits') {
    expectedValue = expectedPA * seasonHitRate * contactFactor * formFactor * matchupFactor * teamTrafficFactor * 0.98
    probability = poissonProbabilityAtLeast(expectedValue, 1)
    line = config.marketLabel
    statValueLabel = `${expectedValue.toFixed(2)} exp hits`
  } else if (propType === 'singles') {
    expectedValue =
      expectedPA *
      seasonSinglesRate *
      contactFactor *
      formFactor *
      matchupFactor *
      (0.94 + (Number(hitter.metrics.powerScore || 50) < 58 ? 0.08 : -0.02)) *
      teamTrafficFactor *
      statcastSignal.singlesMultiplier
    probability = 1 - Math.exp(-Math.max(expectedValue, 0))
    line = config.marketLabel
    statValueLabel = `${expectedValue.toFixed(2)} exp singles`
  } else if (propType === 'walks') {
    expectedValue = expectedPA * seasonWalkRate * patienceFactor * formFactor * (1 + starterWalkPressure) * slotPressure
    probability = 1 - Math.exp(-Math.max(expectedValue, 0))
    line = config.marketLabel
    statValueLabel = `${expectedValue.toFixed(2)} exp walks`
  } else if (propType === 'totalBases') {
    expectedValue =
      expectedPA *
      seasonTbRate *
      powerFactor *
      formFactor *
      matchupFactor *
      teamTrafficFactor *
      (1 + homeRunBoost.scoreBoost * 0.6) *
      statcastSignal.tbMultiplier *
      approachMultiplier *
      sunExtraBaseMultiplier
    if (tinyTbSample && tbShadowSignal?.supportLevel !== 'backed') {
      expectedValue = Math.min(expectedValue, repeatability.careerPowerBacked ? 2.15 : 1.75)
    }
    if (tinyTbSample && repeatability.careerVolatile) {
      expectedValue *= 0.88
    }
    probability = poissonProbabilityAtLeast(expectedValue, 1)
    line = config.marketLabel
    statValueLabel = `${expectedValue.toFixed(2)} exp TB`
  } else if (propType === 'homeRun') {
    expectedValue =
      expectedPA *
      seasonHrRate *
      powerFactor *
      formFactor *
      matchupFactor *
      slotPressure *
      overperformBoost *
      (1 + homeRunBoost.scoreBoost) *
      (Number(homeRunBoost.target?.opposingPitcherHr9 || 1) >= 1.2 ? 1.08 : 0.96) *
      statcastSignal.hrMultiplier
    probability = 1 - Math.exp(-Math.max(expectedValue, 0))
    line = config.marketLabel
    statValueLabel = `${expectedValue.toFixed(2)} exp HR`
  } else if (propType === 'rbi') {
    const hittersAhead = Math.max(0, hitter.slot - 1)
    const aheadTraffic = clamp(
      0.92 +
        hittersAhead * 0.035 +
        ((Number(teamScript?.topThirdScore || 50) - 50) / 180) +
        ((Number(teamScript?.middleScore || 50) - 50) / 240),
      0.72,
      1.36
    )
    expectedValue =
      (Number(projectedRuns || 4.3) / 4.8) *
      slotPressure *
      powerFactor *
      formFactor *
      matchupFactor *
      aheadTraffic *
      overperformBoost
    probability = 1 - Math.exp(-Math.max(expectedValue, 0))
    line = config.marketLabel
    statValueLabel = `${expectedValue.toFixed(2)} exp RBI`
  } else if (propType === 'runs') {
    const onBasePressure =
      seasonHitRate * 0.46 +
      seasonWalkRate * 0.32 +
      clamp((Number(hitter.metrics.patienceScore || 50) - 42) / 260, 0, 0.08)
    const teamRunPressure = clamp(Number(projectedRuns || 4.3) / 4.5, 0.72, 1.34)
    expectedValue =
      expectedPA *
      onBasePressure *
      formFactor *
      matchupFactor *
      teamRunPressure *
      slotPressure *
      overperformBoost
    probability = 1 - Math.exp(-Math.max(expectedValue, 0))
    line = config.marketLabel
    statValueLabel = `${expectedValue.toFixed(2)} exp runs`
  } else if (propType === 'hitRunRbi') {
    const hittersAhead = Math.max(0, hitter.slot - 1)
    const aheadTraffic = clamp(
      0.92 +
        hittersAhead * 0.035 +
        ((Number(teamScript?.topThirdScore || 50) - 50) / 180) +
        ((Number(teamScript?.middleScore || 50) - 50) / 240),
      0.72,
      1.36
    )
    const expectedHits = expectedPA * seasonHitRate * contactFactor * formFactor * matchupFactor * teamTrafficFactor * 0.98
    const expectedRuns =
      expectedPA *
      (
        (seasonHitRate + seasonWalkRate) * 0.28 +
        Math.max(Number(hitter.statcastTrend?.rolling7Xwoba || 0), 0) * 0.1 +
        (Number(teamScript?.topThirdScore || 50) / 100) * 0.05
      ) *
      matchupFactor *
      clamp(Number(projectedRuns || 4.3) / 4.5, 0.72, 1.34) *
      (hitter.slot <= 2 ? 1.1 : hitter.slot <= 5 ? 1.02 : 0.9)
    const expectedRbis =
      (Number(projectedRuns || 4.3) / 4.8) *
      slotPressure *
      powerFactor *
      formFactor *
      matchupFactor *
      aheadTraffic *
      overperformBoost *
      0.82
    expectedValue = expectedHits + expectedRuns + expectedRbis
    probability = poissonProbabilityAtLeast(expectedValue, 1.5)
    line = config.marketLabel
    statValueLabel = `${expectedHits.toFixed(2)} H · ${expectedRuns.toFixed(2)} R · ${expectedRbis.toFixed(2)} RBI · ${expectedValue.toFixed(2)} total`
  }

  const confidence = calibrateMlbPropConfidence({
    config,
    propType,
    probability,
    hitter,
    teamScript,
    lineupStatus,
    weatherProfile,
    sunVisibilityProfile,
    homeRunBoost
  })
  if (confidence < 54) return null

  const reasons = []
  if (hitter.primaryTag) reasons.push(`slot ${hitter.slot} ${hitter.primaryTag}`)
  if (propType === 'totalBases' && tbShadowSignal?.reason) reasons.push(tbShadowSignal.reason)
  if (propType === 'totalBases' && statcastSignal.tbReason) reasons.push(statcastSignal.tbReason)
  if ((propType === 'totalBases' || propType === 'homeRun') && repeatability.reason) reasons.push(repeatability.reason)
  if ((propType === 'totalBases' || propType === 'homeRun' || propType === 'rbi') && approachState.approachLabel) {
    reasons.push(`${approachState.approachLabel}; approach ${approachState.confidenceScore}/100`)
  }
  if (propType === 'singles' && statcastSignal.singlesReason) reasons.push(statcastSignal.singlesReason)
  if (propType === 'homeRun' && statcastSignal.hrReason) reasons.push(statcastSignal.hrReason)
  if ((hitter.tags || []).includes('heater')) reasons.push('recent form up')
  if ((hitter.tags || []).includes('split edge')) reasons.push('split fit live')
  if (propType === 'homeRun' && homeRunBoost.target) reasons.push(describeHomeRunPropLane(homeRunBoost.target))
  if (propType === 'walks' && starterWalkPressure > 0.05) reasons.push('starter walk pressure')
  if (propType === 'rbi' && hitter.slot <= 5) reasons.push('run-production slot')
  if (propType === 'runs' && hitter.slot <= 3) reasons.push('run-scoring slot')
  if (propType === 'hitRunRbi') reasons.push('combined hits/runs/RBI lane')
  if (propType === 'hits' || propType === 'singles') {
    if (Number(projectedProfile?.hitEfficiencyPct || 24) >= 25) reasons.push('clean traffic lane')
  }
  if (propType === 'totalBases' && Number(hitter.metrics.powerScore || 50) >= 68) reasons.push('power lane')
  if (propType === 'homeRun' && homeRunBoost.target?.contextLabels?.[2]) reasons.push(homeRunBoost.target.contextLabels[2])

  return {
    id: `${game.id}:${hitter.playerId}:${propType}`,
    gameId: game.id,
    gameTitle: game.title,
    league: game.league,
    playerId: hitter.playerId,
    playerName: hitter.name,
    teamName,
    slot: hitter.slot,
    propType,
    propLabel: config.label,
    marketLabel: line,
    confidence,
    probability: roundToTenths(probability * 100),
    expectedValue: roundToTenths(expectedValue),
    statValueLabel,
    sample,
    repeatability,
    recommendationTier: confidence >= 79 ? 'Core' : confidence >= 68 ? 'Strong' : 'Lean',
    shadowSupportTag: propType === 'totalBases' ? tbShadowSignal?.supportTag || null : null,
    shadowSupportLevel: propType === 'totalBases' ? tbShadowSignal?.supportLevel || null : null,
    reason: reasons.slice(0, 4).join(' | '),
    scriptTags,
    matchupNote: hitter.matchupNote,
    teamScriptLabel: teamScript?.pressureLabel || '',
    lineupStatus,
    playerSummary: hitter.summary
  }
}

const buildLegacyMlbPlayerProps = (game, analysis) => {
  if (game?.league !== 'MLB' || !analysis?.mlbProjection || !game?.lineupBoard) {
    return {
      available: false,
      targets: [],
      featured: [],
      byType: {}
    }
  }

  const projection = analysis.mlbProjection
  const teamBoardEntries = [
    {
      teamName: game.matchup?.[0]?.name,
      lineupTeam: game.lineupBoard.away,
      teamScript:
        projection.teamScripts?.find((entry) => teamNamesMatch(entry.teamName, game.matchup?.[0]?.name)) || null,
      projectedRuns: projection.awayProjectedRuns,
      projectedHits: projection.awayProjectedHits,
      projectedProfile: {
        projectedHits: projection.awayProjectedHits,
        hitEfficiencyPct: projection.awayHitEfficiencyPct
      },
      opposingStarter: game.starterContext?.home,
      lineupStatus: game.lineupBoard?.status?.away || 'pending'
    },
    {
      teamName: game.matchup?.[1]?.name,
      lineupTeam: game.lineupBoard.home,
      teamScript:
        projection.teamScripts?.find((entry) => teamNamesMatch(entry.teamName, game.matchup?.[1]?.name)) || null,
      projectedRuns: projection.homeProjectedRuns,
      projectedHits: projection.homeProjectedHits,
      projectedProfile: {
        projectedHits: projection.homeProjectedHits,
        hitEfficiencyPct: projection.homeHitEfficiencyPct
      },
      opposingStarter: game.starterContext?.away,
      lineupStatus: game.lineupBoard?.status?.home || 'pending'
    }
  ]

  const weatherProfile = analysis.mlbProjection?.weather || null
  const sunVisibilityProfile = analysis.mlbProjection?.sunVisibility || null
  const propTypes = ['homeRun', 'hitRunRbi', 'runs', 'rbi', 'totalBases', 'hits', 'walks', 'singles']
  const targets = teamBoardEntries.flatMap(({ teamName, lineupTeam, teamScript, projectedRuns, projectedHits, projectedProfile, opposingStarter, lineupStatus }) =>
    (lineupTeam?.lineup || []).flatMap((hitter) =>
      propTypes
        .map((propType) =>
          buildMlbPropCandidate({
            game,
            teamName,
            hitter,
            teamScript,
            projectedProfile,
            projectedRuns,
            projectedHits,
            opposingStarter,
            lineupStatus,
            weatherProfile,
            sunVisibilityProfile,
            propType
          })
        )
        .filter(Boolean)
    )
  )

  const sortedTargets = targets.sort((left, right) => {
    if (right.confidence !== left.confidence) return right.confidence - left.confidence
    return right.expectedValue - left.expectedValue
  })

  const byType = Object.fromEntries(
    Object.keys(mlbPropTypeConfig).map((propType) => [
      propType,
      sortedTargets.filter((target) => target.propType === propType).slice(0, 10)
    ])
  )

  const featured = []
  const featuredIds = new Set()
  for (const propType of Object.keys(mlbPropTypeConfig)) {
    const topOfType = byType[propType]?.[0]
    if (topOfType && !featuredIds.has(topOfType.id)) {
      featured.push(topOfType)
      featuredIds.add(topOfType.id)
    }
  }

  sortedTargets.forEach((target) => {
    if (featured.length >= 8 || featuredIds.has(target.id)) return
    featured.push(target)
    featuredIds.add(target.id)
  })

  return {
    available: sortedTargets.length > 0,
    targets: sortedTargets,
    featured,
    byType,
    summary: sortedTargets.length
      ? `${sortedTargets[0].playerName} leads the prop board, but the cleaner edges spread across hits, total bases, and RBI instead of stacking only HR swings.`
      : 'No reliable prop lanes surfaced yet before lineups and matchup data settled.'
  }
}

const buildTrackedPropContext = (game, target) => {
  const projection = game?.analysis?.mlbProjection || {}
  const isAway = teamNamesMatch(target.teamName, game?.matchup?.[0]?.name)
  const teamScript =
    projection.teamScripts?.find((entry) => teamNamesMatch(entry.teamName, target.teamName)) || null

  return {
    projectedRuns: isAway ? Number(projection.awayProjectedRuns || 0) : Number(projection.homeProjectedRuns || 0),
    projectedHits: isAway ? Number(projection.awayProjectedHits || 0) : Number(projection.homeProjectedHits || 0),
    hitEfficiencyPct: isAway ? Number(projection.awayHitEfficiencyPct || 0) : Number(projection.homeHitEfficiencyPct || 0),
    lineupStatus: isAway ? game?.lineupBoard?.status?.away || 'pending' : game?.lineupBoard?.status?.home || 'pending',
    gameConfidence: Number(game?.analysis?.confidence || 50),
    volatility: Number(game?.analysis?.volatility || 50),
    teamScript
  }
}

const buildTrackedPropSelection = (game, target) => {
  const config = trackedMlbPropTypeConfig[target.propType]
  if (!config || config.disabled) return null

  const context = buildTrackedPropContext(game, target)
  const calibration = lookupPropCalibration(target)
  const sample = target.sample || {}
  const repeatability = target.repeatability || {}
  const tinyHitterSample =
    target.propType !== 'pitcherStrikeouts' &&
    (
      Number(sample.seasonGames || 0) < 5 ||
      Number(sample.seasonPlateAppearances || 0) < 16 ||
      Number(sample.statcastGames || 0) < 3 ||
      Number(sample.opponentContextGames || 0) < 4
    )
  let supportCount = 0
  let trackingScore = Number(target.confidence || 0)

  if (tinyHitterSample) {
    if (!repeatability.canCarryTinySample) return null
    supportCount += 1
    trackingScore -= Number(repeatability.trackingPenalty || 12)
  }

  if (context.lineupStatus === 'posted') {
    supportCount += 1
    trackingScore += 5
  } else if (context.lineupStatus === 'partial') {
    trackingScore -= 2
  } else {
    trackingScore -= 9
  }

  if (context.gameConfidence >= 64) {
    supportCount += 1
    trackingScore += Math.min(6, (context.gameConfidence - 64) * 0.35)
  }

  if (context.volatility <= 72) {
    supportCount += 1
    trackingScore += 5
  } else if (context.volatility >= 84) {
    trackingScore -= 7
  } else if (context.volatility >= 78) {
    trackingScore -= 3
  }

  if (target.propType === 'totalBases') {
    if (!['backed', 'career-backed'].includes(target.shadowSupportLevel)) return null
    const tinyTbSample =
      Number(sample.seasonGames || 0) < 5 ||
      Number(sample.seasonPlateAppearances || 0) < 16 ||
      Number(sample.statcastGames || 0) < 3 ||
      Number(sample.opponentContextGames || 0) < 4
    if (tinyTbSample && target.shadowSupportLevel !== 'backed' && !repeatability.canCarryTinySample) return null
    if (context.projectedRuns >= 4.6) supportCount += 1
    if (context.projectedHits >= 8.6) supportCount += 1
    if (Number(target.slot || 9) <= 5) supportCount += 1
    if ((target.reason || '').includes('power lane')) supportCount += 1
    if (Number(context.teamScript?.topThirdScore || 0) >= 58) supportCount += 1
    if ((target.scriptTags || []).includes('statcast-power-up')) {
      supportCount += 1
      trackingScore += 4
    }
    if ((target.scriptTags || []).includes('career-power-backed')) {
      supportCount += 1
      trackingScore += tinyTbSample ? 1 : 3
    }
    if ((target.scriptTags || []).includes('statcast-fade')) trackingScore -= 5
    if (Number(target.expectedValue || 0) >= 2.2) trackingScore += 4
  } else if (target.propType === 'singles') {
    if (context.projectedHits >= 8.4) supportCount += 1
    if (context.hitEfficiencyPct >= 24.8) supportCount += 1
    if ((target.reason || '').includes('clean traffic lane')) supportCount += 1
    if (Number(target.slot || 9) <= 6) supportCount += 1
    if (Number(context.teamScript?.middleScore || 0) >= 56) supportCount += 1
    if ((target.scriptTags || []).includes('statcast-contact-up')) {
      supportCount += 1
      trackingScore += 3
    }
    if ((target.scriptTags || []).includes('statcast-fade')) trackingScore -= 4
    if (Number(target.expectedValue || 0) >= 0.82) trackingScore += 3
  } else if (target.propType === 'walks') {
    if ((target.reason || '').includes('starter walk pressure')) supportCount += 2
    if ((target.playerSummary || '').includes(' BB')) supportCount += 1
    if (context.teamScript?.pressureLabel) supportCount += 1
    if (Number(context.teamScript?.topThirdScore || 0) <= 54) supportCount += 1
    if (Number(target.expectedValue || 0) >= 0.62) trackingScore += 3
  } else if (target.propType === 'rbi') {
    if (context.projectedRuns >= 4.8) supportCount += 1
    if (context.projectedHits >= 8.6) supportCount += 1
    if (Number(target.slot || 9) <= 5) supportCount += 1
    if ((target.reason || '').includes('run-production slot')) supportCount += 1
    if (Number(context.teamScript?.topThirdScore || 0) >= 60) supportCount += 1
    if (Number(target.expectedValue || 0) >= 0.9) trackingScore += 4
  } else if (target.propType === 'runs') {
    if (context.projectedRuns >= 4.6) supportCount += 1
    if (context.projectedHits >= 8.4) supportCount += 1
    if (Number(target.slot || 9) <= 3) supportCount += 1
    if ((target.reason || '').includes('run-scoring slot')) supportCount += 1
    if (Number(context.teamScript?.topThirdScore || 0) >= 58) supportCount += 1
    if (Number(target.expectedValue || 0) >= 0.7) trackingScore += 3
  } else if (target.propType === 'hitRunRbi') {
    if (context.projectedRuns >= 4.4) supportCount += 1
    if (context.projectedHits >= 8.2) supportCount += 1
    if (Number(target.slot || 9) <= 6) supportCount += 1
    if ((target.reason || '').includes('combined hits/runs/RBI lane')) supportCount += 1
    if (Number(context.teamScript?.topThirdScore || 0) >= 56) supportCount += 1
    if (Number(target.expectedValue || 0) >= 2.1) trackingScore += 4
  }

  if (calibration.overall?.hitRate !== null && calibration.overall?.hitRate !== undefined) {
    trackingScore += (Number(calibration.overall.hitRate) - 35) * 0.08
  }

  if (calibration.team?.hitRate !== null && calibration.team?.hitRate !== undefined) {
    trackingScore += (Number(calibration.team.hitRate) - 35) * 0.12
    if (Number(calibration.team.total || 0) >= 6 && Number(calibration.team.hitRate) >= 45) supportCount += 1
  }

  const strongReasonTags = calibration.reasonTags.filter(
    (entry) => Number(entry.summary?.total || 0) >= 6 && Number(entry.summary?.hitRate || 0) >= 42
  )
  const weakReasonTags = calibration.reasonTags.filter(
    (entry) => Number(entry.summary?.total || 0) >= 6 && Number(entry.summary?.hitRate || 0) <= 28
  )
  if (strongReasonTags.length) {
    supportCount += 1
    trackingScore += Math.min(6, strongReasonTags.length * 2)
  }
  if (weakReasonTags.length) {
    trackingScore -= Math.min(7, weakReasonTags.length * 2.5)
  }

  const strongScriptTags = calibration.scriptTags.filter(
    (entry) => Number(entry.summary?.total || 0) >= 6 && Number(entry.summary?.hitRate || 0) >= 43
  )
  const weakScriptTags = calibration.scriptTags.filter(
    (entry) => Number(entry.summary?.total || 0) >= 6 && Number(entry.summary?.hitRate || 0) <= 27
  )
  if (strongScriptTags.length) {
    supportCount += 1
    trackingScore += Math.min(7, strongScriptTags.length * 2.25)
  }
  if (weakScriptTags.length) {
    trackingScore -= Math.min(8, weakScriptTags.length * 2.75)
  }

  if (supportCount < config.minSupport) return null
  if (Number(target.confidence || 0) < config.minConfidence) return null
  if (trackingScore < config.minTrackingScore) return null

  return {
    ...target,
    trackingScore: Math.round(clamp(trackingScore, 0, 99)),
    supportCount,
    trackingLabel: `${supportCount} script supports`
  }
}

const selectTrackedMlbPropTargets = (game, legacyTargets = []) => {
  const maxTrackedPerGame = 4
  const selected = []
  const selectedPlayerIds = new Set()
  const perTeam = new Map()
  const perType = new Map()

  const scoredTargets = legacyTargets
    .map((target) => buildTrackedPropSelection(game, target))
    .filter(Boolean)
    .sort((left, right) => {
      if (right.trackingScore !== left.trackingScore) return right.trackingScore - left.trackingScore
      if (right.supportCount !== left.supportCount) return right.supportCount - left.supportCount
      if (right.confidence !== left.confidence) return right.confidence - left.confidence
      const rightPriority = trackedMlbPropTypeConfig[right.propType]?.priority || 0
      const leftPriority = trackedMlbPropTypeConfig[left.propType]?.priority || 0
      if (rightPriority !== leftPriority) return rightPriority - leftPriority
      return right.expectedValue - left.expectedValue
    })

  for (const target of scoredTargets) {
    const config = trackedMlbPropTypeConfig[target.propType]
    const teamCount = perTeam.get(target.teamName) || 0
    const typeCount = perType.get(target.propType) || 0
    if (!config) continue
    if (selected.length >= maxTrackedPerGame) break
    if (selectedPlayerIds.has(target.playerId)) continue
    if (teamCount >= config.maxPerTeam) continue
    if (typeCount >= 2) continue

    selected.push(target)
    selectedPlayerIds.add(target.playerId)
    perTeam.set(target.teamName, teamCount + 1)
    perType.set(target.propType, typeCount + 1)
  }

  return selected
}

const buildMlbPlayerProps = (game, analysis) => {
  const legacyBoard = buildLegacyMlbPlayerProps(game, analysis)
  if (!legacyBoard.available) return legacyBoard

  const trackedTargets = selectTrackedMlbPropTargets(game, legacyBoard.targets)
  const byType = Object.fromEntries(
    Object.keys(trackedMlbPropTypeConfig)
      .filter((propType) => !trackedMlbPropTypeConfig[propType].disabled)
      .map((propType) => [propType, trackedTargets.filter((target) => target.propType === propType).slice(0, 4)])
  )

  const featured = []
  const featuredIds = new Set()
  for (const propType of Object.keys(mlbPropTypeConfig)) {
    const topOfType = legacyBoard.byType?.[propType]?.[0]
    if (topOfType && !featuredIds.has(topOfType.id)) {
      featured.push(topOfType)
      featuredIds.add(topOfType.id)
    }
  }

  legacyBoard.targets.forEach((target) => {
    if (featured.length >= 8 || featuredIds.has(target.id)) return
    featured.push(target)
    featuredIds.add(target.id)
  })

  return {
    available: featured.length > 0,
    targets: trackedTargets,
    featured,
    byType,
    candidateCount: legacyBoard.targets.length,
    summary: trackedTargets.length
      ? `${trackedTargets[0].playerName} leads the tracked prop board, with ${trackedTargets.length} narrower lanes surviving script and volatility filters out of ${legacyBoard.targets.length} raw candidates. Featured props now show a broader mix than the tracked-only shortlist.`
      : 'The broad prop universe surfaced candidates, but none survived the tighter script and volatility filters on this pass. Featured props still show the broader board for context.'
  }
}


const rankMlbPlayerPropCandidatesLegacy = (games) =>
  games
    .filter((game) => game.league === 'MLB' && game.analysis?.mlbProjection && game.lineupBoard)
    .flatMap((game) => buildLegacyMlbPlayerProps(game, game.analysis).targets.map((target) => ({ ...target, game })))
    .sort((left, right) => {
      if (right.confidence !== left.confidence) return right.confidence - left.confidence
      return right.expectedValue - left.expectedValue
    })
    .map((target, index) => ({
      ...target,
      rank: index + 1
    }))

const rankMlbPlayerProps = (games) =>
  games
    .filter((game) => game.playerProps?.available)
    .flatMap((game) => game.playerProps.targets.map((target) => ({ ...target, game })))
    .sort((left, right) => {
      const rightScore = Number.isFinite(right.trackingScore) ? right.trackingScore : right.confidence
      const leftScore = Number.isFinite(left.trackingScore) ? left.trackingScore : left.confidence
      if (rightScore !== leftScore) return rightScore - leftScore
      if (right.confidence !== left.confidence) return right.confidence - left.confidence
      return right.expectedValue - left.expectedValue
    })
    .map((target, index) => ({
      ...target,
      rank: index + 1
    }))


export {
  buildMlbPlayerProps,
  rankMlbPlayerPropCandidatesLegacy,
  rankMlbPlayerProps
}
