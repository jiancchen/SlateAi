# MLB-M3 Alpha-6 Family Redesign Audit Review

Date: 2026-06-03

Phase ID: `mlb-m3-alpha-6-feature-family-redesign`

Audit output: `data-private/models/mlb-m3/runs/mlb_m3_alpha2_infra_fs003_20260603T162241Z/family_redesign_audit_alpha6`

Source feature set: `m3_fs_003_game_story_pitching_state_pruned_v0`

Source feature run: `m3_fs_003_game_story_pitching_state_pruned_v0_20260603T162132Z`

Status: accepted as first Alpha-6 redesign audit

## Summary

The Alpha-6 audit maps FS-003 columns and FS-003 alpha-5 harness pressure against the state surfaces M3 needs before a real simulator/model stack can exist.

Result:

| Metric | Value |
| --- | ---: |
| Source rows | 886 |
| Source feature columns | 256 |
| Surfaces audited | 19 |
| Partial surfaces | 17 |
| Missing surfaces | 2 |

This confirms the current state tracker: M3 has many evidence fragments, but the baseball-state representations are not complete component surfaces yet.

## Missing Surfaces

| Surface | Family | Why It Matters |
| --- | --- | --- |
| `hitter_vs_reliever_chain_phase` | `hitter_path` | Player and team outcomes need to know the second phase of the single opponent pitching path, not just hitter-vs-starter. |
| `tail_calibration_feedback` | `feedback` | The harness can reject weak candidates, but it cannot yet calibrate tail/regime behavior or promote/reject components formally. |

## Partial But Priority Surfaces

These surfaces have current FS-003 columns, but they need redesign before FS-004:

| Surface | Family | Needed Change |
| --- | --- | --- |
| `starter_workload_trajectory` | `starter_path` | Separate workload baseline, trajectory, change-point evidence, floor distance, and hook/exit target scaffolding. |
| `starter_damage_distribution` | `starter_path` | Separate damage baseline, volatility, command-break state, walk burst, HR damage, and low-data uncertainty. |
| `starter_opponent_pressure_residual` | `starter_path` | Join starter path to opponent-adjusted hitter pressure residuals. |
| `reliever_availability_reset` | `reliever_chain` | Move from chain averages to individual-arm availability/reset distributions. |
| `first_up_reliever_router` | `reliever_chain` | Create target/probability distribution over first-up candidate arms. |
| `reliever_chain_length_regime` | `reliever_chain` | Represent normal/compressed/scramble/churn regimes explicitly. |
| `reliever_performance_volatility` | `reliever_chain` | Separate availability from performance volatility and inherited-runner/traffic state. |
| `hitter_vs_starter_phase` | `hitter_path` | Move from starter-phase averages to event distributions. |
| `lineup_pa_volume_context` | `hitter_path` | Treat PA volume as downstream of lineup turnover, walks, scoring state, and pitcher damage. |
| `ordered_story_memory` | `story_memory` | Preserve ordered transitions instead of only flat rates and days-since fields. |
| `traffic_conversion_state` | `story_memory` | Represent traffic creation/conversion state from replayable PA/base-out context. |
| `game_regime_labels` | `story_memory` | Formalize low, normal, high-run, chaos, starter-failure, and bullpen-collapse labels. |

## Candidate FS-004 Spec

The audit generated:

```text
data-private/models/mlb-m3/runs/mlb_m3_alpha2_infra_fs003_20260603T162241Z/family_redesign_audit_alpha6/candidate_fs004_spec.json
```

Candidate feature set:

```text
m3_fs_004_state_path_redesign_v0
```

The spec requires 17 priority surfaces. It keeps the same non-goals:

- no picks
- no selection rows
- no player prop pricing
- no market fair probability claims
- no simulator event logs
- no promotion decisions
- no claim that M3 is better

## Decision

Proceed to an FS-004 contract for `m3_fs_004_state_path_redesign_v0`.

Do not tune a stronger model on FS-003 as the next step.

FS-004 should first target the surfaces that change the baseball representation most:

1. starter workload/damage/opponent-pressure split
2. reliever availability/router/chain-regime split
3. hitter starter-phase vs reliever-chain phase split
4. ordered story/regime labels
5. calibration hooks as artifact contracts, even if calibration implementation remains Alpha-8

## Verification

- `PYTHONDONTWRITEBYTECODE=1 python3 -m py_compile pipeline/mlb/m3/audit/audit_feature_family_redesign.py`
- `PYTHONDONTWRITEBYTECODE=1 python3 -m pipeline.mlb.m3.audit.audit_feature_family_redesign`
- `python3 -m json.tool` for all generated audit JSON artifacts

