import { average, clamp, parseRecord, roundToTenths } from '../../../../shared/sports-core/core-utils.js'

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

const numberOrNull = (value) => {
  if (value === null || value === undefined || value === '') return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

const normalizePitchType = (value = '') =>
  `${value}`.trim().toUpperCase().replace(/[^A-Z0-9]/g, '')

const normalizePitchShare = (value) => {
  const parsed = numberOrNull(value)
  if (!Number.isFinite(parsed) || parsed <= 0) return null
  return parsed <= 1 ? parsed * 100 : parsed
}

const pitchFamilyFor = (pitchType = '') => {
  const type = normalizePitchType(pitchType)

  if (['FF', 'FA', 'FT', 'SI', 'FC', 'FSB', 'SINKER', 'CUTTER', 'FOURSEAM', 'TWOSEAM', 'FASTBALL'].includes(type)) {
    return type === 'FC' || type === 'CUTTER' ? 'cutter' : 'fastball'
  }
  if (['SL', 'ST', 'SV', 'CU', 'KC', 'CS', 'SC', 'SWEEPER', 'SLIDER', 'CURVE', 'CURVEBALL', 'KNUCKLECURVE'].includes(type)) {
    return 'breaking'
  }
  if (['CH', 'FS', 'FO', 'SP', 'KN', 'CHANGEUP', 'SPLIT', 'SPLITTER', 'FORKBALL', 'KNUCKLEBALL'].includes(type)) {
    return 'offspeed'
  }

  return 'other'
}

const parsePitchMixSummaryRows = (summary = '') =>
  `${summary}`
    .split('/')
    .map((segment) => segment.trim())
    .map((segment) => {
      const match = segment.match(/^(.+?)\s+(-?\d+(?:\.\d+)?)%?$/)
      if (!match) return null
      return {
        pitchType: match[1].trim(),
        pitchShare: Number(match[2])
      }
    })
    .filter(Boolean)

const buildPitchMixProfile = (starterContext = {}) => {
  const sourceRows = Array.isArray(starterContext?.pitchMix) && starterContext.pitchMix.length
    ? starterContext.pitchMix
    : parsePitchMixSummaryRows(starterContext?.pitchMixSummary || '')
  const rows = sourceRows
    .map((row) => {
      const pitchType = row.pitchType || row.pitch_type || row.type || ''
      const pitchShare = normalizePitchShare(row.pitchShare ?? row.pitch_share ?? row.share)
      const family = pitchFamilyFor(pitchType)
      return pitchType && Number.isFinite(pitchShare)
        ? {
            pitchType: normalizePitchType(pitchType),
            pitchShare,
            family
          }
        : null
    })
    .filter(Boolean)

  if (!rows.length) {
    return {
      source: starterContext?.pitchMixSummary ? 'pitch-mix-summary' : 'missing',
      pitchCount: 0,
      fastballShare: null,
      breakingShare: null,
      offspeedShare: null,
      cutterShare: null,
      spinDependencyShare: null,
      topPitchType: null,
      topPitchShare: null,
      archetype: 'unknown',
      label: 'Pitch mix unknown',
      weatherSensitivity: 'unknown',
      rows: []
    }
  }

  const shareByFamily = rows.reduce(
    (acc, row) => {
      acc[row.family] = (acc[row.family] || 0) + row.pitchShare
      return acc
    },
    { fastball: 0, cutter: 0, breaking: 0, offspeed: 0, other: 0 }
  )
  const totalKnownShare = rows.reduce((sum, row) => sum + row.pitchShare, 0) || 1
  const scale = totalKnownShare > 0 && totalKnownShare < 80 ? 100 / totalKnownShare : 1
  const fastballShare = clamp((shareByFamily.fastball + shareByFamily.cutter) * scale, 0, 100)
  const cutterShare = clamp(shareByFamily.cutter * scale, 0, 100)
  const breakingShare = clamp(shareByFamily.breaking * scale, 0, 100)
  const offspeedShare = clamp(shareByFamily.offspeed * scale, 0, 100)
  const spinDependencyShare = clamp(breakingShare + cutterShare * 0.45, 0, 100)
  const sortedRows = [...rows].sort((left, right) => right.pitchShare - left.pitchShare)
  let archetype = 'balanced'
  let label = 'Balanced arsenal'
  let weatherSensitivity = 'neutral'

  if (fastballShare >= 55 && spinDependencyShare < 34) {
    archetype = 'fastball-heavy'
    label = 'Fastball-heavy arsenal'
    weatherSensitivity = 'hot-benefit'
  } else if (fastballShare >= 47 && spinDependencyShare < 42) {
    archetype = 'fastball-leaning'
    label = 'Fastball-leaning arsenal'
    weatherSensitivity = 'hot-slight-benefit'
  } else if (breakingShare >= 38 || spinDependencyShare >= 44) {
    archetype = 'spin-heavy'
    label = 'Spin-heavy arsenal'
    weatherSensitivity = 'hot-grip-risk'
  } else if (offspeedShare >= 32 && fastballShare < 48) {
    archetype = 'offspeed-heavy'
    label = 'Offspeed-heavy arsenal'
    weatherSensitivity = 'hot-neutral'
  }

  return {
    source: Array.isArray(starterContext?.pitchMix) && starterContext.pitchMix.length ? 'pitch-mix-rows' : 'pitch-mix-summary',
    pitchCount: rows.length,
    fastballShare: roundToTenths(fastballShare),
    breakingShare: roundToTenths(breakingShare),
    offspeedShare: roundToTenths(offspeedShare),
    cutterShare: roundToTenths(cutterShare),
    spinDependencyShare: roundToTenths(spinDependencyShare),
    topPitchType: sortedRows[0]?.pitchType ?? null,
    topPitchShare: sortedRows[0] ? roundToTenths(sortedRows[0].pitchShare) : null,
    archetype,
    label,
    weatherSensitivity,
    rows: sortedRows.slice(0, 5).map((row) => ({
      pitchType: row.pitchType,
      pitchShare: roundToTenths(row.pitchShare),
      family: row.family
    }))
  }
}

const sumBy = (items = [], key = '') =>
  items.reduce((sum, item) => {
    const value = Number(item?.[key])
    return Number.isFinite(value) ? sum + value : sum
  }, 0)

const parseGameRowDate = (value = '') => {
  const text = `${value}`.trim()
  if (!text) return 0

  const parsed = Date.parse(text)
  if (Number.isFinite(parsed)) return parsed

  const match = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (!match) return 0

  return Date.UTC(Number(match[3]), Number(match[1]) - 1, Number(match[2]))
}

const getGameRowYear = (value = '') => {
  const timestamp = parseGameRowDate(value)
  if (!timestamp) return null
  const date = new Date(timestamp)
  const year = date.getUTCFullYear()
  return Number.isFinite(year) ? year : null
}

const normalizeOpponentStart = (start = {}, source = 'same-season game log') => {
  if (!start) return null

  const innings =
    numberOrNull(start.inningsPitched) ??
    (Number.isFinite(Number(start.outsRecorded)) ? Number(start.outsRecorded) / 3 : null) ??
    parseBaseballInnings(start.IP)
  const runsAllowed = numberOrNull(start.runsAllowed ?? start.R)
  const earnedRuns = numberOrNull(start.earnedRuns ?? start.ER)
  const hitsAllowed = numberOrNull(start.hitsAllowed ?? start.H)
  const walksAllowed = numberOrNull(start.walksAllowed ?? start.BB)
  const strikeouts = numberOrNull(start.strikeouts ?? start.SO)
  const homeRunsAllowed = numberOrNull(start.homeRunsAllowed ?? start.HR)

  return {
    source,
    date: start.date || start.DATE || '',
    innings: Number.isFinite(innings) ? innings : null,
    runsAllowed,
    earnedRuns,
    hitsAllowed,
    walksAllowed,
    strikeouts,
    homeRunsAllowed,
    firstInningRunsAllowed: numberOrNull(start.firstInningRunsAllowed),
    qualityStart: Boolean(start.qualityStart)
  }
}

const summarizeOpponentStart = (start = null) => {
  if (!start) return null

  const parts = [
    start.date || null,
    Number.isFinite(start.innings) ? `${roundToTenths(start.innings)} IP` : null,
    Number.isFinite(start.runsAllowed) ? `${start.runsAllowed} R` : null,
    Number.isFinite(start.earnedRuns) ? `${start.earnedRuns} ER` : null,
    Number.isFinite(start.hitsAllowed) ? `${start.hitsAllowed} H` : null,
    Number.isFinite(start.homeRunsAllowed) && start.homeRunsAllowed > 0 ? `${start.homeRunsAllowed} HR` : null
  ].filter(Boolean)

  return parts.join(' | ')
}

const buildRepeatOpponentDamageTax = (start = null) => {
  if (!start) {
    return {
      hitTax: 0,
      first5Tax: 0,
      runConversionTax: 0,
      starterScoreTax: 0,
      starterHoldTax: 0,
      suppressionCredit: 0,
      underWarning: false,
      flags: []
    }
  }

  const innings = Number(start.innings)
  const runs = Number(start.runsAllowed)
  const earnedRuns = Number(start.earnedRuns)
  const hits = Number(start.hitsAllowed)
  const walks = Number(start.walksAllowed)
  const homeRuns = Number(start.homeRunsAllowed)
  const firstInningRuns = Number(start.firstInningRunsAllowed)
  const runDamage = Number.isFinite(runs) || Number.isFinite(earnedRuns)
    ? Math.max(Number.isFinite(runs) ? runs : 0, Number.isFinite(earnedRuns) ? earnedRuns : 0)
    : null
  const shortStart = Number.isFinite(innings) && innings > 0 && innings < 5
  const trafficDamage = Number.isFinite(hits) ? Math.max(hits - 5, 0) : 0
  const runTax = Number.isFinite(runDamage) ? Math.max(runDamage - 2, 0) * 0.16 : 0
  const hitTax = trafficDamage * 0.075
  const shortTax = shortStart ? (5 - innings) * 0.12 : 0
  const walkTax = Number.isFinite(walks) ? Math.max(walks - 2, 0) * 0.045 : 0
  const hrTax = Number.isFinite(homeRuns) ? homeRuns * 0.065 : 0
  const firstInningTax = Number.isFinite(firstInningRuns) ? firstInningRuns * 0.08 : 0
  const rawTax = runTax + hitTax + shortTax + walkTax + hrTax + firstInningTax
  const suppressionCredit =
    Number.isFinite(innings) &&
    innings >= 6 &&
    Number.isFinite(runDamage) &&
    runDamage <= 1 &&
    Number.isFinite(hits) &&
    hits <= 5
      ? clamp((6.4 - runDamage - hits * 0.18) * 0.05, 0, 0.24)
      : 0
  const hitDamageTax = clamp(rawTax * 0.55 - suppressionCredit * 0.65, -0.18, 0.58)
  const first5Tax = clamp(rawTax * 0.5 - suppressionCredit * 0.5, -0.14, 0.62)
  const runConversionTax = clamp(rawTax * 0.007 - suppressionCredit * 0.004, -0.0035, 0.012)
  const underWarning = rawTax >= 0.35 || (Number.isFinite(runDamage) && runDamage >= 4) || trafficDamage >= 3 || shortStart
  const flags = [
    Number.isFinite(runDamage) && runDamage >= 4 ? 'repeat opponent run damage' : null,
    trafficDamage >= 3 ? 'repeat opponent traffic damage' : null,
    shortStart ? 'repeat opponent short start' : null,
    Number.isFinite(firstInningRuns) && firstInningRuns > 0 ? 'repeat first-inning damage' : null
  ].filter(Boolean)

  return {
    hitTax: hitDamageTax,
    first5Tax,
    runConversionTax,
    starterScoreTax: clamp(rawTax * 2.9 - suppressionCredit * 2, -1.2, 4.8),
    starterHoldTax: clamp(rawTax * 4.1 - suppressionCredit * 2.4, -1.6, 6.5),
    suppressionCredit,
    underWarning,
    flags
  }
}

const buildStarterVsTeamContext = (starterContext = {}) => {
  const sameSeasonStarts = Array.isArray(starterContext?.opponentHistoryThisSeason)
    ? starterContext.opponentHistoryThisSeason
    : []
  const statmuse = starterContext?.statmuseVsOpponent ?? null
  const sameSeasonOuts = sumBy(sameSeasonStarts, 'outsRecorded')
  const sameSeasonInnings = sameSeasonOuts > 0
    ? sameSeasonOuts / 3
    : sumBy(sameSeasonStarts, 'inningsPitched')
  const statmuseInnings = statmuse?.inningsPitched ? parseBaseballInnings(statmuse.inningsPitched) : 0
  const innings = sameSeasonInnings > 0 ? sameSeasonInnings : statmuseInnings
  const starts = sameSeasonStarts.length || Number(statmuse?.gamesStarted || 0) || Number(statmuse?.appearances || 0) || 0

  if (!Number.isFinite(innings) || innings <= 0 || starts <= 0) return null

  const runsAllowed = sameSeasonStarts.length ? sumBy(sameSeasonStarts, 'runsAllowed') : numberOrNull(statmuse?.runsAllowed)
  const earnedRuns = sameSeasonStarts.length ? sumBy(sameSeasonStarts, 'earnedRuns') : numberOrNull(statmuse?.earnedRuns)
  const hitsAllowed = sameSeasonStarts.length ? sumBy(sameSeasonStarts, 'hitsAllowed') : numberOrNull(statmuse?.hitsAllowed)
  const walksAllowed = sameSeasonStarts.length ? sumBy(sameSeasonStarts, 'walksAllowed') : numberOrNull(statmuse?.walks)
  const strikeouts = sameSeasonStarts.length ? sumBy(sameSeasonStarts, 'strikeouts') : numberOrNull(statmuse?.strikeouts)
  const homeRunsAllowed = sameSeasonStarts.length ? sumBy(sameSeasonStarts, 'homeRunsAllowed') : numberOrNull(statmuse?.homeRunsAllowed)
  const firstInningRunsAllowed = sameSeasonStarts.length ? sumBy(sameSeasonStarts, 'firstInningRunsAllowed') : null
  const qualityStarts = sameSeasonStarts.filter((start) => start.qualityStart).length
  const shortStarts = sameSeasonStarts.filter((start) => Number(start.outsRecorded) > 0 && Number(start.outsRecorded) < 15).length
  const sameSeasonOpponentStarts = sameSeasonStarts
    .map((start) => normalizeOpponentStart(start, 'same-season game log'))
    .filter(Boolean)
    .sort((left, right) => parseGameRowDate(right.date) - parseGameRowDate(left.date))
  const statmuseOpponentStarts = Array.isArray(statmuse?.gameRows)
    ? statmuse.gameRows
        .filter((row) => Number(row?.GS ?? row?.gamesStarted ?? 0) >= 1)
        .map((row) => normalizeOpponentStart(row, 'StatMuse game row'))
        .filter(Boolean)
        .sort((left, right) => parseGameRowDate(right.date) - parseGameRowDate(left.date))
    : []
  const currentYear = new Date().getUTCFullYear()
  const recentStatmuseOpponentStart = statmuseOpponentStarts.find((start) => {
    const year = getGameRowYear(start.date)
    return Number.isFinite(year) && year >= currentYear - 2
  })
  const lastOpponentStart = sameSeasonOpponentStarts[0] || recentStatmuseOpponentStart || null
  const repeatDamageTax = buildRepeatOpponentDamageTax(lastOpponentStart)
  const sampleWeight = clamp((innings / 15) * 0.62 + (starts / 3) * 0.38, 0.18, sameSeasonStarts.length ? 1 : 0.72)
  const runsPerIp = Number.isFinite(runsAllowed) ? runsAllowed / innings : null
  const hitsPerIp = Number.isFinite(hitsAllowed) ? hitsAllowed / innings : null
  const hrPerIp = Number.isFinite(homeRunsAllowed) ? homeRunsAllowed / innings : null
  const walksPerIp = Number.isFinite(walksAllowed) ? walksAllowed / innings : null
  const strikeoutsPerIp = Number.isFinite(strikeouts) ? strikeouts / innings : null
  const firstInningRunRate =
    sameSeasonStarts.length && Number.isFinite(firstInningRunsAllowed)
      ? firstInningRunsAllowed / Math.max(sameSeasonStarts.length, 1)
      : null
  const qualityStartRate = sameSeasonStarts.length ? qualityStarts / sameSeasonStarts.length : null
  const shortStartRate = sameSeasonStarts.length ? shortStarts / sameSeasonStarts.length : null
  const pressureIndex = clamp(
    50 +
      (Number.isFinite(runsPerIp) ? (runsPerIp - 0.48) * 34 : 0) +
      (Number.isFinite(hitsPerIp) ? (hitsPerIp - 1.0) * 22 : 0) +
      (Number.isFinite(hrPerIp) ? (hrPerIp - 0.12) * 38 : 0) +
      (Number.isFinite(walksPerIp) ? (walksPerIp - 0.32) * 14 : 0) -
      (Number.isFinite(strikeoutsPerIp) ? (strikeoutsPerIp - 1.0) * 8 : 0) +
      (Number.isFinite(firstInningRunRate) ? firstInningRunRate * 8 : 0) -
      (Number.isFinite(qualityStartRate) ? qualityStartRate * 6 : 0) +
      (Number.isFinite(shortStartRate) ? shortStartRate * 6 : 0),
    20,
    92
  )
  const pressureDelta = (pressureIndex - 50) * sampleWeight
  const baseProjectedHitsDelta = clamp(pressureDelta * 0.012, -0.24, 0.42)
  const baseFirst5RunsDelta = clamp(pressureDelta * 0.01, -0.22, 0.36)
  const baseRunConversionDelta = clamp(pressureDelta * 0.00035, -0.006, 0.01)
  const projectedHitsDelta = clamp(baseProjectedHitsDelta + repeatDamageTax.hitTax, -0.34, 0.78)
  const first5RunsDelta = clamp(baseFirst5RunsDelta + repeatDamageTax.first5Tax, -0.3, 0.78)
  const runConversionDelta = clamp(baseRunConversionDelta + repeatDamageTax.runConversionTax, -0.007, 0.018)
  const starterScoreAdjustment = clamp(-pressureDelta * 0.12 - repeatDamageTax.starterScoreTax, -7.5, 5)
  const starterHoldAdjustment = clamp(-pressureDelta * 0.18 - repeatDamageTax.starterHoldTax, -10, 6)

  return {
    source: sameSeasonStarts.length ? 'same-season game logs' : 'StatMuse vs opponent',
    starts,
    innings: roundToTenths(innings),
    sampleWeight: roundToTenths(sampleWeight),
    runsPerIp: Number.isFinite(runsPerIp) ? roundToTenths(runsPerIp) : null,
    hitsPerIp: Number.isFinite(hitsPerIp) ? roundToTenths(hitsPerIp) : null,
    hrPerIp: Number.isFinite(hrPerIp) ? roundToTenths(hrPerIp) : null,
    walksPerIp: Number.isFinite(walksPerIp) ? roundToTenths(walksPerIp) : null,
    strikeoutsPerIp: Number.isFinite(strikeoutsPerIp) ? roundToTenths(strikeoutsPerIp) : null,
    firstInningRunRate: Number.isFinite(firstInningRunRate) ? roundToTenths(firstInningRunRate) : null,
    qualityStartRate: Number.isFinite(qualityStartRate) ? roundToTenths(qualityStartRate) : null,
    shortStartRate: Number.isFinite(shortStartRate) ? roundToTenths(shortStartRate) : null,
    runPressureIndex: roundToTenths(pressureIndex),
    projectedHitsDelta: roundToTenths(projectedHitsDelta),
    first5RunsDelta: roundToTenths(first5RunsDelta),
    runConversionDelta,
    starterScoreAdjustment: roundToTenths(starterScoreAdjustment),
    starterHoldAdjustment: roundToTenths(starterHoldAdjustment),
    repeatOpponentHitTax: roundToTenths(repeatDamageTax.hitTax),
    repeatOpponentFirst5Tax: roundToTenths(repeatDamageTax.first5Tax),
    repeatOpponentRunConversionTax: repeatDamageTax.runConversionTax,
    repeatOpponentUnderWarning: Boolean(repeatDamageTax.underWarning),
    repeatOpponentFlags: repeatDamageTax.flags,
    lastOpponentStartSummary: summarizeOpponentStart(lastOpponentStart),
    lastOpponentStart,
    label:
      repeatDamageTax.underWarning
        ? 'repeat opponent damage tax'
        : pressureIndex >= 62
        ? 'opponent has hit this starter'
        : pressureIndex <= 42
          ? 'starter has suppressed this opponent'
          : 'neutral starter-vs-opponent history'
  }
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
  const pitchMixSummary = starterContext?.pitchMixSummary || ''
  const pitchMixProfile = buildPitchMixProfile(starterContext)
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
  const starterVsTeamContext = buildStarterVsTeamContext(starterContext)
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
    pitchMixSummary,
    pitchMixProfile,
    recentForm,
    recentFormWeight,
    starterVsTeamContext,
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

const pitcherWarScore = (pitcher) => {
  const currentWar = Number(pitcher?.currentSeasonWar)
  const previousWar = Number(pitcher?.previousSeasonWar)
  const currentGamesStarted = Number(pitcher?.currentSeasonWarGamesStarted || 0) || 0
  const previousGamesStarted = Number(pitcher?.previousSeasonWarGamesStarted || 0) || 0
  const warDelta = Number(pitcher?.warDelta)
  const components = []

  if (Number.isFinite(currentWar) && currentGamesStarted >= 4) {
    const currentWeight = currentGamesStarted >= 8 ? 1 : 0.7
    components.push((50 + currentWar * 13) * currentWeight + 50 * (1 - currentWeight))
  }

  if (Number.isFinite(previousWar) && previousGamesStarted >= 8) {
    components.push(48 + previousWar * 7)
  }

  if (!components.length) return 50

  let score = average(components)
  if (Number.isFinite(warDelta) && currentGamesStarted >= 4) {
    score += clamp(warDelta, -3, 3) * 1.8
  }

  return clamp(score, 18, 92)
}

const starterScore = (pitcher) =>
  clamp(
    pitcherRecordScore(pitcher) * 0.24 +
      pitcherEraScore(pitcher) * 0.36 +
      pitcherStrikeoutScore(pitcher) * 0.22 +
      pitcherWarScore(pitcher) * 0.18 +
      Number(pitcher?.starterVsTeamContext?.starterScoreAdjustment || 0),
    18,
    92
  )


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
