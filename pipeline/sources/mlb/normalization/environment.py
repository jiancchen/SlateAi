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


ENVIRONMENT_SOURCE_TABLES = [
    "mlb_game_sun_visibility_snapshots",
    "mlb_game_visibility_outcomes",
]


@dataclass(frozen=True)
class ParsedRow:
    target_table: str
    source_table: str
    legacy_row_id: str
    values: dict[str, Any]


def ensure_environment_schema(con: sqlite3.Connection) -> None:
    con.row_factory = sqlite3.Row
    con.executescript(
        """
        create table if not exists game_sun_visibility_snapshots (
          sun_visibility_snapshot_id text primary key,
          game_id text not null,
          venue_id text,
          game_date text,
          game_datetime text,
          venue_name text,
          roof_type text,
          latitude real,
          longitude real,
          timezone_offset_hours real,
          field_azimuth_deg real,
          sun_azimuth_first_pitch real,
          sun_elevation_first_pitch real,
          sun_azimuth_midgame real,
          sun_elevation_midgame real,
          outfield_sun_angle_deg real,
          outfield_glare_risk real,
          shadow_transition_risk real,
          visibility_risk_score real,
          risk_label text,
          visibility_notes_json text,
          source_table text,
          source_pk text,
          source_detail_json text,
          created_at text not null,
          foreign key (game_id) references games(game_id),
          foreign key (venue_id) references venues(venue_id)
        );
        create index if not exists idx_sun_visibility_game on game_sun_visibility_snapshots (game_id, game_date);

        create table if not exists game_visibility_outcomes (
          visibility_outcome_id text primary key,
          game_id text not null,
          game_date text,
          home_team_id text,
          away_team_id text,
          fielding_errors integer,
          outfield_errors integer,
          outfield_air_hits integer,
          outfield_hits integer,
          outfield_extra_base_hits integer,
          outfield_home_runs integer,
          visibility_pressure_events integer,
          source_table text,
          source_pk text,
          source_detail_json text,
          created_at text not null,
          foreign key (game_id) references games(game_id),
          foreign key (home_team_id) references teams(team_id),
          foreign key (away_team_id) references teams(team_id)
        );
        create index if not exists idx_visibility_outcomes_game on game_visibility_outcomes (game_id, game_date);
        """
    )


def source_pk(row: sqlite3.Row) -> str:
    return str(row["source_pk"] or row["legacy_row_id"])


def parse_sun(row: sqlite3.Row, payload: dict[str, Any], resolver: MlbIdentityResolver) -> ParsedRow | None:
    game = resolver.game_for_pk(payload.get("game_pk"))
    if not game:
        resolver.insert_unresolved(
            "mlb_environment_game",
            "mlb_environment",
            payload.get("game_pk"),
            payload.get("venue_name") or payload.get("game_pk") or "unknown game",
            {"legacy_row_id": row["legacy_row_id"], "source_table": row["source_table"], "payload": payload},
            "Could not map sun visibility row to canonical game.",
        )
        return None
    return ParsedRow(
        target_table="game_sun_visibility_snapshots",
        source_table=row["source_table"],
        legacy_row_id=row["legacy_row_id"],
        values={
            "sun_visibility_snapshot_id": stable_id("sun-visibility", game["game_id"], source_pk(row)),
            "game_id": game["game_id"],
            "venue_id": game.get("venue_id"),
            "game_date": payload.get("game_date"),
            "game_datetime": payload.get("game_datetime"),
            "venue_name": payload.get("venue_name"),
            "roof_type": payload.get("roof_type"),
            "latitude": to_float(payload.get("latitude")),
            "longitude": to_float(payload.get("longitude")),
            "timezone_offset_hours": to_float(payload.get("timezone_offset_hours")),
            "field_azimuth_deg": to_float(payload.get("field_azimuth_deg")),
            "sun_azimuth_first_pitch": to_float(payload.get("sun_azimuth_first_pitch")),
            "sun_elevation_first_pitch": to_float(payload.get("sun_elevation_first_pitch")),
            "sun_azimuth_midgame": to_float(payload.get("sun_azimuth_midgame")),
            "sun_elevation_midgame": to_float(payload.get("sun_elevation_midgame")),
            "outfield_sun_angle_deg": to_float(payload.get("outfield_sun_angle_deg")),
            "outfield_glare_risk": to_float(payload.get("outfield_glare_risk")),
            "shadow_transition_risk": to_float(payload.get("shadow_transition_risk")),
            "visibility_risk_score": to_float(payload.get("visibility_risk_score")),
            "risk_label": payload.get("risk_label"),
            "visibility_notes_json": payload.get("visibility_notes_json"),
            "source_table": row["source_table"],
            "source_pk": source_pk(row),
            "source_detail_json": detail_json(payload),
            "created_at": utc_now(),
        },
    )


def parse_outcome(row: sqlite3.Row, payload: dict[str, Any], resolver: MlbIdentityResolver) -> ParsedRow | None:
    game = resolver.game_for_pk(payload.get("game_pk"))
    if not game:
        resolver.insert_unresolved(
            "mlb_environment_game",
            "mlb_environment",
            payload.get("game_pk"),
            payload.get("home_team") or payload.get("away_team") or "unknown game",
            {"legacy_row_id": row["legacy_row_id"], "source_table": row["source_table"], "payload": payload},
            "Could not map visibility outcome row to canonical game.",
        )
        return None
    return ParsedRow(
        target_table="game_visibility_outcomes",
        source_table=row["source_table"],
        legacy_row_id=row["legacy_row_id"],
        values={
            "visibility_outcome_id": stable_id("visibility-outcome", game["game_id"], source_pk(row)),
            "game_id": game["game_id"],
            "game_date": payload.get("game_date"),
            "home_team_id": game.get("home_team_id"),
            "away_team_id": game.get("away_team_id"),
            "fielding_errors": to_int(payload.get("fielding_errors")),
            "outfield_errors": to_int(payload.get("outfield_errors")),
            "outfield_air_hits": to_int(payload.get("outfield_air_hits")),
            "outfield_hits": to_int(payload.get("outfield_hits")),
            "outfield_extra_base_hits": to_int(payload.get("outfield_extra_base_hits")),
            "outfield_home_runs": to_int(payload.get("outfield_home_runs")),
            "visibility_pressure_events": to_int(payload.get("visibility_pressure_events")),
            "source_table": row["source_table"],
            "source_pk": source_pk(row),
            "source_detail_json": detail_json(payload),
            "created_at": utc_now(),
        },
    )


def parse_environment_rows(
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
    for row in fetch_legacy_rows(con, ENVIRONMENT_SOURCE_TABLES, date=date):
        counts["source_rows"] += 1
        counts["source_tables"][row["source_table"]] = counts["source_tables"].get(row["source_table"], 0) + 1
        payload = parse_legacy_json(row)
        parsed_row = parse_sun(row, payload, resolver) if row["source_table"] == "mlb_game_sun_visibility_snapshots" else parse_outcome(row, payload, resolver)
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


def normalize_environment(con: sqlite3.Connection, date: str | None = None, dry_run: bool = False) -> dict[str, Any]:
    con.row_factory = sqlite3.Row
    ensure_environment_schema(con)
    resolver = MlbIdentityResolver(con)
    before_unresolved = con.execute("select count(*) from unresolved_entities").fetchone()[0]
    rows, counts = parse_environment_rows(con, resolver, date=date)
    report = {
        "family": "mlb_environment",
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
