#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import sqlite3
import subprocess
import sys
from datetime import date, datetime, timedelta
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[3]
DEFAULT_DB_PATH = ROOT / "data-private" / "warehouse" / "sports" / "mlb" / "sql-mlb.db"
REPORT_DIR = ROOT / "data-migration" / "reports"
WAREHOUSE_LEDGER_PATH = ROOT / "run-plans" / "mlb" / "2026-06-03-mlb-warehouse-command-ledger.md"
SCHEDULE_GAME_FEED_INGEST = ROOT / "data-migration" / "scripts" / "ingest_mlb_schedule_game_feed_raw_to_typed.py"
LINEUPS_INGEST = ROOT / "data-migration" / "scripts" / "ingest_mlb_lineups_raw_to_typed.py"
MARKETS_PROPS_INGEST = ROOT / "data-migration" / "scripts" / "ingest_mlb_markets_props_raw_to_typed.py"
PLAYER_CONTEXT_INGEST = ROOT / "data-migration" / "scripts" / "ingest_mlb_player_context_raw_to_typed.py"
HITTER_CAREER_PROFILE_FETCH = ROOT / "pipeline" / "mlb" / "fetchers" / "fetch_mlb_hitter_career_profiles.py"
VALIDATE_SCHEDULE_GAME_FEED = ROOT / "data-migration" / "scripts" / "validate_mlb_schedule_game_feed_raw_to_typed.py"
VALIDATE_LINEUPS_RAW = ROOT / "data-migration" / "scripts" / "validate_mlb_lineups_raw_to_typed.py"
VALIDATE_MARKETS_PROPS_RAW = ROOT / "data-migration" / "scripts" / "validate_mlb_markets_props_raw_to_typed.py"
VALIDATE_PLAYER_CONTEXT_RAW = ROOT / "data-migration" / "scripts" / "validate_mlb_player_context_raw_to_typed.py"
VALIDATE_REPLAY_STATE = ROOT / "data-migration" / "scripts" / "validate_mlb_replay_state_typed.py"
VERSION = "0.5.0"

LEGACY_WAREHOUSE_COMMANDS = {
    "init-db",
    "ingest-mlb-day",
    "ingest-mlb-range",
    "replay-mlb-range-from-raw",
    "prepare-mlb-day",
    "list-probable-starters",
    "derive-mlb-features",
    "derive-story-signals",
    "derive-tier2-features",
    "derive-tier3-features",
    "derive-hidden-edge-features",
    "derive-state-snapshots",
    "derive-hitter-classic-trends",
    "derive-hitter-opponent-context",
    "derive-market-context",
    "derive-mistake-shapes",
    "derive-first-inning-profiles",
    "derive-story-labels",
    "derive-state-formula-rows",
    "derive-player-identity-rows",
    "derive-pitcher-batter-kernel",
    "backtest-m2-research",
    "ingest-pitcher-war",
    "ingest-statcast-hr",
    "ingest-hitter-statcast-range",
    "ingest-hitter-career-profiles",
    "ingest-hitter-lineup-splits",
    "derive-hitter-statcast-trends",
    "derive-batter-outcomes",
    "import-predictions",
    "import-prop-predictions",
    "grade-home-run-picks",
    "grade-prop-picks",
    "list-home-runs",
    "list-first5",
    "list-bullpen-usage",
    "list-likely-relievers",
    "list-bullpen-shape",
    "list-story-signals",
}

NON_REPLACEMENT_COMMANDS = {"status", "audit-command-ledger", "validate-typed-ready"}

DAILY_VALIDATORS = [
    {
        "label": "schedule_game_feed_raw_to_typed",
        "script": VALIDATE_SCHEDULE_GAME_FEED,
        "requires_date": True,
        "supports_date": True,
    },
    {
        "label": "lineups_raw_to_typed",
        "script": VALIDATE_LINEUPS_RAW,
        "requires_date": True,
        "supports_date": True,
    },
    {
        "label": "markets_props_raw_to_typed",
        "script": VALIDATE_MARKETS_PROPS_RAW,
        "requires_date": True,
        "supports_date": True,
    },
    {
        "label": "player_context_raw_to_typed",
        "script": VALIDATE_PLAYER_CONTEXT_RAW,
        "requires_date": True,
        "supports_date": True,
    },
]

CONTRACT_VALIDATORS = [
    {
        "label": "replay_state_typed",
        "script": VALIDATE_REPLAY_STATE,
        "requires_date": False,
        "supports_date": False,
    },
    {
        "label": "results_normalization",
        "script": ROOT / "data-migration" / "scripts" / "validate_mlb_results_normalization.py",
        "requires_date": False,
        "supports_date": True,
    },
    {
        "label": "lineups_normalization",
        "script": ROOT / "data-migration" / "scripts" / "validate_mlb_lineups_normalization.py",
        "requires_date": False,
        "supports_date": True,
    },
    {
        "label": "markets_normalization",
        "script": ROOT / "data-migration" / "scripts" / "validate_mlb_markets_normalization.py",
        "requires_date": False,
        "supports_date": True,
    },
    {
        "label": "props_normalization",
        "script": ROOT / "data-migration" / "scripts" / "validate_mlb_props_normalization.py",
        "requires_date": False,
        "supports_date": True,
    },
    {
        "label": "player_context_normalization",
        "script": ROOT / "data-migration" / "scripts" / "validate_mlb_player_context_normalization.py",
        "requires_date": False,
        "supports_date": True,
    },
    {
        "label": "hitter_features_normalization",
        "script": ROOT / "data-migration" / "scripts" / "validate_mlb_hitter_features_normalization.py",
        "requires_date": False,
        "supports_date": True,
    },
    {
        "label": "pitcher_features_normalization",
        "script": ROOT / "data-migration" / "scripts" / "validate_mlb_pitcher_features_normalization.py",
        "requires_date": False,
        "supports_date": True,
    },
    {
        "label": "bullpen_features_normalization",
        "script": ROOT / "data-migration" / "scripts" / "validate_mlb_bullpen_features_normalization.py",
        "requires_date": False,
        "supports_date": True,
    },
    {
        "label": "team_features_normalization",
        "script": ROOT / "data-migration" / "scripts" / "validate_mlb_team_features_normalization.py",
        "requires_date": False,
        "supports_date": True,
    },
    {
        "label": "team_context_normalization",
        "script": ROOT / "data-migration" / "scripts" / "validate_mlb_team_context_normalization.py",
        "requires_date": False,
        "supports_date": True,
    },
    {
        "label": "environment_normalization",
        "script": ROOT / "data-migration" / "scripts" / "validate_mlb_environment_normalization.py",
        "requires_date": False,
        "supports_date": True,
    },
    {
        "label": "game_shape_normalization",
        "script": ROOT / "data-migration" / "scripts" / "validate_mlb_game_shape_normalization.py",
        "requires_date": False,
        "supports_date": True,
    },
    {
        "label": "predictions_normalization",
        "script": ROOT / "data-migration" / "scripts" / "validate_mlb_predictions_normalization.py",
        "requires_date": False,
        "supports_date": True,
    },
    {
        "label": "model_metadata_normalization",
        "script": ROOT / "data-migration" / "scripts" / "validate_mlb_model_metadata_normalization.py",
        "requires_date": False,
        "supports_date": True,
    },
]


def resolve_path(path: Path) -> Path:
    return path if path.is_absolute() else ROOT / path


def display_path(path: Path) -> str:
    try:
        return str(path.relative_to(ROOT))
    except ValueError:
        return str(path)


def parse_date(value: str) -> date:
    return datetime.strptime(value, "%Y-%m-%d").date()


def iter_dates(start_date: str, end_date: str) -> list[str]:
    start = parse_date(start_date)
    end = parse_date(end_date)
    if end < start:
        raise ValueError(f"end-date {end_date} is before start-date {start_date}")
    days: list[str] = []
    current = start
    while current <= end:
        days.append(current.isoformat())
        current += timedelta(days=1)
    return days


def connect(db_path: Path) -> sqlite3.Connection:
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    return conn


def report_path(kind: str, label: str) -> Path:
    safe_label = label.replace(":", "-").replace("/", "-")
    return REPORT_DIR / f"mlb_typed_warehouse_{kind}_{safe_label}.json"


def run_python_script(script_path: Path, args: list[str], *, stream_output: bool = True) -> dict[str, Any]:
    command = [sys.executable, str(script_path), *args]
    completed = subprocess.run(command, cwd=ROOT, text=True, capture_output=True)
    if stream_output and completed.stdout:
        print(completed.stdout, end="")
    if stream_output and completed.stderr:
        print(completed.stderr, end="", file=sys.stderr)
    return {
        "command": [display_path(Path(part)) if part.startswith(str(ROOT)) else part for part in command],
        "returncode": completed.returncode,
        "stdout": completed.stdout,
        "stderr": completed.stderr,
    }


def run_typed_adapter(
    script_path: Path,
    db_path: Path,
    date_text: str,
    *,
    dry_run: bool,
    report: Path,
    family: str,
    extra_args: list[str] | None = None,
) -> dict[str, Any]:
    args = [
        "--date",
        date_text,
        "--source-db",
        str(db_path),
        "--report",
        str(report),
    ]
    if extra_args:
        args.extend(extra_args)
    if dry_run:
        args.append("--dry-run")
    result = run_python_script(script_path, args)
    result["date"] = date_text
    result["family"] = family
    result["report_path"] = display_path(report)
    result["ok"] = result["returncode"] == 0
    return result


def run_schedule_game_feed_ingest(
    db_path: Path,
    date_text: str,
    *,
    dry_run: bool,
    report: Path,
) -> dict[str, Any]:
    return run_typed_adapter(
        SCHEDULE_GAME_FEED_INGEST,
        db_path,
        date_text,
        dry_run=dry_run,
        report=report,
        family="schedule_game_feed",
    )


def write_json_report(path: Path, payload: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8")


def table_count(conn: sqlite3.Connection, table_name: str) -> int | None:
    exists = conn.execute(
        "select 1 from sqlite_master where type in ('table', 'view') and name = ? limit 1",
        (table_name,),
    ).fetchone()
    if not exists:
        return None
    return int(conn.execute(f'select count(*) from "{table_name}"').fetchone()[0])


def source_status_rows(conn: sqlite3.Connection, date_text: str | None = None) -> list[dict[str, Any]]:
    where = "where sport = 'mlb'"
    params: list[Any] = []
    if date_text:
        where += " and source_date = ?"
        params.append(date_text)
    rows = conn.execute(
        f"""
        select source_name, source_family, source_date, last_status,
               last_completeness_status, actual_item_count, missing_item_count,
               unresolved_count, updated_at
        from source_fetch_status
        {where}
        order by source_date desc, updated_at desc
        limit 25
        """,
        params,
    ).fetchall()
    return [dict(row) for row in rows]


def status_payload(conn: sqlite3.Connection, db_path: Path, date_text: str | None = None) -> dict[str, Any]:
    tables = [
        "games",
        "starting_pitchers",
        "plate_appearances",
        "pitch_events",
        "source_fetch_status",
        "prediction_rows",
        "market_snapshots",
        "prop_market_snapshots",
    ]
    return {
        "version": VERSION,
        "db_path": display_path(db_path),
        "table_counts": {table: table_count(conn, table) for table in tables},
        "source_status": source_status_rows(conn, date_text),
    }


def print_status(payload: dict[str, Any]) -> None:
    print(f"MLB typed warehouse v{payload['version']}")
    print(f"DB: {payload['db_path']}")
    print("Table counts:")
    for table, count in payload["table_counts"].items():
        print(f"- {table}: {'missing' if count is None else count}")
    if payload["source_status"]:
        print("Recent source status:")
        for row in payload["source_status"]:
            count = row["actual_item_count"] if row["actual_item_count"] is not None else "-"
            print(
                f"- {row['source_date']} {row['source_name']} "
                f"{row['last_status']}/{row['last_completeness_status']} rows={count}"
            )


def probable_starter_rows(conn: sqlite3.Connection, date_text: str) -> list[dict[str, Any]]:
    rows = conn.execute(
        """
        select
          g.game_id,
          g.mlb_game_pk,
          g.game_date,
          g.start_time_utc,
          g.status as game_status,
          g.away_team_id,
          g.home_team_id,
          away.name as away_team,
          home.name as home_team,
          sp.team_id as pitcher_team_id,
          p.mlb_player_id as pitcher_mlb_id,
          p.name as pitcher_name,
          p.throws as pitcher_hand,
          sp.confirmation_status,
          sp.source_name,
          sp.updated_at
        from games g
        join teams away on away.team_id = g.away_team_id
        join teams home on home.team_id = g.home_team_id
        left join starting_pitchers sp on sp.game_id = g.game_id
        left join players p on p.player_id = sp.pitcher_id
        where g.game_date = ?
        order by coalesce(g.start_time_utc, ''), g.game_id, sp.team_id
        """,
        (date_text,),
    ).fetchall()
    by_game: dict[str, dict[str, Any]] = {}
    for row in rows:
        item = by_game.setdefault(
            row["game_id"],
            {
                "game_id": row["game_id"],
                "mlb_game_pk": row["mlb_game_pk"],
                "game_date": row["game_date"],
                "start_time_utc": row["start_time_utc"],
                "game_status": row["game_status"],
                "away_team": row["away_team"],
                "home_team": row["home_team"],
                "away_pitcher": None,
                "home_pitcher": None,
            },
        )
        if row["pitcher_team_id"] is None:
            continue
        pitcher = {
            "mlb_player_id": row["pitcher_mlb_id"],
            "name": row["pitcher_name"] or "TBD",
            "hand": row["pitcher_hand"],
            "confirmation_status": row["confirmation_status"],
            "source_name": row["source_name"],
            "updated_at": row["updated_at"],
        }
        if row["pitcher_team_id"] == row["away_team_id"]:
            item["away_pitcher"] = pitcher
        elif row["pitcher_team_id"] == row["home_team_id"]:
            item["home_pitcher"] = pitcher
    return list(by_game.values())


def ledger_command_rows() -> list[dict[str, str]]:
    if not WAREHOUSE_LEDGER_PATH.exists():
        return []
    rows: list[dict[str, str]] = []
    for line in WAREHOUSE_LEDGER_PATH.read_text(encoding="utf-8").splitlines():
        if not line.startswith("| `"):
            continue
        cells = [cell.strip() for cell in line.strip().strip("|").split("|")]
        if len(cells) < 7:
            continue
        command = cells[0].strip("`")
        if command == "Command":
            continue
        rows.append(
            {
                "command": command,
                "package_script": cells[1],
                "class": cells[2],
                "priority": cells[3],
                "status": cells[4].strip("`"),
                "replacement_target": cells[5],
                "next_action": cells[6],
            }
        )
    return rows


def implemented_replacement_commands(parser: argparse.ArgumentParser) -> set[str]:
    commands: set[str] = set()
    for action in parser._actions:
        if isinstance(action, argparse._SubParsersAction):
            commands.update(action.choices)
    return commands - NON_REPLACEMENT_COMMANDS


def audit_command_ledger_payload(parser: argparse.ArgumentParser) -> dict[str, Any]:
    ledger_rows = ledger_command_rows()
    ledger_commands = {row["command"] for row in ledger_rows}
    implemented = implemented_replacement_commands(parser)
    missing_from_ledger = sorted(LEGACY_WAREHOUSE_COMMANDS - ledger_commands)
    extra_in_ledger = sorted(ledger_commands - LEGACY_WAREHOUSE_COMMANDS)
    implemented_legacy_replacements = sorted(implemented & LEGACY_WAREHOUSE_COMMANDS)
    implemented_extra = sorted(implemented - LEGACY_WAREHOUSE_COMMANDS)
    missing_replacements = sorted(LEGACY_WAREHOUSE_COMMANDS - implemented)
    return {
        "version": VERSION,
        "ledger_path": display_path(WAREHOUSE_LEDGER_PATH),
        "legacy_command_count": len(LEGACY_WAREHOUSE_COMMANDS),
        "ledger_command_count": len(ledger_commands),
        "implemented_replacement_count": len(implemented_legacy_replacements),
        "implemented_replacements": implemented_legacy_replacements,
        "implemented_extra_commands": implemented_extra,
        "missing_replacements": missing_replacements,
        "ledger_missing_legacy_commands": missing_from_ledger,
        "ledger_extra_commands": extra_in_ledger,
        "ok": not missing_from_ledger and not extra_in_ledger,
    }


def print_audit_command_ledger(payload: dict[str, Any]) -> None:
    print(f"MLB typed warehouse command audit v{payload['version']}")
    print(f"Ledger: {payload['ledger_path']}")
    print(f"Legacy commands in scope: {payload['legacy_command_count']}")
    print(f"Ledger commands found: {payload['ledger_command_count']}")
    print(f"Typed replacements implemented: {payload['implemented_replacement_count']}")
    if payload["implemented_replacements"]:
        print("Implemented replacements:")
        for command in payload["implemented_replacements"]:
            print(f"- {command}")
    if payload["ledger_missing_legacy_commands"]:
        print("Ledger missing legacy commands:")
        for command in payload["ledger_missing_legacy_commands"]:
            print(f"- {command}")


def pitcher_label(pitcher: dict[str, Any] | None) -> str:
    if not pitcher:
        return "TBD"
    hand = f" ({pitcher['hand']})" if pitcher.get("hand") else ""
    status = f" [{pitcher['confirmation_status']}]" if pitcher.get("confirmation_status") else ""
    return f"{pitcher['name']}{hand}{status}"


def print_probable_starters(rows: list[dict[str, Any]], date_text: str) -> None:
    print(f"Typed probable starter games for {date_text}: {len(rows)}")
    for row in rows:
        print(
            f"- {row['away_team']} @ {row['home_team']} | "
            f"{pitcher_label(row['away_pitcher'])} vs {pitcher_label(row['home_pitcher'])}"
        )


def ingest_range_payload(
    db_path: Path,
    *,
    start_date: str,
    end_date: str,
    dry_run: bool,
    mode: str,
) -> dict[str, Any]:
    dates = iter_dates(start_date, end_date)
    results = []
    for date_text in dates:
        child_report = report_path(f"{mode}_schedule_game_feed", date_text)
        results.append(run_schedule_game_feed_ingest(db_path, date_text, dry_run=dry_run, report=child_report))
    payload = {
        "version": VERSION,
        "mode": mode,
        "db_path": display_path(db_path),
        "start_date": start_date,
        "end_date": end_date,
        "date_count": len(dates),
        "dry_run": dry_run,
        "results": results,
        "ok": all(result["ok"] for result in results),
    }
    write_json_report(report_path(mode, f"{start_date}_to_{end_date}"), payload)
    return payload


def prepare_mlb_day_payload(
    db_path: Path,
    *,
    date_text: str,
    lookback_days: int,
    dry_run: bool,
    include_lineups: bool,
    include_markets: bool,
    include_player_context: bool,
) -> dict[str, Any]:
    target = parse_date(date_text)
    start = target - timedelta(days=lookback_days)
    results: list[dict[str, Any]] = []
    for feed_date in iter_dates(start.isoformat(), date_text):
        child_report = report_path("prepare_mlb_day_schedule_game_feed", feed_date)
        results.append(run_schedule_game_feed_ingest(db_path, feed_date, dry_run=dry_run, report=child_report))
    target_adapters = [
        (include_lineups, "lineups", LINEUPS_INGEST),
        (include_markets, "markets_props", MARKETS_PROPS_INGEST),
        (include_player_context, "player_context", PLAYER_CONTEXT_INGEST),
    ]
    for enabled, family, script_path in target_adapters:
        if not enabled:
            continue
        child_report = report_path(f"prepare_mlb_day_{family}", date_text)
        results.append(
            run_typed_adapter(
                script_path,
                db_path,
                date_text,
                dry_run=dry_run,
                report=child_report,
                family=family,
            )
        )
    payload = {
        "version": VERSION,
        "mode": "prepare_mlb_day",
        "db_path": display_path(db_path),
        "date": date_text,
        "lookback_days": lookback_days,
        "lookback_start_date": start.isoformat(),
        "dry_run": dry_run,
        "include_lineups": include_lineups,
        "include_markets": include_markets,
        "include_player_context": include_player_context,
        "results": results,
        "ok": all(result["ok"] for result in results),
    }
    write_json_report(report_path("prepare_mlb_day", date_text), payload)
    return payload


def collect_hitter_profile_player_ids(
    conn: sqlite3.Connection,
    *,
    date_text: str,
    explicit_ids: list[int] | None = None,
) -> list[int]:
    ids = {int(player_id) for player_id in explicit_ids or [] if player_id}
    if ids:
        return sorted(ids)
    queries = [
        (
            """
            select distinct p.mlb_player_id
            from lineups l
            join games g on g.game_id = l.game_id
            join lineup_slots s on s.lineup_id = l.lineup_id
            join players p on p.player_id = s.player_id
            where g.game_date = ? and p.mlb_player_id is not null
            """,
            (date_text,),
        ),
        (
            """
            select distinct p.mlb_player_id
            from player_game_batting b
            join players p on p.player_id = b.player_id
            where b.game_date = ? and p.mlb_player_id is not null
            """,
            (date_text,),
        ),
        (
            """
            select distinct p.mlb_player_id
            from player_statcast_game_logs s
            join players p on p.player_id = s.player_id
            where s.game_date = ? and p.mlb_player_id is not null
            """,
            (date_text,),
        ),
    ]
    for sql, params in queries:
        try:
            for row in conn.execute(sql, params).fetchall():
                player_id = row[0]
                if player_id is not None:
                    ids.add(int(player_id))
        except sqlite3.OperationalError:
            continue
    return sorted(ids)


def hitter_career_profiles_payload(
    db_path: Path,
    *,
    date_text: str,
    player_ids: list[int] | None,
    batch_size: int,
    dry_run: bool,
    skip_fetch: bool,
) -> dict[str, Any]:
    with connect(db_path) as conn:
        resolved_player_ids = collect_hitter_profile_player_ids(conn, date_text=date_text, explicit_ids=player_ids)
    results: list[dict[str, Any]] = []
    fetch_report = report_path("fetch_hitter_career_profiles", date_text)
    if not skip_fetch:
        fetch_args = [
            "--date",
            date_text,
            "--batch-size",
            str(batch_size),
            "--report",
            str(fetch_report),
        ]
        for player_id in resolved_player_ids:
            fetch_args.extend(["--player-id", str(player_id)])
        if dry_run:
            fetch_args.append("--dry-run")
        fetch_result = run_python_script(HITTER_CAREER_PROFILE_FETCH, fetch_args)
        fetch_result.update(
            {
                "date": date_text,
                "family": "hitter_career_profile_fetch",
                "report_path": display_path(fetch_report),
                "ok": fetch_result["returncode"] == 0,
                "player_count": len(resolved_player_ids),
            }
        )
        results.append(fetch_result)

    ingest_report = report_path("ingest_hitter_career_profiles", date_text)
    results.append(
        run_typed_adapter(
            PLAYER_CONTEXT_INGEST,
            db_path,
            date_text,
            dry_run=dry_run,
            report=ingest_report,
            family="player_context",
        )
    )
    payload = {
        "version": VERSION,
        "mode": "ingest_hitter_career_profiles",
        "db_path": display_path(db_path),
        "date": date_text,
        "dry_run": dry_run,
        "skip_fetch": skip_fetch,
        "batch_size": batch_size,
        "player_count": len(resolved_player_ids),
        "results": results,
        "ok": all(result["ok"] for result in results),
    }
    write_json_report(report_path("ingest_hitter_career_profiles_wrapper", date_text), payload)
    return payload


def hitter_lineup_splits_payload(
    db_path: Path,
    *,
    date_text: str,
    lineup_file: Path | None,
    dry_run: bool,
) -> dict[str, Any]:
    child_report = report_path("ingest_hitter_lineup_splits", date_text)
    extra_args: list[str] = []
    if lineup_file:
        extra_args.extend(["--lineup-file", str(resolve_path(lineup_file))])
    result = run_typed_adapter(
        LINEUPS_INGEST,
        db_path,
        date_text,
        dry_run=dry_run,
        report=child_report,
        family="lineups",
        extra_args=extra_args,
    )
    payload = {
        "version": VERSION,
        "mode": "ingest_hitter_lineup_splits",
        "db_path": display_path(db_path),
        "date": date_text,
        "dry_run": dry_run,
        "lineup_file": None if lineup_file is None else display_path(resolve_path(lineup_file)),
        "results": [result],
        "ok": result["ok"],
    }
    write_json_report(report_path("ingest_hitter_lineup_splits_wrapper", date_text), payload)
    return payload


def validators_for_scope(scope: str) -> list[dict[str, Any]]:
    if scope == "daily":
        return DAILY_VALIDATORS
    if scope == "contracts":
        return CONTRACT_VALIDATORS
    if scope == "all":
        return [*DAILY_VALIDATORS, *CONTRACT_VALIDATORS]
    raise ValueError(f"Unknown validation scope: {scope}")


def load_child_report(path: Path) -> dict[str, Any] | None:
    if not path.exists():
        return None
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return None
    return payload if isinstance(payload, dict) else None


def run_validator(
    validator: dict[str, Any],
    db_path: Path,
    *,
    date_text: str | None,
    filter_contracts_by_date: bool,
) -> dict[str, Any]:
    label = str(validator["label"])
    script_path = Path(validator["script"])
    is_daily_validator = validator in DAILY_VALIDATORS
    if validator.get("requires_date") and not date_text:
        return {
            "label": label,
            "script": display_path(script_path),
            "ok": False,
            "returncode": None,
            "report_path": None,
            "errors": ["This validator requires --date."],
        }

    report_label = f"{label}_{date_text}" if date_text and is_daily_validator else label
    child_report = report_path("validate", report_label)
    args = ["--source-db", str(db_path), "--report", str(child_report)]
    should_pass_date = bool(
        validator.get("supports_date")
        and date_text
        and (is_daily_validator or filter_contracts_by_date)
    )
    if should_pass_date:
        args.extend(["--date", str(date_text)])

    result = run_python_script(script_path, args, stream_output=False)
    child_payload = load_child_report(child_report)
    errors = []
    if child_payload and isinstance(child_payload.get("errors"), list):
        errors = child_payload["errors"]
    elif result["returncode"] != 0:
        stderr = str(result.get("stderr") or "").strip()
        errors = [stderr] if stderr else [f"Validator exited with {result['returncode']}."]

    return {
        "label": label,
        "script": display_path(script_path),
        "command": result["command"],
        "returncode": result["returncode"],
        "report_path": display_path(child_report),
        "ok": bool(child_payload.get("ok")) if child_payload else result["returncode"] == 0,
        "errors": errors,
        "summary": {
            "source_rows": child_payload.get("source_rows") if child_payload else None,
            "target_counts": child_payload.get("target_counts") if child_payload else None,
            "counts": child_payload.get("counts") if child_payload else None,
            "checks": child_payload.get("checks") if child_payload else None,
        },
    }


def validate_typed_ready_payload(
    db_path: Path,
    *,
    scope: str,
    date_text: str | None,
    filter_contracts_by_date: bool,
) -> dict[str, Any]:
    validators = validators_for_scope(scope)
    results = [
        run_validator(
            validator,
            db_path,
            date_text=date_text,
            filter_contracts_by_date=filter_contracts_by_date,
        )
        for validator in validators
    ]
    ok_count = sum(1 for result in results if result["ok"])
    failed = [result for result in results if not result["ok"]]
    payload = {
        "version": VERSION,
        "mode": "validate_typed_ready",
        "scope": scope,
        "date": date_text,
        "filter_contracts_by_date": filter_contracts_by_date,
        "db_path": display_path(db_path),
        "validator_count": len(results),
        "ok_count": ok_count,
        "failed_count": len(failed),
        "results": results,
        "ok": not failed,
    }
    report_label = f"{scope}_{date_text}" if date_text else scope
    write_json_report(report_path("validate_typed_ready", report_label), payload)
    return payload


def print_ingest_summary(payload: dict[str, Any]) -> None:
    ok_count = sum(1 for result in payload["results"] if result["ok"])
    print(
        f"MLB typed warehouse {payload['mode']} "
        f"{payload['start_date']} to {payload['end_date']}: {ok_count}/{payload['date_count']} ok"
    )
    for result in payload["results"]:
        status = "ok" if result["ok"] else f"failed:{result['returncode']}"
        family = result.get("family") or "unknown"
        print(f"- {result['date']} {family}: {status} report={result['report_path']}")


def print_prepare_summary(payload: dict[str, Any]) -> None:
    ok_count = sum(1 for result in payload["results"] if result["ok"])
    print(
        f"MLB typed warehouse prepare {payload['date']}: "
        f"{ok_count}/{len(payload['results'])} steps ok "
        f"(lookback {payload['lookback_start_date']} to {payload['date']})"
    )
    for result in payload["results"]:
        status = "ok" if result["ok"] else f"failed:{result['returncode']}"
        print(f"- {result['date']} {result['family']}: {status} report={result['report_path']}")


def print_step_summary(payload: dict[str, Any]) -> None:
    ok_count = sum(1 for result in payload["results"] if result["ok"])
    print(f"MLB typed warehouse {payload['mode']} {payload['date']}: {ok_count}/{len(payload['results'])} steps ok")
    for result in payload["results"]:
        status = "ok" if result["ok"] else f"failed:{result['returncode']}"
        family = result.get("family") or "unknown"
        print(f"- {family}: {status} report={result.get('report_path', '-')}")


def print_validation_summary(payload: dict[str, Any]) -> None:
    report_label = f"{payload['scope']}_{payload['date']}" if payload.get("date") else payload["scope"]
    wrapper_report = display_path(report_path("validate_typed_ready", report_label))
    print(
        f"MLB typed warehouse validation {payload['scope']}: "
        f"{payload['ok_count']}/{payload['validator_count']} ok "
        f"report={wrapper_report}"
    )
    for result in payload["results"]:
        status = "ok" if result["ok"] else "failed"
        suffix = ""
        if result["errors"]:
            suffix = f" errors={len(result['errors'])}"
        print(f"- {result['label']}: {status}{suffix} report={result['report_path']}")


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Typed MLB warehouse CLI for sql-mlb.db. This is the replacement surface for legacy mlb_warehouse.py commands."
    )
    parser.add_argument("--db", type=Path, default=DEFAULT_DB_PATH, help="Typed MLB SQLite DB path.")
    parser.add_argument("--version", action="version", version=f"mlb_typed_warehouse {VERSION}")
    subparsers = parser.add_subparsers(dest="command", required=True)

    status_parser = subparsers.add_parser("status", help="Print typed MLB DB status and recent source freshness rows.")
    status_parser.add_argument("--date", help="Optional YYYY-MM-DD source status date filter.")
    status_parser.add_argument("--json", action="store_true", help="Emit JSON instead of text.")

    audit_parser = subparsers.add_parser("audit-command-ledger", help="Audit typed CLI coverage against the warehouse command ledger.")
    audit_parser.add_argument("--report", type=Path, help="Optional JSON report path.")
    audit_parser.add_argument("--json", action="store_true", help="Emit JSON instead of text.")

    validate_parser = subparsers.add_parser(
        "validate-typed-ready",
        help="Run typed MLB daily/raw and M3 contract validators, writing child reports plus a compact wrapper report.",
    )
    validate_parser.add_argument("--scope", choices=["daily", "contracts", "all"], default="contracts")
    validate_parser.add_argument("--date", help="YYYY-MM-DD date for daily validators.")
    validate_parser.add_argument(
        "--filter-contracts-by-date",
        action="store_true",
        help="Also pass --date into date-optional contract validators.",
    )
    validate_parser.add_argument("--json", action="store_true", help="Emit wrapper JSON instead of text summary.")

    ingest_day_parser = subparsers.add_parser("ingest-mlb-day", help="Ingest one local raw MLB schedule/game-feed day into typed tables.")
    ingest_day_parser.add_argument("--date", required=True, help="Game date in YYYY-MM-DD format.")
    ingest_day_parser.add_argument("--dry-run", action="store_true", help="Parse/report without writing typed DB rows.")
    ingest_day_parser.add_argument("--json", action="store_true", help="Emit wrapper JSON instead of text summary.")

    ingest_range_parser = subparsers.add_parser("ingest-mlb-range", help="Ingest a local raw MLB schedule/game-feed date range into typed tables.")
    ingest_range_parser.add_argument("--start-date", required=True, help="Start date in YYYY-MM-DD format.")
    ingest_range_parser.add_argument("--end-date", required=True, help="End date in YYYY-MM-DD format.")
    ingest_range_parser.add_argument("--dry-run", action="store_true", help="Parse/report without writing typed DB rows.")
    ingest_range_parser.add_argument("--json", action="store_true", help="Emit wrapper JSON instead of text summary.")

    replay_range_parser = subparsers.add_parser("replay-mlb-range-from-raw", help="Replay local raw MLB schedule/game-feed archives into typed tables.")
    replay_range_parser.add_argument("--start-date", required=True, help="Start date in YYYY-MM-DD format.")
    replay_range_parser.add_argument("--end-date", required=True, help="End date in YYYY-MM-DD format.")
    replay_range_parser.add_argument("--dry-run", action="store_true", help="Parse/report without writing typed DB rows.")
    replay_range_parser.add_argument("--json", action="store_true", help="Emit wrapper JSON instead of text summary.")

    prepare_parser = subparsers.add_parser("prepare-mlb-day", help="Run M3-safe typed day ingestion/preflight adapters.")
    prepare_parser.add_argument("--date", required=True, help="Target date in YYYY-MM-DD format.")
    prepare_parser.add_argument("--lookback-days", type=int, default=3, help="Schedule/game-feed lookback window.")
    prepare_parser.add_argument("--dry-run", action="store_true", help="Parse/report without writing typed DB rows.")
    prepare_parser.add_argument("--skip-lineups", action="store_true", help="Skip target-day lineups/probables adapter.")
    prepare_parser.add_argument("--skip-markets", action="store_true", help="Skip target-day markets/props adapter.")
    prepare_parser.add_argument("--skip-player-context", action="store_true", help="Skip target-day player context adapter.")
    prepare_parser.add_argument("--json", action="store_true", help="Emit wrapper JSON instead of text summary.")

    career_parser = subparsers.add_parser(
        "ingest-hitter-career-profiles",
        help="Fetch MLB Stats API hitter career profile receipts and ingest them into typed player context tables.",
    )
    career_parser.add_argument("--date", required=True, help="Snapshot date in YYYY-MM-DD format.")
    career_parser.add_argument("--player-id", action="append", dest="player_ids", type=int, help="MLB player id. Repeat as needed.")
    career_parser.add_argument("--batch-size", type=int, default=24, help="Number of player ids per Stats API request.")
    career_parser.add_argument("--skip-fetch", action="store_true", help="Skip raw fetch and only parse existing raw files.")
    career_parser.add_argument("--dry-run", action="store_true", help="Plan/parse without writing raw receipts or typed DB rows.")
    career_parser.add_argument("--json", action="store_true", help="Emit wrapper JSON instead of text summary.")

    lineup_splits_parser = subparsers.add_parser(
        "ingest-hitter-lineup-splits",
        help="Ingest a generated lineup board into typed lineup/matchup tables.",
    )
    lineup_splits_parser.add_argument("--date", required=True, help="Lineup snapshot date in YYYY-MM-DD format.")
    lineup_splits_parser.add_argument("--file", type=Path, help="Optional explicit lineup-board JSON path.")
    lineup_splits_parser.add_argument("--dry-run", action="store_true", help="Parse/report without writing typed DB rows.")
    lineup_splits_parser.add_argument("--json", action="store_true", help="Emit wrapper JSON instead of text summary.")

    probables_parser = subparsers.add_parser("list-probable-starters", help="Read probable starters from typed tables.")
    probables_parser.add_argument("--date", required=True, help="Game date in YYYY-MM-DD format.")
    probables_parser.add_argument("--json", action="store_true", help="Emit JSON instead of text.")
    return parser


def parse_args() -> tuple[argparse.Namespace, argparse.ArgumentParser]:
    parser = build_parser()
    return parser.parse_args(), parser


def main() -> int:
    args, parser = parse_args()
    db_path = resolve_path(args.db)
    if args.command == "audit-command-ledger":
        payload = audit_command_ledger_payload(parser)
        if args.report:
            report = resolve_path(args.report)
            write_json_report(report, payload)
        if args.json:
            print(json.dumps(payload, indent=2, sort_keys=True))
        else:
            print_audit_command_ledger(payload)
        return 0 if payload["ok"] else 1
    if args.command == "validate-typed-ready":
        if args.scope in {"daily", "all"} and not args.date:
            print("--date is required for daily typed readiness validators.", file=sys.stderr)
            return 2
        payload = validate_typed_ready_payload(
            db_path,
            scope=args.scope,
            date_text=args.date,
            filter_contracts_by_date=args.filter_contracts_by_date,
        )
        if args.json:
            print(json.dumps(payload, indent=2, sort_keys=True))
        else:
            print_validation_summary(payload)
        return 0 if payload["ok"] else 1
    if args.command == "ingest-mlb-day":
        payload = ingest_range_payload(
            db_path,
            start_date=args.date,
            end_date=args.date,
            dry_run=args.dry_run,
            mode="ingest_mlb_day",
        )
        if args.json:
            print(json.dumps(payload, indent=2, sort_keys=True))
        else:
            print_ingest_summary(payload)
        return 0 if payload["ok"] else 1
    if args.command == "ingest-mlb-range":
        payload = ingest_range_payload(
            db_path,
            start_date=args.start_date,
            end_date=args.end_date,
            dry_run=args.dry_run,
            mode="ingest_mlb_range",
        )
        if args.json:
            print(json.dumps(payload, indent=2, sort_keys=True))
        else:
            print_ingest_summary(payload)
        return 0 if payload["ok"] else 1
    if args.command == "replay-mlb-range-from-raw":
        payload = ingest_range_payload(
            db_path,
            start_date=args.start_date,
            end_date=args.end_date,
            dry_run=args.dry_run,
            mode="replay_mlb_range_from_raw",
        )
        if args.json:
            print(json.dumps(payload, indent=2, sort_keys=True))
        else:
            print_ingest_summary(payload)
        return 0 if payload["ok"] else 1
    if args.command == "prepare-mlb-day":
        payload = prepare_mlb_day_payload(
            db_path,
            date_text=args.date,
            lookback_days=args.lookback_days,
            dry_run=args.dry_run,
            include_lineups=not args.skip_lineups,
            include_markets=not args.skip_markets,
            include_player_context=not args.skip_player_context,
        )
        if args.json:
            print(json.dumps(payload, indent=2, sort_keys=True))
        else:
            print_prepare_summary(payload)
        return 0 if payload["ok"] else 1
    if args.command == "ingest-hitter-career-profiles":
        payload = hitter_career_profiles_payload(
            db_path,
            date_text=args.date,
            player_ids=args.player_ids,
            batch_size=args.batch_size,
            dry_run=args.dry_run,
            skip_fetch=args.skip_fetch,
        )
        if args.json:
            print(json.dumps(payload, indent=2, sort_keys=True))
        else:
            print_step_summary(payload)
        return 0 if payload["ok"] else 1
    if args.command == "ingest-hitter-lineup-splits":
        payload = hitter_lineup_splits_payload(
            db_path,
            date_text=args.date,
            lineup_file=args.file,
            dry_run=args.dry_run,
        )
        if args.json:
            print(json.dumps(payload, indent=2, sort_keys=True))
        else:
            print_step_summary(payload)
        return 0 if payload["ok"] else 1
    if args.command == "status":
        with connect(db_path) as conn:
            payload = status_payload(conn, db_path, args.date)
        if args.json:
            print(json.dumps(payload, indent=2, sort_keys=True))
        else:
            print_status(payload)
        return 0
    if args.command == "list-probable-starters":
        with connect(db_path) as conn:
            rows = probable_starter_rows(conn, args.date)
        if args.json:
            print(json.dumps({"date": args.date, "games": rows}, indent=2, sort_keys=True))
        else:
            print_probable_starters(rows, args.date)
        return 0
    raise ValueError(f"Unhandled command: {args.command}")


if __name__ == "__main__":
    raise SystemExit(main())
