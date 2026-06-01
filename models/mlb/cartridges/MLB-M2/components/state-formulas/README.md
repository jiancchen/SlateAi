# State Formulas

M2 should not treat a baseball game as one static vector or one projected run number. A game is a moving state system.

This component defines the formula layer that sits under the visible radar and above the value board.

The job of this layer is to answer:

- What state is the game in before first pitch?
- How does that state change by phase?
- Which mechanisms can move the game over or under?
- Which formulas are inspectable enough to explain a pick?
- Which same inputs should also feed a trainable model in parallel?

## Core Principle

Vectors describe state. Formulas move state.

A vector like `starterCollapseAttack = 68` is only a snapshot. M2 needs formulas such as:

```text
collapseHazard[phase]
  = sigmoid(
      starterCommandLeak * hitterTakePressure
    + starterPitchMixExposure * lineupPitchTypeDamage
    + hardContactAllowed * parkCarry
    + earlyTrafficStress * timesThroughOrderPenalty
    + bullpenUnreadyPressure
    - whiffSuppression
  )
```

That formula is still simplified, but it has the right shape: inputs interact. It does not let one average decide the game.

## Game State Object

Every game should have a state object per phase.

Phases:

- `firstCycle`: first time through the top/middle order, roughly innings 1-2.
- `starterWindow`: starter/F5 shape, roughly innings 1-5.
- `bridge`: starter exit and first bullpen bridge, roughly innings 6-7.
- `late`: leverage/cleanup bullpen and final offensive swings, roughly innings 8-9.

Per phase state:

```json
{
  "phase": "starterWindow",
  "offense": {
    "trafficPressure": 0.0,
    "damagePressure": 0.0,
    "whiffResistance": 0.0,
    "takePressure": 0.0,
    "platoonFit": 0.0,
    "rolePressure": 0.0
  },
  "starter": {
    "commandLeak": 0.0,
    "pitchMixExposure": 0.0,
    "zoneLeak": 0.0,
    "whiffSuppression": 0.0,
    "damageAllowedTail": 0.0,
    "fatigueHazard": 0.0,
    "timesThroughOrderPenalty": 0.0
  },
  "bullpen": {
    "bridgeLeak": 0.0,
    "availabilityStress": 0.0,
    "firstUpMismatch": 0.0
  },
  "defenseEnvironment": {
    "fieldingLeak": 0.0,
    "outfieldTail": 0.0,
    "parkCarry": 0.0,
    "sunVisibility": 0.0,
    "weatherCarry": 0.0
  },
  "market": {
    "totalLine": 0.0,
    "first5Line": 0.0,
    "priceDislocation": 0.0
  }
}
```

## Formula Families

### 1. Traffic Formula

Traffic asks whether runners reach base.

```text
trafficPressure[p]
  = sigmoid(
      lineupTakePressure[p]
    + hitterOBPProcess[p]
    + starterCommandLeak[p]
    + platoonWalkPressure[p]
    + defenseErrorReach[p]
    - starterWhiffSuppression[p]
    - hitterChasePenalty[p]
  )
```

Inputs:

- hitter walk/take profile
- pitcher walk/zone leakage
- pitch-type called-strike and whiff shape
- lineup hand/platoon fit
- fielding/error reach
- early-cycle history

Outputs influenced:

- team hits/reach probability
- first-inning scoring
- F5 run floor
- strand/fork state

### 2. Damage Formula

Damage asks whether contact can produce extra bases or home runs.

```text
damagePressure[p]
  = sigmoid(
      sum(pitchShare[k] * hitterDamageVsPitch[k] * starterZoneLeak[k])
    + hitterBarrelTrend[p]
    + lineupHardHitTrend[p]
    + parkCarry
    + weatherCarry
    + sunVisibilityOutfieldTail
    + defenseOutfieldLeak
    - pitcherWeakContactShape[p]
  )
```

Inputs:

- starter pitch mix
- hitter pitch-type response
- zone leakage
- hard-hit/barrel/xSLG process
- park/weather/sun
- outfield fielding tail

Outputs influenced:

- XBH/HR probability
- F5 over-tail
- full-game over-tail
- team total
- total bases / HR props

### 3. Conversion Formula

Conversion asks whether traffic becomes runs.

```text
conversionPressure[p]
  = sigmoid(
      trafficPressure[p] * damagePressure[p]
    + lineupSequencingSkill[p]
    + runClusterOpponentLeak[p]
    + twoOutRunPressure[p]
    + fieldingLeak[p]
    - strandRisk[p]
    - doublePlayRisk[p]
    - strikeoutEscapeRisk[p]
  )
```

Important: traffic without damage is not automatically an over. It is a fork.

```text
strandFork[p]
  = high(trafficPressure[p])
  * low(damagePressure[p])
  * high(strikeoutEscapeRisk[p] + doublePlayRisk[p])
```

Outputs influenced:

- F5 O/U side
- full O/U side
- crooked-inning probability
- live-only/pass gates

### 4. Pitcher Collapse Formula

Pitcher explosion is not variance only. Some collapses are visible through command, contact, sequence, and bullpen context.

```text
collapseHazard[p]
  = sigmoid(
      starterCommandLeak[p]
    + trafficPressure[p] * 0.6
    + damagePressure[p] * 0.9
    + hardContactAllowedTail[p]
    + recentShortStartRate
    + timesThroughOrderPenalty[p]
    + pitchCountStress[p]
    + bullpenUnreadyPressure
    - whiffSuppression[p]
    - firstPitchStrikeStability[p]
  )
```

Outputs influenced:

- starter-window over
- F5 team total
- first reliever timing
- full game total
- live betting triggers

### 5. Suppression Formula

Under is not just low projection. Under needs a mechanism too.

```text
suppressionState[p]
  = sigmoid(
      whiffSuppression[p]
    + weakContactShape[p]
    + pitchMixMatch[p]
    + lowTrafficPressure[p]
    + lowDamagePressure[p]
    + bridgeCleanProbability[p]
    - fieldingLeak[p]
    - freePassFuel[p]
    - parkCarry
  )
```

Outputs influenced:

- starter hold under
- whiff suppression under
- team total under
- prop unders

### 6. Phase Transition Formula

The game moves. The first phase should update the next phase.

Pregame approximation:

```text
state[p + 1]
  = clamp(
      baseState[p]
    + expectedTrafficStress[p]
    + expectedPitchCountStress[p]
    + expectedLineupSecondLookGain[p]
    + expectedBullpenBridgeLeak[p]
    - expectedSuppression[p]
  )
```

Postgame/live update approximation:

```text
state[p + 1]
  = clamp(
      pregameState[p + 1]
    + actualTraffic[p]
    + actualHardContact[p]
    + actualCommandMiss[p]
    + actualPitchCountStress[p]
    + actualScorePressure[p]
    - actualWhiffSuppression[p]
  )
```

This is how M2 should avoid treating the whole game as one radar.

## Mixture Output, Not One Mean

Runs should be a mixture of game stories, not one average.

```text
P(dead)    = f(suppressionState, lowTraffic, lowDamage, bridgeClean)
P(normal)  = f(median traffic, median damage, stable starter)
P(crooked) = f(collapseHazard, conversionPressure, damagePressure, fieldingTail)
P(fork)    = f(highTraffic, highStrandRisk, highBridgeLeak)
```

Expected runs can still exist, but it is downstream:

```text
expectedRuns[p]
  = P(dead) * deadRuns[p]
  + P(normal) * normalRuns[p]
  + P(crooked) * crookedRuns[p]
  + P(fork) * forkRuns[p]
```

The betting side should come from the story distribution first, not the mean first.

## Formula Output Contract

Every game should publish:

```json
{
  "stateFormulaVersion": "MLB-M2-state-formulas-v0",
  "phaseStates": {
    "firstCycle": {},
    "starterWindow": {},
    "bridge": {},
    "late": {}
  },
  "storyDistribution": {
    "dead": 0.0,
    "normal": 0.0,
    "crooked": 0.0,
    "fork": 0.0
  },
  "marketExpressions": {
    "fullTotal": "Pass",
    "first5Total": "Live-only",
    "teamTotal": "Over watch",
    "firstInning": "No edge"
  },
  "formulaDrivers": [
    {
      "formula": "collapseHazard.starterWindow",
      "driver": "starterCommandLeak x lineupTakePressure",
      "impact": 0.0
    }
  ]
}
```

## Parallel Trainable Model

Run formulas and trained models side by side.

The supervised model should use the same pregame inputs and predict multiple outputs.

Game targets:

- away runs by phase
- home runs by phase
- away hits by phase
- home hits by phase
- F5 total over/under side
- full total over/under side
- story bucket: dead, normal, crooked, fork

Player targets:

- hit yes/no
- total bases
- HR yes/no
- RBI/run/H+R+RBI
- strikeout / walk where relevant

Recommended first model families:

- Gradient boosting / random forest for tabular baseline.
- Calibrated logistic heads for story buckets and O/U side.
- Quantile or distributional model for run ranges.
- Later: sequence model for pitcher state if row count and feature stability justify it.

Required train/test discipline:

- Train only through `D - 1`.
- Test on date `D`.
- May 31 remains a holdout stress slate unless explicitly running a retrospective fixture.
- Report side correctness and story-bucket correctness first; MAE is secondary.

## First Implementation Pass

1. Materialize `mlb_state_formula_training_rows` or an exported parquet/CSV equivalent.
2. Add formula features from existing tables:
   - lineup traffic/damage
   - starter command/collapse
   - pitcher-batter pitch-fit once available
   - bullpen bridge
   - defense/environment
   - market lines
3. Add story labels from `run_total_story_engine.mjs`.
4. Train a small baseline model in research only.
5. Compare:
   - formula story side
   - trained model story side
   - current M2 output
   - market line

Current research command:

```bash
npm run data:research:mlb-m2-state-formulas -- --start 2026-05-10 --end YYYY-MM-DD
```

Warehouse derivation command:

```bash
npm run data:derive:mlb-state-formulas -- --through-date YYYY-MM-DD
```

Warehouse row coverage report:

```bash
npm run data:research:mlb-m2-state-formula-rows -- --start 2026-05-23 --end YYYY-MM-DD
```

Current exported training-row artifact:

```text
data-private/model-training/mlb-m2-state-formula-training-rows-2026-05-10-to-2026-05-31.csv
```

First baseline result:

- 123 exported game rows, 85 columns, May 23 through May 31 usable coverage.
- Forced F5 projection side: 60.2%.
- Forced full-game projection side: 51.2%.
- Tree walk-forward F5 side: 49.4%.
- Tree walk-forward full-game side: 40.7% to 44.4%.
- Tree walk-forward F5 story bucket: 42.0%.

Interpretation: the first learned pass does not beat current projection logic. That is not a promotion case. It proves the next useful work is materializing stronger formula rows and pitcher-batter pitch-fit tables, then rerunning the same walk-forward check.

First warehouse-backed formula-row report:

- 7,120 rows loaded through May 31.
- May 23-May 31 report range: 1,000 rows across 125 games.
- Story distribution: 693 normal, 176 dead, 102 crooked, 29 fork.
- Starter-window F5 direction check: 47.5% on 40 rows.

Interpretation: this row layer is now measurable and inspectable, but the first formula calibration is too weak for the value board. Keep it research-only until story buckets and market expressions pass date/line/price backtests.

## Non-Negotiable Rule

The UI/value board never invents this. The cartridge publishes formula state, story distribution, market expression, confidence, and gate reasons. The value board only filters and displays model-owned outputs.
