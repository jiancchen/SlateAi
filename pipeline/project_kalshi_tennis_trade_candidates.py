#!/usr/bin/env python3
from __future__ import annotations

import json
import math
import re
import sqlite3
from pathlib import Path
from typing import Any
from urllib.parse import urlencode
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
DB_PATH = ROOT / "data-private" / "warehouse" / "sports.db"
OUT_JSON = ROOT / "data-private" / "reports" / "kalshi-tennis-trade-candidates.json"
OUT_MD = ROOT / "data-private" / "reports" / "kalshi-tennis-trade-candidates.md"
WEB_JSON = ROOT / "web" / "src" / "lib" / "kalshi-tennis-trade-candidates.generated.json"
BASE_URL = "https://external-api.kalshi.com/trade-api/v2"
SERIES = ("KXATPMATCH", "KXWTAMATCH")


def normalize(value: Any) -> str:
    value = "" if value is None else str(value)
    value = re.sub(r"[^a-z0-9]+", " ", value.lower()).strip()
    return re.sub(r"\s+", " ", value)


def api_get(path: str, params: dict[str, Any] | None = None) -> dict[str, Any]:
    url = f"{BASE_URL}/{path}"
    if params:
        url += f"?{urlencode(params)}"
    request = Request(url, headers={"User-Agent": "sports-trading-board/1.0"})
    with urlopen(request, timeout=30) as response:
        return json.loads(response.read().decode("utf-8"))


def dollars(value: Any) -> float | None:
    if value is None:
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def fetch_open_match_markets() -> list[dict[str, Any]]:
    markets: list[dict[str, Any]] = []
    for series in SERIES:
        cursor = ""
        while True:
            params = {"series_ticker": series, "status": "open", "limit": 200}
            if cursor:
                params["cursor"] = cursor
            data = api_get("markets", params)
            markets.extend(data.get("markets") or [])
            cursor = data.get("cursor") or ""
            if not cursor:
                break
    return markets


def fetch_orderbook(ticker: str) -> dict[str, Any]:
    return api_get(f"markets/{ticker}/orderbook")


def best_yes_bid(orderbook: dict[str, Any]) -> tuple[float | None, float | None]:
    rows = ((orderbook.get("orderbook_fp") or {}).get("yes_dollars") or [])
    parsed = [(dollars(price), dollars(size)) for price, size in rows]
    parsed = [(price, size) for price, size in parsed if price is not None]
    if not parsed:
        return None, None
    price, size = max(parsed, key=lambda item: item[0])
    return price, size


def best_yes_ask(market: dict[str, Any], orderbook: dict[str, Any]) -> tuple[float | None, float | None]:
    no_rows = ((orderbook.get("orderbook_fp") or {}).get("no_dollars") or [])
    parsed = [(dollars(price), dollars(size)) for price, size in no_rows]
    parsed = [(price, size) for price, size in parsed if price is not None]
    if parsed:
        no_bid, no_size = max(parsed, key=lambda item: item[0])
        return round(1 - no_bid, 4), no_size
    no_bid = dollars(market.get("no_bid_dollars"))
    if no_bid is not None:
        return round(1 - no_bid, 4), None
    last = dollars(market.get("last_price_dollars"))
    return last, None


def exit_liquidity_at_or_above(orderbook: dict[str, Any], target: float) -> float:
    rows = ((orderbook.get("orderbook_fp") or {}).get("yes_dollars") or [])
    total = 0.0
    for price, size in rows:
        parsed_price = dollars(price)
        parsed_size = dollars(size)
        if parsed_price is not None and parsed_size is not None and parsed_price >= target:
            total += parsed_size
    return total


def pair_key_from_title(title: str) -> str:
    match = re.search(r"win the (.+?):", title or "", flags=re.I)
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


def market_date(value: Any) -> str:
    return str(value or "")[:10]


def name_side_matches(market_name: str, board_name: str) -> bool:
    market = normalize(market_name)
    board = normalize(board_name)
    if not market or not board:
        return False
    if market == board or market in board or board in market:
        return True
    market_tokens = market.split()
    board_tokens = set(board.split())
    return len(market_tokens) == 1 and market_tokens[0] in board_tokens


def pair_key_matches_board(pair_key: str, candidate: dict[str, Any]) -> bool:
    names = [name for name in re.split(r"\s+vs\s+", pair_key or "", flags=re.I) if normalize(name)]
    if len(names) != 2:
        return False
    left = candidate.get("player1Name") or ""
    right = candidate.get("player2Name") or ""
    return (
        name_side_matches(names[0], left) and name_side_matches(names[1], right)
    ) or (
        name_side_matches(names[0], right) and name_side_matches(names[1], left)
    )


def load_board_candidates() -> list[dict[str, Any]]:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        rows = conn.execute(
            """
            select slate_date, match_id, title, stage, player1_name, player2_name, desk_confidence, desk_volatility
            from tennis_matches
            where league = 'Tennis'
              and slate_date >= '2026-05-25'
            """
        ).fetchall()
    finally:
        conn.close()
    return [
        {
            "slateDate": row["slate_date"],
            "matchId": row["match_id"],
            "title": row["title"],
            "stage": row["stage"],
            "player1Name": row["player1_name"],
            "player2Name": row["player2_name"],
            "pairKey": " vs ".join(sorted([normalize(row["player1_name"]), normalize(row["player2_name"])])),
            "lastNamePairKey": last_name_pair_key(row["player1_name"], row["player2_name"]),
            "deskConfidence": row["desk_confidence"],
            "deskVolatility": row["desk_volatility"],
        }
        for row in rows
    ]


def find_board_match(pair_key: str, candidates: list[dict[str, Any]], occurrence_datetime: Any = None) -> dict[str, Any]:
    last_pair = pair_key_last_names(pair_key)
    occurrence_date = market_date(occurrence_datetime)
    same_day = [
        candidate for candidate in candidates
        if not occurrence_date or candidate.get("slateDate") == occurrence_date
    ]
    scoped_candidates = same_day or candidates
    for candidate in scoped_candidates:
        if candidate["pairKey"] == pair_key:
            return candidate
    for candidate in scoped_candidates:
        if candidate["lastNamePairKey"] == last_pair:
            return candidate
    for candidate in scoped_candidates:
        if pair_key_matches_board(pair_key, candidate):
            return candidate
    return {}


def load_empirical_buckets() -> dict[str, dict[str, Any]]:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        rows = conn.execute(
            """
            select
              case
                when entry_ask <= .05 then '<=5c'
                when entry_ask <= .08 then '6-8c'
                when entry_ask <= .10 then '9-10c'
                when entry_ask <= .12 then '11-12c'
                when entry_ask <= .15 then '13-15c'
                when entry_ask <= .20 then '16-20c'
                else '20c+'
              end as band,
              count(*) as n,
              avg(target_30_hit) as target_30_rate,
              avg(target_20_hit) as target_20_rate,
              sum(target_30_fee_adjusted_profit) as target_30_fee_profit,
              avg(won) as win_rate
            from tennis_kalshi_intramatch_trade_features
            group by band
            """
        ).fetchall()
    finally:
        conn.close()
    return {row["band"]: dict(row) for row in rows}


def entry_band(entry: float) -> str:
    if entry <= 0.05:
        return "<=5c"
    if entry <= 0.08:
        return "6-8c"
    if entry <= 0.10:
        return "9-10c"
    if entry <= 0.12:
        return "11-12c"
    if entry <= 0.15:
        return "13-15c"
    if entry <= 0.20:
        return "16-20c"
    return "20c+"


def load_player_flow(board_match_id: str | None, selection_name: str | None) -> dict[str, Any]:
    if not board_match_id or not selection_name:
        return {}
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        context = conn.execute(
            """
            select normalized_name, player_name, rank, clay_win_pct, recent_win_pct,
                   resistance_matches, opponent_adjusted_form_score, avg_known_opponent_rank
            from tennis_player_match_context
            where match_id = ?
            """,
            (board_match_id,),
        ).fetchall()
        metrics = conn.execute(
            """
            select normalized_name,
                   avg(case when metric_key = 'first_serve' then score end) first_serve,
                   avg(case when metric_key = 'second_serve' then score end) second_serve,
                   avg(case when metric_key = 'error_control' then score end) error_control,
                   avg(case when metric_key = 'break_pressure' then score end) break_pressure,
                   avg(case when metric_key = 'closeout' then score end) closeout
            from tennis_recent_form_metrics
            where match_id = ?
            group by normalized_name
            """,
            (board_match_id,),
        ).fetchall()
    finally:
        conn.close()
    selection = normalize(selection_name)
    context_map = {row["normalized_name"]: dict(row) for row in context}
    metric_map = {row["normalized_name"]: dict(row) for row in metrics}
    selected_key = None
    for key in context_map:
        if key == selection or key.endswith(" " + selection.split()[-1]) or selection.endswith(" " + key.split()[-1]):
            selected_key = key
            break
    if not selected_key:
        return {}
    opponent_keys = [key for key in context_map if key != selected_key]
    opponent_key = opponent_keys[0] if opponent_keys else None
    player = context_map.get(selected_key, {})
    opponent = context_map.get(opponent_key, {}) if opponent_key else {}
    player_metrics = metric_map.get(selected_key, {})
    opponent_metrics = metric_map.get(opponent_key, {}) if opponent_key else {}
    return {
        "rank": player.get("rank"),
        "opponentRank": opponent.get("rank"),
        "clayWinPct": player.get("clay_win_pct"),
        "recentWinPct": player.get("recent_win_pct"),
        "resistanceMatches": player.get("resistance_matches"),
        "adjForm": player.get("opponent_adjusted_form_score"),
        "opponentAdjForm": opponent.get("opponent_adjusted_form_score"),
        "breakPressure": player_metrics.get("break_pressure"),
        "opponentCloseout": opponent_metrics.get("closeout"),
        "opponentErrorControl": opponent_metrics.get("error_control"),
    }


def projected_exit(entry: float, bucket: dict[str, Any], player_flow: dict[str, Any]) -> dict[str, Any]:
    base_rate = float(bucket.get("target_30_rate") or 0)
    target = 0.30
    reason = []
    if entry <= 0.05:
        target = 0.25
        reason.append("ultra-cheap entry")
    if 0.11 <= entry <= 0.15:
        target = 0.36
        reason.append("historically better 11-15c band")
    if entry > 0.15:
        target = 0.34
        reason.append("higher entry needs stricter flow")
    if (player_flow.get("breakPressure") or 0) >= 62:
        base_rate += 0.08
        target += 0.03
        reason.append("break pressure support")
    if (player_flow.get("opponentCloseout") or 100) < 55:
        base_rate += 0.07
        target += 0.03
        reason.append("opponent closeout risk")
    if (player_flow.get("opponentErrorControl") or 100) < 50:
        base_rate += 0.05
        reason.append("opponent error risk")
    if (player_flow.get("resistanceMatches") or 0) >= 3:
        base_rate += 0.04
        reason.append("recent resistance")
    if entry_band(entry) in {"9-10c", "16-20c"}:
        base_rate -= 0.08
        reason.append("weak historical entry band")
    return {
        "target": min(round(target, 2), 0.55),
        "targetHitProbability": round(max(0.05, min(0.85, base_rate)), 3),
        "reason": reason,
    }


def expected_trade_value(entry: float, target: float, probability: float) -> float:
    entry_fee = kalshi_fee(entry)
    exit_fee = kalshi_fee(target)
    return probability * (target - entry - entry_fee - exit_fee) + (1 - probability) * (-(entry + entry_fee))


def kalshi_fee(price: float) -> float:
    return math.ceil((0.07 * price * (1 - price)) * 100) / 100


def main() -> None:
    markets = fetch_open_match_markets()
    board_candidates = load_board_candidates()
    empirical = load_empirical_buckets()
    grouped: dict[str, list[dict[str, Any]]] = {}
    for market in markets:
        grouped.setdefault(market.get("event_ticker") or "", []).append(market)

    rows: list[dict[str, Any]] = []
    for event_ticker, event_markets in sorted(grouped.items()):
        if len(event_markets) < 2:
            continue
        sides = []
        for market in event_markets:
            orderbook = fetch_orderbook(market["ticker"])
            bid, bid_size = best_yes_bid(orderbook)
            ask, ask_size = best_yes_ask(market, orderbook)
            pair_key = pair_key_from_title(market.get("title") or "")
            board = find_board_match(pair_key, board_candidates, market.get("occurrence_datetime"))
            sides.append(
                {
                    "eventTicker": event_ticker,
                    "marketTicker": market["ticker"],
                    "selection": market.get("yes_sub_title"),
                    "title": market.get("title"),
                    "occurrenceDatetime": market.get("occurrence_datetime"),
                    "pairKey": pair_key,
                    "boardMatchId": board.get("matchId"),
                    "boardTitle": board.get("title"),
                    "stage": board.get("stage"),
                    "yesBid": bid,
                    "yesBidSize": bid_size,
                    "yesAsk": ask,
                    "yesAskSize": ask_size,
                    "exit20Liquidity": exit_liquidity_at_or_above(orderbook, 0.20),
                    "exit30Liquidity": exit_liquidity_at_or_above(orderbook, 0.30),
                    "lastPrice": dollars(market.get("last_price_dollars")),
                    "openInterest": dollars(market.get("open_interest_fp")),
                    "rawMarket": market,
                }
            )
        sides = [side for side in sides if side.get("yesAsk") is not None]
        if len(sides) < 2:
            continue
        sides.sort(key=lambda side: side["yesAsk"])
        dog = sides[0]
        dog["favoriteAsk"] = sides[-1]["yesAsk"]
        band = entry_band(dog["yesAsk"])
        bucket = empirical.get(band, {})
        flow = load_player_flow(dog.get("boardMatchId"), dog.get("selection"))
        projection = projected_exit(dog["yesAsk"], bucket, flow)
        ev = expected_trade_value(dog["yesAsk"], projection["target"], projection["targetHitProbability"])
        row = {
            **{k: dog.get(k) for k in [
                "eventTicker", "marketTicker", "selection", "title", "occurrenceDatetime", "boardMatchId",
                "boardTitle", "stage", "yesBid", "yesBidSize", "yesAsk", "yesAskSize", "favoriteAsk",
                "exit20Liquidity", "exit30Liquidity", "lastPrice", "openInterest",
            ]},
            "entryBand": band,
            "historical30HitRate": bucket.get("target_30_rate"),
            "historicalN": bucket.get("n"),
            "projectedExit": projection["target"],
            "targetHitProbability": projection["targetHitProbability"],
            "tradeEvPerContract": round(ev, 3),
            "tradeEvPctOfEntry": round(ev / dog["yesAsk"], 3) if dog["yesAsk"] else None,
            "candidateTier": "trade" if ev > 0 and dog["yesAsk"] <= 0.18 else "watch" if ev > -0.02 else "pass",
            "projectionReasons": projection["reason"],
            "playerFlow": flow,
        }
        rows.append(row)

    rows.sort(key=lambda row: (row["candidateTier"] != "trade", -(row.get("tradeEvPctOfEntry") or -9)))
    payload = {
        "coverage": {
            "openMarkets": len(markets),
            "events": len(grouped),
            "candidateRows": len(rows),
            "method": "Active Kalshi ATP/WTA match markets. Entry uses inferred YES ask from order book. Projected exit uses RG historical target-hit buckets plus available player flow context.",
        },
        "candidates": rows,
    }
    OUT_JSON.parent.mkdir(parents=True, exist_ok=True)
    OUT_JSON.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    WEB_JSON.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    lines = [
        "# Kalshi Tennis Trade-To-Sell Candidates",
        "",
        "## Coverage",
        "",
        "```json",
        json.dumps(payload["coverage"], indent=2),
        "```",
        "",
        "## Candidate Board",
        "",
        "|tier|selection|entry|projected exit|EV/contract|EV/entry|hist 30c hit|event|reasons|",
        "|---|---|---:|---:|---:|---:|---:|---|---|",
    ]
    for row in rows:
        if row["candidateTier"] == "pass" and row["yesAsk"] > 0.20:
            continue
        lines.append(
            f"|{row['candidateTier']}|{row['selection']}|{row['yesAsk']*100:.0f}c|"
            f"{row['projectedExit']*100:.0f}c|{row['tradeEvPerContract']:.2f}|"
            f"{row['tradeEvPctOfEntry']:.2f}|"
            f"{(row.get('historical30HitRate') or 0):.2f}|"
            f"{row['eventTicker']}|{', '.join(row['projectionReasons'])}|"
        )
    OUT_MD.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(json.dumps(payload["coverage"], indent=2))
    print(f"Wrote {OUT_JSON.relative_to(ROOT)}")
    print(f"Wrote {OUT_MD.relative_to(ROOT)}")
    print(f"Wrote {WEB_JSON.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
