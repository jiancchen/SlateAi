# Sport DB Migration Plan

## Purpose

This plan turns the file-heavy sports warehouse into sport-specific databases without deleting or mutating the current legacy warehouse.

The immediate targets are:

- `data-private/warehouse/sports/mlb/mlb.db`
- `data-private/warehouse/sports/tennis/tennis.db`

The legacy DB stays untouched:

- `data-private/warehouse/sports.db`

DuckDB analytics databases are also split by sport:

- `data-private/warehouse/analytics/mlb.duckdb`
- `data-private/warehouse/analytics/tennis.duckdb`

No sport should require cross-sport joins. If a future sport is added, it gets its own SQLite source-of-truth DB and its own DuckDB analytics DB.

## Non-Deletion Rule

- Do not delete source JSON, raw archives, published data, or legacy DB files during migration.
- Do not mutate `data-private/warehouse/sports.db`.
- Do not promote a new DB into production reads until it has row-count, checksum, and model-output validation.
- Generated JSON remains allowed, but only as cache/export after the DB source of truth is validated.

## Existing DB Inventory

| DB | Current role | Size | Objects | Migration disposition |
|---|---:|---:|---:|---|
| `data-private/warehouse/sports.db` | Legacy mixed-sport warehouse | 2.2 GB | 122 | Freeze. Use as primary backfill input. Never mutate during migration. |
| `data-private/warehouse/snapshots/2026-05-30/sports-2026-05-30.db` | Historical snapshot | 1.6 GB | not primary | Keep as checkpoint/reference. Do not migrate from it unless `sports.db` is missing a row. |
| `data-private/warehouse/tennis.db` | Empty current placeholder | 0 B | 0 | Ignore as source. New tennis DB should live under `warehouse/sports/tennis/`. |
| `data-private/tennis.db` | Empty root placeholder | 0 B | 0 | Ignore as source. Archive only after migration is complete. |

## Target DB Layout

```text
data-private/
  warehouse/
    sports.db                    # legacy mixed-sport DB, frozen
    sports/
      mlb/
        mlb.db                   # new MLB source of truth
        migrations/
        checks/
      tennis/
        tennis.db                # new tennis source of truth
        migrations/
        checks/
    analytics/
      mlb.duckdb                 # MLB feature/backtest/training engine
      tennis.duckdb              # tennis feature/backtest/training engine
```

## Current Data Folder Inventory

| Folder | Files | Size | Current role | Migration target | Status |
|---|---:|---:|---|---|---|
| `data-private/raw/mlb/` | 1,889 | 146 MB | MLB raw daily API/source payloads | MLB raw-source tables plus immutable archive references | Not started |
| `data-private/raw/mlb-stats-api/` | 55 | 9.3 MB | MLB Stats API career/profile payloads | MLB player profile/source snapshot tables | Not started |
| `data-private/raw/baseballsavant/` | 136 | 356 MB | Baseball Savant hitter/pitcher payloads | MLB statcast/profile/source snapshot tables | Not started |
| `data-private/raw/statcast/` | 1 | 32 KB | Statcast source files and HR leaderboards | MLB event/profile source tables | Not started |
| `data-private/raw/baseball-reference/` | 6 | 87 MB | Baseball Reference WAR/pitch data | MLB pitcher/team profile tables | Not started |
| `data-private/raw/kalshi/mlb/` | 1 | 384 KB | Raw Kalshi MLB market captures | MLB market snapshot tables | Not started |
| `data-private/odds/kalshi/mlb/` | 2 | 720 KB | Kalshi odds artifacts | MLB market snapshot tables | Not started |
| `data-private/odds/robinhood/mlb/` | 1 | 12 KB | Robinhood MLB prediction market artifacts | MLB market snapshot tables | Not started |
| `data-private/odds/robinhood/tennis/` | 1 | 604 KB | Robinhood tennis prediction market artifacts | Tennis market snapshot tables | Not started |
| `data-private/raw/odds/fanduel-research/` | 128 | 44 MB | FanDuel research/line captures | Sport-specific sportsbook line tables | Not started |
| `data-private/reference/tennis/` | 1,525 | 76 MB | Tennis Flashscore/SofaScore/LiveSport/ranking reference payloads | Tennis source, stat, replay, ranking, H2H tables | Not started |
| `data-private/predictions/mlb-home-runs/` | 18 | 7.4 MB | MLB generated HR predictions | MLB prediction/value/settlement tables | Not started |
| `data-private/predictions/mlb-market-fitness/` | 9 | 48 KB | MLB market-fitness outputs | MLB prediction/value/settlement tables | Not started |
| `data-private/predictions/mlb-player-props/` | 17 | 1.8 MB | MLB prop predictions | MLB prediction/value/settlement tables | Not started |
| `data-private/predictions/mlb-player-props-legacy/` | 11 | 6.8 MB | Legacy MLB prop predictions | MLB prediction/value/settlement tables | Not started |
| `data-private/predictions/mlb-reliever-shadow/` | 4 | 284 KB | MLB reliever shadow outputs | MLB prediction/value/settlement tables | Not started |
| `data-private/predictions/mlb-sides/` | 23 | 4.5 MB | MLB side/value predictions | MLB prediction/value/settlement tables | Not started |
| `data-private/predictions/tennis/` | 15 | 1.1 MB | Tennis generated predictions and value books | Tennis prediction/value/settlement tables | Not started |
| `data-private/model-runs/mlb/` | 16 | 1.8 MB | MLB model run manifests/artifacts | MLB model run tables and artifact references | Not started |
| `data-private/model-runs/tennis/` | 8 | 460 KB | Tennis model run manifests/artifacts | Tennis model run tables and artifact references | Not started |
| `data-private/model-cartridges/mlb/` | 1 | 268 KB | MLB private cartridge artifacts | Keep as files; reference from MLB model tables | Not started |
| `data-private/model-cartridges/tennis/` | 2 | 56 KB | Tennis private cartridge artifacts | Keep as files; reference from Tennis model tables | Not started |
| `data-private/model-training/` | 1 | 56 KB | Training rows and generated feature artifacts | DuckDB feature tables plus source references | Not started |
| `data-private/reports/` | 65 | 2.6 MB | Postmortems, reports, one-off summaries | Keep docs; add report registry rows if model-critical | Not started |
| `data-private/history/` | 23 | 11 MB | Historical model/performance artifacts | Sport-specific prediction/settlement history | Not started |
| `published-data/` | 1,698 | 212 MB | Public deployable JSON | DB-derived export cache only | Not started |
| `web/public/data/` | 795 | 211 MB | Public web mirror | DB-derived export cache only | Not started |
| `web/src/lib/` | 166 | 140 MB | Static imports and generated day modules | Replace with DB/export loaders where possible | Not started |

## Migration Status Ledger

Every migration script should update a ledger row or a markdown row with this shape:

| Field | Meaning |
|---|---|
| `source_path_or_table` | Legacy folder/file/table being migrated |
| `sport` | `mlb`, `tennis`, or future sport |
| `target_db` | Destination SQLite DB |
| `target_table` | Destination table or group |
| `status` | `not_started`, `backfilled`, `validated`, `promoted`, `blocked` |
| `row_count_source` | Source row count or file count |
| `row_count_target` | Target row count |
| `checksum` | Hash of stable source/target fields when possible |
| `migration_script` | Script that performed the migration |
| `validation_query` | Query or test used to prove the backfill |
| `notes` | Gaps, duplicates, fuzzy matching issues, or blocked rows |

## Shared Schema Conventions

Each sport DB should have these system tables. The tables are sport-local even if names repeat across sports.

### `schema_migrations`

Tracks schema changes in the sport DB.

```sql
create table schema_migrations (
  migration_id text primary key,
  applied_at text not null,
  description text not null,
  checksum text not null
);
```

### `source_snapshots`

Tracks raw/source payloads without forcing every payload into normalized rows immediately.

```sql
create table source_snapshots (
  source_snapshot_id text primary key,
  source_name text not null,
  sport text not null,
  source_url text,
  local_path text,
  captured_at text,
  source_date text,
  content_hash text,
  content_type text,
  status text not null default 'captured',
  notes text
);
```

### `model_runs`

Sport-local run metadata. A tennis run and MLB run can both have `M0`-style lineage without name collision because they live in separate DBs.

```sql
create table model_runs (
  model_run_id text primary key,
  sport text not null,
  model_id text not null,
  model_version text,
  run_date text not null,
  run_type text not null,
  status text not null,
  cartridge_path text,
  manifest_path text,
  input_hash text,
  output_hash text,
  created_at text not null,
  notes text
);
```

### `model_artifacts`

References model cards, runbooks, reports, generated prediction snapshots, and postmortems.

```sql
create table model_artifacts (
  artifact_id text primary key,
  model_run_id text not null,
  artifact_type text not null,
  local_path text not null,
  content_hash text,
  created_at text,
  foreign key (model_run_id) references model_runs(model_run_id)
);
```

### `health_checks`

Stores pipeline health coverage instead of burying it in logs.

```sql
create table health_checks (
  health_check_id text primary key,
  model_run_id text,
  check_name text not null,
  status text not null,
  expected_count integer,
  actual_count integer,
  details_json text,
  checked_at text not null
);
```

## MLB Target Schema

### MLB Core Tables

```sql
create table teams (
  team_id text primary key,
  mlb_team_id integer unique,
  name text not null,
  abbreviation text,
  league text,
  division text,
  active integer not null default 1
);

create table players (
  player_id text primary key,
  mlb_player_id integer unique,
  name text not null,
  bats text,
  throws text,
  primary_position text,
  birth_date text,
  active integer not null default 1
);

create table venues (
  venue_id text primary key,
  mlb_venue_id integer unique,
  name text not null,
  city text,
  state text,
  latitude real,
  longitude real,
  roof_type text,
  orientation_degrees real
);

create table games (
  game_id text primary key,
  mlb_game_pk integer unique,
  game_date text not null,
  start_time_utc text,
  home_team_id text not null,
  away_team_id text not null,
  venue_id text,
  status text,
  series_game_number integer,
  season integer,
  source_snapshot_id text,
  foreign key (home_team_id) references teams(team_id),
  foreign key (away_team_id) references teams(team_id),
  foreign key (venue_id) references venues(venue_id)
);
```

### MLB Participation And Lineups

```sql
create table starting_pitchers (
  game_id text not null,
  team_id text not null,
  pitcher_id text not null,
  confirmation_status text,
  source_name text,
  updated_at text,
  primary key (game_id, team_id, pitcher_id)
);

create table lineups (
  lineup_id text primary key,
  game_id text not null,
  team_id text not null,
  lineup_status text not null,
  captured_at text not null,
  source_snapshot_id text
);

create table lineup_slots (
  lineup_id text not null,
  batting_order integer not null,
  player_id text not null,
  position text,
  primary key (lineup_id, batting_order)
);
```

### MLB Event And Outcome Tables

Existing mixed-warehouse tables to migrate into this group include `mlb_pitch_events`, `mlb_plate_appearances`, `mlb_player_game_batting`, `mlb_pitcher_appearances`, `mlb_game_team_stats`, and `mlb_game_outcomes`.

```sql
create table plate_appearances (
  plate_appearance_id text primary key,
  game_id text not null,
  inning integer,
  inning_half text,
  batter_id text,
  pitcher_id text,
  batting_team_id text,
  pitching_team_id text,
  event_type text,
  rbi integer,
  runs_scored integer,
  outs_on_play integer,
  win_expectancy_delta real,
  source_snapshot_id text
);

create table pitch_events (
  pitch_event_id text primary key,
  plate_appearance_id text,
  game_id text not null,
  pitch_number integer,
  pitch_type text,
  pitch_result text,
  release_speed real,
  zone integer,
  launch_speed real,
  launch_angle real,
  hit_location text,
  is_in_play integer,
  source_snapshot_id text
);

create table game_outcomes (
  game_id text primary key,
  home_runs integer,
  away_runs integer,
  total_runs integer,
  f5_home_runs integer,
  f5_away_runs integer,
  f5_total_runs integer,
  winner_team_id text,
  completed_at text
);
```

### MLB Feature Tables

Existing mixed-warehouse tables to migrate into this group include rolling form, bullpen shape, pitcher mistake shape, lineup conversion shape, sun visibility, weather, market context, and player state tables.

```sql
create table team_feature_snapshots (
  feature_snapshot_id text primary key,
  team_id text not null,
  game_id text,
  snapshot_date text not null,
  feature_family text not null,
  features_json text not null,
  source_model text,
  created_at text
);

create table player_feature_snapshots (
  feature_snapshot_id text primary key,
  player_id text not null,
  game_id text,
  snapshot_date text not null,
  feature_family text not null,
  features_json text not null,
  sample_size integer,
  created_at text
);

create table game_environment_snapshots (
  environment_snapshot_id text primary key,
  game_id text not null,
  snapshot_time text,
  weather_json text,
  sun_visibility_json text,
  park_factor_json text,
  created_at text
);
```

### MLB Market And Prediction Tables

```sql
create table market_snapshots (
  market_snapshot_id text primary key,
  game_id text,
  player_id text,
  source_name text not null,
  market_type text not null,
  selection text not null,
  line_value real,
  odds_american integer,
  price_cents real,
  implied_probability real,
  captured_at text not null,
  raw_source_snapshot_id text
);

create table prediction_rows (
  prediction_row_id text primary key,
  model_run_id text not null,
  game_id text,
  player_id text,
  lane text not null,
  market_type text not null,
  selection text not null,
  predicted_probability real,
  projected_value real,
  confidence real,
  ev_cents real,
  price_cents real,
  odds_american integer,
  feature_snapshot_id text,
  rationale_json text,
  created_at text not null,
  foreign key (model_run_id) references model_runs(model_run_id)
);

create table settlement_rows (
  settlement_row_id text primary key,
  prediction_row_id text not null,
  event_id text,
  settled_at text,
  result_value real,
  won integer,
  profit_cents real,
  settlement_notes text,
  foreign key (prediction_row_id) references prediction_rows(prediction_row_id)
);
```

## Tennis Target Schema

### Tennis Core Tables

```sql
create table players (
  player_id text primary key,
  source_player_id text,
  name text not null,
  canonical_name text not null,
  tour text,
  country text,
  birth_date text,
  handedness text,
  active integer not null default 1
);

create table tournaments (
  tournament_id text primary key,
  name text not null,
  tour text,
  season integer,
  location text,
  surface text,
  level text
);

create table matches (
  match_id text primary key,
  tournament_id text,
  match_date text not null,
  start_time_utc text,
  round text,
  tour text,
  surface text,
  best_of integer,
  status text,
  source_event_id text,
  source_snapshot_id text
);

create table match_players (
  match_id text not null,
  player_id text not null,
  side integer not null,
  seed text,
  pre_match_rank integer,
  market_name text,
  primary key (match_id, player_id)
);
```

### Tennis Rankings, Profiles, And Recent Form

Existing mixed-warehouse tables to migrate into this group include `tennis_rankings`, `tennis_recent_matches`, `tennis_recent_form_metrics`, `tennis_player_match_context`, and `tennis_players`.

```sql
create table rankings (
  ranking_id text primary key,
  player_id text not null,
  ranking_date text not null,
  tour text not null,
  rank integer,
  points integer,
  age real,
  country text,
  source_name text,
  source_snapshot_id text
);

create table recent_matches (
  recent_match_id text primary key,
  player_id text not null,
  opponent_player_id text,
  match_date text,
  tournament_name text,
  surface text,
  round text,
  result text,
  score text,
  opponent_rank integer,
  source_name text,
  source_snapshot_id text
);

create table player_form_snapshots (
  form_snapshot_id text primary key,
  player_id text not null,
  snapshot_date text not null,
  surface text,
  sample_size integer,
  features_json text not null,
  created_at text
);
```

### Tennis Match Stats And Point Flow

Existing mixed-warehouse tables to migrate into this group include `tennis_flashscore_match_stats`, `tennis_flashscore_stat_rows`, `tennis_flashscore_player_stat_rows`, `tennis_sofascore_stat_rows`, `tennis_sofascore_player_stat_rows`, `tennis_sofascore_replay_games`, and `tennis_sofascore_replay_points`.

```sql
create table match_stat_rows (
  stat_row_id text primary key,
  match_id text,
  player_id text,
  source_name text not null,
  stat_name text not null,
  stat_value real,
  stat_made real,
  stat_attempts real,
  stat_text text,
  period text,
  source_snapshot_id text
);

create table service_pressure_snapshots (
  pressure_snapshot_id text primary key,
  player_id text not null,
  match_id text,
  snapshot_date text not null,
  surface text,
  sample_type text not null,
  sample_size integer,
  hold_pct real,
  break_pct real,
  bp_saved_made integer,
  bp_saved_attempts integer,
  bp_saved_pct real,
  bp_converted_made integer,
  bp_converted_attempts integer,
  bp_converted_pct real,
  deuce_hold_pct real,
  tiebreak_record text,
  source_name text,
  created_at text
);

create table replay_games (
  replay_game_id text primary key,
  match_id text not null,
  set_number integer,
  game_number integer,
  server_player_id text,
  winner_player_id text,
  break_point_count integer,
  deuce_count integer,
  score_before text,
  score_after text,
  source_name text,
  source_snapshot_id text
);

create table replay_points (
  replay_point_id text primary key,
  replay_game_id text not null,
  point_number integer,
  server_player_id text,
  point_winner_player_id text,
  point_score text,
  is_break_point integer,
  is_deuce integer,
  is_tiebreak integer,
  source_name text,
  source_snapshot_id text
);
```

### Tennis H2H, Weather, Markets, And Predictions

```sql
create table h2h_matches (
  h2h_match_id text primary key,
  player_a_id text not null,
  player_b_id text not null,
  match_date text,
  tournament_name text,
  surface text,
  winner_player_id text,
  score text,
  source_name text,
  source_snapshot_id text
);

create table market_snapshots (
  market_snapshot_id text primary key,
  match_id text,
  player_id text,
  source_name text not null,
  market_type text not null,
  selection text not null,
  line_value real,
  odds_american integer,
  price_cents real,
  implied_probability real,
  captured_at text not null,
  raw_source_snapshot_id text
);

create table prediction_rows (
  prediction_row_id text primary key,
  model_run_id text not null,
  match_id text not null,
  player_id text,
  lane text not null,
  market_type text not null,
  selection text not null,
  predicted_probability real,
  projected_value real,
  confidence real,
  ev_cents real,
  price_cents real,
  odds_american integer,
  feature_snapshot_id text,
  rationale_json text,
  created_at text not null,
  foreign key (model_run_id) references model_runs(model_run_id)
);

create table settlement_rows (
  settlement_row_id text primary key,
  prediction_row_id text not null,
  settled_at text,
  result_value real,
  won integer,
  profit_cents real,
  settlement_notes text,
  foreign key (prediction_row_id) references prediction_rows(prediction_row_id)
);
```

## DuckDB Per-Sport Analytics Schema

DuckDB should not become the durable source of truth. It should be rebuilt from SQLite plus raw archive references.

### MLB DuckDB

Primary tables/views:

- `mlb_feature_matrix_game`
- `mlb_feature_matrix_f5`
- `mlb_feature_matrix_player_props`
- `mlb_feature_matrix_hr`
- `mlb_backtest_predictions`
- `mlb_backtest_settlements`
- `mlb_game_shape_vectors`
- `mlb_chaos_phase_vectors`
- `mlb_market_bucket_roi`

### Tennis DuckDB

Primary tables/views:

- `tennis_feature_matrix_match`
- `tennis_feature_matrix_derivatives`
- `tennis_feature_matrix_kalshi_spike`
- `tennis_backtest_predictions`
- `tennis_backtest_settlements`
- `tennis_service_pressure_vectors`
- `tennis_clutch_flow_vectors`
- `tennis_market_bucket_roi`

## Existing Mixed DB Table Migration Map

### From `sports.db` To MLB DB

| Legacy table group | Target table group | Notes |
|---|---|---|
| `mlb_games`, `mlb_starting_pitchers` | `games`, `starting_pitchers` | Stable IDs must be preserved. |
| `mlb_pitch_events`, `mlb_plate_appearances` | `pitch_events`, `plate_appearances` | Highest-value training data. |
| `mlb_player_game_batting`, `mlb_pitcher_appearances`, `mlb_game_team_stats` | event/outcome summary tables | Keep source row IDs where available. |
| `mlb_game_outcomes` | `game_outcomes` | Required for settlement/backtests. |
| `weather_observations`, `park_factor_snapshots`, `mlb_game_sun_visibility_snapshots` | `game_environment_snapshots` | Preserve raw JSON for sun/weather/park shape. |
| `mlb_*_rolling_form`, `mlb_*_shape_daily`, `mlb_*_profiles`, `mlb_*_state_snapshots` | `team_feature_snapshots`, `player_feature_snapshots` | Normalize as feature families first; expand later only when needed. |
| `mlb_*_odds_snapshots`, `mlb_kalshi_market_snapshots`, `mlb_player_prop_odds_snapshots` | `market_snapshots` | Must keep market source, capture time, selection, line, odds/price. |
| `mlb_*_predictions` | `prediction_rows` | Preserve original model id/date/lane if present. |
| `mlb_*_backtests`, `mlb_*_settlements` | `settlement_rows` plus model lane summary tables | Preserve old result math; do not recompute during migration. |

### From `sports.db` To Tennis DB

| Legacy table group | Target table group | Notes |
|---|---|---|
| `tennis_players`, `tennis_matches`, `tennis_match_sources` | `players`, `matches`, `match_players`, `source_snapshots` | Player keying/fuzzy aliases need validation. |
| `tennis_rankings` | `rankings` | Keep date, tour, rank, age, country. |
| `tennis_recent_matches`, `tennis_recent_form_metrics`, `tennis_player_match_context` | `recent_matches`, `player_form_snapshots` | Preserve opponent rank/surface/sample info. |
| `tennis_flashscore_*`, `tennis_sofascore_*` | `match_stat_rows`, `service_pressure_snapshots`, `replay_games`, `replay_points` | Must store BP saved/attempts and BP converted/attempts, not just percentages. |
| `tennis_h2h_*` | `h2h_matches` | Include dates and surfaces clearly. |
| `tennis_prediction_market_snapshots`, `tennis_kalshi_*` | `market_snapshots` plus Kalshi-specific derived tables if needed | Keep intramatch candles separate for spike models. |
| `tennis_predictions`, `tennis_prediction_grades` | `prediction_rows`, `settlement_rows` | Model/date/lane keys required. |
| `tennis_model_training_rows` | DuckDB feature matrix and SQLite lineage references | Do not make old training rows the only source of truth. |

## Migration Phases

### Phase 0: Inventory And Freeze

- Confirm DB inventory.
- Confirm folder inventory.
- Mark `sports.db` read-only by convention.
- Create migration ledger.
- Add scripts that only inspect, never write.

Exit criteria:

- Inventory doc committed.
- Legacy DB table groups mapped.
- Empty target DB paths agreed.

### Phase 1: Create Empty Sport DBs

- Create `data-private/warehouse/sports/mlb/mlb.db`.
- Create `data-private/warehouse/sports/tennis/tennis.db`.
- Apply shared system tables.
- Apply sport-specific base schemas.
- Add `schema_migrations` rows.

Exit criteria:

- Both DBs open cleanly.
- Schema migration tests pass.
- No source data moved yet.

### Phase 2: Backfill From `sports.db`

- Backfill MLB tables from existing `mlb_*` tables.
- Backfill tennis tables from existing `tennis_*` tables.
- Preserve source table and source primary keys in metadata where possible.
- No JSON-folder backfill yet.

Exit criteria:

- Row counts match grouped source queries.
- Critical joins work by stable ID.
- Existing backtest rows reproduce.

### Phase 3: Backfill JSON And Raw Artifacts Missing From `sports.db`

- Backfill raw/source references from `data-private/raw`.
- Backfill tennis Flashscore/SofaScore/LiveSport/ranking artifacts not already in `sports.db`.
- Backfill prediction and model-run artifacts not already represented in DB rows.
- Register public artifacts as exports, not source truth.

Exit criteria:

- Missing coverage report by source/date/sport.
- All migrated file batches have hashes and source snapshot rows.

### Phase 4: Validation

Validation must run per sport.

Required checks:

- Source-to-target row counts.
- Stable ID uniqueness.
- No duplicate model rows for same model/date/lane/entity unless intentionally versioned.
- No `N/A` stat-row overwrite when richer source exists.
- Tennis BP saved/converted has made/attempts when source provides them.
- MLB pitch-event and plate-appearance counts match legacy DB.
- Prediction outputs from benchmark dates match prior published outputs.

Exit criteria:

- Validation report stored under each sport DB `checks/` folder.
- Health checks written into each sport DB.

### Phase 5: DuckDB Build

- Build `mlb.duckdb` from MLB SQLite.
- Build `tennis.duckdb` from tennis SQLite.
- Create feature matrices and backtest views.
- Keep DuckDB rebuildable from SQLite and raw references.

Exit criteria:

- Backtests run without scanning thousands of JSON files.
- Feature matrices are generated by query/script, not by Codex interpretation.

### Phase 6: Prediction Write Path

- Update MLB prediction runs to write `prediction_rows`, `market_snapshots`, `value_board` rows, and health checks into MLB DB.
- Update tennis prediction runs to write the same into tennis DB.
- Generated JSON export reads from sport DB rows.

Exit criteria:

- A prediction run touches one sport DB, model code, and scoped export only.
- Old generated data is not used as source truth.

### Phase 7: UI/API Read Path

- API reads selected sport/date/model from sport DB or DB-derived export.
- Frontend can load historical dates from DB-derived indexes.
- Public deploy can still use static export if needed, but export is generated from DB.

Exit criteria:

- Switching model/date in UI does not rewrite data.
- Missing public boards are detected by export health checks.

### Phase 8: Archive And Deprecation

- Mark migrated folders as `archive/source-only` where appropriate.
- Keep raw/source files.
- Stop editing generated web modules by hand.
- Stop treating `published-data` as source of truth.

Exit criteria:

- Prediction and training runs are DB-backed.
- File scans are limited to source ingestion and explicit exports.

## First Migration Scripts To Build

| Script | Purpose |
|---|---|
| `data-migration/scripts/inspect_legacy_dbs.mjs` | Print DB/table inventory and row counts. |
| `data-migration/scripts/create_sport_dbs.mjs` | Create empty MLB and tennis DBs with migrations. |
| `data-migration/scripts/backfill_mlb_from_sports_db.mjs` | Copy MLB legacy DB rows into MLB DB. |
| `data-migration/scripts/backfill_tennis_from_sports_db.mjs` | Copy tennis legacy DB rows into tennis DB. |
| `data-migration/scripts/validate_sport_db.mjs` | Validate row counts, joins, and required health checks. |
| `data-migration/scripts/build_sport_duckdb.py` | Build per-sport DuckDB analytics DB from SQLite. |

## Open Decisions

| Decision | Current recommendation |
|---|---|
| Should model metadata live in a shared DB? | No for now. Keep model rows sport-local to avoid cross-sport confusion. Add a tiny global registry later only if needed. |
| Should JSON be deleted after migration? | No. Keep as raw/archive/export, but stop using it as source truth. |
| Should old empty tennis DBs be reused? | No. They are ambiguous. Use clean sport-owned paths. |
| Should DuckDB be production UI source? | No. DuckDB is training/backtest/analytics. SQLite or DB-derived JSON serves the UI. |
| Should schemas use JSON feature blobs or fully normalized feature columns? | Start with feature-family JSON snapshots plus stable IDs. Normalize high-value features later when the model proves they matter. |
