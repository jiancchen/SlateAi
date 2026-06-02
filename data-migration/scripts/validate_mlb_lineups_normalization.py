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
from pipeline.sources.mlb.normalization.lineups import LINEUP_SOURCE_TABLES


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--date")
    parser.add_argument("--source-db", type=Path, default=ROOT / "data-private" / "warehouse" / "sports" / "mlb" / "sql-mlb.db")
    parser.add_argument("--report", type=Path, default=ROOT / "data-migration" / "reports" / "validate_mlb_lineups_normalization_2026-06-02.json")
    args = parser.parse_args()
    if not args.source_db.is_absolute():
        args.source_db = ROOT / args.source_db
    if not args.report.is_absolute():
        args.report = ROOT / args.report
    return args


def main() -> int:
    args = parse_args()
    placeholders = ",".join("?" for _ in LINEUP_SOURCE_TABLES)
    params: list[str] = ["mlb", *LINEUP_SOURCE_TABLES]
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
        counts = {
            "lineups": con.execute("select count(*) from lineups").fetchone()[0],
            "lineup_slots": con.execute("select count(*) from lineup_slots").fetchone()[0],
            "lineup_matchup_snapshots": con.execute("select count(*) from lineup_matchup_snapshots").fetchone()[0],
            "lineup_shape_snapshots": con.execute("select count(*) from lineup_shape_snapshots").fetchone()[0],
        }
        orphan_checks = {
            "lineups": con.execute(
                """
                select count(*) from lineups l
                left join games g on g.game_id = l.game_id
                left join teams t on t.team_id = l.team_id
                where g.game_id is null or t.team_id is null
                """
            ).fetchone()[0],
            "lineup_slots": con.execute(
                """
                select count(*) from lineup_slots ls
                left join lineups l on l.lineup_id = ls.lineup_id
                left join players p on p.player_id = ls.player_id
                where l.lineup_id is null or p.player_id is null
                """
            ).fetchone()[0],
            "lineup_matchup_snapshots": con.execute(
                """
                select count(*) from lineup_matchup_snapshots lm
                left join games g on g.game_id = lm.game_id
                left join players p on p.player_id = lm.hitter_id
                where g.game_id is null or p.player_id is null
                """
            ).fetchone()[0],
            "lineup_shape_snapshots": con.execute(
                """
                select count(*) from lineup_shape_snapshots ls
                left join teams t on t.team_id = ls.team_id
                where t.team_id is null
                """
            ).fetchone()[0],
        }
        batting_order_duplicates = con.execute(
            """
            select count(*) from (
              select lineup_id, batting_order from lineup_slots
              group by lineup_id, batting_order having count(*) > 1
            )
            """
        ).fetchone()[0]
        unresolved = con.execute(
            """
            select count(*) from unresolved_entities
            where entity_type like 'mlb_lineup_%'
            """
        ).fetchone()[0]
        errors: list[str] = []
        if source_rows <= 0:
            errors.append("No MLB lineup source rows found.")
        matchup_sources = source_table_counts.get("mlb_lineup_pitcher_matchup_daily", 0)
        if counts["lineup_matchup_snapshots"] < matchup_sources:
            errors.append(f"lineup_matchup_snapshots has {counts['lineup_matchup_snapshots']} rows, below source matchup count {matchup_sources}.")
        shape_sources = source_table_counts.get("mlb_lineup_conversion_shape_daily", 0) + source_table_counts.get("mlb_lineup_dependency_profiles", 0)
        if counts["lineup_shape_snapshots"] < shape_sources:
            errors.append(f"lineup_shape_snapshots has {counts['lineup_shape_snapshots']} rows, below source shape count {shape_sources}.")
        if counts["lineup_slots"] <= 0:
            errors.append("No lineup_slots inserted from matchup rows.")
        for table, orphan_count in orphan_checks.items():
            if orphan_count:
                errors.append(f"{table} has {orphan_count} orphan canonical references.")
        if batting_order_duplicates:
            errors.append(f"Found {batting_order_duplicates} duplicate lineup batting-order cells.")
        report = {
            "generated_at": utc_now(),
            "script": "data-migration/scripts/validate_mlb_lineups_normalization.py",
            "parser_module": "pipeline/sources/mlb/normalization/lineups.py",
            "source_db": str(args.source_db.relative_to(ROOT)),
            "date": args.date,
            "source_rows": source_rows,
            "source_table_counts": source_table_counts,
            "target_counts": counts,
            "orphan_checks": orphan_checks,
            "batting_order_duplicates": batting_order_duplicates,
            "unresolved_lineup_entities": unresolved,
            "errors": errors,
            "ok": not errors,
        }
        if not errors:
            con.execute(
                """
                insert into health_checks (
                  health_check_id, model_run_id, check_name, status,
                  expected_count, actual_count, details_json, checked_at
                ) values (?, null, 'mlb_lineups_normalization', 'ok', ?, ?, ?, ?)
                """,
                (
                    f"mlb-lineups-normalization-{utc_now().replace(':', '-').replace('.', '-')}",
                    source_rows,
                    counts["lineup_matchup_snapshots"] + counts["lineup_shape_snapshots"],
                    json.dumps(report, sort_keys=True),
                    utc_now(),
                ),
            )
            con.commit()
    write_report(args.report, report)
    append_normalization_event(
        ROOT,
        {
            "event_id": f"validate-mlb-lineups-{utc_now().replace(':', '-').replace('.', '-')}",
            "timestamp": utc_now(),
            "phase": "N10",
            "area": "mlb_lineups_normalization_validation",
            "source": "sql-mlb.db:legacy_table_rows",
            "target": "sql-mlb.db:lineups,lineup_slots,lineup_matchup_snapshots,lineup_shape_snapshots",
            "parser_module": "pipeline/sources/mlb/normalization/lineups.py",
            "migration_script": "data-migration/scripts/validate_mlb_lineups_normalization.py",
            "validation": "passed" if report["ok"] else "; ".join(errors),
            "status_from": "inserted",
            "status_to": "validated" if report["ok"] else "blocked",
            "report_path": str(args.report.relative_to(ROOT)),
            "checksum": None,
            "notes": json.dumps({"source_rows": source_rows, "target_counts": counts, "unresolved": unresolved}, sort_keys=True),
        },
    )
    print(json.dumps(report, indent=2, sort_keys=True))
    return 0 if report["ok"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
