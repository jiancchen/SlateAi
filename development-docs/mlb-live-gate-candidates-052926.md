# MLB Live Gate Candidates — May 29, 2026

This is a focused overnight audit of **keeper/fade gates** rather than another broad signal recap. The goal is to turn the recent warehouse work into a few live rules that can actually tighten the board.

Sample windows used here:
- prop backtests with Statcast joins: `2026-05-16` through `2026-05-28`
- side picks from settled daily journals: `2026-05-10` through `2026-05-28`
- HR board rows from saved prototype files: `2026-05-16` through `2026-05-28`

## Total Bases candidate gates

| Gate | Hits | Bets | Hit rate |
| --- | --- | --- | --- |
| Baseline TB overs | 134 | 430 | 31.2% |
| High 7d xSLG + high 7d hard-hit | 24 | 51 | 47.1% |
| High 7d xSLG + hard-hit + barrel | 22 | 46 | 47.8% |
| Low 7d xSLG + high cold-streak index | 25 | 89 | 28.1% |

Takeaways:
- `TB` is still the cleanest place to use the rolling Statcast layer live.
- The best current gate is still the simple contact-damage stack:
  - **high 7d xSLG**
  - **high 7d hard-hit%**
  - with an optional barrel confirmation
- The cleanest fade is:
  - **low 7d xSLG**
  - plus a **high cold-streak index**

Practical use:
- keep `TB` overs on the live board only when the hitter clears the xSLG + hard-hit gate
- auto-demote `TB` overs when the hitter is both cold and low-xSLG

## Singles candidate gates

| Gate | Hits | Bets | Hit rate |
| --- | --- | --- | --- |
| Baseline singles overs | 105 | 288 | 36.5% |
| High 7d xBA + high 7d sweet-spot | 17 | 37 | 45.9% |
| Low 7d xBA + high whiff | 6 | 24 | 25.0% |

Takeaways:
- `Singles` is still weaker than `TB`, but there is one usable positive lane:
  - **high 7d xBA**
  - **high 7d sweet-spot%**
- The cleanest fade is the opposite shape:
  - **low 7d xBA**
  - **high recent whiff**

Practical use:
- use singles only when the hitter looks like a real ball-in-play quality lane
- avoid singles overs when the profile is weak xBA plus swing-and-miss

## Home run candidate gates

| Gate | Hits | Bets | Hit rate |
| --- | --- | --- | --- |
| Baseline HR board | 24 | 120 | 20.0% |
| High opposing pitcher HR/9 | 8 | 31 | 25.8% |
| Rows with archived Statcast trend block | 0 | 0 | 0.0% |

Takeaways:
- We can still backtest the broad HR board, but the archived prototype files do **not** yet preserve a full rolling Statcast trend block for enough older days.
- That means the currently testable HR gates are still mostly:
  - opposing pitcher `HR/9`
  - park context
- `Pitcher HR/9` remains a modest positive filter.
- Park-only hype is still not enough to trust by itself.

Practical use:
- keep HR in **filter mode**, not green-light mode
- only promote a bomb lane when a live file has the newer Statcast context present **and** the pitcher damage context agrees

## Side dead-bat / dead-early candidate gates

| Gate | Hits | Bets | Hit rate |
| --- | --- | --- | --- |
| Baseline side picks | 143 | 246 | 58.1% |
| Dead-early-risk sides | 14 | 25 | 56.0% |
| No dead-early-risk sides | 98 | 163 | 60.1% |
| Dead-early-risk sides (F5) | 11 | 25 | 44.0% |
| Quiet pick first-5 shape (pickQuietFirst5 >= 0.5) | 16 | 30 | 53.3% |
| Low-conversion + dead-early-risk (F5) | 10 | 23 | 43.5% |

Takeaways:
- `DeadEarlyRisk` is more useful as an `F5 caution` flag than as a full-game auto-veto.
- The ugliest side bucket is still the one that combines:
  - weak lineup conversion
  - dead-early risk
- Quiet first-five shapes also underperform baseline.

Practical use:
- haircut `F5` confidence first when dead-early risk is present
- be especially skeptical when dead-early risk shows up with low lineup conversion
- do not rely on side strength alone in quiet-first-five shapes

## Bottom line

If the board has to tighten right now, the best live rules are:

1. `TB`: keep only hitters with **high 7d xSLG + high 7d hard-hit%**
2. `TB`: fade hitters with **low 7d xSLG + high cold-streak**
3. `Singles`: keep only hitters with **high 7d xBA + high sweet-spot%**
4. `Singles`: fade **low xBA + high whiff**
5. `HR`: keep in filter mode until the archived Statcast trend block is deeper
6. `F5`: haircut or pass **dead-early-risk + low-conversion** side picks
