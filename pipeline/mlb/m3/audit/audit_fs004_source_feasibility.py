#!/usr/bin/env python3
from __future__ import annotations

import argparse
import hashlib
import json
import sqlite3
import sys
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


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
    / "runs"
    / "mlb_m3_alpha2_infra_fs003_20260603T162241Z"
    / "fs004_source_feasibility_alpha6"
)
VERSION = "0.1.0"

NON_GOALS = [
    "no feature matrix",
    "no model training",
    "no model tuning",
    "no picks",
    "no selection rows",
    "no player prop pricing",
    "no simulator event logs",
    "no claim that M3 is better",
]

DATE_COLUMN_CANDIDATES = (
    "game_date",
    "snapshot_date",
    "as_of_date",
    "captured_at",
    "start_time_utc",
    "completed_at",
    "created_at",
    "updated_at",
)

TABLE_ALIASES: dict[str, tuple[str, ...]] = {
    "games": ("games", "mlb_games"),
    "game_outcomes": ("game_outcomes", "mlb_game_outcomes"),
    "team_game_stats": ("team_game_stats", "mlb_game_team_stats"),
    "phase_outcomes": ("phase_outcomes", "mlb_phase_outcomes_daily"),
    "game_story_labels": ("game_story_labels", "mlb_game_story_labels"),
    "game_story_signals": ("game_story_signals", "mlb_game_story_signals"),
    "starting_pitcher_game_logs": (
        "starting_pitcher_game_logs",
        "mlb_starting_pitcher_game_logs",
    ),
    "pitcher_appearances": ("pitcher_appearances", "mlb_pitcher_appearances"),
    "pitcher_pitch_mix_snapshots": (
        "pitcher_pitch_mix_snapshots",
        "mlb_pitcher_pitch_mix_daily",
    ),
    "pitcher_mistake_shape_snapshots": (
        "pitcher_mistake_shape_snapshots",
        "mlb_pitcher_mistake_shape_daily",
    ),
    "bullpen_usage_snapshots": ("bullpen_usage_snapshots", "mlb_bullpen_usage"),
    "team_bullpen_shape_snapshots": (
        "team_bullpen_shape_snapshots",
        "mlb_team_bullpen_shape_daily",
    ),
    "bullpen_mistake_shape_snapshots": (
        "bullpen_mistake_shape_snapshots",
        "mlb_bullpen_mistake_shape_daily",
    ),
    "likely_relief_chains": ("likely_relief_chains", "mlb_likely_relief_chains"),
    "reliever_command_profiles": (
        "reliever_command_profiles",
        "mlb_reliever_first_batter_command_profiles",
    ),
    "lineup_matchup_snapshots": (
        "lineup_matchup_snapshots",
        "mlb_lineup_pitcher_matchup_daily",
    ),
    "player_pitch_type_response_snapshots": (
        "player_pitch_type_response_snapshots",
        "mlb_hitter_pitch_type_response_daily",
    ),
    "player_statcast_snapshots": (
        "player_statcast_snapshots",
        "mlb_hitter_statcast_trend_snapshots",
    ),
    "player_opponent_context_snapshots": (
        "player_opponent_context_snapshots",
        "mlb_hitter_opponent_context_snapshots",
    ),
    "plate_appearances": ("plate_appearances", "mlb_plate_appearances"),
    "pitch_events": ("pitch_events", "mlb_pitch_events"),
}


@dataclass(frozen=True)
class ColumnGroup:
    group_id: str
    logical_tables: tuple[str, ...]
    all_of: tuple[str, ...] = ()
    any_of: tuple[str, ...] = ()
    required: bool = True
    note: str = ""


@dataclass(frozen=True)
class SurfaceSourceSpec:
    surface_id: str
    priority: str
    family: str
    source_tables: tuple[str, ...]
    column_groups: tuple[ColumnGroup, ...]
    note: str


SURFACE_SOURCE_SPECS: tuple[SurfaceSourceSpec, ...] = (
    SurfaceSourceSpec(
        surface_id="starter_workload_trajectory",
        priority="P0",
        family="starter_path",
        source_tables=(
            "games",
            "starting_pitchers",
            "starting_pitcher_game_logs",
            "pitcher_appearances",
        ),
        column_groups=(
            ColumnGroup(
                "starter_identity",
                ("starting_pitchers",),
                all_of=("game_id", "team_id", "pitcher_id"),
            ),
            ColumnGroup(
                "start_workload_outcomes",
                ("starting_pitcher_game_logs",),
                any_of=("outs_recorded", "innings_pitched", "pitches_thrown", "batters_faced"),
            ),
            ColumnGroup(
                "starter_chronology",
                ("starting_pitcher_game_logs", "games"),
                any_of=("game_date", "start_time_utc"),
            ),
            ColumnGroup(
                "relief_transition_target",
                ("pitcher_appearances",),
                any_of=("is_starting_pitcher", "pitcher_role", "entry_order"),
                note="Needed to learn when the single starter gives way to the single reliever chain.",
            ),
        ),
        note="Can start from typed starter logs, but true hook path still depends on relief transition quality.",
    ),
    SurfaceSourceSpec(
        surface_id="starter_damage_distribution",
        priority="P0",
        family="starter_path",
        source_tables=("starting_pitcher_game_logs", "pitcher_mistake_shape_snapshots"),
        column_groups=(
            ColumnGroup(
                "starter_damage_box",
                ("starting_pitcher_game_logs",),
                any_of=(
                    "runs_allowed",
                    "earned_runs",
                    "hits_allowed",
                    "home_runs_allowed",
                    "walks_allowed",
                    "strikeouts",
                ),
            ),
            ColumnGroup(
                "mistake_shape_prior",
                ("pitcher_mistake_shape_snapshots",),
                any_of=(
                    "command_break_index",
                    "walk_burst_start_rate",
                    "home_run_start_rate",
                    "meltdown_start_rate",
                    "post_damage_recovery_rate",
                ),
            ),
            ColumnGroup(
                "sample_evidence",
                ("pitcher_mistake_shape_snapshots",),
                any_of=("starts_sample", "window_starts"),
            ),
        ),
        note="Has typed damage evidence; builder must avoid fixed raw windows as truth.",
    ),
    SurfaceSourceSpec(
        surface_id="starter_pitch_shape_change",
        priority="P1",
        family="starter_path",
        source_tables=("pitcher_pitch_mix_snapshots", "pitch_events"),
        column_groups=(
            ColumnGroup(
                "pitch_mix_prior",
                ("pitcher_pitch_mix_snapshots",),
                all_of=("pitcher_id", "pitch_type", "sample_pitches", "pitch_share"),
            ),
            ColumnGroup(
                "pitch_shape_quality",
                ("pitcher_pitch_mix_snapshots",),
                any_of=("whiff_rate", "zone_rate", "command_leak", "damage_allowed", "hard_contact_rate"),
            ),
            ColumnGroup(
                "pitch_event_replay",
                ("pitch_events",),
                any_of=("pitch_type", "pitch_type_code", "call_code", "is_strike", "is_ball"),
            ),
        ),
        note="Source columns exist for pitch-shape state; change detection still needs a builder.",
    ),
    SurfaceSourceSpec(
        surface_id="starter_opponent_pressure_residual",
        priority="P0",
        family="starter_path",
        source_tables=("lineup_matchup_snapshots", "lineups", "lineup_slots"),
        column_groups=(
            ColumnGroup(
                "starter_hitter_matchup",
                ("lineup_matchup_snapshots",),
                all_of=("game_id", "hitter_id", "opposing_pitcher_id"),
            ),
            ColumnGroup(
                "matchup_pressure",
                ("lineup_matchup_snapshots",),
                any_of=(
                    "traffic_fit",
                    "damage_fit",
                    "pitch_fit_damage",
                    "pitch_fit_whiff",
                    "command_stress",
                    "strand_fork_risk",
                ),
            ),
            ColumnGroup(
                "lineup_order",
                ("lineup_slots", "lineup_matchup_snapshots"),
                any_of=("batting_order",),
            ),
        ),
        note="Can compare starter path against opponent lineup pressure without expected AB inputs.",
    ),
    SurfaceSourceSpec(
        surface_id="starter_low_data_uncertainty",
        priority="P0",
        family="starter_path",
        source_tables=("starting_pitcher_game_logs", "pitcher_mistake_shape_snapshots"),
        column_groups=(
            ColumnGroup(
                "starter_event_count",
                ("starting_pitcher_game_logs",),
                all_of=("pitcher_id", "game_date"),
            ),
            ColumnGroup(
                "snapshot_sample_count",
                ("pitcher_mistake_shape_snapshots", "pitcher_pitch_mix_snapshots"),
                any_of=("starts_sample", "window_starts", "sample_pitches"),
            ),
        ),
        note="Low-data uncertainty can be represented as coverage metadata, not as manual confidence boosts.",
    ),
    SurfaceSourceSpec(
        surface_id="reliever_availability_reset",
        priority="P0",
        family="reliever_chain",
        source_tables=("bullpen_usage_snapshots", "likely_relief_chains", "pitcher_appearances"),
        column_groups=(
            ColumnGroup(
                "individual_arm_reset",
                ("bullpen_usage_snapshots", "likely_relief_chains"),
                any_of=(
                    "days_since_last_appearance",
                    "last_appearance_date",
                    "worked_yesterday_flag",
                    "back_to_back_flag",
                    "pitches_last3",
                ),
            ),
            ColumnGroup(
                "availability_scores",
                ("bullpen_usage_snapshots", "likely_relief_chains"),
                any_of=("availability_score", "fatigue_score", "bridge_score"),
            ),
            ColumnGroup(
                "actual_recent_usage",
                ("pitcher_appearances",),
                any_of=("pitches_thrown", "outs_recorded", "batters_faced"),
            ),
        ),
        note="Matches prior rf36 insight: availability needs adaptive reset evidence, not a hard pitch cutoff.",
    ),
    SurfaceSourceSpec(
        surface_id="first_up_reliever_router",
        priority="P0",
        family="reliever_chain",
        source_tables=("likely_relief_chains", "pitcher_appearances"),
        column_groups=(
            ColumnGroup(
                "first_up_candidates",
                ("likely_relief_chains",),
                all_of=("team_id", "pitcher_id", "predicted_rank"),
            ),
            ColumnGroup(
                "first_up_probability_prior",
                ("likely_relief_chains",),
                any_of=("first_reliever_likelihood", "expected_outs", "availability_score", "bridge_score"),
            ),
            ColumnGroup(
                "actual_first_reliever_target",
                ("pitcher_appearances",),
                any_of=("entry_order",),
                note="Canonical table lacks entry_order today; typed staging has it.",
            ),
        ),
        note="First-up router is blocked as a canonical-only target until entry order is promoted or contract-approved.",
    ),
    SurfaceSourceSpec(
        surface_id="reliever_chain_length_regime",
        priority="P0",
        family="reliever_chain",
        source_tables=("team_bullpen_shape_snapshots", "pitcher_appearances"),
        column_groups=(
            ColumnGroup(
                "team_chain_shape",
                ("team_bullpen_shape_snapshots",),
                any_of=(
                    "relievers_used_avg_last3",
                    "relievers_used_avg_last5",
                    "relievers_used_avg_last10",
                    "six_plus_reliever_scramble_rate_last10",
                    "four_plus_reliever_rate_last10",
                ),
            ),
            ColumnGroup(
                "actual_chain_members",
                ("pitcher_appearances",),
                any_of=("pitcher_role", "is_starting_pitcher", "entry_order"),
            ),
            ColumnGroup(
                "chain_workload",
                ("pitcher_appearances",),
                any_of=("outs_recorded", "pitches_thrown", "batters_faced", "runs_allowed"),
            ),
        ),
        note="Can measure relief chain volume; phase/order quality depends on entry-order promotion.",
    ),
    SurfaceSourceSpec(
        surface_id="reliever_performance_volatility",
        priority="P0",
        family="reliever_chain",
        source_tables=(
            "reliever_command_profiles",
            "bullpen_mistake_shape_snapshots",
            "pitcher_appearances",
        ),
        column_groups=(
            ColumnGroup(
                "command_volatility_prior",
                ("reliever_command_profiles",),
                any_of=(
                    "first_pitch_strike_rate",
                    "ball_rate",
                    "free_pass_rate",
                    "reached_rate",
                    "run_delta_per_entry",
                    "command_risk_index",
                ),
            ),
            ColumnGroup(
                "bullpen_mistake_shape",
                ("bullpen_mistake_shape_snapshots",),
                any_of=(
                    "bullpen_chaos_index",
                    "bullpen_meltdown_game_rate",
                    "inherited_traffic_entry_rate",
                    "inherited_traffic_score_rate",
                    "lead_loss_after_entry_rate",
                ),
            ),
            ColumnGroup(
                "actual_reliever_damage",
                ("pitcher_appearances",),
                any_of=("runs_allowed", "hits_allowed", "walks_allowed", "home_runs_allowed", "strikeouts"),
            ),
            ColumnGroup(
                "entry_state_target",
                ("pitcher_appearances", "plate_appearances"),
                any_of=("inherited_runners", "base_state_start"),
                required=False,
                note="Full inherited-runner damage needs better entry-state target than aggregate rates.",
            ),
        ),
        note="Performance volatility sources exist; inherited-runner target quality remains incomplete.",
    ),
    SurfaceSourceSpec(
        surface_id="hitter_vs_starter_phase",
        priority="P0",
        family="hitter_path",
        source_tables=(
            "lineup_matchup_snapshots",
            "player_pitch_type_response_snapshots",
            "player_statcast_snapshots",
            "plate_appearances",
            "pitch_events",
        ),
        column_groups=(
            ColumnGroup(
                "hitter_pitch_response",
                ("player_pitch_type_response_snapshots",),
                all_of=("player_id", "pitch_type", "sample_pitches"),
            ),
            ColumnGroup(
                "hitter_contact_state",
                ("player_statcast_snapshots",),
                any_of=("rolling_7_xwoba", "rolling_14_xwoba", "rolling_30_xwoba", "barrel_trend_7_minus_30"),
            ),
            ColumnGroup(
                "pa_event_replay",
                ("plate_appearances",),
                any_of=("event_type", "base_state_start", "base_state_end", "outs_before", "outs_after"),
            ),
            ColumnGroup(
                "pitch_event_replay",
                ("pitch_events",),
                any_of=("pitch_type", "call_code", "balls", "strikes", "is_in_play"),
            ),
        ),
        note="Starter-phase hitter surface is source-feasible; builder must keep baseline and residual separate.",
    ),
    SurfaceSourceSpec(
        surface_id="hitter_vs_reliever_chain_phase",
        priority="P0",
        family="hitter_path",
        source_tables=("plate_appearances", "pitch_events", "pitcher_appearances", "likely_relief_chains"),
        column_groups=(
            ColumnGroup(
                "pa_pitcher_identity",
                ("plate_appearances",),
                all_of=("game_id", "batter_id", "pitcher_id"),
            ),
            ColumnGroup(
                "relief_role_identity",
                ("pitcher_appearances",),
                any_of=("pitcher_role", "is_starting_pitcher", "entry_order"),
            ),
            ColumnGroup(
                "reliever_chain_prior",
                ("likely_relief_chains",),
                any_of=("predicted_rank", "first_reliever_likelihood", "expected_outs"),
            ),
            ColumnGroup(
                "reliever_phase_order",
                ("pitcher_appearances",),
                any_of=("entry_order",),
                note="Needed to split first-up, bridge, churn, and late-chain hitter paths.",
            ),
        ),
        note="This was missing from FS-003. The DB has PA pitcher identity, but chain phase needs entry-order promotion.",
    ),
    SurfaceSourceSpec(
        surface_id="hitter_current_state_residual",
        priority="P1",
        family="hitter_path",
        source_tables=(
            "player_statcast_snapshots",
            "player_pitch_type_response_snapshots",
            "player_opponent_context_snapshots",
        ),
        column_groups=(
            ColumnGroup(
                "hitter_statcast_state",
                ("player_statcast_snapshots",),
                any_of=("rolling_7_xwoba", "rolling_30_xwoba", "xwoba_trend_7_minus_30", "hard_hit_trend_7_minus_30"),
            ),
            ColumnGroup(
                "pitch_type_response",
                ("player_pitch_type_response_snapshots",),
                any_of=("whiff_rate", "chase_rate", "damage_rate", "expected_slugging", "sample_pitches"),
            ),
            ColumnGroup(
                "opponent_context",
                ("player_opponent_context_snapshots",),
                any_of=("weighted_hits_per_pa_last10", "weighted_total_bases_per_pa_last10"),
            ),
        ),
        note="Source exists, but builder must avoid compressing hitter talent into one opaque score.",
    ),
    SurfaceSourceSpec(
        surface_id="lineup_pa_volume_context",
        priority="P0",
        family="hitter_path",
        source_tables=("lineups", "lineup_slots", "team_game_stats", "plate_appearances"),
        column_groups=(
            ColumnGroup("lineup_identity", ("lineups",), all_of=("game_id", "team_id")),
            ColumnGroup("lineup_slots", ("lineup_slots",), all_of=("lineup_id", "batting_order", "player_id")),
            ColumnGroup(
                "actual_pa_volume_target",
                ("team_game_stats", "plate_appearances"),
                any_of=("plate_appearances", "at_bats", "plate_appearance_id"),
            ),
            ColumnGroup(
                "walk_context",
                ("team_game_stats", "plate_appearances"),
                any_of=("walks", "balls_final", "men_on_base"),
                note="PA volume is downstream of walks, scoring, and pitcher damage, not a fixed expected AB feature.",
            ),
        ),
        note="PA volume can be learned from state, lineup, walk, and scoring context.",
    ),
    SurfaceSourceSpec(
        surface_id="ordered_story_memory",
        priority="P0",
        family="story_memory",
        source_tables=("games", "team_game_stats", "phase_outcomes", "game_story_labels", "game_story_signals"),
        column_groups=(
            ColumnGroup("game_chronology", ("games",), all_of=("game_id", "game_date")),
            ColumnGroup(
                "team_story_history",
                ("team_game_stats", "phase_outcomes"),
                any_of=("team_id", "team_role", "runs_scored", "phase_path_label"),
            ),
            ColumnGroup(
                "story_labels",
                ("game_story_labels", "game_story_signals"),
                any_of=("primary_story_label", "scoring_shape_label", "story_tags_json", "summary_json"),
            ),
        ),
        note="Ordered story memory is source-feasible if the builder preserves sequence order instead of averaging it away.",
    ),
    SurfaceSourceSpec(
        surface_id="traffic_conversion_state",
        priority="P0",
        family="story_memory",
        source_tables=("plate_appearances", "pitch_events", "phase_outcomes", "game_story_signals"),
        column_groups=(
            ColumnGroup(
                "pa_replay_state",
                ("plate_appearances",),
                any_of=(
                    "at_bat_index",
                    "outs_before",
                    "outs_after",
                    "base_state_start",
                    "base_state_end",
                    "away_score_before",
                    "home_score_before",
                    "away_score_after",
                    "home_score_after",
                ),
            ),
            ColumnGroup(
                "count_state",
                ("plate_appearances", "pitch_events"),
                any_of=("balls_final", "strikes_final", "balls", "strikes", "outs"),
            ),
            ColumnGroup(
                "traffic_labels",
                ("phase_outcomes", "game_story_signals"),
                any_of=("traffic_no_conversion_flag", "home_traffic_no_conversion_flag", "away_traffic_no_conversion_flag"),
            ),
        ),
        note="Replay state appears available in typed PA/pitch tables; this is one of the best FS-004 builder starting points.",
    ),
    SurfaceSourceSpec(
        surface_id="game_regime_labels",
        priority="P0",
        family="story_memory",
        source_tables=("game_outcomes", "game_story_labels", "game_story_signals", "phase_outcomes"),
        column_groups=(
            ColumnGroup(
                "run_distribution_targets",
                ("game_outcomes", "game_story_signals"),
                any_of=("total_runs", "total_runs_final", "f5_total_runs", "total_runs_first5"),
            ),
            ColumnGroup(
                "shape_labels",
                ("game_story_labels", "phase_outcomes"),
                any_of=("primary_story_label", "scoring_shape_label", "phase_path_label"),
            ),
            ColumnGroup(
                "chaos_indicators",
                ("game_story_signals", "phase_outcomes"),
                any_of=("bullpen_flip_flag", "lead_changes", "max_comeback_runs", "starter_cracked_flag"),
            ),
        ),
        note="Target labels exist for regime training; feature builder must keep targets postgame-only.",
    ),
    SurfaceSourceSpec(
        surface_id="schedule_travel_context",
        priority="P2",
        family="game_context",
        source_tables=("games", "series_context_snapshots", "venues"),
        column_groups=(
            ColumnGroup("game_schedule", ("games",), any_of=("game_date", "start_time_utc", "series_game_number")),
            ColumnGroup(
                "series_context",
                ("series_context_snapshots",),
                any_of=("series_game_number", "days_since_prior_game", "played_yesterday_flag", "series_position_label"),
                required=False,
            ),
            ColumnGroup(
                "travel_context",
                ("series_context_snapshots", "venues"),
                any_of=("travel_distance_miles", "timezone_offset", "venue_id"),
                required=False,
            ),
        ),
        note="Useful later; current contract treats it as lower priority than state path and reliever chain.",
    ),
    SurfaceSourceSpec(
        surface_id="market_context_lines",
        priority="P2",
        family="market_context",
        source_tables=("market_snapshots",),
        column_groups=(
            ColumnGroup(
                "market_line_snapshot",
                ("market_snapshots",),
                any_of=("market_type", "selection", "line_value", "odds_american", "implied_probability", "captured_at"),
            ),
        ),
        note="Available as context/calibration input, but not needed to materialize first FS-004 state path.",
    ),
    SurfaceSourceSpec(
        surface_id="tail_calibration_feedback",
        priority="P0",
        family="feedback",
        source_tables=("settlement_rows", "component_settlement_rows", "model_runs"),
        column_groups=(
            ColumnGroup(
                "settlement_feedback",
                ("settlement_rows", "component_settlement_rows"),
                any_of=("settlement_status", "actual_value", "outcome", "source_detail_json"),
                required=False,
                note="Contract source tables do not currently include settlement feedback tables.",
            ),
            ColumnGroup(
                "model_registry_feedback",
                ("model_runs", "model_component_runs"),
                any_of=("run_id", "model_name", "created_at", "metrics_json"),
                required=False,
            ),
        ),
        note="FS-004 can start without calibration feedback, but promotion gates must remain deferred.",
    ),
)


def utc_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace(
        "+00:00", "Z"
    )


def resolve_path(value: str | Path) -> Path:
    path = Path(value)
    if path.is_absolute():
        return path
    return ROOT / path


def quote_ident(value: str) -> str:
    return '"' + value.replace('"', '""') + '"'


def load_json(path: Path) -> dict[str, Any]:
    with path.open("r", encoding="utf-8") as handle:
        payload = json.load(handle)
    if not isinstance(payload, dict):
        raise ValueError(f"Expected JSON object: {path}")
    return payload


def write_json(path: Path, payload: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8")


def sha256_path(path: Path) -> str | None:
    if not path.exists() or not path.is_file():
        return None
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def artifact_entry(role: str, path: Path) -> dict[str, Any]:
    return {
        "role": role,
        "path": str(path),
        "exists": path.exists(),
        "sha256": sha256_path(path),
        "bytes": path.stat().st_size if path.exists() else None,
    }


def connect(db_path: Path) -> sqlite3.Connection:
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    return conn


def table_exists(conn: sqlite3.Connection, table: str) -> bool:
    row = conn.execute(
        """
        select 1
        from sqlite_master
        where type in ('table', 'view') and name = ?
        limit 1
        """,
        (table,),
    ).fetchone()
    return row is not None


def table_columns(conn: sqlite3.Connection, table: str) -> dict[str, dict[str, Any]]:
    if not table_exists(conn, table):
        return {}
    rows = conn.execute(f"pragma table_info({quote_ident(table)})").fetchall()
    return {
        str(row["name"]): {
            "cid": row["cid"],
            "type": row["type"],
            "notnull": bool(row["notnull"]),
            "pk": bool(row["pk"]),
        }
        for row in rows
    }


def table_row_count(conn: sqlite3.Connection, table: str) -> int | None:
    if not table_exists(conn, table):
        return None
    return int(conn.execute(f"select count(*) as count from {quote_ident(table)}").fetchone()["count"])


def date_range_from_table(
    conn: sqlite3.Connection,
    table: str,
    columns: dict[str, dict[str, Any]],
) -> dict[str, Any]:
    direct_column = next((column for column in DATE_COLUMN_CANDIDATES if column in columns), None)
    if direct_column:
        row = conn.execute(
            f"""
            select min(substr({quote_ident(direct_column)}, 1, 10)) as min_date,
                   max(substr({quote_ident(direct_column)}, 1, 10)) as max_date
            from {quote_ident(table)}
            where {quote_ident(direct_column)} is not null
            """
        ).fetchone()
        return {
            "date_source": "direct",
            "date_column": direct_column,
            "min_date": row["min_date"],
            "max_date": row["max_date"],
        }
    if "game_id" in columns and table_exists(conn, "games"):
        row = conn.execute(
            f"""
            select min(g.game_date) as min_date, max(g.game_date) as max_date
            from {quote_ident(table)} t
            join games g on g.game_id = t.game_id
            """
        ).fetchone()
        return {
            "date_source": "join_games_game_id",
            "date_column": "games.game_date",
            "min_date": row["min_date"],
            "max_date": row["max_date"],
        }
    if "game_pk" in columns and table_exists(conn, "mlb_games"):
        row = conn.execute(
            f"""
            select min(g.game_date) as min_date, max(g.game_date) as max_date
            from {quote_ident(table)} t
            join mlb_games g on cast(g.game_pk as text) = cast(t.game_pk as text)
            """
        ).fetchone()
        return {
            "date_source": "join_mlb_games_game_pk",
            "date_column": "mlb_games.game_date",
            "min_date": row["min_date"],
            "max_date": row["max_date"],
        }
    if "plate_appearance_id" in columns and table_exists(conn, "plate_appearances"):
        row = conn.execute(
            f"""
            select min(g.game_date) as min_date, max(g.game_date) as max_date
            from {quote_ident(table)} t
            join plate_appearances pa on pa.plate_appearance_id = t.plate_appearance_id
            join games g on g.game_id = pa.game_id
            """
        ).fetchone()
        return {
            "date_source": "join_plate_appearances_games",
            "date_column": "games.game_date",
            "min_date": row["min_date"],
            "max_date": row["max_date"],
        }
    if "lineup_id" in columns and table_exists(conn, "lineups") and table_exists(conn, "games"):
        row = conn.execute(
            f"""
            select min(g.game_date) as min_date, max(g.game_date) as max_date
            from {quote_ident(table)} t
            join lineups l on l.lineup_id = t.lineup_id
            join games g on g.game_id = l.game_id
            """
        ).fetchone()
        return {
            "date_source": "join_lineups_games",
            "date_column": "games.game_date",
            "min_date": row["min_date"],
            "max_date": row["max_date"],
        }
    return {
        "date_source": None,
        "date_column": None,
        "min_date": None,
        "max_date": None,
    }


def table_audit(
    conn: sqlite3.Connection,
    table: str,
    contract_source_tables: set[str],
) -> dict[str, Any]:
    exists = table_exists(conn, table)
    columns = table_columns(conn, table)
    row_count = table_row_count(conn, table)
    date_range = date_range_from_table(conn, table, columns) if exists else {}
    return {
        "table": table,
        "exists": exists,
        "listed_in_contract_source_tables": table in contract_source_tables,
        "row_count": row_count,
        "column_count": len(columns),
        "columns": sorted(columns),
        **date_range,
    }


def aliases_for(logical_table: str) -> tuple[str, ...]:
    return TABLE_ALIASES.get(logical_table, (logical_table,))


def non_null_count(conn: sqlite3.Connection, table: str, column: str) -> int | None:
    if not table_exists(conn, table):
        return None
    columns = table_columns(conn, table)
    if column not in columns:
        return None
    row = conn.execute(
        f"select count({quote_ident(column)}) as count from {quote_ident(table)}"
    ).fetchone()
    return int(row["count"])


def evaluate_table_group(
    conn: sqlite3.Connection,
    logical_tables: tuple[str, ...],
    contract_source_tables: set[str],
) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for logical_table in logical_tables:
        for table in aliases_for(logical_table):
            columns = table_columns(conn, table)
            rows.append(
                {
                    "logical_table": logical_table,
                    "table": table,
                    "exists": bool(columns),
                    "is_contract_source": table in contract_source_tables,
                    "is_primary_alias": table == aliases_for(logical_table)[0],
                    "columns": sorted(columns),
                    "row_count": table_row_count(conn, table),
                }
            )
    return rows


def evaluate_column_group(
    conn: sqlite3.Connection,
    group: ColumnGroup,
    contract_source_tables: set[str],
) -> dict[str, Any]:
    candidate_tables = evaluate_table_group(conn, group.logical_tables, contract_source_tables)
    evaluations: list[dict[str, Any]] = []
    for table_info in candidate_tables:
        table = table_info["table"]
        if not table_info["exists"]:
            evaluations.append(
                {
                    **table_info,
                    "missing_columns": sorted(set(group.all_of + group.any_of)),
                    "covered_columns": [],
                    "meets_group": False,
                    "non_null_counts": {},
                }
            )
            continue
        columns = set(table_info["columns"])
        all_present = all(column in columns for column in group.all_of)
        any_present = not group.any_of or any(column in columns for column in group.any_of)
        required_columns = set(group.all_of)
        if group.any_of:
            required_columns.update(group.any_of)
        covered_columns = sorted(column for column in required_columns if column in columns)
        missing_columns = sorted(column for column in required_columns if column not in columns)
        non_null_counts = {
            column: non_null_count(conn, table, column)
            for column in covered_columns
        }
        all_has_data = all(
            (non_null_counts.get(column) or 0) > 0
            for column in group.all_of
        )
        any_has_data = (
            True
            if not group.any_of
            else any(
                column in columns and (non_null_counts.get(column) or 0) > 0
                for column in group.any_of
            )
        )
        check_columns = sorted(set(group.all_of).union(covered_columns))
        evaluations.append(
            {
                **table_info,
                "missing_columns": missing_columns,
                "covered_columns": covered_columns,
                "missing_data_columns": [
                    column
                    for column in check_columns
                    if column in columns and (non_null_counts.get(column) or 0) == 0
                ],
                "meets_group": all_present and any_present and all_has_data and any_has_data,
                "non_null_counts": non_null_counts,
            }
        )
    covered_contract = next(
        (
            row
            for row in evaluations
            if row["meets_group"] and row["is_contract_source"]
        ),
        None,
    )
    covered_primary = next(
        (
            row
            for row in evaluations
            if row["meets_group"] and row["is_primary_alias"]
        ),
        None,
    )
    covered_any = next((row for row in evaluations if row["meets_group"]), None)
    if covered_contract:
        status = "covered_contract_source"
        covered_by = covered_contract
    elif covered_primary:
        status = "covered_primary_alias_not_in_contract"
        covered_by = covered_primary
    elif covered_any:
        status = "covered_fallback_source"
        covered_by = covered_any
    else:
        status = "missing"
        covered_by = None
    return {
        "group_id": group.group_id,
        "required": group.required,
        "logical_tables": list(group.logical_tables),
        "all_of": list(group.all_of),
        "any_of": list(group.any_of),
        "note": group.note,
        "status": status,
        "covered_by_table": covered_by["table"] if covered_by else None,
        "covered_by_contract_source": bool(covered_by and covered_by["is_contract_source"]),
        "evaluations": evaluations,
    }


def surface_status(group_rows: list[dict[str, Any]]) -> str:
    required_rows = [row for row in group_rows if row["required"]]
    if any(row["status"] == "missing" for row in required_rows):
        return "blocked_missing_required_evidence"
    if any(row["status"] != "covered_contract_source" for row in required_rows):
        return "partial_source_contract_decision"
    if any(row["status"] == "missing" for row in group_rows):
        return "source_feasible_with_optional_gaps"
    if any(row["status"] != "covered_contract_source" for row in group_rows):
        return "source_feasible_with_optional_source_decisions"
    return "source_feasible"


def contract_surface_ids(contract: dict[str, Any]) -> set[str]:
    ids = set()
    for surface in contract.get("surface_contracts", []):
        surface_id = surface.get("surface_id")
        if isinstance(surface_id, str):
            ids.add(surface_id)
    return ids


def build_surface_matrix(
    conn: sqlite3.Connection,
    contract: dict[str, Any],
) -> list[dict[str, Any]]:
    contract_sources = set(contract.get("source_tables", []))
    contract_surfaces = contract_surface_ids(contract)
    rows: list[dict[str, Any]] = []
    for spec in SURFACE_SOURCE_SPECS:
        group_rows = [
            evaluate_column_group(conn, group, contract_sources)
            for group in spec.column_groups
        ]
        status = surface_status(group_rows)
        rows.append(
            {
                "surface_id": spec.surface_id,
                "priority": spec.priority,
                "family": spec.family,
                "listed_in_contract_surface_contracts": spec.surface_id in contract_surfaces,
                "source_tables": list(spec.source_tables),
                "status": status,
                "required_group_count": sum(1 for group in group_rows if group["required"]),
                "missing_required_groups": [
                    group["group_id"]
                    for group in group_rows
                    if group["required"] and group["status"] == "missing"
                ],
                "fallback_required_groups": [
                    group["group_id"]
                    for group in group_rows
                    if group["required"] and group["status"] not in {"covered_contract_source", "missing"}
                ],
                "optional_gaps": [
                    group["group_id"]
                    for group in group_rows
                    if not group["required"] and group["status"] == "missing"
                ],
                "note": spec.note,
                "column_groups": group_rows,
            }
        )
    return rows


def all_referenced_tables(contract: dict[str, Any]) -> list[str]:
    tables = set(contract.get("source_tables", []))
    for spec in SURFACE_SOURCE_SPECS:
        tables.update(spec.source_tables)
        for table in spec.source_tables:
            tables.update(aliases_for(table))
        for group in spec.column_groups:
            for table in group.logical_tables:
                tables.update(aliases_for(table))
    return sorted(tables)


def summarize_table_audit(table_rows: list[dict[str, Any]]) -> dict[str, Any]:
    existing = [row for row in table_rows if row["exists"]]
    missing = [row for row in table_rows if not row["exists"]]
    populated = [row for row in existing if row["row_count"] and row["row_count"] > 0]
    contract_tables = [row for row in table_rows if row["listed_in_contract_source_tables"]]
    missing_contract = [
        row["table"]
        for row in contract_tables
        if not row["exists"] or not row["row_count"]
    ]
    return {
        "table_count": len(table_rows),
        "existing_table_count": len(existing),
        "missing_table_count": len(missing),
        "populated_table_count": len(populated),
        "contract_source_table_count": len(contract_tables),
        "missing_or_empty_contract_source_tables": sorted(missing_contract),
    }


def summarize_surfaces(surface_rows: list[dict[str, Any]]) -> dict[str, Any]:
    status_counts: dict[str, int] = {}
    priority_counts: dict[str, int] = {}
    for row in surface_rows:
        status_counts[row["status"]] = status_counts.get(row["status"], 0) + 1
        priority_counts[row["priority"]] = priority_counts.get(row["priority"], 0) + 1
    return {
        "surface_count": len(surface_rows),
        "status_counts": dict(sorted(status_counts.items())),
        "priority_counts": dict(sorted(priority_counts.items())),
        "blocked_surfaces": sorted(
            row["surface_id"]
            for row in surface_rows
            if row["status"] == "blocked_missing_required_evidence"
        ),
        "source_decision_surfaces": sorted(
            row["surface_id"]
            for row in surface_rows
            if "source_contract_decision" in row["status"]
        ),
    }


def report_markdown(
    audit: dict[str, Any],
    surface_rows: list[dict[str, Any]],
    table_summary: dict[str, Any],
    surface_summary: dict[str, Any],
) -> str:
    status_counts = surface_summary["status_counts"]
    lines = [
        "# MLB-M3 Alpha-6 FS-004 Source Feasibility Audit",
        "",
        f"Run ID: `{audit['run_id']}`",
        "",
        "## Summary",
        "",
        f"- Contract: `{audit['contract_uri']}`",
        f"- DB: `{audit['db_uri']}`",
        f"- Tables audited: `{table_summary['table_count']}`",
        f"- Existing tables: `{table_summary['existing_table_count']}`",
        f"- Populated tables: `{table_summary['populated_table_count']}`",
        f"- Surfaces audited: `{surface_summary['surface_count']}`",
        f"- Surface statuses: `{status_counts}`",
        "",
        "## Source DAG",
        "",
        "```mermaid",
        "flowchart TD",
        "  DB[\"sql-mlb.db typed source\"] --> REPLAY[\"Replay state<br/>plate appearances + pitch events\"]",
        "  DB --> STARTER[\"Starter path sources<br/>logs, mix, mistake shape\"]",
        "  DB --> RELIEF[\"Single reliever chain sources<br/>usage, chain, command, appearances\"]",
        "  DB --> HITTER[\"Hitter path sources<br/>lineup, pitch response, statcast\"]",
        "  DB --> STORY[\"Story and regime labels<br/>outcomes, phase, story signals\"]",
        "  REPLAY --> FS004[\"FS-004 builder readiness\"]",
        "  STARTER --> FS004",
        "  RELIEF --> FS004",
        "  HITTER --> FS004",
        "  STORY --> FS004",
        "  FS004 --> MATRIX[\"FS-004 matrix<br/>status: not materialized\"]",
        "```",
        "",
        "## Surface Feasibility",
        "",
        "| Surface | Priority | Family | Status | Missing Required Groups | Source Decisions |",
        "| --- | --- | --- | --- | --- | --- |",
    ]
    for row in surface_rows:
        missing = ", ".join(f"`{value}`" for value in row["missing_required_groups"]) or "-"
        decisions = ", ".join(f"`{value}`" for value in row["fallback_required_groups"]) or "-"
        lines.append(
            f"| `{row['surface_id']}` | `{row['priority']}` | `{row['family']}` | `{row['status']}` | {missing} | {decisions} |"
        )
    lines.extend(
        [
            "",
            "## Important Findings",
            "",
            "- Replay fields for PA/pitch state are present in typed `plate_appearances` and `pitch_events`.",
            "- The first-up reliever router and hitter-vs-reliever-chain phase need populated canonical `entry_order`/chain-phase fields. Typed staging has values; canonical `pitcher_appearances` must be backfilled before those surfaces are fully feasible.",
            "- Tail calibration feedback is intentionally not a builder blocker, but promotion and pricing must remain deferred until settlement/calibration gates exist.",
            "- This audit does not create features or train anything; it only maps FS-004 source readiness.",
            "",
        ]
    )
    return "\n".join(lines)


def run_audit(db_path: Path, contract_path: Path, output_dir: Path) -> dict[str, Any]:
    db_path = resolve_path(db_path)
    contract_path = resolve_path(contract_path)
    output_dir = resolve_path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    contract = load_json(contract_path)
    conn = connect(db_path)
    try:
        contract_sources = set(contract.get("source_tables", []))
        table_rows = [
            table_audit(conn, table, contract_sources)
            for table in all_referenced_tables(contract)
        ]
        surface_rows = build_surface_matrix(conn, contract)
    finally:
        conn.close()

    table_summary = summarize_table_audit(table_rows)
    surface_summary = summarize_surfaces(surface_rows)
    audit = {
        "run_id": "mlb_m3_alpha6_fs004_source_feasibility",
        "status": "source_feasibility_audit_created",
        "created_at": utc_now(),
        "tool_version": VERSION,
        "contract_uri": str(contract_path),
        "contract_feature_set_id": contract.get("feature_set_id"),
        "db_uri": str(db_path),
        "non_goals": NON_GOALS,
        "table_summary": table_summary,
        "surface_summary": surface_summary,
        "decision": "fs004_builder_allowed_only_after_source_decisions_are_recorded",
    }
    write_json(output_dir / "source_table_audit.json", {"tables": table_rows})
    write_json(output_dir / "surface_feasibility_matrix.json", {"surfaces": surface_rows})
    write_json(output_dir / "fs004_source_feasibility.json", audit)
    (output_dir / "report.md").write_text(
        report_markdown(audit, surface_rows, table_summary, surface_summary),
        encoding="utf-8",
    )
    artifacts = {
        "status": "source_feasibility_audit_created",
        "artifacts": [
            artifact_entry("fs004_source_feasibility", output_dir / "fs004_source_feasibility.json"),
            artifact_entry("source_table_audit", output_dir / "source_table_audit.json"),
            artifact_entry("surface_feasibility_matrix", output_dir / "surface_feasibility_matrix.json"),
            artifact_entry("report", output_dir / "report.md"),
        ],
    }
    write_json(output_dir / "artifacts.json", artifacts)

    summary = {
        "ok": True,
        "audit_dir": str(output_dir),
        "table_summary": table_summary,
        "surface_summary": surface_summary,
    }
    print(json.dumps(summary, indent=2, sort_keys=True))
    return summary


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Audit typed DB source feasibility for MLB-M3 FS-004."
    )
    parser.add_argument("--db", type=Path, default=DEFAULT_DB_PATH)
    parser.add_argument("--contract", type=Path, default=DEFAULT_CONTRACT_PATH)
    parser.add_argument("--output-dir", type=Path, default=DEFAULT_OUTPUT_DIR)
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    try:
        run_audit(args.db, args.contract, args.output_dir)
    except Exception as exc:
        print(json.dumps({"ok": False, "error": str(exc)}, indent=2), file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
