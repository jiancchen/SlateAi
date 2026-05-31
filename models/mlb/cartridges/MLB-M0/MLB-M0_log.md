# MLB-M0 Log

This log records model and warehouse changes that matter to MLB-M0. It is intentionally more practical than `MODEL_NOTES.md`: what changed, why it exists, what is trusted, and what still needs proof.

## 2026-05-31 - Component Registry And Run Indexing

Added `components/index.json` so MLB-M0 has explicit homes for sides, first-five, totals, props, home runs, market context, and the consumed MLB-RP36 relief addendum. This is meant to stop future edits from landing in random lane files or compatibility wrappers just because a grep found them first.

Implemented:

- Active app imports and future tennis day generation now point at `models/shared/sports-core/app-sports-model.js` instead of the old frontend shim.
- MLB-M0 source locks no longer include workflow/publish compatibility launchers or the frontend compatibility shim.
- `models/shared/model-runs/index_runs.py` writes locked MLB-M0/MLB-RP36 runs into shared warehouse model-run tables.
- RP36 gets component settlement lanes for exact, top-2, and top-3 first-up reliever hits.

Current trust level:

- Good for model-run traceability and dashboard/backtest querying.
- Not a scoring improvement by itself.
- RP36 exact first-up identity remains a component diagnostic, not a direct betting lane.

Gate:

Every new MLB-M0/MLB-RP36 lock should re-index the warehouse rows, and tests should fail if locked runs stop producing DB model-run/lane rows.

## 2026-05-31 - Parent Model Lifecycle Wrappers

Added registry-aware lifecycle wrappers above the cartridge-local scripts.

Implemented:

- `models/mlb/run-cartridge.mjs`
- `models/mlb/lock-cartridge.mjs`
- `models/mlb/verify-cartridge.mjs`
- `models/mlb/compare-cartridges.mjs`
- `models/mlb/scaffold-cartridge.mjs`
- `development-docs/mlb/runbooks/model-iteration.md`

Current trust level:

- Good enough to run, lock, verify, and compare the active `MLB-M0` through the registry.
- Good enough to dry-run a future `MLB-M1` scaffold without creating files.
- Not a guarantee that an `MLB-M1` scaffold is production-ready; benchmark locks and lane comparisons are still required before activation.

Architecture issue surfaced:

The daily package scripts can now dispatch through the registry, but app-facing shared composition and some compatibility loaders still import the MLB-M0 adapter directly. That is acceptable while new models preserve the same app contract. If M1 changes the match model contract, those paths must become registry-aware too.

Follow-up fix:

- Added `models/mlb/app-model.js` as the app adapter registry.
- Routed `models/shared/sports-core/app-sports-model.js` through the app adapter registry instead of importing MLB-M0 directly.
- Routed `pipeline/lib/load-mlb-day-games.mjs` through the app adapter registry.
- Updated the shared run indexer to classify MLB parent models by `role: parent_model` in `models/mlb/registry.json`, not by a hardcoded `MLB-M0` id.

Current remaining risk:

A future active parent model still needs an explicit app adapter registration. That is intentional: the app should fail loudly if the active model is not app-contract-compatible.

## 2026-05-31 - Hitter Career And Repeatability Baseline

Added low-weight hitter career profiles for current-lineup batters. The goal is not to let old career numbers drive current props; the goal is to keep tiny current-season samples from exploding into fake certainty.

Current use:

- Tiny samples get career context as a brake and baseline.
- Career power can explain why a small-sample power flash is plausible.
- Career strikeout/contact risk can suppress total-bases and home-run enthusiasm.
- Role stability marks whether the player has enough MLB track record to treat the sample as repeatable.

Backtest reality check from the regenerated May 30 prop slate:

- 33 tracked props.
- Total bases went 1/5.
- Career-backed total-bases buckets are now measurable, but not trusted enough to promote blindly.

Decision: warehouse this data and keep it in the model at low weight. Current-season, recent Statcast, lineup role, pitcher matchup, and game script still carry the main weight.

## 2026-05-31 - Hitter Splits

The lineup model already uses handedness split rows from the MLB Stats API hydrate feed. Those rows were not first-class warehouse rows, which made the model harder to audit later.

Implemented:

- Added `mlb_hitter_split_snapshots`.
- Added `ingest-hitter-lineup-splits`.
- Lineup export now persists the daily platoon split rows for each lineup batter by date, game, player, opposing pitcher hand, and Savant split URL.

Current trust level:

- Useful for auditability and model replay.
- Useful for explaining why a hitter was tagged as a split fit.
- Not enough by itself to approve props; split samples can be small and noisy.

Initial backtest check:

- May 30 hitter prop rows joined to split snapshots: 17/17.
- May 30 split-edge reasons went 4/8; split context alone went 3/9.
- May 30 total-bases rows with split context went 1/5, so split fit did not rescue that lane.
- May 30 singles rows with split context went 6/10, which is more promising but still too small to promote.

Savant note:

The Baseball Savant split page loads without a browser challenge and includes full split tables in the HTML, including platoon, month, batting order, baserunner, game type, and outs splits. Full HTML parsing is intentionally a follow-up because fetching every lineup player page is heavier than the existing structured split feed.

Next split upgrade:

- Add a stable Savant HTML parser for selected categories.
- Compare Savant split rows against MLB Stats API split rows.
- Backtest whether split tags actually improve prop hit rate by market type.

## 2026-05-31 - ApproachState Parking Lot

`approachState` was added as an exploratory hitter repeatability object, not a final betting trigger.

Current fields:

- `confidenceScore`
- `processScore`
- `careerWeight`
- `identityDelta`
- `tbDelta`
- `hrDelta`
- `rolePressure`
- `approachLabel`

Risk:

An opaque score can make the model sound smarter than it is. We should not trust `approachState` until each input has a backtested reason to exist.

Better future shape:

Use `approachState` as a formula with named inputs, capped weights, and bucketed backtests:

- Current-season PA and role stability
- Recent Statcast process: xwOBA, xSLG, barrel rate, hard-hit rate, sweet-spot trend
- Current-vs-career identity delta: TB/PA, HR/PA, K rate, walk rate
- Platoon and split fit
- Pitch arsenal fit
- Recent at-bat recovery and next-PA response from pitch events
- Role pressure: playing time volatility, call-up pressure, lineup-slot pressure

Gate:

No `approachState` bump should become bet-driving until it can show lift versus baseline by prop type and confidence bucket.
