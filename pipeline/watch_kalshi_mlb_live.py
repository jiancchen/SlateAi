#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import sqlite3
import time
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

from fetch_kalshi_mlb_markets import SERIES, TEAM_CODES, build_output
from mlb_warehouse import MLB_SCHEDULE_URL, fetch_text, get_connection, init_db, record_snapshot


RAW_DIR = Path(__file__).resolve().parents[1] / "data-private" / "raw" / "kalshi" / "mlb"
LIVE_WINDOWS = {"pregame", "live"}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Capture live Kalshi MLB market snapshots into the local warehouse during pregame/live windows."
    )
    parser.add_argument("--date", required=True, help="Target MLB date in YYYY-MM-DD format.")
    parser.add_argument("--interval-seconds", type=int, default=60, help="Polling interval while watching. Defaults to 60.")
    parser.add_argument(
        "--pregame-window-minutes",
        type=int,
        default=20,
        help="Only capture pregame snapshots this many minutes before scheduled first pitch. Defaults to 20.",
    )
    parser.add_argument("--once", action="store_true", help="Capture once and exit.")
    parser.add_argument(
        "--include-idle",
        action="store_true",
        help="Also capture games outside the pregame/live windows. Useful for a daily baseline snapshot.",
    )
    parser.add_argument(
        "--include-final",
        action="store_true",
        help="Also capture games marked final. Usually not needed for scalp research.",
    )
    return parser.parse_args()


def now_utc() -> datetime:
    return datetime.now(timezone.utc)


def now_iso() -> str:
    return now_utc().isoformat(timespec="seconds").replace("+00:00", "Z")


def safe_datetime(value: str | None) -> datetime | None:
    if not value:
        return None
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None


def team_code(name: str | None) -> str | None:
    return TEAM_CODES.get(name or "")


def schedule_team_code(team: dict[str, Any] | None) -> str | None:
    team = team or {}
    abbreviation = (team.get("abbreviation") or "").upper()
    if abbreviation:
        return abbreviation
    for key in ("teamName", "clubName", "name"):
        code = team_code(team.get(key))
        if code:
            return code
    return None


def derive_capture_window(start_dt: datetime | None, detailed_state: str, abstract_state: str, pregame_minutes: int) -> str:
    detail = (detailed_state or "").lower()
    abstract = (abstract_state or "").lower()
    now = now_utc()
    if "final" in detail or abstract == "final":
        return "final"
    if any(token in detail for token in ("in progress", "manager challenge", "review", "delayed", "warmup")) or abstract == "live":
        return "live"
    if start_dt:
        if now >= start_dt:
            return "live"
        if now >= start_dt - timedelta(minutes=pregame_minutes):
            return "pregame"
    return "idle"


def fetch_schedule_state(date_text: str, pregame_minutes: int) -> dict[str, dict[str, Any]]:
    payload = json.loads(fetch_text(MLB_SCHEDULE_URL.format(date=date_text)))
    games = (payload.get("dates") or [{}])[0].get("games") or []
    out: dict[str, dict[str, Any]] = {}
    for game in games:
        teams = game.get("teams") or {}
        away_team = ((teams.get("away") or {}).get("team")) or {}
        home_team = ((teams.get("home") or {}).get("team")) or {}
        away_name = away_team.get("name")
        home_name = home_team.get("name")
        away_code = schedule_team_code(away_team)
        home_code = schedule_team_code(home_team)
        if not away_code or not home_code:
            continue
        code = f"{away_code}{home_code}"
        status = game.get("status") or {}
        start_dt = safe_datetime(game.get("gameDate"))
        out[code] = {
            "gamePk": game.get("gamePk"),
            "gameDatetime": game.get("gameDate"),
            "statusAbstract": status.get("abstractGameState") or "",
            "statusDetailed": status.get("detailedState") or "",
            "captureWindow": derive_capture_window(
                start_dt,
                status.get("detailedState") or "",
                status.get("abstractGameState") or "",
                pregame_minutes,
            ),
        }
    return out


def should_store(window: str, *, include_idle: bool, include_final: bool) -> bool:
    if window in LIVE_WINDOWS:
        return True
    if window == "final":
        return include_final
    if window == "idle":
        return include_idle
    return False


def write_raw_snapshot(date_text: str, snapshot_ts: str, payload: dict[str, Any]) -> Path:
    stamp = snapshot_ts.replace(":", "").replace("-", "")
    path = RAW_DIR / date_text / f"{stamp}.json"
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    return path


def flatten_market_rows(game: dict[str, Any]) -> list[tuple[str, dict[str, Any]]]:
    rows: list[tuple[str, dict[str, Any]]] = []
    for row in (game.get("winner", {}) or {}).get("rows") or []:
        rows.append(("winner", row))
    for row in (game.get("total", {}) or {}).get("rows") or []:
        rows.append(("total", row))
    if game.get("firstInning"):
        rows.append(("firstInning", game["firstInning"]))
    for row in (game.get("first5Winner", {}) or {}).get("rows") or []:
        rows.append(("first5Winner", row))
    for row in (game.get("first5Total", {}) or {}).get("rows") or []:
        rows.append(("first5Total", row))
    for row in (game.get("spread", {}) or {}).get("rows") or []:
        rows.append(("spread", row))
    return rows


def capture_once(
    conn: sqlite3.Connection,
    *,
    date_text: str,
    pregame_minutes: int,
    include_idle: bool,
    include_final: bool,
) -> tuple[int, dict[str, int]]:
    state_by_code = fetch_schedule_state(date_text, pregame_minutes)
    payload = build_output(date_text)
    snapshot_ts = now_iso()
    counts = {"pregame": 0, "live": 0, "idle": 0, "final": 0}
    for state in state_by_code.values():
        counts[state["captureWindow"]] = counts.get(state["captureWindow"], 0) + 1

    if not any(should_store(window, include_idle=include_idle, include_final=include_final) for window in counts if counts[window]):
        return 0, counts

    raw_path = write_raw_snapshot(date_text, snapshot_ts, {"stateByCode": state_by_code, "payload": payload})

    # temporarily override store filter for this capture pass
    inserted = 0
    by_game = (((payload.get("dates") or {}).get(date_text) or {}).get("byGameId")) or {}
    for game in by_game.values():
        state = state_by_code.get(game.get("eventCode") or "", {})
        window = state.get("captureWindow") or "idle"
        if not should_store(window, include_idle=include_idle, include_final=include_final):
            continue
        for market_family, row in flatten_market_rows(game):
            series_ticker = SERIES.get(market_family if market_family in SERIES else market_family.replace("Winner", "Winner"))
            conn.execute(
                """
                INSERT OR REPLACE INTO mlb_kalshi_market_snapshots (
                  snapshot_ts, game_date, game_pk, game_id, game_title, away_team, home_team,
                  game_status, game_status_detail, capture_window, market_family, series_ticker,
                  event_ticker, market_ticker, selection_code, market_title, line,
                  yes_bid_cents, yes_ask_cents, no_bid_cents, no_ask_cents, last_price_cents,
                  open_interest_fp, volume_fp, raw_json
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    snapshot_ts,
                    date_text,
                    state.get("gamePk") or game.get("gamePk"),
                    game.get("gameId"),
                    game.get("title"),
                    game.get("awayName"),
                    game.get("homeName"),
                    state.get("statusAbstract"),
                    state.get("statusDetailed"),
                    window,
                    market_family,
                    series_ticker,
                    row.get("eventTicker"),
                    row.get("ticker"),
                    row.get("selectionCode"),
                    row.get("title"),
                    row.get("line"),
                    row.get("yesBidCents"),
                    row.get("yesAskCents"),
                    row.get("noBidCents"),
                    row.get("noAskCents"),
                    row.get("lastPriceCents"),
                    row.get("openInterest"),
                    row.get("volume"),
                    json.dumps(row, sort_keys=True),
                ),
            )
            inserted += 1

    record_snapshot(
        conn,
        source_key="kalshi.mlb.live",
        url="https://external-api.kalshi.com/trade-api/v2/markets",
        content_path=raw_path,
        content_text=json.dumps({"stateByCode": state_by_code, "payload": payload}, sort_keys=True),
        meta={"date": date_text, "rowsInserted": inserted, "counts": counts},
    )
    conn.commit()
    return inserted, counts


def main() -> None:
    args = parse_args()
    with get_connection() as conn:
        init_db(conn)
        while True:
            inserted, counts = capture_once(
                conn,
                date_text=args.date,
                pregame_minutes=args.pregame_window_minutes,
                include_idle=args.include_idle,
                include_final=args.include_final,
            )
            if inserted:
                print(
                    f"[{now_iso()}] stored {inserted} Kalshi MLB quote rows for {args.date} "
                    f"(pregame={counts.get('pregame', 0)}, live={counts.get('live', 0)}, idle={counts.get('idle', 0)}, final={counts.get('final', 0)})"
                )
            else:
                print(
                    f"[{now_iso()}] no games in capture window for {args.date} "
                    f"(pregame={counts.get('pregame', 0)}, live={counts.get('live', 0)}, idle={counts.get('idle', 0)}, final={counts.get('final', 0)})"
                )
            if args.once:
                return
            time.sleep(max(15, args.interval_seconds))


if __name__ == "__main__":
    main()
