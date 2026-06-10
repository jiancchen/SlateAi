#!/usr/bin/env python3
"""Audit tennis player identity and entity-resolution readiness."""

from __future__ import annotations

import argparse
import json
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


DEFAULT_DB = Path("data-private/warehouse/sports/tennis/sql-tennis.db")
DEFAULT_JSON = Path("data-migration/reports/tennis_entity_resolution.json")
DEFAULT_MARKDOWN = Path("data-migration/reports/tennis_entity_resolution.md")


def connect(db_path: Path) -> sqlite3.Connection:
    con = sqlite3.connect(f"file:{db_path}?mode=ro", uri=True)
    con.row_factory = sqlite3.Row
    return con


def rows(con: sqlite3.Connection, sql: str, params: tuple[Any, ...] = ()) -> list[dict[str, Any]]:
    return [dict(row) for row in con.execute(sql, params).fetchall()]


def one(con: sqlite3.Connection, sql: str, params: tuple[Any, ...] = ()) -> int:
    return int(con.execute(sql, params).fetchone()[0] or 0)


def match_date_filter(alias: str, start_date: str | None, end_date: str | None) -> tuple[str, list[Any]]:
    clauses = []
    params: list[Any] = []
    if start_date:
        clauses.append(f"{alias}.match_date >= ?")
        params.append(start_date)
    if end_date:
        clauses.append(f"{alias}.match_date <= ?")
        params.append(end_date)
    if not clauses:
        return "", params
    return " and " + " and ".join(clauses), params


def match_id_date_filter(alias: str, match_id_column: str, start_date: str | None, end_date: str | None) -> tuple[str, list[Any]]:
    clauses = []
    params: list[Any] = []
    if start_date:
        clauses.append("m_scope.match_date >= ?")
        params.append(start_date)
    if end_date:
        clauses.append("m_scope.match_date <= ?")
        params.append(end_date)
    if not clauses:
        return "1=1", params
    return (
        f"""
        exists (
          select 1
          from matches m_scope
          where m_scope.match_id = {alias}.{match_id_column}
            and {" and ".join(clauses)}
        )
        """,
        params,
    )


def status_counts(con: sqlite3.Connection, table: str, status_column: str, policy_column: str | None = None) -> list[dict[str, Any]]:
    columns = f"{status_column} as status"
    group = status_column
    order = "rows desc, status"
    if policy_column:
        columns += f", {policy_column} as policy"
        group += f", {policy_column}"
        order += ", policy"
    return rows(
        con,
        f"""
        select {columns}, count(*) as rows
        from {table}
        where sport = 'tennis'
        group by {group}
        order by {order}
        """,
    )


def build_report(con: sqlite3.Connection, args: argparse.Namespace) -> dict[str, Any]:
    match_scope, match_params = match_date_filter("m", args.start_date, args.end_date)
    mp_scope, mp_params = match_id_date_filter("mp", "match_id", args.start_date, args.end_date)
    ms_scope, ms_params = match_id_date_filter("ms", "match_id", args.start_date, args.end_date)

    players_missing_registry_count = one(
        con,
        """
        select count(*)
        from players p
        left join player_identity_registry r on r.player_id = p.player_id and r.sport = 'tennis'
        where r.player_id is null
        """,
    )
    registry_missing_player_count = one(
        con,
        """
        select count(*)
        from player_identity_registry r
        left join players p on p.player_id = r.player_id
        where r.sport = 'tennis'
          and p.player_id is null
        """,
    )
    duplicate_name_group_count = one(
        con,
        """
        select count(*)
        from (
          select lower(trim(canonical_name)) as normalized_name, count(*) as players
          from players
          where coalesce(canonical_name, '') != ''
          group by normalized_name
          having players > 1
        )
        """,
    )
    duplicate_side_groups_count = one(
        con,
        f"""
        select count(*)
        from (
          select mp.match_id, mp.side, count(*) as rows
          from match_players mp
          where {mp_scope}
          group by mp.match_id, mp.side
          having rows > 1
        )
        """,
        tuple(mp_params),
    )
    match_players_missing_player_count = one(
        con,
        f"""
        select count(*)
        from match_players mp
        left join players p on p.player_id = mp.player_id
        where {mp_scope}
          and p.player_id is null
        """,
        tuple(mp_params),
    )
    match_players_missing_registry_count = one(
        con,
        f"""
        select count(*)
        from match_players mp
        left join player_identity_registry r on r.player_id = mp.player_id and r.sport = 'tennis'
        where {mp_scope}
          and r.player_id is null
        """,
        tuple(mp_params),
    )
    match_players_without_tl_count = one(
        con,
        f"""
        select count(*)
        from match_players mp
        left join tennislive_player_sources tl on tl.player_id = mp.player_id and tl.active = 1
        where {mp_scope}
          and tl.player_id is null
        """,
        tuple(mp_params),
    )
    market_missing_player_id_count = one(
        con,
        f"""
        select count(*)
        from market_snapshots ms
        where {ms_scope}
          and (ms.player_id is null or ms.player_id = '')
        """,
        tuple(ms_params),
    )
    market_dangling_player_id_count = one(
        con,
        f"""
        select count(*)
        from market_snapshots ms
        left join players p on p.player_id = ms.player_id
        where {ms_scope}
          and ms.player_id is not null
          and ms.player_id != ''
          and p.player_id is null
        """,
        tuple(ms_params),
    )
    redirect_dangling_count = one(
        con,
        """
        select count(*)
        from player_identity_redirects r
        left join players p_from on p_from.player_id = r.from_player_id
        left join players p_to on p_to.player_id = r.to_player_id
        where r.sport = 'tennis'
          and (p_from.player_id is null or p_to.player_id is null)
        """,
    )
    candidate_missing_proposed_count = one(
        con,
        """
        select count(*)
        from player_identity_redirect_candidates c
        left join players p on p.player_id = c.proposed_player_id
        where c.sport = 'tennis'
          and c.proposed_player_id is not null
          and p.player_id is null
        """,
    )
    summary = {
        "players": one(con, "select count(*) from players"),
        "playerIdentityRegistryRows": one(con, "select count(*) from player_identity_registry where sport = 'tennis'"),
        "activeTennisLivePlayerSources": one(con, "select count(*) from tennislive_player_sources where active = 1"),
        "playerIdentityRedirects": one(con, "select count(*) from player_identity_redirects where sport = 'tennis'"),
        "playerIdentityRedirectCandidates": one(con, "select count(*) from player_identity_redirect_candidates where sport = 'tennis'"),
        "openUnresolvedPlayerEntities": one(
            con,
            "select count(*) from unresolved_entities where entity_type = 'player' and status = 'open'",
        ),
        "playersMissingRegistry": players_missing_registry_count,
        "registryRowsMissingPlayer": registry_missing_player_count,
        "duplicateCanonicalNameGroups": duplicate_name_group_count,
        "duplicateMatchPlayerSideGroups": duplicate_side_groups_count,
        "matchPlayerRowsMissingPlayer": match_players_missing_player_count,
        "matchPlayerRowsMissingRegistry": match_players_missing_registry_count,
        "matchPlayerRowsWithoutActiveTennisLiveSource": match_players_without_tl_count,
        "marketRowsMissingPlayerId": market_missing_player_id_count,
        "marketRowsWithDanglingPlayerId": market_dangling_player_id_count,
        "redirectRowsWithDanglingPlayerId": redirect_dangling_count,
        "redirectCandidatesWithDanglingProposedPlayerId": candidate_missing_proposed_count,
    }
    examples = {
        "playersMissingRegistry": rows(
            con,
            """
            select p.player_id, p.name, p.canonical_name, p.tour, p.country, p.active
            from players p
            left join player_identity_registry r on r.player_id = p.player_id and r.sport = 'tennis'
            where r.player_id is null
            order by p.player_id
            limit ?
            """,
            (args.limit,),
        ),
        "duplicateCanonicalNameGroups": rows(
            con,
            """
            select lower(trim(canonical_name)) as normalized_name,
                   count(*) as players,
                   group_concat(player_id) as player_ids,
                   group_concat(name) as display_names
            from players
            where coalesce(canonical_name, '') != ''
            group by normalized_name
            having players > 1
            order by players desc, normalized_name
            limit ?
            """,
            (args.limit,),
        ),
        "duplicateMatchPlayerSideGroups": rows(
            con,
            f"""
            select mp.match_id, mp.side, count(*) as rows, group_concat(mp.player_id) as player_ids
            from match_players mp
            where {mp_scope}
            group by mp.match_id, mp.side
            having rows > 1
            order by rows desc, mp.match_id
            limit ?
            """,
            tuple(mp_params + [args.limit]),
        ),
        "matchPlayersMissingRegistry": rows(
            con,
            f"""
            select mp.match_id, m.match_date, mp.player_id, mp.side, mp.market_name
            from match_players mp
            left join matches m on m.match_id = mp.match_id
            left join player_identity_registry r on r.player_id = mp.player_id and r.sport = 'tennis'
            where {mp_scope}
              and r.player_id is null
            order by m.match_date desc, mp.match_id, mp.side
            limit ?
            """,
            tuple(mp_params + [args.limit]),
        ),
        "matchPlayersWithoutActiveTennisLiveSource": rows(
            con,
            f"""
            select mp.match_id, m.match_date, mp.player_id, p.name, p.canonical_name, mp.side, mp.market_name
            from match_players mp
            left join matches m on m.match_id = mp.match_id
            left join players p on p.player_id = mp.player_id
            left join tennislive_player_sources tl on tl.player_id = mp.player_id and tl.active = 1
            where {mp_scope}
              and tl.player_id is null
            order by m.match_date desc, mp.match_id, mp.side
            limit ?
            """,
            tuple(mp_params + [args.limit]),
        ),
        "marketRowsMissingPlayerId": rows(
            con,
            f"""
            select ms.market_snapshot_id, ms.match_id, ms.source_name, ms.market_type, ms.selection, ms.captured_at
            from market_snapshots ms
            where {ms_scope}
              and (ms.player_id is null or ms.player_id = '')
            order by ms.captured_at desc, ms.source_name, ms.match_id
            limit ?
            """,
            tuple(ms_params + [args.limit]),
        ),
        "marketRowsWithDanglingPlayerId": rows(
            con,
            f"""
            select ms.market_snapshot_id, ms.match_id, ms.player_id, ms.source_name, ms.market_type, ms.selection, ms.captured_at
            from market_snapshots ms
            left join players p on p.player_id = ms.player_id
            where {ms_scope}
              and ms.player_id is not null
              and ms.player_id != ''
              and p.player_id is null
            order by ms.captured_at desc, ms.source_name, ms.match_id
            limit ?
            """,
            tuple(ms_params + [args.limit]),
        ),
        "redirectRowsWithDanglingPlayerId": rows(
            con,
            """
            select r.from_player_id, r.to_player_id, r.redirect_status, r.redirect_policy, r.confidence
            from player_identity_redirects r
            left join players p_from on p_from.player_id = r.from_player_id
            left join players p_to on p_to.player_id = r.to_player_id
            where r.sport = 'tennis'
              and (p_from.player_id is null or p_to.player_id is null)
            order by r.redirect_status, r.from_player_id
            limit ?
            """,
            (args.limit,),
        ),
    }
    scoped_match_dates = rows(
        con,
        f"""
        select m.match_date,
               count(distinct m.match_id) as matches,
               count(mp.player_id) as participant_rows,
               sum(case when tl.player_id is null then 1 else 0 end) as participant_rows_without_active_tennislive_source
        from matches m
        left join match_players mp on mp.match_id = m.match_id
        left join tennislive_player_sources tl on tl.player_id = mp.player_id and tl.active = 1
        where 1=1{match_scope}
        group by m.match_date
        order by m.match_date
        """,
        tuple(match_params),
    )
    return {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "script": "data-migration/scripts/audit_tennis_entity_resolution.py",
        "db_path": str(args.db),
        "scope": {"start_date": args.start_date, "end_date": args.end_date},
        "limit": args.limit,
        "summary": summary,
        "redirectStatusCounts": status_counts(con, "player_identity_redirects", "redirect_status", "redirect_policy"),
        "redirectCandidateStatusCounts": status_counts(
            con,
            "player_identity_redirect_candidates",
            "candidate_status",
            "evidence_policy",
        ),
        "unresolvedPlayerEntitiesBySource": rows(
            con,
            """
            select source_name, status, reason, count(*) as rows
            from unresolved_entities
            where entity_type = 'player'
            group by source_name, status, reason
            order by rows desc, source_name, status, reason
            """,
        ),
        "matchDates": scoped_match_dates,
        "examples": examples,
    }


def markdown_table(headers: list[str], body: list[list[Any]]) -> str:
    lines = [
        "| " + " | ".join(headers) + " |",
        "| " + " | ".join("---" for _ in headers) + " |",
    ]
    for row in body:
        lines.append("| " + " | ".join(str(cell) for cell in row) + " |")
    return "\n".join(lines)


def first_entries(section: list[dict[str, Any]], limit: int = 12) -> list[dict[str, Any]]:
    return list(section or [])[:limit]


def write_markdown(report: dict[str, Any], path: Path) -> None:
    summary = report["summary"]
    examples = report["examples"]
    lines = [
        "# Tennis Entity Resolution Audit",
        "",
        f"Generated: `{report['generated_at']}`",
        "",
        f"DB: `{report['db_path']}`",
        "",
        f"Scope: `{report['scope']['start_date'] or 'beginning'}` to `{report['scope']['end_date'] or 'end'}`",
        "",
        "## Summary",
        "",
        markdown_table(["Metric", "Count"], [[name, count] for name, count in summary.items()]),
        "",
        "## Redirect Status Counts",
        "",
        markdown_table(
            ["Status", "Policy", "Rows"],
            [[row["status"], row.get("policy", ""), row["rows"]] for row in report["redirectStatusCounts"]],
        ),
        "",
        "## Redirect Candidate Counts",
        "",
        markdown_table(
            ["Status", "Policy", "Rows"],
            [[row["status"], row.get("policy", ""), row["rows"]] for row in report["redirectCandidateStatusCounts"]],
        ),
        "",
        "## Match Date Participant Attachment",
        "",
        markdown_table(
            ["Date", "Matches", "Participant rows", "Rows without active TennisLive player source"],
            [
                [
                    row["match_date"],
                    row["matches"],
                    row["participant_rows"],
                    row["participant_rows_without_active_tennislive_source"],
                ]
                for row in report["matchDates"]
            ],
        ),
        "",
        "## Players Missing Registry",
        "",
        markdown_table(
            ["Player", "Name", "Canonical", "Tour", "Active"],
            [
                [row["player_id"], row["name"], row["canonical_name"], row["tour"], row["active"]]
                for row in first_entries(examples["playersMissingRegistry"])
            ],
        ),
        "",
        "## Match Players Without Active TennisLive Source",
        "",
        markdown_table(
            ["Date", "Match", "Player", "Name", "Side"],
            [
                [row["match_date"], row["match_id"], row["player_id"], row["name"], row["side"]]
                for row in first_entries(examples["matchPlayersWithoutActiveTennisLiveSource"])
            ],
        ),
        "",
        "## Market Rows Missing Player Id",
        "",
        markdown_table(
            ["Market row", "Match", "Source", "Market", "Selection", "Captured"],
            [
                [row["market_snapshot_id"], row["match_id"], row["source_name"], row["market_type"], row["selection"], row["captured_at"]]
                for row in first_entries(examples["marketRowsMissingPlayerId"])
            ],
        ),
        "",
        "## Notes",
        "",
        "- This report is read-only and does not apply redirects, merges, or deletes.",
        "- Missing active TennisLive player source is a review signal, not automatic proof of a bad player row.",
        "- Redirect and redirect-candidate rows are forensic evidence for human identity review before any model-input contract is designed.",
        "",
    ]
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text("\n".join(lines), encoding="utf-8")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Audit tennis entity resolution readiness.")
    parser.add_argument("--db", type=Path, default=DEFAULT_DB)
    parser.add_argument("--out", type=Path, default=DEFAULT_JSON)
    parser.add_argument("--markdown", type=Path, default=DEFAULT_MARKDOWN)
    parser.add_argument("--start-date")
    parser.add_argument("--end-date")
    parser.add_argument("--limit", type=int, default=200)
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    if args.limit < 1:
        raise SystemExit("--limit must be positive")
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
                "json": str(args.out),
                "markdown": str(args.markdown),
                "summary": report["summary"],
            },
            indent=2,
            sort_keys=True,
        )
    )


if __name__ == "__main__":
    main()
