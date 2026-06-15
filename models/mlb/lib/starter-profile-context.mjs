import { querySqlite } from '../db/sqlite.mjs'

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

const parseJson = (value, fallback = null) => {
  if (!value) return fallback
  try {
    return JSON.parse(value)
  } catch {
    return fallback
  }
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

const queryOptional = (sql, params = [], options = {}) => {
  try {
    return querySqlite(sql, params, options)
  } catch (error) {
    if (/no such table/i.test(error.message || '')) return []
    throw error
  }
}

export const starterProfileContextFromRow = (row = {}) => {
  if (!row) return null
  const featureSnapshot = parseJson(row.feature_snapshot_json, {}) || {}
  const reasons = parseJson(row.reasons_json, []) || []
  const flags = parseJson(row.flags_json, []) || []
  return {
    source: 'MLB-SP1',
    modelVersion: row.model_version || '',
    sourceDate: row.source_date || '',
    sourceStatus: row.source_status || '',
    gameId: row.game_id || '',
    gamePk: num(row.game_pk, null),
    matchupKey: row.matchup_key || '',
    teamRole: row.team_role || '',
    teamName: row.team_name || '',
    opponentTeam: row.opponent_name || '',
    pitcherId: row.pitcher_id || '',
    mlbPlayerId: num(row.mlb_player_id, null),
    pitcherName: row.pitcher_name || '',
    pitcherThrows: row.pitcher_throws || '',
    pitcherRole: row.pitcher_role || '',
    sourceRole: row.source_role || '',
    roleLabel: row.role_label || '',
    projectionPitcher: Boolean(num(row.projection_pitcher_flag, 0)),
    scores: {
      starterProfile: round(row.starter_profile_score, 1),
      runPrevention: round(row.run_prevention_score, 1),
      contactSuppression: round(row.contact_suppression_score, 1),
      damageSuppression: round(row.damage_suppression_score, 1),
      command: round(row.command_score, 1),
      swingMiss: round(row.swing_miss_score, 1),
      leash: round(row.leash_score, 1),
      firstInningRisk: round(row.first_inning_risk_score, 1),
      repeatOpponentTax: round(row.repeat_opponent_tax_score, 1),
      weatherFragility: round(row.weather_fragility_score, 1),
      handednessFragility: round(row.handedness_fragility_score, 1),
      pitchMixFit: round(row.pitch_mix_fit_score, 1),
      collapseRisk: round(row.collapse_risk_score, 1),
      confidence: round(row.confidence_score, 1)
    },
    expectedDeltas: {
      runsAllowed: round(row.expected_runs_allowed_delta, 2),
      hitsAllowed: round(row.expected_hits_allowed_delta, 2),
      hrAllowed: round(row.expected_hr_allowed_delta, 2),
      walks: round(row.expected_walk_delta, 2),
      strikeouts: round(row.expected_k_delta, 2),
      outs: round(row.expected_outs_delta, 2),
      yrfiProbabilityPct: round(row.yrfi_probability_delta, 2),
      nrfiRiskPct: round(row.nrfi_risk_delta, 2)
    },
    splitProfile: featureSnapshot.canonicalSplits || null,
    lineupPressure: featureSnapshot.lineupPressure || null,
    weatherProfile: featureSnapshot.weatherProfile || null,
    dayNightProfile: featureSnapshot.dayNightProfile || null,
    homeAwayProfile: featureSnapshot.homeAwayProfile || null,
    repeatOpponentProfile: featureSnapshot.repeatOpponentProfile || null,
    pitchMixProfile: featureSnapshot.pitchMixProfile || null,
    recentFormProfile: featureSnapshot.recentFormProfile || null,
    coverage: featureSnapshot.coverage || null,
    featureSnapshot,
    reasons,
    flags,
    fetchedAt: row.fetched_at || row.generated_at || ''
  }
}

export const loadMlbStarterProfileContextsFromDb = (date) => {
  const rows = queryOptional(
    `
    select *
    from mlb_starting_pitcher_profile_v1_daily
    where source_date = ?
      and model_version = (
        select max(model_version)
        from mlb_starting_pitcher_profile_v1_daily
        where source_date = ?
      )
    order by game_pk, game_id, team_role
    `,
    [date, date],
    { maxBuffer: 1024 * 1024 * 30 }
  )

  const byGamePk = {}
  const byGameId = {}

  for (const row of rows) {
    const context = starterProfileContextFromRow(row)
    if (!context) continue
    const side = row.team_role === 'home' ? 'home' : 'away'
    const publicId = `${slugify(row.away_team || '')}-${slugify(row.home_team || '')}`
    const shortPublicId = `${slugify(shortTeamName(row.away_team || ''))}-${slugify(shortTeamName(row.home_team || ''))}`
    const snapshotPublicId = context.featureSnapshot?.publicGameId || ''
    const keys = [
      row.game_id,
      publicId,
      shortPublicId,
      snapshotPublicId,
      row.matchup_key,
      `${normalizeTeam(row.away_team)}|${normalizeTeam(row.home_team)}`
    ].filter(Boolean)

    if (Number.isFinite(num(row.game_pk, null))) {
      const key = String(num(row.game_pk))
      byGamePk[key] = byGamePk[key] || {}
      byGamePk[key][side] = context
    }

    for (const key of keys) {
      byGameId[key] = byGameId[key] || {}
      byGameId[key][side] = context
    }
  }

  return {
    rows: rows.map(starterProfileContextFromRow).filter(Boolean),
    byGamePk,
    byGameId
  }
}
