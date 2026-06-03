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

from pipeline.mlb.m3.harness.run_alpha3_harness import (
    LANE_TARGETS,
    load_matrix,
    numeric_metrics,
    safe_float,
    split_frames,
)
from pipeline.mlb.m3.runs.validate_alpha2_manifest import validate_manifest


ROOT = Path(__file__).resolve().parents[4]
DEFAULT_MANIFEST = (
    ROOT
    / "data-private"
    / "models"
    / "mlb-m3"
    / "runs"
    / "mlb_m3_alpha2_infra_fs004_20260603T174500Z"
    / "manifest.json"
)
DEFAULT_HARNESS_DIR = DEFAULT_MANIFEST.parent / "training_harness_alpha6"
DEFAULT_OUTPUT_SUBDIR = "tail_calibration_alpha6"
VERSION = "0.1.0"

NON_GOALS = [
    "no picks",
    "no selection rows",
    "no player prop pricing",
    "no market fair probability claims",
    "no simulator event logs",
    "no promotion decisions",
    "no claim that M3 is better",
]

TAIL_TARGET_COLUMNS = [
    "target_total_bucket",
    "target_f5_bucket",
    "target_chaos_game_flag",
    "target_bullpen_flip_flag",
    "target_home_starter_cracked_flag",
    "target_away_starter_cracked_flag",
    "target_home_traffic_no_conversion_flag",
    "target_away_traffic_no_conversion_flag",
]

NUMERIC_TARGET_COLUMNS = [
    "target_total_runs_final",
    "target_total_runs_f5",
    "target_home_team_runs_final",
    "target_away_team_runs_final",
    "target_home_team_runs_f5",
    "target_away_team_runs_f5",
]

FLAG_COLUMNS = [
    "target_chaos_game_flag",
    "target_bullpen_flip_flag",
    "target_home_starter_cracked_flag",
    "target_away_starter_cracked_flag",
    "target_home_traffic_no_conversion_flag",
    "target_away_traffic_no_conversion_flag",
]

BUCKET_COLUMNS = ["target_total_bucket", "target_f5_bucket"]


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


def sha256_path(path: Path) -> str | None:
    if not path.exists() or not path.is_file():
        return None
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def artifact_entry(role: str, path: Path) -> dict[str, Any]:
    return {
        "role": role,
        "path": str(path),
        "exists": path.exists(),
        "sha256": sha256_path(path),
        "bytes": path.stat().st_size if path.exists() else None,
    }


def count_values(values: list[Any]) -> dict[str, int]:
    counts: dict[str, int] = {}
    for value in values:
        key = "null" if value is None else str(value)
        counts[key] = counts.get(key, 0) + 1
    return dict(sorted(counts.items(), key=lambda item: item[0]))


def clean_numbers(values: list[Any]) -> list[float]:
    cleaned: list[float] = []
    for value in values:
        parsed = safe_float(value)
        if parsed is not None:
            cleaned.append(parsed)
    return cleaned


def numeric_summary(values: list[Any]) -> dict[str, Any]:
    cleaned = clean_numbers(values)
    if not cleaned:
        return {
            "row_count": len(values),
            "non_null_count": 0,
            "mean": None,
            "stddev": None,
            "min": None,
            "max": None,
        }
    mean = sum(cleaned) / len(cleaned)
    variance = sum((value - mean) ** 2 for value in cleaned) / len(cleaned)
    return {
        "row_count": len(values),
        "non_null_count": len(cleaned),
        "mean": mean,
        "stddev": math.sqrt(variance),
        "min": min(cleaned),
        "max": max(cleaned),
    }


def numeric_target_summary(df) -> dict[str, Any]:
    summary: dict[str, Any] = {}
    for column in NUMERIC_TARGET_COLUMNS:
        if column not in df.columns:
            summary[column] = {"present": False}
            continue
        summary[column] = {"present": True, **numeric_summary(df[column].tolist())}
    return summary


def target_distribution_summary(df) -> dict[str, Any]:
    summary: dict[str, Any] = {
        "row_count": int(len(df)),
        "bucket_columns": {},
        "flag_columns": {},
        "numeric_targets": numeric_target_summary(df),
    }
    for column in BUCKET_COLUMNS:
        if column not in df.columns:
            summary["bucket_columns"][column] = {"present": False}
            continue
        summary["bucket_columns"][column] = {
            "present": True,
            "counts": count_values(df[column].tolist()),
        }
    for column in FLAG_COLUMNS:
        if column not in df.columns:
            summary["flag_columns"][column] = {"present": False}
            continue
        values = clean_numbers(df[column].tolist())
        summary["flag_columns"][column] = {
            "present": True,
            "row_count": int(len(df)),
            "positive_count": int(sum(1 for value in values if value == 1.0)),
            "positive_rate": (sum(1 for value in values if value == 1.0) / len(values))
            if values
            else None,
        }
    return summary


def slice_frames(df) -> list[tuple[str, str, Any]]:
    slices: list[tuple[str, str, Any]] = [("all", "All rows", df)]
    for column in BUCKET_COLUMNS:
        if column not in df.columns:
            continue
        for value in sorted({str(value) for value in df[column].dropna().tolist()}):
            mask = df[column].astype(str) == value
            slices.append((f"{column}:{value}", f"{column} == {value}", df[mask]))
    for column in FLAG_COLUMNS:
        if column not in df.columns:
            continue
        values = df[column].map(safe_float)
        slices.append((f"{column}:1", f"{column} == 1", df[values == 1.0]))
        slices.append((f"{column}:0", f"{column} == 0", df[values == 0.0]))
    if {
        "target_home_starter_cracked_flag",
        "target_away_starter_cracked_flag",
    }.issubset(df.columns):
        home = df["target_home_starter_cracked_flag"].map(safe_float)
        away = df["target_away_starter_cracked_flag"].map(safe_float)
        slices.append(
            (
                "any_starter_cracked:1",
                "Either starter cracked",
                df[(home == 1.0) | (away == 1.0)],
            )
        )
        slices.append(
            (
                "both_starters_clean:1",
                "Neither starter cracked",
                df[(home == 0.0) & (away == 0.0)],
            )
        )
    if {
        "target_home_traffic_no_conversion_flag",
        "target_away_traffic_no_conversion_flag",
    }.issubset(df.columns):
        home = df["target_home_traffic_no_conversion_flag"].map(safe_float)
        away = df["target_away_traffic_no_conversion_flag"].map(safe_float)
        slices.append(
            (
                "any_traffic_no_conversion:1",
                "Either lineup had traffic without conversion",
                df[(home == 1.0) | (away == 1.0)],
            )
        )
    return slices


def regime_slice_metrics(df) -> dict[str, Any]:
    payload: dict[str, Any] = {}
    for slice_id, description, frame in slice_frames(df):
        target_payload: dict[str, Any] = {}
        for target in NUMERIC_TARGET_COLUMNS:
            if target in frame.columns:
                target_payload[target] = numeric_summary(frame[target].tolist())
        payload[slice_id] = {
            "description": description,
            "row_count": int(len(frame)),
            "numeric_targets": target_payload,
        }
    return payload


def baseline_slice_metrics(validation_df, lane_reports: dict[str, Any]) -> dict[str, Any]:
    payload: dict[str, Any] = {}
    for lane, target_info in LANE_TARGETS.items():
        lane_report = lane_reports.get(lane)
        if not lane_report:
            continue
        target = target_info["numeric_target"]
        if target not in validation_df.columns:
            continue
        train_mean = safe_float(lane_report.get("train_target_mean_baseline"))
        lane_payload: dict[str, Any] = {
            "target_column": target,
            "train_mean_baseline": train_mean,
            "slices": {},
        }
        for slice_id, description, frame in slice_frames(validation_df):
            actual = clean_numbers(frame[target].tolist())
            predicted = [train_mean for _ in actual] if train_mean is not None else []
            metrics = numeric_metrics(actual, predicted)
            lane_payload["slices"][slice_id] = {
                "description": description,
                "row_count": int(len(frame)),
                "metrics": metrics,
                "target_summary": numeric_summary(frame[target].tolist()),
            }
        payload[lane] = lane_payload
    return payload


def load_lane_reports(harness_dir: Path) -> dict[str, Any]:
    reports: dict[str, Any] = {}
    lane_dir = harness_dir / "lane_reports"
    for lane in LANE_TARGETS:
        path = lane_dir / f"{lane}.json"
        if path.exists():
            reports[lane] = load_json(path)
    return reports


def load_optional_json(path: Path) -> dict[str, Any] | None:
    if not path.exists():
        return None
    return load_json(path)


def load_jsonl(path: Path) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    with path.open("r", encoding="utf-8") as handle:
        for line in handle:
            line = line.strip()
            if not line:
                continue
            payload = json.loads(line)
            if isinstance(payload, dict):
                rows.append(payload)
    return rows


def walk_forward_gate_summary(walk_forward: dict[str, Any] | None) -> dict[str, Any]:
    if not walk_forward:
        return {
            "status": "missing",
            "reason": "walk_forward.json was not found in the harness directory.",
            "folds": [],
        }
    rows: list[dict[str, Any]] = []
    candidate_worse_count = 0
    candidate_better_count = 0
    candidate_equal_count = 0
    for fold in walk_forward.get("folds", []):
        for lane, lane_payload in fold.get("lanes", {}).items():
            baseline_mae = safe_float(lane_payload.get("baseline", {}).get("mae"))
            candidate = lane_payload.get("candidate", {})
            candidate_mae = safe_float(candidate.get("validation_metrics", {}).get("mae"))
            delta = None
            verdict = "not_comparable"
            if baseline_mae is not None and candidate_mae is not None:
                delta = candidate_mae - baseline_mae
                if delta > 0:
                    candidate_worse_count += 1
                    verdict = "candidate_worse_than_baseline"
                elif delta < 0:
                    candidate_better_count += 1
                    verdict = "candidate_better_than_baseline"
                else:
                    candidate_equal_count += 1
                    verdict = "candidate_equal_to_baseline"
            rows.append(
                {
                    "fold_id": fold.get("fold_id"),
                    "lane": lane,
                    "baseline_mae": baseline_mae,
                    "candidate_mae": candidate_mae,
                    "delta_candidate_minus_baseline": delta,
                    "candidate_status": candidate.get("status"),
                    "feature_count": candidate.get("feature_count"),
                    "verdict": verdict,
                }
            )
    total_comparable = candidate_worse_count + candidate_better_count + candidate_equal_count
    return {
        "status": "created",
        "fold_lane_count": len(rows),
        "comparable_count": total_comparable,
        "candidate_worse_count": candidate_worse_count,
        "candidate_better_count": candidate_better_count,
        "candidate_equal_count": candidate_equal_count,
        "candidate_beats_baseline_all_comparable_folds": (
            total_comparable > 0 and candidate_better_count == total_comparable
        ),
        "rows": rows,
    }


def summarize_family_ablations(
    family_ablations: dict[str, Any] | None,
    lane_reports: dict[str, Any],
) -> dict[str, Any]:
    if not family_ablations:
        return {
            "status": "missing",
            "reason": "family_ablations.json was not found in the harness directory.",
            "lanes": {},
        }
    payload: dict[str, Any] = {
        "status": "created",
        "families": family_ablations.get("families", []),
        "lanes": {},
    }
    for lane, lane_payload in family_ablations.get("lanes", {}).items():
        baseline_mae = safe_float(
            lane_reports.get(lane, {})
            .get("validation_mean_baseline_metrics", {})
            .get("mae")
        )
        all_model = lane_payload.get("all_features", {})
        all_mae = safe_float(all_model.get("validation_metrics", {}).get("mae"))
        lane_summary: dict[str, Any] = {
            "baseline_mae": baseline_mae,
            "all_features_mae": all_mae,
            "all_features_delta_vs_baseline": None
            if baseline_mae is None or all_mae is None
            else all_mae - baseline_mae,
            "without_family": [],
            "only_family": [],
        }
        for family, report in lane_payload.get("without_family", {}).items():
            mae = safe_float(report.get("validation_metrics", {}).get("mae"))
            lane_summary["without_family"].append(
                {
                    "family": family,
                    "status": report.get("status"),
                    "mae": mae,
                    "delta_vs_all_features": None
                    if mae is None or all_mae is None
                    else mae - all_mae,
                    "feature_count": report.get("feature_count"),
                }
            )
        for family, report in lane_payload.get("only_family", {}).items():
            mae = safe_float(report.get("validation_metrics", {}).get("mae"))
            lane_summary["only_family"].append(
                {
                    "family": family,
                    "status": report.get("status"),
                    "mae": mae,
                    "delta_vs_all_features": None
                    if mae is None or all_mae is None
                    else mae - all_mae,
                    "delta_vs_baseline": None
                    if mae is None or baseline_mae is None
                    else mae - baseline_mae,
                    "feature_count": report.get("feature_count"),
                }
            )
        lane_summary["without_family"] = sorted(
            lane_summary["without_family"],
            key=lambda item: (
                item["delta_vs_all_features"] is None,
                item["delta_vs_all_features"] or 0,
            ),
        )
        lane_summary["only_family"] = sorted(
            lane_summary["only_family"],
            key=lambda item: (
                item["delta_vs_baseline"] is None,
                item["delta_vs_baseline"] or 0,
            ),
        )
        payload["lanes"][lane] = lane_summary
    return payload


def top_baseline_tail_slices(
    slice_metrics: dict[str, Any],
    lane: str,
    limit: int = 8,
) -> list[dict[str, Any]]:
    lane_payload = slice_metrics.get(lane, {})
    rows: list[dict[str, Any]] = []
    for slice_id, payload in lane_payload.get("slices", {}).items():
        metrics = payload.get("metrics", {})
        row_count = payload.get("row_count", 0)
        mae = safe_float(metrics.get("mae"))
        if mae is None or row_count < 10:
            continue
        rows.append(
            {
                "slice_id": slice_id,
                "description": payload.get("description"),
                "row_count": row_count,
                "mae": mae,
                "mean_error": metrics.get("mean_error"),
            }
        )
    return sorted(rows, key=lambda item: item["mae"], reverse=True)[:limit]


def find_prediction_artifacts(harness_dir: Path) -> list[str]:
    candidates: list[str] = []
    for path in harness_dir.rglob("*"):
        if not path.is_file():
            continue
        lower = str(path.relative_to(harness_dir)).lower()
        if "prediction" in lower or "residual" in lower or "calibration_bin" in lower:
            candidates.append(str(path))
    return sorted(candidates)


def rows_for_prediction_slice(rows: list[dict[str, Any]]) -> list[tuple[str, str, list[dict[str, Any]]]]:
    slices: list[tuple[str, str, list[dict[str, Any]]]] = [("all", "All rows", rows)]
    for column in BUCKET_COLUMNS:
        values = sorted({str(row.get(column)) for row in rows if row.get(column) is not None})
        for value in values:
            slices.append(
                (
                    f"{column}:{value}",
                    f"{column} == {value}",
                    [row for row in rows if str(row.get(column)) == value],
                )
            )
    for column in FLAG_COLUMNS:
        for value in [1.0, 0.0]:
            slices.append(
                (
                    f"{column}:{int(value)}",
                    f"{column} == {int(value)}",
                    [row for row in rows if safe_float(row.get(column)) == value],
                )
            )
    if rows and all(
        column in rows[0]
        for column in [
            "target_home_starter_cracked_flag",
            "target_away_starter_cracked_flag",
        ]
    ):
        slices.append(
            (
                "any_starter_cracked:1",
                "Either starter cracked",
                [
                    row
                    for row in rows
                    if safe_float(row.get("target_home_starter_cracked_flag")) == 1.0
                    or safe_float(row.get("target_away_starter_cracked_flag")) == 1.0
                ],
            )
        )
        slices.append(
            (
                "both_starters_clean:1",
                "Neither starter cracked",
                [
                    row
                    for row in rows
                    if safe_float(row.get("target_home_starter_cracked_flag")) == 0.0
                    and safe_float(row.get("target_away_starter_cracked_flag")) == 0.0
                ],
            )
        )
    return slices


def prediction_metrics(rows: list[dict[str, Any]]) -> dict[str, Any]:
    actual: list[float] = []
    predicted: list[float] = []
    baseline: list[float] = []
    for row in rows:
        actual_value = safe_float(row.get("actual"))
        predicted_value = safe_float(row.get("prediction"))
        baseline_value = safe_float(row.get("baseline_prediction"))
        if actual_value is None or predicted_value is None:
            continue
        actual.append(actual_value)
        predicted.append(predicted_value)
        if baseline_value is not None:
            baseline.append(baseline_value)
    baseline_metrics = (
        numeric_metrics(actual, baseline) if len(baseline) == len(actual) else None
    )
    candidate_metrics = numeric_metrics(actual, predicted)
    candidate_mae = safe_float(candidate_metrics.get("mae"))
    baseline_mae = (
        None
        if baseline_metrics is None
        else safe_float(baseline_metrics.get("mae"))
    )
    return {
        "row_count": len(rows),
        "candidate_metrics": candidate_metrics,
        "baseline_metrics": baseline_metrics,
        "candidate_delta_mae_vs_baseline": None
        if candidate_mae is None or baseline_mae is None
        else candidate_mae - baseline_mae,
    }


def row_prediction_slice_summary(prediction_artifacts: list[str]) -> dict[str, Any]:
    if not prediction_artifacts:
        return {
            "status": "missing",
            "reason": "No row-level prediction artifacts were found.",
            "artifacts": [],
        }
    artifact_summaries: list[dict[str, Any]] = []
    for artifact in prediction_artifacts:
        path = Path(artifact)
        rows = load_jsonl(path)
        if not rows:
            artifact_summaries.append(
                {
                    "path": artifact,
                    "status": "empty",
                    "row_count": 0,
                    "slices": {},
                }
            )
            continue
        slices: dict[str, Any] = {}
        for slice_id, description, slice_rows in rows_for_prediction_slice(rows):
            slices[slice_id] = {
                "description": description,
                **prediction_metrics(slice_rows),
            }
        artifact_summaries.append(
            {
                "path": artifact,
                "status": "created",
                "lane": str(rows[0].get("lane")),
                "split_kind": str(rows[0].get("split_kind")),
                "fold_id": str(rows[0].get("fold_id")),
                "row_count": len(rows),
                "slices": slices,
            }
        )
    return {
        "status": "created",
        "artifact_count": len(prediction_artifacts),
        "artifacts": artifact_summaries,
    }


def top_candidate_tail_slices(
    row_prediction_summary: dict[str, Any],
    limit: int = 10,
) -> list[dict[str, Any]]:
    if row_prediction_summary.get("status") != "created":
        return []
    rows: list[dict[str, Any]] = []
    for artifact in row_prediction_summary.get("artifacts", []):
        for slice_id, payload in artifact.get("slices", {}).items():
            row_count = int(payload.get("row_count") or 0)
            candidate_mae = safe_float(
                payload.get("candidate_metrics", {}).get("mae")
            )
            baseline_mae = safe_float(
                (payload.get("baseline_metrics") or {}).get("mae")
            )
            if row_count < 10 or candidate_mae is None:
                continue
            rows.append(
                {
                    "lane": artifact.get("lane"),
                    "split_kind": artifact.get("split_kind"),
                    "fold_id": artifact.get("fold_id"),
                    "slice_id": slice_id,
                    "description": payload.get("description"),
                    "row_count": row_count,
                    "candidate_mae": candidate_mae,
                    "baseline_mae": baseline_mae,
                    "candidate_delta_mae_vs_baseline": payload.get(
                        "candidate_delta_mae_vs_baseline"
                    ),
                }
            )
    return sorted(rows, key=lambda item: item["candidate_mae"], reverse=True)[:limit]


def promotion_gate_summary(
    df,
    walk_forward_summary: dict[str, Any],
    prediction_artifacts: list[str],
) -> dict[str, Any]:
    missing_tail_targets = [column for column in TAIL_TARGET_COLUMNS if column not in df.columns]
    probability_outputs_exist = any("probability" in artifact.lower() for artifact in prediction_artifacts)
    calibration_bins_exist = any("calibration_bin" in artifact.lower() for artifact in prediction_artifacts)
    row_predictions_exist = any("prediction" in artifact.lower() for artifact in prediction_artifacts)
    candidate_all_folds = walk_forward_summary.get(
        "candidate_beats_baseline_all_comparable_folds"
    )
    blockers: list[str] = []
    if missing_tail_targets:
        blockers.append("Missing required tail/regime target columns.")
    if not row_predictions_exist:
        blockers.append("No row-level validation prediction or residual artifact exists.")
    if not probability_outputs_exist:
        blockers.append("No probability/distribution output artifact exists.")
    if not calibration_bins_exist:
        blockers.append("No calibration-bin artifact exists.")
    if not candidate_all_folds:
        blockers.append("Diagnostic candidate does not beat baseline across comparable walk-forward folds.")
    return {
        "status": "blocked_for_promotion" if blockers else "review_required",
        "tail_targets_present": not missing_tail_targets,
        "missing_tail_targets": missing_tail_targets,
        "row_level_predictions_exist": row_predictions_exist,
        "probability_outputs_exist": probability_outputs_exist,
        "calibration_bins_exist": calibration_bins_exist,
        "candidate_beats_baseline_all_comparable_folds": candidate_all_folds,
        "blocking_reasons": blockers,
        "non_goals": NON_GOALS,
    }


def report_markdown(audit: dict[str, Any]) -> str:
    next_actions = [
        "Add distribution/probability outputs before using the word calibration literally.",
        "Promote tail/regime labels into rejection gates for any future component candidate.",
        "Keep this metrics-only; no picks, prices, simulator logs, or edge claims.",
    ]
    if not audit["promotion_gate"]["row_level_predictions_exist"]:
        next_actions.insert(
            0,
            "Extend the harness to write row-level validation predictions and residuals.",
        )
    else:
        next_actions.insert(
            0,
            "Review candidate residual slice summaries from the row-level prediction artifacts.",
        )
    lines = [
        "# MLB-M3 FS-004 Tail/Regime Calibration Audit",
        "",
        f"Run ID: `{audit['run_id']}`",
        "",
        f"Status: `{audit['status']}`",
        "",
        "## Gate Summary",
        "",
        f"- Promotion gate: `{audit['promotion_gate']['status']}`",
        f"- Tail targets present: `{audit['promotion_gate']['tail_targets_present']}`",
        f"- Row-level predictions exist: `{audit['promotion_gate']['row_level_predictions_exist']}`",
        f"- Probability outputs exist: `{audit['promotion_gate']['probability_outputs_exist']}`",
        f"- Calibration bins exist: `{audit['promotion_gate']['calibration_bins_exist']}`",
        f"- Candidate beats baseline in all comparable folds: `{audit['promotion_gate']['candidate_beats_baseline_all_comparable_folds']}`",
        "",
        "Blocking reasons:",
        "",
        *[f"- {reason}" for reason in audit["promotion_gate"]["blocking_reasons"]],
        "",
        "## Walk-Forward Gate",
        "",
        "| Fold | Lane | Baseline MAE | Candidate MAE | Delta | Verdict |",
        "| --- | --- | ---: | ---: | ---: | --- |",
    ]
    for row in audit["walk_forward_gate"]["rows"]:
        baseline = row["baseline_mae"]
        candidate = row["candidate_mae"]
        delta = row["delta_candidate_minus_baseline"]
        lines.append(
            "| "
            + " | ".join(
                [
                    f"`{row['fold_id']}`",
                    f"`{row['lane']}`",
                    "" if baseline is None else f"{baseline:.4f}",
                    "" if candidate is None else f"{candidate:.4f}",
                    "" if delta is None else f"{delta:+.4f}",
                    f"`{row['verdict']}`",
                ]
            )
            + " |"
        )
    lines.extend(
        [
            "",
            "## Worst Baseline Tail Slices",
            "",
            "These are mean-baseline validation slices, not candidate calibration.",
            "",
        ]
    )
    for lane, rows in audit["top_baseline_tail_slices"].items():
        lines.extend(
            [
                f"### `{lane}`",
                "",
                "| Slice | Rows | MAE | Mean Error |",
                "| --- | ---: | ---: | ---: |",
            ]
        )
        for row in rows:
            lines.append(
                "| "
                + " | ".join(
                    [
                        f"`{row['slice_id']}`",
                        str(row["row_count"]),
                        f"{row['mae']:.4f}",
                        ""
                        if row["mean_error"] is None
                        else f"{safe_float(row['mean_error']):+.4f}",
                    ]
                )
                + " |"
            )
        lines.append("")
    if audit["row_prediction_slice_summary"]["status"] == "created":
        lines.extend(
            [
                "## Worst Candidate Residual Slices",
                "",
                "These come from row-level diagnostic prediction artifacts. They are not probability calibration bins.",
                "",
                "| Split | Fold | Lane | Slice | Rows | Candidate MAE | Baseline MAE | Delta |",
                "| --- | --- | --- | --- | ---: | ---: | ---: | ---: |",
            ]
        )
        for row in audit["top_candidate_tail_slices"]:
            baseline = row["baseline_mae"]
            delta = row["candidate_delta_mae_vs_baseline"]
            lines.append(
                "| "
                + " | ".join(
                    [
                        f"`{row['split_kind']}`",
                        f"`{row['fold_id']}`",
                        f"`{row['lane']}`",
                        f"`{row['slice_id']}`",
                        str(row["row_count"]),
                        f"{row['candidate_mae']:.4f}",
                        "" if baseline is None else f"{baseline:.4f}",
                        "" if delta is None else f"{safe_float(delta):+.4f}",
                    ]
                )
                + " |"
            )
        lines.append("")
    lines.extend(
        [
            "## Next Actions",
            "",
            *[f"- {action}" for action in next_actions],
            "",
        ]
    )
    return "\n".join(lines)


def audit_tail_calibration(
    manifest_path: Path,
    harness_dir: Path,
    output_subdir: str,
) -> dict[str, Any]:
    manifest_path = resolve_path(manifest_path)
    harness_dir = resolve_path(harness_dir)
    validation = validate_manifest(manifest_path)
    if not validation["ok"]:
        raise RuntimeError("Manifest validation failed: " + json.dumps(validation))
    if not harness_dir.exists():
        raise FileNotFoundError(f"Harness directory does not exist: {harness_dir}")
    manifest = load_json(manifest_path)
    run_id = manifest["run_id"]
    run_dir = manifest_path.parent
    output_dir = run_dir / output_subdir
    output_dir.mkdir(parents=True, exist_ok=True)

    started_at = utc_now()
    df = load_matrix(manifest["feature_artifact"]["matrix_uri"])
    train_df, validation_df = split_frames(df, manifest["data_split_plan"])
    lane_reports = load_lane_reports(harness_dir)
    walk_forward = load_optional_json(harness_dir / "walk_forward.json")
    family_ablations = load_optional_json(harness_dir / "family_ablations.json")

    split_target_summary = {
        "all": target_distribution_summary(df),
        "manifest_train": target_distribution_summary(train_df),
        "manifest_validation": target_distribution_summary(validation_df),
    }
    tail_slice_metrics = {
        "all": regime_slice_metrics(df),
        "manifest_train": regime_slice_metrics(train_df),
        "manifest_validation": regime_slice_metrics(validation_df),
    }
    baseline_by_slice = baseline_slice_metrics(validation_df, lane_reports)
    walk_forward_gate = walk_forward_gate_summary(walk_forward)
    family_summary = summarize_family_ablations(family_ablations, lane_reports)
    prediction_artifacts = find_prediction_artifacts(harness_dir)
    row_prediction_summary = row_prediction_slice_summary(prediction_artifacts)
    promotion_gate = promotion_gate_summary(df, walk_forward_gate, prediction_artifacts)
    top_slices = {
        lane: top_baseline_tail_slices(baseline_by_slice, lane)
        for lane in sorted(baseline_by_slice)
    }
    top_candidate_slices = top_candidate_tail_slices(row_prediction_summary)

    finished_at = utc_now()
    audit = {
        "run_id": run_id,
        "status": "tail_regime_audit_created",
        "version": VERSION,
        "source_manifest_uri": str(manifest_path),
        "source_harness_dir": str(harness_dir),
        "output_dir": str(output_dir),
        "started_at": started_at,
        "finished_at": finished_at,
        "row_count": int(len(df)),
        "train_row_count": int(len(train_df)),
        "validation_row_count": int(len(validation_df)),
        "split_target_summary_uri": str(output_dir / "split_target_summary.json"),
        "tail_slice_metrics_uri": str(output_dir / "tail_slice_metrics.json"),
        "baseline_slice_metrics_uri": str(output_dir / "baseline_slice_metrics.json"),
        "walk_forward_gate_uri": str(output_dir / "walk_forward_gate.json"),
        "family_ablation_summary_uri": str(output_dir / "family_ablation_summary.json"),
        "row_prediction_slice_summary_uri": str(output_dir / "row_prediction_slice_summary.json"),
        "prediction_artifacts_found": prediction_artifacts,
        "promotion_gate": promotion_gate,
        "walk_forward_gate": walk_forward_gate,
        "row_prediction_slice_summary": row_prediction_summary,
        "top_baseline_tail_slices": top_slices,
        "top_candidate_tail_slices": top_candidate_slices,
        "non_goals": NON_GOALS,
    }
    next_recommended_actions = [
        "Add distribution/probability outputs before calibration claims.",
        "Use tail/regime slices as rejection gates for future candidates.",
    ]
    if promotion_gate["row_level_predictions_exist"]:
        next_recommended_actions.insert(
            0,
            "Review candidate residual slice summaries from row-level prediction artifacts.",
        )
    else:
        next_recommended_actions.insert(
            0,
            "Write row-level validation predictions and residuals from the harness.",
        )
    dashboard_state = {
        "run_id": run_id,
        "status": "tail_regime_audit_created",
        "active_phase": "tail_regime_audit",
        "source_manifest_uri": str(manifest_path),
        "source_harness_dir": str(harness_dir),
        "output_dir": str(output_dir),
        "promotion_gate_status": promotion_gate["status"],
        "walk_forward_candidate_worse_count": walk_forward_gate.get("candidate_worse_count"),
        "walk_forward_candidate_better_count": walk_forward_gate.get("candidate_better_count"),
        "row_level_predictions_exist": promotion_gate["row_level_predictions_exist"],
        "row_prediction_artifact_count": len(prediction_artifacts),
        "probability_outputs_exist": promotion_gate["probability_outputs_exist"],
        "calibration_bins_exist": promotion_gate["calibration_bins_exist"],
        "next_recommended_actions": next_recommended_actions,
        "non_goals": NON_GOALS,
    }

    write_json(output_dir / "split_target_summary.json", split_target_summary)
    write_json(output_dir / "tail_slice_metrics.json", tail_slice_metrics)
    write_json(output_dir / "baseline_slice_metrics.json", baseline_by_slice)
    write_json(output_dir / "walk_forward_gate.json", walk_forward_gate)
    write_json(output_dir / "family_ablation_summary.json", family_summary)
    write_json(output_dir / "row_prediction_slice_summary.json", row_prediction_summary)
    write_json(output_dir / "dashboard_state.json", dashboard_state)
    write_json(output_dir / "tail_calibration_audit.json", audit)
    (output_dir / "report.md").write_text(report_markdown(audit), encoding="utf-8")
    artifacts = {
        "run_id": run_id,
        "status": "tail_regime_audit_created",
        "artifacts": [
            artifact_entry("tail_calibration_audit", output_dir / "tail_calibration_audit.json"),
            artifact_entry("split_target_summary", output_dir / "split_target_summary.json"),
            artifact_entry("tail_slice_metrics", output_dir / "tail_slice_metrics.json"),
            artifact_entry("baseline_slice_metrics", output_dir / "baseline_slice_metrics.json"),
            artifact_entry("walk_forward_gate", output_dir / "walk_forward_gate.json"),
            artifact_entry("family_ablation_summary", output_dir / "family_ablation_summary.json"),
            artifact_entry("row_prediction_slice_summary", output_dir / "row_prediction_slice_summary.json"),
            artifact_entry("dashboard_state", output_dir / "dashboard_state.json"),
            artifact_entry("report", output_dir / "report.md"),
        ],
    }
    write_json(output_dir / "artifacts.json", artifacts)

    summary = {
        "ok": True,
        "run_id": run_id,
        "status": "tail_regime_audit_created",
        "output_dir": str(output_dir),
        "promotion_gate_status": promotion_gate["status"],
        "walk_forward_candidate_worse_count": walk_forward_gate.get("candidate_worse_count"),
        "walk_forward_candidate_better_count": walk_forward_gate.get("candidate_better_count"),
        "non_goals": NON_GOALS,
    }
    print(json.dumps(summary, indent=2, sort_keys=True))
    return summary


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Audit FS-004 tail/regime diagnostics and calibration blockers."
    )
    parser.add_argument("--manifest", type=Path, default=DEFAULT_MANIFEST)
    parser.add_argument("--harness-dir", type=Path, default=DEFAULT_HARNESS_DIR)
    parser.add_argument(
        "--output-subdir",
        default=DEFAULT_OUTPUT_SUBDIR,
        help="Subdirectory under the manifest run dir for audit outputs.",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    try:
        audit_tail_calibration(args.manifest, args.harness_dir, args.output_subdir)
    except Exception as exc:
        print(json.dumps({"ok": False, "error": str(exc)}, indent=2), file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
