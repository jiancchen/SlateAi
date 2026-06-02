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
from pipeline.sources.mlb.normalization.pitcher_features import PITCHER_SOURCE_TABLES


SOURCE_TO_TARGET = {
    "mlb_pitcher_pitch_mix_daily": "pitcher_pitch_mix_snapshots",
    "mlb_starting_pitcher_rolling_form": "starting_pitcher_form_snapshots",
    "mlb_starter_leash_profiles": "starter_leash_profiles",
    "mlb_pitcher_first_inning_profiles_daily": "pitcher_first_inning_profiles",
    "mlb_pitcher_mistake_shape_daily": "pitcher_mistake_shape_snapshots",
    "mlb_starter_third_time_penalty_profiles": "starter_third_time_penalty_profiles",
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--date")
    parser.add_argument("--source-db", type=Path, default=ROOT / "data-private" / "warehouse" / "sports" / "mlb" / "sql-mlb.db")
    parser.add_argument("--report", type=Path, default=ROOT / "data-migration" / "reports" / "validate_mlb_pitcher_features_normalization_2026-06-02.json")
    args = parser.parse_args()
    if not args.source_db.is_absolute():
        args.source_db = ROOT / args.source_db
    if not args.report.is_absolute():
        args.report = ROOT / args.report
    return args


def target_count(con: sqlite3.Connection, table: str, date: str | None) -> int:
    if not date:
        return con.execute(f"select count(*) from {table}").fetchone()[0]
    return con.execute(f"select count(*) from {table} where snapshot_date like ?", (f"{date}%",)).fetchone()[0]


def main() -> int:
    args = parse_args()
    placeholders = ",".join("?" for _ in PITCHER_SOURCE_TABLES)
    params: list[str] = ["mlb", *PITCHER_SOURCE_TABLES]
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
        target_counts = {target: target_count(con, target, args.date) for target in SOURCE_TO_TARGET.values()}
        orphan_checks = {
            target: con.execute(
                f"""
                select count(*) from {target} t
                left join players p on p.player_id = t.pitcher_id
                where p.player_id is null
                """
            ).fetchone()[0]
            for target in SOURCE_TO_TARGET.values()
        }
        unresolved = con.execute(
            """
            select count(*) from unresolved_entities
            where entity_type like 'mlb_pitcher_%'
            """
        ).fetchone()[0]
        errors: list[str] = []
        if source_rows <= 0:
            errors.append("No MLB pitcher feature source rows found.")
        for source_table, target_table in SOURCE_TO_TARGET.items():
            expected = source_table_counts.get(source_table, 0)
            actual = target_counts.get(target_table, 0)
            if expected and actual < expected:
                errors.append(f"{target_table} has {actual} rows, below source {source_table} count {expected}.")
        for table, count in orphan_checks.items():
            if count:
                errors.append(f"{table} has {count} orphan pitcher references.")
        report = {
            "generated_at": utc_now(),
            "script": "data-migration/scripts/validate_mlb_pitcher_features_normalization.py",
            "parser_module": "pipeline/sources/mlb/normalization/pitcher_features.py",
            "source_db": str(args.source_db.relative_to(ROOT)),
            "date": args.date,
            "source_rows": source_rows,
            "source_table_counts": source_table_counts,
            "target_counts": target_counts,
            "orphan_checks": orphan_checks,
            "unresolved_pitcher_entities": unresolved,
            "errors": errors,
            "ok": not errors,
        }
        if not errors:
            con.execute(
                """
                insert into health_checks (
                  health_check_id, model_run_id, check_name, status,
                  expected_count, actual_count, details_json, checked_at
                ) values (?, null, 'mlb_pitcher_features_normalization', 'ok', ?, ?, ?, ?)
                """,
                (
                    f"mlb-pitcher-features-normalization-{utc_now().replace(':', '-').replace('.', '-')}",
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
            "event_id": f"validate-mlb-pitcher-features-{utc_now().replace(':', '-').replace('.', '-')}",
            "timestamp": utc_now(),
            "phase": "N12",
            "area": "mlb_pitcher_features_normalization_validation",
            "source": "sql-mlb.db:legacy_table_rows",
            "target": "sql-mlb.db:pitcher_* and starter_* feature tables",
            "parser_module": "pipeline/sources/mlb/normalization/pitcher_features.py",
            "migration_script": "data-migration/scripts/validate_mlb_pitcher_features_normalization.py",
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
