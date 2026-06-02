# Tennis DB-Derived Public Index Contract

Status: preview contract only; not promoted to API/site outputs.

## Purpose

The public tennis index is the date/model directory that future API and site read paths can use before loading a specific slate export. It replaces broad JSON-folder scanning with one DB-derived index generated from the tennis SQLite warehouse.

## Source Of Truth

- Durable source: `data-private/warehouse/sports/tennis/sql-tennis.db`
- Required tables:
  - `matches`
  - `model_runs`
  - `prediction_rows`
  - `export_manifests`
- Optional context tables:
  - `tournaments`

The exporter must not read or mutate `published-data/`, `web/public/data/`, `web/src/lib/`, or API files.

## Preview Output

Preview output is ignored by git:

```text
data-migration/export-previews/tennis/index/index.json
```

The payload must include:

```json
{
  "id": "tennis-public-index-preview",
  "sport": "tennis",
  "generatedAt": "ISO timestamp",
  "sourceDb": "data-private/warehouse/sports/tennis/sql-tennis.db",
  "summary": {
    "dateCount": 0,
    "matchCount": 0,
    "modelRunCount": 0,
    "predictionRowCount": 0
  },
  "dates": [
    {
      "date": "YYYY-MM-DD",
      "label": "June 2, 2026",
      "matchCount": 0,
      "statusCounts": {},
      "tours": [],
      "surfaces": [],
      "models": [
        {
          "modelRunId": "run id",
          "modelId": "model id",
          "modelVersion": "version",
          "runType": "prediction/backtest/etc",
          "status": "status",
          "predictionRows": 0,
          "lanes": []
        }
      ],
      "exports": []
    }
  ],
  "models": []
}
```

## Export Manifest Contract

The exporter writes one `export_manifests` row:

- `sport`: `tennis`
- `export_type`: `tennis_public_index_preview`
- `export_date`: `all`
- `model_id`: `all`
- `output_path`: relative path to `index.json`
- `row_count`: number of indexed dates

The exporter is idempotent for the same output path: replace the old manifest row for the same `(sport, export_type, export_date, model_id, output_path)` before inserting the new one.

## Validation

The validator must prove:

- `summary.dateCount` equals distinct `matches.match_date`.
- `summary.matchCount` equals total `matches` rows.
- `summary.modelRunCount` equals total `model_runs` rows.
- `summary.predictionRowCount` equals total `prediction_rows` rows.
- Date entries are unique and match DB dates.
- The matching `export_manifests` row exists and has the same output hash and date count.

## Promotion Rule

Promotion to a real public/API read path is a separate step. It requires:

1. Running this index preview contract.
2. Running one or more date-specific slate preview contracts.
3. Validating both preview layers.
4. Updating the API/site loader contract explicitly.

