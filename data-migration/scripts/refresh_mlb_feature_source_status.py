#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import sqlite3
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[2]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from pipeline.sources.mlb.normalization.common import append_normalization_event, compact_json, utc_now, write_report


FEATURE_FAMILIES: dict[str, dict[str, Any]] = {
    "mlb_pitcher_features": {
        "family": "pitcher-features",
        "ttl_hours": 12,
        "tables": {
            "pitcher_first_inning_profiles": "snapshot_date",
            "pitcher_mistake_shape_snapshots": "snapshot_date",
            "pitcher_pitch_mix_snapshots": "snapshot_date",
            "starter_leash_profiles": "snapshot_date",
            "starter_third_time_penalty_profiles": "snapshot_date",
            "starting_pitcher_form_snapshots": "snapshot_date",
        },
        "minimum_actual": 1,
    },
    "mlb_bullpen_features": {
        "family": "bullpen-features",
        "ttl_hours": 12,
        "tables": {
            "bullpen_mistake_shape_snapshots": "snapshot_date",
            "bullpen_usage_snapshots": "snapshot_date",
            "likely_relief_chains": "snapshot_date",
            "reliever_command_profiles": "snapshot_date",
            "team_bullpen_shape_snapshots": "snapshot_date",
        },
        "minimum_actual": 1,
    },
    "mlb_team_features": {
        "family": "team-features",
        "ttl_hours": 12,
        "tables": {
            "team_first_inning_profiles": "snapshot_date",
            "team_form_carryover_profiles": "snapshot_date",
            "team_lead_surrender_profiles": "snapshot_date",
            "team_mistake_shape_snapshots": "snapshot_date",
            "team_opponent_quality_snapshots": "snapshot_date",
            "team_rolling_form_snapshots": "snapshot_date",
            "team_state_snapshots": "snapshot_date",
            "team_whiff_persistence_profiles": "snapshot_date",
        },
        "minimum_actual": 1,
    },
    "mlb_environment": {
        "family": "environment",
        "ttl_hours": 3,
        "tables": {
            "game_sun_visibility_snapshots": "game_date",
            "game_visibility_outcomes": "game_date",
        },
        "minimum_actual": 1,
    },
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--date", required=True)
    parser.add_argument("--family", choices=("all", *FEATURE_FAMILIES.keys()), default="all")
    parser.add_argument(
        "--source-db",
        type=Path,
        default=ROOT / "data-private" / "warehouse" / "sports" / "mlb" / "sql-mlb.db",
    )
    parser.add_argument(
        "--report",
        type=Path,
        default=ROOT / "data-migration" / "reports" / "refresh_mlb_feature_source_status_2026-06-02.json",
    )
    args = parser.parse_args()
    if not args.source_db.is_absolute():
        args.source_db = ROOT / args.source_db
    if not args.report.is_absolute():
        args.report = ROOT / args.report
    return args


def cache_valid_until(now_iso: str, ttl_hours: float) -> str:
    try:
        now = datetime.fromisoformat(now_iso.replace("Z", "+00:00"))
    except ValueError:
        now = datetime.now(timezone.utc)
    return (now + timedelta(hours=ttl_hours)).isoformat()


def count_table(con: sqlite3.Connection, table: str, date_column: str, date: str) -> int:
    return int(con.execute(f'select count(*) from "{table}" where "{date_column}" like ?', (f"{date}%",)).fetchone()[0] or 0)


def refresh_family(
    con: sqlite3.Connection,
    *,
    source_name: str,
    config: dict[str, Any],
    date: str,
    report_path: Path,
) -> dict[str, Any]:
    now = utc_now()
    table_counts = {table: count_table(con, table, date_column, date) for table, date_column in config["tables"].items()}
    actual = sum(table_counts.values())
    minimum = int(config.get("minimum_actual") or 1)
    status = "success" if actual >= minimum else "missing"
    completeness = "complete" if status == "success" else "missing"
    run_id = f"source-fetch-{source_name}-{date}-{now.replace(':', '-').replace('.', '-')}"
    details = {
        "adapter": "mlb_feature_source_status_refresh",
        "report_path": str(report_path.relative_to(ROOT)),
        "table_counts": table_counts,
        "minimum_actual": minimum,
    }
    con.execute(
        """
        insert into source_fetch_runs (
          source_fetch_run_id, sport, source_name, source_family, source_date,
          run_reason, requested_url, cache_status, cache_ttl_hours, previous_success_at,
          status, completeness_status, expected_item_count, actual_item_count,
          missing_item_count, source_snapshot_id, started_at, finished_at,
          error_code, error_message, details_json
        ) values (?, 'mlb', ?, ?, ?, 'typed_feature_status', null, 'not_applicable', ?,
          (select last_success_at from source_fetch_status where sport='mlb' and source_name=? and source_date=?),
          ?, ?, null, ?, null, null, ?, ?, null, null, ?)
        """,
        (
            run_id,
            source_name,
            config["family"],
            date,
            config["ttl_hours"],
            source_name,
            date,
            status,
            completeness,
            actual,
            now,
            now,
            compact_json(details),
        ),
    )
    con.execute(
        """
        insert into source_fetch_status (
          source_fetch_status_id, sport, source_name, source_family, source_date,
          last_fetch_run_id, last_attempt_at, last_success_at, last_status,
          last_completeness_status, cache_valid_until, expected_item_count,
          actual_item_count, missing_item_count, unresolved_count, updated_at, notes
        ) values (?, 'mlb', ?, ?, ?, ?, ?, ?, ?, ?, ?, null, ?, null, 0, ?, ?)
        on conflict (sport, source_name, source_date) do update set
          source_family = excluded.source_family,
          last_fetch_run_id = excluded.last_fetch_run_id,
          last_attempt_at = excluded.last_attempt_at,
          last_success_at = excluded.last_success_at,
          last_status = excluded.last_status,
          last_completeness_status = excluded.last_completeness_status,
          cache_valid_until = excluded.cache_valid_until,
          expected_item_count = excluded.expected_item_count,
          actual_item_count = excluded.actual_item_count,
          missing_item_count = excluded.missing_item_count,
          unresolved_count = excluded.unresolved_count,
          updated_at = excluded.updated_at,
          notes = excluded.notes
        """,
        (
            f"mlb:{source_name}:{date}",
            source_name,
            config["family"],
            date,
            run_id,
            now,
            now if status == "success" else None,
            status,
            completeness,
            cache_valid_until(now, config["ttl_hours"]),
            actual,
            now,
            compact_json(details),
        ),
    )
    con.execute(
        """
        insert into health_checks (
          health_check_id, model_run_id, check_name, status, expected_count,
          actual_count, details_json, checked_at
        ) values (?, null, ?, ?, ?, ?, ?, ?)
        on conflict(health_check_id) do update set
          status = excluded.status,
          expected_count = excluded.expected_count,
          actual_count = excluded.actual_count,
          details_json = excluded.details_json,
          checked_at = excluded.checked_at
        """,
        (
            f"mlb-feature-source-status:{source_name}:{date}",
            f"mlb_feature_source_status:{source_name}:{date}",
            "ok" if status == "success" else "warn",
            minimum,
            actual,
            compact_json(details),
            now,
        ),
    )
    return {"source_name": source_name, "status": status, "actual_item_count": actual, "table_counts": table_counts}


def main() -> int:
    args = parse_args()
    selected = FEATURE_FAMILIES if args.family == "all" else {args.family: FEATURE_FAMILIES[args.family]}
    report = {
        "generated_at": utc_now(),
        "script": "data-migration/scripts/refresh_mlb_feature_source_status.py",
        "source_db": str(args.source_db.relative_to(ROOT)),
        "date": args.date,
        "families": {},
        "ok": True,
    }
    with sqlite3.connect(args.source_db) as con:
        con.row_factory = sqlite3.Row
        for source_name, config in selected.items():
            report["families"][source_name] = refresh_family(
                con,
                source_name=source_name,
                config=config,
                date=args.date,
                report_path=args.report,
            )
        con.commit()
    report["ok"] = all(row["status"] == "success" for row in report["families"].values())
    write_report(args.report, report)
    append_normalization_event(
        ROOT,
        {
            "event_id": f"phase9e-mlb-feature-source-status-{args.date}-{utc_now().replace(':', '-').replace('.', '-')}",
            "timestamp": utc_now(),
            "phase": "9E",
            "area": "mlb_feature_source_status",
            "source": "sql-mlb.db typed feature tables",
            "target": "sql-mlb.db:source_fetch_status,source_fetch_runs,health_checks",
            "parser_module": "none",
            "migration_script": "data-migration/scripts/refresh_mlb_feature_source_status.py",
            "validation": "refreshed source-family status rows" if report["ok"] else "one or more missing feature families",
            "status_from": "not_started",
            "status_to": "validated" if report["ok"] else "blocked",
            "report_path": str(args.report.relative_to(ROOT)),
            "checksum": None,
            "notes": compact_json({source: row["actual_item_count"] for source, row in report["families"].items()}),
        },
    )
    print(json.dumps(report, indent=2, sort_keys=True))
    return 0 if report["ok"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
