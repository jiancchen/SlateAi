#!/usr/bin/env python3

from __future__ import annotations

import subprocess
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
TARGET = ROOT / "pipeline" / "mlb" / "fetchers" / "watch_kalshi_mlb_live.py"


if __name__ == "__main__":
    raise SystemExit(subprocess.run([sys.executable, str(TARGET), *sys.argv[1:]], cwd=ROOT).returncode)
