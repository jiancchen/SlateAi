# MLB-M2 Game-Shape Backtest

Range: 2026-05-10 to 2026-05-31. Canonical settled side rows: 212 across 16 dates.

M2 is not trying to make every side pick smarter by one point. It classifies the game into the market lane that best matches the expected inning shape.

## Headline

| Check | Rows | Result |
| --- | --- | --- |
| Baseline full-game side | 212 | 59.0% |
| Baseline first-five side | 212 | 52.8% |
| M2 allowed-side bucket | 40 | 67.5% |
| M2 starter/timing F5 bucket | 65 | 58.5% |
| M2 category lane hit | 195 | 62.6% |

## Coverage

| Artifact | Rows |
| --- | --- |
| Published summary context | 212 |
| Warehouse phase labels | 212 |
| First-inning graded rows | 44 |
| Full-game total graded rows | 145 |
| First-five total graded rows | 129 |

## Category Backtest

| Category | Rows | FG hit | F5 hit | Lane hit | YRFI rate | Avg runs |
| --- | --- | --- | --- | --- | --- | --- |
| Crooked-inning game | 57 | 50.9% | 47.4% | 54.4% | 33.3% | 8.77 |
| Weather-carry chaos | 41 | 56.1% | 39.0% | 58.5% | 41.7% | 9.8 |
| Starter-to-bullpen flip | 35 | 60.0% | 68.6% | 68.6% | 28.6% | 8.89 |
| Early-pressure side | 30 | 63.3% | 46.7% | 63.3% | 0.0% | 7.07 |
| Balanced traffic game | 17 | 76.5% | 47.1% | N/A | N/A | 8.12 |
| Dead-zone side | 17 | 52.9% | 70.6% | 70.6% | 25.0% | 8.12 |
| Favorite conversion trap | 5 | 60.0% | 80.0% | 80.0% | 100.0% | 7.6 |
| Late-rescue side | 4 | 50.0% | 50.0% | 50.0% | N/A | 6.0 |
| Underdog pressure lane | 4 | 100.0% | 75.0% | 100.0% | N/A | 9.25 |
| Clean phase stack | 2 | 100.0% | 100.0% | 100.0% | N/A | 10.0 |

## Day By Day

| Date | Rows | FG | F5 | M2 lane | Avoid saved | Main categories |
| --- | --- | --- | --- | --- | --- | --- |
| 2026-05-10 | 15 | 60.0% | 40.0% | 44.4% | 0 | Crooked-inning game 7, Balanced traffic game 6, Underdog pressure lane 2 |
| 2026-05-11 | 6 | 66.7% | 66.7% | 50.0% | 0 | Crooked-inning game 3, Balanced traffic game 2, Starter-to-bullpen flip 1 |
| 2026-05-12 | 15 | 80.0% | 80.0% | 58.3% | 0 | Crooked-inning game 6, Balanced traffic game 3, Early-pressure side 3 |
| 2026-05-13 | 13 | 61.5% | 53.8% | 72.7% | 0 | Early-pressure side 4, Crooked-inning game 4, Balanced traffic game 2 |
| 2026-05-14 | 11 | 54.5% | 36.4% | 60.0% | 0 | Starter-to-bullpen flip 4, Crooked-inning game 3, Early-pressure side 2 |
| 2026-05-15 | 15 | 66.7% | 80.0% | 80.0% | 1 | Crooked-inning game 4, Favorite conversion trap 3, Starter-to-bullpen flip 3 |
| 2026-05-16 | 15 | 40.0% | 53.3% | 64.3% | 2 | Starter-to-bullpen flip 6, Crooked-inning game 3, Dead-zone side 2 |
| 2026-05-17 | 15 | 60.0% | 46.7% | 60.0% | 0 | Starter-to-bullpen flip 4, Crooked-inning game 4, Dead-zone side 3 |
| 2026-05-18 | 14 | 50.0% | 35.7% | 69.2% | 0 | Weather-carry chaos 8, Dead-zone side 2, Crooked-inning game 1 |
| 2026-05-19 | 15 | 73.3% | 53.3% | 71.4% | 0 | Weather-carry chaos 8, Early-pressure side 3, Starter-to-bullpen flip 1 |
| 2026-05-20 | 13 | 53.8% | 38.5% | 69.2% | 1 | Weather-carry chaos 6, Crooked-inning game 3, Early-pressure side 1 |
| 2026-05-21 | 7 | 71.4% | 42.9% | 28.6% | 0 | Crooked-inning game 3, Weather-carry chaos 2, Starter-to-bullpen flip 2 |
| 2026-05-22 | 14 | 50.0% | 42.9% | 42.9% | 1 | Weather-carry chaos 5, Starter-to-bullpen flip 3, Crooked-inning game 3 |
| 2026-05-23 | 14 | 50.0% | 50.0% | 50.0% | 1 | Weather-carry chaos 5, Starter-to-bullpen flip 4, Crooked-inning game 3 |
| 2026-05-30 | 15 | 40.0% | 60.0% | 73.3% | 2 | Crooked-inning game 5, Early-pressure side 5, Dead-zone side 2 |
| 2026-05-31 | 15 | 73.3% | 60.0% | 73.3% | 2 | Weather-carry chaos 5, Crooked-inning game 4, Early-pressure side 2 |

## Walk-Forward Crazy-Idea Models

| Experiment | Rows | Action rows | Hit | No-action | Action detail |
| --- | --- | --- | --- | --- | --- |
| walk-forward RF lane chooser | 133 | 133 | 53.4% | 19 | high_total_shape 46 @ 56.5%; avoid_ml 40 @ 47.5%; f5_side 24 @ 62.5%; fg_side 23 @ 47.8% |
| walk-forward gradient lane chooser | 141 | 141 | 53.9% | 11 | fg_side 55 @ 54.5%; avoid_ml 33 @ 39.4%; high_total_shape 33 @ 60.6%; f5_side 20 @ 65.0% |
| walk-forward logistic lane chooser | 152 | 152 | 47.4% | 0 | avoid_ml 51 @ 41.2%; fg_side 46 @ 56.5%; high_total_shape 39 @ 51.3%; f5_side 16 @ 31.2% |

## Rule Sweep Discoveries

| Rule | Lane | Rows | Hit | Base | Lift |
| --- | --- | --- | --- | --- | --- |
| chaos_score >= 70 | YRFI shape | 12 | 50.0% | 29.5% | +20.4 pts |
| starter_control_score >= 55 | FG side | 36 | 77.8% | 59.0% | +18.8 pts |
| opponent_chaos_gap >= 5 | YRFI shape | 17 | 47.1% | 29.5% | +17.5 pts |
| starter_control_score >= 62 | FG side | 21 | 76.2% | 59.0% | +17.2 pts |
| reality_gap_score >= 70 | YRFI shape | 11 | 45.5% | 29.5% | +15.9 pts |
| phase_split_score >= 62 | Model full total | 20 | 65.0% | 49.7% | +15.3 pts |
| starter_control_score >= 55 | NRFI shape | 14 | 85.7% | 70.5% | +15.3 pts |
| phase_split_score >= 55 | F5 side | 45 | 66.7% | 52.8% | +13.8 pts |
| phase_split_score >= 62 | F5 side | 24 | 66.7% | 52.8% | +13.8 pts |
| chaos_score >= 70 | High-total shape | 43 | 62.8% | 49.1% | +13.7 pts |
| pick_lineup_conversion <= 25 | Model F5 total | 25 | 64.0% | 50.4% | +13.6 pts |
| reality_gap_score >= 65 | YRFI shape | 21 | 42.9% | 29.5% | +13.3 pts |

## May 31 Stress Slate

| Game | Pick | M2 category | Best expression | FG | F5 | Actual path | Runs | Gap |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Angels @ Rays | Tampa Bay Rays | Crooked-inning game | Full-game total / team total / HR cluster | 1 | 1 | jumped_early_hold | 7.0 | 74.5 |
| Blue Jays @ Orioles | Toronto Blue Jays | Dead-zone side | First-five timing or live after conversion; no blind full-game ML | 0 | 0 | starter_crack_loss | 14.0 | 61.9 |
| Braves @ Reds | Atlanta Braves | Favorite conversion trap | No taxed ML; require early conversion or better live price | 0 | 0 | balanced_path | 10.0 | 61.3 |
| Brewers @ Astros | Milwaukee Brewers | Early-pressure side | Full-game side only if early traffic appears; live entry preferred | 1 | 1 | starter_carried | 2.0 | 46.7 |
| Cubs @ Cardinals | St. Louis Cardinals | Starter-to-bullpen flip | First-five side or live lead | 1 | 1 | jumped_early_hold | 6.0 | 77.4 |
| Diamondbacks @ Mariners | Seattle Mariners | Early-pressure side | Full-game side only if early traffic appears; live entry preferred | 1 | 1 | starter_carried | 5.0 | 43.8 |
| Giants @ Rockies | San Francisco Giants | Weather-carry chaos | Totals / HR cluster before side | 1 | 1 | jumped_early_hold | 25.0 | 69.7 |
| Marlins @ Mets | Miami Marlins | Weather-carry chaos | Totals / HR cluster before side | 0 | 0 | dead_early_loss | 11.0 | 70.1 |
| Padres @ Nationals | Washington Nationals | Starter-to-bullpen flip | First-five side or live lead | 1 | 1 | starter_carried | 6.0 | 77.5 |
| Phillies @ Dodgers | Los Angeles Dodgers | Weather-carry chaos | Totals / HR cluster before side | 1 | 1 | starter_carried | 10.0 | 58.9 |
| Red Sox @ Guardians | Boston Red Sox | Crooked-inning game | Full-game total / team total / HR cluster | 1 | 0 | late_comeback | 13.0 | 62.0 |
| Royals @ Rangers | Kansas City Royals | Crooked-inning game | Full-game total / team total / HR cluster | 0 | 0 | dead_early_loss | 9.0 | 79.1 |
| Tigers @ White Sox | Chicago White Sox | Crooked-inning game | Full-game total / team total / HR cluster | 1 | 0 | late_comeback | 3.0 | 59.7 |
| Twins @ Pirates | Pittsburgh Pirates | Weather-carry chaos | Totals / HR cluster before side | 1 | 1 | starter_carried | 12.0 | 64.1 |
| Yankees @ Athletics | New York Yankees | Weather-carry chaos | Totals / HR cluster before side | 1 | 1 | late_comeback | 21.0 | 71.9 |

## Interpretation

- M2 should not publish one generic `risky` flag. The category decides the lane: side, F5, total, first inning, live-only, or no pregame ML.
- Full-game downgrade labels are not automatic fades. The category has to name the replacement lane, usually F5, total, first inning, or live entry.
- Crooked-inning and weather-carry labels are graded against high-run shape here, not sportsbook ROI. They need line-specific EV before promotion.
- This is a draft proof layer. Promotion requires day-by-day settlement after it is wired into actual M2 run artifacts.

