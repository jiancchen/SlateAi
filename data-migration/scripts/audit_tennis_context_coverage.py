#!/usr/bin/env python3
"""Audit TennisLive/canonical sidecar context coverage."""

from __future__ import annotations

import argparse
import json
import re
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


DEFAULT_DB = Path("data-private/warehouse/sports/tennis/sql-tennis.db")
DEFAULT_SQL = Path("data-migration/contracts/tennis_canonical_audit_views.sql")
DEFAULT_JSON = Path("data-migration/reports/tennis_context_coverage.json")
DEFAULT_MARKDOWN = Path("data-migration/reports/tennis_context_coverage.md")


def connect(db_path: Path) -> sqlite3.Connection:
    con = sqlite3.connect(f"file:{db_path}?mode=ro", uri=True)
    con.row_factory = sqlite3.Row
    return con


def rows(con: sqlite3.Connection, sql: str, params: tuple[Any, ...] = ()) -> list[dict[str, Any]]:
    return [dict(row) for row in con.execute(sql, params).fetchall()]


def temp_view_sql(sql: str) -> str:
    converted = re.sub(
        r"drop\s+view\s+if\s+exists\s+([a-zA-Z0-9_]+)",
        r"drop view if exists temp.\1",
        sql,
        flags=re.IGNORECASE,
    )
    return re.sub(
        r"create\s+view\s+([a-zA-Z0-9_]+)\s+as",
        r"create temp view \1 as",
        converted,
        flags=re.IGNORECASE,
    )


def scope_clause(alias: str, start_date: str | None, end_date: str | None) -> tuple[str, list[Any]]:
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
    return " where " + " and ".join(clauses), params


def create_context_view(con: sqlite3.Connection) -> None:
    con.executescript(
        """
        drop view if exists temp.v_tennis_context_coverage;
        create temp view v_tennis_context_coverage as
        select
          cm.match_id,
          cm.match_date,
          cm.start_time_utc,
          cm.status,
          cm.tour,
          cm.surface,
          cm.tournament_name,
          cm.tennislive_match_url,
          coalesce((
            select group_concat(p.name, ' | ')
            from match_players mp
            join players p on p.player_id = mp.player_id
            where mp.match_id = cm.match_id
          ), '') as players,
          case when exists (
            select 1 from tennislive_match_summaries s
            where s.match_id = cm.match_id
          ) then 1 else 0 end as has_summary,
          case when exists (
            select 1 from tennislive_match_summaries s
            where s.match_id = cm.match_id
              and lower(coalesce(s.status, '')) like '%complete%'
              and coalesce(s.winner_name, '') != ''
          ) then 1 else 0 end as has_result_summary,
          case when exists (
            select 1 from tennislive_match_replay_games rg
            where rg.match_id = cm.match_id
          ) then 1 else 0 end as has_replay_games,
          case when exists (
            select 1 from tennislive_match_replay_points rp
            where rp.match_id = cm.match_id
          ) then 1 else 0 end as has_replay_points,
          case when exists (
            select 1
            from match_players p1
            join match_players p2
              on p2.match_id = p1.match_id
             and p2.player_id != p1.player_id
            where p1.match_id = cm.match_id
              and exists (
                select 1
                from tennislive_h2h_source_rows h
                where (h.player1_id = p1.player_id and h.player2_id = p2.player_id)
                   or (h.player1_id = p2.player_id and h.player2_id = p1.player_id)
              )
          ) then 1 else 0 end as has_h2h_pair_rows,
          case when exists (
            select 1 from match_stat_rows sr
            where sr.match_id = cm.match_id
          ) then 1 else 0 end as has_any_stat_rows,
          case when exists (
            select 1 from match_stat_rows sr
            where sr.match_id = cm.match_id
              and sr.source_name = 'tennislive'
          ) then 1 else 0 end as has_tennislive_stat_rows,
          case when exists (
            select 1 from match_stat_rows sr
            where sr.match_id = cm.match_id
              and sr.source_name = 'flashscore'
          ) then 1 else 0 end as has_flashscore_stat_rows,
          case when exists (
            select 1 from match_stat_rows sr
            where sr.match_id = cm.match_id
              and sr.source_name = 'sofascore'
          ) then 1 else 0 end as has_sofascore_stat_rows,
          case when (
            select count(distinct mp.player_id)
            from match_players mp
            where mp.match_id = cm.match_id
              and exists (
                select 1
                from player_form_snapshots fs
                where fs.player_id = mp.player_id
                  and substr(fs.snapshot_date, 1, 10) <= cm.match_date
              )
          ) = 2 then 1 else 0 end as has_form_for_both_players
        from v_tennis_canonical_matches cm;
        """
    )


def build_report(con: sqlite3.Connection, args: argparse.Namespace) -> dict[str, Any]:
    con.executescript(temp_view_sql(args.sql.read_text(encoding="utf-8")))
    create_context_view(con)
    scoped_where, params = scope_clause("c", args.start_date, args.end_date)
    date_rows = rows(
        con,
        f"""
        select
          c.match_date,
          count(*) as canonical_matches,
          sum(c.has_summary) as with_summary,
          sum(c.has_result_summary) as with_result_summary,
          sum(c.has_replay_games) as with_replay_games,
          sum(c.has_replay_points) as with_replay_points,
          sum(c.has_h2h_pair_rows) as with_h2h_pair_rows,
          sum(c.has_any_stat_rows) as with_any_stat_rows,
          sum(c.has_tennislive_stat_rows) as with_tennislive_stat_rows,
          sum(c.has_flashscore_stat_rows) as with_flashscore_stat_rows,
          sum(c.has_sofascore_stat_rows) as with_sofascore_stat_rows,
          sum(c.has_form_for_both_players) as with_form_for_both_players
        from v_tennis_context_coverage c
        {scoped_where}
        group by c.match_date
        order by c.match_date
        """,
        tuple(params),
    )
    summary = {
        "canonicalMatches": sum(row["canonical_matches"] for row in date_rows),
        "withSummary": sum(row["with_summary"] or 0 for row in date_rows),
        "withResultSummary": sum(row["with_result_summary"] or 0 for row in date_rows),
        "withReplayGames": sum(row["with_replay_games"] or 0 for row in date_rows),
        "withReplayPoints": sum(row["with_replay_points"] or 0 for row in date_rows),
        "withH2hPairRows": sum(row["with_h2h_pair_rows"] or 0 for row in date_rows),
        "withAnyStatRows": sum(row["with_any_stat_rows"] or 0 for row in date_rows),
        "withTennisLiveStatRows": sum(row["with_tennislive_stat_rows"] or 0 for row in date_rows),
        "withFlashscoreStatRows": sum(row["with_flashscore_stat_rows"] or 0 for row in date_rows),
        "withSofascoreStatRows": sum(row["with_sofascore_stat_rows"] or 0 for row in date_rows),
        "withFormForBothPlayers": sum(row["with_form_for_both_players"] or 0 for row in date_rows),
    }
    examples = {}
    for field in [
        "has_summary",
        "has_replay_points",
        "has_h2h_pair_rows",
        "has_any_stat_rows",
        "has_form_for_both_players",
    ]:
        examples[f"missing_{field.removeprefix('has_')}"] = rows(
            con,
            f"""
            select
              c.match_id,
              c.match_date,
              c.players,
              c.tournament_name,
              c.status,
              c.tennislive_match_url
            from v_tennis_context_coverage c
            {scoped_where}
            {"and" if scoped_where else "where"} c.{field} = 0
            order by c.match_date desc, c.match_id
            limit ?
            """,
            tuple(params + [args.limit]),
        )
    return {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "script": "data-migration/scripts/audit_tennis_context_coverage.py",
        "db_path": str(args.db),
        "sql_path": str(args.sql),
        "scope": {"start_date": args.start_date, "end_date": args.end_date},
        "limit": args.limit,
        "summary": summary,
        "byDate": date_rows,
        "examples": examples,
    }


def markdown_table(headers: list[str], body: list[list[Any]]) -> str:
    def cell(value: Any) -> str:
        return str("" if value is None else value).replace("|", r"\|").replace("\n", " ")

    lines = [
        "| " + " | ".join(cell(header) for header in headers) + " |",
        "| " + " | ".join("---" for _ in headers) + " |",
    ]
    for row in body:
        lines.append("| " + " | ".join(cell(value) for value in row) + " |")
    return "\n".join(lines)


def first_entries(rows_value: list[dict[str, Any]], limit: int = 12) -> list[dict[str, Any]]:
    return list(rows_value or [])[:limit]


def write_markdown(report: dict[str, Any], path: Path) -> None:
    summary = report["summary"]
    lines = [
        "# Tennis Context Coverage Audit",
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
        "## By Date",
        "",
        markdown_table(
            [
                "Date",
                "Canonical",
                "Summary",
                "Result",
                "Replay",
                "H2H",
                "Stats",
                "Form",
            ],
            [
                [
                    row["match_date"],
                    row["canonical_matches"],
                    row["with_summary"],
                    row["with_result_summary"],
                    row["with_replay_points"],
                    row["with_h2h_pair_rows"],
                    row["with_any_stat_rows"],
                    row["with_form_for_both_players"],
                ]
                for row in report["byDate"]
            ],
        ),
        "",
        "## Missing Replay Examples",
        "",
        markdown_table(
            ["Date", "Match", "Players", "Tournament"],
            [
                [row["match_date"], row["match_id"], row["players"], row["tournament_name"]]
                for row in first_entries(report["examples"]["missing_replay_points"])
            ],
        ),
        "",
        "## Missing H2H Pair Examples",
        "",
        markdown_table(
            ["Date", "Match", "Players", "Tournament"],
            [
                [row["match_date"], row["match_id"], row["players"], row["tournament_name"]]
                for row in first_entries(report["examples"]["missing_h2h_pair_rows"])
            ],
        ),
        "",
        "## Missing Form Examples",
        "",
        markdown_table(
            ["Date", "Match", "Players", "Tournament"],
            [
                [row["match_date"], row["match_id"], row["players"], row["tournament_name"]]
                for row in first_entries(report["examples"]["missing_form_for_both_players"])
            ],
        ),
        "",
        "## Notes",
        "",
        "- This report is read-only and uses temporary canonical audit views.",
        "- Coverage is not feature approval; it only shows whether canonical matches have sidecar context available.",
        "- Form coverage requires both match players to have at least one form snapshot dated on or before the match date.",
        "",
    ]
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text("\n".join(lines), encoding="utf-8")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Audit TennisLive/canonical context coverage.")
    parser.add_argument("--db", type=Path, default=DEFAULT_DB)
    parser.add_argument("--sql", type=Path, default=DEFAULT_SQL)
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
    if not args.sql.exists():
        raise SystemExit(f"Missing SQL: {args.sql}")
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
