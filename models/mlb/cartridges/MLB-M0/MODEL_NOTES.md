# MLB-M0 MLB Parent Baseline

MLB-M0 is the future parent cartridge for MLB predictions.

This shell keeps the current MLB behavior stable while model ownership moves into cartridges. It records the intended ownership boundary before scripts are moved out of the delegated `pipeline/mlb/` internals.

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

- MLB-M0 now has a file-based run manifest and verifier under `data-private/model-runs/mlb/MLB-M0/`.
- Daily MLB refresh, follow-up, and refresh verification commands now enter through `models/mlb/cartridges/MLB-M0/workflows/` wrappers.
- MLB publish/export commands now enter through `models/mlb/cartridges/MLB-M0/lanes/` wrappers before delegating to `pipeline/mlb/publish/` internals.
- The shared deterministic scoring module now lives at `models/mlb/cartridges/MLB-M0/lib/sports-model.js`; the old frontend path is a re-export shim.
- The run manifest is not yet stored in shared model-run DB tables.
- The source inventory is still intentionally broad while the MLB pregame chain is split into components.
- MLB-M0 still delegates most prediction behavior to workflow and publish scripts; moving those internals comes after the May 30 golden checks stay green.
