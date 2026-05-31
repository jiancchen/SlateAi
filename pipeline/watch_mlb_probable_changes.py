#!/usr/bin/env python3

from __future__ import annotations

import argparse
import json
import sqlite3
import subprocess
import sys
import time
from datetime import datetime
from pathlib import Path
from typing import Any

from mlb_warehouse import ROOT, get_connection, list_probable_starters_snapshot, to_float, to_int


MONITOR_DIR = ROOT / "data-private" / "monitoring" / "mlb-probable-pitchers"
ALERT_DIR = ROOT / "data-private" / "alerts" / "mlb-probable-changes"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Poll official MLB probable starters, detect changes, classify big pitching swaps, and refresh the local slate."
    )
    parser.add_argument("--date", required=True, help="Target MLB date in YYYY-MM-DD format.")
    parser.add_argument("--interval-seconds", type=int, default=120, help="Polling interval. Defaults to 120.")
    parser.add_argument("--once", action="store_true", help="Poll once, diff, and exit.")
    parser.add_argument(
        "--refresh-on-change",
        action="store_true",
        help="When a change is detected, run a quick MLB slate refresh + publish export.",
    )
    parser.add_argument(
        "--verify-after-refresh",
        action="store_true",
        help="After quick refresh, also run the MLB refresh verifier.",
    )
    return parser.parse_args()


def ensure_dirs() -> None:
    MONITOR_DIR.mkdir(parents=True, exist_ok=True)
    ALERT_DIR.mkdir(parents=True, exist_ok=True)


def now_iso() -> str:
    return datetime.utcnow().isoformat(timespec="seconds") + "Z"


def normalize_snapshot(rows: list[dict[str, Any]]) -> dict[str, Any]:
    games: list[dict[str, Any]] = []
    for row in rows:
        games.append(
            {
                "gamePk": to_int(row.get("game_pk")),
                "gameDate": row.get("game_date"),
                "gameDatetime": row.get("game_datetime"),
                "gameTitle": row.get("game_title"),
                "awayTeam": row.get("away_team"),
                "homeTeam": row.get("home_team"),
                "awayPitcher": {
                    "pitcherId": to_int(row.get("away_pitcher_id")),
                    "pitcherName": row.get("away_pitcher_name") or "TBD",
                    "pitchHand": row.get("away_pitcher_hand") or "",
                    "wins": to_int(row.get("away_pitcher_wins")),
                    "losses": to_int(row.get("away_pitcher_losses")),
                    "era": to_float(row.get("away_pitcher_era")),
                    "strikeouts": to_int(row.get("away_pitcher_strikeouts")),
                },
                "homePitcher": {
                    "pitcherId": to_int(row.get("home_pitcher_id")),
                    "pitcherName": row.get("home_pitcher_name") or "TBD",
                    "pitchHand": row.get("home_pitcher_hand") or "",
                    "wins": to_int(row.get("home_pitcher_wins")),
                    "losses": to_int(row.get("home_pitcher_losses")),
                    "era": to_float(row.get("home_pitcher_era")),
                    "strikeouts": to_int(row.get("home_pitcher_strikeouts")),
                },
            }
        )
    games.sort(key=lambda game: ((game.get("gameDatetime") or ""), game.get("gameTitle") or ""))
    return {"fetchedAt": now_iso(), "games": games}


def load_snapshot(path: Path) -> dict[str, Any] | None:
    if not path.exists():
        return None
    return json.loads(path.read_text(encoding="utf-8"))


def save_snapshot(path: Path, payload: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2, sort_keys=True), encoding="utf-8")


def build_pitcher_profile(conn: sqlite3.Connection, pitcher_id: int | None, season: int) -> dict[str, Any]:
    if not pitcher_id:
        return {
            "starts": 0,
            "innings": 0.0,
            "currentWar": None,
            "currentGs": 0,
            "previousWar": None,
            "previousGs": 0,
        }
    starter_row = conn.execute(
        """
        SELECT
          COUNT(*) AS starts,
          COALESCE(SUM(innings_pitched), 0) AS innings
        FROM mlb_starting_pitcher_game_logs
        WHERE pitcher_id = ?
          AND substr(game_date, 1, 4) = ?
        """,
        (pitcher_id, str(season)),
    ).fetchone()
    current_war_row = conn.execute(
        """
        SELECT war, games_started
        FROM mlb_pitcher_war_by_season
        WHERE season = ? AND pitcher_id = ?
        """,
        (season, pitcher_id),
    ).fetchone()
    previous_war_row = conn.execute(
        """
        SELECT war, games_started
        FROM mlb_pitcher_war_by_season
        WHERE season = ? AND pitcher_id = ?
        """,
        (season - 1, pitcher_id),
    ).fetchone()
    return {
        "starts": to_int(starter_row["starts"]) or 0,
        "innings": round(to_float(starter_row["innings"]) or 0.0, 1),
        "currentWar": to_float(current_war_row["war"]) if current_war_row else None,
        "currentGs": to_int(current_war_row["games_started"]) if current_war_row else 0,
        "previousWar": to_float(previous_war_row["war"]) if previous_war_row else None,
        "previousGs": to_int(previous_war_row["games_started"]) if previous_war_row else 0,
    }


def classify_change(
    conn: sqlite3.Connection,
    date_text: str,
    team_name: str,
    old_pitcher: dict[str, Any],
    new_pitcher: dict[str, Any],
) -> dict[str, Any]:
    season = int(date_text[:4])
    old_profile = build_pitcher_profile(conn, to_int(old_pitcher.get("pitcherId")), season)
    new_profile = build_pitcher_profile(conn, to_int(new_pitcher.get("pitcherId")), season)
    reasons: list[str] = []

    if old_pitcher.get("pitchHand") and new_pitcher.get("pitchHand") and old_pitcher.get("pitchHand") != new_pitcher.get("pitchHand"):
        reasons.append(f"handedness flip {old_pitcher.get('pitchHand')} -> {new_pitcher.get('pitchHand')}")

    if new_profile["starts"] <= 2 or new_profile["innings"] < 12:
        reasons.append(f"tiny MLB sample ({new_profile['starts']} GS, {new_profile['innings']} IP)")

    if new_profile["currentWar"] is not None and new_profile["currentWar"] < 0:
        reasons.append(f"negative current WAR ({new_profile['currentWar']:.2f})")

    if new_profile["previousWar"] is not None and new_profile["previousWar"] < 0:
        reasons.append(f"negative prior WAR ({new_profile['previousWar']:.2f})")

    if old_profile["starts"] >= 5 and new_profile["starts"] <= 2:
        reasons.append("established listed starter replaced by call-up/debut lane")

    old_war = old_profile["currentWar"]
    new_war = new_profile["currentWar"]
    if old_war is not None and new_war is not None and old_war - new_war >= 1.0:
        reasons.append(f"current WAR downgrade {old_war:.2f} -> {new_war:.2f}")

    severity = "minor"
    if any("call-up" in reason or "debut" in reason or "tiny MLB sample" in reason for reason in reasons):
        severity = "critical"
    elif reasons:
        severity = "major"

    return {
        "teamName": team_name,
        "oldPitcher": old_pitcher,
        "newPitcher": new_pitcher,
        "oldProfile": old_profile,
        "newProfile": new_profile,
        "severity": severity,
        "reasons": reasons or ["listed probable starter changed"],
    }


def diff_snapshots(
    conn: sqlite3.Connection,
    date_text: str,
    previous: dict[str, Any] | None,
    current: dict[str, Any],
) -> list[dict[str, Any]]:
    if not previous:
        return []

    previous_games = {game["gameTitle"]: game for game in previous.get("games", [])}
    changes: list[dict[str, Any]] = []

    for game in current.get("games", []):
        prior_game = previous_games.get(game["gameTitle"])
        if not prior_game:
            continue
        for role_key, team_key in (("awayPitcher", "awayTeam"), ("homePitcher", "homeTeam")):
            old_pitcher = prior_game.get(role_key) or {}
            new_pitcher = game.get(role_key) or {}
            old_id = to_int(old_pitcher.get("pitcherId"))
            new_id = to_int(new_pitcher.get("pitcherId"))
            old_name = (old_pitcher.get("pitcherName") or "TBD").strip()
            new_name = (new_pitcher.get("pitcherName") or "TBD").strip()
            if old_id == new_id and old_name == new_name:
                continue
            if old_name == "TBD" and new_name == "TBD":
                continue
            classification = classify_change(conn, date_text, game.get(team_key) or "", old_pitcher, new_pitcher)
            changes.append(
                {
                    "detectedAt": now_iso(),
                    "date": date_text,
                    "gamePk": game.get("gamePk"),
                    "gameTitle": game.get("gameTitle"),
                    "teamRole": "away" if role_key == "awayPitcher" else "home",
                    **classification,
                }
            )

    changes.sort(key=lambda change: (change["severity"], change["gameTitle"]))
    return changes


def append_alerts(path: Path, changes: list[dict[str, Any]]) -> None:
    if not changes:
        return
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("a", encoding="utf-8") as handle:
        for change in changes:
            handle.write(json.dumps(change, sort_keys=True) + "\n")


def print_changes(changes: list[dict[str, Any]]) -> None:
    if not changes:
        print("No probable-starter changes detected.")
        return
    print(f"Detected {len(changes)} probable-starter change(s):")
    for change in changes:
        old_name = change["oldPitcher"].get("pitcherName") or "TBD"
        new_name = change["newPitcher"].get("pitcherName") or "TBD"
        reasons = "; ".join(change["reasons"])
        print(
            f"- [{change['severity'].upper()}] {change['gameTitle']} | {change['teamName']} "
            f"{old_name} -> {new_name} | {reasons}"
        )


def run_quick_refresh(date_text: str, verify_after_refresh: bool) -> None:
    subprocess.run(
        ["node", str(ROOT / "pipeline" / "mlb" / "workflows" / "refresh-live-board.mjs"), "--date", date_text],
        cwd=ROOT,
        check=True,
    )
    if verify_after_refresh:
        subprocess.run(
            ["npm", "run", "data:verify:mlb-refresh", "--", "--date", date_text],
            cwd=ROOT,
            check=True,
        )
    subprocess.run(["npm", "run", "data:export:published"], cwd=ROOT, check=True)


def main() -> None:
    args = parse_args()
    ensure_dirs()
    snapshot_path = MONITOR_DIR / f"{args.date}.json"
    alerts_path = ALERT_DIR / f"{args.date}.jsonl"

    while True:
        with get_connection() as conn:
            current_snapshot = normalize_snapshot(list_probable_starters_snapshot(args.date))
            previous_snapshot = load_snapshot(snapshot_path)
            changes = diff_snapshots(conn, args.date, previous_snapshot, current_snapshot)

        if previous_snapshot is None:
            print(f"Seeded probable-starter baseline for {args.date} with {len(current_snapshot.get('games', []))} games.")
        else:
            print_changes(changes)
            append_alerts(alerts_path, changes)
            if changes and args.refresh_on_change:
                print("Running quick MLB slate refresh because a pitching change was detected...")
                run_quick_refresh(args.date, args.verify_after_refresh)

        save_snapshot(snapshot_path, current_snapshot)

        if args.once:
            return

        time.sleep(max(15, args.interval_seconds))


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("Stopped probable-starter watch.")
        sys.exit(0)
