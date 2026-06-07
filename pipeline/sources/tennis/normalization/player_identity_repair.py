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


REPAIR_VERSION = "tennis-player-identity-repair-v2"


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


DUPLICATE_REFERENCE_COLUMNS: dict[str, list[str]] = {
    **REFERENCE_COLUMNS,
    "tennislive_player_sources": ["player_id"],
    "tennislive_player_profiles": ["player_id"],
    "tennislive_player_surface_records": ["player_id"],
    "tennislive_player_match_links": ["player_id"],
    "tennislive_match_player_snapshots": ["player_id"],
    "tennislive_form_chart_points": ["player_id", "opponent_player_id"],
    "tennislive_h2h_source_rows": ["player1_id", "player2_id"],
}


DUPLICATE_TARGET_WEIGHTS: dict[str, int] = {
    "trusted_entity_aliases": 20,
    "match_players": 18,
    "market_contracts": 15,
    "market_snapshots": 12,
    "prediction_rows": 10,
    "rankings": 8,
    "service_pressure_snapshots": 7,
    "player_form_snapshots": 4,
    "recent_matches": 3,
    "match_stat_rows": 2,
    "h2h_matches": 2,
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


def build_reference_counts_for(
    con: sqlite3.Connection,
    reference_columns: dict[str, list[str]],
) -> dict[str, dict[str, int]]:
    counts: dict[str, dict[str, int]] = defaultdict(dict)
    for table, columns in reference_columns.items():
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


def build_reference_counts(con: sqlite3.Connection) -> dict[str, dict[str, int]]:
    return build_reference_counts_for(con, REFERENCE_COLUMNS)


def active_redirect_source_rows(con: sqlite3.Connection) -> list[dict[str, Any]]:
    if not table_exists(con, "player_identity_redirects") or not table_exists(con, "players"):
        return []
    rows = con.execute(
        """
        select
          redirects.from_player_id,
          from_players.name as from_name,
          redirects.to_player_id,
          to_players.name as to_name,
          redirects.redirect_policy,
          redirects.confidence
        from player_identity_redirects redirects
        join players from_players
          on from_players.player_id = redirects.from_player_id
        left join players to_players
          on to_players.player_id = redirects.to_player_id
        where redirects.sport = 'tennis'
          and redirects.redirect_status = 'active'
          and from_players.active != 0
        order by redirects.from_player_id
        """
    ).fetchall()
    return [dict(row) for row in rows]


def safe_json_loads(value: Any) -> dict[str, Any]:
    try:
        parsed = json.loads(value or "{}")
    except (TypeError, json.JSONDecodeError):
        return {}
    return parsed if isinstance(parsed, dict) else {}


def player_labels_from_flashscore_payload(payload: dict[str, Any]) -> list[str]:
    labels: list[str] = []
    for field in ["left_player_name", "right_player_name", "leftPlayer", "rightPlayer"]:
        if payload.get(field):
            labels.append(str(payload[field]))
    players = payload.get("players")
    if isinstance(players, list):
        labels.extend(str(player) for player in players if player)
    flashscore_label = payload.get("flashscore_label") or payload.get("flashscoreLabel")
    if flashscore_label and " - " in str(flashscore_label):
        labels.extend(part.strip() for part in str(flashscore_label).split(" - ") if part.strip())
    return list(dict.fromkeys(label for label in labels if normalize_name(label)))


def build_source_contexts(con: sqlite3.Connection) -> dict[str, list[dict[str, Any]]]:
    contexts: dict[str, list[dict[str, Any]]] = defaultdict(list)
    if not table_exists(con, "legacy_table_rows"):
        return contexts
    rows = con.execute(
        """
        select legacy_row_id, source_table, row_json
        from legacy_table_rows
        where sport = 'tennis'
          and source_table in ('tennis_flashscore_match_stats', 'tennis_flashscore_recent_links')
        """
    ).fetchall()
    for row in rows:
        payload = safe_json_loads(row["row_json"])
        raw_payload = safe_json_loads(payload.get("raw_json"))
        merged = {**raw_payload, **payload}
        labels = player_labels_from_flashscore_payload(merged)
        if not labels:
            continue
        normalized_labels = {normalize_name(label): label for label in labels}
        for label in labels:
            label_key = normalize_name(label)
            opponent_labels = [
                original
                for key, original in normalized_labels.items()
                if key and key != label_key
            ]
            context = {
                "legacy_row_id": row["legacy_row_id"],
                "source_table": row["source_table"],
                "flashscore_id": merged.get("flashscore_id") or merged.get("matchId"),
                "flashscore_label": merged.get("flashscore_label") or merged.get("flashscoreLabel"),
                "flashscore_tournament_url": merged.get("flashscore_tournament_url") or merged.get("flashscoreTournamentUrl"),
                "board_match_id": merged.get("board_match_id") or merged.get("boardMatchId"),
                "board_title": merged.get("board_title") or merged.get("boardTitle"),
                "board_player_name": merged.get("board_player_name") or merged.get("boardPlayerName"),
                "opponent_labels": sorted(set(opponent_labels)),
            }
            compact_context = {
                key: value
                for key, value in context.items()
                if value not in (None, "", [])
            }
            bucket = contexts[label_key]
            if compact_context and compact_context not in bucket:
                bucket.append(compact_context)
    return contexts


def reference_score(ref_counts: dict[str, int], weights: dict[str, int] | None = None) -> int:
    score_weights = weights or REFERENCE_WEIGHTS
    return sum(score_weights.get(table, 1) * count for table, count in ref_counts.items())


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


def display_name(player: dict[str, Any]) -> str:
    return str(player.get("name") or player.get("canonical_name") or "")


def expected_player_id(normalized_name: str) -> str:
    return f"tennis-player-{normalized_name.replace(' ', '-')}"


def is_exact_ascii_canonical(player: dict[str, Any], normalized_name: str) -> bool:
    return any(
        is_ascii_text(value) and normalize_name(value) == normalized_name
        for value in (player.get("name"), player.get("canonical_name"))
        if value
    )


def duplicate_target_key(
    player: dict[str, Any],
    normalized_name: str,
    ref_counts: dict[str, dict[str, int]],
) -> tuple[int, int, int, int, int, str]:
    refs = ref_counts.get(player["player_id"], {})
    expected_id = expected_player_id(normalized_name)
    return (
        1 if player.get("player_id") == expected_id else 0,
        1 if is_exact_ascii_canonical(player, normalized_name) else 0,
        reference_score(refs, DUPLICATE_TARGET_WEIGHTS),
        sum(refs.values()),
        1 if is_ascii_text(player.get("name")) else 0,
        str(player.get("player_id")),
    )


def preferred_duplicate_target(
    candidates: list[dict[str, Any]],
    normalized_name: str,
    ref_counts: dict[str, dict[str, int]],
) -> tuple[dict[str, Any] | None, str, float]:
    expected_id = expected_player_id(normalized_name)
    expected_matches = [candidate for candidate in candidates if candidate.get("player_id") == expected_id]
    if len(expected_matches) == 1:
        return expected_matches[0], "expected_ascii_player_id_duplicate", 0.96

    ascii_matches = [candidate for candidate in candidates if is_exact_ascii_canonical(candidate, normalized_name)]
    if len(ascii_matches) == 1:
        return ascii_matches[0], "unique_ascii_full_name_duplicate", 0.93

    ordered = sorted(candidates, key=lambda player: duplicate_target_key(player, normalized_name, ref_counts), reverse=True)
    if not ordered:
        return None, "no_duplicate_target", 0.0
    if len(ordered) == 1:
        return ordered[0], "unique_duplicate_candidate", 0.9

    top_score = duplicate_target_key(ordered[0], normalized_name, ref_counts)
    second_score = duplicate_target_key(ordered[1], normalized_name, ref_counts)
    if top_score[:4] > second_score[:4] and top_score[2] >= (second_score[2] * 2 + 10):
        return ordered[0], "dominant_context_duplicate", 0.88

    return None, "ambiguous_full_name_duplicate", 0.0


def classify_full_name_duplicate_group(
    normalized_name: str,
    group_players: list[dict[str, Any]],
    ref_counts: dict[str, dict[str, int]],
    duplicate_ref_counts: dict[str, dict[str, int]],
) -> list[dict[str, Any]]:
    active_players = [
        player
        for player in group_players
        if player.get("active") != 0 and not is_abbreviated_player(player)
    ]
    if len(active_players) < 2:
        return []

    target, policy, confidence = preferred_duplicate_target(active_players, normalized_name, ref_counts)
    summaries = [
        {
            **candidate_summary(player, duplicate_ref_counts.get(player["player_id"], {})),
            "stable_reference_score": reference_score(ref_counts.get(player["player_id"], {}), DUPLICATE_TARGET_WEIGHTS),
            "expected_player_id_match": player.get("player_id") == expected_player_id(normalized_name),
            "exact_ascii_canonical": is_exact_ascii_canonical(player, normalized_name),
        }
        for player in active_players
    ]
    evidence_base = {
        "display": normalized_name,
        "normalized_name": normalized_name,
        "candidate_count": len(active_players),
        "target_player_id": target.get("player_id") if target else None,
        "target_policy": policy,
        "expected_player_id": expected_player_id(normalized_name),
        "candidates": summaries,
    }
    if not target:
        return [
            {
                "from_player_id": player["player_id"],
                "source_display_name": display_name(player),
                "to_player_id": None,
                "candidate_status": "needs_deep_dive",
                "evidence_policy": policy,
                "confidence": confidence,
                "candidate_count": len(active_players),
                "evidence": {**evidence_base, "from_player_id": player["player_id"]},
            }
            for player in active_players
        ]

    items: list[dict[str, Any]] = []
    for player in active_players:
        if player["player_id"] == target["player_id"]:
            continue
        items.append(
            {
                "from_player_id": player["player_id"],
                "source_display_name": display_name(player),
                "to_player_id": target["player_id"],
                "candidate_status": "redirect_ready",
                "evidence_policy": policy,
                "confidence": confidence,
                "candidate_count": len(active_players),
                "evidence": {**evidence_base, "from_player_id": player["player_id"]},
            }
        )
    return items


def classify_full_name_duplicates(
    players: list[dict[str, Any]],
    ref_counts: dict[str, dict[str, int]],
    duplicate_ref_counts: dict[str, dict[str, int]],
) -> list[dict[str, Any]]:
    groups: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for player in players:
        if player.get("active") == 0 or is_abbreviated_player(player):
            continue
        normalized = normalize_name(player.get("name") or player.get("canonical_name"))
        if not normalized:
            continue
        groups[normalized].append(player)
    items: list[dict[str, Any]] = []
    for normalized_name, group_players in groups.items():
        if len(group_players) < 2:
            continue
        items.extend(classify_full_name_duplicate_group(normalized_name, group_players, ref_counts, duplicate_ref_counts))
    return items


def classify_stub(
    stub: dict[str, Any],
    full_players: list[dict[str, Any]],
    ref_counts: dict[str, dict[str, int]],
    source_contexts: dict[str, list[dict[str, Any]]] | None = None,
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
        "source_context_samples": (source_contexts or {}).get(normalize_name(display), [])[:10],
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


def upsert_repair_alias(con: sqlite3.Connection, item: dict[str, Any]) -> str:
    source_name = "player_identity_redirect"
    source_entity_id = item["from_player_id"]
    source_display_name = item["source_display_name"]
    canonical_entity_id = item["to_player_id"]
    notes = f"G3 tennis identity repair: {item['evidence_policy']} redirect from inactive player row."
    existing = con.execute(
        """
        select entity_alias_id, canonical_entity_id, notes
        from entity_aliases
        where entity_type = 'player'
          and source_name = ?
          and source_entity_id = ?
          and source_display_name = ?
        """,
        (source_name, source_entity_id, source_display_name),
    ).fetchone()
    if not existing or existing["canonical_entity_id"] == canonical_entity_id:
        return upsert_alias(
            con,
            entity_type="player",
            canonical_entity_id=canonical_entity_id,
            source_name=source_name,
            source_entity_id=source_entity_id,
            source_display_name=source_display_name,
            confidence=float(item["confidence"]),
            notes=notes,
        )
    existing_notes = str(existing["notes"] or "")
    if not existing_notes.startswith("G3 tennis identity repair:"):
        raise sqlite3.IntegrityError(
            f"Refusing to remap non-G3 alias {source_display_name} from {existing['canonical_entity_id']} to {canonical_entity_id}"
        )
    alias_id = stable_id(
        "alias",
        "player",
        canonical_entity_id,
        source_name,
        source_entity_id,
        normalize_name(source_display_name),
    )
    now = utc_now()
    con.execute(
        """
        update entity_aliases
        set entity_alias_id = ?,
            canonical_entity_id = ?,
            confidence = max(confidence, ?),
            last_seen_at = ?,
            notes = ?
        where entity_alias_id = ?
        """,
        (alias_id, canonical_entity_id, float(item["confidence"]), now, notes, existing["entity_alias_id"]),
    )
    return alias_id


def repair_tennis_player_identity(con: sqlite3.Connection, apply: bool = False, dry_run: bool = True) -> dict[str, Any]:
    con.row_factory = sqlite3.Row
    ensure_repair_schema(con)
    players = load_players(con)
    stubs = [player for player in players if is_abbreviated_player(player)]
    full_players = [player for player in players if not is_abbreviated_player(player)]
    ref_counts = build_reference_counts(con)
    duplicate_ref_counts = build_reference_counts_for(con, DUPLICATE_REFERENCE_COLUMNS)
    source_contexts = build_source_contexts(con)
    stub_items = [classify_stub(stub, full_players, ref_counts, source_contexts) for stub in stubs]
    duplicate_items = classify_full_name_duplicates(players, ref_counts, duplicate_ref_counts)
    items = [*stub_items, *duplicate_items]
    status_counts = Counter(item["candidate_status"] for item in items)
    policy_counts = Counter(item["evidence_policy"] for item in items)
    ready_items = [item for item in items if item["candidate_status"] == "redirect_ready" and item.get("to_player_id")]
    unresolved_items = [item for item in items if item["candidate_status"] != "redirect_ready"]
    duplicate_ready_items = [
        item
        for item in duplicate_items
        if item["candidate_status"] == "redirect_ready" and item.get("to_player_id")
    ]
    duplicate_unresolved_items = [
        item
        for item in duplicate_items
        if item["candidate_status"] != "redirect_ready"
    ]
    redirects_written = 0
    aliases_written = 0
    stubs_deactivated = 0
    full_name_duplicates_deactivated = 0
    active_redirect_sources_deactivated = 0
    active_redirect_source_samples: list[dict[str, Any]] = []
    if apply:
        candidate_from_ids = sorted({str(item["from_player_id"]) for item in items})
        if candidate_from_ids:
            placeholders = ",".join("?" for _ in candidate_from_ids)
            con.execute(
                f"delete from player_identity_redirect_candidates where sport = 'tennis' and from_player_id in ({placeholders})",
                candidate_from_ids,
            )
        for item in items:
            upsert_redirect_candidate(con, item)
        for item in ready_items:
            upsert_redirect(con, item)
            redirects_written += 1
            upsert_repair_alias(con, item)
            aliases_written += 1
        for stub in stubs:
            if stub.get("active") != 0:
                stubs_deactivated += 1
            con.execute("update players set active = 0 where player_id = ?", (stub["player_id"],))
            con.execute("update player_identity_registry set active = 0, updated_at = ? where player_id = ?", (utc_now(), stub["player_id"]))
        for item in duplicate_items:
            if item["candidate_status"] != "redirect_ready" or not item.get("to_player_id"):
                continue
            existing = con.execute("select active from players where player_id = ?", (item["from_player_id"],)).fetchone()
            if existing and existing["active"] != 0:
                full_name_duplicates_deactivated += 1
            con.execute("update players set active = 0 where player_id = ?", (item["from_player_id"],))
            con.execute("update player_identity_registry set active = 0, updated_at = ? where player_id = ?", (utc_now(), item["from_player_id"]))
        active_redirect_source_samples = active_redirect_source_rows(con)
        for row in active_redirect_source_samples:
            con.execute("update players set active = 0 where player_id = ?", (row["from_player_id"],))
            con.execute("update player_identity_registry set active = 0, updated_at = ? where player_id = ?", (utc_now(), row["from_player_id"]))
            active_redirect_sources_deactivated += 1
    else:
        active_redirect_source_samples = active_redirect_source_rows(con)
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
        "full_name_duplicate_candidates": len(duplicate_items),
        "full_name_duplicate_ready": len(duplicate_ready_items),
        "full_name_duplicate_unresolved": len(duplicate_unresolved_items),
        "redirect_ready": len(ready_items),
        "unresolved": len(unresolved_items),
        "status_counts": dict(status_counts),
        "policy_counts": dict(policy_counts),
        "redirects_written": redirects_written,
        "aliases_written": aliases_written,
        "stubs_deactivated": stubs_deactivated,
        "full_name_duplicates_deactivated": full_name_duplicates_deactivated,
        "active_redirect_sources_deactivated": active_redirect_sources_deactivated,
        "active_redirect_sources_before_cleanup": len(active_redirect_source_samples),
        "active_redirect_source_cleanup_samples": active_redirect_source_samples[:50],
        "active_abbrev_stubs_after": active_abbrev_stubs_after,
        "redirect_ready_samples": [
            {
                "from_player_id": item["from_player_id"],
                "source_display_name": item["source_display_name"],
                "to_player_id": item.get("to_player_id"),
                "evidence_policy": item["evidence_policy"],
                "confidence": item["confidence"],
                "candidate_count": item["candidate_count"],
                "candidates": item["evidence"].get("candidates", [])[:5],
            }
            for item in ready_items[:50]
        ],
        "full_name_duplicate_ready_samples": [
            {
                "from_player_id": item["from_player_id"],
                "source_display_name": item["source_display_name"],
                "to_player_id": item.get("to_player_id"),
                "evidence_policy": item["evidence_policy"],
                "confidence": item["confidence"],
                "candidate_count": item["candidate_count"],
                "expected_player_id": item["evidence"].get("expected_player_id"),
                "candidates": item["evidence"].get("candidates", [])[:5],
            }
            for item in duplicate_ready_items[:50]
        ],
        "full_name_duplicate_unresolved_samples": [
            {
                "from_player_id": item["from_player_id"],
                "source_display_name": item["source_display_name"],
                "evidence_policy": item["evidence_policy"],
                "candidate_count": item["candidate_count"],
                "expected_player_id": item["evidence"].get("expected_player_id"),
                "candidates": item["evidence"].get("candidates", [])[:5],
            }
            for item in duplicate_unresolved_items[:50]
        ],
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
    active_groups: dict[str, list[str]] = defaultdict(list)
    for row in con.execute("select player_id, name, canonical_name from players where active != 0").fetchall():
        if parse_abbreviated_tennis_name(row["name"]) or parse_abbreviated_tennis_name(row["canonical_name"]):
            continue
        normalized = normalize_name(row["name"] or row["canonical_name"])
        if normalized:
            active_groups[normalized].append(row["player_id"])
    active_duplicate_groups = {key: value for key, value in active_groups.items() if len(value) > 1}
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
        errors.append(f"{active_from_players} active redirects point from still-active player rows.")
    if active_abbrev_stubs:
        errors.append(f"{active_abbrev_stubs} active player rows still look like source abbreviations.")
    return {
        "sport": "tennis",
        "repair_version": REPAIR_VERSION,
        "active_redirects": active_redirects,
        "orphan_redirects": orphan_redirects,
        "active_from_players": active_from_players,
        "active_abbrev_stubs": active_abbrev_stubs,
        "active_duplicate_normalized_groups": len(active_duplicate_groups),
        "active_duplicate_normalized_players": sum(len(value) for value in active_duplicate_groups.values()),
        "active_duplicate_samples": [
            {"normalized_name": key, "player_ids": value}
            for key, value in sorted(active_duplicate_groups.items())[:25]
        ],
        "candidate_counts": candidate_counts,
        "errors": errors,
        "ok": not errors,
    }
