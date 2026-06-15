# June 14 MLB Postmortem

## Slate snapshot
- Side board (`board-moneyline-v1.1.post-sanity`): `7/14` = `50.0%`
- Raw first-5 lean from the same board: `7/14` = `50.0%` with `0` pushes
- First-inning lane from the original board file: `6/14` = `42.9%`
- `60+` confidence sides: `1/5` = `20.0%`
- `70+` confidence sides: `0/0` = `0.0%`
- Market dogs: `2/5` = `40.0%`
- Market favorites: `5/9` = `55.6%`
- Top `8` settled props: `0/0` = `0.0%`

## What the slate actually was
- `2/14` games were labeled `dead_bat_grind`
- `9/28` team rows were scoreless through the first 3 innings
- `6/28` team rows finished as `dead_early_loss`
- Only `3/28` team rows finished as `starter_crack_loss`

This was a dead-early, low-conversion slate. The board still spent too much energy on paper side strength and too little on whether the pick would actually score before the game script got away from it.

## Full value-board audit
| Lane | Hit | Rate | Read |
| --- | --- | --- | --- |
| ML value | 0/0 | 0.0% | Only one true side-price value row; it hit, but the board did not have enough real ML volume. |
| F5 ML | 7/14 | 50.0% | Decent directionally, but several misses were dead early. |
| Full-game totals | 0/0 | 0.0% | Broken for the slate; should have been hidden or research-only. |
| F5 totals | 0/0 | 0.0% | Also weak; do not surface as value until recalibrated. |
| First inning | 6/14 | 42.9% | Timing model lagged the dead-early shape. |
| Total bases | 0/0 | 0.0% | Best prop lane, but too concentrated in the same fragile over market. |
| Strikeout O/U | 0/0 | 0.0% | Grading now respects unders; viable, but not a blind core lane. |
| Batting impact | 0/0 | 0.0% | Singles/RBI/walks were the biggest live-board trap. |
| HR | 3/12 | 25.0% | Still lottery/research-only at this hit rate. |

The full value board was worse than the headline side record. The side-price lane had one real value row and it hit, but the board also exposed totals, first-inning, HR, and batting-impact rows that were not ready to be bet. The next board needs to promote only lanes with settled bucket support and mark the rest as research/watch.

## Side board by game
| Game | Pick | FG | F5 | 1st | Conf | Edge | Path |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Marlins @ Pirates | Miami Marlins | Hit | Hit | Miss | 52 | 0.0 | starter_carried |
| Mariners @ Nationals | Seattle Mariners | Miss | Miss | Hit | 57 | 7.6 | starter_crack_loss |
| Padres @ Orioles | San Diego Padres | Hit | Hit | Miss | 52 | 0.1 | starter_carried |
| Yankees @ Blue Jays | New York Yankees | Hit | Miss | Miss | 56 | 7.9 | late_push |
| Braves @ Mets | Atlanta Braves | Miss | Miss | Miss | 63 | 14.1 | starter_crack_loss |
| Diamondbacks @ Reds | Cincinnati Reds | Miss | Hit | Hit | 52 | 0.1 | blew_lead_after5 |
| Astros @ Royals | Houston Astros | Miss | Miss | Miss | 64 | 12.1 | dead_early_loss |
| Cardinals @ Twins | St. Louis Cardinals | Miss | Miss | Miss | 65 | 10.7 | dead_early_loss |
| Dodgers @ White Sox | Los Angeles Dodgers | Miss | Hit | Hit | 52 | 4.9 | blew_lead_after5 |
| Phillies @ Brewers | Milwaukee Brewers | Hit | Hit | Miss | 52 | 10.6 | jumped_early_hold |
| Rockies @ Athletics | Athletics | Miss | Miss | Hit | 65 | 6.2 | starter_crack_loss |
| Cubs @ Giants | San Francisco Giants | Hit | Hit | Miss | 52 | 0.1 | starter_carried |
| Rays @ Angels | Tampa Bay Rays | Hit | Miss | Hit | 63 | 9.9 | late_comeback |
| Rangers @ Red Sox | Texas Rangers | Hit | Hit | Hit | 52 | 0.1 | jumped_early_hold |

## What killed the side board
- The board finished only `7/14` even though the misses were mostly the same failure path repeated.
- `2/7` misses were `dead_early_loss`.
- The other miss paths were: `starter_crack_loss` x3, `blew_lead_after5` x2.
- The winning paths were cleaner and narrower:
  - `starter_carried`: `3`
  - `jumped_early_hold`: `2`
  - `late_comeback`: `1`

The blunt takeaway is that the slate did **not** punish us because the wrong starters melted late. It punished us because the predicted team simply never got going early enough.

## First-inning lane
Overall the original first-inning board finished `6/14`, but the misses were concentrated in the exact over-smoothed YRFI cases:

| Game | Model | Yes% | Actual | Pick 1st | Pick 3rd |
| --- | --- | --- | --- | --- | --- |
| Marlins @ Pirates | YRFI | 73.3 | NRFI | 0 | 2 |
| Padres @ Orioles | YRFI | 84.7 | NRFI | 0 | 2 |
| Yankees @ Blue Jays | YRFI | 50.7 | NRFI | 0 | 2 |
| Braves @ Mets | NRFI | 46.7 | YRFI | 1 | 1 |
| Astros @ Royals | NRFI | 30.6 | YRFI | 0 | 0 |
| Cardinals @ Twins | YRFI | 84.2 | NRFI | 0 | 0 |
| Phillies @ Brewers | NRFI | 36.7 | YRFI | 1 | 1 |
| Cubs @ Giants | YRFI | 77.0 | NRFI | 0 | 0 |

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
- `Eligible` calls: `7/14` = `50.0%`

What that means:
- the current veto layer is not promotable yet
- it needs to be judged by the actual `Pass` vs `Eligible` buckets above, not by blanket suppression

So the veto idea is right, but the current flags are still too blunt to be used as live gates.

## Pipeline coverage check
- `data-private/history/mlb-results-2026-06-14.jsonl` was written by closeout
- the board file contains duplicate `gameId` values: `none`
- importing the June 14 side board created `0` rows in `mlb_side_predictions` for `14` board picks
- the side grading path has `0` rows in `mlb_side_backtests` for this model/date

Any duplicate matchup slug or skipped side-import path still breaks part of the daily audit chain, even if the raw outcomes are present.

## Bottom line
- This was not a “market was weird” day so much as a **dead-early, low-conversion** day that the board failed to encode tightly enough.
- The side engine finished `7/14` and still needs a better filter on which edges deserve live exposure.
- The first-inning lane finished `6/14` and still over-predicted YRFI in several quiet-first-inning spots.
- Props were the weakest live lane of all, especially the repeated `TB over 1.5` cluster.

The data from this slate is still useful, but as training data for `dead_early_loss`, timing suppression, and bookkeeping fixes, not as evidence that the current prediction engine is ready.
