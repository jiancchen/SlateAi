# MLB Pipeline Pre-Implementation Audit

Generated: 2026-06-02

## Purpose

This audit records the state of the MLB ingestion surface before active DB-first implementation begins. It is intentionally separate from the tennis audit because MLB has a larger model surface and a deeper legacy warehouse dependency.

## Audited Surfaces

- `pipeline/mlb/fetchers/`
- `pipeline/mlb/warehouse/mlb_warehouse.py`
- `pipeline/sources/mlb/normalization/`
- `models/mlb/cartridges/MLB-M0`
- `models/mlb/cartridges/MLB-M1`
- `models/mlb/cartridges/MLB-M2`
- `models/mlb/cartridges/MLB-RP36`
- `data-private/warehouse/sports/mlb/sql-mlb.db`
- `data-private/raw/mlb`, `data-private/raw/mlb-stats-api`, `data-private/raw/baseballsavant`, `data-private/odds`, `data-private/raw/odds`, `data-private/raw/kalshi`

## Current DB Evidence

`sql-mlb.db` already has a wide typed table set. Important row counts observed during this audit:

| Table | Rows |
|---|---:|
| `games` | 899 |
| `lineups` | 1,574 |
| `lineup_slots` | 14,166 |
| `plate_appearances` | 67,251 |
| `pitch_events` | 304,181 |
| `market_snapshots` | 2,000 |
| `prop_market_snapshots` | 2,409 |
| `game_environment_snapshots` | 0 |
| `game_sun_visibility_snapshots` | 306 |
| `prediction_rows` | 8,020 |
| `settlement_rows` | 554 |

Current MLB fetch policies:

| Policy | Family | Required |
|---|---|---:|
| `baseballsavant` | `statcast` | 1 |
| `mlb_odds` | `markets` | 1 |
| `mlb_raw_daily` | `stats-api` | 1 |
| `mlb_stats_api` | `stats-api` | 1 |

Current MLB fetch status: no current rows were present. This means no MLB lane can currently prove source freshness from the sport DB.

## What Is Already In Good Shape

- MLB typed table inventory is much stronger than the current active fetch policy layer.
- Pitch and plate event foundations already exist; do not rebuild these from scratch.
- Normalization modules already exist for the important families:
  - results
  - lineups
  - hitter features
  - pitcher features
  - bullpen features
  - team features
  - environment
  - markets
  - props
  - predictions
  - model metadata
  - player context
  - team context
  - game shape
- Existing normalization scripts and reports show historical rows can be promoted into typed tables.
- MLB model cartridges are structured enough to be gated later.

## Blockers Before Implementation

### 1. Source Policies Are Too Coarse

The four existing MLB policies cannot tell a runner whether lineups are fresh, odds are fresh, prop prices are fresh, or postgame results are complete. MLB needs source-family policies that match lane needs.

### 2. Active Warehouse Still Owns Too Much Behavior

`pipeline/mlb/warehouse/mlb_warehouse.py` is still the central ingest/derive/import/grade CLI. It writes many old warehouse tables and triggers many derived feature passes. DB-first ingestion must not blindly duplicate all of that logic in cartridges.

### 3. Cartridge Lanes Still Read Legacy Inputs

MLB-M2 lane scripts still reference:

- `data-private/warehouse/sports.db`
- generated lineup modules
- `published-data/slates`
- `data-private/predictions/*`
- raw web/API fetches inside model lanes
- `pipeline/mlb/warehouse/mlb_warehouse.py`

Those are acceptable during the ingestion planning phase but are not acceptable after DB-input cutover.

### 4. Lineups Are A Critical Moving Source

Lineup status changes from pending to projected to confirmed. Treating lineups like static historical facts would create stale prop and HR boards. The lineups source needs short TTL and explicit status labels.

### 5. Environment Is Partially Missing

`game_sun_visibility_snapshots` has rows, but `game_environment_snapshots` has none. Weather/park/sun-position must be a real source family, not an afterthought, because totals, HR props, and game-shape lanes depend on it.

### 6. Markets And Props Must Be Split

Moneyline/runline/total/F5 markets are not the same freshness problem as player props. Value boards and prop boards need separate source status rows so one stale surface does not poison the other silently.

### 7. Postgame Settlement Needs A Different Gate

Pregame can run without final outcomes. Postgame settlement cannot. The `postgame` lane must require game-feed/result completeness and model artifact availability.

## Implementation Rules

- No public/site output mutation during ingestion wiring.
- No model prediction behavior changes during source adapter work.
- No network requirement for the first implementation; use local raw archives first.
- Every source family must support dry-run, write, and rerun validation.
- Every typed insert path must be deterministic and idempotent.
- Every raw receipt must be registered in `source_snapshots`.
- Every fetch/parse attempt must write `source_fetch_runs`.
- Every lane-critical source/date must update `source_fetch_status`.
- Ambiguous player/team/market mappings go to `unresolved_entities`; do not guess.
- DuckDB must rebuild cleanly after every family.

## First Safe Implementation

Start with `M9A` and `M9B`:

1. Split MLB source policies into lane-aligned families.
2. Build local raw archive adapter for MLB schedule/game feed.
3. Validate existing typed table parity and row-count idempotency.
4. Rebuild `duck-mlb.duckdb`.
5. Only then proceed to lineups/probables.

## Explicit Non-Goals For The First Implementation

- Do not rewrite MLB-M2 prediction logic.
- Do not change website output.
- Do not run today’s slate prediction.
- Do not start the web server.
- Do not remove legacy `sports.db` or raw JSON files.
- Do not archive any raw data.
- Do not treat source freshness as true unless typed validation also passes.

## Proceed Criteria

M9B can begin when:

- the source-family split is committed
- validator/report names are defined
- the adapter target date is chosen
- existing raw MLB date folders are confirmed available
- row-count validation queries are ready
- the ledger row for M9B is marked `started`

## Recommendation

Proceed with MLB ingestion, but do not start by touching the MLB cartridges. The first real code should be source-policy split plus schedule/game-feed raw adapter. That gives the whole MLB system a clean spine before we deal with lineups, props, markets, and M2 game-shape formulas.
