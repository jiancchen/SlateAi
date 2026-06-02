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
| Context | `tennis_player_match_context`, `tennis_recent_form_metrics`, `tennis_h2h_snapshots`, `tennis_match_weather` | `player_form_snapshots`, `match_context_snapshots` |

## MLB Normalization Policy

MLB should use a broad one-pass normalization strategy after the tennis pattern is stable. The goal is not to make every minor source family equally important; the goal is to ensure no active model/dashboard path needs to decode random legacy blobs.

### Core Model Data

Core model data must be fully typed now:

- Pitcher and batter features
- Lineups
- Props
- Markets
- Game state
- Weather, sun, and park context
- Results
- Prediction rows
- Settlement rows

These families should get strict schemas with canonical `game_id`, `team_id`, `player_id`, `market_id`, and model/run identifiers where applicable.

### Secondary Useful Data

Secondary data should be normalized into typed feature/event tables:

- Player career, season, and split context
- Team trends
- Injury, role, and news-style context
- Prop history
- Odds snapshots

These tables should preserve typed fields that are useful for DuckDB backtests and retain residual `source_detail_json` only for audit/source replay.

### Low-Value Or Weird Leftovers

Low-value leftovers still need classification. They should not stay as untracked blobs. Route them into typed `source_*` or `context_*` tables with:

- Canonical IDs when available
- Source table/folder
- Source primary key or URL
- Parsed fields where practical
- `source_detail_json` for residual audit detail
- Explicit unresolved mappings when canonical joins are ambiguous

After MLB normalization, any remaining `legacy_table_rows.row_json` usage must be documented as audit-only or blocked for follow-up.

## MLB Families

The first MLB inventory pass classified `70` legacy source tables and `1,206,213` legacy rows with zero catch-all leftovers. Keep the generated full source-table inventory in `data-migration/reports/mlb_normalization_inventory_2026-06-02.md`.

Phase 2 remaining-family execution is tracked in `data-migration/normalization_phase2_run_plan.md`. Do not wire DB-first ingestion until the remaining model metadata, prediction/backtest, market/prop, game-shape formula, player context, team context, and tennis identity cleanup rows are validated and DuckDB-ready.

| Family | Bucket | Source Tables | Rows | Parser Module | Target Direction |
|---|---|---:|---:|---|---|
| MLB hitter/batter features | `core_model_data` | 8 | 693,712 | `pipeline/sources/mlb/normalization/hitter_features.py` | Batter feature snapshots, pitch-type response, Statcast/classic trend rows, current deviation, state, and distribution rows. |
| MLB pitcher/starter features | `core_model_data` | 6 | 149,971 | `pipeline/sources/mlb/normalization/pitcher_features.py` | Pitch mix, first-inning, mistake-shape, leash, third-time penalty, and starter form rows. |
| MLB player career/splits/context | `secondary_feature_event` | 6 | 187,869 | `pipeline/sources/mlb/normalization/player_context.py` | Career, splits, identity curves/profiles, pitcher season value, and HR leaderboard context. |
| MLB results/outcomes | `core_model_data` | 8 | 51,768 | `pipeline/sources/mlb/normalization/results.py` | Game outcomes, team stats, batter/pitcher outcomes, HR events, phase outcomes, and starter logs. |
| MLB bullpen/relief shape | `core_model_data` | 5 | 29,425 | `pipeline/sources/mlb/normalization/bullpen_features.py` | Bullpen usage, bullpen mistake shape, likely relief chains, and reliever command profiles. |
| MLB team/game-shape features | `core_model_data` | 8 | 29,692 | `pipeline/sources/mlb/normalization/team_features.py` | First-inning, rolling form, state, opponent quality, mistake, carryover, lead-surrender, and whiff-persistence rows. |
| MLB lineup/matchup features | `core_model_data` | 3 | 26,009 | `pipeline/sources/mlb/normalization/lineups.py` | Lineups, lineup slots, lineup/pitcher matchup snapshots, conversion shape, and dependency profiles. |
| MLB predictions/backtests | `core_model_data` | 9 | 16,791 | `pipeline/sources/mlb/normalization/predictions.py` | Prediction rows, settlement rows, component settlement rows, and lane-specific backtest rows. |
| MLB game-shape/state formula | `core_model_data` | 2 | 8,181 | `pipeline/sources/mlb/normalization/game_shape.py` | State formula training and backtest rows. |
| MLB team trend/context | `secondary_feature_event` | 4 | 5,673 | `pipeline/sources/mlb/normalization/team_context.py` | Story priors, story labels/signals, and series context. |
| MLB props/odds | `core_model_data` | 1 | 2,409 | `pipeline/sources/mlb/normalization/props.py` | Prop market snapshots. |
| MLB market/odds context | `secondary_feature_event` | 2 | 2,044 | `pipeline/sources/mlb/normalization/markets.py` | Team market context and market mispricing labels. |
| MLB markets/odds | `core_model_data` | 2 | 2,000 | `pipeline/sources/mlb/normalization/markets.py` | Market snapshots, market contracts, and price ticks. |
| MLB environment/sun/park | `core_model_data` | 2 | 601 | `pipeline/sources/mlb/normalization/environment.py` | Environment snapshots, sun visibility snapshots, and visibility outcomes. |
| MLB model metadata | `core_model_data` | 4 | 68 | `pipeline/sources/mlb/normalization/model_metadata.py` | Model runs, component runs, run lanes, and run artifacts. |

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
