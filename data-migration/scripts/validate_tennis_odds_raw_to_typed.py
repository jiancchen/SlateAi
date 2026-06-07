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

from pipeline.sources.tennis.normalization.common import (
    append_normalization_event,
    compact_json,
    utc_now,
    write_report,
)


SOURCE_NAME = "tennis_odds"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--date", required=True)
    parser.add_argument(
        "--source-db",
        type=Path,
        default=ROOT / "data-private" / "warehouse" / "sports" / "tennis" / "sql-tennis.db",
    )
    parser.add_argument(
        "--report",
        type=Path,
        default=ROOT / "data-migration" / "reports" / "validate_tennis_odds_raw_to_typed_2026-06-02.json",
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
    with sqlite3.connect(args.source_db) as con:
        con.row_factory = sqlite3.Row
        source_files = scalar(
            con,
            """
            select count(*)
            from source_snapshots
            where sport = 'tennis'
              and source_name = ?
              and source_date = ?
            """,
            (SOURCE_NAME, args.date),
        )
        source_linked_snapshots = scalar(
            con,
            """
            select count(*)
            from market_snapshots
            where raw_source_snapshot_id in (
              select source_snapshot_id
              from source_snapshots
              where sport = 'tennis'
                and source_name = ?
                and source_date = ?
            )
            """,
            (SOURCE_NAME, args.date),
        )
        robinhood_ticks = scalar(
            con,
            """
            select count(*)
            from market_price_ticks
            where source_name = 'robinhood'
              and raw_source_snapshot_id in (
                select source_snapshot_id
                from source_snapshots
                where sport = 'tennis'
                  and source_name = ?
                  and source_date = ?
              )
            """,
            (SOURCE_NAME, args.date),
        )
        robinhood_contracts = scalar(
            con,
            """
            select count(*)
            from market_contracts mc
            join matches m on m.match_id = mc.match_id
            where mc.source_name = 'robinhood'
              and m.match_date = ?
            """,
            (args.date,),
        )
        draftkings_snapshots = scalar(
            con,
            """
            select count(*)
            from market_snapshots
            where source_name = 'draftkings'
              and raw_source_snapshot_id in (
                select source_snapshot_id
                from source_snapshots
                where sport = 'tennis'
                  and source_name = ?
                  and source_date = ?
              )
            """,
            (SOURCE_NAME, args.date),
        )
        fanduel_snapshots = scalar(
            con,
            """
            select count(*)
            from market_snapshots
            where source_name = 'fanduel'
              and raw_source_snapshot_id in (
                select source_snapshot_id
                from source_snapshots
                where sport = 'tennis'
                  and source_name = ?
                  and source_date = ?
              )
            """,
            (SOURCE_NAME, args.date),
        )
        fanduel_market_types = con.execute(
            """
            select market_type, count(*) as row_count
            from market_snapshots
            where source_name = 'fanduel'
              and raw_source_snapshot_id in (
                select source_snapshot_id
                from source_snapshots
                where sport = 'tennis'
                  and source_name = ?
                  and source_date = ?
              )
            group by market_type
            order by market_type
            """,
            (SOURCE_NAME, args.date),
        ).fetchall()
        status = con.execute(
            """
            select *
            from source_fetch_status
            where sport = 'tennis'
              and source_name = ?
              and source_date = ?
            """,
            (SOURCE_NAME, args.date),
        ).fetchone()
        health = con.execute(
            """
            select *
            from health_checks
            where health_check_id = ?
            """,
            (f"tennis-odds-raw-to-typed:{args.date}",),
        ).fetchone()
        duplicate_contracts = scalar(
            con,
            """
            select count(*)
            from (
              select contract_id
              from market_contracts
              group by contract_id
              having count(*) > 1
            )
            """,
        )
        duplicate_ticks = scalar(
            con,
            """
            select count(*)
            from (
              select tick_id
              from market_price_ticks
              group by tick_id
              having count(*) > 1
            )
            """,
        )
        duplicate_snapshots = scalar(
            con,
            """
            select count(*)
            from (
              select market_snapshot_id
              from market_snapshots
              group by market_snapshot_id
              having count(*) > 1
            )
            """,
        )
        orphan_snapshots = scalar(
            con,
            """
            select count(*)
            from market_snapshots ms
            left join matches m on m.match_id = ms.match_id
            left join players p on p.player_id = ms.player_id
            where ms.raw_source_snapshot_id in (
              select source_snapshot_id
              from source_snapshots
              where sport = 'tennis'
                and source_name = ?
                and source_date = ?
            )
              and (m.match_id is null or (ms.player_id is not null and p.player_id is null))
            """,
            (SOURCE_NAME, args.date),
        )
        open_unresolved = scalar(
            con,
            """
            select count(*)
            from unresolved_entities
            where source_name in ('robinhood', 'fanduel')
              and status = 'open'
            """,
        )

    errors = []
    warnings = []
    if source_files <= 0:
        errors.append("No dated tennis odds source snapshots found.")
    if source_linked_snapshots <= 0:
        errors.append("No tennis odds market_snapshots linked to dated source snapshots.")
    if draftkings_snapshots <= 0:
        errors.append("No DraftKings market snapshots linked to dated source snapshots.")
    if robinhood_ticks <= 0:
        errors.append("No Robinhood market ticks linked to dated source snapshots.")
    if robinhood_contracts <= 0:
        errors.append("No Robinhood contracts linked to dated matches.")
    if fanduel_snapshots <= 0:
        warnings.append("No FanDuel market snapshots linked to dated source snapshots.")
    if status is None:
        errors.append("Missing source_fetch_status for tennis_odds date.")
    elif status["last_status"] not in {"success", "partial", "skipped_cache"}:
        errors.append(f"Blocking source_fetch_status: {status['last_status']}")
    if health is None:
        errors.append("Missing health_checks row for tennis odds raw-to-typed adapter.")
    elif health["status"] != "ok":
        errors.append(f"Blocking health check status: {health['status']}")
    if duplicate_contracts != 0:
        errors.append(f"Duplicate market contract IDs: {duplicate_contracts}")
    if duplicate_ticks != 0:
        errors.append(f"Duplicate market tick IDs: {duplicate_ticks}")
    if duplicate_snapshots != 0:
        errors.append(f"Duplicate market snapshot IDs: {duplicate_snapshots}")
    if orphan_snapshots != 0:
        errors.append(f"Orphan dated odds market snapshots: {orphan_snapshots}")

    return {
        "generated_at": utc_now(),
        "script": "data-migration/scripts/validate_tennis_odds_raw_to_typed.py",
        "source_db": str(args.source_db.relative_to(ROOT)),
        "date": args.date,
        "source_files": source_files,
        "source_linked_market_snapshots": source_linked_snapshots,
        "draftkings_snapshots": draftkings_snapshots,
        "robinhood_contracts_for_date": robinhood_contracts,
        "robinhood_ticks": robinhood_ticks,
        "fanduel_snapshots": fanduel_snapshots,
        "fanduel_market_types": [dict(row) for row in fanduel_market_types],
        "source_fetch_status": dict(status) if status else None,
        "health_check": dict(health) if health else None,
        "duplicate_contracts": duplicate_contracts,
        "duplicate_ticks": duplicate_ticks,
        "duplicate_snapshots": duplicate_snapshots,
        "orphan_snapshots": orphan_snapshots,
        "open_odds_unresolved": open_unresolved,
        "ok": not errors,
        "errors": errors,
        "warnings": warnings,
    }


def main() -> int:
    args = parse_args()
    report = validate(args)
    write_report(args.report, report)
    append_normalization_event(
        ROOT,
        {
            "event_id": f"validate-phase9c-tennis-odds-raw-to-typed-{args.date}-{utc_now().replace(':', '-').replace('.', '-')}",
            "timestamp": utc_now(),
            "phase": "9C",
            "area": "tennis_odds_raw_to_typed_validation",
            "source": "sql-tennis.db:source_snapshots:tennis_odds",
            "target": "sql-tennis.db:market_contracts,market_price_ticks,market_snapshots,source_fetch_status",
            "parser_module": "pipeline/sources/tennis/normalization/markets.py",
            "migration_script": "data-migration/scripts/validate_tennis_odds_raw_to_typed.py",
            "validation": "passed" if report["ok"] and not report["warnings"] else "passed with warnings" if report["ok"] else "; ".join(report["errors"]),
            "status_from": "inserted",
            "status_to": "validated" if report["ok"] else "blocked",
            "report_path": str(args.report.relative_to(ROOT)),
            "checksum": None,
            "notes": compact_json(
                {
                    "source_files": report["source_files"],
                    "snapshots": report["source_linked_market_snapshots"],
                    "draftkings_snapshots": report["draftkings_snapshots"],
                    "robinhood_ticks": report["robinhood_ticks"],
                    "fanduel_snapshots": report["fanduel_snapshots"],
                    "warnings": report["warnings"],
                }
            ),
        },
    )
    print(json.dumps(report, indent=2, sort_keys=True))
    return 0 if report["ok"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
