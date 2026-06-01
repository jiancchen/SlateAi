# MLB-M2 Build Run Plan

Status: Phases 0-10 infrastructure complete; no M2 lane promoted
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
| 0 | Freeze Baseline | Complete | Locked benchmark + reproducible benchmark suite |
| 1 | Core Contracts | Complete | Component docs and output contracts |
| 2 | Warehouse Tables | Complete | New derived tables, coverage gate, and freshness warnings |
| 3 | Formula Derivation | Complete / research-only | Kernel-fed phase state rows and formula outputs |
| 4 | Player Identity Curves | Complete / research-only | Player priors, deviation, and distribution rows |
| 5 | Pitcher-Batter Kernel | Complete / candidate pocket | Pitch-mix matchup rows fed into state formulas |
| 6 | Backtest Harness | Complete | Bucketed accuracy/story reports |
| 7 | Model Comparison | Complete | Projection vs formula vs stored candidate rows |
| 8 | Value Board Rebuild | Complete | Model-owned value rows only |
| 9 | UI Surfaces | Complete | Conditional M2 mechanism and research-surface views |
| 10 | Promotion Gates | Complete | Activation checklist for M2 lanes |

## Phase 0: Freeze Baseline

Purpose:

Make the current model measurable before changing behavior.

Checklist:

- [x] Lock current baseline artifact.
- [x] Track May 31 as the stress holdout.
- [x] Store May 31 O/U benchmark separately from old value-board totals audit rows.
- [x] Store state-formula training export for current published features.
- [x] Add a single command that reruns all M2 benchmark reports.
- [x] Add a benchmark summary report that compares current, candidate, and holdout results.

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
npm run data:research:mlb-m2-suite -- --start 2026-05-23 --end 2026-05-31 --holdout 2026-05-31 --today 2026-06-01
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
- [x] Add tests that reject value-board rows not emitted by the cartridge.

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
- [x] Add derive command for state formula rows.
- [x] Add derive command for player identity curves.
- [x] Add derive command for pitch-mix matchup rows.
- [x] Add health checks for table freshness and coverage.
- [x] Add missing-date warnings if a day closes without derived rows.

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

- [x] Materialize phase state rows.
- [x] Materialize formula driver rows.
- [x] Emit story distribution: dead, normal, crooked, fork.
- [x] Emit market expression: side, F5, full total, F5 total, team total, live-only, pass.
- [x] Add first research report for row coverage and starter-window F5 direction.
- [x] Backtest formula story buckets by date and bucket.

Exit criteria:

- Expected runs become downstream of story distribution, not the first decision.

Current artifacts:

- `models/mlb/cartridges/MLB-M2/research/state_formula_rows_report.py`
- `models/mlb/cartridges/MLB-M2/reports/state-formula-rows-report-2026-05-23-to-2026-05-31.md`
- `data-private/reports/mlb-m2-state-formula-rows-report-2026-05-23-to-2026-05-31.json`

Current read:

- Warehouse rows loaded through May 31: 7,120.
- Report range May 23-May 31: 1,000 rows across 125 games.
- Story distribution: 538 normal, 177 fork, 154 dead, 131 crooked.
- Starter-window F5 direction check: 54.8% on 42 graded rows.

Important:

This is a research substrate, not a promoted betting lane. The first formula labels are inspectable and warehouse-backed, but the naive story/F5 checks are too weak to reach the value board.

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
- [x] Build hitter identity rows.
- [x] Build pitcher identity rows.
- [x] Build current-vs-identity deviation rows.
- [x] Build game distribution rows.
- [x] Add first coverage and rough signal report.
- [x] Backtest by stat target, role, sample size, and deviation bucket.

Exit criteria:

- Tiny samples are labeled and shrunk instead of promoted as fake heat.

Current artifacts:

- `npm run data:derive:mlb-player-identity -- --through-date YYYY-MM-DD`
- `models/mlb/cartridges/MLB-M2/research/player_identity_rows_report.py`
- `models/mlb/cartridges/MLB-M2/reports/player-identity-rows-report-2026-05-23-to-2026-05-31.md`
- `data-private/reports/mlb-m2-player-identity-rows-report-2026-05-23-to-2026-05-31.json`

Current read:

- May 23-May 31 report range: 27,772 identity curves, 27,772 deviations, 27,758 distributions.
- Full derived warehouse through May 31: 184,256 curves, 184,256 deviations, 184,228 distributions.
- Hitter freshness reaches May 31; pitcher identity rows currently reach May 30 because pitcher rolling-form freshness stops there.
- Rough hitter signal checks are coverage checks only: hits direction 57.1%, total bases direction 57.0%, strikeouts direction 60.6%, walks direction 72.0%, HR direction 85.1% mostly from negative/sparse classification.

Important:

This is not promoted to the value board. The first pass proves the player-identity tables can be filled and audited; it does not prove prop edge yet.

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
- [x] Derive pitcher pitch mix daily rows.
- [x] Derive hitter pitch-type response rows.
- [x] Join probable lineups to opposing starter.
- [x] Score traffic, damage, whiff, and collapse fit.
- [x] Add first coverage and rough signal report.
- [x] Feed kernel into state formulas.

Exit criteria:

- Totals and props can explain why this lineup can or cannot hurt this pitcher.

Current artifacts:

- `npm run data:derive:mlb-pitcher-batter-kernel -- --through-date YYYY-MM-DD`
- `models/mlb/cartridges/MLB-M2/research/pitcher_batter_kernel_report.py`
- `models/mlb/cartridges/MLB-M2/reports/pitcher-batter-kernel-report-2026-05-23-to-2026-05-31.md`
- `data-private/reports/mlb-m2-pitcher-batter-kernel-report-2026-05-23-to-2026-05-31.json`

Current read:

- Full backfill through May 31: 135,153 pitch-mix rows, 206,697 hitter-response rows, 17,655 matchup rows.
- May 23-May 31 report range: 22,146 pitch-mix rows, 34,679 hitter-response rows, 2,709 matchup rows.
- High collapse-trigger top quartile: 52.5% game F5 over 4 rate.
- High damage-fit top quartile: 42.6% game F5 over 4 rate.
- High command-stress top quartile: 45.9% game F5 over 4 rate.

Important:

This layer is pitch-event backed, but the first score range is compressed. Keep it research-only until calibrated and joined into state formulas.

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

- [x] Build `mlb_state_formula_backtests`.
- [x] Build player identity backtest rows.
- [x] Build pitcher-batter kernel backtest rows.
- [x] Add May 31 holdout evaluator.
- [x] Add first stored-backtest research report.
- [x] Add daily model comparison report.

Exit criteria:

- M2 changes are judged by correctness and ROI buckets, not by lower MAE alone.

Current artifacts:

- `npm run data:backtest:mlb-m2-research -- --start-date YYYY-MM-DD --end-date YYYY-MM-DD`
- `npm run data:research:mlb-m2-backtests -- --start YYYY-MM-DD --end YYYY-MM-DD --holdout YYYY-MM-DD`
- `models/mlb/cartridges/MLB-M2/research/m2_research_backtest_report.py`
- `models/mlb/cartridges/MLB-M2/reports/m2-research-backtest-report-2026-05-23-to-2026-05-31.md`
- `data-private/reports/mlb-m2-research-backtest-report-2026-05-23-to-2026-05-31.json`

Current read:

- Stored May 23-May 31 rows: 1,000 state-formula rows, 12,230 player-identity rows, 61 pitcher-batter-kernel rows.
- May 31 holdout: state formulas 18/120, 15.0%; pitcher-batter kernel top-collapse 4/6, 66.7%.
- May 31 player signals: hits 59.3%, total bases 58.3%, strikeouts 59.9%, walks 68.4%, HR 84.7% mostly from rare-event negatives.

Important:

This proves the harness, not the model. State formulas are not promotion quality. Kernel and player identity have useful pockets but need walk-forward, line buckets, price buckets, and ROI before they can drive value rows.

## Phase 7: Model Comparison

Purpose:

Run three models side by side.

Models:

- Current M2 projection baseline.
- Formula/story model.
- Trainable model from formula rows.

Checklist:

- [x] Add first baseline-vs-candidate comparison report.
- [x] Score May 31 holdout against stored research rows.
- [x] Record no-promotion decision for current candidate stack.
- [x] Compare on May 23-May 30 walk-forward.
- [x] Compare full-game side, F5 side, full O/U, F5 O/U, story bucket.
- [x] Record where formula beats learned model.
- [x] Record where learned model beats formula.

Exit criteria:

- No learned model can influence the board unless it beats or explains the formula layer walk-forward.

Current artifacts:

- `npm run data:research:mlb-m2-model-comparison -- --start YYYY-MM-DD --end YYYY-MM-DD --holdout YYYY-MM-DD`
- `models/mlb/cartridges/MLB-M2/research/m2_model_comparison_report.py`
- `models/mlb/cartridges/MLB-M2/reports/m2-model-comparison-report-2026-05-23-to-2026-05-31.md`
- `data-private/reports/mlb-m2-model-comparison-report-2026-05-23-to-2026-05-31.json`

Current read:

- Locked baseline remains better: May 31 category lane 11/15, 73.3%; May 31 O/U stress set 5/5, 100.0%.
- Candidate state formulas: 18/120, 15.0% on May 31.
- Candidate pitcher-batter top-collapse: 4/6, 66.7% on May 31, interesting but tiny sample.
- Candidate player identity rows are prop/triage diagnostics and not comparable to side accuracy.

Decision:

No replacement model is promoted. Keep the locked baseline active; use the new rows as diagnostics for the next candidate.

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

- [x] Enforce model-owned value rows only for MLB side/full-total board rows.
- [x] Remove UI-side first-five ML/O-U value creation.
- [x] Separate F5 O/U research-only rows from validated rows.
- [x] Add UI test for research-only F5 O/U rows staying out of value rows.
- [x] Add lane-specific confidence and bucket proof contract for every model-owned row.
- [x] Add health gate for UI-created value rows and missing model-owned row rules.

Exit criteria:

- No F5 O/U, totals, prop, or market row appears as value unless M2 emitted it.

Current implementation:

- `web/src/App.tsx` no longer derives F5 ML or F5 O/U value rows from projected run distributions.
- MLB side and full-total rows require cartridge-side value gates.
- `web/src/views/BoardView.tsx` displays uncalibrated F5 O/U rows as research-only, without EV/100.
- `web/src/views/BoardView.test.tsx` covers the research-only F5 O/U behavior.

Validation:

- `npm --prefix web run test -- BoardView`

Important:

This blocks the specific May 31-style UI math failure. The full exit criterion is now encoded as an output contract: a row is not a promoted value row unless the cartridge emits required hit rate, EV, backtest bucket, trust label, value gate, gate reasons, and source artifact.

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

- [x] Add compact phase/story panel.
- [x] Add player identity deltas to props and matchup detail.
- [x] Add pitcher-batter kernel summary.
- [x] Add value row proof block.
- [x] Keep research-only rows visibly separated.

Exit criteria:

- A user can see why M2 picked the market expression without reading raw JSON.

Implementation:

- `web/src/features/mlb/MlbDetail.tsx` renders a conditional MLB-M2 mechanism panel when a game payload includes `gameShape`, `stateFormula`, `playerIdentity`, `pitcherBatterKernel`, or `valueProof`.
- `models/mlb/cartridges/MLB-M2/reports/m2-research-surface-2026-06-01.md` summarizes current M2 diagnostics, holdout reads, promotion status, and UI rules.
- Research-only state formulas, player identity, and pitcher-batter kernel rows stay visually and contractually separate from promoted value rows.

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

- [x] Add lane promotion template.
- [x] Add promotion history file.
- [x] Add model comparison report to models page.
- [x] Add health gate to block uncalibrated value rows.

Exit criteria:

- M2 lanes can graduate one at a time without turning into script soup.

Implementation:

- `models/mlb/cartridges/MLB-M2/promotion/LANE_PROMOTION_TEMPLATE.md`
- `models/mlb/cartridges/MLB-M2/promotion/promotion-history.md`
- `api/src/scripts/export-published-data.ts` now exports MLB parent cartridges by model id instead of hard-coding MLB-M0.
- `web/src/views/ModelsView.tsx` lists MLB-M0, MLB-M1, and MLB-M2 as separate parent cartridges when runs exist.
- `models/mlb/cartridges/MLB-M2/checks/check_value_row_gates.mjs` blocks UI-generated F5 value rows and verifies the model-owned value gate note.

## Completed Infrastructure Block

Completed in this build:

1. Added formal output schemas for `stateFormula`, `playerIdentity`, and `pitcherBatterKernel`.
2. Added warehouse schema and derive commands for M2 state formulas, player identity, and pitcher-batter kernel rows.
3. Materialized warehouse-backed formula rows from existing pitch/game/player data.
4. Backtested formula rows, identity rows, and kernel rows on May 23-May 31.
5. Scored May 31 as the holdout and recorded the no-promotion decision.
6. Added a benchmark-suite runner plus value-row and warehouse-coverage gates.

## Next Candidate Work Block

Start the next M2 candidate here:

1. Calibrate kernel-fed state formulas by line bucket, price bucket, park, and run environment.
2. Add actual-value ROI settlement for any lane that wants to leave research-only.
3. Train against prior dates only, then score May 31 without selecting rules on May 31 outcomes.
4. Promote only a single lane at a time through `promotion/LANE_PROMOTION_TEMPLATE.md`.
5. Keep MLB-M0 active until a lane beats the locked benchmark and passes the warehouse/value gates.

## Definition Of Done For This Build

The MLB-M2 infrastructure build is complete, but MLB-M2 is not promoted as a betting model yet. M2 becomes promotion-ready only when:

- model-owned rows drive the site
- formulas explain game mechanisms
- player identity is shrunken and measurable
- pitcher-batter fit affects totals and props
- May 31 stays a clean stress test
- every new edge survives bucketed backtesting
- the value board only displays rows the cartridge owns
