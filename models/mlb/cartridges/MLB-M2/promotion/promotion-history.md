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

## 2026-06-01 operator override

Decision: promote MLB-M2 to active-inspection for the June 1 public slate.

Reason:

- The operator wants the live site to show the M2 game-shape/reality-gap surface now, even though the lane proof is not complete.
- MLB-M0 remains the baseline comparison target.
- This is not a lane promotion. Risky value-board rows still require cartridge-owned gates and settlement proof.

Current allowed status:

- Active public cartridge: MLB-M2.
- Baseline comparison cartridge: MLB-M0.
- Game shape/reality gap: visible.
- F5/totals value: visible only when emitted by the cartridge with gates.
- RF/state/player identity layers: diagnostics unless a later promotion record graduates them.
