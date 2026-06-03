#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import re
import sqlite3
import sys
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[2]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from pipeline.sources.mlb.normalization.common import append_normalization_event, compact_json, stable_id, utc_now, write_report


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--typed-db",
        type=Path,
        default=ROOT / "data-private" / "warehouse" / "sports" / "mlb" / "sql-mlb.db",
    )
    parser.add_argument(
        "--legacy-db",
        type=Path,
        default=ROOT / "data-private" / "warehouse" / "sports.db",
    )
    parser.add_argument(
        "--report",
        type=Path,
        default=ROOT / "data-migration" / "reports" / "backfill_mlb_source_snapshots_from_legacy_2026-06-03.json",
    )
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()
    if not args.typed_db.is_absolute():
        args.typed_db = ROOT / args.typed_db
    if not args.legacy_db.is_absolute():
        args.legacy_db = ROOT / args.legacy_db
    if not args.report.is_absolute():
        args.report = ROOT / args.report
    return args


def normalize_legacy_path(path: str) -> str:
    return path.replace("data/raw/", "data-private/raw/", 1) if path.startswith("data/raw/") else path


def source_name_for(source_key: str) -> str:
    mapping = {
        "mlb.schedule": "mlb_schedule_legacy",
        "mlb.feed_live": "mlb_game_feed_legacy",
        "kalshi.mlb.live": "kalshi_mlb_live",
    }
    return mapping.get(source_key, re.sub(r"[^a-zA-Z0-9]+", "_", source_key).strip("_").lower() or "legacy_mlb_source")


def source_date_for(path: str, fetched_at: str | None) -> str | None:
    match = re.search(r"20\d{2}-\d{2}-\d{2}", path)
    if match:
        return match.group(0)
    return None if not fetched_at else fetched_at[:10]


def content_type_for(path: str) -> str:
    if path.endswith(".json.gz"):
        return "application/json+gzip"
    if path.endswith(".json"):
        return "application/json"
    return "application/octet-stream"


def fetch_legacy_mlb_snapshots(con: sqlite3.Connection) -> list[sqlite3.Row]:
    return con.execute(
        """
        select id, source_key, url, fetched_at, content_path, content_hash, meta_json
        from legacy.source_snapshots
        where source_key like 'mlb.%'
           or content_path like '%/mlb/%'
        order by id
        """
    ).fetchall()


def backfill(args: argparse.Namespace) -> dict[str, Any]:
    if not args.typed_db.exists():
        raise FileNotFoundError(f"Missing typed DB: {args.typed_db}")
    if not args.legacy_db.exists():
        raise FileNotFoundError(f"Missing legacy DB: {args.legacy_db}")

    inserted: list[dict[str, Any]] = []
    already_present = 0
    missing_files: list[dict[str, Any]] = []
    with sqlite3.connect(args.typed_db) as con:
        con.row_factory = sqlite3.Row
        con.execute("attach database ? as legacy", (str(args.legacy_db),))
        typed_paths = {
            str(row["local_path"])
            for row in con.execute("select local_path from source_snapshots where sport='mlb' and local_path is not null")
        }
        by_path: dict[str, sqlite3.Row] = {}
        legacy_rows = fetch_legacy_mlb_snapshots(con)
        for row in legacy_rows:
            normalized_path = normalize_legacy_path(str(row["content_path"]))
            if normalized_path not in by_path:
                by_path[normalized_path] = row

        if not args.dry_run:
            con.execute("begin")
        try:
            for normalized_path, row in by_path.items():
                if normalized_path in typed_paths:
                    already_present += 1
                    continue
                exists = (ROOT / normalized_path).exists()
                if not exists:
                    missing_files.append(
                        {
                            "legacy_id": row["id"],
                            "source_key": row["source_key"],
                            "normalized_path": normalized_path,
                        }
                    )
                    continue
                source_snapshot_id = "mlb-" + stable_id("legacy-source-snapshot", row["source_key"], normalized_path, row["content_hash"], length=32)
                notes = {
                    "legacy_source_snapshot_id": row["id"],
                    "legacy_source_key": row["source_key"],
                    "legacy_content_path": row["content_path"],
                    "legacy_meta_json": row["meta_json"],
                    "migration": "backfill_mlb_source_snapshots_from_legacy",
                }
                values = {
                    "source_snapshot_id": source_snapshot_id,
                    "source_name": source_name_for(str(row["source_key"])),
                    "sport": "mlb",
                    "source_url": row["url"],
                    "local_path": normalized_path,
                    "captured_at": row["fetched_at"],
                    "source_date": source_date_for(normalized_path, row["fetched_at"]),
                    "content_hash": row["content_hash"],
                    "content_type": content_type_for(normalized_path),
                    "status": "captured",
                    "notes": compact_json(notes),
                }
                inserted.append(
                    {
                        "source_snapshot_id": source_snapshot_id,
                        "source_name": values["source_name"],
                        "local_path": normalized_path,
                        "legacy_id": row["id"],
                    }
                )
                if not args.dry_run:
                    con.execute(
                        """
                        insert into source_snapshots (
                          source_snapshot_id, source_name, sport, source_url, local_path,
                          captured_at, source_date, content_hash, content_type, status, notes
                        ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                        on conflict(source_snapshot_id) do update set
                          source_name = excluded.source_name,
                          source_url = excluded.source_url,
                          local_path = excluded.local_path,
                          captured_at = excluded.captured_at,
                          source_date = excluded.source_date,
                          content_hash = excluded.content_hash,
                          content_type = excluded.content_type,
                          status = excluded.status,
                          notes = excluded.notes
                        """,
                        tuple(values.values()),
                    )
            if not args.dry_run:
                con.commit()
        except Exception:
            if not args.dry_run:
                con.rollback()
            raise
        finally:
            con.execute("detach database legacy")

    errors = []
    if missing_files:
        errors.append(f"Legacy MLB source snapshot paths missing local files: {len(missing_files)}")

    return {
        "generated_at": utc_now(),
        "script": "data-migration/scripts/backfill_mlb_source_snapshots_from_legacy.py",
        "typed_db": str(args.typed_db.relative_to(ROOT)),
        "legacy_db": str(args.legacy_db.relative_to(ROOT)),
        "dry_run": args.dry_run,
        "legacy_rows": len(legacy_rows),
        "legacy_distinct_normalized_paths": len(by_path),
        "already_present_paths": already_present,
        "inserted_paths": len(inserted),
        "inserted_samples": inserted[:20],
        "missing_files": len(missing_files),
        "missing_file_samples": missing_files[:20],
        "ok": not errors,
        "errors": errors,
    }


def main() -> int:
    args = parse_args()
    report = backfill(args)
    write_report(args.report, report)
    if not args.dry_run:
        append_normalization_event(
            ROOT,
            {
                "event_id": f"backfill-mlb-source-snapshots-from-legacy-{utc_now().replace(':', '-').replace('.', '-')}",
                "timestamp": utc_now(),
                "phase": "M3-D6",
                "area": "mlb_source_snapshot_backfill",
                "source": "data-private/warehouse/sports.db:source_snapshots",
                "target": "sql-mlb.db:source_snapshots",
                "parser_module": "none",
                "migration_script": "data-migration/scripts/backfill_mlb_source_snapshots_from_legacy.py",
                "validation": "passed" if report["ok"] else "; ".join(report["errors"]),
                "status_from": "source-snapshot-coverage-gap",
                "status_to": "source-snapshots-backfilled" if report["ok"] else "blocked",
                "report_path": str(args.report.relative_to(ROOT)),
                "checksum": None,
                "notes": compact_json(
                    {
                        "legacy_distinct_normalized_paths": report["legacy_distinct_normalized_paths"],
                        "inserted_paths": report["inserted_paths"],
                        "missing_files": report["missing_files"],
                    }
                ),
            },
        )
    print(json.dumps(report, indent=2, sort_keys=True))
    return 0 if report["ok"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
