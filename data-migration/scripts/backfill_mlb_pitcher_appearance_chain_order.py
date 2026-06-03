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

from pipeline.sources.mlb.normalization.common import (
    add_column_if_missing,
    append_normalization_event,
    utc_now,
    write_report,
)


CHAIN_ORDER_COLUMNS = {
    "entry_order": "integer",
    "first_inning": "integer",
    "first_half": "text",
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Backfill canonical pitcher_appearances reliever chain-order fields from typed staging."
    )
    parser.add_argument(
        "--db",
        type=Path,
        default=ROOT / "data-private" / "warehouse" / "sports" / "mlb" / "sql-mlb.db",
    )
    parser.add_argument(
        "--report",
        type=Path,
        default=ROOT
        / "data-migration"
        / "reports"
        / "backfill_mlb_pitcher_appearance_chain_order_2026-06-03.json",
    )
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()
    if not args.db.is_absolute():
        args.db = ROOT / args.db
    if not args.report.is_absolute():
        args.report = ROOT / args.report
    return args


def table_exists(con: sqlite3.Connection, table: str) -> bool:
    row = con.execute(
        """
        select 1
        from sqlite_master
        where type in ('table', 'view') and name = ?
        limit 1
        """,
        (table,),
    ).fetchone()
    return row is not None


def sqlite_object_type(con: sqlite3.Connection, name: str) -> str | None:
    row = con.execute(
        """
        select type
        from sqlite_master
        where name = ?
          and type in ('table', 'view')
        limit 1
        """,
        (name,),
    ).fetchone()
    return str(row["type"]) if row else None


def ensure_schema(con: sqlite3.Connection) -> None:
    for table in ["pitcher_appearances", "mlb_pitcher_appearances"]:
        if not table_exists(con, table):
            raise RuntimeError(f"Required table is missing: {table}")
    for column, ddl in CHAIN_ORDER_COLUMNS.items():
        add_column_if_missing(con, "pitcher_appearances", column, ddl)
    con.execute(
        "create index if not exists idx_pitcher_appearances_source_pk on pitcher_appearances(source_pk)"
    )
    if sqlite_object_type(con, "mlb_pitcher_appearances") == "table":
        con.execute(
            "create index if not exists idx_mlb_pitcher_appearances_legacy_source_pk on mlb_pitcher_appearances(_legacy_source_pk)"
        )


def column_counts(con: sqlite3.Connection, table: str) -> dict[str, int]:
    select_list = ", ".join(f"count({column}) as {column}" for column in CHAIN_ORDER_COLUMNS)
    row = con.execute(f"select count(*) as rows, {select_list} from {table}").fetchone()
    return {key: int(row[key]) for key in row.keys()}


def match_counts(con: sqlite3.Connection) -> dict[str, int]:
    row = con.execute(
        """
        select
          count(*) as exact_source_pk_matches,
          count(m.entry_order) as matched_entry_order,
          count(m.first_inning) as matched_first_inning,
          count(m.first_half) as matched_first_half
        from pitcher_appearances p
        left join mlb_pitcher_appearances m on m._legacy_source_pk = p.source_pk
        """
    ).fetchone()
    return {key: int(row[key]) for key in row.keys()}


def run_backfill(db_path: Path, report_path: Path, dry_run: bool) -> dict[str, object]:
    with sqlite3.connect(db_path) as con:
        con.row_factory = sqlite3.Row
        ensure_schema(con)
        before = column_counts(con, "pitcher_appearances")
        staging = column_counts(con, "mlb_pitcher_appearances")
        matches = match_counts(con)
        con.execute(
            """
            update pitcher_appearances
            set
              entry_order = (
                select m.entry_order
                from mlb_pitcher_appearances m
                where m._legacy_source_pk = pitcher_appearances.source_pk
              ),
              first_inning = (
                select m.first_inning
                from mlb_pitcher_appearances m
                where m._legacy_source_pk = pitcher_appearances.source_pk
              ),
              first_half = (
                select m.first_half
                from mlb_pitcher_appearances m
                where m._legacy_source_pk = pitcher_appearances.source_pk
              )
            where source_table = 'mlb_pitcher_appearances'
              and exists (
                select 1
                from mlb_pitcher_appearances m
                where m._legacy_source_pk = pitcher_appearances.source_pk
              )
            """
        )
        rows_touched = int(con.execute("select changes() as changes_count").fetchone()["changes_count"])
        after = column_counts(con, "pitcher_appearances")
        report: dict[str, object] = {
            "generated_at": utc_now(),
            "script": "data-migration/scripts/backfill_mlb_pitcher_appearance_chain_order.py",
            "source_db": str(db_path.relative_to(ROOT)),
            "dry_run": dry_run,
            "ok": True,
            "target_table": "pitcher_appearances",
            "source_table": "mlb_pitcher_appearances",
            "join_key": "pitcher_appearances.source_pk = mlb_pitcher_appearances._legacy_source_pk",
            "before": before,
            "staging": staging,
            "matches": matches,
            "rows_touched": rows_touched,
            "after": after,
            "notes": [
                "This backfill promotes reliever chain-order fields into canonical pitcher_appearances for FS-004.",
                "Rows with null staging entry_order remain null by design.",
            ],
        }
        if dry_run:
            con.rollback()
        else:
            con.commit()
    write_report(report_path, report)
    if not dry_run:
        append_normalization_event(
            ROOT,
            {
                "event_id": f"backfill-mlb-pitcher-appearance-chain-order-{utc_now().replace(':', '-').replace('.', '-')}",
                "timestamp": utc_now(),
                "phase": "N9",
                "area": "mlb_pitcher_appearance_chain_order_backfill",
                "source": "sql-mlb.db:mlb_pitcher_appearances",
                "target": "sql-mlb.db:pitcher_appearances.entry_order,first_inning,first_half",
                "parser_module": "pipeline/sources/mlb/normalization/results.py",
                "migration_script": "data-migration/scripts/backfill_mlb_pitcher_appearance_chain_order.py",
                "validation": "pending",
                "status_from": "canonical_columns_added",
                "status_to": "backfilled",
                "report_path": str(report_path.relative_to(ROOT)),
                "checksum": None,
                "notes": json.dumps(
                    {
                        "rows_touched": rows_touched,
                        "after": after,
                    },
                    sort_keys=True,
                ),
            },
        )
    return report


def main() -> int:
    args = parse_args()
    try:
        report = run_backfill(args.db, args.report, args.dry_run)
    except Exception as exc:
        report = {
            "generated_at": utc_now(),
            "script": "data-migration/scripts/backfill_mlb_pitcher_appearance_chain_order.py",
            "source_db": str(args.db.relative_to(ROOT)) if args.db.is_relative_to(ROOT) else str(args.db),
            "dry_run": args.dry_run,
            "ok": False,
            "error": str(exc),
        }
        write_report(args.report, report)
        print(json.dumps(report, indent=2, sort_keys=True), file=sys.stderr)
        return 1
    print(json.dumps(report, indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
