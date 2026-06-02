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


SOURCE_NAME = "tennis_player_context"


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
        default=ROOT / "data-migration" / "reports" / "validate_tennis_player_context_raw_to_typed_2026-06-02.json",
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
        source_snapshot_ids_sql = """
            select source_snapshot_id
            from source_snapshots
            where sport = 'tennis'
              and source_name = ?
              and source_date = ?
        """
        player_snapshots = scalar(
            con,
            f"""
            select count(*)
            from player_form_snapshots
            where features_json like '%flashscore_%'
              and (
                features_json like '%' || (select source_snapshot_id from ({source_snapshot_ids_sql}) limit 1) || '%'
                or snapshot_date like ?
              )
            """,
            (SOURCE_NAME, args.date, f"{args.date}%"),
        )
        recent_matches = scalar(
            con,
            f"""
            select count(*)
            from recent_matches
            where source_snapshot_id in ({source_snapshot_ids_sql})
            """,
            (SOURCE_NAME, args.date),
        )
        pressure_rows = scalar(
            con,
            """
            select count(*)
            from service_pressure_snapshots
            where source_name = 'flashscore_recent_match_map'
              and sample_type = 'recent_match_flashscore'
              and match_id in (
                select match_id
                from matches
                where match_date = ?
              )
            """,
            (args.date,),
        )
        pressure_with_bp_denominators = scalar(
            con,
            """
            select count(*)
            from service_pressure_snapshots
            where source_name = 'flashscore_recent_match_map'
              and sample_type = 'recent_match_flashscore'
              and match_id in (
                select match_id
                from matches
                where match_date = ?
              )
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
              and source_name = ?
              and source_date = ?
            """,
            (SOURCE_NAME, args.date),
        ).fetchone()
        health = con.execute(
            "select * from health_checks where health_check_id = ?",
            (f"tennis-player-context-raw-to-typed:{args.date}",),
        ).fetchone()
        duplicate_recent = scalar(
            con,
            """
            select count(*)
            from (
              select recent_match_id
              from recent_matches
              group by recent_match_id
              having count(*) > 1
            )
            """,
        )
        duplicate_pressure = scalar(
            con,
            """
            select count(*)
            from (
              select pressure_snapshot_id
              from service_pressure_snapshots
              group by pressure_snapshot_id
              having count(*) > 1
            )
            """,
        )
        orphan_pressure = scalar(
            con,
            """
            select count(*)
            from service_pressure_snapshots sp
            left join players p on p.player_id = sp.player_id
            left join matches m on m.match_id = sp.match_id
            where sp.source_name = 'flashscore_recent_match_map'
              and sp.sample_type = 'recent_match_flashscore'
              and sp.match_id in (
                select match_id
                from matches
                where match_date = ?
              )
              and (p.player_id is null or m.match_id is null)
            """,
            (args.date,),
        )
        open_unresolved = scalar(
            con,
            """
            select count(*)
            from unresolved_entities
            where source_name in ('flashscore_player_pages', 'flashscore_recent_match_map')
              and status = 'open'
            """,
        )

    errors = []
    if source_files < 2:
        errors.append(f"Expected 2 tennis player-context source snapshots, found {source_files}.")
    if player_snapshots <= 0:
        errors.append("No Flashscore player form snapshots found.")
    if recent_matches <= 0:
        errors.append("No source-linked Flashscore recent matches found.")
    if pressure_rows <= 0:
        errors.append("No Flashscore recent service-pressure rows found.")
    if pressure_with_bp_denominators <= 0:
        errors.append("No BP denominator rows found in Flashscore recent service-pressure rows.")
    if status is None:
        errors.append("Missing source_fetch_status for tennis_player_context date.")
    elif status["last_status"] not in {"success", "partial", "skipped_cache"}:
        errors.append(f"Blocking source_fetch_status: {status['last_status']}")
    if health is None:
        errors.append("Missing health_checks row for tennis player-context raw-to-typed adapter.")
    elif health["status"] != "ok":
        errors.append(f"Blocking health check status: {health['status']}")
    if duplicate_recent != 0:
        errors.append(f"Duplicate recent match IDs: {duplicate_recent}")
    if duplicate_pressure != 0:
        errors.append(f"Duplicate service-pressure IDs: {duplicate_pressure}")
    if orphan_pressure != 0:
        errors.append(f"Orphan Flashscore recent pressure rows: {orphan_pressure}")

    return {
        "generated_at": utc_now(),
        "script": "data-migration/scripts/validate_tennis_player_context_raw_to_typed.py",
        "source_db": str(args.source_db.relative_to(ROOT)),
        "date": args.date,
        "source_files": source_files,
        "player_form_snapshots": player_snapshots,
        "recent_matches": recent_matches,
        "service_pressure_rows": pressure_rows,
        "pressure_with_bp_denominators": pressure_with_bp_denominators,
        "source_fetch_status": dict(status) if status else None,
        "health_check": dict(health) if health else None,
        "duplicate_recent_matches": duplicate_recent,
        "duplicate_service_pressure": duplicate_pressure,
        "orphan_service_pressure": orphan_pressure,
        "open_context_unresolved": open_unresolved,
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
            "event_id": f"validate-phase9e-tennis-player-context-raw-to-typed-{args.date}-{utc_now().replace(':', '-').replace('.', '-')}",
            "timestamp": utc_now(),
            "phase": "9E",
            "area": "tennis_player_context_raw_to_typed_validation",
            "source": "sql-tennis.db:source_snapshots:tennis_player_context",
            "target": "sql-tennis.db:player_form_snapshots,recent_matches,service_pressure_snapshots,source_fetch_status",
            "parser_module": "pipeline/sources/tennis/normalization/context.py",
            "migration_script": "data-migration/scripts/validate_tennis_player_context_raw_to_typed.py",
            "validation": "passed" if report["ok"] else "; ".join(report["errors"]),
            "status_from": "inserted",
            "status_to": "validated" if report["ok"] else "blocked",
            "report_path": str(args.report.relative_to(ROOT)),
            "checksum": None,
            "notes": compact_json(
                {
                    "source_files": report["source_files"],
                    "player_form_snapshots": report["player_form_snapshots"],
                    "recent_matches": report["recent_matches"],
                    "pressure_rows": report["service_pressure_rows"],
                    "bp_denominator_rows": report["pressure_with_bp_denominators"],
                }
            ),
        },
    )
    print(json.dumps(report, indent=2, sort_keys=True))
    return 0 if report["ok"] else 1


if __name__ == "__main__":
    raise SystemExit(main())

