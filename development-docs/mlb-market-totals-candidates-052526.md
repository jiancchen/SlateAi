# MLB Market ML Training — May 25, 2026

This pass replaces the old `50% is acceptable` mindset with walk-forward machine learning, calibration-oriented scoring, and hard abstention thresholds.

## totals

Candidate scoreboard:

| Model | Log loss | Brier | Accuracy | Sample |
| --- | --- | --- | --- | --- |
| forest | 0.6756 | 0.2414 | 0.5566 | 106 |
| catboost | 0.7064 | 0.2540 | 0.5283 | 106 |
| xgboost | 0.7264 | 0.2582 | 0.5755 | 106 |
| lightgbm | 0.7356 | 0.2670 | 0.5377 | 106 |
| hist_gb | 0.8841 | 0.2892 | 0.5755 | 106 |

- Best model: `forest`
- Walk-forward log loss: `0.6756`
- Walk-forward Brier: `0.2414`
- Walk-forward accuracy: `0.5566`
- OOF sample size: `106`
- Fitness threshold: `0.61`
- Threshold record: `31-14` on `45` plays (`68.9%`)
- Promotable today: `yes`

| Matchup | Action | Pick | Probability |
| --- | --- | --- | --- |
| Diamondbacks @ Giants | Pass | Pass | 0.590 |
| Rockies @ Dodgers | Pass | Pass | 0.557 |
| Cardinals @ Brewers | Pass | Pass | 0.444 |
| Marlins @ Blue Jays | Pass | Pass | 0.430 |
| Astros @ Rangers | Pass | Pass | 0.426 |
| Twins @ White Sox | Pass | Pass | 0.424 |
| Nationals @ Guardians | Play | Under | 0.385 |
| Rays @ Orioles | Play | Under | 0.316 |
| Cubs @ Pirates | Play | Under | 0.310 |
| Phillies @ Padres | Play | Under | 0.281 |
| Mariners @ Athletics | Play | Under | 0.225 |
