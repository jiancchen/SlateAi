from __future__ import annotations

import sqlite3
from dataclasses import dataclass
from typing import Any

from .common import (
    TennisIdentityResolver,
    fetch_legacy_rows,
    parse_legacy_json,
    stable_id,
    to_int,
)


GAME_SOURCE_TABLES = ["tennis_sofascore_replay_games", "tennis_livesport_replay_games"]
POINT_SOURCE_TABLES = ["tennis_sofascore_replay_points", "tennis_livesport_replay_points"]


@dataclass(frozen=True)
class ParsedReplayGame:
    source_table: str
    legacy_row_id: str
    source_name: str
    match_id: str
    set_number: int | None
    game_number: int | None
    server_player_id: str | None
    winner_player_id: str | None
    break_point_count: int | None
    deuce_count: int | None
    score_before: str | None
    score_after: str | None

    @property
    def replay_game_id(self) -> str:
        return stable_id("replay-game", self.source_name, self.match_id, self.set_number, self.game_number)


@dataclass(frozen=True)
class ParsedReplayPoint:
    source_table: str
    legacy_row_id: str
    source_name: str
    replay_game_id: str
    point_number: int | None
    server_player_id: str | None
    point_winner_player_id: str | None
    point_score: str | None
    is_break_point: int
    is_deuce: int
    is_tiebreak: int

    @property
    def replay_point_id(self) -> str:
        return stable_id("replay-point", self.source_name, self.replay_game_id, self.point_number, self.legacy_row_id)


def source_name_for_table(table: str) -> str:
    if "sofascore" in table:
        return "sofascore"
    if "livesport" in table:
        return "livesport"
    return table


def player_name_for_side(payload: dict[str, Any], side: Any, role: str | None = None) -> str | None:
    text = str(side or "").lower()
    if role == "server" and payload.get("serving_player_name"):
        return payload.get("serving_player_name")
    if role == "winner" and payload.get("point_winner_player_name"):
        return payload.get("point_winner_player_name")
    if text in {"home", "1", "left"}:
        return payload.get("home_player_name") or payload.get("left_player_name")
    if text in {"away", "2", "right"}:
        return payload.get("away_player_name") or payload.get("right_player_name")
    return None


def bool_int(value: Any) -> int:
    if isinstance(value, bool):
        return 1 if value else 0
    if isinstance(value, (int, float)):
        return 1 if value else 0
    return 1 if str(value or "").strip().lower() in {"1", "true", "yes"} else 0


def point_score(payload: dict[str, Any]) -> str | None:
    raw = payload.get("raw_text") or payload.get("raw")
    if raw:
        return str(raw)
    home = payload.get("home_point")
    away = payload.get("away_point")
    if home is not None or away is not None:
        return f"{home or '0'}:{away or '0'}"
    return None


def is_deuce_score(payload: dict[str, Any]) -> int:
    home = str(payload.get("home_point") or "").upper()
    away = str(payload.get("away_point") or "").upper()
    if home == "40" and away == "40":
        return 1
    if home == "A" or away == "A":
        return 1
    raw = str(payload.get("raw_text") or payload.get("raw") or "")
    return 1 if raw in {"40:40", "A:40", "40:A"} else 0


def is_tiebreak_score(payload: dict[str, Any]) -> int:
    values = []
    for key in ["home_point", "away_point"]:
        try:
            values.append(int(str(payload.get(key))))
        except (TypeError, ValueError):
            pass
    return 1 if values and max(values) >= 6 else 0


def parse_game_row(
    row: sqlite3.Row,
    payload: dict[str, Any],
    resolver: TennisIdentityResolver,
) -> ParsedReplayGame | None:
    source_name = source_name_for_table(row["source_table"])
    match_id = resolver.match_id_from_payload(payload)
    if not match_id:
        resolver.insert_unresolved(
            "tennis_replay_match",
            source_name,
            payload.get("sofascore_event_id") or payload.get("livesport_match_id"),
            payload.get("board_match_id") or payload.get("sofascore_event_id") or payload.get("livesport_match_id") or "unknown",
            {"legacy_row_id": row["legacy_row_id"], "source_table": row["source_table"], "payload": payload},
            "Could not confidently map replay game to canonical match.",
        )
        return None
    server_name = payload.get("serving_player_name") or player_name_for_side(payload, payload.get("serving_side"), role="server")
    winner_name = payload.get("scoring_player_name") or player_name_for_side(payload, payload.get("scoring_side"))
    server_id = resolver.player_id_for_match(match_id, source_name, server_name, payload.get("serving_side")) if server_name else None
    winner_id = resolver.player_id_for_match(match_id, source_name, winner_name, payload.get("scoring_side")) if winner_name else None
    score_after = None
    if payload.get("home_games_after") is not None or payload.get("away_games_after") is not None:
        score_after = f"{payload.get('home_games_after', 0)}:{payload.get('away_games_after', 0)}"
    return ParsedReplayGame(
        source_table=row["source_table"],
        legacy_row_id=row["legacy_row_id"],
        source_name=source_name,
        match_id=match_id,
        set_number=to_int(payload.get("set_number")),
        game_number=to_int(payload.get("game_number")),
        server_player_id=server_id,
        winner_player_id=winner_id,
        break_point_count=to_int(payload.get("break_point_count")),
        deuce_count=to_int(payload.get("deuce_count")),
        score_before=None,
        score_after=score_after,
    )


def parse_point_row(
    row: sqlite3.Row,
    payload: dict[str, Any],
    resolver: TennisIdentityResolver,
) -> ParsedReplayPoint | None:
    source_name = source_name_for_table(row["source_table"])
    match_id = resolver.match_id_from_payload(payload)
    if not match_id:
        resolver.insert_unresolved(
            "tennis_replay_match",
            source_name,
            payload.get("sofascore_event_id") or payload.get("livesport_match_id"),
            payload.get("board_match_id") or payload.get("sofascore_event_id") or payload.get("livesport_match_id") or "unknown",
            {"legacy_row_id": row["legacy_row_id"], "source_table": row["source_table"], "payload": payload},
            "Could not confidently map replay point to canonical match.",
        )
        return None
    set_number = to_int(payload.get("set_number"))
    game_number = to_int(payload.get("game_number"))
    replay_game_id = stable_id("replay-game", source_name, match_id, set_number, game_number)
    server_name = payload.get("serving_player_name") or player_name_for_side(payload, payload.get("serving_side"), role="server")
    winner_name = payload.get("point_winner_player_name") or player_name_for_side(payload, payload.get("point_winner_side"), role="winner")
    server_id = resolver.player_id_for_match(match_id, source_name, server_name, payload.get("serving_side")) if server_name else None
    winner_id = resolver.player_id_for_match(match_id, source_name, winner_name, payload.get("point_winner_side")) if winner_name else None
    return ParsedReplayPoint(
        source_table=row["source_table"],
        legacy_row_id=row["legacy_row_id"],
        source_name=source_name,
        replay_game_id=replay_game_id,
        point_number=to_int(payload.get("point_index")),
        server_player_id=server_id,
        point_winner_player_id=winner_id,
        point_score=point_score(payload),
        is_break_point=bool_int(payload.get("break_point")),
        is_deuce=is_deuce_score(payload),
        is_tiebreak=is_tiebreak_score(payload),
    )


def parse_replay_rows(
    con: sqlite3.Connection,
    resolver: TennisIdentityResolver,
    date: str | None = None,
) -> tuple[list[ParsedReplayGame], list[ParsedReplayPoint], dict[str, int]]:
    counts = {"source_game_rows": 0, "source_point_rows": 0, "parsed_games": 0, "parsed_points": 0, "unparsed_games": 0, "unparsed_points": 0}
    games: list[ParsedReplayGame] = []
    points: list[ParsedReplayPoint] = []
    for row in fetch_legacy_rows(con, GAME_SOURCE_TABLES, date=date):
        counts["source_game_rows"] += 1
        parsed = parse_game_row(row, parse_legacy_json(row), resolver)
        if parsed:
            games.append(parsed)
        else:
            counts["unparsed_games"] += 1
    for row in fetch_legacy_rows(con, POINT_SOURCE_TABLES, date=date):
        counts["source_point_rows"] += 1
        parsed = parse_point_row(row, parse_legacy_json(row), resolver)
        if parsed:
            points.append(parsed)
        else:
            counts["unparsed_points"] += 1
    counts["parsed_games"] = len(games)
    counts["parsed_points"] = len(points)
    return games, points, counts


def insert_replay_games(con: sqlite3.Connection, rows: list[ParsedReplayGame]) -> int:
    count = 0
    for row in rows:
        con.execute(
            """
            insert into replay_games (
              replay_game_id, match_id, set_number, game_number, server_player_id,
              winner_player_id, break_point_count, deuce_count, score_before,
              score_after, source_name, source_snapshot_id
            ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, null)
            on conflict(replay_game_id) do update set
              server_player_id = excluded.server_player_id,
              winner_player_id = excluded.winner_player_id,
              break_point_count = excluded.break_point_count,
              deuce_count = excluded.deuce_count,
              score_after = excluded.score_after
            """,
            (
                row.replay_game_id,
                row.match_id,
                row.set_number,
                row.game_number,
                row.server_player_id,
                row.winner_player_id,
                row.break_point_count,
                row.deuce_count,
                row.score_before,
                row.score_after,
                row.source_name,
            ),
        )
        count += 1
    return count


def insert_replay_points(con: sqlite3.Connection, rows: list[ParsedReplayPoint]) -> int:
    count = 0
    for row in rows:
        con.execute(
            """
            insert into replay_points (
              replay_point_id, replay_game_id, point_number, server_player_id,
              point_winner_player_id, point_score, is_break_point, is_deuce,
              is_tiebreak, source_name, source_snapshot_id
            ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, null)
            on conflict(replay_point_id) do update set
              server_player_id = excluded.server_player_id,
              point_winner_player_id = excluded.point_winner_player_id,
              point_score = excluded.point_score,
              is_break_point = excluded.is_break_point,
              is_deuce = excluded.is_deuce,
              is_tiebreak = excluded.is_tiebreak
            """,
            (
                row.replay_point_id,
                row.replay_game_id,
                row.point_number,
                row.server_player_id,
                row.point_winner_player_id,
                row.point_score,
                row.is_break_point,
                row.is_deuce,
                row.is_tiebreak,
                row.source_name,
            ),
        )
        count += 1
    return count


def normalize_replay(con: sqlite3.Connection, date: str | None = None, dry_run: bool = False) -> dict[str, Any]:
    resolver = TennisIdentityResolver(con)
    before_unresolved = con.execute("select count(*) from unresolved_entities").fetchone()[0]
    games, points, counts = parse_replay_rows(con, resolver, date=date)
    report = {
        "family": "tennis_replay",
        "date": date,
        "dry_run": dry_run,
        **counts,
        "inserted_replay_games": 0,
        "inserted_replay_points": 0,
        "unresolved_rows_added": 0,
    }
    if not dry_run:
        report["inserted_replay_games"] = insert_replay_games(con, games)
        report["inserted_replay_points"] = insert_replay_points(con, points)
        con.commit()
    after_unresolved = con.execute("select count(*) from unresolved_entities").fetchone()[0]
    report["unresolved_rows_added"] = after_unresolved - before_unresolved
    if dry_run:
        con.rollback()
    return report

