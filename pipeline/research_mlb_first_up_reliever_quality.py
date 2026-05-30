#!/usr/bin/env python3

from __future__ import annotations

import argparse
import sqlite3
from collections import defaultdict, deque
from dataclasses import dataclass
from pathlib import Path

try:
    from sklearn.ensemble import RandomForestClassifier
    from sklearn.impute import SimpleImputer
except Exception:  # pragma: no cover
    RandomForestClassifier = None
    SimpleImputer = None

from research_mlb_first_up_reliever_model import (
    AUGMENT_COLUMNS,
    BASE_FEATURE_COLUMNS,
    load_rows as load_first_up_rows,
    markdown_table,
    rank_groups,
    split_dates,
    summarize_ranked_groups,
    workload_rows,
)


ROOT = Path(__file__).resolve().parents[1]
DB_PATH = ROOT / "data-private" / "warehouse" / "sports.db"
REPORT_PATH = ROOT / "development-docs" / "mlb-first-up-reliever-quality-053026.md"


@dataclass
class ReliefQualityAppearance:
    pitcher_id: int
    game_date: str
    game_pk: int
    team_name: str
    entry_order: int | None
    outs_recorded: int
    runs_allowed: int
    hits_allowed: int
    walks_allowed: int
    strikeouts: int
    home_runs_allowed: int
    batters_faced: int
    pitches_thrown: int
    strikes_thrown: int
    first_batter_reached: int
    first_batter_walk: int
    first_batter_strikeout: int
    first_batter_run_delta: int
    first_batter_scoring_play: int
    first_pitch_strike: int
    first5_ball_rate: float
    first5_strike_rate: float


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Research first-up reliever model with quality, call-up, and role-drift overlays.")
    parser.add_argument("--db", default=str(DB_PATH), help="Warehouse sqlite path.")
    parser.add_argument("--out", default=str(REPORT_PATH), help="Markdown output path.")
    return parser.parse_args()


def safe_divide(numerator: float, denominator: float) -> float:
    return numerator / denominator if denominator else 0.0


def load_relief_appearance_rows(conn: sqlite3.Connection) -> list[sqlite3.Row]:
    return conn.execute(
        """
        SELECT
          game_pk,
          game_date,
          team_name,
          pitcher_id,
          pitcher_name,
          entry_order,
          outs_recorded,
          runs_allowed,
          hits_allowed,
          walks_allowed,
          strikeouts,
          home_runs_allowed,
          batters_faced,
          pitches_thrown,
          strikes_thrown
        FROM mlb_pitcher_appearances
        WHERE pitcher_role = 'reliever'
        ORDER BY pitcher_id, game_date, game_pk
        """
    ).fetchall()


def load_first_batter_lookup(conn: sqlite3.Connection) -> dict[tuple[int, int], dict[str, int]]:
    rows = conn.execute(
        """
        WITH first_pa AS (
          SELECT
            pitcher_id,
            game_pk,
            MIN(at_bat_index) AS first_at_bat_index
          FROM mlb_plate_appearances
          WHERE pitcher_id IS NOT NULL
          GROUP BY pitcher_id, game_pk
        )
        SELECT
          pa.pitcher_id,
          pa.game_pk,
          pa.event_type,
          pa.event,
          pa.is_out,
          pa.is_scoring_play,
          pa.run_delta,
          pa.rbi
        FROM first_pa fp
        JOIN mlb_plate_appearances pa
          ON pa.pitcher_id = fp.pitcher_id
         AND pa.game_pk = fp.game_pk
         AND pa.at_bat_index = fp.first_at_bat_index
        """
    ).fetchall()

    lookup: dict[tuple[int, int], dict[str, int]] = {}
    for row in rows:
        event_type = (row["event_type"] or "").lower()
        event = (row["event"] or "").lower()
        walk_flag = 1 if event_type in {"walk", "intent_walk", "hit_by_pitch"} or "walk" in event else 0
        strikeout_flag = 1 if event_type == "strikeout" or "strikeout" in event else 0
        reached_flag = 0 if int(row["is_out"] or 0) == 1 else 1
        lookup[(int(row["pitcher_id"]), int(row["game_pk"]))] = {
            "first_batter_reached": reached_flag,
            "first_batter_walk": walk_flag,
            "first_batter_strikeout": strikeout_flag,
            "first_batter_run_delta": int(row["run_delta"] or 0),
            "first_batter_scoring_play": int(row["is_scoring_play"] or 0),
        }
    return lookup


def load_first_pitch_command_lookup(conn: sqlite3.Connection) -> dict[tuple[int, int], dict[str, float]]:
    rows = conn.execute(
        """
        SELECT
          pe.pitcher_id,
          pe.game_pk,
          pe.at_bat_index,
          pe.event_index,
          pe.is_ball,
          pe.is_strike
        FROM mlb_pitch_events pe
        JOIN mlb_pitcher_appearances pa
          ON pa.game_pk = pe.game_pk
         AND pa.pitcher_id = pe.pitcher_id
        WHERE pa.pitcher_role = 'reliever'
          AND pe.is_pitch = 1
        ORDER BY pe.pitcher_id, pe.game_pk, pe.at_bat_index, pe.event_index
        """
    ).fetchall()

    grouped: dict[tuple[int, int], list[sqlite3.Row]] = defaultdict(list)
    for row in rows:
        grouped[(int(row["pitcher_id"]), int(row["game_pk"]))].append(row)

    lookup: dict[tuple[int, int], dict[str, float]] = {}
    for key, pitches in grouped.items():
        first5 = pitches[:5]
        first_pitch = pitches[0] if pitches else None
        lookup[key] = {
            "first_pitch_strike": int(first_pitch["is_strike"] or 0) if first_pitch else 0,
            "first5_ball_rate": safe_divide(sum(int(p["is_ball"] or 0) for p in first5), len(first5)),
            "first5_strike_rate": safe_divide(sum(int(p["is_strike"] or 0) for p in first5), len(first5)),
        }
    return lookup


def load_quality_appearances(conn: sqlite3.Connection) -> dict[int, list[ReliefQualityAppearance]]:
    first_batter_lookup = load_first_batter_lookup(conn)
    command_lookup = load_first_pitch_command_lookup(conn)

    grouped: dict[int, list[ReliefQualityAppearance]] = defaultdict(list)
    for row in load_relief_appearance_rows(conn):
        key = (int(row["pitcher_id"]), int(row["game_pk"]))
        first_batter = first_batter_lookup.get(key, {})
        command = command_lookup.get(key, {})
        grouped[int(row["pitcher_id"])].append(
            ReliefQualityAppearance(
                pitcher_id=int(row["pitcher_id"]),
                game_date=row["game_date"],
                game_pk=int(row["game_pk"]),
                team_name=row["team_name"],
                entry_order=row["entry_order"],
                outs_recorded=int(row["outs_recorded"] or 0),
                runs_allowed=int(row["runs_allowed"] or 0),
                hits_allowed=int(row["hits_allowed"] or 0),
                walks_allowed=int(row["walks_allowed"] or 0),
                strikeouts=int(row["strikeouts"] or 0),
                home_runs_allowed=int(row["home_runs_allowed"] or 0),
                batters_faced=int(row["batters_faced"] or 0),
                pitches_thrown=int(row["pitches_thrown"] or 0),
                strikes_thrown=int(row["strikes_thrown"] or 0),
                first_batter_reached=int(first_batter.get("first_batter_reached", 0)),
                first_batter_walk=int(first_batter.get("first_batter_walk", 0)),
                first_batter_strikeout=int(first_batter.get("first_batter_strikeout", 0)),
                first_batter_run_delta=int(first_batter.get("first_batter_run_delta", 0)),
                first_batter_scoring_play=int(first_batter.get("first_batter_scoring_play", 0)),
                first_pitch_strike=int(command.get("first_pitch_strike", 0)),
                first5_ball_rate=float(command.get("first5_ball_rate", 0.0)),
                first5_strike_rate=float(command.get("first5_strike_rate", 0.0)),
            )
        )
    return grouped


def summarize_window(appearances: list[ReliefQualityAppearance]) -> dict[str, float]:
    sample = float(len(appearances))
    outs = sum(appearance.outs_recorded for appearance in appearances)
    batters = sum(appearance.batters_faced for appearance in appearances)
    pitches = sum(appearance.pitches_thrown for appearance in appearances)
    return {
        "sample": sample,
        "outs_per_app": safe_divide(outs, sample),
        "entry_order_avg": safe_divide(sum((appearance.entry_order or 0) for appearance in appearances), sample),
        "runs_per_bf": safe_divide(sum(appearance.runs_allowed for appearance in appearances), batters),
        "hits_per_bf": safe_divide(sum(appearance.hits_allowed for appearance in appearances), batters),
        "walks_per_bf": safe_divide(sum(appearance.walks_allowed for appearance in appearances), batters),
        "strikeouts_per_bf": safe_divide(sum(appearance.strikeouts for appearance in appearances), batters),
        "hr_per_bf": safe_divide(sum(appearance.home_runs_allowed for appearance in appearances), batters),
        "traffic_per_bf": safe_divide(sum(appearance.hits_allowed + appearance.walks_allowed for appearance in appearances), batters),
        "strike_rate": safe_divide(sum(appearance.strikes_thrown for appearance in appearances), pitches),
        "first_batter_reach_rate": safe_divide(sum(appearance.first_batter_reached for appearance in appearances), sample),
        "first_batter_walk_rate": safe_divide(sum(appearance.first_batter_walk for appearance in appearances), sample),
        "first_batter_strikeout_rate": safe_divide(sum(appearance.first_batter_strikeout for appearance in appearances), sample),
        "first_batter_scoring_play_rate": safe_divide(sum(appearance.first_batter_scoring_play for appearance in appearances), sample),
        "first_batter_run_delta_rate": safe_divide(sum(appearance.first_batter_run_delta for appearance in appearances), sample),
        "first_pitch_strike_rate": safe_divide(sum(appearance.first_pitch_strike for appearance in appearances), sample),
        "first5_ball_rate": safe_divide(sum(appearance.first5_ball_rate for appearance in appearances), sample),
        "first5_strike_rate": safe_divide(sum(appearance.first5_strike_rate for appearance in appearances), sample),
        "pitches_per_app": safe_divide(pitches, sample),
    }


def build_quality_lookup(rows, quality_appearances_by_pitcher: dict[int, list[ReliefQualityAppearance]]) -> dict[tuple[str, int], dict[str, float]]:
    dates_by_pitcher: dict[int, list[str]] = defaultdict(list)
    teams_by_pitcher_date: dict[tuple[int, str], set[str]] = defaultdict(set)
    for row in rows:
        dates_by_pitcher[row.pitcher_id].append(row.as_of_date)
        teams_by_pitcher_date[(row.pitcher_id, row.as_of_date)].add(row.team_name)

    lookup: dict[tuple[str, int], dict[str, float]] = {}
    for pitcher_id, dates in dates_by_pitcher.items():
        unique_dates = sorted(set(dates))
        appearances = sorted(quality_appearances_by_pitcher.get(pitcher_id, []), key=lambda appearance: (appearance.game_date, appearance.game_pk))
        recent = deque(maxlen=10)
        all_prior: list[ReliefQualityAppearance] = []
        app_idx = 0
        for as_of_date in unique_dates:
            while app_idx < len(appearances) and appearances[app_idx].game_date < as_of_date:
                recent.append(appearances[app_idx])
                all_prior.append(appearances[app_idx])
                app_idx += 1

            recent_list = list(recent)
            last3 = recent_list[-3:]
            last10 = recent_list[-10:]
            summary3 = summarize_window(last3)
            summary10 = summarize_window(last10)

            teams = teams_by_pitcher_date.get((pitcher_id, as_of_date), set())
            if len(teams) == 1:
                team_name = next(iter(teams))
                prior_team_apps = [appearance for appearance in all_prior if appearance.team_name == team_name]
            else:
                prior_team_apps = all_prior

            prior_team_count = float(len(prior_team_apps))
            prior_total_count = float(len(all_prior))
            lookup[(as_of_date, pitcher_id)] = {
                "quality_sample_last10": summary10["sample"],
                "quality_outs_per_app_last10": summary10["outs_per_app"],
                "quality_entry_order_avg_last10": summary10["entry_order_avg"],
                "quality_runs_per_bf_last10": summary10["runs_per_bf"],
                "quality_hits_per_bf_last10": summary10["hits_per_bf"],
                "quality_walks_per_bf_last10": summary10["walks_per_bf"],
                "quality_strikeouts_per_bf_last10": summary10["strikeouts_per_bf"],
                "quality_hr_per_bf_last10": summary10["hr_per_bf"],
                "quality_traffic_per_bf_last10": summary10["traffic_per_bf"],
                "quality_strike_rate_last10": summary10["strike_rate"],
                "quality_first_batter_reach_rate_last10": summary10["first_batter_reach_rate"],
                "quality_first_batter_walk_rate_last10": summary10["first_batter_walk_rate"],
                "quality_first_batter_strikeout_rate_last10": summary10["first_batter_strikeout_rate"],
                "quality_first_batter_scoring_play_rate_last10": summary10["first_batter_scoring_play_rate"],
                "quality_first_batter_run_delta_rate_last10": summary10["first_batter_run_delta_rate"],
                "quality_first_pitch_strike_rate_last10": summary10["first_pitch_strike_rate"],
                "quality_first5_ball_rate_last10": summary10["first5_ball_rate"],
                "quality_first5_strike_rate_last10": summary10["first5_strike_rate"],
                "quality_pitches_per_app_last10": summary10["pitches_per_app"],
                "quality_outs_drift_3_vs_10": summary3["outs_per_app"] - summary10["outs_per_app"],
                "quality_entry_drift_3_vs_10": summary3["entry_order_avg"] - summary10["entry_order_avg"],
                "quality_pitches_drift_3_vs_10": summary3["pitches_per_app"] - summary10["pitches_per_app"],
                "quality_traffic_drift_3_vs_10": summary3["traffic_per_bf"] - summary10["traffic_per_bf"],
                "quality_first_batter_reach_drift_3_vs_10": summary3["first_batter_reach_rate"] - summary10["first_batter_reach_rate"],
                "quality_prior_team_apps_total": prior_team_count,
                "quality_prior_relief_apps_total": prior_total_count,
                "quality_new_team_flag": 1.0 if prior_team_count < 3 else 0.0,
                "quality_unknown_sample_flag": 1.0 if prior_total_count < 5 else 0.0,
                "quality_recent_bulk_role_flag": 1.0 if summary3["outs_per_app"] >= 4.5 and summary10["outs_per_app"] < 4.0 else 0.0,
                "quality_recent_short_role_flag": 1.0 if summary3["outs_per_app"] <= 2.0 and summary10["outs_per_app"] > 2.5 else 0.0,
            }
    return lookup


QUALITY_COLUMNS = [
    "quality_sample_last10",
    "quality_outs_per_app_last10",
    "quality_entry_order_avg_last10",
    "quality_runs_per_bf_last10",
    "quality_hits_per_bf_last10",
    "quality_walks_per_bf_last10",
    "quality_strikeouts_per_bf_last10",
    "quality_hr_per_bf_last10",
    "quality_traffic_per_bf_last10",
    "quality_strike_rate_last10",
    "quality_first_batter_reach_rate_last10",
    "quality_first_batter_walk_rate_last10",
    "quality_first_batter_strikeout_rate_last10",
    "quality_first_batter_scoring_play_rate_last10",
    "quality_first_batter_run_delta_rate_last10",
    "quality_first_pitch_strike_rate_last10",
    "quality_first5_ball_rate_last10",
    "quality_first5_strike_rate_last10",
    "quality_pitches_per_app_last10",
    "quality_outs_drift_3_vs_10",
    "quality_entry_drift_3_vs_10",
    "quality_pitches_drift_3_vs_10",
    "quality_traffic_drift_3_vs_10",
    "quality_first_batter_reach_drift_3_vs_10",
    "quality_prior_team_apps_total",
    "quality_prior_relief_apps_total",
    "quality_new_team_flag",
    "quality_unknown_sample_flag",
    "quality_recent_bulk_role_flag",
    "quality_recent_short_role_flag",
]


def train_candidate_model(train_rows, test_rows, quality_lookup: dict[tuple[str, int], dict[str, float]], feature_columns: list[str]) -> tuple[list[float], list[str]]:
    if RandomForestClassifier is None or SimpleImputer is None:
        return [0.0] * len(test_rows), []

    def build_vector(row) -> list[float | int | None]:
        quality = quality_lookup.get((row.as_of_date, row.pitcher_id), {})
        vector: list[float | int | None] = []
        for feature in feature_columns:
            if feature in quality:
                vector.append(quality.get(feature))
            else:
                vector.append(getattr(row, feature))
        return vector

    X_train = [build_vector(row) for row in train_rows]
    y_train = [row.actual_first_up_flag for row in train_rows]
    X_test = [build_vector(row) for row in test_rows]

    imputer = SimpleImputer(strategy="median")
    X_train_imp = imputer.fit_transform(X_train)
    X_test_imp = imputer.transform(X_test)

    model = RandomForestClassifier(
        n_estimators=700,
        min_samples_leaf=3,
        random_state=31,
        class_weight="balanced_subsample",
    )
    model.fit(X_train_imp, y_train)
    probs = model.predict_proba(X_test_imp)[:, 1].tolist()
    ranked = sorted(zip(feature_columns, model.feature_importances_), key=lambda pair: pair[1], reverse=True)[:12]
    feature_lines = [f"`{name}` `{importance:.3f}`" for name, importance in ranked]
    return probs, feature_lines


def summarize_scored_groups(rows, probs: list[float]) -> dict[str, float]:
    grouped: dict[tuple[str, str], list[tuple[object, float]]] = defaultdict(list)
    for row, prob in zip(rows, probs):
        grouped[(row.as_of_date, row.team_name)].append((row, prob))

    ranked_groups = []
    for key in sorted(grouped):
        bucket = sorted(
            grouped[key],
            key=lambda pair: (
                pair[1],
                pair[0].first_reliever_likelihood or 0.0,
                pair[0].availability_score or 0.0,
                pair[0].bridge_score or 0.0,
            ),
            reverse=True,
        )
        ranked_groups.append([row for row, _ in bucket])
    return summarize_ranked_groups(ranked_groups)


def quality_profile_rows(rows, quality_lookup: dict[tuple[str, int], dict[str, float]]) -> list[list[str]]:
    grouped: dict[str, dict[str, float]] = {
        "1-3 outs": {"samples": 0.0, "reach": 0.0, "walk": 0.0, "strike": 0.0, "team_new": 0.0, "unknown": 0.0},
        "4-5 outs": {"samples": 0.0, "reach": 0.0, "walk": 0.0, "strike": 0.0, "team_new": 0.0, "unknown": 0.0},
        "6+ outs": {"samples": 0.0, "reach": 0.0, "walk": 0.0, "strike": 0.0, "team_new": 0.0, "unknown": 0.0},
    }
    for row in rows:
        if row.actual_first_up_flag != 1:
            continue
        quality = quality_lookup.get((row.as_of_date, row.pitcher_id), {})
        bucket = grouped[row.actual_workload_bucket]
        bucket["samples"] += 1.0
        bucket["reach"] += quality.get("quality_first_batter_reach_rate_last10", 0.0)
        bucket["walk"] += quality.get("quality_first_batter_walk_rate_last10", 0.0)
        bucket["strike"] += quality.get("quality_first_pitch_strike_rate_last10", 0.0)
        bucket["team_new"] += quality.get("quality_new_team_flag", 0.0)
        bucket["unknown"] += quality.get("quality_unknown_sample_flag", 0.0)

    table_rows: list[list[str]] = []
    for label in ("1-3 outs", "4-5 outs", "6+ outs"):
        bucket = grouped[label]
        samples = bucket["samples"]
        table_rows.append(
            [
                label,
                str(int(samples)),
                f"{safe_divide(bucket['reach'], samples):.3f}",
                f"{safe_divide(bucket['walk'], samples):.3f}",
                f"{safe_divide(bucket['strike'], samples):.3f}",
                f"{safe_divide(bucket['team_new'], samples):.3f}",
                f"{safe_divide(bucket['unknown'], samples):.3f}",
            ]
        )
    return table_rows


def main() -> None:
    args = parse_args()
    conn = sqlite3.connect(args.db)
    conn.row_factory = sqlite3.Row
    rows = load_first_up_rows(conn)
    quality_appearances_by_pitcher = load_quality_appearances(conn)
    conn.close()

    quality_lookup = build_quality_lookup(rows, quality_appearances_by_pitcher)
    train_dates, test_dates = split_dates(rows)
    train_rows = [row for row in rows if row.as_of_date in train_dates]
    test_rows = [row for row in rows if row.as_of_date in test_dates]

    baseline_groups = rank_groups(
        test_rows,
        lambda row: (
            (row.first_reliever_likelihood or 0.0),
            (row.availability_score or 0.0),
            (row.bridge_score or 0.0),
        ),
    )
    baseline_summary = summarize_ranked_groups(baseline_groups)

    e29_columns = BASE_FEATURE_COLUMNS + AUGMENT_COLUMNS
    e29_probs, _ = train_candidate_model(train_rows, test_rows, quality_lookup, e29_columns)
    e29_summary = summarize_scored_groups(test_rows, e29_probs)

    e31_columns = e29_columns + QUALITY_COLUMNS
    e31_probs, feature_lines = train_candidate_model(train_rows, test_rows, quality_lookup, e31_columns)
    e31_summary = summarize_scored_groups(test_rows, e31_probs)

    report = f"""# MLB First-Up Reliever Quality + Role-Drift Overlay — May 30, 2026

This is `E31`, the next bullpen-model pass after `E29`.

Goal:

- add reliever quality / role-drift / new-sample overlays
- test whether recent first-batter command and damage improve first-up reliever identification
- see whether fresh call-up / unknown-sample flags or bulk-role drift add separation

Samples:

- candidate rows: `{len(rows)}`
- team-side games: `{len({(row.as_of_date, row.team_name) for row in rows})}`
- train candidate rows: `{len(train_rows)}`
- test candidate rows: `{len(test_rows)}`
- test team-side games: `{baseline_summary['samples']}`

## Ranking Comparison

{markdown_table(
    ["Model", "Exact 1st", "Top-2", "Top-3"],
    [
        ["`current likelihood stack`", f"{baseline_summary['exact_rate']:.1f}%", f"{baseline_summary['top2_rate']:.1f}%", f"{baseline_summary['top3_rate']:.1f}%"],
        ["`E29: shape + starter exit + usage`", f"{e29_summary['exact_rate']:.1f}%", f"{e29_summary['top2_rate']:.1f}%", f"{e29_summary['top3_rate']:.1f}%"],
        ["`E31: E29 + quality / role-drift`", f"{e31_summary['exact_rate']:.1f}%", f"{e31_summary['top2_rate']:.1f}%", f"{e31_summary['top3_rate']:.1f}%"],
    ],
)}

## Workload Buckets: E29

{markdown_table(["Actual first-up workload", "Samples", "Exact 1st", "Top-2"], workload_rows(e29_summary))}

## Workload Buckets: E31

{markdown_table(["Actual first-up workload", "Samples", "Exact 1st", "Top-2"], workload_rows(e31_summary))}

## Actual First-Up Quality Profile

{markdown_table(
    ["Actual first-up workload", "Samples", "FB reach rate L10", "FB walk rate L10", "1st-pitch strike L10", "New-team flag", "Unknown-sample flag"],
    quality_profile_rows(rows, quality_lookup),
)}

## Top E31 Features

{chr(10).join(f"- {line}" for line in feature_lines) if feature_lines else "- `sklearn` unavailable, so no feature ranking was produced."}

## Read

- `E31` tests whether arm quality and role drift add missing separation on top of bullpen shape and starter-exit risk.
- The most important quality lane here is not generic reliever ERA. It is the combination of:
  - recent first-batter outcomes
  - first-five-pitch command
  - recent traffic allowed
  - new-sample / unknown-sample flags
  - recent bulk-role drift
- If this helps mainly on `Top-2` or the `6+ outs` lane, that still matters. It would mean we are getting better at identifying the right reliever class before the exact-name layer fully matures.
"""
    Path(args.out).write_text(report)
    print(f"Wrote {args.out}")


if __name__ == "__main__":
    main()
