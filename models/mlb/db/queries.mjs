import { queryOneSqlite, querySqlite } from './sqlite.mjs'

export const gamesForDate = (date) => {
  return querySqlite(
    `
    select
      g.game_id,
      g.mlb_game_pk,
      g.game_date,
      g.start_time_utc,
      g.status,
      away.name as away_team,
      away.abbreviation as away_abbreviation,
      home.name as home_team,
      home.abbreviation as home_abbreviation,
      v.name as venue_name
    from games g
    join teams away on away.team_id = g.away_team_id
    join teams home on home.team_id = g.home_team_id
    left join venues v on v.venue_id = g.venue_id
    where g.game_date like ?
    order by coalesce(g.start_time_utc, g.game_date), away.name, home.name
    `,
    [`${date}%`]
  )
}

export const sourceStatusForDate = (date) => {
  return querySqlite(
    `
    select
      source_name,
      source_family,
      last_status,
      last_completeness_status,
      expected_item_count,
      actual_item_count,
      missing_item_count,
      unresolved_count,
      cache_valid_until,
      notes
    from source_fetch_status
    where sport = 'mlb'
      and source_date = ?
    order by source_name
    `,
    [date]
  )
}

export const sourceStatusMapForDate = (date) => {
  return Object.fromEntries(sourceStatusForDate(date).map((row) => [row.source_name, row]))
}

const parseJson = (text) => {
  if (!text) return null
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

export const lineupCoverageForDate = (date) => {
  const status = queryOneSqlite(
    `
    select last_status, last_completeness_status, expected_item_count, actual_item_count, missing_item_count, notes
    from source_fetch_status
    where sport = 'mlb'
      and source_name = 'mlb_lineups'
      and source_date = ?
    `,
    [date]
  )
  const sourceSnapshotId = parseJson(status?.notes)?.source_snapshot_id || null
  const typed = queryOneSqlite(
    `
    with slate_games as (
      select game_id from games where game_date like ?
    ),
    scoped_lineups as (
      select l.*
      from lineups l
      join slate_games g on g.game_id = l.game_id
      where (? is not null and l.source_snapshot_id = ?)
         or (? is null and l.captured_at = (
           select max(l2.captured_at)
           from lineups l2
           where l2.game_id = l.game_id
             and l2.team_id = l.team_id
         ))
    )
    select
      (select count(*) from slate_games) as games,
      count(distinct scoped_lineups.lineup_id) as lineups,
      count(slots.player_id) as slots,
      count(distinct case when scoped_lineups.lineup_status = 'partial' then scoped_lineups.lineup_id end) as partial_lineups,
      count(distinct case when scoped_lineups.lineup_status = 'pending' then scoped_lineups.lineup_id end) as pending_lineups
    from scoped_lineups
    left join lineup_slots slots on slots.lineup_id = scoped_lineups.lineup_id
    `,
    [`${date}%`, sourceSnapshotId, sourceSnapshotId, sourceSnapshotId]
  )
  const games = Number(typed.games || 0)
  return {
    games,
    expected_slots: games * 2 * 9,
    lineups: Number(typed.lineups || 0),
    slots: Number(typed.slots || 0),
    partial_lineups: Number(typed.partial_lineups || 0),
    pending_lineups: Number(typed.pending_lineups || 0),
    source_snapshot_id: sourceSnapshotId,
    source_status: status
      ? {
          last_status: status.last_status,
          last_completeness_status: status.last_completeness_status,
          expected_item_count: status.expected_item_count,
          actual_item_count: status.actual_item_count,
          missing_item_count: status.missing_item_count
        }
      : null
  }
}

export const marketCoverageForDate = (date) => {
  const summary = queryOneSqlite(
    `
    select
      count(distinct contracts.contract_id) as contracts,
      count(distinct snapshots.market_snapshot_id) as snapshots,
      count(distinct ticks.market_price_tick_id) as ticks,
      count(distinct contracts.game_id) as games_with_contracts
    from games g
    left join market_contracts contracts on contracts.game_id = g.game_id
    left join market_snapshots snapshots on snapshots.game_id = g.game_id
    left join market_price_ticks ticks on ticks.contract_id = contracts.contract_id
    where g.game_date like ?
    `,
    [`${date}%`]
  ) || {}
  const byType = querySqlite(
    `
    select
      coalesce(market_type, 'unknown') as market_type,
      count(*) as contracts
    from market_contracts contracts
    join games g on g.game_id = contracts.game_id
    where g.game_date like ?
    group by coalesce(market_type, 'unknown')
    order by contracts desc, market_type
    `,
    [`${date}%`]
  )
  return {
    contracts: Number(summary.contracts || 0),
    snapshots: Number(summary.snapshots || 0),
    ticks: Number(summary.ticks || 0),
    games_with_contracts: Number(summary.games_with_contracts || 0),
    by_market_type: byType
  }
}

export const modelArtifactCoverageForDate = (date) => {
  const rows = querySqlite(
    `
    select
      prediction_rows.lane,
      count(*) as rows
    from prediction_rows
    join model_runs on model_runs.model_run_id = prediction_rows.model_run_id
    where model_runs.sport = 'mlb'
      and model_runs.run_date = ?
    group by prediction_rows.lane
    order by rows desc, prediction_rows.lane
    `,
    [date]
  )
  const settlement = queryOneSqlite(
    `
    select count(*) as rows
    from settlement_rows
    join prediction_rows on prediction_rows.prediction_row_id = settlement_rows.prediction_row_id
    join model_runs on model_runs.model_run_id = prediction_rows.model_run_id
    where model_runs.sport = 'mlb'
      and model_runs.run_date = ?
    `,
    [date]
  )
  return {
    prediction_rows_by_lane: rows,
    settlement_rows: Number(settlement?.rows || 0)
  }
}
