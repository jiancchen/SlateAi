# Tennis Research

Offline tennis research and active-but-not-yet-cartridge-owned model scripts live here until a specific model cartridge owns them.

## Files

- `multimodel_backtest.py`: Current tennis ensemble/backtest and training-row refresh.
- `baseline_pass.mjs`: One-slate baseline evaluator for published pick vs market favorite, rank favorite, form favorite, serve/return favorite, and simple proof gates.
- `selector_overlay.mjs`: TEN-T1 selector overlay that keeps TEN-T0 as the raw slate generator, then promotes only rows with enough independent rank/form/serve-return support into prediction candidates.
- `value_backtest.py`: Sportsbook value-lane backtest.
- `analyze_kalshi_intramatch.py`: Kalshi in-match candle/backtest audit.
- `project_kalshi_trade_candidates.py`: Open Kalshi orderbook mirror and trade-candidate projection.
- `model_kalshi_spike.py`: Prediction-market spike model.
- `model_upset_wins.py`: Underdog/upset win model.
- `analyze_rg_upsets.py`: Roland Garros upset audit.

Legacy wrappers remain at the old top-level `pipeline/` paths while references migrate.

## TEN-T1 Selector Overlay

Run after a normal TEN-T0 day module exists:

```bash
npm run data:selector:tennis -- --date YYYY-MM-DD
```

Outputs:

- `data-private/reports/tennis-selector-overlay-YYYY-MM-DD.json`
- `data-private/reports/tennis-selector-overlay-YYYY-MM-DD.md`
- `data-private/predictions/tennis/YYYY-MM-DD-tennis-t1-selector.json`

The selector is intentionally narrower than TEN-T0. It treats TEN-T0 as the market/context slate, then:

- promotes pregame ML prediction candidates when the TEN-T0 side has at least two independent non-market supports from live rank, adjusted form, and TennisLive serve/return profile;
- keeps one-signal or market-only rows on the watch/no-play board;
- sends opposing two-signal consensus into fade or live-dog lanes instead of automatic upset picks;
- flags mid-heavy chalk, expensive chalk, thin serve samples, second-serve weakness, double-fault pressure, and WTA grass volatility.
