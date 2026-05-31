# May 30 Chaos Follow-ups

## What this slate says to build next

### P0: Keep the bookkeeping health gate
- Give every MLB game a unique `gameId`, including doubleheaders.
- Make sure closeout writes `data-private/history/mlb-results-2026-05-30.jsonl`.
- Make sure imported side boards actually flow into `mlb_side_backtests`.

Reason:
- today had `15` board picks
- side-prediction rows imported: `15/15`
- `mlb_side_backtests` rows: `15/15`

This path is now trustworthy for this day, but it needs to stay a hard pre-slate gate before any model lesson is applied.

### P0: Turn `dead_early_loss` into a positive market lane
This slate produced `3` side misses where the predicted team simply never got going:
- Marlins @ Mets, Cubs @ Cardinals, Yankees @ Athletics

That should become a modelable lane:
- suppress side confidence
- prefer `NRFI`
- prefer `pass`
- later test `F5 under` / dead-early totals when the market data is clean enough

### P1: Stop pick-first, veto-later
Today showed the flaw again:
- a side gets printed because paper strength says yes
- then we add warnings
- then we end up with “pass” language wrapped around a side anyway

The next selection order should be:
1. find a real positive thesis
2. map it to the best market expression
3. only then allow a side

If no positive thesis exists, the game should stay blank.

### P1: Keep the first-inning lane, but only as a timing model
The original lane finished coin-flip, and every miss was the same kind of miss:
- YRFI on games that stayed scoreless in the first
- several of those games still scored by the third

So the first-inning model should focus on:
- series-local dead-early suppression
- team scores-in-1st vs team allows-in-1st
- tiny pitcher-sample shrinkage
- recent top-order conversion, not just broad first-5 pressure

That lane is still worth keeping because the mistakes are interpretable.

### P1: Kill the generic total-bases prop lane
The model treated `Over 1.5 total bases` like a core edge and repeated it.
That is not a lane; that is spam with confidence labels.

Immediate rule:
- retire generic TB overs from live use
- do not show them as “core” until a much narrower lane proves itself

### P2: Build reason-coded dog lanes
This slate was not just favorites. The board actually took dogs too, but it still did not know **why** a dog was live.

The next dog lanes should be explicit:
- opponent dead-early
- opponent traffic-no-conversion
- opponent chaos gap
- snapback pressure
- same-series suppression

No dog pick should exist without one of those reasons.

## Concrete next coding tasks
1. Fix unique `gameId` generation for doubleheaders.
2. Audit why side backtests are not being written even after import/grade.
3. Create a dedicated `dead_early_loss` research pass from this date's label set.
4. Add `dead_early_loss` and `quiet_first3` as first-class market selectors, not just warnings.
5. Strip hitter props down to research-only while we rebuild the lane by prop type.

## What to keep
- the chaos/state tables
- the mistake-shape layer
- the story/phase labels
- the first-inning profile tables

Those are still the good parts. The failure was not the data collection. The failure was the decision layer sitting on top of it.
