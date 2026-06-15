Yes. Here’s the cleanup plan I’d actually run, in order, so the system stops needing 3-4 correction passes every slate.

**North Star**

One MLB prediction run should be:

`fetch fresh sources -> validate complete game skeletons -> generate once -> audit causal wiring -> publish/deploy`

No hidden stale pass. No partial games pretending to be predictions. No “looks fine on the card but used the wrong pitcher.”

**Phase 1: Hard Eligibility Gates**

Goal: stop wasting lines on invalid games.

Rules:

- No prediction unless both teams have 9 hitters.
- Full projected lineup is fine.
- Missing/partial lineup means pending game, not prediction game.
- No prediction unless both sides have a projection pitcher.
- If Rotowire says primary/bulk, use that pitcher for the model.
- If MLB lists an opener, preserve opener context for NRFI/YRFI, but do not let the opener replace the bulk pitcher.
- Every game needs lineup status: `official`, `projected`, `missing`, `stale`, or `locked`.
- Started games must lock and never be mutated by later refreshes.
- BOTD/best picks require official or complete projected lineups plus complete pitchers.

Deliverable:

- Add a `predictionEligibility` object per game.
- Site should show “pending” instead of picks when eligibility fails.
- Any script publishing a pick for an ineligible game should fail.

**Phase 2: Fix DB vs Generated Slate Confusion**

Goal: one canonical slate shape.

Current problem: generated files preserve rich context better than DB, but DB is sometimes used by default and drops starters/roles.

Plan:

- Temporarily force prediction/public/site publish paths to use generated slate artifacts.
- Add validation if DB mode is used: reject any game missing 18 hitters, projection pitchers, role context, ENV1/RP2/FIC/lineup timestamps.
- Fix DB starter query so it does not require only `source_name = 'mlb_probables'`.
- Store durable pitcher roles: `officialStarter`, `projectionPitcher`, `opener`, `primaryBulk`, `source`, `timestamp`.
- Once DB parity exists, switch back to DB only after generated-vs-DB comparison passes for several slates.

Deliverable:

- Generated and DB slate comparison report.
- DB cannot silently return partial games.

**Phase 3: Rebuild The Morning DAG**

Goal: one clean generation pass instead of stale pass plus correction pass.

New flow:

1. Fetch schedule/feed.
2. Fetch Rotowire lineups/probables.
3. Fetch odds.
4. Fetch Savant, StatMuse, ESPN hitter/pitcher splits, FIC weather/matchups/umpires, ENV1, RP2, bullpen data.
5. Warehouse all inputs.
6. Run strict preflight.
7. Generate M2 day files once.
8. Run prediction audits.
9. Publish.
10. Deploy only if explicitly requested.

Changes:

- Remove default `--skip-preflight`.
- Keep degraded mode only behind an explicit flag.
- Do not run full M2 refresh before addendums are ready.
- Preserve started games during refresh.

Deliverable:

- One command produces one validated slate artifact.
- Runtime report shows every source, timestamp, row count, and pass/fail.

**Phase 4: Make Preflight Match The Real Model**

Goal: preflight should validate the sources we actually care about now.

Add first-class readiness checks for:

- Rotowire lineups and pitcher role context
- MLB official starter/opener context
- ENV1 weather/park/umpire
- RP2 relief projection
- FIC HRForce/weather/matchups
- ESPN hitter L/R splits
- ESPN pitcher L/R splits
- Savant pitch arsenal/pitch-type data
- StatMuse pitcher history
- Bullpen availability/projection data
- Odds lines and market timestamps

Important rule:

- A normalization report with `source_rows: 0` cannot be `ok: true` for required inputs.

Deliverable:

- `strict` mode blocks publish.
- `degraded` mode publishes only pending/watch cards, not clean predictions.

**Phase 5: Add The Causal Ledger**

Goal: answer “is this being used?” without guessing.

Each game should show a hidden/internal ledger and a UI summary.

Ledger fields:

- Base projection before addendums
- Lineup effect
- Handedness split effect
- Pitch fit effect
- Batter-vs-pitcher effect, recency-weighted
- Starter weather profile effect
- HRForce effect
- ENV1 park/weather/umpire effect
- RP2 bullpen/bridge effect
- Opener/primary pitcher effect
- Market/odds effect
- Final ML/F5/totals/YRFI/NRFI deltas

UI should surface:

- “Why this lean?”
- “Why F5 differs from full game?”
- “Why late team differs from lean?”
- “Weather/HRForce impact”
- “Bullpen availability impact”
- “L/R matchup impact”

Deliverable:

- If HRForce is 1.7 and the total/YRFI did not move, audit flags it.
- If RP2 says bullpen is worse but late edge says better, audit forces explanation or blocks confidence.

**Phase 6: Fix Side/F5/Late Coherence**

Goal: prevent Padres lean / Orioles F5 / Orioles late contradictions unless explicitly justified.

Rules:

- If one team wins F5 and late, full-game lean should usually match unless market, home 9th, or extreme model edge explains otherwise.
- Confidence cannot stay at 52 when projected runs show a large gap unless volatility explicitly caps it.
- “Late X” and “better bullpen Y” must reconcile RP2 vs season bullpen vs bridge chain.
- Side confidence should be derived from the same ledger as projected runs/hits.

Deliverable:

- Coherence audit for every game.
- Contradictions become warnings or confidence caps.

**Phase 7: Pitcher Profile Addendum**

Goal: build the pitcher profile model we kept circling.

Inputs:

- Pitcher L/R splits
- Batter L/R splits
- Pitch mix
- Batter pitch-type performance vs league average
- Starter recent form
- Starter history vs opponent, max 3-year window
- Day/night split
- Weather archetype: fastball-heavy, spin-heavy, offspeed-heavy
- Hot/cold/dome/HRForce sensitivity
- Repeat opponent tax
- Short leash / opener / primary-bulk flags

Outputs:

- `pitcherProfileContext`
- `pitcherWeatherFit`
- `pitcherHandednessRisk`
- `repeatOpponentTax`
- `pitchTypeMismatchScore`
- `starterVolatilityScore`
- `expectedStarterRunsDelta`
- `expectedStarterHitsDelta`

Deliverable:

- This feeds ML, F5 ML, totals, YRFI/NRFI, hitter props, pitcher Ks, and game story.

**Phase 8: Split Closeout From Prediction**

Goal: yesterday’s results should not depend on today’s prediction readiness.

Plan:

- Closeout only warehouses finals, grades picks, and writes result artifacts.
- No `lane:sides`, no `lane:veto`, no prediction preflight inside closeout.
- Backtests consume finalized artifacts only.

Deliverable:

- `close:mlb-day` can run after all games end without caring about today’s lineups.

**Phase 9: Public Audit Becomes Real**

Goal: stop passing broken slates.

Change audits from presence-only to behavior checks:

- Required fields present
- Source timestamps fresh
- Complete lineup skeleton
- Correct projection pitcher
- ENV1/RP2/FIC/ESPN data attached
- Causal ledger has nonzero deltas when major signals exist
- BOTD has no unresolved warnings
- Best picks exclude pending/degraded games
- Started games unchanged

Deliverable:

- No more “known allowed failure” quietly passing publish.
- Allowed failures require explicit waiver in the report.

**Phase 10: Runtime And Changelog Discipline**

Goal: make every run explain itself.

Every run should produce:

- Run ID
- Source fetch timings
- Source row counts
- Freshness timestamps
- Games eligible/pending/locked
- Biggest promotions/demotions
- Best picks
- Warnings
- Published artifact hash
- Changelog entry

Deliverable:

- You can tell in 60 seconds why a slate changed.

**Implementation Order**

1. Prediction eligibility gate.
2. Generated/DB mode hard validation.
3. Morning DAG cleanup.
4. Real preflight source families.
5. Causal ledger.
6. Side/F5/late coherence audit.
7. Pitcher profile addendum.
8. Closeout split.
9. Public audit hardening.
10. Runtime reports/changelog/versioning.

That order matters: first stop bad games from publishing, then stop stale runs, then improve model quality.

**Implementation Status: 2026-06-15**

Phase 1: substantially implemented.

- `predictionEligibility` now hard-fails incomplete lineups, missing projection pitchers, starter TBDs, missing ESPN pitcher splits, missing required addendums, missing first-five/first-inning context, pitcher-in-lineup slots, and incomplete hitter context.
- Hitter context is now strict: all hitters in a complete lineup need pitch fit, batter projection, and usable handedness split data.
- Missing hitter context is exposed by player/side/slot so the failure can be fixed instead of guessed.
- BOTD/best-pick ranking already excludes MLB games where `predictionEligibility.eligible !== true`.

Phase 2: implemented as generated-first with parity audit still blocking DB promotion.

- Prediction/public/site publish paths are forced through generated-file mode where starter/lineup/addendum context is richest.
- `audit-mlb-generated-db-parity` exists to compare generated vs DB game shape before DB can become canonical again.
- Remaining blocker: DB starter/role parity still needs repeated green slates before DB mode should be trusted.

Phase 3: partially implemented.

- `run-mlb-morning-predictions` is the single no-deploy-by-default command for the full source -> warehouse -> generate -> audit -> publish chain.
- The command now includes ENV1, RP2, canonical split families, SP1, causal ledger audit, side/F5/late coherence audit, started-game locks, public audit, runtime JSON, and changelog output.
- Remaining cleanup: remove older internal `--skip-preflight` calls only after their called lanes can pass the modern strict preflight without circular dependency.

Phase 4: substantially implemented.

- Strict prediction preflight now treats `mlb_player_split_families` and `mlb_sp1_starter_profile` as required prediction lane sources.
- Strict/no-partial mode now fails on incomplete source completeness, missing source items, and unresolved rows.
- `audit-mlb-morning-contracts` validates Rotowire proof, ESPN pitcher split categories, StatMuse starter rows, DraftKings market families, ENV1/RP2/FIC/ESPN coverage, canonical split families, SP1 coverage, prop lineage, and prediction eligibility.
- Remaining blocker: a few player split/source gaps still need upstream repair/backfill.

Phase 5: implemented for visibility and audit, still shadow for modeling.

- `causalLedgerContext` is attached to public game detail data.
- The ledger records lineup, handedness splits, pitch fit, BvP/H2H policy, HRForce, ENV1, RP2, SP1, market, and projection deltas.
- `audit-mlb-causal-ledger` flags missing ledger coverage and major signal disconnects.
- Remaining modeling move: promote calibrated ledger deltas into lane movement only after backtests are green.

Phase 6: implemented as an audit/confidence guard, still needs more calibration.

- `audit-mlb-not-started-side-coherence` checks side/F5/late contradictions on not-started games.
- Side/F5/late explanations now have ledger fields available for UI and report inspection.
- Remaining blocker: confidence math still needs calibration against actual outcomes so projected-run gaps and volatility caps feel less confusing.

Phase 7: implemented as SP1 shadow addendum, not promoted.

- `MLB-SP1` builds starter-collapse profiles from canonical L/R, day/night, home/away, pitch fit, repeat opponent, recent form, ENV1 carry, and role context.
- SP1 is warehoused, audited, shown in game context, and included in the causal ledger.
- Current backtest read: HR delta is promising; collapse, runs, and hits are not promotion-ready yet.
- Remaining blocker: SP1 needs more dates and calibration before it can move ML/F5/totals/YRFI lanes materially.

Phase 8: implemented.

- `data:close:mlb-day` now points to a results-only closeout script.
- The old broad followup workflow is preserved as `data:followup:mlb-day`.
- Closeout now fetches finals, ingests typed game feeds, derives batter outcomes, and grades existing predictions without depending on today’s lineups.

Phase 9: substantially implemented.

- Public audit now recomputes prediction eligibility and fails on incomplete game context.
- Public audit has explicit `status` and `failureCount`.
- Publish now writes `publish_mlb_clean_slate_YYYY-MM-DD.json` with omitted games, started-game preservation, audit status, and any explicit known-failure waiver.
- Remaining blocker: historical public artifacts may fail the stricter audit until regenerated or allowed as old snapshots.

Phase 10: substantially implemented.

- Morning runs produce runtime JSON and markdown changelog reports.
- Publish runs now produce a waiver-aware publish report.
- `data:test:mlb-prediction` provides a no-deploy test lane that runs the morning chain by default, recomputes current eligibility, lists blocked games with missing players, and ranks surfaced markets across ML, F5 ML, totals, and YRFI/NRFI.
- Remaining blocker: add artifact hashes and a formal model-version changelog entry once the source coverage is green.

**Current Blocking Items**

- Fix remaining StatMuse/ESPN/split coverage gaps for players such as Raynel Delgado and Logan Porter in the June 14 test slate.
- Keep generated-vs-DB parity green across multiple slates before considering DB mode canonical again.
- Backtest SP1 on more completed dates before promoting it from shadow deltas into core lane movement.
- Calibrate side/F5/late confidence after the stricter eligibility gate stops partial-game noise from entering the board.

**Test Prediction Command**

Run a no-deploy test slate with:

`npm run data:test:mlb-prediction -- --date YYYY-MM-DD`

Summarize existing current artifacts without rerunning the chain:

`npm run data:test:mlb-prediction -- --date YYYY-MM-DD --skip-run --allow-source-gaps`
