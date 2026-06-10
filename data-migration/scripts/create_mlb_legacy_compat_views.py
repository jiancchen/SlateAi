#!/usr/bin/env python3

from __future__ import annotations

import argparse
import json
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[2]
DEFAULT_DB = ROOT / "data-private" / "warehouse" / "sports" / "mlb" / "sql-mlb.db"
DEFAULT_REPORT = ROOT / "data-migration" / "reports" / "create_mlb_legacy_compat_views_2026-06-03.json"
EVENTS_PATH = ROOT / "data-migration" / "normalization_events.jsonl"

def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--db", type=Path, default=DEFAULT_DB)
    parser.add_argument("--report", type=Path, default=DEFAULT_REPORT)
    parser.add_argument("--dry-run", action="store_true")
    return parser.parse_args()


def quote_ident(value: str) -> str:
    return '"' + value.replace('"', '""') + '"'


def sql_literal(value: str) -> str:
    return "'" + value.replace("'", "''") + "'"


def json_path_for_key(key: str) -> str:
    return '$."' + key.replace("\\", "\\\\").replace('"', '\\"') + '"'


def rel(path: Path) -> str:
    return str(path.resolve().relative_to(ROOT))


def infer_json_columns(conn: sqlite3.Connection, source_table: str) -> list[str]:
    keys: set[str] = set()
    for (row_json,) in conn.execute(
        """
        select row_json
        from legacy_table_rows
        where sport = 'mlb'
          and source_table = ?
        """,
        (source_table,),
    ):
        payload = json.loads(row_json)
        keys.update(str(key) for key in payload.keys())
    return sorted(keys)


def legacy_json_view_tables(conn: sqlite3.Connection) -> list[str]:
    static_view_names = set(STATIC_VIEW_SQL)
    writable_table_names = set(WRITABLE_LEGACY_TABLE_SQL)
    rows = conn.execute(
        """
        select distinct source_table
        from legacy_table_rows
        where sport = 'mlb'
          and source_table like 'mlb_%'
        order by source_table
        """
    ).fetchall()
    return [str(row[0]) for row in rows if str(row[0]) not in static_view_names and str(row[0]) not in writable_table_names]


def legacy_json_view_sql(source_table: str, columns: list[str]) -> str:
    projected = [
        f"json_extract(row_json, {sql_literal(json_path_for_key(column))}) as {quote_ident(column)}"
        for column in columns
    ]
    projected.extend(
        [
            "source_pk as _legacy_source_pk",
            "source_date as _legacy_source_date",
            "content_hash as _legacy_content_hash",
            "migrated_at as _legacy_migrated_at",
        ]
    )
    projection_sql = ",\n      ".join(projected)
    return f"""
    create view {quote_ident(source_table)} as
    select
      {projection_sql}
    from legacy_table_rows
    where sport = 'mlb'
      and source_table = {sql_literal(source_table)};
    """


STATIC_VIEW_SQL = {
    "mlb_games": """
    create view "mlb_games" as
    select
      g.mlb_game_pk as game_pk,
      g.game_date,
      away.name as away_team,
      home.name as home_team,
      g.status,
      g.start_time_utc,
      g.series_game_number,
      g.season,
      g.game_id as typed_game_id
    from games g
    join teams away on away.team_id = g.away_team_id
    join teams home on home.team_id = g.home_team_id;
    """,
    "mlb_plate_appearances": """
    create view "mlb_plate_appearances" as
    select
      g.mlb_game_pk as game_pk,
      pa.at_bat_index,
      g.game_date,
      pa.inning,
      pa.inning_half as half_inning,
      batting.name as batting_team,
      fielding.name as fielding_team,
      case
        when pa.batting_team_id = g.away_team_id then 'away'
        when pa.batting_team_id = g.home_team_id then 'home'
        else null
      end as batting_team_role,
      case
        when pa.pitching_team_id = g.away_team_id then 'away'
        when pa.pitching_team_id = g.home_team_id then 'home'
        else null
      end as fielding_team_role,
      pa.outs_before,
      pa.outs_after,
      pa.balls_final,
      pa.strikes_final,
      batter.mlb_player_id as batter_id,
      batter.name as batter_name,
      pitcher.mlb_player_id as pitcher_id,
      pitcher.name as pitcher_name,
      batter.bats as batter_side,
      pitcher.throws as pitch_hand,
      pa.men_on_base,
      pa.base_state_start,
      pa.base_state_end,
      pa.event_type as event,
      pa.event_type,
      null as description,
      pa.rbi,
      pa.is_scoring_play,
      pa.is_out,
      pa.is_at_bat,
      pa.away_score_before,
      pa.home_score_before,
      pa.away_score_after,
      pa.home_score_after,
      pa.runs_scored as run_delta,
      null as start_time,
      null as end_time,
      pa.raw_json
    from plate_appearances pa
    join games g on g.game_id = pa.game_id
    left join teams batting on batting.team_id = pa.batting_team_id
    left join teams fielding on fielding.team_id = pa.pitching_team_id
    left join players batter on batter.player_id = pa.batter_id
    left join players pitcher on pitcher.player_id = pa.pitcher_id;
    """,
    "mlb_pitch_events": """
    create view "mlb_pitch_events" as
    select
      g.mlb_game_pk as game_pk,
      pe.at_bat_index,
      pe.event_index,
      g.game_date,
      pa.inning,
      pa.inning_half as half_inning,
      batting.name as batting_team,
      fielding.name as fielding_team,
      batter.mlb_player_id as batter_id,
      pitcher.mlb_player_id as pitcher_id,
      pe.pitch_number,
      pe.balls,
      pe.strikes,
      pe.outs,
      pe.is_pitch,
      pa.event_type,
      pe.call_code,
      pe.call_description,
      pe.pitch_type_code,
      pe.pitch_type_description,
      pe.is_in_play,
      pe.is_strike,
      pe.is_ball,
      coalesce(pe.start_speed, pe.release_speed) as start_speed,
      pe.end_speed,
      pe.zone,
      pe.play_id,
      null as start_time,
      null as end_time,
      pe.raw_json
    from pitch_events pe
    left join plate_appearances pa on pa.plate_appearance_id = pe.plate_appearance_id
    join games g on g.game_id = pe.game_id
    left join teams batting on batting.team_id = pa.batting_team_id
    left join teams fielding on fielding.team_id = pa.pitching_team_id
    left join players batter on batter.player_id = pa.batter_id
    left join players pitcher on pitcher.player_id = pa.pitcher_id;
    """,
    "mlb_game_outcomes": """
    create view "mlb_game_outcomes" as
    select
      g.mlb_game_pk as game_pk,
      g.game_date,
      away.name as away_team,
      home.name as home_team,
      go.away_runs as away_runs_final,
      go.home_runs as home_runs_final,
      go.away_hits as away_hits_final,
      go.home_hits as home_hits_final,
      go.away_home_runs as away_home_runs_final,
      go.home_home_runs as home_home_runs_final,
      go.f5_away_runs as away_runs_first5,
      go.f5_home_runs as home_runs_first5,
      go.away_hits_first5 as away_hits_first5,
      go.home_hits_first5 as home_hits_first5,
      go.away_home_runs_first5 as away_home_runs_first5,
      go.home_home_runs_first5 as home_home_runs_first5,
      go.home_full_game_result,
      go.home_first5_result,
      go.home_bullpen_run_diff,
      go.total_runs as total_runs_final,
      go.f5_total_runs as total_runs_first5,
      case
        when go.home_runs > go.away_runs then 1
        when go.home_runs < go.away_runs then -1
        else 0
      end as home_full_game_run_diff,
      case
        when go.f5_home_runs > go.f5_away_runs then 1
        when go.f5_home_runs < go.f5_away_runs then -1
        else 0
      end as home_first5_run_diff,
      go.source_detail_json as raw_json,
      go.source_pk as _legacy_source_pk,
      g.game_date as _legacy_source_date,
      null as _legacy_content_hash,
      go.updated_at as _legacy_migrated_at
    from game_outcomes go
    join games g on g.game_id = go.game_id
    join teams away on away.team_id = g.away_team_id
    join teams home on home.team_id = g.home_team_id;
    """,
    "mlb_game_team_stats": """
    create view "mlb_game_team_stats" as
    select
      g.mlb_game_pk as game_pk,
      tgs.game_date,
      team.name as team_name,
      opponent.name as opponent_name,
      tgs.team_role,
      tgs.result as full_game_result,
      tgs.first5_result,
      tgs.runs_scored,
      tgs.runs_allowed,
      tgs.runs_scored_first5,
      tgs.runs_allowed_first5,
      coalesce(tgs.bullpen_runs_scored, 0) as bullpen_runs_scored,
      coalesce(tgs.bullpen_runs_allowed, 0) as bullpen_runs_allowed,
      tgs.hits,
      tgs.hits_first5,
      tgs.hits_allowed,
      tgs.hits_allowed_first5,
      tgs.home_runs,
      tgs.home_runs_first5,
      tgs.home_runs_allowed,
      tgs.home_runs_allowed_first5,
      tgs.at_bats,
      tgs.at_bats_first5,
      tgs.plate_appearances,
      tgs.plate_appearances_first5,
      tgs.walks,
      tgs.walks_allowed,
      tgs.strikeouts,
      tgs.strikeouts_recorded,
      tgs.total_bases,
      tgs.left_on_base,
      tgs.source_detail_json as raw_json,
      tgs.source_pk as _legacy_source_pk,
      tgs.game_date as _legacy_source_date,
      null as _legacy_content_hash,
      tgs.created_at as _legacy_migrated_at
    from team_game_stats tgs
    join games g on g.game_id = tgs.game_id
    left join teams team on team.team_id = tgs.team_id
    left join teams opponent on opponent.team_id = tgs.opponent_team_id;
    """,
}

WRITABLE_LEGACY_TABLE_SQL = {
    "mlb_featured_market_odds_snapshots": """
    create table if not exists "mlb_featured_market_odds_snapshots" (
      row_key text primary key,
      snapshot_time text not null,
      market_date text not null,
      game_pk integer,
      source_event_id text not null,
      commence_time text,
      home_team text not null,
      away_team text not null,
      bookmaker_key text not null,
      bookmaker_title text,
      market_key text not null,
      outcome_name text not null,
      outcome_description text,
      price real,
      point real,
      last_update text,
      source_path text,
      raw_json text
    );
    create index if not exists idx_mlb_featured_market_game_date
      on "mlb_featured_market_odds_snapshots"(market_date, game_pk, market_key);
    create index if not exists idx_mlb_featured_market_event_snapshot
      on "mlb_featured_market_odds_snapshots"(source_event_id, snapshot_time);
    """,
    "mlb_player_prop_odds_snapshots": """
    create table if not exists "mlb_player_prop_odds_snapshots" (
      row_key text primary key,
      snapshot_time text not null,
      market_date text not null,
      game_pk integer,
      source_event_id text not null,
      commence_time text,
      home_team text not null,
      away_team text not null,
      bookmaker_key text not null,
      bookmaker_title text,
      market_key text not null,
      player_name text,
      outcome_name text not null,
      outcome_description text,
      price real,
      point real,
      last_update text,
      source_path text,
      raw_json text
    );
    create index if not exists idx_mlb_player_prop_game_date
      on "mlb_player_prop_odds_snapshots"(market_date, game_pk, market_key);
    create index if not exists idx_mlb_player_prop_event_snapshot
      on "mlb_player_prop_odds_snapshots"(source_event_id, snapshot_time);
    create index if not exists idx_mlb_player_prop_player_market
      on "mlb_player_prop_odds_snapshots"(player_name, market_key, market_date);
    """,
    "mlb_side_predictions": """
    create table if not exists "mlb_side_predictions" (
      prediction_date text not null,
      model_name text not null,
      game_id text not null,
      game_pk integer,
      game_title text not null,
      away_team text not null,
      home_team text not null,
      predicted_team text not null,
      predicted_side text not null,
      confidence integer,
      volatility integer,
      model_edge real,
      source_label text,
      input_labels_json text,
      projection_json text,
      starter_leverage_index real,
      late_inning_stability_index real,
      relief_pitching_risk real,
      coinflip_pressure real,
      pick_bullpen_score real,
      opp_bullpen_score real,
      pick_starter_score real,
      opp_starter_score real,
      projected_hit_edge_for_pick real,
      hit_edge_against_pick_flag integer,
      metadata_json text,
      primary key (prediction_date, model_name, game_id)
    );
    """,
    "mlb_side_backtests": """
    create table if not exists "mlb_side_backtests" (
      prediction_date text not null,
      model_name text not null,
      game_id text not null,
      game_pk integer,
      game_title text not null,
      away_team text not null,
      home_team text not null,
      predicted_team text not null,
      predicted_side text not null,
      actual_winner text,
      actual_first5_winner text,
      hit_full_game integer not null,
      hit_first5 integer not null,
      bullpen_flip_loss integer not null,
      starter_rescue_win integer not null,
      thin_edge_flag integer not null,
      high_volatility_flag integer not null,
      hit_edge_against_pick_flag integer not null,
      predicted_runs_final integer,
      opponent_runs_final integer,
      predicted_runs_first5 integer,
      opponent_runs_first5 integer,
      predicted_bullpen_runs integer,
      opponent_bullpen_runs integer,
      bullpen_net_diff integer,
      relief_pitching_risk real,
      coinflip_pressure real,
      summary_json text,
      primary key (prediction_date, model_name, game_id)
    );
    """,
}


def table_columns(conn: sqlite3.Connection, table_name: str) -> list[str]:
    return [str(row[1]) for row in conn.execute(f"pragma table_info({quote_ident(table_name)})").fetchall()]


def sqlite_object_type(conn: sqlite3.Connection, object_name: str) -> str | None:
    row = conn.execute(
        """
        select type
        from sqlite_master
        where name = ?
        """,
        (object_name,),
    ).fetchone()
    return str(row[0]) if row else None


def drop_view_if_present(conn: sqlite3.Connection, view_name: str) -> None:
    if sqlite_object_type(conn, view_name) == "view":
        conn.execute(f"drop view {quote_ident(view_name)}")


def seed_writable_legacy_table(conn: sqlite3.Connection, source_table: str) -> int:
    columns = table_columns(conn, source_table)
    projected = [
        f"json_extract(row_json, {sql_literal(json_path_for_key(column))})"
        for column in columns
    ]
    conn.execute(
        f"""
        insert or ignore into {quote_ident(source_table)}
          ({", ".join(quote_ident(column) for column in columns)})
        select
          {", ".join(projected)}
        from legacy_table_rows
        where sport = 'mlb'
          and source_table = ?
        """,
        (source_table,),
    )
    return int(conn.execute(f"select count(*) from {quote_ident(source_table)}").fetchone()[0])


def create_views(conn: sqlite3.Connection, dry_run: bool) -> list[dict[str, Any]]:
    views: list[dict[str, Any]] = []
    for table_name, table_sql in WRITABLE_LEGACY_TABLE_SQL.items():
        row_count = conn.execute(
            """
            select count(*)
            from legacy_table_rows
            where sport = 'mlb'
              and source_table = ?
            """,
            (table_name,),
        ).fetchone()[0]
        views.append(
            {
                "view": table_name,
                "object_type": "writable_legacy_staging_table",
                "source": "legacy_table_rows",
                "columns": None,
                "rows": row_count,
            }
        )
        if dry_run:
            continue
        drop_view_if_present(conn, table_name)
        conn.executescript(table_sql)
        views[-1]["rows"] = seed_writable_legacy_table(conn, table_name)

    for source_table in legacy_json_view_tables(conn):
        columns = infer_json_columns(conn, source_table)
        row_count = conn.execute(
            """
            select count(*)
            from legacy_table_rows
            where sport = 'mlb'
              and source_table = ?
            """,
            (source_table,),
        ).fetchone()[0]
        views.append(
            {
                "view": source_table,
                "object_type": "read_only_legacy_json_view",
                "source": "legacy_table_rows",
                "columns": len(columns),
                "rows": row_count,
            }
        )
        if dry_run:
            continue
        drop_view_if_present(conn, source_table)
        conn.execute(legacy_json_view_sql(source_table, columns))

    for view_name, view_sql in STATIC_VIEW_SQL.items():
        views.append(
            {
                "view": view_name,
                "object_type": "read_only_typed_canonical_view",
                "source": "typed_canonical_tables",
                "columns": None,
                "rows": None,
            }
        )
        if dry_run:
            continue
        drop_view_if_present(conn, view_name)
        conn.execute(view_sql)

    if not dry_run:
        for view in views:
            view["rows"] = conn.execute(f"select count(*) from {quote_ident(view['view'])}").fetchone()[0]
    return views


def append_event(report: dict[str, Any]) -> None:
    EVENTS_PATH.parent.mkdir(parents=True, exist_ok=True)
    event = {
        "event": "mlb_legacy_compat_views_created",
        "generated_at": report["generated_at"],
        "script": report["script"],
        "typed_db": report["typed_db"],
        "report_path": report["report_path"],
        "dry_run": report["dry_run"],
        "views_created": report["summary"]["views_created"],
    }
    with EVENTS_PATH.open("a", encoding="utf-8") as handle:
        handle.write(json.dumps(event, sort_keys=True) + "\n")


def main() -> None:
    args = parse_args()
    db_path = args.db.resolve()
    report_path = args.report.resolve()
    if not db_path.exists():
        raise FileNotFoundError(db_path)

    with sqlite3.connect(db_path) as conn:
        conn.row_factory = sqlite3.Row
        views = create_views(conn, args.dry_run)
        if args.dry_run:
            conn.rollback()
        else:
            conn.commit()

    report = {
        "ok": True,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "script": "data-migration/scripts/create_mlb_legacy_compat_views.py",
        "typed_db": rel(db_path),
        "report_path": rel(report_path),
        "dry_run": args.dry_run,
        "summary": {
            "objects_created": 0 if args.dry_run else len(views),
            "objects_planned": len(views),
            "views_created": 0 if args.dry_run else sum(1 for view in views if str(view.get("object_type", "")).endswith("_view")),
            "writable_tables_created": 0 if args.dry_run else sum(1 for view in views if view.get("object_type") == "writable_legacy_staging_table"),
        },
        "views": views,
    }
    report_path.parent.mkdir(parents=True, exist_ok=True)
    report_path.write_text(json.dumps(report, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    if not args.dry_run:
        append_event(report)
    print(json.dumps(report["summary"], indent=2, sort_keys=True))


if __name__ == "__main__":
    main()
