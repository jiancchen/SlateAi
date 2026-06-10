# Tennis T0 Full Audit - 2026-06-09

## Executive Summary

TEN-T0 is not a clean DB-first tennis model. The active runner performs preflight, then calls `pipeline/tennis/publish/generate-day-module.mjs`; that generator only uses the SQLite warehouse for scoreboard and rankings when `--input-source db` is selected. Warehouse context, DraftKings lines, FanDuel lines, Robinhood prediction markets, multimodel ensemble rows, and derivative market rows still come from JSON artifacts.

The current DB-mode scoreboard path is also functionally broken for modern slates: it hard-filters `matches.match_id like 'rg-%'`, but the active June 7-9 tennis DB rows are `tl-*`, `dk-*`, and `rh-*`. A DB-mode run for 2026-06-08 loaded 0 DB scoreboard matches and still produced 81 picks from JSON supplements.

The published June 8 board performed poorly as a broad prediction board: 40/63 settled, 63.5% hit rate, ROI -3.7. The selector overlay reduced the 81 rows to 20 prediction candidates and self-checked at 13/18 settled, 72.2%, ROI +5.7. This strongly supports demoting raw TEN-T0 to a source board and requiring selector gates before calling rows predictions.

## Evidence

- Active model registry points to `data-private/warehouse/sports/tennis/sql-tennis.db`.
- `data-private/tennis.db` and `data-migration/mlb.db` are zero-byte files and should not be treated as active DBs.
- Active tennis DB size: about 1.5 GB SQLite.
- Analytics DuckDB exists at `data-private/warehouse/analytics/duck-tennis.duckdb`, about 500 MB, but TEN-T0 generation did not query it in this audit.

## Read Path Findings

1. TEN-T0 runner is a wrapper, not the model.
   - `models/tennis/cartridges/TEN-T0/runner.mjs` runs `prediction_preflight.mjs`, then spawns `pipeline/tennis/publish/generate-day-module.mjs`.

2. DB mode is partial.
   - `generate-day-module.mjs` only switches scoreboard and rankings to DB in `--input-source db`.
   - These remain file/JSON inputs even in DB mode:
     - `web/src/lib/day-<date>-tennis-warehouse-context.generated.json`
     - `data-private/reference/tennis/draftkings-lines-<date>.json`
     - `data-private/reference/tennis/fanduel-lines-<date>.json`
     - `data-private/reference/tennis/robinhood-tennis-supplement-<date>.json`
     - `data-private/predictions/tennis/<date>-multimodel-ensemble.json`
     - `data-private/predictions/tennis/<date>-derivative-markets.json`

3. DB scoreboard filter is stale.
   - `loadDbScoreboard()` filters `where m.match_date = <date> and m.match_id like 'rg-%'`.
   - DB row counts for `rg-%`:
     - 2026-06-01: 8
     - 2026-06-02: 4
     - 2026-06-03 through 2026-06-09: 0
   - Non-mutating test run:
     - DB mode on 2026-06-08 loaded 0 DB scoreboard matches and wrote 81 games from supplements.
     - File mode on 2026-06-08 wrote 108 games.
     - Published `2026-06-08-tennis-t0-predictions.json` also has 81 picks.

4. Preflight is not tennis-lane-specific.
   - `prediction_preflight.mjs` has explicit `SPORT_LANE_SOURCES` only for MLB.
   - Tennis falls back to all policies with `required_for_prediction = 1`, regardless of actual TEN-T0 lane behavior.

## Preflight Findings

As of `2026-06-10T05:54Z`, both recent tennis value lanes failed preflight:

- 2026-06-08:
  - required sources checked: 5
  - passed sources: 0
  - blocking errors:
    - missing `tennis_flashscore_stats`
    - stale `tennis_odds`
    - missing `tennis_player_context`
    - stale `tennis_rankings`
    - stale `tennislive`

- 2026-06-09:
  - required sources checked: 5
  - passed sources: 1
  - blocking errors:
    - missing `tennis_flashscore_stats`
    - missing `tennis_odds`
    - missing `tennis_player_context`
    - missing `tennislive`

This means current publishing either depends on stale reports/artifacts, bypasses preflight, or captures after a previous window and later becomes stale with no durable freshness enforcement in the published artifact.

## Data Quality Findings

Active generic table counts:

| Table | Rows |
|---|---:|
| matches | 1,755 |
| match_players | 3,551 |
| players | 5,577 |
| rankings | 4,413 |
| market_contracts | 1,188 |
| market_snapshots | 2,608 |
| market_price_ticks | 131,612 |
| match_stat_rows | 444,968 |
| service_pressure_snapshots | 2,705 |
| replay_games | 31,889 |
| replay_points | 208,627 |
| legacy_table_rows | 484,024 |
| source_snapshots | 4,880 |
| unresolved_entities | 451 |
| prediction_rows | 776 |
| settlement_rows | 0 |

Missing active slate fields:

| Date | Matches | Missing Start Time | Missing Status |
|---|---:|---:|---:|
| 2026-06-01 | 53 | 53 | 8 |
| 2026-06-02 | 148 | 148 | 66 |
| 2026-06-03 | 36 | 36 | 0 |
| 2026-06-04 | 96 | 73 | 0 |
| 2026-06-05 | 60 | 56 | 0 |
| 2026-06-06 | 34 | 34 | 0 |
| 2026-06-07 | 152 | 64 | 0 |
| 2026-06-08 | 106 | 42 | 0 |
| 2026-06-09 | 14 | 14 | 0 |

Duplicate and identity findings:

- Primary keys are clean for `matches.match_id`, `players.player_id`, exact `players(name,tour)`, and `rankings(player,date,tour)`.
- Natural match duplicates exist:
  - 2026-06-04: 9 duplicate groups / 18 rows
  - 2026-06-05: 15 duplicate groups / 30 rows
  - 2026-06-06: 7 duplicate groups / 14 rows
  - 2026-06-07: 9 duplicate groups / 18 rows
  - 2026-06-08: 16 duplicate groups / 32 rows
- `match_players(match_id, side)` has 41 duplicate groups, mainly alias/diacritic variants such as `Bu Yunchaokete` and `Yunchaokete Bu`, `Diego Dedura` and `Diego Dedura-Palomero`, or accented/unaccented versions.
- `market_snapshots` has 82 duplicate natural-key groups.
- `match_stat_rows` has 68,526 duplicate natural-key groups by `(match_id, source_name, player_id, stat_name, period)`.

Market row quality:

- `draftkings` market snapshots: 939 rows, 296 missing `player_id`.
- `kalshi` market snapshots: 751 rows, 186 missing `match_id`, 187 missing `player_id`.
- `fanduel` market snapshots: 104 rows, 24 missing `player_id`.
- All checked market snapshot rows had some price field populated.

## Published June 8 Coverage

Published file: `data-private/predictions/tennis/2026-06-08-tennis-t0-predictions.json`.

- Total picks: 81
- Market-only rows: 46
- Non-market-only rows: 35
- Rows with no market object: 0
- Rows missing predictionMarket object: 3

Warehouse context coverage using exact match ID only:

- Exact match context hits: 9/81
- Missing exact match context: 72/81

Warehouse context coverage using the generator's player-name fallback:

- Rows with both players found by exact match or `playersByName`: 42/81
- Rows with one player found: 12/81
- Rows with no players found: 27/81
- Rows with both expected stats: 35/81
- Rows with both recent-form context: 34/81
- All 35 non-market-only rows had both players found.
- Only 7 of 46 market-only rows had both players found.

Interpretation: the core model subset has player enrichment, but the expanded market-only board mostly does not. Treating all 81 as predictions is misleading.

## Performance Findings

June 8 baseline report:

- Rows: 81
- Settled: 63
- Published pick: 40/63, 63.5%
- Market favorite: 40/63, 63.5%
- Published pick ROI: -3.7
- Market favorite ROI: -4.2

June 8 selector overlay:

- Source rows: 81
- Prediction candidates: 20
- No-play rows: 46
- Prediction self-check: 13/18 settled, 72.2%, ROI +5.7

Historical model-run grading is weak:

- `grades.json` for TEN-T0 run directories is a `not_settled` placeholder.
- `backtest.json` is missing for 2026-06-05, 2026-06-07, and 2026-06-08 model-run folders.
- Generic `settlement_rows` table has 0 rows.

## Root Causes

1. The model is actually a mixed artifact assembler.
   - It combines DB rankings/scoreboard, generated JSON context, sportsbook JSON, prediction-market JSON, and old ensemble JSON.

2. Current DB scoreboard query is too Roland-Garros-ID-specific.
   - It misses all non-`rg-*` modern rows and lets supplements dominate the board.

3. Source freshness is not enforced in the final artifact.
   - Preflight can fail while previously published files still look usable.

4. Natural-key duplicates and alias rows are leaking into typed tables.
   - Primary keys hide the issue; natural identities still duplicate matches, market rows, stat rows, and match-player sides.

5. TEN-T0 output conflates prediction rows and market inventory.
   - Market-only rows are useful watchlist rows, but they should not be counted as model predictions or used in performance summaries.

6. Settlement/evaluation is not first-class.
   - There are model run artifacts, but the durable typed settlement table is empty and recent run `grades.json` files are placeholders.

## Recommended Remediation

### P0 - Stop The Bleeding

- Rename output semantics:
  - `predictionRows`: non-market-only rows with both players joined and required stat support.
  - `marketWatchRows`: market-only rows or rows missing player/stat support.
  - Never publish `totalSingles` as if all rows are model predictions.
- Make TEN-T0 runner require `--input-source db` by default, then fail if the DB scoreboard returns 0 rows unless an explicit `--allow-supplement-only` flag is set.
- Add tennis-specific lane source sets to `prediction_preflight.mjs`.
- Persist preflight status into prediction output and site data. If preflight fails or is stale, display/publish as stale/degraded.

### P1 - Fix DB Read Path

- Replace `match_id like 'rg-%'` with a tournament/source query that supports `tl-*`, `dk-*`, and `rh-*`.
- Build one canonical slate table/view for publishable singles:
  - canonical match ID
  - two canonical player IDs
  - source coverage flags
  - market coverage flags
  - freshness state
- Move sportsbook, Robinhood, ensemble, derivative, and warehouse context reads into SQLite/DuckDB or generated DB-backed views.

### P1 - Repair Data Quality

- Add unique indexes or validation blockers for:
  - natural match key `(match_date, tournament_id, canonical player pair)`
  - `(match_id, side)` after alias resolution
  - market natural key `(match_id, source_name, market_type, selection, line_value, captured_at)`
  - stat natural key `(match_id, source_name, player_id, stat_name, period)`
- Repair alias duplicates for side rows before feature export.
- Backfill missing `start_time_utc` where source snapshots have schedule data; otherwise explicitly mark `TBD` and do not sort as midnight.

### P2 - Evaluation

- Populate `settlement_rows`.
- Make `grades.json` real for each TEN-T0 run.
- Add automated calibration slices:
  - market-only vs model-backed
  - exact-match join vs name-fallback join
  - both-player stats vs partial/no stats
  - chalk bands
  - ATP/WTA and surface

## Bottom Line

The user's concern is justified. TEN-T0 is not reliably using all DBs, the active DB has meaningful duplicate and missing-field problems, and recent outputs mix true model-backed predictions with mostly unenriched market watch rows. The fastest path to sanity is to demote broad T0 to an inventory/source board, promote the selector gate as the only prediction surface, and fix the DB scoreboard/source freshness contract before trusting future tennis outputs.
