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


PITCHER_SOURCE_TABLES = [
    "mlb_pitcher_pitch_mix_daily",
    "mlb_starting_pitcher_rolling_form",
    "mlb_starter_leash_profiles",
    "mlb_pitcher_first_inning_profiles_daily",
    "mlb_pitcher_mistake_shape_daily",
    "mlb_starter_third_time_penalty_profiles",
]


@dataclass(frozen=True)
class ParsedRow:
    target_table: str
    source_table: str
    legacy_row_id: str
    values: dict[str, Any]


def ensure_pitcher_schema(con: sqlite3.Connection) -> None:
    con.row_factory = sqlite3.Row
    con.executescript(
        """
        create table if not exists pitcher_pitch_mix_snapshots (
          pitcher_pitch_mix_snapshot_id text primary key,
          pitcher_id text not null,
          team_id text,
          snapshot_date text,
          pitch_type text not null,
          sample_pitches integer,
          pitch_share real,
          whiff_rate real,
          zone_rate real,
          called_strike_rate real,
          command_leak real,
          damage_allowed real,
          hard_contact_rate real,
          platoon_split_json text,
          source_json text,
          source_table text,
          source_pk text,
          source_detail_json text,
          created_at text not null,
          foreign key (pitcher_id) references players(player_id),
          foreign key (team_id) references teams(team_id)
        );
        create index if not exists idx_pitcher_pitch_mix on pitcher_pitch_mix_snapshots (pitcher_id, snapshot_date, pitch_type);

        create table if not exists starting_pitcher_form_snapshots (
          starting_pitcher_form_snapshot_id text primary key,
          pitcher_id text not null,
          snapshot_date text,
          window_starts integer,
          starts_sample integer,
          innings_per_start real,
          outs_recorded_per_start real,
          batters_faced_per_start real,
          pitches_per_start real,
          runs_allowed_per_start real,
          earned_runs_per_start real,
          hits_allowed_per_start real,
          home_runs_allowed_per_start real,
          walks_allowed_per_start real,
          strikeouts_per_start real,
          strikeout_to_walk_ratio real,
          whip_like real,
          quality_start_rate real,
          short_start_rate real,
          home_run_burstiness real,
          run_volatility real,
          recent_3_earned_runs_delta real,
          source_table text,
          source_pk text,
          source_detail_json text,
          created_at text not null,
          foreign key (pitcher_id) references players(player_id)
        );
        create index if not exists idx_starting_pitcher_form on starting_pitcher_form_snapshots (pitcher_id, snapshot_date, window_starts);

        create table if not exists starter_leash_profiles (
          starter_leash_profile_id text primary key,
          pitcher_id text not null,
          snapshot_date text,
          window_starts integer,
          starts_sample integer,
          innings_per_start real,
          outs_per_start real,
          batters_faced_per_start real,
          pitches_per_start real,
          five_plus_inning_rate real,
          six_plus_inning_rate real,
          ninety_pitch_rate real,
          short_start_rate real,
          leash_score real,
          leash_volatility real,
          recent_3_outs_delta real,
          recent_3_pitches_delta real,
          source_table text,
          source_pk text,
          source_detail_json text,
          created_at text not null,
          foreign key (pitcher_id) references players(player_id)
        );
        create index if not exists idx_starter_leash on starter_leash_profiles (pitcher_id, snapshot_date, window_starts);

        create table if not exists pitcher_first_inning_profiles (
          pitcher_first_inning_profile_id text primary key,
          pitcher_id text not null,
          team_id text,
          opponent_team_id text,
          snapshot_date text,
          window_starts integer,
          starts_sample integer,
          first_batter_reach_rate real,
          first_inning_baserunners_per_start real,
          first_inning_clean_rate real,
          first_inning_home_run_rate real,
          first_inning_multi_run_allowed_rate real,
          first_inning_pressure_index real,
          first_inning_run_allowed_rate real,
          first_inning_runs_allowed_per_start real,
          first_inning_walk_rate real,
          source_table text,
          source_pk text,
          source_detail_json text,
          created_at text not null,
          foreign key (pitcher_id) references players(player_id),
          foreign key (team_id) references teams(team_id),
          foreign key (opponent_team_id) references teams(team_id)
        );
        create index if not exists idx_first_inning_profiles on pitcher_first_inning_profiles (pitcher_id, snapshot_date, window_starts);

        create table if not exists pitcher_mistake_shape_snapshots (
          pitcher_mistake_shape_snapshot_id text primary key,
          pitcher_id text not null,
          team_id text,
          opponent_team_id text,
          snapshot_date text,
          window_starts integer,
          starts_sample integer,
          command_break_index real,
          early_clean_start_rate real,
          first_batter_reach_rate real,
          first_inning_run_allowed_rate real,
          first_three_runs_allowed_per_start real,
          home_run_start_rate real,
          meltdown_start_rate real,
          post_damage_recovery_rate real,
          sixth_inning_damage_rate real,
          starts_reaching_sixth integer,
          starts_with_damage integer,
          walk_burst_start_rate real,
          source_table text,
          source_pk text,
          source_detail_json text,
          created_at text not null,
          foreign key (pitcher_id) references players(player_id),
          foreign key (team_id) references teams(team_id),
          foreign key (opponent_team_id) references teams(team_id)
        );
        create index if not exists idx_pitcher_mistake_shape on pitcher_mistake_shape_snapshots (pitcher_id, snapshot_date, window_starts);

        create table if not exists starter_third_time_penalty_profiles (
          starter_third_time_penalty_profile_id text primary key,
          pitcher_id text not null,
          snapshot_date text,
          window_starts integer,
          starts_sample integer,
          starts_with_third_trip integer,
          third_time_penalty_index real,
          third_trip_exposure_rate real,
          first_trip_pa integer,
          second_trip_pa integer,
          third_trip_pa integer,
          first_trip_reached_rate real,
          second_trip_reached_rate real,
          third_trip_reached_rate real,
          third_trip_reached_delta real,
          first_trip_hr_rate real,
          second_trip_hr_rate real,
          third_trip_hr_rate real,
          third_trip_hr_delta real,
          first_trip_scoring_play_rate real,
          second_trip_scoring_play_rate real,
          third_trip_scoring_play_rate real,
          third_trip_scoring_delta real,
          first_trip_run_delta real,
          second_trip_run_delta real,
          third_trip_run_delta real,
          third_trip_run_delta_delta real,
          source_table text,
          source_pk text,
          source_detail_json text,
          created_at text not null,
          foreign key (pitcher_id) references players(player_id)
        );
        create index if not exists idx_third_time_penalty on starter_third_time_penalty_profiles (pitcher_id, snapshot_date, window_starts);
        """
    )


def source_pk(row: sqlite3.Row) -> str:
    return str(row["source_pk"] or row["legacy_row_id"])


def pitcher_id_from_payload(payload: dict[str, Any], resolver: MlbIdentityResolver) -> str | None:
    pitcher_id = payload.get("pitcher_id")
    name = payload.get("pitcher_name")
    if pitcher_id is not None and (name is None or str(name).strip() == ""):
        name = f"MLB Player {pitcher_id}"
    return resolver.player_id_by_mlb_id("mlb_pitcher_features", pitcher_id, name)


def team_id(payload: dict[str, Any], resolver: MlbIdentityResolver) -> str | None:
    return resolver.team_id_by_name("mlb_pitcher_features", payload.get("team_name"))


def opponent_team_id(payload: dict[str, Any], resolver: MlbIdentityResolver) -> str | None:
    return resolver.team_id_by_name("mlb_pitcher_features", payload.get("scheduled_opponent"))


def unresolved(row: sqlite3.Row, payload: dict[str, Any], resolver: MlbIdentityResolver, entity_type: str, reason: str) -> None:
    resolver.insert_unresolved(
        entity_type,
        "mlb_pitcher_features",
        payload.get("pitcher_id"),
        payload.get("pitcher_name") or f"MLB Player {payload.get('pitcher_id') or 'unknown'}",
        {"legacy_row_id": row["legacy_row_id"], "source_table": row["source_table"], "payload": payload},
        reason,
    )
    return None


def parse_pitch_mix(row: sqlite3.Row, payload: dict[str, Any], resolver: MlbIdentityResolver) -> ParsedRow | None:
    pitcher_id = pitcher_id_from_payload(payload, resolver)
    if not pitcher_id:
        return unresolved(row, payload, resolver, "mlb_pitcher_pitch_mix", "Could not map pitcher pitch-mix row to canonical pitcher.")
    return ParsedRow(
        target_table="pitcher_pitch_mix_snapshots",
        source_table=row["source_table"],
        legacy_row_id=row["legacy_row_id"],
        values={
            "pitcher_pitch_mix_snapshot_id": stable_id("pitcher-pitch-mix", pitcher_id, payload.get("snapshot_date"), payload.get("pitch_type"), source_pk(row)),
            "pitcher_id": pitcher_id,
            "team_id": team_id(payload, resolver),
            "snapshot_date": payload.get("snapshot_date"),
            "pitch_type": str(payload.get("pitch_type") or "unknown"),
            "sample_pitches": to_int(payload.get("sample_pitches")),
            "pitch_share": to_float(payload.get("pitch_share")),
            "whiff_rate": to_float(payload.get("whiff_rate")),
            "zone_rate": to_float(payload.get("zone_rate")),
            "called_strike_rate": to_float(payload.get("called_strike_rate")),
            "command_leak": to_float(payload.get("command_leak")),
            "damage_allowed": to_float(payload.get("damage_allowed")),
            "hard_contact_rate": to_float(payload.get("hard_contact_rate")),
            "platoon_split_json": payload.get("platoon_split_json"),
            "source_json": payload.get("source_json"),
            "source_table": row["source_table"],
            "source_pk": source_pk(row),
            "source_detail_json": detail_json(payload),
            "created_at": utc_now(),
        },
    )


def parse_rolling_form(row: sqlite3.Row, payload: dict[str, Any], resolver: MlbIdentityResolver) -> ParsedRow | None:
    pitcher_id = pitcher_id_from_payload(payload, resolver)
    if not pitcher_id:
        return unresolved(row, payload, resolver, "mlb_pitcher_rolling_form", "Could not map starting pitcher rolling form row.")
    return ParsedRow(
        target_table="starting_pitcher_form_snapshots",
        source_table=row["source_table"],
        legacy_row_id=row["legacy_row_id"],
        values={
            "starting_pitcher_form_snapshot_id": stable_id("starting-pitcher-form", pitcher_id, payload.get("as_of_date"), payload.get("window_starts"), source_pk(row)),
            "pitcher_id": pitcher_id,
            "snapshot_date": payload.get("as_of_date"),
            "window_starts": to_int(payload.get("window_starts")),
            "starts_sample": to_int(payload.get("starts_sample")),
            "innings_per_start": to_float(payload.get("innings_per_start")),
            "outs_recorded_per_start": to_float(payload.get("outs_recorded_per_start")),
            "batters_faced_per_start": to_float(payload.get("batters_faced_per_start")),
            "pitches_per_start": to_float(payload.get("pitches_per_start")),
            "runs_allowed_per_start": to_float(payload.get("runs_allowed_per_start")),
            "earned_runs_per_start": to_float(payload.get("earned_runs_per_start")),
            "hits_allowed_per_start": to_float(payload.get("hits_allowed_per_start")),
            "home_runs_allowed_per_start": to_float(payload.get("home_runs_allowed_per_start")),
            "walks_allowed_per_start": to_float(payload.get("walks_allowed_per_start")),
            "strikeouts_per_start": to_float(payload.get("strikeouts_per_start")),
            "strikeout_to_walk_ratio": to_float(payload.get("strikeout_to_walk_ratio")),
            "whip_like": to_float(payload.get("whip_like")),
            "quality_start_rate": to_float(payload.get("quality_start_rate")),
            "short_start_rate": to_float(payload.get("short_start_rate")),
            "home_run_burstiness": to_float(payload.get("home_run_burstiness")),
            "run_volatility": to_float(payload.get("run_volatility")),
            "recent_3_earned_runs_delta": to_float(payload.get("recent_3_earned_runs_delta")),
            "source_table": row["source_table"],
            "source_pk": source_pk(row),
            "source_detail_json": detail_json(payload),
            "created_at": utc_now(),
        },
    )


def parse_leash(row: sqlite3.Row, payload: dict[str, Any], resolver: MlbIdentityResolver) -> ParsedRow | None:
    pitcher_id = pitcher_id_from_payload(payload, resolver)
    if not pitcher_id:
        return unresolved(row, payload, resolver, "mlb_pitcher_leash", "Could not map starter leash row.")
    return ParsedRow(
        target_table="starter_leash_profiles",
        source_table=row["source_table"],
        legacy_row_id=row["legacy_row_id"],
        values={
            "starter_leash_profile_id": stable_id("starter-leash", pitcher_id, payload.get("as_of_date"), payload.get("window_starts"), source_pk(row)),
            "pitcher_id": pitcher_id,
            "snapshot_date": payload.get("as_of_date"),
            "window_starts": to_int(payload.get("window_starts")),
            "starts_sample": to_int(payload.get("starts_sample")),
            "innings_per_start": to_float(payload.get("innings_per_start")),
            "outs_per_start": to_float(payload.get("outs_per_start")),
            "batters_faced_per_start": to_float(payload.get("batters_faced_per_start")),
            "pitches_per_start": to_float(payload.get("pitches_per_start")),
            "five_plus_inning_rate": to_float(payload.get("five_plus_inning_rate")),
            "six_plus_inning_rate": to_float(payload.get("six_plus_inning_rate")),
            "ninety_pitch_rate": to_float(payload.get("ninety_pitch_rate")),
            "short_start_rate": to_float(payload.get("short_start_rate")),
            "leash_score": to_float(payload.get("leash_score")),
            "leash_volatility": to_float(payload.get("leash_volatility")),
            "recent_3_outs_delta": to_float(payload.get("recent_3_outs_delta")),
            "recent_3_pitches_delta": to_float(payload.get("recent_3_pitches_delta")),
            "source_table": row["source_table"],
            "source_pk": source_pk(row),
            "source_detail_json": detail_json(payload),
            "created_at": utc_now(),
        },
    )


def parse_first_inning(row: sqlite3.Row, payload: dict[str, Any], resolver: MlbIdentityResolver) -> ParsedRow | None:
    pitcher_id = pitcher_id_from_payload(payload, resolver)
    if not pitcher_id:
        return unresolved(row, payload, resolver, "mlb_pitcher_first_inning", "Could not map first-inning pitcher profile row.")
    return ParsedRow(
        target_table="pitcher_first_inning_profiles",
        source_table=row["source_table"],
        legacy_row_id=row["legacy_row_id"],
        values={
            "pitcher_first_inning_profile_id": stable_id("pitcher-first-inning", pitcher_id, payload.get("as_of_date"), payload.get("window_starts"), source_pk(row)),
            "pitcher_id": pitcher_id,
            "team_id": team_id(payload, resolver),
            "opponent_team_id": opponent_team_id(payload, resolver),
            "snapshot_date": payload.get("as_of_date"),
            "window_starts": to_int(payload.get("window_starts")),
            "starts_sample": to_int(payload.get("starts_sample")),
            "first_batter_reach_rate": to_float(payload.get("first_batter_reach_rate")),
            "first_inning_baserunners_per_start": to_float(payload.get("first_inning_baserunners_per_start")),
            "first_inning_clean_rate": to_float(payload.get("first_inning_clean_rate")),
            "first_inning_home_run_rate": to_float(payload.get("first_inning_home_run_rate")),
            "first_inning_multi_run_allowed_rate": to_float(payload.get("first_inning_multi_run_allowed_rate")),
            "first_inning_pressure_index": to_float(payload.get("first_inning_pressure_index")),
            "first_inning_run_allowed_rate": to_float(payload.get("first_inning_run_allowed_rate")),
            "first_inning_runs_allowed_per_start": to_float(payload.get("first_inning_runs_allowed_per_start")),
            "first_inning_walk_rate": to_float(payload.get("first_inning_walk_rate")),
            "source_table": row["source_table"],
            "source_pk": source_pk(row),
            "source_detail_json": detail_json(payload),
            "created_at": utc_now(),
        },
    )


def parse_mistake_shape(row: sqlite3.Row, payload: dict[str, Any], resolver: MlbIdentityResolver) -> ParsedRow | None:
    pitcher_id = pitcher_id_from_payload(payload, resolver)
    if not pitcher_id:
        return unresolved(row, payload, resolver, "mlb_pitcher_mistake_shape", "Could not map pitcher mistake-shape row.")
    return ParsedRow(
        target_table="pitcher_mistake_shape_snapshots",
        source_table=row["source_table"],
        legacy_row_id=row["legacy_row_id"],
        values={
            "pitcher_mistake_shape_snapshot_id": stable_id("pitcher-mistake-shape", pitcher_id, payload.get("as_of_date"), payload.get("window_starts"), source_pk(row)),
            "pitcher_id": pitcher_id,
            "team_id": team_id(payload, resolver),
            "opponent_team_id": opponent_team_id(payload, resolver),
            "snapshot_date": payload.get("as_of_date"),
            "window_starts": to_int(payload.get("window_starts")),
            "starts_sample": to_int(payload.get("starts_sample")),
            "command_break_index": to_float(payload.get("command_break_index")),
            "early_clean_start_rate": to_float(payload.get("early_clean_start_rate")),
            "first_batter_reach_rate": to_float(payload.get("first_batter_reach_rate")),
            "first_inning_run_allowed_rate": to_float(payload.get("first_inning_run_allowed_rate")),
            "first_three_runs_allowed_per_start": to_float(payload.get("first_three_runs_allowed_per_start")),
            "home_run_start_rate": to_float(payload.get("home_run_start_rate")),
            "meltdown_start_rate": to_float(payload.get("meltdown_start_rate")),
            "post_damage_recovery_rate": to_float(payload.get("post_damage_recovery_rate")),
            "sixth_inning_damage_rate": to_float(payload.get("sixth_inning_damage_rate")),
            "starts_reaching_sixth": to_int(payload.get("starts_reaching_sixth")),
            "starts_with_damage": to_int(payload.get("starts_with_damage")),
            "walk_burst_start_rate": to_float(payload.get("walk_burst_start_rate")),
            "source_table": row["source_table"],
            "source_pk": source_pk(row),
            "source_detail_json": detail_json(payload),
            "created_at": utc_now(),
        },
    )


def parse_third_time(row: sqlite3.Row, payload: dict[str, Any], resolver: MlbIdentityResolver) -> ParsedRow | None:
    pitcher_id = pitcher_id_from_payload(payload, resolver)
    if not pitcher_id:
        return unresolved(row, payload, resolver, "mlb_pitcher_third_time", "Could not map third-time penalty row.")
    values = {
        "starter_third_time_penalty_profile_id": stable_id("third-time-penalty", pitcher_id, payload.get("as_of_date"), payload.get("window_starts"), source_pk(row)),
        "pitcher_id": pitcher_id,
        "snapshot_date": payload.get("as_of_date"),
        "window_starts": to_int(payload.get("window_starts")),
        "starts_sample": to_int(payload.get("starts_sample")),
        "starts_with_third_trip": to_int(payload.get("starts_with_third_trip")),
        "third_time_penalty_index": to_float(payload.get("third_time_penalty_index")),
        "third_trip_exposure_rate": to_float(payload.get("third_trip_exposure_rate")),
        "source_table": row["source_table"],
        "source_pk": source_pk(row),
        "source_detail_json": detail_json(payload),
        "created_at": utc_now(),
    }
    for field in [
        "first_trip_pa",
        "second_trip_pa",
        "third_trip_pa",
        "first_trip_reached_rate",
        "second_trip_reached_rate",
        "third_trip_reached_rate",
        "third_trip_reached_delta",
        "first_trip_hr_rate",
        "second_trip_hr_rate",
        "third_trip_hr_rate",
        "third_trip_hr_delta",
        "first_trip_scoring_play_rate",
        "second_trip_scoring_play_rate",
        "third_trip_scoring_play_rate",
        "third_trip_scoring_delta",
        "first_trip_run_delta",
        "second_trip_run_delta",
        "third_trip_run_delta",
        "third_trip_run_delta_delta",
    ]:
        values[field] = to_int(payload.get(field)) if field.endswith("_pa") else to_float(payload.get(field))
    return ParsedRow(
        target_table="starter_third_time_penalty_profiles",
        source_table=row["source_table"],
        legacy_row_id=row["legacy_row_id"],
        values=values,
    )


def parse_pitcher_rows(
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
    for row in fetch_legacy_rows(con, PITCHER_SOURCE_TABLES, date=date):
        counts["source_rows"] += 1
        counts["source_tables"][row["source_table"]] = counts["source_tables"].get(row["source_table"], 0) + 1
        payload = parse_legacy_json(row)
        parsed_row = None
        if row["source_table"] == "mlb_pitcher_pitch_mix_daily":
            parsed_row = parse_pitch_mix(row, payload, resolver)
        elif row["source_table"] == "mlb_starting_pitcher_rolling_form":
            parsed_row = parse_rolling_form(row, payload, resolver)
        elif row["source_table"] == "mlb_starter_leash_profiles":
            parsed_row = parse_leash(row, payload, resolver)
        elif row["source_table"] == "mlb_pitcher_first_inning_profiles_daily":
            parsed_row = parse_first_inning(row, payload, resolver)
        elif row["source_table"] == "mlb_pitcher_mistake_shape_daily":
            parsed_row = parse_mistake_shape(row, payload, resolver)
        elif row["source_table"] == "mlb_starter_third_time_penalty_profiles":
            parsed_row = parse_third_time(row, payload, resolver)
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


def normalize_pitcher_features(con: sqlite3.Connection, date: str | None = None, dry_run: bool = False) -> dict[str, Any]:
    con.row_factory = sqlite3.Row
    ensure_pitcher_schema(con)
    resolver = MlbIdentityResolver(con)
    before_unresolved = con.execute("select count(*) from unresolved_entities").fetchone()[0]
    rows, counts = parse_pitcher_rows(con, resolver, date=date)
    report = {
        "family": "mlb_pitcher_features",
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
