#!/usr/bin/env python3

from __future__ import annotations

import importlib.util
import subprocess
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
TARGET = ROOT / "models" / "mlb" / "cartridges" / "RP36" / "exporter.py"


def _load_target() -> None:
    spec = importlib.util.spec_from_file_location("_rp36_exporter_impl", TARGET)
    if spec is None or spec.loader is None:
        raise ImportError(f"Unable to load {TARGET}")
    module = importlib.util.module_from_spec(spec)
    sys.modules["_rp36_exporter_impl"] = module
    spec.loader.exec_module(module)
    for name, value in vars(module).items():
        if name.startswith("__") and name not in {"__doc__", "__all__"}:
            continue
        globals()[name] = value


if __name__ == "__main__":
    raise SystemExit(subprocess.run([sys.executable, str(TARGET), *sys.argv[1:]], cwd=ROOT).returncode)

_load_target()
