# Refactor 05-22-26

## Summary

This refactor moved the project away from a frontend-heavy snapshot architecture and toward a cleaner:

- `data-private/warehouse` -> source of truth
- `pipeline/` -> ingest, derive, export, grade
- `api/` -> serve compact read-only JSON
- `web/` -> thin client that renders API data

The main goal was to reduce duplicated data, reduce token waste during development and prediction work, and make the system easier to evolve as the model changes.

## What Changed

### Repo structure

The repo is now clearly split into:

- `web/` for the public React/Vite app
- `api/` for the private/protected Fastify service
- `pipeline/` for generators, graders, exporters, and warehouse utilities
- `data-private/` for SQLite, raw pulls, reports, and saved prediction artifacts
- `published-data/` for compact API-served snapshots
- `research/` for operator notes, checklists, and follow-ups

### Web app

The web app is now API-first instead of bundling large generated day files directly into the browser.

Key changes:

- `Stories` moved off the generated archive blob
- `History` moved off the bundled history archive fallback
- MLB day loading moved off heavy `day-*.js` browser imports
- selected MLB game detail is loaded on demand through the API
- the browser no longer ships story archive, history archive, dated lineup chunks, HR chunks, or day-module chunks

Supporting files:

- `/Users/jcchen/Documents/New project/web/src/lib/slate-loaders.ts`
- `/Users/jcchen/Documents/New project/web/src/lib/archive-loaders.ts`
- `/Users/jcchen/Documents/New project/web/src/lib/slate-fallback.ts`
- `/Users/jcchen/Documents/New project/web/src/App.tsx`

### API and published data

A read-only Fastify API was added so the frontend can consume normalized payloads instead of giant frontend-shaped modules.

Key changes:

- added endpoints for slates, stories, history, lineups, HR board, and props
- added published JSON export flow
- split slate data into summary and per-game detail
- split story data into day summaries and per-game logs
- separated props from the main slate payload
- removed duplicated embedded game objects from prop rows
- stopped pretty-printing published JSON

Supporting files:

- `/Users/jcchen/Documents/New project/api/src/server.ts`
- `/Users/jcchen/Documents/New project/api/src/scripts/export-published-data.ts`
- `/Users/jcchen/Documents/New project/api/src/lib/day-loader.ts`
- `/Users/jcchen/Documents/New project/api/src/lib/archive-loader.ts`

### MLB warehouse and model foundation

The private MLB system is much more warehouse-backed now.

Added or strengthened:

- player-game batting boxscores
- non-HR prop import + grading loop
- plate appearances
- pitch events
- game story signals
- plate-appearance and story archive exports
- daily MLB verification checklist

Supporting files:

- `/Users/jcchen/Documents/New project/pipeline/mlb/warehouse/mlb_warehouse.py`
- `/Users/jcchen/Documents/New project/pipeline/mlb/publish/export-prop-predictions.mjs`
- `/Users/jcchen/Documents/New project/pipeline/mlb/publish/export-history-journal.mjs`
- `/Users/jcchen/Documents/New project/pipeline/mlb/warehouse/export_story_archive.py`
- `/Users/jcchen/Documents/New project/development-docs/mlb/runbooks/daily-run-checklist.md`

### Props

The previous prop system was too broad and acted more like a candidate universe than a real prediction board.

What changed:

- preserved the older broad prop universe as legacy
- created a smaller tracked prop path for current days
- added prop grading against actual player batting outcomes
- added predicted `scriptTags`
- added actual postgame `storyTags`
- added calibration buckets by:
  - prop type
  - team + type
  - reason tag + type
  - predicted script tag + type
  - actual story tag + type

This is the start of moving props from flat per-player guesses toward game-script-aware tracking.

## Why This Helps

### Token efficiency

Before the refactor, a lot of development and prediction work required repeatedly reading large generated JS files that duplicated the same data in browser-oriented shapes.

After the refactor:

- the DB is the private source of truth
- the API serves smaller, normalized payloads
- the web app is thin
- the browser loads only what it needs

This reduces repeated context, repeated parsing, and repeated duplication when building or debugging predictions.

### Easier evolution

The model is changing day by day. This structure makes it much easier to add new data without bloating the frontend.

Examples of future data that can now be added more cleanly:

- leverage and choke-context features
- pitch-type trigger features
- injury / return / call-up notes
- bullpen entry-state features
- richer tennis warehousing
- story/script features derived from plate appearances and pitch events

### Better training and evaluation

We now have a stronger foundation for training and backtesting because more of the system is structured and stored:

- per-pick history
- per-prop grading
- player batting outcomes
- plate appearances
- pitch events
- story signals
- script/story tags on props

That means future modeling can move from average-only thinking toward:

- what kind of game story was live
- which props survive across multiple scripts
- which sides or props fail in specific environments
- which tags actually calibrate well historically

## Current Outcome

This refactor delivered:

- a much thinner frontend bundle
- a cleaner private/public separation
- a more reusable warehouse-driven prediction system
- better historical tracking for props
- the start of a story-aware modeling foundation

It did not finish the prediction engine. It made the prediction engine easier to improve.

## What This Unlocks Next

Near-term:

- protected API deployment / auth
- shared `types/contracts` package between `web` and `api`
- richer script-aware prop selection
- fuller use of story signals in side and prop models
- further reduction of manual data shuffling

Model-side:

- test script-aware features beside the current engine
- compare predicted script tags vs actual story tags
- identify recurring "when" factors across different game stories
- keep expanding the archive for future training loops

## Dev Notes

Root commands now support a smoother local workflow:

- `npm run setup`
- `npm run dev`
- `npm run build`
- `npm run build:api`
- `npm run data:export:published`
- `npm run data:export:history-journal`
- `npm run data:refresh:mlb-live -- --date YYYY-MM-DD`

Generated web artifacts are also auto-seeded now so local Vite startup does not fail if calibration/history derived files are missing.
