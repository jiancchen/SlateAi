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


BULLPEN_SOURCE_TABLES = [
    "mlb_bullpen_usage",
    "mlb_reliever_first_batter_command_profiles",
    "mlb_bullpen_mistake_shape_daily",
    "mlb_likely_relief_chains",
    "mlb_team_bullpen_shape_daily",
]


@dataclass(frozen=True)
class ParsedRow:
    target_table: str
    source_table: str
    legacy_row_id: str
    values: dict[str, Any]


def ensure_bullpen_schema(con: sqlite3.Connection) -> None:
    con.row_factory = sqlite3.Row
    con.executescript(
        """
        create table if not exists bullpen_usage_snapshots (
          bullpen_usage_snapshot_id text primary key,
          pitcher_id text not null,
          team_id text,
          snapshot_date text,
          appearances_last3 integer,
          innings_last3 real,
          outs_last3 integer,
          pitches_last3 integer,
          batters_faced_last3 integer,
          avg_entry_order real,
          avg_outs_per_appearance real,
          avg_pitches_per_appearance real,
          days_since_last_appearance integer,
          last_appearance_date text,
          worked_yesterday_flag integer,
          back_to_back_flag integer,
          likely_role text,
          availability_score real,
          fatigue_score real,
          bridge_score real,
          first_reliever_likelihood real,
          source_table text,
          source_pk text,
          source_detail_json text,
          created_at text not null,
          foreign key (pitcher_id) references players(player_id),
          foreign key (team_id) references teams(team_id)
        );
        create index if not exists idx_bullpen_usage_pitcher on bullpen_usage_snapshots (pitcher_id, snapshot_date);

        create table if not exists reliever_command_profiles (
          reliever_command_profile_id text primary key,
          pitcher_id text not null,
          team_id text,
          snapshot_date text,
          appearance_window integer,
          entries_sample integer,
          avg_entry_order real,
          first_pitch_strike_rate real,
          first_pitch_ball_rate real,
          ball_rate real,
          strikeout_rate real,
          free_pass_rate real,
          reached_rate real,
          scoring_play_rate real,
          run_delta_per_entry real,
          command_risk_index real,
          source_table text,
          source_pk text,
          source_detail_json text,
          created_at text not null,
          foreign key (pitcher_id) references players(player_id),
          foreign key (team_id) references teams(team_id)
        );
        create index if not exists idx_reliever_command_pitcher on reliever_command_profiles (pitcher_id, snapshot_date, appearance_window);

        create table if not exists bullpen_mistake_shape_snapshots (
          bullpen_mistake_shape_snapshot_id text primary key,
          team_id text not null,
          opponent_team_id text,
          snapshot_date text,
          window_days integer,
          games_sample integer,
          appearances_sample integer,
          bullpen_chaos_index real,
          bridge_clean_game_rate real,
          bullpen_meltdown_game_rate real,
          meltdown_appearance_rate real,
          first_batter_reach_rate real,
          first_batter_walk_rate real,
          inherited_traffic_entry_rate real,
          inherited_traffic_score_rate real,
          lead_loss_after_entry_rate real,
          home_run_appearance_rate real,
          source_table text,
          source_pk text,
          source_detail_json text,
          created_at text not null,
          foreign key (team_id) references teams(team_id),
          foreign key (opponent_team_id) references teams(team_id)
        );
        create index if not exists idx_bullpen_mistake_team on bullpen_mistake_shape_snapshots (team_id, snapshot_date, window_days);

        create table if not exists likely_relief_chains (
          likely_relief_chain_id text primary key,
          team_id text not null,
          opponent_team_id text,
          pitcher_id text not null,
          snapshot_date text,
          predicted_rank integer,
          likely_role text,
          expected_outs real,
          availability_score real,
          bridge_score real,
          first_reliever_likelihood real,
          last_appearance_date text,
          worked_yesterday_flag integer,
          back_to_back_flag integer,
          source_table text,
          source_pk text,
          source_detail_json text,
          created_at text not null,
          foreign key (team_id) references teams(team_id),
          foreign key (opponent_team_id) references teams(team_id),
          foreign key (pitcher_id) references players(player_id)
        );
        create index if not exists idx_likely_relief_chains_team on likely_relief_chains (team_id, snapshot_date, predicted_rank);

        create table if not exists team_bullpen_shape_snapshots (
          team_bullpen_shape_snapshot_id text primary key,
          team_id text not null,
          opponent_team_id text,
          snapshot_date text,
          bullpen_shape_index real,
          games_sample_last3 integer,
          games_sample_last5 integer,
          games_sample_last10 integer,
          relievers_used_avg_last3 real,
          relievers_used_avg_last5 real,
          relievers_used_avg_last10 real,
          relievers_used_max_last10 integer,
          first_reliever_outs_avg_last3 real,
          first_reliever_outs_avg_last5 real,
          first_reliever_outs_avg_last10 real,
          first_reliever_outs_volatility_last10 real,
          total_relief_outs_avg_last5 real,
          total_relief_outs_avg_last10 real,
          total_relief_runs_allowed_avg_last5 real,
          total_relief_runs_allowed_avg_last10 real,
          short_first_up_rate_last5 real,
          short_first_up_rate_last10 real,
          bulk_first_up_rate_last5 real,
          bulk_first_up_rate_last10 real,
          two_reliever_containment_rate_last5 real,
          two_reliever_containment_rate_last10 real,
          four_plus_reliever_rate_last5 real,
          four_plus_reliever_rate_last10 real,
          six_plus_reliever_scramble_rate_last10 real,
          source_table text,
          source_pk text,
          source_detail_json text,
          created_at text not null,
          foreign key (team_id) references teams(team_id),
          foreign key (opponent_team_id) references teams(team_id)
        );
        create index if not exists idx_team_bullpen_shape on team_bullpen_shape_snapshots (team_id, snapshot_date);
        """
    )


def source_pk(row: sqlite3.Row) -> str:
    return str(row["source_pk"] or row["legacy_row_id"])


def player_id(payload: dict[str, Any], resolver: MlbIdentityResolver) -> str | None:
    return resolver.player_id_by_mlb_id("mlb_bullpen_features", payload.get("pitcher_id"), payload.get("pitcher_name"))


def team_id(payload: dict[str, Any], resolver: MlbIdentityResolver) -> str | None:
    return resolver.team_id_by_name("mlb_bullpen_features", payload.get("team_name"))


def opponent_team_id(payload: dict[str, Any], resolver: MlbIdentityResolver) -> str | None:
    return resolver.team_id_by_name("mlb_bullpen_features", payload.get("scheduled_opponent") or payload.get("opponent_name"))


def unresolved(row: sqlite3.Row, payload: dict[str, Any], resolver: MlbIdentityResolver, entity_type: str, reason: str) -> None:
    resolver.insert_unresolved(
        entity_type,
        "mlb_bullpen_features",
        payload.get("pitcher_id") or payload.get("team_name"),
        payload.get("pitcher_name") or payload.get("team_name") or "unknown bullpen row",
        {"legacy_row_id": row["legacy_row_id"], "source_table": row["source_table"], "payload": payload},
        reason,
    )
    return None


def parse_usage(row: sqlite3.Row, payload: dict[str, Any], resolver: MlbIdentityResolver) -> ParsedRow | None:
    pitcher_id = player_id(payload, resolver)
    if not pitcher_id:
        return unresolved(row, payload, resolver, "mlb_bullpen_usage", "Could not map bullpen usage row to canonical reliever.")
    return ParsedRow(
        target_table="bullpen_usage_snapshots",
        source_table=row["source_table"],
        legacy_row_id=row["legacy_row_id"],
        values={
            "bullpen_usage_snapshot_id": stable_id("bullpen-usage", pitcher_id, payload.get("as_of_date"), source_pk(row)),
            "pitcher_id": pitcher_id,
            "team_id": team_id(payload, resolver),
            "snapshot_date": payload.get("as_of_date"),
            "appearances_last3": to_int(payload.get("appearances_last3")),
            "innings_last3": to_float(payload.get("innings_last3")),
            "outs_last3": to_int(payload.get("outs_last3")),
            "pitches_last3": to_int(payload.get("pitches_last3")),
            "batters_faced_last3": to_int(payload.get("batters_faced_last3")),
            "avg_entry_order": to_float(payload.get("avg_entry_order")),
            "avg_outs_per_appearance": to_float(payload.get("avg_outs_per_appearance")),
            "avg_pitches_per_appearance": to_float(payload.get("avg_pitches_per_appearance")),
            "days_since_last_appearance": to_int(payload.get("days_since_last_appearance")),
            "last_appearance_date": payload.get("last_appearance_date"),
            "worked_yesterday_flag": to_int(payload.get("worked_yesterday_flag")),
            "back_to_back_flag": to_int(payload.get("back_to_back_flag")),
            "likely_role": payload.get("likely_role"),
            "availability_score": to_float(payload.get("availability_score")),
            "fatigue_score": to_float(payload.get("fatigue_score")),
            "bridge_score": to_float(payload.get("bridge_score")),
            "first_reliever_likelihood": to_float(payload.get("first_reliever_likelihood")),
            "source_table": row["source_table"],
            "source_pk": source_pk(row),
            "source_detail_json": detail_json(payload),
            "created_at": utc_now(),
        },
    )


def parse_command(row: sqlite3.Row, payload: dict[str, Any], resolver: MlbIdentityResolver) -> ParsedRow | None:
    pitcher_id = player_id(payload, resolver)
    if not pitcher_id:
        return unresolved(row, payload, resolver, "mlb_reliever_command", "Could not map reliever command row.")
    return ParsedRow(
        target_table="reliever_command_profiles",
        source_table=row["source_table"],
        legacy_row_id=row["legacy_row_id"],
        values={
            "reliever_command_profile_id": stable_id("reliever-command", pitcher_id, payload.get("as_of_date"), payload.get("appearance_window"), source_pk(row)),
            "pitcher_id": pitcher_id,
            "team_id": team_id(payload, resolver),
            "snapshot_date": payload.get("as_of_date"),
            "appearance_window": to_int(payload.get("appearance_window")),
            "entries_sample": to_int(payload.get("entries_sample")),
            "avg_entry_order": to_float(payload.get("avg_entry_order")),
            "first_pitch_strike_rate": to_float(payload.get("first_pitch_strike_rate")),
            "first_pitch_ball_rate": to_float(payload.get("first_pitch_ball_rate")),
            "ball_rate": to_float(payload.get("ball_rate")),
            "strikeout_rate": to_float(payload.get("strikeout_rate")),
            "free_pass_rate": to_float(payload.get("free_pass_rate")),
            "reached_rate": to_float(payload.get("reached_rate")),
            "scoring_play_rate": to_float(payload.get("scoring_play_rate")),
            "run_delta_per_entry": to_float(payload.get("run_delta_per_entry")),
            "command_risk_index": to_float(payload.get("command_risk_index")),
            "source_table": row["source_table"],
            "source_pk": source_pk(row),
            "source_detail_json": detail_json(payload),
            "created_at": utc_now(),
        },
    )


def parse_team_mistake(row: sqlite3.Row, payload: dict[str, Any], resolver: MlbIdentityResolver) -> ParsedRow | None:
    canonical_team_id = team_id(payload, resolver)
    if not canonical_team_id:
        return unresolved(row, payload, resolver, "mlb_bullpen_mistake_shape", "Could not map bullpen mistake-shape row to canonical team.")
    return ParsedRow(
        target_table="bullpen_mistake_shape_snapshots",
        source_table=row["source_table"],
        legacy_row_id=row["legacy_row_id"],
        values={
            "bullpen_mistake_shape_snapshot_id": stable_id("bullpen-mistake", canonical_team_id, payload.get("as_of_date"), payload.get("window_days"), source_pk(row)),
            "team_id": canonical_team_id,
            "opponent_team_id": opponent_team_id(payload, resolver),
            "snapshot_date": payload.get("as_of_date"),
            "window_days": to_int(payload.get("window_days")),
            "games_sample": to_int(payload.get("games_sample")),
            "appearances_sample": to_int(payload.get("appearances_sample")),
            "bullpen_chaos_index": to_float(payload.get("bullpen_chaos_index")),
            "bridge_clean_game_rate": to_float(payload.get("bridge_clean_game_rate")),
            "bullpen_meltdown_game_rate": to_float(payload.get("bullpen_meltdown_game_rate")),
            "meltdown_appearance_rate": to_float(payload.get("meltdown_appearance_rate")),
            "first_batter_reach_rate": to_float(payload.get("first_batter_reach_rate")),
            "first_batter_walk_rate": to_float(payload.get("first_batter_walk_rate")),
            "inherited_traffic_entry_rate": to_float(payload.get("inherited_traffic_entry_rate")),
            "inherited_traffic_score_rate": to_float(payload.get("inherited_traffic_score_rate")),
            "lead_loss_after_entry_rate": to_float(payload.get("lead_loss_after_entry_rate")),
            "home_run_appearance_rate": to_float(payload.get("home_run_appearance_rate")),
            "source_table": row["source_table"],
            "source_pk": source_pk(row),
            "source_detail_json": detail_json(payload),
            "created_at": utc_now(),
        },
    )


def parse_chain(row: sqlite3.Row, payload: dict[str, Any], resolver: MlbIdentityResolver) -> ParsedRow | None:
    canonical_team_id = team_id(payload, resolver)
    pitcher_id = player_id(payload, resolver)
    if not canonical_team_id or not pitcher_id:
        return unresolved(row, payload, resolver, "mlb_likely_relief_chain", "Could not map likely relief chain row.")
    return ParsedRow(
        target_table="likely_relief_chains",
        source_table=row["source_table"],
        legacy_row_id=row["legacy_row_id"],
        values={
            "likely_relief_chain_id": stable_id("likely-relief-chain", canonical_team_id, payload.get("as_of_date"), payload.get("predicted_rank"), source_pk(row)),
            "team_id": canonical_team_id,
            "opponent_team_id": opponent_team_id(payload, resolver),
            "pitcher_id": pitcher_id,
            "snapshot_date": payload.get("as_of_date"),
            "predicted_rank": to_int(payload.get("predicted_rank")),
            "likely_role": payload.get("likely_role"),
            "expected_outs": to_float(payload.get("expected_outs")),
            "availability_score": to_float(payload.get("availability_score")),
            "bridge_score": to_float(payload.get("bridge_score")),
            "first_reliever_likelihood": to_float(payload.get("first_reliever_likelihood")),
            "last_appearance_date": payload.get("last_appearance_date"),
            "worked_yesterday_flag": to_int(payload.get("worked_yesterday_flag")),
            "back_to_back_flag": to_int(payload.get("back_to_back_flag")),
            "source_table": row["source_table"],
            "source_pk": source_pk(row),
            "source_detail_json": detail_json(payload),
            "created_at": utc_now(),
        },
    )


def parse_team_shape(row: sqlite3.Row, payload: dict[str, Any], resolver: MlbIdentityResolver) -> ParsedRow | None:
    canonical_team_id = team_id(payload, resolver)
    if not canonical_team_id:
        return unresolved(row, payload, resolver, "mlb_team_bullpen_shape", "Could not map team bullpen-shape row.")
    values = {
        "team_bullpen_shape_snapshot_id": stable_id("team-bullpen-shape", canonical_team_id, payload.get("as_of_date"), source_pk(row)),
        "team_id": canonical_team_id,
        "opponent_team_id": opponent_team_id(payload, resolver),
        "snapshot_date": payload.get("as_of_date"),
        "bullpen_shape_index": to_float(payload.get("bullpen_shape_index")),
        "source_table": row["source_table"],
        "source_pk": source_pk(row),
        "source_detail_json": detail_json(payload),
        "created_at": utc_now(),
    }
    for field in [
        "games_sample_last3",
        "games_sample_last5",
        "games_sample_last10",
        "relievers_used_avg_last3",
        "relievers_used_avg_last5",
        "relievers_used_avg_last10",
        "relievers_used_max_last10",
        "first_reliever_outs_avg_last3",
        "first_reliever_outs_avg_last5",
        "first_reliever_outs_avg_last10",
        "first_reliever_outs_volatility_last10",
        "total_relief_outs_avg_last5",
        "total_relief_outs_avg_last10",
        "total_relief_runs_allowed_avg_last5",
        "total_relief_runs_allowed_avg_last10",
        "short_first_up_rate_last5",
        "short_first_up_rate_last10",
        "bulk_first_up_rate_last5",
        "bulk_first_up_rate_last10",
        "two_reliever_containment_rate_last5",
        "two_reliever_containment_rate_last10",
        "four_plus_reliever_rate_last5",
        "four_plus_reliever_rate_last10",
        "six_plus_reliever_scramble_rate_last10",
    ]:
        values[field] = to_int(payload.get(field)) if field.startswith("games_sample") or field.endswith("_max_last10") else to_float(payload.get(field))
    return ParsedRow(
        target_table="team_bullpen_shape_snapshots",
        source_table=row["source_table"],
        legacy_row_id=row["legacy_row_id"],
        values=values,
    )


def parse_bullpen_rows(
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
    for row in fetch_legacy_rows(con, BULLPEN_SOURCE_TABLES, date=date):
        counts["source_rows"] += 1
        counts["source_tables"][row["source_table"]] = counts["source_tables"].get(row["source_table"], 0) + 1
        payload = parse_legacy_json(row)
        parsed_row = None
        if row["source_table"] == "mlb_bullpen_usage":
            parsed_row = parse_usage(row, payload, resolver)
        elif row["source_table"] == "mlb_reliever_first_batter_command_profiles":
            parsed_row = parse_command(row, payload, resolver)
        elif row["source_table"] == "mlb_bullpen_mistake_shape_daily":
            parsed_row = parse_team_mistake(row, payload, resolver)
        elif row["source_table"] == "mlb_likely_relief_chains":
            parsed_row = parse_chain(row, payload, resolver)
        elif row["source_table"] == "mlb_team_bullpen_shape_daily":
            parsed_row = parse_team_shape(row, payload, resolver)
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


def normalize_bullpen_features(con: sqlite3.Connection, date: str | None = None, dry_run: bool = False) -> dict[str, Any]:
    con.row_factory = sqlite3.Row
    ensure_bullpen_schema(con)
    resolver = MlbIdentityResolver(con)
    before_unresolved = con.execute("select count(*) from unresolved_entities").fetchone()[0]
    rows, counts = parse_bullpen_rows(con, resolver, date=date)
    report = {
        "family": "mlb_bullpen_features",
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
