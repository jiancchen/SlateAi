# MLB First-Five State Model Research - 2026-05-23

This is a separate first-five research lane built on the new state snapshots, not the old one-size-fits-all full-game composite. Ties are treated as pushes in the decision-only read, which is the right way to judge first-five behavior.

## Baseline First-Five Read

| Window | Picks | Strict hit rate | Decision-only hit rate | Push rate | Avg edge | Avg starter leverage |
| --- | --- | --- | --- | --- | --- | --- |
| Reserve (`05-10` to `05-15`) | 75 | 0.600 | 0.703 | 0.147 | 6.3 | 59.9 |
| Current (`05-16` to `05-22`) | 93 | 0.441 | 0.539 | 0.183 | 6.6 | 71.9 |
| Combined | 168 | 0.512 | 0.614 | 0.167 | 6.5 | 66.5 |

## First-Five Buckets

### Starter Leverage Buckets
| Bucket | Picks | Strict | Decision-only | Push rate |
| --- | --- | --- | --- | --- |
| `<65` | 84 | 0.548 | 0.657 | 0.167 |
| `65-74` | 26 | 0.500 | 0.591 | 0.154 |
| `75+` | 58 | 0.466 | 0.562 | 0.172 |

### Point Edge Buckets
| Bucket | Picks | Strict | Decision-only | Push rate |
| --- | --- | --- | --- | --- |
| `<8` | 111 | 0.486 | 0.593 | 0.180 |
| `8-11.9` | 32 | 0.531 | 0.630 | 0.156 |
| `12+` | 25 | 0.600 | 0.682 | 0.120 |

### Opponent Snapback Buckets
| Bucket | Picks | Strict | Decision-only | Push rate |
| --- | --- | --- | --- | --- |
| `<40` | 93 | 0.538 | 0.625 | 0.140 |
| `40-49.9` | 26 | 0.538 | 0.667 | 0.192 |
| `50+` | 49 | 0.449 | 0.564 | 0.204 |

## Candidate First-Five Lanes

### Starter-led clean lane

Eligible if `pointEdge >= 8 && starter leverage >= 72 && opponent snapback < 50 && pick top-6 pressure < 40`

| Window | Picks | Strict hit rate | Decision-only hit rate | Push rate | Pushes |
| --- | --- | --- | --- | --- | --- |
| Reserve | 7 | 0.571 | 0.571 | 0.000 | 0 |
| Current | 16 | 0.500 | 0.571 | 0.125 | 2 |
| Combined | 23 | 0.522 | 0.571 | 0.087 | 2 |

Note: This is the first attempt at a true first-five play lane: strong starter window, no obvious bounceback trap, and lower top-order stress.

### Tie / push trap

Flag if `pointEdge < 8 && starter leverage < 72`

| Window | Picks | Strict hit rate | Decision-only hit rate | Push rate | Pushes |
| --- | --- | --- | --- | --- | --- |
| Reserve | 48 | 0.625 | 0.732 | 0.146 | 7 |
| Current | 38 | 0.342 | 0.433 | 0.211 | 8 |
| Combined | 86 | 0.500 | 0.606 | 0.174 | 15 |

Note: This is the simplest tie-prone lane: not enough early edge and not enough starter separation.

### Opponent snapback trap

Flag if `pointEdge >= 8 && opponent snapback >= 50 && opponent loss streak >= 2`

| Window | Picks | Strict hit rate | Decision-only hit rate | Push rate | Pushes |
| --- | --- | --- | --- | --- | --- |
| Reserve | 8 | 0.500 | 0.667 | 0.250 | 2 |
| Current | 13 | 0.538 | 0.700 | 0.231 | 3 |
| Combined | 21 | 0.524 | 0.688 | 0.238 | 5 |

Note: This tests whether first five is overfading bounceback teams in the early innings too.

### Top-order pressure trap

Flag if `pointEdge >= 8 && pick top-6 pressure >= 40 && pick top-6 cold >= 45`

| Window | Picks | Strict hit rate | Decision-only hit rate | Push rate | Pushes |
| --- | --- | --- | --- | --- | --- |
| Reserve | 0 | 0.000 | 0.000 | 0.000 | 0 |
| Current | 3 | 0.667 | 0.667 | 0.000 | 0 |
| Combined | 3 | 0.667 | 0.667 | 0.000 | 0 |

Note: This checks whether our first-five pick is leaning on a stressed top of the order that may stay dead early.

### Series carryover trap

Flag if `pointEdge >= 8 && series game = 2 && pick form pressure >= 55`

| Window | Picks | Strict hit rate | Decision-only hit rate | Push rate | Pushes |
| --- | --- | --- | --- | --- | --- |
| Reserve | 1 | 1.000 | 1.000 | 0.000 | 0 |
| Current | 0 | 0.000 | 0.000 | 0.000 | 0 |
| Combined | 1 | 1.000 | 1.000 | 0.000 | 0 |

Note: This is the same-series, different-state problem specifically for the starter window.

## Offline First-Five Classifier Sketch

### Reserve (`05-10` to `05-15`)

| Lane | Picks | Strict hit rate | Decision-only hit rate | Push rate |
| --- | --- | --- | --- | --- |
| Lean | 13 | 0.692 | 0.692 | 0.000 |
| Watch | 53 | 0.585 | 0.705 | 0.170 |
| Pass | 9 | 0.556 | 0.714 | 0.222 |

### Current (`05-16` to `05-22`)

| Lane | Picks | Strict hit rate | Decision-only hit rate | Push rate |
| --- | --- | --- | --- | --- |
| Lean | 17 | 0.471 | 0.571 | 0.176 |
| Watch | 61 | 0.410 | 0.500 | 0.180 |
| Pass | 15 | 0.533 | 0.667 | 0.200 |

### Combined

| Lane | Picks | Strict hit rate | Decision-only hit rate | Push rate |
| --- | --- | --- | --- | --- |
| Lean | 30 | 0.567 | 0.630 | 0.100 |
| Watch | 114 | 0.491 | 0.596 | 0.175 |
| Pass | 24 | 0.542 | 0.684 | 0.208 |

### Current classifier read

- `Lean` is only provisional. It is cleaner than the raw board in structure, but it is not strong enough yet to promote into live scoring.
- `Watch` is mostly the tie/push lane: not necessarily terrible at decision-only hit rate, but too capital-inefficient to treat as a real edge.
- `Pass` is the real value today. The state layer is better at telling us what early scripts are fragile than at handing us a trustworthy all-green first-five play bucket.

## Takeaways

- First five needs its own environment test: early starter edge, not late bullpen shape.
- Push rate matters. A lane with a decent strict hit rate but too many pushes can still be a bad use of capital if we overbet it.
- The state layer gives us better reasons to pass: bounceback pressure, top-order stress, and same-series carryover can all fight a paper starter edge.
- The goal from here is not more first-five volume. It is a smaller set of cleaner first-five lanes.
