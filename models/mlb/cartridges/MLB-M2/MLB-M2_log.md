# MLB-M2 Log

This log records model and warehouse changes that matter to MLB-M2. M2 is a draft branch from MLB-M0, not the active MLB model.

## 2026-05-31 - Draft Cartridge Scaffolded From MLB-M0

Created a full MLB-M2 parent cartridge with the same app and publish contract as MLB-M0.

Implemented:

- `models/mlb/cartridges/MLB-M2/` scaffolded from current MLB-M0.
- `models/mlb/registry.json` registers MLB-M2 as `draft` and `basedOn: MLB-M0`.
- `models/mlb/app-model.js` can resolve the MLB-M2 app adapter without making M2 active.

Current trust level:

- Good for isolated M2 development.
- Not active for public predictions.
- Must pass M0-vs-M2 comparison before activation.

## 2026-05-31 - Game-Shape Reality-Gap Layer

Added `lib/mlb-game-shape.js`.

Why it exists:

M0 can say a side is strong while the real game shape is fragile. M2 has to show the gap between raw data confidence and baseball reality: first-five timing, bridge innings, conversion failure, one bad inning, bullpen volatility, weather carry, and market-expression fit.

Implemented:

- `analysis.gameShape`
- `analysis.indicators.gameShape`
- `analysis.mlbProjection.gameShape`
- Phase map: full-game traffic, first five, late, bridge
- Scores: reality gap, chaos, dead-early, phase split, bullpen flip, starter control
- Market implications: side, first five, total, first inning

Current trust level:

- Good as a transparent diagnostic.
- Not proven as a betting edge until settled by bucket.

Gate:

High reality-gap games should not promote blind full-game moneyline. They must name the cleaner lane or pass.

## 2026-05-31 - RF Research Lens

Added the RF lens to the M2 game-shape read.

Current rule:

- Totals RF research is usable as a nonlinear check.
- Moneyline RF remains advisory only.
- First-five RF remains advisory only.
- First-inning RF remains advisory only.

Reason:

The research docs show RF totals as the only deployable lane so far. M2 should measure RF impact, not pretend RF solved the whole board.

Next proof required:

- Store M2 game-shape labels in run artifacts.
- Compare M0 vs M2 on May 31 and the next completed MLB slate.
- Backtest whether high `realityGapScore` predicts ML misses, total chaos, or better first-five/first-inning expressions.
