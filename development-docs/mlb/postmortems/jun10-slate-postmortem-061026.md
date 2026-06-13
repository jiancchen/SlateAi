# June 10 MLB Postmortem

## Slate snapshot
- Side board (`board-moneyline-v1.1.post-sanity`): `5/15` = `33.3%`
- Raw first-5 lean from the same board: `7/15` = `46.7%` with `0` pushes
- First-inning lane from the original board file: `5/15` = `33.3%`
- `60+` confidence sides: `2/8` = `25.0%`
- `70+` confidence sides: `2/4` = `50.0%`
- Market dogs: `0/2` = `0.0%`
- Market favorites: `5/13` = `38.5%`
- Top `8` settled props: `0/0` = `0.0%`

## What the slate actually was
- `2/15` games were labeled `dead_bat_grind`
- `17/28` team rows were scoreless through the first 3 innings
- `6/28` team rows finished as `dead_early_loss`
- Only `2/28` team rows finished as `starter_crack_loss`

This was a dead-early, low-conversion slate. The board still spent too much energy on paper side strength and too little on whether the pick would actually score before the game script got away from it.

## Full value-board audit
| Lane | Hit | Rate | Read |
| --- | --- | --- | --- |
| ML value | 0/0 | 0.0% | Only one true side-price value row; it hit, but the board did not have enough real ML volume. |
| F5 ML | 7/15 | 46.7% | Decent directionally, but several misses were dead early. |
| Full-game totals | 0/0 | 0.0% | Broken for the slate; should have been hidden or research-only. |
| F5 totals | 0/0 | 0.0% | Also weak; do not surface as value until recalibrated. |
| First inning | 5/15 | 33.3% | Timing model lagged the dead-early shape. |
| Total bases | 0/0 | 0.0% | Best prop lane, but too concentrated in the same fragile over market. |
| Strikeout O/U | 0/0 | 0.0% | Grading now respects unders; viable, but not a blind core lane. |
| Batting impact | 0/0 | 0.0% | Singles/RBI/walks were the biggest live-board trap. |
| HR | 4/12 | 33.3% | Still lottery/research-only at this hit rate. |

The full value board was worse than the headline side record. The side-price lane had one real value row and it hit, but the board also exposed totals, first-inning, HR, and batting-impact rows that were not ready to be bet. The next board needs to promote only lanes with settled bucket support and mark the rest as research/watch.

## Side board by game
| Game | Pick | FG | F5 | 1st | Conf | Edge | Path |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Red Sox @ Rays | Tampa Bay Rays | Hit | Hit | Hit | 70 | 19.4 | starter_carried |
| Yankees @ Guardians | Cleveland Guardians | Miss | Miss | Miss | 52 | 0.5 | balanced_path |
| Nationals @ Giants | Washington Nationals | Miss | Hit | Miss | 60 | 5.2 | blew_lead_after5 |
| Reds @ Padres | San Diego Padres | Hit | Miss | Miss | 71 | 7.3 | late_comeback |
| Mariners @ Orioles | Seattle Mariners | Miss | Miss | Miss | 61 | 4.8 | dead_early_loss |
| Diamondbacks @ Marlins | Arizona Diamondbacks | Miss | Miss | Miss | 61 | 10.6 | starter_crack_loss |
| Dodgers @ Pirates | Los Angeles Dodgers | Miss | Hit | Miss | 80 | 19.9 | blew_lead_after5 |
| Twins @ Tigers | Detroit Tigers | Miss | Miss | Miss | 75 | 14.4 | balanced_path |
| Phillies @ Blue Jays | Philadelphia Phillies | Hit | Hit | Hit | 59 | 7.3 | jumped_early_hold |
| Cardinals @ Mets | St. Louis Cardinals | Hit | Hit | Hit | 52 | 0.0 | jumped_early_hold |
| Braves @ White Sox | Atlanta Braves | Miss | Miss | Hit | 62 | 2.7 | dead_early_loss |
| Rangers @ Royals | Texas Rangers | Hit | Miss | Miss | 58 | 3.5 | late_comeback |
| Cubs @ Rockies | Chicago Cubs | Miss | Hit | Miss | 57 | 6.1 | blew_lead_after5 |
| Brewers @ Athletics | Milwaukee Brewers | Miss | Hit | Hit | 52 | 0.0 | blew_lead_after5 |
| Astros @ Angels | Houston Astros | Miss | Miss | Miss | 52 | 0.8 | dead_early_loss |

## What killed the side board
- The board finished only `5/15` even though the misses were mostly the same failure path repeated.
- `3/10` misses were `dead_early_loss`.
- The other miss paths were: `balanced_path` x2, `blew_lead_after5` x4, `starter_crack_loss` x1.
- The winning paths were cleaner and narrower:
  - `starter_carried`: `1`
  - `jumped_early_hold`: `2`
  - `late_comeback`: `2`

The blunt takeaway is that the slate did **not** punish us because the wrong starters melted late. It punished us because the predicted team simply never got going early enough.

## First-inning lane
Overall the original first-inning board finished `5/15`, but the misses were concentrated in the exact over-smoothed YRFI cases:

| Game | Model | Yes% | Actual | Pick 1st | Pick 3rd |
| --- | --- | --- | --- | --- | --- |
| Yankees @ Guardians | NRFI | 23.3 | YRFI | 1 | 1 |
| Nationals @ Giants | YRFI | 72.8 | NRFI | 0 | 2 |
| Reds @ Padres | NRFI | 25.5 | YRFI | 1 | 1 |
| Mariners @ Orioles | YRFI | 67.4 | NRFI | 0 | 0 |
| Diamondbacks @ Marlins | YRFI | 61.6 | NRFI | 0 | 0 |
| Dodgers @ Pirates | YRFI | 68.3 | NRFI | 0 | 0 |
| Twins @ Tigers | YRFI | 74.0 | NRFI | 0 | 1 |
| Rangers @ Royals | YRFI | 87.1 | NRFI | 0 | 0 |
| Cubs @ Rockies | YRFI | 72.0 | NRFI | 0 | 0 |
| Astros @ Angels | NRFI | 42.5 | YRFI | 0 | 0 |

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
- `Eligible` calls: `5/15` = `33.3%`

What that means:
- the current veto layer is not promotable yet
- it needs to be judged by the actual `Pass` vs `Eligible` buckets above, not by blanket suppression

So the veto idea is right, but the current flags are still too blunt to be used as live gates.

## Pipeline coverage check
- `data-private/history/mlb-results-2026-06-10.jsonl` was written by closeout
- the board file contains duplicate `gameId` values: `none`
- importing the June 10 side board created `0` rows in `mlb_side_predictions` for `15` board picks
- the side grading path has `0` rows in `mlb_side_backtests` for this model/date

Any duplicate matchup slug or skipped side-import path still breaks part of the daily audit chain, even if the raw outcomes are present.

## Bottom line
- This was not a “market was weird” day so much as a **dead-early, low-conversion** day that the board failed to encode tightly enough.
- The side engine finished `5/15` and still needs a better filter on which edges deserve live exposure.
- The first-inning lane finished `5/15` and still over-predicted YRFI in several quiet-first-inning spots.
- Props were the weakest live lane of all, especially the repeated `TB over 1.5` cluster.

The data from this slate is still useful, but as training data for `dead_early_loss`, timing suppression, and bookkeeping fixes, not as evidence that the current prediction engine is ready.
