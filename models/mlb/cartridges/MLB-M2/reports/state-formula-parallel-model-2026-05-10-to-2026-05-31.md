# MLB-M2 State Formula Parallel Model

Range: 2026-05-10 to 2026-05-31

This is a research baseline that trains simple models on the same pregame state/formula inputs M2 wants to publish. It is not a betting engine.

## Coverage

- Rows: 123
- Dates: 2026-05-23, 2026-05-24, 2026-05-25, 2026-05-26, 2026-05-27, 2026-05-28, 2026-05-29, 2026-05-30, 2026-05-31

## Training Rows

- Export: `data-private/model-training/mlb-m2-state-formula-training-rows-2026-05-10-to-2026-05-31.csv`

## Forced Projection Baseline

- F5 O/U side: 0.602 on 123 rows
- Full-game O/U side: 0.512 on 123 rows

## Walk-Forward Models

| Target | Model | Rows | Accuracy |
| --- | --- | ---: | ---: |
| f5_over | rf | 81 | 0.494 |
| f5_over | gb | 81 | 0.494 |
| full_over | rf | 81 | 0.444 |
| full_over | gb | 81 | 0.407 |
| f5_story | rf_story | 81 | 0.42 |

## Interpretation

- This should run in parallel with formula outputs, not replace them.
- If the trained model beats the formula on a date, inspect the feature drivers and promote the mechanism only if it makes baseball sense.
- If the formula beats the trained model, keep the formula and add the missing learned feature only after walk-forward proof.
- MAE is secondary. O/U side correctness and story-bucket correctness are the headline checks.