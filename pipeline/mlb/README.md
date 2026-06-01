# MLB Pipeline

This folder owns MLB data plumbing plus temporary compatibility launchers.

Model logic belongs in `models/mlb/cartridges/`.

## Subfolders

- `workflows/`: Compatibility launchers that dispatch through the active MLB cartridge wrapper.
- `fetchers/`: Source pulls and external data ingestion helpers.
- `warehouse/`: MLB warehouse commands, migrations, and table-build utilities.
- `publish/`: Compatibility launchers that dispatch through active MLB cartridge lanes.
- `research/`: Offline research scripts that are not yet cartridge-owned.

See `cartridge_migration/mlb_pipeline_ownership_audit.md` before moving anything out of this folder.
