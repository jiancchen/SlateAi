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

const normalizePersonName = (value = '') =>
  value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9]+/gi, ' ')
    .trim()
    .toLowerCase()

const decodeHtmlEntities = (value = '') =>
  value
    .replace(/&nbsp;/g, ' ')
    .replace(/&deg;/g, '°')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#039;|&#x27;|&#8217;/g, "'")
    .replace(/&ndash;|&#8211;/g, '-')

const stripTags = (value = '') =>
  decodeHtmlEntities(value)
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

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

const fetchText = async (url) => {
  const response = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0' }
  })

  if (!response.ok) {
    throw new Error(`Failed request ${response.status} for ${url}`)
  }

  return response.text()
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

const parseRotoWireSide = (listHtml = '') => {
  const statusMatch = listHtml.match(/<li class="lineup__status[^"]*">[\s\S]*?<\/div>\s*([^<]+)\s*<\/li>/i)
  const starterNameMatch = listHtml.match(/lineup__player-highlight-name">[\s\S]*?<a[^>]*>([^<]+)<\/a>/i)
  const starterThrowMatch = listHtml.match(/<span class="lineup__throws">([^<]+)<\/span>/i)
  const starterStatMatch = listHtml.match(/lineup__player-highlight-stats">\s*([\s\S]*?)\s*<\/div>/i)
  const players = Array.from(
    listHtml.matchAll(
      /<li class="lineup__player">[\s\S]*?<div class="lineup__pos">([^<]+)<\/div>[\s\S]*?<a[^>]+title="([^"]+)"[^>]*>[\s\S]*?<\/a>[\s\S]*?<span class="lineup__bats">([^<]+)<\/span>[\s\S]*?<\/li>/gi
    )
  ).map((match, index) => ({
    slot: index + 1,
    position: stripTags(match[1]),
    name: decodeHtmlEntities(match[2]).trim(),
    bats: stripTags(match[3])
  }))

  return {
    statusLabel: statusMatch ? stripTags(statusMatch[1]) : '',
    starter: {
      name: starterNameMatch ? stripTags(starterNameMatch[1]) : '',
      throws: starterThrowMatch ? stripTags(starterThrowMatch[1]) : '',
      statLine: starterStatMatch ? stripTags(starterStatMatch[1]) : ''
    },
    players
  }
}

const parseRotoWireWeather = (segment = '') => {
  const weatherMatch = segment.match(
    /<div class="lineup__weather">[\s\S]*?<img class="lineup__weather-icon"[^>]*alt="([^"]+)"[\s\S]*?<div class="lineup__weather-text">([\s\S]*?)<\/div>\s*<\/div>/i
  )
  if (!weatherMatch) return null

  const icon = stripTags(weatherMatch[1])
  const summary = stripTags(weatherMatch[2])
  if (/dome/i.test(summary)) {
    return {
      icon,
      summary,
      precipitationPct: null,
      temperatureF: null,
      windMph: null,
      windDirection: '',
      label: summary
    }
  }
  const precipitation = Number(summary.match(/(\d+)%\s*Precipitation/i)?.[1] || '')
  const temperature = Number(summary.match(/(-?\d+)\s*°/)?.[1] || '')
  const windMatch = summary.match(/Wind\s+(\d+)\s*mph\s*([A-Za-z-]+)/i)

  return {
    icon,
    summary,
    precipitationPct: Number.isFinite(precipitation) ? precipitation : null,
    temperatureF: Number.isFinite(temperature) ? temperature : null,
    windMph: Number.isFinite(Number(windMatch?.[1])) ? Number(windMatch[1]) : null,
    windDirection: windMatch?.[2] || '',
    label: [
      Number.isFinite(temperature) ? `${temperature}°F` : '',
      windMatch ? `Wind ${windMatch[1]} mph ${windMatch[2]}` : '',
      Number.isFinite(precipitation) ? `${precipitation}% precip` : ''
    ]
      .filter(Boolean)
      .join(' | ')
  }
}

const parseRotoWireOdds = (segment = '') => {
  const lineMatch = segment.match(/<b>LINE<\/b>&nbsp;[\s\S]*?<span class="composite hide">([^<]+)<\/span>/i)
  const totalMatch = segment.match(/<b>O\/U<\/b>&nbsp;[\s\S]*?<span class="composite hide">([^<]+)<\/span>/i)

  return {
    line: lineMatch ? stripTags(lineMatch[1]) : '',
    total: totalMatch ? stripTags(totalMatch[1]) : ''
  }
}

const fetchRotoWireLineupCards = async () => {
  const html = await fetchText('https://www.rotowire.com/baseball/daily-lineups.php')
  const segments = html.split('<div class="lineup is-mlb').slice(1)
  const output = new Map()

  for (const segment of segments) {
    const awayTeamMatch = segment.match(/<div class="lineup__mteam is-visit">\s*([\s\S]*?)<span class="lineup__wl">/i)
    const homeTeamMatch = segment.match(/<div class="lineup__mteam is-home">\s*([\s\S]*?)<span class="lineup__wl">/i)
    if (!awayTeamMatch || !homeTeamMatch) continue

    const awayOfficial = deskToOfficialTeam[stripTags(awayTeamMatch[1])] || stripTags(awayTeamMatch[1])
    const homeOfficial = deskToOfficialTeam[stripTags(homeTeamMatch[1])] || stripTags(homeTeamMatch[1])
    const key = `${awayOfficial} @ ${homeOfficial}`
    const lists = Array.from(segment.matchAll(/<ul class="lineup__list is-(visit|home)">([\s\S]*?)<\/ul>/gi))
    if (lists.length < 2) continue

    const timeMatch = segment.match(/<div class="lineup__time">([^<]+)<\/div>/i)
    output.set(key, {
      time: timeMatch ? stripTags(timeMatch[1]) : '',
      weather: parseRotoWireWeather(segment),
      odds: parseRotoWireOdds(segment),
      away: parseRotoWireSide(lists.find((entry) => entry[1] === 'visit')?.[2] || ''),
      home: parseRotoWireSide(lists.find((entry) => entry[1] === 'home')?.[2] || '')
    })
  }

  return output
}

const aggregateStatSplits = (splits = []) => {
  if (!Array.isArray(splits) || !splits.length) return null

  const aggregate = {
    gamesPlayed: 0,
    hits: 0,
    singles: 0,
    doubles: 0,
    triples: 0,
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
    aggregate.doubles += Number(stat.doubles || 0)
    aggregate.triples += Number(stat.triples || 0)
    aggregate.atBats += Number(stat.atBats || 0)
    aggregate.plateAppearances += Number(stat.plateAppearances || 0)
    aggregate.homeRuns += Number(stat.homeRuns || 0)
    aggregate.strikeOuts += Number(stat.strikeOuts || 0)
    aggregate.baseOnBalls += Number(stat.baseOnBalls || 0)
    aggregate.hitByPitch += Number(stat.hitByPitch || 0)
    aggregate.totalBases += Number(stat.totalBases || 0)
    aggregate.sacFlies += Number(stat.sacFlies || 0)
  }

  aggregate.singles += Math.max(0, aggregate.hits - aggregate.doubles - aggregate.triples - aggregate.homeRuns)

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
    singles: aggregate.singles,
    doubles: aggregate.doubles,
    triples: aggregate.triples,
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
    singlesPerGame: aggregate.gamesPlayed > 0 ? aggregate.singles / aggregate.gamesPlayed : null,
    hrRate: plateAppearances > 0 ? aggregate.homeRuns / plateAppearances : null,
    hitRate: plateAppearances > 0 ? aggregate.hits / plateAppearances : null,
    singlesRate: plateAppearances > 0 ? aggregate.singles / plateAppearances : null,
    totalBasesRate: plateAppearances > 0 ? aggregate.totalBases / plateAppearances : null,
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

const buildRosterLookup = (boxscoreSide = {}) => {
  const lookup = new Map()

  for (const playerRecord of Object.values(boxscoreSide.players || {})) {
    const fullName = playerRecord?.person?.fullName
    const playerId = playerRecord?.person?.id
    if (!fullName || !playerId) continue

    lookup.set(normalizePersonName(fullName), {
      playerId,
      playerRecord
    })
  }

  return lookup
}

const mapRotoLineupPlayerIds = (rotoSide = null, boxscoreSide = {}) => {
  if (!rotoSide?.players?.length) return []

  const rosterLookup = buildRosterLookup(boxscoreSide)

  return rotoSide.players
    .map((player) => rosterLookup.get(normalizePersonName(player.name))?.playerId)
    .filter(Boolean)
}

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
          singles: seasonStats.singles,
          doubles: seasonStats.doubles,
          triples: seasonStats.triples,
          homeRuns: seasonStats.homeRuns,
          walks: seasonStats.baseOnBalls,
          totalBases: seasonStats.totalBases,
          atBats: seasonStats.atBats,
          plateAppearances: seasonStats.plateAppearances,
          avg: Number(formatRate(seasonStats.avg, 3).replace(/^\./, '0.')),
          obp: Number(formatRate(seasonStats.obp, 3).replace(/^\./, '0.')),
          slg: Number(formatRate(seasonStats.slg, 3).replace(/^\./, '0.')),
          ops: Number(formatRate(seasonStats.ops, 3).replace(/^\./, '0.')),
          hitRate: roundToHundredths((seasonStats.hitRate || 0) * 100) / 100,
          singlesRate: roundToHundredths((seasonStats.singlesRate || 0) * 100) / 100,
          hrRate: roundToHundredths((seasonStats.hrRate || 0) * 100) / 100,
          walkRate: roundToHundredths((seasonStats.bbRate || 0) * 100) / 100,
          totalBasesRate: roundToHundredths((seasonStats.totalBasesRate || 0) * 100) / 100
        }
      : null,
    recent: recentStats
      ? {
          gamesPlayed: recentStats.gamesPlayed,
          hits: recentStats.hits,
          singles: recentStats.singles,
          doubles: recentStats.doubles,
          triples: recentStats.triples,
          homeRuns: recentStats.homeRuns,
          walks: recentStats.baseOnBalls,
          totalBases: recentStats.totalBases,
          atBats: recentStats.atBats,
          plateAppearances: recentStats.plateAppearances,
          avg: Number(formatRate(recentStats.avg, 3).replace(/^\./, '0.')),
          obp: Number(formatRate(recentStats.obp, 3).replace(/^\./, '0.')),
          slg: Number(formatRate(recentStats.slg, 3).replace(/^\./, '0.')),
          ops: Number(formatRate(recentStats.ops, 3).replace(/^\./, '0.')),
          hitRate: roundToHundredths((recentStats.hitRate || 0) * 100) / 100,
          singlesRate: roundToHundredths((recentStats.singlesRate || 0) * 100) / 100,
          hrRate: roundToHundredths((recentStats.hrRate || 0) * 100) / 100,
          walkRate: roundToHundredths((recentStats.bbRate || 0) * 100) / 100,
          totalBasesRate: roundToHundredths((recentStats.totalBasesRate || 0) * 100) / 100
        }
      : null,
    split: splitStats
      ? {
          hits: splitStats.hits,
          singles: splitStats.singles,
          doubles: splitStats.doubles,
          triples: splitStats.triples,
          homeRuns: splitStats.homeRuns,
          walks: splitStats.baseOnBalls,
          totalBases: splitStats.totalBases,
          atBats: splitStats.atBats,
          plateAppearances: splitStats.plateAppearances,
          avg: Number(formatRate(splitStats.avg, 3).replace(/^\./, '0.')),
          obp: Number(formatRate(splitStats.obp, 3).replace(/^\./, '0.')),
          slg: Number(formatRate(splitStats.slg, 3).replace(/^\./, '0.')),
          ops: Number(formatRate(splitStats.ops, 3).replace(/^\./, '0.')),
          hitRate: roundToHundredths((splitStats.hitRate || 0) * 100) / 100,
          singlesRate: roundToHundredths((splitStats.singlesRate || 0) * 100) / 100,
          hrRate: roundToHundredths((splitStats.hrRate || 0) * 100) / 100,
          walkRate: roundToHundredths((splitStats.bbRate || 0) * 100) / 100,
          totalBasesRate: roundToHundredths((splitStats.totalBasesRate || 0) * 100) / 100
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

const extractSupplementalLineupPlayers = ({
  rotoSide = null,
  boxscoreSide = {},
  playerStatMaps = {},
  opposingPitcher = null
}) => {
  if (!rotoSide?.players?.length) return []

  const rosterLookup = buildRosterLookup(boxscoreSide)

  return rotoSide.players
    .map((player) => {
      const rosterEntry = rosterLookup.get(normalizePersonName(player.name))
      if (!rosterEntry?.playerId) return null

      const playerId = rosterEntry.playerId
      const playerRecord = rosterEntry.playerRecord
      const seasonStats = getStatRecord(playerStatMaps.season, playerId)
      const recentStats = getStatRecord(playerStatMaps.recent, playerId)
      const splitStats =
        opposingPitcher?.handedness === 'L'
          ? getStatRecord(playerStatMaps.vsLeft, playerId)
          : getStatRecord(playerStatMaps.vsRight, playerId)
      const playerDetails = playerStatMaps.season.get(playerId) || playerStatMaps.recent.get(playerId) || null
      const lineupPlayer = {
        playerId,
        slot: player.slot,
        name: player.name,
        position: player.position || playerRecord.position?.abbreviation || playerDetails?.primaryPosition?.abbreviation || '',
        bats: player.bats || buildBatterHandCode(playerDetails) || ''
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

const statusFromRotoWire = (statusLabel = '', lineupLength = 0) => {
  if (/confirmed/i.test(statusLabel) || lineupLength >= 9 && /official/i.test(statusLabel)) return 'posted'
  if (lineupLength > 0) return 'partial'
  return 'pending'
}

const choosePreferredLineup = ({
  officialLineup = [],
  supplementalLineup = [],
  officialStatus = 'pending',
  supplementalStatus = 'pending'
}) => {
  if (officialStatus === 'posted' && officialLineup.length >= supplementalLineup.length) {
    return { lineup: officialLineup, status: officialStatus, source: 'official-feed' }
  }

  if (supplementalLineup.length > officialLineup.length) {
    return { lineup: supplementalLineup, status: supplementalStatus, source: 'rotowire-supplement' }
  }

  if (officialLineup.length) {
    return { lineup: officialLineup, status: officialStatus, source: 'official-feed' }
  }

  if (supplementalLineup.length) {
    return { lineup: supplementalLineup, status: supplementalStatus, source: 'rotowire-supplement' }
  }

  return { lineup: [], status: 'pending', source: 'none' }
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
  const rotoWireCards = await fetchRotoWireLineupCards()

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
        ...(record.feed.liveData?.boxscore?.teams?.home?.battingOrder || []),
        ...mapRotoLineupPlayerIds(
          rotoWireCards.get(`${deskToOfficialTeam[record.rawGame.away] || record.rawGame.away} @ ${deskToOfficialTeam[record.rawGame.home] || record.rawGame.home}`)?.away,
          record.feed.liveData?.boxscore?.teams?.away || {}
        ),
        ...mapRotoLineupPlayerIds(
          rotoWireCards.get(`${deskToOfficialTeam[record.rawGame.away] || record.rawGame.away} @ ${deskToOfficialTeam[record.rawGame.home] || record.rawGame.home}`)?.home,
          record.feed.liveData?.boxscore?.teams?.home || {}
        )
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
    const officialKey = `${awayOfficial} @ ${homeOfficial}`
    const rotoWireCard = rotoWireCards.get(officialKey) || null
    const awayOfficialLineup = extractLineupPlayers(awayBoxscore, playerStatMaps, awayPitcher)
    const homeOfficialLineup = extractLineupPlayers(homeBoxscore, playerStatMaps, homePitcher)
    const awaySupplementalLineup = extractSupplementalLineupPlayers({
      rotoSide: rotoWireCard?.away,
      boxscoreSide: awayBoxscore,
      playerStatMaps,
      opposingPitcher: awayPitcher
    })
    const homeSupplementalLineup = extractSupplementalLineupPlayers({
      rotoSide: rotoWireCard?.home,
      boxscoreSide: homeBoxscore,
      playerStatMaps,
      opposingPitcher: homePitcher
    })
    const awaySelection = choosePreferredLineup({
      officialLineup: awayOfficialLineup,
      supplementalLineup: awaySupplementalLineup,
      officialStatus: awayOfficialLineup.length >= 9 ? 'posted' : awayOfficialLineup.length ? 'partial' : 'pending',
      supplementalStatus: statusFromRotoWire(rotoWireCard?.away?.statusLabel, awaySupplementalLineup.length)
    })
    const homeSelection = choosePreferredLineup({
      officialLineup: homeOfficialLineup,
      supplementalLineup: homeSupplementalLineup,
      officialStatus: homeOfficialLineup.length >= 9 ? 'posted' : homeOfficialLineup.length ? 'partial' : 'pending',
      supplementalStatus: statusFromRotoWire(rotoWireCard?.home?.statusLabel, homeSupplementalLineup.length)
    })
    const awayLineup = awaySelection.lineup
    const homeLineup = homeSelection.lineup
    const awayStatus = awaySelection.status
    const homeStatus = homeSelection.status
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
      weather: rotoWireCard?.weather || null,
      marketWeatherContext: {
        line: rotoWireCard?.odds?.line || '',
        total: rotoWireCard?.odds?.total || '',
        source: rotoWireCard ? 'RotoWire daily lineups + weather' : ''
      },
      away: {
        teamName: awayDesk,
        lineupSource: awaySelection.source,
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
        lineupSource: homeSelection.source,
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
        'Official MLB feed/live batting orders plus official player season, recent, and handedness split stats, supplemented by RotoWire daily lineups and weather when the official order is still missing.'
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
