# MLB-M0 Log

This log records model and warehouse changes that matter to MLB-M0. It is intentionally more practical than `MODEL_NOTES.md`: what changed, why it exists, what is trusted, and what still needs proof.

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
