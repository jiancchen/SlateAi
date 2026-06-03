#!/usr/bin/env python3
from __future__ import annotations

import argparse
import hashlib
import json
import sqlite3
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from pipeline.mlb.features.validators.validate_game_shape_starter_v1 import (
    load_contract,
    validate_contract,
)


ROOT = Path(__file__).resolve().parents[4]
DEFAULT_DB_PATH = ROOT / "data-private" / "warehouse" / "sports" / "mlb" / "sql-mlb.db"
DEFAULT_CONTRACT_PATH = (
    ROOT
    / "pipeline"
    / "mlb"
    / "features"
    / "contracts"
    / "m3_fs_004_state_path_redesign_v0.json"
)
DEFAULT_FEASIBILITY_PATH = (
    ROOT
    / "data-private"
    / "models"
    / "mlb-m3"
    / "runs"
    / "mlb_m3_alpha2_infra_fs003_20260603T162241Z"
    / "fs004_source_feasibility_alpha6"
    / "fs004_source_feasibility.json"
)
DEFAULT_OUTPUT_DIR = (
    ROOT
    / "data-private"
    / "models"
    / "mlb-m3"
    / "runs"
    / "mlb_m3_alpha2_infra_fs003_20260603T162241Z"
    / "fs004_builder_readiness_alpha6"
)
VERSION = "0.1.0"

REQUIRED_RELIEVER_ORDER_COLUMNS = ("entry_order", "first_inning", "first_half")
REQUIRED_SOURCE_DECISION_ID = "a6-reliever-entry-order-canonicalization-v1"


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


def table_columns(conn: sqlite3.Connection, table: str) -> set[str]:
    return {str(row["name"]) for row in conn.execute(f"pragma table_info({table})")}


def reliever_order_counts(db_path: Path) -> dict[str, Any]:
    with sqlite3.connect(db_path) as conn:
        conn.row_factory = sqlite3.Row
        columns = table_columns(conn, "pitcher_appearances")
        missing_columns = sorted(set(REQUIRED_RELIEVER_ORDER_COLUMNS) - columns)
        if missing_columns:
            return {
                "ok": False,
                "missing_columns": missing_columns,
                "row_count": None,
                "non_null_counts": {},
            }
        row = conn.execute(
            """
            select
              count(*) as row_count,
              count(entry_order) as entry_order,
              count(first_inning) as first_inning,
              count(first_half) as first_half
            from pitcher_appearances
            """
        ).fetchone()
    non_null_counts = {
        column: int(row[column])
        for column in REQUIRED_RELIEVER_ORDER_COLUMNS
    }
    return {
        "ok": all(count > 0 for count in non_null_counts.values()),
        "missing_columns": [],
        "row_count": int(row["row_count"]),
        "non_null_counts": non_null_counts,
    }


def validate_source_decisions(contract: dict[str, Any]) -> dict[str, Any]:
    decisions = contract.get("source_decisions", [])
    decision_ids = {
        item.get("decision_id")
        for item in decisions
        if isinstance(item, dict) and isinstance(item.get("decision_id"), str)
    }
    return {
        "ok": REQUIRED_SOURCE_DECISION_ID in decision_ids,
        "required_decision_id": REQUIRED_SOURCE_DECISION_ID,
        "declared_decision_ids": sorted(decision_ids),
    }


def validate_feasibility(feasibility: dict[str, Any]) -> dict[str, Any]:
    surface_summary = feasibility.get("surface_summary", {})
    table_summary = feasibility.get("table_summary", {})
    status_counts = surface_summary.get("status_counts", {})
    blocked = surface_summary.get("blocked_surfaces", [])
    source_decisions = surface_summary.get("source_decision_surfaces", [])
    missing_tables = table_summary.get("missing_or_empty_contract_source_tables", [])
    errors: list[str] = []
    if blocked:
        errors.append("Blocked surfaces remain: " + ", ".join(blocked))
    if source_decisions:
        errors.append("Source-decision surfaces remain: " + ", ".join(source_decisions))
    if status_counts.get("partial_source_contract_decision", 0):
        errors.append("Partial source-contract decisions remain.")
    if missing_tables:
        errors.append("Missing/empty contract source tables remain: " + ", ".join(missing_tables))
    return {
        "ok": not errors,
        "errors": errors,
        "surface_summary": surface_summary,
        "table_summary": table_summary,
    }


def report_markdown(readiness: dict[str, Any]) -> str:
    checks = readiness["checks"]
    lines = [
        "# MLB-M3 Alpha-6 FS-004 Builder Readiness",
        "",
        f"Run ID: `{readiness['run_id']}`",
        "",
        "## Summary",
        "",
        f"- Overall status: `{readiness['status']}`",
        f"- Contract validation: `{checks['contract']['ok']}`",
        f"- Source decisions: `{checks['source_decisions']['ok']}`",
        f"- Source feasibility: `{checks['source_feasibility']['ok']}`",
        f"- Reliever order data: `{checks['reliever_order_data']['ok']}`",
        "",
        "## Reliever Order Data",
        "",
        "| Field | Non-Null Rows |",
        "| --- | ---: |",
    ]
    for column, count in checks["reliever_order_data"].get("non_null_counts", {}).items():
        lines.append(f"| `{column}` | {count} |")
    lines.extend(
        [
            "",
            "## Decision",
            "",
            (
                "FS-004 builder preflight is clear. The next allowed step is matrix materialization, "
                "still with no picks, prices, simulator logs, promotions, or edge claims."
                if readiness["ok"]
                else "FS-004 builder preflight is not clear. Do not materialize FS-004 until errors are resolved."
            ),
            "",
        ]
    )
    return "\n".join(lines)


def run_readiness(
    db_path: Path,
    contract_path: Path,
    feasibility_path: Path,
    output_dir: Path,
) -> dict[str, Any]:
    db_path = resolve_path(db_path)
    contract_path = resolve_path(contract_path)
    feasibility_path = resolve_path(feasibility_path)
    output_dir = resolve_path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    contract = load_contract(contract_path)
    contract_result = validate_contract(contract)
    source_decision_result = validate_source_decisions(contract)
    feasibility_result = validate_feasibility(load_json(feasibility_path))
    reliever_order_result = reliever_order_counts(db_path)
    checks = {
        "contract": contract_result,
        "source_decisions": source_decision_result,
        "source_feasibility": feasibility_result,
        "reliever_order_data": reliever_order_result,
    }
    errors: list[str] = []
    for check_name, result in checks.items():
        if not result.get("ok"):
            errors.append(f"{check_name} failed")
            errors.extend(str(error) for error in result.get("errors", []))
    readiness = {
        "run_id": "mlb_m3_alpha6_fs004_builder_readiness",
        "status": "builder_readiness_clear" if not errors else "builder_readiness_blocked",
        "ok": not errors,
        "created_at": utc_now(),
        "tool_version": VERSION,
        "contract_uri": str(contract_path),
        "feasibility_uri": str(feasibility_path),
        "db_uri": str(db_path),
        "checks": checks,
        "errors": errors,
        "non_goals": [
            "no matrix materialization",
            "no model training",
            "no picks",
            "no market pricing",
            "no simulator event logs",
            "no promotion decision",
        ],
    }
    write_json(output_dir / "builder_readiness.json", readiness)
    (output_dir / "report.md").write_text(report_markdown(readiness), encoding="utf-8")
    artifacts = {
        "status": readiness["status"],
        "artifacts": [
            artifact_entry("builder_readiness", output_dir / "builder_readiness.json"),
            artifact_entry("report", output_dir / "report.md"),
        ],
    }
    write_json(output_dir / "artifacts.json", artifacts)
    print(
        json.dumps(
            {
                "ok": readiness["ok"],
                "status": readiness["status"],
                "output_dir": str(output_dir),
                "errors": errors,
            },
            indent=2,
            sort_keys=True,
        )
    )
    return readiness


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Validate MLB-M3 FS-004 builder readiness."
    )
    parser.add_argument("--db", type=Path, default=DEFAULT_DB_PATH)
    parser.add_argument("--contract", type=Path, default=DEFAULT_CONTRACT_PATH)
    parser.add_argument("--feasibility", type=Path, default=DEFAULT_FEASIBILITY_PATH)
    parser.add_argument("--output-dir", type=Path, default=DEFAULT_OUTPUT_DIR)
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    try:
        readiness = run_readiness(
            args.db,
            args.contract,
            args.feasibility,
            args.output_dir,
        )
    except Exception as exc:
        print(json.dumps({"ok": False, "error": str(exc)}, indent=2), file=sys.stderr)
        sys.exit(1)
    if not readiness["ok"]:
        sys.exit(1)


if __name__ == "__main__":
    main()
