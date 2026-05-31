# Sports Trading Board Workspace

This repo is now split into a deployable frontend and a private prediction workspace.

## Setup And Recovery

For a full cold-start guide, including how to restore the private SQLite/raw warehouse from Hugging Face, use [SETUP.md](/Users/jcchen/Documents/New%20project/SETUP.md:1).

The private warehouse backup lives in the Hugging Face dataset `javvyai/slate-sports-warehouse`. It is private. Manual backup and restore commands:

```bash
npm run warehouse:sync:hf
npm run warehouse:restore:hf
```

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
- `development-docs/`
  Sport-specific runbooks, research notes, model notes, and postmortems.
- `research/`
  Legacy placeholder only; new sport research belongs under `development-docs/`.

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
- `development-docs/`
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
node pipeline/tennis/publish/enrich-opponent-quality.mjs --input web/src/lib/day-YYYY-MM-DD-tennis-clay-context.generated.json --output web/src/lib/day-YYYY-MM-DD-tennis-opponent-quality.generated.json
npm run data:fetch:tennis-flashscore-recent -- --input web/src/lib/day-YYYY-MM-DD-tennis-opponent-quality.generated.json --map-output data-private/reference/tennis/flashscore-recent-match-map-YYYY-MM-DD.json
node pipeline/tennis/publish/enrich-opponent-quality.mjs --input web/src/lib/day-YYYY-MM-DD-tennis-clay-context.generated.json --output web/src/lib/day-YYYY-MM-DD-tennis-opponent-quality.generated.json --flashscore-recent-map data-private/reference/tennis/flashscore-recent-match-map-YYYY-MM-DD.json
npm run data:import:tennis-slate -- --date YYYY-MM-DD
npm run data:fetch:tennis-sofascore-slate -- --date YYYY-MM-DD
npm run data:import:tennis-sofascore
npm run data:fetch:tennis-weather -- --date YYYY-MM-DD
npm run data:fetch:tennis-flashscore-slate -- --date YYYY-MM-DD
npm run data:import:tennis-flashscore
npm run data:backfill:tennis-recent-form -- --date YYYY-MM-DD
npm run data:export:tennis-warehouse-context -- --date YYYY-MM-DD
# Required operator/browser step before generation:
# With Chrome remote debugging open, scrape FanDuel event pages:
node pipeline/tennis/fetchers/scrape_fanduel_tennis_cdp.mjs --date YYYY-MM-DD
# This stores markets.moneyline, markets.gameHandicap, markets.totalGames,
# markets.firstSetTotalGames, and set-win prices where FanDuel offers them.
# Record unavailable reasons such as ended, not offered, or blocked before generation.
# Required derivative prediction step:
# Build data-private/predictions/tennis/YYYY-MM-DD-derivative-markets.json with
# expectedMatchGames, expectedFirstSetGames, totalGames lean, gameHandicap lean,
# confidence, edgeGames, writeup, evidence, and dataQuality for every singles match.
node pipeline/tennis/publish/generate-day-module.mjs --date YYYY-MM-DD
npm run data:export:published
npm run data:health:tennis -- --date YYYY-MM-DD --pregame
python3 pipeline/tennis/research/multimodel_backtest.py --target-date YYYY-MM-DD
python3 pipeline/tennis/research/analyze_kalshi_intramatch.py --target-date YYYY-MM-DD
python3 pipeline/tennis/research/project_kalshi_trade_candidates.py
python3 pipeline/tennis/research/multimodel_backtest.py --target-date YYYY-MM-DD
python3 pipeline/tennis/research/model_kalshi_spike.py --target-date YYYY-MM-DD
python3 pipeline/tennis/research/model_upset_wins.py --target-date YYYY-MM-DD
```

Daily tennis operating rules live in `development-docs/tennis/runbooks/daily-slate-playbook.md`. Use that playbook before publishing a tennis value board. It requires the slate to separate winner picks, prediction-market trade-to-sell candidates, watch rows, hard vetoes, and data-incomplete rows.

The tennis model pass is intentionally run twice on prediction days: first to refresh the slate training rows for flow/weather context, then again after `pipeline/tennis/research/project_kalshi_trade_candidates.py` mirrors current Kalshi orderbooks into `tennis_prediction_market_snapshots`. Publish from the second pass only.

Tennis health gate:
- `npm run data:health:tennis -- --date YYYY-MM-DD --pregame` must pass before treating a future slate as analysis-ready.
- `npm run data:health:tennis -- --date YYYY-MM-DD --settled` must pass during post-match follow-up before trusting backtests or model-training rows for that day.
- The gate verifies source files, dated ranking snapshots, imported ranking rows, the dated Flashscore recent-match map, recent Flashscore links imported into SQLite under the correct slate date, warehouse recent-form metrics, SofaScore match mappings, Roland Garros weather-window coverage, Kalshi/prediction-market coverage, published match-detail payloads, and the required tennis value books.
- In settled mode, it also requires SofaScore stats/replay rows, Kalshi candles/trade features, completed match results, and model-training labels. If a day has passed and this fails, the warehouse is incomplete.
- Weather must be warehoused through Open-Meteo hourly rows plus `tennis_match_weather` summaries before model training. For settled slates, the summary must cover each Roland Garros match from SofaScore start time through summed set duration; for pre-match slates, it uses the scheduled start plus a conservative match-duration window until actual durations arrive.
- Published tennis detail payloads must have no missing Hold / 2nd / Err / Ret / Close cells in the visible last-five grid.
- Published tennis detail payloads must join derivative market predictions whenever FanDuel totals/spreads were captured; missing expected games, first-set games, O/U lean, or spread lean is a failed pregame pass.
- Every tennis prediction refresh must publish four value books: ML, match O/U games, 1st-set O/U games, and Kalshi trade-to-sell. If there are no validated plays, publish the top confidence-ranked watch/pass rows, capped at 5 when available, instead of leaving the section blank.
- `npm test` includes a regression test for the bug that previously imported May 28/29/30 Flashscore recent maps with `slate_date = NULL`.

FanDuel event-page lines:
- Run `node pipeline/tennis/fetchers/scrape_fanduel_tennis_cdp.mjs --date YYYY-MM-DD` before slate generation. It uses the logged-in/challenge-cleared Chrome profile on port `9222`, maps the FanDuel event URLs, and captures the primary event-page markets.
- Store those pulls in `data-private/reference/tennis/fanduel-lines-YYYY-MM-DD.json` as `markets.moneyline`, `markets.gameHandicap`, `markets.totalGames`, `markets.firstSetTotalGames`, and `markets.winAtLeastOneSet`. Example: `gameHandicap` rows carry `{ "player": "Naomi Osaka", "spread": -0.5, "odds": -118 }`; `totalGames` and `firstSetTotalGames` rows carry `{ "side": "Over", "line": 22.5, "odds": -106 }`.
- If FanDuel marks the event ended, removes a market, or blocks the page, record that reason for the match instead of silently leaving spread/total empty. ML/spread/O-U EV should not be trusted until coverage is checked.

Derivative tennis markets:
- Before publishing, write `data-private/predictions/tennis/YYYY-MM-DD-derivative-markets.json` for every singles match.
- Each row must store `expectedMatchGames`, `expectedFirstSetGames`, `totalGames.postedLine`, `totalGames.lean`, `totalGames.edgeGames`, `gameHandicap.postedSpread`, `gameHandicap.projectedMarginGames`, `firstSet.expectedGames`, confidence, `writeup`, evidence, and data-quality flags.
- The `writeup` block must include a headline, bet plan, why it works, why it fails, and pre-match/live entry-exit rules.
- The match detail page must surface a top betting matrix for ML value, game spread, O/U games, win-a-set probability, and first-set games. ML is not allowed to be the only headline market.
- The match detail page must also surface each player's top pressure stats near the betting matrix: hold %, break points saved %, and break points converted %. If direct hold % is missing, derive a pre-match hold estimate from first-serve-in, first-serve-won, and second-serve-won instead of showing a blank.
- If model ML probability is fair versus implied price, mark ML as no edge and move the actionable read to derivative markets. Example: a 65.8% model against 66% implied is not an ML bet; it may still create a live win-a-set or spread entry.
- If FanDuel captured a total or spread but the generated site row says `No direction` or `No price`, treat that as a failed join/modeling pass, not an acceptable no-play.

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
- `pipeline/mlb/warehouse/mlb_warehouse.py`
  Local SQLite warehouse and ingest pipeline.
- `pipeline/mlb/publish/export-lineup-model.mjs`
  MLB lineup + weather + matchup exporter.
- `pipeline/mlb/publish/export-home-run-predictions.mjs`
  MLB HR board generator.
- `pipeline/mlb/publish/export-side-predictions.mjs`
  Saved MLB side board exporter for grading.
- `pipeline/mlb/publish/export-history-journal.mjs`
  JSONL training ledger export.
- `development-docs/mlb/runbooks/daily-games-external.md`
  Daily source registry and operator shortcuts.
- `development-docs/mlb/runbooks/daily-run-checklist.md`
  Daily MLB operator checklist and refresh verification routine.
- `data-private/README.md`
  Warehouse layout and local data notes.

## Notes

- The current prediction engine is still an operator-assisted system.
- The website renders precomputed outputs; it should not become the home of the private pipeline.
- The new API layer is the first step away from large generated frontend data modules, but the web app is still reading `web/src/lib/day-*.js` directly until the next migration pass.
- The API now prefers `published-data/` JSON snapshots for slates, history, and stories when they exist, and falls back to the current generated modules when they do not.
- Public deploys should carry a two-day window: today in America/Los_Angeles as `/data/current/`, plus tomorrow under `/data/slates/YYYY-MM-DD/` when that slate has been generated.
- What is still intentionally deferred before full rewiring: auth, write endpoints, moving generated day payloads into compact JSON, and a shared type/contract package between `web/` and `api/`.
- If you deploy on Vercel, deploy from `web/`, not the repo root.
- See [web/DEPLOY_VERCEL.md](/Users/jcchen/Documents/New%20project/web/DEPLOY_VERCEL.md:1) for the exact Vercel setup checklist.
