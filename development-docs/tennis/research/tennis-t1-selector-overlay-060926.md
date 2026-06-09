# Tennis TEN-T1 Selector Overlay - 2026-06-09

## Why

The June 8 review showed that TEN-T0 was mostly a market-following slate annotator. It still produced useful data joins, but the raw pick column was too broad. The reusable path is to keep TEN-T0 as the slate/context generator and add a narrower selector overlay that decides which rows are actually usable.

## Selector Rule

The first TEN-T1 overlay promotes a pregame prediction only when the TEN-T0 side has at least two independent non-market supports:

- live rank favorite;
- adjusted-form favorite;
- TennisLive serve/return profile favorite.

Rows without enough support are not forced into ML picks:

- opposing two-signal consensus becomes a live-dog or favorite-fade lane;
- one-signal rows stay watch;
- market-only or unjoined rows become no-play;
- chalk bands, thin serve samples, second-serve weakness, double-fault pressure, and WTA grass volatility are preserved as risk flags.

## June 8 Sanity Check

Command:

```bash
npm run data:selector:tennis -- --date 2026-06-08
```

Result:

- Source rows: 81
- Prediction candidates: 20
- Settled prediction candidates: 18
- Hits: 13
- Misses: 5
- Hit rate: 72.2%
- Flat ROI: +5.7%
- Live-dog rows: 11
- No-play rows: 46

This is not enough history to claim the selector is sharp. It is enough to move from "predict everything" to a smaller board that uses the rank/form/serve work as gates and separates watch/fade/live lanes.

## Daily Output

- `data-private/reports/tennis-selector-overlay-YYYY-MM-DD.json`
- `data-private/reports/tennis-selector-overlay-YYYY-MM-DD.md`
- `data-private/predictions/tennis/YYYY-MM-DD-tennis-t1-selector.json`

The `YYYY-MM-DD-tennis-t1-selector.json` artifact is the machine-readable board for future site integration.
