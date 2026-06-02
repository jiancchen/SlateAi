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

from pipeline.sources.mlb.normalization.common import utc_now, write_report
from pipeline.sources.mlb.normalization.player_raw_context import SOURCE_PLAYER_CONTEXT, SOURCE_SAVANT


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
        default=ROOT / "data-migration" / "reports" / "validate_mlb_player_context_raw_to_typed_2026-06-02.json",
    )
    args = parser.parse_args()
    if not args.source_db.is_absolute():
        args.source_db = ROOT / args.source_db
    if not args.report.is_absolute():
        args.report = ROOT / args.report
    return args


def scalar(con: sqlite3.Connection, sql: str, params: tuple = ()) -> int:
    return int(con.execute(sql, params).fetchone()[0] or 0)


def validate(args: argparse.Namespace) -> dict:
    report = {
        "generated_at": utc_now(),
        "script": "data-migration/scripts/validate_mlb_player_context_raw_to_typed.py",
        "source_db": str(args.source_db.relative_to(ROOT)),
        "date": args.date,
        "fetch_status": {},
        "counts": {},
        "checks": [],
        "ok": True,
    }
    with sqlite3.connect(args.source_db) as con:
        con.row_factory = sqlite3.Row
        for source_name in (SOURCE_SAVANT, SOURCE_PLAYER_CONTEXT):
            row = con.execute(
                """
                select last_status, last_completeness_status, expected_item_count,
                       actual_item_count, missing_item_count, unresolved_count, cache_valid_until
                from source_fetch_status
                where sport='mlb' and source_name=? and source_date=?
                """,
                (source_name, args.date),
            ).fetchone()
            report["fetch_status"][source_name] = None if row is None else dict(row)
        report["counts"] = {
            "savant_source_snapshots": scalar(
                con,
                "select count(*) from source_snapshots where sport='mlb' and source_name=? and source_date=?",
                (SOURCE_SAVANT, args.date),
            ),
            "player_context_source_snapshots": scalar(
                con,
                "select count(*) from source_snapshots where sport='mlb' and source_name=? and source_date=?",
                (SOURCE_PLAYER_CONTEXT, args.date),
            ),
            "source_linked_statcast_game_logs": scalar(
                con,
                """
                select count(*)
                from player_statcast_game_logs
                where source_table in (
                  'data-private/raw/baseballsavant/hitter-statcast/grouped.csv',
                  'data-private/raw/baseballsavant/hitter-statcast/details.csv'
                )
                  and source_pk like ?
                """,
                (f"{args.date}:%",),
            ),
            "source_linked_identity_profiles": scalar(
                con,
                """
                select count(*)
                from player_identity_profiles
                where source_table='data-private/raw/mlb-stats-api/hitter-career-profiles'
                  and source_pk like ?
                """,
                (f"{args.date}:%",),
            ),
            "source_linked_career_profiles": scalar(
                con,
                """
                select count(*)
                from player_career_profiles
                where source_table='data-private/raw/mlb-stats-api/hitter-career-profiles'
                  and source_pk like ?
                """,
                (f"{args.date}:%",),
            ),
            "duplicate_statcast_game_log_ids": scalar(
                con,
                """
                select count(*)
                from (
                  select statcast_game_log_id
                  from player_statcast_game_logs
                  group by statcast_game_log_id
                  having count(*) > 1
                )
                """,
            ),
            "orphan_statcast_players": scalar(
                con,
                """
                select count(*)
                from player_statcast_game_logs logs
                left join players players on players.player_id = logs.player_id
                where players.player_id is null
                """,
            ),
            "orphan_identity_players": scalar(
                con,
                """
                select count(*)
                from player_identity_profiles profiles
                left join players players on players.player_id = profiles.player_id
                where profiles.player_id is not null and players.player_id is null
                """,
            ),
        }

    def check(name: str, ok: bool, details: str) -> None:
        report["checks"].append({"name": name, "ok": bool(ok), "details": details})
        if not ok:
            report["ok"] = False

    for source_name in (SOURCE_SAVANT, SOURCE_PLAYER_CONTEXT):
        status = report["fetch_status"].get(source_name) or {}
        check(
            f"{source_name}_status_present",
            status.get("last_status") in {"success", "partial", "skipped_cache"},
            str(status),
        )
    check("savant_snapshots_exist", report["counts"]["savant_source_snapshots"] > 0, str(report["counts"]["savant_source_snapshots"]))
    check("player_context_snapshots_exist", report["counts"]["player_context_source_snapshots"] > 0, str(report["counts"]["player_context_source_snapshots"]))
    check("statcast_game_logs_inserted", report["counts"]["source_linked_statcast_game_logs"] > 0, str(report["counts"]["source_linked_statcast_game_logs"]))
    check("identity_profiles_inserted", report["counts"]["source_linked_identity_profiles"] > 0, str(report["counts"]["source_linked_identity_profiles"]))
    check("career_profiles_inserted", report["counts"]["source_linked_career_profiles"] > 0, str(report["counts"]["source_linked_career_profiles"]))
    check("no_duplicate_statcast_ids", report["counts"]["duplicate_statcast_game_log_ids"] == 0, str(report["counts"]["duplicate_statcast_game_log_ids"]))
    check("no_orphan_statcast_players", report["counts"]["orphan_statcast_players"] == 0, str(report["counts"]["orphan_statcast_players"]))
    check("no_orphan_identity_players", report["counts"]["orphan_identity_players"] == 0, str(report["counts"]["orphan_identity_players"]))
    return report


def main() -> int:
    args = parse_args()
    report = validate(args)
    write_report(args.report, report)
    print(json.dumps(report, indent=2, sort_keys=True))
    return 0 if report["ok"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
