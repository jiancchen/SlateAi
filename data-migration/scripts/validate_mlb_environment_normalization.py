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

from pipeline.sources.mlb.normalization.common import append_normalization_event, utc_now, write_report
from pipeline.sources.mlb.normalization.environment import ENVIRONMENT_SOURCE_TABLES


SOURCE_TO_TARGET = {
    "mlb_game_sun_visibility_snapshots": "game_sun_visibility_snapshots",
    "mlb_game_visibility_outcomes": "game_visibility_outcomes",
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--date")
    parser.add_argument("--source-db", type=Path, default=ROOT / "data-private" / "warehouse" / "sports" / "mlb" / "sql-mlb.db")
    parser.add_argument("--report", type=Path, default=ROOT / "data-migration" / "reports" / "validate_mlb_environment_normalization_2026-06-02.json")
    args = parser.parse_args()
    if not args.source_db.is_absolute():
        args.source_db = ROOT / args.source_db
    if not args.report.is_absolute():
        args.report = ROOT / args.report
    return args


def main() -> int:
    args = parse_args()
    placeholders = ",".join("?" for _ in ENVIRONMENT_SOURCE_TABLES)
    params: list[str] = ["mlb", *ENVIRONMENT_SOURCE_TABLES]
    where = f"sport = ? and source_table in ({placeholders})"
    if args.date:
        where += " and source_date like ?"
        params.append(f"{args.date}%")
    with sqlite3.connect(args.source_db) as con:
        con.row_factory = sqlite3.Row
        source_table_counts = {
            row["source_table"]: row["n"]
            for row in con.execute(
                f"""
                select source_table, count(*) as n
                from legacy_table_rows
                where {where}
                group by source_table
                """,
                params,
            ).fetchall()
        }
        source_rows = sum(source_table_counts.values())
        target_counts = {target: con.execute(f"select count(*) from {target}").fetchone()[0] for target in SOURCE_TO_TARGET.values()}
        orphan_checks = {
            "game_sun_visibility_snapshots": con.execute(
                """
                select count(*) from game_sun_visibility_snapshots s
                left join games g on g.game_id = s.game_id
                where g.game_id is null
                """
            ).fetchone()[0],
            "game_visibility_outcomes": con.execute(
                """
                select count(*) from game_visibility_outcomes o
                left join games g on g.game_id = o.game_id
                where g.game_id is null
                """
            ).fetchone()[0],
        }
        unresolved = con.execute(
            "select count(*) from unresolved_entities where entity_type = 'mlb_environment_game'"
        ).fetchone()[0]
        errors: list[str] = []
        if source_rows <= 0:
            errors.append("No MLB environment source rows found.")
        for source_table, target_table in SOURCE_TO_TARGET.items():
            expected = source_table_counts.get(source_table, 0)
            actual = target_counts.get(target_table, 0)
            if expected and actual < expected:
                errors.append(f"{target_table} has {actual} rows, below source {source_table} count {expected}.")
        for table, count in orphan_checks.items():
            if count:
                errors.append(f"{table} has {count} orphan game references.")
        report = {
            "generated_at": utc_now(),
            "script": "data-migration/scripts/validate_mlb_environment_normalization.py",
            "parser_module": "pipeline/sources/mlb/normalization/environment.py",
            "source_db": str(args.source_db.relative_to(ROOT)),
            "date": args.date,
            "source_rows": source_rows,
            "source_table_counts": source_table_counts,
            "target_counts": target_counts,
            "orphan_checks": orphan_checks,
            "unresolved_environment_entities": unresolved,
            "errors": errors,
            "ok": not errors,
        }
        if not errors:
            con.execute(
                """
                insert into health_checks (
                  health_check_id, model_run_id, check_name, status,
                  expected_count, actual_count, details_json, checked_at
                ) values (?, null, 'mlb_environment_normalization', 'ok', ?, ?, ?, ?)
                """,
                (
                    f"mlb-environment-normalization-{utc_now().replace(':', '-').replace('.', '-')}",
                    source_rows,
                    sum(target_counts.values()),
                    json.dumps(report, sort_keys=True),
                    utc_now(),
                ),
            )
            con.commit()
    write_report(args.report, report)
    append_normalization_event(
        ROOT,
        {
            "event_id": f"validate-mlb-environment-{utc_now().replace(':', '-').replace('.', '-')}",
            "timestamp": utc_now(),
            "phase": "N15",
            "area": "mlb_environment_normalization_validation",
            "source": "sql-mlb.db:legacy_table_rows",
            "target": "sql-mlb.db:game_sun_visibility_snapshots,game_visibility_outcomes",
            "parser_module": "pipeline/sources/mlb/normalization/environment.py",
            "migration_script": "data-migration/scripts/validate_mlb_environment_normalization.py",
            "validation": "passed" if report["ok"] else "; ".join(errors),
            "status_from": "inserted",
            "status_to": "validated" if report["ok"] else "blocked",
            "report_path": str(args.report.relative_to(ROOT)),
            "checksum": None,
            "notes": json.dumps({"source_rows": source_rows, "target_counts": target_counts, "unresolved": unresolved}, sort_keys=True),
        },
    )
    print(json.dumps(report, indent=2, sort_keys=True))
    return 0 if report["ok"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
