# File Migration Progress

Date: 2026-05-31

## Completed

- Added top-level `models/` registry and sport registries.
- Copied tennis `T0`, `F0`, and `E0` cartridges into `models/tennis/cartridges/`.
- Added `pipeline/lib/model-cartridge-resolver.mjs` so model readers can prefer `models/` and fall back to legacy `pipeline/tennis_model_cartridges/`.
- Updated tennis run creation and public export model-card loading to prefer the new cartridge location.
- Updated the tennis active registry to live in `models/tennis/registry.json` while preserving the legacy registry as fallback/reference.
- Created MLB cartridge shells for `M0`, `RP36`, and `E0`.
- Added thin MLB cartridge runners for `M0` and `RP36` that delegate to the current legacy pipeline scripts.
- Added an RP36 snapshot verifier and confirmed it reproduces the existing 2026-05-30 reliever-shadow artifact exactly.
- Added `tests/model_registry_test.py` to catch missing cartridge manifests and declared files.
- Added destination folders and READMEs for sport-specific `development-docs/` migration without moving script-written docs yet.

## Intentionally Still Legacy

- `pipeline/generate-tennis-day-module.mjs` still emits the old T0 manifest path so the existing May 31 golden snapshot remains comparable.
- `pipeline/verify-tennis-model-snapshot.mjs` still reads the old T0 manifest path for the same golden-snapshot reason.
- `pipeline/tennis_model_cartridges/` remains in place until the T0 snapshot contract is intentionally cut over.
- MLB prediction behavior still runs through the current pipeline scripts. The new MLB cartridges are shells only.

## Next Safe Steps

1. Add a tennis snapshot cutover plan that allows metadata path changes without disguising prediction-math drift.
2. Add an MLB `M0` run manifest design before moving side, first-five, total, prop, or home-run scripts.
3. Move development docs into sport-specific folders only after package scripts that write those docs are updated together.
4. Add a planned tennis metadata-path cutover test before changing the T0 golden snapshot path.
