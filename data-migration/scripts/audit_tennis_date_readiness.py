#!/usr/bin/env python3
"""Per-date tennis warehouse readiness audit.

This report rolls the canonical audit views up by date. It is read-only and
uses temporary views against a read-only SQLite connection.
"""

from __future__ import annotations

import argparse
import json
import re
import sqlite3
from datetime import date as Date, datetime, timedelta, timezone
from pathlib import Path
from typing import Any


DEFAULT_DB = Path("data-private/warehouse/sports/tennis/sql-tennis.db")
DEFAULT_SQL = Path("data-migration/contracts/tennis_canonical_audit_views.sql")
DEFAULT_JSON = Path("data-migration/reports/tennis_date_readiness.json")
DEFAULT_MARKDOWN = Path("data-migration/reports/tennis_date_readiness.md")
DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")


def temp_view_sql(sql: str) -> str:
    converted = re.sub(
        r"drop\s+view\s+if\s+exists\s+([a-zA-Z0-9_]+)",
        r"drop view if exists temp.\1",
        sql,
        flags=re.IGNORECASE,
    )
    return re.sub(
        r"create\s+view\s+([a-zA-Z0-9_]+)\s+as",
        r"create temp view \1 as",
        converted,
        flags=re.IGNORECASE,
    )


def rows(con: sqlite3.Connection, sql: str, params: tuple[Any, ...] = ()) -> list[dict[str, Any]]:
    con.row_factory = sqlite3.Row
    return [dict(row) for row in con.execute(sql, params).fetchall()]


def scalar(con: sqlite3.Connection, sql: str, params: tuple[Any, ...] = ()) -> int:
    return int(con.execute(sql, params).fetchone()[0] or 0)


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


def parse_date_value(value: str) -> Date | None:
    if not DATE_RE.match(value):
        return None
    try:
        return Date.fromisoformat(value)
    except ValueError:
        return None


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
            )
            {where}
            order by date_value
            """,
            tuple(params),
        )
    ]


def source_status_for_date(con: sqlite3.Connection, date: str) -> dict[str, Any]:
    status_rows = rows(
        con,
        """
        select
          p.source_name,
          p.source_family,
          s.last_status,
          s.last_completeness_status,
          s.last_success_at,
          s.cache_valid_until,
          s.actual_item_count,
          s.missing_item_count,
          s.unresolved_count
        from source_fetch_policies p
        left join source_fetch_status s
          on s.sport = p.sport
         and s.source_name = p.source_name
         and s.source_date = ?
        where p.sport = 'tennis'
          and p.required_for_prediction = 1
        order by p.source_name
        """,
        (date,),
    )
    now = datetime.now(timezone.utc)
    missing = []
    failed = []
    stale = []
    present_success = 0
    for row in status_rows:
        if row["last_status"] is None:
            missing.append(row["source_name"])
            continue
        if row["last_status"] != "success":
            failed.append(row["source_name"])
        else:
            present_success += 1
        valid_until = parse_sqlite_timestamp(row["cache_valid_until"])
        if valid_until is None or valid_until < now:
            stale.append(row["source_name"])
    return {
        "requiredSources": len(status_rows),
        "presentSuccess": present_success,
        "missing": missing,
        "failed": failed,
        "stale": stale,
        "okForCurrentPublish": not missing and not failed and not stale,
    }


def row_for_date(con: sqlite3.Connection, date: str, generated_date: Date) -> dict[str, Any]:
    total_matches = scalar(con, "select count(*) from matches where match_date = ?", (date,))
    canonical_matches = scalar(con, "select count(*) from v_tennis_canonical_matches where match_date = ?", (date,))
    quarantine_matches = scalar(con, "select count(*) from v_tennis_quarantine_non_tennislive_matches where match_date = ?", (date,))
    review_match_shapes = scalar(con, "select count(*) from v_tennis_needs_review_match_shapes where match_date = ?", (date,))
    resolved_markets = scalar(
        con,
        """
        select count(*)
        from v_tennis_resolved_market_snapshots ms
        join matches m on m.match_id = ms.match_id
        where m.match_date = ?
        """,
        (date,),
    )
    market_identity_gaps = scalar(
        con,
        """
        select count(*)
        from v_tennis_market_identity_gaps ms
        join matches m on m.match_id = ms.match_id
        where m.match_date = ?
        """,
        (date,),
    )
    prediction_rows = scalar(con, "select count(*) from v_tennis_forensic_prediction_rows where run_date = ?", (date,))
    forensic_predictions = scalar(
        con,
        """
        select count(*)
        from v_tennis_forensic_prediction_rows
        where run_date = ?
          and audit_bucket = 'quarantine'
        """,
        (date,),
    )
    market_only_predictions = scalar(
        con,
        "select count(*) from v_tennis_forensic_prediction_rows where run_date = ? and is_market_only = 1",
        (date,),
    )
    missing_match_predictions = scalar(
        con,
        "select count(*) from v_tennis_forensic_prediction_rows where run_date = ? and missing_db_match = 1",
        (date,),
    )
    prediction_rows_with_ev = scalar(
        con,
        "select count(*) from prediction_rows p join model_runs mr on mr.model_run_id = p.model_run_id where mr.run_date = ? and p.ev_cents is not null",
        (date,),
    )
    settlement_rows = scalar(
        con,
        """
        select count(*)
        from settlement_rows sr
        join prediction_rows p on p.prediction_row_id = sr.prediction_row_id
        join model_runs mr on mr.model_run_id = p.model_run_id
        where mr.run_date = ?
        """,
        (date,),
    )
    tennis_model_settlements = scalar(
        con,
        "select count(*) from tennis_model_run_settlements where slate_date = ?",
        (date,),
    )
    result_rows = scalar(con, "select count(*) from tennis_match_results where slate_date = ? and completed = 1", (date,))
    tennislive_result_rows = scalar(
        con,
        """
        select count(*)
        from tennislive_match_summaries
        where match_date = ?
          and lower(coalesce(status, '')) like '%complete%'
          and coalesce(winner_name, '') != ''
        """,
        (date,),
    )
    source_status = source_status_for_date(con, date)
    parsed_date = parse_date_value(date)
    if parsed_date is None:
        date_status = "invalid"
    elif parsed_date > generated_date + timedelta(days=370):
        date_status = "far_future"
    elif parsed_date > generated_date:
        date_status = "future"
    else:
        date_status = "valid"
    blockers = []
    warnings = []
    if date_status == "invalid":
        blockers.append("invalid_date_value")
    elif date_status == "far_future":
        blockers.append("far_future_date_value")
    elif date_status == "future":
        warnings.append("future_date_value")
    if canonical_matches == 0:
        blockers.append("no_canonical_tennislive_matches")
    if quarantine_matches:
        blockers.append("non_tennislive_match_shapes_present")
    if market_identity_gaps:
        blockers.append("market_identity_gaps_present")
    if prediction_rows and forensic_predictions == prediction_rows:
        blockers.append("only_forensic_or_quarantine_predictions")
    elif forensic_predictions:
        warnings.append("some_forensic_or_quarantine_predictions")
    if missing_match_predictions:
        blockers.append("prediction_rows_without_db_match")
    if prediction_rows and settlement_rows == 0 and tennis_model_settlements == 0:
        blockers.append("no_settlement_rows_for_prediction_runs")
    if result_rows == 0 and tennislive_result_rows == 0:
        warnings.append("no_result_evidence")
    if not source_status["okForCurrentPublish"]:
        warnings.append("source_freshness_not_current_publish_ready")
    return {
        "date": date,
        "dateStatus": date_status,
        "totalMatches": total_matches,
        "canonicalMatches": canonical_matches,
        "quarantineMatches": quarantine_matches,
        "reviewMatchShapes": review_match_shapes,
        "resolvedMarketSnapshots": resolved_markets,
        "marketIdentityGaps": market_identity_gaps,
        "predictionRows": prediction_rows,
        "forensicOrQuarantinePredictionRows": forensic_predictions,
        "marketOnlyPredictionRows": market_only_predictions,
        "predictionRowsWithoutDbMatch": missing_match_predictions,
        "predictionRowsWithEv": prediction_rows_with_ev,
        "settlementRows": settlement_rows,
        "tennisModelSettlementRows": tennis_model_settlements,
        "tennisMatchResultRows": result_rows,
        "tennisLiveResultRows": tennislive_result_rows,
        "sourceStatus": source_status,
        "readiness": "blocked" if blockers else "usable_with_warnings" if warnings else "usable",
        "blockers": blockers,
        "warnings": warnings,
    }


def build_report(con: sqlite3.Connection, args: argparse.Namespace) -> dict[str, Any]:
    sql = args.sql.read_text(encoding="utf-8")
    con.executescript(temp_view_sql(sql))
    generated_at = datetime.now(timezone.utc)
    dates = date_list(con, args.start_date, args.end_date)
    date_rows = [row_for_date(con, date, generated_at.date()) for date in dates]
    summary = {
        "dates": len(date_rows),
        "usable": sum(1 for row in date_rows if row["readiness"] == "usable"),
        "usableWithWarnings": sum(1 for row in date_rows if row["readiness"] == "usable_with_warnings"),
        "blocked": sum(1 for row in date_rows if row["readiness"] == "blocked"),
        "invalidDates": sum(1 for row in date_rows if row["dateStatus"] == "invalid"),
        "farFutureDates": sum(1 for row in date_rows if row["dateStatus"] == "far_future"),
        "futureDates": sum(1 for row in date_rows if row["dateStatus"] == "future"),
        "totalCanonicalMatches": sum(row["canonicalMatches"] for row in date_rows),
        "totalQuarantineMatches": sum(row["quarantineMatches"] for row in date_rows),
        "totalPredictionRows": sum(row["predictionRows"] for row in date_rows),
        "totalSettlementRows": sum(row["settlementRows"] for row in date_rows),
    }
    return {
        "generated_at": generated_at.isoformat(),
        "script": "data-migration/scripts/audit_tennis_date_readiness.py",
        "db_path": str(args.db),
        "sql_path": str(args.sql),
        "scope": {"start_date": args.start_date, "end_date": args.end_date},
        "summary": summary,
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
        "# Tennis Date Readiness Audit",
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
                ["Usable", summary["usable"]],
                ["Usable with warnings", summary["usableWithWarnings"]],
                ["Blocked", summary["blocked"]],
                ["Invalid date values", summary["invalidDates"]],
                ["Far-future date values", summary["farFutureDates"]],
                ["Future date values", summary["futureDates"]],
                ["Canonical matches", summary["totalCanonicalMatches"]],
                ["Quarantine matches", summary["totalQuarantineMatches"]],
                ["Prediction rows", summary["totalPredictionRows"]],
                ["Settlement rows", summary["totalSettlementRows"]],
            ],
        ),
        "",
        "## Dates",
        "",
        markdown_table(
            [
                "Date",
                "Date status",
                "Readiness",
                "Matches",
                "Canonical",
                "Quarantine",
                "Resolved markets",
                "Market gaps",
                "Pred rows",
                "Settlements",
                "Blockers",
            ],
            [
                [
                    row["date"],
                    row["dateStatus"],
                    row["readiness"],
                    row["totalMatches"],
                    row["canonicalMatches"],
                    row["quarantineMatches"],
                    row["resolvedMarketSnapshots"],
                    row["marketIdentityGaps"],
                    row["predictionRows"],
                    row["settlementRows"] + row["tennisModelSettlementRows"],
                    ", ".join(row["blockers"]),
                ]
                for row in report["dates"]
            ],
        ),
        "",
        "## Notes",
        "",
        "- This report is read-only and uses temporary views from `tennis_canonical_audit_views.sql`.",
        "- `blocked` means the date should not feed model design or public prediction exports without human review.",
        "- Source freshness is reported as a warning because historical analysis may use stale-but-provenanced rows differently than current publish.",
        "",
    ]
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text("\n".join(lines), encoding="utf-8")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Build date-level tennis readiness report.")
    parser.add_argument("--db", type=Path, default=DEFAULT_DB)
    parser.add_argument("--sql", type=Path, default=DEFAULT_SQL)
    parser.add_argument("--out", type=Path, default=DEFAULT_JSON)
    parser.add_argument("--markdown", type=Path, default=DEFAULT_MARKDOWN)
    parser.add_argument("--start-date")
    parser.add_argument("--end-date")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    if not args.db.exists():
        raise SystemExit(f"Missing DB: {args.db}")
    if not args.sql.exists():
        raise SystemExit(f"Missing SQL: {args.sql}")
    with sqlite3.connect(f"file:{args.db}?mode=ro", uri=True) as con:
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
