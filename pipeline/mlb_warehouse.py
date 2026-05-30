#!/usr/bin/env python3

from __future__ import annotations

import argparse
import csv
import gzip
import hashlib
import io
import json
import re
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
HISTORY_DIR = DATA_DIR / "history"
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
BREF_WAR_DAILY_PITCH_URL = "https://www.baseball-reference.com/data/war_daily_pitch.txt"
STATCAST_HOME_RUNS_CSV_URL = (
    "https://baseballsavant.mlb.com/leaderboard/home-runs"
    "?year={season}&player_type=Batter&cat=xhr&team=&min=0&csv=true"
)
STATCAST_HITTER_GAME_SEARCH_CSV_URL = (
    "https://baseballsavant.mlb.com/statcast_search/csv"
    "?all=true&player_type=batter&group_by=name-date&sort_col=player_name&sort_order=asc"
    "&game_date_gt={start_date}&game_date_lt={end_date}"
)
STATCAST_HITTER_DETAIL_SEARCH_CSV_URL = (
    "https://baseballsavant.mlb.com/statcast_search/csv"
    "?all=true&player_type=batter&type=details&sort_col=player_name&sort_order=asc"
    "&game_date_gt={start_date}&game_date_lt={end_date}"
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

TEAM_MARKET_ALIASES = {
    "braves": "Atlanta Braves",
    "orioles": "Baltimore Orioles",
    "red sox": "Boston Red Sox",
    "boston red sox": "Boston Red Sox",
    "cubs": "Chicago Cubs",
    "chicago cubs": "Chicago Cubs",
    "reds": "Cincinnati Reds",
    "cincinnati reds": "Cincinnati Reds",
    "guardians": "Cleveland Guardians",
    "cleveland guardians": "Cleveland Guardians",
    "rockies": "Colorado Rockies",
    "colorado rockies": "Colorado Rockies",
    "white sox": "Chicago White Sox",
    "chicago white sox": "Chicago White Sox",
    "tigers": "Detroit Tigers",
    "detroit tigers": "Detroit Tigers",
    "astros": "Houston Astros",
    "houston astros": "Houston Astros",
    "royals": "Kansas City Royals",
    "kansas city royals": "Kansas City Royals",
    "angels": "Los Angeles Angels",
    "los angeles angels": "Los Angeles Angels",
    "dodgers": "Los Angeles Dodgers",
    "los angeles dodgers": "Los Angeles Dodgers",
    "marlins": "Miami Marlins",
    "miami marlins": "Miami Marlins",
    "brewers": "Milwaukee Brewers",
    "milwaukee brewers": "Milwaukee Brewers",
    "twins": "Minnesota Twins",
    "minnesota twins": "Minnesota Twins",
    "mets": "New York Mets",
    "new york mets": "New York Mets",
    "yankees": "New York Yankees",
    "new york yankees": "New York Yankees",
    "athletics": "Athletics",
    "a s": "Athletics",
    "as": "Athletics",
    "phillies": "Philadelphia Phillies",
    "philadelphia phillies": "Philadelphia Phillies",
    "pirates": "Pittsburgh Pirates",
    "pittsburgh pirates": "Pittsburgh Pirates",
    "padres": "San Diego Padres",
    "san diego padres": "San Diego Padres",
    "mariners": "Seattle Mariners",
    "seattle mariners": "Seattle Mariners",
    "giants": "San Francisco Giants",
    "san francisco giants": "San Francisco Giants",
    "cardinals": "St. Louis Cardinals",
    "st louis cardinals": "St. Louis Cardinals",
    "rays": "Tampa Bay Rays",
    "tampa bay rays": "Tampa Bay Rays",
    "rangers": "Texas Rangers",
    "texas rangers": "Texas Rangers",
    "blue jays": "Toronto Blue Jays",
    "toronto blue jays": "Toronto Blue Jays",
    "nationals": "Washington Nationals",
    "washington nationals": "Washington Nationals",
    "d backs": "Arizona Diamondbacks",
    "dbacks": "Arizona Diamondbacks",
    "diamondbacks": "Arizona Diamondbacks",
    "arizona diamondbacks": "Arizona Diamondbacks",
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

CREATE TABLE IF NOT EXISTS mlb_pitcher_war_by_season (
  season INTEGER NOT NULL,
  pitcher_id INTEGER NOT NULL,
  pitcher_name TEXT,
  bref_player_id TEXT,
  team_ids TEXT,
  games INTEGER,
  games_started INTEGER,
  war REAL,
  fetched_at TEXT NOT NULL,
  source TEXT,
  PRIMARY KEY (season, pitcher_id)
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

CREATE TABLE IF NOT EXISTS mlb_batter_game_outcomes (
  game_pk INTEGER NOT NULL,
  game_date TEXT NOT NULL,
  team_role TEXT NOT NULL,
  team_name TEXT NOT NULL,
  opponent_name TEXT NOT NULL,
  player_id INTEGER NOT NULL,
  player_name TEXT NOT NULL,
  batting_order INTEGER,
  plate_appearances INTEGER,
  at_bats INTEGER,
  runs INTEGER,
  hits INTEGER,
  rbi INTEGER,
  hit_run_rbi_total INTEGER,
  singles INTEGER,
  doubles INTEGER,
  triples INTEGER,
  home_runs INTEGER,
  total_bases INTEGER,
  walks INTEGER,
  strikeouts INTEGER,
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

CREATE TABLE IF NOT EXISTS mlb_team_bullpen_shape_daily (
  as_of_date TEXT NOT NULL,
  team_name TEXT NOT NULL,
  scheduled_opponent TEXT,
  games_sample_last3 INTEGER NOT NULL,
  games_sample_last5 INTEGER NOT NULL,
  games_sample_last10 INTEGER NOT NULL,
  relievers_used_avg_last3 REAL,
  relievers_used_avg_last5 REAL,
  relievers_used_avg_last10 REAL,
  relievers_used_max_last10 INTEGER,
  first_reliever_outs_avg_last3 REAL,
  first_reliever_outs_avg_last5 REAL,
  first_reliever_outs_avg_last10 REAL,
  first_reliever_outs_volatility_last10 REAL,
  total_relief_outs_avg_last5 REAL,
  total_relief_outs_avg_last10 REAL,
  total_relief_runs_allowed_avg_last5 REAL,
  total_relief_runs_allowed_avg_last10 REAL,
  short_first_up_rate_last5 REAL,
  short_first_up_rate_last10 REAL,
  bulk_first_up_rate_last5 REAL,
  bulk_first_up_rate_last10 REAL,
  two_reliever_containment_rate_last5 REAL,
  two_reliever_containment_rate_last10 REAL,
  four_plus_reliever_rate_last5 REAL,
  four_plus_reliever_rate_last10 REAL,
  six_plus_reliever_scramble_rate_last10 REAL,
  bullpen_shape_index REAL,
  raw_json TEXT,
  PRIMARY KEY (as_of_date, team_name)
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

CREATE TABLE IF NOT EXISTS mlb_team_whiff_persistence_profiles (
  as_of_date TEXT NOT NULL,
  team_name TEXT NOT NULL,
  window_games INTEGER NOT NULL,
  games_sample INTEGER NOT NULL,
  early_two_inning_pa_per_game REAL,
  early_two_inning_strikeout_rate REAL,
  early_two_inning_whiff_rate REAL,
  games_with_early_whiff_flag INTEGER NOT NULL,
  early_whiff_flag_rate REAL,
  early_whiff_persist_rate REAL,
  early_whiff_rebound_rate REAL,
  avg_rest_of_game_runs_after_whiff REAL,
  avg_rest_of_game_hits_after_whiff REAL,
  avg_rest_of_game_strikeout_rate_after_whiff REAL,
  avg_rest_of_game_runs_without_whiff REAL,
  avg_rest_of_game_hits_without_whiff REAL,
  whiff_persistence_index REAL,
  whiff_rebound_index REAL,
  PRIMARY KEY (as_of_date, team_name, window_games)
);

CREATE TABLE IF NOT EXISTS mlb_team_lead_surrender_profiles (
  as_of_date TEXT NOT NULL,
  team_name TEXT NOT NULL,
  window_games INTEGER NOT NULL,
  games_sample INTEGER NOT NULL,
  led_after5_rate REAL,
  led_after7_rate REAL,
  trailed_after5_rate REAL,
  trailed_after7_rate REAL,
  lead_after5_conversion_rate REAL,
  lead_after7_conversion_rate REAL,
  blew_lead_after5_rate REAL,
  blew_lead_after7_rate REAL,
  comeback_after5_rate REAL,
  comeback_after7_rate REAL,
  one_run_lead_hold_rate REAL,
  avg_runs_allowed_after_leading5 REAL,
  avg_runs_scored_when_trailing5 REAL,
  lead_surrender_index REAL,
  comeback_resilience_index REAL,
  PRIMARY KEY (as_of_date, team_name, window_games)
);

CREATE TABLE IF NOT EXISTS mlb_team_form_carryover_profiles (
  as_of_date TEXT NOT NULL,
  team_name TEXT NOT NULL,
  window_games INTEGER NOT NULL,
  transitions_sample INTEGER NOT NULL,
  after_win_next_win_rate REAL,
  after_loss_bounce_rate REAL,
  after_blowout_win_next_win_rate REAL,
  after_blowout_loss_bounce_rate REAL,
  after_comeback_win_next_win_rate REAL,
  after_bullpen_flip_loss_bounce_rate REAL,
  series_game2_win_rate REAL,
  series_game3plus_win_rate REAL,
  hot_streak_hold_rate REAL,
  hot_streak_break_rate REAL,
  cold_streak_continue_rate REAL,
  cold_streak_bounce_rate REAL,
  avg_next_game_run_diff_after_win REAL,
  avg_next_game_run_diff_after_loss REAL,
  carryover_instability_index REAL,
  bounceback_index REAL,
  PRIMARY KEY (as_of_date, team_name, window_games)
);

CREATE TABLE IF NOT EXISTS mlb_team_state_snapshots (
  as_of_date TEXT NOT NULL,
  team_name TEXT NOT NULL,
  scheduled_opponent TEXT,
  scheduled_series_game_number INTEGER,
  division_matchup_flag INTEGER,
  games_sample INTEGER NOT NULL,
  previous_result TEXT,
  streak_direction TEXT,
  streak_length INTEGER,
  win_pct_last3 REAL,
  win_pct_last5 REAL,
  run_diff_last3 REAL,
  run_diff_last5 REAL,
  close_loss_count_last5 INTEGER,
  blowout_win_count_last5 INTEGER,
  blowout_loss_count_last5 INTEGER,
  comeback_win_count_last5 INTEGER,
  bullpen_flip_loss_count_last5 INTEGER,
  quiet_first5_count_last5 INTEGER,
  first_inning_jolt_count_last5 INTEGER,
  opponent_win_pct_last5 REAL,
  snapback_pressure_index REAL,
  heat_regression_index REAL,
  form_pressure_index REAL,
  PRIMARY KEY (as_of_date, team_name)
);

CREATE TABLE IF NOT EXISTS mlb_team_market_context_daily (
  as_of_date TEXT NOT NULL,
  team_name TEXT NOT NULL,
  scheduled_opponent TEXT,
  games_sample_last5 INTEGER NOT NULL,
  games_sample_last10 INTEGER NOT NULL,
  moneyline_games_with_odds_last5 INTEGER NOT NULL,
  moneyline_games_with_odds_last10 INTEGER NOT NULL,
  favorite_rate_last5 REAL,
  favorite_rate_last10 REAL,
  underdog_rate_last5 REAL,
  underdog_rate_last10 REAL,
  favorite_hold_rate_last5 REAL,
  favorite_hold_rate_last10 REAL,
  underdog_upset_rate_last5 REAL,
  underdog_upset_rate_last10 REAL,
  totals_games_with_lines_last5 INTEGER NOT NULL,
  totals_games_with_lines_last10 INTEGER NOT NULL,
  over_rate_last5 REAL,
  over_rate_last10 REAL,
  under_rate_last5 REAL,
  under_rate_last10 REAL,
  push_rate_last5 REAL,
  push_rate_last10 REAL,
  avg_total_runs_minus_line_last5 REAL,
  avg_total_runs_minus_line_last10 REAL,
  market_volatility_index REAL,
  PRIMARY KEY (as_of_date, team_name)
);

CREATE TABLE IF NOT EXISTS mlb_team_opponent_quality_daily (
  as_of_date TEXT NOT NULL,
  team_name TEXT NOT NULL,
  scheduled_opponent TEXT,
  games_sample_last5 INTEGER NOT NULL,
  games_sample_last10 INTEGER NOT NULL,
  avg_opponent_season_win_pct_last5 REAL,
  avg_opponent_season_win_pct_last10 REAL,
  avg_opponent_recent10_win_pct_last5 REAL,
  avg_opponent_recent10_win_pct_last10 REAL,
  avg_opponent_recent10_run_diff_last5 REAL,
  avg_opponent_recent10_run_diff_last10 REAL,
  games_vs_winning_record_last5 INTEGER NOT NULL,
  games_vs_winning_record_last10 INTEGER NOT NULL,
  games_vs_550_last5 INTEGER NOT NULL,
  games_vs_550_last10 INTEGER NOT NULL,
  win_rate_vs_winning_record_last10 REAL,
  win_rate_vs_550_last10 REAL,
  close_losses_vs_winning_record_last10 INTEGER NOT NULL,
  schedule_toughness_index_last5 REAL,
  schedule_toughness_index_last10 REAL,
  PRIMARY KEY (as_of_date, team_name)
);

CREATE TABLE IF NOT EXISTS mlb_hitter_state_snapshots (
  as_of_date TEXT NOT NULL,
  team_name TEXT NOT NULL,
  player_id INTEGER NOT NULL,
  player_name TEXT NOT NULL,
  games_sample INTEGER NOT NULL,
  days_since_last_game INTEGER,
  batting_order_avg_last5 REAL,
  hit_streak_games INTEGER,
  hitless_streak_games INTEGER,
  multi_hit_games_last5 INTEGER,
  multi_tb_games_last5 INTEGER,
  home_run_streak_games INTEGER,
  hits_per_pa_last5 REAL,
  total_bases_per_pa_last5 REAL,
  strikeout_rate_last5 REAL,
  walk_rate_last5 REAL,
  whiff_rate_last5 REAL,
  pressure_plate_index REAL,
  cold_streak_index REAL,
  heat_regression_index REAL,
  PRIMARY KEY (as_of_date, player_id)
);

CREATE TABLE IF NOT EXISTS mlb_hitter_classic_trend_snapshots (
  as_of_date TEXT NOT NULL,
  team_name TEXT NOT NULL,
  player_id INTEGER NOT NULL,
  player_name TEXT NOT NULL,
  days_since_last_game INTEGER,
  games_sample_last10 INTEGER NOT NULL,
  pa_sample_last10 INTEGER NOT NULL,
  batting_order_avg_last10 REAL,
  multi_hit_games_last10 INTEGER,
  multi_tb_games_last10 INTEGER,
  home_run_games_last10 INTEGER,
  hits_per_pa_last10 REAL,
  total_bases_per_pa_last10 REAL,
  strikeout_rate_last10 REAL,
  walk_rate_last10 REAL,
  whiff_rate_last10 REAL,
  hits_per_pa_last5_minus_last10 REAL,
  total_bases_per_pa_last5_minus_last10 REAL,
  strikeout_rate_last5_minus_last10 REAL,
  PRIMARY KEY (as_of_date, player_id)
);

CREATE TABLE IF NOT EXISTS mlb_hitter_opponent_context_snapshots (
  as_of_date TEXT NOT NULL,
  team_name TEXT NOT NULL,
  player_id INTEGER NOT NULL,
  player_name TEXT NOT NULL,
  games_sample_last10 INTEGER NOT NULL,
  avg_opponent_win_pct_last5_last10 REAL,
  avg_opponent_run_diff_last5_last10 REAL,
  avg_opponent_run_diff_per_game_last10 REAL,
  games_vs_winning_last10 INTEGER,
  games_vs_positive_run_diff_last10 INTEGER,
  pa_vs_winning_last10 INTEGER,
  hits_per_pa_vs_winning_last10 REAL,
  total_bases_per_pa_vs_winning_last10 REAL,
  weighted_hits_per_pa_last10 REAL,
  weighted_total_bases_per_pa_last10 REAL,
  hits_per_pa_weight_delta_last10 REAL,
  total_bases_per_pa_weight_delta_last10 REAL,
  PRIMARY KEY (as_of_date, player_id)
);

CREATE TABLE IF NOT EXISTS mlb_hitter_statcast_game_logs (
  game_date TEXT NOT NULL,
  game_pk INTEGER NOT NULL,
  player_id INTEGER NOT NULL,
  player_name TEXT NOT NULL,
  team_name TEXT,
  opponent_name TEXT,
  plate_appearances INTEGER,
  at_bats INTEGER,
  hits INTEGER,
  singles INTEGER,
  doubles INTEGER,
  triples INTEGER,
  home_runs INTEGER,
  strikeouts INTEGER,
  walks INTEGER,
  batted_ball_events INTEGER,
  hard_hit_events INTEGER,
  sweet_spot_events INTEGER,
  barrels_total INTEGER,
  batting_average REAL,
  slugging REAL,
  woba REAL,
  xwoba REAL,
  xba REAL,
  xobp REAL,
  xslg REAL,
  avg_launch_speed REAL,
  avg_launch_angle REAL,
  avg_bat_speed REAL,
  avg_swing_length REAL,
  hard_hit_percent REAL,
  sweet_spot_percent REAL,
  barrel_bbe_percent REAL,
  barrel_pa_percent REAL,
  source_json TEXT,
  PRIMARY KEY (game_pk, player_id)
);

CREATE TABLE IF NOT EXISTS mlb_hitter_statcast_trend_snapshots (
  as_of_date TEXT NOT NULL,
  team_name TEXT NOT NULL,
  player_id INTEGER NOT NULL,
  player_name TEXT NOT NULL,
  games_sample_7 INTEGER,
  games_sample_14 INTEGER,
  games_sample_30 INTEGER,
  pa_sample_7 INTEGER,
  pa_sample_14 INTEGER,
  pa_sample_30 INTEGER,
  bbe_sample_7 INTEGER,
  bbe_sample_14 INTEGER,
  bbe_sample_30 INTEGER,
  rolling_7_xwoba REAL,
  rolling_14_xwoba REAL,
  rolling_30_xwoba REAL,
  rolling_7_xba REAL,
  rolling_14_xba REAL,
  rolling_30_xba REAL,
  rolling_7_xslg REAL,
  rolling_14_xslg REAL,
  rolling_30_xslg REAL,
  rolling_7_barrel_pct REAL,
  rolling_14_barrel_pct REAL,
  rolling_30_barrel_pct REAL,
  rolling_7_hard_hit_pct REAL,
  rolling_14_hard_hit_pct REAL,
  rolling_30_hard_hit_pct REAL,
  rolling_7_sweet_spot_pct REAL,
  rolling_14_sweet_spot_pct REAL,
  rolling_30_sweet_spot_pct REAL,
  xwoba_trend_7_minus_30 REAL,
  barrel_trend_7_minus_30 REAL,
  hard_hit_trend_7_minus_30 REAL,
  sweet_spot_trend_7_minus_30 REAL,
  PRIMARY KEY (as_of_date, player_id)
);

CREATE TABLE IF NOT EXISTS mlb_team_mistake_shape_daily (
  as_of_date TEXT NOT NULL,
  team_name TEXT NOT NULL,
  scheduled_opponent TEXT,
  scheduled_series_game_number INTEGER,
  division_matchup_flag INTEGER,
  window_games INTEGER NOT NULL,
  games_sample INTEGER NOT NULL,
  road_games_sample INTEGER NOT NULL,
  low_scoring_game_rate REAL,
  high_scoring_game_rate REAL,
  scoreless_first3_rate REAL,
  first_inning_run_allowed_rate REAL,
  early_multi_run_allowed_rate REAL,
  one_big_inning_rate REAL,
  one_bad_inning_allowed_rate REAL,
  traffic_game_rate REAL,
  dead_bat_traffic_rate REAL,
  traffic_no_conversion_rate REAL,
  base_runner_conversion_rate REAL,
  stranded_traffic_rate REAL,
  top_order_pressure_no_conversion_rate REAL,
  bullpen_meltdown_rate REAL,
  run_clustering_index REAL,
  mistake_chaos_index REAL,
  PRIMARY KEY (as_of_date, team_name, window_games)
);

CREATE TABLE IF NOT EXISTS mlb_pitcher_mistake_shape_daily (
  as_of_date TEXT NOT NULL,
  pitcher_id INTEGER NOT NULL,
  pitcher_name TEXT NOT NULL,
  team_name TEXT NOT NULL,
  scheduled_opponent TEXT,
  window_starts INTEGER NOT NULL,
  starts_sample INTEGER NOT NULL,
  starts_reaching_sixth INTEGER NOT NULL,
  starts_with_damage INTEGER NOT NULL,
  first_batter_reach_rate REAL,
  first_inning_run_allowed_rate REAL,
  first_three_runs_allowed_per_start REAL,
  early_clean_start_rate REAL,
  meltdown_start_rate REAL,
  walk_burst_start_rate REAL,
  home_run_start_rate REAL,
  sixth_inning_damage_rate REAL,
  post_damage_recovery_rate REAL,
  command_break_index REAL,
  PRIMARY KEY (as_of_date, pitcher_id, window_starts)
);

CREATE TABLE IF NOT EXISTS mlb_bullpen_mistake_shape_daily (
  as_of_date TEXT NOT NULL,
  team_name TEXT NOT NULL,
  scheduled_opponent TEXT,
  window_days INTEGER NOT NULL,
  appearances_sample INTEGER NOT NULL,
  games_sample INTEGER NOT NULL,
  first_batter_reach_rate REAL,
  first_batter_walk_rate REAL,
  meltdown_appearance_rate REAL,
  home_run_appearance_rate REAL,
  inherited_traffic_entry_rate REAL,
  inherited_traffic_score_rate REAL,
  bullpen_meltdown_game_rate REAL,
  lead_loss_after_entry_rate REAL,
  bridge_clean_game_rate REAL,
  bullpen_chaos_index REAL,
  PRIMARY KEY (as_of_date, team_name, window_days)
);

CREATE TABLE IF NOT EXISTS mlb_lineup_conversion_shape_daily (
  as_of_date TEXT NOT NULL,
  team_name TEXT NOT NULL,
  scheduled_opponent TEXT,
  scheduled_series_game_number INTEGER,
  division_matchup_flag INTEGER,
  window_games INTEGER NOT NULL,
  games_sample INTEGER NOT NULL,
  baserunners_per_game REAL,
  runs_per_baserunner REAL,
  stranded_traffic_rate REAL,
  early_baserunners_per_game REAL,
  early_conversion_rate REAL,
  top_order_baserunners_first3_per_game REAL,
  top_order_conversion_share REAL,
  traffic_no_conversion_rate REAL,
  dead_bat_traffic_rate REAL,
  quiet_first5_rate REAL,
  conversion_volatility REAL,
  lineup_conversion_index REAL,
  PRIMARY KEY (as_of_date, team_name, window_games)
);

CREATE TABLE IF NOT EXISTS mlb_team_first_inning_profiles_daily (
  as_of_date TEXT NOT NULL,
  team_name TEXT NOT NULL,
  scheduled_opponent TEXT,
  scheduled_series_game_number INTEGER,
  division_matchup_flag INTEGER,
  window_games INTEGER NOT NULL,
  games_sample INTEGER NOT NULL,
  road_games_sample INTEGER NOT NULL,
  first_inning_runs_per_game REAL,
  first_inning_runs_allowed_per_game REAL,
  scored_first_inning_rate REAL,
  scoreless_first_inning_rate REAL,
  allowed_first_inning_rate REAL,
  first_inning_multi_run_rate REAL,
  first_inning_multi_run_allowed_rate REAL,
  nrfi_game_rate REAL,
  yrfi_game_rate REAL,
  first_inning_net_edge REAL,
  first_inning_scoring_index REAL,
  first_inning_allow_risk_index REAL,
  PRIMARY KEY (as_of_date, team_name, window_games)
);

CREATE TABLE IF NOT EXISTS mlb_pitcher_first_inning_profiles_daily (
  as_of_date TEXT NOT NULL,
  pitcher_id INTEGER NOT NULL,
  pitcher_name TEXT NOT NULL,
  team_name TEXT NOT NULL,
  scheduled_opponent TEXT,
  window_starts INTEGER NOT NULL,
  starts_sample INTEGER NOT NULL,
  first_batter_reach_rate REAL,
  first_inning_run_allowed_rate REAL,
  first_inning_runs_allowed_per_start REAL,
  first_inning_multi_run_allowed_rate REAL,
  first_inning_baserunners_per_start REAL,
  first_inning_walk_rate REAL,
  first_inning_home_run_rate REAL,
  first_inning_clean_rate REAL,
  first_inning_pressure_index REAL,
  PRIMARY KEY (as_of_date, pitcher_id, window_starts)
);

CREATE TABLE IF NOT EXISTS mlb_game_story_labels (
  game_pk INTEGER PRIMARY KEY,
  game_date TEXT NOT NULL,
  away_team TEXT NOT NULL,
  home_team TEXT NOT NULL,
  winner_team TEXT,
  primary_story_label TEXT,
  early_phase_label TEXT,
  late_phase_label TEXT,
  scoring_shape_label TEXT,
  winner_path_label TEXT,
  story_tags_json TEXT,
  label_flags_json TEXT,
  summary_json TEXT
);

CREATE TABLE IF NOT EXISTS mlb_phase_outcomes_daily (
  game_pk INTEGER NOT NULL,
  game_date TEXT NOT NULL,
  team_name TEXT NOT NULL,
  opponent_team TEXT NOT NULL,
  team_role TEXT NOT NULL,
  result TEXT,
  runs_first1 INTEGER,
  runs_first3 INTEGER,
  runs_first5 INTEGER,
  runs_late INTEGER,
  hits_first5 INTEGER,
  hits_late INTEGER,
  scoreless_first3_flag INTEGER,
  scored_first_inning_flag INTEGER,
  allowed_first_inning_flag INTEGER,
  led_after3_flag INTEGER,
  trailed_after3_flag INTEGER,
  tied_after3_flag INTEGER,
  led_after5_flag INTEGER,
  trailed_after5_flag INTEGER,
  tied_after5_flag INTEGER,
  won_full_game_flag INTEGER,
  won_first5_flag INTEGER,
  first5_push_flag INTEGER,
  starter_survived5_flag INTEGER,
  starter_cracked_flag INTEGER,
  traffic_no_conversion_flag INTEGER,
  comeback_win_flag INTEGER,
  blew_lead_after5_flag INTEGER,
  bullpen_flip_game_flag INTEGER,
  phase_path_label TEXT,
  phase_flags_json TEXT,
  PRIMARY KEY (game_pk, team_name)
);

CREATE TABLE IF NOT EXISTS mlb_market_mispricing_labels (
  prediction_date TEXT NOT NULL,
  market_type TEXT NOT NULL,
  model_name TEXT NOT NULL,
  matchup TEXT NOT NULL,
  predicted_pick TEXT NOT NULL,
  opponent_team TEXT,
  confidence INTEGER,
  volatility INTEGER,
  point_edge REAL,
  market_american_odds INTEGER,
  market_probability REAL,
  opponent_market_american_odds INTEGER,
  opponent_market_probability REAL,
  market_favorite_team TEXT,
  market_favorite_probability REAL,
  market_price_gap REAL,
  pick_is_market_favorite INTEGER,
  pick_is_market_underdog INTEGER,
  hit_full_game INTEGER,
  hit_first5 INTEGER,
  first5_push_flag INTEGER,
  price_bucket_label TEXT,
  market_side_label TEXT,
  market_disagreement_win_flag INTEGER,
  expensive_favorite_failure_flag INTEGER,
  underdog_value_win_flag INTEGER,
  first5_cleaner_than_full_flag INTEGER,
  full_game_cleaner_than_first5_flag INTEGER,
  market_mispricing_label TEXT,
  market_phase_preference_label TEXT,
  summary_json TEXT,
  PRIMARY KEY (prediction_date, model_name, matchup, predicted_pick)
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

CREATE TABLE IF NOT EXISTS mlb_kalshi_market_snapshots (
  snapshot_ts TEXT NOT NULL,
  game_date TEXT NOT NULL,
  game_pk INTEGER,
  game_id TEXT,
  game_title TEXT,
  away_team TEXT,
  home_team TEXT,
  game_status TEXT,
  game_status_detail TEXT,
  capture_window TEXT,
  market_family TEXT NOT NULL,
  series_ticker TEXT,
  event_ticker TEXT NOT NULL,
  market_ticker TEXT NOT NULL,
  selection_code TEXT,
  market_title TEXT,
  line REAL,
  yes_bid_cents INTEGER,
  yes_ask_cents INTEGER,
  no_bid_cents INTEGER,
  no_ask_cents INTEGER,
  last_price_cents INTEGER,
  open_interest_fp REAL,
  volume_fp REAL,
  raw_json TEXT NOT NULL,
  PRIMARY KEY (snapshot_ts, market_ticker)
);

CREATE INDEX IF NOT EXISTS idx_mlb_games_game_date ON mlb_games(game_date);
CREATE INDEX IF NOT EXISTS idx_mlb_game_outcomes_game_date ON mlb_game_outcomes(game_date);
CREATE INDEX IF NOT EXISTS idx_mlb_starting_pitchers_game_pk_role ON mlb_starting_pitchers(game_pk, team_role);
CREATE INDEX IF NOT EXISTS idx_mlb_starting_pitcher_logs_pitcher_date
  ON mlb_starting_pitcher_game_logs(pitcher_id, game_date);
CREATE INDEX IF NOT EXISTS idx_mlb_starting_pitcher_logs_team_date
  ON mlb_starting_pitcher_game_logs(team_name, game_date);
CREATE INDEX IF NOT EXISTS idx_mlb_game_team_stats_team_date ON mlb_game_team_stats(team_name, game_date);
CREATE INDEX IF NOT EXISTS idx_mlb_player_game_batting_player_date
  ON mlb_player_game_batting(player_id, game_date);
CREATE INDEX IF NOT EXISTS idx_mlb_player_game_batting_team_date
  ON mlb_player_game_batting(team_name, game_date);
CREATE INDEX IF NOT EXISTS idx_mlb_batter_game_outcomes_player_date
  ON mlb_batter_game_outcomes(player_id, game_date);
CREATE INDEX IF NOT EXISTS idx_mlb_batter_game_outcomes_team_date
  ON mlb_batter_game_outcomes(team_name, game_date);
CREATE INDEX IF NOT EXISTS idx_mlb_pitcher_appearances_pitcher_date
  ON mlb_pitcher_appearances(pitcher_id, game_date);
CREATE INDEX IF NOT EXISTS idx_mlb_pitcher_appearances_team_date
  ON mlb_pitcher_appearances(team_name, game_date);
CREATE INDEX IF NOT EXISTS idx_mlb_plate_appearances_game_atbat
  ON mlb_plate_appearances(game_pk, at_bat_index);
CREATE INDEX IF NOT EXISTS idx_mlb_plate_appearances_team_date
  ON mlb_plate_appearances(batting_team, game_date);
CREATE INDEX IF NOT EXISTS idx_mlb_plate_appearances_pitcher_date
  ON mlb_plate_appearances(pitcher_id, game_date);
CREATE INDEX IF NOT EXISTS idx_mlb_plate_appearances_batter_date
  ON mlb_plate_appearances(batter_id, game_date);
CREATE INDEX IF NOT EXISTS idx_mlb_pitch_events_game_atbat
  ON mlb_pitch_events(game_pk, at_bat_index, event_index);
CREATE INDEX IF NOT EXISTS idx_mlb_pitch_events_pitcher_date
  ON mlb_pitch_events(pitcher_id, game_date);
CREATE INDEX IF NOT EXISTS idx_mlb_pitch_events_batter_date
  ON mlb_pitch_events(batter_id, game_date);
CREATE INDEX IF NOT EXISTS idx_mlb_pitch_events_type_date
  ON mlb_pitch_events(pitch_type_code, game_date);
CREATE INDEX IF NOT EXISTS idx_mlb_team_rolling_form_team_date
  ON mlb_team_rolling_form(team_name, as_of_date);
CREATE INDEX IF NOT EXISTS idx_mlb_team_story_priors_team_date
  ON mlb_team_story_priors(team_name, as_of_date);
CREATE INDEX IF NOT EXISTS idx_mlb_hitter_state_snapshots_team_date
  ON mlb_hitter_state_snapshots(team_name, as_of_date);
CREATE INDEX IF NOT EXISTS idx_mlb_hitter_state_snapshots_player_date
  ON mlb_hitter_state_snapshots(player_id, as_of_date);
CREATE INDEX IF NOT EXISTS idx_mlb_hitter_classic_trends_team_date
  ON mlb_hitter_classic_trend_snapshots(team_name, as_of_date);
CREATE INDEX IF NOT EXISTS idx_mlb_hitter_classic_trends_player_date
  ON mlb_hitter_classic_trend_snapshots(player_id, as_of_date);
CREATE INDEX IF NOT EXISTS idx_mlb_hitter_opponent_context_team_date
  ON mlb_hitter_opponent_context_snapshots(team_name, as_of_date);
CREATE INDEX IF NOT EXISTS idx_mlb_hitter_opponent_context_player_date
  ON mlb_hitter_opponent_context_snapshots(player_id, as_of_date);
CREATE INDEX IF NOT EXISTS idx_mlb_team_market_context_daily_team_date
  ON mlb_team_market_context_daily(team_name, as_of_date);
CREATE INDEX IF NOT EXISTS idx_mlb_team_opponent_quality_daily_team_date
  ON mlb_team_opponent_quality_daily(team_name, as_of_date);
CREATE INDEX IF NOT EXISTS idx_mlb_hitter_statcast_game_logs_player_date
  ON mlb_hitter_statcast_game_logs(player_id, game_date);
CREATE INDEX IF NOT EXISTS idx_mlb_hitter_statcast_game_logs_team_date
  ON mlb_hitter_statcast_game_logs(team_name, game_date);
CREATE INDEX IF NOT EXISTS idx_mlb_hitter_statcast_trends_team_date
  ON mlb_hitter_statcast_trend_snapshots(team_name, as_of_date);
CREATE INDEX IF NOT EXISTS idx_mlb_hitter_statcast_trends_player_date
  ON mlb_hitter_statcast_trend_snapshots(player_id, as_of_date);
CREATE INDEX IF NOT EXISTS idx_mlb_team_state_snapshots_team_date
  ON mlb_team_state_snapshots(team_name, as_of_date);
CREATE INDEX IF NOT EXISTS idx_mlb_team_bullpen_shape_daily_team_date
  ON mlb_team_bullpen_shape_daily(team_name, as_of_date);
CREATE INDEX IF NOT EXISTS idx_mlb_team_first_inning_profiles_team_date
  ON mlb_team_first_inning_profiles_daily(team_name, as_of_date);
CREATE INDEX IF NOT EXISTS idx_mlb_pitcher_first_inning_profiles_pitcher_date
  ON mlb_pitcher_first_inning_profiles_daily(pitcher_id, as_of_date);
CREATE INDEX IF NOT EXISTS idx_mlb_pitcher_mistake_shape_pitcher_date
  ON mlb_pitcher_mistake_shape_daily(pitcher_id, as_of_date);
CREATE INDEX IF NOT EXISTS idx_mlb_bullpen_mistake_shape_team_date
  ON mlb_bullpen_mistake_shape_daily(team_name, as_of_date);
CREATE INDEX IF NOT EXISTS idx_mlb_lineup_conversion_shape_team_date
  ON mlb_lineup_conversion_shape_daily(team_name, as_of_date);
CREATE INDEX IF NOT EXISTS idx_mlb_reliever_first_batter_profiles_pitcher_date
  ON mlb_reliever_first_batter_command_profiles(pitcher_id, as_of_date);
CREATE INDEX IF NOT EXISTS idx_mlb_starter_tttp_profiles_pitcher_date
  ON mlb_starter_third_time_penalty_profiles(pitcher_id, as_of_date);
CREATE INDEX IF NOT EXISTS idx_mlb_kalshi_market_snapshots_game_date
  ON mlb_kalshi_market_snapshots(game_date, market_family, event_ticker);
CREATE INDEX IF NOT EXISTS idx_mlb_kalshi_market_snapshots_game_pk
  ON mlb_kalshi_market_snapshots(game_pk, snapshot_ts);
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


def parse_csv_rows(text: str) -> list[dict[str, str]]:
    reader = csv.DictReader(io.StringIO(text))
    rows: list[dict[str, str]] = []
    for raw_row in reader:
        row: dict[str, str] = {}
        for key, value in raw_row.items():
            clean_key = str(key or "").lstrip("\ufeff").strip().strip('"')
            row[clean_key] = value or ""
        rows.append(row)
    return rows


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


def ingest_pitcher_war(conn: sqlite3.Connection, seasons: list[int] | None = None) -> int:
    init_db(conn)
    fetched_at = datetime.utcnow().isoformat(timespec="seconds") + "Z"
    content_text = fetch_text(BREF_WAR_DAILY_PITCH_URL)
    snapshot_date = datetime.utcnow().date().isoformat()
    raw_path = RAW_DIR / "baseball-reference" / "war-daily-pitch" / snapshot_date / "war_daily_pitch.txt"
    write_text(raw_path, content_text)
    record_snapshot(
        conn,
        source_key="baseball-reference:war-daily-pitch",
        url=BREF_WAR_DAILY_PITCH_URL,
        content_path=raw_path,
        content_text=content_text,
        meta={"seasons": sorted(seasons) if seasons else "all"},
    )

    target_seasons = {int(season) for season in seasons} if seasons else None
    aggregates: dict[tuple[int, int], dict[str, Any]] = {}
    reader = csv.DictReader(io.StringIO(content_text))

    for row in reader:
        pitcher_id = to_int(row.get("mlb_ID"))
        season = to_int(row.get("year_ID"))
        if not pitcher_id or not season:
            continue
        if target_seasons and season not in target_seasons:
            continue

        key = (season, pitcher_id)
        entry = aggregates.setdefault(
            key,
            {
                "season": season,
                "pitcher_id": pitcher_id,
                "pitcher_name": row.get("name_common") or "",
                "bref_player_id": row.get("player_ID") or "",
                "team_ids": set(),
                "games": 0,
                "games_started": 0,
                "war": 0.0,
            },
        )

        team_id = (row.get("team_ID") or "").strip()
        if team_id:
            entry["team_ids"].add(team_id)
        entry["games"] += to_int(row.get("G")) or 0
        entry["games_started"] += to_int(row.get("GS")) or 0
        entry["war"] += to_float(row.get("WAR")) or 0.0

    if target_seasons:
        for season in target_seasons:
            conn.execute("DELETE FROM mlb_pitcher_war_by_season WHERE season = ?", (season,))
    else:
        conn.execute("DELETE FROM mlb_pitcher_war_by_season")

    for entry in aggregates.values():
        conn.execute(
            """
            INSERT INTO mlb_pitcher_war_by_season (
              season, pitcher_id, pitcher_name, bref_player_id, team_ids,
              games, games_started, war, fetched_at, source
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                entry["season"],
                entry["pitcher_id"],
                entry["pitcher_name"],
                entry["bref_player_id"],
                ",".join(sorted(entry["team_ids"])),
                entry["games"],
                entry["games_started"],
                round(entry["war"], 2),
                fetched_at,
                "baseball-reference:war-daily-pitch",
            ),
        )

    conn.commit()
    return len(aggregates)


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


def read_gzip_json(path: Path) -> Any:
    with gzip.open(path, "rt", encoding="utf-8") as handle:
        return json.load(handle)


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


def normalize_team_name_for_market(value: Any) -> str:
    text = str(value or "").casefold()
    text = text.replace("st.", "st")
    text = text.replace("-", " ")
    text = text.replace("'", "")
    text = re.sub(r"[^a-z0-9 ]+", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    return TEAM_MARKET_ALIASES.get(text, str(value or ""))


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


HIT_EVENT_TYPES = {"single", "double", "triple", "home_run"}
EARLY_WHIFF_STRIKEOUT_RATE_THRESHOLD = 0.28
EARLY_WHIFF_PITCH_RATE_THRESHOLD = 0.16
MISTAKE_TEAM_WINDOWS = (8, 15, 30)
MISTAKE_PITCHER_WINDOWS = (3, 5)
MISTAKE_BULLPEN_WINDOWS = (7, 14)
FIRST_INNING_TEAM_WINDOWS = (8, 15, 30)
FIRST_INNING_PITCHER_WINDOWS = (3, 5)


def is_on_base_event(event_type: Any) -> bool:
    event = str(event_type or "").lower()
    if event in HIT_EVENT_TYPES:
        return True
    if event in {"walk", "intent_walk", "hit_by_pitch", "catcher_interference"}:
        return True
    return "error" in event


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


def ingest_mlb_game_payload(
    conn: sqlite3.Connection,
    *,
    date_text: str,
    game: dict[str, Any],
    live_payload: dict[str, Any],
    live_path: Path,
) -> None:
    game_pk = game["gamePk"]
    away_team = game["teams"]["away"]["team"]["name"]
    home_team = game["teams"]["home"]["team"]["name"]
    game_is_completed = is_completed_mlb_game(game) or is_completed_mlb_game(
        {"status": ((live_payload.get("gameData") or {}).get("status") or {})}
    )
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
        return

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
    upsert_batter_game_outcome(conn, row)


def upsert_batter_game_outcome(conn: sqlite3.Connection, row: dict[str, Any]) -> None:
    runs = to_int(row.get("runs")) or 0
    hits = to_int(row.get("hits")) or 0
    rbi = to_int(row.get("rbi")) or 0
    conn.execute(
        """
        INSERT INTO mlb_batter_game_outcomes (
          game_pk, game_date, team_role, team_name, opponent_name, player_id, player_name,
          batting_order, plate_appearances, at_bats, runs, hits, rbi, hit_run_rbi_total,
          singles, doubles, triples, home_runs, total_bases, walks, strikeouts, summary, raw_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(game_pk, team_role, player_id) DO UPDATE SET
          game_date=excluded.game_date,
          team_name=excluded.team_name,
          opponent_name=excluded.opponent_name,
          player_name=excluded.player_name,
          batting_order=excluded.batting_order,
          plate_appearances=excluded.plate_appearances,
          at_bats=excluded.at_bats,
          runs=excluded.runs,
          hits=excluded.hits,
          rbi=excluded.rbi,
          hit_run_rbi_total=excluded.hit_run_rbi_total,
          singles=excluded.singles,
          doubles=excluded.doubles,
          triples=excluded.triples,
          home_runs=excluded.home_runs,
          total_bases=excluded.total_bases,
          walks=excluded.walks,
          strikeouts=excluded.strikeouts,
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
            row["plate_appearances"],
            row["at_bats"],
            runs,
            hits,
            rbi,
            hits + runs + rbi,
            row["singles"],
            row["doubles"],
            row["triples"],
            row["home_runs"],
            row["total_bases"],
            row["walks"],
            row["strikeouts"],
            row["summary"],
            row["raw_json"],
        ),
    )


def refresh_batter_game_outcomes(
    conn: sqlite3.Connection, through_date: str | None = None, as_of_date: str | None = None
) -> int:
    init_db(conn)
    params: list[Any] = []
    where_sql = ""
    if as_of_date:
        conn.execute("DELETE FROM mlb_batter_game_outcomes WHERE game_date = ?", (as_of_date,))
        where_sql = "WHERE game_date = ?"
        params.append(as_of_date)
    elif through_date:
        conn.execute("DELETE FROM mlb_batter_game_outcomes WHERE game_date <= ?", (through_date,))
        where_sql = "WHERE game_date <= ?"
        params.append(through_date)
    else:
        conn.execute("DELETE FROM mlb_batter_game_outcomes")

    rows = conn.execute(
        f"""
        SELECT *
        FROM mlb_player_game_batting
        {where_sql}
        ORDER BY game_date, game_pk, team_role, player_id
        """,
        params,
    ).fetchall()

    for row in rows:
        upsert_batter_game_outcome(conn, dict(row))

    conn.commit()
    return len(rows)


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
        ingest_mlb_game_payload(
            conn,
            date_text=date_text,
            game=game,
            live_payload=live_payload,
            live_path=live_path,
        )

    conn.commit()


def replay_mlb_day_from_raw(conn: sqlite3.Connection, date_text: str) -> None:
    init_db(conn)
    date_dir = RAW_DIR / "mlb" / date_text
    schedule_path = date_dir / "schedule.json"
    if not schedule_path.exists():
        raise FileNotFoundError(f"Missing raw MLB schedule snapshot for {date_text}: {schedule_path}")

    schedule_payload = json.loads(schedule_path.read_text(encoding="utf-8"))
    games = schedule_payload.get("dates", [{}])[0].get("games", [])
    for game in games:
        game_pk = game["gamePk"]
        live_path = date_dir / "games" / f"{game_pk}-feed-live.json.gz"
        if not live_path.exists():
            raise FileNotFoundError(f"Missing raw MLB feed/live snapshot for {date_text} game {game_pk}: {live_path}")
        live_payload = read_gzip_json(live_path)
        ingest_mlb_game_payload(
            conn,
            date_text=date_text,
            game=game,
            live_payload=live_payload,
            live_path=live_path,
        )

    conn.commit()


def ingest_mlb_date_range(conn: sqlite3.Connection, start_date: str, end_date: str) -> None:
    current = datetime.strptime(start_date, "%Y-%m-%d").date()
    final = datetime.strptime(end_date, "%Y-%m-%d").date()
    if current > final:
        raise ValueError("start_date must be on or before end_date")
    while current <= final:
        ingest_mlb_day(conn, current.isoformat())
        current += timedelta(days=1)


def replay_mlb_date_range_from_raw(conn: sqlite3.Connection, start_date: str, end_date: str) -> None:
    current = datetime.strptime(start_date, "%Y-%m-%d").date()
    final = datetime.strptime(end_date, "%Y-%m-%d").date()
    if current > final:
        raise ValueError("start_date must be on or before end_date")
    while current <= final:
        replay_mlb_day_from_raw(conn, current.isoformat())
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


def conditional_rate(values: list[int]) -> float | None:
    if not values:
        return None
    return safe_mean(values)


def is_hit_event(event_type: Any) -> bool:
    return str(event_type or "").lower() in HIT_EVENT_TYPES


def safe_score_after_inning(
    score_rows: list[sqlite3.Row],
    team_role: str,
    inning_cutoff: int,
) -> tuple[int, int]:
    last_row = None
    for row in score_rows:
        inning = to_int(row["inning"]) or 0
        if inning <= inning_cutoff:
            last_row = row
        else:
            break

    if not last_row:
        return 0, 0

    away_score = to_int(last_row["away_score_after"]) or 0
    home_score = to_int(last_row["home_score_after"]) or 0
    if team_role == "away":
        return away_score, home_score
    return home_score, away_score


def build_team_hidden_edge_game_packet(
    conn: sqlite3.Connection,
    game_row: sqlite3.Row,
    team_name: str,
) -> dict[str, Any]:
    team_role = "away" if game_row["away_team"] == team_name else "home"
    opponent_team = game_row["home_team"] if team_role == "away" else game_row["away_team"]
    team_runs_final = (game_row["away_runs_final"] or 0) if team_role == "away" else (game_row["home_runs_final"] or 0)
    opponent_runs_final = (game_row["home_runs_final"] or 0) if team_role == "away" else (game_row["away_runs_final"] or 0)
    run_diff = team_runs_final - opponent_runs_final
    won_flag = 1 if run_diff > 0 else 0

    batting_rows = conn.execute(
        """
        SELECT inning, event_type, run_delta
        FROM mlb_plate_appearances
        WHERE game_pk = ?
          AND batting_team = ?
        ORDER BY at_bat_index
        """,
        (game_row["game_pk"], team_name),
    ).fetchall()
    early_batting_rows = [row for row in batting_rows if (to_int(row["inning"]) or 0) <= 2]
    rest_batting_rows = [row for row in batting_rows if (to_int(row["inning"]) or 0) > 2]

    pitch_rows = conn.execute(
        """
        SELECT inning, lower(COALESCE(call_description, '')) AS call_description
        FROM mlb_pitch_events
        WHERE game_pk = ?
          AND batting_team = ?
          AND is_pitch = 1
        ORDER BY at_bat_index, event_index
        """,
        (game_row["game_pk"], team_name),
    ).fetchall()
    early_pitch_rows = [row for row in pitch_rows if (to_int(row["inning"]) or 0) <= 2]

    score_rows = conn.execute(
        """
        SELECT inning, away_score_after, home_score_after
        FROM mlb_plate_appearances
        WHERE game_pk = ?
        ORDER BY at_bat_index
        """,
        (game_row["game_pk"],),
    ).fetchall()

    early_pa_count = len(early_batting_rows)
    rest_pa_count = len(rest_batting_rows)
    early_strikeouts = sum(1 for row in early_batting_rows if str(row["event_type"] or "").lower() == "strikeout")
    rest_strikeouts = sum(1 for row in rest_batting_rows if str(row["event_type"] or "").lower() == "strikeout")
    early_hits = sum(1 for row in early_batting_rows if is_hit_event(row["event_type"]))
    rest_hits = sum(1 for row in rest_batting_rows if is_hit_event(row["event_type"]))
    early_runs = sum(to_int(row["run_delta"]) or 0 for row in early_batting_rows)
    rest_runs = sum(to_int(row["run_delta"]) or 0 for row in rest_batting_rows)
    early_whiff_pitches = sum(1 for row in early_pitch_rows if "swinging strike" in str(row["call_description"] or ""))
    early_pitch_count = len(early_pitch_rows)

    early_strikeout_rate = (early_strikeouts / early_pa_count) if early_pa_count else 0.0
    early_whiff_rate = (early_whiff_pitches / early_pitch_count) if early_pitch_count else 0.0
    rest_strikeout_rate = (rest_strikeouts / rest_pa_count) if rest_pa_count else 0.0
    early_whiff_flag = int(
        early_pa_count >= 6
        and (
            early_strikeout_rate >= EARLY_WHIFF_STRIKEOUT_RATE_THRESHOLD
            or early_whiff_rate >= EARLY_WHIFF_PITCH_RATE_THRESHOLD
        )
    )
    early_whiff_rebound_flag = int(
        bool(early_whiff_flag) and (rest_runs >= 4 or rest_hits >= 6)
    )
    early_whiff_persist_flag = int(
        bool(early_whiff_flag)
        and not early_whiff_rebound_flag
        and (rest_runs <= 2 or (rest_hits <= 5 and rest_strikeout_rate >= 0.24))
    )

    team_score_after5, opp_score_after5 = safe_score_after_inning(score_rows, team_role, 5)
    team_score_after7, opp_score_after7 = safe_score_after_inning(score_rows, team_role, 7)
    lead_after5_flag = int(team_score_after5 > opp_score_after5)
    trail_after5_flag = int(team_score_after5 < opp_score_after5)
    lead_after7_flag = int(team_score_after7 > opp_score_after7)
    trail_after7_flag = int(team_score_after7 < opp_score_after7)
    blew_lead_after5_flag = int(lead_after5_flag and not won_flag)
    blew_lead_after7_flag = int(lead_after7_flag and not won_flag)
    comeback_after5_flag = int(trail_after5_flag and won_flag)
    comeback_after7_flag = int(trail_after7_flag and won_flag)
    one_run_lead_hold_flag = int(lead_after7_flag and (team_score_after7 - opp_score_after7) <= 2 and won_flag)
    runs_allowed_after_leading5 = (opponent_runs_final - opp_score_after5) if lead_after5_flag else None
    runs_scored_when_trailing5 = (team_runs_final - team_score_after5) if trail_after5_flag else None

    return {
        "game_pk": game_row["game_pk"],
        "game_date": game_row["game_date"],
        "team_name": team_name,
        "team_role": team_role,
        "opponent_team": opponent_team,
        "won_flag": won_flag,
        "run_diff": run_diff,
        "series_game_number": to_int(game_row["series_game_number"]),
        "comeback_win_flag": to_int(game_row["comeback_win_flag"]) or 0,
        "bullpen_flip_flag": to_int(game_row["bullpen_flip_flag"]) or 0,
        "early_pa_count": early_pa_count,
        "early_strikeout_rate": early_strikeout_rate,
        "early_whiff_rate": early_whiff_rate,
        "rest_runs": rest_runs,
        "rest_hits": rest_hits,
        "rest_strikeout_rate": rest_strikeout_rate,
        "early_whiff_flag": early_whiff_flag,
        "early_whiff_persist_flag": early_whiff_persist_flag,
        "early_whiff_rebound_flag": early_whiff_rebound_flag,
        "lead_after5_flag": lead_after5_flag,
        "lead_after7_flag": lead_after7_flag,
        "trail_after5_flag": trail_after5_flag,
        "trail_after7_flag": trail_after7_flag,
        "blew_lead_after5_flag": blew_lead_after5_flag,
        "blew_lead_after7_flag": blew_lead_after7_flag,
        "comeback_after5_flag": comeback_after5_flag,
        "comeback_after7_flag": comeback_after7_flag,
        "one_run_lead_hold_flag": one_run_lead_hold_flag,
        "runs_allowed_after_leading5": runs_allowed_after_leading5,
        "runs_scored_when_trailing5": runs_scored_when_trailing5,
    }


def build_recent_team_hidden_edge_packets(
    conn: sqlite3.Connection,
    team_name: str,
    as_of_date: str,
    window_games: int,
) -> list[dict[str, Any]]:
    recent_games = conn.execute(
        """
        SELECT
          g.game_pk,
          g.game_date,
          g.away_team,
          g.home_team,
          o.away_runs_final,
          o.home_runs_final,
          s.comeback_win_flag,
          s.bullpen_flip_flag,
          sx.series_game_number
        FROM mlb_games g
        JOIN mlb_game_outcomes o
          USING (game_pk)
        LEFT JOIN mlb_game_story_signals s
          USING (game_pk)
        LEFT JOIN mlb_series_context_snapshots sx
          ON sx.game_pk = g.game_pk
         AND sx.as_of_date = g.game_date
        WHERE g.game_date < ?
          AND (g.away_team = ? OR g.home_team = ?)
        ORDER BY g.game_date DESC, g.game_pk DESC
        LIMIT ?
        """,
        (as_of_date, team_name, team_name, window_games),
    ).fetchall()

    return [build_team_hidden_edge_game_packet(conn, row, team_name) for row in recent_games]


def build_whiff_persistence_row(
    as_of_date: str,
    team_name: str,
    window_games: int,
    packets: list[dict[str, Any]],
) -> dict[str, Any] | None:
    if not packets:
        return None

    early_flags = [packet["early_whiff_flag"] for packet in packets]
    flagged_packets = [packet for packet in packets if packet["early_whiff_flag"]]
    non_flagged_packets = [packet for packet in packets if not packet["early_whiff_flag"]]
    early_whiff_flag_rate = safe_mean(early_flags)
    early_whiff_persist_rate = conditional_rate([packet["early_whiff_persist_flag"] for packet in flagged_packets])
    early_whiff_rebound_rate = conditional_rate([packet["early_whiff_rebound_flag"] for packet in flagged_packets])
    avg_rest_runs_after_whiff = safe_mean([packet["rest_runs"] for packet in flagged_packets]) if flagged_packets else None
    avg_rest_hits_after_whiff = safe_mean([packet["rest_hits"] for packet in flagged_packets]) if flagged_packets else None
    avg_rest_k_rate_after_whiff = (
        safe_mean([packet["rest_strikeout_rate"] for packet in flagged_packets]) if flagged_packets else None
    )
    avg_rest_runs_without_whiff = (
        safe_mean([packet["rest_runs"] for packet in non_flagged_packets]) if non_flagged_packets else None
    )
    avg_rest_hits_without_whiff = (
        safe_mean([packet["rest_hits"] for packet in non_flagged_packets]) if non_flagged_packets else None
    )
    persistence_index = clamp_value(
        18
        + early_whiff_flag_rate * 26
        + (early_whiff_persist_rate if early_whiff_persist_rate is not None else 0.5) * 38
        + max(0.0, (avg_rest_k_rate_after_whiff or 0.0) - 0.22) * 70
        - (early_whiff_rebound_rate or 0.0) * 12,
        0,
        100,
    )
    rebound_index = clamp_value(
        16
        + early_whiff_flag_rate * 14
        + (early_whiff_rebound_rate if early_whiff_rebound_rate is not None else 0.0) * 44
        + max(0.0, (avg_rest_runs_after_whiff or 0.0) - 3.0) * 8
        + max(0.0, (avg_rest_hits_after_whiff or 0.0) - 5.0) * 5
        - (early_whiff_persist_rate or 0.0) * 10,
        0,
        100,
    )

    return {
        "as_of_date": as_of_date,
        "team_name": team_name,
        "window_games": window_games,
        "games_sample": len(packets),
        "early_two_inning_pa_per_game": safe_mean([packet["early_pa_count"] for packet in packets]),
        "early_two_inning_strikeout_rate": safe_mean([packet["early_strikeout_rate"] for packet in packets]),
        "early_two_inning_whiff_rate": safe_mean([packet["early_whiff_rate"] for packet in packets]),
        "games_with_early_whiff_flag": sum(early_flags),
        "early_whiff_flag_rate": early_whiff_flag_rate,
        "early_whiff_persist_rate": early_whiff_persist_rate,
        "early_whiff_rebound_rate": early_whiff_rebound_rate,
        "avg_rest_of_game_runs_after_whiff": avg_rest_runs_after_whiff,
        "avg_rest_of_game_hits_after_whiff": avg_rest_hits_after_whiff,
        "avg_rest_of_game_strikeout_rate_after_whiff": avg_rest_k_rate_after_whiff,
        "avg_rest_of_game_runs_without_whiff": avg_rest_runs_without_whiff,
        "avg_rest_of_game_hits_without_whiff": avg_rest_hits_without_whiff,
        "whiff_persistence_index": persistence_index,
        "whiff_rebound_index": rebound_index,
    }


def build_lead_surrender_row(
    as_of_date: str,
    team_name: str,
    window_games: int,
    packets: list[dict[str, Any]],
) -> dict[str, Any] | None:
    if not packets:
        return None

    led_after5_packets = [packet for packet in packets if packet["lead_after5_flag"]]
    led_after7_packets = [packet for packet in packets if packet["lead_after7_flag"]]
    trailed_after5_packets = [packet for packet in packets if packet["trail_after5_flag"]]
    trailed_after7_packets = [packet for packet in packets if packet["trail_after7_flag"]]
    lead_after5_conversion_rate = conditional_rate([packet["won_flag"] for packet in led_after5_packets])
    lead_after7_conversion_rate = conditional_rate([packet["won_flag"] for packet in led_after7_packets])
    blew_lead_after5_rate = conditional_rate([packet["blew_lead_after5_flag"] for packet in led_after5_packets])
    blew_lead_after7_rate = conditional_rate([packet["blew_lead_after7_flag"] for packet in led_after7_packets])
    comeback_after5_rate = conditional_rate([packet["comeback_after5_flag"] for packet in trailed_after5_packets])
    comeback_after7_rate = conditional_rate([packet["comeback_after7_flag"] for packet in trailed_after7_packets])
    one_run_lead_hold_rate = conditional_rate([packet["one_run_lead_hold_flag"] for packet in led_after7_packets])
    avg_runs_allowed_after_leading5 = (
        safe_mean([packet["runs_allowed_after_leading5"] for packet in led_after5_packets if packet["runs_allowed_after_leading5"] is not None])
        if led_after5_packets
        else None
    )
    avg_runs_scored_when_trailing5 = (
        safe_mean([packet["runs_scored_when_trailing5"] for packet in trailed_after5_packets if packet["runs_scored_when_trailing5"] is not None])
        if trailed_after5_packets
        else None
    )
    surrender_index = clamp_value(
        18
        + (blew_lead_after5_rate or 0.0) * 24
        + (blew_lead_after7_rate or 0.0) * 32
        + max(0.0, 0.72 - (lead_after7_conversion_rate if lead_after7_conversion_rate is not None else 0.72)) * 38
        + max(0.0, 0.62 - (one_run_lead_hold_rate if one_run_lead_hold_rate is not None else 0.62)) * 18
        + max(0.0, (avg_runs_allowed_after_leading5 or 0.0) - 1.6) * 10,
        0,
        100,
    )
    comeback_resilience_index = clamp_value(
        18
        + (comeback_after5_rate or 0.0) * 30
        + (comeback_after7_rate or 0.0) * 34
        + max(0.0, (avg_runs_scored_when_trailing5 or 0.0) - 1.5) * 10,
        0,
        100,
    )

    return {
        "as_of_date": as_of_date,
        "team_name": team_name,
        "window_games": window_games,
        "games_sample": len(packets),
        "led_after5_rate": safe_mean([packet["lead_after5_flag"] for packet in packets]),
        "led_after7_rate": safe_mean([packet["lead_after7_flag"] for packet in packets]),
        "trailed_after5_rate": safe_mean([packet["trail_after5_flag"] for packet in packets]),
        "trailed_after7_rate": safe_mean([packet["trail_after7_flag"] for packet in packets]),
        "lead_after5_conversion_rate": lead_after5_conversion_rate,
        "lead_after7_conversion_rate": lead_after7_conversion_rate,
        "blew_lead_after5_rate": blew_lead_after5_rate,
        "blew_lead_after7_rate": blew_lead_after7_rate,
        "comeback_after5_rate": comeback_after5_rate,
        "comeback_after7_rate": comeback_after7_rate,
        "one_run_lead_hold_rate": one_run_lead_hold_rate,
        "avg_runs_allowed_after_leading5": avg_runs_allowed_after_leading5,
        "avg_runs_scored_when_trailing5": avg_runs_scored_when_trailing5,
        "lead_surrender_index": surrender_index,
        "comeback_resilience_index": comeback_resilience_index,
    }


def build_form_carryover_row(
    as_of_date: str,
    team_name: str,
    window_games: int,
    packets: list[dict[str, Any]],
) -> dict[str, Any] | None:
    if len(packets) < 2:
        return None

    asc_packets = sorted(packets, key=lambda packet: (packet["game_date"], packet["game_pk"]))
    transitions: list[dict[str, Any]] = []

    for index in range(1, len(asc_packets)):
        current_packet = asc_packets[index]
        previous_packet = asc_packets[index - 1]

        streak_length = 1
        cursor = index - 1
        while cursor - 1 >= 0 and asc_packets[cursor - 1]["won_flag"] == previous_packet["won_flag"]:
            streak_length += 1
            cursor -= 1

        transitions.append(
            {
                "prev_won": previous_packet["won_flag"],
                "curr_won": current_packet["won_flag"],
                "prev_run_diff": previous_packet["run_diff"],
                "curr_run_diff": current_packet["run_diff"],
                "prev_comeback_win": previous_packet["comeback_win_flag"] if previous_packet["won_flag"] else 0,
                "prev_bullpen_flip_loss": previous_packet["bullpen_flip_flag"] if not previous_packet["won_flag"] else 0,
                "curr_series_game_number": current_packet["series_game_number"],
                "streak_length": streak_length,
                "prev_streak_won": previous_packet["won_flag"],
            }
        )

    after_win = [transition for transition in transitions if transition["prev_won"]]
    after_loss = [transition for transition in transitions if not transition["prev_won"]]
    after_blowout_win = [transition for transition in transitions if transition["prev_run_diff"] >= 5]
    after_blowout_loss = [transition for transition in transitions if transition["prev_run_diff"] <= -5]
    after_comeback_win = [transition for transition in transitions if transition["prev_comeback_win"]]
    after_bullpen_flip_loss = [transition for transition in transitions if transition["prev_bullpen_flip_loss"]]
    series_game2 = [transition for transition in transitions if transition["curr_series_game_number"] == 2]
    series_game3plus = [transition for transition in transitions if (transition["curr_series_game_number"] or 0) >= 3]
    hot_streak_transitions = [
        transition
        for transition in transitions
        if transition["prev_streak_won"] and transition["streak_length"] >= 2
    ]
    cold_streak_transitions = [
        transition
        for transition in transitions
        if not transition["prev_streak_won"] and transition["streak_length"] >= 2
    ]

    after_win_next_win_rate = conditional_rate([transition["curr_won"] for transition in after_win])
    after_loss_bounce_rate = conditional_rate([transition["curr_won"] for transition in after_loss])
    after_blowout_win_next_win_rate = conditional_rate([transition["curr_won"] for transition in after_blowout_win])
    after_blowout_loss_bounce_rate = conditional_rate([transition["curr_won"] for transition in after_blowout_loss])
    after_comeback_win_next_win_rate = conditional_rate([transition["curr_won"] for transition in after_comeback_win])
    after_bullpen_flip_loss_bounce_rate = conditional_rate([transition["curr_won"] for transition in after_bullpen_flip_loss])
    series_game2_win_rate = conditional_rate([transition["curr_won"] for transition in series_game2])
    series_game3plus_win_rate = conditional_rate([transition["curr_won"] for transition in series_game3plus])
    hot_streak_hold_rate = conditional_rate([transition["curr_won"] for transition in hot_streak_transitions])
    hot_streak_break_rate = conditional_rate([1 - transition["curr_won"] for transition in hot_streak_transitions])
    cold_streak_continue_rate = conditional_rate([1 - transition["curr_won"] for transition in cold_streak_transitions])
    cold_streak_bounce_rate = conditional_rate([transition["curr_won"] for transition in cold_streak_transitions])
    avg_next_game_run_diff_after_win = safe_mean([transition["curr_run_diff"] for transition in after_win]) if after_win else None
    avg_next_game_run_diff_after_loss = safe_mean([transition["curr_run_diff"] for transition in after_loss]) if after_loss else None
    carryover_instability_index = clamp_value(
        24
        + max(0.0, 0.58 - (after_win_next_win_rate if after_win_next_win_rate is not None else 0.58)) * 26
        + (after_loss_bounce_rate or 0.0) * 12
        + max(0.0, 0.6 - (after_blowout_win_next_win_rate if after_blowout_win_next_win_rate is not None else 0.6)) * 20
        + (after_blowout_loss_bounce_rate or 0.0) * 14
        + (hot_streak_break_rate or 0.0) * 18
        + (cold_streak_bounce_rate or 0.0) * 10,
        0,
        100,
    )
    bounceback_index = clamp_value(
        18
        + (after_loss_bounce_rate or 0.0) * 22
        + (after_blowout_loss_bounce_rate or 0.0) * 18
        + (cold_streak_bounce_rate or 0.0) * 18
        + max(0.0, (avg_next_game_run_diff_after_loss or 0.0) + 1.0) * 6,
        0,
        100,
    )

    return {
        "as_of_date": as_of_date,
        "team_name": team_name,
        "window_games": window_games,
        "transitions_sample": len(transitions),
        "after_win_next_win_rate": after_win_next_win_rate,
        "after_loss_bounce_rate": after_loss_bounce_rate,
        "after_blowout_win_next_win_rate": after_blowout_win_next_win_rate,
        "after_blowout_loss_bounce_rate": after_blowout_loss_bounce_rate,
        "after_comeback_win_next_win_rate": after_comeback_win_next_win_rate,
        "after_bullpen_flip_loss_bounce_rate": after_bullpen_flip_loss_bounce_rate,
        "series_game2_win_rate": series_game2_win_rate,
        "series_game3plus_win_rate": series_game3plus_win_rate,
        "hot_streak_hold_rate": hot_streak_hold_rate,
        "hot_streak_break_rate": hot_streak_break_rate,
        "cold_streak_continue_rate": cold_streak_continue_rate,
        "cold_streak_bounce_rate": cold_streak_bounce_rate,
        "avg_next_game_run_diff_after_win": avg_next_game_run_diff_after_win,
        "avg_next_game_run_diff_after_loss": avg_next_game_run_diff_after_loss,
        "carryover_instability_index": carryover_instability_index,
        "bounceback_index": bounceback_index,
    }


def build_team_schedule_context(conn: sqlite3.Connection, as_of_date: str, team_name: str) -> dict[str, Any]:
    row = conn.execute(
        """
        SELECT
          g.away_team,
          g.home_team,
          sx.series_game_number
        FROM mlb_games g
        LEFT JOIN mlb_series_context_snapshots sx
          ON sx.game_pk = g.game_pk
         AND sx.as_of_date = g.game_date
        WHERE g.game_date = ?
          AND (g.away_team = ? OR g.home_team = ?)
        ORDER BY g.game_pk
        LIMIT 1
        """,
        (as_of_date, team_name, team_name),
    ).fetchone()

    if not row:
        return {
            "scheduled_opponent": None,
            "scheduled_series_game_number": None,
            "division_matchup_flag": 0,
        }

    opponent = row["home_team"] if row["away_team"] == team_name else row["away_team"]
    return {
        "scheduled_opponent": opponent,
        "scheduled_series_game_number": to_int(row["series_game_number"]),
        "division_matchup_flag": 1 if TEAM_DIVISIONS.get(opponent) == TEAM_DIVISIONS.get(team_name) else 0,
    }


def build_recent_team_state_row(
    conn: sqlite3.Connection,
    as_of_date: str,
    team_name: str,
    packets: list[dict[str, Any]],
) -> dict[str, Any] | None:
    if not packets:
        return None

    schedule_context = build_team_schedule_context(conn, as_of_date, team_name)
    last3 = packets[:3]
    last5 = packets[:5]
    previous_packet = packets[0]
    previous_result = "win" if previous_packet["won_flag"] else "loss"
    streak_direction = "W" if previous_packet["won_flag"] else "L"
    streak_length = 0
    for packet in packets:
        if packet["won_flag"] == previous_packet["won_flag"]:
            streak_length += 1
        else:
            break

    opponent_records = []
    for packet in last5:
        opponent_record = conn.execute(
            """
            SELECT
              AVG(CASE
                WHEN winner_team = ? THEN 1.0
                WHEN loser_team = ? THEN 0.0
                ELSE NULL
              END) AS opp_win_pct
            FROM mlb_game_story_signals
            WHERE game_date < ?
              AND (winner_team = ? OR loser_team = ?)
            """,
            (
                packet["opponent_team"],
                packet["opponent_team"],
                packet["game_date"],
                packet["opponent_team"],
                packet["opponent_team"],
            ),
        ).fetchone()
        opponent_records.append(to_float(opponent_record["opp_win_pct"]) if opponent_record else None)

    win_pct_last3 = safe_mean([packet["won_flag"] for packet in last3])
    win_pct_last5 = safe_mean([packet["won_flag"] for packet in last5])
    run_diff_last3 = safe_mean([packet["run_diff"] for packet in last3])
    run_diff_last5 = safe_mean([packet["run_diff"] for packet in last5])
    close_loss_count_last5 = sum(1 for packet in last5 if not packet["won_flag"] and (packet["run_diff"] or 0) >= -2)
    blowout_win_count_last5 = sum(1 for packet in last5 if packet["won_flag"] and (packet["run_diff"] or 0) >= 5)
    blowout_loss_count_last5 = sum(1 for packet in last5 if not packet["won_flag"] and (packet["run_diff"] or 0) <= -5)
    comeback_win_count_last5 = sum(packet["comeback_win_flag"] for packet in last5)
    bullpen_flip_loss_count_last5 = sum(packet["bullpen_flip_flag"] for packet in last5 if not packet["won_flag"])
    quiet_first5_count_last5 = sum(packet.get("quiet_first5_flag", 0) or 0 for packet in last5)
    first_inning_jolt_count_last5 = sum(packet.get("first_inning_jolt_flag", 0) or 0 for packet in last5)
    opponent_win_pct_last5 = safe_mean([value for value in opponent_records if value is not None]) if any(
        value is not None for value in opponent_records
    ) else None

    snapback_pressure_index = clamp_value(
        14
        + (streak_length * 10 if streak_direction == "L" else 0)
        + close_loss_count_last5 * 4
        + blowout_loss_count_last5 * 3
        + (6 if previous_result == "loss" else 0)
        + max(0.0, 0.48 - win_pct_last5) * 48
        + (schedule_context["scheduled_series_game_number"] == 2) * 5,
        0,
        100,
    )
    heat_regression_index = clamp_value(
        14
        + (streak_length * 9 if streak_direction == "W" else 0)
        + blowout_win_count_last5 * 6
        + max(0.0, run_diff_last5 - 1.5) * 6
        + max(0.0, win_pct_last5 - 0.62) * 36
        + (schedule_context["scheduled_series_game_number"] == 2) * 3,
        0,
        100,
    )
    form_pressure_index = clamp_value(
        18
        + max(snapback_pressure_index, heat_regression_index) * 0.45
        + (quiet_first5_count_last5 * 2)
        + (first_inning_jolt_count_last5 * 2)
        + (bullpen_flip_loss_count_last5 * 3),
        0,
        100,
    )

    return {
        "as_of_date": as_of_date,
        "team_name": team_name,
        "scheduled_opponent": schedule_context["scheduled_opponent"],
        "scheduled_series_game_number": schedule_context["scheduled_series_game_number"],
        "division_matchup_flag": schedule_context["division_matchup_flag"],
        "games_sample": len(last5),
        "previous_result": previous_result,
        "streak_direction": streak_direction,
        "streak_length": streak_length,
        "win_pct_last3": win_pct_last3,
        "win_pct_last5": win_pct_last5,
        "run_diff_last3": run_diff_last3,
        "run_diff_last5": run_diff_last5,
        "close_loss_count_last5": close_loss_count_last5,
        "blowout_win_count_last5": blowout_win_count_last5,
        "blowout_loss_count_last5": blowout_loss_count_last5,
        "comeback_win_count_last5": comeback_win_count_last5,
        "bullpen_flip_loss_count_last5": bullpen_flip_loss_count_last5,
        "quiet_first5_count_last5": quiet_first5_count_last5,
        "first_inning_jolt_count_last5": first_inning_jolt_count_last5,
        "opponent_win_pct_last5": opponent_win_pct_last5,
        "snapback_pressure_index": snapback_pressure_index,
        "heat_regression_index": heat_regression_index,
        "form_pressure_index": form_pressure_index,
    }


def compute_recent_hitter_whiff_rate(
    conn: sqlite3.Connection,
    player_id: int,
    recent_game_pks: list[int],
) -> float | None:
    if not recent_game_pks:
        return None

    placeholders = ",".join("?" for _ in recent_game_pks)
    rows = conn.execute(
        f"""
        SELECT lower(COALESCE(call_description, '')) AS call_description, is_pitch
        FROM mlb_pitch_events
        WHERE batter_id = ?
          AND game_pk IN ({placeholders})
        ORDER BY game_date DESC, at_bat_index DESC, event_index DESC
        """,
        (player_id, *recent_game_pks),
    ).fetchall()

    pitch_rows = [row for row in rows if to_int(row["is_pitch"]) == 1]
    if not pitch_rows:
        return None

    swinging_whiffs = sum(1 for row in pitch_rows if "swinging strike" in str(row["call_description"] or ""))
    return safe_mean([swinging_whiffs / len(pitch_rows)])


def build_recent_hitter_state_row(
    conn: sqlite3.Connection,
    as_of_date: str,
    team_name: str,
    player_id: int,
    player_name: str,
) -> dict[str, Any] | None:
    recent_rows = conn.execute(
        """
        SELECT
          game_pk,
          game_date,
          batting_order,
          plate_appearances,
          hits,
          total_bases,
          home_runs,
          walks,
          strikeouts,
          left_on_base
        FROM mlb_player_game_batting
        WHERE team_name = ?
          AND player_id = ?
          AND game_date < ?
        ORDER BY game_date DESC, game_pk DESC
        LIMIT 5
        """,
        (team_name, player_id, as_of_date),
    ).fetchall()

    if not recent_rows:
        return None

    recent_game_pks = [to_int(row["game_pk"]) or 0 for row in recent_rows if to_int(row["game_pk"]) is not None]
    last_game_date = recent_rows[0]["game_date"]
    days_since_last_game = (datetime.strptime(as_of_date, "%Y-%m-%d").date() - datetime.strptime(last_game_date, "%Y-%m-%d").date()).days

    hit_streak_games = 0
    hitless_streak_games = 0
    home_run_streak_games = 0
    for row in recent_rows:
        hits = to_int(row["hits"]) or 0
        home_runs = to_int(row["home_runs"]) or 0
        if hits > 0 and hitless_streak_games == 0:
            hit_streak_games += 1
        elif hits == 0 and hit_streak_games == 0:
            hitless_streak_games += 1
        else:
            break
        if home_runs > 0:
            home_run_streak_games += 1
        elif home_run_streak_games > 0:
            break

    total_pa = sum(to_int(row["plate_appearances"]) or 0 for row in recent_rows)
    total_hits = sum(to_int(row["hits"]) or 0 for row in recent_rows)
    total_tb = sum(to_int(row["total_bases"]) or 0 for row in recent_rows)
    total_walks = sum(to_int(row["walks"]) or 0 for row in recent_rows)
    total_strikeouts = sum(to_int(row["strikeouts"]) or 0 for row in recent_rows)
    batting_orders = [to_int(row["batting_order"]) for row in recent_rows if to_int(row["batting_order"]) is not None]
    multi_hit_games_last5 = sum(1 for row in recent_rows if (to_int(row["hits"]) or 0) >= 2)
    multi_tb_games_last5 = sum(1 for row in recent_rows if (to_int(row["total_bases"]) or 0) >= 2)
    hits_per_pa_last5 = (total_hits / total_pa) if total_pa else None
    tb_per_pa_last5 = (total_tb / total_pa) if total_pa else None
    strikeout_rate_last5 = (total_strikeouts / total_pa) if total_pa else None
    walk_rate_last5 = (total_walks / total_pa) if total_pa else None
    whiff_rate_last5 = compute_recent_hitter_whiff_rate(conn, player_id, recent_game_pks)

    pressure_plate_index = clamp_value(
        18
        + hitless_streak_games * 10
        + max(0.0, (whiff_rate_last5 or 0.0) - 0.11) * 150
        + max(0.0, (strikeout_rate_last5 or 0.0) - 0.24) * 60
        + max(0.0, 0.08 - (walk_rate_last5 or 0.08)) * 50,
        0,
        100,
    )
    cold_streak_index = clamp_value(
        16
        + hitless_streak_games * 12
        + max(0.0, 0.22 - (hits_per_pa_last5 or 0.22)) * 120
        + max(0.0, 0.38 - (tb_per_pa_last5 or 0.38)) * 70
        + pressure_plate_index * 0.35
        - hit_streak_games * 5,
        0,
        100,
    )
    heat_regression_index = clamp_value(
        18
        + hit_streak_games * 10
        + home_run_streak_games * 8
        + max(0.0, (hits_per_pa_last5 or 0.0) - 0.34) * 90
        + max(0.0, (tb_per_pa_last5 or 0.0) - 0.55) * 70
        + max(0, multi_hit_games_last5 - 2) * 6,
        0,
        100,
    )

    return {
        "as_of_date": as_of_date,
        "team_name": team_name,
        "player_id": player_id,
        "player_name": player_name,
        "games_sample": len(recent_rows),
        "days_since_last_game": days_since_last_game,
        "batting_order_avg_last5": safe_mean(batting_orders) if batting_orders else None,
        "hit_streak_games": hit_streak_games,
        "hitless_streak_games": hitless_streak_games,
        "multi_hit_games_last5": multi_hit_games_last5,
        "multi_tb_games_last5": multi_tb_games_last5,
        "home_run_streak_games": home_run_streak_games,
        "hits_per_pa_last5": hits_per_pa_last5,
        "total_bases_per_pa_last5": tb_per_pa_last5,
        "strikeout_rate_last5": strikeout_rate_last5,
        "walk_rate_last5": walk_rate_last5,
        "whiff_rate_last5": whiff_rate_last5,
        "pressure_plate_index": pressure_plate_index,
        "cold_streak_index": cold_streak_index,
        "heat_regression_index": heat_regression_index,
    }


def build_recent_hitter_classic_trend_row(
    conn: sqlite3.Connection,
    as_of_date: str,
    team_name: str,
    player_id: int,
    player_name: str,
) -> dict[str, Any] | None:
    recent_rows = conn.execute(
        """
        SELECT
          game_pk,
          game_date,
          batting_order,
          plate_appearances,
          hits,
          total_bases,
          home_runs,
          walks,
          strikeouts
        FROM mlb_player_game_batting
        WHERE team_name = ?
          AND player_id = ?
          AND game_date < ?
        ORDER BY game_date DESC, game_pk DESC
        LIMIT 10
        """,
        (team_name, player_id, as_of_date),
    ).fetchall()

    if not recent_rows:
        return None

    def summarize(rows: list[sqlite3.Row]) -> dict[str, Any]:
        recent_game_pks = [to_int(row["game_pk"]) or 0 for row in rows if to_int(row["game_pk"]) is not None]
        total_pa = sum(to_int(row["plate_appearances"]) or 0 for row in rows)
        total_hits = sum(to_int(row["hits"]) or 0 for row in rows)
        total_tb = sum(to_int(row["total_bases"]) or 0 for row in rows)
        total_walks = sum(to_int(row["walks"]) or 0 for row in rows)
        total_strikeouts = sum(to_int(row["strikeouts"]) or 0 for row in rows)
        batting_orders = [to_int(row["batting_order"]) for row in rows if to_int(row["batting_order"]) is not None]
        return {
            "games_sample": len(rows),
            "pa_sample": total_pa,
            "batting_order_avg": safe_mean(batting_orders) if batting_orders else None,
            "multi_hit_games": sum(1 for row in rows if (to_int(row["hits"]) or 0) >= 2),
            "multi_tb_games": sum(1 for row in rows if (to_int(row["total_bases"]) or 0) >= 2),
            "home_run_games": sum(1 for row in rows if (to_int(row["home_runs"]) or 0) >= 1),
            "hits_per_pa": (total_hits / total_pa) if total_pa else None,
            "total_bases_per_pa": (total_tb / total_pa) if total_pa else None,
            "strikeout_rate": (total_strikeouts / total_pa) if total_pa else None,
            "walk_rate": (total_walks / total_pa) if total_pa else None,
            "whiff_rate": compute_recent_hitter_whiff_rate(conn, player_id, recent_game_pks),
        }

    def delta(short_value: float | None, long_value: float | None, digits: int = 3) -> float | None:
        if short_value is None or long_value is None:
            return None
        return round(short_value - long_value, digits)

    last5_rows = recent_rows[:5]
    last5 = summarize(last5_rows) if last5_rows else None
    last10 = summarize(recent_rows)
    last_game_date = recent_rows[0]["game_date"]
    days_since_last_game = (
        datetime.strptime(as_of_date, "%Y-%m-%d").date() - datetime.strptime(last_game_date, "%Y-%m-%d").date()
    ).days

    return {
        "as_of_date": as_of_date,
        "team_name": team_name,
        "player_id": player_id,
        "player_name": player_name,
        "days_since_last_game": days_since_last_game,
        "games_sample_last10": last10["games_sample"],
        "pa_sample_last10": last10["pa_sample"],
        "batting_order_avg_last10": last10["batting_order_avg"],
        "multi_hit_games_last10": last10["multi_hit_games"],
        "multi_tb_games_last10": last10["multi_tb_games"],
        "home_run_games_last10": last10["home_run_games"],
        "hits_per_pa_last10": last10["hits_per_pa"],
        "total_bases_per_pa_last10": last10["total_bases_per_pa"],
        "strikeout_rate_last10": last10["strikeout_rate"],
        "walk_rate_last10": last10["walk_rate"],
        "whiff_rate_last10": last10["whiff_rate"],
        "hits_per_pa_last5_minus_last10": delta(last5["hits_per_pa"], last10["hits_per_pa"]) if last5 else None,
        "total_bases_per_pa_last5_minus_last10": (
            delta(last5["total_bases_per_pa"], last10["total_bases_per_pa"]) if last5 else None
        ),
        "strikeout_rate_last5_minus_last10": delta(last5["strikeout_rate"], last10["strikeout_rate"]) if last5 else None,
    }


def build_recent_hitter_opponent_context_row(
    conn: sqlite3.Connection,
    as_of_date: str,
    team_name: str,
    player_id: int,
    player_name: str,
) -> dict[str, Any] | None:
    recent_rows = conn.execute(
        """
        SELECT
          b.game_pk,
          b.game_date,
          b.plate_appearances,
          b.hits,
          b.total_bases,
          s.win_pct_last5 AS opp_win_pct_last5,
          s.run_diff_last5 AS opp_run_diff_last5,
          rf.run_diff_per_game AS opp_run_diff_per_game_last10
        FROM mlb_player_game_batting b
        LEFT JOIN mlb_team_state_snapshots s
          ON s.as_of_date = b.game_date
         AND s.team_name = b.opponent_name
        LEFT JOIN mlb_team_rolling_form rf
          ON rf.as_of_date = b.game_date
         AND rf.team_name = b.opponent_name
         AND rf.window_games = 10
        WHERE b.team_name = ?
          AND b.player_id = ?
          AND b.game_date < ?
        ORDER BY b.game_date DESC, b.game_pk DESC
        LIMIT 10
        """,
        (team_name, player_id, as_of_date),
    ).fetchall()

    if not recent_rows:
        return None

    total_pa = sum(to_int(row["plate_appearances"]) or 0 for row in recent_rows)
    total_hits = sum(to_int(row["hits"]) or 0 for row in recent_rows)
    total_tb = sum(to_int(row["total_bases"]) or 0 for row in recent_rows)
    raw_hits_per_pa = (total_hits / total_pa) if total_pa else None
    raw_tb_per_pa = (total_tb / total_pa) if total_pa else None

    weighted_hits_numerator = 0.0
    weighted_tb_numerator = 0.0
    weighted_pa_denominator = 0.0
    opp_win_values: list[float] = []
    opp_run_diff_values: list[float] = []
    opp_run_diff10_values: list[float] = []
    games_vs_winning = 0
    games_vs_positive_run_diff = 0
    pa_vs_winning = 0
    hits_vs_winning = 0
    tb_vs_winning = 0

    for row in recent_rows:
        pa = to_int(row["plate_appearances"]) or 0
        hits = to_int(row["hits"]) or 0
        total_bases = to_int(row["total_bases"]) or 0
        opp_win_pct = to_float(row["opp_win_pct_last5"])
        opp_run_diff = to_float(row["opp_run_diff_last5"])
        opp_run_diff10 = to_float(row["opp_run_diff_per_game_last10"])

        if opp_win_pct is not None:
            opp_win_values.append(opp_win_pct)
        if opp_run_diff is not None:
            opp_run_diff_values.append(opp_run_diff)
        if opp_run_diff10 is not None:
            opp_run_diff10_values.append(opp_run_diff10)

        if opp_win_pct is not None and opp_win_pct >= 0.5:
            games_vs_winning += 1
            pa_vs_winning += pa
            hits_vs_winning += hits
            tb_vs_winning += total_bases

        if opp_run_diff10 is not None and opp_run_diff10 > 0:
            games_vs_positive_run_diff += 1

        if pa > 0:
            weight = 0.5 + (opp_win_pct if opp_win_pct is not None else 0.5)
            weighted_hits_numerator += hits * weight
            weighted_tb_numerator += total_bases * weight
            weighted_pa_denominator += pa * weight

    weighted_hits_per_pa = (weighted_hits_numerator / weighted_pa_denominator) if weighted_pa_denominator else None
    weighted_tb_per_pa = (weighted_tb_numerator / weighted_pa_denominator) if weighted_pa_denominator else None
    hits_vs_winning_per_pa = (hits_vs_winning / pa_vs_winning) if pa_vs_winning else None
    tb_vs_winning_per_pa = (tb_vs_winning / pa_vs_winning) if pa_vs_winning else None

    def delta(weighted_value: float | None, raw_value: float | None, digits: int = 3) -> float | None:
        if weighted_value is None or raw_value is None:
            return None
        return round(weighted_value - raw_value, digits)

    return {
        "as_of_date": as_of_date,
        "team_name": team_name,
        "player_id": player_id,
        "player_name": player_name,
        "games_sample_last10": len(recent_rows),
        "avg_opponent_win_pct_last5_last10": safe_mean(opp_win_values),
        "avg_opponent_run_diff_last5_last10": safe_mean(opp_run_diff_values),
        "avg_opponent_run_diff_per_game_last10": safe_mean(opp_run_diff10_values),
        "games_vs_winning_last10": games_vs_winning,
        "games_vs_positive_run_diff_last10": games_vs_positive_run_diff,
        "pa_vs_winning_last10": pa_vs_winning,
        "hits_per_pa_vs_winning_last10": hits_vs_winning_per_pa,
        "total_bases_per_pa_vs_winning_last10": tb_vs_winning_per_pa,
        "weighted_hits_per_pa_last10": weighted_hits_per_pa,
        "weighted_total_bases_per_pa_last10": weighted_tb_per_pa,
        "hits_per_pa_weight_delta_last10": delta(weighted_hits_per_pa, raw_hits_per_pa),
        "total_bases_per_pa_weight_delta_last10": delta(weighted_tb_per_pa, raw_tb_per_pa),
    }


def build_recent_team_market_packets(
    conn: sqlite3.Connection,
    team_name: str,
    as_of_date: str,
    window_games: int,
) -> list[dict[str, Any]]:
    rows = conn.execute(
        """
        SELECT
          g.game_pk,
          g.game_date,
          g.away_team,
          g.home_team,
          o.away_runs_final,
          o.home_runs_final,
          o.total_runs_final
        FROM mlb_games g
        JOIN mlb_game_outcomes o
          USING (game_pk)
        WHERE g.game_date < ?
          AND (g.away_team = ? OR g.home_team = ?)
        ORDER BY g.game_date DESC, g.game_pk DESC
        LIMIT ?
        """,
        (as_of_date, team_name, team_name, window_games),
    ).fetchall()

    packets: list[dict[str, Any]] = []
    for row in rows:
        team_role = "away" if row["away_team"] == team_name else "home"
        opponent_team = row["home_team"] if team_role == "away" else row["away_team"]
        team_runs_final = (to_int(row["away_runs_final"]) or 0) if team_role == "away" else (to_int(row["home_runs_final"]) or 0)
        opponent_runs_final = (to_int(row["home_runs_final"]) or 0) if team_role == "away" else (to_int(row["away_runs_final"]) or 0)
        packets.append(
            {
                "game_pk": to_int(row["game_pk"]) or 0,
                "game_date": row["game_date"],
                "team_name": team_name,
                "team_role": team_role,
                "opponent_team": opponent_team,
                "team_runs_final": team_runs_final,
                "opponent_runs_final": opponent_runs_final,
                "total_runs_final": to_int(row["total_runs_final"]) or (team_runs_final + opponent_runs_final),
                "won_flag": 1 if team_runs_final > opponent_runs_final else 0,
                "run_diff": team_runs_final - opponent_runs_final,
            }
        )
    return packets


def american_implied_probability(price: Any) -> float | None:
    odds = to_float(price)
    if odds is None or odds == 0:
        return None
    if odds > 0:
        return 100.0 / (odds + 100.0)
    return abs(odds) / (abs(odds) + 100.0)


def load_latest_featured_market_rows(
    conn: sqlite3.Connection,
    game_pk: int,
    market_key: str,
    cache: dict[tuple[int, str], list[sqlite3.Row]],
) -> list[sqlite3.Row]:
    cache_key = (game_pk, market_key)
    if cache_key not in cache:
        cache[cache_key] = conn.execute(
            """
            WITH latest_snapshot AS (
              SELECT MAX(snapshot_time) AS snapshot_time
              FROM mlb_featured_market_odds_snapshots
              WHERE game_pk = ?
                AND market_key = ?
            )
            SELECT *
            FROM mlb_featured_market_odds_snapshots
            WHERE game_pk = ?
              AND market_key = ?
              AND snapshot_time = (SELECT snapshot_time FROM latest_snapshot)
            ORDER BY outcome_name
            """,
            (game_pk, market_key, game_pk, market_key),
        ).fetchall()
    return cache[cache_key]


def resolve_moneyline_market_snapshot(
    conn: sqlite3.Connection,
    game_pk: int,
    team_name: str,
    cache: dict[tuple[int, str], list[sqlite3.Row]],
) -> dict[str, Any] | None:
    rows = load_latest_featured_market_rows(conn, game_pk, "h2h", cache)
    if len(rows) < 2:
        return None

    normalized_team_name = normalize_team_name_for_market(team_name)
    team_row = next(
        (
            row
            for row in rows
            if normalize_team_name_for_market(row["outcome_name"]) == normalized_team_name
        ),
        None,
    )
    if not team_row:
        return None
    opponent_row = next(
        (
            row
            for row in rows
            if normalize_team_name_for_market(row["outcome_name"]) != normalized_team_name
        ),
        None,
    )
    if not opponent_row:
        return None

    team_prob = american_implied_probability(team_row["price"])
    opponent_prob = american_implied_probability(opponent_row["price"])
    if team_prob is None or opponent_prob is None:
        return None

    favorite_flag = int(team_prob > opponent_prob)
    underdog_flag = int(team_prob < opponent_prob)
    return {
        "team_prob": team_prob,
        "opponent_prob": opponent_prob,
        "favorite_flag": favorite_flag,
        "underdog_flag": underdog_flag,
    }


def resolve_totals_market_snapshot(
    conn: sqlite3.Connection,
    game_pk: int,
    cache: dict[tuple[int, str], list[sqlite3.Row]],
) -> dict[str, Any] | None:
    rows = load_latest_featured_market_rows(conn, game_pk, "totals", cache)
    if len(rows) < 2:
        return None

    point_values = [to_float(row["point"]) for row in rows if to_float(row["point"]) is not None]
    if not point_values:
        return None
    line = point_values[0]
    if any(abs((value or line) - line) > 1e-9 for value in point_values):
        return None

    over_row = next((row for row in rows if str(row["outcome_name"] or "").lower() == "over"), None)
    under_row = next((row for row in rows if str(row["outcome_name"] or "").lower() == "under"), None)
    if not over_row or not under_row:
        return None
    return {"line": line}


def build_team_market_context_row(
    conn: sqlite3.Connection,
    as_of_date: str,
    team_name: str,
    packets: list[dict[str, Any]],
    market_cache: dict[tuple[int, str], list[sqlite3.Row]],
) -> dict[str, Any] | None:
    if not packets:
        return None

    schedule_context = build_team_schedule_context(conn, as_of_date, team_name)
    last5 = packets[:5]
    last10 = packets[:10]

    def summarize(window_packets: list[dict[str, Any]]) -> dict[str, Any]:
        moneyline_packets: list[dict[str, Any]] = []
        totals_packets: list[dict[str, Any]] = []
        for packet in window_packets:
            moneyline_snapshot = resolve_moneyline_market_snapshot(conn, packet["game_pk"], team_name, market_cache)
            if moneyline_snapshot:
                moneyline_packets.append({**packet, **moneyline_snapshot})
            totals_snapshot = resolve_totals_market_snapshot(conn, packet["game_pk"], market_cache)
            if totals_snapshot:
                total_delta = (packet["total_runs_final"] or 0) - (totals_snapshot["line"] or 0.0)
                totals_packets.append(
                    {
                        **packet,
                        "line": totals_snapshot["line"],
                        "over_flag": 1 if total_delta > 0 else 0,
                        "under_flag": 1 if total_delta < 0 else 0,
                        "push_flag": 1 if abs(total_delta) <= 1e-9 else 0,
                        "total_delta": total_delta,
                    }
                )

        favorite_packets = [packet for packet in moneyline_packets if packet["favorite_flag"]]
        underdog_packets = [packet for packet in moneyline_packets if packet["underdog_flag"]]
        favorite_hold_rate = conditional_rate([packet["won_flag"] for packet in favorite_packets])
        underdog_upset_rate = conditional_rate([packet["won_flag"] for packet in underdog_packets])
        avg_total_delta = safe_mean([packet["total_delta"] for packet in totals_packets]) if totals_packets else None
        volatility_index = clamp_value(
            18
            + max(0.0, 0.6 - (favorite_hold_rate if favorite_hold_rate is not None else 0.6)) * 34
            + (underdog_upset_rate or 0.0) * 18
            + max(0.0, abs(avg_total_delta or 0.0) - 0.5) * 10,
            0,
            100,
        )
        return {
            "games_sample": len(window_packets),
            "moneyline_games_with_odds": len(moneyline_packets),
            "favorite_rate": safe_mean([packet["favorite_flag"] for packet in moneyline_packets]) if moneyline_packets else None,
            "underdog_rate": safe_mean([packet["underdog_flag"] for packet in moneyline_packets]) if moneyline_packets else None,
            "favorite_hold_rate": favorite_hold_rate,
            "underdog_upset_rate": underdog_upset_rate,
            "totals_games_with_lines": len(totals_packets),
            "over_rate": conditional_rate([packet["over_flag"] for packet in totals_packets]),
            "under_rate": conditional_rate([packet["under_flag"] for packet in totals_packets]),
            "push_rate": conditional_rate([packet["push_flag"] for packet in totals_packets]),
            "avg_total_runs_minus_line": avg_total_delta,
            "market_volatility_index": volatility_index,
        }

    last5_summary = summarize(last5)
    last10_summary = summarize(last10)
    return {
        "as_of_date": as_of_date,
        "team_name": team_name,
        "scheduled_opponent": schedule_context["scheduled_opponent"],
        "games_sample_last5": last5_summary["games_sample"],
        "games_sample_last10": last10_summary["games_sample"],
        "moneyline_games_with_odds_last5": last5_summary["moneyline_games_with_odds"],
        "moneyline_games_with_odds_last10": last10_summary["moneyline_games_with_odds"],
        "favorite_rate_last5": last5_summary["favorite_rate"],
        "favorite_rate_last10": last10_summary["favorite_rate"],
        "underdog_rate_last5": last5_summary["underdog_rate"],
        "underdog_rate_last10": last10_summary["underdog_rate"],
        "favorite_hold_rate_last5": last5_summary["favorite_hold_rate"],
        "favorite_hold_rate_last10": last10_summary["favorite_hold_rate"],
        "underdog_upset_rate_last5": last5_summary["underdog_upset_rate"],
        "underdog_upset_rate_last10": last10_summary["underdog_upset_rate"],
        "totals_games_with_lines_last5": last5_summary["totals_games_with_lines"],
        "totals_games_with_lines_last10": last10_summary["totals_games_with_lines"],
        "over_rate_last5": last5_summary["over_rate"],
        "over_rate_last10": last10_summary["over_rate"],
        "under_rate_last5": last5_summary["under_rate"],
        "under_rate_last10": last10_summary["under_rate"],
        "push_rate_last5": last5_summary["push_rate"],
        "push_rate_last10": last10_summary["push_rate"],
        "avg_total_runs_minus_line_last5": last5_summary["avg_total_runs_minus_line"],
        "avg_total_runs_minus_line_last10": last10_summary["avg_total_runs_minus_line"],
        "market_volatility_index": max(
            to_float(last5_summary["market_volatility_index"]) or 0.0,
            to_float(last10_summary["market_volatility_index"]) or 0.0,
        ),
    }


def load_team_strength_before_date(
    conn: sqlite3.Connection,
    team_name: str,
    before_date: str,
    cache: dict[tuple[str, str], dict[str, Any]],
) -> dict[str, Any]:
    cache_key = (team_name, before_date)
    if cache_key in cache:
        return cache[cache_key]

    rows = conn.execute(
        """
        SELECT
          g.game_date,
          g.game_pk,
          CASE
            WHEN g.away_team = ? THEN (COALESCE(o.away_runs_final, 0) - COALESCE(o.home_runs_final, 0))
            WHEN g.home_team = ? THEN (COALESCE(o.home_runs_final, 0) - COALESCE(o.away_runs_final, 0))
            ELSE NULL
          END AS run_diff,
          CASE
            WHEN g.away_team = ? AND COALESCE(o.away_runs_final, 0) > COALESCE(o.home_runs_final, 0) THEN 1
            WHEN g.home_team = ? AND COALESCE(o.home_runs_final, 0) > COALESCE(o.away_runs_final, 0) THEN 1
            ELSE 0
          END AS won_flag
        FROM mlb_games g
        JOIN mlb_game_outcomes o
          USING (game_pk)
        WHERE g.game_date < ?
          AND (g.away_team = ? OR g.home_team = ?)
        ORDER BY g.game_date DESC, g.game_pk DESC
        """,
        (team_name, team_name, team_name, team_name, before_date, team_name, team_name),
    ).fetchall()

    recent10 = rows[:10]
    payload = {
        "games_sample": len(rows),
        "season_win_pct": safe_mean([to_int(row["won_flag"]) or 0 for row in rows]) if rows else None,
        "recent10_win_pct": safe_mean([to_int(row["won_flag"]) or 0 for row in recent10]) if recent10 else None,
        "recent10_run_diff": safe_mean([to_float(row["run_diff"]) or 0.0 for row in recent10]) if recent10 else None,
    }
    cache[cache_key] = payload
    return payload


def build_team_opponent_quality_row(
    conn: sqlite3.Connection,
    as_of_date: str,
    team_name: str,
    packets: list[dict[str, Any]],
    strength_cache: dict[tuple[str, str], dict[str, Any]],
) -> dict[str, Any] | None:
    if not packets:
        return None

    schedule_context = build_team_schedule_context(conn, as_of_date, team_name)

    def summarize(window_packets: list[dict[str, Any]]) -> dict[str, Any]:
        opponent_rows: list[dict[str, Any]] = []
        for packet in window_packets:
            strength = load_team_strength_before_date(conn, packet["opponent_team"], packet["game_date"], strength_cache)
            opponent_rows.append({**packet, **strength})

        winning_record_rows = [
            row for row in opponent_rows if (to_float(row["season_win_pct"]) or 0.0) >= 0.5
        ]
        strong_rows = [
            row for row in opponent_rows if (to_float(row["season_win_pct"]) or 0.0) >= 0.55
        ]
        close_losses_vs_winning = sum(
            1
            for row in winning_record_rows
            if not row["won_flag"] and (to_int(row["run_diff"]) or 0) >= -2
        )
        avg_season_win_pct = safe_mean(
            [to_float(row["season_win_pct"]) for row in opponent_rows if to_float(row["season_win_pct"]) is not None]
        ) if opponent_rows else None
        avg_recent10_win_pct = safe_mean(
            [to_float(row["recent10_win_pct"]) for row in opponent_rows if to_float(row["recent10_win_pct"]) is not None]
        ) if opponent_rows else None
        avg_recent10_run_diff = safe_mean(
            [to_float(row["recent10_run_diff"]) for row in opponent_rows if to_float(row["recent10_run_diff"]) is not None]
        ) if opponent_rows else None
        toughness_index = clamp_value(
            18
            + max(0.0, (avg_season_win_pct or 0.5) - 0.5) * 120
            + max(0.0, (avg_recent10_win_pct or 0.5) - 0.5) * 90
            + max(0.0, avg_recent10_run_diff or 0.0) * 10
            + len(strong_rows) * 2,
            0,
            100,
        )
        return {
            "games_sample": len(window_packets),
            "avg_opponent_season_win_pct": avg_season_win_pct,
            "avg_opponent_recent10_win_pct": avg_recent10_win_pct,
            "avg_opponent_recent10_run_diff": avg_recent10_run_diff,
            "games_vs_winning_record": len(winning_record_rows),
            "games_vs_550": len(strong_rows),
            "win_rate_vs_winning_record": conditional_rate([row["won_flag"] for row in winning_record_rows]),
            "win_rate_vs_550": conditional_rate([row["won_flag"] for row in strong_rows]),
            "close_losses_vs_winning_record": close_losses_vs_winning,
            "schedule_toughness_index": toughness_index,
        }

    last5_summary = summarize(packets[:5])
    last10_summary = summarize(packets[:10])
    return {
        "as_of_date": as_of_date,
        "team_name": team_name,
        "scheduled_opponent": schedule_context["scheduled_opponent"],
        "games_sample_last5": last5_summary["games_sample"],
        "games_sample_last10": last10_summary["games_sample"],
        "avg_opponent_season_win_pct_last5": last5_summary["avg_opponent_season_win_pct"],
        "avg_opponent_season_win_pct_last10": last10_summary["avg_opponent_season_win_pct"],
        "avg_opponent_recent10_win_pct_last5": last5_summary["avg_opponent_recent10_win_pct"],
        "avg_opponent_recent10_win_pct_last10": last10_summary["avg_opponent_recent10_win_pct"],
        "avg_opponent_recent10_run_diff_last5": last5_summary["avg_opponent_recent10_run_diff"],
        "avg_opponent_recent10_run_diff_last10": last10_summary["avg_opponent_recent10_run_diff"],
        "games_vs_winning_record_last5": last5_summary["games_vs_winning_record"],
        "games_vs_winning_record_last10": last10_summary["games_vs_winning_record"],
        "games_vs_550_last5": last5_summary["games_vs_550"],
        "games_vs_550_last10": last10_summary["games_vs_550"],
        "win_rate_vs_winning_record_last10": last10_summary["win_rate_vs_winning_record"],
        "win_rate_vs_550_last10": last10_summary["win_rate_vs_550"],
        "close_losses_vs_winning_record_last10": last10_summary["close_losses_vs_winning_record"],
        "schedule_toughness_index_last5": last5_summary["schedule_toughness_index"],
        "schedule_toughness_index_last10": last10_summary["schedule_toughness_index"],
    }


def refresh_market_context_profiles(
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
        conn.execute("DELETE FROM mlb_team_market_context_daily WHERE as_of_date = ?", (as_of_date,))
        conn.execute("DELETE FROM mlb_team_opponent_quality_daily WHERE as_of_date = ?", (as_of_date,))
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
            conn.execute("DELETE FROM mlb_team_market_context_daily WHERE as_of_date <= ?", (through_date,))
            conn.execute("DELETE FROM mlb_team_opponent_quality_daily WHERE as_of_date <= ?", (through_date,))
        else:
            conn.execute("DELETE FROM mlb_team_market_context_daily")
            conn.execute("DELETE FROM mlb_team_opponent_quality_daily")

    market_cache: dict[tuple[int, str], list[sqlite3.Row]] = {}
    strength_cache: dict[tuple[str, str], dict[str, Any]] = {}

    for current_date in dates:
        teams = [
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
                (current_date, current_date),
            ).fetchall()
        ]

        for team_name in teams:
            packets = build_recent_team_market_packets(conn, team_name, current_date, 10)
            market_row = build_team_market_context_row(conn, current_date, team_name, packets, market_cache)
            if market_row:
                conn.execute(
                    """
                    INSERT INTO mlb_team_market_context_daily (
                      as_of_date, team_name, scheduled_opponent,
                      games_sample_last5, games_sample_last10,
                      moneyline_games_with_odds_last5, moneyline_games_with_odds_last10,
                      favorite_rate_last5, favorite_rate_last10,
                      underdog_rate_last5, underdog_rate_last10,
                      favorite_hold_rate_last5, favorite_hold_rate_last10,
                      underdog_upset_rate_last5, underdog_upset_rate_last10,
                      totals_games_with_lines_last5, totals_games_with_lines_last10,
                      over_rate_last5, over_rate_last10,
                      under_rate_last5, under_rate_last10,
                      push_rate_last5, push_rate_last10,
                      avg_total_runs_minus_line_last5, avg_total_runs_minus_line_last10,
                      market_volatility_index
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        market_row["as_of_date"],
                        market_row["team_name"],
                        market_row["scheduled_opponent"],
                        market_row["games_sample_last5"],
                        market_row["games_sample_last10"],
                        market_row["moneyline_games_with_odds_last5"],
                        market_row["moneyline_games_with_odds_last10"],
                        market_row["favorite_rate_last5"],
                        market_row["favorite_rate_last10"],
                        market_row["underdog_rate_last5"],
                        market_row["underdog_rate_last10"],
                        market_row["favorite_hold_rate_last5"],
                        market_row["favorite_hold_rate_last10"],
                        market_row["underdog_upset_rate_last5"],
                        market_row["underdog_upset_rate_last10"],
                        market_row["totals_games_with_lines_last5"],
                        market_row["totals_games_with_lines_last10"],
                        market_row["over_rate_last5"],
                        market_row["over_rate_last10"],
                        market_row["under_rate_last5"],
                        market_row["under_rate_last10"],
                        market_row["push_rate_last5"],
                        market_row["push_rate_last10"],
                        market_row["avg_total_runs_minus_line_last5"],
                        market_row["avg_total_runs_minus_line_last10"],
                        market_row["market_volatility_index"],
                    ),
                )

            opponent_row = build_team_opponent_quality_row(conn, current_date, team_name, packets, strength_cache)
            if opponent_row:
                conn.execute(
                    """
                    INSERT INTO mlb_team_opponent_quality_daily (
                      as_of_date, team_name, scheduled_opponent,
                      games_sample_last5, games_sample_last10,
                      avg_opponent_season_win_pct_last5, avg_opponent_season_win_pct_last10,
                      avg_opponent_recent10_win_pct_last5, avg_opponent_recent10_win_pct_last10,
                      avg_opponent_recent10_run_diff_last5, avg_opponent_recent10_run_diff_last10,
                      games_vs_winning_record_last5, games_vs_winning_record_last10,
                      games_vs_550_last5, games_vs_550_last10,
                      win_rate_vs_winning_record_last10, win_rate_vs_550_last10,
                      close_losses_vs_winning_record_last10,
                      schedule_toughness_index_last5, schedule_toughness_index_last10
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        opponent_row["as_of_date"],
                        opponent_row["team_name"],
                        opponent_row["scheduled_opponent"],
                        opponent_row["games_sample_last5"],
                        opponent_row["games_sample_last10"],
                        opponent_row["avg_opponent_season_win_pct_last5"],
                        opponent_row["avg_opponent_season_win_pct_last10"],
                        opponent_row["avg_opponent_recent10_win_pct_last5"],
                        opponent_row["avg_opponent_recent10_win_pct_last10"],
                        opponent_row["avg_opponent_recent10_run_diff_last5"],
                        opponent_row["avg_opponent_recent10_run_diff_last10"],
                        opponent_row["games_vs_winning_record_last5"],
                        opponent_row["games_vs_winning_record_last10"],
                        opponent_row["games_vs_550_last5"],
                        opponent_row["games_vs_550_last10"],
                        opponent_row["win_rate_vs_winning_record_last10"],
                        opponent_row["win_rate_vs_550_last10"],
                        opponent_row["close_losses_vs_winning_record_last10"],
                        opponent_row["schedule_toughness_index_last5"],
                        opponent_row["schedule_toughness_index_last10"],
                    ),
                )

    conn.commit()


def build_team_mistake_shape_game_packet(
    conn: sqlite3.Connection,
    game_row: sqlite3.Row,
    team_name: str,
) -> dict[str, Any] | None:
    team_role = "away" if game_row["away_team"] == team_name else "home"
    opponent_team = game_row["home_team"] if team_role == "away" else game_row["away_team"]
    stats_row = conn.execute(
        """
        SELECT
          runs_scored,
          runs_allowed,
          hits,
          walks,
          left_on_base,
          bullpen_runs_allowed
        FROM mlb_game_team_stats
        WHERE game_pk = ?
          AND team_name = ?
        LIMIT 1
        """,
        (game_row["game_pk"], team_name),
    ).fetchone()
    if not stats_row:
        return None

    batting_rows = conn.execute(
        """
        SELECT
          pa.inning,
          lower(COALESCE(pa.event_type, '')) AS event_type,
          pa.run_delta,
          pgb.batting_order
        FROM mlb_plate_appearances pa
        LEFT JOIN mlb_player_game_batting pgb
          ON pgb.game_pk = pa.game_pk
         AND pgb.player_id = pa.batter_id
         AND pgb.team_name = pa.batting_team
        WHERE pa.game_pk = ?
          AND pa.batting_team = ?
        ORDER BY pa.at_bat_index
        """,
        (game_row["game_pk"], team_name),
    ).fetchall()
    fielding_rows = conn.execute(
        """
        SELECT
          inning,
          lower(COALESCE(event_type, '')) AS event_type,
          run_delta
        FROM mlb_plate_appearances
        WHERE game_pk = ?
          AND batting_team = ?
        ORDER BY at_bat_index
        """,
        (game_row["game_pk"], opponent_team),
    ).fetchall()

    runs_by_inning: dict[int, int] = {}
    runs_allowed_by_inning: dict[int, int] = {}
    baserunners = 0
    early_baserunners = 0
    top_order_baserunners_first3 = 0

    for row in batting_rows:
        inning = to_int(row["inning"]) or 0
        event_type = row["event_type"]
        run_delta = to_int(row["run_delta"]) or 0
        runs_by_inning[inning] = runs_by_inning.get(inning, 0) + run_delta
        if is_on_base_event(event_type):
            baserunners += 1
            if inning <= 3:
                early_baserunners += 1
                batting_order = to_int(row["batting_order"])
                if batting_order is not None and batting_order <= 4:
                    top_order_baserunners_first3 += 1

    for row in fielding_rows:
        inning = to_int(row["inning"]) or 0
        run_delta = to_int(row["run_delta"]) or 0
        runs_allowed_by_inning[inning] = runs_allowed_by_inning.get(inning, 0) + run_delta

    team_runs_final = to_int(stats_row["runs_scored"]) or 0
    first3_runs = sum(runs for inning, runs in runs_by_inning.items() if inning <= 3)
    first3_runs_allowed = sum(runs for inning, runs in runs_allowed_by_inning.items() if inning <= 3)
    first_inning_runs_allowed = runs_allowed_by_inning.get(1, 0)
    max_runs_in_inning = max(runs_by_inning.values(), default=0)
    max_runs_allowed_in_inning = max(runs_allowed_by_inning.values(), default=0)
    left_on_base = to_int(stats_row["left_on_base"]) or 0
    baserunner_conversion_rate = (team_runs_final / baserunners) if baserunners else None
    stranded_traffic_rate = (left_on_base / baserunners) if baserunners else None
    run_clustering_share = (max_runs_in_inning / team_runs_final) if team_runs_final > 0 else 0.0
    traffic_no_conversion_flag = (
        to_int(game_row["away_traffic_no_conversion_flag"]) or 0
        if team_role == "away"
        else to_int(game_row["home_traffic_no_conversion_flag"]) or 0
    )

    return {
        "game_pk": game_row["game_pk"],
        "game_date": game_row["game_date"],
        "team_name": team_name,
        "team_role": team_role,
        "opponent_team": opponent_team,
        "road_game_flag": 1 if team_role == "away" else 0,
        "series_game_number": to_int(game_row["series_game_number"]),
        "team_runs_final": team_runs_final,
        "team_runs_allowed_final": to_int(stats_row["runs_allowed"]) or 0,
        "batter_baserunners": baserunners,
        "early_baserunners": early_baserunners,
        "top_order_baserunners_first3": top_order_baserunners_first3,
        "left_on_base": left_on_base,
        "runs_per_baserunner": baserunner_conversion_rate,
        "stranded_traffic_rate": stranded_traffic_rate,
        "first3_runs": first3_runs,
        "first3_runs_allowed": first3_runs_allowed,
        "first_inning_runs_allowed": first_inning_runs_allowed,
        "max_runs_in_inning": max_runs_in_inning,
        "max_runs_allowed_in_inning": max_runs_allowed_in_inning,
        "low_scoring_flag": 1 if team_runs_final <= 2 else 0,
        "high_scoring_flag": 1 if team_runs_final >= 7 else 0,
        "scoreless_first3_flag": 1 if first3_runs == 0 else 0,
        "first_inning_run_allowed_flag": 1 if first_inning_runs_allowed > 0 else 0,
        "early_multi_run_allowed_flag": 1 if first3_runs_allowed >= 2 else 0,
        "one_big_inning_flag": 1 if max_runs_in_inning >= 3 else 0,
        "one_bad_inning_allowed_flag": 1 if max_runs_allowed_in_inning >= 3 else 0,
        "traffic_game_flag": 1 if baserunners >= 10 else 0,
        "dead_bat_traffic_flag": 1 if baserunners >= 8 and team_runs_final <= 2 else 0,
        "traffic_no_conversion_flag": traffic_no_conversion_flag,
        "top_order_pressure_no_conversion_flag": 1 if top_order_baserunners_first3 >= 3 and first3_runs == 0 else 0,
        "quiet_first5_flag": to_int(game_row["quiet_first5_flag"]) or 0,
        "bullpen_meltdown_flag": 1 if (to_int(stats_row["bullpen_runs_allowed"]) or 0) >= 3 else 0,
        "run_clustering_share": run_clustering_share,
    }


def build_recent_team_mistake_shape_packets(
    conn: sqlite3.Connection,
    team_name: str,
    as_of_date: str,
    window_games: int,
) -> list[dict[str, Any]]:
    recent_games = conn.execute(
        """
        SELECT
          g.game_pk,
          g.game_date,
          g.away_team,
          g.home_team,
          s.quiet_first5_flag,
          s.away_traffic_no_conversion_flag,
          s.home_traffic_no_conversion_flag,
          sx.series_game_number
        FROM mlb_games g
        LEFT JOIN mlb_game_story_signals s
          USING (game_pk)
        LEFT JOIN mlb_series_context_snapshots sx
          ON sx.game_pk = g.game_pk
         AND sx.as_of_date = g.game_date
        WHERE g.game_date < ?
          AND (g.away_team = ? OR g.home_team = ?)
        ORDER BY g.game_date DESC, g.game_pk DESC
        LIMIT ?
        """,
        (as_of_date, team_name, team_name, window_games),
    ).fetchall()

    packets: list[dict[str, Any]] = []
    for row in recent_games:
        packet = build_team_mistake_shape_game_packet(conn, row, team_name)
        if packet:
            packets.append(packet)
    return packets


def build_team_mistake_shape_row(
    conn: sqlite3.Connection,
    as_of_date: str,
    team_name: str,
    window_games: int,
    packets: list[dict[str, Any]],
) -> dict[str, Any] | None:
    if not packets:
        return None

    schedule_context = build_team_schedule_context(conn, as_of_date, team_name)
    baserunner_total = sum(packet["batter_baserunners"] for packet in packets)
    run_total = sum(packet["team_runs_final"] for packet in packets)
    lob_total = sum(packet["left_on_base"] for packet in packets)
    low_scoring_rate = safe_mean([packet["low_scoring_flag"] for packet in packets])
    high_scoring_rate = safe_mean([packet["high_scoring_flag"] for packet in packets])
    scoreless_first3_rate = safe_mean([packet["scoreless_first3_flag"] for packet in packets])
    first_inning_run_allowed_rate = safe_mean([packet["first_inning_run_allowed_flag"] for packet in packets])
    early_multi_run_allowed_rate = safe_mean([packet["early_multi_run_allowed_flag"] for packet in packets])
    one_big_inning_rate = safe_mean([packet["one_big_inning_flag"] for packet in packets])
    one_bad_inning_allowed_rate = safe_mean([packet["one_bad_inning_allowed_flag"] for packet in packets])
    traffic_game_rate = safe_mean([packet["traffic_game_flag"] for packet in packets])
    dead_bat_traffic_rate = safe_mean([packet["dead_bat_traffic_flag"] for packet in packets])
    traffic_no_conversion_rate = safe_mean([packet["traffic_no_conversion_flag"] for packet in packets])
    top_order_pressure_no_conversion_rate = safe_mean([packet["top_order_pressure_no_conversion_flag"] for packet in packets])
    bullpen_meltdown_rate = safe_mean([packet["bullpen_meltdown_flag"] for packet in packets])
    base_runner_conversion_rate = (run_total / baserunner_total) if baserunner_total else None
    stranded_traffic_rate = (lob_total / baserunner_total) if baserunner_total else None
    run_clustering_index = clamp_value(
        14
        + safe_mean([packet["run_clustering_share"] for packet in packets]) * 52
        + safe_pstdev([packet["team_runs_final"] for packet in packets]) * 6
        + one_big_inning_rate * 16
        + one_bad_inning_allowed_rate * 8,
        0,
        100,
    )
    mistake_chaos_index = clamp_value(
        12
        + low_scoring_rate * 12
        + high_scoring_rate * 10
        + scoreless_first3_rate * 10
        + early_multi_run_allowed_rate * 14
        + one_bad_inning_allowed_rate * 18
        + traffic_no_conversion_rate * 18
        + bullpen_meltdown_rate * 16
        + run_clustering_index * 0.26,
        0,
        100,
    )

    return {
        "as_of_date": as_of_date,
        "team_name": team_name,
        "scheduled_opponent": schedule_context["scheduled_opponent"],
        "scheduled_series_game_number": schedule_context["scheduled_series_game_number"],
        "division_matchup_flag": schedule_context["division_matchup_flag"],
        "window_games": window_games,
        "games_sample": len(packets),
        "road_games_sample": sum(packet["road_game_flag"] for packet in packets),
        "low_scoring_game_rate": low_scoring_rate,
        "high_scoring_game_rate": high_scoring_rate,
        "scoreless_first3_rate": scoreless_first3_rate,
        "first_inning_run_allowed_rate": first_inning_run_allowed_rate,
        "early_multi_run_allowed_rate": early_multi_run_allowed_rate,
        "one_big_inning_rate": one_big_inning_rate,
        "one_bad_inning_allowed_rate": one_bad_inning_allowed_rate,
        "traffic_game_rate": traffic_game_rate,
        "dead_bat_traffic_rate": dead_bat_traffic_rate,
        "traffic_no_conversion_rate": traffic_no_conversion_rate,
        "base_runner_conversion_rate": base_runner_conversion_rate,
        "stranded_traffic_rate": stranded_traffic_rate,
        "top_order_pressure_no_conversion_rate": top_order_pressure_no_conversion_rate,
        "bullpen_meltdown_rate": bullpen_meltdown_rate,
        "run_clustering_index": run_clustering_index,
        "mistake_chaos_index": mistake_chaos_index,
    }


def build_lineup_conversion_shape_row(
    conn: sqlite3.Connection,
    as_of_date: str,
    team_name: str,
    window_games: int,
    packets: list[dict[str, Any]],
) -> dict[str, Any] | None:
    if not packets:
        return None

    schedule_context = build_team_schedule_context(conn, as_of_date, team_name)
    baserunner_total = sum(packet["batter_baserunners"] for packet in packets)
    early_baserunner_total = sum(packet["early_baserunners"] for packet in packets)
    top_order_baserunner_total = sum(packet["top_order_baserunners_first3"] for packet in packets)
    run_total = sum(packet["team_runs_final"] for packet in packets)
    first3_run_total = sum(packet["first3_runs"] for packet in packets)
    lob_total = sum(packet["left_on_base"] for packet in packets)
    runs_per_baserunner = (run_total / baserunner_total) if baserunner_total else None
    early_conversion_rate = (first3_run_total / early_baserunner_total) if early_baserunner_total else None
    top_order_conversion_share = (
        first3_run_total / top_order_baserunner_total if top_order_baserunner_total else None
    )
    stranded_traffic_rate = (lob_total / baserunner_total) if baserunner_total else None
    conversion_values = [packet["runs_per_baserunner"] for packet in packets if packet["runs_per_baserunner"] is not None]
    conversion_volatility = safe_pstdev(conversion_values) if conversion_values else 0.0
    lineup_conversion_index = clamp_value(
        24
        + (runs_per_baserunner or 0.0) * 120
        + (early_conversion_rate or 0.0) * 34
        + (top_order_conversion_share or 0.0) * 18
        - (stranded_traffic_rate or 0.0) * 32
        - safe_mean([packet["dead_bat_traffic_flag"] for packet in packets]) * 18
        - safe_mean([packet["traffic_no_conversion_flag"] for packet in packets]) * 18
        - safe_mean([packet["quiet_first5_flag"] for packet in packets]) * 10
        - conversion_volatility * 26,
        0,
        100,
    )

    return {
        "as_of_date": as_of_date,
        "team_name": team_name,
        "scheduled_opponent": schedule_context["scheduled_opponent"],
        "scheduled_series_game_number": schedule_context["scheduled_series_game_number"],
        "division_matchup_flag": schedule_context["division_matchup_flag"],
        "window_games": window_games,
        "games_sample": len(packets),
        "baserunners_per_game": (baserunner_total / len(packets)) if packets else None,
        "runs_per_baserunner": runs_per_baserunner,
        "stranded_traffic_rate": stranded_traffic_rate,
        "early_baserunners_per_game": (early_baserunner_total / len(packets)) if packets else None,
        "early_conversion_rate": early_conversion_rate,
        "top_order_baserunners_first3_per_game": (top_order_baserunner_total / len(packets)) if packets else None,
        "top_order_conversion_share": top_order_conversion_share,
        "traffic_no_conversion_rate": safe_mean([packet["traffic_no_conversion_flag"] for packet in packets]),
        "dead_bat_traffic_rate": safe_mean([packet["dead_bat_traffic_flag"] for packet in packets]),
        "quiet_first5_rate": safe_mean([packet["quiet_first5_flag"] for packet in packets]),
        "conversion_volatility": conversion_volatility,
        "lineup_conversion_index": lineup_conversion_index,
    }


def build_recent_team_first_inning_packets(
    conn: sqlite3.Connection, team_name: str, as_of_date: str, window_games: int
) -> list[dict[str, Any]]:
    recent_games = conn.execute(
        """
        SELECT
          phase.game_pk,
          phase.game_date,
          phase.runs_first1,
          phase.scored_first_inning_flag,
          phase.allowed_first_inning_flag,
          opp.runs_first1 AS opp_runs_first1,
          g.away_team,
          g.home_team
        FROM mlb_phase_outcomes_daily phase
        JOIN mlb_phase_outcomes_daily opp
          ON opp.game_pk = phase.game_pk
         AND opp.team_name != phase.team_name
        JOIN mlb_games g
          ON g.game_pk = phase.game_pk
        WHERE phase.team_name = ?
          AND phase.game_date < ?
        ORDER BY phase.game_date DESC, phase.game_pk DESC
        LIMIT ?
        """,
        (team_name, as_of_date, window_games),
    ).fetchall()

    packets: list[dict[str, Any]] = []
    for row in recent_games:
        runs_first1 = to_int(row["runs_first1"]) or 0
        opp_runs_first1 = to_int(row["opp_runs_first1"]) or 0
        packets.append(
            {
                "road_game_flag": 1 if row["away_team"] == team_name else 0,
                "runs_first1": runs_first1,
                "opp_runs_first1": opp_runs_first1,
                "scored_first_inning_flag": to_int(row["scored_first_inning_flag"]) or 0,
                "allowed_first_inning_flag": to_int(row["allowed_first_inning_flag"]) or 0,
                "first_inning_multi_run_flag": 1 if runs_first1 >= 2 else 0,
                "first_inning_multi_run_allowed_flag": 1 if opp_runs_first1 >= 2 else 0,
                "nrfi_flag": 1 if runs_first1 == 0 and opp_runs_first1 == 0 else 0,
                "yrfi_flag": 1 if runs_first1 > 0 or opp_runs_first1 > 0 else 0,
                "first_inning_net_runs": runs_first1 - opp_runs_first1,
            }
        )
    return packets


def build_team_first_inning_profile_row(
    conn: sqlite3.Connection,
    as_of_date: str,
    team_name: str,
    window_games: int,
    packets: list[dict[str, Any]],
) -> dict[str, Any] | None:
    if not packets:
        return None

    schedule_context = build_team_schedule_context(conn, as_of_date, team_name)
    games_sample = len(packets)
    first_inning_runs_per_game = safe_mean([packet["runs_first1"] for packet in packets])
    first_inning_runs_allowed_per_game = safe_mean([packet["opp_runs_first1"] for packet in packets])
    scored_first_inning_rate = safe_mean([packet["scored_first_inning_flag"] for packet in packets])
    scoreless_first_inning_rate = safe_mean([1 - packet["scored_first_inning_flag"] for packet in packets])
    allowed_first_inning_rate = safe_mean([packet["allowed_first_inning_flag"] for packet in packets])
    first_inning_multi_run_rate = safe_mean([packet["first_inning_multi_run_flag"] for packet in packets])
    first_inning_multi_run_allowed_rate = safe_mean(
        [packet["first_inning_multi_run_allowed_flag"] for packet in packets]
    )
    nrfi_game_rate = safe_mean([packet["nrfi_flag"] for packet in packets])
    yrfi_game_rate = safe_mean([packet["yrfi_flag"] for packet in packets])
    first_inning_net_edge = safe_mean([packet["first_inning_net_runs"] for packet in packets])
    first_inning_scoring_index = clamp_value(
        34
        + scored_first_inning_rate * 84
        + (first_inning_runs_per_game or 0.0) * 34
        + first_inning_multi_run_rate * 18
        - scoreless_first_inning_rate * 12,
        0,
        100,
    )
    first_inning_allow_risk_index = clamp_value(
        24
        + allowed_first_inning_rate * 92
        + (first_inning_runs_allowed_per_game or 0.0) * 38
        + first_inning_multi_run_allowed_rate * 22
        + max((yrfi_game_rate or 0.0) - 0.5, 0.0) * 20,
        0,
        100,
    )

    return {
        "as_of_date": as_of_date,
        "team_name": team_name,
        "scheduled_opponent": schedule_context["scheduled_opponent"],
        "scheduled_series_game_number": schedule_context["scheduled_series_game_number"],
        "division_matchup_flag": schedule_context["division_matchup_flag"],
        "window_games": window_games,
        "games_sample": games_sample,
        "road_games_sample": sum(packet["road_game_flag"] for packet in packets),
        "first_inning_runs_per_game": first_inning_runs_per_game,
        "first_inning_runs_allowed_per_game": first_inning_runs_allowed_per_game,
        "scored_first_inning_rate": scored_first_inning_rate,
        "scoreless_first_inning_rate": scoreless_first_inning_rate,
        "allowed_first_inning_rate": allowed_first_inning_rate,
        "first_inning_multi_run_rate": first_inning_multi_run_rate,
        "first_inning_multi_run_allowed_rate": first_inning_multi_run_allowed_rate,
        "nrfi_game_rate": nrfi_game_rate,
        "yrfi_game_rate": yrfi_game_rate,
        "first_inning_net_edge": first_inning_net_edge,
        "first_inning_scoring_index": first_inning_scoring_index,
        "first_inning_allow_risk_index": first_inning_allow_risk_index,
    }


def build_pitcher_first_inning_profile_row(
    conn: sqlite3.Connection,
    as_of_date: str,
    team_name: str,
    scheduled_opponent: str | None,
    pitcher_id: int,
    pitcher_name: str,
    window_starts: int,
    start_rows: list[sqlite3.Row],
) -> dict[str, Any] | None:
    if not start_rows:
        return None

    start_packets: list[dict[str, Any]] = []
    for start_row in start_rows:
        pa_rows = conn.execute(
            """
            SELECT at_bat_index, lower(COALESCE(event_type, '')) AS event_type, run_delta
            FROM mlb_plate_appearances
            WHERE game_pk = ?
              AND pitcher_id = ?
              AND inning = 1
            ORDER BY at_bat_index
            """,
            (start_row["game_pk"], pitcher_id),
        ).fetchall()
        if not pa_rows:
            continue

        first_pa = pa_rows[0]
        baserunners = 0
        runs_allowed = 0
        walk_flag = 0
        home_run_flag = 0

        for row in pa_rows:
            event_type = row["event_type"]
            run_delta = to_int(row["run_delta"]) or 0
            runs_allowed += run_delta
            if is_on_base_event(event_type):
                baserunners += 1
            if event_type in {"walk", "intent_walk", "hit_by_pitch"}:
                walk_flag = 1
            if event_type == "home_run":
                home_run_flag = 1

        start_packets.append(
            {
                "first_batter_reach_flag": 1 if is_on_base_event(first_pa["event_type"]) else 0,
                "first_inning_run_allowed_flag": 1 if runs_allowed > 0 else 0,
                "first_inning_multi_run_allowed_flag": 1 if runs_allowed >= 2 else 0,
                "first_inning_runs_allowed": runs_allowed,
                "first_inning_baserunners": baserunners,
                "first_inning_walk_flag": walk_flag,
                "first_inning_home_run_flag": home_run_flag,
                "first_inning_clean_flag": 1 if runs_allowed == 0 else 0,
            }
        )

    if not start_packets:
        return None

    starts_sample = len(start_packets)
    first_batter_reach_rate = safe_mean([packet["first_batter_reach_flag"] for packet in start_packets])
    first_inning_run_allowed_rate = safe_mean([packet["first_inning_run_allowed_flag"] for packet in start_packets])
    first_inning_runs_allowed_per_start = safe_mean([packet["first_inning_runs_allowed"] for packet in start_packets])
    first_inning_multi_run_allowed_rate = safe_mean(
        [packet["first_inning_multi_run_allowed_flag"] for packet in start_packets]
    )
    first_inning_baserunners_per_start = safe_mean(
        [packet["first_inning_baserunners"] for packet in start_packets]
    )
    first_inning_walk_rate = safe_mean([packet["first_inning_walk_flag"] for packet in start_packets])
    first_inning_home_run_rate = safe_mean([packet["first_inning_home_run_flag"] for packet in start_packets])
    first_inning_clean_rate = safe_mean([packet["first_inning_clean_flag"] for packet in start_packets])
    first_inning_pressure_index = clamp_value(
        12
        + first_batter_reach_rate * 18
        + first_inning_run_allowed_rate * 28
        + (first_inning_runs_allowed_per_start or 0.0) * 16
        + first_inning_multi_run_allowed_rate * 18
        + (first_inning_baserunners_per_start or 0.0) * 8
        + first_inning_walk_rate * 12
        + first_inning_home_run_rate * 14
        - first_inning_clean_rate * 8,
        0,
        100,
    )

    return {
        "as_of_date": as_of_date,
        "pitcher_id": pitcher_id,
        "pitcher_name": pitcher_name,
        "team_name": team_name,
        "scheduled_opponent": scheduled_opponent,
        "window_starts": window_starts,
        "starts_sample": starts_sample,
        "first_batter_reach_rate": first_batter_reach_rate,
        "first_inning_run_allowed_rate": first_inning_run_allowed_rate,
        "first_inning_runs_allowed_per_start": first_inning_runs_allowed_per_start,
        "first_inning_multi_run_allowed_rate": first_inning_multi_run_allowed_rate,
        "first_inning_baserunners_per_start": first_inning_baserunners_per_start,
        "first_inning_walk_rate": first_inning_walk_rate,
        "first_inning_home_run_rate": first_inning_home_run_rate,
        "first_inning_clean_rate": first_inning_clean_rate,
        "first_inning_pressure_index": first_inning_pressure_index,
    }


def build_pitcher_mistake_shape_row(
    conn: sqlite3.Connection,
    as_of_date: str,
    team_name: str,
    scheduled_opponent: str | None,
    pitcher_id: int,
    pitcher_name: str,
    window_starts: int,
    start_rows: list[sqlite3.Row],
) -> dict[str, Any] | None:
    if not start_rows:
        return None

    start_packets: list[dict[str, Any]] = []
    for start_row in start_rows:
        log_row = conn.execute(
            """
            SELECT outs_recorded, runs_allowed, home_runs_allowed, walks_allowed
            FROM mlb_starting_pitcher_game_logs
            WHERE game_pk = ?
              AND pitcher_id = ?
            LIMIT 1
            """,
            (start_row["game_pk"], pitcher_id),
        ).fetchone()
        if not log_row:
            continue

        pa_rows = conn.execute(
            """
            SELECT inning, lower(COALESCE(event_type, '')) AS event_type, run_delta
            FROM mlb_plate_appearances
            WHERE game_pk = ?
              AND pitcher_id = ?
            ORDER BY at_bat_index
            """,
            (start_row["game_pk"], pitcher_id),
        ).fetchall()
        if not pa_rows:
            continue

        first_pa = pa_rows[0]
        runs_by_inning: dict[int, int] = {}
        walks_by_inning: dict[int, int] = {}
        total_runs_allowed = 0
        first_damage_seen = False
        additional_runs_after_damage = 0

        for row in pa_rows:
            inning = to_int(row["inning"]) or 0
            event_type = row["event_type"]
            run_delta = to_int(row["run_delta"]) or 0
            runs_by_inning[inning] = runs_by_inning.get(inning, 0) + run_delta
            total_runs_allowed += run_delta
            if event_type in {"walk", "intent_walk", "hit_by_pitch"}:
                walks_by_inning[inning] = walks_by_inning.get(inning, 0) + 1
            if run_delta > 0:
                if first_damage_seen:
                    additional_runs_after_damage += run_delta
                else:
                    first_damage_seen = True

        first_inning_runs = runs_by_inning.get(1, 0)
        first_three_runs = sum(runs for inning, runs in runs_by_inning.items() if inning <= 3)
        max_runs_inning = max(runs_by_inning.values(), default=0)
        reached_sixth_flag = int(any(inning >= 6 for inning in runs_by_inning) or (to_int(log_row["outs_recorded"]) or 0) >= 16)
        sixth_plus_runs = sum(runs for inning, runs in runs_by_inning.items() if inning >= 6)
        start_packets.append(
            {
                "first_batter_reach_flag": 1 if is_on_base_event(first_pa["event_type"]) else 0,
                "first_inning_run_allowed_flag": 1 if first_inning_runs > 0 else 0,
                "first_three_runs": first_three_runs,
                "early_clean_start_flag": 1 if first_three_runs <= 1 else 0,
                "meltdown_start_flag": 1 if max_runs_inning >= 3 or (to_int(log_row["runs_allowed"]) or 0) >= 4 else 0,
                "walk_burst_start_flag": 1 if max(walks_by_inning.values(), default=0) >= 2 or (to_int(log_row["walks_allowed"]) or 0) >= 4 else 0,
                "home_run_start_flag": 1 if (to_int(log_row["home_runs_allowed"]) or 0) > 0 else 0,
                "reached_sixth_flag": reached_sixth_flag,
                "sixth_inning_damage_flag": 1 if reached_sixth_flag and sixth_plus_runs > 0 else 0,
                "damage_allowed_flag": 1 if total_runs_allowed > 0 else 0,
                "post_damage_recovery_flag": 1 if total_runs_allowed > 0 and additional_runs_after_damage <= 1 else 0,
            }
        )

    if not start_packets:
        return None

    starts_reaching_sixth = sum(packet["reached_sixth_flag"] for packet in start_packets)
    starts_with_damage = sum(packet["damage_allowed_flag"] for packet in start_packets)
    first_batter_reach_rate = safe_mean([packet["first_batter_reach_flag"] for packet in start_packets])
    first_inning_run_allowed_rate = safe_mean([packet["first_inning_run_allowed_flag"] for packet in start_packets])
    first_three_runs_allowed_per_start = safe_mean([packet["first_three_runs"] for packet in start_packets])
    early_clean_start_rate = safe_mean([packet["early_clean_start_flag"] for packet in start_packets])
    meltdown_start_rate = safe_mean([packet["meltdown_start_flag"] for packet in start_packets])
    walk_burst_start_rate = safe_mean([packet["walk_burst_start_flag"] for packet in start_packets])
    home_run_start_rate = safe_mean([packet["home_run_start_flag"] for packet in start_packets])
    sixth_inning_damage_rate = (
        sum(packet["sixth_inning_damage_flag"] for packet in start_packets if packet["reached_sixth_flag"]) / starts_reaching_sixth
        if starts_reaching_sixth
        else None
    )
    post_damage_recovery_rate = (
        sum(packet["post_damage_recovery_flag"] for packet in start_packets if packet["damage_allowed_flag"]) / starts_with_damage
        if starts_with_damage
        else None
    )
    command_break_index = clamp_value(
        16
        + first_batter_reach_rate * 18
        + first_inning_run_allowed_rate * 24
        + walk_burst_start_rate * 18
        + meltdown_start_rate * 18
        + home_run_start_rate * 10
        + (sixth_inning_damage_rate or 0.0) * 14
        + max(0.0, 0.6 - (post_damage_recovery_rate if post_damage_recovery_rate is not None else 0.6)) * 22,
        0,
        100,
    )

    return {
        "as_of_date": as_of_date,
        "pitcher_id": pitcher_id,
        "pitcher_name": pitcher_name,
        "team_name": team_name,
        "scheduled_opponent": scheduled_opponent,
        "window_starts": window_starts,
        "starts_sample": len(start_packets),
        "starts_reaching_sixth": starts_reaching_sixth,
        "starts_with_damage": starts_with_damage,
        "first_batter_reach_rate": first_batter_reach_rate,
        "first_inning_run_allowed_rate": first_inning_run_allowed_rate,
        "first_three_runs_allowed_per_start": first_three_runs_allowed_per_start,
        "early_clean_start_rate": early_clean_start_rate,
        "meltdown_start_rate": meltdown_start_rate,
        "walk_burst_start_rate": walk_burst_start_rate,
        "home_run_start_rate": home_run_start_rate,
        "sixth_inning_damage_rate": sixth_inning_damage_rate,
        "post_damage_recovery_rate": post_damage_recovery_rate,
        "command_break_index": command_break_index,
    }


def build_bullpen_mistake_shape_row(
    conn: sqlite3.Connection,
    as_of_date: str,
    team_name: str,
    window_days: int,
) -> dict[str, Any] | None:
    schedule_context = build_team_schedule_context(conn, as_of_date, team_name)
    cutoff_date = (datetime.strptime(as_of_date, "%Y-%m-%d").date() - timedelta(days=window_days)).isoformat()
    appearance_rows = conn.execute(
        """
        SELECT
          game_pk,
          pitcher_id,
          runs_allowed,
          home_runs_allowed,
          walks_allowed
        FROM mlb_pitcher_appearances
        WHERE team_name = ?
          AND pitcher_role = 'reliever'
          AND game_date < ?
          AND game_date >= ?
        ORDER BY game_date DESC, game_pk DESC, entry_order ASC
        """,
        (team_name, as_of_date, cutoff_date),
    ).fetchall()
    game_rows = conn.execute(
        """
        SELECT
          g.game_pk,
          g.game_date,
          g.away_team,
          g.home_team,
          s.quiet_first5_flag,
          s.away_traffic_no_conversion_flag,
          s.home_traffic_no_conversion_flag,
          sx.series_game_number
        FROM mlb_games g
        LEFT JOIN mlb_game_story_signals s USING (game_pk)
        LEFT JOIN mlb_series_context_snapshots sx
          ON sx.game_pk = g.game_pk
         AND sx.as_of_date = g.game_date
        WHERE g.game_date < ?
          AND g.game_date >= ?
          AND (g.away_team = ? OR g.home_team = ?)
        ORDER BY g.game_date DESC, g.game_pk DESC
        """,
        (as_of_date, cutoff_date, team_name, team_name),
    ).fetchall()

    appearance_packets: list[dict[str, Any]] = []
    for appearance_row in appearance_rows:
        pa_rows = conn.execute(
            """
            SELECT
              lower(COALESCE(event_type, '')) AS event_type,
              run_delta,
              base_state_start
            FROM mlb_plate_appearances
            WHERE game_pk = ?
              AND pitcher_id = ?
            ORDER BY at_bat_index
            """,
            (appearance_row["game_pk"], appearance_row["pitcher_id"]),
        ).fetchall()
        if not pa_rows:
            continue
        first_pa = pa_rows[0]
        inherited_state = str(first_pa["base_state_start"] or "").strip().lower()
        inherited_traffic_flag = int(bool(inherited_state) and inherited_state not in {"empty", "bases empty"})
        appearance_packets.append(
            {
                "first_batter_reach_flag": 1 if is_on_base_event(first_pa["event_type"]) else 0,
                "first_batter_walk_flag": 1 if first_pa["event_type"] in {"walk", "intent_walk", "hit_by_pitch"} else 0,
                "meltdown_appearance_flag": 1 if (to_int(appearance_row["runs_allowed"]) or 0) >= 2 else 0,
                "home_run_appearance_flag": 1 if (to_int(appearance_row["home_runs_allowed"]) or 0) > 0 else 0,
                "inherited_traffic_entry_flag": inherited_traffic_flag,
                "inherited_traffic_score_flag": 1
                if inherited_traffic_flag and sum(to_int(row["run_delta"]) or 0 for row in pa_rows) > 0
                else 0,
            }
        )

    if not appearance_packets:
        return None

    game_packets: list[dict[str, Any]] = []
    for row in game_rows:
        packet = build_team_mistake_shape_game_packet(conn, row, team_name)
        if packet:
            game_packets.append(packet)
    lead_after5_loss_rate = 0.0
    lead_after5_packets = [packet for packet in build_recent_team_hidden_edge_packets(conn, team_name, as_of_date, 30) if packet["game_date"] >= cutoff_date and packet["lead_after5_flag"]]
    if lead_after5_packets:
        lead_after5_loss_rate = safe_mean([1 - packet["won_flag"] for packet in lead_after5_packets])

    first_batter_reach_rate = safe_mean([packet["first_batter_reach_flag"] for packet in appearance_packets])
    first_batter_walk_rate = safe_mean([packet["first_batter_walk_flag"] for packet in appearance_packets])
    meltdown_appearance_rate = safe_mean([packet["meltdown_appearance_flag"] for packet in appearance_packets])
    home_run_appearance_rate = safe_mean([packet["home_run_appearance_flag"] for packet in appearance_packets])
    inherited_traffic_entry_rate = safe_mean([packet["inherited_traffic_entry_flag"] for packet in appearance_packets])
    inherited_traffic_score_rate = (
        sum(packet["inherited_traffic_score_flag"] for packet in appearance_packets if packet["inherited_traffic_entry_flag"])
        / sum(packet["inherited_traffic_entry_flag"] for packet in appearance_packets)
        if any(packet["inherited_traffic_entry_flag"] for packet in appearance_packets)
        else None
    )
    bullpen_meltdown_game_rate = (
        safe_mean([packet["bullpen_meltdown_flag"] for packet in game_packets]) if game_packets else None
    )
    bridge_clean_game_rate = (
        safe_mean([1 if not packet["bullpen_meltdown_flag"] and packet["team_runs_allowed_final"] <= 4 else 0 for packet in game_packets])
        if game_packets
        else None
    )
    bullpen_chaos_index = clamp_value(
        18
        + first_batter_reach_rate * 18
        + first_batter_walk_rate * 18
        + meltdown_appearance_rate * 16
        + home_run_appearance_rate * 12
        + (inherited_traffic_score_rate or 0.0) * 18
        + (bullpen_meltdown_game_rate or 0.0) * 18
        + lead_after5_loss_rate * 14,
        0,
        100,
    )

    return {
        "as_of_date": as_of_date,
        "team_name": team_name,
        "scheduled_opponent": schedule_context["scheduled_opponent"],
        "window_days": window_days,
        "appearances_sample": len(appearance_packets),
        "games_sample": len(game_packets),
        "first_batter_reach_rate": first_batter_reach_rate,
        "first_batter_walk_rate": first_batter_walk_rate,
        "meltdown_appearance_rate": meltdown_appearance_rate,
        "home_run_appearance_rate": home_run_appearance_rate,
        "inherited_traffic_entry_rate": inherited_traffic_entry_rate,
        "inherited_traffic_score_rate": inherited_traffic_score_rate,
        "bullpen_meltdown_game_rate": bullpen_meltdown_game_rate,
        "lead_loss_after_entry_rate": lead_after5_loss_rate,
        "bridge_clean_game_rate": bridge_clean_game_rate,
        "bullpen_chaos_index": bullpen_chaos_index,
    }


def refresh_mistake_shape_profiles(
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
        conn.execute("DELETE FROM mlb_team_mistake_shape_daily WHERE as_of_date = ?", (as_of_date,))
        conn.execute("DELETE FROM mlb_pitcher_mistake_shape_daily WHERE as_of_date = ?", (as_of_date,))
        conn.execute("DELETE FROM mlb_bullpen_mistake_shape_daily WHERE as_of_date = ?", (as_of_date,))
        conn.execute("DELETE FROM mlb_lineup_conversion_shape_daily WHERE as_of_date = ?", (as_of_date,))
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
            conn.execute("DELETE FROM mlb_team_mistake_shape_daily WHERE as_of_date <= ?", (through_date,))
            conn.execute("DELETE FROM mlb_pitcher_mistake_shape_daily WHERE as_of_date <= ?", (through_date,))
            conn.execute("DELETE FROM mlb_bullpen_mistake_shape_daily WHERE as_of_date <= ?", (through_date,))
            conn.execute("DELETE FROM mlb_lineup_conversion_shape_daily WHERE as_of_date <= ?", (through_date,))
        else:
            conn.execute("DELETE FROM mlb_team_mistake_shape_daily")
            conn.execute("DELETE FROM mlb_pitcher_mistake_shape_daily")
            conn.execute("DELETE FROM mlb_bullpen_mistake_shape_daily")
            conn.execute("DELETE FROM mlb_lineup_conversion_shape_daily")

    for current_date in dates:
        teams = [
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
                (current_date, current_date),
            ).fetchall()
        ]
        for team_name in teams:
            for window_games in MISTAKE_TEAM_WINDOWS:
                packets = build_recent_team_mistake_shape_packets(conn, team_name, current_date, window_games)
                team_row = build_team_mistake_shape_row(conn, current_date, team_name, window_games, packets)
                if team_row:
                    conn.execute(
                        """
                        INSERT INTO mlb_team_mistake_shape_daily (
                          as_of_date, team_name, scheduled_opponent, scheduled_series_game_number,
                          division_matchup_flag, window_games, games_sample, road_games_sample,
                          low_scoring_game_rate, high_scoring_game_rate, scoreless_first3_rate,
                          first_inning_run_allowed_rate, early_multi_run_allowed_rate, one_big_inning_rate,
                          one_bad_inning_allowed_rate, traffic_game_rate, dead_bat_traffic_rate,
                          traffic_no_conversion_rate, base_runner_conversion_rate, stranded_traffic_rate,
                          top_order_pressure_no_conversion_rate, bullpen_meltdown_rate,
                          run_clustering_index, mistake_chaos_index
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                        """,
                        (
                            team_row["as_of_date"],
                            team_row["team_name"],
                            team_row["scheduled_opponent"],
                            team_row["scheduled_series_game_number"],
                            team_row["division_matchup_flag"],
                            team_row["window_games"],
                            team_row["games_sample"],
                            team_row["road_games_sample"],
                            team_row["low_scoring_game_rate"],
                            team_row["high_scoring_game_rate"],
                            team_row["scoreless_first3_rate"],
                            team_row["first_inning_run_allowed_rate"],
                            team_row["early_multi_run_allowed_rate"],
                            team_row["one_big_inning_rate"],
                            team_row["one_bad_inning_allowed_rate"],
                            team_row["traffic_game_rate"],
                            team_row["dead_bat_traffic_rate"],
                            team_row["traffic_no_conversion_rate"],
                            team_row["base_runner_conversion_rate"],
                            team_row["stranded_traffic_rate"],
                            team_row["top_order_pressure_no_conversion_rate"],
                            team_row["bullpen_meltdown_rate"],
                            team_row["run_clustering_index"],
                            team_row["mistake_chaos_index"],
                        ),
                    )

                lineup_row = build_lineup_conversion_shape_row(conn, current_date, team_name, window_games, packets)
                if lineup_row:
                    conn.execute(
                        """
                        INSERT INTO mlb_lineup_conversion_shape_daily (
                          as_of_date, team_name, scheduled_opponent, scheduled_series_game_number,
                          division_matchup_flag, window_games, games_sample, baserunners_per_game,
                          runs_per_baserunner, stranded_traffic_rate, early_baserunners_per_game,
                          early_conversion_rate, top_order_baserunners_first3_per_game,
                          top_order_conversion_share, traffic_no_conversion_rate,
                          dead_bat_traffic_rate, quiet_first5_rate, conversion_volatility,
                          lineup_conversion_index
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                        """,
                        (
                            lineup_row["as_of_date"],
                            lineup_row["team_name"],
                            lineup_row["scheduled_opponent"],
                            lineup_row["scheduled_series_game_number"],
                            lineup_row["division_matchup_flag"],
                            lineup_row["window_games"],
                            lineup_row["games_sample"],
                            lineup_row["baserunners_per_game"],
                            lineup_row["runs_per_baserunner"],
                            lineup_row["stranded_traffic_rate"],
                            lineup_row["early_baserunners_per_game"],
                            lineup_row["early_conversion_rate"],
                            lineup_row["top_order_baserunners_first3_per_game"],
                            lineup_row["top_order_conversion_share"],
                            lineup_row["traffic_no_conversion_rate"],
                            lineup_row["dead_bat_traffic_rate"],
                            lineup_row["quiet_first5_rate"],
                            lineup_row["conversion_volatility"],
                            lineup_row["lineup_conversion_index"],
                        ),
                    )

            for window_days in MISTAKE_BULLPEN_WINDOWS:
                bullpen_row = build_bullpen_mistake_shape_row(conn, current_date, team_name, window_days)
                if not bullpen_row:
                    continue
                conn.execute(
                    """
                    INSERT INTO mlb_bullpen_mistake_shape_daily (
                      as_of_date, team_name, scheduled_opponent, window_days,
                      appearances_sample, games_sample, first_batter_reach_rate,
                      first_batter_walk_rate, meltdown_appearance_rate, home_run_appearance_rate,
                      inherited_traffic_entry_rate, inherited_traffic_score_rate,
                      bullpen_meltdown_game_rate, lead_loss_after_entry_rate,
                      bridge_clean_game_rate, bullpen_chaos_index
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        bullpen_row["as_of_date"],
                        bullpen_row["team_name"],
                        bullpen_row["scheduled_opponent"],
                        bullpen_row["window_days"],
                        bullpen_row["appearances_sample"],
                        bullpen_row["games_sample"],
                        bullpen_row["first_batter_reach_rate"],
                        bullpen_row["first_batter_walk_rate"],
                        bullpen_row["meltdown_appearance_rate"],
                        bullpen_row["home_run_appearance_rate"],
                        bullpen_row["inherited_traffic_entry_rate"],
                        bullpen_row["inherited_traffic_score_rate"],
                        bullpen_row["bullpen_meltdown_game_rate"],
                        bullpen_row["lead_loss_after_entry_rate"],
                        bullpen_row["bridge_clean_game_rate"],
                        bullpen_row["bullpen_chaos_index"],
                    ),
                )

        starters = conn.execute(
            """
            SELECT
              sp.pitcher_id,
              sp.pitcher_name,
              sp.team_role,
              g.away_team,
              g.home_team
            FROM mlb_games g
            JOIN mlb_starting_pitchers sp
              ON sp.game_pk = g.game_pk
            WHERE g.game_date = ?
              AND sp.pitcher_id IS NOT NULL
            ORDER BY sp.pitcher_name
            """,
            (current_date,),
        ).fetchall()
        for starter in starters:
            team_name = starter["away_team"] if starter["team_role"] == "away" else starter["home_team"]
            scheduled_opponent = starter["home_team"] if starter["team_role"] == "away" else starter["away_team"]
            for window_starts in MISTAKE_PITCHER_WINDOWS:
                start_rows = conn.execute(
                    """
                    SELECT game_pk, game_date
                    FROM mlb_starting_pitcher_game_logs
                    WHERE pitcher_id = ?
                      AND game_date < ?
                    ORDER BY game_date DESC, game_pk DESC
                    LIMIT ?
                    """,
                    (starter["pitcher_id"], current_date, window_starts),
                ).fetchall()
                pitcher_row = build_pitcher_mistake_shape_row(
                    conn,
                    current_date,
                    team_name,
                    scheduled_opponent,
                    to_int(starter["pitcher_id"]) or 0,
                    starter["pitcher_name"],
                    window_starts,
                    start_rows,
                )
                if not pitcher_row:
                    continue
                conn.execute(
                    """
                    INSERT INTO mlb_pitcher_mistake_shape_daily (
                      as_of_date, pitcher_id, pitcher_name, team_name, scheduled_opponent,
                      window_starts, starts_sample, starts_reaching_sixth, starts_with_damage,
                      first_batter_reach_rate, first_inning_run_allowed_rate,
                      first_three_runs_allowed_per_start, early_clean_start_rate,
                      meltdown_start_rate, walk_burst_start_rate, home_run_start_rate,
                      sixth_inning_damage_rate, post_damage_recovery_rate, command_break_index
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        pitcher_row["as_of_date"],
                        pitcher_row["pitcher_id"],
                        pitcher_row["pitcher_name"],
                        pitcher_row["team_name"],
                        pitcher_row["scheduled_opponent"],
                        pitcher_row["window_starts"],
                        pitcher_row["starts_sample"],
                        pitcher_row["starts_reaching_sixth"],
                        pitcher_row["starts_with_damage"],
                        pitcher_row["first_batter_reach_rate"],
                        pitcher_row["first_inning_run_allowed_rate"],
                        pitcher_row["first_three_runs_allowed_per_start"],
                        pitcher_row["early_clean_start_rate"],
                        pitcher_row["meltdown_start_rate"],
                        pitcher_row["walk_burst_start_rate"],
                        pitcher_row["home_run_start_rate"],
                        pitcher_row["sixth_inning_damage_rate"],
                        pitcher_row["post_damage_recovery_rate"],
                        pitcher_row["command_break_index"],
                    ),
                )

    conn.commit()


def refresh_first_inning_profiles(
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
        conn.execute("DELETE FROM mlb_team_first_inning_profiles_daily WHERE as_of_date = ?", (as_of_date,))
        conn.execute("DELETE FROM mlb_pitcher_first_inning_profiles_daily WHERE as_of_date = ?", (as_of_date,))
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
            conn.execute("DELETE FROM mlb_team_first_inning_profiles_daily WHERE as_of_date <= ?", (through_date,))
            conn.execute("DELETE FROM mlb_pitcher_first_inning_profiles_daily WHERE as_of_date <= ?", (through_date,))
        else:
            conn.execute("DELETE FROM mlb_team_first_inning_profiles_daily")
            conn.execute("DELETE FROM mlb_pitcher_first_inning_profiles_daily")

    for current_date in dates:
        teams = [
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
                (current_date, current_date),
            ).fetchall()
        ]

        for team_name in teams:
            for window_games in FIRST_INNING_TEAM_WINDOWS:
                packets = build_recent_team_first_inning_packets(conn, team_name, current_date, window_games)
                team_row = build_team_first_inning_profile_row(conn, current_date, team_name, window_games, packets)
                if not team_row:
                    continue
                conn.execute(
                    """
                    INSERT INTO mlb_team_first_inning_profiles_daily (
                      as_of_date, team_name, scheduled_opponent, scheduled_series_game_number,
                      division_matchup_flag, window_games, games_sample, road_games_sample,
                      first_inning_runs_per_game, first_inning_runs_allowed_per_game,
                      scored_first_inning_rate, scoreless_first_inning_rate,
                      allowed_first_inning_rate, first_inning_multi_run_rate,
                      first_inning_multi_run_allowed_rate, nrfi_game_rate, yrfi_game_rate,
                      first_inning_net_edge, first_inning_scoring_index, first_inning_allow_risk_index
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        team_row["as_of_date"],
                        team_row["team_name"],
                        team_row["scheduled_opponent"],
                        team_row["scheduled_series_game_number"],
                        team_row["division_matchup_flag"],
                        team_row["window_games"],
                        team_row["games_sample"],
                        team_row["road_games_sample"],
                        team_row["first_inning_runs_per_game"],
                        team_row["first_inning_runs_allowed_per_game"],
                        team_row["scored_first_inning_rate"],
                        team_row["scoreless_first_inning_rate"],
                        team_row["allowed_first_inning_rate"],
                        team_row["first_inning_multi_run_rate"],
                        team_row["first_inning_multi_run_allowed_rate"],
                        team_row["nrfi_game_rate"],
                        team_row["yrfi_game_rate"],
                        team_row["first_inning_net_edge"],
                        team_row["first_inning_scoring_index"],
                        team_row["first_inning_allow_risk_index"],
                    ),
                )

        starters = conn.execute(
            """
            SELECT
              sp.pitcher_id,
              sp.pitcher_name,
              sp.team_role,
              g.away_team,
              g.home_team
            FROM mlb_games g
            JOIN mlb_starting_pitchers sp
              ON sp.game_pk = g.game_pk
            WHERE g.game_date = ?
              AND sp.pitcher_id IS NOT NULL
            ORDER BY sp.pitcher_name
            """,
            (current_date,),
        ).fetchall()
        for starter in starters:
            team_name = starter["away_team"] if starter["team_role"] == "away" else starter["home_team"]
            scheduled_opponent = starter["home_team"] if starter["team_role"] == "away" else starter["away_team"]
            for window_starts in FIRST_INNING_PITCHER_WINDOWS:
                start_rows = conn.execute(
                    """
                    SELECT game_pk, game_date
                    FROM mlb_starting_pitcher_game_logs
                    WHERE pitcher_id = ?
                      AND game_date < ?
                    ORDER BY game_date DESC, game_pk DESC
                    LIMIT ?
                    """,
                    (starter["pitcher_id"], current_date, window_starts),
                ).fetchall()
                pitcher_row = build_pitcher_first_inning_profile_row(
                    conn,
                    current_date,
                    team_name,
                    scheduled_opponent,
                    to_int(starter["pitcher_id"]) or 0,
                    starter["pitcher_name"],
                    window_starts,
                    start_rows,
                )
                if not pitcher_row:
                    continue
                conn.execute(
                    """
                    INSERT INTO mlb_pitcher_first_inning_profiles_daily (
                      as_of_date, pitcher_id, pitcher_name, team_name, scheduled_opponent,
                      window_starts, starts_sample, first_batter_reach_rate,
                      first_inning_run_allowed_rate, first_inning_runs_allowed_per_start,
                      first_inning_multi_run_allowed_rate, first_inning_baserunners_per_start,
                      first_inning_walk_rate, first_inning_home_run_rate,
                      first_inning_clean_rate, first_inning_pressure_index
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        pitcher_row["as_of_date"],
                        pitcher_row["pitcher_id"],
                        pitcher_row["pitcher_name"],
                        pitcher_row["team_name"],
                        pitcher_row["scheduled_opponent"],
                        pitcher_row["window_starts"],
                        pitcher_row["starts_sample"],
                        pitcher_row["first_batter_reach_rate"],
                        pitcher_row["first_inning_run_allowed_rate"],
                        pitcher_row["first_inning_runs_allowed_per_start"],
                        pitcher_row["first_inning_multi_run_allowed_rate"],
                        pitcher_row["first_inning_baserunners_per_start"],
                        pitcher_row["first_inning_walk_rate"],
                        pitcher_row["first_inning_home_run_rate"],
                        pitcher_row["first_inning_clean_rate"],
                        pitcher_row["first_inning_pressure_index"],
                    ),
                )

    conn.commit()


def load_team_inning_runs(conn: sqlite3.Connection, game_pk: int) -> dict[str, dict[int, int]]:
    inning_runs: dict[str, dict[int, int]] = {}
    for row in conn.execute(
        """
        SELECT batting_team, inning, run_delta
        FROM mlb_plate_appearances
        WHERE game_pk = ?
        ORDER BY at_bat_index
        """,
        (game_pk,),
    ).fetchall():
        team_name = row["batting_team"]
        inning = to_int(row["inning"]) or 0
        if not team_name or inning <= 0:
            continue
        inning_runs.setdefault(team_name, {})
        inning_runs[team_name][inning] = inning_runs[team_name].get(inning, 0) + (to_int(row["run_delta"]) or 0)
    return inning_runs


def _primary_story_label(story_row: sqlite3.Row, outcome_row: sqlite3.Row) -> str:
    total_runs_final = to_int(outcome_row["total_runs_final"]) or 0
    total_runs_first5 = to_int(outcome_row["total_runs_first5"]) or 0
    if to_int(story_row["comeback_win_flag"]):
        return "comeback_win"
    if to_int(story_row["bullpen_flip_flag"]):
        return "bullpen_flip"
    if to_int(story_row["late_break_flag"]) and to_int(story_row["quiet_first5_flag"]):
        return "quiet_then_break"
    if to_int(story_row["first_inning_jolt_flag"]) and total_runs_final >= 8:
        return "early_jolt"
    if to_int(story_row["away_starter_cracked_flag"]) or to_int(story_row["home_starter_cracked_flag"]):
        return "starter_crack"
    if total_runs_final <= 5:
        return "dead_bat_grind"
    if total_runs_first5 >= 6 and total_runs_final >= 9:
        return "first5_firefight"
    if total_runs_final >= 10:
        return "crooked_inning_chaos"
    return "balanced_game"


def _early_phase_label(story_row: sqlite3.Row, outcome_row: sqlite3.Row) -> str:
    total_runs_first5 = to_int(outcome_row["total_runs_first5"]) or 0
    if to_int(story_row["first_inning_jolt_flag"]):
        return "first_inning_jolt"
    if to_int(story_row["quiet_first5_flag"]):
        return "quiet_first5"
    if to_int(story_row["away_starter_cracked_flag"]) or to_int(story_row["home_starter_cracked_flag"]):
        return "starter_crack"
    if total_runs_first5 >= 6:
        return "first5_firefight"
    return "balanced_first5"


def _late_phase_label(story_row: sqlite3.Row, outcome_row: sqlite3.Row) -> str:
    total_runs_first5 = to_int(outcome_row["total_runs_first5"]) or 0
    total_runs_final = to_int(outcome_row["total_runs_final"]) or 0
    late_runs = total_runs_final - total_runs_first5
    if to_int(story_row["bullpen_flip_flag"]):
        return "bullpen_flip"
    if to_int(story_row["comeback_win_flag"]):
        return "comeback_finish"
    if to_int(story_row["late_break_flag"]):
        return "late_break"
    if late_runs <= 1:
        return "quiet_finish"
    return "steady_finish"


def _scoring_shape_label(story_row: sqlite3.Row, outcome_row: sqlite3.Row) -> str:
    total_runs_first5 = to_int(outcome_row["total_runs_first5"]) or 0
    total_runs_final = to_int(outcome_row["total_runs_final"]) or 0
    late_runs = total_runs_final - total_runs_first5
    if total_runs_final <= 5:
        return "low_total"
    if total_runs_first5 <= 2 and late_runs >= 4:
        return "late_clustered"
    if total_runs_first5 >= 6 and late_runs <= 2:
        return "front_loaded"
    if total_runs_first5 >= total_runs_final * 0.65:
        return "early_loaded"
    if total_runs_final >= 10 and to_int(story_row["max_comeback_runs"]) >= 3:
        return "swingy_high_total"
    return "balanced_total"


def _winner_path_label(story_row: sqlite3.Row) -> str:
    winner_team = story_row["winner_team"]
    lead_after5_team = story_row["lead_after5_team"]
    if to_int(story_row["comeback_win_flag"]):
        return "came_back"
    if to_int(story_row["bullpen_flip_flag"]) and winner_team and lead_after5_team and winner_team != lead_after5_team:
        return "flipped_late"
    if to_int(story_row["first_inning_jolt_flag"]) and winner_team and winner_team == lead_after5_team:
        return "jumped_early"
    if to_int(story_row["quiet_first5_flag"]) and to_int(story_row["late_break_flag"]):
        return "won_late"
    if winner_team and lead_after5_team and winner_team == lead_after5_team:
        return "held_control"
    return "outlasted"


def build_game_story_label_row(
    game_row: sqlite3.Row,
    outcome_row: sqlite3.Row,
    story_row: sqlite3.Row,
) -> dict[str, Any]:
    story_tags = json.loads(story_row["story_tags_json"] or "[]")
    label_flags = {
        "comebackWin": bool(to_int(story_row["comeback_win_flag"])),
        "bullpenFlip": bool(to_int(story_row["bullpen_flip_flag"])),
        "firstInningJolt": bool(to_int(story_row["first_inning_jolt_flag"])),
        "quietFirst5": bool(to_int(story_row["quiet_first5_flag"])),
        "lateBreak": bool(to_int(story_row["late_break_flag"])),
        "awayStarterCracked": bool(to_int(story_row["away_starter_cracked_flag"])),
        "homeStarterCracked": bool(to_int(story_row["home_starter_cracked_flag"])),
    }
    primary_story_label = _primary_story_label(story_row, outcome_row)
    early_phase_label = _early_phase_label(story_row, outcome_row)
    late_phase_label = _late_phase_label(story_row, outcome_row)
    scoring_shape_label = _scoring_shape_label(story_row, outcome_row)
    winner_path_label = _winner_path_label(story_row)
    summary = {
        "winnerTeam": story_row["winner_team"],
        "leadAfter5Team": story_row["lead_after5_team"],
        "totalRunsFirst5": to_int(outcome_row["total_runs_first5"]) or 0,
        "totalRunsFinal": to_int(outcome_row["total_runs_final"]) or 0,
        "firstScoringInning": to_int(story_row["first_scoring_inning"]) or 0,
        "leadChanges": to_int(story_row["lead_changes"]) or 0,
        "maxComebackRuns": to_int(story_row["max_comeback_runs"]) or 0,
        "primaryStoryLabel": primary_story_label,
        "earlyPhaseLabel": early_phase_label,
        "latePhaseLabel": late_phase_label,
        "scoringShapeLabel": scoring_shape_label,
        "winnerPathLabel": winner_path_label,
    }
    return {
        "game_pk": to_int(game_row["game_pk"]) or 0,
        "game_date": game_row["game_date"],
        "away_team": game_row["away_team"],
        "home_team": game_row["home_team"],
        "winner_team": story_row["winner_team"],
        "primary_story_label": primary_story_label,
        "early_phase_label": early_phase_label,
        "late_phase_label": late_phase_label,
        "scoring_shape_label": scoring_shape_label,
        "winner_path_label": winner_path_label,
        "story_tags_json": json.dumps(story_tags, sort_keys=True),
        "label_flags_json": json.dumps(label_flags, sort_keys=True),
        "summary_json": json.dumps(summary, sort_keys=True),
    }


def build_phase_outcome_rows(
    conn: sqlite3.Connection,
    game_row: sqlite3.Row,
    outcome_row: sqlite3.Row,
    story_row: sqlite3.Row,
) -> list[dict[str, Any]]:
    inning_runs = load_team_inning_runs(conn, to_int(game_row["game_pk"]) or 0)
    team_rows = {
        row["team_role"]: row
        for row in conn.execute(
            "SELECT * FROM mlb_game_team_stats WHERE game_pk = ? ORDER BY team_role",
            (game_row["game_pk"],),
        ).fetchall()
    }
    starter_rows = {
        row["team_role"]: row
        for row in conn.execute(
            "SELECT * FROM mlb_starting_pitcher_game_logs WHERE game_pk = ? ORDER BY team_role",
            (game_row["game_pk"],),
        ).fetchall()
    }
    output: list[dict[str, Any]] = []
    for role in ("away", "home"):
        team_row = team_rows.get(role)
        opponent_role = "home" if role == "away" else "away"
        opponent_row = team_rows.get(opponent_role)
        if not team_row or not opponent_row:
            continue
        team_name = team_row["team_name"]
        opponent_name = team_row["opponent_name"]
        team_inning_runs = inning_runs.get(team_name, {})
        opponent_inning_runs = inning_runs.get(opponent_name, {})
        runs_first1 = team_inning_runs.get(1, 0)
        opp_runs_first1 = opponent_inning_runs.get(1, 0)
        runs_first3 = sum(runs for inning, runs in team_inning_runs.items() if inning <= 3)
        opp_runs_first3 = sum(runs for inning, runs in opponent_inning_runs.items() if inning <= 3)
        runs_first5 = to_int(team_row["runs_scored_first5"]) or 0
        opp_runs_first5 = to_int(opponent_row["runs_scored_first5"]) or 0
        total_runs = to_int(team_row["runs_scored"]) or 0
        total_hits = to_int(team_row["hits"]) or 0
        hits_first5 = to_int(team_row["hits_first5"]) or 0
        runs_late = total_runs - runs_first5
        hits_late = total_hits - hits_first5
        result = team_row["full_game_result"] or ""
        lead_after5_team = story_row["lead_after5_team"]
        winner_team = story_row["winner_team"]
        starter_row = starter_rows.get(role)
        starter_survived5_flag = int((to_int(starter_row["outs_recorded"]) or 0) >= 15) if starter_row else 0
        starter_cracked_flag = to_int(
            story_row["away_starter_cracked_flag"] if role == "away" else story_row["home_starter_cracked_flag"]
        ) or 0
        traffic_no_conversion_flag = to_int(
            story_row["away_traffic_no_conversion_flag"] if role == "away" else story_row["home_traffic_no_conversion_flag"]
        ) or 0
        comeback_win_flag = int(bool(to_int(story_row["comeback_win_flag"])) and winner_team == team_name)
        blew_lead_after5_flag = int(bool(lead_after5_team) and lead_after5_team == team_name and winner_team != team_name)
        if blew_lead_after5_flag:
            phase_path_label = "blew_lead_after5"
        elif comeback_win_flag:
            phase_path_label = "late_comeback"
        elif starter_cracked_flag and result == "loss":
            phase_path_label = "starter_crack_loss"
        elif runs_first3 == 0 and result == "loss":
            phase_path_label = "dead_early_loss"
        elif runs_first1 > 0 and runs_first5 > opp_runs_first5 and result == "win":
            phase_path_label = "jumped_early_hold"
        elif starter_survived5_flag and result == "win" and lead_after5_team == team_name:
            phase_path_label = "starter_carried"
        elif runs_late > runs_first5:
            phase_path_label = "late_push"
        else:
            phase_path_label = "balanced_path"
        phase_flags = {
            "scorelessFirst3": runs_first3 == 0,
            "scoredFirstInning": runs_first1 > 0,
            "allowedFirstInning": opp_runs_first1 > 0,
            "ledAfter3": runs_first3 > opp_runs_first3,
            "ledAfter5": runs_first5 > opp_runs_first5,
            "tiedAfter5": runs_first5 == opp_runs_first5,
            "starterSurvived5": bool(starter_survived5_flag),
            "starterCracked": bool(starter_cracked_flag),
            "trafficNoConversion": bool(traffic_no_conversion_flag),
            "comebackWin": bool(comeback_win_flag),
            "blewLeadAfter5": bool(blew_lead_after5_flag),
            "bullpenFlipGame": bool(to_int(story_row["bullpen_flip_flag"])),
        }
        output.append(
            {
                "game_pk": to_int(game_row["game_pk"]) or 0,
                "game_date": game_row["game_date"],
                "team_name": team_name,
                "opponent_team": opponent_name,
                "team_role": role,
                "result": result,
                "runs_first1": runs_first1,
                "runs_first3": runs_first3,
                "runs_first5": runs_first5,
                "runs_late": runs_late,
                "hits_first5": hits_first5,
                "hits_late": hits_late,
                "scoreless_first3_flag": int(runs_first3 == 0),
                "scored_first_inning_flag": int(runs_first1 > 0),
                "allowed_first_inning_flag": int(opp_runs_first1 > 0),
                "led_after3_flag": int(runs_first3 > opp_runs_first3),
                "trailed_after3_flag": int(runs_first3 < opp_runs_first3),
                "tied_after3_flag": int(runs_first3 == opp_runs_first3),
                "led_after5_flag": int(runs_first5 > opp_runs_first5),
                "trailed_after5_flag": int(runs_first5 < opp_runs_first5),
                "tied_after5_flag": int(runs_first5 == opp_runs_first5),
                "won_full_game_flag": int(result == "win"),
                "won_first5_flag": int((team_row["first5_result"] or "") == "win"),
                "first5_push_flag": int((team_row["first5_result"] or "") == "push"),
                "starter_survived5_flag": starter_survived5_flag,
                "starter_cracked_flag": int(starter_cracked_flag),
                "traffic_no_conversion_flag": int(traffic_no_conversion_flag),
                "comeback_win_flag": comeback_win_flag,
                "blew_lead_after5_flag": blew_lead_after5_flag,
                "bullpen_flip_game_flag": int(to_int(story_row["bullpen_flip_flag"]) or 0),
                "phase_path_label": phase_path_label,
                "phase_flags_json": json.dumps(phase_flags, sort_keys=True),
            }
        )
    return output


def _price_bucket_label(market_probability: float | None) -> str:
    if market_probability is None:
        return "unknown"
    if market_probability >= 0.63:
        return "heavy_favorite"
    if market_probability >= 0.54:
        return "moderate_favorite"
    if market_probability >= 0.46:
        return "coinflip"
    if market_probability >= 0.37:
        return "moderate_dog"
    return "long_dog"


def _market_side_label(record: dict[str, Any]) -> str:
    if record.get("pickIsMarketFavorite"):
        return "favorite"
    if record.get("pickIsMarketUnderdog"):
        return "underdog"
    return "unknown"


def _market_phase_preference_label(result: dict[str, Any]) -> str:
    hit_full = bool(result.get("fullGameHit"))
    hit_first5 = bool(result.get("first5Hit"))
    first5_push = str(result.get("actualFirst5Winner") or "").lower() == "tie"
    if hit_first5 and not hit_full:
        return "first5_cleaner"
    if hit_full and (not hit_first5 or first5_push):
        return "full_game_cleaner"
    if hit_full and hit_first5:
        return "both_worked"
    return "neither_worked"


def _market_mispricing_label(record: dict[str, Any], result: dict[str, Any]) -> str:
    market_probability = to_float(record.get("marketProbability"))
    hit_full = bool(result.get("fullGameHit"))
    if record.get("pickIsMarketFavorite") and (market_probability or 0.0) >= 0.60 and not hit_full:
        return "expensive_favorite_failed"
    if record.get("pickIsMarketUnderdog") and hit_full:
        return "underdog_beat_market"
    if record.get("pickIsMarketFavorite") and hit_full and (market_probability or 0.0) >= 0.60:
        return "expensive_favorite_held"
    if record.get("pickIsMarketFavorite") and hit_full:
        return "favorite_held"
    if record.get("pickIsMarketUnderdog") and not hit_full:
        return "underdog_failed"
    return "market_neutral"


def iter_moneyline_history_records(
    through_date: str | None = None,
    as_of_date: str | None = None,
) -> list[dict[str, Any]]:
    if not HISTORY_DIR.exists():
        return []
    records: list[dict[str, Any]] = []
    seen_keys: set[tuple[str, str, str, str]] = set()
    for path in sorted(HISTORY_DIR.glob("mlb-results-*.jsonl")):
        if path.name == "mlb-results-archive.jsonl":
            continue
        date_text = path.stem.replace("mlb-results-", "")
        if as_of_date and date_text != as_of_date:
            continue
        if through_date and date_text > through_date:
            continue
        with path.open(encoding="utf-8") as handle:
            for line in handle:
                if not line.strip():
                    continue
                record = json.loads(line)
                if record.get("sport") != "MLB" or record.get("marketType") != "moneyline":
                    continue
                key = (
                    str(record.get("date") or ""),
                    str(record.get("modelName") or ""),
                    str(record.get("matchup") or ""),
                    str(record.get("predictedPick") or ""),
                )
                if key in seen_keys:
                    continue
                seen_keys.add(key)
                records.append(record)
    return records


def build_market_mispricing_row(record: dict[str, Any]) -> dict[str, Any]:
    result = record.get("result") or {}
    market_probability = to_float(record.get("marketProbability"))
    hit_full = int(bool(result.get("fullGameHit")))
    hit_first5 = int(bool(result.get("first5Hit")))
    first5_push_flag = int(str(result.get("actualFirst5Winner") or "").lower() == "tie")
    summary = {
        "resultJustification": record.get("resultJustification"),
        "pickJustification": record.get("pickJustification"),
        "pointEdge": to_float(record.get("pointEdge")) or 0.0,
        "confidence": to_int(record.get("confidence")) or 0,
        "priceBucketLabel": _price_bucket_label(market_probability),
        "marketMispricingLabel": _market_mispricing_label(record, result),
        "marketPhasePreferenceLabel": _market_phase_preference_label(result),
    }
    return {
        "prediction_date": record.get("date"),
        "market_type": record.get("marketType"),
        "model_name": record.get("modelName"),
        "matchup": record.get("matchup"),
        "predicted_pick": record.get("predictedPick"),
        "opponent_team": record.get("homeTeam") if record.get("predictedSide") == "away" else record.get("awayTeam"),
        "confidence": to_int(record.get("confidence")) or 0,
        "volatility": to_int(record.get("volatility")) or 0,
        "point_edge": to_float(record.get("pointEdge")) or 0.0,
        "market_american_odds": to_int(record.get("marketAmericanOdds")),
        "market_probability": market_probability,
        "opponent_market_american_odds": to_int(record.get("opponentMarketAmericanOdds")),
        "opponent_market_probability": to_float(record.get("opponentMarketProbability")),
        "market_favorite_team": record.get("marketFavoriteTeam"),
        "market_favorite_probability": to_float(record.get("marketFavoriteProbability")),
        "market_price_gap": to_float(record.get("marketPriceGap")),
        "pick_is_market_favorite": int(bool(record.get("pickIsMarketFavorite"))),
        "pick_is_market_underdog": int(bool(record.get("pickIsMarketUnderdog"))),
        "hit_full_game": hit_full,
        "hit_first5": hit_first5,
        "first5_push_flag": first5_push_flag,
        "price_bucket_label": _price_bucket_label(market_probability),
        "market_side_label": _market_side_label(record),
        "market_disagreement_win_flag": int(bool(record.get("pickIsMarketUnderdog")) and bool(hit_full)),
        "expensive_favorite_failure_flag": int(bool(record.get("pickIsMarketFavorite")) and (market_probability or 0.0) >= 0.60 and not bool(hit_full)),
        "underdog_value_win_flag": int(bool(record.get("pickIsMarketUnderdog")) and bool(hit_full)),
        "first5_cleaner_than_full_flag": int(bool(hit_first5) and not bool(hit_full)),
        "full_game_cleaner_than_first5_flag": int(bool(hit_full) and (not bool(hit_first5) or bool(first5_push_flag))),
        "market_mispricing_label": _market_mispricing_label(record, result),
        "market_phase_preference_label": _market_phase_preference_label(result),
        "summary_json": json.dumps(summary, sort_keys=True),
    }


def refresh_story_phase_label_tables(
    conn: sqlite3.Connection,
    through_date: str | None = None,
    as_of_date: str | None = None,
) -> None:
    init_db(conn)
    if as_of_date:
        conn.execute(
            "DELETE FROM mlb_game_story_labels WHERE game_date = ?",
            (as_of_date,),
        )
        conn.execute(
            "DELETE FROM mlb_phase_outcomes_daily WHERE game_date = ?",
            (as_of_date,),
        )
        conn.execute(
            "DELETE FROM mlb_market_mispricing_labels WHERE prediction_date = ?",
            (as_of_date,),
        )
    elif through_date:
        conn.execute(
            "DELETE FROM mlb_game_story_labels WHERE game_date <= ?",
            (through_date,),
        )
        conn.execute(
            "DELETE FROM mlb_phase_outcomes_daily WHERE game_date <= ?",
            (through_date,),
        )
        conn.execute(
            "DELETE FROM mlb_market_mispricing_labels WHERE prediction_date <= ?",
            (through_date,),
        )
    else:
        conn.execute("DELETE FROM mlb_game_story_labels")
        conn.execute("DELETE FROM mlb_phase_outcomes_daily")
        conn.execute("DELETE FROM mlb_market_mispricing_labels")

    params: list[Any] = []
    query = "SELECT game_pk, game_date, away_team, home_team FROM mlb_games"
    if as_of_date:
        query += " WHERE game_date = ?"
        params.append(as_of_date)
    elif through_date:
        query += " WHERE game_date <= ?"
        params.append(through_date)
    query += " ORDER BY game_date, game_pk"
    games = conn.execute(query, params).fetchall()

    for game_row in games:
        outcome_row = conn.execute(
            "SELECT * FROM mlb_game_outcomes WHERE game_pk = ?",
            (game_row["game_pk"],),
        ).fetchone()
        story_row = conn.execute(
            "SELECT * FROM mlb_game_story_signals WHERE game_pk = ?",
            (game_row["game_pk"],),
        ).fetchone()
        if not outcome_row or not story_row:
            continue
        game_label_row = build_game_story_label_row(game_row, outcome_row, story_row)
        conn.execute(
            """
            INSERT INTO mlb_game_story_labels (
              game_pk, game_date, away_team, home_team, winner_team,
              primary_story_label, early_phase_label, late_phase_label,
              scoring_shape_label, winner_path_label,
              story_tags_json, label_flags_json, summary_json
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                game_label_row["game_pk"],
                game_label_row["game_date"],
                game_label_row["away_team"],
                game_label_row["home_team"],
                game_label_row["winner_team"],
                game_label_row["primary_story_label"],
                game_label_row["early_phase_label"],
                game_label_row["late_phase_label"],
                game_label_row["scoring_shape_label"],
                game_label_row["winner_path_label"],
                game_label_row["story_tags_json"],
                game_label_row["label_flags_json"],
                game_label_row["summary_json"],
            ),
        )
        for phase_row in build_phase_outcome_rows(conn, game_row, outcome_row, story_row):
            conn.execute(
                """
                INSERT INTO mlb_phase_outcomes_daily (
                  game_pk, game_date, team_name, opponent_team, team_role, result,
                  runs_first1, runs_first3, runs_first5, runs_late,
                  hits_first5, hits_late,
                  scoreless_first3_flag, scored_first_inning_flag, allowed_first_inning_flag,
                  led_after3_flag, trailed_after3_flag, tied_after3_flag,
                  led_after5_flag, trailed_after5_flag, tied_after5_flag,
                  won_full_game_flag, won_first5_flag, first5_push_flag,
                  starter_survived5_flag, starter_cracked_flag, traffic_no_conversion_flag,
                  comeback_win_flag, blew_lead_after5_flag, bullpen_flip_game_flag,
                  phase_path_label, phase_flags_json
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    phase_row["game_pk"],
                    phase_row["game_date"],
                    phase_row["team_name"],
                    phase_row["opponent_team"],
                    phase_row["team_role"],
                    phase_row["result"],
                    phase_row["runs_first1"],
                    phase_row["runs_first3"],
                    phase_row["runs_first5"],
                    phase_row["runs_late"],
                    phase_row["hits_first5"],
                    phase_row["hits_late"],
                    phase_row["scoreless_first3_flag"],
                    phase_row["scored_first_inning_flag"],
                    phase_row["allowed_first_inning_flag"],
                    phase_row["led_after3_flag"],
                    phase_row["trailed_after3_flag"],
                    phase_row["tied_after3_flag"],
                    phase_row["led_after5_flag"],
                    phase_row["trailed_after5_flag"],
                    phase_row["tied_after5_flag"],
                    phase_row["won_full_game_flag"],
                    phase_row["won_first5_flag"],
                    phase_row["first5_push_flag"],
                    phase_row["starter_survived5_flag"],
                    phase_row["starter_cracked_flag"],
                    phase_row["traffic_no_conversion_flag"],
                    phase_row["comeback_win_flag"],
                    phase_row["blew_lead_after5_flag"],
                    phase_row["bullpen_flip_game_flag"],
                    phase_row["phase_path_label"],
                    phase_row["phase_flags_json"],
                ),
            )

    for record in iter_moneyline_history_records(through_date=through_date, as_of_date=as_of_date):
        label_row = build_market_mispricing_row(record)
        conn.execute(
            """
            INSERT INTO mlb_market_mispricing_labels (
              prediction_date, market_type, model_name, matchup, predicted_pick, opponent_team,
              confidence, volatility, point_edge,
              market_american_odds, market_probability,
              opponent_market_american_odds, opponent_market_probability,
              market_favorite_team, market_favorite_probability, market_price_gap,
              pick_is_market_favorite, pick_is_market_underdog,
              hit_full_game, hit_first5, first5_push_flag,
              price_bucket_label, market_side_label,
              market_disagreement_win_flag, expensive_favorite_failure_flag,
              underdog_value_win_flag, first5_cleaner_than_full_flag, full_game_cleaner_than_first5_flag,
              market_mispricing_label, market_phase_preference_label, summary_json
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                label_row["prediction_date"],
                label_row["market_type"],
                label_row["model_name"],
                label_row["matchup"],
                label_row["predicted_pick"],
                label_row["opponent_team"],
                label_row["confidence"],
                label_row["volatility"],
                label_row["point_edge"],
                label_row["market_american_odds"],
                label_row["market_probability"],
                label_row["opponent_market_american_odds"],
                label_row["opponent_market_probability"],
                label_row["market_favorite_team"],
                label_row["market_favorite_probability"],
                label_row["market_price_gap"],
                label_row["pick_is_market_favorite"],
                label_row["pick_is_market_underdog"],
                label_row["hit_full_game"],
                label_row["hit_first5"],
                label_row["first5_push_flag"],
                label_row["price_bucket_label"],
                label_row["market_side_label"],
                label_row["market_disagreement_win_flag"],
                label_row["expensive_favorite_failure_flag"],
                label_row["underdog_value_win_flag"],
                label_row["first5_cleaner_than_full_flag"],
                label_row["full_game_cleaner_than_first5_flag"],
                label_row["market_mispricing_label"],
                label_row["market_phase_preference_label"],
                label_row["summary_json"],
            ),
        )

    conn.commit()


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
    recent_team_game_ids: list[int] = []
    recent_team_game_dates: list[str] = []
    seen_recent_games: set[int] = set()
    by_pitcher: dict[int, list[sqlite3.Row]] = {}

    for row in rows:
        pitcher_id = row["pitcher_id"]
        if pitcher_id is None:
            continue
        by_pitcher.setdefault(pitcher_id, []).append(row)
        game_pk = row["game_pk"]
        if game_pk is not None and game_pk not in seen_recent_games and len(recent_team_game_ids) < 5:
            seen_recent_games.add(game_pk)
            recent_team_game_ids.append(game_pk)
            recent_team_game_dates.append(row["game_date"])

    recent_team_game_id_set = set(recent_team_game_ids)
    recent_team_games_sample = len(recent_team_game_ids)

    usage_rows: list[dict[str, Any]] = []
    chain_candidates: list[dict[str, Any]] = []

    for pitcher_id, appearances in by_pitcher.items():
        appearances.sort(
            key=lambda row: (row["game_date"], row["game_pk"] or 0, -(row["entry_order"] or 99)),
            reverse=True,
        )
        last10 = [row for row in appearances if row["game_date"] >= recent10_cutoff][:8]
        recent3 = [row for row in last10 if row["game_date"] >= recent3_cutoff]
        recent_team_window = (
            [row for row in appearances if row["game_pk"] in recent_team_game_id_set]
            if recent_team_game_id_set
            else []
        )
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
        recent_entry_order = (
            safe_mean([row["entry_order"] or 5 for row in recent_team_window])
            if recent_team_window
            else avg_entry_order
        )
        recent_outs_per_appearance = (
            safe_mean([row["outs_recorded"] or 0 for row in recent_team_window])
            if recent_team_window
            else avg_outs_per_appearance
        )
        recent_first_reliever_count = sum(1 for row in recent_team_window if (row["entry_order"] or 99) == 2)
        recent_first_two_count = sum(1 for row in recent_team_window if (row["entry_order"] or 99) in (2, 3))
        recent_appearance_share = len(recent_team_window) / max(recent_team_games_sample, 1)

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
        entry_anchor = clamp_value(88 - abs(recent_entry_order - 2.2) * 18, 10, 92)
        length_anchor = clamp_value(86 - abs(recent_outs_per_appearance - 4.0) * 12, 10, 90)
        bridge_bonus = min(
            34.0,
            recent_first_reliever_count * 12
            + recent_first_two_count * 5
            + recent_appearance_share * 10,
        )
        role_bonus = 10 if likely_role == "bridge" else 5 if likely_role == "bulk" else -6 if likely_role == "late" else 0
        bridge_score = clamp_value(entry_anchor * 0.5 + length_anchor * 0.35 + bridge_bonus + role_bonus, 5, 95)
        first_reliever_likelihood = clamp_value(
            bridge_score * 0.46
            + availability_score * 0.26
            + min(28.0, recent_first_reliever_count * 16 + recent_first_two_count * 6)
            + min(12.0, recent_appearance_share * 18),
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
                    "recentTeamGameIds": recent_team_game_ids,
                    "recentTeamGameDates": recent_team_game_dates,
                    "recentTeamGamesSample": recent_team_games_sample,
                    "recentPitcherGamesSample": len(recent_team_window),
                    "recentFirstRelieverCountLast5Games": recent_first_reliever_count,
                    "recentFirstTwoCountLast5Games": recent_first_two_count,
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


def build_team_bullpen_shape_row(
    as_of_date: str, team_name: str, opponent_name: str, rows: list[sqlite3.Row]
) -> dict[str, Any] | None:
    if not rows:
        return None

    by_game: dict[tuple[str, int, str], list[sqlite3.Row]] = {}
    ordered_game_keys: list[tuple[str, int, str]] = []

    for row in rows:
        game_pk = to_int(row["game_pk"])
        if game_pk is None:
            continue
        game_key = (row["game_date"], game_pk, row["team_role"])
        if game_key not in by_game:
            by_game[game_key] = []
            ordered_game_keys.append(game_key)
        by_game[game_key].append(row)

    if not ordered_game_keys:
        return None

    ordered_game_keys.sort(reverse=True)

    game_packets: list[dict[str, Any]] = []
    for game_key in ordered_game_keys[:10]:
        appearances = sorted(
            by_game[game_key],
            key=lambda row: ((row["entry_order"] or 99), -(to_int(row["pitcher_id"]) or 0)),
        )
        relievers_used = len(appearances)
        if relievers_used <= 0:
            continue
        first_outs = to_int(appearances[0]["outs_recorded"]) or 0
        total_relief_outs = sum(to_int(row["outs_recorded"]) or 0 for row in appearances)
        total_relief_runs_allowed = sum(to_int(row["runs_allowed"]) or 0 for row in appearances)
        game_packets.append(
            {
                "game_date": game_key[0],
                "game_pk": game_key[1],
                "team_role": game_key[2],
                "relievers_used": relievers_used,
                "first_reliever_outs": first_outs,
                "total_relief_outs": total_relief_outs,
                "total_relief_runs_allowed": total_relief_runs_allowed,
                "short_first_up_flag": 1 if first_outs <= 3 else 0,
                "bulk_first_up_flag": 1 if first_outs >= 6 else 0,
                "two_reliever_containment_flag": 1 if relievers_used <= 2 else 0,
                "four_plus_reliever_flag": 1 if relievers_used >= 4 else 0,
                "six_plus_reliever_flag": 1 if relievers_used >= 6 else 0,
            }
        )

    if not game_packets:
        return None

    def window_packets(window_games: int) -> list[dict[str, Any]]:
        return game_packets[:window_games]

    last3 = window_packets(3)
    last5 = window_packets(5)
    last10 = window_packets(10)

    relievers_used_avg_last3 = safe_mean([packet["relievers_used"] for packet in last3])
    relievers_used_avg_last5 = safe_mean([packet["relievers_used"] for packet in last5])
    relievers_used_avg_last10 = safe_mean([packet["relievers_used"] for packet in last10])
    relievers_used_max_last10 = max((packet["relievers_used"] for packet in last10), default=0)
    first_reliever_outs_avg_last3 = safe_mean([packet["first_reliever_outs"] for packet in last3])
    first_reliever_outs_avg_last5 = safe_mean([packet["first_reliever_outs"] for packet in last5])
    first_reliever_outs_avg_last10 = safe_mean([packet["first_reliever_outs"] for packet in last10])
    first_reliever_outs_volatility_last10 = safe_pstdev([packet["first_reliever_outs"] for packet in last10])
    total_relief_outs_avg_last5 = safe_mean([packet["total_relief_outs"] for packet in last5])
    total_relief_outs_avg_last10 = safe_mean([packet["total_relief_outs"] for packet in last10])
    total_relief_runs_allowed_avg_last5 = safe_mean([packet["total_relief_runs_allowed"] for packet in last5])
    total_relief_runs_allowed_avg_last10 = safe_mean([packet["total_relief_runs_allowed"] for packet in last10])
    short_first_up_rate_last5 = safe_mean([packet["short_first_up_flag"] for packet in last5])
    short_first_up_rate_last10 = safe_mean([packet["short_first_up_flag"] for packet in last10])
    bulk_first_up_rate_last5 = safe_mean([packet["bulk_first_up_flag"] for packet in last5])
    bulk_first_up_rate_last10 = safe_mean([packet["bulk_first_up_flag"] for packet in last10])
    two_reliever_containment_rate_last5 = safe_mean([packet["two_reliever_containment_flag"] for packet in last5])
    two_reliever_containment_rate_last10 = safe_mean([packet["two_reliever_containment_flag"] for packet in last10])
    four_plus_reliever_rate_last5 = safe_mean([packet["four_plus_reliever_flag"] for packet in last5])
    four_plus_reliever_rate_last10 = safe_mean([packet["four_plus_reliever_flag"] for packet in last10])
    six_plus_reliever_scramble_rate_last10 = safe_mean([packet["six_plus_reliever_flag"] for packet in last10])
    bullpen_shape_index = clamp_value(
        (relievers_used_avg_last5 or 0.0) * 12
        + (first_reliever_outs_avg_last5 or 0.0) * 6
        + (first_reliever_outs_volatility_last10 or 0.0) * 8
        + (bulk_first_up_rate_last10 or 0.0) * 20
        + (four_plus_reliever_rate_last10 or 0.0) * 18
        + (six_plus_reliever_scramble_rate_last10 or 0.0) * 26
        - (two_reliever_containment_rate_last10 or 0.0) * 18,
        0,
        100,
    )

    return {
        "as_of_date": as_of_date,
        "team_name": team_name,
        "scheduled_opponent": opponent_name,
        "games_sample_last3": len(last3),
        "games_sample_last5": len(last5),
        "games_sample_last10": len(last10),
        "relievers_used_avg_last3": round(relievers_used_avg_last3, 3) if relievers_used_avg_last3 is not None else None,
        "relievers_used_avg_last5": round(relievers_used_avg_last5, 3) if relievers_used_avg_last5 is not None else None,
        "relievers_used_avg_last10": round(relievers_used_avg_last10, 3) if relievers_used_avg_last10 is not None else None,
        "relievers_used_max_last10": relievers_used_max_last10,
        "first_reliever_outs_avg_last3": round(first_reliever_outs_avg_last3, 3) if first_reliever_outs_avg_last3 is not None else None,
        "first_reliever_outs_avg_last5": round(first_reliever_outs_avg_last5, 3) if first_reliever_outs_avg_last5 is not None else None,
        "first_reliever_outs_avg_last10": round(first_reliever_outs_avg_last10, 3) if first_reliever_outs_avg_last10 is not None else None,
        "first_reliever_outs_volatility_last10": round(first_reliever_outs_volatility_last10, 3) if first_reliever_outs_volatility_last10 is not None else None,
        "total_relief_outs_avg_last5": round(total_relief_outs_avg_last5, 3) if total_relief_outs_avg_last5 is not None else None,
        "total_relief_outs_avg_last10": round(total_relief_outs_avg_last10, 3) if total_relief_outs_avg_last10 is not None else None,
        "total_relief_runs_allowed_avg_last5": round(total_relief_runs_allowed_avg_last5, 3) if total_relief_runs_allowed_avg_last5 is not None else None,
        "total_relief_runs_allowed_avg_last10": round(total_relief_runs_allowed_avg_last10, 3) if total_relief_runs_allowed_avg_last10 is not None else None,
        "short_first_up_rate_last5": short_first_up_rate_last5,
        "short_first_up_rate_last10": short_first_up_rate_last10,
        "bulk_first_up_rate_last5": bulk_first_up_rate_last5,
        "bulk_first_up_rate_last10": bulk_first_up_rate_last10,
        "two_reliever_containment_rate_last5": two_reliever_containment_rate_last5,
        "two_reliever_containment_rate_last10": two_reliever_containment_rate_last10,
        "four_plus_reliever_rate_last5": four_plus_reliever_rate_last5,
        "four_plus_reliever_rate_last10": four_plus_reliever_rate_last10,
        "six_plus_reliever_scramble_rate_last10": six_plus_reliever_scramble_rate_last10,
        "bullpen_shape_index": round(bullpen_shape_index, 2),
        "raw_json": json.dumps(
            {
                "recentGameDates": [packet["game_date"] for packet in game_packets],
                "recentRelieversUsed": [packet["relievers_used"] for packet in game_packets],
                "recentFirstRelieverOuts": [packet["first_reliever_outs"] for packet in game_packets],
                "recentTotalReliefOuts": [packet["total_relief_outs"] for packet in game_packets],
                "recentTotalReliefRunsAllowed": [packet["total_relief_runs_allowed"] for packet in game_packets],
            },
            sort_keys=True,
        ),
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
        conn.execute("DELETE FROM mlb_bullpen_usage WHERE as_of_date <= ?", (through_date,))
        conn.execute("DELETE FROM mlb_likely_relief_chains WHERE as_of_date <= ?", (through_date,))
        conn.execute("DELETE FROM mlb_team_bullpen_shape_daily WHERE as_of_date <= ?", (through_date,))
    else:
        conn.execute("DELETE FROM mlb_team_rolling_form")
        conn.execute("DELETE FROM mlb_starting_pitcher_rolling_form")
        conn.execute("DELETE FROM mlb_bullpen_usage")
        conn.execute("DELETE FROM mlb_likely_relief_chains")
        conn.execute("DELETE FROM mlb_team_bullpen_shape_daily")

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
                bullpen_shape_row = build_team_bullpen_shape_row(
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
                if bullpen_shape_row:
                    conn.execute(
                        """
                        INSERT INTO mlb_team_bullpen_shape_daily (
                          as_of_date, team_name, scheduled_opponent,
                          games_sample_last3, games_sample_last5, games_sample_last10,
                          relievers_used_avg_last3, relievers_used_avg_last5, relievers_used_avg_last10,
                          relievers_used_max_last10,
                          first_reliever_outs_avg_last3, first_reliever_outs_avg_last5, first_reliever_outs_avg_last10,
                          first_reliever_outs_volatility_last10,
                          total_relief_outs_avg_last5, total_relief_outs_avg_last10,
                          total_relief_runs_allowed_avg_last5, total_relief_runs_allowed_avg_last10,
                          short_first_up_rate_last5, short_first_up_rate_last10,
                          bulk_first_up_rate_last5, bulk_first_up_rate_last10,
                          two_reliever_containment_rate_last5, two_reliever_containment_rate_last10,
                          four_plus_reliever_rate_last5, four_plus_reliever_rate_last10,
                          six_plus_reliever_scramble_rate_last10, bullpen_shape_index, raw_json
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                        """,
                        (
                            bullpen_shape_row["as_of_date"],
                            bullpen_shape_row["team_name"],
                            bullpen_shape_row["scheduled_opponent"],
                            bullpen_shape_row["games_sample_last3"],
                            bullpen_shape_row["games_sample_last5"],
                            bullpen_shape_row["games_sample_last10"],
                            bullpen_shape_row["relievers_used_avg_last3"],
                            bullpen_shape_row["relievers_used_avg_last5"],
                            bullpen_shape_row["relievers_used_avg_last10"],
                            bullpen_shape_row["relievers_used_max_last10"],
                            bullpen_shape_row["first_reliever_outs_avg_last3"],
                            bullpen_shape_row["first_reliever_outs_avg_last5"],
                            bullpen_shape_row["first_reliever_outs_avg_last10"],
                            bullpen_shape_row["first_reliever_outs_volatility_last10"],
                            bullpen_shape_row["total_relief_outs_avg_last5"],
                            bullpen_shape_row["total_relief_outs_avg_last10"],
                            bullpen_shape_row["total_relief_runs_allowed_avg_last5"],
                            bullpen_shape_row["total_relief_runs_allowed_avg_last10"],
                            bullpen_shape_row["short_first_up_rate_last5"],
                            bullpen_shape_row["short_first_up_rate_last10"],
                            bullpen_shape_row["bulk_first_up_rate_last5"],
                            bullpen_shape_row["bulk_first_up_rate_last10"],
                            bullpen_shape_row["two_reliever_containment_rate_last5"],
                            bullpen_shape_row["two_reliever_containment_rate_last10"],
                            bullpen_shape_row["four_plus_reliever_rate_last5"],
                            bullpen_shape_row["four_plus_reliever_rate_last10"],
                            bullpen_shape_row["six_plus_reliever_scramble_rate_last10"],
                            bullpen_shape_row["bullpen_shape_index"],
                            bullpen_shape_row["raw_json"],
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


def refresh_hidden_edge_profiles(
    conn: sqlite3.Connection,
    through_date: str | None = None,
    as_of_date: str | None = None,
) -> None:
    init_db(conn)
    team_windows = (5, 10)

    if as_of_date:
        dates = [
            row["game_date"]
            for row in conn.execute(
                "SELECT DISTINCT game_date FROM mlb_games WHERE game_date = ? ORDER BY game_date",
                (as_of_date,),
            ).fetchall()
        ]
        conn.execute("DELETE FROM mlb_team_whiff_persistence_profiles WHERE as_of_date = ?", (as_of_date,))
        conn.execute("DELETE FROM mlb_team_lead_surrender_profiles WHERE as_of_date = ?", (as_of_date,))
        conn.execute("DELETE FROM mlb_team_form_carryover_profiles WHERE as_of_date = ?", (as_of_date,))
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
            conn.execute("DELETE FROM mlb_team_whiff_persistence_profiles WHERE as_of_date <= ?", (through_date,))
            conn.execute("DELETE FROM mlb_team_lead_surrender_profiles WHERE as_of_date <= ?", (through_date,))
            conn.execute("DELETE FROM mlb_team_form_carryover_profiles WHERE as_of_date <= ?", (through_date,))
        else:
            conn.execute("DELETE FROM mlb_team_whiff_persistence_profiles")
            conn.execute("DELETE FROM mlb_team_lead_surrender_profiles")
            conn.execute("DELETE FROM mlb_team_form_carryover_profiles")

    for current_date in dates:
        teams = [
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
                (current_date, current_date),
            ).fetchall()
        ]

        for team_name in teams:
            for window_games in team_windows:
                packets = build_recent_team_hidden_edge_packets(conn, team_name, current_date, window_games)
                whiff_row = build_whiff_persistence_row(current_date, team_name, window_games, packets)
                if whiff_row:
                    conn.execute(
                        """
                        INSERT INTO mlb_team_whiff_persistence_profiles (
                          as_of_date, team_name, window_games, games_sample,
                          early_two_inning_pa_per_game, early_two_inning_strikeout_rate,
                          early_two_inning_whiff_rate, games_with_early_whiff_flag,
                          early_whiff_flag_rate, early_whiff_persist_rate, early_whiff_rebound_rate,
                          avg_rest_of_game_runs_after_whiff, avg_rest_of_game_hits_after_whiff,
                          avg_rest_of_game_strikeout_rate_after_whiff, avg_rest_of_game_runs_without_whiff,
                          avg_rest_of_game_hits_without_whiff, whiff_persistence_index, whiff_rebound_index
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                        """,
                        (
                            whiff_row["as_of_date"],
                            whiff_row["team_name"],
                            whiff_row["window_games"],
                            whiff_row["games_sample"],
                            whiff_row["early_two_inning_pa_per_game"],
                            whiff_row["early_two_inning_strikeout_rate"],
                            whiff_row["early_two_inning_whiff_rate"],
                            whiff_row["games_with_early_whiff_flag"],
                            whiff_row["early_whiff_flag_rate"],
                            whiff_row["early_whiff_persist_rate"],
                            whiff_row["early_whiff_rebound_rate"],
                            whiff_row["avg_rest_of_game_runs_after_whiff"],
                            whiff_row["avg_rest_of_game_hits_after_whiff"],
                            whiff_row["avg_rest_of_game_strikeout_rate_after_whiff"],
                            whiff_row["avg_rest_of_game_runs_without_whiff"],
                            whiff_row["avg_rest_of_game_hits_without_whiff"],
                            whiff_row["whiff_persistence_index"],
                            whiff_row["whiff_rebound_index"],
                        ),
                    )

                lead_row = build_lead_surrender_row(current_date, team_name, window_games, packets)
                if lead_row:
                    conn.execute(
                        """
                        INSERT INTO mlb_team_lead_surrender_profiles (
                          as_of_date, team_name, window_games, games_sample, led_after5_rate,
                          led_after7_rate, trailed_after5_rate, trailed_after7_rate,
                          lead_after5_conversion_rate, lead_after7_conversion_rate,
                          blew_lead_after5_rate, blew_lead_after7_rate, comeback_after5_rate,
                          comeback_after7_rate, one_run_lead_hold_rate,
                          avg_runs_allowed_after_leading5, avg_runs_scored_when_trailing5,
                          lead_surrender_index, comeback_resilience_index
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                        """,
                        (
                            lead_row["as_of_date"],
                            lead_row["team_name"],
                            lead_row["window_games"],
                            lead_row["games_sample"],
                            lead_row["led_after5_rate"],
                            lead_row["led_after7_rate"],
                            lead_row["trailed_after5_rate"],
                            lead_row["trailed_after7_rate"],
                            lead_row["lead_after5_conversion_rate"],
                            lead_row["lead_after7_conversion_rate"],
                            lead_row["blew_lead_after5_rate"],
                            lead_row["blew_lead_after7_rate"],
                            lead_row["comeback_after5_rate"],
                            lead_row["comeback_after7_rate"],
                            lead_row["one_run_lead_hold_rate"],
                            lead_row["avg_runs_allowed_after_leading5"],
                            lead_row["avg_runs_scored_when_trailing5"],
                            lead_row["lead_surrender_index"],
                            lead_row["comeback_resilience_index"],
                        ),
                    )

                carryover_row = build_form_carryover_row(current_date, team_name, window_games, packets)
                if carryover_row:
                    conn.execute(
                        """
                        INSERT INTO mlb_team_form_carryover_profiles (
                          as_of_date, team_name, window_games, transitions_sample,
                          after_win_next_win_rate, after_loss_bounce_rate,
                          after_blowout_win_next_win_rate, after_blowout_loss_bounce_rate,
                          after_comeback_win_next_win_rate, after_bullpen_flip_loss_bounce_rate,
                          series_game2_win_rate, series_game3plus_win_rate,
                          hot_streak_hold_rate, hot_streak_break_rate,
                          cold_streak_continue_rate, cold_streak_bounce_rate,
                          avg_next_game_run_diff_after_win, avg_next_game_run_diff_after_loss,
                          carryover_instability_index, bounceback_index
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                        """,
                        (
                            carryover_row["as_of_date"],
                            carryover_row["team_name"],
                            carryover_row["window_games"],
                            carryover_row["transitions_sample"],
                            carryover_row["after_win_next_win_rate"],
                            carryover_row["after_loss_bounce_rate"],
                            carryover_row["after_blowout_win_next_win_rate"],
                            carryover_row["after_blowout_loss_bounce_rate"],
                            carryover_row["after_comeback_win_next_win_rate"],
                            carryover_row["after_bullpen_flip_loss_bounce_rate"],
                            carryover_row["series_game2_win_rate"],
                            carryover_row["series_game3plus_win_rate"],
                            carryover_row["hot_streak_hold_rate"],
                            carryover_row["hot_streak_break_rate"],
                            carryover_row["cold_streak_continue_rate"],
                            carryover_row["cold_streak_bounce_rate"],
                            carryover_row["avg_next_game_run_diff_after_win"],
                            carryover_row["avg_next_game_run_diff_after_loss"],
                            carryover_row["carryover_instability_index"],
                            carryover_row["bounceback_index"],
                        ),
                    )

    conn.commit()


def refresh_state_snapshots(
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
        conn.execute("DELETE FROM mlb_team_state_snapshots WHERE as_of_date = ?", (as_of_date,))
        conn.execute("DELETE FROM mlb_hitter_state_snapshots WHERE as_of_date = ?", (as_of_date,))
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
            conn.execute("DELETE FROM mlb_team_state_snapshots WHERE as_of_date <= ?", (through_date,))
            conn.execute("DELETE FROM mlb_hitter_state_snapshots WHERE as_of_date <= ?", (through_date,))
        else:
            conn.execute("DELETE FROM mlb_team_state_snapshots")
            conn.execute("DELETE FROM mlb_hitter_state_snapshots")

    for current_date in dates:
        teams = [
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
                (current_date, current_date),
            ).fetchall()
        ]

        for team_name in teams:
            packets = build_recent_team_hidden_edge_packets(conn, team_name, current_date, 5)
            team_row = build_recent_team_state_row(conn, current_date, team_name, packets)
            if team_row:
                conn.execute(
                    """
                    INSERT INTO mlb_team_state_snapshots (
                      as_of_date, team_name, scheduled_opponent, scheduled_series_game_number,
                      division_matchup_flag, games_sample, previous_result, streak_direction,
                      streak_length, win_pct_last3, win_pct_last5, run_diff_last3, run_diff_last5,
                      close_loss_count_last5, blowout_win_count_last5, blowout_loss_count_last5,
                      comeback_win_count_last5, bullpen_flip_loss_count_last5,
                      quiet_first5_count_last5, first_inning_jolt_count_last5,
                      opponent_win_pct_last5, snapback_pressure_index,
                      heat_regression_index, form_pressure_index
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        team_row["as_of_date"],
                        team_row["team_name"],
                        team_row["scheduled_opponent"],
                        team_row["scheduled_series_game_number"],
                        team_row["division_matchup_flag"],
                        team_row["games_sample"],
                        team_row["previous_result"],
                        team_row["streak_direction"],
                        team_row["streak_length"],
                        team_row["win_pct_last3"],
                        team_row["win_pct_last5"],
                        team_row["run_diff_last3"],
                        team_row["run_diff_last5"],
                        team_row["close_loss_count_last5"],
                        team_row["blowout_win_count_last5"],
                        team_row["blowout_loss_count_last5"],
                        team_row["comeback_win_count_last5"],
                        team_row["bullpen_flip_loss_count_last5"],
                        team_row["quiet_first5_count_last5"],
                        team_row["first_inning_jolt_count_last5"],
                        team_row["opponent_win_pct_last5"],
                        team_row["snapback_pressure_index"],
                        team_row["heat_regression_index"],
                        team_row["form_pressure_index"],
                    ),
                )

            player_rows = conn.execute(
                """
                SELECT
                  player_id,
                  player_name,
                  MAX(game_date) AS last_game_date
                FROM mlb_player_game_batting
                WHERE team_name = ?
                  AND game_date < ?
                GROUP BY player_id, player_name
                HAVING julianday(?) - julianday(MAX(game_date)) <= 14
                ORDER BY last_game_date DESC, player_name ASC
                """,
                (team_name, current_date, current_date),
            ).fetchall()

            for player_row in player_rows:
                hitter_row = build_recent_hitter_state_row(
                    conn,
                    current_date,
                    team_name,
                    to_int(player_row["player_id"]) or 0,
                    player_row["player_name"],
                )
                if not hitter_row:
                    continue
                conn.execute(
                    """
                    INSERT INTO mlb_hitter_state_snapshots (
                      as_of_date, team_name, player_id, player_name, games_sample,
                      days_since_last_game, batting_order_avg_last5, hit_streak_games,
                      hitless_streak_games, multi_hit_games_last5, multi_tb_games_last5,
                      home_run_streak_games, hits_per_pa_last5, total_bases_per_pa_last5,
                      strikeout_rate_last5, walk_rate_last5, whiff_rate_last5,
                      pressure_plate_index, cold_streak_index, heat_regression_index
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ON CONFLICT(as_of_date, player_id) DO UPDATE SET
                      team_name=excluded.team_name,
                      player_name=excluded.player_name,
                      games_sample=excluded.games_sample,
                      days_since_last_game=excluded.days_since_last_game,
                      batting_order_avg_last5=excluded.batting_order_avg_last5,
                      hit_streak_games=excluded.hit_streak_games,
                      hitless_streak_games=excluded.hitless_streak_games,
                      multi_hit_games_last5=excluded.multi_hit_games_last5,
                      multi_tb_games_last5=excluded.multi_tb_games_last5,
                      home_run_streak_games=excluded.home_run_streak_games,
                      hits_per_pa_last5=excluded.hits_per_pa_last5,
                      total_bases_per_pa_last5=excluded.total_bases_per_pa_last5,
                      strikeout_rate_last5=excluded.strikeout_rate_last5,
                      walk_rate_last5=excluded.walk_rate_last5,
                      whiff_rate_last5=excluded.whiff_rate_last5,
                      pressure_plate_index=excluded.pressure_plate_index,
                      cold_streak_index=excluded.cold_streak_index,
                      heat_regression_index=excluded.heat_regression_index
                    """,
                    (
                        hitter_row["as_of_date"],
                        hitter_row["team_name"],
                        hitter_row["player_id"],
                        hitter_row["player_name"],
                        hitter_row["games_sample"],
                        hitter_row["days_since_last_game"],
                        hitter_row["batting_order_avg_last5"],
                        hitter_row["hit_streak_games"],
                        hitter_row["hitless_streak_games"],
                        hitter_row["multi_hit_games_last5"],
                        hitter_row["multi_tb_games_last5"],
                        hitter_row["home_run_streak_games"],
                        hitter_row["hits_per_pa_last5"],
                        hitter_row["total_bases_per_pa_last5"],
                        hitter_row["strikeout_rate_last5"],
                        hitter_row["walk_rate_last5"],
                        hitter_row["whiff_rate_last5"],
                        hitter_row["pressure_plate_index"],
                        hitter_row["cold_streak_index"],
                        hitter_row["heat_regression_index"],
                    ),
                )

    conn.commit()


def refresh_hitter_classic_trend_snapshots(
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
        conn.execute("DELETE FROM mlb_hitter_classic_trend_snapshots WHERE as_of_date = ?", (as_of_date,))
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
            conn.execute("DELETE FROM mlb_hitter_classic_trend_snapshots WHERE as_of_date <= ?", (through_date,))
        else:
            conn.execute("DELETE FROM mlb_hitter_classic_trend_snapshots")

    for current_date in dates:
        teams = [
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
                (current_date, current_date),
            ).fetchall()
        ]

        for team_name in teams:
            player_rows = conn.execute(
                """
                SELECT
                  player_id,
                  player_name,
                  MAX(game_date) AS last_game_date
                FROM mlb_player_game_batting
                WHERE team_name = ?
                  AND game_date < ?
                GROUP BY player_id, player_name
                HAVING julianday(?) - julianday(MAX(game_date)) <= 21
                ORDER BY last_game_date DESC, player_name ASC
                """,
                (team_name, current_date, current_date),
            ).fetchall()

            for player_row in player_rows:
                player_id = to_int(player_row["player_id"]) or 0
                if not player_id:
                    continue
                trend_row = build_recent_hitter_classic_trend_row(
                    conn,
                    current_date,
                    team_name,
                    player_id,
                    player_row["player_name"],
                )
                if not trend_row:
                    continue
                conn.execute(
                    """
                    INSERT INTO mlb_hitter_classic_trend_snapshots (
                      as_of_date, team_name, player_id, player_name, days_since_last_game,
                      games_sample_last10, pa_sample_last10, batting_order_avg_last10,
                      multi_hit_games_last10, multi_tb_games_last10, home_run_games_last10,
                      hits_per_pa_last10, total_bases_per_pa_last10, strikeout_rate_last10,
                      walk_rate_last10, whiff_rate_last10,
                      hits_per_pa_last5_minus_last10, total_bases_per_pa_last5_minus_last10,
                      strikeout_rate_last5_minus_last10
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ON CONFLICT(as_of_date, player_id) DO UPDATE SET
                      team_name=excluded.team_name,
                      player_name=excluded.player_name,
                      days_since_last_game=excluded.days_since_last_game,
                      games_sample_last10=excluded.games_sample_last10,
                      pa_sample_last10=excluded.pa_sample_last10,
                      batting_order_avg_last10=excluded.batting_order_avg_last10,
                      multi_hit_games_last10=excluded.multi_hit_games_last10,
                      multi_tb_games_last10=excluded.multi_tb_games_last10,
                      home_run_games_last10=excluded.home_run_games_last10,
                      hits_per_pa_last10=excluded.hits_per_pa_last10,
                      total_bases_per_pa_last10=excluded.total_bases_per_pa_last10,
                      strikeout_rate_last10=excluded.strikeout_rate_last10,
                      walk_rate_last10=excluded.walk_rate_last10,
                      whiff_rate_last10=excluded.whiff_rate_last10,
                      hits_per_pa_last5_minus_last10=excluded.hits_per_pa_last5_minus_last10,
                      total_bases_per_pa_last5_minus_last10=excluded.total_bases_per_pa_last5_minus_last10,
                      strikeout_rate_last5_minus_last10=excluded.strikeout_rate_last5_minus_last10
                    """,
                    (
                        trend_row["as_of_date"],
                        trend_row["team_name"],
                        trend_row["player_id"],
                        trend_row["player_name"],
                        trend_row["days_since_last_game"],
                        trend_row["games_sample_last10"],
                        trend_row["pa_sample_last10"],
                        trend_row["batting_order_avg_last10"],
                        trend_row["multi_hit_games_last10"],
                        trend_row["multi_tb_games_last10"],
                        trend_row["home_run_games_last10"],
                        trend_row["hits_per_pa_last10"],
                        trend_row["total_bases_per_pa_last10"],
                        trend_row["strikeout_rate_last10"],
                        trend_row["walk_rate_last10"],
                        trend_row["whiff_rate_last10"],
                        trend_row["hits_per_pa_last5_minus_last10"],
                        trend_row["total_bases_per_pa_last5_minus_last10"],
                        trend_row["strikeout_rate_last5_minus_last10"],
                    ),
                )

    conn.commit()


def refresh_hitter_opponent_context_snapshots(
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
        conn.execute("DELETE FROM mlb_hitter_opponent_context_snapshots WHERE as_of_date = ?", (as_of_date,))
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
            conn.execute("DELETE FROM mlb_hitter_opponent_context_snapshots WHERE as_of_date <= ?", (through_date,))
        else:
            conn.execute("DELETE FROM mlb_hitter_opponent_context_snapshots")

    for current_date in dates:
        teams = [
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
                (current_date, current_date),
            ).fetchall()
        ]

        for team_name in teams:
            player_rows = conn.execute(
                """
                SELECT
                  player_id,
                  player_name,
                  MAX(game_date) AS last_game_date
                FROM mlb_player_game_batting
                WHERE team_name = ?
                  AND game_date < ?
                GROUP BY player_id, player_name
                HAVING julianday(?) - julianday(MAX(game_date)) <= 21
                ORDER BY last_game_date DESC, player_name ASC
                """,
                (team_name, current_date, current_date),
            ).fetchall()

            for player_row in player_rows:
                player_id = to_int(player_row["player_id"]) or 0
                if not player_id:
                    continue
                context_row = build_recent_hitter_opponent_context_row(
                    conn,
                    current_date,
                    team_name,
                    player_id,
                    player_row["player_name"],
                )
                if not context_row:
                    continue
                conn.execute(
                    """
                    INSERT INTO mlb_hitter_opponent_context_snapshots (
                      as_of_date, team_name, player_id, player_name,
                      games_sample_last10, avg_opponent_win_pct_last5_last10,
                      avg_opponent_run_diff_last5_last10, avg_opponent_run_diff_per_game_last10,
                      games_vs_winning_last10, games_vs_positive_run_diff_last10,
                      pa_vs_winning_last10, hits_per_pa_vs_winning_last10,
                      total_bases_per_pa_vs_winning_last10, weighted_hits_per_pa_last10,
                      weighted_total_bases_per_pa_last10, hits_per_pa_weight_delta_last10,
                      total_bases_per_pa_weight_delta_last10
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ON CONFLICT(as_of_date, player_id) DO UPDATE SET
                      team_name=excluded.team_name,
                      player_name=excluded.player_name,
                      games_sample_last10=excluded.games_sample_last10,
                      avg_opponent_win_pct_last5_last10=excluded.avg_opponent_win_pct_last5_last10,
                      avg_opponent_run_diff_last5_last10=excluded.avg_opponent_run_diff_last5_last10,
                      avg_opponent_run_diff_per_game_last10=excluded.avg_opponent_run_diff_per_game_last10,
                      games_vs_winning_last10=excluded.games_vs_winning_last10,
                      games_vs_positive_run_diff_last10=excluded.games_vs_positive_run_diff_last10,
                      pa_vs_winning_last10=excluded.pa_vs_winning_last10,
                      hits_per_pa_vs_winning_last10=excluded.hits_per_pa_vs_winning_last10,
                      total_bases_per_pa_vs_winning_last10=excluded.total_bases_per_pa_vs_winning_last10,
                      weighted_hits_per_pa_last10=excluded.weighted_hits_per_pa_last10,
                      weighted_total_bases_per_pa_last10=excluded.weighted_total_bases_per_pa_last10,
                      hits_per_pa_weight_delta_last10=excluded.hits_per_pa_weight_delta_last10,
                      total_bases_per_pa_weight_delta_last10=excluded.total_bases_per_pa_weight_delta_last10
                    """,
                    (
                        context_row["as_of_date"],
                        context_row["team_name"],
                        context_row["player_id"],
                        context_row["player_name"],
                        context_row["games_sample_last10"],
                        context_row["avg_opponent_win_pct_last5_last10"],
                        context_row["avg_opponent_run_diff_last5_last10"],
                        context_row["avg_opponent_run_diff_per_game_last10"],
                        context_row["games_vs_winning_last10"],
                        context_row["games_vs_positive_run_diff_last10"],
                        context_row["pa_vs_winning_last10"],
                        context_row["hits_per_pa_vs_winning_last10"],
                        context_row["total_bases_per_pa_vs_winning_last10"],
                        context_row["weighted_hits_per_pa_last10"],
                        context_row["weighted_total_bases_per_pa_last10"],
                        context_row["hits_per_pa_weight_delta_last10"],
                        context_row["total_bases_per_pa_weight_delta_last10"],
                    ),
                )

    conn.commit()


def ingest_hitter_statcast_date_range(conn: sqlite3.Connection, start_date: str, end_date: str) -> int:
    init_db(conn)
    start = datetime.strptime(start_date, "%Y-%m-%d").date()
    end = datetime.strptime(end_date, "%Y-%m-%d").date()
    if end < start:
        raise ValueError("end_date must be on or after start_date")

    total_rows = 0
    current = start
    while current <= end:
        total_rows += ingest_hitter_statcast_day(conn, current.isoformat())
        current += timedelta(days=1)
    return total_rows


def ingest_hitter_statcast_day(conn: sqlite3.Connection, date_text: str) -> int:
    init_db(conn)
    game_date = datetime.strptime(date_text, "%Y-%m-%d").date()
    next_date = (game_date + timedelta(days=1)).isoformat()
    grouped_url = STATCAST_HITTER_GAME_SEARCH_CSV_URL.format(start_date=date_text, end_date=next_date)
    detail_url = STATCAST_HITTER_DETAIL_SEARCH_CSV_URL.format(start_date=date_text, end_date=next_date)

    grouped_text = fetch_text(grouped_url)
    detail_text = fetch_text(detail_url)

    raw_dir = RAW_DIR / "baseballsavant" / "hitter-statcast" / date_text
    grouped_path = raw_dir / "grouped.csv"
    detail_path = raw_dir / "details.csv"
    write_text(grouped_path, grouped_text)
    write_text(detail_path, detail_text)
    record_snapshot(
        conn,
        source_key="baseballsavant:hitter-statcast-grouped",
        url=grouped_url,
        content_path=grouped_path,
        content_text=grouped_text,
        meta={"date": date_text, "group_by": "name-date"},
    )
    record_snapshot(
        conn,
        source_key="baseballsavant:hitter-statcast-details",
        url=detail_url,
        content_path=detail_path,
        content_text=detail_text,
        meta={"date": date_text, "type": "details"},
    )

    grouped_rows = parse_csv_rows(grouped_text)
    detail_rows = parse_csv_rows(detail_text)

    detail_summary_by_key: dict[tuple[int, int], dict[str, int]] = {}
    for row in detail_rows:
        player_id = to_int(row.get("batter"))
        game_pk = to_int(row.get("game_pk"))
        if not player_id or not game_pk:
            continue
        launch_angle = to_float(row.get("launch_angle"))
        launch_speed = to_float(row.get("launch_speed"))
        bb_type = (row.get("bb_type") or "").strip()
        is_batted_ball = launch_angle is not None or launch_speed is not None or bool(bb_type)
        if not is_batted_ball:
            continue
        key = (game_pk, player_id)
        summary = detail_summary_by_key.setdefault(key, {"bbe": 0, "hard_hit": 0, "sweet_spot": 0})
        summary["bbe"] += 1
        if launch_speed is not None and launch_speed >= 95:
            summary["hard_hit"] += 1
        if launch_angle is not None and 8 <= launch_angle <= 32:
            summary["sweet_spot"] += 1

    context_by_key = {
        (to_int(row["game_pk"]) or 0, to_int(row["player_id"]) or 0): row
        for row in conn.execute(
            """
            SELECT game_pk, player_id, team_name, opponent_name
            FROM mlb_player_game_batting
            WHERE game_date = ?
            """,
            (date_text,),
        ).fetchall()
    }

    conn.execute("DELETE FROM mlb_hitter_statcast_game_logs WHERE game_date = ?", (date_text,))

    inserted = 0
    grouped_rows_by_key: dict[tuple[int, int], dict[str, str]] = {}
    for row in grouped_rows:
        player_id = to_int(row.get("player_id"))
        game_pk = to_int(row.get("game_pk"))
        if not player_id or not game_pk:
            continue
        key = (game_pk, player_id)
        existing = grouped_rows_by_key.get(key)
        if existing is None:
            grouped_rows_by_key[key] = row
            continue
        existing_pa = to_int(existing.get("pa")) or 0
        candidate_pa = to_int(row.get("pa")) or 0
        existing_xwoba = to_float(existing.get("xwoba"))
        candidate_xwoba = to_float(row.get("xwoba"))
        if candidate_pa > existing_pa or (candidate_pa == existing_pa and candidate_xwoba is not None and existing_xwoba is None):
            grouped_rows_by_key[key] = row

    for row in grouped_rows_by_key.values():
        player_id = to_int(row.get("player_id"))
        game_pk = to_int(row.get("game_pk"))
        if not player_id or not game_pk:
            continue

        detail_summary = detail_summary_by_key.get((game_pk, player_id), {})
        bbe = detail_summary.get("bbe")
        hard_hit_events = detail_summary.get("hard_hit")
        sweet_spot_events = detail_summary.get("sweet_spot")
        if not bbe:
            bbe = to_int(row.get("bip"))
        hard_hit_percent = round((hard_hit_events or 0) * 100 / bbe, 1) if bbe and hard_hit_events is not None else to_float(row.get("hardhit_percent"))
        sweet_spot_percent = round((sweet_spot_events or 0) * 100 / bbe, 1) if bbe and sweet_spot_events is not None else None

        context = context_by_key.get((game_pk, player_id))
        team_name = context["team_name"] if context else None
        opponent_name = context["opponent_name"] if context else None

        source_json = json.dumps(
            {
                "grouped": row,
                "detailSummary": {
                    "battedBallEvents": bbe,
                    "hardHitEvents": hard_hit_events,
                    "sweetSpotEvents": sweet_spot_events,
                },
            },
            sort_keys=True,
        )

        conn.execute(
            """
            INSERT INTO mlb_hitter_statcast_game_logs (
              game_date, game_pk, player_id, player_name, team_name, opponent_name,
              plate_appearances, at_bats, hits, singles, doubles, triples, home_runs,
              strikeouts, walks, batted_ball_events, hard_hit_events, sweet_spot_events,
              barrels_total, batting_average, slugging, woba, xwoba, xba, xobp, xslg,
              avg_launch_speed, avg_launch_angle, avg_bat_speed, avg_swing_length,
              hard_hit_percent, sweet_spot_percent, barrel_bbe_percent, barrel_pa_percent,
              source_json
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(game_pk, player_id) DO UPDATE SET
              game_date=excluded.game_date,
              player_name=excluded.player_name,
              team_name=excluded.team_name,
              opponent_name=excluded.opponent_name,
              plate_appearances=excluded.plate_appearances,
              at_bats=excluded.at_bats,
              hits=excluded.hits,
              singles=excluded.singles,
              doubles=excluded.doubles,
              triples=excluded.triples,
              home_runs=excluded.home_runs,
              strikeouts=excluded.strikeouts,
              walks=excluded.walks,
              batted_ball_events=excluded.batted_ball_events,
              hard_hit_events=excluded.hard_hit_events,
              sweet_spot_events=excluded.sweet_spot_events,
              barrels_total=excluded.barrels_total,
              batting_average=excluded.batting_average,
              slugging=excluded.slugging,
              woba=excluded.woba,
              xwoba=excluded.xwoba,
              xba=excluded.xba,
              xobp=excluded.xobp,
              xslg=excluded.xslg,
              avg_launch_speed=excluded.avg_launch_speed,
              avg_launch_angle=excluded.avg_launch_angle,
              avg_bat_speed=excluded.avg_bat_speed,
              avg_swing_length=excluded.avg_swing_length,
              hard_hit_percent=excluded.hard_hit_percent,
              sweet_spot_percent=excluded.sweet_spot_percent,
              barrel_bbe_percent=excluded.barrel_bbe_percent,
              barrel_pa_percent=excluded.barrel_pa_percent,
              source_json=excluded.source_json
            """,
            (
                date_text,
                game_pk,
                player_id,
                row.get("player_name") or "",
                team_name,
                opponent_name,
                to_int(row.get("pa")),
                to_int(row.get("abs")),
                to_int(row.get("hits")),
                to_int(row.get("singles")),
                to_int(row.get("doubles")),
                to_int(row.get("triples")),
                to_int(row.get("hrs")),
                to_int(row.get("so")),
                to_int(row.get("bb")),
                bbe,
                hard_hit_events,
                sweet_spot_events,
                to_int(row.get("barrels_total")),
                to_float(row.get("ba")),
                to_float(row.get("slg")),
                to_float(row.get("woba")),
                to_float(row.get("xwoba")),
                to_float(row.get("xba")),
                to_float(row.get("xobp")),
                to_float(row.get("xslg")),
                to_float(row.get("launch_speed")),
                to_float(row.get("launch_angle")),
                to_float(row.get("bat_speed")),
                to_float(row.get("swing_length")),
                hard_hit_percent,
                sweet_spot_percent,
                to_float(row.get("barrels_per_bbe_percent")),
                to_float(row.get("barrels_per_pa_percent")),
                source_json,
            ),
        )
        inserted += 1

    conn.commit()
    return inserted


def _build_hitter_statcast_window_summary(rows: list[sqlite3.Row]) -> dict[str, int | float | None]:
    if not rows:
        return {
            "games": 0,
            "pa": 0,
            "bbe": 0,
            "xwoba": None,
            "xba": None,
            "xslg": None,
            "barrel_pct": None,
            "hard_hit_pct": None,
            "sweet_spot_pct": None,
        }

    pa_total = sum(to_int(row["plate_appearances"]) or 0 for row in rows)
    ab_total = sum(to_int(row["at_bats"]) or 0 for row in rows)
    bbe_total = sum(to_int(row["batted_ball_events"]) or 0 for row in rows)
    barrels_total = sum(to_int(row["barrels_total"]) or 0 for row in rows)
    hard_hit_total = sum(to_int(row["hard_hit_events"]) or 0 for row in rows)
    sweet_spot_total = sum(to_int(row["sweet_spot_events"]) or 0 for row in rows)

    def weighted_average(column: str, weight_total: int, weight_column: str) -> float | None:
        if weight_total <= 0:
            return None
        weighted_sum = 0.0
        used_weight = 0
        for sample_row in rows:
            value = to_float(sample_row[column])
            weight = to_int(sample_row[weight_column]) or 0
            if value is None or weight <= 0:
                continue
            weighted_sum += value * weight
            used_weight += weight
        if used_weight <= 0:
            return None
        return round(weighted_sum / used_weight, 3)

    return {
        "games": len(rows),
        "pa": pa_total,
        "bbe": bbe_total,
        "xwoba": weighted_average("xwoba", pa_total, "plate_appearances"),
        "xba": weighted_average("xba", ab_total, "at_bats"),
        "xslg": weighted_average("xslg", ab_total, "at_bats"),
        "barrel_pct": round((barrels_total * 100) / bbe_total, 1) if bbe_total else None,
        "hard_hit_pct": round((hard_hit_total * 100) / bbe_total, 1) if bbe_total else None,
        "sweet_spot_pct": round((sweet_spot_total * 100) / bbe_total, 1) if bbe_total else None,
    }


def build_recent_hitter_statcast_trend_row(
    conn: sqlite3.Connection,
    current_date: str,
    team_name: str,
    player_id: int,
    player_name: str,
) -> dict[str, Any] | None:
    rows = conn.execute(
        """
        SELECT *
        FROM mlb_hitter_statcast_game_logs
        WHERE player_id = ?
          AND game_date < ?
          AND game_date >= date(?, '-30 day')
        ORDER BY game_date DESC
        """,
        (player_id, current_date, current_date),
    ).fetchall()
    if not rows:
        return None

    current_day = datetime.strptime(current_date, "%Y-%m-%d").date()
    windows: dict[int, list[sqlite3.Row]] = {7: [], 14: [], 30: []}

    for row in rows:
        row_date = datetime.strptime(row["game_date"], "%Y-%m-%d").date()
        delta_days = (current_day - row_date).days
        if delta_days <= 0 or delta_days > 30:
            continue
        if delta_days <= 7:
            windows[7].append(row)
            windows[14].append(row)
            windows[30].append(row)
        elif delta_days <= 14:
            windows[14].append(row)
            windows[30].append(row)
        else:
            windows[30].append(row)

    if not windows[30]:
        return None

    summary7 = _build_hitter_statcast_window_summary(windows[7])
    summary14 = _build_hitter_statcast_window_summary(windows[14])
    summary30 = _build_hitter_statcast_window_summary(windows[30])

    def trend(short_value: float | None, long_value: float | None, digits: int = 3) -> float | None:
        if short_value is None or long_value is None:
            return None
        return round(short_value - long_value, digits)

    return {
        "as_of_date": current_date,
        "team_name": team_name,
        "player_id": player_id,
        "player_name": player_name,
        "games_sample_7": summary7["games"],
        "games_sample_14": summary14["games"],
        "games_sample_30": summary30["games"],
        "pa_sample_7": summary7["pa"],
        "pa_sample_14": summary14["pa"],
        "pa_sample_30": summary30["pa"],
        "bbe_sample_7": summary7["bbe"],
        "bbe_sample_14": summary14["bbe"],
        "bbe_sample_30": summary30["bbe"],
        "rolling_7_xwoba": summary7["xwoba"],
        "rolling_14_xwoba": summary14["xwoba"],
        "rolling_30_xwoba": summary30["xwoba"],
        "rolling_7_xba": summary7["xba"],
        "rolling_14_xba": summary14["xba"],
        "rolling_30_xba": summary30["xba"],
        "rolling_7_xslg": summary7["xslg"],
        "rolling_14_xslg": summary14["xslg"],
        "rolling_30_xslg": summary30["xslg"],
        "rolling_7_barrel_pct": summary7["barrel_pct"],
        "rolling_14_barrel_pct": summary14["barrel_pct"],
        "rolling_30_barrel_pct": summary30["barrel_pct"],
        "rolling_7_hard_hit_pct": summary7["hard_hit_pct"],
        "rolling_14_hard_hit_pct": summary14["hard_hit_pct"],
        "rolling_30_hard_hit_pct": summary30["hard_hit_pct"],
        "rolling_7_sweet_spot_pct": summary7["sweet_spot_pct"],
        "rolling_14_sweet_spot_pct": summary14["sweet_spot_pct"],
        "rolling_30_sweet_spot_pct": summary30["sweet_spot_pct"],
        "xwoba_trend_7_minus_30": trend(summary7["xwoba"], summary30["xwoba"]),
        "barrel_trend_7_minus_30": trend(summary7["barrel_pct"], summary30["barrel_pct"], 1),
        "hard_hit_trend_7_minus_30": trend(summary7["hard_hit_pct"], summary30["hard_hit_pct"], 1),
        "sweet_spot_trend_7_minus_30": trend(summary7["sweet_spot_pct"], summary30["sweet_spot_pct"], 1),
    }


def refresh_hitter_statcast_trend_snapshots(
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
        conn.execute("DELETE FROM mlb_hitter_statcast_trend_snapshots WHERE as_of_date = ?", (as_of_date,))
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
            conn.execute("DELETE FROM mlb_hitter_statcast_trend_snapshots WHERE as_of_date <= ?", (through_date,))
        else:
            conn.execute("DELETE FROM mlb_hitter_statcast_trend_snapshots")

    for current_date in dates:
        teams = [
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
                (current_date, current_date),
            ).fetchall()
        ]

        for team_name in teams:
            player_rows = conn.execute(
                """
                SELECT
                  player_id,
                  player_name,
                  MAX(game_date) AS last_game_date
                FROM mlb_hitter_statcast_game_logs
                WHERE team_name = ?
                  AND game_date < ?
                GROUP BY player_id, player_name
                HAVING julianday(?) - julianday(MAX(game_date)) <= 35
                ORDER BY last_game_date DESC, player_name ASC
                """,
                (team_name, current_date, current_date),
            ).fetchall()

            for player_row in player_rows:
                player_id = to_int(player_row["player_id"]) or 0
                if not player_id:
                    continue
                trend_row = build_recent_hitter_statcast_trend_row(
                    conn,
                    current_date,
                    team_name,
                    player_id,
                    player_row["player_name"],
                )
                if not trend_row:
                    continue
                conn.execute(
                    """
                    INSERT INTO mlb_hitter_statcast_trend_snapshots (
                      as_of_date, team_name, player_id, player_name,
                      games_sample_7, games_sample_14, games_sample_30,
                      pa_sample_7, pa_sample_14, pa_sample_30,
                      bbe_sample_7, bbe_sample_14, bbe_sample_30,
                      rolling_7_xwoba, rolling_14_xwoba, rolling_30_xwoba,
                      rolling_7_xba, rolling_14_xba, rolling_30_xba,
                      rolling_7_xslg, rolling_14_xslg, rolling_30_xslg,
                      rolling_7_barrel_pct, rolling_14_barrel_pct, rolling_30_barrel_pct,
                      rolling_7_hard_hit_pct, rolling_14_hard_hit_pct, rolling_30_hard_hit_pct,
                      rolling_7_sweet_spot_pct, rolling_14_sweet_spot_pct, rolling_30_sweet_spot_pct,
                      xwoba_trend_7_minus_30, barrel_trend_7_minus_30,
                      hard_hit_trend_7_minus_30, sweet_spot_trend_7_minus_30
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ON CONFLICT(as_of_date, player_id) DO UPDATE SET
                      team_name=excluded.team_name,
                      player_name=excluded.player_name,
                      games_sample_7=excluded.games_sample_7,
                      games_sample_14=excluded.games_sample_14,
                      games_sample_30=excluded.games_sample_30,
                      pa_sample_7=excluded.pa_sample_7,
                      pa_sample_14=excluded.pa_sample_14,
                      pa_sample_30=excluded.pa_sample_30,
                      bbe_sample_7=excluded.bbe_sample_7,
                      bbe_sample_14=excluded.bbe_sample_14,
                      bbe_sample_30=excluded.bbe_sample_30,
                      rolling_7_xwoba=excluded.rolling_7_xwoba,
                      rolling_14_xwoba=excluded.rolling_14_xwoba,
                      rolling_30_xwoba=excluded.rolling_30_xwoba,
                      rolling_7_xba=excluded.rolling_7_xba,
                      rolling_14_xba=excluded.rolling_14_xba,
                      rolling_30_xba=excluded.rolling_30_xba,
                      rolling_7_xslg=excluded.rolling_7_xslg,
                      rolling_14_xslg=excluded.rolling_14_xslg,
                      rolling_30_xslg=excluded.rolling_30_xslg,
                      rolling_7_barrel_pct=excluded.rolling_7_barrel_pct,
                      rolling_14_barrel_pct=excluded.rolling_14_barrel_pct,
                      rolling_30_barrel_pct=excluded.rolling_30_barrel_pct,
                      rolling_7_hard_hit_pct=excluded.rolling_7_hard_hit_pct,
                      rolling_14_hard_hit_pct=excluded.rolling_14_hard_hit_pct,
                      rolling_30_hard_hit_pct=excluded.rolling_30_hard_hit_pct,
                      rolling_7_sweet_spot_pct=excluded.rolling_7_sweet_spot_pct,
                      rolling_14_sweet_spot_pct=excluded.rolling_14_sweet_spot_pct,
                      rolling_30_sweet_spot_pct=excluded.rolling_30_sweet_spot_pct,
                      xwoba_trend_7_minus_30=excluded.xwoba_trend_7_minus_30,
                      barrel_trend_7_minus_30=excluded.barrel_trend_7_minus_30,
                      hard_hit_trend_7_minus_30=excluded.hard_hit_trend_7_minus_30,
                      sweet_spot_trend_7_minus_30=excluded.sweet_spot_trend_7_minus_30
                    """,
                    (
                        trend_row["as_of_date"],
                        trend_row["team_name"],
                        trend_row["player_id"],
                        trend_row["player_name"],
                        trend_row["games_sample_7"],
                        trend_row["games_sample_14"],
                        trend_row["games_sample_30"],
                        trend_row["pa_sample_7"],
                        trend_row["pa_sample_14"],
                        trend_row["pa_sample_30"],
                        trend_row["bbe_sample_7"],
                        trend_row["bbe_sample_14"],
                        trend_row["bbe_sample_30"],
                        trend_row["rolling_7_xwoba"],
                        trend_row["rolling_14_xwoba"],
                        trend_row["rolling_30_xwoba"],
                        trend_row["rolling_7_xba"],
                        trend_row["rolling_14_xba"],
                        trend_row["rolling_30_xba"],
                        trend_row["rolling_7_xslg"],
                        trend_row["rolling_14_xslg"],
                        trend_row["rolling_30_xslg"],
                        trend_row["rolling_7_barrel_pct"],
                        trend_row["rolling_14_barrel_pct"],
                        trend_row["rolling_30_barrel_pct"],
                        trend_row["rolling_7_hard_hit_pct"],
                        trend_row["rolling_14_hard_hit_pct"],
                        trend_row["rolling_30_hard_hit_pct"],
                        trend_row["rolling_7_sweet_spot_pct"],
                        trend_row["rolling_14_sweet_spot_pct"],
                        trend_row["rolling_30_sweet_spot_pct"],
                        trend_row["xwoba_trend_7_minus_30"],
                        trend_row["barrel_trend_7_minus_30"],
                        trend_row["hard_hit_trend_7_minus_30"],
                        trend_row["sweet_spot_trend_7_minus_30"],
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
          b.runs,
          b.hits,
          b.singles,
          b.total_bases,
          b.rbi,
          b.walks,
          b.home_runs,
          sp.strikeouts AS pitcher_strikeouts,
          s.story_tags_json,
          s.summary_json
        FROM mlb_prop_predictions p
        LEFT JOIN mlb_player_game_batting b
          ON b.game_date = p.prediction_date
         AND b.player_id = p.player_id
         AND b.team_name = COALESCE(p.team_name_full, p.team_name)
         AND b.opponent_name = COALESCE(p.opponent_name_full, p.opponent_name)
        LEFT JOIN mlb_starting_pitcher_game_logs sp
          ON sp.game_date = p.prediction_date
         AND sp.pitcher_id = p.player_id
         AND sp.team_name = COALESCE(p.team_name_full, p.team_name)
         AND sp.opponent_name = COALESCE(p.opponent_name_full, p.opponent_name)
        LEFT JOIN mlb_game_story_signals s
          ON s.game_pk = COALESCE(b.game_pk, sp.game_pk)
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
        elif row["prop_type"] == "runs":
            actual_value = to_float(row["runs"])
        elif row["prop_type"] == "singles":
            actual_value = to_float(row["singles"])
        elif row["prop_type"] == "walks":
            actual_value = to_float(row["walks"])
        elif row["prop_type"] == "totalBases":
            actual_value = to_float(row["total_bases"])
        elif row["prop_type"] == "rbi":
            actual_value = to_float(row["rbi"])
        elif row["prop_type"] in ("hitRunRbi", "hitsRunsRbis"):
            hits = to_float(row["hits"])
            runs = to_float(row["runs"])
            rbi = to_float(row["rbi"])
            actual_value = None if hits is None or runs is None or rbi is None else hits + runs + rbi
        elif row["prop_type"] == "pitcherStrikeouts":
            actual_value = to_float(row["pitcher_strikeouts"])

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
            "runs": row["runs"],
            "hits": row["hits"],
            "rbi": row["rbi"],
            "gamePk": row["game_pk"],
            "pitcherStrikeouts": row["pitcher_strikeouts"],
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


def list_bullpen_shape(
    conn: sqlite3.Connection, date_text: str, team_name: str | None = None
) -> list[sqlite3.Row]:
    if team_name:
        return conn.execute(
            """
            SELECT *
            FROM mlb_team_bullpen_shape_daily
            WHERE as_of_date = ? AND team_name = ?
            ORDER BY bullpen_shape_index DESC, team_name ASC
            """,
            (date_text, team_name),
        ).fetchall()
    return conn.execute(
        """
        SELECT *
        FROM mlb_team_bullpen_shape_daily
        WHERE as_of_date = ?
        ORDER BY bullpen_shape_index DESC, team_name ASC
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
        "runs": "runs",
        "singles": "singles",
        "walks": "walks",
        "totalBases": "total_bases",
        "rbi": "rbi",
        "hitRunRbi": "hit_run_rbi_total",
        "hitsRunsRbis": "hit_run_rbi_total",
        "pitcherStrikeouts": "pitcher_strikeouts",
    }

    grouped: dict[str, list[sqlite3.Row]] = {}
    for row in rows:
        grouped.setdefault(row["prop_type"], []).append(row)

    for prop_type, prop_rows in sorted(grouped.items()):
        stat_field = stat_field_by_prop.get(prop_type)
        hits = 0
        for row in prop_rows:
            line_threshold = to_float(row["line_threshold"])
            if prop_type in ("hitRunRbi", "hitsRunsRbis"):
                hit_value = to_float(row["hits"])
                run_value = to_float(row["runs"])
                rbi_value = to_float(row["rbi"])
                actual_value = (
                    None
                    if hit_value is None or run_value is None or rbi_value is None
                    else hit_value + run_value + rbi_value
                )
            else:
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


def print_bullpen_shape(rows: list[sqlite3.Row]) -> None:
    print(f"Bullpen shape rows: {len(rows)}")
    for row in rows:
        print(
            f"- {row['team_name']} vs {row['scheduled_opponent']} | shape {row['bullpen_shape_index']} | "
            f"relievers avg last5 {row['relievers_used_avg_last5']} | first-up outs last5 {row['first_reliever_outs_avg_last5']} | "
            f"bulk first-up last10 {row['bulk_first_up_rate_last10']} | 2-man containment last10 {row['two_reliever_containment_rate_last10']} | "
            f"6+ scramble last10 {row['six_plus_reliever_scramble_rate_last10']}"
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
                "game_pk": to_int(game.get("gamePk")),
                "game_date": date_text,
                "game_datetime": game.get("gameDate"),
                "game_title": f"{away} @ {home}",
                "venue_name": (game.get("venue") or {}).get("name"),
                "away_team": away,
                "home_team": home,
                "away_pitcher_id": to_int(away_probable.get("id")),
                "away_pitcher_name": away_probable.get("fullName") or "TBD",
                "away_pitcher_hand": away_details.get("pitch_hand") or "",
                "away_pitcher_wins": away_details.get("wins"),
                "away_pitcher_losses": away_details.get("losses"),
                "away_pitcher_era": away_details.get("era"),
                "away_pitcher_strikeouts": away_details.get("strikeouts"),
                "home_pitcher_id": to_int(home_probable.get("id")),
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

    replay_range = subparsers.add_parser(
        "replay-mlb-range-from-raw",
        help="Rebuild warehouse game, plate-appearance, pitch-event, and summary rows from the locally stored raw MLB season archive.",
    )
    replay_range.add_argument("--start-date", required=True, help="Start date in YYYY-MM-DD format.")
    replay_range.add_argument("--end-date", required=True, help="End date in YYYY-MM-DD format.")

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

    derive_hidden = subparsers.add_parser(
        "derive-hidden-edge-features",
        help="Refresh hidden-edge whiff persistence, lead/surrender, and form carryover profile tables.",
    )
    derive_hidden.add_argument("--through-date", help="Optional YYYY-MM-DD cutoff. Defaults to every loaded date.")
    derive_hidden.add_argument(
        "--as-of-date",
        help="Optional single as-of date to rebuild incrementally without touching earlier hidden-edge rows.",
    )

    derive_state = subparsers.add_parser(
        "derive-state-snapshots",
        help="Refresh rolling team and hitter state snapshot tables for scheduled teams.",
    )
    derive_state.add_argument("--through-date", help="Optional YYYY-MM-DD cutoff. Defaults to every loaded date.")
    derive_state.add_argument(
        "--as-of-date",
        help="Optional single as-of date to rebuild incrementally without touching earlier snapshot rows.",
    )

    derive_hitter_classic = subparsers.add_parser(
        "derive-hitter-classic-trends",
        help="Refresh rolling hitter classic last-10 trend snapshots for scheduled teams.",
    )
    derive_hitter_classic.add_argument(
        "--through-date", help="Optional YYYY-MM-DD cutoff. Defaults to every loaded date."
    )
    derive_hitter_classic.add_argument(
        "--as-of-date",
        help="Optional single as-of date to rebuild incrementally without touching earlier classic trend rows.",
    )

    derive_hitter_opponent_context = subparsers.add_parser(
        "derive-hitter-opponent-context",
        help="Refresh rolling hitter opponent-strength context snapshots for scheduled teams.",
    )
    derive_hitter_opponent_context.add_argument(
        "--through-date", help="Optional YYYY-MM-DD cutoff. Defaults to every loaded date."
    )
    derive_hitter_opponent_context.add_argument(
        "--as-of-date",
        help="Optional single as-of date to rebuild incrementally without touching earlier opponent-context rows.",
    )

    derive_market_context = subparsers.add_parser(
        "derive-market-context",
        help="Refresh rolling team market-history and opponent-quality context tables for scheduled teams.",
    )
    derive_market_context.add_argument(
        "--through-date", help="Optional YYYY-MM-DD cutoff. Defaults to every loaded date."
    )
    derive_market_context.add_argument(
        "--as-of-date",
        help="Optional single as-of date to rebuild incrementally without touching earlier market-context rows.",
    )

    derive_mistake_shapes = subparsers.add_parser(
        "derive-mistake-shapes",
        help="Refresh daily team, starter, bullpen, and lineup mistake-shape profile tables.",
    )
    derive_mistake_shapes.add_argument(
        "--through-date", help="Optional YYYY-MM-DD cutoff. Defaults to every loaded date."
    )
    derive_mistake_shapes.add_argument(
        "--as-of-date",
        help="Optional single as-of date to rebuild incrementally without touching earlier mistake-shape rows.",
    )

    derive_first_inning = subparsers.add_parser(
        "derive-first-inning-profiles",
        help="Refresh daily team and starter first-inning profile tables.",
    )
    derive_first_inning.add_argument(
        "--through-date", help="Optional YYYY-MM-DD cutoff. Defaults to every loaded date."
    )
    derive_first_inning.add_argument(
        "--as-of-date",
        help="Optional single as-of date to rebuild incrementally without touching earlier first-inning rows.",
    )

    derive_story_labels = subparsers.add_parser(
        "derive-story-labels",
        help="Refresh game-story, phase-outcome, and market-mispricing label tables from stored outcomes and history records.",
    )
    derive_story_labels.add_argument("--through-date", help="Optional YYYY-MM-DD cutoff. Defaults to every loaded date.")
    derive_story_labels.add_argument(
        "--as-of-date",
        help="Optional single date to rebuild incrementally without touching earlier label rows.",
    )

    ingest_pitcher_war_parser = subparsers.add_parser(
        "ingest-pitcher-war",
        help="Fetch and store season-level pitcher WAR snapshots from Baseball-Reference.",
    )
    ingest_pitcher_war_parser.add_argument(
        "--season",
        action="append",
        type=int,
        dest="seasons",
        help="Season year to store. Repeat to load multiple seasons. Defaults to all rows in the feed.",
    )

    ingest_hr = subparsers.add_parser(
        "ingest-statcast-hr",
        help="Fetch and store a Statcast home-run leaderboard snapshot for a season.",
    )
    ingest_hr.add_argument("--date", required=True, help="Snapshot date in YYYY-MM-DD format.")
    ingest_hr.add_argument("--season", required=True, type=int, help="Season year.")

    ingest_hitter_statcast = subparsers.add_parser(
        "ingest-hitter-statcast-range",
        help="Fetch and store per-player, per-game Statcast batting aggregates for an inclusive date range.",
    )
    ingest_hitter_statcast.add_argument("--start-date", required=True, help="Start date in YYYY-MM-DD format.")
    ingest_hitter_statcast.add_argument("--end-date", required=True, help="End date in YYYY-MM-DD format.")

    derive_hitter_statcast = subparsers.add_parser(
        "derive-hitter-statcast-trends",
        help="Refresh rolling hitter Statcast trend snapshots for scheduled teams.",
    )
    derive_hitter_statcast.add_argument(
        "--through-date", help="Optional YYYY-MM-DD cutoff. Defaults to every loaded date."
    )
    derive_hitter_statcast.add_argument(
        "--as-of-date",
        help="Optional single as-of date to rebuild incrementally without touching earlier Statcast trend rows.",
    )

    derive_batter_outcomes = subparsers.add_parser(
        "derive-batter-outcomes",
        help="Refresh explicit daily batter outcome rows from stored MLB batting box scores.",
    )
    derive_batter_outcomes.add_argument(
        "--through-date", help="Optional YYYY-MM-DD cutoff. Defaults to every loaded date."
    )
    derive_batter_outcomes.add_argument(
        "--as-of-date",
        help="Optional single game date to rebuild incrementally without touching earlier outcome rows.",
    )

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
    grade_props.add_argument(
        "--prop-type",
        help="Optional prop type filter, e.g. hits, runs, totalBases, rbi, hitRunRbi, walks, singles.",
    )

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

    list_bullpen_shape_parser = subparsers.add_parser(
        "list-bullpen-shape", help="Print team bullpen-shape rows for a date."
    )
    list_bullpen_shape_parser.add_argument("--date", required=True, help="Date in YYYY-MM-DD format.")
    list_bullpen_shape_parser.add_argument("--team", help="Optional team name filter.")

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

        if args.command == "replay-mlb-range-from-raw":
            replay_mlb_date_range_from_raw(conn, args.start_date, args.end_date)
            print(
                f"Replayed local raw MLB snapshots into warehouse rows from {args.start_date} through {args.end_date}"
            )
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

        if args.command == "derive-hidden-edge-features":
            refresh_hidden_edge_profiles(conn, args.through_date, args.as_of_date)
            if args.as_of_date:
                print(f"Refreshed MLB hidden-edge feature tables for {args.as_of_date}")
            elif args.through_date:
                print(f"Refreshed MLB hidden-edge feature tables through {args.through_date}")
            else:
                print("Refreshed MLB hidden-edge feature tables for all loaded dates")
            return

        if args.command == "derive-state-snapshots":
            refresh_state_snapshots(conn, args.through_date, args.as_of_date)
            if args.as_of_date:
                print(f"Refreshed MLB rolling state snapshots for {args.as_of_date}")
            elif args.through_date:
                print(f"Refreshed MLB rolling state snapshots through {args.through_date}")
            else:
                print("Refreshed MLB rolling state snapshots for all loaded dates")
            return

        if args.command == "derive-hitter-classic-trends":
            refresh_hitter_classic_trend_snapshots(conn, args.through_date, args.as_of_date)
            if args.as_of_date:
                print(f"Refreshed hitter classic last-10 trend snapshots for {args.as_of_date}")
            elif args.through_date:
                print(f"Refreshed hitter classic last-10 trend snapshots through {args.through_date}")
            else:
                print("Refreshed hitter classic last-10 trend snapshots for all loaded dates")
            return

        if args.command == "derive-hitter-opponent-context":
            refresh_hitter_opponent_context_snapshots(conn, args.through_date, args.as_of_date)
            if args.as_of_date:
                print(f"Refreshed hitter opponent-strength context snapshots for {args.as_of_date}")
            elif args.through_date:
                print(f"Refreshed hitter opponent-strength context snapshots through {args.through_date}")
            else:
                print("Refreshed hitter opponent-strength context snapshots for all loaded dates")
            return

        if args.command == "derive-market-context":
            refresh_market_context_profiles(conn, args.through_date, args.as_of_date)
            if args.as_of_date:
                print(f"Refreshed MLB market/opponent context tables for {args.as_of_date}")
            elif args.through_date:
                print(f"Refreshed MLB market/opponent context tables through {args.through_date}")
            else:
                print("Refreshed MLB market/opponent context tables for all loaded dates")
            return

        if args.command == "derive-mistake-shapes":
            refresh_mistake_shape_profiles(conn, args.through_date, args.as_of_date)
            if args.as_of_date:
                print(f"Refreshed MLB mistake-shape profile tables for {args.as_of_date}")
            elif args.through_date:
                print(f"Refreshed MLB mistake-shape profile tables through {args.through_date}")
            else:
                print("Refreshed MLB mistake-shape profile tables for all loaded dates")
            return

        if args.command == "derive-first-inning-profiles":
            refresh_first_inning_profiles(conn, args.through_date, args.as_of_date)
            if args.as_of_date:
                print(f"Refreshed MLB first-inning profile tables for {args.as_of_date}")
            elif args.through_date:
                print(f"Refreshed MLB first-inning profile tables through {args.through_date}")
            else:
                print("Refreshed MLB first-inning profile tables for all loaded dates")
            return

        if args.command == "derive-story-labels":
            refresh_story_phase_label_tables(conn, args.through_date, args.as_of_date)
            if args.as_of_date:
                print(f"Refreshed MLB story/phase label tables for {args.as_of_date}")
            elif args.through_date:
                print(f"Refreshed MLB story/phase label tables through {args.through_date}")
            else:
                print("Refreshed MLB story/phase label tables for all loaded dates")
            return

        if args.command == "ingest-pitcher-war":
            rows_loaded = ingest_pitcher_war(conn, args.seasons)
            if args.seasons:
                print(
                    f"Ingested Baseball-Reference pitcher WAR rows for seasons {', '.join(str(season) for season in sorted(set(args.seasons)))} ({rows_loaded} player-seasons)"
                )
            else:
                print(f"Ingested Baseball-Reference pitcher WAR rows for all seasons in the feed ({rows_loaded} player-seasons)")
            return

        if args.command == "ingest-statcast-hr":
            ingest_statcast_hr_leaderboard(conn, args.date, args.season)
            print(f"Ingested Statcast HR leaderboard for {args.season} using snapshot date {args.date}")
            return

        if args.command == "ingest-hitter-statcast-range":
            rows_loaded = ingest_hitter_statcast_date_range(conn, args.start_date, args.end_date)
            print(
                f"Ingested hitter Statcast game logs from {args.start_date} through {args.end_date} ({rows_loaded} player-game rows)"
            )
            return

        if args.command == "derive-hitter-statcast-trends":
            refresh_hitter_statcast_trend_snapshots(conn, args.through_date, args.as_of_date)
            if args.as_of_date:
                print(f"Refreshed hitter Statcast trend snapshots for {args.as_of_date}")
            elif args.through_date:
                print(f"Refreshed hitter Statcast trend snapshots through {args.through_date}")
            else:
                print("Refreshed hitter Statcast trend snapshots for all loaded dates")
            return

        if args.command == "derive-batter-outcomes":
            rows_loaded = refresh_batter_game_outcomes(conn, args.through_date, args.as_of_date)
            if args.as_of_date:
                print(f"Refreshed explicit batter outcome rows for {args.as_of_date} ({rows_loaded} batter-games)")
            elif args.through_date:
                print(f"Refreshed explicit batter outcome rows through {args.through_date} ({rows_loaded} batter-games)")
            else:
                print(f"Refreshed explicit batter outcome rows for all loaded dates ({rows_loaded} batter-games)")
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

        if args.command == "list-bullpen-shape":
            rows = list_bullpen_shape(conn, args.date, args.team)
            print_bullpen_shape(rows)
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
