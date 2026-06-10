# Shadow Calibration Addendum Report

Date window: 2026-06-06 to 2026-06-09

## Summary

- Baseline all target lanes: 143-90 (61.4%, n=233)
- Trusted core without YRFI/F5 O/U promotion: 111-57 (66.1%, n=168)
- Bucket-filtered core: 67-28 (70.5%, n=95)

## Current Seed Rules

- ML shape: ML shape confidence >=65 (15-4 (78.9%, n=19))
- ML shape signal priority: promotion tier -> model confidence -> market edge -> margin support.
- ML shape conflict policy: High margin support does not override low confidence; high confidence with thin margin is a closer-score win profile.
- F5 ML: F5 ML confidence-first promotion: edge >=0.5, lead confidence >=52, tiePct <20; edge >=1.5 is strong-edge support, not a demotion (21-7 (75%, n=28) non-loss)
- NRFI: NRFI confidence >=60 (5-2 (71.4%, n=7))
- F5 team totals: F5 team total confidence >=65 or <60 seed; watch 60-64 (26-15 (63.4%, n=41))
- Research-only: YRFI and F5 O/U until larger walk-forward confirms a promotable bucket.

## ML Shape By Confidence

| Bucket | Record | Hit rate | N |
|---|---:|---:|---:|
| 75-79 | 1-0 | 100% | 1 |
| <60 | 17-10 | 63% | 27 |
| 65-69 | 7-3 | 70% | 10 |
| 60-64 | 4-2 | 66.7% | 6 |
| 80+ | 2-0 | 100% | 2 |
| 70-74 | 5-1 | 83.3% | 6 |

## ML Shape By Confidence/Margin Conflict

| Bucket | Record | Hit rate | N |
|---|---:|---:|---:|
| confidence-and-margin-align | 12-3 | 80% | 15 |
| high-margin-low-confidence | 12-5 | 70.6% | 17 |
| high-confidence-thin-margin | 2-1 | 66.7% | 3 |
| watch-low-confidence | 9-7 | 56.3% | 16 |
| confidence-primary | 1-0 | 100% | 1 |

## ML Shape Conflict Samples

| Date | Pick | Conflict | Tier | Conf | Margin | Hit | Reason |
|---|---|---|---|---:|---:|---|---|
| 2026-06-07 | Brewers | confidence-and-margin-align | promoted | 85% | 18.8% | hit | Brewers: Confidence and margin both support the read: 85% model confidence plus 18.8% margin support. +20.0 pts market edge. |
| 2026-06-06 | Brewers | confidence-and-margin-align | promoted | 81% | 13.6% | hit | Brewers: Confidence and margin both support the read: 81% model confidence plus 13.6% margin support. +81.0 pts market edge. |
| 2026-06-06 | Mariners | confidence-and-margin-align | promoted | 75% | 11.1% | hit | Mariners: Confidence and margin both support the read: 75% model confidence plus 11.1% margin support. +18.1 pts market edge. |
| 2026-06-09 | Marlins | confidence-and-margin-align | promoted | 74% | 29.6% | hit | Marlins: Confidence and margin both support the read: 74% model confidence plus 29.6% margin support. +17.1 pts market edge. |
| 2026-06-06 | Dodgers | confidence-and-margin-align | promoted | 73% | 14.7% | hit | Dodgers: Confidence and margin both support the read: 73% model confidence plus 14.7% margin support. +73.0 pts market edge. |
| 2026-06-08 | Phillies | confidence-and-margin-align | promoted | 73% | 18.4% | hit | Phillies: Confidence and margin both support the read: 73% model confidence plus 18.4% margin support. +9.4 pts market edge. |
| 2026-06-07 | Yankees | confidence-and-margin-align | promoted | 71% | 11.9% | hit | Yankees: Confidence and margin both support the read: 71% model confidence plus 11.9% margin support. +11.2 pts market edge. |
| 2026-06-07 | Blue Jays | confidence-and-margin-align | promoted | 69% | 11.4% | hit | Blue Jays: Confidence and margin both support the read: 69% model confidence plus 11.4% margin support. +10.2 pts market edge. |
| 2026-06-07 | Rangers | confidence-and-margin-align | promoted | 69% | 15.8% | hit | Rangers: Confidence and margin both support the read: 69% model confidence plus 15.8% margin support. +10.0 pts market edge. |
| 2026-06-09 | Tigers | confidence-and-margin-align | promoted | 69% | 18.5% | hit | Tigers: Confidence and margin both support the read: 69% model confidence plus 18.5% margin support. +12.1 pts market edge. |
| 2026-06-06 | Rays | confidence-and-margin-align | promoted | 68% | 15.5% | miss | Rays: Confidence and margin both support the read: 68% model confidence plus 15.5% margin support. +9.2 pts market edge. |
| 2026-06-06 | Mets | confidence-and-margin-align | promoted | 67% | 22.4% | miss | Mets: Confidence and margin both support the read: 67% model confidence plus 22.4% margin support. +67.0 pts market edge. |

## F5 ML By Edge (Non-Loss)

| Bucket | Record | Hit rate | N |
|---|---:|---:|---:|
| 0.5-0.99 | 22-5 | 81.5% | 27 |
| 1.5-1.99 | 3-0 | 100% | 3 |
| <0.5 | 7-8 | 46.7% | 15 |
| 1-1.49 | 4-3 | 57.1% | 7 |

## NRFI By Confidence

| Bucket | Record | Hit rate | N |
|---|---:|---:|---:|
| 75-79 | 1-0 | 100% | 1 |
| 65-69 | 2-0 | 100% | 2 |
| 80+ | 1-1 | 50% | 2 |
| 60-64 | 1-1 | 50% | 2 |
| <60 | 2-3 | 40% | 5 |

## YRFI By Confidence

| Bucket | Record | Hit rate | N |
|---|---:|---:|---:|
| 80+ | 6-7 | 46.2% | 13 |
| <60 | 3-5 | 37.5% | 8 |
| 60-64 | 5-1 | 83.3% | 6 |
| 65-69 | 3-2 | 60% | 5 |
| 70-74 | 2-1 | 66.7% | 3 |
| 75-79 | 3-2 | 60% | 5 |

## Team Totals By Confidence

| Bucket | Record | Hit rate | N |
|---|---:|---:|---:|
| 80+ | 2-1 | 66.7% | 3 |
| 65-69 | 8-3 | 72.7% | 11 |
| <60 | 8-6 | 57.1% | 14 |
| 60-64 | 6-5 | 54.5% | 11 |
| 70-74 | 4-3 | 57.1% | 7 |
| 75-79 | 4-2 | 66.7% | 6 |

## POTD Raw Vs Calibrated

| Date | Raw top sections | Calibrated promoted sections |
|---|---:|---:|
| 2026-06-06 | 4-1 (80%) | 4-0 (100%) |
| 2026-06-07 | 3-2 (60%) | 2-2 (50%) |
| 2026-06-08 | 4-1 (80%) | 2-2 (50%) |
| 2026-06-09 | 4-1 (80%) | 3-0 (100%) |
