from __future__ import annotations

import json
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


PREDICTION_SOURCE_TABLES = [
    "mlb_side_predictions",
    "mlb_prop_predictions",
    "mlb_home_run_predictions",
    "mlb_side_backtests",
    "mlb_prop_backtests",
    "mlb_home_run_backtests",
    "mlb_player_identity_model_backtests",
    "mlb_rp36_settlements",
    "mlb_rp36_team_settlements",
]


@dataclass(frozen=True)
class ParsedRow:
    target_table: str
    source_table: str
    legacy_row_id: str
    values: dict[str, Any]


def decode_jsonish(value: Any) -> dict[str, Any]:
    if isinstance(value, dict):
        return value
    if not value:
        return {}
    try:
        parsed = json.loads(str(value))
    except json.JSONDecodeError:
        return {}
    return parsed if isinstance(parsed, dict) else {}


def ensure_predictions_schema(con: sqlite3.Connection) -> None:
    con.row_factory = sqlite3.Row
    con.executescript(
        """
        create table if not exists component_settlement_rows (
          component_settlement_row_id text primary key,
          model_run_id text,
          component_model_id text,
          component_role text,
          game_id text,
          team_id text,
          player_id text,
          prediction_date text,
          settlement_status text,
          exact_hit integer,
          top2_hit integer,
          top3_hit integer,
          actual_value real,
          predicted_value real,
          details_json text,
          source_table text,
          source_pk text,
          source_detail_json text,
          created_at text not null,
          foreign key (model_run_id) references model_runs(model_run_id),
          foreign key (game_id) references games(game_id),
          foreign key (team_id) references teams(team_id),
          foreign key (player_id) references players(player_id)
        );
        create index if not exists idx_component_settlement_run on component_settlement_rows (model_run_id, component_model_id, prediction_date);

        create table if not exists side_backtest_rows (
          side_backtest_row_id text primary key,
          model_run_id text,
          game_id text,
          prediction_date text,
          model_name text,
          lane text,
          predicted_team_id text,
          predicted_team_name text,
          predicted_side text,
          actual_winner_team_id text,
          actual_winner_team_name text,
          hit_full_game integer,
          hit_first5 integer,
          predicted_runs_final real,
          predicted_runs_first5 real,
          opponent_runs_final real,
          opponent_runs_first5 real,
          confidence real,
          volatility real,
          source_table text,
          source_pk text,
          source_detail_json text,
          created_at text not null,
          foreign key (model_run_id) references model_runs(model_run_id),
          foreign key (game_id) references games(game_id)
        );
        create index if not exists idx_side_backtest_model_date on side_backtest_rows (model_run_id, prediction_date, lane);

        create table if not exists prop_backtest_rows (
          prop_backtest_row_id text primary key,
          model_run_id text,
          game_id text,
          player_id text,
          team_id text,
          prediction_date text,
          model_name text,
          prop_type text,
          market_label text,
          line_threshold real,
          actual_value real,
          hit_flag integer,
          result_label text,
          source_table text,
          source_pk text,
          source_detail_json text,
          created_at text not null,
          foreign key (model_run_id) references model_runs(model_run_id),
          foreign key (game_id) references games(game_id),
          foreign key (player_id) references players(player_id),
          foreign key (team_id) references teams(team_id)
        );
        create index if not exists idx_prop_backtest_model_date on prop_backtest_rows (model_run_id, prediction_date, prop_type);

        create table if not exists home_run_backtest_rows (
          home_run_backtest_row_id text primary key,
          model_run_id text,
          game_id text,
          player_id text,
          team_id text,
          prediction_date text,
          model_name text,
          actual_home_runs integer,
          hit_flag integer,
          matched_event_keys text,
          source_table text,
          source_pk text,
          source_detail_json text,
          created_at text not null,
          foreign key (model_run_id) references model_runs(model_run_id),
          foreign key (game_id) references games(game_id),
          foreign key (player_id) references players(player_id),
          foreign key (team_id) references teams(team_id)
        );
        create index if not exists idx_hr_backtest_model_date on home_run_backtest_rows (model_run_id, prediction_date);

        create table if not exists player_identity_backtest_rows (
          player_identity_backtest_row_id text primary key,
          model_run_id text,
          game_id text,
          player_id text,
          prediction_date text,
          model_id text,
          backtest_id text,
          player_type text,
          metric text,
          role_bucket text,
          sample_size_bucket text,
          matchup_bucket text,
          deviation_bucket text,
          line_value real,
          market_price real,
          predicted_value real,
          actual_value real,
          hit_flag integer,
          pnl_per100 real,
          details_json text,
          source_table text,
          source_pk text,
          source_detail_json text,
          created_at text not null,
          foreign key (model_run_id) references model_runs(model_run_id),
          foreign key (game_id) references games(game_id),
          foreign key (player_id) references players(player_id)
        );
        create index if not exists idx_identity_backtest_model_date on player_identity_backtest_rows (model_id, prediction_date, metric);
        """
    )


def model_run_id(model_name: Any, prediction_date: Any, run_type: str = "legacy-normalized") -> str:
    date = str(prediction_date or "unknown-date")[:10]
    model = str(model_name or "unknown-model")
    return f"mlb-{date}-{model}-{run_type}"


def ensure_model_run(con: sqlite3.Connection, model_name: Any, prediction_date: Any, run_type: str = "legacy-normalized") -> str:
    run_id = model_run_id(model_name, prediction_date, run_type)
    con.execute(
        """
        insert into model_runs (
          model_run_id, sport, model_id, model_version, run_date, run_type,
          status, cartridge_path, manifest_path, input_hash, output_hash, created_at, notes
        ) values (?, 'mlb', ?, ?, ?, ?, 'normalized', null, null, null, null, ?, ?)
        on conflict(model_run_id) do update set
          status = excluded.status,
          notes = excluded.notes
        """,
        (
            run_id,
            str(model_name or "unknown-model"),
            str(model_name or "unknown-model"),
            str(prediction_date or "unknown-date")[:10],
            run_type,
            utc_now(),
            json.dumps({"source": "legacy prediction/backtest normalization"}, sort_keys=True),
        ),
    )
    return run_id


def ensure_exact_model_run(
    con: sqlite3.Connection,
    run_id: str,
    model_name: Any,
    prediction_date: Any,
    run_type: str = "legacy-normalized",
) -> str:
    con.execute(
        """
        insert into model_runs (
          model_run_id, sport, model_id, model_version, run_date, run_type,
          status, cartridge_path, manifest_path, input_hash, output_hash, created_at, notes
        ) values (?, 'mlb', ?, ?, ?, ?, 'normalized', null, null, null, null, ?, ?)
        on conflict(model_run_id) do update set
          status = excluded.status,
          notes = excluded.notes
        """,
        (
            run_id,
            str(model_name or "unknown-model"),
            str(model_name or "unknown-model"),
            str(prediction_date or "unknown-date")[:10],
            run_type,
            utc_now(),
            json.dumps({"source": "legacy component settlement normalization"}, sort_keys=True),
        ),
    )
    return run_id


def game_id_for_payload(resolver: MlbIdentityResolver, payload: dict[str, Any]) -> str | None:
    by_pk = resolver.game_id_for_pk(payload.get("game_pk"))
    if by_pk:
        return by_pk
    home = payload.get("home_team_full") or payload.get("home_team")
    away = payload.get("away_team_full") or payload.get("away_team")
    return resolver.game_id_for_teams_date("mlb_predictions", payload.get("prediction_date") or payload.get("game_date"), home, away)


def parse_game_title_teams(game_title: Any) -> tuple[str | None, str | None]:
    if not game_title or "@" not in str(game_title):
        return None, None
    away, home = [part.strip() for part in str(game_title).split("@", 1)]
    return away or None, home or None


def game_id_from_title(resolver: MlbIdentityResolver, payload: dict[str, Any]) -> str | None:
    away, home = parse_game_title_teams(payload.get("game_title"))
    return resolver.game_id_for_teams_date("mlb_predictions", payload.get("prediction_date"), home, away)


def team_id_for_name(resolver: MlbIdentityResolver, payload: dict[str, Any], key: str) -> str | None:
    return resolver.team_id_by_name("mlb_predictions", payload.get(key))


def parse_side_prediction(row: sqlite3.Row, payload: dict[str, Any], resolver: MlbIdentityResolver) -> list[ParsedRow]:
    run_id = ensure_model_run(resolver.con, payload.get("model_name"), payload.get("prediction_date"))
    game_id = game_id_for_payload(resolver, payload)
    predicted_team_id = resolver.team_id_by_name("mlb_predictions", payload.get("predicted_team"))
    return [
        ParsedRow(
            "prediction_rows",
            row["source_table"],
            row["legacy_row_id"],
            {
                "prediction_row_id": stable_id("prediction", row["source_table"], source_pk_for_row(row)),
                "model_run_id": run_id,
                "game_id": game_id,
                "player_id": None,
                "lane": "MLB FG" if payload.get("predicted_side") else "side",
                "market_type": "moneyline",
                "selection": payload.get("predicted_team") or payload.get("predicted_side") or "unknown",
                "predicted_probability": None,
                "projected_value": to_float(payload.get("model_edge")),
                "confidence": to_float(payload.get("confidence")),
                "ev_cents": None,
                "price_cents": None,
                "odds_american": to_int(decode_jsonish(payload.get("metadata_json")).get("marketAmericanOdds")),
                "feature_snapshot_id": None,
                "rationale_json": detail_json({**payload, "_predicted_team_id": predicted_team_id}),
                "created_at": utc_now(),
            },
        )
    ]


def parse_prop_prediction(row: sqlite3.Row, payload: dict[str, Any], resolver: MlbIdentityResolver) -> list[ParsedRow]:
    run_id = ensure_model_run(resolver.con, payload.get("model_name"), payload.get("prediction_date"))
    game_id = game_id_for_payload(resolver, payload)
    player_id = resolver.player_id_by_mlb_id("mlb_predictions", payload.get("player_id"), payload.get("player_name"))
    return [
        ParsedRow(
            "prediction_rows",
            row["source_table"],
            row["legacy_row_id"],
            {
                "prediction_row_id": stable_id("prediction", row["source_table"], source_pk_for_row(row)),
                "model_run_id": run_id,
                "game_id": game_id,
                "player_id": player_id,
                "lane": "Props",
                "market_type": str(payload.get("prop_type") or "player_prop"),
                "selection": payload.get("market_label") or payload.get("prop_label") or "Over",
                "predicted_probability": to_float(payload.get("probability")),
                "projected_value": to_float(payload.get("expected_value")),
                "confidence": to_float(payload.get("confidence")),
                "ev_cents": None,
                "price_cents": None,
                "odds_american": None,
                "feature_snapshot_id": None,
                "rationale_json": detail_json(payload),
                "created_at": utc_now(),
            },
        )
    ]


def parse_home_run_prediction(row: sqlite3.Row, payload: dict[str, Any], resolver: MlbIdentityResolver) -> list[ParsedRow]:
    run_id = ensure_model_run(resolver.con, payload.get("model_name"), payload.get("prediction_date"))
    player_id = resolver.player_id_by_mlb_id("mlb_predictions", payload.get("player_id"), payload.get("player_name"))
    game_id = game_id_from_title(resolver, payload)
    return [
        ParsedRow(
            "prediction_rows",
            row["source_table"],
            row["legacy_row_id"],
            {
                "prediction_row_id": stable_id("prediction", row["source_table"], source_pk_for_row(row)),
                "model_run_id": run_id,
                "game_id": game_id,
                "player_id": player_id,
                "lane": "HR",
                "market_type": "home_run",
                "selection": payload.get("player_name") or "home_run",
                "predicted_probability": None,
                "projected_value": to_float(payload.get("score")),
                "confidence": None,
                "ev_cents": None,
                "price_cents": None,
                "odds_american": None,
                "feature_snapshot_id": None,
                "rationale_json": detail_json(payload),
                "created_at": utc_now(),
            },
        )
    ]


def parse_side_backtest(row: sqlite3.Row, payload: dict[str, Any], resolver: MlbIdentityResolver) -> list[ParsedRow]:
    run_id = ensure_model_run(resolver.con, payload.get("model_name"), payload.get("prediction_date"), "backtest")
    game_id = game_id_for_payload(resolver, payload)
    return [
        ParsedRow(
            "side_backtest_rows",
            row["source_table"],
            row["legacy_row_id"],
            {
                "side_backtest_row_id": stable_id("side-backtest", source_pk_for_row(row)),
                "model_run_id": run_id,
                "game_id": game_id,
                "prediction_date": payload.get("prediction_date"),
                "model_name": payload.get("model_name"),
                "lane": "moneyline",
                "predicted_team_id": resolver.team_id_by_name("mlb_predictions", payload.get("predicted_team")),
                "predicted_team_name": payload.get("predicted_team"),
                "predicted_side": payload.get("predicted_side"),
                "actual_winner_team_id": resolver.team_id_by_name("mlb_predictions", payload.get("actual_winner")),
                "actual_winner_team_name": payload.get("actual_winner"),
                "hit_full_game": to_int(payload.get("hit_full_game")),
                "hit_first5": to_int(payload.get("hit_first5")),
                "predicted_runs_final": to_float(payload.get("predicted_runs_final")),
                "predicted_runs_first5": to_float(payload.get("predicted_runs_first5")),
                "opponent_runs_final": to_float(payload.get("opponent_runs_final")),
                "opponent_runs_first5": to_float(payload.get("opponent_runs_first5")),
                "confidence": None,
                "volatility": to_float(payload.get("volatility")),
                "source_table": row["source_table"],
                "source_pk": source_pk_for_row(row),
                "source_detail_json": detail_json(payload),
                "created_at": utc_now(),
            },
        )
    ]


def parse_prop_backtest(row: sqlite3.Row, payload: dict[str, Any], resolver: MlbIdentityResolver) -> list[ParsedRow]:
    run_id = ensure_model_run(resolver.con, payload.get("model_name"), payload.get("prediction_date"), "backtest")
    game_id = game_id_for_payload(resolver, payload)
    player_id = resolver.player_id_by_mlb_id("mlb_predictions", payload.get("player_id"), payload.get("player_name"))
    team_id = resolver.team_id_by_name("mlb_predictions", payload.get("team_name_full") or payload.get("team_name"))
    return [
        ParsedRow(
            "prop_backtest_rows",
            row["source_table"],
            row["legacy_row_id"],
            {
                "prop_backtest_row_id": stable_id("prop-backtest", source_pk_for_row(row)),
                "model_run_id": run_id,
                "game_id": game_id,
                "player_id": player_id,
                "team_id": team_id,
                "prediction_date": payload.get("prediction_date"),
                "model_name": payload.get("model_name"),
                "prop_type": payload.get("prop_type"),
                "market_label": payload.get("market_label"),
                "line_threshold": to_float(payload.get("line_threshold")),
                "actual_value": to_float(payload.get("actual_value")),
                "hit_flag": to_int(payload.get("hit_flag")),
                "result_label": payload.get("result_label"),
                "source_table": row["source_table"],
                "source_pk": source_pk_for_row(row),
                "source_detail_json": detail_json(payload),
                "created_at": utc_now(),
            },
        )
    ]


def parse_home_run_backtest(row: sqlite3.Row, payload: dict[str, Any], resolver: MlbIdentityResolver) -> list[ParsedRow]:
    run_id = ensure_model_run(resolver.con, payload.get("model_name"), payload.get("prediction_date"), "backtest")
    player_id = resolver.player_id_by_mlb_id("mlb_predictions", payload.get("player_id"), payload.get("player_name"))
    return [
        ParsedRow(
            "home_run_backtest_rows",
            row["source_table"],
            row["legacy_row_id"],
            {
                "home_run_backtest_row_id": stable_id("hr-backtest", source_pk_for_row(row)),
                "model_run_id": run_id,
                "game_id": None,
                "player_id": player_id,
                "team_id": resolver.team_id_by_name("mlb_predictions", payload.get("team_abbrev")),
                "prediction_date": payload.get("prediction_date"),
                "model_name": payload.get("model_name"),
                "actual_home_runs": to_int(payload.get("actual_home_runs")),
                "hit_flag": to_int(payload.get("hit_flag")),
                "matched_event_keys": payload.get("matched_event_keys"),
                "source_table": row["source_table"],
                "source_pk": source_pk_for_row(row),
                "source_detail_json": detail_json(payload),
                "created_at": utc_now(),
            },
        )
    ]


def parse_identity_backtest(row: sqlite3.Row, payload: dict[str, Any], resolver: MlbIdentityResolver) -> list[ParsedRow]:
    model_id = payload.get("model_id") or "MLB-M2-player-identity-v0"
    run_id = ensure_model_run(resolver.con, model_id, payload.get("prediction_date"), "backtest")
    game_id = resolver.game_id_for_pk(payload.get("game_pk"))
    player_id = resolver.player_id_by_mlb_id("mlb_predictions", payload.get("player_id"), payload.get("player_name"))
    return [
        ParsedRow(
            "player_identity_backtest_rows",
            row["source_table"],
            row["legacy_row_id"],
            {
                "player_identity_backtest_row_id": stable_id("identity-backtest", source_pk_for_row(row)),
                "model_run_id": run_id,
                "game_id": game_id,
                "player_id": player_id,
                "prediction_date": payload.get("prediction_date"),
                "model_id": model_id,
                "backtest_id": payload.get("backtest_id"),
                "player_type": payload.get("player_type"),
                "metric": payload.get("metric"),
                "role_bucket": payload.get("role_bucket"),
                "sample_size_bucket": payload.get("sample_size_bucket"),
                "matchup_bucket": payload.get("matchup_bucket"),
                "deviation_bucket": payload.get("deviation_bucket"),
                "line_value": to_float(payload.get("line_value")),
                "market_price": to_float(payload.get("market_price")),
                "predicted_value": to_float(payload.get("predicted_value")),
                "actual_value": to_float(payload.get("actual_value")),
                "hit_flag": to_int(payload.get("hit_flag")),
                "pnl_per100": to_float(payload.get("pnl_per100")),
                "details_json": payload.get("details_json"),
                "source_table": row["source_table"],
                "source_pk": source_pk_for_row(row),
                "source_detail_json": detail_json(payload),
                "created_at": utc_now(),
            },
        )
    ]


def parse_component_settlement(row: sqlite3.Row, payload: dict[str, Any], resolver: MlbIdentityResolver) -> list[ParsedRow]:
    run_id = payload.get("run_id") or f"mlb-{payload.get('prediction_date')}-{payload.get('model_id')}"
    model_id = payload.get("model_id") or "MLB-RP36"
    ensure_exact_model_run(resolver.con, str(run_id), model_id, payload.get("prediction_date"), "component-settlement")
    team_id = resolver.team_id_by_name("mlb_predictions", payload.get("official_team_name") or payload.get("team_name"))
    player_id = resolver.player_id_by_mlb_id("mlb_predictions", payload.get("actual_pitcher_id"), payload.get("actual_pitcher_name"))
    actual_value = payload.get("actual_outs_recorded") or payload.get("candidate_count")
    return [
        ParsedRow(
            "component_settlement_rows",
            row["source_table"],
            row["legacy_row_id"],
            {
                "component_settlement_row_id": stable_id("component-settlement", source_pk_for_row(row)),
                "model_run_id": run_id,
                "component_model_id": model_id,
                "component_role": "relief-addendum",
                "game_id": None,
                "team_id": team_id,
                "player_id": player_id,
                "prediction_date": payload.get("prediction_date"),
                "settlement_status": payload.get("status") or "settled",
                "exact_hit": to_int(payload.get("exact_hit")),
                "top2_hit": to_int(payload.get("top2_hit")),
                "top3_hit": to_int(payload.get("top3_hit")),
                "actual_value": to_float(actual_value),
                "predicted_value": to_float(payload.get("candidate_count")),
                "details_json": payload.get("details_json"),
                "source_table": row["source_table"],
                "source_pk": source_pk_for_row(row),
                "source_detail_json": detail_json(payload),
                "created_at": utc_now(),
            },
        )
    ]


PARSERS = {
    "mlb_side_predictions": parse_side_prediction,
    "mlb_prop_predictions": parse_prop_prediction,
    "mlb_home_run_predictions": parse_home_run_prediction,
    "mlb_side_backtests": parse_side_backtest,
    "mlb_prop_backtests": parse_prop_backtest,
    "mlb_home_run_backtests": parse_home_run_backtest,
    "mlb_player_identity_model_backtests": parse_identity_backtest,
    "mlb_rp36_settlements": parse_component_settlement,
    "mlb_rp36_team_settlements": parse_component_settlement,
}


def parse_prediction_rows(con: sqlite3.Connection, resolver: MlbIdentityResolver, date: str | None = None) -> tuple[list[ParsedRow], dict[str, Any]]:
    parsed: list[ParsedRow] = []
    counts: dict[str, Any] = {"source_rows": 0, "parsed_rows": 0, "unparsed_rows": 0, "source_tables": {}, "targets": {}}
    for row in fetch_legacy_rows(con, PREDICTION_SOURCE_TABLES, date=date):
        counts["source_rows"] += 1
        counts["source_tables"][row["source_table"]] = counts["source_tables"].get(row["source_table"], 0) + 1
        payload = parse_legacy_json(row)
        parser = PARSERS.get(row["source_table"])
        rows = parser(row, payload, resolver) if parser else []
        if not rows:
            counts["unparsed_rows"] += 1
            continue
        parsed.extend(rows)
        for parsed_row in rows:
            counts["targets"][parsed_row.target_table] = counts["targets"].get(parsed_row.target_table, 0) + 1
    counts["parsed_rows"] = len(parsed)
    return parsed, counts


def normalize_predictions(con: sqlite3.Connection, date: str | None = None, dry_run: bool = False) -> dict[str, Any]:
    con.row_factory = sqlite3.Row
    ensure_predictions_schema(con)
    resolver = MlbIdentityResolver(con)
    before_unresolved = con.execute("select count(*) from unresolved_entities").fetchone()[0]
    rows, counts = parse_prediction_rows(con, resolver, date=date)
    report = {
        "family": "mlb_predictions",
        "date": date,
        "dry_run": dry_run,
        **counts,
        "inserted": {},
        "unresolved_rows_added": 0,
    }
    if not dry_run:
        report["inserted"] = insert_value_rows(con, [(row.target_table, row.values) for row in rows])
        con.commit()
    after_unresolved = con.execute("select count(*) from unresolved_entities").fetchone()[0]
    report["unresolved_rows_added"] = after_unresolved - before_unresolved
    if dry_run:
        con.rollback()
    return report
