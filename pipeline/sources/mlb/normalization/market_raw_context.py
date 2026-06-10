from __future__ import annotations

import json
import sqlite3
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from .common import MlbIdentityResolver, compact_json, normalize_name, stable_id, to_float, utc_now
from .markets import ensure_markets_schema
from .props import ensure_props_schema, implied_probability


@dataclass(frozen=True)
class MarketParseResult:
    contracts: list[dict[str, Any]]
    ticks: list[dict[str, Any]]
    snapshots: list[dict[str, Any]]
    prop_snapshots: list[dict[str, Any]]
    counts: dict[str, int]


def read_json_file(path: Path) -> dict[str, Any]:
    try:
        parsed = json.loads(path.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, UnicodeDecodeError):
        return {}
    return parsed if isinstance(parsed, dict) else {}


def ensure_market_raw_schema(con: sqlite3.Connection) -> None:
    ensure_markets_schema(con)
    ensure_props_schema(con)


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


DK_TEAM_NICKNAME_TO_ABBREV = {
    "angels": "LAA",
    "astros": "HOU",
    "athletics": "ATH",
    "blue jays": "TOR",
    "braves": "ATL",
    "brewers": "MIL",
    "cardinals": "STL",
    "cubs": "CHC",
    "diamondbacks": "AZ",
    "dodgers": "LAD",
    "giants": "SF",
    "guardians": "CLE",
    "marlins": "MIA",
    "mariners": "SEA",
    "mets": "NYM",
    "nationals": "WSH",
    "orioles": "BAL",
    "padres": "SD",
    "phillies": "PHI",
    "pirates": "PIT",
    "rangers": "TEX",
    "rays": "TB",
    "red sox": "BOS",
    "reds": "CIN",
    "rockies": "COL",
    "royals": "KC",
    "tigers": "DET",
    "twins": "MIN",
    "white sox": "CWS",
    "yankees": "NYY",
}


def _team_id_for_draftkings_name(resolver: MlbIdentityResolver, name: Any) -> str | None:
    direct = resolver.team_id_by_name("draftkings", name)
    if direct:
        return direct
    key = normalize_name(name)
    for nickname, abbrev in sorted(DK_TEAM_NICKNAME_TO_ABBREV.items(), key=lambda item: len(item[0]), reverse=True):
        if key == nickname or key.endswith(f" {nickname}"):
            team_id = _team_id_for_abbrev(resolver, abbrev)
            if team_id:
                resolver.upsert_alias("team", team_id, "draftkings", None, name, 0.97)
                return team_id
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


def _game_for_team_ids(resolver: MlbIdentityResolver, date: str, away_team_id: str | None, home_team_id: str | None) -> dict[str, Any] | None:
    if not away_team_id or not home_team_id:
        return None
    matches = [
        game
        for game in resolver.games_by_id.values()
        if str(game.get("game_date"))[:10] == date
        and game.get("away_team_id") == away_team_id
        and game.get("home_team_id") == home_team_id
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


def _draftkings_all_markets(event: dict[str, Any]) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for category in event.get("categories") or []:
        if isinstance(category, dict):
            rows.extend([row for row in category.get("markets") or [] if isinstance(row, dict)])
    if not rows and isinstance(event.get("markets"), dict):
        rows.extend([row for row in event["markets"].get("rawMarkets") or [] if isinstance(row, dict)])
    seen: set[str] = set()
    unique: list[dict[str, Any]] = []
    for row in rows:
        key = str(row.get("id"))
        if key in seen:
            continue
        seen.add(key)
        unique.append(row)
    return unique


def _draftkings_all_selections(event: dict[str, Any]) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for category in event.get("categories") or []:
        if isinstance(category, dict):
            rows.extend([row for row in category.get("selections") or [] if isinstance(row, dict)])
    if not rows and isinstance(event.get("markets"), dict):
        rows.extend([row for row in event["markets"].get("rawSelections") or [] if isinstance(row, dict)])
    seen: set[str] = set()
    unique: list[dict[str, Any]] = []
    for row in rows:
        key = str(row.get("id"))
        if key in seen:
            continue
        seen.add(key)
        unique.append(row)
    return unique


def _draftkings_selections_for(event: dict[str, Any], market: dict[str, Any]) -> list[dict[str, Any]]:
    market_id = str(market.get("id"))
    return [selection for selection in _draftkings_all_selections(event) if str(selection.get("marketId")) == market_id]


def _draftkings_main_point_selections(event: dict[str, Any], market: dict[str, Any]) -> list[dict[str, Any]]:
    rows = _draftkings_selections_for(event, market)
    tagged = [selection for selection in rows if "MainPointLine" in (selection.get("tags") or [])]
    return tagged or rows


def _draftkings_american_odds(selection: dict[str, Any]) -> int | None:
    raw = ((selection.get("displayOdds") or {}).get("american"))
    if raw is None:
        return None
    text = str(raw).replace("−", "-").replace("–", "-").replace("—", "-")
    text = "".join(ch for ch in text if ch in "+-0123456789")
    try:
        return int(text)
    except ValueError:
        return None


def _implied_probability_from_american(american_odds: int | None) -> float | None:
    if american_odds is None or american_odds == 0:
        return None
    if american_odds < 0:
        return abs(american_odds) / (abs(american_odds) + 100.0)
    return 100.0 / (american_odds + 100.0)


def _draftkings_event_game(resolver: MlbIdentityResolver, event: dict[str, Any], date: str) -> dict[str, Any] | None:
    markets = _draftkings_all_markets(event)
    moneyline = next((market for market in markets if str(market.get("name") or "").lower() == "moneyline"), None)
    away_team_id: str | None = None
    home_team_id: str | None = None
    if moneyline:
        for selection in _draftkings_selections_for(event, moneyline):
            team_id = _team_id_for_draftkings_name(resolver, selection.get("label"))
            role = str(selection.get("outcomeType") or "").lower()
            if role == "away":
                away_team_id = team_id
            elif role == "home":
                home_team_id = team_id
    if not away_team_id or not home_team_id:
        parts = [part.strip() for part in str(event.get("name") or "").split("@")]
        if len(parts) == 2:
            away_team_id = away_team_id or _team_id_for_draftkings_name(resolver, parts[0])
            home_team_id = home_team_id or _team_id_for_draftkings_name(resolver, parts[1])
    return _game_for_team_ids(resolver, date, away_team_id, home_team_id)


def _draftkings_market_type(name: str) -> str | None:
    direct = {
        "Moneyline": "winner",
        "Run Line": "spread",
        "Total": "total",
        "1st 5 Innings": "first5Winner",
        "Run Line - 1st 5 Innings": "first5Spread",
        "Total Runs - 1st 5 Innings": "first5Total",
        "Total Runs - 1st 3 Innings": "first3Total",
        "Total Runs - 1st 7 Innings": "first7Total",
    }.get(name)
    if direct:
        return direct
    market_type = name.split(":", 1)[-1].strip()
    return {
        "Team Total Runs": "teamTotalRuns",
        "Team Total Runs - 1st 3 Innings": "teamTotalRunsFirst3",
        "Team Total Runs - 1st 5 Innings": "teamTotalRunsFirst5",
        "Team Total Runs - 1st 7 Innings": "teamTotalRunsFirst7",
        "Team Total Hits": "teamTotalHits",
        "Team Hits O/U": "teamTotalHits",
        "Hits Allowed O/U": "pitcher_hits_allowed",
        "Earned Runs Allowed O/U": "pitcher_earned_runs_allowed",
        "Win Probability": "pitcher_record_win",
    }.get(market_type)


def _draftkings_market_type_for_market(market: dict[str, Any]) -> str | None:
    market_type_name = str((market.get("marketType") or {}).get("name") or "")
    detected = _draftkings_market_type(str(market.get("name") or ""))
    if detected:
        return detected
    detected = _draftkings_market_type(market_type_name)
    if detected:
        return detected
    market_name = str(market.get("name") or "")
    if market_name.endswith(" Hits Allowed O/U"):
        return "pitcher_hits_allowed"
    if market_name.endswith(" Earned Runs Allowed O/U"):
        return "pitcher_earned_runs_allowed"
    if market_name.startswith("Will ") and market_name.endswith(" Record a Win?"):
        return "pitcher_record_win"
    return None


def _draftkings_is_pitcher_strikeout_prop(market: dict[str, Any]) -> bool:
    market_name = str(market.get("name") or "")
    market_type_name = str((market.get("marketType") or {}).get("name") or "")
    return bool(
        "PlayerProps" in (market.get("tags") or [])
        and (
            market_type_name.lower() == "strikeouts thrown o/u"
            or market_name.lower().endswith(" strikeouts thrown o/u")
        )
    )


def _draftkings_market_selections(event: dict[str, Any], market: dict[str, Any], market_type: str) -> list[dict[str, Any]]:
    if market_type in {"spread", "total", "first5Spread", "first5Total", "first3Total", "first7Total", "teamTotalRuns", "teamTotalRunsFirst3", "teamTotalRunsFirst5", "teamTotalRunsFirst7", "teamTotalHits", "pitcher_hits_allowed", "pitcher_earned_runs_allowed"}:
        return _draftkings_main_point_selections(event, market)
    return _draftkings_selections_for(event, market)


def _draftkings_selection_player(selection: dict[str, Any]) -> dict[str, Any]:
    for participant in selection.get("participants") or []:
        if isinstance(participant, dict) and str(participant.get("type") or "").lower() == "player":
            return participant
    return {}


def _draftkings_role_from_player(player: dict[str, Any]) -> str | None:
    venue_role = str(player.get("venueRole") or "").lower()
    if venue_role.startswith("home"):
        return "home"
    if venue_role.startswith("away"):
        return "away"
    return None


def _draftkings_market_team_id(resolver: MlbIdentityResolver, game_id: str | None, market: dict[str, Any], selection: dict[str, Any]) -> str | None:
    for participant in selection.get("participants") or []:
        if not isinstance(participant, dict) or str(participant.get("type") or "").lower() != "team":
            continue
        role = str(participant.get("venueRole") or "").lower()
        if role in {"away", "awayteam"}:
            return resolver.team_id_for_game_role(game_id, "Away")
        if role in {"home", "hometeam"}:
            return resolver.team_id_for_game_role(game_id, "Home")
        team_id = _team_id_for_draftkings_name(resolver, participant.get("name"))
        if team_id:
            return team_id
    market_name = str(market.get("name") or "")
    if ":" in market_name:
        return _team_id_for_draftkings_name(resolver, market_name.split(":", 1)[0])
    return None


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
    return MarketParseResult(contracts, ticks, snapshots, [], counts)


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
    return MarketParseResult(contracts, ticks, snapshots, [], counts)


def parse_draftkings_payload(
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
    prop_snapshots: list[dict[str, Any]] = []
    counts = {
        "source_games": 0,
        "source_rows": 0,
        "source_prop_rows": 0,
        "parsed_contracts": 0,
        "parsed_ticks": 0,
        "parsed_snapshots": 0,
        "parsed_prop_snapshots": 0,
        "unmapped_games": 0,
        "unmapped_prop_players": 0,
    }
    captured_at = payload.get("capturedAt") or utc_now()
    for event in payload.get("events") or []:
        if not isinstance(event, dict) or str(event.get("startEventDate") or "")[:10] != date:
            continue
        counts["source_games"] += 1
        game = _draftkings_event_game(resolver, event, date)
        game_id = None if game is None else str(game["game_id"])
        if not game_id:
            counts["unmapped_games"] += 1

        for market in _draftkings_all_markets(event):
            market_name = str(market.get("name") or "")
            market_type = _draftkings_market_type_for_market(market)
            if _draftkings_is_pitcher_strikeout_prop(market) or market_type in {"pitcher_hits_allowed", "pitcher_earned_runs_allowed", "pitcher_record_win"}:
                for selection in _draftkings_main_point_selections(event, market):
                    odds_american = _draftkings_american_odds(selection)
                    line_value = to_float(selection.get("points"))
                    if odds_american is None:
                        continue
                    if market_type != "pitcher_record_win" and line_value is None:
                        continue
                    player = _draftkings_selection_player(selection)
                    player_name = (
                        player.get("name")
                        or str(market_name)
                        .replace(" Strikeouts Thrown O/U", "")
                        .replace(" Hits Allowed O/U", "")
                        .replace(" Earned Runs Allowed O/U", "")
                        .replace("Will ", "")
                        .replace(" Record a Win?", "")
                    )
                    player_id = resolver.player_id_by_name("draftkings", player_name)
                    if not player_id:
                        counts["unmapped_prop_players"] += 1
                    role = _draftkings_role_from_player(player)
                    team_id = resolver.team_id_for_game_role(game_id, role)
                    opponent_team_id = resolver.opponent_team_id_for_game_role(game_id, role)
                    selection_name = str(selection.get("outcomeType") or selection.get("label") or "").title()
                    prop_market_type = market_type if market_type in {"pitcher_hits_allowed", "pitcher_earned_runs_allowed", "pitcher_record_win"} else "pitcher_strikeouts"
                    if prop_market_type == "pitcher_record_win":
                        if selection_name not in {"Yes", "No"}:
                            continue
                    elif selection_name not in {"Over", "Under"}:
                        continue
                    counts["source_prop_rows"] += 1
                    source_pk = f"{local_path}:{event.get('eventId')}:{market.get('id')}:{selection.get('id')}"
                    detail = {
                        "source_payload": {
                            "event": {
                                "eventId": event.get("eventId"),
                                "name": event.get("name"),
                                "status": event.get("status"),
                                "startEventDate": event.get("startEventDate"),
                                "href": event.get("href"),
                            },
                            "market": market,
                            "selection": selection,
                        },
                        "source_snapshot_id": source_snapshot_id,
                        "local_path": local_path,
                    }
                    prop_snapshots.append(
                        {
                            "prop_market_snapshot_id": stable_id("prop-market", "draftkings-raw", event.get("eventId"), market.get("id"), selection.get("id"), captured_at, source_snapshot_id),
                            "game_id": game_id,
                            "player_id": player_id,
                            "player_name": player_name,
                            "team_id": team_id,
                            "opponent_team_id": opponent_team_id,
                            "source_name": "draftkings",
                            "sportsbook": "DraftKings Sportsbook",
                            "market_type": prop_market_type,
                            "market_key": prop_market_type,
                            "selection": selection_name,
                            "line_value": line_value,
                            "american_odds": odds_american,
                            "implied_probability": implied_probability(odds_american),
                            "market_date": date,
                            "commence_time": event.get("startEventDate"),
                            "captured_at": captured_at,
                            "outcome_description": market_name,
                            "source_event_id": str(event.get("eventId") or ""),
                            "source_path": local_path,
                            "source_table": "raw_draftkings_mlb_pitcher_props",
                            "source_pk": source_pk,
                            "source_detail_json": compact_json(detail),
                            "created_at": utc_now(),
                        }
                    )
            if market_type in {"pitcher_hits_allowed", "pitcher_earned_runs_allowed", "pitcher_record_win"}:
                continue
            if not market_type:
                continue
            for selection in _draftkings_market_selections(event, market, market_type):
                odds_american = _draftkings_american_odds(selection)
                if odds_american is None:
                    continue
                counts["source_rows"] += 1
                role = str(selection.get("outcomeType") or "")
                team_id = None
                if market_type in {"winner", "spread", "first5Winner", "first5Spread"}:
                    team_id = resolver.team_id_for_game_role(game_id, role) or _team_id_for_draftkings_name(resolver, selection.get("label"))
                elif market_type in {"teamTotalRuns", "teamTotalRunsFirst3", "teamTotalRunsFirst5", "teamTotalRunsFirst7", "teamTotalHits"}:
                    team_id = _draftkings_market_team_id(resolver, game_id, market, selection)
                team_abbrev = resolver.teams_by_id.get(team_id, {}).get("abbreviation") if team_id else None
                selection_name = str(selection.get("label") or role or selection.get("id"))
                selection_code = team_abbrev or role or selection_name
                line_value = to_float(selection.get("points"))
                contract_id = stable_id("market-contract", "draftkings-raw", event.get("eventId"), market.get("id"), selection.get("id"))
                market_id = str(market.get("id") or contract_id)
                source_pk = f"{local_path}:{event.get('eventId')}:{market.get('id')}:{selection.get('id')}"
                detail = {
                    "source_payload": {
                        "event": {
                            "eventId": event.get("eventId"),
                            "name": event.get("name"),
                            "status": event.get("status"),
                            "startEventDate": event.get("startEventDate"),
                            "href": event.get("href"),
                        },
                        "market": market,
                        "selection": selection,
                    },
                    "source_snapshot_id": source_snapshot_id,
                    "local_path": local_path,
                }
                contracts.append(
                    {
                        "contract_id": contract_id,
                        "market_id": market_id,
                        "source_name": "draftkings",
                        "contract_ticker": str(selection.get("id") or contract_id),
                        "event_ticker": str(event.get("eventId") or ""),
                        "series_ticker": str(payload.get("leagueId") or "84240"),
                        "game_id": game_id,
                        "team_id": team_id,
                        "player_id": None,
                        "market_type": market_type,
                        "market_family": market_type,
                        "selection_type": "team" if team_id else "line",
                        "selection_code": selection_code,
                        "selection_name": selection_name,
                        "line_value": line_value,
                        "title": market_name,
                        "settlement_status": event.get("status"),
                        "source_table": "raw_draftkings_mlb_markets",
                        "source_pk": source_pk,
                        "source_detail_json": compact_json(detail),
                        "created_at": utc_now(),
                    }
                )
                ticks.append(
                    {
                        "market_price_tick_id": stable_id("market-tick", "draftkings-raw", event.get("eventId"), market.get("id"), selection.get("id"), captured_at, source_snapshot_id),
                        "contract_id": contract_id,
                        "market_id": market_id,
                        "source_name": "draftkings",
                        "game_id": game_id,
                        "market_type": market_type,
                        "captured_at": captured_at,
                        "bid_cents": None,
                        "ask_cents": None,
                        "last_price_cents": None,
                        "no_bid_cents": None,
                        "no_ask_cents": None,
                        "volume": None,
                        "open_interest": None,
                        "source_table": "raw_draftkings_mlb_markets",
                        "source_pk": source_pk,
                        "source_detail_json": compact_json(detail),
                        "created_at": utc_now(),
                    }
                )
                snapshots.append(
                    {
                        "market_snapshot_id": stable_id("market-snapshot", "draftkings-raw", event.get("eventId"), market.get("id"), selection.get("id"), captured_at, source_snapshot_id),
                        "game_id": game_id,
                        "player_id": None,
                        "source_name": "draftkings",
                        "market_type": market_type,
                        "selection": selection_name,
                        "line_value": line_value,
                        "odds_american": odds_american,
                        "price_cents": None,
                        "implied_probability": _implied_probability_from_american(odds_american),
                        "captured_at": captured_at,
                        "raw_source_snapshot_id": source_snapshot_id,
                    }
                )
    counts["parsed_contracts"] = len(contracts)
    counts["parsed_ticks"] = len(ticks)
    counts["parsed_snapshots"] = len(snapshots)
    counts["parsed_prop_snapshots"] = len(prop_snapshots)
    return MarketParseResult(contracts, ticks, snapshots, prop_snapshots, counts)
