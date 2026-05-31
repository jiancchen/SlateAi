# MLB Market ML Training — May 25, 2026

This pass replaces the old `50% is acceptable` mindset with walk-forward machine learning, calibration-oriented scoring, and hard abstention thresholds.

## moneyline

Candidate scoreboard:

| Model | Log loss | Brier | Accuracy | Sample |
| --- | --- | --- | --- | --- |
| forest | 0.7280 | 0.2666 | 0.5040 | 125 |
| catboost | 0.7451 | 0.2731 | 0.4800 | 125 |
| lightgbm | 0.8035 | 0.2971 | 0.4640 | 125 |
| xgboost | 0.8065 | 0.2948 | 0.4960 | 125 |

- Best model: `forest`
- Walk-forward log loss: `0.7280`
- Walk-forward Brier: `0.2666`
- Walk-forward accuracy: `0.5040`
- OOF sample size: `125`
- Fitness threshold: `0.60`
- Threshold record: `0-0` on `0` plays (`0.0%`)
- Promotable today: `no`

| Matchup | Action | Pick | Probability |
| --- | --- | --- | --- |
| Cubs @ Pirates | Pass | Pass | 0.542 |
| Diamondbacks @ Giants | Pass | Pass | 0.531 |
| Twins @ White Sox | Pass | Pass | 0.530 |
| Mariners @ Athletics | Pass | Pass | 0.515 |
| Cardinals @ Brewers | Pass | Pass | 0.503 |
| Phillies @ Padres | Pass | Pass | 0.498 |
| Astros @ Rangers | Pass | Pass | 0.487 |
| Rockies @ Dodgers | Pass | Pass | 0.483 |
| Nationals @ Guardians | Pass | Pass | 0.470 |
| Marlins @ Blue Jays | Pass | Pass | 0.470 |
| Rays @ Orioles | Pass | Pass | 0.437 |
