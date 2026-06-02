#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import sqlite3
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[2]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from pipeline.sources.mlb.normalization.common import append_normalization_event, compact_json, utc_now, write_report  # noqa: E402


SOURCE_QUERIES: dict[str, dict[str, Any]] = {
    "mlb_game_shape": {
        "family": "game-shape",
        "ttl_hours": 12,
        "queries": {
            "state_formula_training_rows": "select count(*) from state_formula_training_rows where game_date = ?",
            "state_formula_backtests": "select count(*) from state_formula_backtests where prediction_date = ?",
            "side_backtest_rows": "select count(*) from side_backtest_rows where prediction_date = ?",
            "component_settlement_rows": "select count(*) from component_settlement_rows where prediction_date = ?",
        },
    },
    "mlb_model_artifacts": {
        "family": "model-artifacts",
        "ttl_hours": 24,
        "queries": {
            "model_runs": "select count(*) from model_runs where sport='mlb' and run_date = ?",
            "model_artifacts": """
                select count(*)
                from model_artifacts a
                join model_runs r on r.model_run_id=a.model_run_id
                where r.sport='mlb' and r.run_date = ?
            """,
            "model_run_artifacts": """
                select count(*)
                from model_run_artifacts a
                join model_runs r on r.model_run_id=a.model_run_id
                where r.sport='mlb' and r.run_date = ?
            """,
            "model_run_lanes": """
                select count(*)
                from model_run_lanes l
                join model_runs r on r.model_run_id=l.model_run_id
                where r.sport='mlb' and r.run_date = ?
            """,
            "prediction_rows": """
                select count(*)
                from prediction_rows p
                join model_runs r on r.model_run_id=p.model_run_id
                where r.sport='mlb' and r.run_date = ?
            """,
            "settlement_rows": """
                select count(*)
                from settlement_rows s
                join prediction_rows p on p.prediction_row_id=s.prediction_row_id
                join model_runs r on r.model_run_id=p.model_run_id
                where r.sport='mlb' and r.run_date = ?
            """,
            "prop_backtest_rows": "select count(*) from prop_backtest_rows where prediction_date = ?",
        },
    },
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--date", required=True)
    parser.add_argument("--source", choices=("all", *SOURCE_QUERIES.keys()), default="all")
    parser.add_argument(
        "--source-db",
        type=Path,
        default=ROOT / "data-private" / "warehouse" / "sports" / "mlb" / "sql-mlb.db",
    )
    parser.add_argument(
        "--report",
        type=Path,
        default=ROOT / "data-migration" / "reports" / "refresh_mlb_model_source_status_2026-05-31.json",
    )
    args = parser.parse_args()
    if not args.source_db.is_absolute():
        args.source_db = ROOT / args.source_db
    if not args.report.is_absolute():
        args.report = ROOT / args.report
    return args


def sql_path(path: Path) -> str:
    return str(path.relative_to(ROOT))


def cache_valid_until(now_iso: str, ttl_hours: float) -> str:
    try:
        now = datetime.fromisoformat(now_iso.replace("Z", "+00:00"))
    except ValueError:
        now = datetime.now(timezone.utc)
    return (now + timedelta(hours=ttl_hours)).isoformat()


def count_query(con: sqlite3.Connection, sql: str, date: str) -> int:
    return int(con.execute(sql, (date,)).fetchone()[0] or 0)


def refresh_source(con: sqlite3.Connection, *, source_name: str, config: dict[str, Any], date: str, report_path: Path) -> dict[str, Any]:
    now = utc_now()
    table_counts = {name: count_query(con, sql, date) for name, sql in config["queries"].items()}
    actual = sum(table_counts.values())
    status = "success" if actual > 0 else "missing"
    completeness = "complete" if status == "success" else "missing"
    run_id = f"source-fetch-{source_name}-{date}-{now.replace(':', '-').replace('.', '-')}"
    details = {
        "adapter": "mlb_model_source_status_refresh",
        "report_path": sql_path(report_path),
        "table_counts": table_counts,
    }
    con.execute(
        """
        insert into source_fetch_runs (
          source_fetch_run_id, sport, source_name, source_family, source_date,
          run_reason, requested_url, cache_status, cache_ttl_hours, previous_success_at,
          status, completeness_status, expected_item_count, actual_item_count,
          missing_item_count, source_snapshot_id, started_at, finished_at,
          error_code, error_message, details_json
        ) values (?, 'mlb', ?, ?, ?, 'typed_model_status', null, 'not_applicable', ?,
          (select last_success_at from source_fetch_status where sport='mlb' and source_name=? and source_date=?),
          ?, ?, null, ?, null, null, ?, ?, null, null, ?)
        """,
        (
            run_id,
            source_name,
            config["family"],
            date,
            config["ttl_hours"],
            source_name,
            date,
            status,
            completeness,
            actual,
            now,
            now,
            compact_json(details),
        ),
    )
    con.execute(
        """
        insert into source_fetch_status (
          source_fetch_status_id, sport, source_name, source_family, source_date,
          last_fetch_run_id, last_attempt_at, last_success_at, last_status,
          last_completeness_status, cache_valid_until, expected_item_count,
          actual_item_count, missing_item_count, unresolved_count, updated_at, notes
        ) values (?, 'mlb', ?, ?, ?, ?, ?, ?, ?, ?, ?, null, ?, null, 0, ?, ?)
        on conflict (sport, source_name, source_date) do update set
          source_family = excluded.source_family,
          last_fetch_run_id = excluded.last_fetch_run_id,
          last_attempt_at = excluded.last_attempt_at,
          last_success_at = excluded.last_success_at,
          last_status = excluded.last_status,
          last_completeness_status = excluded.last_completeness_status,
          cache_valid_until = excluded.cache_valid_until,
          expected_item_count = excluded.expected_item_count,
          actual_item_count = excluded.actual_item_count,
          missing_item_count = excluded.missing_item_count,
          unresolved_count = excluded.unresolved_count,
          updated_at = excluded.updated_at,
          notes = excluded.notes
        """,
        (
            f"mlb:{source_name}:{date}",
            source_name,
            config["family"],
            date,
            run_id,
            now,
            now if status == "success" else None,
            status,
            completeness,
            cache_valid_until(now, config["ttl_hours"]),
            actual,
            now,
            compact_json(details),
        ),
    )
    con.execute(
        """
        insert into health_checks (
          health_check_id, model_run_id, check_name, status, expected_count,
          actual_count, details_json, checked_at
        ) values (?, null, ?, ?, ?, ?, ?, ?)
        on conflict(health_check_id) do update set
          status = excluded.status,
          expected_count = excluded.expected_count,
          actual_count = excluded.actual_count,
          details_json = excluded.details_json,
          checked_at = excluded.checked_at
        """,
        (
            f"mlb-model-source-status:{source_name}:{date}",
            f"mlb_model_source_status:{source_name}:{date}",
            "ok" if status == "success" else "blocked",
            1,
            actual,
            compact_json(details),
            now,
        ),
    )
    return {"source_name": source_name, "status": status, "actual_item_count": actual, "table_counts": table_counts}


def main() -> int:
    args = parse_args()
    selected = SOURCE_QUERIES if args.source == "all" else {args.source: SOURCE_QUERIES[args.source]}
    report = {
        "generated_at": utc_now(),
        "script": "data-migration/scripts/refresh_mlb_model_source_status.py",
        "source_db": sql_path(args.source_db),
        "date": args.date,
        "sources": {},
        "ok": True,
    }
    with sqlite3.connect(args.source_db) as con:
        con.row_factory = sqlite3.Row
        for source_name, config in selected.items():
            report["sources"][source_name] = refresh_source(con, source_name=source_name, config=config, date=args.date, report_path=args.report)
        con.commit()
    report["ok"] = all(source["status"] == "success" for source in report["sources"].values())
    write_report(args.report, report)
    append_normalization_event(
        ROOT,
        {
            "event_id": f"phase9g1-mlb-model-source-status-{args.date}-{utc_now().replace(':', '-').replace('.', '-')}",
            "timestamp": utc_now(),
            "phase": "9G.1",
            "area": "mlb_model_source_status",
            "source": "sql-mlb.db typed model/game-shape tables",
            "target": "sql-mlb.db:source_fetch_status,source_fetch_runs,health_checks",
            "parser_module": "none",
            "migration_script": "data-migration/scripts/refresh_mlb_model_source_status.py",
            "validation": "refreshed source-family status rows",
            "status_from": "not_started",
            "status_to": "validated" if report["ok"] else "blocked",
            "report_path": sql_path(args.report),
            "checksum": None,
            "notes": compact_json({key: value["actual_item_count"] for key, value in report["sources"].items()}),
        },
    )
    print(compact_json({"date": args.date, "sources": {key: value["actual_item_count"] for key, value in report["sources"].items()}, "ok": report["ok"]}))
    return 0 if report["ok"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
