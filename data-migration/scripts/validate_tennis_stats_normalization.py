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

SOURCE_TABLES = [
    "tennis_flashscore_player_stat_rows",
    "tennis_flashscore_stat_rows",
    "tennis_sofascore_player_stat_rows",
    "tennis_sofascore_stat_rows",
]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--date")
    parser.add_argument("--source-db", type=Path, default=ROOT / "data-private" / "warehouse" / "sports" / "tennis" / "sql-tennis.db")
    parser.add_argument("--report", type=Path, default=ROOT / "data-migration" / "reports" / "validate_tennis_stats_normalization_2026-06-02.json")
    args = parser.parse_args()
    if not args.source_db.is_absolute():
        args.source_db = ROOT / args.source_db
    if not args.report.is_absolute():
        args.report = ROOT / args.report
    return args


def main() -> int:
    args = parse_args()
    source_placeholders = ",".join("?" for _ in SOURCE_TABLES)
    params = ["tennis", *SOURCE_TABLES]
    source_where = f"sport = ? and source_table in ({source_placeholders})"
    if args.date:
        source_where += " and source_date like ?"
        params.append(f"{args.date}%")
    with sqlite3.connect(args.source_db) as con:
        con.row_factory = sqlite3.Row
        source_rows = con.execute(f"select count(*) from legacy_table_rows where {source_where}", params).fetchone()[0]
        match_stat_rows = con.execute("select count(*) from match_stat_rows").fetchone()[0]
        pressure_rows = con.execute("select count(*) from service_pressure_snapshots").fetchone()[0]
        bp_saved_with_attempts = con.execute(
            """
            select count(*) from service_pressure_snapshots
            where bp_saved_made is not null and bp_saved_attempts is not null
            """
        ).fetchone()[0]
        bp_converted_with_attempts = con.execute(
            """
            select count(*) from service_pressure_snapshots
            where bp_converted_made is not null and bp_converted_attempts is not null
            """
        ).fetchone()[0]
        orphan_stats = con.execute(
            """
            select count(*) from match_stat_rows ms
            left join matches m on m.match_id = ms.match_id
            left join players p on p.player_id = ms.player_id
            where ms.match_id is not null and (m.match_id is null or p.player_id is null)
            """
        ).fetchone()[0]
        duplicate_ids = con.execute(
            """
            select count(*) from (
              select stat_row_id from match_stat_rows group by stat_row_id having count(*) > 1
            )
            """
        ).fetchone()[0]
        unresolved = con.execute(
            """
            select count(*) from unresolved_entities
            where entity_type in ('tennis_stat_player', 'tennis_stat_match')
            """
        ).fetchone()[0]
        errors = []
        if source_rows <= 0:
            errors.append("No source stat rows found.")
        if match_stat_rows <= 0:
            errors.append("No normalized match_stat_rows inserted.")
        if pressure_rows <= 0:
            errors.append("No normalized service_pressure_snapshots inserted.")
        if bp_saved_with_attempts <= 0 and bp_converted_with_attempts <= 0:
            errors.append("No BP saved/converted numerator-denominator rows were preserved.")
        if orphan_stats:
            errors.append(f"Found {orphan_stats} stat rows with orphan match/player references.")
        if duplicate_ids:
            errors.append(f"Found {duplicate_ids} duplicate stat_row_id values.")
        report = {
            "generated_at": utc_now(),
            "script": "data-migration/scripts/validate_tennis_stats_normalization.py",
            "parser_module": "pipeline/sources/tennis/normalization/stats.py",
            "source_db": str(args.source_db.relative_to(ROOT)),
            "date": args.date,
            "source_rows": source_rows,
            "match_stat_rows": match_stat_rows,
            "service_pressure_rows": pressure_rows,
            "bp_saved_with_attempts": bp_saved_with_attempts,
            "bp_converted_with_attempts": bp_converted_with_attempts,
            "unresolved_stat_entities": unresolved,
            "orphan_stats": orphan_stats,
            "duplicate_ids": duplicate_ids,
            "errors": errors,
            "ok": not errors,
        }
        if not errors:
            con.execute(
                """
                insert into health_checks (
                  health_check_id, model_run_id, check_name, status,
                  expected_count, actual_count, details_json, checked_at
                ) values (?, null, 'tennis_stats_normalization', 'ok', ?, ?, ?, ?)
                """,
                (
                    f"tennis-stats-normalization-{utc_now().replace(':', '-').replace('.', '-')}",
                    source_rows,
                    match_stat_rows,
                    json.dumps(report, sort_keys=True),
                    utc_now(),
                ),
            )
            con.commit()
    write_report(args.report, report)
    append_normalization_event(
        ROOT,
        {
            "event_id": f"validate-tennis-stats-{utc_now().replace(':', '-').replace('.', '-')}",
            "timestamp": utc_now(),
            "phase": "N2",
            "area": "tennis_stats_normalization_validation",
            "source": "sql-tennis.db:legacy_table_rows",
            "target": "sql-tennis.db:match_stat_rows,service_pressure_snapshots",
            "parser_module": "pipeline/sources/tennis/normalization/stats.py",
            "migration_script": "data-migration/scripts/validate_tennis_stats_normalization.py",
            "validation": "passed" if report["ok"] else "; ".join(errors),
            "status_from": "inserted",
            "status_to": "validated" if report["ok"] else "blocked",
            "report_path": str(args.report.relative_to(ROOT)),
            "checksum": None,
            "notes": json.dumps({"match_stat_rows": match_stat_rows, "service_pressure_rows": pressure_rows}, sort_keys=True),
        },
    )
    print(json.dumps(report, indent=2, sort_keys=True))
    return 0 if report["ok"] else 1


if __name__ == "__main__":
    raise SystemExit(main())

