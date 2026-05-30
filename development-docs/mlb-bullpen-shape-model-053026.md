# MLB Bullpen Shape Model — May 30, 2026

This is `E28`, the first pass at predicting bullpen game shape using the new starter-exit outputs from `E27`.

Goal:

- use pregame team bullpen history plus starter-exit probabilities to predict:
  - `2-man containment`
  - normal `3-arm bridge`
  - `4+ arm scramble`
  - `bulk first-up risk`

Samples:

- team-side bullpen games: `1324`
- train rows: `1045`
- test rows: `279`
- bulk first-up rate: `21.6%`

## Actual Shape Distribution

| Shape | Team-games | Share |
| --- | --- | --- |
| containment2 | 369 | 27.9% |
| bridge3 | 458 | 34.6% |
| scramble4 | 497 | 37.5% |

## Multiclass Shape Accuracy

| Model | Baseline acc | Test acc |
| --- | --- | --- |
| `bullpen history only` | 38.7% | 36.2% |
| `history + starter exit` | 38.7% | 40.5% |

## Bulk First-Up Risk

| Model | Baseline acc | Test acc | Brier |
| --- | --- | --- | --- |
| `bullpen history only` | 77.8% | 76.3% | 0.182 |
| `history + starter exit` | 77.8% | 79.2% | 0.171 |

## Top Features: Multiclass Shape

- `history only`: `first_reliever_outs_volatility_last10` `0.088`, `bullpen_shape_index` `0.073`, `total_relief_outs_avg_last10` `0.073`, `total_relief_runs_allowed_avg_last10` `0.071`, `total_relief_outs_avg_last5` `0.066`, `first_reliever_outs_avg_last10` `0.064`, `total_relief_runs_allowed_avg_last5` `0.062`, `first_reliever_outs_avg_last5` `0.055`
- `history + starter exit`: `starter_prob_21` `0.144`, `starter_prob_18` `0.119`, `starter_prob_15` `0.067`, `starter_prob_12` `0.052`, `first_reliever_outs_volatility_last10` `0.049`, `starter_leash_score` `0.048`, `starter_command_break_index` `0.042`, `total_relief_runs_allowed_avg_last10` `0.036`

## Top Features: Bulk First-Up

- `history only`: `first_reliever_outs_volatility_last10` `0.082`, `total_relief_outs_avg_last10` `0.076`, `total_relief_outs_avg_last5` `0.075`, `first_reliever_outs_avg_last10` `0.075`, `total_relief_runs_allowed_avg_last10` `0.071`, `bullpen_shape_index` `0.071`, `first_reliever_outs_avg_last5` `0.063`, `total_relief_runs_allowed_avg_last5` `0.057`
- `history + starter exit`: `starter_prob_15` `0.126`, `starter_prob_12` `0.108`, `starter_prob_18` `0.061`, `starter_command_break_index` `0.051`, `starter_prob_21` `0.048`, `first_reliever_outs_volatility_last10` `0.045`, `starter_leash_score` `0.044`, `first_reliever_outs_avg_last10` `0.042`

## Research-Only Heuristic Lanes

| Gate | Samples | Containment | Scramble | Bulk first-up |
| --- | --- | --- | --- | --- |
| `containment lane` | 150 | 41.3% | 20.7% | 11.3% |
| `scramble lane` | 282 | 17.7% | 53.9% | 31.9% |
| `bulk first-up lane` | 194 | 24.2% | 47.4% | 39.7% |
| `quiet deep starter lane` | 148 | 52.0% | 15.5% | 12.2% |

## Read

- The bullpen-history layer already has real value because teams repeat shape habits.
- The key `E28` question is whether starter-exit probabilities help on top of that.
- If `history + starter exit` beats `history only`, that means the upstream hook model is good enough to become the root node for bullpen prediction instead of just another side stat.

## Immediate next step

- if the additive lift is real, export a compact `starter exit risk` block into the MLB game payload
- then rebuild the first-up reliever model using:
  - bullpen shape state
  - starter exit probabilities
  - reliever usage / rest / role features
