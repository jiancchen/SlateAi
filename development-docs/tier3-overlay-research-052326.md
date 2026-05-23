# MLB Tier 3 Overlay Research — May 23, 2026

## Goal
Keep Tier 3 offline and test whether compact pitcher lookup tables improve the model’s ability to flag dangerous full-game side edges.

This pass focuses on:

1. `reliever first-batter command risk`
2. `starter third-time-through penalty`

The model question is simple: do these features isolate the same kinds of fake control spots we keep seeing when a big edge breaks late?

## Dataset Windows

| Window | Games | Hit rate | Reliever coverage | 3rd-trip coverage |
| --- | --- | --- | --- | --- |
| Reserve (`05-10` to `05-15`) | 75 | 0.653 | 4 | 11 |
| Bridge (`05-16` to `05-18`) | 44 | 0.545 | 22 | 38 |
| Expanded reserve (`05-10` to `05-18`) | 119 | 0.613 | 26 | 49 |
| Live current (`05-19` to `05-22`) | 49 | 0.612 | 41 | 40 |
| Original current (`05-16` to `05-22`) | 93 | 0.581 | 63 | 78 |
| Combined | 168 | 0.613 | 67 | 89 |

Note: the raw MLB warehouse already reaches back to `2026-03-26`. The practical limit here was prediction coverage, not game backfill, so the widened reserve lane uses:
- original reserve: `2026-05-10` through `2026-05-15`
- bridge reserve: `2026-05-16` through `2026-05-18`
- live current: `2026-05-19` through `2026-05-22`

## Lookup Table Shape
- `mlb_reliever_first_batter_command_profiles`
  - one row per pitcher / team / day
  - based on the last `8` relief entries before that date
- `mlb_starter_third_time_penalty_profiles`
  - one row per starter / day
  - based on the last `5` starts before that date

## Bucket Read

### Pick Reliever Command Risk
| Pick reliever command risk | Games | Hit rate |
| --- | --- | --- |
| `<35` | 44 | 0.568 |
| `35-44` | 13 | 0.385 |
| `45-54` | 7 | 0.571 |
| `55+` | 3 | 0.333 |

### Pick Starter Third-Time Penalty
| Pick 3rd-time penalty | Games | Hit rate |
| --- | --- | --- |
| `<30` | 47 | 0.553 |
| `30-39` | 13 | 0.769 |
| `40-49` | 4 | 0.5 |
| `50+` | 25 | 0.64 |

### Starter-Backed Risk Subsets
| Starter-backed high edge | Games | Hit rate |
| --- | --- | --- |
| `starter>=75 && edge>=10 && 3rd-time >=40` | 8 | 0.75 |
| `late<=50 && pick reliever >=45` | 5 | 0.6 |
| `late<=55 && reliever gap >=6` | 13 | 0.385 |

## Overlay Backtests

### Pick bullpen first-entry danger

Pass if `pick reliever command risk >= 45 && late stability <= 50`

| Window | Kept | Kept hit rate | Passed | Passed hit rate |
| --- | --- | --- | --- | --- |
| Reserve | 75 | 0.653 | 0 | 0.000 |
| Bridge | 43 | 0.558 | 1 | 0.000 |
| Expanded reserve | 118 | 0.619 | 1 | 0.000 |
| Live current | 45 | 0.600 | 4 | 0.750 |
| Combined | 163 | 0.613 | 5 | 0.600 |

Note: This is the cleanest bullpen-entry danger overlay: a side already flagged as shaky late and likely handing the ball to a wild first reliever.

### Bullpen command mismatch

Pass if `reliever command gap >= 6 && point edge >= 8 && late stability <= 55`

| Window | Kept | Kept hit rate | Passed | Passed hit rate |
| --- | --- | --- | --- | --- |
| Reserve | 75 | 0.653 | 0 | 0.000 |
| Bridge | 42 | 0.548 | 2 | 0.500 |
| Expanded reserve | 117 | 0.615 | 2 | 0.500 |
| Live current | 47 | 0.638 | 2 | 0.000 |
| Combined | 164 | 0.622 | 4 | 0.250 |

Note: This catches paper edges whose late-game path relies on the worse command handoff.

### Starter third-time trap

Pass if `pick 3rd-time penalty >= 40 && starter leverage >= 75 && late stability <= 55`

| Window | Kept | Kept hit rate | Passed | Passed hit rate |
| --- | --- | --- | --- | --- |
| Reserve | 74 | 0.649 | 1 | 1.000 |
| Bridge | 43 | 0.558 | 1 | 0.000 |
| Expanded reserve | 117 | 0.615 | 2 | 0.500 |
| Live current | 42 | 0.595 | 7 | 0.714 |
| Combined | 159 | 0.610 | 9 | 0.667 |

Note: This is the direct “starter edge pretending to be a full-game edge” overlay.

### Starter + bullpen script trap

Pass if `pick 3rd-time penalty >= 38 && pick reliever command risk >= 42 && point edge >= 10`

| Window | Kept | Kept hit rate | Passed | Passed hit rate |
| --- | --- | --- | --- | --- |
| Reserve | 75 | 0.653 | 0 | 0.000 |
| Bridge | 43 | 0.535 | 1 | 1.000 |
| Expanded reserve | 118 | 0.610 | 1 | 1.000 |
| Live current | 49 | 0.612 | 0 | 0.000 |
| Combined | 167 | 0.611 | 1 | 1.000 |

Note: This is the most aggressive script trap: shaky third trip plus shaky first reliever on a supposedly strong paper edge.

## Soft Haircut Trial: Bullpen Command Mismatch

### Expanded reserve (`05-10` to `05-18`)

| Bucket | Baseline games | Baseline hit rate | After haircut games | After haircut hit rate | Removed | Removed hit rate |
| --- | --- | --- | --- | --- | --- | --- |
| `10+ edge` | 37 | 0.514 | 36 | 0.500 | 1 | 1.000 |
| `60+ confidence` | 66 | 0.591 | 66 | 0.591 | 0 | 0.000 |

Haircut used: `-3.0` edge and `-6` confidence when `bullpen command mismatch` is present.

### Live current (`05-19` to `05-22`)

| Bucket | Baseline games | Baseline hit rate | After haircut games | After haircut hit rate | Removed | Removed hit rate |
| --- | --- | --- | --- | --- | --- | --- |
| `10+ edge` | 21 | 0.762 | 20 | 0.800 | 1 | 0.000 |
| `60+ confidence` | 19 | 0.737 | 17 | 0.824 | 2 | 0.000 |

Haircut used: `-3.0` edge and `-6` confidence when `bullpen command mismatch` is present.

### Combined

| Bucket | Baseline games | Baseline hit rate | After haircut games | After haircut hit rate | Removed | Removed hit rate |
| --- | --- | --- | --- | --- | --- | --- |
| `10+ edge` | 58 | 0.603 | 56 | 0.607 | 2 | 0.500 |
| `60+ confidence` | 85 | 0.624 | 83 | 0.639 | 2 | 0.000 |

Haircut used: `-3.0` edge and `-6` confidence when `bullpen command mismatch` is present.

## Haircut Grid Search

| Haircut | Score | Live 10+ edge Δ | Live 60+ conf Δ | Reserve 10+ edge Δ | Reserve 60+ conf Δ | Combined 10+ edge Δ | Combined 60+ conf Δ | Live removed (edge/conf) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `-2.0 / -6` | 0.390 | +0.038 | +0.087 | -0.014 | +0.000 | +0.004 | +0.015 | 1/2 |
| `-3.0 / -6` | 0.390 | +0.038 | +0.087 | -0.014 | +0.000 | +0.004 | +0.015 | 1/2 |
| `-3.0 / -8` | 0.390 | +0.038 | +0.087 | -0.014 | +0.000 | +0.004 | +0.015 | 1/2 |
| `-4.0 / -6` | 0.390 | +0.038 | +0.087 | -0.014 | +0.000 | +0.004 | +0.015 | 1/2 |
| `-4.0 / -8` | 0.390 | +0.038 | +0.087 | -0.014 | +0.000 | +0.004 | +0.015 | 1/2 |
| `-2.0 / -4` | 0.232 | +0.038 | +0.041 | -0.014 | +0.000 | +0.004 | +0.007 | 1/1 |
| `-3.0 / -4` | 0.232 | +0.038 | +0.041 | -0.014 | +0.000 | +0.004 | +0.007 | 1/1 |

Best balanced combo right now: `-2.0` edge and `-6` confidence. It moved the live `10+ edge` bucket by `+0.038` and the live `60+ confidence` bucket by `+0.087`, while the expanded-reserve changes stayed at `-0.014` and `+0.000`. Combined deltas were `+0.004` for `10+ edge` and `+0.015` for `60+ confidence`.

## Early Read
1. `Bullpen command mismatch` is the leading candidate. It is the only Tier 3 lane so far that actually separated a bad passed bucket in the current sample, and it still makes conceptual sense as a late-game script penalty.
2. `Starter third-time trap` still looks like a real baseball concept, but it is not yet producing a clean enough reserve/current separation to trust.
3. The best near-term use of Tier 3 is a **soft haircut**, not a hard pass. This is where the model can respect late-game fragility without pretending it can perfectly predict every script break.
4. The haircut we carry forward should be the one that improves the live `10+ edge` and `60+ confidence` buckets without clearly degrading the expanded-reserve sample.

## Recommended Next Move
1. Keep these features offline for now.
2. Continue using `bullpen command mismatch` as the main Tier 3 candidate.
3. If the haircut continues to help as the sample grows, promote it first as:
   - edge haircut
   - confidence haircut
   - volatility bump
4. Do **not** turn either Tier 3 lane into a hard pass rule until we have a larger and cleaner reserve/current separation.
