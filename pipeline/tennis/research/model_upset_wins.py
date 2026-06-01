#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import math
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
WEB_JSON = ROOT / "web" / "src" / "lib" / "tennis-upset-win-model.generated.json"


def kalshi_fee(price: float) -> float:
    return math.ceil((0.07 * price * (1 - price)) * 100) / 100


def read_training_rows() -> pd.DataFrame:
    with sqlite3.connect(DB_PATH) as conn:
        return pd.read_sql_query("select * from tennis_model_training_rows", conn).replace([np.inf, -np.inf], np.nan)


def side_value(row: pd.Series, base: str, side: str) -> float:
    column = f"{side}_{base}"
    value = pd.to_numeric(pd.Series([row.get(column)]), errors="coerce").iloc[0]
    return float(value) if pd.notna(value) else np.nan


def build_underdog_rows(matches: pd.DataFrame) -> pd.DataFrame:
    rows: list[dict[str, Any]] = []
    diff_columns = [column for column in matches.columns if column.startswith("diff_")]
    absdiff_columns = [column for column in matches.columns if column.startswith("absdiff_")]
    side_bases = [
        "market_prob",
        "cents_at_risk",
        "cents_profit_if_win",
        "rg_flow_games",
        "rg_flow_hold_rate",
        "rg_flow_break_rate",
        "rg_flow_breaks_lost_rate",
        "rg_flow_long_game_rate",
        "metric_closeout",
        "metric_errorControl",
        "metric_hold",
        "metric_returnPressure",
        "metric_secondServe",
        "pps_hold_pct",
        "pps_first_serve_won_pct",
        "pps_second_serve_won_pct",
        "pps_aces",
        "pps_double_faults",
        "pps_bp_saved_pct",
        "pps_bp_converted_pct",
    ]
    for _, row in matches.iterrows():
        p1_market = pd.to_numeric(pd.Series([row.get("p1_market_prob")]), errors="coerce").iloc[0]
        p2_market = pd.to_numeric(pd.Series([row.get("p2_market_prob")]), errors="coerce").iloc[0]
        if pd.isna(p1_market) or pd.isna(p2_market) or p1_market == p2_market:
            continue
        side = "p1" if p1_market < p2_market else "p2"
        opp = "p2" if side == "p1" else "p1"
        side_multiplier = 1 if side == "p1" else -1
        label = row.get("label_p1_win")
        label_win = np.nan
        if pd.notna(label):
            label_win = int(label == 1) if side == "p1" else int(label == 0)
        record: dict[str, Any] = {
            "match_id": row.get("match_id"),
            "slate_date": row.get("slate_date"),
            "title": row.get("title"),
            "selection": row.get("player1_name") if side == "p1" else row.get("player2_name"),
            "opponent": row.get("player2_name") if side == "p1" else row.get("player1_name"),
            "side": side,
            "label_win": label_win,
            "entry": float(p1_market if side == "p1" else p2_market),
            "favorite_market_prob": float(p2_market if side == "p1" else p1_market),
            "is_atp": row.get("is_atp"),
            "is_wta": row.get("is_wta"),
            "start_minutes": row.get("start_minutes"),
        }
        for column in diff_columns:
            record[f"side_{column}"] = pd.to_numeric(pd.Series([row.get(column)]), errors="coerce").iloc[0] * side_multiplier
        for column in absdiff_columns:
            record[column] = pd.to_numeric(pd.Series([row.get(column)]), errors="coerce").iloc[0]
        for base in side_bases:
            sel = side_value(row, base, side)
            opponent = side_value(row, base, opp)
            record[f"sel_{base}"] = sel
            record[f"opp_{base}"] = opponent
            record[f"edge_{base}"] = sel - opponent if pd.notna(sel) and pd.notna(opponent) else np.nan
        record["cheap_entry_15"] = int(record["entry"] <= 0.15)
        record["playable_entry_30"] = int(record["entry"] <= 0.30)
        record["return_pressure_edge"] = int((record.get("edge_metric_returnPressure") or 0) > 0)
        record["favorite_error_weak"] = int((record.get("opp_metric_errorControl") or 100) < 56)
        record["favorite_closeout_weak"] = int((record.get("opp_metric_closeout") or 100) < 66)
        record["favorite_break_leak"] = int((record.get("opp_rg_flow_breaks_lost_rate") or 0) >= 0.20)
        rows.append(record)
    return pd.DataFrame(rows).replace([np.inf, -np.inf], np.nan)


def feature_columns(rows: pd.DataFrame) -> list[str]:
    features = [
        column for column in rows.columns
        if column.startswith("side_diff_")
        or column.startswith("absdiff_")
        or column.startswith("sel_")
        or column.startswith("opp_")
        or column.startswith("edge_")
        or column in {
            "entry",
            "favorite_market_prob",
            "is_atp",
            "is_wta",
            "start_minutes",
            "cheap_entry_15",
            "playable_entry_30",
            "return_pressure_edge",
            "favorite_error_weak",
            "favorite_closeout_weak",
            "favorite_break_leak",
        }
    ]
    return [feature for feature in features if pd.to_numeric(rows[feature], errors="coerce").notna().any()]


def model_specs() -> list[tuple[str, Pipeline]]:
    return [
        (
            "extra_trees",
            Pipeline([
                ("impute", SimpleImputer(strategy="median")),
                ("model", ExtraTreesClassifier(n_estimators=260, min_samples_leaf=5, random_state=529, class_weight="balanced")),
            ]),
        ),
        (
            "random_forest",
            Pipeline([
                ("impute", SimpleImputer(strategy="median")),
                ("model", RandomForestClassifier(n_estimators=240, min_samples_leaf=5, max_features="sqrt", random_state=29, class_weight="balanced_subsample")),
            ]),
        ),
        (
            "gradient_boosting",
            Pipeline([
                ("impute", SimpleImputer(strategy="median")),
                ("model", GradientBoostingClassifier(n_estimators=90, learning_rate=0.04, max_depth=2, min_samples_leaf=5, random_state=17)),
            ]),
        ),
    ]


def profit_to_settlement(entry: float, won: int) -> float:
    fee = kalshi_fee(entry)
    return (1 - entry - fee) if won else -(entry + fee)


def backtest(rows: pd.DataFrame, features: list[str]) -> tuple[pd.DataFrame, dict[str, Any]]:
    settled = rows.dropna(subset=["label_win"]).copy()
    scored = []
    for test_date in sorted(settled["slate_date"].dropna().unique()):
        train = settled[settled["slate_date"] < test_date]
        test = settled[settled["slate_date"] == test_date]
        if len(train) < 30 or test.empty or train["label_win"].nunique() < 2:
            continue
        fold_features = [feature for feature in features if pd.to_numeric(train[feature], errors="coerce").notna().any()]
        predictions = []
        for _, model in model_specs():
            model.fit(train[fold_features], train["label_win"].astype(int))
            predictions.append(model.predict_proba(test[fold_features])[:, 1])
        out = test.copy()
        out["upset_win_probability"] = np.mean(predictions, axis=0)
        scored.append(out)
    if not scored:
        return pd.DataFrame(), {"rows": 0}
    pred = pd.concat(scored, ignore_index=True)
    pred["model_edge"] = pred["upset_win_probability"] - pred["entry"]
    pred["settlement_profit"] = [
        profit_to_settlement(float(entry), int(label))
        for entry, label in zip(pred["entry"], pred["label_win"])
    ]
    summary: dict[str, Any] = {
        "rows": int(len(pred)),
        "baseUpsetRate": round(float(pred["label_win"].mean()), 3),
        "betEveryUnderdogRoiCents": round(float(pred["settlement_profit"].mean() * 100), 1),
        "thresholds": [],
    }
    for edge_threshold in (0.04, 0.07, 0.10, 0.13, 0.16):
        group = pred[pred["model_edge"] >= edge_threshold]
        if group.empty:
            continue
        summary["thresholds"].append({
            "edgeThreshold": edge_threshold,
            "bets": int(len(group)),
            "hitRate": round(float(group["label_win"].mean()), 3),
            "roiCents": round(float(group["settlement_profit"].mean() * 100), 1),
            "avgEntryCents": round(float(group["entry"].mean() * 100), 1),
        })
    by_date = []
    for date, group in pred.groupby("slate_date"):
        model_group = group[group["model_edge"] >= 0.10]
        by_date.append({
            "date": date,
            "rows": int(len(group)),
            "baseUpsetRate": round(float(group["label_win"].mean()), 3),
            "baseRoiCents": round(float(group["settlement_profit"].mean() * 100), 1),
            "modelBets": int(len(model_group)),
            "modelHitRate": round(float(model_group["label_win"].mean()), 3) if not model_group.empty else None,
            "modelRoiCents": round(float(model_group["settlement_profit"].mean() * 100), 1) if not model_group.empty else None,
        })
    summary["byDateAtEdge10"] = by_date
    return pred, summary


def score_current(rows: pd.DataFrame, features: list[str], target_date: str, model_approved: bool) -> list[dict[str, Any]]:
    train = rows[(rows["slate_date"] < target_date) & rows["label_win"].notna()].copy()
    current = rows[rows["slate_date"] == target_date].copy()
    if len(train) < 30 or current.empty or train["label_win"].nunique() < 2:
        return []
    model_features = [feature for feature in features if pd.to_numeric(train[feature], errors="coerce").notna().any()]
    predictions = []
    for _, model in model_specs():
        model.fit(train[model_features], train["label_win"].astype(int))
        predictions.append(model.predict_proba(current[model_features])[:, 1])
    current["upset_win_probability"] = np.mean(predictions, axis=0)
    current["model_edge"] = current["upset_win_probability"] - current["entry"]
    output = []
    for _, row in current.sort_values("model_edge", ascending=False).iterrows():
        entry = float(row["entry"])
        p = float(row["upset_win_probability"])
        ev = p * (1 - entry - kalshi_fee(entry)) + (1 - p) * (-(entry + kalshi_fee(entry)))
        if model_approved:
            tier = "hold-upset" if row["model_edge"] >= 0.10 and p >= 0.25 else "sprinkle" if row["model_edge"] >= 0.06 else "pass"
        else:
            tier = "not-approved"
        output.append({
            "tier": tier,
            "matchId": row.get("match_id"),
            "match": row.get("title"),
            "selection": row.get("selection"),
            "opponent": row.get("opponent"),
            "entryCents": round(entry * 100, 1),
            "winProbability": round(p, 3),
            "edgePct": round((p - entry) * 100, 1),
            "settlementEvCents": round(ev * 100, 1),
            "returnPressureEdge": round(float(row.get("edge_metric_returnPressure")), 1) if pd.notna(row.get("edge_metric_returnPressure")) else None,
            "favoriteErrorControl": round(float(row.get("opp_metric_errorControl")), 1) if pd.notna(row.get("opp_metric_errorControl")) else None,
            "favoriteBreaksLostRate": round(float(row.get("opp_rg_flow_breaks_lost_rate")), 3) if pd.notna(row.get("opp_rg_flow_breaks_lost_rate")) else None,
        })
    return output


def main() -> None:
    parser = argparse.ArgumentParser(description="Backtest actual underdog win model for tennis.")
    parser.add_argument("--target-date", default="2026-05-29")
    args = parser.parse_args()
    training = read_training_rows()
    rows = build_underdog_rows(training)
    features = feature_columns(rows)
    scored, summary = backtest(rows, features)
    best_threshold = max((row.get("roiCents", -999) for row in summary.get("thresholds", [])), default=-999)
    model_approved = best_threshold > 0
    current = score_current(rows, features, args.target_date, model_approved)
    payload = {
        "targetDate": args.target_date,
        "source": "tennis_model_training_rows underdog side rows; actual match win labels",
        "coverage": {
            "underdogRows": int(len(rows)),
            "labeledRows": int(rows["label_win"].notna().sum()),
            "scoredBacktestRows": int(len(scored)),
            "featureCount": len(features),
        },
        "backtest": summary,
        "recommendation": {
            "approvedForHoldUpsets": model_approved,
            "reason": "Actual underdog win thresholds did not beat buy-every-underdog on the leave-day-forward backtest."
            if not model_approved
            else "At least one actual-upset threshold was positive on leave-day-forward backtest.",
        },
        "currentUnderdogs": current,
    }
    REPORTS_DIR.mkdir(parents=True, exist_ok=True)
    report_path = REPORTS_DIR / f"tennis-upset-win-model-{args.target_date}.json"
    md_path = REPORTS_DIR / f"tennis-upset-win-model-{args.target_date}.md"
    report_path.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    WEB_JSON.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    lines = [
        "# Tennis Upset Win Model",
        "",
        f"Target date: {args.target_date}",
        "",
        "## Backtest",
        "",
        json.dumps(summary, indent=2),
        "",
        "## Current Underdogs",
        "",
        "|tier|selection|entry|win p|edge|EV c|match|",
        "|---|---|---:|---:|---:|---:|---|",
    ]
    for row in current:
        lines.append(f"|{row['tier']}|{row['selection']}|{row['entryCents']}c|{row['winProbability']*100:.0f}%|{row['edgePct']}|{row['settlementEvCents']}|{row['match']}|")
    md_path.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(json.dumps({"coverage": payload["coverage"], "backtest": summary, "top": current[:8]}, indent=2))
    print(f"Wrote {report_path.relative_to(ROOT)}")
    print(f"Wrote {md_path.relative_to(ROOT)}")
    print(f"Wrote {WEB_JSON.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
