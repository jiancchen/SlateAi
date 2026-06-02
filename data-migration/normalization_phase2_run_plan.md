# Normalization Phase 2 Run Plan

## Goal

Finish the remaining normalization families before any DB-first ingestion wiring. Phase 1 made the main MLB feature, result, lineup, bullpen, team-shape, and environment families typed and DuckDB-ready. Phase 2 finishes the families that make model history, value boards, market pricing, and model evolution DB-native.

Do not touch active ingestion, public exports, API reads, or site reads during this phase. The output of this phase is typed SQLite rows, validation reports, DuckDB rebuilds, and updated ledgers.

## Execution Order

### N16: MLB Model Metadata

Run before prediction/backtest normalization so `model_run_id`, cartridge IDs, lane IDs, and component relationships are available as typed joins.

Source family:

- `model_runs`
- `model_component_runs`
- `model_run_lanes`
- `model_run_artifacts`

Parser and scripts:

- Parser: `pipeline/sources/mlb/normalization/model_metadata.py`
- Migration: `data-migration/scripts/normalize_mlb_model_metadata.py`
- Validator: `data-migration/scripts/validate_mlb_model_metadata_normalization.py`

Target tables:

- `model_runs`
- `model_component_runs`
- `model_run_lanes`
- `model_run_artifacts`

Required fields:

- `model_run_id`
- `sport`
- `model_id`
- `model_version`
- `cartridge_id`
- `component_id`
- `lane`
- `run_date`
- `artifact_type`
- `artifact_path`
- `source_detail_json`

Validation gates:

- Model runs are idempotent on rerun.
- Component rows join to their parent model run when parent exists.
- Lane rows preserve lane names used by value boards and settlement.
- Artifact rows preserve source file paths and hashes when available.
- DuckDB can query model history without reading `legacy_table_rows.row_json`.

### N17: MLB Predictions, Backtests, And Settlements

This is the model-history backbone. It should preserve every prediction row, value-board row, settlement row, component result, and backtest row in typed tables.

Source family:

- prediction rows
- settlement rows
- prop backtests
- side backtests
- home run backtests
- player identity backtests
- component settlement rows

Parser and scripts:

- Parser: `pipeline/sources/mlb/normalization/predictions.py`
- Migration: `data-migration/scripts/normalize_mlb_predictions.py`
- Validator: `data-migration/scripts/validate_mlb_predictions_normalization.py`

Target tables:

- `prediction_rows`
- `settlement_rows`
- `component_settlement_rows`
- `prop_backtest_rows`
- `side_backtest_rows`
- `home_run_backtest_rows`
- `player_identity_backtest_rows`

Required fields:

- `prediction_id`
- `model_run_id`
- `model_id`
- `model_version`
- `lane`
- `market_type`
- `selection_type`
- `selection_id`
- `game_id`
- `team_id`
- `player_id`
- `prediction_date`
- `event_date`
- `line`
- `odds`
- `confidence_pct`
- `ev`
- `stake_grade`
- `outcome`
- `profit_loss`
- `settled_at`
- `source_detail_json`

Validation gates:

- Prediction rows join to `model_runs` when model metadata exists.
- Game/team/player selections join to canonical IDs or are explicitly unresolved.
- Settlement rows preserve outcome and profit/loss.
- Backtest rows are queryable by `model_id`, `date`, `lane`, and `market_type`.
- Value-board rows can be filtered from typed prediction rows without recomputing odds logic.

### N18: MLB Markets, Odds, Props, And Price History

This is the value-board trust layer. It normalizes sportsbook prices, prediction market contracts, price ticks, prop markets, and mispricing labels.

Source family:

- market snapshots
- market contracts
- market price ticks
- prop market snapshots
- team market context snapshots
- market mispricing labels

Parser and scripts:

- Parser: `pipeline/sources/mlb/normalization/markets.py`
- Parser: `pipeline/sources/mlb/normalization/props.py`
- Migration: `data-migration/scripts/normalize_mlb_markets.py`
- Migration: `data-migration/scripts/normalize_mlb_props.py`
- Validator: `data-migration/scripts/validate_mlb_markets_normalization.py`
- Validator: `data-migration/scripts/validate_mlb_props_normalization.py`

Target tables:

- `market_contracts`
- `market_snapshots`
- `market_price_ticks`
- `prop_market_snapshots`
- `team_market_context_snapshots`
- `market_mispricing_labels`

Required fields:

- `market_id`
- `contract_id`
- `source`
- `sportsbook`
- `market_type`
- `selection_type`
- `selection_id`
- `game_id`
- `team_id`
- `player_id`
- `line`
- `american_odds`
- `implied_probability`
- `bid_cents`
- `ask_cents`
- `last_price_cents`
- `volume`
- `open_interest`
- `captured_at`
- `settlement_status`
- `source_detail_json`

Validation gates:

- Prop rows join to `players` and `games`.
- Team market rows join to `teams` and `games`.
- Contract ticks join to `market_contracts`.
- Price ticks preserve time ordering and do not collapse repeated captures.
- Market aliases are stored in `entity_aliases`; ambiguous contracts go to `unresolved_entities`.
- DuckDB can compute entry, max spike, 2x/2.5x hit, and time-to-spike without JSON decoding.

### N19: MLB Game-Shape / State Formula Rows

This preserves M2-style training rows and backtests for game-flow formulas: inning shape, run-shape, phase tags, chaos categories, and expected-vs-actual state labels.

Source family:

- state formula training rows
- state formula backtests

Parser and scripts:

- Parser: `pipeline/sources/mlb/normalization/game_shape.py`
- Migration: `data-migration/scripts/normalize_mlb_game_shape.py`
- Validator: `data-migration/scripts/validate_mlb_game_shape_normalization.py`

Target tables:

- `state_formula_training_rows`
- `state_formula_backtests`

Required fields:

- `state_row_id`
- `model_id`
- `formula_id`
- `game_id`
- `team_id`
- `opponent_team_id`
- `player_id`
- `phase`
- `inning`
- `target`
- `prediction`
- `actual`
- `correct`
- `absolute_error`
- `directional_error`
- `bucket`
- `chaos_label`
- `source_detail_json`

Validation gates:

- Rows join to canonical games/teams/players where provided.
- Formula IDs and model IDs are preserved.
- Backtests preserve correctness and outcome labels.
- DuckDB can bucket May 31-style failures without decoding source JSON.

### N20: MLB Player Career, Splits, And Context

This is the low-sample and player-identity support layer. It should be normalized before model ingestion wiring because the ingestion path will eventually need this for repeatability and batter/pitcher identity stories.

Source family:

- career profiles
- split snapshots
- identity profiles
- identity curves
- pitcher season value snapshots
- Statcast HR leaderboard snapshots

Parser and scripts:

- Parser: `pipeline/sources/mlb/normalization/player_context.py`
- Migration: `data-migration/scripts/normalize_mlb_player_context.py`
- Validator: `data-migration/scripts/validate_mlb_player_context_normalization.py`

Target tables:

- `player_career_profiles`
- `player_split_snapshots`
- `player_identity_profiles`
- `player_identity_curves`
- `pitcher_season_value_snapshots`
- `statcast_hr_leaderboard_snapshots`

Required fields:

- `player_id`
- `source_player_id`
- `snapshot_date`
- `season`
- `split_key`
- `handedness`
- `sample_size`
- `rate_stats`
- `counting_stats`
- `quality_of_contact_fields`
- `career_baseline_fields`
- `identity_label`
- `identity_delta`
- `source_detail_json`

Validation gates:

- Player rows join to canonical `players` or unresolved rows are counted.
- Split keys and handedness are typed, not buried in JSON.
- Career rows preserve sample sizes so they can be weighted lightly.
- DuckDB can compare current-season identity vs career baseline directly.

### N21: MLB Team Trend And Context

This is the story/context support layer for series shape, carryover, prior labels, and team-level narrative signals.

Source family:

- team story priors
- game story labels
- game story signals
- series context snapshots

Parser and scripts:

- Parser: `pipeline/sources/mlb/normalization/team_context.py`
- Migration: `data-migration/scripts/normalize_mlb_team_context.py`
- Validator: `data-migration/scripts/validate_mlb_team_context_normalization.py`

Target tables:

- `team_story_priors`
- `game_story_labels`
- `game_story_signals`
- `series_context_snapshots`

Required fields:

- `game_id`
- `team_id`
- `opponent_team_id`
- `series_id`
- `snapshot_date`
- `story_label`
- `signal_name`
- `signal_value`
- `confidence`
- `source`
- `source_detail_json`

Validation gates:

- Team rows join to canonical `teams`.
- Game rows join to canonical `games`.
- Series context preserves game number and home/away orientation.
- Story labels are typed enough for model filters and postmortems.

### N22: Tennis Identity Cleanup

This is not a blocker for MLB DB-first ingestion, but it should be done before tennis DB-first ingestion. The tennis stat/replay/market/context families are already DuckDB-ready, but unresolved identity rows should be reviewed and folded into aliases where confidence is high.

Source family:

- `unresolved_entities`
- `entity_aliases`
- source player/match labels from tennis stats, markets, and context

Parser and scripts:

- Parser: `pipeline/sources/tennis/normalization/identity.py`
- Migration: `data-migration/scripts/normalize_tennis_identity.py`
- Validator: `data-migration/scripts/validate_tennis_identity_normalization.py`

Target tables:

- `entity_aliases`
- `unresolved_entities`

Validation gates:

- No fuzzy alias promotion without a deterministic rule.
- Ambiguous rows remain unresolved with candidate JSON and reason.
- Previously quarantined stat, market, and context rows are reduced only when confidence is high.
- DuckDB coverage checks show fewer false identity misses.

## Phase 2 Final Gate

After N16 through N22:

1. Rebuild `duck-mlb.duckdb` and `duck-tennis.duckdb`.
2. Run a no-JSON DuckDB smoke query for each normalized family.
3. Produce `data-migration/reports/phase2_normalization_readiness_YYYY-MM-DD.json`.
4. Update `normalization_ledger.md` rows to `duckdb_ready`.
5. Do not mark anything `promoted` until active ingestion/read paths are explicitly switched.

## Implementation Notes

- Keep every parser reusable by future ingestion.
- Keep every migration script idempotent.
- Prefer additive DDL.
- Do not remove legacy rows or raw JSON source archives.
- Commit after each completed family.
- If a family needs schema changes, update `data-migration/mlb_normalization_schema_plan.md` and this file before writing parser code.
