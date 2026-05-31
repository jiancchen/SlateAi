# Model Research 05-22-26

## Goal

We added a lot of new warehouse depth:

- player batting boxscores
- non-HR prop grading
- plate appearances
- pitch events
- game story signals
- comeback / bullpen-flip / quiet-through-five tagging

But the live side model has not yet changed very much to use that new information.

This note is the first research pass on:

1. where the current side model is breaking
2. what “big edge” really means in the current archive
3. what kinds of new features and experiments are most worth building next

## Data Used

This pass used:

- `/Users/jcchen/Documents/New project/data-private/history/mlb-results-archive.jsonl`
- `/Users/jcchen/Documents/New project/data-private/warehouse/sports.db`
- `mlb_game_outcomes`
- `mlb_game_story_signals`
- `mlb_prop_backtests`
- exported current side indicators from the history JSONL rows

The current moneyline archive size for this pass was:

- `93` MLB moneyline rows
- dates: `2026-05-16` through `2026-05-22`

## High-Level Findings

### 1. The model is not broadly broken on every edge bucket

Archive hit rates by `pointEdge` bucket:

- `<5`: `16/29` -> `55.2%`
- `5-10`: `14/26` -> `53.8%`
- `10-15`: `14/25` -> `56.0%`
- `15-20`: `9/11` -> `81.8%`
- `20+`: `1/2` -> `50.0%`

Takeaway:

- `15-20` has actually been strong in the current archive
- `20+` is too small a sample to trust, but the one bad miss is important because it looks like false overconfidence, not random noise

### 2. The true problem is not “all big edges are fake”

The more precise problem is:

- some very large edges are being created in extremely high-volatility environments
- those edges are still too willing to trust starter advantage and projected hit volume
- the model is not punishing script instability hard enough before declaring a game a near-blowout edge

### 3. The biggest high-edge losses were all living in volatility `92`

The `15+` edge sample had `13` games and went `10-3`.

The `3` losses were:

- `2026-05-17 Padres @ Mariners`
  - pick: `Seattle Mariners`
  - edge: `16.8`
  - volatility: `92`
  - story: `quiet through five`, `late break`

- `2026-05-18 Giants @ Diamondbacks`
  - pick: `San Francisco Giants`
  - edge: `17.1`
  - volatility: `92`
  - story: `first-inning jolt`, `San Francisco Giants starter cracked`

- `2026-05-22 Rangers @ Angels`
  - pick: `Texas Rangers`
  - edge: `20.9`
  - volatility: `92`
  - story: `first-inning jolt`, `Texas Rangers starter cracked`, `relief homer damage`

Takeaway:

- the common thread is not just “the pick lost”
- it is “huge edge + maximum volatility + unstable script”

### 4. Large-edge misses are still too starter-driven

The three big-edge losses leaned on input stacks like:

- `Projected hit volume`
- `Market price`
- `Strikeout ceiling`
- `Starter ERA`
- `Hit-production baseline`
- `Standings profile`
- `Starter record`

These are not useless inputs, but they are still too average-based.

What is missing is stronger confirmation from:

- late-game stability
- bullpen chain quality
- script-family risk
- starter-crack risk
- first-inning jolt risk

### 5. `starterLeverageIndex` is saturating too easily

Archive summary:

- `starterLeverageIndex` range: `25.5` to `100`
- average: `73.96`
- rows with `starterLeverageIndex >= 95`: `18`
- hit rate in that extreme zone: `13/18` -> `72.2%`

That is not awful, but it is too loose for a number that often ends up supporting the strongest convictions.

Important:

- the three big-edge losses all had `starterLeverageIndex` of `98-100`
- they still lost because the game broke on script instability, not average starter quality

Takeaway:

- starter leverage is useful
- but it should not be allowed to create giant edges by itself

### 6. Today’s “bad office day” was not a pure under slate

For `2026-05-22`, after cleaning out the postponed Cardinals/Reds row:

- completed MLB games: `14`
- total runs: `109`
- average runs per game: `7.79`
- low-scoring games (`<= 7 runs`): `7`
- quiet first 5 games: `6`
- scoreless through five: `3`
- no first-5 HR games: `7`
- first-inning jolts: `4`
- bullpen flips: `3`
- comeback wins: `8`

Takeaway:

- this was a split-script day
- half the board died early
- half the board got loud or flipped later

That is exactly the kind of slate where average projections feel “wrong” even when some of the underlying signals are valid.

### 7. The new tracked prop board is healthier than the old flat side confidence

For `2026-05-22`:

- full-game sides: `7-7`
- first 5 sides: `6-8`
- HR board: `1/12`
- tracked props: `15/27`

Tracked prop breakdown:

- `totalBases`: `11/21`
- `singles`: `2/4`
- `walks`: `2/2`

Takeaway:

- the selective `v2` prop path looks more promising than the broad legacy prop universe
- the side model may need to learn from some of the same script-aware selectivity

## Where The Side Model Is Actually Breaking

### A. It overstates clean control in high-volatility games

Current evidence:

- the biggest edge misses all sat at volatility `92`
- the model still allowed `16.8`, `17.1`, and `20.9` point edges there

That means:

- volatility is being surfaced
- but not strong enough to override confidence

### B. It treats starter edge too much like game edge

Current evidence:

- `starterLeverageIndex` often maxes out at `100`
- big-edge losses still happened with that max value
- those games broke on:
  - `starter cracked`
  - `first-inning jolt`
  - `late break`
  - `relief homer damage`

That means:

- starter leverage is too central in the current edge stack
- the model still needs a better translation from “starter advantage” to “full-game trust”

### C. It still lacks script-family penalties

From the archive’s `39` moneyline misses:

- `19` were `quiet through five`
- `16` were `comeback wins`
- `12` had a `first-inning jolt`
- `7` were `bullpen flips`

That is the real signal:

- losses are not randomly distributed
- they cluster around identifiable game stories

### D. It is still too comfortable with thin ingredient stacks

The big-edge misses were not supported by a wide evidence stack.

They were often built from just `3` inputs like:

- starter ERA
- projected hit volume
- market price

The model needs a stronger rule that says:

- if the edge is huge, the evidence stack also needs to be richer

## Most Important Improvement Ideas

## 1. Add an “edge haircut” layer after edge creation

Do not just compute `modelEdge` and display it.
Compute it, then haircut it if the script environment is unstable.

Examples:

- if `volatility >= 90`, cap raw side edge before display
- if `starterLeverageIndex >= 90` but `lateInningStabilityIndex < 45`, haircut hard
- if `reliefPitchingRisk >= 60` and `modelEdge >= 15`, haircut again
- if a game has a strong bridge-edge against the pick, haircut even if starter edge is large

Concrete first experiment:

- no displayed edge above `14` when `volatility >= 90` unless:
  - `lateInningStabilityIndex >= 52`
  - `reliefPitchingRisk <= 55`
  - and the pick owns the bridge chain

## 2. Build explicit script-risk scores

Not one volatility number. Several script-risk numbers:

- `early-jolt risk`
- `quiet-through-five risk`
- `starter-crack risk`
- `bullpen-flip risk`
- `comeback risk`
- `relief-homer-damage risk`

Then use those not only in UI, but in the side confidence itself.

## 3. Separate “starter edge” from “full-game trust”

We already partially do this with:

- first 5
- late-game indicators
- bridge chain

But the final edge is still too willing to let the starter dominate the read.

Concrete change:

- create a `starter-only edge`
- create a `late-game trust score`
- only allow very large full-game edges when both agree

## 4. Require deeper evidence for giant edges

If `pointEdge >= 15`, require at least one or two of:

- `Bullpen follow-through`
- `Likely bridge chain`
- `Lineup-vs-starter fit`
- `Recent starter form`
- `Lineup-vs-pitching fit`

If the giant edge is coming only from:

- starter ERA
- market price
- standings profile

then demote it.

## 5. Use the story warehouse to train “bad script” avoidance first

Before training a winner model, train simple classifiers for:

- `quiet through five`
- `bullpen flip`
- `comeback win`
- `starter cracked`

Then feed those probabilities into the current heuristic engine.

This is likely lower-risk than trying to replace the whole side model immediately.

## 6. Build a “fake-form” penalty

We need a better answer to:

- has this offense been producing against soft recent starters?
- has this pitcher’s recent line come against weak offenses?

That means adding opponent-strength context to recent form, not just raw form.

Possible features:

- average opponent starter score over last 5 games
- average opponent bullpen score over last 5 games
- average opponent lineup score over last 5 games

## 7. Add concentration / dependency features

We talk about “few-player dependence” conceptually, but the model needs it numerically.

Useful features:

- lineup concentration score
- top-2 batter share of recent total bases / RBI / HR
- depth resilience score
- “if top bat is muted, does team still score?” proxy

This likely matters a lot in low-scoring and quiet-through-five games.

## 8. Add return / call-up / leash context directly into side confidence

We already started better starter notes like:

- season debut after rehab
- short leash
- warehouse sample incomplete

But those should become model penalties too, not just descriptive copy.

Examples:

- first start off IL
- season debut
- call-up / unknown sample
- pitch count restriction
- recent role change

## 9. Use the plate-appearance warehouse for “when” features

The biggest future upside is not more averages. It is better “when” logic.

Examples:

- first-inning swing/take behavior
- reliever first-batter ball rate
- early-count chase vs patient teams
- third-time-through collapse
- traffic without conversion
- late-and-close passivity/aggression

That is how we move from:

- average outcome thinking

to:

- script-trigger thinking

## 10. Let the side model learn from the prop model’s selectivity

The tracked prop board is smaller and more selective, and it held up better on May 22.

That suggests the side model should also become more comfortable saying:

- this is not a clean side
- this is a prop day, not a moneyline day

Or:

- this game is script-fragile, so the best expression is a player angle, not a side

## Suggested Experiments

## Experiment A: High-volatility edge cap

Backtest:

- current model
- current model with displayed `pointEdge` capped under high volatility
- current model with outright rank penalty when `volatility >= 90`

## Experiment B: Story-risk overlay

Create pregame proxy scores for:

- quiet-through-five
- bullpen flip
- starter crack
- comeback risk

Then backtest:

- no overlay
- overlay as confidence penalty
- overlay as edge haircut

## Experiment C: Big-edge evidence stack

If `edge >= 15`, require:

- at least one lineup-fit proof
- at least one late-game proof

Otherwise demote to medium edge.

## Experiment D: Prop-driven side veto

If side is strong but:

- tracked prop board is narrow or weak
- team script is too dependent on one or two bats

then lower side conviction.

## Experiment E: “No clean side” classifier

Train a simple logistic baseline that predicts whether a side should be treated as:

- clean
- fragile
- no-bet

Use current fields:

- edge
- volatility
- starter leverage
- late stability
- relief risk
- coinflip pressure
- projected hit edge
- bridge edge
- lineup status
- starter status

This may be more useful short-term than trying to predict winners better.

## Creative Data Ideas

These are not all immediate, but they are worth keeping in the idea pool.

- opponent-adjusted recent form
- hitter dependency / spread scores
- “traffic without conversion” team tendency
- reliever first-batter command score
- first-inning take rate / swing rate by team
- relief pitch-type trap maps
- times-through-order break indicators
- call-up failure history
- return-from-IL short-leash templates
- weekly travel / getaway-day fatigue tags
- “fake under” vs “real under” clustering
- “favorite pressure” scores from streak + price + shaky starter profile
- contact-quality vs run-conversion mismatch scores

## Best Immediate Next Steps

1. Add a high-volatility edge haircut rule and backtest it.
2. Build pregame proxy scores for:
   - starter-crack risk
   - quiet-through-five risk
   - bullpen-flip risk
3. Demote giant edges that are built only from starter / market / standings inputs.
4. Start using opponent-strength-adjusted recent form in both side and prop logic.
5. Keep growing the plate-appearance / story archive so the next model pass can learn from “when,” not just averages.

## Bottom Line

The side engine is not failing because all of its averages are useless.

It is failing because:

- some of its biggest convictions are still too average-based
- script instability is not being penalized hard enough
- starter edge is still too close to full-game edge

The good news is that the warehouse now has the raw material to improve this in a much smarter way.

The next phase should be:

- less blind trust in big edges
- more script-risk awareness
- more opponent-adjusted form
- more event-state “when” features
