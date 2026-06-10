# Tennis Source Freshness Audit

Generated: `2026-06-10T08:26:20.573779+00:00`

DB: `data-private/warehouse/sports/tennis/sql-tennis.db`

Scope: `beginning` to `end`

## Summary

| Metric | Count |
| --- | --- |
| Dates | 91 |
| Sources per date | 5 |
| Date/source slots | 455 |
| Current-publish-ready dates | 0 |
| Current-publish-blocked dates | 91 |
| Fresh source slots | 0 |
| Stale source slots | 17 |
| Failed source slots | 0 |
| Missing source slots | 438 |

## Source Coverage

| Source | Family | Fresh | Stale | Failed | Missing |
| --- | --- | --- | --- | --- | --- |
| tennis_flashscore_stats | match-stats | 0 | 2 | 0 | 89 |
| tennis_odds | markets | 0 | 6 | 0 | 85 |
| tennis_player_context | player-context | 0 | 2 | 0 | 89 |
| tennis_rankings | rankings | 0 | 4 | 0 | 87 |
| tennislive | player-context | 0 | 3 | 0 | 88 |

## Dates

| Date | Publish ready | Fresh | Missing | Failed | Stale |
| --- | --- | --- | --- | --- | --- |
| 2000-03-06 | False | 0 | tennis_flashscore_stats, tennis_odds, tennis_player_context, tennis_rankings, tennislive |  |  |
| 2001-01-29 | False | 0 | tennis_flashscore_stats, tennis_odds, tennis_player_context, tennis_rankings, tennislive |  |  |
| 2025-07-13 | False | 0 | tennis_flashscore_stats, tennis_odds, tennis_player_context, tennis_rankings, tennislive |  |  |
| 2025-08-11 | False | 0 | tennis_flashscore_stats, tennis_odds, tennis_player_context, tennis_rankings, tennislive |  |  |
| 2025-08-18 | False | 0 | tennis_flashscore_stats, tennis_odds, tennis_player_context, tennis_rankings, tennislive |  |  |
| 2025-08-21 | False | 0 | tennis_flashscore_stats, tennis_odds, tennis_player_context, tennis_rankings, tennislive |  |  |
| 2025-09-07 | False | 0 | tennis_flashscore_stats, tennis_odds, tennis_player_context, tennis_rankings, tennislive |  |  |
| 2025-09-08 | False | 0 | tennis_flashscore_stats, tennis_odds, tennis_player_context, tennis_rankings, tennislive |  |  |
| 2025-09-12 | False | 0 | tennis_flashscore_stats, tennis_odds, tennis_player_context, tennis_rankings, tennislive |  |  |
| 2025-09-19 | False | 0 | tennis_flashscore_stats, tennis_odds, tennis_player_context, tennis_rankings, tennislive |  |  |
| 2025-09-23 | False | 0 | tennis_flashscore_stats, tennis_odds, tennis_player_context, tennis_rankings, tennislive |  |  |
| 2025-10-29 | False | 0 | tennis_flashscore_stats, tennis_odds, tennis_player_context, tennis_rankings, tennislive |  |  |
| 2025-10-31 | False | 0 | tennis_flashscore_stats, tennis_odds, tennis_player_context, tennis_rankings, tennislive |  |  |
| 2025-11-04 | False | 0 | tennis_flashscore_stats, tennis_odds, tennis_player_context, tennis_rankings, tennislive |  |  |
| 2025-11-06 | False | 0 | tennis_flashscore_stats, tennis_odds, tennis_player_context, tennis_rankings, tennislive |  |  |
| 2025-11-12 | False | 0 | tennis_flashscore_stats, tennis_odds, tennis_player_context, tennis_rankings, tennislive |  |  |
| 2025-11-24 | False | 0 | tennis_flashscore_stats, tennis_odds, tennis_player_context, tennis_rankings, tennislive |  |  |
| 2025-12-21 | False | 0 | tennis_flashscore_stats, tennis_odds, tennis_player_context, tennis_rankings, tennislive |  |  |
| 2025-12-22 | False | 0 | tennis_flashscore_stats, tennis_odds, tennis_player_context, tennis_rankings, tennislive |  |  |
| 2025-12-23 | False | 0 | tennis_flashscore_stats, tennis_odds, tennis_player_context, tennis_rankings, tennislive |  |  |
| 2026-01-09 | False | 0 | tennis_flashscore_stats, tennis_odds, tennis_player_context, tennis_rankings, tennislive |  |  |
| 2026-01-12 | False | 0 | tennis_flashscore_stats, tennis_odds, tennis_player_context, tennis_rankings, tennislive |  |  |
| 2026-01-13 | False | 0 | tennis_flashscore_stats, tennis_odds, tennis_player_context, tennis_rankings, tennislive |  |  |
| 2026-02-24 | False | 0 | tennis_flashscore_stats, tennis_odds, tennis_player_context, tennis_rankings, tennislive |  |  |
| 2026-03-03 | False | 0 | tennis_flashscore_stats, tennis_odds, tennis_player_context, tennis_rankings, tennislive |  |  |
| 2026-03-08 | False | 0 | tennis_flashscore_stats, tennis_odds, tennis_player_context, tennis_rankings, tennislive |  |  |
| 2026-03-16 | False | 0 | tennis_flashscore_stats, tennis_odds, tennis_player_context, tennis_rankings, tennislive |  |  |
| 2026-03-17 | False | 0 | tennis_flashscore_stats, tennis_odds, tennis_player_context, tennis_rankings, tennislive |  |  |
| 2026-03-18 | False | 0 | tennis_flashscore_stats, tennis_odds, tennis_player_context, tennis_rankings, tennislive |  |  |
| 2026-03-19 | False | 0 | tennis_flashscore_stats, tennis_odds, tennis_player_context, tennis_rankings, tennislive |  |  |
| 2026-03-24 | False | 0 | tennis_flashscore_stats, tennis_odds, tennis_player_context, tennis_rankings, tennislive |  |  |
| 2026-04-01 | False | 0 | tennis_flashscore_stats, tennis_odds, tennis_player_context, tennis_rankings, tennislive |  |  |
| 2026-04-05 | False | 0 | tennis_flashscore_stats, tennis_odds, tennis_player_context, tennis_rankings, tennislive |  |  |
| 2026-04-07 | False | 0 | tennis_flashscore_stats, tennis_odds, tennis_player_context, tennis_rankings, tennislive |  |  |
| 2026-04-11 | False | 0 | tennis_flashscore_stats, tennis_odds, tennis_player_context, tennis_rankings, tennislive |  |  |
| 2026-04-13 | False | 0 | tennis_flashscore_stats, tennis_odds, tennis_player_context, tennis_rankings, tennislive |  |  |
| 2026-04-14 | False | 0 | tennis_flashscore_stats, tennis_odds, tennis_player_context, tennis_rankings, tennislive |  |  |
| 2026-04-15 | False | 0 | tennis_flashscore_stats, tennis_odds, tennis_player_context, tennis_rankings, tennislive |  |  |
| 2026-04-20 | False | 0 | tennis_flashscore_stats, tennis_odds, tennis_player_context, tennis_rankings, tennislive |  |  |
| 2026-04-21 | False | 0 | tennis_flashscore_stats, tennis_odds, tennis_player_context, tennis_rankings, tennislive |  |  |
| 2026-04-22 | False | 0 | tennis_flashscore_stats, tennis_odds, tennis_player_context, tennis_rankings, tennislive |  |  |
| 2026-04-23 | False | 0 | tennis_flashscore_stats, tennis_odds, tennis_player_context, tennis_rankings, tennislive |  |  |
| 2026-04-24 | False | 0 | tennis_flashscore_stats, tennis_odds, tennis_player_context, tennis_rankings, tennislive |  |  |
| 2026-04-25 | False | 0 | tennis_flashscore_stats, tennis_odds, tennis_player_context, tennis_rankings, tennislive |  |  |
| 2026-04-27 | False | 0 | tennis_flashscore_stats, tennis_odds, tennis_player_context, tennis_rankings, tennislive |  |  |
| 2026-04-28 | False | 0 | tennis_flashscore_stats, tennis_odds, tennis_player_context, tennis_rankings, tennislive |  |  |
| 2026-04-29 | False | 0 | tennis_flashscore_stats, tennis_odds, tennis_player_context, tennis_rankings, tennislive |  |  |
| 2026-04-30 | False | 0 | tennis_flashscore_stats, tennis_odds, tennis_player_context, tennis_rankings, tennislive |  |  |
| 2026-05-01 | False | 0 | tennis_flashscore_stats, tennis_odds, tennis_player_context, tennis_rankings, tennislive |  |  |
| 2026-05-02 | False | 0 | tennis_flashscore_stats, tennis_odds, tennis_player_context, tennis_rankings, tennislive |  |  |
| 2026-05-03 | False | 0 | tennis_flashscore_stats, tennis_odds, tennis_player_context, tennis_rankings, tennislive |  |  |
| 2026-05-04 | False | 0 | tennis_flashscore_stats, tennis_odds, tennis_player_context, tennis_rankings, tennislive |  |  |
| 2026-05-05 | False | 0 | tennis_flashscore_stats, tennis_odds, tennis_player_context, tennis_rankings, tennislive |  |  |
| 2026-05-06 | False | 0 | tennis_flashscore_stats, tennis_odds, tennis_player_context, tennis_rankings, tennislive |  |  |
| 2026-05-07 | False | 0 | tennis_flashscore_stats, tennis_odds, tennis_player_context, tennis_rankings, tennislive |  |  |
| 2026-05-08 | False | 0 | tennis_flashscore_stats, tennis_odds, tennis_player_context, tennis_rankings, tennislive |  |  |
| 2026-05-09 | False | 0 | tennis_flashscore_stats, tennis_odds, tennis_player_context, tennis_rankings, tennislive |  |  |
| 2026-05-10 | False | 0 | tennis_flashscore_stats, tennis_odds, tennis_player_context, tennis_rankings, tennislive |  |  |
| 2026-05-11 | False | 0 | tennis_flashscore_stats, tennis_odds, tennis_player_context, tennis_rankings, tennislive |  |  |
| 2026-05-12 | False | 0 | tennis_flashscore_stats, tennis_odds, tennis_player_context, tennis_rankings, tennislive |  |  |
| 2026-05-13 | False | 0 | tennis_flashscore_stats, tennis_odds, tennis_player_context, tennis_rankings, tennislive |  |  |
| 2026-05-14 | False | 0 | tennis_flashscore_stats, tennis_odds, tennis_player_context, tennis_rankings, tennislive |  |  |
| 2026-05-15 | False | 0 | tennis_flashscore_stats, tennis_odds, tennis_player_context, tennis_rankings, tennislive |  |  |
| 2026-05-16 | False | 0 | tennis_flashscore_stats, tennis_odds, tennis_player_context, tennis_rankings, tennislive |  |  |
| 2026-05-17 | False | 0 | tennis_flashscore_stats, tennis_odds, tennis_player_context, tennis_rankings, tennislive |  |  |
| 2026-05-18 | False | 0 | tennis_flashscore_stats, tennis_odds, tennis_player_context, tennis_rankings, tennislive |  |  |
| 2026-05-19 | False | 0 | tennis_flashscore_stats, tennis_odds, tennis_player_context, tennis_rankings, tennislive |  |  |
| 2026-05-20 | False | 0 | tennis_flashscore_stats, tennis_odds, tennis_player_context, tennis_rankings, tennislive |  |  |
| 2026-05-21 | False | 0 | tennis_flashscore_stats, tennis_odds, tennis_player_context, tennis_rankings, tennislive |  |  |
| 2026-05-22 | False | 0 | tennis_flashscore_stats, tennis_odds, tennis_player_context, tennis_rankings, tennislive |  |  |
| 2026-05-23 | False | 0 | tennis_flashscore_stats, tennis_odds, tennis_player_context, tennis_rankings, tennislive |  |  |
| 2026-05-24 | False | 0 | tennis_flashscore_stats, tennis_odds, tennis_player_context, tennis_rankings, tennislive |  |  |
| 2026-05-25 | False | 0 | tennis_flashscore_stats, tennis_odds, tennis_player_context, tennis_rankings, tennislive |  |  |
| 2026-05-26 | False | 0 | tennis_flashscore_stats, tennis_odds, tennis_player_context, tennis_rankings, tennislive |  |  |
| 2026-05-27 | False | 0 | tennis_flashscore_stats, tennis_odds, tennis_player_context, tennis_rankings, tennislive |  |  |
| 2026-05-28 | False | 0 | tennis_flashscore_stats, tennis_odds, tennis_player_context, tennis_rankings, tennislive |  |  |
| 2026-05-29 | False | 0 | tennis_flashscore_stats, tennis_odds, tennis_player_context, tennis_rankings, tennislive |  |  |
| 2026-05-30 | False | 0 | tennis_flashscore_stats, tennis_odds, tennis_player_context, tennis_rankings, tennislive |  |  |
| 2026-05-31 | False | 0 | tennis_flashscore_stats, tennis_odds, tennis_player_context, tennis_rankings, tennislive |  |  |
| 2026-06-01 | False | 0 | tennis_flashscore_stats, tennis_odds, tennis_player_context, tennis_rankings, tennislive |  |  |
| 2026-06-02 | False | 0 | tennislive |  | tennis_flashscore_stats, tennis_odds, tennis_player_context, tennis_rankings |
| 2026-06-03 | False | 0 | tennis_flashscore_stats, tennis_odds, tennis_player_context, tennis_rankings, tennislive |  |  |
| 2026-06-04 | False | 0 | tennis_rankings, tennislive |  | tennis_flashscore_stats, tennis_odds, tennis_player_context |
| 2026-06-05 | False | 0 | tennis_flashscore_stats, tennis_player_context, tennis_rankings, tennislive |  | tennis_odds |
| 2026-06-06 | False | 0 | tennis_flashscore_stats, tennis_player_context, tennis_rankings |  | tennis_odds, tennislive |
| 2026-06-07 | False | 0 | tennis_flashscore_stats, tennis_player_context |  | tennis_odds, tennis_rankings, tennislive |
| 2026-06-08 | False | 0 | tennis_flashscore_stats, tennis_player_context |  | tennis_odds, tennis_rankings, tennislive |
| 2026-06-09 | False | 0 | tennis_flashscore_stats, tennis_odds, tennis_player_context, tennislive |  | tennis_rankings |
| 2099-02-12 | False | 0 | tennis_flashscore_stats, tennis_odds, tennis_player_context, tennis_rankings, tennislive |  |  |
| 2099-04-02 | False | 0 | tennis_flashscore_stats, tennis_odds, tennis_player_context, tennis_rankings, tennislive |  |  |
| unknown | False | 0 | tennis_flashscore_stats, tennis_odds, tennis_player_context, tennis_rankings, tennislive |  |  |

## Notes

- This report is read-only and uses `source_fetch_policies` plus `source_fetch_status`.
- Freshness is evaluated against the report generation time for current-publish eligibility.
- Historical research may treat stale-but-successful source rows differently, but stale rows must not pass current publish readiness.
