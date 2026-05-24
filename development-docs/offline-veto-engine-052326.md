# MLB Offline Veto Engine

This pass uses graded MLB moneyline data from `2026-05-16` through `2026-05-22` (`93` rows across `7` slate days) to turn the new chaos labels into **research-only veto logic**. The goal is not broader pick tuning; it is to identify when the board should have stopped itself.

## Selected Negative Flags

| Flag | Games | Hit rate |
| --- | --- | --- |
| heavy_favorite_weak_lineup | 3 | 0.000 |
| heavy_favorite_noisy_bullpen | 6 | 0.333 |
| dead_early_risk | 17 | 0.353 |
| cluster_bullpen_trap | 10 | 0.300 |

## Label-Specific Failure Modeling

### Starter Crack Loss

| Rule | Games | Precision | Recall |
| --- | --- | --- | --- |
| Starter command <= 24 | 27 | 0.074 | 0.333 |
| Starter command <= 24 + scoreless first 3 >= 50% | 8 | 0.000 | 0.000 |
| Starter command <= 24 + lineup idx <= 40 | 13 | 0.000 | 0.000 |
| Starter command <= 24 + bullpen chaos >= 45 | 20 | 0.100 | 0.333 |

### Dead Early Loss

| Rule | Games | Precision | Recall |
| --- | --- | --- | --- |
| Lineup idx <= 35 | 35 | 0.229 | 0.421 |
| Lineup idx <= 35 + scoreless first 3 >= 50% | 18 | 0.167 | 0.158 |
| Lineup idx <= 35 + dead-bat traffic >= 30% | 17 | 0.235 | 0.211 |
| Lineup idx <= 35 + traffic-no-conversion >= 35% | 0 | 0.000 | 0.000 |

## Market Veto Checks

### Expensive Favorite Failure

| Rule | Games | Precision | Recall |
| --- | --- | --- | --- |
| Heavy favorite baseline | 18 | 0.444 | 1.000 |
| Heavy favorite + lineup idx <= 25 | 3 | 1.000 | 0.375 |
| Heavy favorite + bullpen chaos >= 50 | 6 | 0.667 | 0.500 |
| Heavy favorite + selected negative flag | 9 | 0.778 | 0.875 |

### Protected Market Dog Lane

| Rule | Games | Precision | Recall |
| --- | --- | --- | --- |
| Market dog baseline | 22 | 0.591 | 1.000 |
| Dog + opponent chaos gap >= 8 | 8 | 1.000 | 0.615 |
| Dog + opponent snapback gap >= 10 | 10 | 0.700 | 0.538 |
| Dog + opponent bullpen gap >= 8 | 5 | 1.000 | 0.385 |

## Combined Offline Engine

| Bucket | Games | Baseline hit | Vetoed | Veto hit | Kept | Kept hit |
| --- | --- | --- | --- | --- | --- | --- |
| All picks | 93 | 0.570 | 32 | 0.344 | 61 | 0.689 |
| 8+ edge | 34 | 0.676 | 11 | 0.364 | 23 | 0.826 |
| 60+ confidence | 27 | 0.667 | 9 | 0.556 | 18 | 0.722 |
| 8+ edge and 60+ confidence | 18 | 0.722 | 6 | 0.500 | 12 | 0.833 |

### 8+ Edge By Split

| Split | Games | Baseline hit | Vetoed | Veto hit | Kept | Kept hit |
| --- | --- | --- | --- | --- | --- | --- |
| current | 34 | 0.676 | 11 | 0.364 | 23 | 0.826 |

### Protected Dog Performance

| Bucket | Games | Hit rate |
| --- | --- | --- |
| All market dogs | 22 | 0.591 |
| Protected dog lane | 8 | 1.000 |
| Other market dogs | 14 | 0.357 |

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
