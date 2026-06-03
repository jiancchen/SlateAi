# MLB Legacy to Typed DB Migration Gap Audit

Generated: 2026-06-03T03:52:04.337Z

Legacy DB: `data-private/warehouse/sports.db` (2257.7 MB)

Typed DB: `data-private/warehouse/sports/mlb/sql-mlb.db` (5083.3 MB)

## Summary

- Legacy/adjacent source tables audited: 77
- Legacy rows audited: 1588592
- Tables staged in `legacy_table_rows`: 70
- Staged rows: 1206213
- Typed target tables inspected: 97
- Direct `sports.db` code references found: 32
- Runtime cutover blockers: 21

## Status Counts

| Status | Tables | Legacy Rows | Staged Rows | Target Source Rows |
| --- | --- | --- | --- | --- |
| normalized_with_source_lineage | 66 | 1202383 | 1202332 | 1202707 |
| target_populated_lineage_unclear | 4 | 3881 | 3881 | 0 |
| target_populated_not_staged | 5 | 382328 | 0 | 0 |
| empty_or_inactive | 2 | 0 | 0 | 0 |

## Critical Replay Schema Gaps

| Typed Table | Severity | Missing Replay Fields |
| --- | --- | --- |
| plate_appearances | ok |  |
| pitch_events | ok |  |

## Tables Needing Migration Attention

| Source Table | Family | Status | Legacy Rows | Staged Rows | Targets | Migration | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| mlb_featured_market_odds_snapshots | markets | target_populated_lineage_unclear | 1610 | 1610 | market_snapshots | data-migration/scripts/normalize_mlb_markets.py |  |
| mlb_games | core_game_feed | target_populated_not_staged | 899 | 0 | games | data-migration/scripts/ingest_mlb_schedule_game_feed_raw_to_typed.py | Canonical game row. Target populated from raw ingest, not legacy_table_rows. |
| mlb_home_run_predictions | predictions_backtests | target_populated_lineage_unclear | 194 | 194 | prediction_rows | data-migration/scripts/normalize_mlb_predictions.py |  |
| mlb_pitch_events | core_replay_state | target_populated_not_staged | 304181 | 0 | pitch_events | data-migration/scripts/ingest_mlb_schedule_game_feed_raw_to_typed.py | Critical replay table. Target exists but is currently missing richer legacy count/call/pitch-order fields. |
| mlb_plate_appearances | core_replay_state | target_populated_not_staged | 67251 | 0 | plate_appearances | data-migration/scripts/ingest_mlb_schedule_game_feed_raw_to_typed.py | Critical replay table. Target exists but is currently missing richer legacy base/out/count/score fields. |
| mlb_prop_predictions | predictions_backtests | target_populated_lineage_unclear | 1688 | 1688 | prediction_rows | data-migration/scripts/normalize_mlb_predictions.py |  |
| mlb_side_predictions | predictions_backtests | target_populated_lineage_unclear | 389 | 389 | prediction_rows | data-migration/scripts/normalize_mlb_predictions.py |  |
| mlb_starting_pitchers | core_game_feed | target_populated_not_staged | 1776 | 0 | starting_pitchers | data-migration/scripts/ingest_mlb_schedule_game_feed_raw_to_typed.py | Probable/actual starter state. Target populated from raw ingest and lineups. |
| source_snapshots | shared_source_metadata | target_populated_not_staged | 8221 | 0 | source_snapshots | needs partitioned migration or re-ingest | Shared legacy source metadata includes multiple sports; only MLB-relevant rows should be moved or re-ingested. |

## Runtime Sports DB Read Path Audit

These code paths still directly reference `data-private/warehouse/sports.db` or shared warehouse path helpers and should be cut over after typed DB parity is proven.

| Group | File | Reference |
| --- | --- | --- |
| mlb_model_runtime | models/mlb/compare-cartridges.mjs:31 | conn = sqlite3.connect("data-private/warehouse/sports.db") |
| api_runtime | api/src/scripts/export-published-data.ts:13 | import { dataPrivateRoot, publishedDataRoot, warehousePath } from '../lib/paths.js' |
| api_runtime | api/src/scripts/export-published-data.ts:46 | if (!fsSync.existsSync(warehousePath)) return [] |
| api_runtime | api/src/scripts/export-published-data.ts:47 | const raw = execFileSync('sqlite3', ['-json', warehousePath, sql], { encoding: 'utf8' }).trim() |
| api_runtime | api/src/lib/paths.ts:11 | export const warehousePath = path.join(dataPrivateRoot, 'warehouse', 'sports.db') |
| api_runtime | api/src/server.ts:14 | import { warehousePath } from './lib/paths.js' |
| api_runtime | api/src/server.ts:39 | warehousePath |
| api_runtime | api/src/lib/sqlite.ts:2 | import { warehousePath } from './paths.js' |
| api_runtime | api/src/lib/sqlite.ts:5 | const raw = execFileSync('sqlite3', ['-json', warehousePath, sql], { |
| mlb_model_runtime | models/mlb/cartridges/MLB-M1/lanes/history-journal.mjs:86 | const output = execSync(`sqlite3 -json data-private/warehouse/sports.db "${escaped}"`, { |
| mlb_model_runtime | models/mlb/cartridges/MLB-M1/lanes/lineups.mjs:11 | const warehousePath = path.join(rootDir, 'data-private', 'warehouse', 'sports.db') |
| mlb_model_runtime | models/mlb/cartridges/MLB-M1/lanes/lineups.mjs:111 | if (!existsSync(warehousePath)) return [] |
| mlb_model_runtime | models/mlb/cartridges/MLB-M1/lanes/lineups.mjs:112 | const raw = execFileSync('sqlite3', ['-json', warehousePath, sql], { encoding: 'utf8' }).trim() |
| mlb_model_runtime | models/mlb/cartridges/MLB-M0/lanes/history-journal.mjs:86 | const output = execSync(`sqlite3 -json data-private/warehouse/sports.db "${escaped}"`, { |
| mlb_model_runtime | models/mlb/cartridges/MLB-M0/lanes/lineups.mjs:11 | const warehousePath = path.join(rootDir, 'data-private', 'warehouse', 'sports.db') |
| mlb_model_runtime | models/mlb/cartridges/MLB-M0/lanes/lineups.mjs:111 | if (!existsSync(warehousePath)) return [] |
| mlb_model_runtime | models/mlb/cartridges/MLB-M0/lanes/lineups.mjs:112 | const raw = execFileSync('sqlite3', ['-json', warehousePath, sql], { encoding: 'utf8' }).trim() |
| mlb_model_runtime | models/mlb/cartridges/MLB-M2/lanes/lineups.mjs:11 | const warehousePath = path.join(rootDir, 'data-private', 'warehouse', 'sports.db') |
| mlb_model_runtime | models/mlb/cartridges/MLB-M2/lanes/lineups.mjs:111 | if (!existsSync(warehousePath)) return [] |
| mlb_model_runtime | models/mlb/cartridges/MLB-M2/lanes/lineups.mjs:112 | const raw = execFileSync('sqlite3', ['-json', warehousePath, sql], { encoding: 'utf8' }).trim() |
| mlb_model_runtime | models/mlb/cartridges/MLB-M2/lanes/history-journal.mjs:86 | const output = execSync(`sqlite3 -json data-private/warehouse/sports.db "${escaped}"`, { |

## Largest Legacy Source Tables

| Source Table | Family | Status | Legacy Rows | Staged Rows | Target Source Rows | Targets |
| --- | --- | --- | --- | --- | --- | --- |
| mlb_pitch_events | core_replay_state | target_populated_not_staged | 304181 | 0 | 0 | pitch_events |
| mlb_hitter_pitch_type_response_daily | hitter_features | normalized_with_source_lineage | 206697 | 206697 | 206697 | player_pitch_type_response_snapshots |
| mlb_player_current_deviation_daily | hitter_features | normalized_with_source_lineage | 184256 | 184256 | 184256 | player_current_deviation_snapshots |
| mlb_player_identity_curves_daily | player_identity | normalized_with_source_lineage | 184256 | 184256 | 184256 | player_identity_curves |
| mlb_player_game_distribution_daily | hitter_features | normalized_with_source_lineage | 184228 | 184228 | 184228 | player_game_distribution_snapshots |
| mlb_pitcher_pitch_mix_daily | pitcher_features | normalized_with_source_lineage | 135153 | 135153 | 135153 | pitcher_pitch_mix_snapshots |
| mlb_plate_appearances | core_replay_state | target_populated_not_staged | 67251 | 0 | 0 | plate_appearances |
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
| source_snapshots | shared_source_metadata | target_populated_not_staged | 8221 | 0 | 0 | source_snapshots |
| mlb_pitcher_appearances | results | normalized_with_source_lineage | 7498 | 7498 | 7498 | pitcher_appearances |
| mlb_state_formula_training_rows | game_shape_research | normalized_with_source_lineage | 7120 | 7120 | 7120 | state_formula_training_rows |
| mlb_lineup_conversion_shape_daily | lineup_features | normalized_with_source_lineage | 5262 | 5262 | 5262 | lineup_shape_snapshots |
| mlb_team_first_inning_profiles_daily | team_features | normalized_with_source_lineage | 5262 | 5262 | 5262 | team_first_inning_profiles |
| mlb_team_mistake_shape_daily | team_features | normalized_with_source_lineage | 5262 | 5262 | 5262 | team_mistake_shape_snapshots |
| mlb_team_rolling_form | team_features | normalized_with_source_lineage | 5196 | 5196 | 5196 | team_rolling_form_snapshots |
| mlb_starting_pitcher_rolling_form | pitcher_features | normalized_with_source_lineage | 4533 | 4533 | 4533 | starting_pitcher_form_snapshots |

## Migration Order Recommendation

1. Add typed replay-state columns for `plate_appearances` and `pitch_events`, then backfill from legacy/raw state.
2. For `target_populated_not_staged` tables, prove parity from typed targets and either backfill provenance or document why raw ingest replaced legacy staging.
3. For `target_populated_lineage_unclear` tables, add source lineage columns or targeted validators so prediction/market parity can be proven without `sports.db`.
4. Run family validators after each migration family and require source-lineage counts where the target supports `source_table`.
5. Move remaining MLB-adjacent environment/source metadata into typed DB or document why it is no longer required.
6. Update all MLB code paths still reading `data-private/warehouse/sports.db` after typed parity is proven.

Full machine-readable detail is in `data-migration/reports/mlb_legacy_to_typed_gap_audit_2026-06-03.json`.
