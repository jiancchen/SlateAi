from __future__ import annotations

import sqlite3
from dataclasses import dataclass
from typing import Any

from .common import MlbIdentityResolver, detail_json, fetch_legacy_rows, insert_value_rows, parse_legacy_json, source_pk_for_row, stable_id, to_float, to_int, utc_now


TEAM_CONTEXT_SOURCE_TABLES = [
    "mlb_team_story_priors",
    "mlb_game_story_labels",
    "mlb_game_story_signals",
    "mlb_series_context_snapshots",
]


@dataclass(frozen=True)
class ParsedRow:
    target_table: str
    source_table: str
    legacy_row_id: str
    values: dict[str, Any]


def ensure_team_context_schema(con: sqlite3.Connection) -> None:
    con.row_factory = sqlite3.Row
    con.executescript(
        """
        create table if not exists team_story_priors (
          team_story_prior_id text primary key,
          team_id text,
          as_of_date text,
          window_games integer,
          games_sample integer,
          win_rate real,
          avg_total_runs_final real,
          avg_total_runs_first5 real,
          avg_first_scoring_inning real,
          high_total_game_rate real,
          low_total_game_rate real,
          quiet_first5_rate real,
          first_inning_jolt_rate real,
          late_break_rate real,
          comeback_win_rate real,
          blew_lead_loss_rate real,
          bullpen_flip_win_rate real,
          bullpen_flip_loss_rate real,
          starter_cracked_rate real,
          traffic_no_conversion_rate real,
          story_instability_index real,
          source_table text,
          source_pk text,
          source_detail_json text,
          created_at text not null,
          foreign key (team_id) references teams(team_id)
        );
        create index if not exists idx_team_story_priors_team on team_story_priors (team_id, as_of_date);

        create table if not exists game_story_labels (
          game_story_label_id text primary key,
          game_id text,
          game_date text,
          home_team_id text,
          away_team_id text,
          winner_team_id text,
          winner_team text,
          primary_story_label text,
          early_phase_label text,
          late_phase_label text,
          scoring_shape_label text,
          winner_path_label text,
          label_flags_json text,
          story_tags_json text,
          summary_json text,
          source_table text,
          source_pk text,
          source_detail_json text,
          created_at text not null,
          foreign key (game_id) references games(game_id)
        );
        create index if not exists idx_game_story_labels_game on game_story_labels (game_id, primary_story_label);

        create table if not exists game_story_signals (
          game_story_signal_id text primary key,
          game_id text,
          game_date text,
          home_team_id text,
          away_team_id text,
          winner_team_id text,
          loser_team_id text,
          total_runs_final integer,
          total_runs_first5 integer,
          first_scoring_inning integer,
          first_inning_jolt_flag integer,
          quiet_first5_flag integer,
          late_break_flag integer,
          comeback_win_flag integer,
          bullpen_flip_flag integer,
          home_starter_cracked_flag integer,
          away_starter_cracked_flag integer,
          home_traffic_no_conversion_flag integer,
          away_traffic_no_conversion_flag integer,
          lead_changes integer,
          max_comeback_runs integer,
          hr_off_starters integer,
          hr_off_relievers integer,
          story_tags_json text,
          summary_json text,
          source_table text,
          source_pk text,
          source_detail_json text,
          created_at text not null,
          foreign key (game_id) references games(game_id)
        );
        create index if not exists idx_game_story_signals_game on game_story_signals (game_id);

        create table if not exists series_context_snapshots (
          series_context_snapshot_id text primary key,
          game_id text,
          as_of_date text,
          home_team_id text,
          away_team_id text,
          series_game_number integer,
          same_division_flag integer,
          played_yesterday_flag integer,
          previous_matchups_14d integer,
          previous_matchups_30d integer,
          source_table text,
          source_pk text,
          source_detail_json text,
          created_at text not null,
          foreign key (game_id) references games(game_id)
        );
        create index if not exists idx_series_context_game on series_context_snapshots (game_id, as_of_date);
        """
    )


def game_and_teams(resolver: MlbIdentityResolver, payload: dict[str, Any]) -> tuple[str | None, str | None, str | None]:
    game = resolver.game_for_pk(payload.get("game_pk"))
    if game:
        return game["game_id"], game.get("home_team_id"), game.get("away_team_id")
    game_id = resolver.game_id_for_teams_date("mlb_team_context", payload.get("game_date") or payload.get("as_of_date"), payload.get("home_team"), payload.get("away_team"))
    if not game_id:
        return None, None, None
    game = resolver.games_by_id.get(game_id)
    return game_id, game.get("home_team_id"), game.get("away_team_id")


def parse_prior(row: sqlite3.Row, payload: dict[str, Any], resolver: MlbIdentityResolver) -> ParsedRow:
    team_id = resolver.team_id_by_name("mlb_team_context", payload.get("team_name"))
    values = {
        "team_story_prior_id": stable_id("team-story-prior", source_pk_for_row(row)),
        "team_id": team_id,
        "as_of_date": payload.get("as_of_date"),
        "window_games": to_int(payload.get("window_games")),
        "source_table": row["source_table"], "source_pk": source_pk_for_row(row), "source_detail_json": detail_json(payload), "created_at": utc_now(),
    }
    for key in [
        "games_sample", "win_rate", "avg_total_runs_final", "avg_total_runs_first5", "avg_first_scoring_inning",
        "high_total_game_rate", "low_total_game_rate", "quiet_first5_rate", "first_inning_jolt_rate",
        "late_break_rate", "comeback_win_rate", "blew_lead_loss_rate", "bullpen_flip_win_rate",
        "bullpen_flip_loss_rate", "starter_cracked_rate", "traffic_no_conversion_rate", "story_instability_index",
    ]:
        values[key] = to_float(payload.get(key))
    values["games_sample"] = to_int(payload.get("games_sample"))
    return ParsedRow("team_story_priors", row["source_table"], row["legacy_row_id"], values)


def parse_label(row: sqlite3.Row, payload: dict[str, Any], resolver: MlbIdentityResolver) -> ParsedRow:
    game_id, home_id, away_id = game_and_teams(resolver, payload)
    winner_id = resolver.team_id_by_name("mlb_team_context", payload.get("winner_team"))
    return ParsedRow("game_story_labels", row["source_table"], row["legacy_row_id"], {
        "game_story_label_id": stable_id("game-story-label", source_pk_for_row(row)),
        "game_id": game_id, "game_date": payload.get("game_date"), "home_team_id": home_id, "away_team_id": away_id,
        "winner_team_id": winner_id, "winner_team": payload.get("winner_team"), "primary_story_label": payload.get("primary_story_label"),
        "early_phase_label": payload.get("early_phase_label"), "late_phase_label": payload.get("late_phase_label"),
        "scoring_shape_label": payload.get("scoring_shape_label"), "winner_path_label": payload.get("winner_path_label"),
        "label_flags_json": payload.get("label_flags_json"), "story_tags_json": payload.get("story_tags_json"), "summary_json": payload.get("summary_json"),
        "source_table": row["source_table"], "source_pk": source_pk_for_row(row), "source_detail_json": detail_json(payload), "created_at": utc_now(),
    })


def parse_signal(row: sqlite3.Row, payload: dict[str, Any], resolver: MlbIdentityResolver) -> ParsedRow:
    game_id, home_id, away_id = game_and_teams(resolver, payload)
    return ParsedRow("game_story_signals", row["source_table"], row["legacy_row_id"], {
        "game_story_signal_id": stable_id("game-story-signal", source_pk_for_row(row)),
        "game_id": game_id, "game_date": payload.get("game_date"), "home_team_id": home_id, "away_team_id": away_id,
        "winner_team_id": resolver.team_id_by_name("mlb_team_context", payload.get("winner_team")),
        "loser_team_id": resolver.team_id_by_name("mlb_team_context", payload.get("loser_team")),
        "total_runs_final": to_int(payload.get("total_runs_final")), "total_runs_first5": to_int(payload.get("total_runs_first5")),
        "first_scoring_inning": to_int(payload.get("first_scoring_inning")), "first_inning_jolt_flag": to_int(payload.get("first_inning_jolt_flag")),
        "quiet_first5_flag": to_int(payload.get("quiet_first5_flag")), "late_break_flag": to_int(payload.get("late_break_flag")),
        "comeback_win_flag": to_int(payload.get("comeback_win_flag")), "bullpen_flip_flag": to_int(payload.get("bullpen_flip_flag")),
        "home_starter_cracked_flag": to_int(payload.get("home_starter_cracked_flag")), "away_starter_cracked_flag": to_int(payload.get("away_starter_cracked_flag")),
        "home_traffic_no_conversion_flag": to_int(payload.get("home_traffic_no_conversion_flag")), "away_traffic_no_conversion_flag": to_int(payload.get("away_traffic_no_conversion_flag")),
        "lead_changes": to_int(payload.get("lead_changes")), "max_comeback_runs": to_int(payload.get("max_comeback_runs")),
        "hr_off_starters": to_int(payload.get("hr_off_starters")), "hr_off_relievers": to_int(payload.get("hr_off_relievers")),
        "story_tags_json": payload.get("story_tags_json"), "summary_json": payload.get("summary_json"),
        "source_table": row["source_table"], "source_pk": source_pk_for_row(row), "source_detail_json": detail_json(payload), "created_at": utc_now(),
    })


def parse_series(row: sqlite3.Row, payload: dict[str, Any], resolver: MlbIdentityResolver) -> ParsedRow:
    game_id, home_id, away_id = game_and_teams(resolver, payload)
    return ParsedRow("series_context_snapshots", row["source_table"], row["legacy_row_id"], {
        "series_context_snapshot_id": stable_id("series-context", source_pk_for_row(row)),
        "game_id": game_id, "as_of_date": payload.get("as_of_date"), "home_team_id": home_id, "away_team_id": away_id,
        "series_game_number": to_int(payload.get("series_game_number")), "same_division_flag": to_int(payload.get("same_division_flag")),
        "played_yesterday_flag": to_int(payload.get("played_yesterday_flag")), "previous_matchups_14d": to_int(payload.get("previous_matchups_14d")),
        "previous_matchups_30d": to_int(payload.get("previous_matchups_30d")),
        "source_table": row["source_table"], "source_pk": source_pk_for_row(row), "source_detail_json": detail_json(payload), "created_at": utc_now(),
    })


PARSERS = {
    "mlb_team_story_priors": parse_prior,
    "mlb_game_story_labels": parse_label,
    "mlb_game_story_signals": parse_signal,
    "mlb_series_context_snapshots": parse_series,
}


def parse_team_context_rows(con: sqlite3.Connection, resolver: MlbIdentityResolver, date: str | None = None) -> tuple[list[ParsedRow], dict[str, Any]]:
    parsed: list[ParsedRow] = []
    counts: dict[str, Any] = {"source_rows": 0, "parsed_rows": 0, "unparsed_rows": 0, "source_tables": {}, "targets": {}}
    for row in fetch_legacy_rows(con, TEAM_CONTEXT_SOURCE_TABLES, date=date):
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


def normalize_team_context(con: sqlite3.Connection, date: str | None = None, dry_run: bool = False) -> dict[str, Any]:
    con.row_factory = sqlite3.Row
    ensure_team_context_schema(con)
    resolver = MlbIdentityResolver(con)
    before_unresolved = con.execute("select count(*) from unresolved_entities").fetchone()[0]
    rows, counts = parse_team_context_rows(con, resolver, date=date)
    report = {"family": "mlb_team_context", "date": date, "dry_run": dry_run, **counts, "inserted": {}, "unresolved_rows_added": 0}
    if not dry_run:
        report["inserted"] = insert_value_rows(con, [(row.target_table, row.values) for row in rows])
        con.commit()
    after_unresolved = con.execute("select count(*) from unresolved_entities").fetchone()[0]
    report["unresolved_rows_added"] = after_unresolved - before_unresolved
    if dry_run:
        con.rollback()
    return report
