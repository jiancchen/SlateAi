# MLB Feature Roadmap 05-22-26

## Goal

Use the current data more intelligently before we change the live model. The goal of this pass is:

1. improve edge control with the data we already have
2. use the new warehouse to build script-risk features
3. use event-state data to find the `when` triggers
4. make the model better at saying `pass`

## Dataset Windows Used

This pass intentionally uses two windows:

- **Reserve window**: `2026-05-10` through `2026-05-15` from the older `board-moneyline-v2` backtest tables
- **Current window**: `2026-05-16` through `2026-05-22` from the current graded history archive

That split is not perfect, but it is useful:

- the reserve window gives us older held-out games
- the current window tells us how the more recent model behavior is breaking now

| Window | Games | Hit rate | Avg edge | Avg volatility |
| --- | --- | --- | --- | --- |
| Reserve (`05-10` to `05-15`) | 75 | 0.653 | 7.0 | 79.9 |
| Current (`05-16` to `05-22`) | 93 | 0.581 | 8.7 | 87.6 |
| Combined | 168 | 0.613 | 8.0 | 84.2 |

## Current Input Map

The side model is already using more than just “starter + weather + recent form.” Current live inputs effectively include:

- starter quality and recent starter form
- short-start / hold / leash shape
- lineup matchup context and platoon pressure
- likely bridge chain and bullpen exhaustion
- market price and totals context
- park and weather
- Statcast contact quality
- projected hit volume through first five, late game, and bridge window
- volatility modifiers and decision indicators

That is enough to create a **probabilistic edge**, but not enough to trust every large edge without stronger script control.

## What The Current Data Already Says

### Edge Buckets
| Bucket | Games | Hit rate |
| --- | --- | --- |
| `<5` | 70 | 0.643 |
| `5-10` | 40 | 0.575 |
| `10-15` | 34 | 0.588 |
| `15-20` | 18 | 0.667 |
| `20+` | 6 | 0.5 |

### Volatility Buckets
| Bucket | Games | Hit rate |
| --- | --- | --- |
| `<70` | 20 | 0.45 |
| `70-79` | 33 | 0.818 |
| `80-85` | 16 | 0.562 |
| `86-89` | 7 | 0.571 |
| `90+` | 92 | 0.587 |

### Starter vs Late Stability Divergence
| Bucket | Games | Hit rate |
| --- | --- | --- |
| `starter - late >= 20` | 98 | 0.52 |
| `starter - late >= 30` | 71 | 0.592 |
| `starter - late >= 40` | 49 | 0.653 |

## Backtest: Candidate Edge-Control Rules

These are not live model changes yet. They are research overlays on top of the existing prediction outputs.

### High-volatility edge control v1

Pass if `volatility >= 86 && pointEdge >= 10 && (late stability <= 48 || starter leverage >= 75)`

| Window | Kept | Kept hit rate | Passed | Passed hit rate |
| --- | --- | --- | --- | --- |
| Reserve | 71 | 0.676 | 4 | 0.250 |
| Current | 68 | 0.588 | 25 | 0.560 |
| Combined | 139 | 0.633 | 29 | 0.517 |

Note: Best simple pass rule that improved both the reserve window and the current window without collapsing coverage.

### Thin-support high edge

Pass if `pointEdge >= 12 && inputCount <= 3`

| Window | Kept | Kept hit rate | Passed | Passed hit rate |
| --- | --- | --- | --- | --- |
| Reserve | 59 | 0.695 | 16 | 0.500 |
| Current | 63 | 0.556 | 30 | 0.633 |
| Combined | 122 | 0.623 | 46 | 0.587 |

Note: Useful penalty flag, but too blunt to use as a full pass rule by itself.

### Extreme volatility giant edge

Pass if `volatility >= 90 && pointEdge >= 15`

| Window | Kept | Kept hit rate | Passed | Passed hit rate |
| --- | --- | --- | --- | --- |
| Reserve | 73 | 0.671 | 2 | 0.000 |
| Current | 85 | 0.576 | 8 | 0.625 |
| Combined | 158 | 0.620 | 10 | 0.500 |

Note: Small sample, but these are exactly the scary false-control spots we keep remembering.

### Risk points `>= 3`

Flag as dangerous if 3+ of: `vol>=88`, `edge>=12`, `late<=45`, `starter>=85`, `coin>=50`, `relief>=65`, `inputs<=3`

| Window | Kept | Kept hit rate | Passed | Passed hit rate |
| --- | --- | --- | --- | --- |
| Reserve | 41 | 0.707 | 34 | 0.588 |
| Current | 15 | 0.600 | 78 | 0.577 |
| Combined | 56 | 0.679 | 112 | 0.580 |

Note: Much more useful as a confidence classifier than a blanket pass rule. The kept bucket becomes a strong candidate for `Core`/`Lean` only.

## Warehouse Feature Inventory

- `mlb_game_story_signals`: 765 games from `2026-03-26` through `2026-05-22`
- `mlb_plate_appearances`: 14037 rows from `2026-05-09` through `2026-05-22`
- `mlb_pitch_events`: 63561 rows from `2026-05-09` through `2026-05-22`
- The pitch table already includes `balls`, `strikes`, `pitch type`, `call`, `zone`, `velocity`, and `in-play` flags.
- The plate-appearance table already includes `base state`, `score before/after`, `inning`, `starter vs relief context` (via pitcher appearances), and scoring deltas.

## Tier 1: Highest-Value Features To Add Now

- **High-volatility edge haircut**
  Apply a post-edge control rule before surfacing a side as strong. The best simple rule from this pass was:
  `volatility >= 86 && pointEdge >= 10 && (late stability <= 48 || starter leverage >= 75)`.
- **Starter-vs-full-game split penalty**
  Penalize games where `starterLeverageIndex` is high but `lateInningStabilityIndex` is weak. This is the cleanest immediate way to stop starter edge from pretending to be full-game certainty.
- **Thin-support penalty**
  If a large edge is being built from only 2-3 inputs, shave confidence and edge before ranking it. Big edges need a richer evidence stack than `Starter ERA + Projected hit volume + Market price`.
- **Pass / lean / core classifier**
  Use the risk-points approach as a labeler, not just a pass rule:
  - low risk: eligible for `Core`
  - medium risk: `Lean`
  - high risk: `Pass` or `watchlist`
- **Opponent-adjusted recent form**
  We already have rolling form tables. The next improvement is to stop treating “hot against weak arms” the same as “hot against real rotations”.


## Tier 2: Medium-Lift Features From Existing Warehouse Data

- **Rolling story priors by team**
  From `mlb_game_story_signals`, build team-level trailing rates for:
  - quiet through five
  - first-inning jolts
  - comeback wins / blown leads
  - bullpen flips
  - traffic-without-conversion
- **Lineup dependency concentration**
  Use `mlb_player_game_batting` to measure how much production is concentrated in 2-3 bats. Teams that overdepend on a few players should be downgraded when those hitters are in bad pitch-type or leverage spots.
- **Starter leash profile**
  Turn recent starts into a numeric expected-leash feature:
  - pitch count trend
  - innings trend
  - short-start frequency
  - return / rehab / call-up penalty
- **Bullpen chain mismatch**
  We already export likely bridge chains. Next step is to score whether the predicted scoring environment is relying on exactly the bullpen archetype the opponent handles well.
- **Series / divisional familiarity**
  Add simple categorical context for division series, getaway day, and repeat-opponent familiarity. This is not magic, but it is a cheap contextual feature we currently underuse.


## Tier 3: Big Warehouse / Play-By-Play Features

- **Reliever first-batter command**
  From `mlb_pitch_events`, track what happens in a reliever’s first 5 pitches and first batter after entry:
  - early balls
  - first-pitch strike rate
  - zone misses
  - chase vs non-chase contact
- **First-inning approach profile**
  By lineup and team:
  - first-pitch take rate
  - first-inning swing-and-miss rate
  - first-inning hard contact vs empty contact
- **Third-time-through trouble**
  Use plate appearances and pitcher appearances to tag when starters truly fall off the second/third time through.
- **Pitch-type trigger features**
  Build specific “when” features:
  - lineup patience vs fastball-heavy starters
  - changeup / slider trouble once bullpens enter
  - where strike-throwing falls apart after a pitcher mix change
- **Base-state conversion**
  Move beyond average offense into event-state offense:
  - runners-on conversion
  - empty-base padding vs leverage hitting
  - traffic-without-conversion as a recurring team trait


## Recommended Order

1. Add the **Tier 1 edge-control overlays** first and backtest them before changing any deeper scoring.
2. Build **rolling story priors** and **lineup dependency concentration** next.
3. Start mining event-state features only after the pass/lean/core classifier is behaving better.

## Best Immediate Experiment

The best first production experiment from this pass is:

1. add a high-volatility edge-control rule
2. turn the risk-point stack into a `Core / Lean / Pass` classifier
3. backtest that classifier against the reserve window before changing the raw side scores

This is the cleanest way to use the new warehouse depth without pretending we are ready for a full play-by-play model rewrite yet.
