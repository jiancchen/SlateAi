from __future__ import annotations

import sqlite3
from dataclasses import dataclass
from typing import Any

from .common import (
    MlbIdentityResolver,
    detail_json,
    fetch_legacy_rows,
    parse_legacy_json,
    stable_id,
    to_float,
    to_int,
    utc_now,
)


HITTER_SOURCE_TABLES = [
    "mlb_hitter_pitch_type_response_daily",
    "mlb_player_current_deviation_daily",
    "mlb_player_game_distribution_daily",
    "mlb_hitter_statcast_trend_snapshots",
    "mlb_hitter_classic_trend_snapshots",
    "mlb_hitter_opponent_context_snapshots",
    "mlb_hitter_state_snapshots",
    "mlb_hitter_statcast_game_logs",
]


@dataclass(frozen=True)
class ParsedRow:
    target_table: str
    source_table: str
    legacy_row_id: str
    values: dict[str, Any]


def ensure_hitter_schema(con: sqlite3.Connection) -> None:
    con.row_factory = sqlite3.Row
    con.executescript(
        """
        create table if not exists player_pitch_type_response_snapshots (
          pitch_type_response_snapshot_id text primary key,
          player_id text not null,
          team_id text,
          snapshot_date text,
          pitch_type text not null,
          sample_pitches integer,
          swing_rate real,
          whiff_rate real,
          chase_rate real,
          damage_rate real,
          hard_contact_rate real,
          expected_slugging real,
          take_pressure real,
          platoon_split_json text,
          source_json text,
          source_table text,
          source_pk text,
          source_detail_json text,
          created_at text not null,
          foreign key (player_id) references players(player_id),
          foreign key (team_id) references teams(team_id)
        );
        create index if not exists idx_pitch_type_response_player on player_pitch_type_response_snapshots (player_id, snapshot_date, pitch_type);

        create table if not exists player_current_deviation_snapshots (
          current_deviation_snapshot_id text primary key,
          player_id text not null,
          team_id text,
          snapshot_date text,
          player_type text,
          metric text not null,
          identity_value real,
          current_value real,
          current_deviation real,
          deviation_label text,
          approach_label text,
          confidence_weight real,
          role_pressure real,
          sample_size integer,
          details_json text,
          source_table text,
          source_pk text,
          source_detail_json text,
          created_at text not null,
          foreign key (player_id) references players(player_id),
          foreign key (team_id) references teams(team_id)
        );
        create index if not exists idx_current_deviation_player on player_current_deviation_snapshots (player_id, snapshot_date, metric);

        create table if not exists player_game_distribution_snapshots (
          game_distribution_snapshot_id text primary key,
          player_id text not null,
          team_id text,
          opponent_team_id text,
          game_id text,
          snapshot_date text,
          player_type text,
          metric text not null,
          distribution_mean real,
          distribution_p50 real,
          distribution_p75 real,
          distribution_p90 real,
          volatility_score real,
          lineup_role_adjustment real,
          matchup_adjustment real,
          park_weather_sun_adjustment real,
          details_json text,
          source_table text,
          source_pk text,
          source_detail_json text,
          created_at text not null,
          foreign key (player_id) references players(player_id),
          foreign key (team_id) references teams(team_id),
          foreign key (opponent_team_id) references teams(team_id),
          foreign key (game_id) references games(game_id)
        );
        create index if not exists idx_game_distribution_player on player_game_distribution_snapshots (player_id, snapshot_date, metric);
        create index if not exists idx_game_distribution_game on player_game_distribution_snapshots (game_id, player_id);

        create table if not exists player_statcast_snapshots (
          statcast_snapshot_id text primary key,
          player_id text not null,
          team_id text,
          snapshot_date text,
          games_sample_7 integer,
          games_sample_14 integer,
          games_sample_30 integer,
          pa_sample_7 integer,
          pa_sample_14 integer,
          pa_sample_30 integer,
          bbe_sample_7 integer,
          bbe_sample_14 integer,
          bbe_sample_30 integer,
          rolling_7_xba real,
          rolling_14_xba real,
          rolling_30_xba real,
          rolling_7_xslg real,
          rolling_14_xslg real,
          rolling_30_xslg real,
          rolling_7_xwoba real,
          rolling_14_xwoba real,
          rolling_30_xwoba real,
          rolling_7_barrel_pct real,
          rolling_14_barrel_pct real,
          rolling_30_barrel_pct real,
          rolling_7_hard_hit_pct real,
          rolling_14_hard_hit_pct real,
          rolling_30_hard_hit_pct real,
          rolling_7_sweet_spot_pct real,
          rolling_14_sweet_spot_pct real,
          rolling_30_sweet_spot_pct real,
          xwoba_trend_7_minus_30 real,
          barrel_trend_7_minus_30 real,
          hard_hit_trend_7_minus_30 real,
          sweet_spot_trend_7_minus_30 real,
          source_table text,
          source_pk text,
          source_detail_json text,
          created_at text not null,
          foreign key (player_id) references players(player_id),
          foreign key (team_id) references teams(team_id)
        );
        create index if not exists idx_statcast_snapshots_player on player_statcast_snapshots (player_id, snapshot_date);

        create table if not exists player_statcast_game_logs (
          statcast_game_log_id text primary key,
          player_id text not null,
          team_id text,
          opponent_team_id text,
          game_id text,
          game_date text,
          plate_appearances integer,
          at_bats integer,
          hits integer,
          singles integer,
          doubles integer,
          triples integer,
          home_runs integer,
          walks integer,
          strikeouts integer,
          batting_average real,
          slugging real,
          woba real,
          xba real,
          xobp real,
          xslg real,
          xwoba real,
          avg_bat_speed real,
          avg_swing_length real,
          avg_launch_speed real,
          avg_launch_angle real,
          batted_ball_events integer,
          hard_hit_events integer,
          hard_hit_percent real,
          barrels_total integer,
          barrel_bbe_percent real,
          barrel_pa_percent real,
          sweet_spot_events integer,
          sweet_spot_percent real,
          source_json text,
          source_table text,
          source_pk text,
          source_detail_json text,
          created_at text not null,
          foreign key (player_id) references players(player_id),
          foreign key (team_id) references teams(team_id),
          foreign key (opponent_team_id) references teams(team_id),
          foreign key (game_id) references games(game_id)
        );
        create index if not exists idx_statcast_game_logs_player on player_statcast_game_logs (player_id, game_date);
        create index if not exists idx_statcast_game_logs_game on player_statcast_game_logs (game_id, player_id);

        create table if not exists player_classic_stat_snapshots (
          classic_stat_snapshot_id text primary key,
          player_id text not null,
          team_id text,
          snapshot_date text,
          games_sample_last10 integer,
          pa_sample_last10 integer,
          batting_order_avg_last10 real,
          days_since_last_game integer,
          hits_per_pa_last10 real,
          hits_per_pa_last5_minus_last10 real,
          total_bases_per_pa_last10 real,
          total_bases_per_pa_last5_minus_last10 real,
          walk_rate_last10 real,
          strikeout_rate_last10 real,
          strikeout_rate_last5_minus_last10 real,
          whiff_rate_last10 real,
          multi_hit_games_last10 integer,
          multi_tb_games_last10 integer,
          home_run_games_last10 integer,
          source_table text,
          source_pk text,
          source_detail_json text,
          created_at text not null,
          foreign key (player_id) references players(player_id),
          foreign key (team_id) references teams(team_id)
        );
        create index if not exists idx_classic_stat_snapshots_player on player_classic_stat_snapshots (player_id, snapshot_date);

        create table if not exists player_opponent_context_snapshots (
          opponent_context_snapshot_id text primary key,
          player_id text not null,
          team_id text,
          snapshot_date text,
          games_sample_last10 integer,
          games_vs_winning_last10 integer,
          games_vs_positive_run_diff_last10 integer,
          pa_vs_winning_last10 integer,
          hits_per_pa_vs_winning_last10 real,
          total_bases_per_pa_vs_winning_last10 real,
          weighted_hits_per_pa_last10 real,
          weighted_total_bases_per_pa_last10 real,
          hits_per_pa_weight_delta_last10 real,
          total_bases_per_pa_weight_delta_last10 real,
          avg_opponent_win_pct_last5_last10 real,
          avg_opponent_run_diff_last5_last10 real,
          avg_opponent_run_diff_per_game_last10 real,
          source_table text,
          source_pk text,
          source_detail_json text,
          created_at text not null,
          foreign key (player_id) references players(player_id),
          foreign key (team_id) references teams(team_id)
        );
        create index if not exists idx_opponent_context_player on player_opponent_context_snapshots (player_id, snapshot_date);

        create table if not exists player_state_snapshots (
          player_state_snapshot_id text primary key,
          player_id text not null,
          team_id text,
          snapshot_date text,
          games_sample integer,
          batting_order_avg_last5 real,
          days_since_last_game integer,
          hits_per_pa_last5 real,
          total_bases_per_pa_last5 real,
          walk_rate_last5 real,
          strikeout_rate_last5 real,
          whiff_rate_last5 real,
          multi_hit_games_last5 integer,
          multi_tb_games_last5 integer,
          hit_streak_games integer,
          hitless_streak_games integer,
          home_run_streak_games integer,
          cold_streak_index real,
          heat_regression_index real,
          pressure_plate_index real,
          source_table text,
          source_pk text,
          source_detail_json text,
          created_at text not null,
          foreign key (player_id) references players(player_id),
          foreign key (team_id) references teams(team_id)
        );
        create index if not exists idx_player_state_snapshots_player on player_state_snapshots (player_id, snapshot_date);
        """
    )


def source_pk(row: sqlite3.Row) -> str:
    return str(row["source_pk"] or row["legacy_row_id"])


def player_id_from_payload(payload: dict[str, Any], resolver: MlbIdentityResolver) -> str | None:
    player_source_id = payload.get("hitter_id") or payload.get("player_id")
    player_name = payload.get("hitter_name") or payload.get("player_name")
    return resolver.player_id_by_mlb_id("mlb_hitter_features", player_source_id, player_name)


def team_id_from_payload(payload: dict[str, Any], resolver: MlbIdentityResolver) -> str | None:
    return resolver.team_id_by_name("mlb_hitter_features", payload.get("team_name"))


def parse_pitch_type_response(row: sqlite3.Row, payload: dict[str, Any], resolver: MlbIdentityResolver) -> ParsedRow | None:
    player_id = player_id_from_payload(payload, resolver)
    team_id = team_id_from_payload(payload, resolver)
    if not player_id:
        return unresolved(row, payload, resolver, "mlb_hitter_pitch_type", "Could not map hitter pitch-type response row to canonical player.")
    return ParsedRow(
        target_table="player_pitch_type_response_snapshots",
        source_table=row["source_table"],
        legacy_row_id=row["legacy_row_id"],
        values={
            "pitch_type_response_snapshot_id": stable_id("pitch-type-response", player_id, payload.get("snapshot_date"), payload.get("pitch_type"), source_pk(row)),
            "player_id": player_id,
            "team_id": team_id,
            "snapshot_date": payload.get("snapshot_date"),
            "pitch_type": str(payload.get("pitch_type") or "unknown"),
            "sample_pitches": to_int(payload.get("sample_pitches")),
            "swing_rate": to_float(payload.get("swing_rate")),
            "whiff_rate": to_float(payload.get("whiff_rate")),
            "chase_rate": to_float(payload.get("chase_rate")),
            "damage_rate": to_float(payload.get("damage_rate")),
            "hard_contact_rate": to_float(payload.get("hard_contact_rate")),
            "expected_slugging": to_float(payload.get("expected_slugging")),
            "take_pressure": to_float(payload.get("take_pressure")),
            "platoon_split_json": payload.get("platoon_split_json"),
            "source_json": payload.get("source_json"),
            "source_table": row["source_table"],
            "source_pk": source_pk(row),
            "source_detail_json": detail_json(payload),
            "created_at": utc_now(),
        },
    )


def parse_current_deviation(row: sqlite3.Row, payload: dict[str, Any], resolver: MlbIdentityResolver) -> ParsedRow | None:
    player_id = player_id_from_payload(payload, resolver)
    team_id = team_id_from_payload(payload, resolver)
    metric = payload.get("metric")
    if not player_id or not metric:
        return unresolved(row, payload, resolver, "mlb_hitter_current_deviation", "Could not map current deviation row to canonical player/metric.")
    return ParsedRow(
        target_table="player_current_deviation_snapshots",
        source_table=row["source_table"],
        legacy_row_id=row["legacy_row_id"],
        values={
            "current_deviation_snapshot_id": stable_id("current-deviation", player_id, payload.get("snapshot_date"), metric, source_pk(row)),
            "player_id": player_id,
            "team_id": team_id,
            "snapshot_date": payload.get("snapshot_date"),
            "player_type": payload.get("player_type"),
            "metric": str(metric),
            "identity_value": to_float(payload.get("identity_value")),
            "current_value": to_float(payload.get("current_value")),
            "current_deviation": to_float(payload.get("current_deviation")),
            "deviation_label": payload.get("deviation_label"),
            "approach_label": payload.get("approach_label"),
            "confidence_weight": to_float(payload.get("confidence_weight")),
            "role_pressure": to_float(payload.get("role_pressure")),
            "sample_size": to_int(payload.get("sample_size")),
            "details_json": payload.get("details_json"),
            "source_table": row["source_table"],
            "source_pk": source_pk(row),
            "source_detail_json": detail_json(payload),
            "created_at": utc_now(),
        },
    )


def parse_game_distribution(row: sqlite3.Row, payload: dict[str, Any], resolver: MlbIdentityResolver) -> ParsedRow | None:
    player_id = player_id_from_payload(payload, resolver)
    team_id = team_id_from_payload(payload, resolver)
    game_id = resolver.game_id_for_pk(payload.get("game_pk"))
    opponent_team_id = resolver.team_id_by_name("mlb_hitter_features", payload.get("opponent_team"))
    metric = payload.get("metric")
    if not player_id or not metric:
        return unresolved(row, payload, resolver, "mlb_hitter_game_distribution", "Could not map game distribution row to canonical player/metric.")
    return ParsedRow(
        target_table="player_game_distribution_snapshots",
        source_table=row["source_table"],
        legacy_row_id=row["legacy_row_id"],
        values={
            "game_distribution_snapshot_id": stable_id("game-distribution", player_id, game_id, payload.get("snapshot_date"), metric, source_pk(row)),
            "player_id": player_id,
            "team_id": team_id,
            "opponent_team_id": opponent_team_id,
            "game_id": game_id,
            "snapshot_date": payload.get("snapshot_date"),
            "player_type": payload.get("player_type"),
            "metric": str(metric),
            "distribution_mean": to_float(payload.get("distribution_mean")),
            "distribution_p50": to_float(payload.get("distribution_p50")),
            "distribution_p75": to_float(payload.get("distribution_p75")),
            "distribution_p90": to_float(payload.get("distribution_p90")),
            "volatility_score": to_float(payload.get("volatility_score")),
            "lineup_role_adjustment": to_float(payload.get("lineup_role_adjustment")),
            "matchup_adjustment": to_float(payload.get("matchup_adjustment")),
            "park_weather_sun_adjustment": to_float(payload.get("park_weather_sun_adjustment")),
            "details_json": payload.get("details_json"),
            "source_table": row["source_table"],
            "source_pk": source_pk(row),
            "source_detail_json": detail_json(payload),
            "created_at": utc_now(),
        },
    )


def parse_statcast_snapshot(row: sqlite3.Row, payload: dict[str, Any], resolver: MlbIdentityResolver) -> ParsedRow | None:
    player_id = player_id_from_payload(payload, resolver)
    team_id = team_id_from_payload(payload, resolver)
    if not player_id:
        return unresolved(row, payload, resolver, "mlb_hitter_statcast_snapshot", "Could not map Statcast trend row to canonical player.")
    fields = {
        field: to_float(payload.get(field))
        for field in [
            "rolling_7_xba",
            "rolling_14_xba",
            "rolling_30_xba",
            "rolling_7_xslg",
            "rolling_14_xslg",
            "rolling_30_xslg",
            "rolling_7_xwoba",
            "rolling_14_xwoba",
            "rolling_30_xwoba",
            "rolling_7_barrel_pct",
            "rolling_14_barrel_pct",
            "rolling_30_barrel_pct",
            "rolling_7_hard_hit_pct",
            "rolling_14_hard_hit_pct",
            "rolling_30_hard_hit_pct",
            "rolling_7_sweet_spot_pct",
            "rolling_14_sweet_spot_pct",
            "rolling_30_sweet_spot_pct",
            "xwoba_trend_7_minus_30",
            "barrel_trend_7_minus_30",
            "hard_hit_trend_7_minus_30",
            "sweet_spot_trend_7_minus_30",
        ]
    }
    fields.update(
        {
            "games_sample_7": to_int(payload.get("games_sample_7")),
            "games_sample_14": to_int(payload.get("games_sample_14")),
            "games_sample_30": to_int(payload.get("games_sample_30")),
            "pa_sample_7": to_int(payload.get("pa_sample_7")),
            "pa_sample_14": to_int(payload.get("pa_sample_14")),
            "pa_sample_30": to_int(payload.get("pa_sample_30")),
            "bbe_sample_7": to_int(payload.get("bbe_sample_7")),
            "bbe_sample_14": to_int(payload.get("bbe_sample_14")),
            "bbe_sample_30": to_int(payload.get("bbe_sample_30")),
        }
    )
    return ParsedRow(
        target_table="player_statcast_snapshots",
        source_table=row["source_table"],
        legacy_row_id=row["legacy_row_id"],
        values={
            "statcast_snapshot_id": stable_id("statcast-snapshot", player_id, payload.get("as_of_date"), source_pk(row)),
            "player_id": player_id,
            "team_id": team_id,
            "snapshot_date": payload.get("as_of_date"),
            **fields,
            "source_table": row["source_table"],
            "source_pk": source_pk(row),
            "source_detail_json": detail_json(payload),
            "created_at": utc_now(),
        },
    )


def parse_statcast_game_log(row: sqlite3.Row, payload: dict[str, Any], resolver: MlbIdentityResolver) -> ParsedRow | None:
    player_id = player_id_from_payload(payload, resolver)
    team_id = team_id_from_payload(payload, resolver)
    opponent_team_id = resolver.team_id_by_name("mlb_hitter_features", payload.get("opponent_name"))
    game_id = resolver.game_id_for_pk(payload.get("game_pk"))
    if not player_id:
        return unresolved(row, payload, resolver, "mlb_hitter_statcast_game_log", "Could not map Statcast game log row to canonical player.")
    return ParsedRow(
        target_table="player_statcast_game_logs",
        source_table=row["source_table"],
        legacy_row_id=row["legacy_row_id"],
        values={
            "statcast_game_log_id": stable_id("statcast-game-log", player_id, game_id, payload.get("game_date"), source_pk(row)),
            "player_id": player_id,
            "team_id": team_id,
            "opponent_team_id": opponent_team_id,
            "game_id": game_id,
            "game_date": payload.get("game_date"),
            "plate_appearances": to_int(payload.get("plate_appearances")),
            "at_bats": to_int(payload.get("at_bats")),
            "hits": to_int(payload.get("hits")),
            "singles": to_int(payload.get("singles")),
            "doubles": to_int(payload.get("doubles")),
            "triples": to_int(payload.get("triples")),
            "home_runs": to_int(payload.get("home_runs")),
            "walks": to_int(payload.get("walks")),
            "strikeouts": to_int(payload.get("strikeouts")),
            "batting_average": to_float(payload.get("batting_average")),
            "slugging": to_float(payload.get("slugging")),
            "woba": to_float(payload.get("woba")),
            "xba": to_float(payload.get("xba")),
            "xobp": to_float(payload.get("xobp")),
            "xslg": to_float(payload.get("xslg")),
            "xwoba": to_float(payload.get("xwoba")),
            "avg_bat_speed": to_float(payload.get("avg_bat_speed")),
            "avg_swing_length": to_float(payload.get("avg_swing_length")),
            "avg_launch_speed": to_float(payload.get("avg_launch_speed")),
            "avg_launch_angle": to_float(payload.get("avg_launch_angle")),
            "batted_ball_events": to_int(payload.get("batted_ball_events")),
            "hard_hit_events": to_int(payload.get("hard_hit_events")),
            "hard_hit_percent": to_float(payload.get("hard_hit_percent")),
            "barrels_total": to_int(payload.get("barrels_total")),
            "barrel_bbe_percent": to_float(payload.get("barrel_bbe_percent")),
            "barrel_pa_percent": to_float(payload.get("barrel_pa_percent")),
            "sweet_spot_events": to_int(payload.get("sweet_spot_events")),
            "sweet_spot_percent": to_float(payload.get("sweet_spot_percent")),
            "source_json": payload.get("source_json"),
            "source_table": row["source_table"],
            "source_pk": source_pk(row),
            "source_detail_json": detail_json(payload),
            "created_at": utc_now(),
        },
    )


def parse_classic_snapshot(row: sqlite3.Row, payload: dict[str, Any], resolver: MlbIdentityResolver) -> ParsedRow | None:
    player_id = player_id_from_payload(payload, resolver)
    team_id = team_id_from_payload(payload, resolver)
    if not player_id:
        return unresolved(row, payload, resolver, "mlb_hitter_classic", "Could not map classic hitter row to canonical player.")
    return ParsedRow(
        target_table="player_classic_stat_snapshots",
        source_table=row["source_table"],
        legacy_row_id=row["legacy_row_id"],
        values={
            "classic_stat_snapshot_id": stable_id("classic-stat", player_id, payload.get("as_of_date"), source_pk(row)),
            "player_id": player_id,
            "team_id": team_id,
            "snapshot_date": payload.get("as_of_date"),
            "games_sample_last10": to_int(payload.get("games_sample_last10")),
            "pa_sample_last10": to_int(payload.get("pa_sample_last10")),
            "batting_order_avg_last10": to_float(payload.get("batting_order_avg_last10")),
            "days_since_last_game": to_int(payload.get("days_since_last_game")),
            "hits_per_pa_last10": to_float(payload.get("hits_per_pa_last10")),
            "hits_per_pa_last5_minus_last10": to_float(payload.get("hits_per_pa_last5_minus_last10")),
            "total_bases_per_pa_last10": to_float(payload.get("total_bases_per_pa_last10")),
            "total_bases_per_pa_last5_minus_last10": to_float(payload.get("total_bases_per_pa_last5_minus_last10")),
            "walk_rate_last10": to_float(payload.get("walk_rate_last10")),
            "strikeout_rate_last10": to_float(payload.get("strikeout_rate_last10")),
            "strikeout_rate_last5_minus_last10": to_float(payload.get("strikeout_rate_last5_minus_last10")),
            "whiff_rate_last10": to_float(payload.get("whiff_rate_last10")),
            "multi_hit_games_last10": to_int(payload.get("multi_hit_games_last10")),
            "multi_tb_games_last10": to_int(payload.get("multi_tb_games_last10")),
            "home_run_games_last10": to_int(payload.get("home_run_games_last10")),
            "source_table": row["source_table"],
            "source_pk": source_pk(row),
            "source_detail_json": detail_json(payload),
            "created_at": utc_now(),
        },
    )


def parse_opponent_context(row: sqlite3.Row, payload: dict[str, Any], resolver: MlbIdentityResolver) -> ParsedRow | None:
    player_id = player_id_from_payload(payload, resolver)
    team_id = team_id_from_payload(payload, resolver)
    if not player_id:
        return unresolved(row, payload, resolver, "mlb_hitter_opponent_context", "Could not map opponent context row to canonical player.")
    return ParsedRow(
        target_table="player_opponent_context_snapshots",
        source_table=row["source_table"],
        legacy_row_id=row["legacy_row_id"],
        values={
            "opponent_context_snapshot_id": stable_id("opponent-context", player_id, payload.get("as_of_date"), source_pk(row)),
            "player_id": player_id,
            "team_id": team_id,
            "snapshot_date": payload.get("as_of_date"),
            "games_sample_last10": to_int(payload.get("games_sample_last10")),
            "games_vs_winning_last10": to_int(payload.get("games_vs_winning_last10")),
            "games_vs_positive_run_diff_last10": to_int(payload.get("games_vs_positive_run_diff_last10")),
            "pa_vs_winning_last10": to_int(payload.get("pa_vs_winning_last10")),
            "hits_per_pa_vs_winning_last10": to_float(payload.get("hits_per_pa_vs_winning_last10")),
            "total_bases_per_pa_vs_winning_last10": to_float(payload.get("total_bases_per_pa_vs_winning_last10")),
            "weighted_hits_per_pa_last10": to_float(payload.get("weighted_hits_per_pa_last10")),
            "weighted_total_bases_per_pa_last10": to_float(payload.get("weighted_total_bases_per_pa_last10")),
            "hits_per_pa_weight_delta_last10": to_float(payload.get("hits_per_pa_weight_delta_last10")),
            "total_bases_per_pa_weight_delta_last10": to_float(payload.get("total_bases_per_pa_weight_delta_last10")),
            "avg_opponent_win_pct_last5_last10": to_float(payload.get("avg_opponent_win_pct_last5_last10")),
            "avg_opponent_run_diff_last5_last10": to_float(payload.get("avg_opponent_run_diff_last5_last10")),
            "avg_opponent_run_diff_per_game_last10": to_float(payload.get("avg_opponent_run_diff_per_game_last10")),
            "source_table": row["source_table"],
            "source_pk": source_pk(row),
            "source_detail_json": detail_json(payload),
            "created_at": utc_now(),
        },
    )


def parse_state_snapshot(row: sqlite3.Row, payload: dict[str, Any], resolver: MlbIdentityResolver) -> ParsedRow | None:
    player_id = player_id_from_payload(payload, resolver)
    team_id = team_id_from_payload(payload, resolver)
    if not player_id:
        return unresolved(row, payload, resolver, "mlb_hitter_state", "Could not map hitter state row to canonical player.")
    return ParsedRow(
        target_table="player_state_snapshots",
        source_table=row["source_table"],
        legacy_row_id=row["legacy_row_id"],
        values={
            "player_state_snapshot_id": stable_id("player-state", player_id, payload.get("as_of_date"), source_pk(row)),
            "player_id": player_id,
            "team_id": team_id,
            "snapshot_date": payload.get("as_of_date"),
            "games_sample": to_int(payload.get("games_sample")),
            "batting_order_avg_last5": to_float(payload.get("batting_order_avg_last5")),
            "days_since_last_game": to_int(payload.get("days_since_last_game")),
            "hits_per_pa_last5": to_float(payload.get("hits_per_pa_last5")),
            "total_bases_per_pa_last5": to_float(payload.get("total_bases_per_pa_last5")),
            "walk_rate_last5": to_float(payload.get("walk_rate_last5")),
            "strikeout_rate_last5": to_float(payload.get("strikeout_rate_last5")),
            "whiff_rate_last5": to_float(payload.get("whiff_rate_last5")),
            "multi_hit_games_last5": to_int(payload.get("multi_hit_games_last5")),
            "multi_tb_games_last5": to_int(payload.get("multi_tb_games_last5")),
            "hit_streak_games": to_int(payload.get("hit_streak_games")),
            "hitless_streak_games": to_int(payload.get("hitless_streak_games")),
            "home_run_streak_games": to_int(payload.get("home_run_streak_games")),
            "cold_streak_index": to_float(payload.get("cold_streak_index")),
            "heat_regression_index": to_float(payload.get("heat_regression_index")),
            "pressure_plate_index": to_float(payload.get("pressure_plate_index")),
            "source_table": row["source_table"],
            "source_pk": source_pk(row),
            "source_detail_json": detail_json(payload),
            "created_at": utc_now(),
        },
    )


def unresolved(
    row: sqlite3.Row,
    payload: dict[str, Any],
    resolver: MlbIdentityResolver,
    entity_type: str,
    reason: str,
) -> None:
    resolver.insert_unresolved(
        entity_type,
        "mlb_hitter_features",
        payload.get("hitter_id") or payload.get("player_id"),
        payload.get("hitter_name") or payload.get("player_name") or "unknown hitter",
        {"legacy_row_id": row["legacy_row_id"], "source_table": row["source_table"], "payload": payload},
        reason,
    )
    return None


def parse_hitter_rows(
    con: sqlite3.Connection,
    resolver: MlbIdentityResolver,
    date: str | None = None,
) -> tuple[list[ParsedRow], dict[str, Any]]:
    parsed: list[ParsedRow] = []
    counts: dict[str, Any] = {
        "source_rows": 0,
        "parsed_rows": 0,
        "unparsed_rows": 0,
        "source_tables": {},
        "targets": {},
    }
    for row in fetch_legacy_rows(con, HITTER_SOURCE_TABLES, date=date):
        counts["source_rows"] += 1
        counts["source_tables"][row["source_table"]] = counts["source_tables"].get(row["source_table"], 0) + 1
        payload = parse_legacy_json(row)
        parsed_row = None
        if row["source_table"] == "mlb_hitter_pitch_type_response_daily":
            parsed_row = parse_pitch_type_response(row, payload, resolver)
        elif row["source_table"] == "mlb_player_current_deviation_daily":
            parsed_row = parse_current_deviation(row, payload, resolver)
        elif row["source_table"] == "mlb_player_game_distribution_daily":
            parsed_row = parse_game_distribution(row, payload, resolver)
        elif row["source_table"] == "mlb_hitter_statcast_trend_snapshots":
            parsed_row = parse_statcast_snapshot(row, payload, resolver)
        elif row["source_table"] == "mlb_hitter_statcast_game_logs":
            parsed_row = parse_statcast_game_log(row, payload, resolver)
        elif row["source_table"] == "mlb_hitter_classic_trend_snapshots":
            parsed_row = parse_classic_snapshot(row, payload, resolver)
        elif row["source_table"] == "mlb_hitter_opponent_context_snapshots":
            parsed_row = parse_opponent_context(row, payload, resolver)
        elif row["source_table"] == "mlb_hitter_state_snapshots":
            parsed_row = parse_state_snapshot(row, payload, resolver)
        if parsed_row is None:
            counts["unparsed_rows"] += 1
            continue
        parsed.append(parsed_row)
        counts["targets"][parsed_row.target_table] = counts["targets"].get(parsed_row.target_table, 0) + 1
    counts["parsed_rows"] = len(parsed)
    return parsed, counts


def insert_rows(con: sqlite3.Connection, rows: list[ParsedRow]) -> dict[str, int]:
    inserted: dict[str, int] = {}
    for row in rows:
        columns = list(row.values.keys())
        placeholders = ",".join("?" for _ in columns)
        update_columns = columns[1:]
        set_clause = ", ".join(f"{column} = excluded.{column}" for column in update_columns)
        sql = f"""
            insert into {row.target_table} ({", ".join(columns)})
            values ({placeholders})
            on conflict({columns[0]}) do update set {set_clause}
        """
        con.execute(sql, [row.values[column] for column in columns])
        inserted[row.target_table] = inserted.get(row.target_table, 0) + 1
    return inserted


def normalize_hitter_features(con: sqlite3.Connection, date: str | None = None, dry_run: bool = False) -> dict[str, Any]:
    con.row_factory = sqlite3.Row
    ensure_hitter_schema(con)
    resolver = MlbIdentityResolver(con)
    before_unresolved = con.execute("select count(*) from unresolved_entities").fetchone()[0]
    rows, counts = parse_hitter_rows(con, resolver, date=date)
    report = {
        "family": "mlb_hitter_features",
        "date": date,
        "dry_run": dry_run,
        **counts,
        "inserted": {},
        "unresolved_rows_added": 0,
    }
    if not dry_run:
        report["inserted"] = insert_rows(con, rows)
        con.commit()
    after_unresolved = con.execute("select count(*) from unresolved_entities").fetchone()[0]
    report["unresolved_rows_added"] = after_unresolved - before_unresolved
    if dry_run:
        con.rollback()
    return report
