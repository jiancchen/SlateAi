# MLB Relief Model Upgrade Strategy — May 30, 2026

## Why the current layer is weak

What we have now is mostly a `first reliever shortlist` model.

That is useful, but it is not a real bullpen model yet.

Current audit reads:

- exact first-up reliever hit rate: `20.0%`
- top-2 coverage: `36.1%`
- biggest failure bucket: `6+ outs` bulk first-up turns

That means the current system misses in three different ways:

1. it does not know how long the starter is really expected to last
2. it does not know what kind of bullpen game a team is likely to run
3. it does not know enough about reliever arsenal and hitter-type interaction once the starter exits

## What we already have

From the local warehouse we already own:

- `mlb_pitcher_appearances`
  - actual reliever usage
  - entry order
  - outs
  - runs
  - pitches
  - batters faced
- `mlb_pitch_events`
  - pitch-by-pitch pitch type usage
  - enough to derive reliever arsenal concentration without leaving our own warehouse
- `mlb_plate_appearances`
  - batter / pitcher handedness and event outcomes
- `mlb_bullpen_usage`
  - likely first-up reliever scores
- `mlb_likely_relief_chains`
  - current bridge shortlist
- `mlb_reliever_first_batter_command_profiles`
  - first-entry command risk
- `mlb_team_bullpen_shape_daily`
  - new team-level bullpen game-shape context

So the core lesson is:

- we do **not** need Baseball Savant just to know basic reliever pitch mix
- we **do** want Savant later for better contact-quality allowed and arsenal-quality context

## New model framing

We should stop treating bullpen prediction as one question.

It is actually four linked questions:

1. `When does the starter exit?`
2. `What bullpen shape does this team usually run after that kind of starter exit?`
3. `Who is most likely first up?`
4. `How does that reliever / next reliever sequence actually match this lineup type?`

## Phase 1: starter exit model

This should come first because every bullpen path depends on it.

Target outputs:

- expected starter outs
- probability starter gets through:
  - `12 outs`
  - `15 outs`
  - `18 outs`
  - `21 outs`
- early-hook risk
- bulk-piggyback risk

Features:

- existing starter leash profile
- recent pitch count
- recent times-through-order trouble
- opponent top-third pressure
- opponent contact / chase / patience shape
- ump / weather if meaningful
- bullpen freshness behind him
- starter call-up / tiny-sample / opener flag

Use:

- this becomes the root node for the bullpen script

## Phase 2: team bullpen shape model

This is the piece we were missing.

Target outputs:

- expected relievers used
- probability of:
  - `2-man containment`
  - `3-arm normal bridge`
  - `4+ arm scramble`
  - `6+ arm chaos`
- probability first reliever is:
  - short bridge
  - medium bridge
  - bulk arm

Features:

- new `mlb_team_bullpen_shape_daily`
- last `3/5/10` relievers used
- first-up outs trend
- bulk-first-up rate
- 2-man containment rate
- 4+ / 6+ scramble rate
- bullpen-day / opener-like frequency
- recent innings load for top 4 relievers
- worked-yesterday / back-to-back concentration

Use:

- this should decide whether the model expects:
  - normal bullpen progression
  - piggyback/bulk
  - chaos game

## Phase 3: reliever first-up model

Only after starter-exit and bullpen-shape are clearer should we optimize the exact reliever guess.

Target outputs:

- first-up reliever probabilities
- expected outs for first-up reliever
- probability first-up reliever is part of a 2-arm finish vs just a one-inning bridge

Features:

- existing `mlb_bullpen_usage`
- team bullpen shape state
- starter exit bucket
- days rest
- back-to-back flag
- recent first-up frequency
- recent role drift
- bulk role indicator
- reliever command risk

Use:

- better exact first-up odds
- better top-2 / top-3 chain coverage

## Phase 4: reliever arsenal and matchup layer

This is where the model becomes actually useful for side / total / prop interpretation.

Target outputs:

- reliever pitch concentration summary
- lineup-vs-relief fit
- likely damage type once the starter exits

Derive locally first:

- pitch type share last `15/30` relief outings from `mlb_pitch_events`
- primary / secondary / tertiary mix
- handedness split usage if sample exists

Then add Savant later:

- xwOBA allowed
- xSLG allowed
- hard-hit allowed
- barrel allowed
- chase / whiff / zone quality
- by pitch type when possible

Important matchup views:

- vs left-heavy / right-heavy lineups
- vs contact lineups
- vs chase-heavy lineups
- vs lift/power lineups
- pitch-type concentration vs hitter attack zones

## Phase 5: bullpen sequence model

This is later, not first.

We should not try to predict the whole bullpen tree until phases 1-4 are stable.

Eventually we want:

- first-up reliever
- second-up reliever class
- expected bullpen outs distribution across top arms

But this should wait until the simpler layers are trustworthy.

## Call-up / bullpen-change handling

We need bullpen-specific version of what we already do for probable starters.

Track:

- reliever first appearance for team
- recall / option / rehab activation timing
- role drift over first `3` appearances
- sudden bulk usage after being a short reliever
- unknown MLB sample flag

This matters because bullpen arms change role faster than starters.

## Immediate build order

This is the best sequence from here:

1. build `starter exit buckets`
2. grade them against actual starter outs
3. improve `team bullpen shape` and join it to the live board
4. derive `reliever arsenal concentration` from local pitch events
5. backtest first-up reliever prediction again with:
   - starter exit bucket
   - bullpen shape bucket
   - reliever usage features
6. only then add Savant reliever contact-quality allowed

## What to use on the live board first

Before we trust exact reliever names more, the board should surface:

- starter early-hook risk
- bullpen shape index
- 2-man containment vs scramble tendency
- bulk-first-up tendency
- first-up shortlist

That alone will make the late-game read much more honest.

## Best first experiment set

E27:

- predict starter exit bucket
- compare to actual outs bucket

E28:

- predict team bullpen shape bucket
- compare to actual:
  - relievers used
  - first-up outs bucket

E29:

- rebuild first-up reliever probabilities using:
  - starter exit bucket
  - bullpen shape bucket
  - existing reliever usage features

E30:

- derive reliever arsenal concentration from local pitch events
- test whether lineup-vs-relief fit improves:
  - late side stability
  - bullpen run projections
  - relief pitcher prop contexts

## Bottom line

The current bridge model is too narrow.

The correct bullpen system is:

- `starter exit`
- then `bullpen shape`
- then `first-up reliever`
- then `reliever-vs-lineup fit`

That is the right path to making MLB bullpen reads materially better instead of just prettier.
