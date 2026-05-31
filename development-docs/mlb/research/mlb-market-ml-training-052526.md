# MLB Market ML Training — May 25, 2026

This pass replaces the old `50% is acceptable` mindset with walk-forward machine learning, calibration-oriented scoring, and hard abstention thresholds.

## moneyline

Candidate scoreboard:

| Model | Log loss | Brier | Accuracy | Sample |
| --- | --- | --- | --- | --- |
| forest | 0.6974 | 0.2520 | 0.5273 | 1464 |

- Best model: `forest`
- Walk-forward log loss: `0.6974`
- Walk-forward Brier: `0.2520`
- Walk-forward accuracy: `0.5273`
- OOF sample size: `1464`
- Fitness threshold: `0.56`
- Threshold record: `127-123` on `250` plays (`50.8%`)
- Promotable today: `no`

| Matchup | Action | Pick | Probability |
| --- | --- | --- | --- |
| Cubs @ Pirates | Pass | Pass | 0.573 |
| Nationals @ Guardians | Pass | Pass | 0.535 |
| Mariners @ Athletics | Pass | Pass | 0.523 |
| Yankees @ Royals | Pass | Pass | 0.520 |
| Marlins @ Blue Jays | Pass | Pass | 0.517 |
| Astros @ Rangers | Pass | Pass | 0.509 |
| Rockies @ Dodgers | Pass | Pass | 0.508 |
| Cardinals @ Brewers | Pass | Pass | 0.504 |
| Reds @ Mets | Pass | Pass | 0.504 |
| Phillies @ Padres | Pass | Pass | 0.503 |
| Diamondbacks @ Giants | Pass | Pass | 0.503 |
| Twins @ White Sox | Pass | Pass | 0.499 |

## first5

Candidate scoreboard:

| Model | Log loss | Brier | Accuracy | Sample |
| --- | --- | --- | --- | --- |
| forest | 0.7019 | 0.2541 | 0.4838 | 1238 |

- Best model: `forest`
- Walk-forward log loss: `0.7019`
- Walk-forward Brier: `0.2541`
- Walk-forward accuracy: `0.4838`
- OOF sample size: `1238`
- Fitness threshold: `0.57`
- Threshold record: `110-98` on `208` plays (`52.9%`)
- Promotable today: `no`

| Matchup | Action | Pick | Probability |
| --- | --- | --- | --- |
| Cubs @ Pirates | Pass | Pass | 0.593 |
| Marlins @ Blue Jays | Pass | Pass | 0.544 |
| Nationals @ Guardians | Pass | Pass | 0.538 |
| Twins @ White Sox | Pass | Pass | 0.538 |
| Reds @ Mets | Pass | Pass | 0.534 |
| Mariners @ Athletics | Pass | Pass | 0.532 |
| Astros @ Rangers | Pass | Pass | 0.527 |
| Rays @ Orioles | Pass | Pass | 0.522 |
| Rockies @ Dodgers | Pass | Pass | 0.520 |
| Phillies @ Padres | Pass | Pass | 0.520 |
| Cardinals @ Brewers | Pass | Pass | 0.518 |
| Diamondbacks @ Giants | Pass | Pass | 0.509 |

## totals

Candidate scoreboard:

| Model | Log loss | Brier | Accuracy | Sample |
| --- | --- | --- | --- | --- |
| forest | 0.6756 | 0.2414 | 0.5566 | 106 |

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

## firstInning

Candidate scoreboard:

| Model | Log loss | Brier | Accuracy | Sample |
| --- | --- | --- | --- | --- |
| forest | 0.7067 | 0.2551 | 0.5447 | 123 |

- Best model: `forest`
- Walk-forward log loss: `0.7067`
- Walk-forward Brier: `0.2551`
- Walk-forward accuracy: `0.5447`
- OOF sample size: `123`
- Fitness threshold: `0.62`
- Threshold record: `22-15` on `37` plays (`59.5%`)
- Promotable today: `no`

| Matchup | Action | Pick | Probability |
| --- | --- | --- | --- |
| Phillies @ Padres | Pass | Pass | 0.533 |
| Yankees @ Royals | Pass | Pass | 0.514 |
| Mariners @ Athletics | Pass | Pass | 0.504 |
| Nationals @ Guardians | Pass | Pass | 0.499 |
| Cubs @ Pirates | Pass | Pass | 0.492 |
| Rockies @ Dodgers | Pass | Pass | 0.484 |
| Rays @ Orioles | Pass | Pass | 0.454 |
| Marlins @ Blue Jays | Pass | Pass | 0.451 |
| Twins @ White Sox | Pass | Pass | 0.450 |
| Cardinals @ Brewers | Pass | Pass | 0.424 |
| Astros @ Rangers | Pass | Pass | 0.422 |
| Reds @ Mets | Play | NRFI | 0.302 |
