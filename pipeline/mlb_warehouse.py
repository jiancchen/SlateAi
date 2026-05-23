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
DATA_DIR = ROOT / "data-private"
RAW_DIR = DATA_DIR / "raw"
WAREHOUSE_DIR = DATA_DIR / "warehouse"
PREDICTIONS_DIR = DATA_DIR / "predictions" / "mlb-home-runs"
DB_PATH = WAREHOUSE_DIR / "sports.db"
USER_AGENT = "SportsTradingBoardBot/1.0 (+https://baseballsavant.mlb.com)"
TIER3_RELIEF_WINDOW = 8
TIER3_STARTER_WINDOW = 5

MLB_SCHEDULE_URL = "https://statsapi.mlb.com/api/v1/schedule?sportId=1&date={date}&hydrate=probablePitcher,team"
MLB_FEED_URL = "https://statsapi.mlb.com/api/v1.1/game/{game_pk}/feed/live"
MLB_PLAYER_PITCHING_URL = (
    "https://statsapi.mlb.com/api/v1/people/{player_id}"
    "?hydrate=stats(group=[pitching],type=[season],season={season})"
)
STATCAST_HOME_RUNS_CSV_URL = (
    "https://baseballsavant.mlb.com/leaderboard/home-runs"
    "?year={season}&player_type=Batter&cat=xhr&team=&min=0&csv=true"
)

TEAM_DIVISIONS = {
    "Baltimore Orioles": "AL East",
    "Boston Red Sox": "AL East",
    "New York Yankees": "AL East",
    "Tampa Bay Rays": "AL East",
    "Toronto Blue Jays": "AL East",
    "Chicago White Sox": "AL Central",
    "Cleveland Guardians": "AL Central",
    "Detroit Tigers": "AL Central",
    "Kansas City Royals": "AL Central",
    "Minnesota Twins": "AL Central",
    "Athletics": "AL West",
    "Houston Astros": "AL West",
    "Los Angeles Angels": "AL West",
    "Seattle Mariners": "AL West",
    "Texas Rangers": "AL West",
    "Atlanta Braves": "NL East",
    "Miami Marlins": "NL East",
    "New York Mets": "NL East",
    "Philadelphia Phillies": "NL East",
    "Washington Nationals": "NL East",
    "Chicago Cubs": "NL Central",
    "Cincinnati Reds": "NL Central",
    "Milwaukee Brewers": "NL Central",
    "Pittsburgh Pirates": "NL Central",
    "St. Louis Cardinals": "NL Central",
    "Arizona Diamondbacks": "NL West",
    "Colorado Rockies": "NL West",
    "Los Angeles Dodgers": "NL West",
    "San Diego Padres": "NL West",
    "San Francisco Giants": "NL West",
}


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
  at_bats_first5 INTEGER,
  plate_appearances INTEGER,
  plate_appearances_first5 INTEGER,
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

CREATE TABLE IF NOT EXISTS mlb_player_game_batting (
  game_pk INTEGER NOT NULL,
  game_date TEXT NOT NULL,
  team_role TEXT NOT NULL,
  team_name TEXT NOT NULL,
  opponent_name TEXT NOT NULL,
  player_id INTEGER NOT NULL,
  player_name TEXT NOT NULL,
  batting_order INTEGER,
  position_abbrev TEXT,
  at_bats INTEGER,
  plate_appearances INTEGER,
  runs INTEGER,
  hits INTEGER,
  singles INTEGER,
  doubles INTEGER,
  triples INTEGER,
  home_runs INTEGER,
  total_bases INTEGER,
  rbi INTEGER,
  walks INTEGER,
  strikeouts INTEGER,
  left_on_base INTEGER,
  hit_by_pitch INTEGER,
  sac_bunts INTEGER,
  sac_flies INTEGER,
  stolen_bases INTEGER,
  caught_stealing INTEGER,
  ground_into_double_play INTEGER,
  summary TEXT,
  raw_json TEXT,
  PRIMARY KEY (game_pk, team_role, player_id)
);

CREATE TABLE IF NOT EXISTS mlb_pitcher_appearances (
  game_pk INTEGER NOT NULL,
  game_date TEXT NOT NULL,
  team_role TEXT NOT NULL,
  team_name TEXT NOT NULL,
  opponent_name TEXT NOT NULL,
  pitcher_id INTEGER NOT NULL,
  pitcher_name TEXT NOT NULL,
  pitcher_role TEXT NOT NULL,
  entry_order INTEGER,
  first_inning INTEGER,
  first_half TEXT,
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
  PRIMARY KEY (game_pk, team_role, pitcher_id)
);

CREATE TABLE IF NOT EXISTS mlb_plate_appearances (
  game_pk INTEGER NOT NULL,
  at_bat_index INTEGER NOT NULL,
  game_date TEXT NOT NULL,
  inning INTEGER,
  half_inning TEXT,
  batting_team TEXT,
  fielding_team TEXT,
  batting_team_role TEXT,
  fielding_team_role TEXT,
  outs_before INTEGER,
  outs_after INTEGER,
  balls_final INTEGER,
  strikes_final INTEGER,
  batter_id INTEGER,
  batter_name TEXT,
  pitcher_id INTEGER,
  pitcher_name TEXT,
  batter_side TEXT,
  pitch_hand TEXT,
  men_on_base TEXT,
  base_state_start TEXT,
  base_state_end TEXT,
  event TEXT,
  event_type TEXT,
  description TEXT,
  rbi INTEGER,
  is_scoring_play INTEGER,
  is_out INTEGER,
  is_at_bat INTEGER,
  away_score_before INTEGER,
  home_score_before INTEGER,
  away_score_after INTEGER,
  home_score_after INTEGER,
  run_delta INTEGER,
  start_time TEXT,
  end_time TEXT,
  raw_json TEXT,
  PRIMARY KEY (game_pk, at_bat_index)
);

CREATE TABLE IF NOT EXISTS mlb_pitch_events (
  game_pk INTEGER NOT NULL,
  at_bat_index INTEGER NOT NULL,
  event_index INTEGER NOT NULL,
  game_date TEXT NOT NULL,
  inning INTEGER,
  half_inning TEXT,
  batting_team TEXT,
  fielding_team TEXT,
  batter_id INTEGER,
  pitcher_id INTEGER,
  pitch_number INTEGER,
  balls INTEGER,
  strikes INTEGER,
  outs INTEGER,
  is_pitch INTEGER,
  event_type TEXT,
  call_code TEXT,
  call_description TEXT,
  pitch_type_code TEXT,
  pitch_type_description TEXT,
  is_in_play INTEGER,
  is_strike INTEGER,
  is_ball INTEGER,
  start_speed REAL,
  end_speed REAL,
  zone INTEGER,
  play_id TEXT,
  start_time TEXT,
  end_time TEXT,
  raw_json TEXT,
  PRIMARY KEY (game_pk, at_bat_index, event_index)
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

CREATE TABLE IF NOT EXISTS mlb_game_story_signals (
  game_pk INTEGER PRIMARY KEY,
  game_date TEXT NOT NULL,
  away_team TEXT NOT NULL,
  home_team TEXT NOT NULL,
  winner_team TEXT,
  loser_team TEXT,
  lead_after5_team TEXT,
  comeback_win_flag INTEGER,
  bullpen_flip_flag INTEGER,
  first_inning_jolt_flag INTEGER,
  quiet_first5_flag INTEGER,
  late_break_flag INTEGER,
  first_scoring_inning INTEGER,
  lead_changes INTEGER,
  max_comeback_runs INTEGER,
  hr_off_starters INTEGER,
  hr_off_relievers INTEGER,
  away_starter_cracked_flag INTEGER,
  home_starter_cracked_flag INTEGER,
  away_traffic_no_conversion_flag INTEGER,
  home_traffic_no_conversion_flag INTEGER,
  away_plate_appearances INTEGER,
  home_plate_appearances INTEGER,
  total_runs_first5 INTEGER,
  total_runs_final INTEGER,
  story_tags_json TEXT,
  summary_json TEXT
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

CREATE TABLE IF NOT EXISTS mlb_prop_predictions (
  prediction_date TEXT NOT NULL,
  model_name TEXT NOT NULL,
  rank INTEGER NOT NULL,
  game_id TEXT NOT NULL,
  game_title TEXT,
  away_team TEXT,
  home_team TEXT,
  away_team_full TEXT,
  home_team_full TEXT,
  player_id INTEGER NOT NULL,
  player_name TEXT NOT NULL,
  team_name TEXT NOT NULL,
  team_name_full TEXT,
  opponent_name TEXT,
  opponent_name_full TEXT,
  slot INTEGER,
  prop_type TEXT NOT NULL,
  prop_label TEXT,
  market_label TEXT,
  line_threshold REAL,
  confidence INTEGER,
  probability REAL,
  expected_value REAL,
  recommendation_tier TEXT,
  metadata_json TEXT,
  raw_json TEXT,
  PRIMARY KEY (prediction_date, model_name, game_id, player_id, prop_type)
);

CREATE TABLE IF NOT EXISTS mlb_prop_backtests (
  prediction_date TEXT NOT NULL,
  model_name TEXT NOT NULL,
  game_id TEXT NOT NULL,
  player_id INTEGER NOT NULL,
  player_name TEXT NOT NULL,
  team_name TEXT NOT NULL,
  team_name_full TEXT,
  opponent_name TEXT,
  opponent_name_full TEXT,
  prop_type TEXT NOT NULL,
  market_label TEXT,
  line_threshold REAL,
  actual_value REAL,
  hit_flag INTEGER NOT NULL,
  result_label TEXT,
  metadata_json TEXT,
  PRIMARY KEY (prediction_date, model_name, game_id, player_id, prop_type)
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

CREATE TABLE IF NOT EXISTS mlb_team_story_priors (
  as_of_date TEXT NOT NULL,
  team_name TEXT NOT NULL,
  window_games INTEGER NOT NULL,
  games_sample INTEGER NOT NULL,
  win_rate REAL,
  quiet_first5_rate REAL,
  first_inning_jolt_rate REAL,
  comeback_win_rate REAL,
  blew_lead_loss_rate REAL,
  bullpen_flip_win_rate REAL,
  bullpen_flip_loss_rate REAL,
  late_break_rate REAL,
  starter_cracked_rate REAL,
  traffic_no_conversion_rate REAL,
  low_total_game_rate REAL,
  high_total_game_rate REAL,
  avg_first_scoring_inning REAL,
  avg_total_runs_first5 REAL,
  avg_total_runs_final REAL,
  story_instability_index REAL,
  PRIMARY KEY (as_of_date, team_name, window_games)
);

CREATE TABLE IF NOT EXISTS mlb_lineup_dependency_profiles (
  as_of_date TEXT NOT NULL,
  team_name TEXT NOT NULL,
  window_games INTEGER NOT NULL,
  games_sample INTEGER NOT NULL,
  avg_players_with_hit REAL,
  avg_players_with_multi_hit REAL,
  avg_players_with_two_plus_tb REAL,
  top2_hit_share REAL,
  top3_hit_share REAL,
  top2_total_bases_share REAL,
  top3_total_bases_share REAL,
  top2_rbi_share REAL,
  top3_rbi_share REAL,
  hit_concentration_index REAL,
  total_bases_concentration_index REAL,
  rbi_concentration_index REAL,
  dependency_score REAL,
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

CREATE TABLE IF NOT EXISTS mlb_starter_leash_profiles (
  as_of_date TEXT NOT NULL,
  pitcher_id INTEGER NOT NULL,
  pitcher_name TEXT NOT NULL,
  window_starts INTEGER NOT NULL,
  starts_sample INTEGER NOT NULL,
  innings_per_start REAL,
  outs_per_start REAL,
  pitches_per_start REAL,
  batters_faced_per_start REAL,
  short_start_rate REAL,
  five_plus_inning_rate REAL,
  six_plus_inning_rate REAL,
  ninety_pitch_rate REAL,
  leash_volatility REAL,
  recent_3_outs_delta REAL,
  recent_3_pitches_delta REAL,
  leash_score REAL,
  PRIMARY KEY (as_of_date, pitcher_id, window_starts)
);

CREATE TABLE IF NOT EXISTS mlb_bullpen_usage (
  as_of_date TEXT NOT NULL,
  team_name TEXT NOT NULL,
  pitcher_id INTEGER NOT NULL,
  pitcher_name TEXT NOT NULL,
  likely_role TEXT,
  appearances_last3 INTEGER NOT NULL,
  innings_last3 REAL,
  outs_last3 INTEGER,
  pitches_last3 INTEGER,
  batters_faced_last3 INTEGER,
  last_appearance_date TEXT,
  days_since_last_appearance INTEGER,
  worked_yesterday_flag INTEGER,
  back_to_back_flag INTEGER,
  avg_entry_order REAL,
  avg_outs_per_appearance REAL,
  avg_pitches_per_appearance REAL,
  bridge_score REAL,
  availability_score REAL,
  fatigue_score REAL,
  first_reliever_likelihood REAL,
  raw_json TEXT,
  PRIMARY KEY (as_of_date, team_name, pitcher_id)
);

CREATE TABLE IF NOT EXISTS mlb_likely_relief_chains (
  as_of_date TEXT NOT NULL,
  team_name TEXT NOT NULL,
  opponent_name TEXT,
  predicted_rank INTEGER NOT NULL,
  pitcher_id INTEGER,
  pitcher_name TEXT,
  likely_role TEXT,
  first_reliever_likelihood REAL,
  availability_score REAL,
  bridge_score REAL,
  expected_outs REAL,
  worked_yesterday_flag INTEGER,
  back_to_back_flag INTEGER,
  last_appearance_date TEXT,
  raw_json TEXT,
  PRIMARY KEY (as_of_date, team_name, predicted_rank)
);

CREATE TABLE IF NOT EXISTS mlb_series_context_snapshots (
  as_of_date TEXT NOT NULL,
  game_pk INTEGER NOT NULL,
  away_team TEXT NOT NULL,
  home_team TEXT NOT NULL,
  same_division_flag INTEGER NOT NULL,
  previous_matchups_14d INTEGER NOT NULL,
  previous_matchups_30d INTEGER NOT NULL,
  series_game_number INTEGER NOT NULL,
  played_yesterday_flag INTEGER NOT NULL,
  PRIMARY KEY (as_of_date, game_pk)
);

CREATE TABLE IF NOT EXISTS mlb_reliever_first_batter_command_profiles (
  as_of_date TEXT NOT NULL,
  team_name TEXT NOT NULL,
  pitcher_id INTEGER NOT NULL,
  pitcher_name TEXT NOT NULL,
  appearance_window INTEGER NOT NULL,
  entries_sample INTEGER NOT NULL,
  avg_entry_order REAL,
  first_pitch_ball_rate REAL,
  first_pitch_strike_rate REAL,
  ball_rate REAL,
  reached_rate REAL,
  free_pass_rate REAL,
  scoring_play_rate REAL,
  run_delta_per_entry REAL,
  strikeout_rate REAL,
  command_risk_index REAL,
  PRIMARY KEY (as_of_date, team_name, pitcher_id, appearance_window)
);

CREATE TABLE IF NOT EXISTS mlb_starter_third_time_penalty_profiles (
  as_of_date TEXT NOT NULL,
  pitcher_id INTEGER NOT NULL,
  pitcher_name TEXT NOT NULL,
  window_starts INTEGER NOT NULL,
  starts_sample INTEGER NOT NULL,
  starts_with_third_trip INTEGER NOT NULL,
  third_trip_exposure_rate REAL,
  first_trip_pa INTEGER,
  second_trip_pa INTEGER,
  third_trip_pa INTEGER,
  first_trip_reached_rate REAL,
  second_trip_reached_rate REAL,
  third_trip_reached_rate REAL,
  first_trip_scoring_play_rate REAL,
  second_trip_scoring_play_rate REAL,
  third_trip_scoring_play_rate REAL,
  first_trip_run_delta REAL,
  second_trip_run_delta REAL,
  third_trip_run_delta REAL,
  first_trip_hr_rate REAL,
  second_trip_hr_rate REAL,
  third_trip_hr_rate REAL,
  third_trip_reached_delta REAL,
  third_trip_scoring_delta REAL,
  third_trip_run_delta_delta REAL,
  third_trip_hr_delta REAL,
  third_time_penalty_index REAL,
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
    ensure_columns(
        conn,
        "mlb_game_team_stats",
        {
            "at_bats_first5": "INTEGER",
            "plate_appearances_first5": "INTEGER",
        },
    )
    conn.commit()


def ensure_columns(conn: sqlite3.Connection, table_name: str, columns: dict[str, str]) -> None:
    existing = {
        row["name"]
        for row in conn.execute(f"PRAGMA table_info({table_name})").fetchall()
    }
    for column_name, column_type in columns.items():
        if column_name in existing:
            continue
        conn.execute(f"ALTER TABLE {table_name} ADD COLUMN {column_name} {column_type}")


def fetch_text(url: str) -> str:
    request = Request(url, headers={"User-Agent": USER_AGENT, "X-Requested-With": "XMLHttpRequest"})
    with urlopen(request, timeout=30) as response:
        return response.read().decode("utf-8", "ignore")


def fetch_pitcher_season_snapshot(player_id: int | None, season: int) -> dict[str, Any]:
    if not player_id:
        return {}

    payload = json.loads(fetch_text(MLB_PLAYER_PITCHING_URL.format(player_id=player_id, season=season)))
    person = (payload.get("people") or [{}])[0]
    stat_groups = person.get("stats") or []
    splits = stat_groups[0].get("splits") if stat_groups else []
    stat = (splits[0].get("stat") or {}) if splits else {}

    return {
        "pitch_hand": ((person.get("pitchHand") or {}).get("code")) or "",
        "wins": to_int(stat.get("wins")),
        "losses": to_int(stat.get("losses")),
        "era": stat.get("era"),
        "strikeouts": to_int(stat.get("strikeOuts")),
    }


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


def clamp_value(value: float, minimum: float, maximum: float) -> float:
    return max(minimum, min(maximum, value))


def split_recent(values: list[float | int], recent_window: int = 3) -> tuple[list[float | int], list[float | int]]:
    return values[:recent_window], values


def result_label(team_value: int, opponent_value: int) -> str:
    if team_value > opponent_value:
        return "win"
    if team_value < opponent_value:
        return "loss"
    return "tie"


NON_AT_BAT_EVENT_TYPES = {
    "walk",
    "intent_walk",
    "hit_by_pitch",
    "sac_bunt",
    "sac_fly",
    "catcher_interference",
}


def play_counts_as_at_bat(play: dict[str, Any]) -> bool:
    event_type = (((play.get("result") or {}).get("eventType")) or "").lower()
    if not event_type:
        return True
    if event_type in NON_AT_BAT_EVENT_TYPES:
        return False
    if event_type.startswith("sac_"):
        return False
    return True


def extract_first5_batting_counts(
    feed_game: dict[str, Any], away_team: str, home_team: str
) -> dict[str, dict[str, int]]:
    counts = {
        away_team: {"plate_appearances": 0, "at_bats": 0},
        home_team: {"plate_appearances": 0, "at_bats": 0},
    }

    for play in ((feed_game.get("liveData") or {}).get("plays") or {}).get("allPlays", []):
        about = play.get("about") or {}
        inning = to_int(about.get("inning")) or 0
        if inning > 5:
            continue
        batting_team = away_team if about.get("isTopInning") else home_team
        counts[batting_team]["plate_appearances"] += 1
        if play_counts_as_at_bat(play):
            counts[batting_team]["at_bats"] += 1

    return counts


def extract_pitcher_entry_metadata(feed_game: dict[str, Any]) -> dict[str, dict[int, dict[str, Any]]]:
    metadata: dict[str, dict[int, dict[str, Any]]] = {"away": {}, "home": {}}
    counters = {"away": 0, "home": 0}

    for play in ((feed_game.get("liveData") or {}).get("plays") or {}).get("allPlays", []):
        about = play.get("about") or {}
        fielding_role = "home" if about.get("isTopInning") else "away"
        pitcher_id = to_int((((play.get("matchup") or {}).get("pitcher")) or {}).get("id"))
        if pitcher_id is None or pitcher_id in metadata[fielding_role]:
            continue
        counters[fielding_role] += 1
        metadata[fielding_role][pitcher_id] = {
            "entry_order": counters[fielding_role],
            "first_inning": to_int(about.get("inning")),
            "first_half": about.get("halfInning"),
        }

    return metadata


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
    first5_batting_counts = extract_first5_batting_counts(feed_game, away_team, home_team)
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
            "at_bats_first5": first5_batting_counts[team_name]["at_bats"],
            "plate_appearances": to_int(batting.get("plateAppearances")),
            "plate_appearances_first5": first5_batting_counts[team_name]["plate_appearances"],
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


def extract_player_batting_rows(
    game: dict[str, Any], feed_game: dict[str, Any], date_text: str
) -> list[dict[str, Any]]:
    away_team = game["teams"]["away"]["team"]["name"]
    home_team = game["teams"]["home"]["team"]["name"]
    boxscore_teams = (((feed_game.get("liveData") or {}).get("boxscore") or {}).get("teams") or {})
    rows: list[dict[str, Any]] = []

    for role, team_name, opponent_name in (
        ("away", away_team, home_team),
        ("home", home_team, away_team),
    ):
        players = ((boxscore_teams.get(role) or {}).get("players") or {}).values()
        for player in players:
            person = player.get("person") or {}
            batting = ((player.get("stats") or {}).get("batting") or {})
            player_id = to_int(person.get("id"))
            if player_id is None:
                continue

            at_bats = to_int(batting.get("atBats")) or 0
            plate_appearances = to_int(batting.get("plateAppearances")) or 0
            walks = to_int(batting.get("baseOnBalls")) or 0
            hit_by_pitch = to_int(batting.get("hitByPitch")) or 0
            sac_bunts = to_int(batting.get("sacBunts")) or 0
            sac_flies = to_int(batting.get("sacFlies")) or 0
            runs = to_int(batting.get("runs")) or 0
            hits = to_int(batting.get("hits")) or 0
            doubles = to_int(batting.get("doubles")) or 0
            triples = to_int(batting.get("triples")) or 0
            home_runs = to_int(batting.get("homeRuns")) or 0
            total_bases = to_int(batting.get("totalBases")) or 0
            rbi = to_int(batting.get("rbi")) or 0
            strikeouts = to_int(batting.get("strikeOuts")) or 0
            left_on_base = to_int(batting.get("leftOnBase")) or 0
            stolen_bases = to_int(batting.get("stolenBases")) or 0
            caught_stealing = to_int(batting.get("caughtStealing")) or 0
            gidp = to_int(batting.get("groundIntoDoublePlay")) or 0

            has_appearance = any(
                value not in (None, 0, 0.0)
                for value in (
                    plate_appearances,
                    at_bats,
                    walks,
                    hit_by_pitch,
                    sac_bunts,
                    sac_flies,
                    runs,
                    hits,
                    rbi,
                    strikeouts,
                )
            )
            if not has_appearance:
                continue

            batting_order_raw = to_int(player.get("battingOrder"))
            batting_order = int(batting_order_raw / 100) if batting_order_raw else None
            singles = max(0, hits - doubles - triples - home_runs)

            rows.append(
                {
                    "game_pk": game["gamePk"],
                    "game_date": date_text,
                    "team_role": role,
                    "team_name": team_name,
                    "opponent_name": opponent_name,
                    "player_id": player_id,
                    "player_name": person.get("fullName") or "",
                    "batting_order": batting_order,
                    "position_abbrev": ((player.get("position") or {}).get("abbreviation")) or "",
                    "at_bats": at_bats,
                    "plate_appearances": plate_appearances,
                    "runs": runs,
                    "hits": hits,
                    "singles": singles,
                    "doubles": doubles,
                    "triples": triples,
                    "home_runs": home_runs,
                    "total_bases": total_bases,
                    "rbi": rbi,
                    "walks": walks,
                    "strikeouts": strikeouts,
                    "left_on_base": left_on_base,
                    "hit_by_pitch": hit_by_pitch,
                    "sac_bunts": sac_bunts,
                    "sac_flies": sac_flies,
                    "stolen_bases": stolen_bases,
                    "caught_stealing": caught_stealing,
                    "ground_into_double_play": gidp,
                    "summary": batting.get("summary") or "",
                    "raw_json": json.dumps(
                        {
                            "person": person,
                            "position": player.get("position") or {},
                            "battingOrder": player.get("battingOrder"),
                            "batting": batting,
                        },
                        sort_keys=True,
                    ),
                }
            )

    return rows


def extract_pitcher_appearance_rows(
    game: dict[str, Any], feed_game: dict[str, Any], date_text: str
) -> list[dict[str, Any]]:
    away_team = game["teams"]["away"]["team"]["name"]
    home_team = game["teams"]["home"]["team"]["name"]
    boxscore_teams = (((feed_game.get("liveData") or {}).get("boxscore") or {}).get("teams") or {})
    entry_metadata = extract_pitcher_entry_metadata(feed_game)
    rows: list[dict[str, Any]] = []

    for role, team_name, opponent_name in (
        ("away", away_team, home_team),
        ("home", home_team, away_team),
    ):
        players = ((boxscore_teams.get(role) or {}).get("players") or {}).values()
        for player in players:
            pitching = ((player.get("stats") or {}).get("pitching") or {})
            innings_pitched = innings_to_float(pitching.get("inningsPitched"))
            outs_recorded = to_int(pitching.get("outs"))
            batters_faced = to_int(pitching.get("battersFaced"))
            pitches_thrown = to_int(pitching.get("pitchesThrown") or pitching.get("numberOfPitches"))
            has_appearance = any(
                value not in (None, 0, 0.0)
                for value in (innings_pitched, outs_recorded, batters_faced, pitches_thrown)
            )
            if not has_appearance:
                continue

            pitcher_id = to_int((player.get("person") or {}).get("id"))
            if pitcher_id is None:
                continue

            entry_info = entry_metadata[role].get(pitcher_id, {})
            pitcher_role = "starter" if pitching.get("gamesStarted") == 1 or entry_info.get("entry_order") == 1 else "reliever"
            rows.append(
                {
                    "game_pk": game["gamePk"],
                    "game_date": date_text,
                    "team_role": role,
                    "team_name": team_name,
                    "opponent_name": opponent_name,
                    "pitcher_id": pitcher_id,
                    "pitcher_name": (player.get("person") or {}).get("fullName") or "",
                    "pitcher_role": pitcher_role,
                    "entry_order": entry_info.get("entry_order"),
                    "first_inning": entry_info.get("first_inning"),
                    "first_half": entry_info.get("first_half"),
                    "innings_pitched": innings_pitched,
                    "outs_recorded": outs_recorded,
                    "runs_allowed": to_int(pitching.get("runs")),
                    "earned_runs": to_int(pitching.get("earnedRuns")),
                    "hits_allowed": to_int(pitching.get("hits")),
                    "home_runs_allowed": to_int(pitching.get("homeRuns")),
                    "walks_allowed": to_int(pitching.get("baseOnBalls")),
                    "strikeouts": to_int(pitching.get("strikeOuts")),
                    "pitches_thrown": pitches_thrown,
                    "strikes_thrown": to_int(pitching.get("strikes")),
                    "batters_faced": batters_faced,
                    "raw_json": json.dumps(player, sort_keys=True),
                }
            )

    return rows


def _encode_base_state(bases: set[str]) -> str:
    if not bases:
        return "Empty"
    order = ["1B", "2B", "3B"]
    return "-".join(base for base in order if base in bases)


def _starting_bases_from_runners(play: dict[str, Any]) -> set[str]:
    bases: set[str] = set()
    for runner in play.get("runners") or []:
        movement = runner.get("movement") or {}
        start = movement.get("start") or movement.get("originBase")
        if start in {"1B", "2B", "3B"}:
            bases.add(start)
    return bases


def _ending_bases_from_matchup(play: dict[str, Any]) -> set[str]:
    matchup = play.get("matchup") or {}
    bases: set[str] = set()
    if matchup.get("postOnFirst"):
        bases.add("1B")
    if matchup.get("postOnSecond"):
        bases.add("2B")
    if matchup.get("postOnThird"):
        bases.add("3B")
    return bases


def extract_plate_appearance_rows(
    game: dict[str, Any], feed_game: dict[str, Any], date_text: str
) -> list[dict[str, Any]]:
    away_team = game["teams"]["away"]["team"]["name"]
    home_team = game["teams"]["home"]["team"]["name"]
    rows: list[dict[str, Any]] = []
    away_score_before = 0
    home_score_before = 0

    for play in ((feed_game.get("liveData") or {}).get("plays") or {}).get("allPlays", []):
        about = play.get("about") or {}
        result = play.get("result") or {}
        count = play.get("count") or {}
        matchup = play.get("matchup") or {}
        is_top = bool(about.get("isTopInning"))
        away_score_after = to_int(result.get("awayScore"))
        home_score_after = to_int(result.get("homeScore"))
        if away_score_after is None:
            away_score_after = away_score_before
        if home_score_after is None:
            home_score_after = home_score_before
        start_bases = _starting_bases_from_runners(play)
        end_bases = _ending_bases_from_matchup(play)

        rows.append(
            {
                "game_pk": game["gamePk"],
                "at_bat_index": to_int(about.get("atBatIndex")),
                "game_date": date_text,
                "inning": to_int(about.get("inning")),
                "half_inning": about.get("halfInning"),
                "batting_team": away_team if is_top else home_team,
                "fielding_team": home_team if is_top else away_team,
                "batting_team_role": "away" if is_top else "home",
                "fielding_team_role": "home" if is_top else "away",
                "outs_before": max((to_int(count.get("outs")) or 0) - (1 if result.get("isOut") else 0), 0),
                "outs_after": to_int(count.get("outs")),
                "balls_final": to_int(count.get("balls")),
                "strikes_final": to_int(count.get("strikes")),
                "batter_id": to_int((matchup.get("batter") or {}).get("id")),
                "batter_name": (matchup.get("batter") or {}).get("fullName"),
                "pitcher_id": to_int((matchup.get("pitcher") or {}).get("id")),
                "pitcher_name": (matchup.get("pitcher") or {}).get("fullName"),
                "batter_side": ((matchup.get("batSide") or {}).get("code")) or "",
                "pitch_hand": ((matchup.get("pitchHand") or {}).get("code")) or "",
                "men_on_base": (((matchup.get("splits") or {}).get("menOnBase")) or ""),
                "base_state_start": _encode_base_state(start_bases),
                "base_state_end": _encode_base_state(end_bases),
                "event": result.get("event"),
                "event_type": result.get("eventType"),
                "description": result.get("description"),
                "rbi": to_int(result.get("rbi")) or 0,
                "is_scoring_play": 1 if about.get("isScoringPlay") else 0,
                "is_out": 1 if result.get("isOut") else 0,
                "is_at_bat": 1 if play_counts_as_at_bat(play) else 0,
                "away_score_before": away_score_before,
                "home_score_before": home_score_before,
                "away_score_after": away_score_after,
                "home_score_after": home_score_after,
                "run_delta": max(away_score_after - away_score_before, 0) + max(home_score_after - home_score_before, 0),
                "start_time": about.get("startTime"),
                "end_time": about.get("endTime"),
                "raw_json": json.dumps(play, sort_keys=True),
            }
        )

        away_score_before = away_score_after
        home_score_before = home_score_after

    return rows


def extract_pitch_event_rows(
    game: dict[str, Any], feed_game: dict[str, Any], date_text: str
) -> list[dict[str, Any]]:
    away_team = game["teams"]["away"]["team"]["name"]
    home_team = game["teams"]["home"]["team"]["name"]
    rows: list[dict[str, Any]] = []

    for play in ((feed_game.get("liveData") or {}).get("plays") or {}).get("allPlays", []):
        about = play.get("about") or {}
        matchup = play.get("matchup") or {}
        is_top = bool(about.get("isTopInning"))
        at_bat_index = to_int(about.get("atBatIndex"))
        if at_bat_index is None:
            continue

        for event in play.get("playEvents") or []:
            details = event.get("details") or {}
            pitch_data = event.get("pitchData") or {}
            count = event.get("count") or {}
            pitch_type = details.get("type") or {}
            call = details.get("call") or {}
            rows.append(
                {
                    "game_pk": game["gamePk"],
                    "at_bat_index": at_bat_index,
                    "event_index": to_int(event.get("index")) or 0,
                    "game_date": date_text,
                    "inning": to_int(about.get("inning")),
                    "half_inning": about.get("halfInning"),
                    "batting_team": away_team if is_top else home_team,
                    "fielding_team": home_team if is_top else away_team,
                    "batter_id": to_int((matchup.get("batter") or {}).get("id")),
                    "pitcher_id": to_int((matchup.get("pitcher") or {}).get("id")),
                    "pitch_number": to_int(event.get("pitchNumber")),
                    "balls": to_int(count.get("balls")),
                    "strikes": to_int(count.get("strikes")),
                    "outs": to_int(count.get("outs")),
                    "is_pitch": 1 if event.get("isPitch") else 0,
                    "event_type": details.get("eventType") or event.get("type"),
                    "call_code": call.get("code") or details.get("code"),
                    "call_description": call.get("description") or details.get("description"),
                    "pitch_type_code": pitch_type.get("code"),
                    "pitch_type_description": pitch_type.get("description"),
                    "is_in_play": 1 if details.get("isInPlay") else 0,
                    "is_strike": 1 if details.get("isStrike") else 0,
                    "is_ball": 1 if details.get("isBall") else 0,
                    "start_speed": to_float(pitch_data.get("startSpeed")),
                    "end_speed": to_float(pitch_data.get("endSpeed")),
                    "zone": to_int(pitch_data.get("zone")),
                    "play_id": event.get("playId"),
                    "start_time": event.get("startTime"),
                    "end_time": event.get("endTime"),
                    "raw_json": json.dumps(event, sort_keys=True),
                }
            )

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


def is_completed_mlb_game(game: dict[str, Any]) -> bool:
    status = game.get("status") or {}
    detailed_state = (status.get("detailedState") or "").strip().lower()
    abstract_state = (status.get("abstractGameState") or "").strip().lower()
    coded_state = (status.get("codedGameState") or "").strip().upper()

    if detailed_state in {"postponed", "postponed: rain", "cancelled", "canceled", "suspended"}:
        return False
    if abstract_state == "final":
        return True
    if coded_state == "F":
        return True
    return detailed_state in {"final", "game over", "completed early"}


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


def upsert_pitcher_appearance(conn: sqlite3.Connection, row: dict[str, Any]) -> None:
    conn.execute(
        """
        INSERT INTO mlb_pitcher_appearances (
          game_pk, game_date, team_role, team_name, opponent_name, pitcher_id, pitcher_name,
          pitcher_role, entry_order, first_inning, first_half, innings_pitched, outs_recorded,
          runs_allowed, earned_runs, hits_allowed, home_runs_allowed, walks_allowed, strikeouts,
          pitches_thrown, strikes_thrown, batters_faced, raw_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(game_pk, team_role, pitcher_id) DO UPDATE SET
          game_date=excluded.game_date,
          team_name=excluded.team_name,
          opponent_name=excluded.opponent_name,
          pitcher_name=excluded.pitcher_name,
          pitcher_role=excluded.pitcher_role,
          entry_order=excluded.entry_order,
          first_inning=excluded.first_inning,
          first_half=excluded.first_half,
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
            row["pitcher_role"],
            row["entry_order"],
            row["first_inning"],
            row["first_half"],
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
          game_pk, game_date, team_role, team_name, opponent_name, at_bats, at_bats_first5,
          plate_appearances, plate_appearances_first5,
          total_bases, runs_scored, hits, home_runs, walks, strikeouts, left_on_base,
          runs_allowed, hits_allowed, home_runs_allowed, walks_allowed, strikeouts_recorded,
          runs_scored_first5, hits_first5, home_runs_first5, runs_allowed_first5, hits_allowed_first5,
          home_runs_allowed_first5, bullpen_runs_scored, bullpen_runs_allowed, full_game_result,
          first5_result, raw_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(game_pk, team_role) DO UPDATE SET
          game_date=excluded.game_date,
          team_name=excluded.team_name,
          opponent_name=excluded.opponent_name,
          at_bats=excluded.at_bats,
          at_bats_first5=excluded.at_bats_first5,
          plate_appearances=excluded.plate_appearances,
          plate_appearances_first5=excluded.plate_appearances_first5,
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
            row["at_bats_first5"],
            row["plate_appearances"],
            row["plate_appearances_first5"],
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


def upsert_plate_appearance(conn: sqlite3.Connection, row: dict[str, Any]) -> None:
    conn.execute(
        """
        INSERT INTO mlb_plate_appearances (
          game_pk, at_bat_index, game_date, inning, half_inning, batting_team, fielding_team,
          batting_team_role, fielding_team_role, outs_before, outs_after, balls_final, strikes_final,
          batter_id, batter_name, pitcher_id, pitcher_name, batter_side, pitch_hand, men_on_base,
          base_state_start, base_state_end, event, event_type, description, rbi, is_scoring_play,
          is_out, is_at_bat, away_score_before, home_score_before, away_score_after, home_score_after,
          run_delta, start_time, end_time, raw_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(game_pk, at_bat_index) DO UPDATE SET
          game_date=excluded.game_date,
          inning=excluded.inning,
          half_inning=excluded.half_inning,
          batting_team=excluded.batting_team,
          fielding_team=excluded.fielding_team,
          batting_team_role=excluded.batting_team_role,
          fielding_team_role=excluded.fielding_team_role,
          outs_before=excluded.outs_before,
          outs_after=excluded.outs_after,
          balls_final=excluded.balls_final,
          strikes_final=excluded.strikes_final,
          batter_id=excluded.batter_id,
          batter_name=excluded.batter_name,
          pitcher_id=excluded.pitcher_id,
          pitcher_name=excluded.pitcher_name,
          batter_side=excluded.batter_side,
          pitch_hand=excluded.pitch_hand,
          men_on_base=excluded.men_on_base,
          base_state_start=excluded.base_state_start,
          base_state_end=excluded.base_state_end,
          event=excluded.event,
          event_type=excluded.event_type,
          description=excluded.description,
          rbi=excluded.rbi,
          is_scoring_play=excluded.is_scoring_play,
          is_out=excluded.is_out,
          is_at_bat=excluded.is_at_bat,
          away_score_before=excluded.away_score_before,
          home_score_before=excluded.home_score_before,
          away_score_after=excluded.away_score_after,
          home_score_after=excluded.home_score_after,
          run_delta=excluded.run_delta,
          start_time=excluded.start_time,
          end_time=excluded.end_time,
          raw_json=excluded.raw_json
        """,
        (
            row["game_pk"],
            row["at_bat_index"],
            row["game_date"],
            row["inning"],
            row["half_inning"],
            row["batting_team"],
            row["fielding_team"],
            row["batting_team_role"],
            row["fielding_team_role"],
            row["outs_before"],
            row["outs_after"],
            row["balls_final"],
            row["strikes_final"],
            row["batter_id"],
            row["batter_name"],
            row["pitcher_id"],
            row["pitcher_name"],
            row["batter_side"],
            row["pitch_hand"],
            row["men_on_base"],
            row["base_state_start"],
            row["base_state_end"],
            row["event"],
            row["event_type"],
            row["description"],
            row["rbi"],
            row["is_scoring_play"],
            row["is_out"],
            row["is_at_bat"],
            row["away_score_before"],
            row["home_score_before"],
            row["away_score_after"],
            row["home_score_after"],
            row["run_delta"],
            row["start_time"],
            row["end_time"],
            row["raw_json"],
        ),
    )


def upsert_pitch_event(conn: sqlite3.Connection, row: dict[str, Any]) -> None:
    conn.execute(
        """
        INSERT INTO mlb_pitch_events (
          game_pk, at_bat_index, event_index, game_date, inning, half_inning, batting_team, fielding_team,
          batter_id, pitcher_id, pitch_number, balls, strikes, outs, is_pitch, event_type, call_code,
          call_description, pitch_type_code, pitch_type_description, is_in_play, is_strike, is_ball,
          start_speed, end_speed, zone, play_id, start_time, end_time, raw_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(game_pk, at_bat_index, event_index) DO UPDATE SET
          game_date=excluded.game_date,
          inning=excluded.inning,
          half_inning=excluded.half_inning,
          batting_team=excluded.batting_team,
          fielding_team=excluded.fielding_team,
          batter_id=excluded.batter_id,
          pitcher_id=excluded.pitcher_id,
          pitch_number=excluded.pitch_number,
          balls=excluded.balls,
          strikes=excluded.strikes,
          outs=excluded.outs,
          is_pitch=excluded.is_pitch,
          event_type=excluded.event_type,
          call_code=excluded.call_code,
          call_description=excluded.call_description,
          pitch_type_code=excluded.pitch_type_code,
          pitch_type_description=excluded.pitch_type_description,
          is_in_play=excluded.is_in_play,
          is_strike=excluded.is_strike,
          is_ball=excluded.is_ball,
          start_speed=excluded.start_speed,
          end_speed=excluded.end_speed,
          zone=excluded.zone,
          play_id=excluded.play_id,
          start_time=excluded.start_time,
          end_time=excluded.end_time,
          raw_json=excluded.raw_json
        """,
        (
            row["game_pk"],
            row["at_bat_index"],
            row["event_index"],
            row["game_date"],
            row["inning"],
            row["half_inning"],
            row["batting_team"],
            row["fielding_team"],
            row["batter_id"],
            row["pitcher_id"],
            row["pitch_number"],
            row["balls"],
            row["strikes"],
            row["outs"],
            row["is_pitch"],
            row["event_type"],
            row["call_code"],
            row["call_description"],
            row["pitch_type_code"],
            row["pitch_type_description"],
            row["is_in_play"],
            row["is_strike"],
            row["is_ball"],
            row["start_speed"],
            row["end_speed"],
            row["zone"],
            row["play_id"],
            row["start_time"],
            row["end_time"],
            row["raw_json"],
        ),
    )


def upsert_player_game_batting(conn: sqlite3.Connection, row: dict[str, Any]) -> None:
    conn.execute(
        """
        INSERT INTO mlb_player_game_batting (
          game_pk, game_date, team_role, team_name, opponent_name, player_id, player_name,
          batting_order, position_abbrev, at_bats, plate_appearances, runs, hits, singles,
          doubles, triples, home_runs, total_bases, rbi, walks, strikeouts, left_on_base,
          hit_by_pitch, sac_bunts, sac_flies, stolen_bases, caught_stealing,
          ground_into_double_play, summary, raw_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(game_pk, team_role, player_id) DO UPDATE SET
          game_date=excluded.game_date,
          team_name=excluded.team_name,
          opponent_name=excluded.opponent_name,
          player_name=excluded.player_name,
          batting_order=excluded.batting_order,
          position_abbrev=excluded.position_abbrev,
          at_bats=excluded.at_bats,
          plate_appearances=excluded.plate_appearances,
          runs=excluded.runs,
          hits=excluded.hits,
          singles=excluded.singles,
          doubles=excluded.doubles,
          triples=excluded.triples,
          home_runs=excluded.home_runs,
          total_bases=excluded.total_bases,
          rbi=excluded.rbi,
          walks=excluded.walks,
          strikeouts=excluded.strikeouts,
          left_on_base=excluded.left_on_base,
          hit_by_pitch=excluded.hit_by_pitch,
          sac_bunts=excluded.sac_bunts,
          sac_flies=excluded.sac_flies,
          stolen_bases=excluded.stolen_bases,
          caught_stealing=excluded.caught_stealing,
          ground_into_double_play=excluded.ground_into_double_play,
          summary=excluded.summary,
          raw_json=excluded.raw_json
        """,
        (
            row["game_pk"],
            row["game_date"],
            row["team_role"],
            row["team_name"],
            row["opponent_name"],
            row["player_id"],
            row["player_name"],
            row["batting_order"],
            row["position_abbrev"],
            row["at_bats"],
            row["plate_appearances"],
            row["runs"],
            row["hits"],
            row["singles"],
            row["doubles"],
            row["triples"],
            row["home_runs"],
            row["total_bases"],
            row["rbi"],
            row["walks"],
            row["strikeouts"],
            row["left_on_base"],
            row["hit_by_pitch"],
            row["sac_bunts"],
            row["sac_flies"],
            row["stolen_bases"],
            row["caught_stealing"],
            row["ground_into_double_play"],
            row["summary"],
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


def upsert_game_story_signal(conn: sqlite3.Connection, row: dict[str, Any]) -> None:
    conn.execute(
        """
        INSERT INTO mlb_game_story_signals (
          game_pk, game_date, away_team, home_team, winner_team, loser_team, lead_after5_team,
          comeback_win_flag, bullpen_flip_flag, first_inning_jolt_flag, quiet_first5_flag, late_break_flag,
          first_scoring_inning, lead_changes, max_comeback_runs, hr_off_starters, hr_off_relievers,
          away_starter_cracked_flag, home_starter_cracked_flag, away_traffic_no_conversion_flag,
          home_traffic_no_conversion_flag, away_plate_appearances, home_plate_appearances,
          total_runs_first5, total_runs_final, story_tags_json, summary_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(game_pk) DO UPDATE SET
          game_date=excluded.game_date,
          away_team=excluded.away_team,
          home_team=excluded.home_team,
          winner_team=excluded.winner_team,
          loser_team=excluded.loser_team,
          lead_after5_team=excluded.lead_after5_team,
          comeback_win_flag=excluded.comeback_win_flag,
          bullpen_flip_flag=excluded.bullpen_flip_flag,
          first_inning_jolt_flag=excluded.first_inning_jolt_flag,
          quiet_first5_flag=excluded.quiet_first5_flag,
          late_break_flag=excluded.late_break_flag,
          first_scoring_inning=excluded.first_scoring_inning,
          lead_changes=excluded.lead_changes,
          max_comeback_runs=excluded.max_comeback_runs,
          hr_off_starters=excluded.hr_off_starters,
          hr_off_relievers=excluded.hr_off_relievers,
          away_starter_cracked_flag=excluded.away_starter_cracked_flag,
          home_starter_cracked_flag=excluded.home_starter_cracked_flag,
          away_traffic_no_conversion_flag=excluded.away_traffic_no_conversion_flag,
          home_traffic_no_conversion_flag=excluded.home_traffic_no_conversion_flag,
          away_plate_appearances=excluded.away_plate_appearances,
          home_plate_appearances=excluded.home_plate_appearances,
          total_runs_first5=excluded.total_runs_first5,
          total_runs_final=excluded.total_runs_final,
          story_tags_json=excluded.story_tags_json,
          summary_json=excluded.summary_json
        """,
        (
            row["game_pk"],
            row["game_date"],
            row["away_team"],
            row["home_team"],
            row["winner_team"],
            row["loser_team"],
            row["lead_after5_team"],
            row["comeback_win_flag"],
            row["bullpen_flip_flag"],
            row["first_inning_jolt_flag"],
            row["quiet_first5_flag"],
            row["late_break_flag"],
            row["first_scoring_inning"],
            row["lead_changes"],
            row["max_comeback_runs"],
            row["hr_off_starters"],
            row["hr_off_relievers"],
            row["away_starter_cracked_flag"],
            row["home_starter_cracked_flag"],
            row["away_traffic_no_conversion_flag"],
            row["home_traffic_no_conversion_flag"],
            row["away_plate_appearances"],
            row["home_plate_appearances"],
            row["total_runs_first5"],
            row["total_runs_final"],
            row["story_tags_json"],
            row["summary_json"],
        ),
    )


def _winner_and_loser_from_outcome(outcome: sqlite3.Row) -> tuple[str | None, str | None]:
    away_runs = outcome["away_runs_final"] or 0
    home_runs = outcome["home_runs_final"] or 0
    if away_runs > home_runs:
        return outcome["away_team"], outcome["home_team"]
    if home_runs > away_runs:
        return outcome["home_team"], outcome["away_team"]
    return None, None


def _lead_after_five(team_rows: dict[str, sqlite3.Row], away_team: str, home_team: str) -> str | None:
    away_first5 = team_rows["away"]["runs_scored_first5"] or 0
    home_first5 = team_rows["home"]["runs_scored_first5"] or 0
    if away_first5 > home_first5:
        return away_team
    if home_first5 > away_first5:
        return home_team
    return None


def _starter_cracked_flag(starter_row: sqlite3.Row | None) -> int:
    if not starter_row:
        return 0
    innings = starter_row["innings_pitched"] or 0.0
    earned_runs = starter_row["earned_runs"] or 0
    outs = starter_row["outs_recorded"] or 0
    if innings < 4.5 and earned_runs >= 3:
        return 1
    if outs < 12 and (starter_row["runs_allowed"] or 0) >= 3:
        return 1
    return 0


def build_game_story_signal_row(
    game_row: sqlite3.Row,
    outcome: sqlite3.Row,
    team_rows: dict[str, sqlite3.Row],
    plate_rows: list[sqlite3.Row],
    starter_rows: dict[str, sqlite3.Row],
    hr_role_counts: dict[str, int],
) -> dict[str, Any]:
    away_team = game_row["away_team"]
    home_team = game_row["home_team"]
    winner_team, loser_team = _winner_and_loser_from_outcome(outcome)
    lead_after5_team = _lead_after_five(team_rows, away_team, home_team)
    first_inning_runs = sum((row["run_delta"] or 0) for row in plate_rows if (row["inning"] or 0) == 1)
    first_scoring_play = next((row for row in plate_rows if (row["run_delta"] or 0) > 0), None)
    first_scoring_inning = first_scoring_play["inning"] if first_scoring_play else None

    last_non_tie_leader = None
    lead_changes = 0
    max_comeback_runs = 0
    for row in plate_rows:
        away_score = row["away_score_after"] or 0
        home_score = row["home_score_after"] or 0
        leader = None
        if away_score > home_score:
            leader = away_team
        elif home_score > away_score:
            leader = home_team
        if leader and last_non_tie_leader and leader != last_non_tie_leader:
            lead_changes += 1
        if leader:
            last_non_tie_leader = leader

        if winner_team == away_team:
            max_comeback_runs = max(max_comeback_runs, home_score - away_score)
        elif winner_team == home_team:
            max_comeback_runs = max(max_comeback_runs, away_score - home_score)

    total_runs_first5 = outcome["total_runs_first5"] or 0
    total_runs_final = outcome["total_runs_final"] or 0
    comeback_win_flag = 1 if winner_team and max_comeback_runs >= 1 else 0
    bullpen_flip_flag = 1 if lead_after5_team and winner_team and lead_after5_team != winner_team else 0
    first_inning_jolt_flag = 1 if first_inning_runs >= 2 else 0
    quiet_first5_flag = 1 if total_runs_first5 <= 3 else 0
    late_break_flag = 1 if total_runs_first5 <= 3 and total_runs_final >= 8 else 0
    away_traffic_no_conversion_flag = 1 if (team_rows["away"]["hits"] or 0) >= 9 and (team_rows["away"]["runs_scored"] or 0) <= 3 else 0
    home_traffic_no_conversion_flag = 1 if (team_rows["home"]["hits"] or 0) >= 9 and (team_rows["home"]["runs_scored"] or 0) <= 3 else 0

    tags: list[str] = []
    if first_inning_jolt_flag:
        tags.append("first-inning jolt")
    if quiet_first5_flag:
        tags.append("quiet through five")
    if late_break_flag:
        tags.append("late break")
    if bullpen_flip_flag:
        tags.append("bullpen flip")
    if comeback_win_flag:
        tags.append("comeback win")
    if _starter_cracked_flag(starter_rows.get("away")):
        tags.append(f"{away_team} starter cracked")
    if _starter_cracked_flag(starter_rows.get("home")):
        tags.append(f"{home_team} starter cracked")
    if away_traffic_no_conversion_flag:
        tags.append(f"{away_team} traffic no conversion")
    if home_traffic_no_conversion_flag:
        tags.append(f"{home_team} traffic no conversion")
    if (hr_role_counts.get("reliever") or 0) >= 2:
        tags.append("relief homer damage")

    summary = {
        "headline": f"{winner_team or 'Tie game'} story on {game_row['game_date']}",
        "winnerTeam": winner_team,
        "loserTeam": loser_team,
        "leadAfter5Team": lead_after5_team,
        "firstInningRuns": first_inning_runs,
        "firstScoringInning": first_scoring_inning,
        "leadChanges": lead_changes,
        "maxComebackRuns": max_comeback_runs,
        "homeRunsOffStarters": hr_role_counts.get("starter", 0),
        "homeRunsOffRelievers": hr_role_counts.get("reliever", 0),
        "awayStarterCracked": bool(_starter_cracked_flag(starter_rows.get("away"))),
        "homeStarterCracked": bool(_starter_cracked_flag(starter_rows.get("home"))),
        "awayTrafficNoConversion": bool(away_traffic_no_conversion_flag),
        "homeTrafficNoConversion": bool(home_traffic_no_conversion_flag),
        "awayRuns": outcome["away_runs_final"],
        "homeRuns": outcome["home_runs_final"],
        "awayRunsFirst5": team_rows["away"]["runs_scored_first5"],
        "homeRunsFirst5": team_rows["home"]["runs_scored_first5"],
        "tags": tags,
    }

    return {
        "game_pk": game_row["game_pk"],
        "game_date": game_row["game_date"],
        "away_team": away_team,
        "home_team": home_team,
        "winner_team": winner_team,
        "loser_team": loser_team,
        "lead_after5_team": lead_after5_team,
        "comeback_win_flag": comeback_win_flag,
        "bullpen_flip_flag": bullpen_flip_flag,
        "first_inning_jolt_flag": first_inning_jolt_flag,
        "quiet_first5_flag": quiet_first5_flag,
        "late_break_flag": late_break_flag,
        "first_scoring_inning": first_scoring_inning,
        "lead_changes": lead_changes,
        "max_comeback_runs": max_comeback_runs,
        "hr_off_starters": hr_role_counts.get("starter", 0),
        "hr_off_relievers": hr_role_counts.get("reliever", 0),
        "away_starter_cracked_flag": _starter_cracked_flag(starter_rows.get("away")),
        "home_starter_cracked_flag": _starter_cracked_flag(starter_rows.get("home")),
        "away_traffic_no_conversion_flag": away_traffic_no_conversion_flag,
        "home_traffic_no_conversion_flag": home_traffic_no_conversion_flag,
        "away_plate_appearances": team_rows["away"]["plate_appearances"] or 0,
        "home_plate_appearances": team_rows["home"]["plate_appearances"] or 0,
        "total_runs_first5": total_runs_first5,
        "total_runs_final": total_runs_final,
        "story_tags_json": json.dumps(tags, sort_keys=True),
        "summary_json": json.dumps(summary, sort_keys=True),
    }


def refresh_story_signals(conn: sqlite3.Connection, through_date: str | None = None) -> None:
    params: list[Any] = []
    query = "SELECT game_pk, game_date, away_team, home_team FROM mlb_games"
    if through_date:
        query += " WHERE game_date <= ?"
        params.append(through_date)
    query += " ORDER BY game_date, game_pk"
    games = conn.execute(query, params).fetchall()

    for game_row in games:
        outcome = conn.execute("SELECT * FROM mlb_game_outcomes WHERE game_pk = ?", (game_row["game_pk"],)).fetchone()
        if not outcome:
            continue
        team_rows = {
            row["team_role"]: row
            for row in conn.execute(
                "SELECT * FROM mlb_game_team_stats WHERE game_pk = ? ORDER BY team_role", (game_row["game_pk"],)
            ).fetchall()
        }
        if "away" not in team_rows or "home" not in team_rows:
            continue
        plate_rows = conn.execute(
            "SELECT * FROM mlb_plate_appearances WHERE game_pk = ? ORDER BY at_bat_index",
            (game_row["game_pk"],),
        ).fetchall()
        starter_rows = {
            row["team_role"]: row
            for row in conn.execute(
                "SELECT * FROM mlb_starting_pitcher_game_logs WHERE game_pk = ? ORDER BY team_role",
                (game_row["game_pk"],),
            ).fetchall()
        }
        starter_ids = {
            row["pitcher_id"]: row["team_role"]
            for row in conn.execute(
                "SELECT team_role, pitcher_id FROM mlb_starting_pitchers WHERE game_pk = ?",
                (game_row["game_pk"],),
            ).fetchall()
            if row["pitcher_id"] is not None
        }
        hr_role_counts = {"starter": 0, "reliever": 0}
        for hr_row in conn.execute(
            "SELECT pitcher_id FROM mlb_home_run_events WHERE game_pk = ?",
            (game_row["game_pk"],),
        ).fetchall():
            if hr_row["pitcher_id"] in starter_ids:
                hr_role_counts["starter"] += 1
            else:
                hr_role_counts["reliever"] += 1

        story_row = build_game_story_signal_row(game_row, outcome, team_rows, plate_rows, starter_rows, hr_role_counts)
        upsert_game_story_signal(conn, story_row)

    conn.commit()


def list_story_signals(conn: sqlite3.Connection, date_text: str) -> list[sqlite3.Row]:
    return conn.execute(
        """
        SELECT game_date, away_team, home_team, winner_team, lead_after5_team, total_runs_first5, total_runs_final,
               lead_changes, max_comeback_runs, story_tags_json
        FROM mlb_game_story_signals
        WHERE game_date = ?
        ORDER BY game_pk
        """,
        (date_text,),
    ).fetchall()


def print_story_signals(rows: list[sqlite3.Row]) -> None:
    for row in rows:
        tags = ", ".join(json.loads(row["story_tags_json"] or "[]"))
        print(
            f"- {row['away_team']} @ {row['home_team']} | winner {row['winner_team'] or 'TBD'} | "
            f"after5 {row['lead_after5_team'] or 'tied'} | F5 {row['total_runs_first5']} | final {row['total_runs_final']} | "
            f"lead changes {row['lead_changes']} | comeback {row['max_comeback_runs']} | {tags}"
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
        game_is_completed = is_completed_mlb_game(game)
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

        if not game_is_completed:
            conn.execute("DELETE FROM mlb_game_outcomes WHERE game_pk = ?", (game_pk,))
            conn.execute("DELETE FROM mlb_game_story_signals WHERE game_pk = ?", (game_pk,))
            continue

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

        pitcher_appearance_rows = extract_pitcher_appearance_rows(game, live_payload, date_text)
        for row in pitcher_appearance_rows:
            upsert_pitcher_appearance(conn, row)

        plate_appearance_rows = extract_plate_appearance_rows(game, live_payload, date_text)
        for row in plate_appearance_rows:
            upsert_plate_appearance(conn, row)

        pitch_event_rows = extract_pitch_event_rows(game, live_payload, date_text)
        for row in pitch_event_rows:
            upsert_pitch_event(conn, row)

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

        player_batting_rows = extract_player_batting_rows(game, live_payload, date_text)
        for row in player_batting_rows:
            upsert_player_game_batting(conn, row)

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


def share_top(values: list[float | int], top_count: int) -> float:
    total = sum(values)
    if total <= 0:
        return 0.0
    return sum(sorted(values, reverse=True)[:top_count]) / total


def concentration_index(values: list[float | int]) -> float:
    total = sum(values)
    if total <= 0:
        return 0.0
    return sum((value / total) ** 2 for value in values if value > 0)


def build_team_story_prior_row(
    as_of_date: str, team_name: str, window_games: int, rows: list[sqlite3.Row]
) -> dict[str, Any] | None:
    if not rows:
        return None

    games_sample = len(rows)
    win_rate = safe_mean([1 if row["winner_team"] == team_name else 0 for row in rows])
    quiet_first5_rate = safe_mean([row["quiet_first5_flag"] or 0 for row in rows])
    first_inning_jolt_rate = safe_mean([row["first_inning_jolt_flag"] or 0 for row in rows])
    comeback_win_rate = safe_mean(
        [1 if row["winner_team"] == team_name and row["comeback_win_flag"] else 0 for row in rows]
    )
    blew_lead_loss_rate = safe_mean(
        [1 if row["loser_team"] == team_name and row["comeback_win_flag"] else 0 for row in rows]
    )
    bullpen_flip_win_rate = safe_mean(
        [1 if row["winner_team"] == team_name and row["bullpen_flip_flag"] else 0 for row in rows]
    )
    bullpen_flip_loss_rate = safe_mean(
        [1 if row["loser_team"] == team_name and row["bullpen_flip_flag"] else 0 for row in rows]
    )
    late_break_rate = safe_mean([row["late_break_flag"] or 0 for row in rows])
    starter_cracked_rate = safe_mean(
        [
            (row["away_starter_cracked_flag"] or 0) if row["away_team"] == team_name else (row["home_starter_cracked_flag"] or 0)
            for row in rows
        ]
    )
    traffic_no_conversion_rate = safe_mean(
        [
            (row["away_traffic_no_conversion_flag"] or 0)
            if row["away_team"] == team_name
            else (row["home_traffic_no_conversion_flag"] or 0)
            for row in rows
        ]
    )
    low_total_game_rate = safe_mean([1 if (row["total_runs_final"] or 0) <= 7 else 0 for row in rows])
    high_total_game_rate = safe_mean([1 if (row["total_runs_final"] or 0) >= 10 else 0 for row in rows])
    avg_first_scoring_inning = safe_mean(
        [row["first_scoring_inning"] if row["first_scoring_inning"] is not None else 9 for row in rows]
    )
    avg_total_runs_first5 = safe_mean([row["total_runs_first5"] or 0 for row in rows])
    avg_total_runs_final = safe_mean([row["total_runs_final"] or 0 for row in rows])
    story_instability_index = clamp_value(
        24
        + first_inning_jolt_rate * 22
        + comeback_win_rate * 12
        + blew_lead_loss_rate * 26
        + bullpen_flip_win_rate * 12
        + bullpen_flip_loss_rate * 24
        + late_break_rate * 18
        + starter_cracked_rate * 22
        + traffic_no_conversion_rate * 12
        + high_total_game_rate * 10
        - quiet_first5_rate * 8
        - low_total_game_rate * 6,
        18,
        92,
    )

    return {
        "as_of_date": as_of_date,
        "team_name": team_name,
        "window_games": window_games,
        "games_sample": games_sample,
        "win_rate": win_rate,
        "quiet_first5_rate": quiet_first5_rate,
        "first_inning_jolt_rate": first_inning_jolt_rate,
        "comeback_win_rate": comeback_win_rate,
        "blew_lead_loss_rate": blew_lead_loss_rate,
        "bullpen_flip_win_rate": bullpen_flip_win_rate,
        "bullpen_flip_loss_rate": bullpen_flip_loss_rate,
        "late_break_rate": late_break_rate,
        "starter_cracked_rate": starter_cracked_rate,
        "traffic_no_conversion_rate": traffic_no_conversion_rate,
        "low_total_game_rate": low_total_game_rate,
        "high_total_game_rate": high_total_game_rate,
        "avg_first_scoring_inning": avg_first_scoring_inning,
        "avg_total_runs_first5": avg_total_runs_first5,
        "avg_total_runs_final": avg_total_runs_final,
        "story_instability_index": story_instability_index,
    }


def build_lineup_dependency_row(
    as_of_date: str, team_name: str, window_games: int, rows: list[sqlite3.Row]
) -> dict[str, Any] | None:
    if not rows:
        return None

    by_game: dict[int, list[sqlite3.Row]] = {}
    for row in rows:
        by_game.setdefault(row["game_pk"], []).append(row)
    if not by_game:
        return None

    players_with_hit: list[float] = []
    players_with_multi_hit: list[float] = []
    players_with_two_plus_tb: list[float] = []
    top2_hit_share: list[float] = []
    top3_hit_share: list[float] = []
    top2_total_bases_share: list[float] = []
    top3_total_bases_share: list[float] = []
    top2_rbi_share: list[float] = []
    top3_rbi_share: list[float] = []
    hit_concentration: list[float] = []
    total_bases_concentration: list[float] = []
    rbi_concentration: list[float] = []

    for game_rows in by_game.values():
        hit_values = [row["hits"] or 0 for row in game_rows]
        total_bases_values = [row["total_bases"] or 0 for row in game_rows]
        rbi_values = [row["rbi"] or 0 for row in game_rows]
        players_with_hit.append(sum(1 for value in hit_values if value > 0))
        players_with_multi_hit.append(sum(1 for value in hit_values if value >= 2))
        players_with_two_plus_tb.append(sum(1 for value in total_bases_values if value >= 2))
        top2_hit_share.append(share_top(hit_values, 2))
        top3_hit_share.append(share_top(hit_values, 3))
        top2_total_bases_share.append(share_top(total_bases_values, 2))
        top3_total_bases_share.append(share_top(total_bases_values, 3))
        top2_rbi_share.append(share_top(rbi_values, 2))
        top3_rbi_share.append(share_top(rbi_values, 3))
        hit_concentration.append(concentration_index(hit_values))
        total_bases_concentration.append(concentration_index(total_bases_values))
        rbi_concentration.append(concentration_index(rbi_values))

    dependency_score = clamp_value(
        safe_mean(top3_total_bases_share) * 60
        + safe_mean(top2_rbi_share) * 18
        + safe_mean(total_bases_concentration) * 22
        + max(0.0, 4.8 - safe_mean(players_with_hit)) * 6
        + max(0.0, 2.2 - safe_mean(players_with_two_plus_tb)) * 10,
        0,
        100,
    )

    return {
        "as_of_date": as_of_date,
        "team_name": team_name,
        "window_games": window_games,
        "games_sample": len(by_game),
        "avg_players_with_hit": safe_mean(players_with_hit),
        "avg_players_with_multi_hit": safe_mean(players_with_multi_hit),
        "avg_players_with_two_plus_tb": safe_mean(players_with_two_plus_tb),
        "top2_hit_share": safe_mean(top2_hit_share),
        "top3_hit_share": safe_mean(top3_hit_share),
        "top2_total_bases_share": safe_mean(top2_total_bases_share),
        "top3_total_bases_share": safe_mean(top3_total_bases_share),
        "top2_rbi_share": safe_mean(top2_rbi_share),
        "top3_rbi_share": safe_mean(top3_rbi_share),
        "hit_concentration_index": safe_mean(hit_concentration),
        "total_bases_concentration_index": safe_mean(total_bases_concentration),
        "rbi_concentration_index": safe_mean(rbi_concentration),
        "dependency_score": dependency_score,
    }


def build_starter_leash_profile_row(
    as_of_date: str, pitcher_id: int, pitcher_name: str, window_starts: int, rows: list[sqlite3.Row]
) -> dict[str, Any] | None:
    if not rows:
        return None

    starts_sample = len(rows)
    innings = [row["innings_pitched"] or 0.0 for row in rows]
    outs = [row["outs_recorded"] or 0 for row in rows]
    pitches = [row["pitches_thrown"] or 0 for row in rows]
    batters_faced = [row["batters_faced"] or 0 for row in rows]
    recent_outs, all_outs = split_recent(outs)
    recent_pitches, all_pitches = split_recent(pitches)
    five_plus_inning_rate = sum(1 for value in outs if value >= 15) / starts_sample
    six_plus_inning_rate = sum(1 for value in outs if value >= 18) / starts_sample
    ninety_pitch_rate = sum(1 for value in pitches if value >= 90) / starts_sample
    short_start_rate = sum(1 for value in outs if value < 15) / starts_sample
    leash_volatility = safe_pstdev(outs)
    outs_anchor = clamp_value(safe_mean(outs) / 18 * 40, 0, 40)
    leash_score = clamp_value(
        outs_anchor
        + five_plus_inning_rate * 22
        + six_plus_inning_rate * 18
        + ninety_pitch_rate * 8
        - short_start_rate * 20
        - leash_volatility * 1.75
        + max(0.0, safe_mean(recent_outs) - safe_mean(all_outs)) * 1.5,
        0,
        100,
    )

    return {
        "as_of_date": as_of_date,
        "pitcher_id": pitcher_id,
        "pitcher_name": pitcher_name,
        "window_starts": window_starts,
        "starts_sample": starts_sample,
        "innings_per_start": safe_mean(innings),
        "outs_per_start": safe_mean(outs),
        "pitches_per_start": safe_mean(pitches),
        "batters_faced_per_start": safe_mean(batters_faced),
        "short_start_rate": short_start_rate,
        "five_plus_inning_rate": five_plus_inning_rate,
        "six_plus_inning_rate": six_plus_inning_rate,
        "ninety_pitch_rate": ninety_pitch_rate,
        "leash_volatility": leash_volatility,
        "recent_3_outs_delta": safe_mean(recent_outs) - safe_mean(all_outs),
        "recent_3_pitches_delta": safe_mean(recent_pitches) - safe_mean(all_pitches),
        "leash_score": leash_score,
    }


def build_reliever_first_batter_command_profile_row(
    conn: sqlite3.Connection,
    as_of_date: str,
    team_name: str,
    pitcher_id: int,
    pitcher_name: str,
    appearance_window: int,
    rows: list[sqlite3.Row],
) -> dict[str, Any] | None:
    if not rows:
        return None

    selected_rows = rows[:appearance_window]
    game_pks = [row["game_pk"] for row in selected_rows if row["game_pk"] is not None]
    if not game_pks:
        return None

    placeholders = ",".join("?" for _ in game_pks)
    first_pa_rows = conn.execute(
        f"""
        WITH first_pa AS (
          SELECT
            pa.game_pk,
            MIN(pa.at_bat_index) AS at_bat_index
          FROM mlb_plate_appearances pa
          WHERE pa.game_pk IN ({placeholders})
            AND pa.pitcher_id = ?
          GROUP BY pa.game_pk
        ),
        pitch_rollup AS (
          SELECT
            game_pk,
            at_bat_index,
            AVG(CASE WHEN is_pitch = 1 THEN CASE WHEN is_ball = 1 THEN 1.0 ELSE 0 END END) AS ball_rate,
            MAX(CASE WHEN pitch_number = 1 AND is_ball = 1 THEN 1 ELSE 0 END) AS first_pitch_ball_flag,
            MAX(CASE WHEN pitch_number = 1 AND is_strike = 1 THEN 1 ELSE 0 END) AS first_pitch_strike_flag
          FROM mlb_pitch_events
          GROUP BY game_pk, at_bat_index
        )
        SELECT
          fp.game_pk,
          pa.event_type,
          pa.is_out,
          pa.is_scoring_play,
          pa.run_delta,
          pr.ball_rate,
          pr.first_pitch_ball_flag,
          pr.first_pitch_strike_flag,
          CASE
            WHEN lower(COALESCE(pa.event_type, '')) IN ('walk', 'intent_walk', 'hit_by_pitch') THEN 1
            ELSE 0
          END AS free_pass_flag
        FROM first_pa fp
        JOIN mlb_plate_appearances pa
          ON pa.game_pk = fp.game_pk
         AND pa.at_bat_index = fp.at_bat_index
        LEFT JOIN pitch_rollup pr
          ON pr.game_pk = fp.game_pk
         AND pr.at_bat_index = fp.at_bat_index
        ORDER BY fp.game_pk
        """,
        (*game_pks, pitcher_id),
    ).fetchall()
    if not first_pa_rows:
        return None

    avg_entry_order = safe_mean([row["entry_order"] or 5 for row in selected_rows])
    entries_sample = len(first_pa_rows)
    first_pitch_ball_rate = safe_mean([row["first_pitch_ball_flag"] or 0 for row in first_pa_rows])
    first_pitch_strike_rate = safe_mean([row["first_pitch_strike_flag"] or 0 for row in first_pa_rows])
    ball_rate = safe_mean([row["ball_rate"] or 0.0 for row in first_pa_rows])
    reached_rate = safe_mean([0 if row["is_out"] else 1 for row in first_pa_rows])
    free_pass_rate = safe_mean([row["free_pass_flag"] or 0 for row in first_pa_rows])
    scoring_play_rate = safe_mean([row["is_scoring_play"] or 0 for row in first_pa_rows])
    run_delta_per_entry = safe_mean([row["run_delta"] or 0 for row in first_pa_rows])
    strikeout_rate = safe_mean(
        [1 if str(row["event_type"] or "").lower() == "strikeout" else 0 for row in first_pa_rows]
    )
    command_risk_index = clamp_value(
        first_pitch_ball_rate * 28
        + ball_rate * 32
        + reached_rate * 18
        + free_pass_rate * 14
        + scoring_play_rate * 10
        + run_delta_per_entry * 6,
        0,
        100,
    )

    return {
        "as_of_date": as_of_date,
        "team_name": team_name,
        "pitcher_id": pitcher_id,
        "pitcher_name": pitcher_name,
        "appearance_window": appearance_window,
        "entries_sample": entries_sample,
        "avg_entry_order": avg_entry_order,
        "first_pitch_ball_rate": first_pitch_ball_rate,
        "first_pitch_strike_rate": first_pitch_strike_rate,
        "ball_rate": ball_rate,
        "reached_rate": reached_rate,
        "free_pass_rate": free_pass_rate,
        "scoring_play_rate": scoring_play_rate,
        "run_delta_per_entry": run_delta_per_entry,
        "strikeout_rate": strikeout_rate,
        "command_risk_index": command_risk_index,
    }


def build_starter_third_time_penalty_profile_row(
    conn: sqlite3.Connection,
    as_of_date: str,
    pitcher_id: int,
    pitcher_name: str,
    window_starts: int,
    rows: list[sqlite3.Row],
) -> dict[str, Any] | None:
    if not rows:
        return None

    selected_rows = rows[:window_starts]
    starts_sample = len(selected_rows)
    game_pks = [row["game_pk"] for row in selected_rows if row["game_pk"] is not None]
    if not game_pks:
        return None

    placeholders = ",".join("?" for _ in game_pks)
    trip_rows = conn.execute(
        f"""
        WITH starter_pas AS (
          SELECT
            pa.game_pk,
            pa.at_bat_index,
            pa.event_type,
            pa.is_out,
            pa.is_scoring_play,
            pa.run_delta,
            ROW_NUMBER() OVER (
              PARTITION BY pa.game_pk, pa.pitcher_id
              ORDER BY pa.at_bat_index
            ) AS batter_seq
          FROM mlb_plate_appearances pa
          WHERE pa.game_pk IN ({placeholders})
            AND pa.pitcher_id = ?
        ),
        bucketed AS (
          SELECT
            game_pk,
            CASE
              WHEN batter_seq <= 9 THEN 'first'
              WHEN batter_seq <= 18 THEN 'second'
              ELSE 'third'
            END AS trip_bucket,
            CASE WHEN is_out = 0 THEN 1 ELSE 0 END AS reached_flag,
            CASE WHEN lower(COALESCE(event_type, '')) = 'home_run' THEN 1 ELSE 0 END AS hr_flag,
            is_scoring_play,
            run_delta
          FROM starter_pas
        )
        SELECT
          trip_bucket,
          COUNT(*) AS pa_count,
          COUNT(DISTINCT game_pk) AS starts_covered,
          AVG(reached_flag * 1.0) AS reached_rate,
          AVG(is_scoring_play * 1.0) AS scoring_play_rate,
          AVG(run_delta * 1.0) AS run_delta,
          AVG(hr_flag * 1.0) AS hr_rate
        FROM bucketed
        GROUP BY trip_bucket
        ORDER BY CASE trip_bucket WHEN 'first' THEN 1 WHEN 'second' THEN 2 ELSE 3 END
        """,
        (*game_pks, pitcher_id),
    ).fetchall()
    if not trip_rows:
        return None

    by_bucket = {row["trip_bucket"]: row for row in trip_rows}
    first_row = by_bucket.get("first")
    second_row = by_bucket.get("second")
    third_row = by_bucket.get("third")
    starts_with_third_trip = int(third_row["starts_covered"]) if third_row else 0
    third_trip_exposure_rate = (starts_with_third_trip / starts_sample) if starts_sample else 0.0

    def bucket_float(row: sqlite3.Row | None, key: str) -> float:
        return float(row[key]) if row and row[key] is not None else 0.0

    first_reached_rate = bucket_float(first_row, "reached_rate")
    second_reached_rate = bucket_float(second_row, "reached_rate")
    third_reached_rate = bucket_float(third_row, "reached_rate")
    first_scoring_rate = bucket_float(first_row, "scoring_play_rate")
    second_scoring_rate = bucket_float(second_row, "scoring_play_rate")
    third_scoring_rate = bucket_float(third_row, "scoring_play_rate")
    first_run_delta = bucket_float(first_row, "run_delta")
    second_run_delta = bucket_float(second_row, "run_delta")
    third_run_delta = bucket_float(third_row, "run_delta")
    first_hr_rate = bucket_float(first_row, "hr_rate")
    second_hr_rate = bucket_float(second_row, "hr_rate")
    third_hr_rate = bucket_float(third_row, "hr_rate")

    prior_reached_rate = safe_mean([first_reached_rate, second_reached_rate])
    prior_scoring_rate = safe_mean([first_scoring_rate, second_scoring_rate])
    prior_run_delta = safe_mean([first_run_delta, second_run_delta])
    prior_hr_rate = safe_mean([first_hr_rate, second_hr_rate])
    third_trip_reached_delta = third_reached_rate - prior_reached_rate
    third_trip_scoring_delta = third_scoring_rate - prior_scoring_rate
    third_trip_run_delta_delta = third_run_delta - prior_run_delta
    third_trip_hr_delta = third_hr_rate - prior_hr_rate
    third_time_penalty_index = clamp_value(
        16
        + third_trip_exposure_rate * 20
        + max(0.0, third_trip_reached_delta) * 95
        + max(0.0, third_trip_scoring_delta) * 130
        + max(0.0, third_trip_run_delta_delta) * 85
        + max(0.0, third_trip_hr_delta) * 120,
        0,
        100,
    )

    return {
        "as_of_date": as_of_date,
        "pitcher_id": pitcher_id,
        "pitcher_name": pitcher_name,
        "window_starts": window_starts,
        "starts_sample": starts_sample,
        "starts_with_third_trip": starts_with_third_trip,
        "third_trip_exposure_rate": third_trip_exposure_rate,
        "first_trip_pa": int(first_row["pa_count"]) if first_row else 0,
        "second_trip_pa": int(second_row["pa_count"]) if second_row else 0,
        "third_trip_pa": int(third_row["pa_count"]) if third_row else 0,
        "first_trip_reached_rate": first_reached_rate,
        "second_trip_reached_rate": second_reached_rate,
        "third_trip_reached_rate": third_reached_rate,
        "first_trip_scoring_play_rate": first_scoring_rate,
        "second_trip_scoring_play_rate": second_scoring_rate,
        "third_trip_scoring_play_rate": third_scoring_rate,
        "first_trip_run_delta": first_run_delta,
        "second_trip_run_delta": second_run_delta,
        "third_trip_run_delta": third_run_delta,
        "first_trip_hr_rate": first_hr_rate,
        "second_trip_hr_rate": second_hr_rate,
        "third_trip_hr_rate": third_hr_rate,
        "third_trip_reached_delta": third_trip_reached_delta,
        "third_trip_scoring_delta": third_trip_scoring_delta,
        "third_trip_run_delta_delta": third_trip_run_delta_delta,
        "third_trip_hr_delta": third_trip_hr_delta,
        "third_time_penalty_index": third_time_penalty_index,
    }


def build_series_context_row(conn: sqlite3.Connection, as_of_date: str, game_row: sqlite3.Row) -> dict[str, Any]:
    as_of = datetime.strptime(as_of_date, "%Y-%m-%d").date()
    away_team = game_row["away_team"]
    home_team = game_row["home_team"]
    same_division_flag = int(TEAM_DIVISIONS.get(away_team) == TEAM_DIVISIONS.get(home_team))
    pair14_cutoff = (as_of - timedelta(days=14)).isoformat()
    pair30_cutoff = (as_of - timedelta(days=30)).isoformat()
    previous_matchups_14d = conn.execute(
        """
        SELECT COUNT(*)
        FROM mlb_games
        WHERE game_date < ?
          AND game_date >= ?
          AND ((away_team = ? AND home_team = ?) OR (away_team = ? AND home_team = ?))
        """,
        (as_of_date, pair14_cutoff, away_team, home_team, home_team, away_team),
    ).fetchone()[0]
    previous_matchups_30d = conn.execute(
        """
        SELECT COUNT(*)
        FROM mlb_games
        WHERE game_date < ?
          AND game_date >= ?
          AND ((away_team = ? AND home_team = ?) OR (away_team = ? AND home_team = ?))
        """,
        (as_of_date, pair30_cutoff, away_team, home_team, home_team, away_team),
    ).fetchone()[0]
    series_game_number = 1
    cursor = as_of - timedelta(days=1)
    while True:
        prior = conn.execute(
            """
            SELECT 1
            FROM mlb_games
            WHERE game_date = ?
              AND away_team = ?
              AND home_team = ?
            LIMIT 1
            """,
            (cursor.isoformat(), away_team, home_team),
        ).fetchone()
        if not prior:
            break
        series_game_number += 1
        cursor -= timedelta(days=1)
    played_yesterday_flag = 1 if series_game_number > 1 else 0

    return {
        "as_of_date": as_of_date,
        "game_pk": game_row["game_pk"],
        "away_team": away_team,
        "home_team": home_team,
        "same_division_flag": same_division_flag,
        "previous_matchups_14d": previous_matchups_14d,
        "previous_matchups_30d": previous_matchups_30d,
        "series_game_number": series_game_number,
        "played_yesterday_flag": played_yesterday_flag,
    }


def classify_reliever_role(avg_entry_order: float, avg_outs_per_appearance: float) -> str:
    if avg_entry_order <= 2.6 and avg_outs_per_appearance >= 2.5:
        return "bridge"
    if avg_outs_per_appearance >= 5.5:
        return "bulk"
    if avg_entry_order >= 4.0 and avg_outs_per_appearance <= 3.5:
        return "late"
    return "middle"


def build_bullpen_usage_and_chain_rows(
    as_of_date: str, team_name: str, opponent_name: str, rows: list[sqlite3.Row]
) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    if not rows:
        return [], []

    as_of = datetime.strptime(as_of_date, "%Y-%m-%d").date()
    recent3_cutoff = (as_of - timedelta(days=3)).isoformat()
    recent10_cutoff = (as_of - timedelta(days=10)).isoformat()
    by_pitcher: dict[int, list[sqlite3.Row]] = {}

    for row in rows:
        pitcher_id = row["pitcher_id"]
        if pitcher_id is None:
            continue
        by_pitcher.setdefault(pitcher_id, []).append(row)

    usage_rows: list[dict[str, Any]] = []
    chain_candidates: list[dict[str, Any]] = []

    for pitcher_id, appearances in by_pitcher.items():
        appearances.sort(key=lambda row: (row["game_date"], row["entry_order"] or 99), reverse=True)
        last10 = [row for row in appearances if row["game_date"] >= recent10_cutoff][:8]
        recent3 = [row for row in last10 if row["game_date"] >= recent3_cutoff]
        if not last10:
            continue

        last_row = last10[0]
        last_appearance_date = last_row["game_date"]
        days_since_last = (as_of - datetime.strptime(last_appearance_date, "%Y-%m-%d").date()).days
        appearance_dates = sorted({row["game_date"] for row in recent3}, reverse=True)
        worked_yesterday = 1 if days_since_last == 1 else 0
        back_to_back = 1 if len(appearance_dates) >= 2 and appearance_dates[0] == (as_of - timedelta(days=1)).isoformat() and appearance_dates[1] == (as_of - timedelta(days=2)).isoformat() else 0
        appearances_last3 = len(recent3)
        outs_last3 = sum((row["outs_recorded"] or 0) for row in recent3)
        innings_last3 = sum((row["innings_pitched"] or 0.0) for row in recent3)
        pitches_last3 = sum((row["pitches_thrown"] or 0) for row in recent3)
        batters_faced_last3 = sum((row["batters_faced"] or 0) for row in recent3)
        avg_entry_order = safe_mean([row["entry_order"] or 5 for row in last10])
        avg_outs_per_appearance = safe_mean([row["outs_recorded"] or 0 for row in last10])
        avg_pitches_per_appearance = safe_mean([row["pitches_thrown"] or 0 for row in last10])
        likely_role = classify_reliever_role(avg_entry_order, avg_outs_per_appearance)
        recent_first_reliever_count = sum(1 for row in last10 if (row["entry_order"] or 99) == 2)
        recent_first_two_count = sum(1 for row in last10 if (row["entry_order"] or 99) in (2, 3))

        fatigue_score = clamp_value(
            appearances_last3 * 14
            + pitches_last3 * 0.45
            + outs_last3 * 1.6
            + worked_yesterday * 14
            + back_to_back * 12,
            0,
            100,
        )
        rest_bonus = 8 if days_since_last >= 2 else (2 if days_since_last == 1 else -8)
        availability_score = clamp_value(92 - fatigue_score + rest_bonus, 5, 95)
        entry_anchor = clamp_value(88 - abs(avg_entry_order - 2.2) * 18, 10, 92)
        length_anchor = clamp_value(86 - abs(avg_outs_per_appearance - 4.0) * 12, 10, 90)
        bridge_bonus = min(28.0, recent_first_reliever_count * 10 + recent_first_two_count * 4)
        role_bonus = 10 if likely_role == "bridge" else 5 if likely_role == "bulk" else -6 if likely_role == "late" else 0
        bridge_score = clamp_value(entry_anchor * 0.5 + length_anchor * 0.35 + bridge_bonus + role_bonus, 5, 95)
        first_reliever_likelihood = clamp_value(
            bridge_score * 0.55 + availability_score * 0.35 + min(10.0, recent_first_two_count * 2.5),
            0,
            100,
        )

        usage_row = {
            "as_of_date": as_of_date,
            "team_name": team_name,
            "pitcher_id": pitcher_id,
            "pitcher_name": last_row["pitcher_name"],
            "likely_role": likely_role,
            "appearances_last3": appearances_last3,
            "innings_last3": round(innings_last3, 3),
            "outs_last3": outs_last3,
            "pitches_last3": pitches_last3,
            "batters_faced_last3": batters_faced_last3,
            "last_appearance_date": last_appearance_date,
            "days_since_last_appearance": days_since_last,
            "worked_yesterday_flag": worked_yesterday,
            "back_to_back_flag": back_to_back,
            "avg_entry_order": round(avg_entry_order, 2),
            "avg_outs_per_appearance": round(avg_outs_per_appearance, 2),
            "avg_pitches_per_appearance": round(avg_pitches_per_appearance, 2),
            "bridge_score": round(bridge_score, 2),
            "availability_score": round(availability_score, 2),
            "fatigue_score": round(fatigue_score, 2),
            "first_reliever_likelihood": round(first_reliever_likelihood, 2),
            "raw_json": json.dumps(
                {
                    "recentEntryOrders": [row["entry_order"] for row in last10],
                    "recentDates": [row["game_date"] for row in last10],
                    "recentOuts": [row["outs_recorded"] for row in last10],
                    "recentPitches": [row["pitches_thrown"] for row in last10],
                },
                sort_keys=True,
            ),
        }
        usage_rows.append(usage_row)
        chain_candidates.append(usage_row)

    chain_candidates.sort(
        key=lambda row: (
            row["first_reliever_likelihood"],
            row["availability_score"],
            row["bridge_score"],
            -row["days_since_last_appearance"],
        ),
        reverse=True,
    )

    likely_relief_rows = []
    for index, row in enumerate(chain_candidates[:2], start=1):
        likely_relief_rows.append(
            {
                "as_of_date": as_of_date,
                "team_name": team_name,
                "opponent_name": opponent_name,
                "predicted_rank": index,
                "pitcher_id": row["pitcher_id"],
                "pitcher_name": row["pitcher_name"],
                "likely_role": row["likely_role"],
                "first_reliever_likelihood": row["first_reliever_likelihood"],
                "availability_score": row["availability_score"],
                "bridge_score": row["bridge_score"],
                "expected_outs": row["avg_outs_per_appearance"],
                "worked_yesterday_flag": row["worked_yesterday_flag"],
                "back_to_back_flag": row["back_to_back_flag"],
                "last_appearance_date": row["last_appearance_date"],
                "raw_json": row["raw_json"],
            }
        )

    return usage_rows, likely_relief_rows


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
        conn.execute("DELETE FROM mlb_bullpen_usage WHERE as_of_date <= ?", (through_date,))
        conn.execute("DELETE FROM mlb_likely_relief_chains WHERE as_of_date <= ?", (through_date,))
    else:
        conn.execute("DELETE FROM mlb_team_rolling_form")
        conn.execute("DELETE FROM mlb_starting_pitcher_rolling_form")
        conn.execute("DELETE FROM mlb_bullpen_usage")
        conn.execute("DELETE FROM mlb_likely_relief_chains")

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

        scheduled_teams = conn.execute(
            """
            SELECT game_pk, away_team, home_team
            FROM mlb_games
            WHERE game_date = ?
            ORDER BY game_pk
            """,
            (as_of_date,),
        ).fetchall()
        processed_bullpen_teams: set[str] = set()
        for scheduled_game in scheduled_teams:
            for team_name, opponent_name in (
                (scheduled_game["away_team"], scheduled_game["home_team"]),
                (scheduled_game["home_team"], scheduled_game["away_team"]),
            ):
                if team_name in processed_bullpen_teams:
                    continue
                processed_bullpen_teams.add(team_name)
                reliever_rows = conn.execute(
                    """
                    SELECT *
                    FROM mlb_pitcher_appearances
                    WHERE team_name = ?
                      AND pitcher_role = 'reliever'
                      AND game_date < ?
                    ORDER BY game_date DESC, game_pk DESC, entry_order ASC
                    """,
                    (team_name, as_of_date),
                ).fetchall()
                usage_rows, likely_relief_rows = build_bullpen_usage_and_chain_rows(
                    as_of_date, team_name, opponent_name, reliever_rows
                )
                for usage_row in usage_rows:
                    conn.execute(
                        """
                        INSERT INTO mlb_bullpen_usage (
                          as_of_date, team_name, pitcher_id, pitcher_name, likely_role,
                          appearances_last3, innings_last3, outs_last3, pitches_last3,
                          batters_faced_last3, last_appearance_date, days_since_last_appearance,
                          worked_yesterday_flag, back_to_back_flag, avg_entry_order,
                          avg_outs_per_appearance, avg_pitches_per_appearance, bridge_score,
                          availability_score, fatigue_score, first_reliever_likelihood, raw_json
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                        """,
                        (
                            usage_row["as_of_date"],
                            usage_row["team_name"],
                            usage_row["pitcher_id"],
                            usage_row["pitcher_name"],
                            usage_row["likely_role"],
                            usage_row["appearances_last3"],
                            usage_row["innings_last3"],
                            usage_row["outs_last3"],
                            usage_row["pitches_last3"],
                            usage_row["batters_faced_last3"],
                            usage_row["last_appearance_date"],
                            usage_row["days_since_last_appearance"],
                            usage_row["worked_yesterday_flag"],
                            usage_row["back_to_back_flag"],
                            usage_row["avg_entry_order"],
                            usage_row["avg_outs_per_appearance"],
                            usage_row["avg_pitches_per_appearance"],
                            usage_row["bridge_score"],
                            usage_row["availability_score"],
                            usage_row["fatigue_score"],
                            usage_row["first_reliever_likelihood"],
                            usage_row["raw_json"],
                        ),
                    )
                for likely_row in likely_relief_rows:
                    conn.execute(
                        """
                        INSERT INTO mlb_likely_relief_chains (
                          as_of_date, team_name, opponent_name, predicted_rank, pitcher_id, pitcher_name,
                          likely_role, first_reliever_likelihood, availability_score, bridge_score,
                          expected_outs, worked_yesterday_flag, back_to_back_flag, last_appearance_date,
                          raw_json
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                        """,
                        (
                            likely_row["as_of_date"],
                            likely_row["team_name"],
                            likely_row["opponent_name"],
                            likely_row["predicted_rank"],
                            likely_row["pitcher_id"],
                            likely_row["pitcher_name"],
                            likely_row["likely_role"],
                            likely_row["first_reliever_likelihood"],
                            likely_row["availability_score"],
                            likely_row["bridge_score"],
                            likely_row["expected_outs"],
                            likely_row["worked_yesterday_flag"],
                            likely_row["back_to_back_flag"],
                            likely_row["last_appearance_date"],
                            likely_row["raw_json"],
                        ),
                    )

    conn.commit()


def refresh_tier2_profiles(conn: sqlite3.Connection, through_date: str | None = None) -> None:
    init_db(conn)
    params: tuple[Any, ...] = (through_date,) if through_date else ()
    date_filter = "WHERE game_date <= ?" if through_date else ""
    dates = [
        row["game_date"]
        for row in conn.execute(f"SELECT DISTINCT game_date FROM mlb_games {date_filter} ORDER BY game_date", params).fetchall()
    ]
    team_windows = (5, 10)
    pitcher_windows = (3, 5, 10)

    if through_date:
        conn.execute("DELETE FROM mlb_team_story_priors WHERE as_of_date <= ?", (through_date,))
        conn.execute("DELETE FROM mlb_lineup_dependency_profiles WHERE as_of_date <= ?", (through_date,))
        conn.execute("DELETE FROM mlb_starter_leash_profiles WHERE as_of_date <= ?", (through_date,))
        conn.execute("DELETE FROM mlb_series_context_snapshots WHERE as_of_date <= ?", (through_date,))
    else:
        conn.execute("DELETE FROM mlb_team_story_priors")
        conn.execute("DELETE FROM mlb_lineup_dependency_profiles")
        conn.execute("DELETE FROM mlb_starter_leash_profiles")
        conn.execute("DELETE FROM mlb_series_context_snapshots")

    for as_of_date in dates:
        teams = [
            row["team_name"]
            for row in conn.execute(
                "SELECT DISTINCT team_name FROM mlb_game_team_stats WHERE game_date = ? ORDER BY team_name",
                (as_of_date,),
            ).fetchall()
        ]
        for team_name in teams:
            for window_games in team_windows:
                story_rows = conn.execute(
                    """
                    SELECT *
                    FROM mlb_game_story_signals
                    WHERE game_date < ?
                      AND (away_team = ? OR home_team = ?)
                    ORDER BY game_date DESC, game_pk DESC
                    LIMIT ?
                    """,
                    (as_of_date, team_name, team_name, window_games),
                ).fetchall()
                story_prior_row = build_team_story_prior_row(as_of_date, team_name, window_games, story_rows)
                if story_prior_row:
                    conn.execute(
                        """
                        INSERT INTO mlb_team_story_priors (
                          as_of_date, team_name, window_games, games_sample, win_rate,
                          quiet_first5_rate, first_inning_jolt_rate, comeback_win_rate,
                          blew_lead_loss_rate, bullpen_flip_win_rate, bullpen_flip_loss_rate,
                          late_break_rate, starter_cracked_rate, traffic_no_conversion_rate,
                          low_total_game_rate, high_total_game_rate, avg_first_scoring_inning,
                          avg_total_runs_first5, avg_total_runs_final, story_instability_index
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                        """,
                        (
                            story_prior_row["as_of_date"],
                            story_prior_row["team_name"],
                            story_prior_row["window_games"],
                            story_prior_row["games_sample"],
                            story_prior_row["win_rate"],
                            story_prior_row["quiet_first5_rate"],
                            story_prior_row["first_inning_jolt_rate"],
                            story_prior_row["comeback_win_rate"],
                            story_prior_row["blew_lead_loss_rate"],
                            story_prior_row["bullpen_flip_win_rate"],
                            story_prior_row["bullpen_flip_loss_rate"],
                            story_prior_row["late_break_rate"],
                            story_prior_row["starter_cracked_rate"],
                            story_prior_row["traffic_no_conversion_rate"],
                            story_prior_row["low_total_game_rate"],
                            story_prior_row["high_total_game_rate"],
                            story_prior_row["avg_first_scoring_inning"],
                            story_prior_row["avg_total_runs_first5"],
                            story_prior_row["avg_total_runs_final"],
                            story_prior_row["story_instability_index"],
                        ),
                    )

                recent_game_ids = [
                    row["game_pk"]
                    for row in conn.execute(
                        """
                        SELECT game_pk
                        FROM mlb_game_team_stats
                        WHERE team_name = ?
                          AND game_date < ?
                        ORDER BY game_date DESC, game_pk DESC
                        LIMIT ?
                        """,
                        (team_name, as_of_date, window_games),
                    ).fetchall()
                ]
                if recent_game_ids:
                    placeholders = ",".join("?" for _ in recent_game_ids)
                    lineup_rows = conn.execute(
                        f"""
                        SELECT *
                        FROM mlb_player_game_batting
                        WHERE team_name = ?
                          AND game_pk IN ({placeholders})
                        ORDER BY game_date DESC, game_pk DESC, batting_order ASC, player_name ASC
                        """,
                        (team_name, *recent_game_ids),
                    ).fetchall()
                    dependency_row = build_lineup_dependency_row(as_of_date, team_name, window_games, lineup_rows)
                    if dependency_row:
                        conn.execute(
                            """
                            INSERT INTO mlb_lineup_dependency_profiles (
                              as_of_date, team_name, window_games, games_sample, avg_players_with_hit,
                              avg_players_with_multi_hit, avg_players_with_two_plus_tb, top2_hit_share,
                              top3_hit_share, top2_total_bases_share, top3_total_bases_share,
                              top2_rbi_share, top3_rbi_share, hit_concentration_index,
                              total_bases_concentration_index, rbi_concentration_index, dependency_score
                            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                            """,
                            (
                                dependency_row["as_of_date"],
                                dependency_row["team_name"],
                                dependency_row["window_games"],
                                dependency_row["games_sample"],
                                dependency_row["avg_players_with_hit"],
                                dependency_row["avg_players_with_multi_hit"],
                                dependency_row["avg_players_with_two_plus_tb"],
                                dependency_row["top2_hit_share"],
                                dependency_row["top3_hit_share"],
                                dependency_row["top2_total_bases_share"],
                                dependency_row["top3_total_bases_share"],
                                dependency_row["top2_rbi_share"],
                                dependency_row["top3_rbi_share"],
                                dependency_row["hit_concentration_index"],
                                dependency_row["total_bases_concentration_index"],
                                dependency_row["rbi_concentration_index"],
                                dependency_row["dependency_score"],
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
            for window_starts in pitcher_windows:
                rows = conn.execute(
                    """
                    SELECT *
                    FROM mlb_starting_pitcher_game_logs
                    WHERE pitcher_id = ? AND game_date < ?
                    ORDER BY game_date DESC, game_pk DESC
                    LIMIT ?
                    """,
                    (pitcher["pitcher_id"], as_of_date, window_starts),
                ).fetchall()
                leash_row = build_starter_leash_profile_row(
                    as_of_date, pitcher["pitcher_id"], pitcher["pitcher_name"], window_starts, rows
                )
                if not leash_row:
                    continue
                conn.execute(
                    """
                    INSERT INTO mlb_starter_leash_profiles (
                      as_of_date, pitcher_id, pitcher_name, window_starts, starts_sample,
                      innings_per_start, outs_per_start, pitches_per_start, batters_faced_per_start,
                      short_start_rate, five_plus_inning_rate, six_plus_inning_rate, ninety_pitch_rate,
                      leash_volatility, recent_3_outs_delta, recent_3_pitches_delta, leash_score
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        leash_row["as_of_date"],
                        leash_row["pitcher_id"],
                        leash_row["pitcher_name"],
                        leash_row["window_starts"],
                        leash_row["starts_sample"],
                        leash_row["innings_per_start"],
                        leash_row["outs_per_start"],
                        leash_row["pitches_per_start"],
                        leash_row["batters_faced_per_start"],
                        leash_row["short_start_rate"],
                        leash_row["five_plus_inning_rate"],
                        leash_row["six_plus_inning_rate"],
                        leash_row["ninety_pitch_rate"],
                        leash_row["leash_volatility"],
                        leash_row["recent_3_outs_delta"],
                        leash_row["recent_3_pitches_delta"],
                        leash_row["leash_score"],
                    ),
                )

        scheduled_games = conn.execute(
            """
            SELECT game_pk, away_team, home_team
            FROM mlb_games
            WHERE game_date = ?
            ORDER BY game_pk
            """,
            (as_of_date,),
        ).fetchall()
        for game_row in scheduled_games:
            series_row = build_series_context_row(conn, as_of_date, game_row)
            conn.execute(
                """
                INSERT INTO mlb_series_context_snapshots (
                  as_of_date, game_pk, away_team, home_team, same_division_flag,
                  previous_matchups_14d, previous_matchups_30d, series_game_number,
                  played_yesterday_flag
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    series_row["as_of_date"],
                    series_row["game_pk"],
                    series_row["away_team"],
                    series_row["home_team"],
                    series_row["same_division_flag"],
                    series_row["previous_matchups_14d"],
                    series_row["previous_matchups_30d"],
                    series_row["series_game_number"],
                    series_row["played_yesterday_flag"],
                ),
            )

    conn.commit()


def refresh_tier3_profiles(
    conn: sqlite3.Connection,
    through_date: str | None = None,
    as_of_date: str | None = None,
) -> None:
    init_db(conn)
    if as_of_date:
        dates = [
            row["game_date"]
            for row in conn.execute(
                "SELECT DISTINCT game_date FROM mlb_games WHERE game_date = ? ORDER BY game_date",
                (as_of_date,),
            ).fetchall()
        ]
        conn.execute("DELETE FROM mlb_reliever_first_batter_command_profiles WHERE as_of_date = ?", (as_of_date,))
        conn.execute("DELETE FROM mlb_starter_third_time_penalty_profiles WHERE as_of_date = ?", (as_of_date,))
    else:
        params: tuple[Any, ...] = (through_date,) if through_date else ()
        date_filter = "WHERE game_date <= ?" if through_date else ""
        dates = [
            row["game_date"]
            for row in conn.execute(
                f"SELECT DISTINCT game_date FROM mlb_games {date_filter} ORDER BY game_date", params
            ).fetchall()
        ]

        if through_date:
            conn.execute("DELETE FROM mlb_reliever_first_batter_command_profiles WHERE as_of_date <= ?", (through_date,))
            conn.execute("DELETE FROM mlb_starter_third_time_penalty_profiles WHERE as_of_date <= ?", (through_date,))
        else:
            conn.execute("DELETE FROM mlb_reliever_first_batter_command_profiles")
            conn.execute("DELETE FROM mlb_starter_third_time_penalty_profiles")

    for as_of_date in dates:
        scheduled_teams = [
            row["team_name"]
            for row in conn.execute(
                """
                SELECT away_team AS team_name
                FROM mlb_games
                WHERE game_date = ?
                UNION
                SELECT home_team AS team_name
                FROM mlb_games
                WHERE game_date = ?
                ORDER BY team_name
                """,
                (as_of_date, as_of_date),
            ).fetchall()
        ]
        for team_name in scheduled_teams:
            relievers = conn.execute(
                """
                SELECT DISTINCT pitcher_id, pitcher_name
                FROM mlb_pitcher_appearances
                WHERE team_name = ?
                  AND pitcher_role = 'reliever'
                  AND pitcher_id IS NOT NULL
                  AND game_date < ?
                ORDER BY pitcher_name
                """,
                (team_name, as_of_date),
            ).fetchall()
            for reliever in relievers:
                appearance_rows = conn.execute(
                    """
                    SELECT game_pk, entry_order
                    FROM mlb_pitcher_appearances
                    WHERE team_name = ?
                      AND pitcher_role = 'reliever'
                      AND pitcher_id = ?
                      AND game_date < ?
                    ORDER BY game_date DESC, game_pk DESC, entry_order ASC
                    LIMIT ?
                    """,
                    (team_name, reliever["pitcher_id"], as_of_date, TIER3_RELIEF_WINDOW),
                ).fetchall()
                profile_row = build_reliever_first_batter_command_profile_row(
                    conn,
                    as_of_date,
                    team_name,
                    reliever["pitcher_id"],
                    reliever["pitcher_name"],
                    TIER3_RELIEF_WINDOW,
                    appearance_rows,
                )
                if not profile_row or profile_row["entries_sample"] < 3:
                    continue
                conn.execute(
                    """
                    INSERT INTO mlb_reliever_first_batter_command_profiles (
                      as_of_date, team_name, pitcher_id, pitcher_name, appearance_window,
                      entries_sample, avg_entry_order, first_pitch_ball_rate,
                      first_pitch_strike_rate, ball_rate, reached_rate, free_pass_rate,
                      scoring_play_rate, run_delta_per_entry, strikeout_rate, command_risk_index
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        profile_row["as_of_date"],
                        profile_row["team_name"],
                        profile_row["pitcher_id"],
                        profile_row["pitcher_name"],
                        profile_row["appearance_window"],
                        profile_row["entries_sample"],
                        profile_row["avg_entry_order"],
                        profile_row["first_pitch_ball_rate"],
                        profile_row["first_pitch_strike_rate"],
                        profile_row["ball_rate"],
                        profile_row["reached_rate"],
                        profile_row["free_pass_rate"],
                        profile_row["scoring_play_rate"],
                        profile_row["run_delta_per_entry"],
                        profile_row["strikeout_rate"],
                        profile_row["command_risk_index"],
                    ),
                )

        starters = conn.execute(
            """
            SELECT DISTINCT sp.pitcher_id, sp.pitcher_name
            FROM mlb_games g
            JOIN mlb_starting_pitchers sp
              ON sp.game_pk = g.game_pk
            WHERE g.game_date = ?
              AND sp.pitcher_id IS NOT NULL
            ORDER BY sp.pitcher_name
            """,
            (as_of_date,),
        ).fetchall()
        for starter in starters:
            start_rows = conn.execute(
                """
                SELECT game_pk
                FROM mlb_starting_pitcher_game_logs
                WHERE pitcher_id = ?
                  AND game_date < ?
                ORDER BY game_date DESC, game_pk DESC
                LIMIT ?
                """,
                (starter["pitcher_id"], as_of_date, TIER3_STARTER_WINDOW),
            ).fetchall()
            profile_row = build_starter_third_time_penalty_profile_row(
                conn,
                as_of_date,
                starter["pitcher_id"],
                starter["pitcher_name"],
                TIER3_STARTER_WINDOW,
                start_rows,
            )
            if not profile_row or profile_row["starts_sample"] < 3:
                continue
            conn.execute(
                """
                INSERT INTO mlb_starter_third_time_penalty_profiles (
                  as_of_date, pitcher_id, pitcher_name, window_starts, starts_sample,
                  starts_with_third_trip, third_trip_exposure_rate, first_trip_pa, second_trip_pa,
                  third_trip_pa, first_trip_reached_rate, second_trip_reached_rate,
                  third_trip_reached_rate, first_trip_scoring_play_rate, second_trip_scoring_play_rate,
                  third_trip_scoring_play_rate, first_trip_run_delta, second_trip_run_delta,
                  third_trip_run_delta, first_trip_hr_rate, second_trip_hr_rate, third_trip_hr_rate,
                  third_trip_reached_delta, third_trip_scoring_delta, third_trip_run_delta_delta,
                  third_trip_hr_delta, third_time_penalty_index
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    profile_row["as_of_date"],
                    profile_row["pitcher_id"],
                    profile_row["pitcher_name"],
                    profile_row["window_starts"],
                    profile_row["starts_sample"],
                    profile_row["starts_with_third_trip"],
                    profile_row["third_trip_exposure_rate"],
                    profile_row["first_trip_pa"],
                    profile_row["second_trip_pa"],
                    profile_row["third_trip_pa"],
                    profile_row["first_trip_reached_rate"],
                    profile_row["second_trip_reached_rate"],
                    profile_row["third_trip_reached_rate"],
                    profile_row["first_trip_scoring_play_rate"],
                    profile_row["second_trip_scoring_play_rate"],
                    profile_row["third_trip_scoring_play_rate"],
                    profile_row["first_trip_run_delta"],
                    profile_row["second_trip_run_delta"],
                    profile_row["third_trip_run_delta"],
                    profile_row["first_trip_hr_rate"],
                    profile_row["second_trip_hr_rate"],
                    profile_row["third_trip_hr_rate"],
                    profile_row["third_trip_reached_delta"],
                    profile_row["third_trip_scoring_delta"],
                    profile_row["third_trip_run_delta_delta"],
                    profile_row["third_trip_hr_delta"],
                    profile_row["third_time_penalty_index"],
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


def import_prop_predictions(conn: sqlite3.Connection, file_path: Path) -> None:
    init_db(conn)
    payload = json.loads(file_path.read_text(encoding="utf-8"))
    date_text = payload["date"]
    model_name = payload["modelName"]
    picks = payload.get("picks", [])

    for pick in picks:
        metadata = {
            "reason": pick.get("reason"),
            "scriptTags": pick.get("scriptTags"),
            "matchupNote": pick.get("matchupNote"),
            "teamScriptLabel": pick.get("teamScriptLabel"),
            "lineupStatus": pick.get("lineupStatus"),
            "playerSummary": pick.get("playerSummary"),
            "statValueLabel": pick.get("statValueLabel"),
            "start": pick.get("start"),
            "stage": pick.get("stage"),
        }
        conn.execute(
            """
            INSERT INTO mlb_prop_predictions (
              prediction_date, model_name, rank, game_id, game_title, away_team, home_team,
              away_team_full, home_team_full, player_id, player_name, team_name, team_name_full,
              opponent_name, opponent_name_full, slot, prop_type, prop_label, market_label,
              line_threshold, confidence, probability, expected_value, recommendation_tier,
              metadata_json, raw_json
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(prediction_date, model_name, game_id, player_id, prop_type) DO UPDATE SET
              rank=excluded.rank,
              game_title=excluded.game_title,
              away_team=excluded.away_team,
              home_team=excluded.home_team,
              away_team_full=excluded.away_team_full,
              home_team_full=excluded.home_team_full,
              player_name=excluded.player_name,
              team_name=excluded.team_name,
              team_name_full=excluded.team_name_full,
              opponent_name=excluded.opponent_name,
              opponent_name_full=excluded.opponent_name_full,
              slot=excluded.slot,
              prop_label=excluded.prop_label,
              market_label=excluded.market_label,
              line_threshold=excluded.line_threshold,
              confidence=excluded.confidence,
              probability=excluded.probability,
              expected_value=excluded.expected_value,
              recommendation_tier=excluded.recommendation_tier,
              metadata_json=excluded.metadata_json,
              raw_json=excluded.raw_json
            """,
            (
                date_text,
                model_name,
                to_int(pick.get("rank")),
                pick.get("gameId"),
                pick.get("gameTitle"),
                pick.get("awayTeam"),
                pick.get("homeTeam"),
                pick.get("awayTeamFull"),
                pick.get("homeTeamFull"),
                to_int(pick.get("playerId")),
                pick.get("playerName"),
                pick.get("teamName"),
                pick.get("teamNameFull"),
                pick.get("opponentName"),
                pick.get("opponentNameFull"),
                to_int(pick.get("slot")),
                pick.get("propType"),
                pick.get("propLabel"),
                pick.get("marketLabel"),
                to_float(pick.get("lineThreshold")),
                to_int(pick.get("confidence")),
                to_float(pick.get("probability")),
                to_float(pick.get("expectedValue")),
                pick.get("recommendationTier"),
                json.dumps(metadata, sort_keys=True),
                json.dumps(pick, sort_keys=True),
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


def grade_prop_picks(
    conn: sqlite3.Connection, date_text: str, model_name: str, prop_type: str | None = None
) -> list[sqlite3.Row]:
    init_db(conn)
    params: list[Any] = [date_text, model_name]
    prop_type_sql = ""
    if prop_type:
        prop_type_sql = " AND p.prop_type = ?"
        params.append(prop_type)

    rows = conn.execute(
        f"""
        SELECT
          p.prediction_date,
          p.model_name,
          p.game_id,
          p.player_id,
          p.player_name,
          p.team_name,
          p.team_name_full,
          p.opponent_name,
          p.opponent_name_full,
          p.prop_type,
          p.market_label,
          p.line_threshold,
          p.confidence,
          p.probability,
          p.expected_value,
          p.recommendation_tier,
          p.metadata_json,
          b.game_pk,
          b.plate_appearances,
          b.at_bats,
          b.hits,
          b.singles,
          b.total_bases,
          b.rbi,
          b.walks,
          b.home_runs,
          s.story_tags_json,
          s.summary_json
        FROM mlb_prop_predictions p
        LEFT JOIN mlb_player_game_batting b
          ON b.game_date = p.prediction_date
         AND b.player_id = p.player_id
         AND b.team_name = COALESCE(p.team_name_full, p.team_name)
         AND b.opponent_name = COALESCE(p.opponent_name_full, p.opponent_name)
        LEFT JOIN mlb_game_story_signals s
          ON s.game_pk = b.game_pk
        WHERE p.prediction_date = ?
          AND p.model_name = ?
          {prop_type_sql}
        ORDER BY p.rank ASC, p.prop_type ASC, p.player_name ASC
        """,
        params,
    ).fetchall()

    for row in rows:
        actual_value = None
        if row["prop_type"] == "hits":
            actual_value = to_float(row["hits"])
        elif row["prop_type"] == "singles":
            actual_value = to_float(row["singles"])
        elif row["prop_type"] == "walks":
            actual_value = to_float(row["walks"])
        elif row["prop_type"] == "totalBases":
            actual_value = to_float(row["total_bases"])
        elif row["prop_type"] == "rbi":
            actual_value = to_float(row["rbi"])

        line_threshold = to_float(row["line_threshold"])
        hit_flag = int(actual_value is not None and line_threshold is not None and actual_value > line_threshold)
        result_label = (
            f"actual {actual_value:g} > line {line_threshold:g}"
            if actual_value is not None and line_threshold is not None
            else "actual stat unavailable"
        )

        result_metadata = {
            "plateAppearances": row["plate_appearances"],
            "atBats": row["at_bats"],
            "gamePk": row["game_pk"],
            "storyTags": json.loads(row["story_tags_json"] or "[]"),
            "storySummary": json.loads(row["summary_json"] or "{}"),
        }

        conn.execute(
            """
            INSERT INTO mlb_prop_backtests (
              prediction_date, model_name, game_id, player_id, player_name, team_name, team_name_full,
              opponent_name, opponent_name_full, prop_type, market_label, line_threshold, actual_value,
              hit_flag, result_label, metadata_json
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(prediction_date, model_name, game_id, player_id, prop_type) DO UPDATE SET
              player_name=excluded.player_name,
              team_name=excluded.team_name,
              team_name_full=excluded.team_name_full,
              opponent_name=excluded.opponent_name,
              opponent_name_full=excluded.opponent_name_full,
              market_label=excluded.market_label,
              line_threshold=excluded.line_threshold,
              actual_value=excluded.actual_value,
              hit_flag=excluded.hit_flag,
              result_label=excluded.result_label,
              metadata_json=excluded.metadata_json
            """,
            (
                row["prediction_date"],
                row["model_name"],
                row["game_id"],
                row["player_id"],
                row["player_name"],
                row["team_name"],
                row["team_name_full"],
                row["opponent_name"],
                row["opponent_name_full"],
                row["prop_type"],
                row["market_label"],
                to_float(row["line_threshold"]),
                actual_value,
                hit_flag,
                result_label,
                json.dumps(result_metadata, sort_keys=True),
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


def list_bullpen_usage(
    conn: sqlite3.Connection, date_text: str, team_name: str | None = None
) -> list[sqlite3.Row]:
    if team_name:
        return conn.execute(
            """
            SELECT *
            FROM mlb_bullpen_usage
            WHERE as_of_date = ? AND team_name = ?
            ORDER BY first_reliever_likelihood DESC, availability_score DESC
            """,
            (date_text, team_name),
        ).fetchall()
    return conn.execute(
        """
        SELECT *
        FROM mlb_bullpen_usage
        WHERE as_of_date = ?
        ORDER BY team_name, first_reliever_likelihood DESC, availability_score DESC
        """,
        (date_text,),
    ).fetchall()


def list_likely_relievers(
    conn: sqlite3.Connection, date_text: str, team_name: str | None = None
) -> list[sqlite3.Row]:
    if team_name:
        return conn.execute(
            """
            SELECT *
            FROM mlb_likely_relief_chains
            WHERE as_of_date = ? AND team_name = ?
            ORDER BY team_name, predicted_rank
            """,
            (date_text, team_name),
        ).fetchall()
    return conn.execute(
        """
        SELECT *
        FROM mlb_likely_relief_chains
        WHERE as_of_date = ?
        ORDER BY team_name, predicted_rank
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


def print_prop_backtest_summary(rows: list[sqlite3.Row]) -> None:
    print(f"Tracked props: {len(rows)}")
    if not rows:
        return

    stat_field_by_prop = {
        "hits": "hits",
        "singles": "singles",
        "walks": "walks",
        "totalBases": "total_bases",
        "rbi": "rbi",
    }

    grouped: dict[str, list[sqlite3.Row]] = {}
    for row in rows:
        grouped.setdefault(row["prop_type"], []).append(row)

    for prop_type, prop_rows in sorted(grouped.items()):
        stat_field = stat_field_by_prop.get(prop_type)
        hits = 0
        for row in prop_rows:
            line_threshold = to_float(row["line_threshold"])
            actual_value = to_float(row[stat_field]) if stat_field else None
            if actual_value is not None and line_threshold is not None and actual_value > line_threshold:
                hits += 1
        print(f"- {prop_type}: {hits}/{len(prop_rows)}")


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


def print_bullpen_usage(rows: list[sqlite3.Row]) -> None:
    print(f"Bullpen usage rows: {len(rows)}")
    for row in rows:
        print(
            f"- {row['team_name']} | {row['pitcher_name']} | role {row['likely_role']} | "
            f"last3 app {row['appearances_last3']} | pitches {row['pitches_last3']} | "
            f"days rest {row['days_since_last_appearance']} | availability {row['availability_score']} | "
            f"bridge {row['bridge_score']} | first-reliever {row['first_reliever_likelihood']}"
        )


def print_likely_relievers(rows: list[sqlite3.Row]) -> None:
    print(f"Likely reliever rows: {len(rows)}")
    for row in rows:
        print(
            f"- {row['team_name']} vs {row['opponent_name']} | #{row['predicted_rank']} {row['pitcher_name']} "
            f"({row['likely_role']}) | first-reliever {row['first_reliever_likelihood']} | "
            f"availability {row['availability_score']} | expected outs {row['expected_outs']}"
        )


def list_probable_starters_snapshot(date_text: str) -> list[dict[str, Any]]:
    schedule_url = MLB_SCHEDULE_URL.format(date=date_text)
    schedule_payload = json.loads(fetch_text(schedule_url))
    season = datetime.strptime(date_text, "%Y-%m-%d").year
    rows: list[dict[str, Any]] = []

    for game in schedule_payload.get("dates", [{}])[0].get("games", []):
        away = game["teams"]["away"]["team"]["name"]
        home = game["teams"]["home"]["team"]["name"]
        away_probable = game["teams"]["away"].get("probablePitcher") or {}
        home_probable = game["teams"]["home"].get("probablePitcher") or {}
        away_details = fetch_pitcher_season_snapshot(to_int(away_probable.get("id")), season)
        home_details = fetch_pitcher_season_snapshot(to_int(home_probable.get("id")), season)
        rows.append(
            {
                "game_date": date_text,
                "game_datetime": game.get("gameDate"),
                "game_title": f"{away} @ {home}",
                "venue_name": (game.get("venue") or {}).get("name"),
                "away_team": away,
                "home_team": home,
                "away_pitcher_name": away_probable.get("fullName") or "TBD",
                "away_pitcher_hand": away_details.get("pitch_hand") or "",
                "away_pitcher_wins": away_details.get("wins"),
                "away_pitcher_losses": away_details.get("losses"),
                "away_pitcher_era": away_details.get("era"),
                "away_pitcher_strikeouts": away_details.get("strikeouts"),
                "home_pitcher_name": home_probable.get("fullName") or "TBD",
                "home_pitcher_hand": home_details.get("pitch_hand") or "",
                "home_pitcher_wins": home_details.get("wins"),
                "home_pitcher_losses": home_details.get("losses"),
                "home_pitcher_era": home_details.get("era"),
                "home_pitcher_strikeouts": home_details.get("strikeouts"),
            }
        )

    return rows


def print_probable_starters(rows: list[dict[str, Any]]) -> None:
    print(f"Official probable starter rows: {len(rows)}")
    for row in rows:
        away_record = f"{row['away_pitcher_wins']}-{row['away_pitcher_losses']}" if row["away_pitcher_wins"] is not None and row["away_pitcher_losses"] is not None else "-"
        home_record = f"{row['home_pitcher_wins']}-{row['home_pitcher_losses']}" if row["home_pitcher_wins"] is not None and row["home_pitcher_losses"] is not None else "-"
        away_era = row["away_pitcher_era"] if row["away_pitcher_era"] not in (None, "") else "-"
        home_era = row["home_pitcher_era"] if row["home_pitcher_era"] not in (None, "") else "-"
        away_so = row["away_pitcher_strikeouts"] if row["away_pitcher_strikeouts"] is not None else "-"
        home_so = row["home_pitcher_strikeouts"] if row["home_pitcher_strikeouts"] is not None else "-"
        print(
            f"- {row['game_title']} | {row['away_pitcher_name']} ({row['away_pitcher_hand'] or '-'}) "
            f"{away_record}, {away_era} ERA, {away_so} SO vs "
            f"{row['home_pitcher_name']} ({row['home_pitcher_hand'] or '-'}) {home_record}, {home_era} ERA, {home_so} SO"
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

    prep_day = subparsers.add_parser(
        "prepare-mlb-day",
        help="Ingest the target MLB day plus a recent lookback window, then refresh rolling/bullpen features.",
    )
    prep_day.add_argument("--date", required=True, help="Target date in YYYY-MM-DD format.")
    prep_day.add_argument(
        "--lookback-days",
        type=int,
        default=3,
        help="How many prior days to ingest for bullpen/workload context. Defaults to 3.",
    )

    derive = subparsers.add_parser(
        "derive-mlb-features",
        help="Refresh rolling team and starter form tables for games up to a date.",
    )
    derive.add_argument("--through-date", help="Optional YYYY-MM-DD cutoff. Defaults to every loaded date.")

    derive_stories = subparsers.add_parser(
        "derive-story-signals",
        help="Refresh experimental MLB story-signal rows from stored plate-appearance and pitch-event data.",
    )
    derive_stories.add_argument("--through-date", help="Optional YYYY-MM-DD cutoff. Defaults to every loaded date.")

    derive_tier2 = subparsers.add_parser(
        "derive-tier2-features",
        help="Refresh Tier 2 team-story, lineup-dependency, starter-leash, and series-context tables.",
    )
    derive_tier2.add_argument("--through-date", help="Optional YYYY-MM-DD cutoff. Defaults to every loaded date.")

    derive_tier3 = subparsers.add_parser(
        "derive-tier3-features",
        help="Refresh Tier 3 reliever first-batter command and starter third-time-through profile tables.",
    )
    derive_tier3.add_argument("--through-date", help="Optional YYYY-MM-DD cutoff. Defaults to every loaded date.")
    derive_tier3.add_argument(
        "--as-of-date",
        help="Optional single as-of date to rebuild incrementally without touching earlier Tier 3 rows.",
    )

    ingest_hr = subparsers.add_parser(
        "ingest-statcast-hr",
        help="Fetch and store a Statcast home-run leaderboard snapshot for a season.",
    )
    ingest_hr.add_argument("--date", required=True, help="Snapshot date in YYYY-MM-DD format.")
    ingest_hr.add_argument("--season", required=True, type=int, help="Season year.")

    import_picks = subparsers.add_parser("import-predictions", help="Import a saved HR prediction snapshot JSON file.")
    import_picks.add_argument("--file", required=True, help="Path to the JSON prediction file.")

    import_prop_picks = subparsers.add_parser(
        "import-prop-predictions", help="Import a saved non-HR player-prop prediction snapshot JSON file."
    )
    import_prop_picks.add_argument("--file", required=True, help="Path to the JSON prediction file.")

    grade = subparsers.add_parser("grade-home-run-picks", help="Compare stored predictions against actual HR events.")
    grade.add_argument("--date", required=True, help="Prediction date in YYYY-MM-DD format.")
    grade.add_argument("--model-name", required=True, help="Model name stored in the prediction snapshot.")

    grade_props = subparsers.add_parser(
        "grade-prop-picks", help="Compare stored non-HR player props against actual batting boxscores."
    )
    grade_props.add_argument("--date", required=True, help="Prediction date in YYYY-MM-DD format.")
    grade_props.add_argument("--model-name", required=True, help="Model name stored in the prediction snapshot.")
    grade_props.add_argument("--prop-type", help="Optional prop type filter, e.g. hits, totalBases, rbi, walks, singles.")

    list_events = subparsers.add_parser("list-home-runs", help="Print all actual home runs stored for a date.")
    list_events.add_argument("--date", required=True, help="Date in YYYY-MM-DD format.")

    list_f5 = subparsers.add_parser("list-first5", help="Print first-five outcomes stored for a date.")
    list_f5.add_argument("--date", required=True, help="Date in YYYY-MM-DD format.")

    list_bullpen = subparsers.add_parser(
        "list-bullpen-usage", help="Print bullpen workload and availability rows for a date."
    )
    list_bullpen.add_argument("--date", required=True, help="Date in YYYY-MM-DD format.")
    list_bullpen.add_argument("--team", help="Optional team name filter.")

    list_relievers = subparsers.add_parser(
        "list-likely-relievers", help="Print the likely first two relievers for scheduled teams on a date."
    )
    list_relievers.add_argument("--date", required=True, help="Date in YYYY-MM-DD format.")
    list_relievers.add_argument("--team", help="Optional team name filter.")

    list_probables = subparsers.add_parser(
        "list-probable-starters",
        help="Print the official MLB probable starters for a date from the schedule API.",
    )
    list_probables.add_argument("--date", required=True, help="Date in YYYY-MM-DD format.")

    list_stories = subparsers.add_parser("list-story-signals", help="Print derived story signals for a date.")
    list_stories.add_argument("--date", required=True, help="Date in YYYY-MM-DD format.")

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

        if args.command == "prepare-mlb-day":
            target_date = datetime.strptime(args.date, "%Y-%m-%d").date()
            start_date = (target_date - timedelta(days=args.lookback_days)).isoformat()
            ingest_mlb_date_range(conn, start_date, args.date)
            refresh_rolling_form(conn, args.date)
            print(
                f"Prepared MLB prediction context for {args.date} using lookback window {start_date} through {args.date}"
            )
            return

        if args.command == "derive-mlb-features":
            refresh_rolling_form(conn, args.through_date)
            if args.through_date:
                print(f"Refreshed rolling MLB team/starter form through {args.through_date}")
            else:
                print("Refreshed rolling MLB team/starter form for all loaded dates")
            return

        if args.command == "derive-story-signals":
            refresh_story_signals(conn, args.through_date)
            if args.through_date:
                print(f"Refreshed MLB story signals through {args.through_date}")
            else:
                print("Refreshed MLB story signals for all loaded dates")
            return

        if args.command == "derive-tier2-features":
            refresh_tier2_profiles(conn, args.through_date)
            if args.through_date:
                print(f"Refreshed MLB Tier 2 feature tables through {args.through_date}")
            else:
                print("Refreshed MLB Tier 2 feature tables for all loaded dates")
            return

        if args.command == "derive-tier3-features":
            refresh_tier3_profiles(conn, args.through_date, args.as_of_date)
            if args.as_of_date:
                print(f"Refreshed MLB Tier 3 feature tables for {args.as_of_date}")
            elif args.through_date:
                print(f"Refreshed MLB Tier 3 feature tables through {args.through_date}")
            else:
                print("Refreshed MLB Tier 3 feature tables for all loaded dates")
            return

        if args.command == "ingest-statcast-hr":
            ingest_statcast_hr_leaderboard(conn, args.date, args.season)
            print(f"Ingested Statcast HR leaderboard for {args.season} using snapshot date {args.date}")
            return

        if args.command == "import-predictions":
            import_predictions(conn, Path(args.file))
            print(f"Imported predictions from {args.file}")
            return

        if args.command == "import-prop-predictions":
            import_prop_predictions(conn, Path(args.file))
            print(f"Imported prop predictions from {args.file}")
            return

        if args.command == "grade-home-run-picks":
            rows = grade_home_run_picks(conn, args.date, args.model_name)
            print_backtest_summary(rows)
            return

        if args.command == "grade-prop-picks":
            rows = grade_prop_picks(conn, args.date, args.model_name, args.prop_type)
            print_prop_backtest_summary(rows)
            return

        if args.command == "list-home-runs":
            rows = list_home_runs(conn, args.date)
            print_home_run_list(rows)
            return

        if args.command == "list-first5":
            rows = list_first5_outcomes(conn, args.date)
            print_first5_outcomes(rows)
            return

        if args.command == "list-bullpen-usage":
            rows = list_bullpen_usage(conn, args.date, args.team)
            print_bullpen_usage(rows)
            return

        if args.command == "list-likely-relievers":
            rows = list_likely_relievers(conn, args.date, args.team)
            print_likely_relievers(rows)
            return

        if args.command == "list-probable-starters":
            rows = list_probable_starters_snapshot(args.date)
            print_probable_starters(rows)
            return

        if args.command == "list-story-signals":
            rows = list_story_signals(conn, args.date)
            print_story_signals(rows)
            return


if __name__ == "__main__":
    main()
