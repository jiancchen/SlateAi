# May 28 MLB Postmortem

## Slate snapshot
- Side board (`board-moneyline-v1.1.post-sanity`): `3/6` = `50.0%`
- Raw first-5 lean from the same board: `1/6` = `16.7%` with `0` pushes
- First-inning lane from the original board file: `3/6` = `50.0%`
- `60+` confidence sides: `2/4` = `50.0%`
- `70+` confidence sides: `0/0` = `0.0%`
- Market dogs: `0/0` = `0.0%`
- Market favorites: `3/6` = `50.0%`
- Top `8` settled props: `3/8` = `37.5%`

## What the slate actually was
- `1/6` games were labeled `dead_bat_grind`
- `7/28` team rows were scoreless through the first 3 innings
- `3/28` team rows finished as `dead_early_loss`
- Only `1/28` team rows finished as `starter_crack_loss`

This was a dead-early, low-conversion slate. The board still spent too much energy on paper side strength and too little on whether the pick would actually score before the game script got away from it.

## Side board by game
| Game | Pick | FG | F5 | 1st | Conf | Edge | Path |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Angels @ Tigers | Detroit Tigers | Miss | Miss | Miss | 52 | 4.0 | balanced_path |
| Twins @ White Sox | Chicago White Sox | Hit | Hit | Hit | 62 | 19.4 | jumped_early_hold |
| Braves @ Red Sox | Atlanta Braves | Hit | Miss | Hit | 62 | 6.6 | late_push |
| Blue Jays @ Orioles | Toronto Blue Jays | Hit | Miss | Miss | 52 | 2.8 | balanced_path |
| Cubs @ Pirates | Pittsburgh Pirates | Miss | Miss | Miss | 64 | 11.5 | dead_early_loss |
| Astros @ Rangers | Texas Rangers | Miss | Miss | Hit | 62 | 1.4 | balanced_path |

## What killed the side board
- The board finished only `3/6` even though the misses were mostly the same failure path repeated.
- `1/3` misses were `dead_early_loss`.
- The other miss paths were: `balanced_path` x2.
- The winning paths were cleaner and narrower:
  - `starter_carried`: `0`
  - `jumped_early_hold`: `1`
  - `late_comeback`: `0`

The blunt takeaway is that the slate did **not** punish us because the wrong starters melted late. It punished us because the predicted team simply never got going early enough.

## First-inning lane
Overall the original first-inning board finished `3/6`, but the misses were concentrated in the exact over-smoothed YRFI cases:

| Game | Model | Yes% | Actual | Pick 1st | Pick 3rd |
| --- | --- | --- | --- | --- | --- |
| Angels @ Tigers | YRFI | 68.7 | NRFI | 0 | 1 |
| Blue Jays @ Orioles | YRFI | 83.4 | NRFI | 0 | 1 |
| Cubs @ Pirates | YRFI | 77.9 | NRFI | 0 | 0 |

What those misses have in common:
- every miss here was a YRFI that should have respected a quieter early shape
- several of them still had runs by the 3rd inning, which means the bug was **timing**, not total offense
- this is why same-series dead-early suppression and smaller pitcher-sample shrinkage had to get added after the slate

## Props
Overall settled tracked props by lane:
| Prop type | Hits | Settled | Hit rate |
| --- | --- | --- | --- |
| pitcherStrikeouts | 4 | 8 | 50.0% |
| singles | 1 | 3 | 33.3% |
| totalBases | 3 | 10 | 30.0% |

Top `8` settled props:
| Rank | Player | Market | Hit | Actual |
| --- | --- | --- | --- | --- |
| 1 | Brandon Lowe | Over 1.5 total bases | Miss | 0.0 |
| 2 | Munetaka Murakami | Over 1.5 total bases | Hit | 2.0 |
| 3 | Gunnar Henderson | Over 1.5 total bases | Miss | 0.0 |
| 4 | Dillon Dingler | Over 1.5 total bases | Miss | 0.0 |
| 5 | Spencer Horwitz | Over 1.5 total bases | Miss | 0.0 |
| 6 | Colt Keith | Over 0.5 singles | Miss | 0.0 |
| 7 | Nathan Lukes | Over 0.5 singles | Hit | 1.0 |
| 8 | Payton Tolle | Over 5.5 strikeouts | Hit | 7.0 |

The ugly part is the concentration:
- the most common top-`8` market was `Over 1.5 total bases` (`5/8`)
- the top `8` settled props went `3/8`
- the model was effectively repeating the same fragile market with fake precision

## Research-only veto artifact
- `Pass` calls: `2/3` = `66.7%`
- `Eligible` calls: `1/3` = `33.3%`

What that means:
- the current veto layer is not promotable yet
- it needs to be judged by the actual `Pass` vs `Eligible` buckets above, not by blanket suppression

So the veto idea is right, but the current flags are still too blunt to be used as live gates.

## Pipeline gaps exposed today
- `data-private/history/mlb-results-2026-05-28.jsonl` was written by closeout
- the board file contains duplicate `gameId` values: `none`
- importing the May 28 side board only created `0` rows in `mlb_side_predictions` for `6` board picks
- the side grading path still left `mlb_side_backtests` at `0` rows for this model/date

Any duplicate matchup slug or skipped side-import path still breaks part of the daily audit chain, even if the raw outcomes are present.

## Bottom line
- This was not a “market was weird” day so much as a **dead-early, low-conversion** day that the board failed to encode tightly enough.
- The side engine finished `3/6` and still needs a better filter on which edges deserve live exposure.
- The first-inning lane finished `3/6` and still over-predicted YRFI in several quiet-first-inning spots.
- Props were the weakest live lane of all, especially the repeated `TB over 1.5` cluster.

The data from this slate is still useful, but as training data for `dead_early_loss`, timing suppression, and bookkeeping fixes, not as evidence that the current prediction engine is ready.
