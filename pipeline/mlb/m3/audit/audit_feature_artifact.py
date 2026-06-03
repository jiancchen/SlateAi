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

from pipeline.mlb.m3.harness.run_alpha3_harness import load_matrix, safe_float
from pipeline.mlb.m3.runs.validate_alpha2_manifest import validate_manifest


ROOT = Path(__file__).resolve().parents[4]
DEFAULT_MANIFEST = (
    ROOT
    / "data-private"
    / "models"
    / "mlb-m3"
    / "runs"
    / "mlb_m3_alpha2_infra_fs002_20260603T155600Z"
    / "manifest.json"
)

KEEP_MISSING_RATE_MAX = 0.75
MIN_UNIQUE_VALUES = 2
MIN_NON_NULL_RATE = 0.1


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


def infer_family(column: str) -> str:
    if column.startswith("target_"):
        return "target"
    if column in {"game_id", "game_date", "game_status", "game_home_team_id", "game_away_team_id", "game_start_time_utc"}:
        return "metadata"
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


def pearson(xs: list[float], ys: list[float]) -> float | None:
    if len(xs) < 20 or len(xs) != len(ys):
        return None
    mean_x = sum(xs) / len(xs)
    mean_y = sum(ys) / len(ys)
    dx = [x - mean_x for x in xs]
    dy = [y - mean_y for y in ys]
    denom_x = math.sqrt(sum(x * x for x in dx))
    denom_y = math.sqrt(sum(y * y for y in dy))
    if denom_x == 0 or denom_y == 0:
        return None
    return sum(x * y for x, y in zip(dx, dy)) / (denom_x * denom_y)


def correlation_with_target(df, column: str, target: str) -> float | None:
    pairs: list[tuple[float, float]] = []
    for left, right in zip(df[column].tolist(), df[target].tolist()):
        x = safe_float(left)
        y = safe_float(right)
        if x is not None and y is not None:
            pairs.append((x, y))
    if len(pairs) < 20:
        return None
    xs = [x for x, _ in pairs]
    ys = [y for _, y in pairs]
    return pearson(xs, ys)


def feature_reason(
    column: str,
    role: str,
    missing_rate: float,
    unique_count: int,
    non_null_count: int,
    row_count: int,
) -> list[str]:
    reasons: list[str] = []
    if role != "feature":
        return reasons
    if column.endswith("_id") or column in {"game_venue_id"}:
        reasons.append("id_or_identifier_proxy")
    if missing_rate > KEEP_MISSING_RATE_MAX:
        reasons.append("high_missingness")
    if non_null_count / row_count < MIN_NON_NULL_RATE:
        reasons.append("low_non_null_rate")
    if unique_count < MIN_UNIQUE_VALUES:
        reasons.append("constant_or_near_constant")
    if column.startswith("market_") and missing_rate > 0.5:
        reasons.append("sparse_market_context")
    if "coverage_rate" in column or column.endswith("_available_flag") or column.endswith("_known_flag"):
        reasons.append("coverage_or_availability_feature")
    if "sample" in column or "count" in column:
        reasons.append("evidence_count_feature")
    return reasons


def should_keep(
    column: str,
    role: str,
    reasons: list[str],
    missing_rate: float,
) -> bool:
    if role in {"primary_key", "time_key", "metadata", "target"}:
        return True
    if role != "feature":
        return False
    if "id_or_identifier_proxy" in reasons:
        return False
    if "high_missingness" in reasons:
        return False
    if "constant_or_near_constant" in reasons:
        return False
    if "sparse_market_context" in reasons:
        return False
    if column.startswith("market_") and missing_rate > 0.35:
        return False
    return True


def report_markdown(audit: dict[str, Any]) -> str:
    return "\n".join(
        [
            "# MLB-M3 Feature Artifact Audit",
            "",
            f"Run ID: `{audit['run_id']}`",
            "",
            "## Summary",
            "",
            f"- Source feature set: `{audit['feature_set_id']}`",
            f"- Rows: `{audit['row_count']}`",
            f"- Total columns: `{audit['column_count']}`",
            f"- Feature columns: `{audit['feature_column_count']}`",
            f"- Selected FS-003 columns: `{audit['selected_column_count']}`",
            f"- Pruned feature columns: `{audit['pruned_feature_count']}`",
            "",
            "## Non-Goals",
            "",
            "- no picks",
            "- no prices",
            "- no promotion decisions",
            "- no edge claims",
            "",
            "This audit only recommends feature pruning and family diagnostics.",
            "",
        ]
    )


def artifact_entry(role: str, path: Path) -> dict[str, Any]:
    return {
        "role": role,
        "path": str(path),
        "exists": path.exists(),
        "sha256": sha256_path(path),
        "bytes": path.stat().st_size if path.exists() else None,
    }


def audit_feature_artifact(manifest_path: Path, output_subdir: str) -> dict[str, Any]:
    manifest_path = resolve_path(manifest_path)
    validation = validate_manifest(manifest_path)
    if not validation["ok"]:
        raise RuntimeError("Manifest validation failed: " + json.dumps(validation))
    manifest = load_json(manifest_path)
    run_dir = manifest_path.parent
    audit_dir = run_dir / output_subdir
    audit_dir.mkdir(parents=True, exist_ok=True)

    matrix_uri = manifest["feature_artifact"]["matrix_uri"]
    df = load_matrix(matrix_uri)
    row_count = int(len(df))
    dictionary_path = resolve_path(manifest["artifact_hashes"][2]["path"])
    dictionary = load_json(dictionary_path)

    feature_rows: list[dict[str, Any]] = []
    selected_columns: list[str] = []
    pruned_features: list[dict[str, Any]] = []
    family_summary: dict[str, dict[str, Any]] = {}
    columns = list(df.columns)
    for column in columns:
        detail = dictionary.get(column, {})
        role = detail.get("role", "unknown")
        series = df[column]
        values = series.tolist()
        missing_count = int(series.isna().sum())
        non_null_count = row_count - missing_count
        unique_count = int(series.nunique(dropna=True))
        missing_rate = missing_count / row_count if row_count else 0.0
        family = infer_family(column)
        reasons = feature_reason(column, role, missing_rate, unique_count, non_null_count, row_count)
        keep = should_keep(column, role, reasons, missing_rate)
        corr_total = correlation_with_target(df, column, "target_total_runs_final") if role == "feature" else None
        corr_f5 = correlation_with_target(df, column, "target_total_runs_f5") if role == "feature" else None
        payload = {
            "column": column,
            "role": role,
            "family": family,
            "dtype": detail.get("dtype"),
            "missing_count": missing_count,
            "missing_rate": missing_rate,
            "non_null_count": non_null_count,
            "unique_count": unique_count,
            "recommended_keep_for_fs003": keep,
            "prune_or_review_reasons": reasons,
            "corr_target_total_runs_final": corr_total,
            "corr_target_total_runs_f5": corr_f5,
        }
        feature_rows.append(payload)
        if keep:
            selected_columns.append(column)
        elif role == "feature":
            pruned_features.append(payload)
        summary = family_summary.setdefault(
            family,
            {
                "column_count": 0,
                "feature_count": 0,
                "selected_count": 0,
                "avg_missing_rate": 0.0,
                "high_missing_count": 0,
                "constant_count": 0,
                "coverage_or_availability_count": 0,
            },
        )
        summary["column_count"] += 1
        if role == "feature":
            summary["feature_count"] += 1
        if keep:
            summary["selected_count"] += 1
        summary["avg_missing_rate"] += missing_rate
        if missing_rate > KEEP_MISSING_RATE_MAX:
            summary["high_missing_count"] += 1
        if unique_count < MIN_UNIQUE_VALUES:
            summary["constant_count"] += 1
        if "coverage_or_availability_feature" in reasons:
            summary["coverage_or_availability_count"] += 1

    for summary in family_summary.values():
        if summary["column_count"]:
            summary["avg_missing_rate"] /= summary["column_count"]

    audit = {
        "run_id": f"{manifest['run_id']}_feature_audit",
        "status": "feature_audit_created",
        "created_at": utc_now(),
        "source_manifest_uri": str(manifest_path),
        "feature_set_id": manifest["feature_artifact"].get("feature_set_id"),
        "feature_run_id": manifest["feature_artifact"].get("feature_run_id"),
        "matrix_uri": matrix_uri,
        "row_count": row_count,
        "column_count": len(columns),
        "feature_column_count": sum(1 for row in feature_rows if row["role"] == "feature"),
        "selected_column_count": len(selected_columns),
        "pruned_feature_count": len(pruned_features),
        "rules": {
            "keep_missing_rate_max": KEEP_MISSING_RATE_MAX,
            "min_unique_values": MIN_UNIQUE_VALUES,
            "min_non_null_rate": MIN_NON_NULL_RATE,
        },
        "non_goals": [
            "no picks",
            "no prices",
            "no promotion decisions",
            "no edge claims",
        ],
    }

    outputs = {
        "audit": audit,
        "feature_quality": feature_rows,
        "family_summary": family_summary,
        "prune_recommendations": {
            "selected_columns": selected_columns,
            "pruned_features": pruned_features,
        },
    }
    write_json(audit_dir / "feature_audit.json", audit)
    write_json(audit_dir / "feature_quality.json", {"features": feature_rows})
    write_json(audit_dir / "family_summary.json", family_summary)
    write_json(audit_dir / "prune_recommendations.json", outputs["prune_recommendations"])
    write_json(audit_dir / "fs003_selected_columns.json", {"columns": selected_columns})
    (audit_dir / "report.md").write_text(report_markdown(audit), encoding="utf-8")
    artifacts = {
        "status": "feature_audit_created",
        "artifacts": [
            artifact_entry("feature_audit", audit_dir / "feature_audit.json"),
            artifact_entry("feature_quality", audit_dir / "feature_quality.json"),
            artifact_entry("family_summary", audit_dir / "family_summary.json"),
            artifact_entry("prune_recommendations", audit_dir / "prune_recommendations.json"),
            artifact_entry("fs003_selected_columns", audit_dir / "fs003_selected_columns.json"),
            artifact_entry("report", audit_dir / "report.md"),
        ],
    }
    write_json(audit_dir / "artifacts.json", artifacts)

    summary = {
        "ok": True,
        "audit_dir": str(audit_dir),
        "row_count": row_count,
        "column_count": len(columns),
        "selected_column_count": len(selected_columns),
        "pruned_feature_count": len(pruned_features),
    }
    print(json.dumps(summary, indent=2, sort_keys=True))
    return summary


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Audit an MLB-M3 feature artifact.")
    parser.add_argument("--manifest", type=Path, default=DEFAULT_MANIFEST)
    parser.add_argument("--output-subdir", default="feature_audit")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    try:
        audit_feature_artifact(args.manifest, args.output_subdir)
    except Exception as exc:
        print(json.dumps({"ok": False, "error": str(exc)}, indent=2), file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
