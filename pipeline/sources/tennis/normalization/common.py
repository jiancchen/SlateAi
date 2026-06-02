from __future__ import annotations

import hashlib
import json
import re
import sqlite3
import unicodedata
from collections.abc import Iterable
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[4]


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def compact_json(value: Any) -> str:
    return json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False)


def stable_id(*parts: Any, length: int = 40) -> str:
    text = "|".join("" if part is None else str(part) for part in parts)
    return hashlib.sha256(text.encode("utf-8")).hexdigest()[:length]


def normalize_name(value: Any) -> str:
    text = unicodedata.normalize("NFKD", str(value or "")).encode("ascii", "ignore").decode("ascii")
    text = re.sub(r"[^a-zA-Z0-9]+", " ", text).strip().lower()
    return re.sub(r"\s+", " ", text)


def source_name_to_key(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "_", normalize_name(value)).strip("_") or "unknown"


def to_float(value: Any) -> float | None:
    if value is None:
        return None
    if isinstance(value, (int, float)):
        return float(value)
    text = str(value).strip()
    if not text:
        return None
    text = text.replace(",", "")
    if text.endswith("%"):
        text = text[:-1]
    try:
        return float(text)
    except ValueError:
        return None


def to_int(value: Any) -> int | None:
    number = to_float(value)
    if number is None:
        return None
    return int(number)


def parse_ratio(value: Any) -> tuple[float | None, float | None]:
    if value is None:
        return (None, None)
    text = str(value).strip()
    match = re.search(r"(-?\d+(?:\.\d+)?)\s*/\s*(-?\d+(?:\.\d+)?)", text)
    if not match:
        return (None, None)
    return (float(match.group(1)), float(match.group(2)))


def parse_legacy_json(row: sqlite3.Row | dict[str, Any]) -> dict[str, Any]:
    payload = row["row_json"] if isinstance(row, sqlite3.Row) else row.get("row_json")
    try:
        parsed = json.loads(payload or "{}")
    except json.JSONDecodeError:
        return {}
    return parsed if isinstance(parsed, dict) else {}


def source_context_from_candidate(
    *,
    source_name: str,
    source_entity_id: Any,
    source_display_name: Any,
    candidate: dict[str, Any],
) -> dict[str, Any]:
    payload = candidate.get("payload")
    payload = payload if isinstance(payload, dict) else {}
    labels = [
        payload.get("left_player_name"),
        payload.get("right_player_name"),
        payload.get("leftPlayer"),
        payload.get("rightPlayer"),
        payload.get("home_player_name"),
        payload.get("away_player_name"),
    ]
    players = payload.get("players")
    if isinstance(players, list):
        labels.extend(players)
    display_key = normalize_name(source_display_name)
    opponent_labels = [
        str(label)
        for label in labels
        if label and normalize_name(label) and normalize_name(label) != display_key
    ]
    context = {
        "source_name": source_name,
        "source_entity_id": None if source_entity_id is None else str(source_entity_id),
        "source_display_name": None if source_display_name is None else str(source_display_name),
        "board_match_id": payload.get("board_match_id") or payload.get("boardMatchId"),
        "board_title": payload.get("board_title") or payload.get("boardTitle"),
        "board_player_name": payload.get("board_player_name") or payload.get("boardPlayerName"),
        "flashscore_id": payload.get("flashscore_id") or payload.get("flashscoreId"),
        "flashscore_label": payload.get("flashscore_label") or payload.get("flashscoreLabel"),
        "flashscore_tournament_url": payload.get("flashscore_tournament_url") or payload.get("flashscoreTournamentUrl"),
        "match_id": payload.get("match_id") or payload.get("matchId"),
        "opponent_labels": sorted(set(opponent_labels)),
    }
    return {key: value for key, value in context.items() if value not in (None, "", [])}


def fetch_legacy_rows(
    con: sqlite3.Connection,
    source_tables: Iterable[str],
    date: str | None = None,
) -> list[sqlite3.Row]:
    con.row_factory = sqlite3.Row
    tables = list(source_tables)
    placeholders = ",".join("?" for _ in tables)
    params: list[Any] = ["tennis", *tables]
    where = f"sport = ? and source_table in ({placeholders})"
    if date:
        where += " and source_date like ?"
        params.append(f"{date}%")
    return con.execute(
        f"""
        select legacy_row_id, source_table, source_pk, source_date, entity_ref, row_json, content_hash
        from legacy_table_rows
        where {where}
        order by source_table, legacy_row_id
        """,
        params,
    ).fetchall()


class TennisIdentityResolver:
    def __init__(self, con: sqlite3.Connection):
        self.con = con
        self.con.row_factory = sqlite3.Row
        self.matches = {
            row["match_id"]: dict(row)
            for row in self.con.execute("select * from matches").fetchall()
        }
        self.players = {
            row["player_id"]: dict(row)
            for row in self.con.execute("select * from players").fetchall()
        }
        self.players_by_name: dict[str, list[dict[str, Any]]] = {}
        for player in self.players.values():
            for name in [player.get("name"), player.get("canonical_name"), player.get("source_player_id")]:
                key = normalize_name(name)
                if key:
                    self.players_by_name.setdefault(key, []).append(player)
        self.match_players: dict[str, list[dict[str, Any]]] = {}
        rows = self.con.execute(
            """
            select mp.match_id, mp.player_id, mp.side, mp.market_name, p.name, p.canonical_name
            from match_players mp
            join players p on p.player_id = mp.player_id
            """
        ).fetchall()
        for row in rows:
            self.match_players.setdefault(row["match_id"], []).append(dict(row))
        self.flashscore_match_map = self._load_flashscore_match_map()
        self.match_aliases_by_source_entity = self._load_entity_aliases("match")
        self.player_aliases_by_source_display = self._load_player_aliases()

    def _alias_source_table(self) -> str:
        row = self.con.execute(
            "select name from sqlite_master where type in ('table', 'view') and name = 'trusted_entity_aliases'"
        ).fetchone()
        return "trusted_entity_aliases" if row else "entity_aliases"

    def _load_entity_aliases(self, entity_type: str) -> dict[str, list[str]]:
        mapping: dict[str, list[str]] = {}
        alias_table = self._alias_source_table()
        rows = self.con.execute(
            f"""
            select source_entity_id, canonical_entity_id
            from {alias_table}
            where entity_type = ? and source_entity_id is not null
            """,
            (entity_type,),
        ).fetchall()
        for row in rows:
            source_entity_id = str(row["source_entity_id"])
            canonical_entity_id = str(row["canonical_entity_id"])
            mapping.setdefault(source_entity_id, [])
            if canonical_entity_id not in mapping[source_entity_id]:
                mapping[source_entity_id].append(canonical_entity_id)
        return mapping

    def _load_player_aliases(self) -> dict[tuple[str, str], list[str]]:
        mapping: dict[tuple[str, str], list[str]] = {}
        alias_table = self._alias_source_table()
        rows = self.con.execute(
            f"""
            select source_name, source_display_name, canonical_entity_id
            from {alias_table}
            where entity_type = 'player' and source_display_name is not null
            """
        ).fetchall()
        for row in rows:
            key = normalize_name(row["source_display_name"])
            if not key:
                continue
            for source_key in [str(row["source_name"] or ""), "*"]:
                alias_key = (source_key, key)
                mapping.setdefault(alias_key, [])
                canonical_entity_id = str(row["canonical_entity_id"])
                if canonical_entity_id not in mapping[alias_key]:
                    mapping[alias_key].append(canonical_entity_id)
        return mapping

    def _load_flashscore_match_map(self) -> dict[str, str]:
        mapping: dict[str, str] = {}
        rows = fetch_legacy_rows(self.con, ["tennis_flashscore_match_stats"])
        for row in rows:
            payload = parse_legacy_json(row)
            flashscore_id = payload.get("flashscore_id") or payload.get("matchId")
            board_match_id = payload.get("board_match_id") or payload.get("boardMatchId")
            if flashscore_id and board_match_id and board_match_id in self.matches:
                mapping[str(flashscore_id)] = str(board_match_id)
        return mapping

    def match_id_from_payload(self, payload: dict[str, Any]) -> str | None:
        candidates = [
            payload.get("board_match_id"),
            payload.get("boardMatchId"),
            payload.get("match_id"),
            payload.get("matchId"),
        ]
        for candidate in candidates:
            if candidate and str(candidate) in self.matches:
                return str(candidate)
        flashscore_id = payload.get("flashscore_id") or payload.get("flashscoreId")
        if flashscore_id and str(flashscore_id) in self.flashscore_match_map:
            return self.flashscore_match_map[str(flashscore_id)]
        alias_candidates = [
            payload.get("sofascore_event_id"),
            payload.get("sofascoreEventId"),
            payload.get("flashscore_id"),
            payload.get("flashscoreId"),
            payload.get("market_ticker"),
            payload.get("marketTicker"),
            payload.get("event_ticker"),
            payload.get("eventTicker"),
        ]
        for candidate in alias_candidates:
            if not candidate:
                continue
            match_ids = self.match_aliases_by_source_entity.get(str(candidate), [])
            if len(match_ids) == 1 and match_ids[0] in self.matches:
                return match_ids[0]
        return None

    def player_id_for_match(
        self,
        match_id: str | None,
        source_name: str,
        player_name: Any,
        side: Any = None,
    ) -> str | None:
        if not match_id:
            return None
        players = self.match_players.get(match_id, [])
        if not players:
            return None
        side_number = self._side_to_number(side)
        if side_number is not None:
            side_match = [player for player in players if player.get("side") == side_number]
            if len(side_match) == 1:
                self.upsert_alias("player", side_match[0]["player_id"], source_name, None, player_name, 0.95)
                return side_match[0]["player_id"]
        key = normalize_name(player_name)
        if not key:
            return None
        exact = [
            player for player in players
            if key in {
                normalize_name(player.get("market_name")),
                normalize_name(player.get("name")),
                normalize_name(player.get("canonical_name")),
            }
        ]
        if len(exact) == 1:
            self.upsert_alias("player", exact[0]["player_id"], source_name, None, player_name, 0.98)
            return exact[0]["player_id"]
        contains = [
            player for player in players
            if self._names_likely_match(key, player.get("market_name"))
            or self._names_likely_match(key, player.get("name"))
            or self._names_likely_match(key, player.get("canonical_name"))
        ]
        if len(contains) == 1:
            self.upsert_alias("player", contains[0]["player_id"], source_name, None, player_name, 0.9)
            return contains[0]["player_id"]
        alias_player_ids = self._player_alias_candidates_in_match(match_id, source_name, player_name)
        if len(alias_player_ids) == 1:
            self.upsert_alias("player", alias_player_ids[0], source_name, None, player_name, 0.91)
            return alias_player_ids[0]
        return None

    def player_id_by_name(self, source_name: str, player_name: Any) -> str | None:
        key = normalize_name(player_name)
        candidates = self.players_by_name.get(key, [])
        if len(candidates) == 1:
            self.upsert_alias("player", candidates[0]["player_id"], source_name, None, player_name, 0.9)
            return candidates[0]["player_id"]
        for alias_key in [(source_name, key), ("*", key)]:
            alias_candidates = self.player_aliases_by_source_display.get(alias_key, [])
            if len(alias_candidates) == 1 and alias_candidates[0] in self.players:
                self.upsert_alias("player", alias_candidates[0], source_name, None, player_name, 0.91)
                return alias_candidates[0]
        return None

    def _player_alias_candidates_in_match(self, match_id: str, source_name: str, player_name: Any) -> list[str]:
        key = normalize_name(player_name)
        if not key:
            return []
        match_player_ids = {player["player_id"] for player in self.match_players.get(match_id, [])}
        for alias_key in [(source_name, key), ("*", key)]:
            alias_candidates = [
                player_id
                for player_id in self.player_aliases_by_source_display.get(alias_key, [])
                if player_id in match_player_ids
            ]
            if len(alias_candidates) == 1:
                return alias_candidates
        return []

    def upsert_alias(
        self,
        entity_type: str,
        canonical_entity_id: str,
        source_name: str,
        source_entity_id: Any,
        source_display_name: Any,
        confidence: float,
    ) -> None:
        display = str(source_display_name or canonical_entity_id)
        alias_id = stable_id("alias", entity_type, canonical_entity_id, source_name, source_entity_id, normalize_name(display))
        now = utc_now()
        self.con.execute(
            """
            insert into entity_aliases (
              entity_alias_id, entity_type, canonical_entity_id, source_name,
              source_entity_id, source_display_name, confidence, first_seen_at, last_seen_at, notes
            ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            on conflict(entity_alias_id) do update set
              last_seen_at = excluded.last_seen_at,
              confidence = max(entity_aliases.confidence, excluded.confidence)
            """,
            (
                alias_id,
                entity_type,
                canonical_entity_id,
                source_name,
                None if source_entity_id is None else str(source_entity_id),
                display,
                confidence,
                now,
                now,
                "Inserted by tennis normalization resolver.",
            ),
        )

    def insert_unresolved(
        self,
        entity_type: str,
        source_name: str,
        source_entity_id: Any,
        source_display_name: Any,
        candidate: dict[str, Any],
        reason: str,
    ) -> None:
        display = str(source_display_name or source_entity_id or "unknown")
        enriched_candidate = dict(candidate)
        enriched_candidate.setdefault(
            "source_context",
            source_context_from_candidate(
                source_name=source_name,
                source_entity_id=source_entity_id,
                source_display_name=display,
                candidate=candidate,
            ),
        )
        unresolved_id = stable_id("unresolved", entity_type, source_name, source_entity_id, normalize_name(display), reason)
        self.con.execute(
            """
            insert or ignore into unresolved_entities (
              unresolved_entity_id, entity_type, source_name, source_entity_id,
              source_display_name, seen_in_source_snapshot_id, candidate_json, reason, status, created_at
            ) values (?, ?, ?, ?, ?, null, ?, ?, 'open', ?)
            """,
            (
                unresolved_id,
                entity_type,
                source_name,
                None if source_entity_id is None else str(source_entity_id),
                display,
                compact_json(enriched_candidate),
                reason,
                utc_now(),
            ),
        )

    @staticmethod
    def _side_to_number(side: Any) -> int | None:
        text = str(side or "").strip().lower()
        if text in {"1", "left", "home", "player1", "p1"}:
            return 1
        if text in {"2", "right", "away", "player2", "p2"}:
            return 2
        return None

    @staticmethod
    def _names_likely_match(left: Any, right: Any) -> bool:
        left_norm = normalize_name(left)
        right_norm = normalize_name(right)
        if not left_norm or not right_norm:
            return False
        if left_norm == right_norm or left_norm in right_norm or right_norm in left_norm:
            return True
        left_tokens = set(left_norm.split())
        right_tokens = set(right_norm.split())
        return left_tokens.issubset(right_tokens) or right_tokens.issubset(left_tokens)


def append_normalization_event(root: Path, event: dict[str, Any]) -> None:
    path = root / "data-migration" / "normalization_events.jsonl"
    with path.open("a", encoding="utf-8") as handle:
        handle.write(compact_json(event) + "\n")


def write_report(path: Path, payload: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8")
