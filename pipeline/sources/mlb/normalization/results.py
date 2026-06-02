from __future__ import annotations

import sqlite3
from dataclasses import dataclass
from typing import Any

from .common import (
    MlbIdentityResolver,
    add_column_if_missing,
    detail_json,
    fetch_legacy_rows,
    parse_legacy_json,
    stable_id,
    to_float,
    to_int,
    utc_now,
)


RESULT_SOURCE_TABLES = [
    "mlb_batter_game_outcomes",
    "mlb_game_outcomes",
    "mlb_game_team_stats",
    "mlb_home_run_events",
    "mlb_phase_outcomes_daily",
    "mlb_pitcher_appearances",
    "mlb_player_game_batting",
    "mlb_starting_pitcher_game_logs",
]


@dataclass(frozen=True)
class ParsedRow:
    target_table: str
    source_table: str
    legacy_row_id: str
    values: dict[str, Any]


def ensure_results_schema(con: sqlite3.Connection) -> None:
    con.row_factory = sqlite3.Row
    for column, ddl in {
        "home_hits": "integer",
        "away_hits": "integer",
        "home_hits_first5": "integer",
        "away_hits_first5": "integer",
        "home_home_runs": "integer",
        "away_home_runs": "integer",
        "home_home_runs_first5": "integer",
        "away_home_runs_first5": "integer",
        "home_first5_result": "text",
        "away_first5_result": "text",
        "home_full_game_result": "text",
        "away_full_game_result": "text",
        "home_bullpen_run_diff": "integer",
        "source_table": "text",
        "source_pk": "text",
        "source_detail_json": "text",
        "updated_at": "text",
    }.items():
        add_column_if_missing(con, "game_outcomes", column, ddl)

    con.executescript(
        """
        create table if not exists team_game_stats (
          team_game_stat_id text primary key,
          game_id text not null,
          team_id text not null,
          opponent_team_id text,
          game_date text,
          team_role text,
          result text,
          first5_result text,
          runs_scored integer,
          runs_allowed integer,
          runs_scored_first5 integer,
          runs_allowed_first5 integer,
          bullpen_runs_scored integer,
          bullpen_runs_allowed integer,
          hits integer,
          hits_first5 integer,
          hits_allowed integer,
          hits_allowed_first5 integer,
          home_runs integer,
          home_runs_first5 integer,
          home_runs_allowed integer,
          home_runs_allowed_first5 integer,
          at_bats integer,
          at_bats_first5 integer,
          plate_appearances integer,
          plate_appearances_first5 integer,
          walks integer,
          walks_allowed integer,
          strikeouts integer,
          strikeouts_recorded integer,
          total_bases integer,
          left_on_base integer,
          source_table text,
          source_pk text,
          source_detail_json text,
          created_at text not null,
          foreign key (game_id) references games(game_id),
          foreign key (team_id) references teams(team_id),
          foreign key (opponent_team_id) references teams(team_id)
        );
        create index if not exists idx_team_game_stats_game on team_game_stats (game_id, team_id);
        create index if not exists idx_team_game_stats_date on team_game_stats (game_date, team_id);

        create table if not exists player_game_batting (
          player_game_batting_id text primary key,
          game_id text not null,
          team_id text,
          opponent_team_id text,
          player_id text not null,
          game_date text,
          team_role text,
          batting_order integer,
          position_abbrev text,
          plate_appearances integer,
          at_bats integer,
          hits integer,
          singles integer,
          doubles integer,
          triples integer,
          home_runs integer,
          total_bases integer,
          walks integer,
          strikeouts integer,
          runs integer,
          rbi integer,
          stolen_bases integer,
          caught_stealing integer,
          hit_by_pitch integer,
          sac_bunts integer,
          sac_flies integer,
          ground_into_double_play integer,
          left_on_base integer,
          summary text,
          source_table text,
          source_pk text,
          source_detail_json text,
          created_at text not null,
          foreign key (game_id) references games(game_id),
          foreign key (team_id) references teams(team_id),
          foreign key (opponent_team_id) references teams(team_id),
          foreign key (player_id) references players(player_id)
        );
        create index if not exists idx_player_game_batting_game on player_game_batting (game_id, player_id);
        create index if not exists idx_player_game_batting_date on player_game_batting (game_date, player_id);

        create table if not exists batter_game_outcomes (
          batter_game_outcome_id text primary key,
          game_id text not null,
          team_id text,
          opponent_team_id text,
          player_id text not null,
          game_date text,
          team_role text,
          batting_order integer,
          position_abbrev text,
          plate_appearances integer,
          at_bats integer,
          hits integer,
          singles integer,
          doubles integer,
          triples integer,
          home_runs integer,
          total_bases integer,
          walks integer,
          strikeouts integer,
          runs integer,
          rbi integer,
          stolen_bases integer,
          caught_stealing integer,
          hit_by_pitch integer,
          hit_run_rbi_total integer,
          source_table text,
          source_pk text,
          source_detail_json text,
          created_at text not null,
          foreign key (game_id) references games(game_id),
          foreign key (team_id) references teams(team_id),
          foreign key (opponent_team_id) references teams(team_id),
          foreign key (player_id) references players(player_id)
        );
        create index if not exists idx_batter_game_outcomes_game on batter_game_outcomes (game_id, player_id);
        create index if not exists idx_batter_game_outcomes_date on batter_game_outcomes (game_date, player_id);

        create table if not exists pitcher_appearances (
          pitcher_appearance_id text primary key,
          game_id text not null,
          team_id text,
          opponent_team_id text,
          pitcher_id text not null,
          game_date text,
          team_role text,
          pitcher_role text,
          is_starting_pitcher integer,
          innings_pitched real,
          outs_recorded integer,
          batters_faced integer,
          pitches_thrown integer,
          strikes_thrown integer,
          runs_allowed integer,
          earned_runs integer,
          hits_allowed integer,
          home_runs_allowed integer,
          walks_allowed integer,
          strikeouts integer,
          pitch_hand text,
          source_table text,
          source_pk text,
          source_detail_json text,
          created_at text not null,
          foreign key (game_id) references games(game_id),
          foreign key (team_id) references teams(team_id),
          foreign key (opponent_team_id) references teams(team_id),
          foreign key (pitcher_id) references players(player_id)
        );
        create index if not exists idx_pitcher_appearances_game on pitcher_appearances (game_id, pitcher_id);
        create index if not exists idx_pitcher_appearances_date on pitcher_appearances (game_date, pitcher_id);

        create table if not exists starting_pitcher_game_logs (
          starting_pitcher_game_log_id text primary key,
          game_id text not null,
          team_id text,
          opponent_team_id text,
          pitcher_id text not null,
          game_date text,
          team_role text,
          innings_pitched real,
          outs_recorded integer,
          batters_faced integer,
          pitches_thrown integer,
          strikes_thrown integer,
          runs_allowed integer,
          earned_runs integer,
          hits_allowed integer,
          home_runs_allowed integer,
          walks_allowed integer,
          strikeouts integer,
          pitch_hand text,
          source_table text,
          source_pk text,
          source_detail_json text,
          created_at text not null,
          foreign key (game_id) references games(game_id),
          foreign key (team_id) references teams(team_id),
          foreign key (opponent_team_id) references teams(team_id),
          foreign key (pitcher_id) references players(player_id)
        );
        create index if not exists idx_starting_pitcher_game_logs_game on starting_pitcher_game_logs (game_id, pitcher_id);
        create index if not exists idx_starting_pitcher_game_logs_date on starting_pitcher_game_logs (game_date, pitcher_id);

        create table if not exists home_run_events (
          home_run_event_id text primary key,
          game_id text not null,
          game_date text,
          event_key text,
          inning integer,
          half_inning text,
          batting_team_id text,
          fielding_team_id text,
          batter_id text,
          pitcher_id text,
          batter_name text,
          pitcher_name text,
          description text,
          rbi integer,
          away_score integer,
          home_score integer,
          statcast_play_id text,
          source_table text,
          source_pk text,
          source_detail_json text,
          created_at text not null,
          foreign key (game_id) references games(game_id),
          foreign key (batting_team_id) references teams(team_id),
          foreign key (fielding_team_id) references teams(team_id),
          foreign key (batter_id) references players(player_id),
          foreign key (pitcher_id) references players(player_id)
        );
        create index if not exists idx_home_run_events_game on home_run_events (game_id, inning);
        create index if not exists idx_home_run_events_batter on home_run_events (batter_id, game_date);

        create table if not exists phase_outcomes (
          phase_outcome_id text primary key,
          game_id text not null,
          team_id text not null,
          opponent_team_id text,
          game_date text,
          team_role text,
          result text,
          runs_first1 integer,
          runs_first3 integer,
          runs_first5 integer,
          runs_late integer,
          hits_first5 integer,
          hits_late integer,
          scored_first_inning_flag integer,
          allowed_first_inning_flag integer,
          scoreless_first3_flag integer,
          starter_cracked_flag integer,
          starter_survived5_flag integer,
          led_after3_flag integer,
          tied_after3_flag integer,
          trailed_after3_flag integer,
          led_after5_flag integer,
          tied_after5_flag integer,
          trailed_after5_flag integer,
          won_first5_flag integer,
          first5_push_flag integer,
          won_full_game_flag integer,
          comeback_win_flag integer,
          blew_lead_after5_flag integer,
          bullpen_flip_game_flag integer,
          traffic_no_conversion_flag integer,
          phase_path_label text,
          phase_flags_json text,
          source_table text,
          source_pk text,
          source_detail_json text,
          created_at text not null,
          foreign key (game_id) references games(game_id),
          foreign key (team_id) references teams(team_id),
          foreign key (opponent_team_id) references teams(team_id)
        );
        create index if not exists idx_phase_outcomes_game on phase_outcomes (game_id, team_id);
        create index if not exists idx_phase_outcomes_date on phase_outcomes (game_date, team_id);
        """
    )


def source_pk(row: sqlite3.Row) -> str:
    return str(row["source_pk"] or row["legacy_row_id"])


def parse_game_outcome(row: sqlite3.Row, payload: dict[str, Any], resolver: MlbIdentityResolver) -> ParsedRow | None:
    game_id = resolver.game_id_for_pk(payload.get("game_pk"))
    if not game_id:
        resolver.insert_unresolved(
            "mlb_result_game",
            "mlb_results",
            payload.get("game_pk"),
            payload.get("game_pk"),
            {"legacy_row_id": row["legacy_row_id"], "source_table": row["source_table"], "payload": payload},
            "Could not map MLB game outcome to canonical game.",
        )
        return None
    game = resolver.games_by_id[game_id]
    home_runs = to_int(payload.get("home_runs_final"))
    away_runs = to_int(payload.get("away_runs_final"))
    winner_team_id = None
    if home_runs is not None and away_runs is not None:
        if home_runs > away_runs:
            winner_team_id = game["home_team_id"]
        elif away_runs > home_runs:
            winner_team_id = game["away_team_id"]
    return ParsedRow(
        target_table="game_outcomes",
        source_table=row["source_table"],
        legacy_row_id=row["legacy_row_id"],
        values={
            "game_id": game_id,
            "home_runs": home_runs,
            "away_runs": away_runs,
            "total_runs": to_int(payload.get("total_runs_final")),
            "f5_home_runs": to_int(payload.get("home_runs_first5")),
            "f5_away_runs": to_int(payload.get("away_runs_first5")),
            "f5_total_runs": to_int(payload.get("total_runs_first5")),
            "winner_team_id": winner_team_id,
            "completed_at": payload.get("game_date"),
            "home_hits": to_int(payload.get("home_hits_final")),
            "away_hits": to_int(payload.get("away_hits_final")),
            "home_hits_first5": to_int(payload.get("home_hits_first5")),
            "away_hits_first5": to_int(payload.get("away_hits_first5")),
            "home_home_runs": to_int(payload.get("home_home_runs_final")),
            "away_home_runs": to_int(payload.get("away_home_runs_final")),
            "home_home_runs_first5": to_int(payload.get("home_home_runs_first5")),
            "away_home_runs_first5": to_int(payload.get("away_home_runs_first5")),
            "home_first5_result": payload.get("home_first5_result"),
            "away_first5_result": _opposite_result(payload.get("home_first5_result")),
            "home_full_game_result": payload.get("home_full_game_result"),
            "away_full_game_result": _opposite_result(payload.get("home_full_game_result")),
            "home_bullpen_run_diff": to_int(payload.get("home_bullpen_run_diff")),
            "source_table": row["source_table"],
            "source_pk": source_pk(row),
            "source_detail_json": detail_json(payload),
            "updated_at": utc_now(),
        },
    )


def _opposite_result(value: Any) -> str | None:
    text = str(value or "").strip().upper()
    if text == "W":
        return "L"
    if text == "L":
        return "W"
    if text:
        return text
    return None


def parse_team_game_stat(row: sqlite3.Row, payload: dict[str, Any], resolver: MlbIdentityResolver) -> ParsedRow | None:
    game_id = resolver.game_id_for_pk(payload.get("game_pk"))
    team_id = resolver.team_id_for_payload("mlb_results", game_id, payload.get("team_name"), payload.get("team_role"))
    opponent_team_id = resolver.opponent_team_id_for_payload("mlb_results", game_id, payload.get("opponent_name"), payload.get("team_role"))
    if not game_id or not team_id:
        resolver.insert_unresolved(
            "mlb_result_team",
            "mlb_results",
            payload.get("game_pk"),
            payload.get("team_name") or "unknown team",
            {"legacy_row_id": row["legacy_row_id"], "source_table": row["source_table"], "payload": payload},
            "Could not map MLB team stat row to canonical game/team.",
        )
        return None
    return ParsedRow(
        target_table="team_game_stats",
        source_table=row["source_table"],
        legacy_row_id=row["legacy_row_id"],
        values={
            "team_game_stat_id": stable_id("team-game-stats", game_id, team_id, source_pk(row)),
            "game_id": game_id,
            "team_id": team_id,
            "opponent_team_id": opponent_team_id,
            "game_date": payload.get("game_date"),
            "team_role": payload.get("team_role"),
            "result": payload.get("full_game_result"),
            "first5_result": payload.get("first5_result"),
            "runs_scored": to_int(payload.get("runs_scored")),
            "runs_allowed": to_int(payload.get("runs_allowed")),
            "runs_scored_first5": to_int(payload.get("runs_scored_first5")),
            "runs_allowed_first5": to_int(payload.get("runs_allowed_first5")),
            "bullpen_runs_scored": to_int(payload.get("bullpen_runs_scored")),
            "bullpen_runs_allowed": to_int(payload.get("bullpen_runs_allowed")),
            "hits": to_int(payload.get("hits")),
            "hits_first5": to_int(payload.get("hits_first5")),
            "hits_allowed": to_int(payload.get("hits_allowed")),
            "hits_allowed_first5": to_int(payload.get("hits_allowed_first5")),
            "home_runs": to_int(payload.get("home_runs")),
            "home_runs_first5": to_int(payload.get("home_runs_first5")),
            "home_runs_allowed": to_int(payload.get("home_runs_allowed")),
            "home_runs_allowed_first5": to_int(payload.get("home_runs_allowed_first5")),
            "at_bats": to_int(payload.get("at_bats")),
            "at_bats_first5": to_int(payload.get("at_bats_first5")),
            "plate_appearances": to_int(payload.get("plate_appearances")),
            "plate_appearances_first5": to_int(payload.get("plate_appearances_first5")),
            "walks": to_int(payload.get("walks")),
            "walks_allowed": to_int(payload.get("walks_allowed")),
            "strikeouts": to_int(payload.get("strikeouts")),
            "strikeouts_recorded": to_int(payload.get("strikeouts_recorded")),
            "total_bases": to_int(payload.get("total_bases")),
            "left_on_base": to_int(payload.get("left_on_base")),
            "source_table": row["source_table"],
            "source_pk": source_pk(row),
            "source_detail_json": detail_json(payload),
            "created_at": utc_now(),
        },
    )


def parse_batter_row(
    row: sqlite3.Row,
    payload: dict[str, Any],
    resolver: MlbIdentityResolver,
    target_table: str,
) -> ParsedRow | None:
    game_id = resolver.game_id_for_pk(payload.get("game_pk"))
    player_id = resolver.player_id_by_mlb_id("mlb_results", payload.get("player_id"), payload.get("player_name"))
    team_id = resolver.team_id_for_payload("mlb_results", game_id, payload.get("team_name"), payload.get("team_role"))
    opponent_team_id = resolver.opponent_team_id_for_payload("mlb_results", game_id, payload.get("opponent_name"), payload.get("team_role"))
    if not game_id or not player_id:
        resolver.insert_unresolved(
            "mlb_result_batter",
            "mlb_results",
            payload.get("player_id") or payload.get("game_pk"),
            payload.get("player_name") or "unknown batter",
            {"legacy_row_id": row["legacy_row_id"], "source_table": row["source_table"], "payload": payload},
            "Could not map MLB batter result row to canonical game/player.",
        )
        return None
    id_field = "player_game_batting_id" if target_table == "player_game_batting" else "batter_game_outcome_id"
    values = {
        id_field: stable_id(target_table, game_id, player_id, source_pk(row)),
        "game_id": game_id,
        "team_id": team_id,
        "opponent_team_id": opponent_team_id,
        "player_id": player_id,
        "game_date": payload.get("game_date"),
        "team_role": payload.get("team_role"),
        "batting_order": to_int(payload.get("batting_order")),
        "position_abbrev": payload.get("position_abbrev"),
        "plate_appearances": to_int(payload.get("plate_appearances")),
        "at_bats": to_int(payload.get("at_bats")),
        "hits": to_int(payload.get("hits")),
        "singles": to_int(payload.get("singles")),
        "doubles": to_int(payload.get("doubles")),
        "triples": to_int(payload.get("triples")),
        "home_runs": to_int(payload.get("home_runs")),
        "total_bases": to_int(payload.get("total_bases")),
        "walks": to_int(payload.get("walks")),
        "strikeouts": to_int(payload.get("strikeouts")),
        "runs": to_int(payload.get("runs")),
        "rbi": to_int(payload.get("rbi")),
        "stolen_bases": to_int(payload.get("stolen_bases")),
        "caught_stealing": to_int(payload.get("caught_stealing")),
        "hit_by_pitch": to_int(payload.get("hit_by_pitch")),
        "source_table": row["source_table"],
        "source_pk": source_pk(row),
        "source_detail_json": detail_json(payload),
        "created_at": utc_now(),
    }
    if target_table == "player_game_batting":
        values.update(
            {
                "sac_bunts": to_int(payload.get("sac_bunts")),
                "sac_flies": to_int(payload.get("sac_flies")),
                "ground_into_double_play": to_int(payload.get("ground_into_double_play")),
                "left_on_base": to_int(payload.get("left_on_base")),
                "summary": payload.get("summary"),
            }
        )
    else:
        values["hit_run_rbi_total"] = to_int(payload.get("hit_run_rbi_total"))
    return ParsedRow(target_table=target_table, source_table=row["source_table"], legacy_row_id=row["legacy_row_id"], values=values)


def parse_pitcher_row(
    row: sqlite3.Row,
    payload: dict[str, Any],
    resolver: MlbIdentityResolver,
    target_table: str,
) -> ParsedRow | None:
    game_id = resolver.game_id_for_pk(payload.get("game_pk"))
    pitcher_id = resolver.player_id_by_mlb_id("mlb_results", payload.get("pitcher_id"), payload.get("pitcher_name"))
    team_id = resolver.team_id_for_payload("mlb_results", game_id, payload.get("team_name"), payload.get("team_role"))
    opponent_team_id = resolver.opponent_team_id_for_payload("mlb_results", game_id, payload.get("opponent_name"), payload.get("team_role"))
    if not game_id or not pitcher_id:
        resolver.insert_unresolved(
            "mlb_result_pitcher",
            "mlb_results",
            payload.get("pitcher_id") or payload.get("game_pk"),
            payload.get("pitcher_name") or "unknown pitcher",
            {"legacy_row_id": row["legacy_row_id"], "source_table": row["source_table"], "payload": payload},
            "Could not map MLB pitcher result row to canonical game/player.",
        )
        return None
    if target_table == "pitcher_appearances":
        id_field = "pitcher_appearance_id"
        stable_prefix = "pitcher-appearance"
    else:
        id_field = "starting_pitcher_game_log_id"
        stable_prefix = "starting-pitcher-game-log"
    values = {
        id_field: stable_id(stable_prefix, game_id, pitcher_id, source_pk(row)),
        "game_id": game_id,
        "team_id": team_id,
        "opponent_team_id": opponent_team_id,
        "pitcher_id": pitcher_id,
        "game_date": payload.get("game_date"),
        "team_role": payload.get("team_role"),
        "innings_pitched": to_float(payload.get("innings_pitched")),
        "outs_recorded": to_int(payload.get("outs_recorded")),
        "batters_faced": to_int(payload.get("batters_faced")),
        "pitches_thrown": to_int(payload.get("pitches_thrown")),
        "strikes_thrown": to_int(payload.get("strikes_thrown")),
        "runs_allowed": to_int(payload.get("runs_allowed")),
        "earned_runs": to_int(payload.get("earned_runs")),
        "hits_allowed": to_int(payload.get("hits_allowed")),
        "home_runs_allowed": to_int(payload.get("home_runs_allowed")),
        "walks_allowed": to_int(payload.get("walks_allowed")),
        "strikeouts": to_int(payload.get("strikeouts")),
        "pitch_hand": payload.get("pitch_hand"),
        "source_table": row["source_table"],
        "source_pk": source_pk(row),
        "source_detail_json": detail_json(payload),
        "created_at": utc_now(),
    }
    if target_table == "pitcher_appearances":
        values["pitcher_role"] = payload.get("pitcher_role")
        values["is_starting_pitcher"] = to_int(payload.get("is_starting_pitcher"))
    return ParsedRow(target_table=target_table, source_table=row["source_table"], legacy_row_id=row["legacy_row_id"], values=values)


def parse_home_run_event(row: sqlite3.Row, payload: dict[str, Any], resolver: MlbIdentityResolver) -> ParsedRow | None:
    game_id = resolver.game_id_for_pk(payload.get("game_pk"))
    if not game_id:
        resolver.insert_unresolved(
            "mlb_result_home_run",
            "mlb_results",
            payload.get("game_pk"),
            payload.get("event_key") or "unknown HR event",
            {"legacy_row_id": row["legacy_row_id"], "source_table": row["source_table"], "payload": payload},
            "Could not map MLB home run event to canonical game.",
        )
        return None
    batter_id = resolver.player_id_by_mlb_id("mlb_results", payload.get("batter_id"), payload.get("batter_name"))
    pitcher_id = resolver.player_id_by_mlb_id("mlb_results", payload.get("pitcher_id"), payload.get("pitcher_name"))
    batting_team_id = resolver.team_id_by_name("mlb_results", payload.get("batting_team"))
    fielding_team_id = resolver.team_id_by_name("mlb_results", payload.get("fielding_team"))
    return ParsedRow(
        target_table="home_run_events",
        source_table=row["source_table"],
        legacy_row_id=row["legacy_row_id"],
        values={
            "home_run_event_id": stable_id("home-run-event", game_id, payload.get("event_key"), source_pk(row)),
            "game_id": game_id,
            "game_date": payload.get("game_date"),
            "event_key": payload.get("event_key"),
            "inning": to_int(payload.get("inning")),
            "half_inning": payload.get("half_inning"),
            "batting_team_id": batting_team_id,
            "fielding_team_id": fielding_team_id,
            "batter_id": batter_id,
            "pitcher_id": pitcher_id,
            "batter_name": payload.get("batter_name"),
            "pitcher_name": payload.get("pitcher_name"),
            "description": payload.get("description"),
            "rbi": to_int(payload.get("rbi")),
            "away_score": to_int(payload.get("away_score")),
            "home_score": to_int(payload.get("home_score")),
            "statcast_play_id": payload.get("statcast_play_id"),
            "source_table": row["source_table"],
            "source_pk": source_pk(row),
            "source_detail_json": detail_json(payload),
            "created_at": utc_now(),
        },
    )


PHASE_FLAG_FIELDS = [
    "scored_first_inning_flag",
    "allowed_first_inning_flag",
    "scoreless_first3_flag",
    "starter_cracked_flag",
    "starter_survived5_flag",
    "led_after3_flag",
    "tied_after3_flag",
    "trailed_after3_flag",
    "led_after5_flag",
    "tied_after5_flag",
    "trailed_after5_flag",
    "won_first5_flag",
    "first5_push_flag",
    "won_full_game_flag",
    "comeback_win_flag",
    "blew_lead_after5_flag",
    "bullpen_flip_game_flag",
    "traffic_no_conversion_flag",
]


def parse_phase_outcome(row: sqlite3.Row, payload: dict[str, Any], resolver: MlbIdentityResolver) -> ParsedRow | None:
    game_id = resolver.game_id_for_pk(payload.get("game_pk"))
    team_id = resolver.team_id_for_payload("mlb_results", game_id, payload.get("team_name"), payload.get("team_role"))
    opponent_team_id = resolver.opponent_team_id_for_payload("mlb_results", game_id, payload.get("opponent_team"), payload.get("team_role"))
    if not game_id or not team_id:
        resolver.insert_unresolved(
            "mlb_result_phase",
            "mlb_results",
            payload.get("game_pk"),
            payload.get("team_name") or "unknown team",
            {"legacy_row_id": row["legacy_row_id"], "source_table": row["source_table"], "payload": payload},
            "Could not map MLB phase row to canonical game/team.",
        )
        return None
    values = {
        "phase_outcome_id": stable_id("phase-outcome", game_id, team_id, source_pk(row)),
        "game_id": game_id,
        "team_id": team_id,
        "opponent_team_id": opponent_team_id,
        "game_date": payload.get("game_date"),
        "team_role": payload.get("team_role"),
        "result": payload.get("result"),
        "runs_first1": to_int(payload.get("runs_first1")),
        "runs_first3": to_int(payload.get("runs_first3")),
        "runs_first5": to_int(payload.get("runs_first5")),
        "runs_late": to_int(payload.get("runs_late")),
        "hits_first5": to_int(payload.get("hits_first5")),
        "hits_late": to_int(payload.get("hits_late")),
        "phase_path_label": payload.get("phase_path_label"),
        "phase_flags_json": payload.get("phase_flags_json"),
        "source_table": row["source_table"],
        "source_pk": source_pk(row),
        "source_detail_json": detail_json(payload),
        "created_at": utc_now(),
    }
    for field in PHASE_FLAG_FIELDS:
        values[field] = to_int(payload.get(field))
    return ParsedRow(target_table="phase_outcomes", source_table=row["source_table"], legacy_row_id=row["legacy_row_id"], values=values)


def parse_results_rows(
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
    for row in fetch_legacy_rows(con, RESULT_SOURCE_TABLES, date=date):
        counts["source_rows"] += 1
        counts["source_tables"][row["source_table"]] = counts["source_tables"].get(row["source_table"], 0) + 1
        payload = parse_legacy_json(row)
        parsed_row = None
        if row["source_table"] == "mlb_game_outcomes":
            parsed_row = parse_game_outcome(row, payload, resolver)
        elif row["source_table"] == "mlb_game_team_stats":
            parsed_row = parse_team_game_stat(row, payload, resolver)
        elif row["source_table"] == "mlb_player_game_batting":
            parsed_row = parse_batter_row(row, payload, resolver, "player_game_batting")
        elif row["source_table"] == "mlb_batter_game_outcomes":
            parsed_row = parse_batter_row(row, payload, resolver, "batter_game_outcomes")
        elif row["source_table"] == "mlb_pitcher_appearances":
            parsed_row = parse_pitcher_row(row, payload, resolver, "pitcher_appearances")
        elif row["source_table"] == "mlb_starting_pitcher_game_logs":
            parsed_row = parse_pitcher_row(row, payload, resolver, "starting_pitcher_game_logs")
        elif row["source_table"] == "mlb_home_run_events":
            parsed_row = parse_home_run_event(row, payload, resolver)
        elif row["source_table"] == "mlb_phase_outcomes_daily":
            parsed_row = parse_phase_outcome(row, payload, resolver)
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
        update_columns = [column for column in columns[1:]]
        set_clause = ", ".join(f"{column} = excluded.{column}" for column in update_columns)
        sql = f"""
            insert into {row.target_table} ({", ".join(columns)})
            values ({placeholders})
            on conflict({columns[0]}) do update set {set_clause}
        """
        con.execute(sql, [row.values[column] for column in columns])
        inserted[row.target_table] = inserted.get(row.target_table, 0) + 1
    return inserted


def normalize_results(con: sqlite3.Connection, date: str | None = None, dry_run: bool = False) -> dict[str, Any]:
    con.row_factory = sqlite3.Row
    ensure_results_schema(con)
    resolver = MlbIdentityResolver(con)
    before_unresolved = con.execute("select count(*) from unresolved_entities").fetchone()[0]
    rows, counts = parse_results_rows(con, resolver, date=date)
    report = {
        "family": "mlb_results",
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
