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

LEGACY_JSON_VIEW_TABLES = [
    "mlb_game_outcomes",
    "mlb_hitter_career_profiles",
    "mlb_hitter_opponent_context_snapshots",
    "mlb_hitter_statcast_trend_snapshots",
    "mlb_home_run_backtests",
    "mlb_home_run_predictions",
    "mlb_prop_backtests",
    "mlb_prop_predictions",
    "mlb_side_backtests",
    "mlb_side_predictions",
]


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
}


def create_views(conn: sqlite3.Connection, dry_run: bool) -> list[dict[str, Any]]:
    views: list[dict[str, Any]] = []
    for source_table in LEGACY_JSON_VIEW_TABLES:
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
                "source": "legacy_table_rows",
                "columns": len(columns),
                "rows": row_count,
            }
        )
        if dry_run:
            continue
        conn.execute(f"drop view if exists {quote_ident(source_table)}")
        conn.execute(legacy_json_view_sql(source_table, columns))

    for view_name, view_sql in STATIC_VIEW_SQL.items():
        views.append(
            {
                "view": view_name,
                "source": "typed_canonical_tables",
                "columns": None,
                "rows": None,
            }
        )
        if dry_run:
            continue
        conn.execute(f"drop view if exists {quote_ident(view_name)}")
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
            "views_created": 0 if args.dry_run else len(views),
            "views_planned": len(views),
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
