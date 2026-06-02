#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from legacy_prediction_input_backfill import SPORTS, source_count, table_specs, target_db


def repo_root() -> Path:
    return Path(__file__).resolve().parents[2]


def default_source_db(root: Path) -> Path:
    return root / "data-private" / "warehouse" / "sports.db"


def compact_json(value: Any) -> str:
    return json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False)


def append_event(root: Path, event: dict[str, Any]) -> None:
    event_path = root / "data-migration" / "migration_events.jsonl"
    with event_path.open("a", encoding="utf-8") as handle:
        handle.write(compact_json(event) + "\n")


def validate_sport(root: Path, sport: str, source_db: Path, report_path: Path, no_write_health: bool) -> dict[str, Any]:
    target_path = target_db(root, sport)
    if not source_db.exists():
        raise FileNotFoundError(source_db)
    if not target_path.exists():
        raise FileNotFoundError(target_path)

    with sqlite3.connect(source_db) as source_con, sqlite3.connect(target_path) as target_con:
        specs = table_specs(source_con, sport)
        table_results = []
        for spec in specs:
            table = spec["source_table"]
            expected = source_count(source_con, table, spec["where_sql"], spec["params"])
            actual = int(
                target_con.execute(
                    "select count(*) from legacy_table_rows where sport = ? and source_table = ?",
                    (sport, table),
                ).fetchone()[0]
            )
            bad_hashes = int(
                target_con.execute(
                    """
                    select count(*) from legacy_table_rows
                    where sport = ?
                      and source_table = ?
                      and (content_hash is null or length(content_hash) != 64)
                    """,
                    (sport, table),
                ).fetchone()[0]
            )
            missing_dates = int(
                target_con.execute(
                    """
                    select count(*) from legacy_table_rows
                    where sport = ?
                      and source_table = ?
                      and source_date is null
                    """,
                    (sport, table),
                ).fetchone()[0]
            )
            table_results.append(
                {
                    "source_table": table,
                    "kind": spec["kind"],
                    "expected_rows": expected,
                    "actual_rows": actual,
                    "bad_hash_rows": bad_hashes,
                    "missing_source_date_rows": missing_dates,
                    "ok": expected == actual and bad_hashes == 0,
                }
            )

        total_expected = sum(item["expected_rows"] for item in table_results)
        total_actual = sum(item["actual_rows"] for item in table_results)
        missing = [item for item in table_results if not item["ok"]]
        ok = not missing

        timestamp = datetime.now(timezone.utc).isoformat()
        if ok and not no_write_health:
            target_con.execute(
                """
                insert into health_checks (
                  health_check_id, model_run_id, check_name, status,
                  expected_count, actual_count, details_json, checked_at
                ) values (?, null, 'phase6_legacy_prediction_input_validation', 'ok', ?, ?, ?, ?)
                """,
                (
                    f"phase6-legacy-prediction-input-validation-{sport}-{timestamp.replace(':', '-').replace('.', '-')}",
                    total_expected,
                    total_actual,
                    json.dumps(
                        {
                            "report_path": str(report_path.relative_to(root)),
                            "table_count": len(table_results),
                            "missing_source_date_rows": sum(item["missing_source_date_rows"] for item in table_results),
                        },
                        sort_keys=True,
                    ),
                    timestamp,
                ),
            )
            target_con.commit()

    append_event(
        root,
        {
            "event_id": f"phase6-legacy-prediction-input-validation-{sport}-{datetime.now(timezone.utc).isoformat().replace(':', '-').replace('.', '-')}",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "phase": "6",
            "area": f"{sport}_legacy_prediction_input_validation",
            "source": str(source_db.relative_to(root)),
            "target": f"{target_path.relative_to(root)} legacy_table_rows",
            "parser_module": "none",
            "migration_script": "data-migration/scripts/validate_legacy_prediction_inputs.py",
            "validation": "legacy prediction input validation passed" if ok else "legacy prediction input validation failed",
            "status_from": "backfilled",
            "status_to": "validated" if ok else "blocked",
            "report_path": str(report_path.relative_to(root)),
            "checksum": None,
            "notes": f"{total_actual}/{total_expected} rows present across {len(table_results)} tables.",
        },
    )

    return {
        "sport": sport,
        "target_db": str(target_path.relative_to(root)),
        "expected_rows": total_expected,
        "actual_rows": total_actual,
        "table_count": len(table_results),
        "bad_tables": missing,
        "missing_source_date_rows": sum(item["missing_source_date_rows"] for item in table_results),
        "tables": table_results,
        "ok": ok,
    }


def parse_args() -> argparse.Namespace:
    root = repo_root()
    parser = argparse.ArgumentParser()
    parser.add_argument("--sport", choices=("all", *SPORTS), default="all")
    parser.add_argument("--source-db", type=Path, default=default_source_db(root))
    parser.add_argument(
        "--report",
        type=Path,
        default=root / "data-migration" / "reports" / "phase6_validate_legacy_prediction_inputs_2026-06-02.json",
    )
    parser.add_argument("--no-write-health", action="store_true")
    args = parser.parse_args()
    if not args.source_db.is_absolute():
        args.source_db = root / args.source_db
    if not args.report.is_absolute():
        args.report = root / args.report
    return args


def main() -> int:
    root = repo_root()
    args = parse_args()
    args.report.parent.mkdir(parents=True, exist_ok=True)
    sports = SPORTS if args.sport == "all" else (args.sport,)
    report = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "phase": "6",
        "script": "data-migration/scripts/validate_legacy_prediction_inputs.py",
        "source_db": str(args.source_db.relative_to(root)),
        "sports": [
            validate_sport(root, sport, args.source_db, args.report, args.no_write_health)
            for sport in sports
        ],
    }
    report["ok"] = all(sport["ok"] for sport in report["sports"])
    args.report.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {args.report}")
    print(json.dumps(report, indent=2))
    return 0 if report["ok"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
