# MLB-M2 Boundary Audit

Created: 2026-06-02

## Executive Read

MLB-M2 is useful, but it is not a narrow model cartridge yet. It currently behaves like a bundled prediction application.

The cartridge includes:

- feature extraction
- signal engineering
- probability scoring
- confidence scoring
- calibration imports
- board selection policy
- risk controls
- legacy compatibility
- explanation text
- UI/export shaping

That is why model iteration feels unstable. A run can change because the scorer changed, but it can also change because feature construction, calibration, selection thresholds, prose/output shape, or generated compatibility files changed.

The right move is to pause heavy model tuning and first define the layer boundaries that make future tuning measurable.

## Evidence In The Current Code

The current public adapter looks narrow:

```js
export const createSportsMatchModel = createSportsMatchModelFactory({
  buildAnalysisModel,
  buildPlayerProps: buildMlbPlayerProps
})
```

But the imported implementation is broad.

Current file sizes:

| File | Approx lines | Role today |
|---|---:|---|
| `models/mlb/cartridges/MLB-M2/lib/mlb-props.js` | 1,243 | prop features, probabilities, confidence, calibration, selection, explanations |
| `models/mlb/cartridges/MLB-M2/lib/mlb-analysis-context.js` | 3,472 | side/game features, projections, indicators, risk flags, context, explanation payload |
| `models/mlb/cartridges/MLB-M2/lib/analysis-model.js` | 621 | final side scoring, tiering, market shape, output payload |
| `models/mlb/cartridges/MLB-M2/lanes/props.mjs` | 449 | prop lane orchestration and legacy DB reads |
| `models/mlb/cartridges/MLB-M2/lanes/sides.mjs` | 479 | side lane orchestration and export |

The props file alone contains:

- generated calibration import
- hardcoded board thresholds
- Poisson probability functions
- batter approach/repeatability logic
- expected PA logic
- Statcast and total-bases shadow logic
- weather/sun/lineup adjustments
- confidence clamps and deltas
- reasons/script tags/presentation text
- tracked board filtering

That is not wrong as early-stage code. It is exactly what happens when a useful system grows fast. But it is now too wide to be a clean hot-swappable model.

## Core Smell

The interface says:

```text
model cartridge
```

The implementation behaves like:

```text
feature builder + scorer + calibrator + policy engine + explainer + board exporter
```

This makes these questions hard to answer:

- Did M2 improve because the scorer is better?
- Did it improve because a feature changed?
- Did it improve because bad rows were filtered out?
- Did generated calibration drift?
- Did the UI/export shaping change what we counted?
- Did a partial lineup silently compress confidence?

Until those layers are separated, backtests can look more precise than they really are.

## Layer Problems

### 1. Feature Engineering Is Embedded In Scoring

Examples in the current prop path include expected plate appearances, rate weighting, hitter repeatability, approach state, Statcast multipliers, weather run lift, lineup status penalties, and starter walk pressure.

Those are feature rows. They should be materialized or queryable from DB-backed feature views before the scorer runs.

Target example:

```text
mlb_player_prop_feature_rows
  run_id
  feature_snapshot_id
  game_id
  player_id
  team_id
  opponent_team_id
  prop_type
  expected_pa
  season_hit_rate
  recent_hit_rate
  career_power_index
  statcast_power_signal
  matchup_factor
  contact_factor
  form_factor
  team_traffic_factor
  starter_walk_pressure
  weather_run_lift
  sun_visibility_risk
  lineup_status
  tiny_sample_flag
  source_freshness_status
```

Then the model head can score a stable input row.

### 2. Calibration Is Imported As Generated Code

Current smell:

```js
import { mlbPropCalibration } from '../generated/mlb-prop-calibration.generated.js'
```

This is workable, but not ideal for reproducibility.

Calibration should become DB data:

- `calibration_runs`
- `calibration_slices`
- `calibration_metrics`

Prediction rows should store:

- `calibration_id`
- `model_head_id`
- `feature_snapshot_id`
- `run_id`

Then a backtest can always identify which calibration slice was active.

### 3. Selection Policy Is Mixed With Probability Scoring

Current prop selection has thresholds like:

```text
minConfidence
minSupport
maxPerTeam
maxPerGame
minTrackingScore
```

Those are board policy, not model intelligence.

Changing `maxPerTeam` or `minConfidence` should not create the illusion that the probability model improved. It should create a new `selection_policy_id`.

Target split:

```text
model_head -> probability/confidence/evidence
selection_policy -> tracked/watch/pass/value-board placement
```

### 4. Presentation Is Produced In The Model Path

The current path builds reason strings, script tags, labels, recommendation tiers, and UI-friendly summaries while scoring.

That hides useful structure inside prose.

Target model output:

```json
{
  "probability": 0.58,
  "expected_value": 2.12,
  "confidence": 71,
  "feature_contributions": {
    "expected_pa": 4.41,
    "statcast_power_signal": 0.08,
    "starter_walk_pressure": 0.05
  },
  "risk_flags": ["tiny-current-sample"],
  "missingness_flags": [],
  "selection_status": "eligible"
}
```

The presenter can later turn that into text.

### 5. Legacy Compatibility Is Still In The Model Path

Legacy prop ranking and current tracked prop selection sit in the same file family.

Legacy compatibility should become an adapter:

```text
legacy_adapter -> normalized feature row -> model head
```

It should not define the model’s identity.

## Shared Event State, Not Player Sum

The right MLB architecture should not try to predict every player result and simply add them into a game result.

Player props and game results are connected, but they are not the same target. They share event-state causes.

Better:

```text
event_state
-> side / moneyline head
-> team runs / totals head
-> first-five head
-> player prop head
-> HR head
-> market/value head
```

Player-level outputs can feed game-level outputs as features:

- projected team hits
- projected total bases
- top-third pressure score
- lineup conversion score
- player prop aggregate edge

But the side/totals heads still need starter quality, bullpen state, defense, park/weather, market price, rest/travel, and variance.

## Current DB Migration Relevance

The DB migration was the correct prerequisite.

The typed MLB DB already has many of the surfaces needed for this split:

- hitter/batter features
- pitcher/starter features
- bullpen/relief shape
- team/game-shape features
- lineup/matchup features
- results/outcomes
- predictions/backtests
- markets/odds/props
- environment/sun/park
- model metadata

But those typed tables are not yet promoted into canonical model feature snapshots. The active cartridge still constructs many features in JS at runtime.

This means M10 DB-input cutover should not just make old code read the DB. It should also start introducing explicit feature snapshot boundaries.

## Recommended Next Architecture Work

No heavy M2 tuning yet.

Do this first:

1. Define `event_state_snapshot` contract.
2. Define `feature_snapshot` contract.
3. Define one narrow scorer contract for a first pilot lane.
4. Pick the smallest high-value pilot: MLB player props or first-five totals.
5. Move only that pilot lane toward:

```text
typed DB facts
-> feature rows
-> scorer
-> calibration
-> selection policy
-> presenter/export
```

Do not start by rewriting all of MLB-M2.

## Proposed Pilot: MLB Player Props

MLB props are the best pilot because the boundary problem is very visible and measurable.

### Phase P1: Feature Rows

Create a DB-backed feature row or view for prop candidates.

The current values computed inside `buildMlbPropCandidate` should become explicit columns or JSON feature-contribution fields.

### Phase P2: Pure Scorer

Create a function shape like:

```js
scoreMlbPropFeatureRow(featureRow, modelConfig)
```

It should return:

- probability
- expected value
- confidence
- feature contributions
- risk flags

No UI labels. No prose. No max-per-team policy.

### Phase P3: Versioned Selection Policy

Move tracked-board thresholds into a policy:

```text
selection_policy_id = MLB-PROPS-TRACKED-V1
```

Then test:

- same scorer, old policy
- same scorer, stricter policy
- old scorer, new policy
- new scorer, same policy

### Phase P4: Presentation

Create a presenter that converts structured evidence into board copy.

This should happen after the prediction/value rows are already stored.

## Run Manifest Requirements

Every future model run should record:

- sport
- date
- model family
- event-state version
- feature snapshot id
- model head ids
- model config id
- calibration id
- selection policy id
- presenter/export version
- source freshness summary
- missingness summary

Without those ids, “M2 improved” is too vague to be trusted.

## What This Changes About Model Iteration

Today:

```text
edit model file -> run slate -> inspect board/result
```

Target:

```text
freeze feature snapshot
-> score with head A
-> score with head B
-> apply policy X/Y
-> compare lane settlement
-> decide whether a model or policy improved
```

This turns model iteration from a broad app mutation into a controlled experiment.

## Bottom Line

MLB-M2 is not bad. It is overloaded.

The next win is not another clever chaos tweak. The next win is creating the contracts that let chaos, prop, side, total, and market heads share the same event state while being tested independently.

