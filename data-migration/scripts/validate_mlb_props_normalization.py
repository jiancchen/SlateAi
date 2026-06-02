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
from pipeline.sources.mlb.normalization.props import PROP_SOURCE_TABLES


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--date")
    parser.add_argument("--source-db", type=Path, default=ROOT / "data-private" / "warehouse" / "sports" / "mlb" / "sql-mlb.db")
    parser.add_argument("--report", type=Path, default=ROOT / "data-migration" / "reports" / "validate_mlb_props_normalization_2026-06-02.json")
    args = parser.parse_args()
    if not args.source_db.is_absolute():
        args.source_db = ROOT / args.source_db
    if not args.report.is_absolute():
        args.report = ROOT / args.report
    return args


def main() -> int:
    args = parse_args()
    placeholders = ",".join("?" for _ in PROP_SOURCE_TABLES)
    params: list[str] = ["mlb", *PROP_SOURCE_TABLES]
    where = f"sport = ? and source_table in ({placeholders})"
    if args.date:
        where += " and source_date like ?"
        params.append(f"{args.date}%")
    with sqlite3.connect(args.source_db) as con:
        con.row_factory = sqlite3.Row
        source_table_counts = {row["source_table"]: row["n"] for row in con.execute(f"select source_table,count(*) as n from legacy_table_rows where {where} group by source_table", params).fetchall()}
        source_rows = sum(source_table_counts.values())
        target_count = con.execute("select count(*) from prop_market_snapshots").fetchone()[0]
        mapped_players = con.execute("select count(*) from prop_market_snapshots where player_id is not null").fetchone()[0]
        mapped_games = con.execute("select count(*) from prop_market_snapshots where game_id is not null").fetchone()[0]
        orphan_checks = {
            "players": con.execute("select count(*) from prop_market_snapshots p left join players pl on pl.player_id=p.player_id where p.player_id is not null and pl.player_id is null").fetchone()[0],
            "games": con.execute("select count(*) from prop_market_snapshots p left join games g on g.game_id=p.game_id where p.game_id is not null and g.game_id is null").fetchone()[0],
        }
        errors: list[str] = []
        if source_rows <= 0:
            errors.append("No MLB prop odds source rows found.")
        if target_count < source_rows:
            errors.append(f"prop_market_snapshots has {target_count} rows, below source count {source_rows}.")
        for table, count in orphan_checks.items():
            if count:
                errors.append(f"prop_market_snapshots has {count} orphan {table} references.")
        report = {"generated_at": utc_now(), "script": "data-migration/scripts/validate_mlb_props_normalization.py", "parser_module": "pipeline/sources/mlb/normalization/props.py", "source_db": str(args.source_db.relative_to(ROOT)), "date": args.date, "source_rows": source_rows, "source_table_counts": source_table_counts, "target_count": target_count, "mapped_players": mapped_players, "mapped_games": mapped_games, "orphan_checks": orphan_checks, "errors": errors, "ok": not errors}
        if not errors:
            con.execute("insert into health_checks (health_check_id, model_run_id, check_name, status, expected_count, actual_count, details_json, checked_at) values (?, null, 'mlb_props_normalization', 'ok', ?, ?, ?, ?)", (f"mlb-props-normalization-{utc_now().replace(':','-').replace('.','-')}", source_rows, target_count, json.dumps(report, sort_keys=True), utc_now()))
            con.commit()
    write_report(args.report, report)
    append_normalization_event(ROOT, {"event_id": f"validate-mlb-props-{utc_now().replace(':', '-').replace('.', '-')}", "timestamp": utc_now(), "phase": "N18", "area": "mlb_props_normalization_validation", "source": "sql-mlb.db:legacy_table_rows", "target": "sql-mlb.db:prop_market_snapshots", "parser_module": "pipeline/sources/mlb/normalization/props.py", "migration_script": "data-migration/scripts/validate_mlb_props_normalization.py", "validation": "passed" if report["ok"] else "; ".join(errors), "status_from": "inserted", "status_to": "validated" if report["ok"] else "blocked", "report_path": str(args.report.relative_to(ROOT)), "checksum": None, "notes": json.dumps({"source_rows": source_rows, "target_count": target_count, "mapped_players": mapped_players, "mapped_games": mapped_games}, sort_keys=True)})
    print(json.dumps(report, indent=2, sort_keys=True))
    return 0 if report["ok"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
