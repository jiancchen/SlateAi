#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import sqlite3
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from pipeline.sources.tennis.normalization.common import append_normalization_event, utc_now, write_report

GAME_SOURCE_TABLES = ["tennis_sofascore_replay_games", "tennis_livesport_replay_games"]
POINT_SOURCE_TABLES = ["tennis_sofascore_replay_points", "tennis_livesport_replay_points"]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--date")
    parser.add_argument("--source-db", type=Path, default=ROOT / "data-private" / "warehouse" / "sports" / "tennis" / "sql-tennis.db")
    parser.add_argument("--report", type=Path, default=ROOT / "data-migration" / "reports" / "validate_tennis_replay_normalization_2026-06-02.json")
    args = parser.parse_args()
    if not args.source_db.is_absolute():
        args.source_db = ROOT / args.source_db
    if not args.report.is_absolute():
        args.report = ROOT / args.report
    return args


def source_count_clause(tables: list[str], date: str | None) -> tuple[str, list[str]]:
    placeholders = ",".join("?" for _ in tables)
    params = ["tennis", *tables]
    where = f"sport = ? and source_table in ({placeholders})"
    if date:
        where += " and source_date like ?"
        params.append(f"{date}%")
    return where, params


def main() -> int:
    args = parse_args()
    with sqlite3.connect(args.source_db) as con:
        con.row_factory = sqlite3.Row
        game_where, game_params = source_count_clause(GAME_SOURCE_TABLES, args.date)
        point_where, point_params = source_count_clause(POINT_SOURCE_TABLES, args.date)
        source_game_rows = con.execute(f"select count(*) from legacy_table_rows where {game_where}", game_params).fetchone()[0]
        source_point_rows = con.execute(f"select count(*) from legacy_table_rows where {point_where}", point_params).fetchone()[0]
        replay_games = con.execute("select count(*) from replay_games").fetchone()[0]
        replay_points = con.execute("select count(*) from replay_points").fetchone()[0]
        orphan_games = con.execute(
            """
            select count(*) from replay_games rg
            left join matches m on m.match_id = rg.match_id
            where m.match_id is null
            """
        ).fetchone()[0]
        orphan_points = con.execute(
            """
            select count(*) from replay_points rp
            left join replay_games rg on rg.replay_game_id = rp.replay_game_id
            where rg.replay_game_id is null
            """
        ).fetchone()[0]
        break_points = con.execute("select count(*) from replay_points where is_break_point = 1").fetchone()[0]
        deuce_points = con.execute("select count(*) from replay_points where is_deuce = 1").fetchone()[0]
        duplicate_games = con.execute(
            "select count(*) from (select replay_game_id from replay_games group by replay_game_id having count(*) > 1)"
        ).fetchone()[0]
        duplicate_points = con.execute(
            "select count(*) from (select replay_point_id from replay_points group by replay_point_id having count(*) > 1)"
        ).fetchone()[0]
        unresolved = con.execute(
            "select count(*) from unresolved_entities where entity_type like 'tennis_replay_%'"
        ).fetchone()[0]
        errors = []
        if source_game_rows <= 0 or source_point_rows <= 0:
            errors.append("Replay source rows are missing.")
        if replay_games <= 0:
            errors.append("No replay_games inserted.")
        if replay_points <= 0:
            errors.append("No replay_points inserted.")
        if orphan_games:
            errors.append(f"Found {orphan_games} replay games with orphan match references.")
        if orphan_points:
            errors.append(f"Found {orphan_points} replay points without replay games.")
        if duplicate_games or duplicate_points:
            errors.append(f"Duplicate replay IDs found: games={duplicate_games}, points={duplicate_points}.")
        report = {
            "generated_at": utc_now(),
            "script": "data-migration/scripts/validate_tennis_replay_normalization.py",
            "parser_module": "pipeline/sources/tennis/normalization/replay.py",
            "source_db": str(args.source_db.relative_to(ROOT)),
            "date": args.date,
            "source_game_rows": source_game_rows,
            "source_point_rows": source_point_rows,
            "replay_games": replay_games,
            "replay_points": replay_points,
            "break_point_rows": break_points,
            "deuce_rows": deuce_points,
            "unresolved_replay_entities": unresolved,
            "orphan_games": orphan_games,
            "orphan_points": orphan_points,
            "duplicate_games": duplicate_games,
            "duplicate_points": duplicate_points,
            "errors": errors,
            "ok": not errors,
        }
        if not errors:
            con.execute(
                """
                insert into health_checks (
                  health_check_id, model_run_id, check_name, status,
                  expected_count, actual_count, details_json, checked_at
                ) values (?, null, 'tennis_replay_normalization', 'ok', ?, ?, ?, ?)
                """,
                (
                    f"tennis-replay-normalization-{utc_now().replace(':', '-').replace('.', '-')}",
                    source_point_rows,
                    replay_points,
                    json.dumps(report, sort_keys=True),
                    utc_now(),
                ),
            )
            con.commit()
    write_report(args.report, report)
    append_normalization_event(
        ROOT,
        {
            "event_id": f"validate-tennis-replay-{utc_now().replace(':', '-').replace('.', '-')}",
            "timestamp": utc_now(),
            "phase": "N3",
            "area": "tennis_replay_normalization_validation",
            "source": "sql-tennis.db:legacy_table_rows",
            "target": "sql-tennis.db:replay_games,replay_points",
            "parser_module": "pipeline/sources/tennis/normalization/replay.py",
            "migration_script": "data-migration/scripts/validate_tennis_replay_normalization.py",
            "validation": "passed" if report["ok"] else "; ".join(errors),
            "status_from": "inserted",
            "status_to": "validated" if report["ok"] else "blocked",
            "report_path": str(args.report.relative_to(ROOT)),
            "checksum": None,
            "notes": json.dumps({"replay_games": replay_games, "replay_points": replay_points}, sort_keys=True),
        },
    )
    print(json.dumps(report, indent=2, sort_keys=True))
    return 0 if report["ok"] else 1


if __name__ == "__main__":
    raise SystemExit(main())

