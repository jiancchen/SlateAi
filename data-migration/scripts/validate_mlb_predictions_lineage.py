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
from pipeline.sources.mlb.normalization.predictions import ensure_predictions_schema, parse_prediction_rows


SOURCE_TABLES = {
    "mlb_side_predictions",
    "mlb_prop_predictions",
    "mlb_home_run_predictions",
}

COMPARE_COLUMNS = [
    "model_run_id",
    "game_id",
    "player_id",
    "lane",
    "market_type",
    "selection",
    "predicted_probability",
    "projected_value",
    "confidence",
    "ev_cents",
    "price_cents",
    "odds_american",
    "feature_snapshot_id",
    "rationale_json",
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
        default=ROOT / "data-migration" / "reports" / "validate_mlb_predictions_lineage_2026-06-03.json",
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
            ensure_predictions_schema(con)
            resolver = MlbIdentityResolver(con)
            parsed_rows, parse_counts = parse_prediction_rows(con, resolver, date=args.date)
            expected_rows = [
                row
                for row in parsed_rows
                if row.target_table == "prediction_rows" and row.source_table in SOURCE_TABLES
            ]
            expected_by_source: dict[str, int] = {}
            missing: list[dict[str, Any]] = []
            mismatches: list[dict[str, Any]] = []
            matched = 0
            for row in expected_rows:
                expected_by_source[row.source_table] = expected_by_source.get(row.source_table, 0) + 1
                prediction_row_id = row.values["prediction_row_id"]
                actual = con.execute(
                    "select * from prediction_rows where prediction_row_id=?",
                    (prediction_row_id,),
                ).fetchone()
                if actual is None:
                    missing.append(
                        {
                            "source_table": row.source_table,
                            "legacy_row_id": row.legacy_row_id,
                            "prediction_row_id": prediction_row_id,
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
                            "prediction_row_id": prediction_row_id,
                            "diffs": diffs,
                        }
                    )
            con.rollback()
        except Exception:
            con.rollback()
            raise

    errors: list[str] = []
    if missing:
        errors.append(f"Missing prediction_rows for parsed legacy rows: {len(missing)}")
    if mismatches:
        errors.append(f"Prediction row field mismatches: {len(mismatches)}")

    return {
        "generated_at": utc_now(),
        "script": "data-migration/scripts/validate_mlb_predictions_lineage.py",
        "source_db": str(args.source_db.relative_to(ROOT)),
        "date": args.date,
        "source_tables": sorted(SOURCE_TABLES),
        "parse_counts": parse_counts,
        "expected_prediction_rows": len(expected_rows),
        "expected_by_source_table": expected_by_source,
        "matched_prediction_rows": matched,
        "missing_prediction_rows": len(missing),
        "mismatched_prediction_rows": len(mismatches),
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
            "event_id": f"validate-mlb-predictions-lineage-{utc_now().replace(':', '-').replace('.', '-')}",
            "timestamp": utc_now(),
            "phase": "M3-D4",
            "area": "mlb_predictions_lineage",
            "source": "legacy_table_rows:mlb_side_predictions,mlb_prop_predictions,mlb_home_run_predictions",
            "target": "sql-mlb.db:prediction_rows",
            "parser_module": "pipeline/sources/mlb/normalization/predictions.py",
            "migration_script": "data-migration/scripts/validate_mlb_predictions_lineage.py",
            "validation": "passed" if report["ok"] else "; ".join(report["errors"]),
            "status_from": "target-populated-lineage-unclear",
            "status_to": "lineage-validated" if report["ok"] else "blocked",
            "report_path": str(args.report.relative_to(ROOT)),
            "checksum": None,
            "notes": compact_json(
                {
                    "expected_prediction_rows": report["expected_prediction_rows"],
                    "matched_prediction_rows": report["matched_prediction_rows"],
                    "missing_prediction_rows": report["missing_prediction_rows"],
                    "mismatched_prediction_rows": report["mismatched_prediction_rows"],
                }
            ),
        },
    )
    print(json.dumps(report, indent=2, sort_keys=True))
    return 0 if report["ok"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
