# May 23 MLB Postmortem

## Slate snapshot
- Side board (`board-moneyline-v1.1.post-sanity`): `7/14` = `50.0%`
- Raw first-5 lean from the same board: `7/14` = `50.0%` with `0` pushes
- First-inning lane from the original board file: `7/14` = `50.0%`
- `60+` confidence sides: `2/5` = `40.0%`
- `70+` confidence sides: `0/1` = `0.0%`
- Market dogs: `5/9` = `55.6%`
- Market favorites: `2/5` = `40.0%`
- Top `8` settled props: `3/8` = `37.5%`

## What the slate actually was
- `6/14` games were labeled `dead_bat_grind`
- `15/28` team rows were scoreless through the first 3 innings
- `10/28` team rows finished as `dead_early_loss`
- Only `1/28` team rows finished as `starter_crack_loss`

This was a dead-early, low-conversion slate. The board still spent too much energy on paper side strength and too little on whether the pick would actually score before the game script got away from it.

## Side board by game
| Game | Pick | FG | F5 | 1st | Conf | Edge | Path |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Cardinals @ Reds #1 | St. Louis Cardinals | Miss | Miss | Miss | 52 | 6.5 | late_push |
| Astros @ Cubs | Houston Astros | Hit | Hit | Hit | 52 | 6.4 | jumped_early_hold |
| Pirates @ Blue Jays | Pittsburgh Pirates | Miss | Miss | Hit | 52 | 8.5 | dead_early_loss |
| Guardians @ Phillies | Philadelphia Phillies | Hit | Hit | Miss | 67 | 7.9 | starter_carried |
| White Sox @ Giants | Chicago White Sox | Miss | Miss | Miss | 52 | 10.0 | dead_early_loss |
| Mariners @ Royals | Seattle Mariners | Miss | Miss | Hit | 63 | 8.6 | dead_early_loss |
| Mets @ Marlins | Miami Marlins | Hit | Hit | Miss | 61 | 3.2 | starter_carried |
| Nationals @ Braves | Atlanta Braves | Miss | Miss | Miss | 66 | 8.9 | dead_early_loss |
| Twins @ Red Sox | Minnesota Twins | Hit | Hit | Hit | 52 | 0.0 | jumped_early_hold |
| Cardinals @ Reds #2 | St. Louis Cardinals | Hit | Hit | Miss | 52 | 4.5 | late_comeback |
| Dodgers @ Brewers | Los Angeles Dodgers | Hit | Hit | Hit | 52 | 1.0 | late_comeback |
| Athletics @ Padres | Athletics | Miss | Miss | Hit | 52 | 4.9 | dead_early_loss |
| Rangers @ Angels | Texas Rangers | Miss | Miss | Hit | 73 | 12.1 | balanced_path |
| Rockies @ Diamondbacks | Arizona Diamondbacks | Hit | Hit | Miss | 52 | 3.9 | starter_carried |

## What killed the side board
- The board finished only `7/14` even though the misses were mostly the same failure path repeated.
- `5/7` misses were `dead_early_loss`.
- The other two misses were `late_push` (`Cardinals @ Reds` game 1) and one `balanced_path` game (`Rangers @ Angels`).
- The winning paths were cleaner and narrower:
  - `starter_carried`: `3`
  - `jumped_early_hold`: `2`
  - `late_comeback`: `2`

The blunt takeaway is that the slate did **not** punish us because the wrong starters melted late. It punished us because the predicted team simply never got going early enough.

## First-inning lane
Overall the original first-inning board finished `7/14`, but the misses were concentrated in the exact over-smoothed YRFI cases:

| Game | Model | Yes% | Actual | Pick 1st | Pick 3rd |
| --- | --- | --- | --- | --- | --- |
| Cardinals @ Reds #1 | YRFI | 88.0 | NRFI | 0 | 1 |
| Guardians @ Phillies | YRFI | 65.8 | NRFI | 0 | 0 |
| White Sox @ Giants | YRFI | 90.2 | NRFI | 0 | 0 |
| Mets @ Marlins | YRFI | 51.1 | NRFI | 0 | 3 |
| Nationals @ Braves | YRFI | 81.4 | NRFI | 0 | 0 |
| Cardinals @ Reds #2 | YRFI | 87.3 | NRFI | 0 | 2 |
| Rockies @ Diamondbacks | YRFI | 83.8 | NRFI | 0 | 3 |

What those misses have in common:
- every miss here was a YRFI that should have respected a quieter early shape
- several of them still had runs by the 3rd inning, which means the bug was **timing**, not total offense
- this is why same-series dead-early suppression and smaller pitcher-sample shrinkage had to get added after the slate

## Props
Overall settled tracked props by lane:
| Prop type | Hits | Settled | Hit rate |
| --- | --- | --- | --- |
| rbi | 0 | 1 | 0.0% |
| singles | 3 | 6 | 50.0% |
| totalBases | 7 | 17 | 41.2% |

Top `8` settled props:
| Rank | Player | Market | Hit | Actual |
| --- | --- | --- | --- | --- |
| 1 | Randal Grichuk | Over 1.5 total bases | Miss | 1.0 |
| 2 | Munetaka Murakami | Over 1.5 total bases | Miss | 0.0 |
| 3 | Blake Dunn | Over 1.5 total bases | Hit | 2.0 |
| 4 | Blake Dunn | Over 1.5 total bases | Hit | 2.0 |
| 5 | Corbin Carroll | Over 1.5 total bases | Hit | 2.0 |
| 6 | Sal Stewart | Over 1.5 total bases | Miss | 0.0 |
| 7 | Sal Stewart | Over 1.5 total bases | Miss | 0.0 |
| 8 | Michael Harris II | Over 1.5 total bases | Miss | 1.0 |

The ugly part is the concentration:
- all top `8` settled props were `Over 1.5 total bases`
- they went `3/8`
- the model was effectively repeating the same fragile market with fake precision

## Research-only veto artifact
- `Pass` calls: `3/6` = `50.0%`
- `Eligible` calls: `4/8` = `50.0%`

What that means:
- the current veto layer is not promotable yet
- it did correctly suppress `Mariners @ Royals` and `Rangers @ Angels`
- it also wrongly suppressed winners like `Astros @ Cubs`, `Twins @ Red Sox`, and `Cardinals @ Reds` game 2

So the veto idea is right, but the current flags are still too blunt to be used as live gates.

## Pipeline gaps exposed today
- `data-private/history/mlb-results-2026-05-23.jsonl` was **not** written by closeout
- the board file contains duplicate `gameId` values: `cardinals-reds`
- importing the May 23 side board only created `13` rows in `mlb_side_predictions` for `14` board picks
- the side grading path still left `mlb_side_backtests` at `0` rows for this model/date

The doubleheader collision (`Cardinals @ Reds`) is the obvious bookkeeping bug. It means part of the daily side audit path is still structurally broken on slates with duplicate matchup slugs.

## Bottom line
- This was not a “market was weird” day so much as a **dead-early, low-conversion** day that the board failed to encode tightly enough.
- The side engine did not find an edge. It landed at straight coin-flip (`7/14`).
- The first-inning lane was also coin-flip (`7/14`) and specifically over-predicted YRFI in quiet-first-inning spots.
- Props were the weakest live lane of all, especially the repeated `TB over 1.5` cluster.

The data from this slate is still useful, but as training data for `dead_early_loss`, timing suppression, and bookkeeping fixes, not as evidence that the current prediction engine is ready.
