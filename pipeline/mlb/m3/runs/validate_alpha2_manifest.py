#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[4]
DEFAULT_MANIFEST_PATH = (
    ROOT
    / "data-private"
    / "models"
    / "mlb-m3"
    / "runs"
    / "mlb_m3_alpha2_infra_20260603T093000Z"
    / "manifest.json"
)

REQUIRED_TOP_LEVEL_KEYS = {
    "manifest_version",
    "run_id",
    "run_family",
    "sport",
    "model_id",
    "model_version",
    "status",
    "created_at",
    "feature_artifact",
    "artifact_hashes",
    "target_contract",
    "feature_contract",
    "component_registry",
    "data_split_plan",
    "dashboard",
    "typed_model_metadata_mapping",
    "output_artifacts",
    "non_goals",
    "warnings",
    "git",
}

REQUIRED_NON_GOALS = {
    "no trained model",
    "no backtest edge claim",
    "no simulator",
    "no picks",
    "no player prop pricing",
    "no claim that M3 is better",
}

FORBIDDEN_OUTPUT_ROLE_TERMS = {
    "pick",
    "selection",
    "simulated_event",
    "prop_price",
    "fair_probability",
    "trained_model",
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


def valid_sha256(value: Any) -> bool:
    return isinstance(value, str) and len(value) == 64 and all(
        char in "0123456789abcdef" for char in value.lower()
    )


def check_output_scope(manifest: dict[str, Any]) -> list[str]:
    errors: list[str] = []
    output_artifacts = manifest.get("output_artifacts", {})
    if not isinstance(output_artifacts, dict):
        return ["output_artifacts must be an object."]
    for key, value in output_artifacts.items():
        haystack = f"{key} {value}".lower()
        for term in FORBIDDEN_OUTPUT_ROLE_TERMS:
            if term in haystack:
                errors.append(
                    f"Output artifact appears to contain forbidden scope term `{term}`: {key}"
                )
    return errors


def validate_manifest(path: Path) -> dict[str, Any]:
    path = resolve_path(path)
    errors: list[str] = []
    warnings: list[str] = []
    checks: dict[str, Any] = {}

    if not path.exists():
        return {
            "ok": False,
            "manifest_path": str(path),
            "errors": [f"Manifest does not exist: {path}"],
            "warnings": [],
            "checks": {},
        }

    manifest = load_json(path)

    missing_top_keys = sorted(REQUIRED_TOP_LEVEL_KEYS - set(manifest))
    checks["required_top_level_keys"] = not missing_top_keys
    if missing_top_keys:
        errors.append("Missing top-level keys: " + ", ".join(missing_top_keys))

    checks["status_manifest_created"] = manifest.get("status") == "manifest_created"
    if not checks["status_manifest_created"]:
        errors.append("Manifest status must be `manifest_created`.")

    checks["run_family_alpha2"] = (
        manifest.get("run_family") == "mlb-m3-alpha-2-infrastructure"
    )
    if not checks["run_family_alpha2"]:
        errors.append("Manifest run_family must be `mlb-m3-alpha-2-infrastructure`.")

    feature_artifact = manifest.get("feature_artifact", {})
    if not isinstance(feature_artifact, dict):
        errors.append("feature_artifact must be an object.")
        feature_artifact = {}
    forbidden_feature_flags = {
        "uses_sports_db": feature_artifact.get("uses_sports_db"),
        "uses_m2_weights": feature_artifact.get("uses_m2_weights"),
        "uses_hand_picked_memory_lengths": feature_artifact.get(
            "uses_hand_picked_memory_lengths"
        ),
    }
    checks["feature_forbidden_flags_false"] = all(
        value is False for value in forbidden_feature_flags.values()
    )
    if not checks["feature_forbidden_flags_false"]:
        errors.append(
            "Feature artifact flags must be false: "
            + json.dumps(forbidden_feature_flags, sort_keys=True)
        )

    non_goals = set(manifest.get("non_goals", []))
    missing_non_goals = sorted(REQUIRED_NON_GOALS - non_goals)
    checks["required_non_goals"] = not missing_non_goals
    if missing_non_goals:
        errors.append("Missing required non-goals: " + ", ".join(missing_non_goals))

    artifact_hashes = manifest.get("artifact_hashes", [])
    checks["artifact_hashes_non_empty"] = isinstance(artifact_hashes, list) and bool(
        artifact_hashes
    )
    if not checks["artifact_hashes_non_empty"]:
        errors.append("artifact_hashes must be a non-empty list.")
        artifact_hashes = []

    missing_artifacts: list[str] = []
    invalid_hashes: list[str] = []
    for artifact in artifact_hashes:
        if not isinstance(artifact, dict):
            errors.append("Each artifact_hashes entry must be an object.")
            continue
        role = str(artifact.get("role"))
        artifact_path = resolve_path(str(artifact.get("path", "")))
        if not artifact_path.exists() or not artifact.get("exists"):
            missing_artifacts.append(role)
        if artifact.get("exists") and not valid_sha256(artifact.get("sha256")):
            invalid_hashes.append(role)
    checks["referenced_artifacts_exist"] = not missing_artifacts
    checks["referenced_artifacts_have_hashes"] = not invalid_hashes
    if missing_artifacts:
        errors.append("Referenced artifacts are missing: " + ", ".join(missing_artifacts))
    if invalid_hashes:
        errors.append(
            "Referenced artifacts have invalid hashes: " + ", ".join(invalid_hashes)
        )

    target_contract = manifest.get("target_contract", {})
    lanes = target_contract.get("lane_placeholders", []) if isinstance(target_contract, dict) else []
    lane_errors: list[str] = []
    if not isinstance(lanes, list) or not lanes:
        lane_errors.append("lane_placeholders must be a non-empty list.")
        lanes = []
    for lane in lanes:
        if not isinstance(lane, dict):
            lane_errors.append("Each lane placeholder must be an object.")
            continue
        if lane.get("status") not in {"contract_only", "deferred"}:
            lane_errors.append(f"Lane {lane.get('lane')} has invalid status.")
        if lane.get("claims") not in ([], None):
            lane_errors.append(f"Lane {lane.get('lane')} must not contain claims.")
    checks["lane_placeholders_are_contracts"] = not lane_errors
    errors.extend(lane_errors)

    component_registry = manifest.get("component_registry", [])
    component_errors: list[str] = []
    if not isinstance(component_registry, list) or not component_registry:
        component_errors.append("component_registry must be a non-empty list.")
        component_registry = []
    for component in component_registry:
        if not isinstance(component, dict):
            component_errors.append("Each component entry must be an object.")
            continue
        if component.get("status") != "placeholder_not_trained":
            component_errors.append(
                f"Component {component.get('component_family')} must be placeholder_not_trained."
            )
        if any(key in component for key in {"artifact_uri", "model_path", "weights"}):
            component_errors.append(
                f"Component {component.get('component_family')} contains trained-artifact fields."
            )
    checks["components_are_placeholders"] = not component_errors
    errors.extend(component_errors)

    split_plan = manifest.get("data_split_plan", {})
    checks["split_plan_not_executed"] = (
        isinstance(split_plan, dict)
        and split_plan.get("status") == "planned_not_executed"
        and split_plan.get("not_a_backtest") is True
    )
    if not checks["split_plan_not_executed"]:
        errors.append("data_split_plan must be planned_not_executed and not_a_backtest.")

    mapping = manifest.get("typed_model_metadata_mapping", {})
    checks["typed_metadata_preview_only"] = (
        isinstance(mapping, dict) and mapping.get("status") == "preview_only_not_inserted"
    )
    if not checks["typed_metadata_preview_only"]:
        errors.append("typed_model_metadata_mapping must be preview_only_not_inserted.")

    errors.extend(check_output_scope(manifest))
    checks["output_scope_clean"] = not any(
        "forbidden scope term" in error for error in errors
    )

    dashboard_uri = manifest.get("dashboard", {}).get("dashboard_state_uri")
    if dashboard_uri:
        dashboard_path = resolve_path(dashboard_uri)
        if dashboard_path.exists():
            dashboard = load_json(dashboard_path)
            checks["dashboard_run_id_matches"] = dashboard.get("run_id") == manifest.get(
                "run_id"
            )
            checks["dashboard_status_matches"] = (
                dashboard.get("status") == manifest.get("status")
            )
            if not checks["dashboard_run_id_matches"]:
                errors.append("Dashboard run_id does not match manifest run_id.")
            if not checks["dashboard_status_matches"]:
                errors.append("Dashboard status does not match manifest status.")
        else:
            checks["dashboard_exists"] = False
            errors.append(f"Dashboard state does not exist: {dashboard_path}")
    else:
        checks["dashboard_exists"] = False
        errors.append("dashboard.dashboard_state_uri is required.")

    preview_uri = mapping.get("preview_uri") if isinstance(mapping, dict) else None
    if preview_uri:
        preview_path = resolve_path(preview_uri)
        if preview_path.exists():
            preview = load_json(preview_path)
            checks["registry_preview_status"] = (
                preview.get("status") == "preview_only_not_inserted"
            )
            checks["registry_component_row_count"] = len(
                preview.get("model_component_runs", [])
            ) == len(component_registry)
            checks["registry_lane_row_count"] = len(preview.get("model_run_lanes", [])) == len(
                lanes
            )
            if not checks["registry_preview_status"]:
                errors.append("Registry preview status must be preview_only_not_inserted.")
            if not checks["registry_component_row_count"]:
                errors.append("Registry preview component row count mismatch.")
            if not checks["registry_lane_row_count"]:
                errors.append("Registry preview lane row count mismatch.")
        else:
            errors.append(f"Registry preview does not exist: {preview_path}")
    else:
        errors.append("typed_model_metadata_mapping.preview_uri is required.")

    summary = {
        "run_id": manifest.get("run_id"),
        "feature_run_id": feature_artifact.get("feature_run_id"),
        "component_count": len(component_registry),
        "lane_count": len(lanes),
        "artifact_count": len(artifact_hashes),
        "warning_count": len(warnings),
        "error_count": len(errors),
    }
    return {
        "ok": not errors,
        "manifest_path": str(path),
        "errors": errors,
        "warnings": warnings,
        "checks": checks,
        "summary": summary,
    }


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Validate an MLB-M3 alpha-2 infrastructure manifest."
    )
    parser.add_argument(
        "--manifest",
        type=Path,
        default=DEFAULT_MANIFEST_PATH,
        help="Path to manifest.json.",
    )
    parser.add_argument(
        "--report",
        type=Path,
        default=None,
        help="Optional path to write a validation report JSON.",
    )
    parser.add_argument(
        "--json",
        action="store_true",
        help="Print the full validation payload as JSON.",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    result = validate_manifest(args.manifest)
    if args.report:
        report_path = resolve_path(args.report)
        report_path.parent.mkdir(parents=True, exist_ok=True)
        report_path.write_text(
            json.dumps(result, indent=2, sort_keys=True) + "\n",
            encoding="utf-8",
        )
    if args.json or not result["ok"]:
        print(json.dumps(result, indent=2, sort_keys=True))
    else:
        print(json.dumps({"ok": True, "summary": result["summary"]}, indent=2))
    if not result["ok"]:
        sys.exit(1)


if __name__ == "__main__":
    main()
