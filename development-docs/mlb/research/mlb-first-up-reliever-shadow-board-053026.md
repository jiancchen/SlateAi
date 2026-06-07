# MLB First-Up Reliever Shadow Board — May 30, 2026

This is `E36 shadow`, the live-style bullpen artifact built from the `E33` stack plus the adaptive heavy-use reset overlay.

Goal:

- keep the reliever upgrade research in shadow mode
- surface a `first-up / top-2` bullpen cluster on real game cards
- use the same `E33` feature stack without changing the core live board yet

Target slate:

- date: `2026-06-07`
- team-side shadow cards: `0`
- reliever candidates scored: `0`
- conversion window: `8`
- dependency window: `5`

## Research Baseline

| Reference | Exact 1st | Top-2 | Top-3 |
| --- | --- | --- | --- |
| `E33 holdout` | 26.5% | 44.5% | 59.6% |

## Target-Date Shadow Check

| Team-side games | Exact 1st | Top-2 | Top-3 |
| --- | --- | --- | --- |
| 0 | N/A | N/A | N/A |

## Top Shadow Clusters

| Team | Opponent | Lead | Alt | Starter hook | Top-2 share |
| --- | --- | --- | --- | --- | --- |
| - | - | - | - | - | - |

## Top Shadow Features

- `sklearn` unavailable, so no feature ranking was produced.

## Read

- `E36 shadow` is not a live-model promotion. It is a board artifact for inspection.
- The shadow card is only meant to show:
  - who the `E33` stack thinks is first up
  - who the main alternate is
  - whether the starter hook and bullpen-shape context make the bridge risky or quiet
- Exact-name performance is still not good enough to call this solved, but the `E33` holdout rates are finally strong enough to inspect on game cards instead of burying the work in markdown only.
