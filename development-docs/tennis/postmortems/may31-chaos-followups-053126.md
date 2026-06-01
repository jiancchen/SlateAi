# May 31 Tennis Follow-ups

## P0: Split Winner Pick From Bet Lane Everywhere

The winner model went `5/8`, while the ML betting lane went `6/8`.

That is not a bug by itself, but it is dangerous if the site displays them as one idea. Every match detail should show:

- winner-model pick and confidence
- ML lane side, odds, model probability, implied probability, EV, and grade
- spread lane side/line/odds/probability
- O/U and first-set O/U separately

If the winner model and ML lane disagree, the UI should show a conflict badge instead of hiding the split.

## P0: Freeze Match O/U Until Rebuilt

Match O/U went `0/4` on May 31.

Immediate rule:

- Do not promote match O/U as a top value lane.
- Keep O/U rows visible as research/watch context only.
- Require expected-games logic to explain first-set shape, break frequency, hold/break profile, and likely set count before publishing a direction.

## P0: Join Kalshi Price-Path Grading Into Settlement

The Kalshi intramatch audit has candles and max-bid/max-trade context, but `postmatch-grades.json` still marks trade rows as `pending_price_path`.

Settlement should write, per candidate:

- entry ask
- max bid
- max traded price
- target hit
- 2x hit
- 2.5x hit
- 30c hit
- first-set stabilization flag
- final winner
- trade P/L if exits were staged

Do not treat a prediction-market trade as a match-winner pick. Grade the trade objective.

## P1: Rebuild Set-Win Rows Around Posted Prices

Set-win rows currently store projections like `Player A 82% / Player B 32%`, but they are not gradeable betting rows.

Needed:

- posted set-win odds by player
- implied probability
- model set-win probability
- EV/100
- actual set won yes/no

Until then, set-win belongs in analysis context, not value boards.

## P1: Use Upset Evidence More Aggressively

The three winner misses all had a version of "opponent is live enough":

- Fonseca over Ruud: enough serve and pressure resilience to be more than a spike candidate.
- Mensik over Rublev: five-set profile and early-set pressure mattered more than Rublev name stability.
- Kostyuk over Swiatek: return pressure and Swiatek break leakage mattered more than reputation.

Next model pass should add an upset-path score that is independent of market price:

- hold floor
- second-serve survival
- return-pressure edge
- recent opponent-adjusted form
- RG replay flow
- favorite break leakage
- first-set pressure likelihood

## P1: Make Standalone Value Backtest Match Run Settlement

`value_backtest.py` wrote May 31 rows but graded `0`, while `settle-model-run.mjs` graded ML/spread/O-U rows.

One grading contract should be canonical. Prefer the model-run settlement contract, then make the standalone backtest consume the same normalized rows.

## Keep

- TEN-T0 model-run settlement
- health gate with settled training labels
- SofaScore replay import
- Kalshi candle warehouse
- weather and rankings warehouse
- betting matrix lane separation

## Do Not Promote Yet

- match O/U
- set-win value rows without prices
- Kalshi trade rows until target-hit settlement is joined
- any winner confidence that disagrees with a stronger value-lane edge without a visible conflict badge
