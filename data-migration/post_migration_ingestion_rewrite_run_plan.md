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
| Tennis | `tennis_reference` | 12h | 48h | Optional broad receipt registration only; typed family health uses the split source policies below. |
| Tennis | `tennis_flashscore_stats` | 12h | 48h | Flashscore match-stat payloads for serve, break-pressure, and recent-match stat facts. |
| Tennis | `tennis_sofascore_replay` | 12h | 48h | Optional pre-match; required by postmatch replay/clutch workflows. SofaScore point-by-point payloads feed clutch, break-back, and closeout facts. |
| Tennis | `tennis_livesport_replay` | 12h | 48h | Optional Livesport/Flashscore replay fallback when SofaScore misses. |
| Tennis | `tennis_odds` | 1h | 6h | Prediction-market and sportsbook odds snapshots. |
| Tennis | `tennis_rankings` | 24h | 72h | ATP/WTA ranking snapshots with rank, points, age, country, and source URL joins. |

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

## Idempotency And Duplicate Handling

Active ingestion will repeatedly rediscover old matches, players, markets, and replay rows. That is normal, especially with Flashscore/SofaScore/Livesport recent-match pages. Duplicate discovery must become a DB update, not another fact row.

Hard rules:

- Every source receipt gets a deterministic `source_snapshot_id` based on sport, source name, and stable local path or source URL.
- Every typed fact row gets a deterministic primary key from source identity plus canonical IDs where available.
- Canonical identity is preferred, but source identity must remain in the key when the canonical mapping is still unresolved.
- Reruns use `insert ... on conflict ... do update` for stable facts and never append duplicate match/stat/replay/market rows.
- Ambiguous rows are quarantined in `unresolved_entities`; they are not guessed into a canonical player or match.
- If a later run resolves an entity, the ingestion step updates the typed row and records the resolver/mapping policy, instead of leaving both old and new rows active.
- Validators must report duplicate primary-key candidates, orphan rows, unresolved counts, and row-count parity after every source family.
- Prediction preflight must treat duplicate/orphan validation failures as blocking for the affected source family.

Sport-specific duplicate keys:

- Tennis matches: source match ID when present, otherwise canonical player pair plus tournament/date/round.
- Tennis match stats: source match ID, player/source side, stat name, and period.
- Tennis service pressure snapshots: canonical match ID plus player ID and source family.
- Tennis replay games/points: source match ID, set/game/point ordinal, and source family.
- Tennis markets: contract/event ID plus side/runner; price ticks include timestamp/bid/ask/source snapshot.
- MLB games: `game_pk`.
- MLB pitch/plate events: `game_pk` plus play/pitch/plate-appearance identity.
- MLB lineups: game/team/batting order/player slot.
- MLB markets/props: source market/contract ID plus event/team/player/line/timestamp.

## Phase Plan

### Pre-Implementation Audit

See `data-migration/phase9_pipeline_preimplementation_audit.md`.

Hard conclusion from the audit: do not wire active fetchers one by one. The first implementation must prove a single source family can move from raw archive/source receipts into typed DB tables, run validation, avoid duplicate row growth on rerun, and update fetch status for the same sport/date/source.

The first recommended code path is `Phase 9B.1`: tennis Flashscore raw archive -> `match_stat_rows` / `service_pressure_snapshots` -> validation -> DuckDB rebuild. Public exports, site/API reads, and prediction behavior should remain untouched during this first pass.

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
- Validate duplicate safety:
  - rerun source ingest for the same date
  - confirm typed row counts do not inflate
  - confirm changed source hashes update the same rows
  - confirm unresolved rows remain quarantined

Current status:

- `data-migration/scripts/run_source_fetch_contract.mjs` records the source/freshness layer for `tennis_reference`.
- The June 2 broad-reference pilot wrote both `success` and `skipped_cache` runs, then validated current status freshness. This broad policy is optional because it does not prove typed fact coverage by itself.
- Phase 9B.1 wired Flashscore raw match-stat files into typed `match_stat_rows` and `service_pressure_snapshots` for June 2 without network access.
- The Flashscore pilot processed 610 source files, refreshed 141,700 stat rows, refreshed 130 service-pressure rows with BP denominators, and proved rerun idempotency with zero row-count growth.
- Phase 9B.2 split the tennis replay contract into `tennis_sofascore_replay` and optional `tennis_livesport_replay`, then wired raw replay receipts into typed `replay_games` and `replay_points`.
- The SofaScore replay pilot processed 8 May 31 source files, refreshed 251 replay-game rows and 1,369 replay-point rows, and proved rerun idempotency with zero row-count growth.
- The Livesport fallback pilot processed 1 June 1 source file, refreshed 41 replay-game rows and 213 replay-point rows, including 25 explicit break-point flags.
- Replay policy note: point-by-point replay is optional for pre-match prediction gates because current-day replay files may not exist until matches settle. Postmatch workflows should explicitly require SofaScore/Livesport replay freshness for the settled date.
- Phase 9C wired active tennis odds receipts into typed market tables: Robinhood supplement rows now feed `market_contracts`, `market_price_ticks`, and `market_snapshots`; FanDuel line captures feed derivative `market_snapshots`.
- The June 2 odds pilot parsed 2 active odds files into 132 Robinhood contracts, 132 ticks, and 180 total snapshots, including FanDuel moneyline, game spread, match total, first-set total, and set-win rows. Rerun idempotency had zero row-count growth.
- Phase 9D wired active ranking receipts into typed `rankings` rows. The June 2 ranking pilot parsed 300/300 ranking rows, 150 ATP and 150 WTA, with 0 unresolved mappings and zero row-count growth on rerun.
- Phase 9E wired Flashscore player pages and recent-match maps into typed `player_form_snapshots`, `recent_matches`, and `service_pressure_snapshots`.
- The June 2 player-context pilot parsed 2 source files into 260 player/context snapshots, 6,227 recent-match rows, and 597 recent service-pressure rows. All 597 pressure rows carry BP saved/converted denominator context where present, and rerun idempotency had zero row-count growth.
- Typed parser write-through is now validated for the core June 2 tennis source families used by the prediction pipeline: Flashscore stats, replay, odds, rankings, and Flashscore player context.
- Existing tennis normalization modules still primarily parse `legacy_table_rows`; do not mark the active ingestion rewrite complete until raw source receipts can feed typed tables directly or through a clearly declared intermediate.

### Phase 9C: Tennis Odds

- Status: validated for the available June 2 Robinhood supplement plus FanDuel line captures.
- `tennis_odds` has a short TTL and is required for value boards.
- Contract/player mapping status is validated for Robinhood contracts and FanDuel derivative rows.
- Value boards should be blocked or marked stale when `source_fetch_status` for `tennis_odds` is missing/stale.
- The full Robinhood page dump remains a source receipt; typed contract rows should come from the normalized supplement unless a future parser maps full events cleanly.

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
- Model predictions must read typed DB tables or DuckDB views by model/date/source freshness. They must not scan raw JSON folders except in explicit rebuild/backfill mode.

### Phase 9G: Export Promotion

- Export JSON from DB after prediction rows settle.
- `published-data` and `web/public/data` become generated caches.
- Public/site outputs remain generated mirrors until promoted. They should be regenerated from DB and never become source truth.

## Validation

- Schema validation includes the three fetch contract tables and indexes.
- Each source family has dry-run and write-mode reports.
- Required source/date coverage query returns no `failed`, `missing`, or stale rows before publish.
- DuckDB rebuilds after typed insert with zero SQLite/DuckDB count mismatches.
- Prediction/value-board reports include source freshness metadata.
- Re-running active ingestion for the same date/source does not increase typed fact counts unless new source facts actually appeared.
- Raw source folders can contain repeated historical matches without creating duplicate typed rows.

## Open Technical Debt

- Existing active fetch scripts still need DB-first wrappers.
- Tennis raw Flashscore stats, SofaScore/Livesport replay, Robinhood/FanDuel odds, ranking snapshots, and Flashscore player context now feed typed tables.
- Existing prediction scripts still need preflight gates.
- Prediction scripts are not fully reading only DB inputs.
- Existing generated web/public JSON remains active output until promotion.
- Public/site outputs are still generated mirrors, not DB-native read paths.
