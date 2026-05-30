# Kalshi Tennis Intramatch Low-Dog Audit

## Coverage

```json
{
  "settledMarkets": 0,
  "events": 0,
  "dogRows": 0,
  "lowDogRowsAtOrBelow10c": 0,
  "lowDogRowsAtOrBelow12c": 0,
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
|entryAskAtOrBelow10c|20c|0|None|None|None|None|None|None|None|None|
|entryAskAtOrBelow10c|30c|0|None|None|None|None|None|None|None|None|
|entryAskAtOrBelow12c|20c|0|None|None|None|None|None|None|None|None|
|entryAskAtOrBelow12c|30c|0|None|None|None|None|None|None|None|None|

## Low-Dog Rows

|event|selection|entry|max bid|max trade|won|volume minutes|
|---|---|---:|---:|---:|---|---:|
