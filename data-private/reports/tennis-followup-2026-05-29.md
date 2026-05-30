# Tennis Follow-Up: 2026-05-29 Roland Garros

## Result

- Desk side picks: 10-6, 62.5%.
- Settled training rows through May 29: 250.
- Warehouse ensemble backtest through May 29: 146-104, 58.4% hit rate, 0.644 AUC.
- Data-only model: 54.4% hit rate, 0.607 AUC.
- Desk baseline remains higher at 66.4%, but the baseline is too favorite-heavy to trust as a betting engine without price buckets.

## Misses

- Alex de Minaur over Jakub Mensik.
- Novak Djokovic over Joao Fonseca.
- Karen Khachanov over Jesper de Jong.
- Thiago Agustin Tirante over Pablo Carreno Busta.
- Karolina Muchova over Jil Teichmann.
- Yuliia Starodubtseva over Wang Xiyu.

The failure shape was not random: the model still underweighted live tournament pressure, favorite fragility after early scoreboard stress, and the value of underdogs who could hold long enough to force repricing.

## Prediction Market Trade Audit

- Jil Teichmann: 13c entry, max bid 99c, won outright.
- Marie Bouzkova: 15c entry, max bid 31c, hit 30c exit, lost outright.
- Alex Michelsen: 19c entry, max bid 66c, hit 30c exit, lost outright.
- Viktorija Golubic: 10c entry, max bid 20c, hit 20c only, lost outright.
- Quentin Halys: 8c entry, max bid 10c, failed.
- Tamara Korpatsch: 8c entry, max bid 10c, failed.

This confirms the trade-to-sell lane can work even when the underdog loses, but only when the player can stabilize early. Blind low-price underdogs are not enough.

## Fixes Applied

- Hard-gated prediction-market promotion when no same-favorite or similar-entry Kalshi history exists.
- Added FanDuel May 30 moneylines and joined them to all 16 main-draw singles.
- Excluded ESPN qualifying rows from the Roland Garros main-draw board.
- Fixed `generate-tennis-clay-context` so `--date YYYY-MM-DD` writes the requested date instead of defaulting to May 25.
- Warehoused May 29 results, SofaScore replay/stat rows, Kalshi candles, Kalshi intramatch trade features, and May 30 slate context.

## Remaining Problems

- Tennis value backtest still reports zero graded rows for May 29 value markets. Side grading works, but value-row result matching needs to be fixed before spread/O-U ROI can be trusted.
- Three May 30 Tennistonic pages timed out: Felix Auger-Aliassime vs Brandon Nakashima, Coco Gauff vs Anastasia Potapova, Anna Kalinskaya vs Camila Osorio.
- May 30 FanDuel scrape currently includes moneyline only. Spread and total detail pages still need a second scrape pass.

## Next Slate Rule

Promote three different things separately:

- Winner leans: only when the model, recent RG form, and weakness profile agree.
- Sportsbook bets: only when fee-adjusted EV survives price, odds range, and model-risk gates.
- Prediction-market trades: only when historical repricing behavior supports a realistic sell target.

Do not blend these into one "top pick" list.
