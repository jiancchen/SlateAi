import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

import {
  avg,
  canonicalTeamName,
  clamp,
  collectGamesForDate,
  getArg,
  mlbDbPath,
  normalizePerson,
  normalizeTeam,
  rootDir,
  round,
  shortTeamName,
  sqlQuote,
  sqliteExec,
  sqliteJson
} from './lib/mlb-model-utils.mjs'
import { writeMlbSourceStatus } from './lib/mlb-source-status.mjs'

export const modelId = 'MLB-RP2'
export const modelVersion = 'MLB-RP2.2026-06-12.v3'

const FIRST_UP_HISTORY_DAYS = 60
const PITCHER_SPLIT_HISTORY_DAYS = 365
const MODERATE_REST_PITCHES = 20
const HEAVY_REST_PITCHES = 30
const EXTREME_REST_PITCHES = 40
const MIN_SPLIT_PA_PER_SIDE = 8
const MIN_LINEUP_BATTERS = 7
const LINEUP_MATCHUP_MAX_BOOST = 2.2
const LINEUP_MATCHUP_MAX_PENALTY = 1.4

const toNumber = (value, fallback = null) => {
  if (value === null || value === undefined || value === '') return fallback
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

const toInt = (value, fallback = null) => {
  if (value === null || value === undefined || value === '') return fallback
  const parsed = Number(value)
  return Number.isFinite(parsed) ? Math.trunc(parsed) : fallback
}

const daysBetween = (laterDate, earlierDate) => {
  const later = Date.parse(`${laterDate}T12:00:00Z`)
  const earlier = Date.parse(`${earlierDate}T12:00:00Z`)
  if (!Number.isFinite(later) || !Number.isFinite(earlier)) return null
  return Math.round((later - earlier) / 86400000)
}

const groupBy = (rows, keyFn) =>
  rows.reduce((acc, row) => {
    const key = keyFn(row)
    if (!acc.has(key)) acc.set(key, [])
    acc.get(key).push(row)
    return acc
  }, new Map())

const indexBy = (rows, keyFn) =>
  rows.reduce((acc, row) => {
    acc.set(keyFn(row), row)
    return acc
  }, new Map())

const teamSidesForDate = (date, dbPath) => {
  const games = collectGamesForDate(date, dbPath)
  return games.flatMap((game) => [
    {
      sourceDate: date,
      gamePk: game.gamePk,
      gameDate: game.gameDate,
      teamName: canonicalTeamName(game.awayTeam),
      opponentName: canonicalTeamName(game.homeTeam),
      teamSide: 'away',
      gameSource: game.source
    },
    {
      sourceDate: date,
      gamePk: game.gamePk,
      gameDate: game.gameDate,
      teamName: canonicalTeamName(game.homeTeam),
      opponentName: canonicalTeamName(game.awayTeam),
      teamSide: 'home',
      gameSource: game.source
    }
  ])
}

const loadLegacyBullpenUsage = (date, dbPath) =>
  sqliteJson(`
select *
from mlb_bullpen_usage
where as_of_date = ${sqlQuote(date)}
order by team_name, cast(first_reliever_likelihood as real) desc, cast(availability_score as real) desc;
`, dbPath)

const loadLegacyShape = (date, dbPath) =>
  sqliteJson(`
select *
from mlb_team_bullpen_shape_daily
where as_of_date = ${sqlQuote(date)};
`, dbPath)

const loadFgRankings = (date, dbPath) =>
  sqliteJson(`
select *
from mlb_fangraphs_team_rp_rankings_daily
where source_date = ${sqlQuote(date)};
`, dbPath)

const loadFgDepth = (date, dbPath) =>
  sqliteJson(`
select *
from mlb_fangraphs_bullpen_depth_daily
where source_date = ${sqlQuote(date)}
order by team_name, role, player_name;
`, dbPath)

const loadFgUsage = (date, dbPath) =>
  sqliteJson(`
select *
from mlb_fangraphs_bullpen_usage_daily
where source_date = ${sqlQuote(date)}
order by team_name, player_key, usage_date;
`, dbPath)

const loadActualRecentTeamRelief = (date, dbPath) =>
  sqliteJson(`
with team_games as (
  select
    game_date,
    game_pk,
    team_name,
    sum(cast(outs_recorded as real)) as relief_outs,
    sum(cast(runs_allowed as real)) as relief_runs,
    count(*) as relievers_used
  from mlb_pitcher_appearances
  where pitcher_role = 'reliever'
    and game_date < ${sqlQuote(date)}
  group by game_date, game_pk, team_name
),
ranked as (
  select
    *,
    row_number() over (partition by team_name order by game_date desc, game_pk desc) as recent_rank
  from team_games
)
select
  team_name,
  avg(case when recent_rank <= 5 then relief_runs end) as relief_runs_avg_last5,
  avg(case when recent_rank <= 10 then relief_runs end) as relief_runs_avg_last10,
  avg(case when recent_rank <= 5 then relief_outs end) as relief_outs_avg_last5,
  avg(case when recent_rank <= 10 then relief_outs end) as relief_outs_avg_last10,
  avg(case when recent_rank <= 5 then relievers_used end) as relievers_used_avg_last5,
  avg(case when recent_rank <= 10 then relievers_used end) as relievers_used_avg_last10,
  count(*) as historical_team_games
from ranked
where recent_rank <= 10
group by team_name;
`, dbPath)

const loadPitcherAppearanceHistory = (date, dbPath) =>
  sqliteJson(`
select
  game_date,
  cast(game_pk as integer) as game_pk,
  team_name,
  cast(pitcher_id as integer) as pitcher_id,
  pitcher_name,
  pitcher_role,
  cast(entry_order as integer) as entry_order,
  cast(outs_recorded as real) as outs_recorded,
  cast(pitches_thrown as real) as pitches_thrown
from mlb_pitcher_appearances
where game_date < ${sqlQuote(date)}
  and game_date >= date(${sqlQuote(date)}, '-${FIRST_UP_HISTORY_DAYS} day')
  and pitcher_role in ('starter', 'reliever')
order by game_date, game_pk, team_name, cast(entry_order as integer), cast(pitcher_id as integer);
`, dbPath)

const loadCurrentStarters = (date, dbPath) =>
  sqliteJson(`
select
  g.game_date,
  cast(g.mlb_game_pk as integer) as game_pk,
  teams.name as team_name,
  cast(players.mlb_player_id as integer) as pitcher_id,
  players.name as pitcher_name,
  players.throws,
  sp.confirmation_status,
  sp.source_name
from starting_pitchers sp
join games g on g.game_id = sp.game_id
join teams on teams.team_id = sp.team_id
join players on players.player_id = sp.pitcher_id
where g.game_date = ${sqlQuote(date)}
order by g.start_time_utc, teams.name;
`, dbPath)

const loadStarterLeashProfiles = (date, dbPath) =>
  sqliteJson(`
select *
from mlb_starter_leash_profiles
where as_of_date < ${sqlQuote(date)}
  and as_of_date >= date(${sqlQuote(date)}, '-45 day')
order by as_of_date desc, cast(window_starts as integer) desc;
`, dbPath)

const loadStarterRollingForms = (date, dbPath) =>
  sqliteJson(`
select *
from mlb_starting_pitcher_rolling_form
where as_of_date < ${sqlQuote(date)}
  and as_of_date >= date(${sqlQuote(date)}, '-45 day')
order by as_of_date desc, cast(window_starts as integer) desc;
`, dbPath)

const loadLineupHandednessRows = (date, dbPath) =>
  sqliteJson(`
with latest_lineups as (
  select
    l.*,
    g.game_date,
    cast(g.mlb_game_pk as integer) as game_pk,
    teams.name as team_name,
    row_number() over (
      partition by l.game_id, l.team_id
      order by l.captured_at desc, l.lineup_id desc
    ) as latest_rank
  from lineups l
  join games g on g.game_id = l.game_id
  join teams on teams.team_id = l.team_id
  where g.game_date = ${sqlQuote(date)}
)
select
  game_date,
  game_pk,
  team_id,
  team_name,
  lineup_status,
  captured_at,
  cast(lineup_slots.batting_order as integer) as batting_order,
  players.name as player_name,
  players.bats
from latest_lineups
join lineup_slots on lineup_slots.lineup_id = latest_lineups.lineup_id
join players on players.player_id = lineup_slots.player_id
where latest_rank = 1
order by game_pk, team_name, cast(lineup_slots.batting_order as integer);
`, dbPath)

const loadPitcherBatterSideSplitRows = (date, dbPath) =>
  sqliteJson(`
select
  g.game_date,
  pitcher_players.player_id as pitcher_player_id,
  cast(pitcher_players.mlb_player_id as integer) as pitcher_id,
  pitcher_players.name as pitcher_name,
  pitcher_players.throws as pitcher_throws,
  batter_players.bats as batter_side,
  count(*) as plate_appearances,
  sum(case when plate_appearances.event_type in ('single', 'double', 'triple', 'home_run') then 1 else 0 end) as hits,
  sum(case
    when plate_appearances.event_type = 'single' then 1
    when plate_appearances.event_type = 'double' then 2
    when plate_appearances.event_type = 'triple' then 3
    when plate_appearances.event_type = 'home_run' then 4
    else 0
  end) as total_bases,
  sum(case when plate_appearances.event_type = 'home_run' then 1 else 0 end) as home_runs,
  sum(case when plate_appearances.event_type in ('walk', 'intent_walk') then 1 else 0 end) as walks,
  sum(case when plate_appearances.event_type = 'hit_by_pitch' then 1 else 0 end) as hit_by_pitch
from plate_appearances
join games g on g.game_id = plate_appearances.game_id
join players pitcher_players on pitcher_players.player_id = plate_appearances.pitcher_id
join players batter_players on batter_players.player_id = plate_appearances.batter_id
where g.game_date < ${sqlQuote(date)}
  and g.game_date >= date(${sqlQuote(date)}, '-${PITCHER_SPLIT_HISTORY_DAYS} day')
  and coalesce(batter_players.bats, '') in ('R', 'L')
group by
  g.game_date,
  pitcher_players.player_id,
  pitcher_players.mlb_player_id,
  pitcher_players.name,
  pitcher_players.throws,
  batter_players.bats
order by g.game_date, pitcher_players.name, batter_players.bats;
`, dbPath)

const roleRank = (role) => {
  const key = String(role || '').toUpperCase()
  if (key === 'CL') return 1
  if (key === 'SU8') return 2
  if (key === 'SU7') return 3
  if (key.startsWith('SU')) return 4
  if (key === 'MID') return 5
  if (key === 'LR') return 7
  return 6
}

const firstUpRoleBase = (role) => {
  const key = String(role || '').toUpperCase()
  if (key === 'LR') return 48
  if (key === 'MID') return 55
  if (key.startsWith('SU')) return 44
  if (key === 'CL') return 24
  return 38
}

const roleExpectedOuts = (role) => {
  const key = String(role || '').toUpperCase()
  if (key === 'LR') return 4.6
  if (key === 'MID') return 3.4
  if (key.startsWith('SU')) return 3
  if (key === 'CL') return 3
  return 3.1
}

const highLeverageRole = (role) => {
  const key = String(role || '').toUpperCase()
  return key === 'CL' || key.startsWith('SU')
}

const normalizeHand = (value) => {
  const key = String(value || '').trim().toUpperCase()
  if (key.startsWith('R')) return 'R'
  if (key.startsWith('L')) return 'L'
  return null
}

const batterSideAgainstPitcher = (bats, pitcherThrows) => {
  const batSide = normalizeHand(bats)
  if (batSide) return batSide
  const switchHitter = String(bats || '').trim().toUpperCase().startsWith('S')
  const pitcherHand = normalizeHand(pitcherThrows)
  if (switchHitter && pitcherHand === 'R') return 'L'
  if (switchHitter && pitcherHand === 'L') return 'R'
  return null
}

const lineupContextAgainstPitcher = (lineup = null, pitcherThrows = null) => {
  const batters = lineup?.batters || []
  const counts = { R: 0, L: 0, unknown: 0 }
  batters.forEach((batter) => {
    const side = batterSideAgainstPitcher(batter.bats, pitcherThrows)
    if (side === 'R' || side === 'L') counts[side] += 1
    else counts.unknown += 1
  })
  const knownBatters = counts.R + counts.L
  const dominantSide =
    knownBatters < MIN_LINEUP_BATTERS || counts.R === counts.L
      ? null
      : counts.R > counts.L
        ? 'R'
        : 'L'
  const oppositeSide = dominantSide === 'R' ? 'L' : dominantSide === 'L' ? 'R' : null
  const dominantCount = dominantSide ? counts[dominantSide] : 0
  const oppositeCount = oppositeSide ? counts[oppositeSide] : 0
  return {
    status: lineup?.status || 'missing',
    opponentTeamName: lineup?.teamName || null,
    battersCount: batters.length,
    rightHandedBatters: counts.R,
    leftHandedBatters: counts.L,
    unknownBatters: counts.unknown,
    rawRightHandedBatters: lineup?.rawCounts?.R ?? null,
    rawLeftHandedBatters: lineup?.rawCounts?.L ?? null,
    rawSwitchHitters: lineup?.rawCounts?.S ?? null,
    dominantSide,
    dominantSideShare: knownBatters ? round(dominantCount / knownBatters, 3) : null,
    dominantSideEdge: dominantSide ? dominantCount - oppositeCount : 0
  }
}

const splitDamageAllowed = (side = {}) => {
  const pa = toNumber(side.plateAppearances, 0)
  if (!pa) return null
  const totalBases = toNumber(side.totalBases, 0)
  const walks = toNumber(side.walks, 0)
  const hitByPitch = toNumber(side.hitByPitch, 0)
  const homeRuns = toNumber(side.homeRuns, 0)
  return (totalBases + walks * 0.7 + hitByPitch * 0.7 + homeRuns * 0.35) / pa
}

const buildLineupContexts = (lineupRows = []) => {
  const grouped = groupBy(lineupRows, (row) => `${toInt(row.game_pk, null)}|${normalizeTeam(canonicalTeamName(row.team_name))}`)
  const byGameTeam = new Map()
  const byDateTeam = new Map()
  grouped.forEach((rows, key) => {
    const rawCounts = rows.reduce((acc, row) => {
      const key = String(row.bats || '').trim().toUpperCase() || 'unknown'
      if (key === 'R' || key === 'L' || key === 'S') acc[key] += 1
      else acc.unknown += 1
      return acc
    }, { R: 0, L: 0, S: 0, unknown: 0 })
    const context = {
      gamePk: toInt(rows[0]?.game_pk, null),
      gameDate: rows[0]?.game_date || null,
      teamName: canonicalTeamName(rows[0]?.team_name || ''),
      status: rows[0]?.lineup_status || 'unknown',
      capturedAt: rows[0]?.captured_at || null,
      rawCounts,
      batters: rows
        .sort((left, right) => toInt(left.batting_order, 99) - toInt(right.batting_order, 99))
        .map((row) => ({
          battingOrder: toInt(row.batting_order, null),
          playerName: row.player_name || null,
          bats: row.bats || null
        }))
    }
    byGameTeam.set(key, context)
    byDateTeam.set(`${context.gameDate}|${normalizeTeam(context.teamName)}`, context)
  })
  return { byGameTeam, byDateTeam }
}

const buildPitcherSplitProfiles = (rows = [], date) => {
  const earliest = Date.parse(`${date}T12:00:00Z`) - PITCHER_SPLIT_HISTORY_DAYS * 86400000
  const grouped = new Map()
  rows.forEach((row) => {
    const gameDate = Date.parse(`${row.game_date}T12:00:00Z`)
    if (row.game_date >= date || !Number.isFinite(gameDate) || gameDate < earliest) return
    const side = normalizeHand(row.batter_side)
    if (side !== 'R' && side !== 'L') return
    const pitcherId = toInt(row.pitcher_id, null)
    const key = pitcherId !== null ? `id:${pitcherId}` : `name:${normalizePerson(row.pitcher_name)}`
    if (!grouped.has(key)) {
      grouped.set(key, {
        pitcherId,
        pitcherName: row.pitcher_name || null,
        pitcherThrows: normalizeHand(row.pitcher_throws),
        sides: {
          R: { plateAppearances: 0, hits: 0, totalBases: 0, homeRuns: 0, walks: 0, hitByPitch: 0 },
          L: { plateAppearances: 0, hits: 0, totalBases: 0, homeRuns: 0, walks: 0, hitByPitch: 0 }
        }
      })
    }
    const split = grouped.get(key).sides[side]
    split.plateAppearances += toNumber(row.plate_appearances, 0) || 0
    split.hits += toNumber(row.hits, 0) || 0
    split.totalBases += toNumber(row.total_bases, 0) || 0
    split.homeRuns += toNumber(row.home_runs, 0) || 0
    split.walks += toNumber(row.walks, 0) || 0
    split.hitByPitch += toNumber(row.hit_by_pitch, 0) || 0
  })

  const profiles = []
  grouped.forEach((profile) => {
    const rightDamage = splitDamageAllowed(profile.sides.R)
    const leftDamage = splitDamageAllowed(profile.sides.L)
    const rightPa = profile.sides.R.plateAppearances
    const leftPa = profile.sides.L.plateAppearances
    const hasSplitSample = rightPa >= MIN_SPLIT_PA_PER_SIDE && leftPa >= MIN_SPLIT_PA_PER_SIDE
    const betterSide = !hasSplitSample || !Number.isFinite(rightDamage) || !Number.isFinite(leftDamage)
      ? null
      : rightDamage < leftDamage
        ? 'R'
        : leftDamage < rightDamage
          ? 'L'
          : null
    profiles.push({
      ...profile,
      rightDamageAllowed: Number.isFinite(rightDamage) ? round(rightDamage, 3) : null,
      leftDamageAllowed: Number.isFinite(leftDamage) ? round(leftDamage, 3) : null,
      splitEdge: hasSplitSample && Number.isFinite(rightDamage) && Number.isFinite(leftDamage)
        ? round(Math.abs(rightDamage - leftDamage), 3)
        : null,
      betterSide,
      hasSplitSample
    })
  })

  const byIdentity = new Map()
  profiles.forEach((profile) => {
    const row = { pitcherId: profile.pitcherId, pitcherName: profile.pitcherName }
    identityKeys(row).forEach((key) => byIdentity.set(key, profile))
  })
  return byIdentity
}

const identityKeys = (row = {}) => {
  const keys = []
  const numericId = toInt(row.pitcherId ?? row.pitcher_id, null)
  if (numericId !== null) keys.push(`id:${numericId}`)
  const name = normalizePerson(row.pitcherName || row.pitcher_name || row.player_name || '')
  if (name) keys.push(`name:${name}`)
  const key = normalizePerson(row.playerKey || row.player_key || '')
  if (key) keys.push(`key:${key}`)
  return keys
}

const firstIdentityKey = (row = {}) => identityKeys(row)[0] || null

const addByIdentity = (map, row, factory, update) => {
  const keys = identityKeys(row)
  if (!keys.length) return
  keys.forEach((key) => {
    if (!map.has(key)) map.set(key, factory())
    update(map.get(key))
  })
}

const lookupByIdentity = (map, row) => {
  for (const key of identityKeys(row)) {
    if (map.has(key)) return map.get(key)
  }
  return null
}

const gameKey = (row) => `${row.game_date}|${row.game_pk}|${normalizeTeam(canonicalTeamName(row.team_name))}`

const lineupMatchupAdjustment = (candidate, firstUpContext) => {
  const splitProfile = lookupByIdentity(firstUpContext?.pitcherSplitByIdentity || new Map(), candidate) || null
  const pitcherThrows = normalizeHand(candidate.throws || splitProfile?.pitcherThrows)
  const lineup = lineupContextAgainstPitcher(firstUpContext?.opponentLineup || null, pitcherThrows)
  const availability = toNumber(candidate.availabilityScore, 0)
  const freshnessMultiplier = availability >= 82 ? 1 : availability >= 72 ? 0.65 : 0

  const baseContext = {
    opponentTeamName: lineup.opponentTeamName,
    lineupStatus: lineup.status,
    pitcherThrows,
    battersCount: lineup.battersCount,
    rightHandedBatters: lineup.rightHandedBatters,
    leftHandedBatters: lineup.leftHandedBatters,
    rawRightHandedBatters: lineup.rawRightHandedBatters,
    rawLeftHandedBatters: lineup.rawLeftHandedBatters,
    rawSwitchHitters: lineup.rawSwitchHitters,
    dominantBatterSide: lineup.dominantSide,
    dominantBatterSideShare: lineup.dominantSideShare,
    dominantSideEdge: lineup.dominantSideEdge,
    pitcherBetterSide: splitProfile?.betterSide || null,
    pitcherSplitSample: splitProfile
      ? {
          rightPa: splitProfile.sides.R.plateAppearances,
          leftPa: splitProfile.sides.L.plateAppearances,
          rightDamageAllowed: splitProfile.rightDamageAllowed,
          leftDamageAllowed: splitProfile.leftDamageAllowed,
          splitEdge: splitProfile.splitEdge
        }
      : null,
    freshnessEligible: freshnessMultiplier > 0
  }

  if (!lineup.dominantSide) {
    return {
      adjustment: 0,
      context: {
        ...baseContext,
        reason: lineup.battersCount
          ? 'Opponent lineup has no clear handedness lean.'
          : 'Opponent lineup handedness is unavailable.'
      }
    }
  }
  if (!splitProfile?.hasSplitSample || !splitProfile.betterSide || !Number.isFinite(splitProfile.splitEdge)) {
    return {
      adjustment: 0,
      context: {
        ...baseContext,
        reason: 'Pitcher split sample is too thin for a handedness adjustment.'
      }
    }
  }
  if (!freshnessMultiplier) {
    return {
      adjustment: 0,
      context: {
        ...baseContext,
        reason: 'Pitcher is not fresh enough for lineup-fit to boost first-up likelihood.'
      }
    }
  }

  const lineupPressure = clamp(lineup.dominantSideEdge / 4, 0.2, 1)
  const splitStrength = clamp(splitProfile.splitEdge / 0.18, 0.2, 1)
  const fit = lineup.dominantSide === splitProfile.betterSide
  const magnitude = fit
    ? LINEUP_MATCHUP_MAX_BOOST * lineupPressure * splitStrength * freshnessMultiplier
    : LINEUP_MATCHUP_MAX_PENALTY * lineupPressure * splitStrength * freshnessMultiplier
  const adjustment = fit ? magnitude : -magnitude

  return {
    adjustment: round(adjustment, 3),
    context: {
      ...baseContext,
      lineupPressure: round(lineupPressure, 3),
      splitStrength: round(splitStrength, 3),
      fit,
      reason: fit
        ? `Fresh reliever split fits ${lineup.dominantSide}-heavy opponent pocket.`
        : `Opponent pocket leans ${lineup.dominantSide}, away from pitcher better split side ${splitProfile.betterSide}.`
    }
  }
}

const buildHistoricalGameFacts = (appearanceRows, date) => {
  const earliest = Date.parse(`${date}T12:00:00Z`) - FIRST_UP_HISTORY_DAYS * 86400000
  const rows = appearanceRows.filter((row) => {
    const gameDate = Date.parse(`${row.game_date}T12:00:00Z`)
    return row.game_date < date && Number.isFinite(gameDate) && gameDate >= earliest
  })
  const rowsByGame = groupBy(rows, gameKey)
  const facts = []
  rowsByGame.forEach((gameRows) => {
    const sorted = [...gameRows].sort((left, right) =>
      toNumber(left.entry_order, 99) - toNumber(right.entry_order, 99) ||
      toNumber(left.pitcher_id, 0) - toNumber(right.pitcher_id, 0)
    )
    const starter = sorted.find((row) => String(row.pitcher_role || '').toLowerCase() === 'starter')
    const relief = sorted.filter((row) => String(row.pitcher_role || '').toLowerCase() === 'reliever')
    if (!relief.length) return
    facts.push({
      gameDate: relief[0].game_date,
      gamePk: toInt(relief[0].game_pk, null),
      teamName: canonicalTeamName(relief[0].team_name),
      teamKey: normalizeTeam(canonicalTeamName(relief[0].team_name)),
      starter: starter
        ? {
            pitcherId: toInt(starter.pitcher_id, null),
            pitcherName: starter.pitcher_name,
            outsRecorded: toNumber(starter.outs_recorded, null),
            pitchesThrown: toNumber(starter.pitches_thrown, null)
          }
        : null,
      firstReliever: relief[0],
      relief
    })
  })
  return facts
}

const latestStarterProfileByPitcher = (rows, date) => {
  const eligible = rows
    .filter((row) => row.as_of_date < date)
    .sort((left, right) =>
      String(right.as_of_date).localeCompare(String(left.as_of_date)) ||
      toNumber(right.window_starts, 0) - toNumber(left.window_starts, 0)
    )
  const map = new Map()
  eligible.forEach((row) => {
    const pitcherId = toInt(row.pitcher_id, null)
    if (pitcherId === null || map.has(pitcherId)) return
    map.set(pitcherId, row)
  })
  return map
}

const starterLeashContext = ({ starter, leash, form }) => {
  if (!starter && !leash && !form) {
    return {
      status: 'unknown',
      pitcherId: null,
      pitcherName: null,
      expectedStarterOuts: null,
      shortStartRate: null,
      leashScore: null
    }
  }
  const expectedStarterOuts = toNumber(leash?.outs_per_start, toNumber(form?.outs_recorded_per_start, null))
  const shortStartRate = Math.max(
    toNumber(leash?.short_start_rate, null) ?? -Infinity,
    toNumber(form?.short_start_rate, null) ?? -Infinity
  )
  const leashScore = toNumber(leash?.leash_score, null)
  const sixPlusRate = toNumber(leash?.six_plus_inning_rate, null)
  const hasLeashSignal = [expectedStarterOuts, shortStartRate, leashScore, sixPlusRate].some(Number.isFinite)
  const status =
    !hasLeashSignal
      ? 'unknown'
      : (Number.isFinite(expectedStarterOuts) && expectedStarterOuts <= 14.5) ||
    (Number.isFinite(shortStartRate) && shortStartRate >= 0.45) ||
    (Number.isFinite(leashScore) && leashScore <= 35)
        ? 'short_leash'
        : (Number.isFinite(expectedStarterOuts) && expectedStarterOuts >= 18) ||
        (Number.isFinite(sixPlusRate) && sixPlusRate >= 0.45) ||
        (Number.isFinite(leashScore) && leashScore >= 65)
          ? 'long_leash'
          : 'standard_leash'
  return {
    status,
    pitcherId: toInt(starter?.pitcher_id, null),
    pitcherName: starter?.pitcher_name || leash?.pitcher_name || form?.pitcher_name || null,
    expectedStarterOuts: Number.isFinite(expectedStarterOuts) ? round(expectedStarterOuts, 1) : null,
    shortStartRate: Number.isFinite(shortStartRate) ? round(shortStartRate, 3) : null,
    leashScore: Number.isFinite(leashScore) ? round(leashScore, 1) : null,
    sixPlusRate: Number.isFinite(sixPlusRate) ? round(sixPlusRate, 3) : null,
    startsSample: toInt(leash?.starts_sample, toInt(form?.starts_sample, null))
  }
}

const starterRoleAdjustment = (candidate, starterContext) => {
  const role = String(candidate.role || '').toUpperCase()
  if (starterContext?.status === 'short_leash') {
    if (role === 'LR') return 4
    if (role === 'MID' || role === 'bulk') return 2
    if (role.startsWith('SU') || role === 'CL') return -2
  }
  if (starterContext?.status === 'long_leash') {
    if (role === 'LR') return -3
    if (role === 'MID' || role.startsWith('SU')) return 1
  }
  return 0
}

const restPenalty = (rest = {}) => {
  const restRow = rest || {}
  const yesterday = toNumber(restRow.pitchesYesterday, 0)
  if (yesterday >= EXTREME_REST_PITCHES) return 24
  if (yesterday >= HEAVY_REST_PITCHES) return 20
  if (yesterday >= MODERATE_REST_PITCHES) return 12
  return 0
}

const trendAdjustment = (trend = {}, sameStarter = {}) => {
  const trendRow = trend || {}
  const sameStarterRow = sameStarter || {}
  const recentFirstUp = Math.min(toNumber(trendRow.firstUpLast3, 0), 2) * 0.2
  const sameStarterBoost = Math.min(toNumber(sameStarterRow.count, 0), 2) * 0.5
  const recency = Math.min(toNumber(trendRow.firstUpRecencyScore, 0), 2.5) * 0.1
  return clamp(recentFirstUp + sameStarterBoost + recency, 0, 1.5)
}

const applyFirstUpContext = (candidate, firstUpContext) => {
  const trend = lookupByIdentity(firstUpContext?.trendByIdentity || new Map(), candidate) || null
  const rest = lookupByIdentity(firstUpContext?.restByIdentity || new Map(), candidate) || null
  const sameStarter = lookupByIdentity(firstUpContext?.sameStarterByIdentity || new Map(), candidate) || null
  const hasRecentFirstUpTrend = toNumber(trend?.firstUpLast5, 0) > 0
  const starterAdj = hasRecentFirstUpTrend ? 0 : starterRoleAdjustment(candidate, firstUpContext?.starter)
  const trendAdj = trendAdjustment(trend, sameStarter)
  const penalty = restPenalty(rest)
  const lineupMatchup = lineupMatchupAdjustment(candidate, firstUpContext)
  const baseScore = toNumber(candidate.score, 0)
  const score = baseScore + trendAdj + starterAdj + lineupMatchup.adjustment - penalty
  return {
    ...candidate,
    firstUpBaseScore: round(baseScore, 3),
    firstUpTrendAdjustment: round(trendAdj, 3),
    firstUpLineupMatchupAdjustment: round(lineupMatchup.adjustment, 3),
    firstUpRestPenalty: round(penalty, 3),
    starterLeashAdjustment: round(starterAdj, 3),
    firstUpTrend: trend
      ? {
          firstUpLast3: trend.firstUpLast3,
          firstUpLast5: trend.firstUpLast5,
          firstUpLast10: trend.firstUpLast10,
          firstUpRecencyScore: round(trend.firstUpRecencyScore, 2),
          lastFirstUpDate: trend.lastFirstUpDate || null,
          sameStarterFirstUps: sameStarter?.count || 0
        }
      : null,
    restContext: rest
      ? {
          lastAppearanceDate: rest.lastAppearanceDate || null,
          lastAppearancePitches: rest.lastAppearancePitches,
          pitchesYesterday: rest.pitchesYesterday,
          pitchesLast2Days: rest.pitchesLast2Days,
          pitchesLast3Days: rest.pitchesLast3Days,
          usedDaysLast3: rest.usedDaysLast3,
          restFlag: rest.pitchesYesterday >= EXTREME_REST_PITCHES
            ? 'extreme_yesterday'
            : rest.pitchesYesterday >= HEAVY_REST_PITCHES
              ? 'heavy_yesterday'
              : rest.pitchesYesterday >= MODERATE_REST_PITCHES
                ? 'moderate_yesterday'
                : rest.pitchesYesterday > 0
                  ? 'worked_yesterday'
                  : 'clear'
        }
      : null,
    starterLeashContext: firstUpContext?.starter || null,
    lineupMatchupContext: lineupMatchup.context,
    score: round(score, 3)
  }
}

const buildFirstUpContexts = ({ date, dbPath, preloaded, teamSides }) => {
  const appearanceRows = preloaded?.pitcherAppearanceRows || loadPitcherAppearanceHistory(date, dbPath)
  const currentStarterRows = preloaded?.currentStarterRowsByDate?.get(date) || loadCurrentStarters(date, dbPath)
  const leashRows = preloaded?.starterLeashRows || loadStarterLeashProfiles(date, dbPath)
  const formRows = preloaded?.starterRollingFormRows || loadStarterRollingForms(date, dbPath)
  const lineupRows = preloaded?.lineupHandednessRowsByDate?.get(date) || loadLineupHandednessRows(date, dbPath)
  const pitcherSplitRows = preloaded?.pitcherBatterSideSplitRows || loadPitcherBatterSideSplitRows(date, dbPath)
  const facts = buildHistoricalGameFacts(appearanceRows, date)
  const factsByTeam = groupBy(facts, (row) => row.teamKey)
  factsByTeam.forEach((rows) => rows.sort((left, right) => right.gameDate.localeCompare(left.gameDate) || Number(right.gamePk) - Number(left.gamePk)))
  const lineupContexts = buildLineupContexts(lineupRows)
  const pitcherSplitByIdentity = buildPitcherSplitProfiles(pitcherSplitRows, date)

  const currentStarterByGameTeam = indexBy(
    currentStarterRows,
    (row) => `${toInt(row.game_pk, null)}|${normalizeTeam(canonicalTeamName(row.team_name))}`
  )
  const currentStarterByDateTeam = indexBy(
    currentStarterRows,
    (row) => `${row.game_date}|${normalizeTeam(canonicalTeamName(row.team_name))}`
  )
  const leashByPitcher = latestStarterProfileByPitcher(leashRows, date)
  const formByPitcher = latestStarterProfileByPitcher(formRows, date)
  const contexts = new Map()

  teamSides.forEach((teamSide) => {
    const teamKey = normalizeTeam(teamSide.teamName)
    if (contexts.has(teamKey)) return
    const opponentKey = normalizeTeam(teamSide.opponentName)
    const opponentLineup =
      lineupContexts.byGameTeam.get(`${toInt(teamSide.gamePk, null)}|${opponentKey}`) ||
      lineupContexts.byDateTeam.get(`${date}|${opponentKey}`) ||
      null
    const currentStarter =
      currentStarterByGameTeam.get(`${toInt(teamSide.gamePk, null)}|${teamKey}`) ||
      currentStarterByDateTeam.get(`${date}|${teamKey}`) ||
      null
    const starterId = toInt(currentStarter?.pitcher_id, null)
    const starter = starterLeashContext({
      starter: currentStarter,
      leash: starterId === null ? null : leashByPitcher.get(starterId),
      form: starterId === null ? null : formByPitcher.get(starterId)
    })
    const teamFacts = factsByTeam.get(teamKey) || []
    const recentFacts = teamFacts.slice(0, 10)
    const trendByIdentity = new Map()
    const sameStarterByIdentity = new Map()
    const restByIdentity = new Map()

    recentFacts.forEach((fact, index) => {
      const reliever = fact.firstReliever
      addByIdentity(
        trendByIdentity,
        reliever,
        () => ({ firstUpLast3: 0, firstUpLast5: 0, firstUpLast10: 0, firstUpRecencyScore: 0, lastFirstUpDate: null }),
        (trend) => {
          if (index < 3) trend.firstUpLast3 += 1
          if (index < 5) trend.firstUpLast5 += 1
          trend.firstUpLast10 += 1
          trend.firstUpRecencyScore += (10 - index) / 10
          if (!trend.lastFirstUpDate || fact.gameDate > trend.lastFirstUpDate) trend.lastFirstUpDate = fact.gameDate
        }
      )
      if (starterId !== null && toInt(fact.starter?.pitcherId, null) === starterId) {
        addByIdentity(
          sameStarterByIdentity,
          reliever,
          () => ({ count: 0, lastDate: null }),
          (entry) => {
            entry.count += 1
            if (!entry.lastDate || fact.gameDate > entry.lastDate) entry.lastDate = fact.gameDate
          }
        )
      }
    })

    teamFacts.slice(0, 5).forEach((fact) => {
      fact.relief.forEach((appearance) => {
        const back = daysBetween(date, appearance.game_date)
        const pitches = toNumber(appearance.pitches_thrown, 0) || 0
        if (back === null || back < 1 || back > 3) return
        addByIdentity(
          restByIdentity,
          appearance,
          () => ({
            lastAppearanceDate: null,
            lastAppearancePitches: 0,
            pitchesYesterday: 0,
            pitchesLast2Days: 0,
            pitchesLast3Days: 0,
            usedDays: new Set()
          }),
          (rest) => {
            if (!rest.lastAppearanceDate || appearance.game_date > rest.lastAppearanceDate) {
              rest.lastAppearanceDate = appearance.game_date
              rest.lastAppearancePitches = pitches
            }
            if (back === 1) rest.pitchesYesterday += pitches
            if (back <= 2) rest.pitchesLast2Days += pitches
            if (back <= 3) rest.pitchesLast3Days += pitches
            if (pitches > 0) rest.usedDays.add(back)
          }
        )
      })
    })
    restByIdentity.forEach((rest) => {
      rest.usedDaysLast3 = rest.usedDays.size
      delete rest.usedDays
    })

    contexts.set(teamKey, {
      starter,
      trendByIdentity,
      sameStarterByIdentity,
      restByIdentity,
      pitcherSplitByIdentity,
      opponentLineup,
      recentFirstRelieverNames: recentFacts.slice(0, 5).map((fact) => fact.firstReliever.pitcher_name).filter(Boolean)
    })
  })

  return contexts
}

const teamRankQuality = (ranking) => {
  if (!ranking) return null
  const ranks = [
    ranking.era_rank,
    ranking.whip_rank,
    ranking.bb9_rank,
    ranking.h9_rank,
    ranking.hr9_rank,
    ranking.k9_rank
  ].map(Number).filter(Number.isFinite)
  if (!ranks.length) return null
  const averageRank = avg(ranks)
  return {
    averageRank,
    qualityScore: clamp(103 - averageRank * 2.35, 25, 98),
    rankRunDelta: clamp((averageRank - 15.5) * 0.038, -0.55, 0.65)
  }
}

const legacyCandidate = (row, firstUpContext) => {
  const availability = toNumber(row.availability_score, 50)
  const bridge = toNumber(row.bridge_score, 45)
  const firstLikelihood = toNumber(row.first_reliever_likelihood, 0)
  const fatigue = toNumber(row.fatigue_score, 35)
  const score =
    firstLikelihood * 0.56 +
    availability * 0.2 +
    bridge * 0.14 +
    (row.likely_role === 'bulk' ? 7 : 0) -
    fatigue * 0.08
  return applyFirstUpContext({
    pitcherId: toInt(row.pitcher_id, null),
    pitcherName: row.pitcher_name,
    role: row.likely_role || '',
    source: 'mlb_bullpen_usage',
    throws: null,
    availabilityScore: round(availability, 1),
    bridgeScore: round(bridge, 1),
    fatigueScore: round(fatigue, 1),
    firstRelieverLikelihood: round(firstLikelihood, 1),
    expectedOuts: round(toNumber(row.avg_outs_per_appearance, roleExpectedOuts(row.likely_role)), 2),
    workedYesterday: Boolean(toInt(row.worked_yesterday_flag, 0)),
    backToBack: Boolean(toInt(row.back_to_back_flag, 0)),
    score: round(score, 3)
  }, firstUpContext)
}

const fgCandidateRows = ({ date, depthRows, usageRows, firstUpContext }) => {
  const usageByPlayer = groupBy(usageRows, (row) => row.player_key)
  return depthRows.map((row) => {
    const usage = usageByPlayer.get(row.player_key) || []
    const last3 = usage.filter((usageRow) => {
      const back = daysBetween(date, usageRow.usage_date)
      return back !== null && back >= 1 && back <= 3
    })
    const last6 = usage.filter((usageRow) => {
      const back = daysBetween(date, usageRow.usage_date)
      return back !== null && back >= 1 && back <= 6
    })
    const pitchesLast3 = last3.reduce((sum, usageRow) => sum + (toNumber(usageRow.pitches, 0) || 0), 0)
    const pitchesLast6 = last6.reduce((sum, usageRow) => sum + (toNumber(usageRow.pitches, 0) || 0), 0)
    const usedDaysLast3 = last3.filter((usageRow) => toNumber(usageRow.pitches, 0) > 0).length
    const usedDaysLast6 = last6.filter((usageRow) => toNumber(usageRow.pitches, 0) > 0).length
    const unavailable = usage.some((usageRow) => {
      const status = String(usageRow.override_status || '').toUpperCase()
      return status && status !== 'MLB'
    })
    const stress = clamp(
      pitchesLast3 * 0.8 +
        pitchesLast6 * 0.22 +
        usedDaysLast3 * 11 +
        usedDaysLast6 * 3 +
        (highLeverageRole(row.role) ? 6 : 0) +
        (unavailable ? 28 : 0),
      0,
      100
    )
    const availability = clamp(100 - stress, 0, 100)
    const score = firstUpRoleBase(row.role) + availability * 0.36 - roleRank(row.role) * 1.7
    return applyFirstUpContext({
      pitcherId: null,
      pitcherName: row.player_name,
      playerKey: row.player_key,
      role: row.role || '',
      source: 'fangraphs_roster_resource',
      throws: row.throws || null,
      availabilityScore: round(availability, 1),
      bridgeScore: round(clamp(38 + availability * 0.33 + (row.role === 'LR' ? 8 : 0), 0, 100), 1),
      fatigueScore: round(stress, 1),
      firstRelieverLikelihood: round(clamp(score, 0, 100), 1),
      expectedOuts: round(roleExpectedOuts(row.role), 2),
      workedYesterday: last3.some((usageRow) => daysBetween(date, usageRow.usage_date) === 1 && toNumber(usageRow.pitches, 0) > 0),
      backToBack: usedDaysLast3 >= 2,
      pitchesLast3,
      pitchesLast6,
      usedDaysLast3,
      usedDaysLast6,
      unavailable,
      score: round(score, 3)
    }, firstUpContext)
  })
}

const summarizeCandidates = (candidates) => {
  const ranked = [...candidates].sort((left, right) =>
    Number(right.score) - Number(left.score) ||
    Number(right.firstRelieverLikelihood) - Number(left.firstRelieverLikelihood) ||
    Number(right.availabilityScore) - Number(left.availabilityScore)
  )
  const top = ranked.slice(0, 5)
  const scoreTotal = top.reduce((sum, row) => sum + Math.max(Number(row.score) || 0, 0), 0) || 1
  return top.map((row) => ({
    ...row,
    shadowSharePct: round(Math.max(Number(row.score) || 0, 0) / scoreTotal * 100, 1)
  }))
}

const legacyProjection = ({ teamSide, rows, shape, recent, firstUpContext }) => {
  const candidates = summarizeCandidates(rows.map((row) => legacyCandidate(row, firstUpContext)))
  const availability = avg(candidates.slice(0, 4).map((row) => row.availabilityScore)) ?? 50
  const fatigue = avg(candidates.slice(0, 4).map((row) => row.fatigueScore)) ?? 40
  const shapeRuns = toNumber(shape?.total_relief_runs_allowed_avg_last10, toNumber(shape?.total_relief_runs_allowed_avg_last5, null))
  const recentRuns = toNumber(recent?.relief_runs_avg_last10, toNumber(recent?.relief_runs_avg_last5, null))
  const baseRuns = avg([shapeRuns, recentRuns].filter(Number.isFinite)) ?? 1.45
  const projectedReliefRuns = clamp(baseRuns + (fatigue - 45) * 0.008 - (availability - 55) * 0.005, 0.35, 3.6)
  const projectedReliefOuts =
    avg([
      toNumber(shape?.total_relief_outs_avg_last10, null),
      toNumber(shape?.total_relief_outs_avg_last5, null),
      toNumber(recent?.relief_outs_avg_last10, null)
    ].filter(Number.isFinite)) ?? 9
  const relieversUsed = avg([
    toNumber(shape?.relievers_used_avg_last10, null),
    toNumber(shape?.relievers_used_avg_last5, null),
    toNumber(recent?.relievers_used_avg_last10, null)
  ].filter(Number.isFinite)) ?? 3.1
  const bridgeStress = clamp(42 + (fatigue - 45) * 0.55 - (availability - 55) * 0.32 + (projectedReliefRuns - 1.45) * 15, 0, 100)
  return {
    sourceMode: 'legacy_typed_bullpen_usage',
    candidates,
    projectedReliefRuns,
    projectedReliefOuts,
    projectedRelieversUsed: relieversUsed,
    bridgeStress,
    leverageAvailabilityScore: availability,
    fatigueScore: fatigue,
    qualityScore: clamp(82 - projectedReliefRuns * 18, 20, 95),
    runRiskTier: bridgeStress >= 70 ? 'taxed_bridge' : bridgeStress >= 54 ? 'watch_bridge' : bridgeStress <= 34 ? 'fresh_bridge' : 'stable_bridge',
    reasons: [
      `Legacy bullpen usage rows: ${rows.length}.`,
      shape ? 'Pregame bullpen-shape snapshot available.' : 'No bullpen-shape snapshot; using recent actual relief history.',
      firstUpContext?.starter?.status ? `Starter leash context: ${firstUpContext.starter.status}.` : 'No starter leash context available.',
      candidates[0] ? `${candidates[0].pitcherName} leads first-up cluster.` : 'No first-up candidate available.'
    ]
  }
}

const fangraphsProjection = ({ date, depthRows, usageRows, ranking, recent, firstUpContext }) => {
  const candidates = summarizeCandidates(fgCandidateRows({ date, depthRows, usageRows, firstUpContext }))
  const quality = teamRankQuality(ranking)
  const availability = avg(candidates.slice(0, 5).map((row) => row.availabilityScore)) ?? 52
  const fatigue = avg(candidates.slice(0, 5).map((row) => row.fatigueScore)) ?? 45
  const recentRuns = avg([
    toNumber(recent?.relief_runs_avg_last10, null),
    toNumber(recent?.relief_runs_avg_last5, null)
  ].filter(Number.isFinite))
  const rankRunDelta = quality?.rankRunDelta ?? 0
  const projectedReliefRuns = clamp((recentRuns ?? 1.45) + rankRunDelta + (fatigue - 45) * 0.01 - (availability - 55) * 0.005, 0.35, 3.7)
  const projectedReliefOuts = avg([
    toNumber(recent?.relief_outs_avg_last10, null),
    toNumber(recent?.relief_outs_avg_last5, null),
    9
  ].filter(Number.isFinite)) ?? 9
  const projectedRelieversUsed = avg([
    toNumber(recent?.relievers_used_avg_last10, null),
    toNumber(recent?.relievers_used_avg_last5, null),
    3.2
  ].filter(Number.isFinite)) ?? 3.2
  const bridgeStress = clamp(44 + (fatigue - 45) * 0.62 - (availability - 55) * 0.28 + rankRunDelta * 28, 0, 100)
  return {
    sourceMode: 'fangraphs_roster_resource',
    candidates,
    projectedReliefRuns,
    projectedReliefOuts,
    projectedRelieversUsed,
    bridgeStress,
    leverageAvailabilityScore: availability,
    fatigueScore: fatigue,
    qualityScore: quality?.qualityScore ?? clamp(82 - projectedReliefRuns * 18, 20, 95),
    runRiskTier: bridgeStress >= 70 ? 'taxed_bridge' : bridgeStress >= 54 ? 'watch_bridge' : bridgeStress <= 34 ? 'fresh_bridge' : 'stable_bridge',
    reasons: [
      `FanGraphs/RosterResource bullpen depth rows: ${depthRows.length}.`,
      ranking ? `FanGraphs RP average rank ${round(quality?.averageRank, 1)}.` : 'No FanGraphs team RP ranking row.',
      firstUpContext?.starter?.status ? `Starter leash context: ${firstUpContext.starter.status}.` : 'No starter leash context available.',
      candidates[0] ? `${candidates[0].pitcherName} leads available first-up cluster.` : 'No FanGraphs reliever candidates available.'
    ]
  }
}

const emptyProjection = () => ({
  sourceMode: 'missing',
  candidates: [],
  projectedReliefRuns: 1.45,
  projectedReliefOuts: 9,
  projectedRelieversUsed: 3.2,
  bridgeStress: 50,
  leverageAvailabilityScore: 50,
  fatigueScore: 45,
  qualityScore: 55,
  runRiskTier: 'unknown_bridge',
  reasons: ['No legacy bullpen usage or FanGraphs bullpen rows were available for this team/date.']
})

export const buildReliefRows = ({ date, dbPath = mlbDbPath, recentByTeamOverride = null, preloaded = null } = {}) => {
  const generatedAt = new Date().toISOString()
  const teamSides = preloaded?.teamSidesByDate?.get(date) || teamSidesForDate(date, dbPath)
  const legacyRowsByTeam = groupBy(
    preloaded?.legacyUsageRowsByDate?.get(date) || loadLegacyBullpenUsage(date, dbPath),
    (row) => normalizeTeam(canonicalTeamName(row.team_name))
  )
  const legacyShapeByTeam = indexBy(
    preloaded?.legacyShapeRowsByDate?.get(date) || loadLegacyShape(date, dbPath),
    (row) => normalizeTeam(canonicalTeamName(row.team_name))
  )
  const fgRankByTeam = indexBy(
    preloaded?.fgRankingRowsByDate?.get(date) || loadFgRankings(date, dbPath),
    (row) => normalizeTeam(canonicalTeamName(row.team_name))
  )
  const fgDepthByTeam = groupBy(
    preloaded?.fgDepthRowsByDate?.get(date) || loadFgDepth(date, dbPath),
    (row) => normalizeTeam(canonicalTeamName(row.team_name))
  )
  const fgUsageByTeam = groupBy(
    preloaded?.fgUsageRowsByDate?.get(date) || loadFgUsage(date, dbPath),
    (row) => normalizeTeam(canonicalTeamName(row.team_name))
  )
  const recentByTeam = recentByTeamOverride || indexBy(loadActualRecentTeamRelief(date, dbPath), (row) => normalizeTeam(canonicalTeamName(row.team_name)))
  const firstUpContextByTeam = buildFirstUpContexts({ date, dbPath, preloaded, teamSides })

  return teamSides.map((teamSide) => {
    const teamKey = normalizeTeam(teamSide.teamName)
    const legacyRows = legacyRowsByTeam.get(teamKey) || []
    const fgDepthRows = fgDepthByTeam.get(teamKey) || []
    const fgUsageRows = fgUsageByTeam.get(teamKey) || []
    const recent = recentByTeam.get(teamKey) || null
    const firstUpContext = firstUpContextByTeam.get(teamKey) || null
    const projection = legacyRows.length
      ? legacyProjection({
        teamSide,
        rows: legacyRows,
        shape: legacyShapeByTeam.get(teamKey) || null,
        recent,
        firstUpContext
      })
      : fgDepthRows.length
        ? fangraphsProjection({
          date,
          depthRows: fgDepthRows,
          usageRows: fgUsageRows,
          ranking: fgRankByTeam.get(teamKey) || null,
          recent,
          firstUpContext
        })
        : emptyProjection()

    const topTwoShare = projection.candidates.slice(0, 2).reduce((sum, row) => sum + (Number(row.shadowSharePct) || 0), 0)
    const confidenceScore = clamp(
      24 +
        (teamSide.gamePk ? 8 : 0) +
        (projection.sourceMode === 'legacy_typed_bullpen_usage' ? 32 : projection.sourceMode === 'fangraphs_roster_resource' ? 28 : 0) +
        (projection.candidates.length >= 3 ? 12 : 0) +
        (recent ? 12 : 0) +
        (fgRankByTeam.get(teamKey) ? 6 : 0),
      0,
      95
    )
    const featureSnapshot = {
      sourceMode: projection.sourceMode,
      recent,
      legacyShape: legacyShapeByTeam.get(teamKey) || null,
      fanGraphsRanking: fgRankByTeam.get(teamKey) || null,
      firstUpContext: firstUpContext
        ? {
            starter: firstUpContext.starter,
            opponentLineup: firstUpContext.opponentLineup
              ? {
                  teamName: firstUpContext.opponentLineup.teamName,
                  status: firstUpContext.opponentLineup.status,
                  rawCounts: firstUpContext.opponentLineup.rawCounts,
                  battersCount: firstUpContext.opponentLineup.batters.length
                }
              : null,
            recentFirstRelieverNames: firstUpContext.recentFirstRelieverNames
          }
        : null,
      candidates: projection.candidates
    }
    return {
      sourceDate: date,
      modelId,
      modelVersion,
      gamePk: teamSide.gamePk ?? null,
      gameDate: teamSide.gameDate,
      teamName: teamSide.teamName,
      opponentName: teamSide.opponentName,
      teamSide: teamSide.teamSide,
      sourceMode: projection.sourceMode,
      projectedReliefRunsAllowed: round(projection.projectedReliefRuns, 3),
      projectedReliefOuts: round(projection.projectedReliefOuts, 2),
      projectedRelieversUsed: round(projection.projectedRelieversUsed, 2),
      bridgeStressScore: round(projection.bridgeStress, 1),
      leverageAvailabilityScore: round(projection.leverageAvailabilityScore, 1),
      fatigueScore: round(projection.fatigueScore, 1),
      qualityScore: round(projection.qualityScore, 1),
      runRiskTier: projection.runRiskTier,
      topTwoSharePct: round(topTwoShare, 1),
      leadPitcherName: projection.candidates[0]?.pitcherName || null,
      leadPitcherId: projection.candidates[0]?.pitcherId || null,
      leadExpectedOuts: projection.candidates[0]?.expectedOuts ?? null,
      leadAvailabilityScore: projection.candidates[0]?.availabilityScore ?? null,
      candidates: projection.candidates,
      reasons: projection.reasons,
      confidenceScore: round(confidenceScore, 1),
      featureSnapshot,
      generatedAt
    }
  })
}

const createTable = (dbPath, date) => {
  sqliteExec(`
create table if not exists mlb_relief_pitcher_projection_v1_daily (
  source_date text not null,
  model_version text not null,
  game_pk integer,
  game_date text,
  team_name text not null,
  opponent_name text,
  team_side text,
  source_mode text,
  projected_relief_runs_allowed real,
  projected_relief_outs real,
  projected_relievers_used real,
  bridge_stress_score real,
  leverage_availability_score real,
  fatigue_score real,
  quality_score real,
  run_risk_tier text,
  top_two_share_pct real,
  lead_pitcher_name text,
  lead_pitcher_id integer,
  lead_expected_outs real,
  lead_availability_score real,
  confidence_score real,
  candidates_json text,
  reasons_json text,
  feature_snapshot_json text,
  generated_at text,
  primary key (source_date, team_name, model_version)
);
create index if not exists idx_mlb_rp2_daily_date_game on mlb_relief_pitcher_projection_v1_daily(source_date, game_pk);
delete from mlb_relief_pitcher_projection_v1_daily
where source_date = ${sqlQuote(date)}
  and model_version = ${sqlQuote(modelVersion)};
`, dbPath)
}

const insertRows = (dbPath, rows) => {
  if (!rows.length) return
  const values = rows.map((row) => `(
    ${sqlQuote(row.sourceDate)}, ${sqlQuote(row.modelVersion)}, ${sqlQuote(row.gamePk)}, ${sqlQuote(row.gameDate)},
    ${sqlQuote(row.teamName)}, ${sqlQuote(row.opponentName)}, ${sqlQuote(row.teamSide)}, ${sqlQuote(row.sourceMode)},
    ${sqlQuote(row.projectedReliefRunsAllowed)}, ${sqlQuote(row.projectedReliefOuts)}, ${sqlQuote(row.projectedRelieversUsed)},
    ${sqlQuote(row.bridgeStressScore)}, ${sqlQuote(row.leverageAvailabilityScore)}, ${sqlQuote(row.fatigueScore)},
    ${sqlQuote(row.qualityScore)}, ${sqlQuote(row.runRiskTier)}, ${sqlQuote(row.topTwoSharePct)},
    ${sqlQuote(row.leadPitcherName)}, ${sqlQuote(row.leadPitcherId)}, ${sqlQuote(row.leadExpectedOuts)},
    ${sqlQuote(row.leadAvailabilityScore)}, ${sqlQuote(row.confidenceScore)}, ${sqlQuote(JSON.stringify(row.candidates))},
    ${sqlQuote(JSON.stringify(row.reasons))}, ${sqlQuote(JSON.stringify(row.featureSnapshot))}, ${sqlQuote(row.generatedAt)}
  )`).join(',\n')

  sqliteExec(`
insert or replace into mlb_relief_pitcher_projection_v1_daily (
  source_date, model_version, game_pk, game_date, team_name, opponent_name, team_side, source_mode,
  projected_relief_runs_allowed, projected_relief_outs, projected_relievers_used, bridge_stress_score,
  leverage_availability_score, fatigue_score, quality_score, run_risk_tier, top_two_share_pct,
  lead_pitcher_name, lead_pitcher_id, lead_expected_outs, lead_availability_score, confidence_score,
  candidates_json, reasons_json, feature_snapshot_json, generated_at
) values ${values};
`, dbPath)
}

const summarize = (rows) => {
  const gamePks = rows.map((row) => row.gamePk).filter(Boolean)
  const fallbackKeys = new Set(rows.map((row) => `${row.sourceDate}:${row.teamSide}:${row.teamName}`))
  return {
    teamSides: rows.length,
    games: gamePks.length ? new Set(gamePks).size : fallbackKeys.size / 2,
    legacyRows: rows.filter((row) => row.sourceMode === 'legacy_typed_bullpen_usage').length,
    fangraphsRows: rows.filter((row) => row.sourceMode === 'fangraphs_roster_resource').length,
    missingRows: rows.filter((row) => row.sourceMode === 'missing').length,
    avgProjectedReliefRunsAllowed: round(avg(rows.map((row) => row.projectedReliefRunsAllowed)), 3),
    avgBridgeStressScore: round(avg(rows.map((row) => row.bridgeStressScore)), 1),
    taxedBridgeRows: rows.filter((row) => row.runRiskTier === 'taxed_bridge').length,
    watchBridgeRows: rows.filter((row) => row.runRiskTier === 'watch_bridge').length
  }
}

const statusForBuild = ({ expectedRows, actualRows, degradedRows }) => {
  if (actualRows <= 0) return { status: 'missing', completenessStatus: 'missing' }
  if (actualRows < expectedRows || degradedRows > 0) return { status: 'success', completenessStatus: 'partial' }
  return { status: 'success', completenessStatus: 'complete' }
}

export const writeReliefProjectionArtifact = async ({ date, dbPath = mlbDbPath, outPath }) => {
  const rows = buildReliefRows({ date, dbPath })
  createTable(dbPath, date)
  insertRows(dbPath, rows)
  const generatedAt = new Date().toISOString()
  const artifact = {
    schemaVersion: 1,
    modelId,
    modelVersion,
    generatedAt,
    date,
    dbPath: path.relative(rootDir, dbPath),
    table: 'mlb_relief_pitcher_projection_v1_daily',
    summary: summarize(rows),
    rows
  }
  await fs.mkdir(path.dirname(outPath), { recursive: true })
  await fs.writeFile(outPath, `${JSON.stringify(artifact, null, 2)}\n`)

  const expectedRows = collectGamesForDate(date, dbPath).length * 2
  const actualRows = rows.length
  const coverageMissingRows = Math.max(expectedRows - actualRows, 0)
  const degradedRows = artifact.summary.missingRows || 0
  const sourceStatus = statusForBuild({ expectedRows, actualRows, degradedRows })
  writeMlbSourceStatus({
    dbPath,
    sourceName: 'mlb_rp2',
    sourceFamily: 'bullpen-addendum',
    sourceDate: date,
    runReason: 'daily-relief-projection-build',
    cacheStatus: 'generated',
    cacheTtlHours: 12,
    status: sourceStatus.status,
    completenessStatus: sourceStatus.completenessStatus,
    expectedItemCount: expectedRows,
    actualItemCount: actualRows,
    missingItemCount: coverageMissingRows + degradedRows,
    unresolvedCount: degradedRows,
    startedAt: generatedAt,
    finishedAt: generatedAt,
    notes: {
      modelId,
      modelVersion,
      artifactPath: path.relative(rootDir, outPath),
      table: artifact.table,
      summary: artifact.summary
    }
  })
  return artifact
}

const main = async () => {
  const date = getArg('--date', new Date().toISOString().slice(0, 10))
  const dbPath = getArg('--db', mlbDbPath)
  const outPath = getArg(
    '--out',
    path.join(rootDir, 'data-private/warehouse/mlb/relief-projections-v1', `${date}.json`)
  )
  const artifact = await writeReliefProjectionArtifact({ date, dbPath, outPath })
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
