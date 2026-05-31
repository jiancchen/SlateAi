# MLB Bullpen Prediction Audit — May 30, 2026

Audit window:

- predictions available from `2026-05-10` through `2026-05-28`
- actual bullpen usage from `mlb_pitcher_appearances`
- unit of analysis: one team-side per game with at least one reliever appearance

## Headline

- team-side samples: `155`
- exact first-bridge hit rate: `20.0%`
- top-2 coverage: `36.1%`
- top-3 coverage: `36.1%`
- actual first reliever appeared somewhere in predicted chain: `36.1%`
- exact-match expected-outs MAE: `1.47` outs
- matched-in-top3 expected-outs MAE: `1.60` outs

## Team Coverage

| Team | Samples | Exact 1st | Top-2 | Top-3 |
| --- | --- | --- | --- | --- |
| Astros | 6 | 0.0% | 66.7% | 66.7% |
| Blue Jays | 6 | 50.0% | 66.7% | 66.7% |
| Cubs | 6 | 33.3% | 33.3% | 33.3% |
| Orioles | 6 | 33.3% | 33.3% | 33.3% |
| Pirates | 6 | 0.0% | 0.0% | 0.0% |
| Rangers | 6 | 16.7% | 33.3% | 33.3% |
| Twins | 6 | 33.3% | 66.7% | 66.7% |
| White Sox | 6 | 16.7% | 33.3% | 33.3% |
| Angels | 5 | 40.0% | 40.0% | 40.0% |
| Athletics | 5 | 0.0% | 20.0% | 20.0% |
| Braves | 5 | 40.0% | 40.0% | 40.0% |
| Brewers | 5 | 40.0% | 60.0% | 60.0% |
| Cardinals | 5 | 0.0% | 20.0% | 20.0% |
| Diamondbacks | 5 | 20.0% | 20.0% | 20.0% |
| Dodgers | 5 | 0.0% | 20.0% | 20.0% |
| Giants | 5 | 40.0% | 60.0% | 60.0% |
| Guardians | 5 | 40.0% | 60.0% | 60.0% |
| Mariners | 5 | 20.0% | 60.0% | 60.0% |
| Marlins | 5 | 40.0% | 40.0% | 40.0% |
| Mets | 5 | 20.0% | 20.0% | 20.0% |

## First-Up Workload Buckets

| Actual first-up workload | Samples | Exact 1st | Appeared in predicted chain |
| --- | --- | --- | --- |
| 1-3 outs | 89 | 21.3% | 37.1% |
| 4-5 outs | 23 | 26.1% | 39.1% |
| 6+ outs | 43 | 14.0% | 32.6% |

## Clean Hits

| Spot | Note |
| --- | --- |
| 2026-05-23 Rangers vs Angels | hit Cole Winn first-up (1 outs vs 3.00 expected) |
| 2026-05-23 Brewers vs Dodgers | hit Grant Anderson first-up (5 outs vs 4.00 expected) |
| 2026-05-23 Blue Jays vs Pirates | hit Braydon Fisher first-up (3 outs vs 3.67 expected) |
| 2026-05-23 Guardians vs Phillies | hit Matt Festa first-up (3 outs vs 1.25 expected) |
| 2026-05-23 Nationals vs Braves | hit Brad Lord first-up (9 outs vs 6.00 expected) |
| 2026-05-23 Cubs vs Astros | hit Trent Thornton first-up (3 outs vs 4.67 expected) |
| 2026-05-23 Marlins vs Mets | hit Anthony Bender first-up (4 outs vs 4.33 expected) |
| 2026-05-24 Angels vs Rangers | hit Sam Bachman first-up (3 outs vs 4.67 expected) |

## Clean Misses

| Spot | Note |
| --- | --- |
| 2026-05-23 Angels vs Rangers | missed first-up Ryan Zeferjahn (3 outs); predicted José Fermin, Ryan Johnson |
| 2026-05-23 Cardinals vs Reds | missed first-up Justin Bruihl (1 outs); predicted Gordon Graceffo, Ryne Stanek |
| 2026-05-23 Reds vs Cardinals | missed first-up Brock Burke (4 outs); predicted Pierce Johnson, Tejay Antone |
| 2026-05-23 Pirates vs Blue Jays | missed first-up Yohan Ramírez (5 outs); predicted Isaac Mattson, Evan Sisk |
| 2026-05-23 Red Sox vs Twins | missed first-up Brayan Bello (15 outs); predicted Justin Slaten, Garrett Whitlock |
| 2026-05-23 Athletics vs Padres | missed first-up José Suarez (8 outs); predicted Justin Sterner, Luis Medina |
| 2026-05-23 Padres vs Athletics | missed first-up Jeremiah Estrada (3 outs); predicted Wandy Peralta, Jason Adam |
| 2026-05-23 Phillies vs Guardians | missed first-up Orion Kerkering (3 outs); predicted Tanner Banks, Jonathan Bowlan |

## Read

- `Exact first-bridge hit rate` is the strict answer to “who got called first.”
- `Top-2` and `Top-3` are more practical for how the board is actually used, because the reliever chain is a shortlist, not just a single name.
- In this window, `Top-3` is the same as `Top-2` because the saved live board usually exports two likely bridge names.
- `Expected-outs MAE` answers the innings question directly: when we found the right arm, how close were we on workload.
- The weakest spot is `6+ outs` bulk first-up usage. Those long bridge / piggyback turns only hit `14.0%` exact and `32.6%` chain coverage in this sample.
- This audit does not yet grade the full bullpen sequence after the first reliever. It is focused on first-up bridge prediction quality, which is the part the current board surfaces most explicitly.
