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


SOURCE_NAME = "tennis_rankings"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--date", required=True)
    parser.add_argument(
        "--source-db",
        type=Path,
        default=ROOT / "data-private" / "warehouse" / "sports" / "tennis" / "sql-tennis.db",
    )
    parser.add_argument(
        "--report",
        type=Path,
        default=ROOT / "data-migration" / "reports" / "validate_tennis_rankings_raw_to_typed_2026-06-02.json",
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
            (SOURCE_NAME, args.date),
        )
        linked_rankings = scalar(
            con,
            """
            select count(*)
            from rankings
            where ranking_date = ?
              and source_snapshot_id in (
                select source_snapshot_id
                from source_snapshots
                where sport = 'tennis'
                  and source_name = ?
                  and source_date = ?
              )
            """,
            (args.date, SOURCE_NAME, args.date),
        )
        by_tour = con.execute(
            """
            select tour, count(*) as row_count
            from rankings
            where ranking_date = ?
              and source_snapshot_id in (
                select source_snapshot_id
                from source_snapshots
                where sport = 'tennis'
                  and source_name = ?
                  and source_date = ?
              )
            group by tour
            order by tour
            """,
            (args.date, SOURCE_NAME, args.date),
        ).fetchall()
        status = con.execute(
            """
            select *
            from source_fetch_status
            where sport = 'tennis'
              and source_name = ?
              and source_date = ?
            """,
            (SOURCE_NAME, args.date),
        ).fetchone()
        health = con.execute(
            "select * from health_checks where health_check_id = ?",
            (f"tennis-rankings-raw-to-typed:{args.date}",),
        ).fetchone()
        duplicate_rankings = scalar(
            con,
            """
            select count(*)
            from (
              select ranking_id
              from rankings
              group by ranking_id
              having count(*) > 1
            )
            """,
        )
        orphan_rankings = scalar(
            con,
            """
            select count(*)
            from rankings r
            left join players p on p.player_id = r.player_id
            where r.ranking_date = ?
              and r.source_snapshot_id in (
                select source_snapshot_id
                from source_snapshots
                where sport = 'tennis'
                  and source_name = ?
                  and source_date = ?
              )
              and p.player_id is null
            """,
            (args.date, SOURCE_NAME, args.date),
        )
        open_unresolved = scalar(
            con,
            """
            select count(*)
            from unresolved_entities
            where source_name = ?
              and status = 'open'
            """,
            (SOURCE_NAME,),
        )

    errors = []
    if source_files <= 0:
        errors.append("No dated tennis ranking source snapshots found.")
    if linked_rankings <= 0:
        errors.append("No rankings linked to dated tennis ranking source snapshots.")
    if linked_rankings < 100:
        errors.append(f"Ranking coverage is unexpectedly low: {linked_rankings}")
    if status is None:
        errors.append("Missing source_fetch_status for tennis_rankings date.")
    elif status["last_status"] not in {"success", "partial", "skipped_cache"}:
        errors.append(f"Blocking source_fetch_status: {status['last_status']}")
    if health is None:
        errors.append("Missing health_checks row for tennis rankings raw-to-typed adapter.")
    elif health["status"] != "ok":
        errors.append(f"Blocking health check status: {health['status']}")
    if duplicate_rankings != 0:
        errors.append(f"Duplicate ranking IDs: {duplicate_rankings}")
    if orphan_rankings != 0:
        errors.append(f"Orphan dated ranking rows: {orphan_rankings}")

    return {
        "generated_at": utc_now(),
        "script": "data-migration/scripts/validate_tennis_rankings_raw_to_typed.py",
        "source_db": str(args.source_db.relative_to(ROOT)),
        "date": args.date,
        "source_files": source_files,
        "linked_rankings": linked_rankings,
        "rankings_by_tour": [dict(row) for row in by_tour],
        "source_fetch_status": dict(status) if status else None,
        "health_check": dict(health) if health else None,
        "duplicate_rankings": duplicate_rankings,
        "orphan_rankings": orphan_rankings,
        "open_rankings_unresolved": open_unresolved,
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
            "event_id": f"validate-phase9d-tennis-rankings-raw-to-typed-{args.date}-{utc_now().replace(':', '-').replace('.', '-')}",
            "timestamp": utc_now(),
            "phase": "9D",
            "area": "tennis_rankings_raw_to_typed_validation",
            "source": "sql-tennis.db:source_snapshots:tennis_rankings",
            "target": "sql-tennis.db:rankings,source_fetch_status",
            "parser_module": "pipeline/sources/tennis/normalization/rankings.py",
            "migration_script": "data-migration/scripts/validate_tennis_rankings_raw_to_typed.py",
            "validation": "passed" if report["ok"] else "; ".join(report["errors"]),
            "status_from": "inserted",
            "status_to": "validated" if report["ok"] else "blocked",
            "report_path": str(args.report.relative_to(ROOT)),
            "checksum": None,
            "notes": compact_json(
                {
                    "source_files": report["source_files"],
                    "linked_rankings": report["linked_rankings"],
                    "by_tour": report["rankings_by_tour"],
                    "open_unresolved": report["open_rankings_unresolved"],
                }
            ),
        },
    )
    print(json.dumps(report, indent=2, sort_keys=True))
    return 0 if report["ok"] else 1


if __name__ == "__main__":
    raise SystemExit(main())

