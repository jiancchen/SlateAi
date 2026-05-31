import fs from 'node:fs/promises'
import path from 'node:path'
import { buildTennistonicH2HUrl } from '../web/src/lib/tennis-source-mapping.js'

const ROOT = path.resolve(import.meta.dirname, '..')
const MODEL_CARTRIDGES = {
  T0: {
    id: 'T0',
    sport: 'tennis',
    label: 'T0 tennis baseline',
    status: 'baseline',
    entrypoint: 'pipeline/generate-tennis-day-module.mjs --model T0',
    manifestPath: 'pipeline/tennis_model_cartridges/T0/manifest.json'
  }
}

const parseArgs = () => {
  const args = process.argv.slice(2)
  const options = { date: '', output: '', predictionsOutput: '', model: 'T0' }
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index]
    if (arg === '--date') {
      options.date = args[index + 1]
      index += 1
    } else if (arg === '--output') {
      options.output = args[index + 1]
      index += 1
    } else if (arg === '--predictions-output') {
      options.predictionsOutput = args[index + 1]
      index += 1
    } else if (arg === '--model') {
      options.model = String(args[index + 1] || '').toUpperCase()
      index += 1
    }
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(options.date)) throw new Error('Pass --date YYYY-MM-DD')
  if (!MODEL_CARTRIDGES[options.model]) throw new Error(`Unsupported tennis model cartridge: ${options.model}`)
  options.output ||= `web/src/lib/day-${options.date}.js`
  options.predictionsOutput ||= `data-private/predictions/tennis/${options.date}-roland-garros-singles.json`
  return options
}

const readJson = async (filePath, fallback = null) => {
  try {
    return JSON.parse(await fs.readFile(path.resolve(ROOT, filePath), 'utf8'))
  } catch (error) {
    if (error.code === 'ENOENT') return fallback
    throw error
  }
}

const normalizeName = (value) =>
  String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/gi, ' ')
    .trim()
    .toLowerCase()

const slug = (value) =>
  normalizeName(value)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

const titleDate = (date) => {
  const [year, month, day] = date.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC'
  })
}

const timeLabel = (isoDate) => {
  if (!isoDate) return 'TBD'
  return new Date(isoDate).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'America/Los_Angeles'
  })
}

const startMinutes = (isoDate) => {
  if (!isoDate) return 0
  const parts = new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
    timeZone: 'America/Los_Angeles'
  }).formatToParts(new Date(isoDate))
  const hour = Number(parts.find((part) => part.type === 'hour')?.value || 0)
  const minute = Number(parts.find((part) => part.type === 'minute')?.value || 0)
  return hour * 60 + minute
}

const getRanking = (rankings, name) => rankings.players?.[normalizeName(name)] ?? null

const findQuality = (quality, matchId, name) => {
  const players = quality.matches?.[matchId]?.players || []
  const key = normalizeName(name)
  return players.find((player) => normalizeName(player.name) === key) ?? null
}

const clayRecordScore = (qualityPlayer) => {
  const record = qualityPlayer?.records?.clay2026
  if (!record || !Number.isFinite(Number(record.winPct)) || !Number.isFinite(Number(record.total))) return 0
  const sample = Math.min(1, Number(record.total) / 10)
  return (Number(record.winPct) - 0.5) * 34 * sample
}

const formScore = (qualityPlayer) => {
  const value = Number(qualityPlayer?.recentWindow?.opponentAdjustedFormScore)
  return Number.isFinite(value) ? (value - 50) * 0.18 : 0
}

const serviceAverage = (qualityPlayer, key) => {
  const service = qualityPlayer?.serviceData || {}
  const matchesWithStats = Number(service.matchesWithStats)
  const value = Number(service[key])
  return Number.isFinite(matchesWithStats) && matchesWithStats > 0 && Number.isFinite(value) && value > 0 ? value : NaN
}

const serviceScore = (qualityPlayer) => {
  const service = qualityPlayer?.serviceData || {}
  const hold = serviceAverage(qualityPlayer, 'avgServiceHoldPct')
  const first = serviceAverage(qualityPlayer, 'avgFirstServeWonPct')
  const aces = serviceAverage(qualityPlayer, 'avgAces')
  const second = averageRecentStat(qualityPlayer, 'secondServeWonPct')
  const serviceWon = averageRecentStat(qualityPlayer, 'servicePointsWonPct')
  const winners = averageRecentStat(qualityPlayer, 'winners')
  const unforced = averageRecentStat(qualityPlayer, 'unforcedErrors')
  let score = 0
  if (Number.isFinite(hold)) score += (hold - 68) * 0.16
  if (Number.isFinite(first)) score += (first - 64) * 0.12
  if (Number.isFinite(second)) score += (second - 48) * 0.08
  if (Number.isFinite(serviceWon)) score += (serviceWon - 56) * 0.1
  if (Number.isFinite(aces)) score += Math.min(4, aces) * 0.45
  if (Number.isFinite(winners) && Number.isFinite(unforced)) score += Math.max(-4, Math.min(4, (winners - unforced) * 0.08))
  return score
}

const averageRecentStat = (qualityPlayer, key) => {
  const values = (qualityPlayer?.recentMatches || [])
    .map((match) => Number(match?.serviceStats?.[key]))
    .filter(Number.isFinite)
  if (!values.length) return null
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

const averageValues = (values) => {
  const numeric = values
    .filter((value) => value !== null && value !== undefined && value !== '')
    .map(Number)
    .filter(Number.isFinite)
  if (!numeric.length) return null
  return numeric.reduce((sum, value) => sum + value, 0) / numeric.length
}

const cleanSetGames = (value) => {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return null
  if (numeric >= 0 && numeric <= 7) return numeric
  const firstDigit = String(Math.trunc(Math.abs(numeric))).match(/[0-7]/)?.[0]
  return firstDigit ? Number(firstDigit) : null
}

const setTotalFromToken = (token) => {
  const left = cleanSetGames(token?.leftGames)
  const right = cleanSetGames(token?.rightGames)
  if (!Number.isFinite(left) || !Number.isFinite(right)) return null
  const total = left + right
  return total >= 6 && total <= 13 ? total : null
}

const recentSetShape = (qualityPlayer) => {
  const firstSetTotals = []
  const setTotals = []
  const matchTotals = []
  let tiebreakSets = 0
  let completedMatches = 0
  ;(qualityPlayer?.recentMatches || []).forEach((match) => {
    const tokens = (match?.parsed?.scoreTokens || []).map(setTotalFromToken).filter(Number.isFinite)
    if (!tokens.length) return
    completedMatches += 1
    firstSetTotals.push(tokens[0])
    setTotals.push(...tokens)
    matchTotals.push(tokens.reduce((sum, value) => sum + value, 0))
    tiebreakSets += Number(match?.parsed?.tiebreakSets || 0)
  })
  const avgSetGames = averageValues(setTotals)
  const avgMatchGames = averageValues(matchTotals)
  return {
    completedMatches,
    setSamples: setTotals.length,
    firstSetSamples: firstSetTotals.length,
    avgFirstSetGames: averageValues(firstSetTotals),
    avgSetGames,
    avgMatchGames,
    avgSetsPlayed: completedMatches ? setTotals.length / completedMatches : null,
    tiebreakRate: setTotals.length ? tiebreakSets / setTotals.length : null,
    extendedSetRate: setTotals.length ? setTotals.filter((value) => value >= 11).length / setTotals.length : null,
    shortSetRate: setTotals.length ? setTotals.filter((value) => value <= 8).length / setTotals.length : null
  }
}

const flowProfile = (qualityPlayer, weaknessProfile) => ({
  name: qualityPlayer?.name || weaknessProfile?.name || '',
  holdPct: weaknessProfile?.serviceHoldPct ?? serviceAverage(qualityPlayer, 'avgServiceHoldPct'),
  firstServeWonPct: weaknessProfile?.firstServeWonPct ?? serviceAverage(qualityPlayer, 'avgFirstServeWonPct'),
  secondServeWonPct: weaknessProfile?.secondServeWonPct ?? averageRecentStat(qualityPlayer, 'secondServeWonPct'),
  servicePointsWonPct: weaknessProfile?.servicePointsWonPct ?? averageRecentStat(qualityPlayer, 'servicePointsWonPct'),
  returnPointsWonPct: weaknessProfile?.returnPointsWonPct ?? averageRecentStat(qualityPlayer, 'returnPointsWonPct'),
  returnGamesWonPct: averageRecentStat(qualityPlayer, 'returnGamesWonPct'),
  aces: weaknessProfile?.avgAces ?? serviceAverage(qualityPlayer, 'avgAces'),
  doubleFaults: weaknessProfile?.avgDoubleFaults ?? averageRecentStat(qualityPlayer, 'doubleFaults'),
  winners: weaknessProfile?.avgWinners ?? averageRecentStat(qualityPlayer, 'winners'),
  unforcedErrors: weaknessProfile?.avgUnforcedErrors ?? averageRecentStat(qualityPlayer, 'unforcedErrors'),
  weaknessScore: weaknessProfile?.weaknessScore ?? null,
  weakServeMatches: weaknessProfile?.weakServeMatches ?? 0,
  statMatches: weaknessProfile?.matchesWithStats ?? Number(qualityPlayer?.serviceData?.matchesWithStats) ?? 0,
  setShape: recentSetShape(qualityPlayer)
})

const totalConfidenceFromGap = ({ gap, signalStrength, multiplier, min = 44, max = 74 }) => {
  if (!Number.isFinite(Number(gap))) return null
  const absGap = Math.abs(Number(gap))
  if (absGap < 0.25) return clamp(Math.round(50 + Math.min(2, signalStrength * 0.25)), 48, 53)
  return clamp(Math.round(50 + absGap * multiplier + signalStrength), min, max)
}

const formatMaybe = (value, suffix = '', decimals = 0) => {
  if (value === null || value === undefined || value === '') return 'N/A'
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return 'N/A'
  return `${numeric.toFixed(decimals).replace(/\.0$/, '')}${suffix}`
}

const buildTotalsProfile = ({ tour, confidence, volatility, qualityA, qualityB, weaknessA, weaknessB }) => {
  const profiles = [flowProfile(qualityA, weaknessA), flowProfile(qualityB, weaknessB)]
  const shapes = profiles.map((profile) => profile.setShape || {})
  const holdAvg = averageValues(profiles.map((profile) => profile.holdPct))
  const minHold = Math.min(...profiles.map((profile) => Number(profile.holdPct)).filter(Number.isFinite))
  const servicePointsAvg = averageValues(profiles.map((profile) => profile.servicePointsWonPct))
  const firstServeAvg = averageValues(profiles.map((profile) => profile.firstServeWonPct))
  const secondServeAvg = averageValues(profiles.map((profile) => profile.secondServeWonPct))
  const returnPointsAvg = averageValues(profiles.map((profile) => profile.returnPointsWonPct))
  const returnGamesAvg = averageValues(profiles.map((profile) => profile.returnGamesWonPct))
  const acesAvg = averageValues(profiles.map((profile) => profile.aces))
  const doubleFaultsAvg = averageValues(profiles.map((profile) => profile.doubleFaults))
  const errorGapAvg = averageValues(profiles.map((profile) => {
    const winners = Number(profile.winners)
    const unforced = Number(profile.unforcedErrors)
    return Number.isFinite(winners) && Number.isFinite(unforced) ? unforced - winners : null
  }))
  const statsCoverage = profiles.reduce((sum, profile) => sum + (Number(profile.statMatches) > 0 ? 1 : 0), 0)
  const setSamples = shapes.reduce((sum, shape) => sum + Number(shape.setSamples || 0), 0)
  const firstSetSamples = shapes.reduce((sum, shape) => sum + Number(shape.firstSetSamples || 0), 0)
  const avgFirstSetGames = averageValues(shapes.map((shape) => shape.avgFirstSetGames))
  const avgSetGames = averageValues(shapes.map((shape) => shape.avgSetGames))
  const avgMatchGames = averageValues(shapes.map((shape) => shape.avgMatchGames))
  const tiebreakRate = averageValues(shapes.map((shape) => shape.tiebreakRate))
  const extendedSetRate = averageValues(shapes.map((shape) => shape.extendedSetRate))
  const shortSetRate = averageValues(shapes.map((shape) => shape.shortSetRate))
  const weakServeMatches = profiles.reduce((sum, profile) => sum + Number(profile.weakServeMatches || 0), 0)

  let expectedFirstSetGames = Number.isFinite(avgFirstSetGames) ? avgFirstSetGames : tour === 'ATP' ? 9.7 : 9.4
  if (Number.isFinite(holdAvg)) expectedFirstSetGames += (holdAvg - 73) * 0.035
  if (Number.isFinite(servicePointsAvg)) expectedFirstSetGames += (servicePointsAvg - 58) * 0.026
  if (Number.isFinite(firstServeAvg)) expectedFirstSetGames += (firstServeAvg - 66) * 0.018
  if (Number.isFinite(secondServeAvg)) expectedFirstSetGames += (secondServeAvg - 50) * 0.02
  if (Number.isFinite(returnPointsAvg)) expectedFirstSetGames -= (returnPointsAvg - 41) * 0.035
  if (Number.isFinite(returnGamesAvg)) expectedFirstSetGames -= (returnGamesAvg - 30) * 0.018
  if (Number.isFinite(acesAvg)) expectedFirstSetGames += Math.min(0.35, Math.max(0, acesAvg - 5) * 0.055)
  if (Number.isFinite(doubleFaultsAvg)) expectedFirstSetGames -= Math.max(0, doubleFaultsAvg - 3) * 0.08
  if (Number.isFinite(errorGapAvg)) expectedFirstSetGames -= Math.max(0, errorGapAvg - 2) * 0.012
  if (Number.isFinite(tiebreakRate)) expectedFirstSetGames += tiebreakRate * 0.75
  if (Number.isFinite(extendedSetRate)) expectedFirstSetGames += extendedSetRate * 0.55
  if (Number.isFinite(shortSetRate)) expectedFirstSetGames -= shortSetRate * 0.35
  if (Number.isFinite(minHold) && minHold < 66) expectedFirstSetGames -= (66 - minHold) * 0.025
  if (confidence >= 72) expectedFirstSetGames -= (confidence - 71) * 0.025
  if (confidence <= 56) expectedFirstSetGames += (56 - confidence) * 0.035
  if (volatility >= 62) expectedFirstSetGames += tour === 'ATP' ? 0.18 : 0.08
  expectedFirstSetGames = clamp(Number(expectedFirstSetGames.toFixed(1)), 7.4, 12.8)

  const setGameBase = Number.isFinite(avgSetGames) ? avgSetGames : expectedFirstSetGames
  let expectedSets =
    tour === 'ATP'
      ? confidence >= 76
        ? 3.15
        : confidence >= 66
          ? 3.55
          : confidence >= 58
            ? 3.95
            : 4.15
      : confidence >= 74
        ? 2.05
        : confidence >= 62
          ? 2.22
          : 2.38
  if (volatility >= 62) expectedSets += tour === 'ATP' ? 0.2 : 0.1
  if (Number.isFinite(holdAvg) && holdAvg >= 78) expectedSets += tour === 'ATP' ? 0.08 : 0.04
  if (Number.isFinite(returnGamesAvg) && returnGamesAvg >= 38 && confidence >= 70) expectedSets -= 0.08
  const recentMatchAnchor =
    Number.isFinite(avgMatchGames) && avgMatchGames > 0
      ? tour === 'ATP'
        ? avgMatchGames * 0.22
        : avgMatchGames * 0.3
      : null
  const projectedBySets = expectedSets * setGameBase
  const expectedMatchGames = Number(
    clamp(
      recentMatchAnchor ? projectedBySets * 0.78 + recentMatchAnchor : projectedBySets,
      tour === 'ATP' ? 27.5 : 16.5,
      tour === 'ATP' ? 55 : 33
    ).toFixed(1)
  )
  const signalStrength = clamp(
    Math.round(
      statsCoverage * 1.5 +
        Math.min(3, setSamples / 8) +
        Math.min(2, Math.abs((holdAvg ?? 73) - 73) * 0.08) +
        Math.min(2, Math.abs((returnGamesAvg ?? 30) - 30) * 0.05) +
        Math.min(1.5, (tiebreakRate ?? 0) * 4) +
        Math.min(1.5, (extendedSetRate ?? 0) * 3) +
        Math.min(1.5, weakServeMatches * 0.12)
    ),
    1,
    10
  )
  const reasonCore = `hold avg ${formatMaybe(holdAvg, '%')}, return games won ${formatMaybe(returnGamesAvg, '%')}, first-set sample ${formatMaybe(avgFirstSetGames, 'g', 1)}, ${setSamples} recent sets`
  return {
    profiles,
    expectedFirstSetGames,
    expectedMatchGames,
    signalStrength,
    holdAvg: Number.isFinite(holdAvg) ? Number(holdAvg.toFixed(1)) : null,
    returnGamesAvg: Number.isFinite(returnGamesAvg) ? Number(returnGamesAvg.toFixed(1)) : null,
    returnPointsAvg: Number.isFinite(returnPointsAvg) ? Number(returnPointsAvg.toFixed(1)) : null,
    setSamples,
    firstSetSamples,
    avgFirstSetGames: Number.isFinite(avgFirstSetGames) ? Number(avgFirstSetGames.toFixed(1)) : null,
    avgSetGames: Number.isFinite(avgSetGames) ? Number(avgSetGames.toFixed(1)) : null,
    tiebreakRate: Number.isFinite(tiebreakRate) ? Number((tiebreakRate * 100).toFixed(1)) : null,
    extendedSetRate: Number.isFinite(extendedSetRate) ? Number((extendedSetRate * 100).toFixed(1)) : null,
    shortSetRate: Number.isFinite(shortSetRate) ? Number((shortSetRate * 100).toFixed(1)) : null,
    reasonCore
  }
}

const parseBreakPointsFaced = (value) => {
  const match = String(value || '').match(/^\s*(\d+)\s*\/\s*(\d+)\s*$/)
  return match ? Number(match[2]) : null
}

const buildWeaknessProfile = (name, qualityPlayer) => {
  const recentMatches = qualityPlayer?.recentMatches || []
  const service = qualityPlayer?.serviceData || {}
  const matchesWithStats = Number(service.matchesWithStats)
  const hold = serviceAverage(qualityPlayer, 'avgServiceHoldPct')
  const firstWon = serviceAverage(qualityPlayer, 'avgFirstServeWonPct')
  const aces = serviceAverage(qualityPlayer, 'avgAces')
  const doubleFaults = averageRecentStat(qualityPlayer, 'doubleFaults')
  const firstServePct = averageRecentStat(qualityPlayer, 'firstServePct')
  const secondServeWon = averageRecentStat(qualityPlayer, 'secondServeWonPct')
  const returnWon = averageRecentStat(qualityPlayer, 'returnPointsWonPct')
  const serviceWon = averageRecentStat(qualityPlayer, 'servicePointsWonPct')
  const winners = averageRecentStat(qualityPlayer, 'winners')
  const unforcedErrors = averageRecentStat(qualityPlayer, 'unforcedErrors')
  const breakFacedValues = recentMatches
    .map((match) => parseBreakPointsFaced(match?.serviceStats?.breakPointsSaved))
    .filter(Number.isFinite)
  const avgBreakPointsFaced = breakFacedValues.length
    ? breakFacedValues.reduce((sum, value) => sum + value, 0) / breakFacedValues.length
    : null
  const weakServeMatches = recentMatches.filter((match) => {
    const stats = match?.serviceStats || {}
    const matchHold = Number(stats.serviceHoldPct ?? stats.holdPct)
    const matchFirstWon = Number(stats.firstServeWonPct)
    const matchDoubleFaults = Number(stats.doubleFaults)
    const matchServiceWon = Number(stats.servicePointsWonPct)
    return (
      (Number.isFinite(matchHold) && matchHold < 60) ||
      (Number.isFinite(matchFirstWon) && matchFirstWon < 60) ||
      (Number.isFinite(matchDoubleFaults) && matchDoubleFaults >= 5) ||
      (Number.isFinite(matchServiceWon) && matchServiceWon < 52)
    )
  }).length
  const pressureMatches = Number(qualityPlayer?.recentWindow?.resistanceMatches)
  const weaknessScore = Math.round(
    Math.max(0, Number.isFinite(hold) ? (68 - hold) * 0.9 : 0) +
      Math.max(0, Number.isFinite(firstWon) ? (64 - firstWon) * 0.55 : 0) +
      Math.max(0, Number.isFinite(secondServeWon) ? (48 - secondServeWon) * 0.55 : 0) +
      Math.max(0, Number.isFinite(serviceWon) ? (55 - serviceWon) * 0.45 : 0) +
      Math.max(0, Number.isFinite(firstServePct) ? (60 - firstServePct) * 0.25 : 0) +
      Math.max(0, Number.isFinite(doubleFaults) ? (doubleFaults - 3) * 3 : 0) +
      Math.max(0, Number.isFinite(unforcedErrors) && Number.isFinite(winners) ? (unforcedErrors - winners - 4) * 0.28 : 0) +
      Math.max(0, Number.isFinite(avgBreakPointsFaced) ? (avgBreakPointsFaced - 6) * 1.1 : 0) +
      weakServeMatches * 2.25 +
      Math.max(0, Number.isFinite(pressureMatches) ? pressureMatches - 3 : 0) * 1.5
  )
  const liabilities = []
  const strengths = []
  if (Number.isFinite(hold)) {
    if (hold < 62) liabilities.push(`low recent hold rate (${Math.round(hold)}%)`)
    if (hold >= 76) strengths.push(`protects serve well (${Math.round(hold)}% hold)`)
  }
  if (Number.isFinite(firstWon)) {
    if (firstWon < 62) liabilities.push(`first-serve points won below comfort (${Math.round(firstWon)}%)`)
    if (firstWon >= 70) strengths.push(`wins enough first-serve points (${Math.round(firstWon)}%)`)
  }
  if (Number.isFinite(secondServeWon)) {
    if (secondServeWon < 45) liabilities.push(`second-serve points won are attackable (${Math.round(secondServeWon)}%)`)
    if (secondServeWon >= 55) strengths.push(`second serve holds up (${Math.round(secondServeWon)}%)`)
  }
  if (Number.isFinite(doubleFaults) && doubleFaults >= 4) liabilities.push(`double-fault pressure (${doubleFaults.toFixed(1)} avg)`)
  if (Number.isFinite(unforcedErrors) && Number.isFinite(winners)) {
    if (unforcedErrors - winners >= 6) liabilities.push(`negative winner/error balance (${winners.toFixed(1)} winners, ${unforcedErrors.toFixed(1)} unforced)`)
    if (winners - unforcedErrors >= 3) strengths.push(`positive winner/error balance (${winners.toFixed(1)} winners, ${unforcedErrors.toFixed(1)} unforced)`)
  }
  if (Number.isFinite(avgBreakPointsFaced) && avgBreakPointsFaced >= 8) liabilities.push(`faces too many break points (${avgBreakPointsFaced.toFixed(1)} avg)`)
  if (weakServeMatches >= 3) liabilities.push(`${weakServeMatches} recent matches with serve instability`)
  if (Number.isFinite(returnWon)) {
    if (returnWon < 38) liabilities.push(`limited return pressure (${Math.round(returnWon)}% return points won)`)
    if (returnWon >= 45) strengths.push(`creates return pressure (${Math.round(returnWon)}% return points won)`)
  }
  const firstGameComfort =
    weaknessScore >= 26
      ? 'Fragile opening-service profile'
      : weaknessScore >= 15
        ? 'Needs early holds confirmed'
        : 'Comfortable enough if first serve lands'
  return {
    name,
    serviceHoldPct: Number.isFinite(hold) ? Math.round(hold) : null,
    firstServeWonPct: Number.isFinite(firstWon) ? Math.round(firstWon) : null,
    secondServeWonPct: Number.isFinite(secondServeWon) ? Math.round(secondServeWon) : null,
    firstServePct: Number.isFinite(firstServePct) ? Math.round(firstServePct) : null,
    avgAces: Number.isFinite(aces) ? Number(aces.toFixed(1)) : null,
    avgDoubleFaults: Number.isFinite(doubleFaults) ? Number(doubleFaults.toFixed(1)) : null,
    avgWinners: Number.isFinite(winners) ? Number(winners.toFixed(1)) : null,
    avgUnforcedErrors: Number.isFinite(unforcedErrors) ? Number(unforcedErrors.toFixed(1)) : null,
    avgBreakPointsFaced: Number.isFinite(avgBreakPointsFaced) ? Number(avgBreakPointsFaced.toFixed(1)) : null,
    returnPointsWonPct: Number.isFinite(returnWon) ? Math.round(returnWon) : null,
    servicePointsWonPct: Number.isFinite(serviceWon) ? Math.round(serviceWon) : null,
    weakServeMatches,
    pressureMatches: Number.isFinite(pressureMatches) ? pressureMatches : null,
    matchesWithStats: Number.isFinite(matchesWithStats) ? matchesWithStats : recentMatches.filter((match) => match?.serviceStats).length,
    weaknessScore,
    firstGameComfort,
    liabilities,
    strengths,
    gameFlowRead: liabilities.length
      ? `${name} can drop points quickly through ${liabilities.slice(0, 2).join(' and ')}.`
      : `${name} has no major service weakness in the joined Flashscore sample.`
  }
}

const weaknessPenalty = (qualityPlayer) =>
  Math.min(10, buildWeaknessProfile(qualityPlayer?.name || '', qualityPlayer).weaknessScore * 0.18)

const rankScore = (ranking) => {
  const rank = Number(ranking?.rank)
  if (!Number.isFinite(rank)) return 0
  if (rank <= 3) return 45
  if (rank <= 10) return 36
  if (rank <= 20) return 28
  if (rank <= 50) return 18
  if (rank <= 100) return 8
  if (rank <= 150) return 2
  if (rank <= 250) return -4
  if (rank <= 500) return -10
  return -16
}

const playerScore = (ranking, qualityPlayer, isAtp) =>
  rankScore(ranking) +
  clayRecordScore(qualityPlayer) +
  formScore(qualityPlayer) +
  serviceScore(qualityPlayer) +
  (isAtp ? 1.5 : 0) -
  weaknessPenalty(qualityPlayer)

const pctFromDelta = (delta, isAtp) => {
  const divisor = isAtp ? 1.8 : 2.35
  return Math.max(38, Math.min(87, Math.round(50 + delta / divisor)))
}

const formatRecord = (record) => {
  if (!record || !Number.isFinite(Number(record.wins)) || !Number.isFinite(Number(record.losses))) return 'N/A'
  const pct = Number.isFinite(Number(record.winPct)) ? `, ${Math.round(Number(record.winPct) * 100)}%` : ''
  return `${record.wins}-${record.losses}${pct}`
}

const americanToImpliedPct = (odds) => {
  const value = Number(odds)
  if (!Number.isFinite(value) || value === 0) return null
  return value > 0 ? (100 / (value + 100)) * 100 : (Math.abs(value) / (Math.abs(value) + 100)) * 100
}

const americanToDecimal = (odds) => {
  const value = Number(odds)
  if (!Number.isFinite(value) || value === 0) return null
  return value > 0 ? 1 + value / 100 : 1 + 100 / Math.abs(value)
}

const formatAmerican = (odds) => {
  const value = Number(odds)
  if (!Number.isFinite(value)) return 'N/A'
  return value > 0 ? `+${value}` : `${value}`
}

const profitOn100 = (odds) => {
  const value = Number(odds)
  if (!Number.isFinite(value) || value === 0) return null
  return value > 0 ? value : 10000 / Math.abs(value)
}

const clamp = (value, min, max) => Math.max(min, Math.min(max, value))
const finiteNumberOrNull = (value) => {
  if (value === null || value === undefined || value === '') return null
  const numericValue = Number(value)
  return Number.isFinite(numericValue) ? numericValue : null
}
const FEE_PER_100_RISKED = 2
const MIN_VALID_PLUS_ODDS = 100
const MAX_VALID_PLUS_ODDS = 250
const MAX_VALID_MODEL_EDGE = 24

const evPer100 = (modelPct, odds) => {
  const probability = Number(modelPct) / 100
  const profit = profitOn100(odds)
  if (!Number.isFinite(probability) || !Number.isFinite(profit)) return null
  return Number((probability * profit - (1 - probability) * 100).toFixed(1))
}

const netEvPer100 = (modelPct, odds, fee = FEE_PER_100_RISKED) => {
  const gross = evPer100(modelPct, odds)
  if (!Number.isFinite(gross)) return null
  return Number((gross - fee).toFixed(1))
}

const valueIssue = ({ marketType, edgePct, odds, modelPct, ev, netEv }) => {
  const type = String(marketType || '').toLowerCase()
  const edge = Number(edgePct)
  const price = Number(odds)
  const model = Number(modelPct)
  const grossValue = Number(ev)
  const netValue = Number(netEv)
  const profit = profitOn100(price)
  if (!Number.isFinite(price) || !Number.isFinite(model) || !Number.isFinite(edge) || !Number.isFinite(grossValue)) return 'No price validation'
  if (Number.isFinite(profit) && profit <= FEE_PER_100_RISKED) return 'Fee/tax trap'
  if (type !== 'ml') return type === 'spread' ? 'Spread watch only' : type === 'total' ? 'Total watch only' : 'Raw edge only'
  if (price < -400) return 'Favorite tax trap'
  if (price <= 0) return 'Favorite price needs better proof'
  if (price < MIN_VALID_PLUS_ODDS || price > MAX_VALID_PLUS_ODDS) return 'Outlier price/manual review'
  if (edge < 7) return 'Raw ML edge only'
  if (edge > MAX_VALID_MODEL_EDGE) return 'Model-market outlier'
  if (model < 45 || model > 60) return 'Model probability outside validated lane'
  if (!Number.isFinite(netValue) || netValue < 8) return 'Fee-adjusted EV too thin'
  return 'Validated ML candidate'
}

const valueGrade = ({ edgePct, ev, marketType, odds, modelPct }) => {
  const edge = Number(edgePct)
  const value = Number(ev)
  if (!Number.isFinite(edge) || !Number.isFinite(value)) return 'No price'
  const type = String(marketType || '').toLowerCase()
  const price = Number(odds)
  const model = Number(modelPct)
  const netValue = netEvPer100(model, price)
  const issue = valueIssue({ marketType, edgePct: edge, odds: price, modelPct: model, ev: value, netEv: netValue })
  if (issue === 'Fee/tax trap') return 'Fee/tax trap'
  if (type !== 'ml') {
    if (edge >= 5 && value >= 5) return 'Watch only'
    if (edge >= 3 && value > 0) return 'Raw positive EV'
  }
  if (type === 'ml' && price < -400) return 'Favorite tax trap'
  if (type === 'ml' && issue === 'Validated ML candidate') return 'Bet-grade value'
  if (type === 'ml' && value > 0 && issue !== 'Validated ML candidate') return issue
  if (edge >= 3 && value > 0) return 'Thin value'
  if (edge <= -4 || value < -4) return 'Negative EV'
  return 'Near fair'
}

const isBetGradeValue = ({ marketType, edgePct, ev, odds, modelPct }) =>
  valueGrade({ marketType, edgePct, ev, odds, modelPct }) === 'Bet-grade value'

const edgeVsOdds = (modelPct, odds) => {
  const impliedPct = americanToImpliedPct(odds)
  if (!Number.isFinite(impliedPct)) return null
  return Number((Number(modelPct) - impliedPct).toFixed(1))
}

const priceBandFor = (impliedPct) => {
  const value = Number(impliedPct)
  if (!Number.isFinite(value)) return 'No price'
  if (value >= 82) return 'Very expensive favorite'
  if (value >= 70) return 'Low-payout favorite'
  if (value >= 58) return 'Moderate favorite'
  if (value >= 45) return 'Coinflip'
  return 'Underdog'
}

const playerLine = (lines, playerName) => {
  const key = normalizeName(playerName)
  const keyTokens = key.split(' ').filter(Boolean).sort().join(' ')
  return (
    (lines || []).find((line) => normalizeName(line.player) === key) ??
    (lines || []).find((line) => normalizeName(line.player).split(' ').filter(Boolean).sort().join(' ') === keyTokens) ??
    null
  )
}

const buildFanDuelIndex = (lines) => {
  const index = new Map()
  for (const row of lines?.matches || []) {
    index.set(normalizeName(row.match), row)
  }
  return index
}

const findFanDuelLine = (index, playerA, playerB) =>
  index.get(normalizeName(`${playerA} vs ${playerB}`)) ?? index.get(normalizeName(`${playerB} vs ${playerA}`)) ?? null

const buildDerivativeIndex = (rows) => {
  const index = new Map()
  for (const row of rows || []) {
    if (row.matchId) index.set(row.matchId, row)
    if (row.match) index.set(normalizeName(row.match), row)
  }
  return index
}

const findDerivativeCase = (index, matchId, playerA, playerB) =>
  index.get(matchId) ??
  index.get(normalizeName(`${playerA} vs ${playerB}`)) ??
  index.get(normalizeName(`${playerB} vs ${playerA}`)) ??
  null

const setWinConfidence = ({ playerModelPct, opponentModelPct, volatility, weaknessScore, isAtp }) => {
  const modelPct = Number(playerModelPct)
  const oppPct = Number(opponentModelPct)
  const vol = Number(volatility)
  const weakness = Number(weaknessScore)
  if (!Number.isFinite(modelPct)) return null
  const cleanVol = Number.isFinite(vol) ? vol : 55
  const cleanWeakness = Number.isFinite(weakness) ? weakness : 12
  const dominanceGap = Math.max(0, oppPct - modelPct)
  const value = isAtp
    ? modelPct >= 50
      ? 82 + (modelPct - 50) * 0.33 + cleanVol * 0.04 - cleanWeakness * 0.12
      : 48 + modelPct * 0.52 + cleanVol * 0.1 - dominanceGap * 0.18 - cleanWeakness * 0.1
    : modelPct >= 50
      ? 68 + (modelPct - 50) * 0.48 + cleanVol * 0.04 - cleanWeakness * 0.14
      : 30 + modelPct * 0.58 + cleanVol * 0.14 - dominanceGap * 0.22 - cleanWeakness * 0.12
  return Math.max(isAtp ? 38 : 24, Math.min(isAtp ? 97 : 93, Math.round(value)))
}

const buildSetWinProjections = ({ players, tour, volatility }) =>
  players.map((player, index) => {
    const opponent = players[index === 0 ? 1 : 0]
    const confidence = setWinConfidence({
      playerModelPct: player.modelPct,
      opponentModelPct: opponent.modelPct,
      volatility,
      weaknessScore: player.weakness?.weaknessScore,
      isAtp: tour === 'ATP'
    })
    return {
      name: player.name,
      confidence,
      modelPct: player.modelPct,
      label:
        confidence >= 82
          ? 'Strong set-win path'
          : confidence >= 68
            ? 'Live to win a set'
            : confidence >= 52
              ? 'Needs early hold pressure'
              : 'Thin set-win path'
    }
  })

const formatPctValue = (value) => (Number.isFinite(Number(value)) ? `${Number(value).toFixed(1).replace(/\.0$/, '')}%` : 'N/A')

const signed = (value, decimals = 1) => {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return 'N/A'
  return `${numeric > 0 ? '+' : ''}${numeric.toFixed(decimals).replace(/\.0$/, '')}`
}

const statLabel = (value, suffix = '') => {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return 'N/A'
  return `${numeric.toFixed(1).replace(/\.0$/, '')}${suffix}`
}

const buildEnsembleValueCase = ({ row, rawPickName, players, selectionQuality, opponentQuality, selectionWeakness, opponentWeakness }) => {
  if (!row) return null
  const selection = row.selection
  const opponent = row.opponent || players.find((player) => player.name !== selection)?.name || 'opponent'
  const selectionPlayer = players.find((player) => player.name === selection) || null
  const marketPlayer = selectionPlayer?.market || null
  const marketOdds = Number.isFinite(Number(row.marketFairOdds)) ? row.marketFairOdds : marketPlayer?.odds
  const implied = Number(row.marketProbability)
  const model = Number(row.modelProbability)
  const dataOnly = Number(row.dataOnlyProbability)
  const fairOdds = Number(row.fairOdds)
  const netEv = Number(row.netEvPer100)
  const disagreement = Number(row.marketDisagreementPct)
  const selectionHold = serviceAverage(selectionQuality, 'avgServiceHoldPct')
  const opponentHold = serviceAverage(opponentQuality, 'avgServiceHoldPct')
  const selectionAces = serviceAverage(selectionQuality, 'avgAces')
  const opponentAces = serviceAverage(opponentQuality, 'avgAces')
  const selectionFirstWon = serviceAverage(selectionQuality, 'avgFirstServeWonPct')
  const opponentFirstWon = serviceAverage(opponentQuality, 'avgFirstServeWonPct')
  const selectionSecondWon = averageRecentStat(selectionQuality, 'secondServeWonPct')
  const opponentSecondWon = averageRecentStat(opponentQuality, 'secondServeWonPct')
  const selectionDfs = averageRecentStat(selectionQuality, 'doubleFaults')
  const opponentDfs = averageRecentStat(opponentQuality, 'doubleFaults')
  const selectionWinners = averageRecentStat(selectionQuality, 'winners')
  const opponentWinners = averageRecentStat(opponentQuality, 'winners')
  const selectionUnforced = averageRecentStat(selectionQuality, 'unforcedErrors')
  const opponentUnforced = averageRecentStat(opponentQuality, 'unforcedErrors')
  const statBullets = []
  if (Number.isFinite(selectionHold) || Number.isFinite(opponentHold)) {
    statBullets.push(`Recent hold: ${selection} ${statLabel(selectionHold, '%')} vs ${opponent} ${statLabel(opponentHold, '%')}.`)
  }
  if (Number.isFinite(selectionAces) || Number.isFinite(opponentAces) || Number.isFinite(selectionDfs) || Number.isFinite(opponentDfs)) {
    statBullets.push(`Serve events: ${selection} ${statLabel(selectionAces)} aces / ${statLabel(selectionDfs)} DFs vs ${opponent} ${statLabel(opponentAces)} aces / ${statLabel(opponentDfs)} DFs.`)
  }
  if (Number.isFinite(selectionFirstWon) || Number.isFinite(opponentFirstWon) || Number.isFinite(selectionSecondWon) || Number.isFinite(opponentSecondWon)) {
    statBullets.push(`Serve points: ${selection} 1st ${statLabel(selectionFirstWon, '%')}, 2nd ${statLabel(selectionSecondWon, '%')} vs ${opponent} 1st ${statLabel(opponentFirstWon, '%')}, 2nd ${statLabel(opponentSecondWon, '%')}.`)
  }
  if (Number.isFinite(selectionWinners) || Number.isFinite(opponentWinners) || Number.isFinite(selectionUnforced) || Number.isFinite(opponentUnforced)) {
    statBullets.push(`Winner/error profile: ${selection} ${statLabel(selectionWinners)} winners / ${statLabel(selectionUnforced)} UEs vs ${opponent} ${statLabel(opponentWinners)} winners / ${statLabel(opponentUnforced)} UEs.`)
  }
  const risks = []
  if (rawPickName && rawPickName !== selection) risks.push(`Desk lean still has ${rawPickName}; this is a price-dislocation play, not the safest winner.`)
  if (Number.isFinite(implied) && implied < 35) risks.push(`Market still prices ${selection} as a real underdog at ${formatPctValue(implied)} implied.`)
  if (opponentWeakness?.strengths?.length) risks.push(`${opponent} strength: ${opponentWeakness.strengths[0]}.`)
  if (selectionWeakness?.liabilities?.length) risks.push(`${selection} risk: ${selectionWeakness.liabilities[0]}.`)
  if (!risks.length) risks.push('Risk is mostly normal tennis variance; do not size this like a lock.')
  const useCase =
    Number.isFinite(Number(marketOdds)) && Number(marketOdds) > 0 && Number.isFinite(netEv) && netEv >= 8
      ? `Straight ML value only at ${formatAmerican(marketOdds)} or better; fair price from the ensemble is about ${formatAmerican(fairOdds)}.`
      : Number.isFinite(Number(marketOdds)) && Number(marketOdds) < 0
        ? 'Favorite price needs cleaner proof or derivative value; do not confuse win probability with bet value.'
        : 'Needs a posted market price before sizing.'
  return {
    source: 'Multimodel ensemble',
    selection,
    opponent,
    grade: row.grade,
    riskGate: row.riskGate,
    marketOdds,
    fairOdds,
    modelProbability: model,
    dataOnlyProbability: dataOnly,
    marketProbability: implied,
    marketDisagreementPct: disagreement,
    netEvPer100: netEv,
    modelBlend: row.modelBlend,
    headline:
      Number.isFinite(netEv) && netEv > 0
        ? `${selection} is priced below the model, not guaranteed to win.`
        : `${selection} does not clear a fee-adjusted value case.`,
    useCase,
    bullets: statBullets.slice(0, 4),
    risks: risks.slice(0, 4)
  }
}

const formatProfile = (ranking, qualityPlayer) => {
  const parts = [
    Number.isFinite(Number(ranking?.rank)) ? `Live rank #${ranking.rank}` : 'Rank not joined',
    ranking?.country ? ranking.country : null,
    Number.isFinite(Number(ranking?.age)) ? `age ${ranking.age}` : null,
    qualityPlayer?.records?.clay2026 ? `2026 clay ${formatRecord(qualityPlayer.records.clay2026)}` : null,
    Number.isFinite(Number(qualityPlayer?.recentWindow?.opponentAdjustedFormScore))
      ? `adj form ${Math.round(Number(qualityPlayer.recentWindow.opponentAdjustedFormScore))}`
      : null,
    Number.isFinite(serviceAverage(qualityPlayer, 'avgServiceHoldPct'))
      ? `hold ${Math.round(serviceAverage(qualityPlayer, 'avgServiceHoldPct'))}%`
      : null
  ].filter(Boolean)
  return parts.join(' | ')
}

const buildRead = ({ pick, opponent, confidence, volatility, pickQuality, oppQuality, isAtp }) => {
  const pickHold = serviceAverage(pickQuality, 'avgServiceHoldPct')
  const oppHold = serviceAverage(oppQuality, 'avgServiceHoldPct')
  const pickForm = Number(pickQuality?.recentWindow?.opponentAdjustedFormScore)
  const oppForm = Number(oppQuality?.recentWindow?.opponentAdjustedFormScore)
  const notes = []
  if (Number.isFinite(pickHold) && Number.isFinite(oppHold)) {
    const holdGap = pickHold - oppHold
    if (holdGap >= 3) {
      notes.push(`${pick} has the recent service-hold edge ${Math.round(pickHold)}% to ${Math.round(oppHold)}%.`)
    } else if (holdGap <= -3) {
      notes.push(`${opponent} has the recent service-hold edge ${Math.round(oppHold)}% to ${Math.round(pickHold)}%, so ${pick} needs the rank/form edge to show up on return games.`)
    } else {
      notes.push(`Recent service hold is close: ${pick} ${Math.round(pickHold)}%, ${opponent} ${Math.round(oppHold)}%.`)
    }
  }
  if (Number.isFinite(pickForm) && Number.isFinite(oppForm)) {
    const formGap = pickForm - oppForm
    if (formGap >= 5) {
      notes.push(`${pick} grades ${Math.round(formGap)} points better on opponent-adjusted recent form.`)
    } else if (formGap <= -5) {
      notes.push(`${opponent} grades ${Math.round(Math.abs(formGap))} points better on opponent-adjusted recent form, which keeps this below bet-grade without a good price.`)
    } else {
      notes.push(`Opponent-adjusted recent form is basically even: ${pick} ${Math.round(pickForm)}, ${opponent} ${Math.round(oppForm)}.`)
    }
  }
  if (!notes.length) notes.push(`${pick} has the cleaner composite of rank, clay record, and recent opponent quality.`)
  const discipline =
    confidence >= 74 && volatility <= 48
      ? 'High win probability, but the ML still needs enough payout after comparing the book price to the model.'
      : volatility >= 65
        ? 'Pass or live-trade only; the pre-match edge is not clean enough.'
        : 'Lean, not a chase.'
  const totals =
    isAtp && Number.isFinite(pickHold) && Number.isFinite(oppHold) && Math.min(pickHold, oppHold) >= 74
      ? 'Best O/U angle: over if the book hangs a low best-of-five number, because both recent hold profiles can extend sets.'
      : !isAtp && volatility >= 62
        ? 'Best O/U angle: avoid low unders; WTA break clusters can still produce three-set chaos.'
        : 'Best O/U angle: no play without a posted total.'
  return { reason: `${notes.join(' ')} ${discipline}`, totals }
}

const buildWeaknessEdge = ({ pickName, opponentName, pickQuality, oppQuality, pickWeakness, oppWeakness, confidence, volatility }) => {
  const gap = (oppWeakness?.weaknessScore || 0) - (pickWeakness?.weaknessScore || 0)
  const attackable = oppWeakness?.liabilities?.length ? oppWeakness.liabilities.slice(0, 2).join('; ') : 'no major joined weakness'
  const selfRisk = pickWeakness?.liabilities?.length ? pickWeakness.liabilities.slice(0, 2).join('; ') : 'no major joined weakness'
  const target =
    gap >= 8
      ? opponentName
      : gap <= -8
        ? pickName
        : 'Both sides'
  const edgeType =
    gap >= 8
      ? 'Weakness edge'
      : gap <= -8
        ? 'Weakness warning'
        : 'No clear weakness edge'
  const gameFlow =
    gap >= 8
      ? `${pickName} has a real path if ${opponentName}'s first two service games show the same weakness: ${attackable}.`
      : gap <= -8
        ? `${pickName} is the model side, but the fragile profile is on our pick: ${selfRisk}. Avoid laying a bad price until early holds are confirmed.`
        : `The weakness gap is small. Do not force arbitrage; wait for first-set serve comfort and break-point pressure.`
  const liveTrigger =
    gap >= 8
      ? `Look for ${opponentName} facing break points or second-serve pressure before 3-3.`
      : gap <= -8
        ? `Do not upgrade ${pickName} unless they hold cleanly in the first service game and keep double faults down.`
        : 'Wait for a visible service-pressure split before entering.'
  const spreadRead =
    gap >= 8 && confidence >= 60
      ? `${pickName} spread only if the handicap is short and ${opponentName} is under pressure early.`
      : volatility >= 58
        ? 'Pre-match spread is fragile; wait for both players to serve once.'
        : 'No spread edge without a posted handicap and first service-cycle read.'
  const totalRead =
    Math.max(pickWeakness?.weaknessScore || 0, oppWeakness?.weaknessScore || 0) >= 24
      ? `Avoid low unders if ${target === 'Both sides' ? 'either player' : target} faces early break points or second-serve pressure.`
      : 'No total edge unless the posted number is low and both players hold comfortably early.'
  return {
    edgeType,
    target,
    scoreGap: gap,
    attackingSide: gap >= 8 ? pickName : null,
    vulnerableSide: gap >= 8 ? opponentName : gap <= -8 ? pickName : null,
    gameFlow,
    liveTrigger,
    spreadRead,
    totalRead,
    pick: pickWeakness,
    opponent: oppWeakness
  }
}

const buildMarketData = ({ fanduel, players, pickName, weaknessEdge, confidence, totals }) => {
  if (!fanduel?.markets?.moneyline?.length) return null
  const enrichedPlayers = players.map((player) => {
    const line = playerLine(fanduel.markets.moneyline, player.name)
    const impliedPct = americanToImpliedPct(line?.odds)
    const decimalOdds = americanToDecimal(line?.odds)
    const grossProfitPct = profitOn100(line?.odds)
    return {
      name: player.name,
      odds: Number.isFinite(Number(line?.odds)) ? Number(line.odds) : null,
      americanLabel: formatAmerican(line?.odds),
      impliedPct: Number.isFinite(impliedPct) ? Number(impliedPct.toFixed(1)) : null,
      decimalOdds: Number.isFinite(decimalOdds) ? Number(decimalOdds.toFixed(3)) : null,
      modelPct: player.modelPct,
      edgePct: Number.isFinite(impliedPct) ? Number((player.modelPct - impliedPct).toFixed(1)) : null,
      priceBand: priceBandFor(impliedPct),
      grossProfitPct: Number.isFinite(grossProfitPct) ? Number(grossProfitPct.toFixed(1)) : null,
      grossPayoutMultiple: Number.isFinite(decimalOdds) ? Number(decimalOdds.toFixed(3)) : null,
      centsAtRisk: 100,
      centsProfitIfWin: Number.isFinite(grossProfitPct) ? Number(grossProfitPct.toFixed(1)) : null
    }
  })
  const desk = enrichedPlayers.find((player) => player.name === pickName) ?? enrichedPlayers[0]
  const spread = playerLine(fanduel.markets.gameHandicap, pickName)
  const total = (fanduel.markets.totalGames || [])[0]
  const totalOver = (fanduel.markets.totalGames || []).find((line) => line.side === 'Over')
  const totalUnder = (fanduel.markets.totalGames || []).find((line) => line.side === 'Under')
  const firstSetTotal = (fanduel.markets.firstSetTotalGames || [])[0]
  const firstSetTotalOver = (fanduel.markets.firstSetTotalGames || []).find((line) => line.side === 'Over')
  const firstSetTotalUnder = (fanduel.markets.firstSetTotalGames || []).find((line) => line.side === 'Under')
  const edge = Number(desk?.edgePct)
  const impliedPct = Number(desk?.impliedPct)
  let priceAction = 'FanDuel price captured; compare edge before betting.'
  if (Number.isFinite(impliedPct) && impliedPct >= 82) {
    priceAction = 'ML payout is tiny; use spread/total or pass unless the number moves.'
  } else if (Number.isFinite(impliedPct) && impliedPct >= 70) {
    priceAction = 'Favorite price has limited payout; require a strong weakness edge or use spread/total.'
  } else if (Number.isFinite(edge) && edge >= 7) {
    priceAction = 'Model is meaningfully above FanDuel implied price.'
  } else if (Number.isFinite(edge) && edge <= -4) {
    priceAction = 'FanDuel price is richer than the model; pass ML unless live state improves.'
  } else {
    priceAction = 'ML is close to fair; derivative or live entry needs to carry the edge.'
  }
  const spreadValue = spread
    ? `${pickName} ${spread.spread > 0 ? '+' : ''}${spread.spread} (${formatAmerican(spread.odds)})`
    : 'No primary game spread captured'
  const totalValue = total
    ? `${total.line} games: Over ${formatAmerican(totalOver?.odds)} / Under ${formatAmerican(totalUnder?.odds)}`
    : 'No total captured'
  const firstSetTotalValue = firstSetTotal
    ? `${firstSetTotal.line} 1st-set games: Over ${formatAmerican(firstSetTotalOver?.odds)} / Under ${formatAmerican(firstSetTotalUnder?.odds)}`
    : 'No first-set total captured'
  const spreadLean = spread
    ? Math.abs(Number(spread.spread)) <= 3.5 && weaknessEdge?.edgeType === 'Weakness edge'
      ? `${pickName} spread is playable only if early return pressure shows`
      : Math.abs(Number(spread.spread)) >= 6
        ? 'Large game spread; ML may be cleaner than laying games'
        : 'Spread is number-dependent; verify first service cycle'
    : 'No spread line'
  const totalLean = total
    ? weaknessEdge?.totalRead?.includes('breaks')
      ? 'Over or pass if early service games are loose'
      : totals?.includes('over')
        ? 'Over lean if both players hold early'
        : 'Total needs live serve data before entry'
    : 'No total line'
  return {
    source: 'FanDuel Sportsbook',
    sourceDetail: fanduel.source,
    capturedAt: fanduel.capturedAt,
    eventUrl: fanduel.href,
    eventId: fanduel.eventId,
    players: enrichedPlayers,
    desk,
    spread,
    total,
    totalOver,
    totalUnder,
    firstSetTotal,
    firstSetTotalOver,
    firstSetTotalUnder,
    priceAction,
    spreadValue,
    totalValue,
    firstSetTotalValue,
    spreadLean,
    totalLean,
    mlValue: `${enrichedPlayers.map((player) => `${player.name} ${player.americanLabel}`).join(' / ')}`,
    marketNote: `FanDuel ML, game handicap, match total, and first-set total captured from sportsbook page. ${priceAction}`,
    noVigNote: Number.isFinite(edge) ? `Model ${confidence}% vs FanDuel implied ${desk.impliedPct}% (${edge > 0 ? '+' : ''}${edge} pts).` : 'No model-vs-price edge available.'
  }
}

const firstSetValueBook = ({ derivativeCase, confidence, volatility, weaknessEdge, marketData, totalsProfile }) => {
  const market = marketData?.firstSetTotal
  const over = marketData?.firstSetTotalOver
  const under = marketData?.firstSetTotalUnder
  const postedLine = Number(market?.line)
  const firstSet = derivativeCase?.firstSet
  const expectedFromProfile = Number(totalsProfile?.expectedFirstSetGames)
  if (Number.isFinite(expectedFromProfile) && Number.isFinite(postedLine)) {
    const lineGap = Number((expectedFromProfile - postedLine).toFixed(1))
    const selection =
      lineGap >= 0.25 ? `Over ${postedLine}` : lineGap <= -0.25 ? `Under ${postedLine}` : 'Pass / near line'
    const selectedOdds = selection.startsWith('Over') ? over?.odds : selection.startsWith('Under') ? under?.odds : null
    const selectedOddsValue = finiteNumberOrNull(selectedOdds)
    const modelPct = totalConfidenceFromGap({
      gap: lineGap,
      signalStrength: totalsProfile?.signalStrength ?? 2,
      multiplier: 10,
      min: 45,
      max: 73
    })
    const earlyBreakRisk = clamp(
      Math.round(
        50 +
          Math.max(0, 72 - Number(totalsProfile?.holdAvg ?? 72)) * 0.6 +
          Math.max(0, Number(totalsProfile?.returnGamesAvg ?? 30) - 30) * 0.45 +
          (weaknessEdge?.edgeType === 'Weakness edge' ? 4 : 0) +
          (volatility >= 62 ? 3 : 0)
      ),
      25,
      78
    )
    return {
      marketType: 'First-set total',
      selection,
      line: postedLine,
      americanOdds: selectedOddsValue,
      expectedGames: expectedFromProfile,
      confidence: modelPct,
      tiebreakRisk: clamp(
        Math.round(
          (totalsProfile?.tiebreakRate ?? 0) +
            Math.max(0, Number(totalsProfile?.holdAvg ?? 73) - 73) * 1.1 +
            Math.max(0, 32 - Number(totalsProfile?.returnGamesAvg ?? 30)) * 0.8
        ),
        18,
        72
      ),
      earlyBreakRisk,
      modelPct,
      evPer100: selectedOddsValue !== null ? evPer100(modelPct, selectedOddsValue) : null,
      netEvPer100: selectedOddsValue !== null ? netEvPer100(modelPct, selectedOddsValue) : null,
      valueGrade: selection.startsWith('Pass') ? 'Near fair' : Math.abs(lineGap) >= 0.65 ? 'Actionable live watch' : 'Thin value',
      reason:
        selection.startsWith('Pass')
          ? `Expected first-set games ${expectedFromProfile} vs FanDuel ${postedLine}; near the number. ${totalsProfile?.reasonCore || ''}.`
          : `Expected first-set games ${expectedFromProfile} vs FanDuel ${postedLine}; ${selection}. ${totalsProfile?.reasonCore || ''}.`,
      betGrade: false
    }
  }
  if (firstSet) {
    const leanText = firstSet.lean || 'No bet'
    const selectedOdds = /^over/i.test(leanText) ? over?.odds : /^under/i.test(leanText) ? under?.odds : null
    const selectedOddsValue = finiteNumberOrNull(selectedOdds)
    return {
      marketType: 'First-set total',
      selection: leanText,
      line: firstSet.postedLine ?? (Number.isFinite(postedLine) ? postedLine : null),
      americanOdds: selectedOddsValue,
      expectedGames: Number.isFinite(Number(firstSet.expectedGames)) ? Number(firstSet.expectedGames) : null,
      confidence: firstSet.confidence ?? null,
      tiebreakRisk: Number.isFinite(Number(firstSet.tiebreakRisk)) ? Number(firstSet.tiebreakRisk) : null,
      earlyBreakRisk: Number.isFinite(Number(firstSet.earlyBreakRisk)) ? Number(firstSet.earlyBreakRisk) : null,
      modelPct: firstSet.confidence ?? null,
      evPer100: selectedOddsValue !== null && Number.isFinite(Number(firstSet.confidence)) ? evPer100(firstSet.confidence, selectedOddsValue) : null,
      netEvPer100: selectedOddsValue !== null && Number.isFinite(Number(firstSet.confidence)) ? netEvPer100(firstSet.confidence, selectedOddsValue) : null,
      valueGrade: firstSet.confidence >= 58 ? 'Actionable live watch' : 'Thin',
      reason: firstSet.lean || 'First-set entry needs early serve pressure.',
      betGrade: false
    }
  }
  const estimatedGames = clamp(
    Number((9.1 + (volatility >= 62 ? 0.7 : volatility <= 42 ? -0.3 : 0.1) + (confidence <= 56 ? 0.3 : confidence >= 72 ? -0.4 : 0)).toFixed(1)),
    8.2,
    12.5
  )
  const breakRisk = weaknessEdge?.edgeType === 'Weakness edge' ? 62 : volatility >= 62 ? 58 : 48
  const lineGap = Number.isFinite(postedLine) ? Number((estimatedGames - postedLine).toFixed(1)) : null
  const selection =
    lineGap == null
      ? 'Price required'
      : lineGap >= 0.3
        ? `Over ${postedLine}`
        : lineGap <= -0.3
          ? `Under ${postedLine}`
          : 'Pass / near line'
  const selectedOdds = selection.startsWith('Over') ? over?.odds : selection.startsWith('Under') ? under?.odds : null
  const selectedOddsValue = finiteNumberOrNull(selectedOdds)
  const modelPct = Number.isFinite(Number(lineGap))
    ? clamp(Math.round(50 + Math.abs(lineGap) * 8 + (volatility >= 62 ? 3 : 0) - (confidence >= 72 ? 2 : 0)), 45, 64)
    : clamp(Math.round(54 + (volatility >= 62 ? 4 : 0) - (confidence >= 72 ? 3 : 0)), 45, 62)
  return {
    marketType: 'First-set total',
    selection,
    line: Number.isFinite(postedLine) ? postedLine : null,
    americanOdds: selectedOddsValue,
    expectedGames: estimatedGames,
    confidence: modelPct,
    tiebreakRisk: clamp(Math.round(100 - breakRisk), 20, 70),
    earlyBreakRisk: breakRisk,
    modelPct,
    evPer100: selectedOddsValue !== null ? evPer100(modelPct, selectedOddsValue) : null,
    netEvPer100: selectedOddsValue !== null ? netEvPer100(modelPct, selectedOddsValue) : null,
    valueGrade: lineGap == null ? 'Needs posted first-set total' : Math.abs(lineGap) >= 0.5 ? 'Thin value' : 'Near fair',
    reason:
      lineGap == null
        ? 'Use expected first-set games against the posted 1st-set total; do not infer this from ML confidence alone.'
        : `Expected first-set games ${estimatedGames} vs FanDuel ${postedLine}; ${selection}.`,
    betGrade: false
  }
}

const buildValueBoard = ({ marketData, pickName, confidence, volatility, weaknessEdge, setWinProjections, derivativeCase, totalsProfile }) => {
  const firstSetTotal = firstSetValueBook({ derivativeCase, confidence, volatility, weaknessEdge, marketData, totalsProfile })
  if (!marketData) {
    return {
      note: 'No sportsbook price captured; value math is unavailable.',
      ml: {
        marketType: 'ML',
        selection: pickName,
        americanOdds: null,
        modelPct: confidence,
        impliedPct: null,
        edgePct: null,
        evPer100: null,
        netEvPer100: null,
        valueIssue: 'Need posted ML price before EV can be trusted.',
        valueGrade: 'Need price',
        betGrade: false
      },
      spread: {
        marketType: 'Spread',
        selection: pickName,
        line: null,
        americanOdds: null,
        modelPct: Math.max(42, confidence - 6),
        valueIssue: 'Need posted game spread before grading.',
        valueGrade: 'Need price',
        betGrade: false
      },
      total: {
        marketType: 'Total',
        selection: 'Price required',
        line: null,
        americanOdds: null,
        modelPct: Math.max(41, confidence - 8),
        valueIssue: 'Need posted match total before grading.',
        valueGrade: 'Need price',
        betGrade: false
      },
      firstSetTotal,
      setWin: setWinProjections
    }
  }
  const mlOdds = marketData.desk?.odds
  const mlEdge = marketData.desk?.edgePct
  const mlEv = evPer100(confidence, mlOdds)
  const mlNetEv = netEvPer100(confidence, mlOdds)
  const spreadOdds = marketData.spread?.odds
  const spreadLine = Number(marketData.spread?.spread)
  const spreadPenalty = Number.isFinite(spreadLine) && Math.abs(spreadLine) >= 6 ? 4 : 0
  const weaknessBump = weaknessEdge?.edgeType === 'Weakness edge' ? 4 : weaknessEdge?.edgeType === 'Weakness warning' ? -6 : 0
  const spreadModelPct = Number.isFinite(Number(spreadOdds))
    ? clamp(Math.round(confidence - 6 - spreadPenalty + weaknessBump), 42, 76)
    : null
  const spreadEdge = Number.isFinite(Number(spreadModelPct)) ? edgeVsOdds(spreadModelPct, spreadOdds) : null
  const spreadEv = Number.isFinite(Number(spreadModelPct)) ? evPer100(spreadModelPct, spreadOdds) : null
  const spreadNetEv = Number.isFinite(Number(spreadModelPct)) ? netEvPer100(spreadModelPct, spreadOdds) : null
  const postedTotalLine = Number(marketData.total?.line)
  const expectedTotalGames = Number(totalsProfile?.expectedMatchGames)
  const totalLineGap =
    Number.isFinite(expectedTotalGames) && Number.isFinite(postedTotalLine)
      ? Number((expectedTotalGames - postedTotalLine).toFixed(1))
      : null
  const profileTotalSelection =
    Number.isFinite(totalLineGap) && Math.abs(totalLineGap) >= 0.75
      ? totalLineGap > 0
        ? 'Over'
        : 'Under'
      : null
  const fallbackTotalSelection =
    marketData.totalLean?.toLowerCase().includes('over') || weaknessEdge?.totalRead?.toLowerCase().includes('breaks')
      ? 'Over'
      : marketData.totalLean?.toLowerCase().includes('under')
        ? 'Under'
        : null
  const totalSelection = Number.isFinite(totalLineGap) ? profileTotalSelection : fallbackTotalSelection
  const totalLine = totalSelection === 'Over' ? marketData.totalOver : totalSelection === 'Under' ? marketData.totalUnder : null
  const totalModelPct = totalLine
    ? Number.isFinite(totalLineGap)
      ? totalConfidenceFromGap({
          gap: totalLineGap,
          signalStrength: totalsProfile?.signalStrength ?? 2,
          multiplier: 2.8,
          min: 43,
          max: 74
        })
      : clamp(Math.round(confidence - 8 + (volatility >= 62 ? 4 : 0)), 41, 68)
    : null
  const totalEdge = totalLine ? edgeVsOdds(totalModelPct, totalLine.odds) : null
  const totalEv = totalLine ? evPer100(totalModelPct, totalLine.odds) : null
  const totalNetEv = totalLine ? netEvPer100(totalModelPct, totalLine.odds) : null
  const totalReason =
    Number.isFinite(totalLineGap) && totalLine
      ? `Expected match games ${expectedTotalGames} vs FanDuel ${postedTotalLine}; ${totalSelection}. ${totalsProfile?.reasonCore || ''}.`
      : marketData.total
        ? `FanDuel total is ${marketData.total.line}; model did not clear a full-match over/under edge from hold, return, and set-shape data. ${totalsProfile?.reasonCore || ''}.`
        : 'No posted match total captured.'
  return {
    note: 'EV is profit per 100 risked from model probability vs posted odds. Positive model confidence is not enough if price is bad.',
    ml: {
      marketType: 'ML',
      selection: pickName,
      americanOdds: mlOdds,
      modelPct: confidence,
      impliedPct: marketData.desk?.impliedPct,
      edgePct: mlEdge,
      evPer100: mlEv,
      netEvPer100: mlNetEv,
      feePer100: FEE_PER_100_RISKED,
      valueIssue: valueIssue({ marketType: 'ML', edgePct: mlEdge, ev: mlEv, netEv: mlNetEv, odds: mlOdds, modelPct: confidence }),
      valueGrade: valueGrade({ marketType: 'ML', edgePct: mlEdge, ev: mlEv, odds: mlOdds, modelPct: confidence }),
      betGrade: isBetGradeValue({ marketType: 'ML', edgePct: mlEdge, ev: mlEv, odds: mlOdds, modelPct: confidence })
    },
    spread: marketData.spread
      ? {
          marketType: 'Spread',
          selection: pickName,
          line: spreadLine,
          americanOdds: spreadOdds,
          modelPct: spreadModelPct,
          impliedPct: Number.isFinite(americanToImpliedPct(spreadOdds)) ? Number(americanToImpliedPct(spreadOdds).toFixed(1)) : null,
          edgePct: spreadEdge,
          evPer100: spreadEv,
          netEvPer100: spreadNetEv,
          feePer100: FEE_PER_100_RISKED,
          valueIssue: valueIssue({ marketType: 'Spread', edgePct: spreadEdge, ev: spreadEv, netEv: spreadNetEv, odds: spreadOdds, modelPct: spreadModelPct }),
          valueGrade: valueGrade({ marketType: 'Spread', edgePct: spreadEdge, ev: spreadEv, odds: spreadOdds, modelPct: spreadModelPct }),
          betGrade: false
        }
      : null,
    total: totalLine
      ? {
          marketType: 'Total',
          selection: totalSelection,
          line: marketData.total?.line ?? totalLine.line,
          americanOdds: totalLine.odds,
          expectedGames: Number.isFinite(expectedTotalGames) ? expectedTotalGames : null,
          modelPct: totalModelPct,
          impliedPct: Number.isFinite(americanToImpliedPct(totalLine.odds)) ? Number(americanToImpliedPct(totalLine.odds).toFixed(1)) : null,
          edgePct: totalEdge,
          evPer100: totalEv,
          netEvPer100: totalNetEv,
          feePer100: FEE_PER_100_RISKED,
          valueIssue: valueIssue({ marketType: 'Total', edgePct: totalEdge, ev: totalEv, netEv: totalNetEv, odds: totalLine.odds, modelPct: totalModelPct }),
          valueGrade: valueGrade({ marketType: 'Total', edgePct: totalEdge, ev: totalEv, odds: totalLine.odds, modelPct: totalModelPct }),
          reason: totalReason,
          betGrade: false
        }
      : {
          marketType: 'Total',
          selection: 'No bet',
          line: marketData.total?.line ?? null,
          overOdds: marketData.totalOver?.odds ?? null,
          underOdds: marketData.totalUnder?.odds ?? null,
          expectedGames: Number.isFinite(expectedTotalGames) ? expectedTotalGames : null,
          valueGrade: 'No direction',
          reason: totalReason,
          betGrade: false
        },
    firstSetTotal,
    setWin: setWinProjections.map((entry) => ({
      ...entry,
      marketType: 'Win a set',
      valueGrade: 'Needs posted price',
      betGrade: false
    }))
  }
}

const buildBettingMatrix = ({ marketData, valueBoard, setWinProjections, derivativeCase, pickName, confidence }) => {
  const matrix = []
  const ml = valueBoard?.ml
  if (ml) {
    matrix.push({
      marketType: 'Moneyline',
      label: 'ML value',
      selection: ml.selection || pickName,
      line: null,
      americanOdds: ml.americanOdds,
      modelPct: ml.modelPct ?? confidence,
      impliedPct: ml.impliedPct ?? marketData?.desk?.impliedPct ?? null,
      edgePct: ml.edgePct ?? marketData?.desk?.edgePct ?? null,
      evPer100: ml.evPer100 ?? null,
      netEvPer100: ml.netEvPer100 ?? null,
      grade: ml.valueGrade || 'No price',
      issue: ml.valueIssue || null,
      reason:
        ml.valueGrade === 'Favorite tax trap'
          ? 'Likely winner can still be a bad ML bet after payout and fees. Check spread, total, and set-win instead.'
          : marketData?.priceAction || 'Compare model probability to break-even price before betting ML.'
    })
  }

  const spread = derivativeCase?.gameHandicap
  if (spread || valueBoard?.spread) {
    matrix.push({
      marketType: 'Game spread',
      label: 'Game spread',
      selection: spread?.selection || valueBoard?.spread?.selection || pickName,
      line:
        spread?.postedSpread !== null && spread?.postedSpread !== undefined && Number.isFinite(Number(spread.postedSpread))
          ? Number(spread.postedSpread)
          : valueBoard?.spread?.line ?? null,
      americanOdds: spread?.odds ?? valueBoard?.spread?.americanOdds ?? null,
      modelPct: valueBoard?.spread?.modelPct ?? null,
      impliedPct: valueBoard?.spread?.impliedPct ?? null,
      edgePct: valueBoard?.spread?.edgePct ?? null,
      evPer100: valueBoard?.spread?.evPer100 ?? null,
      netEvPer100: valueBoard?.spread?.netEvPer100 ?? null,
      expectedGames:
        spread?.projectedMarginGames !== null && spread?.projectedMarginGames !== undefined && Number.isFinite(Number(spread.projectedMarginGames))
          ? Number(spread.projectedMarginGames)
          : null,
      edgeGames:
        spread?.edgeGames !== null && spread?.edgeGames !== undefined && Number.isFinite(Number(spread.edgeGames))
          ? Number(spread.edgeGames)
          : null,
      confidence: spread?.confidence ?? valueBoard?.spread?.modelPct ?? null,
      grade: spread?.grade || valueBoard?.spread?.valueGrade || 'Needs posted number',
      reason: spread?.reason || marketData?.spreadLean || 'Spread needs projected margin and posted number before grading.'
    })
  }

  const total = derivativeCase?.totalGames
  if (total || valueBoard?.total) {
    matrix.push({
      marketType: 'Total games',
      label: 'O/U games',
      selection: total?.lean || valueBoard?.total?.selection || 'No bet',
      line:
        total?.postedLine !== null && total?.postedLine !== undefined && Number.isFinite(Number(total.postedLine))
          ? Number(total.postedLine)
          : valueBoard?.total?.line ?? null,
      americanOdds:
        total?.lean === 'Over'
          ? total?.overOdds
          : total?.lean === 'Under'
            ? total?.underOdds
            : valueBoard?.total?.americanOdds ?? null,
      modelPct: valueBoard?.total?.modelPct ?? total?.confidence ?? null,
      impliedPct: valueBoard?.total?.impliedPct ?? null,
      edgePct: valueBoard?.total?.edgePct ?? null,
      evPer100: valueBoard?.total?.evPer100 ?? null,
      netEvPer100: valueBoard?.total?.netEvPer100 ?? null,
      expectedGames:
        derivativeCase?.expectedMatchGames !== null && derivativeCase?.expectedMatchGames !== undefined && Number.isFinite(Number(derivativeCase.expectedMatchGames))
          ? Number(derivativeCase.expectedMatchGames)
          : null,
      edgeGames:
        total?.edgeGames !== null && total?.edgeGames !== undefined && Number.isFinite(Number(total.edgeGames))
          ? Number(total.edgeGames)
          : null,
      confidence: total?.confidence ?? valueBoard?.total?.modelPct ?? null,
      grade: total?.grade || valueBoard?.total?.valueGrade || 'Needs posted total',
      reason: total?.reason || 'Total games need expected match games vs the posted line.'
    })
  }

  if (setWinProjections?.length) {
    matrix.push({
      marketType: 'Win a set',
      label: 'Win a set %',
      selection: setWinProjections.map((entry) => `${entry.name} ${entry.confidence}%`).join(' / '),
      rows: setWinProjections,
      confidence: Math.max(...setWinProjections.map((entry) => Number(entry.confidence) || 0)),
      grade: 'Price required',
      reason: 'Use this when ML is fair or taxed. A fair ML can still create a live set-win entry after the other side wins early.'
    })
  }

  const firstSet = derivativeCase?.firstSet || valueBoard?.firstSetTotal
  if (firstSet) {
    matrix.push({
      marketType: 'First-set total games',
      label: '1st set O/U',
      selection: firstSet.lean || firstSet.selection || 'Pass',
      expectedGames: Number.isFinite(Number(firstSet.expectedGames)) ? Number(firstSet.expectedGames) : null,
      confidence: firstSet.confidence ?? null,
      tiebreakRisk: Number.isFinite(Number(firstSet.tiebreakRisk)) ? Number(firstSet.tiebreakRisk) : null,
      earlyBreakRisk: Number.isFinite(Number(firstSet.earlyBreakRisk)) ? Number(firstSet.earlyBreakRisk) : null,
      grade: firstSet.grade || firstSet.valueGrade || (firstSet.confidence >= 58 ? 'Actionable live watch' : 'Thin'),
      reason: firstSet.reason || firstSet.lean || 'First-set entry needs early serve pressure.'
    })
  }

  return matrix
}

const buildGame = (match, rankings, quality, date, fanduelIndex, ensembleValueIndex, ensembleRowsByMatch, derivativeIndex) => {
  const [a, b] = match.players
  const isAtp = /Men/i.test(match.round) || /ATP|Men/i.test(match.raw?.league || '') || !/^[A-Z][a-z]+a\b/.test(a.name)
  const idPrefix = match.raw?.lg?.includes?.('WTA') || /Women/i.test(match.raw?.league || '') ? 'w' : guessTour(a.name, b.name, rankings)
  const tour = idPrefix === 'm' ? 'ATP' : 'WTA'
  const matchId = `rg-${idPrefix}-${slug(a.name)}-${slug(b.name)}-${date}`
  const rankA = getRanking(rankings, a.name)
  const rankB = getRanking(rankings, b.name)
  const qualityA = findQuality(quality, matchId, a.name)
  const qualityB = findQuality(quality, matchId, b.name)
  const scoreA = playerScore(rankA, qualityA, tour === 'ATP')
  const scoreB = playerScore(rankB, qualityB, tour === 'ATP')
  const basePickA = scoreA >= scoreB
  const basePickName = basePickA ? a.name : b.name
  const baseConfidence = pctFromDelta(Math.abs(scoreA - scoreB), tour === 'ATP')
  const ensembleRows = ensembleRowsByMatch.get(matchId) || []
  const ensemblePctFor = (name) => {
    const row = ensembleRows.find((entry) => normalizeName(entry.selection) === normalizeName(name))
    const pct = Number(row?.modelProbability)
    return Number.isFinite(pct) ? pct : null
  }
  const modelPctA = ensemblePctFor(a.name) ?? (basePickA ? baseConfidence : 100 - baseConfidence)
  const modelPctB = ensemblePctFor(b.name) ?? (basePickA ? 100 - baseConfidence : baseConfidence)
  const pickA = modelPctA >= modelPctB
  const pickName = pickA ? a.name : b.name
  const opponentName = pickA ? b.name : a.name
  const confidence = Number((pickA ? modelPctA : modelPctB).toFixed(1))
  const modelSource = ensembleRows.length ? 'Tennis multimodel ensemble' : 'Tennis warehouse score model'
  const modelSplit = basePickName !== pickName
  const volatility = Math.max(28, Math.min(78, Math.round((tour === 'WTA' ? 60 : 50) - Math.abs(scoreA - scoreB) * 0.55)))
  const pickQuality = pickA ? qualityA : qualityB
  const oppQuality = pickA ? qualityB : qualityA
  const weaknessA = buildWeaknessProfile(a.name, qualityA)
  const weaknessB = buildWeaknessProfile(b.name, qualityB)
  const pickWeakness = pickA ? weaknessA : weaknessB
  const oppWeakness = pickA ? weaknessB : weaknessA
  const weaknessEdge = buildWeaknessEdge({ pickName, opponentName, pickQuality, oppQuality, pickWeakness, oppWeakness, confidence, volatility })
  const read = buildRead({ pick: pickName, opponent: opponentName, confidence, volatility, pickQuality, oppQuality, isAtp: tour === 'ATP' })
  const players = [
    { name: a.name, ranking: rankA, qualityName: qualityA?.name || null, profile: formatProfile(rankA, qualityA), modelPct: Number(modelPctA.toFixed(1)), weakness: weaknessA },
    { name: b.name, ranking: rankB, qualityName: qualityB?.name || null, profile: formatProfile(rankB, qualityB), modelPct: Number(modelPctB.toFixed(1)), weakness: weaknessB }
  ]
  const fanduel = findFanDuelLine(fanduelIndex, a.name, b.name)
  const marketData = buildMarketData({ fanduel, players, pickName, weaknessEdge, confidence, totals: read.totals })
  const playersWithMarket = players.map((player) => ({
    ...player,
    market: marketData?.players?.find((entry) => entry.name === player.name) ?? null
  }))
  const derivativeCase = findDerivativeCase(derivativeIndex, matchId, a.name, b.name)
  const setWinProjections = buildSetWinProjections({ players, tour, volatility })
  const totalsProfile = buildTotalsProfile({ tour, confidence, volatility, qualityA, qualityB, weaknessA, weaknessB })
  const valueBoard = buildValueBoard({ marketData, pickName, confidence, volatility, weaknessEdge, setWinProjections, derivativeCase, totalsProfile })
  const bettingMatrix = buildBettingMatrix({ marketData, valueBoard, setWinProjections, derivativeCase, pickName, confidence })
  const ensembleRow = ensembleValueIndex.get(matchId) || null
  const ensembleSelectionIsA = ensembleRow?.selection === a.name
  const ensembleSelectionQuality = ensembleRow ? (ensembleSelectionIsA ? qualityA : qualityB) : null
  const ensembleOpponentQuality = ensembleRow ? (ensembleSelectionIsA ? qualityB : qualityA) : null
  const ensembleSelectionWeakness = ensembleRow ? (ensembleSelectionIsA ? weaknessA : weaknessB) : null
  const ensembleOpponentWeakness = ensembleRow ? (ensembleSelectionIsA ? weaknessB : weaknessA) : null
  const ensembleValueCase = buildEnsembleValueCase({
    row: ensembleRow,
    rawPickName: pickName,
    players: playersWithMarket,
    selectionQuality: ensembleSelectionQuality,
    opponentQuality: ensembleOpponentQuality,
    selectionWeakness: ensembleSelectionWeakness,
    opponentWeakness: ensembleOpponentWeakness
  })
  const tags = [
    'Clay',
    'Roland Garros',
    tour,
    confidence >= 74 && volatility <= 48 ? 'High confidence' : confidence >= 64 ? 'Lean' : 'Watch only',
    marketData?.desk?.edgePct >= 7 ? 'Positive price edge' : confidence >= 74 ? 'Price required' : 'No blind bet',
    tour === 'ATP' ? 'Men more stable' : 'WTA volatility tax',
    volatility >= 65 ? 'High volatility' : 'Controlled volatility'
  ]
  if (modelSplit) tags.splice(4, 0, 'Model split - pass ML')
  return {
    id: matchId,
    eventId: match.eventId,
    tour,
    title: `${a.name} vs ${b.name}`,
    start: timeLabel(match.date),
    startMinutes: startMinutes(match.date),
    court: match.court,
    round: match.round,
    pickName,
    basePickName,
    modelSource,
    modelSplit,
    confidence,
    volatility,
    tags,
    reason: read.reason,
    totals: read.totals,
    weaknessEdge,
    setWinProjections,
    valueBoard,
    totalsProfile,
    derivativeCase,
    bettingMatrix,
    ensembleValueCase,
    marketData,
    h2hUrl: buildTennistonicH2HUrl(a.name, b.name),
    players
  }
}

const guessTour = (aName, bName, rankings) => {
  const aTour = getRanking(rankings, aName)?.tour
  const bTour = getRanking(rankings, bName)?.tour
  return aTour === 'WTA' || bTour === 'WTA' ? 'w' : 'm'
}

const jsString = (value) => JSON.stringify(value, null, 2)

const main = async () => {
  const options = parseArgs()
  const modelCartridge = MODEL_CARTRIDGES[options.model]
  const scoreboard = await readJson(`data-private/reference/tennis/espn-scoreboard-${options.date}.json`)
  const rankings = await readJson('data-private/reference/tennis/player-rankings.json', { players: {} })
  const quality = await readJson(`web/src/lib/day-${options.date}-tennis-opponent-quality.generated.json`, { matches: {} })
  const fanduelLines = await readJson(`data-private/reference/tennis/fanduel-lines-${options.date}.json`, { matches: [] })
  const ensemblePredictions = await readJson(`data-private/predictions/tennis/${options.date}-multimodel-ensemble.json`, { rows: [] })
  const derivativeMarkets = await readJson(`data-private/predictions/tennis/${options.date}-derivative-markets.json`, { rows: [] })
  const ensembleValueIndex = new Map()
  const ensembleRowsByMatch = new Map()
  for (const row of ensemblePredictions.rows || []) {
    if (!ensembleRowsByMatch.has(row.matchId)) ensembleRowsByMatch.set(row.matchId, [])
    ensembleRowsByMatch.get(row.matchId).push(row)
    const current = ensembleValueIndex.get(row.matchId)
    if (!current || Number(row.netEvPer100 ?? -999) > Number(current.netEvPer100 ?? -999)) {
      ensembleValueIndex.set(row.matchId, row)
    }
  }
  const fanduelIndex = buildFanDuelIndex(fanduelLines)
  const derivativeIndex = buildDerivativeIndex(derivativeMarkets.rows || [])
  const games = scoreboard.singles
    .filter((match) => !match.doubles && match.players?.length === 2)
    .filter((match) => !/qualifying/i.test(String(match.round || '')))
    .map((match) => buildGame(match, rankings, quality, options.date, fanduelIndex, ensembleValueIndex, ensembleRowsByMatch, derivativeIndex))
    .sort((left, right) => left.startMinutes - right.startMinutes || left.title.localeCompare(right.title))
  const dayLabel = titleDate(options.date)
  const compact = options.date.replaceAll('-', '')
  let moduleText = `import { createSportsMatchModel } from './sports-model.js'\nimport tennisClayContext from './day-${options.date}-tennis-clay-context.generated.json' with { type: 'json' }\nimport tennisOpponentQualityContext from './day-${options.date}-tennis-opponent-quality.generated.json' with { type: 'json' }\nimport tennisWarehouseContext from './day-${options.date}-tennis-warehouse-context.generated.json' with { type: 'json' }\n\nconst rawTennisGames = ${jsString(games)}\n\nconst normalizePlayerName = (value) => {\n  const normalized = String(value || '').normalize('NFKD').replace(/[\\u0300-\\u036f]/g, '').replace(/[^a-z0-9]+/gi, ' ').trim().toLowerCase()\n  return ({ 'xinyu wang': 'wang xinyu', 'xiyu wang': 'wang xiyu', 'yibing wu': 'wu yibing' })[normalized] || normalized\n}\n\nconst participant = (id, index, role, player) => ({\n  id: \`\${id}:\${index}\`,\n  index,\n  role,\n  name: player.name,\n  detail: player.profile || 'Profile pending',\n  americanOdds: player.market?.odds ?? null,\n  americanLabel: player.market?.americanLabel ?? 'N/A',\n  decimalOdds: player.market?.decimalOdds ?? null,\n  impliedProbability: player.market?.impliedPct ? player.market.impliedPct / 100 : null,\n  impliedProbabilityLabel: player.market?.impliedPct ? \`\${player.market.impliedPct}%\` : 'N/A'\n})\n\nconst buildGame = (raw) => {\n  const market = raw.marketData ?? null\n  const players = raw.players.map((player) => ({ ...player, market: market?.players?.find((entry) => entry.name === player.name) ?? null }))\n  const participants = [participant(raw.id, 0, 'Player 1', players[0]), participant(raw.id, 1, 'Player 2', players[1])]\n  const pickIndex = raw.pickName === raw.players[0].name ? 0 : 1\n  const picked = participants[pickIndex]\n  const opponent = participants[pickIndex === 0 ? 1 : 0]\n  const qualityContext = tennisOpponentQualityContext.matches?.[raw.id] ?? null\n  const clayData = tennisClayContext.matches?.[raw.id] ?? null\n  const warehouseContext = tennisWarehouseContext.matches?.[raw.id] ?? null\n  const marketPlayers = market?.players ?? []\n  const deskMarket = market?.desk ?? null\n  const marketEconomics = market ? {\n    source: market.source,\n    capturedAt: market.capturedAt,\n    eventUrl: market.eventUrl,\n    deskName: raw.pickName,\n    deskPricePct: deskMarket?.impliedPct ?? null,\n    deskEdgePct: deskMarket?.edgePct ?? null,\n    priceAction: market.priceAction,\n    players: marketPlayers.map((player) => ({\n      name: player.name,\n      americanOdds: player.odds,\n      impliedPct: player.impliedPct,\n      modelPct: player.modelPct,\n      edgePct: player.edgePct,\n      priceBand: player.priceBand,\n      grossProfitPct: player.grossProfitPct,\n      grossPayoutMultiple: player.grossPayoutMultiple,\n      centsAtRisk: player.centsAtRisk,\n      centsProfitIfWin: player.centsProfitIfWin\n    }))\n  } : null\n  const predictionMarket = market ? {\n    source: market.source,\n    capturedAt: market.capturedAt,\n    totalVolume: null,\n    players: marketPlayers.map((player) => ({ name: player.name, probabilityPct: player.impliedPct, amount: null, americanOdds: player.odds, edgePct: player.edgePct, priceBand: player.priceBand }))\n  } : null\n  const oddsMarkets = [\n    { label: 'Model fair', book: 'Tennis warehouse model', value: raw.players.map((player) => \`\${player.name} \${player.modelPct}%\`).join(' / ') },\n    market ? { label: 'FanDuel moneyline', book: market.source, value: market.mlValue } : null,\n    market?.spread ? { label: 'Game handicap', book: market.source, value: market.spreadValue } : null,\n    market?.total ? { label: 'Total games', book: market.source, value: market.totalValue } : null\n  ].filter(Boolean)\n  return createSportsMatchModel({\n    id: raw.id,\n    eventId: raw.eventId,\n    league: 'Tennis',\n    start: raw.start,\n    startMinutes: raw.startMinutes,\n    title: raw.title,\n    stage: \`Roland Garros \${raw.tour === 'ATP' ? 'Men' : 'Women'} | \${raw.round || 'Round 2'}\`,\n    spotlight: raw.tags.includes('High confidence'),\n    confidence: raw.confidence,\n    volatility: raw.volatility,\n    tags: raw.tags,\n    matchup: players.map((player, index) => ({ side: index === 0 ? 'Player 1' : 'Player 2', name: player.name, displayName: player.name, detail: player.profile || 'Profile pending' })),\n    summary: \`\${raw.pickName} is the desk side. \${raw.reason}\`,\n    factors: [\n      raw.reason,\n      market?.noVigNote,\n      raw.weaknessEdge?.gameFlow,\n      raw.weaknessEdge?.liveTrigger,\n      raw.totals,\n      'May 27 lesson applied: favorites need proof from recent hold, opponent strength, payout, and a visible weakness path.',\n      market ? market.marketNote : 'No FanDuel line is stored for this match yet, so market edge is model-vs-fair only until a price is captured.'\n    ].filter(Boolean),\n    lean: market?.priceAction ? \`Lean \${raw.pickName}; \${market.priceAction}\` : \`Lean \${raw.pickName}; pass if the market price removes payout.\`,\n    swing: \`Risk: \${raw.tour === 'WTA' ? 'best-of-three volatility and break clusters' : 'best-of-five set extension and tiebreak variance'}.\`,\n    swingFactor: \`Risk: \${raw.tour === 'WTA' ? 'best-of-three volatility and break clusters' : 'best-of-five set extension and tiebreak variance'}.\`,\n    odds: {\n      participantOrder: [0, 1],\n      markets: oddsMarkets,\n      note: market?.marketNote || 'Market price not captured yet. Use this as fair-value context, not a bet ticket.',\n      provider: market?.source || 'Tennis warehouse model'\n    },\n    tennisContext: {\n      surface: 'Clay',\n      court: raw.court,\n      h2hLeader: '',\n      fatigueFlag: false,\n      liveDog: false,\n      weaknessEdge: raw.weaknessEdge,\n      warehouseContext,\n      sofascoreData: warehouseContext,\n      players: players.map((player) => ({\n        name: player.name,\n        rank: player.ranking?.rank ?? null,\n        label: player.name,\n        form: null,\n        boardPct: player.modelPct,\n        decimalOdds: player.market?.decimalOdds ?? null,\n        marketLabel: player.market ? \`\${player.market.americanLabel} / \${player.market.impliedPct}% implied\` : \`Model fair \${player.modelPct}%\`,\n        clayLine: player.profile || 'Profile pending',\n        weakness: player.weakness,\n        warehouseStats: warehouseContext?.players?.find((entry) => normalizePlayerName(entry.name) === normalizePlayerName(player.name)) ?? null,\n        record2026: '',\n        notes: player.name === raw.pickName ? \`Pick: model \${raw.confidence}%\` : \`Opponent case: model \${100 - raw.confidence}%\`,\n        matchupNote: player.name === raw.pickName ? \`Why pick: \${raw.reason}\` : 'Upset path: needs early scoreboard pressure or a market price that pays for volatility.'\n      })),\n      comparisonRows: [\n        { label: 'Model pick', metric: 'Fair win split', leftScore: raw.players[0].modelPct, rightScore: raw.players[1].modelPct, leftLabel: raw.players[0].name, rightLabel: raw.players[1].name, winner: raw.pickName },\n        market ? { label: 'FanDuel moneyline', metric: 'Implied price', leftScore: marketPlayers.find((player) => player.name === raw.players[0].name)?.impliedPct ?? 0, rightScore: marketPlayers.find((player) => player.name === raw.players[1].name)?.impliedPct ?? 0, leftLabel: raw.players[0].name, rightLabel: raw.players[1].name, winner: market.priceAction } : null,\n        { label: 'Weakness', metric: 'Lower is cleaner', leftScore: raw.players[0].weakness?.weaknessScore ?? 0, rightScore: raw.players[1].weakness?.weaknessScore ?? 0, leftLabel: raw.players[0].name, rightLabel: raw.players[1].name, winner: raw.weaknessEdge?.edgeType || 'No clear weakness edge' },\n        { label: 'Volatility', metric: 'Lower is cleaner', leftScore: raw.volatility, rightScore: 100 - raw.volatility, leftLabel: 'Risk', rightLabel: 'Stability', winner: raw.volatility <= 55 ? 'Stable enough' : 'Pass-first' }\n      ].filter(Boolean),\n      predictionMarket,\n      valueBoard: raw.valueBoard,\n      projection: { projectedWinner: raw.pickName, projectedSetLine: raw.tour === 'ATP' ? '3-1/3-2 range' : '2-0/2-1 range', setWinProjections: raw.setWinProjections, totalGames: market?.total?.line ?? null, straightSetsProbability: raw.tour === 'ATP' ? null : Math.max(48, Math.min(68, raw.confidence - 8)), upsetRisk: 100 - raw.confidence, overview: raw.weaknessEdge?.gameFlow || raw.reason, fantasy: [] },\n      tradePlan: { laneLabel: raw.tags.includes('High confidence') ? 'High confidence, price required' : market?.priceAction || 'Pass-first', summary: raw.weaknessEdge?.gameFlow || raw.totals, trigger: raw.weaknessEdge?.liveTrigger, headline: raw.weaknessEdge?.edgeType, exit: market?.spreadLean || raw.weaknessEdge?.spreadRead, tone: raw.tags.includes('High confidence') ? 'accent' : 'warning' },\n      derivativeMarkets: [\n        { label: 'ML', value: market ? \`\${raw.pickName} \${deskMarket?.americanLabel || ''}; \${market.noVigNote}\` : 'Need market price', lean: market?.priceAction || raw.weaknessEdge?.edgeType || 'Fair only', confidence: raw.confidence, ...(raw.valueBoard?.ml || {}), tone: market?.desk?.edgePct >= 7 ? 'accent' : market?.desk?.edgePct <= -4 ? 'warning' : 'neutral', reason: market?.marketNote || raw.weaknessEdge?.gameFlow || raw.reason },\n        { label: 'Win a set', value: raw.setWinProjections?.map((entry) => entry.name + ' ' + entry.confidence + '%').join(' / ') || 'No set projection', lean: raw.setWinProjections?.find((entry) => entry.name !== raw.pickName)?.label || 'Set-win path', confidence: Math.max(...(raw.setWinProjections || []).map((entry) => Number(entry.confidence) || 0), 0), setWinRows: raw.valueBoard?.setWin || [], valueGrade: 'Needs posted price', tone: raw.tour === 'ATP' ? 'accent' : 'neutral', reason: raw.tour === 'ATP' ? 'Best-of-five gives the non-ML side more room to win a set; use this to separate upset risk from match-winner confidence.' : 'Best-of-three set-win confidence is more fragile; early service holds matter more.' },\n        { label: 'Spread', value: market?.spreadValue || 'Need posted game spread', lean: market?.spreadLean || raw.weaknessEdge?.spreadRead || 'Need number', confidence: Math.max(50, raw.confidence - 6), ...(raw.valueBoard?.spread || {}), tone: raw.weaknessEdge?.edgeType === 'Weakness edge' ? 'accent' : 'neutral', reason: raw.weaknessEdge?.liveTrigger || 'Wait for first service cycle.' },\n        { label: 'O/U', value: market?.totalValue || 'Need posted total', lean: market?.totalLean || raw.weaknessEdge?.totalRead || raw.totals, confidence: Math.max(50, raw.confidence - 8), ...(raw.valueBoard?.total || {}), tone: raw.totals.includes('over') || raw.weaknessEdge?.totalRead?.includes('breaks') ? 'accent' : 'neutral', reason: raw.totals }\n      ],\n      marketEconomics,\n      clayMatchupData: clayData,\n      opponentQualityData: qualityContext,\n      researchLinks: [{ label: 'ESPN scoreboard', url: 'https://www.espn.com/tennis/scoreboard/_/date/${compact}' }, { label: 'Tennistonic H2H', url: raw.h2hUrl }, ...(market?.eventUrl ? [{ label: 'FanDuel event', url: market.eventUrl }] : [])],\n      formEdgeName: raw.pickName\n    },\n    participants,\n    moneyline: market ? { available: true, label: 'FanDuel moneyline', provider: market.source, participants } : { available: false, label: 'Moneyline', provider: 'Tennis warehouse model', participants: [] },\n    analysis: { available: true, participantId: picked.id, participant: picked, opponent, lean: \`Lean \${raw.pickName}\`, rationale: raw.reason, confidence: raw.confidence, volatility: raw.volatility, recommendationScore: raw.confidence - Math.round(raw.volatility / 3) + Math.round(Math.max(-8, Math.min(8, deskMarket?.edgePct ?? 0))), tier: raw.tags.includes('High confidence')  ? 'High confidence' : raw.tags.includes('Lean') ? 'Lean' : 'Watch', sourceLabel: market?.source || 'Tennis warehouse model', modelEdge: deskMarket?.edgePct ?? 0, modelEdgeLabel: deskMarket ? \`\${deskMarket.edgePct > 0 ? '+' : ''}\${deskMarket.edgePct} pts vs FanDuel implied\` : 'Fair value only until market price is captured', marketProbability: deskMarket?.impliedPct ? deskMarket.impliedPct / 100 : null, marketProbabilityLabel: deskMarket?.impliedPct ? \`\${deskMarket.impliedPct}% FanDuel implied\` : 'No market', inputs: [], inputsUsed: market ? 4 : 3, volatilityNotes: [] }\n  }, { structuredAnalysis: true })\n}\n\nconst matches = rawTennisGames.map(buildGame)\n\nexport const tennisModelCartridge = ${jsString(modelCartridge)}\nexport const slateMeta = { title: '${dayLabel} Tennis Desk', date: '${dayLabel}', isoDate: '${options.date}', timeZone: 'America/Los_Angeles', modelCartridge: tennisModelCartridge, subtitle: 'Singles-only Roland Garros main-draw slate with weakness-edge, game-flow gates, and sportsbook/market lines where captured.', notes: ['No doubles included.', 'FanDuel ML, game handicap, and total-games lines are attached where the sportsbook board exposes a matching singles event.', '${dayLabel} uses live rank, clay record, opponent-adjusted recent form, and warehouse service rows where joined.'] }\nexport const filters = ['All', 'Tennis']\nexport const oddsMeta = { provider: 'FanDuel Sportsbook + Tennis warehouse model', snapshot: '${dayLabel} Roland Garros desk', note: 'FanDuel lines are stored for priced matches; very expensive favorites are marked as low-payout or pass-first instead of automatic bets.' }\nexport const sources = [{ label: 'ESPN tennis scoreboard', url: 'https://www.espn.com/tennis/scoreboard/_/date/${compact}' }, { label: 'Live Tennis rankings warehouse', url: 'https://live-tennis.eu/' }, { label: 'FanDuel sportsbook tennis', url: 'https://sportsbook.fanduel.com/tennis' }]\nexport const games = matches.sort((left, right) => left.startMinutes - right.startMinutes || left.title.localeCompare(right.title))\n`

  moduleText = moduleText.replace(
    '      valueBoard: raw.valueBoard,\n',
    '      bettingMatrix: raw.bettingMatrix,\n      derivativeMarketCase: raw.derivativeCase,\n      valueBoard: raw.valueBoard,\n      ensembleValueCase: raw.ensembleValueCase,\n'
  )
  moduleText = moduleText.replace(
    "    market?.total ? { label: 'Total games', book: market.source, value: market.totalValue } : null\n  ].filter(Boolean)",
    "    market?.total ? { label: 'Total games', book: market.source, value: market.totalValue } : null,\n    market?.firstSetTotal ? { label: '1st set total games', book: market.source, value: market.firstSetTotalValue } : null\n  ].filter(Boolean)"
  )
  moduleText = moduleText.replace(
    "        { label: 'O/U', value: market?.totalValue || 'Need posted total', lean: market?.totalLean || raw.weaknessEdge?.totalRead || raw.totals, confidence: Math.max(50, raw.confidence - 8), ...(raw.valueBoard?.total || {}), tone: raw.totals.includes('over') || raw.weaknessEdge?.totalRead?.includes('breaks') ? 'accent' : 'neutral', reason: raw.totals }\n      ],",
    "        { label: 'O/U', value: market?.totalValue || 'Need posted total', lean: raw.valueBoard?.total?.selection || market?.totalLean || raw.weaknessEdge?.totalRead || raw.totals, confidence: raw.valueBoard?.total?.modelPct ?? Math.max(50, raw.confidence - 8), ...(raw.valueBoard?.total || {}), tone: raw.valueBoard?.total?.selection === 'Over' || raw.valueBoard?.total?.selection === 'Under' ? 'accent' : 'neutral', reason: raw.valueBoard?.total?.reason || raw.totals },\n        { label: '1st set O/U', value: raw.valueBoard?.firstSetTotal?.line ? `Line ${raw.valueBoard.firstSetTotal.line}` : 'Need posted first-set total', lean: raw.valueBoard?.firstSetTotal?.selection || raw.valueBoard?.firstSetTotal?.lean || 'Price required', confidence: raw.valueBoard?.firstSetTotal?.confidence ?? Math.max(50, raw.confidence - 10), ...(raw.valueBoard?.firstSetTotal || {}), tone: raw.valueBoard?.firstSetTotal?.confidence >= 58 ? 'accent' : 'neutral', reason: raw.valueBoard?.firstSetTotal?.reason || 'Use expected first-set games against the posted 1st-set total.' }\n      ],"
  )
  moduleText = moduleText.replace(
    "    summary: `${raw.pickName} is the desk side. ${raw.reason}`,",
    "    summary: `Our model pick: ${raw.pickName}. ${raw.reason}`,"
  )
  moduleText = moduleText.replace(
    "      raw.totals,\n      'May 27 lesson applied: favorites need proof from recent hold, opponent strength, payout, and a visible weakness path.',",
    "      raw.totals,\n      raw.modelSplit ? `Model split warning: the older score model preferred ${raw.basePickName}, but the multimodel ensemble makes ${raw.pickName} the official pick. Treat ML as pass-first unless the price and live state agree.` : null,\n      'May 27 lesson applied: favorites need proof from recent hold, opponent strength, payout, and a visible weakness path.',"
  )
  moduleText = moduleText.replace(
    "sourceLabel: market?.source || 'Tennis warehouse model'",
    "sourceLabel: raw.modelSource || 'Tennis warehouse model'"
  )
  moduleText = moduleText.replace(
    "tier: raw.tags.includes('High confidence')  ? 'High confidence' : raw.tags.includes('Lean') ? 'Lean' : 'Watch'",
    "tier: raw.modelSplit ? 'Model split / pass ML' : raw.tags.includes('High confidence')  ? 'High confidence' : raw.tags.includes('Lean') ? 'Lean' : 'Watch'"
  )

  await fs.mkdir(path.dirname(path.resolve(ROOT, options.output)), { recursive: true })
  await fs.writeFile(path.resolve(ROOT, options.output), moduleText)
  await fs.mkdir(path.dirname(path.resolve(ROOT, options.predictionsOutput)), { recursive: true })
  await fs.writeFile(
    path.resolve(ROOT, options.predictionsOutput),
    `${JSON.stringify(
      {
        date: options.date,
        modelCartridge,
        source: 'ESPN scoreboard + live rankings + Tennistonic/Flashscore enrichment when available',
        totalSingles: games.length,
        picks: games.map((game, index) => ({
          rank: index + 1,
          match: game.title,
          format: game.tour,
          court: game.court,
          start: game.start,
          pick: game.pickName,
          confidence: game.confidence,
          volatility: game.volatility,
          tier: game.tags.includes('High confidence')  ? 'High confidence' : game.tags.includes('Lean') ? 'Lean' : 'Watch',
          rationale: game.reason,
          weaknessEdge: game.weaknessEdge,
          totals: game.totals,
          derivativeMarketCase: game.derivativeCase,
          bettingMatrix: game.bettingMatrix,
          market: game.marketData
            ? {
                source: game.marketData.source,
                capturedAt: game.marketData.capturedAt,
                moneyline: game.marketData.players.map((player) => ({
                  name: player.name,
                  americanOdds: player.odds,
                  impliedPct: player.impliedPct,
                  modelPct: player.modelPct,
                  edgePct: player.edgePct,
                  grossProfitPct: player.grossProfitPct,
                  priceBand: player.priceBand
                })),
                spread: game.marketData.spreadValue,
                totalGames: game.marketData.totalValue,
                priceAction: game.marketData.priceAction
              }
            : null
        }))
      },
      null,
      2
    )}\n`
  )
  console.log(`Wrote ${games.length} tennis matches to ${options.output}`)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
