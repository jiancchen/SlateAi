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
from pipeline.sources.mlb.normalization.game_feed import SOURCE_GAME_FEED, SOURCE_SCHEDULE


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--date", required=True)
    parser.add_argument(
        "--source-db",
        type=Path,
        default=ROOT / "data-private" / "warehouse" / "sports" / "mlb" / "sql-mlb.db",
    )
    parser.add_argument(
        "--report",
        type=Path,
        default=ROOT / "data-migration" / "reports" / "validate_mlb_schedule_game_feed_raw_to_typed_2026-06-02.json",
    )
    args = parser.parse_args()
    if not args.source_db.is_absolute():
        args.source_db = ROOT / args.source_db
    if not args.report.is_absolute():
        args.report = ROOT / args.report
    return args


def scalar(con: sqlite3.Connection, sql: str, params: tuple = ()) -> int:
    return int(con.execute(sql, params).fetchone()[0] or 0)


def fetchone(con: sqlite3.Connection, sql: str, params: tuple = ()) -> dict | None:
    row = con.execute(sql, params).fetchone()
    return dict(row) if row else None


def validate(args: argparse.Namespace) -> dict:
    with sqlite3.connect(args.source_db) as con:
        con.row_factory = sqlite3.Row
        schedule_status = fetchone(
            con,
            "select * from source_fetch_status where sport='mlb' and source_name=? and source_date=?",
            (SOURCE_SCHEDULE, args.date),
        )
        feed_status = fetchone(
            con,
            "select * from source_fetch_status where sport='mlb' and source_name=? and source_date=?",
            (SOURCE_GAME_FEED, args.date),
        )
        schedule_snapshots = scalar(
            con,
            """
            select count(*) from source_snapshots
            where sport='mlb' and source_name=? and source_date=? and local_path like '%/schedule.json'
            """,
            (SOURCE_SCHEDULE, args.date),
        )
        feed_snapshots = scalar(
            con,
            """
            select count(*) from source_snapshots
            where sport='mlb' and source_name=? and source_date=? and local_path like '%-feed-live.json.gz'
            """,
            (SOURCE_GAME_FEED, args.date),
        )
        games = scalar(con, "select count(*) from games where game_date=?", (args.date,))
        outcomes = scalar(
            con,
            """
            select count(*) from game_outcomes go
            join games g on g.game_id = go.game_id
            where g.game_date=? and go.source_table=?
            """,
            (args.date, SOURCE_GAME_FEED),
        )
        plate_appearances = scalar(
            con,
            """
            select count(*) from plate_appearances pa
            join source_snapshots ss on ss.source_snapshot_id = pa.source_snapshot_id
            where ss.source_name=? and ss.source_date=?
            """,
            (SOURCE_GAME_FEED, args.date),
        )
        pitch_events = scalar(
            con,
            """
            select count(*) from pitch_events pe
            join source_snapshots ss on ss.source_snapshot_id = pe.source_snapshot_id
            where ss.source_name=? and ss.source_date=?
            """,
            (SOURCE_GAME_FEED, args.date),
        )
        orphan_pas = scalar(
            con,
            """
            select count(*)
            from plate_appearances pa
            left join games g on g.game_id = pa.game_id
            left join players b on b.player_id = pa.batter_id
            left join players p on p.player_id = pa.pitcher_id
            where pa.source_snapshot_id in (
              select source_snapshot_id from source_snapshots
              where source_name=? and source_date=?
            )
            and (g.game_id is null or (pa.batter_id is not null and b.player_id is null) or (pa.pitcher_id is not null and p.player_id is null))
            """,
            (SOURCE_GAME_FEED, args.date),
        )
        orphan_pitch_events = scalar(
            con,
            """
            select count(*)
            from pitch_events pe
            left join plate_appearances pa on pa.plate_appearance_id = pe.plate_appearance_id
            left join games g on g.game_id = pe.game_id
            where pe.source_snapshot_id in (
              select source_snapshot_id from source_snapshots
              where source_name=? and source_date=?
            )
            and (g.game_id is null or pa.plate_appearance_id is null)
            """,
            (SOURCE_GAME_FEED, args.date),
        )
        duplicate_pas = scalar(
            con,
            """
            select count(*) from (
              select plate_appearance_id from plate_appearances group by plate_appearance_id having count(*) > 1
            )
            """,
        )
        duplicate_pitch_events = scalar(
            con,
            """
            select count(*) from (
              select pitch_event_id from pitch_events group by pitch_event_id having count(*) > 1
            )
            """,
        )
        health = fetchone(
            con,
            "select * from health_checks where health_check_id=?",
            (f"mlb-schedule-game-feed-raw-to-typed:{args.date}",),
        )

    errors = []
    if not schedule_status:
        errors.append("Missing mlb_schedule source_fetch_status row.")
    elif schedule_status["last_status"] not in {"success", "partial", "skipped_cache"}:
        errors.append(f"Blocking schedule source status: {schedule_status['last_status']}")
    if not feed_status:
        errors.append("Missing mlb_game_feed source_fetch_status row.")
    elif feed_status["last_status"] not in {"success", "partial", "skipped_cache"}:
        errors.append(f"Blocking feed source status: {feed_status['last_status']}")
    if schedule_snapshots <= 0:
        errors.append("No dated schedule source snapshot.")
    if feed_snapshots <= 0:
        errors.append("No dated feed source snapshots.")
    if games <= 0:
        errors.append("No games for date.")
    if outcomes <= 0:
        errors.append("No source-linked game outcomes for date.")
    if plate_appearances <= 0:
        errors.append("No source-linked plate appearances for date.")
    if pitch_events <= 0:
        errors.append("No source-linked pitch events for date.")
    if orphan_pas:
        errors.append(f"Orphan source-linked plate appearances: {orphan_pas}")
    if orphan_pitch_events:
        errors.append(f"Orphan source-linked pitch events: {orphan_pitch_events}")
    if duplicate_pas:
        errors.append(f"Duplicate plate_appearance_id rows: {duplicate_pas}")
    if duplicate_pitch_events:
        errors.append(f"Duplicate pitch_event_id rows: {duplicate_pitch_events}")
    if not health:
        errors.append("Missing health check row.")
    elif health["status"] not in {"ok", "warn"}:
        errors.append(f"Blocking health check status: {health['status']}")

    return {
        "generated_at": utc_now(),
        "script": "data-migration/scripts/validate_mlb_schedule_game_feed_raw_to_typed.py",
        "source_db": str(args.source_db.relative_to(ROOT)),
        "date": args.date,
        "schedule_status": schedule_status,
        "feed_status": feed_status,
        "schedule_snapshots": schedule_snapshots,
        "feed_snapshots": feed_snapshots,
        "games": games,
        "source_linked_game_outcomes": outcomes,
        "source_linked_plate_appearances": plate_appearances,
        "source_linked_pitch_events": pitch_events,
        "orphan_plate_appearances": orphan_pas,
        "orphan_pitch_events": orphan_pitch_events,
        "duplicate_plate_appearance_ids": duplicate_pas,
        "duplicate_pitch_event_ids": duplicate_pitch_events,
        "health_check": health,
        "ok": not errors,
        "errors": errors,
    }


def main() -> int:
    args = parse_args()
    report = validate(args)
    write_report(args.report, report)
    append_normalization_event(
        ROOT,
        {
            "event_id": f"validate-phase9b-mlb-schedule-game-feed-raw-to-typed-{args.date}-{utc_now().replace(':', '-').replace('.', '-')}",
            "timestamp": utc_now(),
            "phase": "9B",
            "area": "mlb_schedule_game_feed_raw_to_typed_validation",
            "source": "sql-mlb.db:source_snapshots",
            "target": "sql-mlb.db:games,starting_pitchers,plate_appearances,pitch_events,game_outcomes,source_fetch_status",
            "parser_module": "pipeline/sources/mlb/normalization/game_feed.py",
            "migration_script": "data-migration/scripts/validate_mlb_schedule_game_feed_raw_to_typed.py",
            "validation": "passed" if report["ok"] else "; ".join(report["errors"]),
            "status_from": "inserted",
            "status_to": "validated" if report["ok"] else "blocked",
            "report_path": str(args.report.relative_to(ROOT)),
            "checksum": None,
            "notes": compact_json(
                {
                    "games": report["games"],
                    "source_linked_game_outcomes": report["source_linked_game_outcomes"],
                    "source_linked_plate_appearances": report["source_linked_plate_appearances"],
                    "source_linked_pitch_events": report["source_linked_pitch_events"],
                }
            ),
        },
    )
    print(json.dumps(report, indent=2, sort_keys=True))
    return 0 if report["ok"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
