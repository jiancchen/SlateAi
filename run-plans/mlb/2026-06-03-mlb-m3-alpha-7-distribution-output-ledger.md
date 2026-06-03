# MLB-M3 Alpha-7 Distribution Output Ledger

Date: 2026-06-03

Phase ID: `mlb-m3-alpha-7-distribution-output`

Run plan: `run-plans/mlb/2026-06-03-mlb-m3-alpha-7-distribution-output-run-plan.md`

Status: complete as metrics-only distribution diagnostics; promotion remains blocked

## Decision Ledger

| ID | Decision | Status | Rationale |
| --- | --- | --- | --- |
| A7-D001 | Distribution outputs must be fold-safe | locked | Validation residuals cannot be reused to construct validation distributions. |
| A7-D002 | First distribution family is residual-quantile diagnostic, not a final simulator | locked | The current candidate still loses baseline; the immediate need is honest coverage diagnostics. |
| A7-D003 | Distribution rows remain metrics-only and not promoted | locked | No picks, prices, betting fair probabilities, or edge claims are allowed. |
| A7-D004 | Regime coverage is a gate, not an afterthought | locked | MLB tails are the core problem; average coverage can hide chaos/dead-bat failure. |

## Work Ledger

| ID | Work Item | Status | Output / Evidence | Notes |
| --- | --- | --- | --- | --- |
| A7-W001 | Create Alpha-7 run plan | complete | `2026-06-03-mlb-m3-alpha-7-distribution-output-run-plan.md` | Defines fold-safe distribution output scope. |
| A7-W002 | Create Alpha-7 ledger | complete | this file | Opens distribution-output audit trail. |
| A7-W003 | Implement fold-train residual distribution fit | complete | `pipeline/mlb/m3/harness/run_alpha3_harness.py` | Adds `fold_train_residual_quantile_v0`; residual quantiles are fitted on train rows only. |
| A7-W004 | Generate diagnostic distribution rows | complete | `training_harness_alpha7_distribution_outputs/distribution_outputs` | 6 JSONL artifacts, 1,274 rows across manifest validation and two walk-forward folds. |
| A7-W005 | Add distribution validator | complete | `pipeline/mlb/m3/harness/validate_alpha3_harness.py` | Validator parses distribution JSONL, requires train-only fit scope, and rejects promotion/market-probability flags. |
| A7-W006 | Generate coverage diagnostics | complete | `tail_calibration_alpha7_distribution_outputs/distribution_coverage_summary.json` | Coverage exists by artifact and by tail/regime slices in machine-readable output. |
| A7-W007 | Update state tracker after first distribution artifact | complete | `2026-06-03-mlb-m3-alpha-state-progress.md` | State tracker now records Alpha-7 outputs and the remaining candidate gate. |
| A7-W008 | Review Alpha-7 distribution output slice | complete | `2026-06-03-mlb-m3-alpha-7-distribution-output-review.md` | Accepted as diagnostic feedback infrastructure only. |
| A7-W009 | Probe baseline-beating gate | complete | verification log | Conservative robust variants improved aggregate MAE but did not beat the train-mean baseline in every comparable fold. |

## Verification Log

- 2026-06-03: Alpha-7 plan and ledger created as documentation only.
- 2026-06-03: `run_alpha3_harness --distribution-outputs` generated 6 diagnostic distribution JSONL artifacts and 1,274 rows.
- 2026-06-03: `validate_alpha3_harness --json` passed with distribution JSONL validity, train-only fit scope, non-promotion, and non-market-probability checks.
- 2026-06-03: Negative validator test on a temp copy with `manifest_validation_rows` fit scope failed as expected with `Distribution rows must declare train-only fit scope.`
- 2026-06-03: `audit_fs004_tail_calibration --output-subdir tail_calibration_alpha7_distribution_outputs` generated distribution coverage diagnostics.
- 2026-06-03: Alpha-7 produced no picks, prices, betting fair probabilities, prop prices, simulator logs, promotion decisions, or edge claims.

## Stop Log

- Candidate-beats-baseline gate remains blocked. Current FS-004 ridge candidate loses all four comparable walk-forward lane folds; conservative shrink/robust probes improved aggregate MAE but did not honestly clear every fold.
