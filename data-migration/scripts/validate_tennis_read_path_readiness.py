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


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def compact_json(value: Any) -> str:
    return json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False)


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def append_event(root: Path, event: dict[str, Any]) -> None:
    event_path = root / "data-migration" / "migration_events.jsonl"
    with event_path.open("a", encoding="utf-8") as handle:
        handle.write(compact_json(event) + "\n")


def parse_args() -> argparse.Namespace:
    root = repo_root()
    parser = argparse.ArgumentParser()
    parser.add_argument("--date", required=True)
    parser.add_argument("--source-db", type=Path, default=default_db(root))
    parser.add_argument("--preview-root", type=Path, default=root / "data-migration" / "export-previews" / "tennis")
    parser.add_argument(
        "--duckdb-report",
        type=Path,
        default=root / "data-migration" / "reports" / "phase5_build_tennis_duckdb_after_public_index_2026-06-02.json",
    )
    parser.add_argument("--report", type=Path)
    args = parser.parse_args()
    if not args.source_db.is_absolute():
        args.source_db = root / args.source_db
    if not args.preview_root.is_absolute():
        args.preview_root = root / args.preview_root
    if not args.duckdb_report.is_absolute():
        args.duckdb_report = root / args.duckdb_report
    if args.report is None:
        args.report = root / "data-migration" / "reports" / f"validate_tennis_read_path_readiness_{args.date}.json"
    elif not args.report.is_absolute():
        args.report = root / args.report
    return args


def load_json(path: Path, errors: list[str], label: str) -> dict[str, Any]:
    if not path.exists():
        errors.append(f"Missing {label}: {path}")
        return {}
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        errors.append(f"Invalid JSON in {label}: {exc}")
        return {}


def manifest_for(con: sqlite3.Connection, export_type: str, export_date: str, output_path: str) -> sqlite3.Row | None:
    con.row_factory = sqlite3.Row
    return con.execute(
        """
        select export_manifest_id, output_hash, row_count, model_id, created_at
        from export_manifests
        where sport = 'tennis'
          and export_type = ?
          and export_date = ?
          and output_path = ?
        order by created_at desc
        limit 1
        """,
        (export_type, export_date, output_path),
    ).fetchone()


def health_count(con: sqlite3.Connection, check_name: str) -> int:
    return int(
        con.execute(
            "select count(*) from health_checks where check_name = ? and status = 'ok'",
            (check_name,),
        ).fetchone()[0]
    )


def main() -> int:
    root = repo_root()
    args = parse_args()
    errors: list[str] = []
    index_path = args.preview_root / "index" / "index.json"
    slate_path = args.preview_root / args.date / "summary.json"
    game_dir = args.preview_root / args.date / "games"
    index_payload = load_json(index_path, errors, "tennis preview index")
    slate_payload = load_json(slate_path, errors, "tennis preview slate")
    duck_payload = load_json(args.duckdb_report, errors, "tennis DuckDB rebuild report")

    index_dates = [
        row.get("date")
        for row in index_payload.get("dates", [])
        if isinstance(row, dict)
    ]
    slate_games = slate_payload.get("games", []) if isinstance(slate_payload, dict) else []
    game_files = sorted(game_dir.glob("*.json")) if game_dir.exists() else []

    with sqlite3.connect(args.source_db) as con:
        db_match_count = int(con.execute("select count(*) from matches where match_date = ?", (args.date,)).fetchone()[0])
        db_date_count = int(con.execute("select count(distinct match_date) from matches where match_date is not null").fetchone()[0])
        db_total_matches = int(con.execute("select count(*) from matches").fetchone()[0])
        db_model_runs = int(con.execute("select count(*) from model_runs").fetchone()[0])
        db_prediction_rows = int(con.execute("select count(*) from prediction_rows").fetchone()[0])
        index_manifest = manifest_for(
            con,
            "tennis_public_index_preview",
            "all",
            str(index_path.relative_to(root)),
        )
        slate_manifest = manifest_for(
            con,
            "tennis_public_slate_preview",
            args.date,
            str(slate_path.relative_to(root)),
        )
        index_health = health_count(con, "tennis_public_index_preview_validation")
        slate_health = health_count(con, "tennis_public_export_preview_validation")

    if args.date not in index_dates:
        errors.append(f"Preview index does not include target date {args.date}")
    index_summary = index_payload.get("summary") or {}
    if index_summary.get("dateCount") != db_date_count:
        errors.append(f"Index date count mismatch: {index_summary.get('dateCount')} vs DB {db_date_count}")
    if index_summary.get("matchCount") != db_total_matches:
        errors.append(f"Index match count mismatch: {index_summary.get('matchCount')} vs DB {db_total_matches}")
    if index_summary.get("modelRunCount") != db_model_runs:
        errors.append(f"Index model run count mismatch: {index_summary.get('modelRunCount')} vs DB {db_model_runs}")
    if index_summary.get("predictionRowCount") != db_prediction_rows:
        errors.append(f"Index prediction count mismatch: {index_summary.get('predictionRowCount')} vs DB {db_prediction_rows}")
    if len(slate_games) != db_match_count:
        errors.append(f"Slate game count mismatch: export {len(slate_games)} vs DB {db_match_count}")
    if len(game_files) != len(slate_games):
        errors.append(f"Slate game file count mismatch: files {len(game_files)} vs summary {len(slate_games)}")
    if index_manifest is None:
        errors.append("Missing DB export manifest for tennis public index preview")
    elif index_path.exists() and index_manifest["output_hash"] != sha256_file(index_path):
        errors.append("Index manifest hash mismatch")
    elif index_manifest and int(index_manifest["row_count"]) != db_date_count:
        errors.append("Index manifest row count mismatch")
    if slate_manifest is None:
        errors.append(f"Missing DB export manifest for tennis public slate preview {args.date}")
    elif slate_path.exists() and slate_manifest["output_hash"] != sha256_file(slate_path):
        errors.append("Slate manifest hash mismatch")
    elif slate_manifest and int(slate_manifest["row_count"]) != db_match_count:
        errors.append("Slate manifest row count mismatch")
    if index_health < 1:
        errors.append("No successful tennis public index validation health check found")
    if slate_health < 1:
        errors.append("No successful tennis public slate validation health check found")

    duck_ok = bool(duck_payload.get("ok"))
    duck_mismatches = None
    if duck_payload:
        sports = duck_payload.get("sports") or []
        tennis_report = next((row for row in sports if row.get("sport") == "tennis"), None)
        if not tennis_report:
            errors.append("DuckDB report does not include tennis")
        else:
            duck_mismatches = tennis_report.get("mismatches")
            if tennis_report.get("ok") is not True:
                errors.append("DuckDB tennis report is not ok")
            if duck_mismatches:
                errors.append(f"DuckDB table mismatches: {duck_mismatches}")
    if not duck_ok:
        errors.append("DuckDB rebuild report is not ok")

    ok = not errors
    report = {
        "generated_at": utc_now(),
        "script": "data-migration/scripts/validate_tennis_read_path_readiness.py",
        "contract": "data-migration/contracts/tennis_read_path_readiness_contract.md",
        "date": args.date,
        "source_db": str(args.source_db.relative_to(root)),
        "preview_root": str(args.preview_root.relative_to(root)),
        "index_path": str(index_path.relative_to(root)),
        "slate_path": str(slate_path.relative_to(root)),
        "duckdb_report": str(args.duckdb_report.relative_to(root)),
        "db_date_count": db_date_count,
        "db_match_count": db_match_count,
        "slate_game_count": len(slate_games),
        "game_file_count": len(game_files),
        "index_manifest_id": index_manifest["export_manifest_id"] if index_manifest else None,
        "slate_manifest_id": slate_manifest["export_manifest_id"] if slate_manifest else None,
        "index_health_checks": index_health,
        "slate_health_checks": slate_health,
        "duckdb_ok": duck_ok,
        "duckdb_mismatches": duck_mismatches,
        "errors": errors,
        "ok": ok,
    }

    append_event(
        root,
        {
            "event_id": f"tennis-read-path-readiness-{args.date}-{utc_now().replace(':', '-').replace('.', '-')}",
            "timestamp": utc_now(),
            "phase": "8",
            "area": "tennis_read_path_readiness",
            "source": str(args.source_db.relative_to(root)),
            "target": str(args.preview_root.relative_to(root)),
            "parser_module": "none",
            "migration_script": "data-migration/scripts/validate_tennis_read_path_readiness.py",
            "validation": "tennis read-path readiness passed" if ok else "; ".join(errors),
            "status_from": "validated",
            "status_to": "read_path_ready" if ok else "blocked",
            "report_path": str(args.report.relative_to(root)),
            "checksum": hashlib.sha256(compact_json(report).encode("utf-8")).hexdigest(),
            "notes": "Readiness check only; API/site/public outputs unchanged.",
        },
    )

    args.report.parent.mkdir(parents=True, exist_ok=True)
    args.report.write_text(json.dumps(report, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2, sort_keys=True))
    return 0 if ok else 1


if __name__ == "__main__":
    raise SystemExit(main())
