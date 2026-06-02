from __future__ import annotations

import hashlib
import json
import re
import sqlite3
import unicodedata
from collections import Counter, defaultdict
from datetime import datetime, timezone
from typing import Any


RESOLVER_VERSION = "alias-governance-v1"


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


def name_tokens(value: Any) -> list[str]:
    return normalize_name(value).split()


def exact_or_reordered(left: Any, right: Any) -> bool:
    left_tokens = name_tokens(left)
    right_tokens = name_tokens(right)
    if not left_tokens or not right_tokens:
        return False
    return left_tokens == right_tokens or sorted(left_tokens) == sorted(right_tokens)


def abbreviation_name(value: Any) -> bool:
    text = str(value or "").strip()
    return bool(re.match(r"^[A-Za-zÀ-ÿ'\\-]+\\s+[A-Z](?:\\.)(?:\\s+[A-Z]\\.)?$", text))


def last_token(value: Any) -> str:
    tokens = name_tokens(value)
    return tokens[-1] if tokens else ""


def ensure_governance_schema(con: sqlite3.Connection) -> None:
    con.row_factory = sqlite3.Row
    con.executescript(
        """
        create table if not exists entity_alias_governance (
          entity_alias_id text primary key,
          alias_status text not null,
          mapping_policy text not null,
          resolver_version text not null,
          risk_label text,
          reviewed_at text,
          review_reason text,
          source_evidence_json text,
          created_at text not null,
          updated_at text not null
        );
        create index if not exists idx_entity_alias_governance_status
          on entity_alias_governance(alias_status, mapping_policy);
        drop view if exists trusted_entity_aliases;
        create view trusted_entity_aliases as
          select a.*
          from entity_aliases a
          join entity_alias_governance g on g.entity_alias_id = a.entity_alias_id
          where g.alias_status = 'active';
        """
    )


def canonical_lookup(con: sqlite3.Connection, sport: str, entity_type: str, canonical_id: str) -> dict[str, Any] | None:
    if sport == "tennis":
        if entity_type == "player":
            row = con.execute("select player_id as id, name, canonical_name from players where player_id = ?", (canonical_id,)).fetchone()
            return dict(row) if row else None
        if entity_type == "match":
            row = con.execute("select match_id as id, source_event_id as name, match_date, tour, surface from matches where match_id = ?", (canonical_id,)).fetchone()
            return dict(row) if row else None
        return None
    if sport == "mlb":
        if entity_type == "player":
            row = con.execute("select player_id as id, name, cast(mlb_player_id as text) as source_id from players where player_id = ?", (canonical_id,)).fetchone()
            return dict(row) if row else None
        if entity_type == "team":
            row = con.execute("select team_id as id, name, abbreviation, cast(mlb_team_id as text) as source_id from teams where team_id = ?", (canonical_id,)).fetchone()
            return dict(row) if row else None
        if entity_type == "game":
            row = con.execute("select game_id as id, cast(mlb_game_pk as text) as source_id, game_date, home_team_id, away_team_id from games where game_id = ?", (canonical_id,)).fetchone()
            return dict(row) if row else None
        return None
    return None


def canonical_names(canonical: dict[str, Any] | None) -> list[str]:
    if not canonical:
        return []
    names = [
        canonical.get("name"),
        canonical.get("canonical_name"),
        canonical.get("abbreviation"),
        canonical.get("source_id"),
    ]
    return [str(name) for name in names if name]


def conflict_indexes(rows: list[sqlite3.Row]) -> tuple[dict[tuple[str, str, str, str], set[str]], dict[tuple[str, str, str], set[str]]]:
    display_index: dict[tuple[str, str, str, str], set[str]] = defaultdict(set)
    source_id_index: dict[tuple[str, str, str], set[str]] = defaultdict(set)
    for row in rows:
        display_key = normalize_name(row["source_display_name"])
        if display_key:
            display_index[(row["entity_type"], row["source_name"], display_key, row["source_entity_id"] or "")].add(row["canonical_entity_id"])
        if row["source_entity_id"]:
            source_id_index[(row["entity_type"], row["source_name"], str(row["source_entity_id"]))].add(row["canonical_entity_id"])
    return display_index, source_id_index


def classify_alias(
    sport: str,
    row: sqlite3.Row,
    canonical: dict[str, Any] | None,
    display_conflict_count: int,
    source_id_conflict_count: int,
) -> tuple[str, str, str, str]:
    notes = str(row["notes"] or "")
    source_name = str(row["source_name"] or "")
    source_entity_id = row["source_entity_id"]
    display = row["source_display_name"]
    entity_type = row["entity_type"]
    if canonical is None:
        return ("quarantined", "missing_canonical", "orphan", "Canonical entity does not exist.")
    if source_id_conflict_count > 1:
        return ("quarantined", "source_id_conflict", "conflict", "Same source entity ID maps to multiple canonical IDs.")
    if notes.startswith("N22 tennis identity cleanup:"):
        return ("active", "n22_vetted", "low", "N22 resolver produced high-confidence match/player mapping.")
    if notes.startswith("G2 player identity registry rescue:"):
        return ("active", "unique_abbreviation_rescue", "low", "Unique source abbreviation matched exactly one canonical player.")
    if notes.startswith("G3 tennis identity repair:"):
        return ("active", "player_identity_redirect", "low", "Alias produced by active player identity redirect.")
    if display_conflict_count > 1 and not notes.startswith("N22 tennis identity cleanup:"):
        return ("quarantined", "display_conflict", "conflict", "Same source display maps to multiple canonical IDs.")
    if sport == "tennis":
        if entity_type == "match" and source_entity_id:
            return ("active", "source_match_id", "low", "Match alias has source event/ticker ID and no conflict.")
        if entity_type == "player":
            if any(exact_or_reordered(display, name) for name in canonical_names(canonical)):
                return ("active", "exact_or_reordered_name", "low", "Display name exactly matches canonical player tokens.")
            if source_entity_id:
                return ("active", "source_player_id", "low", "Player alias has source ID and no conflict.")
            if source_name == "flashscore" and abbreviation_name(display):
                return ("quarantined", "abbreviated_flashscore_name", "high", "Flashscore abbreviated name cannot be trusted globally.")
            return ("quarantined", "name_mismatch", "high", "Player display name does not match canonical player.")
        return ("needs_review", "unsupported_tennis_alias", "medium", "Alias type not covered by tennis governance policy.")
    if sport == "mlb":
        if source_entity_id:
            return ("active", f"{entity_type}_source_id", "low", "Alias has stable source ID and no conflict.")
        if entity_type in {"team", "player"} and any(exact_or_reordered(display, name) for name in canonical_names(canonical)):
            return ("active", "exact_or_reordered_name", "low", "Display name exactly matches canonical entity tokens.")
        if entity_type == "game":
            return ("active", "game_context_mapping", "low", "Game alias is produced from canonical game/date/team context and has no conflict.")
        return ("needs_review", "mlb_name_only_unmatched", "medium", "No stable source ID and no exact canonical display match.")
    return ("needs_review", "unknown_sport", "medium", "No governance policy for sport.")


def classify_entity_aliases(con: sqlite3.Connection, sport: str, dry_run: bool = False) -> dict[str, Any]:
    con.row_factory = sqlite3.Row
    ensure_governance_schema(con)
    rows = con.execute("select * from entity_aliases order by entity_type, source_name, entity_alias_id").fetchall()
    display_index, source_id_index = conflict_indexes(rows)
    classifications: list[dict[str, Any]] = []
    counts = Counter()
    policy_counts = Counter()
    source_counts: dict[str, Counter[str]] = defaultdict(Counter)
    now = utc_now()
    for row in rows:
        canonical = canonical_lookup(con, sport, row["entity_type"], row["canonical_entity_id"])
        display_key = normalize_name(row["source_display_name"])
        display_conflict_count = len(display_index.get((row["entity_type"], row["source_name"], display_key, row["source_entity_id"] or ""), set()))
        source_id_conflict_count = 0
        if row["source_entity_id"]:
            source_id_conflict_count = len(source_id_index.get((row["entity_type"], row["source_name"], str(row["source_entity_id"])), set()))
        alias_status, policy, risk_label, reason = classify_alias(sport, row, canonical, display_conflict_count, source_id_conflict_count)
        counts[alias_status] += 1
        policy_counts[policy] += 1
        source_counts[str(row["source_name"])][alias_status] += 1
        evidence = {
            "source_display_name": row["source_display_name"],
            "source_entity_id": row["source_entity_id"],
            "canonical_entity_id": row["canonical_entity_id"],
            "canonical_names": canonical_names(canonical),
            "display_conflict_count": display_conflict_count,
            "source_id_conflict_count": source_id_conflict_count,
            "previous_notes": row["notes"],
        }
        classifications.append(
            {
                "entity_alias_id": row["entity_alias_id"],
                "alias_status": alias_status,
                "mapping_policy": policy,
                "resolver_version": RESOLVER_VERSION,
                "risk_label": risk_label,
                "reviewed_at": now,
                "review_reason": reason,
                "source_evidence_json": compact_json(evidence),
                "created_at": now,
                "updated_at": now,
            }
        )
    if not dry_run:
        for item in classifications:
            con.execute(
                """
                insert into entity_alias_governance (
                  entity_alias_id, alias_status, mapping_policy, resolver_version,
                  risk_label, reviewed_at, review_reason, source_evidence_json,
                  created_at, updated_at
                ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                on conflict(entity_alias_id) do update set
                  alias_status = excluded.alias_status,
                  mapping_policy = excluded.mapping_policy,
                  resolver_version = excluded.resolver_version,
                  risk_label = excluded.risk_label,
                  reviewed_at = excluded.reviewed_at,
                  review_reason = excluded.review_reason,
                  source_evidence_json = excluded.source_evidence_json,
                  updated_at = excluded.updated_at
                """,
                (
                    item["entity_alias_id"],
                    item["alias_status"],
                    item["mapping_policy"],
                    item["resolver_version"],
                    item["risk_label"],
                    item["reviewed_at"],
                    item["review_reason"],
                    item["source_evidence_json"],
                    item["created_at"],
                    item["updated_at"],
                ),
            )
        con.commit()
    trusted_count = counts["active"]
    report = {
        "sport": sport,
        "family": "entity_alias_governance",
        "dry_run": dry_run,
        "resolver_version": RESOLVER_VERSION,
        "alias_rows": len(rows),
        "trusted_alias_rows": trusted_count,
        "status_counts": dict(counts),
        "policy_counts": dict(policy_counts),
        "source_status_counts": {source: dict(counter) for source, counter in source_counts.items()},
        "quarantined_samples": [
            {
                "entity_alias_id": row["entity_alias_id"],
                "status": item["alias_status"],
                "policy": item["mapping_policy"],
                "reason": item["review_reason"],
            }
            for row, item in zip(rows, classifications)
            if item["alias_status"] == "quarantined"
        ][:25],
    }
    if dry_run:
        con.rollback()
    return report


def validate_alias_governance(con: sqlite3.Connection, sport: str) -> dict[str, Any]:
    con.row_factory = sqlite3.Row
    ensure_governance_schema(con)
    total_aliases = con.execute("select count(*) from entity_aliases").fetchone()[0]
    governed_aliases = con.execute("select count(*) from entity_alias_governance").fetchone()[0]
    trusted_aliases = con.execute("select count(*) from trusted_entity_aliases").fetchone()[0]
    status_counts = {
        row["alias_status"]: row["n"]
        for row in con.execute("select alias_status,count(*) as n from entity_alias_governance group by alias_status").fetchall()
    }
    orphan_governance = con.execute(
        "select count(*) from entity_alias_governance g left join entity_aliases a on a.entity_alias_id=g.entity_alias_id where a.entity_alias_id is null"
    ).fetchone()[0]
    errors: list[str] = []
    if governed_aliases != total_aliases:
        errors.append(f"Governed alias count {governed_aliases} does not match entity_aliases count {total_aliases}.")
    if orphan_governance:
        errors.append(f"{orphan_governance} governance rows do not have matching aliases.")
    if trusted_aliases != status_counts.get("active", 0):
        errors.append("trusted_entity_aliases count does not match active governance count.")
    if sport == "tennis":
        risky_trusted = con.execute(
            """
            select count(*)
            from trusted_entity_aliases a
            join entity_alias_governance g on g.entity_alias_id=a.entity_alias_id
            where a.entity_type='player'
              and a.source_name='flashscore'
              and a.source_entity_id is null
              and g.mapping_policy='abbreviated_flashscore_name'
            """
        ).fetchone()[0]
        if risky_trusted:
            errors.append(f"{risky_trusted} risky Flashscore abbreviations are trusted.")
    return {
        "sport": sport,
        "resolver_version": RESOLVER_VERSION,
        "total_aliases": total_aliases,
        "governed_aliases": governed_aliases,
        "trusted_aliases": trusted_aliases,
        "status_counts": status_counts,
        "orphan_governance": orphan_governance,
        "errors": errors,
        "ok": not errors,
    }
