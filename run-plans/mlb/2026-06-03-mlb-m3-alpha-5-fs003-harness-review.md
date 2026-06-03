# MLB-M3 Alpha-5 FS-003 Harness Review

Date: 2026-06-03

Run: `mlb_m3_alpha2_infra_fs003_20260603T162241Z`

Harness output: `data-private/models/mlb-m3/runs/mlb_m3_alpha2_infra_fs003_20260603T162241Z/training_harness_alpha5`

Feature artifact: `m3_fs_003_game_story_pitching_state_pruned_v0`

Status: diagnostic only, not promoted

## Scope

This review compares the pruned FS-003 artifact against the FS-002 alpha-5 harness output.

The run does not create picks, prop prices, market fair probabilities, simulator event logs, promotion decisions, or claims that M3 is better.

## Walk-Forward Result

| Feature Set | Fold | Lane | Rows | Baseline MAE | Candidate MAE | Candidate Delta | Numeric Features |
| --- | --- | --- | ---: | ---: | ---: | ---: | ---: |
| FS-002 | `wf_2026_05_01_to_2026_05_15` | `f5_total` | 201 | 2.4163 | 2.9071 | +0.4908 | 262 |
| FS-003 | `wf_2026_05_01_to_2026_05_15` | `f5_total` | 201 | 2.4163 | 2.9071 | +0.4908 | 251 |
| FS-002 | `wf_2026_05_01_to_2026_05_15` | `full_game_total` | 201 | 3.4887 | 4.4663 | +0.9777 | 262 |
| FS-003 | `wf_2026_05_01_to_2026_05_15` | `full_game_total` | 201 | 3.4887 | 4.4663 | +0.9777 | 251 |
| FS-002 | `wf_2026_05_16_to_2026_05_31` | `f5_total` | 218 | 2.6605 | 3.2909 | +0.6304 | 262 |
| FS-003 | `wf_2026_05_16_to_2026_05_31` | `f5_total` | 218 | 2.6605 | 3.2909 | +0.6304 | 251 |
| FS-002 | `wf_2026_05_16_to_2026_05_31` | `full_game_total` | 218 | 3.5878 | 4.7187 | +1.1309 | 262 |
| FS-003 | `wf_2026_05_16_to_2026_05_31` | `full_game_total` | 218 | 3.5878 | 4.7187 | +1.1309 | 251 |

FS-003 removes 11 numeric columns seen by the diagnostic ridge, but the walk-forward metrics are unchanged. The pruned fields were artifact hygiene issues, not the dominant source of error.

## Ablation Result

| Lane | All-Feature Candidate MAE | Best Helpful Removal | Ablated MAE | Delta Vs All |
| --- | ---: | --- | ---: | ---: |
| `f5_total` | 3.2909 | `starter_path` | 3.1670 | -0.1239 |
| `f5_total` | 3.2909 | `story_memory` | 3.2282 | -0.0627 |
| `full_game_total` | 4.7187 | `starter_path` | 4.2047 | -0.5140 |
| `full_game_total` | 4.7187 | `reliever_chain` | 4.4221 | -0.2965 |

The ablations match FS-002. The next useful move is not tuning the ridge or adding a slightly stronger learner on the same feature matrix. The useful move is to redesign feature-family representation, especially starter path, reliever chain, and how hitter-path interaction is encoded.

## Decision

Do not promote any model.

Do not claim FS-003 improves predictive quality.

Treat FS-003 as a cleaner baseline artifact for the next feature-design pass.

Alpha-6 should focus on feature-family redesign before model tuning:

- starter path should separate workload trajectory, damage distribution, pitch-shape change, and low-data uncertainty instead of leaving the learner to infer it from loosely related summaries
- reliever chain should represent chain regime, arm availability, recent usage, expected chain length, and performance volatility as separate surfaces
- hitter path should separate starter-phase matchup from reliever-chain matchup
- story memory should keep ordered event history, but should be tested as interaction context rather than a large flat numeric block

## Verification

- `PYTHONDONTWRITEBYTECODE=1 python3 -m pipeline.mlb.m3.harness.run_alpha3_harness --manifest data-private/models/mlb-m3/runs/mlb_m3_alpha2_infra_fs003_20260603T162241Z/manifest.json --output-subdir training_harness_alpha5 --candidate-model --walk-forward --family-ablations`
- `PYTHONDONTWRITEBYTECODE=1 python3 -m pipeline.mlb.m3.harness.validate_alpha3_harness --harness-dir data-private/models/mlb-m3/runs/mlb_m3_alpha2_infra_fs003_20260603T162241Z/training_harness_alpha5 --json`

