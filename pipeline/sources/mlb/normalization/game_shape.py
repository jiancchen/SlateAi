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


GAME_SHAPE_SOURCE_TABLES = ["mlb_state_formula_training_rows", "mlb_state_formula_backtests"]


@dataclass(frozen=True)
class ParsedRow:
    target_table: str
    source_table: str
    legacy_row_id: str
    values: dict[str, Any]


def ensure_game_shape_schema(con: sqlite3.Connection) -> None:
    con.row_factory = sqlite3.Row
    con.executescript(
        """
        create table if not exists state_formula_training_rows (
          state_formula_training_row_id text primary key,
          model_id text,
          formula_id text,
          game_id text,
          game_date text,
          snapshot_date text,
          team_id text,
          opponent_team_id text,
          side text,
          phase text,
          market_expression text,
          story_bucket text,
          traffic_pressure real,
          damage_pressure real,
          conversion_pressure real,
          collapse_hazard real,
          suppression_state real,
          fork_probability real,
          bridge_leak real,
          fielding_tail real,
          sun_visibility_risk real,
          weather_carry real,
          feature_json text,
          formula_drivers_json text,
          target_json text,
          source_table text,
          source_pk text,
          source_detail_json text,
          created_at text not null,
          foreign key (game_id) references games(game_id),
          foreign key (team_id) references teams(team_id),
          foreign key (opponent_team_id) references teams(team_id)
        );
        create index if not exists idx_state_formula_training_game on state_formula_training_rows (game_id, phase, side);

        create table if not exists state_formula_backtests (
          state_formula_backtest_id text primary key,
          model_id text,
          backtest_id text,
          game_id text,
          prediction_date text,
          team_id text,
          opponent_team_id text,
          side text,
          lane text,
          phase text,
          bucket_key text,
          predicted_market_expression text,
          actual_market_result text,
          predicted_story_bucket text,
          actual_story_bucket text,
          line_value real,
          market_price real,
          confidence real,
          hit_flag integer,
          pnl_per100 real,
          details_json text,
          source_table text,
          source_pk text,
          source_detail_json text,
          created_at text not null,
          foreign key (game_id) references games(game_id),
          foreign key (team_id) references teams(team_id),
          foreign key (opponent_team_id) references teams(team_id)
        );
        create index if not exists idx_state_formula_backtest_model on state_formula_backtests (model_id, prediction_date, lane, phase);
        """
    )


def team_ids_for_side(resolver: MlbIdentityResolver, game_id: str | None, side: Any) -> tuple[str | None, str | None]:
    team_id = resolver.team_id_for_game_role(game_id, side)
    opponent_id = resolver.opponent_team_id_for_game_role(game_id, side)
    return team_id, opponent_id


def parse_training(row: sqlite3.Row, payload: dict[str, Any], resolver: MlbIdentityResolver) -> ParsedRow:
    game_id = resolver.game_id_for_pk(payload.get("game_pk"))
    team_id, opponent_id = team_ids_for_side(resolver, game_id, payload.get("side"))
    return ParsedRow(
        "state_formula_training_rows",
        row["source_table"],
        row["legacy_row_id"],
        {
            "state_formula_training_row_id": stable_id("state-formula-training", source_pk_for_row(row)),
            "model_id": payload.get("source_model_id"),
            "formula_id": payload.get("source_model_id"),
            "game_id": game_id,
            "game_date": payload.get("game_date"),
            "snapshot_date": payload.get("snapshot_date"),
            "team_id": team_id,
            "opponent_team_id": opponent_id,
            "side": payload.get("side"),
            "phase": payload.get("phase"),
            "market_expression": payload.get("market_expression"),
            "story_bucket": payload.get("story_bucket"),
            "traffic_pressure": to_float(payload.get("traffic_pressure")),
            "damage_pressure": to_float(payload.get("damage_pressure")),
            "conversion_pressure": to_float(payload.get("conversion_pressure")),
            "collapse_hazard": to_float(payload.get("collapse_hazard")),
            "suppression_state": to_float(payload.get("suppression_state")),
            "fork_probability": to_float(payload.get("fork_probability")),
            "bridge_leak": to_float(payload.get("bridge_leak")),
            "fielding_tail": to_float(payload.get("fielding_tail")),
            "sun_visibility_risk": to_float(payload.get("sun_visibility_risk")),
            "weather_carry": to_float(payload.get("weather_carry")),
            "feature_json": payload.get("feature_json"),
            "formula_drivers_json": payload.get("formula_drivers_json"),
            "target_json": payload.get("target_json"),
            "source_table": row["source_table"],
            "source_pk": source_pk_for_row(row),
            "source_detail_json": detail_json(payload),
            "created_at": utc_now(),
        },
    )


def parse_backtest(row: sqlite3.Row, payload: dict[str, Any], resolver: MlbIdentityResolver) -> ParsedRow:
    game_id = resolver.game_id_for_pk(payload.get("game_pk"))
    team_id, opponent_id = team_ids_for_side(resolver, game_id, payload.get("side"))
    return ParsedRow(
        "state_formula_backtests",
        row["source_table"],
        row["legacy_row_id"],
        {
            "state_formula_backtest_id": stable_id("state-formula-backtest", source_pk_for_row(row)),
            "model_id": payload.get("model_id"),
            "backtest_id": payload.get("backtest_id"),
            "game_id": game_id,
            "prediction_date": payload.get("prediction_date"),
            "team_id": team_id,
            "opponent_team_id": opponent_id,
            "side": payload.get("side"),
            "lane": payload.get("lane"),
            "phase": payload.get("phase"),
            "bucket_key": payload.get("bucket_key"),
            "predicted_market_expression": payload.get("predicted_market_expression"),
            "actual_market_result": payload.get("actual_market_result"),
            "predicted_story_bucket": payload.get("predicted_story_bucket"),
            "actual_story_bucket": payload.get("actual_story_bucket"),
            "line_value": to_float(payload.get("line_value")),
            "market_price": to_float(payload.get("market_price")),
            "confidence": to_float(payload.get("confidence")),
            "hit_flag": to_int(payload.get("hit_flag")),
            "pnl_per100": to_float(payload.get("pnl_per100")),
            "details_json": payload.get("details_json"),
            "source_table": row["source_table"],
            "source_pk": source_pk_for_row(row),
            "source_detail_json": detail_json(payload),
            "created_at": utc_now(),
        },
    )


def parse_game_shape_rows(con: sqlite3.Connection, resolver: MlbIdentityResolver, date: str | None = None) -> tuple[list[ParsedRow], dict[str, Any]]:
    parsed: list[ParsedRow] = []
    counts: dict[str, Any] = {"source_rows": 0, "parsed_rows": 0, "unparsed_rows": 0, "source_tables": {}, "targets": {}}
    for row in fetch_legacy_rows(con, GAME_SHAPE_SOURCE_TABLES, date=date):
        counts["source_rows"] += 1
        counts["source_tables"][row["source_table"]] = counts["source_tables"].get(row["source_table"], 0) + 1
        payload = parse_legacy_json(row)
        parsed_row = parse_training(row, payload, resolver) if row["source_table"] == "mlb_state_formula_training_rows" else parse_backtest(row, payload, resolver)
        parsed.append(parsed_row)
        counts["targets"][parsed_row.target_table] = counts["targets"].get(parsed_row.target_table, 0) + 1
    counts["parsed_rows"] = len(parsed)
    return parsed, counts


def normalize_game_shape(con: sqlite3.Connection, date: str | None = None, dry_run: bool = False) -> dict[str, Any]:
    con.row_factory = sqlite3.Row
    ensure_game_shape_schema(con)
    resolver = MlbIdentityResolver(con)
    before_unresolved = con.execute("select count(*) from unresolved_entities").fetchone()[0]
    rows, counts = parse_game_shape_rows(con, resolver, date=date)
    report = {"family": "mlb_game_shape", "date": date, "dry_run": dry_run, **counts, "inserted": {}, "unresolved_rows_added": 0}
    if not dry_run:
        report["inserted"] = insert_value_rows(con, [(row.target_table, row.values) for row in rows])
        con.commit()
    after_unresolved = con.execute("select count(*) from unresolved_entities").fetchone()[0]
    report["unresolved_rows_added"] = after_unresolved - before_unresolved
    if dry_run:
        con.rollback()
    return report
