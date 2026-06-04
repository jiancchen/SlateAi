#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import sqlite3
import sys
from collections import defaultdict
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[3]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from pipeline.lib.warehouse_paths import tennis_warehouse_path

DB_PATH = tennis_warehouse_path()
DEFAULT_OUTPUT = ROOT / "data-private" / "models" / "tennis-sofascore-replays.jsonl"


def row_dict(row: sqlite3.Row) -> dict[str, Any]:
    return {key: row[key] for key in row.keys()}


def player_for_side(match: dict[str, Any], side: str | None) -> str | None:
    if side == "home":
        return match.get("home_player_name")
    if side == "away":
        return match.get("away_player_name")
    return None


def build_flow_summary(match: dict[str, Any], games: list[dict[str, Any]]) -> dict[str, Any]:
    players = {
        "home": match.get("home_player_name"),
        "away": match.get("away_player_name"),
    }
    summary = {
        side: {
            "player": player,
            "serviceGames": 0,
            "holds": 0,
            "breaksLost": 0,
            "returnGames": 0,
            "breaksWon": 0,
            "longGames": 0,
            "setsWon": 0,
        }
        for side, player in players.items()
    }
    set_final: dict[int, dict[str, Any]] = {}
    for game in games:
        serving = game.get("serving_side")
        scoring = game.get("scoring_side")
        if serving in summary:
            summary[serving]["serviceGames"] += 1
            if serving == scoring:
                summary[serving]["holds"] += 1
            elif scoring in summary:
                summary[serving]["breaksLost"] += 1
        if scoring in summary and serving in summary and scoring != serving:
            summary[scoring]["breaksWon"] += 1
        for side in summary:
            if side != serving:
                summary[side]["returnGames"] += 1
            if int(game.get("point_count") or 0) >= 8:
                summary[side]["longGames"] += 1
        set_final[int(game["set_number"])] = game

    for game in set_final.values():
        home_games = int(game.get("home_games_after") or 0)
        away_games = int(game.get("away_games_after") or 0)
        if home_games > away_games:
            summary["home"]["setsWon"] += 1
        elif away_games > home_games:
            summary["away"]["setsWon"] += 1

    for side, data in summary.items():
        service_games = data["serviceGames"]
        return_games = data["returnGames"]
        data["holdRate"] = round(data["holds"] / service_games, 3) if service_games else None
        data["breakRate"] = round(data["breaksWon"] / return_games, 3) if return_games else None
    return summary


def export_replays(output_path: Path, start_date: str | None = None, end_date: str | None = None) -> dict[str, Any]:
    if not output_path.is_absolute():
        output_path = ROOT / output_path
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    where = ["exists (select 1 from tennis_sofascore_replay_games g where g.sofascore_event_id = m.sofascore_event_id)"]
    params: list[Any] = []
    if start_date:
        where.append("m.slate_date >= ?")
        params.append(start_date)
    if end_date:
        where.append("m.slate_date <= ?")
        params.append(end_date)
    matches = [
        row_dict(row)
        for row in conn.execute(
            f"""
            select *
            from tennis_sofascore_matches m
            where {' and '.join(where)}
            order by slate_date, start_timestamp, board_match_id
            """,
            params,
        ).fetchall()
    ]

    output_path.parent.mkdir(parents=True, exist_ok=True)
    counts = {"matches": 0, "games": 0, "points": 0}
    with output_path.open("w", encoding="utf-8") as handle:
        for match in matches:
            event_id = match["sofascore_event_id"]
            games = [
                row_dict(row)
                for row in conn.execute(
                    """
                    select *
                    from tennis_sofascore_replay_games
                    where sofascore_event_id = ?
                    order by set_number, game_number
                    """,
                    (event_id,),
                ).fetchall()
            ]
            points_by_game: dict[tuple[int, int], list[dict[str, Any]]] = defaultdict(list)
            for row in conn.execute(
                """
                select *
                from tennis_sofascore_replay_points
                where sofascore_event_id = ?
                order by set_number, game_number, point_index
                """,
                (event_id,),
            ).fetchall():
                point = row_dict(row)
                points_by_game[(int(point["set_number"]), int(point["game_number"]))].append(point)

            replay_games = []
            for game in games:
                scoring_player = player_for_side(match, game.get("scoring_side"))
                serving_player = player_for_side(match, game.get("serving_side"))
                replay_games.append(
                    {
                        "set": game.get("set_number"),
                        "game": game.get("game_number"),
                        "server": serving_player,
                        "winner": scoring_player,
                        "isBreak": bool(game.get("break_game")),
                        "scoreAfter": {
                            "home": game.get("home_games_after"),
                            "away": game.get("away_games_after"),
                        },
                        "pointCount": game.get("point_count"),
                        "points": [
                            {
                                "index": point.get("point_index"),
                                "homePoint": point.get("home_point"),
                                "awayPoint": point.get("away_point"),
                                "homePointType": point.get("home_point_type"),
                                "awayPointType": point.get("away_point_type"),
                                "raw": json.loads(point["raw_json"]) if point.get("raw_json") else None,
                            }
                            for point in points_by_game[(int(game["set_number"]), int(game["game_number"]))]
                        ],
                    }
                )
            record = {
                "source": "SofaScore",
                "eventId": event_id,
                "slateDate": match.get("slate_date"),
                "boardMatchId": match.get("board_match_id"),
                "sourceUrl": match.get("source_url"),
                "tournament": match.get("tournament_name"),
                "surface": match.get("surface"),
                "players": {
                    "home": {
                        "name": match.get("home_player_name"),
                        "normalizedName": match.get("home_normalized_name"),
                        "rank": match.get("home_rank") or match.get("home_current_rank"),
                        "country": match.get("home_country"),
                    },
                    "away": {
                        "name": match.get("away_player_name"),
                        "normalizedName": match.get("away_normalized_name"),
                        "rank": match.get("away_rank") or match.get("away_current_rank"),
                        "country": match.get("away_country"),
                    },
                },
                "flowSummary": build_flow_summary(match, games),
                "games": replay_games,
            }
            handle.write(json.dumps(record, ensure_ascii=False, separators=(",", ":")) + "\n")
            counts["matches"] += 1
            counts["games"] += len(games)
            counts["points"] += sum(len(game["points"]) for game in replay_games)
    conn.close()
    try:
        output_label = str(output_path.relative_to(ROOT))
    except ValueError:
        output_label = str(output_path)
    return counts | {"output": output_label}


def main() -> None:
    parser = argparse.ArgumentParser(description="Export SofaScore tennis point-by-point replays as JSONL.")
    parser.add_argument("--start-date")
    parser.add_argument("--end-date")
    parser.add_argument("--output", default=str(DEFAULT_OUTPUT))
    args = parser.parse_args()
    print(json.dumps(export_replays(Path(args.output), args.start_date, args.end_date), indent=2))


if __name__ == "__main__":
    main()
