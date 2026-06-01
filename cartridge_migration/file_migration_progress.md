# File Migration Progress

Date: 2026-05-31

## Completed

- Added top-level `models/` registry and sport registries.
- Copied tennis `TEN-T0`, `TEN-F0`, and `TEN-E0` cartridges into `models/tennis/cartridges/`.
- Added `pipeline/lib/model-cartridge-resolver.mjs` so model readers resolve tennis cartridges from `models/`.
- Updated tennis run creation and public export model-card loading to read the model-owned cartridge location.
- Updated the tennis active registry to live in `models/tennis/registry.json`.
- Created MLB cartridge shells for `MLB-M0`, `MLB-RP36`, and `MLB-E0`.
- Added thin MLB cartridge runners for `MLB-M0` and `MLB-RP36` that delegate to the current legacy pipeline scripts.
- Added an MLB-RP36 snapshot verifier and confirmed it reproduces the existing 2026-05-30 reliever-shadow artifact exactly.
- Added an MLB-M0 May 30 golden snapshot target for MLB board outputs: 15 games, 15 side picks, 49 prop picks, 12 HR picks, 30 reliever-shadow teams, and 15 lineup boards.
- Added file-based MLB-M0 run locking and verification for MLB, covering source locks, input locks, output locks, the MLB-M0 snapshot, and the consumed MLB-RP36 addendum.
- Routed `data:run:mlb-pregame`, `data:refresh:mlb-live`, `data:close:mlb-day`, `data:run:mlb-followup`, `data:verify:mlb-refresh`, and `data:export:mlb-reliever-shadow` through cartridge runners while preserving legacy internals.
- Routed MLB-M0 publish/export lanes through cartridge adapters: day files, batting impact, lineups, HR, props, sides, veto artifacts, training corpus, and history journal.
- Moved the app-facing sports model export from `web/src/lib/sports-model.js` to `models/shared/sports-core/app-sports-model.js`; the frontend path now re-exports the shared app composition module for compatibility.
- Split reusable odds/format helpers into `models/shared/sports-core/core-utils.js`; MLB-only team-name helpers, simulation, pick rankings, side-control gates, and parlay helpers remain under `models/mlb/cartridges/MLB-M0/lib/` while preserving the `sports-model.js` export surface.
- Split additional MLB-M0 model internals: reusable market/signal helpers moved into `models/shared/sports-core/`, while `mlb-starter-utils.js`, `mlb-analysis-context.js`, `mlb-decision-indicators.js`, and `mlb-props.js` remain MLB-specific under `models/mlb/cartridges/MLB-M0/lib/`; the May 30 golden snapshot stayed unchanged after each behavior-sensitive cut.
- Extracted model-neutral participant construction, market helpers, signal helpers, generic/UFC/NBA structured context, and the match-model factory into `models/shared/sports-core/`; `models/mlb/cartridges/MLB-M0/lib/sports-model.js` is now the MLB adapter and public export barrel.
- Moved MLB-M0 workflow implementations into `models/mlb/cartridges/MLB-M0/workflows/`; the old `pipeline/mlb/workflows/` files now launch the cartridge workflows for compatibility.
- Moved MLB-M0 publish lane implementations into `models/mlb/cartridges/MLB-M0/lanes/`; the old `pipeline/mlb/publish/` files now launch the cartridge lanes for compatibility.
- Re-routed the old `pipeline/mlb/workflows/` and `pipeline/mlb/publish/` compatibility launchers through `models/mlb/run-cartridge.mjs` so they resolve the active parent model instead of hardcoding MLB-M0.
- Removed the unused MLB-M0 `legacy-runner.mjs` helper after lane and workflow launchers no longer depended on it.
- Added `cartridge_migration/mlb_pipeline_ownership_audit.md` to classify remaining MLB pipeline folders as data plumbing, compatibility launchers, or offline research before any further moves.
- Added an MLB-RP36 run envelope with dated source/input/output locks and exact reliever-shadow snapshot verification. The first reproducible RP36 run is May 31, because the May 30 legacy artifact no longer exactly regenerates from the current warehouse.
- Added a shared model-run indexer at `models/shared/model-runs/index_runs.py`; MLB-M0 and MLB-RP36 locks now populate `model_runs`, `model_run_artifacts`, `model_run_lanes`, `model_component_runs`, and RP36 settlement tables in `data-private/warehouse/sports.db`.
- Added `models/mlb/cartridges/MLB-M0/components/index.json` plus lane READMEs for sides, first-five, totals, props, home runs, market context, and the consumed MLB-RP36 addendum.
- Narrowed the MLB-M0 source inventory away from workflow/publish compatibility launchers and frontend shims while keeping cartridge-owned behavior, shared core files, warehouse contracts, and consumed addendum files explicit.
- Updated active app imports and future tennis day generation to import `models/shared/sports-core/app-sports-model.js` directly; historical generated day files can keep the compatibility shim.
- Added registry-aware MLB lifecycle wrappers under `models/mlb/` and routed MLB package scripts through them for parent-model run, lock, verify, workflow, and lane dispatch.
- Routed MLB-RP36 package scripts and the MLB-M0 refresh workflow through the same registry-aware wrappers, so the relief addendum is consumed as a registered component instead of a direct file path.
- Replaced MLB-M0 refresh/follow-up internal calls to `pipeline/mlb/publish/*` with current-model registry lane dispatch, so non-active comparison runs do not accidentally route back to the active model.
- Added `development-docs/mlb/runbooks/model-iteration.md` documenting how a future `MLB-M1` should be scaffolded from `MLB-M0`, benchmarked, locked, compared, and activated.
- Added `models/mlb/app-model.js` so app-facing MLB adapter resolution is centralized and unregistered future active parent models fail loudly instead of silently using MLB-M0.
- Re-routed the web prop-calibration shim through `models/mlb/app-model.js` so future model adapters can own calibration exposure.
- Added `cartridge_migration/mlb_cartridge_audit_2026_05_31.md` to separate fixed active-path misses from intentional manifest/historical references.
- Moved MLB pregame and refresh workflow implementations into `pipeline/mlb/workflows/`.
- Moved the MLB close/follow-up workflow into `pipeline/mlb/workflows/followup.mjs`, and pointed future generated postmortem/follow-up docs into `development-docs/mlb/postmortems/`.
- Moved MLB refresh verification into `pipeline/mlb/workflows/verify-refresh.mjs`.
- Added pipeline folder contracts for future MLB and tennis workflow/fetcher/warehouse/publish/research moves.
- Moved MLB fetchers/watchers into `pipeline/mlb/fetchers/`.
- Moved MLB publish/export scripts into `pipeline/mlb/publish/`.
- Updated MLB refresh/follow-up workflows and package scripts to call the sport-scoped publish paths directly.
- Moved MLB warehouse/backtest/story-archive CLIs into `pipeline/mlb/warehouse/`.
- Updated MLB package scripts, workflows, fetchers, and MLB-M0 manifest to call the sport-scoped warehouse paths directly.
- Moved MLB research and market-training scripts into `pipeline/mlb/research/`.
- Updated MLB research package scripts and MLB-RP36 manifest source paths to use the sport-scoped research paths directly.
- Moved the MLB-RP36 reliever-shadow exporter into `models/mlb/cartridges/MLB-RP36/exporter.py`.
- Moved tennis fetchers into `pipeline/tennis/fetchers/`.
- Updated tennis fetch package scripts to call the sport-scoped fetcher paths directly.
- Added `tests/model_registry_test.py` to catch missing cartridge manifests and declared files.
- Added destination folders and READMEs for sport-specific `development-docs/` migration without moving script-written docs yet.
- Moved tennis runbook/research notes and MLB daily runbook/source checklist into sport-specific `development-docs/` folders and updated direct references.
- Moved legacy MLB research notes, slate postmortems, converted follow-ups, and action tickets into sport-scoped `development-docs/mlb/` folders; moved the tennis follow-up into `development-docs/tennis/postmortems/`; updated MLB research writer defaults so new reports land in sport-scoped folders.
- Added a file-structure regression test that fails if new active docs are written back into the root `development-docs/` or legacy `research/` folders.
- Moved tennis warehouse, workflow, and publish implementations into `pipeline/tennis/{warehouse,workflows,publish}/`.
- Updated tennis package scripts and runbook commands to call the sport-scoped core paths directly.
- Moved tennis research, value, Kalshi, and upset-audit scripts into `pipeline/tennis/research/`.
- Updated tennis package scripts, runbooks, and future run-lock source inventory to use the sport-scoped research paths directly.
- Moved tennis warehouse SQL migrations into `pipeline/tennis/warehouse/migrations/` and left warehouse code with a legacy fallback for old checkouts.
- Cut TEN-T0/TEN-F0/TEN-E0 active cartridge metadata over to `models/tennis/cartridges/`, refreshed the May 31 TEN-T0 golden snapshot for metadata-path changes only, and removed the duplicate `pipeline/tennis_model_cartridges/` and legacy tennis registry files.
- Removed the remaining top-level `pipeline/*.mjs` and `pipeline/*.py` compatibility wrappers after package scripts, tests, and manifests were pointed at sport-scoped canonical paths.
- Moved the shared Python warehouse path helper to `pipeline/lib/warehouse_paths.py`.
- Added `cartridge_migration/technical_debt.md` as the running ledger for shims, delegated implementation paths, broad source locks, and other hanging migration files.

## Intentionally Still Legacy

- MLB prediction behavior still uses some current pipeline fetcher/warehouse/research internals. MLB-RP36 owns its reliever-shadow exporter, and MLB-M0 now owns the daily workflow surface, publish lanes, shared scoring module, and run envelope.
- `research/` remains as a README-only legacy pointer; the old follow-up and ticket notes now live under `development-docs/`.
- Compatibility shims and delegated paths are tracked in `cartridge_migration/technical_debt.md` until they are removed or formally reclassified as pipeline-owned.

## Next Safe Steps

1. Move model-owned feature generation out of pipeline folders only after the May 30/May 31 golden snapshots cover the change.
2. Backtest RP36 exact/top-2/top-3 component lanes across future locked runs before letting relief context drive picks.
3. Register any future parent model's app adapter in `models/mlb/app-model.js` before activation if it changes or relies on the app-facing match-model contract.
4. Decide whether the old pipeline compatibility launchers become permanent CLI/API surfaces or can be removed after package scripts and docs settle.
5. Update `cartridge_migration/technical_debt.md` in the same patch whenever a migration step leaves a shim, wrapper, compatibility path, delegated implementation, or broad lock behind.
