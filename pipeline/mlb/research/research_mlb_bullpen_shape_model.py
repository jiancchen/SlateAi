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
except Exception:  # pragma: no cover
    RandomForestClassifier = None
    SimpleImputer = None
    brier_score_loss = None

from research_mlb_starter_exit_buckets import (
    FEATURE_COLUMNS as STARTER_FEATURE_COLUMNS,
    THRESHOLDS,
    StarterExitRow,
    load_rows as load_starter_rows,
    time_split_rows as split_starter_rows,
)


ROOT = Path(__file__).resolve().parents[3]
DB_PATH = ROOT / "data-private" / "warehouse" / "sports.db"
REPORT_PATH = ROOT / "development-docs" / "mlb-bullpen-shape-model-053026.md"


@dataclass
class BullpenShapeModelRow:
    game_date: str
    game_pk: int
    team_name: str
    opponent_name: str
    relievers_used: int
    first_reliever_outs: int
    shape_class: str
    bulk_first_up_flag: int
    relievers_used_avg_last3: float | None
    relievers_used_avg_last5: float | None
    relievers_used_avg_last10: float | None
    relievers_used_max_last10: float | None
    first_reliever_outs_avg_last3: float | None
    first_reliever_outs_avg_last5: float | None
    first_reliever_outs_avg_last10: float | None
    first_reliever_outs_volatility_last10: float | None
    total_relief_outs_avg_last5: float | None
    total_relief_outs_avg_last10: float | None
    total_relief_runs_allowed_avg_last5: float | None
    total_relief_runs_allowed_avg_last10: float | None
    short_first_up_rate_last5: float | None
    short_first_up_rate_last10: float | None
    bulk_first_up_rate_last5: float | None
    bulk_first_up_rate_last10: float | None
    two_reliever_containment_rate_last5: float | None
    two_reliever_containment_rate_last10: float | None
    four_plus_reliever_rate_last5: float | None
    four_plus_reliever_rate_last10: float | None
    six_plus_reliever_scramble_rate_last10: float | None
    bullpen_shape_index: float | None
    starter_prob_12: float | None
    starter_prob_15: float | None
    starter_prob_18: float | None
    starter_prob_21: float | None
    starter_leash_score: float | None
    starter_callup_debut_flag: int
    starter_tiny_sample_flag: int
    starter_command_break_index: float | None
    starter_sixth_inning_damage_rate: float | None


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Research bullpen shape prediction with starter-exit signals.")
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


def safe_avg(values: list[float]) -> float:
    return round(sum(values) / len(values), 3) if values else 0.0


def safe_rate(flags: list[int]) -> float:
    return round(sum(flags) / len(flags), 3) if flags else 0.0


def markdown_table(headers: list[str], rows: list[list[str]]) -> str:
    header_line = "| " + " | ".join(headers) + " |"
    divider_line = "| " + " | ".join("---" for _ in headers) + " |"
    body = "\n".join("| " + " | ".join(str(cell) for cell in row) + " |" for row in rows)
    return "\n".join([header_line, divider_line, body])


def shape_class_for_relievers(relievers_used: int) -> str:
    if relievers_used <= 2:
        return "containment2"
    if relievers_used == 3:
        return "bridge3"
    return "scramble4"


def build_starter_probability_lookup(rows: list[StarterExitRow]) -> dict[tuple[str, int, str], dict[str, float | int | None]]:
    if RandomForestClassifier is None or SimpleImputer is None:
        return {
            (row.game_date, row.game_pk, row.team_name): {
                "starter_prob_12": None,
                "starter_prob_15": None,
                "starter_prob_18": None,
                "starter_prob_21": None,
                "starter_leash_score": row.leash_score,
                "starter_callup_debut_flag": row.callup_debut_flag,
                "starter_tiny_sample_flag": row.tiny_sample_flag,
                "starter_command_break_index": row.command_break_index,
                "starter_sixth_inning_damage_rate": row.sixth_inning_damage_rate,
            }
            for row in rows
        }

    train_rows, _ = split_starter_rows(rows)
    train_dates = {row.game_date for row in train_rows}
    X_all = [[getattr(row, feature) for feature in STARTER_FEATURE_COLUMNS] for row in rows]
    imputer = SimpleImputer(strategy="median")
    X_all_imp = imputer.fit_transform(X_all)

    lookup: dict[tuple[str, int, str], dict[str, float | int | None]] = {}
    key_order = [(row.game_date, row.game_pk, row.team_name) for row in rows]

    for threshold in THRESHOLDS:
        y_train = [row.reaches(threshold) for row in train_rows]
        if len(set(y_train)) < 2:
            probs_all = [safe_rate(y_train)] * len(rows)
        else:
            X_train = [[getattr(row, feature) for feature in STARTER_FEATURE_COLUMNS] for row in train_rows]
            X_train_imp = imputer.fit_transform(X_train)
            X_all_imp = imputer.transform(X_all)
            model = RandomForestClassifier(
                n_estimators=400,
                min_samples_leaf=4,
                random_state=threshold + 17,
                class_weight="balanced_subsample",
            )
            model.fit(X_train_imp, y_train)
            probs_all = model.predict_proba(X_all_imp)[:, 1].tolist()

        for key, row, prob in zip(key_order, rows, probs_all):
            record = lookup.setdefault(
                key,
                {
                    "starter_prob_12": None,
                    "starter_prob_15": None,
                    "starter_prob_18": None,
                    "starter_prob_21": None,
                    "starter_leash_score": row.leash_score,
                    "starter_callup_debut_flag": row.callup_debut_flag,
                    "starter_tiny_sample_flag": row.tiny_sample_flag,
                    "starter_command_break_index": row.command_break_index,
                    "starter_sixth_inning_damage_rate": row.sixth_inning_damage_rate,
                },
            )
            record[f"starter_prob_{threshold}"] = prob
    return lookup


BASE_FEATURE_COLUMNS = [
    "relievers_used_avg_last3",
    "relievers_used_avg_last5",
    "relievers_used_avg_last10",
    "relievers_used_max_last10",
    "first_reliever_outs_avg_last3",
    "first_reliever_outs_avg_last5",
    "first_reliever_outs_avg_last10",
    "first_reliever_outs_volatility_last10",
    "total_relief_outs_avg_last5",
    "total_relief_outs_avg_last10",
    "total_relief_runs_allowed_avg_last5",
    "total_relief_runs_allowed_avg_last10",
    "short_first_up_rate_last5",
    "short_first_up_rate_last10",
    "bulk_first_up_rate_last5",
    "bulk_first_up_rate_last10",
    "two_reliever_containment_rate_last5",
    "two_reliever_containment_rate_last10",
    "four_plus_reliever_rate_last5",
    "four_plus_reliever_rate_last10",
    "six_plus_reliever_scramble_rate_last10",
    "bullpen_shape_index",
]

STARTER_AUGMENT_COLUMNS = [
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


def load_rows(conn: sqlite3.Connection) -> list[BullpenShapeModelRow]:
    starter_lookup = build_starter_probability_lookup(load_starter_rows(conn))

    reliever_rows = conn.execute(
        """
        SELECT
          game_date,
          game_pk,
          team_name,
          opponent_name,
          team_role,
          entry_order,
          outs_recorded
        FROM mlb_pitcher_appearances
        WHERE pitcher_role = 'reliever'
        ORDER BY game_date, game_pk, team_role, entry_order
        """
    ).fetchall()

    grouped: dict[tuple[str, int, str], list[sqlite3.Row]] = {}
    for row in reliever_rows:
        key = (row["game_date"], int(row["game_pk"]), row["team_name"])
        grouped.setdefault(key, []).append(row)

    pregame_shape_lookup = {
        (row["as_of_date"], row["team_name"]): row
        for row in conn.execute("SELECT * FROM mlb_team_bullpen_shape_daily").fetchall()
    }

    rows: list[BullpenShapeModelRow] = []
    for (game_date, game_pk, team_name), appearances in grouped.items():
        appearances = sorted(appearances, key=lambda row: (row["entry_order"] or 99))
        relievers_used = len(appearances)
        if relievers_used <= 0:
            continue
        first_reliever_outs = int(appearances[0]["outs_recorded"] or 0)
        pregame_shape = pregame_shape_lookup.get((game_date, team_name))
        starter = starter_lookup.get((game_date, game_pk, team_name))
        if not pregame_shape or not starter:
            continue
        rows.append(
            BullpenShapeModelRow(
                game_date=game_date,
                game_pk=game_pk,
                team_name=team_name,
                opponent_name=appearances[0]["opponent_name"],
                relievers_used=relievers_used,
                first_reliever_outs=first_reliever_outs,
                shape_class=shape_class_for_relievers(relievers_used),
                bulk_first_up_flag=1 if first_reliever_outs >= 6 else 0,
                relievers_used_avg_last3=safe_float(pregame_shape["relievers_used_avg_last3"]),
                relievers_used_avg_last5=safe_float(pregame_shape["relievers_used_avg_last5"]),
                relievers_used_avg_last10=safe_float(pregame_shape["relievers_used_avg_last10"]),
                relievers_used_max_last10=safe_float(pregame_shape["relievers_used_max_last10"]),
                first_reliever_outs_avg_last3=safe_float(pregame_shape["first_reliever_outs_avg_last3"]),
                first_reliever_outs_avg_last5=safe_float(pregame_shape["first_reliever_outs_avg_last5"]),
                first_reliever_outs_avg_last10=safe_float(pregame_shape["first_reliever_outs_avg_last10"]),
                first_reliever_outs_volatility_last10=safe_float(pregame_shape["first_reliever_outs_volatility_last10"]),
                total_relief_outs_avg_last5=safe_float(pregame_shape["total_relief_outs_avg_last5"]),
                total_relief_outs_avg_last10=safe_float(pregame_shape["total_relief_outs_avg_last10"]),
                total_relief_runs_allowed_avg_last5=safe_float(pregame_shape["total_relief_runs_allowed_avg_last5"]),
                total_relief_runs_allowed_avg_last10=safe_float(pregame_shape["total_relief_runs_allowed_avg_last10"]),
                short_first_up_rate_last5=safe_float(pregame_shape["short_first_up_rate_last5"]),
                short_first_up_rate_last10=safe_float(pregame_shape["short_first_up_rate_last10"]),
                bulk_first_up_rate_last5=safe_float(pregame_shape["bulk_first_up_rate_last5"]),
                bulk_first_up_rate_last10=safe_float(pregame_shape["bulk_first_up_rate_last10"]),
                two_reliever_containment_rate_last5=safe_float(pregame_shape["two_reliever_containment_rate_last5"]),
                two_reliever_containment_rate_last10=safe_float(pregame_shape["two_reliever_containment_rate_last10"]),
                four_plus_reliever_rate_last5=safe_float(pregame_shape["four_plus_reliever_rate_last5"]),
                four_plus_reliever_rate_last10=safe_float(pregame_shape["four_plus_reliever_rate_last10"]),
                six_plus_reliever_scramble_rate_last10=safe_float(pregame_shape["six_plus_reliever_scramble_rate_last10"]),
                bullpen_shape_index=safe_float(pregame_shape["bullpen_shape_index"]),
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


def time_split_rows(rows: list[BullpenShapeModelRow]) -> tuple[list[BullpenShapeModelRow], list[BullpenShapeModelRow]]:
    unique_dates = sorted({row.game_date for row in rows})
    if len(unique_dates) < 8:
        cutoff_idx = max(1, len(unique_dates) - 2)
    else:
        cutoff_idx = max(5, int(len(unique_dates) * 0.8))
    train_dates = set(unique_dates[:cutoff_idx])
    test_dates = set(unique_dates[cutoff_idx:])
    return [row for row in rows if row.game_date in train_dates], [row for row in rows if row.game_date in test_dates]


def evaluate_multiclass_shape(
    train_rows: list[BullpenShapeModelRow],
    test_rows: list[BullpenShapeModelRow],
    feature_columns: list[str],
) -> tuple[float | None, float | None, list[str]]:
    if RandomForestClassifier is None or SimpleImputer is None or not train_rows or not test_rows:
        return None, None, []

    y_train = [row.shape_class for row in train_rows]
    y_test = [row.shape_class for row in test_rows]
    majority_class = max(set(y_train), key=y_train.count)
    baseline_acc = sum(1 for y in y_test if y == majority_class) / len(y_test) if y_test else None

    X_train = [[getattr(row, feature) for feature in feature_columns] for row in train_rows]
    X_test = [[getattr(row, feature) for feature in feature_columns] for row in test_rows]
    imputer = SimpleImputer(strategy="median")
    X_train_imp = imputer.fit_transform(X_train)
    X_test_imp = imputer.transform(X_test)

    model = RandomForestClassifier(
        n_estimators=400,
        min_samples_leaf=4,
        random_state=28,
        class_weight="balanced_subsample",
    )
    model.fit(X_train_imp, y_train)
    preds = model.predict(X_test_imp)
    accuracy = sum(1 for truth, pred in zip(y_test, preds) if truth == pred) / len(y_test) if y_test else None
    ranked = sorted(zip(feature_columns, model.feature_importances_), key=lambda pair: pair[1], reverse=True)[:8]
    feature_lines = [f"`{name}` `{importance:.3f}`" for name, importance in ranked]
    return baseline_acc, accuracy, feature_lines


def evaluate_binary_bulk(
    train_rows: list[BullpenShapeModelRow],
    test_rows: list[BullpenShapeModelRow],
    feature_columns: list[str],
) -> tuple[float | None, float | None, float | None, list[str]]:
    if RandomForestClassifier is None or SimpleImputer is None or brier_score_loss is None or not train_rows or not test_rows:
        return None, None, None, []

    y_train = [row.bulk_first_up_flag for row in train_rows]
    y_test = [row.bulk_first_up_flag for row in test_rows]
    base_rate = safe_rate(y_train)
    baseline_preds = [1 if base_rate >= 0.5 else 0 for _ in y_test]
    baseline_acc = sum(1 for truth, pred in zip(y_test, baseline_preds) if truth == pred) / len(y_test) if y_test else None

    X_train = [[getattr(row, feature) for feature in feature_columns] for row in train_rows]
    X_test = [[getattr(row, feature) for feature in feature_columns] for row in test_rows]
    imputer = SimpleImputer(strategy="median")
    X_train_imp = imputer.fit_transform(X_train)
    X_test_imp = imputer.transform(X_test)

    model = RandomForestClassifier(
        n_estimators=400,
        min_samples_leaf=4,
        random_state=29,
        class_weight="balanced_subsample",
    )
    model.fit(X_train_imp, y_train)
    probs = model.predict_proba(X_test_imp)[:, 1]
    preds = [1 if prob >= 0.5 else 0 for prob in probs]
    accuracy = sum(1 for truth, pred in zip(y_test, preds) if truth == pred) / len(y_test) if y_test else None
    brier = brier_score_loss(y_test, probs)
    ranked = sorted(zip(feature_columns, model.feature_importances_), key=lambda pair: pair[1], reverse=True)[:8]
    feature_lines = [f"`{name}` `{importance:.3f}`" for name, importance in ranked]
    return baseline_acc, accuracy, brier, feature_lines


def gate_summary(rows: list[BullpenShapeModelRow], predicate) -> tuple[int, float, float, float]:
    bucket = [row for row in rows if predicate(row)]
    return (
        len(bucket),
        safe_rate([1 if row.shape_class == "containment2" else 0 for row in bucket]),
        safe_rate([1 if row.shape_class == "scramble4" else 0 for row in bucket]),
        safe_rate([row.bulk_first_up_flag for row in bucket]),
    )


def main() -> None:
    args = parse_args()
    conn = sqlite3.connect(args.db)
    conn.row_factory = sqlite3.Row
    rows = load_rows(conn)
    conn.close()

    train_rows, test_rows = time_split_rows(rows)

    shape_dist_rows = []
    for label in ("containment2", "bridge3", "scramble4"):
        count = sum(1 for row in rows if row.shape_class == label)
        shape_dist_rows.append([label, str(count), f"{count / len(rows):.1%}" if rows else "0.0%"])

    bulk_rate = safe_rate([row.bulk_first_up_flag for row in rows])

    base_shape_baseline, base_shape_acc, base_shape_features = evaluate_multiclass_shape(train_rows, test_rows, BASE_FEATURE_COLUMNS)
    aug_shape_baseline, aug_shape_acc, aug_shape_features = evaluate_multiclass_shape(train_rows, test_rows, BASE_FEATURE_COLUMNS + STARTER_AUGMENT_COLUMNS)
    base_bulk_baseline, base_bulk_acc, base_bulk_brier, base_bulk_features = evaluate_binary_bulk(train_rows, test_rows, BASE_FEATURE_COLUMNS)
    aug_bulk_baseline, aug_bulk_acc, aug_bulk_brier, aug_bulk_features = evaluate_binary_bulk(train_rows, test_rows, BASE_FEATURE_COLUMNS + STARTER_AUGMENT_COLUMNS)

    gate_rows = []
    for label, predicate in [
        (
            "`containment lane`",
            lambda row: (row.starter_prob_18 or 0.0) >= 0.45
            and (row.two_reliever_containment_rate_last10 or 0.0) >= 0.4,
        ),
        (
            "`scramble lane`",
            lambda row: ((row.starter_prob_15 or 1.0) < 0.65 or row.starter_callup_debut_flag == 1)
            and (row.four_plus_reliever_rate_last10 or 0.0) >= 0.35,
        ),
        (
            "`bulk first-up lane`",
            lambda row: ((row.starter_prob_18 or 1.0) < 0.45 or row.starter_callup_debut_flag == 1)
            and (row.bulk_first_up_rate_last10 or 0.0) >= 0.35,
        ),
        (
            "`quiet deep starter lane`",
            lambda row: (row.starter_prob_18 or 0.0) >= 0.55
            and (row.starter_callup_debut_flag == 0)
            and (row.bullpen_shape_index or 100.0) < 80,
        ),
    ]:
        count, containment_rate, scramble_rate, bulk_rate_gate = gate_summary(rows, predicate)
        gate_rows.append([label, str(count), f"{containment_rate:.1%}", f"{scramble_rate:.1%}", f"{bulk_rate_gate:.1%}"])

    report = f"""# MLB Bullpen Shape Model — May 30, 2026

This is `E28`, the first pass at predicting bullpen game shape using the new starter-exit outputs from `E27`.

Goal:

- use pregame team bullpen history plus starter-exit probabilities to predict:
  - `2-man containment`
  - normal `3-arm bridge`
  - `4+ arm scramble`
  - `bulk first-up risk`

Samples:

- team-side bullpen games: `{len(rows)}`
- train rows: `{len(train_rows)}`
- test rows: `{len(test_rows)}`
- bulk first-up rate: `{bulk_rate:.1%}`

## Actual Shape Distribution

{markdown_table(["Shape", "Team-games", "Share"], shape_dist_rows)}

## Multiclass Shape Accuracy

{markdown_table(
    ["Model", "Baseline acc", "Test acc"],
    [
        ["`bullpen history only`", f"{(base_shape_baseline or 0.0):.1%}" if base_shape_baseline is not None else "n/a", f"{(base_shape_acc or 0.0):.1%}" if base_shape_acc is not None else "n/a"],
        ["`history + starter exit`", f"{(aug_shape_baseline or 0.0):.1%}" if aug_shape_baseline is not None else "n/a", f"{(aug_shape_acc or 0.0):.1%}" if aug_shape_acc is not None else "n/a"],
    ],
)}

## Bulk First-Up Risk

{markdown_table(
    ["Model", "Baseline acc", "Test acc", "Brier"],
    [
        ["`bullpen history only`", f"{(base_bulk_baseline or 0.0):.1%}" if base_bulk_baseline is not None else "n/a", f"{(base_bulk_acc or 0.0):.1%}" if base_bulk_acc is not None else "n/a", f"{base_bulk_brier:.3f}" if base_bulk_brier is not None else "n/a"],
        ["`history + starter exit`", f"{(aug_bulk_baseline or 0.0):.1%}" if aug_bulk_baseline is not None else "n/a", f"{(aug_bulk_acc or 0.0):.1%}" if aug_bulk_acc is not None else "n/a", f"{aug_bulk_brier:.3f}" if aug_bulk_brier is not None else "n/a"],
    ],
)}

## Top Features: Multiclass Shape

- `history only`: {", ".join(base_shape_features) if base_shape_features else "n/a"}
- `history + starter exit`: {", ".join(aug_shape_features) if aug_shape_features else "n/a"}

## Top Features: Bulk First-Up

- `history only`: {", ".join(base_bulk_features) if base_bulk_features else "n/a"}
- `history + starter exit`: {", ".join(aug_bulk_features) if aug_bulk_features else "n/a"}

## Research-Only Heuristic Lanes

{markdown_table(["Gate", "Samples", "Containment", "Scramble", "Bulk first-up"], gate_rows)}

## Read

- The bullpen-history layer already has real value because teams repeat shape habits.
- The key `E28` question is whether starter-exit probabilities help on top of that.
- If `history + starter exit` beats `history only`, that means the upstream hook model is good enough to become the root node for bullpen prediction instead of just another side stat.

## Immediate next step

- if the additive lift is real, export a compact `starter exit risk` block into the MLB game payload
- then rebuild the first-up reliever model using:
  - bullpen shape state
  - starter exit probabilities
  - reliever usage / rest / role features
"""

    Path(args.out).write_text(report)
    print(f"Wrote {args.out}")


if __name__ == "__main__":
    main()
