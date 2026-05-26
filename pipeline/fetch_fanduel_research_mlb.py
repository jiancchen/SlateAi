#!/usr/bin/env python3

from __future__ import annotations

import argparse
import json
import re
import sqlite3
import sys
import unicodedata
from dataclasses import dataclass
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

sys.path.append(str(Path(__file__).resolve().parent))
from fetch_historical_mlb_odds import SCHEMA, make_row_key


ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "data-private"
RAW_DIR = DATA_DIR / "raw" / "odds" / "fanduel-research" / "mlb"
WAREHOUSE_DIR = DATA_DIR / "warehouse"
DB_PATH = WAREHOUSE_DIR / "sports.db"

USER_AGENT = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/136.0 Safari/537.36"
)
BASE_URL = "https://www.fanduel.com/research"
BOOKMAKER_KEY = "fanduel_research"
BOOKMAKER_TITLE = "FanDuel Research"

STRIKEOUT_LINE_RE = re.compile(
    r"^(?P<pitcher>.+?) \((?P<team>.+?)\): Over/Under (?P<line>[\d.]+) Ks "
    r"\(Over (?P<over>[+\-]\d+), Under (?P<under>[+\-]\d+)\) \| "
    r"(?P<season>\d{4}) Stats: (?P<avg>[\d.]+) strikeouts? per game in (?P<apps>\d+) appearance[s]?$"
)
MONEYLINE_RE = re.compile(r"^(?P<team>.+?) Moneyline Odds: (?P<price>[+\-]\d+)$")
NEXT_DATA_RE = re.compile(
    r'<script id="__NEXT_DATA__" type="application/json">(.*?)</script>',
    re.DOTALL,
)
HEADING_ODDS_SUFFIX = " Odds, Lines & Predictions"


@dataclass
class GameRef:
    game_pk: int
    game_date: str
    game_datetime: str | None
    away_team: str
    home_team: str


@dataclass
class StarterLogRef:
    game_pk: int
    game_date: str
    team_role: str
    team_name: str
    opponent_name: str
    pitcher_name: str
    strikeouts: int | None


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Fetch MLB strikeout props and moneylines from FanDuel Research pages."
    )
    parser.add_argument("--start-date", required=True, help="YYYY-MM-DD")
    parser.add_argument("--end-date", required=True, help="YYYY-MM-DD")
    parser.add_argument(
        "--markets",
        default="strikeouts,moneylines",
        help="Comma-separated page families to load: strikeouts, moneylines.",
    )
    parser.add_argument(
        "--sleep-seconds",
        type=float,
        default=0.0,
        help="Optional sleep between requests.",
    )
    return parser.parse_args()


def get_connection() -> sqlite3.Connection:
    WAREHOUSE_DIR.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.executescript(SCHEMA)
    return conn


def daterange(start_date: str, end_date: str) -> list[str]:
    current = datetime.strptime(start_date, "%Y-%m-%d").date()
    end = datetime.strptime(end_date, "%Y-%m-%d").date()
    days: list[str] = []
    while current <= end:
        days.append(current.isoformat())
        current += timedelta(days=1)
    return days


def normalize_name(value: str | None) -> str:
    if not value:
        return ""
    normalized = unicodedata.normalize("NFKD", value)
    stripped = "".join(ch for ch in normalized if not unicodedata.combining(ch))
    cleaned = re.sub(r"[^a-z0-9]+", " ", stripped.casefold()).strip()
    return re.sub(r"\s+", " ", cleaned)


def request_text(url: str) -> str:
    req = Request(url, headers={"User-Agent": USER_AGENT})
    with urlopen(req, timeout=60) as resp:
        return resp.read().decode("utf-8", "ignore")


def to_iso(dt: datetime) -> str:
    return dt.astimezone(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def load_game_maps(conn: sqlite3.Connection, start_date: str, end_date: str) -> tuple[dict[tuple[str, str, str], list[GameRef]], dict[tuple[str, str], list[StarterLogRef]]]:
    game_rows = conn.execute(
        """
        SELECT game_pk, game_date, game_datetime, away_team, home_team
        FROM mlb_games
        WHERE game_date BETWEEN ? AND ?
        ORDER BY game_date, game_datetime, game_pk
        """,
        (start_date, end_date),
    ).fetchall()
    game_map: dict[tuple[str, str, str], list[GameRef]] = {}
    for row in game_rows:
        key = (row["game_date"], row["away_team"], row["home_team"])
        game_map.setdefault(key, []).append(
            GameRef(
                game_pk=int(row["game_pk"]),
                game_date=row["game_date"],
                game_datetime=row["game_datetime"],
                away_team=row["away_team"],
                home_team=row["home_team"],
            )
        )

    starter_rows = conn.execute(
        """
        SELECT game_pk, game_date, team_role, team_name, opponent_name, pitcher_name, strikeouts
        FROM mlb_starting_pitcher_game_logs
        WHERE game_date BETWEEN ? AND ?
        """,
        (start_date, end_date),
    ).fetchall()
    starter_map: dict[tuple[str, str], list[StarterLogRef]] = {}
    for row in starter_rows:
        key = (row["game_date"], normalize_name(row["pitcher_name"]))
        starter_map.setdefault(key, []).append(
            StarterLogRef(
                game_pk=int(row["game_pk"]),
                game_date=row["game_date"],
                team_role=row["team_role"],
                team_name=row["team_name"],
                opponent_name=row["opponent_name"],
                pitcher_name=row["pitcher_name"],
                strikeouts=row["strikeouts"],
            )
        )
    return game_map, starter_map


def fetch_article(slugs: list[str]) -> tuple[str, str, dict[str, Any], dict[str, Any]]:
    errors: list[str] = []
    for slug in slugs:
        url = f"{BASE_URL}/{slug}"
        try:
            html = request_text(url)
        except HTTPError as exc:
            if exc.code == 404:
                errors.append(slug)
                continue
            raise
        match = NEXT_DATA_RE.search(html)
        if not match:
            raise ValueError(f"Could not find __NEXT_DATA__ for {url}")
        next_data = json.loads(match.group(1))
        article = next_data["props"]["pageProps"]["article"]
        return url, slug, article, next_data
    raise HTTPError(
        url=f"{BASE_URL}/{slugs[0]}",
        code=404,
        msg=f"No article found for any slug variant: {', '.join(slugs)}",
        hdrs=None,
        fp=None,
    )


def save_raw_payload(raw_path: Path, payload: dict[str, Any]) -> None:
    raw_path.parent.mkdir(parents=True, exist_ok=True)
    raw_path.write_text(json.dumps(payload, indent=2, sort_keys=True), encoding="utf-8")


def block_text(block: dict[str, Any]) -> str:
    return "".join(child.get("text", "") for child in block.get("children") or []).strip()


def parse_article_blocks(article: dict[str, Any]) -> list[dict[str, Any]]:
    body = article.get("body")
    if not isinstance(body, str):
        return []
    try:
        blocks = json.loads(body)
    except json.JSONDecodeError:
        return []
    if not isinstance(blocks, list):
        return []
    return blocks


def article_snapshot_time(article: dict[str, Any], market_date: str) -> str:
    for key in ("firstPublishedAt", "publishedDate"):
        value = article.get(key)
        if isinstance(value, str) and value:
            return value
    fallback = datetime.strptime(market_date, "%Y-%m-%d").replace(tzinfo=timezone.utc)
    return to_iso(fallback)


def article_heading_to_game_key(heading: str) -> tuple[str, str] | None:
    clean = heading
    if clean.endswith(HEADING_ODDS_SUFFIX):
        clean = clean[: -len(HEADING_ODDS_SUFFIX)]
    if " at " not in clean:
        return None
    away, home = clean.split(" at ", 1)
    return away.strip(), home.strip()


def resolve_game(
    market_date: str,
    heading: str,
    *,
    game_map: dict[tuple[str, str, str], list[GameRef]],
    used_game_pks: set[int] | None = None,
) -> GameRef | None:
    teams = article_heading_to_game_key(heading)
    if not teams:
        return None
    away_team, home_team = teams
    matches = list(game_map.get((market_date, away_team, home_team), []))
    if not matches:
        return None
    if used_game_pks:
        unused = [game for game in matches if game.game_pk not in used_game_pks]
        if unused:
            chosen = unused[0]
            used_game_pks.add(chosen.game_pk)
            return chosen
    chosen = matches[0]
    if used_game_pks is not None:
        used_game_pks.add(chosen.game_pk)
    return chosen


def resolve_starter_game(
    market_date: str,
    pitcher_name: str,
    heading: str,
    *,
    starter_map: dict[tuple[str, str], list[StarterLogRef]],
    game_map: dict[tuple[str, str, str], list[GameRef]],
) -> tuple[GameRef | None, StarterLogRef | None]:
    starter_matches = starter_map.get((market_date, normalize_name(pitcher_name)), [])
    if starter_matches:
        game_pk = starter_matches[0].game_pk
        game_matches = [
            game
            for games in game_map.values()
            for game in games
            if game.game_pk == game_pk
        ]
        if game_matches:
            return game_matches[0], starter_matches[0]
    return resolve_game(market_date, heading, game_map=game_map), None


def persist_player_prop_row(
    conn: sqlite3.Connection,
    *,
    market_date: str,
    snapshot_time: str,
    source_path: Path,
    source_event_id: str,
    game: GameRef | None,
    player_name: str,
    outcome_name: str,
    price: int,
    point: float,
    description: str,
    raw_payload: dict[str, Any],
) -> None:
    row_key = make_row_key(
        BOOKMAKER_KEY,
        snapshot_time,
        market_date,
        source_event_id,
        player_name,
        outcome_name,
        point,
        price,
    )
    conn.execute(
        """
        INSERT OR REPLACE INTO mlb_player_prop_odds_snapshots (
          row_key, snapshot_time, market_date, game_pk, source_event_id,
          commence_time, home_team, away_team, bookmaker_key, bookmaker_title,
          market_key, player_name, outcome_name, outcome_description, price, point,
          last_update, source_path, raw_json
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            row_key,
            snapshot_time,
            market_date,
            game.game_pk if game else None,
            source_event_id,
            game.game_datetime if game else None,
            game.home_team if game else None,
            game.away_team if game else None,
            BOOKMAKER_KEY,
            BOOKMAKER_TITLE,
            "pitcher_strikeouts",
            player_name,
            outcome_name,
            description,
            float(price),
            point,
            snapshot_time,
            str(source_path),
            json.dumps(raw_payload, sort_keys=True),
        ),
    )


def persist_featured_row(
    conn: sqlite3.Connection,
    *,
    market_date: str,
    snapshot_time: str,
    source_path: Path,
    source_event_id: str,
    game: GameRef | None,
    outcome_name: str,
    price: int,
    raw_payload: dict[str, Any],
) -> None:
    row_key = make_row_key(
        BOOKMAKER_KEY,
        snapshot_time,
        market_date,
        source_event_id,
        "h2h",
        outcome_name,
        price,
    )
    conn.execute(
        """
        INSERT OR REPLACE INTO mlb_featured_market_odds_snapshots (
          row_key, snapshot_time, market_date, game_pk, source_event_id,
          commence_time, home_team, away_team, bookmaker_key, bookmaker_title,
          market_key, outcome_name, outcome_description, price, point, last_update,
          source_path, raw_json
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            row_key,
            snapshot_time,
            market_date,
            game.game_pk if game else None,
            source_event_id,
            game.game_datetime if game else None,
            game.home_team if game else None,
            game.away_team if game else None,
            BOOKMAKER_KEY,
            BOOKMAKER_TITLE,
            "h2h",
            outcome_name,
            None,
            float(price),
            None,
            snapshot_time,
            str(source_path),
            json.dumps(raw_payload, sort_keys=True),
        ),
    )


def ingest_strikeout_article(
    conn: sqlite3.Connection,
    *,
    market_date: str,
    source_path: Path,
    article: dict[str, Any],
    slug: str,
    game_map: dict[tuple[str, str, str], list[GameRef]],
    starter_map: dict[tuple[str, str], list[StarterLogRef]],
) -> int:
    blocks = parse_article_blocks(article)
    snapshot_time = article_snapshot_time(article, market_date)
    inserted = 0
    heading = ""
    for block in blocks:
        style = block.get("style")
        if style == "h3":
            heading = block_text(block)
            continue
        if block.get("listItem") != "bullet":
            continue
        text = block_text(block)
        match = STRIKEOUT_LINE_RE.match(text)
        if not match:
            continue
        point = float(match.group("line"))
        avg = float(match.group("avg"))
        apps = int(match.group("apps"))
        pitcher_name = match.group("pitcher").strip()
        game, matched_starter = resolve_starter_game(
            market_date,
            pitcher_name,
            heading,
            starter_map=starter_map,
            game_map=game_map,
        )
        source_event_id = f"fanduel-research:{slug}:{heading}:{pitcher_name}"
        description = (
            f"{match.group('season')} stats: {avg:.1f} strikeouts per game in {apps} appearances"
        )
        raw_payload = {
            "slug": slug,
            "heading": heading,
            "line_text": text,
            "pitcher_name": pitcher_name,
            "article_team_label": match.group("team").strip(),
            "matched_actual_starter": matched_starter is not None,
            "matched_starter_name": matched_starter.pitcher_name if matched_starter else None,
            "stats_per_game": avg,
            "appearances": apps,
            "resolved_game_pk": game.game_pk if game else None,
        }
        persist_player_prop_row(
            conn,
            market_date=market_date,
            snapshot_time=snapshot_time,
            source_path=source_path,
            source_event_id=source_event_id,
            game=game,
            player_name=pitcher_name,
            outcome_name="Over",
            price=int(match.group("over")),
            point=point,
            description=description,
            raw_payload=raw_payload,
        )
        persist_player_prop_row(
            conn,
            market_date=market_date,
            snapshot_time=snapshot_time,
            source_path=source_path,
            source_event_id=source_event_id,
            game=game,
            player_name=pitcher_name,
            outcome_name="Under",
            price=int(match.group("under")),
            point=point,
            description=description,
            raw_payload=raw_payload,
        )
        inserted += 2
    return inserted


def ingest_moneyline_article(
    conn: sqlite3.Connection,
    *,
    market_date: str,
    source_path: Path,
    article: dict[str, Any],
    slug: str,
    game_map: dict[tuple[str, str, str], list[GameRef]],
) -> int:
    blocks = parse_article_blocks(article)
    snapshot_time = article_snapshot_time(article, market_date)
    inserted = 0
    heading = ""
    used_game_pks: set[int] = set()
    current_game: GameRef | None = None
    for block in blocks:
        style = block.get("style")
        if style == "h3":
            heading = block_text(block)
            current_game = resolve_game(
                market_date,
                heading,
                game_map=game_map,
                used_game_pks=used_game_pks,
            )
            continue
        if block.get("listItem") != "bullet":
            continue
        text = block_text(block)
        match = MONEYLINE_RE.match(text)
        if not match:
            continue
        source_event_id = f"fanduel-research:{slug}:{heading}"
        raw_payload = {
            "slug": slug,
            "heading": heading,
            "line_text": text,
            "resolved_game_pk": current_game.game_pk if current_game else None,
        }
        persist_featured_row(
            conn,
            market_date=market_date,
            snapshot_time=snapshot_time,
            source_path=source_path,
            source_event_id=source_event_id,
            game=current_game,
            outcome_name=match.group("team").strip(),
            price=int(match.group("price")),
            raw_payload=raw_payload,
        )
        inserted += 1
    return inserted


def build_strikeout_slugs(day: date) -> list[str]:
    variants = [
        f"mlb-strikeout-prop-odds-{day.month}-{day.day}-{day.year}",
        f"mlb-strikeout-prop-odds-{day.month}-{day.day:02d}-{day.year}",
        f"mlb-strikeout-prop-odds-{day.month:02d}-{day.day}-{day.year}",
        f"mlb-strikeout-prop-odds-{day.month:02d}-{day.day:02d}-{day.year}",
    ]
    return list(dict.fromkeys(variants))


def build_moneyline_slugs(day: date) -> list[str]:
    variants = [
        f"mlb-betting-odds-{day.month:02d}-{day.day:02d}-{day.year}",
        f"mlb-betting-odds-{day.month:02d}-{day.day}-{day.year}",
        f"mlb-betting-odds-{day.month}-{day.day}-{day.year}",
        f"mlb-betting-odds-{day.month}-{day.day:02d}-{day.year}",
    ]
    return list(dict.fromkeys(variants))


def main() -> int:
    args = parse_args()
    markets = {item.strip().lower() for item in args.markets.split(",") if item.strip()}
    conn = get_connection()
    game_map, starter_map = load_game_maps(conn, args.start_date, args.end_date)

    total_inserted = 0
    fetched_pages = 0
    missing_pages: list[str] = []

    for iso_day in daterange(args.start_date, args.end_date):
        day = datetime.strptime(iso_day, "%Y-%m-%d").date()
        for market_name, slug_builder in (
            ("strikeouts", build_strikeout_slugs),
            ("moneylines", build_moneyline_slugs),
        ):
            if market_name not in markets:
                continue
            slug_variants = slug_builder(day)
            try:
                url, slug, article, next_data = fetch_article(slug_variants)
            except HTTPError as exc:
                if exc.code == 404:
                    missing_pages.append(slug_variants[0])
                    continue
                raise
            except URLError:
                raise

            raw_path = RAW_DIR / market_name / iso_day / f"{slug}.json"
            save_raw_payload(
                raw_path,
                {
                    "url": url,
                    "fetchedAt": to_iso(datetime.now(timezone.utc)),
                    "slug": slug,
                    "article": article,
                    "nextData": next_data,
                },
            )
            if market_name == "strikeouts":
                inserted = ingest_strikeout_article(
                    conn,
                    market_date=iso_day,
                    source_path=raw_path,
                    article=article,
                    slug=slug,
                    game_map=game_map,
                    starter_map=starter_map,
                )
            else:
                inserted = ingest_moneyline_article(
                    conn,
                    market_date=iso_day,
                    source_path=raw_path,
                    article=article,
                    slug=slug,
                    game_map=game_map,
                )
            conn.commit()
            fetched_pages += 1
            total_inserted += inserted

            if args.sleep_seconds > 0:
                import time

                time.sleep(args.sleep_seconds)

    print(
        json.dumps(
            {
                "status": "ok",
                "pagesFetched": fetched_pages,
                "rowsInserted": total_inserted,
                "missingPages": missing_pages,
                "markets": sorted(markets),
            },
            indent=2,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
