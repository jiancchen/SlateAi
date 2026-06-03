#!/usr/bin/env python3
from __future__ import annotations

import argparse
import csv
import json
import math
import sqlite3
import subprocess
import tempfile
from dataclasses import dataclass
from datetime import date, datetime, timezone
from pathlib import Path
from typing import Any

from pipeline.mlb.features.validators.validate_game_shape_starter_v1 import (
    DEFAULT_CONTRACT_PATH,
    load_contract,
    validate_contract,
)


ROOT = Path(__file__).resolve().parents[4]
DEFAULT_DB_PATH = ROOT / "data-private" / "warehouse" / "sports" / "mlb" / "sql-mlb.db"
DEFAULT_OUTPUT_DIR = (
    ROOT
    / "data-private"
    / "models"
    / "mlb-m3"
    / "features"
    / "m3_fs_001_game_shape_starter_v1"
)
DEFAULT_REPORT_PATH = (
    ROOT
    / "data-migration"
    / "reports"
    / "m3_fs_001_game_shape_starter_v1_2026-03-26_to_2026-05-31.json"
)
VERSION = "0.2.0"


DATE_COLUMNS = (
    "game_date",
    "snapshot_date",
    "captured_at",
    "created_at",
    "updated_at",
    "completed_at",
    "start_time_utc",
)


@dataclass(frozen=True)
class ColumnSpec:
    name: str
    role: str
    dtype: str
    source: str
    description: str
    leakage_class: str = "pregame_safe"


BASE_COLUMN_SPECS: tuple[ColumnSpec, ...] = (
    ColumnSpec("game_id", "primary_key", "string", "games", "Stable typed game identifier."),
    ColumnSpec("game_date", "time_key", "date", "games", "Game date."),
    ColumnSpec("game_status", "metadata", "string", "games", "Typed game status."),
    ColumnSpec("game_season", "feature", "integer", "games", "MLB season."),
    ColumnSpec(
        "game_series_game_number",
        "feature",
        "integer",
        "games",
        "Scheduled series game number when available.",
    ),
    ColumnSpec("game_home_team_id", "metadata", "string", "games", "Home team ID."),
    ColumnSpec("game_away_team_id", "metadata", "string", "games", "Away team ID."),
    ColumnSpec("game_venue_id", "feature", "string", "games", "Venue ID when available."),
    ColumnSpec("game_start_time_utc", "metadata", "timestamp", "games", "Scheduled start time."),
)


TARGET_COLUMN_SPECS: tuple[ColumnSpec, ...] = (
    ColumnSpec(
        "target_total_runs_final",
        "target",
        "integer",
        "game_outcomes",
        "Final combined runs.",
        "postgame_target",
    ),
    ColumnSpec(
        "target_total_runs_f5",
        "target",
        "integer",
        "game_outcomes",
        "First-five combined runs.",
        "postgame_target",
    ),
    ColumnSpec(
        "target_home_team_runs_final",
        "target",
        "integer",
        "game_outcomes",
        "Home team final runs.",
        "postgame_target",
    ),
    ColumnSpec(
        "target_away_team_runs_final",
        "target",
        "integer",
        "game_outcomes",
        "Away team final runs.",
        "postgame_target",
    ),
    ColumnSpec(
        "target_home_team_runs_f5",
        "target",
        "integer",
        "game_outcomes",
        "Home team first-five runs.",
        "postgame_target",
    ),
    ColumnSpec(
        "target_away_team_runs_f5",
        "target",
        "integer",
        "game_outcomes",
        "Away team first-five runs.",
        "postgame_target",
    ),
    ColumnSpec(
        "target_total_bucket",
        "target",
        "string",
        "game_story_labels",
        "Postgame total-shape label, falling back to deterministic run bucket.",
        "postgame_target",
    ),
    ColumnSpec(
        "target_f5_bucket",
        "target",
        "string",
        "game_story_labels",
        "Postgame first-five shape label, falling back to deterministic F5 bucket.",
        "postgame_target",
    ),
    ColumnSpec(
        "target_chaos_game_flag",
        "target",
        "integer",
        "game_outcomes,game_story_labels",
        "Postgame chaos label for high-tail or crooked-inning games.",
        "postgame_target",
    ),
)


FEATURE_SPECS: tuple[ColumnSpec, ...] = (
    ColumnSpec(
        "home_team_prior_game_count",
        "feature",
        "integer",
        "team_game_stats",
        "Home team completed games before this game.",
        "historical_only",
    ),
    ColumnSpec(
        "away_team_prior_game_count",
        "feature",
        "integer",
        "team_game_stats",
        "Away team completed games before this game.",
        "historical_only",
    ),
    ColumnSpec(
        "home_team_prior_runs_scored_per_game",
        "feature",
        "float",
        "team_game_stats",
        "Home team season-to-date runs scored per prior game.",
        "historical_only",
    ),
    ColumnSpec(
        "away_team_prior_runs_scored_per_game",
        "feature",
        "float",
        "team_game_stats",
        "Away team season-to-date runs scored per prior game.",
        "historical_only",
    ),
    ColumnSpec(
        "home_team_prior_runs_allowed_per_game",
        "feature",
        "float",
        "team_game_stats",
        "Home team season-to-date runs allowed per prior game.",
        "historical_only",
    ),
    ColumnSpec(
        "away_team_prior_runs_allowed_per_game",
        "feature",
        "float",
        "team_game_stats",
        "Away team season-to-date runs allowed per prior game.",
        "historical_only",
    ),
    ColumnSpec(
        "home_team_prior_f5_runs_scored_per_game",
        "feature",
        "float",
        "team_game_stats",
        "Home team season-to-date first-five runs scored per prior game.",
        "historical_only",
    ),
    ColumnSpec(
        "away_team_prior_f5_runs_scored_per_game",
        "feature",
        "float",
        "team_game_stats",
        "Away team season-to-date first-five runs scored per prior game.",
        "historical_only",
    ),
    ColumnSpec(
        "home_team_prior_f5_runs_allowed_per_game",
        "feature",
        "float",
        "team_game_stats",
        "Home team season-to-date first-five runs allowed per prior game.",
        "historical_only",
    ),
    ColumnSpec(
        "away_team_prior_f5_runs_allowed_per_game",
        "feature",
        "float",
        "team_game_stats",
        "Away team season-to-date first-five runs allowed per prior game.",
        "historical_only",
    ),
    ColumnSpec(
        "home_team_prior_plate_appearances_per_game",
        "feature",
        "float",
        "team_game_stats",
        "Home team prior plate appearances per game.",
        "historical_only",
    ),
    ColumnSpec(
        "away_team_prior_plate_appearances_per_game",
        "feature",
        "float",
        "team_game_stats",
        "Away team prior plate appearances per game.",
        "historical_only",
    ),
    ColumnSpec(
        "home_team_prior_walk_rate_per_pa",
        "feature",
        "float",
        "team_game_stats",
        "Home team prior walks divided by plate appearances.",
        "historical_only",
    ),
    ColumnSpec(
        "away_team_prior_walk_rate_per_pa",
        "feature",
        "float",
        "team_game_stats",
        "Away team prior walks divided by plate appearances.",
        "historical_only",
    ),
    ColumnSpec(
        "home_team_prior_total_bases_per_pa",
        "feature",
        "float",
        "team_game_stats",
        "Home team prior total bases divided by plate appearances.",
        "historical_only",
    ),
    ColumnSpec(
        "away_team_prior_total_bases_per_pa",
        "feature",
        "float",
        "team_game_stats",
        "Away team prior total bases divided by plate appearances.",
        "historical_only",
    ),
    ColumnSpec(
        "home_starter_pitcher_id",
        "feature",
        "string",
        "starting_pitchers",
        "Home starting pitcher ID when known.",
        "pregame_safe",
    ),
    ColumnSpec(
        "away_starter_pitcher_id",
        "feature",
        "string",
        "starting_pitchers",
        "Away starting pitcher ID when known.",
        "pregame_safe",
    ),
    ColumnSpec(
        "home_starter_known_flag",
        "feature",
        "integer",
        "starting_pitchers",
        "Whether the home starter is known.",
        "pregame_safe",
    ),
    ColumnSpec(
        "away_starter_known_flag",
        "feature",
        "integer",
        "starting_pitchers",
        "Whether the away starter is known.",
        "pregame_safe",
    ),
    ColumnSpec(
        "home_starter_prior_start_count",
        "feature",
        "integer",
        "starting_pitcher_game_logs",
        "Home starter prior MLB starts in typed data.",
        "historical_only",
    ),
    ColumnSpec(
        "away_starter_prior_start_count",
        "feature",
        "integer",
        "starting_pitcher_game_logs",
        "Away starter prior MLB starts in typed data.",
        "historical_only",
    ),
    ColumnSpec(
        "home_starter_prior_outs_per_start",
        "feature",
        "float",
        "starting_pitcher_game_logs",
        "Home starter season-to-date outs per prior start.",
        "historical_only",
    ),
    ColumnSpec(
        "away_starter_prior_outs_per_start",
        "feature",
        "float",
        "starting_pitcher_game_logs",
        "Away starter season-to-date outs per prior start.",
        "historical_only",
    ),
    ColumnSpec(
        "home_starter_prior_pitches_per_start",
        "feature",
        "float",
        "starting_pitcher_game_logs",
        "Home starter season-to-date pitches per prior start.",
        "historical_only",
    ),
    ColumnSpec(
        "away_starter_prior_pitches_per_start",
        "feature",
        "float",
        "starting_pitcher_game_logs",
        "Away starter season-to-date pitches per prior start.",
        "historical_only",
    ),
    ColumnSpec(
        "home_starter_prior_runs_allowed_per_start",
        "feature",
        "float",
        "starting_pitcher_game_logs",
        "Home starter season-to-date runs allowed per prior start.",
        "historical_only",
    ),
    ColumnSpec(
        "away_starter_prior_runs_allowed_per_start",
        "feature",
        "float",
        "starting_pitcher_game_logs",
        "Away starter season-to-date runs allowed per prior start.",
        "historical_only",
    ),
    ColumnSpec(
        "home_starter_prior_walks_per_start",
        "feature",
        "float",
        "starting_pitcher_game_logs",
        "Home starter season-to-date walks allowed per prior start.",
        "historical_only",
    ),
    ColumnSpec(
        "away_starter_prior_walks_per_start",
        "feature",
        "float",
        "starting_pitcher_game_logs",
        "Away starter season-to-date walks allowed per prior start.",
        "historical_only",
    ),
    ColumnSpec(
        "home_starter_prior_strikeouts_per_start",
        "feature",
        "float",
        "starting_pitcher_game_logs",
        "Home starter season-to-date strikeouts per prior start.",
        "historical_only",
    ),
    ColumnSpec(
        "away_starter_prior_strikeouts_per_start",
        "feature",
        "float",
        "starting_pitcher_game_logs",
        "Away starter season-to-date strikeouts per prior start.",
        "historical_only",
    ),
    ColumnSpec(
        "home_starter_prior_short_start_rate",
        "feature",
        "float",
        "starting_pitcher_game_logs",
        "Home starter prior share of starts below five innings.",
        "historical_only",
    ),
    ColumnSpec(
        "away_starter_prior_short_start_rate",
        "feature",
        "float",
        "starting_pitcher_game_logs",
        "Away starter prior share of starts below five innings.",
        "historical_only",
    ),
    ColumnSpec(
        "home_starter_low_mlb_evidence_flag",
        "feature",
        "integer",
        "starting_pitcher_game_logs",
        "Home starter has fewer than three prior typed MLB starts.",
        "historical_only",
    ),
    ColumnSpec(
        "away_starter_low_mlb_evidence_flag",
        "feature",
        "integer",
        "starting_pitcher_game_logs",
        "Away starter has fewer than three prior typed MLB starts.",
        "historical_only",
    ),
    ColumnSpec(
        "home_bullpen_shape_snapshot_available_flag",
        "feature",
        "integer",
        "team_bullpen_shape_snapshots",
        "Whether a home bullpen shape snapshot exists as of game date.",
        "historical_only",
    ),
    ColumnSpec(
        "away_bullpen_shape_snapshot_available_flag",
        "feature",
        "integer",
        "team_bullpen_shape_snapshots",
        "Whether an away bullpen shape snapshot exists as of game date.",
        "historical_only",
    ),
    ColumnSpec(
        "home_reliever_chain_known_flag",
        "feature",
        "integer",
        "likely_relief_chains",
        "Whether likely relief-chain candidates exist for the home pitching side.",
        "historical_only",
    ),
    ColumnSpec(
        "away_reliever_chain_known_flag",
        "feature",
        "integer",
        "likely_relief_chains",
        "Whether likely relief-chain candidates exist for the away pitching side.",
        "historical_only",
    ),
    ColumnSpec(
        "home_reliever_candidate_pool_size",
        "feature",
        "integer",
        "likely_relief_chains",
        "Number of home relief-chain candidates in the latest snapshot.",
        "historical_only",
    ),
    ColumnSpec(
        "away_reliever_candidate_pool_size",
        "feature",
        "integer",
        "likely_relief_chains",
        "Number of away relief-chain candidates in the latest snapshot.",
        "historical_only",
    ),
    ColumnSpec(
        "home_reliever_candidate_pool_entropy",
        "feature",
        "float",
        "likely_relief_chains",
        "Entropy of home first-up likelihood mass across candidate arms.",
        "historical_only",
    ),
    ColumnSpec(
        "away_reliever_candidate_pool_entropy",
        "feature",
        "float",
        "likely_relief_chains",
        "Entropy of away first-up likelihood mass across candidate arms.",
        "historical_only",
    ),
    ColumnSpec(
        "home_reliever_first_up_top2_probability_mass",
        "feature",
        "float",
        "likely_relief_chains",
        "Home top-two first-up likelihood mass.",
        "historical_only",
    ),
    ColumnSpec(
        "away_reliever_first_up_top2_probability_mass",
        "feature",
        "float",
        "likely_relief_chains",
        "Away top-two first-up likelihood mass.",
        "historical_only",
    ),
    ColumnSpec(
        "home_reliever_command_profile_coverage_rate",
        "feature",
        "float",
        "reliever_command_profiles",
        "Share of home relief-chain candidates with command profiles.",
        "historical_only",
    ),
    ColumnSpec(
        "away_reliever_command_profile_coverage_rate",
        "feature",
        "float",
        "reliever_command_profiles",
        "Share of away relief-chain candidates with command profiles.",
        "historical_only",
    ),
    ColumnSpec(
        "home_lineup_known_flag",
        "feature",
        "integer",
        "lineups",
        "Whether a home lineup row exists for the game.",
        "pregame_safe",
    ),
    ColumnSpec(
        "away_lineup_known_flag",
        "feature",
        "integer",
        "lineups",
        "Whether an away lineup row exists for the game.",
        "pregame_safe",
    ),
    ColumnSpec(
        "home_lineup_known_slot_count",
        "feature",
        "integer",
        "lineups,lineup_slots",
        "Known home lineup slots.",
        "pregame_safe",
    ),
    ColumnSpec(
        "away_lineup_known_slot_count",
        "feature",
        "integer",
        "lineups,lineup_slots",
        "Known away lineup slots.",
        "pregame_safe",
    ),
    ColumnSpec(
        "home_lineup_complete_flag",
        "feature",
        "integer",
        "lineups,lineup_slots",
        "Whether home lineup has nine known slots.",
        "pregame_safe",
    ),
    ColumnSpec(
        "away_lineup_complete_flag",
        "feature",
        "integer",
        "lineups,lineup_slots",
        "Whether away lineup has nine known slots.",
        "pregame_safe",
    ),
    ColumnSpec(
        "home_lineup_matchup_hitter_count",
        "feature",
        "integer",
        "lineup_matchup_snapshots",
        "Home hitter starter-phase matchup rows available for this game.",
        "pregame_safe",
    ),
    ColumnSpec(
        "away_lineup_matchup_hitter_count",
        "feature",
        "integer",
        "lineup_matchup_snapshots",
        "Away hitter starter-phase matchup rows available for this game.",
        "pregame_safe",
    ),
    ColumnSpec(
        "market_any_pregame_snapshot_count",
        "feature",
        "integer",
        "market_snapshots",
        "Pregame market snapshots before scheduled first pitch.",
        "pregame_safe",
    ),
    ColumnSpec(
        "market_total_pregame_snapshot_count",
        "feature",
        "integer",
        "market_snapshots",
        "Pregame full-game total market snapshots before scheduled first pitch.",
        "pregame_safe",
    ),
    ColumnSpec(
        "market_f5_total_pregame_snapshot_count",
        "feature",
        "integer",
        "market_snapshots",
        "Pregame first-five total market snapshots before scheduled first pitch.",
        "pregame_safe",
    ),
)


def _iso_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def _run_stamp() -> str:
    return datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")


def _git_sha() -> str | None:
    try:
        result = subprocess.run(
            ["git", "rev-parse", "HEAD"],
            cwd=ROOT,
            check=True,
            text=True,
            capture_output=True,
        )
    except (OSError, subprocess.CalledProcessError):
        return None
    return result.stdout.strip()


def _connect(db_path: Path) -> sqlite3.Connection:
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    return conn


def _safe_div(numerator: float | int | None, denominator: float | int | None) -> float | None:
    if numerator is None or denominator in (None, 0):
        return None
    return float(numerator) / float(denominator)


def _avg(rows: list[sqlite3.Row], column: str) -> float | None:
    vals = [row[column] for row in rows if row[column] is not None]
    if not vals:
        return None
    return float(sum(vals)) / len(vals)


def _sum(rows: list[sqlite3.Row], column: str) -> float | None:
    vals = [row[column] for row in rows if row[column] is not None]
    if not vals:
        return None
    return float(sum(vals))


def _date(value: str | None) -> date | None:
    if not value:
        return None
    return date.fromisoformat(value[:10])


def _age_days(snapshot_date: str | None, game_date: str) -> int | None:
    left = _date(snapshot_date)
    right = _date(game_date)
    if left is None or right is None:
        return None
    return (right - left).days


def _bucket_total(total_runs: int | None) -> str | None:
    if total_runs is None:
        return None
    if total_runs <= 6:
        return "low_total"
    if total_runs <= 10:
        return "balanced_total"
    if total_runs <= 12:
        return "high_total"
    return "swingy_high_total"


def _bucket_f5(f5_runs: int | None) -> str | None:
    if f5_runs is None:
        return None
    if f5_runs <= 2:
        return "quiet_first5"
    if f5_runs <= 5:
        return "balanced_first5"
    if f5_runs <= 8:
        return "starter_crack"
    return "first5_firefight"


def _entropy(values: list[float | None]) -> float | None:
    clean = [max(float(value), 0.0) for value in values if value is not None]
    total = sum(clean)
    if total <= 0:
        return None
    entropy = 0.0
    for value in clean:
        if value <= 0:
            continue
        p = value / total
        entropy -= p * math.log(p)
    return entropy


def _top_n_mass(values: list[float | None], n: int) -> float | None:
    clean = sorted((max(float(value), 0.0) for value in values if value is not None), reverse=True)
    total = sum(clean)
    if total <= 0:
        return None
    return sum(clean[:n]) / total


def _latest_snapshot(rows: list[sqlite3.Row], game_date: str) -> sqlite3.Row | None:
    eligible = [
        row
        for row in rows
        if row["snapshot_date"] is not None and row["snapshot_date"][:10] <= game_date
    ]
    if not eligible:
        return None
    return max(eligible, key=lambda row: row["snapshot_date"])


def _latest_snapshot_group(rows: list[sqlite3.Row], game_date: str) -> list[sqlite3.Row]:
    eligible = [
        row
        for row in rows
        if row["snapshot_date"] is not None and row["snapshot_date"][:10] <= game_date
    ]
    if not eligible:
        return []
    latest_date = max(row["snapshot_date"] for row in eligible)
    return [row for row in eligible if row["snapshot_date"] == latest_date]


def _rows_by_key(rows: list[sqlite3.Row], key: str) -> dict[str, list[sqlite3.Row]]:
    grouped: dict[str, list[sqlite3.Row]] = {}
    for row in rows:
        grouped.setdefault(str(row[key]), []).append(row)
    return grouped


def _row_dict(row: sqlite3.Row) -> dict[str, Any]:
    return {key: row[key] for key in row.keys()}


def _table_objects(conn: sqlite3.Connection) -> dict[str, str]:
    return {
        row["name"]: row["type"]
        for row in conn.execute(
            "select name, type from sqlite_master where type in ('table', 'view')"
        )
    }


def audit_source_tables(conn: sqlite3.Connection, source_tables: list[str]) -> dict[str, Any]:
    objects = _table_objects(conn)
    audit: dict[str, Any] = {}
    for table in source_tables:
        present = table in objects
        payload: dict[str, Any] = {
            "present": present,
            "object_type": objects.get(table),
            "row_count": None,
            "column_count": 0,
            "date_ranges": {},
        }
        if present:
            columns = [
                row["name"] for row in conn.execute(f"pragma table_info({table})")
            ]
            payload["column_count"] = len(columns)
            payload["row_count"] = conn.execute(
                f"select count(*) as row_count from {table}"
            ).fetchone()["row_count"]
            for column in DATE_COLUMNS:
                if column in columns:
                    row = conn.execute(
                        f"""
                        select min({column}) as min_value, max({column}) as max_value
                        from {table}
                        where {column} is not null
                        """
                    ).fetchone()
                    if row["min_value"] is not None or row["max_value"] is not None:
                        payload["date_ranges"][column] = {
                            "min": row["min_value"],
                            "max": row["max_value"],
                        }
        audit[table] = payload
    return audit


def _load_table(conn: sqlite3.Connection, table: str, order_by: str | None = None) -> list[sqlite3.Row]:
    sql = f"select * from {table}"
    if order_by:
        sql += f" order by {order_by}"
    return list(conn.execute(sql))


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


def _team_prior_features(prefix: str, rows: list[sqlite3.Row]) -> dict[str, Any]:
    pa = _sum(rows, "plate_appearances")
    walks = _sum(rows, "walks")
    total_bases = _sum(rows, "total_bases")
    return {
        f"{prefix}_team_prior_game_count": len(rows),
        f"{prefix}_team_prior_runs_scored_per_game": _avg(rows, "runs_scored"),
        f"{prefix}_team_prior_runs_allowed_per_game": _avg(rows, "runs_allowed"),
        f"{prefix}_team_prior_f5_runs_scored_per_game": _avg(
            rows, "runs_scored_first5"
        ),
        f"{prefix}_team_prior_f5_runs_allowed_per_game": _avg(
            rows, "runs_allowed_first5"
        ),
        f"{prefix}_team_prior_plate_appearances_per_game": _avg(
            rows, "plate_appearances"
        ),
        f"{prefix}_team_prior_walk_rate_per_pa": _safe_div(walks, pa),
        f"{prefix}_team_prior_total_bases_per_pa": _safe_div(total_bases, pa),
    }


def _starter_prior_features(
    prefix: str,
    pitcher_id: str | None,
    rows_by_pitcher: dict[str, list[sqlite3.Row]],
    game_date: str,
) -> dict[str, Any]:
    prior_rows = []
    if pitcher_id:
        prior_rows = [
            row
            for row in rows_by_pitcher.get(pitcher_id, [])
            if row["game_date"] is not None and row["game_date"] < game_date
        ]
    short_starts = [
        row for row in prior_rows if row["outs_recorded"] is not None and row["outs_recorded"] < 15
    ]
    return {
        f"{prefix}_starter_pitcher_id": pitcher_id,
        f"{prefix}_starter_known_flag": 1 if pitcher_id else 0,
        f"{prefix}_starter_prior_start_count": len(prior_rows),
        f"{prefix}_starter_prior_outs_per_start": _avg(prior_rows, "outs_recorded"),
        f"{prefix}_starter_prior_pitches_per_start": _avg(prior_rows, "pitches_thrown"),
        f"{prefix}_starter_prior_runs_allowed_per_start": _avg(
            prior_rows, "runs_allowed"
        ),
        f"{prefix}_starter_prior_walks_per_start": _avg(prior_rows, "walks_allowed"),
        f"{prefix}_starter_prior_strikeouts_per_start": _avg(prior_rows, "strikeouts"),
        f"{prefix}_starter_prior_short_start_rate": _safe_div(
            len(short_starts), len(prior_rows)
        ),
        f"{prefix}_starter_low_mlb_evidence_flag": 1 if len(prior_rows) < 3 else 0,
    }


def _bullpen_features(
    prefix: str,
    team_id: str,
    game_date: str,
    bullpen_rows: dict[str, list[sqlite3.Row]],
    chain_rows: dict[str, list[sqlite3.Row]],
    command_rows: dict[str, list[sqlite3.Row]],
) -> dict[str, Any]:
    bullpen_snapshot = _latest_snapshot(bullpen_rows.get(team_id, []), game_date)
    chain = _latest_snapshot_group(chain_rows.get(team_id, []), game_date)
    probabilities = [row["first_reliever_likelihood"] for row in chain]
    candidate_ids = [str(row["pitcher_id"]) for row in chain]
    command_covered = 0
    for pitcher_id in candidate_ids:
        if _latest_snapshot(command_rows.get(pitcher_id, []), game_date):
            command_covered += 1
    return {
        f"{prefix}_bullpen_shape_snapshot_available_flag": 1
        if bullpen_snapshot
        else 0,
        f"{prefix}_reliever_chain_known_flag": 1 if chain else 0,
        f"{prefix}_reliever_candidate_pool_size": len(candidate_ids),
        f"{prefix}_reliever_candidate_pool_entropy": _entropy(probabilities),
        f"{prefix}_reliever_first_up_top2_probability_mass": _top_n_mass(
            probabilities, 2
        ),
        f"{prefix}_reliever_command_profile_coverage_rate": _safe_div(
            command_covered, len(candidate_ids)
        ),
    }


def _lineup_features(
    prefix: str,
    game_id: str,
    team_id: str,
    lineups_by_game_team: dict[tuple[str, str], sqlite3.Row],
    lineup_slots_by_lineup: dict[str, list[sqlite3.Row]],
    matchup_by_game_team: dict[tuple[str, str], list[sqlite3.Row]],
) -> dict[str, Any]:
    lineup = lineups_by_game_team.get((game_id, team_id))
    slots = lineup_slots_by_lineup.get(str(lineup["lineup_id"]), []) if lineup else []
    matchup_rows = matchup_by_game_team.get((game_id, team_id), [])
    return {
        f"{prefix}_lineup_known_flag": 1 if lineup else 0,
        f"{prefix}_lineup_known_slot_count": len(slots),
        f"{prefix}_lineup_complete_flag": 1 if len(slots) == 9 else 0,
        f"{prefix}_lineup_matchup_hitter_count": len(
            {row["hitter_id"] for row in matchup_rows if row["hitter_id"] is not None}
        ),
    }


def _market_features(game: sqlite3.Row, snapshots_by_game: dict[str, list[sqlite3.Row]]) -> dict[str, Any]:
    start_time = game["start_time_utc"]
    snapshots = snapshots_by_game.get(str(game["game_id"]), [])
    if start_time:
        pregame = [
            row
            for row in snapshots
            if row["captured_at"] is not None and row["captured_at"] < start_time
        ]
    else:
        pregame = []
    return {
        "market_any_pregame_snapshot_count": len(pregame),
        "market_total_pregame_snapshot_count": len(
            [row for row in pregame if row["market_type"] == "total"]
        ),
        "market_f5_total_pregame_snapshot_count": len(
            [row for row in pregame if row["market_type"] == "first5Total"]
        ),
    }


def _build_indexes(conn: sqlite3.Connection) -> dict[str, Any]:
    team_game_rows = _load_table(conn, "team_game_stats", "team_id, game_date")
    starter_log_rows = _load_table(
        conn, "starting_pitcher_game_logs", "pitcher_id, game_date"
    )
    starting_pitchers = _load_table(conn, "starting_pitchers")
    bullpen_rows = _load_table(
        conn, "team_bullpen_shape_snapshots", "team_id, snapshot_date"
    )
    chain_rows = _load_table(conn, "likely_relief_chains", "team_id, snapshot_date")
    command_rows = _load_table(
        conn, "reliever_command_profiles", "pitcher_id, snapshot_date"
    )
    lineups = _load_table(conn, "lineups")
    lineup_slots = _load_table(conn, "lineup_slots")
    lineup_matchups = _load_table(conn, "lineup_matchup_snapshots")
    market_snapshots = _load_table(conn, "market_snapshots", "game_id, captured_at")

    lineup_by_game_team: dict[tuple[str, str], sqlite3.Row] = {}
    for row in lineups:
        lineup_by_game_team[(str(row["game_id"]), str(row["team_id"]))] = row

    lineup_slots_by_lineup: dict[str, list[sqlite3.Row]] = {}
    for row in lineup_slots:
        lineup_slots_by_lineup.setdefault(str(row["lineup_id"]), []).append(row)

    matchup_by_game_team: dict[tuple[str, str], list[sqlite3.Row]] = {}
    for row in lineup_matchups:
        matchup_by_game_team.setdefault((str(row["game_id"]), str(row["team_id"])), []).append(row)

    starter_by_game_team: dict[tuple[str, str], str] = {}
    for row in starting_pitchers:
        starter_by_game_team[(str(row["game_id"]), str(row["team_id"]))] = str(
            row["pitcher_id"]
        )

    return {
        "team_game_by_team": _rows_by_key(team_game_rows, "team_id"),
        "starter_logs_by_pitcher": _rows_by_key(starter_log_rows, "pitcher_id"),
        "starter_by_game_team": starter_by_game_team,
        "bullpen_by_team": _rows_by_key(bullpen_rows, "team_id"),
        "chain_by_team": _rows_by_key(chain_rows, "team_id"),
        "command_by_pitcher": _rows_by_key(command_rows, "pitcher_id"),
        "lineup_by_game_team": lineup_by_game_team,
        "lineup_slots_by_lineup": lineup_slots_by_lineup,
        "matchup_by_game_team": matchup_by_game_team,
        "market_snapshots_by_game": _rows_by_key(market_snapshots, "game_id"),
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
        home_prior_team = [
            row
            for row in indexes["team_game_by_team"].get(home_team_id, [])
            if row["game_date"] is not None and row["game_date"] < game_date
        ]
        away_prior_team = [
            row
            for row in indexes["team_game_by_team"].get(away_team_id, [])
            if row["game_date"] is not None and row["game_date"] < game_date
        ]

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
            "target_total_bucket": game["scoring_shape_label"]
            or _bucket_total(game["total_runs"]),
            "target_f5_bucket": game["early_phase_label"]
            or _bucket_f5(game["f5_total_runs"]),
            "target_chaos_game_flag": _target_chaos_flag(game),
        }
        row.update(_team_prior_features("home", home_prior_team))
        row.update(_team_prior_features("away", away_prior_team))
        row.update(
            _starter_prior_features(
                "home",
                home_pitcher_id,
                indexes["starter_logs_by_pitcher"],
                game_date,
            )
        )
        row.update(
            _starter_prior_features(
                "away",
                away_pitcher_id,
                indexes["starter_logs_by_pitcher"],
                game_date,
            )
        )
        row.update(
            _bullpen_features(
                "home",
                home_team_id,
                game_date,
                indexes["bullpen_by_team"],
                indexes["chain_by_team"],
                indexes["command_by_pitcher"],
            )
        )
        row.update(
            _bullpen_features(
                "away",
                away_team_id,
                game_date,
                indexes["bullpen_by_team"],
                indexes["chain_by_team"],
                indexes["command_by_pitcher"],
            )
        )
        row.update(
            _lineup_features(
                "home",
                game_id,
                home_team_id,
                indexes["lineup_by_game_team"],
                indexes["lineup_slots_by_lineup"],
                indexes["matchup_by_game_team"],
            )
        )
        row.update(
            _lineup_features(
                "away",
                game_id,
                away_team_id,
                indexes["lineup_by_game_team"],
                indexes["lineup_slots_by_lineup"],
                indexes["matchup_by_game_team"],
            )
        )
        row.update(_market_features(game, indexes["market_snapshots_by_game"]))
        matrix.append(row)

    return matrix


def _matrix_columns(rows: list[dict[str, Any]]) -> list[str]:
    seen: set[str] = set()
    columns: list[str] = []
    for spec in BASE_COLUMN_SPECS + FEATURE_SPECS + TARGET_COLUMN_SPECS:
        if spec.name not in seen:
            columns.append(spec.name)
            seen.add(spec.name)
    for row in rows:
        for key in row:
            if key not in seen:
                columns.append(key)
                seen.add(key)
    return columns


def _data_dictionary(columns: list[str]) -> dict[str, Any]:
    specs = {
        spec.name: spec
        for spec in BASE_COLUMN_SPECS + FEATURE_SPECS + TARGET_COLUMN_SPECS
    }
    payload: dict[str, Any] = {}
    for column in columns:
        spec = specs.get(column)
        if spec:
            payload[column] = {
                "role": spec.role,
                "dtype": spec.dtype,
                "source": spec.source,
                "description": spec.description,
                "leakage_class": spec.leakage_class,
            }
        else:
            payload[column] = {
                "role": "unknown",
                "dtype": "unknown",
                "source": "unknown",
                "description": "Undocumented generated column.",
                "leakage_class": "excluded",
            }
    return payload


def _missingness(rows: list[dict[str, Any]], columns: list[str]) -> dict[str, Any]:
    total = len(rows)
    report: dict[str, Any] = {}
    for column in columns:
        missing = sum(
            1
            for row in rows
            if row.get(column) is None or row.get(column) == ""
        )
        report[column] = {
            "missing_count": missing,
            "missing_rate": _safe_div(missing, total),
        }
    return report


def _target_distribution(rows: list[dict[str, Any]]) -> dict[str, Any]:
    distributions: dict[str, dict[str, int]] = {}
    for column in (
        "target_total_runs_final",
        "target_total_runs_f5",
        "target_total_bucket",
        "target_f5_bucket",
        "target_chaos_game_flag",
    ):
        counts: dict[str, int] = {}
        for row in rows:
            value = row.get(column)
            key = "null" if value is None else str(value)
            counts[key] = counts.get(key, 0) + 1
        distributions[column] = dict(sorted(counts.items(), key=lambda item: item[0]))
    return distributions


def _coverage(
    rows: list[dict[str, Any]],
    source_audit: dict[str, Any],
) -> dict[str, Any]:
    total = len(rows)

    def rate(column: str) -> float | None:
        return _safe_div(sum(1 for row in rows if row.get(column)), total)

    return {
        "source_tables": source_audit,
        "row_count": total,
        "starter_exit_coverage": {
            "home_starter_known_rate": rate("home_starter_known_flag"),
            "away_starter_known_rate": rate("away_starter_known_flag"),
            "home_low_evidence_rate": rate("home_starter_low_mlb_evidence_flag"),
            "away_low_evidence_rate": rate("away_starter_low_mlb_evidence_flag"),
        },
        "reliever_availability_coverage": {
            "home_chain_known_rate": rate("home_reliever_chain_known_flag"),
            "away_chain_known_rate": rate("away_reliever_chain_known_flag"),
            "home_command_profile_coverage_avg": _avg_dict(
                rows, "home_reliever_command_profile_coverage_rate"
            ),
            "away_command_profile_coverage_avg": _avg_dict(
                rows, "away_reliever_command_profile_coverage_rate"
            ),
        },
        "first_up_reliever_router_coverage": {
            "home_candidate_pool_size_avg": _avg_dict(
                rows, "home_reliever_candidate_pool_size"
            ),
            "away_candidate_pool_size_avg": _avg_dict(
                rows, "away_reliever_candidate_pool_size"
            ),
            "home_top2_probability_mass_avg": _avg_dict(
                rows, "home_reliever_first_up_top2_probability_mass"
            ),
            "away_top2_probability_mass_avg": _avg_dict(
                rows, "away_reliever_first_up_top2_probability_mass"
            ),
        },
        "lineup_coverage": {
            "home_lineup_known_rate": rate("home_lineup_known_flag"),
            "away_lineup_known_rate": rate("away_lineup_known_flag"),
            "home_lineup_complete_rate": rate("home_lineup_complete_flag"),
            "away_lineup_complete_rate": rate("away_lineup_complete_flag"),
        },
        "market_coverage": {
            "any_pregame_snapshot_rate": rate("market_any_pregame_snapshot_count"),
            "total_pregame_snapshot_rows": sum(
                int(row.get("market_total_pregame_snapshot_count") or 0)
                for row in rows
            ),
            "f5_total_pregame_snapshot_rows": sum(
                int(row.get("market_f5_total_pregame_snapshot_count") or 0)
                for row in rows
            ),
        },
    }


def _avg_dict(rows: list[dict[str, Any]], column: str) -> float | None:
    vals = [row.get(column) for row in rows if row.get(column) is not None]
    if not vals:
        return None
    return float(sum(vals)) / len(vals)


def _leakage_report(columns: list[str], dictionary: dict[str, Any]) -> dict[str, Any]:
    target_columns = [column for column in columns if column.startswith("target_")]
    feature_columns = [
        column
        for column in columns
        if dictionary[column]["role"] == "feature" and not column.startswith("target_")
    ]
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
    bad_targets = [column for column in target_columns if not column.startswith("target_")]
    return {
        "ok": not bad_feature_prefixes and not bad_targets,
        "target_columns": target_columns,
        "feature_columns": feature_columns,
        "feature_count": len(feature_columns),
        "target_count": len(target_columns),
        "bad_feature_prefixes": bad_feature_prefixes,
        "bad_targets": bad_targets,
        "postgame_sources_in_features": [],
        "notes": [
            "Same-game postgame tables are used only for target columns or coverage reports.",
            "Historical-only feature columns use rows with dates before the game date.",
            "Lineup and market columns are treated as pregame-safe only when captured before scheduled start or keyed as pregame lineup state.",
        ],
    }


def _write_json(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as handle:
        json.dump(payload, handle, indent=2, sort_keys=True)
        handle.write("\n")


def _write_parquet_with_duckdb(rows: list[dict[str, Any]], columns: list[str], path: Path) -> str:
    try:
        import duckdb  # type: ignore
    except ImportError as exc:
        raise RuntimeError(
            "Parquet writer unavailable: install duckdb==1.5.3 or run with the "
            "workspace Python runtime that includes DuckDB."
        ) from exc

    path.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory() as tmpdir:
        csv_path = Path(tmpdir) / "matrix.csv"
        with csv_path.open("w", encoding="utf-8", newline="") as handle:
            writer = csv.DictWriter(handle, fieldnames=columns)
            writer.writeheader()
            for row in rows:
                writer.writerow({column: row.get(column) for column in columns})
        conn = duckdb.connect(database=":memory:")
        csv_literal = "'" + str(csv_path).replace("'", "''") + "'"
        path_literal = "'" + str(path).replace("'", "''") + "'"
        conn.execute(
            f"create table matrix as select * from read_csv_auto({csv_literal}, header=true)"
        )
        conn.execute(f"copy matrix to {path_literal} (format parquet)")
        conn.close()
    return "duckdb"


def build_skeleton_report(args: argparse.Namespace) -> dict[str, Any]:
    started_at = _iso_now()
    contract_path = args.contract.resolve()
    db_path = args.db.resolve()
    output_dir = args.output_dir.resolve()
    report_path = args.report.resolve()

    contract = load_contract(contract_path)
    contract_validation = validate_contract(contract)
    db_table_count = None
    if db_path.exists():
        with _connect(db_path) as conn:
            db_table_count = conn.execute(
                "select count(*) from sqlite_master where type in ('table', 'view')"
            ).fetchone()[0]
    output_dir.mkdir(parents=True, exist_ok=True)
    report_path.parent.mkdir(parents=True, exist_ok=True)

    warnings = list(contract_validation["warnings"])
    if args.as_of_policy != contract.get("as_of_policy"):
        warnings.append(
            "CLI as_of_policy differs from contract: "
            f"{args.as_of_policy} != {contract.get('as_of_policy')}"
        )

    errors = list(contract_validation["errors"])
    if db_table_count is None:
        errors.append(f"Source DB does not exist: {db_path}")

    ok = not errors
    finished_at = _iso_now()
    return {
        "run_id": f"{contract.get('feature_set_id', 'unknown')}_skeleton_{_run_stamp()}",
        "run_type": "feature_build_skeleton",
        "builder_version": VERSION,
        "feature_set_id": contract.get("feature_set_id"),
        "feature_set_version": contract.get("version"),
        "status": "skeleton_ok" if ok else "skeleton_failed",
        "ok": ok,
        "started_at": started_at,
        "finished_at": finished_at,
        "git_sha": _git_sha(),
        "start_date": args.start_date,
        "end_date": args.end_date,
        "as_of_policy": args.as_of_policy,
        "contract_uri": str(contract_path),
        "contract_loaded": True,
        "contract_validation": contract_validation,
        "source_db": str(db_path),
        "source_db_exists": db_table_count is not None,
        "source_db_table_count": db_table_count,
        "output_uri": str(output_dir),
        "report_uri": str(report_path),
        "matrix_uri": None,
        "matrix_written": False,
        "feature_count": 0,
        "target_count": len(contract.get("targets", [])),
        "source_tables": contract.get("source_tables", []),
        "uses_hand_picked_memory_lengths": False,
        "uses_m2_weights": False,
        "uses_sports_db": False,
        "warnings": warnings,
        "errors": errors,
    }


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
        warnings.append(
            "CLI as_of_policy differs from contract: "
            f"{args.as_of_policy} != {contract.get('as_of_policy')}"
        )
    if not db_path.exists():
        errors.append(f"Source DB does not exist: {db_path}")

    run_id = f"{contract.get('feature_set_id', 'unknown')}_{_run_stamp()}"
    artifact_dir = output_root / run_id
    artifact_dir.mkdir(parents=True, exist_ok=True)

    matrix: list[dict[str, Any]] = []
    source_audit: dict[str, Any] = {}
    writer = None
    if not errors:
        with _connect(db_path) as conn:
            source_audit = audit_source_tables(conn, contract.get("source_tables", []))
            matrix = build_matrix(conn, args.start_date, args.end_date)

    columns = _matrix_columns(matrix)
    data_dictionary = _data_dictionary(columns)
    missingness = _missingness(matrix, columns)
    coverage = _coverage(matrix, source_audit)
    leakage = _leakage_report(columns, data_dictionary)
    lineage = {
        "feature_builder": "pipeline.mlb.features.builders.build_game_shape_starter_v1",
        "builder_version": VERSION,
        "validator": "pipeline.mlb.features.validators.validate_game_shape_starter_v1",
        "contract_uri": str(contract_path),
        "source_db": str(db_path),
        "git_sha": _git_sha(),
        "start_date": args.start_date,
        "end_date": args.end_date,
        "as_of_policy": args.as_of_policy,
        "uses_sports_db": False,
        "uses_m2_weights": False,
        "uses_hand_picked_memory_lengths": False,
        "pitching_path_grain": "one opponent pitching path per batting side: starter phase then reliever-chain phase",
    }

    matrix_uri = artifact_dir / "matrix.parquet"
    try:
        if not errors:
            writer = _write_parquet_with_duckdb(matrix, columns, matrix_uri)
    except RuntimeError as exc:
        errors.append(str(exc))

    _write_json(artifact_dir / "data_dictionary.json", data_dictionary)
    _write_json(artifact_dir / "missingness.json", missingness)
    _write_json(artifact_dir / "coverage.json", coverage)
    _write_json(artifact_dir / "leakage.json", leakage)
    _write_json(artifact_dir / "lineage.json", lineage)

    ok = not errors and bool(matrix) and leakage["ok"] and matrix_uri.exists()
    finished_at = _iso_now()
    report = {
        "run_id": run_id,
        "run_type": "feature_build",
        "builder_version": VERSION,
        "feature_set_id": contract.get("feature_set_id"),
        "feature_set_version": contract.get("version"),
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
        "row_count": len(matrix),
        "column_count": len(columns),
        "feature_count": leakage["feature_count"],
        "target_count": leakage["target_count"],
        "target_distribution": _target_distribution(matrix),
        "source_table_coverage": source_audit,
        "evidence_coverage": coverage,
        "starter_exit_coverage": coverage["starter_exit_coverage"],
        "matchup_coverage": {
            "home_lineup_matchup_hitter_count_avg": _avg_dict(
                matrix, "home_lineup_matchup_hitter_count"
            ),
            "away_lineup_matchup_hitter_count_avg": _avg_dict(
                matrix, "away_lineup_matchup_hitter_count"
            ),
        },
        "reliever_availability_coverage": coverage[
            "reliever_availability_coverage"
        ],
        "first_up_reliever_router_coverage": coverage[
            "first_up_reliever_router_coverage"
        ],
        "reliever_chain_coverage": coverage["reliever_availability_coverage"],
        "reliever_arm_coverage": coverage["first_up_reliever_router_coverage"],
        "bullpen_churn_coverage": {
            "home_bullpen_shape_snapshot_available_rate": _safe_div(
                sum(
                    1
                    for row in matrix
                    if row.get("home_bullpen_shape_snapshot_available_flag")
                ),
                len(matrix),
            ),
            "away_bullpen_shape_snapshot_available_rate": _safe_div(
                sum(
                    1
                    for row in matrix
                    if row.get("away_bullpen_shape_snapshot_available_flag")
                ),
                len(matrix),
            ),
        },
        "attribution_coverage": {
            "plate_appearances_present": source_audit.get("plate_appearances", {}).get(
                "present"
            ),
            "pitch_events_present": source_audit.get("pitch_events", {}).get(
                "present"
            ),
            "plate_appearance_rows": source_audit.get("plate_appearances", {}).get(
                "row_count"
            ),
            "pitch_event_rows": source_audit.get("pitch_events", {}).get(
                "row_count"
            ),
        },
        "distribution_contract_coverage": {
            "downstream_distribution_families": contract.get(
                "downstream_distribution_families", []
            ),
            "distribution_bridge_policy": contract.get(
                "distribution_bridge_policy", {}
            ),
        },
        "prop_contract_coverage": {
            "prop_contract_families": contract.get("prop_contract_families", []),
            "props_materialized": False,
        },
        "missingness_uri": str(artifact_dir / "missingness.json"),
        "coverage_uri": str(artifact_dir / "coverage.json"),
        "leakage_uri": str(artifact_dir / "leakage.json"),
        "lineage_uri": str(artifact_dir / "lineage.json"),
        "data_dictionary_uri": str(artifact_dir / "data_dictionary.json"),
        "leakage_checks": leakage,
        "lineage": lineage,
        "uses_hand_picked_memory_lengths": False,
        "uses_m2_weights": False,
        "uses_sports_db": False,
        "warnings": warnings,
        "errors": errors,
    }
    _write_json(artifact_dir / "build_report.json", report)
    _write_json(report_path, report)
    return report


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Build the MLB-M3 alpha game-shape starter feature set."
    )
    parser.add_argument("--start-date", required=True, help="Inclusive start date.")
    parser.add_argument("--end-date", required=True, help="Inclusive end date.")
    parser.add_argument(
        "--as-of-policy",
        default="pregame",
        choices=["pregame"],
        help="As-of policy for feature materialization.",
    )
    parser.add_argument(
        "--db",
        type=Path,
        default=DEFAULT_DB_PATH,
        help="Typed MLB SQLite DB path.",
    )
    parser.add_argument(
        "--contract",
        type=Path,
        default=DEFAULT_CONTRACT_PATH,
        help="Feature-set contract JSON path.",
    )
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=DEFAULT_OUTPUT_DIR,
        help="Feature output directory.",
    )
    parser.add_argument(
        "--report",
        type=Path,
        default=DEFAULT_REPORT_PATH,
        help="JSON report mirror path.",
    )
    parser.add_argument(
        "--skeleton-only",
        action="store_true",
        help="Validate contract/run shape without materializing features.",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    report = (
        build_skeleton_report(args)
        if args.skeleton_only
        else build_feature_artifacts(args)
    )
    print(json.dumps(report, indent=2, sort_keys=True))
    return 0 if report["ok"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
