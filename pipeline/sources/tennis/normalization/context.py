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
    parse_ratio,
    parse_legacy_json,
    stable_id,
    to_float,
    to_int,
    utc_now,
)
from .stats import insert_service_pressure


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


@dataclass(frozen=True)
class ParsedRecentMatch:
    recent_match_id: str
    player_id: str
    opponent_player_id: str | None
    match_date: str | None
    tournament_name: str | None
    surface: str | None
    round: str | None
    result: str | None
    score: str | None
    opponent_rank: int | None
    source_name: str | None
    source_snapshot_id: str | None


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


def percent_from_ratio_text(value: Any) -> tuple[int | None, int | None, float | None]:
    made, attempts = parse_ratio(value)
    made_int = to_int(made)
    attempts_int = to_int(attempts)
    pct = round((made / attempts) * 100.0, 4) if made is not None and attempts else None
    return made_int, attempts_int, pct


def average(values: list[float | None]) -> float | None:
    usable = [float(value) for value in values if value is not None]
    if not usable:
        return None
    return round(sum(usable) / len(usable), 4)


def compact_flashscore_recent_match(row: dict[str, Any]) -> dict[str, Any]:
    return {
        key: value
        for key, value in row.items()
        if key not in {"raw"} and value not in (None, "", [], {})
    }


def flashscore_profile_features(entry: dict[str, Any]) -> dict[str, Any]:
    profile = entry.get("profile") if isinstance(entry.get("profile"), dict) else {}
    recent_matches = profile.get("recentMatches") if isinstance(profile.get("recentMatches"), list) else []
    compact_recent = [compact_flashscore_recent_match(match) for match in recent_matches[:12] if isinstance(match, dict)]
    features = {
        "feature_family": "flashscore_player_profile",
        "board_match_id": entry.get("boardMatchId"),
        "board_title": entry.get("boardTitle"),
        "board_player_name": entry.get("boardPlayerName"),
        "slate_surface": entry.get("slateSurface"),
        "flashscore_match_id": entry.get("flashscoreMatchId"),
        "flashscore_tournament": entry.get("flashscoreTournament"),
        "flashscore_tournament_url": entry.get("flashscoreTournamentUrl"),
        "player": entry.get("player"),
        "profile": {
            key: profile.get(key)
            for key in [
                "name",
                "flashscoreName",
                "flashscoreId",
                "slug",
                "country",
                "rank",
                "birthTimestamp",
                "birthDate",
                "age",
                "profileUrl",
                "capturedAt",
            ]
        },
        "records": profile.get("records"),
        "recent_window": profile.get("recentWindow"),
        "service_data": profile.get("serviceData"),
        "recent_match_sample": compact_recent,
    }
    return {key: value for key, value in features.items() if value not in (None, "", [], {})}


def service_pressure_from_recent_map_row(
    entry: dict[str, Any],
    player_id: str,
    source_snapshot_id: str | None,
) -> dict[str, Any] | None:
    stats = entry.get("serviceStats")
    if not isinstance(stats, dict):
        return None
    saved_made, saved_attempts, saved_pct = percent_from_ratio_text(stats.get("breakPointsSaved"))
    converted_made, converted_attempts, converted_pct = percent_from_ratio_text(stats.get("breakPointsConverted"))
    snapshot_date = entry.get("recentIsoDate")
    if not snapshot_date:
        return None
    has_pressure = any(
        value is not None
        for value in [
            stats.get("serviceHoldPct"),
            stats.get("holdPct"),
            stats.get("returnGamesWonPct"),
            saved_made,
            saved_attempts,
            converted_made,
            converted_attempts,
        ]
    )
    if not has_pressure:
        return None
    return {
        "pressure_snapshot_id": stable_id(
            "pressure",
            "flashscore-recent",
            entry.get("boardMatchId"),
            player_id,
            entry.get("recentIndex"),
            entry.get("flashscoreId"),
            source_snapshot_id,
        ),
        "player_id": player_id,
        "match_id": entry.get("boardMatchId"),
        "snapshot_date": snapshot_date,
        "surface": entry.get("recentSurface"),
        "sample_type": "recent_match_flashscore",
        "sample_size": 1,
        "hold_pct": to_float(stats.get("serviceHoldPct") or stats.get("holdPct")),
        "break_pct": to_float(stats.get("returnGamesWonPct")),
        "bp_saved_made": saved_made,
        "bp_saved_attempts": saved_attempts,
        "bp_saved_pct": saved_pct or to_float(stats.get("breakPointsSavedPct")),
        "bp_converted_made": converted_made,
        "bp_converted_attempts": converted_attempts,
        "bp_converted_pct": converted_pct,
        "source_name": "flashscore_recent_match_map",
    }


def aggregate_recent_service_features(entries: list[dict[str, Any]]) -> dict[str, Any]:
    stats_rows = [entry.get("serviceStats") for entry in entries if isinstance(entry.get("serviceStats"), dict)]
    saved_made = 0
    saved_attempts = 0
    converted_made = 0
    converted_attempts = 0
    for stats in stats_rows:
        made, attempts, _pct = percent_from_ratio_text(stats.get("breakPointsSaved"))
        saved_made += made or 0
        saved_attempts += attempts or 0
        made, attempts, _pct = percent_from_ratio_text(stats.get("breakPointsConverted"))
        converted_made += made or 0
        converted_attempts += attempts or 0
    return {
        "feature_family": "flashscore_recent_match_map",
        "sample_size": len(entries),
        "service_stat_matches": len(stats_rows),
        "avg_hold_pct": average([to_float(stats.get("serviceHoldPct") or stats.get("holdPct")) for stats in stats_rows]),
        "avg_break_pct": average([to_float(stats.get("returnGamesWonPct")) for stats in stats_rows]),
        "avg_aces": average([to_float(stats.get("aces")) for stats in stats_rows]),
        "avg_double_faults": average([to_float(stats.get("doubleFaults")) for stats in stats_rows]),
        "avg_first_serve_pct": average([to_float(stats.get("firstServePct")) for stats in stats_rows]),
        "avg_first_serve_won_pct": average([to_float(stats.get("firstServeWonPct")) for stats in stats_rows]),
        "avg_second_serve_won_pct": average([to_float(stats.get("secondServeWonPct")) for stats in stats_rows]),
        "avg_service_points_won_pct": average([to_float(stats.get("servicePointsWonPct")) for stats in stats_rows]),
        "avg_return_points_won_pct": average([to_float(stats.get("returnPointsWonPct")) for stats in stats_rows]),
        "avg_winners": average([to_float(stats.get("winners")) for stats in stats_rows]),
        "avg_unforced_errors": average([to_float(stats.get("unforcedErrors")) for stats in stats_rows]),
        "bp_saved_made": saved_made if saved_attempts else None,
        "bp_saved_attempts": saved_attempts if saved_attempts else None,
        "bp_saved_pct": round(saved_made / saved_attempts * 100.0, 4) if saved_attempts else None,
        "bp_converted_made": converted_made if converted_attempts else None,
        "bp_converted_attempts": converted_attempts if converted_attempts else None,
        "bp_converted_pct": round(converted_made / converted_attempts * 100.0, 4) if converted_attempts else None,
        "recent_matches": [
            compact_flashscore_recent_match(
                {
                    "recentIndex": entry.get("recentIndex"),
                    "recentIsoDate": entry.get("recentIsoDate"),
                    "recentEvent": entry.get("recentEvent"),
                    "recentResult": entry.get("recentResult"),
                    "opponentName": entry.get("opponentName"),
                    "flashscoreId": entry.get("flashscoreId"),
                    "recentSurface": entry.get("recentSurface"),
                }
            )
            for entry in entries[:12]
        ],
    }


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


def parse_flashscore_player_pages_payload(
    payload: dict[str, Any],
    resolver: TennisIdentityResolver,
    *,
    source_snapshot_id: str | None = None,
    local_path: str | None = None,
) -> tuple[list[ParsedPlayerFormSnapshot], list[ParsedRecentMatch], dict[str, int]]:
    profiles = payload.get("profiles")
    if not isinstance(profiles, dict):
        profiles = {}
    snapshots: list[ParsedPlayerFormSnapshot] = []
    recent_matches: list[ParsedRecentMatch] = []
    counts = {
        "source_rows": 0,
        "parsed_player_snapshots": 0,
        "parsed_recent_matches": 0,
        "unparsed_rows": 0,
        "alias_rows": 0,
    }
    slate_date = str(payload.get("slateDate") or "")
    for key, entry in profiles.items():
        if not isinstance(entry, dict):
            counts["unparsed_rows"] += 1
            continue
        counts["source_rows"] += 1
        match_id = entry.get("boardMatchId")
        player_name = entry.get("boardPlayerName") or (entry.get("profile") or {}).get("name")
        player_id = resolver.player_id_for_match(match_id, "flashscore", player_name)
        if not player_id:
            resolver.insert_unresolved(
                "tennis_context_player",
                "flashscore_player_pages",
                match_id or key,
                player_name or key,
                {"local_path": local_path, "profile_key": key, "payload": entry},
                "Could not confidently map Flashscore player page profile to canonical match player.",
            )
            counts["unparsed_rows"] += 1
            continue
        player = entry.get("player") if isinstance(entry.get("player"), dict) else {}
        profile = entry.get("profile") if isinstance(entry.get("profile"), dict) else {}
        flashscore_id = profile.get("flashscoreId") or player.get("flashscoreId")
        flashscore_name = profile.get("flashscoreName") or player.get("name") or player_name
        if flashscore_id or flashscore_name:
            resolver.upsert_alias("player", player_id, "flashscore", flashscore_id, flashscore_name, 0.96)
            counts["alias_rows"] += 1
        recent = profile.get("recentMatches") if isinstance(profile.get("recentMatches"), list) else []
        snapshots.append(
            ParsedPlayerFormSnapshot(
                form_snapshot_id=stable_id("player-form", "flashscore-profile", match_id, player_id, source_snapshot_id),
                player_id=player_id,
                snapshot_date=slate_date or profile.get("capturedAt") or utc_now(),
                surface=entry.get("slateSurface"),
                sample_size=len(recent),
                features_json=compact_json(flashscore_profile_features(entry)),
            )
        )
        for index, recent_row in enumerate(recent):
            if not isinstance(recent_row, dict):
                continue
            opponent_name = recent_row.get("opponentName")
            opponent_id = resolver.player_id_by_name("flashscore", opponent_name) if opponent_name else None
            recent_matches.append(
                ParsedRecentMatch(
                    recent_match_id=stable_id("recent-match", "flashscore-player-page", player_id, recent_row.get("flashscoreId"), index),
                    player_id=player_id,
                    opponent_player_id=opponent_id,
                    match_date=recent_row.get("dateIso") or recent_row.get("dateLabel"),
                    tournament_name=recent_row.get("event") or recent_row.get("eventFull"),
                    surface=recent_row.get("surface"),
                    round=recent_row.get("eventTier"),
                    result=recent_row.get("result"),
                    score=recent_row.get("result"),
                    opponent_rank=None,
                    source_name="flashscore_player_pages",
                    source_snapshot_id=source_snapshot_id,
                )
            )
    counts["parsed_player_snapshots"] = len(snapshots)
    counts["parsed_recent_matches"] = len(recent_matches)
    return snapshots, recent_matches, counts


def parse_flashscore_recent_match_map_payload(
    payload: dict[str, Any],
    resolver: TennisIdentityResolver,
    *,
    source_snapshot_id: str | None = None,
    local_path: str | None = None,
) -> tuple[list[ParsedPlayerFormSnapshot], list[ParsedRecentMatch], list[dict[str, Any]], dict[str, int]]:
    mapped = payload.get("map")
    if not isinstance(mapped, dict):
        mapped = {}
    grouped: dict[tuple[str, str], list[dict[str, Any]]] = defaultdict(list)
    snapshots: list[ParsedPlayerFormSnapshot] = []
    recent_matches: list[ParsedRecentMatch] = []
    pressure_rows: list[dict[str, Any]] = []
    counts = {
        "source_rows": 0,
        "parsed_player_snapshots": 0,
        "parsed_recent_matches": 0,
        "parsed_service_pressure": 0,
        "unparsed_rows": 0,
    }
    for key, entry in mapped.items():
        if not isinstance(entry, dict):
            counts["unparsed_rows"] += 1
            continue
        counts["source_rows"] += 1
        match_id = entry.get("boardMatchId")
        player_name = entry.get("boardPlayerName") or entry.get("playerName")
        player_id = resolver.player_id_for_match(match_id, "flashscore", player_name)
        if not player_id:
            resolver.insert_unresolved(
                "tennis_context_player",
                "flashscore_recent_match_map",
                match_id or entry.get("flashscoreId") or key,
                player_name or key,
                {"local_path": local_path, "map_key": key, "payload": entry},
                "Could not confidently map Flashscore recent-match map row to canonical match player.",
            )
            counts["unparsed_rows"] += 1
            continue
        opponent_name = entry.get("opponentName")
        opponent_id = resolver.player_id_by_name("flashscore", opponent_name) if opponent_name else None
        recent_matches.append(
            ParsedRecentMatch(
                recent_match_id=stable_id("recent-match", "flashscore-recent-map", player_id, entry.get("flashscoreId"), entry.get("recentIndex")),
                player_id=player_id,
                opponent_player_id=opponent_id,
                match_date=entry.get("recentIsoDate") or entry.get("recentDate"),
                tournament_name=entry.get("recentEvent"),
                surface=entry.get("recentSurface"),
                round=entry.get("currentMatchTournament"),
                result=entry.get("recentResult"),
                score=entry.get("recentResult"),
                opponent_rank=None,
                source_name="flashscore_recent_match_map",
                source_snapshot_id=source_snapshot_id,
            )
        )
        pressure = service_pressure_from_recent_map_row(entry, player_id, source_snapshot_id)
        if pressure:
            pressure_rows.append(pressure)
        grouped[(str(match_id), player_id)].append(entry)
    for (match_id, player_id), entries in grouped.items():
        first = entries[0]
        features = aggregate_recent_service_features(entries)
        features["board_match_id"] = match_id
        features["board_title"] = first.get("boardTitle")
        features["board_player_name"] = first.get("boardPlayerName") or first.get("playerName")
        features["current_match_flashscore_id"] = first.get("currentMatchFlashscoreId")
        snapshots.append(
            ParsedPlayerFormSnapshot(
                form_snapshot_id=stable_id("player-form", "flashscore-recent-map", match_id, player_id, source_snapshot_id),
                player_id=player_id,
                snapshot_date=str(payload.get("generatedAt") or first.get("recentIsoDate") or utc_now()),
                surface=first.get("recentSurface"),
                sample_size=len(entries),
                features_json=compact_json(features),
            )
        )
    counts["parsed_player_snapshots"] = len(snapshots)
    counts["parsed_recent_matches"] = len(recent_matches)
    counts["parsed_service_pressure"] = len(pressure_rows)
    return snapshots, recent_matches, pressure_rows, counts


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


def insert_recent_matches(con: sqlite3.Connection, rows: list[ParsedRecentMatch]) -> int:
    count = 0
    for row in rows:
        con.execute(
            """
            insert into recent_matches (
              recent_match_id, player_id, opponent_player_id, match_date,
              tournament_name, surface, round, result, score, opponent_rank,
              source_name, source_snapshot_id
            ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            on conflict(recent_match_id) do update set
              opponent_player_id = excluded.opponent_player_id,
              match_date = excluded.match_date,
              tournament_name = excluded.tournament_name,
              surface = excluded.surface,
              round = excluded.round,
              result = excluded.result,
              score = excluded.score,
              opponent_rank = excluded.opponent_rank,
              source_name = excluded.source_name,
              source_snapshot_id = excluded.source_snapshot_id
            """,
            (
                row.recent_match_id,
                row.player_id,
                row.opponent_player_id,
                row.match_date,
                row.tournament_name,
                row.surface,
                row.round,
                row.result,
                row.score,
                row.opponent_rank,
                row.source_name,
                row.source_snapshot_id,
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
