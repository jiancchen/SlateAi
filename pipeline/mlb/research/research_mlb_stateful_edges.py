#!/usr/bin/env python3

from __future__ import annotations

import json
import sqlite3
from dataclasses import dataclass
from pathlib import Path
from typing import Callable
import argparse


ROOT = Path(__file__).resolve().parents[3]
DB_PATH = ROOT / "data-private" / "warehouse" / "sports.db"
HISTORY_DIR = ROOT / "data-private" / "history"
DEFAULT_OUT = ROOT / "development-docs" / "mlb" / "research" / "stateful-edge-research-052326.md"


@dataclass
class UniversalStateRow:
    date: str
    team_name: str
    result: str
    runs_scored: int
    runs_allowed: int
    scheduled_series_game_number: int | None
    division_matchup_flag: int
    previous_result: str | None
    streak_direction: str | None
    streak_length: int
    snapback_pressure_index: float
    heat_regression_index: float
    form_pressure_index: float
    top6_pressure_index: float
    top6_cold_index: float
    top6_heat_index: float

    @property
    def win(self) -> int:
        return 1 if self.result == "win" else 0


@dataclass
class PredictionStateRow:
    split: str
    date: str
    matchup: str
    pick_team: str
    opponent_team: str
    hit: int
    confidence: int
    volatility: int
    point_edge: float
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


def hit_rate(rows: list[UniversalStateRow] | list[PredictionStateRow]) -> float:
    if not rows:
        return 0.0
    return round(sum(getattr(row, "win", getattr(row, "hit", 0)) for row in rows) / len(rows), 3)


def load_hitter_aggregate_lookup(conn: sqlite3.Connection) -> dict[tuple[str, str], dict[str, float]]:
    lookup: dict[tuple[str, str], list[sqlite3.Row]] = {}
    for row in conn.execute(
        """
        SELECT
          as_of_date,
          team_name,
          player_id,
          player_name,
          batting_order_avg_last5,
          pressure_plate_index,
          cold_streak_index,
          heat_regression_index
        FROM mlb_hitter_state_snapshots
        ORDER BY as_of_date, team_name, batting_order_avg_last5 ASC, player_name ASC
        """
    ).fetchall():
        lookup.setdefault((row["as_of_date"], row["team_name"]), []).append(row)

    aggregate_lookup: dict[tuple[str, str], dict[str, float]] = {}
    for key, rows in lookup.items():
        ranked_rows = sorted(
            rows,
            key=lambda row: (
                99 if row["batting_order_avg_last5"] is None else float(row["batting_order_avg_last5"]),
                row["player_name"],
            ),
        )
        top_rows = ranked_rows[:6]
        aggregate_lookup[key] = {
            "top6_pressure_index": safe_avg([float(row["pressure_plate_index"] or 0.0) for row in top_rows]),
            "top6_cold_index": safe_avg([float(row["cold_streak_index"] or 0.0) for row in top_rows]),
            "top6_heat_index": safe_avg([float(row["heat_regression_index"] or 0.0) for row in top_rows]),
        }
    return aggregate_lookup


def load_team_outcome_lookup(conn: sqlite3.Connection) -> dict[tuple[str, str], sqlite3.Row]:
    lookup: dict[tuple[str, str], sqlite3.Row] = {}
    for row in conn.execute(
        """
        SELECT
          game_date,
          team_name,
          full_game_result,
          runs_scored,
          runs_allowed
        FROM mlb_game_team_stats
        """
    ).fetchall():
        lookup[(row["game_date"], row["team_name"])] = row
    return lookup


def load_universal_rows(conn: sqlite3.Connection) -> list[UniversalStateRow]:
    hitter_lookup = load_hitter_aggregate_lookup(conn)
    outcome_lookup = load_team_outcome_lookup(conn)
    rows: list[UniversalStateRow] = []
    for row in conn.execute(
        """
        SELECT
          as_of_date,
          team_name,
          scheduled_series_game_number,
          division_matchup_flag,
          previous_result,
          streak_direction,
          streak_length,
          snapback_pressure_index,
          heat_regression_index,
          form_pressure_index
        FROM mlb_team_state_snapshots
        WHERE as_of_date BETWEEN '2026-05-10' AND '2026-05-22'
        ORDER BY as_of_date, team_name
        """
    ).fetchall():
        outcome = outcome_lookup.get((row["as_of_date"], row["team_name"]))
        if not outcome or not outcome["full_game_result"]:
            continue
        hitter_summary = hitter_lookup.get((row["as_of_date"], row["team_name"]), {})
        rows.append(
            UniversalStateRow(
                date=row["as_of_date"],
                team_name=row["team_name"],
                result=str(outcome["full_game_result"]),
                runs_scored=int(outcome["runs_scored"] or 0),
                runs_allowed=int(outcome["runs_allowed"] or 0),
                scheduled_series_game_number=int(row["scheduled_series_game_number"]) if row["scheduled_series_game_number"] is not None else None,
                division_matchup_flag=int(row["division_matchup_flag"] or 0),
                previous_result=row["previous_result"],
                streak_direction=row["streak_direction"],
                streak_length=int(row["streak_length"] or 0),
                snapback_pressure_index=float(row["snapback_pressure_index"] or 0.0),
                heat_regression_index=float(row["heat_regression_index"] or 0.0),
                form_pressure_index=float(row["form_pressure_index"] or 0.0),
                top6_pressure_index=float(hitter_summary.get("top6_pressure_index", 0.0)),
                top6_cold_index=float(hitter_summary.get("top6_cold_index", 0.0)),
                top6_heat_index=float(hitter_summary.get("top6_heat_index", 0.0)),
            )
        )
    return rows


def load_team_state_lookup(conn: sqlite3.Connection) -> dict[tuple[str, str], sqlite3.Row]:
    lookup: dict[tuple[str, str], sqlite3.Row] = {}
    for row in conn.execute(
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
    ).fetchall():
        lookup[(row["as_of_date"], row["team_name"])] = row
    return lookup


def build_prediction_row(
    *,
    split: str,
    date: str,
    matchup: str,
    pick_team: str,
    opponent_team: str,
    hit: int,
    confidence: int,
    volatility: int,
    point_edge: float,
    team_state_lookup: dict[tuple[str, str], sqlite3.Row],
    hitter_lookup: dict[tuple[str, str], dict[str, float]],
) -> PredictionStateRow | None:
    pick_state = team_state_lookup.get((date, pick_team))
    opp_state = team_state_lookup.get((date, opponent_team))
    if not pick_state or not opp_state:
        return None
    pick_hitter = hitter_lookup.get((date, pick_team), {})
    opp_hitter = hitter_lookup.get((date, opponent_team), {})
    return PredictionStateRow(
        split=split,
        date=date,
        matchup=matchup,
        pick_team=pick_team,
        opponent_team=opponent_team,
        hit=hit,
        confidence=confidence,
        volatility=volatility,
        point_edge=point_edge,
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


def load_prediction_rows(conn: sqlite3.Connection) -> list[PredictionStateRow]:
    team_state_lookup = load_team_state_lookup(conn)
    hitter_lookup = load_hitter_aggregate_lookup(conn)
    rows: list[PredictionStateRow] = []

    for record in conn.execute(
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
          b.hit_full_game
        FROM mlb_side_predictions p
        JOIN mlb_side_backtests b
          USING (prediction_date, model_name, game_id)
        WHERE p.prediction_date BETWEEN '2026-05-10' AND '2026-05-15'
          AND p.model_name = 'board-moneyline-v2'
        ORDER BY p.prediction_date, p.game_title
        """
    ).fetchall():
        predicted_side = record["predicted_side"]
        opponent_team = record["home_team"] if predicted_side == "away" else record["away_team"]
        row = build_prediction_row(
            split="reserve",
            date=record["prediction_date"],
            matchup=record["game_title"],
            pick_team=record["predicted_team"],
            opponent_team=opponent_team,
            hit=int(record["hit_full_game"]),
            confidence=int(record["confidence"] or 0),
            volatility=int(record["volatility"] or 0),
            point_edge=float(record["model_edge"] or 0.0),
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
            predicted_side = record.get("predictedSide") or "away"
            opponent_team = record["homeTeam"] if predicted_side == "away" else record["awayTeam"]
            row = build_prediction_row(
                split="current",
                date=record["date"],
                matchup=record.get("matchup") or "Unknown matchup",
                pick_team=record["predictedPick"],
                opponent_team=opponent_team,
                hit=1 if (record.get("result") or {}).get("fullGameHit") else 0,
                confidence=int(record.get("confidence") or 0),
                volatility=int(record.get("volatility") or 0),
                point_edge=float(record.get("pointEdge") or 0.0),
                team_state_lookup=team_state_lookup,
                hitter_lookup=hitter_lookup,
            )
            if row:
                rows.append(row)
    return rows


def bucket_rate(rows: list[UniversalStateRow] | list[PredictionStateRow], predicate: Callable[[object], bool]) -> tuple[int, float]:
    subset = [row for row in rows if predicate(row)]
    return len(subset), hit_rate(subset)


def format_universal_summary(rows: list[UniversalStateRow]) -> str:
    return markdown_table(
        ["Window", "Team-games", "Win rate", "Avg snapback", "Avg heat regression", "Avg top-6 pressure"],
        [[
            "`2026-05-10` to `2026-05-22`",
            str(len(rows)),
            f"{hit_rate(rows):.3f}",
            f"{safe_avg([row.snapback_pressure_index for row in rows]):.1f}",
            f"{safe_avg([row.heat_regression_index for row in rows]):.1f}",
            f"{safe_avg([row.top6_pressure_index for row in rows]):.1f}",
        ]],
    )


def format_universal_buckets(rows: list[UniversalStateRow]) -> str:
    losing_rows = [row for row in rows if row.streak_direction == "L"]
    winning_rows = [row for row in rows if row.streak_direction == "W"]
    return "\n\n".join([
        "### Losing Streak Snapback\n"
        + markdown_table(
            ["Bucket", "Team-games", "Next-game win rate"],
            [
                ["`loss streak = 1`", *map(str, bucket_rate(losing_rows, lambda row: row.streak_length == 1))],
                ["`loss streak = 2`", *map(str, bucket_rate(losing_rows, lambda row: row.streak_length == 2))],
                ["`loss streak >= 3`", *map(str, bucket_rate(losing_rows, lambda row: row.streak_length >= 3))],
                ["`snapback pressure >= 50`", *map(str, bucket_rate(rows, lambda row: row.snapback_pressure_index >= 50))],
            ],
        ),
        "### Hot-Team Regression\n"
        + markdown_table(
            ["Bucket", "Team-games", "Next-game win rate"],
            [
                ["`win streak = 1`", *map(str, bucket_rate(winning_rows, lambda row: row.streak_length == 1))],
                ["`win streak = 2`", *map(str, bucket_rate(winning_rows, lambda row: row.streak_length == 2))],
                ["`win streak >= 3`", *map(str, bucket_rate(winning_rows, lambda row: row.streak_length >= 3))],
                ["`heat regression >= 45`", *map(str, bucket_rate(rows, lambda row: row.heat_regression_index >= 45))],
            ],
        ),
        "### Batter-State Pressure\n"
        + markdown_table(
            ["Bucket", "Team-games", "Next-game win rate"],
            [
                ["`top-6 pressure >= 40`", *map(str, bucket_rate(rows, lambda row: row.top6_pressure_index >= 40))],
                ["`top-6 cold >= 45`", *map(str, bucket_rate(rows, lambda row: row.top6_cold_index >= 45))],
                ["`top-6 heat >= 40`", *map(str, bucket_rate(rows, lambda row: row.top6_heat_index >= 40))],
                ["`series game 2 && form pressure >= 55`", *map(str, bucket_rate(rows, lambda row: row.scheduled_series_game_number == 2 and row.form_pressure_index >= 55))],
            ],
        ),
    ])


def evaluate_rule(rows: list[PredictionStateRow], predicate: Callable[[PredictionStateRow], bool]) -> dict[str, tuple[int, float, int, float]]:
    result: dict[str, tuple[int, float, int, float]] = {}
    reserve = [row for row in rows if row.split == "reserve"]
    current = [row for row in rows if row.split == "current"]
    for split_key, subset in (("reserve", reserve), ("current", current), ("combined", rows)):
        kept = [row for row in subset if not predicate(row)]
        passed = [row for row in subset if predicate(row)]
        result[split_key] = (len(kept), hit_rate(kept), len(passed), hit_rate(passed))
    return result


def opponent_snapback_trap(row: PredictionStateRow) -> bool:
    return row.point_edge >= 8 and row.opp_snapback_pressure >= 50 and row.opp_streak_direction == "L" and row.opp_streak_length >= 2


def pick_heat_regression_trap(row: PredictionStateRow) -> bool:
    return row.point_edge >= 8 and row.pick_heat_regression >= 45 and row.pick_streak_direction == "W" and row.pick_streak_length >= 2


def pick_batter_pressure_trap(row: PredictionStateRow) -> bool:
    return row.point_edge >= 8 and row.pick_top6_pressure >= 40 and row.pick_top6_cold >= 45


def series_carryover_trap(row: PredictionStateRow) -> bool:
    return row.point_edge >= 10 and row.pick_series_game_number == 2 and row.pick_form_pressure >= 55


def combined_stateful_flag(row: PredictionStateRow) -> bool:
    return (
        (opponent_snapback_trap(row) or pick_heat_regression_trap(row))
        and (pick_batter_pressure_trap(row) or series_carryover_trap(row))
    )


def format_prediction_rules(rows: list[PredictionStateRow]) -> str:
    rules: list[tuple[str, str, Callable[[PredictionStateRow], bool], str]] = [
        (
            "Opponent snapback trap",
            "Pass if `pointEdge >= 8 && opponent snapback >= 50 && opponent loss streak >= 2`",
            opponent_snapback_trap,
            "This tests the exact idea that the market/model may keep fading a team well past the point where bounceback pressure is real.",
        ),
        (
            "Pick heat-regression trap",
            "Pass if `pointEdge >= 8 && pick heat regression >= 45 && pick win streak >= 2`",
            pick_heat_regression_trap,
            "This is the inverse: the model may keep buying a hot team after the carry profile is already starting to wobble.",
        ),
        (
            "Pick batter-pressure trap",
            "Pass if `pointEdge >= 8 && pick top-6 pressure >= 40 && pick top-6 cold >= 45`",
            pick_batter_pressure_trap,
            "This checks whether strong-looking team edges are actually sitting on a stressed top of the order.",
        ),
        (
            "Series game-2 carryover trap",
            "Pass if `pointEdge >= 10 && series game = 2 && pick form pressure >= 55`",
            series_carryover_trap,
            "This is the first direct attempt to catch the \"same series, different state\" problem.",
        ),
        (
            "Combined stateful trap",
            "Pass if snapback/regression pressure and batter/series pressure are both live",
            combined_stateful_flag,
            "This is the multi-state version of the hidden edge idea: the numeric edge looks good, but the game-to-game state is against it.",
        ),
    ]

    sections: list[str] = []
    for name, description, predicate, note in rules:
        evaluated = evaluate_rule(rows, predicate)
        sections.append(
            f"### {name}\n\n"
            f"{description}\n\n"
            + markdown_table(
                ["Window", "Kept", "Kept hit rate", "Passed", "Passed hit rate"],
                [
                    ["Reserve", str(evaluated["reserve"][0]), f"{evaluated['reserve'][1]:.3f}", str(evaluated["reserve"][2]), f"{evaluated['reserve'][3]:.3f}"],
                    ["Current", str(evaluated["current"][0]), f"{evaluated['current'][1]:.3f}", str(evaluated["current"][2]), f"{evaluated['current'][3]:.3f}"],
                    ["Combined", str(evaluated["combined"][0]), f"{evaluated['combined'][1]:.3f}", str(evaluated["combined"][2]), f"{evaluated['combined'][3]:.3f}"],
                ],
            )
            + f"\n\nNote: {note}"
        )
    return "\n\n".join(sections)


def evaluate_haircut_combo(
    rows: list[PredictionStateRow],
    predicate: Callable[[PredictionStateRow], bool],
    edge_cut: float,
    confidence_cut: int,
    edge_threshold: float = 10.0,
    confidence_threshold: int = 60,
) -> dict[str, dict[str, float | int]]:
    result: dict[str, dict[str, float | int]] = {}
    reserve = [row for row in rows if row.split == "reserve"]
    current = [row for row in rows if row.split == "current"]
    for split_key, subset in (("reserve", reserve), ("current", current), ("combined", rows)):
        baseline_edge_rows = [row for row in subset if row.point_edge >= edge_threshold]
        baseline_conf_rows = [row for row in subset if row.confidence >= confidence_threshold]
        kept_edge_rows = [row for row in subset if (row.point_edge - (edge_cut if predicate(row) else 0.0)) >= edge_threshold]
        kept_conf_rows = [row for row in subset if (row.confidence - (confidence_cut if predicate(row) else 0)) >= confidence_threshold]
        removed_edge_rows = [row for row in baseline_edge_rows if (row.point_edge - (edge_cut if predicate(row) else 0.0)) < edge_threshold]
        removed_conf_rows = [row for row in baseline_conf_rows if (row.confidence - (confidence_cut if predicate(row) else 0)) < confidence_threshold]
        result[split_key] = {
            "baseline_edge_rate": hit_rate(baseline_edge_rows),
            "kept_edge_rate": hit_rate(kept_edge_rows),
            "removed_edge_rate": hit_rate(removed_edge_rows),
            "edge_delta": round(hit_rate(kept_edge_rows) - hit_rate(baseline_edge_rows), 3),
            "baseline_conf_rate": hit_rate(baseline_conf_rows),
            "kept_conf_rate": hit_rate(kept_conf_rows),
            "removed_conf_rate": hit_rate(removed_conf_rows),
            "conf_delta": round(hit_rate(kept_conf_rows) - hit_rate(baseline_conf_rows), 3),
            "removed_edge_count": len(removed_edge_rows),
            "removed_conf_count": len(removed_conf_rows),
        }
    return result


def haircut_combo_score(metrics: dict[str, dict[str, float | int]]) -> float:
    reserve = metrics["reserve"]
    current = metrics["current"]
    combined = metrics["combined"]
    score = 0.0
    score += float(current["edge_delta"]) * 2.5
    score += float(current["conf_delta"]) * 2.5
    score += float(combined["edge_delta"]) * 1.5
    score += float(combined["conf_delta"]) * 1.5
    score += float(reserve["edge_delta"]) * 1.25
    score += float(reserve["conf_delta"]) * 1.25
    score += float(current["removed_edge_count"]) * 0.02
    score += float(current["removed_conf_count"]) * 0.02
    if float(reserve["edge_delta"]) < -0.02:
        score -= 0.35
    if float(reserve["conf_delta"]) < -0.02:
        score -= 0.35
    return round(score, 3)


def format_haircut_grid(rows: list[PredictionStateRow]) -> str:
    return format_haircut_grid_for_rule(
        rows,
        combined_stateful_flag,
        title="Soft Haircut Grid For The Combined Stateful Trap",
    )


def format_haircut_grid_for_rule(
    rows: list[PredictionStateRow],
    predicate: Callable[[PredictionStateRow], bool],
    title: str,
) -> str:
    combos: list[tuple[float, int, dict[str, dict[str, float | int]], float]] = []
    for edge_cut in (2.0, 3.0, 4.0, 5.0):
        for confidence_cut in (4, 6, 8, 10):
            metrics = evaluate_haircut_combo(rows, predicate, edge_cut, confidence_cut)
            combos.append((edge_cut, confidence_cut, metrics, haircut_combo_score(metrics)))
    combos.sort(key=lambda combo: combo[3], reverse=True)
    top = combos[:6]
    return "\n".join(
        [
            f"## {title}",
            "",
            markdown_table(
                [
                    "Edge cut",
                    "Confidence cut",
                    "Score",
                    "Reserve `10+` delta",
                    "Reserve `60+` delta",
                    "Current `10+` delta",
                    "Current `60+` delta",
                    "Combined `10+` delta",
                    "Combined `60+` delta",
                ],
                [
                    [
                        f"-{edge_cut:.1f}",
                        f"-{confidence_cut}",
                        f"{score:.3f}",
                        f"{metrics['reserve']['edge_delta']:.3f}",
                        f"{metrics['reserve']['conf_delta']:.3f}",
                        f"{metrics['current']['edge_delta']:.3f}",
                        f"{metrics['current']['conf_delta']:.3f}",
                        f"{metrics['combined']['edge_delta']:.3f}",
                        f"{metrics['combined']['conf_delta']:.3f}",
                    ]
                    for edge_cut, confidence_cut, metrics, score in top
                ],
            ),
        ]
    )


def render_report(universal_rows: list[UniversalStateRow], prediction_rows: list[PredictionStateRow]) -> str:
    return "\n".join([
        "# MLB Stateful Edge Research - 2026-05-23",
        "",
        "This pass tests the exact hidden-edge idea that game-to-game state matters more than one fixed weight recipe. The goal is to measure whether snapback pressure, heat-regression pressure, series carryover, and batter-state pressure actually move results before we let them influence live scoring.",
        "",
        "## Universal Team-State Read",
        "",
        format_universal_summary(universal_rows),
        "",
        format_universal_buckets(universal_rows),
        "",
        "## Prediction Overlay Read",
        "",
        markdown_table(
            ["Window", "Predictions", "Hit rate", "Avg edge", "Avg confidence"],
            [
                [
                    "Reserve (`05-10` to `05-15`)",
                    str(len([row for row in prediction_rows if row.split == "reserve"])),
                    f"{hit_rate([row for row in prediction_rows if row.split == 'reserve']):.3f}",
                    f"{safe_avg([row.point_edge for row in prediction_rows if row.split == 'reserve']):.1f}",
                    f"{safe_avg([row.confidence for row in prediction_rows if row.split == 'reserve']):.1f}",
                ],
                [
                    "Current (`05-16` to `05-22`)",
                    str(len([row for row in prediction_rows if row.split == "current"])),
                    f"{hit_rate([row for row in prediction_rows if row.split == 'current']):.3f}",
                    f"{safe_avg([row.point_edge for row in prediction_rows if row.split == 'current']):.1f}",
                    f"{safe_avg([row.confidence for row in prediction_rows if row.split == 'current']):.1f}",
                ],
                [
                    "Combined",
                    str(len(prediction_rows)),
                    f"{hit_rate(prediction_rows):.3f}",
                    f"{safe_avg([row.point_edge for row in prediction_rows]):.1f}",
                    f"{safe_avg([row.confidence for row in prediction_rows]):.1f}",
                ],
            ],
        ),
        "",
        format_prediction_rules(prediction_rows),
        "",
        format_haircut_grid_for_rule(
            prediction_rows,
            opponent_snapback_trap,
            title="Soft Haircut Grid For The Opponent Snapback Trap",
        ),
        "",
        format_haircut_grid(prediction_rows),
        "",
        "## Takeaways",
        "",
        "- This is the first direct research lane for the idea that the same raw team can mean different things from game to game depending on pressure state.",
        "- The universal tables tell us whether the hidden state is even real independent of our picks.",
        "- The overlay section tells us whether our current model is ignoring those states when it assigns large edges.",
        "- If one of these stateful traps keeps holding across more graded slates, it should become a soft edge/confidence haircut before anything more aggressive.",
    ])


def main() -> None:
    parser = argparse.ArgumentParser(description="Research MLB stateful edges")
    parser.add_argument("--out", type=Path, default=DEFAULT_OUT)
    args = parser.parse_args()
    with get_connection() as conn:
        universal_rows = load_universal_rows(conn)
        prediction_rows = load_prediction_rows(conn)
    report = render_report(universal_rows, prediction_rows)
    args.out.write_text(report + "\n", encoding="utf-8")
    print(f"Wrote stateful edge report to {args.out}")


if __name__ == "__main__":
    main()
