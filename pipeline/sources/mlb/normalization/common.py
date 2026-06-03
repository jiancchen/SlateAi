from __future__ import annotations

import hashlib
import json
import re
import sqlite3
import unicodedata
from collections.abc import Iterable
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[4]


@dataclass(frozen=True)
class StagingTableSource:
    source_table: str
    source_pk_fields: tuple[str, ...]
    date_column: str | None = None


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
    return int(round(number))


def parse_legacy_json(row: sqlite3.Row | dict[str, Any]) -> dict[str, Any]:
    payload = row["row_json"] if isinstance(row, sqlite3.Row) else row.get("row_json")
    try:
        parsed = json.loads(payload or "{}")
    except json.JSONDecodeError:
        return {}
    return parsed if isinstance(parsed, dict) else {}


def fetch_legacy_rows(
    con: sqlite3.Connection,
    source_tables: Iterable[str],
    date: str | None = None,
) -> list[sqlite3.Row]:
    con.row_factory = sqlite3.Row
    tables = list(source_tables)
    placeholders = ",".join("?" for _ in tables)
    params: list[Any] = ["mlb", *tables]
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


def quote_identifier(value: str) -> str:
    return '"' + value.replace('"', '""') + '"'


def table_exists(con: sqlite3.Connection, table_name: str) -> bool:
    row = con.execute(
        """
        select 1
        from sqlite_master
        where name = ?
          and type in ('table', 'view')
        limit 1
        """,
        (table_name,),
    ).fetchone()
    return row is not None


def table_columns(con: sqlite3.Connection, table_name: str) -> list[str]:
    return [row["name"] for row in con.execute(f"pragma table_info({quote_identifier(table_name)})").fetchall()]


def direct_staging_row_to_legacy_shape(
    source: StagingTableSource,
    payload: dict[str, Any],
) -> dict[str, Any]:
    source_pk = compact_json({field: payload.get(field) for field in source.source_pk_fields})
    row_json = compact_json(payload)
    source_date = payload.get(source.date_column) if source.date_column else None
    return {
        "legacy_row_id": stable_id("direct-staging", source.source_table, source_pk),
        "source_table": source.source_table,
        "source_pk": source_pk,
        "source_date": str(source_date or ""),
        "entity_ref": None,
        "row_json": row_json,
        "content_hash": hashlib.sha256(row_json.encode("utf-8")).hexdigest(),
    }


def fetch_direct_staging_rows(
    con: sqlite3.Connection,
    source: StagingTableSource,
    date: str | None = None,
) -> list[dict[str, Any]]:
    con.row_factory = sqlite3.Row
    if not table_exists(con, source.source_table):
        return []
    columns = table_columns(con, source.source_table)
    if not columns:
        return []
    missing_pk_fields = [field for field in source.source_pk_fields if field not in columns]
    if missing_pk_fields:
        return []
    where = ""
    params: list[Any] = []
    if date and source.date_column and source.date_column in columns:
        where = f" where {quote_identifier(source.date_column)} like ?"
        params.append(f"{date}%")
    select_columns = ", ".join(quote_identifier(column) for column in columns)
    rows = con.execute(f"select {select_columns} from {quote_identifier(source.source_table)}{where}", params).fetchall()
    return [direct_staging_row_to_legacy_shape(source, dict(row)) for row in rows]


def fetch_legacy_and_staging_rows(
    con: sqlite3.Connection,
    source_tables: Iterable[str],
    date: str | None = None,
    staging_tables: Iterable[StagingTableSource] = (),
) -> list[sqlite3.Row | dict[str, Any]]:
    rows: list[sqlite3.Row | dict[str, Any]] = list(fetch_legacy_rows(con, source_tables, date=date))
    seen = {(row["source_table"], source_pk_for_row(row)) for row in rows}
    for source in staging_tables:
        for row in fetch_direct_staging_rows(con, source, date=date):
            key = (row["source_table"], source_pk_for_row(row))
            if key in seen:
                continue
            rows.append(row)
            seen.add(key)
    return rows


def detail_json(payload: dict[str, Any]) -> str:
    detail: dict[str, Any] = {}
    for key, value in payload.items():
        if key == "raw_json":
            if isinstance(value, str):
                try:
                    decoded = json.loads(value)
                except json.JSONDecodeError:
                    decoded = value
                detail["raw_json"] = decoded
            else:
                detail["raw_json"] = value
        elif key.startswith("_"):
            detail[key] = value
    if "raw_json" not in detail:
        detail["source_payload"] = payload
    return compact_json(detail)


def source_pk_for_row(row: sqlite3.Row) -> str:
    return str(row["source_pk"] or row["legacy_row_id"])


def insert_value_rows(con: sqlite3.Connection, rows: Iterable[tuple[str, dict[str, Any]]]) -> dict[str, int]:
    inserted: dict[str, int] = {}
    for table, values in rows:
        columns = list(values.keys())
        placeholders = ",".join("?" for _ in columns)
        set_clause = ", ".join(f"{column} = excluded.{column}" for column in columns[1:])
        sql = f"""
            insert into {table} ({", ".join(columns)})
            values ({placeholders})
            on conflict({columns[0]}) do update set {set_clause}
        """
        con.execute(sql, [values[column] for column in columns])
        inserted[table] = inserted.get(table, 0) + 1
    return inserted


def add_column_if_missing(con: sqlite3.Connection, table: str, column: str, ddl: str) -> None:
    existing = {row["name"] for row in con.execute(f"pragma table_info({table})").fetchall()}
    if column not in existing:
        con.execute(f"alter table {table} add column {column} {ddl}")


def write_report(path: Path, payload: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8")


def append_normalization_event(root: Path, event: dict[str, Any]) -> None:
    path = root / "data-migration" / "normalization_events.jsonl"
    with path.open("a", encoding="utf-8") as handle:
        handle.write(compact_json(event) + "\n")


class MlbIdentityResolver:
    def __init__(self, con: sqlite3.Connection):
        self.con = con
        self.con.row_factory = sqlite3.Row
        self.games_by_pk: dict[int, dict[str, Any]] = {}
        self.games_by_id: dict[str, dict[str, Any]] = {}
        for row in self.con.execute("select * from games").fetchall():
            game = dict(row)
            self.games_by_id[game["game_id"]] = game
            if game.get("mlb_game_pk") is not None:
                self.games_by_pk[int(game["mlb_game_pk"])] = game
        self.teams_by_id: dict[str, dict[str, Any]] = {}
        self.teams_by_name: dict[str, dict[str, Any]] = {}
        self.teams_by_abbrev: dict[str, dict[str, Any]] = {}
        for row in self.con.execute("select * from teams").fetchall():
            team = dict(row)
            self.teams_by_id[team["team_id"]] = team
            for name in [team.get("name"), team.get("abbreviation")]:
                key = normalize_name(name)
                if key:
                    self.teams_by_name[key] = team
            if team.get("abbreviation"):
                self.teams_by_abbrev[str(team["abbreviation"]).upper()] = team
        self.players_by_id: dict[str, dict[str, Any]] = {}
        self.players_by_mlb_id: dict[int, dict[str, Any]] = {}
        self.players_by_name: dict[str, list[dict[str, Any]]] = {}
        for row in self.con.execute("select * from players").fetchall():
            player = dict(row)
            self.players_by_id[player["player_id"]] = player
            if player.get("mlb_player_id") is not None:
                self.players_by_mlb_id[int(player["mlb_player_id"])] = player
            key = normalize_name(player.get("name"))
            if key:
                self.players_by_name.setdefault(key, []).append(player)

    def game_id_for_pk(self, game_pk: Any) -> str | None:
        pk = to_int(game_pk)
        if pk is None:
            return None
        game = self.games_by_pk.get(pk)
        return None if game is None else str(game["game_id"])

    def game_for_pk(self, game_pk: Any) -> dict[str, Any] | None:
        pk = to_int(game_pk)
        if pk is None:
            return None
        return self.games_by_pk.get(pk)

    def team_id_for_game_role(self, game_id: str | None, team_role: Any) -> str | None:
        if not game_id:
            return None
        game = self.games_by_id.get(game_id)
        if not game:
            return None
        text = str(team_role or "").strip().lower()
        if text == "home":
            return str(game["home_team_id"])
        if text == "away":
            return str(game["away_team_id"])
        return None

    def opponent_team_id_for_game_role(self, game_id: str | None, team_role: Any) -> str | None:
        if not game_id:
            return None
        game = self.games_by_id.get(game_id)
        if not game:
            return None
        text = str(team_role or "").strip().lower()
        if text == "home":
            return str(game["away_team_id"])
        if text == "away":
            return str(game["home_team_id"])
        return None

    def team_id_by_name(self, source_name: str, team_name: Any) -> str | None:
        key = normalize_name(team_name)
        team = self.teams_by_name.get(key)
        if team:
            self.upsert_alias("team", team["team_id"], source_name, None, team_name, 0.94)
            return str(team["team_id"])
        if key:
            candidates = [
                candidate
                for candidate in self.teams_by_id.values()
                if normalize_name(candidate.get("name")).endswith(f" {key}") or normalize_name(candidate.get("name")) == key
            ]
            if len(candidates) == 1:
                self.upsert_alias("team", candidates[0]["team_id"], source_name, None, team_name, 0.90)
                return str(candidates[0]["team_id"])
        return None

    def game_id_for_teams_date(self, source_name: str, game_date: Any, home_team: Any, away_team: Any) -> str | None:
        home_team_id = self.team_id_by_name(source_name, home_team)
        away_team_id = self.team_id_by_name(source_name, away_team)
        if not game_date or not home_team_id or not away_team_id:
            return None
        date_text = str(game_date)[:10]
        matches = [
            game
            for game in self.games_by_id.values()
            if str(game.get("game_date"))[:10] == date_text
            and game.get("home_team_id") == home_team_id
            and game.get("away_team_id") == away_team_id
        ]
        if len(matches) == 1:
            self.upsert_alias("game", matches[0]["game_id"], source_name, None, f"{away_team} @ {home_team} {date_text}", 0.95)
            return str(matches[0]["game_id"])
        return None

    def team_id_for_payload(
        self,
        source_name: str,
        game_id: str | None,
        team_name: Any,
        team_role: Any,
    ) -> str | None:
        by_role = self.team_id_for_game_role(game_id, team_role)
        if by_role:
            self.upsert_alias("team", by_role, source_name, None, team_name or team_role, 0.98)
            return by_role
        return self.team_id_by_name(source_name, team_name)

    def opponent_team_id_for_payload(
        self,
        source_name: str,
        game_id: str | None,
        opponent_name: Any,
        team_role: Any,
    ) -> str | None:
        by_role = self.opponent_team_id_for_game_role(game_id, team_role)
        if by_role:
            self.upsert_alias("team", by_role, source_name, None, opponent_name or f"opponent:{team_role}", 0.98)
            return by_role
        return self.team_id_by_name(source_name, opponent_name)

    def player_id_by_mlb_id(self, source_name: str, mlb_player_id: Any, player_name: Any) -> str | None:
        numeric_id = to_int(mlb_player_id)
        if numeric_id is not None and numeric_id in self.players_by_mlb_id:
            player = self.players_by_mlb_id[numeric_id]
            self.upsert_alias("player", player["player_id"], source_name, numeric_id, player_name or player.get("name"), 0.99)
            return str(player["player_id"])
        if numeric_id is not None and player_name:
            return self.insert_player_stub(source_name, numeric_id, player_name)
        return self.player_id_by_name(source_name, player_name)

    def insert_player_stub(self, source_name: str, mlb_player_id: int, player_name: Any) -> str:
        player_id = stable_id("mlb-player", mlb_player_id)
        display_name = str(player_name)
        self.con.execute(
            """
            insert into players (
              player_id, mlb_player_id, name, bats, throws, primary_position, birth_date, active
            ) values (?, ?, ?, null, null, null, null, 1)
            on conflict(player_id) do update set
              mlb_player_id = coalesce(players.mlb_player_id, excluded.mlb_player_id),
              name = excluded.name,
              active = 1
            """,
            (player_id, mlb_player_id, display_name),
        )
        player = {
            "player_id": player_id,
            "mlb_player_id": mlb_player_id,
            "name": display_name,
            "bats": None,
            "throws": None,
            "primary_position": None,
            "birth_date": None,
            "active": 1,
        }
        self.players_by_id[player_id] = player
        self.players_by_mlb_id[mlb_player_id] = player
        self.players_by_name.setdefault(normalize_name(display_name), []).append(player)
        self.upsert_alias("player", player_id, source_name, mlb_player_id, display_name, 0.96)
        return player_id

    def player_id_by_name(self, source_name: str, player_name: Any) -> str | None:
        key = normalize_name(player_name)
        candidates = self.players_by_name.get(key, [])
        if len(candidates) == 1:
            self.upsert_alias("player", candidates[0]["player_id"], source_name, None, player_name, 0.88)
            return str(candidates[0]["player_id"])
        return None

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
                "Inserted by MLB normalization resolver.",
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
                compact_json(candidate),
                reason,
                utc_now(),
            ),
        )
