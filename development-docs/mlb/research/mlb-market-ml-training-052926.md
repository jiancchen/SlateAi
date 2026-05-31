# MLB Market ML Training — May 28, 2026

This pass replaces the old `50% is acceptable` mindset with walk-forward machine learning, calibration-oriented scoring, and hard abstention thresholds.

## moneyline

Candidate scoreboard:

| Model | Log loss | Brier | Accuracy | Sample |
| --- | --- | --- | --- | --- |
| forest | 0.6973 | 0.2520 | 0.5250 | 1560 |
| catboost | 0.7066 | 0.2560 | 0.5064 | 1560 |
| xgboost | 0.7399 | 0.2692 | 0.5128 | 1560 |
| lightgbm | 0.7616 | 0.2770 | 0.5224 | 1560 |
| hist_gb | 0.7902 | 0.2833 | 0.5135 | 1560 |

- Best model: `forest`
- Walk-forward log loss: `0.6973`
- Walk-forward Brier: `0.2520`
- Walk-forward accuracy: `0.5250`
- OOF sample size: `1560`
- Fitness threshold: `0.56`
- Threshold record: `131-124` on `255` plays (`51.4%`)
- Promotable today: `no`

| Matchup | Action | Pick | Probability |
| --- | --- | --- | --- |
| Cubs @ Pirates | Pass | Pass | 0.541 |
| Twins @ White Sox | Pass | Pass | 0.528 |
| Astros @ Rangers | Pass | Pass | 0.523 |
| Braves @ Red Sox | Pass | Pass | 0.511 |
| Blue Jays @ Orioles | Pass | Pass | 0.510 |
| Angels @ Tigers | Pass | Pass | 0.508 |

## first5

Candidate scoreboard:

| Model | Log loss | Brier | Accuracy | Sample |
| --- | --- | --- | --- | --- |
| forest | 0.7020 | 0.2541 | 0.4856 | 1318 |
| catboost | 0.7161 | 0.2603 | 0.5030 | 1318 |
| xgboost | 0.7464 | 0.2716 | 0.5076 | 1318 |
| lightgbm | 0.7629 | 0.2790 | 0.5023 | 1318 |
| hist_gb | 0.7953 | 0.2831 | 0.5129 | 1318 |

- Best model: `forest`
- Walk-forward log loss: `0.7020`
- Walk-forward Brier: `0.2541`
- Walk-forward accuracy: `0.4856`
- OOF sample size: `1318`
- Fitness threshold: `0.57`
- Threshold record: `110-101` on `211` plays (`52.1%`)
- Promotable today: `no`

| Matchup | Action | Pick | Probability |
| --- | --- | --- | --- |
| Angels @ Tigers | Pass | Pass | 0.531 |
| Blue Jays @ Orioles | Pass | Pass | 0.519 |
| Twins @ White Sox | Pass | Pass | 0.519 |
| Cubs @ Pirates | Pass | Pass | 0.518 |
| Braves @ Red Sox | Pass | Pass | 0.514 |
| Astros @ Rangers | Pass | Pass | 0.489 |

## totals

Candidate scoreboard:

| Model | Log loss | Brier | Accuracy | Sample |
| --- | --- | --- | --- | --- |
| forest | 0.7052 | 0.2551 | 0.5072 | 138 |
| catboost | 0.7381 | 0.2688 | 0.4928 | 138 |
| lightgbm | 0.7687 | 0.2822 | 0.4855 | 138 |
| xgboost | 0.7887 | 0.2866 | 0.4928 | 138 |
| hist_gb | 0.9831 | 0.3247 | 0.5435 | 138 |

- Best model: `forest`
- Walk-forward log loss: `0.7052`
- Walk-forward Brier: `0.2551`
- Walk-forward accuracy: `0.5072`
- OOF sample size: `138`
- Fitness threshold: `0.66`
- Threshold record: `20-12` on `32` plays (`62.5%`)
- Promotable today: `yes`

| Matchup | Action | Pick | Probability |
| --- | --- | --- | --- |
| Astros @ Rangers | Pass | Pass | 0.507 |

## firstInning

Candidate scoreboard:

| Model | Log loss | Brier | Accuracy | Sample |
| --- | --- | --- | --- | --- |
| forest | 0.7165 | 0.2603 | 0.5205 | 171 |
| lightgbm | 0.7332 | 0.2674 | 0.5205 | 171 |
| catboost | 0.7628 | 0.2816 | 0.5029 | 171 |
| xgboost | 0.7818 | 0.2842 | 0.5088 | 171 |
| hist_gb | 0.9118 | 0.3076 | 0.5322 | 171 |

- Best model: `forest`
- Walk-forward log loss: `0.7165`
- Walk-forward Brier: `0.2603`
- Walk-forward accuracy: `0.5205`
- OOF sample size: `171`
- Fitness threshold: `0.62`
- Threshold record: `25-20` on `45` plays (`55.6%`)
- Promotable today: `no`

| Matchup | Action | Pick | Probability |
| --- | --- | --- | --- |
| Cubs @ Pirates | Play | YRFI | 0.667 |
| Blue Jays @ Orioles | Pass | Pass | 0.595 |
| Angels @ Tigers | Pass | Pass | 0.567 |
| Astros @ Rangers | Pass | Pass | 0.531 |
| Braves @ Red Sox | Pass | Pass | 0.519 |
| Twins @ White Sox | Pass | Pass | 0.446 |
