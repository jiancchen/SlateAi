#!/usr/bin/env python3

from __future__ import annotations

import argparse
import json
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[3]
DB_PATH = ROOT / "data-private" / "warehouse" / "sports.db"


SCHEMA = """
CREATE TABLE IF NOT EXISTS model_runs (
  run_id TEXT PRIMARY KEY,
  sport TEXT NOT NULL,
  model_id TEXT NOT NULL,
  slate_date TEXT NOT NULL,
  mode TEXT,
  status TEXT,
  locked_at TEXT,
  source_hash TEXT,
  input_hash TEXT,
  output_hash TEXT,
  snapshot_hash TEXT,
  artifact_hash TEXT,
  source_files INTEGER,
  input_count INTEGER,
  output_count INTEGER,
  artifact_summary_json TEXT,
  run_json TEXT NOT NULL,
  indexed_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_model_runs_sport_model_date
  ON model_runs(sport, model_id, slate_date);

CREATE TABLE IF NOT EXISTS model_run_artifacts (
  run_id TEXT NOT NULL,
  role TEXT NOT NULL,
  path TEXT NOT NULL,
  exists_flag INTEGER NOT NULL,
  sha256 TEXT,
  PRIMARY KEY (run_id, role, path)
);

CREATE TABLE IF NOT EXISTS model_run_lanes (
  run_id TEXT NOT NULL,
  lane TEXT NOT NULL,
  status TEXT NOT NULL,
  row_count INTEGER NOT NULL DEFAULT 0,
  graded_count INTEGER NOT NULL DEFAULT 0,
  hit_count INTEGER NOT NULL DEFAULT 0,
  miss_count INTEGER NOT NULL DEFAULT 0,
  hit_pct REAL,
  avg_pnl_per100 REAL,
  details_json TEXT,
  PRIMARY KEY (run_id, lane)
);

CREATE TABLE IF NOT EXISTS model_component_runs (
  parent_run_id TEXT NOT NULL,
  component_model_id TEXT NOT NULL,
  component_run_id TEXT NOT NULL,
  component_role TEXT NOT NULL,
  details_json TEXT,
  PRIMARY KEY (parent_run_id, component_model_id, component_role)
);

CREATE TABLE IF NOT EXISTS mlb_rp36_settlements (
  prediction_date TEXT NOT NULL,
  model_id TEXT NOT NULL,
  run_id TEXT NOT NULL,
  status TEXT NOT NULL,
  team_count INTEGER NOT NULL DEFAULT 0,
  candidate_count INTEGER NOT NULL DEFAULT 0,
  graded_team_count INTEGER NOT NULL DEFAULT 0,
  exact_hits INTEGER NOT NULL DEFAULT 0,
  top2_hits INTEGER NOT NULL DEFAULT 0,
  top3_hits INTEGER NOT NULL DEFAULT 0,
  exact_hit_pct REAL,
  top2_hit_pct REAL,
  top3_hit_pct REAL,
  details_json TEXT,
  indexed_at TEXT NOT NULL,
  PRIMARY KEY (prediction_date, model_id)
);

CREATE TABLE IF NOT EXISTS mlb_rp36_team_settlements (
  prediction_date TEXT NOT NULL,
  model_id TEXT NOT NULL,
  run_id TEXT NOT NULL,
  team_name TEXT NOT NULL,
  official_team_name TEXT,
  opponent_name TEXT,
  actual_pitcher_id INTEGER,
  actual_pitcher_name TEXT,
  actual_outs_recorded INTEGER,
  predicted_top1_pitcher_id INTEGER,
  predicted_top1_pitcher_name TEXT,
  predicted_top2_pitcher_ids TEXT,
  predicted_top3_pitcher_ids TEXT,
  exact_hit INTEGER,
  top2_hit INTEGER,
  top3_hit INTEGER,
  status TEXT NOT NULL,
  details_json TEXT,
  PRIMARY KEY (prediction_date, model_id, team_name)
);
"""


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Index model run snapshots into the shared sports warehouse.")
    subparsers = parser.add_subparsers(dest="command", required=True)

    index_parser = subparsers.add_parser("index", help="Index one run.")
    index_parser.add_argument("--sport", required=True)
    index_parser.add_argument("--model-id", required=True)
    index_parser.add_argument("--date", required=True)
    index_parser.add_argument("--db", default=str(DB_PATH))

    all_parser = subparsers.add_parser("index-all", help="Index all saved runs for a sport or model.")
    all_parser.add_argument("--sport", default="mlb")
    all_parser.add_argument("--model-id", default="")
    all_parser.add_argument("--db", default=str(DB_PATH))
    return parser.parse_args()


def read_json(path: Path, fallback: Any = None) -> Any:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except FileNotFoundError:
        return fallback


def read_jsonl(path: Path) -> list[dict[str, Any]]:
    if not path.exists():
        return []
    return [json.loads(line) for line in path.read_text(encoding="utf-8").splitlines() if line.strip()]


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def stable_json(value: Any) -> str:
    return json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=True)


def sport_registry(sport: str) -> dict[str, Any]:
    return read_json(ROOT / "models" / sport / "registry.json", {}) or {}


def sport_model_entry(sport: str, model_id: str) -> dict[str, Any]:
    normalized = str(model_id or "").upper()
    registry = sport_registry(sport)
    for entry in registry.get("cartridges") or []:
        if str(entry.get("modelId") or "").upper() == normalized:
            return entry
    return {}


def sport_model_role(sport: str, model_id: str) -> str:
    return str(sport_model_entry(sport, model_id).get("role") or "")


def mlb_component_model_ids(parent_model_id: str) -> list[str]:
    entry = sport_model_entry("mlb", parent_model_id)
    components = entry.get("components") or []
    return [str(component).upper() for component in components if component]


def is_parent_model(sport: str, model_id: str) -> bool:
    role = sport_model_role(sport, model_id)
    return role == "parent_model"


def pct(hits: int, rows: int) -> float | None:
    return round((hits / rows) * 100.0, 1) if rows else None


def ensure_schema(conn: sqlite3.Connection) -> None:
    conn.executescript(SCHEMA)


def table_exists(conn: sqlite3.Connection, table_name: str) -> bool:
    row = conn.execute(
        "SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ? LIMIT 1",
        (table_name,),
    ).fetchone()
    return row is not None


def run_dir(sport: str, model_id: str, date: str) -> Path:
    return ROOT / "data-private" / "model-runs" / sport / model_id / date


def load_run(sport: str, model_id: str, date: str) -> tuple[Path, dict[str, Any]]:
    directory = run_dir(sport, model_id, date)
    run = read_json(directory / "run.json")
    if not run:
        raise FileNotFoundError(f"Run manifest missing: {directory / 'run.json'}")
    return directory, run


def index_artifacts(conn: sqlite3.Connection, directory: Path, run: dict[str, Any]) -> None:
    run_id = str(run["runId"])
    conn.execute("DELETE FROM model_run_artifacts WHERE run_id = ?", (run_id,))

    rows: list[dict[str, Any]] = []
    declared_artifacts = run.get("artifacts") or []
    if declared_artifacts:
        rows.extend(declared_artifacts)
    else:
        for file_name, key in (("files.lock.json", "files"), ("inputs.lock.json", "inputs"), ("outputs.lock.json", "outputs")):
            payload = read_json(directory / file_name, {})
            rows.extend(payload.get(key) or [])

    for row in rows:
        conn.execute(
            """
            INSERT OR REPLACE INTO model_run_artifacts (
              run_id, role, path, exists_flag, sha256
            ) VALUES (?, ?, ?, ?, ?)
            """,
            (
                run_id,
                str(row.get("role") or "artifact"),
                str(row.get("path") or ""),
                1 if row.get("exists", True) else 0,
                row.get("sha256"),
            ),
        )


def mlb_journal_lanes(date: str) -> list[dict[str, Any]]:
    rows = read_jsonl(ROOT / "data-private" / "history" / f"mlb-results-{date}.jsonl")
    moneyline = [row for row in rows if row.get("marketType") == "moneyline"]
    first_inning = [row for row in rows if row.get("marketType") == "firstInning"]
    hr_rows = [row for row in rows if row.get("marketType") == "homeRun"]
    prop_rows = [row for row in rows if row.get("marketType") == "playerProp"]

    def lane(label: str, lane_rows: list[dict[str, Any]], hit_fn) -> dict[str, Any]:
        hits = sum(1 for row in lane_rows if hit_fn(row))
        row_count = len(lane_rows)
        return {
            "lane": label,
            "status": "settled" if row_count else "pending",
            "row_count": row_count,
            "graded_count": row_count,
            "hit_count": hits,
            "miss_count": max(0, row_count - hits),
            "hit_pct": pct(hits, row_count),
            "details": {"source": "data-private/history/mlb-results-jsonl"},
        }

    return [
        lane("Full-game side", moneyline, lambda row: bool(row.get("result", {}).get("fullGameHit"))),
        lane("First-five side", moneyline, lambda row: bool(row.get("result", {}).get("first5Hit"))),
        lane("First inning", first_inning, lambda row: bool(row.get("result", {}).get("hit"))),
        lane("HR board", hr_rows, lambda row: bool(row.get("result", {}).get("hit"))),
        lane("Player props", prop_rows, lambda row: bool(row.get("result", {}).get("hit"))),
    ]


def game_date_is_settled(conn: sqlite3.Connection, date: str) -> bool:
    if not table_exists(conn, "mlb_games"):
        return False
    rows = conn.execute(
        """
        SELECT status
        FROM mlb_games
        WHERE game_date = ?
        """,
        (date,),
    ).fetchall()
    if not rows:
        return False
    return all(str(row["status"] or "").lower() == "final" for row in rows)


def actual_first_up_lookup(conn: sqlite3.Connection, date: str) -> dict[str, dict[str, Any]]:
    if not table_exists(conn, "mlb_pitcher_appearances"):
        return {}
    rows = conn.execute(
        """
        SELECT
          game_pk,
          team_name,
          opponent_name,
          pitcher_id,
          pitcher_name,
          entry_order,
          outs_recorded
        FROM mlb_pitcher_appearances
        WHERE game_date = ?
          AND pitcher_role = 'reliever'
        ORDER BY team_name, game_pk, entry_order, pitcher_id
        """,
        (date,),
    ).fetchall()

    grouped: dict[str, list[sqlite3.Row]] = {}
    game_counts: dict[str, set[int]] = {}
    for row in rows:
        team = str(row["team_name"])
        grouped.setdefault(team, []).append(row)
        game_counts.setdefault(team, set()).add(int(row["game_pk"]))

    lookup: dict[str, dict[str, Any]] = {}
    for team, appearances in grouped.items():
        if len(game_counts.get(team, set())) != 1:
            continue
        ordered = sorted(appearances, key=lambda row: (row["entry_order"] or 99, row["pitcher_id"] or 0))
        if ordered:
            first = ordered[0]
            lookup[team] = {
                "pitcher_id": int(first["pitcher_id"]),
                "pitcher_name": first["pitcher_name"],
                "opponent_name": first["opponent_name"] or "",
                "outs_recorded": int(first["outs_recorded"] or 0),
            }
    return lookup


def index_rp36_settlement(conn: sqlite3.Connection, date: str, run: dict[str, Any]) -> list[dict[str, Any]]:
    artifact = read_json(ROOT / "data-private" / "predictions" / "mlb-reliever-shadow" / f"{date}-reliever-shadow.json", {})
    teams = artifact.get("relieverShadowByTeam") or {}
    actual = actual_first_up_lookup(conn, date)
    slate_final = game_date_is_settled(conn, date)
    indexed_at = now_iso()
    run_id = str(run["runId"])
    model_id = str(run.get("modelId") or "MLB-RP36")
    exact = top2 = top3 = graded = 0
    team_details: list[dict[str, Any]] = []

    conn.execute(
        "DELETE FROM mlb_rp36_team_settlements WHERE prediction_date = ? AND model_id = ?",
        (date, model_id),
    )

    for team_name, entry in sorted(teams.items()):
        official_team = str(entry.get("officialTeamName") or team_name)
        relievers = entry.get("relievers") or []
        top_ids = [int(reliever["pitcherId"]) for reliever in relievers if reliever.get("pitcherId") is not None]
        top_names = [str(reliever.get("name") or "") for reliever in relievers]
        actual_entry = actual.get(official_team)
        status = "settled" if actual_entry and slate_final else ("partial" if actual_entry else "pending")
        exact_hit = top2_hit = top3_hit = None
        if actual_entry:
            actual_id = int(actual_entry["pitcher_id"])
            exact_hit = 1 if top_ids[:1] and top_ids[0] == actual_id else 0
            top2_hit = 1 if actual_id in top_ids[:2] else 0
            top3_hit = 1 if actual_id in top_ids[:3] else 0
            graded += 1
            exact += exact_hit
            top2 += top2_hit
            top3 += top3_hit

        detail = {
            "topNames": top_names[:5],
            "summaryLine": entry.get("summaryLine"),
            "topTwoSharePct": entry.get("topTwoSharePct"),
            "slateFinal": slate_final,
        }
        team_details.append({
            "teamName": team_name,
            "status": status,
            "actualPitcher": actual_entry,
            "topIds": top_ids[:3],
            "exactHit": exact_hit,
            "top2Hit": top2_hit,
            "top3Hit": top3_hit,
        })
        conn.execute(
            """
            INSERT OR REPLACE INTO mlb_rp36_team_settlements (
              prediction_date, model_id, run_id, team_name, official_team_name,
              opponent_name, actual_pitcher_id, actual_pitcher_name, actual_outs_recorded,
              predicted_top1_pitcher_id, predicted_top1_pitcher_name,
              predicted_top2_pitcher_ids, predicted_top3_pitcher_ids,
              exact_hit, top2_hit, top3_hit, status, details_json
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                date,
                model_id,
                run_id,
                team_name,
                official_team,
                entry.get("opponentName"),
                actual_entry.get("pitcher_id") if actual_entry else None,
                actual_entry.get("pitcher_name") if actual_entry else None,
                actual_entry.get("outs_recorded") if actual_entry else None,
                top_ids[0] if top_ids else None,
                top_names[0] if top_names else None,
                json.dumps(top_ids[:2]),
                json.dumps(top_ids[:3]),
                exact_hit,
                top2_hit,
                top3_hit,
                status,
                json.dumps(detail, sort_keys=True),
            ),
        )

    status = "settled" if slate_final and graded == len(teams) and teams else ("partial" if graded else "pending")
    candidate_count = int((artifact.get("meta") or {}).get("candidateCount") or run.get("artifactSummary", {}).get("candidateCount") or 0)
    conn.execute(
        """
        INSERT OR REPLACE INTO mlb_rp36_settlements (
          prediction_date, model_id, run_id, status, team_count, candidate_count,
          graded_team_count, exact_hits, top2_hits, top3_hits,
          exact_hit_pct, top2_hit_pct, top3_hit_pct, details_json, indexed_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            date,
            model_id,
            run_id,
            status,
            len(teams),
            candidate_count,
            graded,
            exact,
            top2,
            top3,
            pct(exact, graded),
            pct(top2, graded),
            pct(top3, graded),
            json.dumps({"teams": team_details}, sort_keys=True),
            indexed_at,
        ),
    )

    return [
        {
            "lane": "RP36 exact first reliever",
            "status": status,
            "row_count": len(teams),
            "graded_count": graded,
            "hit_count": exact,
            "miss_count": max(0, graded - exact),
            "hit_pct": pct(exact, graded),
            "details": {"slateFinal": slate_final},
        },
        {
            "lane": "RP36 top-2 first reliever",
            "status": status,
            "row_count": len(teams),
            "graded_count": graded,
            "hit_count": top2,
            "miss_count": max(0, graded - top2),
            "hit_pct": pct(top2, graded),
            "details": {"slateFinal": slate_final},
        },
        {
            "lane": "RP36 top-3 first reliever",
            "status": status,
            "row_count": len(teams),
            "graded_count": graded,
            "hit_count": top3,
            "miss_count": max(0, graded - top3),
            "hit_pct": pct(top3, graded),
            "details": {"slateFinal": slate_final},
        },
    ]


def model_lanes(conn: sqlite3.Connection, sport: str, model_id: str, date: str, run: dict[str, Any]) -> list[dict[str, Any]]:
    if sport == "mlb" and is_parent_model(sport, model_id):
        lanes = mlb_journal_lanes(date)
        conn.execute("DELETE FROM model_component_runs WHERE parent_run_id = ?", (run["runId"],))
        for component_model_id in mlb_component_model_ids(model_id):
            component_run = read_json(run_dir(sport, component_model_id, date) / "run.json", None)
            if not component_run:
                continue
            component_role = sport_model_role(sport, component_model_id) or "component"
            if component_role == "relief_addendum":
                component_role = "relief-addendum"
            conn.execute(
                """
                INSERT OR REPLACE INTO model_component_runs (
                  parent_run_id, component_model_id, component_run_id, component_role, details_json
                ) VALUES (?, ?, ?, ?, ?)
                """,
                (
                    run["runId"],
                    component_model_id,
                    component_run.get("runId"),
                    component_role,
                    json.dumps({"mode": component_run.get("mode"), "status": component_run.get("status")}, sort_keys=True),
                ),
            )
        return lanes
    if sport == "mlb" and model_id == "MLB-RP36":
        return index_rp36_settlement(conn, date, run)
    return []


def index_model_run(sport: str, model_id: str, date: str, db_path: Path = DB_PATH) -> dict[str, Any]:
    directory, run = load_run(sport, model_id, date)
    db_path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    try:
        ensure_schema(conn)
        indexed_at = now_iso()
        conn.execute(
            """
            INSERT OR REPLACE INTO model_runs (
              run_id, sport, model_id, slate_date, mode, status, locked_at,
              source_hash, input_hash, output_hash, snapshot_hash, artifact_hash,
              source_files, input_count, output_count, artifact_summary_json,
              run_json, indexed_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                run["runId"],
                sport,
                model_id,
                date,
                run.get("mode"),
                run.get("status"),
                run.get("lockedAt"),
                run.get("sourceHash"),
                run.get("inputHash"),
                run.get("outputHash"),
                run.get("snapshotHash"),
                run.get("artifactHash"),
                int(run.get("sourceFiles") or 0),
                int(run.get("inputs") or 0),
                int(run.get("outputs") or 0),
                json.dumps(run.get("artifactSummary") or {}, sort_keys=True),
                json.dumps(run, sort_keys=True),
                indexed_at,
            ),
        )
        index_artifacts(conn, directory, run)

        lanes = model_lanes(conn, sport, model_id, date, run)
        conn.execute("DELETE FROM model_run_lanes WHERE run_id = ?", (run["runId"],))
        for lane in lanes:
            conn.execute(
                """
                INSERT OR REPLACE INTO model_run_lanes (
                  run_id, lane, status, row_count, graded_count, hit_count,
                  miss_count, hit_pct, avg_pnl_per100, details_json
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    run["runId"],
                    lane["lane"],
                    lane["status"],
                    int(lane.get("row_count") or 0),
                    int(lane.get("graded_count") or 0),
                    int(lane.get("hit_count") or 0),
                    int(lane.get("miss_count") or 0),
                    lane.get("hit_pct"),
                    lane.get("avg_pnl_per100"),
                    json.dumps(lane.get("details") or {}, sort_keys=True),
                ),
            )

        conn.commit()
        return {"runId": run["runId"], "lanes": len(lanes), "status": run.get("status")}
    finally:
        conn.close()


def discover_runs(sport: str, model_id: str | None = None) -> list[tuple[str, str, str]]:
    root = ROOT / "data-private" / "model-runs" / sport
    if not root.exists():
        return []
    rows: list[tuple[str, str, str]] = []
    for model_root in sorted(root.iterdir()):
        if not model_root.is_dir():
            continue
        if model_id and model_root.name != model_id:
            continue
        for date_dir in sorted(model_root.iterdir()):
            if date_dir.is_dir() and (date_dir / "run.json").exists():
                rows.append((sport, model_root.name, date_dir.name))
    return rows


def main() -> int:
    args = parse_args()
    db_path = Path(args.db)
    if args.command == "index":
        result = index_model_run(args.sport, args.model_id, args.date, db_path)
        print(json.dumps(result, indent=2))
        return 0

    results = [
        index_model_run(sport, model_id, date, db_path)
        for sport, model_id, date in discover_runs(args.sport, args.model_id or None)
    ]
    print(json.dumps({"indexed": len(results), "runs": results}, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
