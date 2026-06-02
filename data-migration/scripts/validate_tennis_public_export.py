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
    parser.add_argument("--date", required=True)
    parser.add_argument("--source-db", type=Path, default=default_db(root))
    parser.add_argument("--export-dir", type=Path)
    parser.add_argument("--report", type=Path)
    parser.add_argument("--no-write-health", action="store_true")
    args = parser.parse_args()
    if not args.source_db.is_absolute():
        args.source_db = root / args.source_db
    if args.export_dir is None:
        args.export_dir = root / "data-migration" / "export-previews" / "tennis" / args.date
    elif not args.export_dir.is_absolute():
        args.export_dir = root / args.export_dir
    if args.report is None:
        args.report = root / "data-migration" / "reports" / f"validate_tennis_public_export_preview_{args.date}.json"
    elif not args.report.is_absolute():
        args.report = root / args.report
    return args


def main() -> int:
    root = repo_root()
    args = parse_args()
    summary_path = args.export_dir / "summary.json"
    game_dir = args.export_dir / "games"
    errors: list[str] = []
    if not summary_path.exists():
        errors.append(f"Missing summary export: {summary_path}")
        payload = {}
    else:
        payload = json.loads(summary_path.read_text(encoding="utf-8"))
    games = payload.get("games") if isinstance(payload, dict) else []
    if not isinstance(games, list):
        errors.append("summary.games is not a list")
        games = []
    game_files = sorted(game_dir.glob("*.json")) if game_dir.exists() else []
    game_ids = [game.get("id") for game in games if isinstance(game, dict)]

    with sqlite3.connect(args.source_db) as con:
        db_match_ids = [
            row[0]
            for row in con.execute("select match_id from matches where match_date = ? order by match_id", (args.date,)).fetchall()
        ]
        db_match_count = len(db_match_ids)
        model_run_id = ((payload.get("migrationExport") or {}).get("resolvedModel") or {}).get("model_run_id")
        db_prediction_count = 0
        if model_run_id:
            db_prediction_count = int(
                con.execute("select count(*) from prediction_rows where model_run_id = ?", (model_run_id,)).fetchone()[0]
            )
        manifest = None
        if summary_path.exists():
            output_hash = sha256_file(summary_path)
            manifest = con.execute(
                """
                select export_manifest_id, output_hash, row_count
                from export_manifests
                where sport = 'tennis'
                  and export_type = 'tennis_public_slate_preview'
                  and export_date = ?
                  and output_path = ?
                order by created_at desc
                limit 1
                """,
                (args.date, str(summary_path.relative_to(root))),
            ).fetchone()
        else:
            output_hash = None

    if len(games) != db_match_count:
        errors.append(f"Game count mismatch: export {len(games)} vs DB {db_match_count}")
    if len(game_files) != len(games):
        errors.append(f"Game file count mismatch: files {len(game_files)} vs summary {len(games)}")
    if len(set(game_ids)) != len(game_ids):
        errors.append("Exported game IDs are not unique")
    missing_from_export = sorted(set(db_match_ids) - set(game_ids))
    extra_in_export = sorted(set(game_ids) - set(db_match_ids))
    if missing_from_export:
        errors.append(f"Missing DB match IDs in export: {missing_from_export[:5]}")
    if extra_in_export:
        errors.append(f"Export has unknown match IDs: {extra_in_export[:5]}")
    exported_prediction_count = (payload.get("summary") or {}).get("predictionRows")
    if exported_prediction_count != db_prediction_count:
        errors.append(f"Prediction count mismatch: export {exported_prediction_count} vs DB {db_prediction_count}")
    if manifest is None:
        errors.append("No matching export_manifests row found")
    elif manifest[1] != output_hash or int(manifest[2]) != len(games):
        errors.append("Export manifest hash or row count mismatch")

    ok = not errors
    report = {
        "generated_at": utc_now(),
        "script": "data-migration/scripts/validate_tennis_public_export.py",
        "contract": "data-migration/contracts/tennis_public_export_contract.md",
        "date": args.date,
        "source_db": str(args.source_db.relative_to(root)),
        "export_dir": str(args.export_dir.relative_to(root)),
        "summary_path": str(summary_path.relative_to(root)),
        "db_match_count": db_match_count,
        "export_game_count": len(games),
        "game_file_count": len(game_files),
        "db_prediction_count": db_prediction_count,
        "export_prediction_count": exported_prediction_count,
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
                ) values (?, ?, 'tennis_public_export_preview_validation', 'ok', ?, ?, ?, ?)
                """,
                (
                    f"tennis-public-export-preview-validation-{args.date}-{utc_now().replace(':', '-').replace('.', '-')}",
                    model_run_id,
                    db_match_count,
                    len(games),
                    json.dumps({"report_path": str(args.report.relative_to(root)), "manifest_id": report["manifest_id"]}, sort_keys=True),
                    utc_now(),
                ),
            )
            con.commit()

    append_event(
        root,
        {
            "event_id": f"tennis-public-export-preview-validation-{args.date}-{utc_now().replace(':', '-').replace('.', '-')}",
            "timestamp": utc_now(),
            "phase": "8",
            "area": "tennis_db_derived_public_export_preview_validation",
            "source": str(args.source_db.relative_to(root)),
            "target": str(args.export_dir.relative_to(root)),
            "parser_module": "none",
            "migration_script": "data-migration/scripts/validate_tennis_public_export.py",
            "validation": "tennis public export validation passed" if ok else "; ".join(errors),
            "status_from": "backfilled",
            "status_to": "validated" if ok else "blocked",
            "report_path": str(args.report.relative_to(root)),
            "checksum": output_hash,
            "notes": "Preview export validation; published-data and web mirrors unchanged.",
        },
    )

    args.report.parent.mkdir(parents=True, exist_ok=True)
    args.report.write_text(json.dumps(report, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2, sort_keys=True))
    return 0 if ok else 1


if __name__ == "__main__":
    raise SystemExit(main())
