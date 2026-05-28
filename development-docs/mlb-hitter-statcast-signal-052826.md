# MLB Hitter Statcast Trend Audit

This report checks whether rolling Statcast quality windows improve the batter-prop read over the old result-only hitter state table.

What was added:
- `mlb_hitter_statcast_game_logs` from Baseball Savant Statcast search (`group_by=name-date` + event-detail sweet-spot recovery)
- `mlb_hitter_statcast_trend_snapshots` with rolling `7/14/30` windows
- trend deltas for `xwOBA`, `barrel%`, `hard-hit%`, and `sweet-spot%`

- total backtest rows graded here: `830`

## singles

- Base hit rate: `36.7%` on `286` bets
- Statcast snapshot coverage: `99.3%`

|Feature|Low quartile hit rate|High quartile hit rate|Delta|
|---|---:|---:|---:|
|`rolling_7_xwoba`|39.7%|33.8%|-5.9 pts|
|`rolling_14_xwoba`|37.5%|30.6%|-6.9 pts|
|`rolling_30_xwoba`|35.2%|32.4%|-2.8 pts|
|`xwoba_trend_7_minus_30`|42.3%|32.4%|-9.9 pts|
|`rolling_7_barrel_pct`|37.8%|40.8%|+3.0 pts|
|`rolling_30_barrel_pct`|31.9%|35.2%|+3.3 pts|
|`barrel_trend_7_minus_30`|42.3%|39.7%|-2.5 pts|
|`rolling_7_hard_hit_pct`|39.4%|39.4%|+0.0 pts|
|`rolling_30_hard_hit_pct`|36.6%|35.2%|-1.4 pts|
|`hard_hit_trend_7_minus_30`|34.7%|36.1%|+1.4 pts|
|`rolling_7_sweet_spot_pct`|37.5%|47.9%|+10.4 pts|
|`rolling_30_sweet_spot_pct`|37.8%|40.8%|+3.0 pts|
|`sweet_spot_trend_7_minus_30`|35.2%|38.9%|+3.7 pts|

Compound buckets:
- `high 7d xwOBA + hard-hit + positive xwOBA trend`: 38 bets, 42.1% hit.

## totalBases

- Base hit rate: `32.2%` on `410` bets
- Statcast snapshot coverage: `99.3%`

|Feature|Low quartile hit rate|High quartile hit rate|Delta|
|---|---:|---:|---:|
|`rolling_7_xwoba`|26.5%|39.6%|+13.2 pts|
|`rolling_14_xwoba`|35.0%|34.3%|-0.7 pts|
|`rolling_30_xwoba`|28.8%|36.3%|+7.4 pts|
|`xwoba_trend_7_minus_30`|28.4%|37.3%|+8.8 pts|
|`rolling_7_barrel_pct`|32.1%|40.4%|+8.3 pts|
|`rolling_30_barrel_pct`|27.9%|37.3%|+9.4 pts|
|`barrel_trend_7_minus_30`|34.6%|34.0%|-0.6 pts|
|`rolling_7_hard_hit_pct`|30.8%|41.0%|+10.1 pts|
|`rolling_30_hard_hit_pct`|30.1%|34.6%|+4.5 pts|
|`hard_hit_trend_7_minus_30`|32.7%|35.9%|+3.2 pts|
|`rolling_7_sweet_spot_pct`|35.3%|30.8%|-4.5 pts|
|`rolling_30_sweet_spot_pct`|37.3%|30.1%|-7.2 pts|
|`sweet_spot_trend_7_minus_30`|30.2%|40.2%|+10.0 pts|

Compound buckets:
- `high 7d xwOBA + barrel + hard-hit`: 44 bets, 45.5% hit.

## homeRuns

- Base hit rate: `19.4%` on `134` bets
- Statcast snapshot coverage: `100.0%`

|Feature|Low quartile hit rate|High quartile hit rate|Delta|
|---|---:|---:|---:|
|`rolling_7_xwoba`|20.0%|17.6%|-2.4 pts|
|`rolling_14_xwoba`|26.5%|20.6%|-5.9 pts|
|`rolling_30_xwoba`|22.9%|14.7%|-8.2 pts|
|`xwoba_trend_7_minus_30`|17.6%|17.6%|+0.0 pts|
|`rolling_7_barrel_pct`|20.0%|14.7%|-5.3 pts|
|`rolling_30_barrel_pct`|28.6%|14.7%|-13.9 pts|
|`barrel_trend_7_minus_30`|13.9%|14.7%|+0.8 pts|
|`rolling_7_hard_hit_pct`|11.1%|17.6%|+6.5 pts|
|`rolling_30_hard_hit_pct`|14.7%|11.8%|-2.9 pts|
|`hard_hit_trend_7_minus_30`|14.3%|17.1%|+2.9 pts|
|`rolling_7_sweet_spot_pct`|27.0%|14.7%|-12.3 pts|
|`rolling_30_sweet_spot_pct`|26.5%|14.7%|-11.8 pts|
|`sweet_spot_trend_7_minus_30`|17.6%|20.6%|+2.9 pts|

Compound buckets:
- `high barrel + hard-hit + sweet-spot + positive barrel trend`: 12 bets, 16.7% hit.

## Early read

- `singles`: the Statcast layer is not a clean win yet. In this sample, `7d xwOBA` and short-term xwOBA trend are actually noisy-to-negative, while `7d sweet-spot%` is the clearest positive filter.
- `totalBases`: this is where the new layer really looks useful. `7d xwOBA`, `7d hard-hit%`, `7d barrel%`, and the `7d vs 30d xwOBA` trend all improve the hit rate materially.
- `homeRuns`: still too noisy. A little `7d hard-hit%` lift is there, but the small HR sample does not yet prove that `barrel%` or `sweet-spot%` are strong enough filters by themselves.

## Next step

- Promote the Statcast trend layer into the batter-prop exporter first for `totalBases` filters, cautiously for `singles`, and not yet as a primary `homeRuns` trigger.
