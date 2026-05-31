#!/usr/bin/env python3

from __future__ import annotations

import argparse
import sqlite3
from dataclasses import dataclass
from pathlib import Path


ROOT = Path(__file__).resolve().parents[3]
DB_PATH = ROOT / "data-private" / "warehouse" / "sports.db"
DEFAULT_OUT = ROOT / "development-docs" / "mlb-hitter-statcast-signal-052826.md"


FEATURES = [
    "rolling_7_xwoba",
    "rolling_14_xwoba",
    "rolling_30_xwoba",
    "rolling_7_xba",
    "rolling_14_xba",
    "rolling_30_xba",
    "rolling_7_xslg",
    "rolling_14_xslg",
    "rolling_30_xslg",
    "xwoba_trend_7_minus_30",
    "rolling_7_barrel_pct",
    "rolling_30_barrel_pct",
    "barrel_trend_7_minus_30",
    "rolling_7_hard_hit_pct",
    "rolling_30_hard_hit_pct",
    "hard_hit_trend_7_minus_30",
    "rolling_7_sweet_spot_pct",
    "rolling_30_sweet_spot_pct",
    "sweet_spot_trend_7_minus_30",
]


@dataclass
class Row:
    market: str
    hit_flag: int
    rolling_7_xwoba: float | None
    rolling_14_xwoba: float | None
    rolling_30_xwoba: float | None
    rolling_7_xba: float | None
    rolling_14_xba: float | None
    rolling_30_xba: float | None
    rolling_7_xslg: float | None
    rolling_14_xslg: float | None
    rolling_30_xslg: float | None
    xwoba_trend_7_minus_30: float | None
    rolling_7_barrel_pct: float | None
    rolling_30_barrel_pct: float | None
    barrel_trend_7_minus_30: float | None
    rolling_7_hard_hit_pct: float | None
    rolling_30_hard_hit_pct: float | None
    hard_hit_trend_7_minus_30: float | None
    rolling_7_sweet_spot_pct: float | None
    rolling_30_sweet_spot_pct: float | None
    sweet_spot_trend_7_minus_30: float | None


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Audit rolling hitter Statcast signals against MLB batter props.")
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
    rows: list[Row] = []
    prop_query = """
    select
      b.prop_type as market,
      b.hit_flag,
      s.rolling_7_xwoba,
      s.rolling_14_xwoba,
      s.rolling_30_xwoba,
      s.rolling_7_xba,
      s.rolling_14_xba,
      s.rolling_30_xba,
      s.rolling_7_xslg,
      s.rolling_14_xslg,
      s.rolling_30_xslg,
      s.xwoba_trend_7_minus_30,
      s.rolling_7_barrel_pct,
      s.rolling_30_barrel_pct,
      s.barrel_trend_7_minus_30,
      s.rolling_7_hard_hit_pct,
      s.rolling_30_hard_hit_pct,
      s.hard_hit_trend_7_minus_30,
      s.rolling_7_sweet_spot_pct,
      s.rolling_30_sweet_spot_pct,
      s.sweet_spot_trend_7_minus_30
    from mlb_prop_backtests b
    left join mlb_hitter_statcast_trend_snapshots s
      on s.as_of_date = b.prediction_date
     and s.player_id = b.player_id
    where b.prop_type in ('singles', 'totalBases')
    order by b.prediction_date, b.player_name
    """
    for result in conn.execute(prop_query):
        rows.append(
            Row(
                market=result[0],
                hit_flag=int(result[1]),
                rolling_7_xwoba=_to_float(result[2]),
                rolling_14_xwoba=_to_float(result[3]),
                rolling_30_xwoba=_to_float(result[4]),
                rolling_7_xba=_to_float(result[5]),
                rolling_14_xba=_to_float(result[6]),
                rolling_30_xba=_to_float(result[7]),
                rolling_7_xslg=_to_float(result[8]),
                rolling_14_xslg=_to_float(result[9]),
                rolling_30_xslg=_to_float(result[10]),
                xwoba_trend_7_minus_30=_to_float(result[11]),
                rolling_7_barrel_pct=_to_float(result[12]),
                rolling_30_barrel_pct=_to_float(result[13]),
                barrel_trend_7_minus_30=_to_float(result[14]),
                rolling_7_hard_hit_pct=_to_float(result[15]),
                rolling_30_hard_hit_pct=_to_float(result[16]),
                hard_hit_trend_7_minus_30=_to_float(result[17]),
                rolling_7_sweet_spot_pct=_to_float(result[18]),
                rolling_30_sweet_spot_pct=_to_float(result[19]),
                sweet_spot_trend_7_minus_30=_to_float(result[20]),
            )
        )

    hr_query = """
    select
      'homeRuns' as market,
      b.hit_flag,
      s.rolling_7_xwoba,
      s.rolling_14_xwoba,
      s.rolling_30_xwoba,
      s.rolling_7_xba,
      s.rolling_14_xba,
      s.rolling_30_xba,
      s.rolling_7_xslg,
      s.rolling_14_xslg,
      s.rolling_30_xslg,
      s.xwoba_trend_7_minus_30,
      s.rolling_7_barrel_pct,
      s.rolling_30_barrel_pct,
      s.barrel_trend_7_minus_30,
      s.rolling_7_hard_hit_pct,
      s.rolling_30_hard_hit_pct,
      s.hard_hit_trend_7_minus_30,
      s.rolling_7_sweet_spot_pct,
      s.rolling_30_sweet_spot_pct,
      s.sweet_spot_trend_7_minus_30
    from mlb_home_run_backtests b
    left join mlb_hitter_statcast_trend_snapshots s
      on s.as_of_date = b.prediction_date
     and s.player_id = b.player_id
    order by b.prediction_date, b.player_name
    """
    for result in conn.execute(hr_query):
        rows.append(
            Row(
                market=result[0],
                hit_flag=int(result[1]),
                rolling_7_xwoba=_to_float(result[2]),
                rolling_14_xwoba=_to_float(result[3]),
                rolling_30_xwoba=_to_float(result[4]),
                rolling_7_xba=_to_float(result[5]),
                rolling_14_xba=_to_float(result[6]),
                rolling_30_xba=_to_float(result[7]),
                rolling_7_xslg=_to_float(result[8]),
                rolling_14_xslg=_to_float(result[9]),
                rolling_30_xslg=_to_float(result[10]),
                xwoba_trend_7_minus_30=_to_float(result[11]),
                rolling_7_barrel_pct=_to_float(result[12]),
                rolling_30_barrel_pct=_to_float(result[13]),
                barrel_trend_7_minus_30=_to_float(result[14]),
                rolling_7_hard_hit_pct=_to_float(result[15]),
                rolling_30_hard_hit_pct=_to_float(result[16]),
                hard_hit_trend_7_minus_30=_to_float(result[17]),
                rolling_7_sweet_spot_pct=_to_float(result[18]),
                rolling_30_sweet_spot_pct=_to_float(result[19]),
                sweet_spot_trend_7_minus_30=_to_float(result[20]),
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


def build_compound_notes(rows: list[Row], market: str) -> list[str]:
    notes: list[str] = []
    usable = [row for row in rows if row.rolling_7_xwoba is not None and row.rolling_30_xwoba is not None]
    if len(usable) < 20:
        return notes

    xwoba_q3 = quantile([row.rolling_7_xwoba for row in usable if row.rolling_7_xwoba is not None], 0.75)
    xba_q3 = quantile([row.rolling_7_xba for row in usable if row.rolling_7_xba is not None], 0.75)
    xslg_q3 = quantile([row.rolling_7_xslg for row in usable if row.rolling_7_xslg is not None], 0.75)
    hard_hit_q3 = quantile([row.rolling_7_hard_hit_pct for row in usable if row.rolling_7_hard_hit_pct is not None], 0.75)
    barrel_q3 = quantile([row.rolling_7_barrel_pct for row in usable if row.rolling_7_barrel_pct is not None], 0.75)
    sweet_q3 = quantile([row.rolling_7_sweet_spot_pct for row in usable if row.rolling_7_sweet_spot_pct is not None], 0.75)

    if market == "singles":
        bucket = [
            row
            for row in usable
            if row.rolling_7_xba is not None
            and row.rolling_7_sweet_spot_pct is not None
            and row.rolling_7_xba >= xba_q3
            and row.rolling_7_sweet_spot_pct >= sweet_q3
        ]
        if bucket:
            notes.append(f"`high 7d xBA + sweet-spot`: {len(bucket)} bets, {hit_rate(bucket):.1%} hit.")
    elif market == "totalBases":
        bucket = [
            row
            for row in usable
            if row.rolling_7_xslg is not None
            and row.rolling_7_barrel_pct is not None
            and row.rolling_7_hard_hit_pct is not None
            and row.rolling_7_xslg >= xslg_q3
            and row.rolling_7_barrel_pct >= barrel_q3
            and row.rolling_7_hard_hit_pct >= hard_hit_q3
        ]
        if bucket:
            notes.append(f"`high 7d xSLG + barrel + hard-hit`: {len(bucket)} bets, {hit_rate(bucket):.1%} hit.")
    elif market == "homeRuns":
        bucket = [
            row
            for row in usable
            if row.rolling_7_xslg is not None
            and row.rolling_7_barrel_pct is not None
            and row.rolling_7_hard_hit_pct is not None
            and row.rolling_7_sweet_spot_pct is not None
            and row.barrel_trend_7_minus_30 is not None
            and row.rolling_7_xslg >= xslg_q3
            and row.rolling_7_barrel_pct >= barrel_q3
            and row.rolling_7_hard_hit_pct >= hard_hit_q3
            and row.rolling_7_sweet_spot_pct >= sweet_q3
            and row.barrel_trend_7_minus_30 > 0
        ]
        if bucket:
            notes.append(f"`high 7d xSLG + barrel + hard-hit + sweet-spot + positive barrel trend`: {len(bucket)} bets, {hit_rate(bucket):.1%} hit.")
    return notes


def format_pct(value: float) -> str:
    return f"{value * 100:.1f}%"


def build_markdown(rows: list[Row]) -> str:
    grouped: dict[str, list[Row]] = {"singles": [], "totalBases": [], "homeRuns": []}
    for row in rows:
        grouped.setdefault(row.market, []).append(row)

    lines = [
        "# MLB Hitter Statcast Trend Audit",
        "",
        "This report checks whether rolling Statcast quality windows improve the batter-prop read over the old result-only hitter state table.",
        "",
        "What was added:",
        "- `mlb_hitter_statcast_game_logs` from Baseball Savant Statcast search (`group_by=name-date` + event-detail sweet-spot recovery)",
        "- `mlb_hitter_statcast_trend_snapshots` with rolling `7/14/30` windows",
        "- trend deltas for `xwOBA`, `barrel%`, `hard-hit%`, and `sweet-spot%`",
        "",
        f"- total backtest rows graded here: `{len(rows)}`",
        "",
    ]

    for market, market_rows in grouped.items():
        if not market_rows:
            continue
        covered = [row for row in market_rows if row.rolling_30_xwoba is not None]
        lines.extend(
            [
                f"## {market}",
                "",
                f"- Base hit rate: `{format_pct(hit_rate(market_rows))}` on `{len(market_rows)}` bets",
                f"- Statcast snapshot coverage: `{format_pct(len(covered) / len(market_rows))}`",
                "",
                "|Feature|Low quartile hit rate|High quartile hit rate|Delta|",
                "|---|---:|---:|---:|",
            ]
        )
        for feature in FEATURES:
            summary = quartile_summary(covered, feature)
            if not summary:
                continue
            lines.append(
                f"|`{feature}`|{format_pct(summary['low_rate'])}|{format_pct(summary['high_rate'])}|{summary['delta'] * 100:+.1f} pts|"
            )
        lines.append("")
        lines.append("Compound buckets:")
        compound_notes = build_compound_notes(covered, market)
        if compound_notes:
            lines.extend([f"- {note}" for note in compound_notes])
        else:
            lines.append("- Not enough covered rows yet for a meaningful compound-bucket read.")
        lines.append("")

        lines.extend(
        [
            "## Early read",
            "",
            "- `singles`: the Statcast layer still is not a clean all-green win. `7d xwOBA` remains noisy-to-negative, but `7d sweet-spot%` and the compound `7d xBA + sweet-spot` bucket are materially better than the base singles hit rate.",
            "- `totalBases`: this is still the clearest Statcast win. `7d xwOBA`, `7d xSLG`, `7d hard-hit%`, `7d barrel%`, and the `7d xSLG + barrel + hard-hit` bucket all improve the hit rate materially.",
            "- `homeRuns`: still too noisy. `xBA` and `hard-hit%` show small lifts, but the HR sample still does not justify turning barrel/sweet-spot/xSLG into a primary trigger by themselves.",
            "",
            "## Next step",
            "",
            "- Keep the Statcast trend layer live for `totalBases`, cautiously let the `xBA + sweet-spot` filter influence `singles`, and keep `homeRuns` in filter-only mode until the sample matures.",
        ]
    )
    return "\n".join(lines) + "\n"


def main() -> None:
    args = parse_args()
    conn = sqlite3.connect(args.db)
    conn.row_factory = sqlite3.Row
    rows = read_rows(conn)
    output = build_markdown(rows)
    out_path = Path(args.out)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(output, encoding="utf-8")
    print(f"Wrote hitter Statcast trend audit to {out_path}")


if __name__ == "__main__":
    main()
