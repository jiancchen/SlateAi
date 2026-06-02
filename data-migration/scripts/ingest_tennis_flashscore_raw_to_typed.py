#!/usr/bin/env python3
from __future__ import annotations

import argparse
import hashlib
import json
import sqlite3
import sys
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[2]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from pipeline.sources.tennis.normalization.common import (
    TennisIdentityResolver,
    append_normalization_event,
    compact_json,
    stable_id,
    utc_now,
    write_report,
)
from pipeline.sources.tennis.normalization.stats import (
    build_service_pressure,
    insert_match_stat_rows,
    insert_service_pressure,
    parse_flashscore_raw_payload,
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--date", required=True)
    parser.add_argument(
        "--source-db",
        type=Path,
        default=ROOT / "data-private" / "warehouse" / "sports" / "tennis" / "sql-tennis.db",
    )
    parser.add_argument(
        "--source-dir",
        type=Path,
        default=ROOT / "data-private" / "reference" / "tennis" / "flashscore-match-stats",
    )
    parser.add_argument(
        "--report",
        type=Path,
        default=ROOT / "data-migration" / "reports" / "ingest_tennis_flashscore_raw_to_typed_2026-06-02.json",
    )
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()
    if not args.source_db.is_absolute():
        args.source_db = ROOT / args.source_db
    if not args.source_dir.is_absolute():
        args.source_dir = ROOT / args.source_dir
    if not args.report.is_absolute():
        args.report = ROOT / args.report
    return args


def read_json(path: Path) -> dict[str, Any]:
    try:
        parsed = json.loads(path.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, UnicodeDecodeError):
        return {}
    return parsed if isinstance(parsed, dict) else {}


def sha256_file(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def source_snapshot_id_for(local_path: str) -> str:
    return f"tennis-{stable_id('tennis_reference', local_path, length=32)}"


def sql_path(path: Path) -> str:
    return str(path.relative_to(ROOT))


def ensure_source_snapshot(con: sqlite3.Connection, file_path: Path, payload: dict[str, Any], date: str) -> str:
    local_path = sql_path(file_path)
    snapshot_id = source_snapshot_id_for(local_path)
    captured_at = payload.get("generatedAt") or utc_now()
    content_hash = sha256_file(file_path)
    notes = {
        "root": "data-private/reference/tennis",
        "parser_module": "pipeline/sources/tennis/normalization/stats.py",
        "active_raw_to_typed_adapter": True,
        "requested_date": date,
        "source_kind": payload.get("sourceKind"),
        "source_subkind": payload.get("sourceSubkind"),
        "match_id": payload.get("matchId"),
        "board_match_id": payload.get("boardMatchId"),
        "board_title": payload.get("boardTitle"),
    }
    con.execute(
        """
        insert into source_snapshots (
          source_snapshot_id, source_name, sport, source_url, local_path,
          captured_at, source_date, content_hash, content_type, status, notes
        ) values (?, 'tennis_reference', 'tennis', ?, ?, ?, ?, ?, 'application/json', 'captured', ?)
        on conflict(source_snapshot_id) do update set
          source_url = excluded.source_url,
          captured_at = excluded.captured_at,
          source_date = excluded.source_date,
          content_hash = excluded.content_hash,
          content_type = excluded.content_type,
          status = excluded.status,
          notes = excluded.notes
        """,
        (
            snapshot_id,
            payload.get("sourceUrl"),
            local_path,
            captured_at,
            payload.get("slateDate") or date,
            content_hash,
            compact_json(notes),
        ),
    )
    return snapshot_id


def payload_files(source_dir: Path, date: str) -> list[tuple[Path, dict[str, Any]]]:
    files = []
    for file_path in sorted(source_dir.glob("*.json")):
        payload = read_json(file_path)
        if payload.get("slateDate") == date:
            files.append((file_path, payload))
    return files


def update_fetch_status(
    con: sqlite3.Connection,
    *,
    date: str,
    source_files: int,
    parsed_rows: int,
    unresolved_added: int,
    report_path: Path,
    dry_run: bool,
) -> None:
    now = utc_now()
    status = "success" if source_files > 0 and parsed_rows > 0 else "missing"
    run_id = f"source-fetch-tennis_reference-flashscore-typed-{date}-{now.replace(':', '-').replace('.', '-')}"
    details = {
        "adapter": "tennis_flashscore_raw_to_typed",
        "dry_run": dry_run,
        "source_files": source_files,
        "parsed_rows": parsed_rows,
        "unresolved_added": unresolved_added,
        "report_path": sql_path(report_path),
        "note": "Typed parse run for Flashscore raw archive. This does not perform network fetch.",
    }
    con.execute(
        """
        insert into source_fetch_runs (
          source_fetch_run_id, sport, source_name, source_family, source_date,
          run_reason, requested_url, cache_status, cache_ttl_hours, previous_success_at,
          status, completeness_status, expected_item_count, actual_item_count,
          missing_item_count, source_snapshot_id, started_at, finished_at,
          error_code, error_message, details_json
        ) values (?, 'tennis', 'tennis_reference', 'match-reference', ?, 'typed_parse',
          null, 'not_applicable', null,
          (select last_success_at from source_fetch_status where sport='tennis' and source_name='tennis_reference' and source_date=?),
          ?, 'unknown', null, ?, null, null, ?, ?, null, null, ?)
        """,
        (
            run_id,
            date,
            date,
            status,
            source_files,
            now,
            now,
            compact_json(details),
        ),
    )
    con.execute(
        """
        insert into source_fetch_status (
          source_fetch_status_id, sport, source_name, source_family, source_date,
          last_fetch_run_id, last_attempt_at, last_success_at, last_status,
          last_completeness_status, cache_valid_until, expected_item_count,
          actual_item_count, missing_item_count, unresolved_count, updated_at, notes
        ) values (?, 'tennis', 'tennis_reference', 'match-reference', ?, ?, ?, ?,
          ?, 'unknown', datetime(?, '+12 hours'), null, ?, null, ?, ?, ?)
        on conflict (sport, source_name, source_date) do update set
          source_family = excluded.source_family,
          last_fetch_run_id = excluded.last_fetch_run_id,
          last_attempt_at = excluded.last_attempt_at,
          last_success_at = excluded.last_success_at,
          last_status = excluded.last_status,
          last_completeness_status = excluded.last_completeness_status,
          cache_valid_until = excluded.cache_valid_until,
          actual_item_count = excluded.actual_item_count,
          unresolved_count = excluded.unresolved_count,
          updated_at = excluded.updated_at,
          notes = excluded.notes
        """,
        (
            f"tennis:tennis_reference:{date}",
            date,
            run_id,
            now,
            now if status == "success" else None,
            status,
            now,
            source_files,
            unresolved_added,
            now,
            compact_json(details),
        ),
    )


def insert_health_check(con: sqlite3.Connection, *, date: str, status: str, report: dict[str, Any]) -> None:
    now = utc_now()
    con.execute(
        """
        insert into health_checks (
          health_check_id, model_run_id, check_name, status, expected_count,
          actual_count, details_json, checked_at
        ) values (?, null, ?, ?, ?, ?, ?, ?)
        on conflict(health_check_id) do update set
          status = excluded.status,
          expected_count = excluded.expected_count,
          actual_count = excluded.actual_count,
          details_json = excluded.details_json,
          checked_at = excluded.checked_at
        """,
        (
            f"tennis-flashscore-raw-to-typed:{date}",
            f"tennis_flashscore_raw_to_typed:{date}",
            status,
            report["source_files"],
            report["inserted_match_stat_rows"],
            compact_json(report),
            now,
        ),
    )


def ingest(args: argparse.Namespace) -> dict[str, Any]:
    files = payload_files(args.source_dir, args.date)
    with sqlite3.connect(args.source_db) as con:
        con.row_factory = sqlite3.Row
        con.execute("pragma foreign_keys = on")
        con.execute("begin")
        resolver = TennisIdentityResolver(con)
        before_unresolved = con.execute("select count(*) from unresolved_entities").fetchone()[0]
        before_match_stats = con.execute("select count(*) from match_stat_rows").fetchone()[0]
        before_pressure = con.execute("select count(*) from service_pressure_snapshots").fetchone()[0]

        parsed_rows = []
        counts = {
            "source_rows": 0,
            "parsed_rows": 0,
            "unparsed_rows": 0,
            "skipped_rows": 0,
        }
        source_snapshots = []
        for file_path, payload in files:
            snapshot_id = ensure_source_snapshot(con, file_path, payload, args.date)
            source_snapshots.append(snapshot_id)
            rows, row_counts = parse_flashscore_raw_payload(
                payload,
                resolver,
                source_snapshot_id=snapshot_id,
                local_path=sql_path(file_path),
            )
            parsed_rows.extend(rows)
            for key in counts:
                counts[key] += row_counts.get(key, 0)

        pressure = build_service_pressure(parsed_rows)
        inserted_match_stat_rows = 0
        inserted_service_pressure_rows = 0
        if not args.dry_run:
            inserted_match_stat_rows = insert_match_stat_rows(con, parsed_rows)
            inserted_service_pressure_rows = insert_service_pressure(con, pressure)

        after_unresolved = con.execute("select count(*) from unresolved_entities").fetchone()[0]
        after_match_stats = con.execute("select count(*) from match_stat_rows").fetchone()[0]
        after_pressure = con.execute("select count(*) from service_pressure_snapshots").fetchone()[0]
        unresolved_added = after_unresolved - before_unresolved

        report = {
            "generated_at": utc_now(),
            "script": "data-migration/scripts/ingest_tennis_flashscore_raw_to_typed.py",
            "parser_module": "pipeline/sources/tennis/normalization/stats.py",
            "source_db": sql_path(args.source_db),
            "source_dir": sql_path(args.source_dir),
            "date": args.date,
            "dry_run": args.dry_run,
            "source_files": len(files),
            "source_snapshot_rows": len(source_snapshots),
            **counts,
            "service_pressure_rows": len(pressure),
            "inserted_match_stat_rows": inserted_match_stat_rows,
            "inserted_service_pressure_rows": inserted_service_pressure_rows,
            "unresolved_rows_added": unresolved_added,
            "before_counts": {
                "match_stat_rows": before_match_stats,
                "service_pressure_snapshots": before_pressure,
                "unresolved_entities": before_unresolved,
            },
            "after_counts": {
                "match_stat_rows": after_match_stats,
                "service_pressure_snapshots": after_pressure,
                "unresolved_entities": after_unresolved,
            },
            "row_count_delta": {
                "match_stat_rows": after_match_stats - before_match_stats,
                "service_pressure_snapshots": after_pressure - before_pressure,
                "unresolved_entities": unresolved_added,
            },
            "sample_source_snapshots": source_snapshots[:8],
            "ok": len(files) > 0 and len(parsed_rows) > 0,
        }
        health_status = "ok" if report["ok"] else "blocked"

        if args.dry_run:
            con.rollback()
        else:
            update_fetch_status(
                con,
                date=args.date,
                source_files=len(files),
                parsed_rows=len(parsed_rows),
                unresolved_added=unresolved_added,
                report_path=args.report,
                dry_run=args.dry_run,
            )
            insert_health_check(con, date=args.date, status=health_status, report=report)
            con.commit()
            append_normalization_event(
                ROOT,
                {
                    "event_id": f"phase9b-tennis-flashscore-raw-to-typed-{args.date}-{utc_now().replace(':', '-').replace('.', '-')}",
                    "timestamp": utc_now(),
                    "phase": "9B.1",
                    "area": "tennis_flashscore_raw_to_typed",
                    "source": "data-private/reference/tennis/flashscore-match-stats",
                    "target": "sql-tennis.db:match_stat_rows,service_pressure_snapshots,source_fetch_status",
                    "parser_module": "pipeline/sources/tennis/normalization/stats.py",
                    "migration_script": "data-migration/scripts/ingest_tennis_flashscore_raw_to_typed.py",
                    "validation": "pending",
                    "status_from": "started",
                    "status_to": "inserted",
                    "report_path": sql_path(args.report),
                    "checksum": None,
                    "notes": compact_json(
                        {
                            "source_files": len(files),
                            "parsed_rows": len(parsed_rows),
                            "inserted_match_stat_rows": inserted_match_stat_rows,
                            "inserted_service_pressure_rows": inserted_service_pressure_rows,
                            "unresolved_rows_added": unresolved_added,
                        }
                    ),
                },
            )
        return report


def main() -> int:
    args = parse_args()
    report = ingest(args)
    write_report(args.report, report)
    print(json.dumps(report, indent=2, sort_keys=True))
    return 0 if report["ok"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
