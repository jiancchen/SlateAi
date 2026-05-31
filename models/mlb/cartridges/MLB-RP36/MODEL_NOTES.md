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

- `run_lock.py` creates a dated source/input/output lock under `data-private/model-runs/mlb/MLB-RP36/{date}/`.
- `verify_run.py` checks source files, lightweight warehouse input fingerprints, output artifacts, and the exact reliever-shadow snapshot.
- The verifier reruns `verify_snapshot.py`, so the generated reliever-shadow JSON must still reproduce the stored artifact exactly.
- May 31, 2026 is the first RP36 run locked with this envelope. The May 30 artifact is useful as legacy context, but it no longer exactly regenerates from the current warehouse and should not be treated as a reproducible RP36 run.

## Known Gaps

- No MLB-RP36 settlement table yet.
- Input locks use lightweight warehouse fingerprints rather than hashing the full multi-GB SQLite DB.
- Current exact first-up hit rate is not strong enough for standalone bets.
- The payload still uses `E36 shadow` as a display/model tag.
