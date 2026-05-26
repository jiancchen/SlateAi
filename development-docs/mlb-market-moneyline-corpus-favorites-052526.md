# MLB Market ML Training — May 25, 2026

This pass replaces the old `50% is acceptable` mindset with walk-forward machine learning, calibration-oriented scoring, and hard abstention thresholds.

## moneyline

Candidate scoreboard:

| Model | Log loss | Brier | Accuracy | Sample |
| --- | --- | --- | --- | --- |
| forest | 0.7135 | 0.2597 | 0.5033 | 151 |
| catboost | 0.7325 | 0.2679 | 0.4967 | 151 |
| xgboost | 0.8074 | 0.2975 | 0.4503 | 151 |
| lightgbm | 0.8084 | 0.3008 | 0.4305 | 151 |

- Best model: `forest`
- Walk-forward log loss: `0.7135`
- Walk-forward Brier: `0.2597`
- Walk-forward accuracy: `0.5033`
- OOF sample size: `151`
- Fitness threshold: `0.60`
- Threshold record: `21-16` on `37` plays (`56.8%`)
- Promotable today: `no`

| Matchup | Action | Pick | Probability |
| --- | --- | --- | --- |
| Rockies @ Dodgers | Pass | Pass | 0.573 |
| Reds @ Mets | Pass | Pass | 0.514 |
| Diamondbacks @ Giants | Pass | Pass | 0.511 |
| Astros @ Rangers | Pass | Pass | 0.504 |
| Rays @ Orioles | Pass | Pass | 0.502 |
| Nationals @ Guardians | Pass | Pass | 0.501 |
| Cardinals @ Brewers | Pass | Pass | 0.487 |
| Marlins @ Blue Jays | Pass | Pass | 0.481 |
| Phillies @ Padres | Pass | Pass | 0.476 |
| Cubs @ Pirates | Pass | Pass | 0.467 |
| Mariners @ Athletics | Pass | Pass | 0.455 |
| Yankees @ Royals | Pass | Pass | 0.453 |
