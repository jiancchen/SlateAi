#!/usr/bin/env python3
from __future__ import annotations

import argparse
import hashlib
import json
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


SPORTS = ("mlb", "tennis")

MLB_CORE_TABLES = {
    "mlb_games",
    "mlb_starting_pitchers",
    "mlb_plate_appearances",
    "mlb_pitch_events",
}

TENNIS_CORE_TABLES = {
    "tennis_players",
    "tennis_matches",
    "tennis_rankings",
    "tennis_recent_matches",
    "tennis_h2h_matches",
}

MLB_ADJACENT_TABLES = {
    "park_factor_snapshots",
    "statcast_hr_leaderboard_snapshots",
    "weather_observations",
}

SHARED_MODEL_TABLES = {
    "model_runs",
    "model_run_lanes",
    "model_component_runs",
    "model_run_artifacts",
}

DATE_KEYS = (
    "snapshot_date",
    "prediction_date",
    "slate_date",
    "game_date",
    "market_date",
    "as_of_date",
    "weather_date",
    "match_date",
    "captured_at",
    "snapshot_time",
    "observed_at",
    "fetched_at",
    "generated_at",
    "updated_at",
    "created_at",
    "indexed_at",
    "locked_at",
    "end_period_ts",
    "close_time",
    "occurrence_datetime",
)

ENTITY_KEYS = (
    "game_pk",
    "game_id",
    "match_id",
    "board_match_id",
    "sofascore_event_id",
    "livesport_match_id",
    "flashscore_id",
    "player_id",
    "hitter_id",
    "pitcher_id",
    "batter_id",
    "normalized_name",
    "player_name",
    "team_name",
    "home_team",
    "away_team",
    "market_ticker",
    "event_ticker",
    "run_id",
)


def repo_root() -> Path:
    return Path(__file__).resolve().parents[2]


def default_source_db(root: Path) -> Path:
    return root / "data-private" / "warehouse" / "sports.db"


def target_db(root: Path, sport: str) -> Path:
    return root / "data-private" / "warehouse" / "sports" / sport / f"sql-{sport}.db"


def sql_ident(name: str) -> str:
    return '"' + name.replace('"', '""') + '"'


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def compact_json(value: Any) -> str:
    return json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False)


def sha256_text(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def normalize_value(value: Any) -> Any:
    if isinstance(value, bytes):
        return {"__blob_hex__": value.hex()}
    return value


def source_tables(con: sqlite3.Connection) -> list[str]:
    rows = con.execute(
        "select name from sqlite_master where type = 'table' and name not like 'sqlite_%' order by name"
    ).fetchall()
    return [row[0] for row in rows]


def included_regular_tables(con: sqlite3.Connection, sport: str) -> list[str]:
    tables = source_tables(con)
    if sport == "mlb":
        return [
            table
            for table in tables
            if (
                table.startswith("mlb_")
                and table not in MLB_CORE_TABLES
            )
            or table in MLB_ADJACENT_TABLES
        ]
    if sport == "tennis":
        return [
            table
            for table in tables
            if table.startswith("tennis_") and table not in TENNIS_CORE_TABLES
        ]
    raise ValueError(f"Unknown sport: {sport}")


def table_columns(con: sqlite3.Connection, table: str) -> list[str]:
    rows = con.execute(f"pragma table_info({sql_ident(table)})").fetchall()
    return [row[1] for row in rows]


def shared_model_run_ids(con: sqlite3.Connection, sport: str) -> set[str]:
    tables = set(source_tables(con))
    if "model_runs" not in tables:
        return set()
    return {
        row[0]
        for row in con.execute("select run_id from model_runs where sport = ?", (sport,)).fetchall()
        if row[0] is not None
    }


def shared_table_where(table: str, sport: str, run_ids: set[str]) -> tuple[str, list[Any]]:
    if table == "model_runs":
        return "where sport = ?", [sport]
    if not run_ids:
        return "where 1 = 0", []
    placeholders = ",".join("?" for _ in run_ids)
    ids = sorted(run_ids)
    if table == "model_component_runs":
        return f"where parent_run_id in ({placeholders})", ids
    if table == "model_run_artifacts":
        return f"where run_id in ({placeholders})", ids
    if table == "model_run_lanes":
        return f"where run_id in ({placeholders})", ids
    return "where 1 = 0", []


def row_source_date(row: dict[str, Any]) -> str | None:
    for key in DATE_KEYS:
        value = row.get(key)
        if value not in (None, ""):
            return str(value)
    return None


def row_entity_ref(row: dict[str, Any]) -> str | None:
    parts = []
    for key in ENTITY_KEYS:
        value = row.get(key)
        if value not in (None, ""):
            parts.append(f"{key}={value}")
        if len(parts) >= 4:
            break
    return " | ".join(parts) if parts else None


def row_source_pk(row: dict[str, Any], pk_columns: list[str]) -> str:
    if pk_columns:
        return compact_json({key: row.get(key) for key in pk_columns})
    return f"rowid:{row['__legacy_rowid__']}"


def pk_columns(con: sqlite3.Connection, table: str) -> list[str]:
    rows = con.execute(f"pragma table_info({sql_ident(table)})").fetchall()
    keyed = [(row[5], row[1]) for row in rows if row[5]]
    return [name for _, name in sorted(keyed)]


def ensure_target_schema(con: sqlite3.Connection, sport: str, timestamp: str) -> None:
    con.executescript(
        """
        create table if not exists legacy_table_rows (
          legacy_row_id text primary key,
          sport text not null,
          source_table text not null,
          source_pk text,
          source_date text,
          entity_ref text,
          row_json text not null,
          content_hash text not null,
          migrated_at text not null
        );
        create index if not exists idx_legacy_table_rows_source_date
          on legacy_table_rows (source_table, source_date);
        create index if not exists idx_legacy_table_rows_hash
          on legacy_table_rows (content_hash);
        create index if not exists idx_legacy_table_rows_entity
          on legacy_table_rows (entity_ref);
        """
    )
    checksum = sha256_text("legacy_table_rows:v1")
    con.execute(
        """
        insert or ignore into schema_migrations (migration_id, applied_at, description, checksum)
        values (?, ?, ?, ?)
        """,
        (
            "phase6_legacy_prediction_inputs_v1",
            timestamp,
            f"Phase 6 legacy prediction input staging table for {sport}",
            checksum,
        ),
    )


def append_event(root: Path, event: dict[str, Any]) -> None:
    event_path = root / "data-migration" / "migration_events.jsonl"
    with event_path.open("a", encoding="utf-8") as handle:
        handle.write(compact_json(event) + "\n")


def source_count(con: sqlite3.Connection, table: str, where_sql: str = "", params: list[Any] | None = None) -> int:
    params = params or []
    return int(con.execute(f"select count(*) from {sql_ident(table)} {where_sql}", params).fetchone()[0])


def select_rows(
    con: sqlite3.Connection,
    table: str,
    where_sql: str = "",
    params: list[Any] | None = None,
    batch_size: int = 1000,
):
    params = params or []
    cursor = con.execute(f"select rowid as __legacy_rowid__, * from {sql_ident(table)} {where_sql}", params)
    while True:
        rows = cursor.fetchmany(batch_size)
        if not rows:
            break
        columns = [description[0] for description in cursor.description]
        for raw_row in rows:
            yield {
                key: normalize_value(value)
                for key, value in zip(columns, raw_row)
            }


def table_specs(con: sqlite3.Connection, sport: str) -> list[dict[str, Any]]:
    specs = [
        {
            "source_table": table,
            "where_sql": "",
            "params": [],
            "kind": "sport_or_adjacent",
        }
        for table in included_regular_tables(con, sport)
    ]
    run_ids = shared_model_run_ids(con, sport)
    tables = set(source_tables(con))
    for table in sorted(SHARED_MODEL_TABLES & tables):
        where_sql, params = shared_table_where(table, sport, run_ids)
        specs.append(
            {
                "source_table": table,
                "where_sql": where_sql,
                "params": params,
                "kind": "shared_model",
            }
        )
    return specs


def backfill_sport(root: Path, sport: str, args: argparse.Namespace, timestamp: str) -> dict[str, Any]:
    source_path = args.source_db
    target_path = target_db(root, sport)
    if not source_path.exists():
        raise FileNotFoundError(source_path)
    if not target_path.exists():
        raise FileNotFoundError(target_path)

    with sqlite3.connect(source_path) as source_con:
        source_con.row_factory = sqlite3.Row
        specs = table_specs(source_con, sport)
        spec_counts = [
            {
                "source_table": spec["source_table"],
                "kind": spec["kind"],
                "source_count": source_count(
                    source_con,
                    spec["source_table"],
                    spec["where_sql"],
                    spec["params"],
                ),
            }
            for spec in specs
        ]

        if args.dry_run:
            return {
                "sport": sport,
                "target_db": str(target_path.relative_to(root)),
                "dry_run": True,
                "source_table_count": len(spec_counts),
                "source_row_count": sum(item["source_count"] for item in spec_counts),
                "tables": spec_counts,
                "inserted_rows": 0,
                "ok": True,
            }

        target_path.parent.mkdir(parents=True, exist_ok=True)
        with sqlite3.connect(target_path) as target_con:
            target_con.execute("pragma foreign_keys = on")
            ensure_target_schema(target_con, sport, timestamp)
            target_con.commit()
            target_con.execute("begin")
            for spec in specs:
                target_con.execute(
                    "delete from legacy_table_rows where sport = ? and source_table = ?",
                    (sport, spec["source_table"]),
                )

            inserted = 0
            for spec in specs:
                table = spec["source_table"]
                pk_cols = pk_columns(source_con, table)
                rows = []
                for row in select_rows(
                    source_con,
                    table,
                    spec["where_sql"],
                    spec["params"],
                    args.batch_size,
                ):
                    source_pk = row_source_pk(row, pk_cols)
                    row_json = compact_json({key: value for key, value in row.items() if key != "__legacy_rowid__"})
                    content_hash = sha256_text(row_json)
                    legacy_row_id = sha256_text(f"{sport}|{table}|{source_pk}")
                    rows.append(
                        (
                            legacy_row_id,
                            sport,
                            table,
                            source_pk,
                            row_source_date(row),
                            row_entity_ref(row),
                            row_json,
                            content_hash,
                            timestamp,
                        )
                    )
                    if len(rows) >= args.batch_size:
                        target_con.executemany(
                            """
                            insert or replace into legacy_table_rows (
                              legacy_row_id, sport, source_table, source_pk, source_date,
                              entity_ref, row_json, content_hash, migrated_at
                            ) values (?, ?, ?, ?, ?, ?, ?, ?, ?)
                            """,
                            rows,
                        )
                        inserted += len(rows)
                        rows = []
                if rows:
                    target_con.executemany(
                        """
                        insert or replace into legacy_table_rows (
                          legacy_row_id, sport, source_table, source_pk, source_date,
                          entity_ref, row_json, content_hash, migrated_at
                        ) values (?, ?, ?, ?, ?, ?, ?, ?, ?)
                        """,
                        rows,
                    )
                    inserted += len(rows)

            report_rel = str(args.report.relative_to(root))
            run_id = f"phase6-legacy-prediction-inputs-{sport}-{timestamp.replace(':', '-').replace('.', '-')}"
            target_con.execute(
                """
                insert into migration_runs (
                  migration_run_id, sport, phase, script_path, source_ref, target_ref,
                  status, dry_run, row_count_source, row_count_inserted,
                  row_count_updated, row_count_skipped, checksum, report_path,
                  started_at, finished_at, notes
                ) values (?, ?, '6', ?, ?, ?, 'backfilled', 0, ?, ?, 0, 0, ?, ?, ?, ?, ?)
                """,
                (
                    run_id,
                    sport,
                    "data-migration/scripts/legacy_prediction_input_backfill.py",
                    str(source_path.relative_to(root)),
                    str(target_path.relative_to(root)),
                    sum(item["source_count"] for item in spec_counts),
                    inserted,
                    sha256_text(compact_json(spec_counts)),
                    report_rel,
                    timestamp,
                    utc_now(),
                    "Backfilled legacy prediction/input tables into legacy_table_rows without touching live outputs.",
                ),
            )
            target_con.commit()

        append_event(
            root,
            {
                "event_id": f"phase6-legacy-prediction-inputs-{sport}-{timestamp.replace(':', '-').replace('.', '-')}",
                "timestamp": timestamp,
                "phase": "6",
                "area": f"{sport}_legacy_prediction_inputs",
                "source": str(source_path.relative_to(root)),
                "target": f"{target_path.relative_to(root)} legacy_table_rows",
                "parser_module": "none",
                "migration_script": "data-migration/scripts/legacy_prediction_input_backfill.py",
                "validation": "pending legacy prediction input validation",
                "status_from": "started",
                "status_to": "backfilled",
                "report_path": str(args.report.relative_to(root)),
                "checksum": sha256_text(compact_json(spec_counts)),
                "notes": "Data-only staging backfill; live prediction scripts and published outputs unchanged.",
            },
        )

    return {
        "sport": sport,
        "target_db": str(target_path.relative_to(root)),
        "dry_run": False,
        "source_table_count": len(spec_counts),
        "source_row_count": sum(item["source_count"] for item in spec_counts),
        "tables": spec_counts,
        "inserted_rows": inserted,
        "ok": inserted == sum(item["source_count"] for item in spec_counts),
    }


def parse_args() -> argparse.Namespace:
    root = repo_root()
    parser = argparse.ArgumentParser()
    parser.add_argument("--sport", choices=("all", *SPORTS), default="all")
    parser.add_argument("--source-db", type=Path, default=default_source_db(root))
    parser.add_argument(
        "--report",
        type=Path,
        default=root / "data-migration" / "reports" / "phase6_legacy_prediction_input_backfill_2026-06-02.json",
    )
    parser.add_argument("--batch-size", type=int, default=1000)
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()
    if not args.source_db.is_absolute():
        args.source_db = root / args.source_db
    if not args.report.is_absolute():
        args.report = root / args.report
    return args


def main() -> int:
    root = repo_root()
    args = parse_args()
    args.report.parent.mkdir(parents=True, exist_ok=True)
    timestamp = utc_now()
    sports = SPORTS if args.sport == "all" else (args.sport,)
    report = {
        "generated_at": timestamp,
        "phase": "6",
        "script": "data-migration/scripts/legacy_prediction_input_backfill.py",
        "dry_run": args.dry_run,
        "source_db": str(args.source_db.relative_to(root)),
        "sports": [backfill_sport(root, sport, args, timestamp) for sport in sports],
    }
    report["ok"] = all(sport["ok"] for sport in report["sports"])
    args.report.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {args.report}")
    print(json.dumps(report, indent=2))
    return 0 if report["ok"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
