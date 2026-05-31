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

- No M0 run manifest exists yet.
- No M0 snapshot verifier exists yet.
- The source inventory is still provisional.
