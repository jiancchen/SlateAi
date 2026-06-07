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

from pipeline.sources.tennis.normalization.common import append_normalization_event, compact_json, utc_now, write_report
from pipeline.sources.tennis.normalization.stats import build_tennislive_service_pressure, insert_service_pressure


DEFAULT_DB = ROOT / "data-private" / "warehouse" / "sports" / "tennis" / "sql-tennis.db"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Promote TennisLive match_stat_rows into service_pressure_snapshots."
    )
    parser.add_argument("--date", help="Limit source match stat rows to matches played on this date.")
    parser.add_argument("--slate-date", help="Limit source stat rows to players on this slate date.")
    parser.add_argument("--player-id", action="append", default=[], help="Limit to one or more canonical player IDs.")
    parser.add_argument("--source-db", type=Path, default=DEFAULT_DB)
    parser.add_argument(
        "--report",
        type=Path,
        default=ROOT / "data-migration" / "reports" / "promote_tennis_tennislive_pressure.json",
    )
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()
    if not args.source_db.is_absolute():
        args.source_db = ROOT / args.source_db
    if not args.report.is_absolute():
        args.report = ROOT / args.report
    return args


def sql_path(path: Path) -> str:
    return str(path.relative_to(ROOT))


def count(con: sqlite3.Connection, query: str, params: tuple[Any, ...] = ()) -> int:
    return int(con.execute(query, params).fetchone()[0] or 0)


def slate_player_ids(con: sqlite3.Connection, slate_date: str | None) -> set[str]:
    if not slate_date:
        return set()
    return {
        str(row["player_id"])
        for row in con.execute(
            """
            select distinct mp.player_id
            from match_players mp
            join matches m on m.match_id = mp.match_id
            where m.match_date = ?
              and mp.player_id is not null
            """,
            (slate_date,),
        ).fetchall()
    }


def load_tennislive_stat_rows(
    con: sqlite3.Connection,
    *,
    date: str | None,
    player_ids: set[str],
) -> list[sqlite3.Row]:
    where = ["msr.source_name = 'tennislive'"]
    params: list[Any] = []
    if date:
        where.append("m.match_date = ?")
        params.append(date)
    if player_ids:
        placeholders = ",".join("?" for _ in player_ids)
        where.append(
            f"""
            msr.match_id in (
              select distinct match_id
              from match_stat_rows
              where source_name = 'tennislive'
                and player_id in ({placeholders})
            )
            """
        )
        params.extend(sorted(player_ids))
    return con.execute(
        f"""
        select
          msr.stat_row_id,
          msr.match_id,
          msr.player_id,
          msr.source_name,
          msr.stat_name,
          msr.stat_value,
          msr.stat_made,
          msr.stat_attempts,
          msr.stat_text,
          msr.period,
          msr.source_snapshot_id,
          m.match_date,
          m.surface
        from match_stat_rows msr
        left join matches m on m.match_id = msr.match_id
        where {' and '.join(where)}
        order by msr.match_id, msr.player_id, msr.stat_name
        """,
        params,
    ).fetchall()


def source_snapshot_samples(con: sqlite3.Connection, snapshots: list[dict[str, Any]], limit: int = 12) -> list[dict[str, Any]]:
    snapshot_ids = sorted(
        {
            snapshot_id
            for snapshot in snapshots
            for snapshot_id in snapshot.get("source_snapshot_ids", [])
            if snapshot_id
        }
    )[:limit]
    if not snapshot_ids:
        return []
    placeholders = ",".join("?" for _ in snapshot_ids)
    return [
        dict(row)
        for row in con.execute(
            f"""
            select source_snapshot_id, source_name, source_url, local_path, status
            from source_snapshots
            where source_snapshot_id in ({placeholders})
            order by source_snapshot_id
            """,
            snapshot_ids,
        ).fetchall()
    ]


def slate_pressure_summary(con: sqlite3.Connection, slate_date: str | None) -> dict[str, int]:
    if not slate_date:
        return {}
    return {
        "slate_players": count(
            con,
            """
            select count(distinct mp.player_id)
            from match_players mp
            join matches m on m.match_id = mp.match_id
            where m.match_date = ?
            """,
            (slate_date,),
        ),
        "slate_players_with_tennislive_stats": count(
            con,
            """
            select count(distinct mp.player_id)
            from match_players mp
            join matches m on m.match_id = mp.match_id
            join match_stat_rows msr on msr.player_id = mp.player_id and msr.source_name = 'tennislive'
            where m.match_date = ?
            """,
            (slate_date,),
        ),
        "slate_players_with_tennislive_pressure": count(
            con,
            """
            select count(distinct mp.player_id)
            from match_players mp
            join matches m on m.match_id = mp.match_id
            join service_pressure_snapshots sps
              on sps.player_id = mp.player_id
             and sps.source_name = 'tennislive'
            where m.match_date = ?
            """,
            (slate_date,),
        ),
    }


def promote(args: argparse.Namespace) -> dict[str, Any]:
    with sqlite3.connect(args.source_db) as con:
        con.row_factory = sqlite3.Row
        con.execute("pragma foreign_keys = on")
        con.execute("begin")

        selected_player_ids = set(args.player_id or [])
        selected_player_ids.update(slate_player_ids(con, args.slate_date))

        before_pressure = count(con, "select count(*) from service_pressure_snapshots")
        before_tennislive_pressure = count(
            con,
            "select count(*) from service_pressure_snapshots where source_name = 'tennislive'",
        )
        before_slate_summary = slate_pressure_summary(con, args.slate_date)

        rows = load_tennislive_stat_rows(con, date=args.date, player_ids=selected_player_ids)
        all_snapshots = build_tennislive_service_pressure(rows)
        snapshots = [
            snapshot
            for snapshot in all_snapshots
            if not selected_player_ids or snapshot["player_id"] in selected_player_ids
        ]
        upserted = 0
        if not args.dry_run:
            upserted = insert_service_pressure(con, snapshots)

        after_pressure = count(con, "select count(*) from service_pressure_snapshots")
        after_tennislive_pressure = count(
            con,
            "select count(*) from service_pressure_snapshots where source_name = 'tennislive'",
        )
        after_slate_summary = slate_pressure_summary(con, args.slate_date)

        report = {
            "generated_at": utc_now(),
            "script": "data-migration/scripts/promote_tennis_tennislive_pressure.py",
            "parser_module": "pipeline/sources/tennis/normalization/stats.py",
            "source_db": sql_path(args.source_db),
            "date": args.date,
            "slate_date": args.slate_date,
            "player_id_filters": sorted(args.player_id or []),
            "selected_player_ids": len(selected_player_ids),
            "dry_run": args.dry_run,
            "source_stat_rows": len(rows),
            "source_player_matches_loaded": len({(row["match_id"], row["player_id"]) for row in rows}),
            "source_player_matches_selected": len(
                {
                    (snapshot["match_id"], snapshot["player_id"])
                    for snapshot in snapshots
                }
            ),
            "service_pressure_rows": len(snapshots),
            "upserted_service_pressure_rows": upserted,
            "players_with_pressure": len({snapshot["player_id"] for snapshot in snapshots}),
            "matches_with_pressure": len({snapshot["match_id"] for snapshot in snapshots}),
            "before_counts": {
                "service_pressure_snapshots": before_pressure,
                "tennislive_service_pressure_snapshots": before_tennislive_pressure,
                **before_slate_summary,
            },
            "after_counts": {
                "service_pressure_snapshots": after_pressure,
                "tennislive_service_pressure_snapshots": after_tennislive_pressure,
                **after_slate_summary,
            },
            "row_count_delta": {
                "service_pressure_snapshots": after_pressure - before_pressure,
                "tennislive_service_pressure_snapshots": after_tennislive_pressure - before_tennislive_pressure,
            },
            "sample_pressure_snapshots": [
                {
                    key: snapshot.get(key)
                    for key in [
                        "pressure_snapshot_id",
                        "player_id",
                        "match_id",
                        "snapshot_date",
                        "surface",
                        "hold_pct",
                        "break_pct",
                        "bp_saved_made",
                        "bp_saved_attempts",
                        "bp_saved_pct",
                        "bp_converted_made",
                        "bp_converted_attempts",
                        "bp_converted_pct",
                        "source_snapshot_ids",
                    ]
                }
                for snapshot in snapshots[:8]
            ],
            "sample_source_snapshots": source_snapshot_samples(con, snapshots),
            "ok": len(rows) > 0 and len(snapshots) > 0,
        }

        if args.dry_run:
            con.rollback()
        else:
            con.commit()
            append_normalization_event(
                ROOT,
                {
                    "event_id": f"phase3-tennislive-pressure-{utc_now().replace(':', '-').replace('.', '-')}",
                    "timestamp": utc_now(),
                    "phase": "3",
                    "area": "tennislive_pressure_promotion",
                    "source": "sql-tennis.db:match_stat_rows(source_name=tennislive)",
                    "target": "sql-tennis.db:service_pressure_snapshots",
                    "parser_module": "pipeline/sources/tennis/normalization/stats.py",
                    "migration_script": "data-migration/scripts/promote_tennis_tennislive_pressure.py",
                    "validation": "pending",
                    "status_from": "started",
                    "status_to": "inserted",
                    "report_path": sql_path(args.report),
                    "checksum": None,
                    "notes": compact_json(
                        {
                            "date": args.date,
                            "slate_date": args.slate_date,
                            "source_stat_rows": len(rows),
                            "service_pressure_rows": len(snapshots),
                            "upserted_service_pressure_rows": upserted,
                        }
                    ),
                },
            )
        return report


def main() -> int:
    args = parse_args()
    report = promote(args)
    write_report(args.report, report)
    print(json.dumps(report, indent=2, sort_keys=True))
    return 0 if report["ok"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
