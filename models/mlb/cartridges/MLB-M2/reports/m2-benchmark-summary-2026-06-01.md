# MLB-M2 Benchmark Summary

Date: 2026-06-01

## Current Decision

Keep MLB-M0 active. MLB-M2 remains a draft comparison cartridge.

M2 has useful diagnostics, but the current candidate stack does not beat the locked baseline cleanly enough to promote any lane.

## Baseline To Beat

| Metric | Result |
|---|---:|
| Baseline full-game side | 59.0% on 212 rows |
| M2 category lane | 62.6% on 195 graded lane rows |
| M2 allowed-side bucket | 67.5% on 40 rows |
| Starter-to-bullpen flip as F5 lane | 68.6% on 35 rows |
| Dead-zone timing/F5 lane | 70.6% on 17 rows |
| May 31 O/U stress benchmark | 5/5 |

## Candidate Stack

| Candidate | Holdout Result | Status |
|---|---:|---|
| State formulas | 18/120, 15.0% | Research-only |
| Pitcher-batter kernel top-collapse | 4/6, 66.7% | Candidate pocket |
| Player hits identity | 182/307, 59.3% | Diagnostic |
| Player total-bases identity | 179/307, 58.3% | Diagnostic |

## Warehouse Health

The coverage gate passed for May 31:

- State formula rows: 120.
- Player identity curves: 3,188.
- Player current deviations: 3,188.
- Player game distributions: 3,188.
- Lineup-pitcher matchup rows: 341.
- State formula backtests: 126.
- Player identity backtests: 1,535.

## Promotion Read

- State formulas are not close to promotion.
- Pitcher-batter top-collapse is the most interesting pocket, but sample size is too small.
- Player identity needs stat-target and sample-size buckets before prop influence.
- F5 and O/U value rows remain blocked unless emitted by the cartridge with full value proof.

## Rerun Command

```bash
npm run data:research:mlb-m2-suite -- --start 2026-05-23 --end 2026-05-31 --holdout 2026-05-31 --today 2026-06-01
```
