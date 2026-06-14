# MLB-M2 Game-Shape Reality-Gap Branch

MLB-M2 is an active-inspection parent cartridge branched from MLB-M0. It was promoted by operator request on 2026-06-01 so the live slate can expose the game-shape/reality-gap layer while M0 remains the baseline to beat.

The purpose is bigger than another confidence tweak: M2 must explain the likely shape of the game before it recommends a market. The model should identify when the data says one team is better but the actual baseball path is fragile: dead-early offense, one crooked inning, bullpen bridge failure, phase disagreement, weather carry, or traffic without conversion.

## Scope

- Full-game side and moneyline reads inherited from M0
- First-five timing reads inherited from M0
- Full-game, first-five, and late total reads inherited from M0
- First-inning timing inherited from M0
- Player prop and home-run context inherited from M0
- New game-shape/reality-gap read at `analysis.gameShape`
- New RF research lens inside the game-shape read
- MLB-RP36 relief addendum as a consumed input component

## What Changed From M0

M2 adds `models/mlb/cartridges/MLB-M2/lib/mlb-game-shape.js`.

That layer scores:

- `realityGapScore`: how much the raw projection may be lying about the game path
- `chaosScore`: crooked-inning, mistake, run-cluster, bullpen, and weather exposure
- `deadEarlyScore`: quiet first five, dead traffic, and weak conversion exposure
- `phaseSplitScore`: whether full-game, first-five, late, and bridge edges disagree
- `bullpenFlipScore`: how much the bridge can change the game after starters leave
- `starterControlScore`: whether the game can actually stay on the starter script

It also writes market implications for side, first five, total, and first inning. That is the main behavioral goal: M2 should stop pretending moneyline is always the best expression.

## Category Contract

M2 now classifies each MLB game into a shape category with an explicit market expression:

- `clean_phase_stack`: full-game side is allowed if price is fair.
- `early_pressure_side`: side is allowed only after early traffic confirms the pressure read.
- `starter_to_bullpen_flip`: first-five or live-lead expression is cleaner than blind full-game ML.
- `late_rescue_side`: live side after starter exit is cleaner than first-five.
- `dead_zone_side`: first-five timing or live-after-conversion; no blind full-game ML.
- `favorite_conversion_trap`: no taxed favorite ML until conversion shows up.
- `crooked_inning_over`: full-game total, team total, or HR cluster is cleaner than side.
- `starter_duel_under`: NRFI or first-five under is the first market to check.
- `market_dog_pressure`: plus-price ML or prediction-market spike, not safe-winner framing.
- `weather_chaos_carry`: total/HR shape before side.
- `balanced_traffic`: wait for first scoring pocket.

Each category includes a lane map and an inning map for 1-2, 3-5, 6-7, and 8-9 so the site can show actual game-flow expectations.

## Current Backtest

Backtest artifact:

- `models/mlb/cartridges/MLB-M2/reports/game-shape-backtest-2026-05-10-to-2026-05-31.md`
- `data-private/reports/mlb-m2-game-shape-backtest-2026-05-10-to-2026-05-31.json`

Canonical settled rows from 2026-05-10 through 2026-05-31:

- Baseline full-game side: 59.0% on 212 rows.
- Baseline first-five side: 52.8% on 212 rows.
- M2 allowed-side bucket: 67.5% on 40 rows.
- M2 category lane hit: 62.6% on 195 graded lane rows.
- Starter-to-bullpen flip F5 lane: 68.6% on 35 rows.
- Dead-zone timing/F5 lane: 70.6% on 17 rows.

Walk-forward tests did not solve the board:

- Random forest and gradient boosting helped F5/high-total sublanes but did not beat the transparent category layer overall.
- Logistic regression failed and should not be promoted.
- The strongest current M2 signal is lane selection, not raw winner picking.

Rule sweeps found promising sublanes:

- Starter-control rows were much better as full-game side candidates.
- Phase-split rows were much better as first-five candidates.
- Very high chaos rows were better as high-total or first-inning scoring candidates than as side picks.
- Very low lineup-conversion rows may belong in first-five totals before full-game side.

## Current Lane Downgrades

First-five O/U is downgraded to research-only after the May 31 value-board failure. The displayed board had promoted raw projected-run probability minus Kalshi ask as value, but that lane did not have settled bucket calibration. It may remain visible for diagnostics and live-learning, but it cannot be ranked as bet-grade value until its probability, line, ask, edge, and chaos buckets are backtested date by date.

The web value board is now a filter, not a model. It may display model-owned value rows and model-owned prop rows, but it may not create first-five ML, first-five O/U, totals EV, or scalp rows from raw projections. Those lanes have to be published by the cartridge before the UI can promote them.

## RF Lens

The current RF evidence is mixed.

- Totals RF is the only research lane marked deployable in the existing MLB docs.
- Moneyline RF is not deployable.
- First-five RF is not deployable.
- First-inning RF is not deployable.

So M2 does not let RF pick games by itself. It uses RF as a nonlinear totals/game-shape check and exposes an `rfLens.impactScore` so we can measure whether RF actually helped.

## Activation Rule

M2 is active for inspection, but not fully proven as a betting upgrade.

Minimum proof before full promotion:

- M2 can render the same app-facing match model contract as M0.
- M2 can run on the May 31 MLB slate without breaking existing outputs.
- M2-vs-M0 comparison shows where game-shape changes decisions.
- Postmortem settlement proves high reality-gap labels correlate with bad full-game ML, better F5/total/first-inning expressions, or clean passes.
- Value rows remain model-owned and gated; the UI may filter, but must not transform raw projections into value picks.

## 2026-06-14 v0.3 Side/Tail Coherence Plan

The recent YRFI lane has been strong enough to treat first-inning pressure, top-order fit, and run-carry as real signal. The next problem is not to dilute that lane; it is to stop full-game sides from ignoring the same signal.

M2 now has a documented next addendum:

- `MLB-SP1`: starter or bulk-primary pitcher profile addendum.

SP1 should turn the scattered starter checks into one daily pitcher-profile object: projection pitcher role, opener/bulk handling, season identity, recent form, day/night split, handedness allowed splits, posted-lineup handedness pressure, pitch mix versus hitter pitch-type response, repeat-opponent tax, HRForce/weather archetype, first-inning risk, leash, and source status.

Side/tail coherence rules for the next build:

- A side that depends on starter suppression is capped or demoted when HRForce, handedness fit, pitch mix, repeat-opponent familiarity, or first-inning risk create an over-tail that the starter profile cannot explain away.
- HRForce >= 1.5 must affect pitcher expected hits/runs/HR and batter expected production when game-window carry persists.
- HRForce >= 1.7 is a strong YRFI/over-tail warning and blocks casual unders unless starter, lineup, bullpen, park, and market context all provide explicit counterweights.
- Full-game side, F5 side, late side, bridge edge, projected runs, and total tail must reconcile before public confidence can be promoted.
- `52` is acceptable for true watch/pass rows. It is not acceptable for separated all-phase edges with positive run differential and real hit support.

No production scoring override is promoted by this note. The next implementation step is to materialize SP1 as a shadow addendum and settle it by YRFI/NRFI, F5 O/U, F5 side/tie, pitcher lines, batter props, repeat-opponent games, and high-HRForce games.

## Known Gaps

- The RF lens uses documented research baselines, not a serialized production RF artifact yet.
- Reality-gap scoring is transparent but still unproven; it needs bucketed settlement.
- M2 should eventually persist game-shape outcomes into the warehouse so we can backtest the shape labels directly.
