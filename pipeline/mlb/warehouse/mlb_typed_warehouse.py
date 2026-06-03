#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import sqlite3
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[3]
DEFAULT_DB_PATH = ROOT / "data-private" / "warehouse" / "sports" / "mlb" / "sql-mlb.db"
VERSION = "0.1.0"


def resolve_path(path: Path) -> Path:
    return path if path.is_absolute() else ROOT / path


def display_path(path: Path) -> str:
    try:
        return str(path.relative_to(ROOT))
    except ValueError:
        return str(path)


def connect(db_path: Path) -> sqlite3.Connection:
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    return conn


def table_count(conn: sqlite3.Connection, table_name: str) -> int | None:
    exists = conn.execute(
        "select 1 from sqlite_master where type in ('table', 'view') and name = ? limit 1",
        (table_name,),
    ).fetchone()
    if not exists:
        return None
    return int(conn.execute(f'select count(*) from "{table_name}"').fetchone()[0])


def source_status_rows(conn: sqlite3.Connection, date_text: str | None = None) -> list[dict[str, Any]]:
    where = "where sport = 'mlb'"
    params: list[Any] = []
    if date_text:
        where += " and source_date = ?"
        params.append(date_text)
    rows = conn.execute(
        f"""
        select source_name, source_family, source_date, last_status,
               last_completeness_status, actual_item_count, missing_item_count,
               unresolved_count, updated_at
        from source_fetch_status
        {where}
        order by source_date desc, updated_at desc
        limit 25
        """,
        params,
    ).fetchall()
    return [dict(row) for row in rows]


def status_payload(conn: sqlite3.Connection, db_path: Path, date_text: str | None = None) -> dict[str, Any]:
    tables = [
        "games",
        "starting_pitchers",
        "plate_appearances",
        "pitch_events",
        "source_fetch_status",
        "prediction_rows",
        "market_snapshots",
        "prop_market_snapshots",
    ]
    return {
        "version": VERSION,
        "db_path": display_path(db_path),
        "table_counts": {table: table_count(conn, table) for table in tables},
        "source_status": source_status_rows(conn, date_text),
    }


def print_status(payload: dict[str, Any]) -> None:
    print(f"MLB typed warehouse v{payload['version']}")
    print(f"DB: {payload['db_path']}")
    print("Table counts:")
    for table, count in payload["table_counts"].items():
        print(f"- {table}: {'missing' if count is None else count}")
    if payload["source_status"]:
        print("Recent source status:")
        for row in payload["source_status"]:
            count = row["actual_item_count"] if row["actual_item_count"] is not None else "-"
            print(
                f"- {row['source_date']} {row['source_name']} "
                f"{row['last_status']}/{row['last_completeness_status']} rows={count}"
            )


def probable_starter_rows(conn: sqlite3.Connection, date_text: str) -> list[dict[str, Any]]:
    rows = conn.execute(
        """
        select
          g.game_id,
          g.mlb_game_pk,
          g.game_date,
          g.start_time_utc,
          g.status as game_status,
          g.away_team_id,
          g.home_team_id,
          away.name as away_team,
          home.name as home_team,
          sp.team_id as pitcher_team_id,
          p.mlb_player_id as pitcher_mlb_id,
          p.name as pitcher_name,
          p.throws as pitcher_hand,
          sp.confirmation_status,
          sp.source_name,
          sp.updated_at
        from games g
        join teams away on away.team_id = g.away_team_id
        join teams home on home.team_id = g.home_team_id
        left join starting_pitchers sp on sp.game_id = g.game_id
        left join players p on p.player_id = sp.pitcher_id
        where g.game_date = ?
        order by coalesce(g.start_time_utc, ''), g.game_id, sp.team_id
        """,
        (date_text,),
    ).fetchall()
    by_game: dict[str, dict[str, Any]] = {}
    for row in rows:
        item = by_game.setdefault(
            row["game_id"],
            {
                "game_id": row["game_id"],
                "mlb_game_pk": row["mlb_game_pk"],
                "game_date": row["game_date"],
                "start_time_utc": row["start_time_utc"],
                "game_status": row["game_status"],
                "away_team": row["away_team"],
                "home_team": row["home_team"],
                "away_pitcher": None,
                "home_pitcher": None,
            },
        )
        if row["pitcher_team_id"] is None:
            continue
        pitcher = {
            "mlb_player_id": row["pitcher_mlb_id"],
            "name": row["pitcher_name"] or "TBD",
            "hand": row["pitcher_hand"],
            "confirmation_status": row["confirmation_status"],
            "source_name": row["source_name"],
            "updated_at": row["updated_at"],
        }
        if row["pitcher_team_id"] == row["away_team_id"]:
            item["away_pitcher"] = pitcher
        elif row["pitcher_team_id"] == row["home_team_id"]:
            item["home_pitcher"] = pitcher
    return list(by_game.values())


def pitcher_label(pitcher: dict[str, Any] | None) -> str:
    if not pitcher:
        return "TBD"
    hand = f" ({pitcher['hand']})" if pitcher.get("hand") else ""
    status = f" [{pitcher['confirmation_status']}]" if pitcher.get("confirmation_status") else ""
    return f"{pitcher['name']}{hand}{status}"


def print_probable_starters(rows: list[dict[str, Any]], date_text: str) -> None:
    print(f"Typed probable starter games for {date_text}: {len(rows)}")
    for row in rows:
        print(
            f"- {row['away_team']} @ {row['home_team']} | "
            f"{pitcher_label(row['away_pitcher'])} vs {pitcher_label(row['home_pitcher'])}"
        )


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Typed MLB warehouse CLI for sql-mlb.db. This is the replacement surface for legacy mlb_warehouse.py commands."
    )
    parser.add_argument("--db", type=Path, default=DEFAULT_DB_PATH, help="Typed MLB SQLite DB path.")
    parser.add_argument("--version", action="version", version=f"mlb_typed_warehouse {VERSION}")
    subparsers = parser.add_subparsers(dest="command", required=True)

    status_parser = subparsers.add_parser("status", help="Print typed MLB DB status and recent source freshness rows.")
    status_parser.add_argument("--date", help="Optional YYYY-MM-DD source status date filter.")
    status_parser.add_argument("--json", action="store_true", help="Emit JSON instead of text.")

    probables_parser = subparsers.add_parser("list-probable-starters", help="Read probable starters from typed tables.")
    probables_parser.add_argument("--date", required=True, help="Game date in YYYY-MM-DD format.")
    probables_parser.add_argument("--json", action="store_true", help="Emit JSON instead of text.")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    db_path = resolve_path(args.db)
    with connect(db_path) as conn:
        if args.command == "status":
            payload = status_payload(conn, db_path, args.date)
            if args.json:
                print(json.dumps(payload, indent=2, sort_keys=True))
            else:
                print_status(payload)
            return 0
        if args.command == "list-probable-starters":
            rows = probable_starter_rows(conn, args.date)
            if args.json:
                print(json.dumps({"date": args.date, "games": rows}, indent=2, sort_keys=True))
            else:
                print_probable_starters(rows, args.date)
            return 0
    raise ValueError(f"Unhandled command: {args.command}")


if __name__ == "__main__":
    raise SystemExit(main())
