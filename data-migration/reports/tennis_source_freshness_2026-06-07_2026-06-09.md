# Tennis Source Freshness Audit

Generated: `2026-06-10T08:26:20.573781+00:00`

DB: `data-private/warehouse/sports/tennis/sql-tennis.db`

Scope: `2026-06-07` to `2026-06-09`

## Summary

| Metric | Count |
| --- | --- |
| Dates | 3 |
| Sources per date | 5 |
| Date/source slots | 15 |
| Current-publish-ready dates | 0 |
| Current-publish-blocked dates | 3 |
| Fresh source slots | 0 |
| Stale source slots | 7 |
| Failed source slots | 0 |
| Missing source slots | 8 |

## Source Coverage

| Source | Family | Fresh | Stale | Failed | Missing |
| --- | --- | --- | --- | --- | --- |
| tennis_flashscore_stats | match-stats | 0 | 0 | 0 | 3 |
| tennis_odds | markets | 0 | 2 | 0 | 1 |
| tennis_player_context | player-context | 0 | 0 | 0 | 3 |
| tennis_rankings | rankings | 0 | 3 | 0 | 0 |
| tennislive | player-context | 0 | 2 | 0 | 1 |

## Dates

| Date | Publish ready | Fresh | Missing | Failed | Stale |
| --- | --- | --- | --- | --- | --- |
| 2026-06-07 | False | 0 | tennis_flashscore_stats, tennis_player_context |  | tennis_odds, tennis_rankings, tennislive |
| 2026-06-08 | False | 0 | tennis_flashscore_stats, tennis_player_context |  | tennis_odds, tennis_rankings, tennislive |
| 2026-06-09 | False | 0 | tennis_flashscore_stats, tennis_odds, tennis_player_context, tennislive |  | tennis_rankings |

## Notes

- This report is read-only and uses `source_fetch_policies` plus `source_fetch_status`.
- Freshness is evaluated against the report generation time for current-publish eligibility.
- Historical research may treat stale-but-successful source rows differently, but stale rows must not pass current publish readiness.
