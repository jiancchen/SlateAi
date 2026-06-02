from __future__ import annotations

import json
import sqlite3
from collections import Counter, defaultdict
from typing import Any

from pipeline.sources.shared.player_identity_registry import (
    compact_json,
    matches_abbreviated_tennis_name,
    parse_abbreviated_tennis_name,
    stable_id,
    upsert_alias,
    utc_now,
    normalize_name,
)


REPAIR_VERSION = "tennis-player-identity-repair-v1"


REFERENCE_COLUMNS: dict[str, list[str]] = {
    "trusted_entity_aliases": ["canonical_entity_id"],
    "match_players": ["player_id"],
    "rankings": ["player_id"],
    "recent_matches": ["player_id", "opponent_player_id"],
    "player_form_snapshots": ["player_id"],
    "match_stat_rows": ["player_id"],
    "service_pressure_snapshots": ["player_id"],
    "replay_games": ["server_player_id", "winner_player_id"],
    "replay_points": ["server_player_id", "point_winner_player_id"],
    "h2h_matches": ["player_a_id", "player_b_id", "winner_player_id"],
    "market_snapshots": ["player_id"],
    "market_contracts": ["player_id"],
    "market_price_ticks": ["player_id"],
    "prediction_rows": ["player_id"],
}


REFERENCE_WEIGHTS: dict[str, int] = {
    "trusted_entity_aliases": 20,
    "match_players": 15,
    "market_contracts": 12,
    "prediction_rows": 10,
    "service_pressure_snapshots": 7,
    "player_form_snapshots": 6,
    "market_snapshots": 5,
    "recent_matches": 4,
    "h2h_matches": 3,
    "match_stat_rows": 2,
    "rankings": 1,
    "replay_games": 1,
    "replay_points": 1,
    "market_price_ticks": 1,
}


def ensure_repair_schema(con: sqlite3.Connection) -> None:
    con.row_factory = sqlite3.Row
    con.executescript(
        """
        create table if not exists player_identity_redirects (
          player_redirect_id text primary key,
          sport text not null,
          from_player_id text not null,
          to_player_id text not null,
          redirect_status text not null,
          redirect_policy text not null,
          confidence real,
          evidence_json text,
          created_at text not null,
          updated_at text not null,
          unique (sport, from_player_id, redirect_status)
        );
        create index if not exists idx_player_identity_redirects_from
          on player_identity_redirects(sport, from_player_id, redirect_status);
        create index if not exists idx_player_identity_redirects_to
          on player_identity_redirects(sport, to_player_id, redirect_status);

        create table if not exists player_identity_redirect_candidates (
          redirect_candidate_id text primary key,
          sport text not null,
          from_player_id text not null,
          source_display_name text not null,
          proposed_player_id text,
          candidate_status text not null,
          evidence_policy text not null,
          confidence real,
          candidate_count integer,
          evidence_json text,
          created_at text not null,
          updated_at text not null
        );
        create index if not exists idx_player_identity_redirect_candidates_status
          on player_identity_redirect_candidates(sport, candidate_status, evidence_policy);
        """
    )


def table_columns(con: sqlite3.Connection, table: str) -> set[str]:
    try:
        return {str(row["name"]) for row in con.execute(f"pragma table_info({table})").fetchall()}
    except sqlite3.Error:
        return set()


def table_exists(con: sqlite3.Connection, table: str) -> bool:
    return bool(con.execute("select 1 from sqlite_master where type in ('table','view') and name=?", (table,)).fetchone())


def is_abbreviated_player(player: dict[str, Any]) -> bool:
    return bool(parse_abbreviated_tennis_name(player.get("name")) or parse_abbreviated_tennis_name(player.get("canonical_name")))


def load_players(con: sqlite3.Connection) -> list[dict[str, Any]]:
    rows = con.execute(
        "select player_id, source_player_id, name, canonical_name, tour, country, birth_date, handedness, active from players"
    ).fetchall()
    return [dict(row) for row in rows]


def count_player_refs(con: sqlite3.Connection, player_id: str) -> dict[str, int]:
    counts: dict[str, int] = {}
    for table, columns in REFERENCE_COLUMNS.items():
        if not table_exists(con, table):
            continue
        available = table_columns(con, table)
        total = 0
        for column in columns:
            if column not in available:
                continue
            total += con.execute(f"select count(*) from {table} where {column} = ?", (player_id,)).fetchone()[0]
        if total:
            counts[table] = int(total)
    return counts


def build_reference_counts(con: sqlite3.Connection) -> dict[str, dict[str, int]]:
    counts: dict[str, dict[str, int]] = defaultdict(dict)
    for table, columns in REFERENCE_COLUMNS.items():
        if not table_exists(con, table):
            continue
        available = table_columns(con, table)
        table_counts: Counter[str] = Counter()
        for column in columns:
            if column not in available:
                continue
            for row in con.execute(f"select {column} as player_id, count(*) as n from {table} where {column} is not null group by {column}").fetchall():
                table_counts[str(row["player_id"])] += int(row["n"])
        for player_id, count in table_counts.items():
            counts[player_id][table] = count
    return {player_id: dict(table_counts) for player_id, table_counts in counts.items()}


def reference_score(ref_counts: dict[str, int]) -> int:
    return sum(REFERENCE_WEIGHTS.get(table, 1) * count for table, count in ref_counts.items())


def is_ascii_text(value: Any) -> bool:
    try:
        str(value or "").encode("ascii")
        return True
    except UnicodeEncodeError:
        return False


def preferred_candidate(candidates: list[dict[str, Any]], ref_counts: dict[str, dict[str, int]]) -> dict[str, Any]:
    def key(player: dict[str, Any]) -> tuple[int, int, int, str]:
        refs = ref_counts.get(player["player_id"], {})
        return (
            reference_score(refs),
            sum(refs.values()),
            1 if is_ascii_text(player.get("name")) else 0,
            str(player.get("player_id")),
        )

    return sorted(candidates, key=key, reverse=True)[0]


def candidate_summary(candidate: dict[str, Any], refs: dict[str, int]) -> dict[str, Any]:
    return {
        "player_id": candidate.get("player_id"),
        "name": candidate.get("name"),
        "canonical_name": candidate.get("canonical_name"),
        "active": candidate.get("active"),
        "reference_score": reference_score(refs),
        "reference_counts": refs,
    }


def classify_stub(
    stub: dict[str, Any],
    full_players: list[dict[str, Any]],
    ref_counts: dict[str, dict[str, int]],
) -> dict[str, Any]:
    display = str(stub.get("name") or stub.get("canonical_name") or "")
    candidates = [
        player
        for player in full_players
        if player.get("active") != 0
        and (matches_abbreviated_tennis_name(display, player.get("name")) or matches_abbreviated_tennis_name(display, player.get("canonical_name")))
    ]
    summaries = [candidate_summary(candidate, ref_counts.get(candidate["player_id"], {})) for candidate in candidates]
    evidence = {
        "display": display,
        "from_player_id": stub.get("player_id"),
        "candidate_count": len(candidates),
        "candidates": summaries,
    }
    if not candidates:
        return {
            "from_player_id": stub["player_id"],
            "source_display_name": display,
            "to_player_id": None,
            "candidate_status": "needs_deep_dive",
            "evidence_policy": "no_full_name_candidate",
            "confidence": 0.0,
            "candidate_count": 0,
            "evidence": evidence,
        }
    target = preferred_candidate(candidates, ref_counts)
    target_refs = ref_counts.get(target["player_id"], {})
    target_score = reference_score(target_refs)
    if len(candidates) == 1:
        return {
            "from_player_id": stub["player_id"],
            "source_display_name": display,
            "to_player_id": target["player_id"],
            "candidate_status": "redirect_ready",
            "evidence_policy": "unique_abbreviation_full_name",
            "confidence": 0.93,
            "candidate_count": 1,
            "evidence": evidence,
        }
    normalized_targets = {normalize_name(candidate.get("name")) for candidate in candidates}
    if len(normalized_targets) == 1:
        return {
            "from_player_id": stub["player_id"],
            "source_display_name": display,
            "to_player_id": target["player_id"],
            "candidate_status": "redirect_ready",
            "evidence_policy": "accent_duplicate_group",
            "confidence": 0.94,
            "candidate_count": len(candidates),
            "evidence": evidence,
        }
    ordered = sorted(
        [(candidate, reference_score(ref_counts.get(candidate["player_id"], {}))) for candidate in candidates],
        key=lambda item: item[1],
        reverse=True,
    )
    second_score = ordered[1][1] if len(ordered) > 1 else 0
    if target_score >= 12 and target_score >= (second_score * 2 + 3):
        return {
            "from_player_id": stub["player_id"],
            "source_display_name": display,
            "to_player_id": target["player_id"],
            "candidate_status": "redirect_ready",
            "evidence_policy": "dominant_context_candidate",
            "confidence": 0.88,
            "candidate_count": len(candidates),
            "evidence": evidence,
        }
    return {
        "from_player_id": stub["player_id"],
        "source_display_name": display,
        "to_player_id": None,
        "candidate_status": "needs_deep_dive",
        "evidence_policy": "multiple_live_candidates",
        "confidence": 0.0,
        "candidate_count": len(candidates),
        "evidence": evidence,
    }


def upsert_redirect_candidate(con: sqlite3.Connection, item: dict[str, Any]) -> None:
    now = utc_now()
    candidate_id = stable_id(
        "player-identity-redirect-candidate",
        "tennis",
        item["from_player_id"],
        item.get("to_player_id"),
        item["candidate_status"],
        item["evidence_policy"],
    )
    con.execute(
        """
        insert into player_identity_redirect_candidates (
          redirect_candidate_id, sport, from_player_id, source_display_name,
          proposed_player_id, candidate_status, evidence_policy, confidence,
          candidate_count, evidence_json, created_at, updated_at
        ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        on conflict(redirect_candidate_id) do update set
          proposed_player_id = excluded.proposed_player_id,
          candidate_status = excluded.candidate_status,
          evidence_policy = excluded.evidence_policy,
          confidence = excluded.confidence,
          candidate_count = excluded.candidate_count,
          evidence_json = excluded.evidence_json,
          updated_at = excluded.updated_at
        """,
        (
            candidate_id,
            "tennis",
            item["from_player_id"],
            item["source_display_name"],
            item.get("to_player_id"),
            item["candidate_status"],
            item["evidence_policy"],
            item["confidence"],
            item["candidate_count"],
            compact_json(item["evidence"]),
            now,
            now,
        ),
    )


def upsert_redirect(con: sqlite3.Connection, item: dict[str, Any]) -> str:
    now = utc_now()
    redirect_id = stable_id("player-identity-redirect", "tennis", item["from_player_id"], item["to_player_id"], item["evidence_policy"])
    con.execute(
        """
        insert into player_identity_redirects (
          player_redirect_id, sport, from_player_id, to_player_id, redirect_status,
          redirect_policy, confidence, evidence_json, created_at, updated_at
        ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        on conflict(sport, from_player_id, redirect_status) do update set
          to_player_id = excluded.to_player_id,
          redirect_policy = excluded.redirect_policy,
          confidence = excluded.confidence,
          evidence_json = excluded.evidence_json,
          updated_at = excluded.updated_at
        """,
        (
            redirect_id,
            "tennis",
            item["from_player_id"],
            item["to_player_id"],
            "active",
            item["evidence_policy"],
            item["confidence"],
            compact_json(item["evidence"]),
            now,
            now,
        ),
    )
    return redirect_id


def repair_tennis_player_identity(con: sqlite3.Connection, apply: bool = False, dry_run: bool = True) -> dict[str, Any]:
    con.row_factory = sqlite3.Row
    ensure_repair_schema(con)
    players = load_players(con)
    stubs = [player for player in players if is_abbreviated_player(player)]
    full_players = [player for player in players if not is_abbreviated_player(player)]
    ref_counts = build_reference_counts(con)
    items = [classify_stub(stub, full_players, ref_counts) for stub in stubs]
    status_counts = Counter(item["candidate_status"] for item in items)
    policy_counts = Counter(item["evidence_policy"] for item in items)
    ready_items = [item for item in items if item["candidate_status"] == "redirect_ready" and item.get("to_player_id")]
    unresolved_items = [item for item in items if item["candidate_status"] != "redirect_ready"]
    for item in items:
        upsert_redirect_candidate(con, item)
    redirects_written = 0
    aliases_written = 0
    stubs_deactivated = 0
    if apply:
        for item in ready_items:
            upsert_redirect(con, item)
            redirects_written += 1
            upsert_alias(
                con,
                entity_type="player",
                canonical_entity_id=item["to_player_id"],
                source_name="player_identity_redirect",
                source_entity_id=item["from_player_id"],
                source_display_name=item["source_display_name"],
                confidence=float(item["confidence"]),
                notes=f"G3 tennis identity repair: {item['evidence_policy']} redirect from inactive abbreviation stub.",
            )
            aliases_written += 1
        for stub in stubs:
            con.execute("update players set active = 0 where player_id = ?", (stub["player_id"],))
            stubs_deactivated += 1
    active_abbrev_stubs_after = None
    if apply:
        active_abbrev_stubs_after = sum(1 for player in stubs if con.execute("select active from players where player_id=?", (player["player_id"],)).fetchone()[0])
    report = {
        "sport": "tennis",
        "family": "player_identity_repair",
        "repair_version": REPAIR_VERSION,
        "dry_run": dry_run,
        "apply": apply,
        "source_abbreviation_stubs": len(stubs),
        "redirect_ready": len(ready_items),
        "unresolved": len(unresolved_items),
        "status_counts": dict(status_counts),
        "policy_counts": dict(policy_counts),
        "redirects_written": redirects_written,
        "aliases_written": aliases_written,
        "stubs_deactivated": stubs_deactivated,
        "active_abbrev_stubs_after": active_abbrev_stubs_after,
        "unresolved_samples": [
            {
                "from_player_id": item["from_player_id"],
                "source_display_name": item["source_display_name"],
                "evidence_policy": item["evidence_policy"],
                "candidate_count": item["candidate_count"],
                "candidates": item["evidence"].get("candidates", [])[:5],
            }
            for item in unresolved_items[:50]
        ],
    }
    if not dry_run:
        con.commit()
    else:
        con.rollback()
    return report


def validate_tennis_player_identity_repair(con: sqlite3.Connection) -> dict[str, Any]:
    con.row_factory = sqlite3.Row
    ensure_repair_schema(con)
    active_redirects = con.execute("select count(*) from player_identity_redirects where sport='tennis' and redirect_status='active'").fetchone()[0]
    orphan_redirects = con.execute(
        """
        select count(*)
        from player_identity_redirects r
        left join players f on f.player_id = r.from_player_id
        left join players t on t.player_id = r.to_player_id
        where r.sport='tennis' and r.redirect_status='active'
          and (f.player_id is null or t.player_id is null)
        """
    ).fetchone()[0]
    active_from_players = con.execute(
        """
        select count(*)
        from player_identity_redirects r
        join players f on f.player_id = r.from_player_id
        where r.sport='tennis' and r.redirect_status='active' and f.active != 0
        """
    ).fetchone()[0]
    active_abbrev_stubs = 0
    for row in con.execute("select player_id, name, canonical_name from players where active != 0").fetchall():
        if parse_abbreviated_tennis_name(row["name"]) or parse_abbreviated_tennis_name(row["canonical_name"]):
            active_abbrev_stubs += 1
    candidate_counts = {
        row["candidate_status"]: row["n"]
        for row in con.execute(
            "select candidate_status, count(*) as n from player_identity_redirect_candidates where sport='tennis' group by candidate_status"
        ).fetchall()
    }
    errors: list[str] = []
    if orphan_redirects:
        errors.append(f"{orphan_redirects} active redirects have missing from/to players.")
    if active_from_players:
        errors.append(f"{active_from_players} active redirects point from still-active player stubs.")
    if active_abbrev_stubs:
        errors.append(f"{active_abbrev_stubs} active player rows still look like source abbreviations.")
    return {
        "sport": "tennis",
        "repair_version": REPAIR_VERSION,
        "active_redirects": active_redirects,
        "orphan_redirects": orphan_redirects,
        "active_from_players": active_from_players,
        "active_abbrev_stubs": active_abbrev_stubs,
        "candidate_counts": candidate_counts,
        "errors": errors,
        "ok": not errors,
    }
