#!/usr/bin/env python3

from __future__ import annotations

import sqlite3
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DB_PATH = ROOT / "data-private" / "warehouse" / "sports.db"
DOC_PATH = ROOT / "development-docs" / "mlb-phase1-context-research-052926.md"


def safe_rate(values: list[int]) -> float | None:
    if not values:
        return None
    return sum(values) / len(values)


def safe_mean(values: list[float]) -> float | None:
    if not values:
        return None
    return sum(values) / len(values)


def pct(value: float | None) -> str:
    if value is None:
        return "N/A"
    return f"{value * 100:.1f}%"


def num(value: float | None, digits: int = 2) -> str:
    if value is None:
        return "N/A"
    return f"{value:.{digits}f}"


def quartiles(values: list[float]) -> tuple[float, float] | tuple[None, None]:
    if len(values) < 4:
        return None, None
    ordered = sorted(values)
    q1 = ordered[len(ordered) // 4]
    q3 = ordered[(len(ordered) * 3) // 4]
    return q1, q3


def main() -> None:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row

    market_coverage = conn.execute(
        """
        SELECT
          COUNT(*) AS market_rows,
          COUNT(CASE WHEN moneyline_games_with_odds_last10 > 0 THEN 1 END) AS moneyline_rows,
          COUNT(CASE WHEN totals_games_with_lines_last10 > 0 THEN 1 END) AS totals_rows
        FROM mlb_team_market_context_daily
        """
    ).fetchone()
    opponent_coverage = conn.execute(
        """
        SELECT
          COUNT(*) AS opponent_rows,
          COUNT(CASE WHEN games_sample_last10 > 0 THEN 1 END) AS opponent_last10_rows
        FROM mlb_team_opponent_quality_daily
        """
    ).fetchone()

    matchup_rows = conn.execute(
        """
        SELECT
          oq.as_of_date,
          oq.team_name,
          oq.schedule_toughness_index_last10,
          oq.schedule_toughness_index_last5,
          oq.games_vs_550_last10,
          oq.close_losses_vs_winning_record_last10,
          CASE
            WHEN g.away_team = oq.team_name THEN CASE WHEN COALESCE(o.away_runs_final, 0) > COALESCE(o.home_runs_final, 0) THEN 1 ELSE 0 END
            ELSE CASE WHEN COALESCE(o.home_runs_final, 0) > COALESCE(o.away_runs_final, 0) THEN 1 ELSE 0 END
          END AS won_today,
          CASE
            WHEN g.away_team = oq.team_name THEN COALESCE(o.away_runs_final, 0) - COALESCE(o.home_runs_final, 0)
            ELSE COALESCE(o.home_runs_final, 0) - COALESCE(o.away_runs_final, 0)
          END AS run_diff_today
        FROM mlb_team_opponent_quality_daily oq
        JOIN mlb_games g
          ON g.game_date = oq.as_of_date
         AND (g.away_team = oq.team_name OR g.home_team = oq.team_name)
        JOIN mlb_game_outcomes o
          USING (game_pk)
        WHERE oq.games_sample_last10 > 0
        ORDER BY oq.as_of_date, oq.team_name
        """
    ).fetchall()

    toughness_values = [
        float(row["schedule_toughness_index_last10"])
        for row in matchup_rows
        if row["schedule_toughness_index_last10"] is not None
    ]
    q1, q3 = quartiles(toughness_values)
    hard_rows = [
        row for row in matchup_rows
        if q3 is not None and row["schedule_toughness_index_last10"] is not None and float(row["schedule_toughness_index_last10"]) >= q3
    ]
    soft_rows = [
        row for row in matchup_rows
        if q1 is not None and row["schedule_toughness_index_last10"] is not None and float(row["schedule_toughness_index_last10"]) <= q1
    ]
    close_loss_rows = [row for row in matchup_rows if int(row["close_losses_vs_winning_record_last10"] or 0) >= 2]

    totals_rows = conn.execute(
        """
        SELECT
          as_of_date,
          team_name,
          totals_games_with_lines_last10,
          over_rate_last10,
          under_rate_last10,
          avg_total_runs_minus_line_last10
        FROM mlb_team_market_context_daily
        WHERE totals_games_with_lines_last10 > 0
        ORDER BY as_of_date, team_name
        """
    ).fetchall()

    moneyline_rows = conn.execute(
        """
        SELECT
          COUNT(*) AS rows_with_moneyline,
          AVG(favorite_hold_rate_last10) AS avg_favorite_hold_rate_last10,
          AVG(underdog_upset_rate_last10) AS avg_underdog_upset_rate_last10
        FROM mlb_team_market_context_daily
        WHERE moneyline_games_with_odds_last10 > 0
        """
    ).fetchone()

    lines: list[str] = []
    lines.append("# MLB Phase 1 Context Research — May 29, 2026")
    lines.append("")
    lines.append("This pass only audits the new warehouse layers. It does **not** change live MLB picks yet.")
    lines.append("")
    lines.append("## Coverage")
    lines.append("")
    lines.append(f"- Opponent-quality rows: `{opponent_coverage['opponent_rows']}`")
    lines.append(f"- Opponent-quality rows with a last-10 sample: `{opponent_coverage['opponent_last10_rows']}`")
    lines.append(f"- Market-context rows: `{market_coverage['market_rows']}`")
    lines.append(f"- Market-context rows with moneyline odds history: `{market_coverage['moneyline_rows']}`")
    lines.append(f"- Market-context rows with totals-line history: `{market_coverage['totals_rows']}`")
    lines.append("")
    lines.append("### Immediate read")
    lines.append("")
    lines.append("- Moneyline memory is usable now because the FanDuel Research archive already backfilled `h2h`.")
    lines.append("- True team `over/under vs Vegas line` history is still coverage-limited because historical totals lines are not backfilled yet.")
    lines.append("- The totals columns are still worth warehousing now so they start filling automatically as soon as that source is added.")
    lines.append("")
    lines.append("## Opponent-Strength Signal")
    lines.append("")
    lines.append(f"- Rows with next-game outcomes available: `{len(matchup_rows)}`")
    if q1 is not None and q3 is not None:
        lines.append(f"- Schedule-toughness quartiles: `Q1 {q1:.1f}` / `Q3 {q3:.1f}`")
    else:
        lines.append("- Schedule-toughness quartiles: not enough rows yet")
    lines.append("")
    lines.append("|Bucket|Rows|Win rate|Avg run diff|")
    lines.append("|---|---:|---:|---:|")
    lines.append(
        f"|Hard recent schedule (top quartile)|{len(hard_rows)}|{pct(safe_rate([int(row['won_today']) for row in hard_rows]))}|{num(safe_mean([float(row['run_diff_today']) for row in hard_rows]))}|"
    )
    lines.append(
        f"|Soft recent schedule (bottom quartile)|{len(soft_rows)}|{pct(safe_rate([int(row['won_today']) for row in soft_rows]))}|{num(safe_mean([float(row['run_diff_today']) for row in soft_rows]))}|"
    )
    lines.append(
        f"|2+ close losses vs winning opponents in last 10|{len(close_loss_rows)}|{pct(safe_rate([int(row['won_today']) for row in close_loss_rows]))}|{num(safe_mean([float(row['run_diff_today']) for row in close_loss_rows]))}|"
    )
    lines.append("")
    lines.append("### Opponent-strength takeaway")
    lines.append("")
    if hard_rows and soft_rows:
        lines.append(
            "- The new table is already rich enough to test whether a team is coming off a genuinely hard stretch versus simply playing bad baseball."
        )
    else:
        lines.append("- The table is populated correctly, but we still need more settled rows before the hard-vs-soft schedule split becomes trustworthy.")
    lines.append("- `close_losses_vs_winning_record_last10` is the first bounceback-style flag worth keeping an eye on, because it isolates competitive losses against real opponents instead of flattening every loss into the same bucket.")
    lines.append("")
    lines.append("## Market-Context Signal")
    lines.append("")
    lines.append(f"- Rows with moneyline history: `{moneyline_rows['rows_with_moneyline']}`")
    lines.append(f"- Average favorite hold rate in last-10 market memory: `{pct(moneyline_rows['avg_favorite_hold_rate_last10'])}`")
    lines.append(f"- Average underdog upset rate in last-10 market memory: `{pct(moneyline_rows['avg_underdog_upset_rate_last10'])}`")
    lines.append("")
    if totals_rows:
        lines.append("|Metric|Value|")
        lines.append("|---|---:|")
        lines.append(f"|Rows with totals-line history|{len(totals_rows)}|")
        lines.append(
            f"|Average last-10 over rate|{pct(safe_mean([float(row['over_rate_last10']) for row in totals_rows if row['over_rate_last10'] is not None]))}|"
        )
        lines.append(
            f"|Average last-10 run delta vs line|{num(safe_mean([float(row['avg_total_runs_minus_line_last10']) for row in totals_rows if row['avg_total_runs_minus_line_last10'] is not None]))}|"
        )
    else:
        lines.append("- Totals-line history: `0` historical rows right now. This is a source/coverage blocker, not a warehouse bug.")
    lines.append("")
    lines.append("## Next Experiments")
    lines.append("")
    lines.append("1. Use `schedule_toughness_index_last10` and `close_losses_vs_winning_record_last10` as isolated filters in side/F5 research, not the live model yet.")
    lines.append("2. Keep filling `mlb_team_market_context_daily` automatically while we search for a reliable historical totals-line archive.")
    lines.append("3. Once totals coverage exists, test whether team over/under memory improves totals and run-production props.")
    lines.append("")

    DOC_PATH.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"Wrote {DOC_PATH}")


if __name__ == "__main__":
    main()
