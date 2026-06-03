#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[4]
DEFAULT_HARNESS_DIR = (
    ROOT
    / "data-private"
    / "models"
    / "mlb-m3"
    / "runs"
    / "mlb_m3_alpha2_infra_20260603T093000Z"
    / "training_harness"
)

REQUIRED_FILES = {
    "metrics.json",
    "split_summary.json",
    "target_summary.json",
    "calibration_placeholder.json",
    "dashboard_state.json",
    "typed_model_registry_preview_alpha3.json",
    "artifacts.json",
    "report.md",
}

FORBIDDEN_TERMS = {
    "bankroll",
    "bet_size",
    "fair_price",
    "fair_probability",
    "pick_recommendation",
    "player_prop_price",
    "promotion_decision",
    "selection_row",
    "simulated_event",
    "stake",
}


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


def load_jsonl(path: Path) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    with path.open("r", encoding="utf-8") as handle:
        for line_number, line in enumerate(handle, start=1):
            line = line.strip()
            if not line:
                continue
            payload = json.loads(line)
            if not isinstance(payload, dict):
                raise ValueError(
                    f"Expected JSON object on line {line_number}: {path}"
                )
            rows.append(payload)
    return rows


def validate_harness(harness_dir: Path) -> dict[str, Any]:
    harness_dir = resolve_path(harness_dir)
    errors: list[str] = []
    warnings: list[str] = []
    checks: dict[str, Any] = {}
    if not harness_dir.exists():
        return {
            "ok": False,
            "harness_dir": str(harness_dir),
            "errors": [f"Harness directory does not exist: {harness_dir}"],
            "warnings": [],
            "checks": {},
        }
    missing = sorted(file for file in REQUIRED_FILES if not (harness_dir / file).exists())
    checks["required_files_exist"] = not missing
    if missing:
        errors.append("Missing required files: " + ", ".join(missing))

    json_payloads: dict[str, dict[str, Any]] = {}
    for path in harness_dir.rglob("*.json"):
        try:
            json_payloads[str(path.relative_to(harness_dir))] = load_json(path)
        except Exception as exc:
            errors.append(f"Invalid JSON {path}: {exc}")
    checks["json_files_valid"] = not any(error.startswith("Invalid JSON") for error in errors)

    metrics = json_payloads.get("metrics.json", {})
    checks["metrics_status"] = metrics.get("status") == "harness_metrics_created"
    if not checks["metrics_status"]:
        errors.append("metrics.json status must be harness_metrics_created.")

    split = json_payloads.get("split_summary.json", {})
    checks["split_not_backtest"] = split.get("not_a_backtest") is True
    if not checks["split_not_backtest"]:
        errors.append("split_summary.json must declare not_a_backtest=true.")

    registry = json_payloads.get("typed_model_registry_preview_alpha3.json", {})
    checks["registry_preview_only"] = registry.get("status") == "preview_only_not_inserted"
    if not checks["registry_preview_only"]:
        errors.append("Alpha-3 typed registry output must be preview_only_not_inserted.")

    candidate_files = [
        key for key in json_payloads if key.startswith("candidate_models/")
    ]
    candidate_statuses = []
    for key in candidate_files:
        status = json_payloads[key].get("status")
        candidate_statuses.append(status)
        if status not in {"candidate_diagnostic_not_promoted", "skipped"}:
            errors.append(f"Candidate file {key} has invalid status: {status}")
    checks["candidate_models_not_promoted"] = not any(
        status not in {"candidate_diagnostic_not_promoted", "skipped"}
        for status in candidate_statuses
    )

    distribution_jsonl_files = sorted(
        path
        for path in harness_dir.rglob("*.jsonl")
        if "distribution_outputs" in str(path.relative_to(harness_dir))
    )
    distribution_rows_valid = True
    distribution_fit_scope_train_only = True
    distribution_rows_not_promoted = True
    distribution_rows_not_market_probability = True
    distribution_row_count = 0
    for path in distribution_jsonl_files:
        try:
            rows = load_jsonl(path)
        except Exception as exc:
            distribution_rows_valid = False
            errors.append(f"Invalid distribution JSONL {path}: {exc}")
            continue
        if not rows:
            warnings.append(f"Distribution JSONL is empty: {path}")
        for row in rows:
            distribution_row_count += 1
            fit_scope = str(row.get("distribution_fit_scope") or "").lower()
            if "train" not in fit_scope or "validation" in fit_scope:
                distribution_fit_scope_train_only = False
            if row.get("not_a_pick") is not True or row.get("not_a_price") is not True:
                distribution_rows_not_promoted = False
            if row.get("not_a_promotion") is not True:
                distribution_rows_not_promoted = False
            if row.get("not_a_market_probability") is not True:
                distribution_rows_not_market_probability = False
    distribution_enabled = bool(metrics.get("distribution_outputs_enabled"))
    checks["distribution_jsonl_valid"] = distribution_rows_valid
    checks["distribution_outputs_present_when_enabled"] = (
        not distribution_enabled or bool(distribution_jsonl_files)
    )
    checks["distribution_fit_scope_train_only"] = distribution_fit_scope_train_only
    checks["distribution_rows_not_promoted"] = distribution_rows_not_promoted
    checks["distribution_rows_not_market_probability"] = (
        distribution_rows_not_market_probability
    )
    if not checks["distribution_outputs_present_when_enabled"]:
        errors.append("distribution_outputs_enabled=true but no distribution JSONL files exist.")
    if not checks["distribution_fit_scope_train_only"]:
        errors.append("Distribution rows must declare train-only fit scope.")
    if not checks["distribution_rows_not_promoted"]:
        errors.append("Distribution rows must declare not_a_pick, not_a_price, and not_a_promotion.")
    if not checks["distribution_rows_not_market_probability"]:
        errors.append("Distribution rows must declare not_a_market_probability=true.")

    all_text = "\n".join(
        path.read_text(encoding="utf-8", errors="ignore")
        for path in harness_dir.rglob("*")
        if path.is_file() and path.suffix in {".json", ".jsonl", ".md"}
    ).lower()
    forbidden_hits = sorted(
        term
        for term in FORBIDDEN_TERMS
        if re.search(rf"(?<![a-z0-9_]){re.escape(term)}(?![a-z0-9_])", all_text)
    )
    checks["forbidden_scope_terms_absent"] = not forbidden_hits
    if forbidden_hits:
        errors.append("Forbidden scope terms found: " + ", ".join(forbidden_hits))

    return {
        "ok": not errors,
        "harness_dir": str(harness_dir),
        "errors": errors,
        "warnings": warnings,
        "checks": checks,
        "summary": {
            "json_file_count": len(json_payloads),
            "distribution_jsonl_file_count": len(distribution_jsonl_files),
            "distribution_row_count": distribution_row_count,
            "candidate_file_count": len(candidate_files),
            "error_count": len(errors),
            "warning_count": len(warnings),
        },
    }


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Validate an MLB-M3 alpha-3 harness output directory."
    )
    parser.add_argument("--harness-dir", type=Path, default=DEFAULT_HARNESS_DIR)
    parser.add_argument("--json", action="store_true")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    result = validate_harness(args.harness_dir)
    if args.json or not result["ok"]:
        print(json.dumps(result, indent=2, sort_keys=True))
    else:
        print(json.dumps({"ok": True, "summary": result["summary"]}, indent=2))
    if not result["ok"]:
        sys.exit(1)


if __name__ == "__main__":
    main()
