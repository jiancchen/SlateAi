# Cartridge Migration Technical Debt

Date started: 2026-05-31

This is the running ledger for files, shims, delegated paths, and broad locks that are intentionally left behind during the cartridge migration. Update this whenever a migration step leaves a compatibility layer or defers a cleanup.

## Update Protocol

- Add a row when a moved file leaves a shim, wrapper, delegated implementation, broad source lock, or historical artifact that could confuse future work.
- Mark a row `Resolved` with a date when the cleanup is complete. Do not silently delete rows during the same migration phase.
- Keep model-performance debt in sport postmortems. Keep file-structure and ownership debt here.
- Prefer canonical paths in new code. Compatibility paths should be documented here until removed.

## Open Items

| Area | Debt / Hanging File | Why It Remains | Risk | Exit Criteria | Next Action | Status |
| --- | --- | --- | --- | --- | --- | --- |
| MLB-M0 frontend compatibility | `web/src/lib/sports-model.js` now re-exports `models/shared/sports-core/app-sports-model.js`. | Existing frontend and generated modules still import the old frontend path. | Future edits may land in the shim instead of the shared app composition path. | Active code imports shared core or cartridge adapters directly; historical generated day files can keep the shim. | Audit active web imports after the shared core settles. | Open |
| MLB workflow compatibility paths | `pipeline/mlb/workflows/*` are compatibility launchers back into `models/mlb/cartridges/MLB-M0/workflows/*`. | Older direct pipeline calls may still exist outside package scripts. | Future work may patch the compatibility launcher instead of the cartridge workflow. | All active callers use the cartridge workflow path or package scripts; then compatibility launchers can be removed. | Audit direct workflow path callers after publish lanes are migrated. | Open |
| MLB publish compatibility paths | `pipeline/mlb/publish/*` are compatibility launchers back into `models/mlb/cartridges/MLB-M0/lanes/*`. | Older direct publish calls may still exist outside package scripts. | Future work may patch the compatibility launcher instead of the cartridge lane implementation. | All active callers use the cartridge lane path or package scripts; then compatibility launchers can be removed. | Audit direct publish path callers after MLB-M0 run locks settle. | Open |
| MLB-M0 warehouse/research boundary | Some warehouse and research scripts remain under `pipeline/mlb/{warehouse,research}` by design. | Fetching, warehousing, and backtest utilities are less model-specific than scoring code. | Model-owned feature logic may hide inside pipeline folders over time. | Each script is classified as data plumbing, model feature generation, or historical research. Model feature generation moves into cartridges. | Use `cartridge_migration/mlb_pipeline_ownership_audit.md` before promoting research code. | Open |
| MLB-M0 run locks | File-based locks live under `data-private/model-runs/mlb/MLB-M0/`. | They were added before shared DB model-run storage for MLB. | Settlement and model performance can be harder to query across sports. | MLB-M0 run manifests, locks, and settlement summaries are also indexed in shared model-run tables. | Add DB indexing after file ownership stabilizes. | Open |
| MLB-RP36 addendum | `models/mlb/cartridges/MLB-RP36/` now has file-based run locks, but no settlement/performance table yet. | RP36 is an input component, not the parent daily slate runner. | Relief addendum quality can still be hard to query across days. | RP36 run manifests and settlement/performance summaries are indexed in shared model-run tables. | Add DB indexing and RP36 settlement summary after file locks prove stable. | Open |
| MLB-RP36 legacy May 30 artifact | `data-private/predictions/mlb-reliever-shadow/2026-05-30-reliever-shadow.json` has matching team/candidate counts but no longer exactly regenerates from the current warehouse. | The warehouse changed after the legacy artifact was generated. | Treating May 30 as reproducible RP36 truth would hide addendum drift. | Either store the original May 30 RP36 input snapshot or deliberately backfill the artifact with a documented regenerated run. | Keep May 31 as the first reproducible RP36 run envelope. | Open |
| Historical artifacts | Older generated artifacts may reference old paths such as `web/src/lib/sports-model.js`. | They are frozen historical outputs. | Search results can make old paths look active. | Leave historical artifacts unchanged unless a deliberate backfill migration is approved. New outputs should reference canonical paths. | When searching, exclude published historical artifacts unless validating history. | Open |
| Tennis cross-sport import smell | Tennis generated day modules import `./sports-model.js`, which now reaches a shared app composition shim. | Historical generated modules still use the old frontend path. | Broad greps can still mix historical tennis day files with active model code. | Future tennis day generation imports a tennis-owned or shared core path directly instead of the frontend compatibility shim. | Update tennis generator after MLB-M0 migration closes. | Open |
| Active docs vs historical docs | Some historical docs mention old paths or old model IDs. | Historical docs should not be rewritten just to sanitize old context. | Broad search can surface stale instructions. | Active docs use canonical paths; historical docs are clearly housed under postmortems/archive folders. | Add stale-path notes only when a historical doc is likely to be reused operationally. | Open |
| Broad source inventory | MLB-M0 run source locks still include broad workflow, publish, and web compatibility files. | The model chain has not been fully decomposed. | Source hashes may change for plumbing edits that do not alter model logic. | Source inventory is narrowed to cartridge-owned behavior plus explicit input components. | Narrow after wrappers stop delegating major behavior. | Open |

## Resolved Items

None yet.

## Migration Notes

- 2026-05-31: Split primitive odds/format helpers into `models/shared/sports-core/core-utils.js`; team-name helpers, simulation, pick rankings, side-control gates, and parlay helpers remain MLB-specific under `models/mlb/cartridges/MLB-M0/lib/`. `sports-model.js` still re-exports the same public API through the MLB adapter.
- 2026-05-31: Split signal helpers, market-line helpers, starter/pitcher helpers, MLB analysis context/projection, MLB decision indicators, and MLB prop selection into `models/mlb/cartridges/MLB-M0/lib/{signal-utils.js,market-utils.js,mlb-starter-utils.js,mlb-analysis-context.js,mlb-decision-indicators.js,mlb-props.js}` while preserving the May 30 golden snapshot.
- 2026-05-31: Split participant construction, structured/generic context, and final analysis orchestration into `models/mlb/cartridges/MLB-M0/lib/{participant-model.js,structured-analysis-context.js,analysis-model.js}`; `sports-model.js` is now the public entrypoint.
- 2026-05-31: Extracted model-neutral sports contracts into `models/shared/sports-core/`: core odds/format helpers, market helpers, signal helpers, participant construction, generic structured context, and the reusable match-model factory. MLB-M0 now adapts those shared contracts instead of owning UFC/NBA/generic compatibility code.
- 2026-05-31: Moved MLB prop calibration to `models/mlb/cartridges/MLB-M0/generated/mlb-prop-calibration.generated.js`; the web file is now a compatibility re-export.
- 2026-05-31: Moved MLB-M0 workflow implementations into `models/mlb/cartridges/MLB-M0/workflows/*`; `pipeline/mlb/workflows/*` now launch the cartridge workflows for compatibility.
- 2026-05-31: Moved MLB-M0 publish lane implementations into `models/mlb/cartridges/MLB-M0/lanes/*`; `pipeline/mlb/publish/*` now launch the cartridge lanes for compatibility.
- 2026-05-31: Added `cartridge_migration/mlb_pipeline_ownership_audit.md` to define which remaining `pipeline/mlb/` folders are intentional data plumbing or research rather than missed cartridge moves.
- 2026-05-31: Added MLB-RP36 `run_lock.py` and `verify_run.py` with dated source/input/output locks and exact reliever-shadow snapshot verification. May 31 is the first locked RP36 run; May 30 remains legacy/non-reproducible without its original input snapshot.
