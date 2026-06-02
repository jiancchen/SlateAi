from __future__ import annotations

import csv
import hashlib
import json
import sqlite3
from collections import defaultdict
from pathlib import Path
from typing import Any

from .common import MlbIdentityResolver, compact_json, stable_id, to_float, to_int, utc_now
from .game_feed import cache_valid_until
from .hitter_features import ensure_hitter_schema
from .player_context import ensure_player_context_schema


SOURCE_SAVANT = "baseballsavant_hitter_statcast"
SOURCE_PLAYER_CONTEXT = "mlb_player_context"
FAMILY_SAVANT = "statcast"
FAMILY_PLAYER_CONTEXT = "player-context"


def read_json(path: Path) -> dict[str, Any]:
    try:
        parsed = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError, UnicodeDecodeError):
        return {}
    return parsed if isinstance(parsed, dict) else {}


def read_csv(path: Path) -> list[dict[str, Any]]:
    if not path.exists() or path.stat().st_size <= 3:
        return []
    try:
        with path.open(encoding="utf-8-sig", newline="") as handle:
            return [dict(row) for row in csv.DictReader(handle)]
    except (OSError, UnicodeDecodeError, csv.Error):
        return []


def sha256_file(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def sql_path(path: Path, root: Path) -> str:
    return str(path.relative_to(root))


def source_snapshot_id_for(source_name: str, local_path: str, content_hash: str) -> str:
    return f"mlb-{stable_id(source_name, local_path, content_hash, length=32)}"


def ensure_source_snapshot(
    con: sqlite3.Connection,
    *,
    repo_root: Path,
    file_path: Path,
    source_name: str,
    source_family: str,
    date: str,
    content_type: str,
    notes: dict[str, Any] | None = None,
) -> str:
    local_path = sql_path(file_path, repo_root)
    content_hash = sha256_file(file_path)
    snapshot_id = source_snapshot_id_for(source_name, local_path, content_hash)
    captured_at = utc_now()
    snapshot_notes = {
        "parser_module": "pipeline/sources/mlb/normalization/player_raw_context.py",
        "source_family": source_family,
        "active_raw_to_typed_adapter": True,
        "requested_date": date,
        "size_bytes": file_path.stat().st_size,
        **(notes or {}),
    }
    con.execute(
        """
        insert into source_snapshots (
          source_snapshot_id, source_name, sport, source_url, local_path,
          captured_at, source_date, content_hash, content_type, status, notes
        ) values (?, ?, 'mlb', null, ?, ?, ?, ?, ?, 'captured', ?)
        on conflict(source_snapshot_id) do update set
          source_name = excluded.source_name,
          local_path = excluded.local_path,
          captured_at = excluded.captured_at,
          source_date = excluded.source_date,
          content_hash = excluded.content_hash,
          content_type = excluded.content_type,
          status = excluded.status,
          notes = excluded.notes
        """,
        (snapshot_id, source_name, local_path, captured_at, date, content_hash, content_type, compact_json(snapshot_notes)),
    )
    return snapshot_id


def source_detail(path: Path, repo_root: Path, source_snapshot_id: str, payload: dict[str, Any]) -> str:
    return compact_json(
        {
            "local_path": sql_path(path, repo_root),
            "source_snapshot_id": source_snapshot_id,
            "source_payload": payload,
        }
    )


def player_id_from_row(resolver: MlbIdentityResolver, source_name: str, row: dict[str, Any]) -> str | None:
    return resolver.player_id_by_mlb_id(source_name, row.get("player_id") or row.get("batter") or row.get("id"), row.get("player_name") or row.get("fullName"))


def team_id_by_abbrev(resolver: MlbIdentityResolver, abbrev: Any) -> str | None:
    if not abbrev:
        return None
    team = resolver.teams_by_abbrev.get(str(abbrev).upper())
    return None if not team else str(team["team_id"])


def upsert_savant_grouped_rows(
    con: sqlite3.Connection,
    *,
    repo_root: Path,
    date: str,
    grouped_path: Path,
    source_snapshot_id: str,
) -> dict[str, int]:
    resolver = MlbIdentityResolver(con)
    rows = read_csv(grouped_path)
    counts = {"source_rows": len(rows), "game_logs": 0, "players": 0, "unresolved": 0}
    for row in rows:
        player_id = player_id_from_row(resolver, SOURCE_SAVANT, row)
        game_id = resolver.game_id_for_pk(row.get("game_pk"))
        if not player_id or not game_id:
            counts["unresolved"] += 1
            resolver.insert_unresolved(
                "mlb_savant_hitter_statcast",
                SOURCE_SAVANT,
                row.get("player_id") or row.get("batter"),
                row.get("player_name") or "unknown hitter",
                {"date": date, "row": row},
                "Could not map Savant grouped hitter row to canonical player/game.",
            )
            continue
        counts["players"] += 1
        source_pk = f"{date}:grouped:{row.get('game_pk')}:{row.get('player_id')}"
        con.execute(
            """
            insert into player_statcast_game_logs (
              statcast_game_log_id, player_id, team_id, opponent_team_id, game_id, game_date,
              plate_appearances, at_bats, hits, singles, doubles, triples, home_runs,
              walks, strikeouts, batting_average, slugging, woba, xba, xobp, xslg,
              xwoba, avg_bat_speed, avg_swing_length, avg_launch_speed, avg_launch_angle,
              batted_ball_events, hard_hit_events, hard_hit_percent, barrels_total,
              barrel_bbe_percent, barrel_pa_percent, sweet_spot_events, sweet_spot_percent,
              source_json, source_table, source_pk, source_detail_json, created_at
            ) values (?, ?, null, null, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, null, ?, ?, ?, ?, null, null, ?, ?, ?, ?, ?)
            on conflict(statcast_game_log_id) do update set
              player_id = excluded.player_id,
              game_id = excluded.game_id,
              game_date = excluded.game_date,
              plate_appearances = excluded.plate_appearances,
              at_bats = excluded.at_bats,
              hits = excluded.hits,
              singles = excluded.singles,
              doubles = excluded.doubles,
              triples = excluded.triples,
              home_runs = excluded.home_runs,
              walks = excluded.walks,
              strikeouts = excluded.strikeouts,
              batting_average = excluded.batting_average,
              slugging = excluded.slugging,
              woba = excluded.woba,
              xba = excluded.xba,
              xobp = excluded.xobp,
              xslg = excluded.xslg,
              xwoba = excluded.xwoba,
              avg_bat_speed = excluded.avg_bat_speed,
              avg_swing_length = excluded.avg_swing_length,
              avg_launch_speed = excluded.avg_launch_speed,
              avg_launch_angle = excluded.avg_launch_angle,
              batted_ball_events = excluded.batted_ball_events,
              hard_hit_percent = excluded.hard_hit_percent,
              barrels_total = excluded.barrels_total,
              barrel_bbe_percent = excluded.barrel_bbe_percent,
              barrel_pa_percent = excluded.barrel_pa_percent,
              source_json = excluded.source_json,
              source_detail_json = excluded.source_detail_json
            """,
            (
                stable_id("savant-grouped-game-log", source_pk, source_snapshot_id),
                player_id,
                game_id,
                row.get("game_date") or date,
                to_int(row.get("pa")),
                to_int(row.get("abs")),
                to_int(row.get("hits")),
                to_int(row.get("singles")),
                to_int(row.get("doubles")),
                to_int(row.get("triples")),
                to_int(row.get("hrs")),
                to_int(row.get("bb")),
                to_int(row.get("so")),
                to_float(row.get("ba")),
                to_float(row.get("slg")),
                to_float(row.get("woba")),
                to_float(row.get("xba")),
                to_float(row.get("xobp")),
                to_float(row.get("xslg")),
                to_float(row.get("xwoba")),
                to_float(row.get("bat_speed")),
                to_float(row.get("swing_length")),
                to_float(row.get("launch_speed")),
                to_float(row.get("launch_angle")),
                to_int(row.get("bip")),
                to_float(row.get("hardhit_percent")),
                to_int(row.get("barrels_total")),
                to_float(row.get("barrels_per_bbe_percent")),
                to_float(row.get("barrels_per_pa_percent")),
                compact_json(row),
                "data-private/raw/baseballsavant/hitter-statcast/grouped.csv",
                source_pk,
                source_detail(grouped_path, repo_root, source_snapshot_id, row),
                utc_now(),
            ),
        )
        counts["game_logs"] += 1
    return counts


def aggregate_details_rows(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    groups: dict[tuple[str, str], list[dict[str, Any]]] = defaultdict(list)
    for row in rows:
        batter = str(row.get("batter") or "")
        game_pk = str(row.get("game_pk") or "")
        if batter and game_pk:
            groups[(game_pk, batter)].append(row)
    aggregated = []
    hit_events = {"single", "double", "triple", "home_run"}
    for (game_pk, batter), group in groups.items():
        pa_rows = [row for row in group if row.get("events")]
        if not pa_rows:
            seen = {}
            for row in group:
                seen.setdefault(str(row.get("at_bat_number") or ""), row)
            pa_rows = [row for key, row in seen.items() if key]
        bbe_rows = [row for row in group if to_float(row.get("launch_speed")) is not None]
        row0 = group[0]
        events = [str(row.get("events") or "") for row in pa_rows]
        at_bats = sum(1 for event in events if event not in {"walk", "hit_by_pitch", "sac_bunt", "sac_fly", "catcher_interf"})
        singles = events.count("single")
        doubles = events.count("double")
        triples = events.count("triple")
        homers = events.count("home_run")
        hits = sum(1 for event in events if event in hit_events)
        total_bases = singles + 2 * doubles + 3 * triples + 4 * homers
        launches = [to_float(row.get("launch_angle")) for row in bbe_rows if to_float(row.get("launch_angle")) is not None]
        hard_hits = [row for row in bbe_rows if (to_float(row.get("launch_speed")) or 0) >= 95]
        barrels = [row for row in bbe_rows if str(row.get("launch_speed_angle") or "") == "6"]
        sweet = [angle for angle in launches if 8 <= angle <= 32]
        def avg(key: str) -> float | None:
            values = [to_float(row.get(key)) for row in bbe_rows if to_float(row.get(key)) is not None]
            return None if not values else sum(values) / len(values)
        aggregated.append(
            {
                "player_id": batter,
                "player_name": row0.get("player_name"),
                "game_pk": game_pk,
                "game_date": row0.get("game_date"),
                "pa": len(pa_rows),
                "abs": at_bats,
                "hits": hits,
                "singles": singles,
                "doubles": doubles,
                "triples": triples,
                "hrs": homers,
                "bb": events.count("walk"),
                "so": events.count("strikeout"),
                "ba": None if at_bats == 0 else hits / at_bats,
                "slg": None if at_bats == 0 else total_bases / at_bats,
                "woba": avg("woba_value"),
                "xba": avg("estimated_ba_using_speedangle"),
                "xobp": None,
                "xslg": avg("estimated_slg_using_speedangle"),
                "xwoba": avg("estimated_woba_using_speedangle"),
                "bat_speed": avg("bat_speed"),
                "swing_length": avg("swing_length"),
                "launch_speed": avg("launch_speed"),
                "launch_angle": avg("launch_angle"),
                "bip": len(bbe_rows),
                "hardhit_percent": None if not bbe_rows else 100 * len(hard_hits) / len(bbe_rows),
                "barrels_total": len(barrels),
                "barrels_per_bbe_percent": None if not bbe_rows else 100 * len(barrels) / len(bbe_rows),
                "barrels_per_pa_percent": None if not pa_rows else 100 * len(barrels) / len(pa_rows),
                "_detail_source": "details_fallback",
            }
        )
    return aggregated


def upsert_savant_day(con: sqlite3.Connection, *, repo_root: Path, savant_root: Path, date: str) -> dict[str, Any]:
    ensure_hitter_schema(con)
    day_root = savant_root / "hitter-statcast" / date
    grouped_path = day_root / "grouped.csv"
    details_path = day_root / "details.csv"
    report = {
        "source_files": 0,
        "source_snapshot_ids": [],
        "grouped_rows": 0,
        "details_rows": 0,
        "game_logs": 0,
        "players": 0,
        "unresolved": 0,
    }
    if not day_root.exists():
        return report
    grouped_snapshot_id = None
    if grouped_path.exists():
        grouped_snapshot_id = ensure_source_snapshot(
            con,
            repo_root=repo_root,
            file_path=grouped_path,
            source_name=SOURCE_SAVANT,
            source_family=FAMILY_SAVANT,
            date=date,
            content_type="text/csv",
            notes={"file_kind": "grouped"},
        )
        report["source_files"] += 1
        report["source_snapshot_ids"].append(grouped_snapshot_id)
    if details_path.exists():
        details_snapshot_id = ensure_source_snapshot(
            con,
            repo_root=repo_root,
            file_path=details_path,
            source_name=SOURCE_SAVANT,
            source_family=FAMILY_SAVANT,
            date=date,
            content_type="text/csv",
            notes={"file_kind": "details"},
        )
        report["source_files"] += 1
        report["source_snapshot_ids"].append(details_snapshot_id)

    grouped_rows = read_csv(grouped_path)
    report["grouped_rows"] = len(grouped_rows)
    if grouped_rows and grouped_snapshot_id:
        counts = upsert_savant_grouped_rows(con, repo_root=repo_root, date=date, grouped_path=grouped_path, source_snapshot_id=grouped_snapshot_id)
    else:
        details_rows = read_csv(details_path)
        report["details_rows"] = len(details_rows)
        fallback_rows = aggregate_details_rows(details_rows)
        if details_path.exists() and report["source_snapshot_ids"]:
            temp_path = details_path
            details_snapshot_id = report["source_snapshot_ids"][-1]
            # Reuse the grouped upsert against aggregated detail rows by writing through an in-memory loop.
            resolver = MlbIdentityResolver(con)
            counts = {"source_rows": len(fallback_rows), "game_logs": 0, "players": 0, "unresolved": 0}
            for row in fallback_rows:
                player_id = player_id_from_row(resolver, SOURCE_SAVANT, row)
                game_id = resolver.game_id_for_pk(row.get("game_pk"))
                if not player_id or not game_id:
                    counts["unresolved"] += 1
                    continue
                source_pk = f"{date}:details:{row.get('game_pk')}:{row.get('player_id')}"
                con.execute(
                    """
                    insert into player_statcast_game_logs (
                      statcast_game_log_id, player_id, game_id, game_date, plate_appearances,
                      at_bats, hits, singles, doubles, triples, home_runs, walks, strikeouts,
                      batting_average, slugging, woba, xba, xobp, xslg, xwoba,
                      avg_bat_speed, avg_swing_length, avg_launch_speed, avg_launch_angle,
                      batted_ball_events, hard_hit_percent, barrels_total, barrel_bbe_percent,
                      barrel_pa_percent, source_json, source_table, source_pk, source_detail_json, created_at
                    ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    on conflict(statcast_game_log_id) do update set
                      plate_appearances = excluded.plate_appearances,
                      at_bats = excluded.at_bats,
                      hits = excluded.hits,
                      source_json = excluded.source_json,
                      source_detail_json = excluded.source_detail_json
                    """,
                    (
                        stable_id("savant-details-game-log", source_pk, details_snapshot_id),
                        player_id,
                        game_id,
                        row.get("game_date") or date,
                        to_int(row.get("pa")),
                        to_int(row.get("abs")),
                        to_int(row.get("hits")),
                        to_int(row.get("singles")),
                        to_int(row.get("doubles")),
                        to_int(row.get("triples")),
                        to_int(row.get("hrs")),
                        to_int(row.get("bb")),
                        to_int(row.get("so")),
                        to_float(row.get("ba")),
                        to_float(row.get("slg")),
                        to_float(row.get("woba")),
                        to_float(row.get("xba")),
                        to_float(row.get("xobp")),
                        to_float(row.get("xslg")),
                        to_float(row.get("xwoba")),
                        to_float(row.get("bat_speed")),
                        to_float(row.get("swing_length")),
                        to_float(row.get("launch_speed")),
                        to_float(row.get("launch_angle")),
                        to_int(row.get("bip")),
                        to_float(row.get("hardhit_percent")),
                        to_int(row.get("barrels_total")),
                        to_float(row.get("barrels_per_bbe_percent")),
                        to_float(row.get("barrels_per_pa_percent")),
                        compact_json(row),
                        "data-private/raw/baseballsavant/hitter-statcast/details.csv",
                        source_pk,
                        source_detail(temp_path, repo_root, details_snapshot_id, row),
                        utc_now(),
                    ),
                )
                counts["game_logs"] += 1
                counts["players"] += 1
        else:
            counts = {"source_rows": 0, "game_logs": 0, "players": 0, "unresolved": 0}
    report["game_logs"] = counts["game_logs"]
    report["players"] = counts["players"]
    report["unresolved"] = counts["unresolved"]
    return report


def career_splits(person: dict[str, Any]) -> list[dict[str, Any]]:
    result = []
    for stat_group in person.get("stats") or []:
        if ((stat_group.get("type") or {}).get("displayName") or "").lower() != "yearbyyear":
            continue
        if ((stat_group.get("group") or {}).get("displayName") or "").lower() != "hitting":
            continue
        for split in stat_group.get("splits") or []:
            stat = split.get("stat") or {}
            if stat:
                result.append({"season": split.get("season"), "stat": stat})
    return result


def aggregate_career(person: dict[str, Any]) -> dict[str, Any]:
    splits = career_splits(person)
    totals = {
        "games": 0,
        "pa": 0,
        "ab": 0,
        "hits": 0,
        "hr": 0,
        "tb": 0,
        "k": 0,
        "bb": 0,
    }
    seasons = []
    for split in splits:
        stat = split["stat"]
        season = to_int(split.get("season"))
        if season is not None:
            seasons.append(season)
        totals["games"] += to_int(stat.get("gamesPlayed")) or 0
        totals["pa"] += to_int(stat.get("plateAppearances")) or 0
        totals["ab"] += to_int(stat.get("atBats")) or 0
        totals["hits"] += to_int(stat.get("hits")) or 0
        totals["hr"] += to_int(stat.get("homeRuns")) or 0
        totals["tb"] += to_int(stat.get("totalBases")) or 0
        totals["k"] += to_int(stat.get("strikeOuts")) or 0
        totals["bb"] += to_int(stat.get("baseOnBalls")) or 0
    pa = totals["pa"] or None
    ab = totals["ab"] or None
    return {
        "debut_year": min(seasons) if seasons else None,
        "latest_mlb_year": max(seasons) if seasons else None,
        "seasons_sample": len(set(seasons)),
        "career_games": totals["games"],
        "career_plate_appearances": totals["pa"],
        "career_at_bats": totals["ab"],
        "career_hits": totals["hits"],
        "career_home_runs": totals["hr"],
        "career_total_bases": totals["tb"],
        "career_avg": None if not ab else totals["hits"] / ab,
        "career_obp": None,
        "career_slg": None if not ab else totals["tb"] / ab,
        "career_ops": None,
        "career_k_rate": None if not pa else totals["k"] / pa,
        "career_bb_rate": None if not pa else totals["bb"] / pa,
        "career_hr_per_pa": None if not pa else totals["hr"] / pa,
        "career_tb_per_pa": None if not pa else totals["tb"] / pa,
    }


def upsert_profile_file(con: sqlite3.Connection, *, repo_root: Path, date: str, path: Path, source_snapshot_id: str) -> dict[str, int]:
    resolver = MlbIdentityResolver(con)
    payload = read_json(path)
    people = [person for person in payload.get("people") or [] if isinstance(person, dict)]
    counts = {"people": len(people), "identity_profiles": 0, "career_profiles": 0, "unresolved": 0}
    for person in people:
        player_id = resolver.player_id_by_mlb_id(SOURCE_PLAYER_CONTEXT, person.get("id"), person.get("fullName"))
        if not player_id:
            counts["unresolved"] += 1
            continue
        con.execute(
            """
            update players
            set name = coalesce(?, name),
                bats = coalesce(?, bats),
                throws = coalesce(?, throws),
                primary_position = coalesce(?, primary_position),
                birth_date = coalesce(?, birth_date),
                active = coalesce(?, active)
            where player_id = ?
            """,
            (
                person.get("fullName"),
                (person.get("batSide") or {}).get("code"),
                (person.get("pitchHand") or {}).get("code"),
                (person.get("primaryPosition") or {}).get("abbreviation") or (person.get("primaryPosition") or {}).get("name"),
                person.get("birthDate"),
                1 if person.get("active") else 0,
                player_id,
            ),
        )
        source_pk = f"{date}:profile:{person.get('id')}"
        con.execute(
            """
            insert into player_identity_profiles (
              player_identity_profile_id, player_id, source_player_id, full_name, first_name,
              last_name, active, current_team_id, current_team_name, bat_side, pitch_hand,
              birth_date, current_age, mlb_debut_date, draft_year, height,
              primary_position_code, primary_position_name, fetched_at, source_table,
              source_pk, source_detail_json, created_at
            ) values (?, ?, ?, ?, ?, ?, ?, null, null, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            on conflict(player_identity_profile_id) do update set
              full_name = excluded.full_name,
              active = excluded.active,
              bat_side = excluded.bat_side,
              pitch_hand = excluded.pitch_hand,
              current_age = excluded.current_age,
              source_detail_json = excluded.source_detail_json
            """,
            (
                stable_id("active-player-identity-profile", source_pk, source_snapshot_id),
                player_id,
                str(person.get("id") or ""),
                person.get("fullName"),
                person.get("firstName"),
                person.get("lastName"),
                1 if person.get("active") else 0,
                (person.get("batSide") or {}).get("code"),
                (person.get("pitchHand") or {}).get("code"),
                person.get("birthDate"),
                to_int(person.get("currentAge")),
                person.get("mlbDebutDate"),
                to_int(person.get("draftYear")),
                person.get("height"),
                (person.get("primaryPosition") or {}).get("code"),
                (person.get("primaryPosition") or {}).get("name"),
                date,
                "data-private/raw/mlb-stats-api/hitter-career-profiles",
                source_pk,
                source_detail(path, repo_root, source_snapshot_id, person),
                utc_now(),
            ),
        )
        counts["identity_profiles"] += 1

        career = aggregate_career(person)
        con.execute(
            """
            insert into player_career_profiles (
              player_career_profile_id, player_id, source_player_id, player_name, snapshot_date,
              debut_year, latest_mlb_year, seasons_sample, career_games,
              career_plate_appearances, career_at_bats, career_hits, career_home_runs,
              career_total_bases, career_avg, career_obp, career_slg, career_ops,
              career_k_rate, career_bb_rate, career_hr_per_pa, career_tb_per_pa,
              career_power_index, contact_risk_index, role_stability_index, repeatability_label,
              source_table, source_pk, source_detail_json, created_at
            ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, null, null, null, null, ?, ?, ?, ?)
            on conflict(player_career_profile_id) do update set
              latest_mlb_year = excluded.latest_mlb_year,
              seasons_sample = excluded.seasons_sample,
              career_plate_appearances = excluded.career_plate_appearances,
              career_home_runs = excluded.career_home_runs,
              career_ops = excluded.career_ops,
              source_detail_json = excluded.source_detail_json
            """,
            (
                stable_id("active-player-career-profile", source_pk, source_snapshot_id),
                player_id,
                str(person.get("id") or ""),
                person.get("fullName"),
                date,
                career["debut_year"],
                career["latest_mlb_year"],
                career["seasons_sample"],
                career["career_games"],
                career["career_plate_appearances"],
                career["career_at_bats"],
                career["career_hits"],
                career["career_home_runs"],
                career["career_total_bases"],
                career["career_avg"],
                career["career_obp"],
                career["career_slg"],
                career["career_ops"],
                career["career_k_rate"],
                career["career_bb_rate"],
                career["career_hr_per_pa"],
                career["career_tb_per_pa"],
                "data-private/raw/mlb-stats-api/hitter-career-profiles",
                source_pk,
                source_detail(path, repo_root, source_snapshot_id, {"person": person, "career": career}),
                utc_now(),
            ),
        )
        counts["career_profiles"] += 1
    return counts


def upsert_player_context_day(con: sqlite3.Connection, *, repo_root: Path, stats_api_root: Path, date: str) -> dict[str, Any]:
    ensure_player_context_schema(con)
    day_root = stats_api_root / "hitter-career-profiles" / date
    report = {"source_files": 0, "source_snapshot_ids": [], "people": 0, "identity_profiles": 0, "career_profiles": 0, "unresolved": 0}
    if not day_root.exists():
        return report
    for path in sorted(day_root.glob("profiles-*.json")):
        source_snapshot_id = ensure_source_snapshot(
            con,
            repo_root=repo_root,
            file_path=path,
            source_name=SOURCE_PLAYER_CONTEXT,
            source_family=FAMILY_PLAYER_CONTEXT,
            date=date,
            content_type="application/json",
            notes={"file_kind": "hitter-career-profile"},
        )
        report["source_files"] += 1
        report["source_snapshot_ids"].append(source_snapshot_id)
        counts = upsert_profile_file(con, repo_root=repo_root, date=date, path=path, source_snapshot_id=source_snapshot_id)
        for key in ("people", "identity_profiles", "career_profiles", "unresolved"):
            report[key] += counts[key]
    return report


def upsert_fetch_status(
    con: sqlite3.Connection,
    *,
    source_name: str,
    source_family: str,
    date: str,
    expected: int | None,
    actual: int,
    report_path: Path,
    repo_root: Path,
    ttl_hours: float,
    notes: dict[str, Any],
) -> None:
    now = utc_now()
    missing = max((expected or 0) - actual, 0) if expected is not None else None
    if actual <= 0:
        status = "missing"
        completeness = "missing"
    elif expected is not None and actual < expected:
        status = "partial"
        completeness = "partial"
    else:
        status = "success"
        completeness = "complete"
    run_id = f"source-fetch-{source_name}-{date}-{now.replace(':', '-').replace('.', '-')}"
    details = {"adapter": "mlb_player_raw_context_to_typed", "report_path": sql_path(report_path, repo_root), **notes}
    con.execute(
        """
        insert into source_fetch_runs (
          source_fetch_run_id, sport, source_name, source_family, source_date,
          run_reason, requested_url, cache_status, cache_ttl_hours, previous_success_at,
          status, completeness_status, expected_item_count, actual_item_count,
          missing_item_count, source_snapshot_id, started_at, finished_at,
          error_code, error_message, details_json
        ) values (?, 'mlb', ?, ?, ?, 'typed_parse', null, 'not_applicable', ?,
          (select last_success_at from source_fetch_status where sport='mlb' and source_name=? and source_date=?),
          ?, ?, ?, ?, ?, ?, ?, ?, null, null, ?)
        """,
        (
            run_id,
            source_name,
            source_family,
            date,
            ttl_hours,
            source_name,
            date,
            status,
            completeness,
            expected,
            actual,
            missing,
            notes.get("source_snapshot_id"),
            now,
            now,
            compact_json(details),
        ),
    )
    con.execute(
        """
        insert into source_fetch_status (
          source_fetch_status_id, sport, source_name, source_family, source_date,
          last_fetch_run_id, last_attempt_at, last_success_at, last_status,
          last_completeness_status, cache_valid_until, expected_item_count,
          actual_item_count, missing_item_count, unresolved_count, updated_at, notes
        ) values (?, 'mlb', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        on conflict (sport, source_name, source_date) do update set
          source_family = excluded.source_family,
          last_fetch_run_id = excluded.last_fetch_run_id,
          last_attempt_at = excluded.last_attempt_at,
          last_success_at = excluded.last_success_at,
          last_status = excluded.last_status,
          last_completeness_status = excluded.last_completeness_status,
          cache_valid_until = excluded.cache_valid_until,
          expected_item_count = excluded.expected_item_count,
          actual_item_count = excluded.actual_item_count,
          missing_item_count = excluded.missing_item_count,
          unresolved_count = excluded.unresolved_count,
          updated_at = excluded.updated_at,
          notes = excluded.notes
        """,
        (
            f"mlb:{source_name}:{date}",
            source_name,
            source_family,
            date,
            run_id,
            now,
            now if status in {"success", "partial"} else None,
            status,
            completeness,
            cache_valid_until(now, ttl_hours),
            expected,
            actual,
            missing,
            int(notes.get("unresolved_count") or 0),
            now,
            compact_json(details),
        ),
    )


def insert_health_check(con: sqlite3.Connection, *, date: str, report: dict[str, Any], status: str) -> None:
    con.execute(
        """
        insert into health_checks (
          health_check_id, model_run_id, check_name, status, expected_count,
          actual_count, details_json, checked_at
        ) values (?, null, ?, ?, ?, ?, ?, ?)
        on conflict(health_check_id) do update set
          status = excluded.status,
          expected_count = excluded.expected_count,
          actual_count = excluded.actual_count,
          details_json = excluded.details_json,
          checked_at = excluded.checked_at
        """,
        (
            f"mlb-player-raw-context-to-typed:{date}",
            f"mlb_player_raw_context_to_typed:{date}",
            status,
            report.get("expected_context_items"),
            (report.get("savant") or {}).get("game_logs", 0) + (report.get("player_context") or {}).get("identity_profiles", 0),
            compact_json(report),
            utc_now(),
        ),
    )
