#!/usr/bin/env python3

from __future__ import annotations

import importlib.util
import subprocess
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
RESEARCH_DIR = ROOT / "pipeline" / "mlb" / "research"
TARGET = RESEARCH_DIR / "research_mlb_slate_postmortem.py"


def _load_target() -> None:
    sys.path.insert(0, str(RESEARCH_DIR))
    spec = importlib.util.spec_from_file_location("_research_mlb_slate_postmortem_py_impl", TARGET)
    if spec is None or spec.loader is None:
        raise ImportError(f"Unable to load {TARGET}")
    module = importlib.util.module_from_spec(spec)
    sys.modules["_research_mlb_slate_postmortem_py_impl"] = module
    spec.loader.exec_module(module)
    for item_name, value in vars(module).items():
        if item_name.startswith("__") and item_name not in {"__doc__", "__all__"}:
            continue
        globals()[item_name] = value


if __name__ == "__main__":
    raise SystemExit(subprocess.run([sys.executable, str(TARGET), *sys.argv[1:]], cwd=ROOT).returncode)

_load_target()
