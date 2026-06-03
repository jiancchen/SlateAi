# MLB-M3 Alpha-6 FS-004 Harness Review

Date: 2026-06-03

Run ID: `mlb_m3_alpha2_infra_fs004_20260603T174500Z`

Harness:

```text
data-private/models/mlb-m3/runs/mlb_m3_alpha2_infra_fs004_20260603T174500Z/training_harness_alpha6
```

Status: accepted as metrics-only diagnostic run; no model promotion.

## Summary

FS-004 materially improves the diagnostic candidate compared with FS-003, but it still does not beat the mean baseline in walk-forward validation. That means the architecture/feature representation moved in the right direction, while M3 is still not ready for picks, pricing, simulator output, or edge claims.

## Walk-Forward Comparison

| Feature Set | Fold | Lane | Baseline MAE | Candidate MAE | Delta | Features |
| --- | --- | --- | ---: | ---: | ---: | ---: |
| FS-003 | `2026-05-01` to `2026-05-15` | `f5_total` | 2.4163 | 2.9071 | +0.4908 | 251 |
| FS-003 | `2026-05-01` to `2026-05-15` | `full_game_total` | 3.4887 | 4.4663 | +0.9777 | 251 |
| FS-003 | `2026-05-16` to `2026-05-31` | `f5_total` | 2.6605 | 3.2909 | +0.6304 | 251 |
| FS-003 | `2026-05-16` to `2026-05-31` | `full_game_total` | 3.5878 | 4.7187 | +1.1309 | 251 |
| FS-004 | `2026-05-01` to `2026-05-15` | `f5_total` | 2.4163 | 2.5536 | +0.1373 | 114 |
| FS-004 | `2026-05-01` to `2026-05-15` | `full_game_total` | 3.4887 | 3.6741 | +0.1854 | 114 |
| FS-004 | `2026-05-16` to `2026-05-31` | `f5_total` | 2.6605 | 2.8113 | +0.1508 | 114 |
| FS-004 | `2026-05-16` to `2026-05-31` | `full_game_total` | 3.5878 | 3.6560 | +0.0682 | 114 |

## Interpretation

FS-004 is a better substrate than FS-003 for the current diagnostic learner because the candidate gap shrank sharply in every fold.

FS-004 is still not predictive enough to promote because every candidate MAE remains above the baseline MAE.

The correct next move is feature-family iteration and calibration design, not stronger model tuning on this same artifact.

## Verification

Commands run:

```bash
PYTHONDONTWRITEBYTECODE=1 python3 -m pipeline.mlb.m3.runs.create_alpha2_manifest --feature-report data-migration/reports/m3_fs_004_state_path_redesign_v0_2026-03-26_to_2026-05-31.json --run-id mlb_m3_alpha2_infra_fs004_20260603T174500Z
PYTHONDONTWRITEBYTECODE=1 python3 -m pipeline.mlb.m3.runs.validate_alpha2_manifest --manifest data-private/models/mlb-m3/runs/mlb_m3_alpha2_infra_fs004_20260603T174500Z/manifest.json --json
PYTHONDONTWRITEBYTECODE=1 python3 -m pipeline.mlb.m3.audit.audit_feature_artifact --manifest data-private/models/mlb-m3/runs/mlb_m3_alpha2_infra_fs004_20260603T174500Z/manifest.json --output-subdir feature_audit_alpha6
PYTHONDONTWRITEBYTECODE=1 python3 -m pipeline.mlb.m3.harness.run_alpha3_harness --manifest data-private/models/mlb-m3/runs/mlb_m3_alpha2_infra_fs004_20260603T174500Z/manifest.json --output-subdir training_harness_alpha6 --candidate-model --walk-forward --family-ablations
PYTHONDONTWRITEBYTECODE=1 python3 -m pipeline.mlb.m3.harness.validate_alpha3_harness --harness-dir data-private/models/mlb-m3/runs/mlb_m3_alpha2_infra_fs004_20260603T174500Z/training_harness_alpha6 --json
```

## Non-Goals Preserved

- no picks
- no selection rows
- no player prop pricing
- no market fair probability claims
- no simulator event logs
- no promotion decisions
- no claim that M3 is better

