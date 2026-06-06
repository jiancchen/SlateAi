# MLB Ingestion Pipeline Run Plan

Generated: 2026-06-02

## Goal

Move active MLB ingestion to the same DB-first contract proven by the tennis pilot:

```text
source fetch -> raw archive receipt -> source_fetch_runs/status -> typed sql-mlb.db facts -> duck-mlb.duckdb analytics copy -> DB-derived exports
```

This plan does not cut over model inputs yet. The first phase is ingestion plumbing only: raw receipts and active fetch outputs must write typed MLB tables, source status, and validation reports before any MLB cartridge is allowed to trust the DB as the only input path.

## Current State

- `sql-mlb.db` exists and has a wide typed foundation.
- `duck-mlb.duckdb` is rebuildable from `sql-mlb.db`.
- MLB normalization modules exist under `pipeline/sources/mlb/normalization/`.
- Historical normalization/backfill has already populated major typed tables.
- Active MLB model/publish scripts still rely heavily on `pipeline/mlb/warehouse/mlb_warehouse.py`, legacy `sports.db`, generated modules, raw folders, and cartridge-local JSON outputs.
- `source_fetch_policies` currently has only coarse MLB policies:
  - `mlb_raw_daily`
  - `mlb_stats_api`
  - `baseballsavant`
  - `mlb_odds`
- `source_fetch_status` has no current MLB rows yet, so no MLB prediction lane can be considered DB-preflight-ready.

## Source Family Contracts

The first MLB pipeline task is to split the four coarse policies into source families that match model lanes and validation needs.

| Source Family | Required Lane | TTL | Max Stale | Raw Sources | Primary Typed Targets |
|---|---:|---:|---:|---|---|
| `mlb_schedule` | prediction, value, props | 6h | 24h | `data-private/raw/mlb/<date>/schedule*.json`, MLB Stats schedule API | `games`, `teams`, `venues`, `starting_pitchers`, `source_snapshots` |
| `mlb_game_feed` | prediction, postgame, settlement | 6h | 24h | `data-private/raw/mlb/<date>/games/**`, MLB feed/live | `plate_appearances`, `pitch_events`, `game_outcomes`, `team_game_stats`, `player_game_batting`, `pitcher_appearances`, `phase_outcomes` |
| `mlb_lineups` | prediction, value, props | 1h | 6h | official MLB feed lineups, RotoWire supplement, `data-private/lineups/mlb/*.json` | `lineups`, `lineup_slots`, `lineup_matchup_snapshots`, `lineup_shape_snapshots` |
| `mlb_probables` | prediction, value | 3h | 12h | MLB schedule/probables, probable-change monitor | `starting_pitchers`, `source_fetch_status`, probable-change receipts |
| `baseballsavant_hitter_statcast` | props, HR, batter board | 24h | 72h | `data-private/raw/baseballsavant/hitter-statcast/<date>` | `player_statcast_snapshots`, `player_statcast_game_logs`, `player_pitch_type_response_snapshots`, `player_current_deviation_snapshots`; lineup publish must carry 7-game and 30-day xwOBA bubbles |
| `mlb_player_context` | props, HR, low-sample guards | 24h | 72h | MLB Stats player profiles, Baseball Savant splits, Baseball Reference WAR | `player_career_profiles`, `player_split_snapshots`, `player_identity_profiles`, `pitcher_season_value_snapshots` |
| `mlb_pitcher_features` | prediction, value, props | 12h | 48h | MLB feed/live, Statcast pitch/arsenal pulls, derived raw profile files | `pitcher_pitch_mix_snapshots`, `pitcher_first_inning_profiles`, `pitcher_mistake_shape_snapshots`, `starting_pitcher_form_snapshots`, `starter_leash_profiles`, `starter_third_time_penalty_profiles` |
| `mlb_bullpen_features` | prediction, value, late-game lanes | 12h | 48h | derived bullpen usage/profile rows, relief-chain sources | `bullpen_usage_snapshots`, `bullpen_mistake_shape_snapshots`, `team_bullpen_shape_snapshots`, `reliever_command_profiles`, `likely_relief_chains` |
| `mlb_team_features` | prediction, value | 12h | 48h | derived team trend/story rows | `team_feature_snapshots`, `team_state_snapshots`, `team_rolling_form_snapshots`, `team_opponent_quality_snapshots`, `team_first_inning_profiles` |
| `mlb_environment` | totals, HR, game-shape | 3h | 12h | weather, venue, park factor, sun position calculations | `game_environment_snapshots`, `game_sun_visibility_snapshots`, `game_visibility_outcomes` |
| `mlb_odds` | value, market | 1h | 6h | DraftKings MLB BFF game lines, FanDuel, Kalshi, Robinhood, historical odds raw folders | `market_contracts`, `market_price_ticks`, `market_snapshots`, `market_mispricing_labels` |
| `mlb_props` | props, HR, batter board | 1h | 6h | FanDuel/PrizePicks/prop captures where present | `prop_market_snapshots`, `prop_backtest_rows`, player prop prediction rows |
| `mlb_game_shape` | M2 training/value | 12h | 48h | derived game-shape/state formula artifacts | `state_formula_training_rows`, `state_formula_backtests`, `side_backtest_rows`, `component_settlement_rows` |
| `mlb_model_artifacts` | model history | 24h | 72h | `data-private/model-runs/mlb`, prediction artifacts | `model_runs`, `model_component_runs`, `model_run_lanes`, `model_artifacts`, `prediction_rows`, `settlement_rows` |

## Lane Preflight Rules

Preflight must read `source_fetch_status`, not raw folders.

| Lane | Required Families |
|---|---|
| `prediction` | `mlb_schedule`, `mlb_game_feed`, `mlb_lineups`, `mlb_probables`, `mlb_pitcher_features`, `mlb_bullpen_features`, `mlb_team_features`, `mlb_environment` |
| `value` | prediction families plus `mlb_odds` |
| `props` | `mlb_schedule`, `mlb_game_feed`, `mlb_lineups`, `baseballsavant_hitter_statcast`, `mlb_player_context`, `mlb_pitcher_features`, `mlb_odds`, `mlb_props` |
| `market` | `mlb_odds`, `mlb_props` where the board includes prop markets |
| `postgame` | `mlb_schedule`, `mlb_game_feed`, `mlb_model_artifacts` |
| `m2_training` | `mlb_game_feed`, `mlb_lineups`, `mlb_pitcher_features`, `mlb_bullpen_features`, `mlb_team_features`, `mlb_environment`, `mlb_game_shape` |

If a lane is stale, the runner may generate a degraded research report only when explicitly flagged. It must not publish betting/value-board output as fresh.

## Phase Plan

### Phase M9A: MLB Source Policy Split

- Replace coarse MLB policy rows with source-family rows above.
- Keep old coarse names as aliases only if existing scripts still refer to them.
- Add policy notes that name the parser, raw folder, and target typed tables.
- Validate policies and produce a report.

### Phase M9B: Schedule And Game Feed Adapter

- Build a no-network adapter for existing local raw MLB schedule/game-feed files.
- Register raw receipts into `source_snapshots`.
- Upsert `games`, `teams`, `venues`, `starting_pitchers`, `plate_appearances`, `pitch_events`, and result/outcome typed rows.
- Write `source_fetch_runs` and `source_fetch_status`.
- Rerun the adapter twice and prove row counts do not inflate.

### Phase M9C: Lineups And Probables Adapter

- Promote official MLB lineups and RotoWire supplements into `lineups`, `lineup_slots`, `lineup_matchup_snapshots`, and `lineup_shape_snapshots`.
- Enforce the lineup invariant: every complete MLB lineup has exactly 9 hitter slots. A raw board with 1-8 listed hitters is `partial`, not a valid short lineup; a missing side is `pending`.
- Source completeness is measured against `game_count * 2 teams * 9 hitters`, so incomplete or not-yet-posted sides block strict prediction lanes.
- Preserve status: `complete`, `partial`, `pending`, plus source labels only when they do not contradict slot coverage.
- Upsert probable pitcher changes into the same canonical game/starter rows.
- Validate batting-order uniqueness per team/game.

### Phase M9D: Baseball Savant And Player Context Adapter

- Promote hitter Statcast, splits, career, and low-sample context into typed player context tables.
- Refresh hitter Statcast game logs before lineup generation, then rebuild 7-game and 30-day xwOBA trend snapshots for the slate date.
- Public MLB lineups must expose a compact xwOBA bubble per hitter: recent `7g` xwOBA plus longer `30d` xwOBA, with source data coming from Baseball Savant trend snapshots.
- Preserve sample sizes and date ranges. Do not turn career context into a high-weight signal by default.
- Validate player ID joins and unresolved count.

### Phase M9E: Pitcher, Bullpen, Team, Environment Adapters

- Promote existing derived raw/profile rows into typed feature tables.
- Environment includes weather, park, and sun-position/visibility rows.
- Validate every game on a prediction slate has enough environment/park context to avoid silent `N/A`.

### Phase M9F: Markets, Odds, And Props Adapter

- Fetch DraftKings MLB game lines from `https://sportsbook.draftkings.com/leagues/baseball/mlb` via the Sportsbook BFF before prediction generation.
- Promote DraftKings full-game ML/runline/total and first-five ML/runline/total into `market_contracts`, `market_price_ticks`, and `market_snapshots`.
- Promote FanDuel/Kalshi/Robinhood moneyline, runline, total, F5, props, and market-contract snapshots where those sources are available.
- Public MLB value output must compare first-five expected runs to the posted DraftKings first-five total when present; the run-share-derived F5 line is only a fallback and must be labeled as such.
- Keep price ticks/candles separate from current market snapshots.
- Validate value board can show confidence, EV, price, and source freshness without reading generated JSON.

### Phase M9G: MLB Preflight Gate

- Extend `data-migration/scripts/prediction_preflight.mjs` with MLB lane rules.
- Reports must show which source family blocks which lane.
- Gate MLB cartridge runners after reports are validated.

### Phase M9H: DB-First Model Input Cutover

- Only after M9A-M9G pass.
- Convert MLB-M2/M0 lanes from legacy warehouse/generation dependencies to typed SQLite/DuckDB reads.
- Prediction outputs write DB-first, then export JSON/site mirrors.

## Validation Contract Per Phase

Each source family must have:

- dry-run report
- write report
- rerun idempotency report
- validator report
- DuckDB rebuild report
- source freshness status row
- unresolved entity count
- duplicate/orphan check
- ledger row updated to `validated` or `blocked`

For the batter board specifically, public-slate audit must fail when most posted lineup hitters do not have both 7-game and 30-day xwOBA values. Missing xwOBA is a source/data failure, not a UI fallback.

For the MLB value board, public-slate audit must fail when DraftKings full-game ML/total or first-five ML/total lines are missing from a posted game. First-five totals must carry `first5TotalLineSource: "posted"` when DraftKings provides the market.

## Stop Conditions

Stop before implementation or promotion if:

- active ingestion must read `published-data` to discover MLB games
- same-source rerun inflates typed facts
- source status says fresh but typed facts are missing
- ambiguous teams/players/markets are guessed instead of quarantined
- value/prop board freshness cannot be separated from non-market model lanes
- model behavior changes before DB typed source parity is proven

## First Implementation Target

Start with Phase M9A, then M9B:

```text
data-private/raw/mlb/<date> -> mlb_schedule/mlb_game_feed source families -> typed schedule/game/feed tables -> source_fetch_status -> DuckDB rebuild
```

This is the MLB spine. Lineups, markets, props, Savant, and M2 game-shape layers should not be wired until this spine has deterministic receipt IDs, typed row upserts, and rerun idempotency.
