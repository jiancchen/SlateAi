# MLB Market ML Training — May 25, 2026

This pass replaces the old `50% is acceptable` mindset with walk-forward machine learning, calibration-oriented scoring, and hard abstention thresholds.

## moneyline

Candidate scoreboard:

| Model | Log loss | Brier | Accuracy | Sample |
| --- | --- | --- | --- | --- |
| lightgbm | 0.7438 | 0.2700 | 0.5266 | 1468 |

- Best model: `lightgbm`
- Walk-forward log loss: `0.7438`
- Walk-forward Brier: `0.2700`
- Walk-forward accuracy: `0.5266`
- OOF sample size: `1468`
- Fitness threshold: `0.69`
- Threshold record: `150-103` on `253` plays (`59.3%`)
- Promotable today: `no`

| Matchup | Action | Pick | Probability |
| --- | --- | --- | --- |
| Nationals @ Guardians | Pass | Pass | 0.735 |
| Cardinals @ Brewers | Pass | Pass | 0.652 |
| Rockies @ Dodgers | Pass | Pass | 0.605 |
| Diamondbacks @ Giants | Pass | Pass | 0.603 |
| Phillies @ Padres | Pass | Pass | 0.599 |
| Yankees @ Royals | Pass | Pass | 0.596 |
| Reds @ Mets | Pass | Pass | 0.570 |
| Marlins @ Blue Jays | Pass | Pass | 0.549 |
| Mariners @ Athletics | Pass | Pass | 0.545 |
| Astros @ Rangers | Pass | Pass | 0.544 |
| Twins @ White Sox | Pass | Pass | 0.526 |
| Rays @ Orioles | Pass | Pass | 0.514 |
