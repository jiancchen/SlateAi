# Tennis-First Normalization Plan

## Goal

Turn blob-backed legacy rows in the sport SQLite warehouses into typed, joinable fact tables for dashboards, DuckDB analysis, and future model runs.

Normalization is separate from migration:

- Migration preserved source rows and registered source files.
- Normalization parses those preserved rows into analysis-ready tables.

## Ground Rules

- Start with tennis.
- Keep legacy blobs as audit/source replay.
- Do not mutate `published-data/`, `web/public/data/`, `web/src/lib/`, API files, or active prediction scripts during normalization.
- Use `entity_aliases` for confident source-to-canonical mappings.
- Use `unresolved_entities` for ambiguous mappings.
- Do not insert typed fact rows when canonical `match_id`, `player_id`, or contract mapping is ambiguous.
- Each normalization family must have a reusable parser/injection module and validation report.
- Rebuild DuckDB after each validated normalization family.

## Status Values

- `not_started`
- `started`
- `parsed`
- `mapped`
- `inserted`
- `validated`
- `duckdb_ready`
- `promoted`
- `blocked`

## Tennis Families

| Family | Legacy source tables | Target typed tables |
|---|---|---|
| Stats | `tennis_flashscore_player_stat_rows`, `tennis_flashscore_stat_rows`, `tennis_sofascore_player_stat_rows`, `tennis_sofascore_stat_rows` | `match_stat_rows`, `service_pressure_snapshots` |
| Replay | `tennis_sofascore_replay_games`, `tennis_sofascore_replay_points`, `tennis_livesport_replay_games`, `tennis_livesport_replay_points` | `replay_games`, `replay_points` |
| Markets | `tennis_kalshi_market_candles`, `tennis_kalshi_match_markets`, `tennis_kalshi_open_orderbook_snapshots`, `tennis_prediction_market_snapshots` | `market_snapshots`, `market_contracts`, `market_price_ticks` |
| Context | `tennis_player_match_context`, `tennis_recent_form_metrics`, `tennis_h2h_snapshots`, `tennis_match_weather` | `player_form_snapshots`, `h2h_matches`, feature snapshot rows |

## Parser Contract

Each parser/injection module must:

- Read only scoped source tables/folders.
- Support dry-run and write mode through the calling migration script.
- Resolve canonical IDs using existing typed tables and aliases.
- Insert unresolved mappings into `unresolved_entities`.
- Write deterministic IDs so reruns are idempotent.
- Emit a compact report with source rows, parsed rows, inserted rows, skipped rows, and unresolved rows.

## Validation Contract

Each validator must prove:

- Source rows exist for the family.
- Parsed/inserted counts are non-zero when source rows exist.
- Rerunning does not duplicate rows.
- Critical joins resolve to canonical IDs.
- Unresolved rows are explicitly counted.
- Dashboard-critical fields are not false `N/A` when source values exist.

## Promotion Rule

Typed rows are not promoted to active dashboards/models until:

1. The family is validated.
2. DuckDB rebuild passes with zero count mismatches.
3. Dashboard/read-path checks prove the typed table can replace the legacy blob path.

