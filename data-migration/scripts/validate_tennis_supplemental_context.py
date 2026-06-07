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

from pipeline.sources.tennis.normalization.common import utc_now, write_report


DEFAULT_DB = ROOT / "data-private" / "warehouse" / "sports" / "tennis" / "sql-tennis.db"
SOURCE_NAME = "tennis_supplemental_context"
BLOCKED_PUBLIC_TEXT_RE = re.compile(r"flashscore|sofascore|tennistonic|tennis[_\s-]*tonic", re.IGNORECASE)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Validate private supplemental tennis context typed rows.")
    parser.add_argument("--date", required=True)
    parser.add_argument("--source-db", type=Path, default=DEFAULT_DB)
    parser.add_argument(
        "--report",
        type=Path,
        default=ROOT / "data-migration" / "reports" / "validate_tennis_supplemental_context.json",
    )
    args = parser.parse_args()
    if not args.source_db.is_absolute():
        args.source_db = ROOT / args.source_db
    if not args.report.is_absolute():
        args.report = ROOT / args.report
    return args


def sql_path(path: Path) -> str:
    return str(path.relative_to(ROOT)) if path.is_relative_to(ROOT) else str(path)


def load_json(value: str | None) -> dict[str, Any]:
    if not value:
        return {}
    try:
        parsed = json.loads(value)
    except json.JSONDecodeError:
        return {}
    return parsed if isinstance(parsed, dict) else {}


def main() -> int:
    args = parse_args()
    with sqlite3.connect(args.source_db) as conn:
        conn.row_factory = sqlite3.Row
        status = conn.execute(
            """
            select *
            from source_fetch_status
            where source_name = ?
              and source_date = ?
            """,
            (SOURCE_NAME, args.date),
        ).fetchone()
        source_snapshots = conn.execute(
            """
            select *
            from source_snapshots
            where source_name = ?
              and source_date = ?
            """,
            (SOURCE_NAME, args.date),
        ).fetchall()
        context_rows = conn.execute(
            """
            select *
            from match_context_snapshots
            where source_name = ?
              and snapshot_date = ?
            """,
            (SOURCE_NAME, args.date),
        ).fetchall()
        player_form_rows = conn.execute(
            """
            select *
            from player_form_snapshots
            where snapshot_date = ?
              and features_json like '%supplemental_player_history%'
            """,
            (args.date,),
        ).fetchall()

        snapshot_ids = {row["source_snapshot_id"] for row in source_snapshots}
        context_missing_snapshot_id = 0
        context_missing_snapshot_link = 0
        blocked_context_payloads = 0
        for row in context_rows:
            payload_text = row["features_json"] or ""
            if BLOCKED_PUBLIC_TEXT_RE.search(payload_text):
                blocked_context_payloads += 1
            payload = load_json(payload_text)
            snapshot_id = payload.get("sourceSnapshotId")
            if not snapshot_id:
                context_missing_snapshot_id += 1
            elif snapshot_id not in snapshot_ids:
                context_missing_snapshot_link += 1

        player_missing_snapshot_id = 0
        player_missing_snapshot_link = 0
        blocked_player_payloads = 0
        for row in player_form_rows:
            payload_text = row["features_json"] or ""
            if BLOCKED_PUBLIC_TEXT_RE.search(payload_text):
                blocked_player_payloads += 1
            payload = load_json(payload_text)
            snapshot_id = payload.get("sourceSnapshotId")
            if not snapshot_id:
                player_missing_snapshot_id += 1
            elif snapshot_id not in snapshot_ids:
                player_missing_snapshot_link += 1

        source_urls = sum(1 for row in source_snapshots if row["source_url"])
        classification = "not_run"
        if status and status["last_completeness_status"] == "source_fetch_missing":
            classification = "source_fetch_missing"
        elif source_snapshots and not context_rows:
            classification = "source_parsed_but_not_inserted"
        elif context_rows and (context_missing_snapshot_id or context_missing_snapshot_link):
            classification = "inserted_missing_provenance"
        elif context_rows and (blocked_context_payloads or blocked_player_payloads):
            classification = "inserted_public_payload_not_sanitized"
        elif context_rows and (player_missing_snapshot_id or player_missing_snapshot_link):
            classification = "inserted_player_history_missing_provenance"
        elif context_rows:
            classification = status["last_completeness_status"] if status else "inserted"

        errors = []
        if classification == "not_run":
            errors.append("No supplemental source status row exists for this date.")
        if classification == "source_parsed_but_not_inserted":
            errors.append("Supplemental source snapshots exist but no typed match context rows were inserted.")
        if context_missing_snapshot_id or context_missing_snapshot_link:
            errors.append("One or more match context rows do not link to a source snapshot.")
        if player_missing_snapshot_id or player_missing_snapshot_link:
            errors.append("One or more supplemental player history rows do not link to a source snapshot.")
        if blocked_context_payloads or blocked_player_payloads:
            errors.append("Neutral supplemental payloads contain blocked active-source text.")

        ok = classification in {"source_fetch_missing", "complete", "inserted_with_unlinked_players", "inserted"} and not errors
        report = {
            "generated_at": utc_now(),
            "script": "data-migration/scripts/validate_tennis_supplemental_context.py",
            "source_db": sql_path(args.source_db),
            "date": args.date,
            "source_name": SOURCE_NAME,
            "classification": classification,
            "source_status": dict(status) if status else None,
            "source_snapshots": len(source_snapshots),
            "source_snapshots_with_url": source_urls,
            "match_context_snapshots": len(context_rows),
            "player_form_history_rows": len(player_form_rows),
            "context_missing_snapshot_id": context_missing_snapshot_id,
            "context_missing_snapshot_link": context_missing_snapshot_link,
            "player_missing_snapshot_id": player_missing_snapshot_id,
            "player_missing_snapshot_link": player_missing_snapshot_link,
            "blocked_context_payloads": blocked_context_payloads,
            "blocked_player_payloads": blocked_player_payloads,
            "errors": errors,
            "ok": ok,
        }
    write_report(args.report, report)
    print(json.dumps(report, indent=2, sort_keys=True))
    return 0 if report["ok"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
