# MLB Legacy to Typed DB Migration Gap Audit

Generated: 2026-06-03T04:07:55.879Z

Legacy DB: `data-private/warehouse/sports.db` (2257.7 MB)

Typed DB: `data-private/warehouse/sports/mlb/sql-mlb.db` (5083.3 MB)

## Summary

- Legacy/adjacent source tables audited: 77
- Legacy rows audited: 1588592
- Tables staged in `legacy_table_rows`: 70
- Staged rows: 1206213
- Typed target tables inspected: 97
- Direct `sports.db` code references found: 27
- Runtime cutover blockers: 13

## Status Counts

| Status | Tables | Legacy Rows | Staged Rows | Target Source Rows |
| --- | --- | --- | --- | --- |
| normalized_with_source_lineage | 66 | 1202383 | 1202332 | 1202707 |
| validated_typed_parity_no_source_lineage | 8 | 377988 | 3881 | 0 |
| empty_or_inactive | 2 | 0 | 0 | 0 |
| validated_mlb_path_coverage_no_row_lineage | 1 | 8221 | 0 | 0 |

## Critical Replay Schema Gaps

| Typed Table | Severity | Missing Replay Fields |
| --- | --- | --- |
| plate_appearances | ok |  |
| pitch_events | ok |  |

## Tables Needing Migration Attention

| Source Table | Family | Status | Legacy Rows | Staged Rows | Targets | Migration | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |

## Validator Gates Applied

| Source Table | Status | Gate | Evidence |
| --- | --- | --- | --- |
| mlb_featured_market_odds_snapshots | validated_typed_parity_no_source_lineage | data-migration/reports/validate_mlb_markets_lineage_2026-06-03.json | 1610 market snapshot rows matched deterministic typed normalizer output. |
| mlb_games | validated_typed_parity_no_source_lineage | data-migration/reports/validate_mlb_core_feed_parity_2026-06-03.json | Game rows, scores, PA counts, pitch counts, and typed-only extras match the legacy feed. |
| mlb_home_run_predictions | validated_typed_parity_no_source_lineage | data-migration/reports/validate_mlb_predictions_lineage_2026-06-03.json | 194 prediction rows matched deterministic typed normalizer output. |
| mlb_pitch_events | validated_typed_parity_no_source_lineage | data-migration/reports/validate_mlb_replay_state_typed_2026-06-03.json | Typed pitch replay keys, count/call state, raw JSON, and PA linkage passed validation. |
| mlb_plate_appearances | validated_typed_parity_no_source_lineage | data-migration/reports/validate_mlb_replay_state_typed_2026-06-03.json | Typed PA replay keys, base/out/count/score state, raw JSON, and score deltas passed validation. |
| mlb_prop_predictions | validated_typed_parity_no_source_lineage | data-migration/reports/validate_mlb_predictions_lineage_2026-06-03.json | 1688 prediction rows matched deterministic typed normalizer output. |
| mlb_side_predictions | validated_typed_parity_no_source_lineage | data-migration/reports/validate_mlb_predictions_lineage_2026-06-03.json | 389 prediction rows matched deterministic typed normalizer output. |
| mlb_starting_pitchers | validated_typed_parity_no_source_lineage | data-migration/reports/validate_mlb_core_feed_parity_2026-06-03.json | Starting pitcher rows match the legacy feed. |
| source_snapshots | validated_mlb_path_coverage_no_row_lineage | data-migration/reports/validate_mlb_source_snapshot_coverage_2026-06-03.json | 992 distinct MLB legacy raw paths are represented in typed source snapshots. |

## Runtime Sports DB Read Path Audit

These code paths still directly reference `data-private/warehouse/sports.db` or shared warehouse path helpers and should be cut over after typed DB parity is proven.

| Group | File | Reference |
| --- | --- | --- |
| mlb_model_runtime | models/mlb/compare-cartridges.mjs:31 | conn = sqlite3.connect("data-private/warehouse/sports.db") |
| mlb_model_runtime | models/mlb/cartridges/MLB-M1/lanes/history-journal.mjs:86 | const output = execSync(`sqlite3 -json data-private/warehouse/sports.db "${escaped}"`, { |
| mlb_model_runtime | models/mlb/cartridges/MLB-M2/lanes/history-journal.mjs:86 | const output = execSync(`sqlite3 -json data-private/warehouse/sports.db "${escaped}"`, { |
| mlb_model_runtime | models/mlb/cartridges/MLB-M1/lanes/lineups.mjs:11 | const warehousePath = path.join(rootDir, 'data-private', 'warehouse', 'sports.db') |
| mlb_model_runtime | models/mlb/cartridges/MLB-M1/lanes/lineups.mjs:111 | if (!existsSync(warehousePath)) return [] |
| mlb_model_runtime | models/mlb/cartridges/MLB-M1/lanes/lineups.mjs:112 | const raw = execFileSync('sqlite3', ['-json', warehousePath, sql], { encoding: 'utf8' }).trim() |
| mlb_model_runtime | models/mlb/cartridges/MLB-M2/lanes/lineups.mjs:11 | const warehousePath = path.join(rootDir, 'data-private', 'warehouse', 'sports.db') |
| mlb_model_runtime | models/mlb/cartridges/MLB-M2/lanes/lineups.mjs:111 | if (!existsSync(warehousePath)) return [] |
| mlb_model_runtime | models/mlb/cartridges/MLB-M2/lanes/lineups.mjs:112 | const raw = execFileSync('sqlite3', ['-json', warehousePath, sql], { encoding: 'utf8' }).trim() |
| mlb_model_runtime | models/mlb/cartridges/MLB-M0/lanes/lineups.mjs:11 | const warehousePath = path.join(rootDir, 'data-private', 'warehouse', 'sports.db') |
| mlb_model_runtime | models/mlb/cartridges/MLB-M0/lanes/lineups.mjs:111 | if (!existsSync(warehousePath)) return [] |
| mlb_model_runtime | models/mlb/cartridges/MLB-M0/lanes/lineups.mjs:112 | const raw = execFileSync('sqlite3', ['-json', warehousePath, sql], { encoding: 'utf8' }).trim() |
| mlb_model_runtime | models/mlb/cartridges/MLB-M0/lanes/history-journal.mjs:86 | const output = execSync(`sqlite3 -json data-private/warehouse/sports.db "${escaped}"`, { |

## Largest Legacy Source Tables

| Source Table | Family | Status | Legacy Rows | Staged Rows | Target Source Rows | Targets |
| --- | --- | --- | --- | --- | --- | --- |
| mlb_pitch_events | core_replay_state | validated_typed_parity_no_source_lineage | 304181 | 0 | 0 | pitch_events |
| mlb_hitter_pitch_type_response_daily | hitter_features | normalized_with_source_lineage | 206697 | 206697 | 206697 | player_pitch_type_response_snapshots |
| mlb_player_current_deviation_daily | hitter_features | normalized_with_source_lineage | 184256 | 184256 | 184256 | player_current_deviation_snapshots |
| mlb_player_identity_curves_daily | player_identity | normalized_with_source_lineage | 184256 | 184256 | 184256 | player_identity_curves |
| mlb_player_game_distribution_daily | hitter_features | normalized_with_source_lineage | 184228 | 184228 | 184228 | player_game_distribution_snapshots |
| mlb_pitcher_pitch_mix_daily | pitcher_features | normalized_with_source_lineage | 135153 | 135153 | 135153 | pitcher_pitch_mix_snapshots |
| mlb_plate_appearances | core_replay_state | validated_typed_parity_no_source_lineage | 67251 | 0 | 0 | plate_appearances |
| mlb_hitter_statcast_trend_snapshots | hitter_features | normalized_with_source_lineage | 25797 | 25797 | 25797 | player_statcast_snapshots |
| mlb_hitter_classic_trend_snapshots | hitter_features | normalized_with_source_lineage | 25167 | 25167 | 25167 | player_classic_stat_snapshots |
| mlb_hitter_opponent_context_snapshots | hitter_features | normalized_with_source_lineage | 25167 | 25167 | 25167 | player_opponent_context_snapshots |
| mlb_hitter_state_snapshots | hitter_features | normalized_with_source_lineage | 24396 | 24396 | 24396 | player_state_snapshots |
| mlb_batter_game_outcomes | results | normalized_with_source_lineage | 18080 | 18080 | 18080 | batter_game_outcomes |
| mlb_player_game_batting | results | normalized_with_source_lineage | 18080 | 18080 | 18080 | player_game_batting |
| mlb_hitter_statcast_game_logs | hitter_features | normalized_with_source_lineage | 18004 | 18004 | 18004 | player_statcast_game_logs |
| mlb_lineup_pitcher_matchup_daily | lineup_features | normalized_with_source_lineage | 17655 | 17655 | 17655 | lineups, lineup_slots, lineup_matchup_snapshots |
| mlb_bullpen_usage | bullpen_features | normalized_with_source_lineage | 16542 | 16542 | 16542 | bullpen_usage_snapshots |
| mlb_player_identity_model_backtests | predictions_backtests | normalized_with_source_lineage | 12230 | 12230 | 12230 | player_identity_backtest_rows |
| source_snapshots | shared_source_metadata | validated_mlb_path_coverage_no_row_lineage | 8221 | 0 | 0 | source_snapshots |
| mlb_pitcher_appearances | results | normalized_with_source_lineage | 7498 | 7498 | 7498 | pitcher_appearances |
| mlb_state_formula_training_rows | game_shape_research | normalized_with_source_lineage | 7120 | 7120 | 7120 | state_formula_training_rows |
| mlb_lineup_conversion_shape_daily | lineup_features | normalized_with_source_lineage | 5262 | 5262 | 5262 | lineup_shape_snapshots |
| mlb_team_first_inning_profiles_daily | team_features | normalized_with_source_lineage | 5262 | 5262 | 5262 | team_first_inning_profiles |
| mlb_team_mistake_shape_daily | team_features | normalized_with_source_lineage | 5262 | 5262 | 5262 | team_mistake_shape_snapshots |
| mlb_team_rolling_form | team_features | normalized_with_source_lineage | 5196 | 5196 | 5196 | team_rolling_form_snapshots |
| mlb_starting_pitcher_rolling_form | pitcher_features | normalized_with_source_lineage | 4533 | 4533 | 4533 | starting_pitcher_form_snapshots |

## Cutover Recommendation

1. Treat the typed MLB DB as data-complete for the audited MLB source families: open migration-attention rows should be zero before runtime cutover.
2. Keep the validator reports in the cutover gate because some high-value typed targets intentionally prove parity without row-level `source_table` lineage.
3. Cut the remaining MLB runtime paths from `data-private/warehouse/sports.db` to `data-private/warehouse/sports/mlb/sql-mlb.db`.
4. Re-run this audit after each runtime slice and require `Runtime cutover blockers` to move downward.
5. Leave non-MLB legacy consumers explicit until their own sport-specific typed DB migration is done.

Full machine-readable detail is in `data-migration/reports/mlb_legacy_to_typed_gap_audit_2026-06-03.json`.
