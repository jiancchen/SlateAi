#!/usr/bin/env python3

from __future__ import annotations

import argparse
import json
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[4]
MODEL_ID = "MLB-RP36"
MODEL_DIR = ROOT / "models" / "mlb" / "cartridges" / MODEL_ID
RUN_ROOT = ROOT / "data-private" / "model-runs" / "mlb" / MODEL_ID
DB_PATH = ROOT / "data-private" / "warehouse" / "sports.db"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Snapshot an MLB-RP36 reliever addendum run.")
    parser.add_argument("--date", required=True, help="Slate date, YYYY-MM-DD.")
    return parser.parse_args()


def read_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(f"{json.dumps(payload, indent=2, sort_keys=False)}\n", encoding="utf-8")


def git_info() -> dict[str, Any]:
    def run(args: list[str]) -> str | None:
        try:
            return subprocess.check_output(args, cwd=ROOT, text=True).strip()
        except Exception:
            return None

    status = run(["git", "status", "--short"]) or ""
    return {
        "commit": run(["git", "rev-parse", "HEAD"]),
        "dirty": bool(status),
    }


def source_inventory() -> list[dict[str, str]]:
    manifest = read_json(MODEL_DIR / "manifest.json")
    entries = [
        {"role": "top-level-model-registry", "path": "models/registry.json"},
        {"role": "mlb-model-registry", "path": "models/mlb/registry.json"},
        {"role": "rp36-manifest", "path": "models/mlb/cartridges/MLB-RP36/manifest.json"},
        {"role": "rp36-output-contract", "path": manifest.get("outputContract")},
        {"role": "rp36-model-description", "path": manifest.get("modelDescription")},
        {"role": "rp36-model-notes", "path": manifest.get("modelNotes")},
        {"role": "rp36-run-snapshotter", "path": "models/mlb/cartridges/MLB-RP36/snapshot_run.py"},
        {"role": "rp36-run-checker", "path": "models/mlb/cartridges/MLB-RP36/check_run.py"},
    ]
    entries.extend(manifest.get("sourceFiles") or [])
    by_path: dict[str, dict[str, str]] = {}
    for entry in entries:
        path = entry.get("path")
        if path:
            by_path[path] = {"role": entry.get("role", "source"), "path": path}
    return sorted(by_path.values(), key=lambda entry: entry["path"])


def sqlite_scalar(query: str, args: tuple[Any, ...]) -> list[dict[str, Any]]:
    import sqlite3

    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        rows = conn.execute(query, args).fetchall()
        return [dict(row) for row in rows]
    finally:
        conn.close()


def input_inventory(date: str) -> list[dict[str, Any]]:
    queries = [
        (
            "games_today",
            """
            select count(*) as rows, coalesce(sum(game_pk), 0) as game_pk_sum
            from mlb_games
            where game_date = ?
            """,
            (date,),
        ),
        (
            "bullpen_usage_today",
            """
            select count(*) as rows, coalesce(sum(pitcher_id), 0) as pitcher_id_sum
            from mlb_bullpen_usage
            where as_of_date = ?
            """,
            (date,),
        ),
        (
            "bullpen_shape_today",
            """
            select count(*) as rows
            from mlb_team_bullpen_shape_daily
            where as_of_date = ?
            """,
            (date,),
        ),
        (
            "starter_logs_through_date",
            """
            select count(*) as rows, coalesce(sum(pitcher_id), 0) as pitcher_id_sum
            from mlb_starting_pitcher_game_logs
            where game_date <= ?
            """,
            (date,),
        ),
        (
            "reliever_appearances_before_date",
            """
            select count(*) as rows, coalesce(sum(pitcher_id), 0) as pitcher_id_sum,
                   coalesce(sum(pitches_thrown), 0) as pitches_sum
            from mlb_pitcher_appearances
            where game_date < ?
              and pitcher_role = 'reliever'
            """,
            (date,),
        ),
        (
            "plate_appearances_before_date",
            """
            select count(*) as rows, coalesce(sum(game_pk), 0) as game_pk_sum
            from mlb_plate_appearances
            where game_date < ?
            """,
            (date,),
        ),
        (
            "lineup_shape_history",
            """
            select count(*) as rows
            from mlb_lineup_conversion_shape_daily
            where as_of_date <= ?
            """,
            (date,),
        ),
        (
            "lineup_dependency_history",
            """
            select count(*) as rows
            from mlb_lineup_dependency_profiles
            where as_of_date <= ?
            """,
            (date,),
        ),
    ]

    rows = []
    for role, query, args in queries:
        result = sqlite_scalar(query, args)
        rows.append({
            "role": role,
            "query": " ".join(query.split()),
            "rows": result,
            "exists": True,
        })
    return rows


def artifact_paths(date: str) -> list[dict[str, str]]:
    return [
        {
            "role": "reliever-shadow-json",
            "path": f"data-private/predictions/mlb-reliever-shadow/{date}-reliever-shadow.json",
        },
        {
            "role": "reliever-shadow-module",
            "path": f"web/src/lib/day-{date}-reliever-shadow.js",
        },
        {
            "role": "reliever-shadow-report",
            "path": "development-docs/mlb/research/mlb-first-up-reliever-shadow-board-053026.md",
        },
    ]


def build_snapshot(date: str) -> dict[str, Any]:
    artifact_path = ROOT / f"data-private/predictions/mlb-reliever-shadow/{date}-reliever-shadow.json"
    artifact = read_json(artifact_path)
    teams = artifact.get("relieverShadowByTeam") or {}
    return {
        "schemaVersion": 1,
        "modelId": MODEL_ID,
        "date": date,
        "meta": artifact.get("meta") or {},
        "artifactSummary": {
            "relieverTeams": len(teams),
            "candidateCount": (artifact.get("meta") or {}).get("candidateCount"),
        },
    }


def main() -> int:
    args = parse_args()
    date = args.date
    run_dir = RUN_ROOT / date
    run_id = f"mlb-{date}-MLB-RP36"

    source_files = source_inventory()
    input_rows = input_inventory(date)
    snapshot = build_snapshot(date)

    write_json(run_dir / "snapshot.json", snapshot)
    output_targets = [
        *artifact_paths(date),
        {"role": "prediction-snapshot", "path": f"data-private/model-runs/mlb/MLB-RP36/{date}/snapshot.json"},
        {"role": "run-manifest", "path": f"data-private/model-runs/mlb/MLB-RP36/{date}/run.json"},
    ]

    run = {
        "schemaVersion": 1,
        "runId": run_id,
        "sport": "mlb",
        "slateDate": date,
        "modelId": MODEL_ID,
        "mode": "relief-addendum",
        "status": "snapshotted",
        "snapshottedAt": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "git": git_info(),
        "sourceHash": None,
        "inputHash": None,
        "outputHash": None,
        "artifactHash": None,
        "artifactSummary": snapshot["artifactSummary"],
        "sourceFiles": len(source_files),
        "inputs": len(input_rows),
        "outputs": len(output_targets),
        "artifacts": output_targets,
    }
    write_json(run_dir / "run.json", run)

    subprocess.run(
        [
            sys.executable,
            str(ROOT / "models" / "shared" / "model-runs" / "index_runs.py"),
            "index",
            "--sport",
            "mlb",
            "--model-id",
            MODEL_ID,
            "--date",
            date,
        ],
        cwd=ROOT,
        check=True,
    )

    print(json.dumps({
        "runId": run_id,
        "runDir": str(run_dir),
        "status": "snapshotted",
        "artifactHash": None,
        "artifactSummary": snapshot["artifactSummary"],
    }, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
