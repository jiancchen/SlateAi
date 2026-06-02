# Tennis June 1 Deep Dive

## Scope

Postmatch review of the eight June 1 Roland Garros singles matches. The goal was not to explain away misses with "upsets happen"; it was to find where the warehouse already had enough information to improve the model or at least force a pass.

## Headline

June 1 was mostly an ML/value problem, not a total collapse of every tennis lane.

- Published/site ML leans went 3/8.
- Recomputed multimodel ML picks went 4/8.
- Published match O/U direction went 5/8.
- Published first-set O/U direction went 4/6 on non-pass rows.
- Published spread direction went 4/8.

The model had some game-shape reads right, especially extended men's matches and early-set totals, but it still promoted or tolerated too many late-round ML/value rows where the pressure profile said pass.

## Data Issues Found

### Player-page clutch data existed but was not fully explainable

SofaScore player-page stats were captured around 2026-06-01 08:25Z, before the June 1 slate. The data included clay BP saved, BP converted, tiebreak win percentage, first-serve won, second-serve won, double faults, and computed hold estimate.

The diff features exist in the June 1 training artifact for most matches, but raw p1/p2 player-page fields are not persisted in a readable way. That makes auditing much harder and led earlier scans to show `N/A` even when diff features existed.

### Published value rows were not fully using replay flow

Several published O/U rows said `hold avg N/A` and `return games won N/A` even when the training rows had prior replay flow such as hold rate, break rate, long-service hold rate, late-service hold rate, and long/late return break rate.

This is a UI/value-board wiring issue: derivative explanations should use the training-row replay features instead of falling back to missing text.

### Prediction-market report quality was weak

The June 1 Kalshi spike report had current candidates with missing `matchId`, `match`, entry ask, projected exit, and target-hit fields. That means the trade-to-sell lane could not be trusted as a full match-level recommendation surface for this slate.

## Match Reads

### Anastasia Potapova vs Anna Kalinskaya

Actual: Kalinskaya won 4-6 6-2 7-6.

What the model saw correctly:

- Potapova had the stronger hold/service baseline.
- Potapova had strong clay win rate and BP saved edge.
- O/U Over and first-set Over were correct.

What should have mattered more:

- Kalinskaya had much better BP conversion on clay: 59.5% vs 49.8%.
- Kalinskaya had a much better clay tiebreak profile: 100% vs 66.7%.
- Kalinskaya had better prior long-return and late-return break rates.
- Potapova had risk labels already: error-control risk, hold risk, closeout risk.

Better decision:

Pass Potapova ML. If forced, Kalinskaya live/set-win was the cleaner expression than Potapova pre-match ML.

### Madison Keys vs Diana Shnaider

Actual: Shnaider won 6-3 3-6 6-0.

What the model saw correctly:

- Keys had the stronger service baseline and hold estimate.
- O/U Over was correct.

What should have mattered more:

- Keys had a severe error-control score: 37.5.
- Shnaider had much stronger return-game disruption in the Roland Garros flow sample.
- Shnaider had 100% prior late-service hold rate versus Keys 71.4%.
- The market was close enough that Keys should not have been pushed to a high-confidence favorite.

Better decision:

Pass Keys ML. Shnaider spread/set-win was the better late-round weakness expression. A low error-control favorite should not be allowed to carry a clean ML label in Round 4.

### Frances Tiafoe vs Matteo Arnaldi

Actual: Arnaldi won 7-6 6-7 3-6 7-6 6-4.

What the model saw correctly:

- Match O/U Over was correct.
- First-set O/U Over was correct.
- This was a long, pressure-heavy best-of-five match.

What should have mattered more:

- Arnaldi had better error control, hold metric, second-serve metric, and closeout metric.
- Arnaldi had better long-return break rate: 45.5% vs Tiafoe 27.3%.
- Arnaldi had better late-return break rate: 27.3% vs Tiafoe 14.3%.
- Arnaldi had the much better clay tiebreak profile: 58.3% vs Tiafoe 25.0%.
- Three tiebreaks were exactly the match shape where this should matter.

Better decision:

Do not promote Tiafoe ML. The good model expression was Over / first-set Over, not side. Arnaldi set-win or live dog was a better pressure-lane read.

### Juan Manuel Cerundolo vs Matteo Berrettini

Actual: Berrettini won 6-3 7-6 7-6.

What the model over-weighted:

- Cerundolo clay form and opponent-adjusted recent form.

What should have mattered more:

- Berrettini had the better computed clay hold: 84.4% vs Cerundolo 76.8%.
- Berrettini had the better first-serve won rate: 74.2% vs 68.3%.
- Berrettini had the better second-serve won rate: 56.0% vs 54.3%.
- Berrettini had better Roland Garros prior hold and late-service hold rates.
- Cerundolo had massive two-day time load: 358.2 minutes.
- Cerundolo's edge was clay volume; Berrettini's edge was the late-round serve floor.

Better decision:

Flip or pass the Cerundolo ML value row. In later rounds, serve-floor plus tiebreak survival should beat broad clay-form volume when the projected match has tiebreak risk.

### Felix Auger-Aliassime vs Alejandro Tabilo

Actual: Auger-Aliassime won 6-3 7-5 6-1.

What failed:

- Published site layer picked Tabilo because the multimodel ensemble and older score model disagreed.
- Replay/metric coverage was missing, but the slate still showed a bet-grade ML value row.
- O/U Over and first-set Over were both wrong.

What should have mattered more:

- When coverage is thin and the market favorite is plausible, a model-split underdog should be a pass.
- Same-day player-page stats favored Auger-Aliassime in BP conversion and tiebreak profile.

Better decision:

No ML bet, or lean back to the market favorite until replay/service data exists. A model-split row with missing warehouse flow should never be bet-grade in Round 4.

### Flavio Cobolli vs Zachary Svajda

Actual: Cobolli won 6-2 6-3 6-7 7-6.

What worked:

- Favorite ML direction was correct, but the price was too expensive.
- Match O/U Over was correct.
- First-set Under was correct.
- Svajda set-win risk was real, even though Svajda was not a clean upset.

Better decision:

This was handled mostly correctly: pass favorite ML tax, use derivative/game-shape lanes.

### Aryna Sabalenka vs Naomi Osaka

Actual: Sabalenka won 7-5 6-3.

What worked:

- Favorite direction was correct.
- Favorite-tax warning was correct.
- Match O/U Over was correct by half a game.

What should be watched:

- Osaka's BP conversion and tiebreak profile were live-pressure reasons not to overstate spread confidence.
- Sabalenka's return-pressure edge was enough to keep the ML side correct.

Better decision:

Pass expensive ML, consider only derivative/live entries.

### Maja Chwalinska vs Diane Parry

Actual: Chwalinska won 6-3 6-2.

What worked:

- ML direction was correct.
- First-set Under was correct.

What failed:

- Match O/U Over was wrong.

What should have mattered more:

- Chwalinska had a huge BP conversion edge: 61.0% vs 37.5%.
- Chwalinska had a huge second-serve edge.
- Parry had weaker error control and weaker return-pressure profile.

Better decision:

Chwalinska side/spread/under compression, not match Over. Big return-conversion edge plus opponent second-serve weakness can shorten matches instead of extending them.

## Candidate Rules To Backtest

### 1. Later-Round ML Veto

For Round 4 or later, do not mark an ML row as bet-grade if any two are true:

- Model split exists.
- Replay/service coverage is missing.
- Pick side has error-control risk.
- Pick side has time-on-court load.
- Pick side is priced above 70% implied with small payout.
- Opponent has better BP conversion or tiebreak profile.

June 1 effect: would have removed Tabilo, Tiafoe, Cerundolo, Potapova, and Keys from blind ML consideration.

### 2. Pressure-Dog Upgrade

Upgrade dog spread, set-win, or live-entry watch when the underdog has at least two:

- Better error control by 4+ points.
- Better BP conversion by 5+ points.
- Better tiebreak rate by 15+ points.
- Better long-return break rate by 10+ points.
- Better late-return break rate by 10+ points.

June 1 examples: Kalinskaya, Shnaider, Arnaldi.

### 3. Serve-Floor Override

In ATP best-of-five, if the underpriced side has better first-serve won, second-serve won, computed hold, and late-service hold, downgrade clay-form volume from the other side.

June 1 example: Berrettini over Cerundolo.

### 4. Compression Under Rule

Do not treat every competitive match as an Over. If one player owns a large BP conversion edge and the opponent has weak second serve/error control, test straight-set compression and spread before match Over.

June 1 example: Chwalinska-Parry.

### 5. Value-Board Data Integrity Gate

Block O/U and first-set O/U confidence above 55 when the explanation says `hold avg N/A` or `return games won N/A`, unless the training row has no replay-flow data at all and the row is explicitly marked low-coverage.

June 1 reason: derivative rows were making confident claims while hiding available flow data.

### 6. Kalshi Candidate Health Gate

A prediction-market candidate should fail health if any of these are missing:

- `matchId`
- `match`
- entry ask
- projected exit
- target-hit estimate

June 1 reason: the Kalshi report surfaced candidate rows with missing match and price fields.

## Practical Improvement

The next model improvement should not be another raw probability feature. It should be a lane selector:

- ML only when late-round veto is clean.
- Dog spread/set-win/live-entry when pressure-dog upgrade fires.
- Match O/U only after separating extension risk from compression risk.
- First-set O/U only when first-set sample or replay-flow proxy is present.
- Kalshi only when match and price mapping are complete.

