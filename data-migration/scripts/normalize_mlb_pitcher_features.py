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
from pipeline.sources.mlb.normalization.pitcher_features import normalize_pitcher_features


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--date")
    parser.add_argument("--source-db", type=Path, default=ROOT / "data-private" / "warehouse" / "sports" / "mlb" / "sql-mlb.db")
    parser.add_argument("--report", type=Path, default=ROOT / "data-migration" / "reports" / "normalize_mlb_pitcher_features_2026-06-02.json")
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
        report = normalize_pitcher_features(con, date=args.date, dry_run=args.dry_run)
    report.update(
        {
            "generated_at": utc_now(),
            "script": "data-migration/scripts/normalize_mlb_pitcher_features.py",
            "parser_module": "pipeline/sources/mlb/normalization/pitcher_features.py",
            "source_db": str(args.source_db.relative_to(ROOT)),
            "ok": True,
        }
    )
    write_report(args.report, report)
    if not args.dry_run:
        append_normalization_event(
            ROOT,
            {
                "event_id": f"normalize-mlb-pitcher-features-{utc_now().replace(':', '-').replace('.', '-')}",
                "timestamp": utc_now(),
                "phase": "N12",
                "area": "mlb_pitcher_features_normalization",
                "source": "legacy_table_rows:mlb_pitcher_*,mlb_starter_*,mlb_starting_pitcher_*",
                "target": "sql-mlb.db:pitcher_* and starter_* feature tables",
                "parser_module": "pipeline/sources/mlb/normalization/pitcher_features.py",
                "migration_script": "data-migration/scripts/normalize_mlb_pitcher_features.py",
                "validation": "pending",
                "status_from": "started",
                "status_to": "inserted",
                "report_path": str(args.report.relative_to(ROOT)),
                "checksum": None,
                "notes": json.dumps(
                    {
                        "source_rows": report["source_rows"],
                        "parsed_rows": report["parsed_rows"],
                        "inserted": report["inserted"],
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
