#!/usr/bin/env python3

from __future__ import annotations

import argparse
import sqlite3
from dataclasses import dataclass
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DB_PATH = ROOT / "data-private" / "warehouse" / "sports.db"
DEFAULT_OUT = ROOT / "development-docs" / "mlb-batter-outcome-gate-sweeps-052926.md"


@dataclass
class Row:
    slot: int | None
    runs: int
    rbi: int
    hit_run_rbi_total: int
    rolling_7_xwoba: float | None
    rolling_7_xslg: float | None
    rolling_7_sweet_spot_pct: float | None
    hits_per_pa_weight_delta_last10: float | None
    total_bases_per_pa_weight_delta_last10: float | None


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Sweep simple pregame gates for runs / RBI / H+R+RBI outcomes.")
    parser.add_argument("--db", default=str(DB_PATH))
    parser.add_argument("--out", default=str(DEFAULT_OUT))
    return parser.parse_args()


def _to_float(value) -> float | None:
    try:
        if value is None:
            return None
        return float(value)
    except (TypeError, ValueError):
        return None


def _to_int(value) -> int:
    try:
        if value is None:
            return 0
        return int(value)
    except (TypeError, ValueError):
        return 0


def quantile(values: list[float], q: float) -> float:
    sorted_values = sorted(values)
    if not sorted_values:
        return 0.0
    if len(sorted_values) == 1:
        return sorted_values[0]
    index = (len(sorted_values) - 1) * q
    lower = int(index)
    upper = min(lower + 1, len(sorted_values) - 1)
    weight = index - lower
    return sorted_values[lower] * (1 - weight) + sorted_values[upper] * weight


def pct(value: float) -> str:
    return f"{value * 100:.1f}%"


def safe_rate(hit_count: int, sample: int) -> float:
    return (hit_count / sample) if sample else 0.0


def markdown_table(headers: list[str], rows: list[list[str]]) -> str:
    header_line = "| " + " | ".join(headers) + " |"
    divider_line = "| " + " | ".join(["---"] * len(headers)) + " |"
    row_lines = ["| " + " | ".join(str(cell) for cell in row) + " |" for row in rows]
    return "\n".join([header_line, divider_line, *row_lines])


def read_rows(conn: sqlite3.Connection) -> list[Row]:
    query = """
    select
      o.batting_order,
      o.runs,
      o.rbi,
      o.hit_run_rbi_total,
      st.rolling_7_xwoba,
      st.rolling_7_xslg,
      st.rolling_7_sweet_spot_pct,
      oc.hits_per_pa_weight_delta_last10,
      oc.total_bases_per_pa_weight_delta_last10
    from mlb_batter_game_outcomes o
    left join mlb_hitter_statcast_trend_snapshots st
      on st.as_of_date = o.game_date
     and st.team_name = o.team_name
     and st.player_id = o.player_id
    left join mlb_hitter_opponent_context_snapshots oc
      on oc.as_of_date = o.game_date
     and oc.team_name = o.team_name
     and oc.player_id = o.player_id
    order by o.game_date, o.team_name, o.batting_order, o.player_name
    """
    return [
        Row(
            slot=_to_int(result[0]) or None,
            runs=_to_int(result[1]),
            rbi=_to_int(result[2]),
            hit_run_rbi_total=_to_int(result[3]),
            rolling_7_xwoba=_to_float(result[4]),
            rolling_7_xslg=_to_float(result[5]),
            rolling_7_sweet_spot_pct=_to_float(result[6]),
            hits_per_pa_weight_delta_last10=_to_float(result[7]),
            total_bases_per_pa_weight_delta_last10=_to_float(result[8]),
        )
        for result in conn.execute(query)
    ]


def evaluate(rows: list[Row], label: str, predicate, outcome_predicate) -> list[str]:
    bucket = [row for row in rows if predicate(row)]
    sample = len(bucket)
    hits = sum(1 for row in bucket if outcome_predicate(row))
    return [label, str(sample), pct(safe_rate(hits, sample))]


def main() -> None:
    args = parse_args()
    conn = sqlite3.connect(args.db)
    rows = read_rows(conn)

    xwoba_values = [row.rolling_7_xwoba for row in rows if row.rolling_7_xwoba is not None]
    xslg_values = [row.rolling_7_xslg for row in rows if row.rolling_7_xslg is not None]
    sweet_values = [row.rolling_7_sweet_spot_pct for row in rows if row.rolling_7_sweet_spot_pct is not None]

    xwoba_q3 = quantile(xwoba_values, 0.75)
    xslg_q3 = quantile(xslg_values, 0.75)
    sweet_q3 = quantile(sweet_values, 0.75)

    runs_rows = [
        evaluate(rows, "Baseline runs >= 1", lambda row: True, lambda row: row.runs >= 1),
        evaluate(
            rows,
            "slot <= 3 + xwOBA Q4",
            lambda row: row.slot is not None and row.slot <= 3 and (row.rolling_7_xwoba or -1) >= xwoba_q3,
            lambda row: row.runs >= 1,
        ),
        evaluate(
            rows,
            "slot <= 3 + xwOBA Q4 + OppQ hits delta >= 0",
            lambda row: (
                row.slot is not None
                and row.slot <= 3
                and (row.rolling_7_xwoba or -1) >= xwoba_q3
                and (row.hits_per_pa_weight_delta_last10 or -999) >= 0
            ),
            lambda row: row.runs >= 1,
        ),
        evaluate(
            rows,
            "slot <= 5 + xwOBA Q4 + sweet-spot Q4",
            lambda row: (
                row.slot is not None
                and row.slot <= 5
                and (row.rolling_7_xwoba or -1) >= xwoba_q3
                and (row.rolling_7_sweet_spot_pct or -1) >= sweet_q3
            ),
            lambda row: row.runs >= 1,
        ),
    ]

    rbi_rows = [
        evaluate(rows, "Baseline RBI >= 1", lambda row: True, lambda row: row.rbi >= 1),
        evaluate(
            rows,
            "slots 3-5 + xSLG Q4",
            lambda row: row.slot is not None and 3 <= row.slot <= 5 and (row.rolling_7_xslg or -1) >= xslg_q3,
            lambda row: row.rbi >= 1,
        ),
        evaluate(
            rows,
            "slots 3-5 + xSLG Q4 + TB OppQ delta >= 0",
            lambda row: (
                row.slot is not None
                and 3 <= row.slot <= 5
                and (row.rolling_7_xslg or -1) >= xslg_q3
                and (row.total_bases_per_pa_weight_delta_last10 or -999) >= 0
            ),
            lambda row: row.rbi >= 1,
        ),
        evaluate(
            rows,
            "slots 2-5 + xSLG Q4 + xwOBA Q4",
            lambda row: (
                row.slot is not None
                and 2 <= row.slot <= 5
                and (row.rolling_7_xslg or -1) >= xslg_q3
                and (row.rolling_7_xwoba or -1) >= xwoba_q3
            ),
            lambda row: row.rbi >= 1,
        ),
    ]

    hrr_rows = [
        evaluate(rows, "Baseline H+R+RBI >= 2", lambda row: True, lambda row: row.hit_run_rbi_total >= 2),
        evaluate(
            rows,
            "slot <= 5 + xwOBA Q4",
            lambda row: row.slot is not None and row.slot <= 5 and (row.rolling_7_xwoba or -1) >= xwoba_q3,
            lambda row: row.hit_run_rbi_total >= 2,
        ),
        evaluate(
            rows,
            "slot <= 5 + xwOBA Q4 + positive H/TB deltas",
            lambda row: (
                row.slot is not None
                and row.slot <= 5
                and (row.rolling_7_xwoba or -1) >= xwoba_q3
                and (row.hits_per_pa_weight_delta_last10 or -999) >= 0
                and (row.total_bases_per_pa_weight_delta_last10 or -999) >= 0
            ),
            lambda row: row.hit_run_rbi_total >= 2,
        ),
        evaluate(
            rows,
            "slot <= 5 + xwOBA Q4 + xSLG Q4",
            lambda row: (
                row.slot is not None
                and row.slot <= 5
                and (row.rolling_7_xwoba or -1) >= xwoba_q3
                and (row.rolling_7_xslg or -1) >= xslg_q3
            ),
            lambda row: row.hit_run_rbi_total >= 2,
        ),
        evaluate(
            rows,
            "slot <= 3 + xwOBA Q4 + positive H/TB deltas",
            lambda row: (
                row.slot is not None
                and row.slot <= 3
                and (row.rolling_7_xwoba or -1) >= xwoba_q3
                and (row.hits_per_pa_weight_delta_last10 or -999) >= 0
                and (row.total_bases_per_pa_weight_delta_last10 or -999) >= 0
            ),
            lambda row: row.hit_run_rbi_total >= 2,
        ),
    ]

    lines = [
        "# MLB Batter Outcome Gate Sweeps — May 29, 2026",
        "",
        "This is the first focused sweep after the batter-outcome corpus landed. The goal is to see which simple pregame gate families actually move `runs`, `RBIs`, and `H+R+RBI` enough to deserve the next modeling pass.",
        "",
        f"- batter-game sample: `{len(rows)}`",
        f"- 7d xwOBA Q4 threshold: `{xwoba_q3:.3f}`",
        f"- 7d xSLG Q4 threshold: `{xslg_q3:.3f}`",
        f"- 7d sweet-spot Q4 threshold: `{sweet_q3:.1f}%`",
        "",
        "## Runs Gates",
        "",
        markdown_table(["Gate", "Sample", "Hit rate"], runs_rows),
        "",
        "## RBI Gates",
        "",
        markdown_table(["Gate", "Sample", "Hit rate"], rbi_rows),
        "",
        "## H+R+RBI Gates",
        "",
        markdown_table(["Gate", "Sample", "Hit rate"], hrr_rows),
        "",
        "## Read",
        "",
        f"- Best `runs` gate in this pass: `{max(runs_rows[1:], key=lambda row: float(row[2].strip('%')) if row[1] != '0' else -1.0)[0]}`.",
        f"- Best `RBI` gate in this pass: `{max(rbi_rows[1:], key=lambda row: float(row[2].strip('%')) if row[1] != '0' else -1.0)[0]}`.",
        f"- Best `H+R+RBI` gate in this pass: `{max(hrr_rows[1:], key=lambda row: float(row[2].strip('%')) if row[1] != '0' else -1.0)[0]}`.",
        "- If one of these lanes wins clearly, it should become the next isolated feature path before we touch the live value board again.",
        "",
    ]

    Path(args.out).write_text("\n".join(lines), encoding="utf-8")
    print(f"Wrote report to {args.out}")


if __name__ == "__main__":
    main()
