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
- Moved the shared deterministic scoring module from `web/src/lib/sports-model.js` to `models/mlb/cartridges/MLB-M0/lib/sports-model.js`; the frontend path now re-exports the cartridge module for compatibility.
- Split MLB-M0 primitive odds/format helpers into `models/mlb/cartridges/MLB-M0/lib/core-utils.js`, team-name helpers into `models/mlb/cartridges/MLB-M0/lib/team-utils.js`, simulation into `models/mlb/cartridges/MLB-M0/lib/mlb-simulation.js`, pick rankings into `models/mlb/cartridges/MLB-M0/lib/pick-rankings.js`, side-control gates into `models/mlb/cartridges/MLB-M0/lib/mlb-side-controls.js`, and parlay helpers into `models/mlb/cartridges/MLB-M0/lib/parlay.js` while preserving the `sports-model.js` export surface.
- Split additional MLB-M0 model internals into `models/mlb/cartridges/MLB-M0/lib/market-utils.js`, `signal-utils.js`, `mlb-starter-utils.js`, `mlb-analysis-context.js`, `mlb-decision-indicators.js`, and `mlb-props.js`; the May 30 golden snapshot stayed unchanged after each behavior-sensitive cut.
- Split the remaining factory internals into `models/mlb/cartridges/MLB-M0/lib/participant-model.js`, `structured-analysis-context.js`, and `analysis-model.js`, leaving `sports-model.js` as a thin public entrypoint/export barrel.
- Moved MLB-M0 workflow implementations into `models/mlb/cartridges/MLB-M0/workflows/`; the old `pipeline/mlb/workflows/` files now launch the cartridge workflows for compatibility.
- Moved MLB-M0 publish lane implementations into `models/mlb/cartridges/MLB-M0/lanes/`; the old `pipeline/mlb/publish/` files now launch the cartridge lanes for compatibility.
- Removed the unused MLB-M0 `legacy-runner.mjs` helper after lane and workflow launchers no longer depended on it.
- Added `cartridge_migration/mlb_pipeline_ownership_audit.md` to classify remaining MLB pipeline folders as data plumbing, compatibility launchers, or offline research before any further moves.
- Added an MLB-RP36 run envelope with dated source/input/output locks and exact reliever-shadow snapshot verification. The first reproducible RP36 run is May 31, because the May 30 legacy artifact no longer exactly regenerates from the current warehouse.
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

1. Decide whether generic/UFC analysis context should stay in MLB-M0 for compatibility or move later into a true shared model core.
2. Move model-owned feature generation out of pipeline folders only after the May 30/May 31 golden snapshots cover the change.
3. Add DB indexing for MLB-M0 and MLB-RP36 model-run manifests once file ownership stabilizes.
4. Update `cartridge_migration/technical_debt.md` in the same patch whenever a migration step leaves a shim, wrapper, compatibility path, delegated implementation, or broad lock behind.
