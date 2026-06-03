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

from pipeline.sources.mlb.normalization.common import append_normalization_event, compact_json, utc_now, write_report


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
        default=ROOT / "data-migration" / "reports" / "validate_mlb_source_snapshot_coverage_2026-06-03.json",
    )
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


def rows(con: sqlite3.Connection, sql: str, params: tuple[Any, ...] = ()) -> list[sqlite3.Row]:
    return con.execute(sql, params).fetchall()


def validate(args: argparse.Namespace) -> dict[str, Any]:
    if not args.typed_db.exists():
        raise FileNotFoundError(f"Missing typed DB: {args.typed_db}")
    if not args.legacy_db.exists():
        raise FileNotFoundError(f"Missing legacy DB: {args.legacy_db}")

    with sqlite3.connect(args.typed_db) as con:
        con.row_factory = sqlite3.Row
        con.execute("attach database ? as legacy", (str(args.legacy_db),))
        legacy_rows = rows(
            con,
            """
            select id, source_key, url, fetched_at, content_path, content_hash
            from legacy.source_snapshots
            where source_key like 'mlb.%'
               or content_path like '%/mlb/%'
            order by id
            """,
        )
        typed_snapshot_rows = rows(
            con,
            """
            select source_snapshot_id, source_name, local_path, content_hash
            from source_snapshots
            where sport='mlb'
              and local_path is not null
            """,
        )
        typed_paths = {str(row["local_path"]): dict(row) for row in typed_snapshot_rows}
        typed_hashes = {str(row["content_hash"]) for row in typed_snapshot_rows if row["content_hash"]}

        by_path: dict[str, sqlite3.Row] = {}
        duplicate_legacy_rows = 0
        source_key_counts: dict[str, int] = {}
        for row in legacy_rows:
            source_key_counts[row["source_key"]] = source_key_counts.get(row["source_key"], 0) + 1
            normalized_path = normalize_legacy_path(str(row["content_path"]))
            if normalized_path in by_path:
                duplicate_legacy_rows += 1
            else:
                by_path[normalized_path] = row

        missing_paths: list[dict[str, Any]] = []
        represented_paths = 0
        existing_local_files = 0
        hash_represented_paths = 0
        for normalized_path, row in by_path.items():
            if (ROOT / normalized_path).exists():
                existing_local_files += 1
            if normalized_path in typed_paths:
                represented_paths += 1
            else:
                missing_paths.append(
                    {
                        "legacy_id": row["id"],
                        "source_key": row["source_key"],
                        "normalized_path": normalized_path,
                        "file_exists": (ROOT / normalized_path).exists(),
                    }
                )
            if row["content_hash"] in typed_hashes:
                hash_represented_paths += 1

        games_with_source_snapshot_id = con.execute(
            "select count(*) from games where source_snapshot_id is not null and source_snapshot_id != ''"
        ).fetchone()[0]
        games_with_resolving_source_snapshot_id = con.execute(
            """
            select count(*)
            from games g
            join source_snapshots ss on ss.source_snapshot_id = g.source_snapshot_id
            where g.source_snapshot_id is not null
              and g.source_snapshot_id != ''
            """
        ).fetchone()[0]
        con.execute("detach database legacy")

    errors = []
    if missing_paths:
        errors.append(f"Legacy MLB source snapshot paths missing from typed source_snapshots: {len(missing_paths)}")
    if existing_local_files != len(by_path):
        errors.append("Some distinct legacy MLB source snapshot paths do not exist after normalization.")
    warnings = []
    if games_with_source_snapshot_id != games_with_resolving_source_snapshot_id:
        warnings.append("Some games have non-resolving source_snapshot_id values.")
    if games_with_source_snapshot_id != 899:
        warnings.append("Not every typed game row carries a direct source_snapshot_id; path-level source coverage is complete but row-level game linkage remains sparse.")

    return {
        "generated_at": utc_now(),
        "script": "data-migration/scripts/validate_mlb_source_snapshot_coverage.py",
        "typed_db": str(args.typed_db.relative_to(ROOT)),
        "legacy_db": str(args.legacy_db.relative_to(ROOT)),
        "legacy_rows": len(legacy_rows),
        "legacy_source_key_counts": source_key_counts,
        "legacy_duplicate_rows_by_normalized_path": duplicate_legacy_rows,
        "legacy_distinct_normalized_paths": len(by_path),
        "typed_mlb_source_snapshots": len(typed_snapshot_rows),
        "represented_normalized_paths": represented_paths,
        "hash_represented_paths": hash_represented_paths,
        "existing_local_files": existing_local_files,
        "missing_paths": len(missing_paths),
        "missing_path_samples": missing_paths[:20],
        "games_with_source_snapshot_id": games_with_source_snapshot_id,
        "games_with_resolving_source_snapshot_id": games_with_resolving_source_snapshot_id,
        "ok": not errors,
        "errors": errors,
        "warnings": warnings,
    }


def main() -> int:
    args = parse_args()
    report = validate(args)
    write_report(args.report, report)
    append_normalization_event(
        ROOT,
        {
            "event_id": f"validate-mlb-source-snapshot-coverage-{utc_now().replace(':', '-').replace('.', '-')}",
            "timestamp": utc_now(),
            "phase": "M3-D7",
            "area": "mlb_source_snapshot_coverage",
            "source": "data-private/warehouse/sports.db:source_snapshots",
            "target": "sql-mlb.db:source_snapshots",
            "parser_module": "none",
            "migration_script": "data-migration/scripts/validate_mlb_source_snapshot_coverage.py",
            "validation": "passed" if report["ok"] else "; ".join(report["errors"]),
            "status_from": "source-snapshots-backfilled",
            "status_to": "validated" if report["ok"] else "blocked",
            "report_path": str(args.report.relative_to(ROOT)),
            "checksum": None,
            "notes": compact_json(
                {
                    "legacy_distinct_normalized_paths": report["legacy_distinct_normalized_paths"],
                    "represented_normalized_paths": report["represented_normalized_paths"],
                    "missing_paths": report["missing_paths"],
                    "warnings": report["warnings"],
                }
            ),
        },
    )
    print(json.dumps(report, indent=2, sort_keys=True))
    return 0 if report["ok"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
