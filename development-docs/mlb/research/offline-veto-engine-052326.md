# MLB Offline Veto Engine

This pass uses graded MLB moneyline data from `2026-05-10` through `2026-05-28` (`248` rows across `19` slate days) to turn the new chaos labels into **research-only veto logic**. The goal is not broader pick tuning; it is to identify when the board should have stopped itself.

## Selected Negative Flags

| Flag | Games | Hit rate |
| --- | --- | --- |
| heavy_favorite_weak_lineup | 7 | 0.286 |
| heavy_favorite_noisy_bullpen | 17 | 0.412 |
| dead_early_risk | 45 | 0.556 |
| cluster_bullpen_trap | 40 | 0.625 |

## Label-Specific Failure Modeling

### Starter Crack Loss

| Rule | Games | Precision | Recall |
| --- | --- | --- | --- |
| Starter command <= 24 | 29 | 0.069 | 0.111 |
| Starter command <= 24 + scoreless first 3 >= 50% | 12 | 0.000 | 0.000 |
| Starter command <= 24 + lineup idx <= 40 | 16 | 0.000 | 0.000 |
| Starter command <= 24 + bullpen chaos >= 45 | 21 | 0.048 | 0.056 |

### Dead Early Loss

| Rule | Games | Precision | Recall |
| --- | --- | --- | --- |
| Lineup idx <= 35 | 97 | 0.155 | 0.333 |
| Lineup idx <= 35 + scoreless first 3 >= 50% | 53 | 0.151 | 0.178 |
| Lineup idx <= 35 + dead-bat traffic >= 30% | 45 | 0.178 | 0.178 |
| Lineup idx <= 35 + traffic-no-conversion >= 35% | 0 | 0.000 | 0.000 |

## Market Veto Checks

### Expensive Favorite Failure

| Rule | Games | Precision | Recall |
| --- | --- | --- | --- |
| Heavy favorite baseline | 52 | 0.423 | 1.000 |
| Heavy favorite + lineup idx <= 25 | 7 | 0.714 | 0.227 |
| Heavy favorite + bullpen chaos >= 50 | 17 | 0.588 | 0.455 |
| Heavy favorite + selected negative flag | 31 | 0.516 | 0.727 |

### Protected Market Dog Lane

| Rule | Games | Precision | Recall |
| --- | --- | --- | --- |
| Market dog baseline | 65 | 0.585 | 1.000 |
| Dog + opponent chaos gap >= 8 | 20 | 0.800 | 0.421 |
| Dog + opponent snapback gap >= 10 | 30 | 0.600 | 0.474 |
| Dog + opponent bullpen gap >= 8 | 18 | 0.667 | 0.316 |

## Combined Offline Engine

| Bucket | Games | Baseline hit | Vetoed | Veto hit | Kept | Kept hit |
| --- | --- | --- | --- | --- | --- | --- |
| All picks | 248 | 0.589 | 97 | 0.567 | 151 | 0.603 |
| 8+ edge | 77 | 0.597 | 29 | 0.586 | 48 | 0.604 |
| 60+ confidence | 80 | 0.588 | 34 | 0.559 | 46 | 0.609 |
| 8+ edge and 60+ confidence | 46 | 0.609 | 21 | 0.571 | 25 | 0.640 |

### 8+ Edge By Split

| Split | Games | Baseline hit | Vetoed | Veto hit | Kept | Kept hit |
| --- | --- | --- | --- | --- | --- | --- |
| current | 54 | 0.630 | 18 | 0.611 | 36 | 0.639 |
| reserve | 23 | 0.522 | 11 | 0.545 | 12 | 0.500 |

### Protected Dog Performance

| Bucket | Games | Hit rate |
| --- | --- | --- |
| All market dogs | 65 | 0.585 |
| Protected dog lane | 20 | 0.800 |
| Other market dogs | 45 | 0.489 |

## Read

- `starter_crack_loss` still matters as a target label, but this first pass did **not** find a promotable veto trigger for it yet. That is useful information: we still need better starter-phase features there.
- `dead_early_loss` is already more actionable: low lineup conversion plus real dead-bat traffic is the kind of lane we kept missing while still trusting the better paper team.
- The heavy-favorite veto logic is finally concrete. Weak lineup conversion and noisy bullpen shape are not just warning text anymore; they define an offline danger bucket we can measure.
- `market dog + opponent chaos gap` still looks like the cleanest protected dog lane. That is a better use of the chaos model than trying to make every favorite edge look smarter.
- The combined veto set is still research-only, but it is already better framed as **pick suppression** than pick ranking. That is exactly the direction the chaos stack needs.

## Next Move

- Promote these veto flags into a daily offline scoring artifact so every game gets a `veto count` before any side is considered playable.
- Keep `starter_crack_loss` and `dead_early_loss` as the two main failure labels for the next feature wave.
- Do not widen the live pick board yet. The value here is in removing bad sides first.
