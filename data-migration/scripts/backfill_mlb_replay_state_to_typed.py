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


PA_COLUMNS = [
    "at_bat_index",
    "outs_before",
    "outs_after",
    "balls_final",
    "strikes_final",
    "base_state_start",
    "base_state_end",
    "away_score_before",
    "home_score_before",
    "away_score_after",
    "home_score_after",
    "men_on_base",
    "is_scoring_play",
    "is_out",
    "is_at_bat",
    "raw_json",
]

PITCH_COLUMNS = [
    "at_bat_index",
    "event_index",
    "balls",
    "strikes",
    "outs",
    "is_pitch",
    "is_strike",
    "is_ball",
    "call_code",
    "call_description",
    "pitch_type_code",
    "pitch_type_description",
    "start_speed",
    "end_speed",
    "play_id",
    "raw_json",
]

REPLAY_INDEXES = [
    "create index if not exists idx_mlb_pa_replay_order on plate_appearances (game_id, at_bat_index)",
    "create index if not exists idx_mlb_pitch_events_replay_order on pitch_events (game_id, at_bat_index, event_index)",
]


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
        default=ROOT / "data-migration" / "reports" / "backfill_mlb_replay_state_to_typed_2026-06-03.json",
    )
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()
    if not args.typed_db.is_absolute():
        args.typed_db = ROOT / args.typed_db
    if not args.legacy_db.is_absolute():
        args.legacy_db = ROOT / args.legacy_db
    if not args.report.is_absolute():
        args.report = ROOT / args.report
    return args


def scalar(con: sqlite3.Connection, sql: str, params: tuple[Any, ...] = ()) -> int:
    return int(con.execute(sql, params).fetchone()[0] or 0)


def table_columns(con: sqlite3.Connection, table: str) -> set[str]:
    return {str(row["name"]) for row in con.execute(f"pragma table_info({table})").fetchall()}


def require_columns(con: sqlite3.Connection, table: str, columns: list[str]) -> list[str]:
    existing = table_columns(con, table)
    return [column for column in columns if column not in existing]


def non_null_counts(con: sqlite3.Connection, table: str, columns: list[str]) -> dict[str, int]:
    return {column: scalar(con, f"select count(*) from {table} where {column} is not null") for column in columns}


def replay_counts(con: sqlite3.Connection) -> dict[str, Any]:
    return {
        "plate_appearances": {
            "total": scalar(con, "select count(*) from plate_appearances"),
            "with_replay_key": scalar(con, "select count(*) from plate_appearances where at_bat_index is not null"),
            "field_non_null": non_null_counts(con, "plate_appearances", PA_COLUMNS),
        },
        "pitch_events": {
            "total": scalar(con, "select count(*) from pitch_events"),
            "with_replay_key": scalar(
                con,
                "select count(*) from pitch_events where at_bat_index is not null and event_index is not null",
            ),
            "field_non_null": non_null_counts(con, "pitch_events", PITCH_COLUMNS),
        },
    }


def attach_legacy(con: sqlite3.Connection, legacy_db: Path) -> None:
    con.execute("attach database ? as legacy", (str(legacy_db),))


def unmatched_counts(con: sqlite3.Connection) -> dict[str, int]:
    return {
        "typed_plate_appearances_without_legacy_match": scalar(
            con,
            """
            select count(*)
            from plate_appearances pa
            left join legacy.mlb_plate_appearances legacy_pa
              on pa.plate_appearance_id = 'mlb-' || legacy_pa.game_pk || '-pa-' || legacy_pa.at_bat_index
            where legacy_pa.game_pk is null
            """,
        ),
        "legacy_plate_appearances_without_typed_match": scalar(
            con,
            """
            select count(*)
            from legacy.mlb_plate_appearances legacy_pa
            left join plate_appearances pa
              on pa.plate_appearance_id = 'mlb-' || legacy_pa.game_pk || '-pa-' || legacy_pa.at_bat_index
            where pa.plate_appearance_id is null
            """,
        ),
        "typed_pitch_events_without_legacy_match": scalar(
            con,
            """
            select count(*)
            from pitch_events pe
            left join legacy.mlb_pitch_events legacy_pe
              on pe.pitch_event_id =
                'mlb-' || legacy_pe.game_pk || '-pa-' || legacy_pe.at_bat_index || '-event-' || legacy_pe.event_index
            where legacy_pe.game_pk is null
            """,
        ),
        "legacy_pitch_events_without_typed_match": scalar(
            con,
            """
            select count(*)
            from legacy.mlb_pitch_events legacy_pe
            left join pitch_events pe
              on pe.pitch_event_id =
                'mlb-' || legacy_pe.game_pk || '-pa-' || legacy_pe.at_bat_index || '-event-' || legacy_pe.event_index
            where pe.pitch_event_id is null
            """,
        ),
    }


def matching_counts(con: sqlite3.Connection) -> dict[str, int]:
    return {
        "plate_appearances": scalar(
            con,
            """
            select count(*)
            from plate_appearances pa
            join legacy.mlb_plate_appearances legacy_pa
              on pa.plate_appearance_id = 'mlb-' || legacy_pa.game_pk || '-pa-' || legacy_pa.at_bat_index
            """,
        ),
        "pitch_events": scalar(
            con,
            """
            select count(*)
            from pitch_events pe
            join legacy.mlb_pitch_events legacy_pe
              on pe.pitch_event_id =
                'mlb-' || legacy_pe.game_pk || '-pa-' || legacy_pe.at_bat_index || '-event-' || legacy_pe.event_index
            """,
        ),
    }


def update_plate_appearances(con: sqlite3.Connection) -> int:
    cursor = con.execute(
        """
        update plate_appearances
        set (
          at_bat_index,
          outs_before,
          outs_after,
          balls_final,
          strikes_final,
          base_state_start,
          base_state_end,
          away_score_before,
          home_score_before,
          away_score_after,
          home_score_after,
          men_on_base,
          is_scoring_play,
          is_out,
          is_at_bat,
          raw_json
        ) = (
          select
            legacy_pa.at_bat_index,
            legacy_pa.outs_before,
            legacy_pa.outs_after,
            legacy_pa.balls_final,
            legacy_pa.strikes_final,
            legacy_pa.base_state_start,
            legacy_pa.base_state_end,
            legacy_pa.away_score_before,
            legacy_pa.home_score_before,
            legacy_pa.away_score_after,
            legacy_pa.home_score_after,
            legacy_pa.men_on_base,
            legacy_pa.is_scoring_play,
            legacy_pa.is_out,
            legacy_pa.is_at_bat,
            legacy_pa.raw_json
          from legacy.mlb_plate_appearances legacy_pa
          where plate_appearances.plate_appearance_id =
            'mlb-' || legacy_pa.game_pk || '-pa-' || legacy_pa.at_bat_index
        )
        where exists (
          select 1
          from legacy.mlb_plate_appearances legacy_pa
          where plate_appearances.plate_appearance_id =
            'mlb-' || legacy_pa.game_pk || '-pa-' || legacy_pa.at_bat_index
        )
        """
    )
    return int(cursor.rowcount or 0)


def update_pitch_events(con: sqlite3.Connection) -> int:
    cursor = con.execute(
        """
        update pitch_events
        set (
          at_bat_index,
          event_index,
          balls,
          strikes,
          outs,
          is_pitch,
          is_strike,
          is_ball,
          call_code,
          call_description,
          pitch_type_code,
          pitch_type_description,
          start_speed,
          end_speed,
          play_id,
          raw_json
        ) = (
          select
            legacy_pe.at_bat_index,
            legacy_pe.event_index,
            legacy_pe.balls,
            legacy_pe.strikes,
            legacy_pe.outs,
            legacy_pe.is_pitch,
            legacy_pe.is_strike,
            legacy_pe.is_ball,
            legacy_pe.call_code,
            legacy_pe.call_description,
            legacy_pe.pitch_type_code,
            legacy_pe.pitch_type_description,
            legacy_pe.start_speed,
            legacy_pe.end_speed,
            legacy_pe.play_id,
            legacy_pe.raw_json
          from legacy.mlb_pitch_events legacy_pe
          where pitch_events.pitch_event_id =
            'mlb-' || legacy_pe.game_pk || '-pa-' || legacy_pe.at_bat_index || '-event-' || legacy_pe.event_index
        )
        where exists (
          select 1
          from legacy.mlb_pitch_events legacy_pe
          where pitch_events.pitch_event_id =
            'mlb-' || legacy_pe.game_pk || '-pa-' || legacy_pe.at_bat_index || '-event-' || legacy_pe.event_index
        )
        """
    )
    return int(cursor.rowcount or 0)


def mismatch_count(con: sqlite3.Connection, *, table: str, legacy_table: str, columns: list[str], join_sql: str) -> int:
    comparisons = " or ".join(
        f"not ((typed.{column} = legacy.{column}) or (typed.{column} is null and legacy.{column} is null))"
        for column in columns
    )
    return scalar(
        con,
        f"""
        select count(*)
        from {table} typed
        join legacy.{legacy_table} legacy on {join_sql}
        where {comparisons}
        """,
    )


def backfill(args: argparse.Namespace) -> dict[str, Any]:
    if not args.typed_db.exists():
        raise FileNotFoundError(f"Missing typed DB: {args.typed_db}")
    if not args.legacy_db.exists():
        raise FileNotFoundError(f"Missing legacy DB: {args.legacy_db}")

    with sqlite3.connect(args.typed_db) as con:
        con.row_factory = sqlite3.Row
        con.execute("pragma busy_timeout = 30000")
        missing_schema = {
            "plate_appearances": require_columns(con, "plate_appearances", PA_COLUMNS),
            "pitch_events": require_columns(con, "pitch_events", PITCH_COLUMNS),
        }
        schema_errors = [f"{table}: {', '.join(columns)}" for table, columns in missing_schema.items() if columns]
        if schema_errors:
            return {
                "generated_at": utc_now(),
                "script": "data-migration/scripts/backfill_mlb_replay_state_to_typed.py",
                "typed_db": str(args.typed_db.relative_to(ROOT)),
                "legacy_db": str(args.legacy_db.relative_to(ROOT)),
                "dry_run": args.dry_run,
                "ok": False,
                "errors": ["Missing replay schema columns. Run migrate_mlb_replay_state_schema.py first.", *schema_errors],
            }

        attach_legacy(con, args.legacy_db)
        before = replay_counts(con)
        matches = matching_counts(con)
        unmatched_before = unmatched_counts(con)
        updated = {"plate_appearances": 0, "pitch_events": 0}
        try:
            if not args.dry_run:
                con.execute("begin")
                updated["plate_appearances"] = update_plate_appearances(con)
                updated["pitch_events"] = update_pitch_events(con)
                for ddl in REPLAY_INDEXES:
                    con.execute(ddl)
                con.commit()
        except Exception:
            if not args.dry_run:
                con.rollback()
            raise
        after = replay_counts(con)
        unmatched_after = unmatched_counts(con)
        mismatches_after = {
            "plate_appearances": mismatch_count(
                con,
                table="plate_appearances",
                legacy_table="mlb_plate_appearances",
                columns=PA_COLUMNS,
                join_sql="typed.plate_appearance_id = 'mlb-' || legacy.game_pk || '-pa-' || legacy.at_bat_index",
            ),
            "pitch_events": mismatch_count(
                con,
                table="pitch_events",
                legacy_table="mlb_pitch_events",
                columns=PITCH_COLUMNS,
                join_sql=(
                    "typed.pitch_event_id = "
                    "'mlb-' || legacy.game_pk || '-pa-' || legacy.at_bat_index || '-event-' || legacy.event_index"
                ),
            ),
        }
        con.execute("detach database legacy")

    errors: list[str] = []
    if after["plate_appearances"]["total"] != before["plate_appearances"]["total"]:
        errors.append("Plate appearance row count changed during replay backfill.")
    if after["pitch_events"]["total"] != before["pitch_events"]["total"]:
        errors.append("Pitch event row count changed during replay backfill.")
    if unmatched_after["typed_plate_appearances_without_legacy_match"]:
        errors.append("Typed plate appearances without legacy replay match remain.")
    if unmatched_after["legacy_plate_appearances_without_typed_match"]:
        errors.append("Legacy plate appearances without typed row remain.")
    if unmatched_after["typed_pitch_events_without_legacy_match"]:
        errors.append("Typed pitch events without legacy replay match remain.")
    if unmatched_after["legacy_pitch_events_without_typed_match"]:
        errors.append("Legacy pitch events without typed row remain.")
    if mismatches_after["plate_appearances"]:
        errors.append("Plate appearance replay values still differ from legacy after backfill.")
    if mismatches_after["pitch_events"]:
        errors.append("Pitch event replay values still differ from legacy after backfill.")

    return {
        "generated_at": utc_now(),
        "script": "data-migration/scripts/backfill_mlb_replay_state_to_typed.py",
        "typed_db": str(args.typed_db.relative_to(ROOT)),
        "legacy_db": str(args.legacy_db.relative_to(ROOT)),
        "dry_run": args.dry_run,
        "before": before,
        "after": after,
        "matching_rows": matches,
        "unmatched_before": unmatched_before,
        "unmatched_after": unmatched_after,
        "updated_rows": updated if not args.dry_run else {"plate_appearances": "dry_run", "pitch_events": "dry_run"},
        "mismatches_after": mismatches_after,
        "ok": not errors,
        "errors": errors,
    }


def main() -> int:
    args = parse_args()
    report = backfill(args)
    write_report(args.report, report)
    if not args.dry_run:
        append_normalization_event(
            ROOT,
            {
                "event_id": f"backfill-mlb-replay-state-to-typed-{utc_now().replace(':', '-').replace('.', '-')}",
                "timestamp": utc_now(),
                "phase": "M3-D1",
                "area": "mlb_replay_state_backfill",
                "source": "data-private/warehouse/sports.db:mlb_plate_appearances,mlb_pitch_events",
                "target": "sql-mlb.db:plate_appearances,pitch_events",
                "parser_module": "none",
                "migration_script": "data-migration/scripts/backfill_mlb_replay_state_to_typed.py",
                "validation": "passed" if report["ok"] else "; ".join(report["errors"]),
                "status_from": "replay-schema-ready",
                "status_to": "replay-state-backfilled" if report["ok"] else "blocked",
                "report_path": str(args.report.relative_to(ROOT)),
                "checksum": None,
                "notes": compact_json(
                    {
                        "matching_rows": report.get("matching_rows"),
                        "updated_rows": report.get("updated_rows"),
                        "unmatched_after": report.get("unmatched_after"),
                        "mismatches_after": report.get("mismatches_after"),
                    }
                ),
            },
        )
    print(json.dumps(report, indent=2, sort_keys=True))
    return 0 if report["ok"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
