from __future__ import annotations

import json
import sqlite3
from dataclasses import dataclass
from typing import Any

from .common import compact_json, normalize_name, stable_id, utc_now


@dataclass(frozen=True)
class Resolution:
    unresolved_entity_id: str
    entity_type: str
    canonical_entity_id: str
    canonical_entity_type: str
    source_name: str
    source_entity_id: str | None
    source_display_name: str | None
    confidence: float
    reason: str


def decode_candidate(row: sqlite3.Row) -> dict[str, Any]:
    try:
        parsed = json.loads(row["candidate_json"] or "{}")
    except json.JSONDecodeError:
        return {}
    return parsed if isinstance(parsed, dict) else {}


def payload_from_candidate(candidate: dict[str, Any]) -> dict[str, Any]:
    payload = candidate.get("payload")
    return payload if isinstance(payload, dict) else {}


def player_names_from_payload(payload: dict[str, Any]) -> list[str]:
    names = [
        payload.get("left_player_name"),
        payload.get("right_player_name"),
        payload.get("home_player_name"),
        payload.get("away_player_name"),
        payload.get("player_name"),
        payload.get("selection_name"),
        payload.get("normalized_selection_name"),
        payload.get("expiration_value"),
    ]
    return [str(name) for name in names if name and normalize_name(name)]


def pair_from_payload(payload: dict[str, Any]) -> tuple[str, str] | None:
    pair_specs = [
        (payload.get("left_player_name"), payload.get("right_player_name")),
        (payload.get("home_player_name"), payload.get("away_player_name")),
    ]
    for left, right in pair_specs:
        left_key = normalize_name(left)
        right_key = normalize_name(right)
        if left_key and right_key:
            return tuple(sorted([left_key, right_key]))  # type: ignore[return-value]
    names = [normalize_name(name) for name in player_names_from_payload(payload)]
    names = [name for name in names if name]
    if len(set(names)) == 2:
        return tuple(sorted(set(names)))  # type: ignore[return-value]
    return None


def source_entity_id_from_payload(row: sqlite3.Row, payload: dict[str, Any]) -> str | None:
    for key in ["sofascore_event_id", "sofascoreEventId", "flashscore_id", "flashscoreId", "market_ticker", "marketTicker", "event_ticker", "eventTicker", "match_id", "matchId"]:
        value = payload.get(key)
        if value:
            return str(value)
    return None if row["source_entity_id"] is None else str(row["source_entity_id"])


def display_name_from_payload(row: sqlite3.Row, payload: dict[str, Any]) -> str:
    names = player_names_from_payload(payload)
    if len(names) >= 2:
        return " vs ".join(names[:2])
    if names:
        return names[0]
    return str(row["source_display_name"] or row["source_entity_id"] or "unknown")


def last_token(value: Any) -> str:
    tokens = normalize_name(value).split()
    return tokens[-1] if tokens else ""


class TennisIdentityCleanup:
    def __init__(self, con: sqlite3.Connection):
        self.con = con
        self.con.row_factory = sqlite3.Row
        self.players = {row["player_id"]: dict(row) for row in con.execute("select * from players").fetchall()}
        self.players_by_name: dict[str, list[str]] = {}
        for player in self.players.values():
            for value in [player.get("name"), player.get("canonical_name"), player.get("source_player_id")]:
                key = normalize_name(value)
                if key:
                    self.players_by_name.setdefault(key, [])
                    if player["player_id"] not in self.players_by_name[key]:
                        self.players_by_name[key].append(player["player_id"])
        self.match_players = self._load_match_players()
        self.pair_index = self._build_pair_index()
        self.market_event_match_index = self._build_market_event_match_index()

    def _load_match_players(self) -> dict[str, list[dict[str, Any]]]:
        rows = self.con.execute(
            """
            select mp.match_id, mp.player_id, mp.side, mp.market_name, p.name, p.canonical_name
            from match_players mp
            join players p on p.player_id = mp.player_id
            """
        ).fetchall()
        grouped: dict[str, list[dict[str, Any]]] = {}
        for row in rows:
            grouped.setdefault(row["match_id"], []).append(dict(row))
        return grouped

    def _build_pair_index(self) -> dict[tuple[str, str], list[str]]:
        index: dict[tuple[str, str], list[str]] = {}
        for match_id, players in self.match_players.items():
            if len(players) != 2:
                continue
            variants: list[list[str]] = []
            for player in players:
                names = {
                    normalize_name(player.get("market_name")),
                    normalize_name(player.get("name")),
                    normalize_name(player.get("canonical_name")),
                }
                variants.append([name for name in names if name])
            for left in variants[0]:
                for right in variants[1]:
                    key = tuple(sorted([left, right]))
                    index.setdefault(key, [])
                    if match_id not in index[key]:
                        index[key].append(match_id)
        return index

    def _build_market_event_match_index(self) -> dict[str, list[str]]:
        index: dict[str, list[str]] = {}
        try:
            rows = self.con.execute("select event_ticker, match_id from market_contracts where event_ticker is not null and match_id is not null").fetchall()
        except sqlite3.OperationalError:
            return index
        for row in rows:
            index.setdefault(str(row["event_ticker"]), [])
            if row["match_id"] not in index[str(row["event_ticker"])]:
                index[str(row["event_ticker"])].append(row["match_id"])
        return index

    def resolve_match_from_pair(self, payload: dict[str, Any]) -> str | None:
        pair = pair_from_payload(payload)
        if not pair:
            return None
        candidates = self.pair_index.get(pair, [])
        return candidates[0] if len(candidates) == 1 else None

    def resolve_match_from_market(self, payload: dict[str, Any]) -> str | None:
        board_match_id = payload.get("board_match_id") or payload.get("boardMatchId")
        if board_match_id and board_match_id in self.match_players:
            return str(board_match_id)
        event_ticker = payload.get("event_ticker") or payload.get("eventTicker")
        if event_ticker:
            matches = self.market_event_match_index.get(str(event_ticker), [])
            if len(matches) == 1:
                return matches[0]
        return self.resolve_match_from_pair(payload)

    def resolve_player_in_match(self, match_id: str | None, player_name: Any) -> str | None:
        if not match_id or match_id not in self.match_players:
            return None
        key = normalize_name(player_name)
        if not key:
            return None
        exact = []
        for player in self.match_players[match_id]:
            player_keys = {
                normalize_name(player.get("market_name")),
                normalize_name(player.get("name")),
                normalize_name(player.get("canonical_name")),
            }
            if key in player_keys:
                exact.append(player["player_id"])
        if len(set(exact)) == 1:
            return exact[0]
        source_last = last_token(player_name)
        if not source_last:
            return None
        surname_matches = []
        for player in self.match_players[match_id]:
            if source_last in {last_token(player.get("market_name")), last_token(player.get("name")), last_token(player.get("canonical_name"))}:
                surname_matches.append(player["player_id"])
        if len(set(surname_matches)) == 1:
            return surname_matches[0]
        return None

    def resolve_unresolved(self, row: sqlite3.Row) -> Resolution | None:
        candidate = decode_candidate(row)
        payload = payload_from_candidate(candidate)
        entity_type = row["entity_type"]
        if entity_type == "tennis_stat_match":
            match_id = self.resolve_match_from_pair(payload)
            if match_id:
                return Resolution(row["unresolved_entity_id"], entity_type, match_id, "match", row["source_name"], source_entity_id_from_payload(row, payload), display_name_from_payload(row, payload), 0.94, "Unique canonical match from exact player pair.")
        if entity_type == "tennis_market_match":
            match_id = self.resolve_match_from_market(payload)
            if match_id:
                return Resolution(row["unresolved_entity_id"], entity_type, match_id, "match", row["source_name"], source_entity_id_from_payload(row, payload), display_name_from_payload(row, payload), 0.93, "Unique canonical match from board/event market mapping.")
        if entity_type in {"tennis_market_player", "tennis_context_player", "tennis_stat_player"}:
            match_id = candidate.get("match_id") or payload.get("match_id") or payload.get("board_match_id") or row["source_entity_id"]
            player_name = row["source_display_name"] or payload.get("player_name") or payload.get("selection_name") or payload.get("normalized_selection_name")
            player_id = self.resolve_player_in_match(str(match_id) if match_id else None, player_name)
            if player_id:
                return Resolution(row["unresolved_entity_id"], entity_type, player_id, "player", row["source_name"], source_entity_id_from_payload(row, payload), str(player_name), 0.92, "Unique canonical player from match roster and exact/surname match.")
        return None

    def upsert_alias(self, resolution: Resolution) -> None:
        alias_id = stable_id(
            "alias",
            resolution.canonical_entity_type,
            resolution.canonical_entity_id,
            resolution.source_name,
            resolution.source_entity_id,
            normalize_name(resolution.source_display_name),
        )
        now = utc_now()
        self.con.execute(
            """
            insert into entity_aliases (
              entity_alias_id, entity_type, canonical_entity_id, source_name,
              source_entity_id, source_display_name, confidence, first_seen_at, last_seen_at, notes
            ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            on conflict(entity_alias_id) do update set
              last_seen_at = excluded.last_seen_at,
              confidence = max(entity_aliases.confidence, excluded.confidence),
              notes = excluded.notes
            """,
            (
                alias_id,
                resolution.canonical_entity_type,
                resolution.canonical_entity_id,
                resolution.source_name,
                resolution.source_entity_id,
                resolution.source_display_name,
                resolution.confidence,
                now,
                now,
                f"N22 tennis identity cleanup: {resolution.reason}",
            ),
        )

    def mark_resolved(self, resolution: Resolution) -> None:
        self.con.execute(
            "update unresolved_entities set status = 'resolved', resolved_at = ? where unresolved_entity_id = ?",
            (utc_now(), resolution.unresolved_entity_id),
        )

    def suspicious_player_aliases(self) -> list[dict[str, Any]]:
        rows = self.con.execute(
            """
            select a.entity_alias_id, a.canonical_entity_id, a.source_name, a.source_display_name,
                   p.name, p.canonical_name, a.confidence
            from entity_aliases a
            join players p on p.player_id = a.canonical_entity_id
            where a.entity_type = 'player'
              and a.source_display_name is not null
              and a.confidence >= 0.9
            """
        ).fetchall()
        suspicious = []
        for row in rows:
            display_last = last_token(row["source_display_name"])
            canonical_lasts = {last_token(row["name"]), last_token(row["canonical_name"])}
            if display_last and canonical_lasts and display_last not in canonical_lasts:
                suspicious.append(dict(row))
        return suspicious

    def run(self, dry_run: bool = False) -> dict[str, Any]:
        unresolved_rows = self.con.execute("select * from unresolved_entities where status = 'open' order by entity_type, unresolved_entity_id").fetchall()
        resolutions = [resolution for row in unresolved_rows if (resolution := self.resolve_unresolved(row))]
        counts_by_type: dict[str, int] = {}
        target_counts: dict[str, int] = {}
        for resolution in resolutions:
            counts_by_type[resolution.entity_type] = counts_by_type.get(resolution.entity_type, 0) + 1
            target_counts[resolution.canonical_entity_type] = target_counts.get(resolution.canonical_entity_type, 0) + 1
        if not dry_run:
            for resolution in resolutions:
                self.upsert_alias(resolution)
                self.mark_resolved(resolution)
            self.con.commit()
        suspicious = self.suspicious_player_aliases()
        if dry_run:
            self.con.rollback()
        return {
            "family": "tennis_identity_cleanup",
            "dry_run": dry_run,
            "open_unresolved_before": len(unresolved_rows),
            "resolvable_rows": len(resolutions),
            "resolved_by_type": counts_by_type,
            "alias_targets": target_counts,
            "remaining_open_estimate": len(unresolved_rows) - len(resolutions),
            "suspicious_player_alias_count": len(suspicious),
            "suspicious_player_alias_samples": suspicious[:20],
        }


def normalize_identity(con: sqlite3.Connection, dry_run: bool = False) -> dict[str, Any]:
    con.row_factory = sqlite3.Row
    cleanup = TennisIdentityCleanup(con)
    return cleanup.run(dry_run=dry_run)
