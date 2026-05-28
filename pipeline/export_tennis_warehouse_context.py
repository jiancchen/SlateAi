#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
DB_PATH = ROOT / "data-private" / "warehouse" / "sports.db"


def connect() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def as_json(value: str | None) -> Any:
    if not value:
        return None
    try:
        return json.loads(value)
    except json.JSONDecodeError:
        return value


def stat_rows(conn: sqlite3.Connection, event_id: str, period: str = "ALL") -> list[dict[str, Any]]:
    return [
        dict(row)
        for row in conn.execute(
            """
            select player_side, player_name, normalized_name, period, group_name,
                   stat_key, stat_name, raw_value, numeric_value, percentage
            from tennis_sofascore_player_stat_rows
            where sofascore_event_id = ? and period = ?
            order by player_side, group_name, stat_name
            """,
            (event_id, period),
        )
    ]


def player_stat_summary(rows: list[dict[str, Any]]) -> dict[str, dict[str, Any]]:
    summary: dict[str, dict[str, Any]] = {}
    key_map = {
        "aces": "aces",
        "doubleFaults": "doubleFaults",
        "firstServeAccuracy": "firstServePct",
        "firstServePointsAccuracy": "firstServeWonPct",
        "secondServePointsAccuracy": "secondServeWonPct",
        "serviceGamesTotal": "serviceGamesPlayed",
        "serviceGamesWon": "serviceGamesWon",
        "breakPointsSaved": "breakPointsSaved",
        "breakPointsScored": "breakPointsConverted",
        "firstReturnPoints": "firstReturnPointsWonPct",
        "secondReturnPoints": "secondReturnPointsWonPct",
        "pointsTotal": "totalPointsWon",
        "gamesWon": "gamesWon",
    }
    for row in rows:
        player = row["player_name"]
        if not player:
            continue
        bucket = summary.setdefault(player, {"name": player, "side": row["player_side"], "stats": {}})
        mapped = key_map.get(row["stat_key"])
        if not mapped:
            continue
        bucket["stats"][mapped] = {
            "label": row["stat_name"],
            "raw": row["raw_value"],
            "numeric": row["numeric_value"],
            "percentage": row["percentage"],
        }
    return summary


def export_context(date: str) -> dict[str, Any]:
    conn = connect()
    matches: dict[str, Any] = {}
    for match in conn.execute(
        """
        select *
        from tennis_sofascore_matches
        where slate_date = ?
        order by board_match_id
        """,
        (date,),
    ):
        row = dict(match)
        event_id = row["sofascore_event_id"]
        rows = stat_rows(conn, event_id)
        players = player_stat_summary(rows)
        matches[row["board_match_id"]] = {
            "source": "SofaScore warehouse",
            "eventId": event_id,
            "sourceUrl": row["source_url"],
            "capturedAt": row["captured_at"],
            "surface": row["surface"],
            "tournament": row["tournament_name"],
            "category": row["tournament_category"],
            "startTimestamp": row["start_timestamp"],
            "players": list(players.values()),
            "h2h": {
                "homeName": row["home_player_name"],
                "awayName": row["away_player_name"],
                "homeWins": row["h2h_home_wins"],
                "awayWins": row["h2h_away_wins"],
                "draws": row["h2h_draws"],
            },
            "score": {
                "home": as_json(row["home_score_json"]),
                "away": as_json(row["away_score_json"]),
            },
            "allStatRows": rows,
            "coverage": {
                "hasEvent": True,
                "hasH2h": row["h2h_home_wins"] is not None or row["h2h_away_wins"] is not None,
                "allStatRows": len(rows),
                "playerStatRows": len(rows),
            },
        }
    conn.close()
    return {
        "date": date,
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "source": "SQLite tennis warehouse",
        "matches": matches,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Export tennis warehouse context for the web app.")
    parser.add_argument("--date", required=True)
    parser.add_argument(
        "--output",
        default="",
        help="Output path. Defaults to web/src/lib/day-YYYY-MM-DD-tennis-warehouse-context.generated.json",
    )
    args = parser.parse_args()
    output = Path(args.output) if args.output else ROOT / "web" / "src" / "lib" / f"day-{args.date}-tennis-warehouse-context.generated.json"
    if not output.is_absolute():
        output = ROOT / output
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(export_context(args.date), indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"Wrote tennis warehouse context to {output.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
