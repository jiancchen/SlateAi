# Roland Garros Tennis Backtest Through 2026-05-27

## Headline

- Graded singles: 71
- Desk side record: 50-21, 70.4%
- ATP: 26-9, 74.3%
- WTA: 24-12, 66.7%
- May 26: 27-13, 67.5%
- May 27: 23-8, 74.2%

## Confidence Buckets

| Bucket | Record | Hit Rate |
|---|---:|---:|
| Confidence 70+ | 14-4 | 77.8% |
| Confidence 64-69 | 9-3 | 75.0% |
| Confidence 60-63 | 10-3 | 76.9% |
| Confidence below 60 | 17-11 | 60.7% |

The model has been strongest when confidence is 60+ and the match is not high-volatility. The below-60 group should be treated as watch/live-only unless the price is very favorable and a concrete weakness path is visible.

## Volatility Buckets

| Bucket | Record | Hit Rate |
|---|---:|---:|
| Volatility 55 or lower | 19-6 | 76.0% |
| Volatility 56-64 | 14-2 | 87.5% |
| Volatility 65+ | 17-13 | 56.7% |

Volatility is the cleanest gate so far. The high-volatility group is not bet-grade pre-match.

## Price And Payoff

Assuming a 100c prediction-market payout structure, buying every priced desk pick through May 27 went 48-20 but only returned about +42c on 4,758c risk, or +0.9% ROI before fees.

| Price Bucket | Record | Approx Contract ROI |
|---|---:|---:|
| Price 82%+ | 15-3 | -8.4% |
| Price 70-81.9% | 16-4 | +6.1% |
| Price 58-69.9% | 8-7 | -15.6% |
| Price below 50% | 3-5 | +3.8% |

The model picks winners, but the very expensive favorite lane is not profitable enough. Sinner, Swiatek, Sabalenka, Djokovic-type sides can be correct and still not be playable on ML.

## Model Edge

| Edge Bucket | Record | Approx Contract ROI |
|---|---:|---:|
| Model edge 7+ pts over market | 5-6 | +11.9% |
| Model edge 3-6.9 pts | 2-1 | +8.1% |
| Market richer than model by 4+ pts | 34-11 | -5.0% |

The positive-edge bucket has positive payout math but poor hit rate. It included too many volatile underdogs and story-driven flips. This should become a filtered bucket, not an automatic bet bucket.

## Derivative Reads From May 27

- Explicit May 27 derivative reads were a tiny sample.
- ML actionable reads: roughly 1-1 if pass-price cards are excluded.
- Totals: 3-2 on explicit O/U leans.
- Spreads: weak; the Swiatek, Paolini, and Rybakina spread leans missed, while the Paul spread covered despite the card saying to fade it.

Totals look more promising than spreads, especially when tied to actual hold/break shape. Spread picks need a stricter first-set/service-comfort rule.

## Main Failure Modes

- Expensive favorite losses were catastrophic relative to payout: Pegula 98%, Medvedev 94%, Popyrin 89%.
- WTA favorites still need a larger volatility haircut: Rybakina, Paolini, Frech, Wang Xinyu.
- Positive market edge without low volatility was unreliable: Davidovich Fokina, Shapovalov, Waltert, Pridankina, Prado Angelo.
- The model was better at predicting ATP winners than finding profitable favorite entries.

## Model Confidence Going Forward

- Side-pick confidence is usable above 60, especially ATP and volatility below 65.
- Betting confidence requires three gates: model edge, price not too expensive, and a real weakness path from service/return data.
- ML favorites above 82% should generally be pass/spread/total candidates, not side bets.
- High-volatility WTA sides need live confirmation from early holds, double faults, first-serve points won, and break points faced.
