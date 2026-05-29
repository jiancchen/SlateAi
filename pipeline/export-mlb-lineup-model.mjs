import { mkdir, writeFile } from 'node:fs/promises'
import { execFileSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')
const season = 2026
const warehousePath = path.join(rootDir, 'data-private', 'warehouse', 'sports.db')

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

const quoteSqlText = (value = '') => `'${String(value).replace(/'/g, "''")}'`

const runSqliteJson = (sql) => {
  if (!existsSync(warehousePath)) return []
  const raw = execFileSync('sqlite3', ['-json', warehousePath, sql], { encoding: 'utf8' }).trim()
  return raw ? JSON.parse(raw) : []
}

const toSlug = (value = '') =>
  value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

const buildBaseballSavantLinks = ({ playerId, fullName, seasonYear, type = 'hitting' } = {}) => {
  if (!Number.isFinite(Number(playerId))) return null

  const normalizedType = type === 'pitching' ? 'pitching' : 'hitting'
  const statsSuffix = normalizedType === 'pitching' ? 'r-pitching-mlb' : 'r-hitting-mlb'
  const playerSlug = toSlug(fullName || `player-${playerId}`) || `player-${playerId}`
  const playerUrl = `https://baseballsavant.mlb.com/savant-player/${playerSlug}-${Number(playerId)}`
  const buildStatsUrl = (statsKey) => `${playerUrl}?stats=${statsKey}-${statsSuffix}&season=${seasonYear}`

  return {
    playerId: Number(playerId),
    playerUrl,
    statsSuffix,
    season: seasonYear,
    statsUrls: {
      statcast: buildStatsUrl('statcast'),
      splits: buildStatsUrl('splits'),
      gamelogs: buildStatsUrl('gamelogs')
    }
  }
}

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

  options.out ||= path.join(rootDir, 'data-private', 'lineups', 'mlb', `${options.date}-lineup-board.json`)
  options.moduleOut ||= path.join(rootDir, 'web', 'src', 'lib', `day-${options.date}-lineups.js`)
  return options
}

const shiftDate = (isoDate, deltaDays) => {
  const date = new Date(`${isoDate}T12:00:00Z`)
  date.setUTCDate(date.getUTCDate() + deltaDays)
  return date.toISOString().slice(0, 10)
}

const fetchJson = async (url) => {
  const response = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0', 'X-Requested-With': 'XMLHttpRequest' }
  })

  if (!response.ok) {
    throw new Error(`Failed request ${response.status} for ${url}`)
  }

  return response.json()
}

const buildStatcastTrendSignal = (row = {}) => {
  const xwobaTrend = Number(row.xwoba_trend_7_minus_30)
  const hardHitTrend = Number(row.hard_hit_trend_7_minus_30)
  const sweetSpotTrend = Number(row.sweet_spot_trend_7_minus_30)
  if (
    !Number.isFinite(xwobaTrend) &&
    !Number.isFinite(hardHitTrend) &&
    !Number.isFinite(sweetSpotTrend)
  ) {
    return null
  }
  if (xwobaTrend >= 0.012 || hardHitTrend >= 2.5 || sweetSpotTrend >= 2) return 'improving'
  if (xwobaTrend <= -0.012 || hardHitTrend <= -2.5 || sweetSpotTrend <= -2) return 'fading'
  return 'flat'
}

const fetchHitterStatcastTrendMap = (asOfDate, playerIds = []) => {
  const normalizedIds = [...new Set(playerIds.map((value) => Number(value)).filter(Number.isFinite))]
  if (!normalizedIds.length) return new Map()

  const rows = runSqliteJson(`
    select
      player_id,
      games_sample_7,
      pa_sample_7,
      bbe_sample_7,
      rolling_7_xwoba,
      rolling_7_xba,
      rolling_7_xslg,
      rolling_7_barrel_pct,
      rolling_7_hard_hit_pct,
      rolling_7_sweet_spot_pct,
      xwoba_trend_7_minus_30,
      barrel_trend_7_minus_30,
      hard_hit_trend_7_minus_30,
      sweet_spot_trend_7_minus_30
    from mlb_hitter_statcast_trend_snapshots
    where as_of_date = ${quoteSqlText(asOfDate)}
      and player_id in (${normalizedIds.join(',')})
  `)

  return new Map(
    rows.map((row) => [
      Number(row.player_id),
      {
        gamesSample7: Number(row.games_sample_7 || 0) || 0,
        paSample7: Number(row.pa_sample_7 || 0) || 0,
        bbeSample7: Number(row.bbe_sample_7 || 0) || 0,
        rolling7Xwoba: parseNumber(row.rolling_7_xwoba),
        rolling7Xba: parseNumber(row.rolling_7_xba),
        rolling7Xslg: parseNumber(row.rolling_7_xslg),
        rolling7BarrelPct: parseNumber(row.rolling_7_barrel_pct),
        rolling7HardHitPct: parseNumber(row.rolling_7_hard_hit_pct),
        rolling7SweetSpotPct: parseNumber(row.rolling_7_sweet_spot_pct),
        xwobaTrend: parseNumber(row.xwoba_trend_7_minus_30),
        barrelTrend: parseNumber(row.barrel_trend_7_minus_30),
        hardHitTrend: parseNumber(row.hard_hit_trend_7_minus_30),
        sweetSpotTrend: parseNumber(row.sweet_spot_trend_7_minus_30),
        trendSignal: buildStatcastTrendSignal(row)
      }
    ])
  )
}

const fetchHitterOpponentContextMap = (asOfDate, playerIds = []) => {
  const normalizedIds = [...new Set(playerIds.map((value) => Number(value)).filter(Number.isFinite))]
  if (!normalizedIds.length) return new Map()

  const rows = runSqliteJson(`
    select
      player_id,
      games_sample_last10,
      avg_opponent_win_pct_last5_last10,
      avg_opponent_run_diff_last5_last10,
      avg_opponent_run_diff_per_game_last10,
      games_vs_winning_last10,
      weighted_hits_per_pa_last10,
      weighted_total_bases_per_pa_last10,
      hits_per_pa_weight_delta_last10,
      total_bases_per_pa_weight_delta_last10
    from mlb_hitter_opponent_context_snapshots
    where as_of_date = ${quoteSqlText(asOfDate)}
      and player_id in (${normalizedIds.join(',')})
  `)

  return new Map(
    rows.map((row) => [
      Number(row.player_id),
      {
        gamesSampleLast10: Number(row.games_sample_last10 || 0) || 0,
        avgOpponentWinPctLast10: parseNumber(row.avg_opponent_win_pct_last5_last10),
        avgOpponentRunDiffLast10: parseNumber(row.avg_opponent_run_diff_last5_last10),
        avgOpponentRunDiffPerGameLast10: parseNumber(row.avg_opponent_run_diff_per_game_last10),
        gamesVsWinningLast10: Number(row.games_vs_winning_last10 || 0) || 0,
        weightedHitsPerPaLast10: parseNumber(row.weighted_hits_per_pa_last10),
        weightedTotalBasesPerPaLast10: parseNumber(row.weighted_total_bases_per_pa_last10),
        hitsPerPaWeightDeltaLast10: parseNumber(row.hits_per_pa_weight_delta_last10),
        totalBasesPerPaWeightDeltaLast10: parseNumber(row.total_bases_per_pa_weight_delta_last10)
      }
    ])
  )
}

const fetchRotoWireBvpRows = async ({ date, type }) => {
  const url =
    'https://www.rotowire.com/baseball/tables/matchup.php?' +
    new URLSearchParams({
      type,
      start: date,
      end: date,
      bab: '10',
      bhotavg: '400',
      bhotops: '850',
      bhothr: '3',
      bcoldavg: '200',
      bcoldops: '500',
      bcoldhr: '0.15',
      pab: '60',
      photavg: '225',
      photops: '600',
      photkbb: '6',
      pcoldavg: '300',
      pcoldops: '850',
      pcoldkbb: '1'
    }).toString()

  try {
    const rows = await fetchJson(url)
    return Array.isArray(rows) ? rows : []
  } catch (error) {
    console.warn(`Unable to load RotoWire ${type} BvP rows for ${date}:`, error.message)
    return []
  }
}

const buildBvpHistory = ({ lineup = [], opposingPitcherId = null, opposingPitcherName = '', hotRows = [], coldRows = [] }) => {
  const normalizedPitcherId = Number(opposingPitcherId)
  const normalizedPitcherName = normalizePersonName(opposingPitcherName)
  if ((!Number.isFinite(normalizedPitcherId) && !normalizedPitcherName) || !lineup.length) {
    return {
      hot: [],
      cold: [],
      summary: 'No meaningful batter-vs-pitcher sample has surfaced for this lineup yet.'
    }
  }

  const lineupNames = new Set(lineup.map((player) => normalizePersonName(player.name)))
  const mapRow = (row, tone) => ({
    name: `${row.playerfirstname} ${row.playerlastname}`.trim(),
    sample: `${row.hits}/${row.atbats}`,
    atBats: Number(row.atbats) || 0,
    avg: row.avg,
    ops: row.ops,
    homeRuns: Number(row.hr) || 0,
    rbi: Number(row.rbi) || 0,
    tone,
    summary: `${row.hits}/${row.atbats}, ${row.hr} HR, ${row.rbi} RBI, ${row.ops} OPS vs ${row.pitcherfirstname} ${row.pitcherlastname}`
  })

  const hot = hotRows
    .filter(
      (row) =>
        ((Number.isFinite(normalizedPitcherId) && Number(row.pitcherID) === normalizedPitcherId) ||
          normalizePersonName(`${row.pitcherfirstname} ${row.pitcherlastname}`) === normalizedPitcherName) &&
        lineupNames.has(normalizePersonName(`${row.playerfirstname} ${row.playerlastname}`))
    )
    .map((row) => mapRow(row, 'hot'))
    .sort((left, right) => right.homeRuns - left.homeRuns || right.atBats - left.atBats)

  const cold = coldRows
    .filter(
      (row) =>
        ((Number.isFinite(normalizedPitcherId) && Number(row.pitcherID) === normalizedPitcherId) ||
          normalizePersonName(`${row.pitcherfirstname} ${row.pitcherlastname}`) === normalizedPitcherName) &&
        lineupNames.has(normalizePersonName(`${row.playerfirstname} ${row.playerlastname}`))
    )
    .map((row) => mapRow(row, 'cold'))
    .sort((left, right) => right.atBats - left.atBats)

  let summary = 'No meaningful batter-vs-pitcher sample has surfaced for this lineup yet.'
  if (hot.length && cold.length) {
    summary = `BvP sample is mixed: ${hot[0].name} owns the cleanest history, but ${cold[0].name} shows the coldest prior lane.`
  } else if (hot.length) {
    summary = `${hot[0].name} carries the cleanest visible BvP lane against this starter.`
  } else if (cold.length) {
    summary = `${cold[0].name} carries the weakest visible BvP lane against this starter.`
  }

  return {
    hot,
    cold,
    summary
  }
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

const statcastPitchTypes = ['FF', 'SI', 'FT', 'FC', 'SL', 'ST', 'SV', 'CU', 'KC', 'CH', 'FS', 'FO', 'SC', 'KN', 'CS', 'EP']

const parseCsvLine = (line = '') => {
  const cells = []
  let current = ''
  let inQuotes = false

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index]

    if (character === '"') {
      if (inQuotes && line[index + 1] === '"') {
        current += '"'
        index += 1
      } else {
        inQuotes = !inQuotes
      }
      continue
    }

    if (character === ',' && !inQuotes) {
      cells.push(current)
      current = ''
      continue
    }

    current += character
  }

  cells.push(current)
  return cells.map((cell) => cell.trim())
}

const parseCsvTable = (text = '') => {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)

  if (!lines.length) return []

  const headers = parseCsvLine(lines[0]).map((header) => header.replace(/^"|"$/g, ''))

  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line)
    return Object.fromEntries(headers.map((header, index) => [header, values[index] ?? '']))
  })
}

const parsePitchArsenalNumber = (value, fallback = null) => {
  if (value === '' || value === null || value === undefined) return fallback
  const parsed = Number(String(value).replace(/%/g, ''))
  return Number.isFinite(parsed) ? parsed : fallback
}

const fetchPitchArsenalRows = async ({ type, pitchType, year }) => {
  const url =
    `https://baseballsavant.mlb.com/leaderboard/pitch-arsenal-stats?type=${type}` +
    `&pitchType=${pitchType}&year=${year}&min=1&minPitches=0&csv=true`
  const text = await fetchText(url)

  return parseCsvTable(text).map((row) => ({
    playerId: parsePitchArsenalNumber(row.player_id),
    teamName: row.team_name_alt || '',
    pitchType: row.pitch_type || pitchType,
    pitchName: row.pitch_name || pitchType,
    runValuePer100: parsePitchArsenalNumber(row.run_value_per_100),
    runValue: parsePitchArsenalNumber(row.run_value),
    pitches: parsePitchArsenalNumber(row.pitches),
    pitchUsage: parsePitchArsenalNumber(row.pitch_usage),
    plateAppearances: parsePitchArsenalNumber(row.pa),
    avg: parsePitchArsenalNumber(row.ba),
    slg: parsePitchArsenalNumber(row.slg),
    woba: parsePitchArsenalNumber(row.woba),
    whiffPercent: parsePitchArsenalNumber(row.whiff_percent),
    kPercent: parsePitchArsenalNumber(row.k_percent),
    putAwayPercent: parsePitchArsenalNumber(row.put_away),
    estBa: parsePitchArsenalNumber(row.est_ba),
    estSlg: parsePitchArsenalNumber(row.est_slg),
    estWoba: parsePitchArsenalNumber(row.est_woba),
    hardHitPercent: parsePitchArsenalNumber(row.hard_hit_percent)
  }))
}

const buildPitcherPitchQualityScore = (pitch = {}) =>
  clamp(
    50 +
      (Number(pitch.runValuePer100 || 0) * 8) +
      ((Number(pitch.whiffPercent || 0) - 24) * 0.55) +
      ((Number(pitch.kPercent || 0) - 22) * 0.48) +
      ((0.325 - Number(pitch.woba || 0.325)) * 140) +
      ((0.325 - Number(pitch.estWoba || 0.325)) * 110) +
      ((38 - Number(pitch.hardHitPercent || 38)) * 0.55),
    18,
    94
  )

const buildBatterPitchFitScore = (pitch = {}) =>
  clamp(
    50 +
      ((Number(pitch.woba || 0.32) - 0.32) * 140) +
      ((Number(pitch.estWoba || 0.32) - 0.32) * 110) +
      ((Number(pitch.slg || 0.39) - 0.39) * 90) +
      ((Number(pitch.hardHitPercent || 38) - 38) * 0.7) -
      ((Number(pitch.whiffPercent || 24) - 24) * 0.45) -
      ((Number(pitch.kPercent || 22) - 22) * 0.35),
    18,
    94
  )

const buildPitchArsenalMaps = async ({ batterIds = [], pitcherIds = [], year }) => {
  const batterIdSet = new Set(batterIds.map((value) => Number(value)).filter(Number.isFinite))
  const pitcherIdSet = new Set(pitcherIds.map((value) => Number(value)).filter(Number.isFinite))
  const batterPitchTypeStatsByPlayerId = new Map()
  const pitcherPitchRowsByPlayerId = new Map()

  await Promise.all(
    statcastPitchTypes.flatMap((pitchType) => [
      fetchPitchArsenalRows({ type: 'batter', pitchType, year }).then((rows) => {
        for (const row of rows) {
          if (!batterIdSet.has(row.playerId)) continue
          if (!batterPitchTypeStatsByPlayerId.has(row.playerId)) {
            batterPitchTypeStatsByPlayerId.set(row.playerId, new Map())
          }
          batterPitchTypeStatsByPlayerId.get(row.playerId).set(pitchType, {
            ...row,
            fitScore: roundToTenths(buildBatterPitchFitScore(row))
          })
        }
      }),
      fetchPitchArsenalRows({ type: 'pitcher', pitchType, year }).then((rows) => {
        for (const row of rows) {
          if (!pitcherIdSet.has(row.playerId)) continue
          if (!pitcherPitchRowsByPlayerId.has(row.playerId)) {
            pitcherPitchRowsByPlayerId.set(row.playerId, [])
          }
          pitcherPitchRowsByPlayerId.get(row.playerId).push({
            ...row,
            qualityScore: roundToTenths(buildPitcherPitchQualityScore(row))
          })
        }
      })
    ])
  )

  const pitcherPitchMixByPlayerId = new Map(
    [...pitcherPitchRowsByPlayerId.entries()].map(([playerId, rows]) => {
      const sortedRows = [...rows]
        .filter((row) => Number.isFinite(row.pitchUsage) && row.pitchUsage >= 4)
        .sort((left, right) => Number(right.pitchUsage || 0) - Number(left.pitchUsage || 0))
      const topPitches = (sortedRows.length ? sortedRows : [...rows].sort((left, right) => Number(right.pitchUsage || 0) - Number(left.pitchUsage || 0)))
        .slice(0, 4)
        .map((row) => ({
          pitchType: row.pitchType,
          pitchName: row.pitchName,
          pitchUsage: roundToTenths(Number(row.pitchUsage || 0)),
          pitches: Number(row.pitches || 0),
          qualityScore: roundToTenths(Number(row.qualityScore || 50)),
          wobaAllowed: Number.isFinite(row.woba) ? roundToHundredths(row.woba) : null,
          estWobaAllowed: Number.isFinite(row.estWoba) ? roundToHundredths(row.estWoba) : null,
          hardHitAllowed: Number.isFinite(row.hardHitPercent) ? roundToTenths(row.hardHitPercent) : null,
          whiffPercent: Number.isFinite(row.whiffPercent) ? roundToTenths(row.whiffPercent) : null
        }))
      const weightedQuality = topPitches.reduce((sum, row) => sum + row.qualityScore * (row.pitchUsage / 100), 0)

      return [
        playerId,
        {
          topPitches,
          averageQualityScore: roundToTenths(weightedQuality > 0 ? weightedQuality / Math.max(topPitches.reduce((sum, row) => sum + row.pitchUsage / 100, 0), 0.01) : 50)
        }
      ]
    })
  )

  return { batterPitchTypeStatsByPlayerId, pitcherPitchMixByPlayerId }
}

const loadDayData = async (date) => {
  const modulePath = pathToFileURL(path.join(rootDir, 'web', 'src', 'lib', `day-${date}-data.js`)).href
  return import(modulePath)
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

const buildPitcherProfile = (starterContext = null, pitchMix = null) => {
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
    }),
    pitchMix
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
      const detailedState = `${game?.status?.detailedState || ''}`.toLowerCase()
      const statusCode = `${game?.status?.statusCode || ''}`.toUpperCase()
      if (detailedState === 'postponed' || statusCode === 'DR') continue
      const awayOfficial = game.teams?.away?.team?.name
      const homeOfficial = game.teams?.home?.team?.name
      if (!awayOfficial || !homeOfficial) continue

      const gamePk = Number(game.gamePk || 0) || null
      if (Number.isFinite(gamePk)) {
        scheduleMap.set(`pk:${gamePk}`, game)
      }

      const key = `${awayOfficial} @ ${homeOfficial}`
      if (!scheduleMap.has(key)) {
        scheduleMap.set(key, game)
      }
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

const matchesExpectedOfficialTeam = ({
  expectedOfficialTeam = '',
  playerRecord = null,
  playerDetails = null
}) => {
  if (!expectedOfficialTeam) return true

  const candidates = [
    playerRecord?.parentTeamName,
    playerRecord?.team?.name,
    playerDetails?.currentTeam?.name,
    playerDetails?.teams?.[0]?.name
  ]
    .filter(Boolean)
    .map((value) => value.trim())

  if (!candidates.length) return true

  const expected = normalizePersonName(expectedOfficialTeam)
  return candidates.some((value) => normalizePersonName(value) === expected)
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

const buildPitchTypeFit = ({ pitchTypeStatsByType = null, opposingPitcherMix = null }) => {
  const topPitches = opposingPitcherMix?.topPitches || []
  if (!pitchTypeStatsByType || !topPitches.length) return null

  const relevant = topPitches
    .map((pitch) => {
      const batterPitch = pitchTypeStatsByType.get(pitch.pitchType)
      if (!batterPitch) return null

      const usageWeight = Math.max(Number(pitch.pitchUsage || 0), 0)
      const batterFitScore = Number(batterPitch.fitScore || 50)
      const pitcherQualityScore = Number(pitch.qualityScore || 50)
      const fitGrade = clamp((batterFitScore - pitcherQualityScore) / 5.5, -8, 10)

      return {
        ...pitch,
        batterFitScore: roundToTenths(batterFitScore),
        batterWoba: Number.isFinite(batterPitch.woba) ? roundToHundredths(batterPitch.woba) : null,
        batterEstWoba: Number.isFinite(batterPitch.estWoba) ? roundToHundredths(batterPitch.estWoba) : null,
        batterHardHit: Number.isFinite(batterPitch.hardHitPercent) ? roundToTenths(batterPitch.hardHitPercent) : null,
        batterWhiff: Number.isFinite(batterPitch.whiffPercent) ? roundToTenths(batterPitch.whiffPercent) : null,
        fitGrade: roundToHundredths(fitGrade),
        usageWeight
      }
    })
    .filter(Boolean)

  if (!relevant.length) return null

  const totalUsage = relevant.reduce((sum, pitch) => sum + pitch.usageWeight, 0) || relevant.length
  const weightedAverageScore = relevant.reduce((sum, pitch) => sum + pitch.batterFitScore * pitch.usageWeight, 0) / totalUsage
  const weightedPitcherQuality = relevant.reduce((sum, pitch) => sum + pitch.qualityScore * pitch.usageWeight, 0) / totalUsage
  const weightedFitGrade = relevant.reduce((sum, pitch) => sum + pitch.fitGrade * pitch.usageWeight, 0) / totalUsage
  const coveragePct = roundToTenths((totalUsage / Math.max(topPitches.reduce((sum, pitch) => sum + Number(pitch.pitchUsage || 0), 0), 1)) * 100)

  return {
    fitScore: roundToTenths(clamp(weightedAverageScore + (weightedFitGrade * 1.4), 18, 94)),
    fitGrade: roundToHundredths(clamp(weightedFitGrade, -8, 10)),
    coveragePct,
    summary: `${relevant
      .slice(0, 3)
      .map((pitch) => `${pitch.pitchName} ${pitch.pitchUsage.toFixed(0)}%`)
      .join(' / ')} | fit ${formatSigned(weightedFitGrade, 1)}`,
    topPitches: relevant.slice(0, 3).map((pitch) => ({
      pitchType: pitch.pitchType,
      pitchName: pitch.pitchName,
      pitchUsage: pitch.pitchUsage,
      fitGrade: pitch.fitGrade,
      batterFitScore: pitch.batterFitScore,
      qualityScore: pitch.qualityScore
    }))
  }
}

const buildBullpenPitchTypeSummary = ({
  lineup = [],
  pitchTypeStatsLookup = null,
  opposingRelievers = []
}) => {
  if (!lineup.length || !pitchTypeStatsLookup || !Array.isArray(opposingRelievers) || !opposingRelievers.length) {
    return null
  }

  const relievers = opposingRelievers
    .map((reliever) => {
      if (!reliever?.pitchMix?.topPitches?.length) return null

      const hitterFits = lineup
        .map((entry) => {
          const pitchTypeStatsByType = pitchTypeStatsLookup.get(entry.playerId) || null
          const fit = buildPitchTypeFit({
            pitchTypeStatsByType,
            opposingPitcherMix: reliever.pitchMix
          })

          if (!fit) return null

          const slotWeight = clamp(1.18 - (Math.max(entry.slot, 1) - 1) * 0.07, 0.52, 1.18)
          return {
            name: entry.name,
            slot: entry.slot,
            primaryTag: entry.primaryTag,
            fitScore: Number(fit.fitScore || 50),
            fitGrade: Number(fit.fitGrade || 0),
            slotWeight
          }
        })
        .filter(Boolean)

      if (!hitterFits.length) return null

      const totalWeight = hitterFits.reduce((sum, hitter) => sum + hitter.slotWeight, 0) || hitterFits.length
      const fitScore =
        hitterFits.reduce((sum, hitter) => sum + hitter.fitScore * hitter.slotWeight, 0) / totalWeight
      const fitGrade =
        hitterFits.reduce((sum, hitter) => sum + hitter.fitGrade * hitter.slotWeight, 0) / totalWeight
      const topAttackers = [...hitterFits]
        .sort((left, right) => right.fitGrade - left.fitGrade)
        .slice(0, 2)
        .map((hitter) => ({
          name: hitter.name,
          slot: hitter.slot,
          tag: `${hitter.primaryTag || 'live'} | fit ${formatSigned(hitter.fitGrade, 1)}`
        }))

      return {
        pitcherId: reliever.pitcherId || null,
        name: reliever.name,
        role: reliever.role || 'middle',
        availabilityScore: Number(reliever.availabilityScore || 0),
        firstRelieverLikelihood: Number(reliever.firstRelieverLikelihood || 0),
        fitScore: roundToTenths(clamp(fitScore, 18, 94)),
        fitGrade: roundToHundredths(clamp(fitGrade, -8, 10)),
        pitchMixSummary:
          reliever.pitchMix?.topPitches
            ?.slice(0, 3)
            .map((pitch) => `${pitch.pitchName} ${pitch.pitchUsage.toFixed(0)}%`)
            .join(' / ') || '',
        topAttackers
      }
    })
    .filter(Boolean)

  if (!relievers.length) return null

  const averageFitScore = average(relievers.map((reliever) => reliever.fitScore))
  const averageFitGrade = average(relievers.map((reliever) => reliever.fitGrade))
  const edgeCount = relievers.reduce(
    (sum, reliever) => sum + reliever.topAttackers.filter((hitter) => /fit \+/.test(hitter.tag)).length,
    0
  )
  const pressureIndex = clamp(
    50 +
      (Number.isFinite(averageFitGrade) ? averageFitGrade * 6.1 : 0) +
      (Number.isFinite(averageFitScore) ? (averageFitScore - 50) * 0.42 : 0) +
      (edgeCount - 2) * 2.6,
    18,
    94
  )
  const firstReliever = relievers[0] || null

  return {
    pressureIndex: roundToTenths(pressureIndex),
    averageFitScore: roundToTenths(averageFitScore ?? 50),
    averageFitGrade: roundToHundredths(averageFitGrade ?? 0),
    firstReliever,
    relievers,
    topAttackers: relievers.flatMap((reliever) => reliever.topAttackers).slice(0, 3),
    overview: firstReliever
      ? `${firstReliever.name} is the first bridge look, and this lineup grades ${formatSigned(
          firstReliever.fitGrade,
          1
        )} against that likely first-up arsenal.`
      : 'No strong reliever-arsenal edge has surfaced yet for the likely bridge arms.'
  }
}

const buildPlayerLineupEntry = ({
  lineupPlayer,
  seasonStats,
  recentStats,
  splitStats,
  pitchTypeStatsByType,
  opposingPitcher,
  statcastTrend = null,
  opponentContext = null
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
  const pitchTypeFit = buildPitchTypeFit({
    pitchTypeStatsByType,
    opposingPitcherMix: opposingPitcher?.pitchMix
  })
  const matchupGrade = clamp(
    (seasonOps - 0.72) * 18 +
      recentDelta * 28 +
      splitDelta * 22 +
      handednessEdge +
      slotBonus +
      pitchStyleAdjustment.adjustment +
      (Number(pitchTypeFit?.fitGrade || 0) * 0.85),
    -8,
    10
  )
  const matchupScore = clamp(
    50 +
      matchupGrade * 4.2 +
      (formScore - 50) * 0.12 +
      (splitScore - 50) * 0.1 +
      (Number(pitchTypeFit?.fitScore || 50) - 50) * 0.1,
    18,
    94
  )

  const tags = []
  if (matchupGrade >= 5 || (powerScore >= 70 && formScore >= 54)) tags.push('carry')
  if (formScore >= 61) tags.push('heater')
  if (splitScore >= 58 || handednessEdge > 0) tags.push('split edge')
  if (Number(pitchTypeFit?.fitGrade || 0) >= 1.4) tags.push('arsenal edge')
  if (contactScore >= 63) tags.push('traffic')
  if ((opposingPitcher?.profileType === 'Power' || opposingPitcher?.profileType === 'Volatile bat-misser') && varianceScore >= 64 && seasonKRate >= 0.24) {
    tags.push('whiff risk')
  }
  if (Number(pitchTypeFit?.fitGrade || 0) <= -1.4) tags.push('arsenal risk')
  if (formScore <= 42 || matchupGrade <= -1.4) tags.push('cold')
  if (statcastTrend?.trendSignal === 'improving') tags.push('statcast up')
  if (statcastTrend?.trendSignal === 'fading') tags.push('statcast fade')
  if (
    Number.isFinite(Number(statcastTrend?.rolling7BarrelPct)) &&
    Number.isFinite(Number(statcastTrend?.rolling7HardHitPct)) &&
    Number(statcastTrend.rolling7BarrelPct) >= 9 &&
    Number(statcastTrend.rolling7HardHitPct) >= 42
  ) {
    tags.push('barrel lane')
  }

  const primaryTag = tags[0] || (matchupGrade >= 1.5 ? 'live' : matchupGrade <= -1 ? 'suppressed' : 'thin')
  const summary = [
    buildSeasonLine(seasonStats),
    buildRecentLine(recentStats),
    buildSplitLine(splitStats, opposingPitcher?.handedness),
    pitchTypeFit?.summary ? `arsenal ${pitchTypeFit.summary}` : '',
    `${formatSigned(matchupGrade)} matchup grade in a ${pitchStyleAdjustment.note}`
  ].join(' | ')

  return {
    playerId: lineupPlayer.playerId,
    slot,
    name: lineupPlayer.name,
    position: lineupPlayer.position,
    bats: lineupPlayer.bats,
    savant: buildBaseballSavantLinks({
      playerId: lineupPlayer.playerId,
      fullName: lineupPlayer.name,
      seasonYear: season,
      type: 'hitting'
    }),
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
      pitchTypeFitScore: roundToTenths(Number(pitchTypeFit?.fitScore || 50)),
      pitchTypeGrade: roundToHundredths(Number(pitchTypeFit?.fitGrade || 0)),
      pitchTypeCoveragePct: roundToTenths(Number(pitchTypeFit?.coveragePct || 0)),
      matchupScore: roundToTenths(matchupScore),
      matchupGrade: roundToHundredths(matchupGrade)
    },
    pitchType: pitchTypeFit,
    statcastTrend: statcastTrend
      ? {
          ...statcastTrend,
          rolling7Xwoba: parseNumber(statcastTrend.rolling7Xwoba),
          rolling7Xba: parseNumber(statcastTrend.rolling7Xba),
          rolling7Xslg: parseNumber(statcastTrend.rolling7Xslg),
          rolling7BarrelPct: parseNumber(statcastTrend.rolling7BarrelPct),
          rolling7HardHitPct: parseNumber(statcastTrend.rolling7HardHitPct),
          rolling7SweetSpotPct: parseNumber(statcastTrend.rolling7SweetSpotPct),
          xwobaTrend: parseNumber(statcastTrend.xwobaTrend),
          barrelTrend: parseNumber(statcastTrend.barrelTrend),
          hardHitTrend: parseNumber(statcastTrend.hardHitTrend),
          sweetSpotTrend: parseNumber(statcastTrend.sweetSpotTrend)
        }
      : null,
    opponentContext: opponentContext
      ? {
          ...opponentContext,
          avgOpponentWinPctLast10: parseNumber(opponentContext.avgOpponentWinPctLast10),
          avgOpponentRunDiffLast10: parseNumber(opponentContext.avgOpponentRunDiffLast10),
          avgOpponentRunDiffPerGameLast10: parseNumber(opponentContext.avgOpponentRunDiffPerGameLast10),
          weightedHitsPerPaLast10: parseNumber(opponentContext.weightedHitsPerPaLast10),
          weightedTotalBasesPerPaLast10: parseNumber(opponentContext.weightedTotalBasesPerPaLast10),
          hitsPerPaWeightDeltaLast10: parseNumber(opponentContext.hitsPerPaWeightDeltaLast10),
          totalBasesPerPaWeightDeltaLast10: parseNumber(opponentContext.totalBasesPerPaWeightDeltaLast10)
        }
      : null,
    tags,
    primaryTag,
    summary,
    matchupNote: `${formatSigned(matchupGrade, 2)} vs ${opposingPitcher?.fullName || 'today’s starter'}`
  }
}

const buildLineupTeamSummary = ({
  teamName,
  lineup,
  opposingPitcher,
  opposingRelievers = [],
  pitchTypeStatsLookup = null
}) => {
  const sortedDesc = [...lineup].sort((left, right) => right.metrics.matchupGrade - left.metrics.matchupGrade)
  const sortedAsc = [...lineup].sort((left, right) => left.metrics.matchupGrade - right.metrics.matchupGrade)
  const splitEdgeFilter = (entry) => entry.tags.includes('split edge')
  const arsenalEdgeFilter = (entry) => entry.tags.includes('arsenal edge')
  const sameHandFilter = (entry) =>
    entry.bats && opposingPitcher?.handedness && entry.bats !== 'S' && entry.bats === opposingPitcher.handedness
  const oppositeHandFilter = (entry) =>
    entry.bats === 'S' ||
    (entry.bats && opposingPitcher?.handedness && entry.bats !== opposingPitcher.handedness)
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
  const platoonCount = lineup.filter(splitEdgeFilter).length
  const powerCount = lineup.filter((entry) => entry.metrics.powerScore >= 62).length
  const contactCount = lineup.filter((entry) => entry.metrics.contactScore >= 60).length
  const heaterCount = lineup.filter((entry) => entry.tags.includes('heater')).length
  const suppressorCount = underperformHitters.length
  const starterThreatCount = lineup.filter((entry) => entry.metrics.matchupGrade >= 2).length
  const switchCount = lineup.filter((entry) => entry.bats === 'S').length
  const oppositeHandCount = lineup.filter(oppositeHandFilter).length
  const sameHandCount = lineup.filter(sameHandFilter).length
  const topThirdSplitCount = lineup.slice(0, 3).filter(splitEdgeFilter).length
  const topThirdArsenalCount = lineup.slice(0, 3).filter(arsenalEdgeFilter).length
  const weightedSplitGrade = average(
    lineup
      .filter(splitEdgeFilter)
      .map((entry) => entry.metrics.matchupGrade)
  )
  const averagePitchTypeGrade = average(lineup.map((entry) => entry.metrics.pitchTypeGrade))
  const topThirdPitchTypeScore = average(lineup.slice(0, 3).map((entry) => entry.metrics.pitchTypeFitScore))
  const pitchTypeEdgeCount = lineup.filter((entry) => Number(entry.metrics.pitchTypeGrade) >= 1.2).length
  const bullpenPitchTypeSummary = buildBullpenPitchTypeSummary({
    lineup,
    pitchTypeStatsLookup,
    opposingRelievers
  })
  const bullpenPitchTypePressureIndex = Number(bullpenPitchTypeSummary?.pressureIndex)
  const platoonPressureIndex = clamp(
    50 +
      (platoonCount - 4) * 4 +
      (topThirdSplitCount - 1) * 5 +
      (oppositeHandCount - sameHandCount) * 2.2 +
      (switchCount ? switchCount * 1.4 : 0) +
      (Number.isFinite(weightedSplitGrade) ? weightedSplitGrade * 4.4 : 0),
    18,
    94
  )
  const pitchTypePressureIndex = clamp(
    50 +
      (Number.isFinite(averagePitchTypeGrade) ? averagePitchTypeGrade * 5.8 : 0) +
      (Number(topThirdPitchTypeScore || 50) - 50) * 0.6 +
      (pitchTypeEdgeCount - 3) * 3.4 +
      (topThirdArsenalCount - 1) * 4.2,
    18,
    94
  )
  const starterPressureIndex = clamp(
    46 +
      (Number(topThirdScore || 50) - 50) * 0.55 +
      (Number(depthScore || 50) - 50) * 0.15 +
      (starterThreatCount - 3) * 4 +
      (heaterCount - suppressorCount) * 2.4 +
      (powerCount - 2) * 2 +
      (Number(averageMatchupGrade || 0)) * 5.6 +
      (platoonPressureIndex - 50) * 0.24 +
      (pitchTypePressureIndex - 50) * 0.32,
    18,
    94
  )
  const overallPressureIndex = clamp(
    starterPressureIndex +
      (Number.isFinite(bullpenPitchTypePressureIndex) ? (bullpenPitchTypePressureIndex - 50) * 0.16 : 0),
    18,
    94
  )
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
  const bullpenOverperformHitters = bullpenPitchTypeSummary?.topAttackers || []
  const bullpenOverview =
    bullpenPitchTypeSummary?.overview ||
    'No strong reliever-arsenal edge has surfaced yet for the likely bridge arms.'

  return {
    aggregate: {
      averageMatchupGrade: roundToHundredths(averageMatchupGrade ?? 0),
      trackedBatters: lineup.length,
      starterThreatCount,
      contactCount,
      powerCount,
      platoonCount,
      pitchTypeEdgeCount,
      oppositeHandCount,
      sameHandCount,
      switchCount,
      topThirdSplitCount,
      topThirdArsenalCount,
      heaterCount,
      suppressorCount,
      platoonPressureIndex: roundToTenths(platoonPressureIndex),
      pitchTypePressureIndex: roundToTenths(pitchTypePressureIndex),
      bullpenPitchTypePressureIndex: Number.isFinite(bullpenPitchTypePressureIndex)
        ? roundToTenths(bullpenPitchTypePressureIndex)
        : null,
      starterPressureIndex: roundToTenths(starterPressureIndex),
      overallPressureIndex: roundToTenths(overallPressureIndex),
      topThirdScore: roundToTenths(topThirdScore ?? 50),
      depthScore: roundToTenths(depthScore ?? 50),
      bullpenOverperformHitters
    },
    summary: {
      pressureLabel,
      overperformHitters,
      bullpenOverperformHitters,
      underperformHitters,
      underperformNote,
      overview,
      bullpenOverview,
      topThirdScore: roundToTenths(topThirdScore ?? 50),
      middleScore: roundToTenths(middleScore ?? 50),
      depthScore: roundToTenths(depthScore ?? 50),
      bullpenPitchTypeSummary
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
      const pitchTypeStatsByType = playerStatMaps.pitchArsenal?.get(playerId) || null
      const statcastTrend = playerStatMaps.statcastTrends?.get(playerId) || null
      const opponentContext = playerStatMaps.opponentContext?.get(playerId) || null
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
        pitchTypeStatsByType,
        opposingPitcher,
        statcastTrend,
        opponentContext
      })
    })
    .filter(Boolean)
}

const extractSupplementalLineupPlayers = ({
  rotoSide = null,
  boxscoreSide = {},
  playerStatMaps = {},
  opposingPitcher = null,
  expectedOfficialTeam = ''
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
      const pitchTypeStatsByType = playerStatMaps.pitchArsenal?.get(playerId) || null
      const statcastTrend = playerStatMaps.statcastTrends?.get(playerId) || null
      const opponentContext = playerStatMaps.opponentContext?.get(playerId) || null
      const playerDetails = playerStatMaps.season.get(playerId) || playerStatMaps.recent.get(playerId) || null
      if (!matchesExpectedOfficialTeam({ expectedOfficialTeam, playerRecord, playerDetails })) return null
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
        pitchTypeStatsByType,
        opposingPitcher,
        statcastTrend,
        opponentContext
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
  const dayData = await loadDayData(options.date)
  const rawGames = dayData.rawGames
  const bullpenChainByTeam = dayData.bullpenChainByTeam || {}
  const recentStartDate = shiftDate(options.date, -options.recentWindowDays)
  const recentEndDate = shiftDate(options.date, -1)
  const scheduleUrl = `https://statsapi.mlb.com/api/v1/schedule?sportId=1&date=${options.date}&hydrate=team,probablePitcher`
  const schedule = await fetchJson(scheduleUrl)
  const scheduleMap = buildScheduleMap(schedule.dates || [])
  const rotoWireCards = await fetchRotoWireLineupCards()

  const feedRecords = []

  for (const rawGame of rawGames) {
    const officialKey = `${deskToOfficialTeam[rawGame.away] || rawGame.away} @ ${deskToOfficialTeam[rawGame.home] || rawGame.home}`
    const scheduleGame =
      (Number.isFinite(Number(rawGame.gamePk)) ? scheduleMap.get(`pk:${Number(rawGame.gamePk)}`) : null) ||
      scheduleMap.get(officialKey)
    if (!scheduleGame) continue

    const feed = await fetchJson(`https://statsapi.mlb.com/api/v1.1/game/${scheduleGame.gamePk}/feed/live`)
    feedRecords.push({
      rawGame,
      scheduleGame,
      feed
    })
  }

  const [hotBatterBvpRows, coldBatterBvpRows] = await Promise.all([
    fetchRotoWireBvpRows({ date: options.date, type: 'hotbatter' }),
    fetchRotoWireBvpRows({ date: options.date, type: 'coldbatter' })
  ])

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
  const starterIds = [
    ...new Set(
      rawGames
        .flatMap((game) => [game.awayPitcher?.id, game.homePitcher?.id])
        .filter((value) => Number.isFinite(Number(value)))
        .map((value) => Number(value))
    )
  ]
  const relieverIds = [
    ...new Set(
      rawGames
        .flatMap((game) => [
          ...(bullpenChainByTeam[game.away]?.topRelievers || []).map((reliever) => reliever.pitcherId),
          ...(bullpenChainByTeam[game.home]?.topRelievers || []).map((reliever) => reliever.pitcherId)
        ])
        .filter((value) => Number.isFinite(Number(value)))
        .map((value) => Number(value))
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

  const { batterPitchTypeStatsByPlayerId, pitcherPitchMixByPlayerId } = await buildPitchArsenalMaps({
    batterIds: allPlayerIds,
    pitcherIds: [...starterIds, ...relieverIds],
    year: Number(options.date.slice(0, 4))
  })
  const hitterStatcastTrendMap = fetchHitterStatcastTrendMap(options.date, allPlayerIds)
  const hitterOpponentContextMap = fetchHitterOpponentContextMap(options.date, allPlayerIds)

  const playerStatMaps = {
    season: seasonMap,
    recent: recentMap,
    vsRight: vsRightMap,
    vsLeft: vsLeftMap,
    pitchArsenal: batterPitchTypeStatsByPlayerId,
    statcastTrends: hitterStatcastTrendMap,
    opponentContext: hitterOpponentContextMap
  }

  const lineupBoardsByGameId = {}
  const lineupMatchupContextByGameId = {}

  for (const record of feedRecords) {
    const { rawGame, feed } = record
    const awayOfficial = deskToOfficialTeam[rawGame.away] || rawGame.away
    const homeOfficial = deskToOfficialTeam[rawGame.home] || rawGame.home
    const awayDesk = officialToDeskTeam[awayOfficial] || rawGame.away
    const homeDesk = officialToDeskTeam[homeOfficial] || rawGame.home
    const awayPitcher = buildPitcherProfile(
      rawGame.homePitcher,
      pitcherPitchMixByPlayerId.get(Number(rawGame.homePitcher?.id)) || null
    )
    const homePitcher = buildPitcherProfile(
      rawGame.awayPitcher,
      pitcherPitchMixByPlayerId.get(Number(rawGame.awayPitcher?.id)) || null
    )
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
      opposingPitcher: awayPitcher,
      expectedOfficialTeam: awayOfficial
    })
    const homeSupplementalLineup = extractSupplementalLineupPlayers({
      rotoSide: rotoWireCard?.home,
      boxscoreSide: homeBoxscore,
      playerStatMaps,
      opposingPitcher: homePitcher,
      expectedOfficialTeam: homeOfficial
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
    const awayOpposingRelievers = (bullpenChainByTeam[homeDesk]?.topRelievers || [])
      .map((reliever) => ({
        ...reliever,
        pitchMix: pitcherPitchMixByPlayerId.get(Number(reliever.pitcherId)) || null
      }))
      .filter((reliever) => reliever.pitchMix?.topPitches?.length)
    const homeOpposingRelievers = (bullpenChainByTeam[awayDesk]?.topRelievers || [])
      .map((reliever) => ({
        ...reliever,
        pitchMix: pitcherPitchMixByPlayerId.get(Number(reliever.pitcherId)) || null
      }))
      .filter((reliever) => reliever.pitchMix?.topPitches?.length)
    const awaySummary = awayLineup.length
      ? buildLineupTeamSummary({
          teamName: awayDesk,
          lineup: awayLineup,
          opposingPitcher: awayPitcher,
          opposingRelievers: awayOpposingRelievers,
          pitchTypeStatsLookup: playerStatMaps.pitchArsenal
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
          opposingPitcher: homePitcher,
          opposingRelievers: homeOpposingRelievers,
          pitchTypeStatsLookup: playerStatMaps.pitchArsenal
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
    const awayBvpHistory = buildBvpHistory({
      lineup: awayLineup,
      opposingPitcherId: rawGame.homePitcher?.id,
      opposingPitcherName: rawGame.homePitcher?.fullName,
      hotRows: hotBatterBvpRows,
      coldRows: coldBatterBvpRows
    })
    const homeBvpHistory = buildBvpHistory({
      lineup: homeLineup,
      opposingPitcherId: rawGame.awayPitcher?.id,
      opposingPitcherName: rawGame.awayPitcher?.fullName,
      hotRows: hotBatterBvpRows,
      coldRows: coldBatterBvpRows
    })

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
          id: rawGame.homePitcher?.id || null,
          name: awayPitcher?.fullName || '',
          hand: awayPitcher?.handedness || '',
          type: awayPitcher?.profileType || 'Unknown sample',
          pitchMixSummary:
            awayPitcher?.pitchMix?.topPitches
              ?.slice(0, 3)
              .map((pitch) => `${pitch.pitchName} ${pitch.pitchUsage.toFixed(0)}%`)
              .join(' / ') || ''
        },
        opposingRelievers: awayOpposingRelievers.map((reliever) => ({
          name: reliever.name,
          role: reliever.role,
          availabilityScore: reliever.availabilityScore,
          firstRelieverLikelihood: reliever.firstRelieverLikelihood,
          pitchMixSummary:
            reliever.pitchMix?.topPitches
              ?.slice(0, 3)
              .map((pitch) => `${pitch.pitchName} ${pitch.pitchUsage.toFixed(0)}%`)
              .join(' / ') || ''
        })),
        lineup: awayLineup,
        bvpHistory: awayBvpHistory,
        ...awaySummary
      },
      home: {
        teamName: homeDesk,
        lineupSource: homeSelection.source,
        opposingStarter: {
          id: rawGame.awayPitcher?.id || null,
          name: homePitcher?.fullName || '',
          hand: homePitcher?.handedness || '',
          type: homePitcher?.profileType || 'Unknown sample',
          pitchMixSummary:
            homePitcher?.pitchMix?.topPitches
              ?.slice(0, 3)
              .map((pitch) => `${pitch.pitchName} ${pitch.pitchUsage.toFixed(0)}%`)
              .join(' / ') || ''
        },
        opposingRelievers: homeOpposingRelievers.map((reliever) => ({
          name: reliever.name,
          role: reliever.role,
          availabilityScore: reliever.availabilityScore,
          firstRelieverLikelihood: reliever.firstRelieverLikelihood,
          pitchMixSummary:
            reliever.pitchMix?.topPitches
              ?.slice(0, 3)
              .map((pitch) => `${pitch.pitchName} ${pitch.pitchUsage.toFixed(0)}%`)
              .join(' / ') || ''
        })),
        lineup: homeLineup,
        bvpHistory: homeBvpHistory,
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
        'Official MLB feed/live batting orders plus official player season, recent, handedness split, and Statcast pitch-arsenal matchup data, supplemented by RotoWire daily lineups and weather when the official order is still missing.'
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
