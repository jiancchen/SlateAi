# Migration Ledger

This ledger tracks migration progress by folder, table group, and data domain. It intentionally does not track every file.

Statuses:

- `not_started`
- `started`
- `backfilled`
- `validated`
- `promoted`
- `archive_ready`
- `blocked`

Rules:

- Do not mutate `data-private/warehouse/sports.db`.
- Do not delete or move source folders during migration.
- Mark a source as `archive_ready` only after backfill, validation, and production read promotion are complete.
- Every active row should identify the migration script, target table/group, and validation script or query before it is marked `backfilled`.
- Append material notes instead of rewriting history when a phase changes meaningfully.

## Phase Ledger

| Phase | Area | Source | Target | Status | Started | Finished | Validation | Notes |
|---|---|---|---|---|---|---|---|---|
| 0 | Inventory and freeze | `data-private/warehouse/sports.db` | migration reports | validated | 2026-06-01 | 2026-06-01 | `legacy_db_inventory_2026-06-01.json` hash `f73bafeb591f` | Legacy DB baseline captured before creating new DBs. |
| 1 | Empty MLB DB schema | schema plan | `data-private/warehouse/sports/mlb/mlb.db` | not_started |  |  | pending | Create DB only after Phase 0 report is saved. |
| 1 | Empty tennis DB schema | schema plan | `data-private/warehouse/sports/tennis/tennis.db` | not_started |  |  | pending | Create DB only after Phase 0 report is saved. |
| 2 | MLB legacy table backfill | `sports.db` `mlb_*` and MLB-adjacent tables | `mlb.db` | not_started |  |  | pending | Preserve stable IDs and source table references. |
| 2 | Tennis legacy table backfill | `sports.db` `tennis_*` tables | `tennis.db` | not_started |  |  | pending | Preserve match/player keys and source table references. |
| 3 | MLB raw/source folder registration | `data-private/raw/mlb/` and MLB raw source folders | `mlb.db` `source_snapshots` | not_started |  |  | pending | Register raw receipt references before parsing missing facts. |
| 3 | Tennis source folder registration | `data-private/reference/tennis/` and tennis odds folders | `tennis.db` `source_snapshots` | not_started |  |  | pending | Register Flashscore, SofaScore, LiveSport, rankings, and market receipts. |
| 4 | Validation | sport DBs | sport DB `health_checks` and reports | not_started |  |  | pending | Row counts, checksums, joins, benchmark prediction parity. |
| 5 | DuckDB build | sport DBs | per-sport DuckDB analytics DBs | not_started |  |  | pending | Rebuildable analytics DBs only; not source of truth. |
| 6 | Prediction write path | model cartridges | sport DB prediction tables | not_started |  |  | pending | Write model outputs to DB first, export JSON second. |
| 7 | UI/API read path | sport DB or DB-derived export | site/API | not_started |  |  | pending | Selected sport/date/model should load without rewriting unrelated dates. |
| 8 | Archive readiness | migrated folders | archive/compression plan | not_started |  |  | pending | Only after validation and promotion. |
| 9 | Post-migration ingestion rewrite | ingestion/fetch scripts | raw archive -> sport DB write paths | not_started |  |  | pending | Deferred until DB backfill/schema migration is stable, but must be completed before old file-first pipeline is retired. |

## Folder And Table Group Ledger

| Area | Source | Target table/group | Migration script | Status | Started | Finished | Validation script/query | Notes |
|---|---|---|---|---|---|---|---|---|
| Legacy mixed DB inventory | `data-private/warehouse/sports.db` | `data-migration/reports/legacy_db_inventory_2026-06-01.json` | `data-migration/scripts/inspect_legacy_dbs.mjs` | validated | 2026-06-01 | 2026-06-01 | 121 tables; 1,579,845 MLB rows; 493,548 tennis rows; hash `f73bafeb591f` | First active migration task complete. |
| Legacy snapshot DB | `data-private/warehouse/snapshots/2026-05-30/sports-2026-05-30.db` | reference only | pending | not_started |  |  | pending | Keep as checkpoint; do not use unless primary legacy DB is missing rows. |
| Empty tennis placeholder | `data-private/warehouse/tennis.db` | none | none | not_started |  |  | pending | 0-byte placeholder; ignore as source. |
| Empty root tennis placeholder | `data-private/tennis.db` | none | none | not_started |  |  | pending | 0-byte placeholder; ignore as source. |
| Empty MLB DB schema | schema plan | `mlb.db` schema tables | `data-migration/scripts/create_sport_dbs.mjs` | not_started |  |  | `data-migration/scripts/validate_sport_db.mjs --schema-only mlb` | Phase 1. |
| Empty tennis DB schema | schema plan | `tennis.db` schema tables | `data-migration/scripts/create_sport_dbs.mjs` | not_started |  |  | `data-migration/scripts/validate_sport_db.mjs --schema-only tennis` | Phase 1. |
| MLB DB tables | `sports.db` `mlb_*` and MLB-adjacent tables | `mlb.db` normalized core/fact/feature tables | `data-migration/scripts/backfill_mlb_from_sports_db.mjs` | not_started |  |  | `data-migration/scripts/validate_sport_db.mjs --sport mlb --phase legacy-backfill` | Phase 2. |
| Tennis DB tables | `sports.db` `tennis_*` tables | `tennis.db` normalized core/fact/feature tables | `data-migration/scripts/backfill_tennis_from_sports_db.mjs` | not_started |  |  | `data-migration/scripts/validate_sport_db.mjs --sport tennis --phase legacy-backfill` | Phase 2. |
| MLB raw daily payloads | `data-private/raw/mlb/` | `mlb.db` `source_snapshots` plus parsed MLB facts | `data-migration/scripts/register_source_folder.mjs --sport mlb --source raw-mlb` | not_started |  |  | source count/hash coverage report | 1,889 files, 146 MB. |
| MLB Stats API payloads | `data-private/raw/mlb-stats-api/` | `mlb.db` `source_snapshots`, player/profile tables | `data-migration/scripts/register_source_folder.mjs --sport mlb --source mlb-stats-api` | not_started |  |  | source count/hash coverage report | 55 files, 9.3 MB. |
| Baseball Savant payloads | `data-private/raw/baseballsavant/` | `mlb.db` `source_snapshots`, statcast/profile facts | `data-migration/scripts/register_source_folder.mjs --sport mlb --source baseballsavant` | not_started |  |  | source count/hash coverage report | 136 files, 356 MB. |
| MLB odds payloads | `data-private/raw/odds/fanduel-research/`, `data-private/odds/kalshi/mlb/`, `data-private/odds/robinhood/mlb/` | `mlb.db` `market_snapshots` | `data-migration/scripts/register_source_folder.mjs --sport mlb --source odds` | not_started |  |  | market count and date coverage report | FanDuel/Kalshi/Robinhood lines and prices. |
| Tennis reference payloads | `data-private/reference/tennis/` | `tennis.db` source refs, stats, replay, rankings | `data-migration/scripts/register_source_folder.mjs --sport tennis --source tennis-reference` | not_started |  |  | source count/hash coverage and nonzero stat coverage report | 1,525 files, 76 MB. |
| Tennis odds payloads | `data-private/odds/robinhood/tennis/`, FanDuel captures | `tennis.db` `market_snapshots` | `data-migration/scripts/register_source_folder.mjs --sport tennis --source odds` | not_started |  |  | market count and date coverage report | Include prediction-market prices and sportsbook lines. |
| MLB prediction artifacts | `data-private/predictions/mlb-*` | `mlb.db` prediction/value/settlement rows and artifact refs | `data-migration/scripts/backfill_model_artifacts.mjs --sport mlb --type predictions` | not_started |  |  | prediction row/date/model coverage report | Legacy outputs become DB rows plus artifact refs. |
| Tennis prediction artifacts | `data-private/predictions/tennis/` | `tennis.db` prediction/value/settlement rows and artifact refs | `data-migration/scripts/backfill_model_artifacts.mjs --sport tennis --type predictions` | not_started |  |  | prediction row/date/model coverage report | Legacy outputs become DB rows plus artifact refs. |
| MLB model runs | `data-private/model-runs/mlb/` | `mlb.db` `model_runs`, `model_artifacts` | `data-migration/scripts/backfill_model_artifacts.mjs --sport mlb --type model-runs` | not_started |  |  | run/artifact count coverage report | 16 files, 1.8 MB. |
| Tennis model runs | `data-private/model-runs/tennis/` | `tennis.db` `model_runs`, `model_artifacts` | `data-migration/scripts/backfill_model_artifacts.mjs --sport tennis --type model-runs` | not_started |  |  | run/artifact count coverage report | 8 files, 460 KB. |
| MLB DuckDB analytics | `mlb.db` | `data-private/warehouse/analytics/mlb.duckdb` | `data-migration/scripts/build_sport_duckdb.py --sport mlb` | not_started |  |  | DuckDB feature/backtest smoke tests | Rebuildable analytics only. |
| Tennis DuckDB analytics | `tennis.db` | `data-private/warehouse/analytics/tennis.duckdb` | `data-migration/scripts/build_sport_duckdb.py --sport tennis` | not_started |  |  | DuckDB feature/backtest smoke tests | Rebuildable analytics only. |
| Post-migration MLB ingestion rewrite | MLB ingestion/fetch scripts | raw archive -> `mlb.db` write path | pending after backfill | not_started |  |  | ingestion health checks by date/source | Deferred until DB schema/backfill is stable. |
| Post-migration tennis ingestion rewrite | Tennis ingestion/fetch scripts | raw archive -> `tennis.db` write path | pending after backfill | not_started |  |  | ingestion health checks by date/source | Deferred until DB schema/backfill is stable. |
| Public published data | `published-data/` | DB-derived export cache | export scripts after DB promotion | not_started |  |  | export parity checks | Do not treat as source after promotion. |
| Web public data mirror | `web/public/data/` | DB-derived export cache | export scripts after DB promotion | not_started |  |  | export parity checks | Should be generated from DB/export. |
| Generated web modules | `web/src/lib/` | API/export loaders | UI/API migration scripts after DB promotion | not_started |  |  | build and date/model load checks | Reduce generated module churn after DB-backed export. |

## Append-Only Notes

- 2026-06-01: Migration started with ledger and legacy DB inventory baseline. No DB writes or source moves yet.
- 2026-06-01: Legacy DB inventory completed. `sports.db` has 121 tables: 69 MLB tables, 44 tennis tables, 3 MLB-adjacent tables, 1 shared source table, and 4 shared/unknown tables. Inventory hash starts `f73bafeb591f`.
- 2026-06-01: Ledger expanded to require migration script, target table/group, and validation script/query per source group. Post-migration ingestion rewrite is tracked as deferred Phase 9 work.
