from __future__ import annotations

import json
import sqlite3
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from .common import MlbIdentityResolver, compact_json, stable_id, to_float, utc_now
from .markets import ensure_markets_schema


@dataclass(frozen=True)
class MarketParseResult:
    contracts: list[dict[str, Any]]
    ticks: list[dict[str, Any]]
    snapshots: list[dict[str, Any]]
    counts: dict[str, int]


def read_json_file(path: Path) -> dict[str, Any]:
    try:
        parsed = json.loads(path.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, UnicodeDecodeError):
        return {}
    return parsed if isinstance(parsed, dict) else {}


def ensure_market_raw_schema(con: sqlite3.Connection) -> None:
    ensure_markets_schema(con)


def _team_id_for_abbrev(resolver: MlbIdentityResolver, code: Any) -> str | None:
    text = str(code or "").upper().strip()
    if not text:
        return None
    # Market venues sometimes use broadcast/common symbols that differ from MLB's stored abbreviation.
    text = {"ARI": "AZ"}.get(text, text)
    team = resolver.teams_by_abbrev.get(text)
    if team:
        resolver.upsert_alias("team", team["team_id"], "mlb_market_raw", text, text, 0.98)
        return str(team["team_id"])
    return None


def _game_for_codes(resolver: MlbIdentityResolver, date: str, codes: list[Any]) -> dict[str, Any] | None:
    team_ids = {_team_id_for_abbrev(resolver, code) for code in codes}
    team_ids.discard(None)
    if len(team_ids) != 2:
        return None
    matches = [
        game
        for game in resolver.games_by_id.values()
        if str(game.get("game_date"))[:10] == date
        and {game.get("home_team_id"), game.get("away_team_id")} == team_ids
    ]
    return matches[0] if len(matches) == 1 else None


def _row_list(market_payload: Any) -> list[dict[str, Any]]:
    if not isinstance(market_payload, dict):
        return []
    if isinstance(market_payload.get("rows"), list):
        return [row for row in market_payload["rows"] if isinstance(row, dict)]
    if market_payload.get("ticker"):
        return [market_payload]
    selected = market_payload.get("selected")
    return [selected] if isinstance(selected, dict) else []


def _market_rows(game_payload: dict[str, Any]) -> list[tuple[str, dict[str, Any], dict[str, Any]]]:
    rows: list[tuple[str, dict[str, Any], dict[str, Any]]] = []
    for family in ["winner", "total", "firstInning", "first5Winner", "first5Total", "spread"]:
        market_payload = game_payload.get(family)
        parent = market_payload if isinstance(market_payload, dict) else {}
        for row in _row_list(market_payload):
            rows.append((family, parent, row))
    return rows


def parse_kalshi_payload(
    payload: dict[str, Any],
    resolver: MlbIdentityResolver,
    *,
    date: str,
    source_snapshot_id: str,
    local_path: str,
) -> MarketParseResult:
    date_payload = (payload.get("dates") or {}).get(date) or {}
    by_game = date_payload.get("byGameId") or {}
    contracts: list[dict[str, Any]] = []
    ticks: list[dict[str, Any]] = []
    snapshots: list[dict[str, Any]] = []
    counts = {
        "source_games": 0,
        "source_rows": 0,
        "parsed_contracts": 0,
        "parsed_ticks": 0,
        "parsed_snapshots": 0,
        "unmapped_games": 0,
    }
    captured_at = payload.get("fetchedAt") or utc_now()
    for source_game_id, game_payload in by_game.items():
        if not isinstance(game_payload, dict):
            continue
        counts["source_games"] += 1
        game_id = resolver.game_id_for_pk(game_payload.get("gamePk"))
        if not game_id:
            counts["unmapped_games"] += 1
        for family, parent, row in _market_rows(game_payload):
            counts["source_rows"] += 1
            ticker = row.get("ticker") or stable_id("kalshi-row", source_game_id, family, row)
            event_ticker = row.get("eventTicker") or row.get("event_ticker")
            contract_id = stable_id("market-contract", "kalshi-raw", ticker)
            source_pk = f"{local_path}:{ticker}"
            selection_code = row.get("selectionCode") or row.get("selection_code") or row.get("side") or row.get("label") or ticker
            line_value = to_float(row.get("line"))
            team_id = _team_id_for_abbrev(resolver, row.get("selectionCode") or row.get("selection_code"))
            if not team_id and row.get("side"):
                team_id = resolver.team_id_for_game_role(game_id, row.get("side"))
            detail = {
                "source_payload": row,
                "source_game_id": source_game_id,
                "source_snapshot_id": source_snapshot_id,
                "posted_line": parent.get("postedLine"),
                "selected_ticker": (parent.get("selected") or {}).get("ticker") if isinstance(parent.get("selected"), dict) else None,
                "local_path": local_path,
            }
            contracts.append(
                {
                    "contract_id": contract_id,
                    "market_id": event_ticker or ticker,
                    "source_name": "kalshi",
                    "contract_ticker": ticker,
                    "event_ticker": event_ticker,
                    "series_ticker": row.get("seriesTicker") or row.get("series_ticker"),
                    "game_id": game_id,
                    "team_id": team_id,
                    "player_id": None,
                    "market_type": family,
                    "market_family": family,
                    "selection_type": "team" if team_id else "line",
                    "selection_code": selection_code,
                    "selection_name": row.get("label") or row.get("selectionCode") or row.get("title") or selection_code,
                    "line_value": line_value,
                    "title": row.get("title"),
                    "settlement_status": row.get("status"),
                    "source_table": "raw_kalshi_mlb_markets",
                    "source_pk": source_pk,
                    "source_detail_json": compact_json(detail),
                    "created_at": utc_now(),
                }
            )
            ticks.append(
                {
                    "market_price_tick_id": stable_id("market-tick", "kalshi-raw", ticker, captured_at, source_snapshot_id),
                    "contract_id": contract_id,
                    "market_id": event_ticker or ticker,
                    "source_name": "kalshi",
                    "game_id": game_id,
                    "market_type": family,
                    "captured_at": captured_at,
                    "bid_cents": to_float(row.get("yesBidCents") or row.get("yes_bid_cents")),
                    "ask_cents": to_float(row.get("yesAskCents") or row.get("yes_ask_cents")),
                    "last_price_cents": to_float(row.get("lastPriceCents") or row.get("last_price_cents")),
                    "no_bid_cents": to_float(row.get("noBidCents") or row.get("no_bid_cents")),
                    "no_ask_cents": to_float(row.get("noAskCents") or row.get("no_ask_cents")),
                    "volume": to_float(row.get("volume")),
                    "open_interest": to_float(row.get("openInterest") or row.get("open_interest")),
                    "source_table": "raw_kalshi_mlb_markets",
                    "source_pk": source_pk,
                    "source_detail_json": compact_json(detail),
                    "created_at": utc_now(),
                }
            )
            snapshots.append(
                {
                    "market_snapshot_id": stable_id("market-snapshot", "kalshi-raw", ticker, captured_at, source_snapshot_id),
                    "game_id": game_id,
                    "player_id": None,
                    "source_name": "kalshi",
                    "market_type": family,
                    "selection": str(selection_code),
                    "line_value": line_value,
                    "odds_american": None,
                    "price_cents": to_float(row.get("yesAskCents") or row.get("lastPriceCents")),
                    "implied_probability": None,
                    "captured_at": captured_at,
                    "raw_source_snapshot_id": source_snapshot_id,
                }
            )
    counts["parsed_contracts"] = len(contracts)
    counts["parsed_ticks"] = len(ticks)
    counts["parsed_snapshots"] = len(snapshots)
    return MarketParseResult(contracts, ticks, snapshots, counts)


def parse_robinhood_payload(
    payload: dict[str, Any],
    resolver: MlbIdentityResolver,
    *,
    date: str,
    source_snapshot_id: str,
    local_path: str,
) -> MarketParseResult:
    contracts: list[dict[str, Any]] = []
    ticks: list[dict[str, Any]] = []
    snapshots: list[dict[str, Any]] = []
    counts = {
        "source_games": 0,
        "source_rows": 0,
        "parsed_contracts": 0,
        "parsed_ticks": 0,
        "parsed_snapshots": 0,
        "unmapped_games": 0,
    }
    captured_at = payload.get("fetchedAt") or utc_now()
    for event in payload.get("events") or []:
        if not isinstance(event, dict) or str(event.get("date") or "")[:10] != date:
            continue
        codes = event.get("codes") if isinstance(event.get("codes"), list) else list((event.get("prices") or {}).keys())
        game = _game_for_codes(resolver, date, codes)
        game_id = None if game is None else str(game["game_id"])
        counts["source_games"] += 1
        if not game_id:
            counts["unmapped_games"] += 1
        for code, price in (event.get("prices") or {}).items():
            counts["source_rows"] += 1
            team_id = _team_id_for_abbrev(resolver, code)
            href = event.get("href") or local_path
            contract_id = stable_id("market-contract", "robinhood-raw", href, code)
            source_pk = f"{local_path}:{href}:{code}"
            detail = {
                "source_payload": event,
                "source_snapshot_id": source_snapshot_id,
                "local_path": local_path,
            }
            contracts.append(
                {
                    "contract_id": contract_id,
                    "market_id": href,
                    "source_name": "robinhood",
                    "contract_ticker": f"{href}#{code}",
                    "event_ticker": href,
                    "series_ticker": None,
                    "game_id": game_id,
                    "team_id": team_id,
                    "player_id": None,
                    "market_type": "winner",
                    "market_family": "winner",
                    "selection_type": "team",
                    "selection_code": code,
                    "selection_name": code,
                    "line_value": None,
                    "title": href,
                    "settlement_status": event.get("status"),
                    "source_table": "raw_robinhood_mlb_markets",
                    "source_pk": source_pk,
                    "source_detail_json": compact_json(detail),
                    "created_at": utc_now(),
                }
            )
            ticks.append(
                {
                    "market_price_tick_id": stable_id("market-tick", "robinhood-raw", href, code, captured_at, source_snapshot_id),
                    "contract_id": contract_id,
                    "market_id": href,
                    "source_name": "robinhood",
                    "game_id": game_id,
                    "market_type": "winner",
                    "captured_at": captured_at,
                    "bid_cents": None,
                    "ask_cents": to_float(price),
                    "last_price_cents": to_float(price),
                    "no_bid_cents": None,
                    "no_ask_cents": None,
                    "volume": None,
                    "open_interest": None,
                    "source_table": "raw_robinhood_mlb_markets",
                    "source_pk": source_pk,
                    "source_detail_json": compact_json(detail),
                    "created_at": utc_now(),
                }
            )
            snapshots.append(
                {
                    "market_snapshot_id": stable_id("market-snapshot", "robinhood-raw", href, code, captured_at, source_snapshot_id),
                    "game_id": game_id,
                    "player_id": None,
                    "source_name": "robinhood",
                    "market_type": "winner",
                    "selection": str(code),
                    "line_value": None,
                    "odds_american": None,
                    "price_cents": to_float(price),
                    "implied_probability": None,
                    "captured_at": captured_at,
                    "raw_source_snapshot_id": source_snapshot_id,
                }
            )
    counts["parsed_contracts"] = len(contracts)
    counts["parsed_ticks"] = len(ticks)
    counts["parsed_snapshots"] = len(snapshots)
    return MarketParseResult(contracts, ticks, snapshots, counts)
