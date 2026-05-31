from __future__ import annotations

import os
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
WAREHOUSE_DIR = ROOT / "data-private" / "warehouse"
SPORTS_DB_PATH = WAREHOUSE_DIR / "sports.db"


def _env_path(name: str) -> Path | None:
    value = os.environ.get(name)
    if not value:
        return None
    return Path(value).expanduser()


def warehouse_path_for_sport(sport: str = "shared") -> Path:
    sport_key = "".join(character for character in sport.upper() if character.isalnum() or character == "_")
    return (
        _env_path(f"SLATE_{sport_key}_WAREHOUSE_DB")
        or _env_path("SLATE_WAREHOUSE_DB")
        or SPORTS_DB_PATH
    )


def tennis_warehouse_path() -> Path:
    return warehouse_path_for_sport("tennis")


def mlb_warehouse_path() -> Path:
    return warehouse_path_for_sport("mlb")
