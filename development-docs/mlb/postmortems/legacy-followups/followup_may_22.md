# May 22 Follow-Up

## Snapshot
- MLB full game: `7-7`
- MLB first 5: `6-8`
- HR board: `1/12`
- Non-HR props: `15/27`

May 22 felt like a bad baseball day because too many of the losing reads were concentrated in the same kinds of ugly scripts:
- quiet early games that stayed dead longer than expected
- comeback-heavy games
- bullpen-flip games
- a few loud games that broke the wrong way fast

The important correction is that this was **not** a uniform under day. It was a split-script day with a real low-scoring cluster and a separate group of explosive games.

## What Landed

### MLB side hits
- `Astros over Cubs`
- `Rays over Yankees`
- `Pirates over Blue Jays`
- `Nationals over Braves`
- `Tigers over Orioles`
- `Mariners over Royals`
- `White Sox over Giants`

### HR board overlap
- `Juan Soto`

### Non-HR prop hits
- `Ketel Marte Over 1.5 total bases`
- `Juan Soto Over 0.5 singles`
- `Juan Soto Over 1.5 total bases`
- `Jake Burger Over 1.5 total bases`
- `Corbin Carroll Over 1.5 total bases`
- `Munetaka Murakami Over 1.5 total bases`
- `Bryce Harper Over 1.5 total bases`
- `Wade Meckler Over 1.5 total bases`
- `Brandon Lowe Over 1.5 total bases`
- `Luis Arraez Over 0.5 singles`
- `Nick Kurtz Over 0.5 walks`
- `Willson Contreras Over 1.5 total bases`
- `Gunnar Henderson Over 1.5 total bases`
- `Michael Busch Over 0.5 walks`
- `Julio Rodriguez Over 1.5 total bases`

## What Missed

### MLB side misses
- `Guardians over Phillies`
- `Mets over Marlins`
- `Red Sox over Twins`
- `Dodgers over Brewers`
- `Rangers over Angels`
- `Athletics over Padres`
- `Diamondbacks over Rockies`

### MLB first-five misses
The first-five card finished `6-8`, which means the early-game read still lagged behind the live game scripts on too many of the wrong games.

### HR board misses
The board finished `1-for-12`. Main misses included:
- `Kyle Schwarber`
- `Corbin Carroll`
- `Gavin Sheets`
- `Munetaka Murakami`
- `Yordan Alvarez`
- `Brandon Lowe`
- `Bryce Harper`
- `Jake Burger`
- `Willson Contreras`
- `Salvador Perez`

### Non-HR prop misses
Main tracked misses included:
- `Kyle Schwarber Over 1.5 total bases`
- `Samuel Basallo Over 1.5 total bases`
- `Ernie Clement Over 0.5 singles`
- `Randy Arozarena Over 1.5 total bases`
- `Ezequiel Duran Over 1.5 total bases`
- `Junior Caminero Over 1.5 total bases`
- `Shohei Ohtani Over 1.5 total bases`
- `Casey Schmitt Over 1.5 total bases`
- `Michael Harris II Over 1.5 total bases`
- `Brent Rooker Over 1.5 total bases`
- `Xavier Edwards Over 0.5 singles`
- `Daulton Varsho Over 1.5 total bases`

## What The Slate Actually Looked Like

### The low-scoring cluster was real
Among the `14` completed MLB games:
- `7/14` finished at `7 runs or fewer`
- `6/14` graded `quiet through five`
- `3/14` were scoreless through five
- `7/14` had no first-five home run

The deadest games were:
- `Guardians @ Phillies` -> `1` total run
- `Mariners @ Royals` -> `2`
- `Mets @ Marlins` -> `3`
- `Rockies @ Diamondbacks` -> `5`

### But the other half of the board got loud
This is why calling it a pure under day would be wrong.

The loudest games were:
- `Rangers @ Angels` -> `15`
- `Twins @ Red Sox` -> `14`
- `White Sox @ Giants` -> `13`
- `Tigers @ Orioles` -> `11`
- `Athletics @ Padres` -> `10`

So this was really a split board:
- one cluster died early and stayed quiet
- another cluster broke open fast or late

## What Went Right

### The side board was not a disaster, just flat
`7-7` full game is not good, but it is also not a complete wipeout. The problem is that the misses were concentrated in painful spots:
- `Diamondbacks` lost a quiet-through-five bullpen-flip comeback game
- `Red Sox` lost a first-inning-jolt bullpen-flip game
- `Athletics` lost another comeback-script game

That made the day feel worse than a plain coin-flip record.

### The tracked prop board finally looked more usable
This was the most encouraging part of the day.

Tracked non-HR props finished:
- `15/27` overall
- `11/21` on `total bases`
- `2/4` on `singles`
- `2/2` on `walks`

That does not mean the prop engine is solved, but it is much healthier than the old flat candidate board.

### The story archive picked up the real script shape
The warehouse now clearly shows:
- `8` comeback wins
- `3` bullpen flips
- `4` first-inning jolts
- `6` quiet-through-five games

That is exactly the kind of day where average-based reads get shredded by game-script divergence.

## What Went Wrong

### Too many games broke on comeback or bullpen turns
The side board still struggles when the clean pregame read gives way to chaos after the starter window.

Notable comeback / bullpen-swing games:
- `Rockies @ Diamondbacks`
- `Twins @ Red Sox`
- `Rays @ Yankees`
- `Nationals @ Braves`
- `Athletics @ Padres`

That is the clearest sign that the next edge is not just better averages, but better script classification.

### The HR board is still lagging the real distribution
`1/12` is still bad, even with `Juan Soto` cashing early.

The board is improving in how it weights players, but it still misses too many slates where the actual homer distribution spreads away from the most obvious names.

### First five still trails the live story too often
`6-8` on first five means the starter-window read is still not consistently sharp enough on split-script days. A lot of the pain came from:
- wrong early offense assumptions
- not enough respect for quiet-through-five environments
- not enough penalty for games with later flip risk

## What This Says About The Model

### Stronger areas on May 22
- non-HR tracked props
- identifying some of the dead-scoring environments
- warehouse story capture

### Weak areas on May 22
- HR concentration
- first-five control reads
- confidence in games that later turned into comeback or bullpen-flip stories

## Practical Takeaway

May 22 should be graded as:
- a `flat-to-bad` MLB side day
- a `bad` HR day
- an `encouraging` tracked prop day

The biggest lesson is that this was not one story. It was two competing slates living inside one board:
- suppressed, dead-scoring games
- loud, swingy games with comeback and bullpen-turn chaos

That is exactly why the story warehouse matters.
