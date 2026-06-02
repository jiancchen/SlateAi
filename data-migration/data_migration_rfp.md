# Data Migration RFP

## Purpose

The current sports prediction system has outgrown a file-first data layout. This document records how prediction, training, ingestion, and model evolution work today, how they should work after migration, and what the migration must protect.

The goal is not just cleaner storage. The goal is faster prediction runs, safer model iteration, reproducible backtests, and fewer accidental changes to unrelated boards or dates.

## Current State

### Current Data Shape

- Generated JSON is often treated as the source of truth.
- `published-data/slates` and `web/public/data/slates` can duplicate the same slate payloads.
- Large generated files are committed and rewritten during normal runs.
- Raw source data, normalized-ish context, model outputs, public deploy files, and debug reports are all mixed across the repo.
- Some facts live in DB tables, but important prediction and UI context still lives in generated files.
- Historical search depends on large static JSON indexes.
- Old boards can disappear when export scripts prune or regenerate public mirrors.

### Current Prediction Run Behavior

An MLB or tennis prediction run can currently involve:

- model cartridge scripts
- pipeline ingestion scripts
- warehouse scripts
- generated web modules
- public deploy data
- published slate data
- search indexes
- model reports
- build scripts
- health checks
- manual Codex inspection

For MLB, the active run surface can involve thousands of files when artifacts and generated mirrors are included. A routine prediction run may also run publishing/build steps, which makes prediction too broad and too risky.

### Current Codex Role

Codex is currently doing too much orchestration:

- finding the correct scripts
- checking which artifacts are stale
- avoiding accidental overwrites
- interpreting model outputs
- patching generated data issues
- rebuilding public mirrors
- validating UI state
- writing postmortems and run notes

This makes Codex act like both operator and prediction engine. That is not ideal.

### Current Failure Modes

- Prediction runs can mutate unrelated dates.
- Build/export can hide or delete historical boards.
- Backtests can miss rows because data is scattered.
- Large JSON churn slows every commit and diff.
- Model lineage is hard to audit.
- Context cutoffs happen because too many files must be scanned.
- Reruns can overwrite richer data with thinner data.
- Static deploy mirrors can diverge from warehouse truth.

## Target State

### Storage Roles

#### Raw Archive

Raw archive is immutable source capture.

- Written only by ingestion/fetch scripts.
- Never edited by model, UI, or prediction scripts.
- Stores raw HTML, API JSON, point-by-point data, pitch-level data, screenshots, and source payloads.
- Referenced by source, date, hash, and normalized entity keys.
- Kept out of routine Git churn when large.

#### SQLite

SQLite is the local source of truth for durable facts.

Recommended split:

- `data-private/warehouse/mlb.db`
- `data-private/warehouse/tennis.db`
- optional `data-private/warehouse/models.db`

SQLite stores:

- teams, players, matches, games
- tournaments, venues, schedules
- lineups and probables
- rankings and profiles
- odds, sportsbook lines, prediction-market prices
- player stats, match stats, pitch summaries, point summaries
- predictions by model/date/lane
- value board rows
- settlements/results
- model run metadata
- health checks

#### DuckDB

DuckDB is the analytics and training engine.

DuckDB handles:

- feature matrices
- large batch joins
- pitch-by-pitch and point-by-point analytics
- rolling windows
- backtests
- model comparison reports
- ROI buckets
- experiment outputs

DuckDB can run through Python, Node, or CLI. Python is preferred for pandas/sklearn/model research. The app should not depend on DuckDB for normal UI reads.

#### Generated JSON

Generated JSON becomes cache/export only.

- Not source of truth.
- Generated from DB rows.
- Scoped to selected date/model/export target.
- Not rewritten globally during routine prediction unless explicitly requested.
- Public static data is a deploy artifact, not an editing surface.

## Target Prediction Run

The ideal command should look like:

```bash
predict --sport mlb --date 2026-06-02 --model MLB-M2
```

The run should:

1. Read source facts from SQLite.
2. Load the selected model cartridge.
3. Build feature rows from DB data.
4. Produce deterministic predictions.
5. Write prediction rows to DB.
6. Write value board rows to DB.
7. Run health checks for that date/model only.
8. Return a compact report.

It should not:

- rewrite unrelated slates
- rebuild the full frontend
- regenerate every public data mirror
- mutate historical boards
- require Codex to inspect thousands of files
- silently blend source-site picks or LLM interpretation into model output

## Target Training And Backtesting

Training and backtesting should be DB/DuckDB-native.

The system should support queries like:

- M0 vs M2 by date range
- model accuracy by lane
- ROI by market price bucket
- tennis Kalshi spike hit rate by entry cents
- MLB totals performance by game-shape bucket
- F5 performance by starter-to-bullpen transition
- tennis upset performance by BP faced/saved volume

Predictions and settlements should join by stable IDs, not by fuzzy file paths.

## Model Evolution And Swapping

Model cartridges remain the model code boundary.

Each model should have:

- manifest
- runner
- feature contract
- output contract
- model notes
- benchmark snapshots
- performance history
- migration notes

Model outputs should be versioned rows:

- `sport`
- `model_id`
- `model_version`
- `date`
- `lane`
- `entity_id`
- `prediction`
- `confidence`
- `price`
- `ev`
- `feature_snapshot_id`
- `created_at`

The UI should be able to choose which model/date to display without overwriting another model’s output.

## Codex Role After Migration

Codex should:

- run scripts
- create experiments
- translate hypotheses into features
- query DuckDB
- compare results
- write postmortems
- update runbooks
- propose model changes

Codex should not:

- manually interpret every prediction
- hand-patch generated slate data
- decide picks outside the model without storing an override
- treat generated JSON as warehouse truth
- run publishing/deploy steps as part of prediction unless explicitly requested

Manual or LLM interpretation should be stored separately as:

- `analyst_note`
- `manual_override`
- `hypothesis`
- `postmortem`

## Migration Phases

### Phase 1: Current Flow Inventory

Map every prediction command for MLB and tennis:

- files read
- files written
- DB tables read
- DB tables written
- generated artifacts
- public exports
- build/deploy side effects

Output:

- current-flow map
- mutation risk list
- must-not-touch list

### Phase 2: Schema Design

Create schemas for:

- `mlb.db`
- `tennis.db`
- optional `models.db`

Output:

- schema migrations
- table contracts
- key strategy
- source archive contract

### Phase 3: Backfill Converters

Convert existing artifacts into DB rows.

Inputs:

- `published-data`
- `data-private/reference`
- `data-private/predictions`
- model-run artifacts
- result journals
- raw archive files

Output:

- normalized DB rows
- backfill coverage report
- missing-key report

### Phase 4: DB-First Prediction Outputs

Change model runs to write predictions/value rows to DB first.

Output:

- DB prediction rows
- DB value-board rows
- DB health rows
- compact optional export

### Phase 5: DB-Derived Public Export

Generate public JSON from DB only when needed.

Rules:

- explicit date range
- no broad pruning
- no hidden current-window default
- public export cannot delete history unless explicitly told to

### Phase 6: DuckDB Training Layer

Build DuckDB scripts for:

- feature matrices
- backtest panels
- ROI buckets
- model comparisons
- experiment reports

Output:

- reproducible training queries
- backtest reports
- model comparison tables

### Phase 7: Frontend/API Read Path

Move the UI toward DB/API-derived reads:

- slate by date
- game detail by ID
- value board by model/date/lane
- model history by model/date
- search by DB index or compact per-date index

### Phase 8: Archive And Ignore Generated Mirrors

Stop committing heavy generated mirrors during routine work.

Rules:

- keep compact manifests in Git
- archive raw blobs outside routine commits
- ignore diagnostic `.actual.json` files
- generate deploy cache during deploy

## Success Criteria

- Routine prediction run touches one date/model only.
- Historical boards cannot disappear from a prediction run.
- Prediction runtime drops from 10-40 minutes to roughly 1-5 minutes for normal runs.
- Context/token load drops by 60-90% for routine runs.
- Training/backtest becomes 2-10x faster.
- Model outputs are reproducible by model/date/lane.
- Public export is explicit and guarded.
- Codex no longer needs to scan thousands of files for a normal prediction run.

## Open Questions

- Should model metadata live in sport DBs or a shared `models.db`?
- Which raw archive artifacts stay local vs object storage?
- How much public static history should Vercel include by default?
- Should search be API-driven immediately or per-date static index first?
- Which sport migrates first: MLB because it is heavier, or tennis because it is simpler?

## Recommendation

Start with MLB DB-first prediction outputs because MLB currently has the largest file surface and the most expensive prediction runs.

Do not big-bang the frontend first. First prove:

1. backfilled DB rows match existing JSON outputs
2. MLB-M2 can read DB inputs
3. MLB-M2 can write DB predictions
4. backtest can join DB predictions to results
5. public export can be generated from DB for one date

Once that works, repeat for tennis and then retire JSON-as-source behavior.
