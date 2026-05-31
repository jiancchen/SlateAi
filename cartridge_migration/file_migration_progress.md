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
- Routed `data:run:mlb-pregame`, `data:export:mlb-reliever-shadow`, and the MLB refresh workflow through cartridge runners while preserving legacy internals.
- Moved MLB pregame and refresh workflow implementations into `pipeline/mlb/workflows/` with compatibility wrappers at the old pipeline paths.
- Moved the MLB close/follow-up workflow into `pipeline/mlb/workflows/followup.mjs` with a compatibility wrapper, and pointed future generated postmortem/follow-up docs into `development-docs/mlb/postmortems/`.
- Moved MLB refresh verification into `pipeline/mlb/workflows/verify-refresh.mjs` with a compatibility wrapper.
- Added pipeline folder contracts for future MLB and tennis workflow/fetcher/warehouse/publish/research moves.
- Moved MLB fetchers/watchers into `pipeline/mlb/fetchers/` with compatibility wrappers at their old top-level pipeline paths.
- Moved MLB publish/export scripts into `pipeline/mlb/publish/` with compatibility wrappers at their old top-level pipeline paths.
- Updated MLB refresh/follow-up workflows and package scripts to call the sport-scoped publish paths directly.
- Moved MLB warehouse/backtest/story-archive CLIs into `pipeline/mlb/warehouse/` with import-capable compatibility wrappers at their old top-level pipeline paths.
- Updated MLB package scripts, workflows, fetchers, and M0 manifest to call the sport-scoped warehouse paths directly.
- Moved MLB research and market-training scripts into `pipeline/mlb/research/` with import-capable compatibility wrappers at their old top-level pipeline paths.
- Updated MLB research package scripts and RP36 manifest source paths to use the sport-scoped research paths directly.
- Moved the RP36 reliever-shadow exporter into `models/mlb/cartridges/RP36/exporter.py`; `pipeline/export_mlb_reliever_shadow_board.py` is now a compatibility wrapper.
- Moved tennis fetchers into `pipeline/tennis/fetchers/` with compatibility wrappers at their old top-level pipeline paths.
- Updated tennis fetch package scripts to call the sport-scoped fetcher paths directly.
- Added `tests/model_registry_test.py` to catch missing cartridge manifests and declared files.
- Added destination folders and READMEs for sport-specific `development-docs/` migration without moving script-written docs yet.
- Moved tennis runbook/research notes and MLB daily runbook/source checklist into sport-specific `development-docs/` folders and updated direct references.
- Moved tennis warehouse, workflow, and publish implementations into `pipeline/tennis/{warehouse,workflows,publish}/` with compatibility wrappers at their old top-level pipeline paths.
- Updated tennis package scripts and runbook commands to call the sport-scoped core paths directly.
- Moved tennis research, value, Kalshi, and upset-audit scripts into `pipeline/tennis/research/` with compatibility wrappers at their old top-level pipeline paths.
- Updated tennis package scripts, runbooks, and future run-lock source inventory to use the sport-scoped research paths directly.
- Moved tennis warehouse SQL migrations into `pipeline/tennis/warehouse/migrations/` and left warehouse code with a legacy fallback for old checkouts.
- Cut T0/F0/E0 active cartridge metadata over to `models/tennis/cartridges/`, refreshed the May 31 T0 golden snapshot for metadata-path changes only, and removed the duplicate `pipeline/tennis_model_cartridges/` and legacy tennis registry files.

## Intentionally Still Legacy

- `pipeline/generate-tennis-day-module.mjs` and `pipeline/verify-tennis-model-snapshot.mjs` remain compatibility wrappers for old commands, while the T0 manifest source hashes now point at the sport-scoped implementations.
- MLB prediction behavior still runs through current pipeline logic under sport-scoped workflow/fetcher/publish/warehouse/research folders. RP36 now owns its reliever-shadow exporter; M0 remains a shell.

## Next Safe Steps

1. Re-lock or intentionally supersede the May 31 tennis run source lock after this migration checkpoint; strict run verification now reports expected source drift from moved files, while `--allow-source-drift` verifies outputs and coverage.
2. Add an MLB `M0` run manifest design before moving warehouse/research internals.
3. Move remaining script-written development docs only after their package scripts are updated together.
