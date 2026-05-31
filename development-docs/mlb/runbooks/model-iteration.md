# MLB Model Iteration Runbook

This runbook defines how to create and test a new MLB parent model cartridge such as `MLB-M1` from the current `MLB-M0` baseline. Do not create a new model by editing `MLB-M0` in place.

## Current State

- `MLB-M0` is the active parent model.
- `MLB-RP36` is a consumed relief addendum, not a competing parent model.
- Registry-aware wrappers live under `models/mlb/`:
  - `run-cartridge.mjs`
  - `lock-cartridge.mjs`
  - `verify-cartridge.mjs`
  - `compare-cartridges.mjs`
  - `scaffold-cartridge.mjs`
- Shared model-run indexing lives at `models/shared/model-runs/index_runs.py`.
- The locked run JSON files remain the reproducibility artifacts; the warehouse tables are the query layer.

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

Run and lock benchmark dates for the candidate model:

```bash
npm run model:mlb:run -- --model MLB-M1 --entry runner --date 2026-05-30
npm run model:mlb:lock -- --model MLB-M1 --date 2026-05-30
npm run model:mlb:verify -- --model MLB-M1 --date 2026-05-30
```

Repeat for the current slate or most recent settled slate:

```bash
npm run model:mlb:run -- --model MLB-M1 --entry runner --date 2026-05-31
npm run model:mlb:lock -- --model MLB-M1 --date 2026-05-31
npm run model:mlb:verify -- --model MLB-M1 --date 2026-05-31
```

Compare locked lane rows:

```bash
npm run model:mlb:compare -- --left MLB-M0 --right MLB-M1 --date 2026-05-30
```

## Required Gates

- Snapshot verifier passes for every benchmark date.
- Source/input/output locks are written under `data-private/model-runs/mlb/${MODEL_ID}/${DATE}/`.
- Shared warehouse rows exist in `model_runs`, `model_run_artifacts`, and `model_run_lanes`.
- If the candidate consumes `MLB-RP36`, `model_component_runs` links the parent run to the addendum run.
- If the candidate changes the app-facing match contract, register its adapter in `models/mlb/app-model.js` before activation. The app path should fail loudly for unregistered active parent models.
- May 30 and the latest settled day are compared by lane, not by one blended score.
- Model notes explain what changed, what should improve, and what might get worse.

## Activation

Only after benchmarks pass:

1. Update `models/mlb/registry.json`.
2. Set `activeModelId` and `active.model` to the new model id.
3. Run the active scripts without `--model` to prove registry resolution:

```bash
npm run data:run:mlb-pregame -- --date YYYY-MM-DD
npm run data:lock:mlb-run -- --date YYYY-MM-DD
npm run data:verify:mlb-run -- --date YYYY-MM-DD
```

## Known Architecture Edges

- `models/mlb/app-model.js` is the app adapter registry. It currently registers `MLB-M0`; future app-contract-compatible models must be added there before activation, otherwise the app/loader will throw instead of silently using M0.
- `models/shared/model-runs/index_runs.py` now reads `role: parent_model` and consumed components from `models/mlb/registry.json`, so future parent models with the same lane contract can index without editing the indexer.
- Compatibility launchers under `pipeline/mlb/` still point to MLB-M0 directly. Prefer package scripts and `models/mlb/*-cartridge.mjs` wrappers for new work.
