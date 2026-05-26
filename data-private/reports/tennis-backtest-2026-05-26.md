# Tennis Backtest - 2026-05-26 Roland Garros Singles

## Result

- Desk record: `27-13` on `40` graded singles.
- Hit rate: `67.5%`.
- ATP: `14-6`.
- WTA: `13-7`.
- Results source: ESPN tennis scoreboard snapshot stored at `data-private/reference/tennis/espn-scoreboard-2026-05-26.json`.

## What Went Wrong

The miss shape was not random. The desk still treated several expensive favorites as prediction wins instead of trade problems.

| Pick | Winner | Market | Band | Confidence |
|---|---:|---:|---|---:|
| Jessica Pegula | Kimberly Birrell | 98% | tiny-upside favorite | 74 |
| Daniil Medvedev | Adam Walton | 94% | tiny-upside favorite | 75 |
| Alexei Popyrin | Zachary Svajda | 89% | tiny-upside favorite | 67 |
| Alexander Bublik | Jan-Lennard Struff | 78% | fee-sensitive favorite | 64 |
| Marin Cilic | Moise Kouame | 77% | fee-sensitive favorite | 61 |
| Linda Noskova | Maria Sakkari | 72% | fee-sensitive favorite | 60 |
| Anhelina Kalinina | Diane Parry | 71% | fee-sensitive favorite | 56 |

The economics layer would have prevented chasing most of these. The `tiny-upside favorite` bucket went only `5-3`, and those contracts had the worst downside-to-payout ratio.

The second miss shape was low-confidence dog storytelling:

| Pick | Winner | Market | Confidence | Volatility |
|---|---|---:|---:|---:|
| Juan Carlos Prado Angelo | Martin Landaluce | 25% | 54 | 74 |
| Simona Waltert | Katerina Siniakova | 33% | 55 | 70 |
| Elena Pridankina | Oleksandra Oliynykova | 35% | 56 | 73 |
| Denis Shapovalov | Jaime Faria | 40% | 58 | 74 |

Those are watch lanes, not official pick lanes, unless recent clay opponent quality gives a much stronger reason.

## What Worked

- The board still beat random on a broad slate, even after late prediction flips.
- ATP structure held better than WTA again: `70.0%` vs `65.0%`.
- Moderate favorites went `8-2`, which is the healthiest price band from the day.
- Fee-sensitive favorites went `11-4`, but the misses were too expensive to ignore.

## Rule Changes For May 27

- Anything above `70%` market price needs a separate `priceAction`; "likely winner" is not enough.
- WTA picks below `60` confidence should default to watch-grade unless there is a clear technical edge.
- Low-priced dogs need opponent-quality or service/return evidence before becoming official desk picks.
- Round 2 favorites should be graded against payout, not only win probability.
