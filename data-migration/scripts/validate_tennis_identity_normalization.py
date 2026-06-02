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

from pipeline.sources.tennis.normalization.common import append_normalization_event, normalize_name, utc_now, write_report


def last_token(value: object) -> str:
    tokens = normalize_name(value).split()
    return tokens[-1] if tokens else ""


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--source-db", type=Path, default=ROOT / "data-private" / "warehouse" / "sports" / "tennis" / "sql-tennis.db")
    parser.add_argument("--report", type=Path, default=ROOT / "data-migration" / "reports" / "validate_tennis_identity_normalization_2026-06-02.json")
    args = parser.parse_args()
    if not args.source_db.is_absolute():
        args.source_db = ROOT / args.source_db
    if not args.report.is_absolute():
        args.report = ROOT / args.report
    return args


def suspicious_aliases(con: sqlite3.Connection) -> list[dict[str, object]]:
    rows = con.execute(
        """
        select a.entity_alias_id, a.canonical_entity_id, a.source_name, a.source_display_name,
               p.name, p.canonical_name, a.confidence
        from entity_aliases a
        join players p on p.player_id = a.canonical_entity_id
        where a.entity_type = 'player'
          and a.source_display_name is not null
          and a.confidence >= 0.9
        """
    ).fetchall()
    suspicious = []
    for row in rows:
        display_last = last_token(row["source_display_name"])
        canonical_lasts = {last_token(row["name"]), last_token(row["canonical_name"])}
        if display_last and canonical_lasts and display_last not in canonical_lasts:
            suspicious.append(dict(row))
    return suspicious


def main() -> int:
    args = parse_args()
    with sqlite3.connect(args.source_db) as con:
        con.row_factory = sqlite3.Row
        unresolved_by_type_status = [
            dict(row)
            for row in con.execute(
                "select entity_type,status,count(*) as n from unresolved_entities group by entity_type,status order by entity_type,status"
            ).fetchall()
        ]
        alias_counts = [
            dict(row)
            for row in con.execute(
                "select entity_type,source_name,count(*) as n from entity_aliases group by entity_type,source_name order by entity_type,source_name"
            ).fetchall()
        ]
        orphan_aliases = {
            "player_aliases": con.execute("select count(*) from entity_aliases a left join players p on p.player_id=a.canonical_entity_id where a.entity_type='player' and p.player_id is null").fetchone()[0],
            "match_aliases": con.execute("select count(*) from entity_aliases a left join matches m on m.match_id=a.canonical_entity_id where a.entity_type='match' and m.match_id is null").fetchone()[0],
        }
        new_resolved_rows = con.execute("select count(*) from unresolved_entities where status='resolved'").fetchone()[0]
        open_rows = con.execute("select count(*) from unresolved_entities where status='open'").fetchone()[0]
        suspicious = suspicious_aliases(con)
        errors = []
        for label, count in orphan_aliases.items():
            if count:
                errors.append(f"{label} has {count} orphan references.")
        report = {
            "generated_at": utc_now(),
            "script": "data-migration/scripts/validate_tennis_identity_normalization.py",
            "parser_module": "pipeline/sources/tennis/normalization/identity.py",
            "source_db": str(args.source_db.relative_to(ROOT)),
            "resolved_unresolved_rows": new_resolved_rows,
            "open_unresolved_rows": open_rows,
            "unresolved_by_type_status": unresolved_by_type_status,
            "alias_counts": alias_counts,
            "orphan_aliases": orphan_aliases,
            "suspicious_player_alias_count": len(suspicious),
            "suspicious_player_alias_samples": suspicious[:20],
            "warnings": ["Suspicious player aliases are reported only; N22 does not delete legacy aliases."] if suspicious else [],
            "errors": errors,
            "ok": not errors,
        }
        if not errors:
            con.execute(
                "insert into health_checks (health_check_id, model_run_id, check_name, status, expected_count, actual_count, details_json, checked_at) values (?, null, 'tennis_identity_cleanup', 'ok', ?, ?, ?, ?)",
                (
                    f"tennis-identity-cleanup-{utc_now().replace(':','-').replace('.','-')}",
                    new_resolved_rows + open_rows,
                    new_resolved_rows,
                    json.dumps(report, sort_keys=True),
                    utc_now(),
                ),
            )
            con.commit()
    write_report(args.report, report)
    append_normalization_event(ROOT, {
        "event_id": f"validate-tennis-identity-{utc_now().replace(':', '-').replace('.', '-')}",
        "timestamp": utc_now(),
        "phase": "N22",
        "area": "tennis_identity_cleanup_validation",
        "source": "sql-tennis.db:entity_aliases,unresolved_entities",
        "target": "sql-tennis.db:identity health check",
        "parser_module": "pipeline/sources/tennis/normalization/identity.py",
        "migration_script": "data-migration/scripts/validate_tennis_identity_normalization.py",
        "validation": "passed" if report["ok"] else "; ".join(errors),
        "status_from": "inserted",
        "status_to": "validated" if report["ok"] else "blocked",
        "report_path": str(args.report.relative_to(ROOT)),
        "checksum": None,
        "notes": json.dumps({"resolved_unresolved_rows": new_resolved_rows, "open_unresolved_rows": open_rows, "suspicious_player_alias_count": len(suspicious)}, sort_keys=True),
    })
    print(json.dumps(report, indent=2, sort_keys=True))
    return 0 if report["ok"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
