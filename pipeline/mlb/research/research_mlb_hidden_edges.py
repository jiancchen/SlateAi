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
DEFAULT_OUT = ROOT / "development-docs" / "mlb" / "research" / "hidden-edge-research-052326.md"
WINDOW_GAMES = 10


@dataclass
class HiddenEdgeRow:
    split: str
    date: str
    matchup: str
    game_pk: int | None
    pick_team: str
    opponent_team: str
    hit: int
    confidence: int
    volatility: int
    point_edge: float
    starter_leverage_index: float
    late_inning_stability_index: float
    pick_whiff_persistence: float | None
    opp_whiff_persistence: float | None
    pick_whiff_rebound: float | None
    opp_whiff_rebound: float | None
    pick_lead_surrender: float | None
    opp_lead_surrender: float | None
    pick_comeback_resilience: float | None
    opp_comeback_resilience: float | None
    pick_carryover_instability: float | None
    opp_carryover_instability: float | None
    pick_bounceback: float | None
    opp_bounceback: float | None

    @property
    def whiff_gap(self) -> float | None:
        if self.pick_whiff_persistence is None or self.opp_whiff_persistence is None:
            return None
        return self.pick_whiff_persistence - self.opp_whiff_persistence

    @property
    def lead_surrender_gap(self) -> float | None:
        if self.pick_lead_surrender is None or self.opp_lead_surrender is None:
            return None
        return self.pick_lead_surrender - self.opp_lead_surrender

    @property
    def carryover_gap(self) -> float | None:
        if self.pick_carryover_instability is None or self.opp_carryover_instability is None:
            return None
        return self.pick_carryover_instability - self.opp_carryover_instability


def get_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def hit_rate(rows: list[HiddenEdgeRow]) -> float:
    return round(sum(row.hit for row in rows) / len(rows), 3) if rows else 0.0


def safe_avg(values: list[float]) -> float:
    return round(sum(values) / len(values), 2) if values else 0.0


def markdown_table(headers: list[str], rows: list[list[str]]) -> str:
    header_line = "| " + " | ".join(headers) + " |"
    divider_line = "| " + " | ".join(["---"] * len(headers)) + " |"
    row_lines = ["| " + " | ".join(str(cell) for cell in row) + " |" for row in rows]
    return "\n".join([header_line, divider_line, *row_lines])


def _read_float(payload: dict[str, object] | None, key: str) -> float | None:
    if not payload:
        return None
    value = payload.get(key)
    return float(value) if value is not None else None


def load_game_lookup(conn: sqlite3.Connection) -> dict[tuple[str, str, str], int]:
    lookup: dict[tuple[str, str, str], int] = {}
    rows = conn.execute(
        """
        SELECT game_date, away_team, home_team, game_pk
        FROM mlb_games
        """
    ).fetchall()
    for row in rows:
        lookup[(row["game_date"], row["away_team"], row["home_team"])] = row["game_pk"]
    return lookup


def load_table_lookup(
    conn: sqlite3.Connection,
    table_name: str,
    key_columns: list[str],
    value_columns: list[str],
    where_clause: str = "",
    params: tuple[object, ...] = (),
) -> dict[tuple[object, ...], dict[str, object]]:
    where_sql = f"WHERE {where_clause}" if where_clause else ""
    sql = f"SELECT {', '.join(key_columns + value_columns)} FROM {table_name} {where_sql}"
    lookup: dict[tuple[object, ...], dict[str, object]] = {}
    for row in conn.execute(sql, params).fetchall():
        key = tuple(row[column] for column in key_columns)
        lookup[key] = {column: row[column] for column in value_columns}
    return lookup


def load_hidden_lookups(conn: sqlite3.Connection) -> tuple[dict, dict, dict]:
    whiff_lookup = load_table_lookup(
        conn,
        "mlb_team_whiff_persistence_profiles",
        ["as_of_date", "team_name"],
        ["whiff_persistence_index", "whiff_rebound_index"],
        "window_games = ?",
        (WINDOW_GAMES,),
    )
    lead_lookup = load_table_lookup(
        conn,
        "mlb_team_lead_surrender_profiles",
        ["as_of_date", "team_name"],
        ["lead_surrender_index", "comeback_resilience_index"],
        "window_games = ?",
        (WINDOW_GAMES,),
    )
    carryover_lookup = load_table_lookup(
        conn,
        "mlb_team_form_carryover_profiles",
        ["as_of_date", "team_name"],
        ["carryover_instability_index", "bounceback_index"],
        "window_games = ?",
        (WINDOW_GAMES,),
    )
    return whiff_lookup, lead_lookup, carryover_lookup


def build_row(
    *,
    split: str,
    date: str,
    matchup: str,
    game_pk: int | None,
    pick_team: str,
    opponent_team: str,
    hit: int,
    confidence: int,
    volatility: int,
    point_edge: float,
    starter_leverage_index: float,
    late_inning_stability_index: float,
    whiff_lookup: dict,
    lead_lookup: dict,
    carryover_lookup: dict,
) -> HiddenEdgeRow:
    return HiddenEdgeRow(
        split=split,
        date=date,
        matchup=matchup,
        game_pk=game_pk,
        pick_team=pick_team,
        opponent_team=opponent_team,
        hit=hit,
        confidence=confidence,
        volatility=volatility,
        point_edge=point_edge,
        starter_leverage_index=starter_leverage_index,
        late_inning_stability_index=late_inning_stability_index,
        pick_whiff_persistence=_read_float(whiff_lookup.get((date, pick_team)), "whiff_persistence_index"),
        opp_whiff_persistence=_read_float(whiff_lookup.get((date, opponent_team)), "whiff_persistence_index"),
        pick_whiff_rebound=_read_float(whiff_lookup.get((date, pick_team)), "whiff_rebound_index"),
        opp_whiff_rebound=_read_float(whiff_lookup.get((date, opponent_team)), "whiff_rebound_index"),
        pick_lead_surrender=_read_float(lead_lookup.get((date, pick_team)), "lead_surrender_index"),
        opp_lead_surrender=_read_float(lead_lookup.get((date, opponent_team)), "lead_surrender_index"),
        pick_comeback_resilience=_read_float(lead_lookup.get((date, pick_team)), "comeback_resilience_index"),
        opp_comeback_resilience=_read_float(lead_lookup.get((date, opponent_team)), "comeback_resilience_index"),
        pick_carryover_instability=_read_float(carryover_lookup.get((date, pick_team)), "carryover_instability_index"),
        opp_carryover_instability=_read_float(carryover_lookup.get((date, opponent_team)), "carryover_instability_index"),
        pick_bounceback=_read_float(carryover_lookup.get((date, pick_team)), "bounceback_index"),
        opp_bounceback=_read_float(carryover_lookup.get((date, opponent_team)), "bounceback_index"),
    )


def load_reserve_rows(conn: sqlite3.Connection, game_lookup: dict[tuple[str, str, str], int]) -> list[HiddenEdgeRow]:
    whiff_lookup, lead_lookup, carryover_lookup = load_hidden_lookups(conn)
    rows: list[HiddenEdgeRow] = []
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
          p.starter_leverage_index,
          p.late_inning_stability_index,
          b.hit_full_game
        FROM mlb_side_predictions p
        JOIN mlb_side_backtests b
          USING (prediction_date, model_name, game_id)
        WHERE p.prediction_date BETWEEN '2026-05-10' AND '2026-05-15'
          AND p.model_name = 'board-moneyline-v2'
        ORDER BY p.prediction_date, p.game_title
        """
    ):
        predicted_side = record["predicted_side"]
        opponent_team = record["home_team"] if predicted_side == "away" else record["away_team"]
        rows.append(
            build_row(
                split="reserve",
                date=record["prediction_date"],
                matchup=record["game_title"],
                game_pk=game_lookup.get((record["prediction_date"], record["away_team"], record["home_team"])),
                pick_team=record["predicted_team"],
                opponent_team=opponent_team,
                hit=int(record["hit_full_game"]),
                confidence=int(record["confidence"] or 0),
                volatility=int(record["volatility"] or 0),
                point_edge=float(record["model_edge"] or 0.0),
                starter_leverage_index=float(record["starter_leverage_index"] or 0.0),
                late_inning_stability_index=float(record["late_inning_stability_index"] or 0.0),
                whiff_lookup=whiff_lookup,
                lead_lookup=lead_lookup,
                carryover_lookup=carryover_lookup,
            )
        )
    return rows


def load_current_rows(game_lookup: dict[tuple[str, str, str], int], conn: sqlite3.Connection) -> list[HiddenEdgeRow]:
    whiff_lookup, lead_lookup, carryover_lookup = load_hidden_lookups(conn)
    rows: list[HiddenEdgeRow] = []
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
            predicted_side = record.get("predictedSide") or "away"
            opponent_team = record["homeTeam"] if predicted_side == "away" else record["awayTeam"]
            rows.append(
                build_row(
                    split="current",
                    date=record["date"],
                    matchup=record.get("matchup") or "Unknown matchup",
                    game_pk=game_lookup.get((record["date"], record["awayTeam"], record["homeTeam"])),
                    pick_team=record["predictedPick"],
                    opponent_team=opponent_team,
                    hit=1 if result.get("fullGameHit") else 0,
                    confidence=int(record.get("confidence") or 0),
                    volatility=int(record.get("volatility") or 0),
                    point_edge=float(record.get("pointEdge") or 0.0),
                    starter_leverage_index=float(indicators.get("starterLeverageIndex") or 0.0),
                    late_inning_stability_index=float(indicators.get("lateInningStabilityIndex") or 0.0),
                    whiff_lookup=whiff_lookup,
                    lead_lookup=lead_lookup,
                    carryover_lookup=carryover_lookup,
                )
            )
    return rows


def format_dataset_summary(rows: list[HiddenEdgeRow]) -> str:
    reserve = [row for row in rows if row.split == "reserve"]
    current = [row for row in rows if row.split == "current"]
    return markdown_table(
        ["Window", "Games", "Hit rate", "Avg edge", "Avg volatility"],
        [
            ["Reserve (`05-10` to `05-15`)", str(len(reserve)), f"{hit_rate(reserve):.3f}", f"{safe_avg([row.point_edge for row in reserve]):.1f}", f"{safe_avg([row.volatility for row in reserve]):.1f}"],
            ["Current (`05-16` to `05-22`)", str(len(current)), f"{hit_rate(current):.3f}", f"{safe_avg([row.point_edge for row in current]):.1f}", f"{safe_avg([row.volatility for row in current]):.1f}"],
            ["Combined", str(len(rows)), f"{hit_rate(rows):.3f}", f"{safe_avg([row.point_edge for row in rows]):.1f}", f"{safe_avg([row.volatility for row in rows]):.1f}"],
        ],
    )


def bucket_rate(rows: list[HiddenEdgeRow], predicate: Callable[[HiddenEdgeRow], bool]) -> tuple[int, float]:
    subset = [row for row in rows if predicate(row)]
    return len(subset), hit_rate(subset)


def format_buckets(rows: list[HiddenEdgeRow]) -> str:
    whiff_rows = [row for row in rows if row.pick_whiff_persistence is not None]
    lead_rows = [row for row in rows if row.pick_lead_surrender is not None]
    carry_rows = [row for row in rows if row.pick_carryover_instability is not None]
    return "\n\n".join(
        [
            "### Pick Whiff Persistence Index\n"
            + markdown_table(
                ["Bucket", "Games", "Hit rate"],
                [
                    ["`<30`", *map(str, bucket_rate(whiff_rows, lambda row: (row.pick_whiff_persistence or 0.0) < 30))],
                    ["`30-44`", *map(str, bucket_rate(whiff_rows, lambda row: 30 <= (row.pick_whiff_persistence or 0.0) < 45))],
                    ["`45-59`", *map(str, bucket_rate(whiff_rows, lambda row: 45 <= (row.pick_whiff_persistence or 0.0) < 60))],
                    ["`60+`", *map(str, bucket_rate(whiff_rows, lambda row: (row.pick_whiff_persistence or 0.0) >= 60))],
                ],
            ),
            "### Pick Lead Surrender Index\n"
            + markdown_table(
                ["Bucket", "Games", "Hit rate"],
                [
                    ["`<30`", *map(str, bucket_rate(lead_rows, lambda row: (row.pick_lead_surrender or 0.0) < 30))],
                    ["`30-44`", *map(str, bucket_rate(lead_rows, lambda row: 30 <= (row.pick_lead_surrender or 0.0) < 45))],
                    ["`45-59`", *map(str, bucket_rate(lead_rows, lambda row: 45 <= (row.pick_lead_surrender or 0.0) < 60))],
                    ["`60+`", *map(str, bucket_rate(lead_rows, lambda row: (row.pick_lead_surrender or 0.0) >= 60))],
                ],
            ),
            "### Pick Carryover Instability Index\n"
            + markdown_table(
                ["Bucket", "Games", "Hit rate"],
                [
                    ["`<40`", *map(str, bucket_rate(carry_rows, lambda row: (row.pick_carryover_instability or 0.0) < 40))],
                    ["`40-54`", *map(str, bucket_rate(carry_rows, lambda row: 40 <= (row.pick_carryover_instability or 0.0) < 55))],
                    ["`55-69`", *map(str, bucket_rate(carry_rows, lambda row: 55 <= (row.pick_carryover_instability or 0.0) < 70))],
                    ["`70+`", *map(str, bucket_rate(carry_rows, lambda row: (row.pick_carryover_instability or 0.0) >= 70))],
                ],
            ),
            "### Hidden Edge Gaps\n"
            + markdown_table(
                ["Gap bucket", "Games", "Hit rate"],
                [
                    ["`lead surrender gap >= 8`", *map(str, bucket_rate(rows, lambda row: (row.lead_surrender_gap or -999) >= 8))],
                    ["`carryover gap >= 10`", *map(str, bucket_rate(rows, lambda row: (row.carryover_gap or -999) >= 10))],
                    ["`opponent comeback resilience >= 55`", *map(str, bucket_rate(rows, lambda row: (row.opp_comeback_resilience or 0.0) >= 55))],
                ],
            ),
        ]
    )


def evaluate_rule(rows: list[HiddenEdgeRow], predicate: Callable[[HiddenEdgeRow], bool]) -> dict[str, tuple[int, float, int, float]]:
    result: dict[str, tuple[int, float, int, float]] = {}
    reserve = [row for row in rows if row.split == "reserve"]
    current = [row for row in rows if row.split == "current"]
    for split_key, subset in (("reserve", reserve), ("current", current), ("combined", rows)):
        kept = [row for row in subset if not predicate(row)]
        passed = [row for row in subset if predicate(row)]
        result[split_key] = (len(kept), hit_rate(kept), len(passed), hit_rate(passed))
    return result


def format_candidate_rules(rows: list[HiddenEdgeRow]) -> str:
    rules: list[tuple[str, str, Callable[[HiddenEdgeRow], bool], str]] = [
        (
            "Lead surrender late fragility",
            "Pass if `pointEdge >= 10 && pick lead surrender >= 45 && late stability <= 55`",
            lambda row: (row.pick_lead_surrender or -1) >= 45 and row.point_edge >= 10 and row.late_inning_stability_index <= 55,
            "This is the direct \"good starter, bad hold\" hidden-edge fade.",
        ),
        (
            "Whiff persistence plus soft offense edge",
            "Pass if `pointEdge >= 8 && pick whiff persistence >= 55 && starter leverage <= 70`",
            lambda row: (row.pick_whiff_persistence or -1) >= 55 and row.point_edge >= 8 and row.starter_leverage_index <= 70,
            "This looks for teams whose bats tend to stay dead after early whiff trouble when the side is not being carried by a major starter edge.",
        ),
        (
            "Carryover instability big edge",
            "Pass if `pointEdge >= 10 && pick carryover instability >= 60`",
            lambda row: (row.pick_carryover_instability or -1) >= 60 and row.point_edge >= 10,
            "This is the \"recent form may be lying\" lane.",
        ),
        (
            "Opponent comeback pressure",
            "Pass if `pointEdge >= 8 && opponent comeback resilience >= 55 && late stability <= 55`",
            lambda row: (row.opp_comeback_resilience or -1) >= 55 and row.point_edge >= 8 and row.late_inning_stability_index <= 55,
            "This tests whether the opposing team’s comeback habit matters once the game gets into a weaker hold lane.",
        ),
        (
            "Hidden chaos stack",
            "Pass if `pointEdge >= 10 && lead surrender gap >= 8 && carryover instability >= 60`",
            lambda row: (row.lead_surrender_gap or -999) >= 8 and (row.pick_carryover_instability or -1) >= 60 and row.point_edge >= 10,
            "This is the first real multi-behavior trap: shaky lead behavior plus a form profile that breaks quickly.",
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


def opponent_comeback_pressure(row: HiddenEdgeRow) -> bool:
    return (
        (row.opp_comeback_resilience or -1) >= 55
        and row.point_edge >= 8
        and row.late_inning_stability_index <= 55
    )


def hidden_chaos_stack(row: HiddenEdgeRow) -> bool:
    return (
        (row.lead_surrender_gap or -999) >= 8
        and (row.pick_carryover_instability or -1) >= 60
        and row.point_edge >= 10
    )


def combined_hidden_edge_flag(row: HiddenEdgeRow) -> bool:
    return opponent_comeback_pressure(row) or hidden_chaos_stack(row)


def evaluate_haircut_combo(
    rows: list[HiddenEdgeRow],
    predicate: Callable[[HiddenEdgeRow], bool],
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
        kept_edge_rows = [
            row
            for row in subset
            if (row.point_edge - (edge_cut if predicate(row) else 0.0)) >= edge_threshold
        ]
        removed_edge_rows = [
            row
            for row in baseline_edge_rows
            if (row.point_edge - (edge_cut if predicate(row) else 0.0)) < edge_threshold
        ]
        kept_conf_rows = [
            row
            for row in subset
            if (row.confidence - (confidence_cut if predicate(row) else 0)) >= confidence_threshold
        ]
        removed_conf_rows = [
            row
            for row in baseline_conf_rows
            if (row.confidence - (confidence_cut if predicate(row) else 0)) < confidence_threshold
        ]
        result[split_key] = {
            "baseline_edge_count": len(baseline_edge_rows),
            "baseline_edge_rate": hit_rate(baseline_edge_rows),
            "kept_edge_count": len(kept_edge_rows),
            "kept_edge_rate": hit_rate(kept_edge_rows),
            "removed_edge_count": len(removed_edge_rows),
            "removed_edge_rate": hit_rate(removed_edge_rows),
            "edge_delta": round(hit_rate(kept_edge_rows) - hit_rate(baseline_edge_rows), 3),
            "baseline_conf_count": len(baseline_conf_rows),
            "baseline_conf_rate": hit_rate(baseline_conf_rows),
            "kept_conf_count": len(kept_conf_rows),
            "kept_conf_rate": hit_rate(kept_conf_rows),
            "removed_conf_count": len(removed_conf_rows),
            "removed_conf_rate": hit_rate(removed_conf_rows),
            "conf_delta": round(hit_rate(kept_conf_rows) - hit_rate(baseline_conf_rows), 3),
        }
    return result


def haircut_combo_score(metrics: dict[str, dict[str, float | int]]) -> float:
    reserve = metrics["reserve"]
    current = metrics["current"]
    combined = metrics["combined"]
    score = 0.0
    score += float(current["edge_delta"]) * 2.0
    score += float(current["conf_delta"]) * 2.5
    score += float(combined["edge_delta"]) * 1.0
    score += float(combined["conf_delta"]) * 1.5
    score += float(reserve["edge_delta"]) * 1.25
    score += float(reserve["conf_delta"]) * 1.5
    score += max(0, float(current["removed_edge_count"])) * 0.02
    score += max(0, float(current["removed_conf_count"])) * 0.03
    if float(reserve["edge_delta"]) < -0.02:
        score -= 0.25
    if float(reserve["conf_delta"]) < -0.02:
        score -= 0.35
    return round(score, 3)


def format_haircut_grid_for_rule(
    rows: list[HiddenEdgeRow],
    title: str,
    predicate: Callable[[HiddenEdgeRow], bool],
) -> str:
    combos = [
        (1.5, 4),
        (2.0, 4),
        (2.0, 6),
        (3.0, 4),
        (3.0, 6),
        (4.0, 6),
        (4.0, 8),
    ]
    evaluations = []
    for edge_cut, confidence_cut in combos:
        metrics = evaluate_haircut_combo(rows, predicate, edge_cut, confidence_cut)
        evaluations.append(
            {
                "edge_cut": edge_cut,
                "confidence_cut": confidence_cut,
                "metrics": metrics,
                "score": haircut_combo_score(metrics),
            }
        )
    evaluations.sort(key=lambda item: item["score"], reverse=True)

    summary_rows: list[list[str]] = []
    for item in evaluations:
        reserve = item["metrics"]["reserve"]
        current = item["metrics"]["current"]
        combined = item["metrics"]["combined"]
        summary_rows.append(
            [
                f"`-{item['edge_cut']:.1f} / -{item['confidence_cut']}`",
                f"{item['score']:.3f}",
                f"{reserve['edge_delta']:+.3f}",
                f"{reserve['conf_delta']:+.3f}",
                f"{current['edge_delta']:+.3f}",
                f"{current['conf_delta']:+.3f}",
                f"{combined['edge_delta']:+.3f}",
                f"{combined['conf_delta']:+.3f}",
                f"{int(current['removed_edge_count'])}/{int(current['removed_conf_count'])}",
            ]
        )

    best = evaluations[0]
    reserve = best["metrics"]["reserve"]
    current = best["metrics"]["current"]
    combined = best["metrics"]["combined"]
    return "\n\n".join(
        [
            f"### {title}\n"
            + markdown_table(
                [
                    "Haircut",
                    "Score",
                    "Reserve 10+ Δ",
                    "Reserve 60+ Δ",
                    "Current 10+ Δ",
                    "Current 60+ Δ",
                    "Combined 10+ Δ",
                    "Combined 60+ Δ",
                    "Current removed (edge/conf)",
                ],
                summary_rows,
            ),
            (
                f"Best current combo: `-{best['edge_cut']:.1f}` edge / `-{best['confidence_cut']}` confidence. "
                f"Reserve deltas were `{reserve['edge_delta']:+.3f}` and `{reserve['conf_delta']:+.3f}`. "
                f"Current deltas were `{current['edge_delta']:+.3f}` and `{current['conf_delta']:+.3f}`. "
                f"Combined deltas were `{combined['edge_delta']:+.3f}` and `{combined['conf_delta']:+.3f}`."
            ),
        ]
    )


def format_hidden_edge_haircuts(rows: list[HiddenEdgeRow]) -> str:
    return "\n\n".join(
        [
            format_haircut_grid_for_rule(rows, "Opponent comeback pressure haircut", opponent_comeback_pressure),
            format_haircut_grid_for_rule(rows, "Hidden chaos stack haircut", hidden_chaos_stack),
            format_haircut_grid_for_rule(rows, "Combined hidden-edge haircut", combined_hidden_edge_flag),
        ]
    )


def write_report(out_path: Path) -> None:
    conn = get_connection()
    try:
        game_lookup = load_game_lookup(conn)
        rows = load_reserve_rows(conn, game_lookup)
        rows.extend(load_current_rows(game_lookup, conn))
        whiff_count = conn.execute("SELECT COUNT(*) FROM mlb_team_whiff_persistence_profiles").fetchone()[0]
        lead_count = conn.execute("SELECT COUNT(*) FROM mlb_team_lead_surrender_profiles").fetchone()[0]
        carry_count = conn.execute("SELECT COUNT(*) FROM mlb_team_form_carryover_profiles").fetchone()[0]
    finally:
        conn.close()

    report = f"""# MLB Hidden Edge Research — May 23, 2026

## Goal

Build the first warehouse-backed tables for the hidden behavioral edges we keep talking about:

1. `whiff persistence`
2. `lead / surrender behavior`
3. `form carryover / break timing`

This pass uses standard Python and SQLite because `pandas` is not bundled in the current workspace. The table layout is intentionally pandas-ready so we can push this into heavier ML scanning later without redoing the warehouse shape.

## Dataset Windows

{format_dataset_summary(rows)}

## Hidden Edge Inventory

- `mlb_team_whiff_persistence_profiles`: {whiff_count} rows
- `mlb_team_lead_surrender_profiles`: {lead_count} rows
- `mlb_team_form_carryover_profiles`: {carry_count} rows

All three are keyed by:
- `as_of_date`
- `team_name`
- `window_games`

Current research uses `window_games = {WINDOW_GAMES}`.

## Bucket Read

{format_buckets(rows)}

## Candidate Hidden-Edge Rules

{format_candidate_rules(rows)}

## Soft Haircut Grids

These use the two strongest hidden-edge traps as offline `-edge / -confidence` haircuts on the same `10+ edge` and `60+ confidence` buckets we use elsewhere.

{format_hidden_edge_haircuts(rows)}

## Early Read
1. These tables are finally measuring the behaviors we were missing: whether bad early swing quality persists, how often advantages actually hold, and how quickly recent form breaks or carries.
2. The next question is not just which bucket is \"good\" or \"bad,\" but which hidden behaviors combine with existing live features like `starter leverage`, `late stability`, and `point edge`.
3. The haircut grids matter more than the raw pass buckets because they tell us whether these hidden edges can improve stronger conviction lanes without wrecking reserve performance.
4. This is still an early pass. The real upside comes once we let these profiles accumulate more dates and then scan for nonlinear combinations, especially after pandas/ML tooling is added on top.

## Recommended Next Move
1. keep these tables offline for now
2. keep collecting them every graded day
3. rerun these haircut grids after each graded slate
4. only promote a hidden-edge haircut if reserve and current both stop wobbling
"""
    out_path.write_text(report, encoding="utf-8")
    print(f"Wrote {out_path}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Research hidden behavioral MLB edges from new warehouse profile tables.")
    parser.add_argument("--out", type=Path, default=DEFAULT_OUT, help="Path to write the markdown report.")
    args = parser.parse_args()
    write_report(args.out)


if __name__ == "__main__":
    main()
