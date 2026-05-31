#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import math
import re
import sqlite3
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from typing import Any
from urllib.parse import urlencode
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[3]
DB_PATH = ROOT / "data-private" / "warehouse" / "sports.db"
OUT_JSON = ROOT / "data-private" / "reports" / "kalshi-tennis-intramatch-low-dog-audit.json"
OUT_MD = ROOT / "data-private" / "reports" / "kalshi-tennis-intramatch-low-dog-audit.md"
BASE_URL = "https://external-api.kalshi.com/trade-api/v2"
SERIES = ("KXATPMATCH", "KXWTAMATCH")
DATE_PATTERN = re.compile(r"-26MAY(\d{2})")
TARGET_DATES: set[str] = set()


def date_range(start: str, end: str) -> set[str]:
    start_date = date.fromisoformat(start)
    end_date = date.fromisoformat(end)
    days = set()
    current = start_date
    while current <= end_date:
        days.add(current.isoformat())
        current += timedelta(days=1)
    return days


def api_get(path: str, params: dict[str, Any]) -> dict[str, Any]:
    url = f"{BASE_URL}/{path}?{urlencode(params)}"
    request = Request(url, headers={"User-Agent": "sports-trading-board/1.0"})
    with urlopen(request, timeout=30) as response:
        return json.loads(response.read().decode("utf-8"))


def parse_ts(value: str | None) -> int | None:
    if not value:
        return None
    value = value.replace("Z", "+00:00")
    return int(datetime.fromisoformat(value).timestamp())


def slate_date_from_event_ticker(value: str | None) -> str | None:
    match = DATE_PATTERN.search(value or "")
    if not match:
        return None
    slate_date = f"2026-05-{match.group(1)}"
    if TARGET_DATES and slate_date not in TARGET_DATES:
        return None
    return slate_date


def dollars(value: Any) -> float | None:
    if value is None:
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def candle_price(candle: dict[str, Any], group: str, key: str) -> float | None:
    values = candle.get(group) or {}
    return dollars(values.get(f"{key}_dollars"))


def fetch_settled_match_markets() -> list[dict[str, Any]]:
    markets: list[dict[str, Any]] = []
    for series in SERIES:
        cursor = ""
        while True:
            params = {"series_ticker": series, "status": "settled", "limit": 200}
            if cursor:
                params["cursor"] = cursor
            data = api_get("markets", params)
            batch = data.get("markets") or []
            for market in batch:
                event_ticker = market.get("event_ticker") or ""
                if slate_date_from_event_ticker(event_ticker):
                    markets.append(market)
            cursor = data.get("cursor") or ""
            if not cursor:
                break
    return markets


def fetch_candles(tickers: list[str], start_ts: int, end_ts: int) -> dict[str, list[dict[str, Any]]]:
    if not tickers:
        return {}
    data = api_get(
        "markets/candlesticks",
        {
            "market_tickers": ",".join(tickers),
            "start_ts": start_ts,
            "end_ts": end_ts,
            "period_interval": 1,
            "include_latest_before_start": "true",
        },
    )
    out: dict[str, list[dict[str, Any]]] = {}
    for item in data.get("markets") or []:
        ticker = item.get("market_ticker")
        if ticker:
            out[ticker] = item.get("candlesticks") or []
    return out


def first_ask(candles: list[dict[str, Any]]) -> float | None:
    for candle in candles:
        ask = candle.get("yes_ask") or {}
        value = dollars(ask.get("open_dollars") or ask.get("close_dollars"))
        if value is not None and value > 0:
            return value
        price = candle.get("price") or {}
        value = dollars(price.get("previous_dollars") or price.get("open_dollars") or price.get("close_dollars"))
        if value is not None and value > 0:
            return value
    return None


def max_bid(candles: list[dict[str, Any]]) -> float | None:
    values = []
    for candle in candles:
        bid = candle.get("yes_bid") or {}
        value = dollars(bid.get("high_dollars") or bid.get("close_dollars"))
        if value is not None:
            values.append(value)
    return max(values) if values else None


def max_trade(candles: list[dict[str, Any]]) -> float | None:
    values = []
    for candle in candles:
        price = candle.get("price") or {}
        for key in ("high_dollars", "max_dollars", "close_dollars", "previous_dollars"):
            value = dollars(price.get(key))
            if value is not None:
                values.append(value)
    return max(values) if values else None


def candle_count_with_volume(candles: list[dict[str, Any]]) -> int:
    count = 0
    for candle in candles:
        volume = dollars(candle.get("volume_fp"))
        if volume is not None and volume > 0:
            count += 1
    return count


def init_kalshi_tables(conn: sqlite3.Connection) -> None:
    conn.executescript(
        """
        create table if not exists tennis_kalshi_match_markets (
          market_ticker text primary key,
          event_ticker text not null,
          series_ticker text,
          slate_date text,
          board_match_id text,
          pair_key text,
          title text,
          selection_name text,
          normalized_selection_name text,
          result text,
          expiration_value text,
          status text,
          close_time text,
          last_price_dollars real,
          raw_json text not null,
          updated_at text not null default current_timestamp
        );

        create table if not exists tennis_kalshi_market_candles (
          market_ticker text not null,
          end_period_ts integer not null,
          event_ticker text,
          slate_date text,
          board_match_id text,
          price_open real,
          price_high real,
          price_low real,
          price_close real,
          price_previous real,
          yes_bid_open real,
          yes_bid_high real,
          yes_bid_low real,
          yes_bid_close real,
          yes_ask_open real,
          yes_ask_high real,
          yes_ask_low real,
          yes_ask_close real,
          volume_fp real,
          open_interest_fp real,
          raw_json text not null,
          updated_at text not null default current_timestamp,
          primary key (market_ticker, end_period_ts)
        );

        create table if not exists tennis_kalshi_intramatch_trade_features (
          market_ticker text primary key,
          event_ticker text not null,
          slate_date text,
          board_match_id text,
          pair_key text,
          selection_name text,
          normalized_selection_name text,
          is_lowest_priced_side integer,
          entry_ask real,
          favorite_entry_ask real,
          max_bid real,
          max_trade real,
          volume_minutes integer,
          won integer,
          target_20_hit integer,
          target_30_hit integer,
          target_20_profit real,
          target_30_profit real,
          target_20_fee_adjusted_profit real,
          target_30_fee_adjusted_profit real,
          raw_json text not null,
          updated_at text not null default current_timestamp
        );
        """
    )


def load_result_map() -> dict[tuple[str, str], dict[str, Any]]:
    conn = sqlite3.connect(DB_PATH)
    try:
        dates = sorted(TARGET_DATES) or ["2026-05-25", "2026-05-26", "2026-05-27", "2026-05-28", "2026-05-29"]
        placeholders = ",".join("?" for _ in dates)
        rows = conn.execute(
            f"""
            select slate_date, match_id, title, player1_name, player2_name, winner_name
            from tennis_match_results
            where completed = 1
              and slate_date in ({placeholders})
            """,
            dates,
        ).fetchall()
    finally:
        conn.close()
    result = {}
    for slate_date, match_id, title, p1, p2, winner in rows:
        result[(slate_date, " vs ".join(sorted([normalize(p1), normalize(p2)])))] = {
            "winner": winner,
            "matchId": match_id,
            "title": title,
        }
    return result


def load_board_match_candidates() -> list[dict[str, Any]]:
    conn = sqlite3.connect(DB_PATH)
    try:
        dates = sorted(TARGET_DATES) or ["2026-05-25", "2026-05-26", "2026-05-27", "2026-05-28", "2026-05-29"]
        neighbor_set = set(dates)
        for slate_date in dates:
            neighbor_set.update(neighbor_dates(slate_date))
        scoped_dates = sorted(neighbor_set)
        placeholders = ",".join("?" for _ in scoped_dates)
        rows = conn.execute(
            f"""
            select slate_date, match_id, title, player1_name, player2_name
            from tennis_matches
            where slate_date in ({placeholders})
              and league = 'Tennis'
            """,
            scoped_dates,
        ).fetchall()
    finally:
        conn.close()
    return [
        {
            "slateDate": slate_date,
            "matchId": match_id,
            "title": title,
            "pairKey": " vs ".join(sorted([normalize(player1), normalize(player2)])),
            "lastNamePairKey": last_name_pair_key(player1, player2),
        }
        for slate_date, match_id, title, player1, player2 in rows
    ]


def normalize(value: Any) -> str:
    value = "" if value is None else str(value)
    value = re.sub(r"[^a-z0-9]+", " ", value.lower()).strip()
    return re.sub(r"\s+", " ", value)


def event_pair_key(title: str) -> str:
    title = re.sub(r"^Will\s+", "", title or "", flags=re.I)
    match = re.search(r"win the (.+?):", title, flags=re.I)
    if not match:
        return ""
    names = re.split(r"\s+vs\s+", match.group(1), flags=re.I)
    return " vs ".join(sorted(normalize(name) for name in names if name))


def last_name_pair_key(left: Any, right: Any) -> str:
    names = []
    for value in (left, right):
        parts = normalize(value).split()
        if parts:
            names.append(parts[-1])
    return " vs ".join(sorted(names))


def pair_key_last_names(pair_key: str) -> str:
    names = re.split(r"\s+vs\s+", pair_key or "", flags=re.I)
    return " vs ".join(sorted(name.split()[-1] for name in names if name.split()))


def neighbor_dates(slate_date: str | None) -> set[str]:
    if not slate_date:
        return set()
    try:
        base = datetime.fromisoformat(slate_date).date()
    except ValueError:
        return {slate_date}
    return {
        base.isoformat(),
        datetime.fromordinal(base.toordinal() + 1).date().isoformat(),
        datetime.fromordinal(base.toordinal() - 1).date().isoformat(),
    }


def find_board_match(
    slate_date: str | None,
    pair_key: str,
    candidates: list[dict[str, Any]],
) -> dict[str, Any]:
    dates = neighbor_dates(slate_date)
    pair_key = pair_key or ""
    last_pair = pair_key_last_names(pair_key)
    for candidate in candidates:
        if candidate["slateDate"] in dates and candidate["pairKey"] == pair_key:
            return candidate
    for candidate in candidates:
        if candidate["slateDate"] in dates and candidate["lastNamePairKey"] == last_pair:
            return candidate
    for candidate in candidates:
        if candidate["lastNamePairKey"] == last_pair:
            return candidate
    return {}


def summarize(rows: list[dict[str, Any]], target: float) -> dict[str, Any]:
    if not rows:
        return {"targetCents": int(target * 100), "entries": 0}
    fills = [row for row in rows if (row.get("maxBid") or 0) >= target]
    winners = [row for row in rows if row.get("won")]
    profit = 0.0
    fee_adjusted_profit = 0.0
    for row in rows:
        entry = row["entryAsk"]
        entry_fee = kalshi_taker_fee(entry)
        if (row.get("maxBid") or 0) >= target:
            profit += target - entry
            fee_adjusted_profit += target - entry - entry_fee - kalshi_taker_fee(target)
        elif row.get("won"):
            profit += 1.0 - entry
            fee_adjusted_profit += 1.0 - entry - entry_fee
        else:
            profit -= entry
            fee_adjusted_profit -= entry + entry_fee
    stake = sum(row["entryAsk"] for row in rows)
    fee_adjusted_stake = sum(row["entryAsk"] + kalshi_taker_fee(row["entryAsk"]) for row in rows)
    return {
        "targetCents": int(target * 100),
        "entries": len(rows),
        "limitHits": len(fills),
        "eventualWinners": len(winners),
        "hitRate": round(len(fills) / len(rows), 3),
        "winnerRate": round(len(winners) / len(rows), 3),
        "profitDollarsPerContract": round(profit, 3),
        "roiOnEntryCost": round(profit / stake, 3) if stake else None,
        "feeAdjustedProfitDollarsPerContract": round(fee_adjusted_profit, 3),
        "feeAdjustedRoiOnEntryCost": round(fee_adjusted_profit / fee_adjusted_stake, 3) if fee_adjusted_stake else None,
    }


def kalshi_taker_fee(price: float) -> float:
    # Kalshi's general taker fee is probability weighted and rounded up to the cent.
    raw_fee = 0.07 * price * (1 - price)
    return math.ceil(raw_fee * 100) / 100


def target_profit(row: dict[str, Any], target: float, fee_adjusted: bool) -> float:
    entry = row["entryAsk"]
    if (row.get("maxBid") or 0) >= target:
        value = target - entry
        if fee_adjusted:
            value -= kalshi_taker_fee(entry) + kalshi_taker_fee(target)
        return value
    if row.get("won"):
        value = 1.0 - entry
        if fee_adjusted:
            value -= kalshi_taker_fee(entry)
        return value
    value = -entry
    if fee_adjusted:
        value -= kalshi_taker_fee(entry)
    return value


def upsert_market(conn: sqlite3.Connection, market: dict[str, Any], board_match_id: str | None, pair_key: str) -> None:
    conn.execute(
        """
        insert into tennis_kalshi_match_markets(
          market_ticker, event_ticker, series_ticker, slate_date, board_match_id, pair_key,
          title, selection_name, normalized_selection_name, result, expiration_value,
          status, close_time, last_price_dollars, raw_json
        )
        values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        on conflict(market_ticker) do update set
          event_ticker=excluded.event_ticker,
          series_ticker=excluded.series_ticker,
          slate_date=excluded.slate_date,
          board_match_id=excluded.board_match_id,
          pair_key=excluded.pair_key,
          title=excluded.title,
          selection_name=excluded.selection_name,
          normalized_selection_name=excluded.normalized_selection_name,
          result=excluded.result,
          expiration_value=excluded.expiration_value,
          status=excluded.status,
          close_time=excluded.close_time,
          last_price_dollars=excluded.last_price_dollars,
          raw_json=excluded.raw_json,
          updated_at=current_timestamp
        """,
        (
            market.get("ticker"),
            market.get("event_ticker"),
            (market.get("event_ticker") or "").split("-")[0],
            slate_date_from_event_ticker(market.get("event_ticker")),
            board_match_id,
            pair_key,
            market.get("title"),
            market.get("yes_sub_title"),
            normalize(market.get("yes_sub_title")),
            market.get("result"),
            market.get("expiration_value"),
            market.get("status"),
            market.get("close_time"),
            dollars(market.get("last_price_dollars")),
            json.dumps(market, ensure_ascii=False, sort_keys=True),
        ),
    )


def upsert_candles(
    conn: sqlite3.Connection,
    market: dict[str, Any],
    candles: list[dict[str, Any]],
    board_match_id: str | None,
) -> int:
    count = 0
    slate_date = slate_date_from_event_ticker(market.get("event_ticker"))
    for candle in candles:
        end_period_ts = candle.get("end_period_ts")
        if end_period_ts is None:
            continue
        conn.execute(
            """
            insert into tennis_kalshi_market_candles(
              market_ticker, end_period_ts, event_ticker, slate_date, board_match_id,
              price_open, price_high, price_low, price_close, price_previous,
              yes_bid_open, yes_bid_high, yes_bid_low, yes_bid_close,
              yes_ask_open, yes_ask_high, yes_ask_low, yes_ask_close,
              volume_fp, open_interest_fp, raw_json
            )
            values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            on conflict(market_ticker, end_period_ts) do update set
              event_ticker=excluded.event_ticker,
              slate_date=excluded.slate_date,
              board_match_id=excluded.board_match_id,
              price_open=excluded.price_open,
              price_high=excluded.price_high,
              price_low=excluded.price_low,
              price_close=excluded.price_close,
              price_previous=excluded.price_previous,
              yes_bid_open=excluded.yes_bid_open,
              yes_bid_high=excluded.yes_bid_high,
              yes_bid_low=excluded.yes_bid_low,
              yes_bid_close=excluded.yes_bid_close,
              yes_ask_open=excluded.yes_ask_open,
              yes_ask_high=excluded.yes_ask_high,
              yes_ask_low=excluded.yes_ask_low,
              yes_ask_close=excluded.yes_ask_close,
              volume_fp=excluded.volume_fp,
              open_interest_fp=excluded.open_interest_fp,
              raw_json=excluded.raw_json,
              updated_at=current_timestamp
            """,
            (
                market.get("ticker"),
                int(end_period_ts),
                market.get("event_ticker"),
                slate_date,
                board_match_id,
                candle_price(candle, "price", "open"),
                candle_price(candle, "price", "high"),
                candle_price(candle, "price", "low"),
                candle_price(candle, "price", "close"),
                candle_price(candle, "price", "previous"),
                candle_price(candle, "yes_bid", "open"),
                candle_price(candle, "yes_bid", "high"),
                candle_price(candle, "yes_bid", "low"),
                candle_price(candle, "yes_bid", "close"),
                candle_price(candle, "yes_ask", "open"),
                candle_price(candle, "yes_ask", "high"),
                candle_price(candle, "yes_ask", "low"),
                candle_price(candle, "yes_ask", "close"),
                dollars(candle.get("volume_fp")),
                dollars(candle.get("open_interest_fp")),
                json.dumps(candle, ensure_ascii=False, sort_keys=True),
            ),
        )
        count += 1
    return count


def upsert_trade_feature(conn: sqlite3.Connection, row: dict[str, Any]) -> None:
    raw = json.dumps(row, ensure_ascii=False, sort_keys=True)
    conn.execute(
        """
        insert into tennis_kalshi_intramatch_trade_features(
          market_ticker, event_ticker, slate_date, board_match_id, pair_key,
          selection_name, normalized_selection_name, is_lowest_priced_side,
          entry_ask, favorite_entry_ask, max_bid, max_trade, volume_minutes, won,
          target_20_hit, target_30_hit, target_20_profit, target_30_profit,
          target_20_fee_adjusted_profit, target_30_fee_adjusted_profit, raw_json
        )
        values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        on conflict(market_ticker) do update set
          event_ticker=excluded.event_ticker,
          slate_date=excluded.slate_date,
          board_match_id=excluded.board_match_id,
          pair_key=excluded.pair_key,
          selection_name=excluded.selection_name,
          normalized_selection_name=excluded.normalized_selection_name,
          is_lowest_priced_side=excluded.is_lowest_priced_side,
          entry_ask=excluded.entry_ask,
          favorite_entry_ask=excluded.favorite_entry_ask,
          max_bid=excluded.max_bid,
          max_trade=excluded.max_trade,
          volume_minutes=excluded.volume_minutes,
          won=excluded.won,
          target_20_hit=excluded.target_20_hit,
          target_30_hit=excluded.target_30_hit,
          target_20_profit=excluded.target_20_profit,
          target_30_profit=excluded.target_30_profit,
          target_20_fee_adjusted_profit=excluded.target_20_fee_adjusted_profit,
          target_30_fee_adjusted_profit=excluded.target_30_fee_adjusted_profit,
          raw_json=excluded.raw_json,
          updated_at=current_timestamp
        """,
        (
            row["ticker"],
            row["eventTicker"],
            row.get("slateDate"),
            row.get("boardMatchId"),
            row.get("pairKey"),
            row.get("selection"),
            normalize(row.get("selection")),
            1,
            row.get("entryAsk"),
            row.get("favoriteEntryAsk"),
            row.get("maxBid"),
            row.get("maxTrade"),
            row.get("volumeMinutes"),
            1 if row.get("won") else 0,
            1 if (row.get("maxBid") or 0) >= 0.20 else 0,
            1 if (row.get("maxBid") or 0) >= 0.30 else 0,
            target_profit(row, 0.20, False),
            target_profit(row, 0.30, False),
            target_profit(row, 0.20, True),
            target_profit(row, 0.30, True),
            raw,
        ),
    )


def main() -> None:
    parser = argparse.ArgumentParser(description="Analyze settled Kalshi tennis intramatch dog-contract price action.")
    parser.add_argument("--target-date", help="Single slate date to analyze, YYYY-MM-DD.")
    parser.add_argument("--start-date", help="Start slate date for a settled range, YYYY-MM-DD.")
    parser.add_argument("--end-date", help="End slate date for a settled range, YYYY-MM-DD.")
    args = parser.parse_args()
    global TARGET_DATES
    if args.target_date:
        TARGET_DATES = {args.target_date}
    elif args.start_date and args.end_date:
        TARGET_DATES = date_range(args.start_date, args.end_date)
    else:
        TARGET_DATES = date_range("2026-05-25", "2026-05-29")

    conn = sqlite3.connect(DB_PATH)
    init_kalshi_tables(conn)

    markets = fetch_settled_match_markets()
    by_event: dict[str, list[dict[str, Any]]] = {}
    for market in markets:
        by_event.setdefault(market.get("event_ticker") or "", []).append(market)

    result_map = load_result_map()
    board_candidates = load_board_match_candidates()
    rows: list[dict[str, Any]] = []
    for event_ticker, event_markets in sorted(by_event.items()):
        if len(event_markets) < 2:
            continue
        close_ts_values = [parse_ts(market.get("close_time")) for market in event_markets]
        close_ts = max(ts for ts in close_ts_values if ts)
        start_ts = close_ts - 8 * 60 * 60
        candles = fetch_candles([market["ticker"] for market in event_markets], start_ts, close_ts + 20 * 60)
        slate_date = slate_date_from_event_ticker(event_ticker)
        first_pair_key = event_pair_key(event_markets[0].get("title") or "")
        board_row = find_board_match(slate_date, first_pair_key, board_candidates)
        board_match_id = board_row.get("matchId")
        for market in event_markets:
            upsert_market(conn, market, board_match_id, first_pair_key)
            upsert_candles(conn, market, candles.get(market["ticker"]) or [], board_match_id)
        ranked = []
        for market in event_markets:
            ticker = market["ticker"]
            market_candles = candles.get(ticker) or []
            entry = first_ask(market_candles)
            ranked.append(
                {
                    "ticker": ticker,
                    "eventTicker": event_ticker,
                    "selection": market.get("yes_sub_title"),
                    "title": market.get("title"),
                    "result": market.get("result"),
                    "entryAsk": entry,
                    "maxBid": max_bid(market_candles),
                    "maxTrade": max_trade(market_candles),
                    "volumeMinutes": candle_count_with_volume(market_candles),
                    "closeTime": market.get("close_time"),
                    "pairKey": event_pair_key(market.get("title") or ""),
                    "expirationValue": market.get("expiration_value"),
                    "slateDate": slate_date_from_event_ticker(market.get("event_ticker")),
                    "boardMatchId": board_match_id,
                }
            )
        ranked = [row for row in ranked if row["entryAsk"] is not None]
        if len(ranked) < 2:
            continue
        ranked.sort(key=lambda row: row["entryAsk"])
        dog = ranked[0]
        dog["favoriteEntryAsk"] = ranked[-1]["entryAsk"]
        dog["winnerFromWarehouse"] = (
            result_map.get((dog["slateDate"], dog["pairKey"]), {}).get("winner")
            or result_map.get((board_row.get("slateDate"), board_row.get("pairKey")), {}).get("winner")
        )
        dog["boardMatchId"] = board_match_id
        dog["won"] = dog["result"] == "yes"
        dog["entryCents"] = round(dog["entryAsk"] * 100, 1)
        dog["maxBidCents"] = round((dog.get("maxBid") or 0) * 100, 1)
        dog["maxTradeCents"] = round((dog.get("maxTrade") or 0) * 100, 1)
        upsert_trade_feature(conn, dog)
        rows.append(dog)
        if len(rows) % 25 == 0:
            conn.commit()

    conn.commit()
    conn.close()

    low10 = [row for row in rows if row["entryAsk"] <= 0.10]
    low12 = [row for row in rows if row["entryAsk"] <= 0.12]
    payload = {
        "coverage": {
            "settledMarkets": len(markets),
            "events": len(by_event),
            "dogRows": len(rows),
            "lowDogRowsAtOrBelow10c": len(low10),
            "lowDogRowsAtOrBelow12c": len(low12),
            "warehouseTables": [
                "tennis_kalshi_match_markets",
                "tennis_kalshi_market_candles",
                "tennis_kalshi_intramatch_trade_features",
            ],
            "method": "Entry uses first available yes_ask in an 8-hour window before market close. Limit exit uses max yes_bid, which is more conservative than max traded price.",
            "feeAssumption": "Fee-adjusted rows conservatively use taker fees on both entry and limit exit. Resting limit sells may be cheaper depending on the live fee tier/market.",
        },
        "strategies": {
            "entryAskAtOrBelow10c": [summarize(low10, 0.20), summarize(low10, 0.30)],
            "entryAskAtOrBelow12c": [summarize(low12, 0.20), summarize(low12, 0.30)],
        },
        "rows": rows,
    }
    OUT_JSON.parent.mkdir(parents=True, exist_ok=True)
    OUT_JSON.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    lines = [
        "# Kalshi Tennis Intramatch Low-Dog Audit",
        "",
        "## Coverage",
        "",
        "```json",
        json.dumps(payload["coverage"], indent=2),
        "```",
        "",
        "## Strategy Results",
        "",
        "|entry filter|target|entries|limit hits|eventual winners|limit hit rate|winner rate|profit/contract|ROI on entry cost|fee-adjusted profit/contract|fee-adjusted ROI|",
        "|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|",
    ]
    for label, strategy_rows in payload["strategies"].items():
        for row in strategy_rows:
            lines.append(
                f"|{label}|{row.get('targetCents')}c|{row.get('entries')}|{row.get('limitHits')}|"
                f"{row.get('eventualWinners')}|{row.get('hitRate')}|{row.get('winnerRate')}|"
                f"{row.get('profitDollarsPerContract')}|{row.get('roiOnEntryCost')}|"
                f"{row.get('feeAdjustedProfitDollarsPerContract')}|{row.get('feeAdjustedRoiOnEntryCost')}|"
            )
    lines.extend(
        [
            "",
            "## Low-Dog Rows",
            "",
            "|event|selection|entry|max bid|max trade|won|volume minutes|",
            "|---|---|---:|---:|---:|---|---:|",
        ]
    )
    for row in sorted(low12, key=lambda item: (item["entryAsk"], item["eventTicker"])):
        lines.append(
            f"|{row['eventTicker']}|{row['selection']}|{row['entryCents']}c|{row['maxBidCents']}c|"
            f"{row['maxTradeCents']}c|{row['won']}|{row['volumeMinutes']}|"
        )
    OUT_MD.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(json.dumps(payload["coverage"], indent=2))
    print(f"Wrote {OUT_JSON.relative_to(ROOT)}")
    print(f"Wrote {OUT_MD.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
