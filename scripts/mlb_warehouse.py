#!/usr/bin/env python3

from __future__ import annotations

import argparse
import csv
import gzip
import hashlib
import io
import json
import sqlite3
from datetime import datetime, timedelta
from pathlib import Path
from statistics import fmean, pstdev
from typing import Any
from urllib.request import Request, urlopen


ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "data"
RAW_DIR = DATA_DIR / "raw"
WAREHOUSE_DIR = DATA_DIR / "warehouse"
PREDICTIONS_DIR = DATA_DIR / "predictions" / "mlb-home-runs"
DB_PATH = WAREHOUSE_DIR / "sports.db"
USER_AGENT = "SportsTradingBoardBot/1.0 (+https://baseballsavant.mlb.com)"

MLB_SCHEDULE_URL = "https://statsapi.mlb.com/api/v1/schedule?sportId=1&date={date}&hydrate=probablePitcher,team"
MLB_FEED_URL = "https://statsapi.mlb.com/api/v1.1/game/{game_pk}/feed/live"
STATCAST_HOME_RUNS_CSV_URL = (
    "https://baseballsavant.mlb.com/leaderboard/home-runs"
    "?year={season}&player_type=Batter&cat=xhr&team=&min=0&csv=true"
)


SCHEMA = """
CREATE TABLE IF NOT EXISTS source_snapshots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source_key TEXT NOT NULL,
  url TEXT NOT NULL,
  fetched_at TEXT NOT NULL,
  content_path TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  meta_json TEXT
);

CREATE TABLE IF NOT EXISTS mlb_games (
  game_pk INTEGER PRIMARY KEY,
  game_date TEXT NOT NULL,
  game_datetime TEXT,
  status TEXT,
  away_team TEXT NOT NULL,
  home_team TEXT NOT NULL,
  venue_name TEXT,
  away_score INTEGER,
  home_score INTEGER,
  raw_path TEXT
);

CREATE TABLE IF NOT EXISTS mlb_starting_pitchers (
  game_pk INTEGER NOT NULL,
  team_role TEXT NOT NULL,
  pitcher_id INTEGER,
  pitcher_name TEXT,
  pitch_hand TEXT,
  wins INTEGER,
  losses INTEGER,
  era REAL,
  strikeouts INTEGER,
  innings_pitched REAL,
  home_runs_allowed INTEGER,
  whip REAL,
  raw_json TEXT,
  PRIMARY KEY (game_pk, team_role)
);

CREATE TABLE IF NOT EXISTS mlb_starting_pitcher_game_logs (
  game_pk INTEGER NOT NULL,
  game_date TEXT NOT NULL,
  team_role TEXT NOT NULL,
  team_name TEXT NOT NULL,
  opponent_name TEXT NOT NULL,
  pitcher_id INTEGER,
  pitcher_name TEXT,
  pitch_hand TEXT,
  innings_pitched REAL,
  outs_recorded INTEGER,
  runs_allowed INTEGER,
  earned_runs INTEGER,
  hits_allowed INTEGER,
  home_runs_allowed INTEGER,
  walks_allowed INTEGER,
  strikeouts INTEGER,
  pitches_thrown INTEGER,
  strikes_thrown INTEGER,
  batters_faced INTEGER,
  raw_json TEXT,
  PRIMARY KEY (game_pk, team_role)
);

CREATE TABLE IF NOT EXISTS mlb_game_team_stats (
  game_pk INTEGER NOT NULL,
  game_date TEXT NOT NULL,
  team_role TEXT NOT NULL,
  team_name TEXT NOT NULL,
  opponent_name TEXT NOT NULL,
  at_bats INTEGER,
  plate_appearances INTEGER,
  total_bases INTEGER,
  runs_scored INTEGER,
  hits INTEGER,
  home_runs INTEGER,
  walks INTEGER,
  strikeouts INTEGER,
  left_on_base INTEGER,
  runs_allowed INTEGER,
  hits_allowed INTEGER,
  home_runs_allowed INTEGER,
  walks_allowed INTEGER,
  strikeouts_recorded INTEGER,
  runs_scored_first5 INTEGER,
  hits_first5 INTEGER,
  home_runs_first5 INTEGER,
  runs_allowed_first5 INTEGER,
  hits_allowed_first5 INTEGER,
  home_runs_allowed_first5 INTEGER,
  bullpen_runs_scored INTEGER,
  bullpen_runs_allowed INTEGER,
  full_game_result TEXT,
  first5_result TEXT,
  raw_json TEXT,
  PRIMARY KEY (game_pk, team_role)
);

CREATE TABLE IF NOT EXISTS mlb_game_outcomes (
  game_pk INTEGER PRIMARY KEY,
  game_date TEXT NOT NULL,
  away_team TEXT NOT NULL,
  home_team TEXT NOT NULL,
  away_runs_final INTEGER,
  home_runs_final INTEGER,
  away_hits_final INTEGER,
  home_hits_final INTEGER,
  away_home_runs_final INTEGER,
  home_home_runs_final INTEGER,
  away_runs_first5 INTEGER,
  home_runs_first5 INTEGER,
  away_hits_first5 INTEGER,
  home_hits_first5 INTEGER,
  away_home_runs_first5 INTEGER,
  home_home_runs_first5 INTEGER,
  home_full_game_result TEXT,
  home_first5_result TEXT,
  home_full_game_run_diff INTEGER,
  home_first5_run_diff INTEGER,
  home_bullpen_run_diff INTEGER,
  total_runs_final INTEGER,
  total_runs_first5 INTEGER,
  raw_json TEXT
);

CREATE TABLE IF NOT EXISTS statcast_hr_leaderboard_snapshots (
  snapshot_date TEXT NOT NULL,
  season INTEGER NOT NULL,
  player_id INTEGER NOT NULL,
  player_name TEXT NOT NULL,
  team_abbrev TEXT NOT NULL,
  hr_total REAL,
  xhr REAL,
  xhr_diff REAL,
  no_doubters REAL,
  mostly_gone REAL,
  doubters REAL,
  no_doubter_per REAL,
  avg_hr_trot REAL,
  source_url TEXT,
  PRIMARY KEY (snapshot_date, season, player_id)
);

CREATE TABLE IF NOT EXISTS mlb_home_run_events (
  event_key TEXT PRIMARY KEY,
  game_pk INTEGER NOT NULL,
  game_date TEXT NOT NULL,
  game_datetime TEXT,
  inning INTEGER,
  half_inning TEXT,
  batter_id INTEGER,
  batter_name TEXT,
  pitcher_id INTEGER,
  pitcher_name TEXT,
  batting_team TEXT,
  fielding_team TEXT,
  description TEXT,
  rbi INTEGER,
  away_score INTEGER,
  home_score INTEGER,
  statcast_play_id TEXT,
  raw_json TEXT
);

CREATE TABLE IF NOT EXISTS mlb_home_run_predictions (
  prediction_date TEXT NOT NULL,
  model_name TEXT NOT NULL,
  rank INTEGER NOT NULL,
  player_id INTEGER NOT NULL,
  player_name TEXT NOT NULL,
  team_abbrev TEXT NOT NULL,
  game_title TEXT,
  opposing_pitcher TEXT,
  score REAL,
  metadata_json TEXT,
  PRIMARY KEY (prediction_date, model_name, player_id)
);

CREATE TABLE IF NOT EXISTS mlb_home_run_backtests (
  prediction_date TEXT NOT NULL,
  model_name TEXT NOT NULL,
  player_id INTEGER NOT NULL,
  player_name TEXT NOT NULL,
  team_abbrev TEXT NOT NULL,
  actual_home_runs INTEGER NOT NULL,
  hit_flag INTEGER NOT NULL,
  matched_event_keys TEXT,
  PRIMARY KEY (prediction_date, model_name, player_id)
);

CREATE TABLE IF NOT EXISTS mlb_team_rolling_form (
  as_of_date TEXT NOT NULL,
  team_name TEXT NOT NULL,
  window_games INTEGER NOT NULL,
  games_sample INTEGER NOT NULL,
  wins INTEGER NOT NULL,
  losses INTEGER NOT NULL,
  runs_scored_per_game REAL,
  hits_per_game REAL,
  home_runs_per_game REAL,
  hit_efficiency REAL,
  runs_allowed_per_game REAL,
  hits_allowed_per_game REAL,
  home_runs_allowed_per_game REAL,
  first5_runs_scored_per_game REAL,
  first5_runs_allowed_per_game REAL,
  bullpen_runs_scored_per_game REAL,
  bullpen_runs_allowed_per_game REAL,
  run_diff_per_game REAL,
  first5_run_diff_per_game REAL,
  scoring_volatility REAL,
  home_run_burstiness REAL,
  recent_3_runs_delta REAL,
  recent_3_home_runs_delta REAL,
  PRIMARY KEY (as_of_date, team_name, window_games)
);

CREATE TABLE IF NOT EXISTS mlb_starting_pitcher_rolling_form (
  as_of_date TEXT NOT NULL,
  pitcher_id INTEGER NOT NULL,
  pitcher_name TEXT NOT NULL,
  window_starts INTEGER NOT NULL,
  starts_sample INTEGER NOT NULL,
  innings_per_start REAL,
  outs_recorded_per_start REAL,
  runs_allowed_per_start REAL,
  earned_runs_per_start REAL,
  hits_allowed_per_start REAL,
  home_runs_allowed_per_start REAL,
  walks_allowed_per_start REAL,
  strikeouts_per_start REAL,
  pitches_per_start REAL,
  batters_faced_per_start REAL,
  whip_like REAL,
  strikeout_to_walk_ratio REAL,
  short_start_rate REAL,
  quality_start_rate REAL,
  run_volatility REAL,
  home_run_burstiness REAL,
  recent_3_earned_runs_delta REAL,
  PRIMARY KEY (as_of_date, pitcher_id, window_starts)
);

CREATE TABLE IF NOT EXISTS park_factor_snapshots (
  snapshot_date TEXT NOT NULL,
  team_name TEXT NOT NULL,
  venue_name TEXT,
  hr_index REAL,
  runs_index REAL,
  woba_index REAL,
  source_url TEXT,
  PRIMARY KEY (snapshot_date, team_name)
);

CREATE TABLE IF NOT EXISTS weather_observations (
  game_pk INTEGER NOT NULL,
  observed_at TEXT NOT NULL,
  source_url TEXT,
  temperature_f REAL,
  wind_speed_mph REAL,
  wind_direction TEXT,
  roof_status TEXT,
  raw_json TEXT,
  PRIMARY KEY (game_pk, observed_at)
);
"""


def ensure_dirs() -> None:
    RAW_DIR.mkdir(parents=True, exist_ok=True)
    WAREHOUSE_DIR.mkdir(parents=True, exist_ok=True)
    PREDICTIONS_DIR.mkdir(parents=True, exist_ok=True)


def get_connection() -> sqlite3.Connection:
    ensure_dirs()
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db(conn: sqlite3.Connection) -> None:
    conn.executescript(SCHEMA)
    conn.commit()


def fetch_text(url: str) -> str:
    request = Request(url, headers={"User-Agent": USER_AGENT, "X-Requested-With": "XMLHttpRequest"})
    with urlopen(request, timeout=30) as response:
        return response.read().decode("utf-8", "ignore")


def write_text(path: Path, text: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding="utf-8")


def write_gzip_text(path: Path, text: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with gzip.open(path, "wt", encoding="utf-8") as handle:
        handle.write(text)


def write_json(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2, sort_keys=True), encoding="utf-8")


def file_hash(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def record_snapshot(
    conn: sqlite3.Connection,
    *,
    source_key: str,
    url: str,
    content_path: Path,
    content_text: str,
    meta: dict[str, Any] | None = None,
) -> None:
    conn.execute(
        """
        INSERT INTO source_snapshots (source_key, url, fetched_at, content_path, content_hash, meta_json)
        VALUES (?, ?, ?, ?, ?, ?)
        """,
        (
            source_key,
            url,
            datetime.utcnow().isoformat(timespec="seconds") + "Z",
            str(content_path.relative_to(ROOT)),
            file_hash(content_text),
            json.dumps(meta or {}, sort_keys=True),
        ),
    )


def to_int(value: Any) -> int | None:
    if value in (None, "", "-", "null"):
        return None
    try:
        return int(float(value))
    except (TypeError, ValueError):
        return None


def to_float(value: Any) -> float | None:
    if value in (None, "", "-", "null"):
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def innings_to_float(value: Any) -> float | None:
    if value in (None, ""):
        return None
    text = str(value)
    if "." not in text:
        return to_float(text)
    whole, partial = text.split(".", 1)
    if partial == "0":
        return float(whole)
    if partial == "1":
        return float(whole) + 1 / 3
    if partial == "2":
        return float(whole) + 2 / 3
    return to_float(text)


def safe_mean(values: list[float | int]) -> float:
    return fmean(values) if values else 0.0


def safe_pstdev(values: list[float | int]) -> float:
    return pstdev(values) if len(values) > 1 else 0.0


def split_recent(values: list[float | int], recent_window: int = 3) -> tuple[list[float | int], list[float | int]]:
    return values[:recent_window], values


def result_label(team_value: int, opponent_value: int) -> str:
    if team_value > opponent_value:
        return "win"
    if team_value < opponent_value:
        return "loss"
    return "tie"


def find_live_starter(feed_game: dict[str, Any], role: str) -> dict[str, Any]:
    live_players = (((feed_game.get("liveData") or {}).get("boxscore") or {}).get("teams") or {}).get(role, {}).get("players", {})
    for player in live_players.values():
        pitching = ((player.get("stats") or {}).get("pitching") or {})
        if pitching.get("gamesStarted") == 1:
            return player
    return {}


def starter_from_schedule_or_feed(schedule_game: dict[str, Any], feed_game: dict[str, Any], role: str) -> dict[str, Any]:
    schedule_entry = ((schedule_game.get("teams") or {}).get(role) or {}).get("probablePitcher") or {}
    live_starter = find_live_starter(feed_game, role)
    pitching = ((live_starter.get("stats") or {}).get("pitching") or {})
    person_id = schedule_entry.get("id") or ((live_starter.get("person") or {}).get("id"))
    full_name = schedule_entry.get("fullName") or ((live_starter.get("person") or {}).get("fullName"))
    pitch_hand = ((schedule_entry.get("pitchHand") or {}).get("code")) if schedule_entry else None
    return {
        "pitcher_id": person_id,
        "pitcher_name": full_name,
        "pitch_hand": pitch_hand,
        "wins": to_int(pitching.get("wins")),
        "losses": to_int(pitching.get("losses")),
        "era": to_float(pitching.get("era")),
        "strikeouts": to_int(pitching.get("strikeOuts")),
        "innings_pitched": innings_to_float(pitching.get("inningsPitched")),
        "home_runs_allowed": to_int(pitching.get("homeRuns")),
        "whip": to_float(pitching.get("whip")),
        "raw_json": json.dumps({"schedule": schedule_entry, "feed": live_starter}, sort_keys=True),
    }


def starter_game_log_from_feed(
    schedule_game: dict[str, Any],
    feed_game: dict[str, Any],
    role: str,
    team_name: str,
    opponent_name: str,
    date_text: str,
) -> dict[str, Any]:
    schedule_entry = ((schedule_game.get("teams") or {}).get(role) or {}).get("probablePitcher") or {}
    live_starter = find_live_starter(feed_game, role)
    pitching = ((live_starter.get("stats") or {}).get("pitching") or {})
    return {
        "game_pk": schedule_game["gamePk"],
        "game_date": date_text,
        "team_role": role,
        "team_name": team_name,
        "opponent_name": opponent_name,
        "pitcher_id": (live_starter.get("person") or {}).get("id") or schedule_entry.get("id"),
        "pitcher_name": (live_starter.get("person") or {}).get("fullName") or schedule_entry.get("fullName"),
        "pitch_hand": ((schedule_entry.get("pitchHand") or {}).get("code")) if schedule_entry else None,
        "innings_pitched": innings_to_float(pitching.get("inningsPitched")),
        "outs_recorded": to_int(pitching.get("outs")),
        "runs_allowed": to_int(pitching.get("runs")),
        "earned_runs": to_int(pitching.get("earnedRuns")),
        "hits_allowed": to_int(pitching.get("hits")),
        "home_runs_allowed": to_int(pitching.get("homeRuns")),
        "walks_allowed": to_int(pitching.get("baseOnBalls")),
        "strikeouts": to_int(pitching.get("strikeOuts")),
        "pitches_thrown": to_int(pitching.get("pitchesThrown") or pitching.get("numberOfPitches")),
        "strikes_thrown": to_int(pitching.get("strikes")),
        "batters_faced": to_int(pitching.get("battersFaced")),
        "raw_json": json.dumps({"schedule": schedule_entry, "feed": live_starter}, sort_keys=True),
    }


def linescore_totals(linescore: dict[str, Any], role: str, max_inning: int | None = None) -> dict[str, int]:
    innings = (linescore.get("innings") or [])
    runs = 0
    hits = 0
    errors = 0
    for inning in innings:
        inning_num = inning.get("num")
        if max_inning is not None and inning_num is not None and inning_num > max_inning:
            continue
        team_side = inning.get(role) or {}
        runs += to_int(team_side.get("runs")) or 0
        hits += to_int(team_side.get("hits")) or 0
        errors += to_int(team_side.get("errors")) or 0
    return {"runs": runs, "hits": hits, "errors": errors}


def extract_home_run_rows(
    feed_game: dict[str, Any],
    away_team: str,
    home_team: str,
    date_text: str,
    game_datetime: str | None,
    game_pk: int,
) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for play in ((feed_game.get("liveData") or {}).get("plays") or {}).get("allPlays", []):
        if ((play.get("result") or {}).get("event")) != "Home Run":
            continue
        about = play.get("about") or {}
        is_top = about.get("isTopInning")
        rows.append(
            {
                "event_key": f"{game_pk}:{about.get('atBatIndex')}:{about.get('halfInning')}:{about.get('inning')}",
                "game_pk": game_pk,
                "game_date": date_text,
                "game_datetime": game_datetime,
                "inning": to_int(about.get("inning")),
                "half_inning": about.get("halfInning"),
                "batter_id": to_int(((play.get("matchup") or {}).get("batter") or {}).get("id")),
                "batter_name": ((play.get("matchup") or {}).get("batter") or {}).get("fullName"),
                "pitcher_id": to_int(((play.get("matchup") or {}).get("pitcher") or {}).get("id")),
                "pitcher_name": ((play.get("matchup") or {}).get("pitcher") or {}).get("fullName"),
                "batting_team": away_team if is_top else home_team,
                "fielding_team": home_team if is_top else away_team,
                "description": (play.get("result") or {}).get("description"),
                "rbi": to_int((play.get("result") or {}).get("rbi")),
                "away_score": to_int((play.get("result") or {}).get("awayScore")),
                "home_score": to_int((play.get("result") or {}).get("homeScore")),
                "statcast_play_id": None,
                "raw_json": json.dumps(play, sort_keys=True),
            }
        )
    return rows


def build_team_game_stats_rows(
    game: dict[str, Any],
    feed_game: dict[str, Any],
    date_text: str,
    home_run_rows: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    away_team = game["teams"]["away"]["team"]["name"]
    home_team = game["teams"]["home"]["team"]["name"]
    linescore = (feed_game.get("liveData") or {}).get("linescore") or {}
    boxscore_teams = (((feed_game.get("liveData") or {}).get("boxscore") or {}).get("teams") or {})
    rows: list[dict[str, Any]] = []

    for role, team_name, opponent_name in (
        ("away", away_team, home_team),
        ("home", home_team, away_team),
    ):
        opponent_role = "home" if role == "away" else "away"
        batting = (((boxscore_teams.get(role) or {}).get("teamStats") or {}).get("batting") or {})
        opponent_batting = (((boxscore_teams.get(opponent_role) or {}).get("teamStats") or {}).get("batting") or {})
        first5_offense = linescore_totals(linescore, role, max_inning=5)
        first5_defense = linescore_totals(linescore, opponent_role, max_inning=5)
        home_runs_first5 = sum(1 for row in home_run_rows if row["batting_team"] == team_name and (row["inning"] or 0) <= 5)
        home_runs_allowed_first5 = sum(
            1 for row in home_run_rows if row["fielding_team"] == team_name and (row["inning"] or 0) <= 5
        )
        runs_scored = to_int(batting.get("runs")) or 0
        runs_allowed = to_int(opponent_batting.get("runs")) or 0
        row = {
            "game_pk": game["gamePk"],
            "game_date": date_text,
            "team_role": role,
            "team_name": team_name,
            "opponent_name": opponent_name,
            "at_bats": to_int(batting.get("atBats")),
            "plate_appearances": to_int(batting.get("plateAppearances")),
            "total_bases": to_int(batting.get("totalBases")),
            "runs_scored": runs_scored,
            "hits": to_int(batting.get("hits")) or 0,
            "home_runs": to_int(batting.get("homeRuns")) or 0,
            "walks": to_int(batting.get("baseOnBalls")) or 0,
            "strikeouts": to_int(batting.get("strikeOuts")) or 0,
            "left_on_base": to_int(batting.get("leftOnBase")) or 0,
            "runs_allowed": runs_allowed,
            "hits_allowed": to_int(opponent_batting.get("hits")) or 0,
            "home_runs_allowed": to_int(opponent_batting.get("homeRuns")) or 0,
            "walks_allowed": to_int(opponent_batting.get("baseOnBalls")) or 0,
            "strikeouts_recorded": to_int(opponent_batting.get("strikeOuts")) or 0,
            "runs_scored_first5": first5_offense["runs"],
            "hits_first5": first5_offense["hits"],
            "home_runs_first5": home_runs_first5,
            "runs_allowed_first5": first5_defense["runs"],
            "hits_allowed_first5": first5_defense["hits"],
            "home_runs_allowed_first5": home_runs_allowed_first5,
            "bullpen_runs_scored": runs_scored - first5_offense["runs"],
            "bullpen_runs_allowed": runs_allowed - first5_defense["runs"],
            "full_game_result": result_label(runs_scored, runs_allowed),
            "first5_result": result_label(first5_offense["runs"], first5_defense["runs"]),
            "raw_json": json.dumps(
                {
                    "batting": batting,
                    "opponent_batting": opponent_batting,
                    "first5_offense": first5_offense,
                    "first5_defense": first5_defense,
                },
                sort_keys=True,
            ),
        }
        rows.append(row)

    return rows


def build_outcome_row(date_text: str, away_row: dict[str, Any], home_row: dict[str, Any]) -> dict[str, Any]:
    return {
        "game_pk": away_row["game_pk"],
        "game_date": date_text,
        "away_team": away_row["team_name"],
        "home_team": home_row["team_name"],
        "away_runs_final": away_row["runs_scored"],
        "home_runs_final": home_row["runs_scored"],
        "away_hits_final": away_row["hits"],
        "home_hits_final": home_row["hits"],
        "away_home_runs_final": away_row["home_runs"],
        "home_home_runs_final": home_row["home_runs"],
        "away_runs_first5": away_row["runs_scored_first5"],
        "home_runs_first5": home_row["runs_scored_first5"],
        "away_hits_first5": away_row["hits_first5"],
        "home_hits_first5": home_row["hits_first5"],
        "away_home_runs_first5": away_row["home_runs_first5"],
        "home_home_runs_first5": home_row["home_runs_first5"],
        "home_full_game_result": result_label(home_row["runs_scored"], away_row["runs_scored"]),
        "home_first5_result": result_label(home_row["runs_scored_first5"], away_row["runs_scored_first5"]),
        "home_full_game_run_diff": home_row["runs_scored"] - away_row["runs_scored"],
        "home_first5_run_diff": home_row["runs_scored_first5"] - away_row["runs_scored_first5"],
        "home_bullpen_run_diff": home_row["bullpen_runs_scored"] - away_row["bullpen_runs_scored"],
        "total_runs_final": home_row["runs_scored"] + away_row["runs_scored"],
        "total_runs_first5": home_row["runs_scored_first5"] + away_row["runs_scored_first5"],
        "raw_json": json.dumps({"away": away_row, "home": home_row}, sort_keys=True),
    }


def build_slim_game_summary(
    game: dict[str, Any],
    feed_game: dict[str, Any],
    starters: dict[str, dict[str, Any]],
    team_rows: list[dict[str, Any]],
    outcome_row: dict[str, Any],
    home_run_rows: list[dict[str, Any]],
) -> dict[str, Any]:
    away_row = next(row for row in team_rows if row["team_role"] == "away")
    home_row = next(row for row in team_rows if row["team_role"] == "home")
    scoring_indexes = (((feed_game.get("liveData") or {}).get("plays") or {}).get("scoringPlays") or [])
    all_plays = (((feed_game.get("liveData") or {}).get("plays") or {}).get("allPlays") or [])
    scoring_summaries = []
    for index in scoring_indexes:
        if index >= len(all_plays):
            continue
        play = all_plays[index]
        about = play.get("about") or {}
        result = play.get("result") or {}
        scoring_summaries.append(
            {
                "inning": about.get("inning"),
                "halfInning": about.get("halfInning"),
                "event": result.get("event"),
                "description": result.get("description"),
                "awayScore": result.get("awayScore"),
                "homeScore": result.get("homeScore"),
            }
        )
    return {
        "gamePk": game["gamePk"],
        "gameDate": game.get("gameDate"),
        "status": (game.get("status") or {}).get("detailedState"),
        "matchup": {
            "away": away_row["team_name"],
            "home": home_row["team_name"],
            "venue": (game.get("venue") or {}).get("name"),
        },
        "starters": starters,
        "outcome": outcome_row,
        "teamStats": {
            "away": away_row,
            "home": home_row,
        },
        "homeRuns": [
            {
                "inning": row["inning"],
                "halfInning": row["half_inning"],
                "batterName": row["batter_name"],
                "pitcherName": row["pitcher_name"],
                "battingTeam": row["batting_team"],
                "description": row["description"],
            }
            for row in home_run_rows
        ],
        "scoringPlays": scoring_summaries,
    }


def upsert_starting_pitcher_game_log(conn: sqlite3.Connection, row: dict[str, Any]) -> None:
    conn.execute(
        """
        INSERT INTO mlb_starting_pitcher_game_logs (
          game_pk, game_date, team_role, team_name, opponent_name, pitcher_id, pitcher_name, pitch_hand,
          innings_pitched, outs_recorded, runs_allowed, earned_runs, hits_allowed, home_runs_allowed,
          walks_allowed, strikeouts, pitches_thrown, strikes_thrown, batters_faced, raw_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(game_pk, team_role) DO UPDATE SET
          game_date=excluded.game_date,
          team_name=excluded.team_name,
          opponent_name=excluded.opponent_name,
          pitcher_id=excluded.pitcher_id,
          pitcher_name=excluded.pitcher_name,
          pitch_hand=excluded.pitch_hand,
          innings_pitched=excluded.innings_pitched,
          outs_recorded=excluded.outs_recorded,
          runs_allowed=excluded.runs_allowed,
          earned_runs=excluded.earned_runs,
          hits_allowed=excluded.hits_allowed,
          home_runs_allowed=excluded.home_runs_allowed,
          walks_allowed=excluded.walks_allowed,
          strikeouts=excluded.strikeouts,
          pitches_thrown=excluded.pitches_thrown,
          strikes_thrown=excluded.strikes_thrown,
          batters_faced=excluded.batters_faced,
          raw_json=excluded.raw_json
        """,
        (
            row["game_pk"],
            row["game_date"],
            row["team_role"],
            row["team_name"],
            row["opponent_name"],
            row["pitcher_id"],
            row["pitcher_name"],
            row["pitch_hand"],
            row["innings_pitched"],
            row["outs_recorded"],
            row["runs_allowed"],
            row["earned_runs"],
            row["hits_allowed"],
            row["home_runs_allowed"],
            row["walks_allowed"],
            row["strikeouts"],
            row["pitches_thrown"],
            row["strikes_thrown"],
            row["batters_faced"],
            row["raw_json"],
        ),
    )


def upsert_team_game_stats(conn: sqlite3.Connection, row: dict[str, Any]) -> None:
    conn.execute(
        """
        INSERT INTO mlb_game_team_stats (
          game_pk, game_date, team_role, team_name, opponent_name, at_bats, plate_appearances,
          total_bases, runs_scored, hits, home_runs, walks, strikeouts, left_on_base,
          runs_allowed, hits_allowed, home_runs_allowed, walks_allowed, strikeouts_recorded,
          runs_scored_first5, hits_first5, home_runs_first5, runs_allowed_first5, hits_allowed_first5,
          home_runs_allowed_first5, bullpen_runs_scored, bullpen_runs_allowed, full_game_result,
          first5_result, raw_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(game_pk, team_role) DO UPDATE SET
          game_date=excluded.game_date,
          team_name=excluded.team_name,
          opponent_name=excluded.opponent_name,
          at_bats=excluded.at_bats,
          plate_appearances=excluded.plate_appearances,
          total_bases=excluded.total_bases,
          runs_scored=excluded.runs_scored,
          hits=excluded.hits,
          home_runs=excluded.home_runs,
          walks=excluded.walks,
          strikeouts=excluded.strikeouts,
          left_on_base=excluded.left_on_base,
          runs_allowed=excluded.runs_allowed,
          hits_allowed=excluded.hits_allowed,
          home_runs_allowed=excluded.home_runs_allowed,
          walks_allowed=excluded.walks_allowed,
          strikeouts_recorded=excluded.strikeouts_recorded,
          runs_scored_first5=excluded.runs_scored_first5,
          hits_first5=excluded.hits_first5,
          home_runs_first5=excluded.home_runs_first5,
          runs_allowed_first5=excluded.runs_allowed_first5,
          hits_allowed_first5=excluded.hits_allowed_first5,
          home_runs_allowed_first5=excluded.home_runs_allowed_first5,
          bullpen_runs_scored=excluded.bullpen_runs_scored,
          bullpen_runs_allowed=excluded.bullpen_runs_allowed,
          full_game_result=excluded.full_game_result,
          first5_result=excluded.first5_result,
          raw_json=excluded.raw_json
        """,
        (
            row["game_pk"],
            row["game_date"],
            row["team_role"],
            row["team_name"],
            row["opponent_name"],
            row["at_bats"],
            row["plate_appearances"],
            row["total_bases"],
            row["runs_scored"],
            row["hits"],
            row["home_runs"],
            row["walks"],
            row["strikeouts"],
            row["left_on_base"],
            row["runs_allowed"],
            row["hits_allowed"],
            row["home_runs_allowed"],
            row["walks_allowed"],
            row["strikeouts_recorded"],
            row["runs_scored_first5"],
            row["hits_first5"],
            row["home_runs_first5"],
            row["runs_allowed_first5"],
            row["hits_allowed_first5"],
            row["home_runs_allowed_first5"],
            row["bullpen_runs_scored"],
            row["bullpen_runs_allowed"],
            row["full_game_result"],
            row["first5_result"],
            row["raw_json"],
        ),
    )


def upsert_game_outcome(conn: sqlite3.Connection, row: dict[str, Any]) -> None:
    conn.execute(
        """
        INSERT INTO mlb_game_outcomes (
          game_pk, game_date, away_team, home_team, away_runs_final, home_runs_final,
          away_hits_final, home_hits_final, away_home_runs_final, home_home_runs_final,
          away_runs_first5, home_runs_first5, away_hits_first5, home_hits_first5,
          away_home_runs_first5, home_home_runs_first5, home_full_game_result, home_first5_result,
          home_full_game_run_diff, home_first5_run_diff, home_bullpen_run_diff,
          total_runs_final, total_runs_first5, raw_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(game_pk) DO UPDATE SET
          game_date=excluded.game_date,
          away_team=excluded.away_team,
          home_team=excluded.home_team,
          away_runs_final=excluded.away_runs_final,
          home_runs_final=excluded.home_runs_final,
          away_hits_final=excluded.away_hits_final,
          home_hits_final=excluded.home_hits_final,
          away_home_runs_final=excluded.away_home_runs_final,
          home_home_runs_final=excluded.home_home_runs_final,
          away_runs_first5=excluded.away_runs_first5,
          home_runs_first5=excluded.home_runs_first5,
          away_hits_first5=excluded.away_hits_first5,
          home_hits_first5=excluded.home_hits_first5,
          away_home_runs_first5=excluded.away_home_runs_first5,
          home_home_runs_first5=excluded.home_home_runs_first5,
          home_full_game_result=excluded.home_full_game_result,
          home_first5_result=excluded.home_first5_result,
          home_full_game_run_diff=excluded.home_full_game_run_diff,
          home_first5_run_diff=excluded.home_first5_run_diff,
          home_bullpen_run_diff=excluded.home_bullpen_run_diff,
          total_runs_final=excluded.total_runs_final,
          total_runs_first5=excluded.total_runs_first5,
          raw_json=excluded.raw_json
        """,
        (
            row["game_pk"],
            row["game_date"],
            row["away_team"],
            row["home_team"],
            row["away_runs_final"],
            row["home_runs_final"],
            row["away_hits_final"],
            row["home_hits_final"],
            row["away_home_runs_final"],
            row["home_home_runs_final"],
            row["away_runs_first5"],
            row["home_runs_first5"],
            row["away_hits_first5"],
            row["home_hits_first5"],
            row["away_home_runs_first5"],
            row["home_home_runs_first5"],
            row["home_full_game_result"],
            row["home_first5_result"],
            row["home_full_game_run_diff"],
            row["home_first5_run_diff"],
            row["home_bullpen_run_diff"],
            row["total_runs_final"],
            row["total_runs_first5"],
            row["raw_json"],
        ),
    )


def ingest_mlb_day(conn: sqlite3.Connection, date_text: str) -> None:
    init_db(conn)
    schedule_url = MLB_SCHEDULE_URL.format(date=date_text)
    schedule_text = fetch_text(schedule_url)
    schedule_payload = json.loads(schedule_text)
    schedule_path = RAW_DIR / "mlb" / date_text / "schedule.json"
    write_text(schedule_path, schedule_text)
    record_snapshot(
        conn,
        source_key="mlb.schedule",
        url=schedule_url,
        content_path=schedule_path,
        content_text=schedule_text,
        meta={"date": date_text, "totalGames": schedule_payload.get("totalGames")},
    )

    games = schedule_payload.get("dates", [{}])[0].get("games", [])
    for game in games:
        game_pk = game["gamePk"]
        live_url = MLB_FEED_URL.format(game_pk=game_pk)
        live_text = fetch_text(live_url)
        live_payload = json.loads(live_text)
        live_path = RAW_DIR / "mlb" / date_text / "games" / f"{game_pk}-feed-live.json.gz"
        write_gzip_text(live_path, live_text)
        record_snapshot(
            conn,
            source_key="mlb.feed_live",
            url=live_url,
            content_path=live_path,
            content_text=live_text,
            meta={"date": date_text, "gamePk": game_pk},
        )

        away_team = game["teams"]["away"]["team"]["name"]
        home_team = game["teams"]["home"]["team"]["name"]
        linescore = (live_payload.get("liveData") or {}).get("linescore") or {}
        conn.execute(
            """
            INSERT INTO mlb_games (
              game_pk, game_date, game_datetime, status, away_team, home_team,
              venue_name, away_score, home_score, raw_path
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(game_pk) DO UPDATE SET
              game_date=excluded.game_date,
              game_datetime=excluded.game_datetime,
              status=excluded.status,
              away_team=excluded.away_team,
              home_team=excluded.home_team,
              venue_name=excluded.venue_name,
              away_score=excluded.away_score,
              home_score=excluded.home_score,
              raw_path=excluded.raw_path
            """,
            (
                game_pk,
                date_text,
                game.get("gameDate"),
                game.get("status", {}).get("detailedState"),
                away_team,
                home_team,
                game.get("venue", {}).get("name"),
                to_int(linescore.get("teams", {}).get("away", {}).get("runs")),
                to_int(linescore.get("teams", {}).get("home", {}).get("runs")),
                str(live_path.relative_to(ROOT)),
            ),
        )

        starters = {}
        starter_game_logs = []
        for role, team_name, opponent_name in (
            ("away", away_team, home_team),
            ("home", home_team, away_team),
        ):
            starter_snapshot = starter_from_schedule_or_feed(game, live_payload, role)
            starters[role] = starter_snapshot
            conn.execute(
                """
                INSERT INTO mlb_starting_pitchers (
                  game_pk, team_role, pitcher_id, pitcher_name, pitch_hand, wins, losses,
                  era, strikeouts, innings_pitched, home_runs_allowed, whip, raw_json
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(game_pk, team_role) DO UPDATE SET
                  pitcher_id=excluded.pitcher_id,
                  pitcher_name=excluded.pitcher_name,
                  pitch_hand=excluded.pitch_hand,
                  wins=excluded.wins,
                  losses=excluded.losses,
                  era=excluded.era,
                  strikeouts=excluded.strikeouts,
                  innings_pitched=excluded.innings_pitched,
                  home_runs_allowed=excluded.home_runs_allowed,
                  whip=excluded.whip,
                  raw_json=excluded.raw_json
                """,
                (
                    game_pk,
                    role,
                    starter_snapshot["pitcher_id"],
                    starter_snapshot["pitcher_name"],
                    starter_snapshot["pitch_hand"],
                    starter_snapshot["wins"],
                    starter_snapshot["losses"],
                    starter_snapshot["era"],
                    starter_snapshot["strikeouts"],
                    starter_snapshot["innings_pitched"],
                    starter_snapshot["home_runs_allowed"],
                    starter_snapshot["whip"],
                    starter_snapshot["raw_json"],
                ),
            )
            starter_game_logs.append(
                starter_game_log_from_feed(game, live_payload, role, team_name, opponent_name, date_text)
            )

        for starter_log in starter_game_logs:
            upsert_starting_pitcher_game_log(conn, starter_log)

        home_run_rows = extract_home_run_rows(
            live_payload,
            away_team=away_team,
            home_team=home_team,
            date_text=date_text,
            game_datetime=game.get("gameDate"),
            game_pk=game_pk,
        )
        for row in home_run_rows:
            conn.execute(
                """
                INSERT INTO mlb_home_run_events (
                  event_key, game_pk, game_date, game_datetime, inning, half_inning,
                  batter_id, batter_name, pitcher_id, pitcher_name, batting_team,
                  fielding_team, description, rbi, away_score, home_score, statcast_play_id, raw_json
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(event_key) DO UPDATE SET
                  batter_id=excluded.batter_id,
                  batter_name=excluded.batter_name,
                  pitcher_id=excluded.pitcher_id,
                  pitcher_name=excluded.pitcher_name,
                  batting_team=excluded.batting_team,
                  fielding_team=excluded.fielding_team,
                  description=excluded.description,
                  rbi=excluded.rbi,
                  away_score=excluded.away_score,
                  home_score=excluded.home_score,
                  statcast_play_id=excluded.statcast_play_id,
                  raw_json=excluded.raw_json
                """,
                (
                    row["event_key"],
                    row["game_pk"],
                    row["game_date"],
                    row["game_datetime"],
                    row["inning"],
                    row["half_inning"],
                    row["batter_id"],
                    row["batter_name"],
                    row["pitcher_id"],
                    row["pitcher_name"],
                    row["batting_team"],
                    row["fielding_team"],
                    row["description"],
                    row["rbi"],
                    row["away_score"],
                    row["home_score"],
                    row["statcast_play_id"],
                    row["raw_json"],
                ),
            )

        team_rows = build_team_game_stats_rows(game, live_payload, date_text, home_run_rows)
        away_row = next(row for row in team_rows if row["team_role"] == "away")
        home_row = next(row for row in team_rows if row["team_role"] == "home")
        for row in team_rows:
            upsert_team_game_stats(conn, row)

        outcome_row = build_outcome_row(date_text, away_row, home_row)
        upsert_game_outcome(conn, outcome_row)

        summary_path = RAW_DIR / "mlb" / date_text / "games" / f"{game_pk}-summary.json"
        summary_payload = build_slim_game_summary(game, live_payload, starters, team_rows, outcome_row, home_run_rows)
        write_json(summary_path, summary_payload)

    conn.commit()


def ingest_mlb_date_range(conn: sqlite3.Connection, start_date: str, end_date: str) -> None:
    current = datetime.strptime(start_date, "%Y-%m-%d").date()
    final = datetime.strptime(end_date, "%Y-%m-%d").date()
    if current > final:
        raise ValueError("start_date must be on or before end_date")
    while current <= final:
        ingest_mlb_day(conn, current.isoformat())
        current += timedelta(days=1)


def ingest_statcast_hr_leaderboard(conn: sqlite3.Connection, date_text: str, season: int) -> None:
    init_db(conn)
    csv_url = STATCAST_HOME_RUNS_CSV_URL.format(season=season)
    csv_text = fetch_text(csv_url)
    csv_path = RAW_DIR / "statcast" / "home-runs" / f"{date_text}-season-{season}.csv"
    write_text(csv_path, csv_text)
    record_snapshot(
        conn,
        source_key="statcast.home_runs_csv",
        url=csv_url,
        content_path=csv_path,
        content_text=csv_text,
        meta={"date": date_text, "season": season},
    )

    rows = list(csv.DictReader(io.StringIO(csv_text.lstrip("\ufeff"))))
    for row in rows:
        conn.execute(
            """
            INSERT INTO statcast_hr_leaderboard_snapshots (
              snapshot_date, season, player_id, player_name, team_abbrev, hr_total, xhr,
              xhr_diff, no_doubters, mostly_gone, doubters, no_doubter_per, avg_hr_trot, source_url
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(snapshot_date, season, player_id) DO UPDATE SET
              player_name=excluded.player_name,
              team_abbrev=excluded.team_abbrev,
              hr_total=excluded.hr_total,
              xhr=excluded.xhr,
              xhr_diff=excluded.xhr_diff,
              no_doubters=excluded.no_doubters,
              mostly_gone=excluded.mostly_gone,
              doubters=excluded.doubters,
              no_doubter_per=excluded.no_doubter_per,
              avg_hr_trot=excluded.avg_hr_trot,
              source_url=excluded.source_url
            """,
            (
                date_text,
                season,
                to_int(row.get("player_id")),
                row.get("player"),
                row.get("team_abbrev"),
                to_float(row.get("hr_total")),
                to_float(row.get("xhr")),
                to_float(row.get("xhr_diff")),
                to_float(row.get("no_doubters")),
                to_float(row.get("mostly_gone")),
                to_float(row.get("doubters")),
                to_float(row.get("no_doubter_per")),
                to_float(row.get("avg_hr_trot")),
                csv_url,
            ),
        )

    conn.commit()


def build_team_form_row(as_of_date: str, team_name: str, window_games: int, rows: list[sqlite3.Row]) -> dict[str, Any] | None:
    if not rows:
        return None
    games_sample = len(rows)
    runs = [row["runs_scored"] for row in rows]
    hits = [row["hits"] for row in rows]
    home_runs = [row["home_runs"] for row in rows]
    runs_allowed = [row["runs_allowed"] for row in rows]
    hits_allowed = [row["hits_allowed"] for row in rows]
    home_runs_allowed = [row["home_runs_allowed"] for row in rows]
    first5_runs = [row["runs_scored_first5"] for row in rows]
    first5_runs_allowed = [row["runs_allowed_first5"] for row in rows]
    bullpen_runs = [row["bullpen_runs_scored"] for row in rows]
    bullpen_runs_allowed = [row["bullpen_runs_allowed"] for row in rows]
    at_bats = [row["at_bats"] or 0 for row in rows]
    recent_runs, all_runs = split_recent(runs)
    recent_home_runs, all_home_runs = split_recent(home_runs)

    return {
        "as_of_date": as_of_date,
        "team_name": team_name,
        "window_games": window_games,
        "games_sample": games_sample,
        "wins": sum(1 for row in rows if row["full_game_result"] == "win"),
        "losses": sum(1 for row in rows if row["full_game_result"] == "loss"),
        "runs_scored_per_game": safe_mean(runs),
        "hits_per_game": safe_mean(hits),
        "home_runs_per_game": safe_mean(home_runs),
        "hit_efficiency": (sum(hits) / sum(at_bats)) if sum(at_bats) else 0.0,
        "runs_allowed_per_game": safe_mean(runs_allowed),
        "hits_allowed_per_game": safe_mean(hits_allowed),
        "home_runs_allowed_per_game": safe_mean(home_runs_allowed),
        "first5_runs_scored_per_game": safe_mean(first5_runs),
        "first5_runs_allowed_per_game": safe_mean(first5_runs_allowed),
        "bullpen_runs_scored_per_game": safe_mean(bullpen_runs),
        "bullpen_runs_allowed_per_game": safe_mean(bullpen_runs_allowed),
        "run_diff_per_game": safe_mean([row["runs_scored"] - row["runs_allowed"] for row in rows]),
        "first5_run_diff_per_game": safe_mean(
            [row["runs_scored_first5"] - row["runs_allowed_first5"] for row in rows]
        ),
        "scoring_volatility": safe_pstdev(all_runs),
        "home_run_burstiness": safe_pstdev(all_home_runs) + max(0.0, safe_mean(recent_home_runs) - safe_mean(all_home_runs)),
        "recent_3_runs_delta": safe_mean(recent_runs) - safe_mean(all_runs),
        "recent_3_home_runs_delta": safe_mean(recent_home_runs) - safe_mean(all_home_runs),
    }


def build_pitcher_form_row(
    as_of_date: str, pitcher_id: int, pitcher_name: str, window_starts: int, rows: list[sqlite3.Row]
) -> dict[str, Any] | None:
    if not rows:
        return None
    starts_sample = len(rows)
    innings = [row["innings_pitched"] or 0.0 for row in rows]
    outs = [row["outs_recorded"] or 0 for row in rows]
    runs = [row["runs_allowed"] or 0 for row in rows]
    earned_runs = [row["earned_runs"] or 0 for row in rows]
    hits_allowed = [row["hits_allowed"] or 0 for row in rows]
    home_runs_allowed = [row["home_runs_allowed"] or 0 for row in rows]
    walks_allowed = [row["walks_allowed"] or 0 for row in rows]
    strikeouts = [row["strikeouts"] or 0 for row in rows]
    pitches = [row["pitches_thrown"] or 0 for row in rows]
    batters_faced = [row["batters_faced"] or 0 for row in rows]
    recent_er, all_er = split_recent(earned_runs)
    recent_hr, all_hr = split_recent(home_runs_allowed)
    total_innings = sum(innings)
    total_walks = sum(walks_allowed)

    return {
        "as_of_date": as_of_date,
        "pitcher_id": pitcher_id,
        "pitcher_name": pitcher_name,
        "window_starts": window_starts,
        "starts_sample": starts_sample,
        "innings_per_start": safe_mean(innings),
        "outs_recorded_per_start": safe_mean(outs),
        "runs_allowed_per_start": safe_mean(runs),
        "earned_runs_per_start": safe_mean(earned_runs),
        "hits_allowed_per_start": safe_mean(hits_allowed),
        "home_runs_allowed_per_start": safe_mean(home_runs_allowed),
        "walks_allowed_per_start": safe_mean(walks_allowed),
        "strikeouts_per_start": safe_mean(strikeouts),
        "pitches_per_start": safe_mean(pitches),
        "batters_faced_per_start": safe_mean(batters_faced),
        "whip_like": ((sum(hits_allowed) + total_walks) / total_innings) if total_innings else 0.0,
        "strikeout_to_walk_ratio": (sum(strikeouts) / total_walks) if total_walks else float(sum(strikeouts)),
        "short_start_rate": sum(1 for value in outs if value < 15) / starts_sample,
        "quality_start_rate": sum(1 for ip, er in zip(innings, earned_runs) if ip >= 6 and er <= 3) / starts_sample,
        "run_volatility": safe_pstdev(runs),
        "home_run_burstiness": safe_pstdev(all_hr) + max(0.0, safe_mean(recent_hr) - safe_mean(all_hr)),
        "recent_3_earned_runs_delta": safe_mean(recent_er) - safe_mean(all_er),
    }


def refresh_rolling_form(conn: sqlite3.Connection, through_date: str | None = None) -> None:
    init_db(conn)
    params: tuple[Any, ...] = (through_date,) if through_date else ()
    date_filter = "WHERE game_date <= ?" if through_date else ""
    dates = [
        row["game_date"]
        for row in conn.execute(f"SELECT DISTINCT game_date FROM mlb_games {date_filter} ORDER BY game_date", params).fetchall()
    ]
    windows = (3, 5, 10)

    if through_date:
        conn.execute("DELETE FROM mlb_team_rolling_form WHERE as_of_date <= ?", (through_date,))
        conn.execute("DELETE FROM mlb_starting_pitcher_rolling_form WHERE as_of_date <= ?", (through_date,))
    else:
        conn.execute("DELETE FROM mlb_team_rolling_form")
        conn.execute("DELETE FROM mlb_starting_pitcher_rolling_form")

    for as_of_date in dates:
        teams = [
            row["team_name"]
            for row in conn.execute(
                "SELECT DISTINCT team_name FROM mlb_game_team_stats WHERE game_date = ? ORDER BY team_name",
                (as_of_date,),
            ).fetchall()
        ]
        for team_name in teams:
            for window_games in windows:
                rows = conn.execute(
                    """
                    SELECT * FROM mlb_game_team_stats
                    WHERE team_name = ? AND game_date < ?
                    ORDER BY game_date DESC, game_pk DESC
                    LIMIT ?
                    """,
                    (team_name, as_of_date, window_games),
                ).fetchall()
                form_row = build_team_form_row(as_of_date, team_name, window_games, rows)
                if not form_row:
                    continue
                conn.execute(
                    """
                    INSERT INTO mlb_team_rolling_form (
                      as_of_date, team_name, window_games, games_sample, wins, losses,
                      runs_scored_per_game, hits_per_game, home_runs_per_game, hit_efficiency,
                      runs_allowed_per_game, hits_allowed_per_game, home_runs_allowed_per_game,
                      first5_runs_scored_per_game, first5_runs_allowed_per_game,
                      bullpen_runs_scored_per_game, bullpen_runs_allowed_per_game,
                      run_diff_per_game, first5_run_diff_per_game, scoring_volatility,
                      home_run_burstiness, recent_3_runs_delta, recent_3_home_runs_delta
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        form_row["as_of_date"],
                        form_row["team_name"],
                        form_row["window_games"],
                        form_row["games_sample"],
                        form_row["wins"],
                        form_row["losses"],
                        form_row["runs_scored_per_game"],
                        form_row["hits_per_game"],
                        form_row["home_runs_per_game"],
                        form_row["hit_efficiency"],
                        form_row["runs_allowed_per_game"],
                        form_row["hits_allowed_per_game"],
                        form_row["home_runs_allowed_per_game"],
                        form_row["first5_runs_scored_per_game"],
                        form_row["first5_runs_allowed_per_game"],
                        form_row["bullpen_runs_scored_per_game"],
                        form_row["bullpen_runs_allowed_per_game"],
                        form_row["run_diff_per_game"],
                        form_row["first5_run_diff_per_game"],
                        form_row["scoring_volatility"],
                        form_row["home_run_burstiness"],
                        form_row["recent_3_runs_delta"],
                        form_row["recent_3_home_runs_delta"],
                    ),
                )

        pitchers = conn.execute(
            """
            SELECT DISTINCT pitcher_id, pitcher_name
            FROM mlb_starting_pitcher_game_logs
            WHERE game_date = ? AND pitcher_id IS NOT NULL
            ORDER BY pitcher_name
            """,
            (as_of_date,),
        ).fetchall()
        for pitcher in pitchers:
            for window_starts in windows:
                rows = conn.execute(
                    """
                    SELECT * FROM mlb_starting_pitcher_game_logs
                    WHERE pitcher_id = ? AND game_date < ?
                    ORDER BY game_date DESC, game_pk DESC
                    LIMIT ?
                    """,
                    (pitcher["pitcher_id"], as_of_date, window_starts),
                ).fetchall()
                form_row = build_pitcher_form_row(
                    as_of_date, pitcher["pitcher_id"], pitcher["pitcher_name"], window_starts, rows
                )
                if not form_row:
                    continue
                conn.execute(
                    """
                    INSERT INTO mlb_starting_pitcher_rolling_form (
                      as_of_date, pitcher_id, pitcher_name, window_starts, starts_sample,
                      innings_per_start, outs_recorded_per_start, runs_allowed_per_start,
                      earned_runs_per_start, hits_allowed_per_start, home_runs_allowed_per_start,
                      walks_allowed_per_start, strikeouts_per_start, pitches_per_start,
                      batters_faced_per_start, whip_like, strikeout_to_walk_ratio, short_start_rate,
                      quality_start_rate, run_volatility, home_run_burstiness, recent_3_earned_runs_delta
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        form_row["as_of_date"],
                        form_row["pitcher_id"],
                        form_row["pitcher_name"],
                        form_row["window_starts"],
                        form_row["starts_sample"],
                        form_row["innings_per_start"],
                        form_row["outs_recorded_per_start"],
                        form_row["runs_allowed_per_start"],
                        form_row["earned_runs_per_start"],
                        form_row["hits_allowed_per_start"],
                        form_row["home_runs_allowed_per_start"],
                        form_row["walks_allowed_per_start"],
                        form_row["strikeouts_per_start"],
                        form_row["pitches_per_start"],
                        form_row["batters_faced_per_start"],
                        form_row["whip_like"],
                        form_row["strikeout_to_walk_ratio"],
                        form_row["short_start_rate"],
                        form_row["quality_start_rate"],
                        form_row["run_volatility"],
                        form_row["home_run_burstiness"],
                        form_row["recent_3_earned_runs_delta"],
                    ),
                )

    conn.commit()


def import_predictions(conn: sqlite3.Connection, file_path: Path) -> None:
    init_db(conn)
    payload = json.loads(file_path.read_text(encoding="utf-8"))
    date_text = payload["date"]
    model_name = payload["modelName"]
    picks = payload["picks"]

    for pick in picks:
        metadata = {
            "seasonHr": pick.get("seasonHr"),
            "seasonXHR": pick.get("seasonXHR"),
            "xhrDiff": pick.get("xhrDiff"),
            "recentHrSinceMay1": pick.get("recentHrSinceMay1"),
            "homeRunsLast7Days": pick.get("homeRunsLast7Days"),
            "parkHrIndex": pick.get("parkHrIndex"),
            "rationale": pick.get("rationale"),
        }
        conn.execute(
            """
            INSERT INTO mlb_home_run_predictions (
              prediction_date, model_name, rank, player_id, player_name, team_abbrev,
              game_title, opposing_pitcher, score, metadata_json
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(prediction_date, model_name, player_id) DO UPDATE SET
              rank=excluded.rank,
              player_name=excluded.player_name,
              team_abbrev=excluded.team_abbrev,
              game_title=excluded.game_title,
              opposing_pitcher=excluded.opposing_pitcher,
              score=excluded.score,
              metadata_json=excluded.metadata_json
            """,
            (
                date_text,
                model_name,
                to_int(pick.get("rank")),
                to_int(pick.get("playerId")),
                pick.get("playerName"),
                pick.get("teamAbbrev"),
                pick.get("gameTitle"),
                pick.get("opposingPitcher"),
                to_float(pick.get("score")),
                json.dumps(metadata, sort_keys=True),
            ),
        )

    conn.commit()


def grade_home_run_picks(conn: sqlite3.Connection, date_text: str, model_name: str) -> list[sqlite3.Row]:
    init_db(conn)
    rows = conn.execute(
        """
        SELECT
          p.prediction_date,
          p.model_name,
          p.player_id,
          p.player_name,
          p.team_abbrev,
          COUNT(e.event_key) AS actual_home_runs,
          GROUP_CONCAT(e.event_key, ',') AS matched_event_keys
        FROM mlb_home_run_predictions p
        LEFT JOIN mlb_home_run_events e
          ON e.game_date = p.prediction_date
         AND e.batter_id = p.player_id
        WHERE p.prediction_date = ?
          AND p.model_name = ?
        GROUP BY p.prediction_date, p.model_name, p.player_id, p.player_name, p.team_abbrev
        ORDER BY p.rank ASC
        """,
        (date_text, model_name),
    ).fetchall()

    for row in rows:
        conn.execute(
            """
            INSERT INTO mlb_home_run_backtests (
              prediction_date, model_name, player_id, player_name, team_abbrev,
              actual_home_runs, hit_flag, matched_event_keys
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(prediction_date, model_name, player_id) DO UPDATE SET
              player_name=excluded.player_name,
              team_abbrev=excluded.team_abbrev,
              actual_home_runs=excluded.actual_home_runs,
              hit_flag=excluded.hit_flag,
              matched_event_keys=excluded.matched_event_keys
            """,
            (
                row["prediction_date"],
                row["model_name"],
                row["player_id"],
                row["player_name"],
                row["team_abbrev"],
                row["actual_home_runs"],
                1 if row["actual_home_runs"] else 0,
                row["matched_event_keys"],
            ),
        )

    conn.commit()
    return rows


def list_home_runs(conn: sqlite3.Connection, date_text: str) -> list[sqlite3.Row]:
    return conn.execute(
        """
        SELECT
          e.game_date,
          g.away_team || ' @ ' || g.home_team AS game_title,
          e.inning,
          e.half_inning,
          e.batter_name,
          e.pitcher_name,
          e.description
        FROM mlb_home_run_events e
        JOIN mlb_games g ON g.game_pk = e.game_pk
        WHERE e.game_date = ?
        ORDER BY g.game_datetime, e.inning, e.half_inning
        """,
        (date_text,),
    ).fetchall()


def list_first5_outcomes(conn: sqlite3.Connection, date_text: str) -> list[sqlite3.Row]:
    return conn.execute(
        """
        SELECT
          away_team || ' @ ' || home_team AS game_title,
          away_runs_first5,
          home_runs_first5,
          home_first5_result,
          home_first5_run_diff,
          away_hits_first5,
          home_hits_first5
        FROM mlb_game_outcomes
        WHERE game_date = ?
        ORDER BY game_title
        """,
        (date_text,),
    ).fetchall()


def print_backtest_summary(rows: list[sqlite3.Row]) -> None:
    hits = [row for row in rows if row["actual_home_runs"]]
    print(f"Tracked picks: {len(rows)}")
    print(f"Players who homered: {len(hits)}")
    if hits:
        print("")
        print("Hits:")
        for row in hits:
            print(f"- {row['player_name']} ({row['team_abbrev']}) | {row['actual_home_runs']} HR")
    misses = [row for row in rows if not row["actual_home_runs"]]
    if misses:
        print("")
        print("Misses:")
        for row in misses[:10]:
            print(f"- {row['player_name']} ({row['team_abbrev']})")


def print_home_run_list(rows: list[sqlite3.Row]) -> None:
    print(f"Home runs tracked: {len(rows)}")
    for row in rows:
        print(
            f"- {row['game_title']} | {row['half_inning']} {row['inning']} | "
            f"{row['batter_name']} off {row['pitcher_name']} | {row['description']}"
        )


def print_first5_outcomes(rows: list[sqlite3.Row]) -> None:
    print(f"First 5 outcomes tracked: {len(rows)}")
    for row in rows:
        print(
            f"- {row['game_title']} | F5 {row['away_runs_first5']}-{row['home_runs_first5']} | "
            f"home result: {row['home_first5_result']} | diff {row['home_first5_run_diff']} | "
            f"hits {row['away_hits_first5']}-{row['home_hits_first5']}"
        )


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Local MLB warehouse utilities for modeling and backtesting.")
    subparsers = parser.add_subparsers(dest="command", required=True)

    subparsers.add_parser("init-db", help="Create or upgrade the local SQLite warehouse schema.")

    ingest_day = subparsers.add_parser(
        "ingest-mlb-day", help="Fetch MLB schedule, feed/live data, slim summaries, and derived event rows."
    )
    ingest_day.add_argument("--date", required=True, help="Date in YYYY-MM-DD format.")

    ingest_range = subparsers.add_parser(
        "ingest-mlb-range",
        help="Fetch MLB schedule, feed/live data, and derived rows for an inclusive date range.",
    )
    ingest_range.add_argument("--start-date", required=True, help="Start date in YYYY-MM-DD format.")
    ingest_range.add_argument("--end-date", required=True, help="End date in YYYY-MM-DD format.")

    derive = subparsers.add_parser(
        "derive-mlb-features",
        help="Refresh rolling team and starter form tables for games up to a date.",
    )
    derive.add_argument("--through-date", help="Optional YYYY-MM-DD cutoff. Defaults to every loaded date.")

    ingest_hr = subparsers.add_parser(
        "ingest-statcast-hr",
        help="Fetch and store a Statcast home-run leaderboard snapshot for a season.",
    )
    ingest_hr.add_argument("--date", required=True, help="Snapshot date in YYYY-MM-DD format.")
    ingest_hr.add_argument("--season", required=True, type=int, help="Season year.")

    import_picks = subparsers.add_parser("import-predictions", help="Import a saved HR prediction snapshot JSON file.")
    import_picks.add_argument("--file", required=True, help="Path to the JSON prediction file.")

    grade = subparsers.add_parser("grade-home-run-picks", help="Compare stored predictions against actual HR events.")
    grade.add_argument("--date", required=True, help="Prediction date in YYYY-MM-DD format.")
    grade.add_argument("--model-name", required=True, help="Model name stored in the prediction snapshot.")

    list_events = subparsers.add_parser("list-home-runs", help="Print all actual home runs stored for a date.")
    list_events.add_argument("--date", required=True, help="Date in YYYY-MM-DD format.")

    list_f5 = subparsers.add_parser("list-first5", help="Print first-five outcomes stored for a date.")
    list_f5.add_argument("--date", required=True, help="Date in YYYY-MM-DD format.")

    return parser.parse_args()


def main() -> None:
    args = parse_args()
    with get_connection() as conn:
        if args.command == "init-db":
            init_db(conn)
            print(f"Initialized warehouse at {DB_PATH}")
            return

        if args.command == "ingest-mlb-day":
            ingest_mlb_day(conn, args.date)
            print(f"Ingested MLB games, summaries, starter logs, and HR events for {args.date}")
            return

        if args.command == "ingest-mlb-range":
            ingest_mlb_date_range(conn, args.start_date, args.end_date)
            print(f"Ingested MLB games, summaries, starter logs, and HR events from {args.start_date} through {args.end_date}")
            return

        if args.command == "derive-mlb-features":
            refresh_rolling_form(conn, args.through_date)
            if args.through_date:
                print(f"Refreshed rolling MLB team/starter form through {args.through_date}")
            else:
                print("Refreshed rolling MLB team/starter form for all loaded dates")
            return

        if args.command == "ingest-statcast-hr":
            ingest_statcast_hr_leaderboard(conn, args.date, args.season)
            print(f"Ingested Statcast HR leaderboard for {args.season} using snapshot date {args.date}")
            return

        if args.command == "import-predictions":
            import_predictions(conn, Path(args.file))
            print(f"Imported predictions from {args.file}")
            return

        if args.command == "grade-home-run-picks":
            rows = grade_home_run_picks(conn, args.date, args.model_name)
            print_backtest_summary(rows)
            return

        if args.command == "list-home-runs":
            rows = list_home_runs(conn, args.date)
            print_home_run_list(rows)
            return

        if args.command == "list-first5":
            rows = list_first5_outcomes(conn, args.date)
            print_first5_outcomes(rows)
            return


if __name__ == "__main__":
    main()
