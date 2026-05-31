# MLB Pipeline

This folder owns MLB workflow and data plumbing.

Model logic belongs in `models/mlb/cartridges/`.

## Subfolders

- `workflows/`: Daily pregame, refresh, follow-up, verification, and orchestration scripts.
- `fetchers/`: Source pulls and external data ingestion helpers.
- `warehouse/`: MLB warehouse commands, migrations, and table-build utilities.
- `publish/`: Public artifact exporters and deploy-facing transforms.
- `research/`: Offline research scripts that are not yet cartridge-owned.

Prefer wrappers during migration so old package commands and automation entrypoints keep working.
