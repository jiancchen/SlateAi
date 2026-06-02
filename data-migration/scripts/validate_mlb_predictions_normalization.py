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
from pipeline.sources.mlb.normalization.predictions import PREDICTION_SOURCE_TABLES


SOURCE_TARGETS = {
    "mlb_side_predictions": "prediction_rows",
    "mlb_prop_predictions": "prediction_rows",
    "mlb_home_run_predictions": "prediction_rows",
    "mlb_side_backtests": "side_backtest_rows",
    "mlb_prop_backtests": "prop_backtest_rows",
    "mlb_home_run_backtests": "home_run_backtest_rows",
    "mlb_player_identity_model_backtests": "player_identity_backtest_rows",
    "mlb_rp36_settlements": "component_settlement_rows",
    "mlb_rp36_team_settlements": "component_settlement_rows",
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--date")
    parser.add_argument("--source-db", type=Path, default=ROOT / "data-private" / "warehouse" / "sports" / "mlb" / "sql-mlb.db")
    parser.add_argument("--report", type=Path, default=ROOT / "data-migration" / "reports" / "validate_mlb_predictions_normalization_2026-06-02.json")
    args = parser.parse_args()
    if not args.source_db.is_absolute():
        args.source_db = ROOT / args.source_db
    if not args.report.is_absolute():
        args.report = ROOT / args.report
    return args


def main() -> int:
    args = parse_args()
    placeholders = ",".join("?" for _ in PREDICTION_SOURCE_TABLES)
    params: list[str] = ["mlb", *PREDICTION_SOURCE_TABLES]
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
        target_tables = sorted(set(SOURCE_TARGETS.values()))
        target_counts = {table: con.execute(f"select count(*) from {table}").fetchone()[0] for table in target_tables}
        source_tag_counts = {
            table: con.execute(f"select count(*) from {table} where source_table is not null").fetchone()[0]
            for table in target_tables
            if table != "prediction_rows"
        }
        source_tag_counts["prediction_rows"] = con.execute(
            """
            select count(*) from prediction_rows
            where rationale_json like '%source_payload%'
            """
        ).fetchone()[0]
        orphan_checks = {
            "prediction_rows_model_runs": con.execute(
                """
                select count(*) from prediction_rows p
                left join model_runs r on r.model_run_id = p.model_run_id
                where r.model_run_id is null
                """
            ).fetchone()[0],
            "side_backtest_rows_model_runs": con.execute(
                """
                select count(*) from side_backtest_rows b
                left join model_runs r on r.model_run_id = b.model_run_id
                where r.model_run_id is null
                """
            ).fetchone()[0],
            "prop_backtest_rows_model_runs": con.execute(
                """
                select count(*) from prop_backtest_rows b
                left join model_runs r on r.model_run_id = b.model_run_id
                where r.model_run_id is null
                """
            ).fetchone()[0],
            "component_settlement_rows_model_runs": con.execute(
                """
                select count(*) from component_settlement_rows c
                left join model_runs r on r.model_run_id = c.model_run_id
                where r.model_run_id is null
                """
            ).fetchone()[0],
        }
        unresolved = con.execute(
            "select count(*) from unresolved_entities where entity_type like 'mlb_prediction%'"
        ).fetchone()[0]
        errors: list[str] = []
        if source_rows <= 0:
            errors.append("No MLB prediction/backtest source rows found.")
        if target_counts.get("prediction_rows", 0) <= 0:
            errors.append("No typed prediction rows found.")
        for table, count in orphan_checks.items():
            if count:
                errors.append(f"{table} has {count} orphan model references.")
        for target in ["side_backtest_rows", "prop_backtest_rows", "home_run_backtest_rows", "player_identity_backtest_rows", "component_settlement_rows"]:
            if any(SOURCE_TARGETS[source] == target and source_table_counts.get(source, 0) for source in SOURCE_TARGETS):
                if target_counts.get(target, 0) <= 0:
                    errors.append(f"{target} has no rows after normalization.")
        report = {
            "generated_at": utc_now(),
            "script": "data-migration/scripts/validate_mlb_predictions_normalization.py",
            "parser_module": "pipeline/sources/mlb/normalization/predictions.py",
            "source_db": str(args.source_db.relative_to(ROOT)),
            "date": args.date,
            "source_rows": source_rows,
            "source_table_counts": source_table_counts,
            "target_counts": target_counts,
            "source_tag_counts": source_tag_counts,
            "orphan_checks": orphan_checks,
            "unresolved_prediction_entities": unresolved,
            "errors": errors,
            "ok": not errors,
        }
        if not errors:
            con.execute(
                """
                insert into health_checks (
                  health_check_id, model_run_id, check_name, status,
                  expected_count, actual_count, details_json, checked_at
                ) values (?, null, 'mlb_predictions_normalization', 'ok', ?, ?, ?, ?)
                """,
                (
                    f"mlb-predictions-normalization-{utc_now().replace(':', '-').replace('.', '-')}",
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
            "event_id": f"validate-mlb-predictions-{utc_now().replace(':', '-').replace('.', '-')}",
            "timestamp": utc_now(),
            "phase": "N17",
            "area": "mlb_predictions_normalization_validation",
            "source": "sql-mlb.db:legacy_table_rows",
            "target": "sql-mlb.db:prediction/backtest/settlement tables",
            "parser_module": "pipeline/sources/mlb/normalization/predictions.py",
            "migration_script": "data-migration/scripts/validate_mlb_predictions_normalization.py",
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
