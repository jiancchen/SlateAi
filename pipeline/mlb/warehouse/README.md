# MLB Warehouse

MLB warehouse commands, migrations, table derivations, and warehouse-only helpers live here after migration.

- `mlb_typed_warehouse.py`: typed MLB warehouse CLI v0.7.0 backed by `data-private/warehouse/sports/mlb/sql-mlb.db`.
- `mlb_warehouse.py`: legacy MLB ingest, derive, import, grade, and list CLI backed by `data-private/warehouse/sports.db`.
- `mlb_side_backtest.py`: side-prediction import, grading, and reporting CLI.
- `export_story_archive.py`: story-signal web module export.

Use `mlb_typed_warehouse.py` for new typed DB replacement commands. Add commands there one ledger row at a time, then move package scripts after the typed command has validation coverage.

Current typed replacement coverage includes schedule/game-feed day/range/replay ingestion, typed day prep, probable-starter reads, hitter Statcast range ingestion, hitter career profile raw fetch plus typed player-context ingestion, lineup-board split/matchup ingestion, and typed results/outcome label refresh.

`mlb_typed_warehouse.py validate-typed-ready` is a non-replacement readiness command. It runs existing typed raw/daily validators and M3 contract validators, writes child JSON reports under `data-migration/reports/`, then writes a compact wrapper report. Use `npm run data:typed:mlb-validate` for broad contract checks and `npm run data:typed:mlb-validate-day -- --date YYYY-MM-DD` for date-bound daily checks.

`mlb_warehouse.py` intentionally remains in place for old M2 workflows, but it is not a canonical M3 ingestion or feature-layer script. Do not path-flip it to `sports/mlb/sql-mlb.db`; replace commands one family at a time with typed ingestors, typed normalizers, or versioned feature-layer jobs.

The M2 commands `derive-state-formula-rows`, `derive-player-identity-rows`, `derive-pitcher-batter-kernel`, and `backtest-m2-research` are feature materialization/research logic. Useful ideas from those commands should be reimplemented later in the M3 feature layer rather than treated as raw-data sanitation.

When an old warehouse script is no longer actively wired, move it under `archive-m2/` instead of leaving it beside active typed scripts. Do not move `mlb_warehouse.py` there until its active package aliases and model/workflow callers have been cut over or retired.

Do not move code here without updating package scripts and import paths in the same change.
