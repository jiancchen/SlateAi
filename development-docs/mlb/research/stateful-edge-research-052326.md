# MLB Stateful Edge Research - 2026-05-23

This pass tests the exact hidden-edge idea that game-to-game state matters more than one fixed weight recipe. The goal is to measure whether snapback pressure, heat-regression pressure, series carryover, and batter-state pressure actually move results before we let them influence live scoring.

## Universal Team-State Read

| Window | Team-games | Win rate | Avg snapback | Avg heat regression | Avg top-6 pressure |
| --- | --- | --- | --- | --- | --- |
| `2026-05-10` to `2026-05-22` | 344 | 0.500 | 38.2 | 30.5 | 31.4 |

### Losing Streak Snapback
| Bucket | Team-games | Next-game win rate |
| --- | --- | --- |
| `loss streak = 1` | 86 | 0.465 |
| `loss streak = 2` | 46 | 0.478 |
| `loss streak >= 3` | 40 | 0.5 |
| `snapback pressure >= 50` | 85 | 0.471 |

### Hot-Team Regression
| Bucket | Team-games | Next-game win rate |
| --- | --- | --- |
| `win streak = 1` | 86 | 0.547 |
| `win streak = 2` | 46 | 0.5 |
| `win streak >= 3` | 40 | 0.5 |
| `heat regression >= 45` | 55 | 0.582 |

### Batter-State Pressure
| Bucket | Team-games | Next-game win rate |
| --- | --- | --- |
| `top-6 pressure >= 40` | 42 | 0.476 |
| `top-6 cold >= 45` | 112 | 0.545 |
| `top-6 heat >= 40` | 90 | 0.533 |
| `series game 2 && form pressure >= 55` | 10 | 0.4 |

## Prediction Overlay Read

| Window | Predictions | Hit rate | Avg edge | Avg confidence |
| --- | --- | --- | --- | --- |
| Reserve (`05-10` to `05-15`) | 75 | 0.653 | 6.3 | 58.5 |
| Current (`05-16` to `05-22`) | 93 | 0.581 | 6.6 | 57.4 |
| Combined | 168 | 0.613 | 6.4 | 57.9 |

### Opponent snapback trap

Pass if `pointEdge >= 8 && opponent snapback >= 50 && opponent loss streak >= 2`

| Window | Kept | Kept hit rate | Passed | Passed hit rate |
| --- | --- | --- | --- | --- |
| Reserve | 67 | 0.687 | 8 | 0.375 |
| Current | 80 | 0.588 | 13 | 0.538 |
| Combined | 147 | 0.633 | 21 | 0.476 |

Note: This tests the exact idea that the market/model may keep fading a team well past the point where bounceback pressure is real.

### Pick heat-regression trap

Pass if `pointEdge >= 8 && pick heat regression >= 45 && pick win streak >= 2`

| Window | Kept | Kept hit rate | Passed | Passed hit rate |
| --- | --- | --- | --- | --- |
| Reserve | 73 | 0.671 | 2 | 0.000 |
| Current | 85 | 0.565 | 8 | 0.750 |
| Combined | 158 | 0.614 | 10 | 0.600 |

Note: This is the inverse: the model may keep buying a hot team after the carry profile is already starting to wobble.

### Pick batter-pressure trap

Pass if `pointEdge >= 8 && pick top-6 pressure >= 40 && pick top-6 cold >= 45`

| Window | Kept | Kept hit rate | Passed | Passed hit rate |
| --- | --- | --- | --- | --- |
| Reserve | 74 | 0.649 | 1 | 1.000 |
| Current | 90 | 0.578 | 3 | 0.667 |
| Combined | 164 | 0.610 | 4 | 0.750 |

Note: This checks whether strong-looking team edges are actually sitting on a stressed top of the order.

### Series game-2 carryover trap

Pass if `pointEdge >= 10 && series game = 2 && pick form pressure >= 55`

| Window | Kept | Kept hit rate | Passed | Passed hit rate |
| --- | --- | --- | --- | --- |
| Reserve | 75 | 0.653 | 0 | 0.000 |
| Current | 93 | 0.581 | 0 | 0.000 |
| Combined | 168 | 0.613 | 0 | 0.000 |

Note: This is the first direct attempt to catch the "same series, different state" problem.

### Combined stateful trap

Pass if snapback/regression pressure and batter/series pressure are both live

| Window | Kept | Kept hit rate | Passed | Passed hit rate |
| --- | --- | --- | --- | --- |
| Reserve | 74 | 0.649 | 1 | 1.000 |
| Current | 93 | 0.581 | 0 | 0.000 |
| Combined | 167 | 0.611 | 1 | 1.000 |

Note: This is the multi-state version of the hidden edge idea: the numeric edge looks good, but the game-to-game state is against it.

## Soft Haircut Grid For The Opponent Snapback Trap

| Edge cut | Confidence cut | Score | Reserve `10+` delta | Reserve `60+` delta | Current `10+` delta | Current `60+` delta | Combined `10+` delta | Combined `60+` delta |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| -5.0 | -10 | 0.190 | -0.024 | 0.022 | 0.107 | 0.013 | 0.037 | 0.018 |
| -5.0 | -6 | 0.109 | -0.024 | 0.022 | 0.107 | 0.000 | 0.037 | 0.012 |
| -5.0 | -8 | 0.109 | -0.024 | 0.022 | 0.107 | 0.000 | 0.037 | 0.012 |
| -5.0 | -4 | 0.063 | -0.024 | 0.000 | 0.107 | 0.000 | 0.037 | 0.000 |
| -3.0 | -10 | -0.034 | -0.029 | 0.022 | 0.050 | 0.013 | 0.000 | 0.018 |
| -4.0 | -10 | -0.093 | -0.062 | 0.022 | 0.050 | 0.013 | -0.012 | 0.018 |

## Soft Haircut Grid For The Combined Stateful Trap

| Edge cut | Confidence cut | Score | Reserve `10+` delta | Reserve `60+` delta | Current `10+` delta | Current `60+` delta | Combined `10+` delta | Combined `60+` delta |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| -2.0 | -4 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 |
| -2.0 | -6 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 |
| -2.0 | -8 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 |
| -2.0 | -10 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 |
| -3.0 | -4 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 |
| -3.0 | -6 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 |

## Takeaways

- This is the first direct research lane for the idea that the same raw team can mean different things from game to game depending on pressure state.
- The universal tables tell us whether the hidden state is even real independent of our picks.
- The overlay section tells us whether our current model is ignoring those states when it assigns large edges.
- If one of these stateful traps keeps holding across more graded slates, it should become a soft edge/confidence haircut before anything more aggressive.
