# Tennis Publish

Tennis public artifact exporters live here after migration.

## Files

- `generate-day-module.mjs`: Builds the web day module and tennis prediction snapshot.
- `generate-clay-context.mjs`: Builds clay/recent-context artifacts.
- `enrich-opponent-quality.mjs`: Adds opponent-rank and Flashscore recent-match quality context.
- `export_sofascore_replays.py`: Publishes SofaScore replay artifacts.
- `export_warehouse_context.py`: Publishes warehouse context for the site.
- `scripts/export-tennis-published-slate.mjs`: Copies the generated tennis day module into `published-data/slates/YYYY-MM-DD`, including per-game JSON files consumed by warehouse import and deploy.

Legacy wrappers remain at the old top-level `pipeline/*tennis*` publish paths while references migrate.
