# MLB DB-Input Cutover Plan

Generated: 2026-06-02

## Goal

Move MLB model and publish lanes from legacy file-first inputs to typed DB-first inputs:

```text
sql-mlb.db / duck-mlb.duckdb -> model lane inputs -> prediction/model rows -> JSON/site mirrors
```

The source ingestion side is already gated by source-family preflight. This plan is about model inputs and publish/export surfaces.

## Audit Baseline

Report: `data-migration/reports/mlb_db_input_cutover_audit_2026-06-02.json`

- 200 files scanned across `models/mlb/cartridges/MLB-M2`, `models/mlb/cartridges/MLB-M0`, and `pipeline/mlb`.
- 101 files still contain legacy/file-first references.
- 69 files reference legacy shared `sports.db`.
- 9 files shell into the old `pipeline/mlb/warehouse/mlb_warehouse.py` flow.
- 15 files read `published-data/slates` as model inputs.
- 22 files read generated `data-private/predictions` artifacts as model inputs.
- 0 audited files currently reference `sql-mlb.db` or `duck-mlb.duckdb`.

## Cutover Principle

- Active prediction lanes must read typed SQLite/DuckDB tables, never public mirrors.
- Public JSON and site files are export outputs, not model inputs.
- Raw/archive files are audit receipts. Only source adapters may parse them directly.
- `sports.db` remains untouched legacy history, but active MLB model code should not read it.
- Research scripts can keep running during migration, but their default DB path must move to `sql-mlb.db` or `duck-mlb.duckdb` before they are trusted for current-model changes.

## Phase M10A: DB Input Adapter

Create a reusable MLB DB adapter owned by the model stack.

Targets:

- `models/mlb/db/`
- `models/mlb/db/sqlite.mjs`
- `models/mlb/db/queries.mjs`
- `models/mlb/db/README.md`

Responsibilities:

- Resolve `sql-mlb.db` and `duck-mlb.duckdb` paths.
- Execute SQLite queries through the existing `sqlite3 -json` shell path until a JS SQLite package is intentionally introduced.
- Provide typed query helpers for games, lineups, markets, model rows, and source status.
- Centralize any remaining compatibility reads so lanes do not invent their own file scans.

Validation:

- Query May 31 games, lineup slot coverage, market count, and source-family status.
- Prove partial lineup status reads from DB as `269/270`.

## Phase M10B: Active Lane Inventory And Owners

Classify active M2 lane files by cutover order:

1. `workflows/refresh-live-board.mjs`
2. `workflows/followup.mjs`
3. `lanes/generate-day-files.mjs`
4. `lanes/lineups.mjs`
5. `lanes/props.mjs`
6. `lanes/sides.mjs`
7. `lanes/veto.mjs`
8. `lanes/home-runs.mjs`
9. `lanes/history-journal.mjs`
10. `snapshot.mjs` and `snapshot-run.mjs`

The first cutover should be read-only DB input replacement, not model logic changes.

## Phase M10C: Current-Day Board Inputs

Replace current-day board input discovery:

- `published-data/slates/<date>/summary.json`
- `published-data/slates/<date>/games/*.json`
- `data-private/lineups/mlb/<date>-lineup-board.json`
- `data-private/odds/**`

with DB queries over:

- `games`
- `teams`
- `venues`
- `lineups`
- `lineup_slots`
- `lineup_matchup_snapshots`
- `starting_pitchers`
- `market_contracts`
- `market_snapshots`
- `market_price_ticks`
- `source_fetch_status`

Validation:

- Current-day DB board game count equals schedule count.
- Strict lanes block partial lineups unless `--allow-partial` is explicit.
- Generated board export is byte-stable where model inputs have equivalent data, except for documented DB-derived metadata changes.

## Phase M10D: Prediction Artifact Inputs

Stop lanes from using generated prediction JSON as upstream inputs:

- `data-private/predictions/mlb-sides/*`
- `data-private/predictions/mlb-player-props/*`
- `data-private/predictions/mlb-home-runs/*`
- `data-private/predictions/mlb-reliever-shadow/*`

Use DB tables:

- `model_runs`
- `model_run_lanes`
- `model_artifacts`
- `prediction_rows`
- `settlement_rows`
- `prop_backtest_rows`
- `component_settlement_rows`

Validation:

- Snapshot runner can build model metadata from DB without reading generated prediction artifacts.
- Model history page/source exports can still be generated from DB rows.

## Phase M10E: Warehouse CLI Removal From Active Workflows

Replace active workflow shell-outs to:

- `pipeline/mlb/warehouse/mlb_warehouse.py`
- `pipeline/mlb/warehouse/mlb_side_backtest.py`

with:

- source adapters for ingestion/freshness
- typed DB queries for status and history
- DB-first model output writers

Validation:

- `models/mlb/run-cartridge.mjs --model MLB-M2 --entry refresh-live-board --preflight-only` still passes/fails based only on DB source status.
- Full workflow no longer shells into `mlb_warehouse.py`.

## Phase M10F: Research Script Defaults

Bulk-update research defaults from:

- `data-private/warehouse/sports.db`

to:

- `data-private/warehouse/sports/mlb/sql-mlb.db` for transactional/source-of-truth reads
- `data-private/warehouse/analytics/duck-mlb.duckdb` for wide backtests

Validation:

- Every script keeps an override flag for alternate DB paths.
- No research script is allowed to create new active model rows unless it writes through the model metadata/output contract.

## Phase M10G: Export Mirrors

After DB-first lanes are stable, keep JSON/site mirrors as generated outputs:

- `published-data/slates/**`
- `web/src/lib/*.generated.*`
- `data-private/predictions/**`

Validation:

- Export step reads DB rows and writes mirrors.
- Model/prediction step does not read mirrors.

## Known Risks

- M2 and M0 duplicate many lane files. Migrating one without the other may create confusing behavior unless the registry clearly marks which model is active.
- `sqlite3 -json` is acceptable as a transitional adapter, but it is slow for heavy repeated queries. DuckDB-backed batch queries should handle training/backtest surfaces.
- Some generated files encode UI-specific shapes that do not map one-to-one to typed DB rows yet. Those need explicit export mappers, not hidden lane reads.
- Historical research scripts are noisy and should not block active prediction cutover unless they are used by the current run plan.

