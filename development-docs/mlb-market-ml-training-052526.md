# MLB Market ML Training — May 25, 2026

This pass replaces the old `50% is acceptable` mindset with walk-forward machine learning, calibration-oriented scoring, and hard abstention thresholds.

## moneyline

- Best model: `forest`
- Walk-forward log loss: `0.6984`
- Walk-forward Brier: `0.2524`
- Walk-forward accuracy: `0.5163`
- OOF sample size: `1468`
- Fitness threshold: `0.56`
- Threshold record: `146-127` on `273` plays (`53.5%`)
- Promotable today: `no`

| Matchup | Action | Pick | Probability |
| --- | --- | --- | --- |
| Cardinals @ Brewers | Pass | Pass | 0.539 |
| Cubs @ Pirates | Pass | Pass | 0.536 |
| Rays @ Orioles | Pass | Pass | 0.527 |
| Nationals @ Guardians | Pass | Pass | 0.524 |
| Astros @ Rangers | Pass | Pass | 0.523 |
| Rockies @ Dodgers | Pass | Pass | 0.520 |
| Mariners @ Athletics | Pass | Pass | 0.515 |
| Diamondbacks @ Giants | Pass | Pass | 0.512 |
| Yankees @ Royals | Pass | Pass | 0.512 |
| Marlins @ Blue Jays | Pass | Pass | 0.512 |
| Twins @ White Sox | Pass | Pass | 0.510 |
| Phillies @ Padres | Pass | Pass | 0.507 |

## first5

- Best model: `forest`
- Walk-forward log loss: `0.6982`
- Walk-forward Brier: `0.2522`
- Walk-forward accuracy: `0.5258`
- OOF sample size: `1238`
- Fitness threshold: `0.57`
- Threshold record: `113-91` on `204` plays (`55.4%`)
- Promotable today: `no`

| Matchup | Action | Pick | Probability |
| --- | --- | --- | --- |
| Cubs @ Pirates | Pass | Pass | 0.533 |
| Phillies @ Padres | Pass | Pass | 0.523 |
| Diamondbacks @ Giants | Pass | Pass | 0.522 |
| Twins @ White Sox | Pass | Pass | 0.522 |
| Rockies @ Dodgers | Pass | Pass | 0.515 |
| Marlins @ Blue Jays | Pass | Pass | 0.514 |
| Nationals @ Guardians | Pass | Pass | 0.511 |
| Cardinals @ Brewers | Pass | Pass | 0.509 |
| Yankees @ Royals | Pass | Pass | 0.508 |
| Rays @ Orioles | Pass | Pass | 0.505 |
| Reds @ Mets | Pass | Pass | 0.503 |
| Mariners @ Athletics | Pass | Pass | 0.501 |

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
| Diamondbacks @ Giants | Play | NRFI | 0.301 |
