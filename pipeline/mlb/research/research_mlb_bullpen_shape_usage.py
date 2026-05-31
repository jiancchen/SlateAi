from __future__ import annotations

import sqlite3
from collections import Counter, defaultdict
from pathlib import Path


ROOT = Path(__file__).resolve().parents[3]
DB_PATH = ROOT / "data-private" / "warehouse" / "sports.db"
REPORT_PATH = ROOT / "development-docs" / "mlb-bullpen-shape-usage-053026.md"

START_DATE = "2026-05-09"
END_DATE = "2026-05-28"


def pct(numerator: int, denominator: int) -> float:
    if denominator <= 0:
        return 0.0
    return numerator / denominator * 100.0


def markdown_table(headers: list[str], rows: list[list[str]]) -> str:
    header_line = "| " + " | ".join(headers) + " |"
    divider_line = "| " + " | ".join("---" for _ in headers) + " |"
    body = "\n".join("| " + " | ".join(row) + " |" for row in rows)
    return "\n".join([header_line, divider_line, body])


def main() -> None:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row

    rows = conn.execute(
        """
        SELECT
          game_date,
          game_pk,
          team_role,
          team_name,
          opponent_name,
          pitcher_id,
          pitcher_name,
          entry_order,
          outs_recorded,
          innings_pitched,
          pitches_thrown,
          runs_allowed
        FROM mlb_pitcher_appearances
        WHERE game_date BETWEEN ? AND ?
          AND pitcher_role = 'reliever'
        ORDER BY game_date, game_pk, team_role, entry_order, pitcher_id
        """,
        (START_DATE, END_DATE),
    ).fetchall()
    conn.close()

    by_team_game: dict[tuple[str, int, str], list[sqlite3.Row]] = defaultdict(list)
    for row in rows:
        by_team_game[(row["game_date"], int(row["game_pk"]), row["team_role"])].append(row)

    reliever_count_counter: Counter[str] = Counter()
    first_outs_bucket_counter: Counter[str] = Counter()
    all_team_games = len(by_team_game)
    exact_two_examples: list[str] = []
    six_plus_examples: list[str] = []

    for (game_date, game_pk, team_role), appearances in by_team_game.items():
        relievers_used = len(appearances)
        if relievers_used <= 1:
            reliever_count_counter["1"] += 1
        elif relievers_used == 2:
            reliever_count_counter["2"] += 1
            if len(exact_two_examples) < 5:
                names = ", ".join(row["pitcher_name"] for row in appearances)
                exact_two_examples.append(f"{game_date} {appearances[0]['team_name']} used 2 relievers: {names}")
        elif relievers_used == 3:
            reliever_count_counter["3"] += 1
        elif relievers_used == 4:
            reliever_count_counter["4"] += 1
        elif relievers_used == 5:
            reliever_count_counter["5"] += 1
        else:
            reliever_count_counter["6+"] += 1
            if len(six_plus_examples) < 5:
                names = ", ".join(row["pitcher_name"] for row in appearances[:6])
                six_plus_examples.append(f"{game_date} {appearances[0]['team_name']} used {relievers_used} relievers: {names}")

        first_outs = int(appearances[0]["outs_recorded"] or 0)
        if first_outs <= 3:
            first_outs_bucket_counter["1-3 outs"] += 1
        elif first_outs <= 5:
            first_outs_bucket_counter["4-5 outs"] += 1
        else:
            first_outs_bucket_counter["6+ outs"] += 1

    reliever_rows = [
        [bucket, str(count), f"{pct(count, all_team_games):.1f}%"]
        for bucket, count in [("1", reliever_count_counter["1"]), ("2", reliever_count_counter["2"]), ("3", reliever_count_counter["3"]), ("4", reliever_count_counter["4"]), ("5", reliever_count_counter["5"]), ("6+", reliever_count_counter["6+"])]
    ]
    first_up_rows = [
        [bucket, str(count), f"{pct(count, all_team_games):.1f}%"]
        for bucket, count in [("1-3 outs", first_outs_bucket_counter["1-3 outs"]), ("4-5 outs", first_outs_bucket_counter["4-5 outs"]), ("6+ outs", first_outs_bucket_counter["6+ outs"])]
    ]

    report = f"""# MLB Bullpen Shape Usage — May 30, 2026

Audit window:

- actual team bullpen usage from `2026-05-09` through `2026-05-28`
- source table: `mlb_pitcher_appearances`
- unit of analysis: one team-side game with at least one reliever appearance

## Relievers Used Per Team Game

{markdown_table(["Relievers used", "Team-games", "Share"], reliever_rows)}

## First Reliever Workload

{markdown_table(["First reliever workload", "Team-games", "Share"], first_up_rows)}

## Example 2-Reliever Games

{markdown_table(["Example"], [[line] for line in exact_two_examples])}

## Example 6+ Reliever Games

{markdown_table(["Example"], [[line] for line in six_plus_examples])}

## Read

- The current bridge model mostly tries to answer `who is first up`, but the game-shape question is separate: are we expecting a short bridge, a bulk piggyback, or a full bullpen carousel.
- This report is the evidence for why we need a team-level bullpen shape layer, not just pitcher-level reliever likelihood scores.
- The next warehouse target should explicitly store per-team recent bullpen shape features such as:
  - relievers used per game over last 3/5/10
  - first reliever outs over last 3/5/10
  - bulk-first-up rate (`6+ outs`)
  - two-reliever containment rate
  - six-plus-reliever scramble rate
  - bullpen days / opener-piggyback frequency
"""
    REPORT_PATH.write_text(report)
    print(f"Wrote {REPORT_PATH}")


if __name__ == "__main__":
    main()
