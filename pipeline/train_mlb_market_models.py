#!/usr/bin/env python3

from __future__ import annotations

import argparse
from bisect import bisect_left
import json
import math
import re
import sqlite3
from collections import defaultdict
from pathlib import Path
from typing import Any

import numpy as np
from sklearn.base import clone
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import HistGradientBoostingClassifier, RandomForestClassifier
from sklearn.feature_extraction import DictVectorizer
from sklearn.impute import SimpleImputer
from sklearn.metrics import accuracy_score, brier_score_loss, log_loss
from sklearn.pipeline import Pipeline


ROOT = Path(__file__).resolve().parents[1]
DB_PATH = ROOT / "data-private" / "warehouse" / "sports.db"
DEFAULT_CORPUS = ROOT / "data-private" / "models" / "mlb-training-corpus-2026-05-10-to-2026-05-25.json"
DEFAULT_REPORT_OUT = ROOT / "development-docs" / "mlb-market-ml-training-052526.md"
DEFAULT_ARTIFACT_OUT = ROOT / "data-private" / "predictions" / "mlb-market-fitness" / "2026-05-25-fitness.json"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Train MLB market fitness models from historical slate payloads.")
    parser.add_argument("--corpus", type=Path, default=DEFAULT_CORPUS)
    parser.add_argument("--report-out", type=Path, default=DEFAULT_REPORT_OUT)
    parser.add_argument("--artifact-out", type=Path, default=DEFAULT_ARTIFACT_OUT)
    parser.add_argument("--score-date", default="2026-05-25")
    parser.add_argument("--min-train-dates", type=int, default=5)
    parser.add_argument("--min-train-samples", type=int, default=40)
    return parser.parse_args()


def get_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def safe_float(value: Any) -> float | None:
    if value is None:
        return None
    if isinstance(value, bool):
        return float(value)
    if isinstance(value, (int, float)):
        if math.isnan(value) or math.isinf(value):
            return None
        return float(value)
    text = str(value).strip()
    if not text or text in {"N/A", "-", "None", "null"}:
        return None
    text = text.replace("%", "")
    if text.startswith(".") and text[1:].isdigit():
        text = f"0{text}"
    try:
        numeric = float(text)
    except ValueError:
        return None
    if math.isnan(numeric) or math.isinf(numeric):
        return None
    return numeric


def safe_int(value: Any) -> int | None:
    numeric = safe_float(value)
    return int(numeric) if numeric is not None else None


def winning_pct(value: Any) -> float | None:
    numeric = safe_float(value)
    if numeric is None:
        return None
    if numeric > 1:
        return numeric / 100.0
    return numeric


def parse_total_line(value: str | None) -> float | None:
    if not value:
        return None
    match = re.search(r"[ou]([0-9]+(?:\.[0-9]+)?)", value.lower())
    if match:
        return float(match.group(1))
    numbers = re.findall(r"([0-9]+(?:\.[0-9]+)?)", value)
    if numbers:
        return float(numbers[0])
    return None


def role_key(role: str | None) -> str:
    return "away" if str(role or "").lower().startswith("away") else "home"


def opposite_role(role: str | None) -> str:
    return "home" if role_key(role) == "away" else "away"


def feature_put(features: dict[str, Any], key: str, value: Any) -> None:
    if isinstance(value, str):
        features[key] = value
        return
    numeric = safe_float(value)
    if numeric is not None:
        features[key] = max(min(numeric, 1000.0), -1000.0)


def diff_feature(features: dict[str, Any], prefix: str, left: Any, right: Any) -> None:
    left_value = safe_float(left)
    right_value = safe_float(right)
    if left_value is not None:
        features[f"{prefix}_pick"] = left_value
    if right_value is not None:
        features[f"{prefix}_opp"] = right_value
    if left_value is not None and right_value is not None:
        features[f"{prefix}_gap"] = left_value - right_value


def parse_streak_code(value: str | None) -> tuple[float | None, float | None]:
    text = str(value or "").strip().upper()
    if not text:
        return None, None
    if len(text) < 2:
        return None, None
    direction = 1.0 if text[0] == "W" else (-1.0 if text[0] == "L" else 0.0)
    length = safe_float(text[1:])
    return direction, length


def load_corpus(path: Path) -> list[dict[str, Any]]:
    payload = json.loads(path.read_text(encoding="utf-8"))
    return payload.get("games", [])


def load_outcome_maps(conn: sqlite3.Connection) -> tuple[dict[int, sqlite3.Row], dict[tuple[str, str, str], list[sqlite3.Row]], dict[int, int]]:
    by_game_pk: dict[int, sqlite3.Row] = {}
    by_matchup: dict[tuple[str, str, str], list[sqlite3.Row]] = defaultdict(list)
    for row in conn.execute("SELECT * FROM mlb_game_outcomes").fetchall():
        by_game_pk[int(row["game_pk"])] = row
        by_matchup[(row["game_date"], row["away_team"], row["home_team"])].append(row)

    first_inning_runs: dict[int, int] = {}
    story_rows = conn.execute("SELECT game_pk, summary_json FROM mlb_game_story_signals").fetchall()
    for row in story_rows:
        try:
            summary = json.loads(row["summary_json"] or "{}")
        except json.JSONDecodeError:
            summary = {}
        first_inning_runs[int(row["game_pk"])] = int(summary.get("firstInningRuns") or 0)

    return by_game_pk, by_matchup, first_inning_runs


def load_team_profile_lookup(conn: sqlite3.Connection, table: str) -> dict[tuple[str, str], dict[str, Any]]:
    rows = conn.execute(f"SELECT * FROM {table}").fetchall()
    lookup: dict[tuple[str, str], dict[str, Any]] = {}
    for row in rows:
        lookup[(row["as_of_date"], row["team_name"])] = dict(row)
    return lookup


def load_pitcher_profile_lookup(conn: sqlite3.Connection, table: str) -> dict[tuple[str, str], dict[str, Any]]:
    rows = conn.execute(f"SELECT * FROM {table}").fetchall()
    lookup: dict[tuple[str, str], dict[str, Any]] = {}
    for row in rows:
        lookup[(row["as_of_date"], row["pitcher_name"])] = dict(row)
    return lookup


def build_profile_history(lookup: dict[tuple[str, str], dict[str, Any]]) -> dict[str, tuple[list[str], list[dict[str, Any]]]]:
    grouped: dict[str, list[tuple[str, dict[str, Any]]]] = defaultdict(list)
    for (as_of_date, entity_name), row in lookup.items():
        grouped[entity_name].append((as_of_date, row))
    history: dict[str, tuple[list[str], list[dict[str, Any]]]] = {}
    for entity_name, values in grouped.items():
        ordered = sorted(values, key=lambda item: item[0])
        history[entity_name] = ([item[0] for item in ordered], [item[1] for item in ordered])
    return history


def resolve_prior_profile(
    history: dict[str, tuple[list[str], list[dict[str, Any]]]],
    entity_name: str | None,
    as_of_date: str,
) -> dict[str, Any] | None:
    if not entity_name:
        return None
    values = history.get(entity_name)
    if not values:
        return None
    dates, rows = values
    index = bisect_left(dates, as_of_date) - 1
    if index < 0:
        return None
    return rows[index]


def load_starting_pitchers_by_game(conn: sqlite3.Connection) -> dict[int, dict[str, dict[str, Any]]]:
    rows = conn.execute("SELECT * FROM mlb_starting_pitchers").fetchall()
    lookup: dict[int, dict[str, dict[str, Any]]] = defaultdict(dict)
    for row in rows:
        lookup[int(row["game_pk"])][role_key(row["team_role"])] = dict(row)
    return lookup


def resolve_outcome(
    record: dict[str, Any],
    by_game_pk: dict[int, sqlite3.Row],
    by_matchup: dict[tuple[str, str, str], list[sqlite3.Row]],
) -> sqlite3.Row | None:
    game_pk = safe_int(record.get("gamePk"))
    if game_pk is not None and game_pk in by_game_pk:
        return by_game_pk[game_pk]
    matchup_rows = by_matchup.get((record["date"], record["awayTeam"], record["homeTeam"]), [])
    if len(matchup_rows) == 1:
        return matchup_rows[0]
    return None


def participant_probabilities(record: dict[str, Any]) -> tuple[dict[str, float | None], dict[str, int | None]]:
    probability_by_role: dict[str, float | None] = {"away": None, "home": None}
    odds_by_role: dict[str, int | None] = {"away": None, "home": None}
    for participant in record.get("participants") or []:
        role = role_key(participant.get("role"))
        probability_by_role[role] = safe_float(participant.get("impliedProbability"))
        odds_by_role[role] = safe_int(participant.get("americanOdds"))
    return probability_by_role, odds_by_role


def extract_team_name(record: dict[str, Any], role: str) -> str:
    return record["awayTeam"] if role == "away" else record["homeTeam"]


def extract_context_role_block(context: dict[str, Any] | None, role: str) -> dict[str, Any] | None:
    if not context:
        return None
    value = context.get(role)
    return value if isinstance(value, dict) else None


def starter_feature_set(starter: dict[str, Any] | None) -> dict[str, float]:
    if not starter:
        return {}
    innings = safe_float(starter.get("inningsPitched"))
    strikeouts = safe_float(starter.get("strikeOuts"))
    walks = safe_float(starter.get("walks"))
    hits_allowed = safe_float(starter.get("hitsAllowed"))
    home_runs_allowed = safe_float(starter.get("homeRunsAllowed"))
    features: dict[str, float] = {}
    if innings is not None:
        features["innings"] = innings
    if strikeouts is not None:
        features["strikeouts"] = strikeouts
        if innings and innings > 0:
            features["k_per_9"] = strikeouts / innings * 9
    if walks is not None and innings and innings > 0:
        features["bb_per_9"] = walks / innings * 9
    if hits_allowed is not None and innings and innings > 0:
        features["hits_per_9"] = hits_allowed / innings * 9
    if home_runs_allowed is not None and innings and innings > 0:
        features["hr_per_9"] = home_runs_allowed / innings * 9
    for key in ("wins", "losses", "era", "whip"):
        numeric = safe_float(starter.get(key))
        if numeric is not None:
            features[key] = numeric
    handedness = str(starter.get("pitchHand") or "").upper()
    features["hand_l"] = 1.0 if handedness.startswith("L") else 0.0
    features["hand_r"] = 1.0 if handedness.startswith("R") else 0.0
    return features


def build_raw_side_features(
    record: dict[str, Any],
    pick_role: str,
    team_profiles: dict[str, dict[tuple[str, str], dict[str, Any]]],
    pitcher_profiles: dict[str, dict[tuple[str, str], dict[str, Any]]],
) -> dict[str, Any]:
    opp_role = opposite_role(pick_role)
    pick_team = extract_team_name(record, pick_role)
    opp_team = extract_team_name(record, opp_role)
    probabilities, american_odds = participant_probabilities(record)
    features: dict[str, Any] = {
        "pick_role": pick_role,
        "home_pick_flag": 1.0 if pick_role == "home" else 0.0,
    }

    feature_put(features, "market_probability_pick", probabilities.get(pick_role))
    feature_put(features, "market_probability_opp", probabilities.get(opp_role))
    if probabilities.get(pick_role) is not None and probabilities.get(opp_role) is not None:
        features["market_probability_gap"] = probabilities[pick_role] - probabilities[opp_role]
        features["pick_is_market_favorite"] = 1.0 if probabilities[pick_role] >= probabilities[opp_role] else 0.0
    feature_put(features, "american_odds_pick", american_odds.get(pick_role))
    feature_put(features, "american_odds_opp", american_odds.get(opp_role))

    park_context = record.get("parkContext") or {}
    for key in ("indexHr", "indexRuns", "indexWoba"):
        feature_put(features, f"park_{key}", park_context.get(key))

    team_context = record.get("teamContext") or {}
    for role, prefix in ((pick_role, "pick_team_ctx"), (opp_role, "opp_team_ctx")):
        block = extract_context_role_block(team_context, role) or {}
        feature_put(features, f"{prefix}_wins", block.get("wins"))
        feature_put(features, f"{prefix}_losses", block.get("losses"))
        feature_put(features, f"{prefix}_run_diff", block.get("runDifferential"))
        feature_put(features, f"{prefix}_games_back", safe_float(block.get("gamesBack")))
        feature_put(features, f"{prefix}_win_pct", winning_pct(block.get("winningPercentage")))
        streak_direction, streak_length = parse_streak_code(block.get("streakCode"))
        feature_put(features, f"{prefix}_streak_direction", streak_direction)
        feature_put(features, f"{prefix}_streak_length", streak_length)
        features[f"{prefix}_division_leader"] = 1.0 if block.get("divisionLeader") else 0.0
    diff_feature(
        features,
        "team_ctx_run_diff",
        (extract_context_role_block(team_context, pick_role) or {}).get("runDifferential"),
        (extract_context_role_block(team_context, opp_role) or {}).get("runDifferential"),
    )

    for context_name in ("offenseContext", "bullpenContext", "savantContext"):
        context = record.get(context_name) or {}
        for key in set((extract_context_role_block(context, "away") or {}).keys()) | set((extract_context_role_block(context, "home") or {}).keys()):
            if isinstance((extract_context_role_block(context, pick_role) or {}).get(key), (dict, list)):
                continue
            diff_feature(
                features,
                f"{context_name}_{key}",
                (extract_context_role_block(context, pick_role) or {}).get(key),
                (extract_context_role_block(context, opp_role) or {}).get(key),
            )

    lineup_context = record.get("lineupContext") or {}
    pick_lineup = lineup_context.get(pick_team) or lineup_context.get(pick_team.split()[-1])
    opp_lineup = lineup_context.get(opp_team) or lineup_context.get(opp_team.split()[-1])
    for key in (
        "averageMatchupGrade",
        "starterThreatCount",
        "contactCount",
        "powerCount",
        "platoonCount",
        "pitchTypeEdgeCount",
        "platoonPressureIndex",
        "pitchTypePressureIndex",
        "bullpenPitchTypePressureIndex",
        "starterPressureIndex",
        "overallPressureIndex",
        "topThirdScore",
        "depthScore",
    ):
        diff_feature(features, f"lineup_{key}", (pick_lineup or {}).get(key), (opp_lineup or {}).get(key))

    state_context = record.get("stateContext") or {}
    raw_state_groups = {
        "teamState": extract_context_role_block(state_context.get("teamState"), pick_role),
        "oppTeamState": extract_context_role_block(state_context.get("teamState"), opp_role),
        "teamMistakeShape": extract_context_role_block(state_context.get("teamMistakeShape"), pick_role),
        "oppTeamMistakeShape": extract_context_role_block(state_context.get("teamMistakeShape"), opp_role),
        "lineupConversion": extract_context_role_block(state_context.get("lineupConversion"), pick_role),
        "oppLineupConversion": extract_context_role_block(state_context.get("lineupConversion"), opp_role),
        "bullpenMistake": extract_context_role_block(state_context.get("bullpenMistake"), pick_role),
        "oppBullpenMistake": extract_context_role_block(state_context.get("bullpenMistake"), opp_role),
    }
    for group_name, block in raw_state_groups.items():
        if not isinstance(block, dict):
            continue
        for key, value in block.items():
            if key in {"scheduledOpponent", "previousResult", "streakDirection"}:
                continue
            feature_put(features, f"{group_name}_{key}", value)

    series_phase = state_context.get("seriesEarlyPhase") or {}
    for key, value in series_phase.items():
        feature_put(features, f"series_{key}", value)

    for lookup_name, lookup in team_profiles.items():
        pick_row = lookup.get((record["date"], pick_team))
        opp_row = lookup.get((record["date"], opp_team))
        keys = set((pick_row or {}).keys()) | set((opp_row or {}).keys())
        for key in keys:
            if key in {"as_of_date", "team_name"}:
                continue
            diff_feature(features, f"{lookup_name}_{key}", (pick_row or {}).get(key), (opp_row or {}).get(key))

    starter_context = record.get("starterContext") or {}
    pick_starter = starter_context.get(pick_role) or {}
    opp_starter = starter_context.get(opp_role) or {}
    for name, value in starter_feature_set(pick_starter).items():
        feature_put(features, f"pick_starter_{name}", value)
    for name, value in starter_feature_set(opp_starter).items():
        feature_put(features, f"opp_starter_{name}", value)
    for name in set(starter_feature_set(pick_starter).keys()) | set(starter_feature_set(opp_starter).keys()):
        diff_feature(
            features,
            f"starter_{name}",
            starter_feature_set(pick_starter).get(name),
            starter_feature_set(opp_starter).get(name),
        )

    pick_starter_name = pick_starter.get("fullName")
    opp_starter_name = opp_starter.get("fullName")
    for lookup_name, lookup in pitcher_profiles.items():
        pick_row = lookup.get((record["date"], pick_starter_name)) if pick_starter_name else None
        opp_row = lookup.get((record["date"], opp_starter_name)) if opp_starter_name else None
        keys = set((pick_row or {}).keys()) | set((opp_row or {}).keys())
        for key in keys:
            if key in {"as_of_date", "pitcher_id", "pitcher_name", "team_name", "scheduled_opponent"}:
                continue
            diff_feature(features, f"{lookup_name}_{key}", (pick_row or {}).get(key), (opp_row or {}).get(key))

    return features


def flatten_first_inning_team(entry: dict[str, Any] | None, prefix: str, features: dict[str, Any]) -> None:
    if not entry:
        return
    for key, value in entry.items():
        if key in {"scheduledOpponent"}:
            continue
        feature_put(features, f"{prefix}_{key}", value)


def flatten_numeric_dict(entry: dict[str, Any] | None, prefix: str, features: dict[str, Any], exclude: set[str] | None = None) -> None:
    if not entry:
        return
    excluded = exclude or set()
    for key, value in entry.items():
        if key in excluded:
            continue
        feature_put(features, f"{prefix}_{key}", value)


def build_moneyline_features(record: dict[str, Any]) -> tuple[dict[str, Any], str]:
    analysis = record.get("analysis") or {}
    indicators = analysis.get("indicators") or {}
    pick_role = role_key(analysis.get("participantRole"))
    opp_role = opposite_role(pick_role)

    probabilities, american_odds = participant_probabilities(record)
    features: dict[str, Any] = {
        "pick_role": pick_role,
        "tier": analysis.get("tier") or "Unknown",
    }
    for key in ("confidence", "volatility", "recommendationScore", "modelEdge", "marketProbability"):
        feature_put(features, key.lower(), analysis.get(key))

    feature_put(features, "market_probability_pick", probabilities.get(pick_role))
    feature_put(features, "market_probability_opp", probabilities.get(opp_role))
    if probabilities.get(pick_role) is not None and probabilities.get(opp_role) is not None:
        features["market_probability_gap"] = probabilities[pick_role] - probabilities[opp_role]
    feature_put(features, "american_odds_pick", american_odds.get(pick_role))
    feature_put(features, "american_odds_opp", american_odds.get(opp_role))

    indicator_pairs = [
        ("starter_leverage", "starterLeverageIndex"),
        ("late_inning_stability", "lateInningStabilityIndex"),
        ("relief_pitching_risk", "reliefPitchingRisk"),
        ("coinflip_pressure", "coinflipPressure"),
        ("pick_bullpen_score", "pickBullpenScore"),
        ("opp_bullpen_score", "oppBullpenScore"),
        ("pick_starter_score", "pickStarterScore"),
        ("opp_starter_score", "oppStarterScore"),
        ("projected_hit_edge", "projectedHitEdgeForPick"),
        ("market_price_gap", "marketPriceGap"),
        ("reliever_command_gap", "relieverCommandGap"),
        ("pick_snapback_pressure", "pickSnapbackPressure"),
        ("opp_snapback_pressure", "oppSnapbackPressure"),
        ("pick_heat_regression", "pickHeatRegression"),
        ("opp_heat_regression", "oppHeatRegression"),
        ("pick_form_pressure", "pickFormPressure"),
        ("opp_form_pressure", "oppFormPressure"),
        ("pick_top6_pressure", "pickTop6Pressure"),
        ("opp_top6_pressure", "oppTop6Pressure"),
        ("pick_top6_cold", "pickTop6Cold"),
        ("opp_top6_cold", "oppTop6Cold"),
        ("pick_top6_heat", "pickTop6Heat"),
        ("opp_top6_heat", "oppTop6Heat"),
        ("pick_team_mistake_chaos", "pickTeamMistakeChaos"),
        ("opp_team_mistake_chaos", "oppTeamMistakeChaos"),
        ("pick_team_run_clustering", "pickTeamRunClustering"),
        ("opp_team_run_clustering", "oppTeamRunClustering"),
        ("pick_team_scoreless_first3", "pickTeamScorelessFirst3Rate"),
        ("opp_team_scoreless_first3", "oppTeamScorelessFirst3Rate"),
        ("pick_lineup_conversion", "pickLineupConversionIndex"),
        ("opp_lineup_conversion", "oppLineupConversionIndex"),
        ("pick_dead_bat_traffic", "pickDeadBatTrafficRate"),
        ("opp_dead_bat_traffic", "oppDeadBatTrafficRate"),
        ("pick_traffic_no_conversion", "pickTrafficNoConversionRate"),
        ("opp_traffic_no_conversion", "oppTrafficNoConversionRate"),
        ("pick_quiet_first5", "pickQuietFirst5Rate"),
        ("opp_quiet_first5", "oppQuietFirst5Rate"),
        ("pick_bullpen_mistake_chaos", "pickBullpenMistakeChaos"),
        ("opp_bullpen_mistake_chaos", "oppBullpenMistakeChaos"),
        ("pick_reliever_command_risk", "pickRelieverCommandRisk"),
        ("opp_reliever_command_risk", "oppRelieverCommandRisk"),
        ("pick_third_time_penalty", "pickThirdTimePenalty"),
        ("opp_third_time_penalty", "oppThirdTimePenalty"),
        ("pick_state_series_game_number", "pickStateSeriesGameNumber"),
        ("opp_state_series_game_number", "oppStateSeriesGameNumber"),
        ("research_only_veto_count", "researchOnlyVetoFlagCount"),
    ]
    for feature_name, indicator_key in indicator_pairs:
        feature_put(features, feature_name, indicators.get(indicator_key))

    diff_feature(features, "bullpen_score", indicators.get("pickBullpenScore"), indicators.get("oppBullpenScore"))
    diff_feature(features, "starter_score", indicators.get("pickStarterScore"), indicators.get("oppStarterScore"))
    diff_feature(features, "snapback_pressure", indicators.get("pickSnapbackPressure"), indicators.get("oppSnapbackPressure"))
    diff_feature(features, "heat_regression", indicators.get("pickHeatRegression"), indicators.get("oppHeatRegression"))
    diff_feature(features, "form_pressure", indicators.get("pickFormPressure"), indicators.get("oppFormPressure"))
    diff_feature(features, "top6_pressure", indicators.get("pickTop6Pressure"), indicators.get("oppTop6Pressure"))
    diff_feature(features, "top6_cold", indicators.get("pickTop6Cold"), indicators.get("oppTop6Cold"))
    diff_feature(features, "top6_heat", indicators.get("pickTop6Heat"), indicators.get("oppTop6Heat"))
    diff_feature(features, "mistake_chaos", indicators.get("pickTeamMistakeChaos"), indicators.get("oppTeamMistakeChaos"))
    diff_feature(features, "lineup_conversion", indicators.get("pickLineupConversionIndex"), indicators.get("oppLineupConversionIndex"))
    diff_feature(features, "bullpen_chaos", indicators.get("pickBullpenMistakeChaos"), indicators.get("oppBullpenMistakeChaos"))

    for bool_key in (
        "hitEdgeAgainstPick",
        "pickIsMarketFavorite",
        "pickIsMarketUnderdog",
        "tierOnePassFlag",
        "statefulOpponentSnapbackTrapFlag",
        "statefulHeatRegressionTrapFlag",
        "statefulTopOrderPressureTrapFlag",
        "statefulSeriesCarryoverTrapFlag",
        "tierThreeBullpenCommandMismatchFlag",
        "heavyFavoriteWeakLineupFlag",
        "heavyFavoriteNoisyBullpenFlag",
        "deadEarlyRiskFlag",
        "clusterBullpenTrapFlag",
        "protectedMarketDogFlag",
        "marketDogOpponentChaosGapFlag",
        "efficientFavoriteCandidateFlag",
    ):
        features[bool_key] = 1.0 if indicators.get(bool_key) else 0.0

    for score_name, score_values in starter_feature_set((record.get("starterContext") or {}).get(pick_role)).items():
        feature_put(features, f"pick_starter_{score_name}", score_values)
    for score_name, score_values in starter_feature_set((record.get("starterContext") or {}).get(opp_role)).items():
        feature_put(features, f"opp_starter_{score_name}", score_values)

    lineup_context = record.get("lineupContext") or {}
    away_lineup = lineup_context.get(record["awayTeam"].split()[-1]) or lineup_context.get(record["awayTeam"]) or lineup_context.get("away")
    home_lineup = lineup_context.get(record["homeTeam"].split()[-1]) or lineup_context.get(record["homeTeam"]) or lineup_context.get("home")
    pick_lineup = away_lineup if pick_role == "away" else home_lineup
    opp_lineup = home_lineup if pick_role == "away" else away_lineup
    for key in (
        "averageMatchupGrade",
        "starterThreatCount",
        "contactCount",
        "powerCount",
        "platoonCount",
        "pitchTypeEdgeCount",
        "platoonPressureIndex",
        "pitchTypePressureIndex",
        "bullpenPitchTypePressureIndex",
        "starterPressureIndex",
        "overallPressureIndex",
        "topThirdScore",
        "depthScore",
    ):
        diff_feature(features, f"lineup_{key}", (pick_lineup or {}).get(key), (opp_lineup or {}).get(key))

    return features, pick_role


def build_first_inning_features(record: dict[str, Any]) -> dict[str, Any] | None:
    projection = ((record.get("analysis") or {}).get("mlbProjection") or {}).get("firstInning") or {}
    if not projection:
        return None

    features: dict[str, Any] = {}
    for key in (
        "yesProbabilityPct",
        "noProbabilityPct",
        "awayRunProbabilityPct",
        "homeRunProbabilityPct",
        "awayTeamScoredRatePct",
        "homeTeamScoredRatePct",
        "awayOppPitcherAllowedRatePct",
        "homeOppPitcherAllowedRatePct",
        "awayProjectedRuns",
        "homeProjectedRuns",
        "projectedRuns",
        "edge",
        "line",
    ):
        feature_put(features, key, projection.get(key))

    features["strength"] = projection.get("strength") or "Unknown"

    state_context = record.get("stateContext") or {}
    fi_team = state_context.get("firstInningTeam") or {}
    fi_pitcher = state_context.get("firstInningPitcher") or {}
    fi_pitcher_season = state_context.get("firstInningPitcherSeason") or {}
    series_phase = state_context.get("seriesEarlyPhase") or {}
    team_state = state_context.get("teamState") or {}
    team_mistake = state_context.get("teamMistakeShape") or {}
    lineup_conversion = state_context.get("lineupConversion") or {}

    for role in ("away", "home"):
        flatten_first_inning_team(fi_team.get(role), f"{role}_fi_team", features)
        flatten_numeric_dict(fi_pitcher.get(role), f"{role}_fi_pitcher", features, exclude={"pitcherName", "teamName", "scheduledOpponent"})
        flatten_numeric_dict(fi_pitcher_season.get(role), f"{role}_fi_pitcher_season", features, exclude={"pitcherName", "teamName"})
        flatten_numeric_dict(team_state.get(role), f"{role}_team_state", features, exclude={"scheduledOpponent", "previousResult", "streakDirection"})
        flatten_numeric_dict(team_mistake.get(role), f"{role}_mistake_shape", features, exclude={"scheduledOpponent"})
        flatten_numeric_dict(lineup_conversion.get(role), f"{role}_lineup_conversion", features, exclude={"scheduledOpponent"})

    flatten_numeric_dict(series_phase, "series_early", features)

    lineup_context = record.get("lineupContext") or {}
    away_key = next(iter(lineup_context.keys()), None)
    away_lineup = None
    home_lineup = None
    if len(lineup_context) == 2:
        values = list(lineup_context.values())
        away_lineup, home_lineup = values[0], values[1]
    for role, lineup in (("away", away_lineup), ("home", home_lineup)):
        flatten_numeric_dict(
            lineup,
            f"{role}_lineup",
            features,
            exclude={"trackedBatters", "bullpenOverperformHitters"},
        )

    return features


def build_totals_features(record: dict[str, Any], line: float) -> dict[str, Any]:
    projection = ((record.get("analysis") or {}).get("mlbProjection") or {})
    totals = projection.get("totals") or {}
    full = totals.get("fullGame") or {}
    weather = projection.get("weather") or {}
    features: dict[str, Any] = {
        "full_total_line": line,
        "totals_strength": full.get("strength") or "Unknown",
        "totals_lean": full.get("lean") or "Pass",
    }
    for key in ("projectedFullTotalRuns", "projectedFirst5TotalRuns", "projectedLateTotalRuns", "postedTotal"):
        feature_put(features, key, projection.get(key))
    projected_full = safe_float(projection.get("projectedFullTotalRuns"))
    if projected_full is not None:
        features["projected_minus_line"] = projected_full - line
    for key in ("temperatureF", "windMph", "precipitationPct", "hitBoostFirst5", "hitBoostLate", "runBoostFirst5", "runBoostLate", "volatilityDelta"):
        feature_put(features, f"weather_{key}", weather.get(key))

    indicators = (record.get("analysis") or {}).get("indicators") or {}
    for key in (
        "reliefPitchingRisk",
        "coinflipPressure",
        "starterLeverageIndex",
        "lateInningStabilityIndex",
        "pickTeamMistakeChaos",
        "oppTeamMistakeChaos",
        "pickBullpenMistakeChaos",
        "oppBullpenMistakeChaos",
        "pickLineupConversionIndex",
        "oppLineupConversionIndex",
        "pickQuietFirst5Rate",
        "oppQuietFirst5Rate",
    ):
        feature_put(features, key, indicators.get(key))
    return features


def market_model_builders() -> dict[str, Pipeline]:
    forest = Pipeline(
        [
            ("vectorize", DictVectorizer(sparse=False)),
            ("impute", SimpleImputer(strategy="median")),
            (
                "model",
                RandomForestClassifier(
                    n_estimators=400,
                    max_depth=6,
                    min_samples_leaf=4,
                    random_state=7,
                ),
            ),
        ]
    )
    gradient = Pipeline(
        [
            ("vectorize", DictVectorizer(sparse=False)),
            ("impute", SimpleImputer(strategy="median")),
            (
                "model",
                HistGradientBoostingClassifier(
                    learning_rate=0.04,
                    max_depth=3,
                    max_iter=250,
                    min_samples_leaf=10,
                    random_state=7,
                ),
            ),
        ]
    )
    return {"forest": forest, "hist_gb": gradient}


def walk_forward_predictions(
    samples: list[dict[str, Any]],
    *,
    min_train_dates: int,
    min_train_samples: int,
) -> dict[str, Any]:
    by_date: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for sample in samples:
        by_date[sample["date"]].append(sample)
    ordered_dates = sorted(by_date)
    builders = market_model_builders()
    candidate_records: dict[str, list[dict[str, Any]]] = {key: [] for key in builders}

    for date_index, test_date in enumerate(ordered_dates):
        train_dates = ordered_dates[:date_index]
        if len(train_dates) < min_train_dates:
            continue
        train_samples = [sample for date in train_dates for sample in by_date[date]]
        test_samples = by_date[test_date]
        if len(train_samples) < min_train_samples or not test_samples:
            continue
        X_train = [sample["features"] for sample in train_samples]
        y_train = [sample["target"] for sample in train_samples]
        X_test = [sample["features"] for sample in test_samples]
        y_test = [sample["target"] for sample in test_samples]
        for name, builder in builders.items():
            model = clone(builder)
            model.fit(X_train, y_train)
            probabilities = model.predict_proba(X_test)[:, 1]
            for sample, actual, probability in zip(test_samples, y_test, probabilities):
                candidate_records[name].append(
                    {
                        "date": sample["date"],
                        "matchup": sample["matchup"],
                        "target": int(actual),
                        "probability": float(probability),
                        "meta": sample["meta"],
                    }
                )

    evaluations = {}
    for name, records in candidate_records.items():
        if not records:
            continue
        y_true = [record["target"] for record in records]
        y_prob = [record["probability"] for record in records]
        evaluations[name] = {
            "records": records,
            "log_loss": float(log_loss(y_true, y_prob, labels=[0, 1])),
            "brier": float(brier_score_loss(y_true, y_prob)),
            "accuracy": float(accuracy_score(y_true, [1 if value >= 0.5 else 0 for value in y_prob])),
            "sample_size": len(records),
        }

    if not evaluations:
        return {"best_model": None, "evaluations": {}, "records": []}

    best_name = min(evaluations, key=lambda key: (evaluations[key]["log_loss"], evaluations[key]["brier"]))
    return {"best_model": best_name, "evaluations": evaluations, "records": evaluations[best_name]["records"]}


def choose_single_side_threshold(records: list[dict[str, Any]]) -> dict[str, Any]:
    min_plays = max(12, int(len(records) * 0.15))
    best = None
    for raw_threshold in range(55, 86):
        threshold = raw_threshold / 100.0
        played = [record for record in records if record["probability"] >= threshold]
        if len(played) < min_plays:
            continue
        hits = sum(record["target"] for record in played)
        losses = len(played) - hits
        accuracy = hits / len(played)
        utility = hits - (losses * 1.5)
        candidate = {
            "threshold": threshold,
            "plays": len(played),
            "hits": hits,
            "losses": losses,
            "accuracy": accuracy,
            "utility": utility,
        }
        if best is None or (candidate["utility"], candidate["accuracy"], candidate["plays"]) > (
            best["utility"],
            best["accuracy"],
            best["plays"],
        ):
            best = candidate
    if best is None:
        best = {"threshold": 0.6, "plays": 0, "hits": 0, "losses": 0, "accuracy": 0.0, "utility": 0.0}
    return best


def choose_two_sided_threshold(records: list[dict[str, Any]]) -> dict[str, Any]:
    min_plays = max(15, int(len(records) * 0.2))
    best = None
    for raw_threshold in range(53, 81):
        threshold = raw_threshold / 100.0
        plays = []
        for record in records:
            probability = record["probability"]
            if probability >= threshold:
                plays.append((record, 1))
            elif probability <= 1 - threshold:
                plays.append((record, 0))
        if len(plays) < min_plays:
            continue
        hits = sum(1 for record, predicted in plays if predicted == record["target"])
        losses = len(plays) - hits
        accuracy = hits / len(plays)
        utility = hits - (losses * 1.5)
        candidate = {
            "threshold": threshold,
            "plays": len(plays),
            "hits": hits,
            "losses": losses,
            "accuracy": accuracy,
            "utility": utility,
        }
        if best is None or (candidate["utility"], candidate["accuracy"], candidate["plays"]) > (
            best["utility"],
            best["accuracy"],
            best["plays"],
        ):
            best = candidate
    if best is None:
        best = {"threshold": 0.58, "plays": 0, "hits": 0, "losses": 0, "accuracy": 0.0, "utility": 0.0}
    return best


def fit_final_model(samples: list[dict[str, Any]], model_name: str, cutoff_date: str) -> Pipeline | None:
    eligible = [sample for sample in samples if sample["date"] < cutoff_date]
    if not eligible:
        return None
    builders = market_model_builders()
    model = clone(builders[model_name])
    model.fit([sample["features"] for sample in eligible], [sample["target"] for sample in eligible])
    return model


def build_samples(
    corpus_rows: list[dict[str, Any]],
    outcome_rows_by_game_pk: dict[int, sqlite3.Row],
    outcome_rows_by_matchup: dict[tuple[str, str, str], list[sqlite3.Row]],
    first_inning_runs_by_game_pk: dict[int, int],
    team_profiles: dict[str, dict[tuple[str, str], dict[str, Any]]],
    pitcher_profiles: dict[str, dict[tuple[str, str], dict[str, Any]]],
) -> dict[str, list[dict[str, Any]]]:
    samples: dict[str, list[dict[str, Any]]] = {"moneyline": [], "first5": [], "firstInning": [], "totals": []}

    for record in corpus_rows:
        analysis = record.get("analysis") or {}
        if not analysis:
            continue
        outcome = resolve_outcome(record, outcome_rows_by_game_pk, outcome_rows_by_matchup)
        if outcome is None:
            continue

        total_line = parse_total_line(record.get("totalMarket")) or safe_float(((analysis.get("mlbProjection") or {}).get("postedTotal")))
        projected_totals = (analysis.get("mlbProjection") or {}).get("totals") or {}
        full_total = projected_totals.get("fullGame") or {}
        if total_line is not None:
            actual_total = safe_float(outcome["total_runs_final"])
            if actual_total is not None and actual_total != total_line:
                totals_target = int(actual_total > total_line)
                samples["totals"].append(
                    {
                        "date": record["date"],
                        "matchup": record["title"],
                        "features": build_totals_features(record, total_line),
                        "target": totals_target,
                        "meta": {"line": total_line, "title": record["title"], "analysis": analysis},
                    }
                )

        first_inning_features = build_first_inning_features(record)
        if first_inning_features:
            game_pk = safe_int(outcome["game_pk"])
            if game_pk is not None and game_pk in first_inning_runs_by_game_pk:
                samples["firstInning"].append(
                    {
                        "date": record["date"],
                        "matchup": record["title"],
                        "features": first_inning_features,
                        "target": int(first_inning_runs_by_game_pk[game_pk] > 0),
                        "meta": {"title": record["title"], "analysis": analysis},
                    }
                )

    return samples


def build_warehouse_side_features(
    game: sqlite3.Row,
    starters_by_game: dict[int, dict[str, dict[str, Any]]],
    pick_role: str,
    team_profiles: dict[str, dict[tuple[str, str], dict[str, Any]]],
    pitcher_profiles: dict[str, dict[tuple[str, str], dict[str, Any]]],
    team_profile_history: dict[str, dict[str, tuple[list[str], list[dict[str, Any]]]]],
    pitcher_profile_history: dict[str, dict[str, tuple[list[str], list[dict[str, Any]]]]],
) -> dict[str, Any]:
    opp_role = opposite_role(pick_role)
    pick_team = game["away_team"] if pick_role == "away" else game["home_team"]
    opp_team = game["home_team"] if pick_role == "away" else game["away_team"]
    as_of_date = game["game_date"]
    features: dict[str, Any] = {
        "pick_role": pick_role,
        "home_pick_flag": 1.0 if pick_role == "home" else 0.0,
    }

    for lookup_name, lookup in team_profiles.items():
        pick_row = resolve_prior_profile(team_profile_history[lookup_name], pick_team, as_of_date)
        opp_row = resolve_prior_profile(team_profile_history[lookup_name], opp_team, as_of_date)
        keys = set((pick_row or {}).keys()) | set((opp_row or {}).keys())
        for key in keys:
            if key in {"as_of_date", "team_name"}:
                continue
            diff_feature(features, f"{lookup_name}_{key}", (pick_row or {}).get(key), (opp_row or {}).get(key))

    starters = starters_by_game.get(int(game["game_pk"])) or {}
    pick_starter = starters.get(pick_role) or {}
    opp_starter = starters.get(opp_role) or {}
    pick_starter_seed = {
        "pitchHand": pick_starter.get("pitch_hand"),
    }
    opp_starter_seed = {
        "pitchHand": opp_starter.get("pitch_hand"),
    }
    pick_starter_features = starter_feature_set(pick_starter_seed)
    opp_starter_features = starter_feature_set(opp_starter_seed)
    for name, value in pick_starter_features.items():
        feature_put(features, f"pick_starter_{name}", value)
    for name, value in opp_starter_features.items():
        feature_put(features, f"opp_starter_{name}", value)
    for name in set(pick_starter_features.keys()) | set(opp_starter_features.keys()):
        diff_feature(features, f"starter_{name}", pick_starter_features.get(name), opp_starter_features.get(name))

    pick_starter_name = pick_starter.get("pitcher_name")
    opp_starter_name = opp_starter.get("pitcher_name")
    for lookup_name, lookup in pitcher_profiles.items():
        pick_row = resolve_prior_profile(pitcher_profile_history[lookup_name], pick_starter_name, as_of_date)
        opp_row = resolve_prior_profile(pitcher_profile_history[lookup_name], opp_starter_name, as_of_date)
        keys = set((pick_row or {}).keys()) | set((opp_row or {}).keys())
        for key in keys:
            if key in {"as_of_date", "pitcher_id", "pitcher_name", "team_name", "scheduled_opponent"}:
                continue
            diff_feature(features, f"{lookup_name}_{key}", (pick_row or {}).get(key), (opp_row or {}).get(key))

    return features


def build_warehouse_side_samples(
    conn: sqlite3.Connection,
    team_profiles: dict[str, dict[tuple[str, str], dict[str, Any]]],
    pitcher_profiles: dict[str, dict[tuple[str, str], dict[str, Any]]],
) -> dict[str, list[dict[str, Any]]]:
    starters_by_game = load_starting_pitchers_by_game(conn)
    team_profile_history = {name: build_profile_history(lookup) for name, lookup in team_profiles.items()}
    pitcher_profile_history = {name: build_profile_history(lookup) for name, lookup in pitcher_profiles.items()}
    samples: dict[str, list[dict[str, Any]]] = {"moneyline": [], "first5": []}
    games = conn.execute("SELECT * FROM mlb_game_outcomes ORDER BY game_date, game_pk").fetchall()
    for game in games:
        first5_result = str(game["home_first5_result"] or "")
        title = f"{game['away_team']} @ {game['home_team']}"
        for pick_role in ("away", "home"):
            side_team = game["away_team"] if pick_role == "away" else game["home_team"]
            features = build_warehouse_side_features(
                game,
                starters_by_game,
                pick_role,
                team_profiles,
                pitcher_profiles,
                team_profile_history,
                pitcher_profile_history,
            )
            moneyline_target = int(game["home_full_game_result"] == "win") if pick_role == "home" else int(game["home_full_game_result"] == "loss")
            meta = {
                "pickRole": pick_role,
                "sideTeam": side_team,
                "title": title,
                "gameKey": int(game["game_pk"]),
            }
            samples["moneyline"].append(
                {
                    "date": game["game_date"],
                    "matchup": title,
                    "features": features,
                    "target": moneyline_target,
                    "meta": meta,
                }
            )
            if first5_result != "tie":
                first5_target = int(first5_result == "win") if pick_role == "home" else int(first5_result == "loss")
                samples["first5"].append(
                    {
                        "date": game["game_date"],
                        "matchup": title,
                        "features": features,
                        "target": first5_target,
                        "meta": meta,
                    }
                )
    return samples


def score_market(
    name: str,
    model: Pipeline | None,
    threshold_info: dict[str, Any],
    rows: list[dict[str, Any]],
    *,
    promotable: bool,
) -> list[dict[str, Any]]:
    if model is None or not rows:
        return []
    probabilities = model.predict_proba([row["features"] for row in rows])[:, 1]
    scored = []
    threshold = threshold_info["threshold"]
    if name in {"moneyline", "first5"}:
        grouped: dict[str, list[dict[str, Any]]] = defaultdict(list)
        for row, probability in zip(rows, probabilities):
            grouped[str(row["meta"]["gameKey"])].append(
                {
                    "matchup": row["matchup"],
                    "probability": float(probability),
                    "sideTeam": row["meta"]["sideTeam"],
                }
            )
        for game_key, group in grouped.items():
            best = max(group, key=lambda entry: entry["probability"])
            scored.append(
                {
                    "matchup": best["matchup"],
                    "probability": round(best["probability"], 4),
                    "action": "Play" if promotable and best["probability"] >= threshold else "Pass",
                    "pick": best["sideTeam"] if promotable and best["probability"] >= threshold else None,
                }
            )
    else:
        for row, probability in zip(rows, probabilities):
            action = "Pass"
            pick = None
            if probability >= threshold:
                action = "Play"
                pick = "Over" if name == "totals" else "YRFI"
            elif probability <= 1 - threshold:
                action = "Play"
                pick = "Under" if name == "totals" else "NRFI"
            scored.append(
                {
                    "matchup": row["matchup"],
                    "probability": round(float(probability), 4),
                    "action": action,
                    "pick": pick,
                }
            )
    scored.sort(key=lambda entry: entry["probability"], reverse=True)
    return scored


def market_promotable(market_name: str, threshold_info: dict[str, Any]) -> bool:
    min_accuracy = {
        "moneyline": 0.62,
        "first5": 0.68,
        "totals": 0.60,
        "firstInning": 0.61,
    }[market_name]
    return threshold_info["utility"] > 0 and threshold_info["accuracy"] >= min_accuracy


def build_score_rows(
    corpus_rows: list[dict[str, Any]],
    score_date: str,
    market_name: str,
    team_profiles: dict[str, dict[tuple[str, str], dict[str, Any]]],
    pitcher_profiles: dict[str, dict[tuple[str, str], dict[str, Any]]],
) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for record in corpus_rows:
        if record["date"] != score_date:
            continue
        analysis = record.get("analysis") or {}
        if not analysis:
            continue
        if market_name in {"moneyline", "first5"}:
            for pick_role in ("away", "home"):
                rows.append(
                    {
                        "date": record["date"],
                        "matchup": record["title"],
                        "features": build_raw_side_features(record, pick_role, team_profiles, pitcher_profiles),
                        "meta": {
                            "pickRole": pick_role,
                            "sideTeam": extract_team_name(record, pick_role),
                            "title": record["title"],
                            "analysis": analysis,
                            "gameKey": record.get("id") or record.get("gamePk") or record["title"],
                        },
                    }
                )
        elif market_name == "totals":
            total_line = parse_total_line(record.get("totalMarket")) or safe_float(((analysis.get("mlbProjection") or {}).get("postedTotal")))
            if total_line is None:
                continue
            rows.append(
                {
                    "date": record["date"],
                    "matchup": record["title"],
                    "features": build_totals_features(record, total_line),
                    "meta": {"line": total_line, "title": record["title"], "analysis": analysis},
                }
            )
        elif market_name == "firstInning":
            first_inning_features = build_first_inning_features(record)
            if first_inning_features:
                rows.append(
                    {
                        "date": record["date"],
                        "matchup": record["title"],
                        "features": first_inning_features,
                        "meta": {"title": record["title"], "analysis": analysis},
                    }
                )
    return rows


def markdown_table(headers: list[str], rows: list[list[str]]) -> str:
    header_line = "| " + " | ".join(headers) + " |"
    divider = "| " + " | ".join(["---"] * len(headers)) + " |"
    body = ["| " + " | ".join(row) + " |" for row in rows]
    return "\n".join([header_line, divider, *body])


def main() -> None:
    args = parse_args()
    args.report_out.parent.mkdir(parents=True, exist_ok=True)
    args.artifact_out.parent.mkdir(parents=True, exist_ok=True)

    corpus_rows = load_corpus(args.corpus)
    conn = get_connection()
    outcome_rows_by_game_pk, outcome_rows_by_matchup, first_inning_runs_by_game_pk = load_outcome_maps(conn)
    team_profiles = {
        "team_rolling_form": load_team_profile_lookup(conn, "mlb_team_rolling_form"),
        "team_story_priors": load_team_profile_lookup(conn, "mlb_team_story_priors"),
        "lineup_dependency": load_team_profile_lookup(conn, "mlb_lineup_dependency_profiles"),
        "form_carryover": load_team_profile_lookup(conn, "mlb_team_form_carryover_profiles"),
        "lead_surrender": load_team_profile_lookup(conn, "mlb_team_lead_surrender_profiles"),
        "whiff_persistence": load_team_profile_lookup(conn, "mlb_team_whiff_persistence_profiles"),
    }
    pitcher_profiles = {
        "starter_rolling_form": load_pitcher_profile_lookup(conn, "mlb_starting_pitcher_rolling_form"),
        "pitcher_mistake_shape": load_pitcher_profile_lookup(conn, "mlb_pitcher_mistake_shape_daily"),
        "starter_leash": load_pitcher_profile_lookup(conn, "mlb_starter_leash_profiles"),
        "starter_third_time_penalty": load_pitcher_profile_lookup(conn, "mlb_starter_third_time_penalty_profiles"),
    }
    corpus_samples = build_samples(
        corpus_rows,
        outcome_rows_by_game_pk,
        outcome_rows_by_matchup,
        first_inning_runs_by_game_pk,
        team_profiles,
        pitcher_profiles,
    )
    warehouse_side_samples = build_warehouse_side_samples(conn, team_profiles, pitcher_profiles)
    samples = {
        "moneyline": warehouse_side_samples["moneyline"],
        "first5": warehouse_side_samples["first5"],
        "totals": corpus_samples["totals"],
        "firstInning": corpus_samples["firstInning"],
    }

    results: dict[str, Any] = {}
    artifact: dict[str, Any] = {
        "generatedAt": __import__("datetime").datetime.utcnow().isoformat() + "Z",
        "scoreDate": args.score_date,
        "markets": {},
    }

    report_lines = [
        "# MLB Market ML Training — May 25, 2026",
        "",
        "This pass replaces the old `50% is acceptable` mindset with walk-forward machine learning, calibration-oriented scoring, and hard abstention thresholds.",
        "",
    ]

    for market_name in ("moneyline", "first5", "totals", "firstInning"):
        market_samples = samples[market_name]
        if not market_samples:
            continue
        evaluation = walk_forward_predictions(
            market_samples,
            min_train_dates=args.min_train_dates,
            min_train_samples=args.min_train_samples,
        )
        if not evaluation["best_model"]:
            continue
        best_name = evaluation["best_model"]
        best_eval = evaluation["evaluations"][best_name]
        if market_name in {"moneyline", "first5"}:
            threshold_info = choose_single_side_threshold(evaluation["records"])
        else:
            threshold_info = choose_two_sided_threshold(evaluation["records"])

        final_model = fit_final_model(market_samples, best_name, args.score_date)
        score_rows = build_score_rows(corpus_rows, args.score_date, market_name, team_profiles, pitcher_profiles)
        promotable = market_promotable(market_name, threshold_info)
        scored_today = score_market(market_name, final_model, threshold_info, score_rows, promotable=promotable)

        results[market_name] = {
            "bestModel": best_name,
            "logLoss": round(best_eval["log_loss"], 4),
            "brier": round(best_eval["brier"], 4),
            "accuracy": round(best_eval["accuracy"], 4),
            "sampleSize": best_eval["sample_size"],
            "threshold": threshold_info,
            "promotable": promotable,
        }
        artifact["markets"][market_name] = {
            "bestModel": best_name,
            "metrics": {
                "logLoss": round(best_eval["log_loss"], 4),
                "brier": round(best_eval["brier"], 4),
                "accuracy": round(best_eval["accuracy"], 4),
                "sampleSize": best_eval["sample_size"],
            },
            "threshold": threshold_info,
            "promotable": promotable,
            "today": scored_today,
        }

        report_lines.extend(
            [
                f"## {market_name}",
                "",
                f"- Best model: `{best_name}`",
                f"- Walk-forward log loss: `{best_eval['log_loss']:.4f}`",
                f"- Walk-forward Brier: `{best_eval['brier']:.4f}`",
                f"- Walk-forward accuracy: `{best_eval['accuracy']:.4f}`",
                f"- OOF sample size: `{best_eval['sample_size']}`",
                f"- Fitness threshold: `{threshold_info['threshold']:.2f}`",
                f"- Threshold record: `{threshold_info['hits']}-{threshold_info['losses']}` on `{threshold_info['plays']}` plays (`{threshold_info['accuracy']:.1%}`)",
                f"- Promotable today: `{'yes' if promotable else 'no'}`",
                "",
            ]
        )

        if scored_today:
            table_rows = []
            for row in scored_today[:12]:
                table_rows.append(
                    [
                        row["matchup"],
                        row["action"],
                        row["pick"] or "Pass",
                        f"{row['probability']:.3f}",
                    ]
                )
            report_lines.append(markdown_table(["Matchup", "Action", "Pick", "Probability"], table_rows))
            report_lines.append("")

    args.report_out.write_text("\n".join(report_lines).strip() + "\n", encoding="utf-8")
    args.artifact_out.write_text(json.dumps(artifact, indent=2), encoding="utf-8")

    print(f"Wrote report to {args.report_out}")
    print(f"Wrote artifact to {args.artifact_out}")


if __name__ == "__main__":
    main()
