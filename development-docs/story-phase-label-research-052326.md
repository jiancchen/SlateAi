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
| expensive_favorite_failed | 15 |
| underdog_beat_market | 26 |
| favorite_held | 51 |
| market_neutral | 36 |

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
| expensive_favorite_failed | 15 | 0.631 | 56.4 | 1.0 | 37.7 | 8.6 | 47.2 | -2.3 | 0.2 |
| underdog_beat_market | 26 | 0.575 | 58.2 | 1.5 | 43.0 | 9.4 | 46.4 | 0.8 | 1.0 |
| first5_cleaner | 14 | 0.571 | 55.7 | 4.8 | 38.5 | 6.1 | 46.0 | -0.2 | 13.1 |
| full_game_cleaner | 29 | 0.559 | 54.6 | 5.5 | 43.6 | 10.0 | 46.0 | 2.7 | 10.0 |

## Candidate Market Triggers

### Expensive Favorite Failure

| Rule | Games | Precision | Recall |
| --- | --- | --- | --- |
| Heavy favorite baseline | 37 | 0.405 | 1.000 |
| Heavy favorite + lineup index <= 25 | 5 | 0.800 | 0.267 |
| Heavy favorite + bullpen chaos >= 50 | 13 | 0.462 | 0.400 |
| Heavy favorite + quiet first5 >= 50% | 13 | 0.385 | 0.333 |

### Underdog Beat Market

| Rule | Games | Precision | Recall |
| --- | --- | --- | --- |
| Market dog baseline | 44 | 0.591 | 1.000 |
| Dog + opponent chaos gap >= 8 | 14 | 0.857 | 0.462 |
| Dog + opponent snapback gap >= 10 | 20 | 0.600 | 0.462 |
| Dog + lineup edge >= 10 | 20 | 0.550 | 0.423 |
| Dog + opponent bullpen gap >= 8 | 14 | 0.714 | 0.385 |

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
