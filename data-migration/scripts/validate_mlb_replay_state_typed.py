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


PA_REQUIRED_COLUMNS = [
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

PITCH_REQUIRED_COLUMNS = [
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

MAX_RAW_STRIKES_IN_PA = 30


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
        default=ROOT / "data-migration" / "reports" / "validate_mlb_replay_state_typed_2026-06-03.json",
    )
    args = parser.parse_args()
    if not args.source_db.is_absolute():
        args.source_db = ROOT / args.source_db
    if not args.report.is_absolute():
        args.report = ROOT / args.report
    return args


def scalar(con: sqlite3.Connection, sql: str, params: tuple[Any, ...] = ()) -> int:
    return int(con.execute(sql, params).fetchone()[0] or 0)


def rows(con: sqlite3.Connection, sql: str, params: tuple[Any, ...] = ()) -> list[dict[str, Any]]:
    return [dict(row) for row in con.execute(sql, params).fetchall()]


def table_columns(con: sqlite3.Connection, table: str) -> set[str]:
    return {str(row["name"]) for row in con.execute(f"pragma table_info({table})").fetchall()}


def missing_columns(con: sqlite3.Connection, table: str, required: list[str]) -> list[str]:
    existing = table_columns(con, table)
    return [column for column in required if column not in existing]


def validate(args: argparse.Namespace) -> dict[str, Any]:
    if not args.source_db.exists():
        raise FileNotFoundError(f"Missing typed DB: {args.source_db}")

    with sqlite3.connect(args.source_db) as con:
        con.row_factory = sqlite3.Row
        missing = {
            "plate_appearances": missing_columns(con, "plate_appearances", PA_REQUIRED_COLUMNS),
            "pitch_events": missing_columns(con, "pitch_events", PITCH_REQUIRED_COLUMNS),
        }
        if missing["plate_appearances"] or missing["pitch_events"]:
            errors = [
                f"{table} missing columns: {', '.join(columns)}"
                for table, columns in missing.items()
                if columns
            ]
            return {
                "generated_at": utc_now(),
                "script": "data-migration/scripts/validate_mlb_replay_state_typed.py",
                "source_db": str(args.source_db.relative_to(ROOT)),
                "ok": False,
                "errors": errors,
                "missing_columns": missing,
            }

        counts = {
            "plate_appearances": scalar(con, "select count(*) from plate_appearances"),
            "pitch_events": scalar(con, "select count(*) from pitch_events"),
            "games_with_plate_appearances": scalar(con, "select count(distinct game_id) from plate_appearances"),
            "games_with_pitch_events": scalar(con, "select count(distinct game_id) from pitch_events"),
        }
        checks = {
            "plate_appearances_missing_replay_key": scalar(
                con,
                "select count(*) from plate_appearances where at_bat_index is null",
            ),
            "pitch_events_missing_replay_key": scalar(
                con,
                "select count(*) from pitch_events where at_bat_index is null or event_index is null",
            ),
            "duplicate_plate_appearance_order_keys": scalar(
                con,
                """
                select count(*)
                from (
                  select game_id, at_bat_index
                  from plate_appearances
                  where at_bat_index is not null
                  group by game_id, at_bat_index
                  having count(*) > 1
                )
                """,
            ),
            "duplicate_pitch_event_order_keys": scalar(
                con,
                """
                select count(*)
                from (
                  select game_id, at_bat_index, event_index
                  from pitch_events
                  where at_bat_index is not null and event_index is not null
                  group by game_id, at_bat_index, event_index
                  having count(*) > 1
                )
                """,
            ),
            "orphan_pitch_events": scalar(
                con,
                """
                select count(*)
                from pitch_events pe
                left join plate_appearances pa on pa.plate_appearance_id = pe.plate_appearance_id
                where pa.plate_appearance_id is null
                """,
            ),
            "plate_appearances_missing_base_state": scalar(
                con,
                "select count(*) from plate_appearances where base_state_start is null or base_state_end is null",
            ),
            "plate_appearances_missing_score_state": scalar(
                con,
                """
                select count(*)
                from plate_appearances
                where away_score_before is null
                   or home_score_before is null
                   or away_score_after is null
                   or home_score_after is null
                """,
            ),
            "plate_appearances_invalid_out_state": scalar(
                con,
                """
                select count(*)
                from plate_appearances
                where outs_before is null
                   or outs_after is null
                   or outs_before < 0
                   or outs_before > 2
                   or outs_after < 0
                   or outs_after > 3
                   or outs_after < outs_before
                """,
            ),
            "plate_appearances_invalid_count_state": scalar(
                con,
                """
                select count(*)
                from plate_appearances
                where balls_final is null
                   or strikes_final is null
                   or balls_final < 0
                   or balls_final > 4
                   or strikes_final < 0
                   or strikes_final > ?
                """,
                (MAX_RAW_STRIKES_IN_PA,),
            ),
            "plate_appearances_missing_raw_json": scalar(
                con,
                "select count(*) from plate_appearances where raw_json is null",
            ),
            "pitch_events_pitch_rows_missing_count_state": scalar(
                con,
                """
                select count(*)
                from pitch_events
                where is_pitch = 1
                  and (balls is null or strikes is null or outs is null)
                """,
            ),
            "pitch_events_invalid_count_state": scalar(
                con,
                """
                select count(*)
                from pitch_events
                where balls is null
                   or strikes is null
                   or outs is null
                   or balls < 0
                   or balls > 4
                   or strikes < 0
                   or strikes > ?
                   or outs < 0
                   or outs > 3
                """,
                (MAX_RAW_STRIKES_IN_PA,),
            ),
            "pitch_events_pitch_rows_missing_call": scalar(
                con,
                "select count(*) from pitch_events where is_pitch = 1 and call_description is null",
            ),
            "pitch_events_missing_raw_json": scalar(
                con,
                "select count(*) from pitch_events where raw_json is null",
            ),
            "final_score_mismatches": scalar(
                con,
                """
                with pa_scores as (
                  select
                    game_id,
                    max(away_score_after) as away_runs,
                    max(home_score_after) as home_runs
                  from plate_appearances
                  group by game_id
                )
                select count(*)
                from pa_scores pa
                join game_outcomes go on go.game_id = pa.game_id
                where go.away_runs is not null
                  and go.home_runs is not null
                  and (go.away_runs != pa.away_runs or go.home_runs != pa.home_runs)
                """,
            ),
            "score_delta_mismatches": scalar(
                con,
                """
                with pa_deltas as (
                  select
                    game_id,
                    sum(max(away_score_after - away_score_before, 0)) as away_runs,
                    sum(max(home_score_after - home_score_before, 0)) as home_runs
                  from plate_appearances
                  group by game_id
                )
                select count(*)
                from pa_deltas pa
                join game_outcomes go on go.game_id = pa.game_id
                where go.away_runs is not null
                  and go.home_runs is not null
                  and (go.away_runs != pa.away_runs or go.home_runs != pa.home_runs)
                """,
            ),
        }
        samples = {
            "final_score_mismatches": rows(
                con,
                """
                with pa_scores as (
                  select
                    game_id,
                    max(away_score_after) as pa_away_runs,
                    max(home_score_after) as pa_home_runs
                  from plate_appearances
                  group by game_id
                )
                select
                  pa.game_id,
                  pa.pa_away_runs,
                  pa.pa_home_runs,
                  go.away_runs as outcome_away_runs,
                  go.home_runs as outcome_home_runs
                from pa_scores pa
                join game_outcomes go on go.game_id = pa.game_id
                where go.away_runs is not null
                  and go.home_runs is not null
                  and (go.away_runs != pa.pa_away_runs or go.home_runs != pa.pa_home_runs)
                order by pa.game_id
                limit 20
                """,
            ),
            "invalid_out_state": rows(
                con,
                """
                select plate_appearance_id, game_id, at_bat_index, inning, inning_half, outs_before, outs_after, event_type
                from plate_appearances
                where outs_before is null
                   or outs_after is null
                   or outs_before < 0
                   or outs_before > 2
                   or outs_after < 0
                   or outs_after > 3
                   or outs_after < outs_before
                order by game_id, at_bat_index
                limit 20
                """,
            ),
        }

    blocking_checks = [
        "plate_appearances_missing_replay_key",
        "pitch_events_missing_replay_key",
        "duplicate_plate_appearance_order_keys",
        "duplicate_pitch_event_order_keys",
        "orphan_pitch_events",
        "plate_appearances_missing_base_state",
        "plate_appearances_missing_score_state",
        "plate_appearances_invalid_out_state",
        "plate_appearances_invalid_count_state",
        "plate_appearances_missing_raw_json",
        "pitch_events_pitch_rows_missing_count_state",
        "pitch_events_invalid_count_state",
        "pitch_events_pitch_rows_missing_call",
        "pitch_events_missing_raw_json",
        "final_score_mismatches",
        "score_delta_mismatches",
    ]
    errors = [f"{check}: {checks[check]}" for check in blocking_checks if checks[check]]

    return {
        "generated_at": utc_now(),
        "script": "data-migration/scripts/validate_mlb_replay_state_typed.py",
        "source_db": str(args.source_db.relative_to(ROOT)),
        "counts": counts,
        "checks": checks,
        "samples": samples,
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
            "event_id": f"validate-mlb-replay-state-typed-{utc_now().replace(':', '-').replace('.', '-')}",
            "timestamp": utc_now(),
            "phase": "M3-D2",
            "area": "mlb_replay_state_validation",
            "source": "sql-mlb.db:plate_appearances,pitch_events,game_outcomes",
            "target": "data-migration/reports",
            "parser_module": "none",
            "migration_script": "data-migration/scripts/validate_mlb_replay_state_typed.py",
            "validation": "passed" if report["ok"] else "; ".join(report["errors"]),
            "status_from": "replay-state-backfilled",
            "status_to": "validated" if report["ok"] else "blocked",
            "report_path": str(args.report.relative_to(ROOT)),
            "checksum": None,
            "notes": compact_json({"counts": report.get("counts"), "checks": report.get("checks")}),
        },
    )
    print(json.dumps(report, indent=2, sort_keys=True))
    return 0 if report["ok"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
