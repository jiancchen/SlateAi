# MLB Normalization Schema Plan

## Goal

Design the MLB typed-table layer before parser writes begin. The source inventory is complete: `70` MLB legacy source tables, `1,206,213` rows, `15` normalization families, and `0` unclassified leftovers.

This plan is additive. Existing tables in `sql-mlb.db` stay in place, and existing public/site outputs are not touched during normalization.

## Current Typed Foundation

The MLB sport DB already has these useful typed foundations:

- `games`
- `teams`
- `players`
- `venues`
- `starting_pitchers`
- `pitch_events`
- `plate_appearances`
- `prediction_rows`
- `settlement_rows`
- `model_runs`
- `source_snapshots`
- `legacy_table_rows`
- `entity_aliases`
- `unresolved_entities`

Do not redo `pitch_events` and `plate_appearances`. They are the durable pitch/PA event foundation.

## Common Identity Contract

Every normalized table should use canonical IDs:

- `game_id` from `games`
- `team_id` from `teams`
- `player_id` from `players`
- `venue_id` from `venues` when park/environment context matters
- `model_run_id` from `model_runs`
- `market_id` or `contract_id` for odds/market tables

Source IDs and names should also be registered into `entity_aliases` when confidence is high. Ambiguous rows go to `unresolved_entities`; do not guess.

## Common Table Patterns

Use deterministic IDs so reruns are idempotent:

- Snapshot rows: stable hash of family, canonical IDs, source date, source key.
- Event rows: stable hash of family, game ID, event key, source key.
- Market ticks: stable hash of contract, source, timestamp, side/price fields.
- Prediction/settlement rows: stable hash of model/run/lane/selection plus date/game/player.

Every feature table should include:

- canonical IDs
- `snapshot_date` or `game_date`
- source table/source name
- source primary key or content hash
- typed high-value fields
- `source_detail_json` only for residual audit detail
- `created_at`

## Parser Order

Normalize in this order so downstream joins are available:

1. Results/outcomes
2. Lineups/matchups
3. Hitter/batter features
4. Pitcher/starter features
5. Bullpen/relief shape
6. Team/game-shape features
7. Environment/sun/park
8. Markets/odds and props/odds
9. Predictions/backtests and model metadata
10. Secondary player/team context
11. Game-shape/state formula rows

## Family Contracts

### MLB Results/Outcomes

Parser: `pipeline/sources/mlb/normalization/results.py`

Migration script: `data-migration/scripts/normalize_mlb_results.py`

Target tables:

- `game_outcomes`
- `team_game_stats`
- `player_game_batting`
- `batter_game_outcomes`
- `pitcher_appearances`
- `starting_pitcher_game_logs`
- `home_run_events`
- `phase_outcomes`

Required joins:

- `game_id`
- `team_id`
- `player_id`

Validation:

- Game outcome rows join to `games`.
- Player outcome rows join to `players`.
- Team stats join to `teams`.
- No duplicate event IDs on rerun.

### MLB Lineup/Matchup Features

Parser: `pipeline/sources/mlb/normalization/lineups.py`

Migration script: `data-migration/scripts/normalize_mlb_lineups.py`

Target tables:

- existing `lineups`
- existing `lineup_slots`
- `lineup_matchup_snapshots`
- `lineup_shape_snapshots`

Required joins:

- `game_id`
- `team_id`
- `player_id`
- opposing starter `player_id` where available

Validation:

- `lineups` and `lineup_slots` are no longer empty when lineup source rows exist.
- Batting order is unique per lineup.
- Posted/predicted lineup status is preserved.

### MLB Hitter/Batter Features

Parser: `pipeline/sources/mlb/normalization/hitter_features.py`

Migration script: `data-migration/scripts/normalize_mlb_hitter_features.py`

Target tables:

- `player_statcast_snapshots`
- `player_statcast_game_logs`
- `player_classic_stat_snapshots`
- `player_opponent_context_snapshots`
- `player_state_snapshots`
- `player_pitch_type_response_snapshots`
- `player_current_deviation_snapshots`
- `player_game_distribution_snapshots`

Required joins:

- `player_id`
- `team_id` where source provides team
- `game_id` where source is game-specific
- opposing pitcher `player_id` where available

Validation:

- Active batter feature rows join to `players`.
- Statcast and classic trend rows preserve rolling sample sizes.
- Pitch-type response rows preserve pitch type, sample pitches, whiff/chase/damage fields.
- Current deviation rows preserve approach/confidence/process fields.

### MLB Pitcher/Starter Features

Parser: `pipeline/sources/mlb/normalization/pitcher_features.py`

Migration script: `data-migration/scripts/normalize_mlb_pitcher_features.py`

Target tables:

- `pitcher_pitch_mix_snapshots`
- `pitcher_first_inning_profiles`
- `pitcher_mistake_shape_snapshots`
- `starting_pitcher_form_snapshots`
- `starter_leash_profiles`
- `starter_third_time_penalty_profiles`

Required joins:

- `player_id`
- `team_id`
- `game_id` where source is game-specific

Validation:

- Pitch mix rows preserve pitch type, pitch share, command, whiff, zone, and damage fields.
- Starter rows join to `starting_pitchers` when game-specific.
- Third-time penalty rows preserve trip-specific exposure/damage rates.

### MLB Bullpen/Relief Shape

Parser: `pipeline/sources/mlb/normalization/bullpen_features.py`

Migration script: `data-migration/scripts/normalize_mlb_bullpen_features.py`

Target tables:

- `bullpen_usage_snapshots`
- `bullpen_mistake_shape_snapshots`
- `team_bullpen_shape_snapshots`
- `reliever_command_profiles`
- `likely_relief_chains`

Required joins:

- `team_id`
- reliever `player_id` where available
- `game_id` where source is slate-specific

Validation:

- Likely relief chains preserve order/rank of relievers.
- Reliever command rows join to `players` where a pitcher ID exists.
- Team bullpen rows join to `teams`.

### MLB Team/Game-Shape Features

Parser: `pipeline/sources/mlb/normalization/team_features.py`

Migration script: `data-migration/scripts/normalize_mlb_team_features.py`

Target tables:

- `team_first_inning_profiles`
- `team_rolling_form_snapshots`
- `team_state_snapshots`
- `team_opponent_quality_snapshots`
- `team_mistake_shape_snapshots`
- `team_form_carryover_profiles`
- `team_lead_surrender_profiles`
- `team_whiff_persistence_profiles`

Required joins:

- `team_id`
- `game_id` where source is game-specific
- opponent `team_id` where available

Validation:

- Team rows join to `teams`.
- Game-specific rows join to `games`.
- Opponent-adjusted rows preserve opponent keys and adjustment fields.

### MLB Environment/Sun/Park

Parser: `pipeline/sources/mlb/normalization/environment.py`

Migration script: `data-migration/scripts/normalize_mlb_environment.py`

Target tables:

- existing `game_environment_snapshots`
- `game_sun_visibility_snapshots`
- `game_visibility_outcomes`

Required joins:

- `game_id`
- `venue_id`

Validation:

- Sun visibility rows join to `games` and `venues`.
- Visibility outcomes preserve outfield hit/error fields.
- Existing `game_environment_snapshots` gains typed sun/weather/park coverage rather than JSON-only use.

### MLB Markets/Odds

Parser: `pipeline/sources/mlb/normalization/markets.py`

Migration script: `data-migration/scripts/normalize_mlb_markets.py`

Target tables:

- existing `market_snapshots`
- `market_contracts`
- `market_price_ticks`
- `team_market_context_snapshots`
- `market_mispricing_labels`

Required joins:

- `game_id`
- `team_id`
- `player_id` for player markets
- `contract_id` for prediction markets

Validation:

- Market snapshots join to games/teams/players where applicable.
- Contract/tick rows preserve price history.
- Mispricing labels keep source model/market side context.

### MLB Props/Odds

Parser: `pipeline/sources/mlb/normalization/props.py`

Migration script: `data-migration/scripts/normalize_mlb_props.py`

Target tables:

- `prop_market_snapshots`

Required joins:

- `game_id`
- `player_id`
- sportsbook/source market key

Validation:

- Prop odds rows join to `players`.
- Prop line, market type, odds, and captured time are typed.

### MLB Predictions/Backtests

Parser: `pipeline/sources/mlb/normalization/predictions.py`

Migration script: `data-migration/scripts/normalize_mlb_predictions.py`

Target tables:

- existing `prediction_rows`
- existing `settlement_rows`
- `prop_backtest_rows`
- `side_backtest_rows`
- `home_run_backtest_rows`
- `player_identity_backtest_rows`
- `component_settlement_rows`

Required joins:

- `model_run_id`
- `game_id`
- `player_id`
- `team_id` where selection is team-based

Validation:

- Existing `prediction_rows` and `settlement_rows` stay idempotent.
- Lane/model IDs are preserved.
- Backtest rows can be queried by model/date/lane without decoding legacy rows.

### MLB Model Metadata

Parser: `pipeline/sources/mlb/normalization/model_metadata.py`

Migration script: `data-migration/scripts/normalize_mlb_model_metadata.py`

Target tables:

- existing `model_runs`
- `model_component_runs`
- `model_run_lanes`
- `model_run_artifacts`

Validation:

- Model/cartridge IDs are preserved.
- Component rows join parent and child runs where available.
- Model-history dashboard can read from typed DB rows.

### MLB Player Career/Splits/Context

Parser: `pipeline/sources/mlb/normalization/player_context.py`

Migration script: `data-migration/scripts/normalize_mlb_player_context.py`

Target tables:

- `player_career_profiles`
- `player_split_snapshots`
- `player_identity_profiles`
- `player_identity_curves`
- `pitcher_season_value_snapshots`
- `statcast_hr_leaderboard_snapshots`

Validation:

- Player context rows join to `players` or go to `unresolved_entities`.
- Split context preserves handedness/split keys.
- Career rows preserve source date and sample sizes.

### MLB Team Trend/Context

Parser: `pipeline/sources/mlb/normalization/team_context.py`

Migration script: `data-migration/scripts/normalize_mlb_team_context.py`

Target tables:

- `team_story_priors`
- `game_story_labels`
- `game_story_signals`
- `series_context_snapshots`

Validation:

- Story/context rows join to `games` or `teams` where applicable.
- Residual narrative/source detail stays in `source_detail_json`.

### MLB Game-Shape/State Formula

Parser: `pipeline/sources/mlb/normalization/game_shape.py`

Migration script: `data-migration/scripts/normalize_mlb_game_shape.py`

Target tables:

- `state_formula_training_rows`
- `state_formula_backtests`

Validation:

- Training rows join to game/team/player IDs when present.
- Backtests preserve model family, lane, target, prediction, and outcome fields.

## Promotion Rule

Do not promote MLB prediction/model/site/API reads until:

1. The family parser validates source row count, inserted row count, unresolved count, and duplicate primary key count.
2. DuckDB rebuild passes with zero count mismatches.
3. A sample DuckDB query proves the family can be analyzed without `legacy_table_rows.row_json`.
4. Existing public outputs remain unchanged unless explicitly promoted.

