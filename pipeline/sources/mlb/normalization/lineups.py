from __future__ import annotations

import sqlite3
from dataclasses import dataclass
from typing import Any

from .common import (
    MlbIdentityResolver,
    compact_json,
    detail_json,
    fetch_legacy_rows,
    parse_legacy_json,
    stable_id,
    to_float,
    to_int,
    utc_now,
)


LINEUP_SOURCE_TABLES = [
    "mlb_lineup_conversion_shape_daily",
    "mlb_lineup_dependency_profiles",
    "mlb_lineup_pitcher_matchup_daily",
]


@dataclass(frozen=True)
class ParsedRow:
    target_table: str
    source_table: str
    legacy_row_id: str
    values: dict[str, Any]


def ensure_lineup_schema(con: sqlite3.Connection) -> None:
    con.row_factory = sqlite3.Row
    con.executescript(
        """
        create table if not exists lineup_matchup_snapshots (
          lineup_matchup_snapshot_id text primary key,
          game_id text not null,
          team_id text,
          opponent_team_id text,
          hitter_id text not null,
          opposing_pitcher_id text,
          snapshot_date text,
          batting_order integer,
          first_cycle_read real,
          second_cycle_read real,
          collapse_trigger_score real,
          command_stress real,
          damage_fit real,
          pitch_fit_damage real,
          pitch_fit_whiff real,
          traffic_fit real,
          strand_fork_risk real,
          zone_punish real,
          platoon_pressure real,
          details_json text,
          source_table text,
          source_pk text,
          source_detail_json text,
          created_at text not null,
          foreign key (game_id) references games(game_id),
          foreign key (team_id) references teams(team_id),
          foreign key (opponent_team_id) references teams(team_id),
          foreign key (hitter_id) references players(player_id),
          foreign key (opposing_pitcher_id) references players(player_id)
        );
        create index if not exists idx_lineup_matchup_snapshots_game on lineup_matchup_snapshots (game_id, team_id, batting_order);
        create index if not exists idx_lineup_matchup_snapshots_hitter on lineup_matchup_snapshots (hitter_id, snapshot_date);

        create table if not exists lineup_shape_snapshots (
          lineup_shape_snapshot_id text primary key,
          team_id text not null,
          opponent_team_id text,
          snapshot_date text,
          shape_type text not null,
          window_games integer,
          games_sample integer,
          scheduled_series_game_number integer,
          division_matchup_flag integer,
          baserunners_per_game real,
          early_baserunners_per_game real,
          top_order_baserunners_first3_per_game real,
          runs_per_baserunner real,
          early_conversion_rate real,
          top_order_conversion_share real,
          stranded_traffic_rate real,
          traffic_no_conversion_rate real,
          dead_bat_traffic_rate real,
          quiet_first5_rate real,
          conversion_volatility real,
          lineup_conversion_index real,
          avg_players_with_hit real,
          avg_players_with_multi_hit real,
          avg_players_with_two_plus_tb real,
          dependency_score real,
          hit_concentration_index real,
          rbi_concentration_index real,
          total_bases_concentration_index real,
          top2_hit_share real,
          top2_rbi_share real,
          top2_total_bases_share real,
          top3_hit_share real,
          top3_rbi_share real,
          top3_total_bases_share real,
          source_table text,
          source_pk text,
          source_detail_json text,
          created_at text not null,
          foreign key (team_id) references teams(team_id),
          foreign key (opponent_team_id) references teams(team_id)
        );
        create index if not exists idx_lineup_shape_snapshots_team on lineup_shape_snapshots (team_id, snapshot_date, shape_type);
        """
    )


def source_pk(row: sqlite3.Row) -> str:
    return str(row["source_pk"] or row["legacy_row_id"])


def parse_matchup_row(row: sqlite3.Row, payload: dict[str, Any], resolver: MlbIdentityResolver) -> list[ParsedRow]:
    game_id = resolver.game_id_for_pk(payload.get("game_pk"))
    hitter_id = resolver.player_id_by_mlb_id("mlb_lineups", payload.get("hitter_id"), payload.get("hitter_name"))
    pitcher_id = resolver.player_id_by_mlb_id("mlb_lineups", payload.get("pitcher_id"), payload.get("pitcher_name"))
    team_id = resolver.team_id_for_payload("mlb_lineups", game_id, payload.get("team_name"), None)
    opponent_team_id = resolver.team_id_by_name("mlb_lineups", payload.get("opponent_team"))
    if not game_id or not hitter_id:
        resolver.insert_unresolved(
            "mlb_lineup_matchup",
            "mlb_lineups",
            payload.get("game_pk") or payload.get("hitter_id"),
            payload.get("hitter_name") or "unknown hitter",
            {"legacy_row_id": row["legacy_row_id"], "source_table": row["source_table"], "payload": payload},
            "Could not map MLB lineup matchup row to canonical game/hitter.",
        )
        return []
    lineup_id = stable_id("lineup", game_id, team_id, payload.get("snapshot_date"))
    parsed = [
        ParsedRow(
            target_table="lineups",
            source_table=row["source_table"],
            legacy_row_id=row["legacy_row_id"],
            values={
                "lineup_id": lineup_id,
                "game_id": game_id,
                "team_id": team_id,
                "lineup_status": "derived_matchup",
                "captured_at": payload.get("created_at") or payload.get("snapshot_date") or utc_now(),
                "source_snapshot_id": None,
            },
        ),
        ParsedRow(
            target_table="lineup_matchup_snapshots",
            source_table=row["source_table"],
            legacy_row_id=row["legacy_row_id"],
            values={
                "lineup_matchup_snapshot_id": stable_id("lineup-matchup", game_id, hitter_id, pitcher_id, source_pk(row)),
                "game_id": game_id,
                "team_id": team_id,
                "opponent_team_id": opponent_team_id,
                "hitter_id": hitter_id,
                "opposing_pitcher_id": pitcher_id,
                "snapshot_date": payload.get("snapshot_date"),
                "batting_order": to_int(payload.get("batting_order")),
                "first_cycle_read": to_float(payload.get("first_cycle_read")),
                "second_cycle_read": to_float(payload.get("second_cycle_read")),
                "collapse_trigger_score": to_float(payload.get("collapse_trigger_score")),
                "command_stress": to_float(payload.get("command_stress")),
                "damage_fit": to_float(payload.get("damage_fit")),
                "pitch_fit_damage": to_float(payload.get("pitch_fit_damage")),
                "pitch_fit_whiff": to_float(payload.get("pitch_fit_whiff")),
                "traffic_fit": to_float(payload.get("traffic_fit")),
                "strand_fork_risk": to_float(payload.get("strand_fork_risk")),
                "zone_punish": to_float(payload.get("zone_punish")),
                "platoon_pressure": to_float(payload.get("platoon_pressure")),
                "details_json": payload.get("details_json"),
                "source_table": row["source_table"],
                "source_pk": source_pk(row),
                "source_detail_json": detail_json(payload),
                "created_at": utc_now(),
            },
        ),
    ]
    batting_order = to_int(payload.get("batting_order"))
    if batting_order is not None:
        parsed.insert(
            1,
            ParsedRow(
                target_table="lineup_slots",
                source_table=row["source_table"],
                legacy_row_id=row["legacy_row_id"],
                values={
                    "lineup_id": lineup_id,
                    "batting_order": batting_order,
                    "player_id": hitter_id,
                    "position": None,
                },
            ),
        )
    return parsed


def parse_conversion_shape(row: sqlite3.Row, payload: dict[str, Any], resolver: MlbIdentityResolver) -> ParsedRow | None:
    team_id = resolver.team_id_by_name("mlb_lineups", payload.get("team_name"))
    opponent_team_id = resolver.team_id_by_name("mlb_lineups", payload.get("scheduled_opponent"))
    if not team_id:
        resolver.insert_unresolved(
            "mlb_lineup_shape",
            "mlb_lineups",
            payload.get("team_name"),
            payload.get("team_name") or "unknown team",
            {"legacy_row_id": row["legacy_row_id"], "source_table": row["source_table"], "payload": payload},
            "Could not map MLB lineup conversion shape row to canonical team.",
        )
        return None
    return ParsedRow(
        target_table="lineup_shape_snapshots",
        source_table=row["source_table"],
        legacy_row_id=row["legacy_row_id"],
        values={
            "lineup_shape_snapshot_id": stable_id("lineup-shape", "conversion", team_id, payload.get("as_of_date"), payload.get("window_games"), source_pk(row)),
            "team_id": team_id,
            "opponent_team_id": opponent_team_id,
            "snapshot_date": payload.get("as_of_date"),
            "shape_type": "conversion",
            "window_games": to_int(payload.get("window_games")),
            "games_sample": to_int(payload.get("games_sample")),
            "scheduled_series_game_number": to_int(payload.get("scheduled_series_game_number")),
            "division_matchup_flag": to_int(payload.get("division_matchup_flag")),
            "baserunners_per_game": to_float(payload.get("baserunners_per_game")),
            "early_baserunners_per_game": to_float(payload.get("early_baserunners_per_game")),
            "top_order_baserunners_first3_per_game": to_float(payload.get("top_order_baserunners_first3_per_game")),
            "runs_per_baserunner": to_float(payload.get("runs_per_baserunner")),
            "early_conversion_rate": to_float(payload.get("early_conversion_rate")),
            "top_order_conversion_share": to_float(payload.get("top_order_conversion_share")),
            "stranded_traffic_rate": to_float(payload.get("stranded_traffic_rate")),
            "traffic_no_conversion_rate": to_float(payload.get("traffic_no_conversion_rate")),
            "dead_bat_traffic_rate": to_float(payload.get("dead_bat_traffic_rate")),
            "quiet_first5_rate": to_float(payload.get("quiet_first5_rate")),
            "conversion_volatility": to_float(payload.get("conversion_volatility")),
            "lineup_conversion_index": to_float(payload.get("lineup_conversion_index")),
            "avg_players_with_hit": None,
            "avg_players_with_multi_hit": None,
            "avg_players_with_two_plus_tb": None,
            "dependency_score": None,
            "hit_concentration_index": None,
            "rbi_concentration_index": None,
            "total_bases_concentration_index": None,
            "top2_hit_share": None,
            "top2_rbi_share": None,
            "top2_total_bases_share": None,
            "top3_hit_share": None,
            "top3_rbi_share": None,
            "top3_total_bases_share": None,
            "source_table": row["source_table"],
            "source_pk": source_pk(row),
            "source_detail_json": detail_json(payload),
            "created_at": utc_now(),
        },
    )


def parse_dependency_shape(row: sqlite3.Row, payload: dict[str, Any], resolver: MlbIdentityResolver) -> ParsedRow | None:
    team_id = resolver.team_id_by_name("mlb_lineups", payload.get("team_name"))
    if not team_id:
        resolver.insert_unresolved(
            "mlb_lineup_shape",
            "mlb_lineups",
            payload.get("team_name"),
            payload.get("team_name") or "unknown team",
            {"legacy_row_id": row["legacy_row_id"], "source_table": row["source_table"], "payload": payload},
            "Could not map MLB lineup dependency row to canonical team.",
        )
        return None
    return ParsedRow(
        target_table="lineup_shape_snapshots",
        source_table=row["source_table"],
        legacy_row_id=row["legacy_row_id"],
        values={
            "lineup_shape_snapshot_id": stable_id("lineup-shape", "dependency", team_id, payload.get("as_of_date"), payload.get("window_games"), source_pk(row)),
            "team_id": team_id,
            "opponent_team_id": None,
            "snapshot_date": payload.get("as_of_date"),
            "shape_type": "dependency",
            "window_games": to_int(payload.get("window_games")),
            "games_sample": to_int(payload.get("games_sample")),
            "scheduled_series_game_number": None,
            "division_matchup_flag": None,
            "baserunners_per_game": None,
            "early_baserunners_per_game": None,
            "top_order_baserunners_first3_per_game": None,
            "runs_per_baserunner": None,
            "early_conversion_rate": None,
            "top_order_conversion_share": None,
            "stranded_traffic_rate": None,
            "traffic_no_conversion_rate": None,
            "dead_bat_traffic_rate": None,
            "quiet_first5_rate": None,
            "conversion_volatility": None,
            "lineup_conversion_index": None,
            "avg_players_with_hit": to_float(payload.get("avg_players_with_hit")),
            "avg_players_with_multi_hit": to_float(payload.get("avg_players_with_multi_hit")),
            "avg_players_with_two_plus_tb": to_float(payload.get("avg_players_with_two_plus_tb")),
            "dependency_score": to_float(payload.get("dependency_score")),
            "hit_concentration_index": to_float(payload.get("hit_concentration_index")),
            "rbi_concentration_index": to_float(payload.get("rbi_concentration_index")),
            "total_bases_concentration_index": to_float(payload.get("total_bases_concentration_index")),
            "top2_hit_share": to_float(payload.get("top2_hit_share")),
            "top2_rbi_share": to_float(payload.get("top2_rbi_share")),
            "top2_total_bases_share": to_float(payload.get("top2_total_bases_share")),
            "top3_hit_share": to_float(payload.get("top3_hit_share")),
            "top3_rbi_share": to_float(payload.get("top3_rbi_share")),
            "top3_total_bases_share": to_float(payload.get("top3_total_bases_share")),
            "source_table": row["source_table"],
            "source_pk": source_pk(row),
            "source_detail_json": detail_json(payload),
            "created_at": utc_now(),
        },
    )


def parse_lineup_rows(
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
    for row in fetch_legacy_rows(con, LINEUP_SOURCE_TABLES, date=date):
        counts["source_rows"] += 1
        counts["source_tables"][row["source_table"]] = counts["source_tables"].get(row["source_table"], 0) + 1
        payload = parse_legacy_json(row)
        rows: list[ParsedRow] = []
        if row["source_table"] == "mlb_lineup_pitcher_matchup_daily":
            rows = parse_matchup_row(row, payload, resolver)
        elif row["source_table"] == "mlb_lineup_conversion_shape_daily":
            shape = parse_conversion_shape(row, payload, resolver)
            rows = [] if shape is None else [shape]
        elif row["source_table"] == "mlb_lineup_dependency_profiles":
            shape = parse_dependency_shape(row, payload, resolver)
            rows = [] if shape is None else [shape]
        if not rows:
            counts["unparsed_rows"] += 1
            continue
        parsed.extend(rows)
        for parsed_row in rows:
            counts["targets"][parsed_row.target_table] = counts["targets"].get(parsed_row.target_table, 0) + 1
    counts["parsed_rows"] = len(parsed)
    return parsed, counts


def insert_rows(con: sqlite3.Connection, rows: list[ParsedRow]) -> dict[str, int]:
    inserted: dict[str, int] = {}
    for row in rows:
        columns = list(row.values.keys())
        placeholders = ",".join("?" for _ in columns)
        conflict_column = columns[0]
        if row.target_table == "lineup_slots":
            conflict_clause = "lineup_id, batting_order"
            update_columns = ["player_id", "position"]
        else:
            conflict_clause = conflict_column
            update_columns = columns[1:]
        set_clause = ", ".join(f"{column} = excluded.{column}" for column in update_columns)
        sql = f"""
            insert into {row.target_table} ({", ".join(columns)})
            values ({placeholders})
            on conflict({conflict_clause}) do update set {set_clause}
        """
        con.execute(sql, [row.values[column] for column in columns])
        inserted[row.target_table] = inserted.get(row.target_table, 0) + 1
    return inserted


def normalize_lineups(con: sqlite3.Connection, date: str | None = None, dry_run: bool = False) -> dict[str, Any]:
    con.row_factory = sqlite3.Row
    ensure_lineup_schema(con)
    resolver = MlbIdentityResolver(con)
    before_unresolved = con.execute("select count(*) from unresolved_entities").fetchone()[0]
    rows, counts = parse_lineup_rows(con, resolver, date=date)
    report = {
        "family": "mlb_lineups",
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
