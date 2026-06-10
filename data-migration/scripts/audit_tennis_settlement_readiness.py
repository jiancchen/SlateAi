#!/usr/bin/env python3
"""Read-only audit for tennis settlement readiness.

The audit does not write settlement rows. It measures whether existing
prediction rows can be resolved to DB matches and result evidence.
"""

from __future__ import annotations

import argparse
import json
import re
import sqlite3
import unicodedata
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


DEFAULT_DB = Path("data-private/warehouse/sports/tennis/sql-tennis.db")
DEFAULT_JSON = Path("data-migration/reports/tennis_settlement_readiness.json")
DEFAULT_MARKDOWN = Path("data-migration/reports/tennis_settlement_readiness.md")


def connect(db_path: Path) -> sqlite3.Connection:
    con = sqlite3.connect(db_path)
    con.row_factory = sqlite3.Row
    return con


def rows(con: sqlite3.Connection, sql: str, params: tuple[Any, ...] = ()) -> list[dict[str, Any]]:
    return [dict(row) for row in con.execute(sql, params).fetchall()]


def one(con: sqlite3.Connection, sql: str, params: tuple[Any, ...] = ()) -> Any:
    return con.execute(sql, params).fetchone()[0]


def normalize(value: Any) -> str:
    text = unicodedata.normalize("NFKD", str(value or ""))
    text = "".join(char for char in text if not unicodedata.combining(char))
    text = re.sub(r"[^a-z0-9]+", " ", text.lower()).strip()
    return re.sub(r"\s+", " ", text)


def names_likely_match(left: Any, right: Any) -> bool:
    a = normalize(left)
    b = normalize(right)
    if not a or not b:
        return False
    if a == b or a in b or b in a:
        return True
    a_tokens = set(a.split())
    b_tokens = set(b.split())
    return bool(a_tokens) and (a_tokens <= b_tokens or b_tokens <= a_tokens)


def score_is_parseable(score_text: Any) -> bool:
    text = str(score_text or "")
    return bool(re.search(r"\d+\s*-\s*\d+", text))


def run_date_filter(alias: str, start_date: str | None, end_date: str | None) -> tuple[str, list[Any]]:
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


def prediction_rows(con: sqlite3.Connection, start_date: str | None, end_date: str | None) -> list[dict[str, Any]]:
    scoped_where, params = run_date_filter("p", start_date, end_date)
    return rows(
        con,
        f"""
        with tennislive_summary_one as (
          select *
          from tennislive_match_summaries
          where rowid in (
            select max(rowid)
            from tennislive_match_summaries
            group by match_id
          )
        )
        select
          p.prediction_row_id,
          p.model_run_id,
          mr.model_id,
          mr.run_date,
          mr.run_type,
          mr.status as model_run_status,
          p.match_id,
          p.player_id,
          p.lane,
          p.market_type,
          p.selection,
          p.predicted_probability,
          p.projected_value,
          p.confidence,
          p.ev_cents,
          p.price_cents,
          p.odds_american,
          p.rationale_json,
          p.created_at,
          m.match_date,
          m.status as match_status,
          m.start_time_utc,
          tls.status as tennislive_status,
          tls.winner_name as tennislive_winner_name,
          tls.score_text as tennislive_score_text,
          tmr.winner_name as result_winner_name,
          tmr.scoreline as result_scoreline,
          tmr.completed as result_completed,
          sr.settlement_row_id
        from prediction_rows p
        left join model_runs mr on mr.model_run_id = p.model_run_id
        left join matches m on m.match_id = p.match_id
        left join tennislive_summary_one tls on tls.match_id = p.match_id
        left join tennis_match_results tmr on tmr.match_id = p.match_id and tmr.completed = 1
        left join settlement_rows sr on sr.prediction_row_id = p.prediction_row_id
        where {scoped_where}
        order by mr.run_date, p.model_run_id, p.match_id, p.prediction_row_id
        """,
        tuple(params),
    )


def classify(row: dict[str, Any]) -> dict[str, Any]:
    has_match = bool(row.get("match_date"))
    winner = row.get("result_winner_name") or row.get("tennislive_winner_name")
    score = row.get("result_scoreline") or row.get("tennislive_score_text")
    result_status = row.get("tennislive_status") or ("completed" if row.get("result_completed") else None)
    has_result = bool(winner) or score_is_parseable(score)
    is_ten_t0 = str(row.get("model_run_id") or "").startswith("tennis-TEN-T0-")
    is_market_only = '"marketOnly":true' in str(row.get("rationale_json") or "")
    already_settled = bool(row.get("settlement_row_id"))

    if not has_match:
        readiness = "impossible_without_match_resolution"
        bucket = "quarantine"
        can_settle_now = False
        settlement_hit = None
    elif already_settled:
        readiness = "already_settled"
        bucket = "settled"
        can_settle_now = True
        settlement_hit = None
    elif is_ten_t0:
        readiness = "forensic_ten_t0_do_not_settle_as_production"
        bucket = "quarantine"
        can_settle_now = False
        settlement_hit = None
    elif is_market_only:
        readiness = "market_only_not_a_prediction"
        bucket = "quarantine"
        can_settle_now = False
        settlement_hit = None
    elif not has_result:
        readiness = "pending_result_evidence"
        bucket = "pending"
        can_settle_now = False
        settlement_hit = None
    elif row.get("lane") == "ml" and row.get("market_type") == "match_winner":
        if winner and row.get("selection"):
            readiness = "ml_settlement_ready"
            bucket = "settlement_ready"
            can_settle_now = True
            settlement_hit = names_likely_match(row.get("selection"), winner)
        else:
            readiness = "ml_missing_selection_or_winner"
            bucket = "needs_review"
            can_settle_now = False
            settlement_hit = None
    elif score_is_parseable(score):
        readiness = "lane_result_available_needs_lane_specific_rule"
        bucket = "needs_review"
        can_settle_now = False
        settlement_hit = None
    else:
        readiness = "winner_only_result_not_enough_for_lane"
        bucket = "needs_review"
        can_settle_now = False
        settlement_hit = None

    return {
        "prediction_row_id": row.get("prediction_row_id"),
        "model_run_id": row.get("model_run_id"),
        "model_id": row.get("model_id"),
        "run_date": row.get("run_date"),
        "run_type": row.get("run_type"),
        "model_run_status": row.get("model_run_status"),
        "match_id": row.get("match_id"),
        "match_date": row.get("match_date"),
        "lane": row.get("lane"),
        "market_type": row.get("market_type"),
        "selection": row.get("selection"),
        "winner_name": winner,
        "score_text": score,
        "result_status": result_status,
        "is_ten_t0": is_ten_t0,
        "is_market_only": is_market_only,
        "already_settled": already_settled,
        "can_settle_now": can_settle_now,
        "settlement_hit": settlement_hit,
        "bucket": bucket,
        "readiness": readiness,
    }


def summarize(classified: list[dict[str, Any]]) -> dict[str, Any]:
    by_bucket = Counter(row["bucket"] for row in classified)
    by_readiness = Counter(row["readiness"] for row in classified)
    by_lane = Counter(f"{row['lane']}:{row['market_type']}" for row in classified)
    by_run: dict[str, dict[str, Any]] = {}
    for row in classified:
        run_id = str(row["model_run_id"])
        entry = by_run.setdefault(
            run_id,
            {
                "model_run_id": run_id,
                "run_date": row["run_date"],
                "model_id": row["model_id"],
                "rows": 0,
                "already_settled": 0,
                "settlement_ready": 0,
                "quarantine": 0,
                "pending": 0,
                "needs_review": 0,
                "missing_match": 0,
                "market_only": 0,
            },
        )
        entry["rows"] += 1
        if row["already_settled"]:
            entry["already_settled"] += 1
        if row["can_settle_now"]:
            entry["settlement_ready"] += 1
        if row["bucket"] == "quarantine":
            entry["quarantine"] += 1
        if row["bucket"] == "pending":
            entry["pending"] += 1
        if row["bucket"] == "needs_review":
            entry["needs_review"] += 1
        if row["readiness"] == "impossible_without_match_resolution":
            entry["missing_match"] += 1
        if row["is_market_only"]:
            entry["market_only"] += 1
    return {
        "rows": len(classified),
        "already_settled": sum(1 for row in classified if row["already_settled"]),
        "settlement_ready": sum(1 for row in classified if row["can_settle_now"]),
        "quarantine": by_bucket.get("quarantine", 0),
        "pending": by_bucket.get("pending", 0),
        "needs_review": by_bucket.get("needs_review", 0),
        "missing_match": by_readiness.get("impossible_without_match_resolution", 0),
        "ten_t0_rows": sum(1 for row in classified if row["is_ten_t0"]),
        "market_only_rows": sum(1 for row in classified if row["is_market_only"]),
        "by_bucket": dict(sorted(by_bucket.items())),
        "by_readiness": dict(sorted(by_readiness.items())),
        "by_lane": dict(sorted(by_lane.items())),
        "by_run": sorted(by_run.values(), key=lambda item: (str(item["run_date"]), item["model_run_id"])),
    }


def result_evidence_summary(con: sqlite3.Connection) -> dict[str, Any]:
    return {
        "tennis_match_results_rows": int(one(con, "select count(*) from tennis_match_results")),
        "tennis_match_results_completed": int(one(con, "select count(*) from tennis_match_results where completed = 1")),
        "tennislive_summary_rows": int(one(con, "select count(*) from tennislive_match_summaries")),
        "tennislive_completed_rows": int(
            one(con, "select count(*) from tennislive_match_summaries where lower(coalesce(status,'')) like '%complete%'")
        ),
        "tennislive_rows_with_winner": int(one(con, "select count(*) from tennislive_match_summaries where coalesce(winner_name,'') != ''")),
        "tennislive_rows_with_score": int(one(con, "select count(*) from tennislive_match_summaries where coalesce(score_text,'') != ''")),
    }


def build_report(con: sqlite3.Connection, args: argparse.Namespace) -> dict[str, Any]:
    raw_rows = prediction_rows(con, args.start_date, args.end_date)
    classified = [classify(row) for row in raw_rows]
    examples_by_readiness: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for row in classified:
        if len(examples_by_readiness[row["readiness"]]) < args.examples_per_status:
            examples_by_readiness[row["readiness"]].append(row)
    return {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "script": "data-migration/scripts/audit_tennis_settlement_readiness.py",
        "db_path": str(args.db),
        "scope": {"start_date": args.start_date, "end_date": args.end_date},
        "summary": summarize(classified),
        "result_evidence": result_evidence_summary(con),
        "examples_by_readiness": dict(sorted(examples_by_readiness.items())),
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
    evidence = report["result_evidence"]
    lines = [
        "# Tennis Settlement Readiness Audit",
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
                ["Prediction rows audited", summary["rows"]],
                ["Already settled", summary["already_settled"]],
                ["Settlement ready now", summary["settlement_ready"]],
                ["Quarantine", summary["quarantine"]],
                ["Pending result evidence", summary["pending"]],
                ["Needs review", summary["needs_review"]],
                ["Missing DB match", summary["missing_match"]],
                ["TEN-T0 rows", summary["ten_t0_rows"]],
                ["Market-only rows", summary["market_only_rows"]],
            ],
        ),
        "",
        "## Result Evidence",
        "",
        markdown_table(
            ["Source", "Rows"],
            [
                ["tennis_match_results rows", evidence["tennis_match_results_rows"]],
                ["tennis_match_results completed", evidence["tennis_match_results_completed"]],
                ["TennisLive summary rows", evidence["tennislive_summary_rows"]],
                ["TennisLive completed rows", evidence["tennislive_completed_rows"]],
                ["TennisLive rows with winner", evidence["tennislive_rows_with_winner"]],
                ["TennisLive rows with score", evidence["tennislive_rows_with_score"]],
            ],
        ),
        "",
        "## Readiness Buckets",
        "",
        markdown_table(
            ["Readiness", "Rows"],
            [[name, count] for name, count in summary["by_readiness"].items()],
        ),
        "",
        "## By Run",
        "",
        markdown_table(
            ["Run", "Date", "Rows", "Ready", "Quarantine", "Missing match", "Market-only"],
            [
                [
                    row["model_run_id"],
                    row["run_date"],
                    row["rows"],
                    row["settlement_ready"],
                    row["quarantine"],
                    row["missing_match"],
                    row["market_only"],
                ]
                for row in summary["by_run"]
            ],
        ),
        "",
        "## Examples",
        "",
    ]
    for readiness, examples in report["examples_by_readiness"].items():
        lines.extend(
            [
                f"### {readiness}",
                "",
                markdown_table(
                    ["Run", "Prediction row", "Match", "Selection", "Winner", "Bucket"],
                    [
                        [
                            row["model_run_id"],
                            row["prediction_row_id"],
                            row["match_id"],
                            row["selection"],
                            row["winner_name"],
                            row["bucket"],
                        ]
                        for row in examples
                    ],
                ),
                "",
            ]
        )
    lines.extend(
        [
            "## Notes",
            "",
            "- This report is read-only and does not write settlement rows.",
            "- TEN-T0 rows are quarantined because the cartridge is archived forensic output.",
            "- Match-winner rows are only marked settlement-ready when a winner name exists and the prediction resolves to a DB match.",
            "- Non-ML lanes with score evidence still need lane-specific settlement rules before writing grades.",
            "",
        ]
    )
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text("\n".join(lines), encoding="utf-8")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Audit tennis settlement readiness without writing grades.")
    parser.add_argument("--db", type=Path, default=DEFAULT_DB)
    parser.add_argument("--out", type=Path, default=DEFAULT_JSON)
    parser.add_argument("--markdown", type=Path, default=DEFAULT_MARKDOWN)
    parser.add_argument("--start-date")
    parser.add_argument("--end-date")
    parser.add_argument("--examples-per-status", type=int, default=12)
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
