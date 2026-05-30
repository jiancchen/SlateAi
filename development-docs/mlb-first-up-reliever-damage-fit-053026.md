# MLB First-Up Reliever Damage-Fit Overlay — May 30, 2026

This is `E33`, the next bullpen-model pass after `E31`.

Goal:

- add lineup-shape interaction to the first-up reliever model
- test whether managers appear to match the first reliever to handedness and top-of-order pressure
- see whether lineup conversion / dependency context improves the shortlist

Samples:

- candidate rows: `12506`
- team-side games: `1301`
- train candidate rows: `9853`
- test candidate rows: `2653`
- test team-side games: `272`

Using:

- conversion window `8`
- dependency window `5`

## Ranking Comparison

| Model | Exact 1st | Top-2 | Top-3 |
| --- | --- | --- | --- |
| `current likelihood stack` | 18.0% | 30.1% | 41.2% |
| `E31: quality + role-drift` | 19.5% | 41.2% | 58.1% |
| `E33: E31 + lineup interaction` | 26.5% | 44.5% | 59.6% |

## Workload Buckets: E31

| Actual first-up workload | Samples | Exact 1st | Top-2 |
| --- | --- | --- | --- |
| 1-3 outs | 161 | 19.9% | 41.6% |
| 4-5 outs | 49 | 18.4% | 42.9% |
| 6+ outs | 62 | 19.4% | 38.7% |

## Workload Buckets: E33

| Actual first-up workload | Samples | Exact 1st | Top-2 |
| --- | --- | --- | --- |
| 1-3 outs | 161 | 26.7% | 46.0% |
| 4-5 outs | 49 | 26.5% | 44.9% |
| 6+ outs | 62 | 25.8% | 40.3% |

## Actual First-Up Matchup Profile

| Actual first-up workload | Samples | Opp-hand share top6 | Opp-hand pressure | Opp-hand xwOBA | Lineup conv idx |
| --- | --- | --- | --- | --- | --- |
| 1-3 outs | 780 | 0.468 | 28.94 | 0.327 | 38.7 |
| 4-5 outs | 211 | 0.448 | 29.74 | 0.337 | 38.1 |
| 6+ outs | 226 | 0.474 | 28.72 | 0.336 | 38.8 |

## Top E33 Features

- `availability_score` `0.028`
- `first_reliever_likelihood` `0.027`
- `quality_entry_order_avg_last10` `0.027`
- `days_since_last_appearance` `0.027`
- `fatigue_score` `0.026`
- `bridge_score` `0.018`
- `pitches_last3` `0.017`
- `quality_strikeouts_per_bf_last10` `0.017`
- `avg_pitches_per_appearance` `0.017`
- `quality_pitches_per_app_last10` `0.016`
- `starter_prob_15` `0.015`
- `quality_traffic_per_bf_last10` `0.015`
- `lineup_top6_same_hard_hit` `0.015`
- `starter_prob_12` `0.014`

## Read

- `E33` tests whether bullpen choice is partially a lineup-damage-fit decision, not just an availability or role decision.
- The lineup layer here includes:
  - reliever-hand vs top-of-order handedness counts
  - reliever-hand vs top-of-order pressure / xwOBA
  - team conversion shape
  - lineup dependency context
- The corrected conversion join is live in this pass, so the lineup context is no longer a dead placeholder. The lift here is still mostly role/quality-driven, but real lineup damage-fit context is now helping on top of that rather than dropping out.
