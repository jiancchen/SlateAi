# MLB Tier 2 Feature Research 05-22-26

## Goal

Start Tier 2 offline by turning the new warehouse depth into pregame priors that can be backtested safely before touching live scoring.

This pass focuses on four medium-lift additions:

- rolling team story priors
- lineup dependency concentration
- starter leash profiles
- divisional / series context

## Dataset Windows Used

- **Reserve window**: `2026-05-10` through `2026-05-15` from `board-moneyline-v2` backtests
- **Current window**: `2026-05-16` through `2026-05-22` from the graded history archive

| Window | Games | Hit rate | Avg edge | Avg volatility |
| --- | --- | --- | --- | --- |
| Reserve (`05-10` to `05-15`) | 75 | 0.653 | 7.0 | 79.9 |
| Current (`05-16` to `05-22`) | 93 | 0.581 | 8.8 | 87.6 |
| Combined | 168 | 0.613 | 8.0 | 84.2 |

## Tier 2 Inventory

- `mlb_team_story_priors`: 2984 rows
- `mlb_lineup_dependency_profiles`: 688 rows
- `mlb_starter_leash_profiles`: 3840 rows
- `mlb_series_context_snapshots`: 766 rows

## Feature Buckets

### Pick-Team Story Instability
| Bucket | Games | Hit rate |
| --- | --- | --- |
| `<8` | 65 | 0.692 |
| `8-14` | 73 | 0.589 |
| `15-19` | 24 | 0.583 |
| `20+` | 6 | 0.167 |

### Pick-Team Lineup Dependency
| Bucket | Games | Hit rate |
| --- | --- | --- |
| `<35` | 0 | 0.000 |
| `35-49` | 3 | 0.667 |
| `50-59` | 25 | 0.640 |
| `60+` | 139 | 0.604 |

### Pick-Starter Leash Score
| Bucket | Games | Hit rate |
| --- | --- | --- |
| `<40` | 22 | 0.727 |
| `40-54` | 39 | 0.615 |
| `55-69` | 45 | 0.578 |
| `70+` | 51 | 0.608 |

### Story Gap (Pick - Opponent)
| Bucket | Games | Hit rate |
| --- | --- | --- |
| `<= -5` | 49 | 0.653 |
| `-4 to 4` | 88 | 0.602 |
| `5+` | 31 | 0.581 |

### Leash Gap (Pick - Opponent)
| Bucket | Games | Hit rate |
| --- | --- | --- |
| `<= -8` | 31 | 0.710 |
| `-7 to 7` | 36 | 0.556 |
| `8+` | 80 | 0.613 |

### Series Context
| Bucket | Games | Hit rate |
| --- | --- | --- |
| `Non-division` | 102 | 0.637 |
| `Division` | 66 | 0.576 |
| `Series game 1` | 59 | 0.610 |
| `Series game 2` | 46 | 0.609 |
| `Series game 3+` | 63 | 0.619 |

## Candidate Tier 2 Rules

### Opponent leash advantage against our pick

Pass if `pointEdge >= 10 && leash gap <= -8`

| Window | Kept | Kept hit rate | Passed | Passed hit rate |
| --- | --- | --- | --- | --- |
| Reserve | 75 | 0.653 | 0 | 0.000 |
| Current | 88 | 0.602 | 5 | 0.200 |
| Combined | 163 | 0.626 | 5 | 0.200 |

Note: Best early Tier 2 red flag so far. When the picked side owns the worse leash by a real margin, big edges are getting shakier fast.

### Short pick leash big edge

Pass if `pointEdge >= 10 && pick leash <= 52`

| Window | Kept | Kept hit rate | Passed | Passed hit rate |
| --- | --- | --- | --- | --- |
| Reserve | 72 | 0.639 | 3 | 1.000 |
| Current | 82 | 0.585 | 11 | 0.545 |
| Combined | 154 | 0.610 | 14 | 0.643 |

Note: Broader leash-only version of the same idea. Not as sharp as leash gap, but it is easier to integrate into the current risk stack.

### Story gap in the wrong direction

Pass if `pointEdge >= 10 && story gap >= 5`

| Window | Kept | Kept hit rate | Passed | Passed hit rate |
| --- | --- | --- | --- | --- |
| Reserve | 73 | 0.658 | 2 | 0.500 |
| Current | 89 | 0.573 | 4 | 0.750 |
| Combined | 162 | 0.611 | 6 | 0.667 |

Note: Useful as a monitoring lane, but it is not a clean pass trigger yet because the early sample is mixed and small.

### Concentrated lineup into longer opponent leash

Pass if `pick dependency >= 50 && opponent leash >= 60`

| Window | Kept | Kept hit rate | Passed | Passed hit rate |
| --- | --- | --- | --- | --- |
| Reserve | 56 | 0.589 | 19 | 0.842 |
| Current | 70 | 0.571 | 23 | 0.609 |
| Combined | 126 | 0.579 | 42 | 0.714 |

Note: Important negative result: this is not behaving like a pass rule yet, which suggests lineup concentration alone may describe good concentrated offenses as often as fragile ones.

## Early Read

- `Story instability` still looks like the right concept, but the first scoring scale is too compressed. It needs either a stronger formula or quantile-style thresholds before it becomes a live rule.
- `Starter leash` is the best first Tier 2 lane. The strongest early warning signal is not just a short leash, but a **negative leash gap** where the picked side clearly owns the worse starter length outlook.
- `Lineup dependency` is not behaving like a pure pass feature yet. Concentrated offenses can still be genuinely dangerous, so this probably belongs in combination with leash, pitch mix, or opponent-quality filters.
- `Series / divisional context` is useful as supporting context, but it does not look like the first standalone win condition.

## Recommended Next Move

1. keep Tier 2 offline for now
2. promote `leash gap` into the Tier 1 risk stack first, but only as a soft penalty before it becomes a hard pass flag
3. start Tier 3 research around reliever first-batter command and third-time-through trouble once these priors are stable
