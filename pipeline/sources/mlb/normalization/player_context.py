from __future__ import annotations

import sqlite3
from dataclasses import dataclass
from typing import Any

from .common import MlbIdentityResolver, detail_json, fetch_legacy_rows, insert_value_rows, parse_legacy_json, source_pk_for_row, stable_id, to_float, to_int, utc_now


PLAYER_CONTEXT_SOURCE_TABLES = [
    "mlb_hitter_career_profiles",
    "mlb_hitter_split_snapshots",
    "mlb_player_identity_profiles",
    "mlb_player_identity_curves_daily",
    "mlb_pitcher_war_by_season",
    "statcast_hr_leaderboard_snapshots",
]


@dataclass(frozen=True)
class ParsedRow:
    target_table: str
    source_table: str
    legacy_row_id: str
    values: dict[str, Any]


def ensure_player_context_schema(con: sqlite3.Connection) -> None:
    con.row_factory = sqlite3.Row
    con.executescript(
        """
        create table if not exists player_career_profiles (
          player_career_profile_id text primary key,
          player_id text,
          source_player_id text,
          player_name text,
          snapshot_date text,
          debut_year integer,
          latest_mlb_year integer,
          seasons_sample integer,
          career_games integer,
          career_plate_appearances integer,
          career_at_bats integer,
          career_hits integer,
          career_home_runs integer,
          career_total_bases integer,
          career_avg real,
          career_obp real,
          career_slg real,
          career_ops real,
          career_k_rate real,
          career_bb_rate real,
          career_hr_per_pa real,
          career_tb_per_pa real,
          career_power_index real,
          contact_risk_index real,
          role_stability_index real,
          repeatability_label text,
          source_table text,
          source_pk text,
          source_detail_json text,
          created_at text not null,
          foreign key (player_id) references players(player_id)
        );
        create index if not exists idx_player_career_player on player_career_profiles (player_id, snapshot_date);

        create table if not exists player_split_snapshots (
          player_split_snapshot_id text primary key,
          game_id text,
          player_id text,
          team_id text,
          opposing_pitcher_id text,
          snapshot_date text,
          season integer,
          split_type text,
          split_key text,
          opposing_pitcher_hand text,
          batting_order integer,
          plate_appearances integer,
          at_bats integer,
          hits integer,
          home_runs integer,
          doubles integer,
          triples integer,
          singles integer,
          walks integer,
          batting_average real,
          on_base_percentage real,
          slugging_percentage real,
          ops real,
          hit_rate real,
          home_run_rate real,
          singles_rate real,
          total_bases real,
          total_bases_rate real,
          walk_rate real,
          matchup_grade real,
          source_table text,
          source_pk text,
          source_detail_json text,
          created_at text not null,
          foreign key (game_id) references games(game_id),
          foreign key (player_id) references players(player_id),
          foreign key (team_id) references teams(team_id),
          foreign key (opposing_pitcher_id) references players(player_id)
        );
        create index if not exists idx_player_split_player on player_split_snapshots (player_id, snapshot_date, split_key);

        create table if not exists player_identity_profiles (
          player_identity_profile_id text primary key,
          player_id text,
          source_player_id text,
          full_name text,
          first_name text,
          last_name text,
          active integer,
          current_team_id text,
          current_team_name text,
          bat_side text,
          pitch_hand text,
          birth_date text,
          current_age integer,
          mlb_debut_date text,
          draft_year integer,
          height text,
          primary_position_code text,
          primary_position_name text,
          fetched_at text,
          source_table text,
          source_pk text,
          source_detail_json text,
          created_at text not null,
          foreign key (player_id) references players(player_id),
          foreign key (current_team_id) references teams(team_id)
        );
        create index if not exists idx_player_identity_profile_player on player_identity_profiles (player_id);

        create table if not exists player_identity_curves (
          player_identity_curve_id text primary key,
          player_id text,
          snapshot_date text,
          model_family text,
          player_type text,
          metric text,
          sample_size integer,
          season_baseline real,
          career_baseline real,
          identity_value real,
          current_deviation real,
          recent_process real,
          opponent_adjusted_recent real,
          shrinkage_weight real,
          volatility_score real,
          backtest_bucket text,
          feature_json text,
          source_table text,
          source_pk text,
          source_detail_json text,
          created_at text not null,
          foreign key (player_id) references players(player_id)
        );
        create index if not exists idx_player_identity_curves_player on player_identity_curves (player_id, snapshot_date, metric);

        create table if not exists pitcher_season_value_snapshots (
          pitcher_season_value_snapshot_id text primary key,
          player_id text,
          source_player_id text,
          pitcher_name text,
          season integer,
          war real,
          games integer,
          games_started integer,
          team_ids text,
          source text,
          fetched_at text,
          source_table text,
          source_pk text,
          source_detail_json text,
          created_at text not null,
          foreign key (player_id) references players(player_id)
        );
        create index if not exists idx_pitcher_season_value_player on pitcher_season_value_snapshots (player_id, season);

        create table if not exists statcast_hr_leaderboard_snapshots (
          statcast_hr_leaderboard_snapshot_id text primary key,
          player_id text,
          source_player_id text,
          player_name text,
          season integer,
          snapshot_date text,
          team_abbrev text,
          hr_total real,
          xhr real,
          xhr_diff real,
          no_doubters real,
          no_doubter_per real,
          mostly_gone real,
          doubters real,
          avg_hr_trot real,
          source_url text,
          source_table text,
          source_pk text,
          source_detail_json text,
          created_at text not null,
          foreign key (player_id) references players(player_id)
        );
        create index if not exists idx_statcast_hr_player on statcast_hr_leaderboard_snapshots (player_id, snapshot_date);
        """
    )


def player_id(resolver: MlbIdentityResolver, payload: dict[str, Any], name_key: str = "player_name") -> str | None:
    return resolver.player_id_by_mlb_id("mlb_player_context", payload.get("player_id"), payload.get(name_key) or payload.get("full_name") or payload.get("pitcher_name"))


def parse_career(row: sqlite3.Row, payload: dict[str, Any], resolver: MlbIdentityResolver) -> ParsedRow:
    pid = player_id(resolver, payload, "full_name")
    return ParsedRow("player_career_profiles", row["source_table"], row["legacy_row_id"], {
        "player_career_profile_id": stable_id("player-career", source_pk_for_row(row)),
        "player_id": pid,
        "source_player_id": str(payload.get("player_id") or ""),
        "player_name": payload.get("full_name"),
        "snapshot_date": payload.get("fetched_at"),
        "debut_year": to_int(payload.get("debut_year")),
        "latest_mlb_year": to_int(payload.get("latest_mlb_year")),
        "seasons_sample": to_int(payload.get("seasons_sample")),
        "career_games": to_int(payload.get("career_games")),
        "career_plate_appearances": to_int(payload.get("career_plate_appearances")),
        "career_at_bats": to_int(payload.get("career_at_bats")),
        "career_hits": to_int(payload.get("career_hits")),
        "career_home_runs": to_int(payload.get("career_home_runs")),
        "career_total_bases": to_int(payload.get("career_total_bases")),
        "career_avg": to_float(payload.get("career_avg")),
        "career_obp": to_float(payload.get("career_obp")),
        "career_slg": to_float(payload.get("career_slg")),
        "career_ops": to_float(payload.get("career_ops")),
        "career_k_rate": to_float(payload.get("career_k_rate")),
        "career_bb_rate": to_float(payload.get("career_bb_rate")),
        "career_hr_per_pa": to_float(payload.get("career_hr_per_pa")),
        "career_tb_per_pa": to_float(payload.get("career_tb_per_pa")),
        "career_power_index": to_float(payload.get("career_power_index")),
        "contact_risk_index": to_float(payload.get("contact_risk_index")),
        "role_stability_index": to_float(payload.get("role_stability_index")),
        "repeatability_label": payload.get("repeatability_label"),
        "source_table": row["source_table"], "source_pk": source_pk_for_row(row), "source_detail_json": detail_json(payload), "created_at": utc_now(),
    })


def parse_split(row: sqlite3.Row, payload: dict[str, Any], resolver: MlbIdentityResolver) -> ParsedRow:
    pid = player_id(resolver, payload)
    game_id = resolver.game_id_for_teams_date("mlb_player_context", payload.get("snapshot_date"), payload.get("opponent_name"), payload.get("team_name")) if payload.get("game_id") else None
    team_id = resolver.team_id_by_name("mlb_player_context", payload.get("team_name"))
    opp_pitcher_id = resolver.player_id_by_mlb_id("mlb_player_context", payload.get("opposing_pitcher_id"), payload.get("opposing_pitcher_name"))
    return ParsedRow("player_split_snapshots", row["source_table"], row["legacy_row_id"], {
        "player_split_snapshot_id": stable_id("player-split", source_pk_for_row(row)),
        "game_id": game_id,
        "player_id": pid,
        "team_id": team_id,
        "opposing_pitcher_id": opp_pitcher_id,
        "snapshot_date": payload.get("snapshot_date"),
        "season": to_int(payload.get("season")),
        "split_type": "platoon",
        "split_key": payload.get("split_key"),
        "opposing_pitcher_hand": payload.get("opposing_pitcher_hand"),
        "batting_order": to_int(payload.get("batting_order")),
        "plate_appearances": to_int(payload.get("plate_appearances")),
        "at_bats": to_int(payload.get("at_bats")),
        "hits": to_int(payload.get("hits")),
        "home_runs": to_int(payload.get("home_runs")),
        "doubles": to_int(payload.get("doubles")),
        "triples": to_int(payload.get("triples")),
        "singles": to_int(payload.get("singles")),
        "walks": to_int(payload.get("walks")),
        "batting_average": to_float(payload.get("batting_average")),
        "on_base_percentage": to_float(payload.get("on_base_percentage")),
        "slugging_percentage": to_float(payload.get("slugging_percentage")),
        "ops": to_float(payload.get("ops")),
        "hit_rate": to_float(payload.get("hit_rate")),
        "home_run_rate": to_float(payload.get("home_run_rate")),
        "singles_rate": to_float(payload.get("singles_rate")),
        "total_bases": to_float(payload.get("total_bases")),
        "total_bases_rate": to_float(payload.get("total_bases_rate")),
        "walk_rate": to_float(payload.get("walk_rate")),
        "matchup_grade": to_float(payload.get("matchup_grade")),
        "source_table": row["source_table"], "source_pk": source_pk_for_row(row), "source_detail_json": detail_json(payload), "created_at": utc_now(),
    })


def parse_identity_profile(row: sqlite3.Row, payload: dict[str, Any], resolver: MlbIdentityResolver) -> ParsedRow:
    pid = player_id(resolver, payload, "full_name")
    current_team_id = resolver.team_id_by_name("mlb_player_context", payload.get("current_team_name"))
    return ParsedRow("player_identity_profiles", row["source_table"], row["legacy_row_id"], {
        "player_identity_profile_id": stable_id("player-identity-profile", source_pk_for_row(row)),
        "player_id": pid, "source_player_id": str(payload.get("player_id") or ""), "full_name": payload.get("full_name"),
        "first_name": payload.get("first_name"), "last_name": payload.get("last_name"), "active": to_int(payload.get("active")),
        "current_team_id": current_team_id, "current_team_name": payload.get("current_team_name"), "bat_side": payload.get("bat_side"),
        "pitch_hand": payload.get("pitch_hand"), "birth_date": payload.get("birth_date"), "current_age": to_int(payload.get("current_age")),
        "mlb_debut_date": payload.get("mlb_debut_date"), "draft_year": to_int(payload.get("draft_year")), "height": payload.get("height"),
        "primary_position_code": payload.get("primary_position_code"), "primary_position_name": payload.get("primary_position_name"),
        "fetched_at": payload.get("fetched_at"), "source_table": row["source_table"], "source_pk": source_pk_for_row(row),
        "source_detail_json": detail_json(payload), "created_at": utc_now(),
    })


def parse_identity_curve(row: sqlite3.Row, payload: dict[str, Any], resolver: MlbIdentityResolver) -> ParsedRow:
    pid = player_id(resolver, payload)
    return ParsedRow("player_identity_curves", row["source_table"], row["legacy_row_id"], {
        "player_identity_curve_id": stable_id("player-identity-curve", source_pk_for_row(row)),
        "player_id": pid, "snapshot_date": payload.get("snapshot_date"), "model_family": payload.get("model_family"),
        "player_type": payload.get("player_type"), "metric": payload.get("metric"), "sample_size": to_int(payload.get("sample_size")),
        "season_baseline": to_float(payload.get("season_baseline")), "career_baseline": to_float(payload.get("career_baseline")),
        "identity_value": to_float(payload.get("identity_value")), "current_deviation": to_float(payload.get("current_deviation")),
        "recent_process": to_float(payload.get("recent_process")), "opponent_adjusted_recent": to_float(payload.get("opponent_adjusted_recent")),
        "shrinkage_weight": to_float(payload.get("shrinkage_weight")), "volatility_score": to_float(payload.get("volatility_score")),
        "backtest_bucket": payload.get("backtest_bucket"), "feature_json": payload.get("feature_json"),
        "source_table": row["source_table"], "source_pk": source_pk_for_row(row), "source_detail_json": detail_json(payload), "created_at": utc_now(),
    })


def parse_pitcher_value(row: sqlite3.Row, payload: dict[str, Any], resolver: MlbIdentityResolver) -> ParsedRow:
    pid = player_id(resolver, payload, "pitcher_name")
    return ParsedRow("pitcher_season_value_snapshots", row["source_table"], row["legacy_row_id"], {
        "pitcher_season_value_snapshot_id": stable_id("pitcher-season-value", source_pk_for_row(row)),
        "player_id": pid, "source_player_id": str(payload.get("pitcher_id") or ""), "pitcher_name": payload.get("pitcher_name"),
        "season": to_int(payload.get("season")), "war": to_float(payload.get("war")), "games": to_int(payload.get("games")),
        "games_started": to_int(payload.get("games_started")), "team_ids": payload.get("team_ids"), "source": payload.get("source"),
        "fetched_at": payload.get("fetched_at"), "source_table": row["source_table"], "source_pk": source_pk_for_row(row),
        "source_detail_json": detail_json(payload), "created_at": utc_now(),
    })


def parse_hr_leaderboard(row: sqlite3.Row, payload: dict[str, Any], resolver: MlbIdentityResolver) -> ParsedRow:
    pid = player_id(resolver, payload)
    return ParsedRow("statcast_hr_leaderboard_snapshots", row["source_table"], row["legacy_row_id"], {
        "statcast_hr_leaderboard_snapshot_id": stable_id("statcast-hr", source_pk_for_row(row)),
        "player_id": pid, "source_player_id": str(payload.get("player_id") or ""), "player_name": payload.get("player_name"),
        "season": to_int(payload.get("season")), "snapshot_date": payload.get("snapshot_date"), "team_abbrev": payload.get("team_abbrev"),
        "hr_total": to_float(payload.get("hr_total")), "xhr": to_float(payload.get("xhr")), "xhr_diff": to_float(payload.get("xhr_diff")),
        "no_doubters": to_float(payload.get("no_doubters")), "no_doubter_per": to_float(payload.get("no_doubter_per")),
        "mostly_gone": to_float(payload.get("mostly_gone")), "doubters": to_float(payload.get("doubters")), "avg_hr_trot": to_float(payload.get("avg_hr_trot")),
        "source_url": payload.get("source_url"), "source_table": row["source_table"], "source_pk": source_pk_for_row(row),
        "source_detail_json": detail_json(payload), "created_at": utc_now(),
    })


PARSERS = {
    "mlb_hitter_career_profiles": parse_career,
    "mlb_hitter_split_snapshots": parse_split,
    "mlb_player_identity_profiles": parse_identity_profile,
    "mlb_player_identity_curves_daily": parse_identity_curve,
    "mlb_pitcher_war_by_season": parse_pitcher_value,
    "statcast_hr_leaderboard_snapshots": parse_hr_leaderboard,
}


def parse_player_context_rows(con: sqlite3.Connection, resolver: MlbIdentityResolver, date: str | None = None) -> tuple[list[ParsedRow], dict[str, Any]]:
    parsed: list[ParsedRow] = []
    counts: dict[str, Any] = {"source_rows": 0, "parsed_rows": 0, "unparsed_rows": 0, "source_tables": {}, "targets": {}}
    for row in fetch_legacy_rows(con, PLAYER_CONTEXT_SOURCE_TABLES, date=date):
        counts["source_rows"] += 1
        counts["source_tables"][row["source_table"]] = counts["source_tables"].get(row["source_table"], 0) + 1
        parser = PARSERS.get(row["source_table"])
        parsed_row = parser(row, parse_legacy_json(row), resolver) if parser else None
        if parsed_row is None:
            counts["unparsed_rows"] += 1
            continue
        parsed.append(parsed_row)
        counts["targets"][parsed_row.target_table] = counts["targets"].get(parsed_row.target_table, 0) + 1
    counts["parsed_rows"] = len(parsed)
    return parsed, counts


def normalize_player_context(con: sqlite3.Connection, date: str | None = None, dry_run: bool = False) -> dict[str, Any]:
    con.row_factory = sqlite3.Row
    ensure_player_context_schema(con)
    resolver = MlbIdentityResolver(con)
    before_unresolved = con.execute("select count(*) from unresolved_entities").fetchone()[0]
    rows, counts = parse_player_context_rows(con, resolver, date=date)
    report = {"family": "mlb_player_context", "date": date, "dry_run": dry_run, **counts, "inserted": {}, "unresolved_rows_added": 0}
    if not dry_run:
        report["inserted"] = insert_value_rows(con, [(row.target_table, row.values) for row in rows])
        con.commit()
    after_unresolved = con.execute("select count(*) from unresolved_entities").fetchone()[0]
    report["unresolved_rows_added"] = after_unresolved - before_unresolved
    if dry_run:
        con.rollback()
    return report
