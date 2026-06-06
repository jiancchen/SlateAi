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
      g.away_team_id,
      away.name as away_team,
      away.abbreviation as away_abbreviation,
      g.home_team_id,
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

export const startingPitchersForDate = (date) => {
  return querySqlite(
    `
    select
      sp.game_id,
      sp.team_id,
      teams.name as team_name,
      players.player_id,
      players.mlb_player_id,
      players.name as pitcher_name,
      players.throws,
      sp.confirmation_status,
      sp.source_name,
      sp.updated_at
    from starting_pitchers sp
    join games g on g.game_id = sp.game_id
    join teams on teams.team_id = sp.team_id
    join players on players.player_id = sp.pitcher_id
    where g.game_date like ?
      and sp.source_name = 'mlb_probables'
    order by g.start_time_utc, teams.name
    `,
    [`${date}%`]
  )
}

export const lineupSlotsForDate = (date) => {
  const status = queryOneSqlite(
    `
    select notes
    from source_fetch_status
    where sport = 'mlb'
      and source_name = 'mlb_lineups'
      and source_date = ?
    `,
    [date]
  )
  const sourceSnapshotId = parseJson(status?.notes)?.source_snapshot_id || null
  return querySqlite(
    `
    select
      l.game_id,
      l.team_id,
      teams.name as team_name,
      l.lineup_id,
      l.lineup_status,
      slots.batting_order,
      slots.position,
      players.player_id,
      players.mlb_player_id,
      players.name as player_name,
      players.bats,
      players.primary_position
    from lineups l
    join games g on g.game_id = l.game_id
    join teams on teams.team_id = l.team_id
    left join lineup_slots slots on slots.lineup_id = l.lineup_id
    left join players on players.player_id = slots.player_id
    where g.game_date like ?
      and (? is null or l.source_snapshot_id = ?)
    order by g.start_time_utc, teams.name, slots.batting_order
    `,
    [`${date}%`, sourceSnapshotId, sourceSnapshotId]
  )
}

export const marketContractsForDate = (date) => {
  return querySqlite(
    `
    select
      contracts.contract_id,
      contracts.game_id,
      contracts.source_name,
      contracts.contract_ticker,
      contracts.market_type,
      contracts.market_family,
      contracts.selection_type,
      contracts.selection_code,
      contracts.selection_name,
      contracts.line_value,
      contracts.title,
      contracts.team_id,
      teams.name as team_name,
      snapshots.odds_american,
      snapshots.price_cents,
      snapshots.implied_probability,
      snapshots.captured_at
    from market_contracts contracts
    join games g on g.game_id = contracts.game_id
    left join teams on teams.team_id = contracts.team_id
    left join market_snapshots snapshots on snapshots.market_snapshot_id = (
      select snapshots2.market_snapshot_id
      from market_snapshots snapshots2
      where snapshots2.game_id = contracts.game_id
        and snapshots2.source_name = contracts.source_name
        and snapshots2.market_type = contracts.market_type
        and snapshots2.selection = contracts.selection_name
        and coalesce(snapshots2.line_value, -999999) = coalesce(contracts.line_value, -999999)
      order by snapshots2.captured_at desc
      limit 1
    )
    where g.game_date like ?
    order by
      g.start_time_utc,
      case contracts.source_name
        when 'draftkings' then 0
        when 'fanduel_research' then 1
        when 'kalshi' then 2
        when 'robinhood' then 3
        else 9
      end,
      contracts.market_type,
      contracts.selection_name
    `,
    [`${date}%`]
  )
}

export const currentDayBoardForDate = (date) => {
  const games = gamesForDate(date)
  const lineupCoverage = lineupCoverageForDate(date)
  const sourceStatus = sourceStatusMapForDate(date)
  const starters = startingPitchersForDate(date)
  const slots = lineupSlotsForDate(date)
  const markets = marketContractsForDate(date)

  const gameMap = new Map(games.map((game) => [game.game_id, { ...game, starters: [], lineups: {}, markets: [] }]))

  for (const starter of starters) {
    gameMap.get(starter.game_id)?.starters.push(starter)
  }

  for (const slot of slots) {
    const game = gameMap.get(slot.game_id)
    if (!game) continue
    if (!game.lineups[slot.team_id]) {
      game.lineups[slot.team_id] = {
        team_id: slot.team_id,
        team_name: slot.team_name,
        lineup_id: slot.lineup_id,
        lineup_status: slot.lineup_status,
        slots: []
      }
    }
    if (slot.batting_order !== null && slot.batting_order !== undefined) {
      game.lineups[slot.team_id].slots.push(slot)
    }
  }

  for (const market of markets) {
    gameMap.get(market.game_id)?.markets.push(market)
  }

  return {
    date,
    games: [...gameMap.values()],
    coverage: {
      lineup: lineupCoverage,
      starters: starters.length,
      markets: markets.length,
      source_status: sourceStatus
    }
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
