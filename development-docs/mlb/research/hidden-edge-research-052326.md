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
| Current (`05-16` to `05-22`) | 93 | 0.613 | 3.4 | 68.0 |
| Combined | 168 | 0.631 | 4.7 | 74.8 |

## Hidden Edge Inventory

- `mlb_team_whiff_persistence_profiles`: 3844 rows
- `mlb_team_lead_surrender_profiles`: 3844 rows
- `mlb_team_form_carryover_profiles`: 3784 rows

All three are keyed by:
- `as_of_date`
- `team_name`
- `window_games`

Current research uses `window_games = 10`.

## Bucket Read

### Pick Whiff Persistence Index
| Bucket | Games | Hit rate |
| --- | --- | --- |
| `<30` | 42 | 0.643 |
| `30-44` | 62 | 0.581 |
| `45-59` | 53 | 0.66 |
| `60+` | 11 | 0.727 |

### Pick Lead Surrender Index
| Bucket | Games | Hit rate |
| --- | --- | --- |
| `<30` | 65 | 0.6 |
| `30-44` | 80 | 0.6 |
| `45-59` | 15 | 0.933 |
| `60+` | 8 | 0.625 |

### Pick Carryover Instability Index
| Bucket | Games | Hit rate |
| --- | --- | --- |
| `<40` | 14 | 0.714 |
| `40-54` | 54 | 0.611 |
| `55-69` | 69 | 0.638 |
| `70+` | 31 | 0.613 |

### Hidden Edge Gaps
| Gap bucket | Games | Hit rate |
| --- | --- | --- |
| `lead surrender gap >= 8` | 70 | 0.629 |
| `carryover gap >= 10` | 43 | 0.605 |
| `opponent comeback resilience >= 55` | 11 | 0.273 |

## Candidate Hidden-Edge Rules

### Lead surrender late fragility

Pass if `pointEdge >= 10 && pick lead surrender >= 45 && late stability <= 55`

| Window | Kept | Kept hit rate | Passed | Passed hit rate |
| --- | --- | --- | --- | --- |
| Reserve | 75 | 0.653 | 0 | 0.000 |
| Current | 91 | 0.604 | 2 | 1.000 |
| Combined | 166 | 0.627 | 2 | 1.000 |

Note: This is the direct "good starter, bad hold" hidden-edge fade.

### Whiff persistence plus soft offense edge

Pass if `pointEdge >= 8 && pick whiff persistence >= 55 && starter leverage <= 70`

| Window | Kept | Kept hit rate | Passed | Passed hit rate |
| --- | --- | --- | --- | --- |
| Reserve | 74 | 0.662 | 1 | 0.000 |
| Current | 92 | 0.609 | 1 | 1.000 |
| Combined | 166 | 0.633 | 2 | 0.500 |

Note: This looks for teams whose bats tend to stay dead after early whiff trouble when the side is not being carried by a major starter edge.

### Carryover instability big edge

Pass if `pointEdge >= 10 && pick carryover instability >= 60`

| Window | Kept | Kept hit rate | Passed | Passed hit rate |
| --- | --- | --- | --- | --- |
| Reserve | 69 | 0.667 | 6 | 0.500 |
| Current | 88 | 0.614 | 5 | 0.600 |
| Combined | 157 | 0.637 | 11 | 0.545 |

Note: This is the "recent form may be lying" lane.

### Opponent comeback pressure

Pass if `pointEdge >= 8 && opponent comeback resilience >= 55 && late stability <= 55`

| Window | Kept | Kept hit rate | Passed | Passed hit rate |
| --- | --- | --- | --- | --- |
| Reserve | 74 | 0.662 | 1 | 0.000 |
| Current | 93 | 0.613 | 0 | 0.000 |
| Combined | 167 | 0.635 | 1 | 0.000 |

Note: This tests whether the opposing team’s comeback habit matters once the game gets into a weaker hold lane.

### Hidden chaos stack

Pass if `pointEdge >= 10 && lead surrender gap >= 8 && carryover instability >= 60`

| Window | Kept | Kept hit rate | Passed | Passed hit rate |
| --- | --- | --- | --- | --- |
| Reserve | 72 | 0.653 | 3 | 0.667 |
| Current | 89 | 0.618 | 4 | 0.500 |
| Combined | 161 | 0.634 | 7 | 0.571 |

Note: This is the first real multi-behavior trap: shaky lead behavior plus a form profile that breaks quickly.

## Soft Haircut Grids

These use the two strongest hidden-edge traps as offline `-edge / -confidence` haircuts on the same `10+ edge` and `60+ confidence` buckets we use elsewhere.

### Opponent comeback pressure haircut
| Haircut | Score | Reserve 10+ Δ | Reserve 60+ Δ | Current 10+ Δ | Current 60+ Δ | Combined 10+ Δ | Combined 60+ Δ | Current removed (edge/conf) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `-2.0 / -4` | 0.071 | +0.038 | +0.000 | +0.000 | +0.000 | +0.023 | +0.000 | 0/0 |
| `-2.0 / -6` | 0.071 | +0.038 | +0.000 | +0.000 | +0.000 | +0.023 | +0.000 | 0/0 |
| `-3.0 / -4` | 0.071 | +0.038 | +0.000 | +0.000 | +0.000 | +0.023 | +0.000 | 0/0 |
| `-3.0 / -6` | 0.071 | +0.038 | +0.000 | +0.000 | +0.000 | +0.023 | +0.000 | 0/0 |
| `-4.0 / -6` | 0.071 | +0.038 | +0.000 | +0.000 | +0.000 | +0.023 | +0.000 | 0/0 |
| `-4.0 / -8` | 0.071 | +0.038 | +0.000 | +0.000 | +0.000 | +0.023 | +0.000 | 0/0 |
| `-1.5 / -4` | 0.000 | +0.000 | +0.000 | +0.000 | +0.000 | +0.000 | +0.000 | 0/0 |

Best current combo: `-2.0` edge / `-4` confidence. Reserve deltas were `+0.038` and `+0.000`. Current deltas were `+0.000` and `+0.000`. Combined deltas were `+0.023` and `+0.000`.

### Hidden chaos stack haircut
| Haircut | Score | Reserve 10+ Δ | Reserve 60+ Δ | Current 10+ Δ | Current 60+ Δ | Combined 10+ Δ | Combined 60+ Δ | Current removed (edge/conf) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `-3.0 / -4` | 0.016 | -0.029 | +0.000 | +0.114 | +0.000 | +0.014 | +0.000 | 3/0 |
| `-3.0 / -6` | 0.016 | -0.029 | +0.000 | +0.114 | +0.000 | +0.014 | +0.000 | 3/0 |
| `-4.0 / -6` | -0.045 | -0.062 | +0.000 | +0.114 | +0.000 | -0.006 | +0.000 | 3/0 |
| `-4.0 / -8` | -0.045 | -0.062 | +0.000 | +0.114 | +0.000 | -0.006 | +0.000 | 3/0 |
| `-1.5 / -4` | -0.126 | -0.029 | +0.000 | +0.067 | +0.000 | +0.006 | +0.000 | 1/0 |
| `-2.0 / -4` | -0.126 | -0.029 | +0.000 | +0.067 | +0.000 | +0.006 | +0.000 | 1/0 |
| `-2.0 / -6` | -0.126 | -0.029 | +0.000 | +0.067 | +0.000 | +0.006 | +0.000 | 1/0 |

Best current combo: `-3.0` edge / `-4` confidence. Reserve deltas were `-0.029` and `+0.000`. Current deltas were `+0.114` and `+0.000`. Combined deltas were `+0.014` and `+0.000`.

### Combined hidden-edge haircut
| Haircut | Score | Reserve 10+ Δ | Reserve 60+ Δ | Current 10+ Δ | Current 60+ Δ | Combined 10+ Δ | Combined 60+ Δ | Current removed (edge/conf) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `-3.0 / -4` | 0.341 | +0.009 | +0.000 | +0.114 | +0.000 | +0.042 | +0.000 | 3/0 |
| `-3.0 / -6` | 0.341 | +0.009 | +0.000 | +0.114 | +0.000 | +0.042 | +0.000 | 3/0 |
| `-2.0 / -4` | 0.197 | +0.009 | +0.000 | +0.067 | +0.000 | +0.032 | +0.000 | 1/0 |
| `-2.0 / -6` | 0.197 | +0.009 | +0.000 | +0.067 | +0.000 | +0.032 | +0.000 | 1/0 |
| `-4.0 / -6` | 0.031 | -0.024 | +0.000 | +0.114 | +0.000 | +0.023 | +0.000 | 3/0 |
| `-4.0 / -8` | 0.031 | -0.024 | +0.000 | +0.114 | +0.000 | +0.023 | +0.000 | 3/0 |
| `-1.5 / -4` | -0.126 | -0.029 | +0.000 | +0.067 | +0.000 | +0.006 | +0.000 | 1/0 |

Best current combo: `-3.0` edge / `-4` confidence. Reserve deltas were `+0.009` and `+0.000`. Current deltas were `+0.114` and `+0.000`. Combined deltas were `+0.042` and `+0.000`.

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
