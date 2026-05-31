#!/usr/bin/env python3

from __future__ import annotations

import json
import sqlite3
from collections import Counter
from pathlib import Path
from statistics import quantiles


ROOT = Path(__file__).resolve().parents[3]
DB_PATH = ROOT / "data-private" / "warehouse" / "sports.db"
OUT_PATH = ROOT / "development-docs" / "mlb" / "research" / "mlb-live-gate-candidates-052926.md"
HISTORY_GLOB_ROOT = ROOT / "data-private" / "history"
HR_PREDICTIONS_ROOT = ROOT / "data-private" / "predictions" / "mlb-home-runs"


def pct(hits: int, total: int) -> str:
    if total == 0:
        return "0.0%"
    return f"{(hits / total) * 100:.1f}%"


def markdown_table(headers: list[str], rows: list[list[str]]) -> str:
    header = "| " + " | ".join(headers) + " |"
    divider = "| " + " | ".join(["---"] * len(headers)) + " |"
    body = ["| " + " | ".join(row) + " |" for row in rows]
    return "\n".join([header, divider, *body])


def quartile(values: list[float], which: int) -> float:
    return quantiles(values, n=4, method="inclusive")[which]


def load_prop_rows(conn: sqlite3.Connection) -> list[sqlite3.Row]:
    conn.row_factory = sqlite3.Row
    return conn.execute(
        """
        SELECT
          pb.prediction_date,
          pb.player_id,
          pb.player_name,
          pb.prop_type,
          pb.hit_flag,
          st.rolling_7_xwoba,
          st.rolling_7_xba,
          st.rolling_7_xslg,
          st.rolling_7_barrel_pct,
          st.rolling_7_hard_hit_pct,
          st.rolling_7_sweet_spot_pct,
          hs.cold_streak_index,
          hs.whiff_rate_last5
        FROM mlb_prop_backtests pb
        JOIN mlb_hitter_statcast_trend_snapshots st
          ON st.as_of_date = pb.prediction_date
         AND st.player_id = pb.player_id
        LEFT JOIN mlb_hitter_state_snapshots hs
          ON hs.as_of_date = pb.prediction_date
         AND hs.player_id = pb.player_id
        WHERE pb.prediction_date >= '2026-05-16'
        """
    ).fetchall()


def evaluate_gate(rows: list[sqlite3.Row], label: str) -> list[str]:
    hits = sum(int(row["hit_flag"]) for row in rows)
    total = len(rows)
    return [label, str(hits), str(total), pct(hits, total)]


def analyze_props(conn: sqlite3.Connection) -> tuple[str, str]:
    rows = load_prop_rows(conn)
    tb_rows = [row for row in rows if row["prop_type"] == "totalBases"]
    singles_rows = [row for row in rows if row["prop_type"] == "singles"]

    tb_xslg_q3 = quartile([row["rolling_7_xslg"] for row in tb_rows if row["rolling_7_xslg"] is not None], 2)
    tb_hh_q3 = quartile([row["rolling_7_hard_hit_pct"] for row in tb_rows if row["rolling_7_hard_hit_pct"] is not None], 2)
    tb_barrel_q3 = quartile([row["rolling_7_barrel_pct"] for row in tb_rows if row["rolling_7_barrel_pct"] is not None], 2)
    tb_cold_q3 = quartile([row["cold_streak_index"] for row in tb_rows if row["cold_streak_index"] is not None], 2)

    singles_xba_q3 = quartile([row["rolling_7_xba"] for row in singles_rows if row["rolling_7_xba"] is not None], 2)
    singles_sweet_q3 = quartile([row["rolling_7_sweet_spot_pct"] for row in singles_rows if row["rolling_7_sweet_spot_pct"] is not None], 2)
    singles_xba_q1 = quartile([row["rolling_7_xba"] for row in singles_rows if row["rolling_7_xba"] is not None], 0)
    singles_whiff_q3 = quartile([row["whiff_rate_last5"] for row in singles_rows if row["whiff_rate_last5"] is not None], 2)

    tb_table = markdown_table(
        ["Gate", "Hits", "Bets", "Hit rate"],
        [
            evaluate_gate(tb_rows, "Baseline TB overs"),
            evaluate_gate(
                [
                    row
                    for row in tb_rows
                    if (row["rolling_7_xslg"] or -1) >= tb_xslg_q3
                    and (row["rolling_7_hard_hit_pct"] or -1) >= tb_hh_q3
                ],
                "High 7d xSLG + high 7d hard-hit",
            ),
            evaluate_gate(
                [
                    row
                    for row in tb_rows
                    if (row["rolling_7_xslg"] or -1) >= tb_xslg_q3
                    and (row["rolling_7_hard_hit_pct"] or -1) >= tb_hh_q3
                    and (row["rolling_7_barrel_pct"] or -1) >= tb_barrel_q3
                ],
                "High 7d xSLG + hard-hit + barrel",
            ),
            evaluate_gate(
                [
                    row
                    for row in tb_rows
                    if (row["rolling_7_xslg"] or 999) < tb_xslg_q3
                    and (row["cold_streak_index"] or -1) >= tb_cold_q3
                ],
                "Low 7d xSLG + high cold-streak index",
            ),
        ],
    )

    singles_table = markdown_table(
        ["Gate", "Hits", "Bets", "Hit rate"],
        [
            evaluate_gate(singles_rows, "Baseline singles overs"),
            evaluate_gate(
                [
                    row
                    for row in singles_rows
                    if (row["rolling_7_xba"] or -1) >= singles_xba_q3
                    and (row["rolling_7_sweet_spot_pct"] or -1) >= singles_sweet_q3
                ],
                "High 7d xBA + high 7d sweet-spot",
            ),
            evaluate_gate(
                [
                    row
                    for row in singles_rows
                    if (row["rolling_7_xba"] or 999) <= singles_xba_q1
                    and (row["whiff_rate_last5"] or -1) >= singles_whiff_q3
                ],
                "Low 7d xBA + high whiff",
            ),
        ],
    )

    return tb_table, singles_table


def analyze_hr(conn: sqlite3.Connection) -> str:
    conn.row_factory = sqlite3.Row
    backtests = {
        (row["prediction_date"], int(row["player_id"])): int(row["hit_flag"])
        for row in conn.execute(
            """
            SELECT prediction_date, player_id, hit_flag
            FROM mlb_home_run_backtests
            WHERE prediction_date >= '2026-05-16'
            """
        ).fetchall()
    }

    rows: list[dict[str, float | int | str]] = []
    for prediction_file in sorted(HR_PREDICTIONS_ROOT.glob("*-statcast-prototype.json")):
        prediction_date = prediction_file.name.split("-statcast-prototype.json")[0]
        if prediction_date < "2026-05-16":
            continue
        payload = json.loads(prediction_file.read_text())
        for pick in payload.get("picks", []):
            key = (prediction_date, int(pick["playerId"]))
            if key not in backtests:
                continue
            rows.append(
                {
                    "hit": backtests[key],
                    "pitcher_hr9": pick.get("opposingPitcherHr9"),
                    "park_hr_index": pick.get("parkHrIndex"),
                    "has_statcast_trend": bool(((pick.get("lineupContext") or {}).get("statcastTrend") or {}).get("rolling7HardHitPct") is not None),
                }
            )

    pitcher_hr9_values = [float(row["pitcher_hr9"]) for row in rows if row["pitcher_hr9"] is not None]
    hr9_q3 = quartile(pitcher_hr9_values, 2) if len(pitcher_hr9_values) >= 2 else 0

    def hr_gate(name: str, subset: list[dict[str, float | int | str]]) -> list[str]:
        hits = sum(int(row["hit"]) for row in subset)
        return [name, str(hits), str(len(subset)), pct(hits, len(subset))]

    hr_table = markdown_table(
        ["Gate", "Hits", "Bets", "Hit rate"],
        [
            hr_gate("Baseline HR board", rows),
            hr_gate(
                "High opposing pitcher HR/9",
                [row for row in rows if (row["pitcher_hr9"] or -1) >= hr9_q3],
            ),
            hr_gate(
                "Rows with archived Statcast trend block",
                [row for row in rows if bool(row["has_statcast_trend"])],
            ),
        ],
    )
    return hr_table


def analyze_side_dead_bat() -> str:
    side_rows: list[dict] = []
    for history_file in sorted(HISTORY_GLOB_ROOT.glob("mlb-results-2026-05-*.jsonl")):
        for line in history_file.read_text().splitlines():
            if not line.strip():
                continue
            row = json.loads(line)
            if row.get("marketType") != "moneyline":
                continue
            result = row.get("result") or {}
            if result.get("fullGameHit") not in (True, False):
                continue
            side_rows.append(row)

    def gate(name: str, rows: list[dict], key: str = "fullGameHit") -> list[str]:
        hits = sum(1 for row in rows if (row.get("result") or {}).get(key) is True)
        return [name, str(hits), str(len(rows)), pct(hits, len(rows))]

    table = markdown_table(
        ["Gate", "Hits", "Bets", "Hit rate"],
        [
            gate("Baseline side picks", side_rows),
            gate(
                "Dead-early-risk sides",
                [row for row in side_rows if ((row.get("indicators") or {}).get("deadEarlyRiskFlag") is True)],
            ),
            gate(
                "No dead-early-risk sides",
                [row for row in side_rows if ((row.get("indicators") or {}).get("deadEarlyRiskFlag") is False)],
            ),
            gate(
                "Dead-early-risk sides (F5)",
                [row for row in side_rows if ((row.get("indicators") or {}).get("deadEarlyRiskFlag") is True)],
                key="first5Hit",
            ),
            gate(
                "Quiet pick first-5 shape (pickQuietFirst5 >= 0.5)",
                [row for row in side_rows if (((row.get("indicators") or {}).get("pickQuietFirst5Rate") or 0) >= 0.5)],
            ),
            gate(
                "Low-conversion + dead-early-risk (F5)",
                [
                    row
                    for row in side_rows
                    if (((row.get("indicators") or {}).get("pickLineupConversionIndex") or 999) < 35)
                    and ((row.get("indicators") or {}).get("deadEarlyRiskFlag") is True)
                ],
                key="first5Hit",
            ),
        ],
    )
    return table


def main() -> None:
    conn = sqlite3.connect(DB_PATH)
    tb_table, singles_table = analyze_props(conn)
    hr_table = analyze_hr(conn)
    side_table = analyze_side_dead_bat()

    report = f"""# MLB Live Gate Candidates — May 29, 2026

This is a focused overnight audit of **keeper/fade gates** rather than another broad signal recap. The goal is to turn the recent warehouse work into a few live rules that can actually tighten the board.

Sample windows used here:
- prop backtests with Statcast joins: `2026-05-16` through `2026-05-28`
- side picks from settled daily journals: `2026-05-10` through `2026-05-28`
- HR board rows from saved prototype files: `2026-05-16` through `2026-05-28`

## Total Bases candidate gates

{tb_table}

Takeaways:
- `TB` is still the cleanest place to use the rolling Statcast layer live.
- The best current gate is still the simple contact-damage stack:
  - **high 7d xSLG**
  - **high 7d hard-hit%**
  - with an optional barrel confirmation
- The cleanest fade is:
  - **low 7d xSLG**
  - plus a **high cold-streak index**

Practical use:
- keep `TB` overs on the live board only when the hitter clears the xSLG + hard-hit gate
- auto-demote `TB` overs when the hitter is both cold and low-xSLG

## Singles candidate gates

{singles_table}

Takeaways:
- `Singles` is still weaker than `TB`, but there is one usable positive lane:
  - **high 7d xBA**
  - **high 7d sweet-spot%**
- The cleanest fade is the opposite shape:
  - **low 7d xBA**
  - **high recent whiff**

Practical use:
- use singles only when the hitter looks like a real ball-in-play quality lane
- avoid singles overs when the profile is weak xBA plus swing-and-miss

## Home run candidate gates

{hr_table}

Takeaways:
- We can still backtest the broad HR board, but the archived prototype files do **not** yet preserve a full rolling Statcast trend block for enough older days.
- That means the currently testable HR gates are still mostly:
  - opposing pitcher `HR/9`
  - park context
- `Pitcher HR/9` remains a modest positive filter.
- Park-only hype is still not enough to trust by itself.

Practical use:
- keep HR in **filter mode**, not green-light mode
- only promote a bomb lane when a live file has the newer Statcast context present **and** the pitcher damage context agrees

## Side dead-bat / dead-early candidate gates

{side_table}

Takeaways:
- `DeadEarlyRisk` is more useful as an `F5 caution` flag than as a full-game auto-veto.
- The ugliest side bucket is still the one that combines:
  - weak lineup conversion
  - dead-early risk
- Quiet first-five shapes also underperform baseline.

Practical use:
- haircut `F5` confidence first when dead-early risk is present
- be especially skeptical when dead-early risk shows up with low lineup conversion
- do not rely on side strength alone in quiet-first-five shapes

## Bottom line

If the board has to tighten right now, the best live rules are:

1. `TB`: keep only hitters with **high 7d xSLG + high 7d hard-hit%**
2. `TB`: fade hitters with **low 7d xSLG + high cold-streak**
3. `Singles`: keep only hitters with **high 7d xBA + high sweet-spot%**
4. `Singles`: fade **low xBA + high whiff**
5. `HR`: keep in filter mode until the archived Statcast trend block is deeper
6. `F5`: haircut or pass **dead-early-risk + low-conversion** side picks
"""

    OUT_PATH.write_text(report)
    print(f"Wrote {OUT_PATH}")


if __name__ == "__main__":
    main()
