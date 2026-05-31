#!/usr/bin/env python3

from __future__ import annotations

import argparse
import json
import re
import sqlite3
from dataclasses import dataclass
from pathlib import Path


ROOT = Path(__file__).resolve().parents[3]
DB_PATH = ROOT / "data-private" / "warehouse" / "sports.db"
DEFAULT_OUT = ROOT / "development-docs" / "mlb" / "research" / "mlb-hits-shadow-bundle-052926.md"
FIT_RE = re.compile(r"fit ([+-]?\d+(?:\.\d+)?)")


@dataclass
class Row:
    hit_flag: int
    rolling_7_xba: float | None
    rolling_7_sweet_spot_pct: float | None
    fit_score: float | None
    weighted_hits_per_pa_last10: float | None
    hits_per_pa_vs_winning_last10: float | None
    hits_per_pa_weight_delta_last10: float | None


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Shadow-bundle audit for MLB hits props.")
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


def extract_fit(raw_json: str | None) -> float | None:
    if not raw_json:
        return None
    try:
        data = json.loads(raw_json)
    except json.JSONDecodeError:
        return None
    summary = data.get("playerSummary") or ""
    match = FIT_RE.search(summary)
    return float(match.group(1)) if match else None


def read_rows(conn: sqlite3.Connection) -> list[Row]:
    query = """
    select
      b.hit_flag,
      p.raw_json,
      s.rolling_7_xba,
      s.rolling_7_sweet_spot_pct,
      oc.weighted_hits_per_pa_last10,
      oc.hits_per_pa_vs_winning_last10,
      oc.hits_per_pa_weight_delta_last10
    from mlb_prop_backtests b
    join mlb_prop_predictions p
      on p.prediction_date = b.prediction_date
     and p.model_name = b.model_name
     and p.game_id = b.game_id
     and p.player_id = b.player_id
     and p.prop_type = b.prop_type
    left join mlb_hitter_statcast_trend_snapshots s
      on s.as_of_date = b.prediction_date
     and s.player_id = b.player_id
    left join mlb_hitter_opponent_context_snapshots oc
      on oc.as_of_date = b.prediction_date
     and oc.player_id = b.player_id
    where b.prop_type = 'hits'
    order by b.prediction_date, b.player_name
    """
    rows: list[Row] = []
    for result in conn.execute(query):
        rows.append(
            Row(
                hit_flag=int(result[0]),
                fit_score=extract_fit(result[1]),
                rolling_7_xba=_to_float(result[2]),
                rolling_7_sweet_spot_pct=_to_float(result[3]),
                weighted_hits_per_pa_last10=_to_float(result[4]),
                hits_per_pa_vs_winning_last10=_to_float(result[5]),
                hits_per_pa_weight_delta_last10=_to_float(result[6]),
            )
        )
    return rows


def quantile(values: list[float], q: float) -> float:
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


def pct(value: float) -> str:
    return f"{value * 100:.1f}%"


def summarize_gate(label: str, rows: list[Row]) -> list[str]:
    return [label, str(len(rows)), pct(hit_rate(rows))]


def main() -> None:
    args = parse_args()
    conn = sqlite3.connect(args.db)
    rows = read_rows(conn)

    xba_q3 = quantile([row.rolling_7_xba for row in rows if row.rolling_7_xba is not None], 0.75)
    sweet_q3 = quantile([row.rolling_7_sweet_spot_pct for row in rows if row.rolling_7_sweet_spot_pct is not None], 0.75)
    weighted_q3 = quantile([row.weighted_hits_per_pa_last10 for row in rows if row.weighted_hits_per_pa_last10 is not None], 0.75)
    winning_q3 = quantile([row.hits_per_pa_vs_winning_last10 for row in rows if row.hits_per_pa_vs_winning_last10 is not None], 0.75)

    xba_sweet_fit = [
        row
        for row in rows
        if row.rolling_7_xba is not None
        and row.rolling_7_xba >= xba_q3
        and row.rolling_7_sweet_spot_pct is not None
        and row.rolling_7_sweet_spot_pct >= sweet_q3
        and row.fit_score is not None
        and row.fit_score >= 4.0
    ]
    xba_sweet_fit_weighted = [
        row
        for row in xba_sweet_fit
        if row.weighted_hits_per_pa_last10 is not None
        and row.weighted_hits_per_pa_last10 >= weighted_q3
    ]
    xba_sweet_fit_vs_winning = [
        row
        for row in xba_sweet_fit
        if row.hits_per_pa_vs_winning_last10 is not None
        and row.hits_per_pa_vs_winning_last10 >= winning_q3
    ]
    xba_sweet_fit_positive_delta = [
        row
        for row in xba_sweet_fit
        if row.hits_per_pa_weight_delta_last10 is not None
        and row.hits_per_pa_weight_delta_last10 > 0
    ]

    gate_rows = [
        summarize_gate("Baseline hits overs", rows),
        summarize_gate("xBA Q4 + sweet-spot Q4 + fit >= +4.0", xba_sweet_fit),
        summarize_gate("Bundle + weighted hits/PA Q4", xba_sweet_fit_weighted),
        summarize_gate("Bundle + hits/PA vs winning opps Q4", xba_sweet_fit_vs_winning),
        summarize_gate("Bundle + positive strength delta", xba_sweet_fit_positive_delta),
    ]

    lines = [
        "# MLB Hits Shadow Bundle — May 29, 2026",
        "",
        "This is a **shadow-only** bundle test. Nothing in here changes the live board. The goal is to see whether the first useful xBA gate gets cleaner once we add opponent-strength history on top of `xBA + sweet-spot + fit`.",
        "",
        f"- sample: `{len(rows)}` historical hits bets",
        f"- base hit rate: `{pct(hit_rate(rows))}`",
        "",
        "## Bundle Results",
        "",
        "| Gate | Sample | Hit rate |",
        "| --- | --- | --- |",
        *[f"| {label} | {count} | {rate} |" for label, count, rate in gate_rows],
        "",
        "## Read",
        "",
        f"- `7d xBA` Q4 threshold: `{xba_q3:.3f}`",
        f"- `7d sweet-spot` Q4 threshold: `{sweet_q3:.1f}%`",
        f"- weighted hits/PA Q4 threshold: `{weighted_q3:.3f}`",
        f"- hits/PA vs winning opponents Q4 threshold: `{winning_q3:.3f}`",
        "- This remains a shadow experiment only. If one of these bundles materially improves rate without collapsing the sample, it graduates to a larger backtest before any live deployment.",
        "",
    ]

    Path(args.out).write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"Wrote report to {args.out}")


if __name__ == "__main__":
    main()
