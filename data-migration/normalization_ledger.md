# Normalization Ledger

This ledger tracks typed-table normalization after the sport DB migration. It intentionally tracks source families, not every file.

Statuses:

- `not_started`
- `started`
- `parsed`
- `mapped`
- `inserted`
- `validated`
- `duckdb_ready`
- `promoted`
- `blocked`

Rules:

- Keep legacy blobs intact.
- Parser modules are reusable pipeline code.
- Migration scripts call parser modules instead of embedding source-specific parsing.
- Ambiguous source identities go to `unresolved_entities`.
- Do not mark a row `promoted` until API/site/model reads use the typed tables.
- Append material notes instead of rewriting history.

## Phase Ledger

| Phase | Area | Source | Target | Status | Started | Finished | Validation | Notes |
|---|---|---|---|---|---|---|---|---|
| N0 | Normalization planning | migration plan | `normalization_plan.md`, `normalization_ledger.md`, `normalization_events.jsonl` | started | 2026-06-02 |  | pending | Tennis-first normalization track created after data migration. |
| N1 | Tennis identity foundation | `players`, `matches`, `match_players`, legacy source labels | `entity_aliases`, `unresolved_entities` | not_started |  |  | pending | Alias rows should be created only for confident mappings. |
| N2 | Tennis stats normalization | Flashscore/SofaScore stat legacy tables | `match_stat_rows`, `service_pressure_snapshots` | duckdb_ready | 2026-06-02 | 2026-06-02 | `validate_tennis_stats_normalization_2026-06-02.json`; 335,138 stat rows, 824 service-pressure rows, 0 orphans, 0 duplicate IDs | Preserve BP numerator/denominator and service/return stats. 250 ambiguous stat mappings quarantined. |
| N3 | Tennis replay normalization | SofaScore/Livesport replay legacy tables | `replay_games`, `replay_points` | duckdb_ready | 2026-06-02 | 2026-06-02 | `validate_tennis_replay_normalization_2026-06-02.json`; 7,174 games, 38,959 points, 0 orphans, 0 duplicate IDs | Preserve point/game flow and pressure flags. |
| N4 | Tennis market normalization | Kalshi/Robinhood/FanDuel legacy market tables | `market_snapshots`, `market_contracts`, `market_price_ticks` | duckdb_ready | 2026-06-02 | 2026-06-02 | `validate_tennis_market_normalization_2026-06-02.json`; 824 contracts, 131,248 ticks, 1,104 snapshots, 0 orphan ticks/contracts | Added contract/tick tables and quarantined 187 ambiguous market mappings. |
| N5 | Tennis context normalization | context/form/H2H/weather legacy tables | `player_form_snapshots`, `h2h_matches`, feature snapshots | not_started |  |  | pending | Context rows must become typed enough for DuckDB queries. |
| N6 | Tennis DuckDB readiness | `sql-tennis.db` typed tables | `duck-tennis.duckdb` | started | 2026-06-02 |  | `build_tennis_duckdb_after_market_normalization_2026-06-02.json`; zero count mismatches after stats, replay, and market normalization | Rebuild after each validated family. |
| N7 | MLB normalization pattern | MLB legacy feature/market tables | MLB typed feature/market tables | not_started |  |  | pending | Start only after tennis pattern stabilizes. |

## Source Family Ledger

| Family | Source tables | Target tables | Parser module | Migration script | Status | Started | Finished | Validation | Unresolved | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| Tennis stats | `tennis_flashscore_player_stat_rows`, `tennis_flashscore_stat_rows`, `tennis_sofascore_player_stat_rows`, `tennis_sofascore_stat_rows` | `match_stat_rows`, `service_pressure_snapshots` | `pipeline/sources/tennis/normalization/stats.py` | `data-migration/scripts/normalize_tennis_stats.py` | duckdb_ready | 2026-06-02 | 2026-06-02 | `validate_tennis_stats_normalization_2026-06-02.json`; `build_tennis_duckdb_after_stats_normalization_2026-06-02.json` | 250 | Parsed 335,138 typed stat rows from 285,942 source rows and created 824 service-pressure snapshots with BP numerator/denominator coverage. |
| Tennis replay | `tennis_sofascore_replay_games`, `tennis_sofascore_replay_points`, `tennis_livesport_replay_games`, `tennis_livesport_replay_points` | `replay_games`, `replay_points` | `pipeline/sources/tennis/normalization/replay.py` | `data-migration/scripts/normalize_tennis_replay.py` | duckdb_ready | 2026-06-02 | 2026-06-02 | `validate_tennis_replay_normalization_2026-06-02.json`; `build_tennis_duckdb_after_replay_normalization_2026-06-02.json` | 0 | Parsed 7,174 replay games and 38,959 replay points with no orphan joins or duplicate IDs. |
| Tennis markets | `tennis_kalshi_market_candles`, `tennis_kalshi_match_markets`, `tennis_kalshi_open_orderbook_snapshots`, `tennis_prediction_market_snapshots` | `market_snapshots`, `market_contracts`, `market_price_ticks` | `pipeline/sources/tennis/normalization/markets.py` | `data-migration/scripts/normalize_tennis_markets.py` | duckdb_ready | 2026-06-02 | 2026-06-02 | `validate_tennis_market_normalization_2026-06-02.json`; `build_tennis_duckdb_after_market_normalization_2026-06-02.json` | 187 | Parsed 824 market contracts, 131,248 price ticks, and 1,104 market snapshots. 736 contracts mapped to canonical matches and 735 to canonical players. |
| Tennis context | `tennis_player_match_context`, `tennis_recent_form_metrics`, `tennis_h2h_snapshots`, `tennis_match_weather` | `player_form_snapshots`, `h2h_matches` | `pipeline/sources/tennis/normalization/context.py` | `data-migration/scripts/normalize_tennis_context.py` | not_started |  |  | pending | pending | Do not replace existing H2H rows until validation. |

## Append-Only Notes

- 2026-06-02: Normalization track opened. Tennis is first, ledger is Markdown plus JSONL, and ambiguous mappings are quarantined.
- 2026-06-02: Tennis stats normalization completed and mirrored to DuckDB. `match_stat_rows` now has 335,138 rows and `service_pressure_snapshots` has 824 rows; 250 ambiguous stat mappings remain quarantined.
- 2026-06-02: Tennis replay normalization completed and mirrored to DuckDB. `replay_games` now has 7,174 rows and `replay_points` has 38,959 rows with zero unresolved replay mappings.
- 2026-06-02: Tennis market normalization completed and mirrored to DuckDB. Added typed `market_contracts` and `market_price_ticks`; 187 ambiguous market mappings remain quarantined.
