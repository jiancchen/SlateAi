# Sports Trading Board Workspace

This repo is now split into a deployable frontend and a private prediction workspace.

## Repo Structure

- `web/`
  Public React/Vite app. This is the only folder that should be deployed to Vercel.
- `api/`
  Read-only Fastify service that can serve compact slate, story, history, and prediction payloads from the private workspace.
- `published-data/`
  Generated JSON snapshots that the API can serve instead of importing large frontend-shaped TS/JS modules directly.
- `pipeline/`
  Daily generators, exporters, graders, and warehouse utilities.
- `data-private/`
  Local warehouse, raw pulls, saved predictions, reports, and JSONL training history.
- `research/`
  Source registry, follow-ups, tickets, and operator notes.

## What Ships Publicly

- `web/src/`
- `web/public/`
- `web/index.html`
- `web/vite.config.js`
- `web/vercel.json`

The `api/` service is intended for private/local or protected deployment, not direct public static hosting.

## What Stays Private

- `pipeline/`
- `data-private/raw/`
- `data-private/warehouse/`
- `data-private/history/`
- `research/followups/`
- any local notes or training artifacts you do not want exposed

## Daily Prediction Workflow

Run all operator commands from the repository root.

### Frontend

```bash
npm run setup:web
npm run dev
npm run build
```

### API

```bash
npm run setup:api
npm run dev:api
npm run build:api
```

### Published JSON snapshots

```bash
npm run data:export:published
```

### MLB Preflight

```bash
npm run data:init
npm run data:prep:mlb-day -- --date YYYY-MM-DD --lookback-days 3
npm run data:list:probables -- --date YYYY-MM-DD
# If MLB leaves a probable blank or TBD, the day generator now falls back to
# RTSports probable pitchers before exporting the slate.
npm run data:generate:mlb-day -- --date YYYY-MM-DD
npm run data:export:mlb-lineups -- --date YYYY-MM-DD
npm run data:export:mlb-batting-impact
npm run data:export:hr -- --date YYYY-MM-DD
```

### Live MLB Refresh

```bash
npm run data:refresh:mlb-live -- --date YYYY-MM-DD
npm run data:verify:mlb-refresh -- --date YYYY-MM-DD
```

### Backtesting / History

```bash
npm run data:export:mlb-sides -- --start-date YYYY-MM-DD --end-date YYYY-MM-DD
npm run data:import:mlb-sides -- --file data-private/predictions/mlb-sides/<file>.json
npm run data:grade:mlb-sides -- --model-name <model-name>
npm run data:report:mlb-sides -- --model-name <model-name> --train-end YYYY-MM-DD --verify-start YYYY-MM-DD --verify-end YYYY-MM-DD --out data-private/reports/<report>.md
npm run data:export:history-journal
```

## Key Files

- `web/src/App.tsx`
  Main frontend shell and trading desk UI.
- `web/src/lib/sports-model.js`
  Shared deterministic scoring logic used by the published slates.
- `web/src/lib/slate-manifest.ts`
  Lazy-loading manifest for day files.
- `pipeline/mlb_warehouse.py`
  Local SQLite warehouse and ingest pipeline.
- `pipeline/export-mlb-lineup-model.mjs`
  MLB lineup + weather + matchup exporter.
- `pipeline/export-home-run-predictions.mjs`
  MLB HR board generator.
- `pipeline/export-mlb-side-predictions.mjs`
  Saved MLB side board exporter for grading.
- `pipeline/export-history-journal.mjs`
  JSONL training ledger export.
- `research/daily-games-external.md`
  Daily source registry and operator shortcuts.
- `research/mlb-daily-run-checklist.md`
  Daily MLB operator checklist and refresh verification routine.
- `data-private/README.md`
  Warehouse layout and local data notes.

## Notes

- The current prediction engine is still an operator-assisted system.
- The website renders precomputed outputs; it should not become the home of the private pipeline.
- The new API layer is the first step away from large generated frontend data modules, but the web app is still reading `web/src/lib/day-*.js` directly until the next migration pass.
- The API now prefers `published-data/` JSON snapshots for slates, history, and stories when they exist, and falls back to the current generated modules when they do not.
- What is still intentionally deferred before full rewiring: auth, write endpoints, moving generated day payloads into compact JSON, and a shared type/contract package between `web/` and `api/`.
- If you deploy on Vercel, deploy from `web/`, not the repo root.
- See [web/DEPLOY_VERCEL.md](/Users/jcchen/Documents/New%20project/web/DEPLOY_VERCEL.md:1) for the exact Vercel setup checklist.
