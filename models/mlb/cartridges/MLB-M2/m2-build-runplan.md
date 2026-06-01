# MLB-M2 Build Run Plan

Status: Phase 0 started
Owner model: MLB-M2
Created: 2026-06-01

## Goal

MLB-M2 should stop acting like a one-number projection system. It should model how a baseball game can unfold, then decide which market expression is appropriate: side, first five, full total, first-five total, team total, first inning, prop, live-only, or pass.

The model must answer mechanism questions before it prices a bet:

- Why can this game go over?
- Why can this game go under?
- Where can the game break by phase?
- Which players are deviating from their identity curve?
- Which pitcher-batter matchups create traffic, damage, suppression, or collapse?
- Is the value board showing a model-owned edge or just UI math?

## Baseline Rules

Locked benchmark:

- `models/mlb/cartridges/MLB-M2/benchmarks/2026-06-01-current-baseline.json`

Current baseline targets:

- Baseline full-game side: 59.0% on 212 rows.
- M2 category lane hit: 62.6% on 195 graded lane rows.
- M2 allowed-side bucket: 67.5% on 40 rows.
- Starter-to-bullpen flip as F5 lane: 68.6% on 35 rows.
- Dead-zone timing/F5 lane: 70.6% on 17 rows.

May 31 stress holdout:

- Training data allowed through: 2026-05-30.
- Holdout date: 2026-05-31.
- Full-game side: 11/15, 73.3%.
- First-five side: 9/15, 60.0%.
- M2 category lane: 11/15, 73.3%.
- O/U benchmark set: 5/5, 100.0%.

Hard rule:

Do not claim a clean M2 improvement if May 31 outcomes were used for training, feature selection, or threshold selection. Any such run is retrospective only.

## Phase Status

| Phase | Name | Status | Output |
| --- | --- | --- | --- |
| 0 | Freeze Baseline | In progress | Locked benchmark + reproducible baseline commands |
| 1 | Core Contracts | In progress | Component docs and output contracts |
| 2 | Warehouse Tables | In progress | New derived tables and migrations |
| 3 | Formula Derivation | Pending | Phase state rows and formula outputs |
| 4 | Player Identity Curves | Designed | Player priors, deviation, and distribution rows |
| 5 | Pitcher-Batter Kernel | Designed | Pitch-mix matchup rows |
| 6 | Backtest Harness | Pending | Bucketed accuracy/ROI/story reports |
| 7 | Model Comparison | Pending | Projection vs formula vs learned model |
| 8 | Value Board Rebuild | Pending | Model-owned value rows only |
| 9 | UI Surfaces | Pending | Game-shape, player identity, and market explanation views |
| 10 | Promotion Gates | Pending | Activation checklist for M2 lanes |

## Phase 0: Freeze Baseline

Purpose:

Make the current model measurable before changing behavior.

Checklist:

- [x] Lock current baseline artifact.
- [x] Track May 31 as the stress holdout.
- [x] Store May 31 O/U benchmark separately from old value-board totals audit rows.
- [x] Store state-formula training export for current published features.
- [ ] Add a single command that reruns all M2 benchmark reports.
- [ ] Add a benchmark summary report that compares current, candidate, and holdout results.

Current artifacts:

- `models/mlb/cartridges/MLB-M2/benchmarks/2026-06-01-current-baseline.json`
- `models/mlb/cartridges/MLB-M2/reports/game-shape-backtest-2026-05-10-to-2026-05-31.md`
- `models/mlb/cartridges/MLB-M2/reports/state-formula-parallel-model-2026-05-10-to-2026-05-31.md`
- `data-private/model-training/mlb-m2-state-formula-training-rows-2026-05-10-to-2026-05-31.csv`

Commands:

```bash
npm run data:research:mlb-m2-game-shape -- --start 2026-05-10 --end 2026-05-31
npm run data:research:mlb-m2-run-total-stories -- --post-date 2026-05-31 --today 2026-06-01
npm run data:research:mlb-m2-state-formulas -- --start 2026-05-10 --end 2026-05-31
```

Exit criteria:

- A future M2 candidate can be compared against the locked baseline without manual interpretation.

## Phase 1: Core Contracts

Purpose:

Define exactly what M2 owns before adding more scripts.

Contracts:

- `stateFormula`: phase state, formula drivers, story distribution.
- `playerIdentityCurve`: player prior, current deviation, and game distribution.
- `pitcherBatterKernel`: pitch mix vs hitter response.
- `gameShapeStory`: dead, normal, crooked, fork, bridge, collapse.
- `valueBoardRow`: model-owned output only.

Checklist:

- [x] Add state formula component.
- [x] Add pitcher-batter matchup component.
- [x] Add player identity curves component.
- [x] Register components in `components/index.json`.
- [x] Add formal JSON output schema for `analysis.stateFormula`.
- [x] Add formal JSON output schema for `analysis.playerIdentity`.
- [x] Add formal JSON output schema for `analysis.pitcherBatterKernel`.
- [ ] Add tests that reject value-board rows not emitted by the cartridge.

Exit criteria:

- Every site-facing MLB-M2 value row can be traced to a cartridge-owned artifact.

## Phase 2: Warehouse Tables

Purpose:

Stop rebuilding model data from published JSON. Derived model rows should live in the warehouse.

New tables:

- `mlb_state_formula_training_rows`
- `mlb_player_identity_curves_daily`
- `mlb_player_current_deviation_daily`
- `mlb_player_game_distribution_daily`
- `mlb_player_identity_model_backtests`
- `mlb_pitcher_pitch_mix_daily`
- `mlb_hitter_pitch_type_response_daily`
- `mlb_lineup_pitcher_matchup_daily`
- `mlb_state_formula_backtests`

Checklist:

- [x] Add migration/schema definitions.
- [ ] Add derive command for state formula rows.
- [ ] Add derive command for player identity curves.
- [ ] Add derive command for pitch-mix matchup rows.
- [ ] Add health checks for table freshness and coverage.
- [ ] Add missing-date warnings if a day closes without derived rows.

Exit criteria:

- M2 can train and backtest from warehouse tables with date cutoffs.

## Phase 3: Formula Derivation

Purpose:

Create moving game-state formulas instead of one static vector.

Phase states:

- `firstCycle`
- `starterWindow`
- `bridge`
- `late`

Formula families:

- Traffic pressure
- Damage pressure
- Conversion pressure
- Pitcher collapse hazard
- Suppression state
- Phase transition state
- Fork probability
- Outfield/sun/fielding tail
- Bullpen bridge leak

Checklist:

- [ ] Materialize phase state rows.
- [ ] Materialize formula driver rows.
- [ ] Emit story distribution: dead, normal, crooked, fork.
- [ ] Emit market expression: side, F5, full total, F5 total, team total, live-only, pass.
- [ ] Backtest formula story buckets by date and line bucket.

Exit criteria:

- Expected runs become downstream of story distribution, not the first decision.

## Phase 4: Player Identity Curves

Purpose:

Give each hitter and pitcher a moving prior that can inform today's matchup without overreacting to tiny samples.

Model shape:

```text
playerRateToday
  = leagueModel
  + playerIdentityOffset
  + currentStateDeviation
  + matchupAdjustment
```

Candidate families:

- Multivariate linear regression for season-scale identity baselines.
- Poisson regression for stable counts.
- Negative binomial regression for overdispersed count outcomes.
- Hierarchical/shrinkage model for player-specific offsets.

Checklist:

- [x] Catalog experiment component.
- [ ] Build hitter identity rows.
- [ ] Build pitcher identity rows.
- [ ] Build current-vs-identity deviation rows.
- [ ] Build game distribution rows.
- [ ] Backtest by stat target, role, sample size, and deviation bucket.

Exit criteria:

- Tiny samples are labeled and shrunk instead of promoted as fake heat.

## Phase 5: Pitcher-Batter Kernel

Purpose:

Model today's lineup against today's starter more directly.

Inputs:

- Pitcher pitch mix.
- Pitcher zone/command leak.
- Pitch-type damage allowed.
- Hitter pitch-type damage.
- Hitter whiff/take/chase profile.
- Platoon fit.
- First-cycle pressure.
- Second-cycle adjustment.

Checklist:

- [x] Catalog component.
- [ ] Derive pitcher pitch mix daily rows.
- [ ] Derive hitter pitch-type response rows.
- [ ] Join probable lineups to opposing starter.
- [ ] Score traffic, damage, whiff, and collapse fit.
- [ ] Feed kernel into state formulas.

Exit criteria:

- Totals and props can explain why this lineup can or cannot hurt this pitcher.

## Phase 6: Backtest Harness

Purpose:

Measure correctness by betting-relevant buckets, not average projection error.

Backtest buckets:

- Date
- Market lane
- Line bucket
- Price bucket
- Story bucket
- Game phase
- Player sample-size bucket
- Favorite/underdog
- Over/under mechanism

Headline metrics:

- Side correctness
- O/U correctness
- Story-bucket correctness
- ROI where price exists
- False heat rate
- Missed breakout rate

Checklist:

- [ ] Build `mlb_state_formula_backtests`.
- [ ] Build player identity backtest rows.
- [ ] Build pitcher-batter kernel backtest rows.
- [ ] Add May 31 holdout evaluator.
- [ ] Add daily model comparison report.

Exit criteria:

- M2 changes are judged by correctness and ROI buckets, not by lower MAE alone.

## Phase 7: Model Comparison

Purpose:

Run three models side by side.

Models:

- Current M2 projection baseline.
- Formula/story model.
- Trainable model from formula rows.

Checklist:

- [ ] Compare on May 23-May 30 walk-forward.
- [ ] Score May 31 holdout.
- [ ] Compare full-game side, F5 side, full O/U, F5 O/U, story bucket.
- [ ] Record where formula beats learned model.
- [ ] Record where learned model beats formula.

Exit criteria:

- No learned model can influence the board unless it beats or explains the formula layer walk-forward.

## Phase 8: Value Board Rebuild

Purpose:

Make the value board a filter, not a calculator.

Every row must include:

- Model lane
- Model confidence
- Market price
- Required hit rate
- EV
- Story reason
- Gate reason
- Backtest bucket
- Trust label: validated, research-only, watch, pass

Checklist:

- [ ] Enforce model-owned value rows only.
- [ ] Remove any UI-side value creation.
- [ ] Separate research-only from validated rows.
- [ ] Add lane-specific confidence and bucket proof.
- [ ] Add tests for missing confidence / missing bucket / missing model lane.

Exit criteria:

- No F5 O/U, totals, prop, or market row appears as value unless M2 emitted it.

## Phase 9: UI Surfaces

Purpose:

Show the mechanism behind a pick.

Game detail should show:

- Game-shape story.
- Phase map.
- Player identity deviations.
- Pitcher-batter pressure.
- O/U mechanism.
- Value-board explanation.
- Backtest bucket confidence.

Checklist:

- [ ] Add compact phase/story panel.
- [ ] Add player identity deltas to props and matchup detail.
- [ ] Add pitcher-batter kernel summary.
- [ ] Add value row proof block.
- [ ] Keep research-only rows visibly separated.

Exit criteria:

- A user can see why M2 picked the market expression without reading raw JSON.

## Phase 10: Promotion Gates

Purpose:

Prevent smart-sounding experiments from silently becoming betting advice.

Promotion requires:

- Walk-forward improvement.
- Holdout check.
- Bucket calibration.
- ROI where price exists.
- No UI-side math.
- Runbook updated.
- Tests added.

Checklist:

- [ ] Add lane promotion template.
- [ ] Add promotion history file.
- [ ] Add model comparison report to models page.
- [ ] Add health gate to block uncalibrated value rows.

Exit criteria:

- M2 lanes can graduate one at a time without turning into script soup.

## Immediate Work Block

Start here:

1. Add formal output schemas for `stateFormula`, `playerIdentity`, and `pitcherBatterKernel`.
2. Add warehouse schema for `mlb_state_formula_training_rows`.
3. Materialize first warehouse-backed formula rows from existing data.
4. Backtest formula rows on May 23-May 30.
5. Score May 31 as holdout.

## Definition Of Done For This Build

M2 is not done when the site has more cards. M2 is done when:

- model-owned rows drive the site
- formulas explain game mechanisms
- player identity is shrunken and measurable
- pitcher-batter fit affects totals and props
- May 31 stays a clean stress test
- every new edge survives bucketed backtesting
- the value board only displays rows the cartridge owns
