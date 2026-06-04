# TennisLive Warehouse Showcase

This pilot shows what is now stored from TennisLive in `sql-tennis.db`.

## Player Source

Source URL:

https://www.tennislive.net/atp/carlos-alcaraz-garfia/

DB tables:

- `source_snapshots`
- `tennislive_player_sources`
- `tennislive_player_profiles`
- `tennislive_player_surface_records`
- `tennislive_player_match_links`

Latest profile row:

| player_id | name | country | rank | top | points | prize_money | total | W | L | win_pct |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| tennis-player-carlos-alcaraz | Carlos Alcaraz | Spain | 2 | 1 | 11960 | 60.032.046 $ | 478 | 385 | 93 | 80.54 |

Surface records, selected:

| season | surface | W | L | win_pct |
|---|---|---:|---:|---:|
| 2026 | summary | 22 | 4 |  |
| 2026 | Hard | 17 | 2 | 89.47 |
| 2026 | Clay | 5 | 2 | 71.43 |
| 2025 | summary | 71 | 9 |  |
| 2025 | Hard | 28 | 4 | 87.50 |
| 2025 | Clay | 22 | 1 | 95.65 |
| TOTAL | summary | 385 | 93 |  |
| TOTAL | Hard | 142 | 33 |  |
| TOTAL | Clay | 170 | 39 |  |
| TOTAL | I. hard | 35 | 16 |  |
| TOTAL | Grass | 38 | 5 |  |

Discovered recent match links:

| match_date | round | player1 | player2 | score/result | tournament | surface | status |
|---|---|---|---|---|---|---|---|
| 2026-04-15 | 2nd round | Tomas Machac | Carlos Alcaraz | Carlos Alcaraz - walk over | Barcelona | Clay | normalized |
| 2026-04-14 | 1st round | Carlos Alcaraz | Otto Virtanen | 6-4, 6-2 | Barcelona | Clay | normalized |

## Match Detail Source

Source URL:

https://www.tennislive.net/atp/match/alec-beckley-VS-dominik-palan/centurion-2-challenger-2026/

Canonical match id:

`tl-2026-06-02-centurion-2-challenger-2026-alec-beckley-vs-dominik-palan`

DB tables:

- `source_snapshots`
- `tennislive_match_sources`
- `tennislive_match_summaries`
- `matches`
- `match_players`
- `match_stat_rows`
- `tennislive_match_replay_games`
- `tennislive_match_replay_points`
- `replay_games`
- `replay_points`

Summary row:

| date | player1 | player2 | score | tournament | surface |
|---|---|---|---|---|---|
| 2026-06-02 | Alec Beckley | Dominik Palan | 6-3, 6-3 | Centurion 2 | Hard |

Match stat rows:

| stat | Alec Beckley | Dominik Palan |
|---|---:|---:|
| 1st SERVE % | 41/55 (75%) | 38/68 (56%) |
| 1st SERVE POINTS WON | 31/41 (76%) | 27/38 (71%) |
| 2nd SERVE POINTS WON | 8/14 (57%) | 9/30 (30%) |
| BREAK POINTS WON | 3/10 (30%) | 0/2 (0%) |
| TOTAL RETURN POINTS WON | 32/68 (47%) | 16/55 (29%) |
| TOTAL POINTS WON | 71/123 (58%) | 52/123 (42%) |
| DOUBLE FAULTS | 3 | 6 |
| ACES | 1 | 7 |

Replay game rows, first set excerpt:

| set | game | server | score_after | BP count | deuce count | raw point string |
|---:|---:|---|---|---:|---:|---|
| 1 | 1 | Alec Beckley | 0-0 | 2 | 0 | 0-0, 0-15, 15-15, 15-30, 15-40 [BP], 30-40 [BP] |
| 1 | 2 | Dominik Palan | 0-1 | 1 | 0 | 0-0, 15-0, 30-15, 40-15 [BP] |
| 1 | 3 | Alec Beckley | 1-1 | 1 | 1 | 0-0, 15-0, 15-15, 30-15, 40-15, 40-30, 40-40, 40-A [BP] |
| 1 | 4 | Dominik Palan | 1-2 | 1 | 0 | 0-0, 40-0 [BP] |
| 1 | 5 | Alec Beckley | 2-2 | 1 | 0 | 0-0, 0-15, 0-30, 15-30, 30-40 [BP] |

Point rows for set 1, game 3:

| point_number | point_score | is_break_point | is_deuce | raw_point_text |
|---:|---|---:|---:|---|
| 1 | 0-0 | 0 | 0 | 0-0 |
| 2 | 15-0 | 0 | 0 | 15-0 |
| 3 | 15-15 | 0 | 0 | 15-15 |
| 4 | 30-15 | 0 | 0 | 30-15 |
| 5 | 40-15 | 0 | 0 | 40-15 |
| 6 | 40-30 | 0 | 0 | 40-30 |
| 7 | 40-40 | 0 | 1 | 40-40 |
| 8 | 40-A | 1 | 0 | 40-A [BP] |

## Viewer Queries

Find every TennisLive URL for a player:

```sql
select p.player_id, p.name, s.source_player_url, s.last_ingested_at
from players p
join tennislive_player_sources s on s.player_id = p.player_id
where p.canonical_name like '%Alcaraz%';
```

Find every stored TennisLive match for a player:

```sql
select l.match_date, l.round, l.player1_name, l.player2_name, l.score_text,
       l.tournament, l.surface, l.source_match_url, l.ingest_status
from tennislive_player_match_links l
where l.player_id = 'tennis-player-carlos-alcaraz'
order by l.match_date desc;
```

Open the full point-by-point for one match:

```sql
select g.set_number, g.game_number, g.server_name, g.score_after,
       p.point_number, p.point_score, p.is_break_point, p.is_deuce, p.raw_point_text
from tennislive_match_replay_games g
join tennislive_match_replay_points p on p.replay_game_id = g.replay_game_id
where g.match_id = 'tl-2026-06-02-centurion-2-challenger-2026-alec-beckley-vs-dominik-palan'
order by g.set_number, g.game_number, p.point_number;
```
