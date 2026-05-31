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
| MLB-M0 frontend compatibility | `web/src/lib/sports-model.js` is now a re-export shim to `models/mlb/cartridges/MLB-M0/lib/sports-model.js`. | Existing frontend and generated modules still import the old path. | Future edits may land in the shim or assume the old path owns model logic. | All active callers import the canonical cartridge module or a true shared core module, then the shim is removed. | Audit web and generated imports after MLB-M0 lib split. | Open |
| MLB-M0 model lib | `models/mlb/cartridges/MLB-M0/lib/sports-model.js` is now a thin public entrypoint/export barrel, but some generic/UFC compatibility context still lives under MLB-M0 modules. | Historical frontend day files still import this model entrypoint for multiple sports. | Shared helper ownership can still confuse future cross-sport work until there is a true shared core package. | Generic/UFC compatibility helpers either move to a shared core or historical callers stop depending on the MLB-M0 entrypoint. | Keep MLB behavior in cartridge modules; defer shared-core decision until MLB migration is stable. | Open |
| MLB-M0 generated support | `MLB-M0/lib/sports-model.js` imports `web/src/lib/structured-inputs.js` and `web/src/lib/mlb-prop-calibration.generated.js`. | Support files were not moved in the same pass. | Cartridge still depends on web-owned paths. | Generated/support inputs live under a model-owned or pipeline-owned generated area, with frontend importing through a loader. | Move after lib split so ownership is clear. | Open |
| MLB-M0 workflow internals | `models/mlb/cartridges/MLB-M0/workflows/*` wrappers still delegate to `pipeline/mlb/workflows/*`. | Wrappers establish the cartridge entry point before implementation moves. | AI or scripts may patch pipeline internals without realizing they are model behavior. | Move model-owned workflow implementation into MLB-M0 or clearly mark pipeline code as orchestration only. | Migrate one workflow at a time with run verification. | Open |
| MLB-M0 publish lanes | `models/mlb/cartridges/MLB-M0/lanes/*` wrappers still delegate to `pipeline/mlb/publish/*`. | Lane wrappers preserve package-script compatibility. | Model-owned lane behavior is still split across cartridge and pipeline. | Move lane implementation into cartridge modules or isolate pipeline scripts as publish plumbing only. | Prioritize sides, props, then history journal. | Open |
| MLB-M0 warehouse/research boundary | Some warehouse and research scripts remain under `pipeline/mlb/{warehouse,research}` by design. | Fetching, warehousing, and backtest utilities are less model-specific than scoring code. | Model-owned feature logic may hide inside pipeline folders over time. | Each script is classified as data plumbing, model feature generation, or historical research. Model feature generation moves into cartridges. | Add classification comments to manifest/source inventory. | Open |
| MLB-M0 run locks | File-based locks live under `data-private/model-runs/mlb/MLB-M0/`. | They were added before shared DB model-run storage for MLB. | Settlement and model performance can be harder to query across sports. | MLB-M0 run manifests, locks, and settlement summaries are also indexed in shared model-run tables. | Add DB indexing after file ownership stabilizes. | Open |
| MLB-RP36 addendum | `models/mlb/cartridges/MLB-RP36/exporter.py` is cartridge-owned, but addendum runs are not yet tracked like full MLB-M0 runs. | RP36 is an input component, not the parent daily slate runner. | Relief model changes can be under-audited compared with MLB-M0. | RP36 has its own run manifest, source/input/output locks, and settlement/performance summaries. | Create RP36 run envelope once M0 envelope is stable. | Open |
| Historical artifacts | Older generated artifacts may reference old paths such as `web/src/lib/sports-model.js`. | They are frozen historical outputs. | Search results can make old paths look active. | Leave historical artifacts unchanged unless a deliberate backfill migration is approved. New outputs should reference canonical paths. | When searching, exclude published historical artifacts unless validating history. | Open |
| Tennis cross-sport import smell | Tennis generated day modules may import `./sports-model.js`, which re-exports the MLB-M0 scoring module. | The old frontend helper was shared before cartridges existed. | Cross-sport naming can confuse future AI and humans during broad greps. | Split generic sports helpers from MLB-specific model code, or create a shared core module with sport-specific adapters. | Revisit after MLB-M0 lib split identifies true generic helpers. | Open |
| Active docs vs historical docs | Some historical docs mention old paths or old model IDs. | Historical docs should not be rewritten just to sanitize old context. | Broad search can surface stale instructions. | Active docs use canonical paths; historical docs are clearly housed under postmortems/archive folders. | Add stale-path notes only when a historical doc is likely to be reused operationally. | Open |
| Broad source inventory | MLB-M0 run source locks still include broad workflow, publish, and web compatibility files. | The model chain has not been fully decomposed. | Source hashes may change for plumbing edits that do not alter model logic. | Source inventory is narrowed to cartridge-owned behavior plus explicit input components. | Narrow after wrappers stop delegating major behavior. | Open |

## Resolved Items

None yet.

## Migration Notes

- 2026-05-31: Split primitive odds/format helpers into `models/mlb/cartridges/MLB-M0/lib/core-utils.js`, team-name helpers into `models/mlb/cartridges/MLB-M0/lib/team-utils.js`, simulation into `models/mlb/cartridges/MLB-M0/lib/mlb-simulation.js`, pick rankings into `models/mlb/cartridges/MLB-M0/lib/pick-rankings.js`, side-control gates into `models/mlb/cartridges/MLB-M0/lib/mlb-side-controls.js`, and parlay helpers into `models/mlb/cartridges/MLB-M0/lib/parlay.js`. `sports-model.js` still re-exports the same public API.
- 2026-05-31: Split signal helpers, market-line helpers, starter/pitcher helpers, MLB analysis context/projection, MLB decision indicators, and MLB prop selection into `models/mlb/cartridges/MLB-M0/lib/{signal-utils.js,market-utils.js,mlb-starter-utils.js,mlb-analysis-context.js,mlb-decision-indicators.js,mlb-props.js}` while preserving the May 30 golden snapshot.
- 2026-05-31: Split participant construction, structured/generic context, and final analysis orchestration into `models/mlb/cartridges/MLB-M0/lib/{participant-model.js,structured-analysis-context.js,analysis-model.js}`; `sports-model.js` is now the public entrypoint.
