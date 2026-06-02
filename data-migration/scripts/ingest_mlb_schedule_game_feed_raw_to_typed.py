#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import sqlite3
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from pipeline.sources.mlb.normalization.common import append_normalization_event, compact_json, utc_now, write_report
from pipeline.sources.mlb.normalization.game_feed import (
    FAMILY_GAME_FEED,
    FAMILY_SCHEDULE,
    SOURCE_GAME_FEED,
    SOURCE_SCHEDULE,
    insert_health_check,
    load_raw_day,
    upsert_fetch_status,
    upsert_game_feeds,
    upsert_schedule,
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--date", required=True)
    parser.add_argument(
        "--source-db",
        type=Path,
        default=ROOT / "data-private" / "warehouse" / "sports" / "mlb" / "sql-mlb.db",
    )
    parser.add_argument(
        "--raw-root",
        type=Path,
        default=ROOT / "data-private" / "raw" / "mlb",
    )
    parser.add_argument(
        "--report",
        type=Path,
        default=ROOT / "data-migration" / "reports" / "ingest_mlb_schedule_game_feed_raw_to_typed_2026-06-02.json",
    )
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()
    if not args.source_db.is_absolute():
        args.source_db = ROOT / args.source_db
    if not args.raw_root.is_absolute():
        args.raw_root = ROOT / args.raw_root
    if not args.report.is_absolute():
        args.report = ROOT / args.report
    return args


def table_counts(con: sqlite3.Connection) -> dict[str, int]:
    tables = [
        "source_snapshots",
        "source_fetch_runs",
        "source_fetch_status",
        "teams",
        "venues",
        "players",
        "games",
        "starting_pitchers",
        "game_outcomes",
        "plate_appearances",
        "pitch_events",
    ]
    return {
        table: int(con.execute(f'select count(*) from "{table}"').fetchone()[0] or 0)
        for table in tables
    }


def diff_counts(before: dict[str, int], after: dict[str, int]) -> dict[str, int]:
    return {table: after.get(table, 0) - before.get(table, 0) for table in sorted(set(before) | set(after))}


def ingest(args: argparse.Namespace) -> dict:
    raw_day = load_raw_day(args.raw_root, args.date)
    expected_games = len(raw_day.schedule_games) if raw_day.schedule_path else None
    feed_count = len(raw_day.feed_files)
    report = {
        "generated_at": utc_now(),
        "script": "data-migration/scripts/ingest_mlb_schedule_game_feed_raw_to_typed.py",
        "source_db": str(args.source_db.relative_to(ROOT)),
        "raw_root": str(args.raw_root.relative_to(ROOT)),
        "date": args.date,
        "dry_run": args.dry_run,
        "expected_game_count": expected_games,
        "schedule_path": None if raw_day.schedule_path is None else str(raw_day.schedule_path.relative_to(ROOT)),
        "feed_file_count": feed_count,
        "schedule": {
            "source_files": 1 if raw_day.schedule_path else 0,
            "games": len(raw_day.schedule_games),
            "teams": 0,
            "venues": 0,
            "starting_pitchers": 0,
            "source_snapshot_id": None,
        },
        "feed": {
            "source_files": feed_count,
            "games": 0,
            "players": 0,
            "starting_pitchers": 0,
            "plate_appearances": 0,
            "pitch_events": 0,
            "game_outcomes": 0,
            "missing_schedule_games": 0,
        },
        "row_count_delta": {},
        "ok": True,
        "errors": [],
    }

    if args.dry_run:
        report["schedule"]["games"] = len(raw_day.schedule_games)
        return report

    with sqlite3.connect(args.source_db) as con:
        con.row_factory = sqlite3.Row
        before = table_counts(con)
        try:
            report["schedule"] = upsert_schedule(con, raw_day=raw_day, repo_root=ROOT, dry_run=args.dry_run)
            report["feed"] = upsert_game_feeds(con, raw_day=raw_day, repo_root=ROOT)
            schedule_actual = int(report["schedule"].get("games") or 0)
            feed_actual = int(report["feed"].get("source_files") or 0)
            upsert_fetch_status(
                con,
                source_name=SOURCE_SCHEDULE,
                source_family=FAMILY_SCHEDULE,
                date=args.date,
                expected=expected_games,
                actual=schedule_actual,
                report_path=args.report,
                repo_root=ROOT,
                dry_run=args.dry_run,
                ttl_hours=6,
                notes={"schedule_path": report["schedule_path"]},
            )
            upsert_fetch_status(
                con,
                source_name=SOURCE_GAME_FEED,
                source_family=FAMILY_GAME_FEED,
                date=args.date,
                expected=expected_games if expected_games is not None else feed_count,
                actual=feed_actual,
                report_path=args.report,
                repo_root=ROOT,
                dry_run=args.dry_run,
                ttl_hours=6,
                notes={
                    "feed_file_count": feed_count,
                    "missing_schedule_games": report["feed"].get("missing_schedule_games"),
                },
            )
            health_status = "ok" if feed_actual > 0 and (expected_games is None or feed_actual >= expected_games) else "warn"
        except Exception as exc:
            con.rollback()
            report["ok"] = False
            report["errors"].append(str(exc))
            raise
        else:
            after = table_counts(con)
            report["row_count_delta"] = diff_counts(before, after)
            insert_health_check(con, date=args.date, report=report, status=health_status)
            con.commit()

    return report


def main() -> int:
    args = parse_args()
    try:
        report = ingest(args)
    except Exception:
        raise
    finally:
        pass
    write_report(args.report, report)
    append_normalization_event(
        ROOT,
        {
            "event_id": f"phase9b-mlb-schedule-game-feed-raw-to-typed-{args.date}-{utc_now().replace(':', '-').replace('.', '-')}",
            "timestamp": utc_now(),
            "phase": "9B",
            "area": "mlb_schedule_game_feed_raw_to_typed",
            "source": "data-private/raw/mlb",
            "target": "sql-mlb.db:games,starting_pitchers,plate_appearances,pitch_events,game_outcomes,source_fetch_status",
            "parser_module": "pipeline/sources/mlb/normalization/game_feed.py",
            "migration_script": "data-migration/scripts/ingest_mlb_schedule_game_feed_raw_to_typed.py",
            "validation": "dry-run" if args.dry_run else "inserted" if report["ok"] else "; ".join(report["errors"]),
            "status_from": "not_started",
            "status_to": "parsed" if args.dry_run else "inserted" if report["ok"] else "blocked",
            "report_path": str(args.report.relative_to(ROOT)),
            "checksum": None,
            "notes": compact_json(
                {
                    "date": args.date,
                    "schedule_games": report["schedule"].get("games"),
                    "feed_files": report["feed"].get("source_files"),
                    "plate_appearances": report["feed"].get("plate_appearances"),
                    "pitch_events": report["feed"].get("pitch_events"),
                    "game_outcomes": report["feed"].get("game_outcomes"),
                }
            ),
        },
    )
    print(json.dumps(report, indent=2, sort_keys=True))
    return 0 if report["ok"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
