# MLB Shadow Bundle Sweeps — May 29, 2026

This pass broadens the earlier tiny-sample bundle tests. Instead of one hard Q4-only gate, it sweeps looser threshold combinations to find whether there is a usable shadow path with a healthier sample.

- hits baseline: `19.1%` on `256` bets
- TB baseline: `31.0%` on `435` bets

## Hits shadow sweep

| Gate | Sample | Hit rate |
| --- | --- | --- |
| xBA >= median; sweet >= median; fit >= +2; delta >= Q75 | 8 | 12.5% |
| xBA >= Q60; sweet >= median; fit >= +2; delta >= Q75 | 8 | 12.5% |
| xBA >= median; sweet >= median; fit >= +4; delta > 0 | 9 | 11.1% |
| xBA >= Q60; sweet >= median; fit >= +4; delta > 0 | 9 | 11.1% |
| xBA >= Q75; sweet >= median; fit >= +2; delta > 0 | 9 | 11.1% |
| xBA >= Q60; sweet >= median; fit >= +2; delta > 0 | 14 | 7.1% |
| xBA >= median; sweet >= median; fit >= +2; delta > 0 | 16 | 6.2% |

## TB shadow sweep

| Gate | Sample | Hit rate |
| --- | --- | --- |
| xSLG >= Q60; hard-hit >= Q75; delta > 0 | 35 | 48.6% |
| xSLG >= Q75; hard-hit >= Q75; delta > 0 | 25 | 48.0% |
| xSLG >= median; hard-hit >= Q75; delta > 0 | 44 | 45.5% |
| xSLG >= Q60; hard-hit >= Q75; delta >= Q60 | 26 | 42.3% |
| xSLG >= median; hard-hit >= Q75; delta >= Q75 | 19 | 42.1% |
| xSLG >= Q60; hard-hit >= Q60; delta > 0 | 56 | 41.1% |
| xSLG >= Q75; hard-hit >= Q60; delta > 0 | 40 | 40.0% |
| xSLG >= median; hard-hit >= Q75; delta >= Q60 | 35 | 40.0% |

## Read

- These are still **shadow-only** sweeps. The goal is to find candidates worth a larger backtest, not to force a live deployment.
- A candidate only counts as useful if it improves rate **and** keeps enough sample to matter.

