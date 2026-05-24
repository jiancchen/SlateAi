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
| expensive_favorite_failed | 8 |
| underdog_beat_market | 13 |
| favorite_held | 29 |
| market_neutral | 24 |

## Phase Label Shapes

| Phase label | Rows | Lineup idx | Scoreless3 | Quiet5 | Starter cmd | Bullpen chaos | Opp chaos gap | Opp lineup gap | Opp snapback gap |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| starter_crack_loss | 34 | 42.6 | 0.695 | 0.331 | 20.3 | 43.0 | -0.6 | 2.6 | -3.5 |
| dead_early_loss | 70 | 34.6 | 0.637 | 0.368 | 26.3 | 46.7 | -0.7 | 5.6 | -4.3 |
| blew_lead_after5 | 26 | 42.4 | 0.639 | 0.428 | 32.6 | 46.7 | -2.6 | -1.8 | 1.6 |
| starter_carried | 31 | 37.2 | 0.645 | 0.335 | 22.3 | 43.7 | -0.5 | 3.1 | 2.5 |
| jumped_early_hold | 49 | 39.3 | 0.622 | 0.454 | 29.9 | 42.6 | 2.2 | -3.6 | -0.5 |

## Market / Phase Shapes

| Label | Rows | Fav prob | Pick chaos | Opp chaos gap | Pick lineup | Pick lineup edge | Pick bullpen | Opp bullpen gap | Opp snapback gap |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| expensive_favorite_failed | 8 | 0.623 | 56.1 | -2.6 | 31.1 | 2.7 | 49.9 | -13.4 | -5.5 |
| underdog_beat_market | 13 | 0.575 | 56.5 | 4.9 | 43.8 | 9.9 | 46.6 | 3.4 | 9.2 |
| first5_cleaner | 7 | 0.574 | 53.7 | 4.9 | 36.5 | 2.2 | 46.5 | -0.8 | 13.9 |
| full_game_cleaner | 19 | 0.545 | 52.5 | 8.1 | 45.3 | 13.2 | 45.0 | 5.9 | 15.5 |

## Candidate Market Triggers

### Expensive Favorite Failure

| Rule | Games | Precision | Recall |
| --- | --- | --- | --- |
| Heavy favorite baseline | 18 | 0.444 | 1.000 |
| Heavy favorite + lineup index <= 25 | 3 | 1.000 | 0.375 |
| Heavy favorite + bullpen chaos >= 50 | 6 | 0.667 | 0.500 |
| Heavy favorite + quiet first5 >= 50% | 5 | 0.400 | 0.250 |

### Underdog Beat Market

| Rule | Games | Precision | Recall |
| --- | --- | --- | --- |
| Market dog baseline | 22 | 0.591 | 1.000 |
| Dog + opponent chaos gap >= 8 | 8 | 1.000 | 0.615 |
| Dog + opponent snapback gap >= 10 | 10 | 0.700 | 0.538 |
| Dog + lineup edge >= 10 | 8 | 0.750 | 0.462 |
| Dog + opponent bullpen gap >= 8 | 5 | 1.000 | 0.385 |

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
