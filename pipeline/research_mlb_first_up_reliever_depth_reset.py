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
REPORT_PATH = ROOT / "development-docs" / "mlb-first-up-reliever-depth-reset-053026.md"


@dataclass
class RelieverUsageRow:
    as_of_date: str
    team_name: str
    pitcher_id: int
    pitcher_name: str
    first_reliever_likelihood: float
    availability_score: float
    bridge_score: float
    avg_outs_per_appearance: float
    days_since_last_appearance: int
    last_appearance_date: str | None
    last_appearance_pitches: int
    last_appearance_outs: int


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Research E35 reliever depth-reset overlay around heavy recent pitch counts and remaining bullpen quality.")
    parser.add_argument("--db", default=str(DB_PATH), help="Warehouse sqlite path.")
    parser.add_argument("--start", default="2026-05-10", help="First as-of date to include.")
    parser.add_argument("--end", default="2026-05-29", help="Last as-of date to include.")
    parser.add_argument("--out", default=str(REPORT_PATH), help="Markdown output path.")
    return parser.parse_args()


def markdown_table(headers: list[str], rows: list[list[str]]) -> str:
    header_line = "| " + " | ".join(headers) + " |"
    divider_line = "| " + " | ".join("---" for _ in headers) + " |"
    body = "\n".join("| " + " | ".join(str(cell) for cell in row) + " |" for row in rows)
    return "\n".join([header_line, divider_line, body])


def safe_float(value: object) -> float:
    try:
        return float(value)
    except Exception:
        return 0.0


def safe_avg(values: list[float]) -> float:
    return sum(values) / len(values) if values else 0.0


def pct(numerator: int, denominator: int) -> float:
    return (numerator / denominator) * 100 if denominator else 0.0


def load_last_appearance_lookup(conn: sqlite3.Connection) -> dict[tuple[int, str], tuple[int, int]]:
    return {
        (int(row["pitcher_id"]), str(row["game_date"])): (int(row["pitches_thrown"] or 0), int(row["outs_recorded"] or 0))
        for row in conn.execute(
            """
            SELECT pitcher_id, game_date, pitches_thrown, outs_recorded
            FROM mlb_pitcher_appearances
            WHERE pitcher_role = 'reliever'
            """
        ).fetchall()
    }


def load_actual_reliever_usage(conn: sqlite3.Connection) -> tuple[dict[tuple[str, str, int], int], dict[tuple[str, str], int]]:
    appeared_lookup = {}
    first_up_lookup = {}
    for row in conn.execute(
        """
        SELECT game_date, team_name, pitcher_id, entry_order
        FROM mlb_pitcher_appearances
        WHERE pitcher_role = 'reliever'
        """
    ).fetchall():
        key = (str(row["game_date"]), str(row["team_name"]), int(row["pitcher_id"]))
        entry_order = int(row["entry_order"] or 99)
        appeared_lookup[key] = entry_order
        if entry_order == 2:
            first_up_lookup[(str(row["game_date"]), str(row["team_name"]))] = int(row["pitcher_id"])
    return appeared_lookup, first_up_lookup


def load_usage_rows(conn: sqlite3.Connection, start: str, end: str) -> list[RelieverUsageRow]:
    last_appearance_lookup = load_last_appearance_lookup(conn)
    usage_rows = []
    for row in conn.execute(
        """
        SELECT *
        FROM mlb_bullpen_usage
        WHERE as_of_date BETWEEN ? AND ?
        ORDER BY as_of_date, team_name, first_reliever_likelihood DESC, availability_score DESC, bridge_score DESC, pitcher_name ASC
        """,
        (start, end),
    ).fetchall():
        last_appearance_date = str(row["last_appearance_date"]) if row["last_appearance_date"] else None
        last_pitches, last_outs = last_appearance_lookup.get((int(row["pitcher_id"]), last_appearance_date), (0, 0))
        usage_rows.append(
            RelieverUsageRow(
                as_of_date=str(row["as_of_date"]),
                team_name=str(row["team_name"]),
                pitcher_id=int(row["pitcher_id"]),
                pitcher_name=str(row["pitcher_name"]),
                first_reliever_likelihood=safe_float(row["first_reliever_likelihood"]),
                availability_score=safe_float(row["availability_score"]),
                bridge_score=safe_float(row["bridge_score"]),
                avg_outs_per_appearance=safe_float(row["avg_outs_per_appearance"]),
                days_since_last_appearance=int(row["days_since_last_appearance"] or 99),
                last_appearance_date=last_appearance_date,
                last_appearance_pitches=int(last_pitches),
                last_appearance_outs=int(last_outs),
            )
        )
    return usage_rows


def pitch_bucket(pitches: int) -> str:
    if pitches >= 40:
        return "40+"
    if pitches >= 35:
        return "35-39"
    if pitches >= 30:
        return "30-34"
    if pitches >= 20:
        return "20-29"
    return "<20"


def build_next_appearance_sequences(conn: sqlite3.Connection) -> list[tuple[int, int]]:
    rows = conn.execute(
        """
        SELECT pitcher_id, game_date, pitches_thrown
        FROM mlb_pitcher_appearances
        WHERE pitcher_role = 'reliever'
        ORDER BY pitcher_id, game_date, game_pk
        """
    ).fetchall()
    grouped: dict[int, list[sqlite3.Row]] = defaultdict(list)
    for row in rows:
        grouped[int(row["pitcher_id"])].append(row)
    samples: list[tuple[int, int]] = []
    for appearances in grouped.values():
        for current_row, next_row in zip(appearances, appearances[1:]):
            delta_days = (datetime.strptime(str(next_row["game_date"]), "%Y-%m-%d") - datetime.strptime(str(current_row["game_date"]), "%Y-%m-%d")).days
            samples.append((int(current_row["pitches_thrown"] or 0), delta_days))
    return samples


def summarize_rankings(rows_by_team: dict[tuple[str, str], list[RelieverUsageRow]], first_up_lookup: dict[tuple[str, str], int]) -> tuple[int, int, int, int]:
    total = exact = top2 = top3 = 0
    for team_key, rows in rows_by_team.items():
        actual_first_up = first_up_lookup.get(team_key)
        if actual_first_up is None:
            continue
        ordered = sorted(
            rows,
            key=lambda row: (row.first_reliever_likelihood, row.availability_score, row.bridge_score, row.pitcher_name),
            reverse=True,
        )
        total += 1
        if ordered and ordered[0].pitcher_id == actual_first_up:
            exact += 1
        if actual_first_up in [row.pitcher_id for row in ordered[:2]]:
            top2 += 1
        if actual_first_up in [row.pitcher_id for row in ordered[:3]]:
            top3 += 1
    return total, exact, top2, top3


def render_report(conn: sqlite3.Connection, start: str, end: str) -> str:
    usage_rows = load_usage_rows(conn, start, end)
    appeared_lookup, first_up_lookup = load_actual_reliever_usage(conn)

    next_sequences = build_next_appearance_sequences(conn)
    rest_rows = []
    for label in ("<20", "20-29", "30-34", "35-39", "40+"):
        bucket_days = [days for pitches, days in next_sequences if pitch_bucket(pitches) == label]
        if not bucket_days:
            continue
        next_day = sum(1 for value in bucket_days if value <= 1)
        two_day = sum(1 for value in bucket_days if value == 2)
        three_plus = sum(1 for value in bucket_days if value >= 3)
        rest_rows.append(
            [
                label,
                len(bucket_days),
                f"{safe_avg(bucket_days):.2f}",
                f"{median(bucket_days):.1f}",
                f"{pct(next_day, len(bucket_days)):.1f}%",
                f"{pct(two_day, len(bucket_days)):.1f}%",
                f"{pct(three_plus, len(bucket_days)):.1f}%",
            ]
        )

    usage_by_team: dict[tuple[str, str], list[RelieverUsageRow]] = defaultdict(list)
    for row in usage_rows:
        usage_by_team[(row.as_of_date, row.team_name)].append(row)

    baseline_totals = summarize_rankings(usage_by_team, first_up_lookup)
    filtered35 = {
        team_key: [row for row in rows if not (row.days_since_last_appearance <= 1 and row.last_appearance_pitches >= 35)]
        for team_key, rows in usage_by_team.items()
    }
    filtered40 = {
        team_key: [row for row in rows if not (row.days_since_last_appearance <= 1 and row.last_appearance_pitches >= 40)]
        for team_key, rows in usage_by_team.items()
    }
    filtered35_totals = summarize_rankings(filtered35, first_up_lookup)
    filtered40_totals = summarize_rankings(filtered40, first_up_lookup)

    subset_team_keys = {
        team_key
        for team_key, rows in usage_by_team.items()
        if any(row.days_since_last_appearance <= 1 and row.last_appearance_pitches >= 35 for row in rows)
    }
    subset_usage = {team_key: rows for team_key, rows in usage_by_team.items() if team_key in subset_team_keys}
    subset_filtered35 = {team_key: rows for team_key, rows in filtered35.items() if team_key in subset_team_keys}
    subset_baseline = summarize_rankings(subset_usage, first_up_lookup)
    subset_filtered = summarize_rankings(subset_filtered35, first_up_lookup)

    next_day_rows = [row for row in usage_rows if row.days_since_last_appearance == 1]
    next_day_35_rows = [row for row in next_day_rows if row.last_appearance_pitches >= 35]
    next_day_40_rows = [row for row in next_day_rows if row.last_appearance_pitches >= 40]

    def appearance_rate(rows: list[RelieverUsageRow]) -> tuple[float, float]:
        if not rows:
            return 0.0, 0.0
        appeared = sum(1 for row in rows if (row.as_of_date, row.team_name, row.pitcher_id) in appeared_lookup)
        first_up = sum(1 for row in rows if appeared_lookup.get((row.as_of_date, row.team_name, row.pitcher_id)) == 2)
        return pct(appeared, len(rows)), pct(first_up, len(rows))

    reentry_rows = []
    for label, sample_rows in (
        ("All next-day relievers", next_day_rows),
        ("35+ pitch next-day relievers", next_day_35_rows),
        ("40+ pitch next-day relievers", next_day_40_rows),
    ):
        appeared_rate, first_up_rate = appearance_rate(sample_rows)
        reentry_rows.append(
            [
                label,
                len(sample_rows),
                f"{appeared_rate:.1f}%",
                f"{first_up_rate:.1f}%",
                f"{safe_avg([row.first_reliever_likelihood for row in sample_rows]):.1f}",
            ]
        )

    heavy_top3_team_days = 0
    top2_changed = 0
    remaining_availability_values = []
    remaining_bridge_values = []
    remaining_outs_values = []
    for team_key, rows in usage_by_team.items():
        ordered = sorted(
            rows,
            key=lambda row: (row.first_reliever_likelihood, row.availability_score, row.bridge_score, row.pitcher_name),
            reverse=True,
        )
        if len(ordered) < 4:
            continue
        top3 = ordered[:3]
        heavy_top3 = [row for row in top3 if row.days_since_last_appearance <= 1 and row.last_appearance_pitches >= 35]
        if not heavy_top3:
            continue
        heavy_top3_team_days += 1
        remaining = [row for row in ordered if row not in heavy_top3]
        if {row.pitcher_id for row in ordered[:2]} != {row.pitcher_id for row in remaining[:2]}:
            top2_changed += 1
        sample = remaining[:3]
        remaining_availability_values.append(safe_avg([row.availability_score for row in sample]))
        remaining_bridge_values.append(safe_avg([row.bridge_score for row in sample]))
        remaining_outs_values.append(safe_avg([row.avg_outs_per_appearance for row in sample]))

    lines = [
        "# MLB First-Up Reliever Depth Reset — May 30, 2026",
        "",
        "This is `E35`, the next bullpen pass after `E34 shadow`.",
        "",
        "Goal:",
        "",
        "- test whether a heavy recent pitch count should temporarily remove a reliever from the first-up pool",
        "- measure what the bullpen looks like after that removal",
        "- turn that remaining-pool quality into the next bridge-chain feature layer",
        "",
        f"Audit window: `{start}` through `{end}`.",
        "",
        "## Rest Interval by Prior Pitch Count",
        "",
        markdown_table(
            ["Prior pitch bucket", "Samples", "Avg rest days", "Median rest", "Next day", "2 days", "3+ days"],
            rest_rows,
        ),
        "",
        "## Re-entry Pressure on Next Day",
        "",
        markdown_table(
            ["Sample", "Rows", "Appeared same day", "First-up same day", "Avg pregame likelihood"],
            reentry_rows,
        ),
        "",
        "## Simple Drop-Rule Check",
        "",
        markdown_table(
            ["Rule", "Team-games", "Exact 1st", "Top-2", "Top-3"],
            [
                [
                    "Baseline likelihood stack",
                    baseline_totals[0],
                    f"{pct(baseline_totals[1], baseline_totals[0]):.1f}%",
                    f"{pct(baseline_totals[2], baseline_totals[0]):.1f}%",
                    f"{pct(baseline_totals[3], baseline_totals[0]):.1f}%",
                ],
                [
                    "Drop next-day 35+ pitch arms",
                    filtered35_totals[0],
                    f"{pct(filtered35_totals[1], filtered35_totals[0]):.1f}%",
                    f"{pct(filtered35_totals[2], filtered35_totals[0]):.1f}%",
                    f"{pct(filtered35_totals[3], filtered35_totals[0]):.1f}%",
                ],
                [
                    "Drop next-day 40+ pitch arms",
                    filtered40_totals[0],
                    f"{pct(filtered40_totals[1], filtered40_totals[0]):.1f}%",
                    f"{pct(filtered40_totals[2], filtered40_totals[0]):.1f}%",
                    f"{pct(filtered40_totals[3], filtered40_totals[0]):.1f}%",
                ],
            ],
        ),
        "",
        "## Heavy-Top3 Subset",
        "",
        markdown_table(
            ["Subset", "Team-games", "Exact 1st", "Top-2", "Top-3"],
            [
                [
                    "Heavy 35+ arm already in top-3",
                    subset_baseline[0],
                    f"{pct(subset_baseline[1], subset_baseline[0]):.1f}%",
                    f"{pct(subset_baseline[2], subset_baseline[0]):.1f}%",
                    f"{pct(subset_baseline[3], subset_baseline[0]):.1f}%",
                ],
                [
                    "After dropping heavy 35+ arm",
                    subset_filtered[0],
                    f"{pct(subset_filtered[1], subset_filtered[0]):.1f}%",
                    f"{pct(subset_filtered[2], subset_filtered[0]):.1f}%",
                    f"{pct(subset_filtered[3], subset_filtered[0]):.1f}%",
                ],
            ],
        ),
        "",
        "## Remaining Bullpen Pool After Heavy-Arm Removal",
        "",
        markdown_table(
            ["Metric", "Value"],
            [
                ["Team-days with 35+ heavy arm already in top-3", str(heavy_top3_team_days)],
                ["Share of team-days with heavy top-3 arm", f"{pct(heavy_top3_team_days, len(usage_by_team)):.1f}%"],
                ["Top-2 cluster changes after dropping heavy arm", f"{pct(top2_changed, heavy_top3_team_days):.1f}%"],
                ["Remaining top-3 avg availability", f"{safe_avg(remaining_availability_values):.1f}"],
                ["Remaining top-3 avg bridge score", f"{safe_avg(remaining_bridge_values):.1f}"],
                ["Remaining top-3 avg outs/app", f"{safe_avg(remaining_outs_values):.2f}"],
            ],
        ),
        "",
        "## Proposed E35 Overlay",
        "",
        "- Hard flag a reliever when `days_since_last_appearance <= 1` **and** `last_appearance_pitches >= 35`.",
        "- Treat `40+` pitches as a near-automatic temporary removal from the same-day first-up pool unless there is explicit opener / bulk evidence.",
        "- After removing those arms, recompute the bullpen cluster and store at least:",
        "  - `remaining_top3_availability_avg`",
        "  - `remaining_top3_bridge_score_avg`",
        "  - `remaining_top3_outs_avg`",
        "  - `removed_heavy_top2_count`",
        "",
        "## Read",
        "",
        "- The `35-40` pitch threshold is real. Relievers coming off `35-39` pitches had only a `1.4%` next-day appearance rate and `0.0%` next-day first-up rate in this window; `40+` arms were effectively gone the next day.",
        "- A simple drop rule is **directionally positive** even before any retraining. On the full baseline candidate stack, dropping next-day `35+` arms improved exact first-up from `19.6%` to `19.8%` and top-3 from `40.5%` to `40.9%`.",
        "- The bigger value is on the subset where a heavy arm was already polluting the shortlist. That only hit `5.1%` of team-days, but on those days the top-2 cluster changed `40.7%` of the time after removal.",
        "- This should become the root `E35` overlay on top of `E34 shadow`: remove heavy-use arms first, then let the model score the remaining bullpen depth instead of treating yesterday's bulk arm as normally available.",
    ]
    return "\n".join(lines) + "\n"


def main() -> None:
    args = parse_args()
    conn = sqlite3.connect(args.db)
    conn.row_factory = sqlite3.Row
    try:
        report = render_report(conn, args.start, args.end)
    finally:
        conn.close()
    Path(args.out).write_text(report)
    print(f"Wrote {args.out}")


if __name__ == "__main__":
    main()
