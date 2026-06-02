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

from pipeline.sources.shared.player_identity_registry import compact_json, utc_now, validate_player_identity_registry


def db_path_for(sport: str) -> Path:
    return ROOT / "data-private" / "warehouse" / "sports" / sport / f"sql-{sport}.db"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--sport", choices=["tennis", "mlb", "all"], default="all")
    parser.add_argument("--report", type=Path, default=ROOT / "data-migration" / "reports" / "validate_player_identity_registry_2026-06-02.json")
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
    errors = []
    for sport in sports:
        with sqlite3.connect(db_path_for(sport)) as con:
            con.row_factory = sqlite3.Row
            sport_report = validate_player_identity_registry(con, sport=sport)
            reports.append(sport_report)
            errors.extend(f"{sport}: {error}" for error in sport_report["errors"])
    report = {
        "generated_at": utc_now(),
        "script": "data-migration/scripts/validate_player_identity_registry.py",
        "parser_module": "pipeline/sources/shared/player_identity_registry.py",
        "reports": reports,
        "errors": errors,
        "ok": not errors,
    }
    args.report.parent.mkdir(parents=True, exist_ok=True)
    args.report.write_text(json.dumps(report, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    append_event({
        "event_id": f"validate-player-identity-registry-{utc_now().replace(':','-').replace('.','-')}",
        "timestamp": utc_now(),
        "phase": "G2",
        "area": "player_identity_registry_validation",
        "source": "sport db player_identity_registry",
        "target": "identity registry health check",
        "parser_module": "pipeline/sources/shared/player_identity_registry.py",
        "migration_script": "data-migration/scripts/validate_player_identity_registry.py",
        "validation": "passed" if report["ok"] else "; ".join(errors),
        "status_from": "inserted",
        "status_to": "validated" if report["ok"] else "blocked",
        "report_path": str(args.report.relative_to(ROOT)),
        "checksum": None,
        "notes": json.dumps({r["sport"]: {"registry_count": r["registry_count"], "review_candidate_counts": r["review_candidate_counts"]} for r in reports}, sort_keys=True),
    })
    print(json.dumps(report, indent=2, sort_keys=True))
    return 0 if report["ok"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
