# MLB-M3 Alpha-7 Distribution Output Ledger

Date: 2026-06-03

Phase ID: `mlb-m3-alpha-7-distribution-output`

Run plan: `run-plans/mlb/2026-06-03-mlb-m3-alpha-7-distribution-output-run-plan.md`

Status: planned

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
| A7-W003 | Implement fold-train residual distribution fit | pending | pending | Must not fit on validation residuals. |
| A7-W004 | Generate diagnostic distribution rows | pending | pending | No picks, prices, or promoted probabilities. |
| A7-W005 | Add distribution validator | pending | pending | Must reject validation-leakage fit scope. |
| A7-W006 | Generate coverage diagnostics | pending | pending | Lane, fold, and regime coverage required. |
| A7-W007 | Update state tracker after first distribution artifact | pending | pending | Keep current state map authoritative. |

## Verification Log

- 2026-06-03: Alpha-7 plan and ledger created as documentation only.
- 2026-06-03: No distribution output artifacts, probability rows, prices, picks, simulator logs, promotion decisions, or edge claims were created.

## Stop Log

No stops yet.
