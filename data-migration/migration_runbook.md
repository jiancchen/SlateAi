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
- Every source-folder row should name the reusable parser module when parsing is required.
- Commit after each stable phase checkpoint.
- Generated JSON and web mirrors are export caches after migration, not source truth.
- Keep warehouse binaries out of Git. `data-private/warehouse/` is ignored; commit scripts, schemas, reports, and ledgers instead.

## Ledger Files

Use two ledgers with different jobs:

- `data-migration/migration_ledger.md` is the human dashboard.
- `data-migration/migration_events.jsonl` is the append-only machine-readable event log.

Markdown is not the operational source of truth for scripts. Scripts should append JSONL events and may update the Markdown dashboard for readability.

Each JSONL event should include:

- `event_id`
- `timestamp`
- `phase`
- `area`
- `source`
- `target`
- `parser_module`
- `migration_script`
- `validation`
- `status_from`
- `status_to`
- `report_path`
- `checksum`
- `notes`

## Engineering Guardrails

These rules are specifically here to save time and tokens later.

### Script Contract

Every migration script should support:

- `--sport` when the script can run for more than one sport.
- `--dry-run` to print planned writes without changing a DB.
- `--report <path>` to write a compact machine-readable report.
- `--force` only when rerunning a completed step is intentionally destructive to the target DB.
- deterministic output ordering so report hashes are stable.

Scripts should be idempotent by default. Running the same backfill twice should not duplicate rows.

### Parser Contract

Source parsers are reusable pipeline modules, not disposable migration helpers.

Migration scripts should call parser modules from `pipeline/sources/...`, and future ingestion should call the same modules.

Each parser module should provide:

- source family name
- supported file/path patterns
- `detectShape(payloadOrPath)` or equivalent
- `parse(payloadOrPath)` with normalized output rows
- unknown-shape reporting
- fixture tests
- output contract documentation

Preferred parser locations:

```text
pipeline/sources/mlb/stats-api/
pipeline/sources/mlb/baseballsavant/
pipeline/sources/mlb/fanduel/
pipeline/sources/mlb/kalshi/
pipeline/sources/mlb/robinhood/
pipeline/sources/tennis/flashscore/
pipeline/sources/tennis/sofascore/
pipeline/sources/tennis/livesport/
pipeline/sources/tennis/rankings/
pipeline/sources/tennis/fanduel/
pipeline/sources/tennis/robinhood/
```

Parser fixtures should live near the parser, not under one-off migration folders.

### Read/Write Scope

Every script should print:

- source path or source table group
- target DB
- target table group
- rows/files read
- rows inserted
- rows updated
- rows skipped
- validation report path

No migration script should scan all of `data-private/` unless it is an explicit inventory script.

### Identity And Aliases

Player/team/match identity problems must be captured as data, not hidden in code.

Each sport DB should include alias/unresolved-entity tables so fuzzy matching can be audited later. A row with a fuzzy or unknown match should never silently overwrite a canonical entity.

### Validation Before Promotion

`backfilled` means rows were copied or parsed. It does not mean the new DB is trusted.

`validated` requires row-count or coverage checks.

`promoted` requires the active pipeline or export to read from the new DB.

### Query And Token Budgets

After migration, normal prediction runs should read compact DB reports and scoped DB queries, not thousands of JSON files.

Any script that creates a public/export artifact should write an export manifest that says exactly which sport, date, model, and source DB rows were used.

### Indexes

Schema validation should confirm indexes for the common access paths:

- sport/date/model run lookup
- game or match lookup
- player lookup
- market source/captured time lookup
- source snapshot hash lookup
- settlement by prediction row

### Rollback

Before promotion, rollback is simple: delete the new target DB and rebuild it.

After promotion, rollback means switching the read path back to legacy/export and keeping the failed DB for inspection. Do not delete the failed DB until the cause is understood.

## Normal Migration Loop

For each folder or table group:

1. Mark the ledger row `started`.
2. Confirm the migration script path and target table/group are named.
3. Run the migration script with `--dry-run`.
4. Run the migration script in write mode.
5. Save the migration report.
6. Mark the row `backfilled`.
7. Run the validation script/query.
8. Save the validation report.
9. Mark the row `validated`.
10. Run prediction/export parity checks if this source affects site output.
11. Mark the row `promoted` only after the pipeline reads the new DB source.
12. Mark the row `archive_ready` only when old source paths are no longer active pipeline inputs.

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
- `migration_runs` rows are written for schema creation.
- alias/unresolved-entity tables exist.
- required index checks pass.
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
