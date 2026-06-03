# MLB-M3 Alpha-6 FS-004 Source Feasibility Review

Date: 2026-06-03

Audit artifact:

```text
data-private/models/mlb-m3/runs/mlb_m3_alpha2_infra_fs003_20260603T162241Z/fs004_source_feasibility_alpha6
```

Status: accepted as source-readiness audit, not accepted as a feature matrix.

## Summary

The FS-004 source feasibility audit confirms that the typed MLB DB has enough populated source coverage to begin building `m3_fs_004_state_path_redesign_v0`.

This does not mean FS-004 exists yet. It means the next work can move from contract/audit into a builder with known source decisions.

## Results

| Check | Result |
| --- | --- |
| Contract source tables audited | `27` |
| Missing or empty contract source tables | `0` |
| Total referenced typed tables audited | `53` |
| Existing referenced typed tables | `53` |
| Populated referenced typed tables | `53` |
| Surfaces audited | `19` |
| Blocked surfaces | `0` |
| Source-feasible surfaces | `17` |
| Partial source-contract-decision surfaces | `0` |
| Optional-source-decision surfaces | `2` |

## Critical Source Decisions

The two P0 reliever-chain surfaces that were gated on canonical order fields are now source-feasible after backfill:

| Surface | Decision Needed | Why It Matters |
| --- | --- | --- |
| `first_up_reliever_router` | Cleared | Canonical `pitcher_appearances.entry_order` is populated for 7,495 of 7,498 rows. |
| `hitter_vs_reliever_chain_phase` | Cleared | Canonical `entry_order`, `first_inning`, and `first_half` are populated for reliever-chain phase splits. |

## Important Findings

- Typed replay state is present in `plate_appearances` and `pitch_events`, including PA index, base/out state, score before/after, count state, event fields, and raw JSON.
- Starter workload, starter damage, starter pitch shape, reliever availability, reliever performance, hitter starter phase, story memory, traffic conversion, and game regime labels are source-feasible.
- The feasibility audit now requires non-null evidence for source columns. After the backfill, reliever-chain order no longer gates the first FS-004 builder pass.
- Tail calibration feedback is not a blocker for building FS-004, but it remains a blocker for model promotion, market pricing, and claims that M3 has an edge.
- Schedule/travel context has basic typed sources and optional gaps. It should remain lower priority than state path, reliever chain, replay labels, and hitter-path phase splits.

## Accepted Next Step

Build the FS-004 builder in phases:

1. Start with replay-state and game-regime labels because the typed DB now has strong PA/pitch state coverage.
2. Add starter path features with workload, damage, pitch shape, and opponent pressure separated.
3. Add reliever chain features from canonical `pitcher_appearances.entry_order`, `first_inning`, and `first_half`.
4. Add hitter-path splits against starter phase and reliever-chain phase.
5. Generate an FS-004 matrix and run the existing metrics-only harness without promoting a model.

## Verification

Commands run:

```bash
PYTHONDONTWRITEBYTECODE=1 python3 -m pipeline.mlb.m3.audit.audit_fs004_source_feasibility
python3 -m json.tool data-private/models/mlb-m3/runs/mlb_m3_alpha2_infra_fs003_20260603T162241Z/fs004_source_feasibility_alpha6/fs004_source_feasibility.json
python3 -m json.tool data-private/models/mlb-m3/runs/mlb_m3_alpha2_infra_fs003_20260603T162241Z/fs004_source_feasibility_alpha6/source_table_audit.json
python3 -m json.tool data-private/models/mlb-m3/runs/mlb_m3_alpha2_infra_fs003_20260603T162241Z/fs004_source_feasibility_alpha6/surface_feasibility_matrix.json
python3 -m json.tool data-private/models/mlb-m3/runs/mlb_m3_alpha2_infra_fs003_20260603T162241Z/fs004_source_feasibility_alpha6/artifacts.json
```
