# MLB-M3 Alpha-6 FS-004 Contract Review

Date: 2026-06-03

Contract: `pipeline/mlb/features/contracts/m3_fs_004_state_path_redesign_v0.json`

Feature set ID: `m3_fs_004_state_path_redesign_v0`

Status: accepted as contract draft; builder not materialized

## Summary

FS-004 is the first contract that explicitly turns the Alpha-6 surface audit into a feature artifact target.

It does not build a matrix yet. It defines what the next matrix must represent before we tune or promote a model.

## Contract Scope

The contract requires these redesigned families:

- starter workload path
- starter damage state
- starter pitch-shape change
- starter opponent-pressure residual
- starter low-data uncertainty
- reliever availability/reset
- first-up reliever router
- reliever chain state
- reliever performance state
- hitter starter-phase surface
- hitter reliever-chain phase surface
- hitter current-state residual
- lineup PA-volume context
- ordered story memory
- traffic conversion state
- game regime labels
- schedule/travel context
- market context lines
- tail calibration feedback

## Distribution Bridge

FS-004 keeps props downstream of shared distributions. The contract declares:

- `game_shape_distribution`
- `team_run_distribution`
- `starter_exit_distribution`
- `starter_stat_distribution`
- `reliever_availability_distribution`
- `first_up_reliever_router`
- `reliever_chain_distribution`
- `reliever_stat_distribution`
- `pa_event_distribution`
- `hitter_stat_distribution`
- `calibration_layer`

Prop families remain contract-only and resolve from these shared distributions.

## Guardrails

| Guardrail | Status |
| --- | --- |
| No legacy `sports.db` dependency | required false |
| No M2 weights | required false |
| No hand-picked memory lengths | required false |
| No fixed expected AB input truth | required false |
| No isolated prop models | required true |
| Selection policy downstream only | required true |

## Validation

Commands:

```bash
python3 -m json.tool pipeline/mlb/features/contracts/m3_fs_004_state_path_redesign_v0.json
```

```bash
PYTHONDONTWRITEBYTECODE=1 /Users/jcchen/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 \
  -m pipeline.mlb.features.validators.validate_game_shape_starter_v1 \
  --contract pipeline/mlb/features/contracts/m3_fs_004_state_path_redesign_v0.json \
  --json
```

Result:

- 14 validator checks passed
- 0 errors
- 0 warnings

## Decision

Proceed to an FS-004 builder plan.

Do not materialize a model or run a stronger learner until the builder exists and the harness has tested the new matrix.

