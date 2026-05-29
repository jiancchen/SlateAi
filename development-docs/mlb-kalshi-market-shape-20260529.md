# MLB Kalshi Market Shape - 2026-05-29

This report compares the current MLB board to the live Kalshi snapshot for the same slate. The goal is not to treat Kalshi as the truth; it is to see whether the market adds a new dimension to game shape, first-inning scalp logic, or pricing disagreement.

## What Kalshi adds

- executable first-inning entry prices instead of generic 50/50 assumptions
- cross-market shape: `1st inning`, `F5 total`, and `full-game total` all at once
- liquidity context from `open interest` and `volume`
- a disagreement layer when our model is much hotter or colder than the market

## Best current NRFI scalp lanes

These are sorted by the edge between the current `NO` ask and a simple `70c` exit after a scoreless top assumption.

- `Padres @ Nationals`: `NO ask 46c` vs `max entry 52c` for a `70c` exit, edge `+6.1 pts`. Model split: away `25.6%`, home `48.5%`, post-top fair `NO 51.5%`.
- `Marlins @ Mets`: `NO ask 56c` vs `max entry 50c` for a `70c` exit, edge `-5.7 pts`. Model split: away `28.2%`, home `21.3%`, post-top fair `NO 78.7%`.
- `Brewers @ Astros`: `NO ask 51c` vs `max entry 41c` for a `70c` exit, edge `-10.1 pts`. Model split: away `41.5%`, home `33.7%`, post-top fair `NO 66.3%`.
- `Angels @ Rays`: `NO ask 54c` vs `max entry 41c` for a `70c` exit, edge `-13.1 pts`. Model split: away `41.5%`, home `21.8%`, post-top fair `NO 78.2%`.
- `Cubs @ Cardinals`: `NO ask 53c` vs `max entry 39c` for a `70c` exit, edge `-13.6 pts`. Model split: away `43.7%`, home `4.0%`, post-top fair `NO 96.0%`.

## Biggest first-inning market disagreements

These are the largest gaps between our current `YRFI/NRFI` probability split and the live Kalshi ask.

- `Diamondbacks @ Mariners`: model `YRFI 85.1% / 14.9%`, Kalshi `YRFI 46c / NRFI 55c`. Edges: `YRFI +39.1 pts`, `NRFI -40.1 pts`.
- `Twins @ Pirates`: model `YRFI 82.3% / 17.7%`, Kalshi `YRFI 47c / NRFI 54c`. Edges: `YRFI +35.3 pts`, `NRFI -36.3 pts`.
- `Tigers @ White Sox`: model `YRFI 79.7% / 20.3%`, Kalshi `YRFI 51c / NRFI 50c`. Edges: `YRFI +28.7 pts`, `NRFI -29.7 pts`.
- `Blue Jays @ Orioles`: model `YRFI 76.9% / 23.1%`, Kalshi `YRFI 53c / NRFI 48c`. Edges: `YRFI +23.9 pts`, `NRFI -24.9 pts`.
- `Royals @ Rangers`: model `YRFI 70.5% / 29.5%`, Kalshi `YRFI 48c / NRFI 54c`. Edges: `YRFI +22.5 pts`, `NRFI -24.5 pts`.

## Shape archetypes on this slate

### Front-Loaded Under

- `Brewers @ Astros`: `1st YRFI 61.2/38.8`, `FG Under 8 (-1.1)`, `F5 Under 4.4 (-0.6)`, Kalshi `FG Over 8.5 49c/52c` and `F5 Over 4.5 47c/54c`.
- `Giants @ Rockies`: `1st YRFI 74.7/25.3`, `FG Under 10.5 (-1.3)`, `F5 Under 6.2 (-0.8)`, Kalshi `FG Over 10.5 53c/48c` and `F5 Over 6.5 40c/61c`.
- `Padres @ Nationals`: `1st YRFI 61.7/38.3`, `FG Under 9 (-1.0)`, `F5 Under 5.5 (-0.6)`, Kalshi `FG Over 9.5 48c/53c` and `F5 Over 5.5 46c/55c`.
- `Phillies @ Dodgers`: `1st YRFI 68.9/31.1`, `FG Under 8 (-2.4)`, `F5 Under 4.6 (-1.4)`, Kalshi `FG Over 8.5 47c/54c` and `F5 Over 4.5 47c/54c`.
- `Royals @ Rangers`: `1st YRFI 70.5/29.5`, `FG Under 7.5 (-1.8)`, `F5 Under 4.3 (-1.0)`, Kalshi `FG Over 7.5 50c/51c` and `F5 Over 4.5 44c/57c`.
- `Tigers @ White Sox`: `1st YRFI 79.7/20.3`, `FG Under 8.5 (-0.8)`, `F5 Under 4.9 (-0.5)`, Kalshi `FG Over 8.5 52c/49c` and `F5 Over 4.5 54c/47c`.

### Quiet Under

- `Marlins @ Mets`: `1st NRFI 43.5/56.5`, `FG Under 7 (-1.6)`, `F5 Under 3.9 (-0.9)`, Kalshi `FG Over 7.5 47c/54c` and `F5 Over 3.5 55c/46c`.

### Full-Game Run Ladder

- `Diamondbacks @ Mariners`: `1st YRFI 85.1/14.9`, `FG Over 7 (+1.4)`, `F5 Over 4 (+0.8)`, Kalshi `FG Over 7.5 45c/56c` and `F5 Over 3.5 56c/45c`.

### Mixed

- `Angels @ Rays`: `1st YRFI 54.3/45.7`, `FG Under 8 (-0.6)`, `F5 Hold 4.4 (-0.3)`, Kalshi `FG Over 7.5 53c/48c` and `F5 Over 4.5 44c/57c`.
- `Blue Jays @ Orioles`: `1st YRFI 76.9/23.1`, `FG Over 8.5 (+0.6)`, `F5 Hold 4.9 (+0.3)`, Kalshi `FG Over 8.5 55c/46c` and `F5 Over 4.5 56c/45c`.
- `Braves @ Reds`: `1st YRFI 62.8/37.2`, `FG Hold 9.5 (+0.1)`, `F5 Hold 5.7 (+0.1)`, Kalshi `FG Over 9.5 49c/52c` and `F5 Over 5.5 46c/55c`.
- `Cubs @ Cardinals`: `1st NRFI 46.0/54.0`, `FG Hold 7.5 (-0.2)`, `F5 Hold 4.4 (-0.1)`, Kalshi `FG Over 7.5 52c/49c` and `F5 Over 4.5 45c/56c`.
- `Red Sox @ Guardians`: `1st YRFI 61.0/39.0`, `FG Hold 8 (+0.4)`, `F5 Hold 4.6 (+0.2)`, Kalshi `FG Over 7.5 54c/47c` and `F5 Over 4.5 52c/49c`.
- `Twins @ Pirates`: `1st YRFI 82.3/17.7`, `FG Hold 8 (-0.2)`, `F5 Hold 4.3 (-0.1)`, Kalshi `FG Over 8.5 47c/54c` and `F5 Over 4.5 44c/57c`.

## Practical read for today

- The most useful new dimension is **shape**, not raw side value.
- `YRFI/NRFI` is where Kalshi is most actionable because we now have an actual entry price, scalp math, and half-inning split.
- The biggest benefit to the slate today is deciding whether a hot `YRFI`/`NRFI` model read is actually worth touching at the current ask.
- For totals, the Kalshi snapshot is more useful as a confirmation or contradiction layer than as a standalone edge, because our model does not yet convert projected runs into a clean Kalshi fair price.
- For future work, the best path is to join these snapshots to inning state and learn how `NO`, `F5 under`, and full-game totals actually reprice after `scoreless top 1`, `1-0 after 1`, `starter exit`, and `through 5` states.
