#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import math
import sqlite3
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from pipeline.sources.mlb.normalization.common import compact_json, stable_id, utc_now, write_report  # noqa: E402


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--date", required=True)
    parser.add_argument(
        "--source-db",
        type=Path,
        default=ROOT / "data-private" / "warehouse" / "sports" / "mlb" / "sql-mlb.db",
    )
    parser.add_argument(
        "--report",
        type=Path,
        default=ROOT / "data-migration" / "reports" / "derive_mlb_team_rolling_form_from_typed.json",
    )
    return parser.parse_args()


def avg(values: list[float]) -> float | None:
    return sum(values) / len(values) if values else None


def pstdev(values: list[float]) -> float | None:
    if not values:
        return None
    mean = avg(values) or 0
    return math.sqrt(sum((value - mean) ** 2 for value in values) / len(values))


def scheduled_team_ids(con: sqlite3.Connection, date_text: str) -> list[str]:
    rows = con.execute(
        """
        select away_team_id as team_id from games where game_date = ?
        union
        select home_team_id as team_id from games where game_date = ?
        order by team_id
        """,
        (date_text, date_text),
    ).fetchall()
    return [row["team_id"] for row in rows]


def recent_rows(con: sqlite3.Connection, team_id: str, date_text: str, window: int) -> list[sqlite3.Row]:
    return con.execute(
        """
        select *
        from team_game_stats
        where team_id = ?
          and game_date < ?
        order by game_date desc, game_id desc
        limit ?
        """,
        (team_id, date_text, window),
    ).fetchall()


def derive_form_row(team_id: str, date_text: str, window: int, rows: list[sqlite3.Row]) -> dict | None:
    if not rows:
        return None
    runs = [float(row["runs_scored"] or 0) for row in rows]
    runs_allowed = [float(row["runs_allowed"] or 0) for row in rows]
    hits = [float(row["hits"] or 0) for row in rows]
    hits_allowed = [float(row["hits_allowed"] or 0) for row in rows]
    home_runs = [float(row["home_runs"] or 0) for row in rows]
    home_runs_allowed = [float(row["home_runs_allowed"] or 0) for row in rows]
    first5_runs = [float(row["runs_scored_first5"] or 0) for row in rows]
    first5_allowed = [float(row["runs_allowed_first5"] or 0) for row in rows]
    bullpen_runs = [float(row["bullpen_runs_scored"] or 0) for row in rows]
    bullpen_allowed = [float(row["bullpen_runs_allowed"] or 0) for row in rows]
    at_bats = [float(row["at_bats"] or 0) for row in rows]
    recent3 = rows[:3]
    recent3_runs = [float(row["runs_scored"] or 0) for row in recent3]
    recent3_hr = [float(row["home_runs"] or 0) for row in recent3]
    row = {
        "team_rolling_form_snapshot_id": stable_id("team-rolling-form", team_id, date_text, window),
        "team_id": team_id,
        "snapshot_date": date_text,
        "window_games": window,
        "games_sample": len(rows),
        "wins": sum(1 for record in rows if record["result"] == "win"),
        "losses": sum(1 for record in rows if record["result"] == "loss"),
        "runs_scored_per_game": avg(runs),
        "runs_allowed_per_game": avg(runs_allowed),
        "run_diff_per_game": avg([left - right for left, right in zip(runs, runs_allowed)]),
        "first5_runs_scored_per_game": avg(first5_runs),
        "first5_runs_allowed_per_game": avg(first5_allowed),
        "first5_run_diff_per_game": avg([left - right for left, right in zip(first5_runs, first5_allowed)]),
        "bullpen_runs_scored_per_game": avg(bullpen_runs),
        "bullpen_runs_allowed_per_game": avg(bullpen_allowed),
        "hits_per_game": avg(hits),
        "hits_allowed_per_game": avg(hits_allowed),
        "hit_efficiency": (sum(hits) / sum(at_bats)) if sum(at_bats) else None,
        "home_runs_per_game": avg(home_runs),
        "home_runs_allowed_per_game": avg(home_runs_allowed),
        "home_run_burstiness": pstdev(home_runs),
        "scoring_volatility": pstdev(runs),
        "recent_3_runs_delta": (avg(recent3_runs) or 0) - (avg(runs) or 0),
        "recent_3_home_runs_delta": (avg(recent3_hr) or 0) - (avg(home_runs) or 0),
    }
    return row


def write_form_row(con: sqlite3.Connection, row: dict) -> None:
    columns = [
        "team_rolling_form_snapshot_id",
        "team_id",
        "snapshot_date",
        "window_games",
        "games_sample",
        "wins",
        "losses",
        "runs_scored_per_game",
        "runs_allowed_per_game",
        "run_diff_per_game",
        "first5_runs_scored_per_game",
        "first5_runs_allowed_per_game",
        "first5_run_diff_per_game",
        "bullpen_runs_scored_per_game",
        "bullpen_runs_allowed_per_game",
        "hits_per_game",
        "hits_allowed_per_game",
        "hit_efficiency",
        "home_runs_per_game",
        "home_runs_allowed_per_game",
        "home_run_burstiness",
        "scoring_volatility",
        "recent_3_runs_delta",
        "recent_3_home_runs_delta",
        "source_table",
        "source_pk",
        "source_detail_json",
        "created_at",
    ]
    source_pk = compact_json({"team_id": row["team_id"], "snapshot_date": row["snapshot_date"], "window_games": row["window_games"]})
    values = {
        **row,
        "source_table": "typed_team_rolling_form_from_results",
        "source_pk": source_pk,
        "source_detail_json": compact_json(row),
        "created_at": utc_now(),
    }
    placeholders = ",".join("?" for _ in columns)
    update = ", ".join(f"{column}=excluded.{column}" for column in columns[1:])
    con.execute(
        f"""
        insert into team_rolling_form_snapshots ({", ".join(columns)})
        values ({placeholders})
        on conflict(team_rolling_form_snapshot_id) do update set {update}
        """,
        [values[column] for column in columns],
    )


def main() -> int:
    args = parse_args()
    source_db = args.source_db if args.source_db.is_absolute() else ROOT / args.source_db
    report_path = args.report if args.report.is_absolute() else ROOT / args.report
    inserted = 0
    with sqlite3.connect(source_db) as con:
        con.row_factory = sqlite3.Row
        for team_id in scheduled_team_ids(con, args.date):
            for window in (3, 5, 10):
                row = derive_form_row(team_id, args.date, window, recent_rows(con, team_id, args.date, window))
                if row:
                    write_form_row(con, row)
                    inserted += 1
        con.commit()
    payload = {
        "ok": True,
        "date": args.date,
        "inserted": inserted,
        "generated_at": utc_now(),
        "script": "data-migration/scripts/derive_mlb_team_rolling_form_from_typed.py",
        "source_db": str(source_db.relative_to(ROOT)),
    }
    write_report(report_path, payload)
    print(json.dumps(payload, indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
