#!/usr/bin/env python3
from __future__ import annotations

import argparse
import hashlib
import json
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


def repo_root() -> Path:
    return Path(__file__).resolve().parents[2]


def default_db(root: Path) -> Path:
    return root / "data-private" / "warehouse" / "sports" / "tennis" / "sql-tennis.db"


def compact_json(value: Any) -> str:
    return json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False)


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def append_event(root: Path, event: dict[str, Any]) -> None:
    event_path = root / "data-migration" / "migration_events.jsonl"
    with event_path.open("a", encoding="utf-8") as handle:
        handle.write(compact_json(event) + "\n")


def parse_args() -> argparse.Namespace:
    root = repo_root()
    parser = argparse.ArgumentParser()
    parser.add_argument("--source-db", type=Path, default=default_db(root))
    parser.add_argument("--export-dir", type=Path)
    parser.add_argument("--report", type=Path)
    parser.add_argument("--no-write-health", action="store_true")
    args = parser.parse_args()
    if not args.source_db.is_absolute():
        args.source_db = root / args.source_db
    if args.export_dir is None:
        args.export_dir = root / "data-migration" / "export-previews" / "tennis" / "index"
    elif not args.export_dir.is_absolute():
        args.export_dir = root / args.export_dir
    if args.report is None:
        args.report = root / "data-migration" / "reports" / "validate_tennis_public_index_preview_2026-06-02.json"
    elif not args.report.is_absolute():
        args.report = root / args.report
    return args


def main() -> int:
    root = repo_root()
    args = parse_args()
    index_path = args.export_dir / "index.json"
    errors: list[str] = []
    if not index_path.exists():
        errors.append(f"Missing index export: {index_path}")
        payload: dict[str, Any] = {}
    else:
        payload = json.loads(index_path.read_text(encoding="utf-8"))

    summary = payload.get("summary") if isinstance(payload, dict) else {}
    dates = payload.get("dates") if isinstance(payload, dict) else []
    models = payload.get("models") if isinstance(payload, dict) else []
    if not isinstance(summary, dict):
        errors.append("index.summary is not an object")
        summary = {}
    if not isinstance(dates, list):
        errors.append("index.dates is not a list")
        dates = []
    if not isinstance(models, list):
        errors.append("index.models is not a list")
        models = []
    date_ids = [row.get("date") for row in dates if isinstance(row, dict)]

    with sqlite3.connect(args.source_db) as con:
        db_dates = [
            row[0]
            for row in con.execute(
                "select distinct match_date from matches where match_date is not null order by match_date desc"
            ).fetchall()
        ]
        db_match_count = int(con.execute("select count(*) from matches").fetchone()[0])
        db_model_run_count = int(con.execute("select count(*) from model_runs").fetchone()[0])
        db_prediction_count = int(con.execute("select count(*) from prediction_rows").fetchone()[0])
        if index_path.exists():
            output_hash = sha256_file(index_path)
            manifest = con.execute(
                """
                select export_manifest_id, output_hash, row_count
                from export_manifests
                where sport = 'tennis'
                  and export_type = 'tennis_public_index_preview'
                  and export_date = 'all'
                  and model_id = 'all'
                  and output_path = ?
                order by created_at desc
                limit 1
                """,
                (str(index_path.relative_to(root)),),
            ).fetchone()
        else:
            output_hash = None
            manifest = None

    if summary.get("dateCount") != len(db_dates):
        errors.append(f"Date count mismatch: export {summary.get('dateCount')} vs DB {len(db_dates)}")
    if len(dates) != len(db_dates):
        errors.append(f"Date entry count mismatch: export {len(dates)} vs DB {len(db_dates)}")
    if summary.get("matchCount") != db_match_count:
        errors.append(f"Match count mismatch: export {summary.get('matchCount')} vs DB {db_match_count}")
    if summary.get("modelRunCount") != db_model_run_count:
        errors.append(f"Model run count mismatch: export {summary.get('modelRunCount')} vs DB {db_model_run_count}")
    if len(models) != db_model_run_count:
        errors.append(f"Model entry count mismatch: export {len(models)} vs DB {db_model_run_count}")
    if summary.get("predictionRowCount") != db_prediction_count:
        errors.append(f"Prediction count mismatch: export {summary.get('predictionRowCount')} vs DB {db_prediction_count}")
    if len(set(date_ids)) != len(date_ids):
        errors.append("Date entries are not unique")
    missing_dates = sorted(set(db_dates) - set(date_ids))
    extra_dates = sorted(set(date_ids) - set(db_dates))
    if missing_dates:
        errors.append(f"Missing DB dates in export: {missing_dates[:5]}")
    if extra_dates:
        errors.append(f"Export has unknown dates: {extra_dates[:5]}")
    if manifest is None:
        errors.append("No matching export_manifests row found")
    elif manifest[1] != output_hash or int(manifest[2]) != len(db_dates):
        errors.append("Index manifest hash or row count mismatch")

    ok = not errors
    report = {
        "generated_at": utc_now(),
        "script": "data-migration/scripts/validate_tennis_public_index.py",
        "contract": "data-migration/contracts/tennis_public_index_contract.md",
        "source_db": str(args.source_db.relative_to(root)),
        "export_dir": str(args.export_dir.relative_to(root)),
        "index_path": str(index_path.relative_to(root)),
        "db_date_count": len(db_dates),
        "export_date_count": len(dates),
        "db_match_count": db_match_count,
        "export_match_count": summary.get("matchCount"),
        "db_model_run_count": db_model_run_count,
        "export_model_run_count": len(models),
        "db_prediction_count": db_prediction_count,
        "export_prediction_count": summary.get("predictionRowCount"),
        "manifest_id": manifest[0] if manifest else None,
        "errors": errors,
        "ok": ok,
    }

    if ok and not args.no_write_health:
        with sqlite3.connect(args.source_db) as con:
            con.execute(
                """
                insert into health_checks (
                  health_check_id, model_run_id, check_name, status,
                  expected_count, actual_count, details_json, checked_at
                ) values (?, null, 'tennis_public_index_preview_validation', 'ok', ?, ?, ?, ?)
                """,
                (
                    f"tennis-public-index-preview-validation-{utc_now().replace(':', '-').replace('.', '-')}",
                    len(db_dates),
                    len(dates),
                    json.dumps({"report_path": str(args.report.relative_to(root)), "manifest_id": report["manifest_id"]}, sort_keys=True),
                    utc_now(),
                ),
            )
            con.commit()

    append_event(
        root,
        {
            "event_id": f"tennis-public-index-preview-validation-{utc_now().replace(':', '-').replace('.', '-')}",
            "timestamp": utc_now(),
            "phase": "8",
            "area": "tennis_db_derived_public_index_preview_validation",
            "source": str(args.source_db.relative_to(root)),
            "target": str(args.export_dir.relative_to(root)),
            "parser_module": "none",
            "migration_script": "data-migration/scripts/validate_tennis_public_index.py",
            "validation": "tennis public index validation passed" if ok else "; ".join(errors),
            "status_from": "backfilled",
            "status_to": "validated" if ok else "blocked",
            "report_path": str(args.report.relative_to(root)),
            "checksum": output_hash,
            "notes": "Preview index validation; published-data and web mirrors unchanged.",
        },
    )

    args.report.parent.mkdir(parents=True, exist_ok=True)
    args.report.write_text(json.dumps(report, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2, sort_keys=True))
    return 0 if ok else 1


if __name__ == "__main__":
    raise SystemExit(main())
