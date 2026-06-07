#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import re
import sqlite3
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[2]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from pipeline.sources.tennis.normalization.common import (
    append_normalization_event,
    compact_json,
    normalize_name,
    stable_id,
    utc_now,
    write_report,
)


DEFAULT_DB = ROOT / "data-private" / "warehouse" / "sports" / "tennis" / "sql-tennis.db"
SOURCE_NAME = "tennis_supplemental_context"
SOURCE_FAMILY = "supplemental-context"
ORIGINAL_SOURCE_NAME = "TennisTonic H2H via Chrome DOM"
CLAY_FEATURE_FAMILY = "supplemental_clay_context"
QUALITY_FEATURE_FAMILY = "supplemental_opponent_quality"
BLOCKED_PUBLIC_TEXT_RE = re.compile(r"flashscore|sofascore|tennistonic|tennis[_\s-]*tonic", re.IGNORECASE)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Warehouse private Tennistonic-derived supplemental context into typed tennis tables."
    )
    parser.add_argument("--date", required=True, help="Slate date, YYYY-MM-DD.")
    parser.add_argument("--source-db", "--db-path", dest="source_db", type=Path, default=DEFAULT_DB)
    parser.add_argument("--clay-context", type=Path, help="Generated clay/H2H context JSON.")
    parser.add_argument("--opponent-quality", type=Path, help="Generated opponent-quality context JSON.")
    parser.add_argument(
        "--report",
        type=Path,
        default=ROOT / "data-migration" / "reports" / "ingest_tennis_tennistonic_context.json",
    )
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument(
        "--allow-missing-artifacts",
        action="store_true",
        help="Write a diagnostic report/status row instead of failing when generated inputs are missing.",
    )
    args = parser.parse_args()
    if not args.source_db.is_absolute():
        args.source_db = ROOT / args.source_db
    if args.clay_context is None:
        args.clay_context = ROOT / "web" / "src" / "lib" / f"day-{args.date}-tennis-clay-context.generated.json"
    elif not args.clay_context.is_absolute():
        args.clay_context = ROOT / args.clay_context
    if args.opponent_quality is None:
        args.opponent_quality = ROOT / "web" / "src" / "lib" / f"day-{args.date}-tennis-opponent-quality.generated.json"
    elif not args.opponent_quality.is_absolute():
        args.opponent_quality = ROOT / args.opponent_quality
    if not args.report.is_absolute():
        args.report = ROOT / args.report
    return args


def sql_path(path: Path) -> str:
    return str(path.relative_to(ROOT)) if path.is_relative_to(ROOT) else str(path)


def load_json(path: Path) -> dict[str, Any] | None:
    if not path.exists():
        return None
    parsed = json.loads(path.read_text(encoding="utf-8"))
    return parsed if isinstance(parsed, dict) else {}


def source_snapshot_id_for(date: str, match_id: str) -> str:
    return f"tennis-{stable_id(SOURCE_NAME, date, match_id, length=32)}"


def safe_context_key(value: str) -> str:
    return BLOCKED_PUBLIC_TEXT_RE.sub("supplemental", value)


def safe_context_value(value: Any) -> Any:
    if isinstance(value, dict):
        sanitized: dict[str, Any] = {}
        for key, nested in value.items():
            if key == "sourceUrl":
                sanitized["sourceUrlStoredIn"] = "source_snapshots.source_url"
                continue
            sanitized[safe_context_key(str(key))] = safe_context_value(nested)
        return sanitized
    if isinstance(value, list):
        return [safe_context_value(item) for item in value]
    if isinstance(value, str):
        if BLOCKED_PUBLIC_TEXT_RE.search(value):
            return BLOCKED_PUBLIC_TEXT_RE.sub("typed supplemental", value)
        return value
    return value


def player_id_for_name(conn: sqlite3.Connection, *, match_id: str, player_name: str) -> str | None:
    player_key = normalize_name(player_name)
    if not player_key:
        return None
    row = conn.execute(
        """
        select p.player_id
        from match_players mp
        join players p on p.player_id = mp.player_id
        where mp.match_id = ?
          and (p.active is null or p.active = 1)
        order by mp.side
        """,
        (match_id,),
    ).fetchall()
    for candidate in row:
        player = conn.execute("select name, canonical_name from players where player_id = ?", (candidate["player_id"],)).fetchone()
        if player and player_key in {normalize_name(player["name"]), normalize_name(player["canonical_name"])}:
            return candidate["player_id"]

    registry = conn.execute(
        """
        select pir.player_id
        from player_identity_registry pir
        join players p on p.player_id = pir.player_id
        where pir.sport = 'tennis'
          and pir.normalized_name = ?
          and pir.active = 1
          and (p.active is null or p.active = 1)
        order by pir.trusted_alias_count desc, pir.player_id
        """,
        (player_key,),
    ).fetchall()
    if len(registry) == 1:
        return registry[0]["player_id"]

    players = conn.execute(
        """
        select player_id
        from players
        where (active is null or active = 1)
          and (
            lower(name) = lower(?)
            or lower(canonical_name) = lower(?)
          )
        order by player_id
        """,
        (player_name, player_name),
    ).fetchall()
    return players[0]["player_id"] if len(players) == 1 else None


def ensure_source_policy(conn: sqlite3.Connection) -> None:
    now = utc_now()
    conn.execute(
        """
        insert into source_fetch_policies (
          source_fetch_policy_id, sport, source_name, source_family, run_rule,
          default_ttl_hours, max_stale_hours, required_for_prediction,
          env_ttl_key, env_force_key, env_disable_key, config_path,
          created_at, updated_at, notes
        ) values (?, 'tennis', ?, ?, 'fetch_if_available', 24, 168, 0, ?, ?, ?, ?, ?, ?, ?)
        on conflict(source_fetch_policy_id) do update set
          source_name = excluded.source_name,
          source_family = excluded.source_family,
          run_rule = excluded.run_rule,
          default_ttl_hours = excluded.default_ttl_hours,
          max_stale_hours = excluded.max_stale_hours,
          required_for_prediction = excluded.required_for_prediction,
          env_ttl_key = excluded.env_ttl_key,
          env_force_key = excluded.env_force_key,
          env_disable_key = excluded.env_disable_key,
          config_path = excluded.config_path,
          updated_at = excluded.updated_at,
          notes = excluded.notes
        """,
        (
            f"tennis:{SOURCE_NAME}",
            SOURCE_NAME,
            SOURCE_FAMILY,
            "TENNIS_SUPPLEMENTAL_CONTEXT_TTL_HOURS",
            "TENNIS_SUPPLEMENTAL_CONTEXT_FORCE_FETCH",
            "TENNIS_SUPPLEMENTAL_CONTEXT_DISABLE_FETCH",
            "development-docs/tennis/runbooks/ingestion_health_remediation.md",
            now,
            now,
            "Optional private supplemental H2H, surface-record, and recent-score context. Not required for prediction gates.",
        ),
    )


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
    notes: dict[str, Any],
) -> None:
    conn.execute(
        """
        insert into source_snapshots (
          source_snapshot_id, source_name, sport, source_url, local_path,
          captured_at, source_date, content_hash, content_type, status, notes
        ) values (?, ?, 'tennis', ?, ?, ?, ?, ?, 'application/json', ?, ?)
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
        (
            source_snapshot_id,
            SOURCE_NAME,
            source_url,
            local_path,
            captured_at,
            source_date,
            stable_id(compact_json(payload), length=64),
            status,
            compact_json(notes),
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
        ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, current_timestamp)
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
            match.get("prediction") or match.get("tennistonicPrediction"),
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
    created_at: str,
) -> None:
    conn.execute(
        """
        insert into match_context_snapshots (
          context_snapshot_id, match_id, snapshot_date, feature_family,
          features_json, source_name, created_at
        ) values (?, ?, ?, ?, ?, ?, ?)
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
            json.dumps(safe_context_value(payload), ensure_ascii=False, sort_keys=True),
            SOURCE_NAME,
            created_at,
        ),
    )


def upsert_player_form_snapshot(
    conn: sqlite3.Connection,
    *,
    player_id: str,
    player: dict[str, Any],
    match_id: str,
    source_snapshot_id: str,
    date: str,
    created_at: str,
) -> None:
    recent_window = player.get("recentWindow") if isinstance(player.get("recentWindow"), dict) else {}
    recent_matches = player.get("recentMatches") if isinstance(player.get("recentMatches"), list) else []
    records = player.get("records") if isinstance(player.get("records"), dict) else {}
    raw_records = player.get("record2026") if isinstance(player.get("record2026"), dict) else records.get("raw")
    payload = {
        "featureFamily": "supplemental_player_history",
        "sourceName": SOURCE_NAME,
        "sourceSnapshotId": source_snapshot_id,
        "sourceMatchId": match_id,
        "sourceUrlStoredIn": "source_snapshots.source_url",
        "name": player.get("name"),
        "ranking": player.get("ranking"),
        "records": records or {"raw": raw_records},
        "recentWindow": recent_window,
        "serviceData": player.get("serviceData"),
        "recentMatches": recent_matches[:8],
    }
    sample_size = recent_window.get("matches") if isinstance(recent_window, dict) else None
    if sample_size is None:
        sample_size = len(recent_matches)
    conn.execute(
        """
        insert into player_form_snapshots (
          form_snapshot_id, player_id, snapshot_date, surface, sample_size, features_json, created_at
        ) values (?, ?, ?, ?, ?, ?, ?)
        on conflict(form_snapshot_id) do update set
          player_id = excluded.player_id,
          snapshot_date = excluded.snapshot_date,
          surface = excluded.surface,
          sample_size = excluded.sample_size,
          features_json = excluded.features_json,
          created_at = excluded.created_at
        """,
        (
            stable_id("supplemental-player-form", date, match_id, player_id, source_snapshot_id),
            player_id,
            date,
            "Clay" if (raw_records or records or {}).get("clay") or records.get("clay2026") else None,
            sample_size,
            json.dumps(safe_context_value(payload), ensure_ascii=False, sort_keys=True),
            created_at,
        ),
    )


def update_fetch_status(
    conn: sqlite3.Connection,
    *,
    date: str,
    status: str,
    completeness_status: str,
    expected_count: int,
    actual_count: int,
    missing_count: int,
    report: dict[str, Any],
) -> None:
    now = utc_now()
    run_id = f"source-fetch-{SOURCE_NAME}-{date}-{now.replace(':', '-').replace('.', '-')}"
    conn.execute(
        """
        insert into source_fetch_runs (
          source_fetch_run_id, sport, source_name, source_family, source_date,
          run_reason, requested_url, cache_status, cache_ttl_hours, previous_success_at,
          status, completeness_status, expected_item_count, actual_item_count,
          missing_item_count, source_snapshot_id, started_at, finished_at,
          error_code, error_message, details_json
        ) values (?, 'tennis', ?, ?, ?, 'typed_import', null, 'not_applicable', 24,
          (select last_success_at from source_fetch_status where sport='tennis' and source_name=? and source_date=?),
          ?, ?, ?, ?, ?, null, ?, ?, ?, ?, ?)
        """,
        (
            run_id,
            SOURCE_NAME,
            SOURCE_FAMILY,
            date,
            SOURCE_NAME,
            date,
            status,
            completeness_status,
            expected_count,
            actual_count,
            missing_count,
            now,
            now,
            None if status == "success" else status,
            None if status == "success" else report.get("error"),
            compact_json(report),
        ),
    )
    conn.execute(
        """
        insert into source_fetch_status (
          source_fetch_status_id, sport, source_name, source_family, source_date,
          last_fetch_run_id, last_attempt_at, last_success_at, last_status,
          last_completeness_status, cache_valid_until, expected_item_count,
          actual_item_count, missing_item_count, unresolved_count, updated_at, notes
        ) values (?, 'tennis', ?, ?, ?, ?, ?, ?, ?, ?, datetime(?, '+24 hours'), ?, ?, ?, ?, ?, ?)
        on conflict(source_fetch_status_id) do update set
          last_fetch_run_id = excluded.last_fetch_run_id,
          last_attempt_at = excluded.last_attempt_at,
          last_success_at = excluded.last_success_at,
          last_status = excluded.last_status,
          last_completeness_status = excluded.last_completeness_status,
          cache_valid_until = excluded.cache_valid_until,
          expected_item_count = excluded.expected_item_count,
          actual_item_count = excluded.actual_item_count,
          missing_item_count = excluded.missing_item_count,
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
            completeness_status,
            now,
            expected_count,
            actual_count,
            missing_count,
            report.get("unlinked_player_rows", 0),
            now,
            compact_json(report),
        ),
    )


def ingest(args: argparse.Namespace) -> dict[str, Any]:
    clay = load_json(args.clay_context)
    quality = load_json(args.opponent_quality)
    missing_artifacts = [
        sql_path(path)
        for path, payload in [(args.clay_context, clay), (args.opponent_quality, quality)]
        if payload is None
    ]

    clay_matches = (clay or {}).get("matches") or {}
    quality_matches = (quality or {}).get("matches") or {}
    captured_at = (clay or {}).get("generatedAt") or (quality or {}).get("generatedAt") or utc_now()
    expected_matches = max(len(clay_matches), len(quality_matches))

    with sqlite3.connect(args.source_db) as conn:
        conn.row_factory = sqlite3.Row
        conn.execute("pragma foreign_keys = on")
        conn.execute("begin")
        ensure_source_policy(conn)
        before = {
            "source_snapshots": conn.execute("select count(*) from source_snapshots").fetchone()[0],
            "tennis_h2h_snapshots": conn.execute("select count(*) from tennis_h2h_snapshots").fetchone()[0],
            "match_context_snapshots": conn.execute("select count(*) from match_context_snapshots").fetchone()[0],
            "player_form_snapshots": conn.execute("select count(*) from player_form_snapshots").fetchone()[0],
        }

        source_rows = 0
        h2h_rows = 0
        context_rows = 0
        player_form_rows = 0
        error_rows = 0
        unlinked_player_rows = 0
        linked_matches = 0

        for match_id, match in clay_matches.items():
            if match.get("error"):
                error_rows += 1
            source_snapshot_id = source_snapshot_id_for(args.date, match_id)
            upsert_source_snapshot(
                conn,
                source_snapshot_id=source_snapshot_id,
                source_url=match.get("sourceUrl"),
                local_path=sql_path(args.clay_context),
                captured_at=captured_at,
                source_date=args.date,
                payload=match,
                status="error" if match.get("error") else "captured",
                notes={
                    "original_source_name": ORIGINAL_SOURCE_NAME,
                    "title": match.get("title"),
                    "error": match.get("error"),
                    "private_supplemental_context": True,
                },
            )
            source_rows += 1
            upsert_h2h_snapshot(conn, match_id=match_id, date=args.date, match=match)
            h2h_rows += 1
            upsert_match_context(
                conn,
                context_snapshot_id=f"{CLAY_FEATURE_FAMILY}:{args.date}:{match_id}",
                match_id=match_id,
                date=args.date,
                feature_family=CLAY_FEATURE_FAMILY,
                payload={**match, "sourceSnapshotId": source_snapshot_id},
                created_at=captured_at,
            )
            context_rows += 1
            if conn.execute("select 1 from matches where match_id = ?", (match_id,)).fetchone():
                linked_matches += 1

        quality_captured_at = (quality or {}).get("generatedAt") or captured_at
        for match_id, match in quality_matches.items():
            source_snapshot_id = source_snapshot_id_for(args.date, match_id)
            upsert_match_context(
                conn,
                context_snapshot_id=f"{QUALITY_FEATURE_FAMILY}:{args.date}:{match_id}",
                match_id=match_id,
                date=args.date,
                feature_family=QUALITY_FEATURE_FAMILY,
                payload={**match, "sourceSnapshotId": source_snapshot_id},
                created_at=quality_captured_at,
            )
            context_rows += 1
            for player in match.get("players") or []:
                player_id = player_id_for_name(conn, match_id=match_id, player_name=str(player.get("name") or ""))
                if not player_id:
                    unlinked_player_rows += 1
                    continue
                upsert_player_form_snapshot(
                    conn,
                    player_id=player_id,
                    player=player,
                    match_id=match_id,
                    source_snapshot_id=source_snapshot_id,
                    date=args.date,
                    created_at=quality_captured_at,
                )
                player_form_rows += 1

        after = {
            "source_snapshots": conn.execute("select count(*) from source_snapshots").fetchone()[0],
            "tennis_h2h_snapshots": conn.execute("select count(*) from tennis_h2h_snapshots").fetchone()[0],
            "match_context_snapshots": conn.execute("select count(*) from match_context_snapshots").fetchone()[0],
            "player_form_snapshots": conn.execute("select count(*) from player_form_snapshots").fetchone()[0],
        }

        if missing_artifacts:
            status = "missing"
            completeness_status = "source_fetch_missing"
            error = f"missing generated supplemental artifacts: {', '.join(missing_artifacts)}"
        elif expected_matches == 0:
            status = "empty"
            completeness_status = "source_parsed_empty"
            error = "generated supplemental artifacts exist but contain no match rows"
        elif context_rows <= 0:
            status = "parsed"
            completeness_status = "source_parsed_but_not_inserted"
            error = "supplemental artifacts parsed but no typed context rows were inserted"
        elif unlinked_player_rows:
            status = "success"
            completeness_status = "inserted_with_unlinked_players"
            error = None
        else:
            status = "success"
            completeness_status = "complete"
            error = None

        report = {
            "generated_at": utc_now(),
            "script": "data-migration/scripts/ingest_tennis_tennistonic_context.py",
            "source_db": sql_path(args.source_db),
            "date": args.date,
            "dry_run": args.dry_run,
            "source_name": SOURCE_NAME,
            "source_family": SOURCE_FAMILY,
            "original_provider": ORIGINAL_SOURCE_NAME,
            "clay_context": sql_path(args.clay_context),
            "opponent_quality": sql_path(args.opponent_quality),
            "missing_artifacts": missing_artifacts,
            "clay_matches": len(clay_matches),
            "opponent_quality_matches": len(quality_matches),
            "source_snapshots": source_rows,
            "tennis_h2h_snapshots": h2h_rows,
            "match_context_snapshots": context_rows,
            "player_form_snapshots": player_form_rows,
            "linked_matches": linked_matches,
            "unlinked_player_rows": unlinked_player_rows,
            "error_rows": error_rows,
            "status": status,
            "completeness_status": completeness_status,
            "error": error,
            "before_counts": before,
            "after_counts": after,
            "row_count_delta": {key: after[key] - before[key] for key in after},
            "ok": status == "success" or (args.allow_missing_artifacts and status in {"missing", "empty"}),
        }

        if args.dry_run:
            conn.rollback()
        else:
            update_fetch_status(
                conn,
                date=args.date,
                status=status,
                completeness_status=completeness_status,
                expected_count=expected_matches,
                actual_count=context_rows,
                missing_count=len(missing_artifacts),
                report=report,
            )
            conn.commit()
            append_normalization_event(
                ROOT,
                {
                    "event_id": f"phase4-tennis-supplemental-context-{args.date}-{utc_now().replace(':', '-').replace('.', '-')}",
                    "timestamp": utc_now(),
                    "phase": "4",
                    "area": "tennis_supplemental_context",
                    "source": "generated private supplemental H2H/opponent-quality artifacts",
                    "target": "sql-tennis.db:source_snapshots,tennis_h2h_snapshots,match_context_snapshots,player_form_snapshots,source_fetch_status",
                    "parser_module": "data-migration/scripts/ingest_tennis_tennistonic_context.py",
                    "migration_script": "data-migration/scripts/ingest_tennis_tennistonic_context.py",
                    "validation": "pending",
                    "status_from": "started",
                    "status_to": status,
                    "report_path": sql_path(args.report),
                    "checksum": None,
                    "notes": compact_json(
                        {
                            "date": args.date,
                            "context_rows": context_rows,
                            "player_form_rows": player_form_rows,
                            "missing_artifacts": missing_artifacts,
                            "completeness_status": completeness_status,
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
