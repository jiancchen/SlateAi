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
from pipeline.sources.tennis.normalization.context import (
    insert_player_form_snapshots,
    insert_recent_matches as insert_recent_match_rows,
    parse_flashscore_player_pages_payload,
    parse_flashscore_recent_match_map_payload,
)
from pipeline.sources.tennis.normalization.stats import insert_service_pressure


SOURCE_NAME = "tennis_player_context"
SOURCE_FAMILY = "player-context"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--date", required=True)
    parser.add_argument(
        "--source-db",
        type=Path,
        default=ROOT / "data-private" / "warehouse" / "sports" / "tennis" / "sql-tennis.db",
    )
    parser.add_argument(
        "--report",
        type=Path,
        default=ROOT / "data-migration" / "reports" / "ingest_tennis_player_context_raw_to_typed_2026-06-02.json",
    )
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()
    if not args.source_db.is_absolute():
        args.source_db = ROOT / args.source_db
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


def sql_path(path: Path) -> str:
    return str(path.relative_to(ROOT))


def source_snapshot_id_for(local_path: str) -> str:
    return f"tennis-{stable_id(SOURCE_NAME, local_path, length=32)}"


def candidate_files(date: str) -> list[Path]:
    base = ROOT / "data-private" / "reference" / "tennis"
    candidates = [
        base / f"flashscore-player-pages-{date}.json",
        base / f"flashscore-recent-match-map-{date}.json",
    ]
    return [path for path in candidates if path.exists()]


def parse_family(file_path: Path) -> str:
    if "flashscore-player-pages" in file_path.name:
        return "flashscore_player_pages"
    if "flashscore-recent-match-map" in file_path.name:
        return "flashscore_recent_match_map"
    return "unknown"


def ensure_source_snapshot(con: sqlite3.Connection, file_path: Path, payload: dict[str, Any], date: str) -> str:
    local_path = sql_path(file_path)
    snapshot_id = source_snapshot_id_for(local_path)
    notes = {
        "root": "data-private/reference/tennis",
        "parser_module": "pipeline/sources/tennis/normalization/context.py",
        "active_raw_to_typed_adapter": True,
        "requested_date": date,
        "payload_date": payload.get("slateDate"),
        "generated_at": payload.get("generatedAt"),
        "parse_family": parse_family(file_path),
        "coverage": payload.get("coverage"),
    }
    con.execute(
        """
        insert into source_snapshots (
          source_snapshot_id, source_name, sport, source_url, local_path,
          captured_at, source_date, content_hash, content_type, status, notes
        ) values (?, ?, 'tennis', ?, ?, ?, ?, ?, 'application/json', 'captured', ?)
        on conflict(source_snapshot_id) do update set
          source_name = excluded.source_name,
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
            SOURCE_NAME,
            payload.get("source"),
            local_path,
            payload.get("generatedAt") or utc_now(),
            payload.get("slateDate") or date,
            sha256_file(file_path),
            compact_json(notes),
        ),
    )
    return snapshot_id


def update_fetch_status(
    con: sqlite3.Connection,
    *,
    date: str,
    source_files: int,
    parsed_player_snapshots: int,
    unresolved_added: int,
    report_path: Path,
    dry_run: bool,
) -> None:
    now = utc_now()
    status = "success" if source_files > 0 and parsed_player_snapshots > 0 else "missing"
    run_id = f"source-fetch-{SOURCE_NAME}-{date}-{now.replace(':', '-').replace('.', '-')}"
    details = {
        "adapter": "tennis_player_context_raw_to_typed",
        "dry_run": dry_run,
        "source_files": source_files,
        "parsed_player_snapshots": parsed_player_snapshots,
        "unresolved_added": unresolved_added,
        "report_path": sql_path(report_path),
        "note": "Typed parse run for tennis Flashscore player context raw archive. This does not perform network fetch.",
    }
    con.execute(
        """
        insert into source_fetch_runs (
          source_fetch_run_id, sport, source_name, source_family, source_date,
          run_reason, requested_url, cache_status, cache_ttl_hours, previous_success_at,
          status, completeness_status, expected_item_count, actual_item_count,
          missing_item_count, source_snapshot_id, started_at, finished_at,
          error_code, error_message, details_json
        ) values (?, 'tennis', ?, ?, ?, 'typed_parse',
          null, 'not_applicable', null,
          (select last_success_at from source_fetch_status where sport='tennis' and source_name=? and source_date=?),
          ?, 'unknown', null, ?, null, null, ?, ?, null, null, ?)
        """,
        (
            run_id,
            SOURCE_NAME,
            SOURCE_FAMILY,
            date,
            SOURCE_NAME,
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
        ) values (?, 'tennis', ?, ?, ?, ?, ?, ?,
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
            f"tennis:{SOURCE_NAME}:{date}",
            SOURCE_NAME,
            SOURCE_FAMILY,
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
            f"tennis-player-context-raw-to-typed:{date}",
            f"tennis_player_context_raw_to_typed:{date}",
            status,
            report["source_rows"],
            report["inserted_player_form_snapshots"],
            compact_json(report),
            now,
        ),
    )


def ingest(args: argparse.Namespace) -> dict[str, Any]:
    files = candidate_files(args.date)
    with sqlite3.connect(args.source_db) as con:
        con.row_factory = sqlite3.Row
        con.execute("pragma foreign_keys = on")
        con.execute("begin")
        resolver = TennisIdentityResolver(con)
        before_unresolved = con.execute("select count(*) from unresolved_entities").fetchone()[0]
        before_player_snapshots = con.execute("select count(*) from player_form_snapshots").fetchone()[0]
        before_recent_matches = con.execute("select count(*) from recent_matches").fetchone()[0]
        before_pressure = con.execute("select count(*) from service_pressure_snapshots").fetchone()[0]
        player_snapshots = []
        recent_match_rows = []
        pressure_rows = []
        source_snapshots = []
        counts = {
            "source_rows": 0,
            "parsed_player_snapshots": 0,
            "parsed_recent_matches": 0,
            "parsed_service_pressure": 0,
            "unparsed_rows": 0,
            "alias_rows": 0,
        }
        for file_path in files:
            payload = read_json(file_path)
            snapshot_id = ensure_source_snapshot(con, file_path, payload, args.date)
            source_snapshots.append(snapshot_id)
            if "flashscore-player-pages" in file_path.name:
                parsed_snapshots, parsed_recent, row_counts = parse_flashscore_player_pages_payload(
                    payload,
                    resolver,
                    source_snapshot_id=snapshot_id,
                    local_path=sql_path(file_path),
                )
                parsed_pressure = []
            elif "flashscore-recent-match-map" in file_path.name:
                parsed_snapshots, parsed_recent, parsed_pressure, row_counts = parse_flashscore_recent_match_map_payload(
                    payload,
                    resolver,
                    source_snapshot_id=snapshot_id,
                    local_path=sql_path(file_path),
                )
            else:
                parsed_snapshots, parsed_recent, parsed_pressure, row_counts = [], [], [], {}
            player_snapshots.extend(parsed_snapshots)
            recent_match_rows.extend(parsed_recent)
            pressure_rows.extend(parsed_pressure)
            for key in counts:
                counts[key] += row_counts.get(key, 0)
        inserted_player_snapshots = 0
        inserted_recent_matches = 0
        inserted_pressure = 0
        if not args.dry_run:
            inserted_player_snapshots = insert_player_form_snapshots(con, player_snapshots)
            inserted_recent_matches = insert_recent_match_rows(con, recent_match_rows)
            inserted_pressure = insert_service_pressure(con, pressure_rows)
        after_unresolved = con.execute("select count(*) from unresolved_entities").fetchone()[0]
        after_player_snapshots = con.execute("select count(*) from player_form_snapshots").fetchone()[0]
        after_recent_matches = con.execute("select count(*) from recent_matches").fetchone()[0]
        after_pressure = con.execute("select count(*) from service_pressure_snapshots").fetchone()[0]
        unresolved_added = after_unresolved - before_unresolved
        report = {
            "generated_at": utc_now(),
            "script": "data-migration/scripts/ingest_tennis_player_context_raw_to_typed.py",
            "parser_module": "pipeline/sources/tennis/normalization/context.py",
            "source_db": sql_path(args.source_db),
            "date": args.date,
            "dry_run": args.dry_run,
            "source_name": SOURCE_NAME,
            "source_files": len(files),
            "source_snapshot_rows": len(source_snapshots),
            **counts,
            "inserted_player_form_snapshots": inserted_player_snapshots,
            "inserted_recent_matches": inserted_recent_matches,
            "inserted_service_pressure_rows": inserted_pressure,
            "unresolved_rows_added": unresolved_added,
            "before_counts": {
                "player_form_snapshots": before_player_snapshots,
                "recent_matches": before_recent_matches,
                "service_pressure_snapshots": before_pressure,
                "unresolved_entities": before_unresolved,
            },
            "after_counts": {
                "player_form_snapshots": after_player_snapshots,
                "recent_matches": after_recent_matches,
                "service_pressure_snapshots": after_pressure,
                "unresolved_entities": after_unresolved,
            },
            "row_count_delta": {
                "player_form_snapshots": after_player_snapshots - before_player_snapshots,
                "recent_matches": after_recent_matches - before_recent_matches,
                "service_pressure_snapshots": after_pressure - before_pressure,
                "unresolved_entities": unresolved_added,
            },
            "sample_source_snapshots": source_snapshots[:8],
            "ok": len(files) > 0 and len(player_snapshots) > 0 and len(pressure_rows) > 0,
        }
        health_status = "ok" if report["ok"] else "blocked"
        if args.dry_run:
            con.rollback()
        else:
            update_fetch_status(
                con,
                date=args.date,
                source_files=len(files),
                parsed_player_snapshots=len(player_snapshots),
                unresolved_added=unresolved_added,
                report_path=args.report,
                dry_run=args.dry_run,
            )
            insert_health_check(con, date=args.date, status=health_status, report=report)
            con.commit()
            append_normalization_event(
                ROOT,
                {
                    "event_id": f"phase9e-tennis-player-context-raw-to-typed-{args.date}-{utc_now().replace(':', '-').replace('.', '-')}",
                    "timestamp": utc_now(),
                    "phase": "9E",
                    "area": "tennis_player_context_raw_to_typed",
                    "source": "data-private/reference/tennis/flashscore-player-pages + flashscore-recent-match-map",
                    "target": "sql-tennis.db:player_form_snapshots,recent_matches,service_pressure_snapshots,source_fetch_status",
                    "parser_module": "pipeline/sources/tennis/normalization/context.py",
                    "migration_script": "data-migration/scripts/ingest_tennis_player_context_raw_to_typed.py",
                    "validation": f"{inserted_player_snapshots} player snapshots, {inserted_recent_matches} recent matches, {inserted_pressure} pressure rows parsed from {len(files)} files",
                    "status_from": "mapped",
                    "status_to": "inserted",
                    "report_path": sql_path(args.report),
                    "checksum": None,
                    "notes": compact_json({"unresolved_added": unresolved_added, "source_rows": counts["source_rows"]}),
                },
            )
    write_report(args.report, report)
    print(json.dumps(report, indent=2, sort_keys=True))
    return report


def main() -> int:
    args = parse_args()
    report = ingest(args)
    return 0 if report["ok"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
