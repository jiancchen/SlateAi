# Tennis Model Ideation Guardrails

Use this while discussing the replacement tennis model. It keeps model design separate from the broken `TEN-T0` surface and the still-dirty warehouse.

## Current State

- Model ideation is allowed.
- Model build, training, backtest, and publish are blocked.
- The current DB has not been cleaned.
- `TEN-T0` is archived and can only be used as forensic evidence.
- Existing prediction rows are not valid performance truth.

## Safe Discussion Topics

- The prediction unit: match winner, set/game totals, spread, market-watch, or no-bet recommendation.
- The intended output contract: probability, fair price, edge, confidence, rationale, or abstain.
- The settlement contract needed for each possible lane.
- Feature families worth auditing: TennisLive match context, player form, replay-derived stats, H2H rows, market prices, source freshness, and tournament/surface context.
- What evidence a row must have before it can enter training or inference.

## Unsafe Shortcuts

- Do not use TEN-T0 decisions as labels.
- Do not use market-only rows as predictions.
- Do not evaluate performance while `settlement_ready_rows = 0`.
- Do not trust a date for current publish while source freshness is blocked.
- Do not blend DraftKings/Robinhood/Kalshi market rows into canonical match rows.
- Do not auto-merge player identities without a reviewed rule.

## Minimum Contracts To Define

Before implementation, define:

1. Canonical match contract.
2. Canonical participant/player contract.
3. Market snapshot contract.
4. Feature-time cutoff contract.
5. Source freshness contract.
6. Result/settlement contract.
7. Prediction-row contract.
8. Public export contract.

## First Model Design Question

Start with the prediction contract, not the algorithm:

What is the exact decision the model is allowed to make, what source evidence must exist before it can make that decision, and how will the row settle later?
