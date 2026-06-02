# Phase 9 Pipeline Pre-Implementation Audit

Generated: 2026-06-02

## Purpose

Before rewiring active ingestion, this audit captures the remaining risks and the smallest safe implementation path. The target state is DB-first:

```text
source fetch -> raw archive receipt -> source_fetch_runs/status -> typed sport DB facts -> DuckDB analytics copy -> DB-derived export cache
```

`published-data/` and `web/public/data/` must become outputs only. They should not be used to discover matches, players, markets, or model inputs once Phase 9 is promoted.

## Current State

- Sport SQLite DBs exist:
  - `data-private/warehouse/sports/mlb/sql-mlb.db`
  - `data-private/warehouse/sports/tennis/sql-tennis.db`
- Rebuildable DuckDB mirrors exist:
  - `data-private/warehouse/analytics/duck-mlb.duckdb`
  - `data-private/warehouse/analytics/duck-tennis.duckdb`
- Fetch contract tables exist in both sport DBs:
  - `source_fetch_policies`
  - `source_fetch_runs`
  - `source_fetch_status`
- Tennis reference fetch-status pilot exists:
  - `data-migration/scripts/run_source_fetch_contract.mjs`
  - `data-migration/scripts/validate_source_fetch_contract.mjs`
- Tennis typed normalizers exist and are idempotent for historical legacy rows:
  - `pipeline/sources/tennis/normalization/stats.py`
  - `pipeline/sources/tennis/normalization/replay.py`
  - `pipeline/sources/tennis/normalization/markets.py`
  - `pipeline/sources/tennis/normalization/context.py`
- MLB typed normalizers exist for the important Phase 2 families, but active MLB fetchers and model cartridges still use the older warehouse/file workflow.

## Main Concerns

### 1. Freshness Can Be True While Typed Facts Are Missing

The current fetch contract pilot records freshness and source receipts, but it does not yet call typed parsers. A source can therefore be marked `success` or `skipped_cache` while dashboard-critical rows such as `match_stat_rows`, `service_pressure_snapshots`, `replay_games`, and `replay_points` are still missing.

Implementation rule: a source family is not prediction-ready until fetch status, typed parse, unresolved count, and typed validation all pass for the same sport/date/source.

### 2. Active Tennis Fetchers Still Depend On Public Output

Several tennis fetchers discover match targets from `published-data/slates/<date>/games`. That makes generated public data an input, which is exactly what the DB-first rewrite is supposed to remove.

Affected examples:

- `pipeline/tennis/fetchers/fetch-sofascore-tennis-match.mjs`
- `pipeline/tennis/fetchers/fetch-sofascore-tennis-slate.mjs`
- `pipeline/tennis/fetchers/fetch-sofascore-player-page-stats.mjs`
- `pipeline/tennis/fetchers/fetch-flashscore-tennis-slate.mjs`
- `pipeline/tennis/fetchers/fetch-flashscore-tennis-player-pages.mjs`

Implementation rule: target discovery must read `matches`, `match_players`, `entity_aliases`, and source status tables from `sql-tennis.db`, not `published-data`.

### 3. Existing Tennis Normalizers Parse `legacy_table_rows`

The typed tennis normalizers are useful, but their current input path is mostly historical:

```text
legacy_table_rows -> typed tennis tables
```

Active ingestion needs:

```text
source_snapshots/raw archive -> source-specific raw adapter -> typed tennis tables
```

Implementation rule: do not duplicate tennis parser logic inside fetchers. Add source adapters that reuse the normalization contracts and produce the same typed row shapes.

### 4. Duplicate Rediscovery Is Guaranteed

Flashscore, SofaScore, Livesport, FanDuel, Robinhood, Kalshi, and MLB APIs repeatedly rediscover old players, markets, and matches. That is normal. Without deterministic keys, active ingestion will inflate facts every day.

Implementation rule: every typed insert path must use deterministic IDs plus `on conflict ... do update`. Validators must check rerun row-count stability.

### 5. Prediction Scripts Are Not DB-Input-Only Yet

Tennis and MLB prediction/model scripts still read generated JSON artifacts and raw folders. Public exports also still mirror file-first assumptions.

Implementation rule: do not cut prediction scripts over until the source families they require are DB-ready and the preflight can block stale or incomplete sources by lane.

### 6. Export Promotion Is A Separate Phase

`published-data/`, `web/public/data/`, and API exports remain generated mirrors for now. Promoting those reads before typed source ingestion is stable would hide pipeline defects.

Implementation rule: keep public/site outputs untouched during Phase 9B/C source implementation. Export promotion comes after source and prediction preflight validation.

### 7. MLB Has A Larger Legacy Workflow Surface

MLB still has a large active warehouse script and cartridge lanes that call it:

- `pipeline/mlb/warehouse/mlb_warehouse.py`
- `models/mlb/cartridges/MLB-M*/lanes/*.mjs`
- `models/mlb/cartridges/MLB-M*/workflows/*.mjs`

Implementation rule: tennis should be the proving ground. Once tennis source families prove the contract, port the same wrapper/adapter/preflight pattern to MLB.

## Safe Implementation Order

### Step 1: Add A Shared Source Ingestion Core

Create a small reusable core that can:

- load `source_fetch_policies`
- check TTL and force/disable env vars
- register raw receipts in `source_snapshots`
- invoke a source parser adapter
- upsert typed rows
- write `source_fetch_runs`
- upsert `source_fetch_status`
- write a validation report

Do this without changing active fetchers first.

### Step 2: Build One Tennis Raw-To-Typed Adapter

Start with a no-network adapter for existing raw archive files. Preferred first family:

```text
data-private/reference/tennis/flashscore-match-stats
```

Target typed tables:

- `match_stat_rows`
- `service_pressure_snapshots`
- `entity_aliases`
- `unresolved_entities`

The first adapter should support dry-run and write mode.

### Step 3: Add Rerun Idempotency Validation

For the same date/source:

1. Record typed row counts.
2. Run the adapter.
3. Run the adapter again.
4. Confirm primary typed row counts do not inflate.
5. Confirm unresolved rows do not duplicate.
6. Confirm source status reflects typed validation results.

### Step 4: Add Tennis Source Preflight

Prediction preflight should read:

- `source_fetch_status`
- latest typed validation health checks
- unresolved counts
- source family coverage

Preflight should block value boards if odds are stale and should block stat/replay-dependent lanes if stats/replay coverage is missing.

### Step 5: Only Then Wire Active Tennis Fetchers

Once raw archive adapters work, active fetchers can call the shared source ingestion core after writing raw files. Target discovery should then be moved from `published-data` to DB-backed `matches` and `match_players`.

### Step 6: Repeat For Tennis Odds And Replay

Next tennis source families:

- prediction markets / sportsbook odds
- SofaScore/Livesport replay
- player stats/context
- rankings

### Step 7: Port Pattern To MLB

MLB should use the same contract, but with source families:

- `mlb_raw_daily`
- `mlb_stats_api`
- `baseballsavant`
- `mlb_odds`

## Proceed Criteria For First Code Change

The first implementation is allowed if it stays within this boundary:

- no public/site output mutation
- no active prediction behavior change
- no web server start
- no network fetch requirement
- one source family only
- dry-run report before write-mode
- write-mode report with typed row counts
- rerun idempotency validation
- ledger event appended

## Blocking Conditions

Stop before promotion if any of these happen:

- typed row counts inflate on same-source rerun
- source freshness passes but typed validation fails
- public JSON is still required for source discovery
- unresolved player/match rows are guessed instead of quarantined
- prediction scripts need raw JSON folders outside explicit rebuild/backfill mode

## Recommended Next Implementation

Build `Phase 9B.1` as a tennis Flashscore raw archive adapter:

```text
source_snapshots/raw files -> flashscore adapter -> match_stat_rows/service_pressure_snapshots -> validation -> DuckDB rebuild
```

This is the smallest useful test because it directly attacks the previous dashboard pain point: missing hold, BP saved, BP converted, and numerator/denominator data.
