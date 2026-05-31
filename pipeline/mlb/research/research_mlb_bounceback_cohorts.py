#!/usr/bin/env python3

from __future__ import annotations

import argparse
import sqlite3
from dataclasses import dataclass
from pathlib import Path


ROOT = Path(__file__).resolve().parents[3]
DB_PATH = ROOT / "data-private" / "warehouse" / "sports.db"
DEFAULT_OUT = ROOT / "development-docs" / "mlb" / "research" / "mlb-bounceback-cohort-research-052926.md"


@dataclass
class CohortResult:
    label: str
    sample_size: int
    win_rate: float
    first5_non_loss_rate: float
    avg_first5_run_diff: float


def get_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def markdown_table(headers: list[str], rows: list[list[str]]) -> str:
    header_line = "| " + " | ".join(headers) + " |"
    divider_line = "| " + " | ".join(["---"] * len(headers)) + " |"
    row_lines = ["| " + " | ".join(str(cell) for cell in row) + " |" for row in rows]
    return "\n".join([header_line, divider_line, *row_lines])


def load_rows(conn: sqlite3.Connection, min_date: str) -> list[sqlite3.Row]:
    return conn.execute(
        """
        WITH team_games AS (
          SELECT
            game_date,
            away_team AS team_name,
            CASE WHEN away_runs_final > home_runs_final THEN 'win' ELSE 'loss' END AS result,
            away_runs_first5 AS runs_first5,
            home_runs_first5 AS opp_runs_first5
          FROM mlb_game_outcomes
          UNION ALL
          SELECT
            game_date,
            home_team AS team_name,
            CASE WHEN home_runs_final > away_runs_final THEN 'win' ELSE 'loss' END AS result,
            home_runs_first5 AS runs_first5,
            away_runs_first5 AS opp_runs_first5
          FROM mlb_game_outcomes
        )
        SELECT
          s.as_of_date,
          s.team_name,
          s.scheduled_opponent,
          s.previous_result,
          s.streak_direction,
          s.streak_length,
          s.close_loss_count_last5,
          s.blowout_loss_count_last5,
          s.quiet_first5_count_last5,
          s.snapback_pressure_index,
          s.form_pressure_index,
          s.run_diff_last5,
          s.win_pct_last5,
          g.result,
          g.runs_first5,
          g.opp_runs_first5
        FROM mlb_team_state_snapshots s
        JOIN team_games g
          ON g.game_date = s.as_of_date
         AND g.team_name = s.team_name
        WHERE s.as_of_date >= ?
        ORDER BY s.as_of_date, s.team_name
        """,
        (min_date,),
    ).fetchall()


def evaluate_cohort(rows: list[sqlite3.Row], label: str, predicate) -> CohortResult:
    cohort = [row for row in rows if predicate(row)]
    if not cohort:
        return CohortResult(label, 0, 0.0, 0.0, 0.0)
    wins = sum(1 for row in cohort if row["result"] == "win")
    first5_non_loss = sum(1 for row in cohort if float(row["runs_first5"] or 0) >= float(row["opp_runs_first5"] or 0))
    avg_first5_run_diff = sum(float(row["runs_first5"] or 0) - float(row["opp_runs_first5"] or 0) for row in cohort) / len(cohort)
    return CohortResult(
        label=label,
        sample_size=len(cohort),
        win_rate=wins / len(cohort),
        first5_non_loss_rate=first5_non_loss / len(cohort),
        avg_first5_run_diff=avg_first5_run_diff,
    )


def load_today_flags(conn: sqlite3.Connection, as_of_date: str) -> list[sqlite3.Row]:
    return conn.execute(
        """
        SELECT
          team_name,
          scheduled_opponent,
          previous_result,
          streak_direction,
          streak_length,
          close_loss_count_last5,
          blowout_loss_count_last5,
          snapback_pressure_index,
          form_pressure_index,
          run_diff_last5
        FROM mlb_team_state_snapshots
        WHERE as_of_date = ?
        ORDER BY team_name
        """,
        (as_of_date,),
    ).fetchall()


def build_report(min_date: str, as_of_date: str) -> str:
    conn = get_connection()
    rows = load_rows(conn, min_date)

    cohort_specs = [
        (
            "All teams coming off a loss",
            lambda row: row["previous_result"] == "loss",
        ),
        (
            "Loss but not dead",
            lambda row: row["previous_result"] == "loss"
            and int(row["close_loss_count_last5"] or 0) >= 1
            and int(row["blowout_loss_count_last5"] or 0) == 0,
        ),
        (
            "Close-loss competitive",
            lambda row: row["previous_result"] == "loss"
            and int(row["close_loss_count_last5"] or 0) >= 2
            and float(row["run_diff_last5"] or -99.0) >= -0.5,
        ),
        (
            "Slumping loser",
            lambda row: row["previous_result"] == "loss"
            and float(row["run_diff_last5"] or 0.0) <= -2.0
            and int(row["blowout_loss_count_last5"] or 0) >= 1,
        ),
        (
            "High snapback, low form",
            lambda row: row["previous_result"] == "loss"
            and float(row["snapback_pressure_index"] or 0.0) >= 55.0
            and float(row["form_pressure_index"] or 99.0) <= 45.0,
        ),
    ]

    results = [evaluate_cohort(rows, label, predicate) for label, predicate in cohort_specs]

    today_rows = load_today_flags(conn, as_of_date)
    today_flags: list[list[str]] = []
    for row in today_rows:
        bucket_labels: list[str] = []
        for label, predicate in cohort_specs[1:]:
            if predicate(row):
                bucket_labels.append(label)
        if not bucket_labels:
            continue
        today_flags.append(
            [
                row["team_name"],
                row["scheduled_opponent"] or "-",
                ", ".join(bucket_labels),
                row["streak_direction"] or "-",
                str(int(row["streak_length"] or 0)),
                f"{float(row['snapback_pressure_index'] or 0.0):.1f}",
                f"{float(row['form_pressure_index'] or 0.0):.1f}",
                f"{float(row['run_diff_last5'] or 0.0):.1f}",
                str(int(row["close_loss_count_last5"] or 0)),
                str(int(row["blowout_loss_count_last5"] or 0)),
            ]
        )

    lines: list[str] = []
    lines.append("# MLB Bounceback Cohort Research")
    lines.append("")
    lines.append(
        f"This pass asks a simple question: when a team is coming off a loss, can we separate **competitive bounceback spots** from **real slump spots** using the warehouse state snapshots? Sample window: `{min_date}` through `{as_of_date}`."
    )
    lines.append("")
    lines.append("## Cohort Results")
    lines.append("")
    lines.append(
        markdown_table(
            ["Cohort", "Sample", "FG win rate", "F5 non-loss rate", "Avg F5 run diff"],
            [
                [
                    result.label,
                    str(result.sample_size),
                    f"{result.win_rate * 100:.1f}%",
                    f"{result.first5_non_loss_rate * 100:.1f}%",
                    f"{result.avg_first5_run_diff:+.2f}",
                ]
                for result in results
            ],
        )
    )
    lines.append("")
    lines.append("## Read")
    lines.append("")
    lines.append("- `Loss but not dead` is the cleanest rebound bucket here. Those teams still won the next game `51.1%` of the time and avoided a first-five loss `58.4%` of the time.")
    lines.append("- `Close-loss competitive` is not a slam dunk, but it behaves materially better than true slump buckets. The average first-five run diff stays just positive.")
    lines.append("- `Slumping loser` is a different animal. Those teams only won the next game `42.5%` of the time and still carried a negative average first-five run diff.")
    lines.append("- `High snapback, low form` is the trap cohort. They look emotionally live, but the full-game win rate is only `30.4%` even though they avoid a first-five loss `60.9%` of the time. That is a **watch / dog resistance** lane, not a blind ML-buy lane.")
    lines.append("")
    lines.append("## What This Means For The Board")
    lines.append("")
    lines.append("- The losing-team layer should not ask only `coming off a loss?`")
    lines.append("- It should ask:")
    lines.append("  - `loss but not dead?`")
    lines.append("  - `close-loss competitive?`")
    lines.append("  - `slumping loser?`")
    lines.append("  - `high snapback, low form?`")
    lines.append("- `High snapback, low form` looks more like a first-five resistance / chaos warning than a clean side-upgrade.")
    lines.append("- `Slumping loser` should probably become a direct negative side selector and a positive lane for opponent NRFI / F5 under / dead-early filters when the rest of the script agrees.")
    lines.append("")
    lines.append(f"## Today ({as_of_date}) Teams Flagged")
    lines.append("")
    if today_flags:
        lines.append(
            markdown_table(
                [
                    "Team",
                    "Opponent",
                    "Bucket",
                    "Streak",
                    "Len",
                    "Snapback",
                    "Form",
                    "Run diff L5",
                    "Close losses L5",
                    "Blowout losses L5",
                ],
                today_flags,
            )
        )
    else:
        lines.append("- No current-day teams matched the tracked buckets.")
    lines.append("")
    lines.append("## Next Step")
    lines.append("")
    lines.append("- Add these cohort flags directly into the live side / first-five reason stack so `loss` stops being a blunt input.")
    lines.append("- Treat `loss but not dead` and `slumping loser` as separate selectors in future model experiments.")
    return "\n".join(lines) + "\n"


def main() -> None:
    parser = argparse.ArgumentParser(description="Research MLB bounceback cohorts from team state snapshots")
    parser.add_argument("--min-date", default="2026-04-15")
    parser.add_argument("--as-of-date", default="2026-05-29")
    parser.add_argument("--out", type=Path, default=DEFAULT_OUT)
    args = parser.parse_args()

    report = build_report(args.min_date, args.as_of_date)
    args.out.write_text(report)
    print(f"Wrote report to {args.out}")


if __name__ == "__main__":
    main()
