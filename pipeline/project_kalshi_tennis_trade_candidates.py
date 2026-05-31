#!/usr/bin/env python3
from __future__ import annotations

import json
import math
import re
import sqlite3
from datetime import datetime, timezone
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
            select player_slot, normalized_name, player_name, rank, clay_win_pct, recent_win_pct,
                   resistance_matches, opponent_adjusted_form_score, avg_known_opponent_rank
            from tennis_player_match_context
            where match_id = ?
            """,
            (board_match_id,),
        ).fetchall()
        metrics = conn.execute(
            """
            select normalized_name,
                   avg(case when metric_key = 'hold' then score end) hold,
                   avg(case when metric_key = 'secondServe' then score end) second_serve,
                   avg(case when metric_key = 'errorControl' then score end) error_control,
                   avg(case when metric_key = 'returnPressure' then score end) return_pressure,
                   avg(case when metric_key = 'closeout' then score end) closeout
            from tennis_recent_form_metrics
            where match_id = ?
            group by normalized_name
            """,
            (board_match_id,),
        ).fetchall()
        training = conn.execute(
            """
            select *
            from tennis_model_training_rows
            where match_id = ?
            limit 1
            """,
            (board_match_id,),
        ).fetchone()
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
    selected_slot = int(player.get("player_slot") or 0)
    selected_prefix = "p1" if selected_slot == 1 else "p2" if selected_slot == 2 else ""
    opponent_prefix = "p2" if selected_prefix == "p1" else "p1" if selected_prefix == "p2" else ""

    def training_value(prefix: str, key: str) -> Any:
        if not training or not prefix:
            return None
        return training[f"{prefix}_{key}"] if f"{prefix}_{key}" in training.keys() else None

    return_pressure = player_metrics.get("return_pressure")
    opponent_rg_breaks_lost = training_value(opponent_prefix, "rg_flow_breaks_lost_rate")
    selected_rg_games = training_value(selected_prefix, "rg_flow_games")
    selected_rg_long_games = training_value(selected_prefix, "rg_flow_long_game_rate")
    opponent_rg_long_games = training_value(opponent_prefix, "rg_flow_long_game_rate")
    return {
        "playerName": player.get("player_name"),
        "opponentName": opponent.get("player_name"),
        "rank": player.get("rank"),
        "opponentRank": opponent.get("rank"),
        "clayWinPct": player.get("clay_win_pct"),
        "opponentClayWinPct": opponent.get("clay_win_pct"),
        "recentWinPct": player.get("recent_win_pct"),
        "opponentRecentWinPct": opponent.get("recent_win_pct"),
        "resistanceMatches": player.get("resistance_matches"),
        "adjForm": player.get("opponent_adjusted_form_score"),
        "opponentAdjForm": opponent.get("opponent_adjusted_form_score"),
        "hold": player_metrics.get("hold"),
        "secondServe": player_metrics.get("second_serve"),
        "errorControl": player_metrics.get("error_control"),
        "returnPressure": return_pressure,
        "opponentHold": opponent_metrics.get("hold"),
        "opponentCloseout": opponent_metrics.get("closeout"),
        "opponentErrorControl": opponent_metrics.get("error_control"),
        "selectedRgFlowGames": selected_rg_games,
        "opponentRgBreaksLostRate": opponent_rg_breaks_lost,
        "selectedRgLongGameRate": selected_rg_long_games,
        "opponentRgLongGameRate": opponent_rg_long_games,
        "returnPressureEdge": (
            return_pressure - opponent_metrics.get("return_pressure")
            if return_pressure is not None and opponent_metrics.get("return_pressure") is not None
            else None
        ),
        "clayEdge": (
            player.get("clay_win_pct") - opponent.get("clay_win_pct")
            if player.get("clay_win_pct") is not None and opponent.get("clay_win_pct") is not None
            else None
        ),
        "adjFormEdge": (
            player.get("opponent_adjusted_form_score") - opponent.get("opponent_adjusted_form_score")
            if player.get("opponent_adjusted_form_score") is not None and opponent.get("opponent_adjusted_form_score") is not None
            else None
        ),
    }


def init_open_snapshot_tables(conn: sqlite3.Connection) -> None:
    conn.executescript(
        """
        create table if not exists tennis_prediction_market_snapshots (
          slate_date text not null,
          match_id text not null,
          source_name text not null,
          captured_at text,
          total_volume integer,
          player_name text not null,
          normalized_name text not null,
          probability_pct real,
          traded_amount integer,
          price_band text,
          gross_profit_pct real,
          gross_payout_multiple real,
          cents_at_risk real,
          cents_profit_if_win real,
          raw_json text not null,
          updated_at text not null default current_timestamp,
          primary key (slate_date, match_id, source_name, normalized_name)
        );

        create table if not exists tennis_kalshi_open_orderbook_snapshots (
          market_ticker text not null,
          captured_at text not null,
          event_ticker text,
          slate_date text,
          board_match_id text,
          pair_key text,
          title text,
          selection_name text,
          occurrence_datetime text,
          yes_bid real,
          yes_bid_size real,
          yes_ask real,
          yes_ask_size real,
          favorite_ask real,
          exit20_liquidity real,
          exit30_liquidity real,
          last_price real,
          open_interest real,
          candidate_tier text,
          projected_exit real,
          target_hit_probability real,
          trade_ev_per_contract real,
          raw_json text not null,
          primary key (market_ticker, captured_at)
        );

        create index if not exists idx_tennis_kalshi_open_snapshots_slate
          on tennis_kalshi_open_orderbook_snapshots(slate_date, board_match_id);
        """
    )


def persist_open_snapshots(side_rows: list[dict[str, Any]], candidate_rows: list[dict[str, Any]]) -> None:
    captured_at = datetime.now(timezone.utc).isoformat()
    candidate_by_market = {row.get("marketTicker"): row for row in candidate_rows}
    with sqlite3.connect(DB_PATH) as conn:
        init_open_snapshot_tables(conn)
        for side in side_rows:
            candidate = candidate_by_market.get(side.get("marketTicker")) or {}
            slate_date = market_date(side.get("occurrenceDatetime")) or side.get("slateDate")
            raw_payload = {
                "side": side,
                "candidate": candidate,
                "capturedAt": captured_at,
                "source": "Kalshi open market orderbook",
            }
            conn.execute(
                """
                insert or replace into tennis_kalshi_match_markets(
                  market_ticker, event_ticker, series_ticker, slate_date, board_match_id,
                  pair_key, title, selection_name, normalized_selection_name, result,
                  expiration_value, status, close_time, last_price_dollars, raw_json
                ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    side.get("marketTicker"),
                    side.get("eventTicker"),
                    str(side.get("eventTicker") or "").split("-")[0],
                    slate_date,
                    side.get("boardMatchId"),
                    side.get("pairKey"),
                    side.get("title"),
                    side.get("selection"),
                    normalize(side.get("selection")),
                    None,
                    None,
                    "open",
                    side.get("occurrenceDatetime"),
                    side.get("lastPrice"),
                    json.dumps(raw_payload, ensure_ascii=False),
                ),
            )
            conn.execute(
                """
                insert or replace into tennis_kalshi_open_orderbook_snapshots(
                  market_ticker, captured_at, event_ticker, slate_date, board_match_id,
                  pair_key, title, selection_name, occurrence_datetime, yes_bid,
                  yes_bid_size, yes_ask, yes_ask_size, favorite_ask, exit20_liquidity,
                  exit30_liquidity, last_price, open_interest, candidate_tier,
                  projected_exit, target_hit_probability, trade_ev_per_contract, raw_json
                ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    side.get("marketTicker"),
                    captured_at,
                    side.get("eventTicker"),
                    slate_date,
                    side.get("boardMatchId"),
                    side.get("pairKey"),
                    side.get("title"),
                    side.get("selection"),
                    side.get("occurrenceDatetime"),
                    side.get("yesBid"),
                    side.get("yesBidSize"),
                    side.get("yesAsk"),
                    side.get("yesAskSize"),
                    candidate.get("favoriteAsk"),
                    side.get("exit20Liquidity"),
                    side.get("exit30Liquidity"),
                    side.get("lastPrice"),
                    side.get("openInterest"),
                    candidate.get("candidateTier"),
                    candidate.get("projectedExit"),
                    candidate.get("targetHitProbability"),
                    candidate.get("tradeEvPerContract"),
                    json.dumps(raw_payload, ensure_ascii=False),
                ),
            )
            entry = side.get("yesAsk")
            if side.get("boardMatchId") and side.get("selection") and entry is not None:
                risk_cents = round(float(entry) * 100, 2)
                profit_cents = round((1 - float(entry)) * 100, 2)
                gross_multiple = round(1 / float(entry), 3) if entry else None
                gross_profit_pct = round(((1 - float(entry)) / float(entry)) * 100, 1) if entry else None
                conn.execute(
                    """
                    insert into tennis_prediction_market_snapshots(
                      slate_date, match_id, source_name, captured_at, total_volume,
                      player_name, normalized_name, probability_pct, traded_amount,
                      price_band, gross_profit_pct, gross_payout_multiple,
                      cents_at_risk, cents_profit_if_win, raw_json
                    )
                    values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    on conflict(slate_date, match_id, source_name, normalized_name) do update set
                      captured_at=excluded.captured_at,
                      total_volume=excluded.total_volume,
                      player_name=excluded.player_name,
                      probability_pct=excluded.probability_pct,
                      traded_amount=excluded.traded_amount,
                      price_band=excluded.price_band,
                      gross_profit_pct=excluded.gross_profit_pct,
                      gross_payout_multiple=excluded.gross_payout_multiple,
                      cents_at_risk=excluded.cents_at_risk,
                      cents_profit_if_win=excluded.cents_profit_if_win,
                      raw_json=excluded.raw_json,
                      updated_at=current_timestamp
                    """,
                    (
                        slate_date,
                        side.get("boardMatchId"),
                        "Kalshi open orderbook",
                        captured_at,
                        int(side.get("openInterest") or 0),
                        side.get("selection"),
                        normalize(side.get("selection")),
                        round(float(entry) * 100, 2),
                        int(side.get("yesAskSize") or 0),
                        entry_band(float(entry)),
                        gross_profit_pct,
                        gross_multiple,
                        risk_cents,
                        profit_cents,
                        json.dumps(raw_payload, ensure_ascii=False),
                    ),
                )
        conn.commit()


def load_kalshi_price_history(board_match_id: str | None, player_flow: dict[str, Any], entry: float) -> dict[str, Any]:
    if not board_match_id:
        return {"sameFavorite": [], "similarEntry": {}}
    opponent_name = player_flow.get("opponentName")
    opponent_normalized = normalize(opponent_name)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        same_favorite_rows = conn.execute(
            """
            select k.slate_date, k.board_match_id, k.selection_name, k.entry_ask, k.max_bid, k.max_trade,
                   k.target_20_hit, k.target_30_hit, m.title, m.actual_winner_name, m.result_scoreline
            from tennis_kalshi_intramatch_trade_features k
            join tennis_model_training_rows m on m.match_id = k.board_match_id
            where k.board_match_id != ?
              and k.slate_date < (select slate_date from tennis_model_training_rows where match_id = ? limit 1)
              and (m.player1_normalized_name = ? or m.player2_normalized_name = ?)
              and k.normalized_selection_name != ?
            order by k.slate_date desc
            limit 6
            """,
            (board_match_id, board_match_id, opponent_normalized, opponent_normalized, opponent_normalized),
        ).fetchall()
        similar_entry = conn.execute(
            """
            select count(*) as n,
                   avg(case when max_bid >= entry_ask * 2 then 1.0 else 0.0 end) as hit_2x,
                   avg(case when max_bid >= entry_ask * 2.5 then 1.0 else 0.0 end) as hit_25x,
                   avg(max_bid) as avg_max_bid,
                   avg(entry_ask) as avg_entry
            from tennis_kalshi_intramatch_trade_features
            where board_match_id != ?
              and entry_ask between ? and ?
              and favorite_entry_ask >= 0.85
            """,
            (board_match_id, max(0.01, entry - 0.04), min(0.50, entry + 0.04)),
        ).fetchone()
    finally:
        conn.close()
    same_favorite = [dict(row) for row in same_favorite_rows]
    return {
        "sameFavorite": [
            {
                "date": row.get("slate_date"),
                "matchId": row.get("board_match_id"),
                "match": row.get("title"),
                "selection": row.get("selection_name"),
                "entry": row.get("entry_ask"),
                "maxBid": row.get("max_bid"),
                "maxTrade": row.get("max_trade"),
                "hit2x": bool(row.get("target_20_hit")),
                "hit30c": bool(row.get("target_30_hit")),
                "winner": row.get("actual_winner_name"),
                "scoreline": row.get("result_scoreline"),
            }
            for row in same_favorite
        ],
        "similarEntry": dict(similar_entry) if similar_entry else {},
    }


def projected_exit(entry: float, bucket: dict[str, Any], player_flow: dict[str, Any], price_history: dict[str, Any] | None = None) -> dict[str, Any]:
    base_rate = float(bucket.get("target_30_rate") or 0)
    target_multiple = 2.5
    target = min(round(entry * target_multiple, 2), 0.55)
    reason = []
    if entry <= 0.05:
        target_multiple = 3.0
        target = min(round(entry * target_multiple, 2), 0.25)
        reason.append("ultra-cheap entry")
    elif 0.11 <= entry <= 0.15:
        target_multiple = 2.5
        target = min(round(entry * target_multiple, 2), 0.38)
        reason.append("historically better 11-15c band")
    elif entry > 0.15:
        target_multiple = 2.0
        target = min(round(entry * target_multiple, 2), 0.45)
        reason.append("higher entry needs stricter flow")
    if (player_flow.get("returnPressure") or 0) >= 62:
        base_rate += 0.08
        reason.append("return-pressure support")
    if (player_flow.get("returnPressureEdge") or 0) >= 5:
        base_rate += 0.07
        reason.append("underdog return-pressure edge")
    if (player_flow.get("opponentCloseout") or 100) < 55:
        base_rate += 0.07
        reason.append("opponent closeout risk")
    if (player_flow.get("opponentErrorControl") or 100) < 55:
        base_rate += 0.09
        reason.append("opponent error risk")
    if (player_flow.get("opponentHold") or 100) < 60:
        base_rate += 0.04
        reason.append("favorite hold risk")
    if (player_flow.get("selectedRgFlowGames") or 0) >= 5:
        base_rate += 0.05
        reason.append("prior RG replay flow")
    if (player_flow.get("opponentRgBreaksLostRate") or 0) >= 0.25:
        base_rate += 0.06
        reason.append("favorite break-leak profile")
    if (player_flow.get("selectedRgLongGameRate") or 0) >= 0.25 or (player_flow.get("opponentRgLongGameRate") or 0) >= 0.25:
        base_rate += 0.03
        reason.append("long-game pressure environment")
    if (player_flow.get("clayEdge") or 0) > 0.12:
        base_rate += 0.05
        reason.append("clay-form edge")
    if (player_flow.get("adjFormEdge") or 0) > 8:
        base_rate += 0.04
        reason.append("opponent-adjusted form edge")
    if (player_flow.get("resistanceMatches") or 0) >= 3:
        base_rate += 0.04
        reason.append("recent resistance")
    if entry_band(entry) in {"9-10c", "16-20c"}:
        base_rate -= 0.08
        reason.append("weak historical entry band")
    vetoes = stabilization_vetoes(entry, player_flow, price_history or {})
    if vetoes:
        target_multiple = min(target_multiple, 2.0)
        target = min(round(entry * target_multiple, 2), target)
        base_rate -= 0.18
        reason.extend(vetoes)
    return {
        "target": min(round(target, 2), 0.55),
        "targetMultiple": round(target_multiple, 2),
        "targetHitProbability": round(max(0.05, min(0.85, base_rate)), 3),
        "reason": reason,
        "vetoes": vetoes,
    }


def expected_trade_value(entry: float, target: float, probability: float) -> float:
    entry_fee = kalshi_fee(entry)
    exit_fee = kalshi_fee(target)
    return probability * (target - entry - entry_fee - exit_fee) + (1 - probability) * (-(entry + entry_fee))


def kalshi_fee(price: float) -> float:
    return math.ceil((0.07 * price * (1 - price)) * 100) / 100


def stabilization_vetoes(entry: float, player_flow: dict[str, Any], price_history: dict[str, Any] | None = None) -> list[str]:
    """Hard-check that a cheap underdog can survive long enough to be tradable.

    The Golubic/Korpatsch miss pattern was not "underdog lost"; it was "the
    underdog never stabilized, so there was no spike window." This veto keeps a
    low entry price from outweighing a top-form favorite plus weak hold/error
    profile.
    """
    vetoes: list[str] = []
    opponent_rank = player_flow.get("opponentRank")
    opponent_clay = player_flow.get("opponentClayWinPct")
    opponent_recent = player_flow.get("opponentRecentWinPct")
    adj_edge = player_flow.get("adjFormEdge")
    return_edge = player_flow.get("returnPressureEdge")
    hold = player_flow.get("hold")
    error_control = player_flow.get("errorControl")
    second_serve = player_flow.get("secondServe")
    favorite_is_hot = (
        opponent_rank is not None
        and opponent_rank <= 20
        and (opponent_clay or 0) >= 0.78
        and (opponent_recent or 0) >= 0.75
    )
    cannot_stabilize = (
        (hold is not None and hold < 65)
        or (error_control is not None and error_control < 55)
        or (second_serve is not None and second_serve < 50)
    )
    no_pressure_edge = return_edge is not None and return_edge <= 0
    severe_form_gap = adj_edge is not None and adj_edge <= -18
    if entry <= 0.12 and favorite_is_hot and cannot_stabilize and (no_pressure_edge or severe_form_gap):
        vetoes.append("stabilization veto: top-form favorite can bury this before a spike")
    if entry <= 0.12 and severe_form_gap and no_pressure_edge and (hold or 100) < 65:
        vetoes.append("stabilization veto: weak hold plus no return-pressure edge")
    same_favorite = (price_history or {}).get("sameFavorite") or []
    if same_favorite:
        hit_2x_rate = sum(1 for row in same_favorite if row.get("hit2x")) / len(same_favorite)
        if favorite_is_hot and cannot_stabilize and hit_2x_rate < 0.5:
            vetoes.append("price-history veto: prior underdogs vs this favorite usually failed to double")
    return vetoes


def main() -> None:
    markets = fetch_open_match_markets()
    board_candidates = load_board_candidates()
    empirical = load_empirical_buckets()
    grouped: dict[str, list[dict[str, Any]]] = {}
    for market in markets:
        grouped.setdefault(market.get("event_ticker") or "", []).append(market)

    rows: list[dict[str, Any]] = []
    all_side_rows: list[dict[str, Any]] = []
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
        all_side_rows.extend(sides)
        sides.sort(key=lambda side: side["yesAsk"])
        dog = sides[0]
        dog["favoriteAsk"] = sides[-1]["yesAsk"]
        band = entry_band(dog["yesAsk"])
        bucket = empirical.get(band, {})
        flow = load_player_flow(dog.get("boardMatchId"), dog.get("selection"))
        price_history = load_kalshi_price_history(dog.get("boardMatchId"), flow, dog["yesAsk"])
        projection = projected_exit(dog["yesAsk"], bucket, flow, price_history)
        ev = expected_trade_value(dog["yesAsk"], projection["target"], projection["targetHitProbability"])
        vetoes = projection.get("vetoes") or []
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
            "targetMultiple": projection["targetMultiple"],
            "targetHitProbability": projection["targetHitProbability"],
            "tradeEvPerContract": round(ev, 3),
            "tradeEvPctOfEntry": round(ev / dog["yesAsk"], 3) if dog["yesAsk"] else None,
            "candidateTier": "pass" if vetoes else "trade" if ev > 0 and dog["yesAsk"] <= 0.18 else "watch" if ev > -0.02 else "pass",
            "projectionReasons": projection["reason"],
            "stabilizationVetoes": vetoes,
            "kalshiPriceHistory": price_history,
            "playerFlow": flow,
        }
        rows.append(row)

    rows.sort(key=lambda row: (row["candidateTier"] != "trade", -(row.get("tradeEvPctOfEntry") or -9)))
    persist_open_snapshots(all_side_rows, rows)
    payload = {
        "coverage": {
            "openMarkets": len(markets),
            "events": len(grouped),
            "candidateRows": len(rows),
            "warehouseOpenSideRows": len(all_side_rows),
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
