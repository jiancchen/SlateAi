#!/usr/bin/env python3

from __future__ import annotations

import argparse
import sqlite3
from dataclasses import dataclass
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DB_PATH = ROOT / "data-private" / "warehouse" / "sports.db"
DEFAULT_OUT = ROOT / "development-docs" / "mlb-hitter-opponent-strength-052926.md"


FEATURES_BY_MARKET = {
    "hits": [
        ("weighted_hits_per_pa_last10", "Weighted hits/PA last 10"),
        ("hits_per_pa_vs_winning_last10", "Hits/PA vs winning opps"),
        ("hits_per_pa_weight_delta_last10", "Weighted minus raw hits/PA"),
        ("avg_opponent_win_pct_last5_last10", "Avg opp win% last 5"),
    ],
    "singles": [
        ("weighted_hits_per_pa_last10", "Weighted hits/PA last 10"),
        ("hits_per_pa_vs_winning_last10", "Hits/PA vs winning opps"),
        ("hits_per_pa_weight_delta_last10", "Weighted minus raw hits/PA"),
        ("avg_opponent_win_pct_last5_last10", "Avg opp win% last 5"),
    ],
    "totalBases": [
        ("weighted_total_bases_per_pa_last10", "Weighted TB/PA last 10"),
        ("total_bases_per_pa_vs_winning_last10", "TB/PA vs winning opps"),
        ("total_bases_per_pa_weight_delta_last10", "Weighted minus raw TB/PA"),
        ("avg_opponent_win_pct_last5_last10", "Avg opp win% last 5"),
    ],
}


@dataclass
class Row:
    market: str
    hit_flag: int
    weighted_hits_per_pa_last10: float | None
    hits_per_pa_vs_winning_last10: float | None
    hits_per_pa_weight_delta_last10: float | None
    avg_opponent_win_pct_last5_last10: float | None
    weighted_total_bases_per_pa_last10: float | None
    total_bases_per_pa_vs_winning_last10: float | None
    total_bases_per_pa_weight_delta_last10: float | None


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Audit hitter opponent-strength context against batter-prop backtests.")
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


def read_rows(conn: sqlite3.Connection) -> list[Row]:
    query = """
    select
      b.prop_type as market,
      b.hit_flag,
      oc.weighted_hits_per_pa_last10,
      oc.hits_per_pa_vs_winning_last10,
      oc.hits_per_pa_weight_delta_last10,
      oc.avg_opponent_win_pct_last5_last10,
      oc.weighted_total_bases_per_pa_last10,
      oc.total_bases_per_pa_vs_winning_last10,
      oc.total_bases_per_pa_weight_delta_last10
    from mlb_prop_backtests b
    left join mlb_hitter_opponent_context_snapshots oc
      on oc.as_of_date = b.prediction_date
     and oc.player_id = b.player_id
    where b.prop_type in ('hits', 'singles', 'totalBases')
    order by b.prediction_date, b.player_name
    """
    rows: list[Row] = []
    for result in conn.execute(query):
        rows.append(
            Row(
                market=result[0],
                hit_flag=int(result[1]),
                weighted_hits_per_pa_last10=_to_float(result[2]),
                hits_per_pa_vs_winning_last10=_to_float(result[3]),
                hits_per_pa_weight_delta_last10=_to_float(result[4]),
                avg_opponent_win_pct_last5_last10=_to_float(result[5]),
                weighted_total_bases_per_pa_last10=_to_float(result[6]),
                total_bases_per_pa_vs_winning_last10=_to_float(result[7]),
                total_bases_per_pa_weight_delta_last10=_to_float(result[8]),
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


def quartile_summary(rows: list[Row], feature: str) -> dict[str, float] | None:
    available = [getattr(row, feature) for row in rows if getattr(row, feature) is not None]
    if len(available) < 16:
        return None
    q1 = quantile(available, 0.25)
    q3 = quantile(available, 0.75)
    low_rows = [row for row in rows if getattr(row, feature) is not None and getattr(row, feature) <= q1]
    high_rows = [row for row in rows if getattr(row, feature) is not None and getattr(row, feature) >= q3]
    return {
        "low_rate": hit_rate(low_rows),
        "high_rate": hit_rate(high_rows),
        "delta": hit_rate(high_rows) - hit_rate(low_rows),
        "low_count": len(low_rows),
        "high_count": len(high_rows),
    }


def markdown_table(headers: list[str], rows: list[list[str]]) -> str:
    header_line = "| " + " | ".join(headers) + " |"
    divider_line = "| " + " | ".join(["---"] * len(headers)) + " |"
    row_lines = ["| " + " | ".join(str(cell) for cell in row) + " |" for row in rows]
    return "\n".join([header_line, divider_line, *row_lines])


def pct(value: float) -> str:
    return f"{value * 100:.1f}%"


def summarize_market(rows: list[Row], market: str) -> list[str]:
    market_rows = [row for row in rows if row.market == market]
    lines = [f"## {market}", ""]
    lines.append(f"- sample: `{len(market_rows)}` bets")
    lines.append(f"- base hit rate: `{pct(hit_rate(market_rows))}`")
    lines.append("")

    table_rows: list[list[str]] = []
    summaries: dict[str, dict[str, float]] = {}
    for feature, label in FEATURES_BY_MARKET[market]:
        summary = quartile_summary(market_rows, feature)
        if not summary:
            continue
        summaries[feature] = summary
        table_rows.append(
            [
                label,
                str(summary["high_count"]),
                pct(summary["low_rate"]),
                pct(summary["high_rate"]),
                f"{summary['delta'] * 100:+.1f} pts",
            ]
        )
    lines.append(markdown_table(["Feature", "Q4 sample", "Low bucket", "High bucket", "High - low"], table_rows))
    lines.append("")

    if market in ("hits", "singles"):
        weighted = summaries.get("weighted_hits_per_pa_last10", {}).get("delta", 0.0)
        vs_winning = summaries.get("hits_per_pa_vs_winning_last10", {}).get("delta", 0.0)
        delta = summaries.get("hits_per_pa_weight_delta_last10", {}).get("delta", 0.0)
        lines.append(
            f"- Best isolated opponent-strength signal in this pass: `{max([weighted, vs_winning, delta]) * 100:+.1f}` points."
        )
    else:
        weighted = summaries.get("weighted_total_bases_per_pa_last10", {}).get("delta", 0.0)
        vs_winning = summaries.get("total_bases_per_pa_vs_winning_last10", {}).get("delta", 0.0)
        delta = summaries.get("total_bases_per_pa_weight_delta_last10", {}).get("delta", 0.0)
        lines.append(
            f"- Best isolated opponent-strength signal in this pass: `{max([weighted, vs_winning, delta]) * 100:+.1f}` points."
        )
    lines.append("")
    return lines


def main() -> None:
    args = parse_args()
    conn = sqlite3.connect(args.db)
    rows = read_rows(conn)

    lines = [
        "# MLB Hitter Opponent-Strength Context — May 29, 2026",
        "",
        "This isolated phase-2 pass tests whether **who a hitter faced** in the last 10 games helps more than plain raw box-score form. The table below uses only recent-opponent context that existed *before* each game: opponent recent win%, opponent recent run-diff, and weighted versions of the hitter's last-10 production.",
        "",
    ]

    for market in ("hits", "singles", "totalBases"):
        lines.extend(summarize_market(rows, market))

    lines.extend(
        [
            "## Read",
            "",
            "- This pass does **not** bundle Statcast or pitch-fit yet. It only asks whether opponent-strength weighting helps on its own.",
            "- If the weighted version beats the raw version, it becomes a valid candidate for the next shadow bundle test.",
            "",
        ]
    )

    Path(args.out).write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"Wrote report to {args.out}")


if __name__ == "__main__":
    main()
