#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[4]
DEFAULT_CONTRACT_PATH = (
    ROOT
    / "pipeline"
    / "mlb"
    / "features"
    / "contracts"
    / "m3_fs_001_game_shape_starter_v1.json"
)

REQUIRED_TOP_LEVEL_KEYS = {
    "feature_set_id",
    "version",
    "grain",
    "sport",
    "source_db",
    "as_of_policy",
    "primary_key",
    "time_key",
    "feature_prefixes",
    "target_prefix",
    "leakage_classes",
    "evidence_policy",
    "source_tables",
    "targets",
    "feature_families",
    "downstream_distribution_families",
    "prop_contract_families",
    "distribution_bridge_policy",
    "required_report_fields",
}

REQUIRED_EVIDENCE_POLICY_KEYS = {
    "evidence_policy_id",
    "baseline_layers",
    "evidence_units",
    "state_memory_encoders",
    "residual_baselines",
    "required_coverage_fields",
}

FORBIDDEN_CONTRACT_TERMS = {
    "window_policy",
    "lookback",
    "last5",
    "last10",
    "recency",
    "decay",
    "kernel",
}


def load_contract(path: Path) -> dict[str, Any]:
    with path.open("r", encoding="utf-8") as handle:
        payload = json.load(handle)
    if not isinstance(payload, dict):
        raise ValueError(f"Contract must be a JSON object: {path}")
    return payload


def _walk_strings(value: Any) -> list[str]:
    if isinstance(value, str):
        return [value]
    if isinstance(value, dict):
        values: list[str] = []
        for key, child in value.items():
            values.append(str(key))
            values.extend(_walk_strings(child))
        return values
    if isinstance(value, list):
        values = []
        for child in value:
            values.extend(_walk_strings(child))
        return values
    return []


def validate_contract(contract: dict[str, Any]) -> dict[str, Any]:
    errors: list[str] = []
    warnings: list[str] = []

    missing = sorted(REQUIRED_TOP_LEVEL_KEYS - set(contract))
    if missing:
        errors.append(f"Missing top-level contract keys: {', '.join(missing)}")

    evidence_policy = contract.get("evidence_policy")
    if not isinstance(evidence_policy, dict):
        errors.append("Contract must include an evidence_policy object.")
        evidence_policy = {}

    missing_evidence = sorted(REQUIRED_EVIDENCE_POLICY_KEYS - set(evidence_policy))
    if missing_evidence:
        errors.append(
            "Missing evidence_policy keys: " + ", ".join(missing_evidence)
        )

    if "window_policy" in contract:
        errors.append("Contract must not define fixed-memory policy aliases.")

    forbidden_hits = sorted(
        {
            term
            for term in FORBIDDEN_CONTRACT_TERMS
            for text in _walk_strings(contract)
            if term in text.lower()
        }
    )
    if forbidden_hits:
        errors.append(
            "Contract contains fixed-memory vocabulary: "
            + ", ".join(forbidden_hits)
        )

    feature_prefixes = contract.get("feature_prefixes", [])
    if not isinstance(feature_prefixes, list) or not feature_prefixes:
        errors.append("feature_prefixes must be a non-empty list.")
    else:
        bad_prefixes = [
            prefix
            for prefix in feature_prefixes
            if isinstance(prefix, str)
            and prefix
            not in {"game_", "market_"}
            and not (prefix.startswith("home_") or prefix.startswith("away_"))
        ]
        if bad_prefixes:
            errors.append(
                "Side-specific feature prefixes must use home_/away_: "
                + ", ".join(bad_prefixes)
            )

    targets = contract.get("targets", [])
    target_prefix = contract.get("target_prefix", "target_")
    if not isinstance(targets, list) or not targets:
        errors.append("targets must be a non-empty list.")
    else:
        bad_targets = [
            target
            for target in targets
            if not isinstance(target, str) or not target.startswith(target_prefix)
        ]
        if bad_targets:
            errors.append(
                "Targets must use the configured target prefix: "
                + ", ".join(map(str, bad_targets))
            )

    required_coverage = set(evidence_policy.get("required_coverage_fields", []))
    missing_coverage = sorted(
        {"sample_count", "event_count", "availability_flag"} - required_coverage
    )
    if missing_coverage:
        errors.append(
            "evidence_policy.required_coverage_fields is missing: "
            + ", ".join(missing_coverage)
        )

    state_memory = evidence_policy.get("state_memory_encoders", [])
    if not isinstance(state_memory, list) or not state_memory:
        errors.append("evidence_policy.state_memory_encoders must be non-empty.")
    elif "reaction_to_prior_performance" not in state_memory:
        warnings.append(
            "state_memory_encoders does not include reaction_to_prior_performance."
        )

    distribution_families = contract.get("downstream_distribution_families", [])
    if not isinstance(distribution_families, list) or not distribution_families:
        errors.append("downstream_distribution_families must be a non-empty list.")

    prop_families = contract.get("prop_contract_families", [])
    if not isinstance(prop_families, list) or not prop_families:
        errors.append("prop_contract_families must be a non-empty list.")

    bridge_policy = contract.get("distribution_bridge_policy", {})
    if not isinstance(bridge_policy, dict):
        errors.append("distribution_bridge_policy must be an object.")
    else:
        if bridge_policy.get("props_are_distribution_contracts") is not True:
            errors.append(
                "distribution_bridge_policy.props_are_distribution_contracts must be true."
            )
        if bridge_policy.get("no_isolated_prop_models") is not True:
            errors.append(
                "distribution_bridge_policy.no_isolated_prop_models must be true."
            )

    return {
        "ok": not errors,
        "errors": errors,
        "warnings": warnings,
        "checks": {
            "required_top_level_keys": not missing,
            "required_evidence_policy_keys": not missing_evidence,
            "no_fixed_memory_policy_aliases": "window_policy" not in contract,
            "no_forbidden_memory_terms": not forbidden_hits,
            "target_prefixes": not any(
                not isinstance(target, str) or not target.startswith(target_prefix)
                for target in targets
            )
            if isinstance(targets, list)
            else False,
            "distribution_contracts_declared": isinstance(
                distribution_families, list
            )
            and bool(distribution_families),
            "prop_contracts_declared": isinstance(prop_families, list)
            and bool(prop_families),
            "props_are_distribution_contracts": isinstance(bridge_policy, dict)
            and bridge_policy.get("props_are_distribution_contracts") is True,
            "no_isolated_prop_models": isinstance(bridge_policy, dict)
            and bridge_policy.get("no_isolated_prop_models") is True,
            "side_prefixes": not errors
            or not any("Side-specific feature prefixes" in error for error in errors),
        },
    }


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Validate the MLB-M3 alpha game-shape starter contract."
    )
    parser.add_argument(
        "--contract",
        type=Path,
        default=DEFAULT_CONTRACT_PATH,
        help="Path to the M3-FS-001 contract JSON.",
    )
    parser.add_argument("--json", action="store_true", help="Emit JSON result.")
    args = parser.parse_args()

    result = validate_contract(load_contract(args.contract))
    if args.json:
        print(json.dumps(result, indent=2, sort_keys=True))
    elif result["ok"]:
        print(f"Contract ok: {args.contract}")
    else:
        print(f"Contract failed: {args.contract}")
        for error in result["errors"]:
            print(f"- {error}")
    return 0 if result["ok"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
