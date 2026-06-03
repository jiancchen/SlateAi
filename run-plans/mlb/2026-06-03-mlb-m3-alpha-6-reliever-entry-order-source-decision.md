# MLB-M3 Alpha-6 Reliever Entry-Order Source Decision

Date: 2026-06-03

Decision ID: `a6-reliever-entry-order-canonicalization-v1`

Status: locked for FS-004 builder planning; canonical DB backfill completed on 2026-06-03.

## Decision

FS-004 should treat reliever `entry_order`, `first_inning`, and `first_half` as canonical fields on `pitcher_appearances`.

The FS-004 builder should not directly depend on `mlb_pitcher_appearances` as a long-term feature source. `mlb_pitcher_appearances` is allowed only as the typed staging/backfill source used by the normalization layer.

## Rationale

FS-004 has one starter path and one reliever chain path per team/game. The reliever chain cannot be represented correctly with only `pitcher_role` and aggregate appearance stats. It needs ordered chain context:

- first-up reliever
- bridge arm
- churn/scramble phase
- late-chain arm
- hitter-vs-reliever-chain phase

The Alpha-6 source feasibility audit found two P0 surfaces requiring this decision:

- `first_up_reliever_router`
- `hitter_vs_reliever_chain_phase`

Both were partial only because canonical `pitcher_appearances` did not expose `entry_order`, while typed staging `mlb_pitcher_appearances` did.

## Implementation Rule

The normalization layer owns the staging-to-canonical promotion:

```text
mlb_pitcher_appearances.entry_order -> pitcher_appearances.entry_order
mlb_pitcher_appearances.first_inning -> pitcher_appearances.first_inning
mlb_pitcher_appearances.first_half -> pitcher_appearances.first_half
```

The parser update lives in:

```text
pipeline/sources/mlb/normalization/results.py
```

The focused backfill run added and populated the canonical fields in `sql-mlb.db`.

Backfill result:

| Field | Non-Null Rows |
| --- | ---: |
| `entry_order` | 7,495 |
| `first_inning` | 7,495 |
| `first_half` | 7,495 |

Total canonical pitcher appearance rows: 7,498.

## Builder Gate

The FS-004 builder should check for these canonical columns before materializing reliever-chain phase features:

- `pitcher_appearances.entry_order`
- `pitcher_appearances.first_inning`
- `pitcher_appearances.first_half`

If they are missing or empty in a future environment:

- build starter path, replay-state, story memory, and game-regime surfaces
- mark first-up reliever router as gated
- mark hitter-vs-reliever-chain phase as gated
- do not fall back silently to `mlb_pitcher_appearances`

## Non-Goals

This decision does not:

- train a first-up reliever model
- price reliever props
- create simulator event logs
- promote a model
- claim an edge
