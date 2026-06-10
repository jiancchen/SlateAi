# MLB Offline Veto Engine

This pass uses graded MLB moneyline data from `2026-05-10` through `2026-06-07` (`383` rows across `29` slate days) to turn the new chaos labels into **research-only veto logic**. The goal is not broader pick tuning; it is to identify when the board should have stopped itself.

## Selected Negative Flags

| Flag | Games | Hit rate |
| --- | --- | --- |
| heavy_favorite_weak_lineup | 8 | 0.375 |
| heavy_favorite_noisy_bullpen | 19 | 0.632 |
| dead_early_risk | 57 | 0.544 |
| cluster_bullpen_trap | 49 | 0.551 |

## Label-Specific Failure Modeling

### Starter Crack Loss

| Rule | Games | Precision | Recall |
| --- | --- | --- | --- |
| Starter command <= 24 | 71 | 0.056 | 0.118 |
| Starter command <= 24 + scoreless first 3 >= 50% | 23 | 0.043 | 0.029 |
| Starter command <= 24 + lineup idx <= 40 | 33 | 0.061 | 0.059 |
| Starter command <= 24 + bullpen chaos >= 45 | 49 | 0.041 | 0.059 |

### Dead Early Loss

| Rule | Games | Precision | Recall |
| --- | --- | --- | --- |
| Lineup idx <= 35 | 142 | 0.099 | 0.280 |
| Lineup idx <= 35 + scoreless first 3 >= 50% | 88 | 0.091 | 0.160 |
| Lineup idx <= 35 + dead-bat traffic >= 30% | 57 | 0.105 | 0.120 |
| Lineup idx <= 35 + traffic-no-conversion >= 35% | 0 | 0.000 | 0.000 |

## Market Veto Checks

### Expensive Favorite Failure

| Rule | Games | Precision | Recall |
| --- | --- | --- | --- |
| Heavy favorite baseline | 54 | 0.352 | 1.000 |
| Heavy favorite + lineup idx <= 25 | 8 | 0.625 | 0.263 |
| Heavy favorite + bullpen chaos >= 50 | 19 | 0.368 | 0.368 |
| Heavy favorite + selected negative flag | 32 | 0.406 | 0.684 |

### Protected Market Dog Lane

| Rule | Games | Precision | Recall |
| --- | --- | --- | --- |
| Market dog baseline | 94 | 0.543 | 1.000 |
| Dog + opponent chaos gap >= 8 | 24 | 0.833 | 0.392 |
| Dog + opponent snapback gap >= 10 | 40 | 0.625 | 0.490 |
| Dog + opponent bullpen gap >= 8 | 22 | 0.591 | 0.255 |

## Combined Offline Engine

| Bucket | Games | Baseline hit | Vetoed | Veto hit | Kept | Kept hit |
| --- | --- | --- | --- | --- | --- | --- |
| All picks | 383 | 0.564 | 121 | 0.562 | 262 | 0.565 |
| 8+ edge | 52 | 0.596 | 17 | 0.647 | 35 | 0.571 |
| 60+ confidence | 53 | 0.604 | 19 | 0.684 | 34 | 0.559 |
| 8+ edge and 60+ confidence | 35 | 0.629 | 14 | 0.714 | 21 | 0.571 |

### 8+ Edge By Split

| Split | Games | Baseline hit | Vetoed | Veto hit | Kept | Kept hit |
| --- | --- | --- | --- | --- | --- | --- |
| current | 52 | 0.596 | 17 | 0.647 | 35 | 0.571 |
| reserve | 0 | 0.000 | 0 | 0.000 | 0 | 0.000 |

### Protected Dog Performance

| Bucket | Games | Hit rate |
| --- | --- | --- |
| All market dogs | 94 | 0.543 |
| Protected dog lane | 24 | 0.833 |
| Other market dogs | 70 | 0.443 |

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
