# Tennis Date Readiness Audit

Generated: `2026-06-10T08:20:08.420418+00:00`

DB: `data-private/warehouse/sports/tennis/sql-tennis.db`

Scope: `beginning` to `end`

## Summary

| Metric | Count |
| --- | --- |
| Dates | 91 |
| Usable | 0 |
| Usable with warnings | 71 |
| Blocked | 20 |
| Invalid date values | 1 |
| Far-future date values | 2 |
| Future date values | 0 |
| Canonical matches | 1173 |
| Quarantine matches | 544 |
| Prediction rows | 776 |
| Settlement rows | 0 |

## Dates

| Date | Date status | Readiness | Matches | Canonical | Quarantine | Resolved markets | Market gaps | Pred rows | Settlements | Blockers |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 2000-03-06 | valid | usable_with_warnings | 1 | 1 | 0 | 0 | 0 | 0 | 0 |  |
| 2001-01-29 | valid | usable_with_warnings | 2 | 2 | 0 | 0 | 0 | 0 | 0 |  |
| 2025-07-13 | valid | usable_with_warnings | 1 | 1 | 0 | 0 | 0 | 0 | 0 |  |
| 2025-08-11 | valid | usable_with_warnings | 1 | 1 | 0 | 0 | 0 | 0 | 0 |  |
| 2025-08-18 | valid | usable_with_warnings | 1 | 1 | 0 | 0 | 0 | 0 | 0 |  |
| 2025-08-21 | valid | usable_with_warnings | 1 | 1 | 0 | 0 | 0 | 0 | 0 |  |
| 2025-09-07 | valid | usable_with_warnings | 2 | 2 | 0 | 0 | 0 | 0 | 0 |  |
| 2025-09-08 | valid | usable_with_warnings | 1 | 1 | 0 | 0 | 0 | 0 | 0 |  |
| 2025-09-12 | valid | usable_with_warnings | 1 | 1 | 0 | 0 | 0 | 0 | 0 |  |
| 2025-09-19 | valid | usable_with_warnings | 1 | 1 | 0 | 0 | 0 | 0 | 0 |  |
| 2025-09-23 | valid | usable_with_warnings | 1 | 1 | 0 | 0 | 0 | 0 | 0 |  |
| 2025-10-29 | valid | usable_with_warnings | 1 | 1 | 0 | 0 | 0 | 0 | 0 |  |
| 2025-10-31 | valid | usable_with_warnings | 1 | 1 | 0 | 0 | 0 | 0 | 0 |  |
| 2025-11-04 | valid | usable_with_warnings | 1 | 1 | 0 | 0 | 0 | 0 | 0 |  |
| 2025-11-06 | valid | usable_with_warnings | 1 | 1 | 0 | 0 | 0 | 0 | 0 |  |
| 2025-11-12 | valid | usable_with_warnings | 1 | 1 | 0 | 0 | 0 | 0 | 0 |  |
| 2025-11-24 | valid | usable_with_warnings | 2 | 2 | 0 | 0 | 0 | 0 | 0 |  |
| 2025-12-21 | valid | usable_with_warnings | 1 | 1 | 0 | 0 | 0 | 0 | 0 |  |
| 2025-12-22 | valid | usable_with_warnings | 1 | 1 | 0 | 0 | 0 | 0 | 0 |  |
| 2025-12-23 | valid | usable_with_warnings | 1 | 1 | 0 | 0 | 0 | 0 | 0 |  |
| 2026-01-09 | valid | usable_with_warnings | 1 | 1 | 0 | 0 | 0 | 0 | 0 |  |
| 2026-01-12 | valid | usable_with_warnings | 1 | 1 | 0 | 0 | 0 | 0 | 0 |  |
| 2026-01-13 | valid | usable_with_warnings | 1 | 1 | 0 | 0 | 0 | 0 | 0 |  |
| 2026-02-24 | valid | usable_with_warnings | 1 | 1 | 0 | 0 | 0 | 0 | 0 |  |
| 2026-03-03 | valid | usable_with_warnings | 1 | 1 | 0 | 0 | 0 | 0 | 0 |  |
| 2026-03-08 | valid | usable_with_warnings | 1 | 1 | 0 | 0 | 0 | 0 | 0 |  |
| 2026-03-16 | valid | usable_with_warnings | 1 | 1 | 0 | 0 | 0 | 0 | 0 |  |
| 2026-03-17 | valid | usable_with_warnings | 1 | 1 | 0 | 0 | 0 | 0 | 0 |  |
| 2026-03-18 | valid | usable_with_warnings | 1 | 1 | 0 | 0 | 0 | 0 | 0 |  |
| 2026-03-19 | valid | usable_with_warnings | 1 | 1 | 0 | 0 | 0 | 0 | 0 |  |
| 2026-03-24 | valid | usable_with_warnings | 2 | 2 | 0 | 0 | 0 | 0 | 0 |  |
| 2026-04-01 | valid | usable_with_warnings | 1 | 1 | 0 | 0 | 0 | 0 | 0 |  |
| 2026-04-05 | valid | usable_with_warnings | 1 | 1 | 0 | 0 | 0 | 0 | 0 |  |
| 2026-04-07 | valid | usable_with_warnings | 2 | 2 | 0 | 0 | 0 | 0 | 0 |  |
| 2026-04-11 | valid | usable_with_warnings | 1 | 1 | 0 | 0 | 0 | 0 | 0 |  |
| 2026-04-13 | valid | usable_with_warnings | 1 | 1 | 0 | 0 | 0 | 0 | 0 |  |
| 2026-04-14 | valid | usable_with_warnings | 4 | 4 | 0 | 0 | 0 | 0 | 0 |  |
| 2026-04-15 | valid | usable_with_warnings | 2 | 2 | 0 | 0 | 0 | 0 | 0 |  |
| 2026-04-20 | valid | usable_with_warnings | 2 | 2 | 0 | 0 | 0 | 0 | 0 |  |
| 2026-04-21 | valid | usable_with_warnings | 1 | 1 | 0 | 0 | 0 | 0 | 0 |  |
| 2026-04-22 | valid | usable_with_warnings | 3 | 3 | 0 | 0 | 0 | 0 | 0 |  |
| 2026-04-23 | valid | usable_with_warnings | 6 | 6 | 0 | 0 | 0 | 0 | 0 |  |
| 2026-04-24 | valid | usable_with_warnings | 1 | 1 | 0 | 0 | 0 | 0 | 0 |  |
| 2026-04-25 | valid | usable_with_warnings | 1 | 1 | 0 | 0 | 0 | 0 | 0 |  |
| 2026-04-27 | valid | usable_with_warnings | 3 | 3 | 0 | 0 | 0 | 0 | 0 |  |
| 2026-04-28 | valid | usable_with_warnings | 7 | 7 | 0 | 0 | 0 | 0 | 0 |  |
| 2026-04-29 | valid | usable_with_warnings | 4 | 4 | 0 | 0 | 0 | 0 | 0 |  |
| 2026-04-30 | valid | usable_with_warnings | 6 | 6 | 0 | 0 | 0 | 0 | 0 |  |
| 2026-05-01 | valid | usable_with_warnings | 5 | 5 | 0 | 0 | 0 | 0 | 0 |  |
| 2026-05-02 | valid | usable_with_warnings | 4 | 4 | 0 | 0 | 0 | 0 | 0 |  |
| 2026-05-03 | valid | usable_with_warnings | 1 | 1 | 0 | 0 | 0 | 0 | 0 |  |
| 2026-05-04 | valid | usable_with_warnings | 6 | 6 | 0 | 0 | 0 | 0 | 0 |  |
| 2026-05-05 | valid | usable_with_warnings | 18 | 18 | 0 | 0 | 0 | 0 | 0 |  |
| 2026-05-06 | valid | usable_with_warnings | 6 | 6 | 0 | 0 | 0 | 0 | 0 |  |
| 2026-05-07 | valid | usable_with_warnings | 16 | 16 | 0 | 0 | 0 | 0 | 0 |  |
| 2026-05-08 | valid | usable_with_warnings | 14 | 14 | 0 | 0 | 0 | 0 | 0 |  |
| 2026-05-09 | valid | usable_with_warnings | 5 | 4 | 0 | 0 | 0 | 0 | 0 |  |
| 2026-05-10 | valid | usable_with_warnings | 10 | 9 | 0 | 0 | 0 | 0 | 0 |  |
| 2026-05-11 | valid | usable_with_warnings | 24 | 24 | 0 | 0 | 0 | 0 | 0 |  |
| 2026-05-12 | valid | usable_with_warnings | 22 | 22 | 0 | 0 | 0 | 0 | 0 |  |
| 2026-05-13 | valid | usable_with_warnings | 27 | 27 | 0 | 0 | 0 | 0 | 0 |  |
| 2026-05-14 | valid | usable_with_warnings | 25 | 25 | 0 | 0 | 0 | 0 | 0 |  |
| 2026-05-15 | valid | usable_with_warnings | 11 | 11 | 0 | 0 | 0 | 0 | 0 |  |
| 2026-05-16 | valid | usable_with_warnings | 14 | 14 | 0 | 0 | 0 | 0 | 0 |  |
| 2026-05-17 | valid | usable_with_warnings | 18 | 18 | 0 | 0 | 0 | 0 | 0 |  |
| 2026-05-18 | valid | usable_with_warnings | 42 | 41 | 0 | 0 | 0 | 0 | 0 |  |
| 2026-05-19 | valid | usable_with_warnings | 47 | 46 | 0 | 0 | 0 | 0 | 0 |  |
| 2026-05-20 | valid | usable_with_warnings | 51 | 51 | 0 | 0 | 0 | 0 | 0 |  |
| 2026-05-21 | valid | blocked | 55 | 27 | 28 | 0 | 0 | 0 | 0 | non_tennislive_match_shapes_present |
| 2026-05-22 | valid | blocked | 39 | 17 | 22 | 0 | 0 | 0 | 0 | non_tennislive_match_shapes_present |
| 2026-05-23 | valid | usable_with_warnings | 11 | 11 | 0 | 0 | 0 | 0 | 0 |  |
| 2026-05-24 | valid | blocked | 70 | 33 | 36 | 0 | 0 | 0 | 0 | non_tennislive_match_shapes_present |
| 2026-05-25 | valid | blocked | 79 | 29 | 49 | 0 | 0 | 0 | 0 | non_tennislive_match_shapes_present |
| 2026-05-26 | valid | blocked | 83 | 43 | 40 | 0 | 0 | 40 | 0 | non_tennislive_match_shapes_present, only_forensic_or_quarantine_predictions, prediction_rows_without_db_match, no_settlement_rows_for_prediction_runs |
| 2026-05-27 | valid | blocked | 71 | 39 | 31 | 0 | 1 | 31 | 0 | non_tennislive_match_shapes_present, market_identity_gaps_present, only_forensic_or_quarantine_predictions, prediction_rows_without_db_match, no_settlement_rows_for_prediction_runs |
| 2026-05-28 | valid | blocked | 67 | 35 | 32 | 0 | 0 | 96 | 0 | non_tennislive_match_shapes_present, prediction_rows_without_db_match, no_settlement_rows_for_prediction_runs |
| 2026-05-29 | valid | blocked | 47 | 29 | 16 | 0 | 0 | 48 | 0 | non_tennislive_match_shapes_present, prediction_rows_without_db_match, no_settlement_rows_for_prediction_runs |
| 2026-05-30 | valid | blocked | 35 | 19 | 16 | 0 | 0 | 96 | 0 | non_tennislive_match_shapes_present, prediction_rows_without_db_match, no_settlement_rows_for_prediction_runs |
| 2026-05-31 | valid | blocked | 48 | 38 | 8 | 0 | 0 | 24 | 0 | non_tennislive_match_shapes_present, prediction_rows_without_db_match, no_settlement_rows_for_prediction_runs |
| 2026-06-01 | valid | blocked | 53 | 41 | 8 | 0 | 0 | 24 | 0 | non_tennislive_match_shapes_present, prediction_rows_without_db_match, no_settlement_rows_for_prediction_runs |
| 2026-06-02 | valid | blocked | 148 | 78 | 66 | 0 | 16 | 232 | 0 | non_tennislive_match_shapes_present, market_identity_gaps_present, prediction_rows_without_db_match, no_settlement_rows_for_prediction_runs |
| 2026-06-03 | valid | usable_with_warnings | 36 | 35 | 0 | 0 | 0 | 0 | 0 |  |
| 2026-06-04 | valid | blocked | 96 | 69 | 24 | 0 | 68 | 23 | 0 | non_tennislive_match_shapes_present, market_identity_gaps_present, only_forensic_or_quarantine_predictions, no_settlement_rows_for_prediction_runs |
| 2026-06-05 | valid | blocked | 60 | 52 | 4 | 0 | 24 | 0 | 0 | non_tennislive_match_shapes_present, market_identity_gaps_present |
| 2026-06-06 | valid | blocked | 34 | 20 | 10 | 10 | 28 | 0 | 0 | non_tennislive_match_shapes_present, market_identity_gaps_present |
| 2026-06-07 | valid | blocked | 152 | 57 | 88 | 0 | 74 | 81 | 0 | non_tennislive_match_shapes_present, market_identity_gaps_present, only_forensic_or_quarantine_predictions, no_settlement_rows_for_prediction_runs |
| 2026-06-08 | valid | blocked | 106 | 40 | 66 | 58 | 110 | 81 | 0 | non_tennislive_match_shapes_present, market_identity_gaps_present, only_forensic_or_quarantine_predictions, prediction_rows_without_db_match, no_settlement_rows_for_prediction_runs |
| 2026-06-09 | valid | usable_with_warnings | 14 | 14 | 0 | 0 | 0 | 0 | 0 |  |
| 2099-02-12 | far_future | blocked | 1 | 1 | 0 | 0 | 0 | 0 | 0 | far_future_date_value |
| 2099-04-02 | far_future | blocked | 1 | 1 | 0 | 0 | 0 | 0 | 0 | far_future_date_value |
| unknown | invalid | blocked | 2 | 2 | 0 | 0 | 0 | 0 | 0 | invalid_date_value |

## Notes

- This report is read-only and uses temporary views from `tennis_canonical_audit_views.sql`.
- `blocked` means the date should not feed model design or public prediction exports without human review.
- Source freshness is reported as a warning because historical analysis may use stale-but-provenanced rows differently than current publish.
