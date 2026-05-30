# MLB First-Up Reliever Quality + Role-Drift Overlay — May 30, 2026

This is `E31`, the next bullpen-model pass after `E29`.

Goal:

- add reliever quality / role-drift / new-sample overlays
- test whether recent first-batter command and damage improve first-up reliever identification
- see whether fresh call-up / unknown-sample flags or bulk-role drift add separation

Samples:

- candidate rows: `12506`
- team-side games: `1301`
- train candidate rows: `9853`
- test candidate rows: `2653`
- test team-side games: `272`

## Ranking Comparison

| Model | Exact 1st | Top-2 | Top-3 |
| --- | --- | --- | --- |
| `current likelihood stack` | 18.0% | 30.1% | 41.2% |
| `E29: shape + starter exit + usage` | 19.5% | 37.1% | 52.9% |
| `E31: E29 + quality / role-drift` | 20.2% | 41.9% | 58.8% |

## Workload Buckets: E29

| Actual first-up workload | Samples | Exact 1st | Top-2 |
| --- | --- | --- | --- |
| 1-3 outs | 161 | 22.4% | 34.8% |
| 4-5 outs | 49 | 18.4% | 44.9% |
| 6+ outs | 62 | 12.9% | 37.1% |

## Workload Buckets: E31

| Actual first-up workload | Samples | Exact 1st | Top-2 |
| --- | --- | --- | --- |
| 1-3 outs | 161 | 19.3% | 43.5% |
| 4-5 outs | 49 | 20.4% | 44.9% |
| 6+ outs | 62 | 22.6% | 35.5% |

## Actual First-Up Quality Profile

| Actual first-up workload | Samples | FB reach rate L10 | FB walk rate L10 | 1st-pitch strike L10 | New-team flag | Unknown-sample flag |
| --- | --- | --- | --- | --- | --- | --- |
| 1-3 outs | 780 | 0.306 | 0.121 | 0.506 | 0.078 | 0.192 |
| 4-5 outs | 211 | 0.306 | 0.129 | 0.510 | 0.076 | 0.246 |
| 6+ outs | 226 | 0.330 | 0.114 | 0.477 | 0.199 | 0.429 |

## Top E31 Features

- `availability_score` `0.036`
- `first_reliever_likelihood` `0.035`
- `quality_entry_order_avg_last10` `0.034`
- `fatigue_score` `0.032`
- `days_since_last_appearance` `0.031`
- `starter_prob_15` `0.027`
- `quality_strikeouts_per_bf_last10` `0.025`
- `bridge_score` `0.025`
- `starter_prob_12` `0.025`
- `starter_prob_18` `0.024`
- `avg_pitches_per_appearance` `0.024`
- `quality_pitches_per_app_last10` `0.023`

## Read

- `E31` tests whether arm quality and role drift add missing separation on top of bullpen shape and starter-exit risk.
- The most important quality lane here is not generic reliever ERA. It is the combination of:
  - recent first-batter outcomes
  - first-five-pitch command
  - recent traffic allowed
  - new-sample / unknown-sample flags
  - recent bulk-role drift
- If this helps mainly on `Top-2` or the `6+ outs` lane, that still matters. It would mean we are getting better at identifying the right reliever class before the exact-name layer fully matures.
