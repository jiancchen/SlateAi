import { mkdir, writeFile } from 'node:fs/promises'
import { execFileSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

import { loadMlbDayGamesFromDb } from '../../../db/day-games.mjs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..', '..', '..', '..', '..')
const season = 2026
const mlbWarehousePath = path.join(rootDir, 'data-private', 'warehouse', 'sports.db')
const typedWarehouseCliPath = path.join(rootDir, 'pipeline', 'mlb', 'warehouse', 'mlb_typed_warehouse.py')
const legacyWarehouseCliPath = path.join(
  rootDir,
  'models',
  'mlb',
  'cartridges',
  'MLB-M2',
  'workflows',
  'archive-m2',
  'legacy-warehouse.mjs'
)

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
const roundToThousandths = (value) => Number(value.toFixed(3))
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

const normalizePersonNameWithoutSuffix = (value = '') =>
  normalizePersonName(value)
    .replace(/\b(jr|sr|ii|iii|iv|v)\b/g, '')
    .replace(/\s+/g, ' ')
    .trim()

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
  if (!existsSync(mlbWarehousePath)) return []
  const raw = execFileSync('sqlite3', ['-json', mlbWarehousePath, sql], {
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024
  }).trim()
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

  const [{ trend_as_of_date: trendAsOfDate } = {}] = runSqliteJson(`
    select max(as_of_date) as trend_as_of_date
    from mlb_hitter_statcast_trend_snapshots
    where as_of_date <= ${quoteSqlText(asOfDate)}
      and player_id in (${normalizedIds.join(',')})
  `)
  const resolvedAsOfDate = trendAsOfDate || asOfDate

  const rows = runSqliteJson(`
    select
      player_id,
      games_sample_7,
      pa_sample_7,
      bbe_sample_7,
      rolling_7_xwoba,
      rolling_14_xwoba,
      rolling_30_xwoba,
      rolling_7_xba,
      rolling_14_xba,
      rolling_30_xba,
      rolling_7_xslg,
      rolling_14_xslg,
      rolling_30_xslg,
      rolling_7_barrel_pct,
      rolling_14_barrel_pct,
      rolling_30_barrel_pct,
      rolling_7_hard_hit_pct,
      rolling_14_hard_hit_pct,
      rolling_30_hard_hit_pct,
      rolling_7_sweet_spot_pct,
      rolling_14_sweet_spot_pct,
      rolling_30_sweet_spot_pct,
      xwoba_trend_7_minus_30,
      barrel_trend_7_minus_30,
      hard_hit_trend_7_minus_30,
      sweet_spot_trend_7_minus_30
    from mlb_hitter_statcast_trend_snapshots
    where as_of_date = ${quoteSqlText(resolvedAsOfDate)}
      and player_id in (${normalizedIds.join(',')})
  `)

  const recentStatcastRows = runSqliteJson(`
    select
      player_id,
      count(distinct game_pk) as recent_statcast_games,
      sum(coalesce(plate_appearances, 0)) as recent_statcast_pa,
      sum(coalesce(at_bats, 0)) as recent_statcast_ab,
      sum(coalesce(home_runs, 0)) as recent_statcast_home_runs,
      sum(coalesce(batted_ball_events, 0)) as recent_statcast_bbe,
      sum(coalesce(barrels_total, 0)) as recent_statcast_barrels,
      sum(coalesce(hard_hit_events, 0)) as recent_statcast_hard_hit,
      sum(coalesce(sweet_spot_events, 0)) as recent_statcast_sweet_spot,
      sum(case when xobp is not null and coalesce(plate_appearances, 0) > 0 then xobp * plate_appearances else 0 end) /
        nullif(sum(case when xobp is not null then coalesce(plate_appearances, 0) else 0 end), 0) as recent_xobp,
      sum(case when xslg is not null and coalesce(at_bats, 0) > 0 then xslg * at_bats else 0 end) /
        nullif(sum(case when xslg is not null then coalesce(at_bats, 0) else 0 end), 0) as recent_xslg,
      sum(case when avg_launch_speed is not null and coalesce(batted_ball_events, 0) > 0 then avg_launch_speed * batted_ball_events else 0 end) /
        nullif(sum(case when avg_launch_speed is not null then coalesce(batted_ball_events, 0) else 0 end), 0) as recent_avg_launch_speed,
      sum(case when avg_launch_angle is not null and coalesce(batted_ball_events, 0) > 0 then avg_launch_angle * batted_ball_events else 0 end) /
        nullif(sum(case when avg_launch_angle is not null then coalesce(batted_ball_events, 0) else 0 end), 0) as recent_avg_launch_angle
    from mlb_hitter_statcast_game_logs
    where game_date between ${quoteSqlText(shiftDate(asOfDate, -7))} and ${quoteSqlText(asOfDate)}
      and player_id in (${normalizedIds.join(',')})
    group by player_id
  `)

  const recentStatcastByPlayerId = new Map(
    recentStatcastRows.map((row) => {
      const recentXobp = parseNumber(row.recent_xobp)
      const recentXslg = parseNumber(row.recent_xslg)
      const recentXops =
        Number.isFinite(recentXobp) && Number.isFinite(recentXslg)
          ? Number((recentXobp + recentXslg).toFixed(3))
          : null
      const recentBbeSample = Number(row.recent_statcast_bbe || 0) || 0
      const recentBarrels = Number(row.recent_statcast_barrels || 0) || 0
      const recentHardHit = Number(row.recent_statcast_hard_hit || 0) || 0
      const recentSweetSpot = Number(row.recent_statcast_sweet_spot || 0) || 0

      return [
        Number(row.player_id),
        {
          recentStatcastGames: Number(row.recent_statcast_games || 0) || 0,
          recentStatcastPa: Number(row.recent_statcast_pa || 0) || 0,
          recentStatcastAb: Number(row.recent_statcast_ab || 0) || 0,
          recentStatcastHomeRuns: Number(row.recent_statcast_home_runs || 0) || 0,
          recentBbeSample,
          recentBarrels,
          recentHardHit,
          recentSweetSpot,
          recentBarrelPct: recentBbeSample > 0 ? roundToTenths((recentBarrels / recentBbeSample) * 100) : null,
          recentHardHitPct: recentBbeSample > 0 ? roundToTenths((recentHardHit / recentBbeSample) * 100) : null,
          recentSweetSpotPct: recentBbeSample > 0 ? roundToTenths((recentSweetSpot / recentBbeSample) * 100) : null,
          recentXobp,
          recentXslg,
          recentXops,
          recentAvgExitVelocity: parseNumber(row.recent_avg_launch_speed),
          recentAvgLaunchAngle: parseNumber(row.recent_avg_launch_angle)
        }
      ]
    })
  )

  return new Map(
    rows.map((row) => {
      const playerId = Number(row.player_id)
      const recentStatcast = recentStatcastByPlayerId.get(playerId) ?? {}

      return [
        playerId,
        {
          sourceAsOfDate: resolvedAsOfDate,
          gamesSample7: Number(row.games_sample_7 || 0) || 0,
          paSample7: Number(row.pa_sample_7 || 0) || 0,
          bbeSample7: Number(row.bbe_sample_7 || 0) || 0,
          ...recentStatcast,
          rolling7Xwoba: parseNumber(row.rolling_7_xwoba),
          rolling14Xwoba: parseNumber(row.rolling_14_xwoba),
          rolling30Xwoba: parseNumber(row.rolling_30_xwoba),
          rolling7Xba: parseNumber(row.rolling_7_xba),
          rolling14Xba: parseNumber(row.rolling_14_xba),
          rolling30Xba: parseNumber(row.rolling_30_xba),
          rolling7Xslg: parseNumber(row.rolling_7_xslg),
          rolling14Xslg: parseNumber(row.rolling_14_xslg),
          rolling30Xslg: parseNumber(row.rolling_30_xslg),
          rolling7BarrelPct: parseNumber(row.rolling_7_barrel_pct),
          rolling14BarrelPct: parseNumber(row.rolling_14_barrel_pct),
          rolling30BarrelPct: parseNumber(row.rolling_30_barrel_pct),
          rolling7HardHitPct: parseNumber(row.rolling_7_hard_hit_pct),
          rolling14HardHitPct: parseNumber(row.rolling_14_hard_hit_pct),
          rolling30HardHitPct: parseNumber(row.rolling_30_hard_hit_pct),
          rolling7SweetSpotPct: parseNumber(row.rolling_7_sweet_spot_pct),
          rolling14SweetSpotPct: parseNumber(row.rolling_14_sweet_spot_pct),
          rolling30SweetSpotPct: parseNumber(row.rolling_30_sweet_spot_pct),
          xwobaTrend: parseNumber(row.xwoba_trend_7_minus_30),
          barrelTrend: parseNumber(row.barrel_trend_7_minus_30),
          hardHitTrend: parseNumber(row.hard_hit_trend_7_minus_30),
          sweetSpotTrend: parseNumber(row.sweet_spot_trend_7_minus_30),
          trendSignal: buildStatcastTrendSignal(row)
        }
      ]
    })
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

const ingestHitterCareerProfiles = (date, playerIds = []) => {
  const normalizedIds = [...new Set(playerIds.map((value) => Number(value)).filter(Number.isFinite))]
  if (!normalizedIds.length) return

  const args = [
    typedWarehouseCliPath,
    'ingest-hitter-career-profiles',
    '--date',
    date
  ]

  normalizedIds.forEach((playerId) => {
    args.push('--player-id', String(playerId))
  })

  execFileSync('python3', args, {
    cwd: rootDir,
    stdio: 'inherit'
  })
}

const ingestHitterLineupSplits = (date, lineupPath) => {
  if (!date || !lineupPath) return

  execFileSync(
    'python3',
    [
      typedWarehouseCliPath,
      'ingest-hitter-lineup-splits',
      '--date',
      date,
      '--file',
      lineupPath
    ],
    {
      cwd: rootDir,
      stdio: 'inherit'
    }
  )
}

const supplementalPlayerIdsFromLookup = (supplementalPlayerLookup = new Map()) => [
  ...new Set(
    [...supplementalPlayerLookup.values()]
      .map((entry) => Number(entry?.playerId))
      .filter(Number.isFinite)
  )
]

const fetchTrendCoveragePlayerIds = (asOfDate, playerIds = []) => {
  const normalizedIds = [...new Set(playerIds.map((value) => Number(value)).filter(Number.isFinite))]
  if (!normalizedIds.length) return new Set()

  try {
    const [{ trend_as_of_date: trendAsOfDate } = {}] = runSqliteJson(`
      select max(as_of_date) as trend_as_of_date
      from mlb_hitter_statcast_trend_snapshots
      where as_of_date <= ${quoteSqlText(asOfDate)}
        and player_id in (${normalizedIds.join(',')})
    `)
    if (!trendAsOfDate) return new Set()

    const rows = runSqliteJson(`
      select distinct player_id
      from mlb_hitter_statcast_trend_snapshots
      where as_of_date = ${quoteSqlText(trendAsOfDate)}
        and player_id in (${normalizedIds.join(',')})
    `)

    return new Set(rows.map((row) => Number(row.player_id)).filter(Number.isFinite))
  } catch (error) {
    console.warn(`Unable to inspect hitter Statcast trend coverage for ${asOfDate}:`, error.message)
    return new Set()
  }
}

const refreshSupplementalHitterStatcastContext = ({ date, playerIds = [] } = {}) => {
  const normalizedIds = [...new Set(playerIds.map((value) => Number(value)).filter(Number.isFinite))]
  if (!date || !normalizedIds.length) {
    return {
      attempted: false,
      refreshedPlayerIds: [],
      missingBefore: [],
      ok: true,
      reason: 'no supplemental or sparse lineup hitters'
    }
  }

  const coveredBefore = fetchTrendCoveragePlayerIds(date, normalizedIds)
  const missingBefore = normalizedIds.filter((playerId) => !coveredBefore.has(playerId))
  if (!missingBefore.length) {
    return {
      attempted: false,
      refreshedPlayerIds: [],
      missingBefore: [],
      ok: true,
      reason: 'supplemental/sparse hitters already have Statcast trend coverage'
    }
  }

  const startDate = shiftDate(date, -30)
  if (process.env.MLB_LINEUPS_ALLOW_BROAD_SPARSE_STATCAST_REFRESH !== '1') {
    return {
      attempted: false,
      deferred: true,
      ok: true,
      startDate,
      endDate: date,
      missingBefore,
      refreshedPlayerIds: [],
      stillMissing: missingBefore,
      reason:
        'broad 30-day Savant backfill deferred; live MLB/ESPN/Savant pitch/career hydration already ran for these hitters'
    }
  }

  try {
    console.warn(
      `[lineups] Supplemental/sparse lineup hitters missing Statcast trends (${missingBefore.join(',')}); refreshing ${startDate}..${date}.`
    )
    execFileSync(
      'node',
      [
        legacyWarehouseCliPath,
        'ingest-hitter-statcast-range',
        '--start-date',
        startDate,
        '--end-date',
        date
      ],
      {
        cwd: rootDir,
        stdio: 'inherit'
      }
    )
    execFileSync(
      'node',
      [
        legacyWarehouseCliPath,
        'derive-hitter-statcast-trends',
        '--as-of-date',
        date
      ],
      {
        cwd: rootDir,
        stdio: 'inherit'
      }
    )

    const coveredAfter = fetchTrendCoveragePlayerIds(date, normalizedIds)
    const refreshedPlayerIds = normalizedIds.filter((playerId) => coveredAfter.has(playerId))
    return {
      attempted: true,
      ok: true,
      startDate,
      endDate: date,
      missingBefore,
      refreshedPlayerIds,
      stillMissing: normalizedIds.filter((playerId) => !coveredAfter.has(playerId))
    }
  } catch (error) {
    console.warn(`Unable to refresh supplemental/sparse hitter Statcast context for ${date}:`, error.message)
    return {
      attempted: true,
      ok: false,
      startDate,
      endDate: date,
      missingBefore,
      refreshedPlayerIds: [],
      stillMissing: missingBefore,
      error: error.message
    }
  }
}

const fetchHitterCareerProfileMap = (playerIds = []) => {
  const normalizedIds = [...new Set(playerIds.map((value) => Number(value)).filter(Number.isFinite))]
  if (!normalizedIds.length) return new Map()

  const rows = runSqliteJson(`
    select
      player_id,
      full_name,
      seasons_sample,
      debut_year,
      latest_mlb_year,
      career_games,
      career_plate_appearances,
      career_hits,
      career_home_runs,
      career_total_bases,
      career_walks,
      career_strikeouts,
      career_avg,
      career_obp,
      career_slg,
      career_ops,
      career_tb_per_pa,
      career_hr_per_pa,
      career_k_rate,
      career_bb_rate,
      best_power_year,
      best_power_home_runs,
      best_power_slg,
      recent_mlb_year,
      recent_mlb_plate_appearances,
      recent_mlb_home_runs,
      recent_mlb_tb_per_pa,
      career_power_index,
      contact_risk_index,
      role_stability_index,
      repeatability_label,
      volatility_label,
      source_url,
      fetched_at
    from mlb_hitter_career_profiles
    where player_id in (${normalizedIds.join(',')})
  `)

  return new Map(
    rows.map((row) => [
      Number(row.player_id),
      {
        playerId: Number(row.player_id),
        fullName: row.full_name || '',
        seasonsSample: Number(row.seasons_sample || 0) || 0,
        debutYear: Number(row.debut_year || 0) || null,
        latestMlbYear: Number(row.latest_mlb_year || 0) || null,
        careerGames: Number(row.career_games || 0) || 0,
        careerPlateAppearances: Number(row.career_plate_appearances || 0) || 0,
        careerHits: Number(row.career_hits || 0) || 0,
        careerHomeRuns: Number(row.career_home_runs || 0) || 0,
        careerTotalBases: Number(row.career_total_bases || 0) || 0,
        careerWalks: Number(row.career_walks || 0) || 0,
        careerStrikeouts: Number(row.career_strikeouts || 0) || 0,
        careerHitRate:
          Number(row.career_plate_appearances || 0) > 0
            ? roundToHundredths((Number(row.career_hits || 0) / Number(row.career_plate_appearances || 1)) * 100) / 100
            : null,
        careerAvg: parseNumber(row.career_avg),
        careerObp: parseNumber(row.career_obp),
        careerSlg: parseNumber(row.career_slg),
        careerOps: parseNumber(row.career_ops),
        careerTbPerPa: parseNumber(row.career_tb_per_pa),
        careerHrPerPa: parseNumber(row.career_hr_per_pa),
        careerKRate: parseNumber(row.career_k_rate),
        careerBbRate: parseNumber(row.career_bb_rate),
        bestPowerYear: Number(row.best_power_year || 0) || null,
        bestPowerHomeRuns: Number(row.best_power_home_runs || 0) || 0,
        bestPowerSlg: parseNumber(row.best_power_slg),
        recentMlbYear: Number(row.recent_mlb_year || 0) || null,
        recentMlbPlateAppearances: Number(row.recent_mlb_plate_appearances || 0) || 0,
        recentMlbHomeRuns: Number(row.recent_mlb_home_runs || 0) || 0,
        recentMlbTbPerPa: parseNumber(row.recent_mlb_tb_per_pa),
        careerPowerIndex: parseNumber(row.career_power_index),
        contactRiskIndex: parseNumber(row.contact_risk_index),
        roleStabilityIndex: parseNumber(row.role_stability_index),
        repeatabilityLabel: row.repeatability_label || '',
        volatilityLabel: row.volatility_label || '',
        sourceUrl: row.source_url || '',
        fetchedAt: row.fetched_at || ''
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
      scoringPolicy: {
        usableForScoring: false,
        scoreImpact: 0,
        minAtBats: 5,
        maxAgeSeasons: 3,
        reason: 'BvP is unavailable for this lineup/starter pair.'
      },
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
    recencyStatus: 'undated-aggregate',
    scoringEligible: false,
    scoreImpact: 0,
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
    summary = `Context-only BvP sample is mixed: ${hot[0].name} owns the cleanest history, but ${cold[0].name} shows the coldest prior lane.`
  } else if (hot.length) {
    summary = `Context-only BvP: ${hot[0].name} carries the cleanest visible lane against this starter.`
  } else if (cold.length) {
    summary = `Context-only BvP: ${cold[0].name} carries the weakest visible lane against this starter.`
  }

  return {
    hot,
    cold,
    scoringPolicy: {
      usableForScoring: false,
      scoreImpact: 0,
      minAtBats: 5,
      maxAgeSeasons: 3,
      reason: 'RotoWire BvP rows in this lane are aggregate/undated; use only as context unless a dated sample within the last 3 seasons is available.'
    },
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

const weightedAverageBy = (rows = [], valueKey, weightKey) => {
  const clean = rows
    .map((row) => ({
      value: Number(row?.[valueKey]),
      weight: Math.max(Number(row?.[weightKey] || 0), 0)
    }))
    .filter((row) => Number.isFinite(row.value))
  if (!clean.length) return null
  const totalWeight = clean.reduce((sum, row) => sum + row.weight, 0)
  if (totalWeight <= 0) return average(clean.map((row) => row.value))
  return clean.reduce((sum, row) => sum + row.value * row.weight, 0) / totalWeight
}

const buildPitchTypeLeagueAverage = (rows = []) => ({
  avg: weightedAverageBy(rows, 'avg', 'plateAppearances'),
  slg: weightedAverageBy(rows, 'slg', 'plateAppearances'),
  woba: weightedAverageBy(rows, 'woba', 'plateAppearances'),
  estBa: weightedAverageBy(rows, 'estBa', 'plateAppearances'),
  estSlg: weightedAverageBy(rows, 'estSlg', 'plateAppearances'),
  estWoba: weightedAverageBy(rows, 'estWoba', 'plateAppearances'),
  hardHitPercent: weightedAverageBy(rows, 'hardHitPercent', 'plateAppearances'),
  whiffPercent: weightedAverageBy(rows, 'whiffPercent', 'pitches'),
  kPercent: weightedAverageBy(rows, 'kPercent', 'plateAppearances')
})

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
  const batterLeagueAverageByPitchType = new Map()

  await Promise.all(
    statcastPitchTypes.flatMap((pitchType) => [
      fetchPitchArsenalRows({ type: 'batter', pitchType, year }).then((rows) => {
        batterLeagueAverageByPitchType.set(pitchType, buildPitchTypeLeagueAverage(rows))
        for (const row of rows) {
          if (!batterIdSet.has(row.playerId)) continue
          if (!batterPitchTypeStatsByPlayerId.has(row.playerId)) {
            batterPitchTypeStatsByPlayerId.set(row.playerId, new Map())
          }
          batterPitchTypeStatsByPlayerId.get(row.playerId).set(pitchType, {
            ...row,
            leagueAverage: batterLeagueAverageByPitchType.get(pitchType),
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

const rawPitcherFromStarterContext = (starter = null) => {
  if (!starter) return null
  return {
    ...starter,
    id: starter.id || starter.mlbPlayerId || null,
    fullName: starter.fullName || starter.name || '',
    name: starter.name || starter.fullName || '',
    pitchHand: starter.pitchHand || starter.throws || '',
    probableSource: starter.probableSource || starter.sourceName || 'typed-db'
  }
}

const rawGameFromDbGame = (game = {}) => {
  const titleTeams = String(game.title || '').split(/\s+@\s+/)
  const matchupTeams = Array.isArray(game.matchup) ? game.matchup : []
  const away = matchupTeams.find((entry) => entry?.side === 'Away')?.name || titleTeams[0] || ''
  const home = matchupTeams.find((entry) => entry?.side === 'Home')?.name || titleTeams[1] || ''
  return {
    id: game.id,
    gamePk: game.gamePk,
    away,
    home,
    awayPitcher: rawPitcherFromStarterContext(game.starterContext?.away),
    homePitcher: rawPitcherFromStarterContext(game.starterContext?.home)
  }
}

const loadDayData = async (date) => {
  const dataPath = path.join(rootDir, 'web', 'src', 'lib', `day-${date}-data.js`)
  if (existsSync(dataPath)) {
    const modulePath = pathToFileURL(dataPath).href
    return import(modulePath)
  }
  const dbGames = await loadMlbDayGamesFromDb(date)
  return {
    rawGames: dbGames.map(rawGameFromDbGame),
    bullpenChainByTeam: {}
  }
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

const espnStatNumber = (row = {}, statName = '') => {
  const stat = (row.stats || []).find(
    (entry) => entry?.name === statName || entry?.label === statName
  )
  return parseNumber(stat?.value)
}

const findEspnCategory = (espnSplits = null, key = '') =>
  (Array.isArray(espnSplits?.categories) ? espnSplits.categories : []).find((category) => category?.key === key) || null

const buildPitcherBatterSideSplits = (espnSplits = null) => {
  const category = findEspnCategory(espnSplits, 'byRightLeft')
  const rows = Array.isArray(category?.rows) ? category.rows : []
  const output = {}

  for (const row of rows) {
    const label = `${row?.label || ''}`
    const side = /left/i.test(label) ? 'L' : /right/i.test(label) ? 'R' : ''
    if (!side) continue

    const atBats = espnStatNumber(row, 'atBats')
    const hits = espnStatNumber(row, 'hits')
    const walks = espnStatNumber(row, 'walks')
    const strikeouts = espnStatNumber(row, 'strikeouts')
    const homeRuns = espnStatNumber(row, 'homeRuns')
    const avg = espnStatNumber(row, 'avg')
    const obp = espnStatNumber(row, 'onBasePct')
    const slg = espnStatNumber(row, 'slugAvg')
    const ops = espnStatNumber(row, 'OPS')

    output[side] = {
      side,
      label,
      atBats: Number.isFinite(atBats) ? atBats : null,
      hits: Number.isFinite(hits) ? hits : null,
      walks: Number.isFinite(walks) ? walks : null,
      strikeouts: Number.isFinite(strikeouts) ? strikeouts : null,
      homeRuns: Number.isFinite(homeRuns) ? homeRuns : null,
      avg: Number.isFinite(avg) ? roundToThousandths(avg) : null,
      obp: Number.isFinite(obp) ? roundToThousandths(obp) : null,
      slg: Number.isFinite(slg) ? roundToThousandths(slg) : null,
      ops: Number.isFinite(ops) ? roundToThousandths(ops) : null,
      homeRunRate: Number.isFinite(homeRuns) && Number.isFinite(atBats) && atBats > 0
        ? roundToThousandths(homeRuns / atBats)
        : null
    }
  }

  return {
    source: espnSplits?.source || 'ESPN player splits',
    sourceStatus: espnSplits?.sourceStatus || '',
    sourceUrl: espnSplits?.sourceUrl || '',
    L: output.L || null,
    R: output.R || null
  }
}

const buildPitcherProfile = (starterContext = null, pitchMix = null) => {
  if (!starterContext) return null

  const handedness = normalizePitchHand(starterContext.pitchHand)
  const batterSideSplits = buildPitcherBatterSideSplits(starterContext.espnSplits)
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
  const homeRunsPerNine =
    inningsFloat > 0 && Number.isFinite(homeRunsAllowed) ? (homeRunsAllowed / inningsFloat) * 9 : null
  const whip = parseNumber(starterContext.whip)
  const era = parseNumber(starterContext.era)
  const recentStarts = Array.isArray(starterContext.startHistoryLast5) ? starterContext.startHistoryLast5 : []
  const recentHomeRunsAllowed = recentStarts.reduce(
    (sum, start) => sum + (Number.isFinite(Number(start.homeRunsAllowed)) ? Number(start.homeRunsAllowed) : 0),
    0
  )
  const recentOutsRecorded = recentStarts.reduce(
    (sum, start) => sum + (Number.isFinite(Number(start.outsRecorded)) ? Number(start.outsRecorded) : 0),
    0
  )
  const recentInningsFloat = recentOutsRecorded > 0
    ? recentOutsRecorded / 3
    : recentStarts.reduce(
        (sum, start) => sum + (Number.isFinite(Number(start.inningsPitched)) ? Number(start.inningsPitched) : 0),
        0
      )
  const recentHomeRunsAllowedPerStart = recentStarts.length > 0 ? recentHomeRunsAllowed / recentStarts.length : null
  const recentHomeRunsPerNine =
    recentInningsFloat > 0 ? (recentHomeRunsAllowed / recentInningsFloat) * 9 : null
  const homeRunDamageLabel =
    !Number.isFinite(homeRunsPerNine)
      ? 'HR sample N/A'
      : homeRunsPerNine <= 0.8
        ? 'HR suppressor'
        : homeRunsPerNine <= 1.1
          ? 'HR neutral'
          : homeRunsPerNine <= 1.4
            ? 'HR leak'
            : 'HR-prone'

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
    homeRunsPerNine: Number.isFinite(homeRunsPerNine) ? roundToHundredths(homeRunsPerNine) : null,
    recentHomeRunsAllowed,
    recentHomeRunsAllowedPerStart: Number.isFinite(recentHomeRunsAllowedPerStart)
      ? roundToHundredths(recentHomeRunsAllowedPerStart)
      : null,
    recentHomeRunsPerNine: Number.isFinite(recentHomeRunsPerNine) ? roundToHundredths(recentHomeRunsPerNine) : null,
    homeRunDamageLabel,
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
    batterSideSplits,
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
  const starterLinkMatch = listHtml.match(/lineup__player-highlight-name">[\s\S]*?<a[^>]*href="([^"]+)"[^>]*>([^<]+)<\/a>/i)
  const starterThrowMatch = listHtml.match(/<span class="lineup__throws">([^<]+)<\/span>/i)
  const starterStatMatch = listHtml.match(/lineup__player-highlight-stats">\s*([\s\S]*?)\s*<\/div>/i)
  const starterStatHtml = starterStatMatch?.[1] || ''
  const starterRoleMatch = starterStatHtml.match(/<div class="tag"[^>]*>\s*([^<]+)\s*<\/div>/i)
  const starterStatText = stripTags(starterStatHtml)
  const starterRoleLabel = starterRoleMatch
    ? stripTags(starterRoleMatch[1]).toUpperCase()
    : /\bPRIM\b/i.test(starterStatText)
      ? 'PRIM'
      : ''
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
      name: starterLinkMatch ? stripTags(starterLinkMatch[2]) : '',
      throws: starterThrowMatch ? stripTags(starterThrowMatch[1]) : '',
      statLine: starterStatMatch ? starterStatText.replace(/\bPRIM\b/gi, '').replace(/\s+/g, ' ').trim() : '',
      roleLabel: starterRoleLabel,
      role: starterRoleLabel === 'PRIM' ? 'primary' : 'starter',
      rotowirePlayerId: starterLinkMatch?.[1]?.match(/-(\d+)(?:\?|$)/)?.[1] || ''
    },
    players
  }
}

const pitcherNameKey = (value = '') => normalizePersonNameWithoutSuffix(value)

const resolveRotoWireStarter = ({ rotoSide = null, boxscoreSide = {}, fallbackStarter = null } = {}) => {
  const rotoStarter = rotoSide?.starter || null
  if (!rotoStarter?.name) {
    return {
      source: 'mlb-probable',
      role: 'starter',
      starter: fallbackStarter || null,
      opener: null,
      note: ''
    }
  }

  const lookup = buildRosterLookup(boxscoreSide)
  const rosterEntry =
    lookup.get(pitcherNameKey(rotoStarter.name)) ||
    lookup.get(normalizePersonName(rotoStarter.name)) ||
    null
  const playerRecord = rosterEntry?.playerRecord || {}
  const playerId = rosterEntry?.playerId || null
  const fallbackId = Number(fallbackStarter?.id || 0)
  const primaryRole = rotoStarter.role === 'primary'
  const differsFromMlb = Boolean(playerId && fallbackId && Number(playerId) !== fallbackId)
  const starter = {
    id: playerId || fallbackStarter?.id || null,
    fullName: playerRecord?.person?.fullName || rotoStarter.name || fallbackStarter?.fullName || '',
    pitchHand:
      rotoStarter.throws ||
      playerRecord?.person?.pitchHand?.code ||
      playerRecord?.pitchHand?.code ||
      fallbackStarter?.pitchHand ||
      '',
    statLine: rotoStarter.statLine || '',
    sourceRole: primaryRole ? 'rotowire-primary' : 'rotowire-listed',
    roleLabel: rotoStarter.roleLabel || '',
    role: primaryRole ? 'primary' : 'starter',
    rotowirePlayerId: rotoStarter.rotowirePlayerId || ''
  }
  const opener =
    primaryRole && differsFromMlb && fallbackStarter
      ? {
          id: fallbackStarter.id || null,
          name: fallbackStarter.fullName || '',
          hand: fallbackStarter.pitchHand || '',
          role: 'mlb-listed-opener',
          note: `${fallbackStarter.fullName || 'MLB-listed arm'} is the MLB-listed first pitcher; ${starter.fullName} is the RotoWire primary/bulk pitcher.`
        }
      : null

  return {
    source: primaryRole ? 'rotowire-primary' : 'rotowire-listed',
    role: starter.role,
    starter,
    opener,
    differsFromMlb,
    note: opener?.note || ''
  }
}

const starterContextFromRotoWireResolution = ({ resolution = null, fallbackStarter = null, pitcherSeasonMap = new Map() } = {}) => {
  if (!resolution?.starter?.id || resolution.source !== 'rotowire-primary') {
    return fallbackStarter || null
  }
  if (Number(fallbackStarter?.id || 0) === Number(resolution.starter.id)) {
    return fallbackStarter || null
  }

  const seasonContext = normalizePitchingSeasonStat(pitcherSeasonMap.get(Number(resolution.starter.id)) || {})
  return {
    ...(seasonContext || {}),
    id: Number(resolution.starter.id),
    fullName: resolution.starter.fullName || seasonContext?.fullName || '',
    pitchHand: resolution.starter.pitchHand || seasonContext?.pitchHand || '',
    statLine: resolution.starter.statLine || '',
    probableSource: 'rotowire-primary',
    openerContext: resolution.opener,
    starterRoleContext: {
      source: resolution.source,
      role: resolution.role,
      roleLabel: resolution.starter.roleLabel || '',
      note: resolution.note || ''
    }
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

const normalizePitchingSeasonStat = (person = {}) => {
  const stat = person?.stats?.[0]?.splits?.[0]?.stat || null
  if (!stat) return null

  return {
    id: person.id || null,
    fullName: person.fullName || person.person?.fullName || '',
    pitchHand: person.pitchHand?.code || person.pitchHand?.description || '',
    wins: Number(stat.wins || 0),
    losses: Number(stat.losses || 0),
    era: stat.era || '',
    strikeOuts: Number(stat.strikeOuts ?? stat.strikeouts ?? 0),
    inningsPitched: stat.inningsPitched || '0.0',
    hitsAllowed: Number(stat.hits || 0),
    walks: Number(stat.baseOnBalls ?? stat.walks ?? 0),
    homeRunsAllowed: Number(stat.homeRuns || 0),
    whip: stat.whip || '',
    gamesStarted: Number(stat.gamesStarted || 0),
    probableSource: 'rotowire-primary'
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

const extractEspnAthleteId = (player = {}) =>
  String(player?.uid || '').match(/a:(\d+)/)?.[1] ||
  String(player?.link?.web || '').match(/id\/(\d+)/)?.[1] ||
  ''

const resolveEspnHitterId = async (player = {}) => {
  const fullName = player?.fullName || player?.person?.fullName || ''
  if (!fullName) return { espnId: '', status: 'missing-name' }

  const searchUrl = `https://site.api.espn.com/apis/search/v2?query=${encodeURIComponent(fullName)}&limit=10`
  try {
    const payload = await fetchJson(searchUrl)
    const players = (payload.results || []).find((entry) => entry.type === 'player')?.contents || []
    const normalizedName = normalizePersonNameWithoutSuffix(fullName)
    const mlbPlayers = players.filter(
      (candidate) => candidate.defaultLeagueSlug === 'mlb' || candidate.description === 'MLB'
    )
    const exact =
      mlbPlayers.find((candidate) => normalizePersonNameWithoutSuffix(candidate.displayName || '') === normalizedName) ||
      mlbPlayers[0]
    const espnId = extractEspnAthleteId(exact)

    return {
      espnId,
      status: espnId ? 'search' : 'missing-espn-athlete',
      searchName: exact?.displayName || '',
      searchTeam: exact?.subtitle || '',
      searchUrl: exact?.link?.web || ''
    }
  } catch (error) {
    return { espnId: '', status: 'search-error', error: error.message }
  }
}

const espnPayloadStatNumber = (row = {}, labels = [], names = [], statName = '') => {
  const index = names.findIndex((name, statIndex) => name === statName || labels[statIndex] === statName)
  if (index < 0) return null
  return parseNumber(row.stats?.[index])
}

const normalizeEspnHitterSplitRow = ({ row = {}, labels = [], names = [], side = '', source = {} }) => {
  const atBats = espnPayloadStatNumber(row, labels, names, 'atBats')
  const hits = espnPayloadStatNumber(row, labels, names, 'hits')
  const runs = espnPayloadStatNumber(row, labels, names, 'runs')
  const doubles = espnPayloadStatNumber(row, labels, names, 'doubles')
  const triples = espnPayloadStatNumber(row, labels, names, 'triples')
  const homeRuns = espnPayloadStatNumber(row, labels, names, 'homeRuns')
  const rbi = espnPayloadStatNumber(row, labels, names, 'RBIs')
  const walks = espnPayloadStatNumber(row, labels, names, 'walks')
  const hitByPitch = espnPayloadStatNumber(row, labels, names, 'hitByPitch')
  const strikeouts = espnPayloadStatNumber(row, labels, names, 'strikeouts')
  const stolenBases = espnPayloadStatNumber(row, labels, names, 'stolenBases')
  const caughtStealing = espnPayloadStatNumber(row, labels, names, 'caughtStealing')
  const avg = espnPayloadStatNumber(row, labels, names, 'avg')
  const obp = espnPayloadStatNumber(row, labels, names, 'onBasePct')
  const slg = espnPayloadStatNumber(row, labels, names, 'slugAvg')
  const ops = espnPayloadStatNumber(row, labels, names, 'OPS')
  const plateAppearances =
    (Number.isFinite(atBats) ? atBats : 0) +
    (Number.isFinite(walks) ? walks : 0) +
    (Number.isFinite(hitByPitch) ? hitByPitch : 0)

  return {
    source: source.source || 'ESPN player splits',
    sourceStatus: source.sourceStatus || '',
    sourceUrl: source.sourceUrl || '',
    espnAthleteId: source.espnAthleteId || '',
    side,
    label: row.displayName || row.name || '',
    atBats: Number.isFinite(atBats) ? atBats : null,
    plateAppearances: plateAppearances > 0 ? plateAppearances : null,
    runs: Number.isFinite(runs) ? runs : null,
    hits: Number.isFinite(hits) ? hits : null,
    doubles: Number.isFinite(doubles) ? doubles : null,
    triples: Number.isFinite(triples) ? triples : null,
    homeRuns: Number.isFinite(homeRuns) ? homeRuns : null,
    rbi: Number.isFinite(rbi) ? rbi : null,
    walks: Number.isFinite(walks) ? walks : null,
    hitByPitch: Number.isFinite(hitByPitch) ? hitByPitch : null,
    strikeouts: Number.isFinite(strikeouts) ? strikeouts : null,
    stolenBases: Number.isFinite(stolenBases) ? stolenBases : null,
    caughtStealing: Number.isFinite(caughtStealing) ? caughtStealing : null,
    avg: Number.isFinite(avg) ? roundToThousandths(avg) : null,
    obp: Number.isFinite(obp) ? roundToThousandths(obp) : null,
    slg: Number.isFinite(slg) ? roundToThousandths(slg) : null,
    ops: Number.isFinite(ops) ? roundToThousandths(ops) : null,
    hitRate: Number.isFinite(hits) && plateAppearances > 0 ? roundToThousandths(hits / plateAppearances) : null,
    homeRunRate: Number.isFinite(homeRuns) && plateAppearances > 0 ? roundToThousandths(homeRuns / plateAppearances) : null,
    homeRunRatePerAtBat: Number.isFinite(homeRuns) && Number.isFinite(atBats) && atBats > 0
      ? roundToThousandths(homeRuns / atBats)
      : null,
    walkRate: Number.isFinite(walks) && plateAppearances > 0 ? roundToThousandths(walks / plateAppearances) : null,
    kRate: Number.isFinite(strikeouts) && plateAppearances > 0 ? roundToThousandths(strikeouts / plateAppearances) : null
  }
}

const buildEspnHitterSideSplits = ({ payload = {}, espnAthleteId = '', sourceUrl = '' } = {}) => {
  const labels = payload.extraPlayerPageAthleteSplits?.batting?.labels || payload.labels || []
  const names = payload.extraPlayerPageAthleteSplits?.batting?.names || payload.names || []
  const categories = payload.splitCategories || []
  const category =
    categories.find((entry) => entry.name === 'byBreakdown') ||
    categories.find((entry) => entry.displayName === 'Right / Left') ||
    categories.find((entry) => entry.name === 'byRightLeft')
  const rows = Array.isArray(category?.splits) ? category.splits : []
  const source = {
    source: 'ESPN player splits',
    sourceStatus: rows.length ? 'fetched' : 'empty-splits',
    sourceUrl,
    espnAthleteId
  }
  const byPitcherHand = {}

  for (const row of rows) {
    const label = `${row.displayName || row.name || ''}`
    const side = /left/i.test(label) ? 'L' : /right/i.test(label) ? 'R' : ''
    if (!side) continue
    byPitcherHand[side] = normalizeEspnHitterSplitRow({ row, labels, names, side, source })
  }

  return {
    ...source,
    category: category?.name || '',
    L: byPitcherHand.L || null,
    R: byPitcherHand.R || null
  }
}

const fetchEspnHitterSplitMap = async ({ playerIds = [], peopleMap = new Map() } = {}) => {
  const normalizedIds = [...new Set(playerIds.map((value) => Number(value)).filter(Number.isFinite))]
  const output = new Map()

  for (const group of batch(normalizedIds, 8)) {
    await Promise.all(
      group.map(async (playerId) => {
        const person = peopleMap.get(playerId)
        const resolved = await resolveEspnHitterId(person)
        if (!resolved.espnId) {
          output.set(playerId, {
            source: 'ESPN player splits',
            sourceStatus: resolved.status,
            espnAthleteId: '',
            sourceUrl: '',
            L: null,
            R: null
          })
          return
        }

        const sourceUrl = `https://www.espn.com/mlb/player/splits/_/id/${resolved.espnId}/${toSlug(person?.fullName || '')}`
        const apiUrl = `https://site.web.api.espn.com/apis/common/v3/sports/baseball/mlb/athletes/${resolved.espnId}/splits`
        try {
          const payload = await fetchJson(apiUrl)
          output.set(
            playerId,
            buildEspnHitterSideSplits({
              payload,
              espnAthleteId: resolved.espnId,
              sourceUrl
            })
          )
        } catch (error) {
          output.set(playerId, {
            source: 'ESPN player splits',
            sourceStatus: 'fetch-error',
            espnAthleteId: resolved.espnId,
            sourceUrl,
            error: error.message,
            L: null,
            R: null
          })
        }
      })
    )
  }

  return output
}

const getStatRecord = (peopleMap, playerId) => {
  const person = peopleMap.get(playerId)
  if (!person) return null
  return aggregateStatSplits(person.stats?.[0]?.splits || [])
}

const hasUsableStatRecord = (peopleMap, playerId) =>
  Number(getStatRecord(peopleMap, playerId)?.plateAppearances || 0) > 0 ||
  Number(getStatRecord(peopleMap, playerId)?.atBats || 0) > 0

const hasEspnHitterSplit = (splitContext = null) =>
  Boolean(
    splitContext &&
      ((Number(splitContext.L?.plateAppearances || splitContext.L?.atBats || 0) > 0) ||
        (Number(splitContext.R?.plateAppearances || splitContext.R?.atBats || 0) > 0))
  )

const buildHitterDataCoverageMap = ({
  playerIds = [],
  supplementalPlayerIds = [],
  sparseLivePlayerIds = [],
  supplementalRefreshReport = null,
  playerStatMaps = {}
} = {}) => {
  const supplementalSet = new Set(supplementalPlayerIds.map((value) => Number(value)).filter(Number.isFinite))
  const sparseLiveSet = new Set(sparseLivePlayerIds.map((value) => Number(value)).filter(Number.isFinite))
  const refreshAttemptSet = new Set(
    (supplementalRefreshReport?.missingBefore || []).map((value) => Number(value)).filter(Number.isFinite)
  )
  const refreshResolvedSet = new Set(
    (supplementalRefreshReport?.refreshedPlayerIds || []).map((value) => Number(value)).filter(Number.isFinite)
  )
  const output = new Map()

  for (const rawPlayerId of playerIds) {
    const playerId = Number(rawPlayerId)
    if (!Number.isFinite(playerId)) continue

    const seasonStatsPresent = hasUsableStatRecord(playerStatMaps.season, playerId)
    const recentStatsPresent = hasUsableStatRecord(playerStatMaps.recent, playerId)
    const vsLeftPresent = hasUsableStatRecord(playerStatMaps.vsLeft, playerId)
    const vsRightPresent = hasUsableStatRecord(playerStatMaps.vsRight, playerId)
    const pitchArsenalPresent = Boolean(playerStatMaps.pitchArsenal?.get(playerId)?.size)
    const espnSplitContext = playerStatMaps.espnHitterSplits?.get(playerId) || null
    const careerProfile = playerStatMaps.careerProfiles?.get(playerId) || null
    const statcastTrend = playerStatMaps.statcastTrends?.get(playerId) || null
    const opponentContext = playerStatMaps.opponentContext?.get(playerId) || null
    const presentSources = [
      seasonStatsPresent ? 'mlb-season' : null,
      recentStatsPresent ? 'mlb-recent' : null,
      vsLeftPresent || vsRightPresent ? 'mlb-lr-splits' : null,
      pitchArsenalPresent ? 'savant-pitch-arsenal' : null,
      hasEspnHitterSplit(espnSplitContext) ? 'espn-lr-splits' : null,
      careerProfile?.careerPlateAppearances ? 'mlb-career-profile' : null,
      statcastTrend ? 'savant-statcast-trends' : null,
      opponentContext ? 'opponent-context' : null
    ].filter(Boolean)

    output.set(playerId, {
      playerId,
      liveHydrationAttempted: true,
      supplementalRotoWire: supplementalSet.has(playerId),
      sparseLineupHitter: sparseLiveSet.has(playerId),
      sourceStatus: supplementalSet.has(playerId)
        ? 'rotowire-supplemental-resolved-and-hydrated'
        : sparseLiveSet.has(playerId)
          ? 'sparse-lineup-hitter-live-sources-checked'
          : 'standard-lineup-hydrated',
      refreshAttempted: Boolean(supplementalRefreshReport?.attempted && refreshAttemptSet.has(playerId)),
      refreshResolved: refreshResolvedSet.has(playerId),
      refreshDeferred: Boolean(supplementalRefreshReport?.deferred && refreshAttemptSet.has(playerId)),
      refreshOk: supplementalRefreshReport?.attempted ? Boolean(supplementalRefreshReport.ok) : true,
      presentSources,
      missingSources: [
        seasonStatsPresent ? null : 'mlb-season',
        recentStatsPresent ? null : 'mlb-recent',
        vsLeftPresent || vsRightPresent ? null : 'mlb-lr-splits',
        pitchArsenalPresent ? null : 'savant-pitch-arsenal',
        hasEspnHitterSplit(espnSplitContext) ? null : 'espn-lr-splits',
        careerProfile?.careerPlateAppearances ? null : 'mlb-career-profile',
        statcastTrend ? null : 'savant-statcast-trends',
        opponentContext ? null : 'opponent-context'
      ].filter(Boolean),
      espnSplitStatus: espnSplitContext?.sourceStatus || '',
      careerPlateAppearances: Number(careerProfile?.careerPlateAppearances || 0) || 0,
      statcastTrendAsOfDate: statcastTrend?.sourceAsOfDate || '',
      note:
        supplementalSet.has(playerId) && !presentSources.length
          ? 'RotoWire-only hitter was resolved, but public sources returned no usable MLB sample.'
          : sparseLiveSet.has(playerId) && !presentSources.length
            ? 'Lineup hitter was hydrated from public sources, but sources returned no usable MLB sample.'
          : ''
    })
  }

  return output
}

const buildBatterHandCode = (person = {}) => person?.batSide?.code || ''

const buildRosterLookup = (boxscoreSide = {}) => {
  const lookup = new Map()

  for (const playerRecord of Object.values(boxscoreSide.players || {})) {
    const fullName = playerRecord?.person?.fullName
    const playerId = playerRecord?.person?.id
    if (!fullName || !playerId) continue

    const entry = {
      playerId,
      playerRecord
    }
    lookup.set(normalizePersonName(fullName), entry)
    const suffixlessKey = normalizePersonNameWithoutSuffix(fullName)
    if (suffixlessKey && !lookup.has(suffixlessKey)) {
      lookup.set(suffixlessKey, entry)
    }
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

const rotoHitterResolutionKey = (expectedOfficialTeam = '', playerName = '') => {
  const teamKey = normalizePersonName(expectedOfficialTeam)
  const nameKey = normalizePersonNameWithoutSuffix(playerName) || normalizePersonName(playerName)
  return `${teamKey}:${nameKey}`
}

const syntheticPlayerRecordFromPerson = (person = {}) => ({
  person: {
    id: person.id,
    fullName: person.fullName
  },
  position: person.primaryPosition || null,
  parentTeamName: person.currentTeam?.name || '',
  team: person.currentTeam || null
})

const resolveSupplementalRotoPlayer = (supplementalPlayerLookup = null, expectedOfficialTeam = '', playerName = '') => {
  if (!supplementalPlayerLookup) return null
  return supplementalPlayerLookup.get(rotoHitterResolutionKey(expectedOfficialTeam, playerName)) || null
}

const fetchRotoWireSupplementalPlayerResolutions = async ({ feedRecords = [], rotoWireCards = new Map() } = {}) => {
  const candidates = new Map()

  for (const record of feedRecords) {
    const awayOfficial = deskToOfficialTeam[record.rawGame.away] || record.rawGame.away
    const homeOfficial = deskToOfficialTeam[record.rawGame.home] || record.rawGame.home
    const card = rotoWireCards.get(`${awayOfficial} @ ${homeOfficial}`) || null
    const sides = [
      {
        expectedOfficialTeam: awayOfficial,
        boxscoreSide: record.feed.liveData?.boxscore?.teams?.away || {},
        rotoSide: card?.away || null
      },
      {
        expectedOfficialTeam: homeOfficial,
        boxscoreSide: record.feed.liveData?.boxscore?.teams?.home || {},
        rotoSide: card?.home || null
      }
    ]

    for (const side of sides) {
      if (!side.rotoSide?.players?.length) continue
      const rosterLookup = buildRosterLookup(side.boxscoreSide)
      for (const player of side.rotoSide.players) {
        const exactKey = normalizePersonName(player.name)
        const rosterEntry = rosterLookup.get(exactKey) || rosterLookup.get(normalizePersonNameWithoutSuffix(player.name))
        if (rosterEntry?.playerId) continue
        const key = rotoHitterResolutionKey(side.expectedOfficialTeam, player.name)
        if (!candidates.has(key)) {
          candidates.set(key, {
            key,
            expectedOfficialTeam: side.expectedOfficialTeam,
            name: player.name
          })
        }
      }
    }
  }

  const output = new Map()
  for (const candidate of candidates.values()) {
    try {
      const response = await fetchJson(
        `https://statsapi.mlb.com/api/v1/people/search?names=${encodeURIComponent(candidate.name)}&hydrate=currentTeam`
      )
      const expectedTeamKey = normalizePersonName(candidate.expectedOfficialTeam)
      const person = (response.people || []).find((entry) => {
        if (!entry?.id || !entry?.fullName) return false
        const teamMatches = normalizePersonName(entry.currentTeam?.name || '') === expectedTeamKey
        const nameMatches =
          normalizePersonNameWithoutSuffix(entry.fullName) === normalizePersonNameWithoutSuffix(candidate.name) ||
          normalizePersonName(entry.fullName) === normalizePersonName(candidate.name)
        return teamMatches && nameMatches
      })
      if (!person) continue
      output.set(candidate.key, {
        playerId: Number(person.id),
        playerRecord: syntheticPlayerRecordFromPerson(person),
        source: 'rotowire-statsapi-name-resolution'
      })
    } catch (error) {
      console.warn(`Unable to resolve RotoWire hitter ${candidate.name} (${candidate.expectedOfficialTeam}):`, error.message)
    }
  }

  return output
}

const mapRotoLineupPlayerIds = (rotoSide = null, boxscoreSide = {}, supplementalPlayerLookup = null, expectedOfficialTeam = '') => {
  if (!rotoSide?.players?.length) return []

  const rosterLookup = buildRosterLookup(boxscoreSide)

  return rotoSide.players
    .map((player) => {
      const exactKey = normalizePersonName(player.name)
      return (
        rosterLookup.get(exactKey)?.playerId ||
        rosterLookup.get(normalizePersonNameWithoutSuffix(player.name))?.playerId ||
        resolveSupplementalRotoPlayer(supplementalPlayerLookup, expectedOfficialTeam, player.name)?.playerId
      )
    })
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

const buildCareerLine = (profile = null, seasonStats = null) => {
  if (!profile || !Number(profile.careerPlateAppearances)) return 'Career profile pending'
  const seasonPa = Number(seasonStats?.plateAppearances || 0) || 0
  const sampleLabel = seasonPa < 24 ? 'tiny 2026 sample' : seasonPa < 80 ? 'shallow 2026 sample' : '2026 sample ok'
  const powerLabel = Number.isFinite(Number(profile.careerPowerIndex))
    ? `power ${Number(profile.careerPowerIndex).toFixed(0)}`
    : 'power pending'
  return `career ${profile.careerPlateAppearances} PA | ${formatRate(profile.careerOps)} OPS | ${profile.careerHomeRuns} HR | ${profile.repeatabilityLabel || 'profile stored'} | ${powerLabel} | ${sampleLabel}`
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
      const leagueAverage = batterPitch.leagueAverage || {}
      const xbaDelta = Number.isFinite(batterPitch.estBa) && Number.isFinite(leagueAverage.estBa)
        ? batterPitch.estBa - leagueAverage.estBa
        : null
      const xslgDelta = Number.isFinite(batterPitch.estSlg) && Number.isFinite(leagueAverage.estSlg)
        ? batterPitch.estSlg - leagueAverage.estSlg
        : null
      const xwobaDelta = Number.isFinite(batterPitch.estWoba) && Number.isFinite(leagueAverage.estWoba)
        ? batterPitch.estWoba - leagueAverage.estWoba
        : null
      const hardHitDelta = Number.isFinite(batterPitch.hardHitPercent) && Number.isFinite(leagueAverage.hardHitPercent)
        ? batterPitch.hardHitPercent - leagueAverage.hardHitPercent
        : null
      const whiffDelta = Number.isFinite(batterPitch.whiffPercent) && Number.isFinite(leagueAverage.whiffPercent)
        ? batterPitch.whiffPercent - leagueAverage.whiffPercent
        : null
      const kDelta = Number.isFinite(batterPitch.kPercent) && Number.isFinite(leagueAverage.kPercent)
        ? batterPitch.kPercent - leagueAverage.kPercent
        : null
      const leagueScore = clamp(
        50 +
          Number(xwobaDelta || 0) * 230 +
          Number(xslgDelta || 0) * 95 +
          Number(hardHitDelta || 0) * 0.48 -
          Number(whiffDelta || 0) * 0.32 -
          Number(kDelta || 0) * 0.24,
        18,
        94
      )
      const leagueGrade = clamp((leagueScore - 50) / 5.4, -8, 10)
      const fitGrade = clamp((batterFitScore - pitcherQualityScore) / 5.5 + leagueGrade * 0.22, -8, 10)

      return {
        ...pitch,
        batterFitScore: roundToTenths(batterFitScore),
        batterLeagueScore: roundToTenths(leagueScore),
        leagueGrade: roundToHundredths(leagueGrade),
        batterWoba: Number.isFinite(batterPitch.woba) ? roundToThousandths(batterPitch.woba) : null,
        batterXba: Number.isFinite(batterPitch.estBa) ? roundToThousandths(batterPitch.estBa) : null,
        batterXslg: Number.isFinite(batterPitch.estSlg) ? roundToThousandths(batterPitch.estSlg) : null,
        batterEstWoba: Number.isFinite(batterPitch.estWoba) ? roundToThousandths(batterPitch.estWoba) : null,
        batterHardHit: Number.isFinite(batterPitch.hardHitPercent) ? roundToTenths(batterPitch.hardHitPercent) : null,
        batterWhiff: Number.isFinite(batterPitch.whiffPercent) ? roundToTenths(batterPitch.whiffPercent) : null,
        leagueAverage: {
          xba: Number.isFinite(leagueAverage.estBa) ? roundToThousandths(leagueAverage.estBa) : null,
          xslg: Number.isFinite(leagueAverage.estSlg) ? roundToThousandths(leagueAverage.estSlg) : null,
          xwoba: Number.isFinite(leagueAverage.estWoba) ? roundToThousandths(leagueAverage.estWoba) : null,
          hardHit: Number.isFinite(leagueAverage.hardHitPercent) ? roundToTenths(leagueAverage.hardHitPercent) : null
        },
        vsLeague: {
          xbaDelta: Number.isFinite(xbaDelta) ? roundToThousandths(xbaDelta) : null,
          xslgDelta: Number.isFinite(xslgDelta) ? roundToThousandths(xslgDelta) : null,
          xwobaDelta: Number.isFinite(xwobaDelta) ? roundToThousandths(xwobaDelta) : null,
          hardHitDelta: Number.isFinite(hardHitDelta) ? roundToTenths(hardHitDelta) : null,
          whiffDelta: Number.isFinite(whiffDelta) ? roundToTenths(whiffDelta) : null,
          kDelta: Number.isFinite(kDelta) ? roundToTenths(kDelta) : null
        },
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
  const weightedLeagueGrade = relevant.reduce((sum, pitch) => sum + Number(pitch.leagueGrade || 0) * pitch.usageWeight, 0) / totalUsage
  const weightedXwobaDelta = relevant.reduce((sum, pitch) => sum + Number(pitch.vsLeague?.xwobaDelta || 0) * pitch.usageWeight, 0) / totalUsage
  const weightedXslgDelta = relevant.reduce((sum, pitch) => sum + Number(pitch.vsLeague?.xslgDelta || 0) * pitch.usageWeight, 0) / totalUsage
  const weightedHardHitDelta = relevant.reduce((sum, pitch) => sum + Number(pitch.vsLeague?.hardHitDelta || 0) * pitch.usageWeight, 0) / totalUsage
  const coveragePct = roundToTenths((totalUsage / Math.max(topPitches.reduce((sum, pitch) => sum + Number(pitch.pitchUsage || 0), 0), 1)) * 100)

  return {
    fitScore: roundToTenths(clamp(weightedAverageScore + (weightedFitGrade * 1.4), 18, 94)),
    fitGrade: roundToHundredths(clamp(weightedFitGrade, -8, 10)),
    leagueGrade: roundToHundredths(clamp(weightedLeagueGrade, -8, 10)),
    vsLeague: {
      xwobaDelta: roundToThousandths(weightedXwobaDelta),
      xslgDelta: roundToThousandths(weightedXslgDelta),
      hardHitDelta: roundToTenths(weightedHardHitDelta)
    },
    coveragePct,
    summary: `${relevant
      .slice(0, 3)
      .map((pitch) => `${pitch.pitchName} ${pitch.pitchUsage.toFixed(0)}%`)
      .join(' / ')} | fit ${formatSigned(weightedFitGrade, 1)} | vsLg ${formatSigned(weightedLeagueGrade, 1)}`,
    topPitches: relevant.slice(0, 3).map((pitch) => ({
      pitchType: pitch.pitchType,
      pitchName: pitch.pitchName,
      pitchUsage: pitch.pitchUsage,
      fitGrade: pitch.fitGrade,
      leagueGrade: pitch.leagueGrade,
      batterFitScore: pitch.batterFitScore,
      batterXba: pitch.batterXba,
      batterXslg: pitch.batterXslg,
      batterEstWoba: pitch.batterEstWoba,
      batterHardHit: pitch.batterHardHit,
      leagueAverage: pitch.leagueAverage,
      vsLeague: pitch.vsLeague,
      qualityScore: pitch.qualityScore
    }))
  }
}

const buildSparsePitchTypeFitFallback = (opposingPitcherMix = null, dataCoverage = null) => {
  const topPitches = opposingPitcherMix?.topPitches || []
  const refreshLabel = dataCoverage?.refreshAttempted
    ? 'after Statcast refresh'
    : dataCoverage?.liveHydrationAttempted
      ? 'live sources checked'
      : 'source unavailable'
  return {
    fitScore: 50,
    fitGrade: 0,
    leagueGrade: 0,
    vsLeague: {
      xwobaDelta: 0,
      xslgDelta: 0,
      hardHitDelta: 0
    },
    coveragePct: 0,
    sourceStatus: 'fallback-sparse-batter-pitch-fit',
    fallback: true,
    refreshAttempted: Boolean(dataCoverage?.refreshAttempted),
    presentSources: dataCoverage?.presentSources || [],
    missingSources: dataCoverage?.missingSources || [],
    summary: topPitches.length
      ? `${topPitches
          .slice(0, 3)
          .map((pitch) => `${pitch.pitchName} ${Number(pitch.pitchUsage || 0).toFixed(0)}%`)
          .join(' / ')} | sparse batter pitch-fit fallback (${refreshLabel})`
      : `sparse batter pitch-fit fallback (${refreshLabel})`,
    topPitches: topPitches.slice(0, 3).map((pitch) => ({
      pitchType: pitch.pitchType,
      pitchName: pitch.pitchName,
      pitchUsage: Number(pitch.pitchUsage || 0),
      fitGrade: 0,
      leagueGrade: 0,
      batterFitScore: 50,
      batterXba: null,
      batterXslg: null,
      batterEstWoba: null,
      batterHardHit: null,
      leagueAverage: null,
      vsLeague: {
        xwobaDelta: 0,
        xslgDelta: 0,
        hardHitDelta: 0
      },
      qualityScore: pitch.qualityScore
    }))
  }
}

const buildSparseHandednessSplitFallback = ({
  seasonStats = null,
  careerProfile = null,
  opposingPitcherHand = '',
  dataCoverage = null
} = {}) => {
  const careerOps = Number(careerProfile?.careerOps)
  const careerAvg = Number(careerProfile?.careerAvg)
  const careerSlg = Number(careerProfile?.careerSlg)
  const careerHrPerPa = Number(careerProfile?.careerHrPerPa)
  const careerKRate = Number(careerProfile?.careerKRate)
  const careerBbRate = Number(careerProfile?.careerBbRate)
  const ops = Number.isFinite(seasonStats?.ops)
    ? seasonStats.ops
    : Number.isFinite(careerOps)
      ? careerOps
      : 0.72
  const avg = Number.isFinite(seasonStats?.avg)
    ? seasonStats.avg
    : Number.isFinite(careerAvg)
      ? careerAvg
      : 0.245
  const slg = Number.isFinite(seasonStats?.slg)
    ? seasonStats.slg
    : Number.isFinite(careerSlg)
      ? careerSlg
      : 0.39
  const obp = Math.max(0.24, ops - slg)

  return {
    sourceStatus: 'fallback-sparse-handedness-split',
    fallback: true,
    refreshAttempted: Boolean(dataCoverage?.refreshAttempted),
    presentSources: dataCoverage?.presentSources || [],
    missingSources: dataCoverage?.missingSources || [],
    pitcherHand: opposingPitcherHand || '',
    gamesPlayed: 0,
    hits: 0,
    singles: 0,
    doubles: 0,
    triples: 0,
    homeRuns: 0,
    baseOnBalls: 0,
    strikeOuts: 0,
    totalBases: 0,
    atBats: 0,
    plateAppearances: 0,
    avg,
    obp,
    slg,
    ops,
    hitRate: Number.isFinite(seasonStats?.hitRate) ? seasonStats.hitRate : avg,
    singlesRate: Number.isFinite(seasonStats?.singlesRate) ? seasonStats.singlesRate : avg * 0.72,
    hrRate: Number.isFinite(seasonStats?.hrRate)
      ? seasonStats.hrRate
      : Number.isFinite(careerHrPerPa)
        ? careerHrPerPa
        : 0.03,
    bbRate: Number.isFinite(seasonStats?.bbRate)
      ? seasonStats.bbRate
      : Number.isFinite(careerBbRate)
        ? careerBbRate
        : 0.08,
    kRate: Number.isFinite(seasonStats?.kRate)
      ? seasonStats.kRate
      : Number.isFinite(careerKRate)
        ? careerKRate
        : 0.22,
    totalBasesRate: Number.isFinite(seasonStats?.totalBasesRate) ? seasonStats.totalBasesRate : slg
  }
}

const resolveEffectiveBatterSide = (bats = '', pitcherHand = '') => {
  const batterSide = `${bats}`.trim().toUpperCase()
  const starterHand = `${pitcherHand}`.trim().toUpperCase()

  if (batterSide === 'S') {
    if (starterHand === 'L') return 'R'
    if (starterHand === 'R') return 'L'
    return 'S'
  }

  if (batterSide === 'L' || batterSide === 'R') return batterSide
  return ''
}

const selectEspnHitterSplit = (espnHitterSplits = null, pitcherHand = '') => {
  const starterHand = normalizePitchHand(pitcherHand)
  if (starterHand !== 'L' && starterHand !== 'R') return null
  return espnHitterSplits?.[starterHand] || null
}

const splitSideLabel = (side = '') => (side === 'L' ? 'LHB' : side === 'R' ? 'RHB' : 'batter side')

const formatKernelRate = (value) => (Number.isFinite(Number(value)) ? formatRate(Number(value), 3) : 'n/a')

const buildKernelBand = (score) => {
  if (score >= 66) return 'clear batter edge'
  if (score >= 59) return 'batter lean'
  if (score <= 38) return 'clear starter edge'
  if (score <= 44) return 'starter lean'
  return 'toss-up'
}

const buildBatterStarterMatchupKernel = ({
  lineupPlayer,
  seasonStats,
  recentStats,
  splitStats,
  espnHitterSplit = null,
  pitchTypeFit = null,
  opposingPitcher = null,
  statcastTrend = null,
  handednessEdge = 0
}) => {
  const seasonOps = Number.isFinite(seasonStats?.ops) ? seasonStats.ops : 0.72
  const seasonAvg = Number.isFinite(seasonStats?.avg) ? seasonStats.avg : 0.245
  const recentSample = Number(recentStats?.plateAppearances || 0) || 0
  const splitSample = Number(splitStats?.plateAppearances || 0) || 0
  const recentOps = Number.isFinite(recentStats?.ops) && recentSample >= 6 ? recentStats.ops : seasonOps
  const recentAvg = Number.isFinite(recentStats?.avg) && recentSample >= 6 ? recentStats.avg : seasonAvg
  const splitOps = Number.isFinite(splitStats?.ops) && splitSample >= 10 ? splitStats.ops : seasonOps
  const splitAvg = Number.isFinite(splitStats?.avg) && splitSample >= 10 ? splitStats.avg : seasonAvg
  const recentDelta = recentOps - seasonOps
  const recentAvgDelta = recentAvg - seasonAvg
  const splitDelta = splitOps - seasonOps
  const splitAvgDelta = splitAvg - seasonAvg
  const espnSplitSample = Number(espnHitterSplit?.plateAppearances || espnHitterSplit?.atBats || 0) || 0
  const espnSplitOps = Number.isFinite(Number(espnHitterSplit?.ops)) ? Number(espnHitterSplit.ops) : null
  const espnSplitAvg = Number.isFinite(Number(espnHitterSplit?.avg)) ? Number(espnHitterSplit.avg) : null
  const espnSplitHrRate = Number.isFinite(Number(espnHitterSplit?.homeRunRate))
    ? Number(espnHitterSplit.homeRunRate)
    : null
  const espnSplitKRate = Number.isFinite(Number(espnHitterSplit?.kRate)) ? Number(espnHitterSplit.kRate) : null
  const espnSplitDelta = Number.isFinite(espnSplitOps) ? espnSplitOps - seasonOps : 0
  const espnSplitAvgDelta = Number.isFinite(espnSplitAvg) ? espnSplitAvg - seasonAvg : 0
  const espnSplitHrRateDelta = Number.isFinite(espnSplitHrRate)
    ? espnSplitHrRate - (Number.isFinite(seasonStats?.hrRate) ? seasonStats.hrRate : 0.03)
    : 0
  const espnSplitKRateDelta = Number.isFinite(espnSplitKRate)
    ? espnSplitKRate - (Number.isFinite(seasonStats?.kRate) ? seasonStats.kRate : 0.22)
    : 0
  const splitObp = Number.isFinite(splitStats?.obp) && splitSample >= 10 ? splitStats.obp : null
  const espnSplitObp = Number.isFinite(Number(espnHitterSplit?.obp)) ? Number(espnHitterSplit.obp) : null
  const platoonWeakSplitActive =
    splitSample >= 24 &&
    (splitOps <= 0.7 ||
      splitDelta <= -0.12 ||
      (splitAvg <= 0.24 && splitOps <= 0.72) ||
      (Number.isFinite(splitObp) && splitObp <= 0.285 && splitOps <= 0.72))
  const espnPlatoonWeakSplitActive =
    espnSplitSample >= 24 &&
    Number.isFinite(espnSplitOps) &&
    (espnSplitOps <= 0.7 ||
      espnSplitDelta <= -0.12 ||
      (Number.isFinite(espnSplitAvg) && espnSplitAvg <= 0.24 && espnSplitOps <= 0.72) ||
      (Number.isFinite(espnSplitObp) && espnSplitObp <= 0.285 && espnSplitOps <= 0.72))
  const effectiveBatterSide = resolveEffectiveBatterSide(lineupPlayer?.bats, opposingPitcher?.handedness)
  const pitcherSplit = effectiveBatterSide === 'L' || effectiveBatterSide === 'R'
    ? opposingPitcher?.batterSideSplits?.[effectiveBatterSide] || null
    : null
  const pitcherSplitSample = Number(pitcherSplit?.atBats || 0) || 0
  const pitcherOpsDelta = Number.isFinite(Number(pitcherSplit?.ops)) ? Number(pitcherSplit.ops) - 0.72 : 0
  const pitcherAvgDelta = Number.isFinite(Number(pitcherSplit?.avg)) ? Number(pitcherSplit.avg) - 0.245 : 0
  const pitcherHrRateDelta =
    Number.isFinite(Number(pitcherSplit?.homeRunRate)) ? Number(pitcherSplit.homeRunRate) - 0.033 : 0
  const pitchFitGrade = Number(pitchTypeFit?.fitGrade || 0)
  const pitchLeagueGrade = Number(pitchTypeFit?.leagueGrade || 0)
  const pitchCoverage = Number(pitchTypeFit?.coveragePct || 0)
  const recentWeight = clamp(recentSample / 24, recentSample >= 6 ? 0.35 : 0.1, 1)
  const splitWeight = clamp(splitSample / 90, splitSample >= 10 ? 0.3 : 0.08, 1)
  const espnSplitWeight = clamp(espnSplitSample / 120, espnSplitSample >= 20 ? 0.28 : 0.08, 0.9)
  const espnScoreWeight = espnSplitWeight * (splitSample >= 10 ? 0.45 : 1)
  const pitcherSplitWeight = clamp(pitcherSplitSample / 120, pitcherSplitSample >= 24 ? 0.28 : 0.08, 1)
  const statcastTrendLift =
    statcastTrend?.trendSignal === 'improving'
      ? 2.8
      : statcastTrend?.trendSignal === 'fading'
        ? -3.4
        : 0
  const xwobaTrendLift = Number.isFinite(Number(statcastTrend?.xwobaTrend))
    ? clamp(Number(statcastTrend.xwobaTrend) * 130, -3.2, 3.2)
    : 0

  let score = clamp(
    50 +
      recentDelta * 92 * recentWeight +
      recentAvgDelta * 95 * recentWeight +
      splitDelta * 62 * splitWeight +
      splitAvgDelta * 85 * splitWeight +
      espnSplitDelta * 54 * espnScoreWeight +
      espnSplitAvgDelta * 72 * espnScoreWeight +
      espnSplitHrRateDelta * 220 * espnScoreWeight -
      espnSplitKRateDelta * 42 * espnScoreWeight +
      pitcherOpsDelta * 52 * pitcherSplitWeight +
      pitcherAvgDelta * 72 * pitcherSplitWeight +
      pitcherHrRateDelta * 220 * pitcherSplitWeight +
      pitchFitGrade * 2.1 +
      pitchLeagueGrade * 1.45 +
      Number(handednessEdge || 0) * 1.1 +
      statcastTrendLift +
      xwobaTrendLift,
    18,
    94
  )

  const currentFormCapActive = recentSample >= 8 && (recentDelta <= -0.14 || recentAvgDelta <= -0.055)
  const platoonCapActive = splitSample >= 18 && (splitDelta <= -0.16 || platoonWeakSplitActive)
  const espnPlatoonCapActive = espnSplitSample >= 24 && (espnSplitDelta <= -0.18 || espnPlatoonWeakSplitActive)
  if (currentFormCapActive) score = Math.min(score, 57)
  if (platoonCapActive || espnPlatoonCapActive) score = Math.min(score, platoonCapActive && espnPlatoonCapActive ? 54 : 58)

  const confidence = clamp(
    28 +
      recentWeight * 20 +
      splitWeight * 18 +
      espnSplitWeight * 12 +
      pitcherSplitWeight * 14 +
      clamp(pitchCoverage, 0, 100) * 0.16 +
      (statcastTrend?.sourceAsOfDate ? 4 : 0),
    22,
    86
  )
  const label = buildKernelBand(score)
  const reasons = [
    recentSample >= 6 ? `recent OPS ${formatSigned(recentDelta, 3)} vs season over ${recentSample} PA` : null,
    splitSample >= 10
      ? `batter vs ${opposingPitcher?.handedness || '?'}HP OPS ${formatKernelRate(splitOps)} (${formatSigned(splitDelta, 3)})`
      : null,
    espnSplitSample >= 20 && Number.isFinite(espnSplitOps)
      ? `ESPN vs ${opposingPitcher?.handedness || '?'}HP OPS ${formatKernelRate(espnSplitOps)} (${formatSigned(espnSplitDelta, 3)})`
      : null,
    pitcherSplit
      ? `starter allowed ${formatKernelRate(pitcherSplit.ops)} OPS to ${splitSideLabel(effectiveBatterSide)}`
      : null,
    pitchTypeFit
      ? `pitch mix fit ${formatSigned(pitchFitGrade, 1)} / vsLg ${formatSigned(pitchLeagueGrade, 1)}`
      : null,
    statcastTrend?.trendSignal === 'improving' ? 'recent Statcast trend improving' : null,
    statcastTrend?.trendSignal === 'fading' ? 'recent Statcast trend fading' : null,
    currentFormCapActive ? 'current form caps old BvP or historical lift' : null,
    platoonCapActive || espnPlatoonCapActive ? 'weak handedness split caps matchup promotion' : null
  ].filter(Boolean)

  return {
    score: roundToTenths(score),
    confidence: roundToTenths(confidence),
    label,
    batterSide: lineupPlayer?.bats || '',
    effectiveBatterSide,
    opposingStarterHand: opposingPitcher?.handedness || '',
    components: {
      currentForm: {
        recentPlateAppearances: recentSample,
        seasonOps: roundToThousandths(seasonOps),
        recentOps: roundToThousandths(recentOps),
        recentOpsDelta: roundToThousandths(recentDelta),
        recentAvgDelta: roundToThousandths(recentAvgDelta),
        capActive: currentFormCapActive
      },
      batterHandednessSplit: {
        plateAppearances: splitSample,
        splitOps: roundToThousandths(splitOps),
        splitOpsDelta: roundToThousandths(splitDelta),
        splitAvgDelta: roundToThousandths(splitAvgDelta),
        capActive: platoonCapActive
      },
      espnHitterHandednessSplit: espnHitterSplit
        ? {
            source: espnHitterSplit.source || 'ESPN player splits',
            sourceStatus: espnHitterSplit.sourceStatus || '',
            sourceUrl: espnHitterSplit.sourceUrl || '',
            espnAthleteId: espnHitterSplit.espnAthleteId || '',
            pitcherHand: opposingPitcher?.handedness || '',
            label: espnHitterSplit.label || '',
            atBats: espnHitterSplit.atBats,
            plateAppearances: espnHitterSplit.plateAppearances,
            avg: espnHitterSplit.avg,
            obp: espnHitterSplit.obp,
            slg: espnHitterSplit.slg,
            ops: espnHitterSplit.ops,
            homeRunRate: espnHitterSplit.homeRunRate,
            kRate: espnHitterSplit.kRate,
            opsDeltaVsSeason: roundToThousandths(espnSplitDelta),
            scoreWeight: roundToHundredths(espnScoreWeight),
            capActive: espnPlatoonCapActive
          }
        : null,
      pitcherAllowedSplit: pitcherSplit
        ? {
            source: opposingPitcher?.batterSideSplits?.source || 'ESPN player splits',
            sourceStatus: opposingPitcher?.batterSideSplits?.sourceStatus || '',
            side: effectiveBatterSide,
            atBats: pitcherSplitSample,
            avg: pitcherSplit.avg,
            obp: pitcherSplit.obp,
            slg: pitcherSplit.slg,
            ops: pitcherSplit.ops,
            homeRunRate: pitcherSplit.homeRunRate,
            opsDeltaVsBaseline: roundToThousandths(pitcherOpsDelta)
          }
        : null,
      pitchType: pitchTypeFit
        ? {
            fitGrade: roundToHundredths(pitchFitGrade),
            leagueGrade: roundToHundredths(pitchLeagueGrade),
            coveragePct: roundToTenths(pitchCoverage),
            vsLeague: pitchTypeFit.vsLeague || null,
            topPitches: pitchTypeFit.topPitches || []
          }
        : null,
      bvpPolicy: {
        usableForScoring: false,
        scoreImpact: 0,
        minAtBats: 5,
        maxAgeSeasons: 3,
        note: 'BvP is context-only here unless a dated sample within the last 3 seasons is available.'
      }
    },
    reasons: reasons.slice(0, 6),
    summary: reasons.length
      ? `${label}: ${reasons.slice(0, 3).join('; ')}`
      : `${label}: matchup data is still thin.`
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
  splitStats: rawSplitStats,
  espnHitterSplits = null,
  pitchTypeStatsByType,
  opposingPitcher,
  statcastTrend = null,
  opponentContext = null,
  careerProfile = null,
  dataCoverage = null
}) => {
  const splitStats =
    rawSplitStats ||
    buildSparseHandednessSplitFallback({
      seasonStats,
      careerProfile,
      opposingPitcherHand: opposingPitcher?.handedness,
      dataCoverage
    })
  const seasonOps = Number.isFinite(seasonStats?.ops) ? seasonStats.ops : 0.72
  const recentOps =
    Number.isFinite(recentStats?.ops) && Number(recentStats?.plateAppearances || 0) >= 6
      ? recentStats.ops
      : seasonOps
  const splitOps =
    Number.isFinite(splitStats?.ops) && Number(splitStats?.plateAppearances || 0) >= 10
      ? splitStats.ops
      : seasonOps
  const splitSample = Number(splitStats?.plateAppearances || splitStats?.atBats || 0) || 0
  const seasonAvg = Number.isFinite(seasonStats?.avg) ? seasonStats.avg : 0.245
  const recentAvg = Number.isFinite(recentStats?.avg) ? recentStats.avg : seasonAvg
  const splitAvg =
    Number.isFinite(splitStats?.avg) && Number(splitStats?.plateAppearances || 0) >= 10
      ? splitStats.avg
      : seasonAvg
  const seasonHrRate = Number.isFinite(seasonStats?.hrRate) ? seasonStats.hrRate : 0.03
  const recentHrRate = Number.isFinite(recentStats?.hrRate) ? recentStats.hrRate : seasonHrRate
  const splitHrRate =
    Number.isFinite(splitStats?.hrRate) && Number(splitStats?.plateAppearances || 0) >= 10
      ? splitStats.hrRate
      : seasonHrRate
  const seasonKRate = Number.isFinite(seasonStats?.kRate) ? seasonStats.kRate : 0.22
  const splitKRate = Number.isFinite(splitStats?.kRate) ? splitStats.kRate : seasonKRate
  const seasonBbRate = Number.isFinite(seasonStats?.bbRate) ? seasonStats.bbRate : 0.08
  const seasonPa = Number(seasonStats?.plateAppearances || 0) || 0
  const careerPa = Number(careerProfile?.careerPlateAppearances || 0) || 0
  const careerPowerIndex = Number(careerProfile?.careerPowerIndex)
  const careerContactRisk = Number(careerProfile?.contactRiskIndex)
  const careerRoleStability = Number(careerProfile?.roleStabilityIndex)
  const careerSlg = Number(careerProfile?.careerSlg)
  const careerOps = Number(careerProfile?.careerOps)
  const careerTbPerPa = Number(careerProfile?.careerTbPerPa)
  const careerHrPerPa = Number(careerProfile?.careerHrPerPa)
  const careerKRate = Number(careerProfile?.careerKRate)
  const careerBbRate = Number(careerProfile?.careerBbRate)
  const careerReliability = Number.isFinite(careerPa) && careerPa > 0 ? clamp(careerPa / 650, 0.12, 0.86) : 0
  const currentSeasonWeight = clamp(seasonPa / 120, 0.16, 1)
  const careerSmallSampleWeight = seasonPa < 80 ? careerReliability * (1 - currentSeasonWeight) : careerReliability * 0.18
  const careerPowerLift =
    careerSmallSampleWeight > 0 && Number.isFinite(careerPowerIndex)
      ? (careerPowerIndex - 50) * 0.42 * careerSmallSampleWeight
      : 0
  const careerContactLift =
    careerSmallSampleWeight > 0 && Number.isFinite(careerContactRisk)
      ? (50 - careerContactRisk) * 0.3 * careerSmallSampleWeight
      : 0
  const careerPatienceLift =
    careerSmallSampleWeight > 0 && Number.isFinite(careerBbRate)
      ? (careerBbRate - 0.08) * 180 * careerSmallSampleWeight
      : 0
  const stableSeasonOps =
    seasonPa < 16 && Number.isFinite(careerOps)
      ? seasonOps * currentSeasonWeight + careerOps * (1 - currentSeasonWeight)
      : seasonOps
  const stableRecentOps =
    seasonPa < 16 && Number.isFinite(careerOps)
      ? recentOps * currentSeasonWeight + careerOps * (1 - currentSeasonWeight)
      : recentOps
  const stableSplitOps =
    seasonPa < 16 && Number.isFinite(careerOps)
      ? splitOps * currentSeasonWeight + careerOps * (1 - currentSeasonWeight)
      : splitOps
  const recentDelta = stableRecentOps - stableSeasonOps
  const splitDelta = stableSplitOps - stableSeasonOps
  const espnHitterSplit = selectEspnHitterSplit(espnHitterSplits, opposingPitcher?.handedness)
  const espnSplitSample = Number(espnHitterSplit?.plateAppearances || espnHitterSplit?.atBats || 0) || 0
  const espnSplitOps = Number.isFinite(Number(espnHitterSplit?.ops)) ? Number(espnHitterSplit.ops) : null
  const espnSplitAvg = Number.isFinite(Number(espnHitterSplit?.avg)) ? Number(espnHitterSplit.avg) : null
  const espnSplitSlg = Number.isFinite(Number(espnHitterSplit?.slg)) ? Number(espnHitterSplit.slg) : null
  const espnSplitHrRate = Number.isFinite(Number(espnHitterSplit?.homeRunRate))
    ? Number(espnHitterSplit.homeRunRate)
    : null
  const espnSplitKRate = Number.isFinite(Number(espnHitterSplit?.kRate)) ? Number(espnHitterSplit.kRate) : null
  const espnSplitReliability = clamp(espnSplitSample / 120, espnSplitSample >= 20 ? 0.28 : 0.08, 0.9)
  const espnScoreWeight = espnSplitReliability * (Number(splitStats?.plateAppearances || 0) >= 10 ? 0.45 : 1)
  const espnSplitDelta = Number.isFinite(espnSplitOps) ? espnSplitOps - stableSeasonOps : 0
  const espnSplitAvgDelta = Number.isFinite(espnSplitAvg) ? espnSplitAvg - seasonAvg : 0
  const espnSplitSlgDelta = Number.isFinite(espnSplitSlg)
    ? espnSplitSlg - (Number.isFinite(seasonStats?.slg) ? seasonStats.slg : 0.39)
    : 0
  const splitObp = Number.isFinite(splitStats?.obp) && splitSample >= 10 ? splitStats.obp : null
  const espnSplitObp = Number.isFinite(Number(espnHitterSplit?.obp)) ? Number(espnHitterSplit.obp) : null
  const rawWeakHandednessSplitRisk =
    splitSample >= 24 &&
    (splitOps <= 0.7 ||
      splitDelta <= -0.12 ||
      (splitAvg <= 0.24 && splitOps <= 0.72) ||
      (Number.isFinite(splitObp) && splitObp <= 0.285 && splitOps <= 0.72))
  const espnWeakHandednessSplitRisk =
    espnSplitSample >= 24 &&
    Number.isFinite(espnSplitOps) &&
    (espnSplitOps <= 0.7 ||
      espnSplitDelta <= -0.12 ||
      (Number.isFinite(espnSplitAvg) && espnSplitAvg <= 0.24 && espnSplitOps <= 0.72) ||
      (Number.isFinite(espnSplitObp) && espnSplitObp <= 0.285 && espnSplitOps <= 0.72))
  const weakHandednessSplitRisk = rawWeakHandednessSplitRisk || espnWeakHandednessSplitRisk
  const confirmedWeakHandednessSplitRisk = rawWeakHandednessSplitRisk && espnWeakHandednessSplitRisk
  const espnSplitHrRateDelta = Number.isFinite(espnSplitHrRate) ? espnSplitHrRate - seasonHrRate : 0
  const espnSplitKRateDelta = Number.isFinite(espnSplitKRate) ? espnSplitKRate - seasonKRate : 0
  const slot = Number(lineupPlayer.slot || 9)

  let powerScore = clamp(
    50 +
      (Number(seasonStats?.slg || 0.39) - 0.39) * 110 +
      (seasonHrRate - 0.035) * 700 +
      (splitHrRate - seasonHrRate) * 420 +
      espnSplitSlgDelta * 52 * espnScoreWeight +
      espnSplitHrRateDelta * 460 * espnScoreWeight +
      (Number.isFinite(careerSlg) ? (careerSlg - 0.39) * 28 * careerSmallSampleWeight : 0) +
      (Number.isFinite(careerTbPerPa) ? (careerTbPerPa - 0.36) * 70 * careerSmallSampleWeight : 0) +
      (Number.isFinite(careerHrPerPa) ? (careerHrPerPa - 0.03) * 420 * careerSmallSampleWeight : 0) +
      careerPowerLift,
    18,
    92
  )
  let contactScore = clamp(
    50 +
      (seasonAvg - 0.245) * 150 +
      (splitAvg - seasonAvg) * 90 -
      (seasonKRate - 0.22) * 120 +
      espnSplitAvgDelta * 120 * espnScoreWeight -
      espnSplitKRateDelta * 70 * espnScoreWeight +
      ((seasonStats?.hitsPerGame || 0.8) - 0.8) * 18 -
      (Number.isFinite(careerKRate) ? (careerKRate - 0.23) * 85 * careerSmallSampleWeight : 0) +
      careerContactLift,
    18,
    92
  )
  let patienceScore = clamp(
    50 + (seasonBbRate - 0.08) * 240 + (((seasonStats?.obp || 0.315) - seasonAvg) - 0.07) * 180 + careerPatienceLift,
    18,
    92
  )
  let formScore = clamp(
    50 + recentDelta * 110 + (recentAvg - seasonAvg) * 200 + (recentHrRate - seasonHrRate) * 1200,
    18,
    92
  )
  let splitScore = clamp(
    50 +
      splitDelta * 125 +
      (splitAvg - seasonAvg) * 180 +
      (splitHrRate - seasonHrRate) * 1000 +
      espnSplitDelta * 95 * espnScoreWeight +
      espnSplitAvgDelta * 135 * espnScoreWeight +
      espnSplitHrRateDelta * 720 * espnScoreWeight -
      espnSplitKRateDelta * 68 * espnScoreWeight,
    18,
    92
  )
  let varianceScore = clamp(
    42 +
      Math.abs(recentDelta) * 170 +
      Math.abs(splitDelta) * 140 +
      Math.abs(espnSplitDelta) * 90 * espnScoreWeight +
      Math.max(powerScore - contactScore, 0) * 0.38 +
      (seasonKRate - 0.22) * 110 +
      (seasonPa < 24 ? 10 : seasonPa < 60 ? 5 : 0) +
      (Number.isFinite(careerContactRisk) ? Math.max(careerContactRisk - 58, 0) * 0.22 : 0) -
      (Number.isFinite(careerRoleStability) ? Math.max(careerRoleStability - 65, 0) * 0.08 : 0),
    18,
    92
  )
  if (seasonPa < 16 && careerProfile) {
    const careerPowerAnchor = Number.isFinite(careerPowerIndex)
      ? clamp(50 + (careerPowerIndex - 50) * 0.85, 18, 92)
      : 50
    const careerContactAnchor = Number.isFinite(careerContactRisk)
      ? clamp(50 - (careerContactRisk - 50) * 0.65, 18, 92)
      : 50
    powerScore = clamp(powerScore * 0.42 + careerPowerAnchor * 0.58, 18, 92)
    contactScore = clamp(contactScore * 0.28 + careerContactAnchor * 0.72, 18, 92)
    patienceScore = clamp(patienceScore * 0.45 + (Number.isFinite(careerBbRate) ? 50 + (careerBbRate - 0.08) * 180 : 50) * 0.55, 18, 92)
    formScore = clamp(50 + (formScore - 50) * 0.28, 18, 92)
    splitScore = clamp(50 + (splitScore - 50) * 0.35, 18, 92)
    varianceScore = clamp(varianceScore + 8 + Math.max(Number(careerContactRisk || 50) - 55, 0) * 0.35, 18, 92)
  }
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
  const pitchTypeFit =
    buildPitchTypeFit({
      pitchTypeStatsByType,
      opposingPitcherMix: opposingPitcher?.pitchMix
    }) || buildSparsePitchTypeFitFallback(opposingPitcher?.pitchMix, dataCoverage)
  const matchupKernel = buildBatterStarterMatchupKernel({
    lineupPlayer,
    seasonStats,
    recentStats,
    splitStats,
    espnHitterSplit,
    pitchTypeFit,
    opposingPitcher,
    statcastTrend,
    handednessEdge
  })
  let matchupGrade = clamp(
    (stableSeasonOps - 0.72) * 18 +
      recentDelta * 28 +
      splitDelta * 22 +
      espnSplitDelta * 9 * espnScoreWeight +
      handednessEdge +
      slotBonus +
      pitchStyleAdjustment.adjustment +
      (Number(pitchTypeFit?.fitGrade || 0) * 0.85) +
      (Number(matchupKernel?.score || 50) - 50) * 0.025,
    -8,
    10
  )
  if (weakHandednessSplitRisk) {
    const splitRiskCap = confirmedWeakHandednessSplitRisk ? 0.8 : 1.6
    const splitRiskPenalty = confirmedWeakHandednessSplitRisk ? 1.25 : 0.7
    matchupGrade = Math.min(matchupGrade - splitRiskPenalty, splitRiskCap)
  }
  if (seasonPa < 16 && careerProfile) {
    matchupGrade = clamp(matchupGrade, -8, careerPowerIndex >= 68 ? 6.8 : 4.8)
  }
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
  if (weakHandednessSplitRisk) tags.push('split risk')
  if (matchupGrade >= 5 || (powerScore >= 70 && formScore >= 54)) tags.push('carry')
  if (formScore >= 61) tags.push('heater')
  if (!weakHandednessSplitRisk && (splitScore >= 58 || handednessEdge > 0)) tags.push('split edge')
  if (espnSplitSample >= 20 && espnSplitDelta >= 0.12) tags.push('espn split edge')
  if (Number(pitchTypeFit?.fitGrade || 0) >= 1.4) tags.push('arsenal edge')
  if (Number(matchupKernel?.score || 50) >= 64) tags.push('starter kernel edge')
  if (contactScore >= 63) tags.push('traffic')
  if ((opposingPitcher?.profileType === 'Power' || opposingPitcher?.profileType === 'Volatile bat-misser') && varianceScore >= 64 && seasonKRate >= 0.24) {
    tags.push('whiff risk')
  }
  if (Number(pitchTypeFit?.fitGrade || 0) <= -1.4) tags.push('arsenal risk')
  if (Number(matchupKernel?.score || 50) <= 42) tags.push('starter kernel risk')
  if (espnSplitSample >= 20 && espnSplitDelta <= -0.16) tags.push('espn split risk')
  if (formScore <= 42 || matchupGrade <= -1.4) tags.push('cold')
  if (statcastTrend?.trendSignal === 'improving') tags.push('statcast up')
  if (statcastTrend?.trendSignal === 'fading') tags.push('statcast fade')
  if (careerProfile?.repeatabilityLabel?.includes('power')) tags.push('career power')
  if (seasonPa < 24 && careerProfile?.repeatabilityLabel) tags.push('small-sample story')
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
    splitStats?.fallback ? 'selected handedness split uses sparse-player neutral fallback' : '',
    dataCoverage?.supplementalRotoWire
      ? `RotoWire-only hitter resolved; hydrated sources: ${dataCoverage.presentSources?.join(', ') || 'none'}`
      : '',
    espnHitterSplit && Number.isFinite(espnSplitOps)
      ? `ESPN split vs ${opposingPitcher?.handedness || '?'}HP ${formatKernelRate(espnSplitOps)} OPS over ${espnHitterSplit.atBats ?? espnSplitSample} AB`
      : '',
    buildCareerLine(careerProfile, seasonStats),
    pitchTypeFit?.summary ? `arsenal ${pitchTypeFit.summary}` : '',
    matchupKernel?.summary ? `starter kernel ${matchupKernel.summary}` : '',
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
          strikeouts: splitStats.strikeOuts,
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
          kRate: roundToHundredths((splitStats.kRate || 0) * 100) / 100,
          totalBasesRate: roundToHundredths((splitStats.totalBasesRate || 0) * 100) / 100,
          sourceStatus: splitStats.sourceStatus || '',
          fallback: Boolean(splitStats.fallback)
        }
      : null,
    espnHitterSplit: espnHitterSplit
      ? {
          source: espnHitterSplit.source || 'ESPN player splits',
          sourceStatus: espnHitterSplit.sourceStatus || '',
          sourceUrl: espnHitterSplit.sourceUrl || '',
          espnAthleteId: espnHitterSplit.espnAthleteId || '',
          pitcherHand: opposingPitcher?.handedness || '',
          label: espnHitterSplit.label || '',
          atBats: espnHitterSplit.atBats,
          plateAppearances: espnHitterSplit.plateAppearances,
          hits: espnHitterSplit.hits,
          doubles: espnHitterSplit.doubles,
          triples: espnHitterSplit.triples,
          homeRuns: espnHitterSplit.homeRuns,
          walks: espnHitterSplit.walks,
          hitByPitch: espnHitterSplit.hitByPitch,
          strikeouts: espnHitterSplit.strikeouts,
          avg: espnHitterSplit.avg,
          obp: espnHitterSplit.obp,
          slg: espnHitterSplit.slg,
          ops: espnHitterSplit.ops,
          hitRate: espnHitterSplit.hitRate,
          homeRunRate: espnHitterSplit.homeRunRate,
          walkRate: espnHitterSplit.walkRate,
          kRate: espnHitterSplit.kRate,
          opsDeltaVsSeason: roundToThousandths(espnSplitDelta),
          avgDeltaVsSeason: roundToThousandths(espnSplitAvgDelta),
          scoreWeight: roundToHundredths(espnScoreWeight)
        }
      : null,
    espnHitterSplits: espnHitterSplits
      ? {
          source: espnHitterSplits.source || 'ESPN player splits',
          sourceStatus: espnHitterSplits.sourceStatus || '',
          sourceUrl: espnHitterSplits.sourceUrl || '',
          espnAthleteId: espnHitterSplits.espnAthleteId || '',
          category: espnHitterSplits.category || '',
          vsLeft: espnHitterSplits.L || null,
          vsRight: espnHitterSplits.R || null
        }
      : null,
    metrics: {
      powerScore: roundToTenths(powerScore),
      contactScore: roundToTenths(contactScore),
      patienceScore: roundToTenths(patienceScore),
      formScore: roundToTenths(formScore),
      splitScore: roundToTenths(splitScore),
      handednessSplitRisk: weakHandednessSplitRisk,
      espnSplitScoreWeight: roundToHundredths(espnScoreWeight),
      espnSplitOpsDelta: roundToThousandths(espnSplitDelta),
      varianceScore: roundToTenths(varianceScore),
      pitchTypeFitScore: roundToTenths(Number(pitchTypeFit?.fitScore || 50)),
      pitchTypeGrade: roundToHundredths(Number(pitchTypeFit?.fitGrade || 0)),
      pitchTypeLeagueGrade: roundToHundredths(Number(pitchTypeFit?.leagueGrade || 0)),
      pitchTypeCoveragePct: roundToTenths(Number(pitchTypeFit?.coveragePct || 0)),
      starterMatchupKernelScore: roundToTenths(Number(matchupKernel?.score || 50)),
      starterMatchupKernelConfidence: roundToTenths(Number(matchupKernel?.confidence || 0)),
      matchupScore: roundToTenths(matchupScore),
      matchupGrade: roundToHundredths(matchupGrade)
    },
    pitchType: pitchTypeFit,
    matchupKernel,
    statcastTrend: statcastTrend
      ? {
          ...statcastTrend,
          rolling7Xwoba: parseNumber(statcastTrend.rolling7Xwoba),
          rolling14Xwoba: parseNumber(statcastTrend.rolling14Xwoba),
          rolling30Xwoba: parseNumber(statcastTrend.rolling30Xwoba),
          rolling7Xba: parseNumber(statcastTrend.rolling7Xba),
          rolling14Xba: parseNumber(statcastTrend.rolling14Xba),
          rolling30Xba: parseNumber(statcastTrend.rolling30Xba),
          rolling7Xslg: parseNumber(statcastTrend.rolling7Xslg),
          rolling14Xslg: parseNumber(statcastTrend.rolling14Xslg),
          rolling30Xslg: parseNumber(statcastTrend.rolling30Xslg),
          rolling7BarrelPct: parseNumber(statcastTrend.rolling7BarrelPct),
          rolling14BarrelPct: parseNumber(statcastTrend.rolling14BarrelPct),
          rolling30BarrelPct: parseNumber(statcastTrend.rolling30BarrelPct),
          rolling7HardHitPct: parseNumber(statcastTrend.rolling7HardHitPct),
          rolling14HardHitPct: parseNumber(statcastTrend.rolling14HardHitPct),
          rolling30HardHitPct: parseNumber(statcastTrend.rolling30HardHitPct),
          rolling7SweetSpotPct: parseNumber(statcastTrend.rolling7SweetSpotPct),
          rolling14SweetSpotPct: parseNumber(statcastTrend.rolling14SweetSpotPct),
          rolling30SweetSpotPct: parseNumber(statcastTrend.rolling30SweetSpotPct),
          recentStatcastGames: parseNumber(statcastTrend.recentStatcastGames),
          recentStatcastPa: parseNumber(statcastTrend.recentStatcastPa),
          recentStatcastAb: parseNumber(statcastTrend.recentStatcastAb),
          recentStatcastHomeRuns: parseNumber(statcastTrend.recentStatcastHomeRuns),
          recentBbeSample: parseNumber(statcastTrend.recentBbeSample),
          recentBarrels: parseNumber(statcastTrend.recentBarrels),
          recentHardHit: parseNumber(statcastTrend.recentHardHit),
          recentSweetSpot: parseNumber(statcastTrend.recentSweetSpot),
          recentBarrelPct: parseNumber(statcastTrend.recentBarrelPct),
          recentHardHitPct: parseNumber(statcastTrend.recentHardHitPct),
          recentSweetSpotPct: parseNumber(statcastTrend.recentSweetSpotPct),
          recentXobp: parseNumber(statcastTrend.recentXobp),
          recentXslg: parseNumber(statcastTrend.recentXslg),
          recentXops: parseNumber(statcastTrend.recentXops),
          recentAvgExitVelocity: parseNumber(statcastTrend.recentAvgExitVelocity),
          recentAvgLaunchAngle: parseNumber(statcastTrend.recentAvgLaunchAngle),
          xwobaTrend: parseNumber(statcastTrend.xwobaTrend),
          barrelTrend: parseNumber(statcastTrend.barrelTrend),
          hardHitTrend: parseNumber(statcastTrend.hardHitTrend),
          sweetSpotTrend: parseNumber(statcastTrend.sweetSpotTrend)
        }
      : null,
    dataCoverage: dataCoverage
      ? {
          sourceStatus: dataCoverage.sourceStatus || '',
          liveHydrationAttempted: Boolean(dataCoverage.liveHydrationAttempted),
          supplementalRotoWire: Boolean(dataCoverage.supplementalRotoWire),
          sparseLineupHitter: Boolean(dataCoverage.sparseLineupHitter),
          refreshAttempted: Boolean(dataCoverage.refreshAttempted),
          refreshResolved: Boolean(dataCoverage.refreshResolved),
          refreshDeferred: Boolean(dataCoverage.refreshDeferred),
          refreshOk: Boolean(dataCoverage.refreshOk),
          presentSources: dataCoverage.presentSources || [],
          missingSources: dataCoverage.missingSources || [],
          espnSplitStatus: dataCoverage.espnSplitStatus || '',
          careerPlateAppearances: dataCoverage.careerPlateAppearances ?? null,
          statcastTrendAsOfDate: dataCoverage.statcastTrendAsOfDate || '',
          note: dataCoverage.note || ''
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
    careerProfile: careerProfile
      ? {
          ...careerProfile,
          careerAvg: parseNumber(careerProfile.careerAvg),
          careerObp: parseNumber(careerProfile.careerObp),
          careerSlg: parseNumber(careerProfile.careerSlg),
          careerOps: parseNumber(careerProfile.careerOps),
          careerTbPerPa: parseNumber(careerProfile.careerTbPerPa),
          careerHrPerPa: parseNumber(careerProfile.careerHrPerPa),
          careerKRate: parseNumber(careerProfile.careerKRate),
          careerBbRate: parseNumber(careerProfile.careerBbRate),
          careerPowerIndex: parseNumber(careerProfile.careerPowerIndex),
          contactRiskIndex: parseNumber(careerProfile.contactRiskIndex),
          roleStabilityIndex: parseNumber(careerProfile.roleStabilityIndex)
        }
      : null,
    tags,
    primaryTag,
    summary,
    matchupNote: `${formatSigned(matchupGrade, 2)} vs ${opposingPitcher?.fullName || 'today’s starter'}`
  }
}

const normalizedRate = (value) => {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed <= 0) return null
  return parsed > 1 ? parsed / 1000 : parsed
}

const weightedMetric = (parts = []) => {
  const clean = parts.filter((part) => Number.isFinite(part?.value) && Number.isFinite(part?.weight) && part.weight > 0)
  if (!clean.length) return null
  return clean.reduce((sum, part) => sum + part.value * part.weight, 0) / clean.reduce((sum, part) => sum + part.weight, 0)
}

const buildBattingPressureSummary = (lineup = []) => {
  const entries = lineup
    .map((entry) => {
      const seasonAvg = normalizedRate(entry.season?.avg)
      const recentAvg = normalizedRate(entry.recent?.avg ?? entry.recent?.hitRate)
      const splitAvg = normalizedRate(entry.split?.avg)
      const espnSplitAvg = normalizedRate(entry.espnHitterSplit?.avg)
      const careerAvg = normalizedRate(entry.careerProfile?.careerAvg)
      const seasonOps = normalizedRate(entry.season?.ops)
      const recentOps = normalizedRate(
        entry.recent?.ops ??
          (Number.isFinite(Number(entry.recent?.totalBasesRate)) || Number.isFinite(Number(entry.recent?.walkRate))
            ? Number(entry.recent?.totalBasesRate || 0) + Number(entry.recent?.walkRate || 0)
            : null)
      )
      const splitOps = normalizedRate(entry.split?.ops)
      const espnSplitOps = normalizedRate(entry.espnHitterSplit?.ops)
      const careerOps = normalizedRate(entry.careerProfile?.careerOps)
      const recentPa = Number(entry.recent?.plateAppearances || 0) || 0
      const splitPa = Number(entry.split?.plateAppearances || 0) || 0
      const espnSplitPa = Number(entry.espnHitterSplit?.plateAppearances || entry.espnHitterSplit?.atBats || 0) || 0
      const careerPa = Number(entry.careerProfile?.careerPlateAppearances || 0) || 0
      return {
        slot: Number(entry.slot || 99) || 99,
        name: entry.name,
        weightedAvg: weightedMetric([
          Number.isFinite(seasonAvg) ? { value: seasonAvg, weight: 0.42 } : null,
          Number.isFinite(recentAvg) && recentPa >= 8 ? { value: recentAvg, weight: 0.33 } : null,
          Number.isFinite(splitAvg) && splitPa >= 10 ? { value: splitAvg, weight: 0.25 } : null,
          Number.isFinite(espnSplitAvg) && espnSplitPa >= 20 ? { value: espnSplitAvg, weight: 0.12 } : null,
          Number.isFinite(careerAvg) && careerPa >= 150 ? { value: careerAvg, weight: 0.14 } : null
        ]),
        weightedOps: weightedMetric([
          Number.isFinite(seasonOps) ? { value: seasonOps, weight: 0.42 } : null,
          Number.isFinite(recentOps) && recentPa >= 8 ? { value: recentOps, weight: 0.33 } : null,
          Number.isFinite(splitOps) && splitPa >= 10 ? { value: splitOps, weight: 0.25 } : null,
          Number.isFinite(espnSplitOps) && espnSplitPa >= 20 ? { value: espnSplitOps, weight: 0.12 } : null,
          Number.isFinite(careerOps) && careerPa >= 150 ? { value: careerOps, weight: 0.14 } : null
        ]),
        recentAvg,
        recentPa
      }
    })
    .filter((entry) => Number.isFinite(entry.weightedAvg) || Number.isFinite(entry.weightedOps))
    .sort((left, right) => left.slot - right.slot)

  if (!entries.length) {
    return {
      battingPressureIndex: 50,
      highAverageCount: 0,
      topSixHighAverageCount: 0,
      highOpsCount: 0,
      recentHotCount: 0,
      lineupAverage: null,
      topSixAverage: null,
      lineupOps: null,
      topSixOps: null,
      battingPressureLabel: 'lineup batting pressure unknown',
      battingPressureReasons: []
    }
  }

  const topSix = entries.slice(0, 6)
  const lineupAverage = average(entries.map((entry) => entry.weightedAvg))
  const topSixAverage = average(topSix.map((entry) => entry.weightedAvg))
  const lineupOps = average(entries.map((entry) => entry.weightedOps))
  const topSixOps = average(topSix.map((entry) => entry.weightedOps))
  const highAverageCount = entries.filter((entry) => Number(entry.weightedAvg) >= 0.3).length
  const topSixHighAverageCount = topSix.filter((entry) => Number(entry.weightedAvg) >= 0.3).length
  const highOpsCount = entries.filter((entry) => Number(entry.weightedOps) >= 0.84).length
  const recentHotCount = entries.filter((entry) => Number(entry.recentAvg) >= 0.3 && Number(entry.recentPa) >= 8).length
  const coldCount = entries.filter((entry) => Number(entry.weightedAvg) <= 0.22 && Number(entry.weightedOps) <= 0.64).length
  const battingPressureIndex = clamp(
    50 +
      (Number(lineupAverage || 0.25) - 0.25) * 165 +
      (Number(topSixAverage || 0.255) - 0.255) * 120 +
      (highAverageCount - 3) * 3.2 +
      (topSixHighAverageCount - 2) * 2.4 +
      (highOpsCount - 2) * 2.7 +
      (recentHotCount - 2) * 2 -
      coldCount * 2.1,
    18,
    96
  )

  return {
    battingPressureIndex: roundToTenths(battingPressureIndex),
    highAverageCount,
    topSixHighAverageCount,
    highOpsCount,
    recentHotCount,
    lineupAverage: Number.isFinite(lineupAverage) ? Number(lineupAverage.toFixed(3)) : null,
    topSixAverage: Number.isFinite(topSixAverage) ? Number(topSixAverage.toFixed(3)) : null,
    lineupOps: Number.isFinite(lineupOps) ? Number(lineupOps.toFixed(3)) : null,
    topSixOps: Number.isFinite(topSixOps) ? Number(topSixOps.toFixed(3)) : null,
    battingPressureLabel:
      highAverageCount >= 7
        ? 'seven-plus .300 traffic bats'
        : highAverageCount >= 5
          ? 'stacked .300 traffic pocket'
          : battingPressureIndex >= 62
            ? 'strong batting-pressure lane'
            : battingPressureIndex <= 42
              ? 'soft batting-pressure lane'
              : 'neutral batting-pressure lane',
    battingPressureReasons: [
      `${highAverageCount} projected bats at/above .300 blended AVG`,
      Number.isFinite(lineupAverage) ? `lineup AVG ${lineupAverage.toFixed(3)}` : null,
      Number.isFinite(topSixAverage) ? `top-six AVG ${topSixAverage.toFixed(3)}` : null,
      highOpsCount >= 3 ? `${highOpsCount} bats at/above .840 OPS` : null,
      recentHotCount >= 3 ? `${recentHotCount} recent hot bats` : null
    ].filter(Boolean)
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
  const averagePitchTypeLeagueGrade = average(lineup.map((entry) => entry.metrics.pitchTypeLeagueGrade))
  const topThirdPitchTypeScore = average(lineup.slice(0, 3).map((entry) => entry.metrics.pitchTypeFitScore))
  const pitchTypeEdgeCount = lineup.filter((entry) => Number(entry.metrics.pitchTypeGrade) >= 1.2).length
  const espnSplitEdgeCount = lineup.filter((entry) => entry.tags.includes('espn split edge')).length
  const espnSplitRiskCount = lineup.filter((entry) => entry.tags.includes('espn split risk')).length
  const kernelScores = lineup.map((entry) => Number(entry.metrics.starterMatchupKernelScore)).filter(Number.isFinite)
  const averageKernelScore = average(kernelScores)
  const topThirdKernelScore = average(lineup.slice(0, 3).map((entry) => Number(entry.metrics.starterMatchupKernelScore)))
  const starterMatchupKernelConfidence = average(
    lineup.map((entry) => Number(entry.metrics.starterMatchupKernelConfidence)).filter(Number.isFinite)
  )
  const kernelFavorableCount = lineup.filter((entry) => Number(entry.metrics.starterMatchupKernelScore) >= 62).length
  const kernelSuppressedCount = lineup.filter((entry) => Number(entry.metrics.starterMatchupKernelScore) <= 42).length
  const kernelEdgeHitters = [...lineup]
    .filter((entry) => Number(entry.metrics.starterMatchupKernelScore) >= 62)
    .sort((left, right) => Number(right.metrics.starterMatchupKernelScore) - Number(left.metrics.starterMatchupKernelScore))
    .slice(0, 3)
    .map((entry) => ({
      name: entry.name,
      tag: `${entry.matchupKernel?.label || 'batter edge'} | kernel ${Number(entry.metrics.starterMatchupKernelScore).toFixed(1)}`
    }))
  const kernelRiskHitters = [...lineup]
    .filter((entry) => Number(entry.metrics.starterMatchupKernelScore) <= 42)
    .sort((left, right) => Number(left.metrics.starterMatchupKernelScore) - Number(right.metrics.starterMatchupKernelScore))
    .slice(0, 2)
    .map((entry) => ({
      name: entry.name,
      tag: `${entry.matchupKernel?.label || 'starter edge'} | kernel ${Number(entry.metrics.starterMatchupKernelScore).toFixed(1)}`
    }))
  const starterMatchupKernelIndex = clamp(
    50 +
      (Number(averageKernelScore ?? 50) - 50) * 0.65 +
      (Number(topThirdKernelScore ?? 50) - 50) * 0.35 +
      (kernelFavorableCount - kernelSuppressedCount) * 1.8 +
      (Number(averagePitchTypeLeagueGrade ?? 0)) * 1.5,
    18,
    94
  )
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
      (Number.isFinite(averagePitchTypeLeagueGrade) ? averagePitchTypeLeagueGrade * 2.2 : 0) +
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
      (espnSplitEdgeCount - espnSplitRiskCount) * 0.8 +
      (platoonPressureIndex - 50) * 0.24 +
      (pitchTypePressureIndex - 50) * 0.32 +
      (starterMatchupKernelIndex - 50) * 0.22,
    18,
    94
  )
  const overallPressureIndex = clamp(
    starterPressureIndex +
      (Number.isFinite(bullpenPitchTypePressureIndex) ? (bullpenPitchTypePressureIndex - 50) * 0.16 : 0),
    18,
    94
  )
  const battingPressure = buildBattingPressureSummary(lineup)
  const pressureLabel =
    battingPressure.highAverageCount >= 5
      ? battingPressure.battingPressureLabel
      : (topThirdScore >= 63 || overperformHitters.some((entry) => entry.tag.includes('carry')))
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
  const starterMatchupKernelOverview = kernelEdgeHitters.length
    ? `${kernelEdgeHitters.map((entry) => entry.name).join(', ')} carry the clearest batter-vs-starter kernel into this matchup.`
    : kernelRiskHitters.length
      ? `${kernelRiskHitters.map((entry) => entry.name).join(', ')} are the main batter-vs-starter suppression pockets.`
      : `The batter-vs-starter kernel is closer to neutral, so ${teamName} need sequencing more than a broad matchup edge.`
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
      espnSplitEdgeCount,
      espnSplitRiskCount,
      heaterCount,
      suppressorCount,
      kernelFavorableCount,
      kernelSuppressedCount,
      platoonPressureIndex: roundToTenths(platoonPressureIndex),
      pitchTypePressureIndex: roundToTenths(pitchTypePressureIndex),
      pitchTypeLeagueGrade: roundToHundredths(averagePitchTypeLeagueGrade ?? 0),
      starterMatchupKernelIndex: roundToTenths(starterMatchupKernelIndex),
      starterMatchupKernelScore: roundToTenths(averageKernelScore ?? 50),
      starterMatchupKernelConfidence: roundToTenths(starterMatchupKernelConfidence ?? 0),
      bullpenPitchTypePressureIndex: Number.isFinite(bullpenPitchTypePressureIndex)
        ? roundToTenths(bullpenPitchTypePressureIndex)
        : null,
      starterPressureIndex: roundToTenths(starterPressureIndex),
      overallPressureIndex: roundToTenths(overallPressureIndex),
      topThirdScore: roundToTenths(topThirdScore ?? 50),
      topThirdKernelScore: roundToTenths(topThirdKernelScore ?? 50),
      depthScore: roundToTenths(depthScore ?? 50),
      ...battingPressure,
      starterMatchupKernelHitters: kernelEdgeHitters,
      starterMatchupKernelRisks: kernelRiskHitters,
      bullpenOverperformHitters
    },
    summary: {
      pressureLabel,
      overperformHitters,
      starterMatchupKernelHitters: kernelEdgeHitters,
      starterMatchupKernelRisks: kernelRiskHitters,
      bullpenOverperformHitters,
      underperformHitters,
      underperformNote,
      overview,
      starterMatchupKernelOverview,
      bullpenOverview,
      topThirdScore: roundToTenths(topThirdScore ?? 50),
      middleScore: roundToTenths(middleScore ?? 50),
      depthScore: roundToTenths(depthScore ?? 50),
      battingPressure,
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
      const espnHitterSplits = playerStatMaps.espnHitterSplits?.get(playerId) || null
      const statcastTrend = playerStatMaps.statcastTrends?.get(playerId) || null
      const opponentContext = playerStatMaps.opponentContext?.get(playerId) || null
      const careerProfile = playerStatMaps.careerProfiles?.get(playerId) || null
      const dataCoverage = playerStatMaps.dataCoverage?.get(Number(playerId)) || null
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
        espnHitterSplits,
        pitchTypeStatsByType,
        opposingPitcher,
        statcastTrend,
        opponentContext,
        careerProfile,
        dataCoverage
      })
    })
    .filter(Boolean)
}

const extractSupplementalLineupPlayers = ({
  rotoSide = null,
  boxscoreSide = {},
  playerStatMaps = {},
  opposingPitcher = null,
  expectedOfficialTeam = '',
  supplementalPlayerLookup = null
}) => {
  if (!rotoSide?.players?.length) return []

  const rosterLookup = buildRosterLookup(boxscoreSide)

  return rotoSide.players
    .map((player) => {
      const exactKey = normalizePersonName(player.name)
      const rosterEntry =
        rosterLookup.get(exactKey) ||
        rosterLookup.get(normalizePersonNameWithoutSuffix(player.name)) ||
        resolveSupplementalRotoPlayer(supplementalPlayerLookup, expectedOfficialTeam, player.name)
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
      const espnHitterSplits = playerStatMaps.espnHitterSplits?.get(playerId) || null
      const statcastTrend = playerStatMaps.statcastTrends?.get(playerId) || null
      const opponentContext = playerStatMaps.opponentContext?.get(playerId) || null
      const careerProfile = playerStatMaps.careerProfiles?.get(playerId) || null
      const dataCoverage = playerStatMaps.dataCoverage?.get(Number(playerId)) || null
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
        espnHitterSplits,
        pitchTypeStatsByType,
        opposingPitcher,
        statcastTrend,
        opponentContext,
        careerProfile,
        dataCoverage
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

  const rotoWirePitcherResolutionsByGameId = new Map()
  for (const record of feedRecords) {
    const { rawGame, feed } = record
    const officialKey = `${deskToOfficialTeam[rawGame.away] || rawGame.away} @ ${deskToOfficialTeam[rawGame.home] || rawGame.home}`
    const rotoWireCard = rotoWireCards.get(officialKey) || null
    rotoWirePitcherResolutionsByGameId.set(rawGame.id, {
      away: resolveRotoWireStarter({
        rotoSide: rotoWireCard?.away,
        boxscoreSide: feed.liveData?.boxscore?.teams?.away || {},
        fallbackStarter: rawGame.awayPitcher
      }),
      home: resolveRotoWireStarter({
        rotoSide: rotoWireCard?.home,
        boxscoreSide: feed.liveData?.boxscore?.teams?.home || {},
        fallbackStarter: rawGame.homePitcher
      })
    })
  }

  const [hotBatterBvpRows, coldBatterBvpRows] = await Promise.all([
    fetchRotoWireBvpRows({ date: options.date, type: 'hotbatter' }),
    fetchRotoWireBvpRows({ date: options.date, type: 'coldbatter' })
  ])
  const supplementalRotoPlayerLookup = await fetchRotoWireSupplementalPlayerResolutions({
    feedRecords,
    rotoWireCards
  })
  const supplementalRotoPlayerIds = supplementalPlayerIdsFromLookup(supplementalRotoPlayerLookup)

  const allPlayerIds = [
    ...new Set(
      feedRecords.flatMap((record) => [
        ...(record.feed.liveData?.boxscore?.teams?.away?.battingOrder || []),
        ...(record.feed.liveData?.boxscore?.teams?.home?.battingOrder || []),
        ...mapRotoLineupPlayerIds(
          rotoWireCards.get(`${deskToOfficialTeam[record.rawGame.away] || record.rawGame.away} @ ${deskToOfficialTeam[record.rawGame.home] || record.rawGame.home}`)?.away,
          record.feed.liveData?.boxscore?.teams?.away || {},
          supplementalRotoPlayerLookup,
          deskToOfficialTeam[record.rawGame.away] || record.rawGame.away
        ),
        ...mapRotoLineupPlayerIds(
          rotoWireCards.get(`${deskToOfficialTeam[record.rawGame.away] || record.rawGame.away} @ ${deskToOfficialTeam[record.rawGame.home] || record.rawGame.home}`)?.home,
          record.feed.liveData?.boxscore?.teams?.home || {},
          supplementalRotoPlayerLookup,
          deskToOfficialTeam[record.rawGame.home] || record.rawGame.home
        )
      ])
    )
  ]
  const starterIds = [
    ...new Set(
      [
        ...rawGames.flatMap((game) => [game.awayPitcher?.id, game.homePitcher?.id]),
        ...Array.from(rotoWirePitcherResolutionsByGameId.values()).flatMap((entry) => [
          entry.away?.starter?.id,
          entry.home?.starter?.id
        ])
      ]
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

  const [seasonMap, recentMap, vsRightMap, vsLeftMap, pitcherSeasonMap] = await Promise.all([
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
    ),
    fetchPlayerHydrateMap(
      starterIds,
      `stats(group=[pitching],type=[season],season=${options.date.slice(0, 4)})`
    )
  ])
  const sparseLivePlayerIds = allPlayerIds.filter(
    (playerId) =>
      !hasUsableStatRecord(seasonMap, playerId) &&
      !hasUsableStatRecord(recentMap, playerId) &&
      !hasUsableStatRecord(vsRightMap, playerId) &&
      !hasUsableStatRecord(vsLeftMap, playerId)
  )
  const sourceRefreshPlayerIds = [
    ...new Set([...supplementalRotoPlayerIds, ...sparseLivePlayerIds].map((value) => Number(value)).filter(Number.isFinite))
  ]

  const [pitchArsenalMaps, espnHitterSplitMap] = await Promise.all([
    buildPitchArsenalMaps({
      batterIds: allPlayerIds,
      pitcherIds: [...starterIds, ...relieverIds],
      year: Number(options.date.slice(0, 4))
    }),
    fetchEspnHitterSplitMap({ playerIds: allPlayerIds, peopleMap: seasonMap })
  ])
  const { batterPitchTypeStatsByPlayerId, pitcherPitchMixByPlayerId } = pitchArsenalMaps
  ingestHitterCareerProfiles(options.date, allPlayerIds)
  const supplementalRefreshReport = refreshSupplementalHitterStatcastContext({
    date: options.date,
    playerIds: sourceRefreshPlayerIds
  })
  const hitterStatcastTrendMap = fetchHitterStatcastTrendMap(options.date, allPlayerIds)
  const hitterOpponentContextMap = fetchHitterOpponentContextMap(options.date, allPlayerIds)
  const hitterCareerProfileMap = fetchHitterCareerProfileMap(allPlayerIds)

  const playerStatMaps = {
    season: seasonMap,
    recent: recentMap,
    vsRight: vsRightMap,
    vsLeft: vsLeftMap,
    espnHitterSplits: espnHitterSplitMap,
    pitchArsenal: batterPitchTypeStatsByPlayerId,
    statcastTrends: hitterStatcastTrendMap,
    opponentContext: hitterOpponentContextMap,
    careerProfiles: hitterCareerProfileMap
  }
  playerStatMaps.dataCoverage = buildHitterDataCoverageMap({
    playerIds: allPlayerIds,
    supplementalPlayerIds: supplementalRotoPlayerIds,
    sparseLivePlayerIds,
    supplementalRefreshReport,
    playerStatMaps
  })

  const lineupBoardsByGameId = {}
  const lineupMatchupContextByGameId = {}

  for (const record of feedRecords) {
    const { rawGame, feed } = record
    const awayOfficial = deskToOfficialTeam[rawGame.away] || rawGame.away
    const homeOfficial = deskToOfficialTeam[rawGame.home] || rawGame.home
    const awayDesk = officialToDeskTeam[awayOfficial] || rawGame.away
    const homeDesk = officialToDeskTeam[homeOfficial] || rawGame.home
    const pitcherResolutions = rotoWirePitcherResolutionsByGameId.get(rawGame.id) || {}
    const awayOpposingStarterContext = starterContextFromRotoWireResolution({
      resolution: pitcherResolutions.home,
      fallbackStarter: rawGame.homePitcher,
      pitcherSeasonMap
    })
    const homeOpposingStarterContext = starterContextFromRotoWireResolution({
      resolution: pitcherResolutions.away,
      fallbackStarter: rawGame.awayPitcher,
      pitcherSeasonMap
    })
    const awayPitcher = buildPitcherProfile(
      awayOpposingStarterContext,
      pitcherPitchMixByPlayerId.get(Number(awayOpposingStarterContext?.id)) || null
    )
    const homePitcher = buildPitcherProfile(
      homeOpposingStarterContext,
      pitcherPitchMixByPlayerId.get(Number(homeOpposingStarterContext?.id)) || null
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
      expectedOfficialTeam: awayOfficial,
      supplementalPlayerLookup: supplementalRotoPlayerLookup
    })
    const homeSupplementalLineup = extractSupplementalLineupPlayers({
      rotoSide: rotoWireCard?.home,
      boxscoreSide: homeBoxscore,
      playerStatMaps,
      opposingPitcher: homePitcher,
      expectedOfficialTeam: homeOfficial,
      supplementalPlayerLookup: supplementalRotoPlayerLookup
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
      opposingPitcherId: awayOpposingStarterContext?.id,
      opposingPitcherName: awayOpposingStarterContext?.fullName,
      hotRows: hotBatterBvpRows,
      coldRows: coldBatterBvpRows
    })
    const homeBvpHistory = buildBvpHistory({
      lineup: homeLineup,
      opposingPitcherId: homeOpposingStarterContext?.id,
      opposingPitcherName: homeOpposingStarterContext?.fullName,
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
      pitcherSourceContext: {
        away: pitcherResolutions.away
          ? {
              ...pitcherResolutions.away,
              opener: pitcherResolutions.away.opener || homeOpposingStarterContext?.openerContext || null,
              note:
                pitcherResolutions.away.note ||
                homeOpposingStarterContext?.starterRoleContext?.note ||
                homeOpposingStarterContext?.openerContext?.note ||
                ''
            }
          : null,
        home: pitcherResolutions.home
          ? {
              ...pitcherResolutions.home,
              opener: pitcherResolutions.home.opener || awayOpposingStarterContext?.openerContext || null,
              note:
                pitcherResolutions.home.note ||
                awayOpposingStarterContext?.starterRoleContext?.note ||
                awayOpposingStarterContext?.openerContext?.note ||
                ''
            }
          : null
      },
      away: {
        teamName: awayDesk,
        lineupSource: awaySelection.source,
        opposingStarter: {
          id: awayOpposingStarterContext?.id || null,
          name: awayPitcher?.fullName || '',
          hand: awayPitcher?.handedness || '',
          type: awayPitcher?.profileType || 'Unknown sample',
          sourceRole: awayOpposingStarterContext?.probableSource || pitcherResolutions.home?.source || 'mlb-probable',
          roleLabel: awayOpposingStarterContext?.starterRoleContext?.roleLabel || pitcherResolutions.home?.starter?.roleLabel || '',
          statLine: awayOpposingStarterContext?.statLine || pitcherResolutions.home?.starter?.statLine || '',
          openerContext: awayOpposingStarterContext?.openerContext || pitcherResolutions.home?.opener || null,
          starterRoleContext: awayOpposingStarterContext?.starterRoleContext || {
            source: pitcherResolutions.home?.source || 'mlb-probable',
            role: pitcherResolutions.home?.role || 'starter',
            roleLabel: pitcherResolutions.home?.starter?.roleLabel || '',
            note: pitcherResolutions.home?.note || ''
          },
          inningsPitched: awayPitcher?.inningsFloat ?? null,
          homeRunsAllowed: awayPitcher?.homeRunsAllowed ?? null,
          homeRunsPerNine: awayPitcher?.homeRunsPerNine ?? null,
          recentHomeRunsAllowed: awayPitcher?.recentHomeRunsAllowed ?? null,
          recentHomeRunsAllowedPerStart: awayPitcher?.recentHomeRunsAllowedPerStart ?? null,
          recentHomeRunsPerNine: awayPitcher?.recentHomeRunsPerNine ?? null,
          homeRunDamageLabel: awayPitcher?.homeRunDamageLabel || '',
          pitchMixSummary:
            awayPitcher?.pitchMix?.topPitches
              ?.slice(0, 3)
              .map((pitch) => `${pitch.pitchName} ${pitch.pitchUsage.toFixed(0)}%`)
              .join(' / ') || ''
        },
        openerContext: awayOpposingStarterContext?.openerContext || pitcherResolutions.home?.opener || null,
        starterRoleContext: awayOpposingStarterContext?.starterRoleContext || {
          source: pitcherResolutions.home?.source || 'mlb-probable',
          role: pitcherResolutions.home?.role || 'starter',
          roleLabel: pitcherResolutions.home?.starter?.roleLabel || '',
          note: pitcherResolutions.home?.note || ''
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
          id: homeOpposingStarterContext?.id || null,
          name: homePitcher?.fullName || '',
          hand: homePitcher?.handedness || '',
          type: homePitcher?.profileType || 'Unknown sample',
          sourceRole: homeOpposingStarterContext?.probableSource || pitcherResolutions.away?.source || 'mlb-probable',
          roleLabel: homeOpposingStarterContext?.starterRoleContext?.roleLabel || pitcherResolutions.away?.starter?.roleLabel || '',
          statLine: homeOpposingStarterContext?.statLine || pitcherResolutions.away?.starter?.statLine || '',
          openerContext: homeOpposingStarterContext?.openerContext || pitcherResolutions.away?.opener || null,
          starterRoleContext: homeOpposingStarterContext?.starterRoleContext || {
            source: pitcherResolutions.away?.source || 'mlb-probable',
            role: pitcherResolutions.away?.role || 'starter',
            roleLabel: pitcherResolutions.away?.starter?.roleLabel || '',
            note: pitcherResolutions.away?.note || ''
          },
          inningsPitched: homePitcher?.inningsFloat ?? null,
          homeRunsAllowed: homePitcher?.homeRunsAllowed ?? null,
          homeRunsPerNine: homePitcher?.homeRunsPerNine ?? null,
          recentHomeRunsAllowed: homePitcher?.recentHomeRunsAllowed ?? null,
          recentHomeRunsAllowedPerStart: homePitcher?.recentHomeRunsAllowedPerStart ?? null,
          recentHomeRunsPerNine: homePitcher?.recentHomeRunsPerNine ?? null,
          homeRunDamageLabel: homePitcher?.homeRunDamageLabel || '',
          pitchMixSummary:
            homePitcher?.pitchMix?.topPitches
              ?.slice(0, 3)
              .map((pitch) => `${pitch.pitchName} ${pitch.pitchUsage.toFixed(0)}%`)
              .join(' / ') || ''
        },
        openerContext: homeOpposingStarterContext?.openerContext || pitcherResolutions.away?.opener || null,
        starterRoleContext: homeOpposingStarterContext?.starterRoleContext || {
          source: pitcherResolutions.away?.source || 'mlb-probable',
          role: pitcherResolutions.away?.role || 'starter',
          roleLabel: pitcherResolutions.away?.starter?.roleLabel || '',
          note: pitcherResolutions.away?.note || ''
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
      supplementalRotoWireHitters: {
        playerCount: supplementalRotoPlayerIds.length,
        playerIds: supplementalRotoPlayerIds,
        sparseLivePlayerCount: sparseLivePlayerIds.length,
        sparseLivePlayerIds,
        sourceRefreshPlayerIds,
        statcastRefresh: supplementalRefreshReport
      },
      sourceLabel:
        'Official MLB feed/live batting orders plus official player season, recent, handedness split, ESPN hitter L/R splits, ESPN pitcher L/R allowed splits, and Statcast pitch-arsenal vs league matchup data, supplemented by RotoWire daily lineups, RotoWire primary/bulk pitcher tags, opener addendums, and weather.'
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
  ingestHitterLineupSplits(options.date, options.out)

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
