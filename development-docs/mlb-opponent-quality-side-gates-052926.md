# MLB Opponent-Quality Side Gates — May 29, 2026

This pass combines the new opponent-quality table with the existing bounceback/slump buckets. Sample window: `2026-04-15` through `2026-05-29`.

- Schedule-toughness quartiles: `Q1 22.0` / `Q3 39.8`

## Cohort Results

| Cohort | Sample | FG win rate | F5 non-loss | Avg F5 run diff |
| --- | --- | --- | --- | --- |
| All teams | 1168 | 50.0% | 57.6% | +0.00 |
| Loss but not dead | 178 | 51.1% | 58.4% | +0.16 |
| Loss but not dead + hard schedule | 38 | 50.0% | 65.8% | +0.71 |
| Loss but not dead + soft schedule | 60 | 50.0% | 58.3% | +0.22 |
| Slumping loser | 146 | 42.5% | 58.9% | -0.15 |
| Slumping loser + hard schedule | 37 | 29.7% | 51.4% | -0.38 |
| Slumping loser + soft schedule | 31 | 64.5% | 77.4% | +0.84 |
| 2+ close losses vs winning opponents | 371 | 49.6% | 56.3% | -0.07 |
| 2+ games vs .550 opponents in last 10 | 820 | 49.8% | 56.7% | -0.03 |

## Read

- `Loss but not dead` is still the healthiest rebound bucket overall, and the hard-schedule version has the strongest first-five resistance shape.
- If a `loss but not dead` team got there against a **hard recent schedule**, that looks better as an F5 resistance / bounceback lane than the same label against a soft schedule.
- The truly ugly combination in this sample is `slumping loser + hard schedule`, not the soft-schedule version.
- `Slumping loser + soft schedule` unexpectedly rebounded well here, which means the recent-loser story can hide “they were worse than they looked” and “they were better than they looked” in opposite ways.
- `2+ close losses vs winning opponents` is still worth keeping as a research selector, but it is not an automatic booster by itself.

## Practical Use

- Use `loss but not dead + hard schedule` as a watchlist resistance or bounceback booster, not a blind ML trigger.
- Use `slumping loser + hard schedule` as the stronger `pass / fade / dead-early` warning.
- Treat `slumping loser + soft schedule` as a caution against over-fading a bad recent record without checking who those games came against.
- Keep `2+ close losses vs winning opponents` in side/F5 research, but only as a secondary support flag.

