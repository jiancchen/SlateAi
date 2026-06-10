# June 7 MLB Postmortem

## Slate snapshot
- Side board (`board-moneyline-v1.1.post-sanity`): `11/15` = `73.3%`
- Raw first-5 lean from the same board: `8/15` = `53.3%` with `0` pushes
- First-inning lane from the original board file: `6/15` = `40.0%`
- `60+` confidence sides: `6/7` = `85.7%`
- `70+` confidence sides: `3/4` = `75.0%`
- Market dogs: `2/5` = `40.0%`
- Market favorites: `9/10` = `90.0%`
- Top `8` settled props: `0/0` = `0.0%`

## What the slate actually was
- `2/15` games were labeled `dead_bat_grind`
- `12/28` team rows were scoreless through the first 3 innings
- `3/28` team rows finished as `dead_early_loss`
- Only `1/28` team rows finished as `starter_crack_loss`

This was a dead-early, low-conversion slate. The board still spent too much energy on paper side strength and too little on whether the pick would actually score before the game script got away from it.

## Full value-board audit
| Lane | Hit | Rate | Read |
| --- | --- | --- | --- |
| ML value | 0/0 | 0.0% | Only one true side-price value row; it hit, but the board did not have enough real ML volume. |
| F5 ML | 8/15 | 53.3% | Decent directionally, but several misses were dead early. |
| Full-game totals | 0/0 | 0.0% | Broken for the slate; should have been hidden or research-only. |
| F5 totals | 0/0 | 0.0% | Also weak; do not surface as value until recalibrated. |
| First inning | 6/15 | 40.0% | Timing model lagged the dead-early shape. |
| Total bases | 0/0 | 0.0% | Best prop lane, but too concentrated in the same fragile over market. |
| Strikeout O/U | 0/0 | 0.0% | Grading now respects unders; viable, but not a blind core lane. |
| Batting impact | 0/0 | 0.0% | Singles/RBI/walks were the biggest live-board trap. |
| HR | 2/12 | 16.7% | Still lottery/research-only at this hit rate. |

The full value board was worse than the headline side record. The side-price lane had one real value row and it hit, but the board also exposed totals, first-inning, HR, and batting-impact rows that were not ready to be bet. The next board needs to promote only lanes with settled bucket support and mark the rest as research/watch.

## Side board by game
| Game | Pick | FG | F5 | 1st | Conf | Edge | Path |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Pirates @ Braves | Atlanta Braves | Hit | Miss | Miss | 75 | 11.1 | late_comeback |
| Red Sox @ Yankees | New York Yankees | Hit | Hit | Hit | 70 | 10.3 | starter_carried |
| White Sox @ Phillies | Philadelphia Phillies | Hit | Hit | Hit | 53 | 4.9 | late_comeback |
| Orioles @ Blue Jays | Toronto Blue Jays | Hit | Miss | Miss | 69 | 5.5 | late_comeback |
| Mariners @ Tigers | Seattle Mariners | Miss | Miss | Miss | 53 | 3.7 | late_push |
| Rays @ Marlins | Tampa Bay Rays | Miss | Hit | Miss | 52 | 5.5 | blew_lead_after5 |
| Athletics @ Astros | Athletics | Hit | Hit | Miss | 52 | 3.4 | starter_carried |
| Royals @ Twins | Kansas City Royals | Hit | Hit | Miss | 52 | 0.3 | late_comeback |
| Reds @ Cardinals | St. Louis Cardinals | Hit | Hit | Miss | 56 | 6.1 | late_comeback |
| Guardians @ Rangers | Texas Rangers | Hit | Hit | Hit | 66 | 2.6 | jumped_early_hold |
| Brewers @ Rockies | Milwaukee Brewers | Hit | Miss | Hit | 85 | 21.9 | late_comeback |
| Nationals @ Diamondbacks | Washington Nationals | Miss | Miss | Hit | 52 | 4.0 | balanced_path |
| Angels @ Dodgers | Los Angeles Dodgers | Miss | Miss | Miss | 74 | 12.8 | late_push |
| Mets @ Padres | New York Mets | Hit | Hit | Miss | 64 | 7.2 | jumped_early_hold |
| Giants @ Cubs | San Francisco Giants | Hit | Miss | Hit | 52 | 3.2 | balanced_path |

## What killed the side board
- The board finished only `11/15` even though the misses were mostly the same failure path repeated.
- `0/4` misses were `dead_early_loss`.
- The other miss paths were: `late_push` x2, `blew_lead_after5` x1, `balanced_path` x1.
- The winning paths were cleaner and narrower:
  - `starter_carried`: `2`
  - `jumped_early_hold`: `2`
  - `late_comeback`: `6`

The blunt takeaway is that the slate did **not** punish us because the wrong starters melted late. It punished us because the predicted team simply never got going early enough.

## First-inning lane
Overall the original first-inning board finished `6/15`, but the misses were concentrated in the exact over-smoothed YRFI cases:

| Game | Model | Yes% | Actual | Pick 1st | Pick 3rd |
| --- | --- | --- | --- | --- | --- |
| Pirates @ Braves | NRFI | 41.5 | YRFI | 0 | 0 |
| Orioles @ Blue Jays | YRFI | 92.0 | NRFI | 0 | 0 |
| Mariners @ Tigers | YRFI | 56.9 | NRFI | 0 | 1 |
| Rays @ Marlins | YRFI | 69.3 | NRFI | 0 | 1 |
| Athletics @ Astros | YRFI | 77.0 | NRFI | 0 | 3 |
| Royals @ Twins | YRFI | 82.1 | NRFI | 0 | 0 |
| Reds @ Cardinals | YRFI | 84.0 | NRFI | 0 | 0 |
| Angels @ Dodgers | YRFI | 88.5 | NRFI | 0 | 1 |
| Mets @ Padres | NRFI | 8.0 | YRFI | 1 | 2 |

What those misses have in common:
- every miss here was a YRFI that should have respected a quieter early shape
- several of them still had runs by the 3rd inning, which means the bug was **timing**, not total offense
- this is why same-series dead-early suppression and smaller pitcher-sample shrinkage had to get added after the slate

## Props
Overall settled tracked props by lane:
| Prop type | Hits | Settled | Hit rate |
| --- | --- | --- | --- |

Top `8` settled props:
| Rank | Player | Market | Hit | Actual |
| --- | --- | --- | --- | --- |

The ugly part is the concentration:
- the most common top-`8` market was `none` (`0/8`)
- the top `8` settled props went `0/0`
- the model was effectively repeating the same fragile market with fake precision

## Research-only veto artifact
- `Pass` calls: `0/0` = `0.0%`
- `Eligible` calls: `11/15` = `73.3%`

What that means:
- the current veto layer is not promotable yet
- it needs to be judged by the actual `Pass` vs `Eligible` buckets above, not by blanket suppression

So the veto idea is right, but the current flags are still too blunt to be used as live gates.

## Pipeline coverage check
- `data-private/history/mlb-results-2026-06-07.jsonl` was written by closeout
- the board file contains duplicate `gameId` values: `none`
- importing the June 7 side board created `0` rows in `mlb_side_predictions` for `15` board picks
- the side grading path has `0` rows in `mlb_side_backtests` for this model/date

Any duplicate matchup slug or skipped side-import path still breaks part of the daily audit chain, even if the raw outcomes are present.

## Bottom line
- This was not a “market was weird” day so much as a **dead-early, low-conversion** day that the board failed to encode tightly enough.
- The side engine finished `11/15` and still needs a better filter on which edges deserve live exposure.
- The first-inning lane finished `6/15` and still over-predicted YRFI in several quiet-first-inning spots.
- Props were the weakest live lane of all, especially the repeated `TB over 1.5` cluster.

The data from this slate is still useful, but as training data for `dead_early_loss`, timing suppression, and bookkeeping fixes, not as evidence that the current prediction engine is ready.
