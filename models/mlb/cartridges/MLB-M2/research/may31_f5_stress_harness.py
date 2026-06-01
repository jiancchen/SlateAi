#!/usr/bin/env python3

from __future__ import annotations

import argparse
import json
import math
import re
import sqlite3
from collections import defaultdict
from pathlib import Path
from typing import Any

import pandas as pd


def find_root() -> Path:
    path = Path(__file__).resolve()
    for parent in path.parents:
        if (parent / "package.json").exists() and (parent / "models").exists():
            return parent
    raise RuntimeError("Could not locate project root.")


ROOT = find_root()
DB_PATH = ROOT / "data-private" / "warehouse" / "sports.db"
REPORT_DIR = ROOT / "models" / "mlb" / "cartridges" / "MLB-M2" / "reports"
PRIVATE_REPORT_DIR = ROOT / "data-private" / "reports"
DEFAULT_DATE = "2026-05-31"

SHORT_NAMES = {
    "Arizona Diamondbacks": "Diamondbacks",
    "Athletics": "Athletics",
    "Atlanta Braves": "Braves",
    "Baltimore Orioles": "Orioles",
    "Boston Red Sox": "Red Sox",
    "Chicago Cubs": "Cubs",
    "Chicago White Sox": "White Sox",
    "Cincinnati Reds": "Reds",
    "Cleveland Guardians": "Guardians",
    "Colorado Rockies": "Rockies",
    "Detroit Tigers": "Tigers",
    "Houston Astros": "Astros",
    "Kansas City Royals": "Royals",
    "Los Angeles Angels": "Angels",
    "Los Angeles Dodgers": "Dodgers",
    "Miami Marlins": "Marlins",
    "Milwaukee Brewers": "Brewers",
    "Minnesota Twins": "Twins",
    "New York Mets": "Mets",
    "New York Yankees": "Yankees",
    "Philadelphia Phillies": "Phillies",
    "Pittsburgh Pirates": "Pirates",
    "San Diego Padres": "Padres",
    "San Francisco Giants": "Giants",
    "Seattle Mariners": "Mariners",
    "St. Louis Cardinals": "Cardinals",
    "Tampa Bay Rays": "Rays",
    "Texas Rangers": "Rangers",
    "Toronto Blue Jays": "Blue Jays",
    "Washington Nationals": "Nationals",
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Build the MLB-M2 May 31 first-five totals stress harness."
    )
    parser.add_argument("--date", default=DEFAULT_DATE, help="Stress date.")
    parser.add_argument("--db", default=str(DB_PATH), help="Warehouse sqlite database.")
    parser.add_argument("--markdown-out", default=None, help="Markdown report output path.")
    parser.add_argument("--json-out", default=None, help="JSON artifact output path.")
    return parser.parse_args()


def to_number(value: Any, default: float | None = None) -> float | None:
    if value is None:
        return default
    try:
        numeric = float(value)
    except (TypeError, ValueError):
        return default
    if math.isnan(numeric) or math.isinf(numeric):
        return default
    return numeric


def parse_line(label: Any) -> float | None:
    if not label:
        return None
    match = re.search(r"([0-9]+(?:\.[0-9]+)?)", str(label))
    return float(match.group(1)) if match else None


def label_pct(value: float | None) -> str:
    if value is None:
        return "N/A"
    return f"{value * 100:.1f}%"


def signed(value: float | None, decimals: int = 1) -> str:
    if value is None:
        return "N/A"
    return f"{value:+.{decimals}f}"


def parse_json(value: Any) -> dict[str, Any]:
    if not value:
        return {}
    if isinstance(value, dict):
        return value
    try:
        parsed = json.loads(value)
    except (TypeError, json.JSONDecodeError):
        return {}
    return parsed if isinstance(parsed, dict) else {}


def read_summary_predictions(date_text: str) -> pd.DataFrame:
    path = ROOT / "published-data" / "slates" / date_text / "summary.json"
    summary = json.loads(path.read_text())
    rows: list[dict[str, Any]] = []
    for game in summary.get("games", []):
        if game.get("league") != "MLB":
            continue
        projection = ((game.get("analysis") or {}).get("mlbProjection") or {})
        totals = projection.get("totals") or {}
        first5 = totals.get("first5") or {}
        chaos_gate = first5.get("chaosGate") or {}
        metrics = chaos_gate.get("metrics") or {}
        title = str(game.get("title") or "")
        away_title, home_title = [part.strip() for part in title.split("@", 1)] if "@" in title else ("", "")
        rows.append(
            {
                "slate_id": str(game.get("id") or ""),
                "date": date_text,
                "game_title": title,
                "away_title": away_title,
                "home_title": home_title,
                "projected_f5_total": to_number(totals.get("projectedFirst5TotalRuns")),
                "projected_full_total": to_number(totals.get("projectedFullTotalRuns")),
                "first5_line": to_number(totals.get("derivedFirst5TotalLine"))
                or parse_line(first5.get("label")),
                "first5_lean": first5.get("lean"),
                "first5_label": first5.get("label"),
                "first5_edge": to_number(first5.get("edge")),
                "first5_warning": bool(chaos_gate.get("warning")),
                "first5_vetoed": bool(chaos_gate.get("vetoed")),
                "max_mistake_chaos": to_number(metrics.get("maxMistakeChaos"), 0),
                "max_run_clustering": to_number(metrics.get("maxRunClustering"), 0),
                "max_early_multi_run_allowed": to_number(metrics.get("maxEarlyMultiRunAllowed"), 0),
                "max_one_bad_inning_allowed": to_number(metrics.get("maxOneBadInningAllowed"), 0),
                "max_quiet_first5": to_number(metrics.get("maxQuietFirst5"), 0),
                "max_dead_bat_traffic": to_number(metrics.get("maxDeadBatTraffic"), 0),
                "min_lineup_conversion": to_number(metrics.get("minLineupConversion"), 0),
                "weather_carry": bool(metrics.get("weatherCarry")),
                "weather_suppress": bool(metrics.get("weatherSuppress")),
            }
        )
    return pd.DataFrame(rows)


def load_outcomes(conn: sqlite3.Connection, date_text: str) -> pd.DataFrame:
    outcomes = pd.read_sql_query(
        """
        SELECT
          game_pk,
          away_team,
          home_team,
          away_runs_first5,
          home_runs_first5,
          away_hits_first5,
          home_hits_first5,
          away_home_runs_first5,
          home_home_runs_first5,
          total_runs_first5,
          total_runs_final
        FROM mlb_game_outcomes
        WHERE game_date = ?
        """,
        conn,
        params=(date_text,),
    )
    outcomes["game_title"] = outcomes.apply(
        lambda row: f"{SHORT_NAMES.get(str(row['away_team']), row['away_team'])} @ "
        f"{SHORT_NAMES.get(str(row['home_team']), row['home_team'])}",
        axis=1,
    )
    return outcomes


def load_sun(conn: sqlite3.Connection, date_text: str) -> pd.DataFrame:
    return pd.read_sql_query(
        """
        SELECT
          game_pk,
          visibility_risk_score,
          outfield_glare_risk,
          shadow_transition_risk,
          risk_label,
          visibility_notes_json
        FROM mlb_game_sun_visibility_snapshots
        WHERE game_date = ?
        """,
        conn,
        params=(date_text,),
    )


def event_is_hit(event_type: Any) -> bool:
    return str(event_type or "") in {"single", "double", "triple", "home_run"}


def event_is_free_pass(event_type: Any) -> bool:
    return str(event_type or "") in {"walk", "intent_walk", "hit_by_pitch", "catcher_interf"}


def load_pa_shape(conn: sqlite3.Connection, date_text: str) -> pd.DataFrame:
    rows = pd.read_sql_query(
        """
        SELECT
          game_pk,
          inning,
          half_inning,
          batting_team,
          event_type,
          rbi,
          run_delta,
          is_out,
          outs_before,
          men_on_base,
          base_state_start
        FROM mlb_plate_appearances
        WHERE game_date = ? AND inning <= 5
        """,
        conn,
        params=(date_text,),
    )
    if rows.empty:
        return pd.DataFrame()

    rows["hit"] = rows["event_type"].map(event_is_hit).astype(int)
    rows["xbh"] = rows["event_type"].isin(["double", "triple", "home_run"]).astype(int)
    rows["hr"] = (rows["event_type"] == "home_run").astype(int)
    rows["free_pass"] = rows["event_type"].map(event_is_free_pass).astype(int)
    rows["strikeout"] = (rows["event_type"] == "strikeout").astype(int)
    rows["error"] = rows["event_type"].astype(str).str.contains("error").astype(int)
    rows["runs"] = pd.to_numeric(rows["run_delta"], errors="coerce").fillna(0).clip(lower=0)
    rows["traffic_pa"] = rows["hit"] + rows["free_pass"] + rows["error"]

    team = (
        rows.groupby(["game_pk", "batting_team"], as_index=False)
        .agg(
            plate_appearances=("event_type", "count"),
            hits=("hit", "sum"),
            xbh=("xbh", "sum"),
            home_runs=("hr", "sum"),
            free_passes=("free_pass", "sum"),
            strikeouts=("strikeout", "sum"),
            errors_on=("error", "sum"),
            traffic_pa=("traffic_pa", "sum"),
            runs=("runs", "sum"),
        )
        .rename(columns={"batting_team": "team"})
    )
    inning = (
        rows.groupby(["game_pk", "batting_team", "inning"], as_index=False)
        .agg(inning_runs=("runs", "sum"), inning_traffic=("traffic_pa", "sum"))
        .rename(columns={"batting_team": "team"})
    )
    max_inning = (
        inning.groupby(["game_pk", "team"], as_index=False)
        .agg(max_inning_runs=("inning_runs", "max"), max_inning_traffic=("inning_traffic", "max"))
    )
    team = team.merge(max_inning, on=["game_pk", "team"], how="left")
    team["runs_per_hit"] = team.apply(lambda row: row["runs"] / row["hits"] if row["hits"] else None, axis=1)
    team["traffic_conversion"] = team.apply(
        lambda row: row["runs"] / row["traffic_pa"] if row["traffic_pa"] else None, axis=1
    )
    team["traffic_rate"] = team["traffic_pa"] / team["plate_appearances"].replace(0, pd.NA)
    return team


def load_contact_shape(conn: sqlite3.Connection, date_text: str) -> pd.DataFrame:
    query = """
      SELECT game_pk, batting_team, raw_json
      FROM mlb_pitch_events
      WHERE game_date = ? AND inning <= 5 AND is_in_play = 1 AND raw_json IS NOT NULL
    """
    accumulator: dict[tuple[int, str], dict[str, Any]] = defaultdict(
        lambda: {
            "bbe": 0,
            "hard_hit": 0,
            "barrelish": 0,
            "line_drive_or_fly": 0,
            "weak_contact": 0,
            "avg_launch_speed_total": 0.0,
            "avg_launch_angle_total": 0.0,
            "max_launch_speed": None,
            "long_contact": 0,
        }
    )
    for game_pk, batting_team, raw in conn.execute(query, (date_text,)):
        payload = parse_json(raw)
        hit_data = payload.get("hitData") or {}
        launch_speed = to_number(hit_data.get("launchSpeed"))
        launch_angle = to_number(hit_data.get("launchAngle"))
        distance = to_number(hit_data.get("totalDistance"))
        trajectory = str(hit_data.get("trajectory") or "").lower()
        key = (int(game_pk), str(batting_team))
        bucket = accumulator[key]
        bucket["bbe"] += 1
        if launch_speed is not None:
            bucket["avg_launch_speed_total"] += launch_speed
            bucket["max_launch_speed"] = (
                launch_speed
                if bucket["max_launch_speed"] is None
                else max(float(bucket["max_launch_speed"]), launch_speed)
            )
            if launch_speed >= 95:
                bucket["hard_hit"] += 1
            if launch_speed <= 72:
                bucket["weak_contact"] += 1
        if launch_angle is not None:
            bucket["avg_launch_angle_total"] += launch_angle
        if launch_speed is not None and launch_angle is not None and launch_speed >= 95 and 8 <= launch_angle <= 32:
            bucket["barrelish"] += 1
        if trajectory in {"line_drive", "fly_ball"}:
            bucket["line_drive_or_fly"] += 1
        if distance is not None and distance >= 275:
            bucket["long_contact"] += 1

    rows: list[dict[str, Any]] = []
    for (game_pk, team), bucket in accumulator.items():
        bbe = bucket["bbe"]
        rows.append(
            {
                "game_pk": game_pk,
                "team": team,
                "bbe": bbe,
                "hard_hit": bucket["hard_hit"],
                "barrelish": bucket["barrelish"],
                "line_drive_or_fly": bucket["line_drive_or_fly"],
                "weak_contact": bucket["weak_contact"],
                "avg_launch_speed": bucket["avg_launch_speed_total"] / bbe if bbe else None,
                "avg_launch_angle": bucket["avg_launch_angle_total"] / bbe if bbe else None,
                "max_launch_speed": bucket["max_launch_speed"],
                "hard_hit_rate": bucket["hard_hit"] / bbe if bbe else None,
                "barrelish_rate": bucket["barrelish"] / bbe if bbe else None,
                "long_contact": bucket["long_contact"],
            }
        )
    return pd.DataFrame(rows)


def aggregate_game_shape(team_shape: pd.DataFrame) -> pd.DataFrame:
    if team_shape.empty:
        return pd.DataFrame()
    aggregations = {
        "plate_appearances": "sum",
        "hits": "sum",
        "xbh": "sum",
        "home_runs": "sum",
        "free_passes": "sum",
        "strikeouts": "sum",
        "errors_on": "sum",
        "traffic_pa": "sum",
        "runs": "sum",
        "max_inning_runs": "max",
        "max_inning_traffic": "max",
        "bbe": "sum",
        "hard_hit": "sum",
        "barrelish": "sum",
        "line_drive_or_fly": "sum",
        "weak_contact": "sum",
        "long_contact": "sum",
    }
    numeric_cols = [column for column in aggregations if column in team_shape.columns]
    game_shape = team_shape.groupby("game_pk", as_index=False).agg({column: aggregations[column] for column in numeric_cols})
    game_shape["actual_runs_per_hit"] = game_shape.apply(
        lambda row: row["runs"] / row["hits"] if row.get("hits") else None,
        axis=1,
    )
    game_shape["actual_traffic_conversion"] = game_shape.apply(
        lambda row: row["runs"] / row["traffic_pa"] if row.get("traffic_pa") else None,
        axis=1,
    )
    game_shape["hard_hit_rate"] = game_shape.apply(
        lambda row: row["hard_hit"] / row["bbe"] if row.get("bbe") else None,
        axis=1,
    )
    game_shape["barrelish_rate"] = game_shape.apply(
        lambda row: row["barrelish"] / row["bbe"] if row.get("bbe") else None,
        axis=1,
    )
    return game_shape


def hit_rate_for_projection(frame: pd.DataFrame, projection_column: str) -> dict[str, Any]:
    rows = frame[frame["first5_line"].notna() & frame[projection_column].notna()].copy()
    if rows.empty:
        return {"record": "0/0", "hitRate": None}
    rows["projected_side"] = rows.apply(
        lambda row: "Over" if row[projection_column] > row["first5_line"] else "Under",
        axis=1,
    )
    rows["actual_side"] = rows.apply(
        lambda row: "Over" if row["actual_f5_total"] > row["first5_line"] else "Under",
        axis=1,
    )
    rows = rows[rows["actual_f5_total"] != rows["first5_line"]]
    hits = int((rows["projected_side"] == rows["actual_side"]).sum())
    total = int(len(rows))
    return {
        "record": f"{hits}/{total}",
        "hitRate": hits / total if total else None,
        "rows": rows[["game_title", "first5_line", projection_column, "actual_f5_total", "projected_side", "actual_side"]].to_dict("records"),
    }


def fit_scalar(rows: pd.DataFrame) -> dict[str, float]:
    usable = rows[rows["projected_f5_total"].notna() & rows["actual_f5_total"].notna()]
    projected = usable["projected_f5_total"].astype(float)
    actual = usable["actual_f5_total"].astype(float)
    scalar = float((projected * actual).sum() / (projected * projected).sum())
    fit = pd.DataFrame({"projected": projected, "actual": actual}).dropna()
    # numpy is deliberately avoided here; the closed form is enough for this diagnostic.
    mean_x = float(fit["projected"].mean())
    mean_y = float(fit["actual"].mean())
    denom = float(((fit["projected"] - mean_x) ** 2).sum())
    slope = float((((fit["projected"] - mean_x) * (fit["actual"] - mean_y)).sum()) / denom) if denom else 0.0
    intercept = mean_y - slope * mean_x
    return {"scalar": scalar, "olsSlope": slope, "olsIntercept": intercept}


def diagnose_shape(row: pd.Series) -> str:
    if row["actual_f5_total"] > row["first5_line"]:
        if row.get("home_runs", 0) >= 3 or row.get("barrelish", 0) >= 4:
            return "over: power-contact tail"
        if row.get("max_inning_runs", 0) >= 5:
            return "over: crooked-inning conversion"
        if row.get("traffic_pa", 0) >= 12 and (row.get("free_passes", 0) >= 4 or row.get("actual_traffic_conversion", 0) >= 0.45):
            return "over: traffic converted"
        return "over: scalar/run-environment miss"
    if row.get("hits", 0) >= 8 and row.get("actual_traffic_conversion", 0) <= 0.18:
        return "under: traffic stranded"
    if row.get("hard_hit_rate", 0) <= 0.22 and row.get("barrelish", 0) <= 1:
        return "under: contact suppressed"
    return "under: conversion/cold-start miss"


def build_report(date_text: str, db_path: str) -> dict[str, Any]:
    prediction_rows = read_summary_predictions(date_text)
    with sqlite3.connect(db_path) as conn:
        outcomes = load_outcomes(conn, date_text)
        sun = load_sun(conn, date_text)
        pa_shape = load_pa_shape(conn, date_text)
        contact_shape = load_contact_shape(conn, date_text)

    team_shape = pa_shape.merge(contact_shape, on=["game_pk", "team"], how="left")
    game_shape = aggregate_game_shape(team_shape)
    frame = (
        prediction_rows.merge(outcomes, on="game_title", how="left")
        .merge(sun, on="game_pk", how="left")
        .merge(game_shape, on="game_pk", how="left")
    )
    frame["actual_f5_total"] = frame["total_runs_first5"]
    frame["projection_error"] = frame["actual_f5_total"] - frame["projected_f5_total"]
    frame["abs_projection_error"] = frame["projection_error"].abs()
    frame["projection_ratio"] = frame["actual_f5_total"] / frame["projected_f5_total"].replace(0, pd.NA)
    frame["actual_side"] = frame.apply(
        lambda row: "Over" if row["actual_f5_total"] > row["first5_line"] else "Under",
        axis=1,
    )
    frame["diagnosis"] = frame.apply(diagnose_shape, axis=1)

    fit = fit_scalar(frame)
    frame["scalar_projected_f5_total"] = frame["projected_f5_total"] * fit["scalar"]
    frame["ols_projected_f5_total"] = frame["projected_f5_total"] * fit["olsSlope"] + fit["olsIntercept"]

    original = hit_rate_for_projection(frame, "projected_f5_total")
    scalar = hit_rate_for_projection(frame, "scalar_projected_f5_total")
    ols = hit_rate_for_projection(frame, "ols_projected_f5_total")

    feature_gaps = [
        {
            "feature": "Run-conversion state",
            "whyItMatters": "May 31 was less about hits alone and more about whether traffic converted or stranded in the first five.",
            "warehouseStatus": "partly available from PA sequencing; needs persisted rolling team/pitcher features.",
            "candidateSignals": ["runs per traffic PA", "traffic pockets", "max inning traffic", "recent conversion volatility"],
        },
        {
            "feature": "Crooked-inning tail",
            "whyItMatters": "The misses came from tails, not median projections. One bad inning can flip an under even when average F5 is reasonable.",
            "warehouseStatus": "available from PA/pitch history; not yet modeled as a distribution lane.",
            "candidateSignals": ["multi-run inning allowed", "two-out damage", "free-pass before hard contact", "starter first/second-time-through collapse"],
        },
        {
            "feature": "Contact-quality bridge",
            "whyItMatters": "Pitch feed includes launch speed, angle, trajectory, distance, and location. M2 should project loud-contact risk, not only hits.",
            "warehouseStatus": "available in raw pitch events; needs materialized daily features.",
            "candidateSignals": ["hard-hit rate", "barrelish contact", "long fly/line-drive share", "weak-contact suppression"],
        },
        {
            "feature": "Team x opponent formula fit",
            "whyItMatters": "A single team trend is not enough; offense shape has to interact with starter arsenal, handedness, bullpen bridge, park, and opponent fielding.",
            "warehouseStatus": "not cleanly materialized as a model input.",
            "candidateSignals": ["offense recent F5 conversion x starter traffic allowed", "lineup handedness x pitch mix", "bullpen bridge if starter exits before six"],
        },
        {
            "feature": "Environment and fielding tail",
            "whyItMatters": "Sun/shadow/weather/park can create extra-base and error paths, but should be a small modifier unless paired with contact and fielding risk.",
            "warehouseStatus": "sun snapshots exist; needs cloud/roof/position and outfield-contact join.",
            "candidateSignals": ["sun visibility", "shadow transition", "wind carry", "outfield hit-location exposure", "defensive error volatility"],
        },
        {
            "feature": "Market total prior",
            "whyItMatters": "The slate projection was low by a scalar. Market lines should anchor run environment unless our data has a specific reason to reject them.",
            "warehouseStatus": "line available in published slate; needs explicit prior/blend and calibration audit.",
            "candidateSignals": ["market F5 line", "model-vs-market residual", "historical residual by park/weather/starter class"],
        },
    ]
    process_steps = [
        {
            "step": "Freeze the stress fixture",
            "action": "Keep May 31 F5 lines, model projections, actual F5 scores, PA sequences, and pitch hitData together.",
            "purpose": "Every M2 totals change must explain this slate without quietly changing the target.",
        },
        {
            "step": "Separate point-error from side-error",
            "action": "Track projected runs, line side, actual side, absolute error, and actual/projected ratio per game.",
            "purpose": "This tells us whether the failure is a scalar calibration problem, a direction problem, or both.",
        },
        {
            "step": "Classify the actual game shape",
            "action": "Use PA sequencing and pitch hitData to tag strand, traffic-converted, crooked-inning, power-contact, and contact-suppressed outcomes.",
            "purpose": "The model should predict the shape bucket, not just one average run number.",
        },
        {
            "step": "Turn postgame tags into pregame features",
            "action": "Materialize rolling team, starter, bullpen, contact-quality, conversion-volatility, market-prior, park, and sun/fielding features through the prior date.",
            "purpose": "No May 31 outcomes can be used for a clean candidate model; they only tell us what pregame proxies are missing.",
        },
        {
            "step": "Publish only model-owned market expressions",
            "action": "The cartridge emits over/under/pass/live-only with confidence and drivers. The UI only filters those rows.",
            "purpose": "Avoid rebuilding the broken value-board path where the website turned a projection into an EV bet.",
        },
    ]

    abs_error = frame["abs_projection_error"].dropna()
    abs_error_buckets = {
        "withinOneRun": int((abs_error <= 1).sum()),
        "oneToTwoRuns": int(((abs_error > 1) & (abs_error <= 2)).sum()),
        "twoToFourRuns": int(((abs_error > 2) & (abs_error <= 4)).sum()),
        "overFourRuns": int((abs_error > 4).sum()),
    }
    rows_for_json = frame.sort_values("abs_projection_error", ascending=False).to_dict("records")
    return {
        "schemaVersion": 1,
        "modelId": "MLB-M2",
        "experiment": "may31_first5_stress_harness",
        "date": date_text,
        "counts": {
            "games": int(len(frame)),
            "pitchEventsFirst5": int(team_shape.get("bbe", pd.Series(dtype=int)).sum()) if not team_shape.empty else 0,
            "plateAppearancesFirst5": int(team_shape.get("plate_appearances", pd.Series(dtype=int)).sum()) if not team_shape.empty else 0,
        },
        "projectionFit": {
            "meanAbsoluteErrorRuns": round(float(abs_error.mean()), 3),
            "medianAbsoluteErrorRuns": round(float(abs_error.median()), 3),
            "maxAbsoluteErrorRuns": round(float(abs_error.max()), 3),
            "absErrorBuckets": abs_error_buckets,
            "signedMeanErrorRuns": round(float(frame["projection_error"].mean()), 3),
            "signedMedianErrorRuns": round(float(frame["projection_error"].median()), 3),
            "meanActualToProjectedRatio": round(float(frame["projection_ratio"].mean()), 3),
            "medianActualToProjectedRatio": round(float(frame["projection_ratio"].median()), 3),
            "scalar": round(fit["scalar"], 4),
            "olsSlope": round(fit["olsSlope"], 4),
            "olsIntercept": round(fit["olsIntercept"], 4),
        },
        "first5SideHitRates": {
            "originalProjection": {key: value for key, value in original.items() if key != "rows"},
            "scalarProjection": {key: value for key, value in scalar.items() if key != "rows"},
            "olsProjection": {key: value for key, value in ols.items() if key != "rows"},
        },
        "featureGaps": feature_gaps,
        "processSteps": process_steps,
        "games": rows_for_json,
    }


def build_markdown(report: dict[str, Any]) -> str:
    fit = report["projectionFit"]
    hit_rates = report["first5SideHitRates"]
    game_rows = []
    for row in report["games"]:
        game_rows.append(
            "| "
            + " | ".join(
                [
                    str(row["game_title"]),
                    str(row.get("first5_label") or row.get("first5_line")),
                    f"{to_number(row.get('projected_f5_total'), 0):.1f}",
                    str(int(row.get("actual_f5_total") or 0)),
                    f"{to_number(row.get('abs_projection_error'), 0):.1f}",
                    signed(to_number(row.get("projection_error"))),
                    str(row.get("actual_side")),
                    str(row.get("diagnosis")),
                ]
            )
            + " |"
        )
    gaps = "\n".join(
        f"- **{gap['feature']}**: {gap['whyItMatters']} Status: {gap['warehouseStatus']}"
        for gap in report["featureGaps"]
    )
    steps = "\n".join(
        f"{index}. **{step['step']}**: {step['action']} Purpose: {step['purpose']}"
        for index, step in enumerate(report["processSteps"], start=1)
    )
    return f"""# MLB-M2 May 31 First-Five Stress Harness

Date: {report['date']}

This is a retrospective stress harness, not a clean backtest win. The goal is to force M2 to explain why the May 31 first-five total board broke, then decide which features need to become real cartridge inputs.

## Projection Fit

- Games: {report['counts']['games']}
- First-five plate appearances in warehouse: {report['counts']['plateAppearancesFirst5']}
- First-five batted-ball events with pitch `hitData`: {report['counts']['pitchEventsFirst5']}
- Mean absolute error: {fit['meanAbsoluteErrorRuns']:.2f} runs
- Median absolute error: {fit['medianAbsoluteErrorRuns']:.2f} runs
- Max absolute miss: {fit['maxAbsoluteErrorRuns']:.1f} runs
- Absolute-error buckets: <=1 run {fit['absErrorBuckets']['withinOneRun']}, 1-2 runs {fit['absErrorBuckets']['oneToTwoRuns']}, 2-4 runs {fit['absErrorBuckets']['twoToFourRuns']}, >4 runs {fit['absErrorBuckets']['overFourRuns']}
- Signed bias, for calibration only: mean {signed(fit['signedMeanErrorRuns'])}, median {signed(fit['signedMedianErrorRuns'])}
- Actual/projected ratio: mean {fit['meanActualToProjectedRatio']:.2f}, median {fit['medianActualToProjectedRatio']:.2f}
- Scalar fit: `actual ~= {fit['scalar']:.3f} * projected`
- OLS fit: `actual ~= {fit['olsSlope']:.3f} * projected + {fit['olsIntercept']:.3f}`

## Line Test

- Original F5 projection side: {hit_rates['originalProjection']['record']} ({label_pct(hit_rates['originalProjection']['hitRate'])})
- Scalar-adjusted side: {hit_rates['scalarProjection']['record']} ({label_pct(hit_rates['scalarProjection']['hitRate'])})
- OLS-adjusted side: {hit_rates['olsProjection']['record']} ({label_pct(hit_rates['olsProjection']['hitRate'])})

Do not use signed average error as a success metric here. It can hide one game that is four runs too low and another that is four runs too high. The scalar correction helps, but it does not solve the slate. That means this is not just one missing multiplier. M2 needs a mixture model: normal run expectation, strand risk, and crooked-inning tail.

## Process Loop

{steps}

## Game Diagnostics

| Game | F5 line | M2 proj | Actual | Abs err | Signed err | Actual side | Diagnosis |
| --- | --- | ---: | ---: | ---: | ---: | --- | --- |
{chr(10).join(game_rows)}

## Feature Process

{gaps}

## M2 Rule

For the next M2 totals pass, the value board should only expose F5 O/U when the cartridge publishes all three pieces:

1. `expectedFirst5Runs`: the calibrated point estimate.
2. `first5TailShape`: over-tail, strand-tail, or balanced, with the drivers listed.
3. `marketExpression`: over, under, pass, live-only, or no-market-edge after comparing the line.

The website must keep filtering these rows only. It should not create the F5 total bet from projected runs.
"""


def main() -> None:
    args = parse_args()
    report = build_report(args.date, args.db)
    markdown_out = (
        Path(args.markdown_out)
        if args.markdown_out
        else REPORT_DIR / f"may31-f5-stress-harness-{args.date}.md"
    )
    json_out = (
        Path(args.json_out)
        if args.json_out
        else PRIVATE_REPORT_DIR / f"mlb-m2-may31-f5-stress-harness-{args.date}.json"
    )
    markdown_out.parent.mkdir(parents=True, exist_ok=True)
    json_out.parent.mkdir(parents=True, exist_ok=True)
    markdown_out.write_text(build_markdown(report))
    json_out.write_text(json.dumps(report, indent=2))
    print(f"Wrote {markdown_out}")
    print(f"Wrote {json_out}")


if __name__ == "__main__":
    main()
