#!/usr/bin/env python3

from __future__ import annotations

import argparse
import json
import math
import sqlite3
from pathlib import Path
from typing import Any

import pandas as pd

try:
    from sklearn.ensemble import GradientBoostingClassifier, RandomForestClassifier
except Exception:  # pragma: no cover - optional research dependency
    GradientBoostingClassifier = None
    RandomForestClassifier = None


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
PRIVATE_TRAINING_DIR = ROOT / "data-private" / "model-training"


def number(value: Any) -> float | None:
    try:
        numeric = float(value)
    except (TypeError, ValueError):
        return None
    return numeric if math.isfinite(numeric) else None


def get_path(data: dict[str, Any], path: str, default: Any = None) -> Any:
    current: Any = data
    for part in path.split("."):
        if not isinstance(current, dict) or part not in current:
            return default
        current = current[part]
    return current


def as_float(data: dict[str, Any], path: str, default: float | None = None) -> float | None:
    value = get_path(data, path, default)
    return number(value)


def bool_float(value: Any) -> float:
    return 1.0 if bool(value) else 0.0


def load_outcomes(start: str, end: str) -> dict[str, dict[str, Any]]:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    rows = conn.execute(
        """
        SELECT
          game_pk AS gamePk,
          game_date AS gameDate,
          away_team AS awayTeam,
          home_team AS homeTeam,
          away_runs_final AS awayRunsFinal,
          home_runs_final AS homeRunsFinal,
          away_hits_final AS awayHitsFinal,
          home_hits_final AS homeHitsFinal,
          away_runs_first5 AS awayRunsFirst5,
          home_runs_first5 AS homeRunsFirst5,
          away_hits_first5 AS awayHitsFirst5,
          home_hits_first5 AS homeHitsFirst5,
          total_runs_final AS totalRunsFinal,
          total_runs_first5 AS totalRunsFirst5
        FROM mlb_game_outcomes
        WHERE game_date BETWEEN ? AND ?
        """,
        (start, end),
    ).fetchall()
    conn.close()
    return {str(row["gamePk"]): dict(row) for row in rows}


def list_game_files(start: str, end: str) -> list[Path]:
    slate_root = ROOT / "published-data" / "slates"
    files: list[Path] = []
    if not slate_root.exists():
        return files
    for day_dir in sorted(path for path in slate_root.iterdir() if path.is_dir() and start <= path.name <= end):
        games_dir = day_dir / "games"
        if not games_dir.exists():
            continue
        files.extend(sorted(path for path in games_dir.glob("*.json") if not path.name.startswith("rg-")))
    return files


def load_game(path: Path) -> dict[str, Any] | None:
    try:
        game = json.loads(path.read_text())
    except Exception:
        return None
    if game.get("league") != "MLB" or not game.get("gamePk"):
        return None
    return game


def add_numeric(features: dict[str, Any], name: str, value: Any) -> None:
    numeric = number(value)
    if numeric is not None:
        features[name] = numeric


def extract_features(game: dict[str, Any]) -> dict[str, Any]:
    totals = get_path(game, "analysis.mlbProjection.totals", {}) or {}
    projection = get_path(game, "analysis.mlbProjection", {}) or {}
    scores = get_path(game, "analysis.gameShape.scores", {}) or {}
    category = get_path(game, "analysis.gameShape.category", {}) or {}
    radar = get_path(game, "analysis.gameShape.radar.gameProfile", {}) or {}
    first5_tail = totals.get("first5TailOverlay") or projection.get("first5TailOverlay") or {}
    full_gate = get_path(totals, "fullGame.chaosGate", {}) or {}
    f5_gate = get_path(totals, "first5.chaosGate", {}) or {}
    metrics = f5_gate.get("metrics") or full_gate.get("metrics") or {}
    weather = projection.get("weather") or {}
    features: dict[str, Any] = {}

    for path, name in [
        ("postedTotal", "posted_total"),
        ("totals.projectedFullTotalRuns", "projected_full_total"),
        ("totals.projectedFirst5TotalRuns", "projected_f5_total"),
        ("totals.derivedFirst5TotalLine", "derived_f5_line"),
        ("awayProjectedRuns", "away_projected_runs"),
        ("homeProjectedRuns", "home_projected_runs"),
        ("awayFirst5ProjectedRuns", "away_f5_projected_runs"),
        ("homeFirst5ProjectedRuns", "home_f5_projected_runs"),
        ("awayProjectedHits", "away_projected_hits"),
        ("homeProjectedHits", "home_projected_hits"),
        ("awayFirst5ProjectedHits", "away_f5_projected_hits"),
        ("homeFirst5ProjectedHits", "home_f5_projected_hits"),
        ("awayHitEfficiencyPct", "away_hit_eff"),
        ("homeHitEfficiencyPct", "home_hit_eff"),
        ("awayFirst5HitEfficiencyPct", "away_f5_hit_eff"),
        ("homeFirst5HitEfficiencyPct", "home_f5_hit_eff"),
    ]:
        add_numeric(features, name, get_path(projection, path))

    for key, value in metrics.items():
        add_numeric(features, f"chaos_{key}", value)

    for key, value in scores.items():
        add_numeric(features, f"shape_{key}", value)

    for key in ["tailScore", "strandScore", "forkScore", "baseProjectedRuns", "adjustedProjectedRuns"]:
        add_numeric(features, f"tail_{key}", first5_tail.get(key))

    features["tail_shape"] = str(first5_tail.get("shape") or "none")
    features["category"] = str(category.get("slug") or category.get("label") or "none")
    features["full_total_lean"] = str(get_path(totals, "fullGame.lean", "none"))
    features["f5_total_lean"] = str(get_path(totals, "first5.lean", "none"))
    features["weather_carry_flag"] = bool_float(metrics.get("weatherCarry") or "carry" in str(weather.get("label", "")).lower())
    features["weather_suppress_flag"] = bool_float(metrics.get("weatherSuppress") or "suppress" in str(weather.get("label", "")).lower())

    for axis in radar.get("dominantAxes") or []:
        label = str(axis.get("id") or axis.get("label") or "").lower().replace(" ", "_")
        if label:
            add_numeric(features, f"radar_{label}", axis.get("score"))

    for side in ["away", "home"]:
        starter = get_path(game, f"starterContext.{side}", {}) or {}
        for key in ["era", "whip", "inningsPitched", "runsAllowed", "walks", "homeRunsAllowed", "strikeouts"]:
            add_numeric(features, f"{side}_starter_{key}", starter.get(key))
        usage = starter.get("usageContext") or {}
        for key in ["expectedInnings", "shortLeashRisk"]:
            add_numeric(features, f"{side}_starter_usage_{key}", usage.get(key))
        mistake = get_path(game, f"stateContext.teamMistakeShape.{side}", {}) or {}
        for key in ["mistakeChaosIndex", "runClusteringIndex", "oneBadInningAllowedRate", "earlyMultiRunAllowedRate"]:
            add_numeric(features, f"{side}_mistake_{key}", mistake.get(key))
        lineup = get_path(game, f"stateContext.lineupConversion.{side}", {}) or {}
        for key in ["lineupConversionIndex", "baserunnersPerGame", "runsPerBaserunner", "quietFirst5Rate", "trafficNoConversionRate"]:
            add_numeric(features, f"{side}_lineup_{key}", lineup.get(key))
        bullpen = get_path(game, f"stateContext.bullpenMistake.{side}", {}) or {}
        for key in ["bullpenChaosIndex", "bullpenMeltdownGameRate", "firstBatterReachRate", "homeRunAppearanceRate"]:
            add_numeric(features, f"{side}_bullpen_{key}", bullpen.get(key))

    add_numeric(features, "park_runs", get_path(game, "parkContext.indexRuns"))
    add_numeric(features, "park_hr", get_path(game, "parkContext.indexHr"))
    return features


def build_frame(start: str, end: str) -> pd.DataFrame:
    outcomes = load_outcomes(start, end)
    rows: list[dict[str, Any]] = []
    for path in list_game_files(start, end):
        game = load_game(path)
        if not game:
            continue
        outcome = outcomes.get(str(game.get("gamePk")))
        if not outcome:
            continue
        features = extract_features(game)
        full_line = features.get("posted_total")
        f5_line = features.get("derived_f5_line")
        total_full = number(outcome.get("totalRunsFinal"))
        total_f5 = number(outcome.get("totalRunsFirst5"))
        if total_full is None or total_f5 is None:
            continue
        row = {
            "date": outcome["gameDate"],
            "gamePk": str(game["gamePk"]),
            "title": game.get("title"),
            "total_full": total_full,
            "total_f5": total_f5,
            "full_line": full_line,
            "f5_line": f5_line,
            "full_over": int(full_line is not None and total_full > full_line),
            "f5_over": int(f5_line is not None and total_f5 > f5_line),
            "full_side_known": int(full_line is not None and total_full != full_line),
            "f5_side_known": int(f5_line is not None and total_f5 != f5_line),
            "f5_story": "crooked" if total_f5 >= 5 else "dead" if total_f5 <= 3 else "normal",
            **features,
        }
        rows.append(row)
    return pd.DataFrame(rows)


def baseline_accuracy(frame: pd.DataFrame, target: str, projection: str, line: str) -> dict[str, Any]:
    work = frame.dropna(subset=[projection, line, target]).copy()
    if work.empty:
        return {"rows": 0, "accuracy": None}
    pred = (work[projection] > work[line]).astype(int)
    acc = float((pred == work[target].astype(int)).mean())
    return {"rows": int(len(work)), "accuracy": round(acc, 3)}


def walk_forward(frame: pd.DataFrame, target: str, min_train: int = 35) -> list[dict[str, Any]]:
    if RandomForestClassifier is None:
        return [{"model": "sklearn unavailable", "rows": 0, "accuracy": None}]
    work = frame[frame[f"{target}_known"] == 1].copy() if f"{target}_known" in frame.columns else frame.copy()
    if work.empty:
        return []
    exclude = {
        "date",
        "gamePk",
        "title",
        "total_full",
        "total_f5",
        "full_over",
        "f5_over",
        "full_side_known",
        "f5_side_known",
        "f5_story",
    }
    feature_cols = [col for col in work.columns if col not in exclude]
    encoded = pd.get_dummies(work[feature_cols], dummy_na=True)
    encoded = encoded.replace([math.inf, -math.inf], pd.NA)
    encoded = encoded.apply(pd.to_numeric, errors="coerce")
    encoded = encoded.fillna(encoded.median(numeric_only=True)).fillna(0)
    encoded = encoded.clip(lower=-1_000_000, upper=1_000_000)
    dates = sorted(work["date"].dropna().unique())
    model_specs = [
        ("rf", lambda seed: RandomForestClassifier(n_estimators=250, min_samples_leaf=4, class_weight="balanced", random_state=seed)),
        ("gb", lambda seed: GradientBoostingClassifier(random_state=seed)),
    ]
    reports: list[dict[str, Any]] = []
    for model_name, factory in model_specs:
        predictions = []
        for date in dates:
            train_idx = work.index[work["date"] < date]
            test_idx = work.index[work["date"] == date]
            if len(train_idx) < min_train or len(test_idx) == 0:
                continue
            model = factory(17)
            model.fit(encoded.loc[train_idx], work.loc[train_idx, target].astype(int))
            pred = model.predict(encoded.loc[test_idx])
            for idx, value in zip(test_idx, pred):
                predictions.append(
                    {
                        "date": work.loc[idx, "date"],
                        "gamePk": work.loc[idx, "gamePk"],
                        "title": work.loc[idx, "title"],
                        "pred": int(value),
                        "actual": int(work.loc[idx, target]),
                    }
                )
        if predictions:
            hits = sum(1 for row in predictions if row["pred"] == row["actual"])
            reports.append(
                {
                    "model": model_name,
                    "rows": len(predictions),
                    "accuracy": round(hits / len(predictions), 3),
                    "byDate": [
                        {
                            "date": date,
                            "rows": len(items),
                            "accuracy": round(sum(1 for row in items if row["pred"] == row["actual"]) / len(items), 3),
                        }
                        for date in sorted({row["date"] for row in predictions})
                        for items in [[row for row in predictions if row["date"] == date]]
                    ],
                }
            )
    return reports


def story_model(frame: pd.DataFrame, min_train: int = 35) -> list[dict[str, Any]]:
    if RandomForestClassifier is None:
        return [{"model": "sklearn unavailable", "rows": 0, "accuracy": None}]
    work = frame.copy()
    exclude = {
        "date",
        "gamePk",
        "title",
        "total_full",
        "total_f5",
        "full_over",
        "f5_over",
        "full_side_known",
        "f5_side_known",
        "f5_story",
    }
    feature_cols = [col for col in work.columns if col not in exclude]
    encoded = pd.get_dummies(work[feature_cols], dummy_na=True)
    encoded = encoded.replace([math.inf, -math.inf], pd.NA)
    encoded = encoded.apply(pd.to_numeric, errors="coerce")
    encoded = encoded.fillna(encoded.median(numeric_only=True)).fillna(0)
    encoded = encoded.clip(lower=-1_000_000, upper=1_000_000)
    dates = sorted(work["date"].dropna().unique())
    predictions = []
    for date in dates:
        train_idx = work.index[work["date"] < date]
        test_idx = work.index[work["date"] == date]
        if len(train_idx) < min_train or len(test_idx) == 0:
            continue
        model = RandomForestClassifier(n_estimators=250, min_samples_leaf=4, class_weight="balanced", random_state=23)
        model.fit(encoded.loc[train_idx], work.loc[train_idx, "f5_story"])
        pred = model.predict(encoded.loc[test_idx])
        for idx, value in zip(test_idx, pred):
            predictions.append(
                {
                    "date": work.loc[idx, "date"],
                    "gamePk": work.loc[idx, "gamePk"],
                    "title": work.loc[idx, "title"],
                    "pred": str(value),
                    "actual": str(work.loc[idx, "f5_story"]),
                }
            )
    if not predictions:
        return []
    hits = sum(1 for row in predictions if row["pred"] == row["actual"])
    return [
        {
            "model": "rf_story",
            "rows": len(predictions),
            "accuracy": round(hits / len(predictions), 3),
            "byDate": [
                {
                    "date": date,
                    "rows": len(items),
                    "accuracy": round(sum(1 for row in items if row["pred"] == row["actual"]) / len(items), 3),
                }
                for date in sorted({row["date"] for row in predictions})
                for items in [[row for row in predictions if row["date"] == date]]
            ],
        }
    ]


def markdown(report: dict[str, Any]) -> str:
    lines = [
        "# MLB-M2 State Formula Parallel Model",
        "",
        f"Range: {report['range']['start']} to {report['range']['end']}",
        "",
        "This is a research baseline that trains simple models on the same pregame state/formula inputs M2 wants to publish. It is not a betting engine.",
        "",
        "## Coverage",
        "",
        f"- Rows: {report['coverage']['rows']}",
        f"- Dates: {', '.join(report['coverage']['dates'])}",
        "",
        "## Training Rows",
        "",
        f"- Export: `{report['artifacts']['trainingRows']}`",
        "",
        "## Forced Projection Baseline",
        "",
        f"- F5 O/U side: {report['baselines']['f5']['accuracy']} on {report['baselines']['f5']['rows']} rows",
        f"- Full-game O/U side: {report['baselines']['full']['accuracy']} on {report['baselines']['full']['rows']} rows",
        "",
        "## Walk-Forward Models",
        "",
        "| Target | Model | Rows | Accuracy |",
        "| --- | --- | ---: | ---: |",
    ]
    for target, rows in report["walkForward"].items():
        for row in rows:
            lines.append(f"| {target} | {row['model']} | {row['rows']} | {row['accuracy']} |")
    lines.extend(
        [
            "",
            "## Interpretation",
            "",
            "- This should run in parallel with formula outputs, not replace them.",
            "- If the trained model beats the formula on a date, inspect the feature drivers and promote the mechanism only if it makes baseball sense.",
            "- If the formula beats the trained model, keep the formula and add the missing learned feature only after walk-forward proof.",
            "- MAE is secondary. O/U side correctness and story-bucket correctness are the headline checks.",
        ]
    )
    return "\n".join(lines)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--start", default="2026-05-10")
    parser.add_argument("--end", default="2026-05-31")
    args = parser.parse_args()
    frame = build_frame(args.start, args.end)
    safe_range = f"{args.start}-to-{args.end}"
    PRIVATE_TRAINING_DIR.mkdir(parents=True, exist_ok=True)
    training_path = PRIVATE_TRAINING_DIR / f"mlb-m2-state-formula-training-rows-{safe_range}.csv"
    if not frame.empty:
        frame.to_csv(training_path, index=False)
    report = {
        "schemaVersion": 1,
        "modelId": "MLB-M2",
        "experiment": "state_formula_parallel_model",
        "range": {"start": args.start, "end": args.end},
        "coverage": {
            "rows": int(len(frame)),
            "dates": sorted(frame["date"].dropna().unique().tolist()) if not frame.empty else [],
        },
        "artifacts": {
            "trainingRows": str(training_path.relative_to(ROOT)),
        },
        "baselines": {
            "f5": baseline_accuracy(frame, "f5_over", "projected_f5_total", "f5_line") if not frame.empty else {},
            "full": baseline_accuracy(frame, "full_over", "projected_full_total", "full_line") if not frame.empty else {},
        },
        "walkForward": {
            "f5_over": walk_forward(frame, "f5_over") if not frame.empty else [],
            "full_over": walk_forward(frame, "full_over") if not frame.empty else [],
            "f5_story": story_model(frame) if not frame.empty else [],
        },
    }
    REPORT_DIR.mkdir(parents=True, exist_ok=True)
    PRIVATE_REPORT_DIR.mkdir(parents=True, exist_ok=True)
    md_path = REPORT_DIR / f"state-formula-parallel-model-{safe_range}.md"
    json_path = PRIVATE_REPORT_DIR / f"mlb-m2-state-formula-parallel-model-{safe_range}.json"
    md_path.write_text(markdown(report))
    json_path.write_text(json.dumps(report, indent=2))
    print(f"Wrote {md_path}")
    print(f"Wrote {json_path}")
    print(json.dumps(report["coverage"], indent=2))


if __name__ == "__main__":
    main()
