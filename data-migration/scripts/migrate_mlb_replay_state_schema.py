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


PA_COLUMNS: list[tuple[str, str]] = [
    ("at_bat_index", "integer"),
    ("outs_before", "integer"),
    ("outs_after", "integer"),
    ("balls_final", "integer"),
    ("strikes_final", "integer"),
    ("base_state_start", "text"),
    ("base_state_end", "text"),
    ("away_score_before", "integer"),
    ("home_score_before", "integer"),
    ("away_score_after", "integer"),
    ("home_score_after", "integer"),
    ("men_on_base", "text"),
    ("is_scoring_play", "integer"),
    ("is_out", "integer"),
    ("is_at_bat", "integer"),
    ("raw_json", "text"),
]

PITCH_COLUMNS: list[tuple[str, str]] = [
    ("at_bat_index", "integer"),
    ("event_index", "integer"),
    ("balls", "integer"),
    ("strikes", "integer"),
    ("outs", "integer"),
    ("is_pitch", "integer"),
    ("is_strike", "integer"),
    ("is_ball", "integer"),
    ("call_code", "text"),
    ("call_description", "text"),
    ("pitch_type_code", "text"),
    ("pitch_type_description", "text"),
    ("start_speed", "real"),
    ("end_speed", "real"),
    ("play_id", "text"),
    ("raw_json", "text"),
]

REPLAY_INDEXES: list[tuple[str, str]] = [
    (
        "idx_mlb_pa_replay_order",
        "create index if not exists idx_mlb_pa_replay_order on plate_appearances (game_id, at_bat_index)",
    ),
    (
        "idx_mlb_pitch_events_replay_order",
        "create index if not exists idx_mlb_pitch_events_replay_order on pitch_events (game_id, at_bat_index, event_index)",
    ),
]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--source-db",
        type=Path,
        default=ROOT / "data-private" / "warehouse" / "sports" / "mlb" / "sql-mlb.db",
    )
    parser.add_argument(
        "--report",
        type=Path,
        default=ROOT / "data-migration" / "reports" / "migrate_mlb_replay_state_schema_2026-06-03.json",
    )
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()
    if not args.source_db.is_absolute():
        args.source_db = ROOT / args.source_db
    if not args.report.is_absolute():
        args.report = ROOT / args.report
    return args


def table_columns(con: sqlite3.Connection, table: str) -> set[str]:
    return {str(row["name"]) for row in con.execute(f"pragma table_info({table})").fetchall()}


def table_count(con: sqlite3.Connection, table: str) -> int:
    return int(con.execute(f"select count(*) from {table}").fetchone()[0] or 0)


def index_exists(con: sqlite3.Connection, index_name: str) -> bool:
    row = con.execute(
        "select 1 from sqlite_master where type='index' and name=?",
        (index_name,),
    ).fetchone()
    return row is not None


def add_missing_columns(
    con: sqlite3.Connection,
    *,
    table: str,
    columns: list[tuple[str, str]],
    dry_run: bool,
) -> dict[str, list[str]]:
    existing = table_columns(con, table)
    added: list[str] = []
    already_present: list[str] = []
    for column, column_type in columns:
        if column in existing:
            already_present.append(column)
            continue
        added.append(column)
        if not dry_run:
            con.execute(f"alter table {table} add column {column} {column_type}")
    return {"added": added, "already_present": already_present}


def migrate(args: argparse.Namespace) -> dict[str, Any]:
    if not args.source_db.exists():
        raise FileNotFoundError(f"Missing typed DB: {args.source_db}")

    with sqlite3.connect(args.source_db) as con:
        con.row_factory = sqlite3.Row
        before_counts = {
            "plate_appearances": table_count(con, "plate_appearances"),
            "pitch_events": table_count(con, "pitch_events"),
        }
        before_columns = {
            "plate_appearances": sorted(table_columns(con, "plate_appearances")),
            "pitch_events": sorted(table_columns(con, "pitch_events")),
        }
        if not args.dry_run:
            con.execute("begin")
        try:
            pa = add_missing_columns(con, table="plate_appearances", columns=PA_COLUMNS, dry_run=args.dry_run)
            pitch = add_missing_columns(con, table="pitch_events", columns=PITCH_COLUMNS, dry_run=args.dry_run)
            indexes: dict[str, str] = {}
            for index_name, ddl in REPLAY_INDEXES:
                exists_before = index_exists(con, index_name)
                if args.dry_run:
                    indexes[index_name] = "already_present" if exists_before else "would_create"
                else:
                    con.execute(ddl)
                    indexes[index_name] = "already_present" if exists_before else "created"
            if not args.dry_run:
                con.commit()
        except Exception:
            if not args.dry_run:
                con.rollback()
            raise

        after_counts = {
            "plate_appearances": table_count(con, "plate_appearances"),
            "pitch_events": table_count(con, "pitch_events"),
        }
        actual_after_columns = {
            "plate_appearances": sorted(table_columns(con, "plate_appearances")),
            "pitch_events": sorted(table_columns(con, "pitch_events")),
        }
        after_columns = actual_after_columns
        if args.dry_run:
            after_columns = {
                "plate_appearances": sorted(set(actual_after_columns["plate_appearances"]) | set(pa["added"])),
                "pitch_events": sorted(set(actual_after_columns["pitch_events"]) | set(pitch["added"])),
            }

    errors: list[str] = []
    if after_counts != before_counts:
        errors.append(f"Replay schema migration changed row counts: before={before_counts} after={after_counts}")
    for table, required in {
        "plate_appearances": PA_COLUMNS,
        "pitch_events": PITCH_COLUMNS,
    }.items():
        missing = [column for column, _ in required if column not in after_columns[table]]
        if missing:
            errors.append(f"{table} missing replay columns after migration: {', '.join(missing)}")

    return {
        "generated_at": utc_now(),
        "script": "data-migration/scripts/migrate_mlb_replay_state_schema.py",
        "source_db": str(args.source_db.relative_to(ROOT)),
        "dry_run": args.dry_run,
        "before_counts": before_counts,
        "after_counts": after_counts,
        "before_columns": before_columns,
        "after_columns": after_columns,
        "plate_appearances": pa,
        "pitch_events": pitch,
        "indexes": indexes,
        "ok": not errors,
        "errors": errors,
    }


def main() -> int:
    args = parse_args()
    report = migrate(args)
    write_report(args.report, report)
    if not args.dry_run:
        append_normalization_event(
            ROOT,
            {
                "event_id": f"migrate-mlb-replay-state-schema-{utc_now().replace(':', '-').replace('.', '-')}",
                "timestamp": utc_now(),
                "phase": "M3-D0",
                "area": "mlb_replay_state_schema",
                "source": "typed-db-existing-core-feed",
                "target": "sql-mlb.db:plate_appearances,pitch_events",
                "parser_module": "none",
                "migration_script": "data-migration/scripts/migrate_mlb_replay_state_schema.py",
                "validation": "passed" if report["ok"] else "; ".join(report["errors"]),
                "status_from": "typed-core-feed",
                "status_to": "replay-schema-ready" if report["ok"] else "blocked",
                "report_path": str(args.report.relative_to(ROOT)),
                "checksum": None,
                "notes": compact_json(
                    {
                        "plate_appearances_added": report["plate_appearances"]["added"],
                        "pitch_events_added": report["pitch_events"]["added"],
                        "indexes": report["indexes"],
                    }
                ),
            },
        )
    print(json.dumps(report, indent=2, sort_keys=True))
    return 0 if report["ok"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
