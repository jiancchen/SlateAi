import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

import { activeMlbAppModelId, resolveMlbAppAdapter } from '../app-model.js'
import { currentDayBoardForDate } from './queries.mjs'
import { querySqlite } from './sqlite.mjs'

const oddsProvider = 'MLB typed DB current-day board'
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..', '..', '..')

const shortTeamNameByOfficial = {
  'Arizona Diamondbacks': 'Diamondbacks',
  Athletics: 'Athletics',
  'Atlanta Braves': 'Braves',
  'Baltimore Orioles': 'Orioles',
  'Boston Red Sox': 'Red Sox',
  'Chicago Cubs': 'Cubs',
  'Chicago White Sox': 'White Sox',
  'Cincinnati Reds': 'Reds',
  'Cleveland Guardians': 'Guardians',
  'Colorado Rockies': 'Rockies',
  'Detroit Tigers': 'Tigers',
  'Houston Astros': 'Astros',
  'Kansas City Royals': 'Royals',
  'Los Angeles Angels': 'Angels',
  'Los Angeles Dodgers': 'Dodgers',
  'Miami Marlins': 'Marlins',
  'Milwaukee Brewers': 'Brewers',
  'Minnesota Twins': 'Twins',
  'New York Mets': 'Mets',
  'New York Yankees': 'Yankees',
  'Philadelphia Phillies': 'Phillies',
  'Pittsburgh Pirates': 'Pirates',
  'San Diego Padres': 'Padres',
  'San Francisco Giants': 'Giants',
  'Seattle Mariners': 'Mariners',
  'St. Louis Cardinals': 'Cardinals',
  'Tampa Bay Rays': 'Rays',
  'Texas Rangers': 'Rangers',
  'Toronto Blue Jays': 'Blue Jays',
  'Washington Nationals': 'Nationals'
}

const shortTeamName = (name = '') => shortTeamNameByOfficial[name] || name

const slugify = (value = '') =>
  String(value)
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

const parseJson = (value) => {
  if (!value) return null
  try {
    return JSON.parse(value)
  } catch {
    return null
  }
}

const importMaybeFresh = async (absolutePath) => {
  try {
    return await import(`${pathToFileURL(absolutePath).href}?t=${Date.now()}`)
  } catch {
    return null
  }
}

const num = (value, fallback = null) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

const round = (value, digits = 2) => {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return null
  const factor = 10 ** digits
  return Math.round(parsed * factor) / factor
}

const average = (values = []) => {
  const numeric = values.map(Number).filter(Number.isFinite)
  return numeric.length ? numeric.reduce((sum, value) => sum + value, 0) / numeric.length : null
}

const groupBy = (rows = [], keyFn) =>
  rows.reduce((acc, row) => {
    const key = keyFn(row)
    if (!acc.has(key)) acc.set(key, [])
    acc.get(key).push(row)
    return acc
  }, new Map())

const indexBy = (rows = [], keyFn) =>
  rows.reduce((acc, row) => {
    acc.set(keyFn(row), row)
    return acc
  }, new Map())

const toPtStart = (iso = '') => {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) {
    return { start: '', startMinutes: 0 }
  }
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Los_Angeles',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
      .formatToParts(date)
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, part.value])
  )
  const hour12 = Number(parts.hour || 0)
  const minute = Number(parts.minute || 0)
  const dayPeriod = `${parts.dayPeriod || ''}`.toUpperCase()
  const hour24 = dayPeriod === 'PM' && hour12 !== 12 ? hour12 + 12 : dayPeriod === 'AM' && hour12 === 12 ? 0 : hour12
  return {
    start: `${hour12}:${String(minute).padStart(2, '0')} ${dayPeriod} PT`,
    startMinutes: hour24 * 60 + minute
  }
}

const americanFromPriceCents = (priceCents) => {
  const p = Number(priceCents) / 100
  if (!Number.isFinite(p) || p <= 0 || p >= 1) return null
  return p >= 0.5 ? -Math.round((p / (1 - p)) * 100) : Math.round(((1 - p) / p) * 100)
}

const formatAmerican = (value) => {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return ''
  return parsed > 0 ? `+${Math.round(parsed)}` : `${Math.round(parsed)}`
}

const market = (label, book, value) => ({ label, book, value })

const makeBoardOdds = ({ spread = '', total = '', moneyline = '', provider = oddsProvider }) => ({
  participantOrder: [0, 1],
  markets: [
    ...(spread ? [market('Spread', provider, spread)] : []),
    ...(total ? [market('Total', provider, total)] : []),
    ...(moneyline ? [market('Moneyline', provider, moneyline)] : [])
  ],
  note: 'Typed DB board snapshot plus model context.',
  provider
})

const parseBaseballInnings = (outs = 0) => {
  const numericOuts = Number(outs)
  if (!Number.isFinite(numericOuts) || numericOuts <= 0) return '0.0'
  const whole = Math.floor(numericOuts / 3)
  const partial = numericOuts % 3
  return `${whole}.${partial}`
}

const loadDbContext = (date) => {
  const pitcherSeasonRows = querySqlite(
    `
    select
      pa.pitcher_id,
      count(*) as games,
      sum(case when pa.is_starting_pitcher = 1 then 1 else 0 end) as games_started,
      sum(pa.outs_recorded) as outs_recorded,
      sum(pa.earned_runs) as earned_runs,
      sum(pa.runs_allowed) as runs_allowed,
      sum(pa.hits_allowed) as hits_allowed,
      sum(pa.home_runs_allowed) as home_runs_allowed,
      sum(pa.walks_allowed) as walks_allowed,
      sum(pa.strikeouts) as strikeouts
    from pitcher_appearances pa
    where pa.game_date < ?
    group by pa.pitcher_id
    `,
    [date]
  )
  const pitcherFormRows = querySqlite(
    `
    select *
    from starting_pitcher_form_snapshots
    where snapshot_date = ?
    order by pitcher_id, window_starts desc
    `,
    [date]
  )
  const pitcherPitchMixRows = querySqlite(
    `
    select ppm.*, players.name as pitcher_name
    from pitcher_pitch_mix_snapshots ppm
    left join players on players.player_id = ppm.pitcher_id
    where ppm.snapshot_date = ?
    order by ppm.pitcher_id, ppm.pitch_share desc
    `,
    [date]
  )
  const lineupPlayerRows = querySqlite(
    `
    with active_source as (
      select json_extract(notes, '$.source_snapshot_id') as source_snapshot_id
      from source_fetch_status
      where sport = 'mlb'
        and source_name = 'mlb_lineups'
        and source_date = ?
    )
    select
      l.game_id,
      l.team_id,
      teams.name as team_name,
      l.lineup_id,
      l.lineup_status,
      s.batting_order,
      s.position,
      p.player_id,
      p.mlb_player_id,
      p.name as player_name,
      p.bats,
      p.primary_position,
      ps.source_detail_json as split_source_detail_json,
      ps.plate_appearances as split_plate_appearances,
      ps.at_bats as split_at_bats,
      ps.hits as split_hits,
      ps.home_runs as split_home_runs,
      ps.doubles as split_doubles,
      ps.triples as split_triples,
      ps.singles as split_singles,
      ps.walks as split_walks,
      ps.batting_average as split_avg,
      ps.on_base_percentage as split_obp,
      ps.slugging_percentage as split_slg,
      ps.ops as split_ops,
      ps.hit_rate as split_hit_rate,
      ps.singles_rate as split_singles_rate,
      ps.home_run_rate as split_hr_rate,
      ps.total_bases as split_total_bases,
      ps.total_bases_rate as split_total_bases_rate,
      ps.walk_rate as split_walk_rate
    from lineups l
    join active_source src on src.source_snapshot_id = l.source_snapshot_id
    join teams on teams.team_id = l.team_id
    join lineup_slots s on s.lineup_id = l.lineup_id
    join players p on p.player_id = s.player_id
    left join player_split_snapshots ps on ps.game_id = l.game_id and ps.player_id = s.player_id
    where l.captured_at like ?
    order by l.game_id, l.team_id, s.batting_order
    `,
    [date, `${date}%`],
    { maxBuffer: 1024 * 1024 * 80 }
  )
  const classicRows = querySqlite(
    `
    select *
    from player_classic_stat_snapshots
    where snapshot_date = ?
    `,
    [date],
    { maxBuffer: 1024 * 1024 * 40 }
  )
  const statcastRows = querySqlite(
    `
    select *
    from player_statcast_snapshots
    where snapshot_date = ?
    `,
    [date],
    { maxBuffer: 1024 * 1024 * 40 }
  )
  const careerRows = querySqlite(
    `
    select *
    from player_career_profiles
    where snapshot_date = ?
    `,
    [date],
    { maxBuffer: 1024 * 1024 * 40 }
  )
  const currentDeviationRows = querySqlite(
    `
    select *
    from player_current_deviation_snapshots
    where snapshot_date = ?
    `,
    [date],
    { maxBuffer: 1024 * 1024 * 40 }
  )
  const lineupMatchupRows = querySqlite(
    `
    select *
    from lineup_matchup_snapshots
    where snapshot_date = ?
    `,
    [date],
    { maxBuffer: 1024 * 1024 * 40 }
  )
  const lineupShapeRows = querySqlite(
    `
    select *
    from lineup_shape_snapshots
    where snapshot_date = ?
    `,
    [date]
  )
  const reliefRows = querySqlite(
    `
    select lrc.*, players.name as pitcher_name
    from likely_relief_chains lrc
    left join players on players.player_id = lrc.pitcher_id
    where lrc.snapshot_date = ?
    order by lrc.team_id, lrc.predicted_rank
    `,
    [date]
  )
  const rollingRows = querySqlite(
    `
    select *
    from team_rolling_form_snapshots
    where snapshot_date = ?
    `,
    [date]
  )
  const firstInningRows = querySqlite(
    `
    select *
    from team_first_inning_profiles
    where snapshot_date = ?
    `,
    [date]
  )
  const mistakeRows = querySqlite(
    `
    select *
    from team_mistake_shape_snapshots
    where snapshot_date = ?
    `,
    [date]
  )
  const bullpenShapeRows = querySqlite(
    `
    select *
    from team_bullpen_shape_snapshots
    where snapshot_date = ?
    `,
    [date]
  )
  const teamStateRows = querySqlite(
    `
    select *
    from team_state_snapshots
    where snapshot_date = ?
    `,
    [date]
  )
  const sunRows = querySqlite(
    `
    select *
    from game_sun_visibility_snapshots
    where game_date = ?
    `,
    [date]
  )
  const espnPitcherSplitRows = querySqlite(
    `
    select *
    from mlb_pitcher_espn_splits
    where snapshot_date = ?
    `,
    [date],
    { maxBuffer: 1024 * 1024 * 20 }
  )

  return {
    pitcherSeasonById: indexBy(pitcherSeasonRows, (row) => row.pitcher_id),
    pitcherFormById: groupBy(pitcherFormRows, (row) => row.pitcher_id),
    pitcherPitchMixById: groupBy(pitcherPitchMixRows, (row) => row.pitcher_id),
    lineupPlayersByGameTeam: groupBy(lineupPlayerRows, (row) => `${row.game_id}:${row.team_id}`),
    classicByPlayerId: indexBy(classicRows, (row) => row.player_id),
    statcastByPlayerId: indexBy(statcastRows, (row) => row.player_id),
    careerByPlayerId: indexBy(careerRows, (row) => row.player_id),
    deviationsByPlayerId: groupBy(currentDeviationRows, (row) => row.player_id),
    lineupMatchupsByGameTeam: groupBy(lineupMatchupRows, (row) => `${row.game_id}:${row.team_id}`),
    lineupShapeByTeamType: groupBy(lineupShapeRows, (row) => `${row.team_id}:${row.shape_type}`),
    reliefByTeamId: groupBy(reliefRows, (row) => row.team_id),
    rollingByTeamId: groupBy(rollingRows, (row) => row.team_id),
    firstInningByTeamId: groupBy(firstInningRows, (row) => row.team_id),
    mistakeByTeamId: groupBy(mistakeRows, (row) => row.team_id),
    bullpenShapeByTeamId: groupBy(bullpenShapeRows, (row) => row.team_id),
    teamStateByTeamId: indexBy(teamStateRows, (row) => row.team_id),
    sunByGameId: indexBy(sunRows, (row) => row.game_id),
    espnPitcherSplitsByGamePitcher: indexBy(espnPitcherSplitRows, (row) => `${row.game_id}:${row.pitcher_id}`)
  }
}

const bestWindowRow = (rows = [], preferred = [10, 8, 5, 15, 30]) => {
  for (const window of preferred) {
    const match = rows.find((row) => Number(row.window_games ?? row.window_starts) === window)
    if (match) return match
  }
  return rows[0] || null
}

const buildPitchMixSummary = (rows = []) =>
  rows
    .slice(0, 3)
    .map((row) => `${row.pitch_type} ${round(row.pitch_share, 0) ?? 0}%`)
    .join(' / ')

const buildEspnPitcherSplits = (row = {}) => {
  if (!row?.source_status) return null
  return {
    source: 'ESPN player splits',
    sourceUrl: row.source_url || '',
    sourceStatus: row.source_status,
    espnAthleteId: row.espn_athlete_id || '',
    pitcherName: row.pitcher_name || '',
    pitcherTeam: row.pitcher_team || '',
    opponentTeam: row.opponent_team || '',
    venueName: row.venue_name || '',
    categories: parseJson(row.categories_json) || [],
    insights: parseJson(row.insights_json) || [],
    fetchedAt: row.fetched_at || ''
  }
}

const buildPitcher = (starter = {}, context) => {
  const season = context.pitcherSeasonById.get(starter.player_id) || {}
  const form = bestWindowRow(context.pitcherFormById.get(starter.player_id) || [], [5, 10])
  const pitchMixRows = context.pitcherPitchMixById.get(starter.player_id) || []
  const espnSplits = buildEspnPitcherSplits(context.espnPitcherSplitsByGamePitcher.get(`${starter.game_id}:${starter.player_id}`))
  const outs = num(season.outs_recorded, 0)
  const innings = outs / 3
  const earnedRuns = num(season.earned_runs, null)
  const hitsAllowed = num(season.hits_allowed, null)
  const walks = num(season.walks_allowed, null)
  const strikeouts = num(season.strikeouts, null)
  const homeRunsAllowed = num(season.home_runs_allowed, null)
  const era = outs > 0 && Number.isFinite(earnedRuns) ? ((earnedRuns * 27) / outs).toFixed(2) : ''
  const whip = innings > 0 && Number.isFinite(hitsAllowed) && Number.isFinite(walks) ? ((hitsAllowed + walks) / innings).toFixed(2) : ''
  const starts = num(season.games_started, 0)
  const expectedInnings = round(form?.innings_per_start, 1)

  return {
    id: starter.mlb_player_id,
    playerId: starter.player_id,
    fullName: starter.pitcher_name,
    pitchHand: starter.throws || '?',
    wins: 0,
    losses: 0,
    era,
    strikeOuts: strikeouts ?? 0,
    inningsPitched: parseBaseballInnings(outs),
    hitsAllowed: hitsAllowed ?? 0,
    walks: walks ?? 0,
    homeRunsAllowed: homeRunsAllowed ?? 0,
    whip,
    gamesStarted: starts,
    probableSource: starter.source_name || 'typed-db',
    pitchMixSummary: buildPitchMixSummary(pitchMixRows),
    espnSplits,
    recentForm: form
      ? {
          windowStarts: num(form.window_starts),
          startsSample: num(form.starts_sample),
          inningsPerStart: round(form.innings_per_start, 2),
          runsAllowedPerStart: round(form.runs_allowed_per_start, 2),
          strikeoutsPerStart: round(form.strikeouts_per_start, 2),
          walksAllowedPerStart: round(form.walks_allowed_per_start, 2),
          whipLike: round(form.whip_like, 2),
          qualityStartRate: round(form.quality_start_rate, 3),
          shortStartRate: round(form.short_start_rate, 3),
          runVolatility: round(form.run_volatility, 2)
        }
      : null,
    usageContext: {
      status: starts <= 2 ? 'tiny-sample' : starts <= 5 ? 'small-sample' : 'season-sample',
      label: starts <= 2 ? 'Tiny MLB sample' : starts <= 5 ? 'Small starter sample' : 'Season starter sample',
      expectedInnings,
      startsLoaded: starts,
      shortLeashRisk: form ? round(form.short_start_rate, 2) : null,
      workloadLabel: expectedInnings && expectedInnings < 5 ? 'Short leash' : 'Normal leash'
    }
  }
}

const splitObjectFromRow = (row = {}) => ({
  plateAppearances: num(row.split_plate_appearances, 0),
  atBats: num(row.split_at_bats, 0),
  hits: num(row.split_hits, 0),
  singles: num(row.split_singles, 0),
  doubles: num(row.split_doubles, 0),
  triples: num(row.split_triples, 0),
  homeRuns: num(row.split_home_runs, 0),
  walks: num(row.split_walks, 0),
  totalBases: num(row.split_total_bases, 0),
  avg: num(row.split_avg, 0),
  obp: num(row.split_obp, 0),
  slg: num(row.split_slg, 0),
  ops: num(row.split_ops, 0),
  hitRate: num(row.split_hit_rate, 0),
  singlesRate: num(row.split_singles_rate, 0),
  hrRate: num(row.split_hr_rate, 0),
  walkRate: num(row.split_walk_rate, 0),
  totalBasesRate: num(row.split_total_bases_rate, 0)
})

const recentObjectFromClassic = (row = {}) => {
  const pa = num(row.pa_sample_last10, 0)
  const hitRate = num(row.hits_per_pa_last10, 0)
  const totalBasesRate = num(row.total_bases_per_pa_last10, 0)
  return {
    gamesPlayed: num(row.games_sample_last10, 0),
    plateAppearances: pa,
    hits: round(pa * hitRate, 0) ?? 0,
    totalBases: round(pa * totalBasesRate, 0) ?? 0,
    walks: round(pa * num(row.walk_rate_last10, 0), 0) ?? 0,
    hitRate,
    totalBasesRate,
    walkRate: num(row.walk_rate_last10, 0),
    kRate: num(row.strikeout_rate_last10, 0),
    ops: null
  }
}

const buildApproachState = (deviationRows = []) => {
  if (!deviationRows.length) return null
  const primary = deviationRows.find((row) => row.metric === 'total_bases_per_pa') || deviationRows[0]
  return {
    confidenceScore: round(50 + num(primary.current_deviation, 0) * 100, 1),
    processScore: round(50 + num(primary.confidence_weight, 0.5) * 20, 1),
    identityDelta: round(primary.current_deviation, 3),
    rolePressure: round(primary.role_pressure, 1),
    approachLabel: primary.approach_label || primary.deviation_label || 'stable',
    metric: primary.metric,
    sampleSize: num(primary.sample_size, null)
  }
}

const buildStatcastTrend = (row = {}) =>
  row
    ? {
        gamesSample7: num(row.games_sample_7, 0),
        paSample7: num(row.pa_sample_7, 0),
        bbeSample7: num(row.bbe_sample_7, 0),
        rolling7Xwoba: num(row.rolling_7_xwoba, null),
        rolling7Xba: num(row.rolling_7_xba, null),
        rolling7Xslg: num(row.rolling_7_xslg, null),
        rolling7BarrelPct: num(row.rolling_7_barrel_pct, null),
        rolling7HardHitPct: num(row.rolling_7_hard_hit_pct, null),
        rolling7SweetSpotPct: num(row.rolling_7_sweet_spot_pct, null),
        xwobaTrend: num(row.xwoba_trend_7_minus_30, null),
        barrelTrend: num(row.barrel_trend_7_minus_30, null),
        hardHitTrend: num(row.hard_hit_trend_7_minus_30, null),
        sweetSpotTrend: num(row.sweet_spot_trend_7_minus_30, null)
      }
    : null

const buildCareerProfile = (row = {}) =>
  row
    ? {
        careerPlateAppearances: num(row.career_plate_appearances, 0),
        careerOps: num(row.career_ops, null),
        careerHomeRuns: num(row.career_home_runs, 0),
        careerTbPerPa: num(row.career_tb_per_pa, null),
        careerPowerIndex: num(row.career_power_index, null),
        contactRiskIndex: num(row.contact_risk_index, null),
        roleStabilityIndex: num(row.role_stability_index, null),
        repeatabilityLabel: row.repeatability_label || null
      }
    : null

const buildLineupPlayer = (row, context) => {
  const raw = parseJson(row.split_source_detail_json)?.raw_json || {}
  const split = raw.split || splitObjectFromRow(row)
  const classic = context.classicByPlayerId.get(row.player_id)
  const statcast = context.statcastByPlayerId.get(row.player_id)
  const career = context.careerByPlayerId.get(row.player_id)
  const deviations = context.deviationsByPlayerId.get(row.player_id) || []
  const season = raw.season || splitObjectFromRow(row)
  const recent = raw.recent || recentObjectFromClassic(classic)

  return {
    playerId: row.mlb_player_id,
    internalPlayerId: row.player_id,
    slot: num(row.batting_order),
    name: row.player_name,
    position: row.position || row.primary_position,
    bats: row.bats || raw.player?.bats || '',
    savant: raw.savant || null,
    season,
    recent,
    split,
    metrics: raw.metrics || {},
    pitchType: raw.pitchType || null,
    statcastTrend: raw.statcastTrend || buildStatcastTrend(statcast),
    careerProfile: raw.careerProfile || buildCareerProfile(career),
    approachState: buildApproachState(deviations),
    summary: raw.summary || ''
  }
}

const buildLineupContext = (rows = []) => {
  const grades = rows.map((row) => num(row.matchup_grade ?? parseJson(row.source_detail_json)?.raw_json?.metrics?.matchupGrade)).filter(Number.isFinite)
  const pitchGrades = rows
    .map((row) => num(parseJson(row.source_detail_json)?.raw_json?.metrics?.pitchTypeGrade))
    .filter(Number.isFinite)
  return {
    averageMatchupGrade: round(average(grades), 2) ?? 0,
    platoonCount: 0,
    pitchTypePressureIndex: round(50 + (average(pitchGrades) ?? 0) * 5, 1) ?? 50,
    bullpenPitchTypePressureIndex: 50,
    starterPressureIndex: round(50 + (average(grades) ?? 0) * 2, 1) ?? 50
  }
}

const buildLineupBoardSide = ({ game, teamId, opponentPitcher, opponentTeamId, context }) => {
  const lineupRows = context.lineupPlayersByGameTeam.get(`${game.game_id}:${teamId}`) || []
  const matchupRows = context.lineupMatchupsByGameTeam.get(`${game.game_id}:${teamId}`) || []
  const firstRow = lineupRows[0]
  const reliefRows = context.reliefByTeamId.get(opponentTeamId) || []
  return {
    teamName: shortTeamName(firstRow?.team_name || ''),
    lineupSource: 'typed-db',
    opposingStarter: {
      id: opponentPitcher?.id,
      name: opponentPitcher?.fullName,
      hand: opponentPitcher?.pitchHand,
      type: opponentPitcher?.usageContext?.workloadLabel || 'Starter',
      pitchMixSummary: opponentPitcher?.pitchMixSummary || ''
    },
    opposingRelievers: reliefRows.slice(0, 2).map((row) => ({
      name: row.pitcher_name,
      role: row.likely_role,
      availabilityScore: num(row.availability_score, null),
      firstRelieverLikelihood: num(row.first_reliever_likelihood, null),
      bridgeScore: num(row.bridge_score, null)
    })),
    lineup: lineupRows.map((row) => buildLineupPlayer(row, context)),
    matchupContext: buildLineupContext(matchupRows)
  }
}

const buildBullpenChain = (teamId, context) => {
  const rows = context.reliefByTeamId.get(teamId) || []
  return {
    topRelievers: rows.slice(0, 4).map((row) => ({
      name: row.pitcher_name,
      role: row.likely_role,
      expectedOuts: num(row.expected_outs, null),
      availabilityScore: num(row.availability_score, null),
      bridgeScore: num(row.bridge_score, null),
      firstRelieverLikelihood: num(row.first_reliever_likelihood, null),
      workedYesterday: Boolean(num(row.worked_yesterday_flag, 0)),
      backToBack: Boolean(num(row.back_to_back_flag, 0))
    }))
  }
}

const buildTeamOffenseContext = (teamId, role, context) => {
  const rolling = bestWindowRow(context.rollingByTeamId.get(teamId) || [], [10, 5, 15, 30])
  if (!rolling) {
    return {
      hitsPerGame: 8,
      last3HitsPerGame: 8,
      awayHitsPerGame: /away/i.test(role) ? 8 : 7.9,
      homeHitsPerGame: /home/i.test(role) ? 8 : 8.1,
      staleFeed: true
    }
  }
  const hits = num(rolling.hits_per_game, null)
  return {
    hitsPerGame: hits,
    last3HitsPerGame: hits + num(rolling.recent_3_runs_delta, 0) * 0.4,
    awayHitsPerGame: /away/i.test(role) ? hits : hits - 0.1,
    homeHitsPerGame: /home/i.test(role) ? hits : hits + 0.1,
    staleFeed: false
  }
}

const buildTeamBullpenContext = (teamId, context) => {
  const row = bestWindowRow(context.bullpenShapeByTeamId.get(teamId) || [], [10, 5, 15, 30])
  if (!row) return null
  const runs = num(row.total_relief_runs_allowed_avg_last10 ?? row.total_relief_runs_allowed_avg_last5, 1.4)
  const outs = num(row.total_relief_outs_avg_last10 ?? row.total_relief_outs_avg_last5, 9)
  const era = outs > 0 ? (runs * 27) / outs : 4.2
  return {
    era: round(era, 2),
    whip: round(1.15 + num(row.bullpen_shape_index, 50) / 180, 2),
    strikeouts: 100,
    walks: 38,
    staleFeed: false
  }
}

const buildTeamSavantContext = (teamId, context) => {
  const players = [...context.classicByPlayerId.values()].filter((row) => row.team_id === teamId)
  const statcast = [...context.statcastByPlayerId.values()].filter((row) => row.team_id === teamId)
  const hitRate = average(players.map((row) => row.hits_per_pa_last10))
  const xba = average(statcast.map((row) => row.rolling_7_xba ?? row.rolling_14_xba ?? row.rolling_30_xba))
  const xwoba = average(statcast.map((row) => row.rolling_7_xwoba ?? row.rolling_14_xwoba ?? row.rolling_30_xwoba))
  const hardHitPct = average(statcast.map((row) => row.rolling_7_hard_hit_pct ?? row.rolling_14_hard_hit_pct))
  const barrelPct = average(statcast.map((row) => row.rolling_7_barrel_pct ?? row.rolling_14_barrel_pct))
  if (![hitRate, xba, xwoba, hardHitPct, barrelPct].every(Number.isFinite)) {
    return {
      ba: 0.245,
      xba: 0.245,
      xwoba: 0.315,
      hardHitPct: 38,
      barrelPct: 7,
      staleFeed: true
    }
  }
  return {
    ba: round(hitRate, 3),
    xba: round(xba, 3),
    xwoba: round(xwoba, 3),
    hardHitPct: round(hardHitPct, 1),
    barrelPct: round(barrelPct, 1)
  }
}

const buildStoryContext = (teamId, context) => {
  const state = context.teamStateByTeamId.get(teamId)
  if (!state) return null
  const form = num(state.form_pressure_index, 50)
  const snapback = num(state.snapback_pressure_index, 50)
  const heat = num(state.heat_regression_index, 50)
  return {
    summary: `${state.streak_direction || ''}${state.streak_length || ''} | form ${round(form, 0)} | snapback ${round(snapback, 0)}`,
    offenseSustainability: form,
    lineupMomentum: form,
    starterTrajectory: 50,
    bullpenTrust: 100 - Math.max(0, num(state.bullpen_flip_loss_count_last5, 0) * 14),
    callupEnergy: 50,
    variance: heat,
    tags: [state.previous_result, state.division_matchup_flag ? 'division' : 'non-division'].filter(Boolean)
  }
}

const buildStateContext = (game, context, awayTeamId, homeTeamId) => ({
  sunVisibility: context.sunByGameId.get(game.game_id) || null,
  teamState: {
    away: context.teamStateByTeamId.get(awayTeamId) || null,
    home: context.teamStateByTeamId.get(homeTeamId) || null
  },
  firstInningTeam: {
    away: bestWindowRow(context.firstInningByTeamId.get(awayTeamId) || [], [10, 8, 5, 30]) || null,
    home: bestWindowRow(context.firstInningByTeamId.get(homeTeamId) || [], [10, 8, 5, 30]) || null
  },
  teamMistakeShape: {
    away: bestWindowRow(context.mistakeByTeamId.get(awayTeamId) || [], [10, 8, 5, 30]) || null,
    home: bestWindowRow(context.mistakeByTeamId.get(homeTeamId) || [], [10, 8, 5, 30]) || null
  },
  lineupConversion: {
    away: bestWindowRow(context.lineupShapeByTeamType.get(`${awayTeamId}:conversion`) || [], [10, 8, 15, 30]) || null,
    home: bestWindowRow(context.lineupShapeByTeamType.get(`${homeTeamId}:conversion`) || [], [10, 8, 15, 30]) || null
  }
})

const buildMoneyline = (markets, awayTeamId, homeTeamId) => {
  const winners = markets.filter((marketRow) => marketRow.market_type === 'winner')
  const byTeam = new Map()
  for (const marketRow of winners) {
    if (!marketRow.team_id || byTeam.has(marketRow.team_id)) continue
    const american = num(marketRow.odds_american, null) ?? americanFromPriceCents(marketRow.price_cents)
    if (Number.isFinite(american)) byTeam.set(marketRow.team_id, american)
  }
  if (!byTeam.has(awayTeamId) || !byTeam.has(homeTeamId)) return ''
  return `${formatAmerican(byTeam.get(awayTeamId))} / ${formatAmerican(byTeam.get(homeTeamId))}`
}

const buildTotal = (markets) => {
  const totals = markets
    .filter((marketRow) => marketRow.market_type === 'total' && /^Over/i.test(marketRow.selection_name || ''))
    .map((marketRow) => ({ line: num(marketRow.line_value), price: num(marketRow.price_cents) }))
    .filter((marketRow) => Number.isFinite(marketRow.line))
    .sort((left, right) => Math.abs((left.price ?? 50) - 50) - Math.abs((right.price ?? 50) - 50))
  const best = totals[0]
  return best ? `${best.line.toFixed(1)} Runs` : ''
}

const buildSpread = (markets) => {
  const spread = markets.find((marketRow) => marketRow.market_type === 'spread' && Number.isFinite(num(marketRow.line_value)))
  return spread ? `${spread.line_value}` : ''
}

const formatPitcherDetail = (pitcher = {}) =>
  `${pitcher.fullName} (${pitcher.pitchHand || '?'}HP) | ${pitcher.era || '-'} ERA | ${pitcher.strikeOuts || 0} SO | ${pitcher.whip || '-'} WHIP | ${pitcher.inningsPitched || '0.0'} IP`

const buildDbGame = (game, context, relieverShadowByTeam = {}) => {
  const awayName = shortTeamName(game.away_team)
  const homeName = shortTeamName(game.home_team)
  const awayTeamId = game.away_team_id || game.lineups && Object.values(game.lineups).find((lineup) => lineup.team_name === game.away_team)?.team_id
  const homeTeamId = game.home_team_id || game.lineups && Object.values(game.lineups).find((lineup) => lineup.team_name === game.home_team)?.team_id
  const startersByTeam = Object.fromEntries((game.starters || []).map((starter) => [starter.team_id, buildPitcher(starter, context)]))
  const awayPitcher = startersByTeam[awayTeamId] || buildPitcher({}, context)
  const homePitcher = startersByTeam[homeTeamId] || buildPitcher({}, context)
  const start = toPtStart(game.start_time_utc)
  const moneyline = buildMoneyline(game.markets || [], awayTeamId, homeTeamId)
  const total = buildTotal(game.markets || [])
  const spread = buildSpread(game.markets || [])
  const awaySide = buildLineupBoardSide({ game, teamId: awayTeamId, opponentTeamId: homeTeamId, opponentPitcher: homePitcher, context })
  const homeSide = buildLineupBoardSide({ game, teamId: homeTeamId, opponentTeamId: awayTeamId, opponentPitcher: awayPitcher, context })
  const awayStatus = game.lineups?.[awayTeamId]?.lineup_status === 'complete' ? 'posted' : game.lineups?.[awayTeamId]?.lineup_status || 'pending'
  const homeStatus = game.lineups?.[homeTeamId]?.lineup_status === 'complete' ? 'posted' : game.lineups?.[homeTeamId]?.lineup_status || 'pending'
  const lineupBoard = {
    gameId: `${slugify(awayName)}-${slugify(homeName)}`,
    title: `${awayName} @ ${homeName}`,
    snapshot: game.coverage?.lineup?.source_status?.last_status_at || new Date().toISOString(),
    status: { away: awayStatus, home: homeStatus },
    away: awaySide,
    home: homeSide,
    marketWeatherContext: {
      line: moneyline,
      total,
      source: oddsProvider
    }
  }
  const lineupContext = {
    [awayName]: awaySide.matchupContext,
    [homeName]: homeSide.matchupContext
  }
  const stateContext = buildStateContext(game, context, awayTeamId, homeTeamId)

  const baseGame = {
    id: `${slugify(awayName)}-${slugify(homeName)}`,
    gamePk: num(game.mlb_game_pk, null),
    slateDate: game.game_date?.slice(0, 10),
    league: 'MLB',
    title: `${awayName} @ ${homeName}`,
    start: start.start,
    startMinutes: start.startMinutes,
    stage: start.startMinutes < 720 ? 'Morning MLB Board' : start.startMinutes < 900 ? 'Afternoon MLB Board' : 'Evening MLB Board',
    spotlight: false,
    tags: ['MLB'],
    matchup: [
      { side: 'Away', name: awayName, detail: formatPitcherDetail(awayPitcher) },
      { side: 'Home', name: homeName, detail: formatPitcherDetail(homePitcher) }
    ],
    summary: `${awayName} @ ${homeName} from typed MLB DB inputs.`,
    lean: 'Lean on the modeled side, but respect source freshness and lineup completeness.',
    factors: [`Current board: ${moneyline || 'no ML'} | ${total || 'no total'} | ${spread || 'no spread'}.`, `${awayPitcher.fullName || 'Away starter'} vs ${homePitcher.fullName || 'Home starter'}.`],
    swingFactor: 'Swing factor: whether the starter edge survives the bridge innings.',
    teamContext: { away: null, home: null },
    parkContext: null,
    offenseContext: {
      away: buildTeamOffenseContext(awayTeamId, 'Away', context),
      home: buildTeamOffenseContext(homeTeamId, 'Home', context)
    },
    bullpenContext: {
      away: buildTeamBullpenContext(awayTeamId, context),
      home: buildTeamBullpenContext(homeTeamId, context)
    },
    bullpenChainContext: {
      away: buildBullpenChain(awayTeamId, context),
      home: buildBullpenChain(homeTeamId, context)
    },
    relieverShadowContext: {
      away: relieverShadowByTeam[awayName] ?? null,
      home: relieverShadowByTeam[homeName] ?? null
    },
    savantContext: {
      away: buildTeamSavantContext(awayTeamId, context),
      home: buildTeamSavantContext(homeTeamId, context)
    },
    storyContext: {
      away: buildStoryContext(awayTeamId, context),
      home: buildStoryContext(homeTeamId, context)
    },
    tierTwoContext: null,
    tierThreeContext: null,
    stateContext,
    lineupContext,
    lineupBoard,
    starterContext: { away: awayPitcher, home: homePitcher },
    pitcherSourceNote: 'Typed MLB DB starter and pitcher-appearance rows.',
    metadata: {
      slateDate: game.game_date?.slice(0, 10),
      canonicalGameId: game.game_id,
      mlbGamePk: num(game.mlb_game_pk, null),
      modelCartridge: activeMlbAppModelId,
      inputSource: 'sql-mlb.db',
      dbInputAdapter: 'models/mlb/db/day-games.mjs',
      compatibilityLayer: true,
      remainingGaps: ['parkContext', 'weatherContext', 'standingsContext']
    },
    odds: makeBoardOdds({
      spread,
      total,
      moneyline,
      provider: oddsProvider
    })
  }

  const adapter = resolveMlbAppAdapter(baseGame.metadata.modelCartridge)
  const modeledGame = adapter.createSportsMatchModel(baseGame, oddsProvider)
  return {
    ...modeledGame,
    metadata: {
      ...(modeledGame.metadata || {}),
      inputSource: baseGame.metadata.inputSource,
      dbInputAdapter: baseGame.metadata.dbInputAdapter,
      compatibilityLayer: baseGame.metadata.compatibilityLayer,
      remainingGaps: baseGame.metadata.remainingGaps,
      canonicalGameId: baseGame.metadata.canonicalGameId,
      mlbGamePk: baseGame.metadata.mlbGamePk,
      modelCartridge: baseGame.metadata.modelCartridge,
      slateDate: baseGame.metadata.slateDate
    }
  }
}

export const loadMlbDayGamesFromDb = async (date) => {
  const board = currentDayBoardForDate(date)
  if (!board.games.length) return []
  const context = loadDbContext(date)
  const relieverShadowModule =
    (await importMaybeFresh(path.join(rootDir, 'web', 'src', 'lib', `day-${date}-reliever-shadow.js`))) ?? {}
  const relieverShadowByTeam = relieverShadowModule.relieverShadowByTeam ?? {}
  return board.games.map((game) => buildDbGame(game, context, relieverShadowByTeam))
}
