# MLB Model Deep Pass — May 23, 2026

## Goal

Figure out why the current MLB side engine can still produce large paper edges that fail badly, especially:

- `20+` or `15+` model-edge games that lose outright
- first-five reads that are too close to coin-flip
- a single `volatility` number that is too broad to describe how a baseball game can actually fail

This note is focused on the live deterministic moneyline engine, not props or HR only.

## The Honest Current Model Type

The live MLB side path is **not a trained predictive model**.

It is a **feature-engineered heuristic composite** in:
- [/Users/jcchen/Documents/New project/web/src/lib/sports-model.js](/Users/jcchen/Documents/New%20project/web/src/lib/sports-model.js)

It combines weighted signals such as:
- market price
- standings profile
- starter ERA / record / strikeout ceiling
- hit-production baseline
- projected hit volume
- bullpen quality
- bullpen chain
- Statcast contact quality
- lineup-vs-pitching fit
- story context
- park and weather

Then it turns those into:
- `modelEdge`
- `confidence`
- `volatility`
- `starterLeverageIndex`
- `lateInningStabilityIndex`
- `coinflipPressure`
- `reliefPitchingRisk`

Then Tier 1 / Tier 2 controls shave the output.

So the current engine is:
- deterministic
- explainable
- structured
- but still mostly a **fixed-template scoring model**

That means it can be consistent without being smart enough about different game families.

## Current First-Five Reality

The first-five path is **not a separate real first-five model**.

It is derived from the same projected-hit/run engine as the full-game side:
- `first5ProjectedHits`
- `first5Runs`
- `first5EdgeTeam`

Those are built from the same core projected-hit framework, just with a `phase: 'first5'` conversion path in:
- [/Users/jcchen/Documents/New project/web/src/lib/sports-model.js](/Users/jcchen/Documents/New%20project/web/src/lib/sports-model.js)

### First-Five Results

Recent live/current window, `2026-05-16` through `2026-05-22`:
- first five strict: `41/93 = 44.1%`
- first five with ties as pushes: `41/76 = 53.9%`
- pushes/ties: `17/93 = 18.3%`
- full game over same span: `53/93 = 57.0%`

Reserve window, `2026-05-10` through `2026-05-15`:
- first five strict: `45/75 = 60.0%`
- first five with ties as pushes: `45/64 = 70.3%`
- pushes/ties: `11/75 = 14.7%`
- full game: `49/75 = 65.3%`

Combined, `2026-05-10` through `2026-05-22`:
- first five strict: `86/168 = 51.2%`
- first five with ties as pushes: `86/140 = 61.4%`
- pushes/ties: `28/168 = 16.7%`
- full game: `102/168 = 60.7%`

### What That Means

First five is not “dead,” but the **recent live/current path is too weak** to trust broadly.

The current first-five lane is:
- too derivative
- too broad
- not selective enough
- not built around tie/push-heavy environments

## Large-Edge Problem

Across `2026-05-10` through `2026-05-22`:

### Edge buckets

- `20+` edge: `4` games, full-game hit rate `0.500`
- `15-19.9`: `7` games, full-game hit rate `0.429`
- `10-14.9`: `9` games, full-game hit rate `0.667`
- `6-9.9`: `11` games, full-game hit rate `0.636`
- `<6`: `44` games, full-game hit rate `0.705`

That is the biggest warning in the system right now:

- the model is **not** using large `modelEdge` well enough
- a bigger edge is **not** reliably acting like a cleaner edge

### 15+ edge full-game results

The highest edges included:

- `2026-05-12 Rockies @ Pirates` — `26.6`, won
- `2026-05-13 Rockies @ Pirates` — `22.5`, lost
- `2026-05-10 Athletics @ Orioles` — `21.2`, lost
- `2026-05-14 Padres @ Brewers` — `20.0`, won
- `2026-05-10 Twins @ Guardians` — `19.4`, lost
- `2026-05-12 Giants @ Dodgers` — `18.3`, lost
- `2026-05-14 Cubs @ Braves` — `18.0`, lost/pushy first five

This is exactly the failure you called out:
- large stated edge
- actual game shape does not support the confidence implied by that edge

## Why Model Edge Is Too Easy To Inflate

The current `modelEdge` comes from the gap between adjusted side scores:
- [/Users/jcchen/Documents/New project/web/src/lib/sports-model.js](/Users/jcchen/Documents/New%20project/web/src/lib/sports-model.js)

And `baseConfidence` is then built from:

- `50`
- `+ modelEdge * 0.95`
- `+ coverageBonus`
- `+ agreementBonus`
- `+ market support`
- `+ context confidence modifier`

This is the core problem:

`modelEdge` is being treated as if it were a strong independent measure of truth, but it is still only the result of the same fixed-template weighted signal system.

That means:
- if the wrong signals align
- or if the same generic features all point the same way
- the engine can create a large edge without real behavioral support

## Why The Big Misses Happened

On current-window `10+` edge full-game misses, the top input labels were often:
- `Standings profile`
- `Hit-production baseline`
- `Starter ERA`
- `Market price`
- `Strikeout ceiling`
- sometimes `Projected hit volume`

That is a huge clue.

These are mostly **broad baseline signals**, not “how this game breaks” signals.

Examples:

### Marlins @ Rays — May 16
- edge `13.5`
- full game miss
- first five hit
- top inputs:
  - standings profile
  - hit-production baseline
  - starter ERA
- result:
  - clean early read
  - late collapse / bullpen-flip loss

### Red Sox @ Braves — May 16
- edge `11.7`
- full game miss
- first five hit
- top inputs:
  - standings profile
  - starter record
  - strikeout ceiling
- result:
  - early edge real
  - late hold fake

### Padres @ Mariners — May 17
- edge `16.8`
- full game miss
- first five miss
- top inputs:
  - projected hit volume
  - market price
  - strikeout ceiling
- result:
  - even the supposed starter edge was overstated

### Rangers @ Angels — May 22
- edge `13.9`
- full game miss
- first five miss
- top inputs:
  - starter ERA
  - standings profile
  - lineup-vs-pitching fit
- Tier 1 had already flagged it:
  - `highVolatilityEdgePass`
  - `highRiskPoints`

This suggests the model is still too willing to let:
- standings
- recent baseline offense
- basic starter lines
- partial lineup fit

create a large edge **without enough behavioral confirmation**.

## The Single Volatility Problem

Your criticism is correct: `volatility` is too broad.

Right now it is one scalar that absorbs many different failure modes:
- even projected hit volume
- high posted totals
- shallow starter samples
- bad ERAs
- HR leakage
- lineup fit pressure
- bullpen stress
- story instability
- underdog strength
- weather effects

That is useful as a warning light, but not enough as a model control.

### Problem

Baseball games do not “fail” in one generic volatile way.

They fail in different ways:
- early starter collapse
- first-five tie
- late bullpen flip
- quiet-through-five then break
- fake favorite with broad but shallow support
- top-heavy offense dead early
- opponent comeback pressure

Those are different risks.

A single `volatility` number hides them.

## What The Model Should Use Instead

Replace one `volatility` scalar with a **risk vector**.

Suggested MLB risk axes:

1. `starter_phase_risk`
- how likely the starter edge is to fail early

2. `first5_tie_risk`
- how likely the first-five market is to push / stay even

3. `late_flip_risk`
- how likely the game is to change once the starter exits

4. `support_thinness_risk`
- how much the edge is built on generic or shallow support

5. `form_fragility_risk`
- how likely recent form is lying or close to breaking

6. `script_disagreement_risk`
- how much the starter, offense, bullpen, and story layers disagree about game shape

7. `event_state_risk`
- how vulnerable the game is to sequencing, comeback, or traffic-without-conversion weirdness

That would be much more useful than one broad volatility score.

## Fixed-Template Weighting Is Also A Problem

The model is deterministic, but too often **same-architecture deterministic**.

That means it still behaves as if the same kinds of features matter in roughly the same structure every day.

That is the wrong mental model for baseball.

### We need conditional/regime weighting instead

Examples:

- In a clean starter-driven game:
  - starter features should matter more
  - bullpen less

- In a shallow-start / taxed-bullpen game:
  - bullpen and chain should matter more
  - broad starter surface stats should matter less

- In a top-heavy lineup game:
  - depth metrics should matter less
  - concentration risk should matter more

- In a tie-prone low-event first-five game:
  - first-five edge should require stricter separation
  - generic starter advantage alone should not be enough

So the engine should become:
- deterministic
- but **regime-aware**

## What Story/Streak Inputs Are Actually Doing

Important correction:

The model is **not literally** saying:
- “Cubs are on a losing streak, so they’ll lose again.”

Story context is softer than that.

The story score is built from:
- `offenseSustainability`
- `starterTrajectory`
- `bullpenTrust`
- `lineupMomentum`
- `variance`

And things like a live losing streak mostly show up as:
- volatility bumps
- confidence trims
- favorite fragility notes

So the system is not that dumb.

But the broader problem remains:
- it still treats state/context too generically
- instead of learning when form persists, breaks, or becomes misleading

That’s why the new hidden-edge tables matter.

## Best Immediate Direction

### 1. Build a true first-five model

Not a derived slice of the full-game engine.

A real first-five model should emphasize:
- starter leverage
- starter leash
- top-third lineup pressure
- early whiff persistence
- early scoring timing
- first-five tie propensity
- opponent early comeback / settling behavior

And it should de-emphasize:
- full-game bullpen path
- broad late-game environment

### 2. Cap large edges harder

Before any side is allowed to show `15+` or `20+` edge, require:
- broad evidence support
- starter/late agreement
- low script disagreement
- low hidden-chaos flags

If those are missing, the edge should be compressed automatically.

### 3. Replace “volatility” with risk family controls

Keep the scalar for UI simplicity if needed, but build decisions off:
- starter risk
- tie risk
- late-flip risk
- support-thinness risk
- form-fragility risk

### 4. Demote generic baseline features in unstable games

When a game is unstable, things like:
- standings profile
- broad hit-production baseline
- starter ERA

should not be allowed to dominate the edge by themselves.

### 5. Use hidden-edge tables as edge haircuts

The strongest hidden-edge offline candidate right now is the combined flag from:
- opponent comeback pressure
- hidden chaos stack

That is a much better future edge-control lane than generic streak logic.

## Recommended Build Order

1. first-five deep research pass
   - find which current first-five game families are actually positive
   - separate pushes/ties explicitly

2. regime classifier
   - starter-driven
   - tie-prone first five
   - bullpen-chaos
   - fake-form favorite
   - top-heavy offense variance

3. conditional weighting
   - same deterministic engine, different weights by regime

4. multi-axis risk vector
   - keep scalar volatility only as a display summary

5. large-edge compression rules
   - especially for `15+` and `20+`

## Bottom Line

The current engine is:
- structured
- useful
- deterministic
- but too willing to create large edges from broad baseline agreement

That is exactly how you get:
- “20-point edge”
- then a side gets blown out

The fix is **not** randomness or ML-for-the-sake-of-ML.

The fix is:
- separate markets properly
- classify game families first
- use risk vectors instead of one volatility number
- compress big edges unless the right type of support is actually present
