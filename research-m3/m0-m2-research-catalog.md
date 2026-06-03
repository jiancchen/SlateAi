# M0-M2 MLB Research Catalog For M3

Date: 2026-06-03

Scope: reviewed `68` markdown research files under `development-docs/mlb/research/`.

Purpose: preserve the useful M0-M2 research without dragging M2's fixed-weight, hand-gated implementation style into M3.

## Transfer Rule

Old research can enter M3 as:

- `Import`: directly supports an M3 contract, label, component model, validation gate, or backtest requirement.
- `Adapt`: useful idea, but must be rebuilt as typed DB features, learned components, or versioned labels.
- `Benchmark`: useful baseline or failure mode to compare against.
- `Dashboard`: useful for operator visibility before it is model-promotable.
- `Caution`: useful mostly as a warning about what not to copy.
- `Archive`: historical engineering context only.

Windowed findings from M0-M2 are not M3 truth. If an old note says `last 5`, `last 10`, `7d`, `14d`, or similar, M3 should treat that as research lineage for an evidence family. The alpha system should let feature builders and backtests decide which memory representation survives.

## Executive Read

The research is more valuable than the old model implementation.

The old M0-M2 docs repeatedly converge on the same M3-compatible ideas:

- Market prices should be priors and benchmarks, not just another feature.
- Sides and moneyline heads were weak under honest walk-forward tests; plain winner prediction should not be the M3 core.
- Game shape, phase labels, and failure modes matter more than one blended edge score.
- Baseball volatility needs risk vectors and latent regimes, not one volatility number.
- Pass/abstention is a first-class output.
- Starter exit is the root of the bullpen path.
- Bullpen shape, reliever availability, first-up routing, and reliever damage are separate components.
- Player props should be downstream views over PA volume, event distributions, lineup slot/context, game shape, and pitcher changes.
- Contact-quality, pitch-fit, opponent-quality, and lineup-position signals are useful, but only when validated by market contract and component.
- Several tempting signals failed: raw classic recent windows, park-only HR context, reliever arsenal concentration alone, exact first-up naming, and model-family swaps without better targets.

## Highest-Value Imports For M3

### 1. Market-First, Pass-First Architecture

Sources:

- `chaos-model-roadmap-052326.md`
- `model-merge-roadmap-052326.md`
- `market-divergence-research-052326.md`
- `offline-veto-engine-052326.md`
- `mlb-market-model-experiment-tracker-052526.md`

M3 use:

- Keep market snapshots as explicit priors and disagreement baselines.
- Implement market-specific backtests with utility, calibration, and abstention metrics.
- Add selection policy outputs separate from model probabilities.
- Add a disagreement budget by market and price bucket.
- Promote `pass`, `watch`, and `veto` outputs as real artifacts, not UI commentary.

Caution:

- Do not revive M2-style edge haircuts as fixed rules. Train/calibrate a selection policy and keep it downstream of model distributions.

### 2. Game-Story And Phase Labels

Sources:

- `story-phase-label-research-052326.md`
- `mistake-shape-validation-052326.md`
- `feature-roadmap-052226.md`
- `model-research-052226.md`
- `model-deep-pass-052326.md`
- `hidden-edge-research-052326.md`

M3 use:

- Build versioned labels for `starter_crack_loss`, `dead_early_loss`, `blew_lead_after5`, `starter_carried`, `jumped_early_hold`, `expensive_favorite_failed`, `underdog_beat_market`, `bullpen_flip`, `traffic_no_conversion`, and `chaos_game`.
- Replace broad volatility with risk vectors:
  - starter phase risk
  - first-five tie/push risk
  - late flip risk
  - support thinness
  - form/state fragility
  - script disagreement
  - event-state risk
- Use labels to test how a game broke, not only whether a pick won.

Caution:

- Mistake-shape and story vectors should be supervised targets or feature families with lineage. They should not become hard-coded veto rules.

### 3. Starter Exit, Bullpen Shape, And Reliever Routing

Sources:

- `mlb-relief-model-upgrade-strategy-053026.md`
- `mlb-starter-exit-buckets-053026.md`
- `mlb-bullpen-shape-usage-053026.md`
- `mlb-bullpen-shape-model-053026.md`
- `mlb-bullpen-prediction-audit-053026.md`
- `mlb-first-up-reliever-model-053026.md`
- `mlb-first-up-reliever-quality-053026.md`
- `mlb-first-up-reliever-lineup-matchup-053026.md`
- `mlb-first-up-reliever-damage-fit-053026.md`
- `mlb-first-up-reliever-depth-reset-053026.md`
- `mlb-reliever-pitch-window-patterns-053026.md`

M3 use:

The old relief research should become a component chain:

```text
starter_exit_distribution
-> bullpen_shape/churn_distribution
-> reliever_availability_distribution
-> first_up_reliever_router
-> reliever_chain/performance_distribution
-> simulator
```

High-value target outputs:

- starter outs thresholds
- hook timing
- bridge entry point
- bulk/stretch lane probability
- relievers used distribution
- bulk first-up probability
- first-up candidate probability distribution
- remaining-pool quality
- adaptive reset state
- inherited-runner damage
- relief traffic conversion

Caution:

- Exact first-up name accuracy stayed low even after improvements. M3 should model a candidate distribution and chain uncertainty, not a single reliever pick.
- The `35+ pitches` finding is real as evidence, but M3 should encode adaptive reset/quick-reuse probability, not a fixed removal rule.

### 4. Hitter And Player-Prop Component Surfaces

Sources:

- `mlb-hitter-statcast-signal-052826.md`
- `mlb-hitter-rolling-signal-052826.md`
- `mlb-hitter-opponent-strength-052926.md`
- `mlb-hits-xba-gates-052926.md`
- `mlb-hits-shadow-bundle-052926.md`
- `mlb-shadow-bundle-sweeps-052926.md`
- `mlb-batter-outcome-baselines-052926.md`
- `mlb-batter-outcome-gate-sweeps-052926.md`
- `mlb-batter-xops-gates-053026.md`
- `mlb-live-gate-candidates-052926.md`
- `mlb-friend-feedback-analysis-052926.md`

M3 use:

- Split player props into component distributions instead of one batting score:
  - hit probability
  - total bases/damage
  - HR damage
  - runs scored
  - RBI
  - H+R+RBI
  - walks
  - strikeouts
- Use different feature surfaces by contract:
  - hits: xBA, sweet spot, contact fit, pitcher contact suppression
  - TB: xSLG, hard-hit, barrel, pitch fit, opponent-quality delta
  - HR: pitcher HR damage allowed, hitter barrel/hard-hit/xSLG, pitch fit, park/weather as support
  - runs/RBI/H+R+RBI: lineup slot, PA volume, team traffic, xwOBA/xSLG, opponent quality, game shape
- Preserve opponent-quality deltas because they distinguish earned heat from soft heat.

Caution:

- Raw classic recent production did not hold up by itself.
- HR remains filter-only in the old research.
- Narrow gates with tiny samples should become hypotheses for backtests, not live rules.

### 5. First-Five And First-Inning Phase Markets

Sources:

- `first5-state-model-research-052326.md`
- `mlb-first-inning-gates-052926.md`
- `mlb-first-inning-hit-analysis-052526.md`
- `mlb-kalshi-market-shape-20260529.md`

M3 use:

- F5 should be its own phase distribution, not a slice of full-game moneyline.
- F5 must model tie/push risk and starter window state.
- First inning should model two-sided live bats, pitcher leak, top-order state, and quiet-shape NRFI.
- Kalshi-style market snapshots are useful for pricing first-inning and phase markets against executable prices.

Caution:

- The old first-five classifier mostly found pass/watch structure, not a reliable play lane.
- One-side YRFI carry was weak; two-sided pressure plus pitcher leak was stronger.

### 6. Totals And Chaos Residuals

Sources:

- `mlb-market-totals-candidates-052526.md`
- `mlb-market-totals-calibration-052526.md`
- `mlb-market-ml-training-052926.md`
- `mlb-total-run-residuals-053026.md`

M3 use:

- Keep full-game and F5 totals as early M3 backtest targets.
- Add residual diagnostics by game-shape and chaos families.
- Prioritize tail calibration, under-haircut checks, and mistake/one-bad-inning features.

Caution:

- M0-M2 totals were biased low in a stored window, especially under leans.
- Conversion features did not explain the biggest total misses as well as defensive chaos/one-bad-inning shape.

### 7. Data Foundation And Leakage Discipline

Sources:

- `refactor-052226.md`
- `mlb-season-warehouse-backfill-052526.md`
- `mlb-ml-tech-stack-052526.md`
- `mlb-historical-odds-ingestion-052626.md`
- `mlb-fanduel-research-ingestion-052626.md`

M3 use:

- Typed DB remains the source of truth.
- Every feature set needs as-of checks and source lineage.
- Walk-forward validation by date is required.
- Historical market lines are required for market backtests and prop settlement.
- Saved raw source snapshots are valuable for replay, source audit, and reprocessing.

Caution:

- Old docs reference legacy `sports.db` and `mlb_` tables. M3 should use the typed MLB DB equivalents.
- FanDuel research labels can be messy; use resolver/provenance instead of trusting text labels.
- More rows alone did not rescue weak side targets.

### 8. Dashboard And Operator Feedback

Sources:

- `mlb-dashboard-insight-ideas-052926.md`
- `mlb-first-up-reliever-shadow-board-053026.md`
- `mlb-friend-feedback-analysis-052926.md`
- `mlb-kalshi-market-shape-20260529.md`

M3 use:

- Build run dashboards for experiment status, coverage, calibration, and promotion decisions.
- Surface research-only shadow artifacts before promotion:
  - reliever candidate cluster
  - earned heat/soft heat
  - tough-slate tax
  - TB support panel
  - phase-market disagreement
- Keep UI/presentation separate from model probability contracts.

Caution:

- Dashboard modules should explain state and coverage. They should not imply a signal is proven before backtest promotion.

## M3 Component Mapping

| M3 Component | Useful M0-M2 Source Threads | Transfer Decision | M3 Action |
| --- | --- | --- | --- |
| `game_shape_distribution` | chaos roadmap, story labels, mistake shape, offline veto | Import | Convert story/failure families into labels and regime targets. |
| `starter_exit_distribution` | starter exit buckets, Tier 2 leash, third-time-through | Import | Build threshold/hook/bridge-point targets from typed starter logs and PA paths. |
| `bullpen_churn_distribution` | bullpen shape usage/model, total residuals | Import | Predict containment/normal/scramble/chaos and remaining-pool quality. |
| `reliever_availability_distribution` | depth reset, reliever pitch windows, first-up quality | Import | Learn reset state, quick-reuse probability, and candidate availability with sparse-evidence flags. |
| `first_up_reliever_router` | first-up model, quality, lineup matchup, damage fit | Import | Output candidate distribution and top-k mass, not one exact name. |
| `reliever_stat_distribution` | reliever quality, first-batter command, damage fit | Import | Model command, whiff, traffic, inherited-runner, workload, and damage surfaces. |
| `team_run_distribution` | totals candidates, total residuals, mistake shape | Import | Model full-game/F5 run distributions with chaos/tail diagnostics. |
| `first_inning_distribution` | first-inning gate audit, Kalshi shape | Adapt | Model YRFI/NRFI and half-inning repricing as phase market contracts. |
| `hitter_stat_distribution` | Statcast trend, batter baselines, opponent strength | Import | Build contract-specific hitter event/stat surfaces. |
| `pa_event_distribution` | pitch events, plate appearances, pitch-fit docs | Import | Use replayable PA/pitch state for event rates and simulator validation. |
| `market_pricing_layer` | market divergence, odds ingestion, Kalshi shape | Import | Treat market as prior and evaluate price-relative edge. |
| `selection_policy` | offline veto, Tier 1, experiment tracker | Adapt | Train/evaluate pass/watch/play policy downstream from model probabilities. |
| `run_dashboard` | dashboard ideas, experiment tracker, shadow board | Import | Track coverage, calibration, ablations, and promotion gates. |

## Caution List

Do not copy these as-is into M3:

- Fixed M2 weights or formula scores.
- Single global volatility scalar.
- Single confidence number that mixes probability, trust, market value, and selection.
- First-five derived from full-game score.
- Exact first-up reliever as a single-name prediction.
- Raw `last 10` form as a primary predictive feature.
- Reliever arsenal concentration alone as a routing upgrade.
- Park-only HR enthusiasm.
- Calibration layer promotion without checking log loss and Brier.
- Hard veto/drop rules from small samples.
- Any same-day or postgame leakage from old warehouse paths.

## File-Level Catalog

| File | Status | M3 Relevance |
| --- | --- | --- |
| `README.md` | Archive | Folder marker only. |
| `chaos-model-roadmap-052326.md` | Import | Core M3 thesis: market-relative, story-aware, state-aware, phase-aware, abstention-first, regime/simulator architecture. |
| `feature-roadmap-052226.md` | Adapt | Early edge-control and warehouse feature inventory; useful risk families, but old window/rule language must be rebuilt. |
| `first5-state-model-research-052326.md` | Import | F5 must be independent, tie/push-aware, starter-window-specific, and pass-friendly. |
| `hidden-edge-research-052326.md` | Adapt | Whiff persistence, lead surrender, form carryover, comeback pressure are useful state families. |
| `market-divergence-research-052326.md` | Import | Disagreement budget and price-bucket ROI belong in M3 market layer. |
| `mistake-shape-validation-052326.md` | Import | Mistake/quiet/chaos vectors are better veto/diagnostic inputs than ranking scores. |
| `mlb-batter-outcome-baselines-052926.md` | Import | Explicit baselines for hits, runs, RBI, H+R+RBI should seed prop contract targets. |
| `mlb-batter-outcome-gate-sweeps-052926.md` | Adapt | Gate families identify candidate surfaces for runs/RBI/H+R+RBI, not final rules. |
| `mlb-batter-xops-gates-053026.md` | Dashboard | XOPS-style interaction is secondary context unless it beats existing surfaces. |
| `mlb-bounceback-cohort-research-052926.md` | Adapt | Separate loss-but-not-dead, slumping loser, high-snapback-low-form as state labels. |
| `mlb-bullpen-prediction-audit-053026.md` | Benchmark | Old first-bridge model quality baseline; shows why top-k and workload matter. |
| `mlb-bullpen-shape-model-053026.md` | Import | Starter exit improves bullpen-shape prediction; supports current M3 DAG. |
| `mlb-bullpen-shape-usage-053026.md` | Import | Reliever count and first-reliever workload distributions are core churn targets. |
| `mlb-dashboard-insight-ideas-052926.md` | Dashboard | Useful UI modules: earned heat, tough-slate tax, TB support, OppQ row. |
| `mlb-fanduel-research-ingestion-052626.md` | Adapt | Public historical odds/props source with label caveats; keep provenance. |
| `mlb-first-inning-gates-052926.md` | Import | YRFI/NRFI selector families: double-live, pitcher leak, quiet clean NRFI. |
| `mlb-first-inning-hit-analysis-052526.md` | Adapt | Qualitative inning-path taxonomy: traffic leak, hot-bat carry, one-swing HR. |
| `mlb-first-up-reliever-arsenal-053026.md` | Caution | Arsenal concentration alone hurt first-up routing; keep descriptive until paired with quality/matchup. |
| `mlb-first-up-reliever-damage-fit-053026.md` | Import | Best reliever routing lift came from damage-fit and corrected lineup context. |
| `mlb-first-up-reliever-depth-reset-053026.md` | Import | Heavy-use reset and remaining-pool recalculation are core availability features. |
| `mlb-first-up-reliever-lineup-matchup-053026.md` | Import | Manager routing appears partly lineup-matchup driven. |
| `mlb-first-up-reliever-model-053026.md` | Benchmark | Starter exit + usage improved top-k coverage, especially bulk first-up cases. |
| `mlb-first-up-reliever-quality-053026.md` | Import | Role drift, quality, unknown sample, and first-batter command support reliever router. |
| `mlb-first-up-reliever-shadow-board-053026.md` | Dashboard | Good precedent for M3 shadow artifacts before promotion. |
| `mlb-friend-feedback-analysis-052926.md` | Import | Market-specific player prop feature taxonomy and opponent-quality priority. |
| `mlb-historical-odds-ingestion-052626.md` | Import | Historical lines are mandatory for totals/props backtests. |
| `mlb-hits-shadow-bundle-052926.md` | Caution | Tiny-sample hits bundle; keep as hypothesis only. |
| `mlb-hits-xba-gates-052926.md` | Adapt | Hits need xBA/contact/pitch-fit, but isolated xBA was weak. |
| `mlb-hitter-last10-windows-052926.md` | Caution | Classic last-10 did not beat shorter/raw baselines; do not promote raw windows. |
| `mlb-hitter-opponent-strength-052926.md` | Import | Opponent-quality delta is useful for earned vs soft form. |
| `mlb-hitter-rolling-signal-052826.md` | Adapt | Result-based hitter state is a filter; needs Statcast/contact-quality context. |
| `mlb-hitter-statcast-signal-052826.md` | Import | TB clearly benefits from Statcast damage surfaces; hits/singles and HR require caution. |
| `mlb-hr-filter-signal-052926.md` | Caution | HR is filter-only; pitcher HR damage allowed helps more than park-only hype. |
| `mlb-kalshi-market-shape-20260529.md` | Adapt | Useful phase-market pricing and repricing shape, especially first inning/F5. |
| `mlb-live-gate-candidates-052926.md` | Adapt | Candidate keep/fade gates become hypotheses for M3 selection policy and props. |
| `mlb-market-ml-training-052526.md` | Benchmark | Honest baseline after leakage fixes; totals only weakly promotable. |
| `mlb-market-ml-training-052926.md` | Benchmark | Expanded rerun confirmed moneyline/F5 weak, totals still only plausible lane. |
| `mlb-market-model-experiment-tracker-052526.md` | Import | Experiment ledger style and promotion standard should carry into M3 dashboard. |
| `mlb-market-moneyline-catboost-052526.md` | Benchmark | Model family swap did not rescue moneyline. |
| `mlb-market-moneyline-corpus-dogs-052526.md` | Benchmark | Dog-only split did not solve side target weakness. |
| `mlb-market-moneyline-corpus-favorites-052526.md` | Benchmark | Favorite-only split did not solve side target weakness. |
| `mlb-market-moneyline-lightgbm-052526.md` | Benchmark | Best threshold hit rate in one pass but not promotable. |
| `mlb-market-moneyline-xgboost-052526.md` | Benchmark | Boosted model still weak; target/framing issue. |
| `mlb-market-totals-calibration-052526.md` | Caution | Calibration worsened totals in this pass; calibrators need promotion gates. |
| `mlb-market-totals-candidates-052526.md` | Benchmark | Forest had best calibration for totals; accuracy alone was misleading. |
| `mlb-ml-tech-stack-052526.md` | Import | Walk-forward, log loss, Brier, threshold utility, and leakage discipline belong in M3. |
| `mlb-opponent-quality-side-gates-052926.md` | Adapt | Opponent schedule context separates rebound/resistance states. |
| `mlb-phase1-context-research-052926.md` | Adapt | Opponent-quality ready; totals-market memory blocked by line coverage. |
| `mlb-pitcher-strikeout-gates-052926.md` | Adapt | K props need lineup whiff/chase/contact and leash context; under lane weak. |
| `mlb-relief-model-upgrade-strategy-053026.md` | Import | Direct blueprint for starter exit -> bullpen shape -> first-up -> reliever fit. |
| `mlb-reliever-pitch-window-patterns-053026.md` | Import | Adaptive reset and team/pitcher quick-reuse evidence are M3 availability inputs. |
| `mlb-season-warehouse-backfill-052526.md` | Import | Event-history depth is foundational; more rows alone did not solve weak targets. |
| `mlb-shadow-bundle-sweeps-052926.md` | Adapt | TB damage bundle is promising; hits bundle did not broaden cleanly. |
| `mlb-side-bounceback-flags-052926.md` | Adapt | Bounceback/dead-bat states should be labels/features, not blunt side rules. |
| `mlb-side-tier1-v1-backtest-052226.md` | Caution | Tier 1 direction was right but overfired; selection policy needs backtests. |
| `mlb-starter-exit-buckets-053026.md` | Import | Starter outs thresholds and call-up/tiny-sample contexts are core M3 component targets. |
| `mlb-total-run-residuals-053026.md` | Import | Totals residuals point to under bias and chaos/one-bad-inning features. |
| `model-deep-pass-052326.md` | Import | Risk vectors, phase-specific models, and anti-fake-edge principles are central to M3. |
| `model-merge-roadmap-052326.md` | Import | Market anchor, state/regime overlays, phase classifiers, disagreement budget. |
| `model-research-052226.md` | Adapt | Broad side failure analysis supports script-risk and starter/late split features. |
| `offline-veto-engine-052326.md` | Adapt | Veto/pick suppression should become a trained selection artifact, not rule paste. |
| `refactor-052226.md` | Archive | Confirms DB/API/pipeline separation and why M3 should avoid frontend-shaped artifacts. |
| `stateful-edge-research-052326.md` | Adapt | Early stateful traps are weak alone but useful as state-family hypotheses. |
| `story-phase-label-research-052326.md` | Import | Labels and market/phase shapes are directly useful for M3 supervised targets. |
| `tier2-feature-research-052226.md` | Adapt | Starter leash gap, story priors, dependency, and series context are source feature families. |
| `tier3-feature-research-052326.md` | Import | Reliever first-batter command and third-time-through are event-state features. |
| `tier3-overlay-research-052326.md` | Adapt | Overlay results are mixed, but lookup-table concepts belong in component features. |

## Near-Term M3 Backlog From This Catalog

1. Build typed source coverage audit for the imported research families:
   - starter exit
   - bullpen churn
   - reliever availability/router
   - hitter Statcast/contact surfaces
   - opponent-quality deltas
   - market line history
2. Add M3 story-label spec for:
   - dead early
   - starter crack
   - bullpen flip
   - underdog chaos
   - expensive favorite failure
   - traffic no conversion
   - one-bad-inning
3. Build the first M3 feature matrix around totals/F5 with:
   - game shape
   - starter exit
   - bullpen churn
   - reliever availability/router coverage
   - market prior
4. Open a separate M3 prop feature-set plan for:
   - hitter event/stat distributions
   - PA volume
   - lineup slot
   - opponent quality
   - pitcher/starter/reliever event mix
5. Define the backtest dashboard contract before training:
   - run id
   - feature set id
   - component artifact id
   - calibration diagnostics
   - tail/regime diagnostics
   - ablation results
   - promotion/rejection decision
