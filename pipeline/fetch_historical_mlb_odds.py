#!/usr/bin/env python3

from __future__ import annotations

import argparse
import json
import os
import sqlite3
import sys
import time
from collections import defaultdict
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from hashlib import sha256
from pathlib import Path
from typing import Any
from urllib.parse import urlencode
from urllib.request import Request, urlopen


ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "data-private"
RAW_DIR = DATA_DIR / "raw" / "odds"
WAREHOUSE_DIR = DATA_DIR / "warehouse"
DB_PATH = WAREHOUSE_DIR / "sports.db"
USER_AGENT = "SportsTradingBoardBot/1.0 historical-odds-loader"

SPORT_KEY = "baseball_mlb"
DEFAULT_FEATURED_MARKETS = ("h2h", "spreads", "totals")
DEFAULT_PROP_MARKETS = ("pitcher_strikeouts",)
DEFAULT_REGIONS = "us"
DEFAULT_LEAD_MINUTES = 15
DEFAULT_BOOKMAKERS = ""
DEFAULT_SLEEP_SECONDS = 0.0

THE_ODDS_BASE = "https://api.the-odds-api.com/v4"

SCHEMA = """
CREATE TABLE IF NOT EXISTS mlb_featured_market_odds_snapshots (
  row_key TEXT PRIMARY KEY,
  snapshot_time TEXT NOT NULL,
  market_date TEXT NOT NULL,
  game_pk INTEGER,
  source_event_id TEXT NOT NULL,
  commence_time TEXT,
  home_team TEXT NOT NULL,
  away_team TEXT NOT NULL,
  bookmaker_key TEXT NOT NULL,
  bookmaker_title TEXT,
  market_key TEXT NOT NULL,
  outcome_name TEXT NOT NULL,
  outcome_description TEXT,
  price REAL,
  point REAL,
  last_update TEXT,
  source_path TEXT,
  raw_json TEXT
);

CREATE TABLE IF NOT EXISTS mlb_player_prop_odds_snapshots (
  row_key TEXT PRIMARY KEY,
  snapshot_time TEXT NOT NULL,
  market_date TEXT NOT NULL,
  game_pk INTEGER,
  source_event_id TEXT NOT NULL,
  commence_time TEXT,
  home_team TEXT NOT NULL,
  away_team TEXT NOT NULL,
  bookmaker_key TEXT NOT NULL,
  bookmaker_title TEXT,
  market_key TEXT NOT NULL,
  player_name TEXT,
  outcome_name TEXT NOT NULL,
  outcome_description TEXT,
  price REAL,
  point REAL,
  last_update TEXT,
  source_path TEXT,
  raw_json TEXT
);

CREATE INDEX IF NOT EXISTS idx_mlb_featured_market_game_date
  ON mlb_featured_market_odds_snapshots(market_date, game_pk, market_key);
CREATE INDEX IF NOT EXISTS idx_mlb_featured_market_event_snapshot
  ON mlb_featured_market_odds_snapshots(source_event_id, snapshot_time);
CREATE INDEX IF NOT EXISTS idx_mlb_player_prop_game_date
  ON mlb_player_prop_odds_snapshots(market_date, game_pk, market_key);
CREATE INDEX IF NOT EXISTS idx_mlb_player_prop_event_snapshot
  ON mlb_player_prop_odds_snapshots(source_event_id, snapshot_time);
CREATE INDEX IF NOT EXISTS idx_mlb_player_prop_player_market
  ON mlb_player_prop_odds_snapshots(player_name, market_key, market_date);
"""


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Fetch historical MLB featured markets and pitcher strikeout props into the local warehouse."
    )
    parser.add_argument("--start-date", required=True, help="YYYY-MM-DD")
    parser.add_argument("--end-date", required=True, help="YYYY-MM-DD")
    parser.add_argument(
        "--api-key-env",
        default="ODDS_API_KEY",
        help="Environment variable name holding The Odds API key. Defaults to ODDS_API_KEY.",
    )
    parser.add_argument(
        "--regions",
        default=DEFAULT_REGIONS,
        help="Regions passed to The Odds API, e.g. us. Defaults to us.",
    )
    parser.add_argument(
        "--bookmakers",
        default=DEFAULT_BOOKMAKERS,
        help="Optional comma-separated bookmaker keys, e.g. draftkings,fanduel,betmgm,caesars.",
    )
    parser.add_argument(
        "--featured-markets",
        default=",".join(DEFAULT_FEATURED_MARKETS),
        help="Comma-separated featured markets to fetch. Defaults to h2h,spreads,totals.",
    )
    parser.add_argument(
        "--prop-markets",
        default=",".join(DEFAULT_PROP_MARKETS),
        help="Comma-separated event prop markets to fetch. Defaults to pitcher_strikeouts.",
    )
    parser.add_argument(
        "--lead-minutes",
        type=int,
        default=DEFAULT_LEAD_MINUTES,
        help="Fetch snapshot nearest to scheduled first pitch minus this many minutes. Defaults to 15.",
    )
    parser.add_argument(
        "--skip-props",
        action="store_true",
        help="Skip event-level prop fetches and only load featured markets.",
    )
    parser.add_argument(
        "--sleep-seconds",
        type=float,
        default=DEFAULT_SLEEP_SECONDS,
        help="Optional sleep between network requests. Defaults to 0.",
    )
    return parser.parse_args()


def get_connection() -> sqlite3.Connection:
    WAREHOUSE_DIR.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.executescript(SCHEMA)
    return conn


def parse_iso(value: str) -> datetime:
    return datetime.fromisoformat(value.replace("Z", "+00:00"))


def to_iso(dt: datetime) -> str:
    return dt.astimezone(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def daterange(start_date: str, end_date: str) -> list[str]:
    current = datetime.strptime(start_date, "%Y-%m-%d").date()
    end = datetime.strptime(end_date, "%Y-%m-%d").date()
    days: list[str] = []
    while current <= end:
        days.append(current.isoformat())
        current += timedelta(days=1)
    return days


@dataclass
class GameRef:
    game_pk: int
    game_date: str
    game_datetime: str
    home_team: str
    away_team: str
    snapshot_time: str


def load_games(conn: sqlite3.Connection, start_date: str, end_date: str, lead_minutes: int) -> list[GameRef]:
    rows = conn.execute(
        """
        SELECT game_pk, game_date, game_datetime, home_team, away_team
        FROM mlb_games
        WHERE game_date BETWEEN ? AND ?
          AND game_datetime IS NOT NULL
        ORDER BY game_date, game_datetime, game_pk
        """,
        (start_date, end_date),
    ).fetchall()
    games: list[GameRef] = []
    for row in rows:
        game_dt = parse_iso(row["game_datetime"])
        snapshot_dt = game_dt - timedelta(minutes=lead_minutes)
        games.append(
            GameRef(
                game_pk=int(row["game_pk"]),
                game_date=row["game_date"],
                game_datetime=row["game_datetime"],
                home_team=row["home_team"],
                away_team=row["away_team"],
                snapshot_time=to_iso(snapshot_dt),
            )
        )
    return games


def request_json(url: str) -> Any:
    req = Request(url, headers={"User-Agent": USER_AGENT})
    with urlopen(req, timeout=60) as resp:
        return json.loads(resp.read().decode("utf-8", "ignore"))


def write_json(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2, sort_keys=True), encoding="utf-8")


def build_url(path: str, api_key: str, params: dict[str, Any]) -> str:
    clean = {k: v for k, v in params.items() if v not in (None, "", [])}
    clean["apiKey"] = api_key
    return f"{THE_ODDS_BASE}{path}?{urlencode(clean)}"


def event_lookup_key(home_team: str, away_team: str, game_date: str) -> tuple[str, str, str]:
    return home_team, away_team, game_date


def make_row_key(*parts: Any) -> str:
    joined = "|".join("" if part is None else str(part) for part in parts)
    return sha256(joined.encode("utf-8")).hexdigest()


def persist_featured_rows(
    conn: sqlite3.Connection,
    *,
    market_date: str,
    snapshot_time: str,
    source_path: Path,
    event: dict[str, Any],
    game_pk: int | None,
) -> int:
    inserted = 0
    for bookmaker in event.get("bookmakers") or []:
        for market in bookmaker.get("markets") or []:
            market_key = market.get("key") or ""
            for outcome in market.get("outcomes") or []:
                row_key = make_row_key(
                    snapshot_time,
                    event.get("id"),
                    bookmaker.get("key"),
                    market_key,
                    outcome.get("name"),
                    outcome.get("description"),
                    outcome.get("point"),
                )
                conn.execute(
                    """
                    INSERT INTO mlb_featured_market_odds_snapshots (
                      row_key, snapshot_time, market_date, game_pk, source_event_id, commence_time,
                      home_team, away_team, bookmaker_key, bookmaker_title, market_key,
                      outcome_name, outcome_description, price, point, last_update, source_path, raw_json
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ON CONFLICT(row_key) DO UPDATE SET
                      game_pk=excluded.game_pk,
                      bookmaker_title=excluded.bookmaker_title,
                      price=excluded.price,
                      point=excluded.point,
                      last_update=excluded.last_update,
                      source_path=excluded.source_path,
                      raw_json=excluded.raw_json
                    """,
                    (
                        row_key,
                        snapshot_time,
                        market_date,
                        game_pk,
                        event.get("id"),
                        event.get("commence_time"),
                        event.get("home_team"),
                        event.get("away_team"),
                        bookmaker.get("key"),
                        bookmaker.get("title"),
                        market_key,
                        outcome.get("name"),
                        outcome.get("description"),
                        outcome.get("price"),
                        outcome.get("point"),
                        bookmaker.get("last_update") or market.get("last_update"),
                        str(source_path.relative_to(ROOT)),
                        json.dumps(
                            {"event": event, "bookmaker": bookmaker, "market": market, "outcome": outcome},
                            sort_keys=True,
                        ),
                    ),
                )
                inserted += 1
    return inserted


def persist_prop_rows(
    conn: sqlite3.Connection,
    *,
    market_date: str,
    snapshot_time: str,
    source_path: Path,
    event: dict[str, Any],
    game_pk: int | None,
) -> int:
    inserted = 0
    for bookmaker in event.get("bookmakers") or []:
        for market in bookmaker.get("markets") or []:
            market_key = market.get("key") or ""
            for outcome in market.get("outcomes") or []:
                row_key = make_row_key(
                    snapshot_time,
                    event.get("id"),
                    bookmaker.get("key"),
                    market_key,
                    outcome.get("description"),
                    outcome.get("name"),
                    outcome.get("point"),
                )
                conn.execute(
                    """
                    INSERT INTO mlb_player_prop_odds_snapshots (
                      row_key, snapshot_time, market_date, game_pk, source_event_id, commence_time,
                      home_team, away_team, bookmaker_key, bookmaker_title, market_key,
                      player_name, outcome_name, outcome_description, price, point, last_update, source_path, raw_json
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ON CONFLICT(row_key) DO UPDATE SET
                      game_pk=excluded.game_pk,
                      bookmaker_title=excluded.bookmaker_title,
                      player_name=excluded.player_name,
                      price=excluded.price,
                      point=excluded.point,
                      last_update=excluded.last_update,
                      source_path=excluded.source_path,
                      raw_json=excluded.raw_json
                    """,
                    (
                        row_key,
                        snapshot_time,
                        market_date,
                        game_pk,
                        event.get("id"),
                        event.get("commence_time"),
                        event.get("home_team"),
                        event.get("away_team"),
                        bookmaker.get("key"),
                        bookmaker.get("title"),
                        market_key,
                        outcome.get("description"),
                        outcome.get("name"),
                        outcome.get("description"),
                        outcome.get("price"),
                        outcome.get("point"),
                        bookmaker.get("last_update") or market.get("last_update"),
                        str(source_path.relative_to(ROOT)),
                        json.dumps(
                            {"event": event, "bookmaker": bookmaker, "market": market, "outcome": outcome},
                            sort_keys=True,
                        ),
                    ),
                )
                inserted += 1
    return inserted


def main() -> None:
    args = parse_args()
    api_key = os.environ.get(args.api_key_env)
    if not api_key:
        raise SystemExit(
            f"Missing API key in ${args.api_key_env}. Set that env var before fetching historical odds."
        )

    featured_markets = [part.strip() for part in args.featured_markets.split(",") if part.strip()]
    prop_markets = [part.strip() for part in args.prop_markets.split(",") if part.strip()]
    with get_connection() as conn:
        games = load_games(conn, args.start_date, args.end_date, args.lead_minutes)
        if not games:
            raise SystemExit("No MLB games found in warehouse for that date range.")

        game_lookup = {
            event_lookup_key(game.home_team, game.away_team, game.game_date): game for game in games
        }
        games_by_snapshot: dict[str, list[GameRef]] = defaultdict(list)
        for game in games:
            games_by_snapshot[game.snapshot_time].append(game)

        total_featured_rows = 0
        total_prop_rows = 0
        total_requests = 0

        for snapshot_time in sorted(games_by_snapshot):
            snapshot_games = games_by_snapshot[snapshot_time]
            market_date = snapshot_games[0].game_date
            url = build_url(
                f"/historical/sports/{SPORT_KEY}/odds",
                api_key,
                {
                    "regions": args.regions,
                    "markets": ",".join(featured_markets),
                    "bookmakers": args.bookmakers,
                    "oddsFormat": "american",
                    "dateFormat": "iso",
                    "date": snapshot_time,
                },
            )
            payload = request_json(url)
            total_requests += 1
            source_path = RAW_DIR / "the-odds-api" / market_date / f"featured-{snapshot_time.replace(':', '').replace('-', '')}.json"
            write_json(source_path, payload)

            snapshot_event_map: dict[tuple[str, str, str], dict[str, Any]] = {}
            for event in payload.get("data") or []:
                commence_time = event.get("commence_time") or ""
                event_date = commence_time[:10]
                snapshot_event_map[event_lookup_key(event.get("home_team"), event.get("away_team"), event_date)] = event

            for game in snapshot_games:
                event = snapshot_event_map.get(event_lookup_key(game.home_team, game.away_team, game.game_date))
                if not event:
                    continue
                total_featured_rows += persist_featured_rows(
                    conn,
                    market_date=game.game_date,
                    snapshot_time=snapshot_time,
                    source_path=source_path,
                    event=event,
                    game_pk=game.game_pk,
                )

                if args.skip_props:
                    continue

                prop_url = build_url(
                    f"/historical/sports/{SPORT_KEY}/events/{event['id']}/odds",
                    api_key,
                    {
                        "regions": args.regions,
                        "markets": ",".join(prop_markets),
                        "bookmakers": args.bookmakers,
                        "oddsFormat": "american",
                        "dateFormat": "iso",
                        "date": snapshot_time,
                    },
                )
                prop_payload = request_json(prop_url)
                total_requests += 1
                prop_path = (
                    RAW_DIR
                    / "the-odds-api"
                    / game.game_date
                    / f"props-{game.game_pk}-{snapshot_time.replace(':', '').replace('-', '')}.json"
                )
                write_json(prop_path, prop_payload)
                prop_event = prop_payload.get("data") if isinstance(prop_payload, dict) else None
                if not isinstance(prop_event, dict):
                    prop_event = prop_payload
                total_prop_rows += persist_prop_rows(
                    conn,
                    market_date=game.game_date,
                    snapshot_time=snapshot_time,
                    source_path=prop_path,
                    event=prop_event,
                    game_pk=game.game_pk,
                )

                if args.sleep_seconds > 0:
                    time.sleep(args.sleep_seconds)

            conn.commit()
            if args.sleep_seconds > 0:
                time.sleep(args.sleep_seconds)

    print(
        f"Stored {total_featured_rows} featured-market rows and {total_prop_rows} prop rows "
        f"from {total_requests} historical odds requests."
    )


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        sys.exit(130)
