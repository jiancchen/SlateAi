# MLB-M3 Alpha-2 Infrastructure Artifact Review

Date: 2026-06-03

Run ID: `mlb_m3_alpha2_infra_20260603T093000Z`

Status: accepted as first alpha-2 infrastructure artifact

## Reviewed Artifact

```text
data-private/models/mlb-m3/runs/mlb_m3_alpha2_infra_20260603T093000Z/
  artifacts.json
  dashboard_state.json
  lineage.json
  manifest.json
  report.md
  typed_model_registry_preview.json
  warnings.json
```

## Input Feature Artifact

| Field | Value |
| --- | --- |
| Feature set | `m3_fs_001_game_shape_starter_v1` |
| Feature version | `0.1.0` |
| Alpha-1 run | `m3_fs_001_game_shape_starter_v1_20260603T091939Z` |
| Rows | 886 |
| Columns | 77 |
| Features | 62 |
| Targets | 9 |
| Uses `sports.db` | false |
| Uses M2 weights | false |
| Uses hand-picked memory lengths | false |

## Manifest Results

| Check | Result |
| --- | --- |
| `manifest.json` valid JSON | pass |
| `dashboard_state.json` valid JSON | pass |
| `lineage.json` valid JSON | pass |
| `artifacts.json` valid JSON | pass |
| `typed_model_registry_preview.json` valid JSON | pass |
| `warnings.json` valid JSON | pass |
| Referenced input artifacts | 7 |
| Artifact index entries | 12 |
| Registry artifact preview rows | 13 |
| Missing referenced artifacts | 0 |
| Present artifacts without hash | 0 |
| Component placeholders | 12 |
| Lane placeholders | 7 |
| Warnings | none |

## Typed Registry Preview

The generated preview maps the run to existing typed model metadata tables without writing to `sql-mlb.db`.

| Preview Section | Count |
| --- | ---: |
| `model_runs` | 1 |
| `model_run_artifacts` | 13 |
| `model_component_runs` | 12 |
| `model_run_lanes` | 7 |

This is the right direction. The next phase can add a validator and then decide when direct typed DB inserts are allowed.

## Scope Review

Accepted because the artifact contains:

- a reproducible manifest
- input artifact hashes
- dashboard-friendly state
- lineage
- typed registry preview rows
- component family placeholders
- lane placeholders
- explicit non-goals

It does not contain:

- trained model artifacts
- simulator event logs
- market fair probabilities
- picks or selection rows
- player prop prices
- backtest edge claims
- any claim that M3 is better than M2

## Caveats

- `artifacts.json` and `typed_model_registry_preview.json` are generated after the first artifact index assembly. They are present on disk, but the current `artifacts.json` self-hash is intentionally omitted to avoid recursive hash churn.
- The split plan is a harness placeholder only. It is not a validated walk-forward design.
- Component entries are registry slots, not trained components.
- Lane entries are contracts, not prediction outputs.
- Direct typed DB run registration is still deferred.

## Next Recommended Work

1. Add a manifest validator that checks required sections, artifact hashes, component statuses, and non-goal scope.
2. Add a static dashboard/report reader over `dashboard_state.json` and `artifacts.json`.
3. Add a training harness skeleton that consumes a manifest and writes metrics-only outputs with no picks.
4. Add a backtest harness skeleton that records chronological folds, calibration slices, and tail diagnostics without claiming edge.
