# MLB-M3 Constitution

Status: active guidance

Last updated: 2026-06-03

Purpose: keep MLB-M3 aligned with its actual model-family philosophy during long implementation runs.

This document should be read before any MLB-M3 architecture, feature, harness, training, backtest, or promotion work.

## Core Identity

MLB-M3 is not a run-total predictor.

MLB-M3 is a baseball state, game path, and contract-pricing model family.

It should learn how a game can unfold through starter path, traffic, count/base/out state, bullpen exposure, reliever chain, lineup turnover, hitter-event distributions, and market context. Final scores and props are downstream expressions of that game path, not the root objective.

## Non-Negotiables

1. Model baseball state and sequence before final outputs.

   Preserve pitch, PA, inning, base/out/count, score, pitcher, batter, lineup, and reliever-chain state. Do not crush game stories into averages unless the raw sequence remains available.

2. Treat ingestion as truth preservation, not feature opinion.

   Ingestion should answer what happened, where it came from, and what was known at the time. It should not decide that a player is hot, cold, fixed, broken, trending up, or trending down.

3. Keep feature engineering point-in-time.

   Every feature must be computable using only information available before the game or market decision being evaluated. No validation residuals, settled outcomes, same-day final state, or future games may leak into a training or prediction row.

4. Do not encode arbitrary windows as truth.

   A fixed window like last 3, last 5, last 7, or last 10 is an experiment candidate, not baseball truth. If a window exists, the run must say why it exists, what it competes against, and how it will be rejected.

5. Do not recreate M2 with relocated weights.

   No M2-style `0.2 * this + 0.3 * that` logic should become the model. Hand-written state transforms are allowed only when they preserve event truth, define targets, or create testable point-in-time views.

6. Use baselines, slopes, and streaks as representations, not conclusions.

   A baseline is context. A slope is one possible representation of change. A streak is a state hypothesis. None of them should become a single magic score that hides the underlying evidence.

7. Separate component families.

   Game-shape, starter path, reliever availability, first-up reliever routing, reliever performance, PA/event distributions, hitter stat distributions, calibration, market pricing, and selection policy are separate components with typed contracts.

8. Player props are downstream, not bolted on.

   Hits, total bases, HR, RBI, runs, walks, Ks, starter outs, reliever workload, and team totals should consume the same game-state and event-distribution spine. They should not be separate isolated models that ignore game path.

9. Evaluate the contracts that matter.

   If the product contract is F5 O/U with a known line, full-game O/U with a known line, moneyline, team total, or player prop, evaluation must grade that contract. Average-run MAE is not a top-level M3 success metric.

10. No promotion without real evidence.

   No picks, prices, market fair probabilities, simulator claims, edge claims, or active-model promotion until contract-level backtests, calibration checks, settlement joins, and rejection gates are satisfied.

## Metric Hierarchy

Average-run MAE is allowed only as a point-head smoke diagnostic.

It must not be used as the top-level M3 promotion gate.

Preferred evaluation layers:

1. Data integrity and point-in-time validity.
2. Regime target quality: low-run, normal, high-run, chaos, blowout, starter-crack, bullpen-flip, traffic-no-conversion.
3. Distribution quality: interval coverage, pinball loss, CRPS-style scoring, tail coverage, regime-conditioned coverage.
4. Line-conditioned probability quality: F5 O/U at known line, full-game O/U at known line, team totals, moneyline-style contracts.
5. Prop-distribution quality: player PA/event/stat distributions, starter outs/Ks, reliever workload/performance.
6. Market and settlement quality: calibration, closing-line movement, known price comparison, settlement, drift monitoring.
7. Selection policy, only after probability and market layers are valid.

If a run optimizes average-run MAE, it must be labeled point-head diagnostic only.

## Pipeline Responsibilities

### Ingestion

Ingestion preserves canonical event truth:

- game identity, teams, venue, start time, source lineage
- pitcher and batter IDs
- pitch index, PA index, inning, half-inning
- balls, strikes, outs before and after
- base state before and after
- score before and after
- pitch type, velocity, location, call, result
- PA event result, runs, RBI, walks, strikeouts, contact, whiff
- pitcher role, entry order, first inning, first half
- raw source payload and source version

Ingestion should avoid derived opinions like hot labels, fixed window claims, or model scores.

### Feature Layer

The feature layer builds point-in-time views from canonical event history.

Allowed feature families include:

- talent baselines with provenance and uncertainty
- deviation from prior baselines
- trend candidates with competing horizons or decay functions
- change-point and volatility representations
- sparse-data reliability fields
- pitcher pitch-mix and command-state history
- batter event history against pitcher types, pitch types, zones, count states, and reliever-chain phases
- starter exit, hook, traffic, and crack-path views
- reliever availability, reset, router, and performance views
- lineup and PA-volume state views
- team travel, rest, series, timing, and context views

The feature layer should preserve enough detail to test multiple interpretations later.

### Model Layer

The model layer learns which point-in-time representations matter for each contract.

The model layer should prefer:

- component-specific learners over one generic all-feature learner
- regime-conditioned distributions over smooth average outcomes
- uncertainty-aware sparse-data handling
- fold-safe calibration
- modular replacement of component families

### Market Layer

The market layer compares contract distributions to known lines and prices.

It must stay separate from:

- feature extraction
- model probability generation
- simulator event generation
- selection policy

## Feature Hypothesis Card

Every new feature family or model component should start with a card like this:

```text
Hypothesis:
What baseball story are we trying to capture?

Required event truth:
What raw/canonical data must exist?

Point-in-time view:
What did we know before this game or market decision?

Target/contracts:
Which outputs should this help?

Bad encodings:
What lazy feature would corrupt the idea?

Rejection test:
How can this hypothesis fail honestly?
```

Example:

```text
Hypothesis:
A starter with rising command stress and traffic clusters against a patient lineup has elevated early-collapse risk.

Required event truth:
Pitch-level ball/strike state, walks, pitch count, PA traffic, base/out state, lineup chase/walk tendencies.

Point-in-time view:
All prior starts and pitches before today's game, with sparse-data reliability.

Target/contracts:
Starter-crack flag, F5 chaos, opponent F5 over, starter outs under, hitter RBI/run props.

Bad encodings:
last_5_ERA, hot/cold label, one fixed command score.

Rejection test:
Fails if it does not improve fold-safe starter-crack calibration or F5 line-conditioned probability.
```

## Run Plan Vision Check

Every MLB-M3 run plan should answer:

- Is this modeling baseball state/path, or generic final score?
- Is average-run MAE present only as a point-head smoke diagnostic?
- Are arbitrary windows avoided or treated as experiments?
- Are pitch/PA/base-out-count-score sequences preserved?
- Are starter path and reliever chain represented separately?
- Are market/prop contracts visible downstream?
- Does the run include a fold-safe rejection test?
- Are picks, prices, simulator claims, and promotion decisions explicitly out of scope unless proven?

## Red Flags

Stop and reframe if a run starts to center on:

- generic all-feature ridge as the model
- candidate beats train-mean MAE as the main promotion gate
- last_5, last_7, or last_10 as truth
- hot/cold labels without event-state evidence
- hidden M2-style weights
- expected AB as a fixed input rather than game-path output
- residual shells treated as real probability models
- regime labels used only after the fact
- market lines ignored in evaluation
- player props modeled independently from game path

## Current Correction

The Alpha-7 diagnostic distribution work is useful infrastructure, but it is not the real MLB-M3 model.

The current ridge point head and train-mean MAE baseline are smoke diagnostics only.

The next valid direction is to build evaluation and feature work around contract-level baseball state:

- F5 and full-game O/U at known lines
- chaos and low-run regime calibration
- starter-crack and bullpen-flip targets
- starter exit and reliever-chain distributions
- PA/event distributions that feed hitter and pitcher props

The guiding question is not:

```text
Can we predict average runs slightly better?
```

The guiding question is:

```text
Can we represent the baseball state well enough to price the right downstream contract with calibrated uncertainty?
```
