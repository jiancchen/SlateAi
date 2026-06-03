#!/usr/bin/env python3
import argparse
import json
import sqlite3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[5]
DB_PATH = ROOT / "data-private" / "warehouse" / "sports" / "mlb" / "sql-mlb.db"

TABLES = [
    {
        "table": "mlb_state_formula_training_rows",
        "date_column": "snapshot_date",
        "min_rows": 100,
        "label": "state formula rows",
    },
    {
        "table": "mlb_player_identity_curves_daily",
        "date_column": "snapshot_date",
        "min_rows": 1000,
        "label": "player identity curves",
    },
    {
        "table": "mlb_player_current_deviation_daily",
        "date_column": "snapshot_date",
        "min_rows": 1000,
        "label": "player current deviations",
    },
    {
        "table": "mlb_player_game_distribution_daily",
        "date_column": "snapshot_date",
        "min_rows": 1000,
        "label": "player game distributions",
    },
    {
        "table": "mlb_lineup_pitcher_matchup_daily",
        "date_column": "snapshot_date",
        "min_rows": 50,
        "label": "lineup pitcher matchup rows",
    },
    {
        "table": "mlb_state_formula_backtests",
        "date_column": "prediction_date",
        "min_rows": 50,
        "label": "state formula backtests",
    },
    {
        "table": "mlb_player_identity_model_backtests",
        "date_column": "prediction_date",
        "min_rows": 1000,
        "label": "player identity backtests",
    },
]


def parse_args():
    parser = argparse.ArgumentParser()
    parser.add_argument("--through-date", default="")
    parser.add_argument("--db", default=str(DB_PATH))
    parser.add_argument("--json-out", default="")
    return parser.parse_args()


def fetch_one(conn, sql, params=()):
    row = conn.execute(sql, params).fetchone()
    return row[0] if row else None


def table_exists(conn, table):
    return bool(
        fetch_one(
            conn,
            "select 1 from sqlite_master where type in ('table', 'view') and name = ?",
            (table,),
        )
    )


def main():
    args = parse_args()
    db_path = Path(args.db)
    if not db_path.is_absolute():
        db_path = ROOT / db_path
    if not db_path.exists():
        raise SystemExit(f"warehouse missing: {db_path}")

    conn = sqlite3.connect(db_path)
    if not args.through_date:
        latest_dates = [
            fetch_one(conn, f"select max({spec['date_column']}) from {spec['table']}")
            for spec in TABLES
            if table_exists(conn, spec["table"])
        ]
        args.through_date = min(date for date in latest_dates if date)
    if not args.through_date:
        raise SystemExit("No --through-date provided and no coverage table dates found.")
    checks = []
    for spec in TABLES:
        table = spec["table"]
        if not table_exists(conn, table):
            checks.append({
                "table": table,
                "label": spec["label"],
                "status": "missing-table",
                "ok": False,
            })
            continue
        latest = fetch_one(conn, f"select max({spec['date_column']}) from {table}")
        rows_on_through = int(fetch_one(
            conn,
            f"select count(*) from {table} where {spec['date_column']} = ?",
            (args.through_date,),
        ) or 0)
        checks.append({
            "table": table,
            "label": spec["label"],
            "dateColumn": spec["date_column"],
            "latestDate": latest,
            "throughDateRows": rows_on_through,
            "minRows": spec["min_rows"],
            "ok": latest is not None and latest >= args.through_date and rows_on_through >= spec["min_rows"],
        })

    failed = [check for check in checks if not check["ok"]]
    payload = {
        "modelId": "MLB-M2",
        "check": "warehouse-coverage",
        "throughDate": args.through_date,
        "status": "failed" if failed else "passed",
        "passed": len(checks) - len(failed),
        "failed": len(failed),
        "checks": checks,
    }

    if args.json_out:
        out_path = ROOT / args.json_out
        out_path.parent.mkdir(parents=True, exist_ok=True)
        out_path.write_text(json.dumps(payload, indent=2) + "\n")

    print(json.dumps(payload, indent=2))
    if failed:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
