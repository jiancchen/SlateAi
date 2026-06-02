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

from pipeline.sources.tennis.normalization.common import append_normalization_event, utc_now, write_report

SOURCE_TABLES = [
    "tennis_kalshi_market_candles",
    "tennis_kalshi_match_markets",
    "tennis_kalshi_open_orderbook_snapshots",
    "tennis_prediction_market_snapshots",
]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--date")
    parser.add_argument("--source-db", type=Path, default=ROOT / "data-private" / "warehouse" / "sports" / "tennis" / "sql-tennis.db")
    parser.add_argument("--report", type=Path, default=ROOT / "data-migration" / "reports" / "validate_tennis_market_normalization_2026-06-02.json")
    args = parser.parse_args()
    if not args.source_db.is_absolute():
        args.source_db = ROOT / args.source_db
    if not args.report.is_absolute():
        args.report = ROOT / args.report
    return args


def main() -> int:
    args = parse_args()
    placeholders = ",".join("?" for _ in SOURCE_TABLES)
    params = ["tennis", *SOURCE_TABLES]
    where = f"sport = ? and source_table in ({placeholders})"
    if args.date:
        where += " and source_date like ?"
        params.append(f"{args.date}%")
    with sqlite3.connect(args.source_db) as con:
        con.row_factory = sqlite3.Row
        source_rows = con.execute(f"select count(*) from legacy_table_rows where {where}", params).fetchone()[0]
        contracts = con.execute("select count(*) from market_contracts").fetchone()[0]
        ticks = con.execute("select count(*) from market_price_ticks").fetchone()[0]
        snapshots = con.execute("select count(*) from market_snapshots").fetchone()[0]
        orphan_contracts = con.execute(
            """
            select count(*) from market_contracts mc
            left join matches m on m.match_id = mc.match_id
            where mc.match_id is not null and m.match_id is null
            """
        ).fetchone()[0]
        orphan_ticks = con.execute(
            """
            select count(*) from market_price_ticks t
            left join market_contracts c on c.contract_id = t.contract_id
            where c.contract_id is null
            """
        ).fetchone()[0]
        mapped_contracts = con.execute("select count(*) from market_contracts where match_id is not null").fetchone()[0]
        mapped_players = con.execute("select count(*) from market_contracts where player_id is not null").fetchone()[0]
        duplicate_ticks = con.execute(
            "select count(*) from (select tick_id from market_price_ticks group by tick_id having count(*) > 1)"
        ).fetchone()[0]
        unresolved = con.execute("select count(*) from unresolved_entities where entity_type like 'tennis_market_%'").fetchone()[0]
        errors = []
        if source_rows <= 0:
            errors.append("No market source rows found.")
        if contracts <= 0:
            errors.append("No market_contracts inserted.")
        if ticks <= 0:
            errors.append("No market_price_ticks inserted.")
        if snapshots <= 0:
            errors.append("No market_snapshots inserted.")
        if orphan_contracts:
            errors.append(f"Found {orphan_contracts} market contracts with orphan matches.")
        if orphan_ticks:
            errors.append(f"Found {orphan_ticks} price ticks without contracts.")
        if duplicate_ticks:
            errors.append(f"Found {duplicate_ticks} duplicate market price tick IDs.")
        if mapped_contracts <= 0 or mapped_players <= 0:
            errors.append("No market contracts mapped to canonical matches/players.")
        report = {
            "generated_at": utc_now(),
            "script": "data-migration/scripts/validate_tennis_market_normalization.py",
            "parser_module": "pipeline/sources/tennis/normalization/markets.py",
            "source_db": str(args.source_db.relative_to(ROOT)),
            "date": args.date,
            "source_rows": source_rows,
            "market_contracts": contracts,
            "market_price_ticks": ticks,
            "market_snapshots": snapshots,
            "mapped_contracts": mapped_contracts,
            "mapped_players": mapped_players,
            "unresolved_market_entities": unresolved,
            "orphan_contracts": orphan_contracts,
            "orphan_ticks": orphan_ticks,
            "duplicate_ticks": duplicate_ticks,
            "errors": errors,
            "ok": not errors,
        }
        if not errors:
            con.execute(
                """
                insert into health_checks (
                  health_check_id, model_run_id, check_name, status,
                  expected_count, actual_count, details_json, checked_at
                ) values (?, null, 'tennis_market_normalization', 'ok', ?, ?, ?, ?)
                """,
                (
                    f"tennis-market-normalization-{utc_now().replace(':', '-').replace('.', '-')}",
                    source_rows,
                    ticks,
                    json.dumps(report, sort_keys=True),
                    utc_now(),
                ),
            )
            con.commit()
    write_report(args.report, report)
    append_normalization_event(
        ROOT,
        {
            "event_id": f"validate-tennis-markets-{utc_now().replace(':', '-').replace('.', '-')}",
            "timestamp": utc_now(),
            "phase": "N4",
            "area": "tennis_market_normalization_validation",
            "source": "sql-tennis.db:legacy_table_rows",
            "target": "sql-tennis.db:market_snapshots,market_contracts,market_price_ticks",
            "parser_module": "pipeline/sources/tennis/normalization/markets.py",
            "migration_script": "data-migration/scripts/validate_tennis_market_normalization.py",
            "validation": "passed" if report["ok"] else "; ".join(errors),
            "status_from": "inserted",
            "status_to": "validated" if report["ok"] else "blocked",
            "report_path": str(args.report.relative_to(ROOT)),
            "checksum": None,
            "notes": json.dumps({"contracts": contracts, "ticks": ticks, "snapshots": snapshots}, sort_keys=True),
        },
    )
    print(json.dumps(report, indent=2, sort_keys=True))
    return 0 if report["ok"] else 1


if __name__ == "__main__":
    raise SystemExit(main())

