# MLB-SP1 Shadow Backtest 2026-06-13

- Rows: 30
- Matched actual rows: 30
- Model versions: MLB-SP1.2026-06-15.v0.1
- Avg starter runs allowed: 2.63
- Avg starter hits allowed: 5.07

## Directional Scores

- Collapse risk: 6/8 (75%)
- Runs delta: 3/8 (37.5%)
- Hits delta: 12/18 (66.7%)
- HR delta: 15/23 (65.2%)

## Correlations

- Collapse risk -> starter runs allowed: 0.297
- Collapse risk -> outs recorded: -0.175
- Expected run delta -> starter runs allowed: 0.297
- HRForce -> starter runs allowed: -0.131

## Collapse Risk Buckets

| Bucket | Rows | Collapse % | Survive % | Avg RA | Avg H | Avg HR | Avg Outs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| elevated | 2 | 50 | 50 | 2.5 | 5 | 1.5 | 16 |
| high | 1 | 100 | 0 | 6 | 10 | 1 | 17 |
| low | 7 | 28.6 | 57.1 | 2.29 | 5.43 | 0.71 | 17.3 |
| neutral | 20 | 45 | 50 | 2.6 | 4.7 | 0.85 | 15 |

## Miss Samples

- High-risk survivals: 0
- Low-risk collapses: 4
- Run-delta misses: 5
- Missing actual pitcher matches: 0

Promotion read: shadow only. Use a larger settled window before lane promotion.

