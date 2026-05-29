# Roland Garros 2026 Upset Audit

## Coverage

```json
{
  "warehouseResultRows": 222,
  "qualifyingFinalRows": 30,
  "round1Rows": 128,
  "round2Rows": 64,
  "marketPricedMatches": 99,
  "replayMatchesThroughRound2": 210,
  "note": "Market ROI uses only matches with captured prediction-market prices. Qualifying has outcomes but very thin price/replay coverage."
}
```

## Upsets By Round

|round|matches|rankKnown|rankUpsets|rankUpsetRate|avgWinnerGameMargin|decidingSetRate|
|---|---|---|---|---|---|---|
|Qualifying Final|30|27|8|0.296|5.6|0.333|
|Round 1|128|124|42|0.339|6.12|0.203|
|Round 2|64|64|20|0.312|5.37|0.339|

## Market Favorite Buckets

|bucket|matches|upsets|upsetRate|betFavoriteRoi|betUnderdogRoi|
|---|---|---|---|---|---|
|50-54% coinflip favorite|7|3|0.429|-0.105|-0.296|
|55-64% modest favorite|21|9|0.429|-0.154|-0.218|
|65-74% favorite|24|7|0.292|-0.051|-0.36|
|75-84% heavy favorite|23|5|0.217|-0.032|-0.462|
|85%+ extreme favorite|24|4|0.167|-0.09|0.282|

## Market ROI By Round

|round|matches|favoriteHitRate|favoriteRoi|underdogHitRate|underdogRoi|
|---|---|---|---|---|---|
|Round 1|39|0.718|-0.091|0.282|-0.512|
|Round 2|60|0.717|-0.076|0.283|0.014|

## Rank Gap Buckets By Round

|round|rankGap|matches|rankUpsets|rankUpsetRate|
|---|---|---|---|---|
|Qualifying Final|0-10|1|0|0.0|
|Qualifying Final|11-25|6|1|0.167|
|Qualifying Final|26-50|8|4|0.5|
|Qualifying Final|51-100|8|1|0.125|
|Qualifying Final|101-250|4|2|0.5|
|Round 1|0-10|7|4|0.571|
|Round 1|11-25|19|9|0.474|
|Round 1|26-50|30|11|0.367|
|Round 1|51-100|43|13|0.302|
|Round 1|101-250|21|4|0.19|
|Round 1|250+|4|1|0.25|
|Round 2|0-10|5|2|0.4|
|Round 2|11-25|7|1|0.143|
|Round 2|26-50|16|6|0.375|
|Round 2|51-100|27|8|0.296|
|Round 2|101-250|8|3|0.375|
|Round 2|250+|1|0|0.0|

## Replay Flow By Market Outcome

|marketFavoriteOutcome|matches|replayKnown|avgBreaksInMatch|avgLongGameRate|avgPointsPerGame|avgWinnerGameMargin|
|---|---|---|---|---|---|---|
|favorite won|71|69|7.99|0.147|5.52|6.23|
|favorite lost|28|28|8.14|0.141|5.5|3.82|

## Simple Betting Strategies

|strategy|bets|wins|hitRate|profitPer100Flat|roi|
|---|---|---|---|---|---|
|Bet every market favorite|99|71|0.717|-809.9|-0.082|
|Bet every market underdog|99|28|0.283|-1914.1|-0.193|
|Bet favorites only under 70%|40|24|0.6|-509.8|-0.127|
|Bet favorites only 55-70%|33|20|0.606|-436.1|-0.132|
|Fade favorites 75%+ / bet the dog|47|9|0.191|-386.0|-0.082|
|Bet dogs priced 25-49%|60|21|0.35|-1635.0|-0.273|
|Bet dogs priced 30-49%|47|18|0.383|-1219.0|-0.259|
|Pass 75%+ favorites; bet all other favorites|52|33|0.635|-520.7|-0.1|

## Biggest Captured Market Upsets

|date|round|match|favorite|favoriteProb|underdog|underdogProb|winner|scoreline|gameMargin|rankGap|
|---|---|---|---|---|---|---|---|---|---|---|
|2026-05-28|Round 2|Jannik Sinner vs Juan Manuel Cerundolo|Jannik Sinner|99.0|Juan Manuel Cerundolo|4.0|Juan Manuel Cerundolo|6-3 6-2 5-7 1-6 1-6|5.0|54.0|
|2026-05-26|Round 1|Kimberly Birrell vs Jessica Pegula|Jessica Pegula|98.0|Kimberly Birrell|3.0|Kimberly Birrell|1-6 6-3 6-3|1.0|78.0|
|2026-05-26|Round 1|Adam Walton vs Daniil Medvedev|Daniil Medvedev|94.0|Adam Walton|7.0|Adam Walton|6-2 1-6 6-1 1-6 6-4|1.0|89.0|
|2026-05-26|Round 1|Alexei Popyrin vs Zachary Svajda|Alexei Popyrin|89.0|Zachary Svajda|13.0|Zachary Svajda|6-3 3-6 6-7(3-7) 5-7|3.0|24.0|
|2026-05-26|Round 1|Alexander Bublik vs Jan-Lennard Struff|Alexander Bublik|78.0|Jan-Lennard Struff|24.0|Jan-Lennard Struff|5-7 7-6(8-6) 4-6 5-7|5.0|62.0|
|2026-05-27|Round 2|Jelena Ostapenko vs Magda Linette|Jelena Ostapenko|78.0|Magda Linette|23.0|Magda Linette|2-6 6-2 2-6|4.0|28.0|
|2026-05-26|Round 1|Marin Cilic vs Moise Kouame|Marin Cilic|77.0|Moise Kouame|26.0|Moise Kouame|6-7(4-7) 2-6 1-6|10.0|207.0|
|2026-05-28|Round 2|Adolfo Daniel Vallejo vs Moise Kouame|Adolfo Daniel Vallejo|76.7|Moise Kouame|27.8|Moise Kouame|3-6 5-7 6-3 6-2 6-7(8-10)|-1.0|185.0|
|2026-05-28|Round 2|Francisco Comesana vs Luciano Darderi|Luciano Darderi|75.9|Francisco Comesana|28.6|Francisco Comesana|7-6(7-5) 4-6 6-4 2-6 6-4|-1.0|75.0|
|2026-05-28|Round 2|Ann Li vs Diane Parry|Ann Li|73.3|Diane Parry|31.3|Diane Parry|3-6 4-6|5.0|54.0|
|2026-05-26|Round 1|Linda Noskova vs Maria Sakkari|Linda Noskova|72.0|Maria Sakkari|30.0|Maria Sakkari|5-7 6-7(3-7)|3.0|37.0|
|2026-05-26|Round 1|Anhelina Kalinina vs Diane Parry|Anhelina Kalinina|71.0|Diane Parry|30.0|Diane Parry|6-0 2-6 4-6|0.0|32.0|
|2026-05-28|Round 2|Maja Chwalinska vs Elise Mertens|Elise Mertens|67.7|Maja Chwalinska|36.8|Maja Chwalinska|6-4 6-0|8.0|79.0|
|2026-05-28|Round 2|Raphael Collignon vs Ben Shelton|Ben Shelton|67.7|Raphael Collignon|36.8|Raphael Collignon|6-4 7-5 6-4|6.0|47.0|
|2026-05-27|Round 2|Hailey Baptiste vs Wang Xiyu|Hailey Baptiste|67.0|Wang Xiyu|33.0|Wang Xiyu|4-5|1.0|120.0|

## Read

No strategy is guaranteed. In this sample, the profitable pattern was not blind favorite betting; it was avoiding taxed favorites and respecting underdog prices when the favorite was vulnerable. The replay layer is the next source of robustness because it separates stable favorites from favorites that leak service games, fail closeouts, or collapse after momentum turns.
