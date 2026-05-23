# MLB Stateful Edge Research - 2026-05-23

This pass tests the exact hidden-edge idea that game-to-game state matters more than one fixed weight recipe. The goal is to measure whether snapback pressure, heat-regression pressure, series carryover, and batter-state pressure actually move results before we let them influence live scoring.

## Universal Team-State Read

| Window | Team-games | Win rate | Avg snapback | Avg heat regression | Avg top-6 pressure |
| --- | --- | --- | --- | --- | --- |
| `2026-05-10` to `2026-05-22` | 346 | 0.497 | 38.5 | 30.3 | 31.6 |

### Losing Streak Snapback
| Bucket | Team-games | Next-game win rate |
| --- | --- | --- |
| `loss streak = 1` | 85 | 0.459 |
| `loss streak = 2` | 48 | 0.458 |
| `loss streak >= 3` | 41 | 0.512 |
| `snapback pressure >= 50` | 87 | 0.46 |

### Hot-Team Regression
| Bucket | Team-games | Next-game win rate |
| --- | --- | --- |
| `win streak = 1` | 85 | 0.553 |
| `win streak = 2` | 47 | 0.489 |
| `win streak >= 3` | 40 | 0.5 |
| `heat regression >= 45` | 53 | 0.585 |

### Batter-State Pressure
| Bucket | Team-games | Next-game win rate |
| --- | --- | --- |
| `top-6 pressure >= 40` | 41 | 0.537 |
| `top-6 cold >= 45` | 92 | 0.576 |
| `top-6 heat >= 40` | 88 | 0.477 |
| `series game 2 && form pressure >= 55` | 10 | 0.4 |

## Prediction Overlay Read

| Window | Predictions | Hit rate | Avg edge | Avg confidence |
| --- | --- | --- | --- | --- |
| Reserve (`05-10` to `05-15`) | 75 | 0.653 | 6.3 | 58.5 |
| Current (`05-16` to `05-22`) | 93 | 0.570 | 7.0 | 57.8 |
| Combined | 168 | 0.607 | 6.7 | 58.1 |

### Opponent snapback trap

Pass if `pointEdge >= 8 && opponent snapback >= 50 && opponent loss streak >= 2`

| Window | Kept | Kept hit rate | Passed | Passed hit rate |
| --- | --- | --- | --- | --- |
| Reserve | 67 | 0.687 | 8 | 0.375 |
| Current | 77 | 0.571 | 16 | 0.562 |
| Combined | 144 | 0.625 | 24 | 0.500 |

Note: This tests the exact idea that the market/model may keep fading a team well past the point where bounceback pressure is real.

### Pick heat-regression trap

Pass if `pointEdge >= 8 && pick heat regression >= 45 && pick win streak >= 2`

| Window | Kept | Kept hit rate | Passed | Passed hit rate |
| --- | --- | --- | --- | --- |
| Reserve | 73 | 0.671 | 2 | 0.000 |
| Current | 84 | 0.548 | 9 | 0.778 |
| Combined | 157 | 0.605 | 11 | 0.636 |

Note: This is the inverse: the model may keep buying a hot team after the carry profile is already starting to wobble.

### Pick batter-pressure trap

Pass if `pointEdge >= 8 && pick top-6 pressure >= 40 && pick top-6 cold >= 45`

| Window | Kept | Kept hit rate | Passed | Passed hit rate |
| --- | --- | --- | --- | --- |
| Reserve | 75 | 0.653 | 0 | 0.000 |
| Current | 90 | 0.567 | 3 | 0.667 |
| Combined | 165 | 0.606 | 3 | 0.667 |

Note: This checks whether strong-looking team edges are actually sitting on a stressed top of the order.

### Series game-2 carryover trap

Pass if `pointEdge >= 10 && series game = 2 && pick form pressure >= 55`

| Window | Kept | Kept hit rate | Passed | Passed hit rate |
| --- | --- | --- | --- | --- |
| Reserve | 75 | 0.653 | 0 | 0.000 |
| Current | 93 | 0.570 | 0 | 0.000 |
| Combined | 168 | 0.607 | 0 | 0.000 |

Note: This is the first direct attempt to catch the "same series, different state" problem.

### Combined stateful trap

Pass if snapback/regression pressure and batter/series pressure are both live

| Window | Kept | Kept hit rate | Passed | Passed hit rate |
| --- | --- | --- | --- | --- |
| Reserve | 75 | 0.653 | 0 | 0.000 |
| Current | 92 | 0.565 | 1 | 1.000 |
| Combined | 167 | 0.605 | 1 | 1.000 |

Note: This is the multi-state version of the hidden edge idea: the numeric edge looks good, but the game-to-game state is against it.

## Soft Haircut Grid For The Opponent Snapback Trap

| Edge cut | Confidence cut | Score | Reserve `10+` delta | Reserve `60+` delta | Current `10+` delta | Current `60+` delta | Combined `10+` delta | Combined `60+` delta |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| -5.0 | -10 | 0.352 | -0.024 | 0.022 | 0.095 | 0.053 | 0.028 | 0.035 |
| -5.0 | -6 | 0.261 | -0.024 | 0.022 | 0.095 | 0.037 | 0.028 | 0.028 |
| -5.0 | -8 | 0.261 | -0.024 | 0.022 | 0.095 | 0.037 | 0.028 | 0.028 |
| -5.0 | -4 | 0.134 | -0.024 | 0.000 | 0.095 | 0.023 | 0.028 | 0.011 |
| -4.0 | -10 | 0.069 | -0.062 | 0.022 | 0.038 | 0.053 | -0.021 | 0.035 |
| -2.0 | -10 | -0.016 | -0.029 | 0.022 | 0.003 | 0.053 | -0.020 | 0.035 |

## Soft Haircut Grid For The Combined Stateful Trap

| Edge cut | Confidence cut | Score | Reserve `10+` delta | Reserve `60+` delta | Current `10+` delta | Current `60+` delta | Combined `10+` delta | Combined `60+` delta |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| -2.0 | -4 | -0.023 | 0.000 | 0.000 | -0.012 | 0.000 | -0.009 | 0.000 |
| -2.0 | -6 | -0.023 | 0.000 | 0.000 | -0.012 | 0.000 | -0.009 | 0.000 |
| -2.0 | -8 | -0.023 | 0.000 | 0.000 | -0.012 | 0.000 | -0.009 | 0.000 |
| -2.0 | -10 | -0.023 | 0.000 | 0.000 | -0.012 | 0.000 | -0.009 | 0.000 |
| -3.0 | -4 | -0.023 | 0.000 | 0.000 | -0.012 | 0.000 | -0.009 | 0.000 |
| -3.0 | -6 | -0.023 | 0.000 | 0.000 | -0.012 | 0.000 | -0.009 | 0.000 |

## Takeaways

- This is the first direct research lane for the idea that the same raw team can mean different things from game to game depending on pressure state.
- The universal tables tell us whether the hidden state is even real independent of our picks.
- The overlay section tells us whether our current model is ignoring those states when it assigns large edges.
- If one of these stateful traps keeps holding across more graded slates, it should become a soft edge/confidence haircut before anything more aggressive.
