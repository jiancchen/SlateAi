# Data Warehouse

This project now keeps the sports dashboard logic separate from the local event warehouse.

## Storage Shape

- `data/raw/`
  Local source snapshots fetched from official APIs or known-good pages. This directory is ignored by git so we can store full schedule and game-feed payloads without bloating the repo.
- `data/warehouse/sports.db`
  Local SQLite warehouse for normalized MLB games, starting pitchers, starter and reliever appearance logs, per-team game stats, first-5/full-game outcomes, rolling form tables, bullpen workload and likely-reliever tables, Statcast leaderboard snapshots, prediction snapshots, backtests, and reserved park/weather tables.
- `data/predictions/mlb-home-runs/`
  Saved home-run model outputs that can be imported and graded later.
- `data/predictions/mlb-sides/`
  Saved MLB side-pick snapshots with model indicators for retrospective grading and train/verify reports.

## Why This Shape

- Raw snapshots preserve the source of truth.
- SQLite keeps the event layer queryable without forcing the Svelte app or an LLM to recompute history.
- Prediction files stay lightweight and human-readable.

## Current Commands

```bash
npm run data:init
npm run data:prep:mlb-day -- --date 2026-05-16 --lookback-days 3
npm run data:list:probables -- --date 2026-05-16
npm run data:ingest:mlb-range -- --start-date 2026-05-10 --end-date 2026-05-15
npm run data:derive:mlb -- --through-date 2026-05-15
npm run data:list:bullpen -- --date 2026-05-16
npm run data:list:relievers -- --date 2026-05-16
npm run data:export:hr -- --date 2026-05-15
npm run data:ingest:mlb-day -- --date 2026-05-15
npm run data:ingest:statcast-hr -- --date 2026-05-15 --season 2026
npm run data:import:hr -- --file data/predictions/mlb-home-runs/2026-05-15-statcast-prototype.json
npm run data:grade:hr -- --date 2026-05-15 --model-name statcast-hr-prototype-v1
npm run data:list:hr -- --date 2026-05-15
npm run data:list:first5 -- --date 2026-05-15
npm run data:export:mlb-sides -- --start-date 2026-05-10 --end-date 2026-05-15
npm run data:import:mlb-sides -- --file data/predictions/mlb-sides/2026-05-10-to-2026-05-15-board-v2.json
npm run data:grade:mlb-sides -- --model-name board-moneyline-v2
npm run data:report:mlb-sides -- --model-name board-moneyline-v2 --train-end 2026-05-12 --verify-start 2026-05-13 --verify-end 2026-05-15 --out data/reports/mlb-side-backtest-2026-05-10-to-2026-05-15.md
```

## Notes

- This warehouse is intentionally relational first. A vector database is not the right primary store for structured play-by-play, pitcher lines, or daily predictions.
- The current schema already leaves room for `park_factor_snapshots` and `weather_observations`, so we can add day-level run environment and wind context without redesigning the store.
- The daily MLB prep now depends mostly on official MLB Stats API pulls we already trust: target-day schedule/probables via `data:list:probables` plus the trailing few days of `feed/live` data for bullpen workload and likely bridge relievers.
- The side-pick backtest flow is meant to expose pattern misses like `bullpen flip losses`, `thin-edge` misses, and `projected hit edge against pick` so we can tune first-5, spread, and moneyline models separately.
- If we want semantic retrieval later, the best use would be embeddings for long-form notes, scouting blurbs, or source excerpts, while keeping game facts in SQLite.
