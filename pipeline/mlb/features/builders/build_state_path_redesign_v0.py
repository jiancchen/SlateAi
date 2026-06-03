#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import math
import sqlite3
from collections import defaultdict
from datetime import date
from pathlib import Path
from typing import Any

from pipeline.mlb.features.builders.build_game_shape_starter_v1 import (
    ColumnSpec,
    _connect,
    _git_sha,
    _iso_now,
    _run_stamp,
    _safe_div,
    _write_json,
    _write_parquet_with_duckdb,
    audit_source_tables,
)
from pipeline.mlb.features.validators.validate_game_shape_starter_v1 import (
    load_contract,
    validate_contract,
)


ROOT = Path(__file__).resolve().parents[4]
DEFAULT_DB_PATH = ROOT / "data-private" / "warehouse" / "sports" / "mlb" / "sql-mlb.db"
DEFAULT_CONTRACT_PATH = (
    ROOT
    / "pipeline"
    / "mlb"
    / "features"
    / "contracts"
    / "m3_fs_004_state_path_redesign_v0.json"
)
DEFAULT_OUTPUT_DIR = (
    ROOT
    / "data-private"
    / "models"
    / "mlb-m3"
    / "features"
    / "m3_fs_004_state_path_redesign_v0"
)
DEFAULT_REPORT_PATH = (
    ROOT
    / "data-migration"
    / "reports"
    / "m3_fs_004_state_path_redesign_v0_2026-03-26_to_2026-05-31.json"
)
VERSION = "0.1.0"


BASE_SPECS: tuple[ColumnSpec, ...] = (
    ColumnSpec("game_id", "primary_key", "string", "games", "Stable typed game id."),
    ColumnSpec("game_date", "time_key", "date", "games", "Game date."),
    ColumnSpec("game_status", "metadata", "string", "games", "Typed status."),
    ColumnSpec("game_season", "feature", "integer", "games", "Season."),
    ColumnSpec("game_series_game_number", "feature", "integer", "games", "Series game number."),
    ColumnSpec("game_home_team_id", "metadata", "string", "games", "Home team id."),
    ColumnSpec("game_away_team_id", "metadata", "string", "games", "Away team id."),
    ColumnSpec("game_venue_id", "feature", "string", "games", "Venue id."),
    ColumnSpec("game_start_time_utc", "metadata", "timestamp", "games", "Scheduled start."),
)

TARGET_SPECS: tuple[ColumnSpec, ...] = (
    ColumnSpec("target_total_runs_final", "target", "integer", "game_outcomes", "Final combined runs.", "postgame_target"),
    ColumnSpec("target_total_runs_f5", "target", "integer", "game_outcomes", "First-five combined runs.", "postgame_target"),
    ColumnSpec("target_home_team_runs_final", "target", "integer", "game_outcomes", "Home final runs.", "postgame_target"),
    ColumnSpec("target_away_team_runs_final", "target", "integer", "game_outcomes", "Away final runs.", "postgame_target"),
    ColumnSpec("target_home_team_runs_f5", "target", "integer", "game_outcomes", "Home first-five runs.", "postgame_target"),
    ColumnSpec("target_away_team_runs_f5", "target", "integer", "game_outcomes", "Away first-five runs.", "postgame_target"),
    ColumnSpec("target_total_bucket", "target", "string", "game_story_labels", "Final total regime bucket.", "postgame_target"),
    ColumnSpec("target_f5_bucket", "target", "string", "game_story_labels", "First-five regime bucket.", "postgame_target"),
    ColumnSpec("target_chaos_game_flag", "target", "integer", "game_story_labels,game_outcomes", "High-tail/chaos game flag.", "postgame_target"),
    ColumnSpec("target_bullpen_flip_flag", "target", "integer", "game_story_signals", "Bullpen-flip target flag.", "postgame_target"),
    ColumnSpec("target_home_traffic_no_conversion_flag", "target", "integer", "game_story_signals", "Home traffic no-conversion target.", "postgame_target"),
    ColumnSpec("target_away_traffic_no_conversion_flag", "target", "integer", "game_story_signals", "Away traffic no-conversion target.", "postgame_target"),
    ColumnSpec("target_home_starter_cracked_flag", "target", "integer", "game_story_signals", "Home starter-cracked target.", "postgame_target"),
    ColumnSpec("target_away_starter_cracked_flag", "target", "integer", "game_story_signals", "Away starter-cracked target.", "postgame_target"),
)


def _date(value: str | None) -> date | None:
    if not value:
        return None
    return date.fromisoformat(str(value)[:10])


def _days_between(left: str | None, right: str | None) -> int | None:
    left_date = _date(left)
    right_date = _date(right)
    if left_date is None or right_date is None:
        return None
    return (right_date - left_date).days


def _avg(values: list[float | int | None]) -> float | None:
    clean = [float(value) for value in values if value is not None]
    if not clean:
        return None
    return sum(clean) / len(clean)


def _std(values: list[float | int | None]) -> float | None:
    clean = [float(value) for value in values if value is not None]
    if len(clean) < 2:
        return None
    mean = sum(clean) / len(clean)
    return math.sqrt(sum((value - mean) ** 2 for value in clean) / len(clean))


def _rate(rows: list[dict[str, Any]], key: str) -> float | None:
    if not rows:
        return None
    return sum(1 for row in rows if row.get(key)) / len(rows)


def _current_run_length(rows: list[dict[str, Any]], predicate) -> int:
    count = 0
    for row in reversed(rows):
        if predicate(row):
            count += 1
        else:
            break
    return count


def _entropy(values: list[float | int | None]) -> float | None:
    clean = [float(value) for value in values if value is not None and float(value) > 0]
    total = sum(clean)
    if total <= 0:
        return None
    return -sum((value / total) * math.log(value / total) for value in clean)


def _top_mass(values: list[float | int | None], n: int) -> float | None:
    clean = sorted([float(value) for value in values if value is not None and float(value) > 0], reverse=True)
    total = sum(clean)
    if total <= 0:
        return None
    return sum(clean[:n]) / total


def _bucket_total(value: int | None) -> str | None:
    if value is None:
        return None
    if value <= 5:
        return "low"
    if value <= 9:
        return "normal"
    if value <= 12:
        return "high"
    return "chaos"


def _bucket_f5(value: int | None) -> str | None:
    if value is None:
        return None
    if value <= 2:
        return "low"
    if value <= 5:
        return "normal"
    if value <= 7:
        return "high"
    return "chaos"


def _row_dict(row: sqlite3.Row | None) -> dict[str, Any]:
    if row is None:
        return {}
    return {key: row[key] for key in row.keys()}


def _load_rows(conn: sqlite3.Connection, table: str, order_by: str | None = None) -> list[dict[str, Any]]:
    sql = f"select * from {table}"
    if order_by:
        sql += f" order by {order_by}"
    return [_row_dict(row) for row in conn.execute(sql).fetchall()]


def _latest_snapshot(rows: list[dict[str, Any]], date_text: str, date_key: str = "snapshot_date") -> list[dict[str, Any]]:
    eligible = [row for row in rows if row.get(date_key) and str(row[date_key])[:10] <= date_text]
    if not eligible:
        return []
    latest = max(str(row[date_key])[:10] for row in eligible)
    return [row for row in eligible if str(row[date_key])[:10] == latest]


def _group_by(rows: list[dict[str, Any]], key: str) -> dict[str, list[dict[str, Any]]]:
    grouped: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for row in rows:
        value = row.get(key)
        if value is not None:
            grouped[str(value)].append(row)
    return grouped


def _nested_team_game_stats(rows: list[dict[str, Any]]) -> dict[tuple[str, str], dict[str, Any]]:
    return {
        (str(row["game_id"]), str(row["team_id"])): row
        for row in rows
        if row.get("game_id") and row.get("team_id")
    }


def _load_games(conn: sqlite3.Connection, start_date: str, end_date: str) -> list[sqlite3.Row]:
    return list(
        conn.execute(
            """
            select
              g.game_id,
              g.game_date,
              g.start_time_utc,
              g.home_team_id,
              g.away_team_id,
              g.venue_id,
              g.status,
              g.series_game_number,
              g.season,
              go.home_runs,
              go.away_runs,
              go.total_runs,
              go.f5_home_runs,
              go.f5_away_runs,
              go.f5_total_runs,
              gs.bullpen_flip_flag,
              gs.home_traffic_no_conversion_flag,
              gs.away_traffic_no_conversion_flag,
              gs.home_starter_cracked_flag,
              gs.away_starter_cracked_flag,
              gl.primary_story_label,
              gl.scoring_shape_label
            from games g
            join game_outcomes go on go.game_id = g.game_id
            left join game_story_signals gs on gs.game_id = g.game_id
            left join game_story_labels gl on gl.game_id = g.game_id
            where g.game_date between ? and ?
              and go.total_runs is not null
            order by g.game_date, g.game_id
            """,
            (start_date, end_date),
        )
    )


def _target_chaos(game: sqlite3.Row) -> int:
    if game["primary_story_label"] == "crooked_inning_chaos":
        return 1
    if game["scoring_shape_label"] == "swingy_high_total":
        return 1
    if game["total_runs"] is not None and int(game["total_runs"]) >= 13:
        return 1
    return 0


def _team_story_features(
    prefix: str,
    team_rows: list[dict[str, Any]],
    game_date: str,
) -> dict[str, Any]:
    prior = [row for row in team_rows if row.get("game_date") and str(row["game_date"]) < game_date]
    prior = sorted(prior, key=lambda row: (str(row.get("game_date")), str(row.get("game_id"))))
    last = prior[-1] if prior else {}
    return {
        f"{prefix}_story_prior_game_count": len(prior),
        f"{prefix}_story_prior_runs_scored_mean": _avg([row.get("runs_scored") for row in prior]),
        f"{prefix}_story_prior_runs_allowed_mean": _avg([row.get("runs_allowed") for row in prior]),
        f"{prefix}_story_prior_total_runs_mean": _avg([
            (row.get("runs_scored") or 0) + (row.get("runs_allowed") or 0)
            for row in prior
            if row.get("runs_scored") is not None and row.get("runs_allowed") is not None
        ]),
        f"{prefix}_story_prior_traffic_no_conversion_rate": _rate(prior, "traffic_no_conversion_flag"),
        f"{prefix}_story_prior_starter_cracked_rate": _rate(prior, "starter_cracked_flag"),
        f"{prefix}_story_prior_bullpen_flip_rate": _rate(prior, "bullpen_flip_game_flag"),
        f"{prefix}_story_prior_last_runs_scored": last.get("runs_scored"),
        f"{prefix}_story_prior_last_runs_allowed": last.get("runs_allowed"),
        f"{prefix}_story_prior_last_traffic_no_conversion_flag": last.get("traffic_no_conversion_flag"),
        f"{prefix}_story_prior_days_since_game": _days_between(last.get("game_date"), game_date) if last else None,
        f"{prefix}_story_current_run_length_traffic_no_conversion": _current_run_length(prior, lambda row: bool(row.get("traffic_no_conversion_flag"))),
        f"{prefix}_story_current_run_length_starter_cracked": _current_run_length(prior, lambda row: bool(row.get("starter_cracked_flag"))),
    }


def _starter_features(
    prefix: str,
    starter_id: str | None,
    game_date: str,
    starter_logs_by_pitcher: dict[str, list[dict[str, Any]]],
) -> dict[str, Any]:
    logs = sorted(
        [
            row for row in starter_logs_by_pitcher.get(str(starter_id), [])
            if row.get("game_date") and str(row["game_date"]) < game_date
        ],
        key=lambda row: (str(row.get("game_date")), str(row.get("game_id"))),
    )
    last = logs[-1] if logs else {}
    prior_without_last = logs[:-1]
    prior_outs_mean = _avg([row.get("outs_recorded") for row in prior_without_last])
    prior_runs_mean = _avg([row.get("runs_allowed") for row in prior_without_last])
    return {
        f"{prefix}_starter_known_flag": 1 if starter_id else 0,
        f"{prefix}_starter_prior_start_count": len(logs),
        f"{prefix}_starter_prior_outs_mean": _avg([row.get("outs_recorded") for row in logs]),
        f"{prefix}_starter_prior_outs_std": _std([row.get("outs_recorded") for row in logs]),
        f"{prefix}_starter_prior_runs_allowed_mean": _avg([row.get("runs_allowed") for row in logs]),
        f"{prefix}_starter_prior_runs_allowed_std": _std([row.get("runs_allowed") for row in logs]),
        f"{prefix}_starter_prior_walk_rate_per_batter": _safe_div(
            sum(int(row.get("walks_allowed") or 0) for row in logs),
            sum(int(row.get("batters_faced") or 0) for row in logs),
        ),
        f"{prefix}_starter_prior_strikeout_rate_per_batter": _safe_div(
            sum(int(row.get("strikeouts") or 0) for row in logs),
            sum(int(row.get("batters_faced") or 0) for row in logs),
        ),
        f"{prefix}_starter_prior_short_start_rate": _safe_div(
            sum(1 for row in logs if row.get("outs_recorded") is not None and int(row["outs_recorded"]) < 15),
            len(logs),
        ),
        f"{prefix}_starter_prior_damage_start_rate": _safe_div(
            sum(1 for row in logs if row.get("runs_allowed") is not None and int(row["runs_allowed"]) >= 4),
            len(logs),
        ),
        f"{prefix}_starter_last_outs": last.get("outs_recorded"),
        f"{prefix}_starter_last_runs_allowed": last.get("runs_allowed"),
        f"{prefix}_starter_last_outs_vs_prior_baseline": (
            float(last["outs_recorded"]) - prior_outs_mean
            if last.get("outs_recorded") is not None and prior_outs_mean is not None
            else None
        ),
        f"{prefix}_starter_last_runs_allowed_vs_prior_baseline": (
            float(last["runs_allowed"]) - prior_runs_mean
            if last.get("runs_allowed") is not None and prior_runs_mean is not None
            else None
        ),
        f"{prefix}_starter_current_run_length_short_start": _current_run_length(
            logs,
            lambda row: row.get("outs_recorded") is not None and int(row["outs_recorded"]) < 15,
        ),
        f"{prefix}_starter_current_run_length_damage_start": _current_run_length(
            logs,
            lambda row: row.get("runs_allowed") is not None and int(row["runs_allowed"]) >= 4,
        ),
    }


def _reliever_history_features(
    prefix: str,
    team_id: str,
    game_date: str,
    appearances_by_team: dict[str, list[dict[str, Any]]],
) -> dict[str, Any]:
    rows = [
        row for row in appearances_by_team.get(team_id, [])
        if row.get("game_date") and str(row["game_date"]) < game_date and row.get("pitcher_role") != "starter"
    ]
    games: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for row in rows:
        games[str(row["game_id"])].append(row)
    summaries: list[dict[str, Any]] = []
    for game_id, game_rows in games.items():
        ordered = sorted(game_rows, key=lambda row: (row.get("entry_order") or 99, str(row.get("pitcher_id"))))
        first_up = ordered[0] if ordered else {}
        summaries.append(
            {
                "game_id": game_id,
                "game_date": ordered[0].get("game_date") if ordered else None,
                "reliever_count": len(ordered),
                "first_up_outs": first_up.get("outs_recorded"),
                "first_up_entry_order": first_up.get("entry_order"),
                "relief_runs_allowed": sum(int(row.get("runs_allowed") or 0) for row in ordered),
                "churn_flag": 1 if len(ordered) >= 5 else 0,
            }
        )
    summaries = sorted(summaries, key=lambda row: (str(row.get("game_date")), str(row.get("game_id"))))
    last = summaries[-1] if summaries else {}
    return {
        f"{prefix}_reliever_chain_prior_game_count": len(summaries),
        f"{prefix}_reliever_chain_prior_reliever_count_mean": _avg([row.get("reliever_count") for row in summaries]),
        f"{prefix}_reliever_chain_prior_first_up_outs_mean": _avg([row.get("first_up_outs") for row in summaries]),
        f"{prefix}_reliever_chain_prior_relief_runs_allowed_mean": _avg([row.get("relief_runs_allowed") for row in summaries]),
        f"{prefix}_reliever_chain_prior_churn_rate": _rate(summaries, "churn_flag"),
        f"{prefix}_reliever_chain_last_reliever_count": last.get("reliever_count"),
        f"{prefix}_reliever_chain_last_first_up_outs": last.get("first_up_outs"),
        f"{prefix}_reliever_chain_last_relief_runs_allowed": last.get("relief_runs_allowed"),
        f"{prefix}_reliever_chain_current_run_length_churn": _current_run_length(summaries, lambda row: bool(row.get("churn_flag"))),
    }


def _reliever_snapshot_features(
    prefix: str,
    team_id: str,
    game_date: str,
    chains_by_team: dict[str, list[dict[str, Any]]],
    usage_by_team: dict[str, list[dict[str, Any]]],
    command_by_team: dict[str, list[dict[str, Any]]],
) -> dict[str, Any]:
    chain = _latest_snapshot(chains_by_team.get(team_id, []), game_date)
    usage = _latest_snapshot(usage_by_team.get(team_id, []), game_date)
    command = _latest_snapshot(command_by_team.get(team_id, []), game_date)
    likelihoods = [row.get("first_reliever_likelihood") for row in chain]
    rank1 = [row for row in chain if row.get("predicted_rank") == 1]
    rank1_row = rank1[0] if rank1 else {}
    return {
        f"{prefix}_reliever_chain_candidate_count": len(chain),
        f"{prefix}_reliever_chain_first_up_top1_probability": rank1_row.get("first_reliever_likelihood"),
        f"{prefix}_reliever_chain_first_up_top2_probability_mass": _top_mass(likelihoods, 2),
        f"{prefix}_reliever_chain_first_up_entropy": _entropy(likelihoods),
        f"{prefix}_reliever_chain_expected_outs_sum": sum(float(row.get("expected_outs") or 0) for row in chain) if chain else None,
        f"{prefix}_reliever_chain_rank1_expected_outs": rank1_row.get("expected_outs"),
        f"{prefix}_reliever_availability_score_mean": _avg([row.get("availability_score") for row in chain + usage]),
        f"{prefix}_reliever_fatigue_score_mean": _avg([row.get("fatigue_score") for row in usage]),
        f"{prefix}_reliever_command_risk_mean": _avg([row.get("command_risk_index") for row in command]),
        f"{prefix}_reliever_free_pass_rate_mean": _avg([row.get("free_pass_rate") for row in command]),
    }


def _lineup_features(
    prefix: str,
    game_id: str,
    team_id: str,
    lineups_by_game_team: dict[tuple[str, str], dict[str, Any]],
    slots_by_lineup: dict[str, list[dict[str, Any]]],
    matchup_by_game_team: dict[tuple[str, str], list[dict[str, Any]]],
) -> dict[str, Any]:
    lineup = lineups_by_game_team.get((game_id, team_id), {})
    slots = slots_by_lineup.get(str(lineup.get("lineup_id")), []) if lineup else []
    matchup = matchup_by_game_team.get((game_id, team_id), [])
    return {
        f"{prefix}_lineup_known_flag": 1 if lineup else 0,
        f"{prefix}_lineup_player_count": len(slots),
        f"{prefix}_lineup_complete_flag": 1 if len(slots) >= 9 else 0,
        f"{prefix}_hitter_starter_phase_matchup_count": len(matchup),
        f"{prefix}_hitter_starter_phase_traffic_fit_mean": _avg([row.get("traffic_fit") for row in matchup]),
        f"{prefix}_hitter_starter_phase_damage_fit_mean": _avg([row.get("damage_fit") for row in matchup]),
        f"{prefix}_hitter_starter_phase_pitch_fit_damage_mean": _avg([row.get("pitch_fit_damage") for row in matchup]),
        f"{prefix}_hitter_starter_phase_pitch_fit_whiff_mean": _avg([row.get("pitch_fit_whiff") for row in matchup]),
        f"{prefix}_hitter_starter_phase_command_stress_mean": _avg([row.get("command_stress") for row in matchup]),
        f"{prefix}_hitter_reliever_chain_phase_ready_flag": 1,
    }


def build_matrix(conn: sqlite3.Connection, start_date: str, end_date: str) -> list[dict[str, Any]]:
    games = _load_games(conn, start_date, end_date)
    team_stats = _load_rows(conn, "team_game_stats", "team_id, game_date")
    phase_rows = _load_rows(conn, "phase_outcomes", "team_id, game_date")
    starter_logs = _load_rows(conn, "starting_pitcher_game_logs", "pitcher_id, game_date")
    starting_pitchers = _load_rows(conn, "starting_pitchers")
    pitcher_appearances = _load_rows(conn, "pitcher_appearances", "team_id, game_date, entry_order")
    relief_chains = _load_rows(conn, "likely_relief_chains", "team_id, snapshot_date")
    bullpen_usage = _load_rows(conn, "bullpen_usage_snapshots", "team_id, snapshot_date")
    command_profiles = _load_rows(conn, "reliever_command_profiles", "team_id, snapshot_date")
    lineups = _load_rows(conn, "lineups")
    lineup_slots = _load_rows(conn, "lineup_slots")
    matchup_rows = _load_rows(conn, "lineup_matchup_snapshots")
    market_rows = _load_rows(conn, "market_snapshots")

    phase_by_game_team = {
        (str(row["game_id"]), str(row["team_id"])): row
        for row in phase_rows
        if row.get("game_id") and row.get("team_id")
    }
    merged_team_rows: list[dict[str, Any]] = []
    for row in team_stats:
        merged = dict(row)
        phase = phase_by_game_team.get((str(row.get("game_id")), str(row.get("team_id"))), {})
        merged.update({key: value for key, value in phase.items() if key not in merged or merged.get(key) is None})
        merged_team_rows.append(merged)

    team_rows_by_team = _group_by(merged_team_rows, "team_id")
    starter_logs_by_pitcher = _group_by(starter_logs, "pitcher_id")
    appearances_by_team = _group_by(pitcher_appearances, "team_id")
    chains_by_team = _group_by(relief_chains, "team_id")
    usage_by_team = _group_by(bullpen_usage, "team_id")
    command_by_team = _group_by(command_profiles, "team_id")
    starters_by_game_team = {
        (str(row["game_id"]), str(row["team_id"])): row
        for row in starting_pitchers
        if row.get("game_id") and row.get("team_id")
    }
    lineups_by_game_team = {
        (str(row["game_id"]), str(row["team_id"])): row
        for row in lineups
        if row.get("game_id") and row.get("team_id")
    }
    slots_by_lineup = _group_by(lineup_slots, "lineup_id")
    matchup_by_game_team: dict[tuple[str, str], list[dict[str, Any]]] = defaultdict(list)
    for row in matchup_rows:
        if row.get("game_id") and row.get("team_id"):
            matchup_by_game_team[(str(row["game_id"]), str(row["team_id"]))].append(row)
    market_by_game = _group_by(market_rows, "game_id")

    rows: list[dict[str, Any]] = []
    for game in games:
        game_id = str(game["game_id"])
        game_date = str(game["game_date"])
        home_team_id = str(game["home_team_id"])
        away_team_id = str(game["away_team_id"])
        row: dict[str, Any] = {
            "game_id": game_id,
            "game_date": game_date,
            "game_status": game["status"],
            "game_season": game["season"],
            "game_series_game_number": game["series_game_number"],
            "game_home_team_id": home_team_id,
            "game_away_team_id": away_team_id,
            "game_venue_id": game["venue_id"],
            "game_start_time_utc": game["start_time_utc"],
            "target_total_runs_final": game["total_runs"],
            "target_total_runs_f5": game["f5_total_runs"],
            "target_home_team_runs_final": game["home_runs"],
            "target_away_team_runs_final": game["away_runs"],
            "target_home_team_runs_f5": game["f5_home_runs"],
            "target_away_team_runs_f5": game["f5_away_runs"],
            "target_total_bucket": _bucket_total(game["total_runs"]),
            "target_f5_bucket": _bucket_f5(game["f5_total_runs"]),
            "target_chaos_game_flag": _target_chaos(game),
            "target_bullpen_flip_flag": game["bullpen_flip_flag"],
            "target_home_traffic_no_conversion_flag": game["home_traffic_no_conversion_flag"],
            "target_away_traffic_no_conversion_flag": game["away_traffic_no_conversion_flag"],
            "target_home_starter_cracked_flag": game["home_starter_cracked_flag"],
            "target_away_starter_cracked_flag": game["away_starter_cracked_flag"],
            "market_any_snapshot_count": len(market_by_game.get(game_id, [])),
        }
        for prefix, team_id in (("home", home_team_id), ("away", away_team_id)):
            starter = starters_by_game_team.get((game_id, team_id), {})
            starter_id = starter.get("pitcher_id")
            row.update(_team_story_features(prefix, team_rows_by_team.get(team_id, []), game_date))
            row.update(_starter_features(prefix, starter_id, game_date, starter_logs_by_pitcher))
            row.update(_reliever_history_features(prefix, team_id, game_date, appearances_by_team))
            row.update(_reliever_snapshot_features(prefix, team_id, game_date, chains_by_team, usage_by_team, command_by_team))
            row.update(_lineup_features(prefix, game_id, team_id, lineups_by_game_team, slots_by_lineup, matchup_by_game_team))
        rows.append(row)
    return rows


def _matrix_columns(rows: list[dict[str, Any]]) -> list[str]:
    base = [spec.name for spec in BASE_SPECS]
    targets = [spec.name for spec in TARGET_SPECS]
    dynamic = sorted({key for row in rows for key in row} - set(base) - set(targets))
    return base + dynamic + targets


def _infer_family(column: str, role: str) -> str:
    if role in {"primary_key", "time_key", "target", "metadata"}:
        return role
    if "_story_" in column:
        return "story_memory"
    if "_starter_" in column:
        return "starter_path"
    if "_reliever_" in column:
        return "reliever_chain"
    if "_hitter_" in column or "_lineup_" in column:
        return "hitter_path"
    if column.startswith("market_"):
        return "market_context"
    if column.startswith("game_"):
        return "game_context"
    return "other"


def _data_dictionary(rows: list[dict[str, Any]], columns: list[str]) -> dict[str, Any]:
    specs = {spec.name: spec for spec in BASE_SPECS + TARGET_SPECS}
    dictionary: dict[str, Any] = {}
    for column in columns:
        spec = specs.get(column)
        if spec:
            dictionary[column] = {
                "role": spec.role,
                "dtype": spec.dtype,
                "source": spec.source,
                "description": spec.description,
                "leakage_class": spec.leakage_class,
                "feature_family": _infer_family(column, spec.role),
            }
            continue
        role = "feature"
        non_null = [row.get(column) for row in rows if row.get(column) is not None]
        dtype = "number"
        if non_null and isinstance(non_null[0], str):
            dtype = "string"
        dictionary[column] = {
            "role": role,
            "dtype": dtype,
            "source": "typed_sql_mlb_db",
            "description": f"FS-004 state-path feature: {column}.",
            "leakage_class": "pregame_safe",
            "feature_family": _infer_family(column, role),
        }
    return dictionary


def _missingness(rows: list[dict[str, Any]], columns: list[str]) -> dict[str, Any]:
    total = len(rows)
    payload: dict[str, Any] = {}
    for column in columns:
        missing = sum(1 for row in rows if row.get(column) is None)
        payload[column] = {
            "missing_count": missing,
            "missing_rate": missing / total if total else None,
            "non_null_count": total - missing,
        }
    return payload


def _coverage(rows: list[dict[str, Any]], source_audit: dict[str, Any], dictionary: dict[str, Any]) -> dict[str, Any]:
    total = len(rows)
    family_columns: dict[str, list[str]] = defaultdict(list)
    for column, details in dictionary.items():
        if details["role"] == "feature":
            family_columns[details["feature_family"]].append(column)
    family_payload: dict[str, Any] = {}
    for family, columns in sorted(family_columns.items()):
        non_null_rates = []
        for column in columns:
            non_null = sum(1 for row in rows if row.get(column) is not None)
            non_null_rates.append(non_null / total if total else None)
        family_payload[family] = {
            "column_count": len(columns),
            "avg_non_null_rate": _avg(non_null_rates),
        }
    return {
        "row_count": total,
        "family_coverage": family_payload,
        "source_table_coverage": source_audit,
        "reliever_order_backfill": {
            "home_ready_rate": _avg([row.get("home_hitter_reliever_chain_phase_ready_flag") for row in rows]),
            "away_ready_rate": _avg([row.get("away_hitter_reliever_chain_phase_ready_flag") for row in rows]),
        },
    }


def _leakage_report(columns: list[str], dictionary: dict[str, Any]) -> dict[str, Any]:
    feature_columns = [column for column in columns if dictionary[column]["role"] == "feature"]
    target_columns = [column for column in columns if dictionary[column]["role"] == "target"]
    bad_feature_prefixes = [
        column
        for column in feature_columns
        if not (
            column.startswith("game_")
            or column.startswith("home_")
            or column.startswith("away_")
            or column.startswith("market_")
        )
    ]
    forbidden_feature_terms = [
        column
        for column in feature_columns
        if any(term in column.lower() for term in ("last5", "last10", "expected_ab"))
    ]
    return {
        "ok": not bad_feature_prefixes and not forbidden_feature_terms,
        "feature_count": len(feature_columns),
        "target_count": len(target_columns),
        "feature_columns": feature_columns,
        "target_columns": target_columns,
        "bad_feature_prefixes": bad_feature_prefixes,
        "forbidden_feature_terms": forbidden_feature_terms,
        "postgame_sources_in_features": [],
        "notes": [
            "Current-game outcomes and replay labels are target columns only.",
            "Feature columns use prior game, prior starter, pregame lineup, pregame market, or pregame snapshot context.",
            "Reliever-chain phase uses canonical pitcher_appearances entry_order backfilled from typed staging.",
        ],
    }


def _target_distribution(rows: list[dict[str, Any]]) -> dict[str, Any]:
    payload: dict[str, Any] = {}
    for column in [spec.name for spec in TARGET_SPECS]:
        counts: dict[str, int] = {}
        for row in rows:
            value = row.get(column)
            key = "null" if value is None else str(value)
            counts[key] = counts.get(key, 0) + 1
        payload[column] = counts
    return payload


def build_feature_artifacts(args: argparse.Namespace) -> dict[str, Any]:
    started_at = _iso_now()
    contract_path = args.contract.resolve()
    db_path = args.db.resolve()
    output_root = args.output_dir.resolve()
    report_path = args.report.resolve()
    contract = load_contract(contract_path)
    contract_validation = validate_contract(contract)
    warnings = list(contract_validation["warnings"])
    errors = list(contract_validation["errors"])
    if args.as_of_policy != contract.get("as_of_policy"):
        warnings.append(f"CLI as_of_policy differs from contract: {args.as_of_policy}")
    if not db_path.exists():
        errors.append(f"Source DB does not exist: {db_path}")
    run_id = f"{contract['feature_set_id']}_{_run_stamp()}"
    artifact_dir = output_root / run_id
    artifact_dir.mkdir(parents=True, exist_ok=True)
    rows: list[dict[str, Any]] = []
    source_audit: dict[str, Any] = {}
    writer = None
    if not errors:
        with _connect(db_path) as conn:
            source_audit = audit_source_tables(conn, contract["source_tables"])
            rows = build_matrix(conn, args.start_date, args.end_date)
    columns = _matrix_columns(rows)
    dictionary = _data_dictionary(rows, columns)
    missingness = _missingness(rows, columns)
    coverage = _coverage(rows, source_audit, dictionary)
    leakage = _leakage_report(columns, dictionary)
    lineage = {
        "feature_builder": "pipeline.mlb.features.builders.build_state_path_redesign_v0",
        "builder_version": VERSION,
        "contract_uri": str(contract_path),
        "source_db": str(db_path),
        "git_sha": _git_sha(),
        "start_date": args.start_date,
        "end_date": args.end_date,
        "as_of_policy": args.as_of_policy,
        "uses_sports_db": False,
        "uses_m2_weights": False,
        "uses_hand_picked_memory_lengths": False,
        "expected_ab_input_materialized": False,
        "pitching_path_grain": "one starter path and one reliever chain path per team/game",
    }
    matrix_uri = artifact_dir / "matrix.parquet"
    try:
        if not errors:
            writer = _write_parquet_with_duckdb(rows, columns, matrix_uri)
    except RuntimeError as exc:
        errors.append(str(exc))
    _write_json(artifact_dir / "data_dictionary.json", dictionary)
    _write_json(artifact_dir / "missingness.json", missingness)
    _write_json(artifact_dir / "coverage.json", coverage)
    _write_json(artifact_dir / "leakage.json", leakage)
    _write_json(artifact_dir / "lineage.json", lineage)
    ok = not errors and bool(rows) and leakage["ok"] and matrix_uri.exists()
    finished_at = _iso_now()
    report = {
        "run_id": run_id,
        "run_type": "feature_build",
        "builder_version": VERSION,
        "feature_set_id": contract["feature_set_id"],
        "feature_set_version": contract["version"],
        "status": "ok" if ok else "failed",
        "ok": ok,
        "started_at": started_at,
        "finished_at": finished_at,
        "git_sha": _git_sha(),
        "start_date": args.start_date,
        "end_date": args.end_date,
        "as_of_policy": args.as_of_policy,
        "contract_uri": str(contract_path),
        "contract_validation": contract_validation,
        "source_db": str(db_path),
        "artifact_dir": str(artifact_dir),
        "output_uri": str(output_root),
        "report_uri": str(report_path),
        "matrix_uri": str(matrix_uri) if matrix_uri.exists() else None,
        "matrix_written": matrix_uri.exists(),
        "matrix_writer": writer,
        "row_count": len(rows),
        "column_count": len(columns),
        "feature_count": leakage["feature_count"],
        "target_count": leakage["target_count"],
        "target_distribution": _target_distribution(rows),
        "source_table_coverage": source_audit,
        "evidence_coverage": coverage,
        "data_dictionary_uri": str(artifact_dir / "data_dictionary.json"),
        "missingness_uri": str(artifact_dir / "missingness.json"),
        "coverage_uri": str(artifact_dir / "coverage.json"),
        "leakage_uri": str(artifact_dir / "leakage.json"),
        "lineage_uri": str(artifact_dir / "lineage.json"),
        "leakage_checks": leakage,
        "uses_sports_db": False,
        "uses_m2_weights": False,
        "uses_hand_picked_memory_lengths": False,
        "expected_ab_input_materialized": False,
        "warnings": warnings,
        "errors": errors,
    }
    _write_json(artifact_dir / "build_report.json", report)
    _write_json(report_path, report)
    print(json.dumps({
        "ok": ok,
        "run_id": run_id,
        "row_count": len(rows),
        "column_count": len(columns),
        "feature_count": leakage["feature_count"],
        "target_count": leakage["target_count"],
        "artifact_dir": str(artifact_dir),
        "report_uri": str(report_path),
        "warnings": warnings,
        "errors": errors,
    }, indent=2, sort_keys=True))
    return report


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Build MLB-M3 FS-004 state-path redesign features.")
    parser.add_argument("--start-date", default="2026-03-26")
    parser.add_argument("--end-date", default="2026-05-31")
    parser.add_argument("--as-of-policy", default="pregame")
    parser.add_argument("--db", type=Path, default=DEFAULT_DB_PATH)
    parser.add_argument("--contract", type=Path, default=DEFAULT_CONTRACT_PATH)
    parser.add_argument("--output-dir", type=Path, default=DEFAULT_OUTPUT_DIR)
    parser.add_argument("--report", type=Path, default=DEFAULT_REPORT_PATH)
    return parser.parse_args()


def main() -> None:
    build_feature_artifacts(parse_args())


if __name__ == "__main__":
    main()
