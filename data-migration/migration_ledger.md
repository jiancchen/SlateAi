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

## Folder And Table Group Ledger

| Area | Source | Target | Status | Started | Finished | Validation | Notes |
|---|---|---|---|---|---|---|---|
| Legacy mixed DB inventory | `data-private/warehouse/sports.db` | `data-migration/reports/legacy_db_inventory_2026-06-01.json` | validated | 2026-06-01 | 2026-06-01 | 121 tables; 1,579,845 MLB rows; 493,548 tennis rows; hash `f73bafeb591f` | First active migration task complete. |
| Legacy snapshot DB | `data-private/warehouse/snapshots/2026-05-30/sports-2026-05-30.db` | reference only | not_started |  |  | pending | Keep as checkpoint; do not use unless primary legacy DB is missing rows. |
| Empty tennis placeholder | `data-private/warehouse/tennis.db` | none | not_started |  |  | pending | 0-byte placeholder; ignore as source. |
| Empty root tennis placeholder | `data-private/tennis.db` | none | not_started |  |  | pending | 0-byte placeholder; ignore as source. |
| MLB DB tables | `sports.db` `mlb_*` | `mlb.db` normalized tables | not_started |  |  | pending | Phase 2. |
| Tennis DB tables | `sports.db` `tennis_*` | `tennis.db` normalized tables | not_started |  |  | pending | Phase 2. |
| MLB raw daily payloads | `data-private/raw/mlb/` | `mlb.db` source refs and parsed facts | not_started |  |  | pending | 1,889 files, 146 MB. |
| MLB Stats API payloads | `data-private/raw/mlb-stats-api/` | `mlb.db` source refs and player profiles | not_started |  |  | pending | 55 files, 9.3 MB. |
| Baseball Savant payloads | `data-private/raw/baseballsavant/` | `mlb.db` source refs and statcast/profile facts | not_started |  |  | pending | 136 files, 356 MB. |
| MLB odds payloads | `data-private/raw/odds/fanduel-research/`, `data-private/odds/kalshi/mlb/`, `data-private/odds/robinhood/mlb/` | `mlb.db` market snapshots | not_started |  |  | pending | FanDuel/Kalshi/Robinhood lines and prices. |
| Tennis reference payloads | `data-private/reference/tennis/` | `tennis.db` source refs, stats, replay, rankings | not_started |  |  | pending | 1,525 files, 76 MB. |
| Tennis odds payloads | `data-private/odds/robinhood/tennis/`, FanDuel captures | `tennis.db` market snapshots | not_started |  |  | pending | Include prediction-market prices and sportsbook lines. |
| MLB prediction artifacts | `data-private/predictions/mlb-*` | `mlb.db` prediction/value/settlement rows | not_started |  |  | pending | Legacy outputs become DB rows plus artifact refs. |
| Tennis prediction artifacts | `data-private/predictions/tennis/` | `tennis.db` prediction/value/settlement rows | not_started |  |  | pending | Legacy outputs become DB rows plus artifact refs. |
| MLB model runs | `data-private/model-runs/mlb/` | `mlb.db` model run/artifact rows | not_started |  |  | pending | 16 files, 1.8 MB. |
| Tennis model runs | `data-private/model-runs/tennis/` | `tennis.db` model run/artifact rows | not_started |  |  | pending | 8 files, 460 KB. |
| Public published data | `published-data/` | DB-derived export cache | not_started |  |  | pending | Do not treat as source after promotion. |
| Web public data mirror | `web/public/data/` | DB-derived export cache | not_started |  |  | pending | Should be generated from DB/export. |
| Generated web modules | `web/src/lib/` | API/export loaders | not_started |  |  | pending | Reduce generated module churn after DB-backed export. |

## Append-Only Notes

- 2026-06-01: Migration started with ledger and legacy DB inventory baseline. No DB writes or source moves yet.
- 2026-06-01: Legacy DB inventory completed. `sports.db` has 121 tables: 69 MLB tables, 44 tennis tables, 3 MLB-adjacent tables, 1 shared source table, and 4 shared/unknown tables. Inventory hash starts `f73bafeb591f`.
