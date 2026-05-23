# MLB Side Tier 1 Start 05-22-26

## What Was Implemented

Tier 1 is now started in the live MLB side model:

- high-volatility edge control
- starter-vs-late fragility penalty
- thin-support high-edge penalty
- risk-point-based pass classifier

The model now writes the following Tier 1 indicators into the analysis metadata:

- `tierOneRiskPoints`
- `tierOnePassFlag`
- `tierOneRiskFlags`
- `favoredSignalCount`
- `starterLateGap`
- `edgeHaircutApplied`

## Important Caveat

The current Tier 1 implementation should be treated as a **first live pass**, not as a finished improvement.

Two different evaluation modes were used here:

1. the earlier feature-roadmap research used archived frozen outputs and tested pass overlays on top of them
2. this implementation reruns the actual live model with Tier 1 logic turned on

That means the results below are useful, but they are **not** a perfect apples-to-apples isolation of the Tier 1 rule set.

## Direct Warehouse Comparison

### Baseline Reserve Window

- window: `2026-05-10` through `2026-05-15`
- model: `board-moneyline-v2`
- games: `75`
- full-game hit rate: `0.653`
- first-five hit rate: `0.600`

### Tier 1 Experimental Reserve Rebuild

- window: `2026-05-10` through `2026-05-15`
- model: `board-moneyline-tier1-v1`
- games: `75`
- full-game hit rate: `0.613`
- first-five hit rate: `0.573`

Interpretation:

- this reserve rebuild is **not** good enough to claim a clear win yet
- because this rebuild uses the current engine shape, not the exact frozen historical engine, it is better read as “first live implementation behavior” than a pure counterfactual

### Baseline Current Window

- window: `2026-05-16` through `2026-05-22`
- source: graded JSONL archive
- games: `93`
- full-game hit rate: `0.581`
- first-five hit rate: `0.452`

### Tier 1 Experimental Current Rebuild

- window: `2026-05-16` through `2026-05-22`
- model: `board-moneyline-tier1-v1`
- games: `93`
- full-game hit rate: `0.559`
- first-five hit rate: `0.452`

Interpretation:

- the first live Tier 1 cut is slightly **too aggressive** right now
- it is not yet a production upgrade to raw side accuracy

## Pass Classifier Read

For the current rebuilt window (`2026-05-16` through `2026-05-22`):

- `tierOnePassFlag = true`
  - games: `44`
  - full-game hit rate: `0.545`
- `tierOnePassFlag = false`
  - games: `49`
  - full-game hit rate: `0.571`

Interpretation:

- the pass bucket is directionally weaker than the kept bucket
- but the separation is still too small to celebrate
- this means Tier 1 is correctly starting to isolate shaky environments, but the thresholds still need work

## What This Means

Tier 1 is now doing the right **kind** of work:

- shaving fake giant edges
- flagging games where starter trust outruns late-game trust
- forcing more explicit pass behavior

But the first live version is still overfiring.

The next move should be:

1. keep the new indicators and risk metadata
2. soften the hard `Pass` behavior into ranking pressure first
3. tune thresholds against the reserve/current windows again
4. then add opponent-adjusted recent form before making Tier 1 stricter

## Best Immediate Follow-Up

The best immediate follow-up is:

- keep `tierOneRiskPoints` and `edgeHaircutApplied`
- treat `tierOnePassFlag` more like `watchlist / major safety penalty` than a hard pass
- retune the main pass condition before locking it into the live board
