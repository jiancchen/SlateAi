# Shadow Calibration Addendum Report

Date window: 2026-06-06 to 2026-06-10

## Summary

- Baseline all target lanes: 133-111 (54.5%, n=244)
- Trusted core without YRFI/F5 O/U promotion: 80-55 (59.3%, n=135)
- Bucket-filtered core: 3-0 (100%, n=3)

## Current Seed Rules

- ML shape: ML shape confidence >=65 (2-0 (100%, n=2))
- ML shape signal priority: promotion tier -> model confidence -> market edge -> margin support.
- ML shape conflict policy: High margin support does not override low confidence; high confidence with thin margin is a closer-score win profile.
- F5 ML: F5 ML confidence-first promotion: edge >=0.5, lead confidence >=52, tiePct <20; edge >=1.5 is strong-edge support, not a demotion (0-0 (n/a%, n=0) non-loss)
- NRFI: NRFI confidence >=60 (0-0 (n/a%, n=0))
- F5 team totals: F5 team total confidence >=65 or <60 seed only when discrete hit-threshold cushion >=0.75 runs; watch thin threshold cushions even when raw line edge looks large (1-0 (100%, n=1))
- Research-only: YRFI and F5 O/U until larger walk-forward confirms a promotable bucket.

## ML Shape By Confidence

| Bucket | Record | Hit rate | N |
|---|---:|---:|---:|
| <60 | 32-20 | 61.5% | 52 |
| 60-64 | 7-6 | 53.8% | 13 |
| 65-69 | 2-0 | 100% | 2 |

## ML Shape By Confidence/Margin Conflict

| Bucket | Record | Hit rate | N |
|---|---:|---:|---:|
| watch-low-confidence | 39-26 | 60% | 65 |
| high-confidence-thin-margin | 2-0 | 100% | 2 |

## ML Shape Conflict Samples

| Date | Pick | Conflict | Tier | Conf | Margin | Hit | Reason |
|---|---|---|---|---:|---:|---|---|
| 2026-06-06 | Cubs | high-confidence-thin-margin | promoted | 65% | 0% | hit | Cubs: Confidence is carrying this ML read; 0.0% margin support is thin, so this is a closer-score win profile. +3.0 pts market edge. |
| 2026-06-10 | Padres | high-confidence-thin-margin | promoted | 65% | 0% | hit | Padres: Confidence is carrying this ML read; 0.0% margin support is thin, so this is a closer-score win profile. +2.3 pts market edge. |
| 2026-06-06 | Twins | watch-low-confidence | watch | 64% | 0% | miss | Twins: 64% model confidence is the primary ML signal; 0.0% margin support is only tiebreak context. +2.9 pts market edge. |
| 2026-06-07 | Dodgers | watch-low-confidence | watch | 64% | 0% | miss | Dodgers: 64% model confidence is the primary ML signal; 0.0% margin support is only tiebreak context. -4.6 pts market edge. |
| 2026-06-10 | Rays | watch-low-confidence | watch | 64% | 0% | hit | Rays: 64% model confidence is the primary ML signal; 0.0% margin support is only tiebreak context. +2.2 pts market edge. |
| 2026-06-10 | Dodgers | watch-low-confidence | watch | 64% | 0% | miss | Dodgers: 64% model confidence is the primary ML signal; 0.0% margin support is only tiebreak context. -2.7 pts market edge. |
| 2026-06-07 | Yankees | watch-low-confidence | watch | 63% | 0% | hit | Yankees: 63% model confidence is the primary ML signal; 0.0% margin support is only tiebreak context. +3.2 pts market edge. |
| 2026-06-07 | Blue Jays | watch-low-confidence | watch | 63% | 0% | hit | Blue Jays: 63% model confidence is the primary ML signal; 0.0% margin support is only tiebreak context. +4.2 pts market edge. |
| 2026-06-07 | Rangers | watch-low-confidence | watch | 63% | 0% | hit | Rangers: 63% model confidence is the primary ML signal; 0.0% margin support is only tiebreak context. +4.0 pts market edge. |
| 2026-06-10 | Braves | watch-low-confidence | watch | 63% | 0% | miss | Braves: 63% model confidence is the primary ML signal; 0.0% margin support is only tiebreak context. +3.2 pts market edge. |
| 2026-06-06 | Rays | watch-low-confidence | watch | 62% | 0% | miss | Rays: 62% model confidence is the primary ML signal; 0.0% margin support is only tiebreak context. +3.2 pts market edge. |
| 2026-06-06 | Brewers | watch-low-confidence | watch | 62% | 7.5% | hit | Brewers: 62% model confidence is the primary ML signal; 7.5% margin support is only tiebreak context. +62.0 pts market edge. |

## F5 ML By Edge (Non-Loss)

| Bucket | Record | Hit rate | N |
|---|---:|---:|---:|
| <0.5 | 38-29 | 56.7% | 67 |

## NRFI By Confidence

| Bucket | Record | Hit rate | N |
|---|---:|---:|---:|

## YRFI By Confidence

| Bucket | Record | Hit rate | N |
|---|---:|---:|---:|
| <60 | 33-34 | 49.3% | 67 |

## Team Totals By Confidence

| Bucket | Record | Hit rate | N |
|---|---:|---:|---:|
| 80+ | 1-0 | 100% | 1 |

## POTD Raw Vs Calibrated

| Date | Raw top sections | Calibrated promoted sections |
|---|---:|---:|
| 2026-06-06 | 2-1 (66.7%) | 1-0 (100%) |
| 2026-06-07 | 3-1 (75%) | 1-0 (100%) |
| 2026-06-08 | 1-2 (33.3%) | 0-0 (null%) |
| 2026-06-09 | 0-3 (0%) | 0-0 (null%) |
| 2026-06-10 | 2-1 (66.7%) | 1-0 (100%) |
