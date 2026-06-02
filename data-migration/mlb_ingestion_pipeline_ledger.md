# MLB Ingestion Pipeline Ledger

Generated: 2026-06-02

Statuses: `not_started`, `started`, `planned`, `parsed`, `mapped`, `inserted`, `validated`, `duckdb_ready`, `promoted`, `blocked`.

## Ledger

| Work Item | Source/Folder | Target | Parser/Adapter | Script/Command | Status | Started | Finished | Validation | Notes |
|---|---|---|---|---|---|---|---|---|---|
| MLB ingestion run plan | existing migration docs, MLB cartridges, MLB typed DB | `data-migration/mlb_ingestion_pipeline_run_plan.md` | none | documentation only | validated | 2026-06-02 | 2026-06-02 | plan reviewed against source policies, typed tables, fetchers, and cartridges | Planning checkpoint only; no DB writes. |
| MLB ingestion pre-implementation audit | `pipeline/mlb`, `pipeline/sources/mlb`, `models/mlb`, `sql-mlb.db` | `data-migration/mlb_pipeline_preimplementation_audit.md` | none | documentation only | validated | 2026-06-02 | 2026-06-02 | audit records blockers and proceed criteria | Must be read before M9A begins. |
| M9A source policy split | `source_fetch_policies` coarse MLB rows | `sql-mlb.db` source policies/status contract | none | `data-migration/scripts/apply_fetch_contract_schema.mjs --sport mlb` | validated | 2026-06-02 | 2026-06-02 | `apply_fetch_contract_schema_mlb_source_family_split_2026-06-02.json`; `build_mlb_duckdb_after_source_family_split_2026-06-02.json`; 17 policy rows, 14 required lane families, 3 non-blocking compatibility receipts, DuckDB zero mismatches | Legacy `mlb_raw_daily`, `mlb_stats_api`, and `baseballsavant` are compatibility receipts only; lane gates must use source-family rows. MLB status rows are still written by later adapters. |
| M9B schedule/game-feed raw adapter | `data-private/raw/mlb/<date>`, `data-private/raw/mlb-stats-api` | `games`, `teams`, `venues`, `starting_pitchers`, `plate_appearances`, `pitch_events`, outcome tables, source fetch tables | likely `pipeline/sources/mlb/normalization/results.py` plus new active raw adapter | pending | not_started |  |  | pending | First implementation target; no network required. |
| M9C lineups/probables adapter | official feed, RotoWire supplement, `data-private/lineups/mlb/*.json`, probable monitors | `lineups`, `lineup_slots`, `lineup_matchup_snapshots`, `lineup_shape_snapshots`, `starting_pitchers` | `pipeline/sources/mlb/normalization/lineups.py` | pending | not_started |  |  | pending | Must preserve confirmed/projected/partial states. |
| M9D Baseball Savant/player context adapter | `data-private/raw/baseballsavant`, `data-private/raw/mlb-stats-api/hitter-career-profiles`, Baseball Reference WAR | player Statcast/context/split/career tables | `pipeline/sources/mlb/normalization/hitter_features.py`, `player_context.py`, `pitcher_features.py` | pending | not_started |  |  | pending | Low-sample player story context belongs here. |
| M9E pitcher/bullpen/team/environment adapter | derived warehouse/profile rows, weather/sun/park context | pitcher, bullpen, team, environment typed tables | `pitcher_features.py`, `bullpen_features.py`, `team_features.py`, `environment.py` | pending | not_started |  |  | pending | Environment table `game_environment_snapshots` is currently empty; sun visibility has rows. |
| M9F markets/odds/props adapter | `data-private/odds`, `data-private/raw/odds`, `data-private/raw/kalshi`, prop captures | `market_contracts`, `market_price_ticks`, `market_snapshots`, `prop_market_snapshots`, mispricing labels | `markets.py`, `props.py` | pending | not_started |  |  | pending | Value/prop freshness must be lane-specific. |
| M9G MLB preflight gate | `source_fetch_status` | preflight reports | `prediction_preflight.mjs` | extend lanes for MLB | not_started |  |  | pending | Must run before cartridge runner gates. |
| M9H MLB runner gate | MLB-M0/MLB-M2/MLB-RP36 runners | model run preflight reports | pending | patch runners after M9G validates | not_started |  |  | pending | No model behavior change until source gates are true. |
| M10 DB-input model cutover | MLB cartridges and publish lanes | typed SQLite/DuckDB inputs, DB-first prediction rows | cartridge-owned scripts | pending | not_started |  |  | pending | Separate phase after ingestion. |

## Append-Only Notes

- 2026-06-02: Planning checkpoint created. MLB has many typed historical tables already, but active fetch/write-through is not DB-first yet.
- 2026-06-02: Current MLB source policies are too coarse and have no status rows. Split policy rows are required before any MLB model preflight can be meaningful.
- 2026-06-02: M9A complete. MLB now has 14 required source-family policies plus 3 optional compatibility receipts, and DuckDB rebuilt cleanly from SQLite with 97/97 tables copied.
- 2026-06-02: `game_environment_snapshots` has 0 rows while `game_sun_visibility_snapshots` has 306 rows. Environment ingestion must explicitly cover weather/park/sun before totals/HR lanes trust it.
- 2026-06-02: Existing MLB model lanes still read legacy `sports.db`, generated modules, raw folders, and warehouse CLI outputs. Those are cutover targets, not ingestion-phase dependencies.
