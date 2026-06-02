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
from pipeline.sources.mlb.normalization.results import RESULT_SOURCE_TABLES


TARGET_TABLES = [
    "game_outcomes",
    "team_game_stats",
    "player_game_batting",
    "batter_game_outcomes",
    "pitcher_appearances",
    "starting_pitcher_game_logs",
    "home_run_events",
    "phase_outcomes",
]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--date")
    parser.add_argument("--source-db", type=Path, default=ROOT / "data-private" / "warehouse" / "sports" / "mlb" / "sql-mlb.db")
    parser.add_argument("--report", type=Path, default=ROOT / "data-migration" / "reports" / "validate_mlb_results_normalization_2026-06-02.json")
    args = parser.parse_args()
    if not args.source_db.is_absolute():
        args.source_db = ROOT / args.source_db
    if not args.report.is_absolute():
        args.report = ROOT / args.report
    return args


def count_source_rows(con: sqlite3.Connection, date: str | None) -> tuple[int, dict[str, int]]:
    placeholders = ",".join("?" for _ in RESULT_SOURCE_TABLES)
    params: list[str] = ["mlb", *RESULT_SOURCE_TABLES]
    where = f"sport = ? and source_table in ({placeholders})"
    if date:
        where += " and source_date like ?"
        params.append(f"{date}%")
    total = con.execute(f"select count(*) from legacy_table_rows where {where}", params).fetchone()[0]
    rows = con.execute(
        f"""
        select source_table, count(*) as n
        from legacy_table_rows
        where {where}
        group by source_table
        """,
        params,
    ).fetchall()
    return total, {row["source_table"]: row["n"] for row in rows}


def table_count(con: sqlite3.Connection, table: str, date: str | None) -> int:
    if not date:
        return con.execute(f"select count(*) from {table}").fetchone()[0]
    if table == "game_outcomes":
        return con.execute(
            """
            select count(*)
            from game_outcomes go
            join games g on g.game_id = go.game_id
            where g.game_date like ?
            """,
            (f"{date}%",),
        ).fetchone()[0]
    return con.execute(f"select count(*) from {table} where game_date like ?", (f"{date}%",)).fetchone()[0]


def main() -> int:
    args = parse_args()
    with sqlite3.connect(args.source_db) as con:
        con.row_factory = sqlite3.Row
        source_rows, source_table_counts = count_source_rows(con, args.date)
        target_counts = {table: table_count(con, table, args.date) for table in TARGET_TABLES}
        orphan_checks = {
            "team_game_stats": con.execute(
                """
                select count(*) from team_game_stats t
                left join games g on g.game_id = t.game_id
                left join teams tm on tm.team_id = t.team_id
                where g.game_id is null or tm.team_id is null
                """
            ).fetchone()[0],
            "player_game_batting": con.execute(
                """
                select count(*) from player_game_batting p
                left join games g on g.game_id = p.game_id
                left join players pl on pl.player_id = p.player_id
                where g.game_id is null or pl.player_id is null
                """
            ).fetchone()[0],
            "batter_game_outcomes": con.execute(
                """
                select count(*) from batter_game_outcomes b
                left join games g on g.game_id = b.game_id
                left join players pl on pl.player_id = b.player_id
                where g.game_id is null or pl.player_id is null
                """
            ).fetchone()[0],
            "pitcher_appearances": con.execute(
                """
                select count(*) from pitcher_appearances p
                left join games g on g.game_id = p.game_id
                left join players pl on pl.player_id = p.pitcher_id
                where g.game_id is null or pl.player_id is null
                """
            ).fetchone()[0],
            "starting_pitcher_game_logs": con.execute(
                """
                select count(*) from starting_pitcher_game_logs s
                left join games g on g.game_id = s.game_id
                left join players pl on pl.player_id = s.pitcher_id
                where g.game_id is null or pl.player_id is null
                """
            ).fetchone()[0],
            "home_run_events": con.execute(
                """
                select count(*) from home_run_events h
                left join games g on g.game_id = h.game_id
                where g.game_id is null
                """
            ).fetchone()[0],
            "phase_outcomes": con.execute(
                """
                select count(*) from phase_outcomes p
                left join games g on g.game_id = p.game_id
                left join teams tm on tm.team_id = p.team_id
                where g.game_id is null or tm.team_id is null
                """
            ).fetchone()[0],
        }
        unresolved = con.execute(
            """
            select count(*) from unresolved_entities
            where entity_type like 'mlb_result_%'
            """
        ).fetchone()[0]
        errors: list[str] = []
        if source_rows <= 0:
            errors.append("No MLB results source rows found.")
        for source_table, expected_target in {
            "mlb_game_outcomes": "game_outcomes",
            "mlb_game_team_stats": "team_game_stats",
            "mlb_player_game_batting": "player_game_batting",
            "mlb_batter_game_outcomes": "batter_game_outcomes",
            "mlb_pitcher_appearances": "pitcher_appearances",
            "mlb_starting_pitcher_game_logs": "starting_pitcher_game_logs",
            "mlb_home_run_events": "home_run_events",
            "mlb_phase_outcomes_daily": "phase_outcomes",
        }.items():
            expected = source_table_counts.get(source_table, 0)
            actual = target_counts.get(expected_target, 0)
            if expected and actual < expected:
                errors.append(f"{expected_target} has {actual} rows, below source {source_table} count {expected}.")
        for table, orphan_count in orphan_checks.items():
            if orphan_count:
                errors.append(f"{table} has {orphan_count} orphan canonical references.")
        report = {
            "generated_at": utc_now(),
            "script": "data-migration/scripts/validate_mlb_results_normalization.py",
            "parser_module": "pipeline/sources/mlb/normalization/results.py",
            "source_db": str(args.source_db.relative_to(ROOT)),
            "date": args.date,
            "source_rows": source_rows,
            "source_table_counts": source_table_counts,
            "target_counts": target_counts,
            "orphan_checks": orphan_checks,
            "unresolved_result_entities": unresolved,
            "errors": errors,
            "ok": not errors,
        }
        if not errors:
            con.execute(
                """
                insert into health_checks (
                  health_check_id, model_run_id, check_name, status,
                  expected_count, actual_count, details_json, checked_at
                ) values (?, null, 'mlb_results_normalization', 'ok', ?, ?, ?, ?)
                """,
                (
                    f"mlb-results-normalization-{utc_now().replace(':', '-').replace('.', '-')}",
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
            "event_id": f"validate-mlb-results-{utc_now().replace(':', '-').replace('.', '-')}",
            "timestamp": utc_now(),
            "phase": "N9",
            "area": "mlb_results_normalization_validation",
            "source": "sql-mlb.db:legacy_table_rows",
            "target": "sql-mlb.db:game_outcomes,team_game_stats,player_game_batting,batter_game_outcomes,pitcher_appearances,starting_pitcher_game_logs,home_run_events,phase_outcomes",
            "parser_module": "pipeline/sources/mlb/normalization/results.py",
            "migration_script": "data-migration/scripts/validate_mlb_results_normalization.py",
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
