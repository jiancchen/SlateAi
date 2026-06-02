from __future__ import annotations

import sqlite3
from dataclasses import dataclass
from typing import Any

from .common import (
    MlbIdentityResolver,
    detail_json,
    fetch_legacy_rows,
    insert_value_rows,
    parse_legacy_json,
    source_pk_for_row,
    stable_id,
    to_float,
    to_int,
    utc_now,
)


MARKET_SOURCE_TABLES = [
    "mlb_featured_market_odds_snapshots",
    "mlb_kalshi_market_snapshots",
    "mlb_market_mispricing_labels",
    "mlb_team_market_context_daily",
]


@dataclass(frozen=True)
class ParsedRow:
    target_table: str
    source_table: str
    legacy_row_id: str
    values: dict[str, Any]


def implied_probability(american_odds: Any) -> float | None:
    odds = to_float(american_odds)
    if odds is None or odds == 0:
        return None
    if odds < 0:
        return abs(odds) / (abs(odds) + 100.0)
    return 100.0 / (odds + 100.0)


def ensure_markets_schema(con: sqlite3.Connection) -> None:
    con.row_factory = sqlite3.Row
    con.executescript(
        """
        create table if not exists market_contracts (
          contract_id text primary key,
          market_id text,
          source_name text not null,
          contract_ticker text,
          event_ticker text,
          series_ticker text,
          game_id text,
          team_id text,
          player_id text,
          market_type text,
          market_family text,
          selection_type text,
          selection_code text,
          selection_name text,
          line_value real,
          title text,
          settlement_status text,
          source_table text,
          source_pk text,
          source_detail_json text,
          created_at text not null,
          foreign key (game_id) references games(game_id),
          foreign key (team_id) references teams(team_id),
          foreign key (player_id) references players(player_id)
        );
        create index if not exists idx_market_contracts_game on market_contracts (game_id, market_type, selection_code);

        create table if not exists market_price_ticks (
          market_price_tick_id text primary key,
          contract_id text,
          market_id text,
          source_name text not null,
          game_id text,
          market_type text,
          captured_at text,
          bid_cents real,
          ask_cents real,
          last_price_cents real,
          no_bid_cents real,
          no_ask_cents real,
          volume real,
          open_interest real,
          source_table text,
          source_pk text,
          source_detail_json text,
          created_at text not null,
          foreign key (contract_id) references market_contracts(contract_id),
          foreign key (game_id) references games(game_id)
        );
        create index if not exists idx_market_price_ticks_contract_time on market_price_ticks (contract_id, captured_at);

        create table if not exists team_market_context_snapshots (
          team_market_context_snapshot_id text primary key,
          team_id text,
          opponent_team_id text,
          as_of_date text,
          team_name text,
          scheduled_opponent text,
          games_sample_last5 integer,
          games_sample_last10 integer,
          moneyline_games_with_odds_last5 integer,
          moneyline_games_with_odds_last10 integer,
          totals_games_with_lines_last5 integer,
          totals_games_with_lines_last10 integer,
          favorite_rate_last5 real,
          favorite_rate_last10 real,
          favorite_hold_rate_last5 real,
          favorite_hold_rate_last10 real,
          underdog_rate_last5 real,
          underdog_rate_last10 real,
          underdog_upset_rate_last5 real,
          underdog_upset_rate_last10 real,
          over_rate_last5 real,
          over_rate_last10 real,
          under_rate_last5 real,
          under_rate_last10 real,
          push_rate_last5 real,
          push_rate_last10 real,
          avg_total_runs_minus_line_last5 real,
          avg_total_runs_minus_line_last10 real,
          market_volatility_index real,
          source_table text,
          source_pk text,
          source_detail_json text,
          created_at text not null,
          foreign key (team_id) references teams(team_id),
          foreign key (opponent_team_id) references teams(team_id)
        );
        create index if not exists idx_team_market_context_team_date on team_market_context_snapshots (team_id, as_of_date);

        create table if not exists market_mispricing_labels (
          market_mispricing_label_id text primary key,
          game_id text,
          prediction_date text,
          model_name text,
          market_type text,
          matchup text,
          predicted_pick_team_id text,
          predicted_pick text,
          opponent_team_id text,
          opponent_team text,
          market_favorite_team_id text,
          market_favorite_team text,
          market_side_label text,
          market_mispricing_label text,
          market_phase_preference_label text,
          price_bucket_label text,
          confidence real,
          volatility real,
          point_edge real,
          market_american_odds integer,
          opponent_market_american_odds integer,
          market_probability real,
          opponent_market_probability real,
          market_favorite_probability real,
          market_price_gap real,
          pick_is_market_favorite integer,
          pick_is_market_underdog integer,
          hit_full_game integer,
          hit_first5 integer,
          source_table text,
          source_pk text,
          source_detail_json text,
          created_at text not null,
          foreign key (game_id) references games(game_id),
          foreign key (predicted_pick_team_id) references teams(team_id)
        );
        create index if not exists idx_market_mispricing_date on market_mispricing_labels (prediction_date, market_type, market_mispricing_label);
        """
    )


def game_id_for_market(resolver: MlbIdentityResolver, payload: dict[str, Any]) -> str | None:
    by_pk = resolver.game_id_for_pk(payload.get("game_pk"))
    if by_pk:
        return by_pk
    return resolver.game_id_for_teams_date(
        "mlb_markets",
        payload.get("market_date") or payload.get("game_date") or payload.get("prediction_date") or payload.get("as_of_date"),
        payload.get("home_team"),
        payload.get("away_team"),
    )


def parse_featured_market(row: sqlite3.Row, payload: dict[str, Any], resolver: MlbIdentityResolver) -> list[ParsedRow]:
    game_id = game_id_for_market(resolver, payload)
    odds = to_int(payload.get("price"))
    return [
        ParsedRow(
            "market_snapshots",
            row["source_table"],
            row["legacy_row_id"],
            {
                "market_snapshot_id": stable_id("market-snapshot", row["source_table"], source_pk_for_row(row)),
                "game_id": game_id,
                "player_id": None,
                "source_name": payload.get("bookmaker_key") or payload.get("bookmaker_title") or "featured_market",
                "market_type": payload.get("market_key") or "unknown",
                "selection": payload.get("outcome_name") or payload.get("outcome_description") or "unknown",
                "line_value": to_float(payload.get("point")),
                "odds_american": odds,
                "price_cents": None,
                "implied_probability": implied_probability(odds),
                "captured_at": payload.get("snapshot_time") or payload.get("last_update") or utc_now(),
                "raw_source_snapshot_id": row["legacy_row_id"],
            },
        )
    ]


def parse_kalshi(row: sqlite3.Row, payload: dict[str, Any], resolver: MlbIdentityResolver) -> list[ParsedRow]:
    game_id = game_id_for_market(resolver, payload)
    contract_id = stable_id("market-contract", "kalshi", payload.get("market_ticker"))
    market_id = payload.get("event_ticker") or payload.get("market_ticker")
    source_pk = source_pk_for_row(row)
    return [
        ParsedRow(
            "market_contracts",
            row["source_table"],
            row["legacy_row_id"],
            {
                "contract_id": contract_id,
                "market_id": market_id,
                "source_name": "kalshi",
                "contract_ticker": payload.get("market_ticker"),
                "event_ticker": payload.get("event_ticker"),
                "series_ticker": payload.get("series_ticker"),
                "game_id": game_id,
                "team_id": None,
                "player_id": None,
                "market_type": payload.get("market_family"),
                "market_family": payload.get("market_family"),
                "selection_type": "team" if payload.get("selection_code") else "line",
                "selection_code": payload.get("selection_code"),
                "selection_name": payload.get("selection_code"),
                "line_value": to_float(payload.get("line")),
                "title": payload.get("market_title"),
                "settlement_status": payload.get("game_status"),
                "source_table": row["source_table"],
                "source_pk": source_pk,
                "source_detail_json": detail_json(payload),
                "created_at": utc_now(),
            },
        ),
        ParsedRow(
            "market_price_ticks",
            row["source_table"],
            row["legacy_row_id"],
            {
                "market_price_tick_id": stable_id("market-tick", contract_id, payload.get("snapshot_ts"), source_pk),
                "contract_id": contract_id,
                "market_id": market_id,
                "source_name": "kalshi",
                "game_id": game_id,
                "market_type": payload.get("market_family"),
                "captured_at": payload.get("snapshot_ts"),
                "bid_cents": to_float(payload.get("yes_bid_cents")),
                "ask_cents": to_float(payload.get("yes_ask_cents")),
                "last_price_cents": to_float(payload.get("last_price_cents")),
                "no_bid_cents": to_float(payload.get("no_bid_cents")),
                "no_ask_cents": to_float(payload.get("no_ask_cents")),
                "volume": to_float(payload.get("volume_fp")),
                "open_interest": to_float(payload.get("open_interest_fp")),
                "source_table": row["source_table"],
                "source_pk": source_pk,
                "source_detail_json": detail_json(payload),
                "created_at": utc_now(),
            },
        ),
        ParsedRow(
            "market_snapshots",
            row["source_table"],
            row["legacy_row_id"],
            {
                "market_snapshot_id": stable_id("market-snapshot", row["source_table"], source_pk),
                "game_id": game_id,
                "player_id": None,
                "source_name": "kalshi",
                "market_type": payload.get("market_family") or "prediction_market",
                "selection": payload.get("selection_code") or payload.get("market_ticker") or "unknown",
                "line_value": to_float(payload.get("line")),
                "odds_american": None,
                "price_cents": to_float(payload.get("yes_ask_cents") or payload.get("last_price_cents")),
                "implied_probability": None,
                "captured_at": payload.get("snapshot_ts") or utc_now(),
                "raw_source_snapshot_id": row["legacy_row_id"],
            },
        ),
    ]


def parse_team_context(row: sqlite3.Row, payload: dict[str, Any], resolver: MlbIdentityResolver) -> list[ParsedRow]:
    team_id = resolver.team_id_by_name("mlb_markets", payload.get("team_name"))
    opponent_team_id = resolver.team_id_by_name("mlb_markets", payload.get("scheduled_opponent"))
    values = {
        "team_market_context_snapshot_id": stable_id("team-market-context", payload.get("as_of_date"), team_id, payload.get("team_name"), source_pk_for_row(row)),
        "team_id": team_id,
        "opponent_team_id": opponent_team_id,
        "as_of_date": payload.get("as_of_date"),
        "team_name": payload.get("team_name"),
        "scheduled_opponent": payload.get("scheduled_opponent"),
        "source_table": row["source_table"],
        "source_pk": source_pk_for_row(row),
        "source_detail_json": detail_json(payload),
        "created_at": utc_now(),
    }
    for key in [
        "games_sample_last5",
        "games_sample_last10",
        "moneyline_games_with_odds_last5",
        "moneyline_games_with_odds_last10",
        "totals_games_with_lines_last5",
        "totals_games_with_lines_last10",
    ]:
        values[key] = to_int(payload.get(key))
    for key in [
        "favorite_rate_last5",
        "favorite_rate_last10",
        "favorite_hold_rate_last5",
        "favorite_hold_rate_last10",
        "underdog_rate_last5",
        "underdog_rate_last10",
        "underdog_upset_rate_last5",
        "underdog_upset_rate_last10",
        "over_rate_last5",
        "over_rate_last10",
        "under_rate_last5",
        "under_rate_last10",
        "push_rate_last5",
        "push_rate_last10",
        "avg_total_runs_minus_line_last5",
        "avg_total_runs_minus_line_last10",
        "market_volatility_index",
    ]:
        values[key] = to_float(payload.get(key))
    return [ParsedRow("team_market_context_snapshots", row["source_table"], row["legacy_row_id"], values)]


def parse_mispricing(row: sqlite3.Row, payload: dict[str, Any], resolver: MlbIdentityResolver) -> list[ParsedRow]:
    away, home = (None, None)
    if payload.get("matchup") and "@" in str(payload["matchup"]):
        away, home = [part.strip() for part in str(payload["matchup"]).split("@", 1)]
    game_id = resolver.game_id_for_teams_date("mlb_markets", payload.get("prediction_date"), home, away)
    predicted_team_id = resolver.team_id_by_name("mlb_markets", payload.get("predicted_pick"))
    opponent_team_id = resolver.team_id_by_name("mlb_markets", payload.get("opponent_team"))
    market_favorite_team_id = resolver.team_id_by_name("mlb_markets", payload.get("market_favorite_team"))
    return [
        ParsedRow(
            "market_mispricing_labels",
            row["source_table"],
            row["legacy_row_id"],
            {
                "market_mispricing_label_id": stable_id("market-mispricing", source_pk_for_row(row)),
                "game_id": game_id,
                "prediction_date": payload.get("prediction_date"),
                "model_name": payload.get("model_name"),
                "market_type": payload.get("market_type"),
                "matchup": payload.get("matchup"),
                "predicted_pick_team_id": predicted_team_id,
                "predicted_pick": payload.get("predicted_pick"),
                "opponent_team_id": opponent_team_id,
                "opponent_team": payload.get("opponent_team"),
                "market_favorite_team_id": market_favorite_team_id,
                "market_favorite_team": payload.get("market_favorite_team"),
                "market_side_label": payload.get("market_side_label"),
                "market_mispricing_label": payload.get("market_mispricing_label"),
                "market_phase_preference_label": payload.get("market_phase_preference_label"),
                "price_bucket_label": payload.get("price_bucket_label"),
                "confidence": to_float(payload.get("confidence")),
                "volatility": to_float(payload.get("volatility")),
                "point_edge": to_float(payload.get("point_edge")),
                "market_american_odds": to_int(payload.get("market_american_odds")),
                "opponent_market_american_odds": to_int(payload.get("opponent_market_american_odds")),
                "market_probability": to_float(payload.get("market_probability")),
                "opponent_market_probability": to_float(payload.get("opponent_market_probability")),
                "market_favorite_probability": to_float(payload.get("market_favorite_probability")),
                "market_price_gap": to_float(payload.get("market_price_gap")),
                "pick_is_market_favorite": to_int(payload.get("pick_is_market_favorite")),
                "pick_is_market_underdog": to_int(payload.get("pick_is_market_underdog")),
                "hit_full_game": to_int(payload.get("hit_full_game")),
                "hit_first5": to_int(payload.get("hit_first5")),
                "source_table": row["source_table"],
                "source_pk": source_pk_for_row(row),
                "source_detail_json": detail_json(payload),
                "created_at": utc_now(),
            },
        )
    ]


PARSERS = {
    "mlb_featured_market_odds_snapshots": parse_featured_market,
    "mlb_kalshi_market_snapshots": parse_kalshi,
    "mlb_team_market_context_daily": parse_team_context,
    "mlb_market_mispricing_labels": parse_mispricing,
}


def parse_market_rows(con: sqlite3.Connection, resolver: MlbIdentityResolver, date: str | None = None) -> tuple[list[ParsedRow], dict[str, Any]]:
    parsed: list[ParsedRow] = []
    counts: dict[str, Any] = {"source_rows": 0, "parsed_rows": 0, "unparsed_rows": 0, "source_tables": {}, "targets": {}}
    for row in fetch_legacy_rows(con, MARKET_SOURCE_TABLES, date=date):
        counts["source_rows"] += 1
        counts["source_tables"][row["source_table"]] = counts["source_tables"].get(row["source_table"], 0) + 1
        parser = PARSERS.get(row["source_table"])
        rows = parser(row, parse_legacy_json(row), resolver) if parser else []
        if not rows:
            counts["unparsed_rows"] += 1
            continue
        parsed.extend(rows)
        for parsed_row in rows:
            counts["targets"][parsed_row.target_table] = counts["targets"].get(parsed_row.target_table, 0) + 1
    counts["parsed_rows"] = len(parsed)
    return parsed, counts


def normalize_markets(con: sqlite3.Connection, date: str | None = None, dry_run: bool = False) -> dict[str, Any]:
    con.row_factory = sqlite3.Row
    ensure_markets_schema(con)
    resolver = MlbIdentityResolver(con)
    before_unresolved = con.execute("select count(*) from unresolved_entities").fetchone()[0]
    rows, counts = parse_market_rows(con, resolver, date=date)
    report = {"family": "mlb_markets", "date": date, "dry_run": dry_run, **counts, "inserted": {}, "unresolved_rows_added": 0}
    if not dry_run:
        report["inserted"] = insert_value_rows(con, [(row.target_table, row.values) for row in rows])
        con.commit()
    after_unresolved = con.execute("select count(*) from unresolved_entities").fetchone()[0]
    report["unresolved_rows_added"] = after_unresolved - before_unresolved
    if dry_run:
        con.rollback()
    return report
