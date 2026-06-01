#!/usr/bin/env python3

from __future__ import annotations

import argparse
import json
import sqlite3
from pathlib import Path
from typing import Any

import pandas as pd

from game_shape_backtest import (
    DB_PATH,
    PRIVATE_REPORT_DIR,
    REPORT_DIR,
    enrich_rows,
    load_rows,
    load_summary_context,
)

try:
    from sklearn.ensemble import RandomForestClassifier
except Exception:  # pragma: no cover - optional local research dependency
    RandomForestClassifier = None


DEFAULT_START = "2026-05-10"
DEFAULT_END = "2026-05-31"
DEFAULT_HOLDOUT = "2026-05-31"

FEATURES = [
    "chaos_score",
    "dead_early_score",
    "phase_split_score",
    "bullpen_flip_score",
    "reality_gap_score",
    "max_chaos",
    "max_run_cluster",
    "max_one_bad_inning",
    "max_bullpen_chaos",
    "max_bullpen_meltdown",
    "min_lineup_conversion",
    "max_quiet_first5",
    "max_no_conversion",
    "max_dead_traffic",
    "projected_edge_to_line",
    "full_total_line",
]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Test whether MLB-M2 can learn run-environment chaos overs from prior data."
    )
    parser.add_argument("--db", default=str(DB_PATH), help="Warehouse sqlite database.")
    parser.add_argument("--start", default=DEFAULT_START, help="First date to include.")
    parser.add_argument("--end", default=DEFAULT_END, help="Last date to include.")
    parser.add_argument("--holdout", default=DEFAULT_HOLDOUT, help="Holdout date for stress-slate scoring.")
    parser.add_argument("--markdown-out", default=None, help="Markdown report output path.")
    parser.add_argument("--json-out", default=None, help="JSON artifact output path.")
    return parser.parse_args()


def rate(values: pd.Series) -> float | None:
    clean = values.dropna()
    if clean.empty:
        return None
    return round(float(clean.mean()), 4)


def label_rate(value: float | None) -> str:
    if value is None:
        return "N/A"
    return f"{value * 100:.1f}%"


def load_dataset(db_path: str, start: str, end: str) -> pd.DataFrame:
    summary = load_summary_context(start, end)
    with sqlite3.connect(db_path) as conn:
        frame = enrich_rows(load_rows(conn, start, end), summary)

    for name in ["projected_full_total", "full_total_label"]:
        frame[name] = frame.apply(
            lambda row: summary.get((str(row["prediction_date"]), str(row["game_title"])), {}).get(name),
            axis=1,
        )
    for column in ["actual_total", "full_total_line", "projected_full_total"]:
        frame[column] = pd.to_numeric(frame[column], errors="coerce")

    frame = frame[frame["actual_total"].notna() & frame["full_total_line"].notna()].copy()
    frame["over_hit"] = (frame["actual_total"] > frame["full_total_line"]).astype(int)
    frame["actual_margin_to_line"] = frame["actual_total"] - frame["full_total_line"]
    frame["projected_edge_to_line"] = frame["projected_full_total"] - frame["full_total_line"]
    frame["full_total_lean_text"] = frame["full_total_lean"].fillna("").astype(str).str.lower()
    return frame


def build_subreason_mask(data: pd.DataFrame, params: dict[str, Any]) -> tuple[pd.Series, dict[str, pd.Series], pd.Series]:
    subreasons = {
        "run_cluster": data["max_run_cluster"].fillna(0) >= params["run_cluster"],
        "one_bad": data["max_one_bad_inning"].fillna(0) >= params["one_bad"],
        "mistake": data["max_chaos"].fillna(0) >= params["mistake"],
        "bullpen": (data["max_bullpen_chaos"].fillna(0) >= params["bullpen"])
        | (data["max_bullpen_meltdown"].fillna(0) >= params["meltdown"]),
        "false_under": (data["min_lineup_conversion"].fillna(100) <= params["low_conv"])
        | (data["max_no_conversion"].fillna(0) >= params["no_conv"])
        | (data["max_dead_traffic"].fillna(0) >= params["dead_traffic"]),
        "quiet_late": data["max_quiet_first5"].fillna(0) >= params["quiet"],
        "carry_modifier": data["weather_carry"].fillna(False).astype(bool),
    }
    subreason_count = sum(subreasons.values())
    mask = (
        (data["chaos_score"].fillna(0) >= params["chaos"])
        & (subreason_count >= params["tail_count"])
        & (data["projected_edge_to_line"].fillna(-99) >= params["proj_edge_min"])
    )
    return mask, subreasons, subreason_count


def sweep_threshold_rules(train: pd.DataFrame, holdout: pd.DataFrame) -> list[dict[str, Any]]:
    base = {"mistake": 58, "meltdown": 0.18, "no_conv": 0.24, "dead_traffic": 0.38}
    results: list[dict[str, Any]] = []
    for chaos in [52, 56, 60, 64]:
        for tail_count in [2, 3, 4]:
            for run_cluster in [65, 70, 75]:
                for one_bad in [0.25, 0.38, 0.50]:
                    for bullpen in [45, 50, 55]:
                        for low_conv in [35, 45]:
                            for quiet in [0.38, 0.50, 0.63]:
                                for proj_edge_min in [-2.0, -1.0, 0.0]:
                                    params = {
                                        **base,
                                        "chaos": chaos,
                                        "tail_count": tail_count,
                                        "run_cluster": run_cluster,
                                        "one_bad": one_bad,
                                        "bullpen": bullpen,
                                        "low_conv": low_conv,
                                        "quiet": quiet,
                                        "proj_edge_min": proj_edge_min,
                                    }
                                    train_mask, _, _ = build_subreason_mask(train, params)
                                    train_rows = int(train_mask.sum())
                                    if train_rows < 12:
                                        continue
                                    holdout_mask, _, _ = build_subreason_mask(holdout, params)
                                    train_hit = float(train.loc[train_mask, "over_hit"].mean())
                                    train_avg_margin = float(train.loc[train_mask, "actual_margin_to_line"].mean())
                                    score = train_hit + min(train_rows, 35) * 0.0015 + max(min(train_avg_margin, 4), -4) * 0.008
                                    holdout_rows = int(holdout_mask.sum())
                                    results.append(
                                        {
                                            "score": round(score, 4),
                                            "trainRows": train_rows,
                                            "trainHitRate": round(train_hit, 4),
                                            "trainAvgMarginToLine": round(train_avg_margin, 3),
                                            "holdoutRows": holdout_rows,
                                            "holdoutHitRate": None
                                            if holdout_rows == 0
                                            else round(float(holdout.loc[holdout_mask, "over_hit"].mean()), 4),
                                            "params": params,
                                        }
                                    )
    return sorted(results, key=lambda row: (row["score"], row["trainHitRate"], row["trainRows"]), reverse=True)


def evaluate_existing_masks(train: pd.DataFrame, holdout: pd.DataFrame, best_params: dict[str, Any]) -> list[dict[str, Any]]:
    masks = [
        (
            "existing_weather_carry_chaos",
            train["weather_carry"].fillna(False).astype(bool) & (train["chaos_score"] >= 62),
            holdout["weather_carry"].fillna(False).astype(bool) & (holdout["chaos_score"] >= 62),
        ),
        (
            "existing_crooked_or_bullpen_chaos",
            (train["chaos_score"] >= 68) | (train["max_bullpen_chaos"].fillna(0) >= 56),
            (holdout["chaos_score"] >= 68) | (holdout["max_bullpen_chaos"].fillna(0) >= 56),
        ),
        (
            "train_selected_run_environment_rule",
            build_subreason_mask(train, best_params)[0],
            build_subreason_mask(holdout, best_params)[0],
        ),
    ]
    output = []
    for label, train_mask, holdout_mask in masks:
        output.append(
            {
                "label": label,
                "trainRows": int(train_mask.sum()),
                "trainHitRate": None if not int(train_mask.sum()) else rate(train.loc[train_mask, "over_hit"]),
                "trainAvgMarginToLine": None
                if not int(train_mask.sum())
                else round(float(train.loc[train_mask, "actual_margin_to_line"].mean()), 3),
                "holdoutRows": int(holdout_mask.sum()),
                "holdoutHitRate": None if not int(holdout_mask.sum()) else rate(holdout.loc[holdout_mask, "over_hit"]),
            }
        )
    return output


def walk_forward_random_forest(frame: pd.DataFrame) -> dict[str, Any]:
    if RandomForestClassifier is None:
        return {"available": False, "reason": "sklearn RandomForestClassifier unavailable"}

    rows = []
    for date in sorted(frame["prediction_date"].unique()):
        train = frame[frame["prediction_date"] < date]
        test = frame[frame["prediction_date"] == date]
        if len(train) < 50 or len(test) < 3 or train["over_hit"].nunique() < 2:
            continue
        medians = train[FEATURES].median(numeric_only=True)
        model = RandomForestClassifier(
            n_estimators=300,
            max_depth=3,
            min_samples_leaf=5,
            random_state=7,
            class_weight="balanced",
        )
        model.fit(train[FEATURES].fillna(medians).fillna(0), train["over_hit"])
        probs = model.predict_proba(test[FEATURES].fillna(medians).fillna(0))[:, 1]
        test = test.copy()
        test["rf_over_prob"] = probs
        top5 = test.sort_values("rf_over_prob", ascending=False).head(min(5, len(test)))
        top3 = top5.head(min(3, len(top5)))
        old_explicit = test[test["full_total_hit"].notna()]
        rows.append(
            {
                "date": date,
                "games": int(len(test)),
                "baseOverRate": rate(test["over_hit"]),
                "top5Record": f"{int(top5['over_hit'].sum())}/{len(top5)}",
                "top5HitRate": rate(top5["over_hit"]),
                "top3Record": f"{int(top3['over_hit'].sum())}/{len(top3)}",
                "top3HitRate": rate(top3["over_hit"]),
                "oldTotalRows": int(len(old_explicit)),
                "oldTotalHitRate": rate(old_explicit["full_total_hit"]),
                "top5Games": top5[
                    ["game_title", "full_total_label", "actual_total", "over_hit", "m2_category_label", "rf_over_prob"]
                ].to_dict("records"),
            }
        )

    top5_hits = sum(int(row["top5Record"].split("/")[0]) for row in rows)
    top5_rows = sum(int(row["top5Record"].split("/")[1]) for row in rows)
    top3_hits = sum(int(row["top3Record"].split("/")[0]) for row in rows)
    top3_rows = sum(int(row["top3Record"].split("/")[1]) for row in rows)
    return {
        "available": True,
        "dates": rows,
        "aggregate": {
            "top5Record": f"{top5_hits}/{top5_rows}",
            "top5HitRate": None if top5_rows == 0 else round(top5_hits / top5_rows, 4),
            "top3Record": f"{top3_hits}/{top3_rows}",
            "top3HitRate": None if top3_rows == 0 else round(top3_hits / top3_rows, 4),
        },
    }


def holdout_games(holdout: pd.DataFrame, params: dict[str, Any]) -> list[dict[str, Any]]:
    mask, subreasons, subreason_count = build_subreason_mask(holdout, params)
    output = holdout.loc[
        mask,
        [
            "game_title",
            "full_total_label",
            "full_total_lean",
            "projected_full_total",
            "full_total_line",
            "actual_total",
            "over_hit",
            "m2_category_label",
            "weather_carry",
            "chaos_score",
            "max_chaos",
            "max_run_cluster",
            "max_one_bad_inning",
            "max_bullpen_chaos",
            "max_bullpen_meltdown",
            "min_lineup_conversion",
            "max_quiet_first5",
            "max_no_conversion",
            "max_dead_traffic",
            "projected_edge_to_line",
        ],
    ].copy()
    output["subreason_count"] = subreason_count[mask]
    for key, value in subreasons.items():
        output[key] = value[mask]
    return output.to_dict("records")


def build_markdown(report: dict[str, Any]) -> str:
    top_rules = "\n".join(
        f"- train {row['trainRows']} rows at {label_rate(row['trainHitRate'])}, "
        f"holdout {row['holdoutRows']} rows at {label_rate(row['holdoutHitRate'])}; params `{row['params']}`"
        for row in report["thresholdSweepTopRules"][:5]
    )
    masks = "\n".join(
        f"- `{row['label']}`: train {row['trainRows']} rows at {label_rate(row['trainHitRate'])}; "
        f"holdout {row['holdoutRows']} rows at {label_rate(row['holdoutHitRate'])}"
        for row in report["maskComparison"]
    )
    rf_rows = report["walkForwardRandomForest"]
    rf_lines = []
    if rf_rows.get("available"):
        for row in rf_rows["dates"]:
            rf_lines.append(
                f"| {row['date']} | {label_rate(row['baseOverRate'])} | {row['top5Record']} "
                f"({label_rate(row['top5HitRate'])}) | {row['top3Record']} ({label_rate(row['top3HitRate'])}) | "
                f"{label_rate(row['oldTotalHitRate'])} on {row['oldTotalRows']} |"
            )
    return f"""# MLB-M2 Run-Environment Chaos Over Test

Range: {report['range']['start']} to {report['range']['end']}; holdout: {report['holdoutDate']}.

This test asks whether the May 31 O/U lesson can be learned from prior data as a broader run-environment tail-risk problem rather than as a weather-only rule.

## Dataset

- Train rows before holdout: {report['dataset']['trainRows']}
- Holdout rows: {report['dataset']['holdoutRows']}
- Train base over rate: {label_rate(report['dataset']['trainBaseOverRate'])}
- Holdout base over rate: {label_rate(report['dataset']['holdoutBaseOverRate'])}
- Old exposed full-game total lane: train {label_rate(report['dataset']['oldTrainTotalHitRate'])} on {report['dataset']['oldTrainTotalRows']} rows; holdout {label_rate(report['dataset']['oldHoldoutTotalHitRate'])} on {report['dataset']['oldHoldoutTotalRows']} rows

## Threshold Sweep

{top_rules}

## Mask Comparison

{masks}

## Walk-Forward Random Forest

Aggregate top-5: {rf_rows.get('aggregate', {}).get('top5Record', 'N/A')} ({label_rate(rf_rows.get('aggregate', {}).get('top5HitRate'))})

Aggregate top-3: {rf_rows.get('aggregate', {}).get('top3Record', 'N/A')} ({label_rate(rf_rows.get('aggregate', {}).get('top3HitRate'))})

| Date | Base over | RF top 5 | RF top 3 | Old total lane |
| --- | --- | --- | --- | --- |
{chr(10).join(rf_lines)}

## Read

The deterministic train-selected threshold rule did not transfer to May 31. The existing weather-carry mask hit May 31, but its pre-holdout hit rate was near coinflip, so it is not enough to call the mechanism learned.

The RF ranking found a 5/5 May 31 top-5 over board, but walk-forward aggregate was only about coinflip. That means the stored data contains some useful nonlinear signal, yet the current sample is not stable enough to promote RF O/U ranking as a blind betting engine.

Next step: persist a richer `run_environment_tail` table with explicit park, sun/shadow, weather, market-total, run-cluster, one-bad-inning, bullpen-meltdown, lineup-conversion, and false-under flags, then train/calibrate that lane separately from side picks.
"""


def main() -> None:
    args = parse_args()
    frame = load_dataset(args.db, args.start, args.end)
    train = frame[frame["prediction_date"] < args.holdout].copy()
    holdout = frame[frame["prediction_date"] == args.holdout].copy()
    rules = sweep_threshold_rules(train, holdout)
    best_params = rules[0]["params"] if rules else {}
    report = {
        "schemaVersion": 1,
        "modelId": "MLB-M2",
        "experiment": "run_environment_chaos_over",
        "range": {"start": args.start, "end": args.end},
        "holdoutDate": args.holdout,
        "dataset": {
            "trainRows": int(len(train)),
            "holdoutRows": int(len(holdout)),
            "trainBaseOverRate": rate(train["over_hit"]),
            "holdoutBaseOverRate": rate(holdout["over_hit"]),
            "oldTrainTotalRows": int(train["full_total_hit"].dropna().shape[0]),
            "oldTrainTotalHitRate": rate(train["full_total_hit"]),
            "oldHoldoutTotalRows": int(holdout["full_total_hit"].dropna().shape[0]),
            "oldHoldoutTotalHitRate": rate(holdout["full_total_hit"]),
        },
        "thresholdSweepTopRules": rules[:10],
        "maskComparison": evaluate_existing_masks(train, holdout, best_params) if best_params else [],
        "holdoutGamesForTrainSelectedRule": holdout_games(holdout, best_params) if best_params else [],
        "walkForwardRandomForest": walk_forward_random_forest(frame),
    }

    markdown_out = Path(args.markdown_out) if args.markdown_out else REPORT_DIR / "run-environment-chaos-over-test-2026-06-01.md"
    json_out = Path(args.json_out) if args.json_out else PRIVATE_REPORT_DIR / "mlb-m2-run-environment-chaos-over-test-2026-06-01.json"
    markdown_out.parent.mkdir(parents=True, exist_ok=True)
    json_out.parent.mkdir(parents=True, exist_ok=True)
    markdown_out.write_text(build_markdown(report))
    json_out.write_text(json.dumps(report, indent=2))
    print(f"Wrote {markdown_out}")
    print(f"Wrote {json_out}")


if __name__ == "__main__":
    main()
