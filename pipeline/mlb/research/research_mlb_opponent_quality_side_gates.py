#!/usr/bin/env python3

from __future__ import annotations

import argparse
import sqlite3
from dataclasses import dataclass
from pathlib import Path


ROOT = Path(__file__).resolve().parents[3]
DB_PATH = ROOT / "data-private" / "warehouse" / "sports.db"
DEFAULT_OUT = ROOT / "development-docs" / "mlb" / "research" / "mlb-opponent-quality-side-gates-052926.md"


@dataclass
class CohortResult:
    label: str
    sample_size: int
    fg_win_rate: float
    f5_non_loss_rate: float
    avg_f5_run_diff: float


def get_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def markdown_table(headers: list[str], rows: list[list[str]]) -> str:
    header_line = "| " + " | ".join(headers) + " |"
    divider_line = "| " + " | ".join(["---"] * len(headers)) + " |"
    row_lines = ["| " + " | ".join(str(cell) for cell in row) + " |" for row in rows]
    return "\n".join([header_line, divider_line, *row_lines])


def pct(value: float) -> str:
    return f"{value * 100:.1f}%"


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
          s.snapback_pressure_index,
          s.form_pressure_index,
          s.run_diff_last5,
          oq.schedule_toughness_index_last10,
          oq.games_vs_550_last10,
          oq.close_losses_vs_winning_record_last10,
          g.result,
          g.runs_first5,
          g.opp_runs_first5
        FROM mlb_team_state_snapshots s
        JOIN mlb_team_opponent_quality_daily oq
          ON oq.as_of_date = s.as_of_date
         AND oq.team_name = s.team_name
        JOIN team_games g
          ON g.game_date = s.as_of_date
         AND g.team_name = s.team_name
        WHERE s.as_of_date >= ?
        ORDER BY s.as_of_date, s.team_name
        """,
        (min_date,),
    ).fetchall()


def compute_quartiles(rows: list[sqlite3.Row]) -> tuple[float, float]:
    values = sorted(float(row["schedule_toughness_index_last10"] or 0.0) for row in rows)
    q1 = values[len(values) // 4]
    q3 = values[(len(values) * 3) // 4]
    return q1, q3


def evaluate(rows: list[sqlite3.Row], label: str, predicate) -> CohortResult:
    cohort = [row for row in rows if predicate(row)]
    if not cohort:
        return CohortResult(label, 0, 0.0, 0.0, 0.0)
    fg_wins = sum(1 for row in cohort if row["result"] == "win")
    f5_non_loss = sum(1 for row in cohort if float(row["runs_first5"] or 0) >= float(row["opp_runs_first5"] or 0))
    avg_f5_run_diff = sum(float(row["runs_first5"] or 0) - float(row["opp_runs_first5"] or 0) for row in cohort) / len(cohort)
    return CohortResult(label, len(cohort), fg_wins / len(cohort), f5_non_loss / len(cohort), avg_f5_run_diff)


def main() -> None:
    parser = argparse.ArgumentParser(description="Research opponent-quality side gates from warehouse context tables")
    parser.add_argument("--min-date", default="2026-04-15")
    parser.add_argument("--out", type=Path, default=DEFAULT_OUT)
    args = parser.parse_args()

    conn = get_connection()
    rows = load_rows(conn, args.min_date)
    q1, q3 = compute_quartiles(rows)

    def loss_but_not_dead(row: sqlite3.Row) -> bool:
        return (
            row["previous_result"] == "loss"
            and int(row["close_loss_count_last5"] or 0) >= 1
            and int(row["blowout_loss_count_last5"] or 0) == 0
        )

    def slumping_loser(row: sqlite3.Row) -> bool:
        return (
            row["previous_result"] == "loss"
            and float(row["run_diff_last5"] or 0.0) <= -2.0
            and int(row["blowout_loss_count_last5"] or 0) >= 1
        )

    cohort_specs = [
        ("All teams", lambda row: True),
        ("Loss but not dead", loss_but_not_dead),
        ("Loss but not dead + hard schedule", lambda row: loss_but_not_dead(row) and float(row["schedule_toughness_index_last10"] or 0.0) >= q3),
        ("Loss but not dead + soft schedule", lambda row: loss_but_not_dead(row) and float(row["schedule_toughness_index_last10"] or 0.0) <= q1),
        ("Slumping loser", slumping_loser),
        ("Slumping loser + hard schedule", lambda row: slumping_loser(row) and float(row["schedule_toughness_index_last10"] or 0.0) >= q3),
        ("Slumping loser + soft schedule", lambda row: slumping_loser(row) and float(row["schedule_toughness_index_last10"] or 0.0) <= q1),
        ("2+ close losses vs winning opponents", lambda row: int(row["close_losses_vs_winning_record_last10"] or 0) >= 2),
        ("2+ games vs .550 opponents in last 10", lambda row: int(row["games_vs_550_last10"] or 0) >= 2),
    ]

    results = [evaluate(rows, label, predicate) for label, predicate in cohort_specs]

    lines: list[str] = []
    lines.append("# MLB Opponent-Quality Side Gates — May 29, 2026")
    lines.append("")
    lines.append(
        f"This pass combines the new opponent-quality table with the existing bounceback/slump buckets. Sample window: `{args.min_date}` through `2026-05-29`."
    )
    lines.append("")
    lines.append(f"- Schedule-toughness quartiles: `Q1 {q1:.1f}` / `Q3 {q3:.1f}`")
    lines.append("")
    lines.append("## Cohort Results")
    lines.append("")
    lines.append(
        markdown_table(
            ["Cohort", "Sample", "FG win rate", "F5 non-loss", "Avg F5 run diff"],
            [
                [
                    result.label,
                    str(result.sample_size),
                    pct(result.fg_win_rate),
                    pct(result.f5_non_loss_rate),
                    f"{result.avg_f5_run_diff:+.2f}",
                ]
                for result in results
            ],
        )
    )
    lines.append("")
    lines.append("## Read")
    lines.append("")
    lines.append("- `Loss but not dead` is still the healthiest rebound bucket overall, and the hard-schedule version has the strongest first-five resistance shape.")
    lines.append("- If a `loss but not dead` team got there against a **hard recent schedule**, that looks better as an F5 resistance / bounceback lane than the same label against a soft schedule.")
    lines.append("- The truly ugly combination in this sample is `slumping loser + hard schedule`, not the soft-schedule version.")
    lines.append("- `Slumping loser + soft schedule` unexpectedly rebounded well here, which means the recent-loser story can hide “they were worse than they looked” and “they were better than they looked” in opposite ways.")
    lines.append("- `2+ close losses vs winning opponents` is still worth keeping as a research selector, but it is not an automatic booster by itself.")
    lines.append("")
    lines.append("## Practical Use")
    lines.append("")
    lines.append("- Use `loss but not dead + hard schedule` as a watchlist resistance or bounceback booster, not a blind ML trigger.")
    lines.append("- Use `slumping loser + hard schedule` as the stronger `pass / fade / dead-early` warning.")
    lines.append("- Treat `slumping loser + soft schedule` as a caution against over-fading a bad recent record without checking who those games came against.")
    lines.append("- Keep `2+ close losses vs winning opponents` in side/F5 research, but only as a secondary support flag.")
    lines.append("")

    args.out.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"Wrote report to {args.out}")


if __name__ == "__main__":
    main()
