# Data Migration Runbook

## Goal

Move from file-first sports data to sport-owned SQLite warehouses and rebuildable DuckDB analytics without deleting or mutating the existing source data.

Primary durable targets:

- `data-private/warehouse/sports/mlb/mlb.db`
- `data-private/warehouse/sports/tennis/tennis.db`

Legacy source DB:

- `data-private/warehouse/sports.db`

## Ground Rules

- Never mutate `data-private/warehouse/sports.db`.
- Never move, delete, or compress source folders until the ledger row is `archive_ready`.
- Track migration by folder/table group, not individual file.
- Every active ledger row must name the migration script, target table/group, validation script/query, and status.
- Commit after each stable phase checkpoint.
- Generated JSON and web mirrors are export caches after migration, not source truth.

## Normal Migration Loop

For each folder or table group:

1. Mark the ledger row `started`.
2. Confirm the migration script path and target table/group are named.
3. Run the migration script.
4. Mark the row `backfilled`.
5. Run the validation script/query.
6. Save the validation report.
7. Mark the row `validated`.
8. Run prediction/export parity checks if this source affects site output.
9. Mark the row `promoted` only after the pipeline reads the new DB source.
10. Mark the row `archive_ready` only when old source paths are no longer active pipeline inputs.

## Phase Order

### Phase 0: Inventory And Freeze

Status: complete.

Script:

```bash
node data-migration/scripts/inspect_legacy_dbs.mjs
```

Output:

- `data-migration/reports/legacy_db_inventory_2026-06-01.json`

### Phase 1: Create Empty Sport DBs

Purpose:

- Create sport-owned DB directories.
- Create schema migration tables.
- Create source snapshot tables.
- Create core sport schemas.
- Do not copy source rows yet.

Planned script:

```bash
node data-migration/scripts/create_sport_dbs.mjs
```

Validation:

```bash
node data-migration/scripts/validate_sport_db.mjs --schema-only mlb
node data-migration/scripts/validate_sport_db.mjs --schema-only tennis
```

Exit criteria:

- `mlb.db` exists and opens cleanly.
- `tennis.db` exists and opens cleanly.
- `schema_migrations` rows are present.
- Core tables exist.
- Ledger Phase 1 rows are `validated`.

### Phase 2: Backfill Existing `sports.db` Tables

Purpose:

- Split mixed legacy DB rows into sport-specific DBs.
- Preserve stable IDs and source table references.

Planned scripts:

```bash
node data-migration/scripts/backfill_mlb_from_sports_db.mjs
node data-migration/scripts/backfill_tennis_from_sports_db.mjs
```

Validation:

```bash
node data-migration/scripts/validate_sport_db.mjs --sport mlb --phase legacy-backfill
node data-migration/scripts/validate_sport_db.mjs --sport tennis --phase legacy-backfill
```

Exit criteria:

- Source/target row counts match for copied legacy table groups.
- Critical joins work by stable ID.
- Prediction and settlement benchmark rows are still traceable.

### Phase 3: Register Raw And Reference Folders

Purpose:

- Register source receipts into `source_snapshots`.
- Parse missing facts only after source rows are registered.
- Keep raw JSON untouched.

Planned script shape:

```bash
node data-migration/scripts/register_source_folder.mjs --sport mlb --source raw-mlb
node data-migration/scripts/register_source_folder.mjs --sport tennis --source tennis-reference
```

Validation:

- Folder file count equals registered source snapshot count, excluding documented ignored files.
- Source hashes exist.
- Source/date coverage report exists.

### Phase 4: Validate Sport DBs

Purpose:

- Prove the new DBs are complete enough to run prediction and backtest workflows.

Validation categories:

- Row counts.
- Checksums.
- Stable key uniqueness.
- Date coverage.
- Market coverage.
- Prediction output parity.
- Settlement/backtest parity.
- Health check rows written into the sport DB.

### Phase 5: Build DuckDB Analytics

Purpose:

- Build rebuildable per-sport analytics DBs from SQLite.
- Do not make DuckDB the only copy of any durable fact.

Planned script:

```bash
python data-migration/scripts/build_sport_duckdb.py --sport mlb
python data-migration/scripts/build_sport_duckdb.py --sport tennis
```

Exit criteria:

- Feature matrices build from SQLite without scanning old JSON folders.
- Backtest smoke tests pass.

### Phase 6: Prediction Write Path

Purpose:

- Prediction runs write to sport DB first.
- JSON export becomes a scoped deploy cache.

Exit criteria:

- A model run can write predictions, value board rows, health checks, and model artifacts to one sport DB.
- It does not rewrite unrelated dates or sports.

### Phase 7: UI/API Read Path

Purpose:

- UI/API read selected sport/date/model from sport DB or DB-derived export.

Exit criteria:

- Model/date switching does not mutate data.
- Public export parity checks pass.

### Phase 8: Archive Readiness

Purpose:

- Identify migrated folders that can be moved/compressed later.

Exit criteria:

- Ledger row is `archive_ready`.
- No active script reads the old folder as source truth.
- Archive path and compression plan are documented.

### Phase 9: Post-Migration Ingestion Rewrite

Purpose:

- Change fetch/ingestion scripts to write through the new sport DBs.

This is intentionally deferred until DB schema/backfill is stable.

Target ingestion flow:

```text
source fetch -> raw archive receipt -> sport SQLite DB -> optional DuckDB -> DB-derived export
```

Exit criteria:

- MLB ingestion writes to `mlb.db`.
- Tennis ingestion writes to `tennis.db`.
- Source JSON is hashed and registered.
- Prediction runs no longer scan raw JSON unless explicitly rebuilding.
- Health checks verify date/source coverage.

## Commit Guidance

Commit after:

- Ledger structure changes.
- New migration scripts.
- Phase 1 schema creation.
- Each sport backfill.
- Each validation report.
- Any promotion of read/write paths.

Commit message format:

```text
Migration: <phase> <short action>
```

Example:

```text
Migration: create empty sport DB schemas
```

