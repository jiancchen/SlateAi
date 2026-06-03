#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import sqlite3
import sys
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[2]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from pipeline.sources.mlb.normalization.common import MlbIdentityResolver, append_normalization_event, compact_json, utc_now, write_report
from pipeline.sources.mlb.normalization.markets import ensure_markets_schema, parse_market_rows


SOURCE_TABLES = {"mlb_featured_market_odds_snapshots"}

COMPARE_COLUMNS = [
    "game_id",
    "player_id",
    "source_name",
    "market_type",
    "selection",
    "line_value",
    "odds_american",
    "price_cents",
    "implied_probability",
    "captured_at",
    "raw_source_snapshot_id",
]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--date")
    parser.add_argument(
        "--source-db",
        type=Path,
        default=ROOT / "data-private" / "warehouse" / "sports" / "mlb" / "sql-mlb.db",
    )
    parser.add_argument(
        "--report",
        type=Path,
        default=ROOT / "data-migration" / "reports" / "validate_mlb_markets_lineage_2026-06-03.json",
    )
    args = parser.parse_args()
    if not args.source_db.is_absolute():
        args.source_db = ROOT / args.source_db
    if not args.report.is_absolute():
        args.report = ROOT / args.report
    return args


def values_equal(expected: Any, actual: Any) -> bool:
    if expected is None and actual is None:
        return True
    if isinstance(expected, float) or isinstance(actual, float):
        if expected is None or actual is None:
            return False
        return abs(float(expected) - float(actual)) <= 1e-9
    return expected == actual


def compare_row(expected: dict[str, Any], actual: sqlite3.Row) -> dict[str, dict[str, Any]]:
    diffs: dict[str, dict[str, Any]] = {}
    for column in COMPARE_COLUMNS:
        expected_value = expected.get(column)
        actual_value = actual[column]
        if not values_equal(expected_value, actual_value):
            diffs[column] = {"expected": expected_value, "actual": actual_value}
    return diffs


def validate(args: argparse.Namespace) -> dict[str, Any]:
    if not args.source_db.exists():
        raise FileNotFoundError(f"Missing typed DB: {args.source_db}")

    with sqlite3.connect(args.source_db) as con:
        con.row_factory = sqlite3.Row
        con.execute("begin")
        try:
            ensure_markets_schema(con)
            resolver = MlbIdentityResolver(con)
            parsed_rows, parse_counts = parse_market_rows(con, resolver, date=args.date)
            expected_rows = [
                row
                for row in parsed_rows
                if row.target_table == "market_snapshots" and row.source_table in SOURCE_TABLES
            ]
            expected_by_source: dict[str, int] = {}
            missing: list[dict[str, Any]] = []
            mismatches: list[dict[str, Any]] = []
            matched = 0
            for row in expected_rows:
                expected_by_source[row.source_table] = expected_by_source.get(row.source_table, 0) + 1
                market_snapshot_id = row.values["market_snapshot_id"]
                actual = con.execute(
                    "select * from market_snapshots where market_snapshot_id=?",
                    (market_snapshot_id,),
                ).fetchone()
                if actual is None:
                    missing.append(
                        {
                            "source_table": row.source_table,
                            "legacy_row_id": row.legacy_row_id,
                            "market_snapshot_id": market_snapshot_id,
                        }
                    )
                    continue
                matched += 1
                diffs = compare_row(row.values, actual)
                if diffs:
                    mismatches.append(
                        {
                            "source_table": row.source_table,
                            "legacy_row_id": row.legacy_row_id,
                            "market_snapshot_id": market_snapshot_id,
                            "diffs": diffs,
                        }
                    )
            con.rollback()
        except Exception:
            con.rollback()
            raise

    errors: list[str] = []
    if missing:
        errors.append(f"Missing market_snapshots for parsed legacy rows: {len(missing)}")
    if mismatches:
        errors.append(f"Market snapshot field mismatches: {len(mismatches)}")

    return {
        "generated_at": utc_now(),
        "script": "data-migration/scripts/validate_mlb_markets_lineage.py",
        "source_db": str(args.source_db.relative_to(ROOT)),
        "date": args.date,
        "source_tables": sorted(SOURCE_TABLES),
        "parse_counts": parse_counts,
        "expected_market_snapshots": len(expected_rows),
        "expected_by_source_table": expected_by_source,
        "matched_market_snapshots": matched,
        "missing_market_snapshots": len(missing),
        "mismatched_market_snapshots": len(mismatches),
        "missing_samples": missing[:20],
        "mismatch_samples": mismatches[:20],
        "ok": not errors,
        "errors": errors,
    }


def main() -> int:
    args = parse_args()
    report = validate(args)
    write_report(args.report, report)
    append_normalization_event(
        ROOT,
        {
            "event_id": f"validate-mlb-markets-lineage-{utc_now().replace(':', '-').replace('.', '-')}",
            "timestamp": utc_now(),
            "phase": "M3-D5",
            "area": "mlb_markets_lineage",
            "source": "legacy_table_rows:mlb_featured_market_odds_snapshots",
            "target": "sql-mlb.db:market_snapshots",
            "parser_module": "pipeline/sources/mlb/normalization/markets.py",
            "migration_script": "data-migration/scripts/validate_mlb_markets_lineage.py",
            "validation": "passed" if report["ok"] else "; ".join(report["errors"]),
            "status_from": "target-populated-lineage-unclear",
            "status_to": "lineage-validated" if report["ok"] else "blocked",
            "report_path": str(args.report.relative_to(ROOT)),
            "checksum": None,
            "notes": compact_json(
                {
                    "expected_market_snapshots": report["expected_market_snapshots"],
                    "matched_market_snapshots": report["matched_market_snapshots"],
                    "missing_market_snapshots": report["missing_market_snapshots"],
                    "mismatched_market_snapshots": report["mismatched_market_snapshots"],
                }
            ),
        },
    )
    print(json.dumps(report, indent=2, sort_keys=True))
    return 0 if report["ok"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
