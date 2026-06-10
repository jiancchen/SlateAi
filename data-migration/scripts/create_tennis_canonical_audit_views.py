#!/usr/bin/env python3
"""Check or apply tennis canonical audit view definitions."""

from __future__ import annotations

import argparse
import json
import re
import sqlite3
from datetime import datetime, timezone
from pathlib import Path


DEFAULT_DB = Path("data-private/warehouse/sports/tennis/sql-tennis.db")
DEFAULT_SQL = Path("data-migration/contracts/tennis_canonical_audit_views.sql")
DEFAULT_REPORT = Path("data-migration/reports/create_tennis_canonical_audit_views.json")


def view_names(sql: str) -> list[str]:
    return re.findall(r"create\s+view\s+([a-zA-Z0-9_]+)\s+as", sql, flags=re.IGNORECASE)


def temp_view_sql(sql: str) -> str:
    converted = re.sub(
        r"drop\s+view\s+if\s+exists\s+([a-zA-Z0-9_]+)",
        r"drop view if exists temp.\1",
        sql,
        flags=re.IGNORECASE,
    )
    return re.sub(
        r"create\s+view\s+([a-zA-Z0-9_]+)\s+as",
        r"create temp view \1 as",
        converted,
        flags=re.IGNORECASE,
    )


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Check or apply tennis canonical audit views.")
    parser.add_argument("--db", type=Path, default=DEFAULT_DB)
    parser.add_argument("--sql", type=Path, default=DEFAULT_SQL)
    parser.add_argument("--report", type=Path, default=DEFAULT_REPORT)
    parser.add_argument("--apply", action="store_true", help="Persist views in the SQLite DB. Default is rollback-only check.")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    if not args.db.exists():
        raise SystemExit(f"Missing DB: {args.db}")
    if not args.sql.exists():
        raise SystemExit(f"Missing SQL: {args.sql}")

    sql = args.sql.read_text(encoding="utf-8")
    names = view_names(sql)
    if not names:
        raise SystemExit(f"No view definitions found in {args.sql}")

    if args.apply:
        with sqlite3.connect(args.db) as con:
            con.executescript(sql)
            con.commit()
            counts = {name: con.execute(f"select count(*) from {name}").fetchone()[0] for name in names}
            mode = "applied"
    else:
        with sqlite3.connect(f"file:{args.db}?mode=ro", uri=True) as con:
            con.executescript(temp_view_sql(sql))
            created = {
                name: con.execute("select count(*) from sqlite_temp_master where type='view' and name=?", (name,)).fetchone()[0]
                for name in names
            }
            missing = [name for name, count in created.items() if count != 1]
            if missing:
                raise SystemExit(f"View check failed for: {', '.join(missing)}")
            counts = {name: con.execute(f"select count(*) from {name}").fetchone()[0] for name in names}
            mode = "checked_temp_views_readonly"

    report = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "script": "data-migration/scripts/create_tennis_canonical_audit_views.py",
        "db_path": str(args.db),
        "sql_path": str(args.sql),
        "mode": mode,
        "views": names,
        "view_counts": counts,
        "ok": True,
    }
    args.report.parent.mkdir(parents=True, exist_ok=True)
    args.report.write_text(json.dumps(report, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2, sort_keys=True))


if __name__ == "__main__":
    main()
