# Kalshi Tennis Intramatch Low-Dog Audit

## Coverage

```json
{
  "settledMarkets": 270,
  "events": 135,
  "dogRows": 135,
  "lowDogRowsAtOrBelow10c": 19,
  "lowDogRowsAtOrBelow12c": 24,
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
|entryAskAtOrBelow10c|20c|19|7|3|0.368|0.158|0.24|0.207|-0.09|-0.067|
|entryAskAtOrBelow10c|30c|19|6|3|0.316|0.158|0.64|0.552|0.33|0.244|
|entryAskAtOrBelow12c|20c|24|11|4|0.458|0.167|0.46|0.264|0.0|0.0|
|entryAskAtOrBelow12c|30c|24|10|4|0.417|0.167|1.26|0.724|0.82|0.414|

## Low-Dog Rows

|event|selection|entry|max bid|max trade|won|volume minutes|
|---|---|---:|---:|---:|---|---:|
|KXATPMATCH-26MAY25SINTAB|Clement Tabur|2.0c|2.0c|3.0c|False|347|
|KXATPMATCH-26MAY28SINCER|Juan Manuel Cerundolo|2.0c|99.0c|99.0c|True|277|
|KXWTAMATCH-26MAY25ERJRYB|Veronika Erjavec|3.0c|5.0c|6.0c|False|73|
|KXWTAMATCH-26MAY25JONSWI|Emerson Jones|3.0c|3.0c|3.0c|False|96|
|KXWTAMATCH-26MAY27SABJAC|Elsa Jacquemot|3.0c|15.0c|16.0c|False|222|
|KXWTAMATCH-26MAY25EFRCIR|Ksenia Efremova|5.0c|25.0c|26.0c|False|172|
|KXWTAMATCH-26MAY27ANDBAS|Marina Bassols Ribera|5.0c|48.0c|50.0c|False|182|
|KXATPMATCH-26MAY27DUCJOD|James Duckworth|6.0c|33.0c|45.0c|False|331|
|KXWTAMATCH-26MAY25ANDFER|Fiona Ferro|6.0c|6.0c|7.0c|False|85|
|KXWTAMATCH-26MAY25KOVWAN|Danka Kovinic|6.0c|7.0c|9.0c|False|78|
|KXWTAMATCH-26MAY27BEJSWI|Sara Bejlek|6.0c|6.0c|7.0c|False|222|
|KXWTAMATCH-26MAY28GAUSHE|Maiar Sherif Ahmed Abdelaziz|6.0c|10.0c|11.0c|False|193|
|KXATPMATCH-26MAY25WALMED|Adam Walton|7.0c|99.0c|99.0c|True|317|
|KXATPMATCH-26MAY25DESAM|Toby Samuel|9.0c|11.0c|13.0c|False|240|
|KXATPMATCH-26MAY25FONPAV|Luka Pavlovic|9.0c|39.0c|41.0c|False|171|
|KXWTAMATCH-26MAY25KOSSEL|Oksana Selekhmeteva|9.0c|8.0c|11.0c|False|91|
|KXWTAMATCH-26MAY27SVIQUE|Kaitlin Quevedo|9.0c|10.0c|13.0c|False|112|
|KXATPMATCH-26MAY25COLVUK|Aleksandar Vukic|10.0c|10.0c|12.0c|False|169|
|KXWTAMATCH-26MAY27STARYB|Yuliia Starodubtseva|10.0c|99.0c|99.0c|True|184|
|KXATPMATCH-26MAY25SPITIA|Eliot Spizzirri|11.0c|32.0c|35.0c|False|239|
|KXWTAMATCH-26MAY27RAKMUC|Kamilla Rakhimova|11.0c|12.0c|13.0c|False|144|
|KXATPMATCH-26MAY25POPSVA|Zachary Svajda|12.0c|99.0c|99.0c|True|257|
|KXATPMATCH-26MAY25RUUSAF|Roman Safiullin|12.0c|97.0c|99.0c|False|275|
|KXATPMATCH-26MAY27CERGAS|Hugo Gaston|12.0c|35.0c|64.0c|False|207|
