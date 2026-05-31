#!/usr/bin/env python3

from __future__ import annotations

import argparse
import json
import subprocess
import sys
import tempfile
from pathlib import Path


ROOT = Path(__file__).resolve().parents[4]
RUNNER = ROOT / "models" / "mlb" / "cartridges" / "MLB-RP36" / "runner.py"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Verify MLB-RP36 output against an existing reliever-shadow artifact.")
    parser.add_argument("--date", required=True, help="Slate date, YYYY-MM-DD.")
    parser.add_argument(
        "--expected",
        default=None,
        help="Expected JSON artifact. Defaults to data-private/predictions/mlb-reliever-shadow/<date>-reliever-shadow.json.",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    expected_path = (
        Path(args.expected)
        if args.expected
        else ROOT / "data-private" / "predictions" / "mlb-reliever-shadow" / f"{args.date}-reliever-shadow.json"
    )
    if not expected_path.is_absolute():
        expected_path = ROOT / expected_path
    if not expected_path.exists():
        raise FileNotFoundError(f"Expected MLB-RP36 artifact missing: {expected_path}")

    with tempfile.TemporaryDirectory() as tmp:
        tmpdir = Path(tmp)
        actual_path = tmpdir / "rp36.json"
        module_path = tmpdir / "rp36.js"
        report_path = tmpdir / "rp36.md"
        completed = subprocess.run(
            [
                sys.executable,
                str(RUNNER),
                "--date",
                args.date,
                "--out",
                str(actual_path),
                "--module-out",
                str(module_path),
                "--report-out",
                str(report_path),
            ],
            cwd=ROOT,
        )
        if completed.returncode:
            return int(completed.returncode)

        actual = json.loads(actual_path.read_text(encoding="utf-8"))
        expected = json.loads(expected_path.read_text(encoding="utf-8"))
        summary = {
            "date": args.date,
            "match": actual == expected,
            "actualTeams": len(actual.get("relieverShadowByTeam", {})),
            "expectedTeams": len(expected.get("relieverShadowByTeam", {})),
            "actualCandidates": actual.get("meta", {}).get("candidateCount"),
            "expectedCandidates": expected.get("meta", {}).get("candidateCount"),
        }
        print(json.dumps(summary, indent=2))
        return 0 if actual == expected else 1


if __name__ == "__main__":
    raise SystemExit(main())
