#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import re
from datetime import date
from pathlib import Path
from typing import Any
from urllib.parse import urlencode
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
PUBLISHED_SLATES_DIR = ROOT / "published-data" / "slates"
OUT_DATA_DIR = ROOT / "data-private" / "odds" / "kalshi" / "mlb"
OUT_WEB_JSON = ROOT / "web" / "src" / "lib" / "kalshi-mlb-markets.generated.json"
BASE_URL = "https://external-api.kalshi.com/trade-api/v2"

SERIES = {
    "gameWinner": "KXMLBGAME",
    "total": "KXMLBTOTAL",
    "firstInning": "KXMLBRFI",
    "first5Winner": "KXMLBF5",
    "first5Total": "KXMLBF5TOTAL",
    "spread": "KXMLBSPREAD",
}

TEAM_CODES = {
    "Diamondbacks": "AZ",
    "D-backs": "AZ",
    "Braves": "ATL",
    "Orioles": "BAL",
    "Red Sox": "BOS",
    "Cubs": "CHC",
    "White Sox": "CWS",
    "Reds": "CIN",
    "Guardians": "CLE",
    "Rockies": "COL",
    "Tigers": "DET",
    "Astros": "HOU",
    "Royals": "KC",
    "Angels": "LAA",
    "Dodgers": "LAD",
    "Marlins": "MIA",
    "Brewers": "MIL",
    "Twins": "MIN",
    "Mets": "NYM",
    "Yankees": "NYY",
    "Athletics": "ATH",
    "A's": "ATH",
    "Phillies": "PHI",
    "Pirates": "PIT",
    "Padres": "SD",
    "Giants": "SF",
    "Mariners": "SEA",
    "Cardinals": "STL",
    "Rays": "TB",
    "Rangers": "TEX",
    "Blue Jays": "TOR",
    "Nationals": "WSH",
}


def date_token_from_iso(iso_date: str) -> str:
    day = date.fromisoformat(iso_date)
    return f"{str(day.year)[2:]}{day.strftime('%b').upper()}{day.day:02d}"


def api_get(path: str, params: dict[str, Any]) -> dict[str, Any]:
    url = f"{BASE_URL}/{path}?{urlencode(params)}"
    request = Request(url, headers={"User-Agent": "sports-trading-board/1.0"})
    with urlopen(request, timeout=30) as response:
        return json.loads(response.read().decode("utf-8"))


def load_published_games(iso_date: str) -> dict[str, dict[str, Any]]:
    game_dir = PUBLISHED_SLATES_DIR / iso_date / "games"
    if not game_dir.exists():
        raise FileNotFoundError(f"Missing published slate game directory: {game_dir}")
    out: dict[str, dict[str, Any]] = {}
    for path in sorted(game_dir.glob("*.json")):
        payload = json.loads(path.read_text("utf-8"))
        matchup = payload.get("matchup") or []
        if len(matchup) < 2:
            continue
        away_name = matchup[0].get("name")
        home_name = matchup[1].get("name")
        away_code = TEAM_CODES.get(away_name)
        home_code = TEAM_CODES.get(home_name)
        if not away_code or not home_code:
            continue
        code = f"{away_code}{home_code}"
        totals = payload.get("analysis", {}).get("mlbProjection", {}).get("totals", {}) or {}
        full_game_label = ((totals.get("fullGame") or {}).get("label") or "").strip()
        match = re.search(r"([0-9]+(?:\.[0-9])?)", full_game_label)
        posted_total = float(match.group(1)) if match else None
        out[code] = {
            "gameId": payload.get("id"),
            "gamePk": payload.get("gamePk"),
            "title": payload.get("title"),
            "awayName": away_name,
            "homeName": home_name,
            "awayCode": away_code,
            "homeCode": home_code,
            "postedTotal": posted_total,
            "first5Total": totals.get("derivedFirst5TotalLine"),
        }
    return out


def fetch_series_markets(series_ticker: str) -> list[dict[str, Any]]:
    cursor = ""
    markets: list[dict[str, Any]] = []
    while True:
        params: dict[str, Any] = {"series_ticker": series_ticker, "status": "open", "limit": 500}
        if cursor:
            params["cursor"] = cursor
        data = api_get("markets", params)
        batch = data.get("markets") or []
        markets.extend(batch)
        cursor = data.get("cursor") or ""
        if not cursor:
            break
    return markets


def cents(value: Any) -> int | None:
    if value in (None, ""):
        return None
    try:
        return int(round(float(value) * 100))
    except (TypeError, ValueError):
        return None


def parse_event_code(event_ticker: str, target_token: str) -> str | None:
    if "-" not in event_ticker:
        return None
    suffix = event_ticker.split("-", 1)[1]
    if not suffix.startswith(target_token):
        return None
    if len(suffix) < 11:
        return None
    return suffix[11:]


def market_base(market: dict[str, Any]) -> dict[str, Any]:
    return {
        "ticker": market.get("ticker"),
        "eventTicker": market.get("event_ticker"),
        "title": market.get("title"),
        "status": market.get("status"),
        "lastPriceCents": cents(market.get("last_price_dollars")),
        "yesBidCents": cents(market.get("yes_bid_dollars")),
        "yesAskCents": cents(market.get("yes_ask_dollars")),
        "noBidCents": cents(market.get("no_bid_dollars")),
        "noAskCents": cents(market.get("no_ask_dollars")),
        "volume": market.get("volume_fp"),
        "openInterest": market.get("open_interest_fp"),
        "rules": market.get("rules_primary"),
    }


def total_row(market: dict[str, Any]) -> dict[str, Any]:
    row = market_base(market)
    line = market.get("floor_strike")
    line_value = float(line) if line not in (None, "") else None
    row.update(
        {
            "line": line_value,
            "label": f"Over {line_value:.1f}" if line_value is not None else row["title"],
            "opposeLabel": f"Under {line_value:.1f}" if line_value is not None else None,
        }
    )
    return row


def winner_row(market: dict[str, Any], away_code: str, home_code: str) -> dict[str, Any]:
    row = market_base(market)
    suffix = (market.get("ticker") or "").rsplit("-", 1)[-1]
    if suffix == away_code:
        side = "away"
    elif suffix == home_code:
        side = "home"
    else:
        side = suffix.lower()
    row["side"] = side
    row["selectionCode"] = suffix
    return row


def spread_row(market: dict[str, Any]) -> dict[str, Any]:
    row = market_base(market)
    line = market.get("floor_strike")
    line_value = float(line) if line not in (None, "") else None
    row["line"] = line_value
    return row


def choose_nearest(rows: list[dict[str, Any]], target: float | None) -> dict[str, Any] | None:
    if not rows:
        return None
    if target is None:
        return rows[0]
    return min(
        rows,
        key=lambda row: (
            abs(float(row.get("line") or 0) - float(target)),
            abs((row.get("yesAskCents") or 50) - 50),
        ),
    )


def build_output(iso_date: str) -> dict[str, Any]:
    games_by_code = load_published_games(iso_date)
    token = date_token_from_iso(iso_date)
    raw_by_series = {label: fetch_series_markets(series_ticker) for label, series_ticker in SERIES.items()}
    out: dict[str, Any] = {
        "source": "Kalshi external API",
        "fetchedAt": date.today().isoformat(),
        "dates": {
            iso_date: {
                "byGameId": {},
                "mappedGames": 0,
                "unmappedEventCodes": [],
            }
        },
    }
    day = out["dates"][iso_date]

    grouped: dict[str, dict[str, list[dict[str, Any]]]] = {code: {label: [] for label in SERIES} for code in games_by_code}
    unmapped_codes: set[str] = set()

    for label, markets in raw_by_series.items():
        for market in markets:
            event_code = parse_event_code(market.get("event_ticker") or "", token)
            if not event_code:
                continue
            if event_code not in grouped:
                unmapped_codes.add(event_code)
                continue
            game_meta = games_by_code[event_code]
            if label in {"gameWinner", "first5Winner"}:
                row = winner_row(market, game_meta["awayCode"], game_meta["homeCode"])
            elif label in {"total", "first5Total"}:
                row = total_row(market)
            elif label == "spread":
                row = spread_row(market)
            else:
                row = market_base(market)
            grouped[event_code][label].append(row)

    for code, game_meta in games_by_code.items():
        game_data = grouped.get(code) or {}
        winner_rows = sorted(game_data.get("gameWinner") or [], key=lambda row: (row.get("side") != "away", row.get("side") != "home"))
        first5_rows = sorted(game_data.get("first5Winner") or [], key=lambda row: (row.get("side") == "tie", row.get("side") != "away", row.get("side") != "home"))
        total_rows = sorted(game_data.get("total") or [], key=lambda row: float(row.get("line") or 999))
        first5_total_rows = sorted(game_data.get("first5Total") or [], key=lambda row: float(row.get("line") or 999))
        spread_rows = sorted(
            [row for row in (game_data.get("spread") or []) if abs(float(row.get("line") or 0) - 1.5) < 0.01],
            key=lambda row: abs((row.get("yesAskCents") or 50) - 50),
        )
        rfi_rows = game_data.get("firstInning") or []
        day["byGameId"][game_meta["gameId"]] = {
            "gameId": game_meta["gameId"],
            "gamePk": game_meta["gamePk"],
            "title": game_meta["title"],
            "eventCode": code,
            "awayName": game_meta["awayName"],
            "homeName": game_meta["homeName"],
            "winner": {"rows": winner_rows},
            "total": {
                "postedLine": game_meta["postedTotal"],
                "selected": choose_nearest(total_rows, game_meta["postedTotal"]),
                "rows": total_rows,
            },
            "firstInning": rfi_rows[0] if rfi_rows else None,
            "first5Winner": {"rows": first5_rows},
            "first5Total": {
                "postedLine": game_meta["first5Total"],
                "selected": choose_nearest(first5_total_rows, game_meta["first5Total"]),
                "rows": first5_total_rows,
            },
            "spread": {
                "selected": spread_rows[0] if spread_rows else None,
                "rows": spread_rows,
            },
        }

    day["mappedGames"] = sum(1 for game in day["byGameId"].values() if any(
        [
            game["winner"]["rows"],
            game["total"]["rows"],
            game["firstInning"],
            game["first5Winner"]["rows"],
            game["first5Total"]["rows"],
            game["spread"]["rows"],
        ]
    ))
    day["unmappedEventCodes"] = sorted(unmapped_codes)
    return out


def write_outputs(payload: dict[str, Any], iso_date: str) -> None:
    OUT_DATA_DIR.mkdir(parents=True, exist_ok=True)
    OUT_WEB_JSON.parent.mkdir(parents=True, exist_ok=True)
    data_path = OUT_DATA_DIR / f"{iso_date}-kalshi-markets.json"
    serialized = json.dumps(payload, indent=2)
    data_path.write_text(serialized + "\n", "utf-8")
    OUT_WEB_JSON.write_text(serialized + "\n", "utf-8")
    print(f"Wrote Kalshi MLB markets -> {data_path}")
    print(f"Wrote web artifact -> {OUT_WEB_JSON}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Fetch live Kalshi MLB markets for the requested date.")
    parser.add_argument("--date", default=date.today().isoformat(), help="ISO date (YYYY-MM-DD)")
    args = parser.parse_args()
    payload = build_output(args.date)
    write_outputs(payload, args.date)


if __name__ == "__main__":
    main()
