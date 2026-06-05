# TennisLive Warehouse Mapping

## Goal

TennisLive is treated as a primary deep tennis source. The warehouse stores raw TennisLive HTML snapshots first, then projects parsed data into source-native TennisLive tables and canonical typed tennis tables.

The core invariant is:

- every fetched TennisLive URL creates or reuses a `source_snapshots` row
- every player page maps to one internal `players.player_id`
- every match page maps to one internal `matches.match_id`
- parsed TennisLive data is stored source-native and, where possible, normalized into canonical tables
- unchanged pages are skipped by content hash unless the ingestor is run with `--force`

## Source Snapshot Layer

| TennisLive artifact | Stored in |
| --- | --- |
| Player page HTML | `source_snapshots`, local file under `data-private/reference/tennis/tennislive/player/` |
| Match page HTML | `source_snapshots`, local file under `data-private/reference/tennis/tennislive/match/` |
| URL/content hash/last ingestion | `tennislive_player_sources`, `tennislive_match_sources` |

## Player Page Mapping

Example page: `https://www.tennislive.net/atp/carlos-alcaraz-garfia/`

| TennisLive field | Warehouse target |
| --- | --- |
| Name | `players.name`, `players.canonical_name`, `tennislive_player_profiles.name` |
| Country | `players.country`, `tennislive_player_profiles.country` |
| Birthdate | `players.birth_date` when available, `tennislive_player_profiles.birthdate` |
| ATP/WTA ranking | `tennislive_player_profiles.current_ranking` |
| TOP ranking position/date/points | `tennislive_player_profiles.top_ranking`, `top_ranking_date`, `top_ranking_points` |
| Points | `tennislive_player_profiles.points` |
| Prize money | `tennislive_player_profiles.prize_money` |
| Matches total / wins / win % | `tennislive_player_profiles.matches_total`, `wins`, `losses`, `win_pct` |
| Year/surface record table | `tennislive_player_surface_records` |
| Latest Scores match links | `tennislive_player_match_links` |

## Match Page Mapping

Example page: `https://www.tennislive.net/atp/match/tomas-machac-VS-carlos-alcaraz-garfia/barcelona-open-banc-sabadell-barcelona-2026/`

| TennisLive field | Warehouse target |
| --- | --- |
| Date / round / player names / score / tournament / surface | `tennislive_match_summaries`, `matches`, `match_players` |
| Match source URL | `tennislive_match_sources.source_match_url` |
| Match-page player compare block: country, birthdate/age, current rank, points, prize money, photo | `tennislive_match_player_snapshots` |
| MATCH STATS table | `match_stat_rows` |
| Game-by-game replay rows | `tennislive_match_replay_games`, `replay_games` |
| Point strings within each game | `tennislive_match_replay_points`, `replay_points` |
| `[BP]` markers | `is_break_point` on replay points; counts on replay games |
| `40-40` markers | `is_deuce` on replay points; counts on replay games |
| Tiebreak point strings | `is_tiebreak` when inferred from the replay row |
| H2H matches table for the two players | `tennislive_h2h_source_rows` |
| Embedded Google form-chart arrays | `tennislive_form_chart_points` |
| Match-page "last matches" blocks | intentionally skipped here; player pages own recent-form ingestion |

## Source-Native Tables

| Table | Purpose |
| --- | --- |
| `tennislive_player_sources` | Internal player to TennisLive player URL association |
| `tennislive_player_profiles` | Timestamped player profile snapshots |
| `tennislive_player_surface_records` | Year/surface win-loss records from player page |
| `tennislive_player_match_links` | Match links discovered from player pages |
| `tennislive_match_sources` | Internal match to TennisLive match URL association |
| `tennislive_match_summaries` | Source-native match header/summary |
| `tennislive_match_player_snapshots` | Match-page player compare block captured at match ingest time |
| `tennislive_match_replay_games` | Source-native game replay rows with raw point string |
| `tennislive_match_replay_points` | Source-native point rows split from raw point string |
| `tennislive_h2h_source_rows` | H2H table rows from the match page only |
| `tennislive_form_chart_points` | Parsed match-page form chart points from TennisLive JavaScript arrays |

## Canonical Tables Fed By TennisLive

| Canonical table | Fed by |
| --- | --- |
| `players` | TennisLive player profile and match page player names |
| `matches` | TennisLive match summary |
| `match_players` | TennisLive match summary |
| `match_stat_rows` | TennisLive MATCH STATS table |
| `replay_games` | TennisLive point-by-point game rows |
| `replay_points` | TennisLive point strings |

## Crawl Rules

The ingestor must stay bounded.

- Fetch explicit `--player-url` and/or `--match-url` only.
- From a player page, store discovered match links but fetch detail pages only for completed recent matches up to `--max-matches`.
- From a match page, do not ingest the "last matches" blocks; those duplicate player-page recent-form data.
- Skip a match page already stored with the same content hash unless `--force` is passed.
- Do not crawl tournament pages recursively.
- Do not crawl all H2H history unless explicitly requested later.

## Current Gaps

- Point winners are not inferred yet; point score, server, break point, deuce, and tiebreak flags are stored.
- TennisLive form-chart points are stored as source-native rows, but they are not yet promoted into prediction features.
