# MLB Model Merge Roadmap — May 23, 2026

## Goal

Merge the current MLB work into one coherent prediction system that is:

- market-first
- state-aware
- regime-aware
- phase-specific
- deterministic
- harder to fool with fake `20-point edges`

The key change is philosophical:

- stop asking “who looks better from blended stats?”
- start asking “where is the market smoothing over the wrong game structure?”

## What We Are Merging

### Existing live pieces

- full-game deterministic side engine
- Tier 1 edge control
- Tier 2 leash/story overlays
- Tier 3 bullpen-command / third-time-through research indicators
- prop and HR tracking

### New research layers

- hidden-edge tables
  - whiff persistence
  - lead surrender / comeback resilience
  - form carryover
- rolling state snapshots
  - snapback pressure
  - top-order stress
  - heat/cold pressure
  - series carryover
- market-divergence research
  - price bucket hit rates
  - flat-unit ROI
  - favorite vs underdog lane behavior

## Core Design Shift

The current engine still behaves too much like:

- global composite score
- one confidence scale
- one volatility scale
- first five as a sliced full-game projection

The merged model should instead be:

1. `Market anchor`
2. `State and regime overlays`
3. `Phase-specific classifiers`
4. `Disagreement budget`
5. `Output tiering`

## Layer 1: Market Anchor

The betting line becomes the baseline prior, not just another feature.

Use:
- pick-side implied probability
- opponent implied probability
- favorite/underdog status
- price bucket
- flat-unit ROI by bucket

What this changes:
- a favorite can be correct and still overpriced
- a dog can be worse on paper and still the right bet
- large model disagreement should require evidence, not just composite alignment

Current useful read:
- moderate favorites with clean state/risk look healthier than heavy favorites under pressure
- heavy favorite hit rates can still hide weak or negative ROI

## Layer 2: State And Regime Overlays

These should no longer be “nice research notes.” They should become structured override lanes.

Most important current state lanes:
- opponent snapback pressure
- lead surrender gap
- carryover instability
- top-order stress
- bullpen-command mismatch

These are best used first as:
- confidence haircuts
- edge haircuts
- pass / watch filters

not as standalone pick engines.

## Layer 3: Phase-Specific Models

We should stop treating MLB like one market with cosmetic slices.

### Full game
Best for:
- moderate favorite clean lanes
- market-dog spots where late-game script support exists
- situations where bullpen / carryover / comeback behavior matter

### First five
Must become its own classifier.

Core features:
- starter leverage
- starter leash
- opponent snapback pressure
- top-order stress
- early tie/push risk
- series carryover

Do **not** let full-game late factors dominate this market.

### First inning
Later lane, but should be built explicitly as a timing market:
- first-batter command
- first-inning run environment
- top-3 pressure
- early whiff / take profiles
- pitcher early strike rate

## Layer 4: Disagreement Budget

This is the most important merge concept.

The model should not move the same distance from market in every game.

### Draft budget idea

- heavy favorite (`65%+` implied):
  - very small disagreement budget
  - large edge only allowed with clean state/risk and real starter + late support

- moderate favorite (`54-63%` implied):
  - modest disagreement budget
  - this is the most likely current full-game value lane

- toss zone (`45-54%` implied):
  - okay to disagree, but require phase clarity

- market underdog (`<50%` implied):
  - strongest evidence requirement
  - should rarely become a `Core` pick unless state/regime support is strong

This keeps the model from printing fake certainty just because the same baseline stats all point one way.

## Layer 5: Output Tiering

We should move away from one universal confidence number trying to do everything.

Recommended outputs:
- `Core`
- `Lean`
- `Watch`
- `Pass`

And separately:
- full-game suitability
- first-five suitability
- future first-inning suitability

This lets the system say:
- “full-game only”
- “first-five only”
- “watch but don’t force”
- “market right, no edge”

## Practical Merge Plan

### Phase A: Market-first full-game controls

1. keep market-divergence research rerunning after every graded slate
2. promote market price bucket into side export/history everywhere
3. use disagreement budget to cap large edges on heavy favorites
4. combine with existing Tier 1 / snapback / hidden-chaos haircuts

### Phase B: Real first-five classifier

1. keep first-five offline
2. use stateful first-five report to define `Pass / Watch / Lean`
3. only promote a live first-five lane once `Lean` separates clearly from `Pass`

### Phase C: Risk-vector replacement

Replace one broad `volatility` number with:
- starter-phase risk
- late-flip risk
- tie/push risk
- state break risk
- support-thinness risk

### Phase D: Future first-inning lane

Only after full-game and first-five are cleaner.

## Current Best Emerging Lanes

From the research so far:
- `moderate favorite clean` looks like the best current full-game favorite lane
- `heavy favorite danger` is the right place to shrink edges
- `opponent snapback` is the best current stateful fade
- `combined hidden-chaos stack` is the best hidden-edge haircut candidate
- `bullpen command mismatch` is the best current Tier 3 late-risk candidate

## What Not To Do

- do not keep inflating `modelEdge` from broad baseline agreement alone
- do not let first five remain a sliced full-game model
- do not trust one global volatility number
- do not treat price as just another input

## Bottom Line

The merged model should behave more like a trading desk:

- market sets the baseline
- state/regime tells us where the market may be smoothing too much
- phase models decide the right market expression
- disagreement budget stops fake certainty

That is the path from “team-ranking composite” to something that can actually hunt mispricing.
