#!/usr/bin/env python3

from __future__ import annotations

import argparse
import hashlib
import json
import subprocess
import sys
from pathlib import Path
from typing import Any

from run_lock import ROOT, RUN_ROOT, aggregate_hash, build_snapshot, file_hash, input_inventory, stable_json


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Verify an MLB-RP36 reliever addendum run lock.")
    parser.add_argument("--date", required=True, help="Slate date, YYYY-MM-DD.")
    return parser.parse_args()


def read_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def sha256_text(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def first_diff(left: Any, right: Any, prefix: str = "$") -> str | None:
    if left == right:
        return None
    if type(left) is not type(right):
        return f"{prefix}: type {type(left).__name__} != {type(right).__name__}"
    if not isinstance(left, (dict, list)):
        return f"{prefix}: {left!r} != {right!r}"
    if isinstance(left, list):
        if len(left) != len(right):
            return f"{prefix}: length {len(left)} != {len(right)}"
        for index, (left_item, right_item) in enumerate(zip(left, right)):
            nested = first_diff(left_item, right_item, f"{prefix}[{index}]")
            if nested:
                return nested
        return None
    keys = sorted(set(left) | set(right))
    for key in keys:
        if key not in left:
            return f"{prefix}.{key}: missing on actual"
        if key not in right:
            return f"{prefix}.{key}: missing on expected"
        nested = first_diff(left[key], right[key], f"{prefix}.{key}")
        if nested:
            return nested
    return None


def assert_file_lock(lock_path: Path, rows_key: str, expected_hash: str, label: str, exclude_roles: set[str] | None = None) -> int:
    exclude_roles = exclude_roles or set()
    lock = read_json(lock_path)
    actual_rows = [{**entry, **file_hash(entry["path"])} for entry in lock.get(rows_key, [])]
    for expected, actual in zip(lock.get(rows_key, []), actual_rows):
        if bool(expected.get("exists")) != bool(actual.get("exists")) or expected.get("sha256") != actual.get("sha256"):
            raise RuntimeError(f"{label} drift: {actual.get('path')}")
    hash_rows = [row for row in actual_rows if row.get("role") not in exclude_roles]
    actual_hash = aggregate_hash(hash_rows)
    if actual_hash != expected_hash:
        raise RuntimeError(f"{label} hash mismatch: expected {expected_hash}, got {actual_hash}")
    return len(actual_rows)


def assert_input_lock(lock_path: Path, expected_hash: str, date: str) -> int:
    lock = read_json(lock_path)
    actual_rows = input_inventory(date)
    diff = first_diff(actual_rows, lock.get("inputs", []))
    if diff:
        raise RuntimeError(f"Input lock drift: {diff}")
    actual_hash = sha256_text(stable_json(actual_rows))
    if actual_hash != expected_hash:
        raise RuntimeError(f"Input hash mismatch: expected {expected_hash}, got {actual_hash}")
    return len(actual_rows)


def verify_snapshot(date: str) -> None:
    completed = subprocess.run(
        [sys.executable, str(ROOT / "models" / "mlb" / "cartridges" / "MLB-RP36" / "verify_snapshot.py"), "--date", date],
        cwd=ROOT,
        text=True,
        capture_output=True,
        check=False,
    )
    if completed.returncode:
        raise RuntimeError((completed.stdout + completed.stderr).strip())


def main() -> int:
    args = parse_args()
    date = args.date
    run_dir = RUN_ROOT / date
    run = read_json(run_dir / "run.json")
    snapshot = read_json(run_dir / "snapshot.json")
    actual_snapshot = build_snapshot(date)
    diff = first_diff(actual_snapshot, snapshot)
    if diff:
        raise RuntimeError(f"MLB-RP36 snapshot mismatch: {diff}")

    source_files = assert_file_lock(run_dir / "files.lock.json", "files", run["sourceHash"], "Source lock")
    inputs = assert_input_lock(run_dir / "inputs.lock.json", run["inputHash"], date)
    outputs = assert_file_lock(
        run_dir / "outputs.lock.json",
        "outputs",
        run["outputHash"],
        "Output lock",
        exclude_roles={"run-manifest"},
    )
    verify_snapshot(date)

    print(json.dumps({
        "runId": run["runId"],
        "status": "verified",
        "sourceFiles": source_files,
        "inputs": inputs,
        "outputs": outputs,
        "artifactHash": run["artifactHash"],
        "artifactSummary": run["artifactSummary"],
    }, indent=2))
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as error:
        print(error, file=sys.stderr)
        raise SystemExit(1)
