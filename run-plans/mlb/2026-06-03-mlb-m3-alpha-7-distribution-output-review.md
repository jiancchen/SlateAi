# MLB-M3 Alpha-7 Distribution Output Review

Date: 2026-06-03

Phase ID: `mlb-m3-alpha-7-distribution-output`

Status: accepted as metrics-only distribution feedback; no model promotion.

## Reviewed Artifacts

Harness:

```text
data-private/models/mlb-m3/runs/mlb_m3_alpha2_infra_fs004_20260603T174500Z/training_harness_alpha7_distribution_outputs
```

Tail audit:

```text
data-private/models/mlb-m3/runs/mlb_m3_alpha2_infra_fs004_20260603T174500Z/tail_calibration_alpha7_distribution_outputs
```

Code:

- `pipeline/mlb/m3/harness/run_alpha3_harness.py`
- `pipeline/mlb/m3/harness/validate_alpha3_harness.py`
- `pipeline/mlb/m3/audit/audit_fs004_tail_calibration.py`

## What Changed

Alpha-7 adds `fold_train_residual_quantile_v0` distribution outputs to the existing FS-004 diagnostic harness.

The distribution layer:

- fits residual quantiles on the training side of each fold
- writes validation-side interval rows
- reports 50%, 80%, and 90% interval coverage
- keeps row outputs explicitly marked as not picks, not prices, not market probabilities, and not promotion decisions

It does not create betting fair probabilities, prop prices, simulator logs, selection rows, or model promotion decisions.

## Gate Result

| Gate | Result |
| --- | --- |
| Tail/regime targets present | pass |
| Row-level validation predictions exist | pass |
| Probability or distribution outputs exist | pass |
| Market probability outputs exist | fail, intentionally not in Alpha-7 |
| Distribution outputs exist | pass |
| Residual calibration bins exist | pass |
| Candidate beats baseline in all comparable folds | fail |
| Promotion | blocked |

The only current promotion blocker is:

```text
Diagnostic candidate does not beat baseline across comparable walk-forward folds.
```

## Distribution Coverage

The first diagnostic intervals under-cover validation outcomes. That is useful feedback, not a success claim.

| Split | Fold | Lane | Rows | 50% Hit | 80% Hit | 90% Hit |
| --- | --- | --- | ---: | ---: | ---: | ---: |
| `manifest_validation` | `manifest_validation` | `f5_total` | 218 | 0.385 | 0.725 | 0.817 |
| `manifest_validation` | `manifest_validation` | `full_game_total` | 218 | 0.440 | 0.725 | 0.849 |
| `walk_forward_validation` | `wf_2026_05_01_to_2026_05_15` | `f5_total` | 201 | 0.393 | 0.736 | 0.826 |
| `walk_forward_validation` | `wf_2026_05_01_to_2026_05_15` | `full_game_total` | 201 | 0.418 | 0.701 | 0.841 |
| `walk_forward_validation` | `wf_2026_05_16_to_2026_05_31` | `f5_total` | 218 | 0.385 | 0.725 | 0.817 |
| `walk_forward_validation` | `wf_2026_05_16_to_2026_05_31` | `full_game_total` | 218 | 0.440 | 0.725 | 0.849 |

Read: the current residual-quantile layer is too narrow, especially for 80% and 90% coverage. That supports the architecture direction: M3 needs regime-conditioned distributions instead of one smooth residual shell around a point estimate.

## Walk-Forward Candidate Gate

The diagnostic ridge candidate remains worse than the train-mean baseline in every comparable walk-forward lane fold.

| Fold | Lane | Baseline MAE | Candidate MAE | Delta |
| --- | --- | ---: | ---: | ---: |
| `wf_2026_05_01_to_2026_05_15` | `f5_total` | 2.4163 | 2.5536 | +0.1373 |
| `wf_2026_05_01_to_2026_05_15` | `full_game_total` | 3.4887 | 3.6741 | +0.1854 |
| `wf_2026_05_16_to_2026_05_31` | `f5_total` | 2.6605 | 2.8113 | +0.1508 |
| `wf_2026_05_16_to_2026_05_31` | `full_game_total` | 3.5878 | 3.6560 | +0.0682 |

Conservative probes of median baselines and shrunken ridge variants improved aggregate MAE, but they did not beat the baseline in every fold. The gate stays blocked.

## Validator Result

Positive validation:

```text
validate_alpha3_harness --json
```

passed with:

- 6 distribution JSONL files
- 1,274 distribution rows
- train-only fit scope
- non-promotion flags
- non-market-probability flags

Negative validation:

A temp-copy distribution file was modified from `manifest_train_rows_only` to `manifest_validation_rows`. The validator rejected it with:

```text
Distribution rows must declare train-only fit scope.
```

## Decision

Alpha-7 is accepted as feedback-loop infrastructure.

It is not accepted as a promoted model, calibrated probability layer, simulator, pricing layer, or edge claim.

## Next

The next real gate is a fast, fold-safe candidate-search harness. It should compare conservative model families and selection policies without validation leakage, then reject or accept candidates against the same walk-forward baseline gate.
