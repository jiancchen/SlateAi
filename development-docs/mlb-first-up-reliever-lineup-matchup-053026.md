# MLB First-Up Reliever Lineup-Matchup Overlay — May 30, 2026

This is `E32`, the next bullpen-model pass after `E31`.

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

## Ranking Comparison

| Model | Exact 1st | Top-2 | Top-3 |
| --- | --- | --- | --- |
| `current likelihood stack` | 18.0% | 30.1% | 41.2% |
| `E31: quality + role-drift` | 19.5% | 41.2% | 58.1% |
| `E32: E31 + lineup interaction` | 25.0% | 44.1% | 58.5% |

## Workload Buckets: E31

| Actual first-up workload | Samples | Exact 1st | Top-2 |
| --- | --- | --- | --- |
| 1-3 outs | 161 | 19.9% | 41.6% |
| 4-5 outs | 49 | 18.4% | 42.9% |
| 6+ outs | 62 | 19.4% | 38.7% |

## Workload Buckets: E32

| Actual first-up workload | Samples | Exact 1st | Top-2 |
| --- | --- | --- | --- |
| 1-3 outs | 161 | 23.6% | 45.3% |
| 4-5 outs | 49 | 30.6% | 49.0% |
| 6+ outs | 62 | 24.2% | 37.1% |

## Actual First-Up Matchup Profile

| Actual first-up workload | Samples | Opp-hand share top6 | Opp-hand pressure | Opp-hand xwOBA | Lineup conv idx |
| --- | --- | --- | --- | --- | --- |
| 1-3 outs | 780 | 0.468 | 28.94 | 0.327 | 0.0 |
| 4-5 outs | 211 | 0.448 | 29.74 | 0.337 | 0.0 |
| 6+ outs | 226 | 0.474 | 28.72 | 0.336 | 0.0 |

## Top E32 Features

- `quality_entry_order_avg_last10` `0.029`
- `availability_score` `0.028`
- `first_reliever_likelihood` `0.028`
- `fatigue_score` `0.028`
- `days_since_last_appearance` `0.026`
- `bridge_score` `0.021`
- `pitches_last3` `0.019`
- `quality_strikeouts_per_bf_last10` `0.019`
- `avg_pitches_per_appearance` `0.019`
- `starter_prob_15` `0.018`
- `quality_pitches_per_app_last10` `0.018`
- `starter_prob_12` `0.017`
- `avg_entry_order` `0.017`
- `quality_traffic_per_bf_last10` `0.017`

## Read

- `E32` tests whether bullpen choice is partially a lineup-matchup decision, not just an availability or role decision.
- The lineup layer here includes:
  - reliever-hand vs top-of-order handedness counts
  - reliever-hand vs top-of-order pressure / xwOBA
  - team conversion shape
  - lineup dependency context
- If this helps mainly on the shortlist rather than exact first-up, that still matters: it would mean we are getting better at identifying the right reliever cluster for the lineup that is about to hit.
- Important note: the current `lineup_conversion_index_last5` / `dead_bat_traffic_rate_last5` inputs were effectively empty in this pass, so the actual lift here is coming from lineup handedness, pressure, xwOBA, and dependency context rather than conversion-shape features yet.
