#!/usr/bin/env python3
"""Audit tennis source fetch coverage and freshness by date."""

from __future__ import annotations

import argparse
import json
import re
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


DEFAULT_DB = Path("data-private/warehouse/sports/tennis/sql-tennis.db")
DEFAULT_JSON = Path("data-migration/reports/tennis_source_freshness.json")
DEFAULT_MARKDOWN = Path("data-migration/reports/tennis_source_freshness.md")


def connect(db_path: Path) -> sqlite3.Connection:
    con = sqlite3.connect(f"file:{db_path}?mode=ro", uri=True)
    con.row_factory = sqlite3.Row
    return con


def rows(con: sqlite3.Connection, sql: str, params: tuple[Any, ...] = ()) -> list[dict[str, Any]]:
    return [dict(row) for row in con.execute(sql, params).fetchall()]


def parse_sqlite_timestamp(value: str | None) -> datetime | None:
    if not value:
        return None
    text = str(value).strip().replace("Z", "+00:00")
    if re.match(r"^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$", text):
        text = text.replace(" ", "T") + "+00:00"
    try:
        parsed = datetime.fromisoformat(text)
    except ValueError:
        return None
    if parsed.tzinfo is None:
        return parsed.replace(tzinfo=timezone.utc)
    return parsed.astimezone(timezone.utc)


def date_list(con: sqlite3.Connection, start_date: str | None, end_date: str | None) -> list[str]:
    params: list[Any] = []
    filters = []
    if start_date:
        filters.append("date_value >= ?")
        params.append(start_date)
    if end_date:
        filters.append("date_value <= ?")
        params.append(end_date)
    where = f"where {' and '.join(filters)}" if filters else ""
    return [
        row["date_value"]
        for row in rows(
            con,
            f"""
            select distinct date_value
            from (
              select match_date as date_value from matches where match_date is not null and match_date != ''
              union
              select run_date as date_value from model_runs where sport = 'tennis'
              union
              select source_date as date_value from source_fetch_status where sport = 'tennis' and source_date is not null
            )
            {where}
            order by date_value
            """,
            tuple(params),
        )
    ]


def source_policies(con: sqlite3.Connection, include_optional: bool) -> list[dict[str, Any]]:
    optional_filter = "" if include_optional else "and required_for_prediction = 1"
    return rows(
        con,
        f"""
        select
          source_name,
          source_family,
          required_for_prediction,
          default_ttl_hours,
          max_stale_hours,
          run_rule
        from source_fetch_policies
        where sport = 'tennis'
          {optional_filter}
        order by required_for_prediction desc, source_name
        """,
    )


def source_statuses(con: sqlite3.Connection, start_date: str | None, end_date: str | None) -> dict[tuple[str, str], dict[str, Any]]:
    params: list[Any] = []
    filters = ["sport = 'tennis'", "source_date is not null"]
    if start_date:
        filters.append("source_date >= ?")
        params.append(start_date)
    if end_date:
        filters.append("source_date <= ?")
        params.append(end_date)
    return {
        (row["source_date"], row["source_name"]): row
        for row in rows(
            con,
            f"""
            select
              source_date,
              source_name,
              source_family,
              last_fetch_run_id,
              last_attempt_at,
              last_success_at,
              last_status,
              last_completeness_status,
              cache_valid_until,
              expected_item_count,
              actual_item_count,
              missing_item_count,
              unresolved_count,
              updated_at,
              notes
            from source_fetch_status
            where {' and '.join(filters)}
            order by source_date, source_name
            """,
            tuple(params),
        )
    }


def source_entry(policy: dict[str, Any], status: dict[str, Any] | None, now: datetime) -> dict[str, Any]:
    if status is None:
        return {
            "sourceName": policy["source_name"],
            "sourceFamily": policy["source_family"],
            "requiredForPrediction": bool(policy["required_for_prediction"]),
            "statusClass": "missing_status",
            "lastStatus": None,
            "lastCompletenessStatus": None,
            "lastSuccessAt": None,
            "cacheValidUntil": None,
            "actualItemCount": None,
            "missingItemCount": None,
            "unresolvedCount": None,
        }
    valid_until = parse_sqlite_timestamp(status["cache_valid_until"])
    last_status = status["last_status"]
    if last_status != "success":
        status_class = "failed_status"
    elif valid_until is None or valid_until < now:
        status_class = "stale_success"
    else:
        status_class = "fresh_success"
    return {
        "sourceName": policy["source_name"],
        "sourceFamily": policy["source_family"],
        "requiredForPrediction": bool(policy["required_for_prediction"]),
        "statusClass": status_class,
        "lastStatus": last_status,
        "lastCompletenessStatus": status["last_completeness_status"],
        "lastSuccessAt": status["last_success_at"],
        "cacheValidUntil": status["cache_valid_until"],
        "actualItemCount": status["actual_item_count"],
        "missingItemCount": status["missing_item_count"],
        "unresolvedCount": status["unresolved_count"],
    }


def row_for_date(
    date: str,
    policies: list[dict[str, Any]],
    statuses: dict[tuple[str, str], dict[str, Any]],
    now: datetime,
) -> dict[str, Any]:
    source_rows = [source_entry(policy, statuses.get((date, policy["source_name"])), now) for policy in policies]
    missing = [row["sourceName"] for row in source_rows if row["statusClass"] == "missing_status"]
    failed = [row["sourceName"] for row in source_rows if row["statusClass"] == "failed_status"]
    stale = [row["sourceName"] for row in source_rows if row["statusClass"] == "stale_success"]
    fresh = [row["sourceName"] for row in source_rows if row["statusClass"] == "fresh_success"]
    incomplete = [
        row["sourceName"]
        for row in source_rows
        if row["lastStatus"] == "success"
        and row["lastCompletenessStatus"] not in ("complete", "unknown")
    ]
    blockers = []
    warnings = []
    if missing:
        blockers.append("required_source_status_missing")
    if failed:
        blockers.append("required_source_failed")
    if stale:
        blockers.append("required_source_stale_for_current_publish")
    if incomplete:
        warnings.append("source_completeness_not_complete")
    return {
        "date": date,
        "okForCurrentPublish": not missing and not failed and not stale,
        "requiredSources": len(source_rows),
        "freshSources": len(fresh),
        "missingSources": missing,
        "failedSources": failed,
        "staleSources": stale,
        "incompleteSources": incomplete,
        "blockers": blockers,
        "warnings": warnings,
        "sources": source_rows,
    }


def build_report(con: sqlite3.Connection, args: argparse.Namespace) -> dict[str, Any]:
    generated_at = datetime.now(timezone.utc)
    policies = source_policies(con, args.include_optional)
    statuses = source_statuses(con, args.start_date, args.end_date)
    dates = date_list(con, args.start_date, args.end_date)
    date_rows = [row_for_date(date, policies, statuses, generated_at) for date in dates]
    source_summary = []
    for policy in policies:
        source_name = policy["source_name"]
        source_dates = [
            source_row
            for date_row in date_rows
            for source_row in date_row["sources"]
            if source_row["sourceName"] == source_name
        ]
        source_summary.append(
            {
                "sourceName": source_name,
                "sourceFamily": policy["source_family"],
                "requiredForPrediction": bool(policy["required_for_prediction"]),
                "datesWithFreshSuccess": sum(1 for row in source_dates if row["statusClass"] == "fresh_success"),
                "datesWithStaleSuccess": sum(1 for row in source_dates if row["statusClass"] == "stale_success"),
                "datesWithFailedStatus": sum(1 for row in source_dates if row["statusClass"] == "failed_status"),
                "datesMissingStatus": sum(1 for row in source_dates if row["statusClass"] == "missing_status"),
            }
        )
    summary = {
        "dates": len(date_rows),
        "sourcesPerDate": len(policies),
        "dateSourceSlots": len(date_rows) * len(policies),
        "datesCurrentPublishReady": sum(1 for row in date_rows if row["okForCurrentPublish"]),
        "datesBlockedForCurrentPublish": sum(1 for row in date_rows if not row["okForCurrentPublish"]),
        "missingSourceSlots": sum(len(row["missingSources"]) for row in date_rows),
        "failedSourceSlots": sum(len(row["failedSources"]) for row in date_rows),
        "staleSourceSlots": sum(len(row["staleSources"]) for row in date_rows),
        "freshSourceSlots": sum(row["freshSources"] for row in date_rows),
    }
    return {
        "generated_at": generated_at.isoformat(),
        "script": "data-migration/scripts/audit_tennis_source_freshness.py",
        "db_path": str(args.db),
        "scope": {"start_date": args.start_date, "end_date": args.end_date},
        "include_optional": args.include_optional,
        "summary": summary,
        "sources": source_summary,
        "dates": date_rows,
    }


def markdown_table(headers: list[str], body: list[list[Any]]) -> str:
    lines = [
        "| " + " | ".join(headers) + " |",
        "| " + " | ".join("---" for _ in headers) + " |",
    ]
    for row in body:
        lines.append("| " + " | ".join(str(cell) for cell in row) + " |")
    return "\n".join(lines)


def write_markdown(report: dict[str, Any], path: Path) -> None:
    summary = report["summary"]
    lines = [
        "# Tennis Source Freshness Audit",
        "",
        f"Generated: `{report['generated_at']}`",
        "",
        f"DB: `{report['db_path']}`",
        "",
        f"Scope: `{report['scope']['start_date'] or 'beginning'}` to `{report['scope']['end_date'] or 'end'}`",
        "",
        "## Summary",
        "",
        markdown_table(
            ["Metric", "Count"],
            [
                ["Dates", summary["dates"]],
                ["Sources per date", summary["sourcesPerDate"]],
                ["Date/source slots", summary["dateSourceSlots"]],
                ["Current-publish-ready dates", summary["datesCurrentPublishReady"]],
                ["Current-publish-blocked dates", summary["datesBlockedForCurrentPublish"]],
                ["Fresh source slots", summary["freshSourceSlots"]],
                ["Stale source slots", summary["staleSourceSlots"]],
                ["Failed source slots", summary["failedSourceSlots"]],
                ["Missing source slots", summary["missingSourceSlots"]],
            ],
        ),
        "",
        "## Source Coverage",
        "",
        markdown_table(
            ["Source", "Family", "Fresh", "Stale", "Failed", "Missing"],
            [
                [
                    row["sourceName"],
                    row["sourceFamily"],
                    row["datesWithFreshSuccess"],
                    row["datesWithStaleSuccess"],
                    row["datesWithFailedStatus"],
                    row["datesMissingStatus"],
                ]
                for row in report["sources"]
            ],
        ),
        "",
        "## Dates",
        "",
        markdown_table(
            ["Date", "Publish ready", "Fresh", "Missing", "Failed", "Stale"],
            [
                [
                    row["date"],
                    row["okForCurrentPublish"],
                    row["freshSources"],
                    ", ".join(row["missingSources"]),
                    ", ".join(row["failedSources"]),
                    ", ".join(row["staleSources"]),
                ]
                for row in report["dates"]
            ],
        ),
        "",
        "## Notes",
        "",
        "- This report is read-only and uses `source_fetch_policies` plus `source_fetch_status`.",
        "- Freshness is evaluated against the report generation time for current-publish eligibility.",
        "- Historical research may treat stale-but-successful source rows differently, but stale rows must not pass current publish readiness.",
        "",
    ]
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text("\n".join(lines), encoding="utf-8")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Audit tennis source fetch coverage and freshness.")
    parser.add_argument("--db", type=Path, default=DEFAULT_DB)
    parser.add_argument("--out", type=Path, default=DEFAULT_JSON)
    parser.add_argument("--markdown", type=Path, default=DEFAULT_MARKDOWN)
    parser.add_argument("--start-date")
    parser.add_argument("--end-date")
    parser.add_argument("--include-optional", action="store_true")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    if not args.db.exists():
        raise SystemExit(f"Missing DB: {args.db}")
    with connect(args.db) as con:
        report = build_report(con, args)
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(report, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    write_markdown(report, args.markdown)
    print(
        json.dumps(
            {
                "ok": True,
                "json": str(args.out),
                "markdown": str(args.markdown),
                "summary": report["summary"],
            },
            indent=2,
            sort_keys=True,
        )
    )


if __name__ == "__main__":
    main()
