# Tennis Baseline Pass - 2026-06-08

## Summary

- Rows: 81
- Settled: 63
- Pending/live: 18
- Current published pick: 40/63 (63.5%)
- Market favorite: 40/63 (63.5%)
- Rank favorite: 22/38 (57.9%)
- Form favorite: 18/30 (60.0%)
- Serve/return favorite: 15/27 (55.6%)

## Strategy Table

| Strategy | Candidates | Graded | Hits | Misses | Hit Rate | ROI | Brier | Log Loss |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| publishedPick | 81 | 63 | 40 | 23 | 63.5% | -3.7 | 0.2368 | 0.6657 |
| marketFavorite | 81 | 63 | 40 | 23 | 63.5% | -4.2 | 0.2396 | 0.6716 |
| rankFavorite | 46 | 38 | 22 | 16 | 57.9% | -1.9 | n/a | n/a |
| formFavorite | 34 | 30 | 18 | 12 | 60.0% | 5 | n/a | n/a |
| serveReturnFavorite | 29 | 27 | 15 | 12 | 55.6% | 7.3 | n/a | n/a |
| consensus2 | 31 | 29 | 18 | 11 | 62.1% | 8.6 | n/a | n/a |
| consensus3 | 12 | 11 | 8 | 3 | 72.7% | 18.8 | n/a | n/a |
| marketPlusAnySupport | 40 | 34 | 21 | 13 | 61.8% | -6 | 0.2473 | 0.6905 |
| marketPlusTwoSupport | 19 | 18 | 13 | 5 | 72.2% | 5.7 | 0.2213 | 0.6326 |
| marketNoOpposition | 21 | 17 | 11 | 6 | 64.7% | -4.5 | 0.2445 | 0.6849 |
| publishedPlusTwoSupport | 20 | 18 | 13 | 5 | 72.2% | 5.7 | 0.2204 | 0.6323 |

## Current Pick Buckets

### byDepth

| Bucket | Settled | Hits | Misses | Hit Rate |
|---|---:|---:|---:|---:|
| Market only | 33 | 21 | 12 | 63.6% |
| Warehouse joined | 30 | 19 | 11 | 63.3% |

### byTour

| Bucket | Settled | Hits | Misses | Hit Rate |
|---|---:|---:|---:|---:|
| ATP Challenger | 38 | 25 | 13 | 65.8% |
| WTA | 25 | 15 | 10 | 60.0% |

### bySurface

| Bucket | Settled | Hits | Misses | Hit Rate |
|---|---:|---:|---:|---:|
| Clay | 36 | 24 | 12 | 66.7% |
| Grass | 27 | 16 | 11 | 59.3% |

### byProvider

| Bucket | Settled | Hits | Misses | Hit Rate |
|---|---:|---:|---:|---:|
| DraftKings Sportsbook | 59 | 37 | 22 | 62.7% |
| Robinhood prediction market | 4 | 3 | 1 | 75.0% |

### byConfidence

| Bucket | Settled | Hits | Misses | Hit Rate |
|---|---:|---:|---:|---:|
| 60-64 | 16 | 10 | 6 | 62.5% |
| 50-54 | 15 | 10 | 5 | 66.7% |
| 55-59 | 11 | 7 | 4 | 63.6% |
| 70-74 | 9 | 6 | 3 | 66.7% |
| 65-69 | 7 | 4 | 3 | 57.1% |
| 80+ | 4 | 3 | 1 | 75.0% |
| 75-79 | 1 | 0 | 1 | 0.0% |

### byMarketImplied

| Bucket | Settled | Hits | Misses | Hit Rate |
|---|---:|---:|---:|---:|
| 55-64% | 26 | 18 | 8 | 69.2% |
| 65-74% | 22 | 11 | 11 | 50.0% |
| 45-54% | 9 | 6 | 3 | 66.7% |
| 75%+ | 5 | 4 | 1 | 80.0% |
| <45% | 1 | 1 | 0 | 100.0% |

## Disagreements

| # | Match | Published | Market | Rank | Form | Serve/Return | Winner |
|---:|---|---|---|---|---|---|---|
| 53 | Thanasi Kokkinakis vs Marcelo Tomas Barrios Vera | Marcelo Tomas Barrios Vera | Thanasi Kokkinakis |  |  |  | Thanasi Kokkinakis |
| 80 | Katarzyna Kawa vs Lisa Pigato | Katarzyna Kawa | Lisa Pigato | Lisa Pigato |  |  | Katarzyna Kawa |

## Notes

- `publishedPick` is the pick emitted in the day module.
- `marketFavorite` uses normalized implied probability from the available moneyline/prediction-market prices.
- `rankFavorite`, `formFavorite`, and `serveReturnFavorite` are simple baselines from joined participant detail and TennisLive serve/return stats; they are intentionally not optimized.
- Pending/live rows are excluded from hit-rate, Brier, log-loss, and ROI.
