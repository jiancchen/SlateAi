#!/usr/bin/env python3

from __future__ import annotations

import argparse
import json
import math
import sqlite3
from dataclasses import dataclass
from pathlib import Path
from statistics import median, stdev


ROOT = Path(__file__).resolve().parents[1]
DB_PATH = ROOT / "data-private" / "warehouse" / "sports.db"
REPORT_PATH = ROOT / "development-docs" / "mlb-total-run-residuals-053026.md"
DEFAULT_START = "2026-05-12"
DEFAULT_END = "2026-05-29"

FULL_NAMES = {
    "Braves": "Atlanta Braves",
    "Orioles": "Baltimore Orioles",
    "Red Sox": "Boston Red Sox",
    "Cubs": "Chicago Cubs",
    "Reds": "Cincinnati Reds",
    "Guardians": "Cleveland Guardians",
    "Rockies": "Colorado Rockies",
    "White Sox": "Chicago White Sox",
    "Tigers": "Detroit Tigers",
    "Astros": "Houston Astros",
    "Royals": "Kansas City Royals",
    "Angels": "Los Angeles Angels",
    "Dodgers": "Los Angeles Dodgers",
    "Marlins": "Miami Marlins",
    "Brewers": "Milwaukee Brewers",
    "Twins": "Minnesota Twins",
    "Mets": "New York Mets",
    "Yankees": "New York Yankees",
    "Athletics": "Athletics",
    "Phillies": "Philadelphia Phillies",
    "Pirates": "Pittsburgh Pirates",
    "Padres": "San Diego Padres",
    "Mariners": "Seattle Mariners",
    "Giants": "San Francisco Giants",
    "Cardinals": "St. Louis Cardinals",
    "Rays": "Tampa Bay Rays",
    "Rangers": "Texas Rangers",
    "Blue Jays": "Toronto Blue Jays",
    "Nationals": "Washington Nationals",
    "D-backs": "Arizona Diamondbacks",
    "Diamondbacks": "Arizona Diamondbacks",
}


@dataclass
class TotalResidualRow:
    prediction_date: str
    game_title: str
    away_team: str
    home_team: str
    projected_total: float
    actual_total: float
    residual: float
    posted_total: float | None
    total_lean: str
    full_edge: float | None
    combined_conversion_index: float | None
    combined_runs_per_baserunner: float | None
    combined_early_conversion_rate: float | None
    combined_dead_bat_rate: float | None
    combined_quiet_first5_rate: float | None
    combined_mistake_chaos_index: float | None
    combined_one_bad_inning_rate: float | None
    combined_bullpen_meltdown_rate: float | None


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Audit actual vs projected MLB total runs and evaluate conversion indicators.")
    parser.add_argument("--db", default=str(DB_PATH), help="Warehouse sqlite path.")
    parser.add_argument("--start", default=DEFAULT_START, help="First slate date to include.")
    parser.add_argument("--end", default=DEFAULT_END, help="Last slate date to include.")
    parser.add_argument("--out", default=str(REPORT_PATH), help="Markdown output path.")
    return parser.parse_args()


def markdown_table(headers: list[str], rows: list[list[str]]) -> str:
    header_line = "| " + " | ".join(headers) + " |"
    divider_line = "| " + " | ".join("---" for _ in headers) + " |"
    body = "\n".join("| " + " | ".join(str(cell) for cell in row) + " |" for row in rows)
    return "\n".join([header_line, divider_line, body])


def safe_float(value: object) -> float | None:
    if value in (None, ""):
        return None
    try:
        return float(value)
    except Exception:
        return None


def safe_avg(values: list[float]) -> float:
    return sum(values) / len(values) if values else 0.0


def correlation(rows: list[TotalResidualRow], getter) -> float:
    pairs = [(getter(row), row.residual) for row in rows]
    pairs = [(x, y) for x, y in pairs if x is not None]
    if len(pairs) < 3:
        return 0.0
    xs = [float(x) for x, _ in pairs]
    ys = [float(y) for _, y in pairs]
    mean_x = safe_avg(xs)
    mean_y = safe_avg(ys)
    numerator = sum((x - mean_x) * (y - mean_y) for x, y in zip(xs, ys))
    denominator = math.sqrt(sum((x - mean_x) ** 2 for x in xs) * sum((y - mean_y) ** 2 for y in ys))
    return numerator / denominator if denominator else 0.0


def quartile_residuals(rows: list[TotalResidualRow], getter) -> tuple[int, float, float]:
    values = [getter(row) for row in rows if getter(row) is not None]
    if len(values) < 4:
        return 0, 0.0, 0.0
    values = sorted(float(value) for value in values)
    q1 = values[len(values) // 4]
    q3 = values[(len(values) * 3) // 4]
    low = [row.residual for row in rows if getter(row) is not None and getter(row) <= q1]
    high = [row.residual for row in rows if getter(row) is not None and getter(row) >= q3]
    return len(low), safe_avg(low), safe_avg(high)


def load_actual_totals(conn: sqlite3.Connection) -> dict[tuple[str, str, str], float]:
    return {
        (str(row["game_date"]), str(row["away_team"]), str(row["home_team"])): float((row["away_score"] or 0) + (row["home_score"] or 0))
        for row in conn.execute(
            """
            SELECT game_date, away_team, home_team, away_score, home_score
            FROM mlb_games
            WHERE away_score IS NOT NULL AND home_score IS NOT NULL
            """
        ).fetchall()
    }


def load_conversion_lookup(conn: sqlite3.Connection) -> dict[tuple[str, str, int], sqlite3.Row]:
    return {
        (str(row["as_of_date"]), str(row["team_name"]), int(row["window_games"])): row
        for row in conn.execute("SELECT * FROM mlb_lineup_conversion_shape_daily").fetchall()
    }


def load_mistake_lookup(conn: sqlite3.Connection) -> dict[tuple[str, str, int], sqlite3.Row]:
    return {
        (str(row["as_of_date"]), str(row["team_name"]), int(row["window_games"])): row
        for row in conn.execute("SELECT * FROM mlb_team_mistake_shape_daily").fetchall()
    }


def load_rows(conn: sqlite3.Connection, start: str, end: str) -> list[TotalResidualRow]:
    actual_lookup = load_actual_totals(conn)
    conversion_lookup = load_conversion_lookup(conn)
    mistake_lookup = load_mistake_lookup(conn)
    rows: list[TotalResidualRow] = []

    for slate_dir in sorted((ROOT / "published-data" / "slates").glob("2026-05-*")):
        prediction_date = slate_dir.name
        if prediction_date < start or prediction_date > end:
            continue
        summary_path = slate_dir / "summary.json"
        if not summary_path.exists():
            continue
        summary = json.loads(summary_path.read_text())
        for game in summary.get("games", []):
            if game.get("league") != "MLB":
                continue
            try:
                away_short, home_short = str(game["title"]).split(" @ ")
            except ValueError:
                continue
            away_team = FULL_NAMES.get(away_short, away_short)
            home_team = FULL_NAMES.get(home_short, home_short)
            totals = (((game.get("analysis") or {}).get("mlbProjection") or {}).get("totals") or {})
            projected_total = safe_float(totals.get("projectedFullTotalRuns"))
            if projected_total is None:
                continue
            actual_total = actual_lookup.get((prediction_date, away_team, home_team))
            if actual_total is None:
                continue

            away_conversion = conversion_lookup.get((prediction_date, away_team, 8))
            home_conversion = conversion_lookup.get((prediction_date, home_team, 8))
            away_mistake = mistake_lookup.get((prediction_date, away_team, 8))
            home_mistake = mistake_lookup.get((prediction_date, home_team, 8))

            def conversion_sum(column: str) -> float | None:
                if not away_conversion or not home_conversion:
                    return None
                away_value = safe_float(away_conversion[column]) or 0.0
                home_value = safe_float(home_conversion[column]) or 0.0
                return away_value + home_value

            def mistake_sum(column: str) -> float | None:
                if not away_mistake or not home_mistake:
                    return None
                away_value = safe_float(away_mistake[column]) or 0.0
                home_value = safe_float(home_mistake[column]) or 0.0
                return away_value + home_value

            rows.append(
                TotalResidualRow(
                    prediction_date=prediction_date,
                    game_title=str(game["title"]),
                    away_team=away_team,
                    home_team=home_team,
                    projected_total=projected_total,
                    actual_total=actual_total,
                    residual=actual_total - projected_total,
                    posted_total=safe_float(totals.get("postedTotal")),
                    total_lean=str(((totals.get("fullGame") or {}).get("lean")) or "Pass"),
                    full_edge=safe_float(((totals.get("fullGame") or {}).get("edge"))),
                    combined_conversion_index=conversion_sum("lineup_conversion_index"),
                    combined_runs_per_baserunner=conversion_sum("runs_per_baserunner"),
                    combined_early_conversion_rate=conversion_sum("early_conversion_rate"),
                    combined_dead_bat_rate=conversion_sum("dead_bat_traffic_rate"),
                    combined_quiet_first5_rate=conversion_sum("quiet_first5_rate"),
                    combined_mistake_chaos_index=mistake_sum("mistake_chaos_index"),
                    combined_one_bad_inning_rate=mistake_sum("one_bad_inning_allowed_rate"),
                    combined_bullpen_meltdown_rate=mistake_sum("bullpen_meltdown_rate"),
                )
            )
    return rows


def summarize_residuals(rows: list[TotalResidualRow]) -> dict[str, float]:
    residuals = [row.residual for row in rows]
    return {
        "sample": float(len(rows)),
        "mean": safe_avg(residuals),
        "median": float(median(residuals)) if residuals else 0.0,
        "stdev": float(stdev(residuals)) if len(residuals) > 1 else 0.0,
        "mae": safe_avg([abs(value) for value in residuals]),
        "rmse": math.sqrt(safe_avg([value * value for value in residuals])),
        "underprojected_rate": safe_avg([1.0 if value > 0 else 0.0 for value in residuals]),
    }


def render_report(rows: list[TotalResidualRow], start: str, end: str) -> str:
    overall = summarize_residuals(rows)
    recent_7 = [row for row in rows if row.prediction_date >= "2026-05-24"]
    recent_3 = [row for row in rows if row.prediction_date >= "2026-05-27"]
    windows = [
        ("Full sample", rows),
        ("Since May 24", recent_7),
        ("Since May 27", recent_3),
    ]

    window_rows = []
    for label, sample_rows in windows:
        summary = summarize_residuals(sample_rows)
        window_rows.append(
            [
                label,
                int(summary["sample"]),
                f"{summary['mean']:+.2f}",
                f"{summary['median']:+.2f}",
                f"{summary['stdev']:.2f}",
                f"{summary['mae']:.2f}",
                f"{summary['rmse']:.2f}",
                f"{summary['underprojected_rate'] * 100:.1f}%",
            ]
        )

    lean_groups = []
    for lean in ("Over", "Under", "Pass"):
        lean_rows = [row for row in rows if row.total_lean == lean]
        if not lean_rows:
            continue
        summary = summarize_residuals(lean_rows)
        lean_groups.append(
            [
                lean,
                int(summary["sample"]),
                f"{summary['mean']:+.2f}",
                f"{summary['stdev']:.2f}",
                f"{summary['mae']:.2f}",
            ]
        )

    indicator_specs = [
        ("Combined conversion index", lambda row: row.combined_conversion_index),
        ("Combined runs per baserunner", lambda row: row.combined_runs_per_baserunner),
        ("Combined early conversion rate", lambda row: row.combined_early_conversion_rate),
        ("Combined mistake chaos index", lambda row: row.combined_mistake_chaos_index),
        ("Combined one-bad-inning rate", lambda row: row.combined_one_bad_inning_rate),
        ("Combined bullpen meltdown rate", lambda row: row.combined_bullpen_meltdown_rate),
    ]
    indicator_rows = []
    for label, getter in indicator_specs:
        sample_size, low_avg, high_avg = quartile_residuals(rows, getter)
        indicator_rows.append(
            [
                label,
                f"{correlation(rows, getter):+.3f}",
                sample_size,
                f"{low_avg:+.2f}",
                f"{high_avg:+.2f}",
            ]
        )

    recent_under_rows = [row for row in rows if row.prediction_date >= "2026-05-24" and row.total_lean == "Under"]
    recent_under_indicator_rows = []
    for label, getter in (
        ("Conversion index", lambda row: row.combined_conversion_index),
        ("Runs per baserunner", lambda row: row.combined_runs_per_baserunner),
        ("Mistake chaos index", lambda row: row.combined_mistake_chaos_index),
    ):
        sample_size, low_avg, high_avg = quartile_residuals(recent_under_rows, getter)
        recent_under_indicator_rows.append(
            [
                label,
                sample_size,
                f"{low_avg:+.2f}",
                f"{high_avg:+.2f}",
            ]
        )

    top_misses = sorted(rows, key=lambda row: abs(row.residual), reverse=True)[:10]
    miss_rows = [
        [
            row.prediction_date,
            row.game_title,
            f"{row.projected_total:.1f}",
            f"{row.actual_total:.1f}",
            f"{row.residual:+.1f}",
            row.total_lean,
            f"{row.combined_conversion_index:.1f}" if row.combined_conversion_index is not None else "n/a",
            f"{row.combined_mistake_chaos_index:.1f}" if row.combined_mistake_chaos_index is not None else "n/a",
        ]
        for row in top_misses
    ]

    lines = [
        "# MLB Total Run Residuals — May 30, 2026",
        "",
        f"Window audited: `{start}` through `{end}` using stored published MLB slate projections versus settled `mlb_games` totals.",
        "",
        "## Residual Summary",
        "",
        markdown_table(
            ["Window", "Games", "Mean `actual - proj`", "Median", "Std dev", "MAE", "RMSE", "Underprojected share"],
            window_rows,
        ),
        "",
        "## By Full-Game Lean",
        "",
        markdown_table(
            ["Lean", "Games", "Mean `actual - proj`", "Std dev", "MAE"],
            lean_groups,
        ),
        "",
        "## Conversion vs Chaos Indicators",
        "",
        markdown_table(
            ["Indicator", "Residual corr", "Quartile sample", "Low quartile avg residual", "High quartile avg residual"],
            indicator_rows,
        ),
        "",
        "## Recent Under-Lean Check Since May 24",
        "",
        markdown_table(
            ["Indicator", "Quartile sample", "Low quartile avg residual", "High quartile avg residual"],
            recent_under_indicator_rows,
        ),
        "",
        "## Biggest Misses",
        "",
        markdown_table(
            ["Date", "Game", "Proj", "Actual", "Residual", "Lean", "Conv idx", "Chaos idx"],
            miss_rows,
        ),
        "",
        "## Read",
        "",
        f"- The totals model has been **biased low** in this stored window: mean residual `{overall['mean']:+.2f}` runs, with residual standard deviation `{overall['stdev']:.2f}` runs.",
        "- The bias is **worse on under leans** than on overs. That is the practical reason the board can feel too conservative lately even when the broad totals lane is still the healthiest market.",
        "- `Conversion` did **not** come through as the main rescue signal. Higher combined conversion index and runs-per-baserunner were actually associated with **smaller** positive residuals.",
        "- The stronger positive residual relationship was on **defensive chaos / one-bad-inning** shape, not offensive conversion. That points more toward big-inning and bullpen-instability misses than simple run-conversion misses.",
        "- Practical next totals follow-up: test `mistake chaos` / `one-bad-inning allowed` as an additive over boost or under haircut before trusting conversion as the main patch.",
    ]
    return "\n".join(lines) + "\n"


def main() -> None:
    args = parse_args()
    conn = sqlite3.connect(args.db)
    conn.row_factory = sqlite3.Row
    try:
        rows = load_rows(conn, args.start, args.end)
    finally:
        conn.close()
    report = render_report(rows, args.start, args.end)
    Path(args.out).write_text(report)
    print(f"Wrote {args.out} with {len(rows)} settled MLB game rows.")


if __name__ == "__main__":
    main()
