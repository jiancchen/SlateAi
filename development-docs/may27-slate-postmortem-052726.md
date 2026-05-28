# May 27 MLB Postmortem

## Slate snapshot
- Side board (`board-moneyline-v1.1.post-sanity`): `7/15` = `46.7%`
- Raw first-5 lean from the same board: `5/15` = `33.3%` with `0` pushes
- First-inning lane from the original board file: `8/15` = `53.3%`
- `60+` confidence sides: `2/4` = `50.0%`
- `70+` confidence sides: `0/0` = `0.0%`
- Market dogs: `0/1` = `0.0%`
- Market favorites: `7/14` = `50.0%`
- Top `8` settled props: `4/8` = `50.0%`

## What the slate actually was
- `3/15` games were labeled `dead_bat_grind`
- `15/28` team rows were scoreless through the first 3 innings
- `5/28` team rows finished as `dead_early_loss`
- Only `3/28` team rows finished as `starter_crack_loss`

This was a dead-early, low-conversion slate. The board still spent too much energy on paper side strength and too little on whether the pick would actually score before the game script got away from it.

## Side board by game
| Game | Pick | FG | F5 | 1st | Conf | Edge | Path |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Marlins @ Blue Jays | Toronto Blue Jays | Hit | Miss | Hit | 65 | 11.5 | late_comeback |
| Nationals @ Guardians | Washington Nationals | Miss | Miss | Hit | 52 | 0.0 | balanced_path |
| Cardinals @ Brewers | Milwaukee Brewers | Hit | Miss | Miss | 55 | 3.1 | late_comeback |
| Mariners @ Athletics | Athletics | Miss | Miss | Miss | 52 | 2.0 | dead_early_loss |
| Diamondbacks @ Giants | San Francisco Giants | Miss | Hit | Miss | 60 | 3.6 | blew_lead_after5 |
| Phillies @ Padres | Philadelphia Phillies | Hit | Miss | Miss | 57 | 7.3 | late_push |
| Rays @ Orioles | Tampa Bay Rays | Miss | Miss | Hit | 52 | 5.8 | starter_crack_loss |
| Angels @ Tigers | Los Angeles Angels | Miss | Miss | Hit | 52 | 0.0 | dead_early_loss |
| Cubs @ Pirates | Pittsburgh Pirates | Miss | Miss | Hit | 52 | 7.1 | balanced_path |
| Braves @ Red Sox | Atlanta Braves | Miss | Miss | Miss | 61 | 7.1 | starter_crack_loss |
| Reds @ Mets | New York Mets | Hit | Hit | Miss | 53 | 1.0 | jumped_early_hold |
| Twins @ White Sox | Chicago White Sox | Hit | Hit | Hit | 52 | 4.8 | late_comeback |
| Yankees @ Royals | New York Yankees | Hit | Hit | Miss | 58 | 8.1 | starter_carried |
| Astros @ Rangers | Texas Rangers | Miss | Miss | Hit | 54 | 4.1 | balanced_path |
| Rockies @ Dodgers | Los Angeles Dodgers | Hit | Hit | Hit | 67 | 22.1 | jumped_early_hold |

## What killed the side board
- The board finished only `7/15` even though the misses were mostly the same failure path repeated.
- `2/8` misses were `dead_early_loss`.
- The other miss paths were: `balanced_path` x3, `blew_lead_after5` x1, `starter_crack_loss` x2.
- The winning paths were cleaner and narrower:
  - `starter_carried`: `1`
  - `jumped_early_hold`: `2`
  - `late_comeback`: `3`

The blunt takeaway is that the slate did **not** punish us because the wrong starters melted late. It punished us because the predicted team simply never got going early enough.

## First-inning lane
Overall the original first-inning board finished `8/15`, but the misses were concentrated in the exact over-smoothed YRFI cases:

| Game | Model | Yes% | Actual | Pick 1st | Pick 3rd |
| --- | --- | --- | --- | --- | --- |
| Cardinals @ Brewers | YRFI | 73.1 | NRFI | 0 | 0 |
| Mariners @ Athletics | NRFI | 46.1 | YRFI | 0 | 0 |
| Diamondbacks @ Giants | YRFI | 71.4 | NRFI | 0 | 2 |
| Phillies @ Padres | YRFI | 73.1 | NRFI | 0 | 0 |
| Braves @ Red Sox | YRFI | 69.0 | NRFI | 0 | 0 |
| Reds @ Mets | NRFI | 26.2 | YRFI | 1 | 2 |
| Yankees @ Royals | YRFI | 63.4 | NRFI | 0 | 0 |

What those misses have in common:
- every miss here was a YRFI that should have respected a quieter early shape
- several of them still had runs by the 3rd inning, which means the bug was **timing**, not total offense
- this is why same-series dead-early suppression and smaller pitcher-sample shrinkage had to get added after the slate

## Props
Overall settled tracked props by lane:
| Prop type | Hits | Settled | Hit rate |
| --- | --- | --- | --- |
| pitcherStrikeouts | 3 | 10 | 30.0% |
| rbi | 0 | 1 | 0.0% |
| singles | 0 | 3 | 0.0% |
| totalBases | 8 | 20 | 40.0% |
| walks | 1 | 1 | 100.0% |

Top `8` settled props:
| Rank | Player | Market | Hit | Actual |
| --- | --- | --- | --- | --- |
| 1 | Amed Rosario | Over 1.5 total bases | Miss | 0.0 |
| 2 | Casey Schmitt | Over 1.5 total bases | Miss | 0.0 |
| 3 | Randal Grichuk | Over 1.5 total bases | Hit | 3.0 |
| 4 | Juan Soto | Over 1.5 total bases | Hit | 5.0 |
| 5 | Esmerlyn Valdez | Over 1.5 total bases | Miss | 0.0 |
| 6 | Yordan Alvarez | Over 1.5 total bases | Hit | 9.0 |
| 7 | Christian Walker | Over 1.5 total bases | Miss | 0.0 |
| 8 | James Wood | Over 1.5 total bases | Hit | 2.0 |

The ugly part is the concentration:
- the most common top-`8` market was `Over 1.5 total bases` (`8/8`)
- the top `8` settled props went `4/8`
- the model was effectively repeating the same fragile market with fake precision

## Research-only veto artifact
- `Pass` calls: `5/7` = `71.4%`
- `Eligible` calls: `2/8` = `25.0%`

What that means:
- the current veto layer is not promotable yet
- it needs to be judged by the actual `Pass` vs `Eligible` buckets above, not by blanket suppression

So the veto idea is right, but the current flags are still too blunt to be used as live gates.

## Pipeline gaps exposed today
- `data-private/history/mlb-results-2026-05-27.jsonl` was written by closeout
- the board file contains duplicate `gameId` values: `none`
- importing the May 27 side board only created `0` rows in `mlb_side_predictions` for `15` board picks
- the side grading path still left `mlb_side_backtests` at `0` rows for this model/date

Any duplicate matchup slug or skipped side-import path still breaks part of the daily audit chain, even if the raw outcomes are present.

## Bottom line
- This was not a “market was weird” day so much as a **dead-early, low-conversion** day that the board failed to encode tightly enough.
- The side engine finished `7/15` and still needs a better filter on which edges deserve live exposure.
- The first-inning lane finished `8/15` and still over-predicted YRFI in several quiet-first-inning spots.
- Props were the weakest live lane of all, especially the repeated `TB over 1.5` cluster.

The data from this slate is still useful, but as training data for `dead_early_loss`, timing suppression, and bookkeeping fixes, not as evidence that the current prediction engine is ready.
