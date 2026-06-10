# Tennis Public Export Contract

## Purpose

This contract covers the DB-derived tennis public export path. It is the migration bridge between `sql-tennis.db` as source of truth and any generated JSON that the site or static deployment can consume later.

This is the RFP Phase 5 contract. In the migration ledger it belongs to the DB-derived export/UI-read promotion track, not the already-completed DuckDB Phase 5.

## Source Of Truth

Durable source:

- `data-private/warehouse/sports/tennis/sql-tennis.db`

Allowed source tables:

- `matches`
- `match_players`
- `players`
- `prediction_rows`
- `model_runs`
- `settlement_rows`
- `legacy_table_rows`
- `export_manifests`
- `health_checks`

Generated source files are not source of truth. `published-data/`, `web/public/data/`, and `web/src/lib/day-*` are export/cache surfaces only.

## Export Command Contract

The export command must be explicit:

```bash
python3 data-migration/scripts/export_tennis_public_from_db.py \
  --date YYYY-MM-DD \
  --model MODEL_ID_OR_latest \
  --out-dir data-migration/export-previews/tennis/YYYY-MM-DD
```

Required behavior:

- Reads only `sql-tennis.db`.
- Exports one date only.
- Resolves one selected model for prediction/value rows.
- Writes a compact `summary.json` and one `games/<match_id>.json` file per match.
- Writes an `export_manifests` row unless run with `--dry-run`.
- Does not read or mutate `published-data/`, `web/public/data/`, or `web/src/lib/`.
- Does not prune unrelated dates.
- Refuses to overwrite an existing export target unless `--force` is passed.

## Output Shape

`summary.json`:

```json
{
  "id": "YYYY-MM-DD",
  "label": "June 2, 2026",
  "status": "ready",
  "exportReadiness": {},
  "slateMeta": {},
  "summary": {
    "totalGames": 0,
    "predictionRows": 0,
    "valueRows": 0
  },
  "filters": ["All", "Tennis"],
  "sources": [],
  "modelRuns": [],
  "tennisValueSummary": {},
  "games": []
}
```

`status` must reflect export readiness. It may be `ready` only when the exporter can prove the selected model/run is publishable. It must be `blocked` when required source freshness is blocked, the selected model is archived/forensic, prediction rows do not resolve to exported DB matches, prediction rows contain market-only inventory, or prediction rows produce no value rows.

Each game row must include:

- `id`
- `title`
- `league`
- `stage`
- `start`
- `startMinutes`
- `participants`
- `analysis`
- `tennisContext`
- `migrationExport`

## Validation Contract

Validation must prove:

- DB match count for the date equals exported game count.
- `games/*.json` count equals exported game count.
- Exported game IDs are unique.
- Exported game IDs match DB `matches.match_id` for the date.
- Selected model prediction count equals exported prediction-row count.
- `summary.json` hash matches the recorded `export_manifests.output_hash`.
- Validation writes a report under `data-migration/reports/`.

## Promotion Rule

This contract is not promoted until a later step deliberately points the API/site/public export command at this DB-derived output path. Preview exports can be validated without promoting the read path.
