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
from pipeline.sources.tennis.normalization.context import normalize_context


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--date")
    parser.add_argument("--source-db", type=Path, default=ROOT / "data-private" / "warehouse" / "sports" / "tennis" / "sql-tennis.db")
    parser.add_argument("--report", type=Path, default=ROOT / "data-migration" / "reports" / "normalize_tennis_context_2026-06-02.json")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()
    if not args.source_db.is_absolute():
        args.source_db = ROOT / args.source_db
    if not args.report.is_absolute():
        args.report = ROOT / args.report
    return args


def main() -> int:
    args = parse_args()
    with sqlite3.connect(args.source_db) as con:
        con.row_factory = sqlite3.Row
        report = normalize_context(con, date=args.date, dry_run=args.dry_run)
    report.update(
        {
            "generated_at": utc_now(),
            "script": "data-migration/scripts/normalize_tennis_context.py",
            "parser_module": "pipeline/sources/tennis/normalization/context.py",
            "source_db": str(args.source_db.relative_to(ROOT)),
            "ok": True,
        }
    )
    write_report(args.report, report)
    if not args.dry_run:
        append_normalization_event(
            ROOT,
            {
                "event_id": f"normalize-tennis-context-{utc_now().replace(':', '-').replace('.', '-')}",
                "timestamp": utc_now(),
                "phase": "N5",
                "area": "tennis_context_normalization",
                "source": "legacy_table_rows:tennis_player_match_context,tennis_recent_form_metrics,tennis_h2h_snapshots,tennis_match_weather",
                "target": "sql-tennis.db:player_form_snapshots,match_context_snapshots,entity_aliases,unresolved_entities",
                "parser_module": "pipeline/sources/tennis/normalization/context.py",
                "migration_script": "data-migration/scripts/normalize_tennis_context.py",
                "validation": "pending",
                "status_from": "started",
                "status_to": "inserted",
                "report_path": str(args.report.relative_to(ROOT)),
                "checksum": None,
                "notes": json.dumps(
                    {
                        "inserted_player_form_snapshots": report["inserted_player_form_snapshots"],
                        "inserted_match_context_snapshots": report["inserted_match_context_snapshots"],
                        "unresolved_rows_added": report["unresolved_rows_added"],
                    },
                    sort_keys=True,
                ),
            },
        )
    print(json.dumps(report, indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

