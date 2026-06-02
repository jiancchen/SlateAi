from __future__ import annotations

import hashlib
import json
import re
import sqlite3
import unicodedata
from collections import Counter, defaultdict
from datetime import datetime, timezone
from typing import Any


REGISTRY_VERSION = "player-identity-registry-v1"


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


def slugify(value: Any) -> str:
    return normalize_name(value).replace(" ", "-")


def tokens(value: Any) -> list[str]:
    return normalize_name(value).split()


def parse_abbreviated_tennis_name(value: Any) -> tuple[list[str], list[str]] | None:
    text = str(value or "").strip()
    match = re.match(r"^(.+?)\s+((?:[A-Z][a-z]?(?:-[A-Z][a-z]?)?\.)(?:\s*(?:[A-Z][a-z]?(?:-[A-Z][a-z]?)?\.))*)$", text)
    if not match:
        return None
    surname_tokens = tokens(match.group(1))
    prefixes: list[str] = []
    for chunk in re.findall(r"[A-Z][a-z]?(?:-[A-Z][a-z]?)?\.", match.group(2)):
        for part in chunk[:-1].split("-"):
            if part:
                prefixes.append(part.lower())
    if not surname_tokens or not prefixes:
        return None
    return surname_tokens, prefixes


def matches_abbreviated_tennis_name(display_name: Any, canonical_name: Any) -> bool:
    parsed = parse_abbreviated_tennis_name(display_name)
    if not parsed:
        return False
    surname_tokens, prefixes = parsed
    canonical_tokens = tokens(canonical_name)
    if len(canonical_tokens) <= len(surname_tokens):
        return False
    if canonical_tokens[-len(surname_tokens):] != surname_tokens:
        return False
    given_tokens = canonical_tokens[:-len(surname_tokens)]
    if len(given_tokens) < len(prefixes):
        return False
    return all(given_tokens[index].startswith(prefix) for index, prefix in enumerate(prefixes))


def exact_or_reordered(left: Any, right: Any) -> bool:
    left_tokens = tokens(left)
    right_tokens = tokens(right)
    return bool(left_tokens and right_tokens and (left_tokens == right_tokens or sorted(left_tokens) == sorted(right_tokens)))


def ensure_registry_schema(con: sqlite3.Connection) -> None:
    con.row_factory = sqlite3.Row
    con.executescript(
        """
        create table if not exists player_identity_registry (
          player_id text primary key,
          sport text not null,
          canonical_name text not null,
          normalized_name text not null,
          name_slug text,
          country text,
          tour text,
          birth_date text,
          handedness text,
          active integer,
          trusted_alias_count integer not null default 0,
          quarantined_alias_count integer not null default 0,
          needs_review_alias_count integer not null default 0,
          source_ids_json text,
          trusted_display_names_json text,
          all_display_names_json text,
          url_slug_candidates_json text,
          pattern_tokens_json text,
          source_summary_json text,
          created_at text not null,
          updated_at text not null
        );
        create index if not exists idx_player_identity_registry_name
          on player_identity_registry(normalized_name);

        create table if not exists entity_alias_review_candidates (
          review_candidate_id text primary key,
          entity_alias_id text,
          entity_type text not null,
          source_name text not null,
          source_entity_id text,
          source_display_name text,
          current_canonical_entity_id text,
          proposed_canonical_entity_id text,
          candidate_status text not null,
          evidence_score real,
          evidence_policy text,
          evidence_json text,
          created_at text not null,
          updated_at text not null
        );
        create index if not exists idx_alias_review_candidates_status
          on entity_alias_review_candidates(candidate_status, evidence_policy);
        """
    )


def load_players(con: sqlite3.Connection, sport: str) -> list[dict[str, Any]]:
    if sport == "tennis":
        rows = con.execute("select player_id, name, canonical_name, country, tour, birth_date, handedness, active from players").fetchall()
        return [dict(row) for row in rows]
    if sport == "mlb":
        rows = con.execute("select player_id, name, cast(mlb_player_id as text) as source_player_id, bats, throws, primary_position, birth_date, active from players").fetchall()
        players = []
        for row in rows:
            player = dict(row)
            player["canonical_name"] = player["name"]
            player["country"] = None
            player["tour"] = "MLB"
            hands = [str(player.get(key) or "").strip() for key in ("bats", "throws")]
            player["handedness"] = "/".join([hand for hand in hands if hand]) or None
            players.append(player)
        return players
    raise ValueError(f"Unsupported sport: {sport}")


def player_name_values(player: dict[str, Any]) -> list[str]:
    values = [player.get("name"), player.get("canonical_name")]
    return [str(value) for value in values if value]


def find_unique_abbreviation_candidate(display_name: str, players: list[dict[str, Any]]) -> dict[str, Any] | None:
    candidates = []
    for player in players:
        if player.get("active") == 0:
            continue
        if any(parse_abbreviated_tennis_name(value) for value in player_name_values(player)):
            continue
        if any(matches_abbreviated_tennis_name(display_name, value) for value in player_name_values(player)):
            candidates.append(player)
    return candidates[0] if len(candidates) == 1 else None


def upsert_alias(
    con: sqlite3.Connection,
    *,
    entity_type: str,
    canonical_entity_id: str,
    source_name: str,
    source_entity_id: Any,
    source_display_name: str,
    confidence: float,
    notes: str,
) -> str:
    alias_id = stable_id("alias", entity_type, canonical_entity_id, source_name, source_entity_id, normalize_name(source_display_name))
    now = utc_now()
    con.execute(
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
            entity_type,
            canonical_entity_id,
            source_name,
            None if source_entity_id is None else str(source_entity_id),
            source_display_name,
            confidence,
            now,
            now,
            notes,
        ),
    )
    return alias_id


def upsert_review_candidate(
    con: sqlite3.Connection,
    *,
    entity_alias_id: str,
    entity_type: str,
    source_name: str,
    source_entity_id: Any,
    source_display_name: str,
    current_canonical_entity_id: str | None,
    proposed_canonical_entity_id: str | None,
    candidate_status: str,
    evidence_score: float,
    evidence_policy: str,
    evidence: dict[str, Any],
) -> None:
    review_candidate_id = stable_id("alias-review", entity_alias_id, proposed_canonical_entity_id, candidate_status, evidence_policy)
    now = utc_now()
    con.execute(
        """
        insert into entity_alias_review_candidates (
          review_candidate_id, entity_alias_id, entity_type, source_name,
          source_entity_id, source_display_name, current_canonical_entity_id,
          proposed_canonical_entity_id, candidate_status, evidence_score,
          evidence_policy, evidence_json, created_at, updated_at
        ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        on conflict(review_candidate_id) do update set
          candidate_status = excluded.candidate_status,
          evidence_score = excluded.evidence_score,
          evidence_policy = excluded.evidence_policy,
          evidence_json = excluded.evidence_json,
          updated_at = excluded.updated_at
        """,
        (
            review_candidate_id,
            entity_alias_id,
            entity_type,
            source_name,
            None if source_entity_id is None else str(source_entity_id),
            source_display_name,
            current_canonical_entity_id,
            proposed_canonical_entity_id,
            candidate_status,
            evidence_score,
            evidence_policy,
            compact_json(evidence),
            now,
            now,
        ),
    )


def rescue_tennis_quarantined_aliases(con: sqlite3.Connection, players: list[dict[str, Any]], promote: bool) -> dict[str, Any]:
    rows = con.execute(
        """
        select a.*, g.mapping_policy
        from entity_aliases a
        join entity_alias_governance g on g.entity_alias_id = a.entity_alias_id
        where a.entity_type = 'player'
          and g.alias_status = 'quarantined'
        order by a.source_name, a.source_display_name, a.entity_alias_id
        """
    ).fetchall()
    counts = Counter()
    promoted_alias_ids: set[str] = set()
    for row in rows:
        display = str(row["source_display_name"] or "")
        candidate = find_unique_abbreviation_candidate(display, players)
        if candidate:
            counts["unique_abbreviation_candidate"] += 1
            status = "promoted" if promote else "candidate"
            upsert_review_candidate(
                con,
                entity_alias_id=row["entity_alias_id"],
                entity_type=row["entity_type"],
                source_name=row["source_name"],
                source_entity_id=row["source_entity_id"],
                source_display_name=display,
                current_canonical_entity_id=row["canonical_entity_id"],
                proposed_canonical_entity_id=candidate["player_id"],
                candidate_status=status,
                evidence_score=0.86,
                evidence_policy="unique_abbreviation_name",
                evidence={
                    "display": display,
                    "candidate_name": candidate.get("name"),
                    "candidate_canonical_name": candidate.get("canonical_name"),
                    "previous_policy": row["mapping_policy"],
                    "previous_canonical_entity_id": row["canonical_entity_id"],
                },
            )
            if promote:
                alias_id = upsert_alias(
                    con,
                    entity_type="player",
                    canonical_entity_id=candidate["player_id"],
                    source_name=row["source_name"],
                    source_entity_id=row["source_entity_id"],
                    source_display_name=display,
                    confidence=0.86,
                    notes="G2 player identity registry rescue: Unique source abbreviation matched exactly one canonical player.",
                )
                promoted_alias_ids.add(alias_id)
            continue
        if parse_abbreviated_tennis_name(display):
            counts["ambiguous_or_missing_abbreviation"] += 1
            status = "needs_review"
            policy = "ambiguous_or_missing_abbreviation"
        else:
            counts["not_abbreviation"] += 1
            status = "blocked"
            policy = "not_abbreviation"
        upsert_review_candidate(
            con,
            entity_alias_id=row["entity_alias_id"],
            entity_type=row["entity_type"],
            source_name=row["source_name"],
            source_entity_id=row["source_entity_id"],
            source_display_name=display,
            current_canonical_entity_id=row["canonical_entity_id"],
            proposed_canonical_entity_id=None,
            candidate_status=status,
            evidence_score=0.0,
            evidence_policy=policy,
            evidence={"display": display, "previous_policy": row["mapping_policy"], "previous_canonical_entity_id": row["canonical_entity_id"]},
        )
    counts["promoted_aliases"] = len(promoted_alias_ids)
    counts["source_rows"] = len(rows)
    return dict(counts)


def build_registry_rows(con: sqlite3.Connection, sport: str, players: list[dict[str, Any]]) -> list[dict[str, Any]]:
    now = utc_now()
    alias_rows = con.execute(
        """
        select a.*, coalesce(g.alias_status, 'unknown') as alias_status, g.mapping_policy
        from entity_aliases a
        left join entity_alias_governance g on g.entity_alias_id = a.entity_alias_id
        where a.entity_type = 'player'
        """
    ).fetchall()
    aliases_by_player: dict[str, list[sqlite3.Row]] = defaultdict(list)
    for row in alias_rows:
        aliases_by_player[row["canonical_entity_id"]].append(row)
    registry_rows = []
    for player in players:
        player_id = player["player_id"]
        aliases = aliases_by_player.get(player_id, [])
        status_counts = Counter(row["alias_status"] for row in aliases)
        trusted_display_names = sorted({str(row["source_display_name"]) for row in aliases if row["alias_status"] == "active" and row["source_display_name"]})
        all_display_names = sorted({str(row["source_display_name"]) for row in aliases if row["source_display_name"]})
        source_ids: dict[str, list[str]] = defaultdict(list)
        source_summary: dict[str, dict[str, Any]] = {}
        for row in aliases:
            source = str(row["source_name"])
            source_summary.setdefault(source, {"active": 0, "quarantined": 0, "needs_review": 0, "unknown": 0, "source_ids": []})
            source_summary[source][row["alias_status"]] = source_summary[source].get(row["alias_status"], 0) + 1
            if row["source_entity_id"]:
                source_id = str(row["source_entity_id"])
                if source_id not in source_ids[source]:
                    source_ids[source].append(source_id)
                if source_id not in source_summary[source]["source_ids"]:
                    source_summary[source]["source_ids"].append(source_id)
        canonical_name = str(player.get("name") or player.get("canonical_name") or player_id)
        trusted_names_with_canonical = sorted(set([canonical_name, *trusted_display_names]))
        slug_candidates = sorted({slugify(name) for name in trusted_names_with_canonical if slugify(name)})
        pattern_tokens = sorted({token for name in trusted_names_with_canonical for token in tokens(name)})
        registry_rows.append(
            {
                "player_id": player_id,
                "sport": sport,
                "canonical_name": canonical_name,
                "normalized_name": normalize_name(canonical_name),
                "name_slug": slugify(canonical_name),
                "country": player.get("country"),
                "tour": player.get("tour"),
                "birth_date": player.get("birth_date"),
                "handedness": player.get("handedness"),
                "active": player.get("active"),
                "trusted_alias_count": status_counts.get("active", 0),
                "quarantined_alias_count": status_counts.get("quarantined", 0),
                "needs_review_alias_count": status_counts.get("needs_review", 0),
                "source_ids_json": compact_json({source: sorted(ids) for source, ids in source_ids.items()}),
                "trusted_display_names_json": compact_json(trusted_display_names),
                "all_display_names_json": compact_json(all_display_names),
                "url_slug_candidates_json": compact_json(slug_candidates),
                "pattern_tokens_json": compact_json(pattern_tokens),
                "source_summary_json": compact_json(source_summary),
                "created_at": now,
                "updated_at": now,
            }
        )
    return registry_rows


def insert_registry_rows(con: sqlite3.Connection, rows: list[dict[str, Any]]) -> int:
    for row in rows:
        columns = list(row.keys())
        placeholders = ",".join("?" for _ in columns)
        updates = ", ".join(f"{column}=excluded.{column}" for column in columns if column not in {"player_id", "created_at"})
        con.execute(
            f"""
            insert into player_identity_registry ({", ".join(columns)})
            values ({placeholders})
            on conflict(player_id) do update set {updates}
            """,
            [row[column] for column in columns],
        )
    return len(rows)


def refresh_player_identity_registry(con: sqlite3.Connection, sport: str, promote_rescues: bool = False, dry_run: bool = False) -> dict[str, Any]:
    con.row_factory = sqlite3.Row
    ensure_registry_schema(con)
    players = load_players(con, sport)
    rescue_report = {}
    if sport == "tennis":
        rescue_report = rescue_tennis_quarantined_aliases(con, players, promote=promote_rescues)
    registry_rows = build_registry_rows(con, sport, players)
    report = {
        "sport": sport,
        "family": "player_identity_registry",
        "registry_version": REGISTRY_VERSION,
        "dry_run": dry_run,
        "promote_rescues": promote_rescues,
        "players": len(players),
        "registry_rows": len(registry_rows),
        "rescue_report": rescue_report,
    }
    if not dry_run:
        report["inserted_registry_rows"] = insert_registry_rows(con, registry_rows)
        con.commit()
    if dry_run:
        con.rollback()
    return report


def validate_player_identity_registry(con: sqlite3.Connection, sport: str) -> dict[str, Any]:
    con.row_factory = sqlite3.Row
    ensure_registry_schema(con)
    player_count = con.execute("select count(*) from players").fetchone()[0]
    registry_count = con.execute("select count(*) from player_identity_registry").fetchone()[0]
    active_aliases = con.execute("select count(*) from trusted_entity_aliases where entity_type='player'").fetchone()[0]
    registry_active_aliases = con.execute("select coalesce(sum(trusted_alias_count), 0) from player_identity_registry").fetchone()[0]
    review_counts = {
        row["candidate_status"]: row["n"]
        for row in con.execute("select candidate_status,count(*) as n from entity_alias_review_candidates group by candidate_status").fetchall()
    }
    errors: list[str] = []
    if player_count != registry_count:
        errors.append(f"Registry row count {registry_count} does not match players {player_count}.")
    if active_aliases != registry_active_aliases:
        errors.append(f"Registry trusted alias sum {registry_active_aliases} does not match trusted player aliases {active_aliases}.")
    return {
        "sport": sport,
        "registry_version": REGISTRY_VERSION,
        "player_count": player_count,
        "registry_count": registry_count,
        "active_player_aliases": active_aliases,
        "registry_active_aliases": registry_active_aliases,
        "review_candidate_counts": review_counts,
        "errors": errors,
        "ok": not errors,
    }
