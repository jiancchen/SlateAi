# Tennis Read-Path Readiness Contract

Status: migration readiness gate only; no API/site promotion.

## Purpose

Before the tennis API or web loaders are rewired to DB-derived exports, this contract verifies that the DB-backed preview layer is coherent and auditable.

This is the last safe check before touching active read paths.

## Required Inputs

- SQLite source of truth: `data-private/warehouse/sports/tennis/sql-tennis.db`
- Ignored preview index:
  - `data-migration/export-previews/tennis/index/index.json`
- Ignored preview slate for a target date:
  - `data-migration/export-previews/tennis/<YYYY-MM-DD>/summary.json`
  - `data-migration/export-previews/tennis/<YYYY-MM-DD>/games/*.json`
- Export contracts:
  - `data-migration/contracts/tennis_public_index_contract.md`
  - `data-migration/contracts/tennis_public_export_contract.md`
- Validation reports:
  - `data-migration/reports/validate_tennis_public_index_preview_*.json`
  - `data-migration/reports/validate_tennis_public_export_preview_<YYYY-MM-DD>.json`
- Latest tennis DuckDB rebuild report after preview writes.

## Required DB Rows

The source DB must contain:

- `export_manifests` row for `tennis_public_index_preview`.
- `export_manifests` row for `tennis_public_slate_preview` for the target date.
- `health_checks` row for `tennis_public_index_preview_validation`.
- `health_checks` row for `tennis_public_export_preview_validation`.

## Readiness Checks

The readiness validator must prove:

1. Preview index file exists and its hash matches the DB manifest.
2. Preview slate summary exists and its hash matches the DB manifest.
3. Preview slate game count equals the DB match count for the target date.
4. Preview index includes the target date.
5. Preview index summary counts match DB totals.
6. Validation health checks exist for index and slate previews.
7. DuckDB rebuild report is OK and has zero table-count mismatches.

## Explicit Non-Goals

This readiness gate must not:

- Modify `published-data/`.
- Modify `web/public/data/`.
- Modify `web/src/lib/`.
- Modify `api/`.
- Start the web server.
- Run predictions or fetch new data.

## Promotion Boundary

If this readiness gate passes, the next migration step may be planned as API/site read-path promotion. That promotion still needs its own contract and checkpoint commit.

