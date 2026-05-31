#!/usr/bin/env python3

from __future__ import annotations

import argparse
import sqlite3
from dataclasses import dataclass
from pathlib import Path


ROOT = Path(__file__).resolve().parents[3]
DB_PATH = ROOT / "data-private" / "warehouse" / "sports.db"
DEFAULT_OUT = ROOT / "development-docs" / "mlb" / "research" / "mlb-batter-outcome-baselines-052926.md"


@dataclass
class Row:
    slot: int | None
    hits: int
    runs: int
    rbi: int
    hit_run_rbi_total: int
    rolling_7_xba: float | None
    rolling_7_xwoba: float | None
    rolling_7_xslg: float | None
    rolling_7_sweet_spot_pct: float | None
    hits_per_pa_weight_delta_last10: float | None
    total_bases_per_pa_weight_delta_last10: float | None


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Build baseline component report for MLB hits/runs/RBI outcomes.")
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


def read_rows(conn: sqlite3.Connection) -> list[Row]:
    query = """
    select
      o.batting_order,
      o.hits,
      o.runs,
      o.rbi,
      o.hit_run_rbi_total,
      st.rolling_7_xba,
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
            hits=_to_int(result[1]),
            runs=_to_int(result[2]),
            rbi=_to_int(result[3]),
            hit_run_rbi_total=_to_int(result[4]),
            rolling_7_xba=_to_float(result[5]),
            rolling_7_xwoba=_to_float(result[6]),
            rolling_7_xslg=_to_float(result[7]),
            rolling_7_sweet_spot_pct=_to_float(result[8]),
            hits_per_pa_weight_delta_last10=_to_float(result[9]),
            total_bases_per_pa_weight_delta_last10=_to_float(result[10]),
        )
        for result in conn.execute(query)
    ]


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


def mean(values: list[int]) -> float:
    return (sum(values) / len(values)) if values else 0.0


def markdown_table(headers: list[str], rows: list[list[str]]) -> str:
    header_line = "| " + " | ".join(headers) + " |"
    divider_line = "| " + " | ".join(["---"] * len(headers)) + " |"
    row_lines = ["| " + " | ".join(str(cell) for cell in row) + " |" for row in rows]
    return "\n".join([header_line, divider_line, *row_lines])


def summarize_component(
    label: str,
    values: list[int],
    primary_threshold: int,
    higher_threshold: int,
    threshold_label: str,
    higher_label: str,
) -> tuple[list[str], str]:
    sample = len(values)
    primary_hits = sum(1 for value in values if value >= primary_threshold)
    higher_hits = sum(1 for value in values if value >= higher_threshold)
    return (
        [
            label,
            str(sample),
            f"{mean(values):.2f}",
            f"{threshold_label}: {pct(safe_rate(primary_hits, sample))}",
            f"{higher_label}: {pct(safe_rate(higher_hits, sample))}",
        ],
        f"{label} typical line `{threshold_label}` / higher line `{higher_label}`",
    )


def gate_rate(rows: list[Row], predicate, value_getter) -> tuple[int, int, float]:
    filtered = [row for row in rows if predicate(row)]
    sample = len(filtered)
    hits = sum(1 for row in filtered if value_getter(row))
    return hits, sample, safe_rate(hits, sample)


def main() -> None:
    args = parse_args()
    conn = sqlite3.connect(args.db)
    conn.row_factory = sqlite3.Row
    rows = read_rows(conn)

    xba_values = [row.rolling_7_xba for row in rows if row.rolling_7_xba is not None]
    xwoba_values = [row.rolling_7_xwoba for row in rows if row.rolling_7_xwoba is not None]
    xslg_values = [row.rolling_7_xslg for row in rows if row.rolling_7_xslg is not None]
    sweet_values = [row.rolling_7_sweet_spot_pct for row in rows if row.rolling_7_sweet_spot_pct is not None]
    xba_q3 = quantile(xba_values, 0.75)
    xwoba_q3 = quantile(xwoba_values, 0.75)
    xslg_q3 = quantile(xslg_values, 0.75)
    sweet_q3 = quantile(sweet_values, 0.75)

    component_rows: list[list[str]] = []
    legends: list[str] = []
    for summary, legend in [
        summarize_component("Hits", [row.hits for row in rows], 1, 2, ">=1", ">=2"),
        summarize_component("Runs", [row.runs for row in rows], 1, 2, ">=1", ">=2"),
        summarize_component("RBIs", [row.rbi for row in rows], 1, 2, ">=1", ">=2"),
        summarize_component("H+R+RBI", [row.hit_run_rbi_total for row in rows], 2, 3, ">=2", ">=3"),
    ]:
        component_rows.append(summary)
        legends.append(legend)

    hrr_slot_rows = []
    for label, predicate in [
        ("Slots 1-3", lambda row: row.slot is not None and row.slot <= 3),
        ("Slots 4-5", lambda row: row.slot is not None and 4 <= row.slot <= 5),
        ("Slots 6-9", lambda row: row.slot is not None and row.slot >= 6),
    ]:
        bucket = [row for row in rows if predicate(row)]
        hit_rate = safe_rate(sum(1 for row in bucket if row.hit_run_rbi_total >= 2), len(bucket))
        hrr_slot_rows.append([label, str(len(bucket)), pct(hit_rate), f"{mean([row.hit_run_rbi_total for row in bucket]):.2f}"])

    hits_hits, hits_sample, hits_rate = gate_rate(
        rows,
        lambda row: (
            row.rolling_7_xba is not None
            and row.rolling_7_xba >= xba_q3
            and row.rolling_7_sweet_spot_pct is not None
            and row.rolling_7_sweet_spot_pct >= sweet_q3
            and (row.hits_per_pa_weight_delta_last10 or 0) >= 0
        ),
        lambda row: row.hits >= 1,
    )
    runs_hits, runs_sample, runs_rate = gate_rate(
        rows,
        lambda row: (
            row.slot is not None
            and row.slot <= 3
            and row.rolling_7_xwoba is not None
            and row.rolling_7_xwoba >= xwoba_q3
            and (row.hits_per_pa_weight_delta_last10 or 0) >= 0
        ),
        lambda row: row.runs >= 1,
    )
    rbi_hits, rbi_sample, rbi_rate = gate_rate(
        rows,
        lambda row: (
            row.slot is not None
            and 3 <= row.slot <= 5
            and row.rolling_7_xslg is not None
            and row.rolling_7_xslg >= xslg_q3
            and (row.total_bases_per_pa_weight_delta_last10 or 0) >= 0
        ),
        lambda row: row.rbi >= 1,
    )
    hrr_hits, hrr_sample, hrr_rate = gate_rate(
        rows,
        lambda row: (
            row.slot is not None
            and row.slot <= 5
            and row.rolling_7_xwoba is not None
            and row.rolling_7_xwoba >= xwoba_q3
            and (row.hits_per_pa_weight_delta_last10 or 0) >= 0
            and (row.total_bases_per_pa_weight_delta_last10 or 0) >= 0
        ),
        lambda row: row.hit_run_rbi_total >= 2,
    )

    gate_rows = [
        ["Hits", f"xBA Q4 + sweet-spot Q4 + non-negative OppQ delta", str(hits_sample), pct(hits_rate)],
        ["Runs", f"slot <= 3 + xwOBA Q4 + non-negative OppQ delta", str(runs_sample), pct(runs_rate)],
        ["RBIs", f"slots 3-5 + xSLG Q4 + non-negative TB OppQ delta", str(rbi_sample), pct(rbi_rate)],
        ["H+R+RBI", f"slot <= 5 + xwOBA Q4 + positive H/TB deltas", str(hrr_sample), pct(hrr_rate)],
    ]

    lines = [
        "# MLB Batter Outcome Baselines — May 29, 2026",
        "",
        "This is the first explicit outcome baseline for the batting-production path. The goal is not to crown a live edge yet; it is to make `hits`, `runs`, `RBIs`, and `H+R+RBI` stand on their own historical footing before we let the combined ladder pretend to be `TB`-grade.",
        "",
        f"- batter-game sample: `{len(rows)}`",
        f"- 7d xBA Q4 threshold: `{xba_q3:.3f}`",
        f"- 7d xwOBA Q4 threshold: `{xwoba_q3:.3f}`",
        f"- 7d xSLG Q4 threshold: `{xslg_q3:.3f}`",
        f"- 7d sweet-spot Q4 threshold: `{sweet_q3:.1f}%`",
        "",
        "## Component Baselines",
        "",
        markdown_table(["Component", "Sample", "Mean", "Typical line", "Higher line"], component_rows),
        "",
        *[f"- {legend}" for legend in legends],
        "",
        "## H+R+RBI By Lineup Slot",
        "",
        markdown_table(["Slot bucket", "Sample", "H+R+RBI >= 2", "Mean total"], hrr_slot_rows),
        "",
        "## First Simple Gates",
        "",
        markdown_table(["Component", "Prototype gate", "Sample", "Hit rate"], gate_rows),
        "",
        "## Read",
        "",
        f"- `Hits` baseline is `{component_rows[0][3]}`; the first simple pregame gate moved that to `{pct(hits_rate)}` on `{hits_sample}` batter-games.",
        f"- `Runs` baseline is `{component_rows[1][3]}`; the first simple slot + xwOBA gate moved that to `{pct(runs_rate)}` on `{runs_sample}` batter-games.",
        f"- `RBIs` baseline is `{component_rows[2][3]}`; the first simple power-slot gate moved that to `{pct(rbi_rate)}` on `{rbi_sample}` batter-games.",
        f"- `H+R+RBI` baseline at `>=2` is `{component_rows[3][3]}`; the first simple combined gate moved that to `{pct(hrr_rate)}` on `{hrr_sample}` batter-games.",
        "- This is still a baseline report, not a production promotion. The runs lane is especially provisional because explicit `OBP / XOPS` snapshot history is not warehoused yet, so the current run gate leans on slot + xwOBA + opponent-strength delta as a stand-in.",
        "- The immediate value of this report is separation: we can now see which component behaves cleanly enough to tune next instead of treating `H+R+RBI` as one opaque blob.",
        "",
    ]

    Path(args.out).write_text("\n".join(lines), encoding="utf-8")
    print(f"Wrote report to {args.out}")


if __name__ == "__main__":
    main()
