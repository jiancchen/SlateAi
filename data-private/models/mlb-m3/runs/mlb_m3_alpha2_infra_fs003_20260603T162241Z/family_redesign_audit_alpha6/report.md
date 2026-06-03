# MLB-M3 Alpha-6 Feature-Family Redesign Audit

Run ID: `mlb_m3_alpha2_infra_fs003_20260603T162241Z_alpha6_family_redesign_audit`

## Summary

- Source feature set: `m3_fs_003_game_story_pitching_state_pruned_v0`
- Source feature run: `m3_fs_003_game_story_pitching_state_pruned_v0_20260603T162132Z`
- Rows: `886`
- Feature columns: `256`
- Surfaces audited: `19`
- Current status counts: `{'missing': 2, 'partial': 17}`

## Surface Counts By Family

| Family | Surface Count |
| --- | ---: |
| `feedback` | 1 |
| `game_context` | 1 |
| `hitter_path` | 4 |
| `market_context` | 1 |
| `reliever_chain` | 4 |
| `starter_path` | 5 |
| `story_memory` | 3 |

## Priority Surface Gaps

| Surface | Family | Priority | Current Status | Evidence Status | Matched Columns |
| --- | --- | --- | --- | --- | ---: |
| `starter_workload_trajectory` | `starter_path` | `P0` | `partial` | `covered_by_columns` | 26 |
| `starter_damage_distribution` | `starter_path` | `P0` | `partial` | `covered_by_columns` | 32 |
| `starter_pitch_shape_change` | `starter_path` | `P1` | `partial` | `covered_by_columns` | 16 |
| `starter_opponent_pressure_residual` | `starter_path` | `P0` | `partial` | `covered_by_columns` | 36 |
| `starter_low_data_uncertainty` | `starter_path` | `P0` | `partial` | `covered_by_columns` | 8 |
| `reliever_availability_reset` | `reliever_chain` | `P0` | `partial` | `covered_by_columns` | 12 |
| `first_up_reliever_router` | `reliever_chain` | `P0` | `partial` | `covered_by_columns` | 12 |
| `reliever_chain_length_regime` | `reliever_chain` | `P0` | `partial` | `covered_by_columns` | 12 |
| `reliever_performance_volatility` | `reliever_chain` | `P0` | `partial` | `covered_by_columns` | 9 |
| `hitter_vs_starter_phase` | `hitter_path` | `P0` | `partial` | `partial_column_coverage` | 24 |
| `hitter_vs_reliever_chain_phase` | `hitter_path` | `P0` | `missing` | `missing` | 0 |
| `hitter_current_state_residual` | `hitter_path` | `P1` | `partial` | `covered_by_columns` | 14 |
| `lineup_pa_volume_context` | `hitter_path` | `P0` | `partial` | `covered_by_columns` | 8 |
| `ordered_story_memory` | `story_memory` | `P0` | `partial` | `covered_by_columns` | 58 |
| `traffic_conversion_state` | `story_memory` | `P0` | `partial` | `covered_by_columns` | 12 |
| `game_regime_labels` | `story_memory` | `P0` | `partial` | `covered_by_columns` | 13 |
| `tail_calibration_feedback` | `feedback` | `P0` | `missing` | `missing` | 0 |

## Harness Pressure

The current FS-003 candidate remains diagnostic and unpromoted.

| Fold | Lane | Baseline MAE | Candidate MAE | Delta | Features |
| --- | --- | ---: | ---: | ---: | ---: |
| `wf_2026_05_01_to_2026_05_15` | `f5_total` | 2.4163 | 2.9071 | +0.4908 | 251 |
| `wf_2026_05_01_to_2026_05_15` | `full_game_total` | 3.4887 | 4.4663 | +0.9777 | 251 |
| `wf_2026_05_16_to_2026_05_31` | `f5_total` | 2.6605 | 3.2909 | +0.6304 | 251 |
| `wf_2026_05_16_to_2026_05_31` | `full_game_total` | 3.5878 | 4.7187 | +1.1309 | 251 |

## Decision

Proceed toward `m3_fs_004_state_path_redesign_v0` as a redesigned feature artifact. Do not tune or promote a model on FS-003 as the next move.
