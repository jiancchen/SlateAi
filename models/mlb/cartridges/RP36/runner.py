#!/usr/bin/env python3

from __future__ import annotations

import subprocess
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[4]
EXPORTER = ROOT / "models" / "mlb" / "cartridges" / "RP36" / "exporter.py"


def main() -> int:
    command = [sys.executable, str(EXPORTER), *sys.argv[1:]]
    completed = subprocess.run(command, cwd=ROOT)
    return int(completed.returncode or 0)


if __name__ == "__main__":
    raise SystemExit(main())
