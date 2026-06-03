# MLB-M3 Alpha-6 FS-004 Artifact Review

Date: 2026-06-03

Feature set: `m3_fs_004_state_path_redesign_v0`

Run ID: `m3_fs_004_state_path_redesign_v0_20260603T174237Z`

Artifact:

```text
data-private/models/mlb-m3/features/m3_fs_004_state_path_redesign_v0/m3_fs_004_state_path_redesign_v0_20260603T174237Z
```

Status: accepted as first materialized FS-004 alpha artifact.

## Summary

FS-004 materializes the Alpha-6 state-path redesign into a typed DB feature matrix. It is not a trained model, not a simulator, not a prop-pricing layer, and not an edge claim.

| Field | Value |
| --- | ---: |
| Rows | 886 |
| Columns | 140 |
| Features | 120 |
| Targets | 14 |
| Start date | 2026-03-26 |
| End date | 2026-05-31 |

## What Changed From FS-003

FS-004 is a new builder, not a pruned FS-002 copy.

It adds the first Alpha-6 state-path pass:

- prior ordered story memory
- starter workload/damage path with immediate prior-event residuals
- canonical reliever-chain order features
- reliever availability/router/churn features
- hitter starter-phase matchup pressure
- hitter reliever-chain phase readiness
- additional postgame state/regime targets

It avoids:

- `sports.db`
- M2 weights
- expected AB input truth
- fixed raw-window feature names like `last5` or `last10`
- picks, prices, simulator logs, and promotion claims

## Verification

Commands run:

```bash
PYTHONDONTWRITEBYTECODE=1 python3 -m pipeline.mlb.features.builders.build_state_path_redesign_v0
python3 -m json.tool data-migration/reports/m3_fs_004_state_path_redesign_v0_2026-03-26_to_2026-05-31.json
python3 -m json.tool data-private/models/mlb-m3/features/m3_fs_004_state_path_redesign_v0/m3_fs_004_state_path_redesign_v0_20260603T174237Z/build_report.json
python3 -m json.tool data-private/models/mlb-m3/features/m3_fs_004_state_path_redesign_v0/m3_fs_004_state_path_redesign_v0_20260603T174237Z/data_dictionary.json
python3 -m json.tool data-private/models/mlb-m3/features/m3_fs_004_state_path_redesign_v0/m3_fs_004_state_path_redesign_v0_20260603T174237Z/missingness.json
python3 -m json.tool data-private/models/mlb-m3/features/m3_fs_004_state_path_redesign_v0/m3_fs_004_state_path_redesign_v0_20260603T174237Z/coverage.json
python3 -m json.tool data-private/models/mlb-m3/features/m3_fs_004_state_path_redesign_v0/m3_fs_004_state_path_redesign_v0_20260603T174237Z/leakage.json
python3 -m json.tool data-private/models/mlb-m3/features/m3_fs_004_state_path_redesign_v0/m3_fs_004_state_path_redesign_v0_20260603T174237Z/lineage.json
```

DuckDB matrix check:

```text
rows=886
distinct_games=886
min_game_date=2026-03-26
max_game_date=2026-05-31
```

## Accepted Next Step

Create an Alpha-2 style manifest and run the metrics-only harness. The harness result decides whether FS-004 is worth further feature work, not whether M3 has an edge.

