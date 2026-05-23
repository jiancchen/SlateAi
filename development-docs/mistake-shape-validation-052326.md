# MLB Mistake-Shape Validation

This pass checks whether the new mistake-shape vectors actually light up the kinds of failures that hurt the current side board.

## Baseline

| Bucket | Games | Hit rate |
| --- | --- | --- |
| Reserve baseline | 75 | 0.653 |
| Current baseline | 93 | 0.559 |
| Combined baseline | 168 | 0.601 |
| Reserve 8+ edge | 23 | 0.522 |
| Current 8+ edge | 41 | 0.659 |
| Combined 8+ edge | 64 | 0.609 |

## Candidate Veto Shapes

| Flag | High-edge games | Reserve hit | Current hit | Combined hit |
| --- | --- | --- | --- | --- |
| Pick cluster >= 70 + opponent bullpen gap >= 8 | 5 | 0.000 | 0.200 | 0.200 |
| Pick scoreless first 3 >= 50% + pick quiet first 5 >= 50% | 17 | 0.636 | 0.333 | 0.529 |
| Pick scoreless first 3 >= 50% + opponent chaos gap >= 10 | 8 | 0.000 | 0.400 | 0.250 |

## Known Failure Checks

| Date | Game | Pick | Result | Edge | Conf | Pick cluster | Pick scoreless3 | Pick quiet5 | Opp chaos gap | Opp lineup gap | Opp bullpen gap |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 2026-05-22 | Rangers @ Angels | Texas Rangers | miss | 17.1 | 65 | 73.6 | 0.625 | 0.375 | 16.1 | -20.7 | 13.0 |
| 2026-05-22 | Twins @ Red Sox | Boston Red Sox | miss | 9.3 | 52 | 65.0 | 0.625 | 0.750 | -5.0 | 38.8 | -5.5 |
| 2026-05-22 | Dodgers @ Brewers | Los Angeles Dodgers | miss | 1.6 | 52 | 68.5 | 0.250 | 0.375 | 11.5 | -27.1 | -10.4 |
| 2026-05-22 | Guardians @ Phillies | Philadelphia Phillies | miss | 6.4 | 65 | 79.5 | 0.375 | 0.500 | -11.0 | 8.4 | -5.5 |
| 2026-05-16 | Red Sox @ Braves | Atlanta Braves | miss | 10.8 | 69 | 57.0 | 0.500 | 0.625 | 11.3 | -49.7 | 5.0 |
| 2026-05-16 | Marlins @ Rays | Tampa Bay Rays | miss | 14.6 | 71 | 51.7 | 0.500 | 0.625 | 9.5 | -24.8 | -10.9 |

## Read

- The first pass is **not** a universal fix. It does not explain every miss, and low-edge favorite losses like `Dodgers @ Brewers` still need more series-state and pitcher-shape work.
- The first real collapse signal is `pick_cluster_high + opponent_bullpen_gap`. On the current high-edge bucket, that shape was disastrous and caught the `Rangers @ Angels` type of failure.
- The second useful lane is `pick_scoreless3_high + pick_quiet5_high`. That catches favorites we kept promoting even though their recent offensive shape was already telling us the first half of the game could die on them.
- The third lane is `pick_scoreless3_high + opponent_chaos_gap`. That captures games where the board liked the cleaner paper side while the opponent was still carrying a much louder chaos vector.
- The practical lesson is that these vectors are already more useful as **veto inputs** than as ranking inputs. They tell us when a side should stop getting promoted, even if the composite still likes it.

## Next Move

- Turn these candidate shapes into explicit research-only veto flags.
- Add story/phase label tables next so we can learn `how` the game broke, not just whether the pick lost.
- Keep the mistake-shape layer recent-window-heavy; these patterns are about current failure shape, not season averages.
