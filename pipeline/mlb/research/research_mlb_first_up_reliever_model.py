#!/usr/bin/env python3

from __future__ import annotations

import argparse
import json
import sqlite3
from dataclasses import dataclass
from pathlib import Path

try:
    from sklearn.ensemble import RandomForestClassifier
    from sklearn.impute import SimpleImputer
except Exception:  # pragma: no cover
    RandomForestClassifier = None
    SimpleImputer = None

from research_mlb_bullpen_shape_model import build_starter_probability_lookup
from research_mlb_starter_exit_buckets import load_rows as load_starter_rows


ROOT = Path(__file__).resolve().parents[3]
DB_PATH = ROOT / "data-private" / "warehouse" / "sports.db"
REPORT_PATH = ROOT / "development-docs" / "mlb-first-up-reliever-model-053026.md"


@dataclass
class FirstUpCandidateRow:
    as_of_date: str
    team_name: str
    opponent_name: str
    pitcher_id: int
    pitcher_name: str
    actual_first_up_flag: int
    actual_first_up_outs: int
    actual_workload_bucket: str
    likely_role: str
    appearances_last3: int
    innings_last3: float | None
    outs_last3: int | None
    pitches_last3: int | None
    batters_faced_last3: int | None
    days_since_last_appearance: int | None
    worked_yesterday_flag: int
    back_to_back_flag: int
    avg_entry_order: float | None
    avg_outs_per_appearance: float | None
    avg_pitches_per_appearance: float | None
    bridge_score: float | None
    availability_score: float | None
    fatigue_score: float | None
    first_reliever_likelihood: float | None
    recent_first_reliever_count_last5: int
    recent_first_two_count_last5: int
    recent_team_games_sample: int
    bullpen_shape_index: float | None
    relievers_used_avg_last5: float | None
    first_reliever_outs_avg_last5: float | None
    first_reliever_outs_volatility_last10: float | None
    bulk_first_up_rate_last10: float | None
    two_reliever_containment_rate_last10: float | None
    four_plus_reliever_rate_last10: float | None
    six_plus_reliever_scramble_rate_last10: float | None
    starter_prob_12: float | None
    starter_prob_15: float | None
    starter_prob_18: float | None
    starter_prob_21: float | None
    starter_leash_score: float | None
    starter_callup_debut_flag: int
    starter_tiny_sample_flag: int
    starter_command_break_index: float | None
    starter_sixth_inning_damage_rate: float | None

    @property
    def is_bridge(self) -> int:
        return 1 if self.likely_role == "bridge" else 0

    @property
    def is_bulk(self) -> int:
        return 1 if self.likely_role == "bulk" else 0

    @property
    def is_late(self) -> int:
        return 1 if self.likely_role == "late" else 0


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Research first-up reliever model using starter-exit and bullpen-shape context.")
    parser.add_argument("--db", default=str(DB_PATH), help="Warehouse sqlite path.")
    parser.add_argument("--out", default=str(REPORT_PATH), help="Markdown output path.")
    return parser.parse_args()


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
    if not rows:
        rows = [["-"] * len(headers)]
    header_line = "| " + " | ".join(headers) + " |"
    divider_line = "| " + " | ".join("---" for _ in headers) + " |"
    body = "\n".join("| " + " | ".join(str(cell) for cell in row) + " |" for row in rows)
    return "\n".join([header_line, divider_line, body])


def pct(numerator: int, denominator: int) -> float:
    return (numerator / denominator * 100.0) if denominator else 0.0


def workload_bucket(outs: int) -> str:
    if outs <= 3:
        return "1-3 outs"
    if outs <= 5:
        return "4-5 outs"
    return "6+ outs"


def build_actual_first_up_lookup(conn: sqlite3.Connection) -> dict[tuple[str, str], dict[str, object]]:
    rows = conn.execute(
        """
        SELECT
          game_date,
          game_pk,
          team_name,
          opponent_name,
          pitcher_id,
          pitcher_name,
          entry_order,
          outs_recorded
        FROM mlb_pitcher_appearances
        WHERE pitcher_role = 'reliever'
        ORDER BY game_date, game_pk, team_name, entry_order
        """
    ).fetchall()

    grouped: dict[tuple[str, str], list[sqlite3.Row]] = {}
    game_counts: dict[tuple[str, str], set[int]] = {}
    for row in rows:
        key = (row["game_date"], row["team_name"])
        grouped.setdefault(key, []).append(row)
        game_counts.setdefault(key, set()).add(int(row["game_pk"]))

    lookup: dict[tuple[str, str], dict[str, object]] = {}
    for key, appearances in grouped.items():
        if len(game_counts.get(key, set())) != 1:
            continue
        ordered = sorted(appearances, key=lambda row: (row["entry_order"] or 99, row["pitcher_id"] or 0))
        if not ordered:
            continue
        first = ordered[0]
        lookup[key] = {
            "pitcher_id": int(first["pitcher_id"]),
            "pitcher_name": first["pitcher_name"],
            "opponent_name": first["opponent_name"] or "",
            "outs_recorded": int(first["outs_recorded"] or 0),
            "workload_bucket": workload_bucket(int(first["outs_recorded"] or 0)),
        }
    return lookup


def load_rows(conn: sqlite3.Connection) -> list[FirstUpCandidateRow]:
    actual_lookup = build_actual_first_up_lookup(conn)
    starter_lookup = build_starter_probability_lookup(load_starter_rows(conn))
    bullpen_shape_lookup = {
        (row["as_of_date"], row["team_name"]): row
        for row in conn.execute("SELECT * FROM mlb_team_bullpen_shape_daily").fetchall()
    }

    rows: list[FirstUpCandidateRow] = []
    usage_rows = conn.execute("SELECT * FROM mlb_bullpen_usage ORDER BY as_of_date, team_name, pitcher_name").fetchall()
    for row in usage_rows:
        key = (row["as_of_date"], row["team_name"])
        actual = actual_lookup.get(key)
        bullpen_shape = bullpen_shape_lookup.get(key)
        if not actual or not bullpen_shape:
            continue

        raw = {}
        try:
            raw = json.loads(row["raw_json"] or "{}")
        except Exception:
            raw = {}

        starter = None
        # team plays once per day in usable sample; use the first starter row for that team/date
        starter_matches = [value for lookup_key, value in starter_lookup.items() if lookup_key[0] == row["as_of_date"] and lookup_key[2] == row["team_name"]]
        if starter_matches:
            starter = starter_matches[0]

        if not starter:
            continue

        rows.append(
            FirstUpCandidateRow(
                as_of_date=row["as_of_date"],
                team_name=row["team_name"],
                opponent_name=actual.get("opponent_name") or "",
                pitcher_id=int(row["pitcher_id"]),
                pitcher_name=row["pitcher_name"],
                actual_first_up_flag=1 if int(row["pitcher_id"]) == int(actual["pitcher_id"]) else 0,
                actual_first_up_outs=int(actual["outs_recorded"]),
                actual_workload_bucket=str(actual["workload_bucket"]),
                likely_role=row["likely_role"] or "",
                appearances_last3=int(row["appearances_last3"] or 0),
                innings_last3=safe_float(row["innings_last3"]),
                outs_last3=safe_int(row["outs_last3"]),
                pitches_last3=safe_int(row["pitches_last3"]),
                batters_faced_last3=safe_int(row["batters_faced_last3"]),
                days_since_last_appearance=safe_int(row["days_since_last_appearance"]),
                worked_yesterday_flag=int(row["worked_yesterday_flag"] or 0),
                back_to_back_flag=int(row["back_to_back_flag"] or 0),
                avg_entry_order=safe_float(row["avg_entry_order"]),
                avg_outs_per_appearance=safe_float(row["avg_outs_per_appearance"]),
                avg_pitches_per_appearance=safe_float(row["avg_pitches_per_appearance"]),
                bridge_score=safe_float(row["bridge_score"]),
                availability_score=safe_float(row["availability_score"]),
                fatigue_score=safe_float(row["fatigue_score"]),
                first_reliever_likelihood=safe_float(row["first_reliever_likelihood"]),
                recent_first_reliever_count_last5=safe_int(raw.get("recentFirstRelieverCountLast5Games")) or 0,
                recent_first_two_count_last5=safe_int(raw.get("recentFirstTwoCountLast5Games")) or 0,
                recent_team_games_sample=safe_int(raw.get("recentTeamGamesSample")) or 0,
                bullpen_shape_index=safe_float(bullpen_shape["bullpen_shape_index"]),
                relievers_used_avg_last5=safe_float(bullpen_shape["relievers_used_avg_last5"]),
                first_reliever_outs_avg_last5=safe_float(bullpen_shape["first_reliever_outs_avg_last5"]),
                first_reliever_outs_volatility_last10=safe_float(bullpen_shape["first_reliever_outs_volatility_last10"]),
                bulk_first_up_rate_last10=safe_float(bullpen_shape["bulk_first_up_rate_last10"]),
                two_reliever_containment_rate_last10=safe_float(bullpen_shape["two_reliever_containment_rate_last10"]),
                four_plus_reliever_rate_last10=safe_float(bullpen_shape["four_plus_reliever_rate_last10"]),
                six_plus_reliever_scramble_rate_last10=safe_float(bullpen_shape["six_plus_reliever_scramble_rate_last10"]),
                starter_prob_12=safe_float(starter.get("starter_prob_12")),
                starter_prob_15=safe_float(starter.get("starter_prob_15")),
                starter_prob_18=safe_float(starter.get("starter_prob_18")),
                starter_prob_21=safe_float(starter.get("starter_prob_21")),
                starter_leash_score=safe_float(starter.get("starter_leash_score")),
                starter_callup_debut_flag=int(starter.get("starter_callup_debut_flag") or 0),
                starter_tiny_sample_flag=int(starter.get("starter_tiny_sample_flag") or 0),
                starter_command_break_index=safe_float(starter.get("starter_command_break_index")),
                starter_sixth_inning_damage_rate=safe_float(starter.get("starter_sixth_inning_damage_rate")),
            )
        )
    return rows


BASE_FEATURE_COLUMNS = [
    "appearances_last3",
    "innings_last3",
    "outs_last3",
    "pitches_last3",
    "batters_faced_last3",
    "days_since_last_appearance",
    "worked_yesterday_flag",
    "back_to_back_flag",
    "avg_entry_order",
    "avg_outs_per_appearance",
    "avg_pitches_per_appearance",
    "bridge_score",
    "availability_score",
    "fatigue_score",
    "first_reliever_likelihood",
    "recent_first_reliever_count_last5",
    "recent_first_two_count_last5",
    "recent_team_games_sample",
    "is_bridge",
    "is_bulk",
    "is_late",
]

AUGMENT_COLUMNS = [
    "bullpen_shape_index",
    "relievers_used_avg_last5",
    "first_reliever_outs_avg_last5",
    "first_reliever_outs_volatility_last10",
    "bulk_first_up_rate_last10",
    "two_reliever_containment_rate_last10",
    "four_plus_reliever_rate_last10",
    "six_plus_reliever_scramble_rate_last10",
    "starter_prob_12",
    "starter_prob_15",
    "starter_prob_18",
    "starter_prob_21",
    "starter_leash_score",
    "starter_callup_debut_flag",
    "starter_tiny_sample_flag",
    "starter_command_break_index",
    "starter_sixth_inning_damage_rate",
]


def split_dates(rows: list[FirstUpCandidateRow]) -> tuple[set[str], set[str]]:
    unique_dates = sorted({row.as_of_date for row in rows})
    if len(unique_dates) < 8:
        cutoff_idx = max(1, len(unique_dates) - 2)
    else:
        cutoff_idx = max(5, int(len(unique_dates) * 0.8))
    return set(unique_dates[:cutoff_idx]), set(unique_dates[cutoff_idx:])


def rank_groups(rows: list[FirstUpCandidateRow], score_fn) -> list[list[FirstUpCandidateRow]]:
    grouped: dict[tuple[str, str], list[FirstUpCandidateRow]] = {}
    for row in rows:
        grouped.setdefault((row.as_of_date, row.team_name), []).append(row)
    ranked_groups = []
    for key in sorted(grouped):
        bucket = grouped[key]
        ranked_groups.append(sorted(bucket, key=score_fn, reverse=True))
    return ranked_groups


def summarize_ranked_groups(groups: list[list[FirstUpCandidateRow]]) -> dict[str, float]:
    total = len(groups)
    exact = 0
    top2 = 0
    top3 = 0
    workload_counters: dict[str, dict[str, int]] = {
        "1-3 outs": {"samples": 0, "exact": 0, "top2": 0},
        "4-5 outs": {"samples": 0, "exact": 0, "top2": 0},
        "6+ outs": {"samples": 0, "exact": 0, "top2": 0},
    }
    for group in groups:
        actual_bucket = group[0].actual_workload_bucket
        workload_counters[actual_bucket]["samples"] += 1
        flags = [row.actual_first_up_flag for row in group]
        if flags and flags[0] == 1:
            exact += 1
            workload_counters[actual_bucket]["exact"] += 1
        if any(row.actual_first_up_flag for row in group[:2]):
            top2 += 1
            workload_counters[actual_bucket]["top2"] += 1
        if any(row.actual_first_up_flag for row in group[:3]):
            top3 += 1
    return {
        "samples": total,
        "exact_rate": pct(exact, total),
        "top2_rate": pct(top2, total),
        "top3_rate": pct(top3, total),
        "workload": workload_counters,
    }


def train_augmented_model(
    train_rows: list[FirstUpCandidateRow],
    test_rows: list[FirstUpCandidateRow],
) -> tuple[list[float], list[str]]:
    if RandomForestClassifier is None or SimpleImputer is None:
        return [0.0] * len(test_rows), []

    feature_columns = BASE_FEATURE_COLUMNS + AUGMENT_COLUMNS
    X_train = [[getattr(row, feature) for feature in feature_columns] for row in train_rows]
    y_train = [row.actual_first_up_flag for row in train_rows]
    X_test = [[getattr(row, feature) for feature in feature_columns] for row in test_rows]
    imputer = SimpleImputer(strategy="median")
    X_train_imp = imputer.fit_transform(X_train)
    X_test_imp = imputer.transform(X_test)

    model = RandomForestClassifier(
        n_estimators=500,
        min_samples_leaf=3,
        random_state=29,
        class_weight="balanced_subsample",
    )
    model.fit(X_train_imp, y_train)
    probs = model.predict_proba(X_test_imp)[:, 1].tolist()
    ranked = sorted(zip(feature_columns, model.feature_importances_), key=lambda pair: pair[1], reverse=True)[:10]
    feature_lines = [f"`{name}` `{importance:.3f}`" for name, importance in ranked]
    return probs, feature_lines


def workload_rows(summary: dict[str, float]) -> list[list[str]]:
    rows: list[list[str]] = []
    for label in ("1-3 outs", "4-5 outs", "6+ outs"):
        bucket = summary["workload"][label]
        samples = bucket["samples"]
        rows.append(
            [
                label,
                str(samples),
                f"{pct(bucket['exact'], samples):.1f}%",
                f"{pct(bucket['top2'], samples):.1f}%",
            ]
        )
    return rows


def main() -> None:
    args = parse_args()
    conn = sqlite3.connect(args.db)
    conn.row_factory = sqlite3.Row
    rows = load_rows(conn)
    conn.close()

    train_dates, test_dates = split_dates(rows)
    train_rows = [row for row in rows if row.as_of_date in train_dates]
    test_rows = [row for row in rows if row.as_of_date in test_dates]

    baseline_groups = rank_groups(test_rows, lambda row: ((row.first_reliever_likelihood or 0.0), (row.availability_score or 0.0), (row.bridge_score or 0.0)))
    baseline_summary = summarize_ranked_groups(baseline_groups)

    probs, feature_lines = train_augmented_model(train_rows, test_rows)
    scored_test_rows = list(zip(test_rows, probs))
    grouped: dict[tuple[str, str], list[tuple[FirstUpCandidateRow, float]]] = {}
    for row, prob in scored_test_rows:
        grouped.setdefault((row.as_of_date, row.team_name), []).append((row, prob))
    augmented_groups: list[list[FirstUpCandidateRow]] = []
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
        augmented_groups.append([row for row, _ in bucket])
    augmented_summary = summarize_ranked_groups(augmented_groups)

    report = f"""# MLB First-Up Reliever Model — May 30, 2026

This is `E29`, the first rebuilt first-up reliever model using:

- bullpen shape state
- starter exit probabilities
- reliever rest / role / availability

Samples:

- candidate rows: `{len(rows)}`
- team-side games: `{len({(row.as_of_date, row.team_name) for row in rows})}`
- train candidate rows: `{len(train_rows)}`
- test candidate rows: `{len(test_rows)}`
- test team-side games: `{baseline_summary['samples']}`

## Baseline vs Augmented Ranking

{markdown_table(
    ["Model", "Exact 1st", "Top-2", "Top-3"],
    [
        ["`current likelihood stack`", f"{baseline_summary['exact_rate']:.1f}%", f"{baseline_summary['top2_rate']:.1f}%", f"{baseline_summary['top3_rate']:.1f}%"],
        ["`shape + starter exit + usage`", f"{augmented_summary['exact_rate']:.1f}%", f"{augmented_summary['top2_rate']:.1f}%", f"{augmented_summary['top3_rate']:.1f}%"],
    ],
)}

## Workload Buckets: Baseline

{markdown_table(["Actual first-up workload", "Samples", "Exact 1st", "Top-2"], workload_rows(baseline_summary))}

## Workload Buckets: Augmented

{markdown_table(["Actual first-up workload", "Samples", "Exact 1st", "Top-2"], workload_rows(augmented_summary))}

## Top Augmented Features

{chr(10).join(f"- {line}" for line in feature_lines) if feature_lines else "- `sklearn` unavailable, so no feature ranking was produced."}

## Read

- The baseline is the current reliever-usage stack: first-reliever likelihood with availability and bridge score tie-breaks.
- The augmented model tests whether bullpen-shape and starter-exit context improve the exact first-up call.
- The most important thing is not just exact hit rate; it is whether the model gets less blind on the `6+ outs` bulk first-up cases that the old bridge logic missed constantly.
"""
    Path(args.out).write_text(report)
    print(f"Wrote {args.out}")


if __name__ == "__main__":
    main()
