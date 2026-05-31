#!/usr/bin/env python3

from __future__ import annotations

import argparse
import sqlite3
from collections import Counter, defaultdict, deque
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
    markdown_table,
    pct,
    rank_groups,
    split_dates,
    summarize_ranked_groups,
    workload_rows,
    load_rows as load_first_up_rows,
)


ROOT = Path(__file__).resolve().parents[3]
DB_PATH = ROOT / "data-private" / "warehouse" / "sports.db"
REPORT_PATH = ROOT / "development-docs" / "mlb" / "research" / "mlb-first-up-reliever-arsenal-053026.md"

FASTBALL_CODES = {"FA", "FC", "FF", "FT", "SI"}
BREAKING_CODES = {"CS", "CU", "KC", "KN", "SC", "SL", "SV"}
OFFSPEED_CODES = {"CH", "EP", "FO", "FS"}


@dataclass
class ReliefAppearancePitchMix:
    pitcher_id: int
    game_date: str
    game_pk: int
    pitch_counts: Counter[str]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Research reliever arsenal concentration as a first-up reliever model add-on.")
    parser.add_argument("--db", default=str(DB_PATH), help="Warehouse sqlite path.")
    parser.add_argument("--out", default=str(REPORT_PATH), help="Markdown output path.")
    return parser.parse_args()


def safe_divide(numerator: float, denominator: float) -> float:
    return numerator / denominator if denominator else 0.0


def load_relief_appearances(conn: sqlite3.Connection) -> dict[int, list[ReliefAppearancePitchMix]]:
    rows = conn.execute(
        """
        SELECT
          pa.pitcher_id,
          pa.game_date,
          pa.game_pk,
          pe.pitch_type_code,
          COUNT(*) AS pitch_count
        FROM mlb_pitcher_appearances pa
        JOIN mlb_pitch_events pe
          ON pe.game_pk = pa.game_pk
         AND pe.pitcher_id = pa.pitcher_id
        WHERE pa.pitcher_role = 'reliever'
          AND pe.is_pitch = 1
          AND pe.pitch_type_code IS NOT NULL
          AND pe.pitch_type_code != ''
        GROUP BY pa.pitcher_id, pa.game_date, pa.game_pk, pe.pitch_type_code
        ORDER BY pa.pitcher_id, pa.game_date, pa.game_pk
        """
    ).fetchall()

    by_pitcher_game: dict[tuple[int, str, int], Counter[str]] = defaultdict(Counter)
    for row in rows:
        key = (int(row["pitcher_id"]), row["game_date"], int(row["game_pk"]))
        by_pitcher_game[key][row["pitch_type_code"]] += int(row["pitch_count"] or 0)

    grouped: dict[int, list[ReliefAppearancePitchMix]] = defaultdict(list)
    for (pitcher_id, game_date, game_pk), pitch_counts in sorted(by_pitcher_game.items(), key=lambda item: (item[0][0], item[0][1], item[0][2])):
        grouped[pitcher_id].append(
            ReliefAppearancePitchMix(
                pitcher_id=pitcher_id,
                game_date=game_date,
                game_pk=game_pk,
                pitch_counts=pitch_counts,
            )
        )
    return grouped


def summarize_window(appearances: list[ReliefAppearancePitchMix]) -> dict[str, float]:
    total_counts: Counter[str] = Counter()
    for appearance in appearances:
        total_counts.update(appearance.pitch_counts)

    total_pitches = float(sum(total_counts.values()))
    if total_pitches <= 0:
        return {
            "sample": float(len(appearances)),
            "primary_share": 0.0,
            "secondary_share": 0.0,
            "tertiary_share": 0.0,
            "top2_share": 0.0,
            "pitch_type_count": 0.0,
            "fastball_share": 0.0,
            "breaking_share": 0.0,
            "offspeed_share": 0.0,
            "concentration_hhi": 0.0,
        }

    ordered = sorted(total_counts.values(), reverse=True)
    shares = [count / total_pitches for count in ordered]
    primary_share = shares[0] if shares else 0.0
    secondary_share = shares[1] if len(shares) > 1 else 0.0
    tertiary_share = shares[2] if len(shares) > 2 else 0.0
    top2_share = primary_share + secondary_share

    fastball_count = sum(count for code, count in total_counts.items() if code in FASTBALL_CODES)
    breaking_count = sum(count for code, count in total_counts.items() if code in BREAKING_CODES)
    offspeed_count = sum(count for code, count in total_counts.items() if code in OFFSPEED_CODES)
    concentration_hhi = sum((count / total_pitches) ** 2 for count in total_counts.values())

    return {
        "sample": float(len(appearances)),
        "primary_share": primary_share,
        "secondary_share": secondary_share,
        "tertiary_share": tertiary_share,
        "top2_share": top2_share,
        "pitch_type_count": float(len(total_counts)),
        "fastball_share": fastball_count / total_pitches,
        "breaking_share": breaking_count / total_pitches,
        "offspeed_share": offspeed_count / total_pitches,
        "concentration_hhi": concentration_hhi,
    }


def build_arsenal_lookup(rows, appearances_by_pitcher: dict[int, list[ReliefAppearancePitchMix]]) -> dict[tuple[str, int], dict[str, float]]:
    dates_by_pitcher: dict[int, list[str]] = defaultdict(list)
    for row in rows:
        dates_by_pitcher[row.pitcher_id].append(row.as_of_date)

    lookup: dict[tuple[str, int], dict[str, float]] = {}
    for pitcher_id, dates in dates_by_pitcher.items():
        unique_dates = sorted(set(dates))
        appearances = sorted(appearances_by_pitcher.get(pitcher_id, []), key=lambda appearance: (appearance.game_date, appearance.game_pk))
        recent = deque(maxlen=30)
        app_idx = 0
        for as_of_date in unique_dates:
            while app_idx < len(appearances) and appearances[app_idx].game_date < as_of_date:
                recent.append(appearances[app_idx])
                app_idx += 1

            recent_list = list(recent)
            last15 = recent_list[-15:]
            last30 = recent_list[-30:]
            summary15 = summarize_window(last15)
            summary30 = summarize_window(last30)
            lookup[(as_of_date, pitcher_id)] = {
                "arsenal_sample_last15": summary15["sample"],
                "arsenal_primary_share_last15": summary15["primary_share"],
                "arsenal_secondary_share_last15": summary15["secondary_share"],
                "arsenal_tertiary_share_last15": summary15["tertiary_share"],
                "arsenal_top2_share_last15": summary15["top2_share"],
                "arsenal_pitch_type_count_last15": summary15["pitch_type_count"],
                "arsenal_fastball_share_last15": summary15["fastball_share"],
                "arsenal_breaking_share_last15": summary15["breaking_share"],
                "arsenal_offspeed_share_last15": summary15["offspeed_share"],
                "arsenal_concentration_hhi_last15": summary15["concentration_hhi"],
                "arsenal_sample_last30": summary30["sample"],
                "arsenal_primary_share_last30": summary30["primary_share"],
                "arsenal_top2_share_last30": summary30["top2_share"],
                "arsenal_pitch_type_count_last30": summary30["pitch_type_count"],
                "arsenal_fastball_share_last30": summary30["fastball_share"],
                "arsenal_breaking_share_last30": summary30["breaking_share"],
                "arsenal_offspeed_share_last30": summary30["offspeed_share"],
                "arsenal_concentration_hhi_last30": summary30["concentration_hhi"],
                "arsenal_top2_share_delta_15_30": summary15["top2_share"] - summary30["top2_share"],
                "arsenal_fastball_delta_15_30": summary15["fastball_share"] - summary30["fastball_share"],
                "arsenal_breaking_delta_15_30": summary15["breaking_share"] - summary30["breaking_share"],
            }
    return lookup


ARSENAL_COLUMNS = [
    "arsenal_sample_last15",
    "arsenal_primary_share_last15",
    "arsenal_secondary_share_last15",
    "arsenal_tertiary_share_last15",
    "arsenal_top2_share_last15",
    "arsenal_pitch_type_count_last15",
    "arsenal_fastball_share_last15",
    "arsenal_breaking_share_last15",
    "arsenal_offspeed_share_last15",
    "arsenal_concentration_hhi_last15",
    "arsenal_sample_last30",
    "arsenal_primary_share_last30",
    "arsenal_top2_share_last30",
    "arsenal_pitch_type_count_last30",
    "arsenal_fastball_share_last30",
    "arsenal_breaking_share_last30",
    "arsenal_offspeed_share_last30",
    "arsenal_concentration_hhi_last30",
    "arsenal_top2_share_delta_15_30",
    "arsenal_fastball_delta_15_30",
    "arsenal_breaking_delta_15_30",
]


def train_candidate_model(train_rows, test_rows, arsenal_lookup: dict[tuple[str, int], dict[str, float]], feature_columns: list[str]) -> tuple[list[float], list[str]]:
    if RandomForestClassifier is None or SimpleImputer is None:
        return [0.0] * len(test_rows), []

    def build_vector(row) -> list[float | int | None]:
        arsenal = arsenal_lookup.get((row.as_of_date, row.pitcher_id), {})
        vector: list[float | int | None] = []
        for feature in feature_columns:
            if feature in arsenal:
                vector.append(arsenal.get(feature))
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
        n_estimators=600,
        min_samples_leaf=3,
        random_state=30,
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


def workload_profile_rows(rows, arsenal_lookup: dict[tuple[str, int], dict[str, float]]) -> list[list[str]]:
    grouped: dict[str, dict[str, float]] = {
        "1-3 outs": {"samples": 0.0, "top2_share": 0.0, "pitch_count": 0.0, "fastball_share": 0.0, "hhi": 0.0},
        "4-5 outs": {"samples": 0.0, "top2_share": 0.0, "pitch_count": 0.0, "fastball_share": 0.0, "hhi": 0.0},
        "6+ outs": {"samples": 0.0, "top2_share": 0.0, "pitch_count": 0.0, "fastball_share": 0.0, "hhi": 0.0},
    }
    for row in rows:
        if row.actual_first_up_flag != 1:
            continue
        arsenal = arsenal_lookup.get((row.as_of_date, row.pitcher_id), {})
        bucket = grouped[row.actual_workload_bucket]
        bucket["samples"] += 1.0
        bucket["top2_share"] += arsenal.get("arsenal_top2_share_last15", 0.0)
        bucket["pitch_count"] += arsenal.get("arsenal_pitch_type_count_last15", 0.0)
        bucket["fastball_share"] += arsenal.get("arsenal_fastball_share_last15", 0.0)
        bucket["hhi"] += arsenal.get("arsenal_concentration_hhi_last15", 0.0)

    table_rows: list[list[str]] = []
    for label in ("1-3 outs", "4-5 outs", "6+ outs"):
        bucket = grouped[label]
        samples = int(bucket["samples"])
        table_rows.append(
            [
                label,
                str(samples),
                f"{safe_divide(bucket['top2_share'], bucket['samples']):.3f}",
                f"{safe_divide(bucket['pitch_count'], bucket['samples']):.2f}",
                f"{safe_divide(bucket['fastball_share'], bucket['samples']):.3f}",
                f"{safe_divide(bucket['hhi'], bucket['samples']):.3f}",
            ]
        )
    return table_rows


def main() -> None:
    args = parse_args()
    conn = sqlite3.connect(args.db)
    conn.row_factory = sqlite3.Row
    rows = load_first_up_rows(conn)
    appearances_by_pitcher = load_relief_appearances(conn)
    conn.close()

    arsenal_lookup = build_arsenal_lookup(rows, appearances_by_pitcher)
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
    e29_probs, _ = train_candidate_model(train_rows, test_rows, arsenal_lookup, e29_columns)
    e29_summary = summarize_scored_groups(test_rows, e29_probs)

    e30_columns = e29_columns + ARSENAL_COLUMNS
    e30_probs, feature_lines = train_candidate_model(train_rows, test_rows, arsenal_lookup, e30_columns)
    e30_summary = summarize_scored_groups(test_rows, e30_probs)

    report = f"""# MLB First-Up Reliever Arsenal Concentration — May 30, 2026

This is `E30`, the next bullpen-model pass after `E29`.

Goal:

- add reliever arsenal concentration from local `mlb_pitch_events`
- test whether pitch-mix shape improves first-up reliever identification
- learn whether bulk arms separate from short bridge arms by arsenal profile

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
        ["`E30: E29 + arsenal concentration`", f"{e30_summary['exact_rate']:.1f}%", f"{e30_summary['top2_rate']:.1f}%", f"{e30_summary['top3_rate']:.1f}%"],
    ],
)}

## Workload Buckets: E29

{markdown_table(["Actual first-up workload", "Samples", "Exact 1st", "Top-2"], workload_rows(e29_summary))}

## Workload Buckets: E30

{markdown_table(["Actual first-up workload", "Samples", "Exact 1st", "Top-2"], workload_rows(e30_summary))}

## Actual First-Up Arsenal Profile

{markdown_table(
    ["Actual first-up workload", "Samples", "Avg top-2 share L15", "Avg pitch types L15", "Avg fastball share L15", "Avg concentration HHI L15"],
    workload_profile_rows(rows, arsenal_lookup),
)}

## Top E30 Features

{chr(10).join(f"- {line}" for line in feature_lines) if feature_lines else "- `sklearn` unavailable, so no feature ranking was produced."}

## Read

- `E30` tests whether local pitch-mix concentration gives the model more separation inside the same bullpen shape / availability bucket.
- If it helps mostly on `Top-2` or the `6+ outs` lane, that still matters: it means arsenal shape is helping us identify the right reliever class even if exact-name accuracy stays hard.
- This pass is intentionally local-only. It does **not** yet use Savant contact-quality-allowed data by pitch type; that belongs in the next relief-quality overlay, not this concentration-only pass.
"""
    Path(args.out).write_text(report)
    print(f"Wrote {args.out}")


if __name__ == "__main__":
    main()
