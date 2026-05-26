# MLB Market ML Training — May 25, 2026

This pass replaces the old `50% is acceptable` mindset with walk-forward machine learning, calibration-oriented scoring, and hard abstention thresholds.

## moneyline

Candidate scoreboard:

| Model | Log loss | Brier | Accuracy | Sample |
| --- | --- | --- | --- | --- |
| catboost | 0.7122 | 0.2586 | 0.5211 | 1468 |

- Best model: `catboost`
- Walk-forward log loss: `0.7122`
- Walk-forward Brier: `0.2586`
- Walk-forward accuracy: `0.5211`
- OOF sample size: `1468`
- Fitness threshold: `0.60`
- Threshold record: `131-111` on `242` plays (`54.1%`)
- Promotable today: `no`

| Matchup | Action | Pick | Probability |
| --- | --- | --- | --- |
| Cardinals @ Brewers | Pass | Pass | 0.600 |
| Cubs @ Pirates | Pass | Pass | 0.596 |
| Nationals @ Guardians | Pass | Pass | 0.583 |
| Diamondbacks @ Giants | Pass | Pass | 0.582 |
| Phillies @ Padres | Pass | Pass | 0.573 |
| Reds @ Mets | Pass | Pass | 0.551 |
| Rays @ Orioles | Pass | Pass | 0.551 |
| Marlins @ Blue Jays | Pass | Pass | 0.541 |
| Rockies @ Dodgers | Pass | Pass | 0.540 |
| Mariners @ Athletics | Pass | Pass | 0.537 |
| Astros @ Rangers | Pass | Pass | 0.535 |
| Yankees @ Royals | Pass | Pass | 0.533 |
