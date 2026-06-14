# MLB-SP1 Implementation And Backtest Checklist

Use this before writing the SP1 materializer or running SP1 backtests.

SP1 should not start as a clever scoring tweak. It should start as a traceable addendum with source status, role handling, deltas, lane consumers, and backtest buckets that explain why the pitcher profile moved a game.

## 0. Scope Lock

- [ ] Confirm SP1 is starter/bulk-primary only, not a bullpen replacement.
- [ ] Confirm RP2 remains the available-bullpen/bridge addendum.
- [ ] Confirm ENV1 remains the park/weather/umpire game-environment addendum.
- [ ] Confirm SP1 outputs are shadow/context first, not public scoring overrides.
- [ ] Confirm production lane promotion requires settled backtest evidence.
- [ ] Confirm implementation will not deploy or publish unless separately requested.

## 1. Source Inventory

- [ ] MLB schedule/game feed is available for every active game.
- [ ] MLB probable/opening pitcher identity is available for every active game.
- [ ] Rotowire daily lineups are available for lineup and primary/bulk pitcher cross-check.
- [ ] ESPN pitcher splits are available or source-statused for every projection pitcher.
- [ ] ESPN hitter splits are available or source-statused for posted lineup batters.
- [ ] Baseball Savant pitcher pitch mix is available or source-statused for projection pitchers.
- [ ] Baseball Savant hitter pitch-type response is available or source-statused for posted batters.
- [ ] FantasyInfoCentral Weather/HRForce daily rows are available or source-statused.
- [ ] FantasyInfoCentral Weather/HRForce hourly rows are available or source-statused for evening/night games.
- [ ] FantasyInfoCentral Daily Matchups rows are available or source-statused for same-day BvP context.
- [ ] StatMuse or feed-derived starter-vs-opponent history is available or source-statused.
- [ ] Recent starter game logs are available for last 3/5 start form.
- [ ] Current lineup hitter recent form is available for old-BvP override checks.

## 2. Identity And Role Resolution

- [ ] Normalize pitcher IDs across MLB, ESPN, Rotowire, Savant, FIC, and StatMuse where possible.
- [ ] Preserve source names and raw IDs when cross-source identity is uncertain.
- [ ] Resolve `projection_pitcher` separately from `official_opener`.
- [ ] If Rotowire marks a primary/bulk pitcher behind an opener, use that arm for starter-window projections.
- [ ] If MLB and Rotowire disagree, store both and emit an opener/bulk discrepancy flag.
- [ ] If the projection pitcher is a reliever/bulk arm, set `opener_or_bulk_primary_flag`.
- [ ] If the pitcher has fewer than four starts, set `tiny_sample_pitcher_flag`.
- [ ] Do not let an opener's full-season relief line replace the primary/bulk projection pitcher.
- [ ] For YRFI/NRFI, include the official opener's first-inning profile when the opener differs from the projection pitcher.

## 3. Warehouse Contract

- [ ] Create or confirm table `mlb_starting_pitcher_profile_v1_daily`.
- [ ] Primary key matches `source_date`, `game_pk`, `team_name`, `pitcher_id`, `model_version`.
- [ ] Required fields in `output-contract.json` are all materialized.
- [ ] `feature_snapshot_json` preserves raw feature inputs and source statuses.
- [ ] `sourceStatus` fields differentiate unavailable, stale, partial, exact, fallback, and inferred rows.
- [ ] Rows are reproducible by slate date; no same-day live result leakage.
- [ ] Historical backfill can run one date at a time without overwriting newer model versions.
- [ ] Public-safe output strips raw pages or private payloads while preserving explanation fields.

## 4. Feature Engineering Spec

- [ ] Season identity fields: IP, starts, ERA, WHIP, K%, BB%, HR/9.
- [ ] Recent form fields: last 3/5 starts, recent ERA/WHIP, hard-contact signal, command signal.
- [ ] Handedness allowed fields: pitcher allowed vs left/right AVG, OBP, SLG, OPS, AB, HR, BB, SO.
- [ ] Posted lineup handedness counts: left, right, switch/effective side.
- [ ] Hitter split aggregate against pitcher hand.
- [ ] Day/night fields: ERA, WHIP, OBA, K%, HR/9, IP, sample status.
- [ ] Home/away or venue fields when sourced and sample-valid.
- [ ] Pitch mix fields: fastball share, spin share, offspeed/splitter/changeup share, primary pitch group.
- [ ] Pitch-fit aggregate: lineup damage/whiff response against starter mix versus league average.
- [ ] Weather archetype fields: HRForce, game-time HRForce, early-game max HRForce, persistence signal, temperature bucket, wind bucket, roof state.
- [ ] Repeat-opponent fields: same-season prior start, F5 runs allowed, first-inning damage, HR damage, short-start flag.
- [ ] BvP fields: only score 5+ AB and last-three-season context; old/undated career BvP is context-only.
- [ ] Leash fields: expected outs, short leash risk, bulk role expected outs, pitch-count context when available.
- [ ] First-inning fields: opener context, starter first-inning history, top-order platoon pressure, top-order pitch fit.

## 5. Score And Delta Spec

- [ ] `starter_profile_score` explains the overall starter-window read.
- [ ] `run_prevention_score` separates suppression from raw confidence.
- [ ] `contact_suppression_score` captures hit/traffic prevention.
- [ ] `damage_suppression_score` captures HR/XBH prevention.
- [ ] `command_score` captures walk/deep-count risk.
- [ ] `swing_miss_score` captures K/whiff support.
- [ ] `leash_score` captures expected outs and early-exit risk.
- [ ] `first_inning_risk_score` feeds YRFI/NRFI directly.
- [ ] `repeat_opponent_tax_score` is capped and current-form aware.
- [ ] `weather_fragility_score` responds to HRForce/game-window carry and pitcher archetype.
- [ ] `handedness_fragility_score` responds to posted lineup split pressure.
- [ ] `pitch_mix_fit_score` compares hitter pitch-type response to league average for the starter mix.
- [ ] Expected deltas include runs, hits, HR, walks, K, outs, YRFI probability, and NRFI risk.
- [ ] Delta magnitudes are capped until backtest calibration exists.
- [ ] Every score has a text reason and the top numeric inputs that drove it.

## 6. Lane Consumer Spec

- [ ] Full-game ML consumes SP1 only through side/tail coherence and confidence caps while shadow.
- [ ] F5 ML consumes starter-window score, leash, handedness pressure, and repeat-opponent tax.
- [ ] Full-game totals consume SP1 deltas with ENV1 and RP2 conflict checks.
- [ ] F5 totals consume SP1 more heavily than RP2.
- [ ] Team totals consume team-side pitcher fragility and lineup fit.
- [ ] YRFI/NRFI consumes first-inning risk, opener context, top-order fit, and HRForce persistence.
- [ ] Pitcher props consume expected hits, ER, BB, K, outs, and leash deltas.
- [ ] Batter props consume batter split, pitch fit, recent form, BvP recency, and weather support.
- [ ] HR board consumes pitch-fit damage, HRForce, park, batter process, and starter HR fragility.
- [ ] Game story consumes the same SP1 reasons shown in the machine-readable payload.

## 7. Side/Tail Coherence Gates

- [ ] If side pick requires starter suppression but SP1 shows starter fragility, cap or demote the side.
- [ ] If HRForce >= 1.5 and game-window carry persists, under lanes require explicit counterweights.
- [ ] If HRForce >= 1.7, casual unders are blocked unless starter, lineup, bullpen, park, and market all support suppression.
- [ ] If side, F5 side, late side, and bridge disagree, identify the cleaner lane before promoting ML.
- [ ] If the full-game side projects fewer runs than opponent, side defaults to watch/pass unless another phase explains it.
- [ ] If a team owns F5 and bridge but not the displayed side, the writeup must explain the exact late-game path or demote the side.
- [ ] `52` remains allowed only for true thin/watch rows, not separated all-phase edges.
- [ ] Side/tail demotions must be visible in audit output, not hidden in UI copy.

## 8. UI And Public Explanation Spec

- [ ] Detail page shows projection pitcher and official opener separately when they differ.
- [ ] Detail page shows pitcher allowed vs left/right splits.
- [ ] Detail page shows posted lineup batter split table against pitcher hand.
- [ ] Detail page shows pitch-mix fit summary and top mismatches.
- [ ] Detail page shows day/night split when game time bucket matters.
- [ ] Detail page shows HRForce/current/hourly persistence and whether it changed pitcher/batter expectations.
- [ ] Detail page shows repeat-opponent history and whether it is scored or context-only.
- [ ] Detail page game story states how SP1 changed ML, F5, total, YRFI/NRFI, and prop lanes.
- [ ] If SP1 did not change a lane because of missing/stale data, the story says that plainly.
- [ ] Mike's BOTD and batter boards can show HRForce/SP1 support but do not promote rows on SP1 alone.

## 9. Implementation Preflight

- [ ] Choose materializer path: `scripts/build-mlb-starter-profile-addendum.mjs`.
- [ ] Add package script only when implementation starts: `data:build:mlb-sp1`.
- [ ] Materializer reads typed/warehouse data first, generated artifacts only as fallback.
- [ ] Materializer writes local report under `data-migration/reports/`.
- [ ] Materializer writes public-safe generated module only if needed by M2/UI.
- [ ] Materializer can run for a single date repeatedly without duplicate rows.
- [ ] Missing source coverage creates source-status warnings, not crashes, unless core schedule/lineups are missing.
- [ ] Unit or fixture tests cover opener/bulk role, HRForce >= 1.7, stale BvP, weak handedness split, and missing ESPN rows.

## 10. Backtest Preflight

- [ ] Define settled date window before running the first backtest.
- [ ] Freeze model version before backtest.
- [ ] Ensure backtest uses only data available before each game start.
- [ ] Exclude started/live data leakage from game feeds.
- [ ] Grade by lane, not only aggregate MAE.
- [ ] Preserve baseline M2 result for every row.
- [ ] Preserve SP1 shadow-adjusted result for every row.
- [ ] Bucket by HRForce: N/A/dome, <1.4, 1.4-1.49, 1.5-1.69, >=1.7.
- [ ] Bucket by day/night.
- [ ] Bucket by pitcher role: true starter, opener, bulk-primary, tiny sample.
- [ ] Bucket by handedness pressure.
- [ ] Bucket by pitch-mix mismatch.
- [ ] Bucket by repeat-opponent flag.
- [ ] Bucket by source coverage quality.

## 11. Backtest Metrics

- [ ] YRFI/NRFI direction hit rate and calibration.
- [ ] F5 O/U direction hit rate and calibration.
- [ ] Full-game O/U direction hit rate and MAE.
- [ ] F5 ML side/tie direction.
- [ ] Full-game ML side hit rate after side/tail caps.
- [ ] Pitcher hits allowed MAE/direction.
- [ ] Pitcher earned runs MAE/direction.
- [ ] Pitcher walks and K direction.
- [ ] Pitcher outs/leash direction.
- [ ] Batter hits, total bases, HR, and H+R+RBI lift or harm.
- [ ] Starter-collapse flag precision/recall.
- [ ] False-under reduction in HRForce >= 1.5 and >= 1.7 buckets.
- [ ] No degradation in low-HRForce starter-duel bucket.

## 12. Promotion Gates

- [ ] Shadow report shows at least one lane improves versus baseline.
- [ ] Improvement is bucketed, not one hot slate.
- [ ] HRForce/YRFI lift does not break low-carry NRFI/starter-duel reads.
- [ ] Side/tail caps reduce bad ML promotions without deleting true side edges.
- [ ] Opener/bulk handling fixes more rows than it harms.
- [ ] Source coverage is high enough for the promoted lane.
- [ ] Public story and audit output explain every promoted/demoted row.
- [ ] Promotion starts lane-by-lane; likely YRFI/F5/totals before full-game ML.

## 13. Definition Of Done Before Implementation

- [ ] This checklist is reviewed and accepted.
- [ ] Output contract is frozen for v1 materialization.
- [ ] Source coverage fields are mapped to existing tables/files.
- [ ] Warehouse migration approach is chosen.
- [ ] Backtest date windows and baseline artifacts are chosen.
- [ ] Lane-consumer order is agreed: shadow first, then scoped lane promotion.

## 14. Definition Of Done Before Backtests

- [ ] Materializer has generated SP1 rows for the target historical dates.
- [ ] Source-status report has no silent missing-data buckets.
- [ ] No post-start/live result fields are present in SP1 inputs.
- [ ] Baseline M2 artifacts are available for the same dates.
- [ ] Backtest script writes both JSON and markdown reports.
- [ ] Report includes misses, not only wins.
- [ ] Report names which misses would have changed and which would not.
