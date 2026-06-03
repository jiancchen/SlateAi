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
from pipeline.sources.mlb.normalization.player_raw_context import (
    FAMILY_PLAYER_CONTEXT,
    FAMILY_SAVANT,
    SOURCE_PLAYER_CONTEXT,
    SOURCE_SAVANT,
    insert_health_check,
    upsert_fetch_status,
    upsert_player_context_day,
    upsert_savant_day,
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
        "--savant-root",
        type=Path,
        default=ROOT / "data-private" / "raw" / "baseballsavant",
    )
    parser.add_argument(
        "--stats-api-root",
        type=Path,
        default=ROOT / "data-private" / "raw" / "mlb-stats-api",
    )
    parser.add_argument(
        "--report",
        type=Path,
        default=ROOT / "data-migration" / "reports" / "ingest_mlb_player_context_raw_to_typed_2026-06-02.json",
    )
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--skip-savant", action="store_true", help="Skip Baseball Savant hitter Statcast files.")
    parser.add_argument("--skip-player-context", action="store_true", help="Skip MLB Stats API player career/profile files.")
    args = parser.parse_args()
    for key in ("source_db", "savant_root", "stats_api_root", "report"):
        value = getattr(args, key)
        if not value.is_absolute():
            setattr(args, key, ROOT / value)
    return args


def table_counts(con: sqlite3.Connection) -> dict[str, int]:
    tables = [
        "source_snapshots",
        "source_fetch_runs",
        "source_fetch_status",
        "health_checks",
        "players",
        "player_statcast_game_logs",
        "player_identity_profiles",
        "player_career_profiles",
        "unresolved_entities",
    ]
    return {table: int(con.execute(f'select count(*) from "{table}"').fetchone()[0] or 0) for table in tables}


def diff_counts(before: dict[str, int], after: dict[str, int]) -> dict[str, int]:
    return {table: after.get(table, 0) - before.get(table, 0) for table in sorted(set(before) | set(after))}


def dry_run_counts(args: argparse.Namespace) -> tuple[dict[str, int], dict[str, int]]:
    import csv

    savant_dir = args.savant_root / "hitter-statcast" / args.date
    grouped_path = savant_dir / "grouped.csv"
    details_path = savant_dir / "details.csv"
    grouped_rows = 0
    details_rows = 0
    if grouped_path.exists() and grouped_path.stat().st_size > 3:
        with grouped_path.open(encoding="utf-8-sig", newline="") as handle:
            grouped_rows = sum(1 for _ in csv.DictReader(handle))
    if details_path.exists() and details_path.stat().st_size > 3:
        with details_path.open(encoding="utf-8-sig", newline="") as handle:
            details_rows = sum(1 for _ in csv.DictReader(handle))

    profile_dir = args.stats_api_root / "hitter-career-profiles" / args.date
    source_files = 0
    people = 0
    if profile_dir.exists():
        for path in profile_dir.glob("profiles-*.json"):
            source_files += 1
            try:
                people += len(json.loads(path.read_text(encoding="utf-8")).get("people") or [])
            except (OSError, json.JSONDecodeError):
                pass
    return (
        {"source_files": int(grouped_path.exists()) + int(details_path.exists()), "grouped_rows": grouped_rows, "details_rows": details_rows},
        {"source_files": source_files, "people": people},
    )


def ingest(args: argparse.Namespace) -> dict:
    report = {
        "generated_at": utc_now(),
        "script": "data-migration/scripts/ingest_mlb_player_context_raw_to_typed.py",
        "source_db": str(args.source_db.relative_to(ROOT)),
        "date": args.date,
        "dry_run": args.dry_run,
        "skip_savant": args.skip_savant,
        "skip_player_context": args.skip_player_context,
        "savant": {"source_files": 0, "grouped_rows": 0, "details_rows": 0, "game_logs": 0, "players": 0, "unresolved": 0},
        "player_context": {"source_files": 0, "people": 0, "identity_profiles": 0, "career_profiles": 0, "unresolved": 0},
        "expected_context_items": None,
        "row_count_delta": {},
        "ok": True,
        "errors": [],
    }
    if args.dry_run:
        savant, context = dry_run_counts(args)
        if args.skip_savant:
            report["savant"]["skipped"] = True
        else:
            report["savant"].update(savant)
        if args.skip_player_context:
            report["player_context"]["skipped"] = True
        else:
            report["player_context"].update(context)
        report["expected_context_items"] = (
            (0 if args.skip_savant else int(savant.get("grouped_rows") or 0))
            + (0 if args.skip_player_context else int(context.get("people") or 0))
        )
        return report

    with sqlite3.connect(args.source_db) as con:
        con.row_factory = sqlite3.Row
        before = table_counts(con)
        try:
            if args.skip_savant:
                report["savant"]["skipped"] = True
            else:
                report["savant"] = upsert_savant_day(con, repo_root=ROOT, savant_root=args.savant_root, date=args.date)
                upsert_fetch_status(
                    con,
                    source_name=SOURCE_SAVANT,
                    source_family=FAMILY_SAVANT,
                    date=args.date,
                    expected=None,
                    actual=int(report["savant"].get("game_logs") or 0),
                    report_path=args.report,
                    repo_root=ROOT,
                    ttl_hours=24,
                    notes={
                        "source_snapshot_id": (report["savant"].get("source_snapshot_ids") or [None])[0],
                        "source_files": report["savant"].get("source_files"),
                        "grouped_rows": report["savant"].get("grouped_rows"),
                        "details_rows": report["savant"].get("details_rows"),
                        "unresolved_count": report["savant"].get("unresolved"),
                    },
                )
            if args.skip_player_context:
                report["player_context"]["skipped"] = True
            else:
                report["player_context"] = upsert_player_context_day(con, repo_root=ROOT, stats_api_root=args.stats_api_root, date=args.date)
                upsert_fetch_status(
                    con,
                    source_name=SOURCE_PLAYER_CONTEXT,
                    source_family=FAMILY_PLAYER_CONTEXT,
                    date=args.date,
                    expected=None,
                    actual=int(report["player_context"].get("identity_profiles") or 0),
                    report_path=args.report,
                    repo_root=ROOT,
                    ttl_hours=24,
                    notes={
                        "source_snapshot_id": (report["player_context"].get("source_snapshot_ids") or [None])[0],
                        "source_files": report["player_context"].get("source_files"),
                        "people": report["player_context"].get("people"),
                        "career_profiles": report["player_context"].get("career_profiles"),
                        "unresolved_count": report["player_context"].get("unresolved"),
                    },
                )
        except Exception as exc:
            con.rollback()
            report["ok"] = False
            report["errors"].append(str(exc))
            raise
        else:
            after = table_counts(con)
            report["row_count_delta"] = diff_counts(before, after)
            report["expected_context_items"] = (
                (0 if args.skip_savant else int(report["savant"].get("game_logs") or 0))
                + (0 if args.skip_player_context else int(report["player_context"].get("identity_profiles") or 0))
            )
            enabled_counts = []
            if not args.skip_savant:
                enabled_counts.append(report["savant"].get("game_logs"))
            if not args.skip_player_context:
                enabled_counts.append(report["player_context"].get("identity_profiles"))
            health_status = "ok" if enabled_counts and all(enabled_counts) else "warn"
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
            "event_id": f"phase9d-mlb-player-context-raw-to-typed-{args.date}-{utc_now().replace(':', '-').replace('.', '-')}",
            "timestamp": utc_now(),
            "phase": "9D",
            "area": "mlb_player_context_raw_to_typed",
            "source": "data-private/raw/baseballsavant + data-private/raw/mlb-stats-api",
            "target": "sql-mlb.db:player_statcast_game_logs,player_identity_profiles,player_career_profiles,source_fetch_status",
            "parser_module": "pipeline/sources/mlb/normalization/player_raw_context.py",
            "migration_script": "data-migration/scripts/ingest_mlb_player_context_raw_to_typed.py",
            "validation": "dry-run" if args.dry_run else "inserted" if report["ok"] else "; ".join(report["errors"]),
            "status_from": "not_started",
            "status_to": "parsed" if args.dry_run else "inserted" if report["ok"] else "blocked",
            "report_path": str(args.report.relative_to(ROOT)),
            "checksum": None,
            "notes": compact_json(
                {
                    "date": args.date,
                    "skip_savant": args.skip_savant,
                    "skip_player_context": args.skip_player_context,
                    "savant_game_logs": report["savant"].get("game_logs"),
                    "identity_profiles": report["player_context"].get("identity_profiles"),
                    "career_profiles": report["player_context"].get("career_profiles"),
                }
            ),
        },
    )
    print(json.dumps(report, indent=2, sort_keys=True))
    return 0 if report["ok"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
