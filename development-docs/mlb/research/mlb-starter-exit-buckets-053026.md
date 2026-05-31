# MLB Starter Exit Buckets — May 30, 2026

This is `E27`, the first real research pass for the relief-model rebuild.

Goal:

- predict how far the starter gets before the bullpen matters
- use that as the root input for later bullpen-shape and first-up reliever models

Source tables:

- `mlb_starting_pitcher_game_logs`
- `mlb_starter_leash_profiles`
- `mlb_starting_pitcher_rolling_form`
- `mlb_pitcher_mistake_shape_daily`
- `mlb_team_bullpen_shape_daily`
- `mlb_hitter_state_snapshots`
- `mlb_team_state_snapshots`
- `mlb_pitcher_war_by_season`

Samples:

- modeled starts: `1335`

## Actual Starter Exit Bucket Distribution

| Bucket | Starts | Share |
| --- | --- | --- |
| <12 | 147 | 11.0% |
| 12-14 | 202 | 15.1% |
| 15-17 | 460 | 34.5% |
| 18-20 | 371 | 27.8% |
| 21+ | 155 | 11.6% |

## Leash Score Buckets

| Leash bucket | Starts | Avg outs | 15+ outs | 18+ outs | 21+ outs |
| --- | --- | --- | --- | --- | --- |
| `<45` | 484 | 14.37 | 64.5% | 27.7% | 4.3% |
| `45-59` | 340 | 15.97 | 74.7% | 37.4% | 9.7% |
| `60-74` | 306 | 16.73 | 82.7% | 50.0% | 17.0% |
| `75+` | 205 | 17.33 | 81.5% | 54.6% | 23.9% |

## Call-up / Tiny-Sample Context

| Lane | Starts | Avg outs | 15+ outs | 18+ outs | 21+ outs |
| --- | --- | --- | --- | --- | --- |
| `call-up / debut lane` | 73 | 11.45 | 43.8% | 12.3% | 2.7% |
| `tiny sample only` | 320 | 15.44 | 70.6% | 34.4% | 7.2% |
| `established sample` | 942 | 16.22 | 77.3% | 43.2% | 13.8% |

## Opponent Top-6 Pressure Buckets

| Opp pressure | Starts | Avg outs | 15+ outs | 18+ outs | 21+ outs |
| --- | --- | --- | --- | --- | --- |
| `<45` | 1294 | 15.80 | 74.0% | 39.6% | 11.8% |
| `45-59` | 40 | 15.35 | 70.0% | 32.5% | 5.0% |
| `60-74` | 1 | 1.00 | 0.0% | 0.0% | 0.0% |
| `75+` | 0 | 0.00 | 0.0% | 0.0% | 0.0% |

## Bullpen Shape Behind The Starter

| Bullpen shape | Starts | Avg outs | 15+ outs | 18+ outs | 21+ outs |
| --- | --- | --- | --- | --- | --- |
| `<45` | 3 | 19.67 | 100.0% | 33.3% | 33.3% |
| `45-64` | 92 | 16.38 | 76.1% | 47.8% | 12.0% |
| `65-84` | 504 | 16.19 | 76.0% | 41.7% | 14.1% |
| `85+` | 736 | 15.40 | 72.0% | 36.8% | 9.8% |

## Research-Only Heuristic Gates

| Gate | Starts | Avg outs | 15+ outs | 18+ outs | 21+ outs |
| --- | --- | --- | --- | --- | --- |
| `stable hold` | 190 | 16.93 | 81.1% | 53.2% | 19.5% |
| `early hook danger` | 979 | 15.30 | 69.6% | 33.9% | 8.4% |
| `bulk stretch lane` | 396 | 16.75 | 80.8% | 48.5% | 18.4% |
| `quiet opponent leash` | 408 | 16.90 | 81.9% | 52.2% | 19.4% |

## Time-Split Threshold Models

| Threshold | Train | Test | Train base | Baseline acc | RF acc | Brier |
| --- | --- | --- | --- | --- | --- | --- |
| `12+ outs` | 1052 | 283 | 88.9% | 89.4% | 92.6% | 0.077 |
| `15+ outs` | 1052 | 283 | 73.2% | 76.3% | 79.2% | 0.162 |
| `18+ outs` | 1052 | 283 | 38.5% | 57.2% | 65.0% | 0.218 |
| `21+ outs` | 1052 | 283 | 11.4% | 87.6% | 87.6% | 0.113 |

## Top Model Features

- `12+ outs`: `current_war` `0.085`, `current_war_gs` `0.074`, `leash_score` `0.060`, `outs_per_start` `0.053`, `strikeout_to_walk_ratio` `0.040`, `opp_top6_pressure` `0.037`
- `15+ outs`: `current_war` `0.097`, `current_war_gs` `0.054`, `opp_form_pressure` `0.043`, `opp_top6_pressure` `0.041`, `outs_per_start` `0.040`, `leash_score` `0.039`
- `18+ outs`: `current_war` `0.081`, `leash_score` `0.048`, `opp_top6_pressure` `0.040`, `strikeout_to_walk_ratio` `0.039`, `outs_per_start` `0.038`, `opp_top6_heat` `0.037`
- `21+ outs`: `current_war` `0.092`, `outs_per_start` `0.065`, `leash_score` `0.064`, `run_volatility` `0.040`, `whip_like` `0.036`, `opp_top6_heat` `0.035`

## Read

- `Leash score` is the obvious first anchor, but it is not enough alone.
- `Call-up / debut lane` is the early-hook danger case we care about most for bullpen modeling.
- `Opponent top-6 pressure` and `command-break / meltdown` context are important because they explain why two starters with similar season averages exit at very different points.
- `Bullpen shape behind the starter` matters too: if a team is already living in bulk / scramble territory, the manager's starter hook behavior is different.

## What this means for the bullpen rebuild

Use this sequence:

1. turn starter exit into `12 / 15 / 18 / 21+` threshold probabilities
2. feed those probabilities into the team bullpen-shape model
3. only then upgrade the exact first-up reliever model

## Immediate next step

- keep `E27` research-only for now
- if this pass stays useful, the next code step is to export a small `starter exit risk` block into the MLB game payload so the bullpen lane can read:
  - early-hook danger
  - likely bridge point
  - stretch / bulk chance
