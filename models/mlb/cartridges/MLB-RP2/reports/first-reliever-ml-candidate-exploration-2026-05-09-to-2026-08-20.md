# First Reliever ML Candidate Exploration

Window: `2026-05-09` to `2026-08-20`

## Dataset

- Team-games: 887
- Candidate rows: 7267
- Avg candidates/team-game: 8.19
- Actual first reliever in prior pool: 80.7%
- Forced actual rows: 171
- Missing entry-state games: 0

## Chronological Test

Split date: `2026-06-02`

| Model | Top 1 | Top 2 | Top 3 |
| --- | ---: | ---: | ---: |
| gradient_boosting | 35.5% | 48.0% | 66.4% |
| random_forest | 38.7% | 50.0% | 64.8% |

## Baselines

```json
{
  "pool_usage_score": {
    "games": 256,
    "top1": 17.6,
    "top2": 32.0,
    "top3": 43.4
  },
  "first_up_recency": {
    "games": 256,
    "top1": 15.6,
    "top2": 30.1,
    "top3": 38.7
  }
}
```

## Feature Direction

This is a conditional first-reliever model. It uses actual starter-exit game state for research:
inning, score margin, base state, outs, batter side, starter outs/pitches, candidate rest,
recent first-up usage, same-starter history, and candidate state-affinity counts.

For pregame use, M2 should feed this model simulated or expected starter-exit states rather than
postgame truth.

Training rows CSV: `data-private/model-training/mlb/first-reliever-ml-candidate-exploration-2026-05-09-to-2026-08-20.csv`
