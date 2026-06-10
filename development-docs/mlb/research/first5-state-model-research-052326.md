# MLB First-Five State Model Research - 2026-05-23

This is a separate first-five research lane built on the new state snapshots, not the old one-size-fits-all full-game composite. Ties are treated as pushes in the decision-only read, which is the right way to judge first-five behavior.

## Baseline First-Five Read

| Window | Picks | Strict hit rate | Decision-only hit rate | Push rate | Avg edge | Avg starter leverage |
| --- | --- | --- | --- | --- | --- | --- |
| Reserve (`05-10` to `05-15`) | 75 | 0.600 | 0.703 | 0.147 | 6.3 | 59.9 |
| Current (`05-16` to `05-22`) | 93 | 0.452 | 0.553 | 0.183 | 3.4 | 32.9 |
| Combined | 168 | 0.518 | 0.621 | 0.167 | 4.7 | 45.0 |

## First-Five Buckets

### Starter Leverage Buckets
| Bucket | Picks | Strict | Decision-only | Push rate |
| --- | --- | --- | --- | --- |
| `<65` | 116 | 0.534 | 0.653 | 0.181 |
| `65-74` | 21 | 0.476 | 0.556 | 0.143 |
| `75+` | 31 | 0.484 | 0.556 | 0.129 |

### Point Edge Buckets
| Bucket | Picks | Strict | Decision-only | Push rate |
| --- | --- | --- | --- | --- |
| `<8` | 129 | 0.488 | 0.600 | 0.186 |
| `8-11.9` | 21 | 0.571 | 0.632 | 0.095 |
| `12+` | 18 | 0.667 | 0.750 | 0.111 |

### Opponent Snapback Buckets
| Bucket | Picks | Strict | Decision-only | Push rate |
| --- | --- | --- | --- | --- |
| `<40` | 98 | 0.531 | 0.619 | 0.143 |
| `40-49.9` | 24 | 0.583 | 0.737 | 0.208 |
| `50+` | 46 | 0.457 | 0.568 | 0.196 |

## Candidate First-Five Lanes

### Starter-led clean lane

Eligible if `pointEdge >= 8 && starter leverage >= 72 && opponent snapback < 50 && pick top-6 pressure < 40`

| Window | Picks | Strict hit rate | Decision-only hit rate | Push rate | Pushes |
| --- | --- | --- | --- | --- | --- |
| Reserve | 7 | 0.571 | 0.571 | 0.000 | 0 |
| Current | 10 | 0.500 | 0.556 | 0.100 | 1 |
| Combined | 17 | 0.529 | 0.562 | 0.059 | 1 |

Note: This is the first attempt at a true first-five play lane: strong starter window, no obvious bounceback trap, and lower top-order stress.

### Tie / push trap

Flag if `pointEdge < 8 && starter leverage < 72`

| Window | Picks | Strict hit rate | Decision-only hit rate | Push rate | Pushes |
| --- | --- | --- | --- | --- | --- |
| Reserve | 48 | 0.625 | 0.732 | 0.146 | 7 |
| Current | 69 | 0.420 | 0.537 | 0.217 | 15 |
| Combined | 117 | 0.504 | 0.621 | 0.188 | 22 |

Note: This is the simplest tie-prone lane: not enough early edge and not enough starter separation.

### Opponent snapback trap

Flag if `pointEdge >= 8 && opponent snapback >= 50 && opponent loss streak >= 2`

| Window | Picks | Strict hit rate | Decision-only hit rate | Push rate | Pushes |
| --- | --- | --- | --- | --- | --- |
| Reserve | 8 | 0.500 | 0.667 | 0.250 | 2 |
| Current | 4 | 0.750 | 1.000 | 0.250 | 1 |
| Combined | 12 | 0.583 | 0.778 | 0.250 | 3 |

Note: This tests whether first five is overfading bounceback teams in the early innings too.

### Top-order pressure trap

Flag if `pointEdge >= 8 && pick top-6 pressure >= 40 && pick top-6 cold >= 45`

| Window | Picks | Strict hit rate | Decision-only hit rate | Push rate | Pushes |
| --- | --- | --- | --- | --- | --- |
| Reserve | 1 | 1.000 | 1.000 | 0.000 | 0 |
| Current | 2 | 0.500 | 0.500 | 0.000 | 0 |
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
| Lean | 14 | 0.714 | 0.714 | 0.000 |
| Watch | 52 | 0.577 | 0.698 | 0.173 |
| Pass | 9 | 0.556 | 0.714 | 0.222 |

### Current (`05-16` to `05-22`)

| Lane | Picks | Strict hit rate | Decision-only hit rate | Push rate |
| --- | --- | --- | --- | --- |
| Lean | 10 | 0.500 | 0.556 | 0.100 |
| Watch | 77 | 0.429 | 0.532 | 0.195 |
| Pass | 6 | 0.667 | 0.800 | 0.167 |

### Combined

| Lane | Picks | Strict hit rate | Decision-only hit rate | Push rate |
| --- | --- | --- | --- | --- |
| Lean | 24 | 0.625 | 0.652 | 0.042 |
| Watch | 129 | 0.488 | 0.600 | 0.186 |
| Pass | 15 | 0.600 | 0.750 | 0.200 |

### Current classifier read

- `Lean` is only provisional. It is cleaner than the raw board in structure, but it is not strong enough yet to promote into live scoring.
- `Watch` is mostly the tie/push lane: not necessarily terrible at decision-only hit rate, but too capital-inefficient to treat as a real edge.
- `Pass` is the real value today. The state layer is better at telling us what early scripts are fragile than at handing us a trustworthy all-green first-five play bucket.

## Takeaways

- First five needs its own environment test: early starter edge, not late bullpen shape.
- Push rate matters. A lane with a decent strict hit rate but too many pushes can still be a bad use of capital if we overbet it.
- The state layer gives us better reasons to pass: bounceback pressure, top-order stress, and same-series carryover can all fight a paper starter edge.
- The goal from here is not more first-five volume. It is a smaller set of cleaner first-five lanes.
