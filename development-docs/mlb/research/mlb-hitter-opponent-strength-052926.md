# MLB Hitter Opponent-Strength Context — May 29, 2026

This isolated phase-2 pass tests whether **who a hitter faced** in the last 10 games helps more than plain raw box-score form. The table below uses only recent-opponent context that existed *before* each game: opponent recent win%, opponent recent run-diff, and weighted versions of the hitter's last-10 production.

## hits

- sample: `256` bets
- base hit rate: `19.1%`

| Feature | Q4 sample | Low bucket | High bucket | High - low |
| --- | --- | --- | --- | --- |
| Weighted hits/PA last 10 | 64 | 23.4% | 10.9% | -12.5 pts |
| Hits/PA vs winning opps | 71 | 14.7% | 16.9% | +2.2 pts |
| Weighted minus raw hits/PA | 71 | 12.9% | 21.1% | +8.3 pts |
| Avg opp win% last 5 | 71 | 16.9% | 18.3% | +1.4 pts |

- Best isolated opponent-strength signal in this pass: `+8.3` points.

## singles

- sample: `290` bets
- base hit rate: `36.6%`

| Feature | Q4 sample | Low bucket | High bucket | High - low |
| --- | --- | --- | --- | --- |
| Weighted hits/PA last 10 | 72 | 38.9% | 33.3% | -5.6 pts |
| Hits/PA vs winning opps | 69 | 33.3% | 34.8% | +1.4 pts |
| Weighted minus raw hits/PA | 79 | 30.7% | 36.7% | +6.0 pts |
| Avg opp win% last 5 | 73 | 41.7% | 34.2% | -7.4 pts |

- Best isolated opponent-strength signal in this pass: `+6.0` points.

## totalBases

- sample: `435` bets
- base hit rate: `31.0%`

| Feature | Q4 sample | Low bucket | High bucket | High - low |
| --- | --- | --- | --- | --- |
| Weighted TB/PA last 10 | 108 | 38.0% | 25.0% | -13.0 pts |
| TB/PA vs winning opps | 103 | 27.2% | 33.0% | +5.8 pts |
| Weighted minus raw TB/PA | 115 | 24.8% | 29.6% | +4.8 pts |
| Avg opp win% last 5 | 125 | 28.2% | 33.6% | +5.4 pts |

- Best isolated opponent-strength signal in this pass: `+5.8` points.

## Read

- This pass does **not** bundle Statcast or pitch-fit yet. It only asks whether opponent-strength weighting helps on its own.
- If the weighted version beats the raw version, it becomes a valid candidate for the next shadow bundle test.

