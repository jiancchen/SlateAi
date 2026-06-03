# MLB-M3 Alpha-6 FS-004 Row Prediction Harness Review

Date: 2026-06-03

Run ID: `mlb_m3_alpha2_infra_fs004_20260603T174500Z`

Harness:

```text
data-private/models/mlb-m3/runs/mlb_m3_alpha2_infra_fs004_20260603T174500Z/training_harness_alpha6_row_predictions
```

Tail audit:

```text
data-private/models/mlb-m3/runs/mlb_m3_alpha2_infra_fs004_20260603T174500Z/tail_calibration_alpha6_row_predictions
```

Status: accepted as metrics-only row-level residual infrastructure; no model promotion.

## Summary

The Alpha-3 harness now supports explicit row-level diagnostic prediction output behind `--row-predictions`. For FS-004, the new harness run wrote validation prediction/residual JSONL artifacts for the manifest validation split and both walk-forward folds.

These rows are not picks, prices, probabilities, simulator events, or promotion decisions.

## Row Artifacts

| Artifact | Rows |
| --- | ---: |
| `manifest_validation_f5_total.jsonl` | 218 |
| `manifest_validation_full_game_total.jsonl` | 218 |
| `walk_forward_wf_2026_05_01_to_2026_05_15_f5_total.jsonl` | 201 |
| `walk_forward_wf_2026_05_01_to_2026_05_15_full_game_total.jsonl` | 201 |
| `walk_forward_wf_2026_05_16_to_2026_05_31_f5_total.jsonl` | 218 |
| `walk_forward_wf_2026_05_16_to_2026_05_31_full_game_total.jsonl` | 218 |

Each row contains:

- game/date/team identifiers
- lane, split, fold, target column
- actual target value
- diagnostic candidate prediction
- candidate residual and absolute error
- train-mean baseline prediction
- baseline residual and absolute error
- regime target fields such as total bucket, F5 bucket, chaos flag, bullpen flip flag, starter-crack flags, and traffic-no-conversion flags

## Tail Audit Result

The row-aware tail audit now reports:

| Gate | Result |
| --- | --- |
| Tail/regime targets present | pass |
| Row-level validation predictions exist | pass |
| Probability or distribution outputs exist | fail |
| Calibration bins exist | fail |
| Candidate beats baseline in all comparable folds | fail |

Promotion status remains `blocked_for_promotion`.

## Candidate Residual Signal

Worst candidate residual slices are still tail-heavy:

| Split | Lane | Slice | Rows | Candidate MAE | Baseline MAE | Delta |
| --- | --- | --- | ---: | ---: | ---: | ---: |
| `manifest_validation` | `full_game_total` | `target_total_bucket:chaos` | 47 | 5.8312 | 6.5518 | -0.7206 |
| `manifest_validation` | `full_game_total` | `target_chaos_game_flag:1` | 50 | 5.6926 | 6.3101 | -0.6175 |
| `manifest_validation` | `f5_total` | `target_f5_bucket:chaos` | 43 | 5.5744 | 5.3351 | +0.2394 |

Interpretation: row residuals show FS-004 helps some full-game chaos slices versus baseline, but it still loses overall and does not solve F5 chaos. That is useful feedback, not a promotion.

## Verification

Commands run:

```bash
PYTHONDONTWRITEBYTECODE=1 python3 -m py_compile pipeline/mlb/m3/harness/run_alpha3_harness.py pipeline/mlb/m3/audit/audit_fs004_tail_calibration.py
PYTHONDONTWRITEBYTECODE=1 /Users/jcchen/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -m pipeline.mlb.m3.harness.run_alpha3_harness --manifest data-private/models/mlb-m3/runs/mlb_m3_alpha2_infra_fs004_20260603T174500Z/manifest.json --output-subdir training_harness_alpha6_row_predictions --candidate-model --walk-forward --family-ablations --row-predictions
PYTHONDONTWRITEBYTECODE=1 python3 -m pipeline.mlb.m3.harness.validate_alpha3_harness --harness-dir data-private/models/mlb-m3/runs/mlb_m3_alpha2_infra_fs004_20260603T174500Z/training_harness_alpha6_row_predictions --json
PYTHONDONTWRITEBYTECODE=1 /Users/jcchen/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -m pipeline.mlb.m3.audit.audit_fs004_tail_calibration --manifest data-private/models/mlb-m3/runs/mlb_m3_alpha2_infra_fs004_20260603T174500Z/manifest.json --harness-dir data-private/models/mlb-m3/runs/mlb_m3_alpha2_infra_fs004_20260603T174500Z/training_harness_alpha6_row_predictions --output-subdir tail_calibration_alpha6_row_predictions
```

## Non-Goals Preserved

- no picks
- no selection rows
- no player prop pricing
- no market fair probability claims
- no simulator event logs
- no promotion decisions
- no claim that M3 is better
