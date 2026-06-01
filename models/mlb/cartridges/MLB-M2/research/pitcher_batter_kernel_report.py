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


def table_count(conn: sqlite3.Connection, table_name: str, start: str, end: str) -> int:
    return int(
        conn.execute(
            f"SELECT COUNT(*) AS rows FROM {table_name} WHERE snapshot_date BETWEEN ? AND ?",
            (start, end),
        ).fetchone()["rows"]
    )


def pitch_type_summary(conn: sqlite3.Connection, start: str, end: str) -> list[dict[str, Any]]:
    return [
        dict(row)
        for row in conn.execute(
            """
            SELECT pitch_type,
                   COUNT(*) AS rows,
                   ROUND(AVG(sample_pitches), 1) AS avg_sample,
                   ROUND(AVG(pitch_share), 3) AS avg_share,
                   ROUND(AVG(command_leak), 3) AS avg_command_leak,
                   ROUND(AVG(damage_allowed), 3) AS avg_damage_allowed
            FROM mlb_pitcher_pitch_mix_daily
            WHERE snapshot_date BETWEEN ? AND ?
            GROUP BY pitch_type
            ORDER BY rows DESC
            LIMIT 15
            """,
            (start, end),
        ).fetchall()
    ]


def matchup_rows(conn: sqlite3.Connection, start: str, end: str) -> list[sqlite3.Row]:
    return conn.execute(
        """
        SELECT m.*,
               g.away_team, g.home_team,
               o.away_runs_first5, o.home_runs_first5, o.total_runs_first5,
               o.away_runs_final, o.home_runs_final, o.total_runs_final
        FROM mlb_lineup_pitcher_matchup_daily m
        JOIN mlb_games g ON g.game_pk = m.game_pk
        LEFT JOIN mlb_game_outcomes o ON o.game_pk = m.game_pk
        WHERE m.snapshot_date BETWEEN ? AND ?
          AND m.hitter_id = 0
        """,
        (start, end),
    ).fetchall()


def percentile(values: list[float], pct: float) -> float:
    if not values:
        return 0.0
    ordered = sorted(values)
    index = min(len(ordered) - 1, max(0, round((len(ordered) - 1) * pct)))
    return ordered[index]


def team_first5_runs(row: sqlite3.Row) -> int:
    if row["team_name"] == row["away_team"]:
        return int(row["away_runs_first5"] or 0)
    if row["team_name"] == row["home_team"]:
        return int(row["home_runs_first5"] or 0)
    return 0


def matchup_signal_checks(rows: list[sqlite3.Row]) -> dict[str, Any]:
    collapse_values = [float(row["collapse_trigger_score"] or 0) for row in rows]
    damage_values = [float(row["damage_fit"] or 0) for row in rows]
    command_values = [float(row["command_stress"] or 0) for row in rows]
    thresholds = {
        "collapseTopQuartile": percentile(collapse_values, 0.75),
        "damageTopQuartile": percentile(damage_values, 0.75),
        "commandTopQuartile": percentile(command_values, 0.75),
    }
    checks = {}
    for key, threshold in thresholds.items():
        metric = {
            "collapseTopQuartile": "collapse_trigger_score",
            "damageTopQuartile": "damage_fit",
            "commandTopQuartile": "command_stress",
        }[key]
        selected = [row for row in rows if float(row[metric] or 0) >= threshold]
        checks[key] = {
            "threshold": round(threshold, 2),
            "rows": len(selected),
            "teamF5RunsPerRow": round(sum(team_first5_runs(row) for row in selected) / len(selected), 3)
            if selected
            else None,
            "teamF5ThreePlusRate": round(sum(1 for row in selected if team_first5_runs(row) >= 3) / len(selected), 3)
            if selected
            else None,
            "gameF5Over4Rate": round(
                sum(1 for row in selected if int(row["total_runs_first5"] or 0) >= 5) / len(selected), 3
            )
            if selected
            else None,
        }
    return checks


def daily_coverage(conn: sqlite3.Connection, start: str, end: str) -> list[dict[str, Any]]:
    return [
        dict(row)
        for row in conn.execute(
            """
            SELECT snapshot_date,
                   SUM(CASE WHEN hitter_id = 0 THEN 1 ELSE 0 END) AS lineup_rows,
                   SUM(CASE WHEN hitter_id != 0 THEN 1 ELSE 0 END) AS hitter_rows,
                   ROUND(AVG(CASE WHEN hitter_id = 0 THEN collapse_trigger_score END), 1) AS avg_lineup_collapse,
                   ROUND(AVG(CASE WHEN hitter_id = 0 THEN damage_fit END), 1) AS avg_lineup_damage
            FROM mlb_lineup_pitcher_matchup_daily
            WHERE snapshot_date BETWEEN ? AND ?
            GROUP BY snapshot_date
            ORDER BY snapshot_date
            """,
            (start, end),
        ).fetchall()
    ]


def markdown(report: dict[str, Any]) -> str:
    lines = [
        "# MLB-M2 Pitcher-Batter Kernel Report",
        "",
        f"Range: {report['range']['start']} to {report['range']['end']}",
        "",
        "## Coverage",
        "",
        f"- Pitch mix rows: {report['coverage']['pitchMix']}",
        f"- Hitter response rows: {report['coverage']['hitterResponse']}",
        f"- Matchup rows: {report['coverage']['matchups']}",
        "",
        "## Pitch-Type Mix",
        "",
    ]
    for row in report["pitchTypes"]:
        lines.append(
            f"- {row['pitch_type']}: {row['rows']} rows, avg share {row['avg_share']}, "
            f"leak {row['avg_command_leak']}, damage {row['avg_damage_allowed']}"
        )
    lines.extend(["", "## Lineup Matchup Daily Coverage", ""])
    for row in report["dailyCoverage"]:
        lines.append(
            f"- {row['snapshot_date']}: {row['lineup_rows']} lineup rows, "
            f"{row['hitter_rows']} hitter rows, avg collapse {row['avg_lineup_collapse']}, "
            f"avg damage {row['avg_lineup_damage']}"
        )
    lines.extend(["", "## Rough Signal Checks", ""])
    for name, row in report["signalChecks"].items():
        lines.append(
            f"- {name}: threshold {row['threshold']}, rows {row['rows']}, "
            f"team F5 3+ {row['teamF5ThreePlusRate']}, game F5 over 4 {row['gameF5Over4Rate']}"
        )
    lines.extend(
        [
            "",
            "This report is a research surface. It verifies pitch-event coverage and rough early-scoring association only; it does not promote a matchup lane.",
        ]
    )
    return "\n".join(lines)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--start", default="2026-05-23")
    parser.add_argument("--end", default="2026-05-31")
    args = parser.parse_args()

    conn = connect()
    rows = matchup_rows(conn, args.start, args.end)
    report = {
        "schemaVersion": 1,
        "modelId": "MLB-M2",
        "experiment": "pitcher_batter_kernel_report",
        "range": {"start": args.start, "end": args.end},
        "coverage": {
            "pitchMix": table_count(conn, "mlb_pitcher_pitch_mix_daily", args.start, args.end),
            "hitterResponse": table_count(conn, "mlb_hitter_pitch_type_response_daily", args.start, args.end),
            "matchups": table_count(conn, "mlb_lineup_pitcher_matchup_daily", args.start, args.end),
        },
        "pitchTypes": pitch_type_summary(conn, args.start, args.end),
        "dailyCoverage": daily_coverage(conn, args.start, args.end),
        "signalChecks": matchup_signal_checks(rows),
    }
    conn.close()

    REPORT_DIR.mkdir(parents=True, exist_ok=True)
    PRIVATE_REPORT_DIR.mkdir(parents=True, exist_ok=True)
    safe_range = f"{args.start}-to-{args.end}"
    md_path = REPORT_DIR / f"pitcher-batter-kernel-report-{safe_range}.md"
    json_path = PRIVATE_REPORT_DIR / f"mlb-m2-pitcher-batter-kernel-report-{safe_range}.json"
    md_path.write_text(markdown(report))
    json_path.write_text(json.dumps(report, indent=2, sort_keys=True))
    print(f"Wrote {md_path}")
    print(f"Wrote {json_path}")
    print(json.dumps(report["coverage"], indent=2))


if __name__ == "__main__":
    main()
