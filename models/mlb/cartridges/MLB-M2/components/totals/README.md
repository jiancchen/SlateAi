# Run Totals

Owns full-game, first-five, and late scoring-total projections after starter, bullpen, lineup, park, and weather context are joined.

## Environment Addendum

`MLB-ENV1` is the new modular run-environment layer. It writes `mlb_game_environment_adjustments_daily` with separate park, FIC weather/HRForce, and exact-umpire deltas:

- `expected_total_runs_delta`
- `expected_hr_delta`
- `expected_k_delta`
- `expected_walk_delta`
- `run_environment_signal`

M2 totals may consume ENV1 as a shadow adjustment while it is `shadow-candidate`. Umpire deltas are only valid when the assignment row is an exact game/date match; unresolved or stale umpire rows must remain zero-adjustment context.

Posted total source order:

- sportsbook total market from `game.odds.markets`
- lineup/weather context total from `game.lineupBoard.marketWeatherContext.total`

If both are missing, the lane must stay `No market`.

## Chaos Gate

The raw total is not enough for MLB. After `projected runs - line`, totals must survive a chaos gate before they are allowed onto the value board.

The gate downgrades or vetoes:

- unders exposed to mistake-chaos, one-bad-inning risk, run clustering, warm carry, wind out, or high-traffic offensive shape
- overs exposed to quiet-first-five rates, traffic without conversion, dead-bat traffic, low conversion floors, wind in, or suppressing weather

Each total lean stores a `chaosGate` object with the score, notes, metrics, and veto reason. UI rows should hide vetoed totals and show the warning when a total survives but is still chaos-sensitive.

## First-Five Tail Overlay

First-five totals must not be treated as a tidy point-estimate problem. The May 31 failure showed that a normal/Poisson-style projection can look mathematically reasonable while missing the only thing that matters: whether the game has a run-explosion tail, a strand/cold-start tail, or a live fork where both paths are plausible.

The M2 first-five total now carries `first5TailOverlay`:

- `baseProjectedRuns`: original hit-volume/conversion projection
- `adjustedProjectedRuns`: heavy-tail/strand adjusted run expectation
- `shape`: `over-tail`, `strand-tail`, `unsupported-over`, `live-only fork`, or `balanced`
- `tailScore`, `strandScore`, `forkScore`
- `marketExpression`: `Over`, `Under`, `Pass`, or `Live-only`

Rules:

- Over-tail can keep an over alive even when the old chaos gate would have vetoed it as messy.
- Unsupported overs are downgraded when the point projection is over the line but the run-explosion support is not there.
- Live-only fork means do not publish a pregame side. Wait for first-cycle traffic/contact to decide whether the explosion or strand branch is real.
- Signed average error is not a validation metric. Absolute miss size and side correctness are the headline metrics.

## Story-First Total Rule

M2 totals must ask the baseball question before the math question:

- Why did this game go over?
- Why did this game go under?
- Is that same mechanism visible before today's game?

The model should classify the run story before pricing the side. Current story buckets:

- `crooked-inning over`
- `traffic-conversion over`
- `power over`
- `free-pass over`
- `bridge over`
- `fielding/outfield-tail over`
- `starter hold under`
- `strand under`
- `power-suppressed under`
- `bat-missing under`
- `bridge-clean under`
- `fork/live-only`

The story engine lives at:

```bash
node models/mlb/cartridges/MLB-M2/research/run_total_story_engine.mjs --post-date 2026-05-31 --today 2026-06-01
```

Artifacts:

- `models/mlb/cartridges/MLB-M2/reports/run-total-story-engine-2026-05-31-today-2026-06-01.md`
- `data-private/reports/mlb-m2-run-total-story-engine-2026-05-31-today-2026-06-01.json`

This is deliberately not an aggregation table. It reads plate appearances, inning flow, free passes, errors, hard contact, outfield tail, home runs, strikeouts, double plays, bridge/late scoring, and pregame repeatability flags.

## Value-Board Rule

Totals are projections first and value rows second. A projected edge against a line is not enough to publish a bet-grade value row.

After the May 31 first-five O/U value-board failure, first-five totals must stay `research-only` until a settled calibration layer exists for:

- posted line bucket
- market ask / price bucket
- model probability bucket
- projected-run edge bucket
- chaos gate bucket
- date-level walk-forward performance

UI and publish code may show F5 O/U rows as research/watch context, but must not rank them beside validated ML, side, or prop value rows until that calibration passes.
