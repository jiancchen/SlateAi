# MLB Side Backtest Report: May 16, 2026

## Summary

- Full-game record: `8-7` (`0.533`)
- First-five record: `8-7` (`0.533`)
- Bullpen-flip losses: `2`
- Starter-rescue wins: `2`

## Projection Accuracy

- Full-game hit-edge accuracy: `0.615`
- First-five hit-edge accuracy: `0.583`
- Team-hit MAE: `2.417`
- Full-game hit-efficiency MAE: `5.924`
- First-five hit-efficiency MAE: `7.331`

## What Went Right

- The board still found `8` full-game winners on a volatile `15`-game MLB slate.
- `Hit-production baseline` was the strongest recurring input on the day, going `6/8` full game and `6/8` in first five when it appeared in the top signal stack.
- `Lineup-vs-starter fit` showed up once in the top stack and won: `Orioles @ Nationals`, where Washington rolled `13-3`.
- The model's split-script idea held up better than the raw `8-7` record suggests.
  - Games flagged as `starter leverage > late hold` went `0.800` in first five and `0.600` full game.
  - Two picks lost the first five but still won the game late: `Brewers @ Twins` and `Reds @ Guardians`.
- The best clean wins were:
  - `Nationals over Orioles`, final `13-3`, first five `4-0`
  - `Phillies over Pirates`, final `6-0`, first five `5-0`
  - `White Sox over Cubs`, final `8-3`, first five `7-0`
  - `Mets over Yankees`, final `6-3`, first five `5-2`

## What Went Wrong

### 1. Bullpen flips were real

- `Marlins @ Rays`: picked `Rays`, got the first five right (`1-0`) and still lost the game `10-5`.
- `Red Sox @ Braves`: picked `Braves`, got the first five right (`2-1`) and still lost the game `3-2`.

These were not pure side-model misses. They were good early reads that broke once the game turned over.

### 2. Some picks violated the hit-edge discipline

Three losses came in games where the exported board already had the pick on the wrong side of the projected full-game hit edge:

- `Red Sox @ Braves`: picked `Braves` with a `-0.4` projected hit edge for the pick
- `Giants @ Athletics`: picked `Athletics` with a `-1.0` projected hit edge for the pick
- `Diamondbacks @ Rockies`: picked `Diamondbacks` with a `-2.6` projected hit edge for the pick

That is the cleanest model-discipline fix from the day: when the side pick and the projected traffic disagree, the side should be downgraded harder.

### 3. Strikeout-ceiling overperformed in the model and underperformed in reality

- `Strikeout ceiling` appeared in the top signal stack `6` times and only went `1/6` full game.
- It was part of the miss stack for:
  - `Blue Jays @ Tigers`
  - `Padres @ Mariners`
  - `Rangers @ Astros`
  - `Red Sox @ Braves`
  - `Giants @ Athletics`

That does not mean strikeouts do not matter. It does mean the board leaned too hard on strikeout shape without enough conversion pressure from lineup quality and late-game instability.

### 4. The model was too comfortable with a few "clean" favorites

The most important pure misses were:

- `Padres @ Mariners`
  - Pick: `Mariners`
  - Result: `Padres 7, Mariners 4`
  - First five: `Padres 5, Mariners 2`
  - This was the biggest clean miss because the model gave Seattle a real edge (`12.4`) with only moderate volatility (`66`), and San Diego still controlled the game early and late enough.

- `Blue Jays @ Tigers`
  - Pick: `Tigers`
  - Result: `Blue Jays 2, Tigers 1`
  - First five: `0-0`
  - This was a thinner, more coin-flip-style miss. The board already had only `58` confidence and `50` coin-flip pressure, so this is more of a "should stay small" game than a sharp predictive failure.

- `Rangers @ Astros`
  - Pick: `Rangers`
  - Result: `Astros 4, Rangers 1`
  - First five: `Astros 4, Rangers 0`
  - The board was already screaming volatility (`92`) and relief risk (`86.2`), so the miss matters less as a model mistake and more as confirmation that this type of read should not be treated like a core side.

## Best Takeaways For The Next Version

1. `Hit-production baseline` deserves more weight than `strikeout ceiling`.
2. If `projected hit edge` is against the side pick, confidence should be capped harder.
3. `Bullpen-flip` risk is real enough that strong first-five / weak full-game scripts should be separated more aggressively.
4. The board should keep exposing `starter window` vs `late hold` as separate products because the split mattered on May 16.
5. Games with `volatility >= 85` and `confidence < 65` should be treated more like watchlist or flip-risk material than standard side plays.
