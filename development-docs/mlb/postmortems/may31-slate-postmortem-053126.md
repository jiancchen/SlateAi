# May 31 MLB Postmortem

## Slate snapshot
- Side board (`board-moneyline-v1.1.post-sanity`): `11/15` = `73.3%`
- Raw first-5 lean from the same board: `9/15` = `60.0%` with `0` pushes
- First-inning lane from the original board file: `7/15` = `46.7%`
- `60+` confidence sides: `5/5` = `100.0%`
- `70+` confidence sides: `1/1` = `100.0%`
- Market dogs: `0/1` = `0.0%`
- Market favorites: `11/14` = `78.6%`
- Top `8` settled props: `5/8` = `62.5%`

## What the slate actually was
- `2/15` games were labeled `dead_bat_grind`
- `12/28` team rows were scoreless through the first 3 innings
- `5/28` team rows finished as `dead_early_loss`
- Only `7/28` team rows finished as `starter_crack_loss`

This was a dead-early, low-conversion slate. The board still spent too much energy on paper side strength and too little on whether the pick would actually score before the game script got away from it.

## Full value-board audit
| Lane | Hit | Rate | Read |
| --- | --- | --- | --- |
| ML value | 1/1 | 100.0% | Only one true side-price value row; it hit, but the board did not have enough real ML volume. |
| F5 ML | 9/15 | 60.0% | Decent directionally, but several misses were dead early. |
| Full-game totals | 0/1 | 0.0% | Broken for the slate; should have been hidden or research-only. |
| F5 totals | 0/2 | 0.0% | Also weak; do not surface as value until recalibrated. |
| First inning | 7/15 | 46.7% | Timing model lagged the dead-early shape. |
| Total bases | 4/6 | 66.7% | Best prop lane, but too concentrated in the same fragile over market. |
| Strikeout O/U | 11/18 | 61.1% | Grading now respects unders; viable, but not a blind core lane. |
| Batting impact | 3/12 | 25.0% | Singles/RBI/walks were the biggest live-board trap. |
| HR | 2/12 | 16.7% | Still lottery/research-only at this hit rate. |

The full value board was worse than the headline side record. The side-price lane had one real value row and it hit, but the board also exposed totals, first-inning, HR, and batting-impact rows that were not ready to be bet. The next board needs to promote only lanes with settled bucket support and mark the rest as research/watch.

## Side board by game
| Game | Pick | FG | F5 | 1st | Conf | Edge | Path |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Blue Jays @ Orioles | Toronto Blue Jays | Miss | Miss | Hit | 52 | 6.5 | starter_crack_loss |
| Padres @ Nationals | Washington Nationals | Hit | Hit | Miss | 52 | 9.0 | starter_carried |
| Twins @ Pirates | Pittsburgh Pirates | Hit | Hit | Miss | 61 | 10.8 | starter_carried |
| Angels @ Rays | Tampa Bay Rays | Hit | Hit | Hit | 52 | 11.8 | jumped_early_hold |
| Braves @ Reds | Atlanta Braves | Miss | Miss | Miss | 52 | 9.5 | balanced_path |
| Marlins @ Mets | Miami Marlins | Miss | Miss | Miss | 52 | 0.0 | dead_early_loss |
| Red Sox @ Guardians | Boston Red Sox | Hit | Miss | Hit | 64 | 9.9 | late_comeback |
| Brewers @ Astros | Milwaukee Brewers | Hit | Hit | Miss | 84 | 21.1 | starter_carried |
| Tigers @ White Sox | Chicago White Sox | Hit | Miss | Miss | 59 | 5.5 | late_comeback |
| Royals @ Rangers | Kansas City Royals | Miss | Miss | Hit | 52 | 3.3 | dead_early_loss |
| Giants @ Rockies | San Francisco Giants | Hit | Hit | Hit | 52 | 2.3 | jumped_early_hold |
| Yankees @ Athletics | New York Yankees | Hit | Hit | Hit | 56 | 7.6 | late_comeback |
| Diamondbacks @ Mariners | Seattle Mariners | Hit | Hit | Miss | 62 | 9.7 | starter_carried |
| Phillies @ Dodgers | Los Angeles Dodgers | Hit | Hit | Miss | 62 | 13.3 | starter_carried |
| Cubs @ Cardinals | St. Louis Cardinals | Hit | Hit | Hit | 52 | 6.4 | jumped_early_hold |

## What killed the side board
- The board finished only `11/15` even though the misses were mostly the same failure path repeated.
- `2/4` misses were `dead_early_loss`.
- The other miss paths were: `starter_crack_loss` x1, `balanced_path` x1.
- The winning paths were cleaner and narrower:
  - `starter_carried`: `5`
  - `jumped_early_hold`: `3`
  - `late_comeback`: `3`

The blunt takeaway is that the slate did **not** punish us because the wrong starters melted late. It punished us because the predicted team simply never got going early enough.

## First-inning lane
Overall the original first-inning board finished `7/15`, but the misses were concentrated in the exact over-smoothed YRFI cases:

| Game | Model | Yes% | Actual | Pick 1st | Pick 3rd |
| --- | --- | --- | --- | --- | --- |
| Padres @ Nationals | YRFI | 87.6 | NRFI | 0 | 0 |
| Twins @ Pirates | YRFI | 83.1 | NRFI | 0 | 4 |
| Braves @ Reds | NRFI | 45.6 | YRFI | 1 | 1 |
| Marlins @ Mets | NRFI | 47.5 | YRFI | 0 | 0 |
| Brewers @ Astros | YRFI | 69.9 | NRFI | 0 | 0 |
| Tigers @ White Sox | NRFI | 45.7 | YRFI | 0 | 0 |
| Diamondbacks @ Mariners | YRFI | 69.9 | NRFI | 0 | 1 |
| Phillies @ Dodgers | YRFI | 55.4 | NRFI | 0 | 2 |

What those misses have in common:
- every miss here was a YRFI that should have respected a quieter early shape
- several of them still had runs by the 3rd inning, which means the bug was **timing**, not total offense
- this is why same-series dead-early suppression and smaller pitcher-sample shrinkage had to get added after the slate

## Props
Overall settled tracked props by lane:
| Prop type | Hits | Settled | Hit rate |
| --- | --- | --- | --- |
| pitcherStrikeouts | 11 | 18 | 61.1% |
| rbi | 0 | 1 | 0.0% |
| singles | 2 | 9 | 22.2% |
| totalBases | 4 | 6 | 66.7% |
| walks | 1 | 2 | 50.0% |

Top `8` settled props:
| Rank | Player | Market | Hit | Actual |
| --- | --- | --- | --- | --- |
| 1 | Andy Pages | Over 1.5 total bases | Hit | 3.0 |
| 2 | Jonathan Aranda | Over 1.5 total bases | Hit | 4.0 |
| 3 | Dominic Canzone | Over 1.5 total bases | Hit | 5.0 |
| 4 | Oneil Cruz | Over 1.5 total bases | Miss | 0.0 |
| 5 | Vladimir Guerrero Jr. | Over 0.5 singles | Miss | 0.0 |
| 6 | Isiah Kiner-Falefa | Over 0.5 singles | Hit | 1.0 |
| 7 | Fernando Tatis Jr. | Over 0.5 singles | Miss | 0.0 |
| 8 | Michael Harris II | Over 0.5 singles | Hit | 2.0 |

The ugly part is the concentration:
- the most common top-`8` market was `Over 1.5 total bases` (`4/8`)
- the top `8` settled props went `5/8`
- the model was effectively repeating the same fragile market with fake precision

## Research-only veto artifact
- `Pass` calls: `3/4` = `75.0%`
- `Eligible` calls: `5/5` = `100.0%`

What that means:
- the current veto layer is not promotable yet
- it needs to be judged by the actual `Pass` vs `Eligible` buckets above, not by blanket suppression

So the veto idea is right, but the current flags are still too blunt to be used as live gates.

## Pipeline coverage check
- `data-private/history/mlb-results-2026-05-31.jsonl` was written by closeout
- the board file contains duplicate `gameId` values: `none`
- importing the May 31 side board created `15` rows in `mlb_side_predictions` for `15` board picks
- the side grading path has `15` rows in `mlb_side_backtests` for this model/date

This closeout is training-ready for the side lane; keep the health checks in place so a future miss fails loudly.

## Bottom line
- This was not a “market was weird” day so much as a **dead-early, low-conversion** day that the board failed to encode tightly enough.
- The side engine finished `11/15` and still needs a better filter on which edges deserve live exposure.
- The first-inning lane finished `7/15` and still over-predicted YRFI in several quiet-first-inning spots.
- Props were the weakest live lane of all, especially the repeated `TB over 1.5` cluster.

The data from this slate is still useful, but as training data for `dead_early_loss`, timing suppression, and bookkeeping fixes, not as evidence that the current prediction engine is ready.
