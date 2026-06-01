# MLB-RP36 Reliever Shadow Addendum

MLB-RP36 is the cartridge name for the current MLB relief stack, previous experiment label.

It should stay as an addendum consumed by MLB-M0. Its job is to explain bullpen path, first-up reliever likelihood, availability, and bridge risk.

## Scope

- First-up reliever shortlist
- Top-2 and top-3 reliever cluster confidence
- Heavy-use and quick-reuse reset
- Bridge risk and bullpen shape context
- Late-game warnings for MLB-M0 side, total, and prop decisions

## Migration Rule

The first real MLB-RP36 migration must reproduce the existing 2026-05-30 reliever-shadow artifact before any scoring changes are accepted.

## Current Use Rule

Use MLB-RP36 as a risk and context layer, not as a standalone prediction engine.

- Exact first-up identity is too noisy for direct bets.
- Top-2/top-3 clusters are useful for bullpen path, bridge risk, and late-inning side/total haircuts.
- If MLB-RP36 conflicts with MLB-M0, it should downgrade or redirect the market expression before it creates a pick.

## Run Envelope

- `snapshot_run.py` creates a dated run snapshot under `data-private/model-runs/mlb/MLB-RP36/{date}/`.
- `check_run.py` checks source files, lightweight warehouse input fingerprints, output artifacts, and the exact reliever-shadow snapshot.
- The checker reruns `verify_snapshot.py`, so the generated reliever-shadow JSON must still reproduce the stored artifact exactly.
- `models/shared/model-runs/index_runs.py` indexes the snapshotted RP36 run into `model_runs`, `model_run_lanes`, `mlb_rp36_settlements`, and `mlb_rp36_team_settlements`.
- May 31, 2026 is the first RP36 run snapshoted with this envelope. The May 30 artifact is useful as legacy context, but it no longer exactly regenerates from the current warehouse and should not be treated as a reproducible RP36 run.

## Known Gaps

- Run snapshots use lightweight warehouse fingerprints rather than bsnapshoting on the full multi-GB SQLite DB.
- Current exact first-up hit rate is not strong enough for standalone bets.
- The payload still uses `E36 shadow` as a display/model tag.
