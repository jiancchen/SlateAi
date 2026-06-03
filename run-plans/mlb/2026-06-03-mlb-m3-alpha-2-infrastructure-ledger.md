# MLB-M3 Alpha-2 Infrastructure Ledger

Date: 2026-06-03

Phase ID: `mlb-m3-alpha-2-infrastructure`

Run plan: `run-plans/mlb/2026-06-03-mlb-m3-alpha-2-infrastructure-run-plan.md`

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
| A2-W004 | Add M3 run package scaffold | pending |  | Expected under `pipeline/mlb/m3/runs`. |
| A2-W005 | Add alpha-2 manifest generator | pending |  | Should read an alpha-1 feature report and write a complete run directory. |
| A2-W006 | Generate first alpha-2 run manifest | pending |  | Use the committed alpha-1 feature report. |
| A2-W007 | Validate generated JSON and compile checks | pending |  | No generated predictions should exist. |
| A2-W008 | Review generated artifact for scope creep | pending |  | Confirm no training/backtest/selection claims. |

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
| Manifest generator | pending | `pipeline/mlb/m3/runs/create_alpha2_manifest.py` |
| First manifest | pending | `data-private/models/mlb-m3/runs/<run_id>/manifest.json` |
| Dashboard state | pending | `data-private/models/mlb-m3/runs/<run_id>/dashboard_state.json` |
| Registry preview | pending | `data-private/models/mlb-m3/runs/<run_id>/typed_model_registry_preview.json` |

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
