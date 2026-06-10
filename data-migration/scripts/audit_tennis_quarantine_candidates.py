#!/usr/bin/env python3
"""Export read-only tennis quarantine and review candidates."""

from __future__ import annotations

import argparse
import csv
import json
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


DEFAULT_DB = Path("data-private/warehouse/sports/tennis/sql-tennis.db")
DEFAULT_JSON = Path("data-migration/reports/tennis_quarantine_candidates.json")
DEFAULT_MARKDOWN = Path("data-migration/reports/tennis_quarantine_candidates.md")
SECTION_ROW_KEYS = {
    "non_tennislive_matches": "candidates",
    "participant_anomalies": "candidates",
    "prediction_rows_without_match": "candidates",
    "ten_t0_market_only_predictions": "candidates",
    "market_identity_gaps": "candidates",
    "duplicate_market_groups": "groups",
    "duplicate_stat_groups": "groups",
}
SECTION_CSV_FIELDS = {
    "non_tennislive_matches": [
        "bucket",
        "reason",
        "match_id",
        "id_prefix",
        "match_date",
        "start_time_utc",
        "status",
        "tour",
        "surface",
        "source_event_id",
        "participant_rows",
        "distinct_players",
    ],
    "participant_anomalies": [
        "bucket",
        "reason",
        "match_id",
        "id_prefix",
        "match_date",
        "status",
        "participant_rows",
        "distinct_players",
        "player_ids",
        "sides",
    ],
    "prediction_rows_without_match": [
        "bucket",
        "reason",
        "prediction_row_id",
        "model_run_id",
        "match_id",
        "id_prefix",
        "lane",
        "market_type",
        "selection",
        "confidence",
        "ev_cents",
        "created_at",
    ],
    "ten_t0_market_only_predictions": [
        "bucket",
        "reason",
        "prediction_row_id",
        "model_run_id",
        "match_id",
        "id_prefix",
        "lane",
        "market_type",
        "selection",
        "confidence",
        "ev_cents",
        "created_at",
    ],
    "market_identity_gaps": [
        "bucket",
        "reason",
        "market_snapshot_id",
        "match_id",
        "id_prefix",
        "player_id",
        "source_name",
        "market_type",
        "selection",
        "line_value",
        "odds_american",
        "price_cents",
        "implied_probability",
        "captured_at",
    ],
    "duplicate_market_groups": [
        "bucket",
        "reason",
        "match_id",
        "id_prefix",
        "player_id",
        "source_name",
        "market_type",
        "selection",
        "line_value",
        "captured_at",
        "duplicate_rows",
        "market_snapshot_ids",
    ],
    "duplicate_stat_groups": [
        "bucket",
        "reason",
        "match_id",
        "id_prefix",
        "player_id",
        "source_name",
        "stat_name",
        "period",
        "duplicate_rows",
        "stat_row_ids",
    ],
}


def connect(db_path: Path) -> sqlite3.Connection:
    con = sqlite3.connect(f"file:{db_path}?mode=ro", uri=True)
    con.row_factory = sqlite3.Row
    return con


def rows(con: sqlite3.Connection, sql: str, params: tuple[Any, ...] = ()) -> list[dict[str, Any]]:
    return [dict(row) for row in con.execute(sql, params).fetchall()]


def one(con: sqlite3.Connection, sql: str, params: tuple[Any, ...] = ()) -> Any:
    return con.execute(sql, params).fetchone()[0]


def match_date_clause(alias: str, start_date: str | None, end_date: str | None) -> tuple[str, list[Any]]:
    clauses = []
    params: list[Any] = []
    if start_date:
        clauses.append(f"{alias}.match_date >= ?")
        params.append(start_date)
    if end_date:
        clauses.append(f"{alias}.match_date <= ?")
        params.append(end_date)
    if not clauses:
        return "", params
    return " and " + " and ".join(clauses), params


def run_date_exists(alias: str, start_date: str | None, end_date: str | None) -> tuple[str, list[Any]]:
    clauses = []
    params: list[Any] = []
    if start_date:
        clauses.append("mr.run_date >= ?")
        params.append(start_date)
    if end_date:
        clauses.append("mr.run_date <= ?")
        params.append(end_date)
    if not clauses:
        return "1=1", params
    return (
        f"""
        exists (
          select 1
          from model_runs mr
          where mr.model_run_id = {alias}.model_run_id
            and {" and ".join(clauses)}
        )
        """,
        params,
    )


def match_date_exists(alias: str, match_id_column: str, start_date: str | None, end_date: str | None) -> tuple[str, list[Any]]:
    clauses = []
    params: list[Any] = []
    if start_date:
        clauses.append("m_scope.match_date >= ?")
        params.append(start_date)
    if end_date:
        clauses.append("m_scope.match_date <= ?")
        params.append(end_date)
    if not clauses:
        return "1=1", params
    return (
        f"""
        exists (
          select 1
          from matches m_scope
          where m_scope.match_id = {alias}.{match_id_column}
            and {" and ".join(clauses)}
        )
        """,
        params,
    )


def prefix_expression(column: str = "match_id") -> str:
    return f"""
    case
      when instr({column}, '-') > 0 then substr({column}, 1, instr({column}, '-') - 1)
      else 'none'
    end
    """


def non_tennislive_matches(con: sqlite3.Connection, start_date: str | None, end_date: str | None, limit: int) -> dict[str, Any]:
    date_filter, params = match_date_clause("m", start_date, end_date)
    count = int(
        one(
            con,
            f"""
            select count(*)
            from matches m
            left join tennislive_match_sources tl on tl.match_id = m.match_id and tl.active = 1
            where tl.match_id is null{date_filter}
            """,
            tuple(params),
        )
    )
    candidates = rows(
        con,
        f"""
        select 'quarantine' as bucket,
               'match_not_attached_to_active_tennislive_source' as reason,
               m.match_id,
               {prefix_expression('m.match_id')} as id_prefix,
               m.match_date,
               m.start_time_utc,
               m.status,
               m.tour,
               m.surface,
               m.source_event_id,
               count(mp.player_id) as participant_rows,
               count(distinct mp.player_id) as distinct_players
        from matches m
        left join tennislive_match_sources tl on tl.match_id = m.match_id and tl.active = 1
        left join match_players mp on mp.match_id = m.match_id
        where tl.match_id is null{date_filter}
        group by m.match_id
        order by m.match_date desc, id_prefix, m.match_id
        limit ?
        """,
        tuple(params + [limit]),
    )
    return {"count": count, "candidates": candidates}


def participant_anomalies(con: sqlite3.Connection, start_date: str | None, end_date: str | None, limit: int) -> dict[str, Any]:
    date_filter, params = match_date_clause("m", start_date, end_date)
    count = int(
        one(
            con,
            f"""
            select count(*)
            from (
              select m.match_id,
                     count(mp.player_id) as participant_rows,
                     count(distinct mp.player_id) as distinct_players
              from matches m
              left join match_players mp on mp.match_id = m.match_id
              where 1=1{date_filter}
              group by m.match_id
              having participant_rows != 2 or distinct_players != 2
            )
            """,
            tuple(params),
        )
    )
    candidates = rows(
        con,
        f"""
        select 'needs_review' as bucket,
               'match_participant_shape_not_exactly_two_distinct_players' as reason,
               m.match_id,
               {prefix_expression('m.match_id')} as id_prefix,
               m.match_date,
               m.status,
               count(mp.player_id) as participant_rows,
               count(distinct mp.player_id) as distinct_players,
               group_concat(mp.player_id) as player_ids,
               group_concat(mp.side) as sides
        from matches m
        left join match_players mp on mp.match_id = m.match_id
        where 1=1{date_filter}
        group by m.match_id
        having participant_rows != 2 or distinct_players != 2
        order by m.match_date desc, m.match_id
        limit ?
        """,
        tuple(params + [limit]),
    )
    return {"count": count, "candidates": candidates}


def prediction_without_match(con: sqlite3.Connection, start_date: str | None, end_date: str | None, limit: int) -> dict[str, Any]:
    scoped_where, params = run_date_exists("p", start_date, end_date)
    where_sql = f"""
      {scoped_where}
      and not exists (
        select 1
        from matches m
        where m.match_id = p.match_id
      )
    """
    count = int(one(con, f"select count(*) from prediction_rows p where {where_sql}", tuple(params)))
    candidates = rows(
        con,
        f"""
        select 'quarantine' as bucket,
               'prediction_row_match_id_not_in_matches' as reason,
               p.prediction_row_id,
               p.model_run_id,
               p.match_id,
               {prefix_expression('p.match_id')} as id_prefix,
               p.lane,
               p.market_type,
               p.selection,
               p.confidence,
               p.ev_cents,
               p.created_at
        from prediction_rows p
        where {where_sql}
        order by p.model_run_id, p.match_id, p.prediction_row_id
        limit ?
        """,
        tuple(params + [limit]),
    )
    return {"count": count, "candidates": candidates}


def ten_t0_market_only_predictions(con: sqlite3.Connection, start_date: str | None, end_date: str | None, limit: int) -> dict[str, Any]:
    scoped_where, params = run_date_exists("p", start_date, end_date)
    where_sql = f"""
      {scoped_where}
      and p.model_run_id like 'tennis-TEN-T0-%'
      and instr(coalesce(p.rationale_json, ''), '"marketOnly":true') > 0
    """
    count = int(one(con, f"select count(*) from prediction_rows p where {where_sql}", tuple(params)))
    candidates = rows(
        con,
        f"""
        select 'quarantine' as bucket,
               'ten_t0_market_only_row_captured_as_prediction' as reason,
               p.prediction_row_id,
               p.model_run_id,
               p.match_id,
               {prefix_expression('p.match_id')} as id_prefix,
               p.lane,
               p.market_type,
               p.selection,
               p.confidence,
               p.ev_cents,
               p.created_at
        from prediction_rows p
        where {where_sql}
        order by p.model_run_id, p.match_id, p.prediction_row_id
        limit ?
        """,
        tuple(params + [limit]),
    )
    return {"count": count, "candidates": candidates}


def market_identity_gaps(con: sqlite3.Connection, start_date: str | None, end_date: str | None, limit: int) -> dict[str, Any]:
    scoped_where, params = match_date_exists("ms", "match_id", start_date, end_date)
    where_sql = f"""
      {scoped_where}
      and (
        ms.match_id is null or ms.match_id = ''
        or ms.player_id is null or ms.player_id = ''
      )
    """
    count = int(one(con, f"select count(*) from market_snapshots ms where {where_sql}", tuple(params)))
    candidates = rows(
        con,
        f"""
        select 'needs_review' as bucket,
               'market_snapshot_missing_match_or_player_identity' as reason,
               ms.market_snapshot_id,
               ms.match_id,
               {prefix_expression('ms.match_id')} as id_prefix,
               ms.player_id,
               ms.source_name,
               ms.market_type,
               ms.selection,
               ms.line_value,
               ms.odds_american,
               ms.price_cents,
               ms.implied_probability,
               ms.captured_at
        from market_snapshots ms
        where {where_sql}
        order by ms.source_name, ms.match_id, ms.market_snapshot_id
        limit ?
        """,
        tuple(params + [limit]),
    )
    return {"count": count, "candidates": candidates}


def duplicate_market_groups(con: sqlite3.Connection, start_date: str | None, end_date: str | None, limit: int) -> dict[str, Any]:
    scoped_where, params = match_date_exists("ms", "match_id", start_date, end_date)
    count = int(
        one(
            con,
            f"""
            select count(*)
            from (
              select ms.match_id, ms.player_id, ms.source_name, ms.market_type, ms.selection, ms.line_value, ms.captured_at, count(*) as rows
              from market_snapshots ms
              where {scoped_where}
              group by ms.match_id, ms.player_id, ms.source_name, ms.market_type, ms.selection, ms.line_value, ms.captured_at
              having rows > 1
            )
            """,
            tuple(params),
        )
    )
    groups = rows(
        con,
        f"""
        select 'quarantine' as bucket,
               'duplicate_market_snapshot_natural_key' as reason,
               ms.match_id,
               {prefix_expression('ms.match_id')} as id_prefix,
               ms.player_id,
               ms.source_name,
               ms.market_type,
               ms.selection,
               ms.line_value,
               ms.captured_at,
               count(*) as duplicate_rows,
               group_concat(ms.market_snapshot_id) as market_snapshot_ids
        from market_snapshots ms
        where {scoped_where}
        group by ms.match_id, ms.player_id, ms.source_name, ms.market_type, ms.selection, ms.line_value, ms.captured_at
        having duplicate_rows > 1
        order by duplicate_rows desc, ms.source_name, ms.match_id
        limit ?
        """,
        tuple(params + [limit]),
    )
    return {"count": count, "groups": groups}


def duplicate_stat_groups(con: sqlite3.Connection, start_date: str | None, end_date: str | None, limit: int) -> dict[str, Any]:
    scoped_where, params = match_date_exists("sr", "match_id", start_date, end_date)
    count = int(
        one(
            con,
            f"""
            select count(*)
            from (
              select sr.match_id, sr.player_id, sr.source_name, sr.stat_name, sr.period, count(*) as rows
              from match_stat_rows sr
              where {scoped_where}
              group by sr.match_id, sr.player_id, sr.source_name, sr.stat_name, sr.period
              having rows > 1
            )
            """,
            tuple(params),
        )
    )
    groups = rows(
        con,
        f"""
        select 'quarantine' as bucket,
               'duplicate_match_stat_natural_key' as reason,
               sr.match_id,
               {prefix_expression('sr.match_id')} as id_prefix,
               sr.player_id,
               sr.source_name,
               sr.stat_name,
               sr.period,
               count(*) as duplicate_rows,
               group_concat(sr.stat_row_id) as stat_row_ids
        from match_stat_rows sr
        where {scoped_where}
        group by sr.match_id, sr.player_id, sr.source_name, sr.stat_name, sr.period
        having duplicate_rows > 1
        order by duplicate_rows desc, sr.source_name, sr.match_id
        limit ?
        """,
        tuple(params + [limit]),
    )
    return {"count": count, "groups": groups}


def build_report(con: sqlite3.Connection, args: argparse.Namespace) -> dict[str, Any]:
    sections = {
        "non_tennislive_matches": non_tennislive_matches(con, args.start_date, args.end_date, args.limit_per_category),
        "participant_anomalies": participant_anomalies(con, args.start_date, args.end_date, args.limit_per_category),
        "prediction_rows_without_match": prediction_without_match(con, args.start_date, args.end_date, args.limit_per_category),
        "ten_t0_market_only_predictions": ten_t0_market_only_predictions(con, args.start_date, args.end_date, args.limit_per_category),
        "market_identity_gaps": market_identity_gaps(con, args.start_date, args.end_date, args.limit_per_category),
        "duplicate_market_groups": duplicate_market_groups(con, args.start_date, args.end_date, args.limit_per_category),
        "duplicate_stat_groups": duplicate_stat_groups(con, args.start_date, args.end_date, args.limit_per_category),
    }
    return {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "script": "data-migration/scripts/audit_tennis_quarantine_candidates.py",
        "db_path": str(args.db),
        "scope": {"start_date": args.start_date, "end_date": args.end_date},
        "limit_per_category": args.limit_per_category,
        "summary": {
            name: section["count"]
            for name, section in sections.items()
        },
        "sections": sections,
    }


def markdown_table(headers: list[str], body: list[list[Any]]) -> str:
    lines = [
        "| " + " | ".join(headers) + " |",
        "| " + " | ".join("---" for _ in headers) + " |",
    ]
    for row in body:
        lines.append("| " + " | ".join(str(cell) for cell in row) + " |")
    return "\n".join(lines)


def first_entries(section: dict[str, Any], key: str, limit: int = 12) -> list[dict[str, Any]]:
    return list(section.get(key) or [])[:limit]


def write_markdown(report: dict[str, Any], path: Path) -> None:
    summary = report["summary"]
    lines = [
        "# Tennis Quarantine Candidates",
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
            ["Category", "Candidate count"],
            [[name, count] for name, count in summary.items()],
        ),
        "",
        "## Non-TennisLive Matches",
        "",
        markdown_table(
            ["Bucket", "Reason", "Match", "Date", "Prefix", "Participants"],
            [
                [row["bucket"], row["reason"], row["match_id"], row["match_date"], row["id_prefix"], row["participant_rows"]]
                for row in first_entries(report["sections"]["non_tennislive_matches"], "candidates")
            ],
        ),
        "",
        "## Prediction Rows Without DB Match",
        "",
        markdown_table(
            ["Bucket", "Run", "Prediction row", "Match", "Selection"],
            [
                [row["bucket"], row["model_run_id"], row["prediction_row_id"], row["match_id"], row["selection"]]
                for row in first_entries(report["sections"]["prediction_rows_without_match"], "candidates")
            ],
        ),
        "",
        "## TEN-T0 Market-Only Prediction Rows",
        "",
        markdown_table(
            ["Bucket", "Run", "Prediction row", "Match", "Selection"],
            [
                [row["bucket"], row["model_run_id"], row["prediction_row_id"], row["match_id"], row["selection"]]
                for row in first_entries(report["sections"]["ten_t0_market_only_predictions"], "candidates")
            ],
        ),
        "",
        "## Market Identity Gaps",
        "",
        markdown_table(
            ["Bucket", "Source", "Market row", "Match", "Player", "Selection"],
            [
                [row["bucket"], row["source_name"], row["market_snapshot_id"], row["match_id"], row["player_id"], row["selection"]]
                for row in first_entries(report["sections"]["market_identity_gaps"], "candidates")
            ],
        ),
        "",
        "## Duplicate Market Groups",
        "",
        markdown_table(
            ["Bucket", "Source", "Match", "Player", "Market", "Selection", "Rows"],
            [
                [row["bucket"], row["source_name"], row["match_id"], row["player_id"], row["market_type"], row["selection"], row["duplicate_rows"]]
                for row in first_entries(report["sections"]["duplicate_market_groups"], "groups")
            ],
        ),
        "",
        "## Duplicate Stat Groups",
        "",
        markdown_table(
            ["Bucket", "Source", "Match", "Player", "Stat", "Period", "Rows"],
            [
                [row["bucket"], row["source_name"], row["match_id"], row["player_id"], row["stat_name"], row["period"], row["duplicate_rows"]]
                for row in first_entries(report["sections"]["duplicate_stat_groups"], "groups")
            ],
        ),
        "",
        "## Notes",
        "",
        "- This report is read-only. It does not mutate or delete rows.",
        "- Duplicate stat and market sections are natural-key groups; review before deleting any physical rows.",
        "- Candidate limits only affect materialized examples, not summary counts.",
        "",
    ]
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text("\n".join(lines), encoding="utf-8")


def write_csv(path: Path, fieldnames: list[str], rows_to_write: list[dict[str, Any]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8", newline="") as fh:
        writer = csv.DictWriter(fh, fieldnames=fieldnames, extrasaction="ignore", lineterminator="\n")
        writer.writeheader()
        for row in rows_to_write:
            writer.writerow({field: "" if row.get(field) is None else row.get(field) for field in fieldnames})


def write_csvs(report: dict[str, Any], csv_dir: Path) -> dict[str, str]:
    outputs: dict[str, str] = {}
    summary_rows = [
        {"category": name, "candidate_count": count}
        for name, count in report["summary"].items()
    ]
    summary_path = csv_dir / "_summary.csv"
    write_csv(summary_path, ["category", "candidate_count"], summary_rows)
    outputs["_summary"] = str(summary_path)
    for section_name, section in report["sections"].items():
        row_key = SECTION_ROW_KEYS[section_name]
        output_path = csv_dir / f"{section_name}.csv"
        write_csv(output_path, SECTION_CSV_FIELDS[section_name], list(section.get(row_key) or []))
        outputs[section_name] = str(output_path)
    return outputs


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Export tennis quarantine/review candidates.")
    parser.add_argument("--db", type=Path, default=DEFAULT_DB)
    parser.add_argument("--out", type=Path, default=DEFAULT_JSON)
    parser.add_argument("--markdown", type=Path, default=DEFAULT_MARKDOWN)
    parser.add_argument("--csv-dir", type=Path, help="Optional directory for per-category CSV review queues.")
    parser.add_argument("--start-date")
    parser.add_argument("--end-date")
    parser.add_argument("--limit-per-category", type=int, default=500)
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    if args.limit_per_category < 1:
        raise SystemExit("--limit-per-category must be positive")
    if not args.db.exists():
        raise SystemExit(f"Missing DB: {args.db}")
    with connect(args.db) as con:
        report = build_report(con, args)
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(report, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    write_markdown(report, args.markdown)
    csv_outputs = write_csvs(report, args.csv_dir) if args.csv_dir else None
    print(
        json.dumps(
            {
                "ok": True,
                "json": str(args.out),
                "markdown": str(args.markdown),
                "csv_dir": str(args.csv_dir) if args.csv_dir else None,
                "csv_files": csv_outputs,
                "summary": report["summary"],
            },
            indent=2,
            sort_keys=True,
        )
    )


if __name__ == "__main__":
    main()
