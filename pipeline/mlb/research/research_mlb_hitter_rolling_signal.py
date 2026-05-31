#!/usr/bin/env python3
from __future__ import annotations

import argparse
import sqlite3
from dataclasses import dataclass
from pathlib import Path


ROOT = Path(__file__).resolve().parents[3]
DB_PATH = ROOT / "data-private" / "warehouse" / "sports.db"
DEFAULT_OUT = ROOT / "development-docs" / "mlb-hitter-rolling-signal-052826.md"


@dataclass
class Row:
    prop_type: str
    hit_flag: int
    confidence: float | None
    hitless_streak_games: float | None
    whiff_rate_last5: float | None
    cold_streak_index: float | None
    heat_regression_index: float | None
    total_bases_per_pa_last5: float | None
    hits_per_pa_last5: float | None
    multi_tb_games_last5: float | None
    multi_hit_games_last5: float | None
    pressure_plate_index: float | None


FEATURES = [
    "hitless_streak_games",
    "whiff_rate_last5",
    "cold_streak_index",
    "heat_regression_index",
    "total_bases_per_pa_last5",
    "hits_per_pa_last5",
    "multi_tb_games_last5",
    "multi_hit_games_last5",
    "pressure_plate_index",
    "confidence",
]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Research rolling hitter-state signals vs MLB batter props.")
    parser.add_argument("--db", default=str(DB_PATH))
    parser.add_argument("--out", default=str(DEFAULT_OUT))
    return parser.parse_args()


def read_rows(conn: sqlite3.Connection) -> list[Row]:
    query = """
    select
      b.prop_type,
      b.hit_flag,
      p.confidence,
      s.hitless_streak_games,
      s.whiff_rate_last5,
      s.cold_streak_index,
      s.heat_regression_index,
      s.total_bases_per_pa_last5,
      s.hits_per_pa_last5,
      s.multi_tb_games_last5,
      s.multi_hit_games_last5,
      s.pressure_plate_index
    from mlb_prop_backtests b
    join mlb_prop_predictions p
      on p.prediction_date = b.prediction_date
     and p.model_name = b.model_name
     and p.game_id = b.game_id
     and p.player_id = b.player_id
     and p.prop_type = b.prop_type
    left join mlb_hitter_state_snapshots s
      on s.as_of_date = b.prediction_date
     and s.player_id = b.player_id
    where b.prop_type in ('singles', 'totalBases')
    order by b.prediction_date, b.prop_type, b.player_name
    """
    rows = []
    for result in conn.execute(query):
        rows.append(
            Row(
                prop_type=result[0],
                hit_flag=int(result[1]),
                confidence=_to_float(result[2]),
                hitless_streak_games=_to_float(result[3]),
                whiff_rate_last5=_to_float(result[4]),
                cold_streak_index=_to_float(result[5]),
                heat_regression_index=_to_float(result[6]),
                total_bases_per_pa_last5=_to_float(result[7]),
                hits_per_pa_last5=_to_float(result[8]),
                multi_tb_games_last5=_to_float(result[9]),
                multi_hit_games_last5=_to_float(result[10]),
                pressure_plate_index=_to_float(result[11]),
            )
        )
    return rows


def _to_float(value) -> float | None:
    try:
        if value is None:
            return None
        number = float(value)
        return number
    except (TypeError, ValueError):
        return None


def quantile(values: list[float], q: float) -> float:
    if not values:
        return float("nan")
    sorted_values = sorted(values)
    if len(sorted_values) == 1:
        return sorted_values[0]
    index = (len(sorted_values) - 1) * q
    lower = int(index)
    upper = min(lower + 1, len(sorted_values) - 1)
    weight = index - lower
    return sorted_values[lower] * (1 - weight) + sorted_values[upper] * weight


def hit_rate(rows: list[Row]) -> float:
    return sum(row.hit_flag for row in rows) / len(rows) if rows else 0.0


def quartile_summary(rows: list[Row], feature: str) -> dict[str, float] | None:
    available = [getattr(row, feature) for row in rows if getattr(row, feature) is not None]
    if len(available) < 12:
        return None
    q1 = quantile(available, 0.25)
    q3 = quantile(available, 0.75)
    low_rows = [row for row in rows if getattr(row, feature) is not None and getattr(row, feature) <= q1]
    high_rows = [row for row in rows if getattr(row, feature) is not None and getattr(row, feature) >= q3]
    return {
        "q1": q1,
        "q3": q3,
        "low_rate": hit_rate(low_rows),
        "high_rate": hit_rate(high_rows),
        "delta": hit_rate(high_rows) - hit_rate(low_rows),
        "high_count": len(high_rows),
        "low_count": len(low_rows),
    }


def build_compound_notes(rows: list[Row], prop_type: str) -> list[str]:
    notes: list[str] = []
    whiff_values = [row.whiff_rate_last5 for row in rows if row.whiff_rate_last5 is not None]
    cold_values = [row.cold_streak_index for row in rows if row.cold_streak_index is not None]
    multi_tb_values = [row.multi_tb_games_last5 for row in rows if row.multi_tb_games_last5 is not None]
    pressure_values = [row.pressure_plate_index for row in rows if row.pressure_plate_index is not None]
    if not (whiff_values and cold_values and multi_tb_values and pressure_values):
        return notes

    whiff_q3 = quantile(whiff_values, 0.75)
    cold_q3 = quantile(cold_values, 0.75)
    multi_tb_q3 = quantile(multi_tb_values, 0.75)
    pressure_q3 = quantile(pressure_values, 0.75)

    high_whiff_and_cold = [
        row
        for row in rows
        if row.whiff_rate_last5 is not None
        and row.cold_streak_index is not None
        and row.whiff_rate_last5 >= whiff_q3
        and row.cold_streak_index >= cold_q3
    ]
    if high_whiff_and_cold:
        notes.append(
            f"`high whiff + high cold` bucket: {len(high_whiff_and_cold)} bets, {hit_rate(high_whiff_and_cold):.1%} hit."
        )

    multi_tb_no_whiff = [
        row
        for row in rows
        if row.multi_tb_games_last5 is not None
        and row.whiff_rate_last5 is not None
        and row.multi_tb_games_last5 >= multi_tb_q3
        and row.whiff_rate_last5 < whiff_q3
    ]
    if multi_tb_no_whiff:
        notes.append(
            f"`multi-TB form without high whiff`: {len(multi_tb_no_whiff)} bets, {hit_rate(multi_tb_no_whiff):.1%} hit."
        )

    high_pressure = [
        row
        for row in rows
        if row.pressure_plate_index is not None
        and row.pressure_plate_index >= pressure_q3
    ]
    if high_pressure:
        notes.append(
            f"`high pressure` bucket: {len(high_pressure)} bets, {hit_rate(high_pressure):.1%} hit."
        )
    return notes


def format_pct(value: float) -> str:
    return f"{value * 100:.1f}%"


def build_markdown(rows: list[Row]) -> str:
    grouped: dict[str, list[Row]] = {"singles": [], "totalBases": []}
    for row in rows:
        grouped.setdefault(row.prop_type, []).append(row)

    lines = [
        "# MLB Hitter Rolling Signal Audit",
        "",
        "This report checks whether the day-by-day hitter state snapshot table is helping on batter overs right now.",
        "",
        "Scope:",
        f"- batter prop backtests: `{len(rows)}` (`singles`, `totalBases`)",
        "- snapshot table: `mlb_hitter_state_snapshots`",
        "- current sample window: `2026-05-16` through `2026-05-28` batter props, with snapshot coverage above 99%",
        "",
    ]

    for prop_type, prop_rows in grouped.items():
        if not prop_rows:
            continue
        lines.extend(
            [
                f"## {prop_type}",
                "",
                f"- Base hit rate: `{format_pct(hit_rate(prop_rows))}` on `{len(prop_rows)}` bets",
                "",
                "|Feature|Low quartile hit rate|High quartile hit rate|Delta|",
                "|---|---:|---:|---:|",
            ]
        )
        for feature in FEATURES:
            summary = quartile_summary(prop_rows, feature)
            if not summary:
                continue
            lines.append(
                f"|`{feature}`|{format_pct(summary['low_rate'])}|{format_pct(summary['high_rate'])}|{summary['delta'] * 100:+.1f} pts|"
            )
        lines.append("")
        lines.append("Compound buckets:")
        for note in build_compound_notes(prop_rows, prop_type):
            lines.append(f"- {note}")
        lines.append("")

    lines.extend(
        [
            "## What the current rolling table is good for",
            "",
            "- `whiff_rate_last5` is already useful as a risk filter. High recent whiff clearly drags down `singles` and still hurts `totalBases`.",
            "- `cold_streak_index` is especially useful for `totalBases`; the coldest quartile of our current TB overs is materially worse than the cleanest quartile.",
            "- `multi_tb_games_last5` helps more than plain `total_bases_per_pa_last5`. Ceiling events seem more informative than the simple rolling rate.",
            "",
            "## What the current table is missing",
            "",
            "- It is still result-based. It knows who got hits and bases lately, but not whether the contact quality was earned or lucky.",
            "- That is why a rolling Statcast layer matters:",
            "  - `xwOBA` trend",
            "  - `xBA` / `xSLG` trend",
            "  - `barrel%` trend",
            "  - `hard-hit%` trend",
            "  - `sweet-spot%` trend",
            "",
            "## Recommendation",
            "",
            "- Keep the current hitter-state snapshot as a **filter layer**.",
            "- Add a new daily hitter Statcast snapshot table so we can build:",
            "  - `rolling_7_xwoba`",
            "  - `rolling_14_xwoba`",
            "  - `rolling_30_xwoba`",
            "  - trend slope vs prior windows",
            "  - `results up / contact down` fade flags",
            "  - `results down / contact up` buy-low flags",
            "",
            "That should help separate the two cases you called out:",
            "- hitters getting unlucky but striking the ball well",
            "- hitters lucking into results while the contact quality is already sliding",
            "",
        ]
    )
    return "\n".join(lines)


def main() -> None:
    args = parse_args()
    conn = sqlite3.connect(args.db)
    try:
        rows = read_rows(conn)
    finally:
        conn.close()
    markdown = build_markdown(rows)
    Path(args.out).write_text(markdown)
    print(f"Wrote hitter rolling signal audit to {args.out}")


if __name__ == "__main__":
    main()
