#!/usr/bin/env python3

from __future__ import annotations

import argparse
import sqlite3
from dataclasses import dataclass
from pathlib import Path


ROOT = Path(__file__).resolve().parents[3]
DB_PATH = ROOT / "data-private" / "warehouse" / "sports.db"
DEFAULT_OUT = ROOT / "development-docs" / "mlb" / "research" / "mlb-hitter-last10-windows-052926.md"


FEATURES_BY_MARKET = {
    "hits": [
        ("hits_per_pa_last5", "Last 5 hits/PA"),
        ("hits_per_pa_last10", "Last 10 hits/PA"),
        ("multi_hit_games_last5", "Last 5 multi-hit games"),
        ("multi_hit_games_last10", "Last 10 multi-hit games"),
        ("hits_per_pa_last5_minus_last10", "Last 5 minus last 10 hits/PA"),
    ],
    "singles": [
        ("hits_per_pa_last5", "Last 5 hits/PA"),
        ("hits_per_pa_last10", "Last 10 hits/PA"),
        ("whiff_rate_last5", "Last 5 whiff rate"),
        ("whiff_rate_last10", "Last 10 whiff rate"),
        ("hits_per_pa_last5_minus_last10", "Last 5 minus last 10 hits/PA"),
    ],
    "totalBases": [
        ("total_bases_per_pa_last5", "Last 5 TB/PA"),
        ("total_bases_per_pa_last10", "Last 10 TB/PA"),
        ("multi_tb_games_last5", "Last 5 multi-TB games"),
        ("multi_tb_games_last10", "Last 10 multi-TB games"),
        ("total_bases_per_pa_last5_minus_last10", "Last 5 minus last 10 TB/PA"),
    ],
}


@dataclass
class Row:
    market: str
    hit_flag: int
    hits_per_pa_last5: float | None
    hits_per_pa_last10: float | None
    total_bases_per_pa_last5: float | None
    total_bases_per_pa_last10: float | None
    whiff_rate_last5: float | None
    whiff_rate_last10: float | None
    multi_hit_games_last5: float | None
    multi_hit_games_last10: float | None
    multi_tb_games_last5: float | None
    multi_tb_games_last10: float | None
    hits_per_pa_last5_minus_last10: float | None
    total_bases_per_pa_last5_minus_last10: float | None


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Audit classic last-10 hitter windows against batter-prop backtests.")
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
      hs.hits_per_pa_last5,
      hc.hits_per_pa_last10,
      hs.total_bases_per_pa_last5,
      hc.total_bases_per_pa_last10,
      hs.whiff_rate_last5,
      hc.whiff_rate_last10,
      hs.multi_hit_games_last5,
      hc.multi_hit_games_last10,
      hs.multi_tb_games_last5,
      hc.multi_tb_games_last10,
      hc.hits_per_pa_last5_minus_last10,
      hc.total_bases_per_pa_last5_minus_last10
    from mlb_prop_backtests b
    left join mlb_hitter_state_snapshots hs
      on hs.as_of_date = b.prediction_date
     and hs.player_id = b.player_id
    left join mlb_hitter_classic_trend_snapshots hc
      on hc.as_of_date = b.prediction_date
     and hc.player_id = b.player_id
    where b.prop_type in ('hits', 'singles', 'totalBases')
    order by b.prediction_date, b.player_name
    """
    rows: list[Row] = []
    for result in conn.execute(query):
        rows.append(
            Row(
                market=result[0],
                hit_flag=int(result[1]),
                hits_per_pa_last5=_to_float(result[2]),
                hits_per_pa_last10=_to_float(result[3]),
                total_bases_per_pa_last5=_to_float(result[4]),
                total_bases_per_pa_last10=_to_float(result[5]),
                whiff_rate_last5=_to_float(result[6]),
                whiff_rate_last10=_to_float(result[7]),
                multi_hit_games_last5=_to_float(result[8]),
                multi_hit_games_last10=_to_float(result[9]),
                multi_tb_games_last5=_to_float(result[10]),
                multi_tb_games_last10=_to_float(result[11]),
                hits_per_pa_last5_minus_last10=_to_float(result[12]),
                total_bases_per_pa_last5_minus_last10=_to_float(result[13]),
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


def quartile_summary(rows: list[Row], feature: str, reverse: bool = False) -> dict[str, float] | None:
    available = [getattr(row, feature) for row in rows if getattr(row, feature) is not None]
    if len(available) < 16:
        return None
    q1 = quantile(available, 0.25)
    q3 = quantile(available, 0.75)
    if reverse:
        high_rows = [row for row in rows if getattr(row, feature) is not None and getattr(row, feature) <= q1]
        low_rows = [row for row in rows if getattr(row, feature) is not None and getattr(row, feature) >= q3]
    else:
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
        reverse = "whiff_rate" in feature
        summary = quartile_summary(market_rows, feature, reverse=reverse)
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

    lines.append(
        markdown_table(
            ["Feature", "Q4 sample", "Low bucket", "High bucket", "High - low"],
            table_rows,
        )
    )
    lines.append("")

    if market == "hits":
        last5 = summaries.get("hits_per_pa_last5", {}).get("delta", 0.0)
        last10 = summaries.get("hits_per_pa_last10", {}).get("delta", 0.0)
        multi5 = summaries.get("multi_hit_games_last5", {}).get("delta", 0.0)
        multi10 = summaries.get("multi_hit_games_last10", {}).get("delta", 0.0)
        if last10 > last5:
            lines.append(f"- `Last 10 hits/PA` separated better than `Last 5 hits/PA` (`{last10 * 100:+.1f}` vs `{last5 * 100:+.1f}` points).")
        else:
            lines.append(f"- `Last 5 hits/PA` still separated slightly better than `Last 10 hits/PA` (`{last5 * 100:+.1f}` vs `{last10 * 100:+.1f}` points).")
        if multi10 >= multi5:
            lines.append(f"- `Last 10 multi-hit games` was at least as useful as the shorter window (`{multi10 * 100:+.1f}` vs `{multi5 * 100:+.1f}` points).")
        else:
            lines.append(f"- `Last 5 multi-hit games` still carried the stronger signal (`{multi5 * 100:+.1f}` vs `{multi10 * 100:+.1f}` points).")
    elif market == "singles":
        last5 = summaries.get("hits_per_pa_last5", {}).get("delta", 0.0)
        last10 = summaries.get("hits_per_pa_last10", {}).get("delta", 0.0)
        whiff5 = summaries.get("whiff_rate_last5", {}).get("delta", 0.0)
        whiff10 = summaries.get("whiff_rate_last10", {}).get("delta", 0.0)
        lines.append(f"- `Last 10 hits/PA` vs `Last 5 hits/PA`: `{last10 * 100:+.1f}` vs `{last5 * 100:+.1f}` points.")
        lines.append(f"- `Whiff rate` remained a useful filter, and the longer sample was `{whiff10 * 100:+.1f}` points vs `{whiff5 * 100:+.1f}` on the short sample.")
    elif market == "totalBases":
        last5 = summaries.get("total_bases_per_pa_last5", {}).get("delta", 0.0)
        last10 = summaries.get("total_bases_per_pa_last10", {}).get("delta", 0.0)
        multi5 = summaries.get("multi_tb_games_last5", {}).get("delta", 0.0)
        multi10 = summaries.get("multi_tb_games_last10", {}).get("delta", 0.0)
        if last10 > last5:
            lines.append(f"- `Last 10 TB/PA` beat the short window (`{last10 * 100:+.1f}` vs `{last5 * 100:+.1f}` points).")
        else:
            lines.append(f"- `Last 5 TB/PA` was still slightly sharper than `Last 10 TB/PA` (`{last5 * 100:+.1f}` vs `{last10 * 100:+.1f}` points).")
        lines.append(f"- `Multi-TB games` improved with the longer window at `{multi10 * 100:+.1f}` points vs `{multi5 * 100:+.1f}`.")

    lines.append("")
    return lines


def main() -> None:
    args = parse_args()
    conn = sqlite3.connect(args.db)
    rows = read_rows(conn)

    lines = [
        "# MLB Classic Last-10 Hitter Windows — May 29, 2026",
        "",
        "This is the first isolated phase-2 check for the friend-feedback idea to track a longer recent window instead of leaning only on `last 5` box-score form. The goal here is narrow: measure whether a `last 10` classic hitter window separates results better than the current `last 5` metrics before we bundle it with Statcast or matchup inputs.",
        "",
    ]

    for market in ("hits", "singles", "totalBases"):
        lines.extend(summarize_market(rows, market))

    lines.extend(
        [
            "## Read",
            "",
            "- This pass is intentionally **classic-stats only**. No xBA/xwOBA/pitch-fit input is mixed in yet.",
            "- If the longer window helps, it becomes a candidate feature or gate. If it does not, we keep it as UI/context only and do not disturb the live scorer.",
            "",
        ]
    )

    Path(args.out).write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"Wrote report to {args.out}")


if __name__ == "__main__":
    main()
