#!/usr/bin/env python3
from __future__ import annotations

import argparse
import datetime as dt
import json
import sqlite3
import sys
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_DB = ROOT / "data-private" / "warehouse" / "sports.db"
REFERENCE_DIR = ROOT / "data-private" / "reference" / "tennis"
PUBLISHED_SLATES_DIR = ROOT / "published-data" / "slates"

CORE_RECENT_METRICS = {"hold", "secondServe", "errorControl", "returnPressure", "closeout"}

REQUIRED_TABLES = [
    "tennis_matches",
    "tennis_flashscore_recent_links",
    "tennis_recent_form_metrics",
    "tennis_sofascore_matches",
    "tennis_kalshi_match_markets",
    "tennis_prediction_market_snapshots",
    "tennis_rankings",
    "tennis_match_results",
    "tennis_model_training_rows",
    "tennis_weather_hourly",
    "tennis_match_weather",
]


def connect(db_path: Path) -> sqlite3.Connection:
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    return conn


def table_exists(conn: sqlite3.Connection, table_name: str) -> bool:
    row = conn.execute(
        "select 1 from sqlite_master where type = 'table' and name = ?",
        (table_name,),
    ).fetchone()
    return row is not None


def read_json(path: Path) -> dict[str, Any]:
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def scalar(conn: sqlite3.Connection, sql: str, params: tuple[Any, ...]) -> int:
    return int(conn.execute(sql, params).fetchone()[0] or 0)


def resolve_settled(date: str, explicit: bool | None) -> bool:
    if explicit is not None:
        return explicit
    try:
        return dt.date.fromisoformat(date) < dt.date.today()
    except ValueError:
        return False


def check_source_files(date: str) -> dict[str, Any]:
    paths = {
        "scoreboard": REFERENCE_DIR / f"espn-scoreboard-{date}.json",
        "rankingsHistory": REFERENCE_DIR / "player-rankings-history" / f"{date}.json",
        "fanduelLines": REFERENCE_DIR / f"fanduel-lines-{date}.json",
    }
    statuses = {}
    missing_required = []
    for key, path in paths.items():
        exists = path.exists() and path.stat().st_size > 0
        statuses[key] = {"path": str(path), "exists": exists, "bytes": path.stat().st_size if path.exists() else 0}
        if key in {"scoreboard", "rankingsHistory"} and not exists:
            missing_required.append(key)
    ok = not missing_required
    return {"ok": ok, "files": statuses, "error": None if ok else f"missing required source files: {', '.join(missing_required)}"}


def check_recent_map(date: str) -> dict[str, Any]:
    path = REFERENCE_DIR / f"flashscore-recent-match-map-{date}.json"
    if not path.exists():
        return {"ok": False, "path": str(path), "error": "missing Flashscore recent-match map"}
    payload = read_json(path)
    coverage = payload.get("coverage") or {}
    fetched = int(coverage.get("fetchedRows") or 0)
    matched = int(coverage.get("matchedRows") or 0)
    recent = int(coverage.get("recentRows") or 0)
    ok = fetched > 0 and matched > 0 and recent > 0
    return {"ok": ok, "path": str(path), "coverage": coverage, "error": None if ok else "empty Flashscore recent-match coverage"}


def check_warehouse(conn: sqlite3.Connection, date: str) -> dict[str, Any]:
    missing_tables = [table for table in REQUIRED_TABLES if not table_exists(conn, table)]
    if missing_tables:
        return {"ok": False, "error": "missing tennis warehouse tables", "missingTables": missing_tables}

    match_count = conn.execute("select count(*) from tennis_matches where slate_date = ?", (date,)).fetchone()[0]
    recent_links = conn.execute(
        "select count(*) from tennis_flashscore_recent_links where slate_date = ?",
        (date,),
    ).fetchone()[0]
    metric_rows = conn.execute(
        """
        select count(*)
        from tennis_recent_form_metrics metrics
        join tennis_matches matches on matches.match_id = metrics.match_id
        where matches.slate_date = ?
        """,
        (date,),
    ).fetchone()[0]
    visible_missing = [
        dict(row)
        for row in conn.execute(
            """
            select
              metrics.match_id,
              metrics.player_name,
              metrics.normalized_name,
              sum(case when metrics.score is null then 1 else 0 end) as missing_cells,
              count(*) as cells
            from tennis_recent_form_metrics metrics
            join tennis_matches matches on matches.match_id = metrics.match_id
            where matches.slate_date = ?
              and metrics.recent_index < 5
              and metrics.metric_key in ('hold', 'secondServe', 'errorControl', 'returnPressure', 'closeout')
            group by metrics.match_id, metrics.normalized_name
            having missing_cells > 0
            order by missing_cells desc, metrics.match_id, metrics.normalized_name
            """,
            (date,),
        ).fetchall()
    ]
    partial_depth_players = [
        dict(row)
        for row in conn.execute(
            """
            select
              metrics.match_id,
              metrics.player_name,
              metrics.normalized_name,
              count(*) as visible_cells
            from tennis_recent_form_metrics metrics
            join tennis_matches matches on matches.match_id = metrics.match_id
            where matches.slate_date = ?
              and metrics.recent_index < 5
              and metrics.metric_key in ('hold', 'secondServe', 'errorControl', 'returnPressure', 'closeout')
            group by metrics.match_id, metrics.normalized_name
            having visible_cells < 25
            order by visible_cells, metrics.match_id, metrics.normalized_name
            """,
            (date,),
        ).fetchall()
    ]
    ok = match_count > 0 and recent_links > 0 and metric_rows > 0 and not visible_missing
    return {
        "ok": ok,
        "matchCount": match_count,
        "recentLinks": recent_links,
        "metricRows": metric_rows,
        "visibleMissing": visible_missing,
        "partialDepthPlayers": partial_depth_players,
        "error": None if ok else "warehouse recent-form coverage is incomplete",
    }


def check_rankings(conn: sqlite3.Connection, date: str) -> dict[str, Any]:
    ranking_rows = scalar(conn, "select count(*) from tennis_rankings where as_of_date = ?", (date,))
    history_path = REFERENCE_DIR / "player-rankings-history" / f"{date}.json"
    ok = ranking_rows > 0 and history_path.exists() and history_path.stat().st_size > 0
    return {
        "ok": ok,
        "rankingRows": ranking_rows,
        "historyPath": str(history_path),
        "historyFileExists": history_path.exists(),
        "error": None if ok else "missing dated ranking snapshot or imported ranking rows",
    }


def check_sofascore(conn: sqlite3.Connection, date: str, match_count: int, settled: bool) -> dict[str, Any]:
    mapped_matches = scalar(
        conn,
        "select count(*) from tennis_sofascore_matches where slate_date = ? and board_match_id is not null",
        (date,),
    )
    player_stat_rows = scalar(
        conn,
        "select count(*) from tennis_sofascore_player_stat_rows where slate_date = ? and board_match_id is not null",
        (date,),
    )
    replay_games = scalar(
        conn,
        "select count(*) from tennis_sofascore_replay_games where slate_date = ? and board_match_id is not null",
        (date,),
    )
    replay_points = scalar(
        conn,
        "select count(*) from tennis_sofascore_replay_points where slate_date = ? and board_match_id is not null",
        (date,),
    )
    mapping_ok = match_count > 0 and mapped_matches >= match_count
    settled_ok = not settled or (player_stat_rows > 0 and replay_games > 0 and replay_points > 0)
    ok = mapping_ok and settled_ok
    return {
        "ok": ok,
        "mappedMatches": mapped_matches,
        "matchCount": match_count,
        "playerStatRows": player_stat_rows,
        "replayGames": replay_games,
        "replayPoints": replay_points,
        "mode": "settled" if settled else "pregame",
        "error": None if ok else "SofaScore coverage is incomplete for this slate/mode",
    }


def check_kalshi(conn: sqlite3.Connection, date: str, match_count: int, settled: bool) -> dict[str, Any]:
    match_markets = scalar(conn, "select count(*) from tennis_kalshi_match_markets where slate_date = ?", (date,))
    candles = scalar(conn, "select count(*) from tennis_kalshi_market_candles where slate_date = ?", (date,))
    trade_features = scalar(conn, "select count(*) from tennis_kalshi_intramatch_trade_features where slate_date = ?", (date,))
    prediction_market_rows = scalar(conn, "select count(*) from tennis_prediction_market_snapshots where slate_date = ?", (date,))
    markets_ok = match_count > 0 and match_markets >= match_count and prediction_market_rows >= match_count * 2
    settled_ok = not settled or (candles > 0 and trade_features > 0)
    ok = markets_ok and settled_ok
    return {
        "ok": ok,
        "matchMarkets": match_markets,
        "predictionMarketRows": prediction_market_rows,
        "candles": candles,
        "tradeFeatures": trade_features,
        "mode": "settled" if settled else "pregame",
        "error": None if ok else "Kalshi/prediction-market coverage is incomplete for this slate/mode",
    }


def check_weather(conn: sqlite3.Connection, date: str, match_count: int, settled: bool) -> dict[str, Any]:
    if not table_exists(conn, "tennis_weather_hourly") or not table_exists(conn, "tennis_match_weather"):
        return {
            "ok": False,
            "hourlyRows": 0,
            "matchWeatherRows": 0,
            "mode": "settled" if settled else "pregame",
            "error": "weather warehouse tables are missing",
        }
    hourly_rows = scalar(conn, "select count(*) from tennis_weather_hourly where weather_date = ?", (date,))
    match_weather_rows = scalar(conn, "select count(*) from tennis_match_weather where slate_date = ?", (date,))
    complete_rows = scalar(
        conn,
        """
        select count(*)
        from tennis_match_weather
        where slate_date = ?
          and hourly_rows > 0
          and avg_temperature_c is not null
          and start_ts is not null
          and end_ts is not null
        """,
        (date,),
    )
    ok = hourly_rows > 0 and match_count > 0 and match_weather_rows >= match_count and complete_rows >= match_count
    return {
        "ok": ok,
        "hourlyRows": hourly_rows,
        "matchWeatherRows": match_weather_rows,
        "completeRows": complete_rows,
        "matchCount": match_count,
        "mode": "settled" if settled else "pregame",
        "error": None if ok else "weather coverage is incomplete for this slate",
    }


def check_results_and_training(conn: sqlite3.Connection, date: str, match_count: int, settled: bool) -> dict[str, Any]:
    result_rows = scalar(conn, "select count(*) from tennis_match_results where slate_date = ?", (date,))
    completed_results = scalar(conn, "select count(*) from tennis_match_results where slate_date = ? and completed = 1", (date,))
    training_rows = scalar(conn, "select count(*) from tennis_model_training_rows where slate_date = ?", (date,))
    labels = scalar(
        conn,
        "select count(*) from tennis_model_training_rows where slate_date = ? and training_label_available = 1",
        (date,),
    )
    ok = True
    error = None
    if settled:
        ok = result_rows >= match_count and completed_results >= match_count and training_rows >= match_count and labels >= match_count
        error = None if ok else "settled slate is missing result rows or model-training labels"
    return {
        "ok": ok,
        "mode": "settled" if settled else "pregame",
        "resultRows": result_rows,
        "completedResults": completed_results,
        "trainingRows": training_rows,
        "trainingLabels": labels,
        "error": error,
    }


def check_published(date: str) -> dict[str, Any]:
    games_dir = PUBLISHED_SLATES_DIR / date / "games"
    if not games_dir.exists():
        return {"ok": False, "path": str(games_dir), "error": "missing published slate games directory"}
    files = sorted(games_dir.glob("*.json"))
    missing: list[dict[str, Any]] = []
    checked_players = 0
    for path in files:
        game = read_json(path)
        context = (game.get("tennisContext") or {}).get("warehouseContext") or {}
        for player in context.get("players") or []:
            form = player.get("recentFormMetrics") or {}
            matches = (form.get("matches") or [])[:5]
            for index, recent in enumerate(matches):
                metrics = recent.get("metrics") or {}
                for metric_key in CORE_RECENT_METRICS:
                    score = (metrics.get(metric_key) or {}).get("score")
                    if score is None:
                        missing.append(
                            {
                                "game": path.name,
                                "player": player.get("name"),
                                "recentIndex": index,
                                "metric": metric_key,
                            }
                        )
            if matches:
                checked_players += 1
    ok = bool(files) and checked_players > 0 and not missing
    return {
        "ok": ok,
        "gameFiles": len(files),
        "checkedPlayers": checked_players,
        "missingCells": missing[:50],
        "missingCellCount": len(missing),
        "error": None if ok else "published tennis detail payload has missing visible recent-form cells",
    }


def run_health(date: str, db_path: Path = DEFAULT_DB, settled: bool | None = None) -> dict[str, Any]:
    is_settled = resolve_settled(date, settled)
    checks: dict[str, Any] = {"date": date, "mode": "settled" if is_settled else "pregame"}
    checks["sourceFiles"] = check_source_files(date)
    checks["recentMap"] = check_recent_map(date)
    with connect(db_path) as conn:
        checks["warehouse"] = check_warehouse(conn, date)
        match_count = int(checks["warehouse"].get("matchCount") or 0)
        checks["rankings"] = check_rankings(conn, date)
        checks["sofascore"] = check_sofascore(conn, date, match_count, is_settled)
        checks["kalshi"] = check_kalshi(conn, date, match_count, is_settled)
        checks["weather"] = check_weather(conn, date, match_count, is_settled)
        checks["resultsTraining"] = check_results_and_training(conn, date, match_count, is_settled)
    checks["published"] = check_published(date)
    checks["ok"] = all(check.get("ok") for key, check in checks.items() if isinstance(check, dict) and key not in {"date"})
    return checks


def main() -> int:
    parser = argparse.ArgumentParser(description="Fail-fast health checks for tennis slate pipeline outputs.")
    parser.add_argument("--date", required=True)
    parser.add_argument("--db", default=str(DEFAULT_DB))
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument("--settled", action="store_true", help="Require result, replay, candle, and training-label coverage.")
    mode.add_argument("--pregame", action="store_true", help="Only require pre-match source, mapping, and market coverage.")
    parser.add_argument("--json", action="store_true", help="Print machine-readable JSON only.")
    args = parser.parse_args()

    settled_arg = True if args.settled else False if args.pregame else None
    report = run_health(args.date, Path(args.db), settled=settled_arg)
    if args.json:
        print(json.dumps(report, indent=2, sort_keys=True))
    else:
        status = "PASS" if report["ok"] else "FAIL"
        print(f"Tennis pipeline health {status} for {args.date} ({report['mode']})")
        for name in ("sourceFiles", "rankings", "recentMap", "warehouse", "sofascore", "kalshi", "weather", "resultsTraining", "published"):
            check = report[name]
            marker = "ok" if check["ok"] else "bad"
            print(f"- {name}: {marker}")
            if check.get("error"):
                print(f"  {check['error']}")
        if not report["ok"]:
            print(json.dumps(report, indent=2, sort_keys=True))
    return 0 if report["ok"] else 1


if __name__ == "__main__":
    sys.exit(main())
