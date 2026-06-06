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

from pipeline.sources.mlb.normalization.common import append_normalization_event, compact_json, utc_now, write_report  # noqa: E402


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
        default=ROOT / "data-migration" / "reports" / "validate_mlb_markets_props_raw_to_typed_2026-05-31.json",
    )
    args = parser.parse_args()
    if not args.source_db.is_absolute():
        args.source_db = ROOT / args.source_db
    if not args.report.is_absolute():
        args.report = ROOT / args.report
    return args


def sql_path(path: Path) -> str:
    return str(path.relative_to(ROOT))


def scalar(con: sqlite3.Connection, sql: str, params: tuple[Any, ...] = ()) -> int:
    return int(con.execute(sql, params).fetchone()[0] or 0)


def source_status(con: sqlite3.Connection, source_name: str, date: str) -> dict[str, Any] | None:
    row = con.execute(
        """
        select source_name, source_date, last_status, last_completeness_status,
               actual_item_count, missing_item_count, unresolved_count, notes
        from source_fetch_status
        where sport='mlb' and source_name=? and source_date=?
        """,
        (source_name, date),
    ).fetchone()
    return None if row is None else dict(row)


def validate(args: argparse.Namespace) -> dict[str, Any]:
    with sqlite3.connect(args.source_db) as con:
        con.row_factory = sqlite3.Row
        source_snapshots = scalar(
            con,
            "select count(*) from source_snapshots where sport='mlb' and source_name='mlb_odds' and source_date=?",
            (args.date,),
        )
        direct_market_snapshots = scalar(
            con,
            """
            select count(*)
            from market_snapshots
            where source_name='fanduel_research'
              and substr(coalesce(captured_at, ''), 1, 10)=?
            """,
            (args.date,),
        )
        dated_market_snapshots = scalar(
            con,
            """
            select count(*)
            from market_snapshots ms
            join source_snapshots ss on ss.source_snapshot_id=ms.raw_source_snapshot_id
            where ss.sport='mlb' and ss.source_name='mlb_odds' and ss.source_date=?
            """,
            (args.date,),
        )
        direct_mapped_snapshot_games = scalar(
            con,
            """
            select count(*)
            from market_snapshots
            where source_name='fanduel_research'
              and substr(coalesce(captured_at, ''), 1, 10)=?
              and game_id is not null
            """,
            (args.date,),
        )
        dated_contracts = scalar(
            con,
            """
            select count(*)
            from market_contracts
            where source_table in ('raw_draftkings_mlb_markets', 'raw_kalshi_mlb_markets', 'raw_robinhood_mlb_markets')
              and source_pk like ?
            """,
            (f"%{args.date}%",),
        )
        dated_ticks = scalar(
            con,
            """
            select count(*)
            from market_price_ticks
            where source_table in ('raw_draftkings_mlb_markets', 'raw_kalshi_mlb_markets', 'raw_robinhood_mlb_markets')
              and source_pk like ?
            """,
            (f"%{args.date}%",),
        )
        mapped_snapshot_games = scalar(
            con,
            """
            select count(*)
            from market_snapshots ms
            join source_snapshots ss on ss.source_snapshot_id=ms.raw_source_snapshot_id
            where ss.sport='mlb' and ss.source_name='mlb_odds' and ss.source_date=?
              and ms.game_id is not null
            """,
            (args.date,),
        )
        draftkings_game_line_games = scalar(
            con,
            """
            select count(distinct contracts.game_id)
            from market_contracts contracts
            join games g on g.game_id=contracts.game_id
            where g.game_date like ?
              and contracts.source_name='draftkings'
              and contracts.market_type in ('winner', 'total')
            """,
            (f"{args.date}%",),
        )
        draftkings_first5_games = scalar(
            con,
            """
            select count(distinct contracts.game_id)
            from market_contracts contracts
            join games g on g.game_id=contracts.game_id
            where g.game_date like ?
              and contracts.source_name='draftkings'
              and contracts.market_type in ('first5Winner', 'first5Total')
            """,
            (f"{args.date}%",),
        )
        orphan_snapshot_games = scalar(
            con,
            """
            select count(*)
            from market_snapshots ms
            join source_snapshots ss on ss.source_snapshot_id=ms.raw_source_snapshot_id
            left join games g on g.game_id=ms.game_id
            where ss.sport='mlb' and ss.source_name='mlb_odds' and ss.source_date=?
              and ms.game_id is not null and g.game_id is null
            """,
            (args.date,),
        )
        prop_rows = scalar(
            con,
            """
            select count(*)
            from prop_market_snapshots
            where substr(coalesce(market_date, captured_at, ''), 1, 10)=?
            """,
            (args.date,),
        )
        mapped_prop_players = scalar(
            con,
            """
            select count(*)
            from prop_market_snapshots
            where substr(coalesce(market_date, captured_at, ''), 1, 10)=?
              and player_id is not null
            """,
            (args.date,),
        )
        orphan_prop_players = scalar(
            con,
            """
            select count(*)
            from prop_market_snapshots p
            left join players pl on pl.player_id=p.player_id
            where substr(coalesce(p.market_date, p.captured_at, ''), 1, 10)=?
              and p.player_id is not null and pl.player_id is null
            """,
            (args.date,),
        )
        draftkings_pitcher_strikeout_prop_rows = scalar(
            con,
            """
            select count(*)
            from prop_market_snapshots
            where substr(coalesce(market_date, captured_at, ''), 1, 10)=?
              and source_name='draftkings'
              and market_key='pitcher_strikeouts'
            """,
            (args.date,),
        )
        mapped_draftkings_pitcher_strikeout_prop_players = scalar(
            con,
            """
            select count(*)
            from prop_market_snapshots
            where substr(coalesce(market_date, captured_at, ''), 1, 10)=?
              and source_name='draftkings'
              and market_key='pitcher_strikeouts'
              and player_id is not null
            """,
            (args.date,),
        )
        odds_status = source_status(con, "mlb_odds", args.date)
        props_status = source_status(con, "mlb_props", args.date)
        errors: list[str] = []
        has_direct_market_snapshots = direct_market_snapshots > 0
        if source_snapshots <= 0 and not has_direct_market_snapshots:
            errors.append("No dated MLB odds source snapshots registered.")
        if dated_market_snapshots <= 0 and not has_direct_market_snapshots:
            errors.append("No dated market_snapshots linked to MLB odds source snapshots.")
        if dated_contracts <= 0 and not has_direct_market_snapshots:
            errors.append("No dated raw-market contracts inserted.")
        if dated_ticks <= 0 and not has_direct_market_snapshots:
            errors.append("No dated raw-market price ticks inserted.")
        if mapped_snapshot_games <= 0 and direct_mapped_snapshot_games <= 0:
            errors.append("No dated market snapshots mapped to games.")
        if draftkings_game_line_games <= 0:
            errors.append("No DraftKings full-game ML/total markets mapped to games.")
        if draftkings_first5_games <= 0:
            errors.append("No DraftKings first-five ML/total markets mapped to games.")
        if orphan_snapshot_games:
            errors.append(f"{orphan_snapshot_games} dated market snapshots reference missing games.")
        if prop_rows <= 0:
            errors.append("No prop_market_snapshots for date.")
        if mapped_prop_players <= 0:
            errors.append("No dated prop snapshots mapped to players.")
        if draftkings_pitcher_strikeout_prop_rows <= 0:
            errors.append("No DraftKings pitcher strikeout prop snapshots for date.")
        if mapped_draftkings_pitcher_strikeout_prop_players <= 0:
            errors.append("No DraftKings pitcher strikeout prop snapshots mapped to players.")
        if orphan_prop_players:
            errors.append(f"{orphan_prop_players} dated prop snapshots reference missing players.")
        if not odds_status:
            errors.append("Missing source_fetch_status for mlb_odds.")
        elif odds_status["last_status"] != "success":
            errors.append(f"mlb_odds status is {odds_status['last_status']}.")
        if not props_status:
            errors.append("Missing source_fetch_status for mlb_props.")
        elif props_status["last_status"] != "success":
            errors.append(f"mlb_props status is {props_status['last_status']}.")
        report = {
            "generated_at": utc_now(),
            "script": "data-migration/scripts/validate_mlb_markets_props_raw_to_typed.py",
            "source_db": sql_path(args.source_db),
            "date": args.date,
            "source_snapshots": source_snapshots,
            "direct_market_snapshots": direct_market_snapshots,
            "dated_market_snapshots": dated_market_snapshots,
            "dated_contracts": dated_contracts,
            "dated_ticks": dated_ticks,
            "mapped_snapshot_games": mapped_snapshot_games,
            "draftkings_game_line_games": draftkings_game_line_games,
            "draftkings_first5_games": draftkings_first5_games,
            "direct_mapped_snapshot_games": direct_mapped_snapshot_games,
            "orphan_snapshot_games": orphan_snapshot_games,
            "prop_rows": prop_rows,
            "mapped_prop_players": mapped_prop_players,
            "orphan_prop_players": orphan_prop_players,
            "draftkings_pitcher_strikeout_prop_rows": draftkings_pitcher_strikeout_prop_rows,
            "mapped_draftkings_pitcher_strikeout_prop_players": mapped_draftkings_pitcher_strikeout_prop_players,
            "odds_status": odds_status,
            "props_status": props_status,
            "errors": errors,
            "ok": not errors,
        }
        con.execute(
            """
            insert into health_checks (
              health_check_id, model_run_id, check_name, status, expected_count,
              actual_count, details_json, checked_at
            ) values (?, null, ?, ?, ?, ?, ?, ?)
            on conflict(health_check_id) do update set
              status = excluded.status,
              expected_count = excluded.expected_count,
              actual_count = excluded.actual_count,
              details_json = excluded.details_json,
              checked_at = excluded.checked_at
            """,
            (
                f"mlb-markets-props-raw-to-typed-validation:{args.date}",
                f"mlb_markets_props_raw_to_typed_validation:{args.date}",
                "ok" if report["ok"] else "blocked",
                source_snapshots,
                dated_market_snapshots + prop_rows,
                compact_json(report),
                utc_now(),
            ),
        )
        con.commit()
    write_report(args.report, report)
    append_normalization_event(
        ROOT,
        {
            "event_id": f"validate-phase9f-mlb-markets-props-raw-to-typed-{args.date}-{utc_now().replace(':', '-').replace('.', '-')}",
            "timestamp": utc_now(),
            "phase": "9F",
            "area": "mlb_markets_props_raw_to_typed_validation",
            "source": "sql-mlb.db:source_snapshots:mlb_odds + prop_market_snapshots",
            "target": "sql-mlb.db:market_contracts,market_price_ticks,market_snapshots,prop_market_snapshots,source_fetch_status",
            "parser_module": "pipeline/sources/mlb/normalization/market_raw_context.py",
            "migration_script": "data-migration/scripts/validate_mlb_markets_props_raw_to_typed.py",
            "validation": "passed" if report["ok"] else "; ".join(errors),
            "status_from": "inserted",
            "status_to": "validated" if report["ok"] else "blocked",
            "report_path": sql_path(args.report),
            "checksum": None,
            "notes": compact_json(
                {
                    "market_snapshots": dated_market_snapshots,
                    "contracts": dated_contracts,
                    "ticks": dated_ticks,
                    "prop_rows": prop_rows,
                    "draftkings_pitcher_strikeout_prop_rows": draftkings_pitcher_strikeout_prop_rows,
                }
            ),
        },
    )
    return report


def main() -> int:
    args = parse_args()
    report = validate(args)
    print(json.dumps({k: report[k] for k in ["date", "dated_market_snapshots", "prop_rows", "draftkings_pitcher_strikeout_prop_rows", "ok"]}, sort_keys=True))
    return 0 if report["ok"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
