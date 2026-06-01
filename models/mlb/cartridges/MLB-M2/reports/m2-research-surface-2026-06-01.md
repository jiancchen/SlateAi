# MLB-M2 Research Surface

Date: 2026-06-01

Status: draft comparison cartridge. MLB-M2 is not active betting advice.

## Purpose

M2 exists to explain game shape before choosing a market. It should show whether the likely game is a starter-control game, phase-split game, dead-zone game, bridge-collapse game, weather/carry chaos game, or live-only fork.

The site may display M2 diagnostics, but value rows must come from model-owned rows with explicit validation metadata.

## Current Surface

| Surface | State | Site Meaning |
|---|---:|---|
| Game-shape category | Active diagnostic | Explains the preferred market expression and phase path. |
| State formulas | Research-only | Stored formula rows exist, but May 31 holdout was not promotion quality. |
| Player identity curves | Research-only | Useful for prop triage, not a standalone betting model. |
| Pitcher-batter kernel | Candidate pocket | Top-collapse rows showed promise on tiny sample; not full-board yet. |
| F5 tail overlay | Candidate diagnostic | Helps explain over-tail, strand-tail, unsupported-over, and live-only fork shapes. |
| Value board | Guarded | UI may only filter model-owned value rows; it may not transform projections into EV. |

## Backtest Snapshot

- Baseline full-game side: 59.0% on 212 rows.
- M2 category lane: 62.6% on 195 graded lane rows.
- M2 allowed-side bucket: 67.5% on 40 rows.
- Starter-to-bullpen flip as F5 lane: 68.6% on 35 rows.
- Dead-zone timing/F5 lane: 70.6% on 17 rows.
- May 31 O/U stress benchmark: 5/5. This is tracked as a named stress set, not a blanket value-board claim.

## Holdout Reads

- State formula May 31: 18/120, 15.0%. Research-only.
- Pitcher-batter kernel top-collapse May 31: 4/6, 66.7%. Candidate pocket, tiny sample.
- Player hits May 31: 182/307, 59.3%. Diagnostic.
- Player total bases May 31: 179/307, 58.3%. Diagnostic.

## Value Row Proof Block

Every promoted value row must carry:

- `modelId`
- `lane`
- `marketType`
- `confidence`
- `requiredHitRate`
- `backtestBucket`
- `trustLabel`
- `valueGate`
- `gateReasons`
- `sourceArtifact`

Rows without those fields can be shown as research or context, but not as value bets.

## UI Display Rules

- Show game-shape story and phase map compactly.
- Show player identity and pitcher-batter kernel as diagnostics until promoted.
- Separate research-only rows visually from value rows.
- Never show UI-derived F5 O/U or F5 ML EV rows.

## Promotion Decision

No replacement lane is promoted from the current candidate stack. Keep MLB-M0 active. M2 can be shown as a draft comparison cartridge and used for research explanations.
