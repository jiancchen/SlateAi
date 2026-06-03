# MLB-M3 Alpha-6 Feature-Family Redesign Ledger

Date: 2026-06-03

Phase ID: `mlb-m3-alpha-6-feature-family-redesign`

Run plan: `run-plans/mlb/2026-06-03-mlb-m3-alpha-6-feature-family-redesign-run-plan.md`

Status: opened

## Decision Ledger

| ID | Decision | Status | Rationale |
| --- | --- | --- | --- |
| A6-D001 | Start Alpha-6 with feature-family redesign, not model tuning | locked | FS-003 pruning did not improve walk-forward MAE; the bottleneck is representation. |
| A6-D002 | Use FS-003 as the clean baseline artifact | locked | FS-003 is the latest audited feature artifact and removes obvious FS-002 hygiene issues. |
| A6-D003 | Keep all Alpha-6 outputs metrics/design-only until FS-004 exists | locked | No promoted models, picks, prices, simulator logs, or edge claims are allowed. |
| A6-D004 | Update the alpha state tracker after each status change | locked | The tracker is now the shared state map alongside run plans and ledgers. |
| A6-D005 | Treat calibration as blocked until row-level prediction/residual artifacts exist | locked | Aggregate candidate metrics cannot support regime calibration, promotion gates, or simulator-quality claims. |

## Work Ledger

| ID | Work Item | Status | Output / Evidence | Notes |
| --- | --- | --- | --- | --- |
| A6-W001 | Create Alpha-6 run plan | complete | `2026-06-03-mlb-m3-alpha-6-feature-family-redesign-run-plan.md` | Opens feature-family redesign phase. |
| A6-W002 | Create Alpha-6 ledger | complete | this file | Opens phase audit trail. |
| A6-W003 | Implement feature-family redesign audit | complete | `pipeline/mlb/m3/audit/audit_feature_family_redesign.py` | Reads FS-003 manifest/artifact and alpha-5 harness output. |
| A6-W004 | Generate Alpha-6 redesign audit artifacts | complete | `data-private/models/mlb-m3/runs/mlb_m3_alpha2_infra_fs003_20260603T162241Z/family_redesign_audit_alpha6` | Gap matrix, column inventory, FS-004 candidate spec, harness pressure, report. |
| A6-W005 | Review redesign audit | complete | `2026-06-03-mlb-m3-alpha-6-family-redesign-audit-review.md` | First FS-004 candidate is `m3_fs_004_state_path_redesign_v0`. |
| A6-W006 | Update alpha state tracker | complete | `2026-06-03-mlb-m3-alpha-state-progress.md` | Marks Alpha-6 opened and records audit output. |
| A6-W007 | Draft FS-004 contract | complete | `pipeline/mlb/features/contracts/m3_fs_004_state_path_redesign_v0.json` | Contract only; builder not materialized yet. |
| A6-W008 | Review FS-004 contract | complete | `2026-06-03-mlb-m3-alpha-6-fs004-contract-review.md` | Validator passes with zero errors and warnings. |
| A6-W009 | Implement FS-004 source feasibility audit | complete | `pipeline/mlb/m3/audit/audit_fs004_source_feasibility.py` | Audits typed DB table, column, and surface readiness for FS-004. |
| A6-W010 | Generate FS-004 source feasibility artifacts | complete | `data-private/models/mlb-m3/runs/mlb_m3_alpha2_infra_fs003_20260603T162241Z/fs004_source_feasibility_alpha6` | 53 referenced typed tables exist and are populated; 0 blocked surfaces; 2 reliever-chain source decisions. |
| A6-W011 | Review FS-004 source feasibility | complete | `2026-06-03-mlb-m3-alpha-6-fs004-source-feasibility-review.md` | FS-004 builder can start after recording the reliever `entry_order`/chain-phase source decision. |
| A6-W012 | Record reliever entry-order source decision | complete | `2026-06-03-mlb-m3-alpha-6-reliever-entry-order-source-decision.md` | FS-004 should consume canonical `pitcher_appearances.entry_order`; staging is only a normalization/backfill source. |
| A6-W013 | Update results normalization for reliever chain order fields | complete | `pipeline/sources/mlb/normalization/results.py` | Adds canonical `entry_order`, `first_inning`, and `first_half` columns/parse values for future normalization runs. |
| A6-W014 | Draft FS-004 builder phase plan | complete | `2026-06-03-mlb-m3-alpha-6-fs004-builder-phase-plan.md` | Defines phased builder order and gates before matrix materialization. |
| A6-W015 | Backfill canonical reliever chain-order fields | complete | `data-migration/reports/backfill_mlb_pitcher_appearance_chain_order_2026-06-03.json` | Populated `entry_order`, `first_inning`, and `first_half` for 7,495 of 7,498 canonical pitcher appearance rows. |
| A6-W016 | Refresh FS-004 source feasibility after backfill | complete | `fs004_source_feasibility_alpha6` | Source-decision surfaces cleared: 17 source-feasible, 0 partial source-contract decisions, 2 optional-source decisions. |
| A6-W017 | Validate FS-004 builder readiness | complete | `data-private/models/mlb-m3/runs/mlb_m3_alpha2_infra_fs003_20260603T162241Z/fs004_builder_readiness_alpha6` | Contract, source decisions, source feasibility, and reliever order data all pass. |
| A6-W018 | Build FS-004 state-path matrix | complete | `m3_fs_004_state_path_redesign_v0_20260603T174237Z` | 886 rows, 140 columns, 120 features, 14 targets. |
| A6-W019 | Review FS-004 artifact | complete | `2026-06-03-mlb-m3-alpha-6-fs004-artifact-review.md` | Accepted as first materialized FS-004 alpha artifact. |
| A6-W020 | Create and validate FS-004 manifest | complete | `mlb_m3_alpha2_infra_fs004_20260603T174500Z` | Manifest validator passes with 7 artifacts, 12 component placeholders, and 7 lane placeholders. |
| A6-W021 | Run FS-004 harness diagnostics | complete | `training_harness_alpha6` | Harness validator passes; candidate is closer than FS-003 but still worse than baseline. |
| A6-W022 | Implement FS-004 tail/regime calibration audit | complete | `pipeline/mlb/m3/audit/audit_fs004_tail_calibration.py` | Reads the FS-004 manifest, harness output, target regimes, walk-forward metrics, and family ablations. |
| A6-W023 | Generate FS-004 tail/regime audit artifacts | complete | `tail_calibration_alpha6` | Promotion is blocked: no row predictions, no probability outputs, no calibration bins, and candidate loses every comparable walk-forward fold. |
| A6-W024 | Review FS-004 tail/regime audit | complete | `2026-06-03-mlb-m3-alpha-6-fs004-tail-calibration-review.md` | Tail audit accepted as feedback-loop infrastructure; next gate is harness row-level prediction/residual output. |
| A6-W025 | Add row-level prediction output to the harness | complete | `pipeline/mlb/m3/harness/run_alpha3_harness.py` | Adds `--row-predictions` for diagnostic validation predictions and residuals; requires `--candidate-model`. |
| A6-W026 | Generate FS-004 row-level harness artifacts | complete | `training_harness_alpha6_row_predictions` | Wrote 6 JSONL row-prediction artifacts across manifest validation and two walk-forward folds. |
| A6-W027 | Regenerate FS-004 tail audit with row residual summaries | complete | `tail_calibration_alpha6_row_predictions` | Row-level predictions now pass the gate; probability outputs, calibration bins, and baseline-beating walk-forward remain blocked. |
| A6-W028 | Review FS-004 row-prediction harness | complete | `2026-06-03-mlb-m3-alpha-6-fs004-row-prediction-harness-review.md` | Accepted as metrics-only residual infrastructure; no promotion. |
| A6-W029 | Add residual calibration-bin scaffolding | complete | `residual_calibration_bins.json` | Prediction-quantile residual bins now exist for row-level diagnostic predictions; these are point-prediction bins, not probability calibration. |
| A6-W030 | Refresh FS-004 row-aware tail audit | complete | `tail_calibration_alpha6_row_predictions` | Row-level predictions and residual calibration bins pass; probability/distribution output and baseline-beating walk-forward remain blocked. |

## Verification Log

- 2026-06-03: `PYTHONDONTWRITEBYTECODE=1 python3 -m py_compile pipeline/mlb/m3/audit/audit_feature_family_redesign.py` passed with bundled workspace Python.
- 2026-06-03: `PYTHONDONTWRITEBYTECODE=1 python3 -m pipeline.mlb.m3.audit.audit_feature_family_redesign` generated the Alpha-6 redesign audit for FS-003.
- 2026-06-03: `python3 -m json.tool` passed for all generated Alpha-6 redesign-audit JSON artifacts.
- 2026-06-03: The audit checked 19 target surfaces: 17 partial, 2 missing.
- 2026-06-03: Missing surfaces are `hitter_vs_reliever_chain_phase` and `tail_calibration_feedback`.
- 2026-06-03: Candidate FS-004 spec is `m3_fs_004_state_path_redesign_v0`.
- 2026-06-03: `python3 -m json.tool pipeline/mlb/features/contracts/m3_fs_004_state_path_redesign_v0.json` passed.
- 2026-06-03: `PYTHONDONTWRITEBYTECODE=1 python3 -m pipeline.mlb.features.validators.validate_game_shape_starter_v1 --contract pipeline/mlb/features/contracts/m3_fs_004_state_path_redesign_v0.json --json` passed with zero errors and warnings.
- 2026-06-03: `PYTHONDONTWRITEBYTECODE=1 python3 -m pipeline.mlb.m3.audit.audit_fs004_source_feasibility` generated source feasibility artifacts.
- 2026-06-03: `python3 -m json.tool` passed for all generated FS-004 source feasibility JSON artifacts.
- 2026-06-03: FS-004 source feasibility found 0 missing/empty contract source tables and 0 blocked surfaces.
- 2026-06-03: FS-004 source feasibility found 2 P0 source-contract decisions: `first_up_reliever_router` and `hitter_vs_reliever_chain_phase`.
- 2026-06-03: Reliever `entry_order` source decision recorded: promote order fields into canonical `pitcher_appearances`; do not make FS-004 depend directly on staging.
- 2026-06-03: Results normalization now carries `entry_order`, `first_inning`, and `first_half` into canonical `pitcher_appearances` on the next normalization/backfill run.
- 2026-06-03: `PYTHONDONTWRITEBYTECODE=1 python3 data-migration/scripts/backfill_mlb_pitcher_appearance_chain_order.py --report data-migration/reports/backfill_mlb_pitcher_appearance_chain_order_2026-06-03.json` backfilled canonical reliever chain-order fields.
- 2026-06-03: Post-backfill count check: `pitcher_appearances` has 7,498 rows, with 7,495 non-null `entry_order`, `first_inning`, and `first_half` values.
- 2026-06-03: Post-backfill FS-004 source feasibility reports 17 `source_feasible` surfaces and 0 `partial_source_contract_decision` surfaces.
- 2026-06-03: `PYTHONDONTWRITEBYTECODE=1 python3 -m pipeline.mlb.m3.audit.validate_fs004_builder_readiness` passed with `builder_readiness_clear`.
- 2026-06-03: `PYTHONDONTWRITEBYTECODE=1 python3 -m pipeline.mlb.features.builders.build_state_path_redesign_v0` built FS-004 with 886 rows, 120 features, and 14 targets.
- 2026-06-03: FS-004 manifest validation passed for `mlb_m3_alpha2_infra_fs004_20260603T174500Z`.
- 2026-06-03: FS-004 harness validation passed for `training_harness_alpha6`.
- 2026-06-03: FS-004 diagnostic candidate remains unpromoted because it is still worse than baseline in every walk-forward fold.
- 2026-06-03: `PYTHONDONTWRITEBYTECODE=1 python3 -m py_compile pipeline/mlb/m3/audit/audit_fs004_tail_calibration.py` passed.
- 2026-06-03: `PYTHONDONTWRITEBYTECODE=1 /Users/jcchen/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -m pipeline.mlb.m3.audit.audit_fs004_tail_calibration --manifest data-private/models/mlb-m3/runs/mlb_m3_alpha2_infra_fs004_20260603T174500Z/manifest.json --harness-dir data-private/models/mlb-m3/runs/mlb_m3_alpha2_infra_fs004_20260603T174500Z/training_harness_alpha6 --output-subdir tail_calibration_alpha6` generated the FS-004 tail/regime audit.
- 2026-06-03: FS-004 tail audit reports `blocked_for_promotion`: tail targets exist, but row-level predictions, probability outputs, calibration bins, and baseline-beating walk-forward results do not.
- 2026-06-03: `PYTHONDONTWRITEBYTECODE=1 python3 -m py_compile pipeline/mlb/m3/harness/run_alpha3_harness.py pipeline/mlb/m3/audit/audit_fs004_tail_calibration.py` passed after adding row-output support.
- 2026-06-03: `PYTHONDONTWRITEBYTECODE=1 /Users/jcchen/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -m pipeline.mlb.m3.harness.run_alpha3_harness --manifest data-private/models/mlb-m3/runs/mlb_m3_alpha2_infra_fs004_20260603T174500Z/manifest.json --output-subdir training_harness_alpha6_row_predictions --candidate-model --walk-forward --family-ablations --row-predictions` generated 6 row-prediction JSONL artifacts.
- 2026-06-03: `PYTHONDONTWRITEBYTECODE=1 python3 -m pipeline.mlb.m3.harness.validate_alpha3_harness --harness-dir data-private/models/mlb-m3/runs/mlb_m3_alpha2_infra_fs004_20260603T174500Z/training_harness_alpha6_row_predictions --json` passed.
- 2026-06-03: `PYTHONDONTWRITEBYTECODE=1 /Users/jcchen/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -m pipeline.mlb.m3.audit.audit_fs004_tail_calibration --manifest data-private/models/mlb-m3/runs/mlb_m3_alpha2_infra_fs004_20260603T174500Z/manifest.json --harness-dir data-private/models/mlb-m3/runs/mlb_m3_alpha2_infra_fs004_20260603T174500Z/training_harness_alpha6_row_predictions --output-subdir tail_calibration_alpha6_row_predictions` generated row-aware tail/regime residual summaries.
- 2026-06-03: Row-aware FS-004 tail audit reports `blocked_for_promotion`: row-level predictions now exist, but probability outputs, calibration bins, and baseline-beating walk-forward results do not.
- 2026-06-03: `tail_calibration_alpha6_row_predictions/residual_calibration_bins.json` generated prediction-quantile residual bins for all 6 row-prediction artifacts.
- 2026-06-03: Refreshed row-aware FS-004 tail audit reports `blocked_for_promotion`: row-level predictions and residual calibration bins now exist, but probability/distribution output and baseline-beating walk-forward results do not.

## Stop Log

No stops yet.
