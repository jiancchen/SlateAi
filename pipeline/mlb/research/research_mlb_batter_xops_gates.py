from __future__ import annotations

import sqlite3
from pathlib import Path


ROOT = Path(__file__).resolve().parents[3]
DB_PATH = ROOT / "data-private" / "warehouse" / "sports.db"
REPORT_PATH = ROOT / "development-docs" / "mlb" / "research" / "mlb-batter-xops-gates-053026.md"


def pct(numerator: int, denominator: int) -> float:
    if denominator <= 0:
        return 0.0
    return numerator / denominator * 100.0


def quantile(values: list[float], q: float) -> float:
    if not values:
        return 0.0
    ordered = sorted(values)
    if len(ordered) == 1:
        return ordered[0]
    index = max(0, min(len(ordered) - 1, int(round((len(ordered) - 1) * q))))
    return ordered[index]


def evaluate(rows: list[dict], predicate, target_key: str) -> tuple[int, float]:
    filtered = [row for row in rows if predicate(row)]
    if not filtered:
        return 0, 0.0
    hits = sum(1 for row in filtered if row[target_key])
    return len(filtered), pct(hits, len(filtered))


def markdown_table(headers: list[str], rows: list[list[str]]) -> str:
    header_line = "| " + " | ".join(headers) + " |"
    divider_line = "| " + " | ".join("---" for _ in headers) + " |"
    body = "\n".join("| " + " | ".join(row) + " |" for row in rows)
    return "\n".join([header_line, divider_line, body])


def load_rows(conn: sqlite3.Connection) -> list[dict]:
    conn.row_factory = sqlite3.Row
    query = """
    WITH ordered_logs AS (
      SELECT
        game_date,
        player_id,
        player_name,
        plate_appearances,
        xobp,
        xslg,
        xwoba,
        ROW_NUMBER() OVER (PARTITION BY player_id ORDER BY game_date) AS rn
      FROM mlb_hitter_statcast_game_logs
      WHERE plate_appearances > 0
    ),
    prior_windows AS (
      SELECT
        current.game_date AS as_of_date,
        current.player_id,
        SUM(prior.plate_appearances * prior.xobp) / NULLIF(SUM(prior.plate_appearances), 0) AS rolling_7_xobp,
        SUM(prior.plate_appearances * prior.xslg) / NULLIF(SUM(prior.plate_appearances), 0) AS rolling_7_xslg
      FROM ordered_logs AS current
      JOIN ordered_logs AS prior
        ON prior.player_id = current.player_id
       AND prior.rn < current.rn
       AND prior.rn >= current.rn - 7
      GROUP BY current.game_date, current.player_id
    )
    SELECT
      outcomes.game_date,
      outcomes.player_id,
      outcomes.player_name,
      outcomes.hits,
      outcomes.runs,
      outcomes.rbi,
      outcomes.hit_run_rbi_total,
      trends.rolling_7_xwoba,
      trends.rolling_7_xslg,
      windows.rolling_7_xobp,
      windows.rolling_7_xslg AS rolling_7_xslg_window,
      COALESCE(windows.rolling_7_xobp, 0) * COALESCE(windows.rolling_7_xslg, 0) AS rolling_7_xops
    FROM mlb_batter_game_outcomes AS outcomes
    LEFT JOIN mlb_hitter_statcast_trend_snapshots AS trends
      ON trends.as_of_date = outcomes.game_date
     AND trends.player_id = outcomes.player_id
    LEFT JOIN prior_windows AS windows
      ON windows.as_of_date = outcomes.game_date
     AND windows.player_id = outcomes.player_id
    WHERE outcomes.game_date BETWEEN '2026-03-26' AND '2026-05-28'
    """
    rows = [dict(row) for row in conn.execute(query)]
    return rows


def main() -> None:
    conn = sqlite3.connect(DB_PATH)
    rows = load_rows(conn)
    conn.close()

    xops_values = [float(row["rolling_7_xops"]) for row in rows if row["rolling_7_xops"] is not None]
    xwoba_values = [float(row["rolling_7_xwoba"]) for row in rows if row["rolling_7_xwoba"] is not None]
    xslg_values = [float(row["rolling_7_xslg"]) for row in rows if row["rolling_7_xslg"] is not None]

    xops_q4 = quantile(xops_values, 0.75)
    xwoba_q4 = quantile(xwoba_values, 0.75)
    xslg_q4 = quantile(xslg_values, 0.75)

    run_rows = []
    for label, predicate in [
        ("Baseline runs >= 1", lambda row: True),
        ("rolling 7 XOPS Q4", lambda row: (row["rolling_7_xops"] or 0) >= xops_q4),
        ("rolling 7 XOPS Q4 + xwOBA Q4", lambda row: (row["rolling_7_xops"] or 0) >= xops_q4 and (row["rolling_7_xwoba"] or 0) >= xwoba_q4),
        ("rolling 7 XOPS Q4 + xSLG Q4", lambda row: (row["rolling_7_xops"] or 0) >= xops_q4 and (row["rolling_7_xslg"] or 0) >= xslg_q4),
    ]:
        sample, rate = evaluate(rows, predicate, "runs")
        run_rows.append([label, str(sample), f"{rate:.1f}%"])

    hrr_rows = []
    for label, predicate in [
        ("Baseline H+R+RBI >= 2", lambda row: True),
        ("rolling 7 XOPS Q4", lambda row: (row["rolling_7_xops"] or 0) >= xops_q4),
        ("rolling 7 XOPS Q4 + xwOBA Q4", lambda row: (row["rolling_7_xops"] or 0) >= xops_q4 and (row["rolling_7_xwoba"] or 0) >= xwoba_q4),
        ("rolling 7 XOPS Q4 + xSLG Q4", lambda row: (row["rolling_7_xops"] or 0) >= xops_q4 and (row["rolling_7_xslg"] or 0) >= xslg_q4),
    ]:
        filtered = [row for row in rows if predicate(row)]
        sample = len(filtered)
        rate = pct(sum(1 for row in filtered if (row["hit_run_rbi_total"] or 0) >= 2), sample)
        hrr_rows.append([label, str(sample), f"{rate:.1f}%"])

    report = f"""# MLB Batter XOPS Gate Check — May 30, 2026

Quick research pass to test whether a simple rolling `XOPS = xOBP * xSLG` signal deserves explicit warehousing for `runs` or `H+R+RBI`.

- batter-game sample: `{len(rows)}`
- rolling 7 XOPS Q4 threshold: `{xops_q4:.3f}`
- rolling 7 xwOBA Q4 threshold: `{xwoba_q4:.3f}`
- rolling 7 xSLG Q4 threshold: `{xslg_q4:.3f}`

## Runs

{markdown_table(["Gate", "Sample", "Hit rate"], run_rows)}

## H+R+RBI

{markdown_table(["Gate", "Sample", "Hit rate"], hrr_rows)}

## Read

- This is a quick signal check, not a deployment promotion.
- If `rolling 7 XOPS Q4` cannot beat the existing `slot + xwOBA` style gates, it should stay secondary context instead of becoming a primary feature.
- If it helps only when paired with `xwOBA` or `xSLG`, then the correct use is likely as a confirming layer on the batting-production ladder rather than a standalone lane.
"""
    REPORT_PATH.write_text(report)
    print(f"Wrote {REPORT_PATH}")


if __name__ == "__main__":
    main()
