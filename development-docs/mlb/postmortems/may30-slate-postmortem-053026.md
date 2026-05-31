# May 30 MLB Postmortem

## Slate snapshot
- Side board (`board-moneyline-v1.1.post-sanity`): `6/15` = `40.0%`
- Raw first-5 lean from the same board: `9/15` = `60.0%` with `0` pushes
- First-inning lane from the original board file: `9/15` = `60.0%`
- `60+` confidence sides: `4/7` = `57.1%`
- `70+` confidence sides: `0/1` = `0.0%`
- Market dogs: `1/5` = `20.0%`
- Market favorites: `5/10` = `50.0%`
- Top `8` settled props: `5/8` = `62.5%`

## What the slate actually was
- `0/15` games were labeled `dead_bat_grind`
- `10/28` team rows were scoreless through the first 3 innings
- `5/28` team rows finished as `dead_early_loss`
- Only `3/28` team rows finished as `starter_crack_loss`

This was a dead-early, low-conversion slate. The board still spent too much energy on paper side strength and too little on whether the pick would actually score before the game script got away from it.

## Side board by game
| Game | Pick | FG | F5 | 1st | Conf | Edge | Path |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Tigers @ White Sox | Chicago White Sox | Hit | Hit | Hit | 60 | 6.7 | jumped_early_hold |
| Blue Jays @ Orioles | Toronto Blue Jays | Miss | Hit | Hit | 52 | 5.0 | blew_lead_after5 |
| Padres @ Nationals | San Diego Padres | Miss | Hit | Miss | 53 | 0.0 | blew_lead_after5 |
| Royals @ Rangers | Texas Rangers | Hit | Hit | Hit | 68 | 5.9 | late_comeback |
| Twins @ Pirates | Pittsburgh Pirates | Hit | Hit | Hit | 65 | 6.7 | jumped_early_hold |
| Angels @ Rays | Tampa Bay Rays | Miss | Miss | Hit | 71 | 15.0 | starter_crack_loss |
| Brewers @ Astros | Houston Astros | Hit | Hit | Hit | 52 | 2.2 | late_comeback |
| Marlins @ Mets | Miami Marlins | Miss | Miss | Miss | 52 | 0.0 | dead_early_loss |
| Red Sox @ Guardians | Cleveland Guardians | Miss | Miss | Miss | 52 | 0.5 | balanced_path |
| Braves @ Reds | Atlanta Braves | Hit | Hit | Miss | 54 | 7.8 | late_comeback |
| Cubs @ Cardinals | St. Louis Cardinals | Miss | Miss | Hit | 52 | 0.0 | dead_early_loss |
| Giants @ Rockies | San Francisco Giants | Miss | Miss | Hit | 52 | 1.8 | starter_crack_loss |
| Yankees @ Athletics | New York Yankees | Miss | Miss | Hit | 61 | 5.2 | dead_early_loss |
| Diamondbacks @ Mariners | Seattle Mariners | Hit | Hit | Miss | 69 | 7.8 | starter_carried |
| Phillies @ Dodgers | Los Angeles Dodgers | Miss | Hit | Miss | 62 | 6.5 | blew_lead_after5 |

## What killed the side board
- The board finished only `6/15` even though the misses were mostly the same failure path repeated.
- `3/9` misses were `dead_early_loss`.
- The other miss paths were: `blew_lead_after5` x3, `starter_crack_loss` x2, `balanced_path` x1.
- The winning paths were cleaner and narrower:
  - `starter_carried`: `1`
  - `jumped_early_hold`: `2`
  - `late_comeback`: `3`

The blunt takeaway is that the slate did **not** punish us because the wrong starters melted late. It punished us because the predicted team simply never got going early enough.

## First-inning lane
Overall the original first-inning board finished `9/15`, but the misses were concentrated in the exact over-smoothed YRFI cases:

| Game | Model | Yes% | Actual | Pick 1st | Pick 3rd |
| --- | --- | --- | --- | --- | --- |
| Padres @ Nationals | YRFI | 67.9 | NRFI | 0 | 1 |
| Marlins @ Mets | YRFI | 65.6 | NRFI | 0 | 0 |
| Red Sox @ Guardians | NRFI | 24.3 | YRFI | 1 | 1 |
| Braves @ Reds | YRFI | 79.3 | NRFI | 0 | 2 |
| Diamondbacks @ Mariners | YRFI | 59.1 | NRFI | 0 | 4 |
| Phillies @ Dodgers | YRFI | 70.6 | NRFI | 0 | 1 |

What those misses have in common:
- every miss here was a YRFI that should have respected a quieter early shape
- several of them still had runs by the 3rd inning, which means the bug was **timing**, not total offense
- this is why same-series dead-early suppression and smaller pitcher-sample shrinkage had to get added after the slate

## Props
Overall settled tracked props by lane:
| Prop type | Hits | Settled | Hit rate |
| --- | --- | --- | --- |
| pitcherStrikeouts | 11 | 22 | 50.0% |
| singles | 3 | 5 | 60.0% |
| totalBases | 19 | 35 | 54.3% |

Top `8` settled props:
| Rank | Player | Market | Hit | Actual |
| --- | --- | --- | --- | --- |
| 1 | Yordan Alvarez | Over 1.5 total bases | Hit | 3.0 |
| 2 | Michael Harris II | Over 1.5 total bases | Miss | 0.0 |
| 3 | Casey Schmitt | Over 1.5 total bases | Hit | 2.0 |
| 4 | Andy Pages | Over 1.5 total bases | Hit | 2.0 |
| 4 | Christian Walker | Over 1.5 total bases | Hit | 4.0 |
| 5 | Hunter Goodman | Over 1.5 total bases | Miss | 1.0 |
| 6 | Yandy Díaz | Over 1.5 total bases | Hit | 5.0 |
| 7 | James Wood | Over 1.5 total bases | Miss | 1.0 |

The ugly part is the concentration:
- the most common top-`8` market was `Over 1.5 total bases` (`8/8`)
- the top `8` settled props went `5/8`
- the model was effectively repeating the same fragile market with fake precision

## Research-only veto artifact
- `Pass` calls: `2/7` = `28.6%`
- `Eligible` calls: `4/6` = `66.7%`

What that means:
- the current veto layer is not promotable yet
- it needs to be judged by the actual `Pass` vs `Eligible` buckets above, not by blanket suppression

So the veto idea is right, but the current flags are still too blunt to be used as live gates.

## Pipeline coverage check
- `data-private/history/mlb-results-2026-05-30.jsonl` was written by closeout
- the board file contains duplicate `gameId` values: `none`
- importing the May 30 side board created `15` rows in `mlb_side_predictions` for `15` board picks
- the side grading path has `15` rows in `mlb_side_backtests` for this model/date

This closeout is training-ready for the side lane; keep the health checks in place so a future miss fails loudly.

## Bottom line
- This was not a “market was weird” day so much as a **dead-early, low-conversion** day that the board failed to encode tightly enough.
- The side engine finished `6/15` and still needs a better filter on which edges deserve live exposure.
- The first-inning lane finished `9/15` and still over-predicted YRFI in several quiet-first-inning spots.
- Props were the weakest live lane of all, especially the repeated `TB over 1.5` cluster.

The data from this slate is still useful, but as training data for `dead_early_loss`, timing suppression, and bookkeeping fixes, not as evidence that the current prediction engine is ready.
