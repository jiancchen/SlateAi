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
        default=ROOT / "data-migration" / "reports" / "validate_tennis_flashscore_raw_to_typed_2026-06-02.json",
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
              and source_name = 'tennis_reference'
              and source_date = ?
              and local_path like '%/flashscore-match-stats/%'
            """,
            (args.date,),
        )
        match_stat_rows = scalar(
            con,
            """
            select count(*)
            from match_stat_rows
            where source_name = 'flashscore'
              and source_snapshot_id in (
                select source_snapshot_id
                from source_snapshots
                where sport = 'tennis'
                  and source_name = 'tennis_reference'
                  and source_date = ?
                  and local_path like '%/flashscore-match-stats/%'
              )
            """,
            (args.date,),
        )
        pressure_rows = scalar(
            con,
            """
            select count(*)
            from service_pressure_snapshots sp
            join matches m on m.match_id = sp.match_id
            where sp.source_name = 'flashscore'
              and m.match_date = ?
            """,
            (args.date,),
        )
        bp_denominator_rows = scalar(
            con,
            """
            select count(*)
            from service_pressure_snapshots sp
            join matches m on m.match_id = sp.match_id
            where sp.source_name = 'flashscore'
              and m.match_date = ?
              and (
                bp_saved_attempts is not null
                or bp_converted_attempts is not null
              )
            """,
            (args.date,),
        )
        status = con.execute(
            """
            select *
            from source_fetch_status
            where sport = 'tennis'
              and source_name = 'tennis_reference'
              and source_date = ?
            """,
            (args.date,),
        ).fetchone()
        health = con.execute(
            """
            select *
            from health_checks
            where health_check_id = ?
            """,
            (f"tennis-flashscore-raw-to-typed:{args.date}",),
        ).fetchone()
        duplicate_stat_ids = scalar(
            con,
            """
            select count(*)
            from (
              select stat_row_id
              from match_stat_rows
              group by stat_row_id
              having count(*) > 1
            )
            """,
        )
        orphan_stat_rows = scalar(
            con,
            """
            select count(*)
            from match_stat_rows ms
            left join matches m on m.match_id = ms.match_id
            left join players p on p.player_id = ms.player_id
            where ms.source_name = 'flashscore'
              and (m.match_id is null or p.player_id is null)
            """,
        )
        open_unresolved = scalar(
            con,
            """
            select count(*)
            from unresolved_entities
            where source_name = 'flashscore'
              and status = 'open'
            """,
        )

    errors = []
    if source_files <= 0:
        errors.append("No dated Flashscore source snapshots found.")
    if match_stat_rows <= 0:
        errors.append("No Flashscore match_stat_rows linked to dated source snapshots.")
    if pressure_rows <= 0:
        errors.append("No Flashscore service_pressure_snapshots for dated matches.")
    if bp_denominator_rows <= 0:
        errors.append("No BP saved/converted denominator rows for dated matches.")
    if status is None:
        errors.append("Missing source_fetch_status for tennis_reference date.")
    elif status["last_status"] not in {"success", "partial", "skipped_cache"}:
        errors.append(f"Blocking source_fetch_status: {status['last_status']}")
    if health is None:
        errors.append("Missing health_checks row for tennis Flashscore raw-to-typed adapter.")
    elif health["status"] != "ok":
        errors.append(f"Blocking health check status: {health['status']}")
    if duplicate_stat_ids != 0:
        errors.append(f"Duplicate stat_row_id rows: {duplicate_stat_ids}")
    if orphan_stat_rows != 0:
        errors.append(f"Orphan Flashscore stat rows: {orphan_stat_rows}")

    return {
        "generated_at": utc_now(),
        "script": "data-migration/scripts/validate_tennis_flashscore_raw_to_typed.py",
        "source_db": str(args.source_db.relative_to(ROOT)),
        "date": args.date,
        "source_files": source_files,
        "match_stat_rows_with_source_snapshot": match_stat_rows,
        "service_pressure_rows_for_date": pressure_rows,
        "service_pressure_rows_with_bp_denominators": bp_denominator_rows,
        "source_fetch_status": dict(status) if status else None,
        "health_check": dict(health) if health else None,
        "duplicate_stat_ids": duplicate_stat_ids,
        "orphan_stat_rows": orphan_stat_rows,
        "open_flashscore_unresolved": open_unresolved,
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
            "event_id": f"validate-phase9b-tennis-flashscore-raw-to-typed-{args.date}-{utc_now().replace(':', '-').replace('.', '-')}",
            "timestamp": utc_now(),
            "phase": "9B.1",
            "area": "tennis_flashscore_raw_to_typed_validation",
            "source": "sql-tennis.db:source_snapshots",
            "target": "sql-tennis.db:match_stat_rows,service_pressure_snapshots,source_fetch_status",
            "parser_module": "pipeline/sources/tennis/normalization/stats.py",
            "migration_script": "data-migration/scripts/validate_tennis_flashscore_raw_to_typed.py",
            "validation": "passed" if report["ok"] else "; ".join(report["errors"]),
            "status_from": "inserted",
            "status_to": "validated" if report["ok"] else "blocked",
            "report_path": str(args.report.relative_to(ROOT)),
            "checksum": None,
            "notes": compact_json(
                {
                    "source_files": report["source_files"],
                    "match_stat_rows": report["match_stat_rows_with_source_snapshot"],
                    "pressure_rows": report["service_pressure_rows_for_date"],
                    "bp_denominator_rows": report["service_pressure_rows_with_bp_denominators"],
                }
            ),
        },
    )
    print(json.dumps(report, indent=2, sort_keys=True))
    return 0 if report["ok"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
