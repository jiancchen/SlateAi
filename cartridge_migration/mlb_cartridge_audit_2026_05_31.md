# MLB Cartridge Audit 2026-05-31

Purpose: catch active MLB paths that still bypass the cartridge registry after the MLB-M0 / MLB-RP36 migration. Historical docs and frozen artifacts can keep old labels, but operator commands and live compatibility shims should resolve through `models/mlb/`.

## Fixed In This Audit

- `pipeline/mlb/workflows/*` now dispatch through `models/mlb/run-cartridge.mjs` instead of hardcoding MLB-M0 workflow files.
- `pipeline/mlb/publish/*` now dispatch through `models/mlb/run-cartridge.mjs --entry lane:<lane>` instead of hardcoding MLB-M0 lane files.
- Package scripts for `data:export:mlb-reliever-shadow`, `data:lock:mlb-rp36`, and `data:verify:mlb-rp36` now use registry-aware wrappers.
- MLB-M0 refresh consumes MLB-RP36 through `models/mlb/run-cartridge.mjs --model MLB-RP36 --entry runner`.
- The web prop-calibration shim re-exports through `models/mlb/app-model.js`, not directly from MLB-M0 generated files.
- MLB-M0 runner now resolves its pregame workflow from the cartridge directory, which makes future scaffolds less brittle.
- MLB-M0 run-lock self-inventory now uses the local cartridge directory for its own manifest and lock/verifier files.
- Model notes and README wording now point future work at `models/`, `models/mlb/app-model.js`, and registry wrappers.

## Intentional Remaining Direct Paths

- Cartridge manifests list their own files directly. That is declarative inventory, not an operator entrypoint.
- MLB-M0 source files still live under `models/mlb/cartridges/MLB-M0/`; that is the active baseline cartridge until a future model is activated.
- MLB-RP36 source files still live under `models/mlb/cartridges/MLB-RP36/`; it is a component/addendum consumed by MLB-M0.
- Run-lock JSON files and historical artifacts under `data-private/` can reference the model that produced them.
- Historical migration docs can mention old paths when describing what moved.

## Still Open

- `pipeline/mlb/warehouse/` and `pipeline/mlb/research/` still need continued classification so model feature formulas do not hide inside generic pipeline folders.
- Future MLB parent models must register their app adapter in `models/mlb/app-model.js` before activation.
- MLB-RP36 May 30 remains a legacy non-reproducible artifact because the warehouse changed after that output was generated.
- The old pipeline compatibility launchers should either become official stable CLI shims or be removed after all direct callers are audited.

## Health Checks Added

- Tests now assert package scripts route MLB parent and RP36 commands through `models/mlb/` wrappers.
- Tests now assert pipeline publish/workflow shims dispatch through the registry wrapper.
- Tests now assert MLB-M0 refresh calls RP36 through the registry wrapper.
- Tests now assert the prop-calibration web shim uses `models/mlb/app-model.js`.
- Tests now assert MLB-M0 runner and run-lock avoid unnecessary self-hardcoded M0 paths.
