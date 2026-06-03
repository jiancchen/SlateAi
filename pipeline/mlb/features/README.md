# MLB M3 Feature Layer

Version: 0.1.0

This folder is the forward home for M3 feature materialization. It is intentionally separate from raw ingestion and from the legacy M2 warehouse monolith.

## Boundary

Feature jobs may read canonical typed MLB tables from `data-private/warehouse/sports/mlb/sql-mlb.db` and write versioned feature/label outputs. They should not fetch raw sources directly, mutate raw canonical facts, or path-flip old `mlb_warehouse.py` logic.

Raw ingestion answers: what happened, from what source, as of when?

Feature materialization answers: what reusable, versioned signal can M3 train, backtest, simulate, or price from those facts?

## Initial Feature Families

These are candidates to rebuild from the useful ideas currently mixed into legacy M2 code:

- PA volume and lineup-order priors
- sample-size shrinkage and confidence weights
- player current-state residual features
- pitcher/batter pitch-mix matchup and state-memory features
- bullpen usage, chain, fatigue, and fragility features
- mistake-shape and chaos/regime features
- first-inning and F5 state features
- story/phase labels for backtesting and simulator supervision
- market context and mispricing labels

## Required Properties

Every feature job should define:

- feature set ID and version
- input table list and as-of cutoff
- evidence policy, baseline definitions, state-memory encoders, and coverage fields
- output table or artifact contract
- validator/report path
- backtest or calibration hook when labels are involved

## Non-Goals

- Do not move legacy M2 helpers here unchanged.
- Do not encode fixed feature weights as M3 truth.
- Do not make feature jobs depend on `data-private/warehouse/sports.db`.
- Do not let feature materialization replace raw ingestion provenance.
