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
from pipeline.sources.mlb.normalization.markets import MARKET_SOURCE_TABLES


TARGETS = ["market_snapshots", "market_contracts", "market_price_ticks", "team_market_context_snapshots", "market_mispricing_labels"]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--date")
    parser.add_argument("--source-db", type=Path, default=ROOT / "data-private" / "warehouse" / "sports" / "mlb" / "sql-mlb.db")
    parser.add_argument("--report", type=Path, default=ROOT / "data-migration" / "reports" / "validate_mlb_markets_normalization_2026-06-02.json")
    args = parser.parse_args()
    if not args.source_db.is_absolute():
        args.source_db = ROOT / args.source_db
    if not args.report.is_absolute():
        args.report = ROOT / args.report
    return args


def main() -> int:
    args = parse_args()
    placeholders = ",".join("?" for _ in MARKET_SOURCE_TABLES)
    params: list[str] = ["mlb", *MARKET_SOURCE_TABLES]
    where = f"sport = ? and source_table in ({placeholders})"
    if args.date:
        where += " and source_date like ?"
        params.append(f"{args.date}%")
    with sqlite3.connect(args.source_db) as con:
        con.row_factory = sqlite3.Row
        source_table_counts = {row["source_table"]: row["n"] for row in con.execute(f"select source_table,count(*) as n from legacy_table_rows where {where} group by source_table", params).fetchall()}
        source_rows = sum(source_table_counts.values())
        target_counts = {table: con.execute(f"select count(*) from {table}").fetchone()[0] for table in TARGETS}
        orphan_checks = {
            "market_price_ticks_contracts": con.execute("select count(*) from market_price_ticks t left join market_contracts c on c.contract_id=t.contract_id where t.contract_id is not null and c.contract_id is null").fetchone()[0],
            "market_contracts_games": con.execute("select count(*) from market_contracts c left join games g on g.game_id=c.game_id where c.game_id is not null and g.game_id is null").fetchone()[0],
            "market_snapshots_games": con.execute("select count(*) from market_snapshots m left join games g on g.game_id=m.game_id where m.game_id is not null and g.game_id is null").fetchone()[0],
            "team_market_context_teams": con.execute("select count(*) from team_market_context_snapshots c left join teams t on t.team_id=c.team_id where c.team_id is not null and t.team_id is null").fetchone()[0],
        }
        errors: list[str] = []
        if source_rows <= 0:
            errors.append("No MLB market source rows found.")
        for table in TARGETS:
            if table != "market_contracts" and target_counts.get(table, 0) <= 0:
                errors.append(f"{table} has no rows.")
        if source_table_counts.get("mlb_kalshi_market_snapshots", 0) and target_counts.get("market_contracts", 0) <= 0:
            errors.append("Kalshi source rows exist but market_contracts is empty.")
        for table, count in orphan_checks.items():
            if count:
                errors.append(f"{table} has {count} orphan references.")
        report = {"generated_at": utc_now(), "script": "data-migration/scripts/validate_mlb_markets_normalization.py", "parser_module": "pipeline/sources/mlb/normalization/markets.py", "source_db": str(args.source_db.relative_to(ROOT)), "date": args.date, "source_rows": source_rows, "source_table_counts": source_table_counts, "target_counts": target_counts, "orphan_checks": orphan_checks, "errors": errors, "ok": not errors}
        if not errors:
            con.execute("insert into health_checks (health_check_id, model_run_id, check_name, status, expected_count, actual_count, details_json, checked_at) values (?, null, 'mlb_markets_normalization', 'ok', ?, ?, ?, ?)", (f"mlb-markets-normalization-{utc_now().replace(':','-').replace('.','-')}", source_rows, sum(target_counts.values()), json.dumps(report, sort_keys=True), utc_now()))
            con.commit()
    write_report(args.report, report)
    append_normalization_event(ROOT, {"event_id": f"validate-mlb-markets-{utc_now().replace(':', '-').replace('.', '-')}", "timestamp": utc_now(), "phase": "N18", "area": "mlb_markets_normalization_validation", "source": "sql-mlb.db:legacy_table_rows", "target": "sql-mlb.db:market tables", "parser_module": "pipeline/sources/mlb/normalization/markets.py", "migration_script": "data-migration/scripts/validate_mlb_markets_normalization.py", "validation": "passed" if report["ok"] else "; ".join(errors), "status_from": "inserted", "status_to": "validated" if report["ok"] else "blocked", "report_path": str(args.report.relative_to(ROOT)), "checksum": None, "notes": json.dumps({"source_rows": source_rows, "target_counts": target_counts}, sort_keys=True)})
    print(json.dumps(report, indent=2, sort_keys=True))
    return 0 if report["ok"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
