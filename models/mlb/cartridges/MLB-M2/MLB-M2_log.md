# MLB-M2 Log

This log records model and warehouse changes that matter to MLB-M2. M2 is a draft branch from MLB-M0, not the active MLB model.

## 2026-05-31 - Draft Cartridge Scaffolded From MLB-M0

Created a full MLB-M2 parent cartridge with the same app and publish contract as MLB-M0.

Implemented:

- `models/mlb/cartridges/MLB-M2/` scaffolded from current MLB-M0.
- `models/mlb/registry.json` registers MLB-M2 as `draft` and `basedOn: MLB-M0`.
- `models/mlb/app-model.js` can resolve the MLB-M2 app adapter without making M2 active.

Current trust level:

- Good for isolated M2 development.
- Not active for public predictions.
- Must pass M0-vs-M2 comparison before activation.

## 2026-05-31 - Game-Shape Reality-Gap Layer

Added `lib/mlb-game-shape.js`.

Why it exists:

M0 can say a side is strong while the real game shape is fragile. M2 has to show the gap between raw data confidence and baseball reality: first-five timing, bridge innings, conversion failure, one bad inning, bullpen volatility, weather carry, and market-expression fit.

Implemented:

- `analysis.gameShape`
- `analysis.indicators.gameShape`
- `analysis.mlbProjection.gameShape`
- Phase map: full-game traffic, first five, late, bridge
- Scores: reality gap, chaos, dead-early, phase split, bullpen flip, starter control
- Market implications: side, first five, total, first inning

Current trust level:

- Good as a transparent diagnostic.
- Not proven as a betting edge until settled by bucket.

Gate:

High reality-gap games should not promote blind full-game moneyline. They must name the cleaner lane or pass.

## 2026-05-31 - RF Research Lens

Added the RF lens to the M2 game-shape read.

Current rule:

- Totals RF research is usable as a nonlinear check.
- Moneyline RF remains advisory only.
- First-five RF remains advisory only.
- First-inning RF remains advisory only.

Reason:

The research docs show RF totals as the only deployable lane so far. M2 should measure RF impact, not pretend RF solved the whole board.

Next proof required:

- Store M2 game-shape labels in run artifacts.
- Compare M0 vs M2 on May 31 and the next completed MLB slate.
- Backtest whether high `realityGapScore` predicts ML misses, total chaos, or better first-five/first-inning expressions.

## 2026-06-01 - Game-Shape Categories + Backtest Harness

Replaced the first vague M2 shape read with a concrete category contract.

Implemented:

- `analysis.gameShape.category`
- `analysis.gameShape.laneMap`
- `analysis.gameShape.inningMap`
- compact indicator fields for `category`, `bestExpression`, and `categoryConfidence`
- `models/mlb/cartridges/MLB-M2/research/game_shape_backtest.py`
- `models/mlb/cartridges/MLB-M2/reports/game-shape-backtest-2026-05-10-to-2026-05-31.md`

Current category set:

- Clean phase stack
- Early-pressure side
- Starter-to-bullpen flip
- Late-rescue side
- Dead-zone side
- Favorite conversion trap
- Crooked-inning game
- Starter-duel under
- Underdog pressure lane
- Weather-carry chaos
- Balanced traffic game

Backtest result on canonical settled rows from 2026-05-10 through 2026-05-31:

- Baseline full-game side: 59.0% on 212 rows.
- Baseline first-five side: 52.8% on 212 rows.
- M2 allowed-side bucket: 67.5% on 40 rows.
- M2 category lane hit: 62.6% on 195 graded lane rows.
- Starter-to-bullpen flip F5 lane: 68.6% on 35 rows.
- Dead-zone timing/F5 lane: 70.6% on 17 rows.

Crazy-idea walk-forward models were also tested:

- RF lane chooser: 53.4% on action rows; F5 sublane 62.5%.
- Gradient lane chooser: 53.9% on action rows; F5 sublane 65.0%, high-total sublane 60.6%.
- Logistic lane chooser: failed the test at 47.4% and should not be promoted.

Rule sweeps surfaced concrete sublanes worth future testing:

- `starter_control_score >= 55` hit 77.8% on full-game side rows.
- `phase_split_score >= 55` hit 66.7% on F5 side rows.
- `chaos_score >= 70` produced high-total shape 62.8% and a much higher YRFI rate than baseline.
- `pick_lineup_conversion <= 25` improved model F5 total rows.

Current interpretation:

M2 has a useful lane-separation signal, especially for deciding when a side should become F5/timing or total shape. It is not ready to activate as a full automatic betting engine. The next proof is to store M2 categories in daily run artifacts and settle them date by date.

## 2026-06-01 - Current Benchmark Locked

Locked the current M2 baseline in:

- `models/mlb/cartridges/MLB-M2/benchmarks/2026-06-01-current-baseline.json`
- `models/mlb/cartridges/MLB-M2/benchmarks/README.md`

This is the target future M2 variants must beat:

- Baseline full-game side: 59.0% on 212 rows.
- M2 category lane hit: 62.6% on 195 graded lane rows.
- M2 allowed-side bucket: 67.5% on 40 rows.
- Starter-to-bullpen flip as F5 lane: 68.6% on 35 rows.
- Dead-zone timing/F5 lane: 70.6% on 17 rows.

May 31 is now the stress-slate holdout benchmark:

- Training data allowed through 2026-05-30.
- Holdout date 2026-05-31.
- Full-game side: 11/15, 73.3%.
- First-five side: 9/15, 60.0%.
- M2 category lane: 11/15, 73.3%.
- O/U benchmark set: 5/5, 100.0%.

Future M2 iterations should not claim a clean May 31 improvement if they used May 31 outcomes during training or rule selection.

Note: the May 31 O/U benchmark is separate from the old value-board totals audit rows. Keep those metrics separate during future model comparisons.

## 2026-06-01 - Run-Environment Chaos Over Test

Tested whether the May 31 O/U lesson can be learned from prior data as a broader run-environment tail-risk lane rather than as a weather-only rule.

Artifacts:

- `models/mlb/cartridges/MLB-M2/research/run_environment_chaos_over_test.py`
- `models/mlb/cartridges/MLB-M2/reports/run-environment-chaos-over-test-2026-06-01.md`
- `data-private/reports/mlb-m2-run-environment-chaos-over-test-2026-06-01.json`

Result:

- Training rows before May 31: 180.
- May 31 holdout rows: 15.
- Old exposed full-game total lane: 50.7% pre-holdout on 140 rows; 20.0% on May 31.
- Existing weather-carry chaos mask: 47.1% pre-holdout on 34 rows; 100.0% on May 31. This means weather/carry alone cannot be trusted as the learned mechanism.
- Existing crooked/bullpen chaos mask: 53.4% pre-holdout on 73 rows; 71.4% on May 31.
- Best train-selected threshold rule: 62.5% pre-holdout on 24 rows, but only 25.0% on May 31. This failed the holdout transfer test.
- Walk-forward RF over ranking: aggregate top-5 25/50, 50.0%; May 31 top-5 5/5. This found the May 31 shape but is not stable enough across dates to promote.

Interpretation:

The warehouse contains ingredients for this lane, but not enough stable structure yet. The next M2 improvement should persist an explicit `run_environment_tail` feature set with park, sun-position/visibility, weather modifiers, market-total context, run clustering, one-bad-inning risk, bullpen meltdown, lineup conversion, and false-under flags. That table should be trained and calibrated separately from side picks.

Correction: sun-position/visibility is a separate factor from weather. Weather covers temperature, wind, precipitation, and roof/open-air state. Sun-position requires ballpark geometry and game-time astronomy: venue latitude/longitude, field orientation, scheduled first pitch time, solar azimuth/elevation, cloud cover, shadow state, and defensive-zone exposure. Do not bury this under `weather_carry`.

## 2026-06-01 - Sun-Position Visibility Warehouse + M2 Modifier

Implemented the sun-position visibility factor as a real warehouse/model input, not just a research note.

Warehouse additions:

- `mlb_game_sun_visibility_snapshots`: game-time venue geometry, solar azimuth/elevation, outfielder look-path angle, low-sun/high-sun sky-tracking risk, shadow-transition risk, composite visibility score, and notes.
- `mlb_game_visibility_outcomes`: fielding errors, outfield errors, outfield hits, outfield air hits, outfield extra-base hits, outfield HRs, and visibility-pressure event count from feed/live play `hitData`.

Model integration:

- `stateContext.sunVisibility` is exported in MLB-M2 day files.
- `mlb-analysis-context.js` adds a capped hit/run lift for high visibility-risk games.
- `mlb-game-shape.js` adds a capped chaos-score modifier and metric note.
- `mlb-props.js` adds a small total-bases/hits/singles adjustment, with total-bases extra-base multiplier capped at 7%.

Backfill:

- Replayed local raw MLB snapshots from 2026-05-10 through 2026-05-31.
- May 31 coverage: 15/15 sun snapshots and 15/15 visibility outcome rows.
- May 31 visibility-risk read after adding high-sun tracking risk: average 20.6/100, 2 medium-risk games, 8 low-or-better games.

Important limitation:

Cloud cover and actual retractable-roof open/closed state are not fully joined yet, so this factor must remain a small modifier until those are wired and walk-forward tested.

## 2026-06-01 - May 31 F5 O/U Value-Board Failure Downgrade

The May 31 value board exposed first-five O/U rows as positive expected value even though the lane only used raw projected first-five runs, a Poisson probability, and Kalshi ask. That was not a calibrated value model.

Example exposed rows from the board:

- Marlins @ Mets Under 3.5 F5: missed, actual F5 total 6.
- Diamondbacks @ Mariners Over 4.5 F5: missed, actual F5 total 1.
- Royals @ Rangers Under 3.5 F5: missed, actual F5 total 6.
- Phillies @ Dodgers Under 4.5 F5: missed, actual F5 total 6.
- Yankees @ Athletics Under 5.5 F5: missed, actual F5 total 16.
- Cubs @ Cardinals Over 4.5 F5: hit, actual F5 total 5.
- Tigers @ White Sox Over 4.5 F5: missed, actual F5 total 1.
- Angels @ Rays Over 4.5 F5: missed, actual F5 total 4.

Action taken:

- First-five O/U rows are now tagged `research-only`.
- The overview value board no longer ranks F5 O/U rows beside validated value rows.
- The first-five board can still show them in a muted research section with gate reasons.

## 2026-06-01 - Game-Shape Radar Contract

Defined the visual form of M2 game shape so the model can explain baseball shape before deciding the market lane.

Implemented:

- `analysis.gameShape.radar`
- six axes: Pressure, Chaos, Freeze, Air, Bridge, Flow
- game-level environment polygon
- pick/opponent team polygons
- dominant-axis summary for UI cards

Rule:

High scores mean "more of this shape," not "better." The radar must never be displayed as win confidence. It is the map that explains whether the bet belongs in ML, F5, total, first-inning, prop, live-only, or no-bet.

Important framing:

The six-axis radar is the compressed display layer, not the full vector space. Future model branches should keep a larger warehouse vector underneath it: game vector, team-game vector, player-game vector, inning-state vector, and market vector.

## 2026-06-01 - Game-Shape Vector Trend Pass

Added a first vector trend report:

- `models/mlb/cartridges/MLB-M2/research/game_shape_vector_trends.mjs`
- `models/mlb/cartridges/MLB-M2/reports/game-shape-vector-trends-2026-05-10-to-2026-05-31.md`
- `data-private/reports/mlb-m2-game-shape-vector-trends-2026-05-10-to-2026-05-31.json`

Coverage:

- Requested range: 2026-05-10 through 2026-05-31.
- Usable vector rows: 123 games, 246 team-game vectors.
- Actual usable dates: 2026-05-23 through 2026-05-31, because earlier published files lack the game/state artifacts needed to rebuild M2 radar vectors.

Early reads:

- High team `air` had the largest single-axis F5 explosion lift in this sample.
- Clean pressure performed better than generic pressure-chaos.
- Freeze without pressure behaved like a true dead-offense state in the tiny available sample.
- Flow does not mean safe; aligned-but-chaotic games can still be high-total games.

## 2026-06-01 - Warehouse-Backed State Formula Rows

Materialized the first M2 state-formula training rows from the warehouse instead of rebuilding from published JSON.

Implemented:

- `mlb_state_formula_training_rows` derivation in `pipeline/mlb/warehouse/mlb_warehouse.py`.
- `npm run data:derive:mlb-state-formulas`.
- `models/mlb/cartridges/MLB-M2/research/state_formula_rows_report.py`.
- `models/mlb/cartridges/MLB-M2/reports/state-formula-rows-report-2026-05-23-to-2026-05-31.md`.
- `data-private/reports/mlb-m2-state-formula-rows-report-2026-05-23-to-2026-05-31.json`.

Warehouse coverage:

- 7,120 state formula rows loaded through May 31.
- May 23-May 31 report range: 1,000 rows across 125 games.
- Phase states: `firstCycle`, `starterWindow`, `bridge`, `late`.

First report distribution:

- Story buckets: 693 normal, 176 dead, 102 crooked, 29 fork.
- Market expressions: 693 pass, 174 first-five under, 63 first-five over, 39 full-game over, 29 live-only, 2 live/full under watch.
- Naive row story check: 27.9% on 971 rows.
- Starter-window F5 direction check: 47.5% on 40 rows.

Interpretation:

This is useful as a warehouse substrate and debugging surface, but not useful yet as a promoted value-board lane. The formula rows are now measurable; the first calibration is too weak and must be improved with player identity curves, pitcher-batter kernels, better actual-state labels, and line/price buckets before it can influence picks.

## 2026-06-01 - Player Identity Curves Warehouse Pass

Materialized the first player identity curve layer for MLB-M2.

Implemented:

- `mlb_player_identity_curves_daily` derivation for hitters and starting pitchers.
- `mlb_player_current_deviation_daily` derivation for current-vs-identity labels.
- `mlb_player_game_distribution_daily` derivation for per-game hitter and pitcher metric distributions.
- `npm run data:derive:mlb-player-identity`.
- `models/mlb/cartridges/MLB-M2/research/player_identity_rows_report.py`.
- `models/mlb/cartridges/MLB-M2/reports/player-identity-rows-report-2026-05-23-to-2026-05-31.md`.
- `data-private/reports/mlb-m2-player-identity-rows-report-2026-05-23-to-2026-05-31.json`.

Warehouse coverage:

- Full derived rows through May 31: 184,256 curves, 184,256 deviations, 184,228 distributions.
- May 23-May 31 report range: 27,772 curves, 27,772 deviations, 27,758 distributions.
- Hitter identity freshness: March 27 through May 31.
- Pitcher identity freshness: March 31 through May 30.

First rough signal checks:

- Hits per PA direction: 57.1% on 2,446 rows.
- Total bases per PA direction: 57.0% on 2,446 rows.
- Strikeout rate direction: 60.6% on 2,446 rows.
- Walk rate direction: 72.0% on 2,446 rows, mostly from a sparse/selective signal.
- HR direction: 85.1% on 2,446 rows, mostly from correctly staying negative on a rare event. This is not a plus-edge HR model.

Interpretation:

The player identity substrate now exists and can prevent some fake heat by labeling sample size, deviation, volatility, and approach state. It is still research-only. The next real work is bucketed player backtesting and joining identity into the pitcher-batter kernel so props/totals can explain repeatability instead of just recency.

## 2026-06-01 - Invented Vector Search

Added a wider vector search to break the six radar axes into raw invented dimensions.

Artifacts:

- `models/mlb/cartridges/MLB-M2/research/game_shape_dimension_search.mjs`
- `models/mlb/cartridges/MLB-M2/reports/game-shape-dimension-search-2026-05-10-to-2026-05-31.md`
- `data-private/reports/mlb-m2-game-shape-dimension-search-2026-05-10-to-2026-05-31.json`

Team dimensions tested:

- `pitcherCollapseRisk`
- `starterEarlyCrack`
- `pitcherCommandLeak`
- `batterFireRate`
- `trafficPressure`
- `conversionVolatility`
- `deadBatRisk`
- `defensiveRunLeak`
- `bridgeLeak`
- `carryBoost`
- `mentalityPressure`
- `marketTension`

Game dimensions tested:

- `starterPairCollapse`
- `earlyJolt`
- `trafficFork`
- `powerWeatherTail`
- `bridgeChaos`
- `deadZone`
- `asymmetry`
- `marketRealityGap`

Early reads:

- `defensiveRunLeak` had the strongest single-dimension team F5 explosion separation in the pooled sample: top quartile 31.3% vs 18.7% baseline.
- `pitcherCollapseRisk + conversionVolatility` was the best team pair: 13 rows, 46.2% 5+ F5 explosion rate.
- `marketRealityGap` had the strongest single game-dimension F5-total separation: top quartile 65.6% vs 48.8% baseline.
- `deadZone + marketRealityGap` was the best game pair: 9 games, 77.8% F5 total 5+ rate.
- `batterFireRate` alone was weak; it needs pitcher/defense leak or bridge leak to become useful.
- `deadBatRisk` alone did not isolate dead offenses in this pooled sample; it likely needs low-traffic/low-fire pairing.

Interpretation:

The six radar axes are not enough for training. They should stay as display compression while the warehouse stores a larger vector with raw team, player, inning, market, and environmental dimensions.

Required before reactivation:

- settled line/ask/probability/edge bucket calibration
- walk-forward daily ROI and hit-rate checks
- chaos-gate bucket settlement
- no promotion unless a row clears a real `validated` value gate

## 2026-06-01 - May 31 First-Five Stress Harness

Added a named M2 stress harness for the May 31 first-five total failure.

Artifacts:

- `models/mlb/cartridges/MLB-M2/research/may31_f5_stress_harness.py`
- `models/mlb/cartridges/MLB-M2/reports/may31-f5-stress-harness-2026-05-31.md`
- `data-private/reports/mlb-m2-may31-f5-stress-harness-2026-05-31.json`

Result:

- The warehouse has the necessary raw ingredients: 670 first-five plate appearances and 449 first-five batted-ball events with pitch `hitData` for May 31.
- The exposed M2 F5 point projection had a 3.47-run mean absolute error, 2.90-run median absolute error, and 10.8-run max miss. Signed bias was +1.6 average, but that is calibration-only because opposite misses can cancel out.
- Absolute-error buckets: 3 games within 1 run, 2 games from 1-2 runs, 6 games from 2-4 runs, and 4 games over 4 runs.
- Scalar fit was `actual ~= 1.348 * projected`; this improved F5 side direction from 5/15 to 9/15, but it did not solve the slate.
- Therefore this is not just a missing multiplier. M2 needs a totals mixture lane: normal expectation, strand risk, and crooked-inning/power-contact tail.

Feature process for M2 totals:

1. Freeze the stress fixture: May 31 F5 lines, projections, actuals, PA sequences, and pitch `hitData`.
2. Separate point-error from side-error.
3. Classify actual game shape: strand, traffic-converted, crooked-inning, power-contact, contact-suppressed.
4. Turn postgame tags into pregame rolling features through the prior date only.
5. Publish only model-owned F5 market expressions; the UI only filters rows.

## 2026-06-01 - First-Five Heavy-Tail Overlay

Implemented the first M2 fix for the May 31 F5 total failure.

Code/artifacts:

- `models/mlb/cartridges/MLB-M2/lib/mlb-analysis-context.js`
- `models/mlb/cartridges/MLB-M2/research/may31_f5_tail_overlay_check.mjs`
- `models/mlb/cartridges/MLB-M2/reports/may31-f5-tail-overlay-check-2026-06-01.md`
- `data-private/reports/mlb-m2-may31-f5-tail-overlay-check-2026-06-01.json`

What was wrong:

- F5 totals were too point-estimate driven.
- Chaos was only a warning/veto layer, not a distribution-shape layer.
- The model could see ingredients like run clustering, one-bad-inning risk, low conversion, quiet starts, carry weather, and sun visibility, but it did not decide whether those formed an over-tail, a strand-tail, or a live fork.
- The old value board then turned those brittle point estimates into fake EV rows.

What changed:

- Added `first5TailOverlay` with `baseProjectedRuns`, `adjustedProjectedRuns`, `shape`, `tailScore`, `strandScore`, `forkScore`, `marketExpression`, and driver notes.
- Added explicit shapes: `over-tail`, `strand-tail`, `unsupported-over`, `live-only fork`, and `balanced`.
- Over-tail can keep a messy over alive when the failure mode is actually run explosion.
- Unsupported overs are downgraded when the model projection is over the line but catastrophe support is missing.
- Live-only fork prevents a pregame side when both explosion and strand branches are live.

May 31 replay:

- Active F5 total sides after overlay: 4/4.
- Old exposed F5 O/U rows checked: 8.
- Old wrong rows still active: 0.
- This is retrospective stress-fixture validation, not a clean future backtest. Next step is walk-forward testing on prior days before reactivating F5 O/U as bet-grade value.

## 2026-06-01 - F5 Tail Overlay Broader Backtest

Added a broader overlay replay/backtest so May 31 is not the only scoreboard.

Artifacts:

- `models/mlb/cartridges/MLB-M2/research/f5_tail_overlay_backtest.mjs`
- `models/mlb/cartridges/MLB-M2/reports/f5-tail-overlay-backtest-2026-06-01.md`
- `data-private/reports/mlb-m2-f5-tail-overlay-backtest-2026-06-01.json`

Range backtest, May 10-May 31:

- Rows: 123.
- Base forced O/U: 72/121, 59.5%.
- Tail-adjusted forced O/U: 67/122, 54.9%.
- Original published active O/U: 42/70, 60.0%.
- Current published active O/U: 42/69, 60.9%.
- Forced stress O/U: 70/122, 57.4%.

May 31 stress date:

- Base forced O/U: 4/14, 28.6%.
- Tail-adjusted forced O/U: 10/15, 66.7%.
- Original published active O/U: 0/5, 0.0%.
- Current published active O/U: 4/4, 100.0%.
- Forced stress O/U: 15/15, 100.0%.
- Base projection MAE: 3.47.
- Tail-adjusted projection MAE: 2.87.
- Forced stress projection MAE: 1.13.

Interpretation:

The forced stress side is useful as a feature-discovery fixture for all 15 May 31 games, but it does not transfer cleanly across the full date range yet. Therefore the production behavior keeps the overlay as a gating and selective override layer, not a global replacement for expected runs.

## 2026-06-01 - May 31 Team Run Truth Audit

Added a team-level run truth audit because F5 totals are not mainly an error-minimization problem. The model needs to identify which teams are live for first-five scoring, which teams are dead, and which teams have explosion paths.

Artifacts:

- `models/mlb/cartridges/MLB-M2/research/may31_team_run_truth_audit.mjs`
- `models/mlb/cartridges/MLB-M2/reports/may31-team-run-truth-audit-2026-06-01.md`
- `data-private/reports/mlb-m2-may31-team-run-truth-audit-2026-06-01.json`

May 31 team-level result:

- Team rows: 30.
- 3+ run classifier: 19/30, 63.3%.
- Explosion classifier: 17/30, 56.7%.
- Dead-offense classifier: 20/30, 66.7%.
- Actual explosion teams: 9.
- Actual dead teams: 13.

Biggest problem:

The model missed explosion buckets more than it merely missed run totals. Examples: Yankees 2.6 projected vs 13 actual, Giants 3.4 vs 11, Pirates 2.7 vs 9, Rangers 1.4 vs 6, Orioles 1.7 vs 6, Mets 1.3 vs 5, Dodgers 2.8 vs 6. These were correctness failures, not just bad residuals.

Correctness-first rule:

For M2 totals, expected runs should be downstream of a game-shape classifier:

- explosion path
- dead path
- normal path
- live fork

Do not optimize this lane primarily by MAE. A lower MAE can still lose the betting side if it misses the explosion/dead bucket.

## 2026-06-01 - Phase-Specific Game-Shape Vector Search

Added a phase-vector search so M2 stops treating a game as one blended radar.

Artifacts:

- `models/mlb/cartridges/MLB-M2/research/phase_shape_vector_search.mjs`
- `models/mlb/cartridges/MLB-M2/reports/phase-shape-vector-search-2026-05-10-to-2026-05-31.md`
- `data-private/reports/mlb-m2-phase-shape-vector-search-2026-05-10-to-2026-05-31.json`

Coverage:

- Requested range: 2026-05-10 through 2026-05-31.
- Usable rows: 123 games and 246 team phase vectors.
- Actual usable dates: 2026-05-23 through 2026-05-31, because earlier published files do not have enough state artifacts to rebuild these vectors.

Phase vectors tested:

- first cycle
- starter window / F5
- bridge innings
- late innings
- outfield / error tail

Calculation contract:

- No raw trailing-average state.
- Use medians, trimmed means, tail-event rates, capped scales, and head-to-head interactions.
- One 15-run game should update tail/event dimensions; it must not become the next game's naive baseline.

Early reads:

- `starterCollapseAttack` is the current team F5 explosion boost: top quartile 28.6% vs 18.7% baseline.
- `strandFork` is a suppressor/fork: 5+ F5 fell to 11.1%, while dead F5 rose to 49.2% and bridge burst rose to 31.7%.
- `bridgeAttack + stateShock` was the best positive team interaction: 42.9% 5+ F5 on 14 rows.
- `bridgeRunState + outfieldErrorTail` was the best positive game interaction: 66.7% F5 5+ and 73.3% full 9+ on 15 games.
- `firstInningRunState + compressedFork` is a phase-shift warning, not an F5 over signal: 25.0% F5 5+, but 66.7% bridge 3+.

Interpretation:

M2 needs boost, suppressor, and phase-shift labels. A large separation is not automatically "good"; it may mean the runs arrive later or not at all. The visible six-axis radar remains a UI compression layer, while the warehouse/model should keep these phase-specific vectors for training.

## 2026-06-01 - Run Total Story Engine

Added a story-first totals report because aggregation still misses the real betting question.

Artifacts:

- `models/mlb/cartridges/MLB-M2/research/run_total_story_engine.mjs`
- `models/mlb/cartridges/MLB-M2/reports/run-total-story-engine-2026-05-31-today-2026-06-01.md`
- `data-private/reports/mlb-m2-run-total-story-engine-2026-05-31-today-2026-06-01.json`

Purpose:

For each settled game, ask:

- Why did the game go over?
- Why did the game go under?
- Was the mechanism visible pregame?
- Is that mechanism live on today's slate?

Story buckets now tracked:

- crooked-inning over
- traffic-conversion over
- power over
- free-pass over
- bridge over
- fielding / outfield-tail over
- starter hold under
- strand under
- power-suppressed under
- bat-missing under
- bridge-clean under
- fork / live-only

May 31 examples:

- Yankees @ Athletics was not just "projection missed." It was a starter-window crooked-inning and traffic avalanche: 16 F5 runs, 24 F5 baserunners, 7 F5 free passes, and a 13-run third.
- Giants @ Rockies was a full tail event: 25 total runs, 16 F5 runs, 16 XBH, 30 F5 baserunners, free-pass fuel, defensive leak, and Coors/carry context.
- Diamondbacks @ Mariners was an under because power stayed contained, traffic stranded, and strikeouts deleted chains despite some free-pass/counter-over ingredients.
- Cubs @ Cardinals split the phases: F5 over from early traffic, full-game under because bridge/late stayed clean and power stayed contained.

Rule:

M2 totals should classify the story bucket first and only then price the lane. The value board should filter model-owned story buckets; it must not turn a point projection into EV by itself.

Current limitation:

The 2026-06-01 published slate currently has no MLB game files, so the today-transfer check produced zero MLB candidates. Once the MLB slate is published, this same script will generate "will it happen today?" checks from the active pregame files.

## 2026-06-01 - Pitcher-Batter Matchup Kernel Intake

Added the component contract for pitcher-batter matchup modeling:

- `models/mlb/cartridges/MLB-M2/components/pitcher-batter-matchups/README.md`

Source intake:

- Allen/Savala: keep temporal splits clean, use no-bet zones/cutoffs, and do not bet every model edge. Useful for M2 value gating.
- CMC/TFT pitcher ERA paper: pitcher performance should be handled as multivariable sequence state, not a raw trailing average. Useful for starter explosion/hold modeling.
- Fast Break Bets cluster-luck writeup: separate traffic from damage. AVG/OBP-like pressure without SLG/ISO-like pressure is a strand/fork state, not a clean over.

New M2 target:

Build a `pitcher-batter matchup kernel` that scores today's lineup against the opposing starter by pitch mix, zone leak, command stress, whiff fit, damage fit, handedness split, first-cycle pressure, and second-cycle adjustment.

Required derived tables:

- `mlb_pitcher_pitch_mix_daily`
- `mlb_hitter_pitch_type_response_daily`
- `mlb_lineup_pitcher_matchup_daily`

The kernel should feed totals as a story classifier first:

- starter hold under
- whiff suppression under
- traffic-without-damage strand
- first-cycle traffic over
- starter-collapse over
- pitch-mix damage over
- bridge-over after starter
- live-only fork

Do not promote this into the value board until it survives line-bucket, story-bucket, and date-level ROI settlement.

## 2026-06-01 - State Formula And Parallel Model Baseline

Added the state-formula component and a first trainable parallel-model research lane.

Artifacts:

- `models/mlb/cartridges/MLB-M2/components/state-formulas/README.md`
- `models/mlb/cartridges/MLB-M2/research/state_formula_parallel_model.py`
- `models/mlb/cartridges/MLB-M2/reports/state-formula-parallel-model-2026-05-10-to-2026-05-31.md`
- `data-private/reports/mlb-m2-state-formula-parallel-model-2026-05-10-to-2026-05-31.json`
- `data-private/model-training/mlb-m2-state-formula-training-rows-2026-05-10-to-2026-05-31.csv`

State-formula rule:

Vectors describe state, but formulas move state. M2 should produce phase states for first cycle, starter window, bridge, and late innings, then compute traffic, damage, conversion, collapse, and suppression mechanisms from interacting inputs.

Parallel model rule:

The trainable model receives the same pregame/formula inputs and predicts:

- F5 O/U side
- full-game O/U side
- F5 story bucket (`dead`, `normal`, `crooked`)

Current walk-forward baseline:

- Coverage: 123 rows, May 23 through May 31.
- Forced F5 projection baseline: 60.2% on 123 rows.
- Forced full-game projection baseline: 51.2% on 123 rows.
- Tree walk-forward F5 side: 49.4% on 81 rows.
- Tree walk-forward full-game side: 44.4% to 40.7% on 81 rows.
- Tree walk-forward F5 story bucket: 42.0% on 81 rows.

Interpretation:

The first trainable pass does **not** beat the existing projection baseline. That is useful: it means the currently published aggregate features are not enough to learn game shape. M2 needs the derived state-formula rows and pitcher-batter matchup tables before a learned model should influence the value board.

Next derived tables:

- `mlb_state_formula_training_rows`
- `mlb_pitcher_pitch_mix_daily`
- `mlb_hitter_pitch_type_response_daily`
- `mlb_lineup_pitcher_matchup_daily`

## 2026-06-01 - Player Identity Curves Experiment

Cataloged the player-level regression idea as a separate M2 experiment:

- `models/mlb/cartridges/MLB-M2/components/player-identity-curves/README.md`

The core idea:

Each hitter and pitcher should have an identity curve: a shrunken expectation of who the player is this season, how that compares to career baseline, and how today's matchup can move the expected distribution.

Important correction:

Do not build fully independent per-player models as the first version. Most players do not have enough current-season rows for that. Use a global model plus player-specific offsets and shrinkage:

```text
playerRateToday
  = leagueModel
  + playerIdentityOffset
  + currentStateDeviation
  + matchupAdjustment
```

Candidate model families:

- multivariate linear regression for season-scale identity baselines
- Poisson regression for stable count outcomes
- negative binomial regression for overdispersed counts and tail outcomes
- hierarchical/shrinkage models so small samples do not fake certainty

Proposed derived tables:

- `mlb_player_identity_curves_daily`
- `mlb_player_current_deviation_daily`
- `mlb_player_game_distribution_daily`
- `mlb_player_identity_model_backtests`

How it should connect:

- Hitter positive damage deviation feeds `damagePressure`.
- Hitter positive traffic deviation feeds `trafficPressure`.
- Pitcher command deterioration feeds `collapseHazard`.
- Pitcher stable whiff identity feeds `suppressionState`.
- High volatility clusters increase `fork` probability.

Promotion gate:

This does not become a betting lane until it improves props, HR board, pitcher reads, or team traffic/damage formulas in bucketed backtests.

## 2026-06-01 - M2 Build Run Plan And Warehouse Schema Start

Added the full M2 build run plan:

- `models/mlb/cartridges/MLB-M2/m2-build-runplan.md`

Started Phase 1 and Phase 2:

- Added formal output schemas for `analysis.stateFormula`, `analysis.playerIdentity`, and `analysis.pitcherBatterKernel`.
- Registered schema paths in `output-contract.json`.
- Added the new component schema files under `models/mlb/cartridges/MLB-M2/schemas/`.
- Added initial warehouse tables for state formulas, player identity curves, pitcher pitch mix, hitter pitch-type response, lineup-pitcher matchups, and related backtests.
- Ran `npm run data:init`; the new tables were created in `data-private/warehouse/sports.db`.

New warehouse tables:

- `mlb_state_formula_training_rows`
- `mlb_state_formula_backtests`
- `mlb_player_identity_curves_daily`
- `mlb_player_current_deviation_daily`
- `mlb_player_game_distribution_daily`
- `mlb_player_identity_model_backtests`
- `mlb_pitcher_pitch_mix_daily`
- `mlb_hitter_pitch_type_response_daily`
- `mlb_lineup_pitcher_matchup_daily`

Next step:

Build the first derive command for `mlb_state_formula_training_rows` so Phase 3 can begin with real warehouse-backed rows instead of published JSON reconstruction.
