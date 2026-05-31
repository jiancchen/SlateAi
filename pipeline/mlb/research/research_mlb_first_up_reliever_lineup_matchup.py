#!/usr/bin/env python3

from __future__ import annotations

import argparse
import sqlite3
from collections import Counter, defaultdict
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
from research_mlb_first_up_reliever_quality import QUALITY_COLUMNS, build_quality_lookup, load_quality_appearances


ROOT = Path(__file__).resolve().parents[3]
DB_PATH = ROOT / "data-private" / "warehouse" / "sports.db"
REPORT_PATH = ROOT / "development-docs" / "mlb" / "research" / "mlb-first-up-reliever-lineup-matchup-053026.md"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Research lineup-matchup interaction for first-up reliever prediction.")
    parser.add_argument("--db", default=str(DB_PATH), help="Warehouse sqlite path.")
    parser.add_argument("--out", default=str(REPORT_PATH), help="Markdown output path.")
    parser.add_argument("--experiment-label", default="E32", help="Experiment label for the markdown report.")
    parser.add_argument(
        "--title",
        default="MLB First-Up Reliever Lineup-Matchup Overlay — May 30, 2026",
        help="Markdown report title.",
    )
    parser.add_argument("--conversion-window", type=int, default=5, help="Window from mlb_lineup_conversion_shape_daily.")
    parser.add_argument("--dependency-window", type=int, default=5, help="Window from mlb_lineup_dependency_profiles.")
    return parser.parse_args()


def safe_divide(numerator: float, denominator: float) -> float:
    return numerator / denominator if denominator else 0.0


def row_value(row: sqlite3.Row | None, key: str) -> float | None:
    if row is None:
        return None
    value = row[key]
    return float(value) if value is not None else None


def load_handedness_maps(conn: sqlite3.Connection) -> tuple[dict[int, str], dict[int, str]]:
    pitcher_rows = conn.execute(
        """
        SELECT pitcher_id AS player_id, pitch_hand AS handedness, COUNT(*) AS sample_count
        FROM mlb_plate_appearances
        WHERE pitcher_id IS NOT NULL
          AND pitch_hand IN ('L', 'R')
        GROUP BY pitcher_id, pitch_hand
        """
    ).fetchall()
    batter_rows = conn.execute(
        """
        SELECT batter_id AS player_id, batter_side AS handedness, COUNT(*) AS sample_count
        FROM mlb_plate_appearances
        WHERE batter_id IS NOT NULL
          AND batter_side IN ('L', 'R')
        GROUP BY batter_id, batter_side
        """
    ).fetchall()

    pitcher_map: dict[int, tuple[str, int]] = {}
    for row in pitcher_rows:
        player_id = int(row["player_id"])
        handedness = row["handedness"]
        sample_count = int(row["sample_count"] or 0)
        current = pitcher_map.get(player_id)
        if current is None or sample_count > current[1]:
            pitcher_map[player_id] = (handedness, sample_count)

    batter_map: dict[int, tuple[str, int]] = {}
    for row in batter_rows:
        player_id = int(row["player_id"])
        handedness = row["handedness"]
        sample_count = int(row["sample_count"] or 0)
        current = batter_map.get(player_id)
        if current is None or sample_count > current[1]:
            batter_map[player_id] = (handedness, sample_count)

    return {player_id: handedness for player_id, (handedness, _) in pitcher_map.items()}, {
        player_id: handedness for player_id, (handedness, _) in batter_map.items()
    }


def load_team_conversion_lookup(conn: sqlite3.Connection, window_games: int) -> dict[tuple[str, str], sqlite3.Row]:
    rows = conn.execute(
        """
        SELECT *
        FROM mlb_lineup_conversion_shape_daily
        WHERE window_games = ?
        """
    , (window_games,)).fetchall()
    return {(row["as_of_date"], row["team_name"]): row for row in rows}


def load_dependency_lookup(conn: sqlite3.Connection, window_games: int) -> dict[tuple[str, str], sqlite3.Row]:
    rows = conn.execute(
        """
        SELECT *
        FROM mlb_lineup_dependency_profiles
        WHERE window_games = ?
        """
    , (window_games,)).fetchall()
    return {(row["as_of_date"], row["team_name"]): row for row in rows}


def load_lineup_rows(conn: sqlite3.Connection) -> list[sqlite3.Row]:
    return conn.execute(
        """
        SELECT
          game_date,
          team_name,
          opponent_name,
          player_id,
          batting_order
        FROM mlb_player_game_batting
        WHERE batting_order IS NOT NULL
          AND batting_order BETWEEN 1 AND 9
        ORDER BY game_date, team_name, batting_order
        """
    ).fetchall()


def load_hitter_snapshot_lookup(conn: sqlite3.Connection) -> dict[tuple[str, int], sqlite3.Row]:
    rows = conn.execute("SELECT * FROM mlb_hitter_state_snapshots").fetchall()
    return {(row["as_of_date"], int(row["player_id"])): row for row in rows}


def load_statcast_lookup(conn: sqlite3.Connection) -> dict[tuple[str, int], sqlite3.Row]:
    rows = conn.execute("SELECT * FROM mlb_hitter_statcast_trend_snapshots").fetchall()
    return {(row["as_of_date"], int(row["player_id"])): row for row in rows}


def build_lineup_lookup(
    conn: sqlite3.Connection,
    conversion_window: int = 5,
    dependency_window: int = 5,
) -> dict[tuple[str, str], dict[str, float]]:
    pitcher_hand_map, batter_side_map = load_handedness_maps(conn)
    _ = pitcher_hand_map  # kept for symmetry and possible future use
    conversion_lookup = load_team_conversion_lookup(conn, conversion_window)
    dependency_lookup = load_dependency_lookup(conn, dependency_window)
    hitter_lookup = load_hitter_snapshot_lookup(conn)
    statcast_lookup = load_statcast_lookup(conn)
    lineup_rows = load_lineup_rows(conn)

    grouped: dict[tuple[str, str], list[sqlite3.Row]] = defaultdict(list)
    for row in lineup_rows:
        grouped[(row["game_date"], row["team_name"])].append(row)

    lineup_lookup: dict[tuple[str, str], dict[str, float]] = {}
    for key, rows in grouped.items():
        as_of_date, team_name = key
        ordered = sorted(rows, key=lambda row: int(row["batting_order"] or 99))
        top3 = ordered[:3]
        top6 = ordered[:6]
        top9 = ordered[:9]
        conversion = conversion_lookup.get(key)
        dependency = dependency_lookup.get(key)

        def batter_side(player_id: int) -> str | None:
            return batter_side_map.get(player_id)

        def hitter_row(player_id: int):
            return hitter_lookup.get((as_of_date, player_id))

        def statcast_row(player_id: int):
            return statcast_lookup.get((as_of_date, player_id))

        def avg_metric(players: list[sqlite3.Row], fn) -> float:
            values = [fn(player) for player in players]
            values = [value for value in values if value is not None]
            return sum(values) / len(values) if values else 0.0

        top3_left = sum(1 for row in top3 if batter_side(int(row["player_id"])) == "L")
        top3_right = sum(1 for row in top3 if batter_side(int(row["player_id"])) == "R")
        top6_left = sum(1 for row in top6 if batter_side(int(row["player_id"])) == "L")
        top6_right = sum(1 for row in top6 if batter_side(int(row["player_id"])) == "R")

        lineup_lookup[key] = {
            "lineup_sample_size": float(len(top9)),
            "lineup_top3_left_count": float(top3_left),
            "lineup_top3_right_count": float(top3_right),
            "lineup_top6_left_count": float(top6_left),
            "lineup_top6_right_count": float(top6_right),
            "lineup_top3_pressure_avg": avg_metric(top3, lambda player: row_value(hitter_row(int(player["player_id"])), "pressure_plate_index")),
            "lineup_top6_pressure_avg": avg_metric(top6, lambda player: row_value(hitter_row(int(player["player_id"])), "pressure_plate_index")),
            "lineup_top6_whiff_avg": avg_metric(top6, lambda player: row_value(hitter_row(int(player["player_id"])), "whiff_rate_last5")),
            "lineup_top6_walk_avg": avg_metric(top6, lambda player: row_value(hitter_row(int(player["player_id"])), "walk_rate_last5")),
            "lineup_top6_tb_per_pa_avg": avg_metric(top6, lambda player: row_value(hitter_row(int(player["player_id"])), "total_bases_per_pa_last5")),
            "lineup_top6_xwoba_avg": avg_metric(top6, lambda player: row_value(statcast_row(int(player["player_id"])), "rolling_7_xwoba")),
            "lineup_top6_xslg_avg": avg_metric(top6, lambda player: row_value(statcast_row(int(player["player_id"])), "rolling_7_xslg")),
            "lineup_top6_hard_hit_avg": avg_metric(top6, lambda player: row_value(statcast_row(int(player["player_id"])), "rolling_7_hard_hit_pct")),
            "lineup_conversion_index_last5": float(conversion["lineup_conversion_index"]) if conversion and conversion["lineup_conversion_index"] is not None else 0.0,
            "lineup_dead_bat_traffic_rate_last5": float(conversion["dead_bat_traffic_rate"]) if conversion and conversion["dead_bat_traffic_rate"] is not None else 0.0,
            "lineup_quiet_first5_rate_last5": float(conversion["quiet_first5_rate"]) if conversion and conversion["quiet_first5_rate"] is not None else 0.0,
            "lineup_dependency_score_last5": float(dependency["dependency_score"]) if dependency and dependency["dependency_score"] is not None else 0.0,
        }
    return lineup_lookup


LINEUP_BASE_COLUMNS = [
    "lineup_sample_size",
    "lineup_top3_left_count",
    "lineup_top3_right_count",
    "lineup_top6_left_count",
    "lineup_top6_right_count",
    "lineup_top3_pressure_avg",
    "lineup_top6_pressure_avg",
    "lineup_top6_whiff_avg",
    "lineup_top6_walk_avg",
    "lineup_top6_tb_per_pa_avg",
    "lineup_top6_xwoba_avg",
    "lineup_top6_xslg_avg",
    "lineup_top6_hard_hit_avg",
    "lineup_conversion_index_last5",
    "lineup_dead_bat_traffic_rate_last5",
    "lineup_quiet_first5_rate_last5",
    "lineup_dependency_score_last5",
]


LINEUP_INTERACTION_COLUMNS = [
    "lineup_top3_opposite_count",
    "lineup_top3_same_count",
    "lineup_top6_opposite_count",
    "lineup_top6_same_count",
    "lineup_top6_opposite_share",
    "lineup_top6_same_share",
    "lineup_top6_opposite_pressure",
    "lineup_top6_same_pressure",
    "lineup_top6_opposite_xwoba",
    "lineup_top6_same_xwoba",
]


LINEUP_DAMAGE_COLUMNS = [
    "lineup_top6_opposite_tb_per_pa",
    "lineup_top6_same_tb_per_pa",
    "lineup_top6_opposite_xslg",
    "lineup_top6_same_xslg",
    "lineup_top6_opposite_hard_hit",
    "lineup_top6_same_hard_hit",
    "lineup_top6_opposite_whiff",
    "lineup_top6_same_whiff",
]


def build_candidate_lineup_features(
    rows,
    conn: sqlite3.Connection,
    conversion_window: int = 5,
    dependency_window: int = 5,
) -> dict[tuple[str, int, str], dict[str, float]]:
    lineup_lookup = build_lineup_lookup(conn, conversion_window=conversion_window, dependency_window=dependency_window)
    pitcher_hand_map, batter_side_map = load_handedness_maps(conn)
    lineup_rows = load_lineup_rows(conn)

    grouped_lineups: dict[tuple[str, str], list[sqlite3.Row]] = defaultdict(list)
    for row in lineup_rows:
        grouped_lineups[(row["game_date"], row["team_name"])].append(row)

    hitter_lookup = load_hitter_snapshot_lookup(conn)
    statcast_lookup = load_statcast_lookup(conn)

    candidate_lookup: dict[tuple[str, int, str], dict[str, float]] = {}
    for row in rows:
        base = dict(lineup_lookup.get((row.as_of_date, row.opponent_name), {}))
        reliever_hand = pitcher_hand_map.get(row.pitcher_id)
        lineup_players = sorted(grouped_lineups.get((row.as_of_date, row.opponent_name), []), key=lambda item: int(item["batting_order"] or 99))[:6]

        same_count = 0.0
        opposite_count = 0.0
        same_pressure = 0.0
        opposite_pressure = 0.0
        same_xwoba = 0.0
        opposite_xwoba = 0.0
        same_xslg = 0.0
        opposite_xslg = 0.0
        same_hard_hit = 0.0
        opposite_hard_hit = 0.0
        same_tb_per_pa = 0.0
        opposite_tb_per_pa = 0.0
        same_whiff = 0.0
        opposite_whiff = 0.0
        same_sample = 0.0
        opposite_sample = 0.0
        top3_same = 0.0
        top3_opp = 0.0
        if reliever_hand in {"L", "R"}:
            for idx, player in enumerate(lineup_players):
                batter_side = batter_side_map.get(int(player["player_id"]))
                hitter = hitter_lookup.get((row.as_of_date, int(player["player_id"])))
                trend = statcast_lookup.get((row.as_of_date, int(player["player_id"])))
                pressure = row_value(hitter, "pressure_plate_index") or 0.0
                xwoba = row_value(trend, "rolling_7_xwoba") or 0.0
                xslg = row_value(trend, "rolling_7_xslg") or 0.0
                hard_hit = row_value(trend, "rolling_7_hard_hit_pct") or 0.0
                tb_per_pa = row_value(hitter, "total_bases_per_pa_last5") or 0.0
                whiff = row_value(hitter, "whiff_rate_last5") or 0.0
                if batter_side == reliever_hand:
                    same_count += 1.0
                    same_pressure += pressure
                    same_xwoba += xwoba
                    same_xslg += xslg
                    same_hard_hit += hard_hit
                    same_tb_per_pa += tb_per_pa
                    same_whiff += whiff
                    same_sample += 1.0
                    if idx < 3:
                        top3_same += 1.0
                elif batter_side in {"L", "R"}:
                    opposite_count += 1.0
                    opposite_pressure += pressure
                    opposite_xwoba += xwoba
                    opposite_xslg += xslg
                    opposite_hard_hit += hard_hit
                    opposite_tb_per_pa += tb_per_pa
                    opposite_whiff += whiff
                    opposite_sample += 1.0
                    if idx < 3:
                        top3_opp += 1.0

        base.update(
            {
                "lineup_top3_opposite_count": top3_opp,
                "lineup_top3_same_count": top3_same,
                "lineup_top6_opposite_count": opposite_count,
                "lineup_top6_same_count": same_count,
                "lineup_top6_opposite_share": safe_divide(opposite_count, len(lineup_players)),
                "lineup_top6_same_share": safe_divide(same_count, len(lineup_players)),
                "lineup_top6_opposite_pressure": safe_divide(opposite_pressure, opposite_sample),
                "lineup_top6_same_pressure": safe_divide(same_pressure, same_sample),
                "lineup_top6_opposite_xwoba": safe_divide(opposite_xwoba, opposite_sample),
                "lineup_top6_same_xwoba": safe_divide(same_xwoba, same_sample),
                "lineup_top6_opposite_tb_per_pa": safe_divide(opposite_tb_per_pa, opposite_sample),
                "lineup_top6_same_tb_per_pa": safe_divide(same_tb_per_pa, same_sample),
                "lineup_top6_opposite_xslg": safe_divide(opposite_xslg, opposite_sample),
                "lineup_top6_same_xslg": safe_divide(same_xslg, same_sample),
                "lineup_top6_opposite_hard_hit": safe_divide(opposite_hard_hit, opposite_sample),
                "lineup_top6_same_hard_hit": safe_divide(same_hard_hit, same_sample),
                "lineup_top6_opposite_whiff": safe_divide(opposite_whiff, opposite_sample),
                "lineup_top6_same_whiff": safe_divide(same_whiff, same_sample),
            }
        )
        candidate_lookup[(row.as_of_date, row.pitcher_id, row.team_name)] = base
    return candidate_lookup


def train_candidate_model(train_rows, test_rows, quality_lookup, lineup_lookup, feature_columns: list[str]) -> tuple[list[float], list[str]]:
    if RandomForestClassifier is None or SimpleImputer is None:
        return [0.0] * len(test_rows), []

    def build_vector(row) -> list[float | int | None]:
        quality = quality_lookup.get((row.as_of_date, row.pitcher_id), {})
        lineup = lineup_lookup.get((row.as_of_date, row.pitcher_id, row.team_name), {})
        vector: list[float | int | None] = []
        for feature in feature_columns:
            if feature in LINEUP_BASE_COLUMNS or feature in LINEUP_INTERACTION_COLUMNS or feature in LINEUP_DAMAGE_COLUMNS:
                vector.append(lineup.get(feature))
            elif feature in quality:
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
        n_estimators=750,
        min_samples_leaf=3,
        random_state=32,
        class_weight="balanced_subsample",
    )
    model.fit(X_train_imp, y_train)
    probs = model.predict_proba(X_test_imp)[:, 1].tolist()
    ranked = sorted(zip(feature_columns, model.feature_importances_), key=lambda pair: pair[1], reverse=True)[:14]
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


def matchup_profile_rows(rows, lineup_lookup: dict[tuple[str, int, str], dict[str, float]]) -> list[list[str]]:
    grouped: dict[str, dict[str, float]] = {
        "1-3 outs": {"samples": 0.0, "opp_share": 0.0, "opp_pressure": 0.0, "opp_xwoba": 0.0, "conv": 0.0},
        "4-5 outs": {"samples": 0.0, "opp_share": 0.0, "opp_pressure": 0.0, "opp_xwoba": 0.0, "conv": 0.0},
        "6+ outs": {"samples": 0.0, "opp_share": 0.0, "opp_pressure": 0.0, "opp_xwoba": 0.0, "conv": 0.0},
    }
    for row in rows:
        if row.actual_first_up_flag != 1:
            continue
        lineup = lineup_lookup.get((row.as_of_date, row.pitcher_id, row.team_name), {})
        bucket = grouped[row.actual_workload_bucket]
        bucket["samples"] += 1.0
        bucket["opp_share"] += lineup.get("lineup_top6_opposite_share", 0.0)
        bucket["opp_pressure"] += lineup.get("lineup_top6_opposite_pressure", 0.0)
        bucket["opp_xwoba"] += lineup.get("lineup_top6_opposite_xwoba", 0.0)
        bucket["conv"] += lineup.get("lineup_conversion_index_last5", 0.0)

    table_rows: list[list[str]] = []
    for label in ("1-3 outs", "4-5 outs", "6+ outs"):
        bucket = grouped[label]
        samples = bucket["samples"]
        table_rows.append(
            [
                label,
                str(int(samples)),
                f"{safe_divide(bucket['opp_share'], samples):.3f}",
                f"{safe_divide(bucket['opp_pressure'], samples):.2f}",
                f"{safe_divide(bucket['opp_xwoba'], samples):.3f}",
                f"{safe_divide(bucket['conv'], samples):.1f}",
            ]
        )
    return table_rows


def main() -> None:
    args = parse_args()
    conn = sqlite3.connect(args.db)
    conn.row_factory = sqlite3.Row
    rows = load_first_up_rows(conn)
    quality_appearances_by_pitcher = load_quality_appearances(conn)
    quality_lookup = build_quality_lookup(rows, quality_appearances_by_pitcher)
    lineup_lookup = build_candidate_lineup_features(
        rows,
        conn,
        conversion_window=args.conversion_window,
        dependency_window=args.dependency_window,
    )
    conn.close()

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

    e31_columns = BASE_FEATURE_COLUMNS + AUGMENT_COLUMNS + QUALITY_COLUMNS
    e31_probs, _ = train_candidate_model(train_rows, test_rows, quality_lookup, lineup_lookup, e31_columns)
    e31_summary = summarize_scored_groups(test_rows, e31_probs)

    e32_columns = e31_columns + LINEUP_BASE_COLUMNS + LINEUP_INTERACTION_COLUMNS + LINEUP_DAMAGE_COLUMNS
    e32_probs, feature_lines = train_candidate_model(train_rows, test_rows, quality_lookup, lineup_lookup, e32_columns)
    e32_summary = summarize_scored_groups(test_rows, e32_probs)

    report = f"""# {args.title}

This is `{args.experiment_label}`, the next bullpen-model pass after `E31`.

Goal:

- add lineup-shape interaction to the first-up reliever model
- test whether managers appear to match the first reliever to handedness and top-of-order pressure
- see whether lineup conversion / dependency context improves the shortlist

Samples:

- candidate rows: `{len(rows)}`
- team-side games: `{len({(row.as_of_date, row.team_name) for row in rows})}`
- train candidate rows: `{len(train_rows)}`
- test candidate rows: `{len(test_rows)}`
- test team-side games: `{baseline_summary['samples']}`

Using:

- conversion window `{args.conversion_window}`
- dependency window `{args.dependency_window}`

## Ranking Comparison

{markdown_table(
    ["Model", "Exact 1st", "Top-2", "Top-3"],
    [
        ["`current likelihood stack`", f"{baseline_summary['exact_rate']:.1f}%", f"{baseline_summary['top2_rate']:.1f}%", f"{baseline_summary['top3_rate']:.1f}%"],
        ["`E31: quality + role-drift`", f"{e31_summary['exact_rate']:.1f}%", f"{e31_summary['top2_rate']:.1f}%", f"{e31_summary['top3_rate']:.1f}%"],
        [f"`{args.experiment_label}: E31 + lineup interaction`", f"{e32_summary['exact_rate']:.1f}%", f"{e32_summary['top2_rate']:.1f}%", f"{e32_summary['top3_rate']:.1f}%"],
    ],
)}

## Workload Buckets: E31

{markdown_table(["Actual first-up workload", "Samples", "Exact 1st", "Top-2"], workload_rows(e31_summary))}

## Workload Buckets: {args.experiment_label}

{markdown_table(["Actual first-up workload", "Samples", "Exact 1st", "Top-2"], workload_rows(e32_summary))}

## Actual First-Up Matchup Profile

{markdown_table(
    ["Actual first-up workload", "Samples", "Opp-hand share top6", "Opp-hand pressure", "Opp-hand xwOBA", "Lineup conv idx"],
    matchup_profile_rows(rows, lineup_lookup),
)}

## Top {args.experiment_label} Features

{chr(10).join(f"- {line}" for line in feature_lines) if feature_lines else "- `sklearn` unavailable, so no feature ranking was produced."}

## Read

- `E32` tests whether bullpen choice is partially a lineup-matchup decision, not just an availability or role decision.
- The lineup layer here includes:
  - reliever-hand vs top-of-order handedness counts
  - reliever-hand vs top-of-order pressure / xwOBA
  - team conversion shape
  - lineup dependency context
- If this helps mainly on the shortlist rather than exact first-up, that still matters: it would mean we are getting better at identifying the right reliever cluster for the lineup that is about to hit.
"""
    Path(args.out).write_text(report)
    print(f"Wrote {args.out}")


if __name__ == "__main__":
    main()
