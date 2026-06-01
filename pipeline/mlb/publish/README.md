# MLB Publish

MLB public artifact exporter compatibility launchers live here after migration.

The canonical lane implementations live in active MLB model cartridges under `models/mlb/cartridges/`.
These files preserve older direct `pipeline/mlb/publish/*` calls by dispatching through `models/mlb/run-cartridge.mjs`.
