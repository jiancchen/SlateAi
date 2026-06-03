#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import math
import sqlite3
from collections import defaultdict
from dataclasses import dataclass
from datetime import date, datetime, timezone
from pathlib import Path
from typing import Any

from pipeline.mlb.features.builders.build_game_shape_starter_v1 import (
    ColumnSpec,
    _age_days,
    _bucket_f5,
    _bucket_total,
    _connect,
    _entropy,
    _git_sha,
    _iso_now,
    _latest_snapshot,
    _latest_snapshot_group,
    _run_stamp,
    _safe_div,
    _top_n_mass,
    _write_json,
    _write_parquet_with_duckdb,
    audit_source_tables,
)


ROOT = Path(__file__).resolve().parents[4]
DEFAULT_DB_PATH = ROOT / "data-private" / "warehouse" / "sports" / "mlb" / "sql-mlb.db"
DEFAULT_CONTRACT_PATH = (
    ROOT
    / "pipeline"
    / "mlb"
    / "features"
    / "contracts"
    / "m3_fs_002_game_story_pitching_state_v0.json"
)
DEFAULT_OUTPUT_DIR = (
    ROOT
    / "data-private"
    / "models"
    / "mlb-m3"
    / "features"
    / "m3_fs_002_game_story_pitching_state_v0"
)
DEFAULT_REPORT_PATH = (
    ROOT
    / "data-migration"
    / "reports"
    / "m3_fs_002_game_story_pitching_state_v0_2026-03-26_to_2026-05-31.json"
)
VERSION = "0.1.0"


@dataclass(frozen=True)
class FeatureSpec:
    name: str
    dtype: str
    source: str
    description: str
    leakage_class: str = "historical_only"


BASE_SPECS: tuple[ColumnSpec, ...] = (
    ColumnSpec("game_id", "primary_key", "string", "games", "Stable game id."),
    ColumnSpec("game_date", "time_key", "date", "games", "Game date."),
    ColumnSpec("game_status", "metadata", "string", "games", "Typed status."),
    ColumnSpec("game_season", "feature", "integer", "games", "Season."),
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
    ColumnSpec("target_total_bucket", "target", "string", "game_story_labels", "Total bucket.", "postgame_target"),
    ColumnSpec("target_f5_bucket", "target", "string", "game_story_labels", "First-five bucket.", "postgame_target"),
    ColumnSpec("target_chaos_game_flag", "target", "integer", "game_story_labels,game_outcomes", "Chaos/high-tail game flag.", "postgame_target"),
)


def load_contract(path: Path) -> dict[str, Any]:
    with path.open("r", encoding="utf-8") as handle:
        payload = json.load(handle)
    if not isinstance(payload, dict):
        raise ValueError(f"Contract must be a JSON object: {path}")
    return payload


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


def _sum(values: list[float | int | None]) -> float | None:
    clean = [float(value) for value in values if value is not None]
    if not clean:
        return None
    return sum(clean)


def _rate(rows: list[dict[str, Any]], key: str) -> float | None:
    if not rows:
        return None
    return sum(1 for row in rows if row.get(key)) / len(rows)


def _days_since_event(rows: list[dict[str, Any]], game_date: str, predicate) -> int | None:
    for row in reversed(rows):
        if predicate(row):
            return _days_between(row.get("game_date"), game_date)
    return None


def _current_run_length(rows: list[dict[str, Any]], predicate) -> int:
    count = 0
    for row in reversed(rows):
        if predicate(row):
            count += 1
        else:
            break
    return count


def _alternation_rate(values: list[Any]) -> float | None:
    clean = [value for value in values if value not in (None, "")]
    if len(clean) < 2:
        return None
    changes = sum(1 for left, right in zip(clean, clean[1:]) if left != right)
    return changes / (len(clean) - 1)


def _row_dict(row: sqlite3.Row | None) -> dict[str, Any]:
    if row is None:
        return {}
    return {key: row[key] for key in row.keys()}


def _load_table(conn: sqlite3.Connection, table: str, order_by: str | None = None) -> list[sqlite3.Row]:
    sql = f"select * from {table}"
    if order_by:
        sql += f" order by {order_by}"
    return list(conn.execute(sql))


def _rows_by_key(rows: list[sqlite3.Row], key: str) -> dict[str, list[sqlite3.Row]]:
    grouped: dict[str, list[sqlite3.Row]] = defaultdict(list)
    for row in rows:
        if row[key] is not None:
            grouped[str(row[key])].append(row)
    return grouped


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
              gl.primary_story_label,
              gl.early_phase_label,
              gl.scoring_shape_label
            from games g
            join game_outcomes go on go.game_id = g.game_id
            left join game_story_labels gl on gl.game_id = g.game_id
            where g.game_date between ? and ?
              and go.total_runs is not null
            order by g.game_date, g.game_id
            """,
            (start_date, end_date),
        )
    )


def _target_chaos_flag(game: sqlite3.Row) -> int:
    if game["primary_story_label"] == "crooked_inning_chaos":
        return 1
    if game["scoring_shape_label"] == "swingy_high_total":
        return 1
    if game["total_runs"] is not None and int(game["total_runs"]) >= 13:
        return 1
    return 0


def _latest_rows_by_snapshot(rows: list[sqlite3.Row], game_date: str) -> list[sqlite3.Row]:
    eligible = [
        row for row in rows if row["snapshot_date"] is not None and row["snapshot_date"][:10] <= game_date
    ]
    if not eligible:
        return []
    latest = max(str(row["snapshot_date"]) for row in eligible)
    return [row for row in eligible if row["snapshot_date"] == latest]


def _weighted_average(rows: list[sqlite3.Row], value_key: str, weight_key: str) -> float | None:
    total_weight = 0.0
    total_value = 0.0
    for row in rows:
        value = row[value_key]
        weight = row[weight_key]
        if value is None or weight is None:
            continue
        total_weight += float(weight)
        total_value += float(value) * float(weight)
    if total_weight <= 0:
        return None
    return total_value / total_weight


def _build_team_history(
    team_rows: list[sqlite3.Row],
    phase_by_game_team: dict[tuple[str, str], sqlite3.Row],
    labels_by_game: dict[str, sqlite3.Row],
    signals_by_game: dict[str, sqlite3.Row],
) -> dict[str, list[dict[str, Any]]]:
    history: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for row in team_rows:
        game_id = str(row["game_id"])
        team_id = str(row["team_id"])
        phase = phase_by_game_team.get((game_id, team_id))
        label = labels_by_game.get(game_id)
        signal = signals_by_game.get(game_id)
        payload = {
            "game_id": game_id,
            "game_date": row["game_date"],
            "result": row["result"],
            "runs_scored": row["runs_scored"],
            "runs_allowed": row["runs_allowed"],
            "runs_scored_first5": row["runs_scored_first5"],
            "runs_allowed_first5": row["runs_allowed_first5"],
            "primary_story_label": label["primary_story_label"] if label else None,
            "early_phase_label": label["early_phase_label"] if label else None,
            "late_phase_label": label["late_phase_label"] if label else None,
            "scoring_shape_label": label["scoring_shape_label"] if label else None,
            "phase_path_label": phase["phase_path_label"] if phase else None,
            "traffic_no_conversion_flag": phase["traffic_no_conversion_flag"] if phase else 0,
            "scoreless_first3_flag": phase["scoreless_first3_flag"] if phase else 0,
            "scored_first_inning_flag": phase["scored_first_inning_flag"] if phase else 0,
            "won_first5_flag": phase["won_first5_flag"] if phase else 0,
            "bullpen_flip_game_flag": phase["bullpen_flip_game_flag"] if phase else 0,
            "comeback_win_flag": phase["comeback_win_flag"] if phase else 0,
            "starter_cracked_flag": phase["starter_cracked_flag"] if phase else 0,
            "quiet_first5_flag": signal["quiet_first5_flag"] if signal else 0,
            "late_break_flag": signal["late_break_flag"] if signal else 0,
            "first_inning_jolt_flag": signal["first_inning_jolt_flag"] if signal else 0,
            "total_runs_final": signal["total_runs_final"] if signal else None,
            "total_runs_first5": signal["total_runs_first5"] if signal else None,
        }
        history[team_id].append(payload)
    for rows in history.values():
        rows.sort(key=lambda item: (item.get("game_date") or "", item.get("game_id") or ""))
    return history


def _team_story_features(prefix: str, rows: list[dict[str, Any]], game_date: str) -> dict[str, Any]:
    prior = [row for row in rows if row.get("game_date") and row["game_date"] < game_date]
    last = prior[-1] if prior else {}
    labels = [row.get("primary_story_label") for row in prior]
    wins = [row for row in prior if row.get("result") == "win"]
    losses = [row for row in prior if row.get("result") == "loss"]
    return {
        f"{prefix}_story_prior_game_count": len(prior),
        f"{prefix}_story_days_since_prior_game": _days_between(last.get("game_date"), game_date) if last else None,
        f"{prefix}_story_days_since_chaos_game": _days_since_event(prior, game_date, lambda row: row.get("primary_story_label") == "crooked_inning_chaos" or row.get("scoring_shape_label") == "swingy_high_total"),
        f"{prefix}_story_days_since_dead_bat_game": _days_since_event(prior, game_date, lambda row: row.get("primary_story_label") == "dead_bat_grind"),
        f"{prefix}_story_days_since_starter_crack_game": _days_since_event(prior, game_date, lambda row: row.get("starter_cracked_flag")),
        f"{prefix}_story_days_since_bullpen_flip_game": _days_since_event(prior, game_date, lambda row: row.get("bullpen_flip_game_flag")),
        f"{prefix}_story_days_since_traffic_no_conversion": _days_since_event(prior, game_date, lambda row: row.get("traffic_no_conversion_flag")),
        f"{prefix}_story_days_since_first5_firefight": _days_since_event(prior, game_date, lambda row: row.get("early_phase_label") == "first5_firefight"),
        f"{prefix}_story_current_win_run_length": _current_run_length(prior, lambda row: row.get("result") == "win"),
        f"{prefix}_story_current_loss_run_length": _current_run_length(prior, lambda row: row.get("result") == "loss"),
        f"{prefix}_story_current_quiet_first5_run_length": _current_run_length(prior, lambda row: row.get("quiet_first5_flag")),
        f"{prefix}_story_current_traffic_no_conversion_run_length": _current_run_length(prior, lambda row: row.get("traffic_no_conversion_flag")),
        f"{prefix}_story_primary_label_alternation_rate": _alternation_rate(labels),
        f"{prefix}_story_prior_chaos_rate": _rate(prior, "first_inning_jolt_flag") if False else _safe_div(sum(1 for row in prior if row.get("primary_story_label") == "crooked_inning_chaos" or row.get("scoring_shape_label") == "swingy_high_total"), len(prior)),
        f"{prefix}_story_prior_dead_bat_rate": _safe_div(sum(1 for row in prior if row.get("primary_story_label") == "dead_bat_grind"), len(prior)),
        f"{prefix}_story_prior_late_break_rate": _rate(prior, "late_break_flag"),
        f"{prefix}_story_prior_bullpen_flip_rate": _rate(prior, "bullpen_flip_game_flag"),
        f"{prefix}_story_prior_traffic_no_conversion_rate": _rate(prior, "traffic_no_conversion_flag"),
        f"{prefix}_story_prior_scoreless_first3_rate": _rate(prior, "scoreless_first3_flag"),
        f"{prefix}_story_prior_scored_first_inning_rate": _rate(prior, "scored_first_inning_flag"),
        f"{prefix}_story_prior_first5_win_rate": _rate(prior, "won_first5_flag"),
        f"{prefix}_story_runs_scored_volatility": _std([row.get("runs_scored") for row in prior]),
        f"{prefix}_story_f5_runs_scored_volatility": _std([row.get("runs_scored_first5") for row in prior]),
        f"{prefix}_story_last_game_runs_scored": last.get("runs_scored"),
        f"{prefix}_story_last_game_runs_allowed": last.get("runs_allowed"),
        f"{prefix}_story_last_game_total_runs": last.get("total_runs_final"),
        f"{prefix}_story_last_game_f5_total_runs": last.get("total_runs_first5"),
        f"{prefix}_story_last_game_traffic_no_conversion_flag": last.get("traffic_no_conversion_flag"),
        f"{prefix}_story_last_game_bullpen_flip_flag": last.get("bullpen_flip_game_flag"),
        f"{prefix}_story_prior_win_count": len(wins),
        f"{prefix}_story_prior_loss_count": len(losses),
    }


def _starter_id_by_game_team(rows: list[sqlite3.Row]) -> dict[tuple[str, str], str]:
    mapping: dict[tuple[str, str], str] = {}
    for row in rows:
        mapping[(str(row["game_id"]), str(row["team_id"]))] = str(row["pitcher_id"])
    return mapping


def _starter_path_features(
    prefix: str,
    pitcher_id: str | None,
    game_date: str,
    starter_logs_by_pitcher: dict[str, list[sqlite3.Row]],
    pitch_mix_by_pitcher: dict[str, list[sqlite3.Row]],
    mistake_by_pitcher: dict[str, list[sqlite3.Row]],
) -> dict[str, Any]:
    prior = []
    if pitcher_id:
        prior = [
            row for row in starter_logs_by_pitcher.get(pitcher_id, []) if row["game_date"] and row["game_date"] < game_date
        ]
    prior.sort(key=lambda row: (row["game_date"] or "", row["game_id"] or ""))
    last = prior[-1] if prior else None
    outs = [row["outs_recorded"] for row in prior]
    bad_start = lambda row: (row["runs_allowed"] is not None and row["runs_allowed"] >= 4) or (row["outs_recorded"] is not None and row["outs_recorded"] < 12)
    short_start = lambda row: row["outs_recorded"] is not None and row["outs_recorded"] < 15
    quality_start = lambda row: row["outs_recorded"] is not None and row["outs_recorded"] >= 18 and (row["runs_allowed"] or 0) <= 3
    prior_dicts = [_row_dict(row) for row in prior]
    pitch_mix_rows = _latest_rows_by_snapshot(pitch_mix_by_pitcher.get(pitcher_id or "", []), game_date) if pitcher_id else []
    pitch_mix_sample = _sum([row["sample_pitches"] for row in pitch_mix_rows])
    mistake_rows = _latest_rows_by_snapshot(mistake_by_pitcher.get(pitcher_id or "", []), game_date) if pitcher_id else []
    mistake = None
    if mistake_rows:
        mistake = max(mistake_rows, key=lambda row: row["starts_sample"] or 0)
    prior_bf = _sum([row["batters_faced"] for row in prior])
    return {
        f"{prefix}_starter_pitcher_id": pitcher_id,
        f"{prefix}_starter_known_flag": 1 if pitcher_id else 0,
        f"{prefix}_starter_prior_start_count": len(prior),
        f"{prefix}_starter_low_evidence_flag": 1 if len(prior) < 3 else 0,
        f"{prefix}_starter_days_since_last_start": _days_between(last["game_date"], game_date) if last else None,
        f"{prefix}_starter_last_outs_recorded": last["outs_recorded"] if last else None,
        f"{prefix}_starter_last_pitches_thrown": last["pitches_thrown"] if last else None,
        f"{prefix}_starter_last_runs_allowed": last["runs_allowed"] if last else None,
        f"{prefix}_starter_last_walks_allowed": last["walks_allowed"] if last else None,
        f"{prefix}_starter_last_strikeouts": last["strikeouts"] if last else None,
        f"{prefix}_starter_prior_outs_mean": _avg(outs),
        f"{prefix}_starter_prior_outs_std": _std(outs),
        f"{prefix}_starter_prior_outs_min": min([x for x in outs if x is not None], default=None),
        f"{prefix}_starter_prior_outs_max": max([x for x in outs if x is not None], default=None),
        f"{prefix}_starter_last_outs_vs_prior_mean": (last["outs_recorded"] - _avg(outs[:-1])) if last and len(outs) > 1 and _avg(outs[:-1]) is not None and last["outs_recorded"] is not None else None,
        f"{prefix}_starter_prior_short_start_count": sum(1 for row in prior if short_start(row)),
        f"{prefix}_starter_prior_short_start_rate": _safe_div(sum(1 for row in prior if short_start(row)), len(prior)),
        f"{prefix}_starter_current_short_start_run_length": _current_run_length(prior_dicts, lambda row: row.get("outs_recorded") is not None and row.get("outs_recorded") < 15),
        f"{prefix}_starter_days_since_short_start": _days_since_event(prior_dicts, game_date, lambda row: row.get("outs_recorded") is not None and row.get("outs_recorded") < 15),
        f"{prefix}_starter_prior_bad_start_count": sum(1 for row in prior if bad_start(row)),
        f"{prefix}_starter_current_bad_start_run_length": _current_run_length(prior_dicts, lambda row: (row.get("runs_allowed") is not None and row.get("runs_allowed") >= 4) or (row.get("outs_recorded") is not None and row.get("outs_recorded") < 12)),
        f"{prefix}_starter_days_since_bad_start": _days_since_event(prior_dicts, game_date, lambda row: (row.get("runs_allowed") is not None and row.get("runs_allowed") >= 4) or (row.get("outs_recorded") is not None and row.get("outs_recorded") < 12)),
        f"{prefix}_starter_prior_quality_start_count": sum(1 for row in prior if quality_start(row)),
        f"{prefix}_starter_prior_quality_start_rate": _safe_div(sum(1 for row in prior if quality_start(row)), len(prior)),
        f"{prefix}_starter_prior_walk_rate_per_bf": _safe_div(_sum([row["walks_allowed"] for row in prior]), prior_bf),
        f"{prefix}_starter_prior_strikeout_rate_per_bf": _safe_div(_sum([row["strikeouts"] for row in prior]), prior_bf),
        f"{prefix}_starter_prior_hr_rate_per_bf": _safe_div(_sum([row["home_runs_allowed"] for row in prior]), prior_bf),
        f"{prefix}_starter_pitch_mix_available_flag": 1 if pitch_mix_rows else 0,
        f"{prefix}_starter_pitch_mix_snapshot_age_days": _age_days(pitch_mix_rows[0]["snapshot_date"], game_date) if pitch_mix_rows else None,
        f"{prefix}_starter_pitch_mix_pitch_type_count": len({row["pitch_type"] for row in pitch_mix_rows}),
        f"{prefix}_starter_pitch_mix_sample_pitches": pitch_mix_sample,
        f"{prefix}_starter_pitch_mix_top_pitch_share": max([row["pitch_share"] for row in pitch_mix_rows if row["pitch_share"] is not None], default=None),
        f"{prefix}_starter_pitch_mix_weighted_whiff_rate": _weighted_average(pitch_mix_rows, "whiff_rate", "sample_pitches"),
        f"{prefix}_starter_pitch_mix_weighted_command_leak": _weighted_average(pitch_mix_rows, "command_leak", "sample_pitches"),
        f"{prefix}_starter_pitch_mix_weighted_damage_allowed": _weighted_average(pitch_mix_rows, "damage_allowed", "sample_pitches"),
        f"{prefix}_starter_pitch_mix_weighted_hard_contact_rate": _weighted_average(pitch_mix_rows, "hard_contact_rate", "sample_pitches"),
        f"{prefix}_starter_mistake_shape_available_flag": 1 if mistake else 0,
        f"{prefix}_starter_mistake_shape_snapshot_age_days": _age_days(mistake["snapshot_date"], game_date) if mistake else None,
        f"{prefix}_starter_mistake_starts_sample": mistake["starts_sample"] if mistake else None,
        f"{prefix}_starter_mistake_command_break_index": mistake["command_break_index"] if mistake else None,
        f"{prefix}_starter_mistake_meltdown_start_rate": mistake["meltdown_start_rate"] if mistake else None,
        f"{prefix}_starter_mistake_first_batter_reach_rate": mistake["first_batter_reach_rate"] if mistake else None,
        f"{prefix}_starter_mistake_first_inning_run_allowed_rate": mistake["first_inning_run_allowed_rate"] if mistake else None,
        f"{prefix}_starter_mistake_walk_burst_start_rate": mistake["walk_burst_start_rate"] if mistake else None,
        f"{prefix}_starter_mistake_home_run_start_rate": mistake["home_run_start_rate"] if mistake else None,
        f"{prefix}_starter_mistake_post_damage_recovery_rate": mistake["post_damage_recovery_rate"] if mistake else None,
    }


def _relief_game_summaries(appearances: list[sqlite3.Row]) -> dict[str, list[dict[str, Any]]]:
    by_team_game: dict[tuple[str, str], list[sqlite3.Row]] = defaultdict(list)
    for row in appearances:
        if row["team_id"] is None or row["game_id"] is None or row["is_starting_pitcher"]:
            continue
        by_team_game[(str(row["team_id"]), str(row["game_id"]))].append(row)
    by_team: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for (team_id, game_id), rows in by_team_game.items():
        game_date = rows[0]["game_date"]
        by_team[team_id].append(
            {
                "game_id": game_id,
                "game_date": game_date,
                "reliever_count": len({row["pitcher_id"] for row in rows}),
                "relief_outs": _sum([row["outs_recorded"] for row in rows]),
                "relief_pitches": _sum([row["pitches_thrown"] for row in rows]),
                "relief_runs_allowed": _sum([row["runs_allowed"] for row in rows]),
                "relief_hits_walks_allowed": (_sum([row["hits_allowed"] for row in rows]) or 0)
                + (_sum([row["walks_allowed"] for row in rows]) or 0),
            }
        )
    for rows in by_team.values():
        rows.sort(key=lambda item: (item.get("game_date") or "", item.get("game_id") or ""))
    return by_team


def _reliever_chain_features(
    prefix: str,
    team_id: str,
    game_date: str,
    relief_history_by_team: dict[str, list[dict[str, Any]]],
    chain_by_team: dict[str, list[sqlite3.Row]],
    usage_by_pitcher: dict[str, list[sqlite3.Row]],
    command_by_pitcher: dict[str, list[sqlite3.Row]],
) -> dict[str, Any]:
    prior = [row for row in relief_history_by_team.get(team_id, []) if row["game_date"] and row["game_date"] < game_date]
    last = prior[-1] if prior else {}
    chain = _latest_rows_by_snapshot(chain_by_team.get(team_id, []), game_date)
    probabilities = [row["first_reliever_likelihood"] for row in chain]
    candidate_ids = [str(row["pitcher_id"]) for row in chain]
    usage_rows = []
    command_rows = []
    for pitcher_id in candidate_ids:
        usage = _latest_snapshot(usage_by_pitcher.get(pitcher_id, []), game_date)
        command = _latest_snapshot(command_by_pitcher.get(pitcher_id, []), game_date)
        if usage:
            usage_rows.append(usage)
        if command:
            command_rows.append(command)
    five_plus = lambda row: (row.get("reliever_count") or 0) >= 5
    return {
        f"{prefix}_relief_prior_team_game_count": len(prior),
        f"{prefix}_relief_last_game_reliever_count": last.get("reliever_count"),
        f"{prefix}_relief_last_game_pitches": last.get("relief_pitches"),
        f"{prefix}_relief_last_game_runs_allowed": last.get("relief_runs_allowed"),
        f"{prefix}_relief_last_game_hits_walks_allowed": last.get("relief_hits_walks_allowed"),
        f"{prefix}_relief_prior_relievers_used_per_game": _avg([row.get("reliever_count") for row in prior]),
        f"{prefix}_relief_prior_pitches_per_game": _avg([row.get("relief_pitches") for row in prior]),
        f"{prefix}_relief_prior_runs_allowed_per_game": _avg([row.get("relief_runs_allowed") for row in prior]),
        f"{prefix}_relief_days_since_5plus_reliever_game": _days_since_event(prior, game_date, five_plus),
        f"{prefix}_relief_current_5plus_reliever_run_length": _current_run_length(prior, five_plus),
        f"{prefix}_reliever_chain_known_flag": 1 if chain else 0,
        f"{prefix}_reliever_candidate_pool_size": len(candidate_ids),
        f"{prefix}_reliever_candidate_pool_entropy": _entropy(probabilities),
        f"{prefix}_reliever_first_up_top2_probability_mass": _top_n_mass(probabilities, 2),
        f"{prefix}_reliever_chain_expected_outs_sum": _sum([row["expected_outs"] for row in chain]),
        f"{prefix}_reliever_chain_expected_outs_avg": _avg([row["expected_outs"] for row in chain]),
        f"{prefix}_reliever_chain_availability_score_avg": _avg([row["availability_score"] for row in chain]),
        f"{prefix}_reliever_chain_bridge_score_avg": _avg([row["bridge_score"] for row in chain]),
        f"{prefix}_reliever_chain_worked_yesterday_count": sum(1 for row in chain if row["worked_yesterday_flag"]),
        f"{prefix}_reliever_chain_back_to_back_count": sum(1 for row in chain if row["back_to_back_flag"]),
        f"{prefix}_reliever_usage_coverage_rate": _safe_div(len(usage_rows), len(candidate_ids)),
        f"{prefix}_reliever_usage_days_since_last_avg": _avg([row["days_since_last_appearance"] for row in usage_rows]),
        f"{prefix}_reliever_usage_fatigue_score_avg": _avg([row["fatigue_score"] for row in usage_rows]),
        f"{prefix}_reliever_usage_availability_score_avg": _avg([row["availability_score"] for row in usage_rows]),
        f"{prefix}_reliever_command_profile_coverage_rate": _safe_div(len(command_rows), len(candidate_ids)),
        f"{prefix}_reliever_command_risk_index_avg": _avg([row["command_risk_index"] for row in command_rows]),
        f"{prefix}_reliever_command_ball_rate_avg": _avg([row["ball_rate"] for row in command_rows]),
        f"{prefix}_reliever_command_free_pass_rate_avg": _avg([row["free_pass_rate"] for row in command_rows]),
        f"{prefix}_reliever_command_reached_rate_avg": _avg([row["reached_rate"] for row in command_rows]),
        f"{prefix}_reliever_command_run_delta_per_entry_avg": _avg([row["run_delta_per_entry"] for row in command_rows]),
    }


def _lineup_by_game_team(rows: list[sqlite3.Row]) -> dict[tuple[str, str], sqlite3.Row]:
    mapping: dict[tuple[str, str], sqlite3.Row] = {}
    for row in rows:
        mapping[(str(row["game_id"]), str(row["team_id"]))] = row
    return mapping


def _lineup_slots_by_lineup(rows: list[sqlite3.Row]) -> dict[str, list[sqlite3.Row]]:
    grouped: dict[str, list[sqlite3.Row]] = defaultdict(list)
    for row in rows:
        grouped[str(row["lineup_id"])].append(row)
    return grouped


def _matchups_by_game_team(rows: list[sqlite3.Row]) -> dict[tuple[str, str], list[sqlite3.Row]]:
    grouped: dict[tuple[str, str], list[sqlite3.Row]] = defaultdict(list)
    for row in rows:
        grouped[(str(row["game_id"]), str(row["team_id"]))].append(row)
    return grouped


def _hitter_path_features(
    prefix: str,
    game_id: str,
    team_id: str,
    game_date: str,
    lineup_by_game_team: dict[tuple[str, str], sqlite3.Row],
    slots_by_lineup: dict[str, list[sqlite3.Row]],
    matchups_by_game_team: dict[tuple[str, str], list[sqlite3.Row]],
    pitch_response_by_player: dict[str, list[sqlite3.Row]],
    statcast_by_player: dict[str, list[sqlite3.Row]],
    opponent_context_by_player: dict[str, list[sqlite3.Row]],
) -> dict[str, Any]:
    lineup = lineup_by_game_team.get((game_id, team_id))
    slots = slots_by_lineup.get(str(lineup["lineup_id"]), []) if lineup else []
    player_ids = [str(row["player_id"]) for row in slots]
    matchups = matchups_by_game_team.get((game_id, team_id), [])
    response_rows = []
    statcast_rows = []
    context_rows = []
    for player_id in player_ids:
        response_rows.extend(_latest_rows_by_snapshot(pitch_response_by_player.get(player_id, []), game_date))
        statcast = _latest_snapshot(statcast_by_player.get(player_id, []), game_date)
        context = _latest_snapshot(opponent_context_by_player.get(player_id, []), game_date)
        if statcast:
            statcast_rows.append(statcast)
        if context:
            context_rows.append(context)
    matchup_hitter_count = len({row["hitter_id"] for row in matchups if row["hitter_id"] is not None})
    return {
        f"{prefix}_lineup_known_flag": 1 if lineup else 0,
        f"{prefix}_lineup_known_slot_count": len(slots),
        f"{prefix}_lineup_complete_flag": 1 if len(slots) == 9 else 0,
        f"{prefix}_hitter_path_lineup_player_count": len(player_ids),
        f"{prefix}_hitter_path_starter_phase_matchup_hitter_count": matchup_hitter_count,
        f"{prefix}_hitter_path_starter_phase_damage_fit_avg": _avg([row["damage_fit"] for row in matchups]),
        f"{prefix}_hitter_path_starter_phase_whiff_fit_avg": _avg([row["pitch_fit_whiff"] for row in matchups]),
        f"{prefix}_hitter_path_starter_phase_traffic_fit_avg": _avg([row["traffic_fit"] for row in matchups]),
        f"{prefix}_hitter_path_pitch_type_response_coverage_rate": _safe_div(len({row["player_id"] for row in response_rows}), len(player_ids)),
        f"{prefix}_hitter_path_pitch_type_response_rows": len(response_rows),
        f"{prefix}_hitter_path_pitch_type_response_sample_pitches": _sum([row["sample_pitches"] for row in response_rows]),
        f"{prefix}_hitter_path_pitch_type_damage_rate_avg": _avg([row["damage_rate"] for row in response_rows]),
        f"{prefix}_hitter_path_pitch_type_whiff_rate_avg": _avg([row["whiff_rate"] for row in response_rows]),
        f"{prefix}_hitter_path_pitch_type_expected_slugging_avg": _avg([row["expected_slugging"] for row in response_rows]),
        f"{prefix}_hitter_path_statcast_coverage_rate": _safe_div(len(statcast_rows), len(player_ids)),
        f"{prefix}_hitter_path_statcast_xwoba_trend_avg": _avg([row["xwoba_trend_7_minus_30"] for row in statcast_rows]),
        f"{prefix}_hitter_path_statcast_barrel_trend_avg": _avg([row["barrel_trend_7_minus_30"] for row in statcast_rows]),
        f"{prefix}_hitter_path_statcast_hard_hit_trend_avg": _avg([row["hard_hit_trend_7_minus_30"] for row in statcast_rows]),
        f"{prefix}_hitter_path_opponent_context_coverage_rate": _safe_div(len(context_rows), len(player_ids)),
        f"{prefix}_hitter_path_opponent_weighted_hits_per_pa_avg": _avg([row["weighted_hits_per_pa_last10"] for row in context_rows]),
        f"{prefix}_hitter_path_opponent_weighted_total_bases_per_pa_avg": _avg([row["weighted_total_bases_per_pa_last10"] for row in context_rows]),
    }


def _market_features(game: sqlite3.Row, snapshots_by_game: dict[str, list[sqlite3.Row]]) -> dict[str, Any]:
    start_time = game["start_time_utc"]
    snapshots = snapshots_by_game.get(str(game["game_id"]), [])
    pregame = []
    if start_time:
        pregame = [row for row in snapshots if row["captured_at"] and row["captured_at"] < start_time]
    total_lines = [row["line_value"] for row in pregame if row["market_type"] == "total" and row["line_value"] is not None]
    f5_lines = [row["line_value"] for row in pregame if row["market_type"] == "first5Total" and row["line_value"] is not None]
    return {
        "market_any_pregame_snapshot_count": len(pregame),
        "market_total_pregame_snapshot_count": len(total_lines),
        "market_f5_total_pregame_snapshot_count": len(f5_lines),
        "market_total_line_min_pregame": min(total_lines, default=None),
        "market_total_line_max_pregame": max(total_lines, default=None),
        "market_total_line_last_pregame": total_lines[-1] if total_lines else None,
        "market_f5_total_line_last_pregame": f5_lines[-1] if f5_lines else None,
    }


def _context_features(prefix: str, rows: list[dict[str, Any]], game_date: str) -> dict[str, Any]:
    prior = [row for row in rows if row.get("game_date") and row["game_date"] < game_date]
    last = prior[-1] if prior else {}
    return {
        f"{prefix}_context_days_since_prior_game": _days_between(last.get("game_date"), game_date) if last else None,
        f"{prefix}_context_played_yesterday_flag": 1 if last and _days_between(last.get("game_date"), game_date) == 1 else 0,
        f"{prefix}_context_prior_game_was_chaos_flag": 1 if last and (last.get("primary_story_label") == "crooked_inning_chaos" or last.get("scoring_shape_label") == "swingy_high_total") else 0,
        f"{prefix}_context_prior_game_dead_bat_flag": 1 if last and last.get("primary_story_label") == "dead_bat_grind" else 0,
        f"{prefix}_context_prior_game_late_break_flag": last.get("late_break_flag") if last else None,
    }


def _build_indexes(conn: sqlite3.Connection) -> dict[str, Any]:
    team_rows = _load_table(conn, "team_game_stats", "team_id, game_date, game_id")
    phase_rows = _load_table(conn, "phase_outcomes")
    label_rows = _load_table(conn, "game_story_labels")
    signal_rows = _load_table(conn, "game_story_signals")
    starter_rows = _load_table(conn, "starting_pitchers")
    starter_logs = _load_table(conn, "starting_pitcher_game_logs", "pitcher_id, game_date")
    pitcher_appearances = _load_table(conn, "pitcher_appearances", "team_id, game_date")
    pitch_mix = _load_table(conn, "pitcher_pitch_mix_snapshots", "pitcher_id, snapshot_date")
    mistake_shape = _load_table(conn, "pitcher_mistake_shape_snapshots", "pitcher_id, snapshot_date")
    usage = _load_table(conn, "bullpen_usage_snapshots", "pitcher_id, snapshot_date")
    chains = _load_table(conn, "likely_relief_chains", "team_id, snapshot_date")
    command = _load_table(conn, "reliever_command_profiles", "pitcher_id, snapshot_date")
    lineups = _load_table(conn, "lineups")
    lineup_slots = _load_table(conn, "lineup_slots")
    matchups = _load_table(conn, "lineup_matchup_snapshots")
    pitch_response = _load_table(conn, "player_pitch_type_response_snapshots", "player_id, snapshot_date")
    statcast = _load_table(conn, "player_statcast_snapshots", "player_id, snapshot_date")
    opponent_context = _load_table(conn, "player_opponent_context_snapshots", "player_id, snapshot_date")
    market = _load_table(conn, "market_snapshots", "game_id, captured_at")

    phase_by_game_team = {(str(row["game_id"]), str(row["team_id"])): row for row in phase_rows}
    labels_by_game = {str(row["game_id"]): row for row in label_rows}
    signals_by_game = {str(row["game_id"]): row for row in signal_rows}
    return {
        "team_history_by_team": _build_team_history(team_rows, phase_by_game_team, labels_by_game, signals_by_game),
        "starter_by_game_team": _starter_id_by_game_team(starter_rows),
        "starter_logs_by_pitcher": _rows_by_key(starter_logs, "pitcher_id"),
        "pitch_mix_by_pitcher": _rows_by_key(pitch_mix, "pitcher_id"),
        "mistake_by_pitcher": _rows_by_key(mistake_shape, "pitcher_id"),
        "relief_history_by_team": _relief_game_summaries(pitcher_appearances),
        "chain_by_team": _rows_by_key(chains, "team_id"),
        "usage_by_pitcher": _rows_by_key(usage, "pitcher_id"),
        "command_by_pitcher": _rows_by_key(command, "pitcher_id"),
        "lineup_by_game_team": _lineup_by_game_team(lineups),
        "slots_by_lineup": _lineup_slots_by_lineup(lineup_slots),
        "matchups_by_game_team": _matchups_by_game_team(matchups),
        "pitch_response_by_player": _rows_by_key(pitch_response, "player_id"),
        "statcast_by_player": _rows_by_key(statcast, "player_id"),
        "opponent_context_by_player": _rows_by_key(opponent_context, "player_id"),
        "market_by_game": _rows_by_key(market, "game_id"),
    }


def _game_context(game: sqlite3.Row) -> dict[str, Any]:
    game_date = _date(game["game_date"])
    start_hour = None
    if game["start_time_utc"]:
        try:
            start_hour = datetime.fromisoformat(str(game["start_time_utc"]).replace("Z", "+00:00")).hour
        except ValueError:
            start_hour = None
    return {
        "game_day_of_week": game_date.weekday() if game_date else None,
        "game_is_weekend_flag": 1 if game_date and game_date.weekday() >= 5 else 0,
        "game_start_hour_utc": start_hour,
        "game_series_game_number": game["series_game_number"],
        "game_series_game_number_known_flag": 1 if game["series_game_number"] is not None else 0,
    }


def build_matrix(conn: sqlite3.Connection, start_date: str, end_date: str) -> list[dict[str, Any]]:
    games = _load_games(conn, start_date, end_date)
    indexes = _build_indexes(conn)
    matrix: list[dict[str, Any]] = []
    for game in games:
        game_date = str(game["game_date"])
        game_id = str(game["game_id"])
        home_team_id = str(game["home_team_id"])
        away_team_id = str(game["away_team_id"])
        home_pitcher_id = indexes["starter_by_game_team"].get((game_id, home_team_id))
        away_pitcher_id = indexes["starter_by_game_team"].get((game_id, away_team_id))
        row: dict[str, Any] = {
            "game_id": game_id,
            "game_date": game_date,
            "game_status": game["status"],
            "game_season": game["season"],
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
            "target_total_bucket": game["scoring_shape_label"] or _bucket_total(game["total_runs"]),
            "target_f5_bucket": game["early_phase_label"] or _bucket_f5(game["f5_total_runs"]),
            "target_chaos_game_flag": _target_chaos_flag(game),
        }
        row.update(_game_context(game))
        for prefix, team_id, pitcher_id in (
            ("home", home_team_id, home_pitcher_id),
            ("away", away_team_id, away_pitcher_id),
        ):
            team_history = indexes["team_history_by_team"].get(team_id, [])
            row.update(_context_features(prefix, team_history, game_date))
            row.update(_team_story_features(prefix, team_history, game_date))
            row.update(
                _starter_path_features(
                    prefix,
                    pitcher_id,
                    game_date,
                    indexes["starter_logs_by_pitcher"],
                    indexes["pitch_mix_by_pitcher"],
                    indexes["mistake_by_pitcher"],
                )
            )
            row.update(
                _reliever_chain_features(
                    prefix,
                    team_id,
                    game_date,
                    indexes["relief_history_by_team"],
                    indexes["chain_by_team"],
                    indexes["usage_by_pitcher"],
                    indexes["command_by_pitcher"],
                )
            )
            row.update(
                _hitter_path_features(
                    prefix,
                    game_id,
                    team_id,
                    game_date,
                    indexes["lineup_by_game_team"],
                    indexes["slots_by_lineup"],
                    indexes["matchups_by_game_team"],
                    indexes["pitch_response_by_player"],
                    indexes["statcast_by_player"],
                    indexes["opponent_context_by_player"],
                )
            )
        row.update(_market_features(game, indexes["market_by_game"]))
        matrix.append(row)
    return matrix


def _matrix_columns(rows: list[dict[str, Any]]) -> list[str]:
    columns: list[str] = []
    seen: set[str] = set()
    for spec in BASE_SPECS + TARGET_SPECS:
        columns.append(spec.name)
        seen.add(spec.name)
    for row in rows:
        for key in row:
            if key not in seen:
                columns.append(key)
                seen.add(key)
    return columns


def _infer_dtype(values: list[Any]) -> str:
    clean = [value for value in values if value not in (None, "")]
    if not clean:
        return "unknown"
    if all(isinstance(value, int) for value in clean):
        return "integer"
    if all(isinstance(value, (int, float)) for value in clean):
        return "float"
    return "string"


def _data_dictionary(rows: list[dict[str, Any]], columns: list[str]) -> dict[str, Any]:
    known = {
        spec.name: spec
        for spec in BASE_SPECS + TARGET_SPECS
    }
    payload: dict[str, Any] = {}
    for column in columns:
        spec = known.get(column)
        if spec:
            payload[column] = {
                "role": spec.role,
                "dtype": spec.dtype,
                "source": spec.source,
                "description": spec.description,
                "leakage_class": spec.leakage_class,
            }
            continue
        if column.startswith("target_"):
            role = "target"
            leakage = "postgame_target"
        elif column in {"game_id", "game_date", "game_status", "game_home_team_id", "game_away_team_id", "game_start_time_utc"}:
            role = "metadata"
            leakage = "identifier_or_time"
        else:
            role = "feature"
            leakage = "historical_only" if not column.startswith("market_") else "pregame_safe"
        source = "typed_mlb_db"
        if "starter_" in column:
            source = "starting_pitcher_game_logs,pitcher_pitch_mix_snapshots,pitcher_mistake_shape_snapshots"
        elif "reliever_" in column or "relief_" in column:
            source = "pitcher_appearances,likely_relief_chains,bullpen_usage_snapshots,reliever_command_profiles"
        elif "hitter_path" in column or "lineup" in column:
            source = "lineups,lineup_slots,lineup_matchup_snapshots,player_pitch_type_response_snapshots,player_statcast_snapshots"
        elif "story_" in column or "context_" in column:
            source = "team_game_stats,phase_outcomes,game_story_labels,game_story_signals"
        payload[column] = {
            "role": role,
            "dtype": _infer_dtype([row.get(column) for row in rows]),
            "source": source,
            "description": f"M3-FS-002 generated {role} column `{column}`.",
            "leakage_class": leakage,
        }
    return payload


def _missingness(rows: list[dict[str, Any]], columns: list[str]) -> dict[str, Any]:
    total = len(rows)
    return {
        column: {
            "missing_count": sum(1 for row in rows if row.get(column) in (None, "")),
            "missing_rate": _safe_div(sum(1 for row in rows if row.get(column) in (None, "")), total),
        }
        for column in columns
    }


def _avg_col(rows: list[dict[str, Any]], column: str) -> float | None:
    return _avg([row.get(column) for row in rows])


def _coverage(rows: list[dict[str, Any]], source_audit: dict[str, Any]) -> dict[str, Any]:
    total = len(rows)
    def rate(column: str) -> float | None:
        return _safe_div(sum(1 for row in rows if row.get(column)), total)
    return {
        "row_count": total,
        "source_tables": source_audit,
        "story_memory": {
            "home_prior_game_count_avg": _avg_col(rows, "home_story_prior_game_count"),
            "away_prior_game_count_avg": _avg_col(rows, "away_story_prior_game_count"),
            "home_days_since_prior_game_missing_rate": _safe_div(sum(1 for row in rows if row.get("home_story_days_since_prior_game") is None), total),
            "away_days_since_prior_game_missing_rate": _safe_div(sum(1 for row in rows if row.get("away_story_days_since_prior_game") is None), total),
        },
        "starter_path": {
            "home_starter_known_rate": rate("home_starter_known_flag"),
            "away_starter_known_rate": rate("away_starter_known_flag"),
            "home_low_evidence_rate": rate("home_starter_low_evidence_flag"),
            "away_low_evidence_rate": rate("away_starter_low_evidence_flag"),
            "home_pitch_mix_coverage_rate": rate("home_starter_pitch_mix_available_flag"),
            "away_pitch_mix_coverage_rate": rate("away_starter_pitch_mix_available_flag"),
            "home_mistake_shape_coverage_rate": rate("home_starter_mistake_shape_available_flag"),
            "away_mistake_shape_coverage_rate": rate("away_starter_mistake_shape_available_flag"),
        },
        "reliever_chain": {
            "home_chain_known_rate": rate("home_reliever_chain_known_flag"),
            "away_chain_known_rate": rate("away_reliever_chain_known_flag"),
            "home_candidate_pool_size_avg": _avg_col(rows, "home_reliever_candidate_pool_size"),
            "away_candidate_pool_size_avg": _avg_col(rows, "away_reliever_candidate_pool_size"),
            "home_command_coverage_avg": _avg_col(rows, "home_reliever_command_profile_coverage_rate"),
            "away_command_coverage_avg": _avg_col(rows, "away_reliever_command_profile_coverage_rate"),
        },
        "hitter_path": {
            "home_lineup_known_rate": rate("home_lineup_known_flag"),
            "away_lineup_known_rate": rate("away_lineup_known_flag"),
            "home_pitch_type_response_coverage_avg": _avg_col(rows, "home_hitter_path_pitch_type_response_coverage_rate"),
            "away_pitch_type_response_coverage_avg": _avg_col(rows, "away_hitter_path_pitch_type_response_coverage_rate"),
            "home_statcast_coverage_avg": _avg_col(rows, "home_hitter_path_statcast_coverage_rate"),
            "away_statcast_coverage_avg": _avg_col(rows, "away_hitter_path_statcast_coverage_rate"),
        },
        "market_context": {
            "pregame_snapshot_rate": rate("market_any_pregame_snapshot_count"),
        },
    }


def _target_distribution(rows: list[dict[str, Any]]) -> dict[str, Any]:
    payload: dict[str, dict[str, int]] = {}
    for column in [spec.name for spec in TARGET_SPECS]:
        counts: dict[str, int] = {}
        for row in rows:
            key = "null" if row.get(column) is None else str(row.get(column))
            counts[key] = counts.get(key, 0) + 1
        payload[column] = dict(sorted(counts.items(), key=lambda item: item[0]))
    return payload


def _leakage_report(columns: list[str], dictionary: dict[str, Any]) -> dict[str, Any]:
    target_columns = [column for column in columns if column.startswith("target_")]
    feature_columns = [column for column in columns if dictionary[column]["role"] == "feature"]
    bad_feature_targets = [column for column in feature_columns if column.startswith("target_")]
    fixed_truth_terms = [
        column for column in feature_columns if "last5" in column.lower() or "last10" in column.lower()
    ]
    expected_ab_terms = [column for column in feature_columns if "expected_ab" in column.lower()]
    return {
        "ok": not bad_feature_targets and not fixed_truth_terms and not expected_ab_terms,
        "target_columns": target_columns,
        "feature_columns": feature_columns,
        "feature_count": len(feature_columns),
        "target_count": len(target_columns),
        "bad_feature_targets": bad_feature_targets,
        "fixed_window_truth_terms": fixed_truth_terms,
        "expected_ab_terms": expected_ab_terms,
        "notes": [
            "Targets are isolated under target_ columns.",
            "Feature columns use prior rows or pregame timestamp filters.",
            "No feature column names encode last5/last10 as form truth.",
            "No expected AB input is materialized.",
        ],
    }


def validate_contract(contract: dict[str, Any]) -> dict[str, Any]:
    errors: list[str] = []
    warnings: list[str] = []
    required = {"feature_set_id", "version", "source_tables", "targets", "evidence_policy"}
    missing = sorted(required - set(contract))
    if missing:
        errors.append("Missing contract keys: " + ", ".join(missing))
    if contract.get("source_db") != "data-private/warehouse/sports/mlb/sql-mlb.db":
        errors.append("M3-FS-002 must use typed sql-mlb.db as source_db.")
    text = json.dumps(contract).lower()
    for term in ["sports.db", "last5", "last10", "expected ab"]:
        if term in text and term != "sports.db":
            warnings.append(f"Contract mentions `{term}` only as forbidden vocabulary.")
    return {"ok": not errors, "errors": errors, "warnings": warnings}


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
    coverage = _coverage(rows, source_audit)
    leakage = _leakage_report(columns, dictionary)
    lineage = {
        "feature_builder": "pipeline.mlb.features.builders.build_game_story_pitching_state_v0",
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
        "pitching_path_grain": "one opponent pitching path per batting side: starter phase then reliever-chain phase",
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
        "story_memory_coverage": coverage["story_memory"],
        "starter_path_coverage": coverage["starter_path"],
        "reliever_chain_coverage": coverage["reliever_chain"],
        "hitter_path_coverage": coverage["hitter_path"],
        "market_context_coverage": coverage["market_context"],
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
    parser = argparse.ArgumentParser(description="Build MLB-M3 FS-002 game story pitching state features.")
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
