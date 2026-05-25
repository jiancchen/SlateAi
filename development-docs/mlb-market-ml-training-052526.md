# MLB Market ML Training — May 25, 2026

This pass replaces the old `50% is acceptable` mindset with walk-forward machine learning, calibration-oriented scoring, and hard abstention thresholds.

## moneyline

- Best model: `forest`
- Walk-forward log loss: `0.7129`
- Walk-forward Brier: `0.2592`
- Walk-forward accuracy: `0.5580`
- OOF sample size: `138`
- Fitness threshold: `0.57`
- Threshold record: `21-14` on `35` plays (`60.0%`)
- Promotable today: `no`

| Matchup | Action | Pick | Probability |
| --- | --- | --- | --- |
| Astros @ Rangers | Pass | Pass | 0.607 |
| Rays @ Orioles | Pass | Pass | 0.601 |
| Phillies @ Padres | Pass | Pass | 0.582 |
| Marlins @ Blue Jays | Pass | Pass | 0.571 |
| Reds @ Mets | Pass | Pass | 0.539 |
| Twins @ White Sox | Pass | Pass | 0.532 |
| Cubs @ Pirates | Pass | Pass | 0.518 |
| Rockies @ Dodgers | Pass | Pass | 0.506 |
| Cardinals @ Brewers | Pass | Pass | 0.505 |
| Mariners @ Athletics | Pass | Pass | 0.495 |
| Yankees @ Royals | Pass | Pass | 0.494 |
| Nationals @ Guardians | Pass | Pass | 0.488 |

## first5

- Best model: `forest`
- Walk-forward log loss: `0.7041`
- Walk-forward Brier: `0.2546`
- Walk-forward accuracy: `0.5128`
- OOF sample size: `117`
- Fitness threshold: `0.70`
- Threshold record: `16-5` on `21` plays (`76.2%`)
- Promotable today: `yes`

| Matchup | Action | Pick | Probability |
| --- | --- | --- | --- |
| Marlins @ Blue Jays | Play | Blue Jays | 0.745 |
| Cardinals @ Brewers | Pass | Pass | 0.614 |
| Rays @ Orioles | Pass | Pass | 0.601 |
| Cubs @ Pirates | Pass | Pass | 0.540 |
| Astros @ Rangers | Pass | Pass | 0.515 |
| Diamondbacks @ Giants | Pass | Pass | 0.507 |
| Nationals @ Guardians | Pass | Pass | 0.507 |
| Twins @ White Sox | Pass | Pass | 0.501 |
| Yankees @ Royals | Pass | Pass | 0.496 |
| Reds @ Mets | Pass | Pass | 0.485 |
| Rockies @ Dodgers | Pass | Pass | 0.484 |
| Mariners @ Athletics | Pass | Pass | 0.474 |

## totals

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

- Best model: `forest`
- Walk-forward log loss: `0.7079`
- Walk-forward Brier: `0.2557`
- Walk-forward accuracy: `0.5417`
- OOF sample size: `120`
- Fitness threshold: `0.63`
- Threshold record: `19-13` on `32` plays (`59.4%`)
- Promotable today: `no`

| Matchup | Action | Pick | Probability |
| --- | --- | --- | --- |
| Phillies @ Padres | Pass | Pass | 0.527 |
| Yankees @ Royals | Pass | Pass | 0.509 |
| Cubs @ Pirates | Pass | Pass | 0.469 |
| Nationals @ Guardians | Pass | Pass | 0.469 |
| Twins @ White Sox | Pass | Pass | 0.466 |
| Rockies @ Dodgers | Pass | Pass | 0.456 |
| Mariners @ Athletics | Pass | Pass | 0.447 |
| Rays @ Orioles | Pass | Pass | 0.432 |
| Marlins @ Blue Jays | Pass | Pass | 0.428 |
| Cardinals @ Brewers | Pass | Pass | 0.401 |
| Astros @ Rangers | Pass | Pass | 0.381 |
| Diamondbacks @ Giants | Pass | Pass | 0.301 |
