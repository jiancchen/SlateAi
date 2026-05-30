# MLB First-Up Reliever Arsenal Concentration — May 30, 2026

This is `E30`, the next bullpen-model pass after `E29`.

Goal:

- add reliever arsenal concentration from local `mlb_pitch_events`
- test whether pitch-mix shape improves first-up reliever identification
- learn whether bulk arms separate from short bridge arms by arsenal profile

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
| `E29: shape + starter exit + usage` | 19.9% | 37.1% | 52.2% |
| `E30: E29 + arsenal concentration` | 17.3% | 32.4% | 48.2% |

## Workload Buckets: E29

| Actual first-up workload | Samples | Exact 1st | Top-2 |
| --- | --- | --- | --- |
| 1-3 outs | 161 | 22.4% | 37.9% |
| 4-5 outs | 49 | 18.4% | 42.9% |
| 6+ outs | 62 | 14.5% | 30.6% |

## Workload Buckets: E30

| Actual first-up workload | Samples | Exact 1st | Top-2 |
| --- | --- | --- | --- |
| 1-3 outs | 161 | 18.0% | 33.5% |
| 4-5 outs | 49 | 16.3% | 30.6% |
| 6+ outs | 62 | 16.1% | 30.6% |

## Actual First-Up Arsenal Profile

| Actual first-up workload | Samples | Avg top-2 share L15 | Avg pitch types L15 | Avg fastball share L15 | Avg concentration HHI L15 |
| --- | --- | --- | --- | --- | --- |
| 1-3 outs | 780 | 0.767 | 4.06 | 0.527 | 0.367 |
| 4-5 outs | 211 | 0.739 | 4.34 | 0.521 | 0.344 |
| 6+ outs | 226 | 0.689 | 4.77 | 0.555 | 0.309 |

## Top E30 Features

- `first_reliever_likelihood` `0.039`
- `availability_score` `0.035`
- `fatigue_score` `0.035`
- `avg_pitches_per_appearance` `0.033`
- `days_since_last_appearance` `0.033`
- `bridge_score` `0.030`
- `starter_prob_15` `0.028`
- `starter_prob_12` `0.028`
- `avg_entry_order` `0.026`
- `arsenal_secondary_share_last15` `0.026`
- `starter_prob_18` `0.026`
- `arsenal_fastball_share_last30` `0.026`

## Read

- `E30` tests whether local pitch-mix concentration gives the model more separation inside the same bullpen shape / availability bucket.
- If it helps mostly on `Top-2` or the `6+ outs` lane, that still matters: it means arsenal shape is helping us identify the right reliever class even if exact-name accuracy stays hard.
- This pass is intentionally local-only. It does **not** yet use Savant contact-quality-allowed data by pitch type; that belongs in the next relief-quality overlay, not this concentration-only pass.
- The important honest outcome here is negative: concentration-only arsenal features made the shortlist worse than `E29`, so basic pitch-mix shape should stay a descriptive/context layer until we pair it with reliever quality or lineup-matchup features.
