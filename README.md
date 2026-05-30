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
npm run dev:web
npm run build
```

If the generated prop calibration/history files have not been refreshed yet, the web app now seeds safe empty stubs automatically so local Vite startup does not fail. Run `npm run data:export:history-journal` when you want the real calibration/history data regenerated.

### API

```bash
npm run setup:api
npm run dev:api
npm run build:api
```

### Full local stack

```bash
npm run setup
npm run dev
```

That starts both:
- the API at `http://127.0.0.1:8787`
- the web app through Vite in `web/`

### Published JSON snapshots

```bash
npm run data:export:published
```

### Tennis Preflight

Before generating or refreshing a tennis slate, capture the ranking snapshot for that calendar date. This updates the latest join file and also writes a dated history file so we can build player ranking-history charts later.

```bash
npm run data:init:tennis
npm run data:fetch:tennis-rankings -- --date YYYY-MM-DD
npm run data:import:tennis-rankings
npm run data:fetch:tennis-scoreboard -- --date YYYY-MM-DD
npm run data:generate:tennis-clay-context -- --date YYYY-MM-DD
node pipeline/enrich-tennis-opponent-quality.mjs --input web/src/lib/day-YYYY-MM-DD-tennis-clay-context.generated.json --output web/src/lib/day-YYYY-MM-DD-tennis-opponent-quality.generated.json
npm run data:fetch:tennis-flashscore-recent -- --input web/src/lib/day-YYYY-MM-DD-tennis-opponent-quality.generated.json --map-output data-private/reference/tennis/flashscore-recent-match-map-YYYY-MM-DD.json
node pipeline/enrich-tennis-opponent-quality.mjs --input web/src/lib/day-YYYY-MM-DD-tennis-clay-context.generated.json --output web/src/lib/day-YYYY-MM-DD-tennis-opponent-quality.generated.json --flashscore-recent-map data-private/reference/tennis/flashscore-recent-match-map-YYYY-MM-DD.json
npm run data:import:tennis-slate -- --date YYYY-MM-DD
npm run data:fetch:tennis-sofascore-slate -- --date YYYY-MM-DD
npm run data:import:tennis-sofascore
npm run data:fetch:tennis-flashscore-slate -- --date YYYY-MM-DD
npm run data:import:tennis-flashscore
npm run data:backfill:tennis-recent-form -- --date YYYY-MM-DD
npm run data:export:tennis-warehouse-context -- --date YYYY-MM-DD
# Required operator/browser step before generation:
# Open every FanDuel event URL in data-private/reference/tennis/fanduel-lines-YYYY-MM-DD.json.
# Capture Moneyline, Game Handicap, and Total Match Games into markets.moneyline,
# markets.gameHandicap, and markets.totalGames. Record unavailable reasons
# such as ended, not offered, or blocked before generating the slate.
node pipeline/generate-tennis-day-module.mjs --date YYYY-MM-DD
npm run data:export:published
npm run data:health:tennis -- --date YYYY-MM-DD --pregame
python3 pipeline/tennis_multimodel_backtest.py --target-date YYYY-MM-DD
python3 pipeline/analyze_kalshi_tennis_intramatch.py --target-date YYYY-MM-DD
python3 pipeline/project_kalshi_tennis_trade_candidates.py
python3 pipeline/model_kalshi_tennis_spike.py --target-date YYYY-MM-DD
python3 pipeline/model_tennis_upset_wins.py --target-date YYYY-MM-DD
```

Daily tennis operating rules live in `development-docs/daily-tennis-slate-playbook.md`. Use that playbook before publishing a tennis value board. It requires the slate to separate winner picks, prediction-market trade-to-sell candidates, watch rows, hard vetoes, and data-incomplete rows.

Tennis health gate:
- `npm run data:health:tennis -- --date YYYY-MM-DD --pregame` must pass before treating a future slate as analysis-ready.
- `npm run data:health:tennis -- --date YYYY-MM-DD --settled` must pass during post-match follow-up before trusting backtests or model-training rows for that day.
- The gate verifies source files, dated ranking snapshots, imported ranking rows, the dated Flashscore recent-match map, recent Flashscore links imported into SQLite under the correct slate date, warehouse recent-form metrics, SofaScore match mappings, Kalshi/prediction-market coverage, and published match-detail payloads.
- In settled mode, it also requires SofaScore stats/replay rows, Kalshi candles/trade features, completed match results, and model-training labels. If a day has passed and this fails, the warehouse is incomplete.
- Published tennis detail payloads must have no missing Hold / 2nd / Err / Ret / Close cells in the visible last-five grid.
- `npm test` includes a regression test for the bug that previously imported May 28/29/30 Flashscore recent maps with `slate_date = NULL`.

FanDuel event-page lines:
- The slate file must include per-match FanDuel event URLs when available, then each event page must be opened before match start to expand the primary `Moneyline`, `Game Handicap`, and `Total Match Games` sections.
- Store those pulls in `data-private/reference/tennis/fanduel-lines-YYYY-MM-DD.json` as `markets.moneyline`, `markets.gameHandicap`, and `markets.totalGames`. Example: `gameHandicap` rows carry `{ "player": "Naomi Osaka", "spread": -0.5, "odds": -118 }`; `totalGames` rows carry `{ "side": "Over", "line": 22.5, "odds": -106 }`.
- If FanDuel marks the event ended, removes a market, or blocks the page, record that reason for the match instead of silently leaving spread/total empty. ML/spread/O-U EV should not be trusted until coverage is checked.

Ranking notes:
- `data-private/reference/tennis/player-rankings.json` is the current join file for predictions and opponent-quality enrichment.
- `data-private/reference/tennis/player-rankings-history/YYYY-MM-DD.json` is the dated snapshot archive.
- `tennis_rankings` stores one row per player/tour/date, including rank, points, age, country, source, and raw JSON. Use that table for historical rank charts.
- The ranking fetcher tries Live Tennis live ranking pages first for live rank, age, country, and points, while preserving ESPN as the fallback/source of record when Live Tennis is blocked by a browser challenge.
- If Live Tennis is blocked, open the ATP/WTA pages in Chrome, capture the page snapshots under `data-private/reference/tennis/live-tennis-browser-snapshots/`, then rerun with `--live-snapshot-atp PATH --live-snapshot-wta PATH`.

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

### MLB Postgame Close

```bash
npm run data:close:mlb-day -- --date YYYY-MM-DD
```

This postgame command:
- re-ingests the finished MLB day
- refreshes story signals and hidden-edge profiles
- refreshes rolling team/hitter state snapshots
- grades HR and tracked non-HR props
- exports history and published API data
- reruns the hidden-edge haircut research grid
- reruns the stateful snapback haircut grid
- reruns the offline first-five state-model report
- reruns the market-divergence / price-aware research report

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
