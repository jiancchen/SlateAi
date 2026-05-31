# MLB Hits Shadow Bundle — May 29, 2026

This is a **shadow-only** bundle test. Nothing in here changes the live board. The goal is to see whether the first useful xBA gate gets cleaner once we add opponent-strength history on top of `xBA + sweet-spot + fit`.

- sample: `256` historical hits bets
- base hit rate: `19.1%`

## Bundle Results

| Gate | Sample | Hit rate |
| --- | --- | --- |
| Baseline hits overs | 256 | 19.1% |
| xBA Q4 + sweet-spot Q4 + fit >= +4.0 | 12 | 25.0% |
| Bundle + weighted hits/PA Q4 | 3 | 33.3% |
| Bundle + hits/PA vs winning opps Q4 | 3 | 33.3% |
| Bundle + positive strength delta | 4 | 25.0% |

## Read

- `7d xBA` Q4 threshold: `0.339`
- `7d sweet-spot` Q4 threshold: `41.1%`
- weighted hits/PA Q4 threshold: `0.303`
- hits/PA vs winning opponents Q4 threshold: `0.333`
- This remains a shadow experiment only. If one of these bundles materially improves rate without collapsing the sample, it graduates to a larger backtest before any live deployment.

