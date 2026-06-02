# MLB DB Input Adapter

This folder is the M10 bridge from file-first MLB model code to DB-first MLB model code.

## Contract

- Active MLB model lanes should read `sql-mlb.db` or `duck-mlb.duckdb` through this adapter.
- Public mirrors such as `published-data/slates/**` are export outputs, not model inputs.
- Raw archives such as `data-private/raw/**`, `data-private/lineups/**`, and `data-private/odds/**` are source receipts. Source adapters parse them into typed DB tables before model lanes read them.
- Generated prediction JSON under `data-private/predictions/**` is a compatibility/export surface until M10D removes it as an upstream dependency.

## Current Implementation

`sqlite.mjs` uses `sqlite3 -json` because the repository already depends on that shell path and does not yet include a JS SQLite package. This is acceptable for current-day lane reads and validation. Heavy backtests should use the DuckDB analytics copy once the lane queries are batched.

## First Query Helpers

- `gamesForDate(date)`
- `sourceStatusForDate(date)`
- `sourceStatusMapForDate(date)`
- `lineupCoverageForDate(date)`
- `marketCoverageForDate(date)`
- `modelArtifactCoverageForDate(date)`

Future lane cutovers should add query helpers here rather than reading files directly inside lane scripts.

