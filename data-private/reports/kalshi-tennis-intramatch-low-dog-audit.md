# Kalshi Tennis Intramatch Low-Dog Audit

## Coverage

```json
{
  "settledMarkets": 32,
  "events": 16,
  "dogRows": 16,
  "lowDogRowsAtOrBelow10c": 4,
  "lowDogRowsAtOrBelow12c": 4,
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
|entryAskAtOrBelow10c|20c|4|1|0|0.25|0.0|-0.13|-0.394|-0.19|-0.514|
|entryAskAtOrBelow10c|30c|4|0|0|0.0|0.0|-0.33|-1.0|-0.37|-1.0|
|entryAskAtOrBelow12c|20c|4|1|0|0.25|0.0|-0.13|-0.394|-0.19|-0.514|
|entryAskAtOrBelow12c|30c|4|0|0|0.0|0.0|-0.33|-1.0|-0.37|-1.0|

## Low-Dog Rows

|event|selection|entry|max bid|max trade|won|volume minutes|
|---|---|---:|---:|---:|---|---:|
|KXWTAMATCH-26MAY29LINSWI|Magda Linette|7.0c|15.0c|16.0c|False|239|
|KXATPMATCH-26MAY29HALZVE|Quentin Halys|8.0c|10.0c|11.0c|False|419|
|KXWTAMATCH-26MAY29SVIKOR|Tamara Korpatsch|8.0c|10.0c|11.0c|False|208|
|KXWTAMATCH-26MAY29KOSGOL|Viktorija Golubic|10.0c|20.0c|21.0c|False|219|
