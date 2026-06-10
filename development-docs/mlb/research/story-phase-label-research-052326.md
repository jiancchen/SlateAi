# MLB Story / Phase Label Research

This pass looks at the new label tables and asks a better question than `did the pick lose?`: **how did the game break, and what shapes were live before first pitch?**

## Label Counts

| Phase path label | Rows |
| --- | --- |
| starter_crack_loss | 34 |
| dead_early_loss | 70 |
| blew_lead_after5 | 26 |
| starter_carried | 31 |
| jumped_early_hold | 49 |

| Market label | Rows |
| --- | --- |
| expensive_favorite_failed | 14 |
| underdog_beat_market | 23 |
| favorite_held | 55 |
| market_neutral | 40 |

## Phase Label Shapes

| Phase label | Rows | Lineup idx | Scoreless3 | Quiet5 | Starter cmd | Bullpen chaos | Opp chaos gap | Opp lineup gap | Opp snapback gap |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| starter_crack_loss | 34 | 36.0 | 0.449 | 0.331 | 48.8 | 47.7 | -1.2 | 4.7 | -3.7 |
| dead_early_loss | 70 | 32.7 | 0.441 | 0.355 | 46.0 | 48.9 | -1.1 | 4.6 | -3.8 |
| blew_lead_after5 | 26 | 36.4 | 0.471 | 0.413 | 47.2 | 46.6 | -2.4 | 0.6 | 1.9 |
| starter_carried | 31 | 36.9 | 0.419 | 0.335 | 48.7 | 48.2 | -1.1 | -1.1 | 2.5 |
| jumped_early_hold | 49 | 35.3 | 0.467 | 0.436 | 45.1 | 44.0 | 3.2 | -0.8 | -1.1 |

## Market / Phase Shapes

| Label | Rows | Fav prob | Pick chaos | Opp chaos gap | Pick lineup | Pick lineup edge | Pick bullpen | Opp bullpen gap | Opp snapback gap |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| expensive_favorite_failed | 14 | 0.629 | 56.5 | -0.0 | 37.6 | 10.4 | 47.9 | -3.6 | -7.3 |
| underdog_beat_market | 23 | 0.576 | 56.0 | 3.6 | 42.4 | 9.6 | 45.6 | 1.7 | 0.7 |
| first5_cleaner | 12 | 0.568 | 54.6 | 6.2 | 36.8 | 3.5 | 46.2 | -1.7 | 8.0 |
| full_game_cleaner | 31 | 0.561 | 54.2 | 5.8 | 43.0 | 9.6 | 46.4 | 2.7 | 4.4 |

## Candidate Market Triggers

### Expensive Favorite Failure

| Rule | Games | Precision | Recall |
| --- | --- | --- | --- |
| Heavy favorite baseline | 36 | 0.389 | 1.000 |
| Heavy favorite + lineup index <= 25 | 5 | 0.800 | 0.286 |
| Heavy favorite + bullpen chaos >= 50 | 13 | 0.462 | 0.429 |
| Heavy favorite + quiet first5 >= 50% | 13 | 0.385 | 0.357 |

### Underdog Beat Market

| Rule | Games | Precision | Recall |
| --- | --- | --- | --- |
| Market dog baseline | 37 | 0.622 | 1.000 |
| Dog + opponent chaos gap >= 8 | 13 | 0.923 | 0.522 |
| Dog + opponent snapback gap >= 10 | 17 | 0.706 | 0.522 |
| Dog + lineup edge >= 10 | 16 | 0.625 | 0.435 |
| Dog + opponent bullpen gap >= 8 | 11 | 0.727 | 0.348 |

## Read

- `starter_crack_loss` and `dead_early_loss` are much more about **weak offensive shape** than broad team strength. Their lineup-conversion indexes are low, and their scoreless-first-3 rates are already very high before the game starts.
- `starter_crack_loss` also carries a noticeably worse starter command-break profile than `starter_carried`, which is exactly the kind of phase-specific difference we were missing before.
- `jumped_early_hold` is the opposite shape: much stronger lineup conversion and much less early deadness. That tells us early-game confidence should come more from scoring shape than generic favorite strength.
- `expensive_favorite_failed` is still a small sample, but the first clean warning is this: **heavy favorites with weak lineup conversion or noisy bullpen shape are dangerous**.
- The best early market-win finding is stronger: when we took a **market underdog** and the opponent carried a much louder chaos vector, those dogs were legitimately live. That is a real candidate mispricing lane, not just narrative.
- `first5_cleaner` still does not have a strong enough label rule yet. The label table is useful, but we do not have a trustworthy first-five trigger family from it yet.

## Next Move

- Turn the heavy-favorite failure triggers into research-only veto flags.
- Turn the underdog-chaos trigger into a protected market-dog lane and test it against more slates.
- Build the next research pass specifically around `starter_crack_loss` and `dead_early_loss`, because those are the two labels most directly tied to today’s ugly misses.
