# Tennis Data Shape Audit

Generated: `2026-06-10T07:33:37.822068+00:00`

DB: `data-private/warehouse/sports/tennis/sql-tennis.db`

## Bucket Summary

| Bucket | Metric | Count |
| --- | --- | --- |
| canonical | TennisLive match candidates | 1167 |
| needs_review | Participant anomaly matches | 38 |
| needs_review | Missing start-time matches | 1576 |
| quarantine | Non-TennisLive match shapes | 536 |
| quarantine | TEN-T0 market-only prediction rows | 71 |
| quarantine | Market duplicate groups | 109 |
| quarantine | Stat duplicate groups | 68526 |
| model_output | Prediction rows | 776 |
| model_output | Settlement rows | 0 |

## Match Shape

| Metric | Count |
| --- | --- |
| Total matches | 1755 |
| TennisLive-attached matches | 1219 |
| Canonical TennisLive candidates | 1167 |
| Non-TennisLive match shapes | 536 |
| Missing start time | 1576 |
| Missing status | 352 |
| Participant anomalies | 38 |

### Match ID Prefixes

| Prefix | Matches |
| --- | --- |
| tl | 1245 |
| rg | 256 |
| rh | 136 |
| dk | 84 |
| rgq | 16 |
| atp | 4 |
| geneva | 4 |
| hamburg | 4 |
| strasbourg | 4 |
| wta | 2 |

## Market Shape

| Source | Rows | Missing match | Missing player | Missing price |
| --- | --- | --- | --- | --- |
| draftkings | 939 | 0 | 296 | 0 |
| kalshi | 751 | 186 | 187 | 0 |
| robinhood | 364 | 0 | 0 | 0 |
| FanDuel Sportsbook | 150 | 0 | 0 | 0 |
| Prediction market screenshot | 136 | 0 | 0 | 0 |
| Robinhood prediction market | 132 | 0 | 0 | 0 |
| fanduel | 104 | 0 | 24 | 0 |
| Kalshi open orderbook | 32 | 0 | 0 | 0 |

Market duplicate groups: `109`

## Stat Shape

| Source | Rows | Missing match | Missing player |
| --- | --- | --- | --- |
| flashscore | 336376 | 0 | 0 |
| sofascore | 91072 | 0 | 0 |
| tennislive | 17520 | 0 | 0 |

Stat duplicate groups: `68526`

## Prediction Outputs

| Lane | Market type | Rows |
| --- | --- | --- |
| ml | match_winner | 728 |
| first_set_ou | first_set_total_games | 16 |
| match_ou | match_total_games | 16 |
| spread | game_spread | 16 |

### TEN-T0 Runs

| Model run | Rows | Market-only true | Rows with EV |
| --- | --- | --- | --- |
| tennis-TEN-T0-2026-06-07-db | 81 | 22 | 0 |
| tennis-TEN-T0-2026-06-08-db | 81 | 46 | 0 |
| tennis-TEN-T0-2026-06-02-db | 66 | 1 | 0 |
| tennis-TEN-T0-2026-06-04-db | 23 | 2 | 0 |

## Largest Tables

| Classification | Table | Rows |
| --- | --- | --- |
| legacy | legacy_table_rows | 484024 |
| canonical_core_or_sidecar | match_stat_rows | 444968 |
| canonical_core_or_sidecar | replay_points | 208627 |
| source_native_tennislive | tennislive_match_replay_points | 169668 |
| archived_or_secondary_source | tennis_flashscore_player_stat_rows | 153712 |
| market | market_price_ticks | 131612 |
| archived_or_secondary_source | tennis_flashscore_stat_rows | 76856 |
| source_native_tennislive | tennislive_player_surface_records | 70091 |
| source_native_tennislive | tennislive_form_chart_points | 62395 |
| canonical_core_or_sidecar | replay_games | 31889 |
| source_native_tennislive | tennislive_match_replay_games | 24715 |
| canonical_core_or_sidecar | recent_matches | 12110 |
| identity_governance | entity_aliases | 7672 |
| source_native_tennislive | tennislive_player_match_links | 7344 |
| canonical_core_or_sidecar | players | 5577 |
| identity_governance | player_identity_registry | 5562 |
| provenance | source_snapshots | 4880 |
| identity_governance | entity_alias_governance | 4443 |
| canonical_core_or_sidecar | rankings | 4413 |
| other | player_form_snapshots | 3580 |
| canonical_core_or_sidecar | match_players | 3551 |
| canonical_core_or_sidecar | service_pressure_snapshots | 2705 |
| market | market_snapshots | 2608 |
| source_native_tennislive | tennislive_match_player_snapshots | 2162 |
| archived_or_secondary_source | tennis_flashscore_recent_links | 2121 |
| canonical_core_or_sidecar | matches | 1755 |
| identity_governance | entity_alias_review_candidates | 1706 |
| source_native_tennislive | tennislive_h2h_source_rows | 1624 |
| archived_or_secondary_source | tennis_flashscore_match_stats | 1279 |
| source_native_tennislive | tennislive_match_summaries | 1245 |

## Next Review

- Review participant anomaly examples in the JSON report.
- Decide which non-TennisLive match shapes are historical context vs quarantine.
- Separate market-watch rows from prediction rows before any future model work.
- Add preflight/export status checks so `ready` cannot ignore blocked source freshness.
