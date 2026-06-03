#!/usr/bin/env python3
from __future__ import annotations

import argparse
import hashlib
import json
import math
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import numpy as np

from pipeline.mlb.m3.runs.validate_alpha2_manifest import validate_manifest


ROOT = Path(__file__).resolve().parents[4]
DEFAULT_MANIFEST = (
    ROOT
    / "data-private"
    / "models"
    / "mlb-m3"
    / "runs"
    / "mlb_m3_alpha2_infra_20260603T093000Z"
    / "manifest.json"
)

NON_GOALS = [
    "no picks",
    "no selection rows",
    "no player prop pricing",
    "no market fair probability claims",
    "no simulator event logs",
    "no promotion decisions",
    "no claim that M3 is better",
]

LANE_TARGETS = {
    "full_game_total": {
        "numeric_target": "target_total_runs_final",
        "bucket_target": "target_total_bucket",
    },
    "f5_total": {
        "numeric_target": "target_total_runs_f5",
        "bucket_target": "target_f5_bucket",
    },
}

ROW_PREDICTION_CONTEXT_COLUMNS = [
    "game_id",
    "game_date",
    "game_home_team_id",
    "game_away_team_id",
    "target_total_bucket",
    "target_f5_bucket",
    "target_chaos_game_flag",
    "target_bullpen_flip_flag",
    "target_home_starter_cracked_flag",
    "target_away_starter_cracked_flag",
    "target_home_traffic_no_conversion_flag",
    "target_away_traffic_no_conversion_flag",
]

FORBIDDEN_OUTPUT_TERMS = {
    "pick",
    "selection",
    "stake",
    "bankroll",
    "fair_probability",
    "fair_price",
    "prop_price",
    "simulated_event",
    "promotion_decision",
}


def utc_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace(
        "+00:00", "Z"
    )


def resolve_path(value: str | Path) -> Path:
    path = Path(value)
    if path.is_absolute():
        return path
    return ROOT / path


def load_json(path: Path) -> dict[str, Any]:
    with path.open("r", encoding="utf-8") as handle:
        payload = json.load(handle)
    if not isinstance(payload, dict):
        raise ValueError(f"Expected JSON object: {path}")
    return payload


def write_json(path: Path, payload: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8")


def json_safe(value: Any) -> Any:
    if value is None:
        return None
    if hasattr(value, "item"):
        value = value.item()
    if isinstance(value, float) and (math.isnan(value) or math.isinf(value)):
        return None
    if isinstance(value, (int, float, str, bool)):
        return value
    return str(value)


def write_jsonl(path: Path, rows: list[dict[str, Any]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as handle:
        for row in rows:
            handle.write(json.dumps(row, sort_keys=True) + "\n")


def sha256_path(path: Path) -> str | None:
    if not path.exists() or not path.is_file():
        return None
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def load_matrix(matrix_uri: str):
    try:
        import duckdb  # type: ignore
    except ImportError as exc:
        raise RuntimeError(
            "DuckDB is required to read M3 feature matrix Parquet files. "
            "Use the workspace Python runtime with duckdb installed."
        ) from exc
    matrix_path = resolve_path(matrix_uri)
    if not matrix_path.exists():
        raise FileNotFoundError(f"Feature matrix does not exist: {matrix_path}")
    con = duckdb.connect(database=":memory:")
    try:
        return con.execute(
            "select * from read_parquet(?) order by game_date, game_id",
            [str(matrix_path)],
        ).fetchdf()
    finally:
        con.close()


def safe_float(value: Any) -> float | None:
    if value is None:
        return None
    try:
        result = float(value)
    except (TypeError, ValueError):
        return None
    if math.isnan(result) or math.isinf(result):
        return None
    return result


def numeric_metrics(actual: list[float], predicted: list[float]) -> dict[str, Any]:
    if not actual:
        return {
            "row_count": 0,
            "mae": None,
            "rmse": None,
            "mean_error": None,
        }
    errors = [p - a for a, p in zip(actual, predicted)]
    abs_errors = [abs(error) for error in errors]
    sq_errors = [error * error for error in errors]
    return {
        "row_count": len(actual),
        "mae": sum(abs_errors) / len(abs_errors),
        "rmse": math.sqrt(sum(sq_errors) / len(sq_errors)),
        "mean_error": sum(errors) / len(errors),
    }


def build_row_prediction_records(
    validation_rows,
    actual: list[float],
    predicted,
    lane: str,
    target_column: str,
    split_kind: str,
    fold_id: str,
    baseline_prediction: float | None,
) -> list[dict[str, Any]]:
    records: list[dict[str, Any]] = []
    predictions = [float(value) for value in predicted.tolist()]
    for position, (_, row) in enumerate(validation_rows.iterrows()):
        actual_value = float(actual[position])
        predicted_value = predictions[position]
        residual = predicted_value - actual_value
        baseline_residual = (
            None if baseline_prediction is None else baseline_prediction - actual_value
        )
        record: dict[str, Any] = {
            "lane": lane,
            "split_kind": split_kind,
            "fold_id": fold_id,
            "target_column": target_column,
            "actual": actual_value,
            "prediction": predicted_value,
            "residual_prediction_minus_actual": residual,
            "abs_error": abs(residual),
            "baseline_prediction": baseline_prediction,
            "baseline_residual_prediction_minus_actual": baseline_residual,
            "baseline_abs_error": None
            if baseline_residual is None
            else abs(baseline_residual),
            "model_kind": "ridge_linear_regression_numpy_v0",
            "status": "diagnostic_prediction_not_promoted",
            "not_a_pick": True,
            "not_a_price": True,
            "not_a_probability": True,
        }
        for column in ROW_PREDICTION_CONTEXT_COLUMNS:
            if column in row.index:
                record[column] = json_safe(row[column])
        records.append(record)
    return records


def bucket_counts(values: list[Any]) -> dict[str, int]:
    counts: dict[str, int] = {}
    for value in values:
        key = "null" if value is None else str(value)
        counts[key] = counts.get(key, 0) + 1
    return dict(sorted(counts.items(), key=lambda item: item[0]))


def bucket_baseline_metrics(train_values: list[Any], validation_values: list[Any]) -> dict[str, Any]:
    train_counts = bucket_counts(train_values)
    validation_counts = bucket_counts(validation_values)
    total = sum(train_counts.values())
    frequencies = {
        key: count / total for key, count in train_counts.items() if total > 0
    }
    top_class = max(frequencies.items(), key=lambda item: item[1])[0] if frequencies else None
    validation_non_null = [value for value in validation_values if value is not None]
    accuracy = None
    if validation_non_null and top_class is not None:
        accuracy = sum(1 for value in validation_non_null if str(value) == top_class) / len(
            validation_non_null
        )
    return {
        "train_counts": train_counts,
        "validation_counts": validation_counts,
        "train_frequency_baseline": frequencies,
        "top_class_baseline": top_class,
        "top_class_validation_accuracy": accuracy,
    }


def feature_target_columns(manifest: dict[str, Any]) -> tuple[list[str], list[str], list[str]]:
    feature_contract = manifest.get("feature_contract", {})
    target_contract = manifest.get("target_contract", {})
    feature_columns = list(feature_contract.get("feature_columns", []))
    target_columns = list(target_contract.get("available_target_columns", []))
    metadata_columns = list(feature_contract.get("metadata_columns", []))
    return feature_columns, target_columns, metadata_columns


def split_frames(df, split_plan: dict[str, Any]):
    train_start = split_plan.get("train_candidate_range", {}).get("start")
    train_end = split_plan.get("train_candidate_range", {}).get("end")
    validation_start = split_plan.get("validation_candidate_range", {}).get("start")
    validation_end = split_plan.get("validation_candidate_range", {}).get("end")
    if not all([train_start, train_end, validation_start, validation_end]):
        raise ValueError("Manifest split plan is missing train or validation dates.")
    if not train_end < validation_start:
        raise ValueError("Train end date must be strictly before validation start date.")

    dates = df["game_date"].astype(str)
    train_df = df[(dates >= train_start) & (dates <= train_end)].copy()
    validation_df = df[(dates >= validation_start) & (dates <= validation_end)].copy()
    return train_df, validation_df


def summarize_split(train_df, validation_df, split_plan: dict[str, Any]) -> dict[str, Any]:
    return {
        "status": "split_created",
        "policy": split_plan.get("policy"),
        "train_candidate_range": split_plan.get("train_candidate_range"),
        "validation_candidate_range": split_plan.get("validation_candidate_range"),
        "train_row_count": int(len(train_df)),
        "validation_row_count": int(len(validation_df)),
        "train_min_game_date": None if train_df.empty else str(train_df["game_date"].min()),
        "train_max_game_date": None if train_df.empty else str(train_df["game_date"].max()),
        "validation_min_game_date": None
        if validation_df.empty
        else str(validation_df["game_date"].min()),
        "validation_max_game_date": None
        if validation_df.empty
        else str(validation_df["game_date"].max()),
        "not_a_backtest": True,
    }


def target_summary(df, target_columns: list[str]) -> dict[str, Any]:
    summary: dict[str, Any] = {}
    for column in target_columns:
        if column not in df.columns:
            summary[column] = {"present": False}
            continue
        values = df[column].tolist()
        numeric = [safe_float(value) for value in values]
        numeric_clean = [value for value in numeric if value is not None]
        payload: dict[str, Any] = {
            "present": True,
            "row_count": len(values),
            "missing_count": sum(1 for value in values if value is None),
        }
        if numeric_clean and len(numeric_clean) >= len(values) * 0.8:
            payload.update(
                {
                    "numeric": True,
                    "mean": float(sum(numeric_clean) / len(numeric_clean)),
                    "min": float(min(numeric_clean)),
                    "max": float(max(numeric_clean)),
                }
            )
        else:
            payload.update({"numeric": False, "counts": bucket_counts(values)})
        summary[column] = payload
    return summary


def lane_report(lane: str, train_df, validation_df) -> dict[str, Any]:
    targets = LANE_TARGETS[lane]
    numeric_target = targets["numeric_target"]
    bucket_target = targets["bucket_target"]
    train_values = [
        value for value in (safe_float(value) for value in train_df[numeric_target].tolist()) if value is not None
    ]
    validation_actual = [
        value
        for value in (safe_float(value) for value in validation_df[numeric_target].tolist())
        if value is not None
    ]
    train_mean = sum(train_values) / len(train_values) if train_values else None
    predictions = [train_mean for _ in validation_actual] if train_mean is not None else []
    return {
        "lane": lane,
        "status": "metrics_only",
        "numeric_target": numeric_target,
        "bucket_target": bucket_target,
        "train_row_count": int(len(train_df)),
        "validation_row_count": int(len(validation_df)),
        "train_target_mean_baseline": train_mean,
        "validation_mean_baseline_metrics": numeric_metrics(validation_actual, predictions),
        "bucket_frequency_baseline": bucket_baseline_metrics(
            train_df[bucket_target].tolist(),
            validation_df[bucket_target].tolist(),
        ),
        "non_goals": NON_GOALS,
    }


def numeric_feature_frame(df, feature_columns: list[str]):
    numeric_columns: list[str] = []
    for column in feature_columns:
        if column not in df.columns:
            continue
        if column.endswith("_id") or column in {"game_venue_id"}:
            continue
        converted = df[column].map(safe_float)
        non_null = converted.notna().sum()
        if non_null >= max(10, int(len(df) * 0.1)):
            numeric_columns.append(column)
    return numeric_columns


def infer_feature_family(column: str) -> str:
    if "story_" in column:
        return "story_memory"
    if "starter_" in column:
        return "starter_path"
    if "reliever_" in column or "relief_" in column:
        return "reliever_chain"
    if "hitter_path" in column or "lineup" in column:
        return "hitter_path"
    if "context_" in column or column.startswith("game_day") or column.startswith("game_is_") or column.startswith("game_start_hour") or column.startswith("game_series"):
        return "game_context"
    if column.startswith("market_"):
        return "market_context"
    if column.startswith("game_"):
        return "game_metadata"
    return "other"


def fit_ridge(
    train_df,
    validation_df,
    feature_columns: list[str],
    target_column: str,
    feature_subset_label: str = "all_features",
    include_row_predictions: bool = False,
    prediction_context: dict[str, Any] | None = None,
    baseline_prediction: float | None = None,
) -> dict[str, Any]:
    candidate_columns = numeric_feature_frame(train_df, feature_columns)
    if not candidate_columns:
        return {
            "status": "skipped",
            "reason": "no numeric feature columns available",
            "target_column": target_column,
            "feature_subset_label": feature_subset_label,
        }

    train_target = train_df[target_column].map(safe_float)
    validation_target = validation_df[target_column].map(safe_float)
    train_mask = train_target.notna()
    validation_mask = validation_target.notna()
    train_use = train_df.loc[train_mask, candidate_columns].copy()
    validation_use = validation_df.loc[validation_mask, candidate_columns].copy()
    validation_rows = validation_df.loc[validation_mask].copy()
    y_train = train_target.loc[train_mask].to_numpy(dtype=float)
    y_validation = validation_target.loc[validation_mask].to_numpy(dtype=float)
    if len(y_train) < 20 or len(y_validation) < 5:
        return {
            "status": "skipped",
            "reason": "not enough train or validation target rows",
            "target_column": target_column,
            "feature_subset_label": feature_subset_label,
            "train_rows": int(len(y_train)),
            "validation_rows": int(len(y_validation)),
        }

    x_train_raw = train_use.map(safe_float).astype(float)
    x_validation_raw = validation_use.map(safe_float).astype(float)
    means = x_train_raw.mean(skipna=True)
    means = means.fillna(0.0)
    stds = x_train_raw.std(skipna=True, ddof=0).replace(0.0, 1.0).fillna(1.0)
    x_train = ((x_train_raw.fillna(means) - means) / stds).to_numpy(dtype=float)
    x_validation = ((x_validation_raw.fillna(means) - means) / stds).to_numpy(dtype=float)

    intercept = np.ones((x_train.shape[0], 1))
    x_design = np.hstack([intercept, x_train])
    ridge_alpha = 10.0
    penalty = np.eye(x_design.shape[1]) * ridge_alpha
    penalty[0, 0] = 0.0
    weights = np.linalg.pinv(x_design.T @ x_design + penalty) @ x_design.T @ y_train
    validation_design = np.hstack([np.ones((x_validation.shape[0], 1)), x_validation])
    y_pred = validation_design @ weights
    metrics = numeric_metrics(y_validation.tolist(), y_pred.tolist())
    coef_pairs = sorted(
        zip(candidate_columns, weights[1:].tolist()),
        key=lambda item: abs(item[1]),
        reverse=True,
    )
    notes = ["Diagnostic component only; not promoted."]
    if include_row_predictions:
        notes.append(
            "Row-level validation predictions are diagnostic residual artifacts only; no picks, prices, or probabilities are written."
        )
    else:
        notes.append("No row-level predictions, picks, prices, or selection rows are written.")
    result = {
        "status": "candidate_diagnostic_not_promoted",
        "model_kind": "ridge_linear_regression_numpy_v0",
        "target_column": target_column,
        "component_family": "team_run_distribution",
        "feature_subset_label": feature_subset_label,
        "ridge_alpha": ridge_alpha,
        "train_rows": int(len(y_train)),
        "validation_rows": int(len(y_validation)),
        "feature_count": len(candidate_columns),
        "validation_metrics": metrics,
        "intercept": float(weights[0]),
        "top_coefficients": [
            {"feature": feature, "coefficient": float(coef)}
            for feature, coef in coef_pairs[:25]
        ],
        "non_goals": NON_GOALS,
        "notes": notes,
    }
    if include_row_predictions:
        context = prediction_context or {}
        result["_row_predictions"] = build_row_prediction_records(
            validation_rows,
            y_validation.tolist(),
            y_pred,
            str(context.get("lane", "unknown")),
            target_column,
            str(context.get("split_kind", "validation")),
            str(context.get("fold_id", "validation")),
            baseline_prediction,
        )
    return result


def month_key(value: Any) -> str:
    text = str(value)
    return text[:7]


def monthly_lane_metrics(validation_df, lane: str, train_mean: float | None) -> dict[str, Any]:
    target = LANE_TARGETS[lane]["numeric_target"]
    payload: dict[str, Any] = {}
    for month in sorted({month_key(value) for value in validation_df["game_date"].tolist()}):
        month_df = validation_df[validation_df["game_date"].astype(str).str.startswith(month)]
        actual = [
            value
            for value in (safe_float(value) for value in month_df[target].tolist())
            if value is not None
        ]
        predicted = [train_mean for _ in actual] if train_mean is not None else []
        payload[month] = numeric_metrics(actual, predicted)
    return payload


def fixed_walk_forward_folds(df) -> list[dict[str, str]]:
    dates = sorted(str(value)[:10] for value in df["game_date"].dropna().unique())
    if not dates:
        return []
    candidates = [
        {
            "fold_id": "wf_2026_05_01_to_2026_05_15",
            "train_start": dates[0],
            "train_end": "2026-04-30",
            "validation_start": "2026-05-01",
            "validation_end": "2026-05-15",
        },
        {
            "fold_id": "wf_2026_05_16_to_2026_05_31",
            "train_start": dates[0],
            "train_end": "2026-05-15",
            "validation_start": "2026-05-16",
            "validation_end": "2026-05-31",
        },
    ]
    folds = []
    for fold in candidates:
        if fold["train_end"] < dates[0] or fold["validation_start"] > dates[-1]:
            continue
        folds.append(fold)
    return folds


def frame_for_dates(df, start: str, end: str):
    dates = df["game_date"].astype(str)
    return df[(dates >= start) & (dates <= end)].copy()


def run_walk_forward(
    df,
    lanes: list[str],
    feature_columns: list[str],
    candidate_model: bool,
    row_prediction_dir: Path | None = None,
) -> dict[str, Any]:
    folds = fixed_walk_forward_folds(df)
    payload: dict[str, Any] = {
        "status": "walk_forward_metrics_created",
        "fold_count": len(folds),
        "folds": [],
        "row_prediction_artifacts": [],
        "non_goals": NON_GOALS,
    }
    for fold in folds:
        train_df = frame_for_dates(df, fold["train_start"], fold["train_end"])
        validation_df = frame_for_dates(df, fold["validation_start"], fold["validation_end"])
        fold_payload: dict[str, Any] = {
            **fold,
            "train_row_count": int(len(train_df)),
            "validation_row_count": int(len(validation_df)),
            "lanes": {},
        }
        if len(train_df) < 100 or len(validation_df) < 20:
            fold_payload["status"] = "skipped_low_rows"
            payload["folds"].append(fold_payload)
            continue
        fold_payload["status"] = "metrics_created"
        for lane in lanes:
            lane_metrics = lane_report(lane, train_df, validation_df)
            lane_payload: dict[str, Any] = {
                "baseline": lane_metrics["validation_mean_baseline_metrics"],
            }
            if candidate_model:
                target_column = LANE_TARGETS[lane]["numeric_target"]
                candidate = fit_ridge(
                    train_df,
                    validation_df,
                    feature_columns,
                    target_column,
                    feature_subset_label="walk_forward_all_features",
                    include_row_predictions=row_prediction_dir is not None,
                    prediction_context={
                        "lane": lane,
                        "split_kind": "walk_forward_validation",
                        "fold_id": fold["fold_id"],
                    },
                    baseline_prediction=lane_metrics["train_target_mean_baseline"],
                )
                if row_prediction_dir is not None:
                    records = candidate.pop("_row_predictions", [])
                    path = row_prediction_dir / f"walk_forward_{fold['fold_id']}_{lane}.jsonl"
                    write_jsonl(path, records)
                    artifact = artifact_entry(
                        f"row_predictions_walk_forward_{fold['fold_id']}_{lane}",
                        path,
                    )
                    artifact["row_count"] = len(records)
                    candidate["row_prediction_artifact"] = artifact
                    payload["row_prediction_artifacts"].append(artifact)
                lane_payload["candidate"] = candidate
            fold_payload["lanes"][lane] = lane_payload
        payload["folds"].append(fold_payload)
    return payload


def run_family_ablations(
    train_df,
    validation_df,
    lanes: list[str],
    feature_columns: list[str],
) -> dict[str, Any]:
    families = sorted({infer_feature_family(column) for column in feature_columns})
    payload: dict[str, Any] = {
        "status": "family_ablation_metrics_created",
        "families": families,
        "lanes": {},
        "non_goals": NON_GOALS,
    }
    for lane in lanes:
        target_column = LANE_TARGETS[lane]["numeric_target"]
        lane_payload: dict[str, Any] = {
            "all_features": fit_ridge(
                train_df,
                validation_df,
                feature_columns,
                target_column,
                feature_subset_label="all_features",
            ),
            "without_family": {},
            "only_family": {},
        }
        for family in families:
            if family in {"target", "metadata"}:
                continue
            without = [
                column
                for column in feature_columns
                if infer_feature_family(column) != family
            ]
            only = [
                column
                for column in feature_columns
                if infer_feature_family(column) == family
            ]
            lane_payload["without_family"][family] = fit_ridge(
                train_df,
                validation_df,
                without,
                target_column,
                feature_subset_label=f"without_{family}",
            )
            lane_payload["only_family"][family] = fit_ridge(
                train_df,
                validation_df,
                only,
                target_column,
                feature_subset_label=f"only_{family}",
            )
        payload["lanes"][lane] = lane_payload
    return payload


def artifact_entry(role: str, path: Path) -> dict[str, Any]:
    return {
        "role": role,
        "path": str(path),
        "exists": path.exists(),
        "sha256": sha256_path(path),
        "bytes": path.stat().st_size if path.exists() else None,
    }


def report_markdown(run_id: str, manifest_path: Path, harness_dir: Path, lanes: list[str]) -> str:
    return "\n".join(
        [
            "# MLB-M3 Alpha-3 Harness Report",
            "",
            f"Source manifest: `{manifest_path}`",
            "",
            f"Harness directory: `{harness_dir}`",
            "",
            "Status: `harness_metrics_created`",
            "",
            "This is a metrics-only harness run. It does not produce picks, fair prices, prop prices, simulator events, staking output, promotion decisions, or edge claims.",
            "",
            "Optional row-level prediction artifacts, when enabled, are diagnostic validation residual rows only. They are not picks, prices, probabilities, or promotion decisions.",
            "",
            "Lanes:",
            "",
            *[f"- `{lane}`" for lane in lanes],
            "",
        ]
    )


def run_harness(
    manifest_path: Path,
    output_subdir: str,
    candidate_model: bool,
    lanes: list[str],
    walk_forward: bool,
    family_ablations: bool,
    row_predictions: bool,
) -> dict[str, Any]:
    manifest_path = resolve_path(manifest_path)
    validation = validate_manifest(manifest_path)
    if not validation["ok"]:
        raise RuntimeError("Alpha-2 manifest validation failed: " + json.dumps(validation))
    manifest = load_json(manifest_path)
    run_id = manifest["run_id"]
    run_dir = manifest_path.parent
    harness_dir = run_dir / output_subdir
    lane_dir = harness_dir / "lane_reports"
    candidate_dir = harness_dir / "candidate_models"
    row_prediction_dir = harness_dir / "row_predictions" if row_predictions else None
    harness_dir.mkdir(parents=True, exist_ok=True)
    lane_dir.mkdir(parents=True, exist_ok=True)
    if candidate_model:
        candidate_dir.mkdir(parents=True, exist_ok=True)
    if row_prediction_dir is not None:
        row_prediction_dir.mkdir(parents=True, exist_ok=True)

    started_at = utc_now()
    feature_columns, target_columns, metadata_columns = feature_target_columns(manifest)
    forbidden_feature_targets = [column for column in feature_columns if column.startswith("target_")]
    if forbidden_feature_targets:
        raise RuntimeError(
            "Feature contract includes target columns: "
            + ", ".join(forbidden_feature_targets)
        )
    matrix_uri = manifest["feature_artifact"]["matrix_uri"]
    df = load_matrix(matrix_uri)
    split_plan = manifest["data_split_plan"]
    train_df, validation_df = split_frames(df, split_plan)
    split = summarize_split(train_df, validation_df, split_plan)
    targets = target_summary(df, target_columns)

    lane_reports: dict[str, Any] = {}
    for lane in lanes:
        if lane not in LANE_TARGETS:
            raise ValueError(f"Unsupported alpha-3 lane: {lane}")
        report = lane_report(lane, train_df, validation_df)
        train_mean = report["train_target_mean_baseline"]
        report["monthly_validation_mean_baseline_metrics"] = monthly_lane_metrics(
            validation_df, lane, train_mean
        )
        lane_reports[lane] = report
        write_json(lane_dir / f"{lane}.json", report)

    candidate_reports: dict[str, Any] = {}
    row_prediction_artifacts: list[dict[str, Any]] = []
    if candidate_model:
        for lane in lanes:
            target_column = LANE_TARGETS[lane]["numeric_target"]
            report = fit_ridge(train_df, validation_df, feature_columns, target_column)
            if row_prediction_dir is not None:
                report = fit_ridge(
                    train_df,
                    validation_df,
                    feature_columns,
                    target_column,
                    include_row_predictions=True,
                    prediction_context={
                        "lane": lane,
                        "split_kind": "manifest_validation",
                        "fold_id": "manifest_validation",
                    },
                    baseline_prediction=lane_reports[lane]["train_target_mean_baseline"],
                )
                records = report.pop("_row_predictions", [])
                prediction_path = row_prediction_dir / f"manifest_validation_{lane}.jsonl"
                write_jsonl(prediction_path, records)
                artifact = artifact_entry(
                    f"row_predictions_manifest_validation_{lane}",
                    prediction_path,
                )
                artifact["row_count"] = len(records)
                report["row_prediction_artifact"] = artifact
                row_prediction_artifacts.append(artifact)
            candidate_reports[lane] = report
            write_json(candidate_dir / f"{lane}_ridge_numpy_v0.json", report)

    walk_forward_report: dict[str, Any] | None = None
    if walk_forward:
        walk_forward_report = run_walk_forward(
            df,
            lanes,
            feature_columns,
            candidate_model,
            row_prediction_dir=row_prediction_dir,
        )
        row_prediction_artifacts.extend(walk_forward_report.get("row_prediction_artifacts", []))
        write_json(harness_dir / "walk_forward.json", walk_forward_report)

    family_ablation_report: dict[str, Any] | None = None
    if family_ablations:
        family_ablation_report = run_family_ablations(
            train_df,
            validation_df,
            lanes,
            feature_columns,
        )
        write_json(harness_dir / "family_ablations.json", family_ablation_report)

    calibration_placeholder = {
        "status": "placeholder_not_calibrated",
        "reason": "Alpha-3 writes metrics-only diagnostics before probability calibration.",
        "lanes": lanes,
        "non_goals": NON_GOALS,
    }

    finished_at = utc_now()
    metrics = {
        "run_id": run_id,
        "source_manifest_uri": str(manifest_path),
        "feature_artifact_uri": matrix_uri,
        "status": "harness_metrics_created",
        "started_at": started_at,
        "finished_at": finished_at,
        "lanes": lanes,
        "split_summary": split,
        "target_summary_uri": str(harness_dir / "target_summary.json"),
        "lane_reports": {
            lane: str(lane_dir / f"{lane}.json") for lane in lanes
        },
        "candidate_models": {
            lane: str(candidate_dir / f"{lane}_ridge_numpy_v0.json")
            for lane in candidate_reports
        },
        "row_predictions_enabled": row_predictions,
        "row_prediction_artifacts": row_prediction_artifacts,
        "walk_forward_uri": str(harness_dir / "walk_forward.json") if walk_forward else None,
        "family_ablations_uri": str(harness_dir / "family_ablations.json") if family_ablations else None,
        "warnings": [],
        "non_goals": NON_GOALS,
    }
    dashboard_state = {
        "run_id": run_id,
        "status": "harness_metrics_created",
        "active_phase": "harness_metrics_created",
        "source_manifest_uri": str(manifest_path),
        "harness_dir": str(harness_dir),
        "split_summary": split,
        "lanes": {
            lane: {
                "status": lane_reports[lane]["status"],
                "report_uri": str(lane_dir / f"{lane}.json"),
            }
            for lane in lanes
        },
        "candidate_model_enabled": candidate_model,
        "row_predictions_enabled": row_predictions,
        "row_prediction_artifact_count": len(row_prediction_artifacts),
        "row_prediction_artifacts": row_prediction_artifacts,
        "walk_forward_enabled": walk_forward,
        "family_ablations_enabled": family_ablations,
        "candidate_model_status": {
            lane: candidate_reports[lane]["status"] for lane in candidate_reports
        },
        "warnings": [],
        "non_goals": NON_GOALS,
        "next_recommended_actions": [
            "Review feature coverage and split health before adding richer models.",
            "Compare this harness output against prior feature-set diagnostics before adding richer model families.",
            "Keep candidate components diagnostic until walk-forward backtests exist.",
        ],
    }
    registry_preview = {
        "status": "preview_only_not_inserted",
        "source_manifest_uri": str(manifest_path),
        "model_run_update": {
            "model_run_id": run_id,
            "status": "harness_metrics_created",
            "run_type": "diagnostic_harness",
            "output_count": 0,
            "notes": "Metrics-only alpha-3 harness; no picks, prices, simulator output, or promotion.",
        },
        "model_run_lanes": [
            {
                "model_run_lane_id": f"{run_id}:{lane}:alpha3",
                "model_run_id": run_id,
                "lane": lane,
                "status": "metrics_only",
                "row_count": lane_reports[lane]["validation_row_count"],
                "graded_count": lane_reports[lane]["validation_mean_baseline_metrics"][
                    "row_count"
                ],
                "hit_count": None,
                "miss_count": None,
                "hit_pct": None,
                "avg_pnl_per100": None,
                "details_json": lane_reports[lane],
            }
            for lane in lanes
        ],
        "model_component_runs": [
            {
                "model_component_run_id": f"{run_id}:{lane}:ridge_numpy_v0",
                "parent_model_run_id": run_id,
                "component_model_id": "ridge_linear_regression_numpy_v0",
                "component_role": "diagnostic_candidate",
                "status": candidate_reports[lane]["status"],
                "row_prediction_artifact": candidate_reports[lane].get(
                    "row_prediction_artifact"
                ),
                "details_json": candidate_reports[lane],
            }
            for lane in candidate_reports
        ],
    }

    write_json(harness_dir / "split_summary.json", split)
    write_json(harness_dir / "target_summary.json", targets)
    write_json(harness_dir / "calibration_placeholder.json", calibration_placeholder)
    write_json(harness_dir / "metrics.json", metrics)
    write_json(harness_dir / "dashboard_state.json", dashboard_state)
    write_json(harness_dir / "typed_model_registry_preview_alpha3.json", registry_preview)
    (harness_dir / "report.md").write_text(
        report_markdown(run_id, manifest_path, harness_dir, lanes),
        encoding="utf-8",
    )

    artifacts = {
        "run_id": run_id,
        "status": "harness_metrics_created",
        "artifacts": [
            artifact_entry("metrics", harness_dir / "metrics.json"),
            artifact_entry("split_summary", harness_dir / "split_summary.json"),
            artifact_entry("target_summary", harness_dir / "target_summary.json"),
            artifact_entry("calibration_placeholder", harness_dir / "calibration_placeholder.json"),
            artifact_entry("dashboard_state", harness_dir / "dashboard_state.json"),
            artifact_entry("typed_registry_preview_alpha3", harness_dir / "typed_model_registry_preview_alpha3.json"),
            artifact_entry("report", harness_dir / "report.md"),
            *(
                [artifact_entry("walk_forward", harness_dir / "walk_forward.json")]
                if walk_forward
                else []
            ),
            *(
                [artifact_entry("family_ablations", harness_dir / "family_ablations.json")]
                if family_ablations
                else []
            ),
            *[
                artifact_entry(f"lane_report_{lane}", lane_dir / f"{lane}.json")
                for lane in lanes
            ],
            *[
                artifact_entry(
                    f"candidate_model_{lane}",
                    candidate_dir / f"{lane}_ridge_numpy_v0.json",
                )
                for lane in candidate_reports
            ],
            *row_prediction_artifacts,
        ],
    }
    write_json(harness_dir / "artifacts.json", artifacts)

    summary = {
        "ok": True,
        "run_id": run_id,
        "harness_dir": str(harness_dir),
        "status": "harness_metrics_created",
        "train_rows": split["train_row_count"],
        "validation_rows": split["validation_row_count"],
        "lanes": lanes,
        "candidate_model_enabled": candidate_model,
        "row_predictions_enabled": row_predictions,
        "row_prediction_artifact_count": len(row_prediction_artifacts),
        "walk_forward_enabled": walk_forward,
        "family_ablations_enabled": family_ablations,
        "non_goals": NON_GOALS,
    }
    print(json.dumps(summary, indent=2, sort_keys=True))
    return summary


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Run the MLB-M3 alpha-3 metrics-only harness."
    )
    parser.add_argument("--manifest", type=Path, default=DEFAULT_MANIFEST)
    parser.add_argument(
        "--output-subdir",
        default="training_harness",
        help="Subdirectory under the manifest run dir for harness outputs.",
    )
    parser.add_argument(
        "--lane",
        action="append",
        choices=sorted(LANE_TARGETS),
        help="Lane to run. May be passed multiple times. Defaults to totals and F5.",
    )
    parser.add_argument(
        "--candidate-model",
        action="store_true",
        help="Fit diagnostic NumPy ridge candidates behind component slots.",
    )
    parser.add_argument(
        "--walk-forward",
        action="store_true",
        help="Write fixed walk-forward fold diagnostics.",
    )
    parser.add_argument(
        "--family-ablations",
        action="store_true",
        help="Write feature-family ablation diagnostics.",
    )
    parser.add_argument(
        "--row-predictions",
        action="store_true",
        help="Write diagnostic row-level validation predictions and residuals for candidate models.",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    lanes = args.lane or ["full_game_total", "f5_total"]
    if args.row_predictions and not args.candidate_model:
        print(
            json.dumps(
                {
                    "ok": False,
                    "error": "--row-predictions requires --candidate-model.",
                },
                indent=2,
            ),
            file=sys.stderr,
        )
        sys.exit(1)
    try:
        run_harness(
            args.manifest,
            args.output_subdir,
            args.candidate_model,
            lanes,
            args.walk_forward,
            args.family_ablations,
            args.row_predictions,
        )
    except Exception as exc:
        print(json.dumps({"ok": False, "error": str(exc)}, indent=2), file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
