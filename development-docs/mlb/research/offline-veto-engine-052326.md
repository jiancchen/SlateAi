# MLB Offline Veto Engine

This pass uses graded MLB moneyline data from `2026-05-10` through `2026-05-30` (`278` rows across `21` slate days) to turn the new chaos labels into **research-only veto logic**. The goal is not broader pick tuning; it is to identify when the board should have stopped itself.

## Selected Negative Flags

| Flag | Games | Hit rate |
| --- | --- | --- |
| heavy_favorite_weak_lineup | 9 | 0.333 |
| heavy_favorite_noisy_bullpen | 20 | 0.450 |
| dead_early_risk | 53 | 0.528 |
| cluster_bullpen_trap | 44 | 0.614 |

## Label-Specific Failure Modeling

### Starter Crack Loss

| Rule | Games | Precision | Recall |
| --- | --- | --- | --- |
| Starter command <= 24 | 34 | 0.088 | 0.143 |
| Starter command <= 24 + scoreless first 3 >= 50% | 13 | 0.000 | 0.000 |
| Starter command <= 24 + lineup idx <= 40 | 21 | 0.048 | 0.048 |
| Starter command <= 24 + bullpen chaos >= 45 | 25 | 0.080 | 0.095 |

### Dead Early Loss

| Rule | Games | Precision | Recall |
| --- | --- | --- | --- |
| Lineup idx <= 35 | 110 | 0.164 | 0.367 |
| Lineup idx <= 35 + scoreless first 3 >= 50% | 60 | 0.133 | 0.163 |
| Lineup idx <= 35 + dead-bat traffic >= 30% | 53 | 0.170 | 0.184 |
| Lineup idx <= 35 + traffic-no-conversion >= 35% | 0 | 0.000 | 0.000 |

## Market Veto Checks

### Expensive Favorite Failure

| Rule | Games | Precision | Recall |
| --- | --- | --- | --- |
| Heavy favorite baseline | 56 | 0.429 | 1.000 |
| Heavy favorite + lineup idx <= 25 | 9 | 0.667 | 0.250 |
| Heavy favorite + bullpen chaos >= 50 | 20 | 0.550 | 0.458 |
| Heavy favorite + selected negative flag | 34 | 0.500 | 0.708 |

### Protected Market Dog Lane

| Rule | Games | Precision | Recall |
| --- | --- | --- | --- |
| Market dog baseline | 78 | 0.526 | 1.000 |
| Dog + opponent chaos gap >= 8 | 21 | 0.762 | 0.390 |
| Dog + opponent snapback gap >= 10 | 35 | 0.543 | 0.463 |
| Dog + opponent bullpen gap >= 8 | 22 | 0.591 | 0.317 |

## Combined Offline Engine

| Bucket | Games | Baseline hit | Vetoed | Veto hit | Kept | Kept hit |
| --- | --- | --- | --- | --- | --- | --- |
| All picks | 278 | 0.572 | 110 | 0.555 | 168 | 0.583 |
| 8+ edge | 81 | 0.605 | 32 | 0.594 | 49 | 0.612 |
| 60+ confidence | 91 | 0.604 | 40 | 0.575 | 51 | 0.627 |
| 8+ edge and 60+ confidence | 49 | 0.612 | 23 | 0.565 | 26 | 0.654 |

### 8+ Edge By Split

| Split | Games | Baseline hit | Vetoed | Veto hit | Kept | Kept hit |
| --- | --- | --- | --- | --- | --- | --- |
| current | 58 | 0.638 | 21 | 0.619 | 37 | 0.649 |
| reserve | 23 | 0.522 | 11 | 0.545 | 12 | 0.500 |

### Protected Dog Performance

| Bucket | Games | Hit rate |
| --- | --- | --- |
| All market dogs | 78 | 0.526 |
| Protected dog lane | 21 | 0.762 |
| Other market dogs | 57 | 0.439 |

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
