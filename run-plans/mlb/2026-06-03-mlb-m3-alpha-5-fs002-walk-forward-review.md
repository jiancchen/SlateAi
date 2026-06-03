# MLB-M3 Alpha-5 FS-002 Walk-Forward Review

Date: 2026-06-03

Run: `mlb_m3_alpha2_infra_fs002_20260603T155600Z`

Harness output: `data-private/models/mlb-m3/runs/mlb_m3_alpha2_infra_fs002_20260603T155600Z/training_harness_alpha5`

Feature artifact: `m3_fs_002_game_story_pitching_state_v0`

Status: diagnostic only, not promoted

## Scope

This review records the first alpha-5 harness run on FS-002 after adding walk-forward folds and feature-family ablations.

The run does not create picks, prop prices, market fair probabilities, simulator event logs, promotion decisions, or claims that M3 is better.

## Walk-Forward Result

| Fold | Lane | Rows | Baseline MAE | Candidate MAE | Candidate Delta |
| --- | --- | ---: | ---: | ---: | ---: |
| `wf_2026_05_01_to_2026_05_15` | `f5_total` | 201 | 2.4163 | 2.9071 | +0.4908 |
| `wf_2026_05_01_to_2026_05_15` | `full_game_total` | 201 | 3.4887 | 4.4663 | +0.9777 |
| `wf_2026_05_16_to_2026_05_31` | `f5_total` | 218 | 2.6605 | 3.2909 | +0.6304 |
| `wf_2026_05_16_to_2026_05_31` | `full_game_total` | 218 | 3.5878 | 4.7187 | +1.1309 |

The diagnostic ridge candidate is worse than the mean baseline in both folds and both lanes. This is expected for an early feature artifact, but it blocks any promotion language.

## Family Ablation Signal

| Lane | All-Feature Candidate MAE | Removed Family | Ablated MAE | Delta Vs All |
| --- | ---: | --- | ---: | ---: |
| `f5_total` | 3.2909 | `starter_path` | 3.1670 | -0.1239 |
| `f5_total` | 3.2909 | `story_memory` | 3.2282 | -0.0627 |
| `f5_total` | 3.2909 | `hitter_path` | 3.2725 | -0.0184 |
| `full_game_total` | 4.7187 | `starter_path` | 4.2047 | -0.5140 |
| `full_game_total` | 4.7187 | `reliever_chain` | 4.4221 | -0.2965 |
| `full_game_total` | 4.7187 | `hitter_path` | 4.5281 | -0.1906 |
| `full_game_total` | 4.7187 | `story_memory` | 4.5429 | -0.1758 |

The ablations say the current feature families contain useful baseball structure, but also enough noisy or sparse columns that the diagnostic candidate overfits. Removing entire families is too blunt for a real solution, so FS-003 should use the feature audit's column-level pruning rather than deleting whole pathways.

## Decision

Proceed to FS-003 as a pruned artifact derived from FS-002 and the alpha-5 feature audit.

FS-003 should preserve the architectural pathways:

- game context
- starter path
- reliever chain
- hitter path
- story memory
- target outputs

FS-003 should remove columns with high missingness, constants, identifier-only leakage risk, sparse market lines without source clarity, and fragile low-coverage helper fields flagged by the audit.

## Verification

- `python3 -m py_compile pipeline/mlb/m3/harness/run_alpha3_harness.py pipeline/mlb/m3/harness/validate_alpha3_harness.py`
- `python3 -m pipeline.mlb.m3.harness.validate_alpha3_harness --harness-dir data-private/models/mlb-m3/runs/mlb_m3_alpha2_infra_fs002_20260603T155600Z/training_harness_alpha5 --json`

