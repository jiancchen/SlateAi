import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

import { activeMlbAppModelId, resolveMlbAppAdapter } from '../app-model.js'
import { withMlbCausalLedgerContext } from '../lib/causal-ledger.mjs'
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

const ficDailyTeamCodeByShortName = {
  Angels: 'ANA',
  Astros: 'HOU',
  Athletics: 'ATH',
  'Blue Jays': 'TOR',
  Braves: 'ATL',
  Brewers: 'MIL',
  Cardinals: 'SLN',
  Cubs: 'CHN',
  Diamondbacks: 'ARI',
  Dodgers: 'LAN',
  Giants: 'SFN',
  Guardians: 'CLE',
  Mariners: 'SEA',
  Marlins: 'MIA',
  Mets: 'NYN',
  Nationals: 'WAS',
  Orioles: 'BAL',
  Padres: 'SDN',
  Phillies: 'PHI',
  Pirates: 'PIT',
  Rangers: 'TEX',
  Rays: 'TBA',
  'Red Sox': 'BOS',
  Reds: 'CIN',
  Rockies: 'COL',
  Royals: 'KCA',
  Tigers: 'DET',
  Twins: 'MIN',
  'White Sox': 'CHA',
  Yankees: 'NYA'
}

const ficDailyTeamCodes = (teamName = '') => {
  const shortName = shortTeamName(teamName)
  const primary = ficDailyTeamCodeByShortName[shortName]
  if (shortName === 'Athletics') return ['ATH', 'OAK']
  return primary ? [primary] : []
}

const slugify = (value = '') =>
  String(value)
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

const normalizeTeam = (value = '') =>
  String(value)
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\bst\b/g, 'saint')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

const teamKey = (value = '') => normalizeTeam(shortTeamName(value))

const matchupKey = (awayTeam = '', homeTeam = '') => `${normalizeTeam(awayTeam)}|${normalizeTeam(homeTeam)}`

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
  if (value === null || value === undefined || value === '') return fallback
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

const nullableNum = (value) => {
  if (value === null || value === undefined || value === '') return null
  return num(value, null)
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

const clamp = (value, min, max) => Math.min(max, Math.max(min, value))

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

const queryOptional = (sql, params = [], options = {}) => {
  try {
    return querySqlite(sql, params, options)
  } catch (error) {
    if (/no such table/i.test(error.message || '')) return []
    throw error
  }
}

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

const makeBoardOdds = ({ spread = '', total = '', moneyline = '', first5Moneyline = '', first5Total = '', provider = oddsProvider }) => ({
  participantOrder: [0, 1],
  markets: [
    ...(spread ? [market('Spread', provider, spread)] : []),
    ...(total ? [market('Total', provider, total)] : []),
    ...(moneyline ? [market('Moneyline', provider, moneyline)] : []),
    ...(first5Moneyline ? [market('1st 5 ML', provider, first5Moneyline)] : []),
    ...(first5Total ? [market('1st 5 Total', provider, first5Total)] : [])
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
  const seasonStart = `${String(date).slice(0, 4)}-01-01`
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
    join (
      select pitcher_id, max(snapshot_date) as snapshot_date
      from pitcher_pitch_mix_snapshots
      where snapshot_date <= ?
      group by pitcher_id
    ) latest
      on latest.pitcher_id = ppm.pitcher_id
     and latest.snapshot_date = ppm.snapshot_date
    left join players on players.player_id = ppm.pitcher_id
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
    join games g on g.game_id = l.game_id
    join teams on teams.team_id = l.team_id
    join lineup_slots s on s.lineup_id = l.lineup_id
    join players p on p.player_id = s.player_id
    left join player_split_snapshots ps on ps.game_id = l.game_id and ps.player_id = s.player_id
    where g.game_date like ?
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
  const batterSeasonRows = queryOptional(
    `
    select
      player_id,
      count(distinct game_id) as games_played,
      sum(plate_appearances) as plate_appearances,
      sum(at_bats) as at_bats,
      sum(hits) as hits,
      sum(singles) as singles,
      sum(doubles) as doubles,
      sum(triples) as triples,
      sum(home_runs) as home_runs,
      sum(total_bases) as total_bases,
      sum(walks) as walks,
      sum(strikeouts) as strikeouts,
      sum(runs) as runs,
      sum(rbi) as rbi,
      sum(hit_by_pitch) as hit_by_pitch,
      sum(sac_flies) as sac_flies
    from player_game_batting
    where game_date < ?
      and game_date >= ?
    group by player_id
    `,
    [date, seasonStart],
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
  const starterVsTeamStatmuseRows = queryOptional(
    `
    select *
    from mlb_starter_vs_team_statmuse
    where snapshot_date = ?
    `,
    [date],
    { maxBuffer: 1024 * 1024 * 20 }
  )
  const starterGameLogRows = queryOptional(
    `
    select
      game_pk,
      game_date,
      team_role,
      team_name,
      opponent_name,
      pitcher_id,
      pitcher_name,
      pitch_hand,
      innings_pitched,
      outs_recorded,
      runs_allowed,
      earned_runs,
      hits_allowed,
      home_runs_allowed,
      walks_allowed,
      strikeouts,
      pitches_thrown
    from mlb_starting_pitcher_game_logs
    where game_date < ?
      and game_date >= ?
    order by pitcher_id, game_date desc, game_pk desc
    `,
    [date, seasonStart],
    { maxBuffer: 1024 * 1024 * 30 }
  )
  const environmentAdjustmentRows = queryOptional(
    `
    select *
    from mlb_game_environment_adjustments_daily
    where source_date = ?
      and model_version = (
        select max(model_version)
        from mlb_game_environment_adjustments_daily
        where source_date = ?
      )
    `,
    [date, date],
    { maxBuffer: 1024 * 1024 * 20 }
  )
  const reliefProjectionRows = queryOptional(
    `
    select *
    from mlb_relief_pitcher_projection_v1_daily
    where source_date = ?
      and model_version = (
        select max(model_version)
        from mlb_relief_pitcher_projection_v1_daily
        where source_date = ?
      )
    `,
    [date, date],
    { maxBuffer: 1024 * 1024 * 20 }
  )
  const ficDailyMatchupRows = queryOptional(
    `
    select *
    from mlb_fic_daily_matchups
    where source_date = ?
    `,
    [date],
    { maxBuffer: 1024 * 1024 * 30 }
  )
  const teamInningOffenseRows = querySqlite(
    `
    with inning_halves as (
      select
        pa.batting_team_id as team_id,
        pa.inning,
        pa.game_id,
        sum(coalesce(pa.runs_scored, 0)) as runs
      from plate_appearances pa
      join games g on g.game_id = pa.game_id
      where g.game_date < ?
        and pa.inning between 1 and 9
      group by pa.batting_team_id, pa.inning, pa.game_id
    )
    select
      team_id,
      inning,
      count(*) as batting_halves,
      sum(case when runs > 0 then 1 else 0 end) as scored_halves,
      avg(case when runs > 0 then 1.0 else 0.0 end) as score_rate,
      avg(runs) as runs_per_half
    from inning_halves
    group by team_id, inning
    `,
    [date],
    { maxBuffer: 1024 * 1024 * 20 }
  )
  const teamInningDefenseRows = querySqlite(
    `
    with inning_halves as (
      select
        pa.pitching_team_id as team_id,
        pa.inning,
        pa.game_id,
        sum(coalesce(pa.runs_scored, 0)) as runs_allowed
      from plate_appearances pa
      join games g on g.game_id = pa.game_id
      where g.game_date < ?
        and pa.inning between 1 and 9
      group by pa.pitching_team_id, pa.inning, pa.game_id
    )
    select
      team_id,
      inning,
      count(*) as pitching_halves,
      sum(case when runs_allowed > 0 then 1 else 0 end) as allowed_halves,
      avg(case when runs_allowed > 0 then 1.0 else 0.0 end) as allow_rate,
      avg(runs_allowed) as runs_allowed_per_half
    from inning_halves
    group by team_id, inning
    `,
    [date],
    { maxBuffer: 1024 * 1024 * 20 }
  )
  const leagueInningRows = querySqlite(
    `
    with inning_halves as (
      select
        pa.inning,
        pa.batting_team_id as team_id,
        pa.game_id,
        sum(coalesce(pa.runs_scored, 0)) as runs
      from plate_appearances pa
      join games g on g.game_id = pa.game_id
      where g.game_date < ?
        and pa.inning between 1 and 9
      group by pa.inning, pa.batting_team_id, pa.game_id
    )
    select
      inning,
      count(*) as halves,
      avg(case when runs > 0 then 1.0 else 0.0 end) as score_rate,
      avg(runs) as runs_per_half
    from inning_halves
    group by inning
    `,
    [date]
  )

  return {
    pitcherSeasonById: indexBy(pitcherSeasonRows, (row) => row.pitcher_id),
    pitcherFormById: groupBy(pitcherFormRows, (row) => row.pitcher_id),
    pitcherPitchMixById: groupBy(pitcherPitchMixRows, (row) => row.pitcher_id),
    lineupPlayersByGameTeam: groupBy(lineupPlayerRows, (row) => `${row.game_id}:${row.team_id}`),
    classicByPlayerId: indexBy(classicRows, (row) => row.player_id),
    batterSeasonByPlayerId: indexBy(batterSeasonRows, (row) => row.player_id),
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
    espnPitcherSplitsByGamePitcher: indexBy(espnPitcherSplitRows, (row) => `${row.game_id}:${row.pitcher_id}`),
    starterVsTeamByGameTeam: indexBy(
      starterVsTeamStatmuseRows,
      (row) => `${row.game_id}:${teamKey(row.pitcher_team)}`
    ),
    starterVsTeamByGamePitcherName: indexBy(
      starterVsTeamStatmuseRows,
      (row) => `${row.game_id}:${slugify(row.pitcher_name)}`
    ),
    starterVsTeamByTeamOpponent: indexBy(
      starterVsTeamStatmuseRows,
      (row) => `${teamKey(row.pitcher_team)}:${teamKey(row.opponent_team)}`
    ),
    starterVsTeamByPitcherOpponent: indexBy(
      starterVsTeamStatmuseRows,
      (row) => `${slugify(row.pitcher_name)}:${teamKey(row.opponent_team)}`
    ),
    starterHistoryByMlbPitcherId: groupBy(starterGameLogRows, (row) => Number(row.pitcher_id)),
    environmentByGamePk: indexBy(environmentAdjustmentRows.filter((row) => row.game_pk), (row) => Number(row.game_pk)),
    environmentByMatchupKey: indexBy(environmentAdjustmentRows, (row) => matchupKey(row.away_team, row.home_team)),
    reliefProjectionByGameTeam: indexBy(
      reliefProjectionRows.filter((row) => row.game_pk),
      (row) => `${Number(row.game_pk)}:${normalizeTeam(row.team_name)}`
    ),
    reliefProjectionByDateTeam: indexBy(
      reliefProjectionRows,
      (row) => `${row.source_date}:${normalizeTeam(row.team_name)}`
    ),
    ficDailyMatchupRows,
    inningOffenseByTeamInning: indexBy(teamInningOffenseRows, (row) => `${row.team_id}:${row.inning}`),
    inningDefenseByTeamInning: indexBy(teamInningDefenseRows, (row) => `${row.team_id}:${row.inning}`),
    leagueInningByInning: indexBy(leagueInningRows, (row) => Number(row.inning))
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

const buildStarterVsTeamStatmuse = (row = null) => {
  if (!row) return null
  return {
    source: 'StatMuse',
    sourceUrl: row.statmuse_url || '',
    answerText: row.answer_text || '',
    pitcherName: row.pitcher_name || '',
    pitcherTeam: row.pitcher_team || '',
    opponentTeam: row.opponent_team || '',
    appearances: num(row.appearances, 0),
    gamesStarted: num(row.games_started, 0),
    wins: nullableNum(row.wins),
    losses: nullableNum(row.losses),
    era: nullableNum(row.era),
    strikeouts: nullableNum(row.strikeouts),
    inningsPitched: row.innings_pitched || null,
    hitsAllowed: nullableNum(row.hits_allowed),
    earnedRuns: nullableNum(row.earned_runs),
    runsAllowed: nullableNum(row.runs_allowed),
    homeRunsAllowed: nullableNum(row.home_runs_allowed),
    walks: nullableNum(row.walks),
    battersFaced: nullableNum(row.batters_faced),
    totalRow: parseJson(row.total_row_json) || null,
    gameRows: parseJson(row.game_rows_json) || [],
    fetchedAt: row.fetched_at || ''
  }
}

const buildStarterStartHistory = (row = {}) => {
  const innings = num(row.innings_pitched, null)
  const earnedRuns = num(row.earned_runs, 0) || 0
  return {
    gamePk: num(row.game_pk, null),
    date: row.game_date || '',
    venueRole: row.team_role === 'home' ? 'home' : 'road',
    teamName: shortTeamName(row.team_name || ''),
    opponentName: shortTeamName(row.opponent_name || ''),
    pitcherName: row.pitcher_name || '',
    pitchHand: row.pitch_hand || '',
    inningsPitched: round(innings, 1),
    inningsPitchedLabel: Number.isFinite(innings) ? `${Math.floor(innings)}.${Math.round((innings % 1) * 3)}` : '-',
    outsRecorded: num(row.outs_recorded, 0),
    runsAllowed: num(row.runs_allowed, 0),
    earnedRuns,
    hitsAllowed: num(row.hits_allowed, 0),
    walksAllowed: num(row.walks_allowed, 0),
    strikeouts: num(row.strikeouts, 0),
    homeRunsAllowed: num(row.home_runs_allowed, 0),
    pitchesThrown: num(row.pitches_thrown, 0),
    qualityStart: Number.isFinite(innings) && innings >= 6 && earnedRuns <= 3,
    firstInningRunsAllowed: null,
    firstInningOutcome: ''
  }
}

const buildPitcher = (starter = {}, context, opponentTeam = '') => {
  const season = context.pitcherSeasonById.get(starter.player_id) || {}
  const form = bestWindowRow(context.pitcherFormById.get(starter.player_id) || [], [5, 10])
  const pitchMixRows = context.pitcherPitchMixById.get(starter.player_id) || []
  const espnSplits = buildEspnPitcherSplits(context.espnPitcherSplitsByGamePitcher.get(`${starter.game_id}:${starter.player_id}`))
  const pitcherTeamKey = teamKey(starter.team_name)
  const opponentTeamKey = teamKey(opponentTeam)
  const statmuseVsOpponent = buildStarterVsTeamStatmuse(
    context.starterVsTeamByGameTeam.get(`${starter.game_id}:${pitcherTeamKey}`) ||
      context.starterVsTeamByGamePitcherName.get(`${starter.game_id}:${slugify(starter.pitcher_name)}`) ||
      context.starterVsTeamByTeamOpponent.get(`${pitcherTeamKey}:${opponentTeamKey}`) ||
      context.starterVsTeamByPitcherOpponent.get(`${slugify(starter.pitcher_name)}:${opponentTeamKey}`) ||
      null
  )
  const startHistory = (context.starterHistoryByMlbPitcherId.get(Number(starter.mlb_player_id)) || []).map(buildStarterStartHistory)
  const opponentHistoryThisSeason = opponentTeam
    ? startHistory.filter((row) => teamKey(row.opponentName) === opponentTeamKey)
    : []
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
    pitchMix: pitchMixRows.map((row) => ({
      pitchType: row.pitch_type || '',
      pitchShare: round(num(row.pitch_share), 1) ?? null,
      samplePitches: num(row.sample_pitches, null)
    })),
    espnSplits,
    statmuseVsOpponent,
    startHistoryLast5: startHistory.slice(0, 5),
    opponentHistoryThisSeason,
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

const seasonObjectFromBatting = (row = null) => {
  if (!row) return null

  const plateAppearances = num(row.plate_appearances, 0)
  const atBats = num(row.at_bats, 0)
  if (plateAppearances <= 0 && atBats <= 0) return null

  const hits = num(row.hits, 0)
  const walks = num(row.walks, 0)
  const hitByPitch = num(row.hit_by_pitch, 0)
  const sacFlies = num(row.sac_flies, 0)
  const totalBases = num(row.total_bases, 0)
  const obpDenominator = atBats + walks + hitByPitch + sacFlies
  const avg = atBats > 0 ? hits / atBats : null
  const obp = obpDenominator > 0 ? (hits + walks + hitByPitch) / obpDenominator : null
  const slg = atBats > 0 ? totalBases / atBats : null

  return {
    gamesPlayed: num(row.games_played, 0),
    plateAppearances,
    atBats,
    hits,
    singles: num(row.singles, 0),
    doubles: num(row.doubles, 0),
    triples: num(row.triples, 0),
    homeRuns: num(row.home_runs, 0),
    walks,
    strikeouts: num(row.strikeouts, 0),
    runs: num(row.runs, 0),
    rbi: num(row.rbi, 0),
    totalBases,
    avg: round(avg, 3),
    obp: round(obp, 3),
    slg: round(slg, 3),
    ops: Number.isFinite(obp) && Number.isFinite(slg) ? round(obp + slg, 3) : null,
    hitRate: plateAppearances > 0 ? round(hits / plateAppearances, 3) : null,
    singlesRate: plateAppearances > 0 ? round(num(row.singles, 0) / plateAppearances, 3) : null,
    hrRate: plateAppearances > 0 ? round(num(row.home_runs, 0) / plateAppearances, 3) : null,
    walkRate: plateAppearances > 0 ? round(walks / plateAppearances, 3) : null,
    totalBasesRate: plateAppearances > 0 ? round(totalBases / plateAppearances, 3) : null
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
        rolling14Xwoba: num(row.rolling_14_xwoba, null),
        rolling30Xwoba: num(row.rolling_30_xwoba, null),
        rolling7Xba: num(row.rolling_7_xba, null),
        rolling14Xba: num(row.rolling_14_xba, null),
        rolling30Xba: num(row.rolling_30_xba, null),
        rolling7Xslg: num(row.rolling_7_xslg, null),
        rolling14Xslg: num(row.rolling_14_xslg, null),
        rolling30Xslg: num(row.rolling_30_xslg, null),
        rolling7BarrelPct: num(row.rolling_7_barrel_pct, null),
        rolling14BarrelPct: num(row.rolling_14_barrel_pct, null),
        rolling30BarrelPct: num(row.rolling_30_barrel_pct, null),
        rolling7HardHitPct: num(row.rolling_7_hard_hit_pct, null),
        rolling14HardHitPct: num(row.rolling_14_hard_hit_pct, null),
        rolling30HardHitPct: num(row.rolling_30_hard_hit_pct, null),
        rolling7SweetSpotPct: num(row.rolling_7_sweet_spot_pct, null),
        rolling14SweetSpotPct: num(row.rolling_14_sweet_spot_pct, null),
        rolling30SweetSpotPct: num(row.rolling_30_sweet_spot_pct, null),
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
          careerAvg: num(row.career_avg, null),
          careerObp: num(row.career_obp, null),
          careerSlg: num(row.career_slg, null),
          careerOps: num(row.career_ops, null),
          careerHomeRuns: num(row.career_home_runs, 0),
          careerTbPerPa: num(row.career_tb_per_pa, null),
        careerPowerIndex: num(row.career_power_index, null),
        contactRiskIndex: num(row.contact_risk_index, null),
        roleStabilityIndex: num(row.role_stability_index, null),
        repeatabilityLabel: row.repeatability_label || null
      }
    : null

const richLineupRawFromMatchup = (row = null) => {
  if (!row) return {}
  const sourceDetail = parseJson(row.source_detail_json) || {}
  const details = parseJson(row.details_json) || {}
  return sourceDetail.source_payload || sourceDetail.raw_json || details.source_payload || details.raw_json || {}
}

const buildLineupPlayer = (row, context, matchupRow = null) => {
  const splitRaw = parseJson(row.split_source_detail_json)?.raw_json || {}
  const richRaw = richLineupRawFromMatchup(matchupRow)
  const raw = Object.keys(richRaw).length ? richRaw : splitRaw
  const split = raw.split || splitObjectFromRow(row)
  const classic = context.classicByPlayerId.get(row.player_id)
  const batterSeason = context.batterSeasonByPlayerId.get(row.player_id)
  const statcast = context.statcastByPlayerId.get(row.player_id)
  const career = context.careerByPlayerId.get(row.player_id)
  const deviations = context.deviationsByPlayerId.get(row.player_id) || []
  const season = raw.season || seasonObjectFromBatting(batterSeason) || splitObjectFromRow(row)
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
    espnHitterSplit: raw.espnHitterSplit || null,
    espnHitterSplits: raw.espnHitterSplits || null,
    metrics: raw.metrics || {},
    pitchType: raw.pitchType || null,
    matchupKernel: raw.matchupKernel || null,
    statcastTrend: raw.statcastTrend || buildStatcastTrend(statcast),
    careerProfile: raw.careerProfile || buildCareerProfile(career),
    approachState: buildApproachState(deviations),
    opponentContext: raw.opponentContext || null,
    tags: raw.tags || [],
    primaryTag: raw.primaryTag || null,
    summary: raw.summary || '',
    matchupNote: raw.matchupNote || ''
  }
}

const rateFrom = (value, { allowOpsScale = false } = {}) => {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed <= 0) return null
  if (parsed > 5) return parsed / 1000
  if (parsed > 1 && !allowOpsScale) return parsed / 1000
  return parsed
}

const weightedAverage = (items = [], valueKey = 'value', weightKey = 'weight') => {
  const valid = items
    .map((item) => ({
      value: Number(item?.[valueKey]),
      weight: Number(item?.[weightKey])
    }))
    .filter((item) => Number.isFinite(item.value) && Number.isFinite(item.weight) && item.weight > 0)

  if (!valid.length) return null

  return valid.reduce((sum, item) => sum + item.value * item.weight, 0) /
    valid.reduce((sum, item) => sum + item.weight, 0)
}

const buildLineupBattingPressure = (lineup = []) => {
  const entries = lineup
    .map((entry) => {
      const seasonAvg = rateFrom(entry.season?.avg)
      const recentAvg = rateFrom(entry.recent?.avg ?? entry.recent?.hitRate)
      const splitAvg = rateFrom(entry.split?.avg)
      const careerAvg = rateFrom(entry.careerProfile?.careerAvg)
      const seasonOps = rateFrom(entry.season?.ops, { allowOpsScale: true })
      const recentOps = rateFrom(
        entry.recent?.ops ??
          (Number.isFinite(Number(entry.recent?.totalBasesRate)) || Number.isFinite(Number(entry.recent?.walkRate))
            ? Number(entry.recent?.totalBasesRate || 0) + Number(entry.recent?.walkRate || 0)
            : null),
        { allowOpsScale: true }
      )
      const splitOps = rateFrom(entry.split?.ops, { allowOpsScale: true })
      const careerOps = rateFrom(entry.careerProfile?.careerOps, { allowOpsScale: true })
      const recentPa = num(entry.recent?.plateAppearances, 0)
      const splitPa = num(entry.split?.plateAppearances, 0)
      const careerPa = num(entry.careerProfile?.careerPlateAppearances, 0)
      const avgParts = [
        Number.isFinite(seasonAvg) ? { value: seasonAvg, weight: 0.42 } : null,
        Number.isFinite(recentAvg) && recentPa >= 8 ? { value: recentAvg, weight: 0.33 } : null,
        Number.isFinite(splitAvg) && splitPa >= 10 ? { value: splitAvg, weight: 0.25 } : null,
        Number.isFinite(careerAvg) && careerPa >= 150 ? { value: careerAvg, weight: 0.14 } : null
      ].filter(Boolean)
      const opsParts = [
        Number.isFinite(seasonOps) ? { value: seasonOps, weight: 0.42 } : null,
        Number.isFinite(recentOps) && recentPa >= 8 ? { value: recentOps, weight: 0.33 } : null,
        Number.isFinite(splitOps) && splitPa >= 10 ? { value: splitOps, weight: 0.25 } : null,
        Number.isFinite(careerOps) && careerPa >= 150 ? { value: careerOps, weight: 0.14 } : null
      ].filter(Boolean)
      const weightedAvg = avgParts.length
        ? avgParts.reduce((sum, part) => sum + part.value * part.weight, 0) / avgParts.reduce((sum, part) => sum + part.weight, 0)
        : null
      const weightedOps = opsParts.length
        ? opsParts.reduce((sum, part) => sum + part.value * part.weight, 0) / opsParts.reduce((sum, part) => sum + part.weight, 0)
        : null
      return {
        slot: num(entry.slot, 99),
        name: entry.name,
        weightedAvg,
        weightedOps,
        recentAvg,
        recentPa,
        splitAvg,
        splitOps,
        splitPa,
        bats: entry.bats || ''
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
  const splitEntries = entries
    .filter((entry) => Number(entry.splitPa || 0) >= 10 && (Number.isFinite(entry.splitAvg) || Number.isFinite(entry.splitOps)))
    .map((entry) => ({
      ...entry,
      splitWeight: clamp(Number(entry.splitPa || 0), 10, 140),
      splitReliability: clamp((Number(entry.splitPa || 0) - 8) / 42, 0.25, 1)
    }))
  const splitTopSix = splitEntries.filter((entry) => Number(entry.slot) <= 6)
  const splitTopThird = splitEntries.filter((entry) => Number(entry.slot) <= 3)
  const splitAvgAverage = weightedAverage(splitEntries, 'splitAvg', 'splitWeight')
  const splitOpsAverage = weightedAverage(splitEntries, 'splitOps', 'splitWeight')
  const topSixSplitAvgAverage = weightedAverage(splitTopSix, 'splitAvg', 'splitWeight')
  const topSixSplitOpsAverage = weightedAverage(splitTopSix, 'splitOps', 'splitWeight')
  const strongSplitEntries = splitEntries.filter(
    (entry) =>
      Number(entry.splitPa || 0) >= 20 &&
      (Number(entry.splitOps) >= 0.8 || Number(entry.splitAvg) >= 0.285)
  )
  const weakSplitEntries = splitEntries.filter(
    (entry) =>
      Number(entry.splitPa || 0) >= 20 &&
      (Number(entry.splitOps) <= 0.65 || Number(entry.splitAvg) <= 0.22)
  )
  const severeWeakSplitEntries = splitEntries.filter(
    (entry) =>
      Number(entry.splitPa || 0) >= 25 &&
      (Number(entry.splitOps) <= 0.58 || Number(entry.splitAvg) <= 0.195)
  )
  const topSixStrongSplitCount = strongSplitEntries.filter((entry) => Number(entry.slot) <= 6).length
  const topSixWeakSplitCount = weakSplitEntries.filter((entry) => Number(entry.slot) <= 6).length
  const topThirdStrongSplitCount = strongSplitEntries.filter((entry) => Number(entry.slot) <= 3).length
  const splitIndex =
    splitEntries.length
      ? clamp(
          50 +
            (Number(splitAvgAverage || 0.245) - 0.245) * 135 +
            (Number(splitOpsAverage || 0.72) - 0.72) * 42 +
            (strongSplitEntries.length - 3) * 3.1 +
            (topSixStrongSplitCount - 2) * 2 +
            topThirdStrongSplitCount * 1.4 -
            Math.max(weakSplitEntries.length - 2, 0) * 2.8 -
            topSixWeakSplitCount * 1.5 -
            severeWeakSplitEntries.length * 2.5,
          18,
          96
        )
      : 50
  const splitReasonRows = [
    ...strongSplitEntries
      .slice()
      .sort((left, right) => Number(right.splitOps || 0) - Number(left.splitOps || 0))
      .slice(0, 2)
      .map((entry) => `${entry.name} ${Number(entry.splitOps).toFixed(3)} OPS split`),
    ...weakSplitEntries
      .slice()
      .sort((left, right) => Number(left.splitOps || 0) - Number(right.splitOps || 0))
      .slice(0, 2)
      .map((entry) => `${entry.name} ${Number(entry.splitOps).toFixed(3)} OPS split`)
  ]
  const pressureIndex = clamp(
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
  const battingPressureReasons = [
    `${highAverageCount} projected bats at/above .300 blended AVG`,
    Number.isFinite(lineupAverage) ? `lineup AVG ${lineupAverage.toFixed(3)}` : null,
    Number.isFinite(topSixAverage) ? `top-six AVG ${topSixAverage.toFixed(3)}` : null,
    highOpsCount >= 3 ? `${highOpsCount} bats at/above .840 OPS` : null,
    recentHotCount >= 3 ? `${recentHotCount} recent hot bats` : null,
    splitEntries.length
      ? `${strongSplitEntries.length} strong / ${weakSplitEntries.length} weak handedness split bats`
      : null
  ].filter(Boolean)

  return {
    battingPressureIndex: round(pressureIndex, 1),
    highAverageCount,
    topSixHighAverageCount,
    highOpsCount,
    recentHotCount,
    lineupAverage: round(lineupAverage, 3),
    topSixAverage: round(topSixAverage, 3),
    lineupOps: round(lineupOps, 3),
    topSixOps: round(topSixOps, 3),
    handednessSplitIndex: round(splitIndex, 1),
    handednessSplitLabel:
      splitIndex >= 62
        ? 'strong handedness split lane'
        : splitIndex <= 42
          ? 'weak handedness split lane'
          : 'mixed handedness split lane',
    handednessSplitCount: splitEntries.length,
    strongSplitCount: strongSplitEntries.length,
    weakSplitCount: weakSplitEntries.length,
    severeWeakSplitCount: severeWeakSplitEntries.length,
    topSixStrongSplitCount,
    topSixWeakSplitCount,
    topThirdStrongSplitCount,
    splitAvgAverage: round(splitAvgAverage, 3),
    splitOpsAverage: round(splitOpsAverage, 3),
    topSixSplitAvgAverage: round(topSixSplitAvgAverage, 3),
    topSixSplitOpsAverage: round(topSixSplitOpsAverage, 3),
    handednessSplitReasons: splitReasonRows,
    handednessSplitProfile: {
      index: round(splitIndex, 1),
      label:
        splitIndex >= 62
          ? 'strong handedness split lane'
          : splitIndex <= 42
            ? 'weak handedness split lane'
            : 'mixed handedness split lane',
      splitCount: splitEntries.length,
      strongSplitCount: strongSplitEntries.length,
      weakSplitCount: weakSplitEntries.length,
      severeWeakSplitCount: severeWeakSplitEntries.length,
      topSixStrongSplitCount,
      topSixWeakSplitCount,
      topThirdStrongSplitCount,
      splitAvgAverage: round(splitAvgAverage, 3),
      splitOpsAverage: round(splitOpsAverage, 3),
      topSixSplitAvgAverage: round(topSixSplitAvgAverage, 3),
      topSixSplitOpsAverage: round(topSixSplitOpsAverage, 3),
      strongSplitBats: strongSplitEntries.slice(0, 5).map((entry) => ({
        name: entry.name,
        slot: entry.slot,
        bats: entry.bats,
        plateAppearances: entry.splitPa,
        avg: round(entry.splitAvg, 3),
        ops: round(entry.splitOps, 3)
      })),
      weakSplitBats: weakSplitEntries.slice(0, 5).map((entry) => ({
        name: entry.name,
        slot: entry.slot,
        bats: entry.bats,
        plateAppearances: entry.splitPa,
        avg: round(entry.splitAvg, 3),
        ops: round(entry.splitOps, 3)
      })),
      reasons: splitReasonRows
    },
    battingPressureLabel:
      highAverageCount >= 7
        ? 'seven-plus .300 traffic bats'
        : highAverageCount >= 5
          ? 'stacked .300 traffic pocket'
          : pressureIndex >= 62
            ? 'strong batting-pressure lane'
            : pressureIndex <= 42
              ? 'soft batting-pressure lane'
              : 'neutral batting-pressure lane',
    battingPressureReasons
  }
}

const buildLineupContext = (rows = [], lineup = []) => {
  const grades = rows.map((row) => num(row.matchup_grade ?? parseJson(row.source_detail_json)?.raw_json?.metrics?.matchupGrade)).filter(Number.isFinite)
  const pitchGrades = rows
    .map((row) => num(parseJson(row.source_detail_json)?.raw_json?.metrics?.pitchTypeGrade))
    .filter(Number.isFinite)
  const battingPressure = buildLineupBattingPressure(lineup)
  return {
    averageMatchupGrade: round(average(grades), 2) ?? 0,
    platoonCount: 0,
    pitchTypePressureIndex: round(50 + (average(pitchGrades) ?? 0) * 5, 1) ?? 50,
    bullpenPitchTypePressureIndex: 50,
    starterPressureIndex: round(50 + (average(grades) ?? 0) * 2, 1) ?? 50,
    ...battingPressure
  }
}

const buildLineupBoardSide = ({ game, teamId, opponentPitcher, opponentTeamId, context }) => {
  const lineupRows = context.lineupPlayersByGameTeam.get(`${game.game_id}:${teamId}`) || []
  const matchupRows = context.lineupMatchupsByGameTeam.get(`${game.game_id}:${teamId}`) || []
  const firstRow = lineupRows[0]
  const reliefRows = context.reliefByTeamId.get(opponentTeamId) || []
  const matchupByHitterId = new Map(matchupRows.map((row) => [String(row.hitter_id), row]))
  const lineup = lineupRows.map((row) => buildLineupPlayer(row, context, matchupByHitterId.get(String(row.player_id)) || null))
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
    lineup,
    matchupContext: buildLineupContext(matchupRows, lineup)
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
  if (!row) {
    return {
      era: 4.2,
      whip: 1.31,
      strikeouts: 100,
      walks: 38,
      staleFeed: true
    }
  }
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

const weightedRate = (offenseRow, defenseRow, leagueRow) => {
  const offenseRate = num(offenseRow?.score_rate, null)
  const defenseRate = num(defenseRow?.allow_rate, null)
  const leagueRate = num(leagueRow?.score_rate, 0.26)
  const offenseSample = num(offenseRow?.batting_halves, 0)
  const defenseSample = num(defenseRow?.pitching_halves, 0)
  const offenseWeight = offenseSample >= 30 ? 0.5 : offenseSample >= 12 ? 0.38 : 0.22
  const defenseWeight = defenseSample >= 30 ? 0.34 : defenseSample >= 12 ? 0.27 : 0.16
  const leagueWeight = Math.max(0.16, 1 - offenseWeight - defenseWeight)
  return clamp(
    (Number.isFinite(offenseRate) ? offenseRate : leagueRate) * offenseWeight +
      (Number.isFinite(defenseRate) ? defenseRate : leagueRate) * defenseWeight +
      leagueRate * leagueWeight,
    0.04,
    0.72
  )
}

const inningPhaseLabel = (inning) => {
  if (inning === 1) return 'starter open'
  if (inning <= 3) return 'early order'
  if (inning <= 5) return 'turnover'
  if (inning === 6) return 'bridge'
  return 'late leverage'
}

const buildInningReason = ({ inning, awayName, homeName, awayRate, homeRate, awayOffense, homeOffense, awayDefense, homeDefense, leagueRow, awayPitcher, homePitcher }) => {
  const phase = inningPhaseLabel(inning)
  const leader = awayRate >= homeRate ? awayName : homeName
  const leaderRate = Math.max(awayRate, homeRate)
  const leaguePct = Math.round(num(leagueRow?.score_rate, 0.26) * 100)
  const samples = [
    awayOffense?.batting_halves ? `${awayName} bat ${awayOffense.batting_halves}` : '',
    homeOffense?.batting_halves ? `${homeName} bat ${homeOffense.batting_halves}` : '',
    awayDefense?.pitching_halves ? `${awayName} allow ${awayDefense.pitching_halves}` : '',
    homeDefense?.pitching_halves ? `${homeName} allow ${homeDefense.pitching_halves}` : ''
  ].filter(Boolean)
  const espnStarterNote =
    inning <= 5 && (awayPitcher?.espnSplits?.sourceStatus === 'fetched' || homePitcher?.espnSplits?.sourceStatus === 'fetched')
      ? ' ESPN starter splits attached.'
      : ''
  return `${phase}: ${leader} carry the higher inning score pressure at ${Math.round(leaderRate * 100)}% vs league ${leaguePct}%. ${samples.slice(0, 2).join(' | ') || 'League fallback sample used.'}.${espnStarterNote}`
}

const buildInningRunMatrix = ({ game, context, awayTeamId, homeTeamId, awayName, homeName, awayPitcher, homePitcher }) => {
  const innings = Array.from({ length: 9 }, (_, index) => index + 1)
  const rows = innings.map((inning) => {
    const leagueRow = context.leagueInningByInning.get(inning) || {}
    const awayOffense = context.inningOffenseByTeamInning.get(`${awayTeamId}:${inning}`) || null
    const homeOffense = context.inningOffenseByTeamInning.get(`${homeTeamId}:${inning}`) || null
    const awayDefense = context.inningDefenseByTeamInning.get(`${awayTeamId}:${inning}`) || null
    const homeDefense = context.inningDefenseByTeamInning.get(`${homeTeamId}:${inning}`) || null
    const awayRate = weightedRate(awayOffense, homeDefense, leagueRow)
    const homeRate = weightedRate(homeOffense, awayDefense, leagueRow)
    const runProbabilityPct = round((1 - (1 - awayRate) * (1 - homeRate)) * 100, 1)
    const noRunProbabilityPct = round(100 - runProbabilityPct, 1)
    const sampleHalves = num(awayOffense?.batting_halves, 0) + num(homeOffense?.batting_halves, 0)
    const caution = inning === 9 ? 'Bottom ninth is conditional on score state.' : sampleHalves < 40 ? 'Thin team inning sample; league baseline carries more weight.' : ''
    return {
      inning,
      phase: inningPhaseLabel(inning),
      runProbabilityPct,
      noRunProbabilityPct,
      awayRunProbabilityPct: round(awayRate * 100, 1),
      homeRunProbabilityPct: round(homeRate * 100, 1),
      lean: runProbabilityPct >= 52 ? 'Run' : 'No run',
      strength: runProbabilityPct >= 62 || noRunProbabilityPct >= 58 ? 'strong' : runProbabilityPct >= 55 || noRunProbabilityPct >= 53 ? 'lean' : 'thin',
      sampleHalves,
      caution,
      reason: buildInningReason({
        inning,
        awayName,
        homeName,
        awayRate,
        homeRate,
        awayOffense,
        homeOffense,
        awayDefense,
        homeDefense,
        leagueRow,
        awayPitcher,
        homePitcher
      })
    }
  })

  return {
    source: 'sql-mlb.db plate_appearances + ESPN starter splits',
    sourceStatus: rows.some((row) => row.sampleHalves > 0) ? 'warehouse' : 'league-fallback',
    gameId: game.game_id,
    rows
  }
}

const buildStateContext = (game, context, awayTeamId, homeTeamId, awayName, homeName, awayPitcher, homePitcher) => ({
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
  },
  inningRunMatrix: buildInningRunMatrix({ game, context, awayTeamId, homeTeamId, awayName, homeName, awayPitcher, homePitcher })
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

const buildFirst5Moneyline = (markets, awayTeamId, homeTeamId) => {
  const winners = markets.filter((marketRow) => marketRow.market_type === 'first5Winner')
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

const buildFirst5Total = (markets) => {
  const totals = markets
    .filter((marketRow) => marketRow.market_type === 'first5Total' && /^Over/i.test(marketRow.selection_name || ''))
    .map((marketRow) => ({ line: num(marketRow.line_value), price: num(marketRow.odds_american, null) }))
    .filter((marketRow) => Number.isFinite(marketRow.line))
    .sort((left, right) => Math.abs((left.price ?? 0)) - Math.abs((right.price ?? 0)))
  const best = totals[0]
  return best ? `${best.line.toFixed(1)} Runs` : ''
}

const buildSpread = (markets) => {
  const spread = markets.find((marketRow) => marketRow.market_type === 'spread' && Number.isFinite(num(marketRow.line_value)))
  return spread ? `${spread.line_value}` : ''
}

const formatPitcherDetail = (pitcher = {}) =>
  `${pitcher.fullName} (${pitcher.pitchHand || '?'}HP) | ${pitcher.era || '-'} ERA | ${pitcher.strikeOuts || 0} SO | ${pitcher.whip || '-'} WHIP | ${pitcher.inningsPitched || '0.0'} IP`

const buildEnvironmentAdjustmentContext = (row = null) => {
  if (!row) return null
  return {
    modelVersion: row.model_version,
    venueName: row.venue_name || '',
    park: {
      indexRuns: num(row.park_run_index, 100),
      indexHr: num(row.park_hr_index, 100),
      indexWoba: num(row.park_woba_index, 100),
      runDelta: num(row.park_run_delta, 0),
      hrDelta: num(row.park_hr_delta, 0)
    },
    weather: {
      matchStatus: row.weather_match_status,
      hrForce: num(row.hr_force, null),
      effectiveHrForce: num(row.effective_hr_force, null),
      gameTimeHrForce: num(row.game_time_hr_force, null),
      earlyGameMaxHrForce: num(row.early_game_max_hr_force, null),
      lateGameMaxHrForce: num(row.late_game_max_hr_force, null),
      hrForcePersistenceSignal: row.hr_force_persistence_signal || null,
      signal: row.hr_force_run_signal,
      runDelta: num(row.weather_run_delta, 0),
      hrDelta: num(row.weather_hr_delta, 0)
    },
    umpire: {
      name: row.umpire_name || null,
      assignmentStatus: row.umpire_assignment_status,
      favorsCode: row.umpire_favors_code || null,
      zoneFactor: num(row.umpire_zone_factor, null),
      runsDelta: num(row.umpire_runs_delta, 0),
      strikeoutsDelta: num(row.umpire_k_delta, 0),
      walksDelta: num(row.umpire_walk_delta, 0)
    },
    visibility: {
      startTimeUtc: row.start_time_utc || null,
      localStartDate: row.local_start_date || null,
      localStartTime: row.local_start_time || null,
      localStartHour: nullableNum(row.local_start_hour),
      localStartMinute: nullableNum(row.local_start_minute),
      localTimezone: row.local_timezone || null,
      eveningLocalStart: num(row.evening_start_flag, 0) === 1,
      nightLocalStart: num(row.night_start_flag, 0) === 1,
      lateLocalStart: num(row.late_local_start_flag, 0) === 1,
      signal: row.visibility_signal || null,
      hitsMultiplier: num(row.visibility_hits_multiplier, 1),
      hrMultiplier: num(row.visibility_hr_multiplier, 1),
      runsMultiplier: num(row.visibility_runs_multiplier, 1),
      hitsDelta: num(row.visibility_hits_delta, 0),
      runsDelta: num(row.visibility_runs_delta, 0),
      hrDelta: num(row.visibility_hr_delta, 0)
    },
    expected: {
      totalRunsDelta: num(row.expected_total_runs_delta, 0),
      hitsDelta: num(row.expected_hits_delta, 0),
      hrDelta: num(row.expected_hr_delta, 0),
      strikeoutsDelta: num(row.expected_k_delta, 0),
      walksDelta: num(row.expected_walk_delta, 0)
    },
    signal: row.run_environment_signal,
    confidenceScore: num(row.confidence_score, null),
    sourceFlags: parseJson(row.source_flags_json) || {},
    reasons: parseJson(row.reasons_json) || []
  }
}

const buildReliefProjectionContext = (row = null) => {
  if (!row) return null
  return {
    modelVersion: row.model_version,
    sourceMode: row.source_mode,
    projectedReliefRunsAllowed: num(row.projected_relief_runs_allowed, null),
    projectedReliefOuts: num(row.projected_relief_outs, null),
    projectedRelieversUsed: num(row.projected_relievers_used, null),
    bridgeStressScore: num(row.bridge_stress_score, null),
    leverageAvailabilityScore: num(row.leverage_availability_score, null),
    fatigueScore: num(row.fatigue_score, null),
    qualityScore: num(row.quality_score, null),
    runRiskTier: row.run_risk_tier,
    topTwoSharePct: num(row.top_two_share_pct, null),
    lead: {
      pitcherName: row.lead_pitcher_name || null,
      pitcherId: num(row.lead_pitcher_id, null),
      expectedOuts: num(row.lead_expected_outs, null),
      availabilityScore: num(row.lead_availability_score, null)
    },
    candidates: parseJson(row.candidates_json) || [],
    reasons: parseJson(row.reasons_json) || [],
    confidenceScore: num(row.confidence_score, null)
  }
}

const boolValue = (value) => value === true || value === 'true' || value === 1 || value === '1'

const hasTopRelievers = (profile) => Array.isArray(profile?.topRelievers) && profile.topRelievers.length > 0

const buildRp2BullpenChainContext = (teamName, reliefProjectionContext = null) => {
  if (!reliefProjectionContext) return null
  const candidates = Array.isArray(reliefProjectionContext.candidates)
    ? reliefProjectionContext.candidates
    : []
  const topRelievers = candidates
    .slice(0, 4)
    .map((candidate, index) => {
      const name = candidate?.name || candidate?.pitcherName
      if (!name) return null
      return {
        name,
        pitcherName: name,
        pitcherId: num(candidate.pitcherId, null),
        role: candidate.role || (index === 0 ? 'lead bridge' : 'bridge'),
        throws: candidate.throws || null,
        expectedOuts: num(candidate.expectedOuts, null),
        availabilityScore: num(candidate.availabilityScore, null),
        bridgeScore: num(candidate.bridgeScore, null),
        fatigueScore: num(candidate.fatigueScore, null),
        firstRelieverLikelihood: num(candidate.firstRelieverLikelihood, null),
        workedYesterday: boolValue(candidate.workedYesterday),
        backToBack: boolValue(candidate.backToBack),
        pitchesLast3: num(candidate.pitchesLast3, null),
        pitchesLast6: num(candidate.pitchesLast6, null),
        usedDaysLast3: num(candidate.usedDaysLast3, null),
        usedDaysLast6: num(candidate.usedDaysLast6, null),
        unavailable: boolValue(candidate.unavailable),
        shadowSharePct: num(candidate.shadowSharePct, null),
        source: 'MLB-RP2',
        projectionSource: candidate.source || reliefProjectionContext.sourceMode || 'MLB-RP2',
        identityConfidence: 'low',
        projectionOnly: true
      }
    })
    .filter(Boolean)

  if (!topRelievers.length) return null

  const projectedRuns = num(reliefProjectionContext.projectedReliefRunsAllowed, null)
  const projectedOuts = num(reliefProjectionContext.projectedReliefOuts, null)
  const bridgeStress = num(reliefProjectionContext.bridgeStressScore, null)
  const riskLabel = reliefProjectionContext.runRiskTier
    ? String(reliefProjectionContext.runRiskTier).replace(/_/g, ' ')
    : 'bridge projection'
  const summaryParts = [
    `RP2 ${riskLabel}`,
    Number.isFinite(projectedRuns) ? `${projectedRuns.toFixed(2)} projected relief runs` : null,
    Number.isFinite(projectedOuts) ? `${projectedOuts.toFixed(1)} projected outs` : null,
    Number.isFinite(bridgeStress) ? `bridge stress ${bridgeStress.toFixed(1)}` : null
  ].filter(Boolean)

  return {
    teamName,
    source: 'MLB-RP2',
    chainSource: 'MLB-RP2',
    modelVersion: reliefProjectionContext.modelVersion || null,
    sourceMode: reliefProjectionContext.sourceMode || null,
    projectionOnly: true,
    identityConfidence: 'low',
    topRelievers,
    recentBullpenSummary: null,
    projectedReliefRunsAllowed: projectedRuns,
    projectedReliefOuts: projectedOuts,
    projectedRelieversUsed: num(reliefProjectionContext.projectedRelieversUsed, null),
    bridgeStressScore: bridgeStress,
    leverageAvailabilityScore: num(reliefProjectionContext.leverageAvailabilityScore, null),
    fatigueScore: num(reliefProjectionContext.fatigueScore, null),
    qualityScore: num(reliefProjectionContext.qualityScore, null),
    runRiskTier: reliefProjectionContext.runRiskTier || null,
    topTwoSharePct: num(reliefProjectionContext.topTwoSharePct, null),
    lead: reliefProjectionContext.lead || null,
    reasons: Array.isArray(reliefProjectionContext.reasons) ? reliefProjectionContext.reasons : [],
    summaryLine: summaryParts.join(' | '),
    note: 'RP2 team-side bridge projection; exact first-up reliever identity remains shadow-only.'
  }
}

const buildBullpenChainWithFallback = (teamId, teamName, context, reliefProjectionContext = null) => {
  const chainContext = buildBullpenChain(teamId, context)
  return hasTopRelievers(chainContext)
    ? chainContext
    : buildRp2BullpenChainContext(teamName, reliefProjectionContext)
}

const buildParkContextFromEnvironment = (environmentAdjustmentContext = null) =>
  environmentAdjustmentContext
    ? {
        venueName: environmentAdjustmentContext.venueName,
        indexRuns: environmentAdjustmentContext.park.indexRuns,
        indexHr: environmentAdjustmentContext.park.indexHr,
        indexWoba: environmentAdjustmentContext.park.indexWoba,
        source: 'MLB-ENV1',
        expectedTotalRunsDelta: environmentAdjustmentContext.expected.totalRunsDelta,
        expectedHitsDelta: environmentAdjustmentContext.expected.hitsDelta,
        expectedHrDelta: environmentAdjustmentContext.expected.hrDelta,
        runEnvironmentSignal: environmentAdjustmentContext.signal
      }
    : null

const lastNameKey = (value = '') => {
  const parts = normalizeTeam(value).split(' ').filter(Boolean)
  return parts.at(-1) || ''
}

const ficDailyGameContextMatches = (gameContext = '', awayCodes = [], homeCodes = []) => {
  const text = ` ${String(gameContext || '').toUpperCase().replace(/[^A-Z0-9]+/g, ' ')} `
  return awayCodes.some((awayCode) =>
    homeCodes.some((homeCode) => text.includes(` ${awayCode} ${homeCode} `))
  )
}

const summarizeFicDailyMatchupRows = ({ rows = [], label = '', pitcher = null }) => {
  const numericRows = rows.filter((row) => Number.isFinite(num(row.hr_force, null)))
  const hrForces = numericRows.map((row) => num(row.hr_force, null)).filter(Number.isFinite)
  const qualityAbs = rows.map((row) => num(row.quality_ab_pct, null)).filter(Number.isFinite)
  const hardHits = rows.map((row) => num(row.hard_hit_pct, null)).filter(Number.isFinite)
  const highHrForceRows = rows.filter((row) => Number(row.hr_force) >= 1.4)
  const extremeHrForceRows = rows.filter((row) => Number(row.hr_force) >= 1.7)
  const matchupPassRows = rows.filter((row) => num(row.matchup_pass, 0) === 1)
  const topRows = [...rows]
    .sort((left, right) =>
      (num(right.hr_force, -1) - num(left.hr_force, -1)) ||
      (num(right.hard_hit_pct, -1) - num(left.hard_hit_pct, -1)) ||
      (num(right.bvp_ops, -1) - num(left.bvp_ops, -1))
    )
    .slice(0, 6)
    .map((row) => ({
      playerName: row.player_name,
      pitcherName: row.pitcher_name,
      position: row.position || null,
      batterHand: row.batter_hand || null,
      pitcherHand: row.pitcher_hand || null,
      hrForce: num(row.hr_force, null),
      qualityAbPct: num(row.quality_ab_pct, null),
      hardHitPct: num(row.hard_hit_pct, null),
      recentOps: num(row.recent_ops, null),
      bvpAtBats: num(row.bvp_ab, null),
      bvpAvg: num(row.bvp_avg, null),
      bvpOps: num(row.bvp_ops, null),
      matchupPass: num(row.matchup_pass, 0) === 1
    }))

  return {
    label,
    source: 'FantasyInfoCentral Daily Matchups',
    sourceStatus: rows.length ? 'warehouse' : 'missing',
    rowCount: rows.length,
    pitcherName: pitcher?.fullName || rows.find((row) => row.pitcher_name)?.pitcher_name || null,
    gameContexts: [...new Set(rows.map((row) => row.game_context).filter(Boolean))],
    averageHrForce: round(average(hrForces), 2),
    maxHrForce: hrForces.length ? round(Math.max(...hrForces), 2) : null,
    highHrForceRows: highHrForceRows.length,
    extremeHrForceRows: extremeHrForceRows.length,
    highHrForceSharePct: rows.length ? round((highHrForceRows.length / rows.length) * 100, 1) : null,
    qualityAbPct: round(average(qualityAbs), 1),
    hardHitPct: round(average(hardHits), 1),
    matchupPassRows: matchupPassRows.length,
    topRows
  }
}

const buildFicDailyMatchupContext = ({ game, context, awayName, homeName, awayPitcher = null, homePitcher = null }) => {
  const rows = Array.isArray(context.ficDailyMatchupRows) ? context.ficDailyMatchupRows : []
  if (!rows.length) return null

  const sourceDate = game.game_date?.slice(0, 10)
  const awayCodes = ficDailyTeamCodes(awayName)
  const homeCodes = ficDailyTeamCodes(homeName)
  const codeRows = rows.filter((row) =>
    ficDailyGameContextMatches(row.game_context, awayCodes, homeCodes)
  )
  const awayStarterLast = lastNameKey(awayPitcher?.fullName)
  const homeStarterLast = lastNameKey(homePitcher?.fullName)
  const pitcherRows = rows.filter((row) => {
    const pitcherLast = lastNameKey(row.pitcher_last_name || row.pitcher_name)
    return pitcherLast && (pitcherLast === awayStarterLast || pitcherLast === homeStarterLast)
  })
  const gameRows = codeRows.length ? codeRows : pitcherRows
  if (!gameRows.length) return null

  const rowsForPitcher = (pitcher) => {
    const pitcherLast = lastNameKey(pitcher?.fullName)
    if (!pitcherLast) return []
    return gameRows.filter((row) => lastNameKey(row.pitcher_last_name || row.pitcher_name) === pitcherLast)
  }
  const awayOffenseRows = rowsForPitcher(homePitcher)
  const homeOffenseRows = rowsForPitcher(awayPitcher)
  const summary = summarizeFicDailyMatchupRows({ rows: gameRows, label: `${awayName} @ ${homeName}` })

  return {
    source: 'FantasyInfoCentral Daily Matchups',
    sourceDate,
    sourceUrl: `https://www.fantasyinfocentral.com/mlb/daily-matchups?date=${sourceDate}`,
    matchup: `${awayName} @ ${homeName}`,
    gameContextMatch: codeRows.length ? 'team-code' : 'pitcher-last-name',
    awayTeamCode: awayCodes[0] || null,
    homeTeamCode: homeCodes[0] || null,
    ...summary,
    awayOffense: summarizeFicDailyMatchupRows({
      rows: awayOffenseRows,
      label: `${awayName} hitters vs ${homePitcher?.fullName || 'home starter'}`,
      pitcher: homePitcher
    }),
    homeOffense: summarizeFicDailyMatchupRows({
      rows: homeOffenseRows,
      label: `${homeName} hitters vs ${awayPitcher?.fullName || 'away starter'}`,
      pitcher: awayPitcher
    })
  }
}

const buildDbAddendumContext = (game, context, awayPitcher = null, homePitcher = null) => {
  const awayName = shortTeamName(game.away_team)
  const homeName = shortTeamName(game.home_team)
  const gamePk = num(game.mlb_game_pk, null)
  const environmentAdjustmentContext = buildEnvironmentAdjustmentContext(
    (gamePk ? context.environmentByGamePk.get(gamePk) : null) ||
      context.environmentByMatchupKey.get(matchupKey(game.away_team, game.home_team)) ||
      null
  )
  const awayReliefProjectionContext = buildReliefProjectionContext(
    (gamePk ? context.reliefProjectionByGameTeam.get(`${gamePk}:${normalizeTeam(game.away_team)}`) : null) ||
      context.reliefProjectionByDateTeam.get(`${game.game_date?.slice(0, 10)}:${normalizeTeam(game.away_team)}`) ||
      null
  )
  const homeReliefProjectionContext = buildReliefProjectionContext(
    (gamePk ? context.reliefProjectionByGameTeam.get(`${gamePk}:${normalizeTeam(game.home_team)}`) : null) ||
      context.reliefProjectionByDateTeam.get(`${game.game_date?.slice(0, 10)}:${normalizeTeam(game.home_team)}`) ||
      null
  )

  return {
    id: `${slugify(awayName)}-${slugify(homeName)}`,
    gamePk,
    awayTeam: awayName,
    homeTeam: homeName,
    parkContext: buildParkContextFromEnvironment(environmentAdjustmentContext),
    environmentAdjustmentContext,
    ficDailyMatchupContext: buildFicDailyMatchupContext({
      game,
      context,
      awayName,
      homeName,
      awayPitcher,
      homePitcher
    }),
    reliefProjectionContext: {
      away: awayReliefProjectionContext,
      home: homeReliefProjectionContext
    }
  }
}

const buildDbGame = (game, context, relieverShadowByTeam = {}) => {
  const awayName = shortTeamName(game.away_team)
  const homeName = shortTeamName(game.home_team)
  const awayTeamId = game.away_team_id || game.lineups && Object.values(game.lineups).find((lineup) => lineup.team_name === game.away_team)?.team_id
  const homeTeamId = game.home_team_id || game.lineups && Object.values(game.lineups).find((lineup) => lineup.team_name === game.home_team)?.team_id
  const opponentByTeamId = {
    [awayTeamId]: homeName,
    [homeTeamId]: awayName
  }
  const startersByTeam = Object.fromEntries(
    (game.starters || []).map((starter) => [
      starter.team_id,
      buildPitcher(starter, context, opponentByTeamId[starter.team_id] || '')
    ])
  )
  const awayPitcher = startersByTeam[awayTeamId] || buildPitcher({}, context)
  const homePitcher = startersByTeam[homeTeamId] || buildPitcher({}, context)
  const start = toPtStart(game.start_time_utc)
  const moneyline = buildMoneyline(game.markets || [], awayTeamId, homeTeamId)
  const total = buildTotal(game.markets || [])
  const spread = buildSpread(game.markets || [])
  const first5Moneyline = buildFirst5Moneyline(game.markets || [], awayTeamId, homeTeamId)
  const first5Total = buildFirst5Total(game.markets || [])
  const marketProvider = (game.markets || []).some((marketRow) => marketRow.source_name === 'draftkings')
    ? 'DraftKings typed MLB board'
    : oddsProvider
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
      first5Moneyline,
      first5Total,
      source: marketProvider
    }
  }
  const lineupContext = {
    [awayName]: awaySide.matchupContext,
    [homeName]: homeSide.matchupContext
  }
  const stateContext = buildStateContext(game, context, awayTeamId, homeTeamId, awayName, homeName, awayPitcher, homePitcher)
  const {
    gamePk,
    parkContext,
    environmentAdjustmentContext,
    ficDailyMatchupContext,
    reliefProjectionContext
  } = buildDbAddendumContext(game, context, awayPitcher, homePitcher)

  const baseGame = {
    id: `${slugify(awayName)}-${slugify(homeName)}`,
    gamePk,
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
    factors: [`Current board: ${moneyline || 'no ML'} | ${total || 'no total'} | ${spread || 'no spread'} | F5 ${first5Moneyline || 'no F5 ML'} / ${first5Total || 'no F5 total'}.`, `${awayPitcher.fullName || 'Away starter'} vs ${homePitcher.fullName || 'Home starter'}.`],
    swingFactor: 'Swing factor: whether the starter edge survives the bridge innings.',
    teamContext: { away: null, home: null },
    parkContext,
    environmentAdjustmentContext,
    ficDailyMatchupContext,
    offenseContext: {
      away: buildTeamOffenseContext(awayTeamId, 'Away', context),
      home: buildTeamOffenseContext(homeTeamId, 'Home', context)
    },
    bullpenContext: {
      away: buildTeamBullpenContext(awayTeamId, context),
      home: buildTeamBullpenContext(homeTeamId, context)
    },
    bullpenChainContext: {
      away: buildBullpenChainWithFallback(awayTeamId, awayName, context, reliefProjectionContext?.away),
      home: buildBullpenChainWithFallback(homeTeamId, homeName, context, reliefProjectionContext?.home)
    },
    relieverShadowContext: {
      away: relieverShadowByTeam[awayName] ?? null,
      home: relieverShadowByTeam[homeName] ?? null
    },
    reliefProjectionContext,
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
      remainingGaps: [
        ...(parkContext ? [] : ['parkContext']),
        ...(environmentAdjustmentContext?.weather?.signal ? [] : ['weatherContext']),
        'standingsContext'
      ]
    },
    odds: makeBoardOdds({
      spread,
      total,
      moneyline,
      first5Moneyline,
      first5Total,
      provider: marketProvider
    })
  }

  const adapter = resolveMlbAppAdapter(baseGame.metadata.modelCartridge)
  const modeledGame = withMlbCausalLedgerContext(adapter.createSportsMatchModel(baseGame, oddsProvider))
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

export const loadMlbAddendumContextsFromDb = async (date) => {
  const board = currentDayBoardForDate(date)
  if (!board.games.length) return { byGamePk: {}, byGameId: {} }
  const context = loadDbContext(date)
  const byGamePk = {}
  const byGameId = {}

  board.games.forEach((game) => {
    const addendumContext = buildDbAddendumContext(game, context)
    if (Number.isFinite(Number(addendumContext.gamePk))) {
      byGamePk[String(Number(addendumContext.gamePk))] = addendumContext
    }
    byGameId[addendumContext.id] = addendumContext
  })

  return { byGamePk, byGameId }
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

export const loadMlbInningRunMatricesFromDb = async (date) => {
  const board = currentDayBoardForDate(date)
  if (!board.games.length) return {}
  const context = loadDbContext(date)
  const entries = board.games.map((game) => {
    const awayName = shortTeamName(game.away_team)
    const homeName = shortTeamName(game.home_team)
    const awayTeamId = game.away_team_id || game.lineups && Object.values(game.lineups).find((lineup) => lineup.team_name === game.away_team)?.team_id
    const homeTeamId = game.home_team_id || game.lineups && Object.values(game.lineups).find((lineup) => lineup.team_name === game.home_team)?.team_id
    const opponentByTeamId = {
      [awayTeamId]: homeName,
      [homeTeamId]: awayName
    }
    const startersByTeam = Object.fromEntries(
      (game.starters || []).map((starter) => [
        starter.team_id,
        buildPitcher(starter, context, opponentByTeamId[starter.team_id] || '')
      ])
    )
    const awayPitcher = startersByTeam[awayTeamId] || buildPitcher({}, context)
    const homePitcher = startersByTeam[homeTeamId] || buildPitcher({}, context)
    const matrix = buildInningRunMatrix({ game, context, awayTeamId, homeTeamId, awayName, homeName, awayPitcher, homePitcher })
    return [
      `${slugify(awayName)}-${slugify(homeName)}`,
      {
        ...matrix,
        title: `${awayName} @ ${homeName}`,
        mlbGamePk: num(game.mlb_game_pk, null)
      }
    ]
  })
  return Object.fromEntries(entries)
}

const propPairFromRows = (rows = []) => {
  const over = rows.find((row) => /^over$/i.test(row.selection || ''))
  const under = rows.find((row) => /^under$/i.test(row.selection || ''))
  const yes = rows.find((row) => /^yes$/i.test(row.selection || ''))
  const no = rows.find((row) => /^no$/i.test(row.selection || ''))
  return {
    line: num(over?.line_value ?? under?.line_value, null),
    overOdds: num(over?.american_odds, null),
    underOdds: num(under?.american_odds, null),
    yesOdds: num(yes?.american_odds, null),
    noOdds: num(no?.american_odds, null)
  }
}

export const loadMlbSpecialtyMarketAnchorsFromDb = async (date) => {
  const board = currentDayBoardForDate(date)
  if (!board.games.length) return {}
  const gameMetaById = new Map()
  const pitcherMetaById = new Map()
  for (const game of board.games) {
    const awayName = shortTeamName(game.away_team)
    const homeName = shortTeamName(game.home_team)
    const gameSlug = `${slugify(awayName)}-${slugify(homeName)}`
    gameMetaById.set(game.game_id, {
      slug: gameSlug,
      teamsById: new Map([
        [game.away_team_id, slugify(awayName)],
        [game.home_team_id, slugify(homeName)]
      ])
    })
    for (const starter of game.starters || []) {
      if (starter.pitcher_id) pitcherMetaById.set(starter.pitcher_id, { gameSlug, name: starter.pitcher_name })
    }
  }

  const output = Object.fromEntries(
    Array.from(gameMetaById.values()).map((game) => [
      game.slug,
      {
        source: 'sql-mlb.db typed market anchors',
        teamRuns: {},
        teamHits: {},
        pitchers: {},
        missing: []
      }
    ])
  )

  const teamRows = querySqlite(
    `
    select game_id, team_id, market_type, line_value
    from market_contracts
    where source_name = 'draftkings'
      and market_type in ('teamTotalRuns', 'teamTotalRunsFirst3', 'teamTotalRunsFirst5', 'teamTotalRunsFirst7', 'teamTotalHits')
      and source_pk like ?
    `,
    [`%${date}-draftkings-mlb-lines.json%`]
  )
  const windowByMarketType = {
    teamTotalRuns: 'fullGame',
    teamTotalRunsFirst3: 'first3',
    teamTotalRunsFirst5: 'first5',
    teamTotalRunsFirst7: 'first7',
    teamTotalHits: 'fullGame'
  }
  for (const row of teamRows) {
    const gameMeta = gameMetaById.get(row.game_id)
    if (!gameMeta) continue
    const anchor = output[gameMeta.slug]
    const teamKey = gameMeta.teamsById.get(row.team_id)
    if (!teamKey) continue
    const target = row.market_type === 'teamTotalHits' ? anchor.teamHits : anchor.teamRuns
    const windowKey = windowByMarketType[row.market_type] || 'fullGame'
    target[teamKey] = {
      ...(target[teamKey] || {}),
      [windowKey]: {
        line: num(row.line_value, null),
        overOdds: null,
        underOdds: null,
        yesOdds: null,
        noOdds: null
      }
    }
  }

  const propRows = querySqlite(
    `
    select game_id, player_id, player_name, market_type, selection, line_value, american_odds
    from prop_market_snapshots
    where source_name = 'draftkings'
      and market_date = ?
      and market_type in ('pitcher_hits_allowed', 'pitcher_earned_runs_allowed', 'pitcher_record_win')
    order by game_id, player_id, market_type, selection
    `,
    [date]
  )
  const grouped = groupBy(propRows, (row) => `${row.game_id}:${row.player_id}:${row.market_type}`)
  for (const [key, rows] of grouped) {
    const [gameId, playerId, marketType] = key.split(':')
    const gameMeta = gameMetaById.get(gameId)
    if (!gameMeta) continue
    const anchor = output[gameMeta.slug]
    const pitcherKeyValue = slugify(rows[0]?.player_name || pitcherMetaById.get(playerId)?.name || playerId)
    anchor.pitchers[pitcherKeyValue] = {
      ...(anchor.pitchers[pitcherKeyValue] || {}),
      name: rows[0]?.player_name || pitcherMetaById.get(playerId)?.name || playerId
    }
    const pair = propPairFromRows(rows)
    if (marketType === 'pitcher_hits_allowed') anchor.pitchers[pitcherKeyValue].hitsAllowed = pair
    if (marketType === 'pitcher_earned_runs_allowed') anchor.pitchers[pitcherKeyValue].earnedRunsAllowed = pair
    if (marketType === 'pitcher_record_win') anchor.pitchers[pitcherKeyValue].recordWin = pair
  }

  for (const anchor of Object.values(output)) {
    if (!Object.keys(anchor.teamHits || {}).length) anchor.missing.push('team total hits')
  }
  return Object.fromEntries(
    Object.entries(output).filter(([, anchor]) =>
      Object.keys(anchor.teamRuns || {}).length ||
      Object.keys(anchor.teamHits || {}).length ||
      Object.keys(anchor.pitchers || {}).length
    )
  )
}
