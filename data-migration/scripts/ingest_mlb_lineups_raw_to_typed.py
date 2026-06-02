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
from pipeline.sources.mlb.normalization.lineup_board import (
    FAMILY_LINEUPS,
    FAMILY_PROBABLES,
    SOURCE_LINEUPS,
    SOURCE_PROBABLES,
    insert_health_check,
    load_lineup_board_day,
    upsert_fetch_status,
    upsert_lineup_board,
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
        "--lineup-root",
        type=Path,
        default=ROOT / "data-private" / "lineups" / "mlb",
    )
    parser.add_argument(
        "--report",
        type=Path,
        default=ROOT / "data-migration" / "reports" / "ingest_mlb_lineups_raw_to_typed_2026-06-02.json",
    )
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()
    if not args.source_db.is_absolute():
        args.source_db = ROOT / args.source_db
    if not args.lineup_root.is_absolute():
        args.lineup_root = ROOT / args.lineup_root
    if not args.report.is_absolute():
        args.report = ROOT / args.report
    return args


def table_counts(con: sqlite3.Connection) -> dict[str, int]:
    tables = [
        "source_snapshots",
        "source_fetch_runs",
        "source_fetch_status",
        "health_checks",
        "players",
        "starting_pitchers",
        "lineups",
        "lineup_slots",
        "lineup_matchup_snapshots",
        "unresolved_entities",
    ]
    return {
        table: int(con.execute(f'select count(*) from "{table}"').fetchone()[0] or 0)
        for table in tables
    }


def diff_counts(before: dict[str, int], after: dict[str, int]) -> dict[str, int]:
    return {table: after.get(table, 0) - before.get(table, 0) for table in sorted(set(before) | set(after))}


def dry_run_report(args: argparse.Namespace, raw_day) -> dict:
    boards = raw_day.boards
    lineup_count = 0
    player_count = 0
    probable_count = 0
    for board in boards.values():
        for side in ("away", "home"):
            side_payload = board.get(side) or {}
            lineup = side_payload.get("lineup") or []
            lineup_count += 1 if lineup else 0
            player_count += len(lineup)
            probable_count += 1 if side_payload.get("opposingStarter") else 0
    return {
        "source_files": 1 if raw_day.board_path else 0,
        "source_snapshot_id": None,
        "probables_source_snapshot_id": None,
        "games": len(boards),
        "lineups": lineup_count,
        "lineup_slots": player_count,
        "lineup_matchup_snapshots": player_count,
        "probable_pitchers": probable_count,
        "players": player_count,
        "unresolved_games": 0,
        "unresolved_players": 0,
    }


def expected_lineup_slots(raw_day) -> int | None:
    if not raw_day.board_path:
        return None
    game_count = int(raw_day.meta.get("gameCount") or len(raw_day.boards) or 0)
    if game_count <= 0:
        return None
    return game_count * 2 * 9


def ingest(args: argparse.Namespace) -> dict:
    raw_day = load_lineup_board_day(args.lineup_root, args.date)
    expected_games = int(raw_day.meta.get("gameCount") or len(raw_day.boards) or 0) if raw_day.board_path else None
    expected_slots = expected_lineup_slots(raw_day)
    report = {
        "generated_at": utc_now(),
        "script": "data-migration/scripts/ingest_mlb_lineups_raw_to_typed.py",
        "source_db": str(args.source_db.relative_to(ROOT)),
        "lineup_root": str(args.lineup_root.relative_to(ROOT)),
        "date": args.date,
        "dry_run": args.dry_run,
        "expected_game_count": expected_games,
        "expected_lineup_slot_count": expected_slots,
        "board_path": None if raw_day.board_path is None else str(raw_day.board_path.relative_to(ROOT)),
        "lineup_board": {
            "source_files": 0,
            "source_snapshot_id": None,
            "probables_source_snapshot_id": None,
            "games": 0,
            "lineups": 0,
            "lineup_slots": 0,
            "lineup_matchup_snapshots": 0,
            "probable_pitchers": 0,
            "players": 0,
            "unresolved_games": 0,
            "unresolved_players": 0,
        },
        "row_count_delta": {},
        "ok": True,
        "errors": [],
    }

    if args.dry_run:
        report["lineup_board"] = dry_run_report(args, raw_day)
        return report

    with sqlite3.connect(args.source_db) as con:
        con.row_factory = sqlite3.Row
        before = table_counts(con)
        try:
            report["lineup_board"] = upsert_lineup_board(con, raw_day=raw_day, repo_root=ROOT)
            lineup_actual = int(report["lineup_board"].get("lineup_slots") or 0)
            probable_actual = int(report["lineup_board"].get("probable_pitchers") or 0) // 2
            unresolved_count = int(report["lineup_board"].get("unresolved_games") or 0) + int(
                report["lineup_board"].get("unresolved_players") or 0
            )
            upsert_fetch_status(
                con,
                source_name=SOURCE_LINEUPS,
                source_family=FAMILY_LINEUPS,
                date=args.date,
                expected=expected_slots,
                actual=lineup_actual,
                report_path=args.report,
                repo_root=ROOT,
                ttl_hours=12,
                notes={
                    "source_snapshot_id": report["lineup_board"].get("source_snapshot_id"),
                    "games": report["lineup_board"].get("games"),
                    "lineups": report["lineup_board"].get("lineups"),
                    "lineup_slots": report["lineup_board"].get("lineup_slots"),
                    "expected_lineup_slots": expected_slots,
                    "lineup_matchup_snapshots": report["lineup_board"].get("lineup_matchup_snapshots"),
                    "unresolved_count": unresolved_count,
                },
            )
            upsert_fetch_status(
                con,
                source_name=SOURCE_PROBABLES,
                source_family=FAMILY_PROBABLES,
                date=args.date,
                expected=expected_games,
                actual=probable_actual,
                report_path=args.report,
                repo_root=ROOT,
                ttl_hours=6,
                notes={
                    "source_snapshot_id": report["lineup_board"].get("probables_source_snapshot_id"),
                    "source_kind": "lineup_board_opposing_starters",
                    "probable_pitcher_rows": report["lineup_board"].get("probable_pitchers"),
                    "unresolved_count": int(report["lineup_board"].get("unresolved_games") or 0),
                },
            )
            health_status = "ok" if lineup_actual and (expected_slots is None or lineup_actual >= expected_slots) else "warn"
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
    report = ingest(args)
    write_report(args.report, report)
    append_normalization_event(
        ROOT,
        {
            "event_id": f"phase9c-mlb-lineups-raw-to-typed-{args.date}-{utc_now().replace(':', '-').replace('.', '-')}",
            "timestamp": utc_now(),
            "phase": "9C",
            "area": "mlb_lineups_raw_to_typed",
            "source": "data-private/lineups/mlb",
            "target": "sql-mlb.db:lineups,lineup_slots,lineup_matchup_snapshots,starting_pitchers,source_fetch_status",
            "parser_module": "pipeline/sources/mlb/normalization/lineup_board.py",
            "migration_script": "data-migration/scripts/ingest_mlb_lineups_raw_to_typed.py",
            "validation": "dry-run" if args.dry_run else "inserted" if report["ok"] else "; ".join(report["errors"]),
            "status_from": "not_started",
            "status_to": "parsed" if args.dry_run else "inserted" if report["ok"] else "blocked",
            "report_path": str(args.report.relative_to(ROOT)),
            "checksum": None,
            "notes": compact_json(
                {
                    "date": args.date,
                    "games": report["lineup_board"].get("games"),
                    "lineups": report["lineup_board"].get("lineups"),
                    "slots": report["lineup_board"].get("lineup_slots"),
                    "matchup_snapshots": report["lineup_board"].get("lineup_matchup_snapshots"),
                    "probable_pitcher_rows": report["lineup_board"].get("probable_pitchers"),
                }
            ),
        },
    )
    print(json.dumps(report, indent=2, sort_keys=True))
    return 0 if report["ok"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
