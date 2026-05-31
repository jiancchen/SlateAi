#!/usr/bin/env python3

from __future__ import annotations

import argparse
import json
import sqlite3
from dataclasses import dataclass
from pathlib import Path
from typing import Callable


ROOT = Path(__file__).resolve().parents[3]
DB_PATH = ROOT / "data-private" / "warehouse" / "sports.db"
HISTORY_DIR = ROOT / "data-private" / "history"
DEFAULT_OUT = ROOT / "development-docs" / "mlb" / "research" / "first5-state-model-research-052326.md"


@dataclass
class FirstFiveRow:
    split: str
    date: str
    matchup: str
    pick_team: str
    opponent_team: str
    confidence: int
    volatility: int
    point_edge: float
    starter_leverage_index: float
    late_inning_stability_index: float
    first5_outcome: str
    pick_series_game_number: int | None
    opp_series_game_number: int | None
    pick_streak_direction: str | None
    opp_streak_direction: str | None
    pick_streak_length: int
    opp_streak_length: int
    pick_snapback_pressure: float
    opp_snapback_pressure: float
    pick_heat_regression: float
    opp_heat_regression: float
    pick_form_pressure: float
    opp_form_pressure: float
    pick_top6_pressure: float
    opp_top6_pressure: float
    pick_top6_cold: float
    opp_top6_cold: float
    pick_top6_heat: float
    opp_top6_heat: float

    @property
    def push(self) -> bool:
        return self.first5_outcome == "push"

    @property
    def strict_hit(self) -> int:
        return 1 if self.first5_outcome == "win" else 0

    @property
    def decision_hit(self) -> int | None:
        if self.push:
            return None
        return 1 if self.first5_outcome == "win" else 0


def get_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def markdown_table(headers: list[str], rows: list[list[str]]) -> str:
    header_line = "| " + " | ".join(headers) + " |"
    divider_line = "| " + " | ".join(["---"] * len(headers)) + " |"
    row_lines = ["| " + " | ".join(str(cell) for cell in row) + " |" for row in rows]
    return "\n".join([header_line, divider_line, *row_lines])


def safe_avg(values: list[float]) -> float:
    return round(sum(values) / len(values), 3) if values else 0.0


def strict_hit_rate(rows: list[FirstFiveRow]) -> float:
    return round(sum(row.strict_hit for row in rows) / len(rows), 3) if rows else 0.0


def decision_hit_rate(rows: list[FirstFiveRow]) -> float:
    decided = [row for row in rows if not row.push]
    return round(sum(row.strict_hit for row in decided) / len(decided), 3) if decided else 0.0


def push_rate(rows: list[FirstFiveRow]) -> float:
    return round(sum(1 for row in rows if row.push) / len(rows), 3) if rows else 0.0


def load_hitter_aggregate_lookup(conn: sqlite3.Connection) -> dict[tuple[str, str], dict[str, float]]:
    grouped: dict[tuple[str, str], list[sqlite3.Row]] = {}
    rows = conn.execute(
        """
        SELECT
          as_of_date,
          team_name,
          player_name,
          batting_order_avg_last5,
          pressure_plate_index,
          cold_streak_index,
          heat_regression_index
        FROM mlb_hitter_state_snapshots
        ORDER BY as_of_date, team_name, batting_order_avg_last5 ASC, player_name ASC
        """
    ).fetchall()
    for row in rows:
        grouped.setdefault((row["as_of_date"], row["team_name"]), []).append(row)

    lookup: dict[tuple[str, str], dict[str, float]] = {}
    for key, player_rows in grouped.items():
        ranked_rows = sorted(
            player_rows,
            key=lambda row: (
                99 if row["batting_order_avg_last5"] is None else float(row["batting_order_avg_last5"]),
                row["player_name"],
            ),
        )
        top_rows = ranked_rows[:6]
        lookup[key] = {
            "top6_pressure_index": safe_avg([float(row["pressure_plate_index"] or 0.0) for row in top_rows]),
            "top6_cold_index": safe_avg([float(row["cold_streak_index"] or 0.0) for row in top_rows]),
            "top6_heat_index": safe_avg([float(row["heat_regression_index"] or 0.0) for row in top_rows]),
        }
    return lookup


def load_team_state_lookup(conn: sqlite3.Connection) -> dict[tuple[str, str], sqlite3.Row]:
    lookup: dict[tuple[str, str], sqlite3.Row] = {}
    rows = conn.execute(
        """
        SELECT
          as_of_date,
          team_name,
          scheduled_series_game_number,
          streak_direction,
          streak_length,
          snapback_pressure_index,
          heat_regression_index,
          form_pressure_index
        FROM mlb_team_state_snapshots
        """
    ).fetchall()
    for row in rows:
        lookup[(row["as_of_date"], row["team_name"])] = row
    return lookup


def build_first5_row(
    *,
    split: str,
    date: str,
    matchup: str,
    pick_team: str,
    opponent_team: str,
    confidence: int,
    volatility: int,
    point_edge: float,
    starter_leverage_index: float,
    late_inning_stability_index: float,
    first5_outcome: str,
    team_state_lookup: dict[tuple[str, str], sqlite3.Row],
    hitter_lookup: dict[tuple[str, str], dict[str, float]],
) -> FirstFiveRow | None:
    pick_state = team_state_lookup.get((date, pick_team))
    opp_state = team_state_lookup.get((date, opponent_team))
    if not pick_state or not opp_state:
        return None
    pick_hitter = hitter_lookup.get((date, pick_team), {})
    opp_hitter = hitter_lookup.get((date, opponent_team), {})
    return FirstFiveRow(
        split=split,
        date=date,
        matchup=matchup,
        pick_team=pick_team,
        opponent_team=opponent_team,
        confidence=confidence,
        volatility=volatility,
        point_edge=point_edge,
        starter_leverage_index=starter_leverage_index,
        late_inning_stability_index=late_inning_stability_index,
        first5_outcome=first5_outcome,
        pick_series_game_number=int(pick_state["scheduled_series_game_number"]) if pick_state["scheduled_series_game_number"] is not None else None,
        opp_series_game_number=int(opp_state["scheduled_series_game_number"]) if opp_state["scheduled_series_game_number"] is not None else None,
        pick_streak_direction=pick_state["streak_direction"],
        opp_streak_direction=opp_state["streak_direction"],
        pick_streak_length=int(pick_state["streak_length"] or 0),
        opp_streak_length=int(opp_state["streak_length"] or 0),
        pick_snapback_pressure=float(pick_state["snapback_pressure_index"] or 0.0),
        opp_snapback_pressure=float(opp_state["snapback_pressure_index"] or 0.0),
        pick_heat_regression=float(pick_state["heat_regression_index"] or 0.0),
        opp_heat_regression=float(opp_state["heat_regression_index"] or 0.0),
        pick_form_pressure=float(pick_state["form_pressure_index"] or 0.0),
        opp_form_pressure=float(opp_state["form_pressure_index"] or 0.0),
        pick_top6_pressure=float(pick_hitter.get("top6_pressure_index", 0.0)),
        opp_top6_pressure=float(opp_hitter.get("top6_pressure_index", 0.0)),
        pick_top6_cold=float(pick_hitter.get("top6_cold_index", 0.0)),
        opp_top6_cold=float(opp_hitter.get("top6_cold_index", 0.0)),
        pick_top6_heat=float(pick_hitter.get("top6_heat_index", 0.0)),
        opp_top6_heat=float(opp_hitter.get("top6_heat_index", 0.0)),
    )


def load_prediction_rows(conn: sqlite3.Connection) -> list[FirstFiveRow]:
    team_state_lookup = load_team_state_lookup(conn)
    hitter_lookup = load_hitter_aggregate_lookup(conn)
    rows: list[FirstFiveRow] = []

    reserve_records = conn.execute(
        """
        SELECT
          p.prediction_date,
          p.game_title,
          p.away_team,
          p.home_team,
          p.predicted_team,
          p.predicted_side,
          p.confidence,
          p.volatility,
          p.model_edge,
          p.starter_leverage_index,
          p.late_inning_stability_index,
          b.actual_first5_winner,
          b.hit_first5
        FROM mlb_side_predictions p
        JOIN mlb_side_backtests b
          USING (prediction_date, model_name, game_id)
        WHERE p.prediction_date BETWEEN '2026-05-10' AND '2026-05-15'
          AND p.model_name = 'board-moneyline-v2'
        ORDER BY p.prediction_date, p.game_title
        """
    ).fetchall()
    for record in reserve_records:
        predicted_side = record["predicted_side"]
        opponent_team = record["home_team"] if predicted_side == "away" else record["away_team"]
        first5_outcome = "push" if record["actual_first5_winner"] == "tie" else ("win" if int(record["hit_first5"] or 0) else "loss")
        row = build_first5_row(
            split="reserve",
            date=record["prediction_date"],
            matchup=record["game_title"],
            pick_team=record["predicted_team"],
            opponent_team=opponent_team,
            confidence=int(record["confidence"] or 0),
            volatility=int(record["volatility"] or 0),
            point_edge=float(record["model_edge"] or 0.0),
            starter_leverage_index=float(record["starter_leverage_index"] or 0.0),
            late_inning_stability_index=float(record["late_inning_stability_index"] or 0.0),
            first5_outcome=first5_outcome,
            team_state_lookup=team_state_lookup,
            hitter_lookup=hitter_lookup,
        )
        if row:
            rows.append(row)

    for date in (
        "2026-05-16",
        "2026-05-17",
        "2026-05-18",
        "2026-05-19",
        "2026-05-20",
        "2026-05-21",
        "2026-05-22",
    ):
        path = HISTORY_DIR / f"mlb-results-{date}.jsonl"
        if not path.exists():
            continue
        for line in path.read_text(encoding="utf-8").splitlines():
            if not line.strip():
                continue
            record = json.loads(line)
            if record.get("sport") != "MLB" or record.get("marketType") != "moneyline":
                continue
            indicators = record.get("indicators") or {}
            result = record.get("result") or {}
            first5_outcome = "push" if result.get("actualFirst5Winner") == "tie" else ("win" if result.get("first5Hit") else "loss")
            predicted_side = record.get("predictedSide") or "away"
            opponent_team = record["homeTeam"] if predicted_side == "away" else record["awayTeam"]
            row = build_first5_row(
                split="current",
                date=record["date"],
                matchup=record.get("matchup") or "Unknown matchup",
                pick_team=record["predictedPick"],
                opponent_team=opponent_team,
                confidence=int(record.get("confidence") or 0),
                volatility=int(record.get("volatility") or 0),
                point_edge=float(record.get("pointEdge") or 0.0),
                starter_leverage_index=float(indicators.get("starterLeverageIndex") or 0.0),
                late_inning_stability_index=float(indicators.get("lateInningStabilityIndex") or 0.0),
                first5_outcome=first5_outcome,
                team_state_lookup=team_state_lookup,
                hitter_lookup=hitter_lookup,
            )
            if row:
                rows.append(row)
    return rows


def rows_for_split(rows: list[FirstFiveRow], split: str) -> list[FirstFiveRow]:
    return rows if split == "combined" else [row for row in rows if row.split == split]


def evaluate_lane(rows: list[FirstFiveRow], predicate: Callable[[FirstFiveRow], bool]) -> dict[str, tuple[int, float, float, float, int]]:
    result: dict[str, tuple[int, float, float, float, int]] = {}
    for split in ("reserve", "current", "combined"):
        subset = [row for row in rows_for_split(rows, split) if predicate(row)]
        result[split] = (
            len(subset),
            strict_hit_rate(subset),
            decision_hit_rate(subset),
            push_rate(subset),
            sum(1 for row in subset if row.push),
        )
    return result


def format_summary(rows: list[FirstFiveRow]) -> str:
    table_rows = []
    for split, label in (
        ("reserve", "Reserve (`05-10` to `05-15`)"),
        ("current", "Current (`05-16` to `05-22`)"),
        ("combined", "Combined"),
    ):
        subset = rows_for_split(rows, split)
        table_rows.append(
            [
                label,
                str(len(subset)),
                f"{strict_hit_rate(subset):.3f}",
                f"{decision_hit_rate(subset):.3f}",
                f"{push_rate(subset):.3f}",
                f"{safe_avg([row.point_edge for row in subset]):.1f}",
                f"{safe_avg([row.starter_leverage_index for row in subset]):.1f}",
            ]
        )
    return markdown_table(
        ["Window", "Picks", "Strict hit rate", "Decision-only hit rate", "Push rate", "Avg edge", "Avg starter leverage"],
        table_rows,
    )


def format_buckets(rows: list[FirstFiveRow]) -> str:
    def bucket_rows(predicate: Callable[[FirstFiveRow], bool]) -> list[str]:
        subset = [row for row in rows if predicate(row)]
        return [
            str(len(subset)),
            f"{strict_hit_rate(subset):.3f}",
            f"{decision_hit_rate(subset):.3f}",
            f"{push_rate(subset):.3f}",
        ]

    return "\n\n".join(
        [
            "### Starter Leverage Buckets\n"
            + markdown_table(
                ["Bucket", "Picks", "Strict", "Decision-only", "Push rate"],
                [
                    ["`<65`", *bucket_rows(lambda row: row.starter_leverage_index < 65)],
                    ["`65-74`", *bucket_rows(lambda row: 65 <= row.starter_leverage_index < 75)],
                    ["`75+`", *bucket_rows(lambda row: row.starter_leverage_index >= 75)],
                ],
            ),
            "### Point Edge Buckets\n"
            + markdown_table(
                ["Bucket", "Picks", "Strict", "Decision-only", "Push rate"],
                [
                    ["`<8`", *bucket_rows(lambda row: row.point_edge < 8)],
                    ["`8-11.9`", *bucket_rows(lambda row: 8 <= row.point_edge < 12)],
                    ["`12+`", *bucket_rows(lambda row: row.point_edge >= 12)],
                ],
            ),
            "### Opponent Snapback Buckets\n"
            + markdown_table(
                ["Bucket", "Picks", "Strict", "Decision-only", "Push rate"],
                [
                    ["`<40`", *bucket_rows(lambda row: row.opp_snapback_pressure < 40)],
                    ["`40-49.9`", *bucket_rows(lambda row: 40 <= row.opp_snapback_pressure < 50)],
                    ["`50+`", *bucket_rows(lambda row: row.opp_snapback_pressure >= 50)],
                ],
            ),
        ]
    )


def starter_clean_lane(row: FirstFiveRow) -> bool:
    return (
        row.point_edge >= 8
        and row.starter_leverage_index >= 72
        and row.opp_snapback_pressure < 50
        and row.pick_top6_pressure < 40
    )


def first5_tie_trap(row: FirstFiveRow) -> bool:
    return row.point_edge < 8 and row.starter_leverage_index < 72


def first5_opponent_snapback_trap(row: FirstFiveRow) -> bool:
    return row.point_edge >= 8 and row.opp_snapback_pressure >= 50 and row.opp_streak_direction == "L" and row.opp_streak_length >= 2


def first5_top_order_pressure_trap(row: FirstFiveRow) -> bool:
    return row.point_edge >= 8 and row.pick_top6_pressure >= 40 and row.pick_top6_cold >= 45


def first5_series_carryover_trap(row: FirstFiveRow) -> bool:
    return row.point_edge >= 8 and row.pick_series_game_number == 2 and row.pick_form_pressure >= 55


def first5_provisional_lean_lane(row: FirstFiveRow) -> bool:
    return (
        row.point_edge >= 8
        and row.opp_snapback_pressure < 50
        and row.pick_top6_pressure < 40
        and not first5_series_carryover_trap(row)
    )


def first5_watch_lane(row: FirstFiveRow) -> bool:
    return row.point_edge < 8 and row.starter_leverage_index < 72


def first5_pass_lane(row: FirstFiveRow) -> bool:
    return (
        first5_opponent_snapback_trap(row)
        or first5_top_order_pressure_trap(row)
        or first5_series_carryover_trap(row)
    )


def format_lane_rows(evaluated: dict[str, tuple[int, float, float, float, int]]) -> list[list[str]]:
    return [
        [
            "Reserve",
            str(evaluated["reserve"][0]),
            f"{evaluated['reserve'][1]:.3f}",
            f"{evaluated['reserve'][2]:.3f}",
            f"{evaluated['reserve'][3]:.3f}",
            str(evaluated["reserve"][4]),
        ],
        [
            "Current",
            str(evaluated["current"][0]),
            f"{evaluated['current'][1]:.3f}",
            f"{evaluated['current'][2]:.3f}",
            f"{evaluated['current'][3]:.3f}",
            str(evaluated["current"][4]),
        ],
        [
            "Combined",
            str(evaluated["combined"][0]),
            f"{evaluated['combined'][1]:.3f}",
            f"{evaluated['combined'][2]:.3f}",
            f"{evaluated['combined'][3]:.3f}",
            str(evaluated["combined"][4]),
        ],
    ]


def format_lane_research(rows: list[FirstFiveRow]) -> str:
    lanes: list[tuple[str, str, Callable[[FirstFiveRow], bool], str]] = [
        (
            "Starter-led clean lane",
            "Eligible if `pointEdge >= 8 && starter leverage >= 72 && opponent snapback < 50 && pick top-6 pressure < 40`",
            starter_clean_lane,
            "This is the first attempt at a true first-five play lane: strong starter window, no obvious bounceback trap, and lower top-order stress.",
        ),
        (
            "Tie / push trap",
            "Flag if `pointEdge < 8 && starter leverage < 72`",
            first5_tie_trap,
            "This is the simplest tie-prone lane: not enough early edge and not enough starter separation.",
        ),
        (
            "Opponent snapback trap",
            "Flag if `pointEdge >= 8 && opponent snapback >= 50 && opponent loss streak >= 2`",
            first5_opponent_snapback_trap,
            "This tests whether first five is overfading bounceback teams in the early innings too.",
        ),
        (
            "Top-order pressure trap",
            "Flag if `pointEdge >= 8 && pick top-6 pressure >= 40 && pick top-6 cold >= 45`",
            first5_top_order_pressure_trap,
            "This checks whether our first-five pick is leaning on a stressed top of the order that may stay dead early.",
        ),
        (
            "Series carryover trap",
            "Flag if `pointEdge >= 8 && series game = 2 && pick form pressure >= 55`",
            first5_series_carryover_trap,
            "This is the same-series, different-state problem specifically for the starter window.",
        ),
    ]
    sections: list[str] = []
    for title, description, predicate, note in lanes:
        evaluated = evaluate_lane(rows, predicate)
        sections.append(
            "\n".join(
                [
                    f"### {title}",
                    "",
                    description,
                    "",
                    markdown_table(
                        ["Window", "Picks", "Strict hit rate", "Decision-only hit rate", "Push rate", "Pushes"],
                        format_lane_rows(evaluated),
                    ),
                    "",
                    f"Note: {note}",
                ]
            )
        )
    return "\n\n".join(sections)


def classify_first5_lane(row: FirstFiveRow) -> str:
    if first5_pass_lane(row):
        return "pass"
    if first5_watch_lane(row):
        return "watch"
    if first5_provisional_lean_lane(row):
        return "lean"
    return "watch"


def format_classifier_summary(rows: list[FirstFiveRow]) -> str:
    sections: list[str] = []
    for split, label in (
        ("reserve", "Reserve (`05-10` to `05-15`)"),
        ("current", "Current (`05-16` to `05-22`)"),
        ("combined", "Combined"),
    ):
        subset = rows_for_split(rows, split)
        bucket_rows = []
        for bucket in ("lean", "watch", "pass"):
            bucket_subset = [row for row in subset if classify_first5_lane(row) == bucket]
            bucket_rows.append(
                [
                    bucket.title(),
                    str(len(bucket_subset)),
                    f"{strict_hit_rate(bucket_subset):.3f}",
                    f"{decision_hit_rate(bucket_subset):.3f}",
                    f"{push_rate(bucket_subset):.3f}",
                ]
            )
        sections.append(
            "\n".join(
                [
                    f"### {label}",
                    "",
                    markdown_table(
                        ["Lane", "Picks", "Strict hit rate", "Decision-only hit rate", "Push rate"],
                        bucket_rows,
                    ),
                ]
            )
        )
    sections.append(
        "\n".join(
            [
                "### Current classifier read",
                "",
                "- `Lean` is only provisional. It is cleaner than the raw board in structure, but it is not strong enough yet to promote into live scoring.",
                "- `Watch` is mostly the tie/push lane: not necessarily terrible at decision-only hit rate, but too capital-inefficient to treat as a real edge.",
                "- `Pass` is the real value today. The state layer is better at telling us what early scripts are fragile than at handing us a trustworthy all-green first-five play bucket.",
            ]
        )
    )
    return "\n\n".join(sections)


def render_report(rows: list[FirstFiveRow]) -> str:
    return "\n".join(
        [
            "# MLB First-Five State Model Research - 2026-05-23",
            "",
            "This is a separate first-five research lane built on the new state snapshots, not the old one-size-fits-all full-game composite. Ties are treated as pushes in the decision-only read, which is the right way to judge first-five behavior.",
            "",
            "## Baseline First-Five Read",
            "",
            format_summary(rows),
            "",
            "## First-Five Buckets",
            "",
            format_buckets(rows),
            "",
            "## Candidate First-Five Lanes",
            "",
            format_lane_research(rows),
            "",
            "## Offline First-Five Classifier Sketch",
            "",
            format_classifier_summary(rows),
            "",
            "## Takeaways",
            "",
            "- First five needs its own environment test: early starter edge, not late bullpen shape.",
            "- Push rate matters. A lane with a decent strict hit rate but too many pushes can still be a bad use of capital if we overbet it.",
            "- The state layer gives us better reasons to pass: bounceback pressure, top-order stress, and same-series carryover can all fight a paper starter edge.",
            "- The goal from here is not more first-five volume. It is a smaller set of cleaner first-five lanes.",
        ]
    )


def main() -> None:
    parser = argparse.ArgumentParser(description="Research MLB first-five state model")
    parser.add_argument("--out", type=Path, default=DEFAULT_OUT)
    args = parser.parse_args()

    with get_connection() as conn:
        rows = load_prediction_rows(conn)
    report = render_report(rows)
    args.out.write_text(report + "\n", encoding="utf-8")
    print(f"Wrote MLB first-five state model report to {args.out}")


if __name__ == "__main__":
    main()
