# M0 MLB Parent Baseline

M0 is the future parent cartridge for MLB predictions.

This shell does not change model behavior. It records the intended ownership boundary before scripts are moved out of the flat `pipeline/` folder.

## Scope

- Full-game side and moneyline reads
- First-five reads
- Totals and run-shape reads
- Props and home-run context where those lanes are part of the daily board
- Market-context and veto layers
- RP36 relief addendum as an input component

## Migration Rule

Move behavior into this cartridge only with a golden output check or explicit run artifact comparison.

## Known Gaps

- M0 now has a file-based run manifest and verifier under `data-private/model-runs/mlb/M0/`.
- The run manifest is not yet stored in shared model-run DB tables.
- The source inventory is still intentionally broad while the MLB pregame chain is split into components.
