# May 26 MLB Postmortem

## Slate snapshot
- Side board (`board-moneyline-v1.1.post-sanity`): `10/15` = `66.7%`
- Raw first-5 lean from the same board: `10/15` = `66.7%` with `0` pushes
- First-inning lane from the original board file: `9/15` = `60.0%`
- `60+` confidence sides: `2/3` = `66.7%`
- `70+` confidence sides: `1/1` = `100.0%`
- Market dogs: `3/4` = `75.0%`
- Market favorites: `7/11` = `63.6%`
- Top `8` settled props: `3/8` = `37.5%`

## What the slate actually was
- `1/15` games were labeled `dead_bat_grind`
- `10/28` team rows were scoreless through the first 3 innings
- `5/28` team rows finished as `dead_early_loss`
- Only `6/28` team rows finished as `starter_crack_loss`

This was a dead-early, low-conversion slate. The board still spent too much energy on paper side strength and too little on whether the pick would actually score before the game script got away from it.

## Side board by game
| Game | Pick | FG | F5 | 1st | Conf | Edge | Path |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Nationals @ Guardians | Washington Nationals | Hit | Hit | Hit | 52 | 2.8 | starter_carried |
| Rays @ Orioles | Tampa Bay Rays | Miss | Miss | Hit | 55 | 8.7 | starter_crack_loss |
| Angels @ Tigers | Detroit Tigers | Miss | Hit | Miss | 60 | 3.0 | blew_lead_after5 |
| Cubs @ Pirates | Pittsburgh Pirates | Hit | Hit | Miss | 52 | 11.7 | jumped_early_hold |
| Braves @ Red Sox | Atlanta Braves | Hit | Miss | Hit | 52 | 0.0 | late_comeback |
| Marlins @ Blue Jays | Toronto Blue Jays | Hit | Hit | Miss | 52 | 1.5 | late_push |
| Reds @ Mets | Cincinnati Reds | Hit | Hit | Hit | 52 | 7.9 | jumped_early_hold |
| Cardinals @ Brewers | St. Louis Cardinals | Miss | Miss | Miss | 52 | 0.0 | starter_crack_loss |
| Twins @ White Sox | Minnesota Twins | Hit | Hit | Miss | 52 | 0.0 | starter_carried |
| Yankees @ Royals | New York Yankees | Hit | Hit | Hit | 85 | 25.4 | jumped_early_hold |
| Astros @ Rangers | Texas Rangers | Hit | Hit | Hit | 64 | 6.5 | jumped_early_hold |
| Mariners @ Athletics | Athletics | Miss | Miss | Miss | 52 | 0.7 | dead_early_loss |
| Phillies @ Padres | San Diego Padres | Miss | Miss | Hit | 52 | 3.8 | dead_early_loss |
| Diamondbacks @ Giants | Arizona Diamondbacks | Hit | Hit | Hit | 52 | 6.8 | late_comeback |
| Rockies @ Dodgers | Los Angeles Dodgers | Hit | Hit | Hit | 52 | 7.7 | jumped_early_hold |

## What killed the side board
- The board finished only `10/15` even though the misses were mostly the same failure path repeated.
- `2/5` misses were `dead_early_loss`.
- The other miss paths were: `starter_crack_loss` x2, `blew_lead_after5` x1.
- The winning paths were cleaner and narrower:
  - `starter_carried`: `2`
  - `jumped_early_hold`: `5`
  - `late_comeback`: `2`

The blunt takeaway is that the slate did **not** punish us because the wrong starters melted late. It punished us because the predicted team simply never got going early enough.

## First-inning lane
Overall the original first-inning board finished `9/15`, but the misses were concentrated in the exact over-smoothed YRFI cases:

| Game | Model | Yes% | Actual | Pick 1st | Pick 3rd |
| --- | --- | --- | --- | --- | --- |
| Angels @ Tigers | YRFI | 52.1 | NRFI | 0 | 1 |
| Cubs @ Pirates | NRFI | 40.8 | YRFI | 5 | 5 |
| Marlins @ Blue Jays | YRFI | 68.8 | NRFI | 0 | 2 |
| Cardinals @ Brewers | YRFI | 53.4 | NRFI | 0 | 0 |
| Twins @ White Sox | YRFI | 67.0 | NRFI | 0 | 0 |
| Mariners @ Athletics | YRFI | 66.5 | NRFI | 0 | 0 |

What those misses have in common:
- every miss here was a YRFI that should have respected a quieter early shape
- several of them still had runs by the 3rd inning, which means the bug was **timing**, not total offense
- this is why same-series dead-early suppression and smaller pitcher-sample shrinkage had to get added after the slate

## Props
Overall settled tracked props by lane:
| Prop type | Hits | Settled | Hit rate |
| --- | --- | --- | --- |
| singles | 2 | 4 | 50.0% |
| totalBases | 8 | 15 | 53.3% |

Top `8` settled props:
| Rank | Player | Market | Hit | Actual |
| --- | --- | --- | --- | --- |
| 1 | Ketel Marte | Over 1.5 total bases | Hit | 4.0 |
| 2 | Victor Mesa Jr. | Over 1.5 total bases | Miss | 1.0 |
| 3 | Yandy Díaz | Over 1.5 total bases | Miss | 1.0 |
| 4 | Alejandro Osuna | Over 0.5 singles | Miss | 0.0 |
| 5 | James Wood | Over 1.5 total bases | Hit | 6.0 |
| 6 | Corbin Carroll | Over 1.5 total bases | Miss | 0.0 |
| 9 | Curtis Mead | Over 1.5 total bases | Miss | 0.0 |
| 11 | Enrique Hernandez | Over 1.5 total bases | Hit | 6.0 |

The ugly part is the concentration:
- the most common top-`8` market was `Over 1.5 total bases` (`7/8`)
- the top `8` settled props went `3/8`
- the model was effectively repeating the same fragile market with fake precision

## Research-only veto artifact
- `Pass` calls: `3/7` = `42.9%`
- `Eligible` calls: `3/4` = `75.0%`

What that means:
- the current veto layer is not promotable yet
- it needs to be judged by the actual `Pass` vs `Eligible` buckets above, not by blanket suppression

So the veto idea is right, but the current flags are still too blunt to be used as live gates.

## Pipeline gaps exposed today
- `data-private/history/mlb-results-2026-05-26.jsonl` was written by closeout
- the board file contains duplicate `gameId` values: `none`
- importing the May 26 side board only created `0` rows in `mlb_side_predictions` for `15` board picks
- the side grading path still left `mlb_side_backtests` at `0` rows for this model/date

Any duplicate matchup slug or skipped side-import path still breaks part of the daily audit chain, even if the raw outcomes are present.

## Bottom line
- This was not a “market was weird” day so much as a **dead-early, low-conversion** day that the board failed to encode tightly enough.
- The side engine finished `10/15` and still needs a better filter on which edges deserve live exposure.
- The first-inning lane finished `9/15` and still over-predicted YRFI in several quiet-first-inning spots.
- Props were the weakest live lane of all, especially the repeated `TB over 1.5` cluster.

The data from this slate is still useful, but as training data for `dead_early_loss`, timing suppression, and bookkeeping fixes, not as evidence that the current prediction engine is ready.
