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

from pipeline.sources.tennis.normalization.common import (
    append_normalization_event,
    compact_json,
    utc_now,
    write_report,
)


PROVIDERS = {
    "sofascore": {
        "source_name": "tennis_sofascore_replay",
        "db_source_name": "sofascore",
    },
    "livesport": {
        "source_name": "tennis_livesport_replay",
        "db_source_name": "livesport",
    },
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--date", required=True)
    parser.add_argument("--provider", choices=sorted(PROVIDERS), required=True)
    parser.add_argument(
        "--source-db",
        type=Path,
        default=ROOT / "data-private" / "warehouse" / "sports" / "tennis" / "sql-tennis.db",
    )
    parser.add_argument(
        "--report",
        type=Path,
        default=ROOT / "data-migration" / "reports" / "validate_tennis_replay_raw_to_typed_2026-06-02.json",
    )
    parser.add_argument(
        "--allow-missing",
        action="store_true",
        help="Treat a missing optional provider/date as nonblocking while still writing a validation report.",
    )
    args = parser.parse_args()
    if not args.source_db.is_absolute():
        args.source_db = ROOT / args.source_db
    if not args.report.is_absolute():
        args.report = ROOT / args.report
    return args


def scalar(con: sqlite3.Connection, sql: str, params: tuple = ()) -> int:
    return int(con.execute(sql, params).fetchone()[0] or 0)


def validate(args: argparse.Namespace) -> dict:
    provider = PROVIDERS[args.provider]
    with sqlite3.connect(args.source_db) as con:
        con.row_factory = sqlite3.Row
        source_files = scalar(
            con,
            """
            select count(*)
            from source_snapshots
            where sport = 'tennis'
              and source_name = ?
              and source_date = ?
            """,
            (provider["source_name"], args.date),
        )
        replay_games = scalar(
            con,
            """
            select count(*)
            from replay_games
            where source_name = ?
              and source_snapshot_id in (
                select source_snapshot_id
                from source_snapshots
                where sport = 'tennis'
                  and source_name = ?
                  and source_date = ?
              )
            """,
            (provider["db_source_name"], provider["source_name"], args.date),
        )
        replay_points = scalar(
            con,
            """
            select count(*)
            from replay_points
            where source_name = ?
              and source_snapshot_id in (
                select source_snapshot_id
                from source_snapshots
                where sport = 'tennis'
                  and source_name = ?
                  and source_date = ?
              )
            """,
            (provider["db_source_name"], provider["source_name"], args.date),
        )
        points_with_server = scalar(
            con,
            """
            select count(*)
            from replay_points
            where source_name = ?
              and server_player_id is not null
              and source_snapshot_id in (
                select source_snapshot_id
                from source_snapshots
                where sport = 'tennis'
                  and source_name = ?
                  and source_date = ?
              )
            """,
            (provider["db_source_name"], provider["source_name"], args.date),
        )
        deuce_points = scalar(
            con,
            """
            select count(*)
            from replay_points
            where source_name = ?
              and is_deuce = 1
              and source_snapshot_id in (
                select source_snapshot_id
                from source_snapshots
                where sport = 'tennis'
                  and source_name = ?
                  and source_date = ?
              )
            """,
            (provider["db_source_name"], provider["source_name"], args.date),
        )
        break_points = scalar(
            con,
            """
            select count(*)
            from replay_points
            where source_name = ?
              and is_break_point = 1
              and source_snapshot_id in (
                select source_snapshot_id
                from source_snapshots
                where sport = 'tennis'
                  and source_name = ?
                  and source_date = ?
              )
            """,
            (provider["db_source_name"], provider["source_name"], args.date),
        )
        duplicate_game_ids = scalar(
            con,
            """
            select count(*)
            from (
              select replay_game_id
              from replay_games
              group by replay_game_id
              having count(*) > 1
            )
            """,
        )
        duplicate_point_ids = scalar(
            con,
            """
            select count(*)
            from (
              select replay_point_id
              from replay_points
              group by replay_point_id
              having count(*) > 1
            )
            """,
        )
        orphan_points = scalar(
            con,
            """
            select count(*)
            from replay_points rp
            left join replay_games rg on rg.replay_game_id = rp.replay_game_id
            where rp.source_name = ?
              and rp.source_snapshot_id in (
                select source_snapshot_id
                from source_snapshots
                where sport = 'tennis'
                  and source_name = ?
                  and source_date = ?
              )
              and rg.replay_game_id is null
            """,
            (provider["db_source_name"], provider["source_name"], args.date),
        )
        open_unresolved = scalar(
            con,
            """
            select count(*)
            from unresolved_entities
            where source_name = ?
              and status = 'open'
            """,
            (provider["db_source_name"],),
        )
        status = con.execute(
            """
            select *
            from source_fetch_status
            where sport = 'tennis'
              and source_name = ?
              and source_date = ?
            """,
            (provider["source_name"], args.date),
        ).fetchone()
        health = con.execute(
            """
            select *
            from health_checks
            where health_check_id = ?
            """,
            (f"tennis-{provider['db_source_name']}-replay-raw-to-typed:{args.date}",),
        ).fetchone()

    errors = []
    optional_missing = args.allow_missing and source_files == 0
    if source_files <= 0 and not optional_missing:
        errors.append(f"No dated {args.provider} replay source snapshots found.")
    if replay_games <= 0 and not optional_missing:
        errors.append(f"No {args.provider} replay_games linked to dated source snapshots.")
    if replay_points <= 0 and not optional_missing:
        errors.append(f"No {args.provider} replay_points linked to dated source snapshots.")
    if points_with_server <= 0 and replay_points > 0:
        errors.append(f"No {args.provider} replay_points have server_player_id mapped.")
    if status is None and not optional_missing:
        errors.append(f"Missing source_fetch_status for {provider['source_name']} date.")
    elif status is not None and status["last_status"] not in {"success", "partial", "skipped_cache"}:
        errors.append(f"Blocking source_fetch_status: {status['last_status']}")
    if health is None and not optional_missing:
        errors.append(f"Missing health_checks row for {args.provider} replay raw-to-typed adapter.")
    elif health is not None and health["status"] != "ok":
        errors.append(f"Blocking health check status: {health['status']}")
    if duplicate_game_ids != 0:
        errors.append(f"Duplicate replay_game_id rows: {duplicate_game_ids}")
    if duplicate_point_ids != 0:
        errors.append(f"Duplicate replay_point_id rows: {duplicate_point_ids}")
    if orphan_points != 0:
        errors.append(f"Orphan {args.provider} replay points: {orphan_points}")

    return {
        "generated_at": utc_now(),
        "script": "data-migration/scripts/validate_tennis_replay_raw_to_typed.py",
        "source_db": str(args.source_db.relative_to(ROOT)),
        "date": args.date,
        "provider": args.provider,
        "source_name": provider["source_name"],
        "source_files": source_files,
        "replay_games_with_source_snapshot": replay_games,
        "replay_points_with_source_snapshot": replay_points,
        "replay_points_with_server": points_with_server,
        "deuce_points": deuce_points,
        "break_points": break_points,
        "duplicate_game_ids": duplicate_game_ids,
        "duplicate_point_ids": duplicate_point_ids,
        "orphan_points": orphan_points,
        "open_replay_unresolved": open_unresolved,
        "source_fetch_status": dict(status) if status else None,
        "health_check": dict(health) if health else None,
        "optional_missing": optional_missing,
        "ok": not errors,
        "errors": errors,
    }


def main() -> int:
    args = parse_args()
    report = validate(args)
    write_report(args.report, report)
    append_normalization_event(
        ROOT,
        {
            "event_id": f"validate-phase9b-tennis-{args.provider}-replay-raw-to-typed-{args.date}-{utc_now().replace(':', '-').replace('.', '-')}",
            "timestamp": utc_now(),
            "phase": "9B.2",
            "area": f"tennis_{args.provider}_replay_raw_to_typed_validation",
            "source": f"sql-tennis.db:source_snapshots:{report['source_name']}",
            "target": "sql-tennis.db:replay_games,replay_points,source_fetch_status",
            "parser_module": "pipeline/sources/tennis/normalization/replay.py",
            "migration_script": "data-migration/scripts/validate_tennis_replay_raw_to_typed.py",
            "validation": "passed" if report["ok"] else "; ".join(report["errors"]),
            "status_from": "inserted",
            "status_to": "validated" if report["ok"] else "blocked",
            "report_path": str(args.report.relative_to(ROOT)),
            "checksum": None,
            "notes": compact_json(
                {
                    "source_files": report["source_files"],
                    "replay_games": report["replay_games_with_source_snapshot"],
                    "replay_points": report["replay_points_with_source_snapshot"],
                    "points_with_server": report["replay_points_with_server"],
                    "optional_missing": report["optional_missing"],
                }
            ),
        },
    )
    print(json.dumps(report, indent=2, sort_keys=True))
    return 0 if report["ok"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
