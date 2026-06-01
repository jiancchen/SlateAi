# May 31 Tennis Postmortem

## Slate Snapshot

- Desk winner grade: `5/8` = `62.5%`
- TEN-T0 settlement rows: `15/27` graded hits, ROI `-5.7%` across graded betting-matrix rows
- ML lane: `6/8` = `75.0%`, ROI `+15.5%`
- Spread lane: `5/8` = `62.5%`, ROI `+15.3%`
- Match O/U lane: `0/4` = `0.0%`, ROI `-100.0%`
- First-set O/U lane: `4/7` = `57.1%`, no odds captured on the graded rows
- Set-win lane: `0/8` graded because the rows stored probabilities but not posted prices/outcomes
- Kalshi trade-to-sell lane: `0/8` graded by settlement because price-path target grading is still separate

## Winner Model

The desk winner model finished `5/8`.

Misses:

| Match | Pick | Winner | Score |
| --- | --- | --- | --- |
| Casper Ruud vs Joao Fonseca | Casper Ruud | Joao Fonseca | 5-7 6-7(8-10) 7-5 2-6 |
| Jakub Mensik vs Andrey Rublev | Andrey Rublev | Jakub Mensik | 6-3 7-6(8-6) 4-6 2-6 6-3 |
| Marta Kostyuk vs Iga Swiatek | Iga Swiatek | Marta Kostyuk | 7-5 6-1 |

The important part is not just that these were misses. They were all cases where the opponent had enough form/pressure evidence to make the favorite or name-side fragile. The model still leaned too hard on favorite/name stability in the winner layer.

## Betting-Matrix Lanes

The ML lane went `6/8`, but it is not the same thing as the desk winner model. The ML lane selected Marta Kostyuk at `+220` and hit, while the desk winner grade still counted Swiatek as a miss. That split is useful, but it must be shown clearly in the UI and model history.

Best lane outcomes:

- Marta Kostyuk ML `+220` hit.
- Marta Kostyuk `+4.5` hit.
- Elina Svitolina ML and spread both hit.
- Rafael Jodar recovered from two sets down and still covered `-6.5`.
- Zverev covered `-7.5` even after a tight first set.

Bad lane outcomes:

- Match O/U went `0/4`. This lane should be downgraded immediately.
- Rublev ML/spread both missed because Mensik had enough five-set serve and pressure resilience.
- Ruud ML/spread/under all missed; Fonseca was not just a spike candidate, he had enough actual win path.
- First-set O/U was playable but not actionable without odds capture.

## Prediction-Market Trade Lane

May 31 produced no validated trade rows in the value book:

- `0` trade rows
- `1` watch row
- `7` pass rows

The only watch-grade row was Jesper de Jong around `8c -> 20c`, but same-favorite Zverev history was weak and the model did not clear it as a real trade.

This was a good non-action day for Kalshi. The issue is grading/reporting: the settlement artifact currently stores the eight Kalshi candidates as `pending_price_path`, while the intramatch audit writes the actual candle features separately. These need to be joined so future postmortems can grade target-hit, max bid, max trade, and early stabilization directly inside the model-run settlement.

## What Went Right

- The ML and spread betting lanes were better than the raw winner model.
- Kostyuk was correctly surfaced as value in the ML betting lane despite the desk winner miss.
- The pipeline finally had full settled health: results, SofaScore, Kalshi candles, weather, rankings, warehouse metrics, and training labels all passed.
- The training corpus refreshed through May 31 with `274` settled rows.

## What Went Wrong

- Winner confidence and ML value still diverge without enough UI explanation.
- Match O/U was not just noisy; it was actively bad at `0/4`.
- Set-win rows are still not truly gradeable because they store projections without posted set-win prices.
- Kalshi trade-to-sell settlement is incomplete until price-path rows are joined into `postmatch-grades.json`.
- The value backtest wrote `24` rows but reported `0` graded rows, while the model-run settlement graded the same slate. That means the standalone value backtest and the run settlement are not using the same grading contract.

## Bottom Line

May 31 was a useful T0 validation day, not a clean betting-engine proof.

The model was most useful when it separated market expression from winner prediction. ML/spread value worked, but winner confidence missed key upset paths and match totals were bad enough to freeze. The next tennis iteration should not be "more confidence"; it should be cleaner lane separation, price-path settlement, and a hard downgrade on O/U until that lane has a real backtest.
