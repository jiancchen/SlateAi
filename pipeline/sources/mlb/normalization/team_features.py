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


TEAM_SOURCE_TABLES = [
    "mlb_team_first_inning_profiles_daily",
    "mlb_team_mistake_shape_daily",
    "mlb_team_rolling_form",
    "mlb_team_lead_surrender_profiles",
    "mlb_team_whiff_persistence_profiles",
    "mlb_team_form_carryover_profiles",
    "mlb_team_opponent_quality_daily",
    "mlb_team_state_snapshots",
]


@dataclass(frozen=True)
class ParsedRow:
    target_table: str
    source_table: str
    legacy_row_id: str
    values: dict[str, Any]


COMMON_PREFIX = """
  {id_column} text primary key,
  team_id text not null,
  opponent_team_id text,
  snapshot_date text,
  window_games integer,
  games_sample integer,
  scheduled_series_game_number integer,
  division_matchup_flag integer,
"""


COMMON_SUFFIX = """
  source_table text,
  source_pk text,
  source_detail_json text,
  created_at text not null,
  foreign key (team_id) references teams(team_id),
  foreign key (opponent_team_id) references teams(team_id)
"""


def ensure_team_schema(con: sqlite3.Connection) -> None:
    con.row_factory = sqlite3.Row
    con.executescript(
        f"""
        create table if not exists team_first_inning_profiles (
          {COMMON_PREFIX.format(id_column="team_first_inning_profile_id")}
          road_games_sample integer,
          scored_first_inning_rate real,
          allowed_first_inning_rate real,
          scoreless_first_inning_rate real,
          yrfi_game_rate real,
          nrfi_game_rate real,
          first_inning_runs_per_game real,
          first_inning_runs_allowed_per_game real,
          first_inning_multi_run_rate real,
          first_inning_multi_run_allowed_rate real,
          first_inning_net_edge real,
          first_inning_scoring_index real,
          first_inning_allow_risk_index real,
          {COMMON_SUFFIX}
        );
        create index if not exists idx_team_first_inning_profiles on team_first_inning_profiles (team_id, snapshot_date, window_games);

        create table if not exists team_mistake_shape_snapshots (
          {COMMON_PREFIX.format(id_column="team_mistake_shape_snapshot_id")}
          road_games_sample integer,
          mistake_chaos_index real,
          run_clustering_index real,
          traffic_game_rate real,
          traffic_no_conversion_rate real,
          top_order_pressure_no_conversion_rate real,
          dead_bat_traffic_rate real,
          stranded_traffic_rate real,
          base_runner_conversion_rate real,
          one_big_inning_rate real,
          one_bad_inning_allowed_rate real,
          early_multi_run_allowed_rate real,
          first_inning_run_allowed_rate real,
          scoreless_first3_rate real,
          high_scoring_game_rate real,
          low_scoring_game_rate real,
          bullpen_meltdown_rate real,
          {COMMON_SUFFIX}
        );
        create index if not exists idx_team_mistake_shape on team_mistake_shape_snapshots (team_id, snapshot_date, window_games);

        create table if not exists team_rolling_form_snapshots (
          team_rolling_form_snapshot_id text primary key,
          team_id text not null,
          snapshot_date text,
          window_games integer,
          games_sample integer,
          wins integer,
          losses integer,
          runs_scored_per_game real,
          runs_allowed_per_game real,
          run_diff_per_game real,
          first5_runs_scored_per_game real,
          first5_runs_allowed_per_game real,
          first5_run_diff_per_game real,
          bullpen_runs_scored_per_game real,
          bullpen_runs_allowed_per_game real,
          hits_per_game real,
          hits_allowed_per_game real,
          hit_efficiency real,
          home_runs_per_game real,
          home_runs_allowed_per_game real,
          home_run_burstiness real,
          scoring_volatility real,
          recent_3_runs_delta real,
          recent_3_home_runs_delta real,
          source_table text,
          source_pk text,
          source_detail_json text,
          created_at text not null,
          foreign key (team_id) references teams(team_id)
        );
        create index if not exists idx_team_rolling_form on team_rolling_form_snapshots (team_id, snapshot_date, window_games);

        create table if not exists team_lead_surrender_profiles (
          team_lead_surrender_profile_id text primary key,
          team_id text not null,
          snapshot_date text,
          window_games integer,
          games_sample integer,
          led_after5_rate real,
          led_after7_rate real,
          trailed_after5_rate real,
          trailed_after7_rate real,
          lead_after5_conversion_rate real,
          lead_after7_conversion_rate real,
          blew_lead_after5_rate real,
          blew_lead_after7_rate real,
          comeback_after5_rate real,
          comeback_after7_rate real,
          one_run_lead_hold_rate real,
          avg_runs_allowed_after_leading5 real,
          avg_runs_scored_when_trailing5 real,
          lead_surrender_index real,
          comeback_resilience_index real,
          source_table text,
          source_pk text,
          source_detail_json text,
          created_at text not null,
          foreign key (team_id) references teams(team_id)
        );
        create index if not exists idx_team_lead_surrender on team_lead_surrender_profiles (team_id, snapshot_date, window_games);

        create table if not exists team_whiff_persistence_profiles (
          team_whiff_persistence_profile_id text primary key,
          team_id text not null,
          snapshot_date text,
          window_games integer,
          games_sample integer,
          games_with_early_whiff_flag integer,
          early_two_inning_pa_per_game real,
          early_two_inning_strikeout_rate real,
          early_two_inning_whiff_rate real,
          early_whiff_flag_rate real,
          early_whiff_persist_rate real,
          early_whiff_rebound_rate real,
          avg_rest_of_game_hits_after_whiff real,
          avg_rest_of_game_hits_without_whiff real,
          avg_rest_of_game_runs_after_whiff real,
          avg_rest_of_game_runs_without_whiff real,
          avg_rest_of_game_strikeout_rate_after_whiff real,
          whiff_persistence_index real,
          whiff_rebound_index real,
          source_table text,
          source_pk text,
          source_detail_json text,
          created_at text not null,
          foreign key (team_id) references teams(team_id)
        );
        create index if not exists idx_team_whiff_persistence on team_whiff_persistence_profiles (team_id, snapshot_date, window_games);

        create table if not exists team_form_carryover_profiles (
          team_form_carryover_profile_id text primary key,
          team_id text not null,
          snapshot_date text,
          window_games integer,
          transitions_sample integer,
          after_loss_bounce_rate real,
          after_win_next_win_rate real,
          after_blowout_loss_bounce_rate real,
          after_blowout_win_next_win_rate real,
          after_bullpen_flip_loss_bounce_rate real,
          after_comeback_win_next_win_rate real,
          avg_next_game_run_diff_after_loss real,
          avg_next_game_run_diff_after_win real,
          cold_streak_bounce_rate real,
          cold_streak_continue_rate real,
          hot_streak_break_rate real,
          hot_streak_hold_rate real,
          series_game2_win_rate real,
          series_game3plus_win_rate real,
          bounceback_index real,
          carryover_instability_index real,
          source_table text,
          source_pk text,
          source_detail_json text,
          created_at text not null,
          foreign key (team_id) references teams(team_id)
        );
        create index if not exists idx_team_form_carryover on team_form_carryover_profiles (team_id, snapshot_date, window_games);

        create table if not exists team_opponent_quality_snapshots (
          team_opponent_quality_snapshot_id text primary key,
          team_id text not null,
          opponent_team_id text,
          snapshot_date text,
          games_sample_last5 integer,
          games_sample_last10 integer,
          games_vs_winning_record_last5 integer,
          games_vs_winning_record_last10 integer,
          games_vs_550_last5 integer,
          games_vs_550_last10 integer,
          close_losses_vs_winning_record_last10 integer,
          win_rate_vs_winning_record_last10 real,
          win_rate_vs_550_last10 real,
          avg_opponent_season_win_pct_last5 real,
          avg_opponent_season_win_pct_last10 real,
          avg_opponent_recent10_win_pct_last5 real,
          avg_opponent_recent10_win_pct_last10 real,
          avg_opponent_recent10_run_diff_last5 real,
          avg_opponent_recent10_run_diff_last10 real,
          schedule_toughness_index_last5 real,
          schedule_toughness_index_last10 real,
          source_table text,
          source_pk text,
          source_detail_json text,
          created_at text not null,
          foreign key (team_id) references teams(team_id),
          foreign key (opponent_team_id) references teams(team_id)
        );
        create index if not exists idx_team_opponent_quality on team_opponent_quality_snapshots (team_id, snapshot_date);

        create table if not exists team_state_snapshots (
          team_state_snapshot_id text primary key,
          team_id text not null,
          opponent_team_id text,
          snapshot_date text,
          games_sample integer,
          scheduled_series_game_number integer,
          division_matchup_flag integer,
          previous_result text,
          streak_direction text,
          streak_length integer,
          win_pct_last3 real,
          win_pct_last5 real,
          run_diff_last3 real,
          run_diff_last5 real,
          opponent_win_pct_last5 real,
          blowout_loss_count_last5 integer,
          blowout_win_count_last5 integer,
          bullpen_flip_loss_count_last5 integer,
          close_loss_count_last5 integer,
          comeback_win_count_last5 integer,
          first_inning_jolt_count_last5 integer,
          quiet_first5_count_last5 integer,
          form_pressure_index real,
          heat_regression_index real,
          snapback_pressure_index real,
          source_table text,
          source_pk text,
          source_detail_json text,
          created_at text not null,
          foreign key (team_id) references teams(team_id),
          foreign key (opponent_team_id) references teams(team_id)
        );
        create index if not exists idx_team_state on team_state_snapshots (team_id, snapshot_date);
        """
    )


def source_pk(row: sqlite3.Row) -> str:
    return str(row["source_pk"] or row["legacy_row_id"])


def team_id(payload: dict[str, Any], resolver: MlbIdentityResolver) -> str | None:
    return resolver.team_id_by_name("mlb_team_features", payload.get("team_name"))


def opponent_team_id(payload: dict[str, Any], resolver: MlbIdentityResolver) -> str | None:
    return resolver.team_id_by_name("mlb_team_features", payload.get("scheduled_opponent"))


def unresolved(row: sqlite3.Row, payload: dict[str, Any], resolver: MlbIdentityResolver, reason: str) -> None:
    resolver.insert_unresolved(
        "mlb_team_feature",
        "mlb_team_features",
        payload.get("team_name"),
        payload.get("team_name") or "unknown team",
        {"legacy_row_id": row["legacy_row_id"], "source_table": row["source_table"], "payload": payload},
        reason,
    )
    return None


INT_FIELDS = {
    "window_games",
    "games_sample",
    "road_games_sample",
    "scheduled_series_game_number",
    "division_matchup_flag",
    "wins",
    "losses",
    "games_with_early_whiff_flag",
    "transitions_sample",
    "games_sample_last5",
    "games_sample_last10",
    "games_vs_winning_record_last5",
    "games_vs_winning_record_last10",
    "games_vs_550_last5",
    "games_vs_550_last10",
    "close_losses_vs_winning_record_last10",
    "streak_length",
    "blowout_loss_count_last5",
    "blowout_win_count_last5",
    "bullpen_flip_loss_count_last5",
    "close_loss_count_last5",
    "comeback_win_count_last5",
    "first_inning_jolt_count_last5",
    "quiet_first5_count_last5",
}


TEXT_FIELDS = {"previous_result", "streak_direction"}


SPECS: dict[str, dict[str, Any]] = {
    "mlb_team_first_inning_profiles_daily": {
        "target": "team_first_inning_profiles",
        "id": "team_first_inning_profile_id",
        "prefix": "team-first-inning",
        "fields": [
            "window_games", "games_sample", "scheduled_series_game_number", "division_matchup_flag",
            "road_games_sample", "scored_first_inning_rate", "allowed_first_inning_rate",
            "scoreless_first_inning_rate", "yrfi_game_rate", "nrfi_game_rate",
            "first_inning_runs_per_game", "first_inning_runs_allowed_per_game",
            "first_inning_multi_run_rate", "first_inning_multi_run_allowed_rate",
            "first_inning_net_edge", "first_inning_scoring_index", "first_inning_allow_risk_index",
        ],
    },
    "mlb_team_mistake_shape_daily": {
        "target": "team_mistake_shape_snapshots",
        "id": "team_mistake_shape_snapshot_id",
        "prefix": "team-mistake-shape",
        "fields": [
            "window_games", "games_sample", "scheduled_series_game_number", "division_matchup_flag",
            "road_games_sample", "mistake_chaos_index", "run_clustering_index", "traffic_game_rate",
            "traffic_no_conversion_rate", "top_order_pressure_no_conversion_rate", "dead_bat_traffic_rate",
            "stranded_traffic_rate", "base_runner_conversion_rate", "one_big_inning_rate",
            "one_bad_inning_allowed_rate", "early_multi_run_allowed_rate", "first_inning_run_allowed_rate",
            "scoreless_first3_rate", "high_scoring_game_rate", "low_scoring_game_rate", "bullpen_meltdown_rate",
        ],
    },
    "mlb_team_rolling_form": {
        "target": "team_rolling_form_snapshots",
        "id": "team_rolling_form_snapshot_id",
        "prefix": "team-rolling-form",
        "fields": [
            "window_games", "games_sample", "wins", "losses", "runs_scored_per_game",
            "runs_allowed_per_game", "run_diff_per_game", "first5_runs_scored_per_game",
            "first5_runs_allowed_per_game", "first5_run_diff_per_game", "bullpen_runs_scored_per_game",
            "bullpen_runs_allowed_per_game", "hits_per_game", "hits_allowed_per_game", "hit_efficiency",
            "home_runs_per_game", "home_runs_allowed_per_game", "home_run_burstiness", "scoring_volatility",
            "recent_3_runs_delta", "recent_3_home_runs_delta",
        ],
        "opponent": False,
    },
    "mlb_team_lead_surrender_profiles": {
        "target": "team_lead_surrender_profiles",
        "id": "team_lead_surrender_profile_id",
        "prefix": "team-lead-surrender",
        "fields": [
            "window_games", "games_sample", "led_after5_rate", "led_after7_rate", "trailed_after5_rate",
            "trailed_after7_rate", "lead_after5_conversion_rate", "lead_after7_conversion_rate",
            "blew_lead_after5_rate", "blew_lead_after7_rate", "comeback_after5_rate", "comeback_after7_rate",
            "one_run_lead_hold_rate", "avg_runs_allowed_after_leading5", "avg_runs_scored_when_trailing5",
            "lead_surrender_index", "comeback_resilience_index",
        ],
        "opponent": False,
    },
    "mlb_team_whiff_persistence_profiles": {
        "target": "team_whiff_persistence_profiles",
        "id": "team_whiff_persistence_profile_id",
        "prefix": "team-whiff-persistence",
        "fields": [
            "window_games", "games_sample", "games_with_early_whiff_flag", "early_two_inning_pa_per_game",
            "early_two_inning_strikeout_rate", "early_two_inning_whiff_rate", "early_whiff_flag_rate",
            "early_whiff_persist_rate", "early_whiff_rebound_rate", "avg_rest_of_game_hits_after_whiff",
            "avg_rest_of_game_hits_without_whiff", "avg_rest_of_game_runs_after_whiff",
            "avg_rest_of_game_runs_without_whiff", "avg_rest_of_game_strikeout_rate_after_whiff",
            "whiff_persistence_index", "whiff_rebound_index",
        ],
        "opponent": False,
    },
    "mlb_team_form_carryover_profiles": {
        "target": "team_form_carryover_profiles",
        "id": "team_form_carryover_profile_id",
        "prefix": "team-form-carryover",
        "fields": [
            "window_games", "transitions_sample", "after_loss_bounce_rate", "after_win_next_win_rate",
            "after_blowout_loss_bounce_rate", "after_blowout_win_next_win_rate",
            "after_bullpen_flip_loss_bounce_rate", "after_comeback_win_next_win_rate",
            "avg_next_game_run_diff_after_loss", "avg_next_game_run_diff_after_win",
            "cold_streak_bounce_rate", "cold_streak_continue_rate", "hot_streak_break_rate",
            "hot_streak_hold_rate", "series_game2_win_rate", "series_game3plus_win_rate",
            "bounceback_index", "carryover_instability_index",
        ],
        "opponent": False,
    },
    "mlb_team_opponent_quality_daily": {
        "target": "team_opponent_quality_snapshots",
        "id": "team_opponent_quality_snapshot_id",
        "prefix": "team-opponent-quality",
        "fields": [
            "games_sample_last5", "games_sample_last10", "games_vs_winning_record_last5",
            "games_vs_winning_record_last10", "games_vs_550_last5", "games_vs_550_last10",
            "close_losses_vs_winning_record_last10", "win_rate_vs_winning_record_last10",
            "win_rate_vs_550_last10", "avg_opponent_season_win_pct_last5",
            "avg_opponent_season_win_pct_last10", "avg_opponent_recent10_win_pct_last5",
            "avg_opponent_recent10_win_pct_last10", "avg_opponent_recent10_run_diff_last5",
            "avg_opponent_recent10_run_diff_last10", "schedule_toughness_index_last5",
            "schedule_toughness_index_last10",
        ],
    },
    "mlb_team_state_snapshots": {
        "target": "team_state_snapshots",
        "id": "team_state_snapshot_id",
        "prefix": "team-state",
        "fields": [
            "games_sample", "scheduled_series_game_number", "division_matchup_flag", "previous_result",
            "streak_direction", "streak_length", "win_pct_last3", "win_pct_last5", "run_diff_last3",
            "run_diff_last5", "opponent_win_pct_last5", "blowout_loss_count_last5",
            "blowout_win_count_last5", "bullpen_flip_loss_count_last5", "close_loss_count_last5",
            "comeback_win_count_last5", "first_inning_jolt_count_last5", "quiet_first5_count_last5",
            "form_pressure_index", "heat_regression_index", "snapback_pressure_index",
        ],
    },
}


def parse_team_feature(row: sqlite3.Row, payload: dict[str, Any], resolver: MlbIdentityResolver) -> ParsedRow | None:
    spec = SPECS[row["source_table"]]
    canonical_team_id = team_id(payload, resolver)
    if not canonical_team_id:
        return unresolved(row, payload, resolver, "Could not map team feature row to canonical team.")
    values = {
        spec["id"]: stable_id(spec["prefix"], canonical_team_id, payload.get("as_of_date"), payload.get("window_games"), source_pk(row)),
        "team_id": canonical_team_id,
        "snapshot_date": payload.get("as_of_date"),
    }
    if spec.get("opponent", True):
        values["opponent_team_id"] = opponent_team_id(payload, resolver)
    for field in spec["fields"]:
        if field in TEXT_FIELDS:
            values[field] = payload.get(field)
        elif field in INT_FIELDS:
            values[field] = to_int(payload.get(field))
        else:
            values[field] = to_float(payload.get(field))
    values.update(
        {
            "source_table": row["source_table"],
            "source_pk": source_pk(row),
            "source_detail_json": detail_json(payload),
            "created_at": utc_now(),
        }
    )
    return ParsedRow(
        target_table=spec["target"],
        source_table=row["source_table"],
        legacy_row_id=row["legacy_row_id"],
        values=values,
    )


def parse_team_rows(
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
    for row in fetch_legacy_rows(con, TEAM_SOURCE_TABLES, date=date):
        counts["source_rows"] += 1
        counts["source_tables"][row["source_table"]] = counts["source_tables"].get(row["source_table"], 0) + 1
        payload = parse_legacy_json(row)
        parsed_row = parse_team_feature(row, payload, resolver)
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
        set_clause = ", ".join(f"{column} = excluded.{column}" for column in columns[1:])
        sql = f"""
            insert into {row.target_table} ({", ".join(columns)})
            values ({placeholders})
            on conflict({columns[0]}) do update set {set_clause}
        """
        con.execute(sql, [row.values[column] for column in columns])
        inserted[row.target_table] = inserted.get(row.target_table, 0) + 1
    return inserted


def normalize_team_features(con: sqlite3.Connection, date: str | None = None, dry_run: bool = False) -> dict[str, Any]:
    con.row_factory = sqlite3.Row
    ensure_team_schema(con)
    resolver = MlbIdentityResolver(con)
    before_unresolved = con.execute("select count(*) from unresolved_entities").fetchone()[0]
    rows, counts = parse_team_rows(con, resolver, date=date)
    report = {
        "family": "mlb_team_features",
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
