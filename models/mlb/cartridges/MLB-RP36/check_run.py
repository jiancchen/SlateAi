#!/usr/bin/env python3

from __future__ import annotations

import argparse
import json
import subprocess
import sys
from pathlib import Path
from typing import Any

from snapshot_run import ROOT, RUN_ROOT, build_snapshot


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Check an MLB-RP36 reliever addendum run snapshot.")
    parser.add_argument("--date", required=True, help="Slate date, YYYY-MM-DD.")
    return parser.parse_args()


def read_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


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

    verify_snapshot(date)

    print(json.dumps({
        "runId": run["runId"],
        "status": "checked",
        "sourceFiles": run.get("sourceFiles"),
        "inputs": run.get("inputs"),
        "outputs": run.get("outputs"),
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
