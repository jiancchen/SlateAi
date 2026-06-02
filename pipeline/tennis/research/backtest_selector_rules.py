#!/usr/bin/env python3
"""Backtest tennis selector rules against stored warehouse/value rows.

This is intentionally not a new win-probability model. It tests whether the
June 1 review lessons help as publish gates: vetoing fragile ML/value rows,
flagging pressure-underdog lanes, and rejecting derivative rows with thin data.
"""

from __future__ import annotations

import json
import math
import re
import sqlite3
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[3]
DB_PATH = ROOT / "data-private" / "warehouse" / "sports.db"
REPORT_DIR = ROOT / "data-private" / "reports"
OUT_JSON = REPORT_DIR / "tennis-selector-rule-experiment-2026-06-01.json"
OUT_MD = REPORT_DIR / "tennis-selector-rule-experiment-2026-06-01.md"


def as_float(value: Any) -> float | None:
    if value is None:
        return None
    try:
        if isinstance(value, str) and not value.strip():
            return None
        result = float(value)
    except (TypeError, ValueError):
        return None
    if math.isnan(result) or math.isinf(result):
        return None
    return result


def norm_name(value: Any) -> str:
    text = str(value or "").lower()
    text = re.sub(r"[^a-z0-9]+", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def pct(value: float | None) -> str:
    if value is None:
        return "n/a"
    return f"{value * 100:.1f}%"


def side_for_name(row: dict[str, Any], name: Any) -> int | None:
    normalized = norm_name(name)
    if not normalized:
        return None
    if normalized == norm_name(row.get("player1_name")) or normalized == norm_name(row.get("player1_normalized_name")):
        return 1
    if normalized == norm_name(row.get("player2_name")) or normalized == norm_name(row.get("player2_normalized_name")):
        return 2
    return None


def actual_side(row: dict[str, Any]) -> int | None:
    label = as_float(row.get("label_p1_win"))
    if label is None:
        return None
    return 1 if label >= 0.5 else 2


def side_name(row: dict[str, Any], side: int) -> str:
    return str(row.get("player1_name" if side == 1 else "player2_name") or "")


def side_value(row: dict[str, Any], side: int, suffix: str) -> float | None:
    return as_float(row.get(f"p{side}_{suffix}"))


def side_edge(row: dict[str, Any], side: int, diff_col: str) -> float | None:
    value = as_float(row.get(diff_col))
    if value is None:
        return None
    return value if side == 1 else -value


def round_number(row: dict[str, Any]) -> int | None:
    stage = str(row.get("stage") or "")
    match = re.search(r"Round\s+(\d+)", stage, flags=re.I)
    if match:
        return int(match.group(1))
    stage_lower = stage.lower()
    if "quarter" in stage_lower:
        return 5
    if "semi" in stage_lower:
        return 6
    if "final" in stage_lower:
        return 7
    return None


def has_model_split(row: dict[str, Any]) -> bool:
    try:
        raw = json.loads(row.get("raw_json") or "{}")
    except json.JSONDecodeError:
        return False
    text = " ".join(str(item) for item in raw.get("factors") or [])
    return "model split" in text.lower() or "files disagree" in text.lower()


def score_games(scoreline: Any) -> tuple[int | None, int | None, int | None]:
    text = str(scoreline or "").strip()
    if not text:
        return None, None, None
    p1_games = 0
    p2_games = 0
    first_set_games: int | None = None
    for token in text.split():
        match = re.match(r"(\d+)-(\d+)", token)
        if not match:
            continue
        left = int(match.group(1))
        right = int(match.group(2))
        if first_set_games is None:
            first_set_games = left + right
        p1_games += left
        p2_games += right
    if p1_games == 0 and p2_games == 0:
        return None, None, None
    return p1_games, p2_games, first_set_games


def american_profit_per_100(odds: Any, hit: bool) -> float:
    price = as_float(odds)
    if price is None:
        return 0.0
    if not hit:
        return -100.0
    if price > 0:
        return price
    return 10000.0 / abs(price)


def summarize_hits(items: list[dict[str, Any]], hit_key: str = "hit") -> dict[str, Any]:
    graded = [item for item in items if item.get(hit_key) is not None]
    hits = sum(1 for item in graded if item.get(hit_key) is True)
    pnl = sum(as_float(item.get("pnlPer100")) or 0.0 for item in graded)
    return {
        "rows": len(items),
        "graded": len(graded),
        "hits": hits,
        "hitRate": round(hits / len(graded), 3) if graded else None,
        "pnlPer100": round(pnl, 1),
        "roi": round(pnl / (100.0 * len(graded)), 3) if graded else None,
    }


def load_rows() -> dict[str, dict[str, Any]]:
    con = sqlite3.connect(DB_PATH)
    con.row_factory = sqlite3.Row
    rows = {}
    for row in con.execute(
        """
        select t.*, m.raw_json
        from tennis_model_training_rows t
        left join tennis_matches m on m.match_id = t.match_id
        """
    ):
        item = dict(row)
        rows[item["match_id"]] = item
    return rows


def load_value_rows(training_rows: dict[str, dict[str, Any]]) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for path in sorted(REPORT_DIR.glob("tennis-value-backtest-*.json")):
        data = json.loads(path.read_text())
        for raw_row in data.get("rows") or []:
            row = dict(raw_row)
            match_id = row.get("matchId")
            if match_id not in training_rows:
                continue
            row["date"] = data.get("date")
            row["training"] = training_rows[match_id]
            rows.append(row)
    return rows


def risk_labels(row: dict[str, Any], side: int) -> list[str]:
    opp = 2 if side == 1 else 1
    risks: list[str] = []

    error_control = side_value(row, side, "metric_errorControl")
    if error_control is not None and error_control < 56:
        risks.append("error-control")

    closeout = side_value(row, side, "metric_closeout")
    if closeout is not None and closeout < 52:
        risks.append("closeout")

    second_serve = side_value(row, side, "metric_secondServe")
    if second_serve is not None and second_serve < 55:
        risks.append("second-serve")

    two_day = side_value(row, side, "rg_time_two_day_minutes")
    recent_minutes = side_value(row, side, "rg_time_recent_avg_minutes")
    if (two_day is not None and two_day >= 230) or (recent_minutes is not None and recent_minutes >= 145):
        risks.append("time-load")

    long_service_games = side_value(row, side, "rg_flow_long_service_games") or 0
    long_hold = side_value(row, side, "rg_flow_long_service_hold_rate")
    if long_service_games >= 2 and long_hold is not None and long_hold < 0.66:
        risks.append("long-service")

    late_service_games = side_value(row, side, "rg_flow_late_service_games") or 0
    late_hold = side_value(row, side, "rg_flow_late_service_hold_rate")
    if late_service_games >= 2 and late_hold is not None and late_hold < 0.70:
        risks.append("late-service")

    long_return_edge = side_edge(row, side, "diff_rg_flow_long_return_break_rate")
    late_return_edge = side_edge(row, side, "diff_rg_flow_late_return_break_rate")
    return_pressure_edge = side_edge(row, side, "diff_metric_returnPressure")
    if (long_return_edge is not None and long_return_edge <= -0.08) or (
        late_return_edge is not None and late_return_edge <= -0.08
    ) or (return_pressure_edge is not None and return_pressure_edge <= -8):
        risks.append("opponent-return-pressure")

    bp_convert_edge = side_edge(row, side, "diff_pps_bp_converted_pct")
    tb_edge = side_edge(row, side, "diff_pps_tiebreaks_won_pct")
    if bp_convert_edge is not None and bp_convert_edge <= -5:
        risks.append("opponent-bp-conversion")
    if tb_edge is not None and tb_edge <= -15:
        risks.append("opponent-tiebreak")

    market_prob = side_value(row, side, "market_prob")
    cents_profit = side_value(row, side, "cents_profit_if_win")
    if market_prob is not None and market_prob >= 0.68 and cents_profit is not None and cents_profit <= 50:
        risks.append("favorite-tax")

    flow_games = side_value(row, side, "rg_flow_games") or 0
    opp_flow_games = side_value(row, opp, "rg_flow_games") or 0
    if min(flow_games, opp_flow_games) < 10:
        risks.append("thin-replay")

    if has_model_split(row):
        risks.append("model-split")

    return sorted(set(risks))


NON_PLAYER_FRAGILITY_RISKS = {"model-split", "thin-replay", "favorite-tax"}
CORE_FRAGILITY_RISKS = {
    "error-control",
    "closeout",
    "second-serve",
    "time-load",
    "long-service",
    "late-service",
    "opponent-return-pressure",
}


def serve_floor_against(row: dict[str, Any], side: int) -> bool:
    flip = serve_floor_flip_candidate(row)
    if not flip:
        return False
    return side_for_name(row, flip["selection"]) != side


def later_round_veto(row: dict[str, Any], side: int) -> tuple[bool, list[str]]:
    risks = risk_labels(row, side)
    rnd = round_number(row)
    hard_round = rnd is not None and rnd >= 4
    watch_round = rnd is not None and rnd >= 3
    player_fragility = [risk for risk in risks if risk not in NON_PLAYER_FRAGILITY_RISKS]
    core_fragility = [risk for risk in player_fragility if risk in CORE_FRAGILITY_RISKS]
    if hard_round and ((core_fragility and len(player_fragility) >= 2) or serve_floor_against(row, side)):
        return True, risks
    if watch_round and "model-split" in risks and len(player_fragility) >= 2:
        return True, risks
    return False, risks


def pressure_dog_candidate(row: dict[str, Any]) -> dict[str, Any] | None:
    p1_market = as_float(row.get("p1_market_prob"))
    p2_market = as_float(row.get("p2_market_prob"))
    if p1_market is None or p2_market is None:
        return None
    dog = 1 if p1_market < p2_market else 2
    dog_price = min(p1_market, p2_market)
    if dog_price >= 0.46:
        return None
    signals = []
    if (side_edge(row, dog, "diff_pps_bp_converted_pct") or 0) >= 5:
        signals.append("bp-conversion")
    if (side_edge(row, dog, "diff_pps_tiebreaks_won_pct") or 0) >= 15:
        signals.append("tiebreak")
    if (side_edge(row, dog, "diff_rg_flow_long_return_break_rate") or 0) >= 0.08:
        signals.append("long-return-break")
    if (side_edge(row, dog, "diff_rg_flow_late_return_break_rate") or 0) >= 0.08:
        signals.append("late-return-break")
    if (side_edge(row, dog, "diff_metric_errorControl") or 0) >= 4:
        signals.append("error-control")
    if (side_edge(row, dog, "diff_metric_returnPressure") or 0) >= 8:
        signals.append("return-pressure")
    if len(signals) < 2:
        return None
    actual = actual_side(row)
    hit = actual == dog if actual is not None else None
    entry = dog_price
    pnl_contract = (1.0 - entry) if hit is True else (-entry if hit is False else None)
    return {
        "matchId": row["match_id"],
        "date": row["slate_date"],
        "selection": side_name(row, dog),
        "entryCents": round(entry * 100, 1),
        "signals": signals,
        "hit": hit,
        "pnlPerContract": round(pnl_contract, 3) if pnl_contract is not None else None,
    }


def serve_floor_flip_candidate(row: dict[str, Any]) -> dict[str, Any] | None:
    desk_side = side_for_name(row, row.get("desk_pick_name"))
    if desk_side is None:
        return None
    other = 2 if desk_side == 1 else 1
    signals = []
    if (side_edge(row, other, "diff_metric_hold") or 0) >= 5:
        signals.append("hold")
    if (side_edge(row, other, "diff_metric_secondServe") or 0) >= 4:
        signals.append("second-serve")
    if (side_edge(row, other, "diff_pps_hold_pct") or 0) >= 4:
        signals.append("player-page-hold")
    if (side_edge(row, other, "diff_pps_first_serve_won_pct") or 0) >= 3:
        signals.append("first-serve-won")
    if (side_edge(row, other, "diff_rg_flow_late_service_hold_rate") or 0) >= 0.10:
        signals.append("late-service-hold")
    if len(signals) < 2:
        return None
    actual = actual_side(row)
    hit = actual == other if actual is not None else None
    return {
        "matchId": row["match_id"],
        "date": row["slate_date"],
        "selection": side_name(row, other),
        "againstDeskPick": side_name(row, desk_side),
        "signals": signals,
        "hit": hit,
    }


def compression_under_signal(row: dict[str, Any]) -> dict[str, Any] | None:
    sides = []
    for side in (1, 2):
        signals = []
        if (side_edge(row, side, "diff_pps_bp_converted_pct") or 0) >= 8:
            signals.append("bp-conversion")
        if (side_edge(row, side, "diff_metric_secondServe") or 0) >= 5:
            signals.append("second-serve")
        if (side_edge(row, side, "diff_metric_returnPressure") or 0) >= 7:
            signals.append("return-pressure")
        opp = 2 if side == 1 else 1
        opp_err = side_value(row, opp, "metric_errorControl")
        if opp_err is not None and opp_err < 56:
            signals.append("opponent-error-risk")
        if len(signals) >= 2:
            sides.append({"side": side, "name": side_name(row, side), "signals": signals})
    if not sides:
        return None
    return max(sides, key=lambda item: len(item["signals"]))


def clay_pressure_profile(row: dict[str, Any], side: int) -> dict[str, Any]:
    profile: dict[str, Any] = {
        "clayEdge": side_edge(row, side, "diff_clay_win_pct"),
        "recentWinEdge": side_edge(row, side, "diff_recent_win_pct"),
        "recentGameEdge": side_edge(row, side, "diff_recent_game_pct"),
        "adjFormEdge": side_edge(row, side, "diff_opponent_adjusted_form_score"),
        "holdEdge": side_edge(row, side, "diff_metric_hold"),
        "secondServeEdge": side_edge(row, side, "diff_metric_secondServe"),
        "bpSavedEdge": side_edge(row, side, "diff_pps_bp_saved_pct"),
        "bpConvertedEdge": side_edge(row, side, "diff_pps_bp_converted_pct"),
        "tiebreakEdge": side_edge(row, side, "diff_pps_tiebreaks_won_pct"),
        "longHoldEdge": side_edge(row, side, "diff_rg_flow_long_service_hold_rate"),
        "lateHoldEdge": side_edge(row, side, "diff_rg_flow_late_service_hold_rate"),
        "longReturnBreakEdge": side_edge(row, side, "diff_rg_flow_long_return_break_rate"),
        "lateReturnBreakEdge": side_edge(row, side, "diff_rg_flow_late_return_break_rate"),
        "errorControlEdge": side_edge(row, side, "diff_metric_errorControl"),
    }

    form_score = 0
    form_against = 0
    for key, threshold in (
        ("clayEdge", 0.08),
        ("recentWinEdge", 0.12),
        ("recentGameEdge", 0.06),
        ("adjFormEdge", 8),
        ("holdEdge", 5),
        ("secondServeEdge", 4),
    ):
        value = profile.get(key)
        if value is not None and value >= threshold:
            form_score += 1
        if value is not None and value <= -threshold:
            form_against += 1

    pressure_score = 0
    pressure_against = 0
    for key, threshold in (
        ("bpConvertedEdge", 5),
        ("bpSavedEdge", 5),
        ("tiebreakEdge", 15),
        ("longHoldEdge", 0.08),
        ("lateHoldEdge", 0.08),
        ("longReturnBreakEdge", 0.08),
        ("lateReturnBreakEdge", 0.08),
        ("errorControlEdge", 4),
        ("secondServeEdge", 4),
    ):
        value = profile.get(key)
        if value is not None and value >= threshold:
            pressure_score += 1
        if value is not None and value <= -threshold:
            pressure_against += 1

    profile["formScore"] = form_score
    profile["formAgainst"] = form_against
    profile["pressureScore"] = pressure_score
    profile["pressureAgainst"] = pressure_against
    return profile


def clay_pressure_slices(desk_rows: list[dict[str, Any]]) -> dict[str, Any]:
    slice_defs = {
        "clay edge >=8%": lambda item: (item["profile"].get("clayEdge") is not None and item["profile"]["clayEdge"] >= 0.08),
        "clay edge <=-8%": lambda item: (item["profile"].get("clayEdge") is not None and item["profile"]["clayEdge"] <= -0.08),
        "recent win edge >=12%": lambda item: (
            item["profile"].get("recentWinEdge") is not None and item["profile"]["recentWinEdge"] >= 0.12
        ),
        "recent win edge <=-12%": lambda item: (
            item["profile"].get("recentWinEdge") is not None and item["profile"]["recentWinEdge"] <= -0.12
        ),
        "adjusted form edge >=8": lambda item: (
            item["profile"].get("adjFormEdge") is not None and item["profile"]["adjFormEdge"] >= 8
        ),
        "adjusted form edge <=-8": lambda item: (
            item["profile"].get("adjFormEdge") is not None and item["profile"]["adjFormEdge"] <= -8
        ),
        "pressure score >=2": lambda item: item["profile"]["pressureScore"] >= 2,
        "pressure against >=2": lambda item: item["profile"]["pressureAgainst"] >= 2,
        "pressure against >=2 and form score <=1": lambda item: (
            item["profile"]["pressureAgainst"] >= 2 and item["profile"]["formScore"] <= 1
        ),
        "form score >=3 and pressure against <=1": lambda item: (
            item["profile"]["formScore"] >= 3 and item["profile"]["pressureAgainst"] <= 1
        ),
        "form score >=3 but pressure against >=2": lambda item: (
            item["profile"]["formScore"] >= 3 and item["profile"]["pressureAgainst"] >= 2
        ),
    }
    output: dict[str, Any] = {}
    for label, predicate in slice_defs.items():
        rows = [item for item in desk_rows if predicate(item)]
        output[label] = summarize_hits(rows)
    return output


def value_row_hit(row: dict[str, Any]) -> bool | None:
    if row.get("graded") is False:
        return None
    hit = row.get("hit")
    if hit is None:
        return None
    return bool(hit)


def run() -> None:
    training_rows = load_rows()
    settled = [row for row in training_rows.values() if as_float(row.get("training_label_available")) == 1]
    value_rows = load_value_rows(training_rows)

    desk_rows = []
    for row in settled:
        side = side_for_name(row, row.get("desk_pick_name"))
        actual = actual_side(row)
        if side is None or actual is None:
            continue
        veto, risks = later_round_veto(row, side)
        hit = side == actual
        desk_rows.append(
            {
                "date": row["slate_date"],
                "matchId": row["match_id"],
                "selection": side_name(row, side),
                "hit": hit,
                "veto": veto,
                "risks": risks,
                "profile": clay_pressure_profile(row, side),
                "round": round_number(row),
            }
        )

    retained = [row for row in desk_rows if not row["veto"]]
    vetoed = [row for row in desk_rows if row["veto"]]

    positive_ml = []
    for row in value_rows:
        if row.get("market") != "ML":
            continue
        hit = value_row_hit(row)
        if hit is None:
            continue
        ev = as_float(row.get("evPer100"))
        if ev is None or ev <= 0:
            continue
        side = side_for_name(row["training"], row.get("selection"))
        if side is None:
            continue
        veto, risks = later_round_veto(row["training"], side)
        positive_ml.append(
            {
                "date": row["date"],
                "matchId": row["matchId"],
                "match": row.get("match"),
                "selection": row.get("selection"),
                "hit": hit,
                "pnlPer100": row.get("pnlPer100"),
                "evPer100": ev,
                "valueGrade": row.get("valueGrade"),
                "veto": veto,
                "risks": risks,
            }
        )

    positive_ml_kept = [row for row in positive_ml if not row["veto"]]
    positive_ml_vetoed = [row for row in positive_ml if row["veto"]]

    pressure_dogs = [item for row in settled if (item := pressure_dog_candidate(row))]
    serve_floor = [item for row in settled if (item := serve_floor_flip_candidate(row))]

    compression_vetoes = []
    integrity_rows = []
    for row in value_rows:
        market = row.get("market")
        hit = value_row_hit(row)
        raw = row.get("raw") or {}
        reason = str(raw.get("reason") or "")
        if market in {"O/U", "1st set O/U"} and "N/A" in reason and (as_float(row.get("modelPct")) or 0) >= 56:
            item = dict(row)
            item["hit"] = hit
            integrity_rows.append(item)
        if market != "O/U" or hit is None:
            continue
        selection = str(row.get("selection") or raw.get("selection") or "")
        if not selection.lower().startswith("over"):
            continue
        signal = compression_under_signal(row["training"])
        if signal:
            compression_vetoes.append(
                {
                    "date": row["date"],
                    "matchId": row["matchId"],
                    "match": row.get("match"),
                    "selection": selection,
                    "hit": hit,
                    "pnlPer100": row.get("pnlPer100"),
                    "signal": signal,
                }
            )

    kalshi_health = []
    for path in sorted(REPORT_DIR.glob("kalshi-tennis-spike-model-*.json")):
        data = json.loads(path.read_text())
        candidates = data.get("currentCandidates") or []
        bad = []
        for cand in candidates:
            missing = [
                field
                for field in ("boardMatchId", "boardTitle", "yesAsk", "projectedExit", "targetHitProbability", "playerFlow")
                if cand.get(field) in (None, "", {}) or cand.get(field) == []
            ]
            if missing:
                bad.append({"selection": cand.get("selection"), "missing": missing, "tier": cand.get("candidateTier")})
        kalshi_health.append(
            {
                "date": data.get("targetDate"),
                "candidates": len(candidates),
                "badCandidates": len(bad),
                "badSamples": bad[:5],
            }
        )

    pressure_hit_rows = [row for row in pressure_dogs if row["hit"] is not None]
    pressure_pnl = sum(as_float(row.get("pnlPerContract")) or 0 for row in pressure_hit_rows)
    serve_floor_hit_rows = [row for row in serve_floor if row["hit"] is not None]

    june1 = {
        "deskBaseline": summarize_hits([row for row in desk_rows if row["date"] == "2026-06-01"]),
        "deskAfterVeto": summarize_hits([row for row in retained if row["date"] == "2026-06-01"]),
        "deskVetoed": [row for row in vetoed if row["date"] == "2026-06-01"],
        "positiveMlBaseline": summarize_hits([row for row in positive_ml if row["date"] == "2026-06-01"]),
        "positiveMlAfterVeto": summarize_hits([row for row in positive_ml_kept if row["date"] == "2026-06-01"]),
        "positiveMlVetoed": [row for row in positive_ml_vetoed if row["date"] == "2026-06-01"],
        "pressureDogs": [row for row in pressure_dogs if row["date"] == "2026-06-01"],
        "serveFloorFlips": [row for row in serve_floor if row["date"] == "2026-06-01"],
        "compressionOverVetoes": [row for row in compression_vetoes if row["date"] == "2026-06-01"],
    }

    output = {
        "generatedFrom": {
            "warehouse": str(DB_PATH.relative_to(ROOT)),
            "valueReports": "data-private/reports/tennis-value-backtest-*.json",
            "ruleSet": "June 1 deep-dive selector gates",
        },
        "trainingRows": len(training_rows),
        "settledRows": len(settled),
        "deskBaseline": summarize_hits(desk_rows),
        "deskAfterVeto": summarize_hits(retained),
        "deskVetoImpact": {
            "vetoedRows": len(vetoed),
            "vetoedHitRate": summarize_hits(vetoed)["hitRate"],
            "avoidedMisses": sum(1 for row in vetoed if row["hit"] is False),
            "removedWinners": sum(1 for row in vetoed if row["hit"] is True),
            "riskCounts": Counter(risk for row in vetoed for risk in row["risks"]),
        },
        "positiveMlBaseline": summarize_hits(positive_ml),
        "positiveMlAfterVeto": summarize_hits(positive_ml_kept),
        "positiveMlVetoImpact": {
            "vetoedRows": len(positive_ml_vetoed),
            "vetoedHitRate": summarize_hits(positive_ml_vetoed)["hitRate"],
            "avoidedMisses": sum(1 for row in positive_ml_vetoed if row["hit"] is False),
            "removedWinners": sum(1 for row in positive_ml_vetoed if row["hit"] is True),
            "vetoedSamples": positive_ml_vetoed[:12],
        },
        "pressureDog": {
            "rows": len(pressure_dogs),
            "graded": len(pressure_hit_rows),
            "hits": sum(1 for row in pressure_hit_rows if row["hit"]),
            "hitRate": round(sum(1 for row in pressure_hit_rows if row["hit"]) / len(pressure_hit_rows), 3)
            if pressure_hit_rows
            else None,
            "contractRoi": round(pressure_pnl / len(pressure_hit_rows), 3) if pressure_hit_rows else None,
            "samples": pressure_dogs[:20],
        },
        "serveFloorFlip": {
            "rows": len(serve_floor),
            "graded": len(serve_floor_hit_rows),
            "hits": sum(1 for row in serve_floor_hit_rows if row["hit"]),
            "hitRate": round(sum(1 for row in serve_floor_hit_rows if row["hit"]) / len(serve_floor_hit_rows), 3)
            if serve_floor_hit_rows
            else None,
            "samples": serve_floor[:20],
        },
        "clayPressureSlices": clay_pressure_slices(desk_rows),
        "compressionUnderVeto": {
            "overRowsVetoed": len(compression_vetoes),
            "vetoedHitRate": summarize_hits(compression_vetoes)["hitRate"],
            "avoidedOverMisses": sum(1 for row in compression_vetoes if row["hit"] is False),
            "removedOverWinners": sum(1 for row in compression_vetoes if row["hit"] is True),
            "samples": compression_vetoes[:20],
        },
        "dataIntegrityGate": {
            "rows": len(integrity_rows),
            "graded": len([row for row in integrity_rows if row["hit"] is not None]),
            "hitRate": summarize_hits(integrity_rows)["hitRate"],
            "samples": [
                {
                    "date": row["date"],
                    "match": row.get("match"),
                    "market": row.get("market"),
                    "selection": row.get("selection"),
                    "hit": row.get("hit"),
                    "reason": (row.get("raw") or {}).get("reason"),
                }
                for row in integrity_rows[:12]
            ],
        },
        "kalshiHealth": kalshi_health,
        "june1Counterfactual": june1,
    }
    output["deskVetoImpact"]["riskCounts"] = dict(output["deskVetoImpact"]["riskCounts"])

    OUT_JSON.write_text(json.dumps(output, indent=2, sort_keys=True) + "\n")

    md = [
        "# Tennis Selector Rule Experiment - 2026-06-01",
        "",
        "## Question",
        "",
        "Do the June 1 lessons help the model if they are used as selector gates instead of raw probability features?",
        "",
        "## Result",
        "",
        (
            f"- Desk/pick baseline: {output['deskBaseline']['hits']}/{output['deskBaseline']['graded']} "
            f"({pct(output['deskBaseline']['hitRate'])})."
        ),
        (
            f"- Desk/pick after later-round risk veto: {output['deskAfterVeto']['hits']}/"
            f"{output['deskAfterVeto']['graded']} ({pct(output['deskAfterVeto']['hitRate'])})."
        ),
        (
            f"- Veto removed {output['deskVetoImpact']['vetoedRows']} desk rows: "
            f"{output['deskVetoImpact']['avoidedMisses']} misses avoided, "
            f"{output['deskVetoImpact']['removedWinners']} winners removed."
        ),
        (
            f"- Positive-EV ML baseline: {output['positiveMlBaseline']['hits']}/"
            f"{output['positiveMlBaseline']['graded']} ({pct(output['positiveMlBaseline']['hitRate'])}), "
            f"ROI {pct(output['positiveMlBaseline']['roi'])}."
        ),
        (
            f"- Positive-EV ML after veto: {output['positiveMlAfterVeto']['hits']}/"
            f"{output['positiveMlAfterVeto']['graded']} ({pct(output['positiveMlAfterVeto']['hitRate'])}), "
            f"ROI {pct(output['positiveMlAfterVeto']['roi'])}."
        ),
        "",
        "## June 1 Counterfactual",
        "",
        (
            f"- June 1 desk baseline: {june1['deskBaseline']['hits']}/{june1['deskBaseline']['graded']} "
            f"({pct(june1['deskBaseline']['hitRate'])})."
        ),
        (
            f"- June 1 after veto: {june1['deskAfterVeto']['hits']}/{june1['deskAfterVeto']['graded']} "
            f"({pct(june1['deskAfterVeto']['hitRate'])})."
        ),
        (
            f"- June 1 positive-EV ML after veto: {june1['positiveMlAfterVeto']['hits']}/"
            f"{june1['positiveMlAfterVeto']['graded']} ({pct(june1['positiveMlAfterVeto']['hitRate'])})."
        ),
        "",
        "Vetoed June 1 ML/value rows:",
    ]
    for row in june1["positiveMlVetoed"]:
        md.append(
            f"- {row['match']}: {row['selection']} ({row['valueGrade']}), "
            f"hit={row['hit']}, risks={', '.join(row['risks']) or 'none'}."
        )
    md.extend(
        [
            "",
            "## Pressure-Dog Lane",
            "",
            (
                f"- Pressure-dog candidates: {output['pressureDog']['hits']}/"
                f"{output['pressureDog']['graded']} ({pct(output['pressureDog']['hitRate'])}), "
                f"contract ROI {output['pressureDog']['contractRoi']}."
            ),
            "- This is a trade/watch lane, not a blind winner lane. It needs Kalshi max-price history before publishing.",
            "",
            "## Serve-Floor Flip Lane",
            "",
            (
                f"- Serve-floor flip candidates: {output['serveFloorFlip']['hits']}/"
                f"{output['serveFloorFlip']['graded']} ({pct(output['serveFloorFlip']['hitRate'])})."
            ),
            "- This is promising as a veto/derivative hint, but too noisy to promote as automatic ML flips.",
            "",
            "## Recent Clay Form And Pressure Moments",
            "",
            "Recent clay/form edges are useful, but they are support signals, not a guarantee.",
            "",
        ]
    )
    for label in (
        "clay edge >=8%",
        "recent win edge >=12%",
        "adjusted form edge >=8",
        "form score >=3 and pressure against <=1",
        "form score >=3 but pressure against >=2",
        "pressure against >=2 and form score <=1",
    ):
        item = output["clayPressureSlices"][label]
        md.append(f"- {label}: {item['hits']}/{item['graded']} ({pct(item['hitRate'])}).")
    md.extend(
        [
            "",
            "Read: recent clay form should raise confidence only when pressure-against is low. If clay/form is strong but pressure-against is high, it becomes a derivative/watch profile instead of a clean ML bet.",
            "",
            "## Derivative And Data-Integrity Gates",
            "",
            (
                f"- Compression-under veto saw {output['compressionUnderVeto']['overRowsVetoed']} "
                f"published Over rows; hit rate on vetoed Overs was {pct(output['compressionUnderVeto']['vetoedHitRate'])}."
            ),
            (
                f"- Rows with N/A hold/return explanations: {output['dataIntegrityGate']['graded']} graded, "
                f"hit rate {pct(output['dataIntegrityGate']['hitRate'])}."
            ),
            "- If a derivative row cannot explain hold, break, BP saved, and BP conversion from warehouse rows, it should not be bet-grade.",
            "",
            "## Kalshi Health",
            "",
        ]
    )
    for item in kalshi_health[-5:]:
        md.append(
            f"- {item['date']}: {item['badCandidates']}/{item['candidates']} candidates missing required fields."
        )
    md.extend(
        [
            "",
            "## Promotion Decision",
            "",
            "Promote the later-round risk veto and data-integrity gate into the publish/value-board layer.",
            "",
            "Do not promote pressure-dog or serve-floor flips as direct winner picks yet. Store them as watch/trade lanes and require day-bucket ROI before they can become bet-grade.",
        ]
    )
    OUT_MD.write_text("\n".join(md) + "\n")
    print(f"Wrote {OUT_JSON.relative_to(ROOT)}")
    print(f"Wrote {OUT_MD.relative_to(ROOT)}")


if __name__ == "__main__":
    run()
