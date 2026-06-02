from __future__ import annotations

import sqlite3
import json
from collections import defaultdict
from dataclasses import dataclass
from typing import Any

from .common import (
    TennisIdentityResolver,
    compact_json,
    fetch_legacy_rows,
    parse_legacy_json,
    stable_id,
    to_int,
    utc_now,
)


PLAYER_CONTEXT_TABLES = ["tennis_player_match_context", "tennis_recent_form_metrics"]
MATCH_CONTEXT_TABLES = ["tennis_h2h_snapshots", "tennis_match_weather"]
CONTEXT_SOURCE_TABLES = PLAYER_CONTEXT_TABLES + MATCH_CONTEXT_TABLES


def ensure_context_schema(con: sqlite3.Connection) -> None:
    con.executescript(
        """
        create table if not exists match_context_snapshots (
          context_snapshot_id text primary key,
          match_id text not null,
          snapshot_date text not null,
          feature_family text not null,
          features_json text not null,
          source_name text,
          created_at text
        );

        create index if not exists idx_tennis_match_context_snapshots_lookup
          on match_context_snapshots(match_id, snapshot_date, feature_family);
        """
    )


@dataclass(frozen=True)
class ParsedPlayerFormSnapshot:
    form_snapshot_id: str
    player_id: str
    snapshot_date: str
    surface: str | None
    sample_size: int | None
    features_json: str


@dataclass(frozen=True)
class ParsedMatchContextSnapshot:
    context_snapshot_id: str
    match_id: str
    snapshot_date: str
    feature_family: str
    features_json: str
    source_name: str | None


def match_date(con: sqlite3.Connection, match_id: str | None) -> str | None:
    if not match_id:
        return None
    row = con.execute("select match_date from matches where match_id = ?", (match_id,)).fetchone()
    return row["match_date"] if row else None


def match_surface(con: sqlite3.Connection, match_id: str | None) -> str | None:
    if not match_id:
        return None
    row = con.execute("select surface from matches where match_id = ?", (match_id,)).fetchone()
    return row["surface"] if row else None


def decode_source_detail(value: Any) -> Any:
    if not isinstance(value, str) or not value.strip():
        return None
    try:
        json_value = json.loads(value)
        return compact_features(json_value) if isinstance(json_value, dict) else json_value
    except json.JSONDecodeError:
        return None


def compact_features(payload: dict[str, Any], exclude_raw: bool = True) -> dict[str, Any]:
    features = {}
    for key, value in payload.items():
        if exclude_raw and key == "raw_json":
            continue
        features[key] = value
    if exclude_raw and payload.get("raw_json"):
        detail = decode_source_detail(payload.get("raw_json"))
        if detail is not None:
            features["source_detail"] = detail
    return features


def parse_player_match_context(
    con: sqlite3.Connection,
    row: sqlite3.Row,
    payload: dict[str, Any],
    resolver: TennisIdentityResolver,
) -> ParsedPlayerFormSnapshot | None:
    match_id = payload.get("match_id")
    if not match_id:
        return None
    player_id = resolver.player_id_for_match(match_id, "tennis_player_match_context", payload.get("player_name"), payload.get("player_slot"))
    if not player_id:
        resolver.insert_unresolved(
            "tennis_context_player",
            "tennis_player_match_context",
            match_id,
            payload.get("player_name") or "unknown",
            {"legacy_row_id": row["legacy_row_id"], "payload": payload},
            "Could not confidently map player match context to canonical player.",
        )
        return None
    snapshot_date = payload.get("ranking_as_of") or match_date(con, match_id) or payload.get("updated_at") or utc_now()
    features = compact_features(payload)
    features["match_id"] = match_id
    features["feature_family"] = "player_match_context"
    features["source_table"] = row["source_table"]
    return ParsedPlayerFormSnapshot(
        form_snapshot_id=stable_id("player-form", "match-context", match_id, player_id),
        player_id=player_id,
        snapshot_date=str(snapshot_date),
        surface=match_surface(con, match_id),
        sample_size=to_int(payload.get("recent_matches")),
        features_json=compact_json(features),
    )


def parse_recent_form_metric_groups(
    con: sqlite3.Connection,
    rows: list[sqlite3.Row],
    resolver: TennisIdentityResolver,
) -> list[ParsedPlayerFormSnapshot]:
    grouped: dict[tuple[str, str, int], list[dict[str, Any]]] = defaultdict(list)
    metadata: dict[tuple[str, str, int], dict[str, Any]] = {}
    for row in rows:
        payload = parse_legacy_json(row)
        match_id = payload.get("match_id")
        if not match_id:
            continue
        player_id = resolver.player_id_for_match(match_id, "tennis_recent_form_metrics", payload.get("player_name"))
        if not player_id:
            resolver.insert_unresolved(
                "tennis_context_player",
                "tennis_recent_form_metrics",
                match_id,
                payload.get("player_name") or "unknown",
                {"legacy_row_id": row["legacy_row_id"], "payload": payload},
                "Could not confidently map recent form metric to canonical player.",
            )
            continue
        recent_index = to_int(payload.get("recent_index")) or 0
        key = (match_id, player_id, recent_index)
        grouped[key].append(compact_features(payload))
        metadata[key] = {
            "match_id": match_id,
            "player_id": player_id,
            "surface": payload.get("surface") or match_surface(con, match_id),
            "snapshot_date": match_date(con, match_id) or payload.get("updated_at") or utc_now(),
        }
    snapshots: list[ParsedPlayerFormSnapshot] = []
    for (match_id, player_id, recent_index), metrics in grouped.items():
        meta = metadata[(match_id, player_id, recent_index)]
        features = {
            "feature_family": "recent_form_metrics",
            "match_id": match_id,
            "recent_index": recent_index,
            "metrics": metrics,
            "source_table": "tennis_recent_form_metrics",
        }
        snapshots.append(
            ParsedPlayerFormSnapshot(
                form_snapshot_id=stable_id("player-form", "recent-form-metrics", match_id, player_id, recent_index),
                player_id=player_id,
                snapshot_date=str(meta["snapshot_date"]),
                surface=meta["surface"],
                sample_size=len(metrics),
                features_json=compact_json(features),
            )
        )
    return snapshots


def parse_match_context(
    con: sqlite3.Connection,
    row: sqlite3.Row,
    payload: dict[str, Any],
    resolver: TennisIdentityResolver,
) -> ParsedMatchContextSnapshot | None:
    match_id = payload.get("match_id") or payload.get("board_match_id")
    if not match_id or not resolver.matches.get(match_id):
        resolver.insert_unresolved(
            "tennis_context_match",
            row["source_table"],
            payload.get("match_id") or payload.get("sofascore_event_id"),
            payload.get("match_id") or payload.get("source_url") or "unknown",
            {"legacy_row_id": row["legacy_row_id"], "payload": payload},
            "Could not confidently map match context row to canonical match.",
        )
        return None
    family = "weather" if row["source_table"] == "tennis_match_weather" else "h2h_snapshot"
    snapshot_date = payload.get("slate_date") or match_date(con, match_id) or payload.get("updated_at") or utc_now()
    features = compact_features(payload)
    features["feature_family"] = family
    features["match_id"] = match_id
    features["source_table"] = row["source_table"]
    return ParsedMatchContextSnapshot(
        context_snapshot_id=stable_id("match-context", family, match_id, row["legacy_row_id"]),
        match_id=match_id,
        snapshot_date=str(snapshot_date),
        feature_family=family,
        features_json=compact_json(features),
        source_name=payload.get("source_name") or row["source_table"],
    )


def parse_context_rows(
    con: sqlite3.Connection,
    resolver: TennisIdentityResolver,
    date: str | None = None,
) -> tuple[list[ParsedPlayerFormSnapshot], list[ParsedMatchContextSnapshot], dict[str, int]]:
    player_snapshots: list[ParsedPlayerFormSnapshot] = []
    match_snapshots: list[ParsedMatchContextSnapshot] = []
    counts = {
        "source_rows": 0,
        "player_context_rows": 0,
        "match_context_rows": 0,
        "parsed_player_snapshots": 0,
        "parsed_match_snapshots": 0,
        "unparsed_rows": 0,
    }
    player_context_rows = fetch_legacy_rows(con, ["tennis_player_match_context"], date=date)
    counts["source_rows"] += len(player_context_rows)
    for row in player_context_rows:
        counts["player_context_rows"] += 1
        parsed = parse_player_match_context(con, row, parse_legacy_json(row), resolver)
        if parsed:
            player_snapshots.append(parsed)
        else:
            counts["unparsed_rows"] += 1
    recent_rows = fetch_legacy_rows(con, ["tennis_recent_form_metrics"], date=date)
    counts["source_rows"] += len(recent_rows)
    counts["player_context_rows"] += len(recent_rows)
    player_snapshots.extend(parse_recent_form_metric_groups(con, recent_rows, resolver))
    for row in fetch_legacy_rows(con, MATCH_CONTEXT_TABLES, date=date):
        counts["source_rows"] += 1
        counts["match_context_rows"] += 1
        parsed = parse_match_context(con, row, parse_legacy_json(row), resolver)
        if parsed:
            match_snapshots.append(parsed)
        else:
            counts["unparsed_rows"] += 1
    counts["parsed_player_snapshots"] = len(player_snapshots)
    counts["parsed_match_snapshots"] = len(match_snapshots)
    return player_snapshots, match_snapshots, counts


def insert_player_form_snapshots(con: sqlite3.Connection, rows: list[ParsedPlayerFormSnapshot]) -> int:
    count = 0
    for row in rows:
        con.execute(
            """
            insert into player_form_snapshots (
              form_snapshot_id, player_id, snapshot_date, surface, sample_size, features_json, created_at
            ) values (?, ?, ?, ?, ?, ?, ?)
            on conflict(form_snapshot_id) do update set
              snapshot_date = excluded.snapshot_date,
              surface = excluded.surface,
              sample_size = excluded.sample_size,
              features_json = excluded.features_json,
              created_at = excluded.created_at
            """,
            (
                row.form_snapshot_id,
                row.player_id,
                row.snapshot_date,
                row.surface,
                row.sample_size,
                row.features_json,
                utc_now(),
            ),
        )
        count += 1
    return count


def insert_match_context_snapshots(con: sqlite3.Connection, rows: list[ParsedMatchContextSnapshot]) -> int:
    count = 0
    for row in rows:
        con.execute(
            """
            insert into match_context_snapshots (
              context_snapshot_id, match_id, snapshot_date, feature_family,
              features_json, source_name, created_at
            ) values (?, ?, ?, ?, ?, ?, ?)
            on conflict(context_snapshot_id) do update set
              snapshot_date = excluded.snapshot_date,
              feature_family = excluded.feature_family,
              features_json = excluded.features_json,
              source_name = excluded.source_name,
              created_at = excluded.created_at
            """,
            (
                row.context_snapshot_id,
                row.match_id,
                row.snapshot_date,
                row.feature_family,
                row.features_json,
                row.source_name,
                utc_now(),
            ),
        )
        count += 1
    return count


def normalize_context(con: sqlite3.Connection, date: str | None = None, dry_run: bool = False) -> dict[str, Any]:
    ensure_context_schema(con)
    resolver = TennisIdentityResolver(con)
    before_unresolved = con.execute("select count(*) from unresolved_entities").fetchone()[0]
    player_snapshots, match_snapshots, counts = parse_context_rows(con, resolver, date=date)
    report = {
        "family": "tennis_context",
        "date": date,
        "dry_run": dry_run,
        **counts,
        "inserted_player_form_snapshots": 0,
        "inserted_match_context_snapshots": 0,
        "unresolved_rows_added": 0,
    }
    if not dry_run:
        report["inserted_player_form_snapshots"] = insert_player_form_snapshots(con, player_snapshots)
        report["inserted_match_context_snapshots"] = insert_match_context_snapshots(con, match_snapshots)
        con.commit()
    after_unresolved = con.execute("select count(*) from unresolved_entities").fetchone()[0]
    report["unresolved_rows_added"] = after_unresolved - before_unresolved
    if dry_run:
        con.rollback()
    return report
