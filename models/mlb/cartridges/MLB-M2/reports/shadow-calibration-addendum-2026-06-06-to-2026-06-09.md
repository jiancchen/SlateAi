# Shadow Calibration Addendum Report

Date window: 2026-06-06 to 2026-06-09

## Summary

- Baseline all target lanes: 144-115 (55.6%, n=259)
- Trusted core without YRFI/F5 O/U promotion: 105-73 (59%, n=178)
- Bucket-filtered core: 47-34 (58%, n=81)

## Current Seed Rules

- ML shape: ML shape confidence >=65 (5-2 (71.4%, n=7))
- ML shape signal priority: promotion tier -> model confidence -> market edge -> margin support.
- ML shape conflict policy: High margin support does not override low confidence; high confidence with thin margin is a closer-score win profile.
- F5 ML: F5 ML confidence-first promotion: edge >=0.5, lead confidence >=52, tiePct <20; edge >=1.5 is strong-edge support, not a demotion (5-0 (100%, n=5) non-loss)
- NRFI: NRFI confidence >=60 (0-0 (n/a%, n=0))
- F5 team totals: F5 team total confidence >=65 or <60 seed; watch 60-64 (37-32 (53.6%, n=69))
- Research-only: YRFI and F5 O/U until larger walk-forward confirms a promotable bucket.

## ML Shape By Confidence

| Bucket | Record | Hit rate | N |
|---|---:|---:|---:|
| <60 | 21-11 | 65.6% | 32 |
| 60-64 | 8-5 | 61.5% | 13 |
| 65-69 | 4-2 | 66.7% | 6 |
| 70-74 | 1-0 | 100% | 1 |

## ML Shape By Confidence/Margin Conflict

| Bucket | Record | Hit rate | N |
|---|---:|---:|---:|
| watch-low-confidence | 27-15 | 64.3% | 42 |
| high-confidence-thin-margin | 1-1 | 50% | 2 |
| confidence-and-margin-align | 3-0 | 100% | 3 |
| high-margin-low-confidence | 2-1 | 66.7% | 3 |
| confidence-primary | 1-1 | 50% | 2 |

## ML Shape Conflict Samples

| Date | Pick | Conflict | Tier | Conf | Margin | Hit | Reason |
|---|---|---|---|---:|---:|---|---|
| 2026-06-09 | Marlins | confidence-and-margin-align | promoted | 71% | 16.2% | hit | Marlins: Confidence and margin both support the read: 71% model confidence plus 16.2% margin support. +14.1 pts market edge. |
| 2026-06-09 | Mariners | confidence-and-margin-align | promoted | 66% | 12.3% | hit | Mariners: Confidence and margin both support the read: 66% model confidence plus 12.3% margin support. +10.6 pts market edge. |
| 2026-06-09 | Yankees | confidence-and-margin-align | promoted | 65% | 12.3% | hit | Yankees: Confidence and margin both support the read: 65% model confidence plus 12.3% margin support. +10.0 pts market edge. |
| 2026-06-09 | Pirates | confidence-primary | promoted | 68% | 10.1% | miss | Pirates: 68% model confidence is the primary ML signal; 10.1% margin support is only tiebreak context. +13.9 pts market edge. |
| 2026-06-09 | Tigers | confidence-primary | promoted | 68% | 8.8% | hit | Tigers: 68% model confidence is the primary ML signal; 8.8% margin support is only tiebreak context. +11.1 pts market edge. |
| 2026-06-09 | Mets | high-confidence-thin-margin | promoted | 68% | 1.4% | miss | Mets: Confidence is carrying this ML read; 1.4% margin support is thin, so this is a closer-score win profile. +11.3 pts market edge. |
| 2026-06-06 | Cubs | high-confidence-thin-margin | promoted | 65% | 0% | hit | Cubs: Confidence is carrying this ML read; 0.0% margin support is thin, so this is a closer-score win profile. +3.0 pts market edge. |
| 2026-06-09 | Red Sox | high-margin-low-confidence | watch | 64% | 11.4% | miss | Red Sox: Margin support is strong at 11.4%, but 64% model confidence is too low to promote. +10.3 pts market edge. |
| 2026-06-09 | Reds | high-margin-low-confidence | watch | 62% | 17.8% | hit | Reds: Margin support is strong at 17.8%, but 62% model confidence is too low to promote. +62.0 pts market edge. |
| 2026-06-09 | Nationals | high-margin-low-confidence | watch | 59% | 11.7% | hit | Nationals: Margin support is strong at 11.7%, but 59% model confidence is too low to promote. +59.0 pts market edge. |
| 2026-06-06 | Twins | watch-low-confidence | watch | 64% | 0% | miss | Twins: 64% model confidence is the primary ML signal; 0.0% margin support is only tiebreak context. +2.9 pts market edge. |
| 2026-06-07 | Dodgers | watch-low-confidence | watch | 64% | 0% | miss | Dodgers: 64% model confidence is the primary ML signal; 0.0% margin support is only tiebreak context. -4.6 pts market edge. |

## F5 ML By Edge (Non-Loss)

| Bucket | Record | Hit rate | N |
|---|---:|---:|---:|
| <0.5 | 26-19 | 57.8% | 45 |
| 0.5-0.99 | 6-1 | 85.7% | 7 |

## NRFI By Confidence

| Bucket | Record | Hit rate | N |
|---|---:|---:|---:|
| <60 | 1-3 | 25% | 4 |

## YRFI By Confidence

| Bucket | Record | Hit rate | N |
|---|---:|---:|---:|
| <60 | 24-24 | 50% | 48 |

## Team Totals By Confidence

| Bucket | Record | Hit rate | N |
|---|---:|---:|---:|
| 65-69 | 16-16 | 50% | 32 |
| <60 | 17-13 | 56.7% | 30 |
| 80+ | 1-0 | 100% | 1 |
| 60-64 | 1-0 | 100% | 1 |
| 70-74 | 1-2 | 33.3% | 3 |
| 75-79 | 2-1 | 66.7% | 3 |

## POTD Raw Vs Calibrated

| Date | Raw top sections | Calibrated promoted sections |
|---|---:|---:|
| 2026-06-06 | 3-1 (75%) | 2-0 (100%) |
| 2026-06-07 | 3-1 (75%) | 1-0 (100%) |
| 2026-06-08 | 1-3 (25%) | 0-1 (0%) |
| 2026-06-09 | 2-3 (40%) | 2-1 (66.7%) |
