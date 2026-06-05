#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import re
import sqlite3
import sys
import unicodedata
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[3]
for candidate in (ROOT, ROOT / "pipeline"):
    candidate_text = str(candidate)
    if candidate_text not in sys.path:
        sys.path.insert(0, candidate_text)

try:
    from pipeline.lib.warehouse_paths import tennis_warehouse_path
except ModuleNotFoundError:
    lib_path = str(ROOT / "pipeline" / "lib")
    if lib_path not in sys.path:
        sys.path.insert(0, lib_path)
    from warehouse_paths import tennis_warehouse_path

DB_PATH = tennis_warehouse_path()


def connect(db_path: Path | None = None) -> sqlite3.Connection:
    conn = sqlite3.connect(db_path or DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def table_exists(conn: sqlite3.Connection, table_name: str) -> bool:
    return conn.execute(
        "select 1 from sqlite_master where type = 'table' and name = ?",
        (table_name,),
    ).fetchone() is not None


def as_json(value: str | None) -> Any:
    if not value:
        return None
    try:
        return json.loads(value)
    except json.JSONDecodeError:
        return value


def normalize_name(value: str | None) -> str:
    ascii_value = unicodedata.normalize("NFKD", str(value or "")).encode("ascii", "ignore").decode("ascii")
    return re.sub(r"\s+", " ", re.sub(r"[^a-zA-Z0-9]+", " ", ascii_value).strip().lower())


def stat_rows(conn: sqlite3.Connection, event_id: str, period: str = "ALL") -> list[dict[str, Any]]:
    if not table_exists(conn, "tennis_sofascore_player_stat_rows"):
        return []
    return [
        dict(row)
        for row in conn.execute(
            """
            select player_side, player_name, normalized_name, period, group_name,
                   stat_key, stat_name, raw_value, numeric_value, percentage, raw_json
            from tennis_sofascore_player_stat_rows
            where sofascore_event_id = ? and period = ?
            order by player_side, group_name, stat_name
            """,
            (event_id, period),
        )
    ]


def parsed_stat_payload(row: dict[str, Any]) -> dict[str, Any]:
    raw = as_json(row.get("raw_json")) or {}
    raw_item = raw.get("item") if isinstance(raw, dict) else {}
    side = row.get("player_side")
    prefix = "home" if side == "home" else "away"
    numerator = raw_item.get(f"{prefix}Value") if isinstance(raw_item, dict) else None
    denominator = raw_item.get(f"{prefix}Total") if isinstance(raw_item, dict) else None
    return {
        "label": row["stat_name"],
        "group": row["group_name"],
        "key": row["stat_key"],
        "raw": row["raw_value"],
        "numeric": row["numeric_value"],
        "percentage": row["percentage"],
        "numerator": numerator,
        "denominator": denominator,
    }


def player_stat_summary(rows: list[dict[str, Any]]) -> dict[str, dict[str, Any]]:
    summary: dict[str, dict[str, Any]] = {}
    key_map = {
        "aces": "aces",
        "doubleFaults": "doubleFaults",
        "firstServeAccuracy": "firstServePct",
        "secondServeAccuracy": "secondServePct",
        "firstServePointsAccuracy": "firstServeWonPct",
        "secondServePointsAccuracy": "secondServeWonPct",
        "servicePointsScored": "servicePointsWon",
        "serviceGamesTotal": "serviceGamesPlayed",
        "serviceGamesWon": "serviceGamesWon",
        "breakPointsSaved": "breakPointsSaved",
        "breakPointsScored": "breakPointsConverted",
        "firstReturnPoints": "firstReturnPointsWonPct",
        "secondReturnPoints": "secondReturnPointsWonPct",
        "receiverPointsScored": "returnPointsWon",
        "pointsTotal": "totalPointsWon",
        "gamesWon": "gamesWon",
        "winnersTotal": "winners",
        "forehandWinners": "forehandWinners",
        "backhandWinners": "backhandWinners",
        "errorsTotal": "forcedErrors",
        "forehandErrors": "forehandForcedErrors",
        "backhandErrors": "backhandForcedErrors",
        "unforcedErrorsTotal": "unforcedErrors",
        "forehandUnforcedErrors": "forehandUnforcedErrors",
        "backhandUnforcedErrors": "backhandUnforcedErrors",
        "groundstrokeUnforcedErrors": "groundstrokeUnforcedErrors",
    }
    for row in rows:
        player = row["player_name"]
        if not player:
            continue
        player_key = normalize_name(player)
        bucket = summary.setdefault(player_key, {"name": player, "side": row["player_side"], "stats": {}})
        mapped = key_map.get(row["stat_key"])
        if not mapped:
            continue
        bucket["stats"][mapped] = parsed_stat_payload(row)
    return summary


def average(values: list[float]) -> float | None:
    clean = [float(value) for value in values if isinstance(value, (int, float))]
    if not clean:
        return None
    return round(sum(clean) / len(clean), 1)


def weighted_average(values: list[dict[str, Any]]) -> float | None:
    clean = [
        row for row in values
        if isinstance(row.get("score"), (int, float)) and isinstance(row.get("weight"), (int, float)) and row.get("weight") > 0
    ]
    if not clean:
        return None
    total = sum(float(row["weight"]) for row in clean)
    return round(sum(float(row["score"]) * float(row["weight"]) for row in clean) / total, 1) if total else None


def pct_from_stat_text(value: Any) -> float | None:
    match = re.search(r"\((\d+(?:\.\d+)?)%\)", str(value or ""))
    if not match:
        return None
    return float(match.group(1))


def tennislive_match_service_stats(conn: sqlite3.Connection, player_id: str, match_id: str | None) -> dict[str, Any] | None:
    if not match_id or not table_exists(conn, "match_stat_rows"):
        return None
    rows = [
        dict(row)
        for row in conn.execute(
            """
            select stat_name, stat_value, stat_made, stat_attempts, stat_text
            from match_stat_rows
            where source_name = 'tennislive'
              and player_id = ?
              and match_id = ?
            order by stat_name
            """,
            (player_id, match_id),
        )
    ]
    if not rows:
        return None
    stats: dict[str, Any] = {"source": "tennislive", "rows": []}
    for row in rows:
        label = str(row.get("stat_name") or "").strip().upper()
        text = str(row.get("stat_text") or "").strip()
        pct = pct_from_stat_text(text)
        value = row.get("stat_value")
        if label == "ACES":
            stats["aces"] = int(value) if value is not None else text
        elif label == "DOUBLE FAULTS":
            stats["doubleFaults"] = int(value) if value is not None else text
        elif label == "1ST SERVE %":
            stats["firstServePct"] = pct
            stats["firstServeIn"] = text
        elif label == "1ST SERVE POINTS WON":
            stats["firstServeWonPct"] = pct
            stats["firstServePointsWon"] = text
        elif label == "2ND SERVE POINTS WON":
            stats["secondServeWonPct"] = pct
            stats["secondServePointsWon"] = text
        elif label == "BREAK POINTS WON":
            stats["breakPointsConverted"] = text
            stats["breakPointsConvertedPct"] = pct
        elif label == "TOTAL RETURN POINTS WON":
            stats["returnPointsWonPct"] = pct
            stats["returnPointsWon"] = text
        elif label == "TOTAL POINTS WON":
            stats["totalPointsWonPct"] = pct
            stats["totalPointsWon"] = text
        stats["rows"].append(
            {
                "label": row.get("stat_name"),
                "value": text,
                "made": row.get("stat_made"),
                "attempts": row.get("stat_attempts"),
                "pct": pct,
            }
        )
    return {key: value for key, value in stats.items() if value is not None}


def tennislive_link_for_recent(conn: sqlite3.Connection, player_id: str, recent: dict[str, Any]) -> dict[str, Any] | None:
    if not table_exists(conn, "tennislive_player_match_links"):
        return None
    rows = [
        dict(row)
        for row in conn.execute(
            """
            select match_id, source_match_url, opponent_name, match_date, tournament, score_text
            from tennislive_player_match_links
            where player_id = ?
              and source_name = 'tennislive'
              and coalesce(match_date, '') = coalesce(?, '')
            order by
              case when nullif(trim(coalesce(match_id, '')), '') is not null then 0 else 1 end,
              source_match_url
            """,
            (player_id, recent.get("match_date")),
        )
    ]
    opponent = normalize_name(recent.get("opponent_name"))
    tournament = normalize_name(recent.get("tournament_name"))
    score = re.sub(r"\s+", " ", str(recent.get("score") or "").strip())
    for row in rows:
        if opponent and normalize_name(row.get("opponent_name")) != opponent:
            continue
        if tournament and normalize_name(row.get("tournament")) != tournament:
            continue
        row_score = re.sub(r"\s+", " ", str(row.get("score_text") or "").strip())
        if score and row_score and score != row_score:
            continue
        return row
    return rows[0] if len(rows) == 1 else None


def typed_recent_matches_for_player(conn: sqlite3.Connection, player_id: str, limit: int = 5, source_name: str | None = None) -> list[dict[str, Any]]:
    if not (table_exists(conn, "recent_matches") and table_exists(conn, "players")):
        return []
    matches: list[dict[str, Any]] = []
    for row in (
        dict(item)
        for item in conn.execute(
            """
            select
              rm.match_date,
              rm.tournament_name,
              rm.surface,
              rm.round,
              rm.result,
              rm.score,
              rm.source_name,
              p.name as opponent_name
            from recent_matches rm
            left join players p on p.player_id = rm.opponent_player_id
            where rm.player_id = ?
              and (nullif(trim(coalesce(rm.score, '')), '') is not null or nullif(trim(coalesce(rm.result, '')), '') is not null)
              and (? is null or rm.source_name = ?)
            order by coalesce(rm.match_date, '') desc, rm.recent_match_id
            limit ?
            """,
            (player_id, source_name, source_name, limit),
        )
    ):
        link = tennislive_link_for_recent(conn, player_id, row) if row.get("source_name") == "tennislive" else None
        service_stats = tennislive_match_service_stats(conn, player_id, link.get("match_id") if link else None)
        payload = {
            "opponentName": row.get("opponent_name"),
            "event": row.get("tournament_name"),
            "matchDateLabel": row.get("match_date"),
            "isoDate": row.get("match_date"),
            "surface": row.get("surface"),
            "round": row.get("round"),
            "result": row.get("result"),
            "score": row.get("score"),
            "source": row.get("source_name"),
            "sourceUrl": link.get("source_match_url") if link else None,
            "matchId": link.get("match_id") if link else None,
        }
        if service_stats:
            payload["serviceStats"] = service_stats
            payload["stats"] = service_stats
        matches.append(payload)
    return matches


def typed_recent_form_entry(conn: sqlite3.Connection, row: dict[str, Any]) -> dict[str, Any]:
    features = as_json(row.get("features_json")) or {}
    summary = []
    for key, label in (
        ("opponent_adjusted_form_score", "Opponent-adjusted form"),
        ("recent_win_pct", "Recent win pct"),
        ("recent_game_pct", "Recent game pct"),
        ("scoreline_form_score", "Scoreline form"),
    ):
        value = features.get(key)
        if isinstance(value, (int, float)):
            summary.append({"key": key, "label": label, "score": value, "source": features.get("source") or "sql-tennis.db"})
    source_name = "tennislive"
    matches = typed_recent_matches_for_player(conn, row["player_id"], source_name=source_name)
    if not matches and isinstance(features.get("recent_matches"), list):
        matches = [
            {
                "opponentName": item.get("opponent"),
                "event": item.get("tournament"),
                "matchDateLabel": item.get("date"),
                "isoDate": item.get("date"),
                "surface": item.get("surface"),
                "round": item.get("round"),
                "result": item.get("result"),
                "score": item.get("score"),
                "source": features.get("source"),
                "sourceUrl": item.get("sourceUrl"),
            }
            for item in features.get("recent_matches")
            if isinstance(item, dict) and (str(item.get("score") or "").strip() or str(item.get("result") or "").strip())
        ]
        matches = matches[:5]
    return {
        "playerName": row.get("player_name"),
        "matches": matches,
        "summary": summary,
        "coverage": {
            "cells": len(summary) + len(matches),
            "exactCells": len(summary) + len(matches),
            "estimatedCells": 0,
            "missingCells": 0,
        },
        "source": "sql-tennis.db:player_form_snapshots/recent_matches",
        "sourceUrl": features.get("source_url"),
    }


def latest_tennislive_profile(conn: sqlite3.Connection, player_id: str) -> dict[str, Any] | None:
    if not table_exists(conn, "tennislive_player_profiles"):
        return None
    row = conn.execute(
        """
        select name, country, birthdate, age, current_ranking, ranking_label,
               top_ranking, top_ranking_date, top_ranking_points, points,
               prize_money, matches_total, wins, losses, win_pct,
               source_player_url, captured_at
        from tennislive_player_profiles
        where player_id = ?
        order by captured_at desc
        limit 1
        """,
        (player_id,),
    ).fetchone()
    if not row:
        return None
    payload = dict(row)
    return {
        "source": "tennislive_player_profiles",
        "name": payload.get("name"),
        "country": payload.get("country"),
        "birthdate": payload.get("birthdate"),
        "age": payload.get("age"),
        "rank": payload.get("current_ranking"),
        "rankingLabel": payload.get("ranking_label"),
        "topRank": payload.get("top_ranking"),
        "topRankDate": payload.get("top_ranking_date"),
        "topRankPoints": payload.get("top_ranking_points"),
        "points": payload.get("points"),
        "prizeMoney": payload.get("prize_money"),
        "matchesTotal": payload.get("matches_total"),
        "wins": payload.get("wins"),
        "losses": payload.get("losses"),
        "winPct": payload.get("win_pct"),
        "sourceUrl": payload.get("source_player_url"),
        "capturedAt": payload.get("captured_at"),
    }


def parse_tennislive_chart_date(value: str | None) -> str | None:
    if not value:
        return None
    try:
        return datetime.strptime(value, "%d.%m.%Y").date().isoformat()
    except ValueError:
        return None


def tennislive_form_chart(conn: sqlite3.Connection, player_id: str, limit: int = 36) -> dict[str, Any] | None:
    if not table_exists(conn, "tennislive_form_chart_points"):
        return None
    rows = [
        dict(row)
        for row in conn.execute(
            """
            select f.sequence_index, f.form_value, f.label, f.source_url, f.captured_at,
                   opp.name as opponent_name
            from tennislive_form_chart_points f
            left join players opp on opp.player_id = f.opponent_player_id
            where f.player_id = ?
            order by f.captured_at desc, f.sequence_index desc
            limit ?
            """,
            (player_id, limit),
        )
    ]
    if not rows:
        return None
    rows = list(reversed(rows))
    points = []
    for index, chart_row in enumerate(rows):
        label = str(chart_row.get("label") or "")
        date_match = re.search(r"(\d{1,2}\.\d{1,2}\.\d{4})", label)
        result_match = re.search(r"\((win|lost|loss)\s+vs\s+([^)]+)\)", label, re.I)
        points.append(
            {
                "index": index,
                "sequenceIndex": chart_row.get("sequence_index"),
                "value": chart_row.get("form_value"),
                "label": label,
                "date": parse_tennislive_chart_date(date_match.group(1)) if date_match else None,
                "result": result_match.group(1).lower() if result_match else None,
                "opponentName": chart_row.get("opponent_name") or (result_match.group(2).strip() if result_match else None),
            }
        )
    values = [point["value"] for point in points if isinstance(point.get("value"), (int, float))]
    return {
        "source": "tennislive_form_chart_points",
        "sourceUrl": rows[-1].get("source_url"),
        "capturedAt": rows[-1].get("captured_at"),
        "points": points,
        "latestValue": points[-1].get("value") if points else None,
        "minValue": min(values) if values else None,
        "maxValue": max(values) if values else None,
    }


def typed_recent_form_metrics(conn: sqlite3.Connection, match_id: str) -> dict[str, dict[str, Any]]:
    if not (table_exists(conn, "match_players") and table_exists(conn, "players") and table_exists(conn, "player_form_snapshots")):
        return {}
    rows = [
        dict(row)
        for row in conn.execute(
            """
            select
              p.name as player_name,
              p.player_id,
              fs.surface,
              fs.sample_size,
              fs.features_json,
              fs.created_at
            from match_players mp
            join players p on p.player_id = mp.player_id
            left join player_form_snapshots fs on fs.player_id = p.player_id
            where mp.match_id = ?
              and json_extract(fs.features_json, '$.source') = 'tennislive'
              and fs.form_snapshot_id = (
                select inner_fs.form_snapshot_id
                from player_form_snapshots inner_fs
                where inner_fs.player_id = p.player_id
                  and json_extract(inner_fs.features_json, '$.source') = 'tennislive'
                order by inner_fs.snapshot_date desc, inner_fs.created_at desc
                limit 1
              )
            order by mp.side
            """,
            (match_id,),
        )
    ]
    result: dict[str, dict[str, Any]] = {}
    for row in rows:
        result[normalize_name(row.get("player_name"))] = typed_recent_form_entry(conn, row)
    return result


def typed_recent_form_by_player(conn: sqlite3.Connection) -> dict[str, dict[str, Any]]:
    if not (table_exists(conn, "players") and table_exists(conn, "player_form_snapshots")):
        return {}
    rows = [
        dict(row)
        for row in conn.execute(
            """
            select
              p.name as player_name,
              p.player_id,
              fs.surface,
              fs.sample_size,
              fs.features_json,
              fs.created_at
            from players p
            join player_form_snapshots fs on fs.player_id = p.player_id
            where json_extract(fs.features_json, '$.source') = 'tennislive'
              and fs.form_snapshot_id = (
              select inner_fs.form_snapshot_id
              from player_form_snapshots inner_fs
              where inner_fs.player_id = p.player_id
                and json_extract(inner_fs.features_json, '$.source') = 'tennislive'
              order by inner_fs.snapshot_date desc, inner_fs.created_at desc
              limit 1
            )
            """
        )
    ]
    result: dict[str, dict[str, Any]] = {}
    for row in rows:
        form_metrics = typed_recent_form_entry(conn, row)
        profile = latest_tennislive_profile(conn, row["player_id"])
        form_chart = tennislive_form_chart(conn, row["player_id"])
        result[normalize_name(row.get("player_name"))] = {
            "name": row.get("player_name"),
            "profile": profile,
            "ranking": {
                "rank": profile.get("rank") if profile else None,
                "points": profile.get("points") if profile else None,
                "country": profile.get("country") if profile else None,
                "age": profile.get("age") if profile else None,
                "tour": profile.get("rankingLabel") if profile else None,
                "source": profile.get("source") if profile else None,
                "sourceUrl": profile.get("sourceUrl") if profile else None,
                "asOf": profile.get("capturedAt") if profile else None,
            } if profile else None,
            "formChart": form_chart,
            "expectedStats": expected_stats_from_form_metrics(form_metrics),
            "recentFormMetrics": form_metrics,
        }
    return result


def recent_form_metrics(conn: sqlite3.Connection, match_id: str) -> dict[str, dict[str, Any]]:
    typed = typed_recent_form_metrics(conn, match_id)
    if typed:
        return typed
    return {}
    if not table_exists(conn, "tennis_recent_form_metrics"):
        return {}
    rows = [
        dict(row)
        for row in conn.execute(
            """
            select normalized_name, player_name, recent_index, metric_key, metric_label,
                   score, estimated, source, weight, opponent_name, opponent_rank,
                   event, event_tier, match_date_label, surface, raw_json
            from tennis_recent_form_metrics
            where match_id = ?
            order by normalized_name, recent_index, metric_key
            """,
            (match_id,),
        )
    ]
    if not rows:
        return typed_recent_form_metrics(conn, match_id)
    by_player: dict[str, dict[str, Any]] = {}
    metric_order = ["hold", "secondServe", "errorControl", "returnPressure", "closeout"]
    for row in rows:
        normalized = row["normalized_name"]
        bucket = by_player.setdefault(
            normalized,
            {
                "playerName": row["player_name"],
                "matches": {},
                "summary": [],
                "coverage": {"cells": 0, "exactCells": 0, "estimatedCells": 0, "missingCells": 0},
            },
        )
        match_key = str(row["recent_index"])
        match_bucket = bucket["matches"].setdefault(
            match_key,
            {
                "recentIndex": row["recent_index"],
                "opponentName": row["opponent_name"],
                "opponentRank": row["opponent_rank"],
                "event": row["event"],
                "eventTier": row["event_tier"],
                "dateLabel": row["match_date_label"],
                "surface": row["surface"],
                "metrics": {},
            },
        )
        score = row["score"]
        metric = {
            "key": row["metric_key"],
            "label": row["metric_label"],
            "score": score,
            "estimated": bool(row["estimated"]),
            "source": row["source"],
            "weight": row["weight"],
            "raw": as_json(row["raw_json"]),
        }
        match_bucket["metrics"][row["metric_key"]] = metric
        bucket["coverage"]["cells"] += 1
        if score is None:
            bucket["coverage"]["missingCells"] += 1
        elif row["estimated"]:
            bucket["coverage"]["estimatedCells"] += 1
        else:
            bucket["coverage"]["exactCells"] += 1

    for bucket in by_player.values():
        match_list = [bucket["matches"][key] for key in sorted(bucket["matches"], key=lambda value: int(value))]
        bucket["matches"] = match_list
        summary = []
        for metric_key in metric_order:
            metric_rows = [
                {
                    "score": match["metrics"].get(metric_key, {}).get("score"),
                    "weight": match["metrics"].get(metric_key, {}).get("weight"),
                }
                for match in match_list[:5]
            ]
            labels = [match["metrics"].get(metric_key, {}).get("label") for match in match_list if match["metrics"].get(metric_key)]
            summary.append({
                "key": metric_key,
                "label": next((label for label in labels if label), metric_key),
                "score": weighted_average(metric_rows),
            })
        bucket["summary"] = summary
    return by_player


def as_number(value: Any) -> float | None:
    if isinstance(value, (int, float)):
        return float(value)
    try:
        text = str(value or "").strip()
        if text.endswith("%"):
            text = text[:-1]
        return float(text)
    except (TypeError, ValueError):
        return None


def pct_from_fraction_text(value: Any) -> float | None:
    parsed = fraction_from_text(value)
    if not parsed:
        return None
    made, total = parsed
    return round(made / total * 100, 1) if total else None


def fraction_from_text(value: Any) -> tuple[float, float] | None:
    match = re.search(r"(\d+(?:\.\d+)?)\s*/\s*(\d+(?:\.\d+)?)", str(value or ""))
    if not match:
        return None
    made = float(match.group(1))
    total = float(match.group(2))
    return (made, total)


def pressure_sample_from_service_stats(service_stats: list[dict[str, Any]]) -> dict[str, Any] | None:
    if not service_stats:
        return None
    saved_total = 0.0
    faced_total = 0.0
    converted_total = 0.0
    chances_total = 0.0
    saved_matches = 0
    converted_matches = 0
    for row in service_stats:
        saved = fraction_from_text(row.get("breakPointsSaved"))
        if saved:
            saved_total += saved[0]
            faced_total += saved[1]
            saved_matches += 1
        converted = fraction_from_text(row.get("breakPointsConverted"))
        if converted:
            converted_total += converted[0]
            chances_total += converted[1]
            converted_matches += 1
    if not saved_matches and not converted_matches:
        return None
    sample = {
        "matches": len(service_stats),
        "bpSaved": round(saved_total, 1),
        "bpFaced": round(faced_total, 1),
        "bpSavedPct": round(saved_total / faced_total * 100, 1) if faced_total else None,
        "bpFacedPerMatch": round(faced_total / saved_matches, 1) if saved_matches else None,
        "bpConverted": round(converted_total, 1),
        "bpChances": round(chances_total, 1),
        "bpConvertedPct": round(converted_total / chances_total * 100, 1) if chances_total else None,
        "bpChancesPerMatch": round(chances_total / converted_matches, 1) if converted_matches else None,
    }
    return {key: value for key, value in sample.items() if value is not None}


def complete_pressure_samples_from_stats(pressure_samples: dict[str, Any], stats: dict[str, Any]) -> dict[str, Any]:
    if not pressure_samples:
        return pressure_samples
    converted = stats.get("breakPointsConverted")
    chances = stats.get("breakPointsToConvert")
    converted_pct = stats.get("breakPointsConvertedPct")
    chances_per_match = stats.get("breakPointChancesPerMatch")
    if converted is None or chances is None:
        return pressure_samples
    completed: dict[str, Any] = {}
    for key, sample in pressure_samples.items():
        if not isinstance(sample, dict):
            completed[key] = sample
            continue
        if sample.get("bpChances") in (None, 0) and sample.get("bpConverted") in (None, 0):
            sample = {
                **sample,
                "bpConverted": converted,
                "bpChances": chances,
                "bpConvertedPct": converted_pct,
                "bpChancesPerMatch": chances_per_match,
            }
        completed[key] = {item_key: value for item_key, value in sample.items() if value is not None}
    return completed


def expected_stats_from_form_metrics(form_metrics: dict[str, Any] | None) -> dict[str, Any] | None:
    if not form_metrics:
        return None
    service_stats = []
    for match in form_metrics.get("matches") or []:
        direct_stats = match.get("serviceStats") or match.get("stats") or {}
        if direct_stats:
            service_stats.append(direct_stats)
            continue
        metric_rows = (match.get("metrics") or {}).values()
        stat_payload = next(
            (
                ((metric.get("raw") or {}).get("serviceStats") or {})
                for metric in metric_rows
                if ((metric.get("raw") or {}).get("serviceStats") or {})
            ),
            {},
        )
        if stat_payload:
            service_stats.append(stat_payload)
    if not service_stats:
        return None

    def avg(*keys: str) -> float | None:
        values = []
        for row in service_stats:
            for key in keys:
                parsed = as_number(row.get(key))
                if parsed is not None:
                    values.append(parsed)
                    break
        return average(values)

    stats = {
        "holdPct": avg("holdPct", "serviceHoldPct"),
        "aces": avg("aces"),
        "avgAces": avg("aces"),
        "doubleFaults": avg("doubleFaults"),
        "avgDoubleFaults": avg("doubleFaults"),
        "firstServePct": avg("firstServePct"),
        "firstServeWonPct": avg("firstServeWonPct"),
        "secondServeWonPct": avg("secondServeWonPct"),
        "servicePointsWonPct": avg("servicePointsWonPct"),
        "returnPointsWonPct": avg("returnPointsWonPct"),
        "breakPointsSavedPct": avg("breakPointsSavedPct")
        or average([pct for pct in (pct_from_fraction_text(row.get("breakPointsSaved")) for row in service_stats) if pct is not None]),
        "breakPointsConvertedPct": average(
            [pct for pct in (pct_from_fraction_text(row.get("breakPointsConverted")) for row in service_stats) if pct is not None]
        ),
        "winners": avg("winners"),
        "unforcedErrors": avg("unforcedErrors"),
        "forcedErrors": None,
    }
    recent_pressure = pressure_sample_from_service_stats(service_stats)
    last5_pressure = pressure_sample_from_service_stats(service_stats[:5])
    if recent_pressure:
        stats.update(
            {
                "breakPointsSaved": recent_pressure.get("bpSaved"),
                "breakPointsFaced": recent_pressure.get("bpFaced"),
                "breakPointsSavedPct": recent_pressure.get("bpSavedPct"),
                "breakPointsFacedPerMatch": recent_pressure.get("bpFacedPerMatch"),
                "breakPointsConverted": recent_pressure.get("bpConverted"),
                "breakPointsToConvert": recent_pressure.get("bpChances"),
                "breakPointsConvertedPct": recent_pressure.get("bpConvertedPct"),
                "breakPointChancesPerMatch": recent_pressure.get("bpChancesPerMatch"),
            }
        )
    stats = {key: value for key, value in stats.items() if value is not None}
    if not stats:
        return None
    return {
        "source": "TennisLive recent-match stats",
        "matches": len(service_stats),
        "note": "Pregame expected stats are averaged from TennisLive recent singles match stat tables.",
        "stats": stats,
        "pressureSamples": {
            "recent": recent_pressure,
            "last5": last5_pressure,
        },
        "sourceUrl": None,
    }


def h2h_match_rows(conn: sqlite3.Connection, match_id: str) -> list[dict[str, Any]]:
    if not table_exists(conn, "tennis_h2h_matches"):
        if not (table_exists(conn, "h2h_matches") and table_exists(conn, "players") and table_exists(conn, "match_players")):
            return []
        player_ids = [
            row["player_id"]
            for row in conn.execute(
                "select player_id from match_players where match_id = ? order by side",
                (match_id,),
            ).fetchall()
        ]
        if len(player_ids) < 2:
            return []
        rows = conn.execute(
            """
            select
              h.source_name,
              pa.name as player_a_name,
              pb.name as player_b_name,
              pw.name as winner_name,
              h.score,
              h.tournament_name,
              h.match_date,
              h.surface
            from h2h_matches h
            join players pa on pa.player_id = h.player_a_id
            join players pb on pb.player_id = h.player_b_id
            left join players pw on pw.player_id = h.winner_player_id
            where (h.player_a_id = ? and h.player_b_id = ?)
               or (h.player_a_id = ? and h.player_b_id = ?)
            order by h.match_date desc
            """,
            (player_ids[0], player_ids[1], player_ids[1], player_ids[0]),
        ).fetchall()
        return [
            {
                "sourceName": row["source_name"],
                "playerName": row["player_a_name"],
                "opponentName": row["player_b_name"],
                "winnerName": row["winner_name"],
                "resultText": row["score"],
                "event": row["tournament_name"],
                "eventTier": None,
                "dateLabel": row["match_date"],
                "isoDate": row["match_date"],
                "surface": row["surface"],
                "weight": None,
                "raw": None,
            }
            for row in rows
        ]
    return [
        {
            "sourceName": row["source_name"],
            "playerName": row["player_name"],
            "opponentName": row["opponent_name"],
            "winnerName": row["winner_name"],
            "resultText": row["result_text"],
            "event": row["event"],
            "eventTier": row["event_tier"],
            "dateLabel": row["match_date_label"],
            "isoDate": row["iso_date"],
            "surface": row["surface"],
            "weight": row["weight"],
            "raw": as_json(row["raw_json"]),
        }
        for row in conn.execute(
            """
            select *
            from tennis_h2h_matches
            where match_id = ?
            order by coalesce(iso_date, match_date_label) desc, h2h_index
            """,
            (match_id,),
        )
    ]


def typed_expected_stats(conn: sqlite3.Connection, match_id: str) -> dict[str, dict[str, Any]]:
        if not (table_exists(conn, "match_players") and table_exists(conn, "players")):
            return {}
        rows = conn.execute(
            """
            select mp.side, p.player_id, p.name
            from match_players mp
            join players p on p.player_id = mp.player_id
            where mp.match_id = ?
            order by mp.side
            """,
            (match_id,),
        ).fetchall()
        result: dict[str, dict[str, Any]] = {}
        for row in rows:
            pressure = conn.execute(
                """
                select *
                from service_pressure_snapshots
                where player_id = ?
                  and (match_id = ? or match_id is null)
                order by
                  case when match_id = ? then 0 else 1 end,
                  snapshot_date desc,
                  created_at desc
                limit 1
                """,
                (row["player_id"], match_id, match_id),
            ).fetchone() if table_exists(conn, "service_pressure_snapshots") else None
            form = conn.execute(
                """
                select *
                from player_form_snapshots
                where player_id = ?
                order by snapshot_date desc, created_at desc
                limit 1
                """,
                (row["player_id"],),
            ).fetchone() if table_exists(conn, "player_form_snapshots") else None
            form_features = as_json(form["features_json"]) if form else {}
            stats = {}
            if pressure:
                stats.update(
                    {
                        "holdPct": pressure["hold_pct"],
                        "returnGamesWonPct": pressure["break_pct"],
                        "breakPointsSaved": pressure["bp_saved_made"],
                        "breakPointsFaced": pressure["bp_saved_attempts"],
                        "breakPointsSavedPct": pressure["bp_saved_pct"],
                        "breakPointsConverted": pressure["bp_converted_made"],
                        "breakPointsToConvert": pressure["bp_converted_attempts"],
                        "breakPointsConvertedPct": pressure["bp_converted_pct"],
                    }
                )
            for target, source in (
                ("opponentAdjustedFormScore", "opponent_adjusted_form_score"),
                ("recentWinPct", "recent_win_pct"),
                ("recentGamePct", "recent_game_pct"),
                ("clayWinPct", "clay_win_pct"),
            ):
                if isinstance(form_features.get(source), (int, float)):
                    stats[target] = form_features[source]
            stats = {key: value for key, value in stats.items() if value is not None}
            result[normalize_name(row["name"])] = {
                "name": row["name"],
                "source": "sql-tennis.db typed pressure/form snapshots",
                "matches": (pressure["sample_size"] if pressure else None) or (form["sample_size"] if form else None),
                "note": "Pregame expected stats from typed tennis pressure and player-form snapshots.",
                "stats": stats,
                "pressureSamples": {
                    "typed": {
                        "matches": pressure["sample_size"],
                        "bpSaved": pressure["bp_saved_made"],
                        "bpFaced": pressure["bp_saved_attempts"],
                        "bpSavedPct": pressure["bp_saved_pct"],
                        "bpConverted": pressure["bp_converted_made"],
                        "bpChances": pressure["bp_converted_attempts"],
                        "bpConvertedPct": pressure["bp_converted_pct"],
                    }
                } if pressure else {},
            }
        return result


def expected_stats(conn: sqlite3.Connection, match_id: str) -> dict[str, dict[str, Any]]:
    if not table_exists(conn, "tennis_player_match_context"):
        return typed_expected_stats(conn, match_id)
    rows = conn.execute(
        """
        select player_name, normalized_name, raw_json
        from tennis_player_match_context
        where match_id = ?
        """,
        (match_id,),
    ).fetchall()
    if not rows:
        return typed_expected_stats(conn, match_id)
    result: dict[str, dict[str, Any]] = {}
    for row in rows:
        payload = as_json(row["raw_json"]) or {}
        service = payload.get("serviceData") or {}
        recent_stats = [
            match.get("serviceStats") or {}
            for match in payload.get("recentMatches") or []
            if match.get("serviceStats")
        ]
        recent_pressure = pressure_sample_from_service_stats(recent_stats)
        last5_pressure = pressure_sample_from_service_stats(recent_stats[:5])
        pressure_stats = {}
        if recent_pressure:
            pressure_stats = {
                "breakPointsSaved": recent_pressure.get("bpSaved"),
                "breakPointsFaced": recent_pressure.get("bpFaced"),
                "breakPointsSavedPct": recent_pressure.get("bpSavedPct"),
                "breakPointsFacedPerMatch": recent_pressure.get("bpFacedPerMatch"),
                "breakPointsConverted": recent_pressure.get("bpConverted"),
                "breakPointsToConvert": recent_pressure.get("bpChances"),
                "breakPointsConvertedPct": recent_pressure.get("bpConvertedPct"),
                "breakPointChancesPerMatch": recent_pressure.get("bpChancesPerMatch"),
            }
        player_key = normalize_name(row["player_name"])
        result[player_key] = {
            "name": row["player_name"],
            "source": service.get("source") or "Recent-match stat average",
            "matches": service.get("matchesWithStats") or len(recent_stats),
            "note": service.get("note") or "Pregame expected stats are averaged from joined recent match stat rows.",
            "stats": {
                "holdPct": average([stat.get("holdPct") or stat.get("serviceHoldPct") for stat in recent_stats]),
                "aces": average([stat.get("aces") for stat in recent_stats]),
                "doubleFaults": average([stat.get("doubleFaults") for stat in recent_stats]),
                "firstServePct": average([stat.get("firstServePct") for stat in recent_stats]),
                "firstServeWonPct": average([stat.get("firstServeWonPct") for stat in recent_stats]) or service.get("avgFirstServeWonPct"),
                "secondServeWonPct": average([stat.get("secondServeWonPct") for stat in recent_stats]),
                "servicePointsWonPct": average([stat.get("servicePointsWonPct") for stat in recent_stats]),
                "returnPointsWonPct": average([stat.get("returnPointsWonPct") for stat in recent_stats]),
                "winners": average([stat.get("winners") for stat in recent_stats]),
                "unforcedErrors": average([stat.get("unforcedErrors") for stat in recent_stats]),
                "forcedErrors": None,
                **pressure_stats,
            },
            "pressureSamples": {
                "recent": recent_pressure,
                "last5": last5_pressure,
            },
        }
    return result


def hold_pct_from_service_points(first_in: float | None, first_won: float | None, second_won: float | None) -> float | None:
    if first_in is None or first_won is None or second_won is None:
        return None
    point_win = (first_in / 100) * (first_won / 100) + (1 - first_in / 100) * (second_won / 100)
    if point_win <= 0 or point_win >= 1:
        return None
    q = 1 - point_win
    pre_deuce = point_win ** 4 * (1 + 4 * q + 10 * q ** 2)
    reach_deuce = 20 * point_win ** 3 * q ** 3
    win_from_deuce = point_win ** 2 / (point_win ** 2 + q ** 2)
    return round(max(0, min(100, (pre_deuce + reach_deuce * win_from_deuce) * 100)), 1)


def player_page_expected_stats(conn: sqlite3.Connection, date: str) -> dict[str, dict[str, Any]]:
    if not table_exists(conn, "tennis_sofascore_player_page_stats"):
        return {}
    try:
        rows = conn.execute(
            """
            select *
            from tennis_sofascore_player_page_stats
            where as_of_date = ?
            order by normalized_name,
              case surface when 'Clay' then 0 when 'All surfaces' then 1 else 2 end
            """,
            (date,),
        ).fetchall()
    except sqlite3.OperationalError:
        return {}
    result: dict[str, dict[str, Any]] = {}
    for row in rows:
        key = row["normalized_name"]
        first_in = row["first_serve_pct"]
        first_won = row["first_serve_won_pct"]
        second_won = row["second_serve_won_pct"]
        stats = {
            "matches": row["matches_total"],
            "wins": row["matches_won"],
            "winPct": row["matches_won_pct"],
            "holdPct": hold_pct_from_service_points(first_in, first_won, second_won),
            "firstServePct": first_in,
            "firstServeWonPct": first_won,
            "secondServePct": row["second_serve_pct"],
            "secondServeWonPct": second_won,
            "aces": row["aces_per_match"],
            "avgAces": row["aces_per_match"],
            "doubleFaults": row["double_faults_per_match"],
            "avgDoubleFaults": row["double_faults_per_match"],
            "breakPointsSavedPct": row["break_points_saved_pct"],
            "breakPointsConvertedPct": row["break_points_converted_pct"],
            "breakPointsSaved": row["break_points_saved"],
            "breakPointsFaced": row["break_points_faced"],
            "breakPointsConverted": row["break_points_converted"],
            "breakPointsToConvert": row["break_points_to_convert"],
            "tiebreaksWonPct": row["tiebreaks_won_pct"],
        }
        stats = {name: value for name, value in stats.items() if value is not None}
        if not stats:
            continue
        saved = as_number(row["break_points_saved"])
        faced = as_number(row["break_points_faced"])
        converted = as_number(row["break_points_converted"])
        chances = as_number(row["break_points_to_convert"])
        pressure_sample = {
            "matches": row["matches_total"],
            "bpSaved": saved,
            "bpFaced": faced,
            "bpSavedPct": row["break_points_saved_pct"] or (round(saved / faced * 100, 1) if saved is not None and faced else None),
            "bpFacedPerMatch": round(faced / row["matches_total"], 1) if faced is not None and row["matches_total"] else None,
            "bpConverted": converted,
            "bpChances": chances,
            "bpConvertedPct": row["break_points_converted_pct"] or (round(converted / chances * 100, 1) if converted is not None and chances else None),
            "bpChancesPerMatch": round(chances / row["matches_total"], 1) if chances is not None and row["matches_total"] else None,
        }
        pressure_sample = {key: value for key, value in pressure_sample.items() if value is not None}
        expected = {
            "name": row["player_name"],
            "source": f"SofaScore player page {row['season']} {row['surface']} stats",
            "matches": row["matches_total"],
            "note": "Pregame expected stats from SofaScore player-page surface filter; hold is derived from first-serve-in, first-serve-won, and second-serve-won.",
            "stats": stats,
            "pressureSamples": {"surface": pressure_sample} if pressure_sample else {},
            "sourceUrl": row["source_url"],
            "surface": row["surface"],
        }
        bucket = result.setdefault(key, {**expected, "surfaceRows": {}})
        bucket.setdefault("surfaceRows", {})[row["surface"]] = expected
    return result


def expected_stats_for_surface(page_expected: dict[str, Any] | None, surface: str | None) -> dict[str, Any] | None:
    if not page_expected:
        return None
    surface = surface or "Unknown"
    surface_rows = page_expected.get("surfaceRows") or {}
    for candidate in (surface, "All surfaces"):
        if surface_rows.get(candidate):
            return surface_rows[candidate]
    if page_expected.get("surface") in {surface, "All surfaces"}:
        return {key: value for key, value in page_expected.items() if key != "surfaceRows"}
    return None


def match_weather(conn: sqlite3.Connection, match_id: str) -> dict[str, Any] | None:
    if not table_exists(conn, "tennis_match_weather"):
        return None
    row = conn.execute(
        """
        select *
        from tennis_match_weather
        where match_id = ?
        """,
        (match_id,),
    ).fetchone()
    if row is None:
        return None
    payload = dict(row)
    raw = as_json(payload.pop("raw_json", None))
    return {
        "source": payload.get("source_name"),
        "venueKey": payload.get("venue_key"),
        "startTs": payload.get("start_ts"),
        "endTs": payload.get("end_ts"),
        "durationMinutes": payload.get("duration_minutes"),
        "hourlyRows": payload.get("hourly_rows"),
        "avgTemperatureC": payload.get("avg_temperature_c"),
        "maxTemperatureC": payload.get("max_temperature_c"),
        "minTemperatureC": payload.get("min_temperature_c"),
        "avgApparentTemperatureC": payload.get("avg_apparent_temperature_c"),
        "maxApparentTemperatureC": payload.get("max_apparent_temperature_c"),
        "avgHumidityPct": payload.get("avg_humidity_pct"),
        "totalPrecipitationMm": payload.get("total_precipitation_mm"),
        "avgCloudCoverPct": payload.get("avg_cloud_cover_pct"),
        "avgWindSpeedKmh": payload.get("avg_wind_speed_kmh"),
        "maxWindGustKmh": payload.get("max_wind_gust_kmh"),
        "avgShortwaveRadiationWm2": payload.get("avg_shortwave_radiation_wm2"),
        "hotMatch": bool(payload.get("hot_match")),
        "humidMatch": bool(payload.get("humid_match")),
        "windyMatch": bool(payload.get("windy_match")),
        "rainAffected": bool(payload.get("rain_affected")),
        "hourly": (raw or {}).get("hourly") if isinstance(raw, dict) else None,
    }


def match_result_for_players(
    conn: sqlite3.Connection,
    date: str,
    player1_name: str | None,
    player2_name: str | None,
) -> sqlite3.Row | None:
    if not table_exists(conn, "tennis_match_results"):
        return None
    if not player1_name or not player2_name:
        return None
    player1 = normalize_name(player1_name)
    player2 = normalize_name(player2_name)
    if not player1 or not player2:
        return None
    return conn.execute(
        """
        select *
        from tennis_match_results
        where slate_date = ?
          and (
            (player1_normalized_name = ? and player2_normalized_name = ?)
            or (player1_normalized_name = ? and player2_normalized_name = ?)
          )
        order by completed desc, updated_at desc
        limit 1
        """,
        (date, player1, player2, player2, player1),
    ).fetchone()


def parsed_result_score(
    result_row: sqlite3.Row | None,
    home_name: str | None,
    away_name: str | None,
) -> dict[str, Any] | None:
    if result_row is None:
        return None
    payload = as_json(result_row["raw_json"]) or {}
    players = payload.get("players") or []
    by_name = {normalize_name(player.get("name")): player for player in players if player.get("name")}

    def side_score(player_name: str | None) -> dict[str, int] | None:
        player = by_name.get(normalize_name(player_name))
        if not player:
            return None
        score: dict[str, int] = {}
        for item in player.get("scores") or []:
            try:
                period = int(item.get("set"))
                value = int(item.get("value"))
            except (TypeError, ValueError):
                continue
            score[f"period{period}"] = value
        return score or None

    home_score = side_score(home_name)
    away_score = side_score(away_name)
    if not home_score or not away_score:
        return None
    return {
        "home": home_score,
        "away": away_score,
        "winnerName": result_row["winner_name"],
        "winnerNormalizedName": result_row["winner_normalized_name"],
        "scoreline": result_row["scoreline"],
        "status": result_row["status"],
        "completed": bool(result_row["completed"]),
        "sourceUrl": result_row["source_url"],
    }


def pct_from_fractional(value: Any) -> float | None:
    if not value:
        return None
    text = str(value)
    if "/" not in text:
        return None
    left, right = text.split("/", 1)
    try:
        numerator = float(left)
        denominator = float(right)
    except ValueError:
        return None
    decimal = 1 + numerator / denominator if denominator else None
    if not decimal:
        return None
    return round(100 / decimal, 1)


def compact_sofascore_signals(raw_json: str | None, home_name: str | None, away_name: str | None) -> dict[str, Any]:
    payload = as_json(raw_json) or {}
    payloads = payload.get("payloads") or {}
    votes = (payloads.get("votes") or {}).get("body") or {}
    vote = votes.get("vote") or {}
    vote1 = vote.get("vote1") or 0
    vote2 = vote.get("vote2") or 0
    vote_total = vote1 + vote2
    winning_odds = (payloads.get("winningOdds") or {}).get("body") or {}
    home_odds = winning_odds.get("home") or {}
    away_odds = winning_odds.get("away") or {}
    tennis_power_rows = ((payloads.get("tennisPower") or {}).get("body") or {}).get("tennisPowerRankings") or []
    home_power = [row.get("value") for row in tennis_power_rows if isinstance(row.get("value"), (int, float)) and row.get("value") > 0]
    away_power = [abs(row.get("value")) for row in tennis_power_rows if isinstance(row.get("value"), (int, float)) and row.get("value") < 0]

    def season_stats(key: str) -> dict[str, Any] | None:
        body = (payloads.get(key) or {}).get("body") or {}
        stats = body.get("statistics") or {}
        if not stats:
            return None
        return {
            "matches": stats.get("matches"),
            "wins": stats.get("wins"),
            "aces": stats.get("aces"),
            "avgAces": stats.get("avgAces"),
            "doubleFaults": stats.get("doubleFaults"),
            "avgDoubleFaults": stats.get("avgDoubleFaults"),
            "firstServePct": stats.get("firstServePercentage"),
            "firstServeWonPct": stats.get("firstServePointsWonPercentage"),
            "secondServePct": stats.get("secondServePercentage"),
            "secondServeWonPct": stats.get("secondServePointsWonPercentage"),
            "breakPointsSavedPct": stats.get("breakPointsSavedPercentage"),
            "breakPointsConvertedPct": stats.get("breakPointsSavedConvertedPercentage"),
            "winners": stats.get("winnersTotal"),
            "unforcedErrors": stats.get("unforcedErrorsTotal"),
        }

    return {
        "source": "SofaScore",
        "votes": {
            "homeName": home_name,
            "awayName": away_name,
            "homeVotes": vote1,
            "awayVotes": vote2,
            "homePct": round(vote1 / vote_total * 100, 1) if vote_total else None,
            "awayPct": round(vote2 / vote_total * 100, 1) if vote_total else None,
        },
        "winningOdds": {
            "home": {
                "name": home_name,
                "fractionalValue": home_odds.get("fractionalValue"),
                "impliedPct": pct_from_fractional(home_odds.get("fractionalValue")),
                "expected": home_odds.get("expected"),
                "actual": home_odds.get("actual"),
            },
            "away": {
                "name": away_name,
                "fractionalValue": away_odds.get("fractionalValue"),
                "impliedPct": pct_from_fractional(away_odds.get("fractionalValue")),
                "expected": away_odds.get("expected"),
                "actual": away_odds.get("actual"),
            },
        },
        "tennisPower": {
            "rows": len(tennis_power_rows),
            "homePositiveGames": len(home_power),
            "awayPositiveGames": len(away_power),
            "avgHomePositivePower": average(home_power),
            "avgAwayPositivePower": average(away_power),
        },
        "seasonStats": {
            "home": season_stats("homeSeasonStats"),
            "away": season_stats("awaySeasonStats"),
        },
        "note": "SofaScore exposes public votes, book winning-odds expected/actual fields, tennis-power flow, and tournament-season stat aggregates. If their gated AI insight endpoint is unavailable, this is stored as source context rather than our pick.",
    }


def sofascore_signals_by_match(date: str) -> dict[str, dict[str, Any]]:
    source_dir = ROOT / "data-private" / "reference" / "tennis" / "sofascore-match-data"
    if not source_dir.exists():
        return {}
    signals: dict[str, dict[str, Any]] = {}
    for file_path in source_dir.glob("*.json"):
        if file_path.name.startswith("slate-map-"):
            continue
        try:
            raw_text = file_path.read_text(encoding="utf-8")
            payload = json.loads(raw_text)
        except (OSError, json.JSONDecodeError, UnicodeDecodeError):
            continue
        if payload.get("slateDate") != date:
            continue
        match_id = payload.get("boardMatchId")
        if not match_id:
            continue
        compact = compact_sofascore_signals(
            raw_text,
            (payload.get("compactEvent") or {}).get("homeTeam", {}).get("name"),
            (payload.get("compactEvent") or {}).get("awayTeam", {}).get("name"),
        )
        compact["eventId"] = payload.get("eventId")
        compact["sourceUrl"] = payload.get("sourceUrl")
        compact["capturedAt"] = payload.get("capturedAt")
        signals[str(match_id)] = compact
    return signals


def typed_match_rows(conn: sqlite3.Connection, date: str) -> list[dict[str, Any]]:
    return [
        dict(row)
        for row in conn.execute(
            """
            select
              m.match_id,
              m.match_date as slate_date,
              coalesce(m.tour, 'Tennis') as league,
              coalesce(t.name, 'Unknown tournament') || ' | ' || coalesce(m.round, 'Match') as stage,
              m.surface,
              m.start_time_utc,
              m.best_of,
              m.status,
              t.name as tournament_name,
              t.level as tournament_category,
              p1.name as player1_name,
              p2.name as player2_name,
              coalesce(m.start_time_utc, '') as updated_at,
              0 as start_minutes
            from matches m
            left join tournaments t on t.tournament_id = m.tournament_id
            left join match_players mp1 on mp1.match_id = m.match_id and mp1.side in (0, 1)
            left join players p1 on p1.player_id = mp1.player_id
            left join match_players mp2 on mp2.match_id = m.match_id and mp2.side in (2)
            left join players p2 on p2.player_id = mp2.player_id
            where m.match_date = ?
            order by coalesce(m.start_time_utc, ''), m.match_id
            """,
            (date,),
        )
    ]


def legacy_match_rows(conn: sqlite3.Connection, date: str) -> list[dict[str, Any]]:
    if table_exists(conn, "matches"):
        typed_rows = typed_match_rows(conn, date)
        if typed_rows:
            return typed_rows
    if table_exists(conn, "tennis_matches"):
        return [
            dict(row)
            for row in conn.execute(
                """
                select *
                from tennis_matches
                where slate_date = ?
                order by start_minutes, match_id
                """,
                (date,),
            )
        ]
    return []


def export_context(date: str, db_path: Path | None = None) -> dict[str, Any]:
    conn = connect(db_path)
    matches: dict[str, Any] = {}
    players_by_name = typed_recent_form_by_player(conn)
    player_page_expected = player_page_expected_stats(conn, date)
    external_signals_by_match: dict[str, dict[str, Any]] = {}
    if not matches:
        for row in legacy_match_rows(conn, date):
            match_id = row["match_id"]
            player_expected = expected_stats(conn, match_id)
            form_metrics_by_player = recent_form_metrics(conn, match_id)
            h2h_rows = h2h_match_rows(conn, match_id)
            weather = match_weather(conn, match_id)
            if not str(match_id).startswith("rg-") and (weather or {}).get("venueKey") == "roland-garros":
                weather = None
            result_score = parsed_result_score(
                match_result_for_players(conn, date, row.get("player1_name"), row.get("player2_name")),
                row.get("player1_name"),
                row.get("player2_name"),
            )
            match_surface = row.get("surface") or "Unknown"
            stage_parts = [part.strip() for part in str(row.get("stage") or "").split("|") if part.strip()]
            tournament = stage_parts[0] if stage_parts else row.get("stage") or "Unknown tournament"
            category = row.get("league") or "Tennis"
            players = []
            for side, player_name in (("home", row.get("player1_name")), ("away", row.get("player2_name"))):
                if not player_name:
                    continue
                player_key = normalize_name(player_name)
                expected = player_expected.get(player_key)
                page_expected = expected_stats_for_surface(player_page_expected.get(player_key), match_surface)
                if expected and page_expected:
                    expected_stats_non_null = {
                        key: value
                        for key, value in (expected.get("stats") or {}).items()
                        if value is not None
                    }
                    expected = {
                        **page_expected,
                        **expected,
                        "source": expected.get("source") if expected_stats_non_null else page_expected.get("source"),
                        "matches": expected.get("matches") or page_expected.get("matches"),
                        "note": expected.get("note") if expected_stats_non_null else page_expected.get("note"),
                        "stats": {
                            **(page_expected.get("stats") or {}),
                            **expected_stats_non_null,
                        },
                    }
                elif page_expected:
                    expected = page_expected
                form_metrics = form_metrics_by_player.get(player_key)
                player_by_name = players_by_name.get(player_key) or {}
                form_expected = expected_stats_from_form_metrics(form_metrics)
                if expected and form_expected:
                    expected_stats_non_null = {
                        key: value
                        for key, value in (expected.get("stats") or {}).items()
                        if value is not None
                    }
                    form_stats_non_null = {
                        key: value
                        for key, value in (form_expected.get("stats") or {}).items()
                        if value is not None
                    }
                    expected = {
                        **expected,
                        "source": form_expected.get("source") if form_stats_non_null else expected.get("source"),
                        "matches": form_expected.get("matches") or expected.get("matches"),
                        "note": form_expected.get("note") if form_stats_non_null else expected.get("note"),
                        "stats": {
                            **expected_stats_non_null,
                            **form_stats_non_null,
                        },
                        "pressureSamples": complete_pressure_samples_from_stats(
                            {
                                **(expected.get("pressureSamples") or {}),
                                **(form_expected.get("pressureSamples") or {}),
                            },
                            {
                                **expected_stats_non_null,
                                **form_stats_non_null,
                            },
                        ),
                        "sourceUrl": expected.get("sourceUrl") or form_expected.get("sourceUrl"),
                    }
                elif form_expected:
                    expected = form_expected
                stats = {}
                if expected and expected.get("stats"):
                    stats = expected.get("stats") or {}
                players.append(
                    {
                        "name": player_name,
                        "side": side,
                        "stats": {},
                        "profile": player_by_name.get("profile"),
                        "ranking": player_by_name.get("ranking"),
                        "formChart": player_by_name.get("formChart"),
                        "expectedStats": expected
                        or {
                            "source": "TennisLive recent-form metric fallback",
                            "matches": len((form_metrics or {}).get("matches") or []),
                            "note": "Expected rows are shown from TennisLive recent-form metrics.",
                            "stats": stats,
                        },
                        "recentFormMetrics": form_metrics,
                    }
                )

            expected_stat_rows = sum(
                len((player.get("expectedStats") or {}).get("stats") or {})
                for player in players
            )
            recent_metric_rows = sum(
                len(((player.get("recentFormMetrics") or {}).get("summary") or []))
                for player in players
            )
            matches[match_id] = {
                "source": "SQLite tennis warehouse fallback",
                "eventId": row.get("match_id"),
                "sourceUrl": None,
                "capturedAt": row.get("updated_at"),
                "surface": match_surface,
                "tournament": tournament,
                "category": category,
                "startTimestamp": weather.get("startTs") if weather else None,
                "players": players,
                "h2h": {
                    "homeName": row.get("player1_name"),
                    "awayName": row.get("player2_name"),
                    "homeWins": None,
                    "awayWins": None,
                    "draws": None,
                    "matches": h2h_rows,
                    "coverage": {
                        "datedRows": len([item for item in h2h_rows if item.get("dateLabel") or item.get("isoDate")]),
                        "surfaceRows": len([item for item in h2h_rows if item.get("surface")]),
                        "weightedRows": len([item for item in h2h_rows if isinstance(item.get("weight"), (int, float))]),
                    },
                },
                "score": {
                    "home": (result_score or {}).get("home"),
                    "away": (result_score or {}).get("away"),
                },
                "result": result_score,
                "externalSignals": external_signals_by_match.get(match_id),
                "weather": weather,
                "allStatRows": [],
                "coverage": {
                    "hasEvent": False,
                    "hasH2h": bool(h2h_rows),
                    "allStatRows": 0,
                    "playerStatRows": 0,
                    "liveStatRows": 0,
                    "expectedStatRows": expected_stat_rows,
                    "recentMetricRows": recent_metric_rows,
                    "seasonStatRows": 0,
                    "liveStatsStatus": None,
                    "hasWeather": weather is not None and bool(weather.get("hourlyRows")),
                    "isPregame": True,
                },
            }
    conn.close()
    return {
        "date": date,
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "source": "SQLite tennis warehouse",
        "playersByName": players_by_name,
        "matches": matches,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Export tennis warehouse context for the web app.")
    parser.add_argument("--date", required=True)
    parser.add_argument(
        "--output",
        default="",
        help="Output path. Defaults to web/src/lib/day-YYYY-MM-DD-tennis-warehouse-context.generated.json",
    )
    args = parser.parse_args()
    output = Path(args.output) if args.output else ROOT / "web" / "src" / "lib" / f"day-{args.date}-tennis-warehouse-context.generated.json"
    if not output.is_absolute():
        output = ROOT / output
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(export_context(args.date), indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    try:
        display_path = output.relative_to(ROOT)
    except ValueError:
        display_path = output
    print(f"Wrote tennis warehouse context to {display_path}")


if __name__ == "__main__":
    main()
