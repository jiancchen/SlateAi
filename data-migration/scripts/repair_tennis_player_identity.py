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

from pipeline.sources.shared.player_identity_registry import compact_json, utc_now
from pipeline.sources.tennis.normalization.player_identity_repair import repair_tennis_player_identity


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--apply", action="store_true", help="Write redirects, redirect aliases, and deactivate abbreviation stubs.")
    parser.add_argument("--report", type=Path, default=ROOT / "data-migration" / "reports" / "repair_tennis_player_identity_2026-06-02.json")
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
    db_path = ROOT / "data-private" / "warehouse" / "sports" / "tennis" / "sql-tennis.db"
    with sqlite3.connect(db_path) as con:
        con.row_factory = sqlite3.Row
        repair_report = repair_tennis_player_identity(con, apply=args.apply, dry_run=not args.apply)
    report = {
        "generated_at": utc_now(),
        "script": "data-migration/scripts/repair_tennis_player_identity.py",
        "parser_module": "pipeline/sources/tennis/normalization/player_identity_repair.py",
        "dry_run": not args.apply,
        "ok": True,
        "report": repair_report,
    }
    args.report.parent.mkdir(parents=True, exist_ok=True)
    args.report.write_text(json.dumps(report, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    if args.apply:
        append_event({
            "event_id": f"repair-tennis-player-identity-{utc_now().replace(':','-').replace('.','-')}",
            "timestamp": utc_now(),
            "phase": "G3",
            "area": "tennis_player_identity_repair",
            "source": "tennis players, entity_aliases, player_identity_registry",
            "target": "player_identity_redirects, player_identity_redirect_candidates, entity_aliases, players.active",
            "parser_module": "pipeline/sources/tennis/normalization/player_identity_repair.py",
            "migration_script": "data-migration/scripts/repair_tennis_player_identity.py",
            "validation": "pending",
            "status_from": "started",
            "status_to": "inserted",
            "report_path": str(args.report.relative_to(ROOT)),
            "checksum": None,
            "notes": json.dumps({
                "source_abbreviation_stubs": repair_report["source_abbreviation_stubs"],
                "redirect_ready": repair_report["redirect_ready"],
                "unresolved": repair_report["unresolved"],
                "policy_counts": repair_report["policy_counts"],
            }, sort_keys=True),
        })
    print(json.dumps(report, indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

