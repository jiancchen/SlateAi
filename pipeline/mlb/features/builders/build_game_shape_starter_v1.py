#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import sqlite3
import subprocess
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from pipeline.mlb.features.validators.validate_game_shape_starter_v1 import (
    DEFAULT_CONTRACT_PATH,
    load_contract,
    validate_contract,
)


ROOT = Path(__file__).resolve().parents[4]
DEFAULT_DB_PATH = ROOT / "data-private" / "warehouse" / "sports" / "mlb" / "sql-mlb.db"
DEFAULT_OUTPUT_DIR = (
    ROOT
    / "data-private"
    / "models"
    / "mlb-m3"
    / "features"
    / "m3_fs_001_game_shape_starter_v1"
)
DEFAULT_REPORT_PATH = (
    ROOT
    / "data-migration"
    / "reports"
    / "m3_fs_001_game_shape_starter_v1_skeleton.json"
)
VERSION = "0.1.0"


def _iso_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def _git_sha() -> str | None:
    try:
        result = subprocess.run(
            ["git", "rev-parse", "HEAD"],
            cwd=ROOT,
            check=True,
            text=True,
            capture_output=True,
        )
    except (OSError, subprocess.CalledProcessError):
        return None
    return result.stdout.strip()


def _count_db_tables(db_path: Path) -> int | None:
    if not db_path.exists():
        return None
    with sqlite3.connect(db_path) as conn:
        row = conn.execute(
            "select count(*) from sqlite_master where type = 'table'"
        ).fetchone()
    return int(row[0])


def build_skeleton_report(args: argparse.Namespace) -> dict[str, Any]:
    started_at = _iso_now()
    contract_path = args.contract.resolve()
    db_path = args.db.resolve()
    output_dir = args.output_dir.resolve()
    report_path = args.report.resolve()

    contract = load_contract(contract_path)
    contract_validation = validate_contract(contract)
    db_table_count = _count_db_tables(db_path)
    output_dir.mkdir(parents=True, exist_ok=True)
    report_path.parent.mkdir(parents=True, exist_ok=True)

    warnings = list(contract_validation["warnings"])
    if args.as_of_policy != contract.get("as_of_policy"):
        warnings.append(
            "CLI as_of_policy differs from contract: "
            f"{args.as_of_policy} != {contract.get('as_of_policy')}"
        )

    errors = list(contract_validation["errors"])
    if db_table_count is None:
        errors.append(f"Source DB does not exist: {db_path}")

    ok = not errors
    finished_at = _iso_now()
    report: dict[str, Any] = {
        "run_id": f"{contract.get('feature_set_id', 'unknown')}_skeleton_{started_at}",
        "run_type": "feature_build_skeleton",
        "builder_version": VERSION,
        "feature_set_id": contract.get("feature_set_id"),
        "feature_set_version": contract.get("version"),
        "status": "skeleton_ok" if ok else "skeleton_failed",
        "ok": ok,
        "started_at": started_at,
        "finished_at": finished_at,
        "git_sha": _git_sha(),
        "start_date": args.start_date,
        "end_date": args.end_date,
        "as_of_policy": args.as_of_policy,
        "contract_uri": str(contract_path),
        "contract_loaded": True,
        "contract_validation": contract_validation,
        "source_db": str(db_path),
        "source_db_exists": db_table_count is not None,
        "source_db_table_count": db_table_count,
        "output_uri": str(output_dir),
        "report_uri": str(report_path),
        "matrix_uri": None,
        "matrix_written": False,
        "feature_count": 0,
        "target_count": len(contract.get("targets", [])),
        "source_tables": contract.get("source_tables", []),
        "evidence_policy_id": contract.get("evidence_policy", {}).get(
            "evidence_policy_id"
        ),
        "state_memory_encoders": contract.get("evidence_policy", {}).get(
            "state_memory_encoders", []
        ),
        "uses_hand_picked_memory_lengths": False,
        "uses_m2_weights": False,
        "uses_sports_db": False,
        "evidence_coverage": {},
        "matchup_coverage": {},
        "attribution_coverage": {},
        "missingness": {},
        "leakage_checks": {
            "no_feature_extraction_in_skeleton": True,
            "targets_not_joined_to_features": True,
            "as_of_policy_declared": bool(args.as_of_policy),
        },
        "lineage": {
            "feature_builder": "pipeline.mlb.features.builders.build_game_shape_starter_v1",
            "validator": "pipeline.mlb.features.validators.validate_game_shape_starter_v1",
        },
        "warnings": warnings,
        "errors": errors,
    }
    return report


def write_report(report: dict[str, Any], path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as handle:
        json.dump(report, handle, indent=2, sort_keys=True)
        handle.write("\n")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Build the MLB-M3 alpha game-shape starter feature set. "
            "Step 1 skeleton validates contract/run shape only."
        )
    )
    parser.add_argument("--start-date", required=True, help="Inclusive start date.")
    parser.add_argument("--end-date", required=True, help="Inclusive end date.")
    parser.add_argument(
        "--as-of-policy",
        default="pregame",
        choices=["pregame"],
        help="As-of policy for feature materialization.",
    )
    parser.add_argument(
        "--db",
        type=Path,
        default=DEFAULT_DB_PATH,
        help="Typed MLB SQLite DB path.",
    )
    parser.add_argument(
        "--contract",
        type=Path,
        default=DEFAULT_CONTRACT_PATH,
        help="Feature-set contract JSON path.",
    )
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=DEFAULT_OUTPUT_DIR,
        help="Planned feature output directory.",
    )
    parser.add_argument(
        "--report",
        type=Path,
        default=DEFAULT_REPORT_PATH,
        help="JSON report path.",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    report = build_skeleton_report(args)
    write_report(report, args.report)
    print(json.dumps(report, indent=2, sort_keys=True))
    return 0 if report["ok"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
