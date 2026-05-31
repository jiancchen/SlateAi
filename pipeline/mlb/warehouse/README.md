# MLB Warehouse

MLB warehouse commands, migrations, table derivations, and warehouse-only helpers live here after migration.

- `mlb_warehouse.py`: primary MLB ingest, derive, import, grade, and list CLI.
- `mlb_side_backtest.py`: side-prediction import, grading, and reporting CLI.
- `export_story_archive.py`: story-signal web module export.

Do not move code here without updating package scripts and import paths in the same change.
