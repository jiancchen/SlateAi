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
DEFAULT_OUT = ROOT / "development-docs" / "mlb" / "research" / "mlb-shadow-bundle-sweeps-052926.md"
FIT_RE = re.compile(r"fit ([+-]?\d+(?:\.\d+)?)")


@dataclass
class HitsRow:
    hit_flag: int
    rolling_7_xba: float | None
    rolling_7_sweet_spot_pct: float | None
    fit_score: float | None
    strength_delta: float | None


@dataclass
class TBRow:
    hit_flag: int
    rolling_7_xslg: float | None
    rolling_7_hard_hit_pct: float | None
    strength_delta: float | None


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Sweep looser shadow bundle thresholds for MLB hitter props.")
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


def quantile(values: list[float], q: float) -> float:
    sorted_values = sorted(values)
    if len(sorted_values) == 1:
        return sorted_values[0]
    index = (len(sorted_values) - 1) * q
    lower = int(index)
    upper = min(lower + 1, len(sorted_values) - 1)
    weight = index - lower
    return sorted_values[lower] * (1 - weight) + sorted_values[upper] * weight


def pct(value: float) -> str:
    return f"{value * 100:.1f}%"


def hit_rate(rows) -> float:
    return sum(row.hit_flag for row in rows) / len(rows) if rows else 0.0


def read_hits_rows(conn: sqlite3.Connection) -> list[HitsRow]:
    query = """
    select
      b.hit_flag,
      p.raw_json,
      s.rolling_7_xba,
      s.rolling_7_sweet_spot_pct,
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
    """
    rows: list[HitsRow] = []
    for result in conn.execute(query):
        rows.append(
            HitsRow(
                hit_flag=int(result[0]),
                fit_score=extract_fit(result[1]),
                rolling_7_xba=_to_float(result[2]),
                rolling_7_sweet_spot_pct=_to_float(result[3]),
                strength_delta=_to_float(result[4]),
            )
        )
    return rows


def read_tb_rows(conn: sqlite3.Connection) -> list[TBRow]:
    query = """
    select
      b.hit_flag,
      s.rolling_7_xslg,
      s.rolling_7_hard_hit_pct,
      oc.total_bases_per_pa_weight_delta_last10
    from mlb_prop_backtests b
    left join mlb_hitter_statcast_trend_snapshots s
      on s.as_of_date = b.prediction_date
     and s.player_id = b.player_id
    left join mlb_hitter_opponent_context_snapshots oc
      on oc.as_of_date = b.prediction_date
     and oc.player_id = b.player_id
    where b.prop_type = 'totalBases'
    """
    rows: list[TBRow] = []
    for result in conn.execute(query):
        rows.append(
            TBRow(
                hit_flag=int(result[0]),
                rolling_7_xslg=_to_float(result[1]),
                rolling_7_hard_hit_pct=_to_float(result[2]),
                strength_delta=_to_float(result[3]),
            )
        )
    return rows


def sweep_hits(rows: list[HitsRow]) -> list[tuple[str, int, float]]:
    xba_values = [row.rolling_7_xba for row in rows if row.rolling_7_xba is not None]
    sweet_values = [row.rolling_7_sweet_spot_pct for row in rows if row.rolling_7_sweet_spot_pct is not None]
    delta_values = [row.strength_delta for row in rows if row.strength_delta is not None]
    xba_thresholds = [
        ("xBA >= median", quantile(xba_values, 0.50)),
        ("xBA >= Q60", quantile(xba_values, 0.60)),
        ("xBA >= Q75", quantile(xba_values, 0.75)),
    ]
    sweet_thresholds = [
        ("sweet >= median", quantile(sweet_values, 0.50)),
        ("sweet >= Q75", quantile(sweet_values, 0.75)),
    ]
    delta_thresholds = [
        ("delta > 0", 0.0),
        ("delta >= Q75", quantile(delta_values, 0.75)),
    ]
    fit_thresholds = [("fit >= +2", 2.0), ("fit >= +4", 4.0)]

    results: list[tuple[str, int, float]] = []
    for xba_label, xba_cut in xba_thresholds:
        for sweet_label, sweet_cut in sweet_thresholds:
            for fit_label, fit_cut in fit_thresholds:
                for delta_label, delta_cut in delta_thresholds:
                    subset = [
                        row
                        for row in rows
                        if row.rolling_7_xba is not None
                        and row.rolling_7_xba >= xba_cut
                        and row.rolling_7_sweet_spot_pct is not None
                        and row.rolling_7_sweet_spot_pct >= sweet_cut
                        and row.fit_score is not None
                        and row.fit_score >= fit_cut
                        and row.strength_delta is not None
                        and ((row.strength_delta > delta_cut) if delta_label == "delta > 0" else (row.strength_delta >= delta_cut))
                    ]
                    if len(subset) < 8:
                        continue
                    results.append((f"{xba_label}; {sweet_label}; {fit_label}; {delta_label}", len(subset), hit_rate(subset)))
    return sorted(results, key=lambda item: (item[2], item[1]), reverse=True)


def sweep_tb(rows: list[TBRow]) -> list[tuple[str, int, float]]:
    xslg_values = [row.rolling_7_xslg for row in rows if row.rolling_7_xslg is not None]
    hard_values = [row.rolling_7_hard_hit_pct for row in rows if row.rolling_7_hard_hit_pct is not None]
    delta_values = [row.strength_delta for row in rows if row.strength_delta is not None]
    xslg_thresholds = [
        ("xSLG >= median", quantile(xslg_values, 0.50)),
        ("xSLG >= Q60", quantile(xslg_values, 0.60)),
        ("xSLG >= Q75", quantile(xslg_values, 0.75)),
    ]
    hard_thresholds = [
        ("hard-hit >= median", quantile(hard_values, 0.50)),
        ("hard-hit >= Q60", quantile(hard_values, 0.60)),
        ("hard-hit >= Q75", quantile(hard_values, 0.75)),
    ]
    delta_thresholds = [
        ("delta > 0", 0.0),
        ("delta >= Q60", quantile(delta_values, 0.60)),
        ("delta >= Q75", quantile(delta_values, 0.75)),
    ]

    results: list[tuple[str, int, float]] = []
    for xslg_label, xslg_cut in xslg_thresholds:
        for hard_label, hard_cut in hard_thresholds:
            for delta_label, delta_cut in delta_thresholds:
                subset = [
                    row
                    for row in rows
                    if row.rolling_7_xslg is not None
                    and row.rolling_7_xslg >= xslg_cut
                    and row.rolling_7_hard_hit_pct is not None
                    and row.rolling_7_hard_hit_pct >= hard_cut
                    and row.strength_delta is not None
                    and ((row.strength_delta > delta_cut) if delta_label == "delta > 0" else (row.strength_delta >= delta_cut))
                ]
                if len(subset) < 12:
                    continue
                results.append((f"{xslg_label}; {hard_label}; {delta_label}", len(subset), hit_rate(subset)))
    return sorted(results, key=lambda item: (item[2], item[1]), reverse=True)


def markdown_table(headers: list[str], rows: list[list[str]]) -> str:
    header_line = "| " + " | ".join(headers) + " |"
    divider_line = "| " + " | ".join(["---"] * len(headers)) + " |"
    row_lines = ["| " + " | ".join(str(cell) for cell in row) + " |" for row in rows]
    return "\n".join([header_line, divider_line, *row_lines])


def main() -> None:
    args = parse_args()
    conn = sqlite3.connect(args.db)
    hits_rows = read_hits_rows(conn)
    tb_rows = read_tb_rows(conn)
    hits_results = sweep_hits(hits_rows)[:8]
    tb_results = sweep_tb(tb_rows)[:8]

    lines = [
        "# MLB Shadow Bundle Sweeps — May 29, 2026",
        "",
        "This pass broadens the earlier tiny-sample bundle tests. Instead of one hard Q4-only gate, it sweeps looser threshold combinations to find whether there is a usable shadow path with a healthier sample.",
        "",
        f"- hits baseline: `{pct(hit_rate(hits_rows))}` on `{len(hits_rows)}` bets",
        f"- TB baseline: `{pct(hit_rate(tb_rows))}` on `{len(tb_rows)}` bets",
        "",
        "## Hits shadow sweep",
        "",
        markdown_table(
            ["Gate", "Sample", "Hit rate"],
            [[label, str(sample), pct(rate)] for label, sample, rate in hits_results] or [["No qualifying gate", "0", "n/a"]],
        ),
        "",
        "## TB shadow sweep",
        "",
        markdown_table(
            ["Gate", "Sample", "Hit rate"],
            [[label, str(sample), pct(rate)] for label, sample, rate in tb_results] or [["No qualifying gate", "0", "n/a"]],
        ),
        "",
        "## Read",
        "",
        "- These are still **shadow-only** sweeps. The goal is to find candidates worth a larger backtest, not to force a live deployment.",
        "- A candidate only counts as useful if it improves rate **and** keeps enough sample to matter.",
        "",
    ]

    Path(args.out).write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"Wrote report to {args.out}")


if __name__ == "__main__":
    main()
