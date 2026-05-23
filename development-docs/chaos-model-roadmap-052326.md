# Chaos Model Roadmap

## Why The Current MLB Model Is Failing

The current MLB side model is too good at predicting averages and too weak at predicting a single game's actual path.

What it does well:
- summarizes broad paper strength
- estimates average starter, lineup, bullpen, and run-environment advantages
- behaves like a decent repeated-simulation model if the same game were played many times

What it does badly:
- overstates favorite edges
- turns warnings into commentary instead of vetoes
- treats most games as if one scoring recipe applies
- predicts central tendency instead of likely game scripts
- fails to separate `better team` from `better bet today`

This is the core lesson:

`baseball is chaos with a drop of talent`

The better team still loses often. Strong teams rarely deserve giant single-game edges. A model that keeps printing loud MLB edges is almost certainly overstating certainty.

## What The Model Needs To Become

The next model should not mainly answer:

- who is better on average?

It should answer:

- what is the market expecting?
- what kind of game is likely tonight?
- what kinds of failure paths are live?
- which bet expression survives the most scripts?
- should this game be a pass?

The new system should be:
- market-relative
- story-aware
- state-aware
- phase-aware
- nonlinear
- abstention-first

## Core Principles

### 1. The Market Is The Benchmark, Not The Boss

The line is not truth, but it is the baseline expectation.

Our job is:
- prove the market right
- or prove it wrong
- and only bet when we can explain the disagreement

The model should stop producing generic team-strength edges and start producing mispricing arguments.

### 2. Confidence Must Mean Trust, Not Enthusiasm

A game can be:
- `56% to win, high trust`
- `62% to win, low trust`

Those are very different.

The board should stop treating confidence as "how much we like the side" and start treating it as "how trustworthy this estimate is."

### 3. Warnings Must Become Vetoes

If the system sees:
- snapback pressure
- fragile favorite structure
- early crack risk
- dead-bat shape
- late chaos
- lineup uncertainty

then the official output should often become:
- `Pass`

not:
- pick plus yellow tape

### 4. Most MLB Games Should Be Passes

The current board is too eager.

A good MLB model should probably produce:
- a small playable group
- a larger watch group
- many passes

If the model cannot narrow the slate, it has not earned action.

## The Chaos Model Stack

### Layer 1: Market Expectation

Store and model:
- moneyline implied probability
- first-five implied shape
- total / phase total expectations
- favorite price tier
- underdog live-ness by price

Goal:
- define what the market already expects

### Layer 2: State And Story Features

Use current warehouse features plus new labels to describe:
- streak stretch
- snapback pressure
- heat regression
- team form pressure
- top-order pressure
- hitter cold / heat state
- bullpen stress
- series state
- divisional familiarity
- pitcher-batter memory

Goal:
- describe what is live right now, not what was true in the abstract

### Layer 3: Regime Classifier

Every game should first be classified into one or more regime families:
- stable favorite
- fragile favorite
- bounceback dog
- dead-bat game
- starter-only edge
- late-chaos game
- first-inning jolt game
- bullpen-flip game
- pass

Goal:
- stop using one recipe for every game

### Layer 4: Scenario Simulator

The model should move from a single point estimate to a script distribution.

Examples:
- starter duel
- favorite jumps early
- underdog snapback
- bullpen flip
- dead-bat all night
- first-inning crack
- late comeback

This does not need to start pitch-by-pitch. A lightweight phase simulator is enough:
- inning 1
- innings 2-4
- inning 5
- innings 6-7
- innings 8-9

Goal:
- estimate how many ways the bet can win or fail

### Layer 5: Market-Specific Decision Models

We should not share one core model across all markets.

Separate models should exist for:
- full game moneyline
- first five moneyline
- first inning run yes/no
- full game total
- first five total
- props

Goal:
- let each market care about the right features

### Layer 6: Abstain Unless The Edge Survives Chaos

The last layer should ask:
- does this edge still hold across the major live scripts?
- is the disagreement with the market specific and defensible?
- are there too many failure paths?

If the answer is unclear:
- `Pass`

## Why The Existing Data Is Valuable

The project already has the right raw ingredients:
- odds and market snapshots
- lineups
- starters
- bullpen structure
- plate appearances
- pitch events
- story signals
- state snapshots
- hidden-edge tables
- prop history
- Savant links and player-level inspection paths

The problem is not lack of data.

The problem is that the data is still being compressed into overly smooth conclusions.

We now need to convert the data into:
- time-local state
- soft labels
- story regimes
- market-relative targets

## Time-Local Modeling Rules

### The Main State Window Should Be 30 Days

For live MLB:
- last 30 days should drive the main state
- last 7-14 days should capture pressure and adjustment
- season-to-date should act as a weak stabilizer only

Why:
- players adjust
- pitchers change shape
- lineups change role and confidence
- teams change identity through the season

Examples:
- April Sasaki is not late-May Sasaki
- early-season Dodgers are not current-series Dodgers

### Use Multiple Windows

Recommended windows:

- teams: last `8`, `15`, `30` games
- starters: last `3`, `5` starts
- hitters: last `15`, `30`, `60` plate appearances
- bullpens: last `7`, `14` days
- season: low-weight prior only

### Add Change-Point Flags

We need to detect meaningful shifts like:
- velocity jump or drop
- pitch-mix change
- walk-rate swing
- home-run leakage swing
- lineup-slot change
- leash change
- return from injury
- hitter swing-decision change

These are "story pivots" and should discount stale data quickly.

## Labels We Need

The data is rich, but the missing ingredient is labeled chaos.

We need new labels at four levels.

### 1. Game Story Labels

Examples:
- early crack
- starter duel
- dead-bat game
- bullpen flip
- comeback win
- fake favorite
- snapback success
- overheat regression

### 2. Phase Outcome Labels

Examples:
- scoreless first inning
- run in first inning
- starter survives 5
- starter cracks before 4
- lead after 5 holds
- lead after 5 is lost
- game changes after bullpen entry
- offense stays dead after early whiff trouble

### 3. Market Mispricing Labels

Examples:
- favorite overpriced
- dog live for structural reason
- first five better than full game
- total cleaner than side
- no edge / pass

### 4. Human Override Labels

These should capture the kinds of reads a human is actually making:
- fake favorite
- hot series carry
- bounceback spot
- cold bats
- pitcher not right today
- dead team energy
- dangerous home dog

These are important because human intuition is acting as a live regime detector the current model does not yet match.

## Human Baseball Memory Matters

The model needs more than broad form. It needs live baseball memory:

- current series
- previous series loss
- divisional familiarity
- same pitcher seen recently
- same lineup seeing the same arsenal again
- bullpen burn from yesterday
- emotional shape after blowout / collapse / comeback

The players are not living in a spreadsheet. They are living in:
- this series
- this division
- this pitcher
- this slump
- this confidence state

That means the model should prioritize:
- recent and relevant memory
- repeated exposure
- current pressure

over:
- stale season averages

## Pitcher-Batter Memory And Pitch-Shape Memory

Raw career H2H is too noisy by itself, but memory still matters.

What should matter more:
- recent H2H
- recent same-series exposure
- pitch-mix similarity
- whiff / chase / quality-of-contact discomfort against this shape

We should model:
- `this hitter struggles against this arsenal`
- `this lineup has seen this shape well`
- `this pitcher loses comfort third time through`

not just:
- `career BA against pitcher`

## Multiple Types Of Variance

One volatility number is too broad.

We need multiple variance lanes:
- starter execution variance
- lineup realization variance
- top-order ambush variance
- bullpen bridge variance
- snapback / pressure variance
- series carryover variance
- first-inning tie / run variance
- late flip variance

This lets us describe a game more honestly:
- stable early, unstable late
- dead bats, but bullpen chaos
- good favorite, but only in one narrow script

## What The UI Should Eventually Say

The board should stop leading with giant fake certainty.

It should instead lead with:
- market expectation
- our fair expectation
- variance profile
- story family
- best expression
- play / watch / pass

And it should explain:
- why the favorite is fragile
- why the dog is live
- when the game tends to break
- which phase is actually bettable

This is the shift from:
- numbers pretending to be story

to:
- numbers generating a usable story

## Realistic Engineering Options

### Option A: Tree-Based Nonlinear Models

Good first ML step:
- gradient-boosted trees
- calibrated classifiers
- separate by market

Why:
- they handle interaction effects better than linear composites
- they are easier to train and debug than deep sequence models
- they work well with mixed feature types

### Option B: Mixture-Of-Experts

Have different submodels for:
- stable favorite spots
- fragile favorite spots
- bounceback dog spots
- dead-bat / under spots
- late-chaos spots

And a gating model that decides which expert matters most.

### Option C: Lightweight Scenario Simulator

Not pitch-by-pitch at first.

Instead:
- simulate early / middle / late phases
- use starter phase profiles, lineup pressure, bullpen chains, snapback, and scoring timing

This gives a path distribution rather than a single score.

### Option D: LLM-Assisted Labeling And Story Rendering

The LLM should probably not be the core numeric predictor.

It should help with:
- turning articles, Savant pages, notes, and dashboards into structured tags
- weak-labeling story states
- generating human-readable story explanations from structured outputs
- comparing market story vs our story

The numeric decision core should remain structured ML plus simulation.

## Recommended Near-Term Warehouse Additions

The next useful derived tables are:

- `mlb_pitcher_state_daily`
- `mlb_hitter_state_daily`
- `mlb_adjustment_flags`
- `mlb_story_labels_daily`
- `mlb_series_state_daily`
- `mlb_pitcher_batter_memory_daily`
- `mlb_pitch_shape_matchup_daily`
- `mlb_divisional_familiarity_daily`
- `mlb_market_mispricing_labels`
- `mlb_phase_outcomes_daily`

## Recommended Product Changes

Before the next live betting push:

1. hard-gate bad picks instead of soft-haircutting them
2. make `Pass` the default
3. remove giant edge language
4. demote raw confidence from headline status
5. promote story categories and best-expression labels
6. separate full game, first five, and first inning into different models

## Practical Roadmap

### v1.2
- convert warnings into vetoes
- shrink disagreement budget sharply
- remove most playable lanes
- make `Play / Watch / Pass` the primary output
- keep first five and first inning research-only

### v1.3
- add daily pitcher/hitter state tables
- add series state and pitcher-batter memory
- create soft story labels
- train first market-specific nonlinear classifiers

### v2
- add regime classifier
- add scenario simulator
- use script distribution to choose best market expression
- allow only edges that survive chaos

## Bottom Line

The project does not need more generic averages.

It needs:
- better labels
- time-local state
- nonlinear interactions
- phase-specific models
- script distributions
- hard passes

The value is already in the data.

The next project is to teach the system how to read that data as:
- human pressure
- baseball memory
- live chaos
- and market mispricing

That is the real path from:
- average model

to:
- chaos model
