#!/usr/bin/env python3

from __future__ import annotations

import argparse
import json
import sqlite3
from dataclasses import dataclass
from pathlib import Path


ROOT = Path(__file__).resolve().parents[3]
DB_PATH = ROOT / "data-private" / "warehouse" / "sports.db"
HR_DIR = ROOT / "data-private" / "predictions" / "mlb-home-runs"
DEFAULT_OUT = ROOT / "development-docs" / "mlb" / "research" / "mlb-hr-filter-signal-052926.md"


@dataclass
class Row:
    prediction_date: str
    player_id: int
    player_name: str
    pitcher_hr9: float | None
    park_hr_index: float | None
    xslg7: float | None
    xwoba7: float | None
    hard_hit7: float | None
    barrel7: float | None
    sweet_spot7: float | None
    barrel_trend: float | None
    hard_hit_trend: float | None
    hit_flag: int


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Audit HR board filters using prototype exports + warehouse backtests.")
    parser.add_argument("--db", default=str(DB_PATH))
    parser.add_argument("--hr-dir", default=str(HR_DIR))
    parser.add_argument("--out", default=str(DEFAULT_OUT))
    return parser.parse_args()


def _to_float(value) -> float | None:
    try:
        if value is None:
            return None
        return float(value)
    except (TypeError, ValueError):
        return None


def quantile(values: list[float], q: float) -> float:
    sorted_values = sorted(values)
    if len(sorted_values) == 1:
        return sorted_values[0]
    index = (len(sorted_values) - 1) * q
    lower = int(index)
    upper = min(lower + 1, len(sorted_values) - 1)
    weight = index - lower
    return sorted_values[lower] * (1 - weight) + sorted_values[upper] * weight


def markdown_table(headers: list[str], rows: list[list[str]]) -> str:
    header_line = "| " + " | ".join(headers) + " |"
    divider_line = "| " + " | ".join(["---"] * len(headers)) + " |"
    row_lines = ["| " + " | ".join(str(cell) for cell in row) + " |" for row in rows]
    return "\n".join([header_line, divider_line, *row_lines])


def read_rows(db_path: Path, hr_dir: Path) -> list[Row]:
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    hit_lookup = {
        (row["prediction_date"], int(row["player_id"])): int(row["hit_flag"])
        for row in conn.execute("SELECT prediction_date, player_id, hit_flag FROM mlb_home_run_backtests")
    }
    trend_lookup = {
        (row["as_of_date"], int(row["player_id"])): row
        for row in conn.execute("SELECT * FROM mlb_hitter_statcast_trend_snapshots")
    }

    rows: list[Row] = []
    for path in sorted(hr_dir.glob("*-statcast-prototype.json")):
        prediction_date = path.name.split("-statcast")[0]
        payload = json.loads(path.read_text())
        for pick in payload.get("picks") or payload.get("targets") or []:
            player_id = int(pick["playerId"])
            hit_flag = hit_lookup.get((prediction_date, player_id))
            trend = trend_lookup.get((prediction_date, player_id))
            if hit_flag is None or trend is None:
                continue
            rows.append(
                Row(
                    prediction_date=prediction_date,
                    player_id=player_id,
                    player_name=pick["playerName"],
                    pitcher_hr9=_to_float(pick.get("opposingPitcherHr9")),
                    park_hr_index=_to_float(pick.get("parkHrIndex")),
                    xslg7=_to_float(trend["rolling_7_xslg"]),
                    xwoba7=_to_float(trend["rolling_7_xwoba"]),
                    hard_hit7=_to_float(trend["rolling_7_hard_hit_pct"]),
                    barrel7=_to_float(trend["rolling_7_barrel_pct"]),
                    sweet_spot7=_to_float(trend["rolling_7_sweet_spot_pct"]),
                    barrel_trend=_to_float(trend["barrel_trend_7_minus_30"]),
                    hard_hit_trend=_to_float(trend["hard_hit_trend_7_minus_30"]),
                    hit_flag=hit_flag,
                )
            )
    return rows


def hit_rate(rows: list[Row]) -> float:
    return sum(row.hit_flag for row in rows) / len(rows) if rows else 0.0


def quartile_summary(rows: list[Row], field: str) -> dict[str, float] | None:
    available = [getattr(row, field) for row in rows if getattr(row, field) is not None]
    if len(available) < 20:
        return None
    q1 = quantile(available, 0.25)
    q3 = quantile(available, 0.75)
    low_rows = [row for row in rows if getattr(row, field) is not None and getattr(row, field) <= q1]
    high_rows = [row for row in rows if getattr(row, field) is not None and getattr(row, field) >= q3]
    return {
        "low_rate": hit_rate(low_rows),
        "high_rate": hit_rate(high_rows),
        "delta": hit_rate(high_rows) - hit_rate(low_rows),
        "low_count": len(low_rows),
        "high_count": len(high_rows),
    }


def build_compound_notes(rows: list[Row]) -> list[str]:
    notes: list[str] = []
    usable = [
        row
        for row in rows
        if row.pitcher_hr9 is not None
        and row.park_hr_index is not None
        and row.xslg7 is not None
        and row.hard_hit7 is not None
        and row.barrel7 is not None
    ]
    if len(usable) < 20:
        return notes

    hr9_q3 = quantile([row.pitcher_hr9 for row in usable if row.pitcher_hr9 is not None], 0.75)
    hr9_q1 = quantile([row.pitcher_hr9 for row in usable if row.pitcher_hr9 is not None], 0.25)
    park_q3 = quantile([row.park_hr_index for row in usable if row.park_hr_index is not None], 0.75)
    xslg_q3 = quantile([row.xslg7 for row in usable if row.xslg7 is not None], 0.75)
    hh_q3 = quantile([row.hard_hit7 for row in usable if row.hard_hit7 is not None], 0.75)
    barrel_q3 = quantile([row.barrel7 for row in usable if row.barrel7 is not None], 0.75)

    high_pitcher_hr9 = [row for row in usable if row.pitcher_hr9 is not None and row.pitcher_hr9 >= hr9_q3]
    if high_pitcher_hr9:
        notes.append(f"`high opposing pitcher HR/9`: {len(high_pitcher_hr9)} picks, {hit_rate(high_pitcher_hr9):.1%} hit.")

    high_park_only = [row for row in usable if row.park_hr_index is not None and row.park_hr_index >= park_q3]
    if high_park_only:
        notes.append(f"`high park HR index` alone: {len(high_park_only)} picks, {hit_rate(high_park_only):.1%} hit.")

    carry_bucket = [
        row
        for row in usable
        if row.pitcher_hr9 is not None
        and row.xslg7 is not None
        and row.hard_hit7 is not None
        and row.pitcher_hr9 >= hr9_q3
        and row.xslg7 >= xslg_q3
        and row.hard_hit7 >= hh_q3
    ]
    if carry_bucket:
        notes.append(f"`high 7d xSLG + hard-hit + pitcher HR/9`: {len(carry_bucket)} picks, {hit_rate(carry_bucket):.1%} hit.")

    overhyped_park = [
        row
        for row in usable
        if row.park_hr_index is not None
        and row.pitcher_hr9 is not None
        and row.park_hr_index >= park_q3
        and row.pitcher_hr9 <= hr9_q1
    ]
    if overhyped_park:
        notes.append(f"`high park index but low opposing HR/9`: {len(overhyped_park)} picks, {hit_rate(overhyped_park):.1%} hit.")

    dead_bucket = [
        row
        for row in usable
        if row.pitcher_hr9 is not None
        and row.xslg7 is not None
        and row.hard_hit7 is not None
        and row.barrel7 is not None
        and row.pitcher_hr9 <= hr9_q1
        and row.xslg7 < xslg_q3
        and row.hard_hit7 < hh_q3
        and row.barrel7 < barrel_q3
    ]
    if dead_bucket:
        notes.append(f"`low opposing HR/9 + no hitter contact carry`: {len(dead_bucket)} picks, {hit_rate(dead_bucket):.1%} hit.")

    return notes


def build_markdown(rows: list[Row]) -> str:
    lines = [
        "# MLB Home Run Filter Audit",
        "",
        "This pass audits the HR prototype board using actual saved daily prototype exports, settled home-run backtests, and the warehouse Statcast trend snapshots.",
        "",
        f"- total graded prototype picks: `{len(rows)}`",
        f"- base HR hit rate: `{hit_rate(rows):.1%}`",
        "",
        "## Quartile Reads",
        "",
        markdown_table(
            ["Feature", "Low quartile hit rate", "High quartile hit rate", "Delta"],
            [
                [
                    f"`{field}`",
                    f"{summary['low_rate'] * 100:.1f}%",
                    f"{summary['high_rate'] * 100:.1f}%",
                    f"{summary['delta'] * 100:+.1f} pts",
                ]
                for field in [
                    "pitcher_hr9",
                    "park_hr_index",
                    "xwoba7",
                    "xslg7",
                    "hard_hit7",
                    "barrel7",
                    "sweet_spot7",
                    "hard_hit_trend",
                    "barrel_trend",
                ]
                if (summary := quartile_summary(rows, field)) is not None
            ],
        ),
        "",
        "## Compound Buckets",
        "",
    ]
    for note in build_compound_notes(rows):
        lines.append(f"- {note}")
    lines.extend(
        [
            "",
            "## Early read",
            "",
            "- `Opposing pitcher HR/9` helps a little. It is a better filter than generic park hype in this sample.",
            "- `High park HR index` by itself is actually running worse than the base board. That suggests the current HR board may still be overpaying for obvious bomb parks without enough pitcher or hitter quality underneath it.",
            "- `7d xSLG`, `7d hard-hit%`, and `7d barrel%` still make more sense as hitter-side support than `sweet-spot%` by itself for HR.",
            "- The sample is still too small to declare a strong green-light HR lane. The better use is to create a **fade gate** that blocks park-only or low-HR9 matchups from getting promoted too aggressively.",
            "",
            "## Next step",
            "",
            "- Keep `homeRun` in filter-only mode.",
            "- Add a live fade penalty when the board has `high park index` but the opposing starter's `HR/9` is bottom-quartile.",
            "- Do not let park context outweigh weak pitcher HR-allow shape or weak hitter contact carry.",
        ]
    )
    return "\n".join(lines) + "\n"


def main() -> None:
    args = parse_args()
    rows = read_rows(Path(args.db), Path(args.hr_dir))
    report = build_markdown(rows)
    Path(args.out).write_text(report)
    print(f"Wrote HR filter audit to {args.out}")


if __name__ == "__main__":
    main()
