# Shadow Calibration Addendum Report

Date window: 2026-06-06 to 2026-06-08

## Summary

- Baseline all target lanes: 101-70 (59.1%, n=171)
- Trusted core without YRFI/F5 O/U promotion: 79-44 (64.2%, n=123)
- Bucket-filtered core: 51-19 (72.9%, n=70)

## Current Seed Rules

- ML shape: ML shape confidence >=65 (12-3 (80%, n=15))
- ML shape signal priority: promotion tier -> model confidence -> market edge -> margin support.
- ML shape conflict policy: High margin support does not override low confidence; high confidence with thin margin is a closer-score win profile.
- F5 ML: F5 ML edge >=0.5 and <1.5 with tiePct <20 (13-4 (76.5%, n=17) non-loss)
- NRFI: NRFI confidence >=60 (5-1 (83.3%, n=6))
- F5 team totals: F5 team total confidence >=65 or <60 seed; watch 60-64 (21-11 (65.6%, n=32))
- Research-only: YRFI and F5 O/U until larger walk-forward confirms a promotable bucket.

## ML Shape By Confidence

| Bucket | Record | Hit rate | N |
|---|---:|---:|---:|
| 70-74 | 3-2 | 60% | 5 |
| <60 | 10-7 | 58.8% | 17 |
| 60-64 | 2-3 | 40% | 5 |
| 65-69 | 5-1 | 83.3% | 6 |
| 80+ | 3-0 | 100% | 3 |
| 75-79 | 1-0 | 100% | 1 |

## ML Shape By Confidence/Margin Conflict

| Bucket | Record | Hit rate | N |
|---|---:|---:|---:|
| high-confidence-thin-margin | 4-2 | 66.7% | 6 |
| high-margin-low-confidence | 6-5 | 54.5% | 11 |
| watch-low-confidence | 6-5 | 54.5% | 11 |
| confidence-and-margin-align | 7-1 | 87.5% | 8 |
| confidence-primary | 1-0 | 100% | 1 |

## ML Shape Conflict Samples

| Date | Pick | Conflict | Tier | Conf | Margin | Hit | Reason |
|---|---|---|---|---:|---:|---|---|
| 2026-06-06 | Brewers | confidence-and-margin-align | promoted | 88% | 14.9% | hit | Brewers: Confidence and margin both support the read: 88% model confidence plus 14.9% margin support. +15.8 pts market edge. |
| 2026-06-07 | Brewers | confidence-and-margin-align | promoted | 85% | 17.5% | hit | Brewers: Confidence and margin both support the read: 85% model confidence plus 17.5% margin support. +20.0 pts market edge. |
| 2026-06-06 | Dodgers | confidence-and-margin-align | promoted | 84% | 12.3% | hit | Dodgers: Confidence and margin both support the read: 84% model confidence plus 12.3% margin support. +5.3 pts market edge. |
| 2026-06-06 | Mets | confidence-and-margin-align | promoted | 73% | 23.5% | miss | Mets: Confidence and margin both support the read: 73% model confidence plus 23.5% margin support. +18.5 pts market edge. |
| 2026-06-08 | Phillies | confidence-and-margin-align | promoted | 72% | 16.2% | hit | Phillies: Confidence and margin both support the read: 72% model confidence plus 16.2% margin support. +8.4 pts market edge. |
| 2026-06-07 | Yankees | confidence-and-margin-align | promoted | 70% | 11.9% | hit | Yankees: Confidence and margin both support the read: 70% model confidence plus 11.9% margin support. +10.2 pts market edge. |
| 2026-06-07 | Rangers | confidence-and-margin-align | promoted | 66% | 14.3% | hit | Rangers: Confidence and margin both support the read: 66% model confidence plus 14.3% margin support. +7.0 pts market edge. |
| 2026-06-08 | Astros | confidence-and-margin-align | promoted | 65% | 26.8% | hit | Astros: Confidence and margin both support the read: 65% model confidence plus 26.8% margin support. +9.4 pts market edge. |
| 2026-06-07 | Blue Jays | confidence-primary | promoted | 69% | 10.3% | hit | Blue Jays: 69% model confidence is the primary ML signal; 10.3% margin support is only tiebreak context. +10.2 pts market edge. |
| 2026-06-07 | Braves | high-confidence-thin-margin | promoted | 75% | 7.5% | hit | Braves: Confidence is carrying this ML read; 7.5% margin support is thin, so this is a closer-score win profile. +13.3 pts market edge. |
| 2026-06-07 | Dodgers | high-confidence-thin-margin | promoted | 74% | 5.7% | miss | Dodgers: Confidence is carrying this ML read; 5.7% margin support is thin, so this is a closer-score win profile. +5.4 pts market edge. |
| 2026-06-06 | Mariners | high-confidence-thin-margin | promoted | 73% | 7.7% | hit | Mariners: Confidence is carrying this ML read; 7.7% margin support is thin, so this is a closer-score win profile. +16.1 pts market edge. |

## F5 ML By Edge (Non-Loss)

| Bucket | Record | Hit rate | N |
|---|---:|---:|---:|
| <0.5 | 7-6 | 53.8% | 13 |
| 1-1.49 | 3-1 | 75% | 4 |
| 0.5-0.99 | 14-4 | 77.8% | 18 |
| 1.5-1.99 | 1-1 | 50% | 2 |

## NRFI By Confidence

| Bucket | Record | Hit rate | N |
|---|---:|---:|---:|
| 75-79 | 1-0 | 100% | 1 |
| 65-69 | 2-0 | 100% | 2 |
| 80+ | 1-1 | 50% | 2 |
| <60 | 0-1 | 0% | 1 |
| 60-64 | 1-0 | 100% | 1 |

## YRFI By Confidence

| Bucket | Record | Hit rate | N |
|---|---:|---:|---:|
| 80+ | 3-7 | 30% | 10 |
| <60 | 4-4 | 50% | 8 |
| 65-69 | 3-2 | 60% | 5 |
| 70-74 | 3-0 | 100% | 3 |
| 75-79 | 0-2 | 0% | 2 |
| 60-64 | 2-0 | 100% | 2 |

## Team Totals By Confidence

| Bucket | Record | Hit rate | N |
|---|---:|---:|---:|
| 80+ | 2-1 | 66.7% | 3 |
| 65-69 | 6-3 | 66.7% | 9 |
| <60 | 9-4 | 69.2% | 13 |
| 60-64 | 4-6 | 40% | 10 |
| 70-74 | 2-1 | 66.7% | 3 |
| 75-79 | 2-2 | 50% | 4 |

## POTD Raw Vs Calibrated

| Date | Raw top sections | Calibrated promoted sections |
|---|---:|---:|
| 2026-06-06 | 4-1 (80%) | 4-0 (100%) |
| 2026-06-07 | 3-2 (60%) | 2-2 (50%) |
| 2026-06-08 | 4-1 (80%) | 3-1 (75%) |
