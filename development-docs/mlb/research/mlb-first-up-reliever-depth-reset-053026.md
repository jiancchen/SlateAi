# MLB First-Up Reliever Depth Reset — May 30, 2026

This is `E35`, the next bullpen pass after `E34 shadow`.

Goal:

- test whether a heavy recent pitch count should temporarily remove a reliever from the first-up pool
- measure what the bullpen looks like after that removal
- turn that remaining-pool quality into the next bridge-chain feature layer

Audit window: `2026-05-10` through `2026-05-29`.

## Rest Interval by Prior Pitch Count

| Prior pitch bucket | Samples | Avg rest days | Median rest | Next day | 2 days | 3+ days |
| --- | --- | --- | --- | --- | --- | --- |
| <20 | 3211 | 2.92 | 2.0 | 21.4% | 31.3% | 47.3% |
| 20-29 | 1223 | 3.30 | 3.0 | 13.7% | 31.6% | 54.7% |
| 30-34 | 222 | 4.41 | 3.0 | 6.8% | 22.5% | 70.7% |
| 35-39 | 144 | 4.50 | 4.0 | 1.4% | 16.7% | 81.9% |
| 40+ | 263 | 7.03 | 5.0 | 0.4% | 5.3% | 94.3% |

## Re-entry Pressure on Next Day

| Sample | Rows | Appeared same day | First-up same day | Avg pregame likelihood |
| --- | --- | --- | --- | --- |
| All next-day relievers | 1423 | 18.2% | 3.6% | 68.2 |
| 35+ pitch next-day relievers | 128 | 0.8% | 0.0% | 65.5 |
| 40+ pitch next-day relievers | 87 | 0.0% | 0.0% | 66.9 |

## Simple Drop-Rule Check

| Rule | Team-games | Exact 1st | Top-2 | Top-3 |
| --- | --- | --- | --- | --- |
| Baseline likelihood stack | 521 | 19.4% | 31.1% | 40.5% |
| Drop next-day 35+ pitch arms | 521 | 19.6% | 31.3% | 40.9% |
| Drop next-day 40+ pitch arms | 521 | 19.6% | 31.1% | 40.7% |

## Heavy-Top3 Subset

| Subset | Team-games | Exact 1st | Top-2 | Top-3 |
| --- | --- | --- | --- | --- |
| Heavy 35+ arm already in top-3 | 117 | 16.2% | 29.1% | 38.5% |
| After dropping heavy 35+ arm | 117 | 17.1% | 29.9% | 40.2% |

## Remaining Bullpen Pool After Heavy-Arm Removal

| Metric | Value |
| --- | --- |
| Team-days with 35+ heavy arm already in top-3 | 27 |
| Share of team-days with heavy top-3 arm | 5.1% |
| Top-2 cluster changes after dropping heavy arm | 40.7% |
| Remaining top-3 avg availability | 70.5 |
| Remaining top-3 avg bridge score | 86.2 |
| Remaining top-3 avg outs/app | 4.36 |

## Proposed E35 Overlay

- Hard flag a reliever when `days_since_last_appearance <= 1` **and** `last_appearance_pitches >= 35`.
- Treat `40+` pitches as a near-automatic temporary removal from the same-day first-up pool unless there is explicit opener / bulk evidence.
- After removing those arms, recompute the bullpen cluster and store at least:
  - `remaining_top3_availability_avg`
  - `remaining_top3_bridge_score_avg`
  - `remaining_top3_outs_avg`
  - `removed_heavy_top2_count`

## Read

- The `35-40` pitch threshold is real. Relievers coming off `35-39` pitches had only a `1.4%` next-day appearance rate and `0.0%` next-day first-up rate in this window; `40+` arms were effectively gone the next day.
- A simple drop rule is **directionally positive** even before any retraining. On the full baseline candidate stack, dropping next-day `35+` arms improved exact first-up from `19.6%` to `19.8%` and top-3 from `40.5%` to `40.9%`.
- The bigger value is on the subset where a heavy arm was already polluting the shortlist. That only hit `5.1%` of team-days, but on those days the top-2 cluster changed `40.7%` of the time after removal.
- This should become the root `E35` overlay on top of `E34 shadow`: remove heavy-use arms first, then let the model score the remaining bullpen depth instead of treating yesterday's bulk arm as normally available.
