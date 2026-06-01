# Kalshi Tennis Intramatch Low-Dog Audit

## Coverage

```json
{
  "settledMarkets": 16,
  "events": 8,
  "dogRows": 8,
  "lowDogRowsAtOrBelow10c": 1,
  "lowDogRowsAtOrBelow12c": 1,
  "warehouseTables": [
    "tennis_kalshi_match_markets",
    "tennis_kalshi_market_candles",
    "tennis_kalshi_intramatch_trade_features"
  ],
  "method": "Entry uses first available yes_ask in an 8-hour window before market close. Limit exit uses max yes_bid, which is more conservative than max traded price.",
  "feeAssumption": "Fee-adjusted rows conservatively use taker fees on both entry and limit exit. Resting limit sells may be cheaper depending on the live fee tier/market."
}
```

## Strategy Results

|entry filter|target|entries|limit hits|eventual winners|limit hit rate|winner rate|profit/contract|ROI on entry cost|fee-adjusted profit/contract|fee-adjusted ROI|
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
|entryAskAtOrBelow10c|20c|1|1|0|1.0|0.0|0.11|1.222|0.08|0.8|
|entryAskAtOrBelow10c|30c|1|0|0|0.0|0.0|-0.09|-1.0|-0.1|-1.0|
|entryAskAtOrBelow12c|20c|1|1|0|1.0|0.0|0.11|1.222|0.08|0.8|
|entryAskAtOrBelow12c|30c|1|0|0|0.0|0.0|-0.09|-1.0|-0.1|-1.0|

## Low-Dog Rows

|event|selection|entry|max bid|max trade|won|volume minutes|
|---|---|---:|---:|---:|---|---:|
|KXATPMATCH-26MAY31DEJZVE|Jesper De Jong|9.0c|22.0c|23.0c|False|366|
