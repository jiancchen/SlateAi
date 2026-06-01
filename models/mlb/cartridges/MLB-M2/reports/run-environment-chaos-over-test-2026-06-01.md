# MLB-M2 Run-Environment Chaos Over Test

Range: 2026-05-10 to 2026-05-31; holdout: 2026-05-31.

This test asks whether the May 31 O/U lesson can be learned from prior data as a broader run-environment tail-risk problem rather than as a weather-only rule.

## Dataset

- Train rows before holdout: 180
- Holdout rows: 15
- Train base over rate: 47.2%
- Holdout base over rate: 60.0%
- Old exposed full-game total lane: train 50.7% on 140 rows; holdout 20.0% on 5 rows

## Threshold Sweep

- train 24 rows at 62.5%, holdout 4 rows at 25.0%; params `{'mistake': 58, 'meltdown': 0.18, 'no_conv': 0.24, 'dead_traffic': 0.38, 'chaos': 60, 'tail_count': 4, 'run_cluster': 75, 'one_bad': 0.5, 'bullpen': 50, 'low_conv': 35, 'quiet': 0.63, 'proj_edge_min': 0.0}`
- train 24 rows at 62.5%, holdout 4 rows at 25.0%; params `{'mistake': 58, 'meltdown': 0.18, 'no_conv': 0.24, 'dead_traffic': 0.38, 'chaos': 60, 'tail_count': 4, 'run_cluster': 75, 'one_bad': 0.5, 'bullpen': 55, 'low_conv': 35, 'quiet': 0.63, 'proj_edge_min': 0.0}`
- train 28 rows at 60.7%, holdout 4 rows at 25.0%; params `{'mistake': 58, 'meltdown': 0.18, 'no_conv': 0.24, 'dead_traffic': 0.38, 'chaos': 52, 'tail_count': 4, 'run_cluster': 75, 'one_bad': 0.5, 'bullpen': 50, 'low_conv': 35, 'quiet': 0.63, 'proj_edge_min': 0.0}`
- train 28 rows at 60.7%, holdout 4 rows at 25.0%; params `{'mistake': 58, 'meltdown': 0.18, 'no_conv': 0.24, 'dead_traffic': 0.38, 'chaos': 52, 'tail_count': 4, 'run_cluster': 75, 'one_bad': 0.5, 'bullpen': 55, 'low_conv': 35, 'quiet': 0.63, 'proj_edge_min': 0.0}`
- train 28 rows at 60.7%, holdout 4 rows at 25.0%; params `{'mistake': 58, 'meltdown': 0.18, 'no_conv': 0.24, 'dead_traffic': 0.38, 'chaos': 56, 'tail_count': 4, 'run_cluster': 75, 'one_bad': 0.5, 'bullpen': 50, 'low_conv': 35, 'quiet': 0.63, 'proj_edge_min': 0.0}`

## Mask Comparison

- `existing_weather_carry_chaos`: train 34 rows at 47.1%; holdout 5 rows at 100.0%
- `existing_crooked_or_bullpen_chaos`: train 73 rows at 53.4%; holdout 7 rows at 71.4%
- `train_selected_run_environment_rule`: train 24 rows at 62.5%; holdout 4 rows at 25.0%

## Walk-Forward Random Forest

Aggregate top-5: 25/50 (50.0%)

Aggregate top-3: 16/30 (53.3%)

| Date | Base over | RF top 5 | RF top 3 | Old total lane |
| --- | --- | --- | --- | --- |
| 2026-05-16 | 53.3% | 3/5 (60.0%) | 2/3 (66.7%) | 46.2% on 13 |
| 2026-05-17 | 66.7% | 3/5 (60.0%) | 1/3 (33.3%) | 16.7% on 12 |
| 2026-05-18 | 57.1% | 3/5 (60.0%) | 2/3 (66.7%) | 46.2% on 13 |
| 2026-05-19 | 46.7% | 3/5 (60.0%) | 2/3 (66.7%) | 41.7% on 12 |
| 2026-05-20 | 38.5% | 2/5 (40.0%) | 2/3 (66.7%) | 55.6% on 9 |
| 2026-05-21 | 28.6% | 1/5 (20.0%) | 1/3 (33.3%) | 71.4% on 7 |
| 2026-05-22 | 50.0% | 2/5 (40.0%) | 2/3 (66.7%) | 54.5% on 11 |
| 2026-05-23 | 21.4% | 1/5 (20.0%) | 0/3 (0.0%) | 77.8% on 9 |
| 2026-05-30 | 66.7% | 2/5 (40.0%) | 1/3 (33.3%) | 30.0% on 10 |
| 2026-05-31 | 60.0% | 5/5 (100.0%) | 3/3 (100.0%) | 20.0% on 5 |

## Read

The deterministic train-selected threshold rule did not transfer to May 31. The existing weather-carry mask hit May 31, but its pre-holdout hit rate was near coinflip, so it is not enough to call the mechanism learned.

The RF ranking found a 5/5 May 31 top-5 over board, but walk-forward aggregate was only about coinflip. That means the stored data contains some useful nonlinear signal, yet the current sample is not stable enough to promote RF O/U ranking as a blind betting engine.

Next step: persist a richer `run_environment_tail` table with explicit park, sun-position/visibility, weather, market-total, run-cluster, one-bad-inning, bullpen-meltdown, lineup-conversion, and false-under flags, then train/calibrate that lane separately from side picks.

Important correction: sun-position/visibility is not a weather feature. It needs its own geometry inputs: venue latitude/longitude, field orientation, scheduled first pitch time, local solar azimuth/elevation, cloud cover, roof/shadow state, and likely exposure by defensive zone. Temperature/wind/precip can modify run environment, but they do not explain outfielder glare or field-visibility mistakes by themselves.
