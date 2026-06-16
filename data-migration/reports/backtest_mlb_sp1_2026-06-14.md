# MLB-SP1 Shadow Backtest 2026-06-14

- Rows: 28
- Matched actual rows: 28
- Model versions: MLB-SP1.2026-06-15.v0.1
- Avg starter runs allowed: 2.79
- Avg starter hits allowed: 5.93

## Directional Scores

- Collapse risk: 4/8 (50%)
- Runs delta: 6/16 (37.5%)
- Hits delta: 6/19 (31.6%)
- HR delta: 15/21 (71.4%)

## Correlations

- Collapse risk -> starter runs allowed: -0.115
- Collapse risk -> outs recorded: -0.31
- Expected run delta -> starter runs allowed: -0.122
- HRForce -> starter runs allowed: 0.185

## Collapse Risk Buckets

| Bucket | Rows | Collapse % | Survive % | Avg RA | Avg H | Avg HR | Avg Outs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| elevated | 10 | 60 | 30 | 2.6 | 5.3 | 0.9 | 15.2 |
| high | 1 | 100 | 0 | 2 | 3 | 0 | 7 |
| low | 7 | 57.1 | 42.9 | 2.43 | 6.86 | 0.57 | 16.7 |
| neutral | 10 | 60 | 50 | 3.3 | 6.2 | 1.2 | 16.2 |

## Miss Samples

- High-risk survivals: 1
- Low-risk collapses: 6
- Run-delta misses: 10
- Missing actual pitcher matches: 0

Promotion read: shadow only. Use a larger settled window before lane promotion.

