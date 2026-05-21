# May 17 Follow-Up

## Snapshot
- This follow-up is again focused on the `player-level batting read`.
- Saved HR board source: [data/predictions/mlb-home-runs/2026-05-17-statcast-prototype.json](/Users/jcchen/Documents/New%20project/data/predictions/mlb-home-runs/2026-05-17-statcast-prototype.json:1)
- Saved side board source: [data/predictions/mlb-sides/2026-05-17-board-v2.json](/Users/jcchen/Documents/New%20project/data/predictions/mlb-sides/2026-05-17-board-v2.json:1)
- Actual comparison set below comes from the May 17 NL batting leaders the user saved.

## What The HR Board Elevated
Top May 17 HR targets were:
- `Kyle Schwarber`
- `Yordan Alvarez`
- `Matt Olson`
- `Munetaka Murakami`
- `Drake Baldwin`
- `Christian Walker`
- `Jordan Walker`
- `James Wood`
- `Aaron Judge`
- `Colson Montgomery`
- `Ben Rice`
- `Junior Caminero`

The wider likely/possible pool also included:
- `Gavin Sheets`
- `Ian Happ`
- `Casey Schmitt`
- `Bryce Harper`
- `Elly De La Cruz`
- `Mike Trout`
- `Jo Adell`
- `Jorge Soler`

## What Actually Showed Up On The Batting-Leader Board
The May 17 NL batting leaders were led by:
- `Gavin Sheets`
- `Corbin Carroll`
- `Austin Riley`
- `Luis Arraez`
- `Kyle Tucker`
- `Bryson Stott`
- `Michael Conforto`
- `Harrison Bader`
- `Mike Yastrzemski`
- `Ty France`
- `Lourdes Gurriel Jr.`
- `Elly De La Cruz`
- `Tyrone Taylor`
- `Gabriel Moreno`
- `Shohei Ohtani`
- `Matt Chapman`
- `Alex Bregman`
- `Michael Busch`
- `Marcus Semien`
- `Jake Bauers`
- `Christian Yelich`
- `Bryce Harper`
- `Nathaniel Lowe`

## Direct Overlap vs Our HR Board
Only `3 of 30` saved batting leaders were on the saved May 17 HR board:
- `Gavin Sheets`
- `Elly De La Cruz`
- `Bryce Harper`

That means `27 of the 30` loudest NL bats on the slate were not on the board.

## What Went Right

### 1. Gavin Sheets was a true board hit
This is worth being explicit about.

The May 17 batting-leader board was led by:
- `Gavin Sheets` with `2 HR`, `4 RBI`, and `10 TB`

And he was on our May 17 HR board.

That tells us the board can find real game-specific bats when:
- the lineup slot is right
- the contact profile is live
- and the matchup lane is obvious enough

### 2. Bryce Harper and Elly De La Cruz were also real overlaps
They were not the top story of the slate, but they were legitimate hits by the board.

So May 17 was better than May 16 in one important sense:
- the board did catch a few real loud bats
- it just still missed most of the actual distribution

### 3. But a prior loud bat still is not an automatic next-day prop
This needs to be stated clearly because it is a common model trap.

Example:
- `Elly De La Cruz` did show up on the May 17 batting-leader board
- but that kind of hit should not automatically turn into "bet Elly tomorrow"
- a player can be a correct overlap on one slate and then completely blank on the next

That is exactly the kind of false carryover risk we need to punish harder.

Lesson:
- yesterday's loud bat is an input, not a conclusion
- one-game spikes should raise awareness, not force next-day prop conviction
- the model needs stronger overnight regression so it does not blindly chase yesterday's headline name

## What Went Wrong

### 1. Diamondbacks wave: we still missed the cluster
Actual loud Arizona bats:
- `Corbin Carroll`
- `Lourdes Gurriel Jr.`
- `Gabriel Moreno`
- `Geraldo Perdomo`

The saved HR board leaned more toward:
- `Christian Walker`
- later `Casey Schmitt` on the opposing side

Lesson:
- the board still over-indexed on the obvious slugger instead of the broader live cluster
- Arizona was not just one-HR-bat live, it was `full-lineup live`

### 2. Giants side: total offensive profile beat the named HR target
Actual loud Giants bats:
- `Luis Arraez`
- `Harrison Bader`
- `Matt Chapman`

That is not a classic bomb-only outcome. It is a `broad batting-impact` outcome.

Lesson:
- the Giants environment was stronger for `hits/TB/RBI` than for a narrow HR call
- the board needs a way to say that directly

### 3. Braves: the right team wave, wrong player concentration
Actual loud Braves bats:
- `Austin Riley`
- `Mike Yastrzemski`

The board was still leaning heavily into:
- `Matt Olson`
- `Drake Baldwin`

`Drake Baldwin` was a real story the day before, but the slate moved elsewhere inside the lineup.

Lesson:
- recent success from one bat cannot dominate the next-day concentration too much
- the model needs a stronger `lineup redistribution` concept

### 4. Dodgers/Padres: broad offense again beat narrow star selection
Actual loud bats included:
- `Kyle Tucker`
- `Shohei Ohtani`
- `Hyeseong Kim`
- `Ty France`
- `Gavin Sheets`

This is another example where the slate value was spread across:
- stars
- secondary bats
- and non-HR outcomes

Lesson:
- the board should be able to say "this game has several playable bats for different prop types"
- not just "this is the one HR lane"

### 5. Cubs/Brewers: even losing or messy games can produce useful hitters
Actual loud bats included:
- `Michael Conforto`
- `Alex Bregman`
- `Michael Busch`
- `Jake Bauers`
- `Christian Yelich`
- `Garrett Mitchell`
- `Sal Frelick`

This again shows:
- player props should not be chained too tightly to the side
- losing teams and ugly scripts still create usable `hits`, `TB`, and `RBI` props

## What The Side Board Was Still Leaning On
Saved May 17 side picks still leaned on a mix of:
- `Hit-production baseline`
- `Projected hit volume`
- `Standings profile`
- `Starter ERA`
- `Market price`

That is better than the older purely pitcher-price build, but the batting-leader board shows it is still not enough at the player level.

Examples:
- `Marlins @ Rays`: the board loved the Rays traffic profile, and the game read itself was cleaner than the HR distribution inside other games.
- `Red Sox @ Braves`: the board leaned Braves behind standings + price + starter surface, but the actual loud-bat story was more specific and less Olson-centric than the model implied.
- `Yankees @ Mets`: the board leaned Mets behind hit-production and projected-hit volume, but the actual loud bats spread across the game more than the named anchors suggested.

## Main Lessons From May 17

### The board improved slightly, but not enough
May 17 was better than May 16 because the overlap was `3 of 30` instead of `2 of 30`, and one of those was a huge direct hit in `Gavin Sheets`.

But that is still nowhere near good enough.

### The board still solved the wrong problem
It still asked:
- `who is the cleanest likely HR bat?`

Instead of:
- `which lineup is most likely to overperform?`
- `which hitters inside that lineup are best for HR, TB, hits, RBI, or walks?`

### Team and lineup clusters mattered more than single stars
The loudest team clusters were:
- `Diamondbacks`
- `Giants`
- `Dodgers/Padres game environment`
- `Cubs/Brewers mixed bats`

And the board still spread too little probability across those clusters.

## What To Change
1. Keep HR as the highest-variance branch, not the main prop identity.
2. Add stronger lineup-cluster tags like `loud game`, `TB lane`, `RBI lane`, and `secondary bat live`.
3. Reduce concentration into one star bat when the lineup environment suggests multiple paths.
4. Use batting-leader carryover as a broader `impact form` signal, not just a recent HR signal, and regress one-game spikes much harder overnight.
5. Distinguish `good HR call`, `good lineup read`, and `good prop read` as separate things in the postmortem.

## Bottom Line
May 17 confirms the same broader lesson as May 16:
- the current board can occasionally find the right HR bat
- but it still misses too much of the actual lineup-wide overperformance distribution
- the real edge is more likely to come from a broader player-prop board than from trying to isolate a tiny list of "best HR names"
