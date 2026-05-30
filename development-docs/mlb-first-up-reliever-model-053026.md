# MLB First-Up Reliever Model — May 30, 2026

This is `E29`, the first rebuilt first-up reliever model using:

- bullpen shape state
- starter exit probabilities
- reliever rest / role / availability

Samples:

- candidate rows: `12506`
- team-side games: `1301`
- train candidate rows: `9853`
- test candidate rows: `2653`
- test team-side games: `272`

## Baseline vs Augmented Ranking

| Model | Exact 1st | Top-2 | Top-3 |
| --- | --- | --- | --- |
| `current likelihood stack` | 18.0% | 30.1% | 41.2% |
| `shape + starter exit + usage` | 18.4% | 37.5% | 52.6% |

## Workload Buckets: Baseline

| Actual first-up workload | Samples | Exact 1st | Top-2 |
| --- | --- | --- | --- |
| 1-3 outs | 161 | 23.6% | 34.2% |
| 4-5 outs | 49 | 12.2% | 30.6% |
| 6+ outs | 62 | 8.1% | 19.4% |

## Workload Buckets: Augmented

| Actual first-up workload | Samples | Exact 1st | Top-2 |
| --- | --- | --- | --- |
| 1-3 outs | 161 | 20.5% | 37.9% |
| 4-5 outs | 49 | 16.3% | 40.8% |
| 6+ outs | 62 | 14.5% | 33.9% |

## Top Augmented Features

- `first_reliever_likelihood` `0.062`
- `avg_pitches_per_appearance` `0.056`
- `availability_score` `0.049`
- `starter_prob_15` `0.048`
- `fatigue_score` `0.046`
- `starter_prob_12` `0.046`
- `bridge_score` `0.045`
- `starter_prob_21` `0.043`
- `starter_prob_18` `0.043`
- `starter_command_break_index` `0.042`

## Read

- The baseline is the current reliever-usage stack: first-reliever likelihood with availability and bridge score tie-breaks.
- The augmented model tests whether bullpen-shape and starter-exit context improve the exact first-up call.
- The most important thing is not just exact hit rate; it is whether the model gets less blind on the `6+ outs` bulk first-up cases that the old bridge logic missed constantly.
