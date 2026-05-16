# Data Warehouse

This project now keeps the sports dashboard logic separate from the local event warehouse.

## Storage Shape

- `data/raw/`
  Local source snapshots fetched from official APIs or known-good pages. This directory is ignored by git so we can store full schedule and game-feed payloads without bloating the repo.
- `data/warehouse/sports.db`
  Local SQLite warehouse for normalized MLB games, starting pitchers, home-run events, Statcast leaderboard snapshots, prediction snapshots, backtests, and reserved park/weather tables.
- `data/predictions/mlb-home-runs/`
  Saved home-run model outputs that can be imported and graded later.

## Why This Shape

- Raw snapshots preserve the source of truth.
- SQLite keeps the event layer queryable without forcing the Svelte app or an LLM to recompute history.
- Prediction files stay lightweight and human-readable.

## Current Commands

```bash
npm run data:init
npm run data:export:hr -- --date 2026-05-15
npm run data:ingest:mlb-day -- --date 2026-05-15
npm run data:ingest:statcast-hr -- --date 2026-05-15 --season 2026
npm run data:import:hr -- --file data/predictions/mlb-home-runs/2026-05-15-statcast-prototype.json
npm run data:grade:hr -- --date 2026-05-15 --model-name statcast-hr-prototype-v1
npm run data:list:hr -- --date 2026-05-15
```

## Notes

- This warehouse is intentionally relational first. A vector database is not the right primary store for structured play-by-play, pitcher lines, or daily predictions.
- The current schema already leaves room for `park_factor_snapshots` and `weather_observations`, so we can add day-level run environment and wind context without redesigning the store.
- If we want semantic retrieval later, the best use would be embeddings for long-form notes, scouting blurbs, or source excerpts, while keeping game facts in SQLite.
