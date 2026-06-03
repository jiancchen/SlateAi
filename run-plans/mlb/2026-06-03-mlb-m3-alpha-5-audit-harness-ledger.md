# MLB-M3 Alpha-5 Feature Audit And Harness Upgrade Ledger

Date: 2026-06-03

Phase ID: `mlb-m3-alpha-5-audit-harness`

Run plan: `run-plans/mlb/2026-06-03-mlb-m3-alpha-5-audit-harness-run-plan.md`

Status: opened

## Decision Ledger

| ID | Decision | Status | Rationale |
| --- | --- | --- | --- |
| A5-D001 | Audit FS-002 before adding more features | locked | The first candidate underperformed; we need feature quality evidence before expanding. |
| A5-D002 | Add walk-forward and family ablation diagnostics before model claims | locked | One split is too weak for MLB variance. |
| A5-D003 | Build FS-003 as a pruned artifact derived from FS-002 | proposed | This lets the harness test cleaner inputs quickly while preserving FS-002 lineage. |
| A5-D004 | Keep candidate models diagnostic and not promoted | locked | There is still no calibration/backtest/promotion gate. |
| A5-D005 | Continue banning picks, prop prices, simulator logs, and edge claims | locked | Alpha-5 is still research/harness work. |

## Work Ledger

| ID | Work Item | Status | Output / Evidence | Notes |
| --- | --- | --- | --- | --- |
| A5-W001 | Create alpha-5 run plan | complete | `2026-06-03-mlb-m3-alpha-5-audit-harness-run-plan.md` | Captures feature audit, FS-003, walk-forward, ablation, and candidate scope. |
| A5-W002 | Create alpha-5 ledger | complete | this file | Opens audit trail. |
| A5-W003 | Implement FS-002 feature audit | complete | `pipeline/mlb/m3/audit/audit_feature_artifact.py` | Reads manifest, matrix, dictionary, and writes dashboard-readable feature-quality/prune artifacts. |
| A5-W004 | Run FS-002 feature audit | complete | `data-private/models/mlb-m3/runs/mlb_m3_alpha2_infra_fs002_20260603T155600Z/feature_audit` | Selected 271 columns for FS-003 and pruned 24 feature columns. |
| A5-W005 | Upgrade harness with walk-forward and family ablations | complete | `training_harness_alpha5/walk_forward.json`, `training_harness_alpha5/family_ablations.json` | Keeps outputs metrics-only and candidate models diagnostic. |
| A5-W006 | Create FS-003 pruned artifact | pending |  | Derived from FS-002 audit recommendations. |
| A5-W007 | Manifest FS-003 | pending |  | Reuse alpha-2 manifest infrastructure. |
| A5-W008 | Run upgraded harness on FS-003 | pending |  | Walk-forward diagnostics and ablations. |
| A5-W009 | Run improved diagnostic candidate if supported | pending |  | Not promoted unless future gates exist. |

## Stop Log

No stops yet.

## Verification Log

- 2026-06-03: `python3 -m py_compile pipeline/mlb/m3/audit/audit_feature_artifact.py` passed with the bundled workspace Python.
- 2026-06-03: FS-002 feature audit generated `feature_audit`, `feature_quality`, `family_summary`, `prune_recommendations`, `fs003_selected_columns`, `artifacts`, and `report` files.
- 2026-06-03: FS-002 audit selected 271 columns for FS-003 and pruned 24 feature columns.
- 2026-06-03: `python3 -m json.tool` passed for all feature-audit JSON outputs.
- 2026-06-03: `python3 -m py_compile pipeline/mlb/m3/harness/run_alpha3_harness.py pipeline/mlb/m3/harness/validate_alpha3_harness.py` passed with the bundled workspace Python.
- 2026-06-03: FS-002 alpha-5 harness run generated `training_harness_alpha5` with walk-forward diagnostics and family ablations.
- 2026-06-03: FS-002 walk-forward diagnostic candidates lost to the mean baseline on both folds for F5 total and full-game total; no model was promoted.
- 2026-06-03: FS-002 family ablations showed the diagnostic ridge improved when excluding some noisy families, especially `starter_path` for both lanes and `reliever_chain` for full-game total.
- 2026-06-03: `python3 -m pipeline.mlb.m3.harness.validate_alpha3_harness --harness-dir data-private/models/mlb-m3/runs/mlb_m3_alpha2_infra_fs002_20260603T155600Z/training_harness_alpha5 --json` passed with 7 checks, 0 errors, and 0 warnings after tightening forbidden-term validation to word-boundary matches.
