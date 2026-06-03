#!/usr/bin/env python3
from __future__ import annotations

import argparse
import hashlib
import json
import sys
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from pipeline.mlb.m3.harness.run_alpha3_harness import load_matrix
from pipeline.mlb.m3.runs.validate_alpha2_manifest import validate_manifest


ROOT = Path(__file__).resolve().parents[4]
DEFAULT_MANIFEST = (
    ROOT
    / "data-private"
    / "models"
    / "mlb-m3"
    / "runs"
    / "mlb_m3_alpha2_infra_fs003_20260603T162241Z"
    / "manifest.json"
)
DEFAULT_HARNESS_DIR = (
    ROOT
    / "data-private"
    / "models"
    / "mlb-m3"
    / "runs"
    / "mlb_m3_alpha2_infra_fs003_20260603T162241Z"
    / "training_harness_alpha5"
)
DEFAULT_OUTPUT_SUBDIR = "family_redesign_audit_alpha6"
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

SURFACES: list[dict[str, Any]] = [
    {
        "surface_id": "starter_workload_trajectory",
        "family": "starter_path",
        "component_family": "starter_exit_distribution",
        "priority": "P0",
        "current_status": "partial",
        "terms": ["prior_outs", "last_outs", "short_start", "days_since_last_start", "pitches"],
        "fs004_requirement": "Separate starter workload baseline, last-event deviation, trajectory/change-point evidence, floor distance, and hook/exit target scaffolding.",
        "gap": "FS-003 has workload facts but not a true trajectory or exit distribution target.",
    },
    {
        "surface_id": "starter_damage_distribution",
        "family": "starter_path",
        "component_family": "starter_stat_distribution",
        "priority": "P0",
        "current_status": "partial",
        "terms": ["last_runs_allowed", "bad_start", "mistake", "hr_rate", "walk_rate", "strikeout_rate"],
        "fs004_requirement": "Separate damage baseline, damage volatility, command-break state, walk-burst state, HR damage, and low-evidence uncertainty.",
        "gap": "FS-003 mixes damage hints into flat columns; it does not expose a distributional starter damage head.",
    },
    {
        "surface_id": "starter_pitch_shape_change",
        "family": "starter_path",
        "component_family": "starter_stat_distribution",
        "priority": "P1",
        "current_status": "partial",
        "terms": ["pitch_mix", "weighted_whiff", "weighted_damage", "command_leak", "hard_contact"],
        "fs004_requirement": "Represent pitch-shape state and recent pitch-shape change separately from aggregate starter quality.",
        "gap": "Current pitch-mix snapshots are useful but not encoded as change or pitch-by-pitch state transitions.",
    },
    {
        "surface_id": "starter_opponent_pressure_residual",
        "family": "starter_path",
        "search_families": ["starter_path", "hitter_path"],
        "component_family": "starter_exit_distribution",
        "priority": "P0",
        "current_status": "partial",
        "terms": ["starter_phase", "matchup", "traffic_fit", "damage_fit", "hitter_path"],
        "fs004_requirement": "Compare starter outcomes against opponent-adjusted hitter pressure instead of raw starter form alone.",
        "gap": "Starter-phase hitter matchup exists, but residuals are not explicitly joined to starter workload/damage state.",
    },
    {
        "surface_id": "starter_low_data_uncertainty",
        "family": "starter_path",
        "component_family": "calibration_layer",
        "priority": "P0",
        "current_status": "partial",
        "terms": ["low_evidence", "prior_start_count", "sample"],
        "fs004_requirement": "Represent low-data status as uncertainty/shrinkage metadata, not as a hidden fallback or fixed sample bucket.",
        "gap": "Evidence flags exist; no uncertainty model or per-surface reliability contract exists.",
    },
    {
        "surface_id": "reliever_availability_reset",
        "family": "reliever_chain",
        "component_family": "reliever_availability_distribution",
        "priority": "P0",
        "current_status": "partial",
        "terms": ["availability", "fatigue", "days_since_last", "back_to_back", "worked_yesterday"],
        "fs004_requirement": "Separate individual-arm availability, quick-reuse probability, reset state, and bulk exception probability.",
        "gap": "Availability/reset features exist as averages over likely chains, not as calibrated individual-arm distributions.",
    },
    {
        "surface_id": "first_up_reliever_router",
        "family": "reliever_chain",
        "component_family": "first_up_reliever_router",
        "priority": "P0",
        "current_status": "partial",
        "terms": ["candidate_pool", "chain_known", "bridge_score", "expected_outs"],
        "fs004_requirement": "Model a probability distribution over first-up reliever candidates, not one hard selected arm.",
        "gap": "Candidate pool shape exists; no first-up identity target, route probability, or role exception target exists.",
    },
    {
        "surface_id": "reliever_chain_length_regime",
        "family": "reliever_chain",
        "component_family": "reliever_chain_distribution",
        "priority": "P0",
        "current_status": "partial",
        "terms": ["expected_outs", "reliever_count", "5plus_reliever", "prior_relievers"],
        "fs004_requirement": "Represent normal, compressed, scramble, and churn chain regimes with expected chain length and remaining-pool quality.",
        "gap": "FS-003 has chain length hints but no explicit chain-regime labels or distribution target.",
    },
    {
        "surface_id": "reliever_performance_volatility",
        "family": "reliever_chain",
        "component_family": "reliever_stat_distribution",
        "priority": "P0",
        "current_status": "partial",
        "terms": ["command", "free_pass", "reached", "risk_index", "run_delta", "hits_walks_allowed"],
        "fs004_requirement": "Separate reliever availability from reliever performance volatility, traffic creation, and inherited-runner damage.",
        "gap": "Command profile coverage is sparse and averaged; inherited-runner and entry-state context are not first-class.",
    },
    {
        "surface_id": "hitter_vs_starter_phase",
        "family": "hitter_path",
        "component_family": "pa_event_distribution",
        "priority": "P0",
        "current_status": "partial",
        "terms": ["starter_phase", "pitch_type", "statcast", "opponent_weighted"],
        "fs004_requirement": "Encode hitter event distributions against the starter phase of the opponent pitching path.",
        "gap": "Starter-phase matchup averages exist, but not player-level event distributions or PA-state interactions.",
    },
    {
        "surface_id": "hitter_vs_reliever_chain_phase",
        "family": "hitter_path",
        "component_family": "pa_event_distribution",
        "priority": "P0",
        "current_status": "missing",
        "terms": ["reliever_chain_hitter", "hitter_path_reliever", "vs_reliever", "relief_hitter"],
        "fs004_requirement": "Encode hitter event distributions against the likely reliever-chain phase of the single opponent pitching path.",
        "gap": "No reliever-chain hitter surface is materialized in FS-003.",
    },
    {
        "surface_id": "hitter_current_state_residual",
        "family": "hitter_path",
        "component_family": "hitter_stat_distribution",
        "priority": "P1",
        "current_status": "partial",
        "terms": ["statcast", "xwoba", "barrel", "hard_hit", "pitch_type_response"],
        "fs004_requirement": "Separate hitter talent baseline from current-state residuals and pitch-type response reliability.",
        "gap": "FS-003 has aggregate state hints but does not separate baseline talent, residual, and evidence reliability.",
    },
    {
        "surface_id": "lineup_pa_volume_context",
        "family": "hitter_path",
        "component_family": "team_run_distribution",
        "priority": "P0",
        "current_status": "partial",
        "terms": ["lineup", "slot_count", "lineup_player_count", "complete_flag"],
        "fs004_requirement": "Represent PA volume as an output of lineup turnover, walks, scoring state, and pitcher damage, not fixed expected AB.",
        "gap": "Lineup coverage exists; PA volume distribution does not.",
    },
    {
        "surface_id": "ordered_story_memory",
        "family": "story_memory",
        "component_family": "game_shape_distribution",
        "priority": "P0",
        "current_status": "partial",
        "terms": ["days_since", "current_", "alternation", "last_game", "prior_"],
        "fs004_requirement": "Preserve ordered game-story transitions as state context instead of only flat rates and days-since fields.",
        "gap": "FS-003 has days-since and run-length facts but not an ordered event stream or sequence encoding artifact.",
    },
    {
        "surface_id": "traffic_conversion_state",
        "family": "story_memory",
        "component_family": "game_shape_distribution",
        "priority": "P0",
        "current_status": "partial",
        "terms": ["traffic_no_conversion", "scored_first", "scoreless_first"],
        "fs004_requirement": "Separate traffic-without-conversion, early pressure, and conversion state so dead-bat games are not averaged into normal unders.",
        "gap": "Traffic story labels exist, but PA/base-out replay state is not feature-materialized as ordered transitions.",
    },
    {
        "surface_id": "game_regime_labels",
        "family": "story_memory",
        "search_families": ["story_memory", "target"],
        "component_family": "game_shape_distribution",
        "priority": "P0",
        "current_status": "partial",
        "terms": ["target_chaos", "target_total_bucket", "target_f5_bucket", "chaos", "dead_bat", "first5_firefight"],
        "fs004_requirement": "Create explicit low, normal, high-run, chaos, starter-failure, and bullpen-collapse labels for regime training.",
        "gap": "Targets and story hints exist, but latent regime label contract is not formalized.",
    },
    {
        "surface_id": "schedule_travel_context",
        "family": "game_context",
        "component_family": "game_shape_distribution",
        "priority": "P2",
        "current_status": "partial",
        "terms": ["day_of_week", "weekend", "days_since_prior_game", "played_yesterday", "start_hour"],
        "fs004_requirement": "Add schedule, rest, travel, series, start-time, and time-zone context with coverage flags.",
        "gap": "Rest/day context exists; travel distance, time-zone shift, and series completeness are missing.",
    },
    {
        "surface_id": "market_context_lines",
        "family": "market_context",
        "component_family": "calibration_layer",
        "priority": "P2",
        "current_status": "partial",
        "terms": ["market_", "pregame_snapshot"],
        "fs004_requirement": "Separate market line, price, timestamp, market source, and closing movement from mere snapshot count.",
        "gap": "FS-003 only retains market snapshot counts after pruning sparse line fields.",
    },
    {
        "surface_id": "tail_calibration_feedback",
        "family": "feedback",
        "component_family": "calibration_layer",
        "priority": "P0",
        "current_status": "missing",
        "terms": ["calibration", "tail", "promotion", "settlement"],
        "fs004_requirement": "Attach feature-family redesign to tail/regime calibration diagnostics and promotion/rejection gates.",
        "gap": "Harness has walk-forward and ablations; it does not have calibration, settlement, or promotion gates.",
    },
]


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


def dictionary_path_from_manifest(manifest: dict[str, Any]) -> Path:
    for artifact in manifest.get("artifact_hashes", []):
        if artifact.get("role") == "data_dictionary":
            return resolve_path(str(artifact["path"]))
    raise ValueError("Manifest does not reference a data_dictionary artifact.")


def infer_family(column: str, role: str | None = None) -> str:
    if role in {"target", "primary_key", "time_key", "metadata"}:
        return role
    if "story_" in column:
        return "story_memory"
    if "starter_" in column:
        return "starter_path"
    if "reliever_" in column or "relief_" in column:
        return "reliever_chain"
    if "hitter_path" in column or "lineup" in column:
        return "hitter_path"
    if (
        "context_" in column
        or column.startswith("game_day")
        or column.startswith("game_is_")
        or column.startswith("game_start_hour")
        or column.startswith("game_series")
    ):
        return "game_context"
    if column.startswith("market_"):
        return "market_context"
    if column.startswith("game_"):
        return "game_metadata"
    return "other"


def match_columns(columns: list[str], terms: list[str]) -> dict[str, list[str]]:
    matches: dict[str, list[str]] = {}
    for term in terms:
        term_lower = term.lower()
        matches[term] = [
            column
            for column in columns
            if term_lower in column.lower()
        ]
    return matches


def surface_evidence_status(surface: dict[str, Any], matches: dict[str, list[str]]) -> str:
    term_count = len(surface["terms"])
    covered = sum(1 for values in matches.values() if values)
    if term_count == 0 or covered == 0:
        return "missing"
    if covered == term_count:
        return "covered_by_columns"
    return "partial_column_coverage"


def family_inventory(dictionary: dict[str, Any], df) -> dict[str, Any]:
    payload: dict[str, Any] = {}
    family_columns: dict[str, list[str]] = defaultdict(list)
    for column, detail in dictionary.items():
        role = detail.get("role")
        if role != "feature":
            continue
        family_columns[infer_family(column, role)].append(column)
    for family, columns in sorted(family_columns.items()):
        column_payload = []
        for column in sorted(columns):
            series = df[column]
            missing_count = int(series.isna().sum())
            non_null_count = int(len(series) - missing_count)
            column_payload.append(
                {
                    "column": column,
                    "dtype": dictionary[column].get("dtype"),
                    "source": dictionary[column].get("source"),
                    "missing_count": missing_count,
                    "missing_rate": missing_count / len(series) if len(series) else None,
                    "non_null_count": non_null_count,
                    "unique_count": int(series.nunique(dropna=True)),
                }
            )
        payload[family] = {
            "column_count": len(columns),
            "columns": column_payload,
        }
    return payload


def summarize_harness(harness_dir: Path) -> dict[str, Any]:
    walk_forward_path = harness_dir / "walk_forward.json"
    ablations_path = harness_dir / "family_ablations.json"
    summary: dict[str, Any] = {
        "harness_dir": str(harness_dir),
        "walk_forward_uri": str(walk_forward_path),
        "family_ablations_uri": str(ablations_path),
        "walk_forward": [],
        "family_ablations": {},
    }
    if walk_forward_path.exists():
        walk_forward = load_json(walk_forward_path)
        for fold in walk_forward.get("folds", []):
            for lane, values in fold.get("lanes", {}).items():
                baseline = values.get("baseline", {})
                candidate = values.get("candidate", {})
                candidate_metrics = candidate.get("validation_metrics", {})
                summary["walk_forward"].append(
                    {
                        "fold_id": fold.get("fold_id"),
                        "lane": lane,
                        "baseline_mae": baseline.get("mae"),
                        "candidate_mae": candidate_metrics.get("mae"),
                        "candidate_delta_mae": (
                            candidate_metrics.get("mae") - baseline.get("mae")
                            if candidate_metrics.get("mae") is not None and baseline.get("mae") is not None
                            else None
                        ),
                        "candidate_feature_count": candidate.get("feature_count"),
                        "candidate_status": candidate.get("status"),
                    }
                )
    if ablations_path.exists():
        ablations = load_json(ablations_path)
        for lane, lane_payload in ablations.get("lanes", {}).items():
            all_metrics = lane_payload.get("all_features", {}).get("validation_metrics", {})
            all_mae = all_metrics.get("mae")
            family_rows = []
            for family, values in lane_payload.get("without_family", {}).items():
                metrics = values.get("validation_metrics", {})
                mae = metrics.get("mae")
                family_rows.append(
                    {
                        "family": family,
                        "without_family_mae": mae,
                        "delta_vs_all": mae - all_mae if mae is not None and all_mae is not None else None,
                    }
                )
            summary["family_ablations"][lane] = {
                "all_features_mae": all_mae,
                "without_family": sorted(
                    family_rows,
                    key=lambda row: (
                        row["delta_vs_all"] is None,
                        row["delta_vs_all"] if row["delta_vs_all"] is not None else 0,
                    ),
                ),
            }
    return summary


def columns_by_family(dictionary: dict[str, Any]) -> dict[str, list[str]]:
    grouped: dict[str, list[str]] = defaultdict(list)
    for column, detail in dictionary.items():
        role = detail.get("role")
        grouped[infer_family(column, role)].append(column)
    return {family: sorted(columns) for family, columns in grouped.items()}


def build_surface_gap_matrix(dictionary: dict[str, Any]) -> list[dict[str, Any]]:
    grouped_columns = columns_by_family(dictionary)
    rows: list[dict[str, Any]] = []
    for surface in SURFACES:
        search_families = surface.get("search_families") or [surface["family"]]
        search_columns = sorted(
            {
                column
                for family in search_families
                for column in grouped_columns.get(family, [])
            }
        )
        matches = match_columns(search_columns, surface["terms"])
        matched_columns = sorted(
            {
                column
                for values in matches.values()
                for column in values
            }
        )
        covered_terms = [term for term, values in matches.items() if values]
        missing_terms = [term for term, values in matches.items() if not values]
        rows.append(
            {
                "surface_id": surface["surface_id"],
                "family": surface["family"],
                "search_families": search_families,
                "component_family": surface["component_family"],
                "priority": surface["priority"],
                "current_status": surface["current_status"],
                "evidence_status": surface_evidence_status(surface, matches),
                "covered_terms": covered_terms,
                "missing_terms": missing_terms,
                "matched_column_count": len(matched_columns),
                "matched_columns": matched_columns,
                "fs004_requirement": surface["fs004_requirement"],
                "gap": surface["gap"],
            }
        )
    return rows


def candidate_fs004_spec(surface_rows: list[dict[str, Any]]) -> dict[str, Any]:
    required = [
        row for row in surface_rows
        if row["priority"] in {"P0", "P1"} and row["current_status"] != "represented"
    ]
    return {
        "feature_set_id": "m3_fs_004_state_path_redesign_v0",
        "status": "candidate_spec_not_materialized",
        "source_feature_set_id": "m3_fs_003_game_story_pitching_state_pruned_v0",
        "grain": "game",
        "as_of_policy": "pregame",
        "purpose": "First redesigned M3 baseball-state feature artifact after FS-003 showed flat family representation was the bottleneck.",
        "required_surface_count": len(required),
        "required_surfaces": [
            {
                "surface_id": row["surface_id"],
                "family": row["family"],
                "component_family": row["component_family"],
                "priority": row["priority"],
                "requirement": row["fs004_requirement"],
            }
            for row in required
        ],
        "non_goals": NON_GOALS,
        "must_remain_false": {
            "uses_sports_db": False,
            "uses_m2_weights": False,
            "uses_hand_picked_memory_lengths": False,
            "expected_ab_input_materialized": False,
        },
    }


def report_markdown(audit: dict[str, Any], surface_rows: list[dict[str, Any]], harness: dict[str, Any]) -> str:
    status_counts = Counter(row["current_status"] for row in surface_rows)
    family_counts = Counter(row["family"] for row in surface_rows)
    lines = [
        "# MLB-M3 Alpha-6 Feature-Family Redesign Audit",
        "",
        f"Run ID: `{audit['run_id']}`",
        "",
        "## Summary",
        "",
        f"- Source feature set: `{audit['source_feature_set_id']}`",
        f"- Source feature run: `{audit['source_feature_run_id']}`",
        f"- Rows: `{audit['row_count']}`",
        f"- Feature columns: `{audit['feature_column_count']}`",
        f"- Surfaces audited: `{len(surface_rows)}`",
        f"- Current status counts: `{dict(sorted(status_counts.items()))}`",
        "",
        "## Surface Counts By Family",
        "",
        "| Family | Surface Count |",
        "| --- | ---: |",
    ]
    for family, count in sorted(family_counts.items()):
        lines.append(f"| `{family}` | {count} |")
    lines.extend(
        [
            "",
            "## Priority Surface Gaps",
            "",
            "| Surface | Family | Priority | Current Status | Evidence Status | Matched Columns |",
            "| --- | --- | --- | --- | --- | ---: |",
        ]
    )
    for row in surface_rows:
        if row["priority"] == "P2":
            continue
        lines.append(
            f"| `{row['surface_id']}` | `{row['family']}` | `{row['priority']}` | `{row['current_status']}` | `{row['evidence_status']}` | {row['matched_column_count']} |"
        )
    lines.extend(
        [
            "",
            "## Harness Pressure",
            "",
            "The current FS-003 candidate remains diagnostic and unpromoted.",
            "",
            "| Fold | Lane | Baseline MAE | Candidate MAE | Delta | Features |",
            "| --- | --- | ---: | ---: | ---: | ---: |",
        ]
    )
    for row in harness.get("walk_forward", []):
        lines.append(
            f"| `{row['fold_id']}` | `{row['lane']}` | {row['baseline_mae']:.4f} | {row['candidate_mae']:.4f} | {row['candidate_delta_mae']:+.4f} | {row['candidate_feature_count']} |"
        )
    lines.extend(
        [
            "",
            "## Decision",
            "",
            "Proceed toward `m3_fs_004_state_path_redesign_v0` as a redesigned feature artifact. Do not tune or promote a model on FS-003 as the next move.",
            "",
        ]
    )
    return "\n".join(lines)


def run_audit(manifest_path: Path, harness_dir: Path, output_subdir: str) -> dict[str, Any]:
    manifest_path = resolve_path(manifest_path)
    harness_dir = resolve_path(harness_dir)
    validation = validate_manifest(manifest_path)
    if not validation["ok"]:
        raise RuntimeError("Manifest validation failed: " + json.dumps(validation))
    manifest = load_json(manifest_path)
    run_dir = manifest_path.parent
    audit_dir = run_dir / output_subdir
    audit_dir.mkdir(parents=True, exist_ok=True)

    matrix_uri = manifest["feature_artifact"]["matrix_uri"]
    df = load_matrix(matrix_uri)
    dictionary_path = dictionary_path_from_manifest(manifest)
    dictionary = load_json(dictionary_path)
    feature_columns = [
        column
        for column, detail in dictionary.items()
        if detail.get("role") == "feature"
    ]
    inventory = family_inventory(dictionary, df)
    surface_rows = build_surface_gap_matrix(dictionary)
    harness_summary = summarize_harness(harness_dir)
    spec = candidate_fs004_spec(surface_rows)
    status_counts = dict(sorted(Counter(row["current_status"] for row in surface_rows).items()))

    audit = {
        "run_id": f"{manifest['run_id']}_alpha6_family_redesign_audit",
        "status": "family_redesign_audit_created",
        "created_at": utc_now(),
        "tool_version": VERSION,
        "source_manifest_uri": str(manifest_path),
        "source_harness_dir": str(harness_dir),
        "source_feature_set_id": manifest["feature_artifact"].get("feature_set_id"),
        "source_feature_run_id": manifest["feature_artifact"].get("feature_run_id"),
        "matrix_uri": matrix_uri,
        "row_count": int(len(df)),
        "feature_column_count": len(feature_columns),
        "surface_count": len(surface_rows),
        "surface_status_counts": status_counts,
        "non_goals": NON_GOALS,
        "next_recommended_artifact": spec["feature_set_id"],
        "decision": "feature_family_redesign_required_before_model_tuning",
    }

    write_json(audit_dir / "family_redesign_audit.json", audit)
    write_json(audit_dir / "surface_gap_matrix.json", {"surfaces": surface_rows})
    write_json(audit_dir / "family_column_inventory.json", inventory)
    write_json(audit_dir / "harness_pressure_summary.json", harness_summary)
    write_json(audit_dir / "candidate_fs004_spec.json", spec)
    (audit_dir / "report.md").write_text(
        report_markdown(audit, surface_rows, harness_summary),
        encoding="utf-8",
    )
    artifacts = {
        "status": "family_redesign_audit_created",
        "artifacts": [
            artifact_entry("family_redesign_audit", audit_dir / "family_redesign_audit.json"),
            artifact_entry("surface_gap_matrix", audit_dir / "surface_gap_matrix.json"),
            artifact_entry("family_column_inventory", audit_dir / "family_column_inventory.json"),
            artifact_entry("harness_pressure_summary", audit_dir / "harness_pressure_summary.json"),
            artifact_entry("candidate_fs004_spec", audit_dir / "candidate_fs004_spec.json"),
            artifact_entry("report", audit_dir / "report.md"),
        ],
    }
    write_json(audit_dir / "artifacts.json", artifacts)

    summary = {
        "ok": True,
        "audit_dir": str(audit_dir),
        "surface_count": len(surface_rows),
        "surface_status_counts": status_counts,
        "candidate_feature_set_id": spec["feature_set_id"],
    }
    print(json.dumps(summary, indent=2, sort_keys=True))
    return summary


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Audit MLB-M3 feature-family redesign gaps for Alpha-6."
    )
    parser.add_argument("--manifest", type=Path, default=DEFAULT_MANIFEST)
    parser.add_argument("--harness-dir", type=Path, default=DEFAULT_HARNESS_DIR)
    parser.add_argument("--output-subdir", default=DEFAULT_OUTPUT_SUBDIR)
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    try:
        run_audit(args.manifest, args.harness_dir, args.output_subdir)
    except Exception as exc:
        print(json.dumps({"ok": False, "error": str(exc)}, indent=2), file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
