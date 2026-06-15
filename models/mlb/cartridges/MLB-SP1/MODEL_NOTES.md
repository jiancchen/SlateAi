# MLB-SP1 Starter Pitcher Profile Addendum

MLB-SP1 is the starter or bulk-primary pitcher profile addendum for MLB-M2.

The point is to stop treating the starter as one flat ERA/WHIP object. The same pitcher can be strong overall and still be fragile today because of handedness, day/night split, pitch mix into the posted lineup, hot weather/HRForce, repeat-opponent familiarity, opener/bulk role, short leash, or recent command loss.

## Status

- Current status: `shadow-materialized`
- Consumed by: `MLB-M2`
- Warehouse target: `mlb_starting_pitcher_profile_v1_daily`
- Promotion state: not active as a scoring override yet

SP1 v0.1 is built by `npm run data:build:mlb-sp1 -- --date YYYY-MM-DD`, audited by `npm run data:audit:mlb-sp1 -- --date YYYY-MM-DD`, and shadow-backtested by `npm run data:backtest:mlb-sp1 -- --date YYYY-MM-DD`.

For repeatable calibration, run `npm run data:run:mlb-sp1-shadow-calibration -- --date YYYY-MM-DD` or `npm run data:run:mlb-sp1-shadow-calibration -- --start-date YYYY-MM-DD --end-date YYYY-MM-DD`. That runner warehouses canonical split families, audits them, builds SP1, audits SP1, then runs the SP1 backtest and writes a single calibration report. This is the preferred backtest path.

The materialized context is attached to M2 game objects as `starterProfileContext` and to the causal ledger as `sp1StarterProfile`. It explains and audits starter-collapse pressure before it is allowed to change public pick confidence directly.

First one-day shadow backtest, June 14: 28/28 starter/profile rows matched to actual pitcher appearances. HR delta direction was 15/21, but collapse risk was 4/8, runs delta was 6/16, and hits delta was 6/19. Treat that as a promotion block, not a verdict. SP1 needs a larger settled window and lane-specific calibration before it can move confidence or picks directly.

Before promotion or backtests begin, use the checklist in:

- `models/mlb/cartridges/MLB-SP1/IMPLEMENTATION_CHECKLIST.md`

## What SP1 Owns

SP1 owns the pitcher side of today's offensive environment:

- Projection pitcher role: true starter, opener, bulk-primary, tandem, relief opener.
- Overall season identity: ERA, WHIP, K/BB, HR/9, starts, innings.
- Recent form: last 3/5 starts, command trend, hard-contact trend, short leash.
- Handedness allowed splits: pitcher vs left/right batters from ESPN and other sourced splits.
- Batter handedness aggregate: how the posted lineup hits the pitcher's throwing hand.
- Pitch mix fit: pitcher arsenal against each hitter's pitch-type damage/whiff profile.
- Day/night and home/away splits when sourced and sample-valid.
- Weather/pitcher archetype: fastball/spin/changeup-heavy profile against HRForce, temperature, wind, roof, and game-window carry.
- Repeat-opponent tax: same-season and last-three-season starter-vs-team context, with old career BvP kept context-only.
- First-inning risk: top-order platoon/pitch-fit, first-inning history, opener context, and YRFI/NRFI delta.

SP1 does not replace RP2. SP1 handles starter/bulk-primary pitcher shape; RP2 handles available bullpen path and bridge stress.

## Lane Usage

SP1 must feed every lane where starter shape matters:

- Full-game ML: side confidence cannot ignore starter fragility when the projected winner depends on suppression.
- F5 ML: starter profile is first-order input, especially when the bridge points the other way.
- Totals and team totals: high SP1 damage deltas raise over/team-total pressure; strong suppression deltas support unders only when ENV1/RP2 do not fight it.
- YRFI/NRFI: first-inning risk gets direct treatment, especially top-order handedness and pitch fit.
- Pitcher props: expected hits, earned runs, walks, strikeouts, outs, and leash.
- Batter props and HR lanes: batter production should move when split, pitch-fit, weather, and recent form agree.
- Public game story: detail pages should explain the pitcher profile in plain English with the actual numbers.

## Required Guardrails

- Rotowire primary/bulk pitcher is the projection pitcher when the official MLB starter is an opener.
- MLB official opener still matters for first inning and YRFI/NRFI, but should not become the full-game starter profile unless he is expected to work the starter window.
- Pitchers with fewer than four starts are flagged and confidence-capped until the role/sample is clear.
- Repeat-opponent tax applies when a pitcher has faced the opponent recently, especially same season. It must blend with current form; it cannot blindly add 20% because of stale history.
- Batter-vs-pitcher history older than three seasons is context-only.
- Recent hitter form can override old BvP. A cold hitter with ancient good BvP should not get promoted on history alone.
- HRForce below 1.4 is lower carry, not proof of an under. HRForce N/A is usually dome/no-weather-impact context.
- HRForce >= 1.5 must be embedded into pitcher expected runs/hits/HR and batter production when game-window carry persists.
- HRForce >= 1.7 is an over/YRFI tail-risk warning. Unders need explicit starter, lineup, bullpen, park, and market counterweights.
- Night games need game-window hourly HRForce persistence before using an earlier daily/current HRForce as a promotion input.

## Side/Tail Coherence Rule

SP1 is also a contradiction gate. If M2 says one team wins but the same game has a high run/HR tail against that team's starter path, the side pick must be demoted or moved to a better lane unless SP1 explains why the starter survives.

Examples:

- A side cannot be high-confidence if it requires the opponent to stay under four runs while ENV1/SP1 say the opponent has high HRForce, strong platoon fit, and repeat-opponent familiarity.
- A full-game side should not stay as the best expression when the model says the other team owns F5 and bridge phases.
- A thin favorite should become watch/pass if SP1 shows starter-collapse risk and the best edge is really YRFI, over, or a team total.

## Backtest Plan

Run SP1 shadow over settled slates before promotion:

- YRFI/NRFI direction, especially HRForce >= 1.5 and top-order split pressure.
- F5 O/U direction and F5 side/tie outcomes.
- Pitcher hits allowed, earned runs, walks, strikeouts, and outs.
- Side misses caused by starter collapse or wrong projection pitcher.
- Repeat-opponent starts, including same-season rematches.
- Day/night profile games with valid sample.
- High-HRForce games where the board promoted unders.

Promotion requires a bucketed improvement without damaging the low-HRForce/starter-duel bucket that is already useful.

Preferred command:

- Single date: `npm run data:run:mlb-sp1-shadow-calibration -- --date YYYY-MM-DD`
- Range: `npm run data:run:mlb-sp1-shadow-calibration -- --start-date YYYY-MM-DD --end-date YYYY-MM-DD`

Current promotion read:

- Keep SP1 shadow-only until at least a multi-slate settled sample is available.
- Promote HR-related deltas first only if the larger sample preserves the June 14 HR signal.
- Do not promote collapse risk, run delta, or hit delta until low-risk collapse misses and high-risk survival misses are explained by role, leash, weather persistence, and lineup context.
