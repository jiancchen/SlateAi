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
| Reserve (`05-10` to `05-15`) | 75 | 0.653 | 7.0 | 79.9 |
| Current (`05-16` to `05-22`) | 93 | 0.581 | 7.6 | 87.3 |
| Combined | 168 | 0.613 | 7.4 | 84.0 |

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
| `<30` | 59 | 0.627 |
| `30-44` | 67 | 0.642 |
| `45-59` | 23 | 0.478 |
| `60+` | 19 | 0.632 |

### Pick Lead Surrender Index
| Bucket | Games | Hit rate |
| --- | --- | --- |
| `<30` | 79 | 0.62 |
| `30-44` | 48 | 0.562 |
| `45-59` | 20 | 0.6 |
| `60+` | 21 | 0.714 |

### Pick Carryover Instability Index
| Bucket | Games | Hit rate |
| --- | --- | --- |
| `<40` | 15 | 0.6 |
| `40-54` | 53 | 0.623 |
| `55-69` | 69 | 0.609 |
| `70+` | 31 | 0.613 |

### Hidden Edge Gaps
| Gap bucket | Games | Hit rate |
| --- | --- | --- |
| `lead surrender gap >= 8` | 76 | 0.605 |
| `carryover gap >= 10` | 42 | 0.643 |
| `opponent comeback resilience >= 55` | 28 | 0.429 |

## Candidate Hidden-Edge Rules

### Lead surrender late fragility

Pass if `pointEdge >= 10 && pick lead surrender >= 45 && late stability <= 55`

| Window | Kept | Kept hit rate | Passed | Passed hit rate |
| --- | --- | --- | --- | --- |
| Reserve | 67 | 0.672 | 8 | 0.500 |
| Current | 88 | 0.568 | 5 | 0.800 |
| Combined | 155 | 0.613 | 13 | 0.615 |

Note: This is the direct "good starter, bad hold" hidden-edge fade.

### Whiff persistence plus soft offense edge

Pass if `pointEdge >= 8 && pick whiff persistence >= 55 && starter leverage <= 70`

| Window | Kept | Kept hit rate | Passed | Passed hit rate |
| --- | --- | --- | --- | --- |
| Reserve | 72 | 0.653 | 3 | 0.667 |
| Current | 92 | 0.576 | 1 | 1.000 |
| Combined | 164 | 0.610 | 4 | 0.750 |

Note: This looks for teams whose bats tend to stay dead after early whiff trouble when the side is not being carried by a major starter edge.

### Carryover instability big edge

Pass if `pointEdge >= 10 && pick carryover instability >= 60`

| Window | Kept | Kept hit rate | Passed | Passed hit rate |
| --- | --- | --- | --- | --- |
| Reserve | 69 | 0.667 | 6 | 0.500 |
| Current | 80 | 0.575 | 13 | 0.615 |
| Combined | 149 | 0.617 | 19 | 0.579 |

Note: This is the "recent form may be lying" lane.

### Opponent comeback pressure

Pass if `pointEdge >= 8 && opponent comeback resilience >= 55 && late stability <= 55`

| Window | Kept | Kept hit rate | Passed | Passed hit rate |
| --- | --- | --- | --- | --- |
| Reserve | 70 | 0.686 | 5 | 0.200 |
| Current | 88 | 0.591 | 5 | 0.400 |
| Combined | 158 | 0.633 | 10 | 0.300 |

Note: This tests whether the opposing team’s comeback habit matters once the game gets into a weaker hold lane.

### Hidden chaos stack

Pass if `pointEdge >= 10 && lead surrender gap >= 8 && carryover instability >= 60`

| Window | Kept | Kept hit rate | Passed | Passed hit rate |
| --- | --- | --- | --- | --- |
| Reserve | 69 | 0.667 | 6 | 0.500 |
| Current | 85 | 0.588 | 8 | 0.500 |
| Combined | 154 | 0.623 | 14 | 0.500 |

Note: This is the first real multi-behavior trap: shaky lead behavior plus a form profile that breaks quickly.

## Soft Haircut Grids

These use the two strongest hidden-edge traps as offline `-edge / -confidence` haircuts on the same `10+ edge` and `60+ confidence` buckets we use elsewhere.

### Opponent comeback pressure haircut
| Haircut | Score | Reserve 10+ Δ | Reserve 60+ Δ | Current 10+ Δ | Current 60+ Δ | Combined 10+ Δ | Combined 60+ Δ | Current removed (edge/conf) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `-4.0 / -8` | 0.354 | +0.029 | +0.069 | -0.013 | +0.032 | +0.005 | +0.050 | 1/2 |
| `-3.0 / -6` | 0.249 | +0.029 | +0.016 | +0.000 | +0.032 | +0.013 | +0.024 | 0/2 |
| `-4.0 / -6` | 0.235 | +0.029 | +0.016 | -0.013 | +0.032 | +0.005 | +0.024 | 1/2 |
| `-2.0 / -6` | 0.200 | +0.000 | +0.016 | +0.000 | +0.032 | +0.000 | +0.024 | 0/2 |
| `-3.0 / -4` | 0.049 | +0.029 | +0.000 | +0.000 | +0.000 | +0.013 | +0.000 | 0/0 |
| `-1.5 / -4` | 0.000 | +0.000 | +0.000 | +0.000 | +0.000 | +0.000 | +0.000 | 0/0 |
| `-2.0 / -4` | 0.000 | +0.000 | +0.000 | +0.000 | +0.000 | +0.000 | +0.000 | 0/0 |

Best current combo: `-4.0` edge / `-8` confidence. Reserve deltas were `+0.029` and `+0.069`. Current deltas were `-0.013` and `+0.032`. Combined deltas were `+0.005` and `+0.050`.

### Hidden chaos stack haircut
| Haircut | Score | Reserve 10+ Δ | Reserve 60+ Δ | Current 10+ Δ | Current 60+ Δ | Combined 10+ Δ | Combined 60+ Δ | Current removed (edge/conf) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `-4.0 / -6` | 0.401 | +0.006 | +0.000 | +0.053 | +0.021 | +0.030 | +0.010 | 5/3 |
| `-4.0 / -8` | 0.401 | +0.006 | +0.000 | +0.053 | +0.021 | +0.030 | +0.010 | 5/3 |
| `-3.0 / -6` | 0.099 | -0.024 | +0.000 | +0.053 | +0.021 | +0.015 | +0.010 | 5/3 |
| `-3.0 / -4` | 0.017 | -0.024 | +0.000 | +0.053 | +0.005 | +0.015 | +0.002 | 5/2 |
| `-2.0 / -6` | -0.081 | -0.024 | +0.000 | -0.003 | +0.021 | -0.013 | +0.010 | 3/3 |
| `-2.0 / -4` | -0.164 | -0.024 | +0.000 | -0.003 | +0.005 | -0.013 | +0.002 | 3/2 |
| `-1.5 / -4` | -0.246 | -0.024 | +0.000 | -0.028 | +0.005 | -0.026 | +0.002 | 2/2 |

Best current combo: `-4.0` edge / `-6` confidence. Reserve deltas were `+0.006` and `+0.000`. Current deltas were `+0.053` and `+0.021`. Combined deltas were `+0.030` and `+0.010`.

### Combined hidden-edge haircut
| Haircut | Score | Reserve 10+ Δ | Reserve 60+ Δ | Current 10+ Δ | Current 60+ Δ | Combined 10+ Δ | Combined 60+ Δ | Current removed (edge/conf) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `-4.0 / -8` | 0.684 | +0.038 | +0.069 | +0.039 | +0.039 | +0.037 | +0.054 | 6/4 |
| `-4.0 / -6` | 0.565 | +0.038 | +0.016 | +0.039 | +0.039 | +0.037 | +0.027 | 6/4 |
| `-3.0 / -6` | 0.526 | +0.006 | +0.016 | +0.053 | +0.039 | +0.030 | +0.027 | 5/4 |
| `-3.0 / -4` | 0.319 | +0.006 | +0.000 | +0.053 | +0.005 | +0.030 | +0.002 | 5/2 |
| `-2.0 / -6` | 0.043 | -0.024 | +0.016 | -0.003 | +0.039 | -0.013 | +0.027 | 3/4 |
| `-2.0 / -4` | -0.164 | -0.024 | +0.000 | -0.003 | +0.005 | -0.013 | +0.002 | 3/2 |
| `-1.5 / -4` | -0.246 | -0.024 | +0.000 | -0.028 | +0.005 | -0.026 | +0.002 | 2/2 |

Best current combo: `-4.0` edge / `-8` confidence. Reserve deltas were `+0.038` and `+0.069`. Current deltas were `+0.039` and `+0.039`. Combined deltas were `+0.037` and `+0.054`.

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
