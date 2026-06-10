import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { querySqlite } from '../../../db/sqlite.mjs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..', '..', '..', '..', '..')

const argValue = (name, fallback = '') => {
  const inline = process.argv.find((arg) => arg.startsWith(`${name}=`))
  if (inline) return inline.slice(name.length + 1)
  const index = process.argv.indexOf(name)
  return index >= 0 ? process.argv[index + 1] || fallback : fallback
}

const startDate = argValue('--start', '2026-06-05')
const endDate = argValue('--end', startDate)
const outPath = argValue(
  '--out',
  path.join(rootDir, 'models', 'mlb', 'cartridges', 'MLB-M2', 'reports', `inning-expected-batters-shadow-${startDate}-to-${endDate}.json`)
)

const clamp = (value, min, max) => Math.max(min, Math.min(max, value))
const round = (value, digits = 3) => {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return null
  const factor = 10 ** digits
  return Math.round(parsed * factor) / factor
}
const num = (value, fallback = null) => {
  if (value === null || value === undefined || value === '') return fallback
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}
const slug = (value = '') =>
  String(value)
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

const dateRange = (start, end) => {
  const dates = []
  const cursor = new Date(`${start}T00:00:00Z`)
  const last = new Date(`${end}T00:00:00Z`)
  while (cursor <= last) {
    dates.push(cursor.toISOString().slice(0, 10))
    cursor.setUTCDate(cursor.getUTCDate() + 1)
  }
  return dates
}

const mean = (values) => {
  const numeric = values.map(Number).filter(Number.isFinite)
  return numeric.length ? numeric.reduce((sum, value) => sum + value, 0) / numeric.length : null
}

const brier = (rows) => mean(rows.map((row) => (row.probability - row.actual) ** 2))

const bucket = (probability) => {
  if (probability < 0.4) return '<40'
  if (probability < 0.5) return '40-49'
  if (probability < 0.6) return '50-59'
  return '60+'
}

const slotFrom = (startSlot, offset) => ((startSlot + offset - 1) % 9) + 1

const hasMetric = (value) => Number.isFinite(num(value, null))

const loadPaDistributions = (date) => {
  const rows = querySqlite(
    `
    with half_counts as (
      select
        pa.inning,
        pa.game_id,
        pa.batting_team_id,
        count(*) as pa_count,
        sum(coalesce(pa.runs_scored, 0)) as runs
      from plate_appearances pa
      join games g on g.game_id = pa.game_id
      where g.game_date < ?
        and pa.inning between 1 and 5
      group by pa.inning, pa.game_id, pa.batting_team_id
    )
    select inning, pa_count, count(*) as halves, avg(case when runs > 0 then 1.0 else 0.0 end) as score_rate
    from half_counts
    group by inning, pa_count
    order by inning, pa_count
    `,
    [date],
    { maxBuffer: 1024 * 1024 * 20 }
  )
  const byInning = new Map()
  for (const row of rows) {
    const inning = Number(row.inning)
    const list = byInning.get(inning) || []
    list.push({ paCount: Number(row.pa_count), halves: Number(row.halves), scoreRate: num(row.score_rate, null) })
    byInning.set(inning, list)
  }
  for (let inning = 1; inning <= 5; inning += 1) {
    if (!byInning.has(inning)) byInning.set(inning, [{ paCount: 3, halves: 1, scoreRate: 0.25 }])
  }
  return byInning
}

const expectedSlotWeights = (paDistributions) => {
  let startDist = new Map([[1, 1]])
  const inningWindows = new Map()
  for (let inning = 1; inning <= 5; inning += 1) {
    const paRows = paDistributions.get(inning) || [{ paCount: 3, halves: 1 }]
    const totalHalves = paRows.reduce((sum, row) => sum + row.halves, 0) || 1
    const paDist = paRows.map((row) => ({ paCount: row.paCount, probability: row.halves / totalHalves }))
    const slotWeights = new Map()
    const nextStartDist = new Map()
    for (const [startSlot, startProbability] of startDist.entries()) {
      for (const pa of paDist) {
        const probability = startProbability * pa.probability
        for (let offset = 0; offset < pa.paCount; offset += 1) {
          const slot = slotFrom(startSlot, offset)
          slotWeights.set(slot, (slotWeights.get(slot) || 0) + probability)
        }
        const nextStart = slotFrom(startSlot, pa.paCount)
        nextStartDist.set(nextStart, (nextStartDist.get(nextStart) || 0) + probability)
      }
    }
    const totalSlotWeight = Array.from(slotWeights.values()).reduce((sum, value) => sum + value, 0) || 1
    inningWindows.set(
      inning,
      Array.from(slotWeights.entries())
        .map(([slot, weight]) => ({ slot, weight: weight / totalSlotWeight }))
        .sort((left, right) => left.slot - right.slot)
    )
    startDist = nextStartDist
  }
  return inningWindows
}

const loadGames = (date) =>
  querySqlite(
    `
    select
      g.game_id,
      g.game_date,
      g.home_team_id,
      g.away_team_id,
      ht.name as home_team,
      at.name as away_team
    from games g
    join teams ht on ht.team_id = g.home_team_id
    join teams at on at.team_id = g.away_team_id
    where g.game_date = ?
      and g.status not like '%Postponed%'
    order by g.start_time_utc, g.game_id
    `,
    [date]
  )

const loadLineupPlayers = (date) => {
  const rows = querySqlite(
    `
    with latest_lineups as (
      select game_id, team_id, max(captured_at) as captured_at
      from lineups
      where captured_at like ?
      group by game_id, team_id
    )
    select
      l.game_id,
      l.team_id,
      l.lineup_status,
      s.batting_order,
      s.player_id,
      p.name as player_name,
      coalesce(ps.ops, ps.on_base_percentage + ps.slugging_percentage) as split_ops,
      ps.on_base_percentage as split_obp,
      ps.slugging_percentage as split_slg,
      ps.hit_rate as split_hit_rate,
      ps.total_bases_rate as split_total_bases_rate,
      ps.walk_rate as split_walk_rate,
      st.rolling_7_xwoba,
      st.rolling_14_xwoba,
      st.rolling_30_xwoba,
      st.rolling_7_xba,
      st.rolling_14_xba,
      st.rolling_30_xba,
      st.rolling_7_barrel_pct,
      st.rolling_14_barrel_pct,
      st.rolling_7_hard_hit_pct,
      st.rolling_14_hard_hit_pct,
      st.xwoba_trend_7_minus_30,
      pst.hits_per_pa_last5,
      pst.total_bases_per_pa_last5,
      lm.first_cycle_read,
      lm.second_cycle_read,
      lm.damage_fit,
      lm.traffic_fit,
      lm.platoon_pressure
    from latest_lineups ll
    join lineups l on l.game_id = ll.game_id and l.team_id = ll.team_id and l.captured_at = ll.captured_at
    join lineup_slots s on s.lineup_id = l.lineup_id
    left join players p on p.player_id = s.player_id
    left join player_split_snapshots ps on ps.game_id = l.game_id and ps.player_id = s.player_id
    left join player_statcast_snapshots st on st.snapshot_date = ? and st.player_id = s.player_id
    left join player_state_snapshots pst on pst.snapshot_date = ? and pst.player_id = s.player_id
    left join lineup_matchup_snapshots lm on lm.snapshot_date = ? and lm.game_id = l.game_id and lm.hitter_id = s.player_id
    where ll.captured_at like ?
    order by l.game_id, l.team_id, s.batting_order
    `,
    [`${date}%`, date, date, date, `${date}%`],
    { maxBuffer: 1024 * 1024 * 80 }
  )
  const byGameTeam = new Map()
  for (const row of rows) {
    const key = `${row.game_id}:${row.team_id}`
    const list = byGameTeam.get(key) || []
    list.push(row)
    byGameTeam.set(key, list)
  }
  return byGameTeam
}

const loadStarters = (date) => {
  const rows = querySqlite(
    `
    select
      sp.game_id,
      sp.team_id,
      sp.pitcher_id,
      p.name as pitcher_name,
      form.hits_allowed_per_start,
      form.earned_runs_per_start,
      form.runs_allowed_per_start,
      form.whip_like,
      form.short_start_rate,
      ttp.second_trip_reached_rate,
      ttp.second_trip_scoring_play_rate,
      ttp.third_time_penalty_index
    from starting_pitchers sp
    left join players p on p.player_id = sp.pitcher_id
    left join starting_pitcher_form_snapshots form
      on form.pitcher_id = sp.pitcher_id
     and form.snapshot_date = ?
     and form.window_starts = 5
    left join starter_third_time_penalty_profiles ttp
      on ttp.pitcher_id = sp.pitcher_id
     and ttp.snapshot_date = ?
     and ttp.window_starts = 5
    join games g on g.game_id = sp.game_id
    where g.game_date = ?
    `,
    [date, date, date]
  )
  return new Map(rows.map((row) => [`${row.game_id}:${row.team_id}`, row]))
}

const loadActualInnings = (date) => {
  const rows = querySqlite(
    `
    select
      pa.game_id,
      pa.inning,
      pa.batting_team_id,
      sum(coalesce(pa.runs_scored, 0)) as runs
    from plate_appearances pa
    join games g on g.game_id = pa.game_id
    where g.game_date = ?
      and pa.inning between 1 and 5
    group by pa.game_id, pa.inning, pa.batting_team_id
    `,
    [date],
    { maxBuffer: 1024 * 1024 * 20 }
  )
  const byGameInning = new Map()
  const byHalf = new Map()
  for (const row of rows) {
    const gameKey = `${row.game_id}:${row.inning}`
    const runs = Number(row.runs || 0)
    byGameInning.set(gameKey, (byGameInning.get(gameKey) || 0) + runs)
    byHalf.set(`${row.game_id}:${row.batting_team_id}:${row.inning}`, runs)
  }
  return { byGameInning, byHalf }
}

const loadLeagueInningRates = (date) => {
  const rows = querySqlite(
    `
    with halves as (
      select pa.game_id, pa.batting_team_id, pa.inning, sum(coalesce(pa.runs_scored, 0)) as runs
      from plate_appearances pa
      join games g on g.game_id = pa.game_id
      where g.game_date < ?
        and pa.inning between 1 and 5
      group by pa.game_id, pa.batting_team_id, pa.inning
    )
    select inning, avg(case when runs > 0 then 1.0 else 0.0 end) as half_score_rate
    from halves
    group by inning
    `,
    [date]
  )
  const map = new Map(rows.map((row) => [Number(row.inning), num(row.half_score_rate, 0.25)]))
  return map
}

const loadMarketAnchors = (date) => {
  const teamRows = querySqlite(
    `
    select game_id, team_id, market_type, line_value
    from market_contracts
    where source_name = 'draftkings'
      and market_type in ('teamTotalRunsFirst3','teamTotalRunsFirst5','teamTotalRunsFirst7','teamTotalHits')
      and source_pk like ?
    `,
    [`%${date}-draftkings-mlb-lines.json%`]
  )
  const propRows = querySqlite(
    `
    select game_id, player_id, market_type, selection, line_value, american_odds
    from prop_market_snapshots
    where market_date = ?
      and source_name = 'draftkings'
      and market_type in ('pitcher_hits_allowed','pitcher_earned_runs_allowed','pitcher_record_win')
    `,
    [date]
  )
  const team = new Map()
  for (const row of teamRows) team.set(`${row.game_id}:${row.team_id}:${row.market_type}`, row)
  const pitcher = new Map()
  for (const row of propRows) {
    const key = `${row.game_id}:${row.player_id}:${row.market_type}`
    const list = pitcher.get(key) || []
    list.push(row)
    pitcher.set(key, list)
  }
  return { team, pitcher }
}

const hitterScore = (row) => {
  const xwoba = num(row.rolling_7_xwoba, null) ?? num(row.rolling_14_xwoba, null) ?? num(row.rolling_30_xwoba, null)
  const xba = num(row.rolling_7_xba, null) ?? num(row.rolling_14_xba, null) ?? num(row.rolling_30_xba, null)
  const splitOps = num(row.split_ops, null)
  const hitRate = num(row.hits_per_pa_last5, null) ?? num(row.split_hit_rate, null)
  const tbRate = num(row.total_bases_per_pa_last5, null) ?? num(row.split_total_bases_rate, null)
  const barrel = num(row.rolling_7_barrel_pct, null) ?? num(row.rolling_14_barrel_pct, null)
  const hardHit = num(row.rolling_7_hard_hit_pct, null) ?? num(row.rolling_14_hard_hit_pct, null)
  const damageFit = num(row.damage_fit, 50)
  const trafficFit = num(row.traffic_fit, 50)
  const cycleRead = Math.max(num(row.first_cycle_read, 50), num(row.second_cycle_read, 50))

  let score = 50
  if (Number.isFinite(xwoba)) score += clamp((xwoba - 0.315) * 120, -10, 14)
  if (Number.isFinite(splitOps)) score += clamp((splitOps - 0.72) * 24, -8, 10)
  if (Number.isFinite(xba)) score += clamp((xba - 0.245) * 40, -4, 6)
  if (Number.isFinite(hitRate)) score += clamp((hitRate - 0.24) * 35, -5, 7)
  if (Number.isFinite(tbRate)) score += clamp((tbRate - 0.38) * 16, -4, 6)
  if (Number.isFinite(barrel)) score += clamp((barrel - 7) * 0.45, -3, 5)
  if (Number.isFinite(hardHit)) score += clamp((hardHit - 39) * 0.18, -3, 5)
  score += clamp((damageFit - 50) * 0.11, -5, 6)
  score += clamp((trafficFit - 50) * 0.08, -4, 5)
  score += clamp((cycleRead - 50) * 0.07, -3, 5)
  return clamp(score, 25, 82)
}

const hitterFeatureCoverage = (row) => ({
  statcast: hasMetric(row.rolling_7_xwoba) || hasMetric(row.rolling_14_xwoba) || hasMetric(row.rolling_30_xwoba),
  split: hasMetric(row.split_ops) || hasMetric(row.split_hit_rate) || hasMetric(row.split_total_bases_rate),
  matchup: hasMetric(row.damage_fit) || hasMetric(row.traffic_fit) || hasMetric(row.first_cycle_read) || hasMetric(row.second_cycle_read)
})

const starterFeatureCoverage = (starter) =>
  Boolean(
    starter &&
      (hasMetric(starter.hits_allowed_per_start) ||
        hasMetric(starter.earned_runs_per_start) ||
        hasMetric(starter.whip_like) ||
        hasMetric(starter.second_trip_reached_rate) ||
        hasMetric(starter.third_time_penalty_index))
  )

const scoreHalfInning = ({ gameId, battingTeamId, opposingTeamId, inning, lineup, slotWeights, starter, marketAnchors, leagueRate }) => {
  if (!lineup || lineup.length < 8) return null
  const bySlot = new Map(lineup.map((row) => [Number(row.batting_order), row]))
  let weightedHitterScore = 0
  let totalWeight = 0
  const expectedSlots = []
  const hitterCoverage = { statcast: 0, split: 0, matchup: 0, weighted: 0 }
  for (const slotWeight of slotWeights) {
    const hitter = bySlot.get(slotWeight.slot)
    if (!hitter) continue
    const score = hitterScore(hitter)
    const coverage = hitterFeatureCoverage(hitter)
    weightedHitterScore += score * slotWeight.weight
    totalWeight += slotWeight.weight
    hitterCoverage.statcast += coverage.statcast ? slotWeight.weight : 0
    hitterCoverage.split += coverage.split ? slotWeight.weight : 0
    hitterCoverage.matchup += coverage.matchup ? slotWeight.weight : 0
    hitterCoverage.weighted += slotWeight.weight
    if (slotWeight.weight >= 0.08) expectedSlots.push(slotWeight.slot)
  }
  if (!totalWeight) return null
  const batterScore = weightedHitterScore / totalWeight
  const starterRisk =
    50 +
    clamp((num(starter?.hits_allowed_per_start, 4.8) - 4.8) * 3.2, -8, 10) +
    clamp((num(starter?.earned_runs_per_start, 2.3) - 2.3) * 4.2, -8, 10) +
    clamp((num(starter?.whip_like, 1.25) - 1.25) * 16, -6, 8) +
    (inning >= 4 ? clamp((num(starter?.second_trip_reached_rate, 0.31) - 0.31) * 36, -5, 8) : 0) +
    (inning >= 5 ? clamp((num(starter?.third_time_penalty_index, 50) - 50) * 0.08, -4, 6) : 0)
  const teamF5 = marketAnchors.team.get(`${gameId}:${battingTeamId}:teamTotalRunsFirst5`)
  const teamF3 = marketAnchors.team.get(`${gameId}:${battingTeamId}:teamTotalRunsFirst3`)
  const pitcherHits = marketAnchors.pitcher.get(`${gameId}:${starter?.pitcher_id}:pitcher_hits_allowed`) || []
  const pitcherEr = marketAnchors.pitcher.get(`${gameId}:${starter?.pitcher_id}:pitcher_earned_runs_allowed`) || []
  const hitsLine = num(pitcherHits[0]?.line_value, null)
  const erLine = num(pitcherEr[0]?.line_value, null)
  const marketPressure =
    clamp((num(teamF5?.line_value, 2.2) - 2.2) * 4, -5, 7) +
    (inning <= 3 ? clamp((num(teamF3?.line_value, 1.25) - 1.25) * 3, -3, 5) : 0) +
    clamp((hitsLine ?? 4.6) - 4.6, -2, 3) * 1.5 +
    clamp((erLine ?? 2.2) - 2.2, -1.5, 3) * 2

  const probability = clamp(
    leagueRate + (batterScore - 50) * 0.0036 + (starterRisk - 50) * 0.0024 + marketPressure * 0.006,
    0.06,
    0.68
  )
  return {
    probability,
    batterScore: round(batterScore, 1),
    starterRisk: round(starterRisk, 1),
    marketPressure: round(marketPressure, 1),
    coverage: {
      statcastPct: round(((hitterCoverage.statcast || 0) / hitterCoverage.weighted) * 100, 1),
      splitPct: round(((hitterCoverage.split || 0) / hitterCoverage.weighted) * 100, 1),
      matchupPct: round(((hitterCoverage.matchup || 0) / hitterCoverage.weighted) * 100, 1),
      starter: starterFeatureCoverage(starter),
      teamMarket: Boolean(teamF5 || teamF3),
      pitcherMarket: Boolean(pitcherHits.length || pitcherEr.length)
    },
    expectedSlots: expectedSlots.sort((a, b) => a - b)
  }
}

const runDate = (date) => {
  const games = loadGames(date)
  const lineups = loadLineupPlayers(date)
  const starters = loadStarters(date)
  const actual = loadActualInnings(date)
  const paDist = loadPaDistributions(date)
  const slotWindows = expectedSlotWeights(paDist)
  const leagueRates = loadLeagueInningRates(date)
  const marketAnchors = loadMarketAnchors(date)
  const rows = []

  for (const game of games) {
    const awayLineup = lineups.get(`${game.game_id}:${game.away_team_id}`)
    const homeLineup = lineups.get(`${game.game_id}:${game.home_team_id}`)
    const awayStarter = starters.get(`${game.game_id}:${game.away_team_id}`)
    const homeStarter = starters.get(`${game.game_id}:${game.home_team_id}`)
    for (let inning = 1; inning <= 5; inning += 1) {
      const leagueHalfRate = leagueRates.get(inning) ?? 0.26
      const slotWeights = slotWindows.get(inning) || []
      const awayHalf = scoreHalfInning({
        gameId: game.game_id,
        battingTeamId: game.away_team_id,
        opposingTeamId: game.home_team_id,
        inning,
        lineup: awayLineup,
        slotWeights,
        starter: homeStarter,
        marketAnchors,
        leagueRate: leagueHalfRate
      })
      const homeHalf = scoreHalfInning({
        gameId: game.game_id,
        battingTeamId: game.home_team_id,
        opposingTeamId: game.away_team_id,
        inning,
        lineup: homeLineup,
        slotWeights,
        starter: awayStarter,
        marketAnchors,
        leagueRate: leagueHalfRate
      })
      if (!awayHalf || !homeHalf) continue
      const probability = clamp(1 - (1 - awayHalf.probability) * (1 - homeHalf.probability), 0.08, 0.88)
      const baselineHalf = leagueHalfRate
      const baselineProbability = clamp(1 - (1 - baselineHalf) * (1 - baselineHalf), 0.08, 0.88)
      const actualRuns = actual.byGameInning.get(`${game.game_id}:${inning}`)
      if (!Number.isFinite(actualRuns)) continue
      rows.push({
        date,
        gameId: game.game_id,
        title: `${game.away_team} @ ${game.home_team}`,
        inning,
        probability,
        baselineProbability,
        actual: actualRuns > 0 ? 1 : 0,
        actualRuns,
        awayProbability: awayHalf.probability,
        homeProbability: homeHalf.probability,
        awaySlots: awayHalf.expectedSlots,
        homeSlots: homeHalf.expectedSlots,
        awayBatterScore: awayHalf.batterScore,
        homeBatterScore: homeHalf.batterScore,
        awayStarterRisk: awayHalf.starterRisk,
        homeStarterRisk: homeHalf.starterRisk,
        awayMarketPressure: awayHalf.marketPressure,
        homeMarketPressure: homeHalf.marketPressure,
        coverage: {
          statcastPct: round(mean([awayHalf.coverage.statcastPct, homeHalf.coverage.statcastPct]), 1),
          splitPct: round(mean([awayHalf.coverage.splitPct, homeHalf.coverage.splitPct]), 1),
          matchupPct: round(mean([awayHalf.coverage.matchupPct, homeHalf.coverage.matchupPct]), 1),
          starters: Number(awayHalf.coverage.starter) + Number(homeHalf.coverage.starter),
          teamMarkets: Number(awayHalf.coverage.teamMarket) + Number(homeHalf.coverage.teamMarket),
          pitcherMarkets: Number(awayHalf.coverage.pitcherMarket) + Number(homeHalf.coverage.pitcherMarket)
        }
      })
    }
  }
  return rows
}

const rows = dateRange(startDate, endDate).flatMap(runDate)
const pickRows = rows
  .map((row) => ({
    ...row,
    pick: row.probability >= 0.52 ? 'Run' : row.probability <= 0.48 ? 'No run' : 'Pass',
    baselinePick: row.baselineProbability >= 0.52 ? 'Run' : row.baselineProbability <= 0.48 ? 'No run' : 'Pass'
  }))
  .filter((row) => row.pick !== 'Pass')

const baselinePickRows = rows
  .map((row) => ({
    ...row,
    baselinePick: row.baselineProbability >= 0.52 ? 'Run' : row.baselineProbability <= 0.48 ? 'No run' : 'Pass'
  }))
  .filter((row) => row.baselinePick !== 'Pass')

const summarizePickRows = (items, pickKey = 'pick') => {
  const eligible = items.filter((row) => row[pickKey] && row[pickKey] !== 'Pass')
  const hits = eligible.filter((row) => (row[pickKey] === 'Run') === Boolean(row.actual)).length
  return {
    rows: eligible.length,
    hits,
    misses: eligible.length - hits,
    hitRate: eligible.length ? round((hits / eligible.length) * 100, 1) : null
  }
}

const summarizeAtThreshold = (items, thresholdPct) => {
  const threshold = thresholdPct / 100
  const eligible = items
    .map((row) => ({
      ...row,
      thresholdPick: row.probability >= threshold ? 'Run' : row.probability <= 1 - threshold ? 'No run' : 'Pass'
    }))
    .filter((row) => row.thresholdPick !== 'Pass')
  const hits = eligible.filter((row) => (row.thresholdPick === 'Run') === Boolean(row.actual)).length
  return {
    thresholdPct,
    rows: eligible.length,
    hits,
    misses: eligible.length - hits,
    hitRate: eligible.length ? round((hits / eligible.length) * 100, 1) : null,
    avgConfidencePct: eligible.length ? round(mean(eligible.map((row) => Math.max(row.probability, 1 - row.probability))) * 100, 1) : null
  }
}

const byInning = {}
for (let inning = 1; inning <= 5; inning += 1) {
  const inningRows = rows.filter((row) => row.inning === inning)
  byInning[inning] = {
    rows: inningRows.length,
    runRate: round(mean(inningRows.map((row) => row.actual)) * 100, 1),
    brier: round(brier(inningRows), 4),
    baselineBrier: round(mean(inningRows.map((row) => (row.baselineProbability - row.actual) ** 2)), 4),
    picks: summarizePickRows(pickRows.filter((row) => row.inning === inning))
  }
}

const calibration = {}
for (const row of rows) {
  const key = bucket(row.probability)
  const list = calibration[key] || []
  list.push(row)
  calibration[key] = list
}
const calibrationSummary = Object.fromEntries(
  Object.entries(calibration).map(([key, list]) => [
    key,
    {
      rows: list.length,
      avgProbability: round(mean(list.map((row) => row.probability)) * 100, 1),
      actualRunRate: round(mean(list.map((row) => row.actual)) * 100, 1),
      brier: round(brier(list), 4)
    }
  ])
)

const coverageSummary = {
  rowsWithAnyStatcast: rows.filter((row) => row.coverage.statcastPct > 0).length,
  rowsWithFullStatcast: rows.filter((row) => row.coverage.statcastPct >= 99).length,
  rowsWithStarterForm: rows.filter((row) => row.coverage.starters === 2).length,
  rowsWithAnyTeamMarketAnchor: rows.filter((row) => row.coverage.teamMarkets > 0).length,
  rowsWithAnyPitcherMarketAnchor: rows.filter((row) => row.coverage.pitcherMarkets > 0).length,
  avgStatcastPct: round(mean(rows.map((row) => row.coverage.statcastPct)), 1),
  avgSplitPct: round(mean(rows.map((row) => row.coverage.splitPct)), 1),
  avgMatchupPct: round(mean(rows.map((row) => row.coverage.matchupPct)), 1)
}

const severeMisses = pickRows
  .filter((row) => Math.abs(row.probability - row.actual) >= 0.58)
  .sort((left, right) => Math.abs(right.probability - right.actual) - Math.abs(left.probability - left.actual))
  .slice(0, 15)
  .map((row) => ({
    date: row.date,
    title: row.title,
    inning: row.inning,
    pick: row.pick,
    probabilityPct: round(row.probability * 100, 1),
    actualRuns: row.actualRuns,
    awaySlots: row.awaySlots,
    homeSlots: row.homeSlots,
    awayBatterScore: row.awayBatterScore,
    homeBatterScore: row.homeBatterScore,
    awayStarterRisk: row.awayStarterRisk,
    homeStarterRisk: row.homeStarterRisk
  }))

const report = {
  generatedAt: new Date().toISOString(),
  model: 'inning-expected-batters-shadow-v1',
  startDate,
  endDate,
  rows: rows.length,
  summary: {
    brier: round(brier(rows), 4),
    baselineBrier: round(mean(rows.map((row) => (row.baselineProbability - row.actual) ** 2)), 4),
    modelPicks: summarizePickRows(pickRows),
    baselinePicks: summarizePickRows(baselinePickRows, 'baselinePick')
  },
  thresholdSummary: [52, 55, 58, 60].map((threshold) => summarizeAtThreshold(rows, threshold)),
  coverage: coverageSummary,
  byInning,
  calibration: calibrationSummary,
  severeMisses,
  sampleRows: rows.slice(0, 20).map((row) => ({
    date: row.date,
    title: row.title,
    inning: row.inning,
    probabilityPct: round(row.probability * 100, 1),
    baselineProbabilityPct: round(row.baselineProbability * 100, 1),
    actualRuns: row.actualRuns,
    awaySlots: row.awaySlots,
    homeSlots: row.homeSlots,
    awayBatterScore: row.awayBatterScore,
    homeBatterScore: row.homeBatterScore
  }))
}

fs.mkdirSync(path.dirname(outPath), { recursive: true })
fs.writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`)
console.log(JSON.stringify({
  out: path.relative(rootDir, outPath),
  rows: report.rows,
  brier: report.summary.brier,
  baselineBrier: report.summary.baselineBrier,
  modelPicks: report.summary.modelPicks,
  baselinePicks: report.summary.baselinePicks
}, null, 2))
