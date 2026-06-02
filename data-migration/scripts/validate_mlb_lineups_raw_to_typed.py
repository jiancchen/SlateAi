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
from pipeline.sources.mlb.normalization.lineup_board import SOURCE_LINEUPS, SOURCE_PROBABLES


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--date", required=True)
    parser.add_argument(
        "--source-db",
        type=Path,
        default=ROOT / "data-private" / "warehouse" / "sports" / "mlb" / "sql-mlb.db",
    )
    parser.add_argument(
        "--lineup-root",
        type=Path,
        default=ROOT / "data-private" / "lineups" / "mlb",
    )
    parser.add_argument(
        "--report",
        type=Path,
        default=ROOT / "data-migration" / "reports" / "validate_mlb_lineups_raw_to_typed_2026-06-02.json",
    )
    args = parser.parse_args()
    if not args.source_db.is_absolute():
        args.source_db = ROOT / args.source_db
    if not args.lineup_root.is_absolute():
        args.lineup_root = ROOT / args.lineup_root
    if not args.report.is_absolute():
        args.report = ROOT / args.report
    return args


def scalar(con: sqlite3.Connection, sql: str, params: tuple = ()) -> int:
    return int(con.execute(sql, params).fetchone()[0] or 0)


def validate(args: argparse.Namespace) -> dict:
    board_path = args.lineup_root / f"{args.date}-lineup-board.json"
    expected_games = None
    expected_lineups = None
    raw_slot_count = None
    expected_complete_slots = None
    if board_path.exists():
        try:
            payload = json.loads(board_path.read_text(encoding="utf-8"))
            meta = payload.get("meta") or {}
            boards = payload.get("lineupBoardsByGameId") or {}
            expected_games = int(meta.get("gameCount") or len(boards) or 0)
            expected_lineups = expected_games * 2 if expected_games else 0
            raw_slot_count = 0
            expected_complete_slots = expected_games * 2 * 9 if expected_games else 0
            for board in boards.values():
                for side in ("away", "home"):
                    lineup = ((board.get(side) or {}).get("lineup") or []) if isinstance(board, dict) else []
                    raw_slot_count += len(lineup)
        except (OSError, json.JSONDecodeError, ValueError):
            expected_games = None
            expected_lineups = None
            raw_slot_count = None
            expected_complete_slots = None

    local_path = str(board_path.relative_to(ROOT))
    report = {
        "generated_at": utc_now(),
        "script": "data-migration/scripts/validate_mlb_lineups_raw_to_typed.py",
        "source_db": str(args.source_db.relative_to(ROOT)),
        "date": args.date,
        "board_path": local_path,
        "expected_game_count": expected_games,
        "expected_lineup_count": expected_lineups,
        "raw_slot_count": raw_slot_count,
        "expected_complete_slot_count": expected_complete_slots,
        "source_snapshots": {},
        "fetch_status": {},
        "counts": {},
        "checks": [],
        "ok": True,
    }

    with sqlite3.connect(args.source_db) as con:
        con.row_factory = sqlite3.Row
        lineup_snapshot_ids = [
            row["source_snapshot_id"]
            for row in con.execute(
                """
                select source_snapshot_id
                from source_snapshots
                where sport='mlb' and source_name=? and source_date=? and local_path=?
                """,
                (SOURCE_LINEUPS, args.date, local_path),
            ).fetchall()
        ]
        probable_snapshot_ids = [
            row["source_snapshot_id"]
            for row in con.execute(
                """
                select source_snapshot_id
                from source_snapshots
                where sport='mlb' and source_name=? and source_date=? and local_path=?
                """,
                (SOURCE_PROBABLES, args.date, local_path),
            ).fetchall()
        ]
        report["source_snapshots"] = {
            SOURCE_LINEUPS: len(lineup_snapshot_ids),
            SOURCE_PROBABLES: len(probable_snapshot_ids),
        }

        for source_name in (SOURCE_LINEUPS, SOURCE_PROBABLES):
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

        lineup_snapshot_placeholders = ",".join("?" for _ in lineup_snapshot_ids) or "null"
        lineup_params = tuple(lineup_snapshot_ids)
        if lineup_snapshot_ids:
            lineup_count = scalar(
                con,
                f"select count(*) from lineups where source_snapshot_id in ({lineup_snapshot_placeholders})",
                lineup_params,
            )
            slot_count = scalar(
                con,
                f"""
                select count(*)
                from lineup_slots slots
                join lineups lineups on lineups.lineup_id = slots.lineup_id
                where lineups.source_snapshot_id in ({lineup_snapshot_placeholders})
                """,
                lineup_params,
            )
            orphan_slots = scalar(
                con,
                f"""
                select count(*)
                from lineup_slots slots
                left join lineups lineups on lineups.lineup_id = slots.lineup_id
                where lineups.lineup_id is null
                """,
            )
        else:
            lineup_count = 0
            slot_count = 0
            orphan_slots = scalar(
                con,
                "select count(*) from lineup_slots slots left join lineups lineups on lineups.lineup_id = slots.lineup_id where lineups.lineup_id is null",
            )

        matchup_count = scalar(
            con,
            """
            select count(*)
            from lineup_matchup_snapshots
            where source_table='data-private/lineups/mlb/lineup-board' and source_pk like ?
            """,
            (f"{args.date}:%",),
        )
        matchup_missing_pitcher = scalar(
            con,
            """
            select count(*)
            from lineup_matchup_snapshots
            where source_table='data-private/lineups/mlb/lineup-board'
              and source_pk like ?
              and opposing_pitcher_id is null
            """,
            (f"{args.date}:%",),
        )
        games_with_lineups = scalar(
            con,
            f"""
            select count(distinct game_id)
            from lineups
            where source_snapshot_id in ({lineup_snapshot_placeholders})
            """,
            lineup_params,
        ) if lineup_snapshot_ids else 0
        probables = scalar(
            con,
            """
            select count(*)
            from starting_pitchers sp
            join games g on g.game_id = sp.game_id
            where g.game_date like ? and sp.source_name=?
            """,
            (f"{args.date}%", SOURCE_PROBABLES),
        )
        report["counts"] = {
            "games_with_lineups": games_with_lineups,
            "lineups": lineup_count,
            "lineup_slots": slot_count,
            "lineup_matchup_snapshots": matchup_count,
            "lineup_matchup_missing_pitcher": matchup_missing_pitcher,
            "probable_pitchers": probables,
            "orphan_lineup_slots": orphan_slots,
        }

    def check(name: str, ok: bool, details: str) -> None:
        report["checks"].append({"name": name, "ok": bool(ok), "details": details})
        if not ok:
            report["ok"] = False

    check("lineup_source_snapshot_exists", report["source_snapshots"][SOURCE_LINEUPS] > 0, str(report["source_snapshots"]))
    check("probables_source_snapshot_exists", report["source_snapshots"][SOURCE_PROBABLES] > 0, str(report["source_snapshots"]))
    check(
        "lineup_fetch_status_present",
        (report["fetch_status"].get(SOURCE_LINEUPS) or {}).get("last_status") in {"success", "partial", "skipped_cache"},
        str(report["fetch_status"].get(SOURCE_LINEUPS)),
    )
    check(
        "probables_fetch_status_complete",
        (report["fetch_status"].get(SOURCE_PROBABLES) or {}).get("last_completeness_status") == "complete",
        str(report["fetch_status"].get(SOURCE_PROBABLES)),
    )
    check(
        "games_with_lineups_match_expected",
        expected_games is None or report["counts"]["games_with_lineups"] >= expected_games,
        f"{report['counts']['games_with_lineups']} / {expected_games}",
    )
    check(
        "lineups_two_per_game",
        expected_lineups is None or report["counts"]["lineups"] == expected_lineups,
        f"{report['counts']['lineups']} / {expected_lineups}",
    )
    check(
        "slots_match_raw_board",
        raw_slot_count is None or report["counts"]["lineup_slots"] == raw_slot_count,
        f"{report['counts']['lineup_slots']} / {raw_slot_count}",
    )
    check(
        "lineup_fetch_status_reflects_slot_coverage",
        expected_complete_slots is None
        or (
            (report["fetch_status"].get(SOURCE_LINEUPS) or {}).get("expected_item_count") == expected_complete_slots
            and (report["fetch_status"].get(SOURCE_LINEUPS) or {}).get("actual_item_count") == raw_slot_count
            and (
                (raw_slot_count >= expected_complete_slots and (report["fetch_status"].get(SOURCE_LINEUPS) or {}).get("last_completeness_status") == "complete")
                or (raw_slot_count < expected_complete_slots and (report["fetch_status"].get(SOURCE_LINEUPS) or {}).get("last_completeness_status") == "partial")
            )
        ),
        f"status={report['fetch_status'].get(SOURCE_LINEUPS)} raw={raw_slot_count} expected_complete={expected_complete_slots}",
    )
    check(
        "matchup_rows_cover_slots",
        report["counts"]["lineup_matchup_snapshots"] >= report["counts"]["lineup_slots"],
        f"{report['counts']['lineup_matchup_snapshots']} / {report['counts']['lineup_slots']}",
    )
    check(
        "probables_two_per_game",
        expected_games is None or report["counts"]["probable_pitchers"] >= expected_games * 2,
        f"{report['counts']['probable_pitchers']} / {None if expected_games is None else expected_games * 2}",
    )
    check("no_orphan_lineup_slots", report["counts"]["orphan_lineup_slots"] == 0, str(report["counts"]["orphan_lineup_slots"]))
    return report


def main() -> int:
    args = parse_args()
    report = validate(args)
    write_report(args.report, report)
    print(json.dumps(report, indent=2, sort_keys=True))
    return 0 if report["ok"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
