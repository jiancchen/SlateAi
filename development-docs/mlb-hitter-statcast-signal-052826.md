# MLB Hitter Statcast Trend Audit

This report checks whether rolling Statcast quality windows improve the batter-prop read over the old result-only hitter state table.

What was added:
- `mlb_hitter_statcast_game_logs` from Baseball Savant Statcast search (`group_by=name-date` + event-detail sweet-spot recovery)
- `mlb_hitter_statcast_trend_snapshots` with rolling `7/14/30` windows
- trend deltas for `xwOBA`, `barrel%`, `hard-hit%`, and `sweet-spot%`

- total backtest rows graded here: `869`

## singles

- Base hit rate: `36.6%` on `290` bets
- Statcast snapshot coverage: `99.3%`

|Feature|Low quartile hit rate|High quartile hit rate|Delta|
|---|---:|---:|---:|
|`rolling_7_xwoba`|39.2%|34.7%|-4.5 pts|
|`rolling_14_xwoba`|37.0%|31.5%|-5.5 pts|
|`rolling_30_xwoba`|34.2%|33.3%|-0.9 pts|
|`rolling_7_xba`|35.1%|35.6%|+0.5 pts|
|`rolling_14_xba`|38.7%|30.6%|-8.1 pts|
|`rolling_30_xba`|32.9%|37.3%|+4.5 pts|
|`rolling_7_xslg`|38.9%|35.1%|-3.8 pts|
|`rolling_14_xslg`|34.7%|33.3%|-1.4 pts|
|`rolling_30_xslg`|31.9%|33.3%|+1.4 pts|
|`xwoba_trend_7_minus_30`|41.7%|31.9%|-9.7 pts|
|`rolling_7_barrel_pct`|37.3%|41.3%|+4.0 pts|
|`rolling_30_barrel_pct`|31.1%|34.7%|+3.6 pts|
|`barrel_trend_7_minus_30`|41.9%|39.2%|-2.7 pts|
|`rolling_7_hard_hit_pct`|38.9%|40.3%|+1.4 pts|
|`rolling_30_hard_hit_pct`|37.0%|34.7%|-2.3 pts|
|`hard_hit_trend_7_minus_30`|33.8%|35.6%|+1.8 pts|
|`rolling_7_sweet_spot_pct`|37.5%|46.7%|+9.2 pts|
|`rolling_30_sweet_spot_pct`|37.8%|40.5%|+2.7 pts|
|`sweet_spot_trend_7_minus_30`|37.0%|38.9%|+1.9 pts|

Compound buckets:
- `high 7d xBA + sweet-spot`: 37 bets, 45.9% hit.

## Early read

- `singles`: the Statcast layer still is not a clean all-green win. `7d xwOBA` remains noisy-to-negative, but `7d sweet-spot%` and the compound `7d xBA + sweet-spot` bucket are materially better than the base singles hit rate.
- `totalBases`: this is still the clearest Statcast win. `7d xwOBA`, `7d xSLG`, `7d hard-hit%`, `7d barrel%`, and the `7d xSLG + barrel + hard-hit` bucket all improve the hit rate materially.
- `homeRuns`: still too noisy. `xBA` and `hard-hit%` show small lifts, but the HR sample still does not justify turning barrel/sweet-spot/xSLG into a primary trigger by themselves.

## Next step

- Keep the Statcast trend layer live for `totalBases`, cautiously let the `xBA + sweet-spot` filter influence `singles`, and keep `homeRuns` in filter-only mode until the sample matures.
## totalBases

- Base hit rate: `31.2%` on `433` bets
- Statcast snapshot coverage: `99.3%`

|Feature|Low quartile hit rate|High quartile hit rate|Delta|
|---|---:|---:|---:|
|`rolling_7_xwoba`|26.9%|37.2%|+10.3 pts|
|`rolling_14_xwoba`|34.3%|32.7%|-1.5 pts|
|`rolling_30_xwoba`|29.6%|33.9%|+4.3 pts|
|`rolling_7_xba`|26.9%|32.4%|+5.6 pts|
|`rolling_14_xba`|33.3%|27.4%|-5.9 pts|
|`rolling_30_xba`|33.3%|26.6%|-6.7 pts|
|`rolling_7_xslg`|28.7%|38.5%|+9.8 pts|
|`rolling_14_xslg`|26.9%|31.5%|+4.6 pts|
|`rolling_30_xslg`|27.5%|37.0%|+9.5 pts|
|`xwoba_trend_7_minus_30`|30.2%|35.2%|+5.0 pts|
|`rolling_7_barrel_pct`|31.2%|38.4%|+7.2 pts|
|`rolling_30_barrel_pct`|27.9%|38.9%|+11.0 pts|
|`barrel_trend_7_minus_30`|33.3%|33.0%|-0.3 pts|
|`rolling_7_hard_hit_pct`|30.2%|39.4%|+9.3 pts|
|`rolling_30_hard_hit_pct`|29.4%|34.5%|+5.2 pts|
|`hard_hit_trend_7_minus_30`|28.7%|34.3%|+5.6 pts|
|`rolling_7_sweet_spot_pct`|34.8%|29.1%|-5.7 pts|
|`rolling_30_sweet_spot_pct`|39.3%|28.7%|-10.6 pts|
|`sweet_spot_trend_7_minus_30`|29.1%|38.0%|+8.9 pts|

Compound buckets:
- `high 7d xSLG + barrel + hard-hit`: 46 bets, 47.8% hit.

## Early read

- `singles`: the Statcast layer still is not a clean all-green win. `7d xwOBA` remains noisy-to-negative, but `7d sweet-spot%` and the compound `7d xBA + sweet-spot` bucket are materially better than the base singles hit rate.
- `totalBases`: this is still the clearest Statcast win. `7d xwOBA`, `7d xSLG`, `7d hard-hit%`, `7d barrel%`, and the `7d xSLG + barrel + hard-hit` bucket all improve the hit rate materially.
- `homeRuns`: still too noisy. `xBA` and `hard-hit%` show small lifts, but the HR sample still does not justify turning barrel/sweet-spot/xSLG into a primary trigger by themselves.

## Next step

- Keep the Statcast trend layer live for `totalBases`, cautiously let the `xBA + sweet-spot` filter influence `singles`, and keep `homeRuns` in filter-only mode until the sample matures.
## homeRuns

- Base hit rate: `18.5%` on `146` bets
- Statcast snapshot coverage: `100.0%`

|Feature|Low quartile hit rate|High quartile hit rate|Delta|
|---|---:|---:|---:|
|`rolling_7_xwoba`|16.2%|16.2%|+0.0 pts|
|`rolling_14_xwoba`|27.0%|18.9%|-8.1 pts|
|`rolling_30_xwoba`|21.6%|13.5%|-8.1 pts|
|`rolling_7_xba`|16.2%|20.5%|+4.3 pts|
|`rolling_14_xba`|18.9%|21.1%|+2.1 pts|
|`rolling_30_xba`|16.2%|23.7%|+7.5 pts|
|`rolling_7_xslg`|21.6%|13.5%|-8.1 pts|
|`rolling_14_xslg`|37.8%|16.2%|-21.6 pts|
|`rolling_30_xslg`|21.6%|16.2%|-5.4 pts|
|`xwoba_trend_7_minus_30`|16.2%|17.5%|+1.3 pts|
|`rolling_7_barrel_pct`|17.9%|15.4%|-2.6 pts|
|`rolling_30_barrel_pct`|21.1%|13.5%|-7.5 pts|
|`barrel_trend_7_minus_30`|13.2%|13.2%|+0.0 pts|
|`rolling_7_hard_hit_pct`|10.0%|16.2%|+6.2 pts|
|`rolling_30_hard_hit_pct`|13.5%|13.2%|-0.4 pts|
|`hard_hit_trend_7_minus_30`|13.2%|16.2%|+3.1 pts|
|`rolling_7_sweet_spot_pct`|23.3%|16.2%|-7.0 pts|
|`rolling_30_sweet_spot_pct`|23.7%|16.2%|-7.5 pts|
|`sweet_spot_trend_7_minus_30`|15.8%|21.6%|+5.8 pts|

Compound buckets:
- `high 7d xSLG + barrel + hard-hit + sweet-spot + positive barrel trend`: 11 bets, 9.1% hit.

## Early read

- `singles`: the Statcast layer still is not a clean all-green win. `7d xwOBA` remains noisy-to-negative, but `7d sweet-spot%` and the compound `7d xBA + sweet-spot` bucket are materially better than the base singles hit rate.
- `totalBases`: this is still the clearest Statcast win. `7d xwOBA`, `7d xSLG`, `7d hard-hit%`, `7d barrel%`, and the `7d xSLG + barrel + hard-hit` bucket all improve the hit rate materially.
- `homeRuns`: still too noisy. `xBA` and `hard-hit%` show small lifts, but the HR sample still does not justify turning barrel/sweet-spot/xSLG into a primary trigger by themselves.

## Next step

- Keep the Statcast trend layer live for `totalBases`, cautiously let the `xBA + sweet-spot` filter influence `singles`, and keep `homeRuns` in filter-only mode until the sample matures.
