# Relief Addendum

Tracks the consumed relief component boundary for M2.

## Current State

- `MLB-RP36` remains the legacy active relief addendum until replacement gates pass.
- `MLB-RP2` is the replacement candidate and writes `mlb_relief_pitcher_projection_v1_daily`.

## RP2 Contract

RP2 is team-side, not just first-up identity:

- projected relief runs allowed
- projected relief outs
- projected relievers used
- bridge stress
- leverage availability
- first-up lead and top cluster

## Promotion Rule

RP2 can replace RP36 in production only after its backtest report clears:

- at least 300 usable team-side samples
- relief-runs MAE beats rolling team baseline
- first-up top-3 coverage is at least 50%

Until then M2 may consume RP2 as shadow context for downgrades, totals caution, and bullpen-path explanation.
