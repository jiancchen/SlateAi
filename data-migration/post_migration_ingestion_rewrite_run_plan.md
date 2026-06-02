# Post-Migration Ingestion Rewrite Run Plan

## Summary

The migration/normalization work moved historical data into sport-specific DBs. This plan rewires active fetch and ingestion so prediction runs stop scanning raw JSON folders and instead use a DB-first path:

```text
source fetch -> raw archive receipt -> source_fetch_runs/status -> typed sport DB facts -> DuckDB analytics copy -> DB-derived export cache
```

`published-data/`, `web/public/data/`, and generated web modules stay as outputs only. They are not source truth after this rewrite.

## Fetch Contract

Every fetch attempt must write status into the sport DB before a prediction run can trust that source.

### Tables

- `source_fetch_policies`: one policy row per sport/source. Stores default TTL, max stale window, required flag, env override keys, and run rule.
- `source_fetch_runs`: append-only row for every attempted fetch, skipped fresh-cache check, failed fetch, partial fetch, or missing-source event.
- `source_fetch_status`: current rollup by sport/source/date. This is what pipeline health checks and prediction preflight read.
- `source_snapshots`: immutable receipt table for captured source payloads, with hash/path/content metadata.

### Status Values

- `success`: fetched and parsed enough data to satisfy source coverage.
- `partial`: fetched usable data, but expected rows/items are missing.
- `failed`: fetch attempted and failed.
- `missing`: no source payload was available for a required date/source.
- `skipped_cache`: no network/file fetch was needed because cached data was still fresh.
- `disabled`: source intentionally disabled by config/env.

### Completeness Values

- `complete`: expected item count equals actual item count, or the source has an explicit complete marker.
- `incomplete`: source has usable rows but missing required items.
- `unknown`: source has no reliable expected count.
- `not_applicable`: freshness/status row is not data-count based, such as a disabled fetch.

### Cache Rules

Default TTLs are source-level policies:

| Sport | Source | Default TTL | Max Stale | Notes |
|---|---:|---:|---:|---|
| MLB | `mlb_raw_daily` | 6h | 24h | Schedule/live/result payloads; force refresh for active game days. |
| MLB | `mlb_stats_api` | 6h | 24h | Stats API player/game payloads. |
| MLB | `baseballsavant` | 24h | 72h | Player splits/profile context; slower moving. |
| MLB | `mlb_odds` | 1h | 6h | Odds and market snapshots; short TTL. |
| Tennis | `tennis_reference` | 12h | 48h | Flashscore/SofaScore/Livesport/ranking/reference payloads. |
| Tennis | `tennis_odds` | 1h | 6h | Prediction-market and sportsbook odds snapshots. |

Each source policy gets env keys in this shape:

```text
<SPORT>_<SOURCE_NAME>_TTL_HOURS
<SPORT>_<SOURCE_NAME>_FORCE_FETCH
<SPORT>_<SOURCE_NAME>_DISABLE_FETCH
```

Example:

```text
TENNIS_TENNIS_REFERENCE_TTL_HOURS=12
TENNIS_TENNIS_ODDS_FORCE_FETCH=1
MLB_BASEBALLSAVANT_DISABLE_FETCH=1
```

Config files may override env defaults later, but env wins for one-off runs.

## Preflight Rules

Prediction runs must check `source_fetch_status` before reading model inputs.

1. Required source has `success`, `partial`, or `skipped_cache` within TTL.
2. `failed`, `missing`, or stale required sources block prediction publishing unless the run is explicitly marked degraded.
3. `partial` sources must carry missing counts and a degraded-input note.
4. Odds/market sources with stale status may still allow non-market predictions, but value boards must be blocked or marked stale.
5. Cache skips are written as `source_fetch_runs.status = skipped_cache`, so there is still an audit row for the decision not to fetch.

## Phase Plan

### Phase 9A: Fetch Contract Schema

- Add `source_fetch_policies`, `source_fetch_runs`, and `source_fetch_status` to both sport DBs.
- Seed source-level default policies.
- Update the migration ledger and schema validation expectations.

### Phase 9B: Tennis Pilot

- Wire one tennis source family first, preferably `tennis_reference`.
- On each run:
  - read policy and TTL
  - decide fetch/skip/disable
  - capture raw receipt into `source_snapshots`
  - parse through existing tennis normalization modules
  - write typed rows
  - write `source_fetch_runs`
  - upsert `source_fetch_status`
- Validate no false dashboard `N/A` when typed source rows exist.

Current status:

- `data-migration/scripts/run_source_fetch_contract.mjs` records the source/freshness layer for `tennis_reference`.
- The June 2 pilot wrote both `success` and `skipped_cache` runs, then validated current status freshness.
- Typed parser write-through from raw receipts into `match_stat_rows`, `service_pressure_snapshots`, `replay_games`, `replay_points`, rankings, and context remains the next Phase 9B substep.
- Existing tennis normalization modules still primarily parse `legacy_table_rows`; do not mark the active ingestion rewrite complete until raw source receipts can feed typed tables directly or through a clearly declared intermediate.

### Phase 9C: Tennis Odds

- Wire `tennis_odds` with short TTL.
- Require contract/player mapping status for market rows.
- Block value boards if odds are missing/stale.

### Phase 9D: MLB Core Sources

- Wire `mlb_raw_daily`, `mlb_stats_api`, and `baseballsavant`.
- Active game-day data can force refresh even inside TTL when result/lineup state is expected to change.

### Phase 9E: MLB Odds And Markets

- Wire `mlb_odds`.
- Value-board rows must include freshness status and source snapshot/run IDs.

### Phase 9F: Prediction Preflight

- Add a shared preflight that resolves required source statuses by sport/date/model lane.
- Prediction scripts read DB inputs only after preflight passes.
- Degraded runs must write model metadata explaining stale/missing sources.

### Phase 9G: Export Promotion

- Export JSON from DB after prediction rows settle.
- `published-data` and `web/public/data` become generated caches.

## Validation

- Schema validation includes the three fetch contract tables and indexes.
- Each source family has dry-run and write-mode reports.
- Required source/date coverage query returns no `failed`, `missing`, or stale rows before publish.
- DuckDB rebuilds after typed insert with zero SQLite/DuckDB count mismatches.
- Prediction/value-board reports include source freshness metadata.

## Open Technical Debt

- Existing active fetch scripts still need DB-first wrappers.
- Existing prediction scripts still need preflight gates.
- Existing generated web/public JSON remains active output until promotion.
