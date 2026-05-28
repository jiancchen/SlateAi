# MLB Hitter Rolling Signal Audit

This report checks whether the day-by-day hitter state snapshot table is helping on batter overs right now.

Scope:
- batter prop backtests: `696` (`singles`, `totalBases`)
- snapshot table: `mlb_hitter_state_snapshots`
- current sample window: `2026-05-16` through `2026-05-28` batter props, with snapshot coverage above 99%

## singles

- Base hit rate: `36.7%` on `286` bets

|Feature|Low quartile hit rate|High quartile hit rate|Delta|
|---|---:|---:|---:|
|`hitless_streak_games`|36.5%|36.6%|+0.1 pts|
|`whiff_rate_last5`|39.4%|28.8%|-10.7 pts|
|`cold_streak_index`|36.1%|36.6%|+0.5 pts|
|`heat_regression_index`|39.4%|33.3%|-6.1 pts|
|`total_bases_per_pa_last5`|36.0%|35.1%|-0.9 pts|
|`hits_per_pa_last5`|32.5%|31.5%|-1.0 pts|
|`multi_tb_games_last5`|34.5%|38.7%|+4.2 pts|
|`multi_hit_games_last5`|36.7%|36.6%|-0.1 pts|
|`pressure_plate_index`|38.0%|36.9%|-1.1 pts|
|`confidence`|33.7%|33.8%|+0.1 pts|

Compound buckets:
- `high whiff + high cold` bucket: 21 bets, 28.6% hit.
- `multi-TB form without high whiff`: 108 bets, 41.7% hit.
- `high pressure` bucket: 84 bets, 36.9% hit.

## totalBases

- Base hit rate: `32.2%` on `410` bets

|Feature|Low quartile hit rate|High quartile hit rate|Delta|
|---|---:|---:|---:|
|`hitless_streak_games`|34.0%|32.2%|-1.8 pts|
|`whiff_rate_last5`|34.3%|30.4%|-3.9 pts|
|`cold_streak_index`|40.2%|27.5%|-12.7 pts|
|`heat_regression_index`|31.4%|32.4%|+1.0 pts|
|`total_bases_per_pa_last5`|31.4%|29.1%|-2.2 pts|
|`hits_per_pa_last5`|31.9%|33.0%|+1.2 pts|
|`multi_tb_games_last5`|31.1%|39.0%|+7.9 pts|
|`multi_hit_games_last5`|30.1%|34.0%|+3.9 pts|
|`pressure_plate_index`|39.2%|26.4%|-12.8 pts|
|`confidence`|24.1%|35.0%|+10.9 pts|

Compound buckets:
- `high whiff + high cold` bucket: 32 bets, 37.5% hit.
- `multi-TB form without high whiff`: 90 bets, 41.1% hit.
- `high pressure` bucket: 129 bets, 26.4% hit.

## What the current rolling table is good for

- `whiff_rate_last5` is already useful as a risk filter. High recent whiff clearly drags down `singles` and still hurts `totalBases`.
- `cold_streak_index` is especially useful for `totalBases`; the coldest quartile of our current TB overs is materially worse than the cleanest quartile.
- `multi_tb_games_last5` helps more than plain `total_bases_per_pa_last5`. Ceiling events seem more informative than the simple rolling rate.

## What the current table is missing

- It is still result-based. It knows who got hits and bases lately, but not whether the contact quality was earned or lucky.
- That is why a rolling Statcast layer matters:
  - `xwOBA` trend
  - `xBA` / `xSLG` trend
  - `barrel%` trend
  - `hard-hit%` trend
  - `sweet-spot%` trend

## Recommendation

- Keep the current hitter-state snapshot as a **filter layer**.
- Add a new daily hitter Statcast snapshot table so we can build:
  - `rolling_7_xwoba`
  - `rolling_14_xwoba`
  - `rolling_30_xwoba`
  - trend slope vs prior windows
  - `results up / contact down` fade flags
  - `results down / contact up` buy-low flags

That should help separate the two cases you called out:
- hitters getting unlucky but striking the ball well
- hitters lucking into results while the contact quality is already sliding
