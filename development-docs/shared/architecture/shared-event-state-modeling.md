# Shared Event-State Modeling

Created: 2026-06-02

## Decision

The platform should move toward one canonical event-state feature layer per game or match, with multiple prediction heads reading from that same state.

The target shape is not:

```text
player predictions -> summed game prediction
```

And it is not:

```text
game prediction -> derived player predictions
```

The target shape is:

```text
source data
-> entity resolution
-> normalized sport tables
-> event-state feature snapshot
-> specialized prediction heads
-> calibration
-> selection policy
-> prediction/value rows
-> presentation/export
```

Player, team, market, and game-level predictions are different views of the same event. They should share the same feature snapshot, but they should not be forced into one mechanical formula.

## Why This Matters

MLB exposed the architectural problem first because the game has many coupled but non-identical targets:

- moneyline / game winner
- run line
- full-game total
- first-five total
- team runs
- hits
- pitcher/starter phase
- bullpen phase
- player hits / total bases / RBI / walks / HR
- market value and prediction-market trade shape

Those targets share causes: starting pitchers, lineups, hitter form, bullpen rest, park, weather, sun position, team state, and market price. But they do not share one output target.

For example:

- a hitter total-bases prop can win while the team loses
- a starter can dominate while the bullpen loses the side
- team runs can spike because of one defensive/visibility inning even when most hitter props fail
- a side model can be right while the total model is wrong
- a player-prop model can expose lineup pressure that helps a totals head

So the correct platform abstraction is a shared event-state representation plus separate heads.

## Model Family Shape

A model family should become a run configuration composed of independently versioned layers:

```json
{
  "sport": "mlb",
  "model_family": "MLB-M2",
  "event_state_version": "mlb_event_state_v1",
  "feature_snapshot_version": "mlb_feature_snapshot_v1",
  "heads": {
    "moneyline": "mlb_moneyline_head_m2",
    "totals": "mlb_totals_head_m2",
    "first_five": "mlb_first_five_head_m2",
    "player_props": "mlb_props_head_m2"
  },
  "calibration": "mlb_calibration_2026_06_02",
  "selection_policy": "tracked_board_v1",
  "presentation": "mlb_presenter_v1"
}
```

This keeps `MLB-M2` meaningful without pretending one giant function is the model.

## Layer Definitions

### Event State

The canonical representation of the game/match at a specific `as_of` time.

For MLB this includes:

- game, venue, teams, date, start time
- starters and probable confidence
- lineups and lineup completeness
- player form/context
- team form/context
- bullpen/rest/likely relief chain
- park/weather/sun visibility
- market prices and line availability
- source freshness and missingness

For tennis this includes:

- match, tournament, round, surface, date/time
- player identity/ranking/context
- recent form and opponent quality
- service/return pressure
- replay/clutch pressure
- H2H and surface-specific history
- market prices and derivative lines
- source freshness and missingness

### Feature Snapshot

A typed, queryable feature surface derived from the event state.

Important rule: feature snapshots are inputs to model heads. They should not contain the final pick, final confidence, board placement, or prose explanation.

### Component Models

Component models estimate reusable sub-shapes:

- starter run prevention
- bullpen collapse risk
- lineup pressure
- hitter repeatability
- team run environment
- tennis hold/break pressure
- tennis clutch/tiebreak/deuce behavior
- prediction-market price-spike shape

Component outputs can feed prediction heads, but dependencies must be explicit in the run manifest.

### Prediction Heads

Market-specific scoring functions.

Examples:

- `moneyline_head`
- `spread_head`
- `total_head`
- `first_five_total_head`
- `player_prop_head`
- `tennis_set_win_head`
- `tennis_match_total_head`
- `prediction_market_trade_head`

Each head should emit structured prediction rows:

```json
{
  "event_id": "mlb-824832",
  "subject_type": "team",
  "subject_id": "team-bal",
  "market_type": "moneyline",
  "line_value": null,
  "side": "home",
  "probability": 0.58,
  "expected_value": 4.2,
  "confidence": 67,
  "feature_snapshot_id": "snapshot_...",
  "calibration_id": "calib_...",
  "model_head_id": "mlb_moneyline_head_m2"
}
```

### Calibration

Calibration should be data, not generated model code.

Prediction rows should record:

- `calibration_id`
- calibration slice
- feature snapshot id
- model head id
- run id

This makes backtests reproducible even if later calibration files change.

### Selection Policy

Selection policy decides what appears on a board.

It is not the same as probability scoring.

Examples:

- confidence threshold
- max picks per game
- max picks per team
- no partial-lineup policy
- market-price gates
- value-board EV threshold
- watch-only tags

Selection policy should be separately versioned so the platform can compare:

- same scorer, different policy
- same policy, different scorer

### Presentation

Presentation converts structured evidence into UI-ready text.

It should not decide the pick.

The model should emit:

- features used
- contribution summary
- risk flags
- missingness
- policy result

The presenter can then produce the human explanation.

## Experiment Questions This Enables

- Did player-prop features improve side prediction?
- Did side/game-script confidence improve prop selection?
- Do props hit better when the side model likes that same team?
- Do team-total projections explain RBI prop performance?
- Are prediction-market trades profitable even when winner picks are not?
- Which component model improves which lane?
- Did a model change improve scoring, or did a policy threshold merely hide bad rows?

## Implication For Current Migration

DB-first ingestion and normalization were necessary, but not sufficient.

The DB can now store typed facts and model outputs. The next architectural step is not to tune MLB-M2 harder. The next step is to stop asking the cartridge to build features, score, calibrate, select, explain, and export in one pass.

The platform should introduce feature snapshots and prediction-head contracts before major new MLB model work.

