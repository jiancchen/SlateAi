# MLB-M0 MLB Parent Baseline

MLB-M0 is the parent cartridge baseline for MLB predictions.

This cartridge keeps the current MLB behavior stable while model ownership moves into `models/`. Workflow orchestration, publish lanes, and shared scoring modules are now cartridge-owned; remaining `pipeline/mlb/` files are source fetchers, warehouse commands, compatibility launchers, or offline research.

## Scope

- Full-game side and moneyline reads
- First-five reads
- Totals and run-shape reads
- Props and home-run context where those lanes are part of the daily board
- Market-context and veto layers
- MLB-RP36 relief addendum as an input component

## Migration Rule

Move behavior into this cartridge only with a golden output check or explicit run artifact comparison.

## May 30 Closeout Lesson

- Full-game sides went 6-9.
- First-five sides went 9-6.
- First-inning rows went 9-6.
- HR board went 3/12.
- Tracked props went 33/62, but the top prop cluster was too concentrated in total-bases overs.

The slate punished picks that never scored early enough. The immediate model lesson is not “trust the board more”; it is to promote `dead_early_loss`, quiet-first-three shape, and side-import health checks before any May 31 MLB picks are generated.

Implemented from this lesson:

- `performance_index.json` links the settled May 30 run, side board, results journal, and postmortem artifacts from inside MLB-M0.
- `followups.md` keeps the cartridge-level follow-up rules visible without duplicating the daily postmortem.
- `MLB-M0_log.md` records model/warehouse changes that need backtest proof before they become trusted betting inputs.
- The full-game side layer now treats quiet-start, traffic-without-conversion, and quiet-first-five rates as veto/penalty inputs instead of passive warning text.

## Known Gaps

- MLB-M0 has a file-based run manifest and verifier under `data-private/model-runs/mlb/MLB-M0/`; locked runs are also indexed into shared warehouse tables by `models/shared/model-runs/index_runs.py`.
- Registry-aware lifecycle wrappers live under `models/mlb/`; use `run-cartridge.mjs`, `lock-cartridge.mjs`, `verify-cartridge.mjs`, `compare-cartridges.mjs`, and `scaffold-cartridge.mjs` for future parent-model iteration.
- App-facing MLB adapter resolution lives in `models/mlb/app-model.js`; unregistered future active parent models should fail loudly instead of rendering through MLB-M0 by accident.
- Daily MLB refresh, follow-up, and refresh verification commands now enter through `models/mlb/cartridges/MLB-M0/workflows/` wrappers.
- MLB publish/export commands now run from `models/mlb/cartridges/MLB-M0/lanes/`; old `pipeline/mlb/publish/` paths are compatibility launchers.
- Model-neutral sports plumbing now lives in `models/shared/sports-core/`: odds math, participant construction, signal helpers, generic/UFC/NBA structured context, and the reusable match factory. `models/mlb/cartridges/MLB-M0/lib/sports-model.js` is the MLB adapter that wires those shared contracts into MLB analysis and prop logic. The old frontend path re-exports the app composition shim.
- `components/index.json` declares the active MLB-M0 lanes: sides, first-five, totals, props, home runs, market context, and the consumed MLB-RP36 relief addendum.
- The source inventory is narrowed away from compatibility launchers and frontend shims; it should only grow when the actual cartridge behavior, shared core, warehouse contract, or consumed addendum changes.
- MLB-M0 still depends on pipeline-owned fetcher, warehouse, and research plumbing; model feature generation inside those areas still needs classification before further moves.
