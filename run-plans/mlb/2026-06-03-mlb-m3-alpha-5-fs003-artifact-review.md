# MLB-M3 Alpha-5 FS-003 Artifact Review

Date: 2026-06-03

Feature set: `m3_fs_003_game_story_pitching_state_pruned_v0`

Run ID: `m3_fs_003_game_story_pitching_state_pruned_v0_20260603T162132Z`

Artifact directory: `data-private/models/mlb-m3/features/m3_fs_003_game_story_pitching_state_pruned_v0/m3_fs_003_game_story_pitching_state_pruned_v0_20260603T162132Z`

Report: `data-migration/reports/m3_fs_003_game_story_pitching_state_pruned_v0_2026-03-26_to_2026-05-31.json`

Status: artifact materialized, harness not yet run in this review

## Summary

FS-003 is a pruned matrix derived from FS-002 using the alpha-5 feature audit selected-column file.

It is not a new model, not a new feature-engineering pass, and not a migration back toward M2. Its purpose is to test whether removing obvious noisy or fragile columns improves alpha harness stability.

## Counts

| Metric | Value |
| --- | ---: |
| Rows | 886 |
| Columns | 271 |
| Feature columns | 256 |
| Target columns | 9 |
| Pruned feature columns vs FS-002 | 24 |

## Selected Families

| Family | Columns |
| --- | ---: |
| `story_memory` | 62 |
| `starter_path` | 92 |
| `reliever_chain` | 51 |
| `hitter_path` | 34 |
| `game_context` | 14 |
| `market_context` | 3 |

Metadata, primary key, time key, and targets are retained outside the feature-family counts.

## Guardrails

| Guardrail | Value |
| --- | --- |
| `uses_sports_db` | `false` |
| `uses_m2_weights` | `false` |
| `uses_hand_picked_memory_lengths` | `false` |
| `expected_ab_input_materialized` | `false` |
| Leakage report | `ok` |

## Decision

Proceed to an alpha-2 manifest for FS-003, then run the upgraded alpha-5 harness with walk-forward diagnostics and family ablations.

The harness should compare FS-003 against the FS-002 alpha-5 diagnostic run. If the diagnostic candidate still loses to the mean baseline, no model should be promoted and the next step should be feature-family redesign, not tuning.

