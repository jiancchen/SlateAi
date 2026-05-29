# Tennis Follow-Up: 2026-05-28 Roland Garros

## Result

May 28 desk board: 19-13, 59.4%.

Talked-through betting card performed worse than the full board because exposure concentrated on fragile plays:

| Pick | Result |
|---|---|
| Claire Liu | Loss |
| Frances Tiafoe | Win |
| Arthur Rinderknech | Loss |
| Ben Shelton | Loss |
| Jan-Lennard Struff | Loss |
| Susan Bandecchi | Loss |
| Adam Walton | Loss |
| Brandon Nakashima | Win |
| Felix Auger-Aliassime | Win |
| Matteo Arnaldi | Win |

The user-facing damage came from presenting too many volatile/value rows as actionable instead of separating them from bankroll-safe picks.

## What Failed

- Positive EV from large payout overwhelmed the risk gate.
- "Likely winner" was treated too generously when the price was bad or match-level service weakness was not clean.
- Bandecchi-style outliers were not held for manual review early enough.
- WTA volatility and opponent return pressure were underweighted.
- The model backtest claimed to use service/error/return bubbles before those metrics existed for settled days.

## Warehouse Fixes

- May 28 results imported and graded.
- May 27 Flashscore recent links backfilled into recent-form metric rows.
- May 29 slate imported with 16 singles, 30 player-context rows, 240 recent matches, and 1,200 recent-form metric rows.
- May 29 SofaScore matched 16/16 published tennis matches.

## Model Rule Changes

- No bet-grade label without a real market price.
- No top pick if the risk gate shows hold risk, error-control risk, closeout risk, or opponent return-pressure risk.
- Huge EV underdogs are `Outlier hold`, not picks, when market disagreement is extreme.
- Expensive favorites are not "safe" unless the model probability, service profile, and opponent weakness all confirm.
- May 29 should be pass-heavy until odds are captured and the model can beat the user's baseline.

## May 29 Clean Model-Confirmed Names Before Odds

These are not bet-grade without price. They are the only clean risk-gate names above 64% model probability:

| Time | Player | Model | Fair odds |
|---|---:|---:|---:|
| 3:30 AM | Rafael Jodar | 71.2% | -247 |
| 3:00 AM | Iga Swiatek | 68.9% | -221 |
| 11:15 AM | Alexander Zverev | 66.1% | -195 |
| 2:00 AM | Andrey Rublev | 65.6% | -191 |
| 5:30 AM | Karen Khachanov | 64.0% | -178 |

Everything else is pass, risk-gated, or needs market price.
