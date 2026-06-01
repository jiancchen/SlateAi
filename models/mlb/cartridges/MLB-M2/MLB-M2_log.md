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

## 2026-06-01 - Game-Shape Categories + Backtest Harness

Replaced the first vague M2 shape read with a concrete category contract.

Implemented:

- `analysis.gameShape.category`
- `analysis.gameShape.laneMap`
- `analysis.gameShape.inningMap`
- compact indicator fields for `category`, `bestExpression`, and `categoryConfidence`
- `models/mlb/cartridges/MLB-M2/research/game_shape_backtest.py`
- `models/mlb/cartridges/MLB-M2/reports/game-shape-backtest-2026-05-10-to-2026-05-31.md`

Current category set:

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

Backtest result on canonical settled rows from 2026-05-10 through 2026-05-31:

- Baseline full-game side: 59.0% on 212 rows.
- Baseline first-five side: 52.8% on 212 rows.
- M2 allowed-side bucket: 67.5% on 40 rows.
- M2 category lane hit: 62.6% on 195 graded lane rows.
- Starter-to-bullpen flip F5 lane: 68.6% on 35 rows.
- Dead-zone timing/F5 lane: 70.6% on 17 rows.

Crazy-idea walk-forward models were also tested:

- RF lane chooser: 53.4% on action rows; F5 sublane 62.5%.
- Gradient lane chooser: 53.9% on action rows; F5 sublane 65.0%, high-total sublane 60.6%.
- Logistic lane chooser: failed the test at 47.4% and should not be promoted.

Rule sweeps surfaced concrete sublanes worth future testing:

- `starter_control_score >= 55` hit 77.8% on full-game side rows.
- `phase_split_score >= 55` hit 66.7% on F5 side rows.
- `chaos_score >= 70` produced high-total shape 62.8% and a much higher YRFI rate than baseline.
- `pick_lineup_conversion <= 25` improved model F5 total rows.

Current interpretation:

M2 has a useful lane-separation signal, especially for deciding when a side should become F5/timing or total shape. It is not ready to activate as a full automatic betting engine. The next proof is to store M2 categories in daily run artifacts and settle them date by date.
