# File Migration Progress

Date: 2026-05-31

## Completed

- Added top-level `models/` registry and sport registries.
- Copied tennis `T0`, `F0`, and `E0` cartridges into `models/tennis/cartridges/`.
- Added `pipeline/lib/model-cartridge-resolver.mjs` so model readers resolve tennis cartridges from `models/`.
- Updated tennis run creation and public export model-card loading to read the model-owned cartridge location.
- Updated the tennis active registry to live in `models/tennis/registry.json`.
- Created MLB cartridge shells for `M0`, `RP36`, and `E0`.
- Added thin MLB cartridge runners for `M0` and `RP36` that delegate to the current legacy pipeline scripts.
- Added an RP36 snapshot verifier and confirmed it reproduces the existing 2026-05-30 reliever-shadow artifact exactly.
- Added an M0 May 30 golden snapshot target for MLB board outputs: 15 games, 15 side picks, 49 prop picks, 12 HR picks, 30 reliever-shadow teams, and 15 lineup boards.
- Added file-based M0 run locking and verification for MLB, covering source locks, input locks, output locks, the M0 snapshot, and the consumed RP36 addendum.
- Routed `data:run:mlb-pregame`, `data:export:mlb-reliever-shadow`, and the MLB refresh workflow through cartridge runners while preserving legacy internals.
- Moved MLB pregame and refresh workflow implementations into `pipeline/mlb/workflows/`.
- Moved the MLB close/follow-up workflow into `pipeline/mlb/workflows/followup.mjs`, and pointed future generated postmortem/follow-up docs into `development-docs/mlb/postmortems/`.
- Moved MLB refresh verification into `pipeline/mlb/workflows/verify-refresh.mjs`.
- Added pipeline folder contracts for future MLB and tennis workflow/fetcher/warehouse/publish/research moves.
- Moved MLB fetchers/watchers into `pipeline/mlb/fetchers/`.
- Moved MLB publish/export scripts into `pipeline/mlb/publish/`.
- Updated MLB refresh/follow-up workflows and package scripts to call the sport-scoped publish paths directly.
- Moved MLB warehouse/backtest/story-archive CLIs into `pipeline/mlb/warehouse/`.
- Updated MLB package scripts, workflows, fetchers, and M0 manifest to call the sport-scoped warehouse paths directly.
- Moved MLB research and market-training scripts into `pipeline/mlb/research/`.
- Updated MLB research package scripts and RP36 manifest source paths to use the sport-scoped research paths directly.
- Moved the RP36 reliever-shadow exporter into `models/mlb/cartridges/RP36/exporter.py`.
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
- Cut T0/F0/E0 active cartridge metadata over to `models/tennis/cartridges/`, refreshed the May 31 T0 golden snapshot for metadata-path changes only, and removed the duplicate `pipeline/tennis_model_cartridges/` and legacy tennis registry files.
- Removed the remaining top-level `pipeline/*.mjs` and `pipeline/*.py` compatibility wrappers after package scripts, tests, and manifests were pointed at sport-scoped canonical paths.
- Moved the shared Python warehouse path helper to `pipeline/lib/warehouse_paths.py`.

## Intentionally Still Legacy

- MLB prediction behavior still runs through current pipeline logic under sport-scoped workflow/fetcher/publish/warehouse/research folders. RP36 owns its reliever-shadow exporter, and M0 now has a run envelope but still delegates prediction internals.
- `research/` remains as a README-only legacy pointer; the old follow-up and ticket notes now live under `development-docs/`.

## Next Safe Steps

1. Re-lock or intentionally supersede the May 31 tennis run source lock after this migration checkpoint; strict run verification now reports expected source drift from moved files, while `--allow-source-drift` verifies outputs and coverage.
2. Continue moving MLB model-owned internals into `models/mlb/cartridges/M0/` once the run verifier is green for each step.
3. Promote any remaining compatibility wrappers only after package scripts and run locks are updated in the same checkpoint.
