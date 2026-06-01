# Player Identity Curves

This is an M2 research component, not a promoted prediction lane yet.

The idea: every hitter and pitcher has an identity curve. A game projection should not only ask "what is the team average?" It should ask whether this player's current shape is above, below, or changing away from their expected career/season identity.

## Problem Statement

Raw rolling averages are too brittle.

- One 4-hit game can make a hitter look solved.
- One starter blowup can make a pitcher look broken.
- Career stats are useful context but too stale to drive today's pick by themselves.
- Current-season stats are better, but early season and small-role players do not have enough samples.
- Player psychology, role pressure, lineup spot, roster fringe status, injury return, and confidence show up indirectly through approach and contact/process changes.

So M2 needs a player identity prior plus a current-state deviation.

## Experiment Shape

For each player, build expected season and game-distribution curves, then compare today's player state against that curve.

Hitter outputs:

- hits
- total bases
- walks
- strikeouts
- HR
- RBI/run/H+R+RBI where supported
- hard-hit/barrel/quality-contact process
- approach-state delta

Pitcher outputs:

- runs allowed
- hits allowed
- walks
- strikeouts
- HR allowed
- first-inning traffic
- first-five run leakage
- collapse hazard
- pitch-count/fatigue curve

## Candidate Model Families

### 1. Multivariate Linear Regression

Best for scale-like season estimates:

- expected season hits
- expected total bases
- expected pitcher innings/load
- expected strikeouts or walks over a larger horizon

Use this as a player identity baseline, not a direct single-game betting output.

Example:

```text
expectedSeasonHits[player]
  = b0
  + b1 * projectedAtBats
  + b2 * careerContactRate
  + b3 * currentContactRate
  + b4 * xBA
  + b5 * lineupRoleStability
  + b6 * healthOrPlayingTimeFlag
```

### 2. Poisson Regression

Best for count outcomes when variance is not too inflated:

- hits
- walks
- strikeouts
- runs allowed in stable buckets

Use when outcome variance is roughly near the mean after feature controls.

### 3. Negative Binomial Regression

Best for overdispersed baseball counts:

- total bases
- runs allowed
- HR-ish damage buckets
- pitcher collapse/event leakage

This should usually beat plain Poisson for chaotic player/game outcomes because baseball counts have fat tails.

### 4. Hierarchical / Shrinkage Model

This is the important version of "each player is their own model."

Instead of fully separate models:

```text
playerRateToday
  = leagueModel
  + playerIdentityOffset
  + currentStateDeviation
  + matchupAdjustment
```

The player-specific offset is shrunk toward league/role/handedness archetype when the sample is small.

That prevents a Nelson Velazquez-type one-game sample from becoming a fake core edge, while still letting that game move his current confidence/process state.

## Identity Curve Formula

For each player:

```text
identityCurve[player, metric]
  = shrink(
      careerBaseline[player, metric],
      recentSeasonBaseline[player, metric],
      currentProcess[player, metric],
      roleAndPlayingTime[player],
      opponentStrengthAdjustedRecent[player, metric],
      sampleSize[player, metric]
    )
```

Then:

```text
currentDeviation[player, metric]
  = currentProcess[player, metric]
  - identityCurve[player, metric]
```

And today's game expectation:

```text
todayExpectation[player, metric]
  = identityCurve[player, metric]
  + matchupFit[player, opponent]
  + parkWeatherSunAdjustment
  + lineupSpotAdjustment
  + rolePressureAdjustment
  + recentDeviation[player, metric] * confidenceWeight
```

## Spread Across Season

Season expected output is not enough. M2 needs distribution over games.

For hitters:

```text
gameHitDistribution[player]
  = distribute(
      expectedSeasonHits,
      expectedStarts,
      plateAppearancesPerStart,
      pitcherHandednessMix,
      parkMix,
      lineupRole,
      volatilityProfile
    )
```

For pitchers:

```text
gameRunAllowedDistribution[pitcher]
  = distribute(
      expectedSeasonRunsAllowed,
      expectedStarts,
      inningsCurve,
      pitchCountLimit,
      matchupQuality,
      commandVolatility,
      bullpenBridgeRisk
    )
```

This turns "what should he hit this season?" into "what range is live today?"

## Combination With Game Shape

Player identity curves should feed M2 state formulas, not replace them.

Examples:

- A hitter with positive damage deviation increases `damagePressure`.
- A lineup with several hitters above traffic identity increases `trafficPressure`.
- A starter with rising walk deviation increases `collapseHazard`.
- A pitcher with stable whiff identity increases `suppressionState`.
- A high player-volatility cluster increases `fork` probability.

## Warehouse Targets

Proposed derived tables:

- `mlb_player_identity_curves_daily`
- `mlb_player_current_deviation_daily`
- `mlb_player_game_distribution_daily`
- `mlb_player_identity_model_backtests`

Minimum columns:

- `snapshot_date`
- `player_id`
- `player_name`
- `player_type` (`hitter`, `pitcher`)
- `metric`
- `career_baseline`
- `season_baseline`
- `recent_process`
- `opponent_adjusted_recent`
- `identity_value`
- `current_deviation`
- `sample_size`
- `shrinkage_weight`
- `volatility_score`
- `distribution_mean`
- `distribution_p50`
- `distribution_p75`
- `distribution_p90`
- `model_family`
- `backtest_bucket`

## Backtest Contract

Do not promote this because it sounds smart.

Backtest by:

- player type
- stat target
- sample-size bucket
- role bucket
- current-vs-identity deviation bucket
- matchup-fit bucket
- betting line bucket

Report:

- hit rate
- ROI when odds/price exists
- calibration by bucket
- false heat rate
- missed breakout rate

## Current Commands

Derive warehouse rows:

```bash
npm run data:derive:mlb-player-identity -- --through-date YYYY-MM-DD
```

Build the current coverage/signal report:

```bash
npm run data:research:mlb-m2-player-identity -- --start 2026-05-23 --end YYYY-MM-DD
```

Current artifacts:

- `models/mlb/cartridges/MLB-M2/research/player_identity_rows_report.py`
- `models/mlb/cartridges/MLB-M2/reports/player-identity-rows-report-2026-05-23-to-2026-05-31.md`
- `data-private/reports/mlb-m2-player-identity-rows-report-2026-05-23-to-2026-05-31.json`

Current first-pass read:

- Full warehouse through May 31: 184,256 curves, 184,256 deviations, 184,228 distributions.
- May 23-May 31 report range: 27,772 curves, 27,772 deviations, 27,758 distributions.
- Hitter rows reach May 31; pitcher rows currently reach May 30 because pitcher rolling-form freshness stops there.
- Rough hitter direction checks are research-only: hits 57.1%, total bases 57.0%, strikeouts 60.6%, walks 72.0%, HR 85.1% mostly because the signal stays negative on a rare event.

Interpretation: the substrate exists, but the edge is not proven. Treat this as feature generation and false-heat control until bucketed prop/total backtests show lift.

## Promotion Gate

This becomes usable only when it improves at least one of:

- total-bases props
- hits props
- HR board
- pitcher K/walk/run allowed reads
- team traffic/damage formulas
- first-five O/U story buckets

Until then, it stays an experiment and a warehouse feature generator.
