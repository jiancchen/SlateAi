#!/usr/bin/env python3
from __future__ import annotations

import argparse
import hashlib
import json
import re
import sqlite3
import sys
import unicodedata
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
MIGRATIONS_DIR = ROOT / "pipeline" / "tennis" / "warehouse" / "migrations"
LEGACY_MIGRATIONS_DIR = ROOT / "pipeline" / "tennis_warehouse_migrations"
RANKINGS_PATH = ROOT / "data-private" / "reference" / "tennis" / "player-rankings.json"
FLASHSCORE_DIR = ROOT / "data-private" / "reference" / "tennis" / "flashscore-match-stats"
SOFASCORE_DIR = ROOT / "data-private" / "reference" / "tennis" / "sofascore-match-data"
SOFASCORE_PLAYER_STATS_DIR = ROOT / "data-private" / "reference" / "tennis" / "sofascore-player-stats"
TENNIS_REFERENCE_DIR = ROOT / "data-private" / "reference" / "tennis"
PUBLISHED_SLATES_DIR = ROOT / "published-data" / "slates"


def normalize_name(value: str | None) -> str:
    value = unicodedata.normalize("NFKD", value or "").encode("ascii", "ignore").decode("ascii")
    value = re.sub(r"[^a-zA-Z0-9]+", " ", value).strip().lower()
    return re.sub(r"\s+", " ", value)


def names_likely_match(left: str | None, right: str | None) -> bool:
    left_norm = normalize_name(left)
    right_norm = normalize_name(right)
    if not left_norm or not right_norm:
        return False
    if left_norm == right_norm or left_norm in right_norm or right_norm in left_norm:
        return True
    left_tokens = set(left_norm.split())
    right_tokens = set(right_norm.split())
    return left_tokens.issubset(right_tokens) or right_tokens.issubset(left_tokens)


def read_json(path: Path) -> Any:
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def dumps(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False, sort_keys=True)


def get_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("pragma foreign_keys = on")
    return conn


def ensure_schema_migrations(conn: sqlite3.Connection) -> None:
    conn.execute(
        """
        create table if not exists tennis_schema_migrations (
          migration_id text primary key,
          warehouse_version text not null,
          file_path text not null,
          sha256 text not null,
          applied_at text not null default current_timestamp,
          status text not null default 'applied',
          notes text
        )
        """
    )


def apply_tennis_migration(conn: sqlite3.Connection, migration_path: Path, warehouse_version: str) -> dict[str, Any]:
    sql = migration_path.read_text(encoding="utf-8")
    digest = hashlib.sha256(sql.encode("utf-8")).hexdigest()
    migration_id = f"{warehouse_version}/{migration_path.name}"
    ensure_schema_migrations(conn)
    existing = conn.execute(
        "select sha256, status from tennis_schema_migrations where migration_id = ?",
        (migration_id,),
    ).fetchone()
    if existing:
        if existing["sha256"] != digest:
            raise ValueError(
                f"Migration hash changed for {migration_id}: expected {existing['sha256']}, got {digest}"
            )
        return {
            "migration_id": migration_id,
            "warehouse_version": warehouse_version,
            "status": "already_applied",
            "sha256": digest,
        }
    conn.executescript(sql)
    conn.execute(
        """
        insert into tennis_schema_migrations(
          migration_id, warehouse_version, file_path, sha256, status, notes
        )
        values (?, ?, ?, ?, 'applied', ?)
        """,
        (
            migration_id,
            warehouse_version,
            str(migration_path.relative_to(ROOT)),
            digest,
            "Applied by tennis_warehouse.py migration runner.",
        ),
    )
    conn.commit()
    return {
        "migration_id": migration_id,
        "warehouse_version": warehouse_version,
        "status": "applied",
        "sha256": digest,
    }


def apply_tennis_migrations(conn: sqlite3.Connection, version: str = "TEN-W1") -> dict[str, Any]:
    version = version.upper()
    version_dir = MIGRATIONS_DIR / version
    if not version_dir.exists():
        version_dir = LEGACY_MIGRATIONS_DIR / version
    if not version_dir.exists():
        raise FileNotFoundError(f"No tennis warehouse migration directory: {version_dir}")
    applied = [
        apply_tennis_migration(conn, migration_path, version)
        for migration_path in sorted(version_dir.glob("*.sql"))
    ]
    return {
        "warehouse_version": version,
        "db_path": str(DB_PATH),
        "migrations": applied,
    }


def infer_recent_map_slate_date(map_path: Path) -> str | None:
    slate_date_match = re.search(r"(\d{4}-\d{2}-\d{2})", map_path.name)
    return slate_date_match.group(1) if slate_date_match else None


def init_db(conn: sqlite3.Connection) -> None:
    conn.executescript(
        """
        create table if not exists tennis_players (
          normalized_name text primary key,
          name text not null,
          created_at text not null default current_timestamp,
          updated_at text not null default current_timestamp
        );

        create table if not exists tennis_schema_migrations (
          migration_id text primary key,
          warehouse_version text not null,
          file_path text not null,
          sha256 text not null,
          applied_at text not null default current_timestamp,
          status text not null default 'applied',
          notes text
        );

        create table if not exists tennis_rankings (
          as_of_date text not null,
          tour text not null,
          normalized_name text not null,
          player_name text not null,
          rank integer,
          points integer,
          age integer,
          country text,
          source text,
          profile_url text,
          raw_json text not null,
          updated_at text not null default current_timestamp,
          primary key (as_of_date, tour, normalized_name)
        );

        create table if not exists tennis_matches (
          match_id text primary key,
          slate_date text not null,
          league text not null,
          title text not null,
          stage text,
          court text,
          start_label text,
          start_minutes integer,
          player1_name text,
          player2_name text,
          player1_normalized_name text,
          player2_normalized_name text,
          desk_pick_name text,
          desk_confidence integer,
          desk_volatility integer,
          desk_summary text,
          desk_lean text,
          source_file text,
          raw_json text not null,
          updated_at text not null default current_timestamp
        );

        create table if not exists tennis_match_sources (
          match_id text not null,
          source_name text not null,
          source_url text,
          status text not null default 'ok',
          error text,
          raw_json text not null,
          updated_at text not null default current_timestamp,
          primary key (match_id, source_name)
        );

        create table if not exists tennis_h2h_snapshots (
          match_id text primary key,
          slate_date text not null,
          source_url text,
          h2h_record text,
          h2h_text text,
          source_prediction text,
          status text not null,
          error text,
          raw_json text not null,
          updated_at text not null default current_timestamp
        );

        create table if not exists tennis_player_match_context (
          match_id text not null,
          player_slot integer not null,
          normalized_name text not null,
          player_name text not null,
          ranking_as_of text,
          tour text,
          rank integer,
          ranking_points integer,
          ranking_age integer,
          ranking_country text,
          ranking_profile_url text,
          ranking_source text,
          overall_wins integer,
          overall_losses integer,
          overall_win_pct real,
          clay_wins integer,
          clay_losses integer,
          clay_win_pct real,
          recent_matches integer,
          recent_wins integer,
          recent_losses integer,
          recent_win_pct real,
          recent_sets_won integer,
          recent_sets_lost integer,
          recent_set_pct real,
          recent_games_won integer,
          recent_games_lost integer,
          recent_game_pct real,
          resistance_matches integer,
          straight_set_wins integer,
          straight_set_losses integer,
          known_opponent_ranks integer,
          missing_opponent_ranks integer,
          ranking_coverage_pct real,
          avg_known_opponent_rank real,
          top10_opponents integer,
          top25_opponents integer,
          top50_opponents integer,
          challenger_or_itf_matches integer,
          scoreline_form_score real,
          opponent_adjusted_form_score real,
          service_data_source text,
          service_data_note text,
          raw_json text not null,
          updated_at text not null default current_timestamp,
          primary key (match_id, normalized_name)
        );

        create table if not exists tennis_recent_matches (
          match_id text not null,
          normalized_name text not null,
          recent_index integer not null,
          player_name text not null,
          event text,
          event_tier text,
          opponent_name text,
          opponent_normalized_name text,
          opponent_rank integer,
          opponent_tour text,
          result_text text,
          match_date_label text,
          completed integer,
          player_won integer,
          retirement integer,
          walkover integer,
          sets_played integer,
          sets_won integer,
          sets_lost integer,
          games_won integer,
          games_lost integer,
          tiebreak_sets integer,
          deciding_set integer,
          straight_set_win integer,
          straight_set_loss integer,
          resistance integer,
          opponent_weight real,
          quality_points real,
          raw_json text not null,
          updated_at text not null default current_timestamp,
          primary key (match_id, normalized_name, recent_index)
        );

        create table if not exists tennis_recent_form_metrics (
          match_id text not null,
          normalized_name text not null,
          recent_index integer not null,
          metric_key text not null,
          player_name text not null,
          metric_label text not null,
          score real,
          estimated integer not null default 0,
          source text,
          weight real,
          opponent_name text,
          opponent_normalized_name text,
          opponent_rank integer,
          event text,
          event_tier text,
          match_date_label text,
          surface text,
          raw_json text not null,
          updated_at text not null default current_timestamp,
          primary key (match_id, normalized_name, recent_index, metric_key)
        );

        create table if not exists tennis_h2h_matches (
          match_id text not null,
          h2h_index integer not null,
          slate_date text not null,
          source_name text not null,
          player_name text,
          opponent_name text,
          winner_name text,
          result_text text,
          event text,
          event_tier text,
          match_date_label text,
          iso_date text,
          surface text,
          weight real,
          raw_json text not null,
          updated_at text not null default current_timestamp,
          primary key (match_id, h2h_index)
        );

        create table if not exists tennis_predictions (
          slate_date text not null,
          match_id text not null,
          prediction_source text not null,
          pick_name text,
          confidence integer,
          volatility integer,
          projected_set_line text,
          rationale text,
          raw_json text not null,
          updated_at text not null default current_timestamp,
          primary key (slate_date, match_id, prediction_source)
        );

        create table if not exists tennis_prediction_market_snapshots (
          slate_date text not null,
          match_id text not null,
          source_name text not null,
          captured_at text,
          total_volume integer,
          player_name text not null,
          normalized_name text not null,
          probability_pct real,
          traded_amount integer,
          price_band text,
          gross_profit_pct real,
          gross_payout_multiple real,
          cents_at_risk real,
          cents_profit_if_win real,
          raw_json text not null,
          updated_at text not null default current_timestamp,
          primary key (slate_date, match_id, source_name, normalized_name)
        );

        create table if not exists tennis_match_results (
          slate_date text not null,
          event_id text not null,
          match_id text,
          title text not null,
          round_label text,
          court text,
          status text,
          completed integer,
          player1_name text,
          player2_name text,
          player1_normalized_name text,
          player2_normalized_name text,
          winner_name text,
          winner_normalized_name text,
          scoreline text,
          source_url text,
          raw_json text not null,
          updated_at text not null default current_timestamp,
          primary key (slate_date, event_id)
        );

        create table if not exists tennis_prediction_grades (
          slate_date text not null,
          match_id text not null,
          prediction_source text not null,
          pick_name text,
          actual_winner_name text,
          result_status text,
          hit integer,
          confidence integer,
          volatility integer,
          raw_json text not null,
          updated_at text not null default current_timestamp,
          primary key (slate_date, match_id, prediction_source)
        );

        create table if not exists tennis_flashscore_match_stats (
          flashscore_id text primary key,
          slate_date text,
          board_match_id text,
          source_url text,
          generated_at text,
          left_player_name text,
          right_player_name text,
          flashscore_label text,
          board_title text,
          source_kind text,
          board_player_name text,
          recent_opponent_name text,
          recent_index integer,
          recent_event text,
          recent_date text,
          recent_iso_date text,
          recent_result text,
          flashscore_tournament_url text,
          score_summary_json text,
          raw_json text not null,
          updated_at text not null default current_timestamp
        );

        create table if not exists tennis_flashscore_stat_rows (
          flashscore_id text not null,
          scope_label text not null,
          section_label text not null,
          stat_label text not null,
          left_player_name text,
          right_player_name text,
          left_value text,
          right_value text,
          raw_json text not null,
          updated_at text not null default current_timestamp,
          primary key (flashscore_id, scope_label, section_label, stat_label)
        );

        create table if not exists tennis_flashscore_player_stat_rows (
          flashscore_id text not null,
          slate_date text,
          board_match_id text,
          player_side text not null,
          scope_label text not null,
          section_label text not null,
          stat_label text not null,
          player_name text,
          normalized_name text,
          raw_value text,
          percentage real,
          numerator real,
          denominator real,
          numeric_value real,
          raw_json text not null,
          updated_at text not null default current_timestamp,
          primary key (flashscore_id, player_side, scope_label, section_label, stat_label)
        );

        create table if not exists tennis_flashscore_recent_links (
          board_match_id text not null,
          board_player_name text not null,
          recent_index integer not null,
          flashscore_id text not null,
          slate_date text,
          board_title text,
          recent_opponent_name text,
          recent_event text,
          recent_date text,
          recent_iso_date text,
          recent_result text,
          flashscore_label text,
          flashscore_tournament_url text,
          raw_json text not null,
          updated_at text not null default current_timestamp,
          primary key (board_match_id, board_player_name, recent_index)
        );

        create table if not exists tennis_sofascore_matches (
          sofascore_event_id text primary key,
          slate_date text,
          board_match_id text,
          source_url text,
          captured_at text,
          status_code integer,
          slug text,
          tournament_name text,
          tournament_category text,
          surface text,
          start_timestamp integer,
          home_player_name text,
          away_player_name text,
          home_normalized_name text,
          away_normalized_name text,
          home_player_id integer,
          away_player_id integer,
          home_rank integer,
          away_rank integer,
          home_current_rank integer,
          away_current_rank integer,
          home_country text,
          away_country text,
          home_score_json text,
          away_score_json text,
          h2h_home_wins integer,
          h2h_away_wins integer,
          h2h_draws integer,
          raw_json text not null,
          updated_at text not null default current_timestamp
        );

        create table if not exists tennis_sofascore_stat_rows (
          sofascore_event_id text not null,
          period text not null,
          group_name text not null,
          stat_key text not null,
          stat_name text not null,
          home_player_name text,
          away_player_name text,
          home_value text,
          away_value text,
          home_numeric real,
          away_numeric real,
          home_percentage real,
          away_percentage real,
          raw_json text not null,
          updated_at text not null default current_timestamp,
          primary key (sofascore_event_id, period, group_name, stat_key)
        );

        create table if not exists tennis_sofascore_player_stat_rows (
          sofascore_event_id text not null,
          slate_date text,
          board_match_id text,
          player_side text not null,
          period text not null,
          group_name text not null,
          stat_key text not null,
          stat_name text not null,
          player_name text,
          normalized_name text,
          raw_value text,
          numeric_value real,
          percentage real,
          raw_json text not null,
          updated_at text not null default current_timestamp,
          primary key (sofascore_event_id, player_side, period, group_name, stat_key)
        );

        create table if not exists tennis_sofascore_player_page_stats (
          as_of_date text not null,
          normalized_name text not null,
          player_name text not null,
          sofascore_player_id integer,
          source_url text,
          season integer,
          surface text not null,
          matches_won real,
          matches_total real,
          matches_won_pct real,
          tournaments_won real,
          tournaments_total real,
          tournaments_won_pct real,
          first_serve_pct real,
          first_serve_won_pct real,
          second_serve_pct real,
          second_serve_won_pct real,
          aces_per_match real,
          double_faults_per_match real,
          break_points_saved real,
          break_points_faced real,
          break_points_saved_pct real,
          break_points_converted real,
          break_points_to_convert real,
          break_points_converted_pct real,
          tiebreaks_won real,
          tiebreaks_total real,
          tiebreaks_won_pct real,
          captured_at text,
          raw_json text not null,
          updated_at text not null default current_timestamp,
          primary key (as_of_date, normalized_name, season, surface)
        );

        create table if not exists tennis_sofascore_replay_games (
          sofascore_event_id text not null,
          slate_date text,
          board_match_id text,
          set_number integer not null,
          game_number integer not null,
          response_set_index integer,
          response_game_index integer,
          home_player_name text,
          away_player_name text,
          serving_side text,
          scoring_side text,
          home_games_after integer,
          away_games_after integer,
          point_count integer,
          break_game integer,
          raw_json text not null,
          updated_at text not null default current_timestamp,
          primary key (sofascore_event_id, set_number, game_number)
        );

        create table if not exists tennis_sofascore_replay_points (
          sofascore_event_id text not null,
          slate_date text,
          board_match_id text,
          set_number integer not null,
          game_number integer not null,
          point_index integer not null,
          home_player_name text,
          away_player_name text,
          serving_side text,
          scoring_side text,
          home_point text,
          away_point text,
          point_description integer,
          home_point_type integer,
          away_point_type integer,
          raw_json text not null,
          updated_at text not null default current_timestamp,
          primary key (sofascore_event_id, set_number, game_number, point_index)
        );

        create table if not exists tennis_kalshi_match_markets (
          market_ticker text primary key,
          event_ticker text not null,
          series_ticker text,
          slate_date text,
          board_match_id text,
          pair_key text,
          title text,
          selection_name text,
          normalized_selection_name text,
          result text,
          expiration_value text,
          status text,
          close_time text,
          last_price_dollars real,
          raw_json text not null,
          updated_at text not null default current_timestamp
        );

        create table if not exists tennis_kalshi_market_candles (
          market_ticker text not null,
          end_period_ts integer not null,
          event_ticker text,
          slate_date text,
          board_match_id text,
          price_open real,
          price_high real,
          price_low real,
          price_close real,
          price_previous real,
          yes_bid_open real,
          yes_bid_high real,
          yes_bid_low real,
          yes_bid_close real,
          yes_ask_open real,
          yes_ask_high real,
          yes_ask_low real,
          yes_ask_close real,
          volume_fp real,
          open_interest_fp real,
          raw_json text not null,
          updated_at text not null default current_timestamp,
          primary key (market_ticker, end_period_ts)
        );

        create table if not exists tennis_kalshi_intramatch_trade_features (
          market_ticker text primary key,
          event_ticker text not null,
          slate_date text,
          board_match_id text,
          pair_key text,
          selection_name text,
          normalized_selection_name text,
          is_lowest_priced_side integer,
          entry_ask real,
          favorite_entry_ask real,
          max_bid real,
          max_trade real,
          volume_minutes integer,
          won integer,
          target_20_hit integer,
          target_30_hit integer,
          target_20_profit real,
          target_30_profit real,
          target_20_fee_adjusted_profit real,
          target_30_fee_adjusted_profit real,
          raw_json text not null,
          updated_at text not null default current_timestamp
        );

        create table if not exists tennis_weather_hourly (
          venue_key text not null,
          source_name text not null,
          weather_date text not null,
          time_local text not null,
          time_utc text not null,
          utc_offset_seconds integer,
          latitude real,
          longitude real,
          temperature_2m_c real,
          apparent_temperature_c real,
          relative_humidity_2m_pct real,
          precipitation_mm real,
          rain_mm real,
          cloud_cover_pct real,
          wind_speed_10m_kmh real,
          wind_gusts_10m_kmh real,
          surface_pressure_hpa real,
          shortwave_radiation_wm2 real,
          raw_json text not null,
          updated_at text not null default current_timestamp,
          primary key (venue_key, source_name, time_utc)
        );

        create table if not exists tennis_match_weather (
          match_id text primary key,
          slate_date text not null,
          sofascore_event_id text,
          venue_key text not null,
          source_name text not null,
          start_ts integer,
          end_ts integer,
          duration_minutes real,
          hourly_rows integer,
          avg_temperature_c real,
          max_temperature_c real,
          min_temperature_c real,
          avg_apparent_temperature_c real,
          max_apparent_temperature_c real,
          avg_humidity_pct real,
          total_precipitation_mm real,
          total_rain_mm real,
          avg_cloud_cover_pct real,
          avg_wind_speed_kmh real,
          max_wind_gust_kmh real,
          avg_surface_pressure_hpa real,
          avg_shortwave_radiation_wm2 real,
          max_shortwave_radiation_wm2 real,
          hot_match integer,
          humid_match integer,
          windy_match integer,
          rain_affected integer,
          raw_json text not null,
          updated_at text not null default current_timestamp
        );

        create index if not exists idx_tennis_matches_slate_date on tennis_matches(slate_date);
        create index if not exists idx_tennis_recent_opponent_rank on tennis_recent_matches(opponent_rank);
        create index if not exists idx_tennis_recent_form_metrics_match on tennis_recent_form_metrics(match_id, normalized_name);
        create index if not exists idx_tennis_h2h_matches_match on tennis_h2h_matches(match_id);
        create index if not exists idx_tennis_context_rank on tennis_player_match_context(rank);
        create index if not exists idx_tennis_predictions_date on tennis_predictions(slate_date);
        create index if not exists idx_tennis_flashscore_recent_links_flashscore
          on tennis_flashscore_recent_links(flashscore_id);
        create index if not exists idx_tennis_prediction_market_snapshots_date on tennis_prediction_market_snapshots(slate_date);
        create index if not exists idx_tennis_match_results_date on tennis_match_results(slate_date);
        create index if not exists idx_tennis_prediction_grades_date on tennis_prediction_grades(slate_date);
        create index if not exists idx_tennis_sofascore_matches_board on tennis_sofascore_matches(board_match_id);
        create index if not exists idx_tennis_sofascore_stat_rows_event on tennis_sofascore_stat_rows(sofascore_event_id);
        create index if not exists idx_tennis_sofascore_player_stat_rows_board
          on tennis_sofascore_player_stat_rows(board_match_id, normalized_name);
        create index if not exists idx_tennis_sofascore_player_page_stats_date
          on tennis_sofascore_player_page_stats(as_of_date, normalized_name, surface);
        create index if not exists idx_tennis_sofascore_replay_games_board
          on tennis_sofascore_replay_games(board_match_id, set_number, game_number);
        create index if not exists idx_tennis_sofascore_replay_points_board
          on tennis_sofascore_replay_points(board_match_id, set_number, game_number, point_index);
        create index if not exists idx_tennis_kalshi_markets_event
          on tennis_kalshi_match_markets(event_ticker);
        create index if not exists idx_tennis_kalshi_markets_slate
          on tennis_kalshi_match_markets(slate_date, board_match_id);
        create index if not exists idx_tennis_kalshi_candles_market
          on tennis_kalshi_market_candles(market_ticker, end_period_ts);
        create index if not exists idx_tennis_kalshi_trade_features_slate
          on tennis_kalshi_intramatch_trade_features(slate_date, entry_ask, max_bid);
        create index if not exists idx_tennis_weather_hourly_date
          on tennis_weather_hourly(weather_date, venue_key);
        create index if not exists idx_tennis_match_weather_date
          on tennis_match_weather(slate_date, venue_key);
        """
    )
    existing_market_columns = {
        row["name"] for row in conn.execute("pragma table_info(tennis_prediction_market_snapshots)").fetchall()
    }
    for column_name, column_type in (
        ("price_band", "text"),
        ("gross_profit_pct", "real"),
        ("gross_payout_multiple", "real"),
        ("cents_at_risk", "real"),
        ("cents_profit_if_win", "real"),
    ):
        if column_name not in existing_market_columns:
            conn.execute(f"alter table tennis_prediction_market_snapshots add column {column_name} {column_type}")
    existing_context_columns = {
        row["name"] for row in conn.execute("pragma table_info(tennis_player_match_context)").fetchall()
    }
    for column_name, column_type in (
        ("ranking_points", "integer"),
        ("ranking_age", "integer"),
        ("ranking_country", "text"),
        ("ranking_profile_url", "text"),
        ("ranking_source", "text"),
    ):
        if column_name not in existing_context_columns:
            conn.execute(f"alter table tennis_player_match_context add column {column_name} {column_type}")
    existing_flashscore_columns = {
        row["name"] for row in conn.execute("pragma table_info(tennis_flashscore_match_stats)").fetchall()
    }
    for column_name, column_type in (
        ("slate_date", "text"),
        ("board_match_id", "text"),
        ("flashscore_label", "text"),
        ("board_title", "text"),
        ("source_kind", "text"),
        ("board_player_name", "text"),
        ("recent_opponent_name", "text"),
        ("recent_index", "integer"),
        ("recent_event", "text"),
        ("recent_date", "text"),
        ("recent_iso_date", "text"),
        ("recent_result", "text"),
        ("flashscore_tournament_url", "text"),
    ):
        if column_name not in existing_flashscore_columns:
            conn.execute(f"alter table tennis_flashscore_match_stats add column {column_name} {column_type}")
    conn.commit()


def upsert_player(conn: sqlite3.Connection, name: str | None) -> None:
    if not name:
        return
    normalized = normalize_name(name)
    if not normalized:
        return
    conn.execute(
        """
        insert into tennis_players(normalized_name, name)
        values (?, ?)
        on conflict(normalized_name) do update set
          name=excluded.name,
          updated_at=current_timestamp
        """,
        (normalized, name),
    )


def import_rankings(conn: sqlite3.Connection, path: Path = RANKINGS_PATH) -> int:
    payload = read_json(path)
    as_of = payload.get("asOf")
    rows = payload.get("players", {})
    count = 0
    for normalized, row in rows.items():
        name = row.get("name") or normalized
        upsert_player(conn, name)
        conn.execute(
            """
            insert into tennis_rankings(
              as_of_date, tour, normalized_name, player_name, rank, points, age,
              country, source, profile_url, raw_json
            )
            values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            on conflict(as_of_date, tour, normalized_name) do update set
              player_name=excluded.player_name,
              rank=excluded.rank,
              points=excluded.points,
              age=excluded.age,
              country=excluded.country,
              source=excluded.source,
              profile_url=excluded.profile_url,
              raw_json=excluded.raw_json,
              updated_at=current_timestamp
            """,
            (
                row.get("asOf") or as_of,
                row.get("tour") or "",
                normalized,
                name,
                row.get("rank"),
                row.get("points"),
                row.get("age"),
                row.get("country"),
                row.get("source"),
                row.get("profileUrl"),
                dumps(row),
            ),
        )
        count += 1
    conn.commit()
    return count


def as_int(value: Any) -> int | None:
    if value is None:
        return None
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def as_float(value: Any) -> float | None:
    if value is None:
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def bool_int(value: Any) -> int | None:
    if value is None:
        return None
    return 1 if bool(value) else 0


def sofascore_side(code: Any) -> str | None:
    side_code = as_int(code)
    if side_code == 1:
        return "home"
    if side_code == 2:
        return "away"
    return None


def clamp(value: float | None, low: float = 0, high: float = 100) -> float | None:
    if value is None:
        return None
    return max(low, min(high, value))


def opponent_rank_weight(rank: Any) -> float:
    numeric = as_float(rank)
    if numeric is None:
        return 0.96
    if numeric <= 10:
        return 1.14
    if numeric <= 25:
        return 1.10
    if numeric <= 50:
        return 1.06
    if numeric <= 100:
        return 1.02
    if numeric <= 200:
        return 0.98
    return 0.94


def infer_tennis_surface(event: Any) -> str | None:
    text = str(event or "").lower()
    if not text:
        return None
    if any(token in text for token in ("roland", "paris", "rome", "madrid", "hamburg", "geneva", "strasbourg", "valencia", "bordeaux", "cervia", "oeiras", "pula")):
        return "Clay"
    if any(token in text for token in ("grass", "halle", "queen", "s hertogenbosch", "nottingham", "wimbledon")):
        return "Grass"
    if "indoor" in text:
        return "Indoor hard"
    if any(token in text for token in ("miami", "indian wells", "australian", "us open", "dubai", "doha")):
        return "Hard"
    return None


def parse_recent_iso_date(value: Any) -> str | None:
    text = str(value or "").strip()
    match = re.search(r"(\d{1,2})\s+([A-Za-z]{3,})\s+(\d{2,4})", text)
    if not match:
        return None
    day = int(match.group(1))
    month_name = match.group(2).lower()[:3]
    year = int(match.group(3))
    if year < 100:
        year += 2000
    months = {
        "jan": 1, "feb": 2, "mar": 3, "apr": 4, "may": 5, "jun": 6,
        "jul": 7, "aug": 8, "sep": 9, "oct": 10, "nov": 11, "dec": 12,
    }
    month = months.get(month_name)
    if not month:
        return None
    return f"{year:04d}-{month:02d}-{day:02d}"


def numeric_stat_value(match: dict[str, Any], keys: list[str]) -> float | None:
    stats = match.get("serviceStats") or match.get("flashscoreStats") or match.get("stats") or {}
    for key in keys:
        value = stats.get(key)
        if value is None or value == "":
            continue
        parsed = as_float(value)
        if parsed is not None:
            return parsed
        found = re.search(r"-?\d+(?:\.\d+)?", str(value))
        if found:
            return as_float(found.group(0))
    return None


def fraction_stat_value(match: dict[str, Any], labels: list[str], direct_keys: list[str] | None = None) -> dict[str, float] | None:
    stats = match.get("serviceStats") or match.get("flashscoreStats") or match.get("stats") or {}
    for key in direct_keys or []:
        value = stats.get(key)
        found = re.search(r"(\d+)\s*/\s*(\d+)", str(value or ""))
        if found:
            return {"made": float(found.group(1)), "attempts": float(found.group(2))}
    for row in stats.get("rows") or []:
        label = str((row or {}).get("label") or "").lower()
        if not any(item.lower() in label for item in labels):
            continue
        found = re.search(r"(\d+)\s*/\s*(\d+)", str((row or {}).get("value") or ""))
        if found:
            return {"made": float(found.group(1)), "attempts": float(found.group(2))}
    return None


def expected_stats_for_recent_player(player: dict[str, Any]) -> dict[str, float | None]:
    service = player.get("serviceData") or {}
    recent_stats = [
        match.get("serviceStats") or {}
        for match in player.get("recentMatches") or []
        if match.get("serviceStats")
    ]

    def average_values(keys: list[str]) -> float | None:
        values: list[float] = []
        for stats in recent_stats:
            for key in keys:
                value = as_float(stats.get(key))
                if value is not None:
                    values.append(value)
                    break
        if not values:
            return None
        return sum(values) / len(values)

    return {
        "holdPct": average_values(["holdPct", "serviceHoldPct"]),
        "aces": average_values(["aces"]),
        "doubleFaults": average_values(["doubleFaults"]),
        "firstServePct": average_values(["firstServePct"]),
        "firstServeWonPct": average_values(["firstServeWonPct", "firstServePointsWon"]) or as_float(service.get("avgFirstServeWonPct")),
        "secondServeWonPct": average_values(["secondServeWonPct"]),
        "returnPointsWonPct": average_values(["returnPointsWonPct"]),
        "winners": average_values(["winners"]),
        "unforcedErrors": average_values(["unforcedErrors"]),
    }


def fallback_form_score(expected: dict[str, float | None], key: str) -> tuple[float | None, bool]:
    hold = expected.get("holdPct")
    first_won = expected.get("firstServeWonPct")
    first_in = expected.get("firstServePct")
    second_won = expected.get("secondServeWonPct")
    double_faults = expected.get("doubleFaults")
    return_won = expected.get("returnPointsWonPct")
    winners = expected.get("winners")
    unforced = expected.get("unforcedErrors")
    df_penalty = max(0, float(double_faults) - 2.5) * 2.2 if isinstance(double_faults, (int, float)) else 0
    if key == "hold" and (hold is not None or first_won is not None):
        return clamp((hold if hold is not None else 72) * 0.72 + (first_won if first_won is not None else 64) * 0.22 + ((first_in if first_in is not None else 60) - 60) * 0.1), True
    if key == "secondServe" and (second_won is not None or hold is not None):
        return clamp((second_won if second_won is not None else 48) * 0.78 + (hold if hold is not None else 72) * 0.22 - df_penalty), True
    if key == "errorControl" and (unforced is not None or double_faults is not None or winners is not None):
        winner_balance = (winners - unforced) if winners is not None and unforced is not None else 0
        return clamp(72 - max(0, ((unforced / 2.6) if unforced is not None else 10) - 8) * 4.2 - max(0, ((double_faults / 2.6) if double_faults is not None else 1.5) - 1.5) * 4 + max(-10, min(10, winner_balance * 0.25))), True
    if key == "returnPressure" and return_won is not None:
        return clamp(return_won * 1.28 + 35 * 0.18 + 6), True
    return None, False


def build_recent_form_metric_rows(player: dict[str, Any]) -> list[dict[str, Any]]:
    expected = expected_stats_for_recent_player(player)
    rows: list[dict[str, Any]] = []
    metric_labels = {
        "hold": "Hold",
        "secondServe": "2nd",
        "errorControl": "Err",
        "returnPressure": "Ret",
        "closeout": "Close",
    }
    for index, recent in enumerate(player.get("recentMatches") or []):
        parsed = recent.get("parsed") or {}
        sets_played = max(1, as_float(parsed.get("setsPlayed")) or 1)
        weight = opponent_rank_weight((recent.get("opponentRanking") or {}).get("rank"))
        first_won = numeric_stat_value(recent, ["firstServeWonPct", "firstServePointsWon"])
        first_in = numeric_stat_value(recent, ["firstServePct"])
        second_won = numeric_stat_value(recent, ["secondServeWonPct"])
        service_hold = numeric_stat_value(recent, ["holdPct", "serviceHoldPct"])
        return_points_won = numeric_stat_value(recent, ["returnPointsWonPct"])
        unforced_errors = numeric_stat_value(recent, ["unforcedErrors"])
        double_faults = numeric_stat_value(recent, ["doubleFaults"])
        winners = numeric_stat_value(recent, ["winners"])
        converted = fraction_stat_value(recent, ["Break Points Converted"], ["breakPointsConverted"])
        saved = fraction_stat_value(recent, ["Break Points Saved"], ["breakPointsSaved"])
        break_chances_per_set = converted["attempts"] / sets_played if converted else None
        break_conversion_pct = converted["made"] / converted["attempts"] * 100 if converted and converted["attempts"] else None
        bp_saved_pct = saved["made"] / saved["attempts"] * 100 if saved and saved["attempts"] else numeric_stat_value(recent, ["breakPointsSavedPct"])
        ufe_per_set = unforced_errors / sets_played if unforced_errors is not None else None
        df_per_set = double_faults / sets_played if double_faults is not None else None
        winner_balance = winners - unforced_errors if winners is not None and unforced_errors is not None else None

        closeout = None
        if parsed.get("playerWon") is True:
            closeout = 78 if parsed.get("straightSetWin") else 72 if parsed.get("decidingSet") else 66
        elif parsed.get("playerWon") is False:
            closeout = 28 if parsed.get("straightSetLoss") else 36 if parsed.get("decidingSet") else 42
        if service_hold is not None:
            closeout = (closeout if closeout is not None else 50) * 0.65 + service_hold * 0.35
        if bp_saved_pct is not None:
            closeout = (closeout if closeout is not None else 50) + (bp_saved_pct - 62) * 0.08

        metric_scores: dict[str, tuple[float | None, bool, str]] = {}
        if service_hold is not None or first_won is not None:
            metric_scores["hold"] = (clamp((service_hold if service_hold is not None else 72) * 0.72 + (first_won if first_won is not None else 64) * 0.22 + ((first_in if first_in is not None else 60) - 60) * 0.1), False, "Flashscore recent match")
        else:
            score, estimated = fallback_form_score(expected, "hold")
            metric_scores["hold"] = (score, estimated, "Expected stats fallback" if estimated else "No stat row")
        if second_won is not None or service_hold is not None:
            metric_scores["secondServe"] = (clamp((second_won if second_won is not None else 48) * 0.78 + (service_hold if service_hold is not None else 72) * 0.22 - max(0, (df_per_set or 0) - 1.8) * 3.5), False, "Flashscore recent match")
        else:
            score, estimated = fallback_form_score(expected, "secondServe")
            metric_scores["secondServe"] = (score, estimated, "Expected stats fallback" if estimated else "No stat row")
        if ufe_per_set is not None or df_per_set is not None or winner_balance is not None:
            metric_scores["errorControl"] = (clamp(72 - max(0, (ufe_per_set if ufe_per_set is not None else 10) - 8) * 4.2 - max(0, (df_per_set if df_per_set is not None else 1.5) - 1.5) * 4 + max(-10, min(10, (winner_balance or 0) * 0.45))), False, "Flashscore recent match")
        else:
            score, estimated = fallback_form_score(expected, "errorControl")
            metric_scores["errorControl"] = (score, estimated, "Expected stats fallback" if estimated else "No stat row")
        if return_points_won is not None or converted:
            metric_scores["returnPressure"] = (clamp((return_points_won if return_points_won is not None else 34) * 1.28 + (break_conversion_pct if break_conversion_pct is not None else 35) * 0.18 + min(18, (break_chances_per_set if break_chances_per_set is not None else 1.2) * 5)), False, "Flashscore recent match")
        else:
            score, estimated = fallback_form_score(expected, "returnPressure")
            metric_scores["returnPressure"] = (score, estimated, "Expected stats fallback" if estimated else "No stat row")
        metric_scores["closeout"] = (clamp(closeout), False, "Scoreline and pressure stats" if closeout is not None else "No scoreline row")

        for metric_key, (score, estimated, source) in metric_scores.items():
            rows.append({
                "recent_index": index,
                "metric_key": metric_key,
                "metric_label": metric_labels[metric_key],
                "score": round(score, 1) if score is not None else None,
                "estimated": bool(estimated),
                "source": source,
                "weight": weight,
                "opponent_name": recent.get("opponent"),
                "opponent_normalized_name": normalize_name(recent.get("opponent")),
                "opponent_rank": as_int((recent.get("opponentRanking") or {}).get("rank")),
                "event": recent.get("event"),
                "event_tier": recent.get("eventTier"),
                "match_date_label": recent.get("date"),
                "surface": infer_tennis_surface(recent.get("event")),
                "raw": {"recent": recent, "scoreSource": source},
            })
    return rows


def h2h_weight_for_row(row: dict[str, Any]) -> float:
    weight = 1.0
    if str(row.get("surface") or "").lower() == "clay":
        weight += 0.18
    event_tier = str(row.get("event_tier") or "").lower()
    if event_tier in {"tour", "tour-1000", "grand-slam"}:
        weight += 0.12
    if row.get("iso_date"):
        weight += 0.08
    return round(weight, 2)


def extract_h2h_recent_rows(match_id: str, slate_date: str, players: list[dict[str, Any]]) -> list[dict[str, Any]]:
    if len(players) < 2:
        return []
    names = [player.get("name") for player in players[:2]]
    normalized_names = [normalize_name(name) for name in names]
    rows: list[dict[str, Any]] = []
    seen: set[tuple[str | None, str]] = set()
    for player in players[:2]:
        player_name = player.get("name")
        player_normalized = normalize_name(player_name)
        opponent_name = names[1] if player_normalized == normalized_names[0] else names[0]
        opponent_normalized = normalize_name(opponent_name)
        for recent in player.get("recentMatches") or []:
            if normalize_name(recent.get("opponent")) != opponent_normalized:
                continue
            parsed = recent.get("parsed") or {}
            winner = player_name if parsed.get("playerWon") is True else opponent_name if parsed.get("playerWon") is False else None
            iso_date = parse_recent_iso_date(recent.get("date"))
            row = {
                "match_id": match_id,
                "slate_date": slate_date,
                "source_name": "recent_match_log",
                "player_name": player_name,
                "opponent_name": opponent_name,
                "winner_name": winner,
                "result_text": recent.get("result"),
                "event": recent.get("event"),
                "event_tier": recent.get("eventTier"),
                "match_date_label": recent.get("date"),
                "iso_date": iso_date,
                "surface": infer_tennis_surface(recent.get("event")),
                "raw": recent,
            }
            row["weight"] = h2h_weight_for_row(row)
            fingerprint = (
                iso_date or str(recent.get("date") or ""),
                "|".join(sorted([player_normalized, opponent_normalized])),
            )
            if fingerprint in seen:
                continue
            seen.add(fingerprint)
            rows.append(row)
    rows.sort(key=lambda item: item.get("iso_date") or "", reverse=True)
    return rows


def parse_flashscore_stat_value(value: Any) -> dict[str, float | None]:
    text = str(value or "").strip()
    parsed: dict[str, float | None] = {
        "percentage": None,
        "numerator": None,
        "denominator": None,
        "numeric_value": None,
    }
    percent_match = re.search(r"(-?\d+(?:\.\d+)?)%", text)
    fraction_match = re.search(r"\(([-\d.]+)\s*/\s*([-\d.]+)\)", text) or re.search(r"^([-\d.]+)\s*/\s*([-\d.]+)$", text)
    numeric_match = re.search(r"^-?\d+(?:\.\d+)?$", text)

    if percent_match:
        parsed["percentage"] = as_float(percent_match.group(1))
    if fraction_match:
        parsed["numerator"] = as_float(fraction_match.group(1))
        parsed["denominator"] = as_float(fraction_match.group(2))
    if numeric_match:
        parsed["numeric_value"] = as_float(text)
    return parsed


def parse_sofascore_stat_value(value: Any) -> dict[str, float | None]:
    text = str(value or "").strip()
    parsed: dict[str, float | None] = {
        "percentage": None,
        "numeric_value": None,
    }
    percent_match = re.search(r"(-?\d+(?:\.\d+)?)%", text)
    numeric_match = re.search(r"^-?\d+(?:\.\d+)?$", text)
    if percent_match:
        parsed["percentage"] = as_float(percent_match.group(1))
    if numeric_match:
        parsed["numeric_value"] = as_float(text)
    return parsed


def country_alpha3(team: dict[str, Any] | None) -> str | None:
    country = (team or {}).get("country") or {}
    return country.get("alpha3") or country.get("alpha2") or country.get("name")


def import_slate(conn: sqlite3.Connection, slate_date: str) -> dict[str, int]:
    slate_dir = PUBLISHED_SLATES_DIR / slate_date / "games"
    if not slate_dir.exists():
        raise FileNotFoundError(f"No published games directory for {slate_date}: {slate_dir}")

    counts = {
        "matches": 0,
        "h2h": 0,
        "h2h_matches": 0,
        "player_context": 0,
        "recent_matches": 0,
        "recent_form_metrics": 0,
        "desk_predictions": 0,
        "source_predictions": 0,
        "source_rows": 0,
        "market_rows": 0,
    }

    for file_path in sorted(slate_dir.glob("*.json")):
        game = read_json(file_path)
        if game.get("league") != "Tennis":
            continue

        match_id = game["id"]
        context = game.get("tennisContext") or {}
        players = context.get("players") or []
        p1 = players[0].get("name") if len(players) > 0 else None
        p2 = players[1].get("name") if len(players) > 1 else None
        upsert_player(conn, p1)
        upsert_player(conn, p2)

        conn.execute(
            """
            insert into tennis_matches(
              match_id, slate_date, league, title, stage, court, start_label,
              start_minutes, player1_name, player2_name, player1_normalized_name,
              player2_normalized_name, desk_pick_name, desk_confidence, desk_volatility,
              desk_summary, desk_lean, source_file, raw_json
            )
            values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            on conflict(match_id) do update set
              slate_date=excluded.slate_date,
              league=excluded.league,
              title=excluded.title,
              stage=excluded.stage,
              court=excluded.court,
              start_label=excluded.start_label,
              start_minutes=excluded.start_minutes,
              player1_name=excluded.player1_name,
              player2_name=excluded.player2_name,
              player1_normalized_name=excluded.player1_normalized_name,
              player2_normalized_name=excluded.player2_normalized_name,
              desk_pick_name=excluded.desk_pick_name,
              desk_confidence=excluded.desk_confidence,
              desk_volatility=excluded.desk_volatility,
              desk_summary=excluded.desk_summary,
              desk_lean=excluded.desk_lean,
              source_file=excluded.source_file,
              raw_json=excluded.raw_json,
              updated_at=current_timestamp
            """,
            (
                match_id,
                slate_date,
                game.get("league"),
                game.get("title"),
                game.get("stage"),
                context.get("court"),
                game.get("start"),
                game.get("startMinutes"),
                p1,
                p2,
                normalize_name(p1),
                normalize_name(p2),
                (game.get("analysis") or {}).get("participant", {}).get("name") or (context.get("projection") or {}).get("projectedWinner"),
                game.get("confidence"),
                game.get("volatility"),
                game.get("summary"),
                game.get("lean"),
                str(file_path.relative_to(ROOT)),
                dumps(game),
            ),
        )
        counts["matches"] += 1

        projection = context.get("projection") or {}
        conn.execute(
            """
            insert into tennis_predictions(
              slate_date, match_id, prediction_source, pick_name, confidence,
              volatility, projected_set_line, rationale, raw_json
            )
            values (?, ?, 'desk', ?, ?, ?, ?, ?, ?)
            on conflict(slate_date, match_id, prediction_source) do update set
              pick_name=excluded.pick_name,
              confidence=excluded.confidence,
              volatility=excluded.volatility,
              projected_set_line=excluded.projected_set_line,
              rationale=excluded.rationale,
              raw_json=excluded.raw_json,
              updated_at=current_timestamp
            """,
            (
                slate_date,
                match_id,
                projection.get("projectedWinner") or (game.get("analysis") or {}).get("participant", {}).get("name"),
                game.get("confidence"),
                game.get("volatility"),
                projection.get("projectedSetLine"),
                game.get("summary"),
                dumps({"projection": projection, "analysis": game.get("analysis"), "playerAnalysis": game.get("playerAnalysis")}),
            ),
        )
        counts["desk_predictions"] += 1

        prediction_market = context.get("predictionMarket") or {}
        if prediction_market:
            source_name = prediction_market.get("source") or "prediction_market"
            market_economics_by_player = {
                normalize_name(player.get("name")): player
                for player in ((context.get("marketEconomics") or {}).get("players") or [])
            }
            for market_player in prediction_market.get("players") or []:
                player_name = market_player.get("name")
                normalized = normalize_name(player_name)
                if not player_name or not normalized:
                    continue
                market_economics = market_economics_by_player.get(normalized) or {}
                upsert_player(conn, player_name)
                conn.execute(
                    """
                    insert into tennis_prediction_market_snapshots(
                      slate_date, match_id, source_name, captured_at, total_volume,
                      player_name, normalized_name, probability_pct, traded_amount,
                      price_band, gross_profit_pct, gross_payout_multiple,
                      cents_at_risk, cents_profit_if_win, raw_json
                    )
                    values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    on conflict(slate_date, match_id, source_name, normalized_name) do update set
                      captured_at=excluded.captured_at,
                      total_volume=excluded.total_volume,
                      player_name=excluded.player_name,
                      probability_pct=excluded.probability_pct,
                      traded_amount=excluded.traded_amount,
                      price_band=excluded.price_band,
                      gross_profit_pct=excluded.gross_profit_pct,
                      gross_payout_multiple=excluded.gross_payout_multiple,
                      cents_at_risk=excluded.cents_at_risk,
                      cents_profit_if_win=excluded.cents_profit_if_win,
                      raw_json=excluded.raw_json,
                      updated_at=current_timestamp
                    """,
                    (
                        slate_date,
                        match_id,
                        source_name,
                        prediction_market.get("capturedAt"),
                        as_int(prediction_market.get("totalVolume")),
                        player_name,
                        normalized,
                        as_float(market_player.get("probabilityPct")),
                        as_int(market_player.get("amount")),
                        market_economics.get("priceBand"),
                        as_float(market_economics.get("grossProfitPct")),
                        as_float(market_economics.get("grossPayoutMultiple")),
                        as_float(market_economics.get("centsAtRisk")),
                        as_float(market_economics.get("centsProfitIfWin")),
                        dumps({"market": market_player, "economics": market_economics}),
                    ),
                )
                counts["market_rows"] += 1

        for source_name, source_payload in (
            ("tennistonic_h2h", context.get("clayMatchupData")),
            ("opponent_quality", context.get("opponentQualityData")),
        ):
            if source_payload is None:
                continue
            conn.execute(
                """
                insert into tennis_match_sources(match_id, source_name, source_url, status, error, raw_json)
                values (?, ?, ?, ?, ?, ?)
                on conflict(match_id, source_name) do update set
                  source_url=excluded.source_url,
                  status=excluded.status,
                  error=excluded.error,
                  raw_json=excluded.raw_json,
                  updated_at=current_timestamp
                """,
                (
                    match_id,
                    source_name,
                    source_payload.get("sourceUrl"),
                    "error" if source_payload.get("error") else "ok",
                    source_payload.get("error"),
                    dumps(source_payload),
                ),
            )
            counts["source_rows"] += 1

        clay = context.get("clayMatchupData") or {}
        if clay:
            conn.execute(
                """
                insert into tennis_h2h_snapshots(
                  match_id, slate_date, source_url, h2h_record, h2h_text,
                  source_prediction, status, error, raw_json
                )
                values (?, ?, ?, ?, ?, ?, ?, ?, ?)
                on conflict(match_id) do update set
                  slate_date=excluded.slate_date,
                  source_url=excluded.source_url,
                  h2h_record=excluded.h2h_record,
                  h2h_text=excluded.h2h_text,
                  source_prediction=excluded.source_prediction,
                  status=excluded.status,
                  error=excluded.error,
                  raw_json=excluded.raw_json,
                  updated_at=current_timestamp
                """,
                (
                    match_id,
                    slate_date,
                    clay.get("sourceUrl"),
                    clay.get("h2hRecord"),
                    clay.get("h2hText"),
                    clay.get("prediction"),
                    "error" if clay.get("error") else "ok",
                    clay.get("error"),
                    dumps(clay),
                ),
            )
            counts["h2h"] += 1
            if clay.get("prediction"):
                conn.execute(
                    """
                    insert into tennis_predictions(
                      slate_date, match_id, prediction_source, pick_name,
                      confidence, volatility, projected_set_line, rationale, raw_json
                    )
                    values (?, ?, 'tennistonic', ?, null, null, ?, ?, ?)
                    on conflict(slate_date, match_id, prediction_source) do update set
                      pick_name=excluded.pick_name,
                      projected_set_line=excluded.projected_set_line,
                      rationale=excluded.rationale,
                      raw_json=excluded.raw_json,
                      updated_at=current_timestamp
                    """,
                    (
                        slate_date,
                        match_id,
                        clay.get("prediction"),
                        clay.get("prediction"),
                        "Source-site prediction stored for comparison only.",
                        dumps(clay),
                    ),
                )
                counts["source_predictions"] += 1

        quality = context.get("opponentQualityData") or {}
        conn.execute("delete from tennis_h2h_matches where match_id = ?", (match_id,))
        for h2h_index, h2h_row in enumerate(extract_h2h_recent_rows(match_id, slate_date, quality.get("players") or [])):
            conn.execute(
                """
                insert into tennis_h2h_matches(
                  match_id, h2h_index, slate_date, source_name, player_name,
                  opponent_name, winner_name, result_text, event, event_tier,
                  match_date_label, iso_date, surface, weight, raw_json
                )
                values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    match_id,
                    h2h_index,
                    slate_date,
                    h2h_row.get("source_name"),
                    h2h_row.get("player_name"),
                    h2h_row.get("opponent_name"),
                    h2h_row.get("winner_name"),
                    h2h_row.get("result_text"),
                    h2h_row.get("event"),
                    h2h_row.get("event_tier"),
                    h2h_row.get("match_date_label"),
                    h2h_row.get("iso_date"),
                    h2h_row.get("surface"),
                    as_float(h2h_row.get("weight")),
                    dumps(h2h_row.get("raw")),
                ),
            )
            counts["h2h_matches"] += 1

        for player_slot, player in enumerate(quality.get("players") or [], start=1):
            name = player.get("name")
            normalized = normalize_name(name)
            upsert_player(conn, name)
            ranking = player.get("ranking") or {}
            records = player.get("records") or {}
            overall = records.get("overall2026") or {}
            clay_record = records.get("clay2026") or {}
            window = player.get("recentWindow") or {}
            service = player.get("serviceData") or {}
            conn.execute(
                """
                insert into tennis_player_match_context(
                  match_id, player_slot, normalized_name, player_name, ranking_as_of,
                  tour, rank, ranking_points, ranking_age, ranking_country,
                  ranking_profile_url, ranking_source, overall_wins, overall_losses, overall_win_pct,
                  clay_wins, clay_losses, clay_win_pct, recent_matches, recent_wins,
                  recent_losses, recent_win_pct, recent_sets_won, recent_sets_lost,
                  recent_set_pct, recent_games_won, recent_games_lost, recent_game_pct,
                  resistance_matches, straight_set_wins, straight_set_losses,
                  known_opponent_ranks, missing_opponent_ranks, ranking_coverage_pct,
                  avg_known_opponent_rank, top10_opponents, top25_opponents,
                  top50_opponents, challenger_or_itf_matches, scoreline_form_score,
                  opponent_adjusted_form_score, service_data_source, service_data_note,
                  raw_json
                )
                values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                on conflict(match_id, normalized_name) do update set
                  player_slot=excluded.player_slot,
                  player_name=excluded.player_name,
                  ranking_as_of=excluded.ranking_as_of,
                  tour=excluded.tour,
                  rank=excluded.rank,
                  ranking_points=excluded.ranking_points,
                  ranking_age=excluded.ranking_age,
                  ranking_country=excluded.ranking_country,
                  ranking_profile_url=excluded.ranking_profile_url,
                  ranking_source=excluded.ranking_source,
                  overall_wins=excluded.overall_wins,
                  overall_losses=excluded.overall_losses,
                  overall_win_pct=excluded.overall_win_pct,
                  clay_wins=excluded.clay_wins,
                  clay_losses=excluded.clay_losses,
                  clay_win_pct=excluded.clay_win_pct,
                  recent_matches=excluded.recent_matches,
                  recent_wins=excluded.recent_wins,
                  recent_losses=excluded.recent_losses,
                  recent_win_pct=excluded.recent_win_pct,
                  recent_sets_won=excluded.recent_sets_won,
                  recent_sets_lost=excluded.recent_sets_lost,
                  recent_set_pct=excluded.recent_set_pct,
                  recent_games_won=excluded.recent_games_won,
                  recent_games_lost=excluded.recent_games_lost,
                  recent_game_pct=excluded.recent_game_pct,
                  resistance_matches=excluded.resistance_matches,
                  straight_set_wins=excluded.straight_set_wins,
                  straight_set_losses=excluded.straight_set_losses,
                  known_opponent_ranks=excluded.known_opponent_ranks,
                  missing_opponent_ranks=excluded.missing_opponent_ranks,
                  ranking_coverage_pct=excluded.ranking_coverage_pct,
                  avg_known_opponent_rank=excluded.avg_known_opponent_rank,
                  top10_opponents=excluded.top10_opponents,
                  top25_opponents=excluded.top25_opponents,
                  top50_opponents=excluded.top50_opponents,
                  challenger_or_itf_matches=excluded.challenger_or_itf_matches,
                  scoreline_form_score=excluded.scoreline_form_score,
                  opponent_adjusted_form_score=excluded.opponent_adjusted_form_score,
                  service_data_source=excluded.service_data_source,
                  service_data_note=excluded.service_data_note,
                  raw_json=excluded.raw_json,
                  updated_at=current_timestamp
                """,
                (
                    match_id,
                    player_slot,
                    normalized,
                    name,
                    ranking.get("asOf"),
                    ranking.get("tour"),
                    as_int(ranking.get("rank")),
                    as_int(ranking.get("points")),
                    as_int(ranking.get("age")),
                    ranking.get("country"),
                    ranking.get("profileUrl"),
                    ranking.get("source"),
                    as_int(overall.get("wins")),
                    as_int(overall.get("losses")),
                    as_float(overall.get("winPct")),
                    as_int(clay_record.get("wins")),
                    as_int(clay_record.get("losses")),
                    as_float(clay_record.get("winPct")),
                    as_int(window.get("matches")),
                    as_int(window.get("wins")),
                    as_int(window.get("losses")),
                    as_float(window.get("winPct")),
                    as_int(window.get("setsWon")),
                    as_int(window.get("setsLost")),
                    as_float(window.get("setPct")),
                    as_int(window.get("gamesWon")),
                    as_int(window.get("gamesLost")),
                    as_float(window.get("gamePct")),
                    as_int(window.get("resistanceMatches")),
                    as_int(window.get("straightSetWins")),
                    as_int(window.get("straightSetLosses")),
                    as_int(window.get("knownOpponentRanks")),
                    as_int(window.get("missingOpponentRanks")),
                    as_float(window.get("rankingCoveragePct")),
                    as_float(window.get("avgKnownOpponentRank")),
                    as_int(window.get("top10Opponents")),
                    as_int(window.get("top25Opponents")),
                    as_int(window.get("top50Opponents")),
                    as_int(window.get("challengerOrItfMatches")),
                    as_float(window.get("scorelineFormScore")),
                    as_float(window.get("opponentAdjustedFormScore")),
                    service.get("source"),
                    service.get("note"),
                    dumps(player),
                ),
            )
            counts["player_context"] += 1

            conn.execute(
                "delete from tennis_recent_form_metrics where match_id = ? and normalized_name = ?",
                (match_id, normalized),
            )
            for metric in build_recent_form_metric_rows(player):
                conn.execute(
                    """
                    insert into tennis_recent_form_metrics(
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
                        as_int(metric.get("recent_index")),
                        metric.get("metric_key"),
                        name,
                        metric.get("metric_label"),
                        as_float(metric.get("score")),
                        bool_int(metric.get("estimated")),
                        metric.get("source"),
                        as_float(metric.get("weight")),
                        metric.get("opponent_name"),
                        metric.get("opponent_normalized_name"),
                        as_int(metric.get("opponent_rank")),
                        metric.get("event"),
                        metric.get("event_tier"),
                        metric.get("match_date_label"),
                        metric.get("surface"),
                        dumps(metric.get("raw")),
                    ),
                )
                counts["recent_form_metrics"] += 1

            for index, recent in enumerate(player.get("recentMatches") or []):
                opponent = recent.get("opponent")
                opponent_ranking = recent.get("opponentRanking") or {}
                parsed = recent.get("parsed") or {}
                upsert_player(conn, opponent)
                conn.execute(
                    """
                    insert into tennis_recent_matches(
                      match_id, normalized_name, recent_index, player_name, event,
                      event_tier, opponent_name, opponent_normalized_name, opponent_rank,
                      opponent_tour, result_text, match_date_label, completed,
                      player_won, retirement, walkover, sets_played, sets_won,
                      sets_lost, games_won, games_lost, tiebreak_sets, deciding_set,
                      straight_set_win, straight_set_loss, resistance, opponent_weight,
                      quality_points, raw_json
                    )
                    values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    on conflict(match_id, normalized_name, recent_index) do update set
                      player_name=excluded.player_name,
                      event=excluded.event,
                      event_tier=excluded.event_tier,
                      opponent_name=excluded.opponent_name,
                      opponent_normalized_name=excluded.opponent_normalized_name,
                      opponent_rank=excluded.opponent_rank,
                      opponent_tour=excluded.opponent_tour,
                      result_text=excluded.result_text,
                      match_date_label=excluded.match_date_label,
                      completed=excluded.completed,
                      player_won=excluded.player_won,
                      retirement=excluded.retirement,
                      walkover=excluded.walkover,
                      sets_played=excluded.sets_played,
                      sets_won=excluded.sets_won,
                      sets_lost=excluded.sets_lost,
                      games_won=excluded.games_won,
                      games_lost=excluded.games_lost,
                      tiebreak_sets=excluded.tiebreak_sets,
                      deciding_set=excluded.deciding_set,
                      straight_set_win=excluded.straight_set_win,
                      straight_set_loss=excluded.straight_set_loss,
                      resistance=excluded.resistance,
                      opponent_weight=excluded.opponent_weight,
                      quality_points=excluded.quality_points,
                      raw_json=excluded.raw_json,
                      updated_at=current_timestamp
                    """,
                    (
                        match_id,
                        normalized,
                        index,
                        name,
                        recent.get("event"),
                        recent.get("eventTier"),
                        opponent,
                        normalize_name(opponent),
                        as_int(opponent_ranking.get("rank")),
                        opponent_ranking.get("tour"),
                        recent.get("result"),
                        recent.get("date"),
                        bool_int(parsed.get("completed")),
                        bool_int(parsed.get("playerWon")),
                        bool_int(parsed.get("retirement")),
                        bool_int(parsed.get("walkover")),
                        as_int(parsed.get("setsPlayed")),
                        as_int(parsed.get("setsWon")),
                        as_int(parsed.get("setsLost")),
                        as_int(parsed.get("gamesWon")),
                        as_int(parsed.get("gamesLost")),
                        as_int(parsed.get("tiebreakSets")),
                        bool_int(parsed.get("decidingSet")),
                        bool_int(parsed.get("straightSetWin")),
                        bool_int(parsed.get("straightSetLoss")),
                        bool_int(parsed.get("resistance")),
                        as_float(recent.get("opponentWeight")),
                        as_float(recent.get("qualityPoints")),
                        dumps(recent),
                    ),
                )
                counts["recent_matches"] += 1

    conn.commit()
    return counts


def import_flashscore(conn: sqlite3.Connection, directory: Path = FLASHSCORE_DIR) -> dict[str, int]:
    counts = {"matches": 0, "stat_rows": 0, "player_stat_rows": 0, "recent_links": 0}
    if not directory.exists():
        return counts
    for file_path in sorted(directory.glob("*.json")):
        payload = read_json(file_path)
        flashscore_id = payload.get("matchId") or file_path.stem
        players = payload.get("players") or []
        left_name = players[0] if len(players) > 0 else None
        right_name = players[1] if len(players) > 1 else None
        upsert_player(conn, left_name)
        upsert_player(conn, right_name)
        conn.execute(
            """
            insert into tennis_flashscore_match_stats(
              flashscore_id, slate_date, board_match_id, source_url, generated_at,
              left_player_name, right_player_name, flashscore_label, board_title,
              source_kind, board_player_name, recent_opponent_name, recent_index,
              recent_event, recent_date, recent_iso_date, recent_result,
              flashscore_tournament_url,
              score_summary_json, raw_json
            )
            values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            on conflict(flashscore_id) do update set
              slate_date=excluded.slate_date,
              board_match_id=excluded.board_match_id,
              source_url=excluded.source_url,
              generated_at=excluded.generated_at,
              left_player_name=excluded.left_player_name,
              right_player_name=excluded.right_player_name,
              flashscore_label=excluded.flashscore_label,
              board_title=excluded.board_title,
              source_kind=excluded.source_kind,
              board_player_name=excluded.board_player_name,
              recent_opponent_name=excluded.recent_opponent_name,
              recent_index=excluded.recent_index,
              recent_event=excluded.recent_event,
              recent_date=excluded.recent_date,
              recent_iso_date=excluded.recent_iso_date,
              recent_result=excluded.recent_result,
              flashscore_tournament_url=excluded.flashscore_tournament_url,
              score_summary_json=excluded.score_summary_json,
              raw_json=excluded.raw_json,
              updated_at=current_timestamp
            """,
            (
                flashscore_id,
                payload.get("slateDate"),
                payload.get("boardMatchId"),
                payload.get("sourceUrl"),
                payload.get("generatedAt"),
                left_name,
                right_name,
                payload.get("flashscoreLabel"),
                payload.get("boardTitle"),
                payload.get("sourceKind"),
                payload.get("boardPlayerName"),
                payload.get("recentOpponentName"),
                payload.get("recentIndex"),
                payload.get("recentEvent"),
                payload.get("recentDate"),
                payload.get("recentIsoDate"),
                payload.get("recentResult"),
                payload.get("flashscoreTournamentUrl"),
                dumps(payload.get("scoreSummary")),
                dumps(payload),
            ),
        )
        if payload.get("sourceKind") == "recent-match" and payload.get("boardPlayerName") is not None:
            conn.execute(
                """
                insert into tennis_flashscore_recent_links(
                  board_match_id, board_player_name, recent_index, flashscore_id,
                  slate_date, board_title, recent_opponent_name, recent_event,
                  recent_date, recent_iso_date, recent_result, flashscore_label,
                  flashscore_tournament_url, raw_json
                )
                values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                on conflict(board_match_id, board_player_name, recent_index) do update set
                  flashscore_id=excluded.flashscore_id,
                  slate_date=excluded.slate_date,
                  board_title=excluded.board_title,
                  recent_opponent_name=excluded.recent_opponent_name,
                  recent_event=excluded.recent_event,
                  recent_date=excluded.recent_date,
                  recent_iso_date=excluded.recent_iso_date,
                  recent_result=excluded.recent_result,
                  flashscore_label=excluded.flashscore_label,
                  flashscore_tournament_url=excluded.flashscore_tournament_url,
                  raw_json=excluded.raw_json,
                  updated_at=current_timestamp
                """,
                (
                    payload.get("boardMatchId"),
                    payload.get("boardPlayerName"),
                    payload.get("recentIndex"),
                    flashscore_id,
                    payload.get("slateDate"),
                    payload.get("boardTitle"),
                    payload.get("recentOpponentName"),
                    payload.get("recentEvent"),
                    payload.get("recentDate"),
                    payload.get("recentIsoDate"),
                    payload.get("recentResult"),
                    payload.get("flashscoreLabel"),
                    payload.get("flashscoreTournamentUrl"),
                    dumps(payload),
                ),
            )
        counts["matches"] += 1

        for scope in payload.get("scopes") or []:
            for section in scope.get("sections") or []:
                for stat in section.get("stats") or []:
                    conn.execute(
                        """
                        insert into tennis_flashscore_stat_rows(
                          flashscore_id, scope_label, section_label, stat_label,
                          left_player_name, right_player_name, left_value, right_value, raw_json
                        )
                        values (?, ?, ?, ?, ?, ?, ?, ?, ?)
                        on conflict(flashscore_id, scope_label, section_label, stat_label) do update set
                          left_player_name=excluded.left_player_name,
                          right_player_name=excluded.right_player_name,
                          left_value=excluded.left_value,
                          right_value=excluded.right_value,
                          raw_json=excluded.raw_json,
                          updated_at=current_timestamp
                        """,
                        (
                            flashscore_id,
                            scope.get("label"),
                            section.get("label"),
                            stat.get("label"),
                            stat.get("leftPlayer"),
                            stat.get("rightPlayer"),
                            stat.get("left"),
                            stat.get("right"),
                            dumps(stat),
                        ),
                    )
                    counts["stat_rows"] += 1
                    for side, player_name, raw_value in (
                        ("left", stat.get("leftPlayer") or left_name, stat.get("left")),
                        ("right", stat.get("rightPlayer") or right_name, stat.get("right")),
                    ):
                        parsed = parse_flashscore_stat_value(raw_value)
                        normalized = normalize_name(player_name)
                        upsert_player(conn, player_name)
                        conn.execute(
                            """
                            insert into tennis_flashscore_player_stat_rows(
                              flashscore_id, slate_date, board_match_id, player_side,
                              scope_label, section_label, stat_label, player_name,
                              normalized_name, raw_value, percentage, numerator,
                              denominator, numeric_value, raw_json
                            )
                            values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                            on conflict(flashscore_id, player_side, scope_label, section_label, stat_label) do update set
                              slate_date=excluded.slate_date,
                              board_match_id=excluded.board_match_id,
                              player_name=excluded.player_name,
                              normalized_name=excluded.normalized_name,
                              raw_value=excluded.raw_value,
                              percentage=excluded.percentage,
                              numerator=excluded.numerator,
                              denominator=excluded.denominator,
                              numeric_value=excluded.numeric_value,
                              raw_json=excluded.raw_json,
                              updated_at=current_timestamp
                            """,
                            (
                                flashscore_id,
                                payload.get("slateDate"),
                                payload.get("boardMatchId"),
                                side,
                                scope.get("label"),
                                section.get("label"),
                                stat.get("label"),
                                player_name,
                                normalized,
                                raw_value,
                                parsed["percentage"],
                                parsed["numerator"],
                                parsed["denominator"],
                                parsed["numeric_value"],
                                dumps({"stat": stat, "side": side}),
                            ),
                        )
                        counts["player_stat_rows"] += 1
    maps_dir = directory.parent
    for map_path in sorted(maps_dir.glob("flashscore-recent-match-map-*.json")):
        slate_date = infer_recent_map_slate_date(map_path)
        map_payload = read_json(map_path)
        for link in (map_payload.get("map") or {}).values():
            board_player_name = link.get("boardPlayerName") or link.get("playerName")
            if not link.get("boardMatchId") or not board_player_name:
                continue
            conn.execute(
                """
                insert into tennis_flashscore_recent_links(
                  board_match_id, board_player_name, recent_index, flashscore_id,
                  slate_date, board_title, recent_opponent_name, recent_event,
                  recent_date, recent_iso_date, recent_result, flashscore_label,
                  flashscore_tournament_url, raw_json
                )
                values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                on conflict(board_match_id, board_player_name, recent_index) do update set
                  flashscore_id=excluded.flashscore_id,
                  slate_date=excluded.slate_date,
                  board_title=excluded.board_title,
                  recent_opponent_name=excluded.recent_opponent_name,
                  recent_event=excluded.recent_event,
                  recent_date=excluded.recent_date,
                  recent_iso_date=excluded.recent_iso_date,
                  recent_result=excluded.recent_result,
                  flashscore_label=excluded.flashscore_label,
                  flashscore_tournament_url=excluded.flashscore_tournament_url,
                  raw_json=excluded.raw_json,
                  updated_at=current_timestamp
                """,
                (
                    link.get("boardMatchId"),
                    board_player_name,
                    link.get("recentIndex"),
                    link.get("flashscoreId"),
                    slate_date,
                    link.get("boardTitle"),
                    link.get("opponentName"),
                    link.get("recentEvent"),
                    link.get("recentDate"),
                    link.get("recentIsoDate"),
                    link.get("recentResult"),
                    link.get("flashscoreLabel"),
                    link.get("flashscoreTournamentUrl"),
                    dumps(link),
                ),
            )
            counts["recent_links"] += 1
    conn.commit()
    return counts


def import_sofascore(conn: sqlite3.Connection, directory: Path = SOFASCORE_DIR) -> dict[str, int]:
    counts = {"matches": 0, "stat_rows": 0, "player_stat_rows": 0, "replay_games": 0, "replay_points": 0}
    if not directory.exists():
        return counts

    for file_path in sorted(directory.glob("*.json")):
        payload = read_json(file_path)
        if not payload.get("eventId") or not ((payload.get("payloads") or {}).get("event")):
            continue
        event_id = str(payload.get("eventId") or file_path.stem)
        event_response = (payload.get("payloads") or {}).get("event") or {}
        event = ((event_response.get("body") or {}).get("event")) or payload.get("compactEvent") or {}
        stats_response = (payload.get("payloads") or {}).get("statistics") or {}
        stats_body = stats_response.get("body") or {}
        point_by_point_response = (payload.get("payloads") or {}).get("pointByPoint") or {}
        point_by_point_body = point_by_point_response.get("body") or {}
        h2h_response = (payload.get("payloads") or {}).get("h2h") or {}
        h2h_body = h2h_response.get("body") or {}
        team_duel = h2h_body.get("teamDuel") or {}
        tournament = event.get("tournament") or {}
        category = tournament.get("category") or {}
        if isinstance(category, dict):
            tournament_category = category.get("name")
        else:
            tournament_category = category
        home = event.get("homeTeam") or {}
        away = event.get("awayTeam") or {}
        home_info = home.get("playerTeamInfo") or {}
        away_info = away.get("playerTeamInfo") or {}
        home_name = home.get("name")
        away_name = away.get("name")
        upsert_player(conn, home_name)
        upsert_player(conn, away_name)

        conn.execute(
            """
            insert into tennis_sofascore_matches(
              sofascore_event_id, slate_date, board_match_id, source_url,
              captured_at, status_code, slug, tournament_name, tournament_category,
              surface, start_timestamp, home_player_name, away_player_name,
              home_normalized_name, away_normalized_name, home_player_id,
              away_player_id, home_rank, away_rank, home_current_rank,
              away_current_rank, home_country, away_country, home_score_json,
              away_score_json, h2h_home_wins, h2h_away_wins, h2h_draws,
              raw_json
            )
            values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            on conflict(sofascore_event_id) do update set
              slate_date=excluded.slate_date,
              board_match_id=excluded.board_match_id,
              source_url=excluded.source_url,
              captured_at=excluded.captured_at,
              status_code=excluded.status_code,
              slug=excluded.slug,
              tournament_name=excluded.tournament_name,
              tournament_category=excluded.tournament_category,
              surface=excluded.surface,
              start_timestamp=excluded.start_timestamp,
              home_player_name=excluded.home_player_name,
              away_player_name=excluded.away_player_name,
              home_normalized_name=excluded.home_normalized_name,
              away_normalized_name=excluded.away_normalized_name,
              home_player_id=excluded.home_player_id,
              away_player_id=excluded.away_player_id,
              home_rank=excluded.home_rank,
              away_rank=excluded.away_rank,
              home_current_rank=excluded.home_current_rank,
              away_current_rank=excluded.away_current_rank,
              home_country=excluded.home_country,
              away_country=excluded.away_country,
              home_score_json=excluded.home_score_json,
              away_score_json=excluded.away_score_json,
              h2h_home_wins=excluded.h2h_home_wins,
              h2h_away_wins=excluded.h2h_away_wins,
              h2h_draws=excluded.h2h_draws,
              raw_json=excluded.raw_json,
              updated_at=current_timestamp
            """,
            (
                event_id,
                payload.get("slateDate"),
                payload.get("boardMatchId"),
                payload.get("sourceUrl"),
                payload.get("capturedAt"),
                as_int(event_response.get("status")),
                event.get("slug"),
                tournament.get("name"),
                tournament_category,
                event.get("groundType"),
                as_int(event.get("startTimestamp")),
                home_name,
                away_name,
                normalize_name(home_name),
                normalize_name(away_name),
                as_int(home.get("id")),
                as_int(away.get("id")),
                as_int(home.get("ranking")),
                as_int(away.get("ranking")),
                as_int(home_info.get("currentRanking")),
                as_int(away_info.get("currentRanking")),
                country_alpha3(home),
                country_alpha3(away),
                dumps(event.get("homeScore")),
                dumps(event.get("awayScore")),
                as_int(team_duel.get("homeWins")),
                as_int(team_duel.get("awayWins")),
                as_int(team_duel.get("draws")),
                dumps(payload),
            ),
        )
        counts["matches"] += 1

        for period in stats_body.get("statistics") or []:
            period_label = period.get("period") or "ALL"
            for group in period.get("groups") or []:
                group_name = group.get("groupName") or ""
                for item in group.get("statisticsItems") or []:
                    stat_name = item.get("name") or ""
                    stat_key = item.get("key") or normalize_name(stat_name).replace(" ", "_")
                    home_parsed = parse_sofascore_stat_value(item.get("home"))
                    away_parsed = parse_sofascore_stat_value(item.get("away"))
                    conn.execute(
                        """
                        insert into tennis_sofascore_stat_rows(
                          sofascore_event_id, period, group_name, stat_key, stat_name,
                          home_player_name, away_player_name, home_value, away_value,
                          home_numeric, away_numeric, home_percentage, away_percentage,
                          raw_json
                        )
                        values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                        on conflict(sofascore_event_id, period, group_name, stat_key) do update set
                          stat_name=excluded.stat_name,
                          home_player_name=excluded.home_player_name,
                          away_player_name=excluded.away_player_name,
                          home_value=excluded.home_value,
                          away_value=excluded.away_value,
                          home_numeric=excluded.home_numeric,
                          away_numeric=excluded.away_numeric,
                          home_percentage=excluded.home_percentage,
                          away_percentage=excluded.away_percentage,
                          raw_json=excluded.raw_json,
                          updated_at=current_timestamp
                        """,
                        (
                            event_id,
                            period_label,
                            group_name,
                            stat_key,
                            stat_name,
                            home_name,
                            away_name,
                            item.get("home"),
                            item.get("away"),
                            as_float(item.get("homeValue")) if item.get("homeValue") is not None else home_parsed["numeric_value"],
                            as_float(item.get("awayValue")) if item.get("awayValue") is not None else away_parsed["numeric_value"],
                            home_parsed["percentage"],
                            away_parsed["percentage"],
                            dumps(item),
                        ),
                    )
                    counts["stat_rows"] += 1
                    for side, player_name, raw_value, parsed_value, numeric_value in (
                        ("home", home_name, item.get("home"), home_parsed, item.get("homeValue")),
                        ("away", away_name, item.get("away"), away_parsed, item.get("awayValue")),
                    ):
                        conn.execute(
                            """
                            insert into tennis_sofascore_player_stat_rows(
                              sofascore_event_id, slate_date, board_match_id, player_side,
                              period, group_name, stat_key, stat_name, player_name,
                              normalized_name, raw_value, numeric_value, percentage, raw_json
                            )
                            values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                            on conflict(sofascore_event_id, player_side, period, group_name, stat_key) do update set
                              slate_date=excluded.slate_date,
                              board_match_id=excluded.board_match_id,
                              stat_name=excluded.stat_name,
                              player_name=excluded.player_name,
                              normalized_name=excluded.normalized_name,
                              raw_value=excluded.raw_value,
                              numeric_value=excluded.numeric_value,
                              percentage=excluded.percentage,
                              raw_json=excluded.raw_json,
                              updated_at=current_timestamp
                            """,
                            (
                                event_id,
                                payload.get("slateDate"),
                                payload.get("boardMatchId"),
                                side,
                                period_label,
                                group_name,
                                stat_key,
                                stat_name,
                                player_name,
                                normalize_name(player_name),
                                raw_value,
                                as_float(numeric_value) if numeric_value is not None else parsed_value["numeric_value"],
                                parsed_value["percentage"],
                                dumps({"stat": item, "side": side}),
                            ),
                        )
                        counts["player_stat_rows"] += 1
        for set_index, set_payload in enumerate(point_by_point_body.get("pointByPoint") or []):
            set_number = as_int(set_payload.get("set"))
            if set_number is None:
                continue
            for game_index, game_payload in enumerate(set_payload.get("games") or []):
                game_number = as_int(game_payload.get("game"))
                if game_number is None:
                    continue
                score = game_payload.get("score") or {}
                serving_side = sofascore_side(score.get("serving"))
                scoring_side = sofascore_side(score.get("scoring"))
                conn.execute(
                    """
                    insert into tennis_sofascore_replay_games(
                      sofascore_event_id, slate_date, board_match_id, set_number,
                      game_number, response_set_index, response_game_index,
                      home_player_name, away_player_name, serving_side, scoring_side,
                      home_games_after, away_games_after, point_count, break_game,
                      raw_json
                    )
                    values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    on conflict(sofascore_event_id, set_number, game_number) do update set
                      slate_date=excluded.slate_date,
                      board_match_id=excluded.board_match_id,
                      response_set_index=excluded.response_set_index,
                      response_game_index=excluded.response_game_index,
                      home_player_name=excluded.home_player_name,
                      away_player_name=excluded.away_player_name,
                      serving_side=excluded.serving_side,
                      scoring_side=excluded.scoring_side,
                      home_games_after=excluded.home_games_after,
                      away_games_after=excluded.away_games_after,
                      point_count=excluded.point_count,
                      break_game=excluded.break_game,
                      raw_json=excluded.raw_json,
                      updated_at=current_timestamp
                    """,
                    (
                        event_id,
                        payload.get("slateDate"),
                        payload.get("boardMatchId"),
                        set_number,
                        game_number,
                        set_index,
                        game_index,
                        home_name,
                        away_name,
                        serving_side,
                        scoring_side,
                        as_int(score.get("homeScore")),
                        as_int(score.get("awayScore")),
                        len(game_payload.get("points") or []),
                        bool_int(serving_side is not None and scoring_side is not None and serving_side != scoring_side),
                        dumps(game_payload),
                    ),
                )
                counts["replay_games"] += 1
                for point_index, point_payload in enumerate(game_payload.get("points") or []):
                    conn.execute(
                        """
                        insert into tennis_sofascore_replay_points(
                          sofascore_event_id, slate_date, board_match_id, set_number,
                          game_number, point_index, home_player_name, away_player_name,
                          serving_side, scoring_side, home_point, away_point,
                          point_description, home_point_type, away_point_type, raw_json
                        )
                        values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                        on conflict(sofascore_event_id, set_number, game_number, point_index) do update set
                          slate_date=excluded.slate_date,
                          board_match_id=excluded.board_match_id,
                          home_player_name=excluded.home_player_name,
                          away_player_name=excluded.away_player_name,
                          serving_side=excluded.serving_side,
                          scoring_side=excluded.scoring_side,
                          home_point=excluded.home_point,
                          away_point=excluded.away_point,
                          point_description=excluded.point_description,
                          home_point_type=excluded.home_point_type,
                          away_point_type=excluded.away_point_type,
                          raw_json=excluded.raw_json,
                          updated_at=current_timestamp
                        """,
                        (
                            event_id,
                            payload.get("slateDate"),
                            payload.get("boardMatchId"),
                            set_number,
                            game_number,
                            point_index,
                            home_name,
                            away_name,
                            serving_side,
                            scoring_side,
                            point_payload.get("homePoint"),
                            point_payload.get("awayPoint"),
                            as_int(point_payload.get("pointDescription")),
                            as_int(point_payload.get("homePointType")),
                            as_int(point_payload.get("awayPointType")),
                            dumps(point_payload),
                        ),
                    )
                    counts["replay_points"] += 1
    conn.commit()
    return counts


def import_sofascore_player_page_stats(
    conn: sqlite3.Connection,
    directory: Path = SOFASCORE_PLAYER_STATS_DIR,
    slate_date: str | None = None,
) -> dict[str, int]:
    files = [directory / f"{slate_date}.json"] if slate_date else sorted(directory.glob("*.json"))
    counts = {"files": 0, "players": 0, "stat_rows": 0, "missing_player_ids": 0}
    for file_path in files:
        if not file_path.exists():
            continue
        payload = read_json(file_path)
        as_of_date = payload.get("slateDate") or slate_date or file_path.stem
        counts["files"] += 1
        counts["missing_player_ids"] += len(payload.get("missingPlayerIds") or [])
        for player in payload.get("players") or []:
            player_name = player.get("name")
            normalized = normalize_name(player.get("normalizedName") or player_name)
            if not normalized or not player_name:
                continue
            upsert_player(conn, player_name)
            counts["players"] += 1
            for surface_key, stats in (player.get("stats") or {}).items():
                if not isinstance(stats, dict) or stats.get("error"):
                    continue
                surface = stats.get("surface") or ("Clay" if surface_key == "clay" else "All surfaces")
                conn.execute(
                    """
                    insert into tennis_sofascore_player_page_stats(
                      as_of_date, normalized_name, player_name, sofascore_player_id,
                      source_url, season, surface, matches_won, matches_total,
                      matches_won_pct, tournaments_won, tournaments_total,
                      tournaments_won_pct, first_serve_pct, first_serve_won_pct,
                      second_serve_pct, second_serve_won_pct, aces_per_match,
                      double_faults_per_match, break_points_saved,
                      break_points_faced, break_points_saved_pct,
                      break_points_converted, break_points_to_convert,
                      break_points_converted_pct, tiebreaks_won, tiebreaks_total,
                      tiebreaks_won_pct, captured_at, raw_json
                    )
                    values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    on conflict(as_of_date, normalized_name, season, surface) do update set
                      player_name=excluded.player_name,
                      sofascore_player_id=excluded.sofascore_player_id,
                      source_url=excluded.source_url,
                      matches_won=excluded.matches_won,
                      matches_total=excluded.matches_total,
                      matches_won_pct=excluded.matches_won_pct,
                      tournaments_won=excluded.tournaments_won,
                      tournaments_total=excluded.tournaments_total,
                      tournaments_won_pct=excluded.tournaments_won_pct,
                      first_serve_pct=excluded.first_serve_pct,
                      first_serve_won_pct=excluded.first_serve_won_pct,
                      second_serve_pct=excluded.second_serve_pct,
                      second_serve_won_pct=excluded.second_serve_won_pct,
                      aces_per_match=excluded.aces_per_match,
                      double_faults_per_match=excluded.double_faults_per_match,
                      break_points_saved=excluded.break_points_saved,
                      break_points_faced=excluded.break_points_faced,
                      break_points_saved_pct=excluded.break_points_saved_pct,
                      break_points_converted=excluded.break_points_converted,
                      break_points_to_convert=excluded.break_points_to_convert,
                      break_points_converted_pct=excluded.break_points_converted_pct,
                      tiebreaks_won=excluded.tiebreaks_won,
                      tiebreaks_total=excluded.tiebreaks_total,
                      tiebreaks_won_pct=excluded.tiebreaks_won_pct,
                      captured_at=excluded.captured_at,
                      raw_json=excluded.raw_json,
                      updated_at=current_timestamp
                    """,
                    (
                        as_of_date,
                        normalized,
                        player_name,
                        as_int(player.get("sofascorePlayerId")),
                        player.get("sourceUrl"),
                        as_int(player.get("season") or payload.get("season")),
                        surface,
                        as_float(stats.get("matchesWon")),
                        as_float(stats.get("matchesTotal")),
                        as_float(stats.get("matchesWonPct")),
                        as_float(stats.get("tournamentsWon")),
                        as_float(stats.get("tournamentsTotal")),
                        as_float(stats.get("tournamentsWonPct")),
                        as_float(stats.get("firstServePct")),
                        as_float(stats.get("firstServeWonPct")),
                        as_float(stats.get("secondServePct")),
                        as_float(stats.get("secondServeWonPct")),
                        as_float(stats.get("acesPerMatch")),
                        as_float(stats.get("doubleFaultsPerMatch")),
                        as_float(stats.get("breakPointsSaved")),
                        as_float(stats.get("breakPointsFaced")),
                        as_float(stats.get("breakPointsSavedPct")),
                        as_float(stats.get("breakPointsConverted")),
                        as_float(stats.get("breakPointsToConvert")),
                        as_float(stats.get("breakPointsConvertedPct")),
                        as_float(stats.get("tiebreaksWon")),
                        as_float(stats.get("tiebreaksTotal")),
                        as_float(stats.get("tiebreaksWonPct")),
                        player.get("capturedAt") or payload.get("capturedAt"),
                        dumps({"player": player, "surfaceStats": stats, "surfaceKey": surface_key}),
                    ),
                )
                counts["stat_rows"] += 1
    conn.commit()
    return counts


def import_results(conn: sqlite3.Connection, slate_date: str, file_path: Path | None = None) -> dict[str, int]:
    path = file_path or (TENNIS_REFERENCE_DIR / f"espn-scoreboard-{slate_date}.json")
    payload = read_json(path)
    counts = {"results": 0, "completed": 0}
    for match in payload.get("singles") or []:
        players = match.get("players") or []
        if len(players) != 2:
            continue
        p1 = players[0].get("name")
        p2 = players[1].get("name")
        winner = match.get("winnerName")
        upsert_player(conn, p1)
        upsert_player(conn, p2)
        upsert_player(conn, winner)
        title = f"{p1} vs {p2}"
        conn.execute(
            """
            insert into tennis_match_results(
              slate_date, event_id, match_id, title, round_label, court, status,
              completed, player1_name, player2_name, player1_normalized_name,
              player2_normalized_name, winner_name, winner_normalized_name,
              scoreline, source_url, raw_json
            )
            values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            on conflict(slate_date, event_id) do update set
              match_id=excluded.match_id,
              title=excluded.title,
              round_label=excluded.round_label,
              court=excluded.court,
              status=excluded.status,
              completed=excluded.completed,
              player1_name=excluded.player1_name,
              player2_name=excluded.player2_name,
              player1_normalized_name=excluded.player1_normalized_name,
              player2_normalized_name=excluded.player2_normalized_name,
              winner_name=excluded.winner_name,
              winner_normalized_name=excluded.winner_normalized_name,
              scoreline=excluded.scoreline,
              source_url=excluded.source_url,
              raw_json=excluded.raw_json,
              updated_at=current_timestamp
            """,
            (
                slate_date,
                match.get("eventId"),
                None,
                title,
                match.get("round"),
                match.get("court"),
                match.get("statusDescription"),
                bool_int(match.get("completed")),
                p1,
                p2,
                normalize_name(p1),
                normalize_name(p2),
                winner,
                normalize_name(winner),
                match.get("scoreline"),
                payload.get("sourceUrl"),
                dumps(match),
            ),
        )
        counts["results"] += 1
        if match.get("completed"):
            counts["completed"] += 1
    conn.commit()
    return counts


def grade_predictions(conn: sqlite3.Connection, slate_date: str) -> dict[str, Any]:
    predictions = [
        dict(row)
        for row in conn.execute(
            """
            select *
            from tennis_predictions
            where slate_date = ? and prediction_source = 'desk'
            """,
            (slate_date,),
        ).fetchall()
    ]
    results = [
        dict(row)
        for row in conn.execute(
            """
            select *
            from tennis_match_results
            where slate_date = ? and completed = 1 and winner_normalized_name is not null
            """,
            (slate_date,),
        ).fetchall()
    ]

    def result_for_prediction(prediction: dict[str, Any]) -> dict[str, Any] | None:
        match = conn.execute("select * from tennis_matches where match_id = ?", (prediction["match_id"],)).fetchone()
        if not match:
            return None
        player_names = {match["player1_normalized_name"], match["player2_normalized_name"]}
        for result in results:
            result_names = {result["player1_normalized_name"], result["player2_normalized_name"]}
            if player_names == result_names:
                return result
        for result in results:
            if (
                names_likely_match(match["player1_name"], result["player1_name"])
                and names_likely_match(match["player2_name"], result["player2_name"])
            ) or (
                names_likely_match(match["player1_name"], result["player2_name"])
                and names_likely_match(match["player2_name"], result["player1_name"])
            ):
                return result
        return None

    counts = {"graded": 0, "hits": 0, "misses": 0, "unmatched": 0}
    misses = []
    for prediction in predictions:
        result = result_for_prediction(prediction)
        if not result:
            counts["unmatched"] += 1
            continue
        hit = normalize_name(prediction.get("pick_name")) == result.get("winner_normalized_name")
        conn.execute(
            """
            insert into tennis_prediction_grades(
              slate_date, match_id, prediction_source, pick_name, actual_winner_name,
              result_status, hit, confidence, volatility, raw_json
            )
            values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            on conflict(slate_date, match_id, prediction_source) do update set
              pick_name=excluded.pick_name,
              actual_winner_name=excluded.actual_winner_name,
              result_status=excluded.result_status,
              hit=excluded.hit,
              confidence=excluded.confidence,
              volatility=excluded.volatility,
              raw_json=excluded.raw_json,
              updated_at=current_timestamp
            """,
            (
                slate_date,
                prediction["match_id"],
                prediction["prediction_source"],
                prediction.get("pick_name"),
                result.get("winner_name"),
                result.get("status"),
                bool_int(hit),
                prediction.get("confidence"),
                prediction.get("volatility"),
                dumps({"prediction": prediction, "result": result}),
            ),
        )
        counts["graded"] += 1
        if hit:
            counts["hits"] += 1
        else:
            counts["misses"] += 1
            misses.append(
                {
                    "match_id": prediction["match_id"],
                    "pick": prediction.get("pick_name"),
                    "winner": result.get("winner_name"),
                    "status": result.get("status"),
                    "confidence": prediction.get("confidence"),
                    "volatility": prediction.get("volatility"),
                }
            )
    conn.commit()
    counts["hit_rate"] = round(counts["hits"] / counts["graded"], 3) if counts["graded"] else None
    return {"counts": counts, "misses": misses}


def print_summary(conn: sqlite3.Connection) -> None:
    queries = {
        "tennis_rankings": "select count(*) as count from tennis_rankings",
        "tennis_matches": "select slate_date, count(*) as count from tennis_matches group by slate_date order by slate_date",
        "tennis_h2h_snapshots": "select status, count(*) as count from tennis_h2h_snapshots group by status",
        "tennis_player_match_context": "select count(*) as count from tennis_player_match_context",
        "tennis_recent_matches": "select count(*) as count from tennis_recent_matches",
        "tennis_flashscore_stat_rows": "select count(*) as count from tennis_flashscore_stat_rows",
        "tennis_flashscore_player_stat_rows": "select count(*) as count from tennis_flashscore_player_stat_rows",
        "tennis_sofascore_matches": "select slate_date, count(*) as count from tennis_sofascore_matches group by slate_date order by slate_date",
        "tennis_sofascore_stat_rows": "select count(*) as count from tennis_sofascore_stat_rows",
        "tennis_sofascore_player_stat_rows": "select count(*) as count from tennis_sofascore_player_stat_rows",
        "tennis_sofascore_player_page_stats": "select as_of_date, surface, count(*) as count from tennis_sofascore_player_page_stats group by as_of_date, surface order by as_of_date, surface",
        "tennis_match_results": "select slate_date, count(*) as count from tennis_match_results group by slate_date order by slate_date",
        "tennis_prediction_grades": "select slate_date, hit, count(*) as count from tennis_prediction_grades group by slate_date, hit order by slate_date, hit",
    }
    for label, sql in queries.items():
        rows = [dict(row) for row in conn.execute(sql).fetchall()]
        print(f"{label}: {json.dumps(rows)}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Initialize and import tennis warehouse data.")
    subparsers = parser.add_subparsers(dest="command", required=True)

    subparsers.add_parser("init-db")

    migrate_parser = subparsers.add_parser("migrate")
    migrate_parser.add_argument("--version", default="TEN-W1")

    rankings_parser = subparsers.add_parser("import-rankings")
    rankings_parser.add_argument("--file", default=str(RANKINGS_PATH))

    slate_parser = subparsers.add_parser("import-slate")
    slate_parser.add_argument("--date", required=True)

    flashscore_parser = subparsers.add_parser("import-flashscore")
    flashscore_parser.add_argument("--dir", default=str(FLASHSCORE_DIR))

    sofascore_parser = subparsers.add_parser("import-sofascore")
    sofascore_parser.add_argument("--dir", default=str(SOFASCORE_DIR))

    sofascore_player_parser = subparsers.add_parser("import-sofascore-player-stats")
    sofascore_player_parser.add_argument("--date", default="")
    sofascore_player_parser.add_argument("--dir", default=str(SOFASCORE_PLAYER_STATS_DIR))

    results_parser = subparsers.add_parser("import-results")
    results_parser.add_argument("--date", required=True)
    results_parser.add_argument("--file", default="")

    grade_parser = subparsers.add_parser("grade")
    grade_parser.add_argument("--date", required=True)

    subparsers.add_parser("summary")

    args = parser.parse_args()
    conn = get_connection()
    init_db(conn)

    if args.command == "init-db":
        print(f"Initialized tennis warehouse tables in {DB_PATH}")
    elif args.command == "migrate":
        report = apply_tennis_migrations(conn, args.version)
        print(json.dumps(report, indent=2, sort_keys=True))
    elif args.command == "import-rankings":
        count = import_rankings(conn, Path(args.file))
        print(f"Imported {count} tennis ranking rows")
    elif args.command == "import-slate":
        counts = import_slate(conn, args.date)
        print(json.dumps(counts, indent=2, sort_keys=True))
    elif args.command == "import-flashscore":
        counts = import_flashscore(conn, Path(args.dir))
        print(json.dumps(counts, indent=2, sort_keys=True))
    elif args.command == "import-sofascore":
        counts = import_sofascore(conn, Path(args.dir))
        print(json.dumps(counts, indent=2, sort_keys=True))
    elif args.command == "import-sofascore-player-stats":
        counts = import_sofascore_player_page_stats(conn, Path(args.dir), args.date or None)
        print(json.dumps(counts, indent=2, sort_keys=True))
    elif args.command == "import-results":
        counts = import_results(conn, args.date, Path(args.file) if args.file else None)
        print(json.dumps(counts, indent=2, sort_keys=True))
    elif args.command == "grade":
        report = grade_predictions(conn, args.date)
        print(json.dumps(report, indent=2, sort_keys=True))
    elif args.command == "summary":
        print_summary(conn)


if __name__ == "__main__":
    main()
