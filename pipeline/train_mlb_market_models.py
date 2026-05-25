#!/usr/bin/env python3

from __future__ import annotations

import argparse
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
) -> dict[str, list[dict[str, Any]]]:
    samples: dict[str, list[dict[str, Any]]] = {"moneyline": [], "first5": [], "firstInning": [], "totals": []}

    for record in corpus_rows:
        analysis = record.get("analysis") or {}
        if not analysis:
            continue
        outcome = resolve_outcome(record, outcome_rows_by_game_pk, outcome_rows_by_matchup)
        if outcome is None:
            continue

        features, pick_role = build_moneyline_features(record)
        moneyline_target = int(outcome["home_full_game_result"] == "win") if pick_role == "home" else int(outcome["home_full_game_result"] == "loss")
        samples["moneyline"].append(
            {
                "date": record["date"],
                "matchup": record["title"],
                "features": features,
                "target": moneyline_target,
                "meta": {"pickRole": pick_role, "title": record["title"], "analysis": analysis},
            }
        )

        first5_result = str(outcome["home_first5_result"] or "")
        if first5_result != "tie":
            first5_target = int(first5_result == "win") if pick_role == "home" else int(first5_result == "loss")
            samples["first5"].append(
                {
                    "date": record["date"],
                    "matchup": record["title"],
                    "features": features,
                    "target": first5_target,
                    "meta": {"pickRole": pick_role, "title": record["title"], "analysis": analysis},
                }
            )

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
    for row, probability in zip(rows, probabilities):
        action = "Pass"
        pick = None
        if promotable and name in {"moneyline", "first5"}:
            if probability >= threshold:
                action = "Play"
                pick = row["meta"]["analysis"]["participantName"]
        elif promotable:
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


def build_score_rows(corpus_rows: list[dict[str, Any]], score_date: str, market_name: str) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for record in corpus_rows:
        if record["date"] != score_date:
            continue
        analysis = record.get("analysis") or {}
        if not analysis:
            continue
        if market_name in {"moneyline", "first5"}:
            features, pick_role = build_moneyline_features(record)
            rows.append(
                {
                    "date": record["date"],
                    "matchup": record["title"],
                    "features": features,
                    "meta": {"pickRole": pick_role, "title": record["title"], "analysis": analysis},
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
    samples = build_samples(corpus_rows, outcome_rows_by_game_pk, outcome_rows_by_matchup, first_inning_runs_by_game_pk)

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
        score_rows = build_score_rows(corpus_rows, args.score_date, market_name)
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
