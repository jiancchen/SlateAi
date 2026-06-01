# Game Shape Reality Gap

MLB-M2 adds this component because M0 can produce a confident side while the actual game shape is less stable than the side score implies.

This layer does not replace the winner model. It asks four separate questions:

- Do the full-game, first-five, late, and bridge phase edges point to the same team?
- Is the game exposed to crooked-inning chaos, warm carry, bullpen mistakes, or run clustering?
- Is the game exposed to dead-early traffic, quiet first five innings, or poor conversion?
- Does the random-forest research baseline add a useful nonlinear check, especially for totals?

The output lives at `analysis.gameShape`, `analysis.indicators.gameShape`, and `analysis.mlbProjection.gameShape`.

## Category Contract

M2 now returns a concrete `category` object instead of a vague warning flag.

The current category set is:

- Clean phase stack
- Early-pressure side
- Starter-to-bullpen flip
- Late-rescue side
- Dead-zone side
- Favorite conversion trap
- Crooked-inning game
- Starter-duel under
- Underdog pressure lane
- Weather-carry chaos
- Balanced traffic game

Each category must name:

- `bestExpression`: the preferred market lane, such as full-game side, first five, total, first inning, prediction-market spike, or live-only.
- `laneMap`: side, first-five, total, first-inning, and live interpretation.
- `inningMap`: expected shape for innings 1-2, 3-5, 6-7, and 8-9.
- `diagnostics`: phase ownership, conversion gaps, opponent chaos gap, and projected hit edge.

## Current RF Rule

The RF research layer is a lens, not an automatic pick engine.

- Totals RF history is the only lane marked deployable from the research notes.
- Moneyline, first-five, and first-inning RF history can flag disagreement, but cannot promote a bet by themselves.
- M2 must report RF impact separately so we can measure whether the RF view actually improves decisions.

## M2 Gate

If reality-gap score is high, the site should stop treating the moneyline as a complete answer. It should force the model to explain which market expression fits the game shape: full-game ML, first five, total, first inning, prop, prediction-market spike, live-only, or no pregame ML.

## Current Backtest Artifact

Run:

```bash
python3 models/mlb/cartridges/MLB-M2/research/game_shape_backtest.py --start 2026-05-10 --end 2026-05-31
```

Current draft result:

- Baseline full-game side: 59.0% on 212 rows.
- M2 allowed-side bucket: 67.5% on 40 rows.
- M2 category lane hit: 62.6% on 195 graded lane rows.
- Starter-to-bullpen flip: F5 lane hit 68.6% on 35 rows.
- Dead-zone side: F5/timing lane hit 70.6% on 17 rows.
