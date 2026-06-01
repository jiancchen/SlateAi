#!/usr/bin/env python3

from __future__ import annotations

import argparse
import json
import sqlite3
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[5]
DB_PATH = ROOT / "data-private" / "warehouse" / "sports.db"
REPORT_DIR = ROOT / "models" / "mlb" / "cartridges" / "MLB-M2" / "reports"
PRIVATE_REPORT_DIR = ROOT / "data-private" / "reports"


def connect() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def table_count(conn: sqlite3.Connection, table_name: str, start: str, end: str) -> int:
    return int(
        conn.execute(
            f"SELECT COUNT(*) AS rows FROM {table_name} WHERE snapshot_date BETWEEN ? AND ?",
            (start, end),
        ).fetchone()["rows"]
    )


def type_metric_counts(conn: sqlite3.Connection, start: str, end: str) -> list[dict[str, Any]]:
    return [
        dict(row)
        for row in conn.execute(
            """
            SELECT player_type, metric, COUNT(*) AS rows,
                   ROUND(AVG(sample_size), 1) AS avg_sample,
                   ROUND(AVG(volatility_score), 1) AS avg_volatility,
                   ROUND(AVG(current_deviation), 4) AS avg_deviation
            FROM mlb_player_identity_curves_daily
            WHERE snapshot_date BETWEEN ? AND ?
            GROUP BY player_type, metric
            ORDER BY player_type, metric
            """,
            (start, end),
        ).fetchall()
    ]


def deviation_counts(conn: sqlite3.Connection, start: str, end: str) -> dict[str, int]:
    rows = conn.execute(
        """
        SELECT deviation_label, COUNT(*) AS rows
        FROM mlb_player_current_deviation_daily
        WHERE snapshot_date BETWEEN ? AND ?
        GROUP BY deviation_label
        ORDER BY rows DESC
        """,
        (start, end),
    ).fetchall()
    return {row["deviation_label"]: int(row["rows"]) for row in rows}


def freshness(conn: sqlite3.Connection) -> dict[str, Any]:
    rows = conn.execute(
        """
        SELECT player_type, MIN(snapshot_date) AS min_date, MAX(snapshot_date) AS max_date, COUNT(*) AS rows
        FROM mlb_player_identity_curves_daily
        GROUP BY player_type
        ORDER BY player_type
        """
    ).fetchall()
    return {row["player_type"]: dict(row) for row in rows}


def outcome_column_for_metric(metric: str) -> str | None:
    return {
        "hits_per_pa": "hits",
        "total_bases_per_pa": "total_bases",
        "walk_rate": "walks",
        "strikeout_rate": "strikeouts",
        "home_run_rate": "home_runs",
    }.get(metric)


def signal_threshold(metric: str, row: sqlite3.Row) -> tuple[bool, bool] | None:
    actual_column = outcome_column_for_metric(metric)
    if not actual_column:
        return None
    actual_value = int(row[actual_column] or 0)
    p75 = float(row["distribution_p75"] or 0)
    p90 = float(row["distribution_p90"] or 0)
    mean = float(row["distribution_mean"] or 0)
    if metric == "total_bases_per_pa":
        return p75 >= 2.0, actual_value >= 2
    if metric == "home_run_rate":
        return p90 >= 0.8 or mean >= 0.24, actual_value >= 1
    return p75 >= 1.0, actual_value >= 1


def distribution_signal_checks(conn: sqlite3.Connection, start: str, end: str) -> dict[str, Any]:
    rows = conn.execute(
        """
        SELECT d.*, o.hits, o.total_bases, o.walks, o.strikeouts, o.home_runs
        FROM mlb_player_game_distribution_daily d
        JOIN mlb_batter_game_outcomes o
          ON o.game_pk = d.game_pk
         AND o.player_id = d.player_id
        WHERE d.snapshot_date BETWEEN ? AND ?
          AND d.player_type = 'hitter'
          AND d.metric IN ('hits_per_pa', 'total_bases_per_pa', 'walk_rate', 'strikeout_rate', 'home_run_rate')
        """,
        (start, end),
    ).fetchall()
    by_metric: dict[str, dict[str, int]] = defaultdict(lambda: {"rows": 0, "predicted": 0, "actual": 0, "hits": 0})
    by_bucket: Counter[str] = Counter()
    examples: list[dict[str, Any]] = []
    for row in rows:
        check = signal_threshold(row["metric"], row)
        if check is None:
            continue
        predicted, actual = check
        metric = row["metric"]
        by_metric[metric]["rows"] += 1
        by_metric[metric]["predicted"] += 1 if predicted else 0
        by_metric[metric]["actual"] += 1 if actual else 0
        by_metric[metric]["hits"] += 1 if predicted == actual else 0
        if predicted:
            by_bucket[f"{metric}:{row['player_type']}"] += 1
        if predicted and len(examples) < 12:
            examples.append(
                {
                    "date": row["snapshot_date"],
                    "player": row["player_name"],
                    "metric": metric,
                    "mean": round(float(row["distribution_mean"] or 0), 3),
                    "p75": round(float(row["distribution_p75"] or 0), 3),
                    "p90": round(float(row["distribution_p90"] or 0), 3),
                    "actualPositive": actual,
                    "hit": predicted == actual,
                }
            )
    summary: dict[str, Any] = {}
    for metric, counts in by_metric.items():
        rows_count = counts["rows"]
        summary[metric] = {
            **counts,
            "signalRate": round(counts["predicted"] / rows_count, 3) if rows_count else None,
            "actualRate": round(counts["actual"] / rows_count, 3) if rows_count else None,
            "directionHitRate": round(counts["hits"] / rows_count, 3) if rows_count else None,
        }
    return {"byMetric": summary, "examples": examples}


def markdown(report: dict[str, Any]) -> str:
    lines = [
        "# MLB-M2 Player Identity Rows Report",
        "",
        f"Range: {report['range']['start']} to {report['range']['end']}",
        "",
        "## Coverage",
        "",
        f"- Identity curves: {report['coverage']['curves']}",
        f"- Current deviations: {report['coverage']['deviations']}",
        f"- Game distributions: {report['coverage']['distributions']}",
        "",
        "## Freshness",
        "",
    ]
    for player_type, row in report["freshness"].items():
        lines.append(f"- {player_type}: {row['min_date']} to {row['max_date']} ({row['rows']} rows)")
    lines.extend(["", "## Type / Metric Coverage", ""])
    for row in report["typeMetricCounts"]:
        lines.append(
            f"- {row['player_type']} {row['metric']}: {row['rows']} rows, "
            f"avg sample {row['avg_sample']}, avg vol {row['avg_volatility']}"
        )
    lines.extend(["", "## Deviation Labels", ""])
    for label, count in report["deviationCounts"].items():
        lines.append(f"- {label}: {count}")
    lines.extend(["", "## Rough Hitter Signal Checks", ""])
    for metric, row in report["signalChecks"]["byMetric"].items():
        lines.append(
            f"- {metric}: direction {row['directionHitRate']} on {row['rows']} rows; "
            f"signal rate {row['signalRate']}; actual rate {row['actualRate']}"
        )
    lines.extend(
        [
            "",
            "This report is a research surface. It validates coverage and rough signal behavior only; it does not promote player identity rows to the value board.",
        ]
    )
    return "\n".join(lines)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--start", default="2026-05-23")
    parser.add_argument("--end", default="2026-05-31")
    args = parser.parse_args()

    conn = connect()
    report = {
        "schemaVersion": 1,
        "modelId": "MLB-M2",
        "experiment": "player_identity_rows_report",
        "range": {"start": args.start, "end": args.end},
        "coverage": {
            "curves": table_count(conn, "mlb_player_identity_curves_daily", args.start, args.end),
            "deviations": table_count(conn, "mlb_player_current_deviation_daily", args.start, args.end),
            "distributions": table_count(conn, "mlb_player_game_distribution_daily", args.start, args.end),
        },
        "freshness": freshness(conn),
        "typeMetricCounts": type_metric_counts(conn, args.start, args.end),
        "deviationCounts": deviation_counts(conn, args.start, args.end),
        "signalChecks": distribution_signal_checks(conn, args.start, args.end),
    }
    conn.close()

    REPORT_DIR.mkdir(parents=True, exist_ok=True)
    PRIVATE_REPORT_DIR.mkdir(parents=True, exist_ok=True)
    safe_range = f"{args.start}-to-{args.end}"
    md_path = REPORT_DIR / f"player-identity-rows-report-{safe_range}.md"
    json_path = PRIVATE_REPORT_DIR / f"mlb-m2-player-identity-rows-report-{safe_range}.json"
    md_path.write_text(markdown(report))
    json_path.write_text(json.dumps(report, indent=2, sort_keys=True))
    print(f"Wrote {md_path}")
    print(f"Wrote {json_path}")
    print(json.dumps(report["coverage"], indent=2))


if __name__ == "__main__":
    main()
