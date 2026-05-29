# MLB Classic Last-10 Hitter Windows — May 29, 2026

This is the first isolated phase-2 check for the friend-feedback idea to track a longer recent window instead of leaning only on `last 5` box-score form. The goal here is narrow: measure whether a `last 10` classic hitter window separates results better than the current `last 5` metrics before we bundle it with Statcast or matchup inputs.

## hits

- sample: `256` bets
- base hit rate: `19.1%`

| Feature | Q4 sample | Low bucket | High bucket | High - low |
| --- | --- | --- | --- | --- |
| Last 5 hits/PA | 70 | 13.2% | 18.6% | +5.3 pts |
| Last 10 hits/PA | 65 | 25.8% | 12.3% | -13.4 pts |
| Last 5 multi-hit games | 147 | 18.7% | 19.7% | +1.0 pts |
| Last 10 multi-hit games | 76 | 20.2% | 15.8% | -4.4 pts |
| Last 5 minus last 10 hits/PA | 65 | 13.8% | 23.1% | +9.2 pts |

- `Last 5 hits/PA` still separated slightly better than `Last 10 hits/PA` (`+5.3` vs `-13.4` points).
- `Last 5 multi-hit games` still carried the stronger signal (`+1.0` vs `-4.4` points).

## singles

- sample: `290` bets
- base hit rate: `36.6%`

| Feature | Q4 sample | Low bucket | High bucket | High - low |
| --- | --- | --- | --- | --- |
| Last 5 hits/PA | 75 | 32.5% | 32.0% | -0.5 pts |
| Last 10 hits/PA | 73 | 39.7% | 35.6% | -4.1 pts |
| Last 5 whiff rate | 72 | 28.4% | 38.9% | +10.5 pts |
| Last 10 whiff rate | 72 | 30.6% | 41.7% | +11.1 pts |
| Last 5 minus last 10 hits/PA | 74 | 33.3% | 23.0% | -10.4 pts |

- `Last 10 hits/PA` vs `Last 5 hits/PA`: `-4.1` vs `-0.5` points.
- `Whiff rate` remained a useful filter, and the longer sample was `+11.1` points vs `+10.5` on the short sample.

## totalBases

- sample: `434` bets
- base hit rate: `31.1%`

| Feature | Q4 sample | Low bucket | High bucket | High - low |
| --- | --- | --- | --- | --- |
| Last 5 TB/PA | 110 | 30.9% | 27.3% | -3.6 pts |
| Last 10 TB/PA | 112 | 40.7% | 25.0% | -15.7 pts |
| Last 5 multi-TB games | 110 | 30.6% | 37.3% | +6.6 pts |
| Last 10 multi-TB games | 130 | 28.4% | 30.8% | +2.4 pts |
| Last 5 minus last 10 TB/PA | 108 | 25.0% | 26.9% | +1.9 pts |

- `Last 5 TB/PA` was still slightly sharper than `Last 10 TB/PA` (`-3.6` vs `-15.7` points).
- `Multi-TB games` improved with the longer window at `+2.4` points vs `+6.6`.

## Read

- This pass is intentionally **classic-stats only**. No xBA/xwOBA/pitch-fit input is mixed in yet.
- If the longer window helps, it becomes a candidate feature or gate. If it does not, we keep it as UI/context only and do not disturb the live scorer.

