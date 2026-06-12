import fs from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

import { parkContextByHomeTeam } from '../web/src/lib/mlb-park-context.js'
import {
  avg,
  canonicalTeamName,
  clamp,
  collectGamesForDate,
  getArg,
  matchupKey,
  mlbDbPath,
  normalizePerson,
  normalizeTeam,
  officialToShortTeam,
  rootDir,
  round,
  shortTeamName,
  sqlQuote,
  sqliteExec,
  sqliteJson
} from './lib/mlb-model-utils.mjs'

export const modelId = 'MLB-ENV1'
export const modelVersion = 'MLB-ENV1.2026-06-12.v1'
const date = getArg('--date', new Date().toISOString().slice(0, 10))
const dbPath = getArg('--db', mlbDbPath)
const outPath = getArg(
  '--out',
  path.join(rootDir, 'data-private/warehouse/mlb/environment-adjustments', `${date}.json`)
)

const toNumber = (value, fallback = null) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

const indexBy = (rows, keyFn) =>
  rows.reduce((acc, row) => {
    acc.set(keyFn(row), row)
    return acc
  }, new Map())

const buildWeatherIndex = (targetDate, targetDbPath) => {
  const rows = sqliteJson(`
select *
from mlb_fic_weather_daily
where source_date = ${sqlQuote(targetDate)}
order by game_time_et, matchup;
`, targetDbPath)
  return indexBy(rows, (row) => matchupKey(row.away_team, row.home_team))
}

const buildUmpireAssignmentIndex = (targetDate, targetDbPath) => {
  const rows = sqliteJson(`
select *
from mlb_umpire_assignments_daily
where source_date = ${sqlQuote(targetDate)}
order by
  case when date_match_status = 'exact' then 0 else 1 end,
  game_time_et,
  matchup;
`, targetDbPath)
  const byKey = new Map()
  rows.forEach((row) => {
    const key = matchupKey(row.away_team, row.home_team)
    if (!byKey.has(key)) byKey.set(key, [])
    byKey.get(key).push(row)
  })
  return byKey
}

const loadFicUmpireProfiles = (targetDate, targetDbPath) => {
  const rows = sqliteJson(`
select *
from mlb_fic_umpire_factors_daily
where source_date = ${sqlQuote(targetDate)}
order by umpire_name;
`, targetDbPath)
  const league = {
    avgTotalScore: avg(rows.map((row) => row.total_score_per_game)),
    avgStrikeouts: avg(rows.map((row) => row.strikeouts_per_game)),
    avgWalks: avg(rows.map((row) => row.walks_per_game)),
    avgOps: avg(rows.map((row) => row.ops))
  }
  return {
    rows,
    league,
    byKey: indexBy(rows, (row) => normalizePerson(row.umpire_name))
  }
}

const parkForHomeTeam = (homeTeam) => {
  const shortName = shortTeamName(canonicalTeamName(homeTeam))
  return parkContextByHomeTeam[shortName] || {
    venueName: '',
    indexRuns: 100,
    indexHr: 100,
    indexWoba: 100,
    yearRange: 'missing-neutral'
  }
}

const parkDelta = (park) => {
  const runIndex = toNumber(park.indexRuns, 100)
  const hrIndex = toNumber(park.indexHr, 100)
  return {
    parkRunDelta: clamp((runIndex - 100) * 0.04, -0.65, 0.65),
    parkHrDelta: clamp((hrIndex - 100) * 0.012, -0.45, 0.45)
  }
}

const weatherDelta = (weather) => {
  if (!weather) {
    return {
      weatherRunDelta: 0,
      weatherHrDelta: 0,
      signal: 'missing',
      reason: 'No FIC weather row captured for this game.'
    }
  }
  const effectiveHrForce = toNumber(weather.effective_hr_force, null)
  const signal = weather.hr_force_run_signal || 'unknown'
  if (signal === 'higher_runs' && Number.isFinite(effectiveHrForce)) {
    return {
      weatherRunDelta: clamp((effectiveHrForce - 1.0) * 0.58, 0.18, 0.85),
      weatherHrDelta: clamp((effectiveHrForce - 1.0) * 0.24, 0.08, 0.45),
      signal,
      reason: weather.hr_force_run_signal_reason || 'FIC HRForce points higher.'
    }
  }
  if (signal === 'lower_runs_dome_na') {
    return {
      weatherRunDelta: -0.08,
      weatherHrDelta: -0.04,
      signal,
      reason: weather.hr_force_run_signal_reason || 'Dome/no-weather-impact lowers weather carry.'
    }
  }
  if (signal === 'lower_runs' && Number.isFinite(effectiveHrForce)) {
    return {
      weatherRunDelta: -clamp((1.4 - effectiveHrForce) * 0.22, 0.05, 0.32),
      weatherHrDelta: -clamp((1.4 - effectiveHrForce) * 0.09, 0.02, 0.16),
      signal,
      reason: weather.hr_force_run_signal_reason || 'FIC HRForce is below the 1.4 higher-run threshold.'
    }
  }
  return {
    weatherRunDelta: 0,
    weatherHrDelta: 0,
    signal,
    reason: weather.hr_force_run_signal_reason || 'Weather/HRForce signal is unknown.'
  }
}

const exactUmpireAssignment = (assignments = []) =>
  assignments.find((row) => row.date_match_status === 'exact' && row.game_pk !== null && row.game_pk !== undefined) || null

const umpireDelta = ({ assignment, ficProfiles }) => {
  if (!assignment) {
    return {
      umpireRunsDelta: 0,
      umpireKDelta: 0,
      umpireWalkDelta: 0,
      assignmentStatus: 'missing_or_unresolved',
      profile: null,
      reason: 'No exact home-plate umpire assignment; model records zero umpire adjustment.'
    }
  }
  const profile = ficProfiles.byKey.get(normalizePerson(assignment.umpire_name)) || null
  const zoneFactor = toNumber(assignment.zone_factor, null)
  const kPerGame = toNumber(assignment.k_per_game, null)
  const bbPerGame = toNumber(assignment.bb_per_game, null)
  const profileTotal = toNumber(profile?.total_score_per_game, null)
  const profileStrikeouts = toNumber(profile?.strikeouts_per_game, null)
  const profileWalks = toNumber(profile?.walks_per_game, null)
  const profileOps = toNumber(profile?.ops, null)
  const leagueTotal = toNumber(ficProfiles.league.avgTotalScore, 8.8)
  const leagueK = toNumber(ficProfiles.league.avgStrikeouts, 16.5)
  const leagueWalks = toNumber(ficProfiles.league.avgWalks, 6.5)
  const leagueOps = toNumber(ficProfiles.league.avgOps, 0.72)

  let runsDelta = 0
  let kDelta = 0
  let walkDelta = 0
  const reasons = []

  if (Number.isFinite(profileTotal)) {
    runsDelta += clamp((profileTotal - leagueTotal) * 0.16, -0.45, 0.45)
    reasons.push(`FIC umpire total ${round(profileTotal, 1)} vs profile avg ${round(leagueTotal, 1)}.`)
  }
  if (profile?.favors_code === 'hitters') {
    runsDelta += 0.12
    reasons.push('FIC classifies umpire as hitter-friendly.')
  } else if (profile?.favors_code === 'pitchers') {
    runsDelta -= 0.12
    reasons.push('FIC classifies umpire as pitcher-friendly.')
  }
  if (Number.isFinite(profileOps)) {
    runsDelta += clamp((profileOps - leagueOps) * 1.5, -0.16, 0.16)
  }
  if (Number.isFinite(zoneFactor)) {
    runsDelta += clamp((1 - zoneFactor) * 0.55, -0.28, 0.28)
    kDelta += clamp((zoneFactor - 1) * 2.4, -0.8, 0.8)
    walkDelta += clamp((1 - zoneFactor) * 1.1, -0.4, 0.4)
    reasons.push(`TheCapper zone factor ${round(zoneFactor, 2)}.`)
  }
  if (Number.isFinite(kPerGame)) kDelta += clamp((kPerGame - 17) * 0.08, -0.65, 0.65)
  if (Number.isFinite(bbPerGame)) {
    runsDelta += clamp((bbPerGame - 6.5) * 0.03, -0.2, 0.2)
    walkDelta += clamp((bbPerGame - 6.5) * 0.08, -0.55, 0.55)
  }
  if (Number.isFinite(profileStrikeouts)) kDelta += clamp((profileStrikeouts - leagueK) * 0.05, -0.5, 0.5)
  if (Number.isFinite(profileWalks)) walkDelta += clamp((profileWalks - leagueWalks) * 0.05, -0.35, 0.35)

  return {
    umpireRunsDelta: clamp(runsDelta, -0.65, 0.65),
    umpireKDelta: clamp(kDelta, -1.2, 1.2),
    umpireWalkDelta: clamp(walkDelta, -0.8, 0.8),
    assignmentStatus: assignment.date_match_status || 'exact',
    profile,
    reason: reasons.join(' ') || 'Exact assignment found, but no directional umpire metrics were available.'
  }
}

const signalFor = (delta) => {
  if (delta >= 0.65) return 'strong_higher_run_environment'
  if (delta >= 0.25) return 'higher_run_environment'
  if (delta <= -0.45) return 'suppressing_run_environment'
  if (delta <= -0.18) return 'lower_run_environment'
  return 'neutral_run_environment'
}

const confidenceFor = ({ weather, park, assignment, profile, game }) =>
  clamp(
    20 +
      (game?.gamePk ? 10 : 0) +
      (park?.yearRange && park.yearRange !== 'missing-neutral' ? 20 : 8) +
      (weather ? 25 : 0) +
      (assignment ? 12 : 0) +
      (profile ? 8 : 0),
    0,
    95
  )

const createTable = (targetDate, targetDbPath) => {
  sqliteExec(`
create table if not exists mlb_game_environment_adjustments_daily (
  source_date text not null,
  model_version text not null,
  matchup_key text not null,
  game_pk integer,
  away_team text,
  home_team text,
  venue_name text,
  park_year_range text,
  park_run_index real,
  park_hr_index real,
  park_woba_index real,
  weather_match_status text,
  hr_force real,
  effective_hr_force real,
  hr_force_run_signal text,
  weather_run_delta real,
  weather_hr_delta real,
  park_run_delta real,
  park_hr_delta real,
  umpire_name text,
  umpire_assignment_status text,
  umpire_favors_code text,
  umpire_total_score_per_game real,
  umpire_zone_factor real,
  umpire_runs_delta real,
  umpire_k_delta real,
  umpire_walk_delta real,
  expected_total_runs_delta real,
  expected_hr_delta real,
  expected_k_delta real,
  expected_walk_delta real,
  run_environment_signal text,
  confidence_score real,
  source_flags_json text,
  reasons_json text,
  feature_snapshot_json text,
  generated_at text,
  primary key (source_date, matchup_key, model_version)
);
create index if not exists idx_mlb_env_adj_date_game on mlb_game_environment_adjustments_daily(source_date, game_pk);
delete from mlb_game_environment_adjustments_daily
where source_date = ${sqlQuote(targetDate)}
  and model_version = ${sqlQuote(modelVersion)};
`, targetDbPath)
}

const insertRows = (rows, targetDbPath) => {
  if (!rows.length) return
  const values = rows.map((row) => `(
    ${sqlQuote(row.sourceDate)}, ${sqlQuote(row.modelVersion)}, ${sqlQuote(row.matchupKey)}, ${sqlQuote(row.gamePk)},
    ${sqlQuote(row.awayTeam)}, ${sqlQuote(row.homeTeam)}, ${sqlQuote(row.venueName)}, ${sqlQuote(row.parkYearRange)},
    ${sqlQuote(row.parkRunIndex)}, ${sqlQuote(row.parkHrIndex)}, ${sqlQuote(row.parkWobaIndex)},
    ${sqlQuote(row.weatherMatchStatus)}, ${sqlQuote(row.hrForce)}, ${sqlQuote(row.effectiveHrForce)},
    ${sqlQuote(row.hrForceRunSignal)}, ${sqlQuote(row.weatherRunDelta)}, ${sqlQuote(row.weatherHrDelta)},
    ${sqlQuote(row.parkRunDelta)}, ${sqlQuote(row.parkHrDelta)}, ${sqlQuote(row.umpireName)},
    ${sqlQuote(row.umpireAssignmentStatus)}, ${sqlQuote(row.umpireFavorsCode)}, ${sqlQuote(row.umpireTotalScorePerGame)},
    ${sqlQuote(row.umpireZoneFactor)}, ${sqlQuote(row.umpireRunsDelta)}, ${sqlQuote(row.umpireKDelta)},
    ${sqlQuote(row.umpireWalkDelta)}, ${sqlQuote(row.expectedTotalRunsDelta)}, ${sqlQuote(row.expectedHrDelta)},
    ${sqlQuote(row.expectedKDelta)}, ${sqlQuote(row.expectedWalkDelta)}, ${sqlQuote(row.runEnvironmentSignal)},
    ${sqlQuote(row.confidenceScore)}, ${sqlQuote(JSON.stringify(row.sourceFlags))}, ${sqlQuote(JSON.stringify(row.reasons))},
    ${sqlQuote(JSON.stringify(row.featureSnapshot))}, ${sqlQuote(row.generatedAt)}
  )`).join(',\n')

  sqliteExec(`
insert or replace into mlb_game_environment_adjustments_daily (
  source_date, model_version, matchup_key, game_pk, away_team, home_team, venue_name, park_year_range,
  park_run_index, park_hr_index, park_woba_index, weather_match_status, hr_force, effective_hr_force,
  hr_force_run_signal, weather_run_delta, weather_hr_delta, park_run_delta, park_hr_delta, umpire_name,
  umpire_assignment_status, umpire_favors_code, umpire_total_score_per_game, umpire_zone_factor,
  umpire_runs_delta, umpire_k_delta, umpire_walk_delta, expected_total_runs_delta, expected_hr_delta,
  expected_k_delta, expected_walk_delta, run_environment_signal, confidence_score, source_flags_json,
  reasons_json, feature_snapshot_json, generated_at
) values ${values};
`, targetDbPath)
}

export const buildEnvironmentRows = ({ date: targetDate = date, dbPath: targetDbPath = dbPath } = {}) => {
  const generatedAt = new Date().toISOString()
  const games = collectGamesForDate(targetDate, targetDbPath)
  const weatherByKey = buildWeatherIndex(targetDate, targetDbPath)
  const umpireAssignmentsByKey = buildUmpireAssignmentIndex(targetDate, targetDbPath)
  const ficProfiles = loadFicUmpireProfiles(targetDate, targetDbPath)

  return games.map((game) => {
    const key = matchupKey(game.awayTeam, game.homeTeam)
    const park = parkForHomeTeam(game.homeTeam)
    const weather = weatherByKey.get(key) || null
    const assignments = umpireAssignmentsByKey.get(key) || []
    const assignment = exactUmpireAssignment(assignments)
    const parkParts = parkDelta(park)
    const weatherParts = weatherDelta(weather)
    const umpireParts = umpireDelta({ assignment, ficProfiles })
    const expectedTotalRunsDelta = clamp(
      parkParts.parkRunDelta + weatherParts.weatherRunDelta + umpireParts.umpireRunsDelta,
      -1.4,
      1.6
    )
    const expectedHrDelta = clamp(parkParts.parkHrDelta + weatherParts.weatherHrDelta, -0.75, 0.9)
    const confidenceScore = confidenceFor({ weather, park, assignment, profile: umpireParts.profile, game })
    const sourceFlags = {
      gameSource: game.source,
      hasMlbGamePk: Boolean(game.gamePk),
      hasParkContext: Boolean(park?.yearRange && park.yearRange !== 'missing-neutral'),
      hasFicWeather: Boolean(weather),
      hasExactUmpireAssignment: Boolean(assignment),
      hasFicUmpireProfile: Boolean(umpireParts.profile),
      unresolvedUmpireRows: assignments.filter((row) => row.date_match_status !== 'exact').length
    }
    const reasons = [
      `${park.venueName || shortTeamName(game.homeTeam)} park runs ${park.indexRuns || 100}, HR ${park.indexHr || 100}.`,
      weatherParts.reason,
      umpireParts.reason
    ].filter(Boolean)
    const featureSnapshot = {
      park,
      weather: weather ? {
        hrForce: weather.hr_force,
        effectiveHrForce: weather.effective_hr_force,
        hrForceRunSignal: weather.hr_force_run_signal,
        roofStatus: weather.roof_status,
        gameTimeEt: weather.game_time_et,
        dateMatchStatus: weather.date_match_status
      } : null,
      umpireAssignment: assignment ? {
        umpireName: assignment.umpire_name,
        dateMatchStatus: assignment.date_match_status,
        zoneFactor: assignment.zone_factor,
        kPerGame: assignment.k_per_game,
        bbPerGame: assignment.bb_per_game,
        nrfiPct: assignment.nrfi_pct
      } : null,
      umpireProfile: umpireParts.profile
    }

    return {
      sourceDate: targetDate,
      modelId,
      modelVersion,
      matchupKey: key,
      gamePk: game.gamePk ?? weather?.game_pk ?? assignment?.game_pk ?? null,
      awayTeam: canonicalTeamName(game.awayTeam),
      homeTeam: canonicalTeamName(game.homeTeam),
      venueName: park.venueName || '',
      parkYearRange: park.yearRange || '',
      parkRunIndex: toNumber(park.indexRuns, 100),
      parkHrIndex: toNumber(park.indexHr, 100),
      parkWobaIndex: toNumber(park.indexWoba, 100),
      weatherMatchStatus: weather?.date_match_status || 'missing',
      hrForce: toNumber(weather?.hr_force, null),
      effectiveHrForce: toNumber(weather?.effective_hr_force, null),
      hrForceRunSignal: weather?.hr_force_run_signal || 'missing',
      weatherRunDelta: round(weatherParts.weatherRunDelta, 3),
      weatherHrDelta: round(weatherParts.weatherHrDelta, 3),
      parkRunDelta: round(parkParts.parkRunDelta, 3),
      parkHrDelta: round(parkParts.parkHrDelta, 3),
      umpireName: assignment?.umpire_name || null,
      umpireAssignmentStatus: umpireParts.assignmentStatus,
      umpireFavorsCode: umpireParts.profile?.favors_code || null,
      umpireTotalScorePerGame: toNumber(umpireParts.profile?.total_score_per_game, null),
      umpireZoneFactor: toNumber(assignment?.zone_factor, null),
      umpireRunsDelta: round(umpireParts.umpireRunsDelta, 3),
      umpireKDelta: round(umpireParts.umpireKDelta, 3),
      umpireWalkDelta: round(umpireParts.umpireWalkDelta, 3),
      expectedTotalRunsDelta: round(expectedTotalRunsDelta, 3),
      expectedHrDelta: round(expectedHrDelta, 3),
      expectedKDelta: round(umpireParts.umpireKDelta, 3),
      expectedWalkDelta: round(umpireParts.umpireWalkDelta, 3),
      runEnvironmentSignal: signalFor(expectedTotalRunsDelta),
      confidenceScore: round(confidenceScore, 1),
      sourceFlags,
      reasons,
      featureSnapshot,
      generatedAt
    }
  })
}

const summarize = (rows) => ({
  games: rows.length,
  withGamePk: rows.filter((row) => row.gamePk).length,
  withFicWeather: rows.filter((row) => row.sourceFlags.hasFicWeather).length,
  withExactUmpire: rows.filter((row) => row.sourceFlags.hasExactUmpireAssignment).length,
  higherRunSignals: rows.filter((row) => row.expectedTotalRunsDelta >= 0.25).length,
  lowerRunSignals: rows.filter((row) => row.expectedTotalRunsDelta <= -0.18).length,
  avgExpectedTotalRunsDelta: round(avg(rows.map((row) => row.expectedTotalRunsDelta)), 3),
  maxExpectedTotalRunsDelta: round(Math.max(...rows.map((row) => row.expectedTotalRunsDelta)), 3),
  minExpectedTotalRunsDelta: round(Math.min(...rows.map((row) => row.expectedTotalRunsDelta)), 3)
})

export const writeEnvironmentArtifact = async ({ date: targetDate = date, dbPath: targetDbPath = dbPath, outPath: targetOutPath = outPath } = {}) => {
  createTable(targetDate, targetDbPath)
  const rows = buildEnvironmentRows({ date: targetDate, dbPath: targetDbPath })
  insertRows(rows, targetDbPath)

  const artifact = {
    schemaVersion: 1,
    modelId,
    modelVersion,
    generatedAt: new Date().toISOString(),
    date: targetDate,
    dbPath: path.relative(rootDir, targetDbPath),
    table: 'mlb_game_environment_adjustments_daily',
    summary: summarize(rows),
    rows
  }
  await fs.mkdir(path.dirname(targetOutPath), { recursive: true })
  await fs.writeFile(targetOutPath, `${JSON.stringify(artifact, null, 2)}\n`)
  return artifact
}

const main = async () => {
  const artifact = await writeEnvironmentArtifact({ date, dbPath, outPath })
  console.log(JSON.stringify({
    status: 'ok',
    modelId,
    modelVersion,
    date,
    table: artifact.table,
    outPath: path.relative(rootDir, outPath),
    summary: artifact.summary
  }, null, 2))
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error.message || error)
    process.exitCode = 1
  })
}
