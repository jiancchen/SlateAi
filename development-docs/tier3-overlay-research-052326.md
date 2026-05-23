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
| Current (`05-16` to `05-22`) | 93 | 0.581 | 63 | 78 |
| Combined | 168 | 0.613 | 67 | 89 |

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
| Current | 88 | 0.580 | 5 | 0.600 |
| Combined | 163 | 0.613 | 5 | 0.600 |

Note: This is the cleanest bullpen-entry danger overlay: a side already flagged as shaky late and likely handing the ball to a wild first reliever.

### Bullpen command mismatch

Pass if `reliever command gap >= 6 && point edge >= 8 && late stability <= 55`

| Window | Kept | Kept hit rate | Passed | Passed hit rate |
| --- | --- | --- | --- | --- |
| Reserve | 75 | 0.653 | 0 | 0.000 |
| Current | 89 | 0.596 | 4 | 0.250 |
| Combined | 164 | 0.622 | 4 | 0.250 |

Note: This catches paper edges whose late-game path relies on the worse command handoff.

### Starter third-time trap

Pass if `pick 3rd-time penalty >= 40 && starter leverage >= 75 && late stability <= 55`

| Window | Kept | Kept hit rate | Passed | Passed hit rate |
| --- | --- | --- | --- | --- |
| Reserve | 74 | 0.649 | 1 | 1.000 |
| Current | 85 | 0.576 | 8 | 0.625 |
| Combined | 159 | 0.610 | 9 | 0.667 |

Note: This is the direct “starter edge pretending to be a full-game edge” overlay.

### Starter + bullpen script trap

Pass if `pick 3rd-time penalty >= 38 && pick reliever command risk >= 42 && point edge >= 10`

| Window | Kept | Kept hit rate | Passed | Passed hit rate |
| --- | --- | --- | --- | --- |
| Reserve | 75 | 0.653 | 0 | 0.000 |
| Current | 92 | 0.576 | 1 | 1.000 |
| Combined | 167 | 0.611 | 1 | 1.000 |

Note: This is the most aggressive script trap: shaky third trip plus shaky first reliever on a supposedly strong paper edge.

## Early Read
1. `Starter third-time trap` is the most directly aligned with the side-model failure mode we care about: a big starter-backed edge that weakens once the game moves beyond the clean early script.
2. `Bullpen command mismatch` is the better late-game partner feature. It is less about raw bullpen quality and more about which side is more likely to lose the strike zone first when the bridge begins.
3. `Pick bullpen first-entry danger` is useful, but it should probably stay a soft penalty or classifier input unless the passed bucket clearly separates over a larger sample.

## Recommended Next Move
1. Keep these features offline for now.
2. If one overlay separates both reserve and current windows cleanly, promote it first as:
   - confidence haircut
   - edge haircut
   - volatility bump
3. Do **not** turn either into a hard pass rule until we have more dates and a stronger gap between kept and passed buckets.
