# MLB Workflows

Daily MLB orchestration scripts live here.

Current migrated workflows:

- `pregame.mjs`
- `refresh-live-board.mjs`
- `followup.mjs`
- `verify-refresh.mjs`

Compatibility wrappers remain at the old top-level pipeline paths while callers migrate. They dispatch through `models/mlb/run-cartridge.mjs`, so active-model resolution stays centralized.
