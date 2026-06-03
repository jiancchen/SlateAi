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

## Stop Log

No stops yet.
