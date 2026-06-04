# TEN-T0 DB Cutover Run Plan

## Goal

Move TEN-T0 from generated-file-first inputs to `data-private/warehouse/sports/tennis/sql-tennis.db` as the canonical prediction and publish source, while keeping the legacy file path available until parity is proven.

## Current State

- Tennis raw-to-typed ingestion writes to `sql-tennis.db` for Flashscore stats, odds, rankings, player context, and replay.
- June 2 validation reports are green for raw-to-typed, normalization, public export preview, public index preview, DuckDB rebuild, and read-path readiness.
- TEN-T0 can read the active slate from `sql-tennis.db` with `--input-source db` / `TENNIS_T0_USE_DB=1`.
- The DB-derived public export path exists but is preview-only.
- `TEN-T0` DB-mode runs can now be captured into `model_runs`, `model_artifacts`, and `prediction_rows`.
- Legacy `pipeline/tennis/warehouse/tennis_warehouse.py import-*` commands still exist, but canonical typed ingestion is now exposed under `npm run data:typed:ingest:tennis-*`.

## Progress

- Added sport-scoped warehouse defaults through `pipeline/lib/warehouse_paths.py`.
- Added typed `sql-tennis.db` fallback support to `pipeline/tennis/publish/export_warehouse_context.py`.
- Added `--input-source db` / `TENNIS_T0_USE_DB=1` support to `pipeline/tennis/publish/generate-day-module.mjs`.
- Added `models/tennis/cartridges/TEN-T0/run-db-cutover-check.mjs` for repeatable DB-mode validation.
- Added `models/tennis/cartridges/TEN-T0/capture-db-run.mjs` for DB-mode model run capture.
- Added typed tennis ingest/normalize/export/validate npm scripts.
- June 2 DB-mode check produced 66 matches, no missing markets, and zero pick changes versus file mode.
- June 2 capture stored `tennis-TEN-T0-2026-06-02-db` with 3 artifacts, 66 prediction rows, and zero fallback match IDs.

## Cutover Phases

### Phase 1: Canonical DB Paths

- Default tennis warehouse helpers to `data-private/warehouse/sports/tennis/sql-tennis.db`.
- Keep `SLATE_TENNIS_WAREHOUSE_DB` and `SLATE_WAREHOUSE_DB` overrides.
- Update registry notes from split-deferred to sport-scoped DB active once validation passes.

### Phase 2: Context Export Adapter

- Add a DB-backed context export path that can read typed tennis tables.
- Preserve the old generated context shape consumed by `generate-day-module.mjs`.
- Use June 2 as the parity target.
- Status: initial typed adapter is active for `sql-tennis.db` and exports 66 June 2 matches with two-player coverage.

### Phase 3: TEN-T0 Input Adapter

- Add a DB input adapter for `generate-day-module.mjs`.
- Gate it behind `TENNIS_T0_USE_DB=1` and/or `--input-source db`.
- The adapter should provide:
  - matches from `matches`, `match_players`, `players`, and `tournaments`
  - rankings from `rankings`
  - markets from `market_snapshots`, `market_contracts`, and `market_price_ticks`
  - player context from `player_form_snapshots`, `recent_matches`, and `service_pressure_snapshots`
  - prediction overlays from `model_runs` and `prediction_rows`
- Status: initial DB adapter loads Roland Garros matches and rankings from `sql-tennis.db`; market/ensemble supplements still use existing optional files.

### Phase 4: Model Run Capture

- After TEN-T0 generation, insert the real run into `model_runs`.
- Insert ML and derivative lanes into `prediction_rows`.
- Attach module/prediction artifacts to `model_artifacts`.
- Status: active for ML rows through `capture-db-run.mjs`. Derivative lanes can be added once TEN-T0 emits those prediction rows in the JSON artifact.

### Phase 5: Public Export Promotion

- Promote `data-migration/scripts/export_tennis_public_from_db.py` from preview to active publish path.
- Validate with `validate_tennis_public_export.py` and `validate_tennis_read_path_readiness.py`.
- Switch site publish to DB-derived tennis outputs.

## Validation Commands

```bash
node models/tennis/cartridges/TEN-T0/run-db-cutover-check.mjs --date 2026-06-02 --compare-legacy --capture-db --output-dir /tmp/tennis-t0-db-capture-check
python3 data-migration/scripts/export_tennis_public_index_from_db.py --force
python3 data-migration/scripts/validate_tennis_public_index.py
python3 data-migration/scripts/export_tennis_public_from_db.py --date 2026-06-02 --model latest --force
python3 data-migration/scripts/validate_tennis_public_export.py --date 2026-06-02
python3 data-migration/scripts/validate_tennis_read_path_readiness.py --date 2026-06-02
TENNIS_T0_USE_DB=1 node models/tennis/cartridges/TEN-T0/runner.mjs --date 2026-06-02 --skip-preflight --output /tmp/tennis-db-day.js --predictions-output /tmp/tennis-db-predictions.json
```

`npm run data:health:tennis` is still a legacy-table health check. It now defaults to the typed DB path and will run, but it is not the typed-read readiness gate until it is rewritten against `matches`, `rankings`, `match_players`, and the typed context tables.

## Rollback

- Unset `TENNIS_T0_USE_DB`.
- Set `SLATE_TENNIS_WAREHOUSE_DB=data-private/warehouse/sports.db` only if an old warehouse command must be run.
- Re-run legacy `TEN-T0` with file inputs.
