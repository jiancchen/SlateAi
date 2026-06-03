# MLB-M3 FS-004 Tail/Regime Calibration Audit

Run ID: `mlb_m3_alpha2_infra_fs004_20260603T174500Z`

Status: `tail_regime_audit_created`

## Gate Summary

- Promotion gate: `blocked_for_promotion`
- Tail targets present: `True`
- Row-level predictions exist: `True`
- Probability outputs exist: `False`
- Calibration bins exist: `True`
- Candidate beats baseline in all comparable folds: `False`

Blocking reasons:

- No probability/distribution output artifact exists.
- Diagnostic candidate does not beat baseline across comparable walk-forward folds.

## Walk-Forward Gate

| Fold | Lane | Baseline MAE | Candidate MAE | Delta | Verdict |
| --- | --- | ---: | ---: | ---: | --- |
| `wf_2026_05_01_to_2026_05_15` | `f5_total` | 2.4163 | 2.5536 | +0.1373 | `candidate_worse_than_baseline` |
| `wf_2026_05_01_to_2026_05_15` | `full_game_total` | 3.4887 | 3.6741 | +0.1854 | `candidate_worse_than_baseline` |
| `wf_2026_05_16_to_2026_05_31` | `f5_total` | 2.6605 | 2.8113 | +0.1508 | `candidate_worse_than_baseline` |
| `wf_2026_05_16_to_2026_05_31` | `full_game_total` | 3.5878 | 3.6560 | +0.0682 | `candidate_worse_than_baseline` |

## Worst Baseline Tail Slices

These are mean-baseline validation slices, not candidate calibration.

### `f5_total`

| Slice | Rows | MAE | Mean Error |
| --- | ---: | ---: | ---: |
| `target_f5_bucket:chaos` | 43 | 5.3351 | -5.3351 |
| `target_total_bucket:chaos` | 47 | 4.2637 | -3.2960 |
| `target_chaos_game_flag:1` | 50 | 4.0654 | -3.0457 |
| `target_home_starter_cracked_flag:1` | 26 | 3.9332 | -3.5873 |
| `target_f5_bucket:low` | 54 | 3.6150 | +3.6150 |
| `any_starter_cracked:1` | 57 | 3.6125 | -3.4240 |
| `target_away_starter_cracked_flag:1` | 34 | 3.4419 | -3.3905 |
| `target_total_bucket:low` | 55 | 2.8470 | +2.8379 |

### `full_game_total`

| Slice | Rows | MAE | Mean Error |
| --- | ---: | ---: | ---: |
| `target_total_bucket:chaos` | 47 | 6.5518 | -6.5518 |
| `target_chaos_game_flag:1` | 50 | 6.3101 | -6.3101 |
| `target_f5_bucket:chaos` | 43 | 5.3297 | -5.3297 |
| `target_total_bucket:low` | 55 | 5.1917 | +5.1917 |
| `target_f5_bucket:low` | 54 | 4.5884 | +3.4951 |
| `target_home_starter_cracked_flag:1` | 26 | 4.5254 | -3.1517 |
| `any_starter_cracked:1` | 57 | 4.4785 | -3.4708 |
| `target_away_starter_cracked_flag:1` | 34 | 4.2883 | -3.5431 |

## Worst Candidate Residual Slices

These come from row-level diagnostic prediction artifacts. They are not probability calibration bins.

| Split | Fold | Lane | Slice | Rows | Candidate MAE | Baseline MAE | Delta |
| --- | --- | --- | --- | ---: | ---: | ---: | ---: |
| `manifest_validation` | `manifest_validation` | `full_game_total` | `target_total_bucket:chaos` | 47 | 5.8312 | 6.5518 | -0.7206 |
| `walk_forward_validation` | `wf_2026_05_16_to_2026_05_31` | `full_game_total` | `target_total_bucket:chaos` | 47 | 5.8312 | 6.5518 | -0.7206 |
| `manifest_validation` | `manifest_validation` | `full_game_total` | `target_chaos_game_flag:1` | 50 | 5.6926 | 6.3101 | -0.6175 |
| `walk_forward_validation` | `wf_2026_05_16_to_2026_05_31` | `full_game_total` | `target_chaos_game_flag:1` | 50 | 5.6926 | 6.3101 | -0.6175 |
| `manifest_validation` | `manifest_validation` | `f5_total` | `target_f5_bucket:chaos` | 43 | 5.5744 | 5.3351 | +0.2394 |
| `walk_forward_validation` | `wf_2026_05_16_to_2026_05_31` | `f5_total` | `target_f5_bucket:chaos` | 43 | 5.5744 | 5.3351 | +0.2394 |
| `walk_forward_validation` | `wf_2026_05_01_to_2026_05_15` | `full_game_total` | `target_total_bucket:chaos` | 37 | 5.3525 | 5.9387 | -0.5862 |
| `walk_forward_validation` | `wf_2026_05_01_to_2026_05_15` | `full_game_total` | `target_chaos_game_flag:1` | 38 | 5.2273 | 5.8342 | -0.6069 |
| `manifest_validation` | `manifest_validation` | `full_game_total` | `target_f5_bucket:chaos` | 43 | 5.2185 | 5.3297 | -0.1112 |
| `walk_forward_validation` | `wf_2026_05_16_to_2026_05_31` | `full_game_total` | `target_f5_bucket:chaos` | 43 | 5.2185 | 5.3297 | -0.1112 |

## Residual Calibration Bins

These are prediction-quantile residual bins for point predictions. They are not probability calibration bins.

| Split | Lane | Bin | Rows | Prediction Mean | Actual Mean | Candidate MAE | Baseline MAE | Delta |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `manifest_validation` | `f5_total` | 1 | 43 | 3.1148 | 5.0000 | 3.0473 | 2.7296 | +0.3177 |
| `manifest_validation` | `f5_total` | 2 | 44 | 4.1630 | 5.0000 | 2.7065 | 2.6818 | +0.0247 |
| `manifest_validation` | `f5_total` | 3 | 43 | 4.7276 | 5.3256 | 2.6802 | 2.6599 | +0.0202 |
| `manifest_validation` | `f5_total` | 4 | 44 | 5.2657 | 5.2273 | 2.7918 | 2.7216 | +0.0702 |
| `manifest_validation` | `f5_total` | 5 | 44 | 6.2494 | 4.5682 | 2.8331 | 2.5113 | +0.3218 |
| `manifest_validation` | `full_game_total` | 1 | 43 | 5.9216 | 7.7209 | 3.4157 | 3.4895 | -0.0738 |
| `manifest_validation` | `full_game_total` | 2 | 44 | 7.7414 | 7.6591 | 2.6962 | 2.8886 | -0.1924 |
| `manifest_validation` | `full_game_total` | 3 | 43 | 8.6468 | 9.2093 | 3.4461 | 3.4319 | +0.0142 |
| `manifest_validation` | `full_game_total` | 4 | 44 | 9.4642 | 10.0909 | 4.2689 | 4.3159 | -0.0471 |
| `manifest_validation` | `full_game_total` | 5 | 44 | 11.9910 | 9.8182 | 4.4431 | 3.8073 | +0.6358 |

## Next Actions

- Review residual calibration bins and candidate residual slice summaries.
- Add distribution/probability outputs before using the word calibration literally.
- Promote tail/regime labels into rejection gates for any future component candidate.
- Keep this metrics-only; no picks, prices, simulator logs, or edge claims.
