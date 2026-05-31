#!/usr/bin/env python3

from __future__ import annotations

import argparse
import sqlite3
from dataclasses import dataclass
from pathlib import Path

try:
    from sklearn.ensemble import RandomForestClassifier
    from sklearn.impute import SimpleImputer
    from sklearn.metrics import brier_score_loss
except Exception:  # pragma: no cover - graceful fallback if sklearn is unavailable
    RandomForestClassifier = None
    SimpleImputer = None
    brier_score_loss = None


ROOT = Path(__file__).resolve().parents[3]
DB_PATH = ROOT / "data-private" / "warehouse" / "sports.db"
REPORT_PATH = ROOT / "development-docs" / "mlb-starter-exit-buckets-053026.md"

LEASH_WINDOW = 5
ROLLING_WINDOW = 5
MISTAKE_WINDOW = 5
THRESHOLDS = (12, 15, 18, 21)


@dataclass
class StarterExitRow:
    game_date: str
    game_pk: int
    pitcher_id: int
    pitcher_name: str
    team_name: str
    opponent_name: str
    outs_recorded: int
    pitches_thrown: int
    leash_score: float | None
    starts_sample: int
    outs_per_start: float | None
    short_start_rate: float | None
    five_plus_inning_rate: float | None
    six_plus_inning_rate: float | None
    ninety_pitch_rate: float | None
    leash_volatility: float | None
    recent_3_outs_delta: float | None
    recent_3_pitches_delta: float | None
    whip_like: float | None
    strikeout_to_walk_ratio: float | None
    quality_start_rate: float | None
    run_volatility: float | None
    home_run_burstiness: float | None
    recent_3_earned_runs_delta: float | None
    first_batter_reach_rate: float | None
    first_inning_run_allowed_rate: float | None
    early_clean_start_rate: float | None
    meltdown_start_rate: float | None
    walk_burst_start_rate: float | None
    sixth_inning_damage_rate: float | None
    post_damage_recovery_rate: float | None
    command_break_index: float | None
    bullpen_shape_index: float | None
    two_reliever_containment_rate_last10: float | None
    bulk_first_up_rate_last10: float | None
    six_plus_reliever_scramble_rate_last10: float | None
    opp_top6_pressure: float | None
    opp_top6_cold: float | None
    opp_top6_heat: float | None
    opp_top6_whiff: float | None
    opp_form_pressure: float | None
    opp_snapback_pressure: float | None
    current_war: float | None
    current_war_gs: int | None
    prior_war: float | None
    prior_war_gs: int | None

    @property
    def war_delta(self) -> float | None:
        if self.current_war is None or self.prior_war is None:
            return None
        return self.current_war - self.prior_war

    @property
    def tiny_sample_flag(self) -> int:
        starts_flag = 1 if self.starts_sample < 3 else 0
        current_gs_flag = 1 if (self.current_war_gs or 0) < 4 else 0
        return 1 if starts_flag or current_gs_flag else 0

    @property
    def callup_debut_flag(self) -> int:
        return 1 if self.tiny_sample_flag and (self.prior_war_gs or 0) < 3 else 0

    @property
    def bucket_label(self) -> str:
        if self.outs_recorded < 12:
            return "<12"
        if self.outs_recorded < 15:
            return "12-14"
        if self.outs_recorded < 18:
            return "15-17"
        if self.outs_recorded < 21:
            return "18-20"
        return "21+"

    def reaches(self, threshold: int) -> int:
        return 1 if self.outs_recorded >= threshold else 0


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Research starter exit bucket prediction lanes.")
    parser.add_argument("--db", default=str(DB_PATH), help="Warehouse sqlite path.")
    parser.add_argument("--out", default=str(REPORT_PATH), help="Markdown output path.")
    return parser.parse_args()


def safe_avg(values: list[float]) -> float:
    return round(sum(values) / len(values), 3) if values else 0.0


def safe_rate(flags: list[int]) -> float:
    return round(sum(flags) / len(flags), 3) if flags else 0.0


def safe_float(value: object) -> float | None:
    if value in (None, ""):
        return None
    try:
        return float(value)
    except Exception:
        return None


def safe_int(value: object) -> int | None:
    if value in (None, ""):
        return None
    try:
        return int(value)
    except Exception:
        return None


def markdown_table(headers: list[str], rows: list[list[str]]) -> str:
    header_line = "| " + " | ".join(headers) + " |"
    divider_line = "| " + " | ".join("---" for _ in headers) + " |"
    body = "\n".join("| " + " | ".join(str(cell) for cell in row) + " |" for row in rows)
    return "\n".join([header_line, divider_line, body])


def load_hitter_lookup(conn: sqlite3.Connection) -> dict[tuple[str, str], dict[str, float]]:
    grouped: dict[tuple[str, str], list[sqlite3.Row]] = {}
    rows = conn.execute(
        """
        SELECT
          as_of_date,
          team_name,
          player_name,
          batting_order_avg_last5,
          pressure_plate_index,
          cold_streak_index,
          heat_regression_index,
          whiff_rate_last5
        FROM mlb_hitter_state_snapshots
        ORDER BY as_of_date, team_name, batting_order_avg_last5 ASC, player_name ASC
        """
    ).fetchall()
    for row in rows:
        grouped.setdefault((row["as_of_date"], row["team_name"]), []).append(row)

    lookup: dict[tuple[str, str], dict[str, float]] = {}
    for key, player_rows in grouped.items():
        ranked_rows = sorted(
            player_rows,
            key=lambda row: (
                99 if row["batting_order_avg_last5"] is None else float(row["batting_order_avg_last5"]),
                row["player_name"],
            ),
        )
        top_rows = ranked_rows[:6]
        lookup[key] = {
            "top6_pressure": safe_avg([float(row["pressure_plate_index"] or 0.0) for row in top_rows]),
            "top6_cold": safe_avg([float(row["cold_streak_index"] or 0.0) for row in top_rows]),
            "top6_heat": safe_avg([float(row["heat_regression_index"] or 0.0) for row in top_rows]),
            "top6_whiff": safe_avg([float(row["whiff_rate_last5"] or 0.0) for row in top_rows]),
        }
    return lookup


def load_table_lookup(
    conn: sqlite3.Connection,
    table_name: str,
    key_columns: list[str],
    value_columns: list[str],
    where_clause: str = "",
    params: tuple[object, ...] = (),
) -> dict[tuple[object, ...], sqlite3.Row]:
    where_sql = f"WHERE {where_clause}" if where_clause else ""
    sql = f"SELECT {', '.join(key_columns + value_columns)} FROM {table_name} {where_sql}"
    return {
        tuple(row[column] for column in key_columns): row
        for row in conn.execute(sql, params).fetchall()
    }


def load_rows(conn: sqlite3.Connection) -> list[StarterExitRow]:
    hitter_lookup = load_hitter_lookup(conn)
    leash_lookup = load_table_lookup(
        conn,
        "mlb_starter_leash_profiles",
        ["as_of_date", "pitcher_id"],
        [
            "starts_sample",
            "outs_per_start",
            "short_start_rate",
            "five_plus_inning_rate",
            "six_plus_inning_rate",
            "ninety_pitch_rate",
            "leash_volatility",
            "recent_3_outs_delta",
            "recent_3_pitches_delta",
            "leash_score",
        ],
        "window_starts = ?",
        (LEASH_WINDOW,),
    )
    rolling_lookup = load_table_lookup(
        conn,
        "mlb_starting_pitcher_rolling_form",
        ["as_of_date", "pitcher_id"],
        [
            "whip_like",
            "strikeout_to_walk_ratio",
            "quality_start_rate",
            "run_volatility",
            "home_run_burstiness",
            "recent_3_earned_runs_delta",
        ],
        "window_starts = ?",
        (ROLLING_WINDOW,),
    )
    mistake_lookup = load_table_lookup(
        conn,
        "mlb_pitcher_mistake_shape_daily",
        ["as_of_date", "pitcher_id"],
        [
            "first_batter_reach_rate",
            "first_inning_run_allowed_rate",
            "early_clean_start_rate",
            "meltdown_start_rate",
            "walk_burst_start_rate",
            "sixth_inning_damage_rate",
            "post_damage_recovery_rate",
            "command_break_index",
        ],
        "window_starts = ?",
        (MISTAKE_WINDOW,),
    )
    team_state_lookup = load_table_lookup(
        conn,
        "mlb_team_state_snapshots",
        ["as_of_date", "team_name"],
        ["form_pressure_index", "snapback_pressure_index"],
    )
    bullpen_shape_lookup = load_table_lookup(
        conn,
        "mlb_team_bullpen_shape_daily",
        ["as_of_date", "team_name"],
        [
            "bullpen_shape_index",
            "two_reliever_containment_rate_last10",
            "bulk_first_up_rate_last10",
            "six_plus_reliever_scramble_rate_last10",
        ],
    )
    war_lookup = load_table_lookup(
        conn,
        "mlb_pitcher_war_by_season",
        ["season", "pitcher_id"],
        ["war", "games_started"],
    )

    starts = conn.execute(
        """
        SELECT
          game_date,
          game_pk,
          pitcher_id,
          pitcher_name,
          team_name,
          opponent_name,
          outs_recorded,
          pitches_thrown
        FROM mlb_starting_pitcher_game_logs
        WHERE pitcher_id IS NOT NULL
        ORDER BY game_date, game_pk, team_role
        """
    ).fetchall()

    rows: list[StarterExitRow] = []
    for start in starts:
        date = start["game_date"]
        pitcher_id = int(start["pitcher_id"])
        season = int(date[:4])
        leash = leash_lookup.get((date, pitcher_id))
        rolling = rolling_lookup.get((date, pitcher_id))
        mistake = mistake_lookup.get((date, pitcher_id))
        opp_hitter = hitter_lookup.get((date, start["opponent_name"]), {})
        opp_state = team_state_lookup.get((date, start["opponent_name"]))
        bullpen = bullpen_shape_lookup.get((date, start["team_name"]))
        current_war = war_lookup.get((season, pitcher_id))
        prior_war = war_lookup.get((season - 1, pitcher_id))

        if not leash:
            continue

        rows.append(
            StarterExitRow(
                game_date=date,
                game_pk=int(start["game_pk"]),
                pitcher_id=pitcher_id,
                pitcher_name=start["pitcher_name"],
                team_name=start["team_name"],
                opponent_name=start["opponent_name"],
                outs_recorded=int(start["outs_recorded"] or 0),
                pitches_thrown=int(start["pitches_thrown"] or 0),
                leash_score=safe_float(leash["leash_score"]) if leash else None,
                starts_sample=int(leash["starts_sample"] or 0) if leash else 0,
                outs_per_start=safe_float(leash["outs_per_start"]) if leash else None,
                short_start_rate=safe_float(leash["short_start_rate"]) if leash else None,
                five_plus_inning_rate=safe_float(leash["five_plus_inning_rate"]) if leash else None,
                six_plus_inning_rate=safe_float(leash["six_plus_inning_rate"]) if leash else None,
                ninety_pitch_rate=safe_float(leash["ninety_pitch_rate"]) if leash else None,
                leash_volatility=safe_float(leash["leash_volatility"]) if leash else None,
                recent_3_outs_delta=safe_float(leash["recent_3_outs_delta"]) if leash else None,
                recent_3_pitches_delta=safe_float(leash["recent_3_pitches_delta"]) if leash else None,
                whip_like=safe_float(rolling["whip_like"]) if rolling else None,
                strikeout_to_walk_ratio=safe_float(rolling["strikeout_to_walk_ratio"]) if rolling else None,
                quality_start_rate=safe_float(rolling["quality_start_rate"]) if rolling else None,
                run_volatility=safe_float(rolling["run_volatility"]) if rolling else None,
                home_run_burstiness=safe_float(rolling["home_run_burstiness"]) if rolling else None,
                recent_3_earned_runs_delta=safe_float(rolling["recent_3_earned_runs_delta"]) if rolling else None,
                first_batter_reach_rate=safe_float(mistake["first_batter_reach_rate"]) if mistake else None,
                first_inning_run_allowed_rate=safe_float(mistake["first_inning_run_allowed_rate"]) if mistake else None,
                early_clean_start_rate=safe_float(mistake["early_clean_start_rate"]) if mistake else None,
                meltdown_start_rate=safe_float(mistake["meltdown_start_rate"]) if mistake else None,
                walk_burst_start_rate=safe_float(mistake["walk_burst_start_rate"]) if mistake else None,
                sixth_inning_damage_rate=safe_float(mistake["sixth_inning_damage_rate"]) if mistake else None,
                post_damage_recovery_rate=safe_float(mistake["post_damage_recovery_rate"]) if mistake else None,
                command_break_index=safe_float(mistake["command_break_index"]) if mistake else None,
                bullpen_shape_index=safe_float(bullpen["bullpen_shape_index"]) if bullpen else None,
                two_reliever_containment_rate_last10=safe_float(bullpen["two_reliever_containment_rate_last10"]) if bullpen else None,
                bulk_first_up_rate_last10=safe_float(bullpen["bulk_first_up_rate_last10"]) if bullpen else None,
                six_plus_reliever_scramble_rate_last10=safe_float(bullpen["six_plus_reliever_scramble_rate_last10"]) if bullpen else None,
                opp_top6_pressure=safe_float(opp_hitter.get("top6_pressure")),
                opp_top6_cold=safe_float(opp_hitter.get("top6_cold")),
                opp_top6_heat=safe_float(opp_hitter.get("top6_heat")),
                opp_top6_whiff=safe_float(opp_hitter.get("top6_whiff")),
                opp_form_pressure=safe_float(opp_state["form_pressure_index"]) if opp_state else None,
                opp_snapback_pressure=safe_float(opp_state["snapback_pressure_index"]) if opp_state else None,
                current_war=safe_float(current_war["war"]) if current_war else None,
                current_war_gs=safe_int(current_war["games_started"]) if current_war else None,
                prior_war=safe_float(prior_war["war"]) if prior_war else None,
                prior_war_gs=safe_int(prior_war["games_started"]) if prior_war else None,
            )
        )
    return rows


FEATURE_COLUMNS = [
    "leash_score",
    "starts_sample",
    "outs_per_start",
    "short_start_rate",
    "five_plus_inning_rate",
    "six_plus_inning_rate",
    "ninety_pitch_rate",
    "leash_volatility",
    "recent_3_outs_delta",
    "recent_3_pitches_delta",
    "whip_like",
    "strikeout_to_walk_ratio",
    "quality_start_rate",
    "run_volatility",
    "home_run_burstiness",
    "recent_3_earned_runs_delta",
    "first_batter_reach_rate",
    "first_inning_run_allowed_rate",
    "early_clean_start_rate",
    "meltdown_start_rate",
    "walk_burst_start_rate",
    "sixth_inning_damage_rate",
    "post_damage_recovery_rate",
    "command_break_index",
    "bullpen_shape_index",
    "two_reliever_containment_rate_last10",
    "bulk_first_up_rate_last10",
    "six_plus_reliever_scramble_rate_last10",
    "opp_top6_pressure",
    "opp_top6_cold",
    "opp_top6_heat",
    "opp_top6_whiff",
    "opp_form_pressure",
    "opp_snapback_pressure",
    "current_war",
    "current_war_gs",
    "prior_war",
    "prior_war_gs",
]


def time_split_rows(rows: list[StarterExitRow]) -> tuple[list[StarterExitRow], list[StarterExitRow]]:
    unique_dates = sorted({row.game_date for row in rows})
    if len(unique_dates) < 8:
        cutoff_idx = max(1, len(unique_dates) - 2)
    else:
        cutoff_idx = max(5, int(len(unique_dates) * 0.8))
    train_dates = set(unique_dates[:cutoff_idx])
    test_dates = set(unique_dates[cutoff_idx:])
    train = [row for row in rows if row.game_date in train_dates]
    test = [row for row in rows if row.game_date in test_dates]
    return train, test


def bucket_rows(rows: list[StarterExitRow], predicate) -> tuple[int, float, float, float, float]:
    bucket = [row for row in rows if predicate(row)]
    return (
        len(bucket),
        safe_avg([row.outs_recorded for row in bucket]),
        safe_rate([row.reaches(15) for row in bucket]),
        safe_rate([row.reaches(18) for row in bucket]),
        safe_rate([row.reaches(21) for row in bucket]),
    )


def evaluate_threshold_models(rows: list[StarterExitRow]) -> tuple[list[list[str]], dict[int, list[str]]]:
    train_rows, test_rows = time_split_rows(rows)
    model_rows: list[list[str]] = []
    feature_notes: dict[int, list[str]] = {}

    if not train_rows or not test_rows or RandomForestClassifier is None or SimpleImputer is None or brier_score_loss is None:
        return model_rows, feature_notes

    X_train = [[getattr(row, feature) for feature in FEATURE_COLUMNS] for row in train_rows]
    X_test = [[getattr(row, feature) for feature in FEATURE_COLUMNS] for row in test_rows]
    imputer = SimpleImputer(strategy="median")
    X_train_imp = imputer.fit_transform(X_train)
    X_test_imp = imputer.transform(X_test)

    for threshold in THRESHOLDS:
        y_train = [row.reaches(threshold) for row in train_rows]
        y_test = [row.reaches(threshold) for row in test_rows]
        base_rate = safe_rate(y_train)
        if len(set(y_train)) < 2 or len(set(y_test)) < 2:
            model_rows.append(
                [
                    f"`{threshold}+ outs`",
                    str(len(train_rows)),
                    str(len(test_rows)),
                    f"{base_rate:.1%}",
                    "n/a",
                    "n/a",
                    "n/a",
                ]
            )
            continue

        model = RandomForestClassifier(
            n_estimators=400,
            min_samples_leaf=4,
            random_state=7,
            class_weight="balanced_subsample",
        )
        model.fit(X_train_imp, y_train)
        probs = model.predict_proba(X_test_imp)[:, 1]
        preds = [1 if prob >= 0.5 else 0 for prob in probs]
        accuracy = sum(1 for truth, pred in zip(y_test, preds) if truth == pred) / len(y_test)
        baseline_preds = [1 if base_rate >= 0.5 else 0 for _ in y_test]
        baseline_accuracy = sum(1 for truth, pred in zip(y_test, baseline_preds) if truth == pred) / len(y_test)
        brier = brier_score_loss(y_test, probs)
        model_rows.append(
            [
                f"`{threshold}+ outs`",
                str(len(train_rows)),
                str(len(test_rows)),
                f"{base_rate:.1%}",
                f"{baseline_accuracy:.1%}",
                f"{accuracy:.1%}",
                f"{brier:.3f}",
            ]
        )
        ranked = sorted(
            zip(FEATURE_COLUMNS, model.feature_importances_),
            key=lambda pair: pair[1],
            reverse=True,
        )
        feature_notes[threshold] = [
            f"`{name}` `{importance:.3f}`" for name, importance in ranked[:6]
        ]
    return model_rows, feature_notes


def main() -> None:
    args = parse_args()
    conn = sqlite3.connect(args.db)
    conn.row_factory = sqlite3.Row
    rows = load_rows(conn)
    conn.close()

    sample_rows = [
        [label, str(sum(1 for row in rows if row.bucket_label == label)), f"{safe_rate([1 if row.bucket_label == label else 0 for row in rows]):.1%}"]
        for label in ("<12", "12-14", "15-17", "18-20", "21+")
    ]

    leash_bucket_rows = []
    for label, predicate in [
        ("`<45`", lambda row: (row.leash_score or 0.0) < 45),
        ("`45-59`", lambda row: 45 <= (row.leash_score or 0.0) < 60),
        ("`60-74`", lambda row: 60 <= (row.leash_score or 0.0) < 75),
        ("`75+`", lambda row: (row.leash_score or 0.0) >= 75),
    ]:
        count, avg_outs, rate15, rate18, rate21 = bucket_rows(rows, predicate)
        leash_bucket_rows.append([label, str(count), f"{avg_outs:.2f}", f"{rate15:.1%}", f"{rate18:.1%}", f"{rate21:.1%}"])

    tiny_sample_rows = []
    for label, predicate in [
        ("`call-up / debut lane`", lambda row: row.callup_debut_flag == 1),
        ("`tiny sample only`", lambda row: row.tiny_sample_flag == 1 and row.callup_debut_flag == 0),
        ("`established sample`", lambda row: row.tiny_sample_flag == 0),
    ]:
        count, avg_outs, rate15, rate18, rate21 = bucket_rows(rows, predicate)
        tiny_sample_rows.append([label, str(count), f"{avg_outs:.2f}", f"{rate15:.1%}", f"{rate18:.1%}", f"{rate21:.1%}"])

    opponent_pressure_rows = []
    for label, predicate in [
        ("`<45`", lambda row: (row.opp_top6_pressure or 0.0) < 45),
        ("`45-59`", lambda row: 45 <= (row.opp_top6_pressure or 0.0) < 60),
        ("`60-74`", lambda row: 60 <= (row.opp_top6_pressure or 0.0) < 75),
        ("`75+`", lambda row: (row.opp_top6_pressure or 0.0) >= 75),
    ]:
        count, avg_outs, rate15, rate18, rate21 = bucket_rows(rows, predicate)
        opponent_pressure_rows.append([label, str(count), f"{avg_outs:.2f}", f"{rate15:.1%}", f"{rate18:.1%}", f"{rate21:.1%}"])

    bullpen_shape_rows = []
    for label, predicate in [
        ("`<45`", lambda row: (row.bullpen_shape_index or 0.0) < 45),
        ("`45-64`", lambda row: 45 <= (row.bullpen_shape_index or 0.0) < 65),
        ("`65-84`", lambda row: 65 <= (row.bullpen_shape_index or 0.0) < 85),
        ("`85+`", lambda row: (row.bullpen_shape_index or 0.0) >= 85),
    ]:
        count, avg_outs, rate15, rate18, rate21 = bucket_rows(rows, predicate)
        bullpen_shape_rows.append([label, str(count), f"{avg_outs:.2f}", f"{rate15:.1%}", f"{rate18:.1%}", f"{rate21:.1%}"])

    gate_rows = []
    for label, predicate in [
        (
            "`stable hold`",
            lambda row: (row.leash_score or 0.0) >= 70
            and (row.command_break_index or 100.0) < 45
            and (row.opp_top6_pressure or 100.0) < 65,
        ),
        (
            "`early hook danger`",
            lambda row: (row.leash_score or 0.0) < 55
            or (row.short_start_rate or 0.0) >= 0.4
            or (row.command_break_index or 0.0) >= 55
            or row.tiny_sample_flag == 1,
        ),
        (
            "`bulk stretch lane`",
            lambda row: (row.six_plus_inning_rate or 0.0) >= 0.5
            and (row.bullpen_shape_index or 0.0) >= 70,
        ),
        (
            "`quiet opponent leash`",
            lambda row: (row.opp_top6_pressure or 100.0) < 50
            and (row.opp_form_pressure or 100.0) < 50
            and (row.leash_score or 0.0) >= 60,
        ),
    ]:
        count, avg_outs, rate15, rate18, rate21 = bucket_rows(rows, predicate)
        gate_rows.append([label, str(count), f"{avg_outs:.2f}", f"{rate15:.1%}", f"{rate18:.1%}", f"{rate21:.1%}"])

    model_rows, feature_notes = evaluate_threshold_models(rows)
    feature_lines = []
    if feature_notes:
        for threshold in THRESHOLDS:
            notes = feature_notes.get(threshold)
            if not notes:
                continue
            feature_lines.append(f"- `{threshold}+ outs`: " + ", ".join(notes))

    report = f"""# MLB Starter Exit Buckets — May 30, 2026

This is `E27`, the first real research pass for the relief-model rebuild.

Goal:

- predict how far the starter gets before the bullpen matters
- use that as the root input for later bullpen-shape and first-up reliever models

Source tables:

- `mlb_starting_pitcher_game_logs`
- `mlb_starter_leash_profiles`
- `mlb_starting_pitcher_rolling_form`
- `mlb_pitcher_mistake_shape_daily`
- `mlb_team_bullpen_shape_daily`
- `mlb_hitter_state_snapshots`
- `mlb_team_state_snapshots`
- `mlb_pitcher_war_by_season`

Samples:

- modeled starts: `{len(rows)}`

## Actual Starter Exit Bucket Distribution

{markdown_table(["Bucket", "Starts", "Share"], sample_rows)}

## Leash Score Buckets

{markdown_table(["Leash bucket", "Starts", "Avg outs", "15+ outs", "18+ outs", "21+ outs"], leash_bucket_rows)}

## Call-up / Tiny-Sample Context

{markdown_table(["Lane", "Starts", "Avg outs", "15+ outs", "18+ outs", "21+ outs"], tiny_sample_rows)}

## Opponent Top-6 Pressure Buckets

{markdown_table(["Opp pressure", "Starts", "Avg outs", "15+ outs", "18+ outs", "21+ outs"], opponent_pressure_rows)}

## Bullpen Shape Behind The Starter

{markdown_table(["Bullpen shape", "Starts", "Avg outs", "15+ outs", "18+ outs", "21+ outs"], bullpen_shape_rows)}

## Research-Only Heuristic Gates

{markdown_table(["Gate", "Starts", "Avg outs", "15+ outs", "18+ outs", "21+ outs"], gate_rows)}

## Time-Split Threshold Models

{markdown_table(["Threshold", "Train", "Test", "Train base", "Baseline acc", "RF acc", "Brier"], model_rows or [["n/a", "0", "0", "n/a", "n/a", "n/a", "n/a"]])}

## Top Model Features

{chr(10).join(feature_lines) if feature_lines else "- `sklearn` unavailable or sample split too small to score threshold models cleanly."}

## Read

- `Leash score` is the obvious first anchor, but it is not enough alone.
- `Call-up / debut lane` is the early-hook danger case we care about most for bullpen modeling.
- `Opponent top-6 pressure` and `command-break / meltdown` context are important because they explain why two starters with similar season averages exit at very different points.
- `Bullpen shape behind the starter` matters too: if a team is already living in bulk / scramble territory, the manager's starter hook behavior is different.

## What this means for the bullpen rebuild

Use this sequence:

1. turn starter exit into `12 / 15 / 18 / 21+` threshold probabilities
2. feed those probabilities into the team bullpen-shape model
3. only then upgrade the exact first-up reliever model

## Immediate next step

- keep `E27` research-only for now
- if this pass stays useful, the next code step is to export a small `starter exit risk` block into the MLB game payload so the bullpen lane can read:
  - early-hook danger
  - likely bridge point
  - stretch / bulk chance
"""

    Path(args.out).write_text(report)
    print(f"Wrote {args.out}")


if __name__ == "__main__":
    main()
