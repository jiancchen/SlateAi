# MLB-M2 Changelog

## MLB-M2.2026-06-14.v0.3 - Side/Tail Coherence Plan

Status: model documentation and addendum scaffold. No production scoring override is promoted by this changelog entry.

Why this version exists:

- The recent YRFI lane is working well enough to preserve and study.
- The failure pattern is side/tail contradiction: some side reads still underweight the same run-carry, starter-fragility, and first-inning pressure signals that correctly promote YRFI or overs.
- The model needs a dedicated starter profile addendum so pitcher shape is not split across isolated notes, cards, and UI explanations.

Version rules:

- YRFI strength is treated as evidence of useful first-inning and run-carry signal, not as proof that every correlated side should be upgraded.
- HRForce >= 1.5 must influence pitcher expected hits/runs/HR and batter expected production when game-window carry persists.
- HRForce >= 1.7 blocks casual unders unless starter, lineup, bullpen, park, and market context all support suppression.
- Full-game ML confidence is capped or demoted when the side needs starter suppression but ENV1/SP1/RP2 point to run-tail risk.
- Full-game side, F5 side, late side, bridge edge, projected runs, and total tail must be reconciled before public confidence can be promoted.
- `Swingy 52` remains valid for true watch/pass games, but separated all-phase edges should not be stuck at 52.

Addendum introduced:

- `MLB-SP1`: starter pitcher profile addendum design scaffold.
