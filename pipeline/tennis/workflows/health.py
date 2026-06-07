#!/usr/bin/env python3
from __future__ import annotations

import argparse
import datetime as dt
import json
import sqlite3
import sys
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[3]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from pipeline.lib.warehouse_paths import tennis_warehouse_path

DEFAULT_DB = tennis_warehouse_path()
REFERENCE_DIR = ROOT / "data-private" / "reference" / "tennis"
PUBLISHED_SLATES_DIR = ROOT / "published-data" / "slates"
KALSHI_SPIKE_MODEL_PATH = ROOT / "web" / "src" / "lib" / "kalshi-tennis-spike-model.generated.json"

CORE_RECENT_METRICS = {"hold", "secondServe", "errorControl", "returnPressure", "closeout"}
MATCH_SURFACE_ENUM = {"Clay", "Grass", "Hard", "Indoor Hard", "Carpet", "Acrylic", "Unknown"}

REQUIRED_TABLES = [
    "matches",
    "match_players",
    "players",
    "recent_matches",
    "match_stat_rows",
    "player_form_snapshots",
    "tennislive_player_profiles",
    "tennislive_player_match_links",
    "tennislive_form_chart_points",
    "tennislive_match_sources",
    "tennis_kalshi_match_markets",
    "tennis_prediction_market_snapshots",
    "tennis_match_results",
    "tennis_weather_hourly",
    "tennis_match_weather",
]

_SLATE_PLAYER_ROWS_CACHE: dict[tuple[int, str], list[dict[str, Any]]] = {}


def connect(db_path: Path) -> sqlite3.Connection:
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    return conn


def table_exists(conn: sqlite3.Connection, table_name: str) -> bool:
    row = conn.execute(
        "select 1 from sqlite_master where type = 'table' and name = ?",
        (table_name,),
    ).fetchone()
    return row is not None


def read_json(path: Path) -> dict[str, Any]:
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def scalar(conn: sqlite3.Connection, sql: str, params: tuple[Any, ...]) -> int:
    try:
        return int(conn.execute(sql, params).fetchone()[0] or 0)
    except sqlite3.OperationalError as exc:
        if "no such table" in str(exc).lower():
            return 0
        raise


def with_status(
    payload: dict[str, Any],
    status: str,
    *,
    error: str | None = None,
    warning: str | None = None,
) -> dict[str, Any]:
    result = {**payload, "status": status}
    result["ok"] = status in {"ok", "warning", "not_applicable"}
    if error is not None:
        result["error"] = error
    elif "error" not in result:
        result["error"] = None
    if warning is not None:
        result["warning"] = warning
    return result


def health_check_passes(check: dict[str, Any]) -> bool:
    return bool(check.get("ok"))


def check_marker(check: dict[str, Any]) -> str:
    status = check.get("status")
    if status:
        return str(status)
    return "ok" if check.get("ok") else "bad"


def ensure_status(check: dict[str, Any]) -> dict[str, Any]:
    if "status" not in check:
        if check.get("ok") and check.get("warning"):
            check["status"] = "warning"
        elif check.get("ok"):
            check["status"] = "ok"
        else:
            check["status"] = "failed"
    if "error" not in check:
        check["error"] = None
    return check


def slate_player_rows(conn: sqlite3.Connection, date: str) -> list[dict[str, Any]]:
    cache_key = (id(conn), date)
    cached = _SLATE_PLAYER_ROWS_CACHE.get(cache_key)
    if cached is not None:
        return cached
    if not (table_exists(conn, "matches") and table_exists(conn, "match_players") and table_exists(conn, "players")):
        return []
    rows = conn.execute(
        """
        with slate as (
          select
            mp.player_id,
            max(case when m.match_id like 'tl-%' then 1 else 0 end) as full_depth_player,
            count(distinct m.match_id) as slate_match_count
          from match_players mp
          join matches m on m.match_id = mp.match_id
          where m.match_date = ?
          group by mp.player_id
        )
        select
          slate.player_id,
          identity.name,
          identity.active,
          slate.full_depth_player,
          slate.slate_match_count,
          redirects.to_player_id as redirect_to_player_id,
          redirect_target.name as redirect_to_name,
          exists(select 1 from tennislive_player_profiles profiles where profiles.player_id = slate.player_id) as has_profile,
          exists(select 1 from tennislive_player_profiles profiles where profiles.player_id = slate.player_id and profiles.current_ranking is not null) as has_tennislive_rank,
          exists(select 1 from rankings rankings where rankings.player_id = slate.player_id and rankings.ranking_date <= ? and rankings.rank is not null) as has_ranking_row,
          exists(select 1 from recent_matches recent where recent.player_id = slate.player_id and recent.source_name = 'tennislive') as has_recent,
          exists(select 1 from match_stat_rows stats where stats.player_id = slate.player_id and stats.source_name = 'tennislive') as has_stats,
          exists(select 1 from service_pressure_snapshots pressure where pressure.player_id = slate.player_id and pressure.source_name = 'tennislive') as has_pressure,
          exists(select 1 from player_form_snapshots form where form.player_id = slate.player_id and json_extract(form.features_json, '$.source') = 'tennislive') as has_form
        from slate
        left join players identity on identity.player_id = slate.player_id
        left join player_identity_redirects redirects
          on redirects.from_player_id = slate.player_id
         and redirects.redirect_status = 'active'
        left join players redirect_target on redirect_target.player_id = redirects.to_player_id
        order by slate.full_depth_player desc, identity.name
        """,
        (date, date),
    ).fetchall()
    result: list[dict[str, Any]] = []
    for row in rows:
        payload = dict(row)
        target_id = payload.get("redirect_to_player_id")
        if target_id:
            payload["target_has_profile"] = bool(
                conn.execute("select 1 from tennislive_player_profiles where player_id = ?", (target_id,)).fetchone()
            )
            payload["target_has_rank"] = bool(
                conn.execute(
                    """
                    select 1
                    from rankings
                    where player_id = ?
                      and ranking_date <= ?
                      and rank is not null
                    union
                    select 1
                    from tennislive_player_profiles
                    where player_id = ?
                      and current_ranking is not null
                    limit 1
                    """,
                    (target_id, date, target_id),
                ).fetchone()
            )
            payload["target_has_recent"] = bool(
                conn.execute(
                    "select 1 from recent_matches where player_id = ? and source_name = 'tennislive'",
                    (target_id,),
                ).fetchone()
            )
            payload["target_has_stats"] = bool(
                conn.execute(
                    "select 1 from match_stat_rows where player_id = ? and source_name = 'tennislive'",
                    (target_id,),
                ).fetchone()
            )
            payload["target_has_pressure"] = bool(
                conn.execute(
                    "select 1 from service_pressure_snapshots where player_id = ? and source_name = 'tennislive'",
                    (target_id,),
                ).fetchone()
            )
        result.append(payload)
    _SLATE_PLAYER_ROWS_CACHE[cache_key] = result
    return result


def coverage_counts(rows: list[dict[str, Any]]) -> dict[str, int]:
    return {
        "players": len(rows),
        "profilePlayers": sum(1 for row in rows if row.get("has_profile")),
        "tennisliveRankPlayers": sum(1 for row in rows if row.get("has_tennislive_rank")),
        "rankingRowPlayers": sum(1 for row in rows if row.get("has_ranking_row")),
        "anyRankPlayers": sum(1 for row in rows if row.get("has_tennislive_rank") or row.get("has_ranking_row") or row.get("target_has_rank")),
        "recentPlayers": sum(1 for row in rows if row.get("has_recent") or row.get("target_has_recent")),
        "statPlayers": sum(1 for row in rows if row.get("has_stats") or row.get("target_has_stats")),
        "pressurePlayers": sum(1 for row in rows if row.get("has_pressure") or row.get("target_has_pressure")),
        "formPlayers": sum(1 for row in rows if row.get("has_form")),
        "redirectedPlayers": sum(1 for row in rows if row.get("redirect_to_player_id")),
    }


def player_missing_fields(row: dict[str, Any], *, require_rank: bool = True) -> list[str]:
    missing = []
    if not row.get("has_profile") and not row.get("target_has_profile"):
        missing.append("profile")
    if require_rank and not (row.get("has_tennislive_rank") or row.get("has_ranking_row") or row.get("target_has_rank")):
        missing.append("rank")
    if not row.get("has_recent") and not row.get("target_has_recent"):
        missing.append("recent")
    if not row.get("has_stats") and not row.get("target_has_stats"):
        missing.append("stats")
    if not row.get("has_pressure") and not row.get("target_has_pressure"):
        missing.append("pressure")
    if not row.get("has_form"):
        missing.append("form")
    return missing


def core_model_match_count(conn: sqlite3.Connection, date: str) -> int:
    """Rows where the site is expected to have full tennis model depth.

    Robinhood Challenger markets can be published as market-only rows. They
    should still have prices and value-book placeholders, but they should not
    make the whole slate fail because TennisLive match pages are not joined yet.
    """
    return scalar(
        conn,
        """
        select count(*)
        from matches
        where match_date = ?
          and match_id like 'tl-%'
        """,
        (date,),
    )


def resolve_settled(date: str, explicit: bool | None) -> bool:
    if explicit is not None:
        return explicit
    try:
        return dt.date.fromisoformat(date) < dt.date.today()
    except ValueError:
        return False


def check_source_files(date: str, *, strict: bool = False, settled: bool = False) -> dict[str, Any]:
    paths = {
        "scoreboard": REFERENCE_DIR / f"espn-scoreboard-{date}.json",
        "warehouseContext": ROOT / "web" / "src" / "lib" / f"day-{date}-tennis-warehouse-context.generated.json",
        "draftkingsLines": REFERENCE_DIR / f"draftkings-lines-{date}.json",
        "fanduelLines": REFERENCE_DIR / f"fanduel-lines-{date}.json",
    }
    statuses = {}
    missing_required = []
    missing_optional = []
    required = {"warehouseContext"}
    if strict or settled:
        required.add("scoreboard")
    for key, path in paths.items():
        exists = path.exists() and path.stat().st_size > 0
        statuses[key] = {"path": str(path), "exists": exists, "bytes": path.stat().st_size if path.exists() else 0}
        if key in required and not exists:
            missing_required.append(key)
        elif key not in required and not exists:
            missing_optional.append(key)
    if missing_required:
        return with_status(
            {"files": statuses, "requiredFiles": sorted(required), "optionalMissing": missing_optional},
            "failed",
            error=f"missing required source files: {', '.join(missing_required)}",
        )
    if missing_optional:
        return with_status(
            {"files": statuses, "requiredFiles": sorted(required), "optionalMissing": missing_optional},
            "warning",
            warning=f"optional source files missing: {', '.join(missing_optional)}",
        )
    return with_status({"files": statuses, "requiredFiles": sorted(required), "optionalMissing": []}, "ok")


def check_tennislive_context_file(date: str) -> dict[str, Any]:
    path = ROOT / "web" / "src" / "lib" / f"day-{date}-tennis-warehouse-context.generated.json"
    if not path.exists():
        return with_status({"path": str(path)}, "failed", error="missing generated TennisLive warehouse context")
    payload = read_json(path)
    matches = payload.get("matches") or {}
    players = payload.get("playersByName") or {}
    blocked_sources = []
    text = json.dumps(payload, sort_keys=True).lower()
    for source in ("flashscore", "sofascore", "tennistonic", "tennis tonic"):
        if source in text:
            blocked_sources.append(source)
    payload = {
        "path": str(path),
        "matchContextCount": len(matches),
        "playerContextCount": len(players),
        "blockedSources": blocked_sources,
    }
    if blocked_sources:
        return with_status(payload, "failed", error="TennisLive warehouse context contains blocked legacy source text")
    if not (matches and players):
        return with_status(payload, "failed", error="TennisLive warehouse context is missing match or player payloads")
    return with_status(payload, "ok")


def check_warehouse(conn: sqlite3.Connection, date: str, *, strict: bool = False) -> dict[str, Any]:
    missing_tables = [table for table in REQUIRED_TABLES if not table_exists(conn, table)]
    if missing_tables:
        return with_status({"missingTables": missing_tables}, "failed", error="missing tennis warehouse tables")

    match_count = conn.execute("select count(*) from matches where match_date = ?", (date,)).fetchone()[0]
    player_rows = slate_player_rows(conn, date)
    full_depth_players = [row for row in player_rows if row.get("full_depth_player")]
    market_only_players = [row for row in player_rows if not row.get("full_depth_player")]
    full_depth_missing = [
        {
            "player_id": row.get("player_id"),
            "name": row.get("name"),
            "missing": player_missing_fields(row),
            "redirect_to_player_id": row.get("redirect_to_player_id"),
            "redirect_to_name": row.get("redirect_to_name"),
        }
        for row in full_depth_players
        if player_missing_fields(row)
    ]
    market_only_missing = [
        {
            "player_id": row.get("player_id"),
            "name": row.get("name"),
            "missing": player_missing_fields(row),
            "redirect_to_player_id": row.get("redirect_to_player_id"),
            "redirect_to_name": row.get("redirect_to_name"),
        }
        for row in market_only_players
        if player_missing_fields(row)
    ]
    redirected = [
        {
            "player_id": row.get("player_id"),
            "name": row.get("name"),
            "redirect_to_player_id": row.get("redirect_to_player_id"),
            "redirect_to_name": row.get("redirect_to_name"),
            "full_depth_player": bool(row.get("full_depth_player")),
            "targetHasStats": bool(row.get("target_has_stats")),
            "targetHasPressure": bool(row.get("target_has_pressure")),
        }
        for row in player_rows
        if row.get("redirect_to_player_id")
    ]
    payload = {
        "matchCount": match_count,
        "playerCount": len(player_rows),
        "fullDepthPlayerCount": len(full_depth_players),
        "marketOnlyPlayerCount": len(market_only_players),
        "fullDepthCoverage": coverage_counts(full_depth_players),
        "marketOnlyCoverage": coverage_counts(market_only_players),
        "allSlateCoverage": coverage_counts(player_rows),
        "fullDepthMissingPlayers": full_depth_missing[:50],
        "fullDepthMissingPlayerCount": len(full_depth_missing),
        "marketOnlyMissingPlayers": market_only_missing[:50],
        "marketOnlyMissingPlayerCount": len(market_only_missing),
        "redirectedSlatePlayers": redirected[:50],
        "redirectedSlatePlayerCount": len(redirected),
    }
    if match_count <= 0 or not player_rows:
        return with_status(payload, "failed", error="no typed matches or players found for slate")
    if strict and (full_depth_missing or market_only_missing or redirected):
        return with_status(payload, "failed", error="strict TennisLive warehouse coverage is incomplete")
    if full_depth_missing or redirected:
        return with_status(payload, "warning", warning="full-depth warehouse rows are partial or linked through redirected player IDs")
    if market_only_missing:
        return with_status(payload, "warning", warning="market-only slate players have partial TennisLive warehouse context")
    return with_status(payload, "ok")


def check_rankings(conn: sqlite3.Connection, date: str, *, strict: bool = False) -> dict[str, Any]:
    player_rows = slate_player_rows(conn, date)
    full_depth_players = [row for row in player_rows if row.get("full_depth_player")]
    market_only_players = [row for row in player_rows if not row.get("full_depth_player")]
    full_depth_missing = [
        {
            "name": row.get("name"),
            "player_id": row.get("player_id"),
            "redirect_to_player_id": row.get("redirect_to_player_id"),
            "redirect_to_name": row.get("redirect_to_name"),
        }
        for row in full_depth_players
        if not (row.get("has_tennislive_rank") or row.get("has_ranking_row") or row.get("target_has_rank"))
    ]
    market_only_missing = [
        {
            "name": row.get("name"),
            "player_id": row.get("player_id"),
            "redirect_to_player_id": row.get("redirect_to_player_id"),
            "redirect_to_name": row.get("redirect_to_name"),
        }
        for row in market_only_players
        if not (row.get("has_tennislive_rank") or row.get("has_ranking_row") or row.get("target_has_rank"))
    ]
    payload = {
        "playerCount": len(player_rows),
        "fullDepthPlayerCount": len(full_depth_players),
        "marketOnlyPlayerCount": len(market_only_players),
        "tennisliveRankPlayers": sum(1 for row in player_rows if row.get("has_tennislive_rank")),
        "rankingRowPlayers": sum(1 for row in player_rows if row.get("has_ranking_row")),
        "anyRankPlayers": sum(1 for row in player_rows if row.get("has_tennislive_rank") or row.get("has_ranking_row") or row.get("target_has_rank")),
        "fullDepthMissingPlayers": full_depth_missing[:50],
        "fullDepthMissingPlayerCount": len(full_depth_missing),
        "marketOnlyMissingPlayers": market_only_missing[:50],
        "marketOnlyMissingPlayerCount": len(market_only_missing),
        "source": "rankings rows plus tennislive_player_profiles.current_ranking",
    }
    if not player_rows:
        return with_status(payload, "failed", error="no slate players found for ranking coverage")
    if strict and (full_depth_missing or market_only_missing):
        return with_status(payload, "failed", error="strict slate ranking coverage is incomplete")
    if full_depth_missing:
        return with_status(payload, "warning", warning="one or more full-depth slate players are missing canonical ranking coverage")
    if market_only_missing:
        return with_status(payload, "warning", warning="market-only slate players are missing canonical ranking coverage")
    return with_status(payload, "ok")


def check_source_fetch(conn: sqlite3.Connection, date: str, *, strict: bool = False) -> dict[str, Any]:
    if not table_exists(conn, "source_fetch_status"):
        return with_status({}, "not_applicable", warning="source fetch status table is missing")
    policies = []
    if table_exists(conn, "source_fetch_policies"):
        policies = [
            dict(row)
            for row in conn.execute(
                """
                select source_name, source_family, run_rule, required_for_prediction
                from source_fetch_policies
                where sport = 'tennis'
                order by source_name
                """
            ).fetchall()
        ]
    rows = [
        dict(row)
        for row in conn.execute(
            """
            select
              status.source_name,
              status.source_family,
              status.source_date,
              status.last_status,
              status.last_completeness_status,
              status.expected_item_count,
              status.actual_item_count,
              status.missing_item_count,
              status.unresolved_count,
              coalesce(policy.required_for_prediction, 0) as required_for_prediction
            from source_fetch_status status
            left join source_fetch_policies policy
              on policy.sport = status.sport
             and policy.source_name = status.source_name
            where status.sport = 'tennis'
              and status.source_date = ?
            order by status.source_name
            """,
            (date,),
        ).fetchall()
    ]
    row_sources = {str(row.get("source_name")) for row in rows}
    missing_policy_status = [
        policy for policy in policies
        if policy.get("source_name") not in row_sources
    ]
    failed_required = [
        row for row in rows
        if row.get("required_for_prediction")
        and str(row.get("last_status") or "").lower() in {"missing", "failed", "error"}
    ]
    optional_missing = [
        row for row in rows
        if not row.get("required_for_prediction")
        and str(row.get("last_status") or "").lower() in {"missing", "failed", "error"}
    ]
    unknown_required = [
        row for row in rows
        if row.get("required_for_prediction")
        and str(row.get("last_completeness_status") or "").lower() == "unknown"
    ]
    failed_snapshot_count = scalar(
        conn,
        """
        select count(*)
        from source_snapshots
        where sport = 'tennis'
          and source_date like ?
          and status in ('failed', 'error')
        """,
        (f"{date}%",),
    ) if table_exists(conn, "source_snapshots") else 0
    payload = {
        "policies": policies,
        "rows": rows,
        "policyCount": len(policies),
        "sourceCount": len(rows),
        "missingPolicyStatus": missing_policy_status,
        "missingPolicyStatusCount": len(missing_policy_status),
        "failedRequired": failed_required,
        "failedRequiredCount": len(failed_required),
        "optionalMissing": optional_missing,
        "optionalMissingCount": len(optional_missing),
        "unknownRequired": unknown_required,
        "unknownRequiredCount": len(unknown_required),
        "failedSourceSnapshots": failed_snapshot_count,
    }
    if failed_required:
        return with_status(payload, "failed", error="required tennis source fetch is missing or failed")
    if strict and (missing_policy_status or optional_missing or unknown_required or failed_snapshot_count):
        return with_status(payload, "failed", error="strict source fetch status has missing, failed, unknown, or unreceipted policy rows")
    if missing_policy_status or optional_missing or unknown_required or failed_snapshot_count:
        return with_status(payload, "warning", warning="one or more optional or diagnostically incomplete source fetch rows need attention")
    return with_status(payload, "ok")


def check_source_parse(conn: sqlite3.Connection, date: str, *, strict: bool = False) -> dict[str, Any]:
    snapshot_rows: list[dict[str, Any]] = []
    if table_exists(conn, "source_snapshots"):
        snapshot_rows = [
            dict(row)
            for row in conn.execute(
                """
                select source_name, status, count(*) as rows
                from source_snapshots
                where sport = 'tennis'
                  and source_date like ?
                group by source_name, status
                order by source_name, status
                """,
                (f"{date}%",),
            ).fetchall()
        ]
    status_rows = []
    if table_exists(conn, "source_fetch_status"):
        status_rows = [
            dict(row)
            for row in conn.execute(
                """
                select source_name, last_status, last_completeness_status, expected_item_count, actual_item_count, missing_item_count
                from source_fetch_status
                where sport = 'tennis'
                  and source_date = ?
                order by source_name
                """,
                (date,),
            ).fetchall()
        ]
    parsed_empty = [
        row for row in status_rows
        if str(row.get("last_completeness_status") or "").lower() in {"source_parsed_empty", "source_parsed_but_not_inserted"}
    ]
    source_missing = [
        row for row in status_rows
        if str(row.get("last_completeness_status") or "").lower() == "source_fetch_missing"
    ]
    failed_snapshots = [row for row in snapshot_rows if str(row.get("status") or "").lower() in {"failed", "error"}]
    payload = {
        "sourceSnapshotStatusRows": snapshot_rows,
        "sourceFetchStatusRows": status_rows,
        "sourceFetchMissing": source_missing,
        "sourceFetchMissingCount": len(source_missing),
        "parsedEmptyOrNotInserted": parsed_empty,
        "parsedEmptyOrNotInsertedCount": len(parsed_empty),
        "failedSnapshotStatusRows": failed_snapshots,
        "failedSnapshotStatusRowCount": len(failed_snapshots),
    }
    if strict and (source_missing or parsed_empty or failed_snapshots):
        return with_status(payload, "failed", error="strict source parse status has missing, empty, failed, or not-inserted rows")
    if source_missing or parsed_empty or failed_snapshots:
        return with_status(payload, "warning", warning="source parse diagnostics include missing, empty, failed, or not-inserted rows")
    return with_status(payload, "ok")


def check_typed_insert(conn: sqlite3.Connection, date: str, *, strict: bool = False) -> dict[str, Any]:
    match_count = scalar(conn, "select count(*) from matches where match_date = ?", (date,))
    match_player_count = scalar(
        conn,
        """
        select count(*)
        from match_players mp
        join matches m on m.match_id = mp.match_id
        where m.match_date = ?
        """,
        (date,),
    )
    market_snapshots = scalar(
        conn,
        """
        select count(*)
        from market_snapshots ms
        join matches m on m.match_id = ms.match_id
        where m.match_date = ?
        """,
        (date,),
    ) if table_exists(conn, "market_snapshots") else 0
    ranking_rows = scalar(conn, "select count(*) from rankings where ranking_date <= ?", (date,)) if table_exists(conn, "rankings") else 0
    player_rows = slate_player_rows(conn, date)
    coverage = coverage_counts(player_rows)
    payload = {
        "matches": match_count,
        "matchPlayers": match_player_count,
        "marketSnapshots": market_snapshots,
        "rankingRowsThroughDate": ranking_rows,
        "slateCoverage": coverage,
    }
    if match_count <= 0 or match_player_count <= 0:
        return with_status(payload, "failed", error="typed match or match-player rows are missing")
    if market_snapshots <= 0:
        return with_status(payload, "failed", error="typed market snapshots are missing for this slate")
    if strict and (
        coverage["profilePlayers"] < coverage["players"]
        or coverage["recentPlayers"] < coverage["players"]
        or coverage["statPlayers"] < coverage["players"]
        or coverage["pressurePlayers"] < coverage["players"]
    ):
        return with_status(payload, "failed", error="strict typed insert coverage is incomplete for slate players")
    if (
        coverage["profilePlayers"] < coverage["players"]
        or coverage["recentPlayers"] < coverage["players"]
        or coverage["statPlayers"] < coverage["players"]
        or coverage["pressurePlayers"] < coverage["players"]
    ):
        return with_status(payload, "warning", warning="typed rows are populated but incomplete for some slate players")
    return with_status(payload, "ok")


def check_slate_linkage(conn: sqlite3.Connection, date: str, *, strict: bool = False) -> dict[str, Any]:
    player_rows = slate_player_rows(conn, date)
    redirected = [row for row in player_rows if row.get("redirect_to_player_id")]
    redirected_with_target_data = [
        row for row in redirected
        if row.get("target_has_profile") or row.get("target_has_recent") or row.get("target_has_stats") or row.get("target_has_pressure")
    ]
    unlinked_full_depth = [
        {
            "player_id": row.get("player_id"),
            "name": row.get("name"),
            "missing": player_missing_fields(row),
            "redirect_to_player_id": row.get("redirect_to_player_id"),
            "redirect_to_name": row.get("redirect_to_name"),
            "target_has_stats": row.get("target_has_stats"),
            "target_has_pressure": row.get("target_has_pressure"),
        }
        for row in player_rows
        if row.get("full_depth_player") and player_missing_fields(row)
    ]
    payload = {
        "slatePlayers": len(player_rows),
        "redirectedSlatePlayers": [
            {
                "player_id": row.get("player_id"),
                "name": row.get("name"),
                "redirect_to_player_id": row.get("redirect_to_player_id"),
                "redirect_to_name": row.get("redirect_to_name"),
                "full_depth_player": bool(row.get("full_depth_player")),
            }
            for row in redirected[:50]
        ],
        "redirectedSlatePlayerCount": len(redirected),
        "redirectedWithTargetDataCount": len(redirected_with_target_data),
        "fullDepthRowsPopulatedButNotLinked": unlinked_full_depth[:50],
        "fullDepthRowsPopulatedButNotLinkedCount": len(unlinked_full_depth),
    }
    if strict and (redirected or unlinked_full_depth):
        return with_status(payload, "failed", error="strict slate linkage has redirected or unlinked full-depth players")
    if redirected or unlinked_full_depth:
        return with_status(payload, "warning", warning="typed data exists but some slate rows are linked through redirected player IDs")
    return with_status(payload, "ok")


def check_match_contract(conn: sqlite3.Connection, date: str) -> dict[str, Any]:
    if not table_exists(conn, "matches"):
        return {"ok": False, "error": "matches table is missing"}
    missing = [
        dict(row)
        for row in conn.execute(
            """
            select match_id, match_date, tournament_id, round, surface
            from matches
            where match_date = ?
              and (
                match_date is null or trim(match_date) = ''
                or tournament_id is null or trim(tournament_id) = ''
                or round is null or trim(round) = ''
                or surface is null or trim(surface) = ''
              )
            order by match_id
            """,
            (date,),
        ).fetchall()
    ]
    bad_surface = [
        dict(row)
        for row in conn.execute(
            """
            select match_id, match_date, tournament_id, round, surface
            from matches
            where match_date = ?
              and surface not in ('Clay', 'Grass', 'Hard', 'Indoor Hard', 'Carpet', 'Acrylic', 'Unknown')
            order by match_id
            """,
            (date,),
        ).fetchall()
    ]
    surface_rows = [
        dict(row)
        for row in conn.execute(
            """
            select surface, count(*) as count
            from matches
            where match_date = ?
            group by surface
            order by surface
            """,
            (date,),
        ).fetchall()
    ]
    match_count = sum(int(row["count"] or 0) for row in surface_rows)
    ok = match_count > 0 and not missing and not bad_surface
    return {
        "ok": ok,
        "matchCount": match_count,
        "surfaceEnum": sorted(MATCH_SURFACE_ENUM),
        "surfaces": surface_rows,
        "missingCount": len(missing),
        "badSurfaceCount": len(bad_surface),
        "missing": missing[:50],
        "badSurface": bad_surface[:50],
        "error": None if ok else "matches must have date, event, event-round, and enum surface",
    }


def check_tennislive(
    conn: sqlite3.Connection,
    date: str,
    match_count: int,
    settled: bool,
    full_depth_match_count: int,
) -> dict[str, Any]:
    mapped_matches = scalar(
        conn,
        """
        select count(*)
        from tennislive_match_sources sources
        join matches matches on matches.match_id = sources.match_id
        where matches.match_date = ?
          and sources.source_name = 'tennislive'
          and sources.source_match_url is not null
        """,
        (date,),
    )
    player_profiles = scalar(
        conn,
        """
        select count(distinct players.player_id)
        from match_players players
        join matches matches on matches.match_id = players.match_id
        join tennislive_player_profiles profiles on profiles.player_id = players.player_id
        where matches.match_date = ?
        """,
        (date,),
    )
    player_links = scalar(
        conn,
        """
        select count(*)
        from tennislive_player_match_links links
        join match_players players on players.player_id = links.player_id
        join matches matches on matches.match_id = players.match_id
        where matches.match_date = ?
        """,
        (date,),
    )
    player_stat_rows = scalar(
        conn,
        """
        select count(*)
        from match_stat_rows stats
        join match_players players on players.player_id = stats.player_id
        join matches matches on matches.match_id = players.match_id
        where matches.match_date = ?
          and stats.source_name = 'tennislive'
        """,
        (date,),
    )
    form_chart_points = scalar(
        conn,
        """
        select count(*)
        from tennislive_form_chart_points points
        join match_players players on players.player_id = points.player_id
        join matches matches on matches.match_id = players.match_id
        where matches.match_date = ?
        """,
        (date,),
    )
    replay_games = scalar(conn, "select count(*) from tennislive_match_replay_games where match_id in (select match_id from matches where match_date = ?)", (date,))
    replay_points = scalar(conn, "select count(*) from tennislive_match_replay_points where match_id in (select match_id from matches where match_date = ?)", (date,))
    required_matches = full_depth_match_count or match_count
    mapping_ok = required_matches > 0 and mapped_matches >= required_matches
    pregame_player_pages_ok = required_matches > 0 and player_profiles >= required_matches * 2 and player_links >= required_matches * 2 and player_stat_rows >= required_matches * 2
    settled_ok = not settled or (player_stat_rows > 0 and replay_games > 0 and replay_points > 0)
    pregame_ok = mapping_ok or pregame_player_pages_ok
    ok = pregame_ok and settled_ok
    return {
        "ok": ok,
        "mappedMatches": mapped_matches,
        "matchCount": match_count,
        "fullDepthMatchCount": full_depth_match_count,
        "marketOnlyMatchCount": max(match_count - full_depth_match_count, 0),
        "requiredPregamePlayers": required_matches * 2,
        "playerProfiles": player_profiles,
        "playerLinks": player_links,
        "playerStatRows": player_stat_rows,
        "formChartPoints": form_chart_points,
        "replayGames": replay_games,
        "replayPoints": replay_points,
        "mode": "settled" if settled else "pregame",
        "error": None if ok else "TennisLive coverage is incomplete for this slate/mode",
    }


def check_kalshi(
    conn: sqlite3.Connection,
    date: str,
    match_count: int,
    settled: bool,
    full_depth_match_count: int,
) -> dict[str, Any]:
    match_markets = scalar(conn, "select count(*) from tennis_kalshi_match_markets where slate_date = ?", (date,))
    candles = scalar(conn, "select count(*) from tennis_kalshi_market_candles where slate_date = ?", (date,))
    trade_features = scalar(conn, "select count(*) from tennis_kalshi_intramatch_trade_features where slate_date = ?", (date,))
    prediction_market_rows = scalar(conn, "select count(*) from tennis_prediction_market_snapshots where slate_date = ?", (date,))
    required_kalshi_rows = (full_depth_match_count or match_count) * 2
    markets_ok = (full_depth_match_count or match_count) > 0
    settled_ok = not settled or (candles > 0 and trade_features > 0)
    ok = markets_ok and settled_ok
    return {
        "ok": ok,
        "matchMarkets": match_markets,
        "predictionMarketRows": prediction_market_rows,
        "fullDepthMatchCount": full_depth_match_count,
        "requiredKalshiRows": required_kalshi_rows,
        "candles": candles,
        "tradeFeatures": trade_features,
        "mode": "settled" if settled else "pregame",
        "warning": None if prediction_market_rows >= required_kalshi_rows else "Kalshi/prediction-market lane is partial for this slate; sportsbook lines remain authoritative where present",
        "error": None if ok else "Kalshi settled-lane coverage is incomplete for this slate/mode",
    }


def check_weather(
    conn: sqlite3.Connection,
    date: str,
    match_count: int,
    settled: bool,
    full_depth_match_count: int,
) -> dict[str, Any]:
    if not table_exists(conn, "tennis_weather_hourly") or not table_exists(conn, "tennis_match_weather"):
        return {
            "ok": False,
            "hourlyRows": 0,
            "matchWeatherRows": 0,
            "mode": "settled" if settled else "pregame",
            "error": "weather warehouse tables are missing",
        }
    hourly_rows = scalar(conn, "select count(*) from tennis_weather_hourly where weather_date = ?", (date,))
    match_weather_rows = scalar(conn, "select count(*) from tennis_match_weather where slate_date = ?", (date,))
    if match_weather_rows == 0:
        return {
            "ok": True,
            "hourlyRows": hourly_rows,
            "matchWeatherRows": match_weather_rows,
            "completeRows": 0,
            "fullDepthCompleteRows": 0,
            "fullDepthMatchCount": full_depth_match_count,
            "marketOnlyIncompleteRows": 0,
            "matchCount": match_count,
            "mode": "settled" if settled else "pregame",
            "warning": "no match weather attachment present for this slate; TennisLive/player/market coverage remains authoritative",
            "error": None,
        }
    complete_rows = scalar(
        conn,
        """
        select count(*)
        from tennis_match_weather
        where slate_date = ?
          and hourly_rows > 0
          and avg_temperature_c is not null
          and start_ts is not null
          and end_ts is not null
        """,
        (date,),
    )
    full_depth_complete_rows = scalar(
        conn,
        """
        select count(*)
        from tennis_match_weather weather
        join matches matches on matches.match_id = weather.match_id
        where weather.slate_date = ?
          and matches.match_date = ?
          and matches.match_id like 'tl-%'
          and weather.hourly_rows > 0
          and weather.avg_temperature_c is not null
          and weather.start_ts is not null
          and weather.end_ts is not null
        """,
        (date, date),
    )
    required_complete_rows = full_depth_match_count or match_count
    ok = (
        hourly_rows > 0
        and match_count > 0
        and match_weather_rows >= match_count
        and full_depth_complete_rows >= required_complete_rows
    )
    return {
        "ok": ok,
        "hourlyRows": hourly_rows,
        "matchWeatherRows": match_weather_rows,
        "completeRows": complete_rows,
        "fullDepthCompleteRows": full_depth_complete_rows,
        "fullDepthMatchCount": full_depth_match_count,
        "marketOnlyIncompleteRows": max(match_count - complete_rows, 0),
        "matchCount": match_count,
        "mode": "settled" if settled else "pregame",
        "error": None if ok else "weather coverage is incomplete for this slate",
    }


def check_results_and_training(conn: sqlite3.Connection, date: str, match_count: int, settled: bool) -> dict[str, Any]:
    result_rows = scalar(conn, "select count(*) from tennis_match_results where slate_date = ?", (date,))
    completed_results = scalar(conn, "select count(*) from tennis_match_results where slate_date = ? and completed = 1", (date,))
    training_rows = scalar(conn, "select count(*) from tennis_model_training_rows where slate_date = ?", (date,))
    labels = scalar(
        conn,
        "select count(*) from tennis_model_training_rows where slate_date = ? and training_label_available = 1",
        (date,),
    )
    ok = True
    error = None
    if settled:
        ok = result_rows >= match_count and completed_results >= match_count and training_rows >= match_count and labels >= match_count
        error = None if ok else "settled slate is missing result rows or model-training labels"
    return {
        "ok": ok,
        "mode": "settled" if settled else "pregame",
        "resultRows": result_rows,
        "completedResults": completed_results,
        "trainingRows": training_rows,
        "trainingLabels": labels,
        "error": error,
    }


def check_settlement_readiness(
    date: str,
    tennislive: dict[str, Any],
    kalshi: dict[str, Any],
    results_training: dict[str, Any],
    *,
    settled: bool,
) -> dict[str, Any]:
    payload = {
        "date": date,
        "mode": "settled" if settled else "pregame",
        "tennisliveReplayGames": tennislive.get("replayGames", 0),
        "tennisliveReplayPoints": tennislive.get("replayPoints", 0),
        "kalshiCandles": kalshi.get("candles", 0),
        "kalshiTradeFeatures": kalshi.get("tradeFeatures", 0),
        "resultRows": results_training.get("resultRows", 0),
        "completedResults": results_training.get("completedResults", 0),
        "trainingRows": results_training.get("trainingRows", 0),
        "trainingLabels": results_training.get("trainingLabels", 0),
    }
    if not settled:
        return with_status(payload, "not_applicable", warning="settlement artifacts are not required in pregame mode")
    failures = [
        name for name, check in (
            ("tennislive", tennislive),
            ("kalshi", kalshi),
            ("resultsTraining", results_training),
        )
        if not check.get("ok")
    ]
    if failures:
        return with_status(payload, "failed", error=f"settlement readiness failed sections: {', '.join(failures)}")
    return with_status(payload, "ok")


def check_published(date: str, *, strict: bool = False) -> dict[str, Any]:
    games_dir = PUBLISHED_SLATES_DIR / date / "games"
    if not games_dir.exists():
        return with_status({"path": str(games_dir)}, "failed", error="missing published slate games directory")
    files = sorted(games_dir.glob("*.json"))
    missing: list[dict[str, Any]] = []
    checked_players = 0
    for path in files:
        game = read_json(path)
        context = (game.get("tennisContext") or {}).get("warehouseContext") or {}
        players = context.get("players") or []
        if not players:
            players = (game.get("tennisContext") or {}).get("players") or []
        for player in players:
            warehouse_stats = player.get("warehouseStats") or player
            profile = warehouse_stats.get("profile") or {}
            ranking = warehouse_stats.get("ranking") or {}
            rank = profile.get("rank") or profile.get("currentRanking") or ranking.get("rank") or player.get("rank")
            form = player.get("recentFormMetrics") or {}
            if not form:
                form = warehouse_stats.get("recentFormMetrics") or {}
            matches = (form.get("matches") or [])[:5]
            expected_stats = warehouse_stats.get("expectedStats") or {}
            expected_values = expected_stats.get("stats") or {}
            form_chart = warehouse_stats.get("formChart") or {}
            chart_points = form_chart.get("points") or []
            service_rows = [
                row
                for recent in matches
                for row in (((recent.get("serviceStats") or {}).get("rows")) or [])
            ]
            player_missing = []
            if not profile:
                player_missing.append("profile")
            if rank is None:
                player_missing.append("rank")
            if not matches:
                player_missing.append("recent matches")
            if not expected_values and not service_rows:
                player_missing.append("recent stat rows")
            if not chart_points:
                player_missing.append("form chart")
            if player_missing:
                missing.append({"game": path.name, "player": player.get("name"), "missing": player_missing})
            checked_players += 1
    payload = {
        "gameFiles": len(files),
        "checkedPlayers": checked_players,
        "missingCells": missing[:50],
        "missingCellCount": len(missing),
    }
    if not files or checked_players <= 0:
        return with_status(payload, "failed", error="published tennis detail payload has no game/player context to inspect")
    if strict and missing:
        return with_status(payload, "failed", error="published tennis detail payload has missing TennisLive warehouse identity/stat/chart fields")
    if missing:
        return with_status(payload, "warning", warning="published tennis detail payload has partial warehouse context for one or more players")
    return with_status(payload, "ok")


def check_publish_readiness(
    date: str,
    tennislive_context: dict[str, Any],
    published: dict[str, Any],
    value_books: dict[str, Any],
    *,
    strict: bool = False,
) -> dict[str, Any]:
    payload = {
        "date": date,
        "contextStatus": check_marker(tennislive_context),
        "publishedStatus": check_marker(published),
        "valueBooksStatus": check_marker(value_books),
        "gameFiles": published.get("gameFiles", 0),
        "checkedPlayers": published.get("checkedPlayers", 0),
        "missingPublishedCells": published.get("missingCellCount", 0),
        "missingValueBookGames": value_books.get("missingGameCount", 0),
    }
    failures = [
        name for name, check in (
            ("tennisliveContext", tennislive_context),
            ("published", published),
            ("valueBooks", value_books),
        )
        if not check.get("ok")
    ]
    warnings = [
        name for name, check in (
            ("tennisliveContext", tennislive_context),
            ("published", published),
            ("valueBooks", value_books),
        )
        if check.get("warning")
    ]
    if failures:
        return with_status(payload, "failed", error=f"publish readiness failed sections: {', '.join(failures)}")
    if strict and warnings:
        return with_status(payload, "failed", error=f"strict publish readiness has warnings: {', '.join(warnings)}")
    if warnings:
        return with_status(payload, "warning", warning=f"publish readiness has partial sections: {', '.join(warnings)}")
    return with_status(payload, "ok")


def game_value_book_missing(game: dict[str, Any]) -> list[str]:
    context = game.get("tennisContext") or {}
    matrix = context.get("bettingMatrix") or []
    labels = {str(row.get("label") or row.get("marketType") or "").lower() for row in matrix}
    derivative_markets = context.get("derivativeMarkets") or []
    derivative_labels = {
        str(row.get("label") or row.get("marketType") or "").lower()
        for row in derivative_markets
    }
    value_board = context.get("valueBoard") or {}
    missing: list[str] = []
    if not any("ml" in label or "moneyline" in label for label in labels) and not value_board.get("ml"):
        missing.append("ML value book")
    if not any("o/u" in label or "total games" in label for label in labels) and not value_board.get("total"):
        missing.append("match O/U games value book")
    if not any("1st set" in label or "first-set" in label or "first set" in label for label in labels) and not value_board.get("firstSetTotal"):
        missing.append("1st-set O/U games value book")
    if not any(("o/u" in label or "total" in label) and "first" not in label and "1st" not in label for label in derivative_labels):
        missing.append("match O/U derivative row")
    if not any("1st set" in label or "first-set" in label or "first set" in label for label in derivative_labels):
        missing.append("1st-set O/U derivative row")
    return missing


def check_value_books(date: str, settled: bool) -> dict[str, Any]:
    games_dir = PUBLISHED_SLATES_DIR / date / "games"
    if not games_dir.exists():
        return {"ok": False, "path": str(games_dir), "error": "missing published slate games directory"}
    missing_games = []
    checked_games = 0
    for path in sorted(games_dir.glob("*.json")):
        game = read_json(path)
        if game.get("league") != "Tennis":
            continue
        checked_games += 1
        missing = game_value_book_missing(game)
        if missing:
            missing_games.append({"game": path.name, "missing": missing})

    kalshi_rows = []
    if KALSHI_SPIKE_MODEL_PATH.exists():
        payload = read_json(KALSHI_SPIKE_MODEL_PATH)
        kalshi_rows = [
            row for row in payload.get("currentCandidates") or []
            if str(row.get("occurrenceDatetime") or "").startswith(date)
        ]
    trade_rows = [row for row in kalshi_rows if row.get("spikeModelTier") == "trade"]
    watch_rows = [row for row in kalshi_rows if row.get("spikeModelTier") == "watch"]
    pass_rows = [row for row in kalshi_rows if row.get("spikeModelTier") == "pass"]
    kalshi_ok = True
    summary_missing = []
    summary_path = PUBLISHED_SLATES_DIR / date / "summary.json"
    if summary_path.exists():
        summary = read_json(summary_path).get("tennisValueSummary") or {}
        if not summary.get("modelPickRows"):
            summary_missing.append("summary model-pick ML rows")
        if not summary.get("mlRows"):
            summary_missing.append("summary ML value rows")
        if not summary.get("matchTotalRows"):
            summary_missing.append("summary match O/U rows")
        if not summary.get("firstSetRows"):
            summary_missing.append("summary 1st-set O/U rows")
    else:
        summary_missing.append("published slate summary")
    ok = checked_games > 0 and not missing_games and kalshi_ok
    return {
        "ok": ok,
        "mode": "settled" if settled else "pregame",
        "checkedGames": checked_games,
        "missingGames": missing_games[:50],
        "missingGameCount": len(missing_games),
        "summaryMissing": summary_missing,
        "kalshiRows": len(kalshi_rows),
        "kalshiTradeRows": len(trade_rows),
        "kalshiWatchRows": len(watch_rows),
        "kalshiPassRows": len(pass_rows),
        "topKalshiRows": [
            {
                "selection": row.get("selection"),
                "match": row.get("boardTitle"),
                "tier": row.get("spikeModelTier"),
                "entry": row.get("yesAsk"),
                "target": row.get("spikeModelTarget25x") or row.get("projectedExit"),
                "confidence": row.get("spikeModelProbability25x") or row.get("targetHitProbability"),
            }
            for row in sorted(
                kalshi_rows,
                key=lambda item: (
                    item.get("spikeModelTier") == "trade",
                    item.get("spikeModelTier") == "watch",
                    float(item.get("spikeModelEvPctOfEntry25x") or item.get("tradeEvPctOfEntry") or -9),
                ),
                reverse=True,
            )[:5]
        ],
        "warning": None if not summary_missing and kalshi_rows else "summary/Kalshi aggregate lanes are partial; per-game value books were checked directly",
        "error": None if ok else "published tennis per-game value books are incomplete",
    }


def run_health(date: str, db_path: Path = DEFAULT_DB, settled: bool | None = None, *, strict: bool = False) -> dict[str, Any]:
    is_settled = resolve_settled(date, settled)
    checks: dict[str, Any] = {
        "date": date,
        "mode": "settled" if is_settled else "pregame",
        "strictMode": strict,
    }
    checks["sourceFiles"] = check_source_files(date, strict=strict, settled=is_settled)
    checks["tennisliveContext"] = check_tennislive_context_file(date)
    with connect(db_path) as conn:
        checks["sourceFetch"] = check_source_fetch(conn, date, strict=strict)
        checks["sourceParse"] = check_source_parse(conn, date, strict=strict)
        checks["warehouse"] = check_warehouse(conn, date, strict=strict)
        match_count = int(checks["warehouse"].get("matchCount") or 0)
        full_depth_match_count = core_model_match_count(conn, date)
        checks["matchContract"] = check_match_contract(conn, date)
        checks["rankings"] = check_rankings(conn, date, strict=strict)
        checks["typedInsert"] = check_typed_insert(conn, date, strict=strict)
        checks["slateLinkage"] = check_slate_linkage(conn, date, strict=strict)
        checks["tennislive"] = check_tennislive(conn, date, match_count, is_settled, full_depth_match_count)
        checks["kalshi"] = check_kalshi(conn, date, match_count, is_settled, full_depth_match_count)
        checks["weather"] = check_weather(conn, date, match_count, is_settled, full_depth_match_count)
        checks["resultsTraining"] = check_results_and_training(conn, date, match_count, is_settled)
        checks["settlementReadiness"] = check_settlement_readiness(
            date,
            checks["tennislive"],
            checks["kalshi"],
            checks["resultsTraining"],
            settled=is_settled,
        )
    checks["published"] = check_published(date, strict=strict)
    checks["valueBooks"] = check_value_books(date, is_settled)
    checks["publishReadiness"] = check_publish_readiness(
        date,
        checks["tennisliveContext"],
        checks["published"],
        checks["valueBooks"],
        strict=strict,
    )
    for key, check in checks.items():
        if isinstance(check, dict):
            checks[key] = ensure_status(check)
    checks["ok"] = all(
        health_check_passes(check)
        for key, check in checks.items()
        if isinstance(check, dict) and key not in {"date"}
    )
    return checks


def main() -> int:
    parser = argparse.ArgumentParser(description="Fail-fast health checks for tennis slate pipeline outputs.")
    parser.add_argument("--date", required=True)
    parser.add_argument("--db", default=str(DEFAULT_DB))
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument("--settled", action="store_true", help="Require result, replay, candle, and training-label coverage.")
    mode.add_argument("--pregame", action="store_true", help="Only require pre-match source, mapping, and market coverage.")
    parser.add_argument("--strict", action="store_true", help="Promote partial-context diagnostics and optional source warnings to hard failures.")
    parser.add_argument("--json", action="store_true", help="Print machine-readable JSON only.")
    args = parser.parse_args()

    settled_arg = True if args.settled else False if args.pregame else None
    report = run_health(args.date, Path(args.db), settled=settled_arg, strict=args.strict)
    if args.json:
        print(json.dumps(report, indent=2, sort_keys=True))
    else:
        status = "PASS" if report["ok"] else "FAIL"
        strict_suffix = ", strict" if report.get("strictMode") else ""
        print(f"Tennis pipeline health {status} for {args.date} ({report['mode']}{strict_suffix})")
        for name in (
            "sourceFiles",
            "sourceFetch",
            "sourceParse",
            "matchContract",
            "rankings",
            "typedInsert",
            "slateLinkage",
            "tennisliveContext",
            "warehouse",
            "tennislive",
            "kalshi",
            "weather",
            "settlementReadiness",
            "resultsTraining",
            "publishReadiness",
            "published",
            "valueBooks",
        ):
            check = report[name]
            marker = check_marker(check)
            print(f"- {name}: {marker}")
            if check.get("warning"):
                print(f"  {check['warning']}")
            if check.get("error"):
                print(f"  {check['error']}")
        if not report["ok"]:
            print(json.dumps(report, indent=2, sort_keys=True))
    return 0 if report["ok"] else 1


if __name__ == "__main__":
    sys.exit(main())
