# MLB-M3 Alpha-2 Infrastructure Ledger

Date: 2026-06-03

Phase ID: `mlb-m3-alpha-2-infrastructure`

Run plan: `run-plans/mlb/2026-06-03-mlb-m3-alpha-2-infrastructure-run-plan.md`

Artifact review: `run-plans/mlb/2026-06-03-mlb-m3-alpha-2-infrastructure-artifact-review.md`

Status: opened

## Decision Ledger

| ID | Decision | Status | Rationale |
| --- | --- | --- | --- |
| A2-D001 | Reuse alpha-1 feature artifact as first manifest input | locked | Alpha-2 is infrastructure over a real typed-DB feature matrix, not a new feature build. |
| A2-D002 | Emit run artifacts under `data-private/models/mlb-m3/runs` | locked | M3 runs need stable, dashboard-readable paths with hashes. |
| A2-D003 | Do not train or backtest in alpha-2 | locked | This phase builds reproducibility and observability before model claims. |
| A2-D004 | Keep component entries as placeholders | locked | The M3 component registry should exist before trained artifacts occupy it. |
| A2-D005 | Preview typed DB model metadata rows, but do not insert them yet | locked | We should inspect registration shape before mutating `sql-mlb.db`. |
| A2-D006 | Treat lane rows as contracts, not predictions | locked | Full-game total, F5 total, props, and market lanes need visibility without fake probabilities. |
| A2-D007 | Persist dashboard state alongside manifest | locked | The run dashboard requirement is persistent structured state, not terminal scrollback. |

## Work Ledger

| ID | Work Item | Status | Output / Evidence | Notes |
| --- | --- | --- | --- | --- |
| A2-W001 | Create alpha-2 infrastructure run plan | complete | `2026-06-03-mlb-m3-alpha-2-infrastructure-run-plan.md` | Captures manifest, dashboard, registry preview, and non-goals. |
| A2-W002 | Create alpha-2 ledger | complete | this file | Opens decision and implementation audit trail. |
| A2-W003 | Audit typed model metadata tables | complete | typed table ledger below | Existing normalized tables can host M3 run metadata later. |
| A2-W004 | Add M3 run package scaffold | complete | `pipeline/mlb/m3/__init__.py`, `pipeline/mlb/m3/runs/__init__.py` | New M3 package boundary for run infrastructure. |
| A2-W005 | Add alpha-2 manifest generator | complete | `pipeline/mlb/m3/runs/create_alpha2_manifest.py` | Reads an alpha-1 feature report and writes manifest/dashboard/lineage/artifact/registry-preview outputs. |
| A2-W006 | Generate first alpha-2 run manifest | complete | `data-private/models/mlb-m3/runs/mlb_m3_alpha2_infra_20260603T093000Z/manifest.json` | Used the committed alpha-1 feature report. |
| A2-W007 | Validate generated JSON and compile checks | complete | validation log below | JSON validation passed; no missing referenced artifacts or missing hashes. |
| A2-W008 | Review generated artifact for scope creep | complete | `2026-06-03-mlb-m3-alpha-2-infrastructure-artifact-review.md` | Confirmed no training/backtest/selection claims. |
| A2-W009 | Add manifest validator | complete | `pipeline/mlb/m3/runs/validate_alpha2_manifest.py` | Checks manifest shape, artifact hashes, placeholder statuses, preview-only typed metadata, and non-goal scope. |

## Typed Table Ledger

| Table | Present | Alpha-2 Role | Notes |
| --- | --- | --- | --- |
| `model_runs` | yes | future parent run registration | Has `manifest_path`, `input_hash`, `output_hash`, `artifact_summary_json`, and source detail fields. |
| `model_run_artifacts` | yes | future file-level artifact registration | Supports artifact role, path, sha256, and existence flag. |
| `model_component_runs` | yes | future component-family run registration | Can represent placeholder or trained submodel component rows. |
| `model_run_lanes` | yes | future lane-level registration | Can represent full-game total, F5 total, props, settlement/backtest lanes. |

## Artifact Ledger

| Artifact | Status | Path |
| --- | --- | --- |
| Alpha-2 run plan | exists | `run-plans/mlb/2026-06-03-mlb-m3-alpha-2-infrastructure-run-plan.md` |
| Alpha-2 ledger | exists | `run-plans/mlb/2026-06-03-mlb-m3-alpha-2-infrastructure-ledger.md` |
| Manifest generator | exists | `pipeline/mlb/m3/runs/create_alpha2_manifest.py` |
| Manifest validator | exists | `pipeline/mlb/m3/runs/validate_alpha2_manifest.py` |
| First manifest | exists | `data-private/models/mlb-m3/runs/mlb_m3_alpha2_infra_20260603T093000Z/manifest.json` |
| Dashboard state | exists | `data-private/models/mlb-m3/runs/mlb_m3_alpha2_infra_20260603T093000Z/dashboard_state.json` |
| Registry preview | exists | `data-private/models/mlb-m3/runs/mlb_m3_alpha2_infra_20260603T093000Z/typed_model_registry_preview.json` |
| Artifact index | exists | `data-private/models/mlb-m3/runs/mlb_m3_alpha2_infra_20260603T093000Z/artifacts.json` |
| Lineage | exists | `data-private/models/mlb-m3/runs/mlb_m3_alpha2_infra_20260603T093000Z/lineage.json` |
| Warnings | exists | `data-private/models/mlb-m3/runs/mlb_m3_alpha2_infra_20260603T093000Z/warnings.json` |
| Run report | exists | `data-private/models/mlb-m3/runs/mlb_m3_alpha2_infra_20260603T093000Z/report.md` |
| Manifest validation report | exists | `data-private/models/mlb-m3/runs/mlb_m3_alpha2_infra_20260603T093000Z/manifest_validation.json` |
| Artifact review | exists | `run-plans/mlb/2026-06-03-mlb-m3-alpha-2-infrastructure-artifact-review.md` |

## Scope Guard

Alpha-2 must not create:

- trained model artifacts
- simulator event logs
- market fair probabilities
- picks or selection rows
- player prop prices
- backtest edge claims
- statements that M3 is better than M2

## Open Questions

- Should future alpha-3 write run records directly to the typed DB, or keep one more preview-only phase?
- Should the first dashboard be a static HTML/report view, or a lightweight local web app that reads run directories?
- Should walk-forward split planning live in the run manifest generator or in a separate backtest harness package?

## Stop Log

No stops yet.

## Verification Log

- 2026-06-03: `python3 -m py_compile pipeline/mlb/m3/runs/create_alpha2_manifest.py` passed.
- 2026-06-03: `python3 -m py_compile pipeline/mlb/m3/runs/validate_alpha2_manifest.py` passed.
- 2026-06-03: `python3 -m pipeline.mlb.m3.runs.create_alpha2_manifest --help` passed.
- 2026-06-03: Generated `mlb_m3_alpha2_infra_20260603T093000Z` with zero warnings.
- 2026-06-03: `python3 -m json.tool` passed for all generated alpha-2 JSON files.
- 2026-06-03: Artifact hash check found 7 manifest input artifacts, 13 artifact index entries, 14 registry artifact rows, zero missing artifacts, and zero present artifacts without hashes.
- 2026-06-03: `python3 -m pipeline.mlb.m3.runs.validate_alpha2_manifest --manifest data-private/models/mlb-m3/runs/mlb_m3_alpha2_infra_20260603T093000Z/manifest.json --report data-private/models/mlb-m3/runs/mlb_m3_alpha2_infra_20260603T093000Z/manifest_validation.json --json` passed with 18 checks, zero errors, and zero warnings.
