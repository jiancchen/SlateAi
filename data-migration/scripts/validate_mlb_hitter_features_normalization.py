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

from pipeline.sources.mlb.normalization.common import append_normalization_event, utc_now, write_report
from pipeline.sources.mlb.normalization.hitter_features import HITTER_SOURCE_TABLES


SOURCE_TO_TARGET = {
    "mlb_hitter_pitch_type_response_daily": "player_pitch_type_response_snapshots",
    "mlb_player_current_deviation_daily": "player_current_deviation_snapshots",
    "mlb_player_game_distribution_daily": "player_game_distribution_snapshots",
    "mlb_hitter_statcast_trend_snapshots": "player_statcast_snapshots",
    "mlb_hitter_statcast_game_logs": "player_statcast_game_logs",
    "mlb_hitter_classic_trend_snapshots": "player_classic_stat_snapshots",
    "mlb_hitter_opponent_context_snapshots": "player_opponent_context_snapshots",
    "mlb_hitter_state_snapshots": "player_state_snapshots",
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--date")
    parser.add_argument("--source-db", type=Path, default=ROOT / "data-private" / "warehouse" / "sports" / "mlb" / "sql-mlb.db")
    parser.add_argument("--report", type=Path, default=ROOT / "data-migration" / "reports" / "validate_mlb_hitter_features_normalization_2026-06-02.json")
    args = parser.parse_args()
    if not args.source_db.is_absolute():
        args.source_db = ROOT / args.source_db
    if not args.report.is_absolute():
        args.report = ROOT / args.report
    return args


def target_count(con: sqlite3.Connection, table: str, date: str | None) -> int:
    if not date:
        return con.execute(f"select count(*) from {table}").fetchone()[0]
    date_column = "game_date" if table == "player_statcast_game_logs" else "snapshot_date"
    return con.execute(f"select count(*) from {table} where {date_column} like ?", (f"{date}%",)).fetchone()[0]


def orphan_count(con: sqlite3.Connection, table: str) -> int:
    player_column = "player_id"
    if table == "player_pitch_type_response_snapshots":
        id_expr = "t.player_id"
    else:
        id_expr = f"t.{player_column}"
    return con.execute(
        f"""
        select count(*) from {table} t
        left join players p on p.player_id = {id_expr}
        where p.player_id is null
        """
    ).fetchone()[0]


def main() -> int:
    args = parse_args()
    placeholders = ",".join("?" for _ in HITTER_SOURCE_TABLES)
    params: list[str] = ["mlb", *HITTER_SOURCE_TABLES]
    where = f"sport = ? and source_table in ({placeholders})"
    if args.date:
        where += " and source_date like ?"
        params.append(f"{args.date}%")
    with sqlite3.connect(args.source_db) as con:
        con.row_factory = sqlite3.Row
        source_table_counts = {
            row["source_table"]: row["n"]
            for row in con.execute(
                f"""
                select source_table, count(*) as n
                from legacy_table_rows
                where {where}
                group by source_table
                """,
                params,
            ).fetchall()
        }
        source_rows = sum(source_table_counts.values())
        target_counts = {target: target_count(con, target, args.date) for target in SOURCE_TO_TARGET.values()}
        orphan_checks = {target: orphan_count(con, target) for target in SOURCE_TO_TARGET.values()}
        game_orphans = con.execute(
            """
            select count(*) from player_game_distribution_snapshots d
            left join games g on g.game_id = d.game_id
            where d.game_id is not null and g.game_id is null
            """
        ).fetchone()[0] + con.execute(
            """
            select count(*) from player_statcast_game_logs s
            left join games g on g.game_id = s.game_id
            where s.game_id is not null and g.game_id is null
            """
        ).fetchone()[0]
        unresolved = con.execute(
            """
            select count(*) from unresolved_entities
            where entity_type like 'mlb_hitter_%'
            """
        ).fetchone()[0]
        errors: list[str] = []
        if source_rows <= 0:
            errors.append("No MLB hitter feature source rows found.")
        for source_table, target_table in SOURCE_TO_TARGET.items():
            expected = source_table_counts.get(source_table, 0)
            actual = target_counts.get(target_table, 0)
            if expected and actual < expected:
                errors.append(f"{target_table} has {actual} rows, below source {source_table} count {expected}.")
        for table, count in orphan_checks.items():
            if count:
                errors.append(f"{table} has {count} orphan player references.")
        if game_orphans:
            errors.append(f"Hitter game-specific tables have {game_orphans} orphan game references.")
        report = {
            "generated_at": utc_now(),
            "script": "data-migration/scripts/validate_mlb_hitter_features_normalization.py",
            "parser_module": "pipeline/sources/mlb/normalization/hitter_features.py",
            "source_db": str(args.source_db.relative_to(ROOT)),
            "date": args.date,
            "source_rows": source_rows,
            "source_table_counts": source_table_counts,
            "target_counts": target_counts,
            "orphan_checks": orphan_checks,
            "game_orphans": game_orphans,
            "unresolved_hitter_entities": unresolved,
            "errors": errors,
            "ok": not errors,
        }
        if not errors:
            con.execute(
                """
                insert into health_checks (
                  health_check_id, model_run_id, check_name, status,
                  expected_count, actual_count, details_json, checked_at
                ) values (?, null, 'mlb_hitter_features_normalization', 'ok', ?, ?, ?, ?)
                """,
                (
                    f"mlb-hitter-features-normalization-{utc_now().replace(':', '-').replace('.', '-')}",
                    source_rows,
                    sum(target_counts.values()),
                    json.dumps(report, sort_keys=True),
                    utc_now(),
                ),
            )
            con.commit()
    write_report(args.report, report)
    append_normalization_event(
        ROOT,
        {
            "event_id": f"validate-mlb-hitter-features-{utc_now().replace(':', '-').replace('.', '-')}",
            "timestamp": utc_now(),
            "phase": "N11",
            "area": "mlb_hitter_features_normalization_validation",
            "source": "sql-mlb.db:legacy_table_rows",
            "target": "sql-mlb.db:player_* hitter feature tables",
            "parser_module": "pipeline/sources/mlb/normalization/hitter_features.py",
            "migration_script": "data-migration/scripts/validate_mlb_hitter_features_normalization.py",
            "validation": "passed" if report["ok"] else "; ".join(errors),
            "status_from": "inserted",
            "status_to": "validated" if report["ok"] else "blocked",
            "report_path": str(args.report.relative_to(ROOT)),
            "checksum": None,
            "notes": json.dumps({"source_rows": source_rows, "target_counts": target_counts, "unresolved": unresolved}, sort_keys=True),
        },
    )
    print(json.dumps(report, indent=2, sort_keys=True))
    return 0 if report["ok"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
