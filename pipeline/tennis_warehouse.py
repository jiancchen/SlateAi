#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import re
import sqlite3
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
DB_PATH = ROOT / "data-private" / "warehouse" / "sports.db"
RANKINGS_PATH = ROOT / "data-private" / "reference" / "tennis" / "player-rankings.json"
FLASHSCORE_DIR = ROOT / "data-private" / "reference" / "tennis" / "flashscore-match-stats"
PUBLISHED_SLATES_DIR = ROOT / "published-data" / "slates"


def normalize_name(value: str | None) -> str:
    value = value or ""
    value = re.sub(r"[^a-zA-Z0-9]+", " ", value).strip().lower()
    return re.sub(r"\s+", " ", value)


def read_json(path: Path) -> Any:
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def dumps(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False, sort_keys=True)


def get_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("pragma foreign_keys = on")
    return conn


def init_db(conn: sqlite3.Connection) -> None:
    conn.executescript(
        """
        create table if not exists tennis_players (
          normalized_name text primary key,
          name text not null,
          created_at text not null default current_timestamp,
          updated_at text not null default current_timestamp
        );

        create table if not exists tennis_rankings (
          as_of_date text not null,
          tour text not null,
          normalized_name text not null,
          player_name text not null,
          rank integer,
          points integer,
          age integer,
          country text,
          source text,
          profile_url text,
          raw_json text not null,
          updated_at text not null default current_timestamp,
          primary key (as_of_date, tour, normalized_name)
        );

        create table if not exists tennis_matches (
          match_id text primary key,
          slate_date text not null,
          league text not null,
          title text not null,
          stage text,
          court text,
          start_label text,
          start_minutes integer,
          player1_name text,
          player2_name text,
          player1_normalized_name text,
          player2_normalized_name text,
          desk_pick_name text,
          desk_confidence integer,
          desk_volatility integer,
          desk_summary text,
          desk_lean text,
          source_file text,
          raw_json text not null,
          updated_at text not null default current_timestamp
        );

        create table if not exists tennis_match_sources (
          match_id text not null,
          source_name text not null,
          source_url text,
          status text not null default 'ok',
          error text,
          raw_json text not null,
          updated_at text not null default current_timestamp,
          primary key (match_id, source_name)
        );

        create table if not exists tennis_h2h_snapshots (
          match_id text primary key,
          slate_date text not null,
          source_url text,
          h2h_record text,
          h2h_text text,
          source_prediction text,
          status text not null,
          error text,
          raw_json text not null,
          updated_at text not null default current_timestamp
        );

        create table if not exists tennis_player_match_context (
          match_id text not null,
          player_slot integer not null,
          normalized_name text not null,
          player_name text not null,
          ranking_as_of text,
          tour text,
          rank integer,
          overall_wins integer,
          overall_losses integer,
          overall_win_pct real,
          clay_wins integer,
          clay_losses integer,
          clay_win_pct real,
          recent_matches integer,
          recent_wins integer,
          recent_losses integer,
          recent_win_pct real,
          recent_sets_won integer,
          recent_sets_lost integer,
          recent_set_pct real,
          recent_games_won integer,
          recent_games_lost integer,
          recent_game_pct real,
          resistance_matches integer,
          straight_set_wins integer,
          straight_set_losses integer,
          known_opponent_ranks integer,
          missing_opponent_ranks integer,
          ranking_coverage_pct real,
          avg_known_opponent_rank real,
          top10_opponents integer,
          top25_opponents integer,
          top50_opponents integer,
          challenger_or_itf_matches integer,
          scoreline_form_score real,
          opponent_adjusted_form_score real,
          service_data_source text,
          service_data_note text,
          raw_json text not null,
          updated_at text not null default current_timestamp,
          primary key (match_id, normalized_name)
        );

        create table if not exists tennis_recent_matches (
          match_id text not null,
          normalized_name text not null,
          recent_index integer not null,
          player_name text not null,
          event text,
          event_tier text,
          opponent_name text,
          opponent_normalized_name text,
          opponent_rank integer,
          opponent_tour text,
          result_text text,
          match_date_label text,
          completed integer,
          player_won integer,
          retirement integer,
          walkover integer,
          sets_played integer,
          sets_won integer,
          sets_lost integer,
          games_won integer,
          games_lost integer,
          tiebreak_sets integer,
          deciding_set integer,
          straight_set_win integer,
          straight_set_loss integer,
          resistance integer,
          opponent_weight real,
          quality_points real,
          raw_json text not null,
          updated_at text not null default current_timestamp,
          primary key (match_id, normalized_name, recent_index)
        );

        create table if not exists tennis_predictions (
          slate_date text not null,
          match_id text not null,
          prediction_source text not null,
          pick_name text,
          confidence integer,
          volatility integer,
          projected_set_line text,
          rationale text,
          raw_json text not null,
          updated_at text not null default current_timestamp,
          primary key (slate_date, match_id, prediction_source)
        );

        create table if not exists tennis_flashscore_match_stats (
          flashscore_id text primary key,
          source_url text,
          generated_at text,
          left_player_name text,
          right_player_name text,
          score_summary_json text,
          raw_json text not null,
          updated_at text not null default current_timestamp
        );

        create table if not exists tennis_flashscore_stat_rows (
          flashscore_id text not null,
          scope_label text not null,
          section_label text not null,
          stat_label text not null,
          left_player_name text,
          right_player_name text,
          left_value text,
          right_value text,
          raw_json text not null,
          updated_at text not null default current_timestamp,
          primary key (flashscore_id, scope_label, section_label, stat_label)
        );

        create index if not exists idx_tennis_matches_slate_date on tennis_matches(slate_date);
        create index if not exists idx_tennis_recent_opponent_rank on tennis_recent_matches(opponent_rank);
        create index if not exists idx_tennis_context_rank on tennis_player_match_context(rank);
        create index if not exists idx_tennis_predictions_date on tennis_predictions(slate_date);
        """
    )
    conn.commit()


def upsert_player(conn: sqlite3.Connection, name: str | None) -> None:
    if not name:
        return
    normalized = normalize_name(name)
    if not normalized:
        return
    conn.execute(
        """
        insert into tennis_players(normalized_name, name)
        values (?, ?)
        on conflict(normalized_name) do update set
          name=excluded.name,
          updated_at=current_timestamp
        """,
        (normalized, name),
    )


def import_rankings(conn: sqlite3.Connection, path: Path = RANKINGS_PATH) -> int:
    payload = read_json(path)
    as_of = payload.get("asOf")
    rows = payload.get("players", {})
    count = 0
    for normalized, row in rows.items():
        name = row.get("name") or normalized
        upsert_player(conn, name)
        conn.execute(
            """
            insert into tennis_rankings(
              as_of_date, tour, normalized_name, player_name, rank, points, age,
              country, source, profile_url, raw_json
            )
            values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            on conflict(as_of_date, tour, normalized_name) do update set
              player_name=excluded.player_name,
              rank=excluded.rank,
              points=excluded.points,
              age=excluded.age,
              country=excluded.country,
              source=excluded.source,
              profile_url=excluded.profile_url,
              raw_json=excluded.raw_json,
              updated_at=current_timestamp
            """,
            (
                row.get("asOf") or as_of,
                row.get("tour") or "",
                normalized,
                name,
                row.get("rank"),
                row.get("points"),
                row.get("age"),
                row.get("country"),
                row.get("source"),
                row.get("profileUrl"),
                dumps(row),
            ),
        )
        count += 1
    conn.commit()
    return count


def as_int(value: Any) -> int | None:
    if value is None:
        return None
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def as_float(value: Any) -> float | None:
    if value is None:
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def bool_int(value: Any) -> int | None:
    if value is None:
        return None
    return 1 if bool(value) else 0


def import_slate(conn: sqlite3.Connection, slate_date: str) -> dict[str, int]:
    slate_dir = PUBLISHED_SLATES_DIR / slate_date / "games"
    if not slate_dir.exists():
        raise FileNotFoundError(f"No published games directory for {slate_date}: {slate_dir}")

    counts = {
        "matches": 0,
        "h2h": 0,
        "player_context": 0,
        "recent_matches": 0,
        "desk_predictions": 0,
        "source_predictions": 0,
        "source_rows": 0,
    }

    for file_path in sorted(slate_dir.glob("*.json")):
        game = read_json(file_path)
        if game.get("league") != "Tennis":
            continue

        match_id = game["id"]
        context = game.get("tennisContext") or {}
        players = context.get("players") or []
        p1 = players[0].get("name") if len(players) > 0 else None
        p2 = players[1].get("name") if len(players) > 1 else None
        upsert_player(conn, p1)
        upsert_player(conn, p2)

        conn.execute(
            """
            insert into tennis_matches(
              match_id, slate_date, league, title, stage, court, start_label,
              start_minutes, player1_name, player2_name, player1_normalized_name,
              player2_normalized_name, desk_pick_name, desk_confidence, desk_volatility,
              desk_summary, desk_lean, source_file, raw_json
            )
            values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            on conflict(match_id) do update set
              slate_date=excluded.slate_date,
              league=excluded.league,
              title=excluded.title,
              stage=excluded.stage,
              court=excluded.court,
              start_label=excluded.start_label,
              start_minutes=excluded.start_minutes,
              player1_name=excluded.player1_name,
              player2_name=excluded.player2_name,
              player1_normalized_name=excluded.player1_normalized_name,
              player2_normalized_name=excluded.player2_normalized_name,
              desk_pick_name=excluded.desk_pick_name,
              desk_confidence=excluded.desk_confidence,
              desk_volatility=excluded.desk_volatility,
              desk_summary=excluded.desk_summary,
              desk_lean=excluded.desk_lean,
              source_file=excluded.source_file,
              raw_json=excluded.raw_json,
              updated_at=current_timestamp
            """,
            (
                match_id,
                slate_date,
                game.get("league"),
                game.get("title"),
                game.get("stage"),
                context.get("court"),
                game.get("start"),
                game.get("startMinutes"),
                p1,
                p2,
                normalize_name(p1),
                normalize_name(p2),
                (game.get("analysis") or {}).get("participant", {}).get("name") or (context.get("projection") or {}).get("projectedWinner"),
                game.get("confidence"),
                game.get("volatility"),
                game.get("summary"),
                game.get("lean"),
                str(file_path.relative_to(ROOT)),
                dumps(game),
            ),
        )
        counts["matches"] += 1

        projection = context.get("projection") or {}
        conn.execute(
            """
            insert into tennis_predictions(
              slate_date, match_id, prediction_source, pick_name, confidence,
              volatility, projected_set_line, rationale, raw_json
            )
            values (?, ?, 'desk', ?, ?, ?, ?, ?, ?)
            on conflict(slate_date, match_id, prediction_source) do update set
              pick_name=excluded.pick_name,
              confidence=excluded.confidence,
              volatility=excluded.volatility,
              projected_set_line=excluded.projected_set_line,
              rationale=excluded.rationale,
              raw_json=excluded.raw_json,
              updated_at=current_timestamp
            """,
            (
                slate_date,
                match_id,
                projection.get("projectedWinner") or (game.get("analysis") or {}).get("participant", {}).get("name"),
                game.get("confidence"),
                game.get("volatility"),
                projection.get("projectedSetLine"),
                game.get("summary"),
                dumps({"projection": projection, "analysis": game.get("analysis"), "playerAnalysis": game.get("playerAnalysis")}),
            ),
        )
        counts["desk_predictions"] += 1

        for source_name, source_payload in (
            ("tennistonic_h2h", context.get("clayMatchupData")),
            ("opponent_quality", context.get("opponentQualityData")),
        ):
            if source_payload is None:
                continue
            conn.execute(
                """
                insert into tennis_match_sources(match_id, source_name, source_url, status, error, raw_json)
                values (?, ?, ?, ?, ?, ?)
                on conflict(match_id, source_name) do update set
                  source_url=excluded.source_url,
                  status=excluded.status,
                  error=excluded.error,
                  raw_json=excluded.raw_json,
                  updated_at=current_timestamp
                """,
                (
                    match_id,
                    source_name,
                    source_payload.get("sourceUrl"),
                    "error" if source_payload.get("error") else "ok",
                    source_payload.get("error"),
                    dumps(source_payload),
                ),
            )
            counts["source_rows"] += 1

        clay = context.get("clayMatchupData") or {}
        if clay:
            conn.execute(
                """
                insert into tennis_h2h_snapshots(
                  match_id, slate_date, source_url, h2h_record, h2h_text,
                  source_prediction, status, error, raw_json
                )
                values (?, ?, ?, ?, ?, ?, ?, ?, ?)
                on conflict(match_id) do update set
                  slate_date=excluded.slate_date,
                  source_url=excluded.source_url,
                  h2h_record=excluded.h2h_record,
                  h2h_text=excluded.h2h_text,
                  source_prediction=excluded.source_prediction,
                  status=excluded.status,
                  error=excluded.error,
                  raw_json=excluded.raw_json,
                  updated_at=current_timestamp
                """,
                (
                    match_id,
                    slate_date,
                    clay.get("sourceUrl"),
                    clay.get("h2hRecord"),
                    clay.get("h2hText"),
                    clay.get("prediction"),
                    "error" if clay.get("error") else "ok",
                    clay.get("error"),
                    dumps(clay),
                ),
            )
            counts["h2h"] += 1
            if clay.get("prediction"):
                conn.execute(
                    """
                    insert into tennis_predictions(
                      slate_date, match_id, prediction_source, pick_name,
                      confidence, volatility, projected_set_line, rationale, raw_json
                    )
                    values (?, ?, 'tennistonic', ?, null, null, ?, ?, ?)
                    on conflict(slate_date, match_id, prediction_source) do update set
                      pick_name=excluded.pick_name,
                      projected_set_line=excluded.projected_set_line,
                      rationale=excluded.rationale,
                      raw_json=excluded.raw_json,
                      updated_at=current_timestamp
                    """,
                    (
                        slate_date,
                        match_id,
                        clay.get("prediction"),
                        clay.get("prediction"),
                        "Source-site prediction stored for comparison only.",
                        dumps(clay),
                    ),
                )
                counts["source_predictions"] += 1

        quality = context.get("opponentQualityData") or {}
        for player_slot, player in enumerate(quality.get("players") or [], start=1):
            name = player.get("name")
            normalized = normalize_name(name)
            upsert_player(conn, name)
            ranking = player.get("ranking") or {}
            records = player.get("records") or {}
            overall = records.get("overall2026") or {}
            clay_record = records.get("clay2026") or {}
            window = player.get("recentWindow") or {}
            service = player.get("serviceData") or {}
            conn.execute(
                """
                insert into tennis_player_match_context(
                  match_id, player_slot, normalized_name, player_name, ranking_as_of,
                  tour, rank, overall_wins, overall_losses, overall_win_pct,
                  clay_wins, clay_losses, clay_win_pct, recent_matches, recent_wins,
                  recent_losses, recent_win_pct, recent_sets_won, recent_sets_lost,
                  recent_set_pct, recent_games_won, recent_games_lost, recent_game_pct,
                  resistance_matches, straight_set_wins, straight_set_losses,
                  known_opponent_ranks, missing_opponent_ranks, ranking_coverage_pct,
                  avg_known_opponent_rank, top10_opponents, top25_opponents,
                  top50_opponents, challenger_or_itf_matches, scoreline_form_score,
                  opponent_adjusted_form_score, service_data_source, service_data_note,
                  raw_json
                )
                values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                on conflict(match_id, normalized_name) do update set
                  player_slot=excluded.player_slot,
                  player_name=excluded.player_name,
                  ranking_as_of=excluded.ranking_as_of,
                  tour=excluded.tour,
                  rank=excluded.rank,
                  overall_wins=excluded.overall_wins,
                  overall_losses=excluded.overall_losses,
                  overall_win_pct=excluded.overall_win_pct,
                  clay_wins=excluded.clay_wins,
                  clay_losses=excluded.clay_losses,
                  clay_win_pct=excluded.clay_win_pct,
                  recent_matches=excluded.recent_matches,
                  recent_wins=excluded.recent_wins,
                  recent_losses=excluded.recent_losses,
                  recent_win_pct=excluded.recent_win_pct,
                  recent_sets_won=excluded.recent_sets_won,
                  recent_sets_lost=excluded.recent_sets_lost,
                  recent_set_pct=excluded.recent_set_pct,
                  recent_games_won=excluded.recent_games_won,
                  recent_games_lost=excluded.recent_games_lost,
                  recent_game_pct=excluded.recent_game_pct,
                  resistance_matches=excluded.resistance_matches,
                  straight_set_wins=excluded.straight_set_wins,
                  straight_set_losses=excluded.straight_set_losses,
                  known_opponent_ranks=excluded.known_opponent_ranks,
                  missing_opponent_ranks=excluded.missing_opponent_ranks,
                  ranking_coverage_pct=excluded.ranking_coverage_pct,
                  avg_known_opponent_rank=excluded.avg_known_opponent_rank,
                  top10_opponents=excluded.top10_opponents,
                  top25_opponents=excluded.top25_opponents,
                  top50_opponents=excluded.top50_opponents,
                  challenger_or_itf_matches=excluded.challenger_or_itf_matches,
                  scoreline_form_score=excluded.scoreline_form_score,
                  opponent_adjusted_form_score=excluded.opponent_adjusted_form_score,
                  service_data_source=excluded.service_data_source,
                  service_data_note=excluded.service_data_note,
                  raw_json=excluded.raw_json,
                  updated_at=current_timestamp
                """,
                (
                    match_id,
                    player_slot,
                    normalized,
                    name,
                    ranking.get("asOf"),
                    ranking.get("tour"),
                    as_int(ranking.get("rank")),
                    as_int(overall.get("wins")),
                    as_int(overall.get("losses")),
                    as_float(overall.get("winPct")),
                    as_int(clay_record.get("wins")),
                    as_int(clay_record.get("losses")),
                    as_float(clay_record.get("winPct")),
                    as_int(window.get("matches")),
                    as_int(window.get("wins")),
                    as_int(window.get("losses")),
                    as_float(window.get("winPct")),
                    as_int(window.get("setsWon")),
                    as_int(window.get("setsLost")),
                    as_float(window.get("setPct")),
                    as_int(window.get("gamesWon")),
                    as_int(window.get("gamesLost")),
                    as_float(window.get("gamePct")),
                    as_int(window.get("resistanceMatches")),
                    as_int(window.get("straightSetWins")),
                    as_int(window.get("straightSetLosses")),
                    as_int(window.get("knownOpponentRanks")),
                    as_int(window.get("missingOpponentRanks")),
                    as_float(window.get("rankingCoveragePct")),
                    as_float(window.get("avgKnownOpponentRank")),
                    as_int(window.get("top10Opponents")),
                    as_int(window.get("top25Opponents")),
                    as_int(window.get("top50Opponents")),
                    as_int(window.get("challengerOrItfMatches")),
                    as_float(window.get("scorelineFormScore")),
                    as_float(window.get("opponentAdjustedFormScore")),
                    service.get("source"),
                    service.get("note"),
                    dumps(player),
                ),
            )
            counts["player_context"] += 1

            for index, recent in enumerate(player.get("recentMatches") or []):
                opponent = recent.get("opponent")
                opponent_ranking = recent.get("opponentRanking") or {}
                parsed = recent.get("parsed") or {}
                upsert_player(conn, opponent)
                conn.execute(
                    """
                    insert into tennis_recent_matches(
                      match_id, normalized_name, recent_index, player_name, event,
                      event_tier, opponent_name, opponent_normalized_name, opponent_rank,
                      opponent_tour, result_text, match_date_label, completed,
                      player_won, retirement, walkover, sets_played, sets_won,
                      sets_lost, games_won, games_lost, tiebreak_sets, deciding_set,
                      straight_set_win, straight_set_loss, resistance, opponent_weight,
                      quality_points, raw_json
                    )
                    values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    on conflict(match_id, normalized_name, recent_index) do update set
                      player_name=excluded.player_name,
                      event=excluded.event,
                      event_tier=excluded.event_tier,
                      opponent_name=excluded.opponent_name,
                      opponent_normalized_name=excluded.opponent_normalized_name,
                      opponent_rank=excluded.opponent_rank,
                      opponent_tour=excluded.opponent_tour,
                      result_text=excluded.result_text,
                      match_date_label=excluded.match_date_label,
                      completed=excluded.completed,
                      player_won=excluded.player_won,
                      retirement=excluded.retirement,
                      walkover=excluded.walkover,
                      sets_played=excluded.sets_played,
                      sets_won=excluded.sets_won,
                      sets_lost=excluded.sets_lost,
                      games_won=excluded.games_won,
                      games_lost=excluded.games_lost,
                      tiebreak_sets=excluded.tiebreak_sets,
                      deciding_set=excluded.deciding_set,
                      straight_set_win=excluded.straight_set_win,
                      straight_set_loss=excluded.straight_set_loss,
                      resistance=excluded.resistance,
                      opponent_weight=excluded.opponent_weight,
                      quality_points=excluded.quality_points,
                      raw_json=excluded.raw_json,
                      updated_at=current_timestamp
                    """,
                    (
                        match_id,
                        normalized,
                        index,
                        name,
                        recent.get("event"),
                        recent.get("eventTier"),
                        opponent,
                        normalize_name(opponent),
                        as_int(opponent_ranking.get("rank")),
                        opponent_ranking.get("tour"),
                        recent.get("result"),
                        recent.get("date"),
                        bool_int(parsed.get("completed")),
                        bool_int(parsed.get("playerWon")),
                        bool_int(parsed.get("retirement")),
                        bool_int(parsed.get("walkover")),
                        as_int(parsed.get("setsPlayed")),
                        as_int(parsed.get("setsWon")),
                        as_int(parsed.get("setsLost")),
                        as_int(parsed.get("gamesWon")),
                        as_int(parsed.get("gamesLost")),
                        as_int(parsed.get("tiebreakSets")),
                        bool_int(parsed.get("decidingSet")),
                        bool_int(parsed.get("straightSetWin")),
                        bool_int(parsed.get("straightSetLoss")),
                        bool_int(parsed.get("resistance")),
                        as_float(recent.get("opponentWeight")),
                        as_float(recent.get("qualityPoints")),
                        dumps(recent),
                    ),
                )
                counts["recent_matches"] += 1

    conn.commit()
    return counts


def import_flashscore(conn: sqlite3.Connection, directory: Path = FLASHSCORE_DIR) -> dict[str, int]:
    counts = {"matches": 0, "stat_rows": 0}
    if not directory.exists():
        return counts
    for file_path in sorted(directory.glob("*.json")):
        payload = read_json(file_path)
        flashscore_id = payload.get("matchId") or file_path.stem
        players = payload.get("players") or []
        left_name = players[0] if len(players) > 0 else None
        right_name = players[1] if len(players) > 1 else None
        upsert_player(conn, left_name)
        upsert_player(conn, right_name)
        conn.execute(
            """
            insert into tennis_flashscore_match_stats(
              flashscore_id, source_url, generated_at, left_player_name,
              right_player_name, score_summary_json, raw_json
            )
            values (?, ?, ?, ?, ?, ?, ?)
            on conflict(flashscore_id) do update set
              source_url=excluded.source_url,
              generated_at=excluded.generated_at,
              left_player_name=excluded.left_player_name,
              right_player_name=excluded.right_player_name,
              score_summary_json=excluded.score_summary_json,
              raw_json=excluded.raw_json,
              updated_at=current_timestamp
            """,
            (
                flashscore_id,
                payload.get("sourceUrl"),
                payload.get("generatedAt"),
                left_name,
                right_name,
                dumps(payload.get("scoreSummary")),
                dumps(payload),
            ),
        )
        counts["matches"] += 1

        for scope in payload.get("scopes") or []:
            for section in scope.get("sections") or []:
                for stat in section.get("stats") or []:
                    conn.execute(
                        """
                        insert into tennis_flashscore_stat_rows(
                          flashscore_id, scope_label, section_label, stat_label,
                          left_player_name, right_player_name, left_value, right_value, raw_json
                        )
                        values (?, ?, ?, ?, ?, ?, ?, ?, ?)
                        on conflict(flashscore_id, scope_label, section_label, stat_label) do update set
                          left_player_name=excluded.left_player_name,
                          right_player_name=excluded.right_player_name,
                          left_value=excluded.left_value,
                          right_value=excluded.right_value,
                          raw_json=excluded.raw_json,
                          updated_at=current_timestamp
                        """,
                        (
                            flashscore_id,
                            scope.get("label"),
                            section.get("label"),
                            stat.get("label"),
                            stat.get("leftPlayer"),
                            stat.get("rightPlayer"),
                            stat.get("left"),
                            stat.get("right"),
                            dumps(stat),
                        ),
                    )
                    counts["stat_rows"] += 1
    conn.commit()
    return counts


def print_summary(conn: sqlite3.Connection) -> None:
    queries = {
        "tennis_rankings": "select count(*) as count from tennis_rankings",
        "tennis_matches": "select slate_date, count(*) as count from tennis_matches group by slate_date order by slate_date",
        "tennis_h2h_snapshots": "select status, count(*) as count from tennis_h2h_snapshots group by status",
        "tennis_player_match_context": "select count(*) as count from tennis_player_match_context",
        "tennis_recent_matches": "select count(*) as count from tennis_recent_matches",
        "tennis_flashscore_stat_rows": "select count(*) as count from tennis_flashscore_stat_rows",
    }
    for label, sql in queries.items():
        rows = [dict(row) for row in conn.execute(sql).fetchall()]
        print(f"{label}: {json.dumps(rows)}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Initialize and import tennis warehouse data.")
    subparsers = parser.add_subparsers(dest="command", required=True)

    subparsers.add_parser("init-db")

    rankings_parser = subparsers.add_parser("import-rankings")
    rankings_parser.add_argument("--file", default=str(RANKINGS_PATH))

    slate_parser = subparsers.add_parser("import-slate")
    slate_parser.add_argument("--date", required=True)

    flashscore_parser = subparsers.add_parser("import-flashscore")
    flashscore_parser.add_argument("--dir", default=str(FLASHSCORE_DIR))

    subparsers.add_parser("summary")

    args = parser.parse_args()
    conn = get_connection()
    init_db(conn)

    if args.command == "init-db":
        print(f"Initialized tennis warehouse tables in {DB_PATH}")
    elif args.command == "import-rankings":
        count = import_rankings(conn, Path(args.file))
        print(f"Imported {count} tennis ranking rows")
    elif args.command == "import-slate":
        counts = import_slate(conn, args.date)
        print(json.dumps(counts, indent=2, sort_keys=True))
    elif args.command == "import-flashscore":
        counts = import_flashscore(conn, Path(args.dir))
        print(json.dumps(counts, indent=2, sort_keys=True))
    elif args.command == "summary":
        print_summary(conn)


if __name__ == "__main__":
    main()
