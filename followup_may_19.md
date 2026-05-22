# May 19 Follow-Up

## Snapshot
- MLB full-game side board: `11-4`
- MLB first-5 board: `8-7`
- MLB HR board: `0-for-12`
- This was one of the better moneyline days in the current archive, but the HR layer still completely missed the actual homer distribution.

## What Went Right
- The MLB side board held up well overall.
- The card found `11` winners on a `15`-game slate.
- The moneyline board was materially better than the HR board, which is important because it shows the side model and the player-prop model are not moving together.

## What Went Wrong
- The side misses were:
  - `Blue Jays @ Yankees`
  - `Astros @ Twins`
  - `Giants @ Diamondbacks`
  - `White Sox @ Mariners`
- The HR board missed all `12` tracked bats.

## Read On The Day
This was a good example of the current split inside the model:
- side logic can still be useful
- HR logic is still far too narrow and too concentrated in a few names

The archive should treat May 19 as:
- a strong side day
- a poor prop day

Those are different things and need to stay separated.

## Artifacts
- Saved HR board: [data/predictions/mlb-home-runs/2026-05-19-statcast-prototype.json](/Users/jcchen/Documents/New%20project/data/predictions/mlb-home-runs/2026-05-19-statcast-prototype.json:1)
- Stored live slate: [src/lib/day-2026-05-19.js](/Users/jcchen/Documents/New%20project/src/lib/day-2026-05-19.js:1)
- Stored MLB board: [src/lib/day-2026-05-19-mlb.js](/Users/jcchen/Documents/New%20project/src/lib/day-2026-05-19-mlb.js:1)
