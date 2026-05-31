#!/usr/bin/env python3

from __future__ import annotations

import subprocess
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[4]
LEGACY_EXPORTER = ROOT / "pipeline" / "export_mlb_reliever_shadow_board.py"


def main() -> int:
    command = [sys.executable, str(LEGACY_EXPORTER), *sys.argv[1:]]
    completed = subprocess.run(command, cwd=ROOT)
    return int(completed.returncode or 0)


if __name__ == "__main__":
    raise SystemExit(main())
