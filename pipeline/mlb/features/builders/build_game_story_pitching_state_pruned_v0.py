#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
from collections import Counter
from pathlib import Path
from typing import Any

from pipeline.mlb.features.builders.build_game_shape_starter_v1 import (
    _git_sha,
    _iso_now,
    _run_stamp,
    _write_json,
)


ROOT = Path(__file__).resolve().parents[4]
DEFAULT_SOURCE_REPORT = (
    ROOT
    / "data-migration"
    / "reports"
    / "m3_fs_002_game_story_pitching_state_v0_2026-03-26_to_2026-05-31.json"
)
DEFAULT_SELECTED_COLUMNS = (
    ROOT
    / "data-private"
    / "models"
    / "mlb-m3"
    / "runs"
    / "mlb_m3_alpha2_infra_fs002_20260603T155600Z"
    / "feature_audit"
    / "fs003_selected_columns.json"
)
DEFAULT_CONTRACT_PATH = (
    ROOT
    / "pipeline"
    / "mlb"
    / "features"
    / "contracts"
    / "m3_fs_003_game_story_pitching_state_pruned_v0.json"
)
DEFAULT_OUTPUT_DIR = (
    ROOT
    / "data-private"
    / "models"
    / "mlb-m3"
    / "features"
    / "m3_fs_003_game_story_pitching_state_pruned_v0"
)
DEFAULT_REPORT_PATH = (
    ROOT
    / "data-migration"
    / "reports"
    / "m3_fs_003_game_story_pitching_state_pruned_v0_2026-03-26_to_2026-05-31.json"
)
VERSION = "0.1.0"


def load_json(path: Path) -> dict[str, Any]:
    with path.open("r", encoding="utf-8") as handle:
        payload = json.load(handle)
    if not isinstance(payload, dict):
        raise ValueError(f"Expected JSON object: {path}")
    return payload


def _sql_literal(value: Path | str) -> str:
    return "'" + str(value).replace("'", "''") + "'"


def _quote_identifier(value: str) -> str:
    return '"' + value.replace('"', '""') + '"'


def infer_feature_family(column: str, role: str | None = None) -> str:
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


def role_counts(dictionary: dict[str, Any], columns: list[str]) -> dict[str, int]:
    return dict(
        sorted(
            Counter(
                str(dictionary[column].get("role", "unknown"))
                for column in columns
            ).items()
        )
    )


def family_counts(dictionary: dict[str, Any], columns: list[str]) -> dict[str, int]:
    counts: Counter[str] = Counter()
    for column in columns:
        role = dictionary[column].get("role")
        counts[infer_feature_family(column, role)] += 1
    return dict(sorted(counts.items()))


def selected_columns_from_payload(payload: dict[str, Any]) -> list[str]:
    columns = payload.get("columns")
    if not isinstance(columns, list) or not columns:
        raise ValueError("Selected columns payload must contain a non-empty `columns` list.")
    if not all(isinstance(column, str) and column for column in columns):
        raise ValueError("Selected columns must all be non-empty strings.")
    duplicates = sorted(column for column, count in Counter(columns).items() if count > 1)
    if duplicates:
        raise ValueError("Selected columns contain duplicates: " + ", ".join(duplicates[:20]))
    return columns


def validate_contract(contract: dict[str, Any]) -> dict[str, Any]:
    errors: list[str] = []
    warnings: list[str] = []
    required = {
        "feature_set_id",
        "version",
        "source_feature_set_id",
        "source_db",
        "source_tables",
        "targets",
        "pruning_policy",
    }
    missing = sorted(required - set(contract))
    if missing:
        errors.append("Missing contract keys: " + ", ".join(missing))
    if contract.get("feature_set_id") != "m3_fs_003_game_story_pitching_state_pruned_v0":
        errors.append("Contract feature_set_id must be m3_fs_003_game_story_pitching_state_pruned_v0.")
    if contract.get("source_feature_set_id") != "m3_fs_002_game_story_pitching_state_v0":
        errors.append("FS-003 must declare FS-002 as source_feature_set_id.")
    if contract.get("source_db") != "data-private/warehouse/sports/mlb/sql-mlb.db":
        errors.append("FS-003 must retain typed sql-mlb.db source lineage.")
    text = json.dumps(contract).lower()
    for term in ["sports.db reads", "m2 generated artifacts", "hand-coded betting scores"]:
        if term not in text:
            warnings.append(f"Contract does not explicitly forbid `{term}`.")
    return {"ok": not errors, "errors": errors, "warnings": warnings}


def materialize_pruned_matrix(
    source_matrix: Path,
    output_matrix: Path,
    columns: list[str],
) -> str:
    try:
        import duckdb  # type: ignore
    except ImportError as exc:
        raise RuntimeError(
            "Parquet pruning requires DuckDB. Run with the workspace Python runtime."
        ) from exc

    output_matrix.parent.mkdir(parents=True, exist_ok=True)
    select_clause = ", ".join(_quote_identifier(column) for column in columns)
    conn = duckdb.connect(database=":memory:")
    try:
        source_columns = [
            item[0]
            for item in conn.execute(
                f"describe select * from read_parquet({_sql_literal(source_matrix)})"
            ).fetchall()
        ]
        missing = [column for column in columns if column not in source_columns]
        if missing:
            raise ValueError("Selected columns missing from source matrix: " + ", ".join(missing[:20]))
        conn.execute(
            "copy "
            f"(select {select_clause} from read_parquet({_sql_literal(source_matrix)})) "
            f"to {_sql_literal(output_matrix)} (format parquet)"
        )
    finally:
        conn.close()
    return "duckdb_copy_select"


def read_pruned_matrix(output_matrix: Path, columns: list[str]):
    try:
        import duckdb  # type: ignore
    except ImportError as exc:
        raise RuntimeError(
            "Parquet inspection requires DuckDB. Run with the workspace Python runtime."
        ) from exc

    select_clause = ", ".join(_quote_identifier(column) for column in columns)
    conn = duckdb.connect(database=":memory:")
    try:
        return conn.execute(
            f"select {select_clause} from read_parquet({_sql_literal(output_matrix)})"
        ).fetchdf()
    finally:
        conn.close()


def missingness_report(df, columns: list[str]) -> dict[str, Any]:
    total = int(len(df))
    payload: dict[str, Any] = {}
    for column in columns:
        series = df[column]
        missing_mask = series.isna()
        try:
            missing_mask = missing_mask | series.eq("")
        except TypeError:
            pass
        missing_count = int(missing_mask.sum())
        non_null_count = total - missing_count
        unique_count = int(series[~missing_mask].nunique(dropna=True))
        payload[column] = {
            "missing_count": missing_count,
            "missing_rate": (missing_count / total) if total else None,
            "non_null_count": non_null_count,
            "unique_count": unique_count,
        }
    return payload


def leakage_report(dictionary: dict[str, Any], columns: list[str]) -> dict[str, Any]:
    feature_columns = [
        column
        for column in columns
        if dictionary[column].get("role") == "feature"
    ]
    target_columns = [
        column
        for column in columns
        if column.startswith("target_") or dictionary[column].get("role") == "target"
    ]
    bad_feature_targets = [
        column for column in feature_columns if column.startswith("target_")
    ]
    fixed_window_truth_terms = [
        column
        for column in feature_columns
        if "last5" in column.lower() or "last10" in column.lower()
    ]
    expected_ab_terms = [
        column for column in feature_columns if "expected_ab" in column.lower()
    ]
    identifier_feature_terms = [
        column
        for column in feature_columns
        if column.endswith("_id") or column.endswith("_ids") or "pitcher_id" in column
    ]
    return {
        "ok": not (
            bad_feature_targets
            or fixed_window_truth_terms
            or expected_ab_terms
            or identifier_feature_terms
        ),
        "target_columns": target_columns,
        "feature_columns": feature_columns,
        "feature_count": len(feature_columns),
        "target_count": len(target_columns),
        "bad_feature_targets": bad_feature_targets,
        "fixed_window_truth_terms": fixed_window_truth_terms,
        "expected_ab_terms": expected_ab_terms,
        "identifier_feature_terms": identifier_feature_terms,
        "notes": [
            "FS-003 is derived from the FS-002 feature audit selected-column list.",
            "Targets remain isolated under target_ columns.",
            "No fixed last5/last10 form-truth feature names are present.",
            "No expected AB input is materialized.",
            "Identifier-like feature columns are excluded; team ids remain metadata.",
        ],
    }


def target_distribution(df, columns: list[str]) -> dict[str, dict[str, int]]:
    payload: dict[str, dict[str, int]] = {}
    for column in columns:
        if not column.startswith("target_"):
            continue
        counts: dict[str, int] = {}
        for value in df[column].tolist():
            key = "null" if value is None else str(value)
            counts[key] = counts.get(key, 0) + 1
        payload[column] = dict(sorted(counts.items(), key=lambda item: item[0]))
    return payload


def coverage_report(
    dictionary: dict[str, Any],
    columns: list[str],
    missingness: dict[str, Any],
    source_report: dict[str, Any],
    selected_payload: dict[str, Any],
) -> dict[str, Any]:
    families = family_counts(dictionary, columns)
    roles = role_counts(dictionary, columns)
    total = len(columns)
    selected_feature_count = roles.get("feature", 0)
    source_feature_count = int(source_report.get("feature_count") or 0)
    return {
        "row_count": source_report.get("row_count"),
        "column_count": total,
        "role_counts": roles,
        "family_counts": families,
        "source_feature_set_id": source_report.get("feature_set_id"),
        "source_feature_run_id": source_report.get("run_id"),
        "source_column_count": source_report.get("column_count"),
        "source_feature_count": source_feature_count,
        "selected_column_count": total,
        "selected_feature_count": selected_feature_count,
        "pruned_feature_count": source_feature_count - selected_feature_count,
        "selection_payload_column_count": len(selected_payload.get("columns", [])),
        "high_missing_selected_columns": [
            column
            for column, detail in missingness.items()
            if dictionary[column].get("role") == "feature"
            and detail.get("missing_rate") is not None
            and detail["missing_rate"] >= 0.75
        ],
    }


def build_feature_artifacts(args: argparse.Namespace) -> dict[str, Any]:
    started_at = _iso_now()
    source_report_path = args.source_report.resolve()
    selected_columns_path = args.selected_columns.resolve()
    contract_path = args.contract.resolve()
    output_root = args.output_dir.resolve()
    report_path = args.report.resolve()

    contract = load_json(contract_path)
    contract_validation = validate_contract(contract)
    warnings = list(contract_validation["warnings"])
    errors = list(contract_validation["errors"])

    if not source_report_path.exists():
        errors.append(f"Source report does not exist: {source_report_path}")
        source_report: dict[str, Any] = {}
    else:
        source_report = load_json(source_report_path)
    if not selected_columns_path.exists():
        errors.append(f"Selected columns file does not exist: {selected_columns_path}")
        selected_payload: dict[str, Any] = {}
        selected_columns: list[str] = []
    else:
        selected_payload = load_json(selected_columns_path)
        selected_columns = selected_columns_from_payload(selected_payload)

    source_matrix = Path(str(source_report.get("matrix_uri", "")))
    source_dictionary = Path(str(source_report.get("data_dictionary_uri", "")))
    if not source_matrix.exists():
        errors.append(f"Source matrix does not exist: {source_matrix}")
    if not source_dictionary.exists():
        errors.append(f"Source data dictionary does not exist: {source_dictionary}")
        dictionary: dict[str, Any] = {}
    else:
        source_dictionary_payload = load_json(source_dictionary)
        missing_dictionary_columns = [
            column for column in selected_columns if column not in source_dictionary_payload
        ]
        if missing_dictionary_columns:
            errors.append(
                "Selected columns missing from source dictionary: "
                + ", ".join(missing_dictionary_columns[:20])
            )
        dictionary = {
            column: {
                **source_dictionary_payload[column],
                "derived_from_feature_set_id": source_report.get("feature_set_id"),
                "derived_from_feature_run_id": source_report.get("run_id"),
                "fs003_selection_policy": "alpha5_feature_audit_selected_columns",
            }
            for column in selected_columns
            if column in source_dictionary_payload
        }

    source_flags = {
        "uses_sports_db": source_report.get("uses_sports_db"),
        "uses_m2_weights": source_report.get("uses_m2_weights"),
        "uses_hand_picked_memory_lengths": source_report.get(
            "uses_hand_picked_memory_lengths"
        ),
        "expected_ab_input_materialized": source_report.get(
            "expected_ab_input_materialized"
        ),
    }
    for flag, value in source_flags.items():
        if value is not False:
            errors.append(f"Source report forbidden flag must be false: {flag}={value}")

    run_id = f"{contract['feature_set_id']}_{_run_stamp()}"
    artifact_dir = output_root / run_id
    artifact_dir.mkdir(parents=True, exist_ok=True)
    matrix_uri = artifact_dir / "matrix.parquet"
    matrix_writer: str | None = None
    df = None
    if not errors:
        matrix_writer = materialize_pruned_matrix(source_matrix, matrix_uri, selected_columns)
        df = read_pruned_matrix(matrix_uri, selected_columns)

    if df is not None:
        missingness = missingness_report(df, selected_columns)
        leakage = leakage_report(dictionary, selected_columns)
        coverage = coverage_report(
            dictionary,
            selected_columns,
            missingness,
            source_report,
            selected_payload,
        )
        targets = target_distribution(df, selected_columns)
        row_count = int(len(df))
    else:
        missingness = {}
        leakage = {
            "ok": False,
            "feature_columns": [],
            "target_columns": [],
            "feature_count": 0,
            "target_count": 0,
        }
        coverage = {}
        targets = {}
        row_count = 0

    lineage = {
        "feature_builder": "pipeline.mlb.features.builders.build_game_story_pitching_state_pruned_v0",
        "builder_version": VERSION,
        "contract_uri": str(contract_path),
        "source_feature_report_uri": str(source_report_path),
        "source_feature_set_id": source_report.get("feature_set_id"),
        "source_feature_set_version": source_report.get("feature_set_version"),
        "source_feature_run_id": source_report.get("run_id"),
        "source_matrix_uri": str(source_matrix),
        "source_data_dictionary_uri": str(source_dictionary),
        "selected_columns_uri": str(selected_columns_path),
        "git_sha": _git_sha(),
        "start_date": source_report.get("start_date"),
        "end_date": source_report.get("end_date"),
        "as_of_policy": source_report.get("as_of_policy"),
        "uses_sports_db": False,
        "uses_m2_weights": False,
        "uses_hand_picked_memory_lengths": False,
        "expected_ab_input_materialized": False,
        "derivation": "audit_pruned_feature_artifact",
        "pitching_path_grain": "one opponent pitching path per batting side: starter phase then reliever-chain phase",
    }

    _write_json(artifact_dir / "data_dictionary.json", dictionary)
    _write_json(artifact_dir / "missingness.json", missingness)
    _write_json(artifact_dir / "coverage.json", coverage)
    _write_json(artifact_dir / "leakage.json", leakage)
    _write_json(artifact_dir / "lineage.json", lineage)

    ok = (
        not errors
        and bool(selected_columns)
        and matrix_uri.exists()
        and bool(leakage.get("ok"))
        and row_count == int(source_report.get("row_count") or row_count)
    )
    finished_at = _iso_now()
    report = {
        "run_id": run_id,
        "run_type": "feature_prune",
        "builder_version": VERSION,
        "feature_set_id": contract["feature_set_id"],
        "feature_set_version": contract["version"],
        "status": "ok" if ok else "failed",
        "ok": ok,
        "started_at": started_at,
        "finished_at": finished_at,
        "git_sha": _git_sha(),
        "start_date": source_report.get("start_date"),
        "end_date": source_report.get("end_date"),
        "as_of_policy": source_report.get("as_of_policy"),
        "contract_uri": str(contract_path),
        "contract_validation": contract_validation,
        "source_db": source_report.get("source_db"),
        "source_feature_report_uri": str(source_report_path),
        "source_feature_set_id": source_report.get("feature_set_id"),
        "source_feature_set_version": source_report.get("feature_set_version"),
        "source_feature_run_id": source_report.get("run_id"),
        "selected_columns_uri": str(selected_columns_path),
        "artifact_dir": str(artifact_dir),
        "output_uri": str(output_root),
        "report_uri": str(report_path),
        "matrix_uri": str(matrix_uri) if matrix_uri.exists() else None,
        "matrix_written": matrix_uri.exists(),
        "matrix_writer": matrix_writer,
        "row_count": row_count,
        "column_count": len(selected_columns),
        "feature_count": int(leakage.get("feature_count") or 0),
        "target_count": int(leakage.get("target_count") or 0),
        "target_distribution": targets,
        "source_table_coverage": source_report.get("source_table_coverage"),
        "evidence_coverage": coverage,
        "data_dictionary_uri": str(artifact_dir / "data_dictionary.json"),
        "missingness_uri": str(artifact_dir / "missingness.json"),
        "coverage_uri": str(artifact_dir / "coverage.json"),
        "leakage_uri": str(artifact_dir / "leakage.json"),
        "lineage_uri": str(artifact_dir / "lineage.json"),
        "lineage": lineage,
        "leakage_checks": leakage,
        "uses_sports_db": False,
        "uses_m2_weights": False,
        "uses_hand_picked_memory_lengths": False,
        "expected_ab_input_materialized": False,
        "warnings": warnings,
        "errors": errors,
    }
    _write_json(artifact_dir / "build_report.json", report)
    _write_json(report_path, report)
    print(
        json.dumps(
            {
                "ok": ok,
                "run_id": run_id,
                "row_count": row_count,
                "column_count": len(selected_columns),
                "feature_count": report["feature_count"],
                "target_count": report["target_count"],
                "artifact_dir": str(artifact_dir),
                "report_uri": str(report_path),
                "warnings": warnings,
                "errors": errors,
            },
            indent=2,
            sort_keys=True,
        )
    )
    return report


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Build MLB-M3 FS-003 by pruning FS-002 with alpha-5 audit selections."
    )
    parser.add_argument("--source-report", type=Path, default=DEFAULT_SOURCE_REPORT)
    parser.add_argument("--selected-columns", type=Path, default=DEFAULT_SELECTED_COLUMNS)
    parser.add_argument("--contract", type=Path, default=DEFAULT_CONTRACT_PATH)
    parser.add_argument("--output-dir", type=Path, default=DEFAULT_OUTPUT_DIR)
    parser.add_argument("--report", type=Path, default=DEFAULT_REPORT_PATH)
    return parser.parse_args()


def main() -> None:
    build_feature_artifacts(parse_args())


if __name__ == "__main__":
    main()
