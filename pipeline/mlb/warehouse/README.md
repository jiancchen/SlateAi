# MLB Warehouse

MLB warehouse commands, migrations, table derivations, and warehouse-only helpers live here after migration.

- `mlb_warehouse.py`: legacy MLB ingest, derive, import, grade, and list CLI backed by `data-private/warehouse/sports.db`.
- `mlb_side_backtest.py`: side-prediction import, grading, and reporting CLI.
- `export_story_archive.py`: story-signal web module export.

`mlb_warehouse.py` intentionally remains in place for old M2 workflows, but it is not a canonical M3 ingestion or feature-layer script. Do not path-flip it to `sports/mlb/sql-mlb.db`; replace commands one family at a time with typed ingestors, typed normalizers, or versioned feature-layer jobs.

The M2 commands `derive-state-formula-rows`, `derive-player-identity-rows`, `derive-pitcher-batter-kernel`, and `backtest-m2-research` are feature materialization/research logic. Useful ideas from those commands should be reimplemented later in the M3 feature layer rather than treated as raw-data sanitation.

Do not move code here without updating package scripts and import paths in the same change.
