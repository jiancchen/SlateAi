# MLB Tier 3 Feature Research — May 23, 2026

## Scope
This pass opens the first Tier 3 warehouse lane without touching the live model yet. The target questions were:

1. What happens on a reliever's first batter after entry?
2. How different do starters look once they hit a third trip through the order?

Dataset coverage across `2026-05-09` through `2026-05-22`:

- Story-signal games: `187`
- Plate appearances: `14,037`
- Pitch events: `63,561`

## Early read
- The reliever-entry lane is already useful because it lets us distinguish between arms who enter with strike-one / clean-command habits and arms who immediately spray balls or allow baserunners.
- The third-time-through lane is also promising because it gives us a cleaner reason to cap full-game sides that are really being carried by an early starter edge.
- Both features are much more about `when the game breaks` than about average talent, which is exactly the next layer we wanted.

## Reliever first-batter command
League baseline on the first batter after a reliever enters:

- First-pitch ball rate: `37.4%`
- Overall ball rate in that first plate appearance: `30.6%`
- Reach rate: `32.2%`
- Free-pass rate: `11.3%`
- Scoring-play rate: `8.1%`

Highest-risk reliever first-batter command profiles so far:

| Pitcher | Entries | 1st-pitch ball | Ball rate | Reach | Free pass | Score play | Command risk |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Wyatt Mills | 4 | 100.0% | 71.7% | 100.0% | 75.0% | 0.0% | 79.4 |
| Matt Pushard | 3 | 66.7% | 72.2% | 66.7% | 66.7% | 0.0% | 63.1 |
| Yariel Rodríguez | 3 | 100.0% | 55.0% | 66.7% | 33.3% | 0.0% | 62.3 |
| Justin Topa | 3 | 66.7% | 65.6% | 66.7% | 66.7% | 0.0% | 61.0 |
| Luinder Avila | 3 | 66.7% | 63.2% | 66.7% | 66.7% | 0.0% | 60.2 |
| Brent Headrick | 6 | 83.3% | 45.3% | 66.7% | 16.7% | 33.3% | 59.5 |
| George Soriano | 5 | 80.0% | 51.3% | 60.0% | 20.0% | 40.0% | 58.8 |
| Tejay Antone | 5 | 80.0% | 59.7% | 60.0% | 40.0% | 0.0% | 57.9 |
| Tyler Schweitzer | 3 | 66.7% | 44.4% | 66.7% | 33.3% | 33.3% | 56.9 |
| Nick Mears | 4 | 75.0% | 43.8% | 100.0% | 25.0% | 0.0% | 56.5 |
| Riley O'Brien | 5 | 60.0% | 56.7% | 80.0% | 40.0% | 0.0% | 54.9 |
| Peyton Pallette | 4 | 75.0% | 52.0% | 75.0% | 25.0% | 0.0% | 54.6 |

## Third-time-through trouble
League shape by trip bucket:

| Trip | PA | Reach | Score play | Run delta | HR rate |
| --- | --- | --- | --- | --- | --- |
| first | 3260 | 29.8% | 6.9% | 0.090 | 3.1% |
| second | 3074 | 31.5% | 8.2% | 0.113 | 2.9% |
| third | 1752 | 32.9% | 8.9% | 0.119 | 2.9% |

Pitchers with the sharpest third-time-through exposure so far:

| Pitcher | 3rd-trip PA | 3rd-trip reach | Reach delta | 3rd-trip score play | Score-play delta | 3rd-trip HR |
| --- | --- | --- | --- | --- | --- | --- |
| Cristopher Sánchez | 33 | 27.3% | +10.6 pts | 0.0% | +0.0 pts | 0.0% |
| Justin Wrobleski | 30 | 26.7% | -8.5 pts | 10.0% | +0.7 pts | 6.7% |
| Merrill Kelly | 30 | 13.3% | -12.6 pts | 0.0% | -9.3 pts | 0.0% |
| Braxton Ashcraft | 27 | 22.2% | -5.6 pts | 3.7% | -1.9 pts | 3.7% |
| Gavin Williams | 25 | 28.0% | -3.5 pts | 8.0% | +0.6 pts | 0.0% |
| José Soriano | 25 | 48.0% | +33.2 pts | 16.0% | +12.3 pts | 0.0% |
| Tanner Bibee | 25 | 36.0% | +17.5 pts | 8.0% | +2.4 pts | 0.0% |
| Bryce Elder | 24 | 37.5% | +19.0 pts | 8.3% | +6.5 pts | 8.3% |
| Cade Cavalli | 24 | 33.3% | +3.7 pts | 8.3% | +2.8 pts | 8.3% |
| Eduardo Rodriguez | 24 | 25.0% | -0.9 pts | 0.0% | -7.4 pts | 0.0% |
| Luis Severino | 24 | 45.8% | +19.9 pts | 8.3% | +0.9 pts | 4.2% |
| Jack Kochanowicz | 23 | 39.1% | +0.2 pts | 21.7% | +12.5 pts | 4.3% |

## What this suggests
1. `Reliever first-batter command` is a real candidate for a late-game volatility feature.
   Teams facing high-risk first-entry relievers should get more comeback / over / late-prop live-ness.
2. `Third-time-through trouble` should eventually feed both:
   - full-game side confidence
   - first-five vs full-game split confidence
3. Neither feature should go live as a hard pass rule yet. Both need:
   - more dates
   - opponent-adjustment
   - validation against reserve and current windows

## Recommended next moves
1. Store a compact per-pitcher Tier 3 lookup for:
   - reliever first-batter command risk
   - starter third-time-through penalty
2. Add these only as offline backtest overlays first.
3. Promote to live scoring only if they improve both reserve and current windows without overfiring.
