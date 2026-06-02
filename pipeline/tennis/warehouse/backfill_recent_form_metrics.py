#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import re
import sqlite3
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[3]
DB_PATH = ROOT / "data-private" / "warehouse" / "sports.db"


def normalize_name(value: str | None) -> str:
    value = value or ""
    value = re.sub(r"[^a-zA-Z0-9]+", " ", value).strip().lower()
    return re.sub(r"\s+", " ", value)


def as_float(value: Any) -> float | None:
    if value is None:
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def clamp(value: float | None, low: float = 0, high: float = 100) -> float | None:
    if value is None:
        return None
    return max(low, min(high, value))


def result_only_fallback(metric_key: str, closeout: float | None) -> float | None:
    """Low-authority fallback for Flashscore rows without service stat sections.

    Some Challenger player pages expose a completed recent result but no
    service/return stat feed beyond a small points widget. The UI still needs a
    visible row, but these estimates must remain marked as estimated so they do
    not masquerade as exact hold/serve data.
    """
    base_close = closeout if closeout is not None else 55.0
    if metric_key == "hold":
        return clamp(68 + (base_close - 55) * 0.35, 56, 78)
    if metric_key == "secondServe":
        return clamp(48 + (base_close - 55) * 0.12, 42, 55)
    if metric_key == "errorControl":
        return clamp(58 + (base_close - 55) * 0.25, 44, 72)
    if metric_key == "returnPressure":
        return clamp(40 + (base_close - 55) * 0.15, 32, 50)
    if metric_key == "closeout":
        return clamp(base_close)
    return None


def fraction(value: Any) -> tuple[float, float] | None:
    text = str(value or "")
    match = re.search(r"(\d+(?:\.\d+)?)\s*/\s*(\d+(?:\.\d+)?)", text)
    if not match:
        return None
    made = float(match.group(1))
    attempts = float(match.group(2))
    return made, attempts


def sets_played(result_text: str | None) -> float:
    text = str(result_text or "")
    set_scores = re.findall(r"\b\d+\s*-\s*\d+", text)
    return max(1.0, float(len(set_scores) or 1))


def player_won(result_text: str | None) -> bool | None:
    text = str(result_text or "").lower()
    if "loss" in text:
        return False
    if "win" in text or "won" in text:
        return True
    return None


def metric_rows(row: sqlite3.Row) -> list[dict[str, Any]]:
    raw = json.loads(row["raw_json"] or "{}")
    stats = raw.get("serviceStats") or {}
    sp = sets_played(row["recent_result"])
    weight = 1.0
    hold = as_float(stats.get("holdPct") or stats.get("serviceHoldPct"))
    first_won = as_float(stats.get("firstServeWonPct"))
    first_in = as_float(stats.get("firstServePct"))
    second_won = as_float(stats.get("secondServeWonPct"))
    return_won = as_float(stats.get("returnPointsWonPct"))
    aces = as_float(stats.get("aces"))
    double_faults = as_float(stats.get("doubleFaults"))
    winners = as_float(stats.get("winners"))
    unforced = as_float(stats.get("unforcedErrors"))
    converted = fraction(stats.get("breakPointsConverted"))
    saved = fraction(stats.get("breakPointsSaved"))
    break_chances_per_set = converted[1] / sp if converted else None
    break_conversion_pct = converted[0] / converted[1] * 100 if converted and converted[1] else None
    bp_saved_pct = saved[0] / saved[1] * 100 if saved and saved[1] else as_float(stats.get("breakPointsSavedPct"))
    df_per_set = double_faults / sp if double_faults is not None else None
    ufe_per_set = unforced / sp if unforced is not None else None
    winner_balance = winners - unforced if winners is not None and unforced is not None else None

    won = player_won(row["recent_result"])
    closeout = None
    if won is True:
        closeout = 70
    elif won is False:
        closeout = 38
    if hold is not None:
        closeout = (closeout if closeout is not None else 50) * 0.65 + hold * 0.35
    if bp_saved_pct is not None:
        closeout = (closeout if closeout is not None else 50) + (bp_saved_pct - 62) * 0.08

    scores = {
        "hold": clamp((hold if hold is not None else 72) * 0.72 + (first_won if first_won is not None else 64) * 0.22 + ((first_in if first_in is not None else 60) - 60) * 0.1)
        if hold is not None or first_won is not None
        else None,
        "secondServe": clamp((second_won if second_won is not None else 48) * 0.78 + (hold if hold is not None else 72) * 0.22 - max(0, (df_per_set or 0) - 1.8) * 3.5)
        if second_won is not None or hold is not None
        else None,
        "errorControl": clamp(72 - max(0, (ufe_per_set if ufe_per_set is not None else 10) - 8) * 4.2 - max(0, (df_per_set if df_per_set is not None else 1.5) - 1.5) * 4 + max(-10, min(10, (winner_balance or 0) * 0.45)))
        if ufe_per_set is not None or df_per_set is not None or winner_balance is not None
        else None,
        "returnPressure": clamp((return_won if return_won is not None else 34) * 1.28 + (break_conversion_pct if break_conversion_pct is not None else 35) * 0.18 + min(18, (break_chances_per_set if break_chances_per_set is not None else 1.2) * 5))
        if return_won is not None or converted
        else None,
        "closeout": clamp(closeout),
    }
    labels = {
        "hold": "Hold",
        "secondServe": "2nd",
        "errorControl": "Err",
        "returnPressure": "Ret",
        "closeout": "Close",
    }
    out = []
    for key, score in scores.items():
        out.append(
            {
                "metric_key": key,
                "metric_label": labels[key],
                "score": round(score, 1) if score is not None else None,
                "estimated": 0,
                "source": "Flashscore recent match backfill" if score is not None else "No stat row",
                "weight": weight,
                "raw": {"flashscoreId": row["flashscore_id"], "serviceStats": stats, "result": row["recent_result"]},
            }
        )
    return out


def fill_missing_player_metric_estimates(conn: sqlite3.Connection, match_id: str, normalized: str) -> int:
    rows = conn.execute(
        """
        select recent_index, metric_key, score
        from tennis_recent_form_metrics
        where match_id = ? and normalized_name = ?
        order by recent_index, metric_key
        """,
        (match_id, normalized),
    ).fetchall()
    averages: dict[str, float] = {}
    for metric_key in {row["metric_key"] for row in rows}:
        values = [float(row["score"]) for row in rows if row["metric_key"] == metric_key and row["score"] is not None]
        if values:
            averages[metric_key] = round(sum(values) / len(values), 1)
    closeout_by_index = {
        row["recent_index"]: float(row["score"])
        for row in rows
        if row["metric_key"] == "closeout" and row["score"] is not None
    }

    updated = 0
    for row in rows:
        if row["score"] is not None:
            continue
        fallback = averages.get(row["metric_key"])
        source = "Player recent exact average fallback"
        if fallback is None:
            fallback = result_only_fallback(row["metric_key"], closeout_by_index.get(row["recent_index"]))
            source = "Flashscore result-only estimate"
        if fallback is None:
            continue
        conn.execute(
            """
            update tennis_recent_form_metrics
            set score = ?,
                estimated = 1,
                source = ?,
                raw_json = json_set(coalesce(raw_json, '{}'), '$.scoreSource', ?)
            where match_id = ?
              and normalized_name = ?
              and recent_index = ?
              and metric_key = ?
            """,
            (round(fallback, 1), source, source, match_id, normalized, row["recent_index"], row["metric_key"]),
        )
        updated += 1
    return updated


def main() -> None:
    parser = argparse.ArgumentParser(description="Backfill tennis_recent_form_metrics from Flashscore recent-link rows.")
    parser.add_argument("--date", required=True)
    args = parser.parse_args()
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        links = conn.execute(
            """
            select *
            from tennis_flashscore_recent_links
            where slate_date = ?
            order by board_match_id, board_player_name, recent_index
            """,
            (args.date,),
        ).fetchall()
        touched = set()
        inserted = 0
        estimated = 0
        for link in links:
            match_id = link["board_match_id"]
            normalized = normalize_name(link["board_player_name"])
            if (match_id, normalized) not in touched:
                conn.execute(
                    "delete from tennis_recent_form_metrics where match_id = ? and normalized_name = ?",
                    (match_id, normalized),
                )
                touched.add((match_id, normalized))
            for metric in metric_rows(link):
                conn.execute(
                    """
                    insert or replace into tennis_recent_form_metrics(
                      match_id, normalized_name, recent_index, metric_key,
                      player_name, metric_label, score, estimated, source, weight,
                      opponent_name, opponent_normalized_name, opponent_rank, event,
                      event_tier, match_date_label, surface, raw_json
                    )
                    values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        match_id,
                        normalized,
                        int(link["recent_index"]),
                        metric["metric_key"],
                        link["board_player_name"],
                        metric["metric_label"],
                        metric["score"],
                        metric["estimated"],
                        metric["source"],
                        metric["weight"],
                        link["recent_opponent_name"],
                        normalize_name(link["recent_opponent_name"]),
                        None,
                        link["recent_event"],
                        None,
                        link["recent_date"],
                        None,
                        json.dumps(metric["raw"], ensure_ascii=False, sort_keys=True),
                    ),
                )
                inserted += 1
        for match_id, normalized in touched:
            estimated += fill_missing_player_metric_estimates(conn, match_id, normalized)
        conn.commit()
        print(json.dumps({"date": args.date, "links": len(links), "players": len(touched), "inserted": inserted, "estimatedFallbacks": estimated}, indent=2))
    finally:
        conn.close()


if __name__ == "__main__":
    main()
