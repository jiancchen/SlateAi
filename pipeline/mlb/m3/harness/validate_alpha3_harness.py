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

    all_text = "\n".join(
        path.read_text(encoding="utf-8", errors="ignore")
        for path in harness_dir.rglob("*")
        if path.is_file() and path.suffix in {".json", ".md"}
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
