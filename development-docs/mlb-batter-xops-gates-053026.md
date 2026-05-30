# MLB Batter XOPS Gate Check — May 30, 2026

Quick research pass to test whether a simple rolling `XOPS = xOBP * xSLG` signal deserves explicit warehousing for `runs` or `H+R+RBI`.

- batter-game sample: `17162`
- rolling 7 XOPS Q4 threshold: `0.170`
- rolling 7 xwOBA Q4 threshold: `0.379`
- rolling 7 xSLG Q4 threshold: `0.505`

## Runs

| Gate | Sample | Hit rate |
| --- | --- | --- |
| Baseline runs >= 1 | 17162 | 34.8% |
| rolling 7 XOPS Q4 | 4291 | 38.6% |
| rolling 7 XOPS Q4 + xwOBA Q4 | 3338 | 38.5% |
| rolling 7 XOPS Q4 + xSLG Q4 | 3037 | 39.1% |

## H+R+RBI

| Gate | Sample | Hit rate |
| --- | --- | --- |
| Baseline H+R+RBI >= 2 | 17162 | 41.2% |
| rolling 7 XOPS Q4 | 4291 | 45.5% |
| rolling 7 XOPS Q4 + xwOBA Q4 | 3338 | 45.2% |
| rolling 7 XOPS Q4 + xSLG Q4 | 3037 | 45.8% |

## Read

- This is a quick signal check, not a deployment promotion.
- If `rolling 7 XOPS Q4` cannot beat the existing `slot + xwOBA` style gates, it should stay secondary context instead of becoming a primary feature.
- If it helps only when paired with `xwOBA` or `xSLG`, then the correct use is likely as a confirming layer on the batting-production ladder rather than a standalone lane.
