# MLB-SP1 Changelog

## MLB-SP1.2026-06-15.v0.1

Status: shadow-materialized.

Added the first daily SP1 materializer and audit gate.

- New table: `mlb_starting_pitcher_profile_v1_daily`.
- New build script: `npm run data:build:mlb-sp1 -- --date YYYY-MM-DD`.
- New audit script: `npm run data:audit:mlb-sp1 -- --date YYYY-MM-DD`.
- New shadow backtest script: `npm run data:backtest:mlb-sp1 -- --date YYYY-MM-DD`.
- New calibration runner: `npm run data:run:mlb-sp1-shadow-calibration -- --date YYYY-MM-DD`, which chains canonical split-family warehousing/audit, SP1 build/audit, and SP1 shadow backtest.
- Morning runner now builds and audits SP1 immediately after canonical split-family warehousing.
- SP1 now reads `mlb_player_split_family_snapshots` in both directions: pitcher allowed L/R splits versus the posted lineup handedness, and hitter L/R splits versus the projection pitcher's hand.
- Profile scores include collapse risk, handedness fragility, day/night fragility, home/away fragility, weather/HRForce fragility, pitch-fit pressure, repeat-opponent tax, recent form, leash, command, first-inning risk, and shadow deltas for runs/hits/HR/walks/K/outs/YRFI.
- M2 game objects now receive `starterProfileContext` from the DB read path and generated-file loader boundary.
- Causal ledger now surfaces SP1 as `sp1StarterProfile`, using the opposing starter as the offense-side pressure signal.

First one-day read on June 14 matched all 28 starter/profile rows. HR delta was the only promising directional signal on that slate at 15/21. Collapse risk was 4/8, runs delta was 6/16, and hits delta was 6/19, so this version remains shadow/context. It does not directly override ML, F5, totals, YRFI/NRFI, props, or HR picks until the SP1 deltas are backtested across a larger settled window and calibrated by lane. Use the calibration runner for that settled-window pass so split-family inputs, SP1 profiles, audits, and backtest reports cannot drift apart.

Follow-up calibration hardening:

- Canonical split-family warehousing now falls back to the older lineup-board selected hitter split when full `espnHitterSplits.vsLeft/vsRight` rows are absent. This preserves historical SP1 backtests without inventing neutral player data.
- Canonical split-family audit now checks distinct lineup-player coverage instead of only row totals, names missing hitter split rows, and hard-fails pitcher slots inside posted batting orders.
- Diagnostic June 12-14 run was intentionally flagged dirty: June 12 has three missing hitter split rows, June 13 has a pitcher listed in the Guardians lineup, and June 14 has one missing hitter split row. After filling June 13 actual feeds and deduping actual team-stat joins, the diagnostic SP1 read was 88 rows / 88 actual matches, with HR delta 43/66, hits delta 29/55, runs delta 17/35, and collapse risk 12/24. Keep SP1 shadow-only.

## MLB-SP1.2026-06-14.checklist

Status: pre-implementation checklist.

Added `IMPLEMENTATION_CHECKLIST.md` as the required gate before materializer implementation or shadow backtests.

The checklist covers source inventory, role resolution, warehouse contract, feature engineering, score/delta design, lane consumers, side/tail coherence gates, UI story requirements, implementation preflight, backtest preflight, metrics, promotion gates, and definitions of done.

## MLB-SP1.2026-06-14.design

Status: design-scaffold.

Added the starter pitcher profile addendum contract for MLB-M2. The model is not active as a scoring override yet.

Primary design decisions:

- Treat Rotowire primary/bulk pitcher as the projection pitcher when MLB lists an opener.
- Keep MLB opener stats for first-inning and YRFI/NRFI context.
- Use pitcher handedness-allowed splits, hitter handedness splits, pitch mix, day/night splits, recent form, repeat-opponent context, and HRForce/weather profile as one pitcher-profile object.
- Feed every lane from the same deltas: ML, F5 ML, totals, team totals, YRFI/NRFI, pitcher expected lines, batter production, HR lanes, and game-story copy.
- Keep stale BvP and old career splits as context only; current form and recent opponent history must control the adjustment.
