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
    "tennis_player_match_context",
    "tennis_recent_form_metrics",
    "tennis_h2h_snapshots",
    "tennis_match_weather",
]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--date")
    parser.add_argument("--source-db", type=Path, default=ROOT / "data-private" / "warehouse" / "sports" / "tennis" / "sql-tennis.db")
    parser.add_argument("--report", type=Path, default=ROOT / "data-migration" / "reports" / "validate_tennis_context_normalization_2026-06-02.json")
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
        player_snapshots = con.execute("select count(*) from player_form_snapshots").fetchone()[0]
        match_snapshots = con.execute("select count(*) from match_context_snapshots").fetchone()[0]
        weather_snapshots = con.execute("select count(*) from match_context_snapshots where feature_family = 'weather'").fetchone()[0]
        h2h_snapshots = con.execute("select count(*) from match_context_snapshots where feature_family = 'h2h_snapshot'").fetchone()[0]
        orphan_players = con.execute(
            """
            select count(*) from player_form_snapshots fs
            left join players p on p.player_id = fs.player_id
            where p.player_id is null
            """
        ).fetchone()[0]
        orphan_matches = con.execute(
            """
            select count(*) from match_context_snapshots ms
            left join matches m on m.match_id = ms.match_id
            where m.match_id is null
            """
        ).fetchone()[0]
        duplicate_player_snapshots = con.execute(
            "select count(*) from (select form_snapshot_id from player_form_snapshots group by form_snapshot_id having count(*) > 1)"
        ).fetchone()[0]
        duplicate_match_snapshots = con.execute(
            "select count(*) from (select context_snapshot_id from match_context_snapshots group by context_snapshot_id having count(*) > 1)"
        ).fetchone()[0]
        unresolved = con.execute("select count(*) from unresolved_entities where entity_type like 'tennis_context_%'").fetchone()[0]
        errors = []
        if source_rows <= 0:
            errors.append("No context source rows found.")
        if player_snapshots <= 0:
            errors.append("No player_form_snapshots inserted.")
        if match_snapshots <= 0:
            errors.append("No match_context_snapshots inserted.")
        if weather_snapshots <= 0 or h2h_snapshots <= 0:
            errors.append("Missing weather or H2H match context snapshots.")
        if orphan_players:
            errors.append(f"Found {orphan_players} player form snapshots with orphan players.")
        if orphan_matches:
            errors.append(f"Found {orphan_matches} match context snapshots with orphan matches.")
        if duplicate_player_snapshots or duplicate_match_snapshots:
            errors.append(
                f"Duplicate context IDs found: player={duplicate_player_snapshots}, match={duplicate_match_snapshots}."
            )
        report = {
            "generated_at": utc_now(),
            "script": "data-migration/scripts/validate_tennis_context_normalization.py",
            "parser_module": "pipeline/sources/tennis/normalization/context.py",
            "source_db": str(args.source_db.relative_to(ROOT)),
            "date": args.date,
            "source_rows": source_rows,
            "player_form_snapshots": player_snapshots,
            "match_context_snapshots": match_snapshots,
            "weather_snapshots": weather_snapshots,
            "h2h_snapshots": h2h_snapshots,
            "unresolved_context_entities": unresolved,
            "orphan_players": orphan_players,
            "orphan_matches": orphan_matches,
            "duplicate_player_snapshots": duplicate_player_snapshots,
            "duplicate_match_snapshots": duplicate_match_snapshots,
            "errors": errors,
            "ok": not errors,
        }
        if not errors:
            con.execute(
                """
                insert into health_checks (
                  health_check_id, model_run_id, check_name, status,
                  expected_count, actual_count, details_json, checked_at
                ) values (?, null, 'tennis_context_normalization', 'ok', ?, ?, ?, ?)
                """,
                (
                    f"tennis-context-normalization-{utc_now().replace(':', '-').replace('.', '-')}",
                    source_rows,
                    player_snapshots + match_snapshots,
                    json.dumps(report, sort_keys=True),
                    utc_now(),
                ),
            )
            con.commit()
    write_report(args.report, report)
    append_normalization_event(
        ROOT,
        {
            "event_id": f"validate-tennis-context-{utc_now().replace(':', '-').replace('.', '-')}",
            "timestamp": utc_now(),
            "phase": "N5",
            "area": "tennis_context_normalization_validation",
            "source": "sql-tennis.db:legacy_table_rows",
            "target": "sql-tennis.db:player_form_snapshots,match_context_snapshots",
            "parser_module": "pipeline/sources/tennis/normalization/context.py",
            "migration_script": "data-migration/scripts/validate_tennis_context_normalization.py",
            "validation": "passed" if report["ok"] else "; ".join(errors),
            "status_from": "inserted",
            "status_to": "validated" if report["ok"] else "blocked",
            "report_path": str(args.report.relative_to(ROOT)),
            "checksum": None,
            "notes": json.dumps({"player_form_snapshots": player_snapshots, "match_context_snapshots": match_snapshots}, sort_keys=True),
        },
    )
    print(json.dumps(report, indent=2, sort_keys=True))
    return 0 if report["ok"] else 1


if __name__ == "__main__":
    raise SystemExit(main())

