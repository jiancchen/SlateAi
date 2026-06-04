from __future__ import annotations

import sqlite3
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any

from .common import (
    TennisIdentityResolver,
    compact_json,
    fetch_legacy_rows,
    normalize_name,
    parse_legacy_json,
    stable_id,
    to_float,
    utc_now,
)


MARKET_SOURCE_TABLES = [
    "tennis_kalshi_market_candles",
    "tennis_kalshi_match_markets",
    "tennis_kalshi_open_orderbook_snapshots",
    "tennis_prediction_market_snapshots",
]


def ensure_market_schema(con: sqlite3.Connection) -> None:
    con.executescript(
        """
        create table if not exists market_contracts (
          contract_id text primary key,
          match_id text,
          player_id text,
          source_name text not null,
          market_type text not null,
          selection text not null,
          contract_ticker text,
          event_ticker text,
          opened_at text,
          closed_at text,
          settled_at text,
          status text,
          result text,
          raw_json text,
          created_at text
        );

        create table if not exists market_price_ticks (
          tick_id text primary key,
          contract_id text not null,
          match_id text,
          player_id text,
          source_name text not null,
          captured_at text not null,
          bid_cents real,
          ask_cents real,
          last_cents real,
          open_cents real,
          high_cents real,
          low_cents real,
          close_cents real,
          volume real,
          open_interest real,
          raw_source_snapshot_id text
        );

        create index if not exists idx_tennis_market_contracts_match
          on market_contracts(match_id, player_id, source_name);
        create index if not exists idx_tennis_market_contracts_ticker
          on market_contracts(source_name, contract_ticker);
        create index if not exists idx_tennis_market_price_ticks_contract
          on market_price_ticks(contract_id, captured_at);
        create index if not exists idx_tennis_market_price_ticks_match
          on market_price_ticks(match_id, captured_at);
        """
    )


@dataclass(frozen=True)
class ParsedContract:
    source_table: str
    legacy_row_id: str
    contract_id: str
    match_id: str | None
    player_id: str | None
    source_name: str
    market_type: str
    selection: str
    contract_ticker: str | None
    event_ticker: str | None
    opened_at: str | None
    closed_at: str | None
    status: str | None
    result: str | None
    raw_json: str | None


@dataclass(frozen=True)
class ParsedTick:
    source_table: str
    legacy_row_id: str
    tick_id: str
    contract_id: str
    match_id: str | None
    player_id: str | None
    source_name: str
    captured_at: str
    bid_cents: float | None
    ask_cents: float | None
    last_cents: float | None
    open_cents: float | None
    high_cents: float | None
    low_cents: float | None
    close_cents: float | None
    volume: float | None
    open_interest: float | None
    source_snapshot_id: str | None = None


@dataclass(frozen=True)
class ParsedMarketSnapshot:
    source_table: str
    legacy_row_id: str
    snapshot_id: str
    match_id: str | None
    player_id: str | None
    source_name: str
    market_type: str
    selection: str
    line_value: float | None
    odds_american: float | None
    price_cents: float | None
    implied_probability: float | None
    captured_at: str
    source_snapshot_id: str | None = None


def dollars_to_cents(value: Any) -> float | None:
    number = to_float(value)
    if number is None:
        return None
    if number <= 1.0001:
        return round(number * 100.0, 4)
    return number


def ts_to_iso(value: Any) -> str | None:
    if value is None:
        return None
    if isinstance(value, (int, float)):
        return datetime.fromtimestamp(float(value), tz=timezone.utc).isoformat()
    text = str(value).strip()
    if not text:
        return None
    return text


def american_to_implied(value: Any) -> float | None:
    odds = to_float(value)
    if odds is None or odds == 0:
        return None
    if odds > 0:
        return 100.0 / (odds + 100.0)
    return abs(odds) / (abs(odds) + 100.0)


def match_id_for_names(resolver: TennisIdentityResolver, date: str | None, player_names: list[str]) -> str | None:
    keys = {normalize_name(name) for name in player_names if normalize_name(name)}
    if len(keys) < 2:
        return None
    candidates: list[str] = []
    for match_id, match in resolver.matches.items():
        if date and match.get("match_date") != date:
            continue
        rows = resolver.match_players.get(match_id, [])
        names = set()
        for row in rows:
            for key in ["market_name", "name", "canonical_name"]:
                normalized = normalize_name(row.get(key))
                if normalized:
                    names.add(normalized)
        if all(any(resolver._names_likely_match(player_key, name) for name in names) for player_key in keys):
            candidates.append(match_id)
    return candidates[0] if len(candidates) == 1 else None


def slug_token(value: Any) -> str:
    return normalize_name(value).replace(" ", "-") or "unknown"


def robinhood_tour(category: str | None, tournament: str | None) -> str:
    text = f"{category or ''} {tournament or ''}".lower()
    if "wta" in text or "women" in text:
        return "WTA"
    return "ATP"


def robinhood_level(category: str | None) -> str:
    text = str(category or "")
    if text.startswith("french_open"):
        return "Grand Slam"
    if "challenger" in text:
        return "Challenger"
    if "wta_125" in text:
        return "WTA 125K"
    return "Prediction market"


def refresh_resolver_player(resolver: TennisIdentityResolver, player: dict[str, Any]) -> None:
    resolver.players[player["player_id"]] = player
    for name in [player.get("name"), player.get("canonical_name"), player.get("source_player_id")]:
        key = normalize_name(name)
        if key:
            bucket = resolver.players_by_name.setdefault(key, [])
            if not any(existing.get("player_id") == player.get("player_id") for existing in bucket):
                bucket.append(player)


def refresh_resolver_match_player(resolver: TennisIdentityResolver, row: dict[str, Any]) -> None:
    bucket = resolver.match_players.setdefault(row["match_id"], [])
    if not any(existing.get("player_id") == row.get("player_id") for existing in bucket):
        bucket.append(row)


def upsert_robinhood_supplement_match(
    resolver: TennisIdentityResolver,
    match_payload: dict[str, Any],
    *,
    date: str | None,
    source_snapshot_id: str | None,
) -> str | None:
    match_id = match_payload.get("id")
    players = [player for player in match_payload.get("players") or [] if player.get("name")]
    if not match_id or len(players) != 2:
        return None
    if match_id in resolver.matches:
        return str(match_id)

    tournament_name = match_payload.get("tournament") or "Robinhood Tennis"
    category = match_payload.get("category")
    tour = robinhood_tour(category, tournament_name)
    surface = match_payload.get("surface") or None
    tournament_id = f"rh-tournament-{slug_token(tournament_name)}-{date or 'undated'}"
    con = resolver.con
    con.execute(
        """
        insert into tournaments (tournament_id, name, tour, season, location, surface, level)
        values (?, ?, ?, ?, ?, ?, ?)
        on conflict(tournament_id) do update set
          name = excluded.name,
          tour = excluded.tour,
          surface = coalesce(excluded.surface, tournaments.surface),
          level = excluded.level
        """,
        (
            tournament_id,
            tournament_name,
            tour,
            int(str(date or "0")[:4]) if date else None,
            None,
            surface,
            robinhood_level(category),
        ),
    )
    best_of = 5 if category == "french_open_men_singles" else 3
    con.execute(
        """
        insert into matches (
          match_id, tournament_id, match_date, start_time_utc, round, tour,
          surface, best_of, status, source_event_id, source_snapshot_id
        ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        on conflict(match_id) do update set
          tournament_id = excluded.tournament_id,
          match_date = excluded.match_date,
          start_time_utc = coalesce(excluded.start_time_utc, matches.start_time_utc),
          round = coalesce(excluded.round, matches.round),
          tour = coalesce(excluded.tour, matches.tour),
          surface = coalesce(excluded.surface, matches.surface),
          best_of = coalesce(excluded.best_of, matches.best_of),
          status = coalesce(excluded.status, matches.status),
          source_event_id = coalesce(excluded.source_event_id, matches.source_event_id),
          source_snapshot_id = coalesce(excluded.source_snapshot_id, matches.source_snapshot_id)
        """,
        (
            match_id,
            tournament_id,
            date,
            ts_to_iso(match_payload.get("startIso")),
            match_payload.get("round"),
            tour,
            surface,
            best_of,
            "scheduled",
            match_payload.get("eventId"),
            source_snapshot_id,
        ),
    )
    resolver.matches[str(match_id)] = {
        "match_id": str(match_id),
        "tournament_id": tournament_id,
        "match_date": date,
        "start_time_utc": ts_to_iso(match_payload.get("startIso")),
        "round": match_payload.get("round"),
        "tour": tour,
        "surface": surface,
        "best_of": best_of,
        "status": "scheduled",
        "source_event_id": match_payload.get("eventId"),
        "source_snapshot_id": source_snapshot_id,
    }
    resolver.upsert_alias("match", str(match_id), "robinhood", match_payload.get("eventId"), match_payload.get("title") or match_id, 0.9)

    for index, player_payload in enumerate(players, start=1):
        name = player_payload.get("name")
        player_id = resolver.player_id_by_name("robinhood", name) or f"tennis-player-{slug_token(name)}"
        player = {
            "player_id": player_id,
            "source_player_id": player_payload.get("symbol"),
            "name": name,
            "canonical_name": name,
            "tour": tour,
            "country": None,
            "birth_date": None,
            "handedness": None,
            "active": 1,
        }
        con.execute(
            """
            insert into players (
              player_id, source_player_id, name, canonical_name, tour, country,
              birth_date, handedness, active
            ) values (?, ?, ?, ?, ?, null, null, null, 1)
            on conflict(player_id) do update set
              source_player_id = coalesce(players.source_player_id, excluded.source_player_id),
              name = excluded.name,
              canonical_name = excluded.canonical_name,
              tour = coalesce(players.tour, excluded.tour),
              active = 1
            """,
            (player_id, player_payload.get("symbol"), name, name, tour),
        )
        con.execute(
            """
            insert into match_players (match_id, player_id, side, seed, pre_match_rank, market_name)
            values (?, ?, ?, null, null, ?)
            on conflict(match_id, player_id) do update set
              side = excluded.side,
              market_name = excluded.market_name
            """,
            (match_id, player_id, index, name),
        )
        refresh_resolver_player(resolver, player)
        refresh_resolver_match_player(
            resolver,
            {
                "match_id": str(match_id),
                "player_id": player_id,
                "side": index,
                "market_name": name,
                "name": name,
                "canonical_name": name,
            },
        )
        resolver.upsert_alias("player", player_id, "robinhood", player_payload.get("symbol"), name, 0.9)
    return str(match_id)


def source_name_for_table(table: str, payload: dict[str, Any]) -> str:
    if "kalshi" in table:
        return "kalshi"
    if "prediction_market" in table:
        return payload.get("source_name") or "prediction_market"
    return table


def selection_from_payload(payload: dict[str, Any]) -> str | None:
    return (
        payload.get("selection_name")
        or payload.get("player_name")
        or payload.get("expiration_value")
        or payload.get("normalized_selection_name")
    )


def contract_id_for(source_name: str, payload: dict[str, Any], match_id: str | None, player_id: str | None, selection: str | None) -> str:
    ticker = payload.get("market_ticker") or payload.get("marketTicker")
    if ticker:
        return stable_id("market-contract", source_name, ticker)
    return stable_id("market-contract", source_name, match_id, player_id, normalize_name(selection), payload.get("source_name"))


def map_match_and_player(
    payload: dict[str, Any],
    source_name: str,
    resolver: TennisIdentityResolver,
) -> tuple[str | None, str | None]:
    match_id = resolver.match_id_from_payload(payload)
    selection = selection_from_payload(payload)
    player_id = resolver.player_id_for_match(match_id, source_name, selection) if match_id and selection else None
    if match_id and selection and not player_id:
        resolver.insert_unresolved(
            "tennis_market_player",
            source_name,
            payload.get("market_ticker") or payload.get("match_id") or match_id,
            selection,
            {"payload": payload, "match_id": match_id},
            "Could not confidently map market selection to canonical match player.",
        )
    return match_id, player_id


def parse_market_row(
    row: sqlite3.Row,
    payload: dict[str, Any],
    resolver: TennisIdentityResolver,
) -> tuple[ParsedContract | None, ParsedTick | None, ParsedMarketSnapshot | None]:
    source_table = row["source_table"]
    source_name = source_name_for_table(source_table, payload)
    match_id, player_id = map_match_and_player(payload, source_name, resolver)
    selection = selection_from_payload(payload)
    if not match_id:
        resolver.insert_unresolved(
            "tennis_market_match",
            source_name,
            payload.get("market_ticker") or payload.get("event_ticker") or payload.get("match_id"),
            selection or payload.get("title") or "unknown",
            {"legacy_row_id": row["legacy_row_id"], "source_table": source_table, "payload": payload},
            "Could not confidently map market row to canonical match.",
        )
    if not selection:
        selection = "Unknown selection"
    contract_ticker = payload.get("market_ticker")
    event_ticker = payload.get("event_ticker")
    contract_id = contract_id_for(source_name, payload, match_id, player_id, selection)
    raw_json = payload.get("raw_json")
    contract = ParsedContract(
        source_table=source_table,
        legacy_row_id=row["legacy_row_id"],
        contract_id=contract_id,
        match_id=match_id,
        player_id=player_id,
        source_name=source_name,
        market_type="moneyline_binary",
        selection=str(selection),
        contract_ticker=contract_ticker,
        event_ticker=event_ticker,
        opened_at=ts_to_iso(payload.get("open_time") or payload.get("occurrence_datetime")),
        closed_at=ts_to_iso(payload.get("close_time")),
        status=None if payload.get("status") is None else str(payload.get("status")),
        result=None if payload.get("result") is None else str(payload.get("result")),
        raw_json=raw_json if isinstance(raw_json, str) else None,
    )
    captured_at = (
        ts_to_iso(payload.get("end_period_ts"))
        or ts_to_iso(payload.get("captured_at"))
        or ts_to_iso(payload.get("updated_at"))
        or utc_now()
    )
    tick = None
    snapshot = None
    if source_table == "tennis_kalshi_market_candles":
        tick = ParsedTick(
            source_table=source_table,
            legacy_row_id=row["legacy_row_id"],
            tick_id=stable_id("market-tick", contract_id, captured_at, row["legacy_row_id"]),
            contract_id=contract_id,
            match_id=match_id,
            player_id=player_id,
            source_name=source_name,
            captured_at=captured_at,
            bid_cents=dollars_to_cents(payload.get("yes_bid_close")),
            ask_cents=dollars_to_cents(payload.get("yes_ask_close")),
            last_cents=dollars_to_cents(payload.get("price_close")),
            open_cents=dollars_to_cents(payload.get("price_open")),
            high_cents=dollars_to_cents(payload.get("price_high")),
            low_cents=dollars_to_cents(payload.get("price_low")),
            close_cents=dollars_to_cents(payload.get("price_close")),
            volume=to_float(payload.get("volume_fp")),
            open_interest=to_float(payload.get("open_interest_fp")),
        )
    elif source_table == "tennis_kalshi_open_orderbook_snapshots":
        tick = ParsedTick(
            source_table=source_table,
            legacy_row_id=row["legacy_row_id"],
            tick_id=stable_id("market-tick", contract_id, captured_at, row["legacy_row_id"]),
            contract_id=contract_id,
            match_id=match_id,
            player_id=player_id,
            source_name=source_name,
            captured_at=captured_at,
            bid_cents=dollars_to_cents(payload.get("yes_bid")),
            ask_cents=dollars_to_cents(payload.get("yes_ask")),
            last_cents=dollars_to_cents(payload.get("last_price")),
            open_cents=None,
            high_cents=None,
            low_cents=None,
            close_cents=None,
            volume=None,
            open_interest=to_float(payload.get("open_interest")),
        )
    price = (
        dollars_to_cents(payload.get("last_price_dollars"))
        or dollars_to_cents(payload.get("last_price"))
        or dollars_to_cents(payload.get("yes_ask"))
        or to_float(payload.get("probability_pct"))
    )
    if source_table in {"tennis_kalshi_match_markets", "tennis_kalshi_open_orderbook_snapshots", "tennis_prediction_market_snapshots"}:
        snapshot = ParsedMarketSnapshot(
            source_table=source_table,
            legacy_row_id=row["legacy_row_id"],
            snapshot_id=stable_id("market-snapshot", source_table, row["legacy_row_id"], match_id, player_id, selection),
            match_id=match_id,
            player_id=player_id,
            source_name=source_name,
            market_type="moneyline_binary",
            selection=str(selection),
            line_value=None,
            odds_american=None,
            price_cents=price,
            implied_probability=price / 100.0 if price is not None else None,
            captured_at=captured_at,
        )
    return contract, tick, snapshot


def parse_robinhood_supplement_payload(
    payload: dict[str, Any],
    resolver: TennisIdentityResolver,
    *,
    source_snapshot_id: str | None = None,
    local_path: str | None = None,
) -> tuple[list[ParsedContract], list[ParsedTick], list[ParsedMarketSnapshot], dict[str, int]]:
    source_name = "robinhood"
    source_table = "tennis_robinhood_supplement"
    captured_at = ts_to_iso(payload.get("capturedAt")) or utc_now()
    date = payload.get("date")
    contracts: dict[str, ParsedContract] = {}
    ticks: list[ParsedTick] = []
    snapshots: list[ParsedMarketSnapshot] = []
    counts = {"source_rows": 0, "parsed_contracts": 0, "parsed_ticks": 0, "parsed_snapshots": 0, "unparsed_rows": 0}

    for match_payload in payload.get("matches") or []:
        match_id = match_payload.get("id")
        if match_id not in resolver.matches:
            names = [player.get("name") for player in match_payload.get("players") or [] if player.get("name")]
            match_id = match_id_for_names(resolver, date, names)
        if not match_id:
            match_id = upsert_robinhood_supplement_match(
                resolver,
                match_payload,
                date=date,
                source_snapshot_id=source_snapshot_id,
            )
        if not match_id:
            resolver.insert_unresolved(
                "tennis_market_match",
                source_name,
                match_payload.get("eventId") or match_payload.get("id") or local_path,
                match_payload.get("title") or "unknown",
                {"local_path": local_path, "payload": match_payload},
                "Could not confidently map Robinhood supplement match to canonical match.",
            )
            counts["unparsed_rows"] += 1
            continue
        for player_payload in match_payload.get("players") or []:
            counts["source_rows"] += 1
            selection = player_payload.get("name") or player_payload.get("shortName") or "Unknown selection"
            player_id = resolver.player_id_for_match(match_id, source_name, selection)
            if not player_id:
                resolver.insert_unresolved(
                    "tennis_market_player",
                    source_name,
                    player_payload.get("symbol") or match_payload.get("eventId") or match_id,
                    selection,
                    {"local_path": local_path, "match_id": match_id, "payload": player_payload},
                    "Could not confidently map Robinhood supplement player to canonical match player.",
                )
            contract_ticker = player_payload.get("symbol")
            contract_id = stable_id("market-contract", source_name, contract_ticker or match_id, player_id, normalize_name(selection))
            legacy_row_id = stable_id("tennis", source_table, source_snapshot_id, match_id, contract_ticker, normalize_name(selection), length=64)
            contract = ParsedContract(
                source_table=source_table,
                legacy_row_id=legacy_row_id,
                contract_id=contract_id,
                match_id=match_id,
                player_id=player_id,
                source_name=source_name,
                market_type="moneyline_binary",
                selection=str(selection),
                contract_ticker=contract_ticker,
                event_ticker=match_payload.get("eventId"),
                opened_at=ts_to_iso(match_payload.get("startIso")),
                closed_at=None,
                status=None,
                result=None,
                raw_json=compact_json({"match": match_payload, "player": player_payload}),
            )
            contracts[contract_id] = contract
            bid = dollars_to_cents(player_payload.get("yesBidCents") if player_payload.get("yesBidCents") is not None else player_payload.get("yesBid"))
            ask = dollars_to_cents(player_payload.get("yesAskCents") if player_payload.get("yesAskCents") is not None else player_payload.get("yesAsk"))
            last = dollars_to_cents(player_payload.get("lastTradeCents") if player_payload.get("lastTradeCents") is not None else player_payload.get("lastTradePrice"))
            tick_at = ts_to_iso(player_payload.get("quoteUpdatedAt")) or captured_at
            ticks.append(
                ParsedTick(
                    source_table=source_table,
                    legacy_row_id=legacy_row_id,
                    tick_id=stable_id("market-tick", contract_id, tick_at, source_snapshot_id),
                    contract_id=contract_id,
                    match_id=match_id,
                    player_id=player_id,
                    source_name=source_name,
                    captured_at=tick_at,
                    bid_cents=bid,
                    ask_cents=ask,
                    last_cents=last,
                    open_cents=None,
                    high_cents=None,
                    low_cents=None,
                    close_cents=None,
                    volume=to_float(player_payload.get("volume")),
                    open_interest=to_float(player_payload.get("openInterest")),
                    source_snapshot_id=source_snapshot_id,
                )
            )
            price = ask if ask is not None else last if last is not None else bid
            snapshots.append(
                ParsedMarketSnapshot(
                    source_table=source_table,
                    legacy_row_id=legacy_row_id,
                    snapshot_id=stable_id("market-snapshot", source_table, source_snapshot_id, match_id, player_id, contract_ticker, "moneyline_binary"),
                    match_id=match_id,
                    player_id=player_id,
                    source_name=source_name,
                    market_type="moneyline_binary",
                    selection=str(selection),
                    line_value=None,
                    odds_american=None,
                    price_cents=price,
                    implied_probability=price / 100.0 if price is not None else None,
                    captured_at=captured_at,
                    source_snapshot_id=source_snapshot_id,
                )
            )
    counts["parsed_contracts"] = len(contracts)
    counts["parsed_ticks"] = len(ticks)
    counts["parsed_snapshots"] = len(snapshots)
    return list(contracts.values()), ticks, snapshots, counts


def parse_sportsbook_lines_payload(
    payload: dict[str, Any],
    resolver: TennisIdentityResolver,
    *,
    source_snapshot_id: str | None = None,
    local_path: str | None = None,
    source_name: str = "fanduel",
    source_table: str = "tennis_fanduel_lines",
) -> tuple[list[ParsedMarketSnapshot], dict[str, int]]:
    captured_at = ts_to_iso(payload.get("capturedAt")) or utc_now()
    date = payload.get("date")
    snapshots: list[ParsedMarketSnapshot] = []
    counts = {"source_rows": 0, "parsed_snapshots": 0, "unparsed_rows": 0}

    def add_snapshot(match_id: str, player_id: str | None, market_type: str, selection: str, line_value: float | None, odds: Any) -> None:
        odds_number = to_float(odds)
        snapshots.append(
            ParsedMarketSnapshot(
                source_table=source_table,
                legacy_row_id=stable_id("tennis", source_table, source_snapshot_id, match_id, market_type, selection, line_value, odds_number, length=64),
                snapshot_id=stable_id("market-snapshot", source_table, source_snapshot_id, match_id, player_id, market_type, selection, line_value, odds_number),
                match_id=match_id,
                player_id=player_id,
                source_name=source_name,
                market_type=market_type,
                selection=selection,
                line_value=line_value,
                odds_american=odds_number,
                price_cents=None,
                implied_probability=american_to_implied(odds_number),
                captured_at=captured_at,
                source_snapshot_id=source_snapshot_id,
            )
        )

    for match_payload in payload.get("matches") or []:
        raw_title = match_payload.get("match") or ""
        names = [part.strip() for part in raw_title.split(" vs ") if part.strip()]
        match_id = match_id_for_names(resolver, date, names)
        if not match_id:
            resolver.insert_unresolved(
                "tennis_market_match",
                source_name,
                match_payload.get("eventId") or local_path,
                raw_title or "unknown",
                {"local_path": local_path, "payload": match_payload},
                f"Could not confidently map {source_name} line match to canonical match.",
            )
            counts["unparsed_rows"] += 1
            continue
        markets = match_payload.get("markets") or {}
        for row in markets.get("moneyline") or []:
            counts["source_rows"] += 1
            player = row.get("player")
            add_snapshot(match_id, resolver.player_id_for_match(match_id, source_name, player) if player else None, "moneyline", str(player or "Unknown selection"), None, row.get("odds"))
        for row in markets.get("gameHandicap") or []:
            counts["source_rows"] += 1
            player = row.get("player")
            add_snapshot(match_id, resolver.player_id_for_match(match_id, source_name, player) if player else None, "game_spread", str(player or "Unknown selection"), to_float(row.get("spread")), row.get("odds"))
        for row in markets.get("totalGames") or []:
            counts["source_rows"] += 1
            add_snapshot(match_id, None, "match_total_games", str(row.get("side") or "Unknown selection"), to_float(row.get("line")), row.get("odds"))
        for row in markets.get("firstSetTotalGames") or []:
            counts["source_rows"] += 1
            add_snapshot(match_id, None, "first_set_total_games", str(row.get("side") or "Unknown selection"), to_float(row.get("line")), row.get("odds"))
        for row in markets.get("firstGameTotalPoints") or []:
            counts["source_rows"] += 1
            add_snapshot(match_id, None, "first_game_total_points", str(row.get("side") or "Unknown selection"), to_float(row.get("line")), row.get("odds"))
        for row in markets.get("firstServiceGameTotalPoints") or []:
            counts["source_rows"] += 1
            player = row.get("player")
            selection = f"{player} {row.get('side')}".strip() if player else str(row.get("side") or "Unknown selection")
            add_snapshot(
                match_id,
                resolver.player_id_for_match(match_id, source_name, player) if player else None,
                "first_service_game_total_points",
                selection,
                to_float(row.get("line")),
                row.get("odds"),
            )
        for row in markets.get("firstGameProps") or []:
            counts["source_rows"] += 1
            market_name = str(row.get("market") or "First game props")
            selection = f"{market_name}: {row.get('selection') or 'Unknown selection'}"
            add_snapshot(match_id, None, "first_game_props", selection, None, row.get("odds"))
        for row in markets.get("winAtLeastOneSet") or []:
            counts["source_rows"] += 1
            player = row.get("player") or str(row.get("market") or "").replace(" to win at least one set", "")
            add_snapshot(match_id, resolver.player_id_for_match(match_id, source_name, player) if player else None, "set_win", str(row.get("market") or player or "Unknown selection"), None, row.get("odds"))
    counts["parsed_snapshots"] = len(snapshots)
    return snapshots, counts


def parse_fanduel_lines_payload(
    payload: dict[str, Any],
    resolver: TennisIdentityResolver,
    *,
    source_snapshot_id: str | None = None,
    local_path: str | None = None,
) -> tuple[list[ParsedMarketSnapshot], dict[str, int]]:
    return parse_sportsbook_lines_payload(
        payload,
        resolver,
        source_snapshot_id=source_snapshot_id,
        local_path=local_path,
        source_name="fanduel",
        source_table="tennis_fanduel_lines",
    )


def parse_draftkings_lines_payload(
    payload: dict[str, Any],
    resolver: TennisIdentityResolver,
    *,
    source_snapshot_id: str | None = None,
    local_path: str | None = None,
) -> tuple[list[ParsedMarketSnapshot], dict[str, int]]:
    return parse_sportsbook_lines_payload(
        payload,
        resolver,
        source_snapshot_id=source_snapshot_id,
        local_path=local_path,
        source_name="draftkings",
        source_table="tennis_draftkings_lines",
    )


def parse_market_rows(
    con: sqlite3.Connection,
    resolver: TennisIdentityResolver,
    date: str | None = None,
) -> tuple[list[ParsedContract], list[ParsedTick], list[ParsedMarketSnapshot], dict[str, int]]:
    contracts: dict[str, ParsedContract] = {}
    ticks: list[ParsedTick] = []
    snapshots: list[ParsedMarketSnapshot] = []
    counts = {"source_rows": 0, "parsed_contracts": 0, "parsed_ticks": 0, "parsed_snapshots": 0, "unparsed_rows": 0}
    for row in fetch_legacy_rows(con, MARKET_SOURCE_TABLES, date=date):
        counts["source_rows"] += 1
        contract, tick, snapshot = parse_market_row(row, parse_legacy_json(row), resolver)
        if contract:
            contracts[contract.contract_id] = contract
        if tick:
            ticks.append(tick)
        if snapshot:
            snapshots.append(snapshot)
        if not contract and not tick and not snapshot:
            counts["unparsed_rows"] += 1
    counts["parsed_contracts"] = len(contracts)
    counts["parsed_ticks"] = len(ticks)
    counts["parsed_snapshots"] = len(snapshots)
    return list(contracts.values()), ticks, snapshots, counts


def insert_contracts(con: sqlite3.Connection, rows: list[ParsedContract]) -> int:
    count = 0
    for row in rows:
        con.execute(
            """
            insert into market_contracts (
              contract_id, match_id, player_id, source_name, market_type, selection,
              contract_ticker, event_ticker, opened_at, closed_at, settled_at,
              status, result, raw_json, created_at
            ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, null, ?, ?, ?, ?)
            on conflict(contract_id) do update set
              match_id = excluded.match_id,
              player_id = excluded.player_id,
              selection = excluded.selection,
              status = excluded.status,
              result = excluded.result,
              raw_json = excluded.raw_json
            """,
            (
                row.contract_id,
                row.match_id,
                row.player_id,
                row.source_name,
                row.market_type,
                row.selection,
                row.contract_ticker,
                row.event_ticker,
                row.opened_at,
                row.closed_at,
                row.status,
                row.result,
                row.raw_json,
                utc_now(),
            ),
        )
        count += 1
    return count


def insert_ticks(con: sqlite3.Connection, rows: list[ParsedTick]) -> int:
    count = 0
    for row in rows:
        con.execute(
            """
            insert into market_price_ticks (
              tick_id, contract_id, match_id, player_id, source_name, captured_at,
              bid_cents, ask_cents, last_cents, open_cents, high_cents,
              low_cents, close_cents, volume, open_interest, raw_source_snapshot_id
            ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            on conflict(tick_id) do update set
              bid_cents = excluded.bid_cents,
              ask_cents = excluded.ask_cents,
              last_cents = excluded.last_cents,
              open_cents = excluded.open_cents,
              high_cents = excluded.high_cents,
              low_cents = excluded.low_cents,
              close_cents = excluded.close_cents,
              volume = excluded.volume,
              open_interest = excluded.open_interest,
              raw_source_snapshot_id = excluded.raw_source_snapshot_id
            """,
            (
                row.tick_id,
                row.contract_id,
                row.match_id,
                row.player_id,
                row.source_name,
                row.captured_at,
                row.bid_cents,
                row.ask_cents,
                row.last_cents,
                row.open_cents,
                row.high_cents,
                row.low_cents,
                row.close_cents,
                row.volume,
                row.open_interest,
                row.source_snapshot_id,
            ),
        )
        count += 1
    return count


def insert_snapshots(con: sqlite3.Connection, rows: list[ParsedMarketSnapshot]) -> int:
    count = 0
    for row in rows:
        con.execute(
            """
            insert into market_snapshots (
              market_snapshot_id, match_id, player_id, source_name, market_type,
              selection, line_value, odds_american, price_cents, implied_probability,
              captured_at, raw_source_snapshot_id
            ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            on conflict(market_snapshot_id) do update set
              match_id = excluded.match_id,
              player_id = excluded.player_id,
              line_value = excluded.line_value,
              odds_american = excluded.odds_american,
              price_cents = excluded.price_cents,
              implied_probability = excluded.implied_probability,
              captured_at = excluded.captured_at,
              raw_source_snapshot_id = excluded.raw_source_snapshot_id
            """,
            (
                row.snapshot_id,
                row.match_id,
                row.player_id,
                row.source_name,
                row.market_type,
                row.selection,
                row.line_value,
                row.odds_american,
                row.price_cents,
                row.implied_probability,
                row.captured_at,
                row.source_snapshot_id,
            ),
        )
        count += 1
    return count


def normalize_markets(con: sqlite3.Connection, date: str | None = None, dry_run: bool = False) -> dict[str, Any]:
    ensure_market_schema(con)
    resolver = TennisIdentityResolver(con)
    before_unresolved = con.execute("select count(*) from unresolved_entities").fetchone()[0]
    contracts, ticks, snapshots, counts = parse_market_rows(con, resolver, date=date)
    report = {
        "family": "tennis_markets",
        "date": date,
        "dry_run": dry_run,
        **counts,
        "inserted_contracts": 0,
        "inserted_ticks": 0,
        "inserted_snapshots": 0,
        "unresolved_rows_added": 0,
    }
    if not dry_run:
        report["inserted_contracts"] = insert_contracts(con, contracts)
        report["inserted_ticks"] = insert_ticks(con, ticks)
        report["inserted_snapshots"] = insert_snapshots(con, snapshots)
        con.commit()
    after_unresolved = con.execute("select count(*) from unresolved_entities").fetchone()[0]
    report["unresolved_rows_added"] = after_unresolved - before_unresolved
    if dry_run:
        con.rollback()
    return report
