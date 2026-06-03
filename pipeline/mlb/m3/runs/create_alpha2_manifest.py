#!/usr/bin/env python3
from __future__ import annotations

import argparse
import hashlib
import json
import subprocess
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[4]
MANIFEST_VERSION = "0.1.0"
RUN_FAMILY = "mlb-m3-alpha-2-infrastructure"
MODEL_ID = "mlb-m3"
MODEL_VERSION = "alpha-2-infrastructure"

DEFAULT_FEATURE_REPORT = (
    ROOT
    / "data-migration"
    / "reports"
    / "m3_fs_001_game_shape_starter_v1_2026-03-26_to_2026-05-31.json"
)
DEFAULT_OUTPUT_DIR = ROOT / "data-private" / "models" / "mlb-m3" / "runs"

NON_GOALS = [
    "no trained model",
    "no backtest edge claim",
    "no simulator",
    "no picks",
    "no player prop pricing",
    "no claim that M3 is better",
]

COMPONENT_FAMILIES = [
    {
        "component_family": "game_shape_distribution",
        "role": "latent_game_environment",
        "status": "placeholder_not_trained",
        "future_outputs": [
            "run_environment",
            "chaos_game",
            "blowout",
            "late_volatility",
        ],
    },
    {
        "component_family": "team_run_distribution",
        "role": "team_scoring_path",
        "status": "placeholder_not_trained",
        "future_outputs": [
            "full_game_runs",
            "first_five_runs",
            "late_runs",
            "team_plate_appearances",
        ],
    },
    {
        "component_family": "starter_exit_distribution",
        "role": "starter_path",
        "status": "placeholder_not_trained",
        "future_outputs": [
            "outs_recorded",
            "hook_timing",
            "bridge_entry_point",
            "workload_path",
        ],
    },
    {
        "component_family": "starter_stat_distribution",
        "role": "starter_performance",
        "status": "placeholder_not_trained",
        "future_outputs": [
            "strikeouts",
            "runs_allowed",
            "walks_allowed",
            "hits_allowed",
            "home_runs_allowed",
        ],
    },
    {
        "component_family": "bullpen_shape_distribution",
        "role": "team_bullpen_churn",
        "status": "placeholder_not_trained",
        "future_outputs": [
            "normal_chain",
            "compressed_chain",
            "scramble_chain",
            "churn_regime",
        ],
    },
    {
        "component_family": "reliever_availability_distribution",
        "role": "individual_reliever_reset",
        "status": "placeholder_not_trained",
        "future_outputs": [
            "candidate_availability",
            "quick_reuse_probability",
            "reset_state",
            "bulk_exception_probability",
        ],
    },
    {
        "component_family": "first_up_reliever_router",
        "role": "first_reliever_identity_route",
        "status": "placeholder_not_trained",
        "future_outputs": [
            "first_up_probability_by_arm",
            "candidate_pool_entropy",
            "role_exception_probability",
        ],
    },
    {
        "component_family": "reliever_chain_distribution",
        "role": "relief_path",
        "status": "placeholder_not_trained",
        "future_outputs": [
            "chain_length",
            "second_arm_probability",
            "inherited_runner_state",
            "chain_break_probability",
        ],
    },
    {
        "component_family": "reliever_stat_distribution",
        "role": "reliever_performance",
        "status": "placeholder_not_trained",
        "future_outputs": [
            "outs_recorded",
            "pitches",
            "batters_faced",
            "strikeouts",
            "walks_allowed",
            "runs_allowed",
        ],
    },
    {
        "component_family": "pa_event_distribution",
        "role": "plate_appearance_event_path",
        "status": "placeholder_not_trained",
        "future_outputs": [
            "single",
            "double",
            "triple",
            "home_run",
            "walk",
            "strikeout",
            "ball_in_play_out",
        ],
    },
    {
        "component_family": "hitter_stat_distribution",
        "role": "hitter_game_stats",
        "status": "placeholder_not_trained",
        "future_outputs": [
            "hits",
            "total_bases",
            "home_runs",
            "rbi",
            "runs",
            "walks",
            "strikeouts",
        ],
    },
    {
        "component_family": "calibration_layer",
        "role": "probability_calibration",
        "status": "placeholder_not_trained",
        "future_outputs": [
            "calibrated_probabilities",
            "slice_calibration_metrics",
            "promotion_gate_decisions",
        ],
    },
]

LANE_PLACEHOLDERS = [
    {
        "lane": "full_game_total",
        "status": "contract_only",
        "target_columns": ["target_total_runs_final", "target_total_bucket"],
        "claims": [],
    },
    {
        "lane": "f5_total",
        "status": "contract_only",
        "target_columns": ["target_total_runs_f5", "target_f5_bucket"],
        "claims": [],
    },
    {
        "lane": "moneyline",
        "status": "deferred",
        "target_columns": [],
        "claims": [],
    },
    {
        "lane": "team_total",
        "status": "deferred",
        "target_columns": [
            "target_home_team_runs_final",
            "target_away_team_runs_final",
        ],
        "claims": [],
    },
    {
        "lane": "starter_props",
        "status": "deferred",
        "target_columns": [],
        "claims": [],
    },
    {
        "lane": "reliever_props",
        "status": "deferred",
        "target_columns": [],
        "claims": [],
    },
    {
        "lane": "hitter_props",
        "status": "deferred",
        "target_columns": [],
        "claims": [],
    },
]


def utc_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace(
        "+00:00", "Z"
    )


def default_run_id() -> str:
    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    return f"mlb_m3_alpha2_infra_{stamp}"


def resolve_path(value: str | Path) -> Path:
    path = Path(value)
    if path.is_absolute():
        return path
    return ROOT / path


def load_json(path: Path) -> dict[str, Any]:
    with path.open("r", encoding="utf-8") as handle:
        payload = json.load(handle)
    if not isinstance(payload, dict):
        raise ValueError(f"Expected a JSON object: {path}")
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


def sha256_json(payload: Any) -> str:
    encoded = json.dumps(payload, sort_keys=True, separators=(",", ":")).encode("utf-8")
    return hashlib.sha256(encoded).hexdigest()


def artifact_entry(role: str, path: Path, source: str) -> dict[str, Any]:
    exists = path.exists()
    return {
        "role": role,
        "path": str(path),
        "source": source,
        "exists": exists,
        "sha256": sha256_path(path),
        "bytes": path.stat().st_size if exists and path.is_file() else None,
    }


def run_git(args: list[str]) -> str | None:
    result = subprocess.run(
        ["git", *args],
        cwd=ROOT,
        check=False,
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        return None
    return result.stdout.strip()


def read_git_state() -> dict[str, Any]:
    status_short = run_git(["status", "--short"])
    head = run_git(["rev-parse", "HEAD"])
    branch = run_git(["branch", "--show-current"])
    return {
        "branch": branch,
        "head": head,
        "status_short": status_short or "",
        "dirty": bool(status_short),
    }


def data_dictionary_columns(path: Path) -> tuple[list[str], list[str], list[str]]:
    if not path.exists():
        return [], [], []
    dictionary = load_json(path)
    feature_columns: list[str] = []
    target_columns: list[str] = []
    metadata_columns: list[str] = []
    for column, detail in sorted(dictionary.items()):
        role = detail.get("role") if isinstance(detail, dict) else None
        if column.startswith("target_") or role == "target":
            target_columns.append(column)
        elif role == "feature":
            feature_columns.append(column)
        else:
            metadata_columns.append(column)
    return feature_columns, target_columns, metadata_columns


def build_artifacts(feature_report_path: Path, report: dict[str, Any]) -> list[dict[str, Any]]:
    fields = [
        ("feature_report", feature_report_path, "alpha1_report"),
        ("feature_matrix", report.get("matrix_uri"), "alpha1_feature_artifact"),
        ("data_dictionary", report.get("data_dictionary_uri"), "alpha1_feature_artifact"),
        ("lineage", report.get("lineage_uri"), "alpha1_feature_artifact"),
        ("missingness", report.get("missingness_uri"), "alpha1_feature_artifact"),
        ("leakage", report.get("leakage_uri"), "alpha1_feature_artifact"),
        ("coverage", report.get("coverage_uri"), "alpha1_feature_artifact"),
    ]
    artifacts: list[dict[str, Any]] = []
    seen: set[str] = set()
    for role, raw_path, source in fields:
        if not raw_path:
            continue
        path = resolve_path(raw_path)
        key = str(path)
        if key in seen:
            continue
        seen.add(key)
        artifacts.append(artifact_entry(role, path, source))
    return artifacts


def split_plan(report: dict[str, Any], train_end: str, validation_start: str) -> dict[str, Any]:
    return {
        "status": "planned_not_executed",
        "policy": "chronological_alpha_harness",
        "start_date": report.get("start_date"),
        "end_date": report.get("end_date"),
        "train_candidate_range": {
            "start": report.get("start_date"),
            "end": train_end,
        },
        "validation_candidate_range": {
            "start": validation_start,
            "end": report.get("end_date"),
        },
        "not_a_backtest": True,
        "notes": [
            "This split exists so future training and backtest runners have a manifest contract.",
            "It is not a validated walk-forward design and does not imply model quality.",
        ],
    }


def typed_registry_preview(
    run_id: str,
    created_at: str,
    manifest_path: Path,
    report: dict[str, Any],
    artifacts: list[dict[str, Any]],
    component_registry: list[dict[str, Any]],
    lanes: list[dict[str, Any]],
) -> dict[str, Any]:
    present_artifacts = [artifact for artifact in artifacts if artifact.get("exists")]
    input_hash = sha256_json(
        [
            {
                "role": artifact["role"],
                "path": artifact["path"],
                "sha256": artifact["sha256"],
            }
            for artifact in present_artifacts
            if artifact.get("source", "").startswith("alpha1")
        ]
    )
    artifact_summary = {
        "artifact_count": len(artifacts),
        "present_artifact_count": len(present_artifacts),
        "missing_artifact_count": len(artifacts) - len(present_artifacts),
        "non_goals": NON_GOALS,
    }
    model_run = {
        "model_run_id": run_id,
        "sport": "mlb",
        "model_id": MODEL_ID,
        "model_version": MODEL_VERSION,
        "run_date": created_at[:10],
        "run_type": "infrastructure_manifest",
        "status": "manifest_created",
        "cartridge_path": None,
        "manifest_path": str(manifest_path),
        "input_hash": input_hash,
        "output_hash": None,
        "created_at": created_at,
        "notes": "Alpha-2 infrastructure manifest only; no trained model, picks, simulator, prop pricing, or backtest edge claim.",
        "snapshot_hash": report.get("input_hash"),
        "source_hash": sha256_json(
            {
                "feature_set_id": report.get("feature_set_id"),
                "feature_set_version": report.get("feature_set_version"),
                "run_id": report.get("run_id"),
                "matrix_uri": report.get("matrix_uri"),
            }
        ),
        "source_files": len(present_artifacts),
        "input_count": report.get("row_count"),
        "output_count": 0,
        "artifact_summary_json": artifact_summary,
        "source_table": "m3_feature_artifact",
        "source_pk": report.get("run_id"),
        "source_detail_json": {
            "feature_report": report.get("report_uri"),
            "feature_set_id": report.get("feature_set_id"),
            "feature_set_version": report.get("feature_set_version"),
            "builder_version": report.get("builder_version"),
        },
    }
    artifact_rows = [
        {
            "model_run_artifact_id": f"{run_id}:{artifact['role']}",
            "model_run_id": run_id,
            "artifact_role": artifact["role"],
            "artifact_path": artifact["path"],
            "sha256": artifact["sha256"],
            "exists_flag": 1 if artifact["exists"] else 0,
            "source_table": artifact["source"],
            "source_pk": report.get("run_id"),
            "source_detail_json": {"bytes": artifact.get("bytes")},
            "created_at": created_at,
        }
        for artifact in artifacts
    ]
    component_rows = [
        {
            "model_component_run_id": f"{run_id}:{component['component_family']}",
            "parent_model_run_id": run_id,
            "component_run_id": None,
            "component_model_id": component["component_family"],
            "component_role": component["role"],
            "status": component["status"],
            "details_json": component,
            "source_table": "m3_alpha2_component_registry",
            "source_pk": component["component_family"],
            "source_detail_json": {"future_outputs": component["future_outputs"]},
            "created_at": created_at,
        }
        for component in component_registry
    ]
    lane_rows = [
        {
            "model_run_lane_id": f"{run_id}:{lane['lane']}",
            "model_run_id": run_id,
            "lane": lane["lane"],
            "status": lane["status"],
            "row_count": 0,
            "graded_count": 0,
            "hit_count": None,
            "miss_count": None,
            "hit_pct": None,
            "avg_pnl_per100": None,
            "details_json": lane,
            "source_table": "m3_alpha2_lane_placeholders",
            "source_pk": lane["lane"],
            "source_detail_json": {"target_columns": lane["target_columns"]},
            "created_at": created_at,
        }
        for lane in lanes
    ]
    return {
        "status": "preview_only_not_inserted",
        "target_tables": [
            "model_runs",
            "model_run_artifacts",
            "model_component_runs",
            "model_run_lanes",
        ],
        "model_runs": [model_run],
        "model_run_artifacts": artifact_rows,
        "model_component_runs": component_rows,
        "model_run_lanes": lane_rows,
    }


def report_markdown(
    run_id: str,
    run_dir: Path,
    report: dict[str, Any],
    artifacts: list[dict[str, Any]],
    warnings: list[str],
) -> str:
    missing = [artifact for artifact in artifacts if not artifact["exists"]]
    lines = [
        f"# MLB-M3 Alpha-2 Infrastructure Report",
        "",
        f"Run ID: `{run_id}`",
        "",
        "## Status",
        "",
        "`manifest_created`",
        "",
        "This is an infrastructure manifest only. It does not train a model, run a backtest, simulate games, price props, or produce picks.",
        "",
        "## Alpha-1 Input",
        "",
        f"- Feature set: `{report.get('feature_set_id')}` `{report.get('feature_set_version')}`",
        f"- Alpha-1 run: `{report.get('run_id')}`",
        f"- Rows: `{report.get('row_count')}`",
        f"- Columns: `{report.get('column_count')}`",
        f"- Targets: `{report.get('target_count')}`",
        f"- Features: `{report.get('feature_count')}`",
        "",
        "## Artifact Hashing",
        "",
        f"- Referenced artifacts: `{len(artifacts)}`",
        f"- Missing referenced artifacts: `{len(missing)}`",
        "",
        "## Component Registry",
        "",
        "All component entries are `placeholder_not_trained` until a future training phase produces artifacts.",
        "",
        "## Dashboard",
        "",
        f"- Run directory: `{run_dir}`",
        f"- Dashboard state: `{run_dir / 'dashboard_state.json'}`",
        "",
        "## Warnings",
        "",
    ]
    if warnings:
        lines.extend([f"- {warning}" for warning in warnings])
    else:
        lines.append("- none")
    lines.append("")
    return "\n".join(lines)


def build_manifest(
    feature_report_path: Path,
    output_dir: Path,
    run_id: str,
    train_end: str,
    validation_start: str,
    force: bool,
) -> dict[str, Any]:
    feature_report_path = resolve_path(feature_report_path)
    output_dir = resolve_path(output_dir)
    if not feature_report_path.exists():
        raise FileNotFoundError(f"Feature report does not exist: {feature_report_path}")

    report = load_json(feature_report_path)
    run_dir = output_dir / run_id
    if run_dir.exists() and not force:
        raise FileExistsError(f"Run directory already exists: {run_dir}")
    run_dir.mkdir(parents=True, exist_ok=True)

    created_at = utc_now()
    git = read_git_state()
    warnings: list[str] = []
    if git["dirty"]:
        warnings.append("Git worktree was dirty when the manifest was generated.")

    input_artifacts = build_artifacts(feature_report_path, report)
    missing_input_artifacts = [
        artifact["role"] for artifact in input_artifacts if not artifact["exists"]
    ]
    if missing_input_artifacts:
        warnings.append(
            "Missing referenced input artifacts: " + ", ".join(missing_input_artifacts)
        )

    data_dictionary_path = resolve_path(report.get("data_dictionary_uri", ""))
    feature_columns, target_columns, metadata_columns = data_dictionary_columns(
        data_dictionary_path
    )

    manifest_path = run_dir / "manifest.json"
    dashboard_path = run_dir / "dashboard_state.json"
    lineage_path = run_dir / "lineage.json"
    warnings_path = run_dir / "warnings.json"
    report_path = run_dir / "report.md"
    artifacts_path = run_dir / "artifacts.json"
    registry_preview_path = run_dir / "typed_model_registry_preview.json"

    manifest = {
        "manifest_version": MANIFEST_VERSION,
        "run_id": run_id,
        "run_family": RUN_FAMILY,
        "sport": "mlb",
        "model_id": MODEL_ID,
        "model_version": MODEL_VERSION,
        "status": "manifest_created",
        "created_at": created_at,
        "feature_artifact": {
            "feature_report_uri": str(feature_report_path),
            "feature_set_id": report.get("feature_set_id"),
            "feature_set_version": report.get("feature_set_version"),
            "feature_run_id": report.get("run_id"),
            "matrix_uri": report.get("matrix_uri"),
            "row_count": report.get("row_count"),
            "column_count": report.get("column_count"),
            "feature_count": report.get("feature_count"),
            "target_count": report.get("target_count"),
            "start_date": report.get("start_date"),
            "end_date": report.get("end_date"),
            "uses_sports_db": report.get("uses_sports_db"),
            "uses_m2_weights": report.get("uses_m2_weights"),
            "uses_hand_picked_memory_lengths": report.get(
                "uses_hand_picked_memory_lengths"
            ),
        },
        "artifact_hashes": input_artifacts,
        "target_contract": {
            "available_target_columns": target_columns,
            "lane_placeholders": LANE_PLACEHOLDERS,
        },
        "feature_contract": {
            "feature_column_count": len(feature_columns),
            "metadata_column_count": len(metadata_columns),
            "feature_columns": feature_columns,
            "metadata_columns": metadata_columns,
        },
        "component_registry": COMPONENT_FAMILIES,
        "data_split_plan": split_plan(report, train_end, validation_start),
        "dashboard": {
            "dashboard_state_uri": str(dashboard_path),
            "active_phase": "manifest_created",
            "report_uri": str(report_path),
        },
        "typed_model_metadata_mapping": {
            "status": "preview_only_not_inserted",
            "preview_uri": str(registry_preview_path),
            "tables": [
                "model_runs",
                "model_run_artifacts",
                "model_component_runs",
                "model_run_lanes",
            ],
        },
        "output_artifacts": {
            "manifest_uri": str(manifest_path),
            "dashboard_state_uri": str(dashboard_path),
            "lineage_uri": str(lineage_path),
            "artifacts_uri": str(artifacts_path),
            "typed_model_registry_preview_uri": str(registry_preview_path),
            "warnings_uri": str(warnings_path),
            "report_uri": str(report_path),
        },
        "non_goals": NON_GOALS,
        "warnings": warnings,
        "git": git,
    }

    dashboard_state = {
        "run_id": run_id,
        "run_family": RUN_FAMILY,
        "status": "manifest_created",
        "active_phase": "manifest_created",
        "created_at": created_at,
        "run_dir": str(run_dir),
        "manifest_uri": str(manifest_path),
        "feature_set_id": report.get("feature_set_id"),
        "feature_set_version": report.get("feature_set_version"),
        "feature_run_id": report.get("run_id"),
        "row_count": report.get("row_count"),
        "column_count": report.get("column_count"),
        "feature_count": report.get("feature_count"),
        "target_count": report.get("target_count"),
        "component_placeholder_count": len(COMPONENT_FAMILIES),
        "lane_placeholder_count": len(LANE_PLACEHOLDERS),
        "warnings": warnings,
        "non_goals": NON_GOALS,
        "next_recommended_actions": [
            "Add a manifest validator before DB registration writes.",
            "Build a baseline training harness that consumes this manifest without emitting picks.",
            "Add walk-forward split definitions and backtest diagnostics as separate artifacts.",
            "Add a static run dashboard view that reads dashboard_state.json and artifacts.json.",
        ],
    }

    lineage = {
        "run_id": run_id,
        "created_at": created_at,
        "feature_report_uri": str(feature_report_path),
        "alpha1_feature_lineage": report.get("lineage"),
        "input_artifacts": input_artifacts,
        "git": git,
        "typed_db_registration": "preview_only_not_inserted",
        "non_goals": NON_GOALS,
    }

    write_json(manifest_path, manifest)
    write_json(dashboard_path, dashboard_state)
    write_json(lineage_path, lineage)
    write_json(warnings_path, {"warnings": warnings, "non_goals": NON_GOALS})
    report_path.write_text(
        report_markdown(run_id, run_dir, report, input_artifacts, warnings),
        encoding="utf-8",
    )

    output_artifacts = [
        artifact_entry("manifest", manifest_path, "alpha2_generated"),
        artifact_entry("dashboard_state", dashboard_path, "alpha2_generated"),
        artifact_entry("lineage", lineage_path, "alpha2_generated"),
        artifact_entry("warnings", warnings_path, "alpha2_generated"),
        artifact_entry("report", report_path, "alpha2_generated"),
    ]
    all_known_artifacts = input_artifacts + output_artifacts
    artifacts_index = {
        "run_id": run_id,
        "created_at": created_at,
        "status": "written",
        "self_hash_note": "artifacts.json and registry preview are generated after this index is assembled; hash them from disk when registering.",
        "artifacts": all_known_artifacts,
    }
    write_json(artifacts_path, artifacts_index)

    registry_preview = typed_registry_preview(
        run_id=run_id,
        created_at=created_at,
        manifest_path=manifest_path,
        report=report,
        artifacts=all_known_artifacts
        + [
            artifact_entry("artifacts_index", artifacts_path, "alpha2_generated"),
        ],
        component_registry=COMPONENT_FAMILIES,
        lanes=LANE_PLACEHOLDERS,
    )
    write_json(registry_preview_path, registry_preview)

    summary = {
        "ok": True,
        "run_id": run_id,
        "run_dir": str(run_dir),
        "manifest_uri": str(manifest_path),
        "dashboard_state_uri": str(dashboard_path),
        "registry_preview_uri": str(registry_preview_path),
        "warnings": warnings,
        "non_goals": NON_GOALS,
    }
    print(json.dumps(summary, indent=2, sort_keys=True))
    return summary


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Create an MLB-M3 alpha-2 infrastructure run manifest."
    )
    parser.add_argument(
        "--feature-report",
        type=Path,
        default=DEFAULT_FEATURE_REPORT,
        help="Alpha-1 feature report JSON to use as the manifest input.",
    )
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=DEFAULT_OUTPUT_DIR,
        help="Directory where the alpha-2 run directory should be written.",
    )
    parser.add_argument(
        "--run-id",
        default=None,
        help="Optional run id. Defaults to mlb_m3_alpha2_infra_<utc timestamp>.",
    )
    parser.add_argument(
        "--train-end",
        default="2026-05-15",
        help="Planned train candidate end date. This does not run training.",
    )
    parser.add_argument(
        "--validation-start",
        default="2026-05-16",
        help="Planned validation candidate start date. This does not run backtesting.",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Overwrite files inside an existing run directory.",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    build_manifest(
        feature_report_path=args.feature_report,
        output_dir=args.output_dir,
        run_id=args.run_id or default_run_id(),
        train_end=args.train_end,
        validation_start=args.validation_start,
        force=args.force,
    )


if __name__ == "__main__":
    main()
