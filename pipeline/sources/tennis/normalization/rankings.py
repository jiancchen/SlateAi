from __future__ import annotations

import sqlite3
from dataclasses import dataclass
from typing import Any

from .common import (
    TennisIdentityResolver,
    compact_json,
    normalize_name,
    stable_id,
    to_float,
    to_int,
    utc_now,
)


@dataclass(frozen=True)
class ParsedRanking:
    ranking_id: str
    player_id: str
    ranking_date: str
    tour: str
    rank: int | None
    points: int | None
    age: float | None
    country: str | None
    source_name: str | None
    source_snapshot_id: str | None


def ranking_id_for(ranking_date: str, tour: str, player_name: Any) -> str:
    normalized = normalize_name(player_name).replace(" ", "-")
    if normalized:
        return f"tennis-ranking-{ranking_date}-{tour}-{normalized}"
    return f"tennis-ranking-{stable_id(ranking_date, tour, player_name, length=32)}"


def parse_rankings_payload(
    payload: dict[str, Any],
    resolver: TennisIdentityResolver,
    *,
    source_snapshot_id: str | None = None,
    local_path: str | None = None,
) -> tuple[list[ParsedRanking], dict[str, int]]:
    players = payload.get("players")
    if not isinstance(players, dict):
        players = {}
    counts = {
        "source_rows": 0,
        "parsed_rankings": 0,
        "unparsed_rows": 0,
        "alias_rows": 0,
    }
    rows: list[ParsedRanking] = []
    default_date = payload.get("asOf")
    for source_key, row in players.items():
        if not isinstance(row, dict):
            counts["unparsed_rows"] += 1
            continue
        counts["source_rows"] += 1
        name = row.get("name") or source_key
        tour = str(row.get("tour") or "").upper()
        ranking_date = str(row.get("asOf") or default_date or "")
        if not name or not tour or not ranking_date:
            counts["unparsed_rows"] += 1
            continue
        player_id = resolver.player_id_by_name("tennis_rankings", name)
        if not player_id:
            expected_player_id = f"tennis-player-{normalize_name(name).replace(' ', '-')}"
            if expected_player_id in resolver.players:
                player_id = expected_player_id
                resolver.upsert_alias("player", player_id, "tennis_rankings", row.get("profileUrl"), name, 0.93)
                counts["alias_rows"] += 1
        if not player_id:
            resolver.insert_unresolved(
                "tennis_ranking_player",
                "tennis_rankings",
                row.get("profileUrl") or source_key,
                name,
                {"local_path": local_path, "source_key": source_key, "payload": row},
                "Could not confidently map ranking row to canonical tennis player.",
            )
            counts["unparsed_rows"] += 1
            continue
        if row.get("profileUrl"):
            resolver.upsert_alias("player", player_id, "tennis_rankings", row.get("profileUrl"), name, 0.94)
            counts["alias_rows"] += 1
        rows.append(
            ParsedRanking(
                ranking_id=ranking_id_for(ranking_date, tour, name),
                player_id=player_id,
                ranking_date=ranking_date,
                tour=tour,
                rank=to_int(row.get("rank")),
                points=to_int(row.get("points")),
                age=to_float(row.get("age")),
                country=None if row.get("country") is None else str(row.get("country")),
                source_name=row.get("source") or payload.get("source"),
                source_snapshot_id=source_snapshot_id,
            )
        )
    counts["parsed_rankings"] = len(rows)
    return rows, counts


def insert_rankings(con: sqlite3.Connection, rows: list[ParsedRanking]) -> int:
    inserted = 0
    for row in rows:
        con.execute(
            """
            insert into rankings (
              ranking_id, player_id, ranking_date, tour, rank, points,
              age, country, source_name, source_snapshot_id
            ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            on conflict(ranking_id) do update set
              player_id = excluded.player_id,
              rank = excluded.rank,
              points = excluded.points,
              age = excluded.age,
              country = excluded.country,
              source_name = excluded.source_name,
              source_snapshot_id = excluded.source_snapshot_id
            """,
            (
                row.ranking_id,
                row.player_id,
                row.ranking_date,
                row.tour,
                row.rank,
                row.points,
                row.age,
                row.country,
                row.source_name,
                row.source_snapshot_id,
            ),
        )
        inserted += 1
    return inserted


def rankings_coverage(rows: list[ParsedRanking]) -> dict[str, int]:
    counts: dict[str, int] = {}
    for row in rows:
        counts[row.tour] = counts.get(row.tour, 0) + 1
    return counts


def ranking_source_notes(payload: dict[str, Any], local_path: str, date: str) -> str:
    notes = {
        "root": "data-private/reference/tennis",
        "parser_module": "pipeline/sources/tennis/normalization/rankings.py",
        "active_raw_to_typed_adapter": True,
        "requested_date": date,
        "payload_date": payload.get("asOf"),
        "source": payload.get("source"),
        "source_urls": payload.get("sourceUrls"),
        "source_counts": payload.get("sourceCounts"),
        "source_errors": payload.get("sourceErrors"),
        "local_path": local_path,
    }
    return compact_json(notes)
