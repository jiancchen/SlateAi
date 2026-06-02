#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import math
import re
import sqlite3
import unicodedata
import warnings
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd
from sklearn.ensemble import GradientBoostingClassifier, RandomForestClassifier
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import brier_score_loss, log_loss, roc_auc_score
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

try:
    from xgboost import XGBClassifier
except Exception:  # pragma: no cover - optional local dependency
    XGBClassifier = None

warnings.filterwarnings("ignore", category=RuntimeWarning, module="sklearn.utils.extmath")

ROOT = Path(__file__).resolve().parents[3]
DB_PATH = ROOT / "data-private" / "warehouse" / "sports.db"
REPORTS_DIR = ROOT / "data-private" / "reports"
PREDICTIONS_DIR = ROOT / "data-private" / "predictions" / "tennis"
MODELS_DIR = ROOT / "data-private" / "models"


def normalize_name(value: str | None) -> str:
    if value is None:
        return ""
    if not isinstance(value, str):
        if pd.isna(value):
            return ""
        value = str(value)
    value = unicodedata.normalize("NFKD", value or "").encode("ascii", "ignore").decode("ascii")
    value = re.sub(r"[^a-zA-Z0-9]+", " ", value).strip().lower()
    return re.sub(r"\s+", " ", value)


def name_key(value: str | None) -> str:
    normalized = normalize_name(value)
    if not normalized:
        return ""
    return " ".join(sorted(normalized.split()))


def surface_key(value: Any) -> str:
    if value is None:
        return "unknown"
    try:
        if pd.isna(value):
            return "unknown"
    except TypeError:
        pass
    normalized = normalize_name(str(value or ""))
    if normalized in {"clay", "hard", "grass"}:
        return normalized
    if normalized in {"indoor hard", "hard indoor"}:
        return "hard"
    if normalized in {"all surfaces", "all"}:
        return "all surfaces"
    return normalized or "unknown"


def infer_match_surface(row: pd.Series) -> str:
    explicit = row.get("surface")
    explicit_key = surface_key(explicit)
    if explicit_key not in {"unknown", ""}:
        if explicit_key == "hard":
            return "Hard"
        if explicit_key == "clay":
            return "Clay"
        if explicit_key == "grass":
            return "Grass"
        return str(explicit)
    text = normalize_name(
        " ".join(
            str(row.get(column) or "")
            for column in ("title", "stage", "court", "league")
        )
    )
    clay_tokens = ("roland", "garros", "french open", "paris", "perugia", "prostejov", "bad rappenau")
    hard_tokens = ("tyler", "centurion")
    grass_tokens = ("birmingham", "wimbledon", "halle", "queens")
    if any(token in text for token in clay_tokens):
        return "Clay"
    if any(token in text for token in grass_tokens):
        return "Grass"
    if any(token in text for token in hard_tokens):
        return "Hard"
    return "Unknown"


def match_pair_key(left: str | None, right: str | None) -> str:
    names = [normalize_name(left), normalize_name(right)]
    if not all(names):
        return ""
    return " vs ".join(sorted(names))


def names_likely_match(left: str | None, right: str | None) -> bool:
    left_norm = normalize_name(left)
    right_norm = normalize_name(right)
    if not left_norm or not right_norm:
        return False
    if left_norm == right_norm or left_norm in right_norm or right_norm in left_norm:
        return True
    left_tokens = set(left_norm.split())
    right_tokens = set(right_norm.split())
    return left_tokens.issubset(right_tokens) or right_tokens.issubset(left_tokens)


def result_matches_players(result: pd.Series, player1: str | None, player2: str | None) -> bool:
    result_p1 = result.get("player1_normalized_name") or result.get("player1_name")
    result_p2 = result.get("player2_normalized_name") or result.get("player2_name")
    return (
        names_likely_match(player1, result_p1) and names_likely_match(player2, result_p2)
    ) or (
        names_likely_match(player1, result_p2) and names_likely_match(player2, result_p1)
    )


def fuzzy_result_for_match(match: pd.Series, results_for_day: pd.DataFrame) -> pd.Series | None:
    if results_for_day.empty:
        return None
    player1 = match.get("player1_normalized_name") or match.get("player1_name")
    player2 = match.get("player2_normalized_name") or match.get("player2_name")
    for _, result in results_for_day.iterrows():
        if result_matches_players(result, player1, player2):
            return result
    return None


def implied_from_american(odds: float | None) -> float | None:
    if odds is None or not math.isfinite(odds) or odds == 0:
        return None
    if odds > 0:
        return 100 / (odds + 100)
    return abs(odds) / (abs(odds) + 100)


def profit_per_100(odds: float | None) -> float | None:
    if odds is None or not math.isfinite(odds) or odds == 0:
        return None
    return float(odds) if odds > 0 else 10000 / abs(odds)


def ev_per_100(prob: float, odds: float | None, fee_per_100: float = 2.0) -> float | None:
    profit = profit_per_100(odds)
    if profit is None or not math.isfinite(prob):
        return None
    return prob * profit - (1 - prob) * 100 - fee_per_100


def recent_ml_value_gate(target_date: str) -> dict[str, Any]:
    reports = sorted(REPORTS_DIR.glob("tennis-value-backtest-*.json"))
    prior_reports = [
        report for report in reports
        if report.stem.replace("tennis-value-backtest-", "") < target_date
    ]
    if not prior_reports:
        return {"status": "open", "reason": "no prior value backtest found"}
    report_path = prior_reports[-1]
    try:
        payload = json.loads(report_path.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return {"status": "frozen", "reason": f"could not read {report_path.name}"}
    summary = payload.get("summary") or {}
    bet_grade = summary.get("Bet-grade value") or summary.get("Bet-grade ML") or {}
    source_bucket = "Bet-grade value" if summary.get("Bet-grade value") else "Bet-grade ML" if summary.get("Bet-grade ML") else None
    if not bet_grade:
        bet_grade = summary.get("ML") or {}
        source_bucket = "ML"
    graded = int(bet_grade.get("graded") or 0)
    roi = bet_grade.get("roi")
    hit_rate = bet_grade.get("hitRate")
    if graded and (roi is not None and float(roi) < 0 or hit_rate is not None and float(hit_rate) < 0.5):
        return {
            "status": "frozen",
            "source": report_path.name,
            "bucket": source_bucket,
            "reason": "last settled bet-grade ML lane was negative; downgrade blind ML value to watch until a new gate wins",
            "graded": graded,
            "hitRate": hit_rate,
            "roi": roi,
        }
    return {
        "status": "open",
        "source": report_path.name,
        "bucket": source_bucket,
        "reason": "last settled bet-grade ML lane did not fail the freeze gate",
        "graded": graded,
        "hitRate": hit_rate,
        "roi": roi,
    }


def american_from_probability(prob: float) -> int | None:
    if not math.isfinite(prob) or prob <= 0 or prob >= 1:
        return None
    if prob >= 0.5:
        return round(-100 * prob / (1 - prob))
    return round(100 * (1 - prob) / prob)


@dataclass
class ModelResult:
    name: str
    predictions: np.ndarray


def read_sql(conn: sqlite3.Connection, query: str) -> pd.DataFrame:
    return pd.read_sql_query(query, conn)


def sanitize_numeric_frame(frame: pd.DataFrame) -> pd.DataFrame:
    out = frame.copy()
    numeric_columns = out.select_dtypes(include=[np.number]).columns
    if len(numeric_columns):
        out[numeric_columns] = out[numeric_columns].replace([np.inf, -np.inf], np.nan)
    return out


def load_warehouse() -> dict[str, pd.DataFrame]:
    conn = sqlite3.connect(DB_PATH)
    try:
        return {
            "matches": read_sql(conn, "select * from tennis_matches"),
            "context": read_sql(conn, "select * from tennis_player_match_context"),
            "metrics": read_sql(conn, "select * from tennis_recent_form_metrics"),
            "markets": read_sql(conn, "select * from tennis_prediction_market_snapshots"),
            "grades": read_sql(conn, "select * from tennis_prediction_grades where prediction_source = 'desk'"),
            "results": read_sql(conn, "select * from tennis_match_results"),
            "replay_flow": read_sql(
                conn,
                """
                select slate_date, normalized_name, player_name,
                       sum(replay_games) as rg_flow_games,
                       sum(service_games) as rg_flow_service_games,
                       sum(holds) as rg_flow_holds,
                       sum(breaks_lost) as rg_flow_breaks_lost,
                       sum(long_service_games) as rg_flow_long_service_games,
                       sum(long_service_holds) as rg_flow_long_service_holds,
                       sum(late_service_games) as rg_flow_late_service_games,
                       sum(late_service_holds) as rg_flow_late_service_holds,
                       sum(return_games) as rg_flow_return_games,
                       sum(breaks_won) as rg_flow_breaks_won,
                       sum(long_return_games) as rg_flow_long_return_games,
                       sum(long_return_breaks_won) as rg_flow_long_return_breaks_won,
                       sum(late_return_games) as rg_flow_late_return_games,
                       sum(late_return_breaks_won) as rg_flow_late_return_breaks_won,
                       sum(long_games) as rg_flow_long_games
                from (
                  select m.slate_date,
                         m.home_normalized_name as normalized_name,
                         m.home_player_name as player_name,
                         count(*) as replay_games,
                         sum(case when g.serving_side = 'home' then 1 else 0 end) as service_games,
                         sum(case when g.serving_side = 'home' and g.scoring_side = 'home' then 1 else 0 end) as holds,
                         sum(case when g.serving_side = 'home' and g.scoring_side = 'away' then 1 else 0 end) as breaks_lost,
                         sum(case when g.serving_side = 'home' and g.point_count >= 8 then 1 else 0 end) as long_service_games,
                         sum(case when g.serving_side = 'home' and g.point_count >= 8 and g.scoring_side = 'home' then 1 else 0 end) as long_service_holds,
                         sum(case when g.serving_side = 'home' and g.game_number >= 9 then 1 else 0 end) as late_service_games,
                         sum(case when g.serving_side = 'home' and g.game_number >= 9 and g.scoring_side = 'home' then 1 else 0 end) as late_service_holds,
                         sum(case when g.serving_side = 'away' then 1 else 0 end) as return_games,
                         sum(case when g.serving_side = 'away' and g.scoring_side = 'home' then 1 else 0 end) as breaks_won,
                         sum(case when g.serving_side = 'away' and g.point_count >= 8 then 1 else 0 end) as long_return_games,
                         sum(case when g.serving_side = 'away' and g.point_count >= 8 and g.scoring_side = 'home' then 1 else 0 end) as long_return_breaks_won,
                         sum(case when g.serving_side = 'away' and g.game_number >= 9 then 1 else 0 end) as late_return_games,
                         sum(case when g.serving_side = 'away' and g.game_number >= 9 and g.scoring_side = 'home' then 1 else 0 end) as late_return_breaks_won,
                         sum(case when g.point_count >= 8 then 1 else 0 end) as long_games
                  from tennis_sofascore_matches m
                  join tennis_sofascore_replay_games g using(sofascore_event_id)
                  group by m.slate_date, m.home_normalized_name
                  union all
                  select m.slate_date,
                         m.away_normalized_name as normalized_name,
                         m.away_player_name as player_name,
                         count(*) as replay_games,
                         sum(case when g.serving_side = 'away' then 1 else 0 end) as service_games,
                         sum(case when g.serving_side = 'away' and g.scoring_side = 'away' then 1 else 0 end) as holds,
                         sum(case when g.serving_side = 'away' and g.scoring_side = 'home' then 1 else 0 end) as breaks_lost,
                         sum(case when g.serving_side = 'away' and g.point_count >= 8 then 1 else 0 end) as long_service_games,
                         sum(case when g.serving_side = 'away' and g.point_count >= 8 and g.scoring_side = 'away' then 1 else 0 end) as long_service_holds,
                         sum(case when g.serving_side = 'away' and g.game_number >= 9 then 1 else 0 end) as late_service_games,
                         sum(case when g.serving_side = 'away' and g.game_number >= 9 and g.scoring_side = 'away' then 1 else 0 end) as late_service_holds,
                         sum(case when g.serving_side = 'home' then 1 else 0 end) as return_games,
                         sum(case when g.serving_side = 'home' and g.scoring_side = 'away' then 1 else 0 end) as breaks_won,
                         sum(case when g.serving_side = 'home' and g.point_count >= 8 then 1 else 0 end) as long_return_games,
                         sum(case when g.serving_side = 'home' and g.point_count >= 8 and g.scoring_side = 'away' then 1 else 0 end) as long_return_breaks_won,
                         sum(case when g.serving_side = 'home' and g.game_number >= 9 then 1 else 0 end) as late_return_games,
                         sum(case when g.serving_side = 'home' and g.game_number >= 9 and g.scoring_side = 'away' then 1 else 0 end) as late_return_breaks_won,
                         sum(case when g.point_count >= 8 then 1 else 0 end) as long_games
                  from tennis_sofascore_matches m
                  join tennis_sofascore_replay_games g using(sofascore_event_id)
                  group by m.slate_date, m.away_normalized_name
                )
                group by slate_date, normalized_name
                """,
            ),
            "sofascore_matches": read_sql(
                conn,
                """
                select sofascore_event_id, slate_date, board_match_id,
                       home_normalized_name, away_normalized_name,
                       home_player_name, away_player_name, tournament_category,
                       raw_json
                from tennis_sofascore_matches
                where board_match_id is not null
                """,
            ),
            "weather": read_sql(conn, "select * from tennis_match_weather"),
            "player_page_stats": read_sql(conn, "select * from tennis_sofascore_player_page_stats"),
        }
    finally:
        conn.close()


def weighted_metric_table(metrics: pd.DataFrame) -> pd.DataFrame:
    if metrics.empty:
        return pd.DataFrame(columns=["match_id", "normalized_name"])
    rows = []
    for (match_id, normalized_name, metric_key), group in metrics.groupby(["match_id", "normalized_name", "metric_key"]):
        scores = pd.to_numeric(group["score"], errors="coerce")
        weights = pd.to_numeric(group["weight"], errors="coerce").fillna(1.0)
        valid = scores.notna()
        if not valid.any():
            value = np.nan
        else:
            value = float(np.average(scores[valid], weights=weights[valid]))
        rows.append(
            {
                "match_id": match_id,
                "normalized_name": normalized_name,
                f"metric_{metric_key}": value,
                f"metric_{metric_key}_rows": int(valid.sum()),
            }
        )
    metric_df = pd.DataFrame(rows)
    if metric_df.empty:
        return pd.DataFrame(columns=["match_id", "normalized_name"])
    return metric_df.groupby(["match_id", "normalized_name"], as_index=False).first()


def market_table(markets: pd.DataFrame) -> pd.DataFrame:
    if markets.empty:
        return pd.DataFrame(columns=["match_id", "normalized_name"])
    out = markets.copy()
    out["name_key"] = out["normalized_name"].map(name_key)
    out["market_prob"] = pd.to_numeric(out["probability_pct"], errors="coerce") / 100
    out["market_amount"] = pd.to_numeric(out["traded_amount"], errors="coerce")
    out["market_total_volume"] = pd.to_numeric(out["total_volume"], errors="coerce")
    keep = [
        "match_id",
        "normalized_name",
        "name_key",
        "source_name",
        "market_prob",
        "market_amount",
        "market_total_volume",
        "price_band",
        "cents_at_risk",
        "cents_profit_if_win",
    ]
    return out[keep].drop_duplicates(["match_id", "normalized_name"], keep="last")


def prior_replay_flow_table(matches: pd.DataFrame, replay_flow: pd.DataFrame) -> pd.DataFrame:
    columns = [
        "match_id",
        "normalized_name",
        "rg_flow_games",
        "rg_flow_service_games",
        "rg_flow_hold_rate",
        "rg_flow_breaks_lost_rate",
        "rg_flow_long_service_games",
        "rg_flow_long_service_hold_rate",
        "rg_flow_late_service_games",
        "rg_flow_late_service_hold_rate",
        "rg_flow_return_games",
        "rg_flow_break_rate",
        "rg_flow_long_return_games",
        "rg_flow_long_return_break_rate",
        "rg_flow_late_return_games",
        "rg_flow_late_return_break_rate",
        "rg_flow_long_game_rate",
    ]
    if matches.empty or replay_flow.empty:
        return pd.DataFrame(columns=columns)
    flow = replay_flow.copy()
    for column in [
        "rg_flow_games",
        "rg_flow_service_games",
        "rg_flow_holds",
        "rg_flow_breaks_lost",
        "rg_flow_long_service_games",
        "rg_flow_long_service_holds",
        "rg_flow_late_service_games",
        "rg_flow_late_service_holds",
        "rg_flow_return_games",
        "rg_flow_breaks_won",
        "rg_flow_long_return_games",
        "rg_flow_long_return_breaks_won",
        "rg_flow_late_return_games",
        "rg_flow_late_return_breaks_won",
        "rg_flow_long_games",
    ]:
        flow[column] = pd.to_numeric(flow[column], errors="coerce").fillna(0)
    flow["slate_date"] = flow["slate_date"].astype(str)
    rows = []
    for _, match in matches.iterrows():
        slate_date = str(match.get("slate_date") or "")
        for normalized_name in [match.get("player1_normalized_name"), match.get("player2_normalized_name")]:
            if not normalized_name:
                continue
            prior = flow[(flow["normalized_name"] == normalized_name) & (flow["slate_date"] < slate_date)]
            service_games = float(prior["rg_flow_service_games"].sum()) if not prior.empty else 0.0
            return_games = float(prior["rg_flow_return_games"].sum()) if not prior.empty else 0.0
            replay_games = float(prior["rg_flow_games"].sum()) if not prior.empty else 0.0
            long_service_games = float(prior["rg_flow_long_service_games"].sum()) if not prior.empty else 0.0
            long_return_games = float(prior["rg_flow_long_return_games"].sum()) if not prior.empty else 0.0
            late_service_games = float(prior["rg_flow_late_service_games"].sum()) if not prior.empty else 0.0
            late_return_games = float(prior["rg_flow_late_return_games"].sum()) if not prior.empty else 0.0
            rows.append(
                {
                    "match_id": match.get("match_id"),
                    "normalized_name": normalized_name,
                    "rg_flow_games": replay_games,
                    "rg_flow_service_games": service_games,
                    "rg_flow_hold_rate": float(prior["rg_flow_holds"].sum()) / service_games if service_games else np.nan,
                    "rg_flow_breaks_lost_rate": float(prior["rg_flow_breaks_lost"].sum()) / service_games if service_games else np.nan,
                    "rg_flow_long_service_games": long_service_games,
                    "rg_flow_long_service_hold_rate": float(prior["rg_flow_long_service_holds"].sum()) / long_service_games if long_service_games else np.nan,
                    "rg_flow_late_service_games": late_service_games,
                    "rg_flow_late_service_hold_rate": float(prior["rg_flow_late_service_holds"].sum()) / late_service_games if late_service_games else np.nan,
                    "rg_flow_return_games": return_games,
                    "rg_flow_break_rate": float(prior["rg_flow_breaks_won"].sum()) / return_games if return_games else np.nan,
                    "rg_flow_long_return_games": long_return_games,
                    "rg_flow_long_return_break_rate": float(prior["rg_flow_long_return_breaks_won"].sum()) / long_return_games if long_return_games else np.nan,
                    "rg_flow_late_return_games": late_return_games,
                    "rg_flow_late_return_break_rate": float(prior["rg_flow_late_return_breaks_won"].sum()) / late_return_games if late_return_games else np.nan,
                    "rg_flow_long_game_rate": float(prior["rg_flow_long_games"].sum()) / replay_games if replay_games else np.nan,
                }
            )
    return pd.DataFrame(rows, columns=columns)


def sofascore_match_minutes(raw_json: str | None) -> float | None:
    if not raw_json:
        return None
    try:
        payload = json.loads(raw_json)
    except (TypeError, json.JSONDecodeError):
        return None
    event = (((payload.get("payloads") or {}).get("event") or {}).get("body") or {}).get("event") or {}
    time_payload = event.get("time") or {}
    seconds = 0.0
    for key, value in time_payload.items():
        if not str(key).startswith("period"):
            continue
        try:
            number = float(value)
        except (TypeError, ValueError):
            continue
        if math.isfinite(number) and number > 0:
            seconds += number
    if seconds <= 0:
        return None
    return round(seconds / 60, 2)


def prior_time_on_court_table(matches: pd.DataFrame, sofascore_matches: pd.DataFrame) -> pd.DataFrame:
    columns = [
        "match_id",
        "normalized_name",
        "rg_time_matches",
        "rg_time_total_minutes",
        "rg_time_avg_minutes",
        "rg_time_recent_avg_minutes",
        "rg_time_max_minutes",
        "rg_time_long_match_rate",
        "rg_time_two_day_minutes",
    ]
    if matches.empty or sofascore_matches.empty:
        return pd.DataFrame(columns=columns)

    time_rows: list[dict[str, Any]] = []
    for _, match in sofascore_matches.iterrows():
        minutes = sofascore_match_minutes(match.get("raw_json"))
        if minutes is None:
            continue
        for normalized_name in [match.get("home_normalized_name"), match.get("away_normalized_name")]:
            if not normalized_name:
                continue
            time_rows.append(
                {
                    "slate_date": str(match.get("slate_date") or ""),
                    "normalized_name": normalized_name,
                    "minutes": float(minutes),
                }
            )
    time_df = pd.DataFrame(time_rows)
    if time_df.empty:
        return pd.DataFrame(columns=columns)
    time_df["_date"] = pd.to_datetime(time_df["slate_date"], errors="coerce")

    rows: list[dict[str, Any]] = []
    for _, match in matches.iterrows():
        slate_date = str(match.get("slate_date") or "")
        match_date = pd.to_datetime(slate_date, errors="coerce")
        for normalized_name in [match.get("player1_normalized_name"), match.get("player2_normalized_name")]:
            if not normalized_name:
                continue
            prior = time_df[(time_df["normalized_name"] == normalized_name) & (time_df["slate_date"] < slate_date)].sort_values("_date")
            if prior.empty:
                rows.append({"match_id": match.get("match_id"), "normalized_name": normalized_name})
                continue
            recent = prior.tail(3)
            two_day_minutes = np.nan
            if pd.notna(match_date):
                two_day = prior[pd.notna(prior["_date"]) & ((match_date - prior["_date"]).dt.days.between(0, 2))]
                two_day_minutes = float(two_day["minutes"].sum()) if not two_day.empty else 0.0
            rows.append(
                {
                    "match_id": match.get("match_id"),
                    "normalized_name": normalized_name,
                    "rg_time_matches": int(len(prior)),
                    "rg_time_total_minutes": round(float(prior["minutes"].sum()), 1),
                    "rg_time_avg_minutes": round(float(prior["minutes"].mean()), 1),
                    "rg_time_recent_avg_minutes": round(float(recent["minutes"].mean()), 1),
                    "rg_time_max_minutes": round(float(prior["minutes"].max()), 1),
                    "rg_time_long_match_rate": round(float((prior["minutes"] >= 150).mean()), 3),
                    "rg_time_two_day_minutes": round(two_day_minutes, 1) if pd.notna(two_day_minutes) else np.nan,
                }
            )
    return pd.DataFrame(rows, columns=columns)


def hold_pct_from_points(first_serve_pct: Any, first_won_pct: Any, second_won_pct: Any) -> float | None:
    first_in = pd.to_numeric(pd.Series([first_serve_pct]), errors="coerce").iloc[0]
    first_won = pd.to_numeric(pd.Series([first_won_pct]), errors="coerce").iloc[0]
    second_won = pd.to_numeric(pd.Series([second_won_pct]), errors="coerce").iloc[0]
    if pd.isna(first_in) or pd.isna(first_won) or pd.isna(second_won):
        return None
    point_win = (float(first_in) / 100 * float(first_won) / 100) + ((1 - float(first_in) / 100) * float(second_won) / 100)
    point_win = min(0.95, max(0.05, point_win))
    point_loss = 1 - point_win
    before_deuce = point_win**4 * (1 + 4 * point_loss + 10 * point_loss**2)
    deuce = 20 * point_win**3 * point_loss**3
    deuce_win = point_win**2 / (point_win**2 + point_loss**2)
    return round((before_deuce + deuce * deuce_win) * 100, 2)


def player_page_stats_table(player_page_stats: pd.DataFrame) -> pd.DataFrame:
    columns = [
        "slate_date",
        "normalized_name",
        "pps_surface",
        "pps_matches",
        "pps_win_pct",
        "pps_hold_pct",
        "pps_first_serve_pct",
        "pps_first_serve_won_pct",
        "pps_second_serve_won_pct",
        "pps_aces",
        "pps_double_faults",
        "pps_bp_saved_pct",
        "pps_bp_converted_pct",
        "pps_tiebreaks_won_pct",
    ]
    if player_page_stats.empty:
        return pd.DataFrame(columns=columns)
    stats = player_page_stats.copy()
    stats["surface_priority"] = np.where(stats["surface"].astype(str).str.lower().eq("all surfaces"), 1, 0)
    stats = stats.sort_values(["as_of_date", "normalized_name", "surface", "surface_priority"]).drop_duplicates(
        ["as_of_date", "normalized_name", "surface"], keep="first"
    )
    out = pd.DataFrame(
        {
            "slate_date": stats["as_of_date"].astype(str),
            "normalized_name": stats["normalized_name"].astype(str),
            "pps_surface": stats["surface"].astype(str),
            "pps_matches": pd.to_numeric(stats.get("matches_total"), errors="coerce"),
            "pps_win_pct": pd.to_numeric(stats.get("matches_won_pct"), errors="coerce"),
            "pps_first_serve_pct": pd.to_numeric(stats.get("first_serve_pct"), errors="coerce"),
            "pps_first_serve_won_pct": pd.to_numeric(stats.get("first_serve_won_pct"), errors="coerce"),
            "pps_second_serve_won_pct": pd.to_numeric(stats.get("second_serve_won_pct"), errors="coerce"),
            "pps_aces": pd.to_numeric(stats.get("aces_per_match"), errors="coerce"),
            "pps_double_faults": pd.to_numeric(stats.get("double_faults_per_match"), errors="coerce"),
            "pps_bp_saved_pct": pd.to_numeric(stats.get("break_points_saved_pct"), errors="coerce"),
            "pps_bp_converted_pct": pd.to_numeric(stats.get("break_points_converted_pct"), errors="coerce"),
            "pps_tiebreaks_won_pct": pd.to_numeric(stats.get("tiebreaks_won_pct"), errors="coerce"),
        }
    )
    out["pps_hold_pct"] = [
        hold_pct_from_points(first_in, first_won, second_won)
        for first_in, first_won, second_won in zip(
            out["pps_first_serve_pct"],
            out["pps_first_serve_won_pct"],
            out["pps_second_serve_won_pct"],
        )
    ]
    return out[columns]


def build_player_rows(tables: dict[str, pd.DataFrame]) -> pd.DataFrame:
    ctx = tables["context"].copy()
    matches = tables["matches"].copy()
    if not matches.empty and "match_id" in matches.columns:
        match_keep = [column for column in ["match_id", "slate_date", "surface"] if column in matches.columns]
        if match_keep:
            match_meta = matches[match_keep].drop_duplicates("match_id")
            for column in ("slate_date", "surface"):
                if column in ctx.columns and column in match_meta.columns:
                    match_meta = match_meta.rename(columns={column: f"match_{column}"})
            ctx = ctx.merge(match_meta, how="left", on="match_id")
            if "slate_date" not in ctx.columns and "slate_date" in match_meta.columns:
                ctx["slate_date"] = ctx["slate_date"]
            if "match_slate_date" in ctx.columns:
                if "slate_date" not in ctx.columns:
                    ctx["slate_date"] = ctx["match_slate_date"]
                else:
                    ctx["slate_date"] = ctx["slate_date"].combine_first(ctx["match_slate_date"])
            if "match_surface" in ctx.columns:
                if "surface" not in ctx.columns:
                    ctx["surface"] = ctx["match_surface"]
                else:
                    ctx["surface"] = ctx["surface"].combine_first(ctx["match_surface"])
    metric_df = weighted_metric_table(tables["metrics"])
    market_df = market_table(tables["markets"])
    replay_df = prior_replay_flow_table(tables["matches"], tables.get("replay_flow", pd.DataFrame()))
    time_df = prior_time_on_court_table(tables["matches"], tables.get("sofascore_matches", pd.DataFrame()))
    page_stats_df = player_page_stats_table(tables.get("player_page_stats", pd.DataFrame()))
    ctx["name_key"] = ctx["normalized_name"].map(name_key)
    metric_df["name_key"] = metric_df["normalized_name"].map(name_key) if "normalized_name" in metric_df.columns else ""
    rows = ctx.merge(metric_df, how="left", on=["match_id", "normalized_name"])
    rows = rows.merge(market_df, how="left", on=["match_id", "normalized_name"])
    rows = rows.merge(replay_df, how="left", on=["match_id", "normalized_name"])
    rows = rows.merge(time_df, how="left", on=["match_id", "normalized_name"])
    if not page_stats_df.empty:
        pps_value_columns = [column for column in page_stats_df.columns if column.startswith("pps_") and column != "pps_surface"]
        rows["match_surface_key"] = rows.get("surface", pd.Series("Unknown", index=rows.index)).map(surface_key)
        exact_stats = page_stats_df.copy()
        exact_stats["match_surface_key"] = exact_stats["pps_surface"].map(surface_key)
        rows = rows.merge(exact_stats, how="left", on=["slate_date", "normalized_name", "match_surface_key"])
        all_surface_stats = page_stats_df[page_stats_df["pps_surface"].map(surface_key).eq("all surfaces")].copy()
        all_surface_stats = all_surface_stats.drop(columns=["match_surface_key"], errors="ignore").add_suffix("_all")
        all_surface_stats = all_surface_stats.rename(
            columns={"slate_date_all": "slate_date", "normalized_name_all": "normalized_name"}
        )
        rows = rows.merge(all_surface_stats, how="left", on=["slate_date", "normalized_name"])
        for column in pps_value_columns:
            all_column = f"{column}_all"
            if column in rows.columns and all_column in rows.columns:
                rows[column] = rows[column].combine_first(rows[all_column])
        if "pps_surface_all" in rows.columns:
            rows["pps_surface"] = rows.get("pps_surface", pd.Series(index=rows.index)).combine_first(rows["pps_surface_all"])
        rows = rows.drop(columns=[column for column in rows.columns if column.endswith("_all")], errors="ignore")
    else:
        rows = rows.merge(page_stats_df, how="left", on=["slate_date", "normalized_name"])

    missing_market = rows["market_prob"].isna() if "market_prob" in rows.columns else pd.Series(False, index=rows.index)
    if missing_market.any() and not market_df.empty:
        market_by_key = market_df.drop(columns=["normalized_name"], errors="ignore").add_prefix("key_")
        market_by_key = market_by_key.rename(columns={"key_match_id": "match_id", "key_name_key": "name_key"})
        rows = rows.merge(market_by_key, how="left", on=["match_id", "name_key"])
        for column in [
            "source_name",
            "market_prob",
            "market_amount",
            "market_total_volume",
            "price_band",
            "cents_at_risk",
            "cents_profit_if_win",
        ]:
            key_column = f"key_{column}"
            if column in rows.columns and key_column in rows.columns:
                rows[column] = rows[column].combine_first(rows[key_column])
        rows = rows.drop(columns=[col for col in rows.columns if col.startswith("key_")], errors="ignore")
    numeric_cols = [
        "rank",
        "ranking_points",
        "ranking_age",
        "overall_win_pct",
        "overall_wins",
        "overall_losses",
        "clay_win_pct",
        "clay_wins",
        "clay_losses",
        "recent_matches",
        "recent_win_pct",
        "recent_set_pct",
        "recent_game_pct",
        "resistance_matches",
        "straight_set_wins",
        "straight_set_losses",
        "known_opponent_ranks",
        "missing_opponent_ranks",
        "ranking_coverage_pct",
        "avg_known_opponent_rank",
        "top10_opponents",
        "top25_opponents",
        "top50_opponents",
        "challenger_or_itf_matches",
        "scoreline_form_score",
        "opponent_adjusted_form_score",
        "metric_hold",
        "metric_secondServe",
        "metric_errorControl",
        "metric_returnPressure",
        "metric_closeout",
        "market_prob",
        "market_amount",
        "market_total_volume",
        "cents_at_risk",
        "cents_profit_if_win",
        "rg_flow_games",
        "rg_flow_service_games",
        "rg_flow_hold_rate",
        "rg_flow_breaks_lost_rate",
        "rg_flow_long_service_games",
        "rg_flow_long_service_hold_rate",
        "rg_flow_late_service_games",
        "rg_flow_late_service_hold_rate",
        "rg_flow_return_games",
        "rg_flow_break_rate",
        "rg_flow_long_return_games",
        "rg_flow_long_return_break_rate",
        "rg_flow_late_return_games",
        "rg_flow_late_return_break_rate",
        "rg_flow_long_game_rate",
        "rg_time_matches",
        "rg_time_total_minutes",
        "rg_time_avg_minutes",
        "rg_time_recent_avg_minutes",
        "rg_time_max_minutes",
        "rg_time_long_match_rate",
        "rg_time_two_day_minutes",
        "pps_matches",
        "pps_win_pct",
        "pps_hold_pct",
        "pps_first_serve_pct",
        "pps_first_serve_won_pct",
        "pps_second_serve_won_pct",
        "pps_aces",
        "pps_double_faults",
        "pps_bp_saved_pct",
        "pps_bp_converted_pct",
        "pps_tiebreaks_won_pct",
    ]
    for column in numeric_cols:
        if column in rows.columns:
            rows[column] = pd.to_numeric(rows[column], errors="coerce")
    rows["rank_quality"] = -np.log1p(rows["rank"].fillna(350))
    rows["avg_opp_rank_quality"] = -np.log1p(rows["avg_known_opponent_rank"].fillna(250))
    rows["clay_match_count"] = rows["clay_wins"].fillna(0) + rows["clay_losses"].fillna(0)
    rows["overall_match_count"] = rows["overall_wins"].fillna(0) + rows["overall_losses"].fillna(0)
    rows["straight_set_margin"] = rows["straight_set_wins"].fillna(0) - rows["straight_set_losses"].fillna(0)
    rows["recent_resistance_rate"] = rows["resistance_matches"] / rows["recent_matches"].replace(0, np.nan)
    return rows


def build_samples(tables: dict[str, pd.DataFrame]) -> pd.DataFrame:
    matches = tables["matches"].copy()
    players = build_player_rows(tables)
    grades = tables["grades"].copy()
    results = tables.get("results", pd.DataFrame()).copy()
    if grades.empty:
        grades = pd.DataFrame(
            columns=["slate_date", "match_id", "actual_winner_name", "hit", "confidence", "volatility", "result_status"]
        )
    else:
        grades = grades[
            ["slate_date", "match_id", "actual_winner_name", "hit", "confidence", "volatility", "result_status"]
        ].drop_duplicates("match_id")
    base = matches.merge(grades, how="left", on=["slate_date", "match_id"], suffixes=("", "_grade"))
    weather = tables.get("weather", pd.DataFrame()).copy()
    if not weather.empty:
        weather_keep = [
            "match_id",
            "duration_minutes",
            "avg_temperature_c",
            "max_temperature_c",
            "min_temperature_c",
            "avg_apparent_temperature_c",
            "max_apparent_temperature_c",
            "avg_humidity_pct",
            "total_precipitation_mm",
            "total_rain_mm",
            "avg_cloud_cover_pct",
            "avg_wind_speed_kmh",
            "max_wind_gust_kmh",
            "avg_surface_pressure_hpa",
            "avg_shortwave_radiation_wm2",
            "max_shortwave_radiation_wm2",
            "hot_match",
            "humid_match",
            "windy_match",
            "rain_affected",
        ]
        weather = weather[[column for column in weather_keep if column in weather.columns]].copy()
        weather = weather.rename(columns={column: f"weather_{column}" for column in weather.columns if column != "match_id"})
        for column in weather.columns:
            if column != "match_id":
                weather[column] = pd.to_numeric(weather[column], errors="coerce")
        base = base.merge(weather, how="left", on="match_id")
    if not results.empty:
        matches["_result_pair_key"] = matches.apply(
            lambda row: match_pair_key(row.get("player1_normalized_name"), row.get("player2_normalized_name")),
            axis=1,
        )
        results["_result_pair_key"] = results.apply(
            lambda row: match_pair_key(row.get("player1_normalized_name"), row.get("player2_normalized_name")),
            axis=1,
        )
        result_labels = results[
            [
                "slate_date",
                "_result_pair_key",
                "winner_name",
                "winner_normalized_name",
                "status",
                "completed",
                "scoreline",
                "event_id",
            ]
        ].drop_duplicates(["slate_date", "_result_pair_key"], keep="last")
        base["_result_pair_key"] = base.apply(
            lambda row: match_pair_key(row.get("player1_normalized_name"), row.get("player2_normalized_name")),
            axis=1,
        )
        base = base.merge(result_labels, how="left", on=["slate_date", "_result_pair_key"])
        base["actual_winner_name"] = base["actual_winner_name"].combine_first(base["winner_name"])
        base["result_status"] = base["result_status"].combine_first(base["status"])
        base["result_completed"] = pd.to_numeric(base["completed"], errors="coerce")
        base["result_scoreline"] = base["scoreline"]
        missing_result = base["actual_winner_name"].isna()
        if missing_result.any():
            for index, row in base[missing_result].iterrows():
                day_results = result_labels[result_labels["slate_date"].astype(str) == str(row.get("slate_date") or "")]
                fuzzy = fuzzy_result_for_match(row, day_results)
                if fuzzy is None:
                    continue
                base.at[index, "winner_name"] = fuzzy.get("winner_name")
                base.at[index, "winner_normalized_name"] = fuzzy.get("winner_normalized_name")
                base.at[index, "status"] = fuzzy.get("status")
                base.at[index, "completed"] = fuzzy.get("completed")
                base.at[index, "scoreline"] = fuzzy.get("scoreline")
                base.at[index, "event_id"] = fuzzy.get("event_id")
                base.at[index, "actual_winner_name"] = fuzzy.get("winner_name")
                base.at[index, "result_status"] = fuzzy.get("status")
                base.at[index, "result_completed"] = pd.to_numeric(pd.Series([fuzzy.get("completed")]), errors="coerce").iloc[0]
                base.at[index, "result_scoreline"] = fuzzy.get("scoreline")
        direct_hit = base["desk_pick_name"].map(normalize_name).eq(base["winner_normalized_name"].fillna(""))
        base["hit"] = base["hit"].combine_first(direct_hit.where(base["winner_normalized_name"].notna()).astype("float"))
    else:
        base["result_completed"] = np.nan
        base["result_scoreline"] = np.nan

    p1 = players[players["player_slot"] == 1].copy()
    p2 = players[players["player_slot"] == 2].copy()
    p1 = p1.add_prefix("p1_").rename(columns={"p1_match_id": "match_id"})
    p2 = p2.add_prefix("p2_").rename(columns={"p2_match_id": "match_id"})
    df = base.merge(p1, how="left", on="match_id").merge(p2, how="left", on="match_id")

    # Some upstream player-context rows can be missing or use reversed name order
    # (for example "Xiyu Wang" vs "Wang Xiyu"). Keep the ML/EV layer alive by
    # filling market fields directly from the match side names.
    market_df = market_table(tables["markets"])
    if not market_df.empty:
        for side in ("p1", "p2"):
            player_col = "player1_normalized_name" if side == "p1" else "player2_normalized_name"
            direct = market_df.add_prefix(f"{side}_direct_").rename(
                columns={
                    f"{side}_direct_match_id": "match_id",
                    f"{side}_direct_normalized_name": player_col,
                }
            )
            df = df.merge(direct, how="left", on=["match_id", player_col])
            df[f"{side}_name_key"] = df[player_col].map(name_key)
            keyed = market_df.drop(columns=["normalized_name"], errors="ignore").add_prefix(f"{side}_key_").rename(
                columns={
                    f"{side}_key_match_id": "match_id",
                    f"{side}_key_name_key": f"{side}_name_key",
                }
            )
            df = df.merge(keyed, how="left", on=["match_id", f"{side}_name_key"])
            for column in [
                "source_name",
                "market_prob",
                "market_amount",
                "market_total_volume",
                "price_band",
                "cents_at_risk",
                "cents_profit_if_win",
            ]:
                target = f"{side}_{column}"
                direct_col = f"{side}_direct_{column}"
                key_col = f"{side}_key_{column}"
                if target not in df.columns:
                    df[target] = np.nan
                if direct_col in df.columns:
                    df[target] = df[target].combine_first(df[direct_col])
                if key_col in df.columns:
                    df[target] = df[target].combine_first(df[key_col])
            drop_prefixes = (f"{side}_direct_", f"{side}_key_")
            df = df.drop(columns=[col for col in df.columns if col.startswith(drop_prefixes)], errors="ignore")

    df["winner_norm"] = df["actual_winner_name"].map(normalize_name)
    p1_win = [
        1 if names_likely_match(winner, player1) else 0 if names_likely_match(winner, player2) else np.nan
        for winner, player1, player2 in zip(
            df["actual_winner_name"],
            df["player1_name"],
            df["player2_name"],
        )
    ]
    df["label_p1_win"] = p1_win
    if "surface" not in df.columns:
        df["surface"] = np.nan
    df["surface"] = df.apply(infer_match_surface, axis=1)
    surface_keys = df["surface"].map(surface_key)
    df["is_clay_match"] = surface_keys.eq("clay").astype(int)
    df["is_hard_match"] = surface_keys.eq("hard").astype(int)
    df["is_grass_match"] = surface_keys.eq("grass").astype(int)
    df["surface_unknown"] = surface_keys.isin({"unknown", ""}).astype(int)
    non_clay = ~surface_keys.eq("clay")
    for side in ("p1", "p2"):
        for column in ("clay_win_pct", "clay_wins", "clay_losses", "clay_match_count"):
            full_column = f"{side}_{column}"
            if full_column in df.columns:
                df.loc[non_clay, full_column] = np.nan
    feature_bases = [
        "rank_quality",
        "ranking_points",
        "ranking_age",
        "overall_win_pct",
        "overall_match_count",
        "clay_win_pct",
        "clay_match_count",
        "recent_matches",
        "recent_win_pct",
        "recent_set_pct",
        "recent_game_pct",
        "recent_resistance_rate",
        "straight_set_margin",
        "ranking_coverage_pct",
        "avg_opp_rank_quality",
        "top10_opponents",
        "top25_opponents",
        "top50_opponents",
        "challenger_or_itf_matches",
        "scoreline_form_score",
        "opponent_adjusted_form_score",
        "metric_hold",
        "metric_secondServe",
        "metric_errorControl",
        "metric_returnPressure",
        "metric_closeout",
        "rg_flow_games",
        "rg_flow_service_games",
        "rg_flow_hold_rate",
        "rg_flow_breaks_lost_rate",
        "rg_flow_long_service_games",
        "rg_flow_long_service_hold_rate",
        "rg_flow_late_service_games",
        "rg_flow_late_service_hold_rate",
        "rg_flow_return_games",
        "rg_flow_break_rate",
        "rg_flow_long_return_games",
        "rg_flow_long_return_break_rate",
        "rg_flow_late_return_games",
        "rg_flow_late_return_break_rate",
        "rg_flow_long_game_rate",
        "rg_time_matches",
        "rg_time_total_minutes",
        "rg_time_avg_minutes",
        "rg_time_recent_avg_minutes",
        "rg_time_max_minutes",
        "rg_time_long_match_rate",
        "rg_time_two_day_minutes",
        "pps_matches",
        "pps_win_pct",
        "pps_hold_pct",
        "pps_first_serve_pct",
        "pps_first_serve_won_pct",
        "pps_second_serve_won_pct",
        "pps_aces",
        "pps_double_faults",
        "pps_bp_saved_pct",
        "pps_bp_converted_pct",
        "pps_tiebreaks_won_pct",
        "market_prob",
        "cents_at_risk",
        "cents_profit_if_win",
    ]
    for base_name in feature_bases:
        left = f"p1_{base_name}"
        right = f"p2_{base_name}"
        if left in df.columns and right in df.columns:
            df[f"diff_{base_name}"] = pd.to_numeric(df[left], errors="coerce") - pd.to_numeric(df[right], errors="coerce")
            df[f"absdiff_{base_name}"] = df[f"diff_{base_name}"].abs()
    df["is_wta"] = df["league"].astype(str).str.upper().str.contains("WTA|WOMEN").astype(int)
    df["is_atp"] = df["league"].astype(str).str.upper().str.contains("ATP|MEN").astype(int)
    return sanitize_numeric_frame(df)


def feature_columns(df: pd.DataFrame, include_market: bool) -> list[str]:
    experimental_prefixes = (
        "diff_rg_flow_long_",
        "absdiff_rg_flow_long_",
        "diff_rg_flow_late_",
        "absdiff_rg_flow_late_",
        "diff_rg_time_",
        "absdiff_rg_time_",
    )
    columns = [
        column
        for column in df.columns
        if (
            column.startswith("diff_")
            or column.startswith("absdiff_")
            or column.startswith("weather_")
            or column in {"is_wta", "is_atp", "is_clay_match", "is_hard_match", "is_grass_match", "surface_unknown"}
        )
        and not column.startswith(experimental_prefixes)
    ]
    if not include_market:
        columns = [column for column in columns if "market" not in column and "cents_" not in column]
    return columns


def model_specs(train_size: int) -> list[tuple[str, Any]]:
    specs: list[tuple[str, Any]] = [
        (
            "logit_l1",
            Pipeline(
                [
                    ("impute", SimpleImputer(strategy="median")),
                    ("scale", StandardScaler()),
                    (
                        "model",
                        LogisticRegression(
                            penalty="l1",
                            solver="liblinear",
                            C=0.45,
                            class_weight="balanced",
                            random_state=7,
                            max_iter=1000,
                        ),
                    ),
                ]
            ),
        ),
        (
            "random_forest",
            Pipeline(
                [
                    ("impute", SimpleImputer(strategy="median")),
                    (
                        "model",
                        RandomForestClassifier(
                            n_estimators=300,
                            min_samples_leaf=5,
                            max_features="sqrt",
                            class_weight="balanced_subsample",
                            random_state=11,
                        ),
                    ),
                ]
            ),
        ),
        (
            "grad_boost",
            Pipeline(
                [
                    ("impute", SimpleImputer(strategy="median")),
                    (
                        "model",
                        GradientBoostingClassifier(
                            n_estimators=80,
                            learning_rate=0.045,
                            max_depth=2,
                            min_samples_leaf=5,
                            random_state=13,
                        ),
                    ),
                ]
            ),
        ),
    ]
    if XGBClassifier is not None and train_size >= 24:
        specs.append(
            (
                "xgboost",
                Pipeline(
                    [
                        ("impute", SimpleImputer(strategy="median")),
                        (
                            "model",
                            XGBClassifier(
                                n_estimators=90,
                                max_depth=2,
                                learning_rate=0.045,
                                subsample=0.85,
                                colsample_bytree=0.85,
                                reg_lambda=4.0,
                                min_child_weight=4,
                                eval_metric="logloss",
                                random_state=17,
                            ),
                        ),
                    ]
                ),
            )
        )
    return specs


def fit_predict_ensemble(
    train: pd.DataFrame,
    test: pd.DataFrame,
    features: list[str],
    label_col: str = "label_p1_win",
) -> tuple[np.ndarray, list[ModelResult]]:
    train = train.dropna(subset=[label_col])
    y = train[label_col].astype(int).to_numpy()
    if len(np.unique(y)) < 2:
        base = np.repeat(float(np.mean(y)) if len(y) else 0.5, len(test))
        return base, [ModelResult("base_rate", base)]
    model_predictions: list[ModelResult] = []
    X_train = train[features]
    X_test = test[features]
    for name, model in model_specs(len(train)):
        try:
            with warnings.catch_warnings():
                warnings.filterwarnings("ignore", category=RuntimeWarning, module="sklearn.utils.extmath")
                model.fit(X_train, y)
            pred = model.predict_proba(X_test)[:, 1]
            clipped = np.clip(pred, 0.08, 0.92)
            model_predictions.append(ModelResult(name, clipped))
        except Exception as exc:
            print(f"warn: skipped {name}: {exc}")
    if not model_predictions:
        base = np.repeat(float(np.mean(y)), len(test))
        return base, [ModelResult("base_rate", base)]
    ensemble = np.mean([result.predictions for result in model_predictions], axis=0)
    # Tournament tennis has high upset variance. Keep the ensemble calibrated away
    # from fake 80%+ confidence unless all models agree.
    ensemble = 0.5 + (ensemble - 0.5) * 0.82
    return np.clip(ensemble, 0.10, 0.90), model_predictions


def market_adjust_probability(data_prob: pd.Series, market_prob: pd.Series | None) -> pd.Series:
    data_prob = pd.to_numeric(data_prob, errors="coerce").fillna(0.5).clip(0.08, 0.92)
    if market_prob is None:
        return data_prob
    market_prob = pd.to_numeric(market_prob, errors="coerce")
    blended = data_prob.copy()
    has_market = market_prob.notna()
    disagreement = (data_prob - market_prob).abs()
    # Market is not the pick source, but it is a useful sanity/calibration layer.
    # When the warehouse model strongly disagrees, keep most of the data signal;
    # when the gap is tiny, let price/market clean up calibration.
    market_weight = np.where(disagreement >= 0.18, 0.18, np.where(disagreement >= 0.10, 0.25, 0.35))
    blended.loc[has_market] = (
        data_prob.loc[has_market] * (1 - market_weight[has_market])
        + market_prob.loc[has_market] * market_weight[has_market]
    )
    return blended.clip(0.08, 0.92)


def pps_pressure_adjustment(row: pd.Series) -> float:
    """Small current-slate adjustment from SofaScore player-page pressure stats.

    These rows are new, so they are not allowed to dominate the trained model yet.
    They are matched by surface when possible and otherwise fall back to all-surface
    stats, then act as a conservative pre-match nudge for serve comfort and
    break-pressure shape until we have enough backfilled history to learn the
    weights directly.
    """
    samples = [
        pd.to_numeric(pd.Series([row.get("p1_pps_matches")]), errors="coerce").iloc[0],
        pd.to_numeric(pd.Series([row.get("p2_pps_matches")]), errors="coerce").iloc[0],
    ]
    valid_samples = [float(value) for value in samples if pd.notna(value) and float(value) > 0]
    if not valid_samples:
        return 0.0
    sample_weight = min(1.0, min(valid_samples) / 8.0)

    def diff(name: str) -> float:
        value = pd.to_numeric(pd.Series([row.get(f"diff_pps_{name}")]), errors="coerce").iloc[0]
        return float(value) if pd.notna(value) else 0.0

    raw_adjustment = (
        diff("hold_pct") * 0.0016
        + diff("first_serve_won_pct") * 0.0007
        + diff("second_serve_won_pct") * 0.001
        + diff("bp_saved_pct") * 0.00055
        + diff("bp_converted_pct") * 0.00065
        + diff("tiebreaks_won_pct") * 0.00025
        + diff("aces") * 0.002
        - diff("double_faults") * 0.005
    )
    return float(np.clip(raw_adjustment * sample_weight, -0.06, 0.06))


def clutch_workload_adjustment(row: pd.Series) -> float:
    """Small prior-only adjustment for long games, late games, and workload.

    Long games (8+ points) proxy deuce pressure in SofaScore replay rows. Late
    games (game 9+) proxy closeout/set-end pressure. The signal is intentionally
    capped because replay coverage is still incomplete before May 28.
    """

    def value(name: str) -> float:
        raw = pd.to_numeric(pd.Series([row.get(name)]), errors="coerce").iloc[0]
        return float(raw) if pd.notna(raw) else 0.0

    def diff(name: str) -> float:
        return value(f"diff_{name}")

    long_service_sample = min(value("p1_rg_flow_long_service_games"), value("p2_rg_flow_long_service_games"))
    long_return_sample = min(value("p1_rg_flow_long_return_games"), value("p2_rg_flow_long_return_games"))
    late_service_sample = min(value("p1_rg_flow_late_service_games"), value("p2_rg_flow_late_service_games"))
    flow_sample_weight = min(1.0, (long_service_sample + long_return_sample + late_service_sample) / 18.0)

    flow_adjustment = (
        diff("rg_flow_long_service_hold_rate") * 0.035
        + diff("rg_flow_long_return_break_rate") * 0.026
        + diff("rg_flow_late_service_hold_rate") * 0.026
        + diff("rg_flow_late_return_break_rate") * 0.020
        - diff("rg_flow_breaks_lost_rate") * 0.018
    ) * flow_sample_weight

    # Long prior matches can mean toughness, but tight recent clusters are more
    # likely fatigue. Keep this small and let learned features carry the rest.
    workload_adjustment = (
        diff("rg_time_long_match_rate") * 0.014
        - diff("rg_time_two_day_minutes") * 0.00008
        - max(0.0, diff("rg_time_recent_avg_minutes") - 35.0) * 0.00005
        + max(0.0, -diff("rg_time_recent_avg_minutes") - 35.0) * 0.00003
    )

    return float(np.clip(flow_adjustment + workload_adjustment, -0.045, 0.045))


def upset_risk_label(row: pd.Series, pick_side: str) -> str:
    prefix = "p1" if pick_side == "player1" else "p2"
    opp = "p2" if pick_side == "player1" else "p1"
    weak = row.get(f"{prefix}_metric_errorControl")
    hold = row.get(f"{prefix}_metric_hold")
    closeout = row.get(f"{prefix}_metric_closeout")
    opp_return = row.get(f"{opp}_metric_returnPressure")
    market_prob = row.get(f"{prefix}_market_prob")
    risks = []
    if pd.notna(market_prob) and float(market_prob) >= 0.72:
        risks.append("taxed favorite")
    if pd.notna(weak) and float(weak) < 52:
        risks.append("error-control risk")
    if pd.notna(hold) and float(hold) < 68:
        risks.append("hold risk")
    if pd.notna(closeout) and float(closeout) < 56:
        risks.append("closeout risk")
    if pd.notna(opp_return) and float(opp_return) >= 75:
        risks.append("opponent return pressure")
    long_service = row.get(f"{prefix}_rg_flow_long_service_hold_rate")
    if pd.notna(long_service) and float(long_service) < 0.55:
        risks.append("long-game serve risk")
    two_day_minutes = row.get(f"{prefix}_rg_time_two_day_minutes")
    if pd.notna(two_day_minutes) and float(two_day_minutes) >= 240:
        risks.append("time-on-court load")
    return ", ".join(risks[:3]) if risks else "clean enough"


def run_model_chain(
    train: pd.DataFrame,
    test: pd.DataFrame,
    label_col: str = "label_p1_win",
) -> tuple[pd.DataFrame, dict[str, Any]]:
    data_features = feature_columns(train, include_market=False)
    data_prob, data_parts = fit_predict_ensemble(train, test, data_features, label_col=label_col)
    out = test.copy()
    out["pressure_adjust_p1"] = out.apply(pps_pressure_adjustment, axis=1)
    out["clutch_workload_adjust_p1"] = out.apply(clutch_workload_adjustment, axis=1)
    out["data_prob_p1"] = np.clip(
        data_prob + out["pressure_adjust_p1"].to_numpy(),
        0.08,
        0.92,
    )
    out["market_prob_p1"] = pd.to_numeric(out.get("p1_market_prob"), errors="coerce")
    out["chain_prob_p1"] = market_adjust_probability(out["data_prob_p1"], out["market_prob_p1"])
    out["chain_models"] = ",".join(part.name for part in data_parts)
    out["chain_pick_side"] = np.where(out["chain_prob_p1"] >= 0.5, "player1", "player2")
    out["chain_pick_name"] = np.where(out["chain_pick_side"].eq("player1"), out["player1_name"], out["player2_name"])
    out["chain_pick_prob"] = np.where(out["chain_pick_side"].eq("player1"), out["chain_prob_p1"], 1 - out["chain_prob_p1"])
    out["chain_upset_risk"] = out.apply(lambda row: upset_risk_label(row, str(row["chain_pick_side"])), axis=1)
    meta = {
        "dataFeatures": len(data_features),
        "stage1": "data-only warehouse ensemble: L1 logistic + random forest + gradient boosting + XGBoost when available",
        "stage2": "market calibration only, never source-pick override",
        "stage3": "small SofaScore player-page pressure adjustment plus tracked prior time-on-court/clutch-flow audit signal, then upset/fragility risk gate from hold, error control, closeout, opponent return pressure, long-game serve risk, time load, and taxed-favorite price",
        "excludedPickSources": ["tennistonic"],
    }
    return out, meta


def evaluate_predictions(frame: pd.DataFrame, prob_col: str, label_col: str = "label_p1_win") -> dict[str, Any]:
    graded = frame.dropna(subset=[label_col, prob_col]).copy()
    if graded.empty:
        return {"rows": 0}
    y = graded[label_col].astype(int)
    prob = graded[prob_col].clip(0.001, 0.999)
    pick_p1 = prob >= 0.5
    hits = (pick_p1.astype(int) == y).sum()
    out: dict[str, Any] = {
        "rows": int(len(graded)),
        "hits": int(hits),
        "hitRate": round(float(hits / len(graded)), 3),
        "brier": round(float(brier_score_loss(y, prob)), 4),
        "logLoss": round(float(log_loss(y, prob)), 4),
    }
    if len(set(y)) > 1:
        out["auc"] = round(float(roc_auc_score(y, prob)), 3)
    return out


def backtest_by_day(samples: pd.DataFrame, include_market: bool) -> tuple[pd.DataFrame, dict[str, Any]]:
    settled = samples.dropna(subset=["label_p1_win"]).copy()
    features = feature_columns(settled, include_market=include_market)
    predictions = []
    for date in sorted(settled["slate_date"].dropna().unique()):
        train = settled[settled["slate_date"] != date]
        test = settled[settled["slate_date"] == date].copy()
        if train.empty or test.empty:
            continue
        if include_market:
            test, chain_meta = run_model_chain(train, test)
            test["ensemble_prob_p1"] = test["chain_prob_p1"]
            test["ensemble_models"] = test["chain_models"]
        else:
            prob, model_parts = fit_predict_ensemble(train, test, features)
            test["ensemble_prob_p1"] = prob
            test["ensemble_models"] = ",".join(part.name for part in model_parts)
        predictions.append(test)
    if not predictions:
        return pd.DataFrame(), {"rows": 0}
    pred_df = pd.concat(predictions, ignore_index=True)
    summary = evaluate_predictions(pred_df, "ensemble_prob_p1")
    summary["features"] = len(features)
    summary["includeMarket"] = include_market
    if include_market:
        summary["chain"] = chain_meta
    return pred_df, summary


def desk_baseline(samples: pd.DataFrame) -> dict[str, Any]:
    settled = samples.dropna(subset=["label_p1_win"]).copy()
    if settled.empty:
        return {"rows": 0}
    settled["desk_pick_p1"] = settled["desk_pick_name"].map(normalize_name).eq(settled["player1_normalized_name"])
    hits = (settled["desk_pick_p1"].astype(int) == settled["label_p1_win"].astype(int)).sum()
    by_day = {}
    for date, group in settled.groupby("slate_date"):
        day_hits = (group["desk_pick_p1"].astype(int) == group["label_p1_win"].astype(int)).sum()
        by_day[date] = {
            "rows": int(len(group)),
            "hits": int(day_hits),
            "hitRate": round(float(day_hits / len(group)), 3),
        }
    return {
        "rows": int(len(settled)),
        "hits": int(hits),
        "hitRate": round(float(hits / len(settled)), 3),
        "byDay": by_day,
    }


def train_for_date(samples: pd.DataFrame, target_date: str, include_market: bool) -> pd.DataFrame:
    train = samples[(samples["slate_date"] < target_date) & samples["label_p1_win"].notna()].copy()
    test = samples[samples["slate_date"] == target_date].copy()
    if train.empty or test.empty:
        raise SystemExit(f"Need both historical labels and target rows for {target_date}.")
    if include_market:
        test, _meta = run_model_chain(train, test)
        test["ensemble_prob_p1"] = test["chain_prob_p1"]
        test["ensemble_models"] = test["chain_models"]
        return test
    features = feature_columns(samples, include_market=include_market)
    prob, model_parts = fit_predict_ensemble(train, test, features)
    test["ensemble_prob_p1"] = prob
    test["ensemble_models"] = ",".join(part.name for part in model_parts)
    return test


def recommendation_rows(frame: pd.DataFrame, value_gate: dict[str, Any] | None = None) -> list[dict[str, Any]]:
    rows = []
    ml_gate_frozen = (value_gate or {}).get("status") == "frozen"
    for _, row in frame.iterrows():
        p1_prob = float(row["ensemble_prob_p1"])
        p2_prob = 1 - p1_prob
        candidates = [
            {
                "side": "player1",
                "selection": row.get("player1_name"),
                "prob": p1_prob,
                "marketProb": row.get("p1_market_prob"),
                "centsAtRisk": row.get("p1_cents_at_risk"),
                "centsProfitIfWin": row.get("p1_cents_profit_if_win"),
            },
            {
                "side": "player2",
                "selection": row.get("player2_name"),
                "prob": p2_prob,
                "marketProb": row.get("p2_market_prob"),
                "centsAtRisk": row.get("p2_cents_at_risk"),
                "centsProfitIfWin": row.get("p2_cents_profit_if_win"),
            },
        ]
        for candidate in candidates:
            market_prob = candidate["marketProb"]
            odds = None
            if pd.notna(market_prob) and float(market_prob) > 0:
                odds = american_from_probability(float(market_prob))
            ev = ev_per_100(candidate["prob"], odds) if odds is not None else None
            market_pct = float(market_prob) if pd.notna(market_prob) else None
            disagreement = abs(candidate["prob"] - market_pct) if market_pct is not None else None
            risk_gate = upset_risk_label(row, candidate["side"])
            grade = "No price"
            if ev is not None and market_pct is not None:
                if disagreement is not None and disagreement >= 0.24 and (market_pct <= 0.18 or candidate["prob"] <= 0.35):
                    grade = "Outlier hold"
                elif (
                    ev >= 8
                    and 0.45 <= candidate["prob"] <= 0.68
                    and 0.28 <= market_pct <= 0.55
                    and odds is not None
                    and odds >= -125
                    and risk_gate == "clean enough"
                ):
                    grade = "Bet-grade ML"
                elif ev >= 8 and 0.45 <= candidate["prob"] <= 0.68 and 0.28 <= market_pct <= 0.55 and odds is not None and odds >= -125:
                    grade = "Risk-gated value"
                elif candidate["prob"] >= 0.62 and odds is not None and -300 <= odds <= -110:
                    grade = "Likely winner, price taxed" if ev < 0 else "Playable favorite"
                elif ev > 0:
                    grade = "Watch only"
                else:
                    grade = "Negative EV"
            if ml_gate_frozen and grade in {"Bet-grade ML", "Risk-gated value"}:
                grade = "Watch only"
                risk_gate = "; ".join([risk_gate, "ML value gate frozen after prior slate"]) if risk_gate else "ML value gate frozen after prior slate"
            rows.append(
                {
                    "matchId": row.get("match_id"),
                    "date": row.get("slate_date"),
                    "start": row.get("start_label"),
                    "match": row.get("title"),
                    "surface": row.get("surface"),
                    "surfaceFlags": {
                        "clay": bool(row.get("is_clay_match")),
                        "hard": bool(row.get("is_hard_match")),
                        "grass": bool(row.get("is_grass_match")),
                        "unknown": bool(row.get("surface_unknown")),
                    },
                    "selection": candidate["selection"],
                    "side": candidate["side"],
                    "modelProbability": round(candidate["prob"] * 100, 1),
                    "fairOdds": american_from_probability(candidate["prob"]),
                    "marketProbability": round(float(market_prob) * 100, 1) if pd.notna(market_prob) else None,
                    "marketFairOdds": odds,
                    "netEvPer100": round(ev, 1) if ev is not None else None,
                    "grade": grade,
                    "marketDisagreementPct": round(disagreement * 100, 1) if disagreement is not None else None,
                    "rank": int(row.get(f"{'p1' if candidate['side'] == 'player1' else 'p2'}_rank"))
                if pd.notna(row.get(f"{'p1' if candidate['side'] == 'player1' else 'p2'}_rank"))
                else None,
                "opponent": row.get("player2_name") if candidate["side"] == "player1" else row.get("player1_name"),
                "modelBlend": row.get("ensemble_models"),
                "dataOnlyProbability": round(
                    (
                        float(row.get("data_prob_p1"))
                        if candidate["side"] == "player1"
                        else 1 - float(row.get("data_prob_p1"))
                    )
                    * 100,
                    1,
                )
                    if pd.notna(row.get("data_prob_p1"))
                    else None,
                "riskGate": risk_gate,
            }
        )
    grade_rank = {
        "Bet-grade ML": 5,
        "Playable favorite": 4,
        "Risk-gated value": 3,
        "Likely winner, price taxed": 3,
        "Watch only": 2,
        "Outlier hold": 1,
        "Negative EV": 0,
        "No price": -1,
    }
    rows.sort(
        key=lambda item: (
            grade_rank.get(item["grade"], -1),
            item["netEvPer100"] if item["netEvPer100"] is not None else -999,
            item["modelProbability"],
        ),
        reverse=True,
    )
    return rows


def write_report(date: str, payload: dict[str, Any]) -> None:
    REPORTS_DIR.mkdir(parents=True, exist_ok=True)
    PREDICTIONS_DIR.mkdir(parents=True, exist_ok=True)
    report_path = REPORTS_DIR / f"tennis-multimodel-backtest-through-{date}.json"
    report_path.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    pred_path = PREDICTIONS_DIR / f"{date}-multimodel-ensemble.json"
    pred_path.write_text(json.dumps(payload["targetPredictions"], indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"Wrote {report_path.relative_to(ROOT)}")
    print(f"Wrote {pred_path.relative_to(ROOT)}")


def persist_training_corpus(samples: pd.DataFrame, target_date: str) -> dict[str, Any]:
    MODELS_DIR.mkdir(parents=True, exist_ok=True)
    corpus = sanitize_numeric_frame(samples).copy()
    corpus = corpus.assign(
        training_label_available=corpus["label_p1_win"].notna().astype(int),
        training_label_source=np.where(corpus["actual_winner_name"].notna(), "tennis_match_results", None),
        desk_pick_hit=pd.to_numeric(corpus.get("hit"), errors="coerce"),
    )

    ordered_columns = [
        "match_id",
        "slate_date",
        "league",
        "title",
        "stage",
        "start_label",
        "start_minutes",
        "player1_name",
        "player2_name",
        "player1_normalized_name",
        "player2_normalized_name",
        "actual_winner_name",
        "winner_norm",
        "result_status",
        "result_completed",
        "result_scoreline",
        "label_p1_win",
        "training_label_available",
        "training_label_source",
        "desk_pick_name",
        "desk_confidence",
        "desk_volatility",
        "desk_pick_hit",
        "p1_market_prob",
        "p2_market_prob",
        "p1_cents_at_risk",
        "p2_cents_at_risk",
        "p1_cents_profit_if_win",
        "p2_cents_profit_if_win",
        "p1_rg_flow_games",
        "p2_rg_flow_games",
        "p1_rg_flow_hold_rate",
        "p2_rg_flow_hold_rate",
        "p1_rg_flow_break_rate",
        "p2_rg_flow_break_rate",
        "p1_rg_flow_breaks_lost_rate",
        "p2_rg_flow_breaks_lost_rate",
        "p1_rg_flow_long_service_games",
        "p2_rg_flow_long_service_games",
        "p1_rg_flow_long_service_hold_rate",
        "p2_rg_flow_long_service_hold_rate",
        "p1_rg_flow_late_service_games",
        "p2_rg_flow_late_service_games",
        "p1_rg_flow_late_service_hold_rate",
        "p2_rg_flow_late_service_hold_rate",
        "p1_rg_flow_long_return_games",
        "p2_rg_flow_long_return_games",
        "p1_rg_flow_long_return_break_rate",
        "p2_rg_flow_long_return_break_rate",
        "p1_rg_flow_late_return_games",
        "p2_rg_flow_late_return_games",
        "p1_rg_flow_late_return_break_rate",
        "p2_rg_flow_late_return_break_rate",
        "p1_rg_flow_long_game_rate",
        "p2_rg_flow_long_game_rate",
        "p1_rg_time_matches",
        "p2_rg_time_matches",
        "p1_rg_time_total_minutes",
        "p2_rg_time_total_minutes",
        "p1_rg_time_avg_minutes",
        "p2_rg_time_avg_minutes",
        "p1_rg_time_recent_avg_minutes",
        "p2_rg_time_recent_avg_minutes",
        "p1_rg_time_max_minutes",
        "p2_rg_time_max_minutes",
        "p1_rg_time_long_match_rate",
        "p2_rg_time_long_match_rate",
        "p1_rg_time_two_day_minutes",
        "p2_rg_time_two_day_minutes",
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
    feature_cols = sorted(
        column
        for column in corpus.columns
        if column.startswith("diff_")
        or column.startswith("absdiff_")
        or column.startswith("p1_metric_")
        or column.startswith("p2_metric_")
        or column.startswith("weather_")
        or column in {"is_wta", "is_atp"}
    )
    keep_columns = [column for column in ordered_columns if column in corpus.columns] + [
        column for column in feature_cols if column not in ordered_columns
    ]
    corpus = corpus[keep_columns].copy()

    with sqlite3.connect(DB_PATH) as conn:
        corpus.to_sql("tennis_model_training_rows", conn, if_exists="replace", index=False)
        conn.execute("create index if not exists idx_tennis_model_training_rows_date on tennis_model_training_rows(slate_date)")
        conn.execute("create index if not exists idx_tennis_model_training_rows_match on tennis_model_training_rows(match_id)")

    json_path = MODELS_DIR / f"tennis-training-corpus-through-{target_date}.json"
    payload = {
        "targetDate": target_date,
        "source": "tennis warehouse flat training corpus",
        "rows": int(len(corpus)),
        "settledRows": int(corpus["training_label_available"].sum()) if "training_label_available" in corpus else 0,
        "featureColumns": feature_cols,
        "records": json.loads(corpus.replace({np.nan: None}).to_json(orient="records")),
    }
    json_path.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"Wrote {json_path.relative_to(ROOT)}")
    print("Updated warehouse table tennis_model_training_rows")
    return {
        "rows": payload["rows"],
        "settledRows": payload["settledRows"],
        "featureColumns": len(feature_cols),
        "table": "tennis_model_training_rows",
        "jsonPath": str(json_path.relative_to(ROOT)),
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Pandas multi-model tennis backtest and slate predictor.")
    parser.add_argument("--target-date", default="2026-05-28")
    parser.add_argument("--no-market", action="store_true", help="Exclude market price features from model training.")
    parser.add_argument("--skip-training-corpus", action="store_true", help="Do not refresh tennis_model_training_rows.")
    args = parser.parse_args()

    tables = load_warehouse()
    samples = build_samples(tables)
    corpus_summary = None if args.skip_training_corpus else persist_training_corpus(samples, args.target_date)
    include_market = not args.no_market
    backtest_rows, backtest_summary = backtest_by_day(samples, include_market=include_market)
    data_only_rows, data_only_summary = backtest_by_day(samples, include_market=False)
    target = train_for_date(samples, args.target_date, include_market=include_market)
    value_gate = recent_ml_value_gate(args.target_date)
    recommendations = recommendation_rows(target, value_gate)

    payload = {
        "targetDate": args.target_date,
        "generatedFrom": "tennis warehouse pandas ensemble",
        "settledRows": int(samples["label_p1_win"].notna().sum()),
        "trainingCorpus": corpus_summary,
        "deskBaseline": desk_baseline(samples),
        "backtest": backtest_summary,
        "dataOnlyBacktest": data_only_summary,
        "valueGate": value_gate,
        "targetPredictions": {
            "date": args.target_date,
            "model": "pandas-ensemble-logit-rf-gb-xgb",
            "excludeSources": ["tennistonic"],
            "rows": recommendations,
        },
    }
    print(json.dumps({k: payload[k] for k in ["settledRows", "deskBaseline", "backtest", "dataOnlyBacktest"]}, indent=2))
    print("\nTop target rows:")
    for row in recommendations[:12]:
        print(
            f"{row['start']} {row['selection']} vs {row['opponent']} "
            f"model={row['modelProbability']} market={row['marketProbability']} "
            f"fair={row['fairOdds']} marketOdds={row['marketFairOdds']} ev={row['netEvPer100']}"
        )
    write_report(args.target_date, payload)


if __name__ == "__main__":
    main()
