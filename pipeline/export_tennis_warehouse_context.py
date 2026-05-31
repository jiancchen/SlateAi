#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import sqlite3
import unicodedata
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
DB_PATH = ROOT / "data-private" / "warehouse" / "sports.db"


def connect() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def as_json(value: str | None) -> Any:
    if not value:
        return None
    try:
        return json.loads(value)
    except json.JSONDecodeError:
        return value


def normalize_name(value: str | None) -> str:
    ascii_value = unicodedata.normalize("NFKD", str(value or "")).encode("ascii", "ignore").decode("ascii")
    return " ".join(ascii_value.strip().lower().split())


def stat_rows(conn: sqlite3.Connection, event_id: str, period: str = "ALL") -> list[dict[str, Any]]:
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


def recent_form_metrics(conn: sqlite3.Connection, match_id: str) -> dict[str, dict[str, Any]]:
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


def h2h_match_rows(conn: sqlite3.Connection, match_id: str) -> list[dict[str, Any]]:
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


def expected_stats(conn: sqlite3.Connection, match_id: str) -> dict[str, dict[str, Any]]:
    rows = conn.execute(
        """
        select player_name, normalized_name, raw_json
        from tennis_player_match_context
        where match_id = ?
        """,
        (match_id,),
    ).fetchall()
    result: dict[str, dict[str, Any]] = {}
    for row in rows:
        payload = as_json(row["raw_json"]) or {}
        service = payload.get("serviceData") or {}
        recent_stats = [
            match.get("serviceStats") or {}
            for match in payload.get("recentMatches") or []
            if match.get("serviceStats")
        ]
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
            },
        }
    return result


def match_weather(conn: sqlite3.Connection, match_id: str) -> dict[str, Any] | None:
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


def export_context(date: str) -> dict[str, Any]:
    conn = connect()
    matches: dict[str, Any] = {}
    for match in conn.execute(
        """
        select *
        from tennis_sofascore_matches
        where slate_date = ?
        order by board_match_id
        """,
        (date,),
    ):
        row = dict(match)
        event_id = row["sofascore_event_id"]
        rows = stat_rows(conn, event_id)
        players = player_stat_summary(rows)
        player_expected = expected_stats(conn, row["board_match_id"])
        sofascore_signals = compact_sofascore_signals(
            row.get("raw_json"),
            row.get("home_player_name"),
            row.get("away_player_name"),
        )
        form_metrics_by_player = recent_form_metrics(conn, row["board_match_id"])
        h2h_rows = h2h_match_rows(conn, row["board_match_id"])
        weather = match_weather(conn, row["board_match_id"])
        season_stats = sofascore_signals.get("seasonStats") or {}
        home_season_stats = season_stats.get("home") or {}
        away_season_stats = season_stats.get("away") or {}
        side_expected = {
            "home": {
                "source": "SofaScore tournament-season stats",
                "matches": home_season_stats.get("matches"),
                "note": "Fallback expected stats from SofaScore tournament-season aggregate.",
                "stats": home_season_stats,
            },
            "away": {
                "source": "SofaScore tournament-season stats",
                "matches": away_season_stats.get("matches"),
                "note": "Fallback expected stats from SofaScore tournament-season aggregate.",
                "stats": away_season_stats,
            },
        }

        def side_for_player(player_name: str | None) -> str | None:
            if not player_name:
                return None
            if normalize_name(player_name) == normalize_name(row.get("home_player_name")):
                return "home"
            if normalize_name(player_name) == normalize_name(row.get("away_player_name")):
                return "away"
            return None

        def merged_expected(player_name: str | None, side: str | None) -> dict[str, Any] | None:
            recent_expected = player_expected.get(normalize_name(player_name)) or {}
            season_expected = side_expected.get(side or "") or {}
            recent_stats = {
                key: value
                for key, value in (recent_expected.get("stats") or {}).items()
                if value is not None
            }
            season_stats = {
                key: value
                for key, value in (season_expected.get("stats") or {}).items()
                if value is not None
            }
            stats = {**season_stats, **recent_stats}
            if not stats:
                return None
            return {
                "source": recent_expected.get("source") or season_expected.get("source"),
                "matches": recent_expected.get("matches") or season_expected.get("matches"),
                "note": "Pregame expected stats merge recent joined match rows with SofaScore tournament-season aggregates where available.",
                "stats": stats,
            }

        for player_key, expected in player_expected.items():
            player_name = expected.get("name") or player_key
            side = side_for_player(player_name)
            bucket = players.setdefault(player_key, {"name": player_name, "side": side, "stats": {}})
            if not bucket.get("side"):
                bucket["side"] = side
            bucket["expectedStats"] = merged_expected(player_name, bucket.get("side")) or expected
        for bucket in players.values():
            if not bucket.get("expectedStats"):
                bucket["expectedStats"] = merged_expected(bucket.get("name"), bucket.get("side"))
            form_metrics = form_metrics_by_player.get(normalize_name(bucket.get("name")))
            if form_metrics:
                bucket["recentFormMetrics"] = form_metrics
        for side, player_name in (("home", row.get("home_player_name")), ("away", row.get("away_player_name"))):
            player_key = normalize_name(player_name)
            if player_name and player_key not in players:
                players[player_key] = {
                    "name": player_name,
                    "side": side,
                    "stats": {},
                    "expectedStats": merged_expected(player_name, side),
                }
            if player_name and form_metrics_by_player.get(normalize_name(player_name)):
                players[player_key]["recentFormMetrics"] = form_metrics_by_player.get(player_key)
        expected_stat_rows = sum(
            len((player.get("expectedStats") or {}).get("stats") or {})
            for player in players.values()
        )
        season_stat_rows = sum(
            len(stats or {})
            for stats in (home_season_stats, away_season_stats)
        )
        stats_response = ((as_json(row.get("raw_json")) or {}).get("payloads") or {}).get("statistics") or {}
        live_stats_status = stats_response.get("status")
        matches[row["board_match_id"]] = {
            "source": "SofaScore warehouse",
            "eventId": event_id,
            "sourceUrl": row["source_url"],
            "capturedAt": row["captured_at"],
            "surface": row["surface"],
            "tournament": row["tournament_name"],
            "category": row["tournament_category"],
            "startTimestamp": row["start_timestamp"],
            "players": list(players.values()),
            "h2h": {
                "homeName": row["home_player_name"],
                "awayName": row["away_player_name"],
                "homeWins": row["h2h_home_wins"],
                "awayWins": row["h2h_away_wins"],
                "draws": row["h2h_draws"],
                "matches": h2h_rows,
                "coverage": {
                    "datedRows": len([item for item in h2h_rows if item.get("dateLabel") or item.get("isoDate")]),
                    "surfaceRows": len([item for item in h2h_rows if item.get("surface")]),
                    "weightedRows": len([item for item in h2h_rows if isinstance(item.get("weight"), (int, float))]),
                },
            },
            "score": {
                "home": as_json(row["home_score_json"]),
                "away": as_json(row["away_score_json"]),
            },
            "sofascoreSignals": sofascore_signals,
            "weather": weather,
            "allStatRows": rows,
            "coverage": {
                "hasEvent": True,
                "hasH2h": row["h2h_home_wins"] is not None or row["h2h_away_wins"] is not None,
                "allStatRows": len(rows),
                "playerStatRows": len(rows),
                "liveStatRows": len(rows),
                "expectedStatRows": expected_stat_rows,
                "seasonStatRows": season_stat_rows,
                "liveStatsStatus": live_stats_status,
                "hasWeather": weather is not None and bool(weather.get("hourlyRows")),
                "isPregame": len(rows) == 0 and expected_stat_rows > 0,
            },
        }
    conn.close()
    return {
        "date": date,
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "source": "SQLite tennis warehouse",
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
    print(f"Wrote tennis warehouse context to {output.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
