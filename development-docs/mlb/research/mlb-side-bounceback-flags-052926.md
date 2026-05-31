# MLB Side Bounceback / Dead-Bat Flags

This pass tests the new bounceback buckets directly against historical MLB moneyline picks from `2026-05-10` through `2026-05-28`.

- total side picks: `245`
- baseline full-game hit rate: `58.4%`
- `60+` confidence baseline: `57.3%` on `82` picks
- `8+` edge baseline: `59.7%` on `77` picks

## Cohort Performance

| Flag | Picks | FG hit rate | Delta vs base |
| --- | --- | --- | --- |
| Pick is loss but not dead | 45 | 60.0% | +1.6 pts |
| Opponent is loss but not dead | 33 | 57.6% | -0.8 pts |
| Pick is slumping loser | 19 | 63.2% | +4.8 pts |
| Opponent is slumping loser | 39 | 69.2% | +10.9 pts |
| Pick is high snapback, low form | 4 | 25.0% | -33.4 pts |
| Opponent is high snapback, low form | 6 | 66.7% | +8.3 pts |

## High-Confidence (`60+`) Slice

| Flag | Picks | FG hit rate |
| --- | --- | --- |
| Pick is loss but not dead | 16 | 56.2% |
| Opponent is loss but not dead | 11 | 45.5% |
| Pick is slumping loser | 3 | 33.3% |
| Opponent is slumping loser | 8 | 87.5% |
| Pick is high snapback, low form | 2 | 0.0% |
| Opponent is high snapback, low form | 2 | 50.0% |

## High-Edge (`8+`) Slice

| Flag | Picks | FG hit rate |
| --- | --- | --- |
| Pick is loss but not dead | 18 | 55.6% |
| Opponent is loss but not dead | 10 | 50.0% |
| Pick is slumping loser | 1 | 100.0% |
| Opponent is slumping loser | 19 | 73.7% |
| Pick is high snapback, low form | 0 | 0.0% |
| Opponent is high snapback, low form | 1 | 100.0% |

## Read

- `Opponent slumping loser` is the cleanest positive signal here. The side hit rate rises to `69.2%`, and in the `60+` confidence slice it jumps to `87.5%`.
- `Pick slumping loser` is **not** a blanket fade in this pick-only sample. It still hit `63.2%` overall, but the `60+` confidence subset dropped to `33.3%` on a very small sample. That makes it a caution flag, not an auto-veto.
- `Loss but not dead` behaves more like resistance. Pick teams in that bucket hit `60.0%`, while opponents in that bucket hold the side hit rate down at `57.6%`.
- `Pick high snapback, low form` is still the cleanest danger flag, even in a tiny sample, at `25.0%`.
- `Opponent high snapback, low form` is not a clean fade bucket. It still needs to be treated as chaos / resistance, not automatic attack, with a `66.7%` side hit rate in this sample.

## Next step

- Promote `opponent slumping loser` as a direct positive selector for side / NRFI / F5-under style research lanes.
- Treat `pick slumping loser` as a caution flag that bites harder when the board is already overconfident.
- Keep `loss but not dead` as a resistance flag so the board stops overfading competitive losers.
- Keep `pick high snapback, low form` as a small-sample but high-priority danger bucket.
