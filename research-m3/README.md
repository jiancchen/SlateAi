# M3 Research Notes

This folder captures the current working notes for the MLB M3 model we are trying to build.

M3 is not intended to be M2 with weights moved into cleaner files. The current target is a contract-first, DB-backed baseball simulator that learns baseball-native game stories from replayable PA/pitch state, then prices markets from shared simulated worlds.

## Current Thesis

M3 should speak baseball before it speaks markets.

The model should learn states like starter stress, dead bats, traffic without conversion, two-out avalanche, bullpen debt, reliever collapse, PA volume spike, and chaos game risk. Moneyline, totals, F5, and player props should be downstream pricing views over those shared baseball states.

## Notes

- [Alpha Design](alpha-design.md)
- [Model Architecture Notes](model-architecture-notes.md)
- [Signal Discovery Notes](signal-discovery-notes.md)
- [Game Story Labels](game-story-labels.md)
- [M0-M2 Research Catalog For M3](m0-m2-research-catalog.md)
- [Run Dashboard Notes](run-dashboard-notes.md)
- [Tech Debt](tech-debt.md)

Related inventory and architecture docs:

- [Output Contract Inventory](../development-docs/mlb/models/mlb-m3-output-contract-inventory-2026-06-02.md)
- [Hierarchical Simulator Architecture](../development-docs/mlb/models/mlb-m3-hierarchical-simulator-architecture.md)
- [Alpha Feature Extraction Run Plan](../run-plans/mlb/2026-06-03-mlb-m3-alpha-feature-extraction-run-plan.md)

## North Star

The system should answer questions like:

- Is this game priced like normal baseball while the pregame state implies elevated chaos risk?
- Did yesterday create bullpen debt, lineup pressure, travel fatigue, or starter-path risk?
- Did a team look dead, or did they produce hard contact and traffic that failed to convert?
- Is the next game more likely to become a low-run script, normal script, high-run script, or bullpen-collapse script?
- Which market contracts benefit from that game shape after accounting for price?

## Build Principle

Contracts should be stable. Components should be disposable.

The architecture can keep tight semantic boundaries without locking us into a single model type. The game-shape model, starter path model, bullpen chain model, batter event model, PA-volume model, soft signal encoders, calibrators, selection policies, and presentation adapters should all be replaceable as long as they honor the contract at their boundary.
