#!/usr/bin/env python3
"""Read-only tennis warehouse shape audit.

This script classifies tennis warehouse tables and reports the first-pass
canonical/quarantine evidence needed before any replacement model design.
"""

from __future__ import annotations

import argparse
import json
import sqlite3
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


DEFAULT_DB = Path("data-private/warehouse/sports/tennis/sql-tennis.db")
DEFAULT_JSON = Path("data-migration/reports/tennis_data_shape_audit.json")
DEFAULT_MARKDOWN = Path("data-migration/reports/tennis_data_shape_audit.md")

CORE_TABLES = {
    "matches",
    "match_players",
    "players",
    "tournaments",
    "rankings",
    "recent_matches",
    "h2h_matches",
    "match_stat_rows",
    "replay_games",
    "replay_points",
    "service_pressure_snapshots",
}

MODEL_TABLES = {
    "model_runs",
    "model_artifacts",
    "prediction_rows",
    "settlement_rows",
    "tennis_model_runs",
    "tennis_predictions",
    "tennis_prediction_grades",
    "tennis_model_run_outputs",
    "tennis_model_run_inputs",
    "tennis_model_run_metrics",
    "tennis_model_run_lane_grades",
    "tennis_model_run_settlements",
    "tennis_model_run_training_rows",
}

PROVENANCE_TABLES = {
    "source_snapshots",
    "source_fetch_runs",
    "source_fetch_status",
    "source_fetch_policies",
    "migration_runs",
    "export_manifests",
    "health_checks",
    "schema_migrations",
    "tennis_schema_migrations",
}

LEGACY_TABLES = {"legacy_table_rows"}

CRITICAL_COLUMNS = {
    "matches": ["match_id", "match_date", "start_time_utc", "status"],
    "match_players": ["match_id", "player_id", "side"],
    "players": ["player_id", "name", "canonical_name"],
    "market_snapshots": ["market_snapshot_id", "match_id", "player_id", "source_name", "market_type", "selection", "captured_at"],
    "prediction_rows": ["prediction_row_id", "model_run_id", "match_id", "lane", "market_type", "selection"],
    "settlement_rows": ["prediction_row_id"],
    "source_fetch_status": ["sport", "source_name", "source_date", "last_status", "cache_valid_until"],
    "source_snapshots": ["source_snapshot_id", "source_name", "sport", "source_url", "captured_at"],
    "tennislive_match_sources": ["match_id", "source_match_url", "last_source_snapshot_id", "active"],
    "tennislive_match_summaries": ["match_id", "match_date", "player1_name", "player2_name", "source_snapshot_id", "captured_at"],
    "tennislive_player_sources": ["player_id", "source_player_url", "last_source_snapshot_id", "active"],
}

DATE_COLUMNS = [
    "match_date",
    "source_date",
    "run_date",
    "slate_date",
    "captured_at",
    "created_at",
    "updated_at",
    "last_ingested_at",
    "last_success_at",
    "started_at",
    "finished_at",
]


@dataclass(frozen=True)
class ColumnInfo:
    name: str
    type: str
    not_null: bool
    default: Any
    pk_position: int


def connect(db_path: Path) -> sqlite3.Connection:
    con = sqlite3.connect(db_path)
    con.row_factory = sqlite3.Row
    return con


def rows(con: sqlite3.Connection, sql: str, params: tuple[Any, ...] = ()) -> list[dict[str, Any]]:
    return [dict(row) for row in con.execute(sql, params).fetchall()]


def one(con: sqlite3.Connection, sql: str, params: tuple[Any, ...] = ()) -> Any:
    return con.execute(sql, params).fetchone()[0]


def sql_ident(name: str) -> str:
    return '"' + name.replace('"', '""') + '"'


def table_names(con: sqlite3.Connection) -> list[str]:
    return [
        row["name"]
        for row in con.execute(
            """
            select name
            from sqlite_master
            where type = 'table'
              and name not like 'sqlite_%'
            order by name
            """
        )
    ]


def table_columns(con: sqlite3.Connection, table: str) -> list[ColumnInfo]:
    result = []
    for row in con.execute(f"pragma table_info({sql_ident(table)})"):
        result.append(
            ColumnInfo(
                name=row["name"],
                type=row["type"],
                not_null=bool(row["notnull"]),
                default=row["dflt_value"],
                pk_position=int(row["pk"] or 0),
            )
        )
    return result


def classify_table(table: str) -> str:
    if table.startswith("tennislive_"):
        return "source_native_tennislive"
    if table in CORE_TABLES:
        return "canonical_core_or_sidecar"
    if table in MODEL_TABLES or table.startswith("tennis_model_"):
        return "model_or_output"
    if table in PROVENANCE_TABLES:
        return "provenance"
    if table in LEGACY_TABLES or table.startswith("legacy_"):
        return "legacy"
    if "market" in table or table.startswith("kalshi_"):
        return "market"
    if table.startswith("tennis_flashscore") or table.startswith("tennis_sofascore") or table.startswith("tennis_livesport"):
        return "archived_or_secondary_source"
    if table.startswith("tennis_"):
        return "tennis_derived_or_legacy"
    if "alias" in table or "identity" in table or "unresolved" in table:
        return "identity_governance"
    return "other"


def date_range_for_table(con: sqlite3.Connection, table: str, columns: list[ColumnInfo]) -> dict[str, Any] | None:
    names = {column.name for column in columns}
    for column in DATE_COLUMNS:
        if column not in names:
            continue
        row = con.execute(
            f"""
            select min({sql_ident(column)}) as min_value,
                   max({sql_ident(column)}) as max_value
            from {sql_ident(table)}
            where {sql_ident(column)} is not null
              and {sql_ident(column)} != ''
            """
        ).fetchone()
        if row and (row["min_value"] is not None or row["max_value"] is not None):
            return {"column": column, "min": row["min_value"], "max": row["max_value"]}
    return None


def critical_nulls(con: sqlite3.Connection, table: str, columns: list[ColumnInfo]) -> dict[str, int]:
    configured = CRITICAL_COLUMNS.get(table, [])
    names = {column.name for column in columns}
    counts: dict[str, int] = {}
    for column in configured:
        if column not in names:
            continue
        counts[column] = int(
            one(
                con,
                f"""
                select count(*)
                from {sql_ident(table)}
                where {sql_ident(column)} is null
                   or {sql_ident(column)} = ''
                """,
            )
        )
    return counts


def audit_tables(con: sqlite3.Connection) -> list[dict[str, Any]]:
    inventory = []
    for table in table_names(con):
        columns = table_columns(con, table)
        row_count = int(one(con, f"select count(*) from {sql_ident(table)}"))
        inventory.append(
            {
                "table": table,
                "classification": classify_table(table),
                "row_count": row_count,
                "primary_key": [column.name for column in columns if column.pk_position],
                "date_range": date_range_for_table(con, table, columns),
                "critical_nulls": critical_nulls(con, table, columns),
                "columns": [
                    {
                        "name": column.name,
                        "type": column.type,
                        "not_null": column.not_null,
                        "default": column.default,
                        "pk_position": column.pk_position,
                    }
                    for column in columns
                ],
            }
        )
    return inventory


def date_clause(alias: str, start_date: str | None, end_date: str | None) -> tuple[str, list[Any]]:
    parts = []
    params: list[Any] = []
    if start_date:
        parts.append(f"{alias}.match_date >= ?")
        params.append(start_date)
    if end_date:
        parts.append(f"{alias}.match_date <= ?")
        params.append(end_date)
    if not parts:
        return "", params
    return " and " + " and ".join(parts), params


def audit_match_shapes(con: sqlite3.Connection, start_date: str | None, end_date: str | None) -> dict[str, Any]:
    scoped_clause, params = date_clause("m", start_date, end_date)
    total_matches = int(one(con, f"select count(*) from matches m where 1=1{scoped_clause}", tuple(params)))
    tennislive_matches = int(
        one(
            con,
            f"""
            select count(*)
            from matches m
            join tennislive_match_sources tl on tl.match_id = m.match_id and tl.active = 1
            where 1=1{scoped_clause}
            """,
            tuple(params),
        )
    )
    participant_anomalies = rows(
        con,
        f"""
        select m.match_id,
               m.match_date,
               m.status,
               count(mp.player_id) as participant_rows,
               count(distinct mp.player_id) as distinct_players,
               group_concat(mp.side) as sides
        from matches m
        left join match_players mp on mp.match_id = m.match_id
        where 1=1{scoped_clause}
        group by m.match_id
        having participant_rows != 2 or distinct_players != 2
        order by m.match_date desc, m.match_id
        limit 25
        """,
        tuple(params),
    )
    participant_anomaly_count = int(
        one(
            con,
            f"""
            select count(*)
            from (
              select m.match_id,
                     count(mp.player_id) as participant_rows,
                     count(distinct mp.player_id) as distinct_players
              from matches m
              left join match_players mp on mp.match_id = m.match_id
              where 1=1{scoped_clause}
              group by m.match_id
              having participant_rows != 2 or distinct_players != 2
            )
            """,
            tuple(params),
        )
    )
    missing_start = int(
        one(
            con,
            f"""
            select count(*)
            from matches m
            where 1=1{scoped_clause}
              and (m.start_time_utc is null or m.start_time_utc = '')
            """,
            tuple(params),
        )
    )
    missing_status = int(
        one(
            con,
            f"""
            select count(*)
            from matches m
            where 1=1{scoped_clause}
              and (m.status is null or m.status = '')
            """,
            tuple(params),
        )
    )
    prefixes = rows(
        con,
        f"""
        select case
                 when instr(m.match_id, '-') > 0 then substr(m.match_id, 1, instr(m.match_id, '-') - 1)
                 else 'none'
               end as prefix,
               count(*) as matches
        from matches m
        where 1=1{scoped_clause}
        group by prefix
        order by matches desc, prefix
        """,
        tuple(params),
    )
    by_date = rows(
        con,
        f"""
        select m.match_date,
               count(*) as matches,
               sum(case when tl.match_id is not null then 1 else 0 end) as tennislive_matches,
               sum(case when m.start_time_utc is null or m.start_time_utc = '' then 1 else 0 end) as missing_start,
               sum(case when m.status is null or m.status = '' then 1 else 0 end) as missing_status
        from matches m
        left join tennislive_match_sources tl on tl.match_id = m.match_id and tl.active = 1
        where 1=1{scoped_clause}
        group by m.match_date
        order by m.match_date
        """,
        tuple(params),
    )
    canonical_candidates = int(
        one(
            con,
            f"""
            select count(*)
            from (
              select m.match_id
              from matches m
              join tennislive_match_sources tl on tl.match_id = m.match_id and tl.active = 1
              join match_players mp on mp.match_id = m.match_id
              where 1=1{scoped_clause}
                and m.match_date is not null
                and m.match_date != ''
                and m.status is not null
                and m.status != ''
              group by m.match_id
              having count(mp.player_id) = 2 and count(distinct mp.player_id) = 2
            )
            """,
            tuple(params),
        )
    )
    return {
        "scope": {"start_date": start_date, "end_date": end_date},
        "total_matches": total_matches,
        "tennislive_attached_matches": tennislive_matches,
        "non_tennislive_match_shapes": total_matches - tennislive_matches,
        "canonical_tennislive_match_candidates": canonical_candidates,
        "missing_start_time": missing_start,
        "missing_status": missing_status,
        "participant_anomaly_count": participant_anomaly_count,
        "participant_anomaly_examples": participant_anomalies,
        "match_id_prefixes": prefixes,
        "by_date": by_date,
    }


def audit_identity(con: sqlite3.Connection) -> dict[str, Any]:
    duplicate_canonical_names = rows(
        con,
        """
        select canonical_name,
               count(*) as players,
               group_concat(player_id) as player_ids
        from players
        where canonical_name is not null and canonical_name != ''
        group by lower(canonical_name)
        having players > 1
        order by players desc, canonical_name
        limit 25
        """,
    )
    unresolved_by_source = rows(
        con,
        """
        select source_name,
               count(*) as unresolved_rows
        from unresolved_entities
        group by source_name
        order by unresolved_rows desc, source_name
        """,
    )
    missing_player_market_sources = rows(
        con,
        """
        select source_name,
               count(*) as rows,
               sum(case when player_id is null or player_id = '' then 1 else 0 end) as missing_player_id,
               sum(case when match_id is null or match_id = '' then 1 else 0 end) as missing_match_id
        from market_snapshots
        group by source_name
        order by missing_player_id desc, rows desc
        """,
    )
    side_duplicates = int(
        one(
            con,
            """
            select count(*)
            from (
              select match_id, side, count(*) as rows
              from match_players
              group by match_id, side
              having rows > 1
            )
            """,
        )
    )
    return {
        "duplicate_canonical_name_examples": duplicate_canonical_names,
        "unresolved_by_source": unresolved_by_source,
        "market_missing_identity_by_source": missing_player_market_sources,
        "match_player_side_duplicate_groups": side_duplicates,
    }


def audit_market_shapes(con: sqlite3.Connection) -> dict[str, Any]:
    duplicate_groups = int(
        one(
            con,
            """
            select count(*)
            from (
              select match_id, player_id, source_name, market_type, selection, line_value, captured_at, count(*) as rows
              from market_snapshots
              group by match_id, player_id, source_name, market_type, selection, line_value, captured_at
              having rows > 1
            )
            """,
        )
    )
    duplicate_examples = rows(
        con,
        """
        select match_id, player_id, source_name, market_type, selection, line_value, captured_at, count(*) as rows
        from market_snapshots
        group by match_id, player_id, source_name, market_type, selection, line_value, captured_at
        having rows > 1
        order by rows desc, source_name, match_id
        limit 20
        """,
    )
    by_source = rows(
        con,
        """
        select source_name,
               count(*) as rows,
               sum(case when match_id is null or match_id = '' then 1 else 0 end) as missing_match_id,
               sum(case when player_id is null or player_id = '' then 1 else 0 end) as missing_player_id,
               sum(case when price_cents is null and implied_probability is null and odds_american is null then 1 else 0 end) as missing_price
        from market_snapshots
        group by source_name
        order by rows desc, source_name
        """,
    )
    return {
        "market_snapshot_duplicate_groups": duplicate_groups,
        "duplicate_examples": duplicate_examples,
        "by_source": by_source,
    }


def audit_stats(con: sqlite3.Connection) -> dict[str, Any]:
    duplicate_groups = int(
        one(
            con,
            """
            select count(*)
            from (
              select match_id, player_id, source_name, stat_name, period, count(*) as rows
              from match_stat_rows
              group by match_id, player_id, source_name, stat_name, period
              having rows > 1
            )
            """,
        )
    )
    by_source = rows(
        con,
        """
        select source_name,
               count(*) as rows,
               sum(case when match_id is null or match_id = '' then 1 else 0 end) as missing_match_id,
               sum(case when player_id is null or player_id = '' then 1 else 0 end) as missing_player_id
        from match_stat_rows
        group by source_name
        order by rows desc, source_name
        """,
    )
    duplicate_examples = rows(
        con,
        """
        select match_id, player_id, source_name, stat_name, period, count(*) as rows
        from match_stat_rows
        group by match_id, player_id, source_name, stat_name, period
        having rows > 1
        order by rows desc, source_name, match_id
        limit 20
        """,
    )
    return {
        "stat_duplicate_groups": duplicate_groups,
        "by_source": by_source,
        "duplicate_examples": duplicate_examples,
    }


def audit_predictions(con: sqlite3.Connection) -> dict[str, Any]:
    total_rows = int(one(con, "select count(*) from prediction_rows"))
    settlement_rows = int(one(con, "select count(*) from settlement_rows"))
    by_run = rows(
        con,
        """
        select model_run_id,
               count(*) as rows,
               sum(case when instr(coalesce(rationale_json, ''), '"marketOnly":true') > 0 then 1 else 0 end) as market_only_true,
               sum(case when instr(coalesce(rationale_json, ''), '"marketOnly"') > 0 then 1 else 0 end) as market_only_token,
               sum(case when lane = 'ml' and market_type = 'match_winner' then 1 else 0 end) as ml_match_winner_rows,
               sum(case when ev_cents is not null then 1 else 0 end) as rows_with_ev
        from prediction_rows
        group by model_run_id
        order by rows desc, model_run_id
        """
    )
    ten_t0 = [row for row in by_run if "TEN-T0" in row["model_run_id"] or "tennis-TEN-T0" in row["model_run_id"]]
    by_lane = rows(
        con,
        """
        select lane, market_type, count(*) as rows
        from prediction_rows
        group by lane, market_type
        order by rows desc, lane, market_type
        """
    )
    return {
        "prediction_rows": total_rows,
        "settlement_rows": settlement_rows,
        "model_run_count": len(by_run),
        "ten_t0_runs": ten_t0,
        "by_lane": by_lane,
    }


def audit_source_freshness(con: sqlite3.Connection) -> dict[str, Any]:
    policy_columns = {column.name for column in table_columns(con, "source_fetch_policies")}
    policy_selects = [
        "source_name",
        "source_family",
        "required_for_prediction",
        "active" if "active" in policy_columns else "1 as active",
        "required_for_lanes" if "required_for_lanes" in policy_columns else "null as required_for_lanes",
        "max_staleness_minutes" if "max_staleness_minutes" in policy_columns else "null as max_staleness_minutes",
        "max_stale_hours" if "max_stale_hours" in policy_columns else "null as max_stale_hours",
        "default_ttl_hours" if "default_ttl_hours" in policy_columns else "null as default_ttl_hours",
    ]
    policies = rows(
        con,
        f"""
        select {", ".join(policy_selects)}
        from source_fetch_policies
        where sport = 'tennis'
        order by required_for_prediction desc, source_name
        """
    )
    latest_status = rows(
        con,
        """
        select s.source_name,
               s.source_family,
               s.source_date,
               s.last_status,
               s.last_completeness_status,
               s.last_success_at,
               s.cache_valid_until,
               s.actual_item_count,
               s.missing_item_count,
               s.unresolved_count
        from source_fetch_status s
        join (
          select source_name, max(coalesce(source_date, '')) as source_date
          from source_fetch_status
          where sport = 'tennis'
          group by source_name
        ) latest
          on latest.source_name = s.source_name
         and latest.source_date = coalesce(s.source_date, '')
        where s.sport = 'tennis'
        order by s.source_name
        """
    )
    missing_required_latest = []
    latest_by_name = {row["source_name"]: row for row in latest_status}
    for policy in policies:
        if int(policy.get("required_for_prediction") or 0) != 1:
            continue
        if policy["source_name"] not in latest_by_name:
            missing_required_latest.append(policy["source_name"])
    return {
        "policies": policies,
        "latest_status": latest_status,
        "required_sources_missing_any_status": missing_required_latest,
    }


def bucket_summary(report: dict[str, Any]) -> dict[str, Any]:
    match_shapes = report["match_shapes"]
    prediction_rows = report["prediction_outputs"]["prediction_rows"]
    market_only = sum(int(row.get("market_only_true") or 0) for row in report["prediction_outputs"]["ten_t0_runs"])
    return {
        "canonical": {
            "tennislive_match_candidates": match_shapes["canonical_tennislive_match_candidates"],
        },
        "needs_review": {
            "participant_anomaly_matches": match_shapes["participant_anomaly_count"],
            "missing_start_time_matches": match_shapes["missing_start_time"],
            "duplicate_player_name_examples": len(report["identity"]["duplicate_canonical_name_examples"]),
        },
        "quarantine": {
            "non_tennislive_match_shapes": match_shapes["non_tennislive_match_shapes"],
            "ten_t0_market_only_prediction_rows": market_only,
            "market_duplicate_groups": report["market_shapes"]["market_snapshot_duplicate_groups"],
            "stat_duplicate_groups": report["stat_shapes"]["stat_duplicate_groups"],
        },
        "delete_candidate": {
            "requires_human_review": True,
            "automatic_delete_rows": 0,
        },
        "model_output_context": {
            "prediction_rows": prediction_rows,
            "settlement_rows": report["prediction_outputs"]["settlement_rows"],
        },
    }


def build_report(con: sqlite3.Connection, args: argparse.Namespace) -> dict[str, Any]:
    report = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "script": "data-migration/scripts/audit_tennis_data_shapes.py",
        "db_path": str(args.db),
        "scope": {"start_date": args.start_date, "end_date": args.end_date},
        "table_inventory": audit_tables(con),
        "match_shapes": audit_match_shapes(con, args.start_date, args.end_date),
        "identity": audit_identity(con),
        "market_shapes": audit_market_shapes(con),
        "stat_shapes": audit_stats(con),
        "prediction_outputs": audit_predictions(con),
        "source_freshness": audit_source_freshness(con),
    }
    report["bucket_summary"] = bucket_summary(report)
    return report


def markdown_table(headers: list[str], body: list[list[Any]]) -> str:
    lines = [
        "| " + " | ".join(headers) + " |",
        "| " + " | ".join("---" for _ in headers) + " |",
    ]
    for row in body:
        lines.append("| " + " | ".join(str(cell) for cell in row) + " |")
    return "\n".join(lines)


def write_markdown(report: dict[str, Any], path: Path) -> None:
    bucket = report["bucket_summary"]
    match_shapes = report["match_shapes"]
    market = report["market_shapes"]
    stats = report["stat_shapes"]
    predictions = report["prediction_outputs"]
    table_counts = [
        [row["classification"], row["table"], row["row_count"]]
        for row in sorted(
            report["table_inventory"],
            key=lambda item: (-int(item["row_count"]), item["classification"], item["table"]),
        )[:30]
    ]
    lines = [
        "# Tennis Data Shape Audit",
        "",
        f"Generated: `{report['generated_at']}`",
        "",
        f"DB: `{report['db_path']}`",
        "",
        "## Bucket Summary",
        "",
        markdown_table(
            ["Bucket", "Metric", "Count"],
            [
                ["canonical", "TennisLive match candidates", bucket["canonical"]["tennislive_match_candidates"]],
                ["needs_review", "Participant anomaly matches", bucket["needs_review"]["participant_anomaly_matches"]],
                ["needs_review", "Missing start-time matches", bucket["needs_review"]["missing_start_time_matches"]],
                ["quarantine", "Non-TennisLive match shapes", bucket["quarantine"]["non_tennislive_match_shapes"]],
                ["quarantine", "TEN-T0 market-only prediction rows", bucket["quarantine"]["ten_t0_market_only_prediction_rows"]],
                ["quarantine", "Market duplicate groups", bucket["quarantine"]["market_duplicate_groups"]],
                ["quarantine", "Stat duplicate groups", bucket["quarantine"]["stat_duplicate_groups"]],
                ["model_output", "Prediction rows", bucket["model_output_context"]["prediction_rows"]],
                ["model_output", "Settlement rows", bucket["model_output_context"]["settlement_rows"]],
            ],
        ),
        "",
        "## Match Shape",
        "",
        markdown_table(
            ["Metric", "Count"],
            [
                ["Total matches", match_shapes["total_matches"]],
                ["TennisLive-attached matches", match_shapes["tennislive_attached_matches"]],
                ["Canonical TennisLive candidates", match_shapes["canonical_tennislive_match_candidates"]],
                ["Non-TennisLive match shapes", match_shapes["non_tennislive_match_shapes"]],
                ["Missing start time", match_shapes["missing_start_time"]],
                ["Missing status", match_shapes["missing_status"]],
                ["Participant anomalies", match_shapes["participant_anomaly_count"]],
            ],
        ),
        "",
        "### Match ID Prefixes",
        "",
        markdown_table(
            ["Prefix", "Matches"],
            [[row["prefix"], row["matches"]] for row in match_shapes["match_id_prefixes"]],
        ),
        "",
        "## Market Shape",
        "",
        markdown_table(
            ["Source", "Rows", "Missing match", "Missing player", "Missing price"],
            [
                [row["source_name"], row["rows"], row["missing_match_id"], row["missing_player_id"], row["missing_price"]]
                for row in market["by_source"]
            ],
        ),
        "",
        f"Market duplicate groups: `{market['market_snapshot_duplicate_groups']}`",
        "",
        "## Stat Shape",
        "",
        markdown_table(
            ["Source", "Rows", "Missing match", "Missing player"],
            [[row["source_name"], row["rows"], row["missing_match_id"], row["missing_player_id"]] for row in stats["by_source"]],
        ),
        "",
        f"Stat duplicate groups: `{stats['stat_duplicate_groups']}`",
        "",
        "## Prediction Outputs",
        "",
        markdown_table(
            ["Lane", "Market type", "Rows"],
            [[row["lane"], row["market_type"], row["rows"]] for row in predictions["by_lane"]],
        ),
        "",
        "### TEN-T0 Runs",
        "",
        markdown_table(
            ["Model run", "Rows", "Market-only true", "Rows with EV"],
            [[row["model_run_id"], row["rows"], row["market_only_true"], row["rows_with_ev"]] for row in predictions["ten_t0_runs"]],
        ),
        "",
        "## Largest Tables",
        "",
        markdown_table(["Classification", "Table", "Rows"], table_counts),
        "",
        "## Next Review",
        "",
        "- Review participant anomaly examples in the JSON report.",
        "- Decide which non-TennisLive match shapes are historical context vs quarantine.",
        "- Separate market-watch rows from prediction rows before any future model work.",
        "- Add preflight/export status checks so `ready` cannot ignore blocked source freshness.",
        "",
    ]
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text("\n".join(lines), encoding="utf-8")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Audit tennis DB data shapes without mutating the warehouse.")
    parser.add_argument("--db", type=Path, default=DEFAULT_DB, help="Path to sql-tennis.db.")
    parser.add_argument("--out", type=Path, default=DEFAULT_JSON, help="JSON report path.")
    parser.add_argument("--markdown", type=Path, default=DEFAULT_MARKDOWN, help="Markdown report path.")
    parser.add_argument("--start-date", help="Optional match_date lower bound.")
    parser.add_argument("--end-date", help="Optional match_date upper bound.")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    if not args.db.exists():
        raise SystemExit(f"Missing DB: {args.db}")
    with connect(args.db) as con:
        report = build_report(con, args)
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(report, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    write_markdown(report, args.markdown)
    print(
        json.dumps(
            {
                "ok": True,
                "db": str(args.db),
                "json": str(args.out),
                "markdown": str(args.markdown),
                "canonical_tennislive_match_candidates": report["bucket_summary"]["canonical"]["tennislive_match_candidates"],
                "quarantine": report["bucket_summary"]["quarantine"],
            },
            indent=2,
            sort_keys=True,
        )
    )


if __name__ == "__main__":
    main()
