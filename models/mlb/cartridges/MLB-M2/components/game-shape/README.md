# Game Shape Reality Gap

MLB-M2 adds this component because M0 can produce a confident side while the actual game shape is less stable than the side score implies.

This layer does not replace the winner model. It asks four separate questions:

- Do the full-game, first-five, late, and bridge phase edges point to the same team?
- Is the game exposed to crooked-inning chaos, warm carry, bullpen mistakes, or run clustering?
- Is the game exposed to dead-early traffic, quiet first five innings, or poor conversion?
- Does the random-forest research baseline add a useful nonlinear check, especially for totals?

The output lives at `analysis.gameShape`, `analysis.indicators.gameShape`, and `analysis.mlbProjection.gameShape`.

## Current RF Rule

The RF research layer is a lens, not an automatic pick engine.

- Totals RF history is the only lane marked deployable from the research notes.
- Moneyline, first-five, and first-inning RF history can flag disagreement, but cannot promote a bet by themselves.
- M2 must report RF impact separately so we can measure whether the RF view actually improves decisions.

## M2 Gate

If reality-gap score is high, the site should stop treating the moneyline as a complete answer. It should force the model to explain which market expression fits the game shape: full-game ML, first five, total, first inning, prop, or pass.
