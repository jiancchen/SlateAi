from __future__ import annotations

import sqlite3
from dataclasses import dataclass
from typing import Any

from .common import (
    MlbIdentityResolver,
    StagingTableSource,
    detail_json,
    fetch_legacy_and_staging_rows,
    insert_value_rows,
    parse_legacy_json,
    source_pk_for_row,
    stable_id,
    to_float,
    to_int,
    utc_now,
)
from .markets import implied_probability


PROP_SOURCE_TABLES = ["mlb_player_prop_odds_snapshots"]
PROP_STAGING_TABLES = [
    StagingTableSource("mlb_player_prop_odds_snapshots", ("row_key",), "market_date"),
]


@dataclass(frozen=True)
class ParsedRow:
    target_table: str
    source_table: str
    legacy_row_id: str
    values: dict[str, Any]


def ensure_props_schema(con: sqlite3.Connection) -> None:
    con.row_factory = sqlite3.Row
    con.executescript(
        """
        create table if not exists prop_market_snapshots (
          prop_market_snapshot_id text primary key,
          game_id text,
          player_id text,
          player_name text,
          team_id text,
          opponent_team_id text,
          source_name text not null,
          sportsbook text,
          market_type text,
          market_key text,
          selection text,
          line_value real,
          american_odds integer,
          implied_probability real,
          market_date text,
          commence_time text,
          captured_at text,
          outcome_description text,
          source_event_id text,
          source_path text,
          source_table text,
          source_pk text,
          source_detail_json text,
          created_at text not null,
          foreign key (game_id) references games(game_id),
          foreign key (player_id) references players(player_id),
          foreign key (team_id) references teams(team_id),
          foreign key (opponent_team_id) references teams(team_id)
        );
        create index if not exists idx_prop_market_player_date on prop_market_snapshots (player_id, market_date, market_key);
        create index if not exists idx_prop_market_game on prop_market_snapshots (game_id, market_type);
        """
    )


def parse_prop(row: sqlite3.Row, payload: dict[str, Any], resolver: MlbIdentityResolver) -> ParsedRow:
    game_id = resolver.game_id_for_pk(payload.get("game_pk")) or resolver.game_id_for_teams_date(
        "mlb_props",
        payload.get("market_date"),
        payload.get("home_team"),
        payload.get("away_team"),
    )
    player_id = resolver.player_id_by_name("mlb_props", payload.get("player_name"))
    home_team_id = resolver.team_id_by_name("mlb_props", payload.get("home_team"))
    away_team_id = resolver.team_id_by_name("mlb_props", payload.get("away_team"))
    odds = to_int(payload.get("price"))
    return ParsedRow(
        target_table="prop_market_snapshots",
        source_table=row["source_table"],
        legacy_row_id=row["legacy_row_id"],
        values={
            "prop_market_snapshot_id": stable_id("prop-market", source_pk_for_row(row)),
            "game_id": game_id,
            "player_id": player_id,
            "player_name": payload.get("player_name"),
            "team_id": None,
            "opponent_team_id": None,
            "source_name": payload.get("bookmaker_key") or "prop_market",
            "sportsbook": payload.get("bookmaker_title") or payload.get("bookmaker_key"),
            "market_type": payload.get("market_key"),
            "market_key": payload.get("market_key"),
            "selection": payload.get("outcome_name"),
            "line_value": to_float(payload.get("point")),
            "american_odds": odds,
            "implied_probability": implied_probability(odds),
            "market_date": payload.get("market_date"),
            "commence_time": payload.get("commence_time"),
            "captured_at": payload.get("snapshot_time") or payload.get("last_update") or utc_now(),
            "outcome_description": payload.get("outcome_description"),
            "source_event_id": payload.get("source_event_id"),
            "source_path": payload.get("source_path"),
            "source_table": row["source_table"],
            "source_pk": source_pk_for_row(row),
            "source_detail_json": detail_json({**payload, "_home_team_id": home_team_id, "_away_team_id": away_team_id}),
            "created_at": utc_now(),
        },
    )


def parse_prop_rows(con: sqlite3.Connection, resolver: MlbIdentityResolver, date: str | None = None) -> tuple[list[ParsedRow], dict[str, Any]]:
    parsed: list[ParsedRow] = []
    counts: dict[str, Any] = {"source_rows": 0, "parsed_rows": 0, "unparsed_rows": 0, "source_tables": {}, "targets": {}}
    for row in fetch_legacy_and_staging_rows(con, PROP_SOURCE_TABLES, date=date, staging_tables=PROP_STAGING_TABLES):
        counts["source_rows"] += 1
        counts["source_tables"][row["source_table"]] = counts["source_tables"].get(row["source_table"], 0) + 1
        parsed_row = parse_prop(row, parse_legacy_json(row), resolver)
        parsed.append(parsed_row)
        counts["targets"][parsed_row.target_table] = counts["targets"].get(parsed_row.target_table, 0) + 1
    counts["parsed_rows"] = len(parsed)
    return parsed, counts


def normalize_props(con: sqlite3.Connection, date: str | None = None, dry_run: bool = False) -> dict[str, Any]:
    con.row_factory = sqlite3.Row
    ensure_props_schema(con)
    resolver = MlbIdentityResolver(con)
    before_unresolved = con.execute("select count(*) from unresolved_entities").fetchone()[0]
    rows, counts = parse_prop_rows(con, resolver, date=date)
    report = {"family": "mlb_props", "date": date, "dry_run": dry_run, **counts, "inserted": {}, "unresolved_rows_added": 0}
    if not dry_run:
        report["inserted"] = insert_value_rows(con, [(row.target_table, row.values) for row in rows])
        con.commit()
    after_unresolved = con.execute("select count(*) from unresolved_entities").fetchone()[0]
    report["unresolved_rows_added"] = after_unresolved - before_unresolved
    if dry_run:
        con.rollback()
    return report
