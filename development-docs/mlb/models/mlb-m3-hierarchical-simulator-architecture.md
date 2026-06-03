# MLB-M3 Hierarchical Simulator Architecture

## Goal

M3 should be a contract-first hierarchical baseball simulator.

The goal is not to perfectly simulate every real-world detail. The goal is to model the causal structure of a baseball game well enough that market prices are wrong in detectable, testable ways.

M3 should not be a single prop model, and it should not be a bundle of independent heads. The market heads are final pricing outputs. The core intelligence is a latent game-shape/regime simulator.

Current working research notes live in:

- `research-m3/model-architecture-notes.md`
- `research-m3/signal-discovery-notes.md`
- `research-m3/game-story-labels.md`
- `research-m3/alpha-design.md`
- `research-m3/tech-debt.md`

## Layer Stack

```text
L0: Source contracts
  lineups, starters, markets, weather, park, umpire, bullpen, injuries, notes

L1: Canonical slate state
  one clean game object per game, one clean player/team state

L2: Feature/state assets
  pitcher form, hitter state, bullpen fatigue, lineup pressure, park/weather, soft signals

L3: Latent regime model
  dead game / normal / high-run / chaos / blowout / bullpen-collapse distributions

L4: Component models
  starter exit/workload path, reliever availability reset, first-up reliever router,
  reliever event/damage rates, batter event rates, bullpen churn, PA volume

L5: Game simulator
  inning/PA/base-out/score simulation with pitcher changes and lineup turnover

L6: Simulated event logs
  reproducible ensemble of baseball paths

L7: Distribution aggregators
  team runs, F5 runs, ML win prob, player hits/TB/HR/RBI/walk/K distributions

L8: Market pricing
  compare fair probability to known lines/prices

L9: State evidence / justification
  explain probability movement with component deltas, evidence atoms, uncertainty, counter-case

L10: Selection policy
  choose what to show, pass, veto, or mark live-only

L11: Backtest feedback loop
  settlement, calibration diagnostics, ablations, promotion/rejection gates

L12: Presentation/export
  board JSON/UI/reporting only
```

## Asset DAG

```mermaid
flowchart TD
  A["Raw source snapshots"] --> B["Typed replayable SQLite facts"]
  B --> C["DuckDB training views"]
  B --> D["Daily canonical slate state"]
  B --> E["Historical game replay"]
  E --> F["Game-story labels"]

  C --> G["Feature matrices"]
  F --> G
  G --> H["Train component models"]
  H --> I["Model artifacts"]

  D --> J["Daily feature snapshot"]
  I --> K["Latent game-shape distribution"]
  J --> K

  K --> L["Starter exit/workload distribution"]
  K --> M["Bullpen shape/churn distribution"]
  L --> RA["Reliever availability/reset distribution"]
  M --> RA
  RA --> RR["First-up reliever router"]
  RR --> RC["Reliever chain/performance distribution"]
  K --> N["Batter event-rate distributions"]
  K --> O["PA volume distribution"]

  L --> P["PA/base-out/count simulator"]
  M --> P
  RC --> P
  N --> P
  O --> P

  P --> Q["Simulated event logs"]
  Q --> R["Team/player/pitcher distributions"]
  R --> S["Market prediction rows"]
  S --> SE["State evidence bundles"]
  R --> SE
  SE --> T["Selection policy rows"]
  S --> T
  T --> U["Slate export/UI"]
  S --> V["Backtest + settlement engine"]
  SE --> V
  T --> V
  V --> W["Calibration diagnostics"]
  V --> X["Feature / signal ablations"]
  V --> Y["Promotion / rejection gate"]
  W --> H
  X --> G
  Y --> I
```

## Runtime Simulation DAG

```mermaid
flowchart TD
  S["Slate state"] --> GS["Sample game shape"]
  GS --> SP["Sample starter exit/workload path"]
  GS --> BP["Sample bullpen shape/churn"]
  SP --> RA["Sample reliever availability/reset"]
  BP --> RA
  RA --> RR["Sample first-up reliever route"]
  RR --> RP["Sample reliever performance/damage"]
  GS --> OFF["Sample offense/contact/traffic state"]

  SP --> SIM["Simulate PA/base-out/count state"]
  BP --> SIM
  RP --> SIM
  OFF --> SIM

  SIM --> LOG["Simulated event logs"]
  LOG --> TR["Team run distribution"]
  LOG --> PR["Player stat distributions"]
  LOG --> GF["Game-flow outcomes"]

  TR --> MK["Price ML / totals / F5"]
  PR --> PK["Price props"]
  GF --> CK["Coherence checks"]
  MK --> EV["Build state evidence"]
  PK --> EV
  GF --> EV
  EV --> SEL["Selection"]
  MK --> SEL
  PK --> SEL
  CK --> SEL
  SEL --> BT["Backtest + settlement"]
  BT --> FB["Calibration / ablation / promotion feedback"]
```

## Important Correction: Heads Are Aggregators

M3 should not have independent market heads that all look at the same feature table and produce unrelated probabilities.

The shared simulator should produce event logs. Market heads should aggregate those logs into the contract being priced:

```text
simulated event logs
  -> full-game total distribution
  -> F5 total distribution
  -> moneyline distribution
  -> player hits / total bases / RBI / walks
  -> pitcher strikeouts / outs
  -> home run probability
  -> state evidence bundle
```

This is how player props stay coherent with game flow. Props are not separate from the game. They are views over plate appearances, lineup turnover, pitcher changes, score state, and event sequencing.

## Starter Exit And Reliever Routing

Starter workload is not a single innings projection. It should be represented as an exit/workload path distribution:

```text
starter context
  -> outs threshold probabilities
  -> hook timing distribution
  -> bridge entry point distribution
  -> bulk/stretch lane probability
```

Useful inputs include starter workload path shape, season floor distance, pitch/PA efficiency, command-break state, opponent pressure, bullpen shape behind the starter, and manager/team usage behavior. A slope can be a candidate feature, but it cannot be the whole path model.

Reliever selection is a separate router:

```text
starter exit/workload path
  + bullpen shape/churn
  + reliever availability/reset state
  -> probability distribution over first-up candidate arms
  -> remaining-pool quality
  -> reliever chain distribution
```

The old RF36/E35/E36 research belongs here as lineage and candidate evidence, not as copied rules. For example, high prior pitch load, quick-reuse history, back-to-back status, and team reuse behavior should inform an adaptive availability/reset distribution. They should not become a universal hard cutoff like "remove at 35 pitches."

Reliever performance is downstream of the router. Once a candidate arm enters, the simulator uses that arm's command, whiff, pitch mix, handedness pocket, inherited-runner, traffic conversion, and workload distributions. This prevents the model from confusing "who is available" with "how good the arm is today."

## Backtesting Feedback Loop

Backtesting is part of the architecture, not an after-the-fact report.

The backtest engine should consume:

```text
market prediction rows
state evidence bundles
selection policy rows
settled outcomes
M2 baseline rows
active submodel registry
feature snapshot lineage
```

It should produce:

```text
calibration diagnostics
tail/regime diagnostics
feature ablation reports
signal durability reports
simulator path diagnostics
state evidence diagnostics
component comparison reports
promotion/rejection decisions
```

Those outputs feed the next experiment cycle:

```text
calibration diagnostics -> calibrator candidates
feature ablations -> feature set promotion/rejection
component comparisons -> submodel registry promotion gate
simulator path diagnostics -> replay/labeler/simulator audits
state evidence diagnostics -> evidence component audits
```

No signal, calibrator, submodel artifact, or market aggregator should become active because it looked good once. Promotion requires lineage, backtest slices, calibration checks, and baseline comparison.

## Why Latent Game Shape Comes First

A basic multi-head prop model is not robust enough for MLB volatility. Baseball is not drawn from one smooth average distribution. Scoring is clustered through traffic, walks, extra-base hits, bullpen exposure, defensive mistakes, sequencing, and lineup turnover.

Instead of treating a game as only:

```text
expected runs = 8.7
```

M3 should represent a mixture of regimes:

```text
dead script: 21%
normal script: 46%
high-run script: 24%
chaos script: 9%
```

Player props should be conditional on those regimes:

```text
Player total bases over:
  dead script: 22%
  normal script: 31%
  high-run script: 43%
  chaos script: 58%

blended fair probability: 35.8%
```

This lets related markets move together coherently. A game with elevated chaos risk should not independently price pitcher outs, F5 totals, bullpen exposure, team totals, RBIs, extra PA, and batter total bases as if they are unrelated.

## Contract Families

The current output inventory is stored in:

- `development-docs/mlb/models/mlb-m3-output-contract-inventory-2026-06-02.md`
- `data-migration/reports/mlb_output_contract_inventory_2026-06-02.json`

M3 should promote these contract families:

```text
canonical_slate_state
latent_forecast.game_shape
latent_forecast.game_flow
latent_forecast.starter_path
latent_forecast.reliever_shadow
latent_forecast.pa_volume
market_prediction.moneyline
market_prediction.first5_moneyline
market_prediction.full_game_total
market_prediction.first5_total
market_prediction.first_inning
market_prediction.player_prop
market_prediction.home_run
state_evidence_bundle
selection_policy_result
experiment_artifact
presentation_export
```

## Soft Signals

New qualitative or narrative inputs should be encoded as soft signals, not hand-applied directly to picks.

Example:

```json
{
  "signal_id": "soft-2026-06-03-pitcher-stress",
  "entity_type": "player",
  "entity_id": "pitcher_id",
  "signal_type": "stress_state",
  "direction": "negative",
  "strength": 0.42,
  "source": "beat_report",
  "source_confidence": 0.55,
  "expires_at": "2026-06-04T00:00:00Z"
}
```

Soft signals should move latent distributions, not picks directly.

For example, "pitcher stressed" should not mean "bet over." It may move:

```text
starter failure probability +3%
walk cluster probability +2%
chaos regime probability +1.5%
pitcher strikeout variance wider
```

Then the simulator determines which markets benefit.

Every soft signal needs:

```text
source
source confidence
entity scope
direction
strength
expiry
backtest lineage
calibration status
```

## State Evidence And Justification

M3 needs a structured evidence layer before it has pick explanations.

The state evidence bundle explains why a probability moved from baseline to final contract probability:

```text
baseline probability
+ starter path contribution
+ lineup pressure contribution
+ reliever/bullpen contribution
+ traffic/regime contribution
+ market line context contribution
- uncertainty and missing-data penalties
= final contract probability
```

This is not generated prose. It is a typed artifact that can later be summarized for humans.

Required evidence bundle fields:

```text
model_run_id
game_id
contract
line
baseline_probability
final_probability
probability_delta
component_contributions
top_evidence_atoms
counter_case_risks
missing_data_flags
uncertainty_adjustments
calibration_context
not_a_pick
not_a_price
not_promoted
```

The justification model should explain probability movement, not merely defend a pick. For example:

```text
starter_path_delta: +8%
lineup_pressure_delta: +5%
early_traffic_delta: +3%
market_line_context_delta: +4%
uncertainty_delta: -2%
final_net_delta: +18%
```

If later selection policy chooses to show a play, a pick explanation must consume the state evidence bundle plus market comparison and calibration confidence. It must not invent reasons outside the evidence.

## Design Rules

1. Market heads price contracts from shared simulated worlds.
2. Player props are downstream of game flow, not isolated from it.
3. Every prediction row should trace to feature snapshot, model artifacts, state evidence, calibration, and selection policy.
4. State evidence should explain probability movement before any pick explanation exists.
5. Selection policy should never be fused with probability generation.
6. Presentation should never be the source of truth.
7. Soft inputs should alter latent distributions with shrinkage and provenance.
8. Backtests must evaluate tail calibration, not only mean accuracy.
9. The system should test whether a feature improves market pricing and evidence quality before promoting it.

Smooth final-score probability is not enough. M3 must preserve regime and tail behavior:

```text
low-run script
normal script
high-run script
chaos script
starter-failure script
bullpen-collapse script
```

The same average total can hide very different baseball. The simulator needs to know whether a game was a quiet under, a traffic-without-conversion under, a normal over, or a bullpen avalanche.

## First M3 Build Slice

The first build slice should not attempt the whole simulator at once.

Recommended order:

```text
1. Define JSON schemas for canonical slate state, latent forecasts, market predictions, and selection rows.
2. Materialize current M2/RP36 outputs into those schemas as baseline rows.
3. Promote game-flow context from side-board artifacts into latent_forecast.game_flow.
4. Promote reliever shadow into latent_forecast.reliever_shadow.
5. Add starter_path and PA_volume forecast contracts.
6. Build a first simple simulation layer that samples game shape, starter path, bullpen exposure, and PA volume.
7. Price full-game total, F5 total, moneyline, and a small player-prop set from the same simulated worlds.
8. Compare against the M2 baseline and legacy normalized prediction rows.
```
