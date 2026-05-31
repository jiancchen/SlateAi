# MLB Total Run Residuals — May 30, 2026

Window audited: `2026-05-12` through `2026-05-29` using stored published MLB slate projections versus settled `mlb_games` totals.

## Residual Summary

| Window | Games | Mean `actual - proj` | Median | Std dev | MAE | RMSE | Underprojected share |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Full sample | 240 | +1.05 | +0.60 | 4.34 | 3.55 | 4.46 | 55.8% |
| Since May 24 | 79 | +1.19 | +0.60 | 4.24 | 3.44 | 4.38 | 59.5% |
| Since May 27 | 36 | +1.07 | +0.65 | 3.96 | 3.16 | 4.05 | 58.3% |

## By Full-Game Lean

| Lean | Games | Mean `actual - proj` | Std dev | MAE |
| --- | --- | --- | --- | --- |
| Over | 45 | +0.28 | 4.71 | 3.70 |
| Under | 133 | +1.61 | 4.22 | 3.63 |
| Pass | 62 | +0.42 | 4.23 | 3.29 |

## Conversion vs Chaos Indicators

| Indicator | Residual corr | Quartile sample | Low quartile avg residual | High quartile avg residual |
| --- | --- | --- | --- | --- |
| Combined conversion index | -0.124 | 61 | +1.35 | +0.44 |
| Combined runs per baserunner | -0.111 | 61 | +1.32 | +0.09 |
| Combined early conversion rate | -0.123 | 61 | +1.59 | +0.82 |
| Combined mistake chaos index | +0.124 | 61 | +0.47 | +1.59 |
| Combined one-bad-inning rate | +0.099 | 84 | +0.17 | +1.11 |
| Combined bullpen meltdown rate | +0.018 | 90 | +0.90 | +1.33 |

## Recent Under-Lean Check Since May 24

| Indicator | Quartile sample | Low quartile avg residual | High quartile avg residual |
| --- | --- | --- | --- |
| Conversion index | 7 | +3.87 | -0.96 |
| Runs per baserunner | 7 | +4.77 | +1.23 |
| Mistake chaos index | 7 | +1.27 | +1.46 |

## Biggest Misses

| Date | Game | Proj | Actual | Residual | Lean | Conv idx | Chaos idx |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 2026-05-18 | Orioles @ Rays | 8.4 | 22.0 | +13.6 | Over | 81.5 | 119.7 |
| 2026-05-15 | Phillies @ Pirates | 7.1 | 20.0 | +12.9 | Under | 92.4 | 106.5 |
| 2026-05-18 | Mets @ Nationals | 10.5 | 23.0 | +12.5 | Over | 99.2 | 139.1 |
| 2026-05-19 | Athletics @ Angels | 7.7 | 20.0 | +12.3 | Under | 18.5 | 124.8 |
| 2026-05-26 | Rockies @ Dodgers | 8.7 | 21.0 | +12.3 | Pass | 45.5 | 117.0 |
| 2026-05-16 | Dodgers @ Angels | 6.2 | 17.0 | +10.8 | Under | 37.0 | 125.5 |
| 2026-05-29 | Marlins @ Mets | 5.2 | 16.0 | +10.8 | Under | 46.4 | 122.0 |
| 2026-05-17 | Cubs @ White Sox | 6.8 | 17.0 | +10.2 | Under | 88.1 | 114.1 |
| 2026-05-26 | Angels @ Tigers | 5.8 | 16.0 | +10.2 | Under | 71.8 | 120.8 |
| 2026-05-27 | Twins @ White Sox | 7.3 | 17.0 | +9.7 | Pass | 59.2 | 122.0 |

## Read

- The totals model has been **biased low** in this stored window: mean residual `+1.05` runs, with residual standard deviation `4.34` runs.
- The bias is **worse on under leans** than on overs. That is the practical reason the board can feel too conservative lately even when the broad totals lane is still the healthiest market.
- `Conversion` did **not** come through as the main rescue signal. Higher combined conversion index and runs-per-baserunner were actually associated with **smaller** positive residuals.
- The stronger positive residual relationship was on **defensive chaos / one-bad-inning** shape, not offensive conversion. That points more toward big-inning and bullpen-instability misses than simple run-conversion misses.
- Practical next totals follow-up: test `mistake chaos` / `one-bad-inning allowed` as an additive over boost or under haircut before trusting conversion as the main patch.
