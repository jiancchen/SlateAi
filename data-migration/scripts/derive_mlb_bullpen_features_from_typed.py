#!/usr/bin/env python3
from __future__ import annotations

import argparse
import hashlib
import json
import sqlite3
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from pipeline.mlb.warehouse.mlb_warehouse import (  # noqa: E402
    build_bullpen_usage_and_chain_rows,
    build_team_bullpen_shape_row,
)
from pipeline.sources.mlb.normalization.bullpen_features import normalize_bullpen_features  # noqa: E402
from pipeline.sources.mlb.normalization.common import compact_json, utc_now, write_report  # noqa: E402


SOURCE_TABLES = {
    "usage": "mlb_bullpen_usage",
    "chain": "mlb_likely_relief_chains",
    "shape": "mlb_team_bullpen_shape_daily",
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--date", required=True, help="As-of date to derive, YYYY-MM-DD.")
    parser.add_argument(
        "--source-db",
        type=Path,
        default=ROOT / "data-private" / "warehouse" / "sports" / "mlb" / "sql-mlb.db",
    )
    parser.add_argument(
        "--report",
        type=Path,
        default=ROOT / "data-migration" / "reports" / "derive_mlb_bullpen_features_from_typed.json",
    )
    return parser.parse_args()


def legacy_row_id(source_table: str, source_pk: str) -> str:
    payload = f"mlb|{source_table}|{source_pk}"
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()[:24]


def insert_legacy_row(
    con: sqlite3.Connection,
    *,
    source_table: str,
    source_pk: str,
    source_date: str,
    entity_ref: str | None,
    row_json: dict,
) -> None:
    row_text = compact_json(row_json)
    content_hash = hashlib.sha256(row_text.encode("utf-8")).hexdigest()
    con.execute(
        """
        insert into legacy_table_rows (
          legacy_row_id, sport, source_table, source_pk, source_date,
          entity_ref, row_json, content_hash, migrated_at
        ) values (?, 'mlb', ?, ?, ?, ?, ?, ?, ?)
        on conflict(legacy_row_id) do update set
          source_pk = excluded.source_pk,
          source_date = excluded.source_date,
          entity_ref = excluded.entity_ref,
          row_json = excluded.row_json,
          content_hash = excluded.content_hash,
          migrated_at = excluded.migrated_at
        """,
        (
            legacy_row_id(source_table, source_pk),
            source_table,
            source_pk,
            source_date,
            entity_ref,
            row_text,
            content_hash,
            utc_now(),
        ),
    )


def scheduled_team_pairs(con: sqlite3.Connection, date_text: str) -> list[tuple[str, str]]:
    rows = con.execute(
        """
        select away.name as away_team, home.name as home_team
        from games g
        join teams away on away.team_id = g.away_team_id
        join teams home on home.team_id = g.home_team_id
        where g.game_date = ?
        order by g.start_time_utc, g.mlb_game_pk
        """,
        (date_text,),
    ).fetchall()
    pairs = []
    for row in rows:
        pairs.append((row["away_team"], row["home_team"]))
        pairs.append((row["home_team"], row["away_team"]))
    return pairs


def derive_for_date(con: sqlite3.Connection, date_text: str) -> dict:
    con.row_factory = sqlite3.Row
    pairs = scheduled_team_pairs(con, date_text)
    seen_teams: set[str] = set()
    inserted = {table: 0 for table in SOURCE_TABLES.values()}

    for team_name, opponent_name in pairs:
        if not team_name or team_name in seen_teams:
            continue
        seen_teams.add(team_name)
        reliever_rows = con.execute(
            """
            select *
            from mlb_pitcher_appearances
            where team_name = ?
              and pitcher_role = 'reliever'
              and game_date < ?
            order by game_date desc, game_pk desc, entry_order asc
            """,
            (team_name, date_text),
        ).fetchall()
        usage_rows, chain_rows = build_bullpen_usage_and_chain_rows(
            date_text, team_name, opponent_name, reliever_rows
        )
        shape_row = build_team_bullpen_shape_row(date_text, team_name, opponent_name, reliever_rows)

        for row in usage_rows:
            source_pk = compact_json(
                {"as_of_date": date_text, "team_name": team_name, "pitcher_id": row.get("pitcher_id")}
            )
            insert_legacy_row(
                con,
                source_table=SOURCE_TABLES["usage"],
                source_pk=source_pk,
                source_date=date_text,
                entity_ref=str(row.get("pitcher_id") or team_name),
                row_json=row,
            )
            inserted[SOURCE_TABLES["usage"]] += 1

        for row in chain_rows:
            source_pk = compact_json(
                {
                    "as_of_date": date_text,
                    "team_name": team_name,
                    "predicted_rank": row.get("predicted_rank"),
                    "pitcher_id": row.get("pitcher_id"),
                }
            )
            insert_legacy_row(
                con,
                source_table=SOURCE_TABLES["chain"],
                source_pk=source_pk,
                source_date=date_text,
                entity_ref=str(row.get("pitcher_id") or team_name),
                row_json=row,
            )
            inserted[SOURCE_TABLES["chain"]] += 1

        if shape_row:
            source_pk = compact_json({"as_of_date": date_text, "team_name": team_name})
            insert_legacy_row(
                con,
                source_table=SOURCE_TABLES["shape"],
                source_pk=source_pk,
                source_date=date_text,
                entity_ref=team_name,
                row_json=shape_row,
            )
            inserted[SOURCE_TABLES["shape"]] += 1

    normalized = normalize_bullpen_features(con, date=date_text, dry_run=False)
    return {
        "date": date_text,
        "scheduled_team_count": len(seen_teams),
        "legacy_inserted": inserted,
        "normalized": normalized,
    }


def main() -> int:
    args = parse_args()
    source_db = args.source_db if args.source_db.is_absolute() else ROOT / args.source_db
    report_path = args.report if args.report.is_absolute() else ROOT / args.report
    with sqlite3.connect(source_db) as con:
        con.row_factory = sqlite3.Row
        payload = derive_for_date(con, args.date)
        con.commit()
    payload.update(
        {
            "ok": True,
            "generated_at": utc_now(),
            "script": "data-migration/scripts/derive_mlb_bullpen_features_from_typed.py",
            "source_db": str(source_db.relative_to(ROOT)),
        }
    )
    write_report(report_path, payload)
    print(json.dumps(payload, indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
