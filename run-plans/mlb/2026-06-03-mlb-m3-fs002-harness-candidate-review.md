# MLB-M3 FS-002 Harness And Candidate Review

Date: 2026-06-03

Manifest: `data-private/models/mlb-m3/runs/mlb_m3_alpha2_infra_fs002_20260603T155600Z/manifest.json`

Harness output:

```text
data-private/models/mlb-m3/runs/mlb_m3_alpha2_infra_fs002_20260603T155600Z/training_harness/
```

Status: first FS-002 harness run complete; candidate models not promoted

## What Ran

The alpha-3 harness consumed the FS-002 manifest, validated it, loaded the FS-002 feature matrix, created the chronological split, wrote metrics-only lane reports, and fit two diagnostic NumPy ridge candidates:

- `full_game_total_ridge_numpy_v0`
- `f5_total_ridge_numpy_v0`

The candidates are behind the `team_run_distribution` component family and are explicitly marked `candidate_diagnostic_not_promoted`.

## Split

| Split | Range | Rows |
| --- | --- | ---: |
| Train candidate | 2026-03-26 through 2026-05-15 | 668 |
| Validation candidate | 2026-05-16 through 2026-05-31 | 218 |

This is still a harness split, not a final walk-forward backtest.

## Metrics

| Lane | Model | Validation Rows | MAE | RMSE | Mean Error |
| --- | --- | ---: | ---: | ---: | ---: |
| `full_game_total` | train mean baseline | 218 | 3.5878 | 4.5033 | -0.0938 |
| `full_game_total` | ridge diagnostic | 218 | 4.7187 | 6.1086 | -0.1895 |
| `f5_total` | train mean baseline | 218 | 2.6605 | 3.3686 | -0.1487 |
| `f5_total` | ridge diagnostic | 218 | 3.2909 | 4.2030 | -0.9832 |

The diagnostic ridge candidates are worse than the simple baselines on this split. They should not be promoted.

## Feature Use

Each diagnostic ridge candidate used 262 numeric feature columns from FS-002.

Top absolute coefficients were recorded only for inspection. They are not feature promotion decisions and not edge claims.

## Validation

`python3 -m pipeline.mlb.m3.harness.validate_alpha3_harness --harness-dir data-private/models/mlb-m3/runs/mlb_m3_alpha2_infra_fs002_20260603T155600Z/training_harness --json`

Result:

- 7 checks passed
- 0 errors
- 0 warnings
- 11 JSON files validated
- 2 candidate model files found
- candidate models are not promoted

## Scope Review

The run contains:

- metrics-only lane reports
- target and split summaries
- calibration placeholder
- dashboard state
- typed registry preview
- diagnostic candidate model summaries

The run does not contain:

- picks
- selection rows
- player prop pricing
- market fair probability claims
- simulator event logs
- promotion decisions
- a claim that M3 is better than M2

## Interpretation

This is a successful pipeline run and an unsuccessful candidate model.

That is the right outcome to record. M3 now has the machinery to produce a model candidate and reject it honestly. The next work should improve feature quality, reduce leakage/sparsity risk, add walk-forward folds, and only then test stronger candidate components.
