import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

import { currentDayBoardForDate } from '../models/mlb/db/queries.mjs'
import { querySqlite } from '../models/mlb/db/sqlite.mjs'
import { writeMlbSourceStatus } from './lib/mlb-source-status.mjs'

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const dbPath = path.join(rootDir, 'data-private/warehouse/sports/mlb/sql-mlb.db')
const reportsRoot = path.join(rootDir, 'data-migration/reports')
const MODEL_VERSION = 'MLB-SP1.2026-06-15.v0.1'

const argValue = (name, fallback = '') => {
  const prefix = `${name}=`
  const inline = process.argv.find((arg) => arg.startsWith(prefix))
  if (inline) return inline.slice(prefix.length)
  const index = process.argv.indexOf(name)
  return index >= 0 ? process.argv[index + 1] || fallback : fallback
}

const date = argValue('--date')

if (!date) {
  throw new Error('Usage: node scripts/build-mlb-starter-profile-addendum.mjs --date YYYY-MM-DD')
}

const sqliteExec = (sql) =>
  execFileSync('sqlite3', ['-cmd', '.timeout 30000', dbPath, sql], {
    encoding: 'utf8',
    maxBuffer: 1024 * 1024 * 80
  })

const sqlQuote = (value) => {
  if (value === null || value === undefined) return 'NULL'
  return `'${String(value).replace(/'/g, "''")}'`
}

const sqlNum = (value) => (Number.isFinite(Number(value)) ? String(Number(value)) : 'NULL')

const parseJson = (value, fallback = null) => {
  if (!value) return fallback
  try {
    return JSON.parse(value)
  } catch {
    return fallback
  }
}

const num = (value, fallback = null) => {
  if (value === null || value === undefined || value === '') return fallback
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

const round = (value, digits = 2) => {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return null
  const factor = 10 ** digits
  return Math.round(parsed * factor) / factor
}

const clamp = (value, min, max) => Math.min(max, Math.max(min, value))

const average = (values = []) => {
  const valid = values.map(Number).filter(Number.isFinite)
  return valid.length ? valid.reduce((sum, value) => sum + value, 0) / valid.length : null
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

const normalizeTeam = (value = '') =>
  String(value)
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\bst\b/g, 'saint')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

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

const shortTeamName = (value = '') => shortTeamNameByOfficial[value] || value

const slugify = (value = '') =>
  String(value)
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

const groupBy = (rows = [], keyFn) =>
  rows.reduce((acc, row) => {
    const key = keyFn(row)
    if (!acc.has(key)) acc.set(key, [])
    acc.get(key).push(row)
    return acc
  }, new Map())

const indexBy = (rows = [], keyFn) =>
  rows.reduce((acc, row) => {
    const key = keyFn(row)
    if (key) acc.set(key, row)
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

const bestWindowRow = (rows = [], preferred = [5, 10, 3, 15, 30]) => {
  for (const window of preferred) {
    const match = rows.find((row) => Number(row.window_starts ?? row.window_games) === window)
    if (match) return match
  }
  return rows[0] || null
}

const createTable = () => {
  sqliteExec(`
    create table if not exists mlb_starting_pitcher_profile_v1_daily (
      source_date text not null,
      game_id text not null,
      game_pk integer,
      matchup_key text not null,
      away_team text,
      home_team text,
      team_role text not null,
      team_name text,
      opponent_name text,
      pitcher_id text not null,
      mlb_player_id integer,
      pitcher_name text,
      pitcher_throws text,
      pitcher_role text,
      source_role text,
      role_label text,
      projection_pitcher_flag integer,
      source_status text,
      model_version text not null,
      starter_profile_score real,
      run_prevention_score real,
      contact_suppression_score real,
      damage_suppression_score real,
      command_score real,
      swing_miss_score real,
      leash_score real,
      first_inning_risk_score real,
      repeat_opponent_tax_score real,
      weather_fragility_score real,
      handedness_fragility_score real,
      pitch_mix_fit_score real,
      collapse_risk_score real,
      expected_runs_allowed_delta real,
      expected_hits_allowed_delta real,
      expected_hr_allowed_delta real,
      expected_walk_delta real,
      expected_k_delta real,
      expected_outs_delta real,
      yrfi_probability_delta real,
      nrfi_risk_delta real,
      confidence_score real,
      feature_snapshot_json text,
      reasons_json text,
      flags_json text,
      fetched_at text not null,
      primary key (source_date, game_id, team_role, pitcher_id, model_version)
    )
  `)
  sqliteExec(`
    create index if not exists idx_mlb_sp1_date_game
      on mlb_starting_pitcher_profile_v1_daily(source_date, game_id, game_pk)
  `)
  sqliteExec(`
    create index if not exists idx_mlb_sp1_pitcher
      on mlb_starting_pitcher_profile_v1_daily(pitcher_id, source_date)
  `)
}

const insertProfileSql = (profile) => `
    insert into mlb_starting_pitcher_profile_v1_daily (
      source_date, game_id, game_pk, matchup_key, away_team, home_team, team_role, team_name,
      opponent_name, pitcher_id, mlb_player_id, pitcher_name, pitcher_throws, pitcher_role,
      source_role, role_label, projection_pitcher_flag, source_status, model_version,
      starter_profile_score, run_prevention_score, contact_suppression_score,
      damage_suppression_score, command_score, swing_miss_score, leash_score,
      first_inning_risk_score, repeat_opponent_tax_score, weather_fragility_score,
      handedness_fragility_score, pitch_mix_fit_score, collapse_risk_score,
      expected_runs_allowed_delta, expected_hits_allowed_delta, expected_hr_allowed_delta,
      expected_walk_delta, expected_k_delta, expected_outs_delta, yrfi_probability_delta,
      nrfi_risk_delta, confidence_score, feature_snapshot_json, reasons_json, flags_json, fetched_at
    ) values (
      ${sqlQuote(profile.sourceDate)}, ${sqlQuote(profile.gameId)}, ${sqlNum(profile.gamePk)},
      ${sqlQuote(profile.matchupKey)}, ${sqlQuote(profile.awayTeam)}, ${sqlQuote(profile.homeTeam)},
      ${sqlQuote(profile.teamRole)}, ${sqlQuote(profile.teamName)}, ${sqlQuote(profile.opponentName)},
      ${sqlQuote(profile.pitcherId)}, ${sqlNum(profile.mlbPlayerId)}, ${sqlQuote(profile.pitcherName)},
      ${sqlQuote(profile.pitcherThrows)}, ${sqlQuote(profile.pitcherRole)}, ${sqlQuote(profile.sourceRole)},
      ${sqlQuote(profile.roleLabel)}, ${profile.projectionPitcher ? 1 : 0}, ${sqlQuote(profile.sourceStatus)},
      ${sqlQuote(MODEL_VERSION)}, ${sqlNum(profile.starterProfileScore)}, ${sqlNum(profile.runPreventionScore)},
      ${sqlNum(profile.contactSuppressionScore)}, ${sqlNum(profile.damageSuppressionScore)},
      ${sqlNum(profile.commandScore)}, ${sqlNum(profile.swingMissScore)}, ${sqlNum(profile.leashScore)},
      ${sqlNum(profile.firstInningRiskScore)}, ${sqlNum(profile.repeatOpponentTaxScore)},
      ${sqlNum(profile.weatherFragilityScore)}, ${sqlNum(profile.handednessFragilityScore)},
      ${sqlNum(profile.pitchMixFitScore)}, ${sqlNum(profile.collapseRiskScore)},
      ${sqlNum(profile.expectedRunsAllowedDelta)}, ${sqlNum(profile.expectedHitsAllowedDelta)},
      ${sqlNum(profile.expectedHrAllowedDelta)}, ${sqlNum(profile.expectedWalkDelta)},
      ${sqlNum(profile.expectedKDelta)}, ${sqlNum(profile.expectedOutsDelta)},
      ${sqlNum(profile.yrfiProbabilityDelta)}, ${sqlNum(profile.nrfiRiskDelta)},
      ${sqlNum(profile.confidenceScore)}, ${sqlQuote(JSON.stringify(profile.featureSnapshot))},
      ${sqlQuote(JSON.stringify(profile.reasons))}, ${sqlQuote(JSON.stringify(profile.flags))},
      ${sqlQuote(profile.fetchedAt)}
    )
    on conflict(source_date, game_id, team_role, pitcher_id, model_version) do update set
      game_pk=excluded.game_pk,
      matchup_key=excluded.matchup_key,
      away_team=excluded.away_team,
      home_team=excluded.home_team,
      team_name=excluded.team_name,
      opponent_name=excluded.opponent_name,
      mlb_player_id=excluded.mlb_player_id,
      pitcher_name=excluded.pitcher_name,
      pitcher_throws=excluded.pitcher_throws,
      pitcher_role=excluded.pitcher_role,
      source_role=excluded.source_role,
      role_label=excluded.role_label,
      projection_pitcher_flag=excluded.projection_pitcher_flag,
      source_status=excluded.source_status,
      starter_profile_score=excluded.starter_profile_score,
      run_prevention_score=excluded.run_prevention_score,
      contact_suppression_score=excluded.contact_suppression_score,
      damage_suppression_score=excluded.damage_suppression_score,
      command_score=excluded.command_score,
      swing_miss_score=excluded.swing_miss_score,
      leash_score=excluded.leash_score,
      first_inning_risk_score=excluded.first_inning_risk_score,
      repeat_opponent_tax_score=excluded.repeat_opponent_tax_score,
      weather_fragility_score=excluded.weather_fragility_score,
      handedness_fragility_score=excluded.handedness_fragility_score,
      pitch_mix_fit_score=excluded.pitch_mix_fit_score,
      collapse_risk_score=excluded.collapse_risk_score,
      expected_runs_allowed_delta=excluded.expected_runs_allowed_delta,
      expected_hits_allowed_delta=excluded.expected_hits_allowed_delta,
      expected_hr_allowed_delta=excluded.expected_hr_allowed_delta,
      expected_walk_delta=excluded.expected_walk_delta,
      expected_k_delta=excluded.expected_k_delta,
      expected_outs_delta=excluded.expected_outs_delta,
      yrfi_probability_delta=excluded.yrfi_probability_delta,
      nrfi_risk_delta=excluded.nrfi_risk_delta,
      confidence_score=excluded.confidence_score,
      feature_snapshot_json=excluded.feature_snapshot_json,
      reasons_json=excluded.reasons_json,
      flags_json=excluded.flags_json,
      fetched_at=excluded.fetched_at;
`

const loadContext = () => {
  const seasonStart = `${date.slice(0, 4)}-01-01`
  const splitRows = queryOptional(
    `
    select
      snapshot_date,
      season,
      game_id,
      game_title,
      team_role,
      team_name,
      opponent_team,
      player_role,
      player_id,
      mlb_player_id,
      espn_athlete_id,
      player_name,
      handedness,
      batting_order,
      split_family,
      split_key,
      split_label,
      source_name,
      source_status,
      plate_appearances,
      at_bats,
      innings_pitched,
      games,
      games_started,
      runs,
      hits,
      doubles,
      triples,
      home_runs,
      rbi,
      walks,
      strikeouts,
      earned_runs,
      batting_average,
      on_base_percentage,
      slugging_percentage,
      ops,
      opponent_batting_average,
      era,
      whip,
      home_run_rate,
      walk_rate,
      strikeout_rate,
      source_url,
      fetched_at
    from mlb_player_split_family_snapshots
    where snapshot_date = ?
    `,
    [date],
    { maxBuffer: 1024 * 1024 * 80 }
  )
  const lineupMatchupRows = queryOptional(
    `
    select
      lms.game_id,
      lms.team_id,
      lms.opponent_team_id,
      lms.hitter_id,
      players.name as hitter_name,
      lms.opposing_pitcher_id,
      lms.snapshot_date,
      lms.batting_order,
      lms.first_cycle_read,
      lms.second_cycle_read,
      lms.collapse_trigger_score,
      lms.command_stress,
      lms.damage_fit,
      lms.pitch_fit_damage,
      lms.pitch_fit_whiff,
      lms.traffic_fit,
      lms.strand_fork_risk,
      lms.zone_punish,
      lms.platoon_pressure
    from lineup_matchup_snapshots lms
    left join players on players.player_id = lms.hitter_id
    where lms.snapshot_date = ?
    `,
    [date],
    { maxBuffer: 1024 * 1024 * 60 }
  )
  const formRows = queryOptional(
    `
    select *
    from starting_pitcher_form_snapshots
    where snapshot_date = ?
    `,
    [date],
    { maxBuffer: 1024 * 1024 * 20 }
  )
  const firstInningRows = queryOptional(
    `
    select *
    from pitcher_first_inning_profiles
    where snapshot_date = ?
    `,
    [date],
    { maxBuffer: 1024 * 1024 * 20 }
  )
  const pitchMixRows = queryOptional(
    `
    select ppm.*
    from pitcher_pitch_mix_snapshots ppm
    join (
      select pitcher_id, max(snapshot_date) as snapshot_date
      from pitcher_pitch_mix_snapshots
      where snapshot_date <= ?
      group by pitcher_id
    ) latest
      on latest.pitcher_id = ppm.pitcher_id
     and latest.snapshot_date = ppm.snapshot_date
    order by ppm.pitcher_id, ppm.pitch_share desc
    `,
    [date],
    { maxBuffer: 1024 * 1024 * 30 }
  )
  const seasonRows = queryOptional(
    `
    select
      pa.pitcher_id,
      count(*) as games,
      sum(case when pa.is_starting_pitcher = 1 then 1 else 0 end) as games_started,
      sum(pa.outs_recorded) as outs_recorded,
      sum(pa.batters_faced) as batters_faced,
      sum(pa.earned_runs) as earned_runs,
      sum(pa.runs_allowed) as runs_allowed,
      sum(pa.hits_allowed) as hits_allowed,
      sum(pa.home_runs_allowed) as home_runs_allowed,
      sum(pa.walks_allowed) as walks_allowed,
      sum(pa.strikeouts) as strikeouts
    from pitcher_appearances pa
    where pa.game_date < ?
      and pa.game_date >= ?
    group by pa.pitcher_id
    `,
    [date, seasonStart],
    { maxBuffer: 1024 * 1024 * 20 }
  )
  const environmentRows = queryOptional(
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
  const starterVsTeamRows = queryOptional(
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
    select *
    from mlb_starting_pitcher_game_logs
    where game_date < ?
      and game_date >= ?
    order by pitcher_id, game_date desc, game_pk desc
    `,
    [date, seasonStart],
    { maxBuffer: 1024 * 1024 * 30 }
  )

  return {
    hitterSplitsByGamePlayerSplit: indexBy(
      splitRows.filter((row) => row.player_role === 'hitter'),
      (row) => `${row.game_id}:${row.mlb_player_id || row.player_id}:${row.split_key}`
    ),
    pitcherSplitsByGamePitcherFamilySplit: indexBy(
      splitRows.filter((row) => row.player_role === 'pitcher'),
      (row) => `${row.game_id}:${row.player_id}:${row.split_family}:${row.split_key}`
    ),
    lineupMatchupsByGameTeam: groupBy(lineupMatchupRows, (row) => `${row.game_id}:${row.team_id}`),
    formByPitcherId: groupBy(formRows, (row) => row.pitcher_id),
    firstInningByPitcherId: groupBy(firstInningRows, (row) => row.pitcher_id),
    pitchMixByPitcherId: groupBy(pitchMixRows, (row) => row.pitcher_id),
    seasonByPitcherId: indexBy(seasonRows, (row) => row.pitcher_id),
    environmentByGamePk: indexBy(environmentRows.filter((row) => row.game_pk), (row) => String(Number(row.game_pk))),
    environmentByMatchup: indexBy(environmentRows, (row) => `${normalizeTeam(row.away_team)}|${normalizeTeam(row.home_team)}`),
    starterVsTeamByGamePitcher: indexBy(starterVsTeamRows, (row) => `${row.game_id}:${normalizeTeam(row.pitcher_name)}`),
    starterVsTeamByPitcherOpponent: indexBy(starterVsTeamRows, (row) => `${normalizeTeam(row.pitcher_name)}:${normalizeTeam(row.opponent_team)}`),
    starterHistoryByMlbPitcherId: groupBy(starterGameLogRows, (row) => String(row.pitcher_id))
  }
}

const effectiveBatterSide = (bats = '', pitcherThrows = '') => {
  const batter = String(bats || '').toUpperCase().slice(0, 1)
  const hand = String(pitcherThrows || '').toUpperCase().slice(0, 1)
  if (batter === 'S') return hand === 'L' ? 'R' : 'L'
  if (batter === 'L' || batter === 'R') return batter
  return ''
}

const hitterSplitKeyForPitcher = (pitcherThrows = '') =>
  String(pitcherThrows || '').toUpperCase().startsWith('L') ? 'vs_lhp' : 'vs_rhp'

const pitcherAllowedSplitKeyForBatter = (side = '') =>
  side === 'L' ? 'vs_lhb' : side === 'R' ? 'vs_rhb' : ''

const splitRowSummary = (row = null) =>
  row
    ? {
        splitKey: row.split_key || '',
        label: row.split_label || '',
        atBats: num(row.at_bats, null),
        inningsPitched: num(row.innings_pitched, null),
        gamesStarted: num(row.games_started, null),
        hits: num(row.hits, null),
        homeRuns: num(row.home_runs, null),
        walks: num(row.walks, null),
        strikeouts: num(row.strikeouts, null),
        avg: round(row.batting_average ?? row.opponent_batting_average, 3),
        obp: round(row.on_base_percentage, 3),
        slg: round(row.slugging_percentage, 3),
        ops: round(row.ops, 3),
        opponentAverage: round(row.opponent_batting_average, 3),
        era: round(row.era, 2),
        whip: round(row.whip, 2),
        sourceStatus: row.source_status || ''
      }
    : null

const slotWeight = (slot) => {
  const parsed = Number(slot)
  if (parsed <= 3) return 1.25
  if (parsed <= 6) return 1.1
  return 0.95
}

const sampleWeight = (sample, min = 8, max = 140) => clamp(Number(sample || 0), min, max) / max

const sharePct = (value) => {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return null
  return parsed <= 1 ? parsed * 100 : parsed
}

const pitchGroup = (pitchType = '') => {
  const code = String(pitchType || '').toUpperCase()
  if (['FF', 'SI', 'FT', 'FC', 'FA'].includes(code)) return 'fastball'
  if (['SL', 'ST', 'CU', 'KC', 'SV', 'CS'].includes(code)) return 'spin'
  if (['CH', 'FS', 'FO', 'SC'].includes(code)) return 'soft'
  return 'other'
}

const buildPitchMixProfile = ({ pitchMixRows = [], lineupRows = [], hrForce = null }) => {
  const mix = pitchMixRows.map((row) => ({
    pitchType: row.pitch_type || '',
    pitchSharePct: round(sharePct(row.pitch_share), 1),
    whiffRate: round(row.whiff_rate, 3),
    commandLeak: round(row.command_leak, 3),
    damageAllowed: round(row.damage_allowed, 3),
    hardContactRate: round(row.hard_contact_rate, 3)
  }))
  const fastballUsagePct = round(
    mix.filter((row) => pitchGroup(row.pitchType) === 'fastball').reduce((sum, row) => sum + num(row.pitchSharePct, 0), 0),
    1
  )
  const spinUsagePct = round(
    mix.filter((row) => pitchGroup(row.pitchType) === 'spin').reduce((sum, row) => sum + num(row.pitchSharePct, 0), 0),
    1
  )
  const softUsagePct = round(
    mix.filter((row) => pitchGroup(row.pitchType) === 'soft').reduce((sum, row) => sum + num(row.pitchSharePct, 0), 0),
    1
  )
  const collapseAverage = average(lineupRows.map((row) => num(row.collapse_trigger_score, null)))
  const damageAverage = average(lineupRows.map((row) => num(row.damage_fit, null)))
  const trafficAverage = average(lineupRows.map((row) => num(row.traffic_fit, null)))
  const platoonAverage = average(lineupRows.map((row) => num(row.platoon_pressure, null)))
  const commandStress = average(lineupRows.map((row) => num(row.command_stress, null)))
  const pitchFitDamage = average(lineupRows.map((row) => num(row.pitch_fit_damage, null)))
  const pressureScore = clamp(
    average([
      collapseAverage,
      damageAverage,
      trafficAverage,
      platoonAverage,
      Number.isFinite(pitchFitDamage) ? 50 + pitchFitDamage * 4 : null
    ].filter(Number.isFinite)) ?? 50,
    10,
    96
  )
  const hotCarry = Number(hrForce) >= 1.5
  const weatherArchetype =
    Number(spinUsagePct) >= 40
      ? hotCarry ? 'spin-heavy weather fragility' : 'spin-heavy neutral'
      : Number(fastballUsagePct) >= 45
        ? hotCarry ? 'fastball-heavy warmup offset' : 'fastball-heavy'
        : hotCarry ? 'balanced high-carry' : 'balanced'

  return {
    pitchMix: mix.slice(0, 6),
    primaryPitchGroup: mix[0]?.pitchType || '',
    fastballUsagePct,
    spinUsagePct,
    softUsagePct,
    weatherArchetype,
    lineupPitchFitPressureScore: round(pressureScore, 1),
    averageCollapseTriggerScore: round(collapseAverage, 1),
    averageDamageFit: round(damageAverage, 1),
    averageTrafficFit: round(trafficAverage, 1),
    averagePlatoonPressure: round(platoonAverage, 1),
    averageCommandStress: round(commandStress, 1),
    averagePitchFitDamage: round(pitchFitDamage, 2),
    rows: lineupRows.length
  }
}

const findEnvironment = ({ game, context }) =>
  (game.mlb_game_pk ? context.environmentByGamePk.get(String(Number(game.mlb_game_pk))) : null) ||
  context.environmentByMatchup.get(`${normalizeTeam(game.away_team)}|${normalizeTeam(game.home_team)}`) ||
  null

const findStatMuse = ({ game, starter, opponentName, context }) =>
  context.starterVsTeamByGamePitcher.get(`${game.game_id}:${normalizeTeam(starter.pitcher_name)}`) ||
  context.starterVsTeamByPitcherOpponent.get(`${normalizeTeam(starter.pitcher_name)}:${normalizeTeam(opponentName)}`) ||
  null

const buildLineupSplitProfile = ({ game, starter, opponentLineup = [], opponentTeamId, context }) => {
  const hitterSplitKey = hitterSplitKeyForPitcher(starter.throws)
  const hitterGameKeys = [
    game.game_id,
    `${slugify(game.away_team)}-${slugify(game.home_team)}`,
    `${slugify(shortTeamName(game.away_team))}-${slugify(shortTeamName(game.home_team))}`
  ].filter(Boolean)
  const pitcherSplitRows = {
    vs_lhb: context.pitcherSplitsByGamePitcherFamilySplit.get(`${game.game_id}:${starter.player_id}:handedness:vs_lhb`) || null,
    vs_rhb: context.pitcherSplitsByGamePitcherFamilySplit.get(`${game.game_id}:${starter.player_id}:handedness:vs_rhb`) || null
  }
  const pitcherAllowedBaselineOps = weightedAverage(
    Object.values(pitcherSplitRows)
      .filter(Boolean)
      .map((row) => ({ value: num(row.ops, null), weight: sampleWeight(row.at_bats, 12, 220) })),
    'value',
    'weight'
  )
  const pitcherAllowedBaselineAvg = weightedAverage(
    Object.values(pitcherSplitRows)
      .filter(Boolean)
      .map((row) => ({ value: num(row.opponent_batting_average ?? row.batting_average, null), weight: sampleWeight(row.at_bats, 12, 220) })),
    'value',
    'weight'
  )
  const rows = opponentLineup
    .filter((slot) => slot?.player_id)
    .map((slot) => {
      const side = effectiveBatterSide(slot.bats, starter.throws)
      const pitcherAllowedKey = pitcherAllowedSplitKeyForBatter(side)
      const playerKeys = [slot.mlb_player_id, slot.player_id, String(slot.player_id || '').replace(/^mlb-player-/, '')]
        .filter((value) => value !== null && value !== undefined && value !== '')
        .map(String)
      const hitterSplit = hitterGameKeys
        .flatMap((gameKey) => playerKeys.map((playerKey) => context.hitterSplitsByGamePlayerSplit.get(`${gameKey}:${playerKey}:${hitterSplitKey}`)))
        .find(Boolean) || null
      const pitcherAllowed = pitcherAllowedKey ? pitcherSplitRows[pitcherAllowedKey] || null : null
      const weight = slotWeight(slot.batting_order) * sampleWeight(hitterSplit?.at_bats || hitterSplit?.plate_appearances, 8, 130)
      return {
        playerId: slot.player_id,
        mlbPlayerId: num(slot.mlb_player_id, null),
        name: slot.player_name || '',
        slot: num(slot.batting_order, null),
        bats: slot.bats || '',
        effectiveSide: side,
        weight,
        hitterSplit: splitRowSummary(hitterSplit),
        pitcherAllowedSplit: splitRowSummary(pitcherAllowed),
        selectedHitterOps: num(hitterSplit?.ops, null),
        selectedHitterAvg: num(hitterSplit?.batting_average, null),
        pitcherAllowedOps: num(pitcherAllowed?.ops, null),
        pitcherAllowedAvg: num(pitcherAllowed?.opponent_batting_average ?? pitcherAllowed?.batting_average, null)
      }
    })

  const topThird = rows.filter((row) => Number(row.slot) <= 3)
  const topSix = rows.filter((row) => Number(row.slot) <= 6)
  const weightedHitterSplitOps = weightedAverage(rows, 'selectedHitterOps', 'weight')
  const weightedHitterSplitAvg = weightedAverage(rows, 'selectedHitterAvg', 'weight')
  const weightedPitcherAllowedOps = weightedAverage(rows, 'pitcherAllowedOps', 'weight')
  const weightedPitcherAllowedAvg = weightedAverage(rows, 'pitcherAllowedAvg', 'weight')
  const topThirdHitterSplitOps = weightedAverage(topThird, 'selectedHitterOps', 'weight')
  const topThirdPitcherAllowedOps = weightedAverage(topThird, 'pitcherAllowedOps', 'weight')
  const topSixHitterSplitOps = weightedAverage(topSix, 'selectedHitterOps', 'weight')
  const strongSplitBats = rows.filter((row) => num(row.hitterSplit?.atBats, 0) >= 20 && num(row.selectedHitterOps, 0) >= 0.8)
  const weakSplitBats = rows.filter((row) => num(row.hitterSplit?.atBats, 0) >= 20 && num(row.selectedHitterOps, 1) <= 0.65)
  const severeWeakSplitBats = rows.filter((row) => num(row.hitterSplit?.atBats, 0) >= 25 && num(row.selectedHitterOps, 1) <= 0.58)
  const lhbCount = rows.filter((row) => row.effectiveSide === 'L').length
  const rhbCount = rows.filter((row) => row.effectiveSide === 'R').length
  const switchCount = opponentLineup.filter((slot) => String(slot.bats || '').toUpperCase().startsWith('S')).length
  const handednessFragilityScore = clamp(
    50 +
      (Number(weightedPitcherAllowedOps ?? 0.71) - 0.71) * 105 +
      (Number(weightedHitterSplitOps ?? 0.72) - 0.72) * 58 +
      (Number(topThirdHitterSplitOps ?? weightedHitterSplitOps ?? 0.72) - 0.72) * 35 +
      (strongSplitBats.length - 3) * 3.2 -
      Math.max(weakSplitBats.length - 2, 0) * 2.4 -
      severeWeakSplitBats.length * 2.4,
    12,
    94
  )

  return {
    pitcherHand: starter.throws || '',
    hitterSplitKey,
    pitcherAllowedBaselineOps: round(pitcherAllowedBaselineOps, 3),
    pitcherAllowedBaselineAvg: round(pitcherAllowedBaselineAvg, 3),
    weightedHitterSplitOps: round(weightedHitterSplitOps, 3),
    weightedHitterSplitAvg: round(weightedHitterSplitAvg, 3),
    weightedPitcherAllowedOps: round(weightedPitcherAllowedOps, 3),
    weightedPitcherAllowedAvg: round(weightedPitcherAllowedAvg, 3),
    topThirdHitterSplitOps: round(topThirdHitterSplitOps, 3),
    topThirdPitcherAllowedOps: round(topThirdPitcherAllowedOps, 3),
    topSixHitterSplitOps: round(topSixHitterSplitOps, 3),
    handednessFragilityScore: round(handednessFragilityScore, 1),
    lineupCounts: {
      left: lhbCount,
      right: rhbCount,
      switch: switchCount,
      hitters: rows.length
    },
    pitcherAllowed: {
      vsLhb: splitRowSummary(pitcherSplitRows.vs_lhb),
      vsRhb: splitRowSummary(pitcherSplitRows.vs_rhb)
    },
    strongSplitBats: strongSplitBats.slice(0, 5).map((row) => ({
      name: row.name,
      slot: row.slot,
      bats: row.bats,
      effectiveSide: row.effectiveSide,
      ops: round(row.selectedHitterOps, 3),
      avg: round(row.selectedHitterAvg, 3),
      atBats: row.hitterSplit?.atBats ?? null
    })),
    weakSplitBats: weakSplitBats.slice(0, 5).map((row) => ({
      name: row.name,
      slot: row.slot,
      bats: row.bats,
      effectiveSide: row.effectiveSide,
      ops: round(row.selectedHitterOps, 3),
      avg: round(row.selectedHitterAvg, 3),
      atBats: row.hitterSplit?.atBats ?? null
    })),
    rows: rows.slice(0, 9).map((row) => ({
      name: row.name,
      slot: row.slot,
      bats: row.bats,
      effectiveSide: row.effectiveSide,
      hitterSplit: row.hitterSplit,
      pitcherAllowedSplit: row.pitcherAllowedSplit
    })),
    coverage: {
      lineupHitters: opponentLineup.length,
      hitterSplitRows: rows.filter((row) => row.hitterSplit).length,
      pitcherAllowedRows: Object.values(pitcherSplitRows).filter(Boolean).length
    }
  }
}

const splitByFamily = ({ game, starter, context, family, key }) =>
  context.pitcherSplitsByGamePitcherFamilySplit.get(`${game.game_id}:${starter.player_id}:${family}:${key}`) || null

const selectedDayNightBucket = (envRow = null, game = {}) => {
  if (num(envRow?.night_start_flag, 0) === 1) return 'night'
  if (num(envRow?.local_start_hour, null) !== null) return Number(envRow.local_start_hour) >= 18 ? 'night' : 'day'
  const hour = new Date(game.start_time_utc).getUTCHours()
  return hour >= 22 || hour < 5 ? 'night' : 'day'
}

const buildDayNightProfile = ({ game, starter, context, envRow }) => {
  const selectedKey = selectedDayNightBucket(envRow, game)
  const selected = splitByFamily({ game, starter, context, family: 'day_night', key: selectedKey })
  const opposite = splitByFamily({ game, starter, context, family: 'day_night', key: selectedKey === 'day' ? 'night' : 'day' })
  const era = num(selected?.era, null)
  const oba = num(selected?.opponent_batting_average, null)
  const fragility = clamp(
    50 +
      (Number(era ?? 4.1) - 4.1) * 5.7 +
      (Number(oba ?? 0.245) - 0.245) * 92 +
      (Number(selected?.games_started ?? 6) < 4 ? 3 : 0),
    12,
    92
  )
  return {
    selectedKey,
    selected: splitRowSummary(selected),
    opposite: splitRowSummary(opposite),
    fragilityScore: round(fragility, 1)
  }
}

const buildHomeAwayProfile = ({ game, starter, context, teamRole }) => {
  const selectedKey = teamRole === 'home' ? 'home' : 'away'
  const selected = splitByFamily({ game, starter, context, family: 'home_away', key: selectedKey })
  const opposite = splitByFamily({ game, starter, context, family: 'home_away', key: selectedKey === 'home' ? 'away' : 'home' })
  const era = num(selected?.era, null)
  const oba = num(selected?.opponent_batting_average, null)
  const fragility = clamp(
    50 +
      (Number(era ?? 4.1) - 4.1) * 4.7 +
      (Number(oba ?? 0.245) - 0.245) * 75,
    14,
    90
  )
  return {
    selectedKey,
    selected: splitRowSummary(selected),
    opposite: splitRowSummary(opposite),
    fragilityScore: round(fragility, 1)
  }
}

const buildWeatherProfile = ({ envRow = null, pitchMixProfile }) => {
  const hrForce = num(envRow?.game_time_hr_force, num(envRow?.effective_hr_force, num(envRow?.hr_force, null)))
  const expectedTotalRunsDelta = num(envRow?.expected_total_runs_delta, 0)
  const expectedHrDelta = num(envRow?.expected_hr_delta, 0)
  const spinUsagePct = num(pitchMixProfile.spinUsagePct, 0)
  const fastballUsagePct = num(pitchMixProfile.fastballUsagePct, 0)
  const lateLocalStart = num(envRow?.late_local_start_flag, 0) === 1
  const domeOrMissing = !Number.isFinite(hrForce)
  const hrfComponent = domeOrMissing ? -4 : (hrForce - 1.25) * 36
  const spinTax = Number.isFinite(hrForce) && hrForce >= 1.5 ? Math.max(spinUsagePct - 35, 0) * 0.26 : 0
  const fastballOffset = Number.isFinite(hrForce) && hrForce >= 1.5 ? Math.max(fastballUsagePct - 45, 0) * 0.13 : 0
  const visibilityTax = lateLocalStart ? -4 : 0
  const fragility = clamp(
    50 + hrfComponent + expectedTotalRunsDelta * 14 + expectedHrDelta * 20 + spinTax - fastballOffset + visibilityTax,
    20,
    96
  )
  return {
    source: envRow ? 'MLB-ENV1' : '',
    hrForce: round(hrForce, 2),
    effectiveHrForce: round(envRow?.effective_hr_force, 2),
    gameTimeHrForce: round(envRow?.game_time_hr_force, 2),
    earlyGameMaxHrForce: round(envRow?.early_game_max_hr_force, 2),
    runEnvironmentSignal: envRow?.run_environment_signal || '',
    weatherRunDelta: round(envRow?.weather_run_delta, 2),
    expectedTotalRunsDelta: round(expectedTotalRunsDelta, 2),
    expectedHrDelta: round(expectedHrDelta, 2),
    lateLocalStart,
    roofOrWeatherStatus: envRow?.weather_match_status || '',
    fragilityScore: round(fragility, 1),
    note:
      Number.isFinite(hrForce) && hrForce >= 1.7
        ? 'Extreme HRForce: SP1 taxes fragile starters and raises early collapse sensitivity.'
        : Number.isFinite(hrForce) && hrForce >= 1.5
          ? 'High HRForce: SP1 treats hot/windy carry as pitcher fragility unless other context suppresses it.'
          : domeOrMissing
            ? 'No HRForce/open-air carry: SP1 does not use weather as an over-support signal.'
            : 'Neutral/lower HRForce carry.'
  }
}

const buildRepeatOpponentProfile = ({ game, starter, opponentName, context, statMuse }) => {
  const history = context.starterHistoryByMlbPitcherId.get(String(starter.mlb_player_id)) || []
  const vsOpponent = history.filter((row) => normalizeTeam(row.opponent_name) === normalizeTeam(opponentName))
  const latest = vsOpponent[0] || null
  const statMuseEra = num(statMuse?.era, null)
  const statMuseStarts = num(statMuse?.games_started, 0)
  const latestRuns = num(latest?.runs_allowed, null)
  const latestEarned = num(latest?.earned_runs, null)
  const repeatTax = clamp(
    50 +
      (latest ? 6 : 0) +
      Math.max(Number(latestRuns ?? 2) - 2, 0) * 3.6 +
      Math.max(Number(latestEarned ?? 2) - 2, 0) * 2.4 +
      (statMuseStarts >= 1 && Number.isFinite(statMuseEra) ? (statMuseEra - 4) * 2.4 : 0),
    35,
    92
  )
  return {
    facedOpponentThisSeason: Boolean(latest),
    startsVsOpponentThisSeason: vsOpponent.length,
    lastStartVsOpponent: latest
      ? {
          date: latest.game_date || '',
          inningsPitched: num(latest.innings_pitched, null),
          runsAllowed: latestRuns,
          earnedRuns: latestEarned,
          hitsAllowed: num(latest.hits_allowed, null),
          homeRunsAllowed: num(latest.home_runs_allowed, null),
          walksAllowed: num(latest.walks_allowed, null),
          strikeouts: num(latest.strikeouts, null)
        }
      : null,
    statMuse: statMuse
      ? {
          source: 'StatMuse',
          gamesStarted: statMuseStarts,
          appearances: num(statMuse.appearances, null),
          era: round(statMuseEra, 2),
          inningsPitched: statMuse.innings_pitched || '',
          runsAllowed: num(statMuse.runs_allowed, null),
          hitsAllowed: num(statMuse.hits_allowed, null),
          homeRunsAllowed: num(statMuse.home_runs_allowed, null),
          walks: num(statMuse.walks, null),
          answerText: statMuse.answer_text || ''
        }
      : null,
    repeatOpponentTaxScore: round(repeatTax, 1)
  }
}

const buildRecentFormProfile = ({ starter, context }) => {
  const season = context.seasonByPitcherId.get(starter.player_id) || {}
  const form = bestWindowRow(context.formByPitcherId.get(starter.player_id) || [], [5, 10, 3, 15])
  const firstInning = bestWindowRow(context.firstInningByPitcherId.get(starter.player_id) || [], [10, 5, 3, 15])
  const outs = num(season.outs_recorded, 0)
  const innings = outs / 3
  const earnedRuns = num(season.earned_runs, null)
  const walks = num(season.walks_allowed, null)
  const strikeouts = num(season.strikeouts, null)
  const hits = num(season.hits_allowed, null)
  const battersFaced = num(season.batters_faced, null)
  const era = outs > 0 && Number.isFinite(earnedRuns) ? (earnedRuns * 27) / outs : null
  const whip = innings > 0 && Number.isFinite(walks) && Number.isFinite(hits) ? (walks + hits) / innings : null
  const kRate = Number.isFinite(battersFaced) && battersFaced > 0 ? strikeouts / battersFaced : null
  const bbRate = Number.isFinite(battersFaced) && battersFaced > 0 ? walks / battersFaced : null
  const hrPer9 = innings > 0 ? (num(season.home_runs_allowed, 0) * 9) / innings : null
  const recentRunFragility = clamp(
    50 +
      (num(form?.runs_allowed_per_start, 4) - 3.2) * 5.5 +
      (num(form?.whip_like, 1.28) - 1.28) * 24 +
      num(form?.short_start_rate, 0.18) * 14 +
      num(form?.run_volatility, 1.5) * 1.8,
    20,
    92
  )
  const leashScore = clamp(
    72 +
      (num(form?.innings_per_start, 5.4) - 5.4) * 8 -
      num(form?.short_start_rate, 0.18) * 55,
    16,
    92
  )
  const commandScore = clamp(
    68 -
      Math.max(num(form?.walks_allowed_per_start, 2) - 1.8, 0) * 8 -
      Math.max(Number(bbRate ?? 0.085) - 0.085, 0) * 180,
    20,
    92
  )
  const swingMissScore = clamp(
    48 +
      Math.max(num(form?.strikeouts_per_start, 5) - 5, -2) * 5 +
      (Number(kRate ?? 0.21) - 0.21) * 120,
    18,
    94
  )
  return {
    season: {
      games: num(season.games, null),
      gamesStarted: num(season.games_started, null),
      inningsPitched: round(innings, 1),
      era: round(era, 2),
      whip: round(whip, 2),
      kRate: round(kRate, 3),
      bbRate: round(bbRate, 3),
      hrPer9: round(hrPer9, 2)
    },
    recent: form
      ? {
          windowStarts: num(form.window_starts, null),
          startsSample: num(form.starts_sample, null),
          inningsPerStart: round(form.innings_per_start, 2),
          runsAllowedPerStart: round(form.runs_allowed_per_start, 2),
          hitsAllowedPerStart: round(form.hits_allowed_per_start, 2),
          homeRunsAllowedPerStart: round(form.home_runs_allowed_per_start, 2),
          walksAllowedPerStart: round(form.walks_allowed_per_start, 2),
          strikeoutsPerStart: round(form.strikeouts_per_start, 2),
          whipLike: round(form.whip_like, 2),
          shortStartRate: round(form.short_start_rate, 3),
          runVolatility: round(form.run_volatility, 2)
        }
      : null,
    firstInning: firstInning
      ? {
          startsSample: num(firstInning.starts_sample, null),
          pressureIndex: round(firstInning.first_inning_pressure_index, 1),
          runAllowedRate: round(firstInning.first_inning_run_allowed_rate, 3),
          runsAllowedPerStart: round(firstInning.first_inning_runs_allowed_per_start, 2),
          cleanRate: round(firstInning.first_inning_clean_rate, 3),
          baserunnersPerStart: round(firstInning.first_inning_baserunners_per_start, 2)
        }
      : null,
    recentRunFragilityScore: round(recentRunFragility, 1),
    leashScore: round(leashScore, 1),
    commandScore: round(commandScore, 1),
    swingMissScore: round(swingMissScore, 1)
  }
}

const topMatchupRows = (rows = []) =>
  rows
    .map((row) => {
      const matchupScore = average([
        num(row.collapse_trigger_score, null),
        num(row.damage_fit, null),
        num(row.traffic_fit, null),
        num(row.platoon_pressure, null)
      ])
      return {
        hitterId: row.hitter_id,
        name: row.hitter_name || '',
        slot: num(row.batting_order, null),
        matchupScore: round(matchupScore, 1),
        starterKernelScore: round(row.collapse_trigger_score, 1),
        collapseTriggerScore: round(row.collapse_trigger_score, 1),
        damageFit: round(row.damage_fit, 1),
        trafficFit: round(row.traffic_fit, 1),
        platoonPressure: round(row.platoon_pressure, 1),
        pitchTypeGrade: round(row.pitch_fit_damage, 2),
        summary: ''
      }
    })
    .sort((left, right) =>
      num(right.matchupScore, 0) - num(left.matchupScore, 0) ||
      num(right.collapseTriggerScore, 0) - num(left.collapseTriggerScore, 0)
    )
    .slice(0, 5)

const buildProfileForStarter = ({ game, starter, teamRole, opponentTeamId, opponentName, opponentLineup, context, fetchedAt }) => {
  const envRow = findEnvironment({ game, context })
  const matchupRowsAll = context.lineupMatchupsByGameTeam.get(`${game.game_id}:${opponentTeamId}`) || []
  const matchupRows = matchupRowsAll.filter((row) => !row.opposing_pitcher_id || row.opposing_pitcher_id === starter.player_id)
  const pitchMixRows = context.pitchMixByPitcherId.get(starter.player_id) || []
  const pitchMixProfile = buildPitchMixProfile({
    pitchMixRows,
    lineupRows: matchupRows.length ? matchupRows : matchupRowsAll,
    hrForce: num(envRow?.game_time_hr_force, num(envRow?.effective_hr_force, num(envRow?.hr_force, null)))
  })
  const canonicalSplits = buildLineupSplitProfile({
    game,
    starter,
    opponentLineup,
    opponentTeamId,
    context
  })
  const dayNightProfile = buildDayNightProfile({ game, starter, context, envRow })
  const homeAwayProfile = buildHomeAwayProfile({ game, starter, context, teamRole })
  const weatherProfile = buildWeatherProfile({ envRow, pitchMixProfile })
  const statMuse = findStatMuse({ game, starter, opponentName, context })
  const repeatOpponentProfile = buildRepeatOpponentProfile({ game, starter, opponentName, context, statMuse })
  const recentFormProfile = buildRecentFormProfile({ starter, context })
  const topRows = topMatchupRows(matchupRows.length ? matchupRows : matchupRowsAll)

  const handednessFragilityScore = num(canonicalSplits.handednessFragilityScore, 50)
  const weatherFragilityScore = num(weatherProfile.fragilityScore, 50)
  const dayNightFragilityScore = num(dayNightProfile.fragilityScore, 50)
  const homeAwayFragilityScore = num(homeAwayProfile.fragilityScore, 50)
  const pitchMixFitScore = num(pitchMixProfile.lineupPitchFitPressureScore, 50)
  const repeatOpponentTaxScore = num(repeatOpponentProfile.repeatOpponentTaxScore, 50)
  const recentRunFragilityScore = num(recentFormProfile.recentRunFragilityScore, 50)
  const firstInningBase = num(recentFormProfile.firstInning?.pressureIndex, 50)
  const firstInningRiskScore = clamp(
    firstInningBase * 0.34 +
      handednessFragilityScore * 0.22 +
      weatherFragilityScore * 0.18 +
      pitchMixFitScore * 0.16 +
      repeatOpponentTaxScore * 0.1,
    15,
    96
  )
  const collapseRiskScore = clamp(
    handednessFragilityScore * 0.22 +
      weatherFragilityScore * 0.16 +
      dayNightFragilityScore * 0.13 +
      homeAwayFragilityScore * 0.08 +
      pitchMixFitScore * 0.18 +
      repeatOpponentTaxScore * 0.11 +
      recentRunFragilityScore * 0.12,
    12,
    96
  )
  const runPreventionScore = clamp(100 - collapseRiskScore + (num(recentFormProfile.swingMissScore, 50) - 50) * 0.08, 8, 94)
  const contactSuppressionScore = clamp(
    100 -
      (handednessFragilityScore * 0.48 + pitchMixFitScore * 0.27 + recentRunFragilityScore * 0.25) +
      (num(recentFormProfile.swingMissScore, 50) - 50) * 0.2,
    10,
    94
  )
  const damageSuppressionScore = clamp(100 - (weatherFragilityScore * 0.34 + pitchMixFitScore * 0.34 + handednessFragilityScore * 0.32), 8, 94)
  const starterProfileScore = clamp(
    runPreventionScore * 0.42 + contactSuppressionScore * 0.26 + damageSuppressionScore * 0.2 + num(recentFormProfile.leashScore, 60) * 0.12,
    8,
    94
  )
  const expectedRunsAllowedDelta = clamp((collapseRiskScore - 50) * 0.018, -0.38, 0.58)
  const expectedHitsAllowedDelta = clamp(
    (handednessFragilityScore - 50) * 0.035 + (pitchMixFitScore - 50) * 0.015,
    -0.95,
    1.3
  )
  const expectedHrAllowedDelta = clamp(
    (weatherFragilityScore - 50) * 0.01 + (num(canonicalSplits.weightedPitcherAllowedOps, 0.71) - 0.71) * 0.45,
    -0.28,
    0.48
  )
  const expectedWalkDelta = clamp((50 - num(recentFormProfile.commandScore, 50)) * 0.013, -0.3, 0.45)
  const expectedKDelta = clamp(
    (num(recentFormProfile.swingMissScore, 50) - 50) * 0.035 -
      Math.max(num(canonicalSplits.weightedHitterSplitAvg, 0.245) - 0.255, 0) * 6,
    -1.35,
    1.25
  )
  const expectedOutsDelta = clamp(
    (num(recentFormProfile.leashScore, 60) - 60) * 0.035 -
      Math.max(collapseRiskScore - 58, 0) * 0.055,
    -1.7,
    1.25
  )
  const yrfiProbabilityDelta = clamp((firstInningRiskScore - 50) * 0.09, -2.8, 5.2)
  const nrfiRiskDelta = yrfiProbabilityDelta

  const coverage = {
    hitterSplitRows: canonicalSplits.coverage.hitterSplitRows,
    pitcherAllowedRows: canonicalSplits.coverage.pitcherAllowedRows,
    lineupHitters: canonicalSplits.coverage.lineupHitters,
    pitchFitRows: matchupRows.length || matchupRowsAll.length,
    env1: Boolean(envRow),
    pitcherDayNightRows: [dayNightProfile.selected, dayNightProfile.opposite].filter(Boolean).length,
    pitcherHomeAwayRows: [homeAwayProfile.selected, homeAwayProfile.opposite].filter(Boolean).length,
    recentForm: Boolean(recentFormProfile.recent),
    statMuse: Boolean(statMuse)
  }
  const confidenceScore = clamp(
    22 +
      Math.min(coverage.hitterSplitRows, 9) * 2.6 +
      coverage.pitcherAllowedRows * 7 +
      Math.min(coverage.pitchFitRows, 9) * 1.8 +
      (coverage.env1 ? 10 : 0) +
      coverage.pitcherDayNightRows * 3 +
      coverage.pitcherHomeAwayRows * 3 +
      (coverage.recentForm ? 7 : 0) +
      (coverage.statMuse ? 3 : 0),
    10,
    98
  )
  const sourceStatus = confidenceScore >= 75 ? 'complete' : confidenceScore >= 55 ? 'partial' : 'thin'
  const flags = [
    num(recentFormProfile.season.gamesStarted, 0) > 0 && num(recentFormProfile.season.gamesStarted, 0) < 4 ? 'tiny_sample_pitcher_flag' : null,
    /primary|bulk|opener/i.test(`${starter.source_name || ''} ${starter.confirmation_status || ''} ${starter.starter_role || ''}`) ? 'opener_or_bulk_primary_flag' : null,
    repeatOpponentProfile.facedOpponentThisSeason ? 'repeat_opponent_flag' : null,
    num(weatherProfile.hrForce, 0) >= 1.5 ? 'high_hrforce_fragility_flag' : null,
    num(weatherProfile.hrForce, 0) >= 1.7 ? 'extreme_hrforce_flag' : null,
    weatherFragilityScore >= 64 && pitchMixProfile.weatherArchetype.includes('spin-heavy') ? 'weather_profile_conflict_flag' : null,
    handednessFragilityScore >= 64 ? 'handedness_mismatch_flag' : null,
    pitchMixFitScore >= 64 ? 'pitch_mix_lineup_mismatch_flag' : null,
    collapseRiskScore >= 66 ? 'starter_collapse_risk_flag' : null,
    sourceStatus !== 'complete' ? 'stale_or_missing_source_flag' : null
  ].filter(Boolean)
  const reasons = [
    `SP1 collapse risk ${round(collapseRiskScore, 1)} with starter profile ${round(starterProfileScore, 1)}.`,
    Number.isFinite(num(canonicalSplits.weightedPitcherAllowedOps, null))
      ? `Lineup-weighted pitcher allowed OPS ${round(canonicalSplits.weightedPitcherAllowedOps, 3)} vs baseline ${round(canonicalSplits.pitcherAllowedBaselineOps, 3)}.`
      : null,
    Number.isFinite(num(canonicalSplits.weightedHitterSplitOps, null))
      ? `Opponent hitter split OPS ${round(canonicalSplits.weightedHitterSplitOps, 3)} against ${starter.throws || '?'}HP.`
      : null,
    `${canonicalSplits.strongSplitBats.length} strong split bats / ${canonicalSplits.weakSplitBats.length} weak split bats in the lineup.`,
    dayNightProfile.selected
      ? `${dayNightProfile.selectedKey} split: ${dayNightProfile.selected.era ?? '-'} ERA / ${dayNightProfile.selected.opponentAverage ?? '-'} OBA.`
      : null,
    Number.isFinite(num(weatherProfile.hrForce, null))
      ? `HRForce ${weatherProfile.hrForce} gives weather fragility ${weatherFragilityScore}.`
      : 'HRForce missing/dome context does not support weather carry.',
    `Pitch-fit pressure ${round(pitchMixFitScore, 1)} from ${coverage.pitchFitRows} hitter matchup rows.`,
    repeatOpponentProfile.facedOpponentThisSeason
      ? `Repeat opponent tax active; last start vs ${opponentName} allowed ${repeatOpponentProfile.lastStartVsOpponent?.runsAllowed ?? '-'} runs.`
      : null
  ].filter(Boolean)

  return {
    sourceDate: date,
    gameId: game.game_id,
    gamePk: num(game.mlb_game_pk, null),
    matchupKey: `${normalizeTeam(game.away_team)}|${normalizeTeam(game.home_team)}`,
    awayTeam: game.away_team,
    homeTeam: game.home_team,
    teamRole,
    teamName: starter.team_name,
    opponentName,
    pitcherId: starter.player_id,
    mlbPlayerId: num(starter.mlb_player_id, null),
    pitcherName: starter.pitcher_name,
    pitcherThrows: starter.throws || '',
    pitcherRole: starter.starter_role || '',
    sourceRole: starter.source_name || '',
    roleLabel: starter.confirmation_status || '',
    projectionPitcher: true,
    sourceStatus,
    starterProfileScore: round(starterProfileScore, 1),
    runPreventionScore: round(runPreventionScore, 1),
    contactSuppressionScore: round(contactSuppressionScore, 1),
    damageSuppressionScore: round(damageSuppressionScore, 1),
    commandScore: recentFormProfile.commandScore,
    swingMissScore: recentFormProfile.swingMissScore,
    leashScore: recentFormProfile.leashScore,
    firstInningRiskScore: round(firstInningRiskScore, 1),
    repeatOpponentTaxScore: round(repeatOpponentTaxScore, 1),
    weatherFragilityScore: round(weatherFragilityScore, 1),
    handednessFragilityScore: round(handednessFragilityScore, 1),
    pitchMixFitScore: round(pitchMixFitScore, 1),
    collapseRiskScore: round(collapseRiskScore, 1),
    expectedRunsAllowedDelta: round(expectedRunsAllowedDelta, 2),
    expectedHitsAllowedDelta: round(expectedHitsAllowedDelta, 2),
    expectedHrAllowedDelta: round(expectedHrAllowedDelta, 2),
    expectedWalkDelta: round(expectedWalkDelta, 2),
    expectedKDelta: round(expectedKDelta, 2),
    expectedOutsDelta: round(expectedOutsDelta, 2),
    yrfiProbabilityDelta: round(yrfiProbabilityDelta, 2),
    nrfiRiskDelta: round(nrfiRiskDelta, 2),
    confidenceScore: round(confidenceScore, 1),
    featureSnapshot: {
      modelVersion: MODEL_VERSION,
      publicGameId: `${slugify(shortTeamName(game.away_team))}-${slugify(shortTeamName(game.home_team))}`,
      role: {
        teamRole,
        pitcherRole: starter.starter_role || '',
        sourceRole: starter.source_name || '',
        confirmationStatus: starter.confirmation_status || '',
        projectionPitcher: true
      },
      canonicalSplits,
      lineupPressure: {
        topMatchupRows: topRows,
        averageMatchupScore: round(average(topRows.map((row) => row.matchupScore)), 1),
        averageStarterKernelScore: round(average(topRows.map((row) => row.starterKernelScore)), 1)
      },
      pitchMixProfile,
      dayNightProfile,
      homeAwayProfile,
      weatherProfile,
      repeatOpponentProfile,
      recentFormProfile,
      coverage,
      scoringPolicy: {
        mode: 'shadow',
        rule: 'SP1 materializes starter-collapse profile deltas from canonical split families. M2 reads it as context/ledger until promoted by backtest.'
      }
    },
    reasons,
    flags,
    fetchedAt
  }
}

const main = () => {
  const fetchedAt = new Date().toISOString()
  fs.mkdirSync(reportsRoot, { recursive: true })
  createTable()
  sqliteExec(`delete from mlb_starting_pitcher_profile_v1_daily where source_date = ${sqlQuote(date)} and model_version = ${sqlQuote(MODEL_VERSION)}`)

  const board = currentDayBoardForDate(date)
  const context = loadContext()
  const profiles = []
  const warnings = []

  for (const game of board.games) {
    const awayStarter = (game.starters || []).find((starter) => starter.team_id === game.away_team_id)
    const homeStarter = (game.starters || []).find((starter) => starter.team_id === game.home_team_id)
    const awayLineup = game.lineups?.[game.away_team_id]?.slots || []
    const homeLineup = game.lineups?.[game.home_team_id]?.slots || []
    if (!awayStarter) warnings.push(`${game.game_id}:away-starter-missing`)
    if (!homeStarter) warnings.push(`${game.game_id}:home-starter-missing`)
    if (awayLineup.length < 9) warnings.push(`${game.game_id}:away-lineup-incomplete:${awayLineup.length}`)
    if (homeLineup.length < 9) warnings.push(`${game.game_id}:home-lineup-incomplete:${homeLineup.length}`)
    if (awayStarter) {
      profiles.push(buildProfileForStarter({
        game,
        starter: awayStarter,
        teamRole: 'away',
        opponentTeamId: game.home_team_id,
        opponentName: game.home_team,
        opponentLineup: homeLineup,
        context,
        fetchedAt
      }))
    }
    if (homeStarter) {
      profiles.push(buildProfileForStarter({
        game,
        starter: homeStarter,
        teamRole: 'home',
        opponentTeamId: game.away_team_id,
        opponentName: game.away_team,
        opponentLineup: awayLineup,
        context,
        fetchedAt
      }))
    }
  }

  if (profiles.length) {
    sqliteExec(`begin transaction;\n${profiles.map(insertProfileSql).join('\n')}\ncommit;`)
  }

  const sourceStatus = profiles.length ? 'success' : 'missing'
  const expectedProfiles = board.games.length * 2
  const report = {
    build: 'mlb-starter-profile-addendum',
    modelVersion: MODEL_VERSION,
    date,
    generatedAt: new Date().toISOString(),
    expectedProfiles,
    insertedProfiles: profiles.length,
    sourceStatus,
    warnings,
    byGame: profiles.reduce((acc, profile) => {
      if (!acc[profile.gameId]) acc[profile.gameId] = []
      acc[profile.gameId].push({
        teamRole: profile.teamRole,
        teamName: profile.teamName,
        pitcherName: profile.pitcherName,
        collapseRiskScore: profile.collapseRiskScore,
        starterProfileScore: profile.starterProfileScore,
        handednessFragilityScore: profile.handednessFragilityScore,
        weatherFragilityScore: profile.weatherFragilityScore,
        pitchMixFitScore: profile.pitchMixFitScore,
        confidenceScore: profile.confidenceScore,
        flags: profile.flags
      })
      return acc
    }, {})
  }
  const reportPath = path.join(reportsRoot, `build_mlb_sp1_${date}.json`)
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`)
  writeMlbSourceStatus({
    dbPath,
    sourceName: 'mlb_sp1_starter_profile',
    sourceFamily: 'starter-profile',
    sourceDate: date,
    runReason: 'daily-starter-profile-addendum-build',
    requestedUrl: 'local:mlb_player_split_family_snapshots+lineup_matchup_snapshots+ENV1',
    cacheStatus: 'generated',
    cacheTtlHours: 12,
    status: sourceStatus,
    completenessStatus: profiles.length >= expectedProfiles ? 'complete' : 'partial',
    expectedItemCount: expectedProfiles,
    actualItemCount: profiles.length,
    missingItemCount: Math.max(expectedProfiles - profiles.length, 0),
    unresolvedCount: Math.max(expectedProfiles - profiles.length, 0),
    startedAt: fetchedAt,
    finishedAt: new Date().toISOString(),
    notes: report
  })
  console.log(`[build-mlb-sp1] inserted ${profiles.length}/${expectedProfiles} starter profiles`)
  console.log(`[build-mlb-sp1] report=${path.relative(rootDir, reportPath)}`)
}

main()
