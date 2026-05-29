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
| Current (`05-16` to `05-22`) | 93 | 0.581 | 6.6 | 88.8 |
| Combined | 168 | 0.613 | 6.5 | 86.3 |

## Hidden Edge Inventory

- `mlb_team_whiff_persistence_profiles`: 3352 rows
- `mlb_team_lead_surrender_profiles`: 3352 rows
- `mlb_team_form_carryover_profiles`: 3292 rows

All three are keyed by:
- `as_of_date`
- `team_name`
- `window_games`

Current research uses `window_games = 10`.

## Bucket Read

### Pick Whiff Persistence Index
| Bucket | Games | Hit rate |
| --- | --- | --- |
| `<30` | 44 | 0.614 |
| `30-44` | 63 | 0.54 |
| `45-59` | 50 | 0.68 |
| `60+` | 11 | 0.727 |

### Pick Lead Surrender Index
| Bucket | Games | Hit rate |
| --- | --- | --- |
| `<30` | 64 | 0.578 |
| `30-44` | 82 | 0.598 |
| `45-59` | 15 | 0.867 |
| `60+` | 7 | 0.571 |

### Pick Carryover Instability Index
| Bucket | Games | Hit rate |
| --- | --- | --- |
| `<40` | 13 | 0.692 |
| `40-54` | 53 | 0.604 |
| `55-69` | 70 | 0.6 |
| `70+` | 32 | 0.625 |

### Hidden Edge Gaps
| Gap bucket | Games | Hit rate |
| --- | --- | --- |
| `lead surrender gap >= 8` | 71 | 0.606 |
| `carryover gap >= 10` | 44 | 0.614 |
| `opponent comeback resilience >= 55` | 13 | 0.231 |

## Candidate Hidden-Edge Rules

### Lead surrender late fragility

Pass if `pointEdge >= 10 && pick lead surrender >= 45 && late stability <= 55`

| Window | Kept | Kept hit rate | Passed | Passed hit rate |
| --- | --- | --- | --- | --- |
| Reserve | 75 | 0.653 | 0 | 0.000 |
| Current | 91 | 0.571 | 2 | 1.000 |
| Combined | 166 | 0.608 | 2 | 1.000 |

Note: This is the direct "good starter, bad hold" hidden-edge fade.

### Whiff persistence plus soft offense edge

Pass if `pointEdge >= 8 && pick whiff persistence >= 55 && starter leverage <= 70`

| Window | Kept | Kept hit rate | Passed | Passed hit rate |
| --- | --- | --- | --- | --- |
| Reserve | 74 | 0.662 | 1 | 0.000 |
| Current | 92 | 0.576 | 1 | 1.000 |
| Combined | 166 | 0.614 | 2 | 0.500 |

Note: This looks for teams whose bats tend to stay dead after early whiff trouble when the side is not being carried by a major starter edge.

### Carryover instability big edge

Pass if `pointEdge >= 10 && pick carryover instability >= 60`

| Window | Kept | Kept hit rate | Passed | Passed hit rate |
| --- | --- | --- | --- | --- |
| Reserve | 69 | 0.667 | 6 | 0.500 |
| Current | 84 | 0.571 | 9 | 0.667 |
| Combined | 153 | 0.614 | 15 | 0.600 |

Note: This is the "recent form may be lying" lane.

### Opponent comeback pressure

Pass if `pointEdge >= 8 && opponent comeback resilience >= 55 && late stability <= 55`

| Window | Kept | Kept hit rate | Passed | Passed hit rate |
| --- | --- | --- | --- | --- |
| Reserve | 74 | 0.662 | 1 | 0.000 |
| Current | 93 | 0.581 | 0 | 0.000 |
| Combined | 167 | 0.617 | 1 | 0.000 |

Note: This tests whether the opposing team’s comeback habit matters once the game gets into a weaker hold lane.

### Hidden chaos stack

Pass if `pointEdge >= 10 && lead surrender gap >= 8 && carryover instability >= 60`

| Window | Kept | Kept hit rate | Passed | Passed hit rate |
| --- | --- | --- | --- | --- |
| Reserve | 72 | 0.653 | 3 | 0.667 |
| Current | 89 | 0.584 | 4 | 0.500 |
| Combined | 161 | 0.615 | 7 | 0.571 |

Note: This is the first real multi-behavior trap: shaky lead behavior plus a form profile that breaks quickly.

## Soft Haircut Grids

These use the two strongest hidden-edge traps as offline `-edge / -confidence` haircuts on the same `10+ edge` and `60+ confidence` buckets we use elsewhere.

### Opponent comeback pressure haircut
| Haircut | Score | Reserve 10+ Δ | Reserve 60+ Δ | Current 10+ Δ | Current 60+ Δ | Combined 10+ Δ | Combined 60+ Δ | Current removed (edge/conf) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `-2.0 / -4` | 0.067 | +0.038 | +0.000 | +0.000 | +0.000 | +0.019 | +0.000 | 0/0 |
| `-2.0 / -6` | 0.067 | +0.038 | +0.000 | +0.000 | +0.000 | +0.019 | +0.000 | 0/0 |
| `-3.0 / -4` | 0.067 | +0.038 | +0.000 | +0.000 | +0.000 | +0.019 | +0.000 | 0/0 |
| `-3.0 / -6` | 0.067 | +0.038 | +0.000 | +0.000 | +0.000 | +0.019 | +0.000 | 0/0 |
| `-4.0 / -6` | 0.067 | +0.038 | +0.000 | +0.000 | +0.000 | +0.019 | +0.000 | 0/0 |
| `-4.0 / -8` | 0.067 | +0.038 | +0.000 | +0.000 | +0.000 | +0.019 | +0.000 | 0/0 |
| `-1.5 / -4` | 0.000 | +0.000 | +0.000 | +0.000 | +0.000 | +0.000 | +0.000 | 0/0 |

Best current combo: `-2.0` edge / `-4` confidence. Reserve deltas were `+0.038` and `+0.000`. Current deltas were `+0.000` and `+0.000`. Combined deltas were `+0.019` and `+0.000`.

### Hidden chaos stack haircut
| Haircut | Score | Reserve 10+ Δ | Reserve 60+ Δ | Current 10+ Δ | Current 60+ Δ | Combined 10+ Δ | Combined 60+ Δ | Current removed (edge/conf) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `-3.0 / -4` | -0.057 | -0.029 | +0.000 | +0.074 | +0.000 | +0.021 | +0.000 | 3/0 |
| `-3.0 / -6` | -0.057 | -0.029 | +0.000 | +0.074 | +0.000 | +0.021 | +0.000 | 3/0 |
| `-4.0 / -6` | -0.109 | -0.062 | +0.000 | +0.074 | +0.000 | +0.010 | +0.000 | 3/0 |
| `-4.0 / -8` | -0.109 | -0.062 | +0.000 | +0.074 | +0.000 | +0.010 | +0.000 | 3/0 |
| `-1.5 / -4` | -0.179 | -0.029 | +0.000 | +0.039 | +0.000 | +0.009 | +0.000 | 1/0 |
| `-2.0 / -4` | -0.179 | -0.029 | +0.000 | +0.039 | +0.000 | +0.009 | +0.000 | 1/0 |
| `-2.0 / -6` | -0.179 | -0.029 | +0.000 | +0.039 | +0.000 | +0.009 | +0.000 | 1/0 |

Best current combo: `-3.0` edge / `-4` confidence. Reserve deltas were `-0.029` and `+0.000`. Current deltas were `+0.074` and `+0.000`. Combined deltas were `+0.021` and `+0.000`.

### Combined hidden-edge haircut
| Haircut | Score | Reserve 10+ Δ | Reserve 60+ Δ | Current 10+ Δ | Current 60+ Δ | Combined 10+ Δ | Combined 60+ Δ | Current removed (edge/conf) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `-3.0 / -4` | 0.262 | +0.009 | +0.000 | +0.074 | +0.000 | +0.043 | +0.000 | 3/0 |
| `-3.0 / -6` | 0.262 | +0.009 | +0.000 | +0.074 | +0.000 | +0.043 | +0.000 | 3/0 |
| `-2.0 / -4` | 0.139 | +0.009 | +0.000 | +0.039 | +0.000 | +0.030 | +0.000 | 1/0 |
| `-2.0 / -6` | 0.139 | +0.009 | +0.000 | +0.039 | +0.000 | +0.030 | +0.000 | 1/0 |
| `-4.0 / -6` | -0.039 | -0.024 | +0.000 | +0.074 | +0.000 | +0.033 | +0.000 | 3/0 |
| `-4.0 / -8` | -0.039 | -0.024 | +0.000 | +0.074 | +0.000 | +0.033 | +0.000 | 3/0 |
| `-1.5 / -4` | -0.179 | -0.029 | +0.000 | +0.039 | +0.000 | +0.009 | +0.000 | 1/0 |

Best current combo: `-3.0` edge / `-4` confidence. Reserve deltas were `+0.009` and `+0.000`. Current deltas were `+0.074` and `+0.000`. Combined deltas were `+0.043` and `+0.000`.

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
