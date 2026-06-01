# MLB-M2 Game-Shape Reality-Gap Branch

MLB-M2 is a draft parent cartridge branched from MLB-M0. It is not active yet.

The purpose is bigger than another confidence tweak: M2 must explain the likely shape of the game before it recommends a market. The model should identify when the data says one team is better but the actual baseball path is fragile: dead-early offense, one crooked inning, bullpen bridge failure, phase disagreement, weather carry, or traffic without conversion.

## Scope

- Full-game side and moneyline reads inherited from M0
- First-five timing reads inherited from M0
- Full-game, first-five, and late total reads inherited from M0
- First-inning timing inherited from M0
- Player prop and home-run context inherited from M0
- New game-shape/reality-gap read at `analysis.gameShape`
- New RF research lens inside the game-shape read
- MLB-RP36 relief addendum as a consumed input component

## What Changed From M0

M2 adds `models/mlb/cartridges/MLB-M2/lib/mlb-game-shape.js`.

That layer scores:

- `realityGapScore`: how much the raw projection may be lying about the game path
- `chaosScore`: crooked-inning, mistake, run-cluster, bullpen, and weather exposure
- `deadEarlyScore`: quiet first five, dead traffic, and weak conversion exposure
- `phaseSplitScore`: whether full-game, first-five, late, and bridge edges disagree
- `bullpenFlipScore`: how much the bridge can change the game after starters leave
- `starterControlScore`: whether the game can actually stay on the starter script

It also writes market implications for side, first five, total, and first inning. That is the main behavioral goal: M2 should stop pretending moneyline is always the best expression.

## RF Lens

The current RF evidence is mixed.

- Totals RF is the only research lane marked deployable in the existing MLB docs.
- Moneyline RF is not deployable.
- First-five RF is not deployable.
- First-inning RF is not deployable.

So M2 does not let RF pick games by itself. It uses RF as a nonlinear totals/game-shape check and exposes an `rfLens.impactScore` so we can measure whether RF actually helped.

## Activation Rule

M2 stays draft until it passes comparison against M0.

Minimum proof before activation:

- M2 can render the same app-facing match model contract as M0.
- M2 can run on the May 31 MLB slate without breaking existing outputs.
- M2-vs-M0 comparison shows where game-shape changes decisions.
- Postmortem settlement proves high reality-gap labels correlate with bad full-game ML, better F5/total/first-inning expressions, or clean passes.

## Known Gaps

- The RF lens uses documented research baselines, not a serialized production RF artifact yet.
- Reality-gap scoring is transparent but still unproven; it needs bucketed settlement.
- M2 should eventually persist game-shape outcomes into the warehouse so we can backtest the shape labels directly.
