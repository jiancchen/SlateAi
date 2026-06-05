#!/usr/bin/env python3
from __future__ import annotations

import argparse
import datetime as dt
import json
import sqlite3
import sys
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[3]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from pipeline.lib.warehouse_paths import tennis_warehouse_path

DEFAULT_DB = tennis_warehouse_path()
REFERENCE_DIR = ROOT / "data-private" / "reference" / "tennis"
PUBLISHED_SLATES_DIR = ROOT / "published-data" / "slates"
KALSHI_SPIKE_MODEL_PATH = ROOT / "web" / "src" / "lib" / "kalshi-tennis-spike-model.generated.json"

CORE_RECENT_METRICS = {"hold", "secondServe", "errorControl", "returnPressure", "closeout"}
MATCH_SURFACE_ENUM = {"Clay", "Grass", "Hard", "Indoor Hard", "Carpet", "Acrylic", "Unknown"}

REQUIRED_TABLES = [
    "matches",
    "match_players",
    "players",
    "recent_matches",
    "match_stat_rows",
    "player_form_snapshots",
    "tennislive_player_profiles",
    "tennislive_player_match_links",
    "tennislive_form_chart_points",
    "tennislive_match_sources",
    "tennis_kalshi_match_markets",
    "tennis_prediction_market_snapshots",
    "tennis_match_results",
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
    try:
        return int(conn.execute(sql, params).fetchone()[0] or 0)
    except sqlite3.OperationalError as exc:
        if "no such table" in str(exc).lower():
            return 0
        raise


def core_model_match_count(conn: sqlite3.Connection, date: str) -> int:
    """Rows where the site is expected to have full tennis model depth.

    Robinhood Challenger markets can be published as market-only rows. They
    should still have prices and value-book placeholders, but they should not
    make the whole slate fail because TennisLive match pages are not joined yet.
    """
    return scalar(
        conn,
        """
        select count(*)
        from matches
        where match_date = ?
          and match_id like 'tl-%'
        """,
        (date,),
    )


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
        "warehouseContext": ROOT / "web" / "src" / "lib" / f"day-{date}-tennis-warehouse-context.generated.json",
        "draftkingsLines": REFERENCE_DIR / f"draftkings-lines-{date}.json",
        "fanduelLines": REFERENCE_DIR / f"fanduel-lines-{date}.json",
    }
    statuses = {}
    missing_required = []
    for key, path in paths.items():
        exists = path.exists() and path.stat().st_size > 0
        statuses[key] = {"path": str(path), "exists": exists, "bytes": path.stat().st_size if path.exists() else 0}
        if key in {"scoreboard", "warehouseContext"} and not exists:
            missing_required.append(key)
    ok = not missing_required
    return {"ok": ok, "files": statuses, "error": None if ok else f"missing required source files: {', '.join(missing_required)}"}


def check_tennislive_context_file(date: str) -> dict[str, Any]:
    path = ROOT / "web" / "src" / "lib" / f"day-{date}-tennis-warehouse-context.generated.json"
    if not path.exists():
        return {"ok": False, "path": str(path), "error": "missing generated TennisLive warehouse context"}
    payload = read_json(path)
    matches = payload.get("matches") or {}
    players = payload.get("playersByName") or {}
    blocked_sources = []
    text = json.dumps(payload, sort_keys=True).lower()
    for source in ("flashscore", "sofascore", "tennistonic", "tennis tonic"):
        if source in text:
            blocked_sources.append(source)
    ok = bool(matches) and bool(players) and not blocked_sources
    return {
        "ok": ok,
        "path": str(path),
        "matchContextCount": len(matches),
        "playerContextCount": len(players),
        "blockedSources": blocked_sources,
        "error": None if ok else "TennisLive warehouse context is missing or contains blocked legacy source text",
    }


def check_warehouse(conn: sqlite3.Connection, date: str) -> dict[str, Any]:
    missing_tables = [table for table in REQUIRED_TABLES if not table_exists(conn, table)]
    if missing_tables:
        return {"ok": False, "error": "missing tennis warehouse tables", "missingTables": missing_tables}

    match_count = conn.execute("select count(*) from matches where match_date = ?", (date,)).fetchone()[0]
    player_count = conn.execute(
        """
        select count(distinct players.player_id)
        from match_players players
        join matches matches on matches.match_id = players.match_id
        where matches.match_date = ?
        """,
        (date,),
    ).fetchone()[0]
    profile_players = conn.execute(
        """
        select count(distinct players.player_id)
        from match_players players
        join matches matches on matches.match_id = players.match_id
        join tennislive_player_profiles profiles on profiles.player_id = players.player_id
        where matches.match_date = ?
        """,
        (date,),
    ).fetchone()[0]
    ranked_players = conn.execute(
        """
        select count(distinct players.player_id)
        from match_players players
        join matches matches on matches.match_id = players.match_id
        join tennislive_player_profiles profiles on profiles.player_id = players.player_id
        where matches.match_date = ?
          and profiles.current_ranking is not null
        """,
        (date,),
    ).fetchone()[0]
    recent_players = conn.execute(
        """
        select count(distinct players.player_id)
        from match_players players
        join matches matches on matches.match_id = players.match_id
        join recent_matches recent on recent.player_id = players.player_id and recent.source_name = 'tennislive'
        where matches.match_date = ?
        """,
        (date,),
    ).fetchone()[0]
    stat_players = conn.execute(
        """
        select count(distinct players.player_id)
        from match_players players
        join matches matches on matches.match_id = players.match_id
        join match_stat_rows stats on stats.player_id = players.player_id and stats.source_name = 'tennislive'
        where matches.match_date = ?
        """,
        (date,),
    ).fetchone()[0]
    form_players = conn.execute(
        """
        select count(distinct players.player_id)
        from match_players players
        join matches matches on matches.match_id = players.match_id
        join player_form_snapshots form on form.player_id = players.player_id
        where matches.match_date = ?
          and json_extract(form.features_json, '$.source') = 'tennislive'
        """,
        (date,),
    ).fetchone()[0]
    missing_players = [
        dict(row)
        for row in conn.execute(
            """
            select
              players.player_id,
              identity.name,
              max(case when profiles.player_id is not null then 1 else 0 end) as has_profile,
              max(case when profiles.current_ranking is not null then 1 else 0 end) as has_rank,
              max(case when recent.player_id is not null then 1 else 0 end) as has_recent,
              max(case when stats.player_id is not null then 1 else 0 end) as has_stats,
              max(case when json_extract(form.features_json, '$.source') = 'tennislive' then 1 else 0 end) as has_form
            from match_players players
            join matches matches on matches.match_id = players.match_id
            left join players identity on identity.player_id = players.player_id
            left join tennislive_player_profiles profiles on profiles.player_id = players.player_id
            left join recent_matches recent on recent.player_id = players.player_id and recent.source_name = 'tennislive'
            left join match_stat_rows stats on stats.player_id = players.player_id and stats.source_name = 'tennislive'
            left join player_form_snapshots form on form.player_id = players.player_id
            where matches.match_date = ?
            group by players.player_id, identity.name
            having has_profile = 0 or has_rank = 0 or has_recent = 0 or has_stats = 0 or has_form = 0
            order by identity.name
            """,
            (date,),
        ).fetchall()
    ]
    ok = (
        match_count > 0
        and player_count > 0
        and profile_players >= player_count
        and ranked_players >= player_count
        and recent_players >= player_count
        and stat_players >= player_count
        and form_players >= player_count
        and not missing_players
    )
    return {
        "ok": ok,
        "matchCount": match_count,
        "playerCount": player_count,
        "profilePlayers": profile_players,
        "rankedPlayers": ranked_players,
        "recentPlayers": recent_players,
        "statPlayers": stat_players,
        "formPlayers": form_players,
        "missingPlayers": missing_players[:50],
        "missingPlayerCount": len(missing_players),
        "error": None if ok else "TennisLive warehouse coverage is incomplete for one or more slate players",
    }


def check_rankings(conn: sqlite3.Connection, date: str) -> dict[str, Any]:
    player_count = scalar(
        conn,
        """
        select count(distinct players.player_id)
        from match_players players
        join matches matches on matches.match_id = players.match_id
        where matches.match_date = ?
        """,
        (date,),
    )
    ranked_players = scalar(
        conn,
        """
        select count(distinct players.player_id)
        from match_players players
        join matches matches on matches.match_id = players.match_id
        join tennislive_player_profiles profiles on profiles.player_id = players.player_id
        where matches.match_date = ?
          and profiles.current_ranking is not null
        """,
        (date,),
    )
    missing = [
        dict(row)
        for row in conn.execute(
            """
            select identity.name, players.player_id
            from match_players players
            join matches matches on matches.match_id = players.match_id
            left join players identity on identity.player_id = players.player_id
            left join tennislive_player_profiles profiles on profiles.player_id = players.player_id
            where matches.match_date = ?
              and profiles.current_ranking is null
            group by players.player_id, identity.name
            order by identity.name
            """,
            (date,),
        ).fetchall()
    ]
    ok = player_count > 0 and ranked_players >= player_count and not missing
    return {
        "ok": ok,
        "playerCount": player_count,
        "rankedPlayers": ranked_players,
        "missingPlayers": missing[:50],
        "missingPlayerCount": len(missing),
        "source": "tennislive_player_profiles.current_ranking",
        "error": None if ok else "one or more slate players are missing TennisLive profile rankings",
    }


def check_match_contract(conn: sqlite3.Connection, date: str) -> dict[str, Any]:
    if not table_exists(conn, "matches"):
        return {"ok": False, "error": "matches table is missing"}
    missing = [
        dict(row)
        for row in conn.execute(
            """
            select match_id, match_date, tournament_id, round, surface
            from matches
            where match_date = ?
              and (
                match_date is null or trim(match_date) = ''
                or tournament_id is null or trim(tournament_id) = ''
                or round is null or trim(round) = ''
                or surface is null or trim(surface) = ''
              )
            order by match_id
            """,
            (date,),
        ).fetchall()
    ]
    bad_surface = [
        dict(row)
        for row in conn.execute(
            """
            select match_id, match_date, tournament_id, round, surface
            from matches
            where match_date = ?
              and surface not in ('Clay', 'Grass', 'Hard', 'Indoor Hard', 'Carpet', 'Acrylic', 'Unknown')
            order by match_id
            """,
            (date,),
        ).fetchall()
    ]
    surface_rows = [
        dict(row)
        for row in conn.execute(
            """
            select surface, count(*) as count
            from matches
            where match_date = ?
            group by surface
            order by surface
            """,
            (date,),
        ).fetchall()
    ]
    match_count = sum(int(row["count"] or 0) for row in surface_rows)
    ok = match_count > 0 and not missing and not bad_surface
    return {
        "ok": ok,
        "matchCount": match_count,
        "surfaceEnum": sorted(MATCH_SURFACE_ENUM),
        "surfaces": surface_rows,
        "missingCount": len(missing),
        "badSurfaceCount": len(bad_surface),
        "missing": missing[:50],
        "badSurface": bad_surface[:50],
        "error": None if ok else "matches must have date, event, event-round, and enum surface",
    }


def check_tennislive(
    conn: sqlite3.Connection,
    date: str,
    match_count: int,
    settled: bool,
    full_depth_match_count: int,
) -> dict[str, Any]:
    mapped_matches = scalar(
        conn,
        """
        select count(*)
        from tennislive_match_sources sources
        join matches matches on matches.match_id = sources.match_id
        where matches.match_date = ?
          and sources.source_name = 'tennislive'
          and sources.source_match_url is not null
        """,
        (date,),
    )
    player_profiles = scalar(
        conn,
        """
        select count(distinct players.player_id)
        from match_players players
        join matches matches on matches.match_id = players.match_id
        join tennislive_player_profiles profiles on profiles.player_id = players.player_id
        where matches.match_date = ?
        """,
        (date,),
    )
    player_links = scalar(
        conn,
        """
        select count(*)
        from tennislive_player_match_links links
        join match_players players on players.player_id = links.player_id
        join matches matches on matches.match_id = players.match_id
        where matches.match_date = ?
        """,
        (date,),
    )
    player_stat_rows = scalar(
        conn,
        """
        select count(*)
        from match_stat_rows stats
        join match_players players on players.player_id = stats.player_id
        join matches matches on matches.match_id = players.match_id
        where matches.match_date = ?
          and stats.source_name = 'tennislive'
        """,
        (date,),
    )
    form_chart_points = scalar(
        conn,
        """
        select count(*)
        from tennislive_form_chart_points points
        join match_players players on players.player_id = points.player_id
        join matches matches on matches.match_id = players.match_id
        where matches.match_date = ?
        """,
        (date,),
    )
    replay_games = scalar(conn, "select count(*) from tennislive_match_replay_games where match_id in (select match_id from matches where match_date = ?)", (date,))
    replay_points = scalar(conn, "select count(*) from tennislive_match_replay_points where match_id in (select match_id from matches where match_date = ?)", (date,))
    required_matches = full_depth_match_count or match_count
    mapping_ok = required_matches > 0 and mapped_matches >= required_matches
    pregame_player_pages_ok = required_matches > 0 and player_profiles >= required_matches * 2 and player_links >= required_matches * 2 and player_stat_rows >= required_matches * 2
    settled_ok = not settled or (player_stat_rows > 0 and replay_games > 0 and replay_points > 0)
    pregame_ok = mapping_ok or pregame_player_pages_ok
    ok = pregame_ok and settled_ok
    return {
        "ok": ok,
        "mappedMatches": mapped_matches,
        "matchCount": match_count,
        "fullDepthMatchCount": full_depth_match_count,
        "marketOnlyMatchCount": max(match_count - full_depth_match_count, 0),
        "requiredPregamePlayers": required_matches * 2,
        "playerProfiles": player_profiles,
        "playerLinks": player_links,
        "playerStatRows": player_stat_rows,
        "formChartPoints": form_chart_points,
        "replayGames": replay_games,
        "replayPoints": replay_points,
        "mode": "settled" if settled else "pregame",
        "error": None if ok else "TennisLive coverage is incomplete for this slate/mode",
    }


def check_kalshi(
    conn: sqlite3.Connection,
    date: str,
    match_count: int,
    settled: bool,
    full_depth_match_count: int,
) -> dict[str, Any]:
    match_markets = scalar(conn, "select count(*) from tennis_kalshi_match_markets where slate_date = ?", (date,))
    candles = scalar(conn, "select count(*) from tennis_kalshi_market_candles where slate_date = ?", (date,))
    trade_features = scalar(conn, "select count(*) from tennis_kalshi_intramatch_trade_features where slate_date = ?", (date,))
    prediction_market_rows = scalar(conn, "select count(*) from tennis_prediction_market_snapshots where slate_date = ?", (date,))
    required_kalshi_rows = (full_depth_match_count or match_count) * 2
    markets_ok = (full_depth_match_count or match_count) > 0
    settled_ok = not settled or (candles > 0 and trade_features > 0)
    ok = markets_ok and settled_ok
    return {
        "ok": ok,
        "matchMarkets": match_markets,
        "predictionMarketRows": prediction_market_rows,
        "fullDepthMatchCount": full_depth_match_count,
        "requiredKalshiRows": required_kalshi_rows,
        "candles": candles,
        "tradeFeatures": trade_features,
        "mode": "settled" if settled else "pregame",
        "warning": None if prediction_market_rows >= required_kalshi_rows else "Kalshi/prediction-market lane is partial for this slate; sportsbook lines remain authoritative where present",
        "error": None if ok else "Kalshi settled-lane coverage is incomplete for this slate/mode",
    }


def check_weather(
    conn: sqlite3.Connection,
    date: str,
    match_count: int,
    settled: bool,
    full_depth_match_count: int,
) -> dict[str, Any]:
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
    if match_weather_rows == 0:
        return {
            "ok": True,
            "hourlyRows": hourly_rows,
            "matchWeatherRows": match_weather_rows,
            "completeRows": 0,
            "fullDepthCompleteRows": 0,
            "fullDepthMatchCount": full_depth_match_count,
            "marketOnlyIncompleteRows": 0,
            "matchCount": match_count,
            "mode": "settled" if settled else "pregame",
            "warning": "no match weather attachment present for this slate; TennisLive/player/market coverage remains authoritative",
            "error": None,
        }
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
    full_depth_complete_rows = scalar(
        conn,
        """
        select count(*)
        from tennis_match_weather weather
        join matches matches on matches.match_id = weather.match_id
        where weather.slate_date = ?
          and matches.match_date = ?
          and matches.match_id like 'tl-%'
          and weather.hourly_rows > 0
          and weather.avg_temperature_c is not null
          and weather.start_ts is not null
          and weather.end_ts is not null
        """,
        (date, date),
    )
    required_complete_rows = full_depth_match_count or match_count
    ok = (
        hourly_rows > 0
        and match_count > 0
        and match_weather_rows >= match_count
        and full_depth_complete_rows >= required_complete_rows
    )
    return {
        "ok": ok,
        "hourlyRows": hourly_rows,
        "matchWeatherRows": match_weather_rows,
        "completeRows": complete_rows,
        "fullDepthCompleteRows": full_depth_complete_rows,
        "fullDepthMatchCount": full_depth_match_count,
        "marketOnlyIncompleteRows": max(match_count - complete_rows, 0),
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
        players = context.get("players") or []
        if not players:
            players = (game.get("tennisContext") or {}).get("players") or []
        for player in players:
            warehouse_stats = player.get("warehouseStats") or player
            profile = warehouse_stats.get("profile") or {}
            ranking = warehouse_stats.get("ranking") or {}
            rank = profile.get("rank") or profile.get("currentRanking") or ranking.get("rank") or player.get("rank")
            form = player.get("recentFormMetrics") or {}
            if not form:
                form = warehouse_stats.get("recentFormMetrics") or {}
            matches = (form.get("matches") or [])[:5]
            expected_stats = warehouse_stats.get("expectedStats") or {}
            expected_values = expected_stats.get("stats") or {}
            form_chart = warehouse_stats.get("formChart") or {}
            chart_points = form_chart.get("points") or []
            service_rows = [
                row
                for recent in matches
                for row in (((recent.get("serviceStats") or {}).get("rows")) or [])
            ]
            player_missing = []
            if not profile:
                player_missing.append("profile")
            if rank is None:
                player_missing.append("rank")
            if not matches:
                player_missing.append("recent matches")
            if not expected_values and not service_rows:
                player_missing.append("recent stat rows")
            if not chart_points:
                player_missing.append("form chart")
            if player_missing:
                missing.append({"game": path.name, "player": player.get("name"), "missing": player_missing})
            checked_players += 1
    ok = bool(files) and checked_players > 0 and not missing
    return {
        "ok": ok,
        "gameFiles": len(files),
        "checkedPlayers": checked_players,
        "missingCells": missing[:50],
        "missingCellCount": len(missing),
        "error": None if ok else "published tennis detail payload has missing TennisLive warehouse identity/stat/chart fields",
    }


def game_value_book_missing(game: dict[str, Any]) -> list[str]:
    context = game.get("tennisContext") or {}
    matrix = context.get("bettingMatrix") or []
    labels = {str(row.get("label") or row.get("marketType") or "").lower() for row in matrix}
    derivative_markets = context.get("derivativeMarkets") or []
    derivative_labels = {
        str(row.get("label") or row.get("marketType") or "").lower()
        for row in derivative_markets
    }
    value_board = context.get("valueBoard") or {}
    missing: list[str] = []
    if not any("ml" in label or "moneyline" in label for label in labels) and not value_board.get("ml"):
        missing.append("ML value book")
    if not any("o/u" in label or "total games" in label for label in labels) and not value_board.get("total"):
        missing.append("match O/U games value book")
    if not any("1st set" in label or "first-set" in label or "first set" in label for label in labels) and not value_board.get("firstSetTotal"):
        missing.append("1st-set O/U games value book")
    if not any(("o/u" in label or "total" in label) and "first" not in label and "1st" not in label for label in derivative_labels):
        missing.append("match O/U derivative row")
    if not any("1st set" in label or "first-set" in label or "first set" in label for label in derivative_labels):
        missing.append("1st-set O/U derivative row")
    return missing


def check_value_books(date: str, settled: bool) -> dict[str, Any]:
    games_dir = PUBLISHED_SLATES_DIR / date / "games"
    if not games_dir.exists():
        return {"ok": False, "path": str(games_dir), "error": "missing published slate games directory"}
    missing_games = []
    checked_games = 0
    for path in sorted(games_dir.glob("*.json")):
        game = read_json(path)
        if game.get("league") != "Tennis":
            continue
        checked_games += 1
        missing = game_value_book_missing(game)
        if missing:
            missing_games.append({"game": path.name, "missing": missing})

    kalshi_rows = []
    if KALSHI_SPIKE_MODEL_PATH.exists():
        payload = read_json(KALSHI_SPIKE_MODEL_PATH)
        kalshi_rows = [
            row for row in payload.get("currentCandidates") or []
            if str(row.get("occurrenceDatetime") or "").startswith(date)
        ]
    trade_rows = [row for row in kalshi_rows if row.get("spikeModelTier") == "trade"]
    watch_rows = [row for row in kalshi_rows if row.get("spikeModelTier") == "watch"]
    pass_rows = [row for row in kalshi_rows if row.get("spikeModelTier") == "pass"]
    kalshi_ok = True
    summary_missing = []
    summary_path = PUBLISHED_SLATES_DIR / date / "summary.json"
    if summary_path.exists():
        summary = read_json(summary_path).get("tennisValueSummary") or {}
        if not summary.get("modelPickRows"):
            summary_missing.append("summary model-pick ML rows")
        if not summary.get("mlRows"):
            summary_missing.append("summary ML value rows")
        if not summary.get("matchTotalRows"):
            summary_missing.append("summary match O/U rows")
        if not summary.get("firstSetRows"):
            summary_missing.append("summary 1st-set O/U rows")
    else:
        summary_missing.append("published slate summary")
    ok = checked_games > 0 and not missing_games and kalshi_ok
    return {
        "ok": ok,
        "mode": "settled" if settled else "pregame",
        "checkedGames": checked_games,
        "missingGames": missing_games[:50],
        "missingGameCount": len(missing_games),
        "summaryMissing": summary_missing,
        "kalshiRows": len(kalshi_rows),
        "kalshiTradeRows": len(trade_rows),
        "kalshiWatchRows": len(watch_rows),
        "kalshiPassRows": len(pass_rows),
        "topKalshiRows": [
            {
                "selection": row.get("selection"),
                "match": row.get("boardTitle"),
                "tier": row.get("spikeModelTier"),
                "entry": row.get("yesAsk"),
                "target": row.get("spikeModelTarget25x") or row.get("projectedExit"),
                "confidence": row.get("spikeModelProbability25x") or row.get("targetHitProbability"),
            }
            for row in sorted(
                kalshi_rows,
                key=lambda item: (
                    item.get("spikeModelTier") == "trade",
                    item.get("spikeModelTier") == "watch",
                    float(item.get("spikeModelEvPctOfEntry25x") or item.get("tradeEvPctOfEntry") or -9),
                ),
                reverse=True,
            )[:5]
        ],
        "warning": None if not summary_missing and kalshi_rows else "summary/Kalshi aggregate lanes are partial; per-game value books were checked directly",
        "error": None if ok else "published tennis per-game value books are incomplete",
    }


def run_health(date: str, db_path: Path = DEFAULT_DB, settled: bool | None = None) -> dict[str, Any]:
    is_settled = resolve_settled(date, settled)
    checks: dict[str, Any] = {"date": date, "mode": "settled" if is_settled else "pregame"}
    checks["sourceFiles"] = check_source_files(date)
    checks["tennisliveContext"] = check_tennislive_context_file(date)
    with connect(db_path) as conn:
        checks["warehouse"] = check_warehouse(conn, date)
        match_count = int(checks["warehouse"].get("matchCount") or 0)
        full_depth_match_count = core_model_match_count(conn, date)
        checks["matchContract"] = check_match_contract(conn, date)
        checks["rankings"] = check_rankings(conn, date)
        checks["tennislive"] = check_tennislive(conn, date, match_count, is_settled, full_depth_match_count)
        checks["kalshi"] = check_kalshi(conn, date, match_count, is_settled, full_depth_match_count)
        checks["weather"] = check_weather(conn, date, match_count, is_settled, full_depth_match_count)
        checks["resultsTraining"] = check_results_and_training(conn, date, match_count, is_settled)
    checks["published"] = check_published(date)
    checks["valueBooks"] = check_value_books(date, is_settled)
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
        for name in ("sourceFiles", "matchContract", "rankings", "tennisliveContext", "warehouse", "tennislive", "kalshi", "weather", "resultsTraining", "published", "valueBooks"):
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
