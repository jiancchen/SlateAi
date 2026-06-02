from __future__ import annotations

import sqlite3
from collections import defaultdict
from dataclasses import dataclass
from typing import Any

from .common import (
    TennisIdentityResolver,
    compact_json,
    fetch_legacy_rows,
    parse_legacy_json,
    parse_ratio,
    stable_id,
    to_float,
    to_int,
    utc_now,
)


STAT_SOURCE_TABLES = [
    "tennis_flashscore_player_stat_rows",
    "tennis_flashscore_stat_rows",
    "tennis_sofascore_player_stat_rows",
    "tennis_sofascore_stat_rows",
]


@dataclass(frozen=True)
class ParsedStatRow:
    source_table: str
    legacy_row_id: str
    match_id: str
    player_id: str
    player_name: str
    source_name: str
    stat_name: str
    stat_value: float | None
    stat_made: float | None
    stat_attempts: float | None
    stat_text: str | None
    period: str | None
    stat_group: str | None
    source_snapshot_id: str | None = None

    @property
    def stat_row_id(self) -> str:
        return stable_id(
            "tennis-stat",
            self.source_table,
            self.legacy_row_id,
            self.match_id,
            self.player_id,
            self.stat_name,
            self.period,
        )


def canonical_stat_name(label: Any) -> str:
    text = str(label or "").strip().lower()
    replacements = {
        "aces": "aces",
        "double faults": "double_faults",
        "1st serve percentage": "first_serve_pct",
        "first serve percentage": "first_serve_pct",
        "1st serve points won": "first_serve_points_won_pct",
        "first serve points won": "first_serve_points_won_pct",
        "2nd serve points won": "second_serve_points_won_pct",
        "second serve points won": "second_serve_points_won_pct",
        "break points saved": "break_points_saved",
        "break points converted": "break_points_converted",
        "service games won": "service_games_won",
        "return games won": "return_games_won",
        "service points won": "service_points_won_pct",
        "return points won": "return_points_won_pct",
        "winners": "winners",
        "unforced errors": "unforced_errors",
        "forced errors": "forced_errors",
        "total points won": "total_points_won",
    }
    if text in replacements:
        return replacements[text]
    return text.replace("%", "pct").replace(" ", "_").replace("/", "_")


def parse_value(value: Any, numeric_value: Any = None, percentage: Any = None) -> tuple[float | None, float | None, float | None]:
    made, attempts = parse_ratio(value)
    if made is None and attempts is None:
        made, attempts = parse_ratio(numeric_value)
    if made is not None and attempts:
        pct = round((made / attempts) * 100.0, 4)
        return (pct, made, attempts)
    if percentage is not None:
        return (to_float(percentage), made, attempts)
    return (to_float(numeric_value if numeric_value is not None else value), made, attempts)


def source_name_for_table(source_table: str) -> str:
    if "flashscore" in source_table:
        return "flashscore"
    if "sofascore" in source_table:
        return "sofascore"
    return source_table


def parse_player_stat_payload(
    row: sqlite3.Row,
    payload: dict[str, Any],
    resolver: TennisIdentityResolver,
) -> list[ParsedStatRow]:
    source_table = row["source_table"]
    source_name = source_name_for_table(source_table)
    match_id = resolver.match_id_from_payload(payload)
    player_name = payload.get("player_name") or payload.get("board_player_name")
    side = payload.get("player_side")
    player_id = resolver.player_id_for_match(match_id, source_name, player_name, side)
    if not match_id or not player_id:
        resolver.insert_unresolved(
            "tennis_stat_player",
            source_name,
            payload.get("flashscore_id") or payload.get("sofascore_event_id") or match_id,
            player_name,
            {"legacy_row_id": row["legacy_row_id"], "source_table": source_table, "payload": payload},
            "Could not confidently map stat row to canonical match/player.",
        )
        return []
    stat_label = payload.get("stat_label") or payload.get("stat_name") or payload.get("stat_key")
    value, made, attempts = parse_value(
        payload.get("raw_value"),
        payload.get("numeric_value"),
        payload.get("percentage"),
    )
    return [
        ParsedStatRow(
            source_table=source_table,
            legacy_row_id=row["legacy_row_id"],
            match_id=match_id,
            player_id=player_id,
            player_name=str(player_name or ""),
            source_name=source_name,
            stat_name=canonical_stat_name(stat_label),
            stat_value=value,
            stat_made=made if made is not None else to_float(payload.get("numerator")),
            stat_attempts=attempts if attempts is not None else to_float(payload.get("denominator")),
            stat_text=None if payload.get("raw_value") is None else str(payload.get("raw_value")),
            period=payload.get("period") or payload.get("scope_label"),
            stat_group=payload.get("section_label") or payload.get("group_name"),
        )
    ]


def parse_pair_stat_payload(
    row: sqlite3.Row,
    payload: dict[str, Any],
    resolver: TennisIdentityResolver,
) -> list[ParsedStatRow]:
    source_table = row["source_table"]
    source_name = source_name_for_table(source_table)
    match_id = resolver.match_id_from_payload(payload)
    if not match_id:
        resolver.insert_unresolved(
            "tennis_stat_match",
            source_name,
            payload.get("flashscore_id") or payload.get("sofascore_event_id"),
            payload.get("flashscore_id") or payload.get("sofascore_event_id") or "unknown",
            {"legacy_row_id": row["legacy_row_id"], "source_table": source_table, "payload": payload},
            "Could not confidently map pair stat row to canonical match.",
        )
        return []
    stat_label = payload.get("stat_label") or payload.get("stat_name") or payload.get("stat_key")
    rows = []
    side_specs = [
        ("left", payload.get("left_player_name"), payload.get("left_value")),
        ("right", payload.get("right_player_name"), payload.get("right_value")),
        ("home", payload.get("home_player_name"), payload.get("home_value") or payload.get("home")),
        ("away", payload.get("away_player_name"), payload.get("away_value") or payload.get("away")),
    ]
    for side, player_name, raw_value in side_specs:
        if player_name is None or raw_value is None:
            continue
        player_id = resolver.player_id_for_match(match_id, source_name, player_name, side)
        if not player_id:
            resolver.insert_unresolved(
                "tennis_stat_player",
                source_name,
                payload.get("flashscore_id") or payload.get("sofascore_event_id") or match_id,
                player_name,
                {"legacy_row_id": row["legacy_row_id"], "source_table": source_table, "match_id": match_id, "side": side},
                "Could not confidently map pair stat player to canonical player.",
            )
            continue
        value, made, attempts = parse_value(raw_value)
        rows.append(
            ParsedStatRow(
                source_table=source_table,
                legacy_row_id=f"{row['legacy_row_id']}:{side}",
                match_id=match_id,
                player_id=player_id,
                player_name=str(player_name),
                source_name=source_name,
                stat_name=canonical_stat_name(stat_label),
                stat_value=value,
                stat_made=made,
                stat_attempts=attempts,
                stat_text=str(raw_value),
                period=payload.get("period") or payload.get("scope_label"),
                stat_group=payload.get("section_label") or payload.get("group_name"),
            )
        )
    return rows


def parse_stat_rows(
    con: sqlite3.Connection,
    resolver: TennisIdentityResolver,
    date: str | None = None,
) -> tuple[list[ParsedStatRow], dict[str, int]]:
    parsed: list[ParsedStatRow] = []
    counts = {"source_rows": 0, "parsed_rows": 0, "unparsed_rows": 0}
    for row in fetch_legacy_rows(con, STAT_SOURCE_TABLES, date=date):
        counts["source_rows"] += 1
        payload = parse_legacy_json(row)
        if row["source_table"] in {"tennis_flashscore_player_stat_rows", "tennis_sofascore_player_stat_rows"}:
            rows = parse_player_stat_payload(row, payload, resolver)
        else:
            rows = parse_pair_stat_payload(row, payload, resolver)
        if not rows:
            counts["unparsed_rows"] += 1
        parsed.extend(rows)
    counts["parsed_rows"] = len(parsed)
    return parsed, counts


def insert_match_stat_rows(con: sqlite3.Connection, rows: list[ParsedStatRow]) -> int:
    inserted = 0
    for row in rows:
        con.execute(
            """
            insert into match_stat_rows (
              stat_row_id, match_id, player_id, source_name, stat_name,
              stat_value, stat_made, stat_attempts, stat_text, period, source_snapshot_id
            ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            on conflict(stat_row_id) do update set
              stat_value = excluded.stat_value,
              stat_made = excluded.stat_made,
              stat_attempts = excluded.stat_attempts,
              stat_text = excluded.stat_text,
              period = excluded.period,
              source_snapshot_id = excluded.source_snapshot_id
            """,
            (
                row.stat_row_id,
                row.match_id,
                row.player_id,
                row.source_name,
                row.stat_name,
                row.stat_value,
                row.stat_made,
                row.stat_attempts,
                row.stat_text,
                row.period,
                row.source_snapshot_id,
            ),
        )
        inserted += 1
    return inserted


def build_service_pressure(rows: list[ParsedStatRow]) -> list[dict[str, Any]]:
    grouped: dict[tuple[str, str, str], dict[str, Any]] = defaultdict(dict)
    for row in rows:
        key = (row.match_id, row.player_id, row.source_name)
        bucket = grouped[key]
        bucket["match_id"] = row.match_id
        bucket["player_id"] = row.player_id
        bucket["source_name"] = row.source_name
        bucket["stat_count"] = bucket.get("stat_count", 0) + 1
        if row.stat_name in {"service_games_won"}:
            bucket["hold_pct"] = row.stat_value
        elif row.stat_name in {"return_games_won"}:
            bucket["break_pct"] = row.stat_value
        elif row.stat_name == "break_points_saved":
            bucket["bp_saved_made"] = to_int(row.stat_made)
            bucket["bp_saved_attempts"] = to_int(row.stat_attempts)
            bucket["bp_saved_pct"] = row.stat_value
        elif row.stat_name == "break_points_converted":
            bucket["bp_converted_made"] = to_int(row.stat_made)
            bucket["bp_converted_attempts"] = to_int(row.stat_attempts)
            bucket["bp_converted_pct"] = row.stat_value
    snapshots = []
    for (match_id, player_id, source_name), bucket in grouped.items():
        has_pressure = any(
            bucket.get(field) is not None
            for field in [
                "hold_pct",
                "break_pct",
                "bp_saved_made",
                "bp_saved_attempts",
                "bp_saved_pct",
                "bp_converted_made",
                "bp_converted_attempts",
                "bp_converted_pct",
            ]
        )
        if not has_pressure:
            continue
        snapshots.append(
            {
                "pressure_snapshot_id": stable_id("pressure", match_id, player_id, source_name, "match"),
                "player_id": player_id,
                "match_id": match_id,
                "source_name": source_name,
                "sample_size": 1,
                "hold_pct": bucket.get("hold_pct"),
                "break_pct": bucket.get("break_pct"),
                "bp_saved_made": bucket.get("bp_saved_made"),
                "bp_saved_attempts": bucket.get("bp_saved_attempts"),
                "bp_saved_pct": bucket.get("bp_saved_pct"),
                "bp_converted_made": bucket.get("bp_converted_made"),
                "bp_converted_attempts": bucket.get("bp_converted_attempts"),
                "bp_converted_pct": bucket.get("bp_converted_pct"),
            }
        )
    return snapshots


def insert_service_pressure(con: sqlite3.Connection, snapshots: list[dict[str, Any]]) -> int:
    inserted = 0
    for row in snapshots:
        match = con.execute("select match_date, surface from matches where match_id = ?", (row["match_id"],)).fetchone()
        con.execute(
            """
            insert into service_pressure_snapshots (
              pressure_snapshot_id, player_id, match_id, snapshot_date, surface, sample_type,
              sample_size, hold_pct, break_pct, bp_saved_made, bp_saved_attempts, bp_saved_pct,
              bp_converted_made, bp_converted_attempts, bp_converted_pct, deuce_hold_pct,
              tiebreak_record, source_name, created_at
            ) values (?, ?, ?, ?, ?, 'single_match', ?, ?, ?, ?, ?, ?, ?, ?, ?, null, null, ?, ?)
            on conflict(pressure_snapshot_id) do update set
              sample_size = excluded.sample_size,
              hold_pct = excluded.hold_pct,
              break_pct = excluded.break_pct,
              bp_saved_made = excluded.bp_saved_made,
              bp_saved_attempts = excluded.bp_saved_attempts,
              bp_saved_pct = excluded.bp_saved_pct,
              bp_converted_made = excluded.bp_converted_made,
              bp_converted_attempts = excluded.bp_converted_attempts,
              bp_converted_pct = excluded.bp_converted_pct,
              created_at = excluded.created_at
            """,
            (
                row["pressure_snapshot_id"],
                row["player_id"],
                row["match_id"],
                match["match_date"] if match else None,
                match["surface"] if match else None,
                row["sample_size"],
                row["hold_pct"],
                row["break_pct"],
                row["bp_saved_made"],
                row["bp_saved_attempts"],
                row["bp_saved_pct"],
                row["bp_converted_made"],
                row["bp_converted_attempts"],
                row["bp_converted_pct"],
                row["source_name"],
                utc_now(),
            ),
        )
        inserted += 1
    return inserted


def normalize_stats(con: sqlite3.Connection, date: str | None = None, dry_run: bool = False) -> dict[str, Any]:
    resolver = TennisIdentityResolver(con)
    before_unresolved = con.execute("select count(*) from unresolved_entities").fetchone()[0]
    rows, counts = parse_stat_rows(con, resolver, date=date)
    pressure = build_service_pressure(rows)
    report = {
        "family": "tennis_stats",
        "date": date,
        "dry_run": dry_run,
        **counts,
        "service_pressure_rows": len(pressure),
        "inserted_match_stat_rows": 0,
        "inserted_service_pressure_rows": 0,
        "unresolved_rows_added": 0,
    }
    if not dry_run:
        report["inserted_match_stat_rows"] = insert_match_stat_rows(con, rows)
        report["inserted_service_pressure_rows"] = insert_service_pressure(con, pressure)
        con.commit()
    after_unresolved = con.execute("select count(*) from unresolved_entities").fetchone()[0]
    report["unresolved_rows_added"] = after_unresolved - before_unresolved
    if dry_run:
        con.rollback()
    return report
