#!/usr/bin/env python3

from __future__ import annotations

import argparse
import json
import sqlite3
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


def rows_to_dicts(rows: list[sqlite3.Row]) -> list[dict[str, Any]]:
    return [dict(row) for row in rows]


def state_summary(conn: sqlite3.Connection, start: str, end: str) -> list[dict[str, Any]]:
    return rows_to_dicts(
        conn.execute(
            """
            SELECT lane, phase, predicted_market_expression AS expression,
                   COUNT(*) AS rows,
                   SUM(CASE WHEN hit_flag = 1 THEN 1 ELSE 0 END) AS hits,
                   ROUND(AVG(CASE WHEN hit_flag IS NOT NULL THEN hit_flag END), 3) AS hit_rate
            FROM mlb_state_formula_backtests
            WHERE prediction_date BETWEEN ? AND ?
            GROUP BY lane, phase, expression
            ORDER BY lane, phase, rows DESC
            """,
            (start, end),
        ).fetchall()
    )


def player_summary(conn: sqlite3.Connection, start: str, end: str) -> list[dict[str, Any]]:
    return rows_to_dicts(
        conn.execute(
            """
            SELECT metric, sample_size_bucket, deviation_bucket,
                   COUNT(*) AS rows,
                   SUM(CASE WHEN hit_flag = 1 THEN 1 ELSE 0 END) AS hits,
                   ROUND(AVG(hit_flag), 3) AS hit_rate,
                   ROUND(AVG(predicted_value), 3) AS avg_predicted,
                   ROUND(AVG(actual_value), 3) AS avg_actual
            FROM mlb_player_identity_model_backtests
            WHERE prediction_date BETWEEN ? AND ?
            GROUP BY metric, sample_size_bucket, deviation_bucket
            ORDER BY metric, rows DESC
            """,
            (start, end),
        ).fetchall()
    )


def holdout_summary(conn: sqlite3.Connection, holdout_date: str) -> dict[str, Any]:
    state = rows_to_dicts(
        conn.execute(
            """
            SELECT lane, COUNT(*) AS rows,
                   SUM(CASE WHEN hit_flag = 1 THEN 1 ELSE 0 END) AS hits,
                   ROUND(AVG(CASE WHEN hit_flag IS NOT NULL THEN hit_flag END), 3) AS hit_rate
            FROM mlb_state_formula_backtests
            WHERE prediction_date = ?
            GROUP BY lane
            ORDER BY lane
            """,
            (holdout_date,),
        ).fetchall()
    )
    player = rows_to_dicts(
        conn.execute(
            """
            SELECT metric, COUNT(*) AS rows,
                   SUM(CASE WHEN hit_flag = 1 THEN 1 ELSE 0 END) AS hits,
                   ROUND(AVG(hit_flag), 3) AS hit_rate
            FROM mlb_player_identity_model_backtests
            WHERE prediction_date = ?
            GROUP BY metric
            ORDER BY metric
            """,
            (holdout_date,),
        ).fetchall()
    )
    return {"date": holdout_date, "state": state, "player": player}


def coverage(conn: sqlite3.Connection, start: str, end: str) -> dict[str, Any]:
    state_rows = conn.execute(
        """
        SELECT lane, COUNT(*) AS rows
        FROM mlb_state_formula_backtests
        WHERE prediction_date BETWEEN ? AND ?
        GROUP BY lane
        ORDER BY lane
        """,
        (start, end),
    ).fetchall()
    player_rows = conn.execute(
        """
        SELECT COUNT(*) AS rows
        FROM mlb_player_identity_model_backtests
        WHERE prediction_date BETWEEN ? AND ?
        """,
        (start, end),
    ).fetchone()
    return {
        "stateByLane": {row["lane"]: row["rows"] for row in state_rows},
        "playerIdentity": player_rows["rows"],
    }


def markdown(report: dict[str, Any]) -> str:
    lines = [
        "# MLB-M2 Research Backtest Report",
        "",
        f"Range: {report['range']['start']} to {report['range']['end']}",
        "",
        "## Coverage",
        "",
    ]
    for lane, rows in report["coverage"]["stateByLane"].items():
        lines.append(f"- {lane}: {rows} rows")
    lines.append(f"- player_identity: {report['coverage']['playerIdentity']} rows")
    lines.extend(["", "## State / Kernel Rows", ""])
    for row in report["stateSummary"]:
        lines.append(
            f"- {row['lane']} {row['phase']} {row['expression']}: "
            f"{row['hits']}/{row['rows']} hit, rate {row['hit_rate']}"
        )
    lines.extend(["", "## Player Identity Rows", ""])
    for row in report["playerSummary"][:40]:
        lines.append(
            f"- {row['metric']} {row['sample_size_bucket']}/{row['deviation_bucket']}: "
            f"{row['hits']}/{row['rows']} hit, rate {row['hit_rate']}"
        )
    lines.extend(["", "## Holdout", ""])
    lines.append(f"Date: {report['holdout']['date']}")
    for row in report["holdout"]["state"]:
        lines.append(f"- {row['lane']}: {row['hits']}/{row['rows']} hit, rate {row['hit_rate']}")
    for row in report["holdout"]["player"]:
        lines.append(f"- player {row['metric']}: {row['hits']}/{row['rows']} hit, rate {row['hit_rate']}")
    lines.extend(
        [
            "",
            "This is a research backtest artifact. It stores bucket correctness, but no lane is promoted until walk-forward and price/ROI gates are added.",
        ]
    )
    return "\n".join(lines)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--start", default="2026-05-23")
    parser.add_argument("--end", default="2026-05-31")
    parser.add_argument("--holdout", default="2026-05-31")
    args = parser.parse_args()

    conn = connect()
    report = {
        "schemaVersion": 1,
        "modelId": "MLB-M2",
        "experiment": "m2_research_backtest_report",
        "range": {"start": args.start, "end": args.end},
        "coverage": coverage(conn, args.start, args.end),
        "stateSummary": state_summary(conn, args.start, args.end),
        "playerSummary": player_summary(conn, args.start, args.end),
        "holdout": holdout_summary(conn, args.holdout),
    }
    conn.close()

    REPORT_DIR.mkdir(parents=True, exist_ok=True)
    PRIVATE_REPORT_DIR.mkdir(parents=True, exist_ok=True)
    safe_range = f"{args.start}-to-{args.end}"
    md_path = REPORT_DIR / f"m2-research-backtest-report-{safe_range}.md"
    json_path = PRIVATE_REPORT_DIR / f"mlb-m2-research-backtest-report-{safe_range}.json"
    md_path.write_text(markdown(report))
    json_path.write_text(json.dumps(report, indent=2, sort_keys=True))
    print(f"Wrote {md_path}")
    print(f"Wrote {json_path}")
    print(json.dumps(report["coverage"], indent=2))


if __name__ == "__main__":
    main()
