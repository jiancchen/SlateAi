# Tennis Publish

Tennis public artifact exporters live here after migration.

## Files

- `generate-day-module.mjs`: Builds the web day module and tennis prediction snapshot.
- `export_warehouse_context.py`: Publishes TennisLive-only warehouse context for the site.
- `scripts/audit-tennis-active-sources.mjs`: Fails generated/public tennis artifacts if archived legacy source names leak into active predictions.
- `scripts/export-tennis-published-slate.mjs`: Copies the generated tennis day module into `published-data/slates/YYYY-MM-DD`, including per-game JSON files consumed by warehouse import and deploy.

## Active Source Policy

Active tennis prediction artifacts must use TennisLive warehouse rows for player ranks, recent match stats, H2H, and form charts. Sportsbook/market lines may come from DraftKings, FanDuel, and Robinhood.

Archived legacy source commands are intentionally blocked in `package.json`. Historical files and warehouse tables remain for backtests/archive only; they must not feed active export or deploy.

Required publish sequence for a daily tennis slate:

1. `npm run data:export:tennis-warehouse-context -- --date YYYY-MM-DD`
2. `node pipeline/tennis/publish/generate-day-module.mjs --date YYYY-MM-DD`
3. `npm run data:export:tennis-published-slate -- --date YYYY-MM-DD`
4. `npm run data:audit:tennis-active-sources -- --date YYYY-MM-DD`

`data:export:tennis-published-slate` and `publish:site` both run the active-source audit, so deploy should stop before public artifacts are published if an archived source leaks back in.

## Archived Paths

- `generate-clay-context.mjs`
- `enrich-opponent-quality.mjs`
- `export_sofascore_replays.py`

These files remain for history and research reference, but their npm entry points are blocked for active slate work.
