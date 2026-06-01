# MLB-M2 Promotion History

## 2026-06-01

Decision: no lane promoted.

Reasons:

- State formula rows failed the May 31 holdout badly.
- Pitcher-batter kernel top-collapse was promising but tiny-sample.
- Player identity rows are useful diagnostics, not a standalone value lane.
- The May 31 F5 value-board failure came from UI-side projection transformation, so the first fix is a gate, not a new promoted model.

Current allowed status:

- Game shape: display diagnostic.
- F5 tail overlay: display diagnostic.
- Pitcher-batter kernel: candidate pocket.
- State formulas: research-only.
- Player identity: research-only.
- Value rows: model-owned rows only.
