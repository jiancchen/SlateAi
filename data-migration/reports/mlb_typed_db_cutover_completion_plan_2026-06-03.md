# MLB Typed DB Cutover Completion Plan

Generated: 2026-06-03

Related audit:

- [MLB legacy to typed DB migration gap audit](mlb_legacy_to_typed_gap_audit_2026-06-03.md)

## Correction

The replay-state work on `plate_appearances` and `pitch_events` is the first M3 modeling gate, but it is not the only requirement for retiring `sports.db`.

Full MLB cutover requires all of these:

1. Replay-state schema and backfill for PA/pitch tables.
2. Provenance/parity decisions for target-populated-not-staged tables.
3. Lineage proof for prediction and market target tables.
4. MLB-specific source snapshot migration, partitioning, or retirement.
5. Runtime code-path cutover away from `data-private/warehouse/sports.db`.
6. Validators proving typed DB parity before old DB reads are removed.

## Why Replay Was Called Out First

M3 depends on replayable baseball state. Without base/out/count/score/order fields, M3 cannot build the game-story labeler or simulator correctly.

That makes PA/pitch replay the first model-development blocker.

But deleting `sports.db` safely is broader. It also needs lineage, provenance, and code-path cutover.

## Blocker Matrix

| Blocker | Tables | Why It Matters | Required Action | Gate |
|---|---|---|---|---|
| Replay schema missing | `plate_appearances`, `pitch_events` | M3 cannot replay game paths or label baseball stories from typed DB alone. | Add missing typed columns or companion replay-state tables; backfill from legacy/raw; validate inning/final score reconstruction. | Replay validator passes without `sports.db`. |
| Target populated, not staged | `mlb_games`, `mlb_starting_pitchers`, `mlb_plate_appearances`, `mlb_pitch_events`, `source_snapshots` | Row counts exist in typed DB, but provenance/parity is not documented through `legacy_table_rows`. | Prove raw-ingest parity, add source/provenance fields where needed, or document replacement source. | Typed target parity report passes. |
| Lineage unclear | `mlb_featured_market_odds_snapshots`, `mlb_side_predictions`, `mlb_prop_predictions`, `mlb_home_run_predictions` | Rows are in typed targets, but target tables do not expose source lineage cleanly. | Add lineage columns or companion lineage mapping tables; write validators for market/prediction parity. | Prediction/market lineage validator passes. |
| Shared source metadata | `source_snapshots` | Legacy table is shared and includes MLB feed/schedule/player/statcast/Kalshi snapshots. | Migrate MLB-relevant source metadata, re-ingest from raw, or explicitly retire non-needed rows. | MLB source snapshot coverage report passes. |
| Runtime reads | API and MLB model/runtime paths | Even with data parity, code still reads old DB. | Cut API/model/runtime paths to typed DB or typed adapters. | Code scan has zero runtime blockers. |

## Replay-State Fields Required

`plate_appearances` needs:

- `at_bat_index`
- `outs_before`
- `outs_after`
- `balls_final`
- `strikes_final`
- `base_state_start`
- `base_state_end`
- `away_score_before`
- `home_score_before`
- `away_score_after`
- `home_score_after`
- `men_on_base`
- `is_scoring_play`
- `is_out`
- `is_at_bat`
- `raw_json`

`pitch_events` needs:

- `at_bat_index`
- `event_index`
- `balls`
- `strikes`
- `outs`
- `is_pitch`
- `is_strike`
- `is_ball`
- `call_code`
- `call_description`
- `pitch_type_code`
- `pitch_type_description`
- `start_speed`
- `end_speed`
- `play_id`
- `raw_json`

## Provenance/Parity Targets

Target-populated-not-staged tables:

- `games`: typed row count matches legacy `mlb_games`, but target has no direct legacy source lineage.
- `starting_pitchers`: typed row count matches legacy `mlb_starting_pitchers`, but target has no direct legacy source lineage.
- `plate_appearances`: row count matches, but schema is missing replay fields and target has no source lineage column.
- `pitch_events`: row count matches, but schema is missing replay fields and target has no source lineage column.
- `source_snapshots`: typed source metadata exists, but legacy contains shared/specific source keys that need MLB cutover handling.

Lineage-unclear tables:

- `market_snapshots`: no `source_table` column, so legacy `mlb_featured_market_odds_snapshots` parity cannot be proven by source lineage.
- `prediction_rows`: no `source_table` column, so legacy side/prop/home-run prediction parity cannot be proven by source lineage.

## Recommended Migration Order

1. Add replay-state columns or companion replay-state tables.
2. Backfill PA/pitch replay fields from legacy/raw.
3. Add replay validator:
   - reconstruct inning scores
   - reconstruct final score
   - verify PA ordering
   - verify pitch ordering inside PA
   - verify base/out transitions where available
4. Add provenance strategy for target-populated-not-staged tables.
5. Add lineage strategy for `prediction_rows` and `market_snapshots`.
6. Migrate, re-ingest, or retire MLB-relevant `source_snapshots`.
7. Run family validators:
   - core game feed
   - replay state
   - predictions/backtests
   - markets
   - source metadata
8. Cut runtime reads from `sports.db` to typed adapters.
9. Re-run audit and require:
   - zero critical replay schema gaps
   - zero runtime cutover blockers
   - documented decisions for all target-populated-not-staged tables
   - validators passing for lineage-unclear tables

## Delete/Ignore `sports.db` Gate

Do not delete or ignore `sports.db` for MLB until:

- M3 replay validator passes using only `sql-mlb.db`.
- Prediction/market parity validators pass using only `sql-mlb.db`.
- Source snapshot coverage is migrated, re-ingested, or explicitly retired.
- API/model runtime code has zero direct `sports.db` reads for MLB.
- The audit report has no unresolved MLB cutover blockers.

## Practical Interpretation

For M3 development, replay-state backfill comes first because the simulator and labeler depend on it.

For database cutover, all blocker classes must be closed. Replay state is necessary, not sufficient.
