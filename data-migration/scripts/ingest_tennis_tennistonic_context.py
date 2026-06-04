#!/usr/bin/env python3
from __future__ import annotations

import argparse
import hashlib
import json
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[2]
DEFAULT_DB = ROOT / "data-private/warehouse/sports/tennis/sql-tennis.db"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Warehouse TennisTonic H2H and opponent-quality context into the typed tennis SQLite DB."
    )
    parser.add_argument("--date", required=True, help="Slate date, YYYY-MM-DD.")
    parser.add_argument("--db-path", default=str(DEFAULT_DB), help="Typed tennis DB path.")
    parser.add_argument("--clay-context", required=True, help="Generated TennisTonic clay context JSON.")
    parser.add_argument("--opponent-quality", required=True, help="Generated opponent-quality context JSON.")
    return parser.parse_args()


def load_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text())


def stable_json(value: Any) -> str:
    return json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False)


def content_hash(value: Any) -> str:
    return hashlib.sha256(stable_json(value).encode("utf-8")).hexdigest()


def utc_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def upsert_source_snapshot(
    conn: sqlite3.Connection,
    *,
    source_snapshot_id: str,
    source_url: str | None,
    local_path: str,
    captured_at: str,
    source_date: str,
    payload: Any,
    status: str,
    notes: str | None,
) -> None:
    conn.execute(
        """
        insert into source_snapshots (
          source_snapshot_id, source_name, sport, source_url, local_path,
          captured_at, source_date, content_hash, content_type, status, notes
        )
        values (?, 'TennisTonic H2H via Chrome DOM', 'tennis', ?, ?, ?, ?, ?, 'application/json', ?, ?)
        on conflict(source_snapshot_id) do update set
          source_url = excluded.source_url,
          local_path = excluded.local_path,
          captured_at = excluded.captured_at,
          source_date = excluded.source_date,
          content_hash = excluded.content_hash,
          content_type = excluded.content_type,
          status = excluded.status,
          notes = excluded.notes
        """,
        (
            source_snapshot_id,
            source_url,
            local_path,
            captured_at,
            source_date,
            content_hash(payload),
            status,
            notes,
        ),
    )


def upsert_h2h_snapshot(
    conn: sqlite3.Connection,
    *,
    match_id: str,
    date: str,
    match: dict[str, Any],
) -> None:
    conn.execute(
        """
        insert into tennis_h2h_snapshots (
          match_id, slate_date, source_url, h2h_record, h2h_text,
          source_prediction, status, error, raw_json, updated_at
        )
        values (?, ?, ?, ?, ?, ?, ?, ?, ?, current_timestamp)
        on conflict(match_id) do update set
          slate_date = excluded.slate_date,
          source_url = excluded.source_url,
          h2h_record = excluded.h2h_record,
          h2h_text = excluded.h2h_text,
          source_prediction = excluded.source_prediction,
          status = excluded.status,
          error = excluded.error,
          raw_json = excluded.raw_json,
          updated_at = current_timestamp
        """,
        (
            match_id,
            date,
            match.get("sourceUrl"),
            match.get("h2hRecord"),
            match.get("h2hText"),
            match.get("prediction"),
            "error" if match.get("error") else "captured",
            match.get("error"),
            json.dumps(match, ensure_ascii=False, sort_keys=True),
        ),
    )


def upsert_match_context(
    conn: sqlite3.Connection,
    *,
    context_snapshot_id: str,
    match_id: str,
    date: str,
    feature_family: str,
    payload: dict[str, Any],
    source_name: str,
    created_at: str,
) -> None:
    conn.execute(
        """
        insert into match_context_snapshots (
          context_snapshot_id, match_id, snapshot_date, feature_family,
          features_json, source_name, created_at
        )
        values (?, ?, ?, ?, ?, ?, ?)
        on conflict(context_snapshot_id) do update set
          match_id = excluded.match_id,
          snapshot_date = excluded.snapshot_date,
          feature_family = excluded.feature_family,
          features_json = excluded.features_json,
          source_name = excluded.source_name,
          created_at = excluded.created_at
        """,
        (
            context_snapshot_id,
            match_id,
            date,
            feature_family,
            json.dumps(payload, ensure_ascii=False, sort_keys=True),
            source_name,
            created_at,
        ),
    )


def main() -> None:
    args = parse_args()
    db_path = Path(args.db_path).resolve()
    clay_path = Path(args.clay_context).resolve()
    quality_path = Path(args.opponent_quality).resolve()

    clay = load_json(clay_path)
    quality = load_json(quality_path)
    clay_matches = clay.get("matches") or {}
    quality_matches = quality.get("matches") or {}
    captured_at = clay.get("generatedAt") or utc_now()

    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row

    source_rows = 0
    h2h_rows = 0
    context_rows = 0
    error_rows = 0

    with conn:
      for match_id, match in clay_matches.items():
          status = "error" if match.get("error") else "captured"
          if status == "error":
              error_rows += 1
          source_snapshot_id = f"tennistonic:{args.date}:{match_id}"
          upsert_source_snapshot(
              conn,
              source_snapshot_id=source_snapshot_id,
              source_url=match.get("sourceUrl"),
              local_path=str(clay_path.relative_to(ROOT)) if clay_path.is_relative_to(ROOT) else str(clay_path),
              captured_at=captured_at,
              source_date=args.date,
              payload=match,
              status=status,
              notes=match.get("error") or match.get("title"),
          )
          source_rows += 1
          upsert_h2h_snapshot(conn, match_id=match_id, date=args.date, match=match)
          h2h_rows += 1
          upsert_match_context(
              conn,
              context_snapshot_id=f"tennistonic-clay-context:{args.date}:{match_id}",
              match_id=match_id,
              date=args.date,
              feature_family="tennistonic_clay_context",
              payload={**match, "sourceSnapshotId": source_snapshot_id},
              source_name="TennisTonic H2H via Chrome DOM",
              created_at=captured_at,
          )
          context_rows += 1

      quality_captured_at = quality.get("generatedAt") or utc_now()
      for match_id, match in quality_matches.items():
          upsert_match_context(
              conn,
              context_snapshot_id=f"tennistonic-opponent-quality:{args.date}:{match_id}",
              match_id=match_id,
              date=args.date,
              feature_family="tennistonic_opponent_quality",
              payload=match,
              source_name="TennisTonic enriched opponent quality",
              created_at=quality_captured_at,
          )
          context_rows += 1

    print(
        json.dumps(
            {
                "date": args.date,
                "db_path": str(db_path),
                "source_snapshots": source_rows,
                "tennis_h2h_snapshots": h2h_rows,
                "match_context_snapshots": context_rows,
                "error_rows": error_rows,
            },
            indent=2,
            sort_keys=True,
        )
    )


if __name__ == "__main__":
    main()
