#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import math
import re
import sqlite3
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd
from sklearn.ensemble import ExtraTreesClassifier, GradientBoostingClassifier, RandomForestClassifier
from sklearn.impute import SimpleImputer
from sklearn.pipeline import Pipeline

ROOT = Path(__file__).resolve().parents[3]
DB_PATH = ROOT / "data-private" / "warehouse" / "sports.db"
REPORTS_DIR = ROOT / "data-private" / "reports"
WEB_JSON = ROOT / "web" / "src" / "lib" / "kalshi-tennis-spike-model.generated.json"

WEATHER_FEATURES = [
    "weather_duration_minutes",
    "weather_avg_temperature_c",
    "weather_max_temperature_c",
    "weather_min_temperature_c",
    "weather_avg_apparent_temperature_c",
    "weather_max_apparent_temperature_c",
    "weather_avg_humidity_pct",
    "weather_total_precipitation_mm",
    "weather_total_rain_mm",
    "weather_avg_cloud_cover_pct",
    "weather_avg_wind_speed_kmh",
    "weather_max_wind_gust_kmh",
    "weather_avg_surface_pressure_hpa",
    "weather_avg_shortwave_radiation_wm2",
    "weather_max_shortwave_radiation_wm2",
    "weather_hot_match",
    "weather_humid_match",
    "weather_windy_match",
    "weather_rain_affected",
]


def normalize(value: Any) -> str:
    value = "" if value is None else str(value)
    value = re.sub(r"[^a-z0-9]+", " ", value.lower()).strip()
    return re.sub(r"\s+", " ", value)


def kalshi_fee(price: float) -> float:
    return math.ceil((0.07 * price * (1 - price)) * 100) / 100


def side_for(row: pd.Series) -> str | None:
    selection = normalize(row.get("normalized_selection_name") or row.get("selection_name"))
    p1 = normalize(row.get("player1_normalized_name") or row.get("player1_name"))
    p2 = normalize(row.get("player2_normalized_name") or row.get("player2_name"))
    if selection and (selection == p1 or selection in p1 or p1 in selection):
        return "p1"
    if selection and (selection == p2 or selection in p2 or p2 in selection):
        return "p2"
    return None


def profit_for_target(entry: float, max_bid: float, target: float) -> float:
    if not np.isfinite(entry) or not np.isfinite(max_bid):
        return np.nan
    if max_bid >= target:
        return target - entry - kalshi_fee(entry) - kalshi_fee(target)
    return -(entry + kalshi_fee(entry))


def stabilization_vetoes(entry: float, flow: dict[str, Any], price_history: dict[str, Any] | None = None) -> list[str]:
    vetoes: list[str] = []
    same_favorite = (price_history or {}).get("sameFavorite") or []
    similar_entry = (price_history or {}).get("similarEntry") or {}
    if not same_favorite and not (similar_entry.get("n") or 0):
        vetoes.append("no Kalshi price-history comp; do not promote pre-match")
    opponent_rank = flow.get("opponentRank")
    favorite_is_hot = (
        opponent_rank is not None
        and opponent_rank <= 20
        and (flow.get("opponentClayWinPct") or 0) >= 0.78
        and (flow.get("opponentRecentWinPct") or 0) >= 0.75
    )
    cannot_stabilize = (
        (flow.get("hold") is not None and flow.get("hold") < 65)
        or (flow.get("errorControl") is not None and flow.get("errorControl") < 55)
        or (flow.get("secondServe") is not None and flow.get("secondServe") < 50)
    )
    no_pressure_edge = flow.get("returnPressureEdge") is not None and flow.get("returnPressureEdge") <= 0
    severe_form_gap = flow.get("adjFormEdge") is not None and flow.get("adjFormEdge") <= -18
    if entry <= 0.12 and favorite_is_hot and cannot_stabilize and (no_pressure_edge or severe_form_gap):
        vetoes.append("top-form favorite can bury this before a spike")
    if entry <= 0.12 and severe_form_gap and no_pressure_edge and (flow.get("hold") or 100) < 65:
        vetoes.append("weak hold plus no return-pressure edge")
    if same_favorite:
        hit_2x_rate = sum(1 for row in same_favorite if row.get("hit2x")) / len(same_favorite)
        if favorite_is_hot and cannot_stabilize and hit_2x_rate < 0.5:
            vetoes.append("prior underdogs vs this favorite usually failed to double")
    return vetoes


def load_feature_frame() -> pd.DataFrame:
    with sqlite3.connect(DB_PATH) as conn:
        trades = pd.read_sql_query("select * from tennis_kalshi_intramatch_trade_features where board_match_id is not null", conn)
        training = pd.read_sql_query("select * from tennis_model_training_rows", conn)
    rows = trades.merge(training, left_on="board_match_id", right_on="match_id", how="left")
    if "slate_date_x" in rows:
        rows["slate_date"] = rows["slate_date_x"].combine_first(rows.get("slate_date_y"))
    for column in ["entry_ask", "favorite_entry_ask", "max_bid", "max_trade", "won", "start_minutes", "is_atp", "is_wta"]:
        if column in rows:
            rows[column] = pd.to_numeric(rows[column], errors="coerce")
    rows["selection_side"] = rows.apply(side_for, axis=1)
    rows = rows[rows["selection_side"].notna() & rows["entry_ask"].notna() & rows["max_bid"].notna()].copy()
    for multiple in (2.0, 2.5, 3.0):
        rows[f"target_{multiple}x"] = np.minimum(rows["entry_ask"] * multiple, 0.95)
        rows[f"hit_{multiple}x"] = (rows["max_bid"] >= rows[f"target_{multiple}x"]).astype(int)
        rows[f"profit_{multiple}x"] = [
            profit_for_target(entry, max_bid, target)
            for entry, max_bid, target in zip(rows["entry_ask"], rows["max_bid"], rows[f"target_{multiple}x"])
        ]
    feature_bases = [
        "market_prob",
        "metric_hold",
        "metric_secondServe",
        "metric_errorControl",
        "metric_returnPressure",
        "metric_closeout",
        "rg_flow_games",
        "rg_flow_hold_rate",
        "rg_flow_break_rate",
        "rg_flow_breaks_lost_rate",
        "rg_flow_long_game_rate",
        "clay_win_pct",
        "recent_win_pct",
        "opponent_adjusted_form_score",
        "rank_quality",
        "recent_resistance_rate",
    ]
    for base in feature_bases:
        left = pd.to_numeric(rows.get(f"p1_{base}"), errors="coerce") if f"p1_{base}" in rows else pd.Series(np.nan, index=rows.index)
        right = pd.to_numeric(rows.get(f"p2_{base}"), errors="coerce") if f"p2_{base}" in rows else pd.Series(np.nan, index=rows.index)
        rows[f"sel_{base}"] = np.where(rows["selection_side"].eq("p1"), left, right)
        rows[f"opp_{base}"] = np.where(rows["selection_side"].eq("p1"), right, left)
        rows[f"edge_{base}"] = rows[f"sel_{base}"] - rows[f"opp_{base}"]
    rows["entry_cents"] = rows["entry_ask"] * 100
    rows["favorite_entry_cents"] = rows["favorite_entry_ask"] * 100
    rows["market_gap_cents"] = (rows["favorite_entry_ask"] - rows["entry_ask"]) * 100
    rows["early_start"] = (rows["start_minutes"] <= 240).astype(int)
    rows["morning_start"] = (rows["start_minutes"] <= 420).astype(int)
    rows["low_entry_15"] = (rows["entry_ask"] <= 0.15).astype(int)
    rows["weak_favorite_error"] = (rows["opp_metric_errorControl"] < 55).astype(int)
    rows["return_pressure_edge"] = (rows["edge_metric_returnPressure"] > 0).astype(int)
    rows["prior_rg_flow"] = (rows["sel_rg_flow_games"] >= 5).astype(int)
    rows["favorite_break_leak"] = (rows["opp_rg_flow_breaks_lost_rate"] >= 0.25).astype(int)
    rows["long_game_env"] = ((rows["sel_rg_flow_long_game_rate"] >= 0.25) | (rows["opp_rg_flow_long_game_rate"] >= 0.25)).astype(int)
    return rows.replace([np.inf, -np.inf], np.nan)


def summarize(rows: pd.DataFrame, mask: pd.Series, label: str) -> dict[str, Any] | None:
    group = rows[mask & rows["entry_ask"].notna()].copy()
    if group.empty:
        return None
    return {
        "lane": label,
        "rows": int(len(group)),
        "avgEntryCents": round(float(group["entry_cents"].mean()), 1),
        "winRate": round(float(group["won"].mean()), 3),
        "hit2x": round(float(group["hit_2.0x"].mean()), 3),
        "roi2xCents": round(float(group["profit_2.0x"].mean() * 100), 1),
        "hit25x": round(float(group["hit_2.5x"].mean()), 3),
        "roi25xCents": round(float(group["profit_2.5x"].mean() * 100), 1),
        "hit3x": round(float(group["hit_3.0x"].mean()), 3),
        "roi3xCents": round(float(group["profit_3.0x"].mean() * 100), 1),
    }


def lane_summaries(rows: pd.DataFrame) -> list[dict[str, Any]]:
    checks = {
        "entry <=15c": rows["entry_ask"] <= 0.15,
        "entry <=15c + weak favorite errors": (rows["entry_ask"] <= 0.15) & rows["weak_favorite_error"].eq(1),
        "entry <=15c + early start": (rows["entry_ask"] <= 0.15) & rows["early_start"].eq(1),
        "entry <=15c + prior RG flow": (rows["entry_ask"] <= 0.15) & rows["prior_rg_flow"].eq(1),
        "entry <=15c + favorite break leak": (rows["entry_ask"] <= 0.15) & rows["favorite_break_leak"].eq(1),
        "return-pressure edge": rows["return_pressure_edge"].eq(1),
        "weak favorite errors": rows["weak_favorite_error"].eq(1),
        "prior RG flow": rows["prior_rg_flow"].eq(1),
        "long-game environment": rows["long_game_env"].eq(1),
    }
    summaries = [summary for label, mask in checks.items() if (summary := summarize(rows, mask, label))]
    return sorted(summaries, key=lambda item: (item["roi25xCents"], item["hit25x"]), reverse=True)


def feature_columns(rows: pd.DataFrame) -> list[str]:
    candidates = [
        column
        for column in rows.columns
        if column.startswith("edge_")
        or column.startswith("sel_")
        or column.startswith("opp_")
        or column.startswith("weather_")
        or column in {
            "entry_cents",
            "favorite_entry_cents",
            "market_gap_cents",
            "start_minutes",
            "is_atp",
            "is_wta",
            "early_start",
            "morning_start",
            "low_entry_15",
            "weak_favorite_error",
            "return_pressure_edge",
            "prior_rg_flow",
            "favorite_break_leak",
            "long_game_env",
        }
    ]
    return [
        column for column in candidates
        if column in rows and pd.to_numeric(rows[column], errors="coerce").notna().any()
    ]


def load_current_weather(match_ids: list[str]) -> dict[str, dict[str, Any]]:
    match_ids = [match_id for match_id in match_ids if match_id]
    if not match_ids:
        return {}
    placeholders = ",".join("?" for _ in match_ids)
    query = f"""
        select match_id,
               duration_minutes as weather_duration_minutes,
               avg_temperature_c as weather_avg_temperature_c,
               max_temperature_c as weather_max_temperature_c,
               min_temperature_c as weather_min_temperature_c,
               avg_apparent_temperature_c as weather_avg_apparent_temperature_c,
               max_apparent_temperature_c as weather_max_apparent_temperature_c,
               avg_humidity_pct as weather_avg_humidity_pct,
               total_precipitation_mm as weather_total_precipitation_mm,
               total_rain_mm as weather_total_rain_mm,
               avg_cloud_cover_pct as weather_avg_cloud_cover_pct,
               avg_wind_speed_kmh as weather_avg_wind_speed_kmh,
               max_wind_gust_kmh as weather_max_wind_gust_kmh,
               avg_surface_pressure_hpa as weather_avg_surface_pressure_hpa,
               avg_shortwave_radiation_wm2 as weather_avg_shortwave_radiation_wm2,
               max_shortwave_radiation_wm2 as weather_max_shortwave_radiation_wm2,
               hot_match as weather_hot_match,
               humid_match as weather_humid_match,
               windy_match as weather_windy_match,
               rain_affected as weather_rain_affected
        from tennis_match_weather
        where match_id in ({placeholders})
    """
    with sqlite3.connect(DB_PATH) as conn:
        conn.row_factory = sqlite3.Row
        rows = conn.execute(query, match_ids).fetchall()
    return {row["match_id"]: dict(row) for row in rows}


def model_specs() -> list[tuple[str, Pipeline]]:
    return [
        (
            "extra_trees",
            Pipeline([
                ("impute", SimpleImputer(strategy="median")),
                ("model", ExtraTreesClassifier(n_estimators=220, min_samples_leaf=4, random_state=529, class_weight="balanced")),
            ]),
        ),
        (
            "random_forest",
            Pipeline([
                ("impute", SimpleImputer(strategy="median")),
                ("model", RandomForestClassifier(n_estimators=180, min_samples_leaf=4, random_state=29, class_weight="balanced")),
            ]),
        ),
        (
            "gradient_boosting",
            Pipeline([
                ("impute", SimpleImputer(strategy="median")),
                ("model", GradientBoostingClassifier(random_state=29, max_depth=2, learning_rate=0.05)),
            ]),
        ),
    ]


def backtest_model(rows: pd.DataFrame, features: list[str]) -> tuple[pd.DataFrame, dict[str, Any]]:
    scored = []
    for test_date in sorted(rows["slate_date"].dropna().unique()):
        train = rows[rows["slate_date"] < test_date]
        test = rows[rows["slate_date"] == test_date]
        if len(train) < 25 or test.empty or train["hit_2.5x"].nunique() < 2:
            continue
        fold_features = [
            feature for feature in features
            if pd.to_numeric(train[feature], errors="coerce").notna().any()
        ]
        if len(fold_features) < 3:
            continue
        predictions = []
        for _, model in model_specs():
            model.fit(train[fold_features], train["hit_2.5x"])
            predictions.append(model.predict_proba(test[fold_features])[:, 1])
        test = test.copy()
        test["spike_probability"] = np.mean(predictions, axis=0)
        scored.append(test)
    if not scored:
        return pd.DataFrame(), {"rows": 0}
    out = pd.concat(scored, ignore_index=True)
    out["model_trade"] = (out["spike_probability"] >= 0.54).astype(int)
    traded = out[out["model_trade"].eq(1)]
    threshold_backtest = []
    for threshold in (0.50, 0.52, 0.54, 0.56, 0.58, 0.60, 0.62):
        threshold_rows = out[out["spike_probability"] >= threshold]
        if threshold_rows.empty:
            continue
        threshold_backtest.append({
            "threshold": threshold,
            "trades": int(len(threshold_rows)),
            "hit25x": round(float(threshold_rows["hit_2.5x"].mean()), 3),
            "roi25xCents": round(float(threshold_rows["profit_2.5x"].mean() * 100), 1),
        })
    summary = {
        "rows": int(len(out)),
        "trades": int(len(traded)),
        "hit25x": round(float(traded["hit_2.5x"].mean()), 3) if not traded.empty else None,
        "roi25xCents": round(float(traded["profit_2.5x"].mean() * 100), 1) if not traded.empty else None,
        "allRowsHit25x": round(float(out["hit_2.5x"].mean()), 3),
        "allRowsRoi25xCents": round(float(out["profit_2.5x"].mean() * 100), 1),
        "thresholdBacktest": threshold_backtest,
    }
    return out, summary


def score_current_candidates(rows: pd.DataFrame, features: list[str], target_date: str) -> list[dict[str, Any]]:
    current_path = ROOT / "web" / "src" / "lib" / "kalshi-tennis-trade-candidates.generated.json"
    if not current_path.exists():
        return []
    candidates = json.loads(current_path.read_text()).get("candidates") or []
    current = [row for row in candidates if str(row.get("occurrenceDatetime") or "").startswith(target_date)]
    if not current:
        return []
    current_weather = load_current_weather([row.get("boardMatchId") for row in current])
    train = rows[rows["slate_date"] < target_date]
    if len(train) < 25 or train["hit_2.5x"].nunique() < 2:
        return current
    model_features = [
        feature for feature in features
        if pd.to_numeric(train[feature], errors="coerce").notna().any()
    ]
    if len(model_features) < 3:
        return current
    models = []
    for _, model in model_specs():
        model.fit(train[model_features], train["hit_2.5x"])
        models.append(model)
    # Current feature matrix comes from regenerated candidate context, not from settled trade rows.
    records = []
    for candidate in current:
        flow = candidate.get("playerFlow") or {}
        entry = float(candidate.get("yesAsk") or 0)
        record = {
            "entry_cents": entry * 100,
            "favorite_entry_cents": float(candidate.get("favoriteAsk") or 0) * 100,
            "market_gap_cents": (float(candidate.get("favoriteAsk") or 0) - entry) * 100,
            "start_minutes": None,
            "is_atp": 1 if str(candidate.get("eventTicker") or "").startswith("KXAT") else 0,
            "is_wta": 1 if str(candidate.get("eventTicker") or "").startswith("KXWT") else 0,
            "early_start": 0,
            "morning_start": 1,
            "low_entry_15": 1 if entry <= 0.15 else 0,
            "weak_favorite_error": 1 if (flow.get("opponentErrorControl") or 100) < 55 else 0,
            "return_pressure_edge": 1 if (flow.get("returnPressureEdge") or 0) > 0 else 0,
            "prior_rg_flow": 1 if (flow.get("selectedRgFlowGames") or 0) >= 5 else 0,
            "favorite_break_leak": 1 if (flow.get("opponentRgBreaksLostRate") or 0) >= 0.25 else 0,
            "long_game_env": 1 if (flow.get("selectedRgLongGameRate") or 0) >= 0.25 or (flow.get("opponentRgLongGameRate") or 0) >= 0.25 else 0,
            "sel_metric_returnPressure": flow.get("returnPressure"),
            "opp_metric_returnPressure": None,
            "edge_metric_returnPressure": flow.get("returnPressureEdge"),
            "sel_metric_errorControl": flow.get("errorControl"),
            "opp_metric_errorControl": flow.get("opponentErrorControl"),
            "edge_metric_errorControl": None,
            "sel_metric_hold": flow.get("hold"),
            "opp_metric_hold": flow.get("opponentHold"),
            "edge_metric_hold": None,
            "sel_metric_closeout": None,
            "opp_metric_closeout": flow.get("opponentCloseout"),
            "edge_metric_closeout": None,
            "sel_clay_win_pct": flow.get("clayWinPct"),
            "opp_clay_win_pct": flow.get("opponentClayWinPct"),
            "edge_clay_win_pct": flow.get("clayEdge"),
            "sel_opponent_adjusted_form_score": flow.get("adjForm"),
            "opp_opponent_adjusted_form_score": flow.get("opponentAdjForm"),
            "edge_opponent_adjusted_form_score": flow.get("adjFormEdge"),
            "sel_rg_flow_games": flow.get("selectedRgFlowGames"),
            "opp_rg_flow_breaks_lost_rate": flow.get("opponentRgBreaksLostRate"),
            "sel_rg_flow_long_game_rate": flow.get("selectedRgLongGameRate"),
            "opp_rg_flow_long_game_rate": flow.get("opponentRgLongGameRate"),
        }
        record.update({feature: current_weather.get(candidate.get("boardMatchId"), {}).get(feature) for feature in WEATHER_FEATURES})
        records.append(record)
    matrix = pd.DataFrame(records)
    for feature in model_features:
        if feature not in matrix:
            matrix[feature] = np.nan
    probabilities = np.mean([model.predict_proba(matrix[model_features])[:, 1] for model in models], axis=0)
    out = []
    for candidate, probability in zip(current, probabilities):
        entry = float(candidate.get("yesAsk") or 0)
        projected_target = candidate.get("projectedExit")
        projected_target_value = float(projected_target) if projected_target is not None else None
        target = projected_target_value if projected_target_value is not None and projected_target_value > entry else min(entry * 2.5, 0.95)
        existing_vetoes = candidate.get("stabilizationVetoes") or []
        vetoes = list(existing_vetoes or stabilization_vetoes(entry, candidate.get("playerFlow") or {}, candidate.get("kalshiPriceHistory") or {}))
        if entry > 0.25 or (projected_target_value is not None and projected_target_value <= entry):
            vetoes.append("trade-structure veto: no realistic pre-match scalp target above entry")
        if vetoes:
            target = min(entry * 2.0, target)
            probability = max(0.05, float(probability) - 0.18)
        ev = probability * (target - entry - kalshi_fee(entry) - kalshi_fee(target)) + (1 - probability) * (-(entry + kalshi_fee(entry)))
        candidate = dict(candidate)
        candidate["spikeModelProbability25x"] = round(float(probability), 3)
        candidate["spikeModelEv25x"] = round(float(ev), 3)
        candidate["spikeModelEvPctOfEntry25x"] = round(float(ev / entry), 3) if entry else None
        candidate["spikeModelTarget25x"] = round(float(target), 3)
        candidate_tier = str(candidate.get("candidateTier") or "").lower()
        candidate["spikeModelTier"] = (
            "pass" if vetoes
            else "trade" if ev > 0 and entry <= 0.2 and candidate_tier == "trade"
            else "watch" if ev > 0
            else "pass"
        )
        candidate["stabilizationVetoes"] = vetoes or candidate.get("stabilizationVetoes") or []
        out.append(candidate)
    return sorted(out, key=lambda row: (row.get("spikeModelTier") != "trade", -(row.get("spikeModelEvPctOfEntry25x") or -9)))


def main() -> None:
    parser = argparse.ArgumentParser(description="Backtest and score Kalshi tennis underdog spike trades.")
    parser.add_argument("--target-date", default="2026-05-29")
    args = parser.parse_args()
    rows = load_feature_frame()
    features = feature_columns(rows)
    weather_features = [feature for feature in features if feature.startswith("weather_")]
    weather_rows = int(rows[weather_features].notna().any(axis=1).sum()) if weather_features else 0
    scored, model_summary = backtest_model(rows, features)
    lanes = lane_summaries(rows)
    current = score_current_candidates(rows, features, args.target_date)
    payload = {
        "targetDate": args.target_date,
        "source": "Kalshi intramatch candles joined to tennis warehouse flow/form features",
        "coverage": {
            "historicalRows": int(len(rows)),
            "dates": sorted(rows["slate_date"].dropna().unique().tolist()),
            "featureCount": len(features),
            "weatherRows": weather_rows,
            "weatherFeatureCount": len(weather_features),
            "weatherNote": "Paris hourly weather is joined by board match and included when available.",
        },
        "laneBacktest": lanes,
        "modelBacktest": model_summary,
        "currentCandidates": current,
    }
    REPORTS_DIR.mkdir(parents=True, exist_ok=True)
    report_path = REPORTS_DIR / f"kalshi-tennis-spike-model-{args.target_date}.json"
    report_path.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    WEB_JSON.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    md_path = REPORTS_DIR / f"kalshi-tennis-spike-model-{args.target_date}.md"
    lines = [
        "# Kalshi Tennis Spike Model",
        "",
        f"Target date: {args.target_date}",
        "",
        "## Lane Backtest",
        "",
        "|lane|rows|entry|2.5x hit|2.5x ROI c|3x hit|3x ROI c|",
        "|---|---:|---:|---:|---:|---:|---:|",
    ]
    for row in lanes:
        lines.append(
            f"|{row['lane']}|{row['rows']}|{row['avgEntryCents']}c|{row['hit25x']}|"
            f"{row['roi25xCents']}|{row['hit3x']}|{row['roi3xCents']}|"
        )
    lines.extend(["", "## Current Candidates", "", "|tier|selection|entry|target|spike p|EV c|match|", "|---|---|---:|---:|---:|---:|---|"])
    for row in current[:16]:
        lines.append(
            f"|{row.get('spikeModelTier')}|{row.get('selection')}|{float(row.get('yesAsk') or 0)*100:.0f}c|"
            f"{float(row.get('spikeModelTarget25x') or 0)*100:.0f}c|{float(row.get('spikeModelProbability25x') or 0)*100:.0f}%|"
            f"{float(row.get('spikeModelEv25x') or 0)*100:.1f}|{row.get('boardTitle')}|"
        )
    md_path.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(json.dumps({"coverage": payload["coverage"], "modelBacktest": model_summary, "currentCandidates": len(current)}, indent=2))
    print(f"Wrote {report_path.relative_to(ROOT)}")
    print(f"Wrote {md_path.relative_to(ROOT)}")
    print(f"Wrote {WEB_JSON.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
