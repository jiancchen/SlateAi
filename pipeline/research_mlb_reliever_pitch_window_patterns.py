#!/usr/bin/env python3

from __future__ import annotations

import argparse
import sqlite3
from collections import defaultdict
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from statistics import median


ROOT = Path(__file__).resolve().parents[1]
DB_PATH = ROOT / "data-private" / "warehouse" / "sports.db"
REPORT_PATH = ROOT / "development-docs" / "mlb-reliever-pitch-window-patterns-053026.md"


@dataclass
class Appearance:
    pitcher_id: int
    pitcher_name: str
    team_name: str
    game_date: str
    game_pk: int
    entry_order: int
    outs_recorded: int
    pitches_thrown: int
    runs_allowed: int
    hits_allowed: int
    walks_allowed: int


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Audit actual MLB reliever pitch-load windows and bullpen shape variation.")
    parser.add_argument("--db", default=str(DB_PATH), help="Warehouse sqlite path.")
    parser.add_argument("--start", default="2026-05-10", help="First date to include.")
    parser.add_argument("--end", default="2026-05-30", help="Last date to include.")
    parser.add_argument("--out", default=str(REPORT_PATH), help="Markdown output path.")
    return parser.parse_args()


def markdown_table(headers: list[str], rows: list[list[str]]) -> str:
    header_line = "| " + " | ".join(headers) + " |"
    divider_line = "| " + " | ".join("---" for _ in headers) + " |"
    body = "\n".join("| " + " | ".join(str(cell) for cell in row) + " |" for row in rows)
    return "\n".join([header_line, divider_line, body])


def safe_avg(values: list[float]) -> float:
    return sum(values) / len(values) if values else 0.0


def pct(numerator: int, denominator: int) -> float:
    return (numerator / denominator) * 100 if denominator else 0.0


def pitch_bucket(pitches: int) -> str:
    if pitches >= 45:
        return "45+"
    if pitches >= 40:
        return "40-44"
    if pitches >= 35:
        return "35-39"
    if pitches >= 30:
        return "30-34"
    if pitches >= 20:
        return "20-29"
    return "<20"


def reliever_count_bucket(count: int) -> str:
    if count <= 2:
        return "2 or fewer"
    if count == 3:
        return "3"
    if count == 4:
        return "4"
    return "5+"


def load_appearances(conn: sqlite3.Connection, start: str, end: str) -> list[Appearance]:
    rows = conn.execute(
        """
        SELECT
          pitcher_id,
          pitcher_name,
          team_name,
          game_date,
          game_pk,
          entry_order,
          outs_recorded,
          pitches_thrown,
          runs_allowed,
          hits_allowed,
          walks_allowed
        FROM mlb_pitcher_appearances
        WHERE pitcher_role = 'reliever'
          AND game_date BETWEEN ? AND ?
        ORDER BY pitcher_id, game_date, game_pk, entry_order
        """,
        (start, end),
    ).fetchall()
    return [
        Appearance(
            pitcher_id=int(row["pitcher_id"]),
            pitcher_name=str(row["pitcher_name"]),
            team_name=str(row["team_name"]),
            game_date=str(row["game_date"]),
            game_pk=int(row["game_pk"]),
            entry_order=int(row["entry_order"] or 99),
            outs_recorded=int(row["outs_recorded"] or 0),
            pitches_thrown=int(row["pitches_thrown"] or 0),
            runs_allowed=int(row["runs_allowed"] or 0),
            hits_allowed=int(row["hits_allowed"] or 0),
            walks_allowed=int(row["walks_allowed"] or 0),
        )
        for row in rows
    ]


def next_appearance_samples(appearances: list[Appearance]) -> list[dict[str, object]]:
    grouped: dict[int, list[Appearance]] = defaultdict(list)
    for appearance in appearances:
        grouped[appearance.pitcher_id].append(appearance)

    samples: list[dict[str, object]] = []
    for pitcher_appearances in grouped.values():
        pitcher_appearances = sorted(pitcher_appearances, key=lambda row: (row.game_date, row.game_pk, row.entry_order))
        for current, next_row in zip(pitcher_appearances, pitcher_appearances[1:]):
            rest_days = (
                datetime.strptime(next_row.game_date, "%Y-%m-%d")
                - datetime.strptime(current.game_date, "%Y-%m-%d")
            ).days
            samples.append(
                {
                    "pitcher_id": current.pitcher_id,
                    "pitcher_name": current.pitcher_name,
                    "team_name": current.team_name,
                    "pitches": current.pitches_thrown,
                    "outs": current.outs_recorded,
                    "rest_days": rest_days,
                    "bucket": pitch_bucket(current.pitches_thrown),
                }
            )
    return samples


def bullpen_shape_samples(appearances: list[Appearance]) -> list[dict[str, object]]:
    grouped: dict[tuple[int, str], list[Appearance]] = defaultdict(list)
    for appearance in appearances:
        grouped[(appearance.game_pk, appearance.team_name)].append(appearance)

    samples: list[dict[str, object]] = []
    for (game_pk, team_name), rows in grouped.items():
        relievers_used = len(rows)
        rows = sorted(rows, key=lambda row: row.entry_order)
        samples.append(
            {
                "game_pk": game_pk,
                "team_name": team_name,
                "game_date": rows[0].game_date,
                "bucket": reliever_count_bucket(relievers_used),
                "relievers_used": relievers_used,
                "relief_runs": sum(row.runs_allowed for row in rows),
                "relief_hits_walks": sum(row.hits_allowed + row.walks_allowed for row in rows),
                "first_reliever_pitches": rows[0].pitches_thrown if rows else 0,
                "first_reliever_outs": rows[0].outs_recorded if rows else 0,
                "heavy_35_count": sum(1 for row in rows if row.pitches_thrown >= 35),
            }
        )
    return samples


def render_report(appearances: list[Appearance], start: str, end: str) -> str:
    next_samples = next_appearance_samples(appearances)
    shape_samples = bullpen_shape_samples(appearances)

    rest_rows = []
    for bucket in ("<20", "20-29", "30-34", "35-39", "40-44", "45+"):
        rows = [row for row in next_samples if row["bucket"] == bucket]
        rest_days = [int(row["rest_days"]) for row in rows]
        rest_rows.append(
            [
                bucket,
                len(rows),
                f"{safe_avg(rest_days):.2f}",
                f"{median(rest_days):.1f}" if rest_days else "0.0",
                f"{pct(sum(1 for day in rest_days if day <= 1), len(rest_days)):.1f}%",
                f"{pct(sum(1 for day in rest_days if day == 2), len(rest_days)):.1f}%",
                f"{pct(sum(1 for day in rest_days if day >= 3), len(rest_days)):.1f}%",
            ]
        )

    shape_rows = []
    for bucket in ("2 or fewer", "3", "4", "5+"):
        rows = [row for row in shape_samples if row["bucket"] == bucket]
        shape_rows.append(
            [
                bucket,
                len(rows),
                f"{safe_avg([float(row['relief_runs']) for row in rows]):.2f}",
                f"{safe_avg([float(row['relief_hits_walks']) for row in rows]):.2f}",
                f"{safe_avg([float(row['first_reliever_pitches']) for row in rows]):.1f}",
                f"{safe_avg([float(row['first_reliever_outs']) for row in rows]):.1f}",
                f"{pct(sum(1 for row in rows if int(row['heavy_35_count']) > 0), len(rows)):.1f}%",
            ]
        )

    quick_reuse_by_pitcher: dict[int, list[int]] = defaultdict(list)
    quick_reuse_by_team: dict[str, list[int]] = defaultdict(list)
    for row in next_samples:
        if int(row["rest_days"]) <= 1:
            quick_reuse_by_pitcher[int(row["pitcher_id"])].append(int(row["pitches"]))
            quick_reuse_by_team[str(row["team_name"])].append(int(row["pitches"]))

    pitcher_quick_reuse_counts = [len(values) for values in quick_reuse_by_pitcher.values()]
    team_quick_reuse_counts = [len(values) for values in quick_reuse_by_team.values()]
    highest_quick_reuse = sorted(
        [
            (str(row["pitcher_name"]), str(row["team_name"]), int(row["pitches"]))
            for row in next_samples
            if int(row["rest_days"]) <= 1
        ],
        key=lambda item: item[2],
        reverse=True,
    )[:8]

    high_reuse_rows = [[name, team, pitches] for name, team, pitches in highest_quick_reuse]

    lines = [
        "# MLB Reliever Pitch Window Patterns - May 30, 2026",
        "",
        f"Audit window: `{start}` through `{end}` using `mlb_pitcher_appearances`.",
        "",
        "## Rest After Pitch Load",
        "",
        markdown_table(
            ["Prior pitches", "Samples", "Avg rest days", "Median rest", "Next day", "2 days", "3+ days"],
            rest_rows,
        ),
        "",
        "## Bullpen Shape By Relievers Used",
        "",
        markdown_table(
            ["Relievers used", "Team-games", "Relief runs", "H+BB allowed", "1st RP pitches", "1st RP outs", "Any 35+ arm"],
            shape_rows,
        ),
        "",
        "## Quick-Reuse Outliers",
        "",
        markdown_table(
            ["Pitcher", "Team", "Prior pitches before <=1d reuse"],
            high_reuse_rows,
        ),
        "",
        "## Read",
        "",
        f"- Pitcher-specific quick-reuse samples are sparse: `{len(pitcher_quick_reuse_counts)}` pitchers have any <=1 day reuse in this window, with median sample `{median(pitcher_quick_reuse_counts) if pitcher_quick_reuse_counts else 0}`.",
        f"- Team-level quick-reuse samples are steadier: `{len(team_quick_reuse_counts)}` teams have <=1 day reuse examples, with median sample `{median(team_quick_reuse_counts) if team_quick_reuse_counts else 0}`.",
        "- The right live behavior is a reset score using recent appearance, last pitch load, and team quick-reuse pattern. `35` is a useful global danger zone, not a universal wall.",
        "- Games that reach `5+` relievers are a different bullpen regime. They allow more relief traffic and should trigger a remaining-pool calculation rather than only naming the first arm.",
    ]
    return "\n".join(lines) + "\n"


def main() -> None:
    args = parse_args()
    conn = sqlite3.connect(args.db)
    conn.row_factory = sqlite3.Row
    try:
        appearances = load_appearances(conn, args.start, args.end)
    finally:
        conn.close()
    Path(args.out).write_text(render_report(appearances, args.start, args.end))
    print(f"Wrote {args.out} with {len(appearances)} relief appearances.")


if __name__ == "__main__":
    main()
