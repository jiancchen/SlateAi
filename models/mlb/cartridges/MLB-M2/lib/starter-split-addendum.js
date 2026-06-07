const clamp = (value, min, max) => Math.min(max, Math.max(min, value))

const round = (value, digits = 1) => {
  if (!Number.isFinite(value)) return null
  const factor = 10 ** digits
  return Math.round(value * factor) / factor
}

const numeric = (value) => {
  if (value === null || value === undefined || value === '') return null
  const parsed = Number(String(value).replace('%', ''))
  return Number.isFinite(parsed) ? parsed : null
}

const parseBaseballInnings = (value = 0) => {
  const stringValue = `${value}`.trim()
  const match = stringValue.match(/^(\d+)(?:\.(\d))?$/)
  if (!match) return Number(stringValue) || 0
  const whole = Number(match[1])
  const outs = Number(match[2] || 0)
  return whole + (outs === 1 ? 1 / 3 : outs === 2 ? 2 / 3 : 0)
}

const safeJson = (value, fallback = null) => {
  if (value && typeof value === 'object') return value
  if (!value) return fallback
  try {
    return JSON.parse(value)
  } catch {
    return fallback
  }
}

const findCategory = (categories = [], key) => categories.find((category) => category?.key === key)

const findRow = (categories = [], key, matcher) =>
  (findCategory(categories, key)?.rows || []).find((row) => matcher(String(row?.label || '')))

const statValue = (row, metric) =>
  row?.stats?.find((stat) => stat.label === metric || stat.name === metric)?.value ?? null

const statNumber = (row, metric) => numeric(statValue(row, metric))

const addReason = (reasons, condition, text) => {
  if (condition) reasons.push(text)
}

const scoreStarterSplitAddendum = ({
  starterContext = {},
  espnSplits = null,
  statmuseVsOpponent = null,
  role = '',
  venueName = '',
  isNight = false
} = {}) => {
  const categories = safeJson(espnSplits?.categories_json ?? espnSplits?.categoriesJson ?? espnSplits?.categories, [])
  const statmuse = statmuseVsOpponent || {}
  const reasons = []
  const sourceStatus = {
    espn: espnSplits?.source_status || espnSplits?.sourceStatus || starterContext?.espnSplits?.sourceStatus || '',
    statmuse: statmuse?.statmuse_url || statmuse?.statmuseUrl || starterContext?.statmuseVsOpponent ? 'fetched' : ''
  }

  const first = findRow(categories, 'byInningPitches', (label) => /^1st/i.test(label))
  const second = findRow(categories, 'byInningPitches', (label) => /^2nd/i.test(label))
  const third = findRow(categories, 'byInningPitches', (label) => /^3rd/i.test(label))
  const homeAway = findRow(categories, 'byBreakdown', (label) => new RegExp(role === 'home' ? '^Home$' : '^Away$', 'i').test(label))
  const dayNight = findRow(categories, 'byBreakdown', (label) => new RegExp(isNight ? '^Night$' : '^Day$', 'i').test(label))
  const park = venueName
    ? findRow(categories, 'byArena', (label) => label.toLowerCase() === venueName.toLowerCase())
    : null

  const firstOps = statNumber(first, 'OPS')
  const firstObp = statNumber(first, 'OBP')
  const firstHr = statNumber(first, 'HR')
  const firstBb = statNumber(first, 'BB')
  const firstAb = statNumber(first, 'AB')
  const secondOps = statNumber(second, 'OPS')
  const thirdOps = statNumber(third, 'OPS')
  const thirdObp = statNumber(third, 'OBP')
  const thirdBb = statNumber(third, 'BB')
  const splitEra = statNumber(homeAway, 'ERA')
  const splitOba = statNumber(homeAway, 'OBA')
  const dayNightEra = statNumber(dayNight, 'ERA')
  const parkEra = statNumber(park, 'ERA')
  const parkOba = statNumber(park, 'OBA')

  const statmuseIp = parseBaseballInnings(statmuse.innings_pitched ?? statmuse.inningsPitched ?? 0)
  const statmuseRunsPerIp = statmuseIp > 0 ? numeric(statmuse.runs_allowed ?? statmuse.runsAllowed) / statmuseIp : null
  const statmuseHrPerIp = statmuseIp > 0 ? numeric(statmuse.home_runs_allowed ?? statmuse.homeRunsAllowed) / statmuseIp : null
  const statmuseBbPerIp = statmuseIp > 0 ? numeric(statmuse.walks) / statmuseIp : null
  const expectedInnings = numeric(starterContext?.usageContext?.expectedInnings)
  const shortLeashRisk = numeric(starterContext?.usageContext?.shortLeashRisk)

  let earlyLeakageScore = 0
  if (Number.isFinite(firstOps)) earlyLeakageScore += (firstOps - 0.72) * 18
  if (Number.isFinite(firstObp)) earlyLeakageScore += (firstObp - 0.32) * 20
  if (Number.isFinite(firstHr) && Number.isFinite(firstAb) && firstAb > 0) earlyLeakageScore += (firstHr / firstAb - 0.025) * 70
  if (Number.isFinite(firstBb) && Number.isFinite(firstAb) && firstAb > 0) earlyLeakageScore += (firstBb / firstAb - 0.085) * 18
  if (Number.isFinite(splitEra)) earlyLeakageScore += (splitEra - 4.35) * 0.45
  if (Number.isFinite(splitOba)) earlyLeakageScore += (splitOba - 0.255) * 18
  if (Number.isFinite(dayNightEra)) earlyLeakageScore += (dayNightEra - 4.35) * 0.25
  if (Number.isFinite(parkEra)) earlyLeakageScore += (parkEra - 4.35) * 0.18
  if (Number.isFinite(parkOba)) earlyLeakageScore += (parkOba - 0.255) * 10
  if (Number.isFinite(statmuseRunsPerIp)) earlyLeakageScore += (statmuseRunsPerIp - 0.48) * 5
  if (Number.isFinite(statmuseHrPerIp)) earlyLeakageScore += (statmuseHrPerIp - 0.12) * 9
  if (Number.isFinite(statmuseBbPerIp)) earlyLeakageScore += (statmuseBbPerIp - 0.32) * 4
  earlyLeakageScore = clamp(earlyLeakageScore, -10, 10)

  let f5StabilityScore = 0
  if (Number.isFinite(firstOps)) f5StabilityScore -= (firstOps - 0.72) * 7
  if (Number.isFinite(secondOps)) f5StabilityScore -= (secondOps - 0.74) * 8
  if (Number.isFinite(thirdOps)) f5StabilityScore -= (thirdOps - 0.76) * 7
  if (Number.isFinite(thirdObp)) f5StabilityScore -= (thirdObp - 0.33) * 10
  if (Number.isFinite(thirdBb) && Number.isFinite(firstBb)) f5StabilityScore -= clamp(thirdBb - firstBb, -5, 5) * 0.25
  if (Number.isFinite(expectedInnings)) f5StabilityScore += (expectedInnings - 5.2) * 1.2
  if (Number.isFinite(shortLeashRisk)) f5StabilityScore -= shortLeashRisk * 2
  if (Number.isFinite(statmuseRunsPerIp)) f5StabilityScore -= (statmuseRunsPerIp - 0.48) * 3
  f5StabilityScore = clamp(f5StabilityScore, -10, 10)

  const f5SideScore = clamp(f5StabilityScore * 0.62 - earlyLeakageScore * 0.28 + (Number.isFinite(expectedInnings) ? (expectedInnings - 5.2) * 0.7 : 0), -10, 10)

  addReason(reasons, Number.isFinite(firstOps), `1st time OPS allowed ${round(firstOps, 3)}`)
  addReason(reasons, Number.isFinite(firstObp), `1st time OBP allowed ${round(firstObp, 3)}`)
  addReason(reasons, Number.isFinite(thirdOps), `3rd time OPS allowed ${round(thirdOps, 3)}`)
  addReason(reasons, Number.isFinite(splitEra), `${role || 'role'} split ERA ${round(splitEra, 2)}`)
  addReason(reasons, Number.isFinite(dayNightEra), `${isNight ? 'night' : 'day'} split ERA ${round(dayNightEra, 2)}`)
  addReason(reasons, Number.isFinite(parkEra), `${venueName} ERA ${round(parkEra, 2)}`)
  addReason(reasons, Number.isFinite(statmuseRunsPerIp), `vs opponent runs/IP ${round(statmuseRunsPerIp, 2)}`)
  addReason(reasons, Number.isFinite(expectedInnings), `expected innings ${round(expectedInnings, 2)}`)

  return {
    earlyLeakageScore: round(earlyLeakageScore, 1),
    f5StabilityScore: round(f5StabilityScore, 1),
    f5SideScore: round(f5SideScore, 1),
    reasons: reasons.slice(0, 7),
    sourceStatus
  }
}

const buildGameStarterSplitAddendum = ({
  game = {},
  awayEspnSplits = null,
  homeEspnSplits = null,
  awayStatmuseVsOpponent = null,
  homeStatmuseVsOpponent = null
} = {}) => {
  const venueName = game?.parkContext?.venueName || game?.analysis?.mlbProjection?.sunVisibility?.venueName || ''
  const start = String(game?.start || '')
  const isNight = /PM PT/i.test(start) && Number(start.split(':')[0]) >= 4
  const away = scoreStarterSplitAddendum({
    starterContext: game?.starterContext?.away || {},
    espnSplits: awayEspnSplits || game?.starterContext?.away?.espnSplits,
    statmuseVsOpponent: awayStatmuseVsOpponent || game?.starterContext?.away?.statmuseVsOpponent,
    role: 'away',
    venueName,
    isNight
  })
  const home = scoreStarterSplitAddendum({
    starterContext: game?.starterContext?.home || {},
    espnSplits: homeEspnSplits || game?.starterContext?.home?.espnSplits,
    statmuseVsOpponent: homeStatmuseVsOpponent || game?.starterContext?.home?.statmuseVsOpponent,
    role: 'home',
    venueName,
    isNight
  })
  const earlySum = (away.earlyLeakageScore || 0) + (home.earlyLeakageScore || 0)
  const stabilitySum = (away.f5StabilityScore || 0) + (home.f5StabilityScore || 0)
  const awaySideGap = (away.f5SideScore || 0) - (home.f5SideScore || 0)

  return {
    away,
    home,
    adjustments: {
      yrfiProbabilityPct: round(clamp(earlySum * 0.2, -4, 4), 1),
      first5TotalRuns: round(clamp(earlySum * 0.018 - stabilitySum * 0.015, -0.35, 0.35), 2),
      awayFirst5LeadProbabilityPct: round(clamp(awaySideGap * 0.15, -3, 3), 1)
    },
    caps: {
      yrfiProbabilityPct: 4,
      first5TotalRuns: 0.35,
      first5LeadProbabilityPct: 3
    },
    mode: 'shadow'
  }
}

export {
  buildGameStarterSplitAddendum,
  scoreStarterSplitAddendum
}
