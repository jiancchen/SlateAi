# MLB-M2 Lane Promotion Template

Use this file when promoting one lane, not the whole cartridge.

## Candidate

- Lane:
- Market:
- Model change:
- Source artifact:
- Training data through:
- Holdout date:

## Required Proof

- Walk-forward hit rate:
- Walk-forward ROI when priced:
- Holdout hit rate:
- Required hit rate by price bucket:
- Backtest bucket:
- Sample size:
- Failure buckets:

## Value Row Contract

Every published value row must include:

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

## UI Contract

- The UI may sort and filter.
- The UI may show context and diagnostics.
- The UI may not create EV, first-five ML, first-five O/U, or full-total value rows from projections.

## Decision

- Promote:
- Keep research-only:
- Roll back:

## Notes

- What improved:
- What got worse:
- What can break next:
