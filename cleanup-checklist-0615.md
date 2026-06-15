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

That order matters: first stop bad games from publishing, then stop stale runs, then improve model quality. No code changes made yet.
