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

from pipeline.sources.shared.entity_alias_governance import classify_entity_aliases, compact_json, utc_now


def db_path_for(sport: str) -> Path:
    return ROOT / "data-private" / "warehouse" / "sports" / sport / f"sql-{sport}.db"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--sport", choices=["tennis", "mlb", "all"], default="all")
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--report", type=Path, default=ROOT / "data-migration" / "reports" / "entity_alias_governance_2026-06-02.json")
    args = parser.parse_args()
    if not args.report.is_absolute():
        args.report = ROOT / args.report
    return args


def append_event(event: dict[str, object]) -> None:
    path = ROOT / "data-migration" / "normalization_events.jsonl"
    with path.open("a", encoding="utf-8") as handle:
        handle.write(compact_json(event) + "\n")


def main() -> int:
    args = parse_args()
    sports = ["tennis", "mlb"] if args.sport == "all" else [args.sport]
    reports = []
    for sport in sports:
        with sqlite3.connect(db_path_for(sport)) as con:
            con.row_factory = sqlite3.Row
            reports.append(classify_entity_aliases(con, sport=sport, dry_run=args.dry_run))
    report = {
        "generated_at": utc_now(),
        "script": "data-migration/scripts/apply_entity_alias_governance.py",
        "parser_module": "pipeline/sources/shared/entity_alias_governance.py",
        "dry_run": args.dry_run,
        "reports": reports,
        "ok": True,
    }
    args.report.parent.mkdir(parents=True, exist_ok=True)
    args.report.write_text(json.dumps(report, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    if not args.dry_run:
        append_event({
            "event_id": f"apply-entity-alias-governance-{utc_now().replace(':','-').replace('.','-')}",
            "timestamp": utc_now(),
            "phase": "G1",
            "area": "entity_alias_governance",
            "source": "sport db entity_aliases",
            "target": "entity_alias_governance,trusted_entity_aliases",
            "parser_module": "pipeline/sources/shared/entity_alias_governance.py",
            "migration_script": "data-migration/scripts/apply_entity_alias_governance.py",
            "validation": "pending",
            "status_from": "started",
            "status_to": "inserted",
            "report_path": str(args.report.relative_to(ROOT)),
            "checksum": None,
            "notes": json.dumps({r["sport"]: r["status_counts"] for r in reports}, sort_keys=True),
        })
    print(json.dumps(report, indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
