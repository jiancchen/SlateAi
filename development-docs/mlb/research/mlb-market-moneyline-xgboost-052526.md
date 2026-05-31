# MLB Market ML Training — May 25, 2026

This pass replaces the old `50% is acceptable` mindset with walk-forward machine learning, calibration-oriented scoring, and hard abstention thresholds.

## moneyline

Candidate scoreboard:

| Model | Log loss | Brier | Accuracy | Sample |
| --- | --- | --- | --- | --- |
| xgboost | 0.7327 | 0.2661 | 0.5232 | 1468 |

- Best model: `xgboost`
- Walk-forward log loss: `0.7327`
- Walk-forward Brier: `0.2661`
- Walk-forward accuracy: `0.5232`
- OOF sample size: `1468`
- Fitness threshold: `0.67`
- Threshold record: `122-98` on `220` plays (`55.5%`)
- Promotable today: `no`

| Matchup | Action | Pick | Probability |
| --- | --- | --- | --- |
| Nationals @ Guardians | Pass | Pass | 0.610 |
| Rockies @ Dodgers | Pass | Pass | 0.608 |
| Cubs @ Pirates | Pass | Pass | 0.605 |
| Yankees @ Royals | Pass | Pass | 0.603 |
| Astros @ Rangers | Pass | Pass | 0.555 |
| Phillies @ Padres | Pass | Pass | 0.544 |
| Cardinals @ Brewers | Pass | Pass | 0.521 |
| Mariners @ Athletics | Pass | Pass | 0.520 |
| Marlins @ Blue Jays | Pass | Pass | 0.518 |
| Diamondbacks @ Giants | Pass | Pass | 0.508 |
| Rays @ Orioles | Pass | Pass | 0.506 |
| Reds @ Mets | Pass | Pass | 0.496 |
