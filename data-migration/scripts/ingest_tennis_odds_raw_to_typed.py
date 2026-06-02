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
from pipeline.sources.tennis.normalization.markets import (
    ensure_market_schema,
    insert_contracts,
    insert_snapshots,
    insert_ticks,
    parse_fanduel_lines_payload,
    parse_robinhood_supplement_payload,
)


SOURCE_NAME = "tennis_odds"
SOURCE_FAMILY = "markets"


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
        default=ROOT / "data-migration" / "reports" / "ingest_tennis_odds_raw_to_typed_2026-06-02.json",
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
    candidates = [
        ROOT / "data-private" / "reference" / "tennis" / f"robinhood-tennis-supplement-{date}.json",
        ROOT / "data-private" / "reference" / "tennis" / f"fanduel-lines-{date}.json",
    ]
    return [path for path in candidates if path.exists()]


def ensure_source_snapshot(con: sqlite3.Connection, file_path: Path, payload: dict[str, Any], date: str) -> str:
    local_path = sql_path(file_path)
    snapshot_id = source_snapshot_id_for(local_path)
    notes = {
        "root": "data-private/reference/tennis",
        "parser_module": "pipeline/sources/tennis/normalization/markets.py",
        "active_raw_to_typed_adapter": True,
        "requested_date": date,
        "payload_date": payload.get("date"),
        "source": payload.get("source"),
        "source_url": payload.get("sourceUrl"),
        "parse_family": "robinhood_supplement" if "robinhood-tennis-supplement" in file_path.name else "fanduel_lines",
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
            payload.get("sourceUrl"),
            local_path,
            payload.get("capturedAt") or utc_now(),
            payload.get("date") or date,
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
    parsed_snapshots: int,
    unresolved_added: int,
    report_path: Path,
    dry_run: bool,
) -> None:
    now = utc_now()
    status = "success" if source_files > 0 and parsed_snapshots > 0 else "missing"
    run_id = f"source-fetch-{SOURCE_NAME}-{date}-{now.replace(':', '-').replace('.', '-')}"
    details = {
        "adapter": "tennis_odds_raw_to_typed",
        "dry_run": dry_run,
        "source_files": source_files,
        "parsed_snapshots": parsed_snapshots,
        "unresolved_added": unresolved_added,
        "report_path": sql_path(report_path),
        "note": "Typed parse run for tennis odds raw archive. This does not perform network fetch.",
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
          ?, 'unknown', datetime(?, '+1 hours'), null, ?, null, ?, ?, ?)
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
            f"tennis-odds-raw-to-typed:{date}",
            f"tennis_odds_raw_to_typed:{date}",
            status,
            report["source_files"],
            report["inserted_snapshots"],
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
        ensure_market_schema(con)
        resolver = TennisIdentityResolver(con)
        before_unresolved = con.execute("select count(*) from unresolved_entities").fetchone()[0]
        before_contracts = con.execute("select count(*) from market_contracts").fetchone()[0]
        before_ticks = con.execute("select count(*) from market_price_ticks").fetchone()[0]
        before_snapshots = con.execute("select count(*) from market_snapshots").fetchone()[0]
        contracts = []
        ticks = []
        snapshots = []
        source_snapshots = []
        counts = {
            "source_rows": 0,
            "parsed_contracts": 0,
            "parsed_ticks": 0,
            "parsed_snapshots": 0,
            "unparsed_rows": 0,
        }
        for file_path in files:
            payload = read_json(file_path)
            snapshot_id = ensure_source_snapshot(con, file_path, payload, args.date)
            source_snapshots.append(snapshot_id)
            if "robinhood-tennis-supplement" in file_path.name:
                parsed_contracts, parsed_ticks, parsed_snapshots, row_counts = parse_robinhood_supplement_payload(
                    payload,
                    resolver,
                    source_snapshot_id=snapshot_id,
                    local_path=sql_path(file_path),
                )
                contracts.extend(parsed_contracts)
                ticks.extend(parsed_ticks)
                snapshots.extend(parsed_snapshots)
            elif "fanduel-lines" in file_path.name:
                parsed_snapshots, row_counts = parse_fanduel_lines_payload(
                    payload,
                    resolver,
                    source_snapshot_id=snapshot_id,
                    local_path=sql_path(file_path),
                )
                snapshots.extend(parsed_snapshots)
            else:
                row_counts = {"source_rows": 0, "parsed_contracts": 0, "parsed_ticks": 0, "parsed_snapshots": 0, "unparsed_rows": 0}
            for key in counts:
                counts[key] += row_counts.get(key, 0)
        inserted_contracts = 0
        inserted_ticks = 0
        inserted_snapshots = 0
        if not args.dry_run:
            inserted_contracts = insert_contracts(con, contracts)
            inserted_ticks = insert_ticks(con, ticks)
            inserted_snapshots = insert_snapshots(con, snapshots)
        after_unresolved = con.execute("select count(*) from unresolved_entities").fetchone()[0]
        after_contracts = con.execute("select count(*) from market_contracts").fetchone()[0]
        after_ticks = con.execute("select count(*) from market_price_ticks").fetchone()[0]
        after_snapshots = con.execute("select count(*) from market_snapshots").fetchone()[0]
        unresolved_added = after_unresolved - before_unresolved
        report = {
            "generated_at": utc_now(),
            "script": "data-migration/scripts/ingest_tennis_odds_raw_to_typed.py",
            "parser_module": "pipeline/sources/tennis/normalization/markets.py",
            "source_db": sql_path(args.source_db),
            "date": args.date,
            "dry_run": args.dry_run,
            "source_name": SOURCE_NAME,
            "source_files": len(files),
            "source_snapshot_rows": len(source_snapshots),
            **counts,
            "inserted_contracts": inserted_contracts,
            "inserted_ticks": inserted_ticks,
            "inserted_snapshots": inserted_snapshots,
            "unresolved_rows_added": unresolved_added,
            "before_counts": {
                "market_contracts": before_contracts,
                "market_price_ticks": before_ticks,
                "market_snapshots": before_snapshots,
                "unresolved_entities": before_unresolved,
            },
            "after_counts": {
                "market_contracts": after_contracts,
                "market_price_ticks": after_ticks,
                "market_snapshots": after_snapshots,
                "unresolved_entities": after_unresolved,
            },
            "row_count_delta": {
                "market_contracts": after_contracts - before_contracts,
                "market_price_ticks": after_ticks - before_ticks,
                "market_snapshots": after_snapshots - before_snapshots,
                "unresolved_entities": unresolved_added,
            },
            "sample_source_snapshots": source_snapshots[:8],
            "ok": len(files) > 0 and len(snapshots) > 0,
        }
        health_status = "ok" if report["ok"] else "blocked"
        if args.dry_run:
            con.rollback()
        else:
            update_fetch_status(
                con,
                date=args.date,
                source_files=len(files),
                parsed_snapshots=len(snapshots),
                unresolved_added=unresolved_added,
                report_path=args.report,
                dry_run=args.dry_run,
            )
            insert_health_check(con, date=args.date, status=health_status, report=report)
            con.commit()
            append_normalization_event(
                ROOT,
                {
                    "event_id": f"phase9c-tennis-odds-raw-to-typed-{args.date}-{utc_now().replace(':', '-').replace('.', '-')}",
                    "timestamp": utc_now(),
                    "phase": "9C",
                    "area": "tennis_odds_raw_to_typed",
                    "source": "data-private/reference/tennis/{robinhood-tennis-supplement,fanduel-lines}",
                    "target": "sql-tennis.db:market_contracts,market_price_ticks,market_snapshots,source_fetch_status",
                    "parser_module": "pipeline/sources/tennis/normalization/markets.py",
                    "migration_script": "data-migration/scripts/ingest_tennis_odds_raw_to_typed.py",
                    "validation": "pending",
                    "status_from": "started",
                    "status_to": "inserted",
                    "report_path": sql_path(args.report),
                    "checksum": None,
                    "notes": compact_json(
                        {
                            "source_files": len(files),
                            "contracts": len(contracts),
                            "ticks": len(ticks),
                            "snapshots": len(snapshots),
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
