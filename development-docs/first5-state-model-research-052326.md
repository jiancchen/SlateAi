# MLB First-Five State Model Research - 2026-05-23

This is a separate first-five research lane built on the new state snapshots, not the old one-size-fits-all full-game composite. Ties are treated as pushes in the decision-only read, which is the right way to judge first-five behavior.

## Baseline First-Five Read

| Window | Picks | Strict hit rate | Decision-only hit rate | Push rate | Avg edge | Avg starter leverage |
| --- | --- | --- | --- | --- | --- | --- |
| Reserve (`05-10` to `05-15`) | 75 | 0.600 | 0.703 | 0.147 | 7.0 | 63.2 |
| Current (`05-16` to `05-22`) | 93 | 0.452 | 0.553 | 0.183 | 7.6 | 73.7 |
| Combined | 168 | 0.518 | 0.621 | 0.167 | 7.4 | 69.0 |

## First-Five Buckets

### Starter Leverage Buckets
| Bucket | Picks | Strict | Decision-only | Push rate |
| --- | --- | --- | --- | --- |
| `<65` | 73 | 0.589 | 0.705 | 0.164 |
| `65-74` | 27 | 0.519 | 0.560 | 0.074 |
| `75+` | 68 | 0.441 | 0.556 | 0.206 |

### Point Edge Buckets
| Bucket | Picks | Strict | Decision-only | Push rate |
| --- | --- | --- | --- | --- |
| `<8` | 96 | 0.531 | 0.646 | 0.177 |
| `8-11.9` | 37 | 0.486 | 0.581 | 0.162 |
| `12+` | 35 | 0.514 | 0.600 | 0.143 |

### Opponent Snapback Buckets
| Bucket | Picks | Strict | Decision-only | Push rate |
| --- | --- | --- | --- | --- |
| `<40` | 93 | 0.548 | 0.646 | 0.151 |
| `40-49.9` | 27 | 0.481 | 0.591 | 0.185 |
| `50+` | 48 | 0.479 | 0.590 | 0.188 |

## Candidate First-Five Lanes

### Starter-led clean lane

Eligible if `pointEdge >= 8 && starter leverage >= 72 && opponent snapback < 50 && pick top-6 pressure < 40`

| Window | Picks | Strict hit rate | Decision-only hit rate | Push rate | Pushes |
| --- | --- | --- | --- | --- | --- |
| Reserve | 9 | 0.556 | 0.625 | 0.111 | 1 |
| Current | 22 | 0.500 | 0.550 | 0.091 | 2 |
| Combined | 31 | 0.516 | 0.571 | 0.097 | 3 |

Note: This is the first attempt at a true first-five play lane: strong starter window, no obvious bounceback trap, and lower top-order stress.

### Tie / push trap

Flag if `pointEdge < 8 && starter leverage < 72`

| Window | Picks | Strict hit rate | Decision-only hit rate | Push rate | Pushes |
| --- | --- | --- | --- | --- | --- |
| Reserve | 44 | 0.659 | 0.763 | 0.136 | 6 |
| Current | 30 | 0.400 | 0.522 | 0.233 | 7 |
| Combined | 74 | 0.554 | 0.672 | 0.176 | 13 |

Note: This is the simplest tie-prone lane: not enough early edge and not enough starter separation.

### Opponent snapback trap

Flag if `pointEdge >= 8 && opponent snapback >= 50 && opponent loss streak >= 2`

| Window | Picks | Strict hit rate | Decision-only hit rate | Push rate | Pushes |
| --- | --- | --- | --- | --- | --- |
| Reserve | 9 | 0.556 | 0.714 | 0.222 | 2 |
| Current | 18 | 0.389 | 0.538 | 0.278 | 5 |
| Combined | 27 | 0.444 | 0.600 | 0.259 | 7 |

Note: This tests whether first five is overfading bounceback teams in the early innings too.

### Top-order pressure trap

Flag if `pointEdge >= 8 && pick top-6 pressure >= 40 && pick top-6 cold >= 45`

| Window | Picks | Strict hit rate | Decision-only hit rate | Push rate | Pushes |
| --- | --- | --- | --- | --- | --- |
| Reserve | 0 | 0.000 | 0.000 | 0.000 | 0 |
| Current | 4 | 0.500 | 0.500 | 0.000 | 0 |
| Combined | 4 | 0.500 | 0.500 | 0.000 | 0 |

Note: This checks whether our first-five pick is leaning on a stressed top of the order that may stay dead early.

### Series carryover trap

Flag if `pointEdge >= 8 && series game = 2 && pick form pressure >= 55`

| Window | Picks | Strict hit rate | Decision-only hit rate | Push rate | Pushes |
| --- | --- | --- | --- | --- | --- |
| Reserve | 2 | 1.000 | 1.000 | 0.000 | 0 |
| Current | 0 | 0.000 | 0.000 | 0.000 | 0 |
| Combined | 2 | 1.000 | 1.000 | 0.000 | 0 |

Note: This is the same-series, different-state problem specifically for the starter window.

## Takeaways

- First five needs its own environment test: early starter edge, not late bullpen shape.
- Push rate matters. A lane with a decent strict hit rate but too many pushes can still be a bad use of capital if we overbet it.
- The state layer gives us better reasons to pass: bounceback pressure, top-order stress, and same-series carryover can all fight a paper starter edge.
- The goal from here is not more first-five volume. It is a smaller set of cleaner first-five lanes.
