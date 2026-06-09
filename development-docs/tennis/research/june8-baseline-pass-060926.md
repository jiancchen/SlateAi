# June 8 Tennis Baseline Pass

## Why

June 8 made it clear that the current tennis output is mostly a market-following slate annotator. This pass creates a reproducible baseline harness before changing TEN-T0 selection behavior.

Run:

```bash
npm run data:baseline:tennis -- --date 2026-06-08
```

Generated artifacts:

- `data-private/reports/tennis-baseline-pass-2026-06-08.json`
- `data-private/reports/tennis-baseline-pass-2026-06-08.md`

## June 8 Result

| Strategy | Graded | Record | Hit Rate | Flat ROI |
|---|---:|---:|---:|---:|
| Published pick | 63 | 40-23 | 63.5% | -3.7% |
| Market favorite | 63 | 40-23 | 63.5% | -4.2% |
| Rank favorite | 38 | 22-16 | 57.9% | -1.9% |
| Adjusted-form favorite | 30 | 18-12 | 60.0% | +5.0% |
| Serve/return favorite | 27 | 15-12 | 55.6% | +7.3% |
| Two-signal consensus | 29 | 18-11 | 62.1% | +8.6% |
| Three-signal consensus | 11 | 8-3 | 72.7% | +18.8% |
| Market + two supports | 18 | 13-5 | 72.2% | +5.7% |
| Published + two supports | 18 | 13-5 | 72.2% | +5.7% |

## Read

- Published picks and market favorites were effectively the same: both finished `40-23`.
- Market-only rows and warehouse-joined rows performed almost identically, so joined data did not create enough lift by itself.
- Raw rank favorite was not enough; challenger and WTA-125 rankings are too incomplete/noisy for blind use.
- Adjusted form and serve/return signals were not high hit-rate signals alone, but they created useful price selectivity.
- The first promising baseline gate is `market/published pick + at least two independent supports` from rank, adjusted form, and serve/return.

## Baseline Policy Candidate

Treat a tennis row as publishable prediction only when:

- The row has a settled moneyline/prediction-market price.
- The selected side is not merely a market favorite.
- At least two non-market signals agree: rank favorite, adjusted-form favorite, serve/return favorite.
- Missing-rank or missing-serve rows stay watch-only unless form plus another typed source agrees.

This is not promoted yet. It needs forward testing across the next several slates with the new `data:baseline:tennis` harness.
