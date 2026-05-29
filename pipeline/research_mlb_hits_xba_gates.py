#!/usr/bin/env python3

from __future__ import annotations

import argparse
import json
import re
import sqlite3
from dataclasses import dataclass
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DB_PATH = ROOT / "data-private" / "warehouse" / "sports.db"
DEFAULT_OUT = ROOT / "development-docs" / "mlb-hits-xba-gates-052926.md"
FIT_RE = re.compile(r"fit ([+-]?\d+(?:\.\d+)?)")
MATCHUP_RE = re.compile(r"([+-]?\d+(?:\.\d+)?) matchup grade")


@dataclass
class Row:
    hit_flag: int
    lineup_status: str | None
    rolling_7_xba: float | None
    rolling_14_xba: float | None
    rolling_30_xba: float | None
    rolling_7_sweet_spot_pct: float | None
    rolling_14_sweet_spot_pct: float | None
    fit_score: float | None
    matchup_grade: float | None


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Audit xBA + pitch-fit gates for MLB hits props.")
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


def extract_scores(raw_json: str | None) -> tuple[str | None, float | None, float | None]:
    if not raw_json:
        return None, None, None
    try:
        data = json.loads(raw_json)
    except json.JSONDecodeError:
        return None, None, None
    summary = data.get("playerSummary") or ""
    lineup_status = data.get("lineupStatus")
    fit_match = FIT_RE.search(summary)
    matchup_match = MATCHUP_RE.search(summary)
    fit_score = float(fit_match.group(1)) if fit_match else None
    matchup_grade = float(matchup_match.group(1)) if matchup_match else None
    return lineup_status, fit_score, matchup_grade


def read_rows(conn: sqlite3.Connection) -> list[Row]:
    rows: list[Row] = []
    query = """
    select
      b.hit_flag,
      p.raw_json,
      s.rolling_7_xba,
      s.rolling_14_xba,
      s.rolling_30_xba,
      s.rolling_7_sweet_spot_pct,
      s.rolling_14_sweet_spot_pct
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
    where b.prop_type = 'hits'
    order by b.prediction_date, b.player_name
    """
    for result in conn.execute(query):
        lineup_status, fit_score, matchup_grade = extract_scores(result[1])
        rows.append(
            Row(
                hit_flag=int(result[0]),
                lineup_status=lineup_status,
                rolling_7_xba=_to_float(result[2]),
                rolling_14_xba=_to_float(result[3]),
                rolling_30_xba=_to_float(result[4]),
                rolling_7_sweet_spot_pct=_to_float(result[5]),
                rolling_14_sweet_spot_pct=_to_float(result[6]),
                fit_score=fit_score,
                matchup_grade=matchup_grade,
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


def markdown_table(headers: list[str], rows: list[list[str]]) -> str:
    header_line = "| " + " | ".join(headers) + " |"
    divider_line = "| " + " | ".join(["---"] * len(headers)) + " |"
    row_lines = ["| " + " | ".join(str(cell) for cell in row) + " |" for row in rows]
    return "\n".join([header_line, divider_line, *row_lines])


def summarize_gate(label: str, rows: list[Row]) -> list[str]:
    return [label, str(len(rows)), pct(hit_rate(rows))]


def main() -> None:
    args = parse_args()
    conn = sqlite3.connect(args.db)
    rows = read_rows(conn)

    usable_xba7 = [row.rolling_7_xba for row in rows if row.rolling_7_xba is not None]
    usable_xba14 = [row.rolling_14_xba for row in rows if row.rolling_14_xba is not None]
    usable_sweet7 = [row.rolling_7_sweet_spot_pct for row in rows if row.rolling_7_sweet_spot_pct is not None]
    xba7_q3 = quantile(usable_xba7, 0.75)
    xba14_q3 = quantile(usable_xba14, 0.75)
    sweet7_q3 = quantile(usable_sweet7, 0.75)

    posted_rows = [row for row in rows if row.lineup_status == "posted"]
    high_xba7 = [row for row in rows if row.rolling_7_xba is not None and row.rolling_7_xba >= xba7_q3]
    high_xba14 = [row for row in rows if row.rolling_14_xba is not None and row.rolling_14_xba >= xba14_q3]
    high_xba7_sweet = [
        row
        for row in rows
        if row.rolling_7_xba is not None
        and row.rolling_7_xba >= xba7_q3
        and row.rolling_7_sweet_spot_pct is not None
        and row.rolling_7_sweet_spot_pct >= sweet7_q3
    ]
    high_xba7_fit = [
        row
        for row in rows
        if row.rolling_7_xba is not None
        and row.rolling_7_xba >= xba7_q3
        and row.fit_score is not None
        and row.fit_score >= 4.0
    ]
    high_xba7_matchup = [
        row
        for row in rows
        if row.rolling_7_xba is not None
        and row.rolling_7_xba >= xba7_q3
        and row.matchup_grade is not None
        and row.matchup_grade >= 8.0
    ]
    high_xba7_sweet_fit = [
        row
        for row in rows
        if row.rolling_7_xba is not None
        and row.rolling_7_xba >= xba7_q3
        and row.rolling_7_sweet_spot_pct is not None
        and row.rolling_7_sweet_spot_pct >= sweet7_q3
        and row.fit_score is not None
        and row.fit_score >= 4.0
    ]

    gate_rows = [
        summarize_gate("Baseline hits overs", rows),
        summarize_gate("Posted lineup only", posted_rows),
        summarize_gate(f"7d xBA Q4 (>= {xba7_q3:.3f})", high_xba7),
        summarize_gate(f"14d xBA Q4 (>= {xba14_q3:.3f})", high_xba14),
        summarize_gate(f"7d xBA Q4 + sweet-spot Q4 (>= {sweet7_q3:.1f}%)", high_xba7_sweet),
        summarize_gate("7d xBA Q4 + fit >= +4.0", high_xba7_fit),
        summarize_gate("7d xBA Q4 + matchup grade >= +8.0", high_xba7_matchup),
        summarize_gate("7d xBA Q4 + sweet-spot Q4 + fit >= +4.0", high_xba7_sweet_fit),
    ]

    lines = [
        "# MLB Hits xBA Gates — May 29, 2026",
        "",
        "This is the second isolated phase-2 test. The question is simple: if we take the existing `hits` backtests and add only `xBA`, sweet-spot contact shape, and the saved pitch-fit / matchup-grade context, do we get a cleaner gate before we touch any live scorer logic?",
        "",
        f"- sample: `{len(rows)}` historical hits bets",
        f"- base hit rate: `{pct(hit_rate(rows))}`",
        "",
        "## Gate Results",
        "",
        markdown_table(["Gate", "Sample", "Hit rate"], gate_rows),
        "",
        "## Read",
        "",
    ]

    best_gate = max(gate_rows[2:], key=lambda row: float(row[2].strip('%')) if row[1] != "0" else -1.0)
    lines.append(f"- Best isolated gate in this pass: `{best_gate[0]}` at `{best_gate[2]}` on `{best_gate[1]}` bets.")
    lines.append(f"- `7d xBA` threshold in this sample: `{xba7_q3:.3f}`. `14d xBA` threshold: `{xba14_q3:.3f}`.")
    lines.append(f"- `7d sweet-spot` threshold in this sample: `{sweet7_q3:.1f}%`.")
    lines.append("- This is still intentionally narrow: `xBA`, contact-shape, and saved pitch-fit context only. No opponent-strength or classic last-10 bundling yet.")
    lines.append("- If the xBA + fit gate wins cleanly here, it becomes a shadow-mode candidate before any live deployment.")
    lines.append("")

    Path(args.out).write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"Wrote report to {args.out}")


if __name__ == "__main__":
    main()
