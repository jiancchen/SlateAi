# May 29 MLB Postmortem

## Slate snapshot
- Side board (`board-moneyline-v1.1.post-sanity`): `7/15` = `46.7%`
- Raw first-5 lean from the same board: `10/15` = `66.7%` with `0` pushes
- First-inning lane from the original board file: `9/15` = `60.0%`
- `60+` confidence sides: `4/4` = `100.0%`
- `70+` confidence sides: `2/2` = `100.0%`
- Market dogs: `2/8` = `25.0%`
- Market favorites: `5/7` = `71.4%`
- Top `8` settled props: `3/8` = `37.5%`

## What the slate actually was
- `0/15` games were labeled `dead_bat_grind`
- `6/28` team rows were scoreless through the first 3 innings
- `4/28` team rows finished as `dead_early_loss`
- Only `2/28` team rows finished as `starter_crack_loss`

This was a dead-early, low-conversion slate. The board still spent too much energy on paper side strength and too little on whether the pick would actually score before the game script got away from it.

## Side board by game
| Game | Pick | FG | F5 | 1st | Conf | Edge | Path |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Braves @ Reds | Atlanta Braves | Hit | Hit | Hit | 62 | 9.2 | jumped_early_hold |
| Padres @ Nationals | Washington Nationals | Miss | Hit | Hit | 52 | 1.2 | blew_lead_after5 |
| Twins @ Pirates | Minnesota Twins | Miss | Hit | Hit | 52 | 0.4 | blew_lead_after5 |
| Blue Jays @ Orioles | Toronto Blue Jays | Hit | Miss | Miss | 52 | 15.2 | late_comeback |
| Angels @ Rays | Tampa Bay Rays | Hit | Miss | Hit | 73 | 13.3 | late_comeback |
| Marlins @ Mets | Miami Marlins | Miss | Miss | Miss | 52 | 3.9 | balanced_path |
| Red Sox @ Guardians | Boston Red Sox | Miss | Miss | Hit | 52 | 1.7 | starter_crack_loss |
| Cubs @ Cardinals | St. Louis Cardinals | Hit | Hit | Miss | 52 | 0.0 | late_comeback |
| Tigers @ White Sox | Detroit Tigers | Miss | Hit | Miss | 52 | 3.3 | blew_lead_after5 |
| Royals @ Rangers | Kansas City Royals | Miss | Miss | Hit | 52 | 0.8 | dead_early_loss |
| Brewers @ Astros | Houston Astros | Miss | Hit | Miss | 52 | 1.5 | blew_lead_after5 |
| Giants @ Rockies | San Francisco Giants | Miss | Hit | Miss | 52 | 5.3 | blew_lead_after5 |
| Yankees @ Athletics | New York Yankees | Hit | Hit | Hit | 58 | 3.3 | jumped_early_hold |
| Diamondbacks @ Mariners | Seattle Mariners | Hit | Hit | Hit | 71 | 7.8 | jumped_early_hold |
| Phillies @ Dodgers | Los Angeles Dodgers | Hit | Hit | Hit | 62 | 3.8 | jumped_early_hold |

## What killed the side board
- The board finished only `7/15` even though the misses were mostly the same failure path repeated.
- `1/8` misses were `dead_early_loss`.
- The other miss paths were: `blew_lead_after5` x5, `balanced_path` x1, `starter_crack_loss` x1.
- The winning paths were cleaner and narrower:
  - `starter_carried`: `0`
  - `jumped_early_hold`: `4`
  - `late_comeback`: `3`

The blunt takeaway is that the slate did **not** punish us because the wrong starters melted late. It punished us because the predicted team simply never got going early enough.

## First-inning lane
Overall the original first-inning board finished `9/15`, but the misses were concentrated in the exact over-smoothed YRFI cases:

| Game | Model | Yes% | Actual | Pick 1st | Pick 3rd |
| --- | --- | --- | --- | --- | --- |
| Blue Jays @ Orioles | YRFI | 76.9 | NRFI | 0 | 0 |
| Marlins @ Mets | NRFI | 43.5 | YRFI | 0 | 1 |
| Cubs @ Cardinals | NRFI | 47.0 | YRFI | 3 | 3 |
| Tigers @ White Sox | YRFI | 79.7 | NRFI | 0 | 2 |
| Brewers @ Astros | YRFI | 65.1 | NRFI | 0 | 1 |
| Giants @ Rockies | YRFI | 73.5 | NRFI | 0 | 1 |

What those misses have in common:
- every miss here was a YRFI that should have respected a quieter early shape
- several of them still had runs by the 3rd inning, which means the bug was **timing**, not total offense
- this is why same-series dead-early suppression and smaller pitcher-sample shrinkage had to get added after the slate

## Props
Overall settled tracked props by lane:
| Prop type | Hits | Settled | Hit rate |
| --- | --- | --- | --- |
| pitcherStrikeouts | 5 | 13 | 38.5% |
| singles | 2 | 4 | 50.0% |
| totalBases | 11 | 26 | 42.3% |
| walks | 0 | 2 | 0.0% |

Top `8` settled props:
| Rank | Player | Market | Hit | Actual |
| --- | --- | --- | --- | --- |
| 1 | Casey Schmitt | Over 1.5 total bases | Hit | 2.0 |
| 2 | James Wood | Over 1.5 total bases | Miss | 0.0 |
| 3 | Yordan Alvarez | Over 1.5 total bases | Miss | 0.0 |
| 4 | Michael Harris II | Over 1.5 total bases | Hit | 3.0 |
| 5 | CJ Abrams | Over 1.5 total bases | Miss | 0.0 |
| 6 | Jordan Walker | Over 1.5 total bases | Miss | 0.0 |
| 7 | Nathaniel Lowe | Over 1.5 total bases | Hit | 4.0 |
| 8 | Ketel Marte | Over 1.5 total bases | Miss | 0.0 |

The ugly part is the concentration:
- the most common top-`8` market was `Over 1.5 total bases` (`8/8`)
- the top `8` settled props went `3/8`
- the model was effectively repeating the same fragile market with fake precision

## Research-only veto artifact
- `Pass` calls: `4/7` = `57.1%`
- `Eligible` calls: `3/8` = `37.5%`

What that means:
- the current veto layer is not promotable yet
- it needs to be judged by the actual `Pass` vs `Eligible` buckets above, not by blanket suppression

So the veto idea is right, but the current flags are still too blunt to be used as live gates.

## Pipeline gaps exposed today
- `data-private/history/mlb-results-2026-05-29.jsonl` was **not **written by closeout
- the board file contains duplicate `gameId` values: `none`
- importing the May 29 side board only created `0` rows in `mlb_side_predictions` for `15` board picks
- the side grading path still left `mlb_side_backtests` at `0` rows for this model/date

Any duplicate matchup slug or skipped side-import path still breaks part of the daily audit chain, even if the raw outcomes are present.

## Bottom line
- This was not a “market was weird” day so much as a **dead-early, low-conversion** day that the board failed to encode tightly enough.
- The side engine finished `7/15` and still needs a better filter on which edges deserve live exposure.
- The first-inning lane finished `9/15` and still over-predicted YRFI in several quiet-first-inning spots.
- Props were the weakest live lane of all, especially the repeated `TB over 1.5` cluster.

The data from this slate is still useful, but as training data for `dead_early_loss`, timing suppression, and bookkeeping fixes, not as evidence that the current prediction engine is ready.
