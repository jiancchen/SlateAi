# May 16 Follow-Up

## Snapshot
- This follow-up is specifically about the `player-level batting read`, not just the side board.
- Saved HR board source: [data-private/predictions/mlb-home-runs/2026-05-16-statcast-prototype.json](/Users/jcchen/Documents/New%20project/data-private/predictions/mlb-home-runs/2026-05-16-statcast-prototype.json:1)
- Saved side board source: [data-private/predictions/mlb-sides/2026-05-16-board-v2.json](/Users/jcchen/Documents/New%20project/data-private/predictions/mlb-sides/2026-05-16-board-v2.json:1)
- Actual comparison set below comes from the May 16 NL batting leaders the user saved.

## What The HR Board Elevated
Top May 16 HR targets were:
- `Kyle Schwarber`
- `Byron Buxton`
- `Matt Olson`
- `Yordan Alvarez`
- `Munetaka Murakami`
- `Colson Montgomery`
- `Aaron Judge`
- `Mickey Moniak`
- `Max Muncy`
- `James Wood`
- `Shea Langeliers`
- `Jordan Walker`

The wider likely/possible pool also included names like:
- `Drake Baldwin`
- `Bryce Harper`
- `Ben Rice`
- `Mark Vientos`
- `Andy Pages`
- `Nick Kurtz`

## What Actually Showed Up On The Batting-Leader Board
The May 16 batting leaders were led by:
- `Casey Schmitt`
- `Keibert Ruiz`
- `Shohei Ohtani`
- `Brady House`
- `CJ Abrams`
- `Jacob Young`
- `Javier Sanoja`
- `Drake Baldwin`
- `Mookie Betts`
- `Jakob Marsee`
- `Jackson Chourio`
- `Carson Benge`
- `Bryce Harper`
- `Nick Castellanos`
- `Willy Adames`
- `Miguel Amaya`
- `Pete Crow-Armstrong`
- `Gavin Sheets`
- `Juan Soto`
- `Ketel Marte`
- `Lourdes Gurriel Jr.`
- `Otto Lopez`

## Direct Overlap vs Our HR Board
Only `2 of 30` saved batting leaders were on the saved May 16 HR board:
- `Drake Baldwin`
- `Bryce Harper`

That means `28 of the 30` loudest NL bats on the slate were not even on the board.

## What Went Wrong

### 1. Nationals wave: the environment was right, the hitter distribution was wrong
Washington's loud bats were:
- `Keibert Ruiz`
- `Brady House`
- `CJ Abrams`
- `Jacob Young`

The board did surface `James Wood` and `Daylen Lile` in its broader pool, so it was not blind to Washington entirely. But it still missed the actual fantasy / total-base / RBI winners inside the lineup.

Lesson:
- a team-level traffic read is not enough
- we need better `lineup-wave distribution`, not just "best star bat on the team"

### 2. Dodgers/Angels game: we underweighted broad base production
Actual loud Dodgers bats:
- `Shohei Ohtani`
- `Mookie Betts`

The board had `Max Muncy` in the HR pool, but not the actual top two batting-leader names from that game.

Lesson:
- this is another case where the board was too concentrated on a narrower HR lane
- `hits`, `TB`, and `RBI` would have described the real value better than trying to isolate a single HR name

### 3. Marlins wave: non-star pressure beat the model
Actual loud Marlins bats:
- `Javier Sanoja`
- `Jakob Marsee`
- `Heriberto Hernandez`
- `Liam Hicks`
- `Otto Lopez`

This is exactly the kind of slate shape the old HR board misses. There was no obvious single bomb anchor. It was a `lineup overperformance cluster`.

Lesson:
- the prop model needs a way to say "this lineup is live across hits/TB/RBI" even if it does not love a home-run bat

### 4. Giants side of Giants/Athletics: we missed the whole offense profile
Actual loud Giants bats:
- `Casey Schmitt`
- `Willy Adames`
- `Drew Gilbert`

The saved board did not have `Casey Schmitt` in the May 16 HR pool at all. That matters because he was the No. 1 batting leader on the day.

Lesson:
- the Giants offense was read too softly at the player level
- the model needs a better way to detect `latent extra-base pressure` before the HR log catches up

### 5. Padres/Cubs secondary-bat issue
Actual loud bats included:
- `Nick Castellanos`
- `Rodolfo Duran`
- `Gavin Sheets`
- `Miguel Amaya`
- `Pete Crow-Armstrong`

These are not all obvious "headline HR" picks. Several are better described as `RBI/TB/hits` outcomes.

Lesson:
- the default prop board cannot be HR-first
- it needs to surface the players most likely to be `useful`, not just most likely to homer

## What The Side Board Was Still Leaning On
Early May 16 side picks still relied heavily on:
- `Starter ERA`
- `Starter record`
- `Market price`
- `Strikeout ceiling`

Examples from the saved board:
- `Blue Jays @ Tigers`: `Starter ERA`, `Strikeout ceiling`, `Projected hit volume`
- `Royals @ Cardinals`: `Hit-production baseline`, `Standings profile`, `Starter ERA`
- `Rangers @ Astros`: `Strikeout ceiling`, `Market price`, `Starter record`

That is not useless, but it is still too surface-level when compared to what the batting leaders show. The player-level slate was being shaped by:
- lineup clusters
- secondary bats
- total-base pressure
- RBI conversion
- broader offense waves

## What Held Up
- `Drake Baldwin` was a real hit by the board.
- `Bryce Harper` was a real hit by the board.
- `James Wood` was at least directionally close to the Washington story even if he was not the actual top batting-leader outcome.

So this was not a total blind day. But the board still solved far too much of the slate as `best HR name` instead of `best overperform bat`.

## Main Lessons From May 16

### The board was too narrow
Only `2 of 30` actual batting leaders were on the HR board.

### The board was too HR-centric
Many of the real winners were better `TB`, `hits`, `RBI`, or `overall batting impact` plays than HR plays.

### The board missed lineup clusters
The loudest lineups were:
- `Nationals`
- `Marlins`
- `Dodgers`
- `Giants`

The board either missed them outright at the player level or only tagged the wrong one or two names.

## What To Change
1. Add a `loud bat` concept that is wider than HR.
2. Promote lineup-cluster props like `TB`, `hits`, and `RBI` over bomb-only calls.
3. Add `latent power` and `extra-base pressure` so players like `Casey Schmitt` do not get missed just because their recent HR count is quiet.
4. Stop treating `team wave correct` and `player prop correct` as the same thing.
5. Push `star-name HR concentration` down and `lineup-distribution probability` up.

## Bottom Line
May 16 shows the exact problem we need to solve:
- the board can sometimes see a live offense
- but it still chooses the wrong hitter too often
- because it is framing the question as `who homers?`
- when the better question is `who is most likely to overperform across hits, TB, RBI, and runs?`
