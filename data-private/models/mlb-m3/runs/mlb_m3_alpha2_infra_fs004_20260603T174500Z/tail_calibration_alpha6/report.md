# MLB-M3 FS-004 Tail/Regime Calibration Audit

Run ID: `mlb_m3_alpha2_infra_fs004_20260603T174500Z`

Status: `tail_regime_audit_created`

## Gate Summary

- Promotion gate: `blocked_for_promotion`
- Tail targets present: `True`
- Row-level predictions exist: `False`
- Probability outputs exist: `False`
- Calibration bins exist: `False`
- Candidate beats baseline in all comparable folds: `False`

Blocking reasons:

- No row-level validation prediction or residual artifact exists.
- No probability/distribution output artifact exists.
- No calibration-bin artifact exists.
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

## Next Actions

- Extend the harness to write row-level validation predictions and residuals.
- Add distribution/probability outputs before using the word calibration literally.
- Promote tail/regime labels into rejection gates for any future component candidate.
- Keep this metrics-only; no picks, prices, simulator logs, or edge claims.
