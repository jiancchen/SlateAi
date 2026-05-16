import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')

const deskToOfficialTeam = {
  Nationals: 'Washington Nationals',
  Marlins: 'Miami Marlins',
  Athletics: 'Athletics',
  Orioles: 'Baltimore Orioles',
  Rays: 'Tampa Bay Rays',
  'Red Sox': 'Boston Red Sox',
  Rockies: 'Colorado Rockies',
  Phillies: 'Philadelphia Phillies',
  Angels: 'Los Angeles Angels',
  'Blue Jays': 'Toronto Blue Jays',
  Astros: 'Houston Astros',
  Reds: 'Cincinnati Reds',
  Twins: 'Minnesota Twins',
  Guardians: 'Cleveland Guardians',
  Mariners: 'Seattle Mariners',
  'White Sox': 'Chicago White Sox',
  Yankees: 'New York Yankees',
  Brewers: 'Milwaukee Brewers',
  Cubs: 'Chicago Cubs',
  Rangers: 'Texas Rangers',
  Pirates: 'Pittsburgh Pirates',
  Giants: 'San Francisco Giants',
  Braves: 'Atlanta Braves',
  Dodgers: 'Los Angeles Dodgers',
  Cardinals: 'St. Louis Cardinals',
  Padres: 'San Diego Padres',
  Mets: 'New York Mets',
  'D-backs': 'Arizona Diamondbacks',
  Diamondbacks: 'Arizona Diamondbacks',
  Royals: 'Kansas City Royals',
  Tigers: 'Detroit Tigers'
}

const officialToDeskTeam = Object.fromEntries(
  Object.entries(deskToOfficialTeam).map(([desk, official]) => [official, desk])
)

const clamp = (value, min, max) => Math.min(max, Math.max(min, value))
const roundToTenths = (value) => Number(value.toFixed(1))
const roundToHundredths = (value) => Number(value.toFixed(2))
const average = (values = []) => {
  const numericValues = values.filter((value) => Number.isFinite(value))
  return numericValues.length ? numericValues.reduce((sum, value) => sum + value, 0) / numericValues.length : null
}

const parseNumber = (value, fallback = null) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

const parseBaseballInnings = (value = 0) => {
  const stringValue = `${value}`.trim()
  const match = stringValue.match(/^(\d+)(?:\.(\d))?$/)

  if (!match) return Number(stringValue) || 0

  const wholeInnings = Number(match[1])
  const partialOuts = Number(match[2] || 0)
  return wholeInnings + (partialOuts === 1 ? 1 / 3 : partialOuts === 2 ? 2 / 3 : 0)
}

const formatSigned = (value, digits = 1) => {
  if (!Number.isFinite(value)) return '0.0'
  return `${value >= 0 ? '+' : ''}${value.toFixed(digits)}`
}

const formatRate = (value, digits = 3) => {
  if (!Number.isFinite(value)) return 'n/a'
  return value.toFixed(digits).replace(/^0/, '')
}

const toSlug = (value = '') =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

const parseArgs = () => {
  const args = process.argv.slice(2)
  const options = {
    date: null,
    batchSize: 24,
    recentWindowDays: 7,
    out: null,
    moduleOut: null
  }

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index]
    if (arg === '--date') options.date = args[++index]
    else if (arg === '--batch-size') options.batchSize = Number(args[++index])
    else if (arg === '--recent-window-days') options.recentWindowDays = Number(args[++index])
    else if (arg === '--out') options.out = args[++index]
    else if (arg === '--module-out') options.moduleOut = args[++index]
  }

  if (!options.date) {
    throw new Error('Missing required --date argument, expected YYYY-MM-DD.')
  }

  options.out ||= path.join(rootDir, 'data', 'lineups', 'mlb', `${options.date}-lineup-board.json`)
  options.moduleOut ||= path.join(rootDir, 'src', 'lib', `day-${options.date}-lineups.js`)
  return options
}

const shiftDate = (isoDate, deltaDays) => {
  const date = new Date(`${isoDate}T12:00:00Z`)
  date.setUTCDate(date.getUTCDate() + deltaDays)
  return date.toISOString().slice(0, 10)
}

const fetchJson = async (url) => {
  const response = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0' }
  })

  if (!response.ok) {
    throw new Error(`Failed request ${response.status} for ${url}`)
  }

  return response.json()
}

const loadRawGames = async (date) => {
  const modulePath = pathToFileURL(path.join(rootDir, 'src', 'lib', `day-${date}-data.js`)).href
  const dayData = await import(modulePath)
  return dayData.rawGames
}

const normalizePitchHand = (value = '') => {
  const normalized = `${value}`.trim().toUpperCase()
  if (normalized.startsWith('L')) return 'L'
  if (normalized.startsWith('R')) return 'R'
  return ''
}

const classifyPitcherType = (starter = {}) => {
  const innings = Number(starter.inningsFloat)
  const kPerNine = Number(starter.kPerNine)
  const bbPerNine = Number(starter.bbPerNine)
  const hitsPerNine = Number(starter.hitsPerNine)
  const era = Number(starter.era)
  const whip = Number(starter.whip)

  if (!Number.isFinite(innings) || innings < 18 || !Number.isFinite(era)) return 'Unknown sample'
  if (Number.isFinite(kPerNine) && kPerNine >= 10.2 && Number.isFinite(whip) && whip <= 1.18 && era <= 3.8) return 'Power'
  if (Number.isFinite(kPerNine) && kPerNine >= 9.6 && ((Number.isFinite(bbPerNine) && bbPerNine >= 3.4) || (Number.isFinite(whip) && whip >= 1.28))) return 'Volatile bat-misser'
  if (Number.isFinite(hitsPerNine) && hitsPerNine <= 7.3 && Number.isFinite(whip) && whip <= 1.18) return 'Contact suppressor'
  if (Number.isFinite(kPerNine) && kPerNine <= 7.1 && Number.isFinite(whip) && whip <= 1.22 && era <= 4.1) return 'Craft'
  if ((Number.isFinite(hitsPerNine) && hitsPerNine >= 9.3) || (Number.isFinite(whip) && whip >= 1.4)) return 'Traffic-risk'
  if (Number.isFinite(bbPerNine) && bbPerNine <= 2.2 && Number.isFinite(kPerNine) && kPerNine >= 7.1) return 'Strike-throwing'
  return 'Balanced'
}

const buildPitcherProfile = (starterContext = null) => {
  if (!starterContext) return null

  const handedness = normalizePitchHand(starterContext.pitchHand)
  const strikeouts = Number(starterContext.strikeOuts ?? 0)
  const wins = Number(starterContext.wins ?? 0)
  const losses = Number(starterContext.losses ?? 0)
  const inningsFloat = parseBaseballInnings(starterContext.inningsPitched ?? 0)
  const walks = Number(starterContext.walks)
  const hitsAllowed = Number(starterContext.hitsAllowed)
  const homeRunsAllowed = Number(starterContext.homeRunsAllowed)
  const kPerNine = inningsFloat > 0 ? (strikeouts / inningsFloat) * 9 : null
  const bbPerNine = inningsFloat > 0 && Number.isFinite(walks) ? (walks / inningsFloat) * 9 : null
  const hitsPerNine = inningsFloat > 0 && Number.isFinite(hitsAllowed) ? (hitsAllowed / inningsFloat) * 9 : null
  const whip = parseNumber(starterContext.whip)
  const era = parseNumber(starterContext.era)

  return {
    fullName: starterContext.fullName || '',
    handedness,
    wins,
    losses,
    era,
    whip,
    inningsFloat,
    strikeouts,
    walks: Number.isFinite(walks) ? walks : null,
    hitsAllowed: Number.isFinite(hitsAllowed) ? hitsAllowed : null,
    homeRunsAllowed: Number.isFinite(homeRunsAllowed) ? homeRunsAllowed : null,
    kPerNine,
    bbPerNine,
    hitsPerNine,
    profileType: classifyPitcherType({
      inningsFloat,
      kPerNine,
      bbPerNine,
      hitsPerNine,
      era,
      whip
    })
  }
}

const batch = (items, size) => {
  const groups = []
  for (let index = 0; index < items.length; index += size) {
    groups.push(items.slice(index, index + size))
  }
  return groups
}

const buildScheduleMap = (scheduleDates = []) => {
  const scheduleMap = new Map()

  for (const dateEntry of scheduleDates) {
    for (const game of dateEntry.games || []) {
      const awayOfficial = game.teams?.away?.team?.name
      const homeOfficial = game.teams?.home?.team?.name
      if (!awayOfficial || !homeOfficial) continue

      const key = `${awayOfficial} @ ${homeOfficial}`
      scheduleMap.set(key, game)
    }
  }

  return scheduleMap
}

const aggregateStatSplits = (splits = []) => {
  if (!Array.isArray(splits) || !splits.length) return null

  const aggregate = {
    gamesPlayed: 0,
    hits: 0,
    atBats: 0,
    plateAppearances: 0,
    homeRuns: 0,
    strikeOuts: 0,
    baseOnBalls: 0,
    hitByPitch: 0,
    totalBases: 0,
    sacFlies: 0
  }

  for (const split of splits) {
    const stat = split?.stat || {}
    aggregate.gamesPlayed += Number(stat.gamesPlayed || 0)
    aggregate.hits += Number(stat.hits || 0)
    aggregate.atBats += Number(stat.atBats || 0)
    aggregate.plateAppearances += Number(stat.plateAppearances || 0)
    aggregate.homeRuns += Number(stat.homeRuns || 0)
    aggregate.strikeOuts += Number(stat.strikeOuts || 0)
    aggregate.baseOnBalls += Number(stat.baseOnBalls || 0)
    aggregate.hitByPitch += Number(stat.hitByPitch || 0)
    aggregate.totalBases += Number(stat.totalBases || 0)
    aggregate.sacFlies += Number(stat.sacFlies || 0)
  }

  const denominatorForObp =
    aggregate.atBats + aggregate.baseOnBalls + aggregate.hitByPitch + aggregate.sacFlies
  const avg = aggregate.atBats > 0 ? aggregate.hits / aggregate.atBats : null
  const obp =
    denominatorForObp > 0
      ? (aggregate.hits + aggregate.baseOnBalls + aggregate.hitByPitch) / denominatorForObp
      : null
  const slg = aggregate.atBats > 0 ? aggregate.totalBases / aggregate.atBats : null
  const ops = Number.isFinite(obp) && Number.isFinite(slg) ? obp + slg : null
  const plateAppearances =
    aggregate.plateAppearances || aggregate.atBats + aggregate.baseOnBalls + aggregate.hitByPitch + aggregate.sacFlies

  return {
    gamesPlayed: aggregate.gamesPlayed,
    hits: aggregate.hits,
    atBats: aggregate.atBats,
    plateAppearances,
    homeRuns: aggregate.homeRuns,
    strikeOuts: aggregate.strikeOuts,
    baseOnBalls: aggregate.baseOnBalls,
    hitByPitch: aggregate.hitByPitch,
    totalBases: aggregate.totalBases,
    sacFlies: aggregate.sacFlies,
    avg,
    obp,
    slg,
    ops,
    hitsPerGame: aggregate.gamesPlayed > 0 ? aggregate.hits / aggregate.gamesPlayed : null,
    hrRate: plateAppearances > 0 ? aggregate.homeRuns / plateAppearances : null,
    kRate: plateAppearances > 0 ? aggregate.strikeOuts / plateAppearances : null,
    bbRate: plateAppearances > 0 ? aggregate.baseOnBalls / plateAppearances : null
  }
}

const fetchPlayerHydrateMap = async (playerIds, query) => {
  const output = new Map()

  for (const group of batch(playerIds, 24)) {
    if (!group.length) continue
    const personIds = group.join(',')
    const url = `https://statsapi.mlb.com/api/v1/people?personIds=${personIds}&hydrate=${query}`
    const payload = await fetchJson(url)

    for (const person of payload.people || []) {
      output.set(person.id, person)
    }
  }

  return output
}

const getStatRecord = (peopleMap, playerId) => {
  const person = peopleMap.get(playerId)
  if (!person) return null
  return aggregateStatSplits(person.stats?.[0]?.splits || [])
}

const buildBatterHandCode = (person = {}) => person?.batSide?.code || ''

const buildSeasonLine = (stats = null) => {
  if (!stats || !Number.isFinite(stats.ops)) return 'Season line unavailable'
  return `${formatRate(stats.avg)} AVG | ${formatRate(stats.ops)} OPS | ${stats.hits} H | ${stats.homeRuns} HR`
}

const buildRecentLine = (stats = null) => {
  if (!stats || !Number.isFinite(stats.ops)) return 'Recent window unavailable'
  return `${stats.gamesPlayed || 0}g: ${formatRate(stats.avg)} AVG | ${formatRate(stats.ops)} OPS | ${stats.hits} H | ${stats.homeRuns} HR`
}

const buildSplitLine = (stats = null, pitcherHand = '') => {
  if (!stats || !Number.isFinite(stats.ops)) return `No clean split stored vs ${pitcherHand || '?'}HP`
  return `vs ${pitcherHand || '?'}HP: ${formatRate(stats.avg)} AVG | ${formatRate(stats.ops)} OPS | ${stats.homeRuns} HR`
}

const buildPitchStyleAdjustment = ({
  pitcherProfileType,
  contactScore,
  powerScore,
  patienceScore,
  splitScore,
  seasonKRate,
  splitKRate,
  recentDelta
}) => {
  let adjustment = 0
  let note = 'neutral lane'

  switch (pitcherProfileType) {
    case 'Traffic-risk':
      adjustment += (patienceScore - 50) / 18 + (powerScore - 50) / 24 + 0.6
      note = 'traffic-risk lane'
      break
    case 'Volatile bat-misser':
      adjustment += (patienceScore - 50) / 22 - ((splitKRate ?? seasonKRate ?? 0.22) - 0.22) * 18 + (splitScore - 50) / 35
      note = 'whiff-variance lane'
      break
    case 'Contact suppressor':
      adjustment += (powerScore - 60) / 35 - 1.4 - Math.max(0, 58 - contactScore) / 20
      note = 'contact-suppressor lane'
      break
    case 'Power':
      adjustment += (powerScore - 55) / 24 - ((splitKRate ?? seasonKRate ?? 0.24) - 0.24) * 12
      note = 'power-arm lane'
      break
    case 'Craft':
      adjustment += (splitScore - 50) / 24 + (contactScore - 50) / 28 + (patienceScore - 50) / 40
      note = 'craft lane'
      break
    case 'Strike-throwing':
      adjustment += (contactScore - 50) / 24 + (powerScore - 50) / 34
      note = 'in-zone lane'
      break
    default:
      adjustment += recentDelta * 8
      break
  }

  return {
    adjustment,
    note
  }
}

const buildPlayerLineupEntry = ({
  lineupPlayer,
  seasonStats,
  recentStats,
  splitStats,
  opposingPitcher
}) => {
  const seasonOps = Number.isFinite(seasonStats?.ops) ? seasonStats.ops : 0.72
  const recentOps =
    Number.isFinite(recentStats?.ops) && Number(recentStats?.plateAppearances || 0) >= 6
      ? recentStats.ops
      : seasonOps
  const splitOps =
    Number.isFinite(splitStats?.ops) && Number(splitStats?.plateAppearances || 0) >= 10
      ? splitStats.ops
      : seasonOps
  const seasonAvg = Number.isFinite(seasonStats?.avg) ? seasonStats.avg : 0.245
  const recentAvg = Number.isFinite(recentStats?.avg) ? recentStats.avg : seasonAvg
  const splitAvg = Number.isFinite(splitStats?.avg) ? splitStats.avg : seasonAvg
  const seasonHrRate = Number.isFinite(seasonStats?.hrRate) ? seasonStats.hrRate : 0.03
  const recentHrRate = Number.isFinite(recentStats?.hrRate) ? recentStats.hrRate : seasonHrRate
  const splitHrRate = Number.isFinite(splitStats?.hrRate) ? splitStats.hrRate : seasonHrRate
  const seasonKRate = Number.isFinite(seasonStats?.kRate) ? seasonStats.kRate : 0.22
  const splitKRate = Number.isFinite(splitStats?.kRate) ? splitStats.kRate : seasonKRate
  const seasonBbRate = Number.isFinite(seasonStats?.bbRate) ? seasonStats.bbRate : 0.08
  const recentDelta = recentOps - seasonOps
  const splitDelta = splitOps - seasonOps
  const slot = Number(lineupPlayer.slot || 9)

  const powerScore = clamp(
    50 + (Number(seasonStats?.slg || 0.39) - 0.39) * 110 + (seasonHrRate - 0.035) * 700 + (splitHrRate - seasonHrRate) * 420,
    18,
    92
  )
  const contactScore = clamp(
    50 +
      (seasonAvg - 0.245) * 150 +
      (splitAvg - seasonAvg) * 90 -
      (seasonKRate - 0.22) * 120 +
      ((seasonStats?.hitsPerGame || 0.8) - 0.8) * 18,
    18,
    92
  )
  const patienceScore = clamp(
    50 + (seasonBbRate - 0.08) * 240 + (((seasonStats?.obp || 0.315) - seasonAvg) - 0.07) * 180,
    18,
    92
  )
  const formScore = clamp(
    50 + recentDelta * 110 + (recentAvg - seasonAvg) * 200 + (recentHrRate - seasonHrRate) * 1200,
    18,
    92
  )
  const splitScore = clamp(
    50 + splitDelta * 125 + (splitAvg - seasonAvg) * 180 + (splitHrRate - seasonHrRate) * 1000,
    18,
    92
  )
  const varianceScore = clamp(
    42 + Math.abs(recentDelta) * 170 + Math.abs(splitDelta) * 140 + Math.max(powerScore - contactScore, 0) * 0.38 + (seasonKRate - 0.22) * 110,
    18,
    92
  )
  const handednessEdge =
    lineupPlayer.bats === 'S'
      ? 0.7
      : lineupPlayer.bats && opposingPitcher?.handedness && lineupPlayer.bats !== opposingPitcher.handedness
        ? 1.1
        : 0
  const slotBonus = slot <= 2 ? 1.2 : slot <= 4 ? 0.8 : slot <= 6 ? 0.2 : -0.3
  const pitchStyleAdjustment = buildPitchStyleAdjustment({
    pitcherProfileType: opposingPitcher?.profileType,
    contactScore,
    powerScore,
    patienceScore,
    splitScore,
    seasonKRate,
    splitKRate,
    recentDelta
  })
  const matchupGrade = clamp(
    (seasonOps - 0.72) * 18 +
      recentDelta * 28 +
      splitDelta * 22 +
      handednessEdge +
      slotBonus +
      pitchStyleAdjustment.adjustment,
    -8,
    10
  )
  const matchupScore = clamp(50 + matchupGrade * 4.2 + (formScore - 50) * 0.12 + (splitScore - 50) * 0.1, 18, 94)

  const tags = []
  if (matchupGrade >= 5 || (powerScore >= 70 && formScore >= 54)) tags.push('carry')
  if (formScore >= 61) tags.push('heater')
  if (splitScore >= 58 || handednessEdge > 0) tags.push('split edge')
  if (contactScore >= 63) tags.push('traffic')
  if ((opposingPitcher?.profileType === 'Power' || opposingPitcher?.profileType === 'Volatile bat-misser') && varianceScore >= 64 && seasonKRate >= 0.24) {
    tags.push('whiff risk')
  }
  if (formScore <= 42 || matchupGrade <= -1.4) tags.push('cold')

  const primaryTag = tags[0] || (matchupGrade >= 1.5 ? 'live' : matchupGrade <= -1 ? 'suppressed' : 'thin')
  const summary = [
    buildSeasonLine(seasonStats),
    buildRecentLine(recentStats),
    buildSplitLine(splitStats, opposingPitcher?.handedness),
    `${formatSigned(matchupGrade)} matchup grade in a ${pitchStyleAdjustment.note}`
  ].join(' | ')

  return {
    playerId: lineupPlayer.playerId,
    slot,
    name: lineupPlayer.name,
    position: lineupPlayer.position,
    bats: lineupPlayer.bats,
    season: seasonStats
      ? {
          gamesPlayed: seasonStats.gamesPlayed,
          hits: seasonStats.hits,
          homeRuns: seasonStats.homeRuns,
          avg: Number(formatRate(seasonStats.avg, 3).replace(/^\./, '0.')),
          ops: Number(formatRate(seasonStats.ops, 3).replace(/^\./, '0.'))
        }
      : null,
    recent: recentStats
      ? {
          gamesPlayed: recentStats.gamesPlayed,
          hits: recentStats.hits,
          homeRuns: recentStats.homeRuns,
          avg: Number(formatRate(recentStats.avg, 3).replace(/^\./, '0.')),
          ops: Number(formatRate(recentStats.ops, 3).replace(/^\./, '0.'))
        }
      : null,
    split: splitStats
      ? {
          hits: splitStats.hits,
          homeRuns: splitStats.homeRuns,
          avg: Number(formatRate(splitStats.avg, 3).replace(/^\./, '0.')),
          ops: Number(formatRate(splitStats.ops, 3).replace(/^\./, '0.'))
        }
      : null,
    metrics: {
      powerScore: roundToTenths(powerScore),
      contactScore: roundToTenths(contactScore),
      patienceScore: roundToTenths(patienceScore),
      formScore: roundToTenths(formScore),
      splitScore: roundToTenths(splitScore),
      varianceScore: roundToTenths(varianceScore),
      matchupScore: roundToTenths(matchupScore),
      matchupGrade: roundToHundredths(matchupGrade)
    },
    tags,
    primaryTag,
    summary,
    matchupNote: `${formatSigned(matchupGrade, 2)} vs ${opposingPitcher?.fullName || 'today’s starter'}`
  }
}

const buildLineupTeamSummary = ({ teamName, lineup, opposingPitcher }) => {
  const sortedDesc = [...lineup].sort((left, right) => right.metrics.matchupGrade - left.metrics.matchupGrade)
  const sortedAsc = [...lineup].sort((left, right) => left.metrics.matchupGrade - right.metrics.matchupGrade)
  const overperformHitters = sortedDesc
    .filter((entry) => entry.metrics.matchupGrade >= 1.2)
    .slice(0, 3)
    .map((entry) => ({
      name: entry.name,
      tag: `${entry.primaryTag} | ${entry.matchupNote}`
    }))
  const underperformHitters = sortedAsc
    .filter((entry) => entry.metrics.matchupGrade <= -0.7 || entry.tags.includes('whiff risk') || entry.tags.includes('cold'))
    .slice(0, 2)
    .map((entry) => ({
      name: entry.name,
      tag: `${entry.primaryTag} | ${entry.matchupNote}`
    }))
  const topThirdScore = average(lineup.slice(0, 3).map((entry) => entry.metrics.matchupScore))
  const middleScore = average(lineup.slice(3, 6).map((entry) => entry.metrics.matchupScore))
  const depthScore = average(lineup.slice(6).map((entry) => entry.metrics.matchupScore))
  const averageMatchupGrade = average(lineup.map((entry) => entry.metrics.matchupGrade))
  const platoonCount = lineup.filter((entry) => entry.tags.includes('split edge')).length
  const powerCount = lineup.filter((entry) => entry.metrics.powerScore >= 62).length
  const contactCount = lineup.filter((entry) => entry.metrics.contactScore >= 60).length
  const heaterCount = lineup.filter((entry) => entry.tags.includes('heater')).length
  const suppressorCount = underperformHitters.length
  const starterThreatCount = lineup.filter((entry) => entry.metrics.matchupGrade >= 2).length
  const pressureLabel =
    topThirdScore >= 63 || overperformHitters.some((entry) => entry.tag.includes('carry'))
      ? 'carry bats live'
      : topThirdScore >= 56 || middleScore >= 54
        ? 'traffic with carry'
        : 'traffic-only lane'
  const underperformNote =
    underperformHitters.length
      ? `${underperformHitters.map((entry) => entry.name).join(' and ')} carry the softer form or split fit into a ${opposingPitcher?.profileType?.toLowerCase() || 'starter'} lane.`
      : averageMatchupGrade <= 0
        ? `${teamName} grade close to neutral overall, so the lineup needs sequencing more than pure carry-bat lift.`
        : `No obvious suppressor lane has surfaced yet, but this side still needs its middle order to convert traffic.`
  const overview = overperformHitters.length
    ? `${teamName} can lean on ${overperformHitters.map((entry) => entry.name).join(', ')} to drive early pressure against ${opposingPitcher?.fullName || 'today’s starter'}.`
    : `${teamName} look more like a chain-traffic lineup than a single-carry lineup on the current posted order.`

  return {
    aggregate: {
      averageMatchupGrade: roundToHundredths(averageMatchupGrade ?? 0),
      trackedBatters: lineup.length,
      starterThreatCount,
      contactCount,
      powerCount,
      platoonCount,
      heaterCount,
      suppressorCount,
      topThirdScore: roundToTenths(topThirdScore ?? 50),
      depthScore: roundToTenths(depthScore ?? 50)
    },
    summary: {
      pressureLabel,
      overperformHitters,
      underperformHitters,
      underperformNote,
      overview,
      topThirdScore: roundToTenths(topThirdScore ?? 50),
      middleScore: roundToTenths(middleScore ?? 50),
      depthScore: roundToTenths(depthScore ?? 50)
    }
  }
}

const extractLineupPlayers = (boxscoreSide = {}, playerStatMaps = {}, opposingPitcher = null) => {
  const battingOrder = Array.isArray(boxscoreSide.battingOrder) ? boxscoreSide.battingOrder : []
  const players = boxscoreSide.players || {}

  return battingOrder
    .map((playerId, index) => {
      const playerRecord = players[`ID${playerId}`]
      if (!playerRecord) return null

      const seasonStats = getStatRecord(playerStatMaps.season, playerId)
      const recentStats = getStatRecord(playerStatMaps.recent, playerId)
      const splitStats =
        opposingPitcher?.handedness === 'L'
          ? getStatRecord(playerStatMaps.vsLeft, playerId)
          : getStatRecord(playerStatMaps.vsRight, playerId)
      const playerDetails = playerStatMaps.season.get(playerId) || playerStatMaps.recent.get(playerId) || null
      const lineupPlayer = {
        playerId,
        slot: index + 1,
        name: playerRecord.person?.fullName || playerDetails?.fullName || 'Unknown hitter',
        position: playerRecord.position?.abbreviation || playerDetails?.primaryPosition?.abbreviation || '',
        bats: buildBatterHandCode(playerDetails) || ''
      }

      return buildPlayerLineupEntry({
        lineupPlayer,
        seasonStats,
        recentStats,
        splitStats,
        opposingPitcher
      })
    })
    .filter(Boolean)
}

const serializeModule = ({ meta, lineupBoardsByGameId, lineupMatchupContextByGameId }) =>
  `export const lineupSnapshotMeta = ${JSON.stringify(meta, null, 2)}\n\n` +
  `export const lineupBoardsByGameId = ${JSON.stringify(lineupBoardsByGameId, null, 2)}\n\n` +
  `export const lineupMatchupContextByGameId = ${JSON.stringify(lineupMatchupContextByGameId, null, 2)}\n`

const main = async () => {
  const options = parseArgs()
  const rawGames = await loadRawGames(options.date)
  const recentStartDate = shiftDate(options.date, -options.recentWindowDays)
  const recentEndDate = shiftDate(options.date, -1)
  const scheduleUrl = `https://statsapi.mlb.com/api/v1/schedule?sportId=1&date=${options.date}&hydrate=team,probablePitcher`
  const schedule = await fetchJson(scheduleUrl)
  const scheduleMap = buildScheduleMap(schedule.dates || [])

  const rawGamesByKey = new Map(
    rawGames.map((game) => [
      `${deskToOfficialTeam[game.away] || game.away} @ ${deskToOfficialTeam[game.home] || game.home}`,
      game
    ])
  )

  const feedRecords = []

  for (const [officialKey, rawGame] of rawGamesByKey.entries()) {
    const scheduleGame = scheduleMap.get(officialKey)
    if (!scheduleGame) continue

    const feed = await fetchJson(`https://statsapi.mlb.com/api/v1.1/game/${scheduleGame.gamePk}/feed/live`)
    feedRecords.push({
      rawGame,
      scheduleGame,
      feed
    })
  }

  const allPlayerIds = [
    ...new Set(
      feedRecords.flatMap((record) => [
        ...(record.feed.liveData?.boxscore?.teams?.away?.battingOrder || []),
        ...(record.feed.liveData?.boxscore?.teams?.home?.battingOrder || [])
      ])
    )
  ]

  const [seasonMap, recentMap, vsRightMap, vsLeftMap] = await Promise.all([
    fetchPlayerHydrateMap(
      allPlayerIds,
      `stats(group=[hitting],type=[season],season=${options.date.slice(0, 4)})`
    ),
    fetchPlayerHydrateMap(
      allPlayerIds,
      `stats(group=[hitting],type=[byDateRange],startDate=${recentStartDate},endDate=${recentEndDate},season=${options.date.slice(0, 4)})`
    ),
    fetchPlayerHydrateMap(
      allPlayerIds,
      `stats(group=[hitting],type=[statSplits],sitCodes=[vr],season=${options.date.slice(0, 4)})`
    ),
    fetchPlayerHydrateMap(
      allPlayerIds,
      `stats(group=[hitting],type=[statSplits],sitCodes=[vl],season=${options.date.slice(0, 4)})`
    )
  ])

  const playerStatMaps = {
    season: seasonMap,
    recent: recentMap,
    vsRight: vsRightMap,
    vsLeft: vsLeftMap
  }

  const lineupBoardsByGameId = {}
  const lineupMatchupContextByGameId = {}

  for (const record of feedRecords) {
    const { rawGame, feed } = record
    const awayOfficial = deskToOfficialTeam[rawGame.away] || rawGame.away
    const homeOfficial = deskToOfficialTeam[rawGame.home] || rawGame.home
    const awayDesk = officialToDeskTeam[awayOfficial] || rawGame.away
    const homeDesk = officialToDeskTeam[homeOfficial] || rawGame.home
    const awayPitcher = buildPitcherProfile(rawGame.homePitcher)
    const homePitcher = buildPitcherProfile(rawGame.awayPitcher)
    const awayBoxscore = feed.liveData?.boxscore?.teams?.away || {}
    const homeBoxscore = feed.liveData?.boxscore?.teams?.home || {}
    const awayLineup = extractLineupPlayers(awayBoxscore, playerStatMaps, awayPitcher)
    const homeLineup = extractLineupPlayers(homeBoxscore, playerStatMaps, homePitcher)
    const awayStatus = awayLineup.length >= 9 ? 'posted' : awayLineup.length ? 'partial' : 'pending'
    const homeStatus = homeLineup.length >= 9 ? 'posted' : homeLineup.length ? 'partial' : 'pending'
    const awaySummary = awayLineup.length
      ? buildLineupTeamSummary({
          teamName: awayDesk,
          lineup: awayLineup,
          opposingPitcher: awayPitcher
        })
      : {
          aggregate: null,
          summary: {
            pressureLabel: 'lineup pending',
            overperformHitters: [],
            underperformHitters: [],
            underperformNote: 'Official batting order is still pending.',
            overview: 'No posted away lineup yet.',
            topThirdScore: 50,
            middleScore: 50,
            depthScore: 50
          }
        }
    const homeSummary = homeLineup.length
      ? buildLineupTeamSummary({
          teamName: homeDesk,
          lineup: homeLineup,
          opposingPitcher: homePitcher
        })
      : {
          aggregate: null,
          summary: {
            pressureLabel: 'lineup pending',
            overperformHitters: [],
            underperformHitters: [],
            underperformNote: 'Official batting order is still pending.',
            overview: 'No posted home lineup yet.',
            topThirdScore: 50,
            middleScore: 50,
            depthScore: 50
          }
        }

    lineupBoardsByGameId[rawGame.id] = {
      gameId: rawGame.id,
      title: `${rawGame.away} @ ${rawGame.home}`,
      snapshot: new Date().toISOString(),
      status: {
        away: awayStatus,
        home: homeStatus
      },
      away: {
        teamName: awayDesk,
        opposingStarter: {
          name: awayPitcher?.fullName || '',
          hand: awayPitcher?.handedness || '',
          type: awayPitcher?.profileType || 'Unknown sample'
        },
        lineup: awayLineup,
        ...awaySummary
      },
      home: {
        teamName: homeDesk,
        opposingStarter: {
          name: homePitcher?.fullName || '',
          hand: homePitcher?.handedness || '',
          type: homePitcher?.profileType || 'Unknown sample'
        },
        lineup: homeLineup,
        ...homeSummary
      }
    }

    lineupMatchupContextByGameId[rawGame.id] = {
      [awayDesk]: awaySummary.aggregate,
      [homeDesk]: homeSummary.aggregate
    }
  }

  const outputPayload = {
    meta: {
      date: options.date,
      snapshot: new Date().toISOString(),
      recentWindow: {
        start: recentStartDate,
        end: recentEndDate
      },
      gameCount: Object.keys(lineupBoardsByGameId).length,
      playerCount: allPlayerIds.length,
      sourceLabel:
        'Official MLB feed/live posted batting orders plus official player season, recent, and handedness split stats.'
    },
    lineupBoardsByGameId,
    lineupMatchupContextByGameId
  }

  await mkdir(path.dirname(options.out), { recursive: true })
  await mkdir(path.dirname(options.moduleOut), { recursive: true })
  await writeFile(options.out, JSON.stringify(outputPayload, null, 2), 'utf8')
  await writeFile(
    options.moduleOut,
    serializeModule({
      meta: outputPayload.meta,
      lineupBoardsByGameId,
      lineupMatchupContextByGameId
    }),
    'utf8'
  )

  const postedLineupCount = Object.values(lineupBoardsByGameId).reduce(
    (count, board) => count + (board.status.away === 'posted' ? 1 : 0) + (board.status.home === 'posted' ? 1 : 0),
    0
  )

  console.log(
    `Wrote ${Object.keys(lineupBoardsByGameId).length} lineup boards for ${options.date} with ${postedLineupCount} posted team lineups.`
  )
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
