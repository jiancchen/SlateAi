# May 18 Follow-Up

## Snapshot
- MLB side board: `6-8` full game
- MLB first 5 board: `4-10`
- MLB bullpen-flip losses: `0`
- MLB starter-rescue wins: `2`
- MLB thin-edge plays: `5`
- MLB high-volatility plays: `8`
- MLB HR board: `0-for-12`
- WNBA board: `1-1`
- NBA board: `0-1`

The headline is simple: May 18 was a bad baseball day, and it was not mostly "bad bullpen luck." The board missed a lot of games early, and the HR layer was overconfident and too concentrated in a few headline bats.

## What Went Right

### MLB sides that landed
- `Rays over Orioles`
- `Yankees over Blue Jays`
- `Mets over Nationals`
- `Red Sox over Royals`
- `Twins over Astros`
- `Mariners over White Sox`

### Not all correct sides were clean reads
Binary win/loss is not enough. A side can cash and still be a weak or misleading read.

Best example:
- `Yankees over Blue Jays` was technically right, but it was not a clean control win.
- New York led `1-0`, then trailed `5-3` after `6`.
- They needed a `4-run 7th` to flip the game and survived `7-6`.

That means the follow-up needs a second lens beyond accuracy:
- `clean control win`
- `comeback / survive-and-escape win`
- `starter-window miss`
- `bullpen flip loss`

The Yankees game belongs in the `comeback / survive-and-escape win` bucket, not the same bucket as something like `Rays over Orioles`.

### WNBA / NBA
- `Fire over Sun` was right. Actual result: `Fire 83, Sun 82`.
- `Mystics over Wings` was wrong. Actual result: `Wings 92, Mystics 69`.
- `Thunder over Spurs` was wrong. Actual result: `Spurs 122, Thunder 115 (2OT)`.

### What actually held up in the MLB model
- The board still found several real winners.
- The late-game / bullpen-flip label was not the main source of pain on this slate.
- Some higher-scoring environments were read correctly on the side level, even when HR selection inside those games failed.
- But correct side picks still need `quality grading`, because a shaky comeback is weaker evidence than a game the model controlled from the first half onward.

## What Went Wrong

### Biggest MLB misses
- `Giants over Diamondbacks` lost badly. Actual result: `Diamondbacks 12, Giants 2`.
- `Braves over Marlins` lost badly. Actual result: `Marlins 12, Braves 0`.
- `Dodgers over Padres` lost. Actual result: `Padres 1, Dodgers 0`.
- `Reds over Phillies` lost. Actual result: `Phillies 5, Reds 4`.
- `Athletics over Angels` lost.
- `Cubs over Brewers` lost.
- `Rangers over Rockies` lost.
- `Tigers over Guardians` lost.

### First 5 was worse than full game
This is important because the recent model work has tried to make first-5 cleaner than full-game. On May 18 it did not hold up:
- Full game: `6-8`
- First 5: `4-10`

That means this was not just a "late innings got weird" day. A lot of the bad reads were wrong from the starter window forward.

## Giants / Diamondbacks Postmortem

### Side miss
The board picked `Giants`.
Actual result: `Diamondbacks 12, Giants 2`.

This was not a bullpen-flip loss. Arizona hit first and hit hard. The board was too pro-Giants in the starter-phase script, and once that was wrong, the game never recovered.

### Nolan Arenado miss
The model missed `Nolan Arenado` as an HR target even though he homered and drove in `4`.

Why the board missed him:
- It treated him as `good hitter but not current HR-hot`.
- It overweighted `0 HR` in his recent window.
- It underweighted `non-HR loud contact` and extra-base pressure.
- It gave too much credit to the Giants side of the game script.

Why that was a bad read:
- Arenado was not bat-cold.
- He had real recent offensive quality, even without recent HR conversion.
- He was exactly the type of hitter who can convert doubles / loud contact into a homer before the HR log catches up.

## Home Run Board: Total Failure

### Result
Tracked HR picks: `12`
Actual HR hits from tracked picks: `0`

Missed HR picks:
- `Kyle Schwarber`
- `Gavin Sheets`
- `Munetaka Murakami`
- `Bryce Harper`
- `Colson Montgomery`
- `JJ Bleday`
- `Casey Schmitt`
- `Drake Baldwin`
- `Ben Rice`
- `Yordan Alvarez`
- `Ian Happ`
- `Ryan Jeffers`

### What the actual HR slate looked like
The slate had `32` actual home runs, but they were distributed across a much wider set of hitters than the board emphasized.

Examples:
- `Josh Bell` hit `2`
- `Bo Bichette` homered
- `Brett Baty` homered
- `Nolan Arenado` homered
- `Gabriel Moreno` homered
- `Miguel Andujar` homered
- `Paul Goldschmidt` homered
- `Christian Yelich` homered
- `Junior Caminero` homered
- `Adley Rutschman` homered

### Core HR-model failure
The board is still answering the wrong question too often.

It is too focused on:
- "who is the best HR bat on this team?"
- "which 1-2 names look strongest on paper?"

But the real slate behaves more like:
- which lineup is loud today?
- which hitters are generating total-base pressure?
- which players are converting contact quality into runs, RBI, doubles, and HR?

The board still over-concentrates probability into headline bats like `Soto`, `Schwarber`, and `Harper`, instead of treating HR as a wide-distribution, high-variance event.

### False carryover example: Elly De La Cruz
This is a good example of why "showed up yesterday" is not enough.

- `Elly De La Cruz` was a real overlap on the May 17 batting-leader board
- but that did **not** make him a good May 18 next-day prop
- your read was that the carryover was wrong, and the slate proved it right: he whiffed on May 18

That matters because the current board can still over-credit a player for:
- one loud prior game
- one recent HR
- one fantasy-spike line

when the more honest read should be:
- volatile player
- high fail rate day to day
- watchlist bat, not core prop

Lesson:
- prior-day batting-leader carryover needs a much stronger overnight decay
- volatile stars need a separate `false carryover` penalty
- "looked loud yesterday" should never be enough to push a player into a core HR lane by itself

## Daily Batting Leaders Lesson
The ESPN May 18 batting-leader board was a better clue to what actually mattered on the slate than the top HR list alone.

Examples from the batting leaders:
- `Josh Bell`
- `Yandy Diaz`
- `Justin Foscue`
- `Bo Bichette`
- `Jose Ramirez`
- `Junior Caminero`
- `Jake Bauers`
- `Ryan Waldschmidt`
- `Christian Yelich`
- `Paul Goldschmidt`
- `Brett Baty`
- `Gabriel Moreno`
- `Nolan Arenado`
- `Miguel Andujar`

These names reinforce the bigger point:
- the slate was driven by a mix of stars, secondary bats, and hot lineup pieces
- not just the one "best HR hitter" on each team
- and not just the hitters with the prettiest season-long HR profile

Takeaway:
- HR-only targeting is too narrow.
- The model needs to promote `loud bats`, not just `best HR names`.
- A hitter can be a stronger `TB / RBI / hits` play than an HR play on the same day.

## NL Batting Leaders vs What The Board Chose
The NL batting-leader sheet makes the miss pattern even clearer. The problem was not just "we picked the wrong star." The problem was that the board was still solving too narrow a problem.

Our tracked May 18 HR misses were:
- `Kyle Schwarber`
- `Gavin Sheets`
- `Munetaka Murakami`
- `Bryce Harper`
- `Colson Montgomery`
- `JJ Bleday`
- `Casey Schmitt`
- `Drake Baldwin`
- `Ben Rice`
- `Yordan Alvarez`
- `Ian Happ`
- `Ryan Jeffers`

The actual NL batting leaders show a different shape:
- `Mets cluster`: `Bo Bichette`, `Carson Benge`, `Brett Baty`, `Juan Soto`, `Tyrone Taylor`
- `Brewers cluster`: `Jake Bauers`, `Christian Yelich`, `Andrew Vaughn`
- `Diamondbacks cluster`: `Ryan Waldschmidt`, `Gabriel Moreno`, `Nolan Arenado`, `Ketel Marte`, `Corbin Carroll`
- `Marlins cluster`: `Xavier Edwards`, `Javier Sanoja`, `Joe Mack`, `Liam Hicks`
- `Phillies / Reds mixed cluster`: `Alec Bohm`, `Bryson Stott`, `Sal Stewart`
- `Padres cluster`: `Miguel Andujar`
- `Cubs even in a loss`: `Michael Busch`, `Dansby Swanson`

That tells us the slate was really driven by `lineup clusters` and `overperformance distribution`, not by a tiny set of headline HR names.

### 1. Mets: the game environment was right, the player concentration was wrong
The Mets scored `16` runs, so the model was directionally right about the game being live. But the player-level read was still too concentrated.

What the board leaned into:
- `Juan Soto` as the cleaner HR-style anchor
- `Brett Baty` as a carry bat in the broader lineup script
- not enough respect for the wider scoring distribution

What actually happened on the batting-leader board:
- `Bo Bichette` was the top NL batting leader
- `Carson Benge` posted a loud all-around line without a homer
- `Brett Baty` converted with a homer
- `Juan Soto` still had a useful game, but not the bomb-centric one the HR board wanted

Lesson:
- the team stack read was good
- the HR board still over-concentrated too much probability into the biggest name
- the better prop lens would have been `Mets overperform bats`, `TB`, `hits`, and `RBI`, not just "Soto HR"

### 2. Brewers: hot lineup continuation mattered more than our side read
The board pushed `Cubs over Brewers`, but the batting leaders show Milwaukee's lineup was still very live.

Actual loud bats:
- `Jake Bauers`
- `Christian Yelich`
- `Andrew Vaughn`

That matters because this was not one random solo-homer outcome. It was a real `team hitting continuation` signal. The Brewers were a hot offense, and the slate showed that again.

Lesson:
- team form and recent lineup momentum need more weight in volatility and side filtering
- a hot offense should not be treated like a normal underdog just because the starting-pitcher surface read says otherwise

### 3. Diamondbacks: we missed the whole game script, not just Arenado
The Giants call was not just a bad HR miss. It was a bad game-shape miss.

Actual Arizona loud bats:
- `Ryan Waldschmidt`
- `Gabriel Moreno`
- `Nolan Arenado`
- `Ketel Marte`
- `Corbin Carroll`

That is a full lineup cluster, not a one-off HR event. Once Arizona's offense got rolling, multiple bats beat expectation at once.

Lesson:
- we were too pro-Giants in the base side script
- once the game-environment call is wrong, the HR board naturally gets dragged to the wrong side too
- this is where `team story`, `recent confidence`, and `run environment momentum` need to be stronger than a thin starting-pitcher lean

### 4. Marlins: non-star contact teams can still break a slate
The Marlins shut out Atlanta `12-0`, and their batting leaders were not star-name bomb picks.

Actual loud bats:
- `Xavier Edwards`
- `Javier Sanoja`
- `Joe Mack`
- `Liam Hicks`

This is exactly why HR-only logic is too narrow. The Marlins created fantasy value through a full-lineup overperformance wave, not through one obvious carry bat.

Lesson:
- some teams are better represented by `hits`, `RBI`, `runs`, `singles`, and `TB` clusters than by HR concentration
- the board needs a way to say "this lineup may be loud today even if I don't love any one HR bat"

### 5. Phillies / Reds: broad production beat the star-HR framing
We missed with `Schwarber`, `Harper`, and `JJ Bleday`, but the same game still produced useful batting-leader outcomes:
- `Alec Bohm`
- `Bryson Stott`
- `Sal Stewart`

That is another sign the model is framing too much around star HR conversion instead of lineup-wide prop value.

Lesson:
- `TB`, `hits`, and `RBI` would have described this game better than `Schwarber HR` or `Harper HR`
- the right player can cash without being the team's most obvious home-run bat

### 6. Padres and Cubs: even lower-total or losing teams can still produce strong individual props
The Padres only won `1-0`, but `Miguel Andujar` still showed up on the batting leaders.
The Cubs lost `9-3`, but `Michael Busch` and `Dansby Swanson` still produced useful fantasy / base outcomes.

Lesson:
- player props should not be chained too tightly to the side pick
- losing teams and lower-total games can still carry strong `hits`, `TB`, or `RBI` targets

## What This Means For The Model
The NL batting-leader board says the following very clearly:

### The board is still too HR-centric
Even on a day when HR was part of the story, the better signal was `overall batting impact`, not just "who homered."

### The board is still too star-centric
It still defaults too often to the best-known bat instead of the most likely overperformer in that specific lineup wave.

### The board needs lineup-cluster logic
Instead of naming `1-2 likely HR bats`, the model should ask:
- which lineups are most likely to overperform today?
- which hitters inside those lineups are best for `TB`, `hits`, `RBI`, `walks`, or `HR`?
- which secondary bats become strong if the lineup script breaks right?

### A better player-prop priority stack is:
1. `0.5 hits`
2. `1.5 total bases`
3. `0.5 RBI`
4. `0.5 walks`
5. `1.5 hits`
6. `0.5 HR`

### The board needs a `loud bat` tag
Not just:
- `carry bat`
- `possible HR`

But also:
- `loud bat`
- `TB lane`
- `RBI lane`
- `lineup-wave beneficiary`

That would have described the Mets, Brewers, Diamondbacks, and Marlins much better than the old HR-only framing.

## Data / Model Problems Exposed

### 1. Bad stored team context
There were real duplicated team-context rows in the stored baseline data:
- cloned bullpen rows
- cloned offense rows

That was already patched after the slate, but it absolutely hurt trust in some team-level reads.

### 2. Too many hard picks in high-volatility spots
The board had `8` high-volatility MLB plays and still leaned too assertively into several of them.

### 2a. Some projected hit edges were overstated, not just wrong
Two of the ugliest examples were:
- `Giants @ Diamondbacks`
- `Athletics @ Angels`

The problem there was deeper than "bad side pick." The projected hit edge itself was overstated.

What happened:
- the board was still willing to create very large hit gaps off incomplete lineup certainty
- partial or unresolved batting orders were being treated too much like full-information lineup edges
- the hit-gap calibrator was then amplifying those raw differences too aggressively

That produced the kind of fake precision the slate did not deserve.

Examples from the saved May 18 logic before the fix:
- `Giants @ Diamondbacks` was showing a roughly `4.8-hit` edge
- `Athletics @ Angels` was showing a roughly `4.2-hit` edge

Those are not believable baseball edges in games with that much uncertainty.

After tightening the model:
- `Giants @ Diamondbacks` compresses closer to a `1.5-hit` usable edge
- `Athletics @ Angels` compresses closer to a `0.6-hit` edge

That is much closer to what the data really justified:
- Giants may have had a live lineup-fit case, but not a blowout traffic edge
- Athletics had at most a thin shape edge, not a clean favorite-quality hit projection

Lesson:
- incomplete lineups must heavily compress projected hit edges
- baseball hit-gap calibration has to stay conservative
- anything that still looks like a giant hit edge in a noisy MLB game should be treated as suspect by default

### 3. Pending / partial lineup risk still mattered
Some of the ugliest misses were built before the lineup context was fully stable. The model still needs to punish conviction harder when a board is incomplete.

### 4. HR model is too top-heavy
This is the biggest structural issue.

The current HR board:
- overweights star-name carry
- overweights recent HR count
- underweights lineup-wide distribution
- underweights "loud but not yet homering" bats
- underweights alternative props like `TB`, `RBI`, `hits`, and `walks`

## Immediate Fixes For The Next Slate

### Priority 1
Make the prop board broader than HR.

The default player-prop workflow should rank:
1. `Hits`
2. `Total bases`
3. `RBI`
4. `Walks`
5. `Singles`
6. `HR`

### Priority 2
Lower conviction in high-volatility MLB spots.

If a game is already flagged as noisy, it should be:
- `watchlist`
- `flip-live`
- or `pass`

not a standard core side.

### Priority 3
Add a `latent power` indicator.

Need to distinguish:
- `HR-cold`
- from `bat-cold`

Examples like `Arenado` show that doubles, extra-base pressure, and overall loud contact can matter even when recent HR count is zero.

### Priority 4
Treat HR as a lineup-distribution problem.

Instead of "pick 1-2 bats per team," the board should estimate:
- team HR environment
- lineup-wide overperform probability
- likely `TB / RBI / hits` outsized contributors
- and then mark HR as the highest-variance branch of that cluster

### Priority 5
Add `win quality` and `game control` grading to side backtests.

Need to distinguish:
- `wire-to-wire or clean control`
- `came from behind and escaped`
- `never controlled the game`
- `bullpen collapse`

That would stop games like `Yankees over Blue Jays` from counting the same as dominant correct reads.

## Bottom Line
May 18 was a useful failure day.

What it showed clearly:
- the side board still overcommits in noisy MLB spots
- the first-5 model can still be badly wrong early
- the HR layer is not yet a betting edge
- the real opportunity is likely in a wider player-prop board, not in pretending HR can be cleanly narrowed to a tiny set of "best bats"

The board did still get some MLB winners right, and it did identify a few real scoring environments. But the overall baseball output for May 18 was below standard and needs to be treated as a correction day, not a near miss.
