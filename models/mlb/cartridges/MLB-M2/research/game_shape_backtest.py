#!/usr/bin/env python3

from __future__ import annotations

import argparse
import json
import math
import re
import sqlite3
import warnings
from pathlib import Path
from typing import Any

import pandas as pd

try:
    from sklearn.ensemble import GradientBoostingClassifier, RandomForestClassifier
    from sklearn.linear_model import LogisticRegression
    from sklearn.pipeline import make_pipeline
    from sklearn.preprocessing import StandardScaler
except Exception:  # pragma: no cover - optional research dependency
    GradientBoostingClassifier = None
    RandomForestClassifier = None
    LogisticRegression = None
    make_pipeline = None
    StandardScaler = None


def find_root() -> Path:
    path = Path(__file__).resolve()
    for parent in path.parents:
        if (parent / "package.json").exists() and (parent / "models").exists():
            return parent
    raise RuntimeError("Could not locate project root.")


ROOT = find_root()
DB_PATH = ROOT / "data-private" / "warehouse" / "sports.db"
DEFAULT_START = "2026-05-10"
DEFAULT_END = "2026-05-31"
REPORT_DIR = ROOT / "models" / "mlb" / "cartridges" / "MLB-M2" / "reports"
PRIVATE_REPORT_DIR = ROOT / "data-private" / "reports"

FULL_NAMES = {
    "Angels": "Los Angeles Angels",
    "Astros": "Houston Astros",
    "Athletics": "Athletics",
    "Blue Jays": "Toronto Blue Jays",
    "Braves": "Atlanta Braves",
    "Brewers": "Milwaukee Brewers",
    "Cardinals": "St. Louis Cardinals",
    "Cubs": "Chicago Cubs",
    "D-backs": "Arizona Diamondbacks",
    "Diamondbacks": "Arizona Diamondbacks",
    "Dodgers": "Los Angeles Dodgers",
    "Giants": "San Francisco Giants",
    "Guardians": "Cleveland Guardians",
    "Mariners": "Seattle Mariners",
    "Marlins": "Miami Marlins",
    "Mets": "New York Mets",
    "Nationals": "Washington Nationals",
    "Orioles": "Baltimore Orioles",
    "Padres": "San Diego Padres",
    "Phillies": "Philadelphia Phillies",
    "Pirates": "Pittsburgh Pirates",
    "Rangers": "Texas Rangers",
    "Rays": "Tampa Bay Rays",
    "Red Sox": "Boston Red Sox",
    "Reds": "Cincinnati Reds",
    "Rockies": "Colorado Rockies",
    "Royals": "Kansas City Royals",
    "Tigers": "Detroit Tigers",
    "Twins": "Minnesota Twins",
    "White Sox": "Chicago White Sox",
    "Yankees": "New York Yankees",
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Backtest MLB-M2 game-shape categories against settled side rows.")
    parser.add_argument("--db", default=str(DB_PATH), help="Warehouse sqlite database.")
    parser.add_argument("--start", default=DEFAULT_START, help="First prediction date to include.")
    parser.add_argument("--end", default=DEFAULT_END, help="Last prediction date to include.")
    parser.add_argument("--markdown-out", default=None, help="Markdown report output path.")
    parser.add_argument("--json-out", default=None, help="JSON artifact output path.")
    return parser.parse_args()


def clamp(value: float, low: float = 0.0, high: float = 100.0) -> float:
    return max(low, min(high, value))


def round1(value: Any) -> float | None:
    numeric = to_number(value)
    if numeric is None:
        return None
    return round(numeric, 1)


def to_number(value: Any, default: float | None = None) -> float | None:
    if value is None:
        return default
    try:
        numeric = float(value)
    except (TypeError, ValueError):
        return default
    if math.isnan(numeric) or math.isinf(numeric):
        return default
    return numeric


def safe_avg(values: list[float]) -> float:
    return sum(values) / len(values) if values else 0.0


def pct(values: pd.Series) -> str:
    values = values.dropna()
    if values.empty:
        return "N/A"
    return f"{values.mean() * 100:.1f}%"


def markdown_table(headers: list[str], rows: list[list[Any]]) -> str:
    if not rows:
        rows = [["-" for _ in headers]]
    header_line = "| " + " | ".join(headers) + " |"
    divider_line = "| " + " | ".join(["---"] * len(headers)) + " |"
    body = "\n".join("| " + " | ".join(str(cell) for cell in row) + " |" for row in rows)
    return "\n".join([header_line, divider_line, body])


def canonical_team(name: Any) -> str:
    text = str(name or "").strip()
    if not text:
        return ""
    return FULL_NAMES.get(text, text)


def team_matches(left: Any, right: Any) -> bool:
    left_full = canonical_team(left).lower()
    right_full = canonical_team(right).lower()
    if not left_full or not right_full:
        return False
    return left_full == right_full


def parse_json(value: Any) -> dict[str, Any]:
    if not value:
        return {}
    if isinstance(value, dict):
        return value
    try:
        parsed = json.loads(value)
    except (TypeError, json.JSONDecodeError):
        return {}
    return parsed if isinstance(parsed, dict) else {}


def parse_line(label: Any) -> float | None:
    if not label:
        return None
    match = re.search(r"([0-9]+(?:\.[0-9]+)?)", str(label))
    return float(match.group(1)) if match else None


def load_summary_context(start: str, end: str) -> dict[tuple[str, str], dict[str, Any]]:
    lookup: dict[tuple[str, str], dict[str, Any]] = {}
    for slate_dir in sorted((ROOT / "published-data" / "slates").glob("2026-*-*")):
        date = slate_dir.name
        if date < start or date > end:
            continue
        summary_path = slate_dir / "summary.json"
        if not summary_path.exists():
            continue
        try:
            summary = json.loads(summary_path.read_text())
        except json.JSONDecodeError:
            continue
        for game in summary.get("games", []):
            if game.get("league") != "MLB":
                continue
            title = str(game.get("title") or "")
            totals = (((game.get("analysis") or {}).get("mlbProjection") or {}).get("totals") or {})
            first_inning = (((game.get("analysis") or {}).get("mlbProjection") or {}).get("firstInning") or {})
            full_total = totals.get("fullGame") or {}
            first5_total = totals.get("first5") or {}
            lookup[(date, title)] = {
                "summary_available": True,
                "full_total_lean": full_total.get("lean"),
                "full_total_label": full_total.get("label"),
                "full_total_line": parse_line(full_total.get("label")),
                "first5_total_lean": first5_total.get("lean"),
                "first5_total_label": first5_total.get("label"),
                "first5_total_line": parse_line(first5_total.get("label")),
                "projected_full_total": to_number(totals.get("projectedFullTotalRuns")),
                "projected_first5_total": to_number(totals.get("projectedFirst5TotalRuns")),
                "first_inning_pick": first_inning.get("pick"),
                "first_inning_yes_pct": to_number(first_inning.get("yesProbabilityPct")),
                "first_inning_no_pct": to_number(first_inning.get("noProbabilityPct")),
            }
    return lookup


def canonical_model_predicate() -> str:
    return """
      (
        p.prediction_date BETWEEN '2026-05-10' AND '2026-05-15'
        AND p.model_name = 'board-moneyline-v2'
      ) OR (
        p.prediction_date BETWEEN '2026-05-16' AND '2026-05-22'
        AND p.model_name = 'board-moneyline-tier1-v1'
      ) OR (
        p.prediction_date IN ('2026-05-23', '2026-05-30', '2026-05-31')
        AND p.model_name = 'board-moneyline-v1.1-sanity'
      )
    """


def load_rows(conn: sqlite3.Connection, start: str, end: str) -> pd.DataFrame:
    query = f"""
        WITH canonical AS (
          SELECT p.*
          FROM mlb_side_predictions p
          WHERE ({canonical_model_predicate()})
            AND p.prediction_date BETWEEN ? AND ?
        ),
        joined AS (
          SELECT
            p.*,
            b.actual_winner,
            b.actual_first5_winner,
            b.hit_full_game,
            b.hit_first5,
            b.predicted_runs_final AS actual_pick_runs_final,
            b.opponent_runs_final AS actual_opp_runs_final,
            b.predicted_runs_first5 AS actual_pick_runs_first5,
            b.opponent_runs_first5 AS actual_opp_runs_first5,
            b.predicted_bullpen_runs AS actual_pick_bullpen_runs,
            b.opponent_bullpen_runs AS actual_opp_bullpen_runs,
            COALESCE(p.game_pk, b.game_pk) AS resolved_game_pk,
            CASE WHEN p.predicted_side = 'away' THEN p.home_team ELSE p.away_team END AS opponent_team
          FROM canonical p
          JOIN mlb_side_backtests b
            USING (prediction_date, model_name, game_id)
        )
        SELECT
          j.prediction_date,
          j.model_name,
          j.game_id,
          j.game_title,
          j.away_team,
          j.home_team,
          j.predicted_team,
          j.opponent_team,
          j.predicted_side,
          j.confidence,
          j.volatility,
          j.model_edge,
          j.projection_json,
          j.metadata_json,
          j.starter_leverage_index,
          j.late_inning_stability_index,
          j.relief_pitching_risk,
          j.coinflip_pressure,
          j.pick_bullpen_score,
          j.opp_bullpen_score,
          j.pick_starter_score,
          j.opp_starter_score,
          j.projected_hit_edge_for_pick,
          j.hit_edge_against_pick_flag,
          j.actual_winner,
          j.actual_first5_winner,
          j.hit_full_game,
          j.hit_first5,
          j.actual_pick_runs_final,
          j.actual_opp_runs_final,
          j.actual_pick_runs_first5,
          j.actual_opp_runs_first5,
          j.actual_pick_bullpen_runs,
          j.actual_opp_bullpen_runs,
          j.resolved_game_pk,
          po.phase_path_label,
          po.result AS pick_phase_result,
          gs.primary_story_label,
          gs.early_phase_label,
          gs.late_phase_label,
          gs.scoring_shape_label,
          gs.winner_path_label,
          sig.first_inning_jolt_flag,
          sig.quiet_first5_flag,
          sig.comeback_win_flag,
          sig.bullpen_flip_flag,
          sig.late_break_flag,
          sig.first_scoring_inning,
          sig.lead_changes,
          sig.max_comeback_runs,
          sig.total_runs_first5,
          sig.total_runs_final,
          tm.mistake_chaos_index AS pick_chaos,
          om.mistake_chaos_index AS opp_chaos,
          tm.run_clustering_index AS pick_run_cluster,
          om.run_clustering_index AS opp_run_cluster,
          tm.scoreless_first3_rate AS pick_scoreless_first3,
          om.scoreless_first3_rate AS opp_scoreless_first3,
          tm.dead_bat_traffic_rate AS pick_dead_bat_traffic,
          om.dead_bat_traffic_rate AS opp_dead_bat_traffic,
          tm.traffic_no_conversion_rate AS pick_team_traffic_no_conversion,
          om.traffic_no_conversion_rate AS opp_team_traffic_no_conversion,
          tm.one_bad_inning_allowed_rate AS pick_one_bad_inning_allowed,
          om.one_bad_inning_allowed_rate AS opp_one_bad_inning_allowed,
          lm.lineup_conversion_index AS pick_lineup_conversion,
          ol.lineup_conversion_index AS opp_lineup_conversion,
          lm.quiet_first5_rate AS pick_quiet_first5,
          ol.quiet_first5_rate AS opp_quiet_first5,
          lm.traffic_no_conversion_rate AS pick_traffic_no_conversion,
          ol.traffic_no_conversion_rate AS opp_traffic_no_conversion,
          lm.early_conversion_rate AS pick_early_conversion,
          ol.early_conversion_rate AS opp_early_conversion,
          bm.bullpen_chaos_index AS pick_bullpen_chaos,
          ob.bullpen_chaos_index AS opp_bullpen_chaos,
          bm.lead_loss_after_entry_rate AS pick_lead_loss_after_entry,
          ob.lead_loss_after_entry_rate AS opp_lead_loss_after_entry,
          bm.bullpen_meltdown_game_rate AS pick_bullpen_meltdown_game,
          ob.bullpen_meltdown_game_rate AS opp_bullpen_meltdown_game,
          tf.scored_first_inning_rate AS pick_first_inning_score_rate,
          ofi.scored_first_inning_rate AS opp_first_inning_score_rate,
          tf.allowed_first_inning_rate AS pick_first_inning_allow_rate,
          ofi.allowed_first_inning_rate AS opp_first_inning_allow_rate,
          ts.snapback_pressure_index AS pick_snapback_pressure,
          ots.snapback_pressure_index AS opp_snapback_pressure,
          ts.heat_regression_index AS pick_heat_regression,
          ots.heat_regression_index AS opp_heat_regression
        FROM joined j
        LEFT JOIN mlb_phase_outcomes_daily po
          ON (
            po.game_pk = j.resolved_game_pk
            AND po.team_name = j.predicted_team
          ) OR (
            j.resolved_game_pk IS NULL
            AND po.game_date = j.prediction_date
            AND po.team_name = j.predicted_team
            AND po.opponent_team = j.opponent_team
          )
        LEFT JOIN mlb_game_story_labels gs
          ON gs.game_pk = j.resolved_game_pk
        LEFT JOIN mlb_game_story_signals sig
          ON sig.game_pk = j.resolved_game_pk
        LEFT JOIN mlb_team_mistake_shape_daily tm
          ON tm.as_of_date = j.prediction_date
         AND tm.team_name = j.predicted_team
         AND tm.window_games = 8
        LEFT JOIN mlb_team_mistake_shape_daily om
          ON om.as_of_date = j.prediction_date
         AND om.team_name = j.opponent_team
         AND om.window_games = 8
        LEFT JOIN mlb_lineup_conversion_shape_daily lm
          ON lm.as_of_date = j.prediction_date
         AND lm.team_name = j.predicted_team
         AND lm.window_games = 8
        LEFT JOIN mlb_lineup_conversion_shape_daily ol
          ON ol.as_of_date = j.prediction_date
         AND ol.team_name = j.opponent_team
         AND ol.window_games = 8
        LEFT JOIN mlb_bullpen_mistake_shape_daily bm
          ON bm.as_of_date = j.prediction_date
         AND bm.team_name = j.predicted_team
         AND bm.window_days = 14
        LEFT JOIN mlb_bullpen_mistake_shape_daily ob
          ON ob.as_of_date = j.prediction_date
         AND ob.team_name = j.opponent_team
         AND ob.window_days = 14
        LEFT JOIN mlb_team_first_inning_profiles_daily tf
          ON tf.as_of_date = j.prediction_date
         AND tf.team_name = j.predicted_team
         AND tf.window_games = 8
        LEFT JOIN mlb_team_first_inning_profiles_daily ofi
          ON ofi.as_of_date = j.prediction_date
         AND ofi.team_name = j.opponent_team
         AND ofi.window_games = 8
        LEFT JOIN mlb_team_state_snapshots ts
          ON ts.as_of_date = j.prediction_date
         AND ts.team_name = j.predicted_team
        LEFT JOIN mlb_team_state_snapshots ots
          ON ots.as_of_date = j.prediction_date
         AND ots.team_name = j.opponent_team
        ORDER BY j.prediction_date, j.game_title
    """
    return pd.read_sql_query(query, conn, params=[start, end])


def enrich_rows(df: pd.DataFrame, summary_context: dict[tuple[str, str], dict[str, Any]]) -> pd.DataFrame:
    rows: list[dict[str, Any]] = []
    for record in df.to_dict("records"):
        projection = parse_json(record.get("projection_json"))
        metadata = parse_json(record.get("metadata_json"))
        summary = summary_context.get((str(record.get("prediction_date")), str(record.get("game_title"))), {})

        pick_team = record.get("predicted_team")
        phase_teams = [
            projection.get("edgeTeam"),
            projection.get("first5EdgeTeam"),
            projection.get("lateEdgeTeam"),
            projection.get("bridgeEdgeTeam"),
        ]
        pick_owns_full = team_matches(projection.get("edgeTeam"), pick_team)
        pick_owns_first5 = team_matches(projection.get("first5EdgeTeam"), pick_team)
        pick_owns_late = team_matches(projection.get("lateEdgeTeam"), pick_team)
        pick_owns_bridge = team_matches(projection.get("bridgeEdgeTeam"), pick_team)
        pick_phase_count = sum([pick_owns_full, pick_owns_first5, pick_owns_late, pick_owns_bridge])
        distinct_phase_teams = len({canonical_team(team).lower() for team in phase_teams if team})
        pick_phase_misses = sum(1 for team in phase_teams if team and not team_matches(team, pick_team))
        actual_total = to_number(record.get("total_runs_final"))
        if actual_total is None:
            actual_total = (to_number(record.get("actual_pick_runs_final"), 0) or 0) + (
                to_number(record.get("actual_opp_runs_final"), 0) or 0
            )
        actual_first5_total = to_number(record.get("total_runs_first5"))
        if actual_first5_total is None:
            actual_first5_total = (to_number(record.get("actual_pick_runs_first5"), 0) or 0) + (
                to_number(record.get("actual_opp_runs_first5"), 0) or 0
            )

        full_total_line = to_number(summary.get("full_total_line"))
        first5_total_line = to_number(summary.get("first5_total_line"))
        full_total_lean = summary.get("full_total_lean")
        first5_total_lean = summary.get("first5_total_lean")
        first_inning_pick = summary.get("first_inning_pick")
        first_inning_jolt = to_number(record.get("first_inning_jolt_flag"))

        full_total_hit = grade_total(full_total_lean, full_total_line, actual_total)
        first5_total_hit = grade_total(first5_total_lean, first5_total_line, actual_first5_total)
        first_inning_hit = grade_first_inning(first_inning_pick, first_inning_jolt)

        record.update(
            {
                "projection": projection,
                "metadata": metadata,
                "pick_owns_full": pick_owns_full,
                "pick_owns_first5": pick_owns_first5,
                "pick_owns_late": pick_owns_late,
                "pick_owns_bridge": pick_owns_bridge,
                "pick_phase_count": pick_phase_count,
                "distinct_phase_teams": distinct_phase_teams,
                "pick_phase_misses": pick_phase_misses,
                "edge_hits": to_number(projection.get("edgeHits"), 0),
                "first5_edge_hits": to_number(projection.get("first5EdgeHits"), 0),
                "late_edge_hits": to_number(projection.get("lateEdgeHits"), 0),
                "bridge_edge_score": to_number(projection.get("bridgeEdgeScore"), 0),
                "actual_total": actual_total,
                "actual_first5_total": actual_first5_total,
                "full_total_lean": full_total_lean,
                "full_total_line": full_total_line,
                "full_total_hit": full_total_hit,
                "first5_total_lean": first5_total_lean,
                "first5_total_line": first5_total_line,
                "first5_total_hit": first5_total_hit,
                "first_inning_pick": first_inning_pick,
                "first_inning_hit": first_inning_hit,
                "summary_available": bool(summary.get("summary_available")),
                "weather_carry": has_weather_carry(projection, summary),
            }
        )
        rows.append(record)

    enriched = pd.DataFrame(rows)
    return add_shape_scores(enriched)


def grade_total(lean: Any, line: float | None, actual_total: float | None) -> float | None:
    if not lean or line is None or actual_total is None:
        return None
    lean_text = str(lean).lower()
    if "over" in lean_text:
        if actual_total == line:
            return None
        return 1.0 if actual_total > line else 0.0
    if "under" in lean_text:
        if actual_total == line:
            return None
        return 1.0 if actual_total < line else 0.0
    return None


def grade_first_inning(pick: Any, first_inning_jolt: float | None) -> float | None:
    if not pick or first_inning_jolt is None:
        return None
    pick_text = str(pick).upper()
    if pick_text == "YRFI":
        return 1.0 if first_inning_jolt else 0.0
    if pick_text == "NRFI":
        return 0.0 if first_inning_jolt else 1.0
    return None


def has_weather_carry(projection: dict[str, Any], summary: dict[str, Any]) -> bool:
    weather = projection.get("weather") or projection.get("weatherProfile") or {}
    haystack = " ".join(
        str(value or "")
        for value in [
            weather.get("label") if isinstance(weather, dict) else weather,
            projection.get("weatherNote"),
            summary.get("full_total_label"),
        ]
    )
    return bool(re.search(r"carry|wind out|hot|sun", haystack, re.I))


def add_shape_scores(df: pd.DataFrame) -> pd.DataFrame:
    numeric_columns = [
        "confidence",
        "volatility",
        "model_edge",
        "starter_leverage_index",
        "late_inning_stability_index",
        "relief_pitching_risk",
        "pick_bullpen_score",
        "opp_bullpen_score",
        "pick_starter_score",
        "opp_starter_score",
        "projected_hit_edge_for_pick",
        "pick_chaos",
        "opp_chaos",
        "pick_run_cluster",
        "opp_run_cluster",
        "pick_scoreless_first3",
        "opp_scoreless_first3",
        "pick_dead_bat_traffic",
        "opp_dead_bat_traffic",
        "pick_lineup_conversion",
        "opp_lineup_conversion",
        "pick_quiet_first5",
        "opp_quiet_first5",
        "pick_traffic_no_conversion",
        "opp_traffic_no_conversion",
        "pick_one_bad_inning_allowed",
        "opp_one_bad_inning_allowed",
        "pick_bullpen_chaos",
        "opp_bullpen_chaos",
        "pick_bullpen_meltdown_game",
        "opp_bullpen_meltdown_game",
    ]
    for column in numeric_columns:
        if column in df:
            df[column] = pd.to_numeric(df[column], errors="coerce")

    df["max_chaos"] = df[["pick_chaos", "opp_chaos"]].max(axis=1)
    df["max_run_cluster"] = df[["pick_run_cluster", "opp_run_cluster"]].max(axis=1)
    df["max_one_bad_inning"] = df[["pick_one_bad_inning_allowed", "opp_one_bad_inning_allowed"]].max(axis=1)
    df["max_quiet_first5"] = df[["pick_quiet_first5", "opp_quiet_first5"]].max(axis=1)
    df["max_dead_traffic"] = df[["pick_dead_bat_traffic", "opp_dead_bat_traffic"]].max(axis=1)
    df["max_no_conversion"] = df[["pick_traffic_no_conversion", "opp_traffic_no_conversion"]].max(axis=1)
    df["min_lineup_conversion"] = df[["pick_lineup_conversion", "opp_lineup_conversion"]].min(axis=1)
    df["max_bullpen_chaos"] = df[["pick_bullpen_chaos", "opp_bullpen_chaos"]].max(axis=1)
    df["max_bullpen_meltdown"] = df[["pick_bullpen_meltdown_game", "opp_bullpen_meltdown_game"]].max(axis=1)
    df["lineup_gap"] = df["pick_lineup_conversion"] - df["opp_lineup_conversion"]
    df["opponent_chaos_gap"] = df["opp_chaos"] - df["pick_chaos"]
    df["starter_gap"] = df["pick_starter_score"] - df["opp_starter_score"]
    df["bullpen_gap"] = df["pick_bullpen_score"] - df["opp_bullpen_score"]

    df["chaos_score"] = (
        df["max_chaos"].fillna(45) * 0.42
        + df["max_run_cluster"].fillna(45) * 0.22
        + (df["max_one_bad_inning"].fillna(0.24) * 100) * 0.20
        + df["max_bullpen_chaos"].fillna(35) * 0.12
        + (df["max_bullpen_meltdown"].fillna(0.10) * 100) * 0.10
        + df["weather_carry"].fillna(False).astype(float) * 6
    ).clip(0, 100)
    df["dead_early_score"] = (
        (df["max_quiet_first5"].fillna(0.25) * 100) * 0.34
        + (df["max_dead_traffic"].fillna(0.20) * 100) * 0.27
        + (df["max_no_conversion"].fillna(0.12) * 100) * 0.22
        + (45 - df["min_lineup_conversion"].fillna(45)).clip(lower=0) * 0.70
    ).clip(0, 100)
    df["phase_split_score"] = (
        (df["distinct_phase_teams"].fillna(1).astype(float).gt(1).astype(float) * 28)
        + df["pick_phase_misses"].fillna(0).astype(float) * 12
        + df["edge_hits"].fillna(0).le(0.5).astype(float) * 8
        + df["first5_edge_hits"].fillna(0).le(0.3).astype(float) * 8
        + df["late_edge_hits"].fillna(0).le(0.3).astype(float) * 8
    ).clip(0, 100)
    df["bullpen_flip_score"] = (
        (df["relief_pitching_risk"].fillna(38) - 38) * 1.20
        + df["late_inning_stability_index"].fillna(50).lt(48).astype(float) * 16
        + df["bridge_edge_score"].fillna(0).abs() * 1.10
        + df["max_bullpen_chaos"].fillna(35) * 0.18
    ).clip(0, 100)
    df["starter_control_score"] = (
        df["starter_leverage_index"].fillna(0) * 0.45
        + df["starter_gap"].clip(lower=0).fillna(0) * 0.55
        + df["first5_edge_hits"].clip(lower=0).fillna(0) * 7
        - df["dead_early_score"] * 0.18
    ).clip(0, 100)
    df["market_contradiction_score"] = (
        df["volatility"].fillna(0).sub(df["confidence"].fillna(0)).clip(lower=0) * 0.45
        + df["model_edge"].fillna(0).sub(8).clip(lower=0) * 0.35
    ).clip(0, 100)
    blended = (
        df["chaos_score"] * 0.30
        + df["dead_early_score"] * 0.22
        + df["phase_split_score"] * 0.22
        + df["bullpen_flip_score"] * 0.14
        + df["market_contradiction_score"] * 0.12
    )
    high_shape_count = (
        (df[["chaos_score", "dead_early_score", "phase_split_score", "bullpen_flip_score"]] >= 65)
        .sum(axis=1)
        .astype(float)
    )
    df["reality_gap_score"] = pd.concat(
        [
            blended,
            df["chaos_score"] * 0.82,
            df["dead_early_score"] * 0.78,
            df["phase_split_score"] * 0.80,
            df["bullpen_flip_score"] * 0.72,
        ],
        axis=1,
    ).max(axis=1)
    df["reality_gap_score"] = (
        df["reality_gap_score"] + high_shape_count * 4 + df["market_contradiction_score"] * 0.08
    ).clip(0, 100)

    categories = df.apply(classify_row, axis=1, result_type="expand")
    return pd.concat([df, categories], axis=1)


def classify_row(row: pd.Series) -> dict[str, Any]:
    low_pick_conversion = (
        to_number(row.get("pick_lineup_conversion"), 100) <= 32
        or to_number(row.get("pick_traffic_no_conversion"), 0) >= 0.24
        or to_number(row.get("pick_dead_bat_traffic"), 0) >= 0.44
    )
    quiet_pick = (
        to_number(row.get("pick_quiet_first5"), 0) >= 0.5
        or to_number(row.get("pick_scoreless_first3"), 0) >= 0.5
    )
    bridge_against_pick = bool(row.get("pick_owns_first5")) and not (
        bool(row.get("pick_owns_late")) and bool(row.get("pick_owns_bridge"))
    )
    late_only = not bool(row.get("pick_owns_first5")) and (
        bool(row.get("pick_owns_late")) or bool(row.get("pick_owns_bridge"))
    )
    phase_aligned = (
        int(row.get("pick_phase_count") or 0) >= 3
        and bool(row.get("pick_owns_full"))
        and bool(row.get("pick_owns_first5"))
    )
    pick_is_favorite = bool((row.get("predicted_side") == "away" and "favorite" in str(row.get("metadata")).lower()))
    favorite_conversion_trap = (
        row.get("hit_edge_against_pick_flag") == 1
        or (to_number(row.get("model_edge"), 0) >= 8 and (low_pick_conversion or quiet_pick))
    )

    candidates = [
        (
            "weather_chaos_carry",
            "Weather-carry chaos",
            "Totals / HR cluster before side",
            bool(row.get("weather_carry")) and to_number(row.get("chaos_score"), 0) >= 62,
        ),
        (
            "crooked_inning_over",
            "Crooked-inning game",
            "Full-game total / team total / HR cluster",
            to_number(row.get("chaos_score"), 0) >= 68
            or to_number(row.get("max_bullpen_chaos"), 0) >= 56,
        ),
        (
            "false_favorite_conversion_trap",
            "Favorite conversion trap",
            "No taxed ML; require early conversion or better live price",
            pick_is_favorite and favorite_conversion_trap,
        ),
        (
            "dead_zone_side",
            "Dead-zone side",
            "First-five timing or live after conversion; no blind full-game ML",
            to_number(row.get("dead_early_score"), 0) >= 60 and (low_pick_conversion or quiet_pick),
        ),
        (
            "starter_to_bullpen_flip",
            "Starter-to-bullpen flip",
            "First-five side or live lead",
            bridge_against_pick
            and (
                to_number(row.get("phase_split_score"), 0) >= 48
                or to_number(row.get("bullpen_flip_score"), 0) >= 48
                or to_number(row.get("bullpen_gap"), 0) <= -5
            ),
        ),
        (
            "late_rescue_side",
            "Late-rescue side",
            "Live side after starter exit",
            late_only,
        ),
        (
            "early_pressure_side",
            "Early-pressure side",
            "Full-game side only if early traffic appears; live entry preferred",
            bool(row.get("pick_owns_first5"))
            and to_number(row.get("dead_early_score"), 0) < 58
            and (
                to_number(row.get("lineup_gap"), 0) >= 8
                or to_number(row.get("projected_hit_edge_for_pick"), 0) >= 0.8
            ),
        ),
        (
            "starter_duel_under",
            "Starter-duel under",
            "NRFI / first-five under",
            to_number(row.get("starter_control_score"), 0) >= 66
            and to_number(row.get("chaos_score"), 0) < 56
            and to_number(row.get("dead_early_score"), 0) >= 42,
        ),
        (
            "market_dog_pressure",
            "Underdog pressure lane",
            "Plus-price ML / prediction-market spike",
            to_number(row.get("model_edge"), 0) >= 6
            and (
                to_number(row.get("projected_hit_edge_for_pick"), 0) >= 0.6
                or to_number(row.get("lineup_gap"), 0) >= 8
                or to_number(row.get("opponent_chaos_gap"), 0) >= 6
            )
            and to_number(row.get("confidence"), 0) <= 64,
        ),
        (
            "clean_phase_stack",
            "Clean phase stack",
            "Full-game side if price is fair",
            phase_aligned
            and to_number(row.get("reality_gap_score"), 100) < 58
            and to_number(row.get("dead_early_score"), 100) < 56,
        ),
    ]

    slug, label, expression = "balanced_traffic", "Balanced traffic game", "Wait for first real scoring pocket"
    for candidate_slug, candidate_label, candidate_expression, condition in candidates:
        if condition:
            slug, label, expression = candidate_slug, candidate_label, candidate_expression
            break
    confidence = category_confidence(slug, row)
    lane_hit = grade_category_lane(slug, row)
    avoid_saved = 1.0 if slug in {"dead_zone_side", "false_favorite_conversion_trap"} and row.get("hit_full_game") == 0 else 0.0
    return {
        "m2_category": slug,
        "m2_category_label": label,
        "m2_best_expression": expression,
        "m2_category_confidence": confidence,
        "m2_lane_hit": lane_hit,
        "m2_avoid_saved": avoid_saved,
    }


def category_confidence(slug: str, row: pd.Series) -> float:
    if slug in {"crooked_inning_over", "weather_chaos_carry"}:
        return round(float(to_number(row.get("chaos_score"), 0)), 1)
    if slug in {"dead_zone_side", "false_favorite_conversion_trap"}:
        return round(float(to_number(row.get("dead_early_score"), 0)), 1)
    if slug in {"starter_to_bullpen_flip", "late_rescue_side"}:
        return round(max(float(to_number(row.get("phase_split_score"), 0)), float(to_number(row.get("bullpen_flip_score"), 0))), 1)
    if slug == "starter_duel_under":
        return round(float(to_number(row.get("starter_control_score"), 0)), 1)
    if slug == "clean_phase_stack":
        return round(max(0.0, 100.0 - float(to_number(row.get("reality_gap_score"), 100))), 1)
    if slug == "market_dog_pressure":
        return round(54 + max(float(to_number(row.get("lineup_gap"), 0)) * 0.35, float(to_number(row.get("opponent_chaos_gap"), 0)) * 0.45), 1)
    return round(float(to_number(row.get("reality_gap_score"), 50)), 1)


def grade_category_lane(slug: str, row: pd.Series) -> float | None:
    fg = to_number(row.get("hit_full_game"))
    f5 = to_number(row.get("hit_first5"))
    first_inning_jolt = to_number(row.get("first_inning_jolt_flag"))
    actual_total = to_number(row.get("actual_total"))
    actual_first5_total = to_number(row.get("actual_first5_total"))

    if slug in {"clean_phase_stack", "market_dog_pressure", "late_rescue_side", "early_pressure_side"}:
        return fg
    if slug in {"starter_to_bullpen_flip", "dead_zone_side", "false_favorite_conversion_trap"}:
        return f5
    if slug == "starter_duel_under":
        if first_inning_jolt is not None and actual_first5_total is not None:
            return 1.0 if first_inning_jolt == 0 and actual_first5_total <= 4 else 0.0
        return None
    if slug in {"crooked_inning_over", "weather_chaos_carry"}:
        if actual_total is not None:
            return 1.0 if actual_total >= 9 else 0.0
        return None
    return None


def summarize(df: pd.DataFrame, start: str, end: str) -> dict[str, Any]:
    category_rows = []
    for category, group in df.groupby("m2_category", dropna=False):
        category_rows.append(
            {
                "category": category,
                "label": group["m2_category_label"].iloc[0],
                "rows": int(len(group)),
                "fg_hit_rate": nullable_rate(group["hit_full_game"]),
                "f5_hit_rate": nullable_rate(group["hit_first5"]),
                "lane_hit_rate": nullable_rate(group["m2_lane_hit"]),
                "first_inning_jolt_rate": nullable_rate(group["first_inning_jolt_flag"]),
                "avg_total_runs": round(float(group["actual_total"].dropna().mean()), 2)
                if not group["actual_total"].dropna().empty
                else None,
            }
        )
    category_rows.sort(key=lambda row: (-row["rows"], row["category"]))

    date_rows = []
    for date, group in df.groupby("prediction_date", dropna=False):
        date_rows.append(
            {
                "date": date,
                "rows": int(len(group)),
                "fg_hit_rate": nullable_rate(group["hit_full_game"]),
                "f5_hit_rate": nullable_rate(group["hit_first5"]),
                "m2_lane_hit_rate": nullable_rate(group["m2_lane_hit"]),
                "avoid_saved": int(group["m2_avoid_saved"].fillna(0).sum()),
                "dominant_categories": top_categories(group),
            }
        )

    may31 = df[df["prediction_date"] == "2026-05-31"].copy()
    may31_rows = may31[
        [
            "game_title",
            "predicted_team",
            "m2_category_label",
            "m2_best_expression",
            "hit_full_game",
            "hit_first5",
            "phase_path_label",
            "actual_total",
            "reality_gap_score",
        ]
    ].to_dict("records")

    side_allowed = df[df["m2_category"].isin(["clean_phase_stack", "market_dog_pressure", "early_pressure_side", "late_rescue_side"])]
    side_avoid = df[df["m2_category"].isin(["dead_zone_side", "false_favorite_conversion_trap"])]
    timing_lane = df[df["m2_category"].isin(["starter_to_bullpen_flip", "early_pressure_side"])]

    return {
        "model_id": "MLB-M2",
        "range": {"start": start, "end": end},
        "rows": int(len(df)),
        "dates": int(df["prediction_date"].nunique()),
        "baseline": {
            "fg_hit_rate": nullable_rate(df["hit_full_game"]),
            "f5_hit_rate": nullable_rate(df["hit_first5"]),
            "first_inning_pick_hit_rate": nullable_rate(df["first_inning_hit"]),
            "full_total_pick_hit_rate": nullable_rate(df["full_total_hit"]),
            "first5_total_pick_hit_rate": nullable_rate(df["first5_total_hit"]),
        },
        "m2_experiments": {
            "side_allowed_rows": int(len(side_allowed)),
            "side_allowed_fg_hit_rate": nullable_rate(side_allowed["hit_full_game"]),
            "side_avoid_rows": int(len(side_avoid)),
            "side_avoid_saved_rate": nullable_rate(side_avoid["m2_avoid_saved"]),
            "timing_lane_rows": int(len(timing_lane)),
            "timing_lane_f5_hit_rate": nullable_rate(timing_lane["hit_first5"]),
            "category_lane_graded_rows": int(df["m2_lane_hit"].notna().sum()),
            "category_lane_hit_rate": nullable_rate(df["m2_lane_hit"]),
        },
        "categories": category_rows,
        "dates_summary": date_rows,
        "may31_focus": may31_rows,
        "coverage": {
            "summary_context_rows": int(df["summary_available"].sum()) if "summary_available" in df else 0,
            "phase_label_rows": int(df["phase_path_label"].notna().sum()) if "phase_path_label" in df else 0,
            "first_inning_rows": int(df["first_inning_hit"].notna().sum()) if "first_inning_hit" in df else 0,
            "full_total_rows": int(df["full_total_hit"].notna().sum()) if "full_total_hit" in df else 0,
            "first5_total_rows": int(df["first5_total_hit"].notna().sum()) if "first5_total_hit" in df else 0,
        },
        "rule_sweep_discoveries": run_rule_sweeps(df),
        "walk_forward_experiments": run_walk_forward_experiments(df),
    }


def run_rule_sweeps(df: pd.DataFrame) -> list[dict[str, Any]]:
    work = df.copy()
    work["high_total_shape_hit"] = pd.to_numeric(work["actual_total"], errors="coerce").ge(9).astype(float)
    work["low_total_shape_hit"] = pd.to_numeric(work["actual_total"], errors="coerce").le(7).astype(float)
    first_jolt = pd.to_numeric(work["first_inning_jolt_flag"], errors="coerce")
    work["nrfi_shape_hit"] = first_jolt.apply(lambda value: 1.0 if value == 0 else 0.0 if value == 1 else None)
    work["yrfi_shape_hit"] = first_jolt.apply(lambda value: 1.0 if value == 1 else 0.0 if value == 0 else None)

    lane_targets = {
        "FG side": "hit_full_game",
        "F5 side": "hit_first5",
        "High-total shape": "high_total_shape_hit",
        "Low-total shape": "low_total_shape_hit",
        "NRFI shape": "nrfi_shape_hit",
        "YRFI shape": "yrfi_shape_hit",
        "Model full total": "full_total_hit",
        "Model F5 total": "first5_total_hit",
    }
    baselines = {lane: nullable_rate(work[target]) for lane, target in lane_targets.items()}
    condition_builders = []
    threshold_columns = [
        ("reality_gap_score", [50, 55, 60, 65, 70], ">="),
        ("chaos_score", [55, 60, 65, 70], ">="),
        ("dead_early_score", [45, 50, 55, 60, 65], ">="),
        ("phase_split_score", [40, 48, 55, 62], ">="),
        ("bullpen_flip_score", [40, 48, 55, 62], ">="),
        ("starter_control_score", [55, 62, 68, 74], ">="),
        ("pick_lineup_conversion", [25, 32, 40, 48], "<="),
        ("pick_quiet_first5", [0.34, 0.42, 0.50, 0.58], ">="),
        ("pick_traffic_no_conversion", [0.12, 0.20, 0.28], ">="),
        ("lineup_gap", [6, 10, 16, 24], ">="),
        ("opponent_chaos_gap", [5, 10, 15], ">="),
        ("projected_hit_edge_for_pick", [0.5, 1.0, 1.8, 2.5], ">="),
    ]
    for column, thresholds, direction in threshold_columns:
        if column not in work:
            continue
        for threshold in thresholds:
            if direction == ">=":
                condition_builders.append((f"{column} >= {threshold}", work[column] >= threshold))
            else:
                condition_builders.append((f"{column} <= {threshold}", work[column] <= threshold))

    boolean_rules = [
        ("pick owns all major phases", work["pick_phase_count"] >= 3),
        ("pick owns F5 but not late+bridge", work["pick_owns_first5"] & ~(work["pick_owns_late"] & work["pick_owns_bridge"])),
        ("late edge without F5 edge", ~work["pick_owns_first5"] & (work["pick_owns_late"] | work["pick_owns_bridge"])),
        ("weather carry", work["weather_carry"].fillna(False).astype(bool)),
        ("hit edge against pick", pd.to_numeric(work["hit_edge_against_pick_flag"], errors="coerce").fillna(0).eq(1)),
        ("high model edge and high volatility", (work["model_edge"] >= 8) & (work["volatility"] >= 80)),
    ]
    condition_builders.extend(boolean_rules)

    discoveries = []
    for rule_label, mask in condition_builders:
        sample = work[mask.fillna(False)].copy()
        if len(sample) < 12:
            continue
        for lane, target in lane_targets.items():
            values = pd.to_numeric(sample[target], errors="coerce").dropna()
            if len(values) < 10:
                continue
            hit_rate = float(values.mean())
            baseline = baselines.get(lane)
            if baseline is None:
                continue
            discoveries.append(
                {
                    "rule": rule_label,
                    "lane": lane,
                    "rows": int(len(values)),
                    "hit_rate": round(hit_rate, 4),
                    "baseline": baseline,
                    "lift": round(hit_rate - baseline, 4),
                }
            )

    discoveries.sort(key=lambda row: (row["lift"], row["hit_rate"], row["rows"]), reverse=True)
    return discoveries[:18]


def run_walk_forward_experiments(df: pd.DataFrame) -> list[dict[str, Any]]:
    if RandomForestClassifier is None:
        return [{"name": "sklearn unavailable", "status": "skipped"}]

    feature_cols = [
        "confidence",
        "volatility",
        "model_edge",
        "starter_leverage_index",
        "late_inning_stability_index",
        "relief_pitching_risk",
        "coinflip_pressure",
        "pick_bullpen_score",
        "opp_bullpen_score",
        "pick_starter_score",
        "opp_starter_score",
        "projected_hit_edge_for_pick",
        "pick_chaos",
        "opp_chaos",
        "pick_run_cluster",
        "opp_run_cluster",
        "pick_scoreless_first3",
        "opp_scoreless_first3",
        "pick_dead_bat_traffic",
        "opp_dead_bat_traffic",
        "pick_lineup_conversion",
        "opp_lineup_conversion",
        "pick_quiet_first5",
        "opp_quiet_first5",
        "pick_traffic_no_conversion",
        "opp_traffic_no_conversion",
        "pick_bullpen_chaos",
        "opp_bullpen_chaos",
        "pick_first_inning_score_rate",
        "opp_first_inning_score_rate",
        "pick_first_inning_allow_rate",
        "opp_first_inning_allow_rate",
        "lineup_gap",
        "opponent_chaos_gap",
        "starter_gap",
        "bullpen_gap",
        "chaos_score",
        "dead_early_score",
        "phase_split_score",
        "bullpen_flip_score",
        "starter_control_score",
        "reality_gap_score",
        "pick_owns_full",
        "pick_owns_first5",
        "pick_owns_late",
        "pick_owns_bridge",
        "pick_phase_count",
        "distinct_phase_teams",
        "pick_phase_misses",
        "edge_hits",
        "first5_edge_hits",
        "late_edge_hits",
        "bridge_edge_score",
        "weather_carry",
    ]
    work = df.copy()
    work["high_total_game"] = pd.to_numeric(work["actual_total"], errors="coerce").ge(9).astype(float)
    work["first_inning_jolt_target"] = pd.to_numeric(work["first_inning_jolt_flag"], errors="coerce")
    for col in feature_cols:
        if col not in work:
            work[col] = 0
        if work[col].dtype == bool:
            work[col] = work[col].astype(int)
        else:
            work[col] = pd.to_numeric(work[col], errors="coerce")
    work[feature_cols] = work[feature_cols].replace([math.inf, -math.inf], pd.NA)
    work[feature_cols] = work[feature_cols].fillna(work[feature_cols].median(numeric_only=True)).fillna(0)

    experiments = [
        (
            "walk-forward RF lane chooser",
            lambda seed: RandomForestClassifier(
                n_estimators=220,
                max_depth=5,
                min_samples_leaf=8,
                random_state=seed,
                class_weight="balanced_subsample",
            ),
        ),
        (
            "walk-forward gradient lane chooser",
            lambda seed: GradientBoostingClassifier(
                n_estimators=90,
                learning_rate=0.045,
                max_depth=2,
                min_samples_leaf=8,
                random_state=seed,
            ),
        ),
        (
            "walk-forward logistic lane chooser",
            lambda seed: make_pipeline(
                StandardScaler(),
                LogisticRegression(max_iter=1000, class_weight="balanced", random_state=seed),
            ),
        ),
    ]
    results = []
    for name, model_factory in experiments:
        predictions: list[dict[str, Any]] = []
        for date in sorted(work["prediction_date"].dropna().unique()):
            train = work[work["prediction_date"] < date].copy()
            test = work[work["prediction_date"] == date].copy()
            if len(train) < 55 or test.empty:
                continue
            target_models = {}
            for target in ["hit_full_game", "hit_first5", "high_total_game", "first_inning_jolt_target"]:
                target_series = pd.to_numeric(train[target], errors="coerce")
                valid = target_series.notna()
                if valid.sum() < 35 or target_series[valid].nunique() < 2:
                    continue
                model = model_factory(42)
                model.fit(train.loc[valid, feature_cols], target_series.loc[valid].astype(int))
                target_models[target] = model
            if not {"hit_full_game", "hit_first5", "high_total_game"}.issubset(target_models):
                continue

            for index, row in test.iterrows():
                x = test.loc[[index], feature_cols]
                probs = {
                    target: positive_probability(model, x)
                    for target, model in target_models.items()
                }
                action, action_score = choose_walk_forward_action(probs)
                hit = grade_walk_forward_action(action, row)
                predictions.append(
                    {
                        "date": str(date),
                        "game": row.get("game_title"),
                        "pick": row.get("predicted_team"),
                        "action": action,
                        "score": round(action_score, 4),
                        "hit": hit,
                        "fg_prob": round(probs.get("hit_full_game", 0.0), 4),
                        "f5_prob": round(probs.get("hit_first5", 0.0), 4),
                        "high_total_prob": round(probs.get("high_total_game", 0.0), 4),
                        "yrfi_prob": round(probs.get("first_inning_jolt_target", 0.0), 4)
                        if "first_inning_jolt_target" in probs
                        else None,
                    }
                )
        result_df = pd.DataFrame(predictions)
        if result_df.empty:
            results.append({"name": name, "status": "no predictions"})
            continue
        action_df = result_df[result_df["action"] != "no_action"].copy()
        by_action = []
        for action, group in action_df.groupby("action"):
            by_action.append(
                {
                    "action": action,
                    "rows": int(len(group)),
                    "hit_rate": nullable_rate(group["hit"]),
                    "avg_score": round(float(group["score"].mean()), 4),
                }
            )
        results.append(
            {
                "name": name,
                "status": "ok",
                "graded_rows": int(result_df["hit"].notna().sum()),
                "action_rows": int(len(action_df)),
                "action_hit_rate": nullable_rate(action_df["hit"]) if not action_df.empty else None,
                "no_action_rows": int((result_df["action"] == "no_action").sum()),
                "by_action": sorted(by_action, key=lambda row: (-row["rows"], row["action"])),
            }
        )
    return results


def positive_probability(model: Any, frame: pd.DataFrame) -> float:
    if hasattr(model, "predict_proba"):
        probabilities = model.predict_proba(frame)
        classes = list(getattr(model, "classes_", []))
        if not classes and hasattr(model, "named_steps"):
            classifier = list(model.named_steps.values())[-1]
            classes = list(getattr(classifier, "classes_", []))
        if 1 in classes:
            return float(probabilities[0][classes.index(1)])
        return float(probabilities[0][-1])
    return float(model.predict(frame)[0])


def choose_walk_forward_action(probs: dict[str, float]) -> tuple[str, float]:
    fg = probs.get("hit_full_game", 0.5)
    f5 = probs.get("hit_first5", 0.5)
    high_total = probs.get("high_total_game", 0.5)
    yrfi = probs.get("first_inning_jolt_target")
    scores = {
        "fg_side": fg - 0.55,
        "f5_side": f5 - 0.55,
        "high_total_shape": high_total - 0.56,
        "avoid_ml": 0.50 - fg,
    }
    if yrfi is not None:
        scores["yrfi"] = yrfi - 0.58
        scores["nrfi"] = (1 - yrfi) - 0.60
    action, score = max(scores.items(), key=lambda item: item[1])
    if score <= 0.015:
        return "no_action", score
    return action, score


def grade_walk_forward_action(action: str, row: pd.Series) -> float | None:
    if action == "fg_side":
        return to_number(row.get("hit_full_game"))
    if action == "f5_side":
        return to_number(row.get("hit_first5"))
    if action == "avoid_ml":
        fg = to_number(row.get("hit_full_game"))
        return 1.0 if fg == 0 else 0.0
    if action == "high_total_shape":
        total = to_number(row.get("actual_total"))
        return 1.0 if total is not None and total >= 9 else 0.0
    if action == "yrfi":
        jolt = to_number(row.get("first_inning_jolt_flag"))
        return 1.0 if jolt == 1 else 0.0 if jolt == 0 else None
    if action == "nrfi":
        jolt = to_number(row.get("first_inning_jolt_flag"))
        return 1.0 if jolt == 0 else 0.0 if jolt == 1 else None
    return None


def nullable_rate(series: pd.Series) -> float | None:
    values = pd.to_numeric(series, errors="coerce").dropna()
    if values.empty:
        return None
    return round(float(values.mean()), 4)


def rate_label(value: float | None) -> str:
    if value is None:
        return "N/A"
    return f"{value * 100:.1f}%"


def top_categories(group: pd.DataFrame) -> str:
    counts = group["m2_category_label"].value_counts().head(3)
    return ", ".join(f"{label} {count}" for label, count in counts.items())


def render_report(summary: dict[str, Any]) -> str:
    baseline = summary["baseline"]
    experiments = summary["m2_experiments"]
    lines = [
        "# MLB-M2 Game-Shape Backtest",
        "",
        f"Range: {summary['range']['start']} to {summary['range']['end']}. Canonical settled side rows: {summary['rows']} across {summary['dates']} dates.",
        "",
        "M2 is not trying to make every side pick smarter by one point. It classifies the game into the market lane that best matches the expected inning shape.",
        "",
        "## Headline",
        "",
        markdown_table(
            ["Check", "Rows", "Result"],
            [
                ["Baseline full-game side", summary["rows"], rate_label(baseline["fg_hit_rate"])],
                ["Baseline first-five side", summary["rows"], rate_label(baseline["f5_hit_rate"])],
                ["M2 allowed-side bucket", experiments["side_allowed_rows"], rate_label(experiments["side_allowed_fg_hit_rate"])],
                ["M2 starter/timing F5 bucket", experiments["timing_lane_rows"], rate_label(experiments["timing_lane_f5_hit_rate"])],
                ["M2 category lane hit", experiments["category_lane_graded_rows"], rate_label(experiments["category_lane_hit_rate"])],
            ],
        ),
        "",
        "## Coverage",
        "",
        markdown_table(
            ["Artifact", "Rows"],
            [
                ["Published summary context", summary["coverage"]["summary_context_rows"]],
                ["Warehouse phase labels", summary["coverage"]["phase_label_rows"]],
                ["First-inning graded rows", summary["coverage"]["first_inning_rows"]],
                ["Full-game total graded rows", summary["coverage"]["full_total_rows"]],
                ["First-five total graded rows", summary["coverage"]["first5_total_rows"]],
            ],
        ),
        "",
        "## Category Backtest",
        "",
        markdown_table(
            ["Category", "Rows", "FG hit", "F5 hit", "Lane hit", "YRFI rate", "Avg runs"],
            [
                [
                    row["label"],
                    row["rows"],
                    rate_label(row["fg_hit_rate"]),
                    rate_label(row["f5_hit_rate"]),
                    rate_label(row["lane_hit_rate"]),
                    rate_label(row["first_inning_jolt_rate"]),
                    row["avg_total_runs"] if row["avg_total_runs"] is not None else "N/A",
                ]
                for row in summary["categories"]
            ],
        ),
        "",
        "## Day By Day",
        "",
        markdown_table(
            ["Date", "Rows", "FG", "F5", "M2 lane", "Avoid saved", "Main categories"],
            [
                [
                    row["date"],
                    row["rows"],
                    rate_label(row["fg_hit_rate"]),
                    rate_label(row["f5_hit_rate"]),
                    rate_label(row["m2_lane_hit_rate"]),
                    row["avoid_saved"],
                    row["dominant_categories"],
                ]
                for row in summary["dates_summary"]
            ],
        ),
        "",
        "## May 31 Stress Slate",
        "",
        markdown_table(
            ["Game", "Pick", "M2 category", "Best expression", "FG", "F5", "Actual path", "Runs", "Gap"],
            [
                [
                    row["game_title"],
                    row["predicted_team"],
                    row["m2_category_label"],
                    row["m2_best_expression"],
                    int(row["hit_full_game"]) if row["hit_full_game"] is not None else "N/A",
                    int(row["hit_first5"]) if row["hit_first5"] is not None else "N/A",
                    row["phase_path_label"] or "N/A",
                    row["actual_total"] if row["actual_total"] is not None else "N/A",
                    round1(row["reality_gap_score"]),
                ]
                for row in summary["may31_focus"]
            ],
        ),
        "",
        "## Interpretation",
        "",
        "- M2 should not publish one generic `risky` flag. The category decides the lane: side, F5, total, first inning, live-only, or no pregame ML.",
        "- Full-game downgrade labels are not automatic fades. The category has to name the replacement lane, usually F5, total, first inning, or live entry.",
        "- Crooked-inning and weather-carry labels are graded against high-run shape here, not sportsbook ROI. They need line-specific EV before promotion.",
        "- This is a draft proof layer. Promotion requires day-by-day settlement after it is wired into actual M2 run artifacts.",
        "",
    ]
    if summary.get("walk_forward_experiments"):
        lines[lines.index("## May 31 Stress Slate")] = "## Walk-Forward Crazy-Idea Models\n\n" + markdown_table(
            ["Experiment", "Rows", "Action rows", "Hit", "No-action", "Action detail"],
            [
                [
                    row.get("name"),
                    row.get("graded_rows", "-"),
                    row.get("action_rows", "-"),
                    rate_label(row.get("action_hit_rate")),
                    row.get("no_action_rows", "-"),
                    "; ".join(
                        f"{entry['action']} {entry['rows']} @ {rate_label(entry['hit_rate'])}"
                        for entry in row.get("by_action", [])[:4]
                    )
                    or row.get("status", ""),
                ]
                for row in summary["walk_forward_experiments"]
            ],
        ) + "\n\n## Rule Sweep Discoveries\n\n" + markdown_table(
            ["Rule", "Lane", "Rows", "Hit", "Base", "Lift"],
            [
                [
                    row["rule"],
                    row["lane"],
                    row["rows"],
                    rate_label(row["hit_rate"]),
                    rate_label(row["baseline"]),
                    f"{row['lift'] * 100:+.1f} pts",
                ]
                for row in summary.get("rule_sweep_discoveries", [])[:12]
            ],
        ) + "\n\n## May 31 Stress Slate"
    return "\n".join(lines)


def main() -> None:
    args = parse_args()
    warnings.filterwarnings("ignore", category=RuntimeWarning, module="sklearn")
    REPORT_DIR.mkdir(parents=True, exist_ok=True)
    PRIVATE_REPORT_DIR.mkdir(parents=True, exist_ok=True)
    markdown_out = Path(args.markdown_out) if args.markdown_out else REPORT_DIR / f"game-shape-backtest-{args.start}-to-{args.end}.md"
    json_out = Path(args.json_out) if args.json_out else PRIVATE_REPORT_DIR / f"mlb-m2-game-shape-backtest-{args.start}-to-{args.end}.json"

    conn = sqlite3.connect(args.db)
    conn.row_factory = sqlite3.Row
    raw = load_rows(conn, args.start, args.end)
    summary_context = load_summary_context(args.start, args.end)
    enriched = enrich_rows(raw, summary_context)
    summary = summarize(enriched, args.start, args.end)
    markdown = render_report(summary)

    markdown_out.write_text(markdown + "\n")
    json_out.write_text(json.dumps(summary, indent=2, sort_keys=True) + "\n")
    print(f"Wrote {markdown_out}")
    print(f"Wrote {json_out}")
    print(json.dumps(summary["m2_experiments"], indent=2, sort_keys=True))


if __name__ == "__main__":
    main()
