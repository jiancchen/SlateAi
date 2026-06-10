# Tennis Date Readiness Audit

Generated: `2026-06-10T08:20:08.420420+00:00`

DB: `data-private/warehouse/sports/tennis/sql-tennis.db`

Scope: `2026-06-07` to `2026-06-09`

## Summary

| Metric | Count |
| --- | --- |
| Dates | 3 |
| Usable | 0 |
| Usable with warnings | 1 |
| Blocked | 2 |
| Invalid date values | 0 |
| Far-future date values | 0 |
| Future date values | 0 |
| Canonical matches | 111 |
| Quarantine matches | 154 |
| Prediction rows | 162 |
| Settlement rows | 0 |

## Dates

| Date | Date status | Readiness | Matches | Canonical | Quarantine | Resolved markets | Market gaps | Pred rows | Settlements | Blockers |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 2026-06-07 | valid | blocked | 152 | 57 | 88 | 0 | 74 | 81 | 0 | non_tennislive_match_shapes_present, market_identity_gaps_present, only_forensic_or_quarantine_predictions, no_settlement_rows_for_prediction_runs |
| 2026-06-08 | valid | blocked | 106 | 40 | 66 | 58 | 110 | 81 | 0 | non_tennislive_match_shapes_present, market_identity_gaps_present, only_forensic_or_quarantine_predictions, prediction_rows_without_db_match, no_settlement_rows_for_prediction_runs |
| 2026-06-09 | valid | usable_with_warnings | 14 | 14 | 0 | 0 | 0 | 0 | 0 |  |

## Notes

- This report is read-only and uses temporary views from `tennis_canonical_audit_views.sql`.
- `blocked` means the date should not feed model design or public prediction exports without human review.
- Source freshness is reported as a warning because historical analysis may use stale-but-provenanced rows differently than current publish.
