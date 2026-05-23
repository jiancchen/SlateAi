# MLB Hidden Edge Research — May 23, 2026

## Goal

Build the first warehouse-backed tables for the hidden behavioral edges we keep talking about:

1. `whiff persistence`
2. `lead / surrender behavior`
3. `form carryover / break timing`

This pass uses standard Python and SQLite because `pandas` is not bundled in the current workspace. The table layout is intentionally pandas-ready so we can push this into heavier ML scanning later without redoing the warehouse shape.

## Dataset Windows

| Window | Games | Hit rate | Avg edge | Avg volatility |
| --- | --- | --- | --- | --- |
| Reserve (`05-10` to `05-15`) | 75 | 0.653 | 6.3 | 83.2 |
| Current (`05-16` to `05-22`) | 93 | 0.570 | 7.0 | 88.7 |
| Combined | 168 | 0.607 | 6.7 | 86.3 |

## Hidden Edge Inventory

- `mlb_team_whiff_persistence_profiles`: 2984 rows
- `mlb_team_lead_surrender_profiles`: 2984 rows
- `mlb_team_form_carryover_profiles`: 2924 rows

All three are keyed by:
- `as_of_date`
- `team_name`
- `window_games`

Current research uses `window_games = 10`.

## Bucket Read

### Pick Whiff Persistence Index
| Bucket | Games | Hit rate |
| --- | --- | --- |
| `<30` | 56 | 0.625 |
| `30-44` | 70 | 0.629 |
| `45-59` | 24 | 0.5 |
| `60+` | 18 | 0.611 |

### Pick Lead Surrender Index
| Bucket | Games | Hit rate |
| --- | --- | --- |
| `<30` | 75 | 0.627 |
| `30-44` | 49 | 0.571 |
| `45-59` | 20 | 0.6 |
| `60+` | 24 | 0.625 |

### Pick Carryover Instability Index
| Bucket | Games | Hit rate |
| --- | --- | --- |
| `<40` | 13 | 0.615 |
| `40-54` | 55 | 0.618 |
| `55-69` | 70 | 0.6 |
| `70+` | 30 | 0.6 |

### Hidden Edge Gaps
| Gap bucket | Games | Hit rate |
| --- | --- | --- |
| `lead surrender gap >= 8` | 82 | 0.598 |
| `carryover gap >= 10` | 42 | 0.619 |
| `opponent comeback resilience >= 55` | 28 | 0.429 |

## Candidate Hidden-Edge Rules

### Lead surrender late fragility

Pass if `pointEdge >= 10 && pick lead surrender >= 45 && late stability <= 55`

| Window | Kept | Kept hit rate | Passed | Passed hit rate |
| --- | --- | --- | --- | --- |
| Reserve | 70 | 0.657 | 5 | 0.600 |
| Current | 89 | 0.551 | 4 | 1.000 |
| Combined | 159 | 0.597 | 9 | 0.778 |

Note: This is the direct "good starter, bad hold" hidden-edge fade.

### Whiff persistence plus soft offense edge

Pass if `pointEdge >= 8 && pick whiff persistence >= 55 && starter leverage <= 70`

| Window | Kept | Kept hit rate | Passed | Passed hit rate |
| --- | --- | --- | --- | --- |
| Reserve | 71 | 0.662 | 4 | 0.500 |
| Current | 92 | 0.565 | 1 | 1.000 |
| Combined | 163 | 0.607 | 5 | 0.600 |

Note: This looks for teams whose bats tend to stay dead after early whiff trouble when the side is not being carried by a major starter edge.

### Carryover instability big edge

Pass if `pointEdge >= 10 && pick carryover instability >= 60`

| Window | Kept | Kept hit rate | Passed | Passed hit rate |
| --- | --- | --- | --- | --- |
| Reserve | 69 | 0.667 | 6 | 0.500 |
| Current | 83 | 0.554 | 10 | 0.700 |
| Combined | 152 | 0.605 | 16 | 0.625 |

Note: This is the "recent form may be lying" lane.

### Opponent comeback pressure

Pass if `pointEdge >= 8 && opponent comeback resilience >= 55 && late stability <= 55`

| Window | Kept | Kept hit rate | Passed | Passed hit rate |
| --- | --- | --- | --- | --- |
| Reserve | 71 | 0.676 | 4 | 0.250 |
| Current | 90 | 0.567 | 3 | 0.667 |
| Combined | 161 | 0.615 | 7 | 0.429 |

Note: This tests whether the opposing team’s comeback habit matters once the game gets into a weaker hold lane.

### Hidden chaos stack

Pass if `pointEdge >= 10 && lead surrender gap >= 8 && carryover instability >= 60`

| Window | Kept | Kept hit rate | Passed | Passed hit rate |
| --- | --- | --- | --- | --- |
| Reserve | 69 | 0.667 | 6 | 0.500 |
| Current | 88 | 0.568 | 5 | 0.600 |
| Combined | 157 | 0.611 | 11 | 0.545 |

Note: This is the first real multi-behavior trap: shaky lead behavior plus a form profile that breaks quickly.

## Soft Haircut Grids

These use the two strongest hidden-edge traps as offline `-edge / -confidence` haircuts on the same `10+ edge` and `60+ confidence` buckets we use elsewhere.

### Opponent comeback pressure haircut
| Haircut | Score | Reserve 10+ Δ | Reserve 60+ Δ | Current 10+ Δ | Current 60+ Δ | Combined 10+ Δ | Combined 60+ Δ | Current removed (edge/conf) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `-4.0 / -8` | 0.209 | +0.000 | +0.047 | +0.027 | +0.000 | +0.010 | +0.023 | 2/0 |
| `-2.0 / -6` | 0.164 | +0.000 | +0.022 | +0.038 | +0.000 | +0.018 | +0.011 | 1/0 |
| `-3.0 / -6` | 0.164 | +0.000 | +0.022 | +0.038 | +0.000 | +0.018 | +0.011 | 1/0 |
| `-4.0 / -6` | 0.153 | +0.000 | +0.022 | +0.027 | +0.000 | +0.010 | +0.011 | 2/0 |
| `-1.5 / -4` | 0.114 | +0.000 | +0.000 | +0.038 | +0.000 | +0.018 | +0.000 | 1/0 |
| `-2.0 / -4` | 0.114 | +0.000 | +0.000 | +0.038 | +0.000 | +0.018 | +0.000 | 1/0 |
| `-3.0 / -4` | 0.114 | +0.000 | +0.000 | +0.038 | +0.000 | +0.018 | +0.000 | 1/0 |

Best current combo: `-4.0` edge / `-8` confidence. Reserve deltas were `+0.000` and `+0.047`. Current deltas were `+0.027` and `+0.000`. Combined deltas were `+0.010` and `+0.023`.

### Hidden chaos stack haircut
| Haircut | Score | Reserve 10+ Δ | Reserve 60+ Δ | Current 10+ Δ | Current 60+ Δ | Combined 10+ Δ | Combined 60+ Δ | Current removed (edge/conf) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `-3.0 / -4` | 0.256 | +0.009 | +0.000 | +0.071 | +0.000 | +0.043 | +0.000 | 3/0 |
| `-3.0 / -6` | 0.256 | +0.009 | +0.000 | +0.071 | +0.000 | +0.043 | +0.000 | 3/0 |
| `-2.0 / -4` | 0.137 | +0.009 | +0.000 | +0.038 | +0.000 | +0.030 | +0.000 | 1/0 |
| `-2.0 / -6` | 0.137 | +0.009 | +0.000 | +0.038 | +0.000 | +0.030 | +0.000 | 1/0 |
| `-4.0 / -6` | -0.044 | -0.024 | +0.000 | +0.071 | +0.000 | +0.034 | +0.000 | 3/0 |
| `-4.0 / -8` | -0.044 | -0.024 | +0.000 | +0.071 | +0.000 | +0.034 | +0.000 | 3/0 |
| `-1.5 / -4` | -0.180 | -0.029 | +0.000 | +0.038 | +0.000 | +0.010 | +0.000 | 1/0 |

Best current combo: `-3.0` edge / `-4` confidence. Reserve deltas were `+0.009` and `+0.000`. Current deltas were `+0.071` and `+0.000`. Combined deltas were `+0.043` and `+0.000`.

### Combined hidden-edge haircut
| Haircut | Score | Reserve 10+ Δ | Reserve 60+ Δ | Current 10+ Δ | Current 60+ Δ | Combined 10+ Δ | Combined 60+ Δ | Current removed (edge/conf) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `-3.0 / -6` | 0.306 | +0.009 | +0.022 | +0.071 | +0.000 | +0.043 | +0.011 | 3/0 |
| `-3.0 / -4` | 0.256 | +0.009 | +0.000 | +0.071 | +0.000 | +0.043 | +0.000 | 3/0 |
| `-2.0 / -6` | 0.187 | +0.009 | +0.022 | +0.038 | +0.000 | +0.030 | +0.011 | 1/0 |
| `-2.0 / -4` | 0.137 | +0.009 | +0.000 | +0.038 | +0.000 | +0.030 | +0.000 | 1/0 |
| `-4.0 / -8` | 0.053 | -0.024 | +0.047 | +0.062 | +0.000 | +0.024 | +0.023 | 4/0 |
| `-4.0 / -6` | -0.003 | -0.024 | +0.022 | +0.062 | +0.000 | +0.024 | +0.011 | 4/0 |
| `-1.5 / -4` | -0.180 | -0.029 | +0.000 | +0.038 | +0.000 | +0.010 | +0.000 | 1/0 |

Best current combo: `-3.0` edge / `-6` confidence. Reserve deltas were `+0.009` and `+0.022`. Current deltas were `+0.071` and `+0.000`. Combined deltas were `+0.043` and `+0.011`.

## Early Read
1. These tables are finally measuring the behaviors we were missing: whether bad early swing quality persists, how often advantages actually hold, and how quickly recent form breaks or carries.
2. The next question is not just which bucket is "good" or "bad," but which hidden behaviors combine with existing live features like `starter leverage`, `late stability`, and `point edge`.
3. The haircut grids matter more than the raw pass buckets because they tell us whether these hidden edges can improve stronger conviction lanes without wrecking reserve performance.
4. This is still an early pass. The real upside comes once we let these profiles accumulate more dates and then scan for nonlinear combinations, especially after pandas/ML tooling is added on top.

## Recommended Next Move
1. keep these tables offline for now
2. keep collecting them every graded day
3. rerun these haircut grids after each graded slate
4. only promote a hidden-edge haircut if reserve and current both stop wobbling
