# MLB-M3 Alpha-6 FS-004 Tail Calibration Review

Date: 2026-06-03

Run ID: `mlb_m3_alpha2_infra_fs004_20260603T174500Z`

Audit:

```text
data-private/models/mlb-m3/runs/mlb_m3_alpha2_infra_fs004_20260603T174500Z/tail_calibration_alpha6
```

Status: accepted as a feedback-loop audit; calibration and promotion remain blocked.

## Summary

FS-004 now has a tail/regime audit connected to the harness output. The audit confirms that the matrix has useful regime targets, but the harness still cannot do real calibration because it does not write row-level candidate predictions, residuals, probability distributions, or calibration bins.

This is not a model promotion. It is an explicit rejection gate and next-step map.

## Gate Result

| Gate | Result |
| --- | --- |
| Tail/regime targets present | pass |
| Row-level validation predictions exist | fail |
| Probability or distribution outputs exist | fail |
| Calibration bins exist | fail |
| Candidate beats baseline in all comparable folds | fail |

Promotion status: `blocked_for_promotion`

Blocking reasons:

- no row-level validation prediction or residual artifact exists
- no probability/distribution output artifact exists
- no calibration-bin artifact exists
- diagnostic candidate does not beat baseline across comparable walk-forward folds

## Walk-Forward Gate

| Fold | Lane | Baseline MAE | Candidate MAE | Delta | Verdict |
| --- | --- | ---: | ---: | ---: | --- |
| `wf_2026_05_01_to_2026_05_15` | `f5_total` | 2.4163 | 2.5536 | +0.1373 | `candidate_worse_than_baseline` |
| `wf_2026_05_01_to_2026_05_15` | `full_game_total` | 3.4887 | 3.6741 | +0.1854 | `candidate_worse_than_baseline` |
| `wf_2026_05_16_to_2026_05_31` | `f5_total` | 2.6605 | 2.8113 | +0.1508 | `candidate_worse_than_baseline` |
| `wf_2026_05_16_to_2026_05_31` | `full_game_total` | 3.5878 | 3.6560 | +0.0682 | `candidate_worse_than_baseline` |

## Tail Finding

The mean baseline breaks hardest on regime tails:

| Lane | Worst Validation Slice | Rows | Baseline MAE | Direction |
| --- | --- | ---: | ---: | --- |
| `f5_total` | `target_f5_bucket:chaos` | 43 | 5.3351 | baseline underpredicts |
| `full_game_total` | `target_total_bucket:chaos` | 47 | 6.5518 | baseline underpredicts |
| `full_game_total` | `target_total_bucket:low` | 55 | 5.1917 | baseline overpredicts |

This is the baseball point the architecture was designed around: a smooth mean target cannot handle chaos/high-run and dead-bat/low-run regimes.

## Family-Ablation Signal

The audit also captured an important warning: the full FS-004 diagnostic candidate is worse than baseline, but individual family-only diagnostics sometimes beat or match baseline.

Notable examples from the manifest validation split:

- `f5_total`, reliever-chain-only: MAE `2.6041`, which is `-0.0564` versus baseline.
- `full_game_total`, story-memory-only: MAE `3.5758`, which is `-0.0120` versus baseline.
- `full_game_total`, reliever-chain-only: MAE `3.5778`, which is `-0.0100` versus baseline.

Interpretation: FS-004 likely contains useful family signals, but the current diagnostic ridge and all-feature blend are too crude/noisy to combine them safely. The next step is not tuning. The next step is row-level residual capture and componentized distribution diagnostics.

## Required Next Step

The next missing infrastructure piece is a harness output upgrade:

- write row-level validation predictions
- write row-level residuals
- write fold/lane/split identifiers for every prediction row
- preserve feature set, model family, and component family lineage
- keep outputs metrics-only and explicitly non-prediction-market

Only after that can M3 compute:

- calibration by regime
- residuals by chaos/high/low bucket
- component error by starter-crack and bullpen-flip state
- promotion/rejection gates grounded in row-level outcomes

## Verification

Commands run:

```bash
PYTHONDONTWRITEBYTECODE=1 python3 -m py_compile pipeline/mlb/m3/audit/audit_fs004_tail_calibration.py
PYTHONDONTWRITEBYTECODE=1 /Users/jcchen/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -m pipeline.mlb.m3.audit.audit_fs004_tail_calibration --manifest data-private/models/mlb-m3/runs/mlb_m3_alpha2_infra_fs004_20260603T174500Z/manifest.json --harness-dir data-private/models/mlb-m3/runs/mlb_m3_alpha2_infra_fs004_20260603T174500Z/training_harness_alpha6 --output-subdir tail_calibration_alpha6
```

## Non-Goals Preserved

- no picks
- no selection rows
- no player prop pricing
- no market fair probability claims
- no simulator event logs
- no promotion decisions
- no claim that M3 is better
