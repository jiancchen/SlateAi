#!/usr/bin/env python3

import argparse
import json
import os
import sqlite3
from datetime import datetime, timezone
from pathlib import Path

import duckdb


SPORTS = ("mlb", "tennis")


def repo_root() -> Path:
    return Path(__file__).resolve().parents[2]


def sqlite_path(root: Path, sport: str) -> Path:
    return root / "data-private" / "warehouse" / "sports" / sport / f"sql-{sport}.db"


def duck_path(root: Path, sport: str) -> Path:
    return root / "data-private" / "warehouse" / "analytics" / f"duck-{sport}.duckdb"


def sql_string(value: str) -> str:
    return "'" + value.replace("'", "''") + "'"


def sqlite_tables(db_path: Path) -> list[str]:
    with sqlite3.connect(db_path) as con:
        rows = con.execute(
            "select name from sqlite_master where type = 'table' and name not like 'sqlite_%' order by name"
        ).fetchall()
    return [row[0] for row in rows]


def sqlite_count(db_path: Path, table: str) -> int:
    with sqlite3.connect(db_path) as con:
        return int(con.execute(f'select count(*) from "{table}"').fetchone()[0])


def create_summary_views(con: duckdb.DuckDBPyConnection, sport: str) -> None:
    con.execute(
        """
        create or replace view model_prediction_summary as
        select
          mr.sport,
          mr.model_id,
          mr.run_date,
          pr.lane,
          count(*) as prediction_rows,
          avg(pr.confidence) as avg_confidence,
          avg(pr.predicted_probability) as avg_predicted_probability,
          avg(pr.ev_cents) as avg_ev_cents
        from prediction_rows pr
        join model_runs mr on mr.model_run_id = pr.model_run_id
        group by 1, 2, 3, 4
        order by run_date, model_id, lane
        """
    )
    if sport == "mlb":
        con.execute(
            """
            create or replace view mlb_ml_settlement_summary as
            select
              mr.model_id,
              mr.run_date,
              count(*) as settled_rows,
              sum(case when sr.won = 1 then 1 else 0 end) as wins,
              sum(case when sr.won = 0 then 1 else 0 end) as losses,
              avg(case when sr.won is not null then sr.won else null end) as hit_rate,
              sum(sr.profit_cents) as profit_cents
            from settlement_rows sr
            join prediction_rows pr on pr.prediction_row_id = sr.prediction_row_id
            join model_runs mr on mr.model_run_id = pr.model_run_id
            where pr.lane = 'ml'
            group by 1, 2
            order by run_date, model_id
            """
        )
    if sport == "tennis":
        con.execute(
            """
            create or replace view tennis_lane_summary as
            select
              mr.model_id,
              mr.run_date,
              pr.lane,
              pr.market_type,
              count(*) as rows,
              avg(pr.confidence) as avg_confidence,
              avg(pr.predicted_probability) as avg_predicted_probability,
              avg(pr.ev_cents) as avg_ev_cents
            from prediction_rows pr
            join model_runs mr on mr.model_run_id = pr.model_run_id
            group by 1, 2, 3, 4
            order by run_date, model_id, lane, market_type
            """
        )


def append_event(root: Path, event: dict) -> None:
    event_path = root / "data-migration" / "migration_events.jsonl"
    with event_path.open("a", encoding="utf-8") as handle:
        handle.write(json.dumps(event) + "\n")


def build_sport(root: Path, sport: str, report_path: Path, dry_run: bool) -> dict:
    source_db = sqlite_path(root, sport)
    target_duck = duck_path(root, sport)
    tables = sqlite_tables(source_db)
    source_counts = {table: sqlite_count(source_db, table) for table in tables}

    if dry_run:
        return {
            "sport": sport,
            "source_db": str(source_db.relative_to(root)),
            "target_duckdb": str(target_duck.relative_to(root)),
            "dry_run": True,
            "table_count": len(tables),
            "source_counts": source_counts,
            "duck_counts": {},
            "views": [],
            "ok": True,
        }

    target_duck.parent.mkdir(parents=True, exist_ok=True)
    if target_duck.exists():
        target_duck.unlink()

    con = duckdb.connect(str(target_duck))
    con.execute("install sqlite_scanner")
    con.execute("load sqlite_scanner")
    for table in tables:
        con.execute(
            f'create table "{table}" as select * from sqlite_scan({sql_string(str(source_db))}, {sql_string(table)})'
        )
    create_summary_views(con, sport)
    duck_counts = {
        table: int(con.execute(f'select count(*) from "{table}"').fetchone()[0])
        for table in tables
    }
    views = [
        row[0]
        for row in con.execute(
            "select table_name from information_schema.views where table_schema = 'main' order by table_name"
        ).fetchall()
    ]
    con.close()

    mismatches = [
        {"table": table, "source_count": source_counts[table], "duck_count": duck_counts.get(table)}
        for table in tables
        if source_counts[table] != duck_counts.get(table)
    ]

    return {
        "sport": sport,
        "source_db": str(source_db.relative_to(root)),
        "target_duckdb": str(target_duck.relative_to(root)),
        "dry_run": False,
        "table_count": len(tables),
        "source_counts": source_counts,
        "duck_counts": duck_counts,
        "views": views,
        "mismatches": mismatches,
        "ok": not mismatches,
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--sport", choices=("all", *SPORTS), default="all")
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument(
        "--report",
        default="data-migration/reports/phase5_build_sport_duckdb_2026-06-02.json",
    )
    args = parser.parse_args()

    root = repo_root()
    report_path = Path(args.report)
    if not report_path.is_absolute():
        report_path = root / report_path
    report_path.parent.mkdir(parents=True, exist_ok=True)

    sports = SPORTS if args.sport == "all" else (args.sport,)
    generated_at = datetime.now(timezone.utc).isoformat()
    report = {
        "generated_at": generated_at,
        "phase": "5",
        "script": "data-migration/scripts/build_sport_duckdb.py",
        "dry_run": args.dry_run,
        "sports": [build_sport(root, sport, report_path, args.dry_run) for sport in sports],
    }
    report["ok"] = all(sport_report["ok"] for sport_report in report["sports"])

    for sport_report in report["sports"]:
        append_event(
            root,
            {
                "event_id": f"phase5-duckdb-build-{sport_report['sport']}-{generated_at.replace(':', '-').replace('.', '-')}{'-dry-run' if args.dry_run else ''}",
                "timestamp": generated_at,
                "phase": "5",
                "area": f"{sport_report['sport']}_duckdb_analytics_build",
                "source": sport_report["source_db"],
                "target": sport_report["target_duckdb"],
                "parser_module": "none",
                "migration_script": "data-migration/scripts/build_sport_duckdb.py",
                "validation": "dry-run only"
                if args.dry_run
                else f"{sport_report['table_count']} tables copied into DuckDB",
                "status_from": "not_started",
                "status_to": "planned" if args.dry_run else "backfilled",
                "report_path": str(report_path.relative_to(root)),
                "checksum": None,
                "notes": "DuckDB analytics files are rebuildable copies, not source of truth.",
            },
        )

    report_path.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {report_path}")
    print(json.dumps(report, indent=2))
    return 0 if report["ok"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
