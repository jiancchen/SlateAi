# M3 Tech Debt

Related notes:

- [Model Architecture Notes](model-architecture-notes.md)
- [Signal Discovery Notes](signal-discovery-notes.md)
- [Game Story Labels](game-story-labels.md)
- [Legacy to Typed DB Gap Audit](../data-migration/reports/mlb_legacy_to_typed_gap_audit_2026-06-03.md)
- [Typed DB Cutover Completion Plan](../data-migration/reports/mlb_typed_db_cutover_completion_plan_2026-06-03.md)

## Typed DB Must Preserve Replayable PA/Pitch State

Status: open

Priority: high

The current typed MLB DB has useful high-level game, PA, pitch, pitcher, and outcome tables, but it does not yet preserve all of the richer replay/state fields already present in the legacy warehouse. For M3, this is not optional cleanup. The simulator needs baseball-native state transitions, not only aggregate rows.

Legacy `sports.db` fields that should become first-class typed DB fields include:

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
- pitch count state per pitch, including `balls`, `strikes`, and `outs`
- ordered pitch/PA event indexes that can reconstruct the game path

Why it matters:

- M3 needs to distinguish "traffic erased by GIDP" from "two-out traffic converts into a grand slam."
- Mean inning/game aggregates erase the game-shape signal we are trying to learn.
- Chaos/stability labels need base/out/count/score context, not just event totals.
- Bullpen collapse, starter stress, PA volume, lineup turnover, and late-inning volatility are sequence/state problems.
- The future state-machine simulator should be able to replay or reconstruct each historical game path from typed DB records.

Example motivating contrast:

- `2026-05-30`, Giants at Rockies: Giants were dead through F5 while Colorado built a lead through traffic, starter stress, and controlled run conversion.
- `2026-05-31`, Giants at Rockies: Giants exploded into a two-out avalanche and bullpen-collapse script, including a massive PA volume spike.

If those two games are represented mostly as averages, M3 loses the exact signal it is supposed to learn.

Required follow-up:

1. Audit legacy `mlb_plate_appearances` and `mlb_pitch_events` against typed MLB tables.
2. Add missing typed DB columns or companion state tables for replayable PA/pitch state.
3. Backfill typed MLB data from legacy/raw snapshots.
4. Add validation that typed PA/pitch ordering can reconstruct inning score, base/out state, and final game outcome.
5. Make M3 feature extraction depend on typed replayable state, not legacy tables.

## Legacy Sports DB Cutover Audit

Status: open

Priority: high

Audit report:

- [MLB legacy to typed DB migration gap audit](../data-migration/reports/mlb_legacy_to_typed_gap_audit_2026-06-03.md)
- [MLB typed DB cutover completion plan](../data-migration/reports/mlb_typed_db_cutover_completion_plan_2026-06-03.md)

Current finding:

- Most staged MLB legacy rows already have typed targets with source lineage.
- The critical blocker is not row count for PA/pitch data. Typed `plate_appearances` and `pitch_events` match legacy row counts, but the typed schema is missing the richer replay fields M3 needs.
- A smaller set of prediction/market/core tables are target-populated but lack source-lineage proof or were populated from raw ingest instead of `legacy_table_rows`.
- `source_snapshots` needs MLB-specific partitioning, re-ingest, or explicit retirement before `sports.db` can be fully removed from MLB paths.

Cutover clarification:

- Replay-state backfill is the first M3 modeling blocker, but it is not sufficient to retire `sports.db`.
- Full cutover also requires provenance/parity for target-populated-not-staged tables, lineage proof for prediction/market targets, source snapshot handling, and runtime code-path cutover.
