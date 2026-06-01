# MLB Model Iteration Runbook

This runbook defines how to create and test a new MLB parent model cartridge such as `MLB-M1` from the current `MLB-M0` baseline. Do not create a new model by editing `MLB-M0` in place.

## Current State

- `MLB-M0` is the active parent model.
- `MLB-RP36` is a consumed relief addendum, not a competing parent model.
- Registry-aware wrappers live under `models/mlb/`:
  - `run-cartridge.mjs`
  - `snapshot-cartridge.mjs`
  - `check-cartridge.mjs`
  - `compare-cartridges.mjs`
  - `scaffold-cartridge.mjs`
- Shared model-run indexing lives at `models/shared/model-runs/index_runs.py`.
- Model run snapshots are benchmark artifacts only. They preserve prediction output and lane history without hashing source files, so draft-model iteration does not dirty unrelated model baselines.

## Create A Draft Model

Dry-run first:

```bash
npm run model:mlb:scaffold -- --from MLB-M0 --to MLB-M1
```

Create the draft only after reviewing the dry-run:

```bash
npm run model:mlb:scaffold -- --from MLB-M0 --to MLB-M1 --write --update-registry
```

Do not pass `--activate` until the draft model beats or meaningfully improves on `MLB-M0` in benchmark runs.

## Benchmark Before Activation

Run and snapshot benchmark dates for the candidate model:

```bash
npm run model:mlb:run -- --model MLB-M1 --entry runner --date 2026-05-30
npm run model:mlb:snapshot -- --model MLB-M1 --date 2026-05-30
npm run model:mlb:check -- --model MLB-M1 --date 2026-05-30
```

Repeat for the current slate or most recent settled slate:

```bash
npm run model:mlb:run -- --model MLB-M1 --entry runner --date 2026-05-31
npm run model:mlb:snapshot -- --model MLB-M1 --date 2026-05-31
npm run model:mlb:check -- --model MLB-M1 --date 2026-05-31
```

Compare indexed lane rows:

```bash
npm run model:mlb:compare -- --left MLB-M0 --right MLB-M1 --date 2026-05-30
```

For `MLB-M2` or any game-shape branch, also run the category/lane backtest:

```bash
npm run data:research:mlb-m2-game-shape -- --start 2026-05-10 --end 2026-05-31
```

This backtest must report:

- baseline full-game side hit rate
- baseline first-five side hit rate
- category-lane hit rate
- allowed-side bucket hit rate
- starter-to-bullpen flip F5 hit rate
- day-by-day category performance
- stress-slate table for May 31-style chaos days

Do not promote a game-shape branch because it sounds smarter. Promote only if the category selects a better market expression than the baseline side model on settled rows.

Current locked MLB-M2 benchmark:

- `models/mlb/cartridges/MLB-M2/benchmarks/2026-06-01-current-baseline.json`

Any M2 successor must compare against that file. For the May 31 stress-slate test, the candidate may train on data through 2026-05-30, then must score 2026-05-31 as holdout.

May 31 holdout targets include:

- full-game side: 11/15
- first-five side: 9/15
- M2 category lane: 11/15
- O/U benchmark set: 5/5

Keep the O/U benchmark separate from the old value-board totals audit rows.

## Required Gates

- Snapshot verifier passes for every benchmark date.
- Shared warehouse rows exist in `model_runs`, `model_run_artifacts`, and `model_run_lanes`.
- If the candidate consumes `MLB-RP36`, `model_component_runs` links the parent run to the addendum run.
- If the candidate changes the app-facing match contract, register its adapter in `models/mlb/app-model.js` before activation. The app path should fail loudly for unregistered active parent models.
- May 30 and the latest settled day are compared by lane, not by one blended score.
- Model notes explain what changed, what should improve, and what might get worse.
- Any game-shape model must emit concrete `bestExpression`, `laneMap`, and `inningMap` fields. A generic `risk`, `veto`, or `pass` label is not enough.
- If a branch tries ML/RF/gradient/logistic experiments, the walk-forward results must be recorded even when they fail.

## Activation

Only after benchmarks pass:

1. Update `models/mlb/registry.json`.
2. Set `activeModelId` and `active.model` to the new model id.
3. Run the active scripts without `--model` to prove registry resolution:

```bash
npm run data:run:mlb-pregame -- --date YYYY-MM-DD
npm run data:snapshot:mlb-run -- --date YYYY-MM-DD
npm run data:check:mlb-run -- --date YYYY-MM-DD
```

## Known Architecture Edges

- `models/mlb/app-model.js` is the app adapter registry. It currently registers `MLB-M0`; future app-contract-compatible models must be added there before activation, otherwise the app/loader will throw instead of silently using M0.
- `models/shared/model-runs/index_runs.py` now reads `role: parent_model` and consumed components from `models/mlb/registry.json`, so future parent models with the same lane contract can index without editing the indexer.
- Compatibility launchers under `pipeline/mlb/` dispatch through `models/mlb/run-cartridge.mjs`; package scripts and `models/mlb/*-cartridge.mjs` wrappers remain the preferred path for new work.
