# Tennis Pipeline

This folder owns tennis workflow and data plumbing.

Model logic belongs in `models/tennis/cartridges/`.

## Subfolders

- `workflows/`: Daily slate, postmatch, health, and verification orchestration.
- `fetchers/`: ESPN, Flashscore, SofaScore, FanDuel, rankings, weather, and market data pulls.
- `warehouse/`: Tennis warehouse commands, migrations, and import/export helpers.
- `publish/`: Public artifact exporters and deploy-facing transforms.
- `research/`: Offline tennis research scripts that are not yet cartridge-owned.

Use compatibility wrappers while migrating top-level pipeline scripts.
