#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import sqlite3
import sys
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[2]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from pipeline.sources.mlb.normalization.common import append_normalization_event, compact_json, utc_now, write_report


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--typed-db",
        type=Path,
        default=ROOT / "data-private" / "warehouse" / "sports" / "mlb" / "sql-mlb.db",
    )
    parser.add_argument(
        "--legacy-db",
        type=Path,
        default=ROOT / "data-private" / "warehouse" / "sports.db",
    )
    parser.add_argument(
        "--report",
        type=Path,
        default=ROOT / "data-migration" / "reports" / "validate_mlb_core_feed_parity_2026-06-03.json",
    )
    args = parser.parse_args()
    if not args.typed_db.is_absolute():
        args.typed_db = ROOT / args.typed_db
    if not args.legacy_db.is_absolute():
        args.legacy_db = ROOT / args.legacy_db
    if not args.report.is_absolute():
        args.report = ROOT / args.report
    return args


def scalar(con: sqlite3.Connection, sql: str, params: tuple[Any, ...] = ()) -> int:
    return int(con.execute(sql, params).fetchone()[0] or 0)


def rows(con: sqlite3.Connection, sql: str, params: tuple[Any, ...] = ()) -> list[dict[str, Any]]:
    return [dict(row) for row in con.execute(sql, params).fetchall()]


def attach_legacy(con: sqlite3.Connection, legacy_db: Path) -> None:
    con.execute("attach database ? as legacy", (str(legacy_db),))


def validate(args: argparse.Namespace) -> dict[str, Any]:
    if not args.typed_db.exists():
        raise FileNotFoundError(f"Missing typed DB: {args.typed_db}")
    if not args.legacy_db.exists():
        raise FileNotFoundError(f"Missing legacy DB: {args.legacy_db}")

    with sqlite3.connect(args.typed_db) as con:
        con.row_factory = sqlite3.Row
        attach_legacy(con, args.legacy_db)
        counts = {
            "legacy_games": scalar(con, "select count(*) from legacy.mlb_games"),
            "typed_games": scalar(con, "select count(*) from games"),
            "legacy_starting_pitchers": scalar(
                con,
                "select count(*) from legacy.mlb_starting_pitchers where pitcher_id is not null",
            ),
            "typed_starting_pitchers": scalar(con, "select count(*) from starting_pitchers"),
            "legacy_plate_appearances": scalar(con, "select count(*) from legacy.mlb_plate_appearances"),
            "typed_plate_appearances": scalar(con, "select count(*) from plate_appearances"),
            "legacy_pitch_events": scalar(con, "select count(*) from legacy.mlb_pitch_events"),
            "typed_pitch_events": scalar(con, "select count(*) from pitch_events"),
        }
        checks = {
            "legacy_games_without_typed_match": scalar(
                con,
                """
                select count(*)
                from legacy.mlb_games legacy_game
                left join games typed_game on typed_game.mlb_game_pk = legacy_game.game_pk
                where typed_game.game_id is null
                """,
            ),
            "typed_games_without_legacy_match": scalar(
                con,
                """
                select count(*)
                from games typed_game
                left join legacy.mlb_games legacy_game on legacy_game.game_pk = typed_game.mlb_game_pk
                where legacy_game.game_pk is null
                """,
            ),
            "game_field_mismatches": scalar(
                con,
                """
                select count(*)
                from legacy.mlb_games legacy_game
                join games typed_game on typed_game.mlb_game_pk = legacy_game.game_pk
                where legacy_game.game_date != typed_game.game_date
                   or coalesce(legacy_game.game_datetime, '') != coalesce(typed_game.start_time_utc, '')
                   or coalesce(legacy_game.status, '') != coalesce(typed_game.status, '')
                   or 'mlb-team-' || lower(replace(legacy_game.home_team, ' ', '-')) != typed_game.home_team_id
                   or 'mlb-team-' || lower(replace(legacy_game.away_team, ' ', '-')) != typed_game.away_team_id
                   or coalesce('mlb-venue-' || lower(replace(legacy_game.venue_name, ' ', '-')), '') != coalesce(typed_game.venue_id, '')
                """,
            ),
            "legacy_starting_pitchers_without_typed_match": scalar(
                con,
                """
                select count(*)
                from legacy.mlb_starting_pitchers legacy_sp
                join legacy.mlb_games legacy_game on legacy_game.game_pk = legacy_sp.game_pk
                left join starting_pitchers typed_sp
                  on typed_sp.game_id = 'mlb-' || legacy_sp.game_pk
                 and typed_sp.team_id = case
                   when legacy_sp.team_role = 'home' then 'mlb-team-' || lower(replace(legacy_game.home_team, ' ', '-'))
                   when legacy_sp.team_role = 'away' then 'mlb-team-' || lower(replace(legacy_game.away_team, ' ', '-'))
                 end
                 and typed_sp.pitcher_id = 'mlb-player-' || legacy_sp.pitcher_id
                where legacy_sp.pitcher_id is not null
                  and typed_sp.game_id is null
                """,
            ),
            "typed_starting_pitchers_without_legacy_match": scalar(
                con,
                """
                select count(*)
                from starting_pitchers typed_sp
                join games typed_game on typed_game.game_id = typed_sp.game_id
                left join legacy.mlb_starting_pitchers legacy_sp
                  on legacy_sp.game_pk = typed_game.mlb_game_pk
                 and legacy_sp.team_role = case
                   when typed_sp.team_id = typed_game.home_team_id then 'home'
                   when typed_sp.team_id = typed_game.away_team_id then 'away'
                 end
                 and 'mlb-player-' || legacy_sp.pitcher_id = typed_sp.pitcher_id
                where legacy_sp.game_pk is null
                """,
            ),
            "legacy_game_scores_without_typed_outcome_match": scalar(
                con,
                """
                select count(*)
                from legacy.mlb_games legacy_game
                join game_outcomes typed_outcome on typed_outcome.game_id = 'mlb-' || legacy_game.game_pk
                where legacy_game.away_score is not null
                  and legacy_game.home_score is not null
                  and (
                    legacy_game.away_score != typed_outcome.away_runs
                    or legacy_game.home_score != typed_outcome.home_runs
                  )
                """,
            ),
            "plate_appearance_row_count_delta": counts["typed_plate_appearances"] - counts["legacy_plate_appearances"],
            "pitch_event_row_count_delta": counts["typed_pitch_events"] - counts["legacy_pitch_events"],
        }
        samples = {
            "game_field_mismatches": rows(
                con,
                """
                select
                  legacy_game.game_pk,
                  legacy_game.game_date as legacy_date,
                  typed_game.game_date as typed_date,
                  legacy_game.status as legacy_status,
                  typed_game.status as typed_status,
                  legacy_game.home_team as legacy_home,
                  typed_game.home_team_id as typed_home_id,
                  legacy_game.away_team as legacy_away,
                  typed_game.away_team_id as typed_away_id
                from legacy.mlb_games legacy_game
                join games typed_game on typed_game.mlb_game_pk = legacy_game.game_pk
                where legacy_game.game_date != typed_game.game_date
                   or coalesce(legacy_game.game_datetime, '') != coalesce(typed_game.start_time_utc, '')
                   or coalesce(legacy_game.status, '') != coalesce(typed_game.status, '')
                   or 'mlb-team-' || lower(replace(legacy_game.home_team, ' ', '-')) != typed_game.home_team_id
                   or 'mlb-team-' || lower(replace(legacy_game.away_team, ' ', '-')) != typed_game.away_team_id
                limit 20
                """,
            ),
            "legacy_starting_pitchers_without_typed_match": rows(
                con,
                """
                select legacy_sp.game_pk, legacy_sp.team_role, legacy_sp.pitcher_id, legacy_sp.pitcher_name
                from legacy.mlb_starting_pitchers legacy_sp
                join legacy.mlb_games legacy_game on legacy_game.game_pk = legacy_sp.game_pk
                left join starting_pitchers typed_sp
                  on typed_sp.game_id = 'mlb-' || legacy_sp.game_pk
                 and typed_sp.team_id = case
                   when legacy_sp.team_role = 'home' then 'mlb-team-' || lower(replace(legacy_game.home_team, ' ', '-'))
                   when legacy_sp.team_role = 'away' then 'mlb-team-' || lower(replace(legacy_game.away_team, ' ', '-'))
                 end
                 and typed_sp.pitcher_id = 'mlb-player-' || legacy_sp.pitcher_id
                where legacy_sp.pitcher_id is not null
                  and typed_sp.game_id is null
                limit 20
                """,
            ),
        }
        source_snapshot_coverage = {
            "legacy_mlb_source_snapshots": scalar(
                con,
                """
                select count(*)
                from legacy.source_snapshots
                where source_key like 'mlb.%'
                   or content_path like '%/mlb/%'
                """,
            ),
            "typed_mlb_source_snapshots": scalar(
                con,
                "select count(*) from source_snapshots where sport = 'mlb'",
            ),
            "typed_games_with_source_snapshot_id": scalar(
                con,
                "select count(*) from games where source_snapshot_id is not null and source_snapshot_id != ''",
            ),
            "typed_games_with_resolving_source_snapshot_id": scalar(
                con,
                """
                select count(*)
                from games typed_game
                join source_snapshots snapshot on snapshot.source_snapshot_id = typed_game.source_snapshot_id
                where typed_game.source_snapshot_id is not null
                  and typed_game.source_snapshot_id != ''
                """,
            ),
            "legacy_game_raw_paths": scalar(
                con,
                "select count(distinct raw_path) from legacy.mlb_games where raw_path is not null and raw_path != ''",
            ),
            "legacy_game_raw_paths_in_typed_snapshots": scalar(
                con,
                """
                select count(distinct legacy_game.raw_path)
                from legacy.mlb_games legacy_game
                join source_snapshots snapshot on snapshot.local_path = legacy_game.raw_path
                where legacy_game.raw_path is not null
                  and legacy_game.raw_path != ''
                """,
            ),
        }
        con.execute("detach database legacy")

    blocking_checks = [
        "legacy_games_without_typed_match",
        "typed_games_without_legacy_match",
        "game_field_mismatches",
        "legacy_starting_pitchers_without_typed_match",
        "typed_starting_pitchers_without_legacy_match",
        "legacy_game_scores_without_typed_outcome_match",
        "plate_appearance_row_count_delta",
        "pitch_event_row_count_delta",
    ]
    errors = [f"{check}: {checks[check]}" for check in blocking_checks if checks[check]]
    warnings: list[str] = []
    if source_snapshot_coverage["typed_games_with_source_snapshot_id"] != counts["typed_games"]:
        warnings.append("Not every typed game has a direct source_snapshot_id; source snapshot coverage remains a separate cutover gate.")
    if source_snapshot_coverage["legacy_mlb_source_snapshots"] != source_snapshot_coverage["typed_mlb_source_snapshots"]:
        warnings.append("Legacy and typed MLB source snapshot counts differ; run source snapshot coverage phase before final sports.db retirement.")

    return {
        "generated_at": utc_now(),
        "script": "data-migration/scripts/validate_mlb_core_feed_parity.py",
        "typed_db": str(args.typed_db.relative_to(ROOT)),
        "legacy_db": str(args.legacy_db.relative_to(ROOT)),
        "counts": counts,
        "checks": checks,
        "source_snapshot_coverage": source_snapshot_coverage,
        "samples": samples,
        "ok": not errors,
        "errors": errors,
        "warnings": warnings,
    }


def main() -> int:
    args = parse_args()
    report = validate(args)
    write_report(args.report, report)
    append_normalization_event(
        ROOT,
        {
            "event_id": f"validate-mlb-core-feed-parity-{utc_now().replace(':', '-').replace('.', '-')}",
            "timestamp": utc_now(),
            "phase": "M3-D3",
            "area": "mlb_core_feed_parity",
            "source": "data-private/warehouse/sports.db:mlb_games,mlb_starting_pitchers,mlb_plate_appearances,mlb_pitch_events",
            "target": "sql-mlb.db:games,starting_pitchers,plate_appearances,pitch_events,game_outcomes",
            "parser_module": "none",
            "migration_script": "data-migration/scripts/validate_mlb_core_feed_parity.py",
            "validation": "passed" if report["ok"] else "; ".join(report["errors"]),
            "status_from": "replay-state-backfilled",
            "status_to": "core-feed-parity-validated" if report["ok"] else "blocked",
            "report_path": str(args.report.relative_to(ROOT)),
            "checksum": None,
            "notes": compact_json(
                {
                    "counts": report["counts"],
                    "checks": report["checks"],
                    "source_snapshot_warnings": report["warnings"],
                }
            ),
        },
    )
    print(json.dumps(report, indent=2, sort_keys=True))
    return 0 if report["ok"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
